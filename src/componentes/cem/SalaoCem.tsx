import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { recurso } from '../../config'
import { GatoPixel } from '../mascote/GatoPixel'
import { CorujaPixel } from '../../biblioteca/sala/CorujaPixel'
import { CONCEITOS_CORUJA, FALAS_GATO, proximaFala } from '../mascote/falasBichos'

/**
 * O topo do ranking (O Salão dos Cem, 31/10/2026), no mesmo jeito da página inicial: a cena HD-2D grande, sem
 * moldura, com o título claro no alto à esquerda, a missão num vidro escuro à esquerda (o lado calmo da pintura) e o
 * Salão dos Campeões do centro para a direita.
 *
 * A cena é pintada por scripts/cenarios/salao_cem.py (base 480 x 270, ampliada 3x com a luz calculada). Por cima, em
 * camadas: os estandartes (scripts/sprites/cem_estandartes.py) e os três cavaleiros animados
 * (scripts/sprites/cem_cavaleiros.py), ambos desenhos do Tales; a luz do vitral (que também banha os cavaleiros), a
 * frente da cena, as chamas das tochas e a poeira no feixe. Nomes e totais são HTML nas placas do pódio, no chão do
 * salão (nada de texto rasterizado). No celular a cena mostra o recorte do pódio e o resto vem embaixo.
 * Com a cena fora da tela ou "menos movimento", tudo para.
 */
const BASE = { w: 480, h: 270 }
// Onde os cavaleiros pisam (px da arte base), os mesmos de public/ranking/cem/salao.json.
const PEDESTAL: Record<number, { cx: number; topo: number }> = { 1: { cx: 318, topo: 170 }, 2: { cx: 246, topo: 186 }, 3: { cx: 390, topo: 192 } }
const TOCHAS = [{ x: 199, y: 107 }, { x: 418, y: 107 }]
// Quadros: cavaleiro 75 x 88 (pés em 37, 84; linhas 0-2 espera, 3-5 saudação); estandarte 66 x 94 (haste em 33, 3).
const CAV = { w: 75, h: 88, pes: [37, 84], linhas: 6 }
const EST = { w: 66, h: 94, escala: 0.6, topo: 44 }
const LUGAR = ['', '1º lugar', '2º lugar', '3º lugar']
const TITULO = ['', 'Campeão', 'Guardião de prata', 'Guardião de bronze']

const pct = (v: number, total: number) => `${(v / total) * 100}%`
// Visitas (desde 01/11/2026 os dois em toda visita à página, pedido do Tales: "que também apareça no ranking", como um
// point and click): o gato dorme no chão perto da mata e a coruja
// fica no chão ao lado dele (Tales, 01/11/2026: pousada em algo firme, nunca no ar nem cortada no alto). Só enfeite (aria-hidden), longe de nomes e botões.
const VISITA = { gato: { x: 418, y: 236, w: 48, h: 36 }, coruja: { x: 459, y: 238, w: 34, h: 25 } }
type Visita = 'gato' | 'coruja' | null
const POEIRA = Array.from({ length: 14 }, (_, i) => ({ x: 292 + ((i * 37) % 60), y: 30 + ((i * 53) % 130), d: 6 + (i % 5) * 1.3, a: -((i * 1.7) % 8) }))

function Cavaleiro({ lugar, saudando }: { lugar: number; saudando: boolean }) {
  const p = PEDESTAL[lugar]
  const estilo: CSSProperties = {
    left: pct(p.cx - CAV.pes[0], BASE.w), top: pct(p.topo - CAV.pes[1], BASE.h), width: pct(CAV.w, BASE.w), height: pct(CAV.h, BASE.h),
    backgroundImage: `url(${recurso('ranking/cem/cavaleiros.png')})`, backgroundPositionY: `${((lugar - 1 + (saudando ? 3 : 0)) / (CAV.linhas - 1)) * 100}%`,
    animationDelay: `${-(lugar - 1) * 0.43}s`,
  }
  return <span className={`cem-cavaleiro cem-cavaleiro--${lugar}${saudando ? ' cem-cavaleiro--saudando' : ''}`} style={estilo} aria-hidden="true" />
}

function Estandarte({ lugar }: { lugar: number }) {
  const w = EST.w * EST.escala, h = EST.h * EST.escala
  const estilo: CSSProperties = {
    left: pct(PEDESTAL[lugar].cx - w / 2, BASE.w), top: pct(EST.topo + (lugar === 1 ? -10 : 0), BASE.h), width: pct(w, BASE.w), height: pct(h, BASE.h),
    backgroundImage: `url(${recurso('ranking/cem/estandartes.png')})`, backgroundPositionY: `${((lugar - 1) / 2) * 100}%`,
    animationDelay: `${-lugar * 0.31}s`,
  }
  return <span className={`cem-estandarte cem-estandarte--${lugar}`} style={estilo} aria-hidden="true" />
}

/** Um lugar do Top 3, já pronto para mostrar (o ranking de questões e o do Torneio usam o mesmo salão). */
export interface LugarSalao { posicao: number; nome: string; ehVoce: boolean; valor: string; rotulo: string; selos?: ReactNode }

export function SalaoCem({ cabecalho, lateral, lugares, rotuloPodio, cerimonia }: {
  /** O título da página e o relógio (no alto à esquerda, sobre a cena). */
  cabecalho: ReactNode
  /** O vidro escuro à esquerda (a jornada, no ranking; o convite, no Torneio). */
  lateral?: ReactNode
  lugares: LugarSalao[]
  /** Nome do pódio para o leitor de tela. */
  rotuloPodio: string
  cerimonia: string | null
}) {
  const palco = useRef<HTMLDivElement>(null)
  const [visivel, definirVisivel] = useState(true)
  // Um toque num visitante: a coruja explica um conceito que cai na prova; o gato solta uma preguiça. Um fala por vez.
  const [visita, definirVisita] = useState<Visita>(null)
  const [fala, definirFala] = useState<string | null>(null)
  const [toques, definirToques] = useState(0)
  useEffect(() => { if (!fala) return; const t = window.setTimeout(() => definirFala(null), visita === 'coruja' ? 11000 : 5500); return () => window.clearTimeout(t) }, [fala, visita])
  const tocar = (quem: 'gato' | 'coruja') => { definirToques((n) => n + 1); definirVisita(quem); definirFala(quem === 'coruja' ? proximaFala('coruja', CONCEITOS_CORUJA) : proximaFala('gato', FALAS_GATO)) }
  useEffect(() => {
    const el = palco.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => definirVisivel(e.isIntersecting), { rootMargin: '80px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const top3 = lugares.filter((l) => l.posicao <= 3).sort((a, b) => a.posicao - b.posicao)
  const img = (nome: string) => recurso(`ranking/cem/${nome}`)
  return <section id="cem-salao" className={'cem-heroi' + (cerimonia ? ' cem-heroi--cerimonia' : '') + (visivel ? '' : ' cem-pausado')} aria-labelledby="cem-titulo" tabIndex={-1}>
    <div className="cem-heroi__cena">
    <div ref={palco} className="cem-heroi__palco" aria-hidden="true">
      <div className="cem-heroi__mundo">
        <img className="cem-heroi__camada" src={img('salao-fundo.webp')} srcSet={`${img('salao-fundo-960.webp')} 960w, ${img('salao-fundo.webp')} 1440w`}
          sizes="(max-width: 40rem) 175vw, min(76rem, 100vw)" alt="" width={1440} height={810} decoding="async" fetchPriority="high" draggable={false} />
        {top3.map((l) => <Estandarte key={l.posicao} lugar={l.posicao} />)}
        {TOCHAS.map((t, i) => <span key={i} className="cem-heroi__tocha" style={{ left: pct(t.x - 5, BASE.w), top: pct(t.y - 16, BASE.h), width: pct(10, BASE.w), height: pct(16, BASE.h), backgroundImage: `url(${img('tocha.png')})`, animationDelay: `${-i * 0.17}s` }} />)}
        {top3.map((l) => <Cavaleiro key={l.posicao} lugar={l.posicao} saudando={!!cerimonia && l.posicao === 1} />)}
        <button type="button" tabIndex={-1} className="cem-heroi__visita cem-heroi__visita--gato" aria-label="O gato: tocar" onClick={() => tocar('gato')} style={{ left: pct(VISITA.gato.x - VISITA.gato.w / 2, BASE.w), top: pct(VISITA.gato.y - VISITA.gato.h, BASE.h), width: pct(VISITA.gato.w, BASE.w), height: pct(VISITA.gato.h, BASE.h) }}><GatoPixel key={visita === 'gato' ? toques : 'g'} estado={fala && visita === 'gato' ? 'acordado' : 'dormindo'} /></button>
        <button type="button" tabIndex={-1} className="cem-heroi__visita cem-heroi__visita--coruja" aria-label="A coruja: um conceito que cai na prova" onClick={() => tocar('coruja')} style={{ left: pct(VISITA.coruja.x - VISITA.coruja.w / 2, BASE.w), top: pct(VISITA.coruja.y - VISITA.coruja.h, BASE.h), width: pct(VISITA.coruja.w, BASE.w), height: pct(VISITA.coruja.h, BASE.h) }}><CorujaPixel key={visita === 'coruja' ? toques : 'c'} estado={fala && visita === 'coruja' ? 'acenando' : 'parada'} /></button>
        {visita && fala && <span className={`cem-heroi__balao cem-heroi__balao--${visita}`} onClick={() => definirFala(null)}
          style={visita === 'gato' ? { right: pct(BASE.w - VISITA.gato.x - 6, BASE.w), bottom: pct(BASE.h - VISITA.gato.y + VISITA.gato.h + 2, BASE.h) } : { right: pct(BASE.w - VISITA.coruja.x - 6, BASE.w), bottom: pct(BASE.h - VISITA.coruja.y + VISITA.coruja.h + 2, BASE.h) }}>{fala}</span>}
        <img className="cem-heroi__camada cem-heroi__luz" src={img('salao-luz.webp')} alt="" width={1440} height={810} decoding="async" draggable={false} />
        <span className="cem-heroi__poeira">{POEIRA.map((p, i) => <i key={i} style={{ left: pct(p.x, BASE.w), top: pct(p.y, BASE.h), animationDuration: `${p.d}s`, animationDelay: `${p.a}s` }} />)}</span>
        <img className="cem-heroi__camada" src={img('salao-frente.webp')} alt="" width={1440} height={810} decoding="async" draggable={false} />
        {cerimonia && <span className="cem-heroi__festa">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${58 + ((i * 23) % 16)}%`, animationDelay: `${(i % 6) * 0.12}s`, ['--dx' as string]: `${((i * 13) % 9) - 4}vw` }} />)}</span>}
      </div>
    </div>
    <div className="cem-heroi__cabeca">{cabecalho}</div>
    {lateral && <div className="cem-heroi__lateral">{lateral}</div>}
    </div>
    {/* O chão do salão: as placas do pódio, cada uma embaixo do seu pedestal (como o chão da sequência na página inicial). */}
    <ol className="cem-heroi__podio" aria-label={rotuloPodio}>
      {top3.map((l) => <li key={l.posicao} className={`cem-placa cem-placa--${l.posicao}${l.ehVoce ? ' cem-placa--voce' : ''}`}>
        <span className="cem-placa__lugar"><span className="cem-placa__medalha" aria-hidden="true" style={{ backgroundImage: `url(${img('medalhas.png')})`, backgroundPositionX: `${((l.posicao - 1) / 2) * 100}%` }} /><span><b>{LUGAR[l.posicao]}</b> <small>{TITULO[l.posicao]}</small></span></span>
        <strong className="cem-placa__nome">{l.nome}{l.ehVoce && <span className="cem-voce">você</span>}</strong>
        <span className="cem-placa__total"><b className="numerico">{l.valor}</b> <small>{l.rotulo}</small></span>
        {l.selos && <span className="cem-placa__selos">{l.selos}</span>}
      </li>)}
    </ol>
    {cerimonia && <p className="so-leitor" role="status">Novo líder: {cerimonia}</p>}
    {fala && <p className="so-leitor" role="status">{visita === 'coruja' ? 'A coruja diz: ' : 'O gato diz: '}{fala}</p>}
  </section>
}

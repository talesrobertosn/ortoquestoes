import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { recurso } from '../../config'
import { EmblemasDoNome, Fogueira } from '../Inventario'
import { SeloServico } from '../ServicoRanking'
import { MovimentoSelo } from './Movimento'
import type { LinhaRanking, Periodo } from './regras'

/**
 * O Salão dos Campeões (Top 3) do Salão dos Cem, 31/10/2026. A cena é pintada em HD-2D por
 * scripts/cenarios/salao_cem.py (base 480 x 270, ampliada 3x com a luz calculada) e, por cima, em camadas:
 * os três cavaleiros animados do Tales (scripts/sprites/cem_cavaleiros.py), a luz do vitral (que também banha os
 * cavaleiros), a frente da cena, as chamas das tochas e a poeira no feixe. Nomes, totais e selos são HTML, nos
 * cartões embaixo da cena (nada de texto rasterizado). Ordem visual 2 · 1 · 3; no celular a cena mostra o centro.
 * Com a cena fora da tela ou "menos movimento", tudo para.
 */
const BASE = { w: 480, h: 270 }
// Onde os cavaleiros pisam (px da arte base), os mesmos de public/ranking/cem/salao.json.
const PEDESTAL: Record<number, { cx: number; topo: number }> = { 1: { cx: 240, topo: 170 }, 2: { cx: 166, topo: 186 }, 3: { cx: 314, topo: 192 } }
const TOCHAS = [{ x: 58, y: 118 }, { x: 422, y: 118 }]
// Quadro do cavaleiro (cavaleiros.json): 72 x 88, pés em (36, 83).
const CAV = { w: 72, h: 88, pes: [36, 83] }
const LUGAR = ['', '1º lugar', '2º lugar', '3º lugar']
const TITULO = ['', 'Campeão', 'Guardião de prata', 'Guardião de bronze']

const pct = (v: number, total: number) => `${(v / total) * 100}%`
const POEIRA = Array.from({ length: 14 }, (_, i) => ({ x: 212 + ((i * 37) % 70), y: 40 + ((i * 53) % 120), d: 6 + (i % 5) * 1.3, a: -((i * 1.7) % 8) }))

function Cavaleiro({ lugar }: { lugar: number }) {
  const p = PEDESTAL[lugar]
  const estilo: CSSProperties = {
    left: pct(p.cx - CAV.pes[0], BASE.w), top: pct(p.topo - CAV.pes[1], BASE.h), width: pct(CAV.w, BASE.w), height: pct(CAV.h, BASE.h),
    backgroundImage: `url(${recurso('ranking/cem/cavaleiros.png')})`, backgroundPositionY: `${(lugar - 1) * 50}%`,
    animationDelay: `${-(lugar - 1) * 0.43}s`,
  }
  return <span className={`cem-cavaleiro cem-cavaleiro--${lugar}`} style={estilo} aria-hidden="true" />
}

export interface CartaoTop3 { linha: LinhaRanking; extra?: ReactNode }

export function SalaoCem({ linhas, periodo, cerimonia }: { linhas: LinhaRanking[]; periodo: Periodo; cerimonia: string | null }) {
  const palco = useRef<HTMLDivElement>(null)
  const [visivel, definirVisivel] = useState(true)
  useEffect(() => {
    const el = palco.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => definirVisivel(e.isIntersecting), { rootMargin: '80px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const top3 = linhas.filter((l) => l.posicao <= 3).sort((a, b) => a.posicao - b.posicao)
  const img = (nome: string) => recurso(`ranking/cem/${nome}`)
  const semana = periodo === 'semana'
  return <section id="cem-salao" className={'cem-salao' + (cerimonia ? ' cem-salao--cerimonia' : '')} aria-labelledby="cem-salao-t" tabIndex={-1}>
    <header className="cem-salao__cabeca">
      <p className="cem-rotulo cem-rotulo--claro">Salão dos Campeões</p>
      <h2 id="cem-salao-t">Top 3</h2>
      <p className="cem-salao__sub">{semana ? 'Quem mais respondeu questões nos últimos 7 dias' : 'Quem mais respondeu questões no ranking geral'}</p>
    </header>
    <div ref={palco} className={'cem-salao__palco' + (visivel ? '' : ' cem-pausado')} aria-hidden="true">
      <div className="cem-salao__mundo">
        <img className="cem-salao__camada" src={img('salao-fundo.webp')} srcSet={`${img('salao-fundo-960.webp')} 960w, ${img('salao-fundo.webp')} 1440w`}
          sizes="(max-width: 40rem) 160vw, min(72rem, 100vw)" alt="" width={1440} height={810} decoding="async" fetchPriority="high" draggable={false} />
        {TOCHAS.map((t, i) => <span key={i} className="cem-salao__tocha" style={{ left: pct(t.x - 6, BASE.w), top: pct(t.y - 14, BASE.h), width: pct(12, BASE.w), height: pct(16, BASE.h), backgroundImage: `url(${img('chama-16.png')})`, animationDelay: `${-i * 0.17}s` }} />)}
        {top3.map((l) => <Cavaleiro key={l.posicao} lugar={l.posicao} />)}
        <img className="cem-salao__camada cem-salao__luz" src={img('salao-luz.webp')} alt="" width={1440} height={810} decoding="async" draggable={false} />
        <span className="cem-salao__poeira">{POEIRA.map((p, i) => <i key={i} style={{ left: pct(p.x, BASE.w), top: pct(p.y, BASE.h), animationDuration: `${p.d}s`, animationDelay: `${p.a}s` }} />)}</span>
        <img className="cem-salao__camada" src={img('salao-frente.webp')} alt="" width={1440} height={810} decoding="async" draggable={false} />
        {cerimonia && <span className="cem-salao__festa">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${40 + ((i * 23) % 21)}%`, animationDelay: `${(i % 6) * 0.12}s`, ['--dx' as string]: `${((i * 13) % 9) - 4}vw` }} />)}</span>}
      </div>
    </div>
    <ol className="cem-salao__cartoes" aria-label="Três primeiros colocados">
      {top3.map((l) => <li key={l.posicao} className={`cem-podio cem-podio--${l.posicao}${l.eh_voce ? ' cem-podio--voce' : ''}`}>
        <span className="cem-podio__lugar"><span className="cem-podio__numero numerico" aria-hidden="true">{l.posicao}</span><span><b>{LUGAR[l.posicao]}</b><small>{TITULO[l.posicao]}</small></span></span>
        <strong className="cem-podio__nome">{l.apelido}{l.eh_voce && <span className="cem-voce">você</span>}</strong>
        <span className="cem-podio__total"><b className="numerico">{l.total.toLocaleString('pt-BR')}</b> <small>{semana ? 'questões na semana' : 'questões'}</small></span>
        <span className="cem-podio__selos">
          <EmblemasDoNome ids={l.emblemas} totalGeral={l.total_geral} tamanho={28} />
          <Fogueira dias={l.sequencia ?? 0} tamanho={20} />
          <SeloServico servico={l.servico} />
          <MovimentoSelo linha={l} />
        </span>
      </li>)}
    </ol>
    {cerimonia && <p className="so-leitor" role="status">Novo líder: {cerimonia}</p>}
  </section>
}

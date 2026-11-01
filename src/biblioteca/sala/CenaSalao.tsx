import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { recurso } from '../../config'
import { Icone } from '../../componentes/Icone'
import { GatoPixel } from '../../componentes/mascote/GatoPixel'
import { LINHAS_GATO, type IdLinhaGato } from '../../componentes/mascote/sprites'
import { href } from '../../util/rotas'
import { Sprite } from '../salao/Sprite'
import { ABOBORA, LAMPARINA, MORCEGO, PALETA_ABOBORA, PALETA_LAMPARINA, PALETA_LAMPARINA_APAGADA, PALETA_MORCEGO, PALETA_PLANTA, PLANTA, PLANTA_FLORIDA } from '../salao/sprites'
import { CorujaPixel } from './CorujaPixel'
import { somDisponivel } from './sons'
import type { Periodo, Salao } from './usarSalao'

/**
 * Pontos da pintura (scripts/gerar_cena_salao.py, 480 x 180 pixels de arte) onde moram os objetos vivos: a coruja no
 * poleiro, o gato na pilha de livros, o relógio, as arandelas, a janela, o volume raro e o crânio. Tudo em % da arte,
 * então a interface acompanha a pintura em qualquer largura.
 */
const ARTE = { w: 480, h: 180 }
export const PONTOS = {
  coruja: { x: 426, y: 32 },
  gato: { x: 315, y: 150 },
  relogio: { x: 360, y: 40, r: 10 },
  arandelas: [{ x: 240, y: 66 }, { x: 335, y: 66 }, { x: 214, y: 66 }, { x: 357, y: 70 }],
  janela: { x0: 255, y0: 10, x1: 320, y1: 112 },
  raro: { x: 398, y: 127 },
  cranio: { x0: 437, y0: 100, x1: 450, y1: 113 },
  plantas: [{ x: 13, y: 178 }, { x: 467, y: 178 }],
}
const pos = (x: number, y: number) => ({ '--x': `${(x / ARTE.w) * 100}%`, '--y': `${(y / ARTE.h) * 100}%` }) as CSSProperties
const caixa = (b: { x0: number; y0: number; x1: number; y1: number }) => ({
  '--x': `${(b.x0 / ARTE.w) * 100}%`, '--y': `${(b.y0 / ARTE.h) * 100}%`, '--w': `${((b.x1 - b.x0) / ARTE.w) * 100}%`, '--h': `${((b.y1 - b.y0) / ARTE.h) * 100}%`,
}) as CSSProperties

const GATOS = new Set<string>(LINHAS_GATO.map((l) => l.id))
const estadoGato = (e: string): IdLinhaGato => (GATOS.has(e) ? (e as IdLinhaGato) : 'dormindo')

/** A pintura do salão na hora do dia (a mesma no carregamento e na página pronta: o navegador baixa uma vez só). */
export function ArteSalao({ periodo }: { periodo: Periodo }) {
  const imagem = (tam: '' | '-960') => recurso(`pixel/biblioteca/salao-${periodo}${tam}.webp`)
  return (
    <picture className="bb-palco__arte">
      <source media="(max-width: 40rem)" srcSet={imagem('-960')} />
      <img src={imagem('')} alt="" width={1440} height={540} decoding="async" fetchPriority="high" draggable={false} />
    </picture>
  )
}

interface Props {
  salao: Salao
  titulo: ReactNode
  contagem: string
  busca: ReactNode
  acoes: ReactNode
  aviso?: ReactNode
  aoAbrirGuia: () => void
  /** O que o volume raro conta (uma curiosidade verdadeira da plataforma, contada a partir do acervo). */
  textoRaro: string
}

/**
 * O salão de leitura da Biblioteca 3.0 (31/10/2026): a pintura HD-2D da hora do dia, com a coruja bibliotecária, o
 * gato, as arandelas, o relógio e a janela vivos por cima; o título, a contagem e a busca no lado calmo da pintura.
 * No celular, a pintura vira uma faixa com a metade direita (janela, mesa, poleiro) e a busca vem logo embaixo.
 */
export function CenaSalao({ salao: s, titulo, contagem, busca, acoes, aviso, aoAbrirGuia, textoRaro }: Props) {
  const palco = useRef<HTMLDivElement>(null)
  const mundo = useRef<HTMLDivElement>(null)
  // Tamanho de um pixel da pintura na tela; os sprites usam um múltiplo INTEIRO dele (nítidos em qualquer largura).
  const [escala, definirEscala] = useState(2.4)
  useEffect(() => {
    const el = mundo.current
    if (!el) return
    const medir = () => definirEscala(el.clientWidth / ARTE.w || 2.4)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // A cena só anima na tela: fora dela (ou com a aba escondida) tudo para.
  useEffect(() => {
    const el = palco.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => { s.definirVivo(e.isIntersecting); el.classList.toggle('bb-palco--parado', !e.isIntersecting) }, { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Meio pixel conta: em tela de alta densidade (quase todas hoje) 1,5 px de CSS são 3 pixels de verdade, nítidos.
  const px = Math.max(1, Math.round(escala * 0.62 * 2) / 2)
  const pxObj = Math.max(1, Math.round(escala * 0.85))

  const moverLuz = (e: PointerEvent<HTMLDivElement>) => {
    if (!s.breu || !palco.current) return
    const r = palco.current.getBoundingClientRect()
    palco.current.style.setProperty('--luz-x', `${e.clientX - r.left}px`)
    palco.current.style.setProperty('--luz-y', `${e.clientY - r.top}px`)
  }
  const arandelas = s.efeitos.has('codman') ? [0, 1, 2, 3] : [0, 1]
  const classe = ['bb-salao', `bb-salao--${s.periodo}`, s.breu && 'bb-salao--breu', s.ehMadrugada && 'bb-salao--madrugada', s.estacao && `bb-salao--${s.estacao}`,
    s.efeitos.has('garden') && 'bb-salao--jardim'].filter(Boolean).join(' ')

  return (
    <header className={classe}>
      <div className="bb-palco" ref={palco} onPointerMove={moverLuz} onPointerDown={moverLuz}>
       <div className="bb-palco__mundo" ref={mundo} style={{ '--e': `${escala}px`, '--px': `${px}px` } as CSSProperties}>
        <ArteSalao periodo={s.periodo} />
        <span className="bb-palco__veu" aria-hidden="true" />

        {/* Poeira no feixe da janela e vaga-lumes à noite (só enfeite, param com "menos movimento"). */}
        <span className="bb-poeira" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <i key={i} style={{ '--i': i * 2 } as CSSProperties} />)}</span>
        {s.periodo === 'noite' && <span className="bb-vagalumes" aria-hidden="true">{Array.from({ length: 3 }, (_, i) => <i key={i} style={{ '--i': i * 2 } as CSSProperties} />)}</span>}

        <button type="button" className="bb-obj bb-janela" style={caixa(PONTOS.janela)} onClick={s.acoes.tocarJanela}
          aria-label={`Janela: ${s.periodo === 'manha' ? 'manhã' : s.periodo === 'tarde' ? 'fim de tarde' : 'noite'}. Mudar a luz do salão`} />
        {arandelas.map((i) => {
          const acesa = i > 1 ? true : s.lampadas[i]
          const p = PONTOS.arandelas[i]
          return <button key={i} type="button" className={`bb-obj bb-arandela${acesa ? ' bb-arandela--acesa' : ''}`} style={pos(p.x, p.y)} disabled={i > 1}
            onClick={() => i < 2 && s.acoes.tocarLampada(i)} aria-label={acesa ? 'Apagar a arandela' : 'Acender a arandela'} aria-pressed={acesa}>
            <span className="bb-arandela__luz" aria-hidden="true" />
            <Sprite grade={LAMPARINA} paleta={acesa ? PALETA_LAMPARINA : PALETA_LAMPARINA_APAGADA} px={pxObj} />
          </button>
        })}
        <button type="button" className={'bb-obj bb-relogio' + (s.relogioGira ? ' bb-relogio--gira' : '')} style={pos(PONTOS.relogio.x, PONTOS.relogio.y)} onClick={s.acoes.tocarRelogio}
          aria-label={`Relógio: ${s.agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}>
          <i className="bb-relogio__h" style={{ transform: `rotate(${(s.agora.getHours() % 12) * 30 + s.agora.getMinutes() / 2}deg)` }} />
          <i className="bb-relogio__m" style={{ transform: `rotate(${s.agora.getMinutes() * 6}deg)` }} />
        </button>
        <button type="button" className={'bb-obj bb-raro' + (s.raroAceso ? ' bb-raro--aceso' : '')} style={pos(PONTOS.raro.x, PONTOS.raro.y)} onClick={() => s.acoes.tocarRaro(textoRaro)}
          aria-label="Um volume raro brilha na mesa" />
        <button type="button" className="bb-obj bb-cranio" style={caixa(PONTOS.cranio)} onClick={s.acoes.tocarCranio} aria-label="Crânio da estante: uma curiosidade de anatomia" />

        <div className="bb-personagem bb-personagem--coruja" style={pos(PONTOS.coruja.x, PONTOS.coruja.y)}>
          {s.coruja.fala && <p className="bb-balao" role="status">
            <span>{s.coruja.fala}</span>
            <span className="bb-balao__acoes">
              {s.coruja.tour && <button type="button" onClick={() => { s.acoes.calarCoruja(); aoAbrirGuia() }}>Fazer o tour</button>}
              <button type="button" onClick={s.acoes.calarCoruja} aria-label="Fechar a dica"><Icone nome="fechar" tamanho={14} /></button>
            </span>
          </p>}
          <button type="button" className="bb-coruja" onClick={s.acoes.tocarCoruja} aria-label="Coruja bibliotecária: uma dica" data-guia="ajuda">
            <CorujaPixel estado={s.coruja.estado} style={{ ['--coruja-escala' as string]: px * 1.75 }} />
          </button>
        </div>
        <div className="bb-personagem bb-personagem--gato" style={pos(PONTOS.gato.x, PONTOS.gato.y)}>
          <button type="button" className={`bb-gato bb-gato--${s.gato.estado}`} onClick={s.acoes.tocarGato} aria-label="O gato da biblioteca">
            <GatoPixel estado={estadoGato(s.gato.estado)} style={{ width: 64 * px, height: 48 * px }} />
            {s.gato.estado === 'dormindo' && <span className="bb-gato__zz" aria-hidden="true">z<small>z</small></span>}
          </button>
        </div>

        {PONTOS.plantas.map((p, i) => <span key={i} className="bb-obj bb-planta" style={pos(p.x, p.y)} aria-hidden="true">
          <Sprite grade={s.efeitos.has('garden') ? PLANTA_FLORIDA : PLANTA} paleta={PALETA_PLANTA} px={pxObj + 1} />
        </span>)}
        {s.estacao === 'halloween' && <span className="bb-aboboras" aria-hidden="true"><Sprite grade={ABOBORA} paleta={PALETA_ABOBORA} px={pxObj + 1} /><Sprite grade={ABOBORA} paleta={PALETA_ABOBORA} px={pxObj} /></span>}
        {s.estacao === 'halloween' && <span className="bb-morcegos" aria-hidden="true"><Sprite grade={MORCEGO} paleta={PALETA_MORCEGO} px={3} /><Sprite grade={MORCEGO} paleta={PALETA_MORCEGO} px={2} /></span>}
        {s.estacao === 'natal' && <span className="bb-pisca" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} />)}</span>}
       </div>
        <span className="bb-breu" aria-hidden="true" />
      </div>

      <div className="bb-entrada">
        {s.faltam !== null && s.faltam <= 14 && <p className="bb-bandeirolas"><b>{s.faltam === 0 ? 'Hoje é dia de prova. Boa prova!' : s.faltam === 1 ? 'A prova é amanhã. Revise, durma e confie.' : `Faltam ${s.faltam} dias para a prova`}</b></p>}
        <div className="bb-placa" onClick={s.acoes.tocarPlaca}>
          <p className="bb-placa__selo">Biblioteca OrtoQuestões{s.achados.includes('orto') && <span> · bibliotecário honorário</span>}</p>
          {titulo}
          <p className="bb-placa__conta">{contagem}</p>
        </div>
        {busca}
        {aviso}
        <div className="bb-entrada__acoes">
          {acoes}
          {somDisponivel() && <button type="button" className="bb-botao-vidro" aria-pressed={s.som} onClick={s.acoes.alternarSom}>
            <Icone nome={s.som ? 'tocar' : 'pausar'} tamanho={15} /> {s.som ? 'Som ligado' : 'Som desligado'}
          </button>}
        </div>
        {s.ehMadrugada && <p className="bb-plantao"><Icone nome="lua" tamanho={15} /> <span>Plantão? Estes cabem em poucos minutos: {s.curtos.map((c, i) => <span key={c.id}>{i > 0 && ', '}<a href={href(`/resumos/${c.id}`)}>{c.titulo}</a> ({c.minutos} min)</span>)}.</span></p>}
      </div>
    </header>
  )
}

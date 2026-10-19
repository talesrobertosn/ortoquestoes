import { useCallback, useEffect, useRef, useState, type PointerEvent as EventoPonteiro } from 'react'
import { createPortal } from 'react-dom'
import type { Imagem } from '../dados/tipos'
import { Icone } from './Icone'
import '../estilos/componentes/FiguraAmpliavel.css'

/** Texto com endereços clicáveis (para créditos de imagem com link). */
export function TextoComLinks({ texto }: { texto: string }) {
  const partes = texto.split(/(https?:\/\/[^\s)]+)/g)
  return <>{partes.map((p, i) => /^https?:\/\//.test(p)
    ? <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>
    : p)}</>
}

/**
 * Figura de questão ou comentário, numa moldura com a lupa à vista. Tocar na
 * imagem (ou na lupa) abre a imagem em tela cheia: pinça ou dois toques
 * aproximam no celular; roda do mouse, clique ou + e − no computador. Fecha no
 * X, no Esc ou tocando fora da imagem.
 */
export function FiguraAmpliavel({ imagem, src, alt, alturaMaxima = '22rem', largura, altura, prioridade = false }: {
  imagem: Imagem
  src: string
  alt: string
  alturaMaxima?: string
  largura?: number | null
  altura?: number | null
  /** A figura do enunciado: carrega já, sem esperar entrar na tela. */
  prioridade?: boolean
}) {
  const [aberta, definirAberta] = useState(false)
  // Rede fraca: em vez de um ícone quebrado, um aviso com "tentar de novo".
  const [falhou, definirFalhou] = useState(false)
  const [tentativa, definirTentativa] = useState(0)
  const fecharJanela = useCallback(() => definirAberta(false), [])
  if (falhou) return (
    <figure className="questao__figura">
      <p className="comentario__pendente">A imagem não carregou. <button type="button" className="botao botao--fantasma" onClick={() => { definirFalhou(false); definirTentativa((n) => n + 1) }}>Tentar de novo</button></p>
    </figure>
  )
  return (
    <figure className="questao__figura">
      <button type="button" className="figura-ampliavel" onClick={() => definirAberta(true)} aria-label="Ampliar imagem em tela cheia" aria-haspopup="dialog">
        <img key={tentativa} src={tentativa && !src.startsWith('data:') ? `${src}${src.includes('?') ? '&' : '?'}t=${tentativa}` : src} alt={alt} loading={prioridade ? 'eager' : 'lazy'} onError={() => definirFalhou(true)} width={largura ?? undefined} height={altura ?? undefined} style={{ maxHeight: alturaMaxima, width: 'auto' }} />
        <span className="figura-lupa" aria-hidden="true"><Icone nome="busca" tamanho={18} /><span className="figura-lupa__texto">Ampliar</span></span>
      </button>
      {(imagem.legenda || imagem.fonte) && (
        <figcaption>
          {imagem.legenda}
          {imagem.fonte && <span className="figura-fonte">Fonte: <TextoComLinks texto={imagem.fonte} /></span>}
        </figcaption>
      )}
      {aberta && createPortal(<JanelaImagem src={src} alt={alt} imagem={imagem} aoFechar={fecharJanela} />, document.body)}
    </figure>
  )
}

const ESCALA_MIN = 1
const ESCALA_MAX = 5
const PASSO_CLIQUE = 2.5
type Vista = { s: number; x: number; y: number }
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Janela em tela cheia. O zoom é um transform (escala e deslocamento) sobre a
 * imagem já ajustada à tela, com o ponto sob o dedo ou o cursor parado no
 * lugar. O foco fica preso dentro da janela e volta para a figura ao fechar.
 */
function JanelaImagem({ src, alt, imagem, aoFechar }: { src: string; alt: string; imagem: Imagem; aoFechar: () => void }) {
  const [vista, definirVista] = useState<Vista>({ s: 1, x: 0, y: 0 })
  const [gesto, definirGesto] = useState(false)
  const janela = useRef<HTMLDivElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const foto = useRef<HTMLImageElement>(null)
  const fechar = useRef<HTMLButtonElement>(null)
  const vistaAtual = useRef(vista)
  vistaAtual.current = vista
  // Ponteiros ativos (pinça com dois dedos, arrasto com um) e se houve movimento (aí não é clique).
  const ponteiros = useRef(new Map<number, { x: number; y: number }>())
  const inicioGesto = useRef<{ dist: number; cx: number; cy: number; vista: Vista } | null>(null)
  const moveu = useRef(false)
  const comecouNaImagem = useRef(false)
  const ultimoToque = useRef(0)

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null
    fechar.current?.focus()
    const rolagem = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = rolagem; antes?.focus?.() }
  }, [])

  /** Mantém a imagem cobrindo o centro: não dá para empurrá-la para fora da tela. */
  const ajustar = useCallback((v: Vista): Vista => {
    const img = foto.current
    const s = limitar(v.s, ESCALA_MIN, ESCALA_MAX)
    if (!img || s <= 1.001) return { s: 1, x: 0, y: 0 }
    const folgaX = (img.offsetWidth * (s - 1)) / 2, folgaY = (img.offsetHeight * (s - 1)) / 2
    return { s, x: limitar(v.x, -folgaX, folgaX), y: limitar(v.y, -folgaY, folgaY) }
  }, [])

  /** Nova escala com o ponto (px, py) da tela parado sob o dedo/cursor. */
  const aproximarEm = useCallback((novaEscala: number, px?: number, py?: number, base: Vista = vistaAtual.current) => {
    const img = foto.current
    if (!img) return
    const caixa = palco.current!.getBoundingClientRect()
    const cx = caixa.left + caixa.width / 2, cy = caixa.top + caixa.height / 2
    const alvoX = px ?? cx, alvoY = py ?? cy
    const s = limitar(novaEscala, ESCALA_MIN, ESCALA_MAX)
    const razao = s / base.s
    definirVista(ajustar({ s, x: alvoX - cx - (alvoX - cx - base.x) * razao, y: alvoY - cy - (alvoY - cy - base.y) * razao }))
  }, [ajustar])

  // Roda do mouse (e pinça do trackpad, que chega como roda com Ctrl): aproxima no cursor.
  // Ouvinte nativo e não passivo: o onWheel do React é passivo e não impede a rolagem.
  useEffect(() => {
    const el = palco.current
    if (!el) return
    const rodar = (e: WheelEvent) => {
      e.preventDefault()
      const fator = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : e.ctrlKey ? 0.01 : 0.0018))
      aproximarEm(vistaAtual.current.s * fator, e.clientX, e.clientY)
    }
    el.addEventListener('wheel', rodar, { passive: false })
    return () => el.removeEventListener('wheel', rodar)
  }, [aproximarEm])

  function aoApertar(e: EventoPonteiro<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    if (!ponteiros.current.size) comecouNaImagem.current = e.target === foto.current
    e.currentTarget.setPointerCapture?.(e.pointerId)
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moveu.current = false
    definirGesto(true)
    comecarGesto()
  }
  function comecarGesto() {
    const pts = [...ponteiros.current.values()]
    if (!pts.length) { inicioGesto.current = null; return }
    const cx = pts.reduce((t, p) => t + p.x, 0) / pts.length, cy = pts.reduce((t, p) => t + p.y, 0) / pts.length
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
    inicioGesto.current = { dist, cx, cy, vista: vistaAtual.current }
  }
  function aoMover(e: EventoPonteiro<HTMLDivElement>) {
    if (!ponteiros.current.has(e.pointerId)) return
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const inicio = inicioGesto.current
    if (!inicio) return
    const pts = [...ponteiros.current.values()]
    const cx = pts.reduce((t, p) => t + p.x, 0) / pts.length, cy = pts.reduce((t, p) => t + p.y, 0) / pts.length
    if (Math.hypot(cx - inicio.cx, cy - inicio.cy) > 6) moveu.current = true
    if (pts.length > 1 && inicio.dist > 0) {
      moveu.current = true
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      // Pinça: escala pela distância entre os dedos, em torno do ponto médio inicial, mais o arrasto do ponto médio.
      const base = { ...inicio.vista, x: inicio.vista.x + (cx - inicio.cx), y: inicio.vista.y + (cy - inicio.cy) }
      aproximarEm(inicio.vista.s * (dist / inicio.dist), inicio.cx + (cx - inicio.cx), inicio.cy + (cy - inicio.cy), base)
    } else if (inicio.vista.s > 1) {
      definirVista(ajustar({ ...inicio.vista, x: inicio.vista.x + (cx - inicio.cx), y: inicio.vista.y + (cy - inicio.cy) }))
    }
  }
  function aoSoltar(e: EventoPonteiro<HTMLDivElement>) {
    if (!ponteiros.current.delete(e.pointerId)) return
    if (ponteiros.current.size) { comecarGesto(); return }
    inicioGesto.current = null
    definirGesto(false)
    if (moveu.current) return
    // Toque/clique sem arrastar: fora da imagem fecha; na imagem, dois toques (ou um clique) aproximam ou afastam.
    if (!comecouNaImagem.current) { if (vistaAtual.current.s <= 1) aoFechar(); return }
    if (e.pointerType === 'touch') {
      const agora = Date.now()
      if (agora - ultimoToque.current > 320) { ultimoToque.current = agora; return }
      ultimoToque.current = 0
    }
    if (vistaAtual.current.s > 1) definirVista({ s: 1, x: 0, y: 0 })
    else aproximarEm(PASSO_CLIQUE, e.clientX, e.clientY)
  }
  function aoCancelar(e: EventoPonteiro<HTMLDivElement>) {
    ponteiros.current.delete(e.pointerId)
    if (!ponteiros.current.size) { inicioGesto.current = null; definirGesto(false) }
  }

  /**
   * Teclado enquanto a janela está aberta, ouvido na captura do document: Esc
   * fecha, + − 0 e setas controlam o zoom, Tab fica preso nos botões da janela.
   * Nenhuma tecla chega aos atalhos da questão (1–5, F, R…) por baixo dela; a
   * ação padrão (Enter ou espaço num botão) continua valendo.
   */
  const teclar = useRef<(e: KeyboardEvent) => void>(() => {})
  teclar.current = (e: KeyboardEvent) => {
    const v = vistaAtual.current
    if (e.key === 'Escape') { e.preventDefault(); aoFechar() }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); aproximarEm(v.s * 1.5) }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); aproximarEm(v.s / 1.5) }
    else if (e.key === '0') { e.preventDefault(); definirVista({ s: 1, x: 0, y: 0 }) }
    else if (e.key.startsWith('Arrow') && v.s > 1) {
      e.preventDefault()
      const d = 60
      const dx = e.key === 'ArrowLeft' ? d : e.key === 'ArrowRight' ? -d : 0
      const dy = e.key === 'ArrowUp' ? d : e.key === 'ArrowDown' ? -d : 0
      definirVista(ajustar({ ...v, x: v.x + dx, y: v.y + dy }))
    } else if (e.key === 'Tab') {
      const focaveis = [...(janela.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? [])]
      if (!focaveis.length) return
      const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1]
      const dentro = janela.current?.contains(document.activeElement)
      if (!dentro) { e.preventDefault(); (e.shiftKey ? ultimo : primeiro).focus() }
      else if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    e.stopImmediatePropagation()
  }
  useEffect(() => {
    const ouvir = (e: KeyboardEvent) => teclar.current(e)
    document.addEventListener('keydown', ouvir, true)
    return () => document.removeEventListener('keydown', ouvir, true)
  }, [])

  const ampliada = vista.s > 1.001
  const porcento = Math.round(vista.s * 100)
  return (
    <div ref={janela} className="janela-imagem jz" role="dialog" aria-modal="true" aria-label={`Imagem ampliada: ${alt}`}>
      <div className="jz-barra">
        <div className="jz-zoom" role="group" aria-label="Zoom">
          <button type="button" className="jz-botao" onClick={() => aproximarEm(vista.s / 1.5)} disabled={!ampliada} aria-label="Afastar" title="Afastar (−)"><SinalZoom /></button>
          <button type="button" className="jz-botao jz-botao--nivel" onClick={() => definirVista({ s: 1, x: 0, y: 0 })} disabled={!ampliada} aria-label={`Zoom em ${porcento}%. Ajustar à tela`} title="Ajustar à tela (0)"><span className="numerico">{porcento}%</span></button>
          <button type="button" className="jz-botao" onClick={() => aproximarEm(vista.s * 1.5)} disabled={vista.s >= ESCALA_MAX} aria-label="Aproximar" title="Aproximar (+)"><SinalZoom mais /></button>
        </div>
        <button ref={fechar} type="button" className="jz-botao jz-fechar" onClick={aoFechar} aria-label="Fechar imagem ampliada" title="Fechar (Esc)"><Icone nome="fechar" tamanho={22} /></button>
      </div>
      <div
        ref={palco}
        className={'jz-palco' + (gesto ? ' jz-palco--gesto' : '') + (ampliada ? ' jz-palco--ampliada' : '')}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoCancelar}
      >
        <img
          ref={foto}
          src={src}
          alt={alt}
          draggable={false}
          className="jz-imagem"
          style={{ transform: `translate3d(${vista.x}px, ${vista.y}px, 0) scale(${vista.s})` }}
        />
      </div>
      {(imagem.legenda || imagem.fonte) && (
        <p className="janela-imagem__legenda">
          {imagem.legenda}
          {imagem.fonte && <span className="figura-fonte">Fonte: <TextoComLinks texto={imagem.fonte} /></span>}
        </p>
      )}
      <p className="janela-imagem__dica jz-dica" aria-live="polite">
        <span className="jz-dica--toque">{ampliada ? 'Arraste para mover. Dois toques afastam.' : 'Pinça ou dois toques para aproximar.'}</span>
        <span className="jz-dica--mouse">{ampliada ? 'Arraste para mover. Clique para afastar.' : 'Roda do mouse, clique ou + para aproximar.'}</span>
      </p>
    </div>
  )
}

/** + e − desenhados em pixel (a fonte pixel não tem o sinal de menos). */
function SinalZoom({ mais = false }: { mais?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" fill="currentColor">
      <rect x="0" y="3.5" width="9" height="2" />
      {mais && <rect x="3.5" y="0" width="2" height="9" />}
    </svg>
  )
}

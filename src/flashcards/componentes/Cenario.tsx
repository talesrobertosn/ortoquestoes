import { memo, useEffect, useRef } from 'react'
import type { Cenario as TipoCenario } from '../motor/bestiario'
import { criarAmbiente, pintarCena, type Cena, type Clima } from '../efeitos/pintura'
import { pintarTabuleiro } from '../efeitos/tabuleiros'
import { carregarFloresta, florestaPronta, pintarFloresta } from '../efeitos/floresta'

/** Desfoque barato e compatível com todos os navegadores: reduz e amplia de novo, com suavização. */
function desfocar(src: HTMLCanvasElement, fator: number): HTMLCanvasElement {
  let atual = src
  let w = src.width, h = src.height
  // reduz em passos de 2 (fica mais bonito que um salto só)
  while (fator > 1.01) {
    const k = Math.min(2, fator)
    w = Math.max(1, Math.round(w / k)); h = Math.max(1, Math.round(h / k))
    const t = document.createElement('canvas'); t.width = w; t.height = h
    const c = t.getContext('2d')!; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'
    c.drawImage(atual, 0, 0, w, h)
    atual = t; fator /= k
  }
  return atual
}

/** Cores dos feixes de luz e intensidade, por cena e clima (antes era hue-rotate e mix-blend no CSS). */
function feixes(c: CanvasRenderingContext2D, W: number, H: number, cena: Cena, clima: Clima) {
  const cor = cena === 'masmorra' || cena === 'biblioteca' ? '170,200,255' : clima === 'entardecer' ? '255,196,150' : cena === 'covil' ? '255,170,110' : '255,236,200'
  // a floresta já traz os próprios feixes de sol (camada luz): aqui só um reforço leve
  const forca = clima === 'chuva' ? 0.08 : clima === 'noite' ? 0.2 : cena === 'masmorra' ? 0.3 : cena === 'biblioteca' ? 0.5 : cena === 'campo' ? 0.3 : 0.8
  const t = document.createElement('canvas'); t.width = W; t.height = H
  const f = t.getContext('2d')!
  const ang = (cena === 'biblioteca' ? 170 : 118) * Math.PI / 180
  const dx = Math.sin(ang), dy = -Math.cos(ang), L = W * Math.abs(dx) + H * Math.abs(dy)
  const g = f.createLinearGradient(0, 0, dx * L, dy * L)
  g.addColorStop(0, `rgba(${cor},.2)`); g.addColorStop(0.34, `rgba(${cor},0)`)
  f.fillStyle = g; f.fillRect(0, 0, W, H)
  // faixas repetidas (o mesmo desenho do repeating-linear-gradient antigo)
  f.save(); f.translate(W / 2, H / 2); f.rotate(ang - Math.PI / 2)
  const passo = 230, alcance = Math.hypot(W, H)
  for (let x = -alcance; x < alcance; x += passo) { f.fillStyle = `rgba(${cor},.07)`; f.fillRect(x + 70, -alcance, 50, alcance * 2); f.fillStyle = `rgba(${cor},.05)`; f.fillRect(x + 200, -alcance, 30, alcance * 2) }
  f.restore()
  f.globalCompositeOperation = 'destination-in'
  const m = f.createLinearGradient(0, 0, 0, H); m.addColorStop(0, '#000'); m.addColorStop(0.85, 'rgba(0,0,0,0)')
  f.fillStyle = m; f.fillRect(0, 0, W, H)
  c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = forca; c.drawImage(t, 0, 0); c.restore()
}

/** Luz do clima (multiplica a cena) e névoa com vinheta. */
function climaENevoa(c: CanvasRenderingContext2D, W: number, H: number, clima: Clima) {
  c.save()
  c.globalCompositeOperation = 'multiply'
  if (clima === 'entardecer') { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,160,90,.9)'); g.addColorStop(0.6, 'rgba(220,110,120,.8)'); g.addColorStop(1, 'rgba(90,50,90,.85)'); c.fillStyle = g; c.fillRect(0, 0, W, H) }
  if (clima === 'noite') { const g = c.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, Math.max(W, H) * 0.75); g.addColorStop(0, 'rgba(120,150,230,.55)'); g.addColorStop(1, 'rgba(20,30,80,.85)'); c.fillStyle = g; c.fillRect(0, 0, W, H) }
  if (clima === 'chuva') { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(120,140,170,.95)'); g.addColorStop(1, 'rgba(80,95,125,.9)'); c.fillStyle = g; c.fillRect(0, 0, W, H) }
  c.globalCompositeOperation = 'source-over'
  const n = c.createLinearGradient(0, 0, 0, H)
  if (clima === 'noite') { n.addColorStop(0.4, 'rgba(150,170,220,0)'); n.addColorStop(0.7, 'rgba(150,170,220,.22)'); n.addColorStop(1, 'rgba(150,170,220,.3)') }
  else { n.addColorStop(0.46, 'rgba(200,214,236,0)'); n.addColorStop(0.76, 'rgba(200,214,236,.1)'); n.addColorStop(1, 'rgba(16,10,6,.45)') }
  c.fillStyle = n; c.fillRect(0, 0, W, H)
  const v = c.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.3, W / 2, H * 0.46, Math.hypot(W, H) * 0.6)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)')
  c.fillStyle = v; c.fillRect(0, 0, W, H)
  c.restore()
}

/**
 * Diorama HD-2D: pixel art em planos e luz moderna por cima.
 * Desempenho (13/10/2026): todos os planos (fundo desfocado, meio, tilt-shift,
 * bloom, feixes, clima, frente desfocada, névoa e vinheta) são compostos UMA
 * vez num canvas só, quando o tamanho, a cena ou o clima mudam. Antes eram
 * oito camadas com filtros e misturas do CSS recalculadas a cada quadro, o que
 * travava o celular. Por cima fica só o ambiente animado (bokeh, poeira, chuva).
 */
export const Cenario = memo(function Cenario({ cena, reduzido, clima = 'dia' }: { cena: Cena; reduzido: boolean; clima?: Clima }) {
  const base = useRef<HTMLCanvasElement>(null)
  const ambiente = useRef<HTMLCanvasElement>(null)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const alvo = base.current
    if (!alvo) return
    let espera = 0, ultimo = ''
    const pintar = () => {
      const w = alvo.clientWidth, h = alvo.clientHeight
      const chave = `${w}x${h}`
      if (chave === ultimo || !w) return
      ultimo = chave
      const novo = () => { const c = document.createElement('canvas'); Object.defineProperty(c, 'clientWidth', { value: w }); Object.defineProperty(c, 'clientHeight', { value: h }); return c }
      const planos: { fundo: HTMLCanvasElement; meio: HTMLCanvasElement; frente: HTMLCanvasElement; brilho: HTMLCanvasElement; luz?: HTMLCanvasElement } = { fundo: novo(), meio: novo(), frente: novo(), brilho: novo() }
      // Floresta das Fises Antigas: camadas pintadas offline (ver efeitos/floresta.ts)
      const floresta = cena === 'campo' ? florestaPronta() : null
      if (cena === 'campo' && !floresta) carregarFloresta().then((r) => { if (r) { ultimo = ''; pintar() } })
      if (floresta) { planos.luz = novo(); pintarFloresta(planos, floresta, w, h) }
      else pintarCena(planos, cena)
      const q = Math.min(2, window.devicePixelRatio || 1)
      const W = Math.round(w * q), H = Math.round(h * q)
      alvo.width = W; alvo.height = H
      const c = alvo.getContext('2d')!
      c.imageSmoothingEnabled = false
      const plano = (cv: HTMLCanvasElement, escala: number, liso = false) => {
        c.imageSmoothingEnabled = liso
        const dw = W * escala, dh = H * escala
        c.drawImage(cv, (W - dw) / 2, (H - dh) / 2, dw, dh)
      }
      // fundo desfocado (profundidade de campo)
      plano(desfocar(planos.fundo, 1.4), 1.03, true)
      // meio nítido
      plano(planos.meio, 1.015)
      // tilt-shift: o meio desfocado só no alto e embaixo
      const tilt = document.createElement('canvas'); tilt.width = W; tilt.height = H
      const t = tilt.getContext('2d')!; t.imageSmoothingEnabled = true
      t.drawImage(desfocar(planos.meio, 2), (W - W * 1.015) / 2, (H - H * 1.015) / 2, W * 1.015, H * 1.015)
      t.fillStyle = 'rgba(0,0,0,.1)'; t.globalCompositeOperation = 'source-atop'; t.fillRect(0, 0, W, H)
      t.globalCompositeOperation = 'destination-in'
      const m = t.createLinearGradient(0, 0, 0, H); m.addColorStop(0, '#000'); m.addColorStop(0.24, 'rgba(0,0,0,0)'); m.addColorStop(0.74, 'rgba(0,0,0,0)'); m.addColorStop(1, '#000')
      t.fillStyle = m; t.fillRect(0, 0, W, H)
      c.drawImage(tilt, 0, 0)
      // luz nítida da floresta (feixes, linha fisária das pedras, cogumelos), somada em screen
      if (planos.luz) { c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.9; plano(planos.luz, 1.015); c.restore() }
      // bloom das luzes
      c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.95; c.imageSmoothingEnabled = true
      c.drawImage(desfocar(planos.brilho, 4), 0, 0, W, H); c.restore()
      feixes(c, W, H, cena, clima)
      climaENevoa(c, W, H, clima)
      // frente desfocada e escurecida (mais perto da câmera)
      const fr = document.createElement('canvas'); fr.width = W; fr.height = H
      const f = fr.getContext('2d')!; f.imageSmoothingEnabled = true
      f.drawImage(desfocar(planos.frente, 2.4), (W - W * 1.06) / 2, (H - H * 1.06) / 2, W * 1.06, H * 1.06)
      f.globalCompositeOperation = 'source-atop'; f.fillStyle = 'rgba(0,0,0,.25)'; f.fillRect(0, 0, W, H)
      c.drawImage(fr, 0, 0)
    }
    pintar()
    const obs = new ResizeObserver(() => { window.clearTimeout(espera); espera = window.setTimeout(pintar, 140) })
    obs.observe(alvo)
    return () => { obs.disconnect(); window.clearTimeout(espera) }
  }, [cena, clima])

  useEffect(() => {
    if (reduzido || !ambiente.current) return
    return criarAmbiente(ambiente.current, cena, clima)
  }, [cena, reduzido, clima])

  // paralaxe leve com o mouse (só no computador): move um plano só, sem repintar
  useEffect(() => {
    if (reduzido || !matchMedia('(pointer: fine)').matches) return
    let quadro = 0
    const aoMover = (e: PointerEvent) => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(() => {
        raiz.current?.style.setProperty('--px', (e.clientX / window.innerWidth - 0.5).toFixed(3))
        raiz.current?.style.setProperty('--py', (e.clientY / window.innerHeight - 0.5).toFixed(3))
      })
    }
    window.addEventListener('pointermove', aoMover)
    return () => { window.removeEventListener('pointermove', aoMover); cancelAnimationFrame(quadro) }
  }, [reduzido])

  return (
    <div className={`fc-cena fc-cena--${cena} fc-cena--clima-${clima}`} ref={raiz} aria-hidden="true">
      <canvas ref={base} className="fc-cena__base" />
      <canvas ref={ambiente} className="fc-cena__ambiente" />
      <span className="fc-cena__nevoa" />
    </div>
  )
})

/** Estrado de pedra da mesa (pixel art), repintado quando o tamanho muda. */
export const TampoMesa = memo(function TampoMesa({ cenario }: { cenario: TipoCenario }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    let espera = 0, ultimo = ''
    const pintar = () => {
      const chave = `${c.clientWidth}x${c.clientHeight}`
      if (chave === ultimo) return
      ultimo = chave
      pintarTabuleiro(c, cenario)
    }
    pintar()
    const obs = new ResizeObserver(() => { window.clearTimeout(espera); espera = window.setTimeout(pintar, 120) })
    obs.observe(c)
    return () => { obs.disconnect(); window.clearTimeout(espera) }
  }, [cenario])
  return <canvas ref={ref} className="fc-mesa__tampo" aria-hidden="true" />
})

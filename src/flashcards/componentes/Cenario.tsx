import { lazy, memo, Suspense, useEffect, useRef, useState } from 'react'
import { climaDoCiclo, INTERVALO_CEU } from '../efeitos/cicloExterior'
import type { Cenario as TipoCenario } from '../motor/bestiario'
import { criarAmbiente, pintarCena, type Cena, type Clima } from '../efeitos/pintura'
import { pintarTabuleiro } from '../efeitos/tabuleiros'
import { CENAS_PINTADAS, PAISAGENS, carregarCenarioPintado, cenarioPintadoPronto, formatoPara, pintarCamadas, type CenaAmbientada, type Paisagem } from '../efeitos/cenariosPintados'

// enfeites só da Biblioteca: vêm à parte, quem joga a Cripta não os baixa
const EstacoesBiblioteca = lazy(() => import('./EstacoesBiblioteca').then((m) => ({ default: m.EstacoesBiblioteca })))
const LeitoresBiblioteca = lazy(() => import('./LeitoresBiblioteca').then((m) => ({ default: m.LeitoresBiblioteca })))

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
  const cor = cena === 'biblioteca' ? '255,226,170' : cena === 'masmorra' ? '170,200,255' : clima === 'entardecer' ? '255,196,150' : cena === 'covil' ? '255,170,110' : '255,236,200'
  // a floresta já traz os próprios feixes de sol (camada luz): aqui só um reforço leve
  const forca = clima === 'chuva' ? 0.08 : clima === 'noite' ? 0.2 : cena === 'masmorra' ? 0.3 : cena === 'biblioteca' ? 0.15 : cena === 'campo' || cena === 'jardim' ? 0.3 : 0.8
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

/** Luz do clima (multiplica a cena) e névoa com vinheta. `aberta`: cena de céu aberto (floresta), vinheta mais leve. */
function climaENevoa(c: CanvasRenderingContext2D, W: number, H: number, clima: Clima, aberta = false) {
  c.save()
  c.globalCompositeOperation = 'multiply'
  if (clima === 'entardecer') { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,160,90,.9)'); g.addColorStop(0.6, 'rgba(220,110,120,.8)'); g.addColorStop(1, 'rgba(90,50,90,.85)'); c.fillStyle = g; c.fillRect(0, 0, W, H) }
  if (clima === 'noite') { const g = c.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, Math.max(W, H) * 0.75); g.addColorStop(0, 'rgba(120,150,230,.55)'); g.addColorStop(1, 'rgba(20,30,80,.85)'); c.fillStyle = g; c.fillRect(0, 0, W, H) }
  if (clima === 'chuva') { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(120,140,170,.95)'); g.addColorStop(1, 'rgba(80,95,125,.9)'); c.fillStyle = g; c.fillRect(0, 0, W, H) }
  c.globalCompositeOperation = 'source-over'
  const n = c.createLinearGradient(0, 0, 0, H)
  if (clima === 'noite') { n.addColorStop(0.4, 'rgba(150,170,220,0)'); n.addColorStop(0.7, 'rgba(150,170,220,.22)'); n.addColorStop(1, 'rgba(150,170,220,.3)') }
  else { n.addColorStop(0.46, 'rgba(200,214,236,0)'); n.addColorStop(0.76, 'rgba(200,214,236,.1)'); n.addColorStop(1, `rgba(16,10,6,${aberta ? 0.18 : 0.45})`) }
  c.fillStyle = n; c.fillRect(0, 0, W, H)
  const v = c.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.3, W / 2, H * 0.46, Math.hypot(W, H) * 0.6)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${aberta ? 0.3 : 0.6})`)
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
/**
 * Cor de espera de cada cena (céu e chão), enquanto as camadas pintadas chegam pela rede.
 * Antes, nesse meio-tempo, aparecia a cena antiga pintada em código, que no campo do
 * Golem de Gesso era uma parede de masmorra; quando a floresta chegava, a cena trocava
 * de repente. Agora fica um degradê nas cores da própria cena e a pintura entra suave.
 */
const ESPERA: Record<string, [string, string]> = {
  campo: ['#3d5a46', '#1a2c1c'], jardim: ['#46684e', '#22381f'], treino: ['#56684a', '#283020'], vilarejo: ['#4a6a52', '#24341e'],
  ruinas: ['#48604c', '#20301e'], vila: ['#52704e', '#283a20'], campoflorido: ['#7a5a4a', '#3a2a24'], praia: ['#6a9ab4', '#8a7a58'], estufa: ['#4e7a5a', '#203a26'],
  biblioteca: ['#3e2c1c', '#1a120c'], arquivo: ['#3a3020', '#16120a'], covil: ['#3a1c12', '#140806'], forja: ['#4a2416', '#1a0a06'],
  masmorra: ['#2c303c', '#12141a'], catacumba: ['#22302a', '#0a100c'], laboratorio: ['#2a3a32', '#101a14'], caverna: ['#262c50', '#0e1022'],
  salao: ['#3a2230', '#160c12'], templo: ['#6a5630', '#2a2010'], coliseu: ['#6a4a30', '#2a1a10'], passarela: ['#6a88aa', '#2a3a50'], torre: ['#6a5a7a', '#2a2234'],
}

/** Cenas internas (caverna, salões, masmorras): o clima do andar não entra (não chove dentro do covil). */
const INTERNAS = new Set<Cena>(['covil', 'masmorra', 'salao', 'forja', 'caverna', 'catacumba', 'laboratorio', 'arquivo', 'biblioteca', 'templo'])

export const Cenario = memo(function Cenario({ cena: pedido, reduzido, clima: climaAndar = 'dia' }: { cena: CenaAmbientada; reduzido: boolean; clima?: Clima }) {
  const extra = PAISAGENS.includes(pedido as Paisagem)
  const cena: Cena = extra ? 'campo' : pedido as Cena
  const [etapaCeu, definirEtapaCeu] = useState(0)
  useEffect(() => {
    if (pedido !== 'jardim') { definirEtapaCeu(0); return }
    if (reduzido) return
    let timer = 0
    const acompanharVisibilidade = () => {
      window.clearInterval(timer)
      if (!document.hidden) timer = window.setInterval(() => definirEtapaCeu(etapa => (etapa + 1) % 4), INTERVALO_CEU)
    }
    acompanharVisibilidade()
    document.addEventListener('visibilitychange', acompanharVisibilidade)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', acompanharVisibilidade) }
  }, [pedido, reduzido])
  const clima: Clima = INTERNAS.has(cena) || pedido === 'estufa' ? 'dia' : pedido === 'campoflorido' ? 'entardecer' : pedido === 'jardim' ? climaDoCiclo(etapaCeu) : extra ? 'dia' : climaAndar
  const base = useRef<HTMLCanvasElement>(null)
  const reduzidoRef = useRef(reduzido)
  reduzidoRef.current = reduzido
  const ambiente = useRef<HTMLCanvasElement>(null)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const alvo = base.current
    if (!alvo) return
    let espera = 0, ultimo = '', vivo = true, chegou = false
    const pintar = () => {
      if (!vivo) return
      const w = alvo.clientWidth, h = alvo.clientHeight
      const chave = `${w}x${h}`
      if (chave === ultimo || !w || !h) return
      ultimo = chave
      const novo = () => { const c = document.createElement('canvas'); Object.defineProperty(c, 'clientWidth', { value: w }); Object.defineProperty(c, 'clientHeight', { value: h }); return c }
      const planos: { fundo: HTMLCanvasElement; meio: HTMLCanvasElement; frente: HTMLCanvasElement; brilho: HTMLCanvasElement; luz?: HTMLCanvasElement } = { fundo: novo(), meio: novo(), frente: novo(), brilho: novo() }
      // Floresta e Biblioteca: camadas pintadas offline (ver efeitos/cenariosPintados.ts)
      const nomePintado = CENAS_PINTADAS[pedido]
      const formato = formatoPara(w, h)
      const pintado = nomePintado ? cenarioPintadoPronto(nomePintado, formato) : null
      if (nomePintado && pintado === undefined) {
        // ainda chegando: o canvas fica transparente sobre o degradê da cena e a pintura entra quando chegar
        alvo.width = 1; alvo.height = 1
        carregarCenarioPintado(nomePintado, formato).then(() => { if (vivo) { ultimo = ''; chegou = true; pintar() } })
        return
      }
      if (pintado) { planos.luz = novo(); pintarCamadas(planos, pintado, w, h) }
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
      // Camadas pintadas compartilham a mesma projeção: luz e geometria não podem ter zooms diferentes.
      const zoomMeio = pintado ? 1 : 1.015
      const zoomFrente = pintado ? 1 : 1.06
      // fundo desfocado (profundidade de campo)
      plano(desfocar(planos.fundo, 1.4), pintado ? 1 : 1.03, true)
      // meio nítido
      plano(planos.meio, zoomMeio)
      // tilt-shift: o meio desfocado só no alto e embaixo
      const tilt = document.createElement('canvas'); tilt.width = W; tilt.height = H
      const t = tilt.getContext('2d')!; t.imageSmoothingEnabled = true
      t.drawImage(desfocar(planos.meio, 2), (W - W * zoomMeio) / 2, (H - H * zoomMeio) / 2, W * zoomMeio, H * zoomMeio)
      t.fillStyle = 'rgba(0,0,0,.1)'; t.globalCompositeOperation = 'source-atop'; t.fillRect(0, 0, W, H)
      t.globalCompositeOperation = 'destination-in'
      const m = t.createLinearGradient(0, 0, 0, H); m.addColorStop(0, '#000'); m.addColorStop(0.24, 'rgba(0,0,0,0)'); m.addColorStop(0.74, 'rgba(0,0,0,0)'); m.addColorStop(1, '#000')
      t.fillStyle = m; t.fillRect(0, 0, W, H)
      c.drawImage(tilt, 0, 0)
      // luz nítida da floresta (feixes, linha fisária das pedras, cogumelos), somada em screen
      if (planos.luz) { c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.9; plano(planos.luz, zoomMeio); c.restore() }
      // bloom das luzes
      c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = pintado ? 0.35 : 0.95; c.imageSmoothingEnabled = true
      c.drawImage(desfocar(planos.brilho, 4), 0, 0, W, H); c.restore()
      feixes(c, W, H, cena, clima)
      climaENevoa(c, W, H, clima, cena === 'campo' || cena === 'jardim')
      // frente desfocada e escurecida (mais perto da câmera)
      const fr = document.createElement('canvas'); fr.width = W; fr.height = H
      const f = fr.getContext('2d')!; f.imageSmoothingEnabled = true
      f.drawImage(desfocar(planos.frente, 2.4), (W - W * zoomFrente) / 2, (H - H * zoomFrente) / 2, W * zoomFrente, H * zoomFrente)
      f.globalCompositeOperation = 'source-atop'; f.fillStyle = 'rgba(0,0,0,.25)'; f.fillRect(0, 0, W, H)
      c.drawImage(fr, 0, 0)
      if (chegou) {
        chegou = false
        if (!reduzidoRef.current && typeof alvo.animate === 'function') alvo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' })
      }
    }
    pintar()
    const obs = new ResizeObserver(() => { window.clearTimeout(espera); espera = window.setTimeout(pintar, 140) })
    obs.observe(alvo)
    return () => { vivo = false; obs.disconnect(); window.clearTimeout(espera) }
  }, [pedido, cena, clima])

  useEffect(() => {
    if (reduzido || !ambiente.current) return
    return criarAmbiente(ambiente.current, extra ? 'treino' : cena, clima)
  }, [cena, extra, reduzido, clima])

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
    <div className={`fc-cena fc-cena--${pedido} fc-cena--clima-${clima}`} ref={raiz} aria-hidden="true"
      style={{ ['--espera-ceu' as string]: (ESPERA[pedido] ?? ESPERA[cena] ?? ['#1c1622', '#0c0a10'])[0], ['--espera-chao' as string]: (ESPERA[pedido] ?? ESPERA[cena] ?? ['#1c1622', '#0c0a10'])[1] }}>
      <canvas ref={base} className="fc-cena__base" />
      <canvas ref={ambiente} className="fc-cena__ambiente" />
      {cena === 'biblioteca' && <Suspense fallback={null}><EstacoesBiblioteca reduzido={reduzido} /><LeitoresBiblioteca reduzido={reduzido} /></Suspense>}
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

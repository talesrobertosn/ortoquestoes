import { useEffect, useRef } from 'react'
import type { Fogo } from './rotas'

/**
 * Fogo vivo em volta dos atalhos (31/10/2026, pedido do Tales: "é pra ser fogo mesmo, bonito, denso, épico").
 * Uma simulação de fogo em pixel (a do "fogo do Doom": cada ponto herda o calor de baixo, perde um pouco ao subir e é
 * levado pelo vento) num canvas pequeno ampliado em pixels nítidos. O calor nasce em volta do cartão (forte na borda
 * de cima, médio nas laterais, fraco embaixo) e nunca dentro dele: as chamas sobem pelas laterais, se juntam por cima
 * e não cobrem o texto. Três temperamentos:
 * - Tempo (Cronograma): ouro e âmbar, chamas firmes e constantes, pouco vento;
 * - Conhecimento (Resumos): laranja vivo com faíscas que sobem soltas;
 * - Anatômico (Atlas 3D): azul e ciano com núcleo branco, alto, rápido, nervoso.
 * Um laço só para todos os fogos, a 30 quadros por segundo, parado com a aba escondida ou fora da tela; com "menos
 * movimento", o fogo é calculado uma vez e fica parado.
 */

const CELULA = 3          // pixels de tela por célula do fogo
const MARGEM_PC = { cima: 72, lado: 18, baixo: 12 }
const MARGEM_CEL = { cima: 46, lado: 14, baixo: 10 }

type Rgba = [number, number, number, number]
/**
 * Paleta de 48 tons para fundo claro: o calor fraco some (transparente, nada de fumaça cinza), as pontas entram já na
 * cor quente e translúcidas, e o miolo chega ao branco-dourado. Nenhum tom escuro (no papel claro, escuro vira sujeira).
 */
function paleta(chaves: Rgba[], n = 48, corte = 9): Uint32Array {
  const out = new Uint32Array(n)
  for (let i = corte; i < n; i++) {
    const t = ((i - corte) / (n - 1 - corte)) * (chaves.length - 1)
    const a = chaves[Math.floor(t)], b = chaves[Math.min(chaves.length - 1, Math.floor(t) + 1)], f = t - Math.floor(t)
    const c = a.map((v, k) => Math.round(v + (b[k] - v) * f))
    out[i] = (c[3] << 24) | (c[2] << 16) | (c[1] << 8) | c[0] // ImageData em little-endian: ABGR
  }
  return out
}

interface Jeito { paleta: Uint32Array; queda: number; vento: number; topo: number; lado: number; base: number; faiscas: number; tremor: number }
const JEITOS: Record<Fogo, Jeito> = {
  tempo: {
    paleta: paleta([[214, 92, 8, 70], [226, 104, 10, 150], [238, 128, 14, 215], [246, 158, 24, 245], [251, 188, 44, 255], [254, 214, 92, 255], [255, 234, 150, 255], [255, 248, 214, 255]]),
    queda: 1.15, vento: 0.8, topo: 1, lado: 0.8, base: 0.38, faiscas: 0.003, tremor: 0.12,
  },
  saber: {
    paleta: paleta([[208, 52, 14, 70], [222, 66, 14, 150], [236, 92, 18, 215], [246, 122, 26, 245], [252, 156, 42, 255], [255, 192, 84, 255], [255, 222, 150, 255], [255, 244, 218, 255]]),
    queda: 1.08, vento: 0.95, topo: 1, lado: 0.8, base: 0.38, faiscas: 0.006, tremor: 0.16,
  },
  atlas: {
    paleta: paleta([[96, 60, 240, 70], [78, 84, 250, 150], [58, 116, 255, 215], [44, 156, 255, 245], [52, 196, 255, 255], [120, 228, 255, 255], [196, 246, 255, 255], [240, 255, 255, 255]]),
    queda: 1, vento: 1.05, topo: 1, lado: 0.86, base: 0.45, faiscas: 0.004, tremor: 0.24,
  },
}

interface Chama {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; img: ImageData; px: Uint32Array
  calor: Uint8Array; w: number; h: number; jeito: Jeito; forca: number; alvo: number; t: number
  // o cartão, em células: 1 dentro (sem fogo), e o peso de cada fonte de calor no contorno
  dentro: Uint8Array; fonte: Float32Array; y0: number
}

/** Pré-calcula onde está o cartão (cantos arredondados) e o anel de fontes em volta, com o peso de cada ponto. */
function mapa(w: number, h: number, x0: number, y0: number, x1: number, y1: number, raio: number, jeito: Jeito) {
  const dentro = new Uint8Array(w * h), fonte = new Float32Array(w * h)
  const em = (x: number, y: number) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false
    const cx = x < x0 + raio ? x0 + raio : x > x1 - raio ? x1 - raio : x
    const cy = y < y0 + raio ? y0 + raio : y > y1 - raio ? y1 - raio : y
    return (x - cx) ** 2 + (y - cy) ** 2 <= raio * raio
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (em(x, y)) { dentro[i] = 1; continue }
    if (!(em(x + 2, y) || em(x - 2, y) || em(x, y + 2) || em(x, y - 2))) continue
    const alt = 1 - (y - y0) / Math.max(1, y1 - y0)
    fonte[i] = y < y0 + 2 ? jeito.topo : y > y1 - 2 ? jeito.base : jeito.base + (jeito.lado - jeito.base) * Math.max(0, Math.min(1, alt))
  }
  return { dentro, fonte }
}

const fogos = new Set<Chama>()
let quadro = 0
let ultimo = 0
const MAX = 47

function passo(f: Chama) {
  const { calor, w, h, jeito } = f
  f.forca += (f.alvo - f.forca) * 0.12
  // Fontes: o anel em volta do cartão, mais quente em cima; dentro do cartão, nunca há fogo.
  const { dentro, fonte } = f
  const base = MAX * (0.7 + 0.3 * f.forca)
  f.t += 0.09 + jeito.tremor * 0.12
  for (let i = 0; i < calor.length; i++) {
    if (dentro[i]) { calor[i] = 0; continue }
    const p = fonte[i]
    if (!p) continue
    // Línguas: o calor da borda ondula ao longo do contorno (duas ondas que andam), e cada língua treme.
    const x = i % w, y = (i / w) | 0
    const onda = 0.6 + 0.26 * Math.sin(x * 0.36 + f.t) + 0.16 * Math.sin(x * 0.13 - f.t * 1.6 + y * 0.3) + 0.08 * Math.sin(x * 0.9 + f.t * 2.3)
    calor[i] = Math.min(MAX, Math.round(base * p * onda * (1 - jeito.tremor * Math.random())))
  }
  // Propagação (fogo do Doom): cada célula herda o calor de baixo, perde um pouco e é levada pelo vento.
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w; x++) {
    const v = calor[(y + 1) * w + x]
    // Perda quase constante: a forma vem das línguas (calor que ondula na borda), não de chuvisco; um pouco de acaso dá vida.
    const r = Math.random()
    const perda = r < 0.18 ? 1 : r < 0.82 ? 2 : 3 + (Math.random() < jeito.queda - 1 ? 1 : 0)
    const nx = Math.min(w - 1, Math.max(0, x + Math.round((Math.random() - 0.5) * 1.6 * jeito.vento)))
    const para = y * w + nx
    if (dentro[para] || fonte[para]) continue
    calor[para] = v > perda ? v - perda : 0
  }
  // Faíscas soltas (mais no Conhecimento).
  if (jeito.faiscas) for (let k = 0; k < w * jeito.faiscas * (0.5 + f.forca); k++) {
    const x = (Math.random() * w) | 0, y = (4 + Math.random() * (f.y0 - 8)) | 0
    if (y > 0) calor[y * w + x] = Math.max(calor[y * w + x], MAX - 6)
  }
  // Pintura
  const { px } = f
  const pal = jeito.paleta
  for (let i = 0; i < calor.length; i++) px[i] = pal[Math.min(MAX, calor[i])]
  f.ctx.putImageData(f.img, 0, 0)
}

function laco(t: number) {
  quadro = requestAnimationFrame(laco)
  if (t - ultimo < 33 || document.hidden) return
  ultimo = t
  for (const f of fogos) if (f.canvas.isConnected && f.canvas.dataset.visivel !== '0') passo(f)
}

const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function FogoVivo({ tipo, ativo }: { tipo: Fogo; ativo: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const chama = useRef<Chama | null>(null)
  useEffect(() => { if (chama.current) chama.current.alvo = ativo ? 1.35 : 1 }, [ativo])
  useEffect(() => {
    const canvas = ref.current
    const cartao = canvas?.parentElement
    if (!canvas || !cartao) return
    const montar = () => {
      const MARGEM = matchMedia('(max-width: 40rem)').matches ? MARGEM_CEL : MARGEM_PC
      canvas.style.left = `${-MARGEM.lado}px`; canvas.style.top = `${-MARGEM.cima}px`
      const cw = cartao.offsetWidth, chh = cartao.offsetHeight
      const w = Math.ceil((cw + MARGEM.lado * 2) / CELULA), h = Math.ceil((chh + MARGEM.cima + MARGEM.baixo) / CELULA)
      canvas.width = w; canvas.height = h
      canvas.style.width = `${w * CELULA}px`; canvas.style.height = `${h * CELULA}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const img = ctx.createImageData(w, h)
      const anterior = chama.current
      const f: Chama = {
        canvas, ctx, img, px: new Uint32Array(img.data.buffer), calor: new Uint8Array(w * h), w, h, jeito: JEITOS[tipo],
        forca: anterior?.forca ?? 1, alvo: anterior?.alvo ?? 1, t: anterior?.t ?? Math.random() * 10, y0: Math.round(MARGEM.cima / CELULA),
        ...mapa(w, h, Math.round(MARGEM.lado / CELULA), Math.round(MARGEM.cima / CELULA), Math.round((MARGEM.lado + cw) / CELULA) - 1, Math.round((MARGEM.cima + chh) / CELULA) - 1, Math.round(18 / CELULA), JEITOS[tipo]),
      }
      if (anterior) fogos.delete(anterior)
      chama.current = f
      // Aquece antes de mostrar (o fogo já aparece aceso, não nasce do zero).
      for (let k = 0; k < 40; k++) passo(f)
      if (!semMovimento()) fogos.add(f)
    }
    montar()
    const ro = new ResizeObserver(() => montar())
    ro.observe(cartao)
    const io = new IntersectionObserver(([e]) => { canvas.dataset.visivel = e.isIntersecting ? '1' : '0' })
    io.observe(canvas)
    if (!quadro && !semMovimento()) quadro = requestAnimationFrame(laco)
    return () => {
      ro.disconnect(); io.disconnect()
      if (chama.current) fogos.delete(chama.current)
      if (!fogos.size && quadro) { cancelAnimationFrame(quadro); quadro = 0 }
    }
  }, [tipo])
  return <canvas ref={ref} className={`pt-fogo-vivo pt-fogo-vivo--${tipo}`} aria-hidden="true" />
}

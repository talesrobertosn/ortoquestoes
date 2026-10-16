/**
 * Fogo de verdade em volta de um cartão (pedido do Tales, 16/10/2026: "um fogo bonito, tipo os fogos
 * que nós fizemos para os flashcards"). É a mesma receita da AuraDeFogo dos flashcards, reduzida a
 * um elemento: um campo de chamas em pixel art (ruído que sobe e desenha as línguas, cor em faixas
 * como nos jogos de 16 bits), brasas soltas que sobem balançando e, por baixo, um brilho borrado.
 *
 * Uso: dentro de um elemento com position: relative. As chamas nascem nas bordas dele, sobem acima
 * e se abrem para os lados; o miolo fica livre (o cartão cobre). Só aparência: não recebe toques.
 * Pausa fora da tela e com a aba escondida; com "reduzir movimento" fica só o brilho parado.
 */
import { useEffect, useRef, type CSSProperties } from 'react'
import '../estilos/componentes/Biblioteca.css'

/** Paleta do calor (0 a 1): [calor, r, g, b, a]. */
const PALETA: Array<[number, number, number, number, number]> = [
  [0, 60, 6, 0, 0], [0.08, 120, 14, 6, 80], [0.2, 176, 30, 10, 160], [0.36, 228, 74, 18, 220],
  [0.52, 255, 128, 28, 245], [0.7, 255, 186, 60, 255], [0.86, 255, 230, 140, 255], [1, 255, 252, 225, 255],
]
const BRASAS = [[255, 246, 190], [255, 180, 70], [255, 120, 40]]
const FAIXAS = 9

function sorteio(ix: number, iy: number) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) & 0xffff) / 65535
}
function ruido(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y)
  let fx = x - ix, fy = y - iy
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
  const a = sorteio(ix, iy), b = sorteio(ix + 1, iy), c = sorteio(ix, iy + 1), d = sorteio(ix + 1, iy + 1)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}
const camadas = (x: number, y: number) => 0.55 * ruido(x, y) + 0.3 * ruido(x * 2.03, y * 2.03) + 0.15 * ruido(x * 4.1, y * 4.1)

let lutPronta: Uint32Array | null = null
function lut() {
  if (lutPronta) return lutPronta
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    const h = i / 255
    let k = 0
    while (k < PALETA.length - 2 && h > PALETA[k + 1][0]) k++
    const [h0, r0, g0, b0, a0] = PALETA[k], [h1, r1, g1, b1, a1] = PALETA[k + 1]
    const f = Math.min(1, Math.max(0, (h - h0) / (h1 - h0)))
    const r = r0 + (r1 - r0) * f, g = g0 + (g1 - g0) * f, b = b0 + (b1 - b0) * f, a = a0 + (a1 - a0) * f
    t[i] = ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)
  }
  return (lutPronta = t)
}

export interface PropsChama {
  /** Quanto o fogo sobe acima do cartão, em px. */
  altura?: number
  /** Quanto ele se abre para os lados, em px. */
  lados?: number
  /** 0,4 (brasa discreta) a 1,4 (labareda). */
  forca?: number
  /** Raio dos cantos do cartão, em px (o fogo contorna o arredondado). */
  raio?: number
  className?: string
}

export function ChamaPixel({ altura = 46, lados = 14, forca = 1, raio = 16, className = '' }: PropsChama) {
  const fogoRef = useRef<HTMLCanvasElement>(null)
  const brilhoRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = fogoRef.current, cb = brilhoRef.current
    if (!cv || !cb) return
    const c = cv.getContext('2d'), cg = cb.getContext('2d')
    if (!c || !cg) return
    const parado = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const L = lut()
    let PX = 3, gw = 0, gh = 0, img: ImageData | null = null, px32 = new Uint32Array(0)
    let caixa = { x0: 0, y0: 0, x1: 0, y1: 0 }, rc = 0
    const medir = () => {
      const w = cv.clientWidth, h = cv.clientHeight
      if (w < 4 || h < 4) return
      PX = w > 520 ? 4 : 3
      gw = Math.ceil(w / PX); gh = Math.ceil(h / PX)
      cv.width = gw; cv.height = gh
      cb.width = Math.ceil(gw / 3); cb.height = Math.ceil(gh / 3)
      img = c.createImageData(gw, gh); px32 = new Uint32Array(img.data.buffer)
      // a caixa do cartão vem do layout real (o CSS pode encolher o fogo no celular)
      const dono = cv.parentElement?.parentElement, a = dono?.getBoundingClientRect(), b = cv.getBoundingClientRect()
      caixa = a && b.width ? { x0: (a.left - b.left) / PX, y0: (a.top - b.top) / PX, x1: (a.right - b.left) / PX, y1: (a.bottom - b.top) / PX } : { x0: lados / PX, y0: altura / PX, x1: (w - lados) / PX, y1: (h - lados * 0.5) / PX }
      rc = raio / PX
    }
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(cv)

    type Brasa = { x: number; y: number; vx: number; vy: number; vida: number; max: number; k: number; f: number }
    const brasas: Brasa[] = []
    let visivel = true, quadro = 0, antes = performance.now()
    const inicio = antes
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; if (visivel && !quadro && !parado) quadro = requestAnimationFrame(passo) })
    io.observe(cv)

    const desenhar = (t: number, dt: number) => {
      if (!img) return
      px32.fill(0)
      const { x0, y0, x1, y1 } = caixa
      const R = Math.max(4, y0) * 0.62 * forca
      const kSobe = 0.62, kDesce = 2.4
      const esc = 0.11, sobe = t * 18
      const yIni = Math.max(0, Math.floor(y0 - (R * 1.7) / kSobe))
      for (let y = yIni; y < gh; y++) {
        const base = y * gw
        const v = (y + sobe) * esc * 0.32
        for (let x = 0; x < gw; x++) {
          // distância até o retângulo arredondado do cartão
          const qx = Math.max(x0 + rc - x, 0, x - (x1 - rc)), qy = Math.max(y0 + rc - y, 0, y - (y1 - rc))
          const fora = Math.hypot(qx, qy) - rc
          if (fora <= 0) continue
          // acima do cartão as chamas sobem mais; abaixo quase não há fogo
          const dy = y < y0 ? (y0 - y) * kSobe : y > y1 ? (y - y1) * kDesce : 0
          const dx = Math.max(x0 - x, 0, x - x1)
          const d = Math.max(fora * 0.9, Math.hypot(dx, dy))
          if (d > R * 1.75) continue
          const u = x * esc * 1.35 + 1.1 * ruido(x * esc * 0.4, v * 0.8 + 7.3)
          const nv = Math.min(1, Math.max(0, (camadas(u, v) - 0.5) * 2.1 + 0.5))
          let h = 1 - d / (R * (0.12 + 1.6 * nv))
          if (h <= 0) continue
          if (h > 1) h = 1
          h = h * Math.sqrt(h)
          const faixa = Math.floor(h * FAIXAS) / FAIXAS
          if (faixa > 0) px32[base + x] = L[(faixa * 255) | 0]
        }
      }
      // brasas
      if (brasas.length < 26 * forca && Math.random() < 0.5 * dt) {
        const x = x0 + Math.random() * (x1 - x0)
        brasas.push({ x, y: y0 - Math.random() * 3, vx: (Math.random() - 0.5) * 0.4, vy: -(0.35 + Math.random() * 0.6), vida: 0, max: 40 + Math.random() * 60, k: Math.floor(Math.random() * 3), f: Math.random() * 6.28 })
      }
      for (let j = brasas.length - 1; j >= 0; j--) {
        const b = brasas[j]
        b.vida += dt
        if (b.vida > b.max) { brasas.splice(j, 1); continue }
        b.f += 0.08 * dt
        b.x += (b.vx + Math.sin(b.f) * 0.25) * dt; b.y += b.vy * dt
        const x = Math.round(b.x), y = Math.round(b.y)
        if (x < 0 || y < 0 || x >= gw || y >= gh) continue
        const a = 1 - b.vida / b.max
        const [r, g, bl] = BRASAS[a > 0.6 ? 0 : a > 0.3 ? 1 : 2]
        px32[y * gw + x] = (255 << 24) | (bl << 16) | (g << 8) | r
      }
      c.putImageData(img, 0, 0)
      cg.clearRect(0, 0, cb.width, cb.height)
      cg.drawImage(cv, 0, 0, cb.width, cb.height)
    }

    // 30 quadros por segundo bastam e poupam a bateria
    let ultimo = 0
    function passo(agora: number) {
      quadro = 0
      if (!visivel || document.hidden) return
      quadro = requestAnimationFrame(passo)
      if (agora - ultimo < 33) return
      const dt = Math.min(50, agora - antes) / 16.7
      antes = agora; ultimo = agora
      desenhar((agora - inicio) / 1000, dt)
    }
    const aoMudarAba = () => { if (!document.hidden && visivel && !quadro && !parado) { antes = performance.now(); quadro = requestAnimationFrame(passo) } }
    document.addEventListener('visibilitychange', aoMudarAba)
    if (parado) desenhar(1.7, 1)
    else quadro = requestAnimationFrame(passo)
    return () => { cancelAnimationFrame(quadro); obs.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', aoMudarAba) }
  }, [altura, lados, forca, raio])

  const estilo = { ['--chama-altura' as string]: `${altura}px`, ['--chama-lados' as string]: `${lados}px` } as CSSProperties
  return (
    <span className={`chama-pixel ${className}`} style={estilo} aria-hidden="true">
      <canvas ref={brilhoRef} className="chama-pixel__brilho" />
      <canvas ref={fogoRef} className="chama-pixel__fogo" />
    </span>
  )
}

import { useEffect, useRef } from 'react'
import '../estilos/componentes/BordaDeFogo.css'

/**
 * O botão inteiro pegando fogo (Tales, 10/11/2026: "não é um foguinho em cima do botão; é o botão inteiro, ao redor
 * e dentro"). É a mesma receita da aura dos flashcards (AuraDeFogo): um campo de chamas calculado numa grade de
 * pixels grandes, com ruído que sobe e forma as línguas, e as cores em faixas como nos jogos de 16 bits. Aqui o campo
 * envolve o botão por todos os lados e arde também por dentro dele, atrás do texto. Contido de propósito (Tales,
 * 10/11/2026: "menos chamativo"): chamas curtas, lentas e sem miolo branco.
 *
 * O pai precisa de `position: relative` e `isolation: isolate`. `data-surto="1"` no pai (o dragão soprando) faz o
 * fogo crescer por um instante. Só enfeite: não recebe toque; fora da tela e com "menos movimento" não anima.
 */
const PX = 3
const FAIXAS = 7
/** Paleta do calor (0 a 1): r, g, b, opacidade. */
const PALETA: Array<[number, number, number, number, number]> = [
  [0, 70, 8, 0, 0], [0.1, 130, 16, 6, 150], [0.24, 186, 34, 10, 230], [0.4, 232, 78, 18, 255], [0.56, 255, 132, 28, 255], [0.72, 255, 190, 62, 255], [0.88, 255, 232, 140, 255], [1, 255, 252, 225, 255],
]
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
const camadas = (x: number, y: number) => 0.6 * ruido(x, y) + 0.4 * ruido(x * 2.03, y * 2.03)
function montarLut() {
  const lut = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    const h = i / 255
    let k = 0
    while (k < PALETA.length - 2 && h > PALETA[k + 1][0]) k++
    const [h0, r0, g0, b0, a0] = PALETA[k], [h1, r1, g1, b1, a1] = PALETA[k + 1]
    const t = Math.min(1, Math.max(0, (h - h0) / (h1 - h0)))
    lut[i] = (((a0 + (a1 - a0) * t) & 255) << 24) | (((b0 + (b1 - b0) * t) & 255) << 16) | (((g0 + (g1 - g0) * t) & 255) << 8) | ((r0 + (r1 - r0) * t) & 255)
  }
  return lut
}

/** Margens do campo de fogo em volta do botão (px): as chamas sobem bem mais do que descem. */
const M = { lado: 12, cima: 24, baixo: 6 }

export function BordaDeFogo() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current, pai = cv?.parentElement
    if (!cv || !pai) return
    const c = cv.getContext('2d')
    if (!c) return
    const lut = montarLut()
    let gw = 0, gh = 0, img: ImageData | null = null, px: Uint32Array | null = null
    const medir = () => {
      const w = pai.offsetWidth + M.lado * 2, h = pai.offsetHeight + M.cima + M.baixo
      gw = Math.max(8, Math.ceil(w / PX)); gh = Math.max(8, Math.ceil(h / PX))
      cv.width = gw; cv.height = gh
      img = c.createImageData(gw, gh); px = new Uint32Array(img.data.buffer)
    }
    let surto = 0
    const pintar = (t: number) => {
      if (!img || !px) return
      px.fill(0)
      const x0 = M.lado / PX, x1 = gw - M.lado / PX, y0 = M.cima / PX, y1 = gh - M.baixo / PX
      surto += ((pai.dataset.surto === '1' ? 1 : 0) - surto) * 0.12
      const R = 4.2 + surto * 4, esc = 0.11, sobe = t * 8
      for (let y = 0; y < gh; y++) {
        const dCima = Math.max(y0 - y, 0) * 0.42, dBaixo = Math.max(y - y1, 0) * 2.2
        const v = (y + sobe) * esc * 0.5
        for (let x = 0; x < gw; x++) {
          const dx = Math.max(x0 - x, 0, x - x1)
          let h: number
          if (dx === 0 && dCima === 0 && dBaixo === 0) {
            // por dentro: o botão arde inteiro, mais quente embaixo, com línguas subindo atrás do texto
            const fundo = (y - y0) / Math.max(1, y1 - y0)
            h = Math.min(0.62, 0.22 + 0.16 * fundo + 0.34 * camadas(x * esc * 1.5, v * 1.3) + surto * 0.12)
          } else {
            const d = Math.sqrt(dx * dx * 2.4 + dCima * dCima + dBaixo * dBaixo)
            const nv = Math.min(1, Math.max(0, (camadas(x * esc * 1.4 + 0.9 * ruido(x * esc * 0.4, v * 0.8 + 7.3), v) - 0.5) * 2.2 + 0.5))
            h = Math.min(0.86, 1 - d / (R * (0.14 + 1.5 * nv)))
          }
          if (h <= 0) continue
          const faixa = Math.floor(Math.min(1, h) * FAIXAS) / FAIXAS
          if (faixa > 0) px[y * gw + x] = lut[(faixa * 255) | 0]
        }
      }
      c.putImageData(img, 0, 0)
    }
    medir()
    const parado = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (parado) { pintar(1.7); return }
    let quadro = 0, visivel = true, ultimo = 0
    const inicio = performance.now()
    // 24 quadros por segundo bastam para fogo em pixel e poupam bateria.
    const passo = (agora: number) => {
      quadro = requestAnimationFrame(passo)
      if (!visivel || document.hidden || agora - ultimo < 41) return
      ultimo = agora
      pintar((agora - inicio) / 1000)
    }
    quadro = requestAnimationFrame(passo)
    const olho = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { visivel = e.isIntersecting }) : null
    olho?.observe(pai)
    const medida = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    medida?.observe(pai)
    return () => { cancelAnimationFrame(quadro); olho?.disconnect(); medida?.disconnect() }
  }, [])
  return <span className="fogo-borda" aria-hidden="true"><canvas ref={ref} /></span>
}

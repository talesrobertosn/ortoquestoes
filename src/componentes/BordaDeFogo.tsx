import { useEffect, useRef } from 'react'
import '../estilos/componentes/BordaDeFogo.css'

/**
 * O botão pegando fogo (10/11/2026, refeito a pedido do Tales: o fogo antigo, um campo de ruído que enchia o botão de
 * laranja, "está muito feio"). Agora é fogo de pixel de verdade, calculado célula a célula como nos jogos de 16 bits:
 * - as fontes de calor ficam na BORDA do botão: forte no alto (as línguas sobem), média nos lados e fraca embaixo;
 * - a cada quadro, cada célula vira a média das de baixo, menos um resfriamento que sobe junto (ruído esticado na
 *   vertical): é isso que desenha as línguas, os rasgos e as pontas que se soltam;
 * - por dentro o botão é brasa (só vermelhos escuros que respiram), para o texto continuar legível;
 * - fagulhas: alguns pontos claros escapam da chama, sobem ondulando e se apagam;
 * - a paleta tem 12 tons em degraus, do vermelho da ponta ao amarelo claro da base, sem branco estourado.
 * O pai precisa de `position: relative` e `isolation: isolate`. `data-surto="1"` no pai faz o fogo crescer por um
 * instante. Só enfeite: não recebe toque; fora da tela e com "menos movimento" não anima (fica um quadro parado).
 */
const PX = 3
/** Margens do campo em volta do botão (px): as chamas sobem bem mais do que descem. */
const M = { lado: 14, cima: 30, baixo: 6 }
/** Paleta em degraus (12 tons, do vermelho da borda ao amarelo claro da base), r, g, b, opacidade. */
const PALETA: Array<[number, number, number, number]> = [
  [0, 0, 0, 0], [170, 34, 14, 170], [200, 52, 16, 215], [224, 78, 20, 245], [240, 104, 26, 255], [250, 132, 34, 255],
  [255, 156, 44, 255], [255, 178, 58, 255], [255, 198, 78, 255], [255, 214, 104, 255], [255, 230, 140, 255], [255, 244, 192, 255],
]
const rgba = ([r, g, b, a]: [number, number, number, number]) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
const COR = new Uint32Array(PALETA.map(rgba))
/** A brasa de dentro do botão: dois vinhos escuros, para o texto continuar legível. */
const BRASA = [rgba([92, 16, 8, 235]), rgba([120, 24, 10, 240])]
/** Ajustes do fogo, escolhidos num protótipo lado a lado (10/11/2026): resfriamento, força e escala do ruído, subida e degraus. */
const FRIO = 0.027, RUIDO = 0.075, SX = 0.45, SY = 0.12, SOBE = 1.6, DEGRAUS = 14

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

export function BordaDeFogo() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current, pai = cv?.parentElement
    if (!cv || !pai) return
    const c = cv.getContext('2d')
    if (!c) return
    let gw = 0, gh = 0, img: ImageData | null = null, px: Uint32Array | null = null
    let calor = new Float32Array(0), novo = new Float32Array(0)
    let x0 = 0, x1 = 0, y0 = 0, y1 = 0
    const medir = () => {
      const w = pai.offsetWidth + M.lado * 2, h = pai.offsetHeight + M.cima + M.baixo
      gw = Math.max(8, Math.ceil(w / PX)); gh = Math.max(8, Math.ceil(h / PX))
      cv.width = gw; cv.height = gh
      img = c.createImageData(gw, gh); px = new Uint32Array(img.data.buffer)
      calor = new Float32Array(gw * gh); novo = new Float32Array(gw * gh)
      x0 = Math.round(M.lado / PX); x1 = gw - Math.round(M.lado / PX) - 1; y0 = Math.round(M.cima / PX); y1 = gh - Math.round(M.baixo / PX) - 1
    }
    let semente = 0x9e3779b9
    const sorte = () => { semente ^= semente << 13; semente ^= semente >>> 17; semente ^= semente << 5; return (semente >>> 0) / 4294967296 }
    type Fagulha = { x: number; y: number; vida: number; fase: number }
    const fagulhas: Fagulha[] = []
    let surto = 0
    let t = 0
    const dentro = (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1
    const passo = () => {
      if (!img || !px) return
      t++
      surto += ((pai.dataset.surto === '1' ? 1 : 0) - surto) * 0.12
      // 1. as fontes de calor na borda: forte em cima (com uma onda lenta que faz as línguas grandes), média nos lados, fraca embaixo.
      for (let x = x0; x <= x1; x++) {
        const onda = 0.6 + 0.4 * Math.sin(x * 0.17 + t * 0.08) * Math.sin(x * 0.047 - t * 0.03)
        calor[y0 * gw + x] = (0.7 + 0.3 * sorte()) * onda * (1 + surto * 0.5) + 0.15
        calor[y1 * gw + x] = 0.25 * sorte()
      }
      for (let y = y0; y <= y1; y++) { const v = 0.55 * (0.6 + 0.4 * sorte()); calor[y * gw + x0] = v; calor[y * gw + x1] = v }
      // 2. o calor sobe: cada célula é a média das de baixo, menos um resfriamento que sobe junto (um ruído esticado na
      //    vertical). É isso que corta o fogo em línguas e solta as pontas.
      novo.set(calor)
      const frio = FRIO * (1 - surto * 0.5)
      for (let y = 0; y < gh - 2; y++) {
        for (let x = 1; x < gw - 1; x++) {
          if (dentro(x, y)) continue
          const j = (y + 1) * gw + x
          const v = (calor[j - 1] + calor[j] + calor[j + 1] + calor[j + gw]) * 0.25 - frio - RUIDO * ruido(x * SX, (y + t * SOBE) * SY)
          novo[y * gw + x] = v > 0 ? v : 0
        }
      }
      const troca = calor; calor = novo; novo = troca
      // 3. pinta em degraus: chama por fora, brasa por dentro, e as fagulhas por cima.
      px.fill(0)
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const i = y * gw + x
          if (x > x0 && x < x1 && y > y0 && y < y1) {
            const m = Math.sin(x * 0.16 + t * 0.045) * Math.sin(y * 0.42 - t * 0.07) + 0.35 * Math.sin((x - y) * 0.09 + t * 0.03)
            px[i] = BRASA[m > 0.5 ? 1 : 0]
            continue
          }
          const k = Math.min(PALETA.length - 1, (calor[i] * DEGRAUS) | 0)
          if (k > 0) px[i] = COR[k]
        }
      }
      if (fagulhas.length < 8 && sorte() < 0.2) fagulhas.push({ x: x0 + sorte() * (x1 - x0), y: y0 - 3, vida: 12 + sorte() * 12, fase: sorte() * 6 })
      for (let k = fagulhas.length - 1; k >= 0; k--) {
        const f = fagulhas[k]
        f.y -= 0.6; f.x += Math.sin(f.fase + t * 0.3) * 0.4; f.vida--
        if (f.vida <= 0 || f.y < 0) { fagulhas.splice(k, 1); continue }
        const fx = f.x | 0, fy = f.y | 0
        if (fx >= 0 && fx < gw && fy >= 0 && fy < gh) px[fy * gw + fx] = COR[f.vida > 9 ? 11 : f.vida > 4 ? 9 : 6]
      }
      c.putImageData(img, 0, 0)
    }
    medir()
    const parado = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (parado) { for (let k = 0; k < 60; k++) passo(); return }
    let quadro = 0, visivel = true, ultimo = 0
    // 20 quadros por segundo: o fogo em pixel fica vivo e poupa bateria.
    const laco = (agora: number) => {
      quadro = requestAnimationFrame(laco)
      if (!visivel || document.hidden || agora - ultimo < 50) return
      ultimo = agora
      passo()
    }
    for (let k = 0; k < 50; k++) passo()
    quadro = requestAnimationFrame(laco)
    const olho = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { visivel = e.isIntersecting }) : null
    olho?.observe(pai)
    const medida = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { medir(); for (let k = 0; k < 50; k++) passo() }) : null
    medida?.observe(pai)
    return () => { cancelAnimationFrame(quadro); olho?.disconnect(); medida?.disconnect() }
  }, [])
  return <span className="fogo-borda" aria-hidden="true"><canvas ref={ref} /></span>
}

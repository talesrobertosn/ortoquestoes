/**
 * Aura de fogo da Biblioteca (pedido do Tales, 14/10/2026): na sequência de
 * acertos o flashcard pega fogo como os personagens de anime quando liberam
 * poder. As chamas nascem num anel em volta do flashcard, sobem acima dele
 * (sem cobrir o céu do janelão, que mostra a hora) e se abrem para os lados; a cada nível o fogo cresce e muda de
 * cor (escarlate, azul, arcano e, na Glória, ouro).
 *
 * Estilo HD-2D: o fogo é pixel art (um campo de chamas calculado numa grade de
 * pixels grandes, com ruído que sobe e forma as línguas, e cores em faixas como
 * nos jogos de 16 bits) e por baixo vem um brilho suave borrado, que faz o
 * papel da iluminação moderna. Brasas soltas sobem
 * balançando e, quando o nível sobe, uma explosão de fagulhas e uma onda de
 * choque saem do flashcard.
 *
 * Só aparência: fica atrás da interface e não recebe toques.
 */
import { useEffect, useRef } from 'react'

export type TomAura = 'escarlate' | 'fatuo' | 'ancestral' | 'ouro'

/** Paleta do calor (0 a 1): cor e opacidade de cada faixa da chama. */
const PALETAS: Record<TomAura, Array<[number, number, number, number, number]>> = {
  escarlate: [[0, 60, 6, 0, 0], [0.08, 120, 14, 6, 90], [0.2, 176, 30, 10, 170], [0.36, 228, 74, 18, 225], [0.52, 255, 128, 28, 250], [0.7, 255, 186, 60, 255], [0.86, 255, 230, 140, 255], [1, 255, 252, 225, 255]],
  fatuo: [[0, 0, 10, 50, 0], [0.08, 6, 30, 120, 90], [0.2, 12, 60, 180, 170], [0.36, 24, 110, 235, 225], [0.52, 60, 165, 255, 250], [0.7, 120, 215, 255, 255], [0.86, 200, 245, 255, 255], [1, 250, 255, 255, 255]],
  ancestral: [[0, 30, 0, 50, 0], [0.08, 70, 6, 110, 90], [0.2, 110, 14, 170, 170], [0.36, 150, 30, 220, 225], [0.52, 190, 70, 255, 250], [0.7, 222, 130, 255, 255], [0.86, 245, 205, 255, 255], [1, 255, 250, 255, 255]],
  ouro: [[0, 60, 24, 0, 0], [0.08, 130, 56, 6, 90], [0.2, 190, 100, 10, 170], [0.36, 236, 158, 24, 225], [0.52, 255, 200, 60, 250], [0.7, 255, 228, 120, 255], [0.86, 255, 246, 196, 255], [1, 255, 255, 250, 255]],
}
/** Cor das brasas soltas e da onda de choque. */
const BRASA: Record<TomAura, number[][]> = {
  escarlate: [[255, 246, 190], [255, 180, 70], [255, 120, 40]],
  fatuo: [[235, 252, 255], [140, 225, 255], [80, 170, 255]],
  ancestral: [[250, 230, 255], [215, 150, 255], [170, 90, 255]],
  ouro: [[255, 252, 220], [255, 222, 110], [255, 180, 50]],
}

/**
 * Tamanho do fogo por nível (frações do lado menor da tela): alcance nos lados,
 * quanto as chamas sobem a mais que isso (subir), velocidade, brasas soltas e
 * fogo no chão da tela.
 */
const NIVEIS = [
  // Acabamento de 15/10/2026: as chamas sobem menos (antes 2,1 a 3) e a parte de cima da aura
  // esmaece no CSS (.fc-clima > .fc-aura), para o céu do janelão mostrar a hora da Biblioteca.
  { alcance: 0.1, subir: 1.5, vel: 16, brasas: 50, chao: 0 },
  { alcance: 0.1, subir: 1.5, vel: 16, brasas: 50, chao: 0 },
  { alcance: 0.13, subir: 1.7, vel: 20, brasas: 90, chao: 0.07 },
  { alcance: 0.16, subir: 1.9, vel: 24, brasas: 130, chao: 0.11 },
  { alcance: 0.19, subir: 2.1, vel: 26, brasas: 170, chao: 0.14 },
]
/** Faixas de cor do fogo (pixel art: a cor muda em degraus, não em degradê). */
const FAIXAS = 9

/** Ruído de valor 2D (suave) e a soma de três oitavas. */
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

function montarLut(tom: TomAura) {
  const p = PALETAS[tom], lut = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    const h = i / 255
    let k = 0
    while (k < p.length - 2 && h > p[k + 1][0]) k++
    const [h0, r0, g0, b0, a0] = p[k], [h1, r1, g1, b1, a1] = p[k + 1]
    const t = Math.min(1, Math.max(0, (h - h0) / (h1 - h0)))
    const r = r0 + (r1 - r0) * t, g = g0 + (g1 - g0) * t, b = b0 + (b1 - b0) * t, a = a0 + (a1 - a0) * t
    // ImageData em little-endian: ABGR
    lut[i] = ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)
  }
  return lut
}

export function AuraDeFogo({ tom, nivel, alvo = '.fc-estudo__mesa .fc-carta:not(.fc-carta--descartada)' }: { tom: TomAura; nivel: number; alvo?: string }) {
  const fogoRef = useRef<HTMLCanvasElement>(null)
  const brilhoRef = useRef<HTMLCanvasElement>(null)
  const raizRef = useRef<HTMLDivElement>(null)
  const params = useRef({ tom, nivel: tom === 'ouro' ? 4 : Math.max(1, Math.min(3, nivel)) })
  params.current = { tom, nivel: tom === 'ouro' ? 4 : Math.max(1, Math.min(3, nivel)) }

  useEffect(() => {
    const cv = fogoRef.current, cb = brilhoRef.current
    if (!cv || !cb) return
    const c = cv.getContext('2d')!, cg = cb.getContext('2d')!
    let PX = 4, gw = 0, gh = 0
    let img: ImageData, px32: Uint32Array
    const medir = () => {
      const w = cv.clientWidth, h = cv.clientHeight
      PX = w < 700 ? 4 : 5
      gw = Math.max(40, Math.ceil(w / PX)); gh = Math.max(40, Math.ceil(h / PX))
      cv.width = gw; cv.height = gh
      cb.width = Math.ceil(gw / 3); cb.height = Math.ceil(gh / 3)
      img = c.createImageData(gw, gh); px32 = new Uint32Array(img.data.buffer)
    }
    medir()
    window.addEventListener('resize', medir)

    let lutTom: TomAura | null = null, lut = new Uint32Array(256)
    let chave = ''
    let caixa: { x0: number; y0: number; x1: number; y1: number } | null = null
    let quadro = 0, n = 0, antes = performance.now(), inicio = antes
    let forca = 0 // acende devagar ao começar
    type Brasa = { x: number; y: number; vx: number; vy: number; vida: number; max: number; k: number; f: number }
    const brasas: Brasa[] = []
    let onda: { r: number; max: number } | null = null

    // A aura acompanha o flashcard como ele aparece na tela (inclusive girando ao
    // virar, quando as chamas se fecham em volta dele) e desliza até a nova medida.
    let semAlvoDesde = 0, cobre = 1
    const medirAlvo = (agora: number) => {
      const el = document.querySelector(alvo) as HTMLElement | null
      const b = cv.getBoundingClientRect()
      const a = el?.getBoundingClientRect()
      if (!a || a.width < 2 || b.width < 10) {
        // entre um flashcard e outro: a aura se fecha numa bola de fogo no centro
        if (caixa) {
          const mx = (caixa.x0 + caixa.x1) / 2, my = (caixa.y0 + caixa.y1) / 2, lw = (caixa.x1 - caixa.x0) * 0.35, lh = (caixa.y1 - caixa.y0) * 0.35
          caixa = { x0: mx - lw, x1: mx + lw, y0: my - lh, y1: my + lh }
        }
        cobre = 0.12
        if (!semAlvoDesde) semAlvoDesde = agora
        if (agora - semAlvoDesde > 1200) caixa = null
        return
      }
      semAlvoDesde = 0
      // flashcard novo chegando (ainda transparente): a aura vira uma bola de fogo
      // no centro dele e cresce junto, sem deixar um buraco vazio na tela
      // o tamanho vem do layout vezes a escala do próprio giro (ao virar de lado, a
      // largura vai a quase zero); medir só a caixa na tela falha no ângulo de 90°
      const cs = getComputedStyle(el!)
      const o = Math.max(0.12, Math.min(1, Number(cs.opacity) || 0))
      cobre = o < cobre ? o : cobre + (o - cobre) * 0.5
      let sx = 1, sy = 1
      if (cs.transform && cs.transform !== 'none') { const m = new DOMMatrixReadOnly(cs.transform); sx = Math.hypot(m.a, m.b); sy = Math.hypot(m.c, m.d) }
      const mx = (a.left + a.right) / 2 - b.left, my = (a.top + a.bottom) / 2 - b.top
      const lw = (el!.offsetWidth / 2) * Math.max(0.04, sx) * o, lh = (el!.offsetHeight / 2) * Math.max(0.04, sy) * o
      const novo = { x0: (mx - lw) / PX, y0: (my - lh) / PX, x1: (mx + lw) / PX, y1: (my + lh) / PX }
      // encolhe na hora (o flashcard sumiu ou virou de lado) e cresce deslizando
      if (!caixa || novo.x1 - novo.x0 < caixa.x1 - caixa.x0 - 1) { caixa = novo; return }
      const k = 0.45
      caixa = { x0: caixa.x0 + (novo.x0 - caixa.x0) * k, y0: caixa.y0 + (novo.y0 - caixa.y0) * k, x1: caixa.x1 + (novo.x1 - caixa.x1) * k, y1: caixa.y1 + (novo.y1 - caixa.y1) * k }
    }

    const explodir = (forte: boolean) => {
      if (!caixa) return
      const cx = (caixa.x0 + caixa.x1) / 2, cy = (caixa.y0 + caixa.y1) / 2
      const qt = forte ? 220 : 120
      for (let i = 0; i < qt; i++) {
        const ang = Math.random() * Math.PI * 2, v = 1.2 + Math.random() * (forte ? 4.2 : 3)
        brasas.push({ x: cx + Math.cos(ang) * (caixa.x1 - caixa.x0) * 0.45, y: cy + Math.sin(ang) * (caixa.y1 - caixa.y0) * 0.45, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 0.6, vida: 0, max: 40 + Math.random() * 50, k: Math.floor(Math.random() * 3), f: Math.random() * 6.28 })
      }
      onda = { r: Math.max(caixa.x1 - caixa.x0, caixa.y1 - caixa.y0) * 0.5, max: Math.max(gw, gh) * 0.85 }
      const raiz = raizRef.current
      if (raiz) { raiz.classList.remove('fc-aura--ignicao'); void raiz.offsetWidth; raiz.classList.add('fc-aura--ignicao') }
    }

    const passo = (agora: number) => {
      const dt = Math.min(50, agora - antes) / 16.7
      antes = agora
      n++
      const { tom, nivel } = params.current
      const P = NIVEIS[nivel]
      if (tom !== lutTom) { lut = montarLut(tom); lutTom = tom }
      medirAlvo(agora)
      const k = tom + nivel
      if (k !== chave) { if (chave) explodir(nivel >= 3); else window.setTimeout(() => explodir(nivel >= 3), 60); chave = k }
      forca = Math.min(1, forca + 0.03 * dt)
      const t = (agora - inicio) / 1000

      // 1) o campo de chamas: distância até o flashcard (esticada para cima, onde o fogo
      //    sobe mais) comparada com um ruído que sobe com o tempo e desenha as línguas
      px32.fill(0)
      const cx = caixa ? (caixa.x0 + caixa.x1) / 2 : gw / 2
      const meiaLarg = caixa ? Math.max(1, (caixa.x1 - caixa.x0) / 2) : gw / 4
      const menor = Math.min(gw, gh)
      const R = P.alcance * menor * (0.35 + 0.65 * forca)
      const kSobe = 1 / P.subir, kDesce = 1.8
      const esc = 0.07, sobe = t * P.vel
      const chao = P.chao * menor * forca
      if (caixa || chao > 0) {
        const cx0 = caixa?.x0 ?? 0, cx1 = caixa?.x1 ?? 0, cy0 = caixa?.y0 ?? 0, cy1 = caixa?.y1 ?? 0
        const yIni = caixa ? Math.max(0, Math.floor(cy0 - (R * 1.6) / kSobe)) : 0
        for (let y = chao > 0 ? 0 : yIni; y < gh; y++) {
          const base = y * gw
          const dSobe = Math.max(cy0 - y, 0) * kSobe, dDesce = Math.max(y - cy1, 0) * kDesce
          const v = (y + sobe) * esc * 0.32
          for (let x = 0; x < gw; x++) {
            let h = 0
            if (caixa) {
              const dx = Math.max(cx0 - x, 0, x - cx1)
              if (dx === 0 && dSobe === 0 && dDesce === 0) {
                // atrás do flashcard; enquanto ele ainda está transparente, o miolo também arde
                if (cobre > 0.92) continue
                h = (1 - cobre) * (0.55 + 0.5 * camadas(x * esc * 1.35, v))
              } else {
                const d2 = dx * dx + dSobe * dSobe + dDesce * dDesce
                if (d2 < R * R * 2.6) {
                  const d = Math.sqrt(d2)
                  const u = x * esc * 1.35 + 1.1 * ruido(x * esc * 0.4, v * 0.8 + 7.3)
                  // contraste no ruído: línguas altas separadas por vãos
                  const nv = Math.min(1, Math.max(0, (camadas(u, v) - 0.5) * 2 + 0.5))
                  h = 1 - d / (R * (0.12 + 1.55 * nv))
                }
              }
            }
            if (chao > 0) {
              const nv = camadas(x * esc * 0.8 + 31, (y + sobe * 0.8) * esc * 0.6)
              const hc = 0.8 - (gh - 1 - y) / (chao * (0.1 + 1.6 * nv))
              if (hc > h) h = hc
            }
            if (h <= 0) continue
            if (h > 1) h = 1
            h = h * Math.sqrt(h) // o miolo branco fica fino, junto do flashcard
            const faixa = Math.floor(h * FAIXAS) / FAIXAS
            if (faixa > 0) px32[base + x] = lut[(faixa * 255) | 0]
          }
        }
      }

      // 2) brasas soltas subindo e balançando
      const alvoBrasas = P.brasas * forca
      if (caixa && brasas.length < alvoBrasas + 250 && Math.random() < 0.9) {
        const novas = Math.max(1, Math.round(alvoBrasas / 30))
        for (let j = 0; j < novas; j++) {
          const lado = Math.random()
          const x = lado < 0.25 ? caixa.x0 - 2 : lado < 0.5 ? caixa.x1 + 2 : caixa.x0 + Math.random() * (caixa.x1 - caixa.x0)
          const y = lado < 0.5 ? caixa.y0 + Math.random() * (caixa.y1 - caixa.y0) : caixa.y0 - Math.random() * 6
          brasas.push({ x, y, vx: (Math.random() - 0.5) * 0.6 + (x - cx) / meiaLarg * 0.25, vy: -(0.7 + Math.random() * 1.4) * (0.8 + nivel * 0.15), vida: 0, max: 50 + Math.random() * 90, k: Math.floor(Math.random() * 3), f: Math.random() * 6.28 })
        }
      }
      const cores = BRASA[tom]
      for (let j = brasas.length - 1; j >= 0; j--) {
        const b = brasas[j]
        b.vida += dt
        if (b.vida > b.max) { brasas.splice(j, 1); continue }
        b.f += 0.08 * dt
        b.x += (b.vx + Math.sin(b.f) * 0.35) * dt; b.y += b.vy * dt
        b.vx *= 0.985; b.vy = b.vy * 0.985 - 0.012 * dt
        const x = Math.round(b.x), y = Math.round(b.y)
        if (x < 1 || y < 1 || x >= gw - 1 || y >= gh - 1) continue
        const a = 1 - b.vida / b.max
        const [r, g, bl] = cores[a > 0.6 ? 0 : a > 0.3 ? 1 : 2]
        const cor = (255 << 24) | (bl << 16) | (g << 8) | r
        px32[y * gw + x] = cor
        if (b.k === 0 && a > 0.4) { px32[y * gw + x + 1] = cor; px32[(y + 1) * gw + x] = cor; px32[(y + 1) * gw + x + 1] = cor }
      }

      // 3) onda de choque quando o nível sobe
      if (onda && caixa) {
        onda.r += 5 * dt
        const a = 1 - onda.r / onda.max
        if (a <= 0) onda = null
        else {
          const [r, g, bl] = cores[0], cor = (Math.round(255 * a) << 24) | (bl << 16) | (g << 8) | r
          const ox = (caixa.x0 + caixa.x1) / 2, oy = (caixa.y0 + caixa.y1) / 2
          const passos = Math.ceil(onda.r * 6.3)
          for (let s = 0; s < passos; s++) {
            const ang = (s / passos) * Math.PI * 2
            for (let e = 0; e < 2; e++) {
              const x = Math.round(ox + Math.cos(ang) * (onda.r - e)), y = Math.round(oy + Math.sin(ang) * (onda.r - e) * 0.8)
              if (x >= 0 && y >= 0 && x < gw && y < gh) px32[y * gw + x] = cor
            }
          }
        }
      }

      c.putImageData(img, 0, 0)
      // 4) brilho HD: o mesmo fogo, menor e borrado (no CSS), somado por cima
      cg.clearRect(0, 0, cb.width, cb.height)
      cg.drawImage(cv, 0, 0, cb.width, cb.height)
      quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => { cancelAnimationFrame(quadro); window.removeEventListener('resize', medir) }
  }, [alvo])

  return (
    <div ref={raizRef} className={`fc-aura fc-aura--${tom} fc-aura--nivel-${params.current.nivel}`} aria-hidden="true">
      <canvas ref={brilhoRef} className="fc-aura__brilho" />
      <canvas ref={fogoRef} className="fc-aura__fogo" />
      <span className="fc-aura__clarao" />
    </div>
  )
}

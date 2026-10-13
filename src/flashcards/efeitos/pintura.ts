/**
 * Cenários em pixel art nativa, no espírito HD-2D (diorama de pixel art com
 * luz moderna por cima). Cada cena tem planos separados:
 *   - fundo: céu, montanhas, castelo distante (desfocado no CSS: profundidade de campo);
 *   - meio: ruínas, árvores, chão e tochas (nítido);
 *   - frente: folhagem escura nas bordas (desfocada, mais perto da câmera);
 *   - brilho: luzes suaves (sol, tochas, velas), somadas por cima (bloom).
 * Tudo é desenhado pixel a pixel em baixa resolução e ampliado sem suavização.
 * Nada de anatomia: só natureza, pedra, madeira e metal.
 */
import type { Cenario } from '../motor/bestiario'
import { fbm, ruido } from './texturas'

export type Cena = Cenario | 'biblioteca'
type Ctx = CanvasRenderingContext2D

/** Tamanho do pixel da arte em pixels de tela. */
export function escalaPixel(larguraCss: number) { return larguraCss < 520 ? 2 : larguraCss < 1100 ? 3 : 3 }

function rnd(semente: number) {
  let s = semente >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)]

function px(c: Ctx, x: number, y: number, cor: string) { c.fillStyle = cor; c.fillRect(x | 0, y | 0, 1, 1) }

/** Célula de Voronoi em pixels: id da pedra e distância até a junta. */
export function celula(x: number, y: number, tam: number, s: number, esticar = 1) {
  const gx = x / (tam * esticar), gy = y / tam, ix = Math.floor(gx), iy = Math.floor(gy)
  let d1 = 9, d2 = 9, id = 0, cx = 0, cy = 0
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const a = ix + i, b = iy + j
    const px0 = a + 0.2 + 0.6 * ruido(a * 7.1, b * 3.3, s), py0 = b + 0.2 + 0.6 * ruido(a * 2.7, b * 5.9, s + 3)
    const d = Math.hypot((gx - px0) * esticar, gy - py0)
    if (d < d1) { d2 = d1; d1 = d; id = a * 131 + b; cx = px0 - gx; cy = py0 - gy } else if (d < d2) d2 = d
  }
  return { id, borda: (d2 - d1) * tam, cx, cy }
}

/** Pedras irregulares com chanfro de luz (cima-esquerda) e sombra (baixo-direita). */
export function pedras(c: Ctx, x0: number, y0: number, w: number, h: number, tam: number, tons: string[], junta: string, musgo: string | null, s: number, mascara?: (x: number, y: number) => boolean) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (mascara && !mascara(x, y)) continue
    const { id, borda, cx, cy } = celula(x, y, tam, s)
    if (borda < 1.1) { px(c, x, y, musgo && ruido(x / 3, y / 3, s + 5) > 0.55 ? musgo : junta); continue }
    const tom = 1 + Math.floor(ruido(id, 3, s) * (tons.length - 2))
    let k = tom
    if (borda < 2.2) k = cx > 0.05 || cy > 0.05 ? Math.min(tons.length - 1, tom + 1) : Math.max(1, tom - 1)
    if (fbm(x / 3, y / 3, 2, s + id) > 0.68) k = Math.max(1, k - 1)
    if (ruido(x * 1.3, y * 1.7, s + 9) > 0.93) k = Math.min(tons.length - 1, k + 1)
    px(c, x, y, tons[k])
  }
}

/** Luz de cena sobre a pixel art: mais clara de cima à esquerda, sombras nas bordas. */
function mapaDeLuz(c: Ctx, W: number, H: number, quente: string, frio: string) {
  c.save()
  c.globalCompositeOperation = 'soft-light'
  const g = c.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, quente); g.addColorStop(0.55, 'rgba(128,128,128,0)'); g.addColorStop(1, frio)
  c.fillStyle = g; c.fillRect(0, 0, W, H)
  c.restore()
}

function sombraEliptica(c: Ctx, x: number, y: number, rx: number, ry: number, a = 0.35) {
  c.save(); c.globalAlpha = a; c.fillStyle = '#081008'
  for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) if ((xx / rx) ** 2 + (yy / ry) ** 2 <= 1 - bayer(x + xx, y + yy) * 0.25) c.fillRect(x + xx, y + yy, 1, 1)
  c.restore()
}

/** Faixa vertical em degradê com pontilhado entre as cores (céu, névoa, paredes). */
function degradeVertical(c: Ctx, x0: number, y0: number, w: number, h: number, cores: string[]) {
  for (let y = 0; y < h; y++) {
    const t = (y / Math.max(1, h - 1)) * (cores.length - 1)
    const i = Math.floor(t), f = t - i
    for (let x = 0; x < w; x++) px(c, x0 + x, y0 + y, cores[Math.min(cores.length - 1, i + (f > bayer(x, y) ? 1 : 0))])
  }
}

/** Copa de árvore em pixel: massa de folhas com volume, tufos e contorno escuro. */
function copa(c: Ctx, cx: number, cy: number, r: number, tons: string[], semente: number) {
  const r0 = rnd(semente)
  const bolhas = Array.from({ length: 7 }, () => ({ x: cx + (r0() - 0.5) * r * 1.2, y: cy + (r0() - 0.5) * r * 0.9, r: r * (0.45 + r0() * 0.3) }))
  for (let y = Math.floor(cy - r * 1.3); y <= cy + r * 1.3; y++) for (let x = Math.floor(cx - r * 1.4); x <= cx + r * 1.4; x++) {
    let melhor = -1, nx = 0, ny = 0
    for (const b of bolhas) {
      const dx = (x - b.x) / b.r, dy = (y - b.y) / b.r, d = 1 - (dx * dx + dy * dy)
      if (d > melhor) { melhor = d; nx = dx; ny = dy }
    }
    const folha = fbm(x / 2.6, y / 2.6, 2, semente) * 0.5
    if (melhor + folha * 0.35 - 0.12 < 0) continue
    const luz = Math.max(0, -nx * 0.55 - ny * 0.75 + Math.sqrt(Math.max(0, melhor)) * 0.6) + (folha - 0.25) * 0.8
    const k = Math.max(0, Math.min(tons.length - 1, Math.floor(luz * tons.length + bayer(x, y) * 0.9)))
    px(c, x, y, melhor < 0.06 ? tons[0] : tons[k])
  }
}

/** Parede de blocos de pedra com chanfro, rachaduras e hera. */
function muro(c: Ctx, x0: number, y0: number, w: number, h: number, semente: number, tons = ['#2a2620', '#4c463b', '#6e6656', '#8f8672', '#aaa08a'], hera = true) {
  const r0 = rnd(semente)
  const bh = 6
  for (let fy = 0; fy * bh < h; fy++) {
    let x = x0 - (fy % 2) * 5
    while (x < x0 + w) {
      const bw = 8 + Math.floor(r0() * 6)
      const tom = 1 + Math.floor(r0() * 3)
      for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) {
        const X = x + xx, Y = y0 + fy * bh + yy
        if (X < x0 || X >= x0 + w || Y >= y0 + h) continue
        let k = tom
        if (yy === bh - 1 || xx === bw - 1) k = 0
        else if (yy === 0 || xx === 0) k = Math.min(4, tom + 1)
        else if (yy === bh - 2 || xx === bw - 2) k = Math.max(1, tom - 1)
        if (k > 0 && ruido(X / 1.7, Y / 1.7, semente) > 0.78) k = Math.max(1, k - 1)
        px(c, X, Y, tons[k])
      }
      x += bw
    }
  }
  // hera descendo
  if (hera) for (let i = 0; i < w / 6; i++) {
    let X = x0 + Math.floor(r0() * w), Y = y0
    const L = 4 + Math.floor(r0() * h * 0.6)
    for (let k = 0; k < L; k++) { px(c, X, Y + k, k % 3 ? '#3f6a22' : '#6a9a34'); if (r0() > 0.7) px(c, X + (r0() > 0.5 ? 1 : -1), Y + k, '#2a4a18'); if (r0() > 0.85) X += r0() > 0.5 ? 1 : -1 }
  }
}

function tocha(c: Ctx, x: number, y: number) {
  for (let k = 0; k < 7; k++) px(c, x, y + k, k < 2 ? '#8a5a2a' : '#4a2c16')
  px(c, x - 1, y + 1, '#c28a2a'); px(c, x + 1, y + 1, '#c28a2a')
  const fogo = [[0, -1, '#fff6c0'], [0, -2, '#ffd27a'], [-1, -1, '#ff9a3c'], [1, -1, '#ff9a3c'], [0, -3, '#ff9a3c'], [0, 0, '#ffd27a'], [-1, 0, '#ff6a2a'], [1, 0, '#ff6a2a']] as const
  fogo.forEach(([dx, dy, cor]) => px(c, x + dx, y + dy, cor))
}

function flor(c: Ctx, x: number, y: number, cor: string) {
  px(c, x, y - 1, cor); px(c, x - 1, y, cor); px(c, x + 1, y, cor); px(c, x, y, '#ffe27a'); px(c, x, y + 1, '#3f6a22')
}

/* ---------------------------------------------------------- Batalha: Campo */

function campoFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, Math.ceil(H * 0.42), ['#6d8fc4', '#8fa9d0', '#b9c2d4', '#e6cfae', '#f2d7a8'])
  // nuvens em pixel
  const r0 = rnd(5)
  for (let n = 0; n < 6; n++) {
    const cx = r0() * W, cy = H * (0.05 + r0() * 0.16), L = 20 + r0() * 30
    for (let y = -4; y <= 4; y++) for (let x = -L; x <= L; x++) {
      const v = fbm((cx + x) / 9, (cy + y) / 5, 2, 3) - Math.abs(y) / 9 - Math.abs(x) / (L * 1.6)
      if (v > 0.18) px(c, cx + x, cy + y, v > 0.32 ? '#fbf3e4' : y > 1 ? '#c9c3d8' : '#e8e2ea')
    }
  }
  // montanhas e castelo distantes (frios e claros: perspectiva atmosférica)
  const base = Math.floor(H * 0.4)
  for (let x = 0; x < W; x++) {
    const m = base - Math.floor(fbm(x / 40, 1, 3, 2) * H * 0.16)
    for (let y = m; y < base + 4; y++) px(c, x, y, y - m < 2 ? '#a4aec6' : (x + y) % 7 === 0 ? '#8f9ab6' : '#97a2bc')
  }
  const cxC = Math.floor(W * 0.62), topo = Math.floor(H * 0.17)
  const torres: Array<[number, number, number]> = [[-18, 10, 22], [-8, 6, 30], [0, 8, 40], [9, 6, 28], [18, 9, 20]]
  for (const [dx, tw, th] of torres) {
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) px(c, cxC + dx + x, topo + 40 - th + y + 8, x === 0 ? '#9aa4bf' : y % 5 === 0 && x % 3 === 1 ? '#c8cfe0' : '#8a94b0')
    for (let k = 0; k < tw / 2 + 2; k++) for (let x = -1; x <= tw; x++) if (Math.abs(x - tw / 2 + 0.5) <= tw / 2 + 1 - k) px(c, cxC + dx + x, topo + 40 - th + 7 - k, '#6a7aa0')
  }
  for (let x = -26; x < 30; x++) for (let y = 0; y < 10; y++) px(c, cxC + x, topo + 46 + y, '#8a94b0')
  // linha de árvores ao longe
  for (let x = 0; x < W; x += 3) { const h = 4 + Math.floor(ruido(x / 6, 2, 9) * 7); for (let y = 0; y < h; y++) for (let k = 0; k < 4; k++) px(c, x + k - 1, base - h + y + 6, y < 2 ? '#7f9a7a' : '#6a8668') }
}

function campoMeio(c: Ctx, W: number, H: number) {
  const r0 = rnd(17)
  const chao = Math.floor(H * 0.36)
  // grama em pixel: manchas, tufos e terra
  for (let y = chao; y < H; y++) for (let x = 0; x < W; x++) {
    const m = fbm(x / 22, y / 14, 3, 7), d = fbm(x / 7, y / 4, 2, 11)
    const terra = fbm(x / 30, y / 18, 2, 23) > 0.6 && Math.abs(x - W / 2) < W * 0.3
    const k = Math.floor(Math.min(3.9, m * 2.2 + d * 1.6 + (bayer(x, y) - 0.5) * 0.5 + (y - chao) / H * 0.6))
    const tons = terra ? ['#5e4a2e', '#7a603a', '#94784a', '#a88c58'] : ['#2f4f22', '#3f6a2a', '#56873a', '#74a24a']
    px(c, x, y, tons[Math.max(0, k)])
  }
  // pavimento da arena: pedras irregulares que a grama vai invadindo nas bordas
  const ax = Math.floor(W * 0.14), aw = Math.floor(W * 0.72), ay = Math.floor(H * 0.42)
  pedras(c, ax, ay, aw, H - ay, 7, ['#3a3a2c', '#6e6a58', '#857f6a', '#9a947c', '#b4ae94'], '#2e3a22', '#4a7a2a', 41, (x, y) => {
    const borda = Math.min(x - ax, ax + aw - x, (y - ay) * 1.5)
    return !(borda < 8 && fbm(x / 3, y / 3, 2, 31) * 10 > borda)
  })
  // sombras das árvores no chão
  sombraEliptica(c, Math.floor(W * 0.16), Math.floor(H * 0.4), Math.floor(W * 0.09), Math.floor(H * 0.06))
  sombraEliptica(c, Math.floor(W * 0.84), Math.floor(H * 0.4), Math.floor(W * 0.09), Math.floor(H * 0.06))
  // ruínas laterais com arcos e tochas
  const mw = Math.max(26, Math.floor(W * 0.11))
  muro(c, 0, Math.floor(H * 0.2), mw, Math.floor(H * 0.8), 51)
  muro(c, W - mw, Math.floor(H * 0.2), mw, Math.floor(H * 0.8), 53)
  for (const x of [Math.floor(mw * 0.5), W - Math.floor(mw * 0.5)]) for (let y = Math.floor(H * 0.2) - 4; y < Math.floor(H * 0.2) + 2; y++) for (let k = -mw / 2; k < mw / 2; k++) px(c, x + k, y, y === Math.floor(H * 0.2) - 4 ? '#c2bca2' : '#8f8672')
  tocha(c, mw - 4, Math.floor(H * 0.34)); tocha(c, W - mw + 3, Math.floor(H * 0.34))
  tocha(c, mw - 4, Math.floor(H * 0.74)); tocha(c, W - mw + 3, Math.floor(H * 0.74))
  // árvores do plano do meio, atrás das ruínas
  const verdes = ['#142a14', '#1f3f1c', '#2f5a26', '#467a32', '#6a9a44', '#9cc65a']
  copa(c, Math.floor(W * 0.12), Math.floor(H * 0.16), Math.floor(H * 0.17), verdes, 3)
  copa(c, Math.floor(W * 0.88), Math.floor(H * 0.14), Math.floor(H * 0.18), verdes, 7)
  copa(c, Math.floor(W * 0.3), Math.floor(H * 0.3), Math.floor(H * 0.08), verdes, 11)
  copa(c, Math.floor(W * 0.74), Math.floor(H * 0.31), Math.floor(H * 0.07), verdes, 13)
  // flores e pedrinhas
  for (let i = 0; i < W / 4; i++) {
    const x = Math.floor(r0() * W), y = chao + 4 + Math.floor(r0() * (H - chao - 6))
    if (x > ax && x < ax + aw && y > ay) continue
    flor(c, x, y, ['#f4e3a1', '#f29bb0', '#b9a7f4', '#ffffff', '#ff8a6a'][i % 5])
  }
  // sombra suave das ruínas no chão (oclusão)
  c.save(); c.globalAlpha = 0.25; c.fillStyle = '#0a1408'
  c.fillRect(mw, Math.floor(H * 0.2), 4, Math.floor(H * 0.8)); c.fillRect(W - mw - 4, Math.floor(H * 0.2), 4, Math.floor(H * 0.8))
  c.restore()
  mapaDeLuz(c, W, H, 'rgba(255,230,170,.55)', 'rgba(20,30,60,.6)')
}

function campoFrente(c: Ctx, W: number, H: number) {
  const escuros = ['#050a05', '#0a160a', '#122412', '#1c3618', '#2a4a22']
  copa(c, -6, -4, Math.floor(H * 0.2), escuros, 21)
  copa(c, W + 6, -2, Math.floor(H * 0.22), escuros, 23)
  copa(c, -10, H + 6, Math.floor(H * 0.18), escuros, 25)
  copa(c, W + 8, H + 4, Math.floor(H * 0.2), escuros, 27)
  // capim alto no primeiro plano
  for (let x = 0; x < W; x++) {
    if (Math.abs(x - W / 2) < W * 0.32) continue
    const h = 3 + Math.floor(ruido(x / 2, 0, 29) * 10)
    for (let y = 0; y < h; y++) px(c, x, H - y, y > h - 3 ? '#4a7a2a' : '#1c3618')
  }
}

/* ---------------------------------------------------- Masmorra e Salão */

function masmorraFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, H, ['#0a0c14', '#121624', '#1a2030', '#141822'])
  const n = Math.max(3, Math.round(W / 110))
  for (let i = 0; i < n; i++) {
    const x0 = Math.floor((i + 0.5) * (W / n)), aw = Math.floor(W / n * 0.55)
    for (let y = Math.floor(H * 0.08); y < H * 0.5; y++) for (let x = -aw / 2; x < aw / 2; x++) {
      const topo = H * 0.08 + (1 - Math.sqrt(Math.max(0, 1 - (x / (aw / 2)) ** 2))) * H * 0.1
      if (y > topo) px(c, x0 + x, y, (x + y) % 9 === 0 ? '#2a3a5a' : '#1e2a44')
    }
  }
}
function masmorraMeio(c: Ctx, W: number, H: number) {
  muro(c, 0, 0, W, Math.floor(H * 0.3), 61, ['#0c0d12', '#23262f', '#33363f', '#41444e', '#52566a'])
  pedras(c, 0, Math.floor(H * 0.3), W, H, 12, ['#0c0d12', '#262932', '#30333c', '#3a3d47', '#4a4e5a', '#5a6070'], '#07080b', '#1e2e22', 63)
  // poças que refletem a luz fria
  for (let y = Math.floor(H * 0.3); y < H; y++) for (let x = 0; x < W; x++) if (fbm(x / 18, y / 9, 2, 65) > 0.66) px(c, x, y, (x + y) % 3 ? '#2e3a52' : '#4a5a7a')
  const mw = Math.max(22, Math.floor(W * 0.08))
  muro(c, 0, Math.floor(H * 0.25), mw, H, 67, ['#08090c', '#1e2028', '#2a2c34', '#363842', '#444652'])
  muro(c, W - mw, Math.floor(H * 0.25), mw, H, 69, ['#08090c', '#1e2028', '#2a2c34', '#363842', '#444652'])
  tocha(c, mw - 3, Math.floor(H * 0.3)); tocha(c, W - mw + 2, Math.floor(H * 0.3)); tocha(c, mw - 3, Math.floor(H * 0.72)); tocha(c, W - mw + 2, Math.floor(H * 0.72))
  mapaDeLuz(c, W, H, 'rgba(120,150,220,.35)', 'rgba(0,0,0,.7)')
}
function salaoFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, H, ['#1a0e0a', '#2a160e', '#3a1e12', '#24120a'])
  const n = Math.max(3, Math.round(W / 120))
  for (let i = 0; i < n; i++) {
    const x0 = Math.floor((i + 0.5) * (W / n)), jw = Math.floor(W / n * 0.22)
    for (let y = Math.floor(H * 0.06); y < H * 0.42; y++) for (let x = -jw / 2; x < jw / 2; x++) {
      const topo = H * 0.06 + (1 - Math.sqrt(Math.max(0, 1 - (x / (jw / 2)) ** 2))) * H * 0.06
      if (y > topo) px(c, x0 + x, y, x === 0 || Math.floor(y) === Math.floor(H * 0.22) ? '#4a2a18' : (x + y) % 5 ? '#e8c88a' : '#f6e0aa')
    }
  }
}
function salaoMeio(c: Ctx, W: number, H: number) {
  muro(c, 0, 0, W, Math.floor(H * 0.26), 71, ['#140c08', '#3a2a20', '#4a362a', '#5a4434', '#6e5644'])
  for (let y = Math.floor(H * 0.26); y < H; y++) for (let x = 0; x < W; x++) {
    const lx = Math.floor(x / 14), ly = Math.floor(y / 14)
    const claro = (lx + ly) % 2 === 0
    const veio = Math.abs(Math.sin((x + y) / 5 + fbm(x / 10, y / 10, 2, 73) * 6)) > 0.97
    const borda = x % 14 === 0 || y % 14 === 0
    px(c, x, y, borda ? '#1a1008' : veio ? '#d8c8b0' : claro ? '#6a5848' : '#3a2c22')
  }
  const tw = Math.floor(W * 0.36), tx = Math.floor((W - tw) / 2)
  for (let y = Math.floor(H * 0.26); y < H; y++) for (let x = tx; x < tx + tw; x++) {
    const d = Math.min(x - tx, tx + tw - 1 - x)
    px(c, x, y, d < 2 ? '#e3b04b' : d < 3 ? '#7a5214' : (x + y * 3) % 11 === 0 ? '#a8241c' : '#8a1a14')
  }
  for (const xs of [0.18, 0.82]) {
    const x = Math.floor(W * xs)
    for (let y = 0; y < Math.floor(H * 0.18); y++) for (let k = -5; k <= 5; k++) px(c, x + k, y, Math.abs(k) === 5 ? '#4a0a0a' : y === Math.floor(H * 0.06) ? '#e3b04b' : '#8e1c1c')
  }
  tocha(c, Math.floor(W * 0.08), Math.floor(H * 0.34)); tocha(c, Math.floor(W * 0.92), Math.floor(H * 0.34)); tocha(c, Math.floor(W * 0.08), Math.floor(H * 0.8)); tocha(c, Math.floor(W * 0.92), Math.floor(H * 0.8))
  mapaDeLuz(c, W, H, 'rgba(255,200,120,.45)', 'rgba(20,0,0,.6)')
}


/* ------------------------------------------------- Covil do dragão e Torre */

function covilFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, H, ['#0a0406', '#160808', '#240c0a', '#30120c', '#1a0806'])
  // paredes da caverna ao fundo: rocha em camadas com brilho de lava por baixo
  for (let x = 0; x < W; x++) {
    const teto = Math.floor(H * 0.1 + fbm(x / 26, 1, 3, 101) * H * 0.12)
    for (let y = 0; y < teto; y++) px(c, x, y, y > teto - 2 ? '#3a1a12' : '#120606')
    const base = Math.floor(H * 0.42 - fbm(x / 34, 2, 3, 103) * H * 0.14)
    for (let y = base; y < H * 0.46; y++) px(c, x, y, y - base < 2 ? '#5a2416' : (x + y) % 6 === 0 ? '#3a160e' : '#2a100a')
  }
  // estalactites
  const r0 = rnd(105)
  for (let i = 0; i < W / 14; i++) {
    const x = Math.floor(r0() * W), L = 6 + Math.floor(r0() * H * 0.12), larg = 2 + Math.floor(r0() * 3)
    for (let k = 0; k < L; k++) { const w2 = Math.max(0, Math.round(larg * (1 - k / L))); for (let d = -w2; d <= w2; d++) px(c, x + d, Math.floor(H * 0.12) + k, d === -w2 ? '#4a2014' : '#1e0a08') }
  }
  // brilho da lava distante
  for (let y = Math.floor(H * 0.36); y < H * 0.46; y++) for (let x = 0; x < W; x++) if (fbm(x / 12, y / 3, 2, 107) > 0.62) px(c, x, y, (x + y) % 3 ? '#ff6a1a' : '#ffb04a')
}
function covilMeio(c: Ctx, W: number, H: number) {
  const chao = Math.floor(H * 0.32)
  pedras(c, 0, chao, W, H - chao, 11, ['#0a0404', '#2a1410', '#3a1c14', '#4a2418', '#5a2e1e', '#6e3a24'], '#120604', null, 109)
  // rios de lava nas laterais, com crosta escura e borda incandescente
  for (let y = chao; y < H; y++) for (let x = 0; x < W; x++) {
    const lado = Math.min(x, W - 1 - x) / W
    const v = fbm(x / 16, y / 10, 3, 111) + (0.2 - lado) * 2.2
    if (v > 0.78) px(c, x, y, v > 0.98 ? '#fff0a0' : v > 0.88 ? '#ffb04a' : '#ff6a1a')
    else if (v > 0.72) px(c, x, y, '#a02a10')
  }
  // pilhas de moedas do tesouro do dragão
  const tesouro = (cx: number, cy: number, r: number) => {
    for (let y = -r; y <= 0; y++) for (let x = -r * 2; x <= r * 2; x++) {
      if ((x / (r * 2)) ** 2 + (y / r) ** 2 > 1) continue
      const k = ruido((cx + x) / 1.5, (cy + y) / 1.5, 113)
      px(c, cx + x, cy + y, k > 0.82 ? '#fff6c0' : k > 0.55 ? '#f2c45a' : k > 0.3 ? '#c28a2a' : '#7a5214')
    }
    for (let i = 0; i < r; i++) { const x = cx - r + Math.floor(ruido(i, 1, 115) * r * 2), y = cy - Math.floor(ruido(i, 2, 115) * r * 0.8); px(c, x, y, '#ffffff') }
  }
  tesouro(Math.floor(W * 0.16), Math.floor(H * 0.46), Math.max(6, Math.floor(H * 0.06)))
  tesouro(Math.floor(W * 0.86), Math.floor(H * 0.48), Math.max(5, Math.floor(H * 0.05)))
  // pilares de rocha nas bordas
  const mw = Math.max(20, Math.floor(W * 0.08))
  pedras(c, 0, 0, mw, H, 9, ['#060202', '#1e0c08', '#2a120c', '#381a10', '#462014'], '#0a0302', null, 117)
  pedras(c, W - mw, 0, mw, H, 9, ['#060202', '#1e0c08', '#2a120c', '#381a10', '#462014'], '#0a0302', null, 119)
  tocha(c, mw - 3, Math.floor(H * 0.34)); tocha(c, W - mw + 2, Math.floor(H * 0.34))
  mapaDeLuz(c, W, H, 'rgba(255,120,40,.4)', 'rgba(10,0,0,.75)')
}

function torreFundo(c: Ctx, W: number, H: number) {
  // céu alto do entardecer, mar de nuvens lá embaixo e luas
  degradeVertical(c, 0, 0, W, Math.ceil(H * 0.5), ['#1a1640', '#2e2a6a', '#5a4a8a', '#a87aa0', '#f0b090'])
  const r0 = rnd(121)
  for (let i = 0; i < W / 3; i++) { const x = Math.floor(r0() * W), y = Math.floor(r0() * H * 0.22); px(c, x, y, r0() > 0.7 ? '#ffffff' : '#c8c8f0') }
  const lx = Math.floor(W * 0.78), ly = Math.floor(H * 0.12), lr = Math.max(6, Math.floor(H * 0.05))
  for (let y = -lr; y <= lr; y++) for (let x = -lr; x <= lr; x++) { const d = (x * x + y * y) / (lr * lr); if (d <= 1) px(c, lx + x, ly + y, d > 0.8 ? '#e8d8f0' : (x + 2) ** 2 + (y - 1) ** 2 < lr * lr * 0.5 ? '#fffaf0' : '#f6eede') }
  for (let y = Math.floor(H * 0.34); y < H * 0.5; y++) for (let x = 0; x < W; x++) {
    const v = fbm(x / 24, y / 6, 3, 123) + (y - H * 0.34) / (H * 0.2)
    if (v > 0.7) px(c, x, y, v > 1.05 ? '#ffe8d0' : v > 0.88 ? '#f0c8c0' : '#c8a0b8')
  }
  // picos distantes saindo das nuvens
  for (const [fx, alt] of [[0.12, 0.12], [0.3, 0.08], [0.6, 0.1], [0.9, 0.14]] as const) {
    const cx = Math.floor(W * fx), topo = Math.floor(H * (0.42 - alt))
    for (let y = topo; y < H * 0.44; y++) { const w2 = Math.floor((y - topo) * 0.9); for (let x = -w2; x <= w2; x++) px(c, cx + x, y, x < 0 ? '#7a6a9a' : '#5a4a7a') }
  }
}
function torreMeio(c: Ctx, W: number, H: number) {
  const chao = Math.floor(H * 0.4)
  // terraço circular de pedra clara com mosaico em anéis
  const cx = W / 2, cy = H * 0.86
  for (let y = chao; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - cx) / 1.6, (y - cy) * 1.2), a = Math.atan2(y - cy, x - cx)
    const anel = Math.floor(d / 14), seg = Math.floor((a + Math.PI) * (6 + anel * 3))
    const junta = d % 14 < 1 || Math.abs(Math.sin((a + Math.PI) * (6 + anel * 3) * 0.5)) < 0.06
    const tom = 1 + Math.floor(ruido(anel, seg, 125) * 3)
    px(c, x, y, junta ? '#4a4258' : ['#3a3448', '#8a82a0', '#9a92b0', '#aaa2c0', '#c0b8d4'][tom + (ruido(x / 2, y / 2, 127) > 0.85 ? 1 : 0)])
  }
  // ameias da borda do terraço
  for (let x = 0; x < W; x++) {
    const ameia = Math.floor(x / 10) % 2 === 0
    const topo = chao - (ameia ? 9 : 5)
    for (let y = topo; y < chao + 2; y++) px(c, x, y, y === topo ? '#d8d0e8' : x % 10 === 0 ? '#5a5270' : y > chao ? '#4a4258' : '#8a82a0')
  }
  // pilares com estandartes e braseiros
  for (const fx of [0.1, 0.9]) {
    const x = Math.floor(W * fx), pw = Math.max(5, Math.floor(W * 0.025))
    for (let y = Math.floor(H * 0.08); y < chao + 30; y++) for (let k = -pw; k <= pw; k++) px(c, x + k, y, Math.abs(k) === pw ? '#3a3448' : k < 0 ? '#aaa2c0' : '#7a7290')
    for (let y = Math.floor(H * 0.12); y < H * 0.32; y++) for (let k = -pw + 1; k < pw; k++) if (y <= H * 0.31 - Math.abs(k)) px(c, x + k, y, k === 0 ? '#ffd76a' : '#4a2a8a')
    const by = Math.floor(H * 0.08)
    for (let k = -pw - 2; k <= pw + 2; k++) { px(c, x + k, by, '#c28a2a'); px(c, x + k, by - 1, '#7a5214') }
    ;[[0, -2, '#fff6c0'], [0, -3, '#ffd27a'], [-1, -2, '#ff9a3c'], [1, -2, '#ff9a3c'], [0, -4, '#ff9a3c'], [-2, -2, '#ff6a2a'], [2, -2, '#ff6a2a']].forEach(([dx, dy, cor]) => px(c, x + (dx as number), by + (dy as number), cor as string))
  }
  mapaDeLuz(c, W, H, 'rgba(255,210,170,.45)', 'rgba(20,10,50,.6)')
}

/* ------------------------------------------------------------ Biblioteca */

function bibliotecaFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, H, ['#140a06', '#22120a', '#2e180c', '#1a0e06'])
  const r0 = rnd(81)
  const prat = 22
  for (let y = 4; y < H * 0.62; y += prat) {
    for (let x = 0; x < W; x++) { px(c, x, y + prat - 3, '#5a3a1e'); px(c, x, y + prat - 2, '#3a2412'); px(c, x, y + prat - 1, '#1e1006') }
    for (let x = 1; x < W;) {
      const lw = 3 + Math.floor(r0() * 4), lh = 11 + Math.floor(r0() * 7)
      const tons = [['#7a2a1c', '#a8402a', '#4a1408'], ['#1f4a3a', '#2f6a52', '#0f2a1e'], ['#2a2a5a', '#3a3a7a', '#141432'], ['#8a6a1a', '#b8902a', '#4a3a0a'], ['#5a1a3a', '#7a2a52', '#300a1e']][Math.floor(r0() * 5)]
      for (let yy = 0; yy < lh; yy++) for (let xx = 0; xx < lw; xx++) {
        const Y = y + prat - 3 - lh + yy
        px(c, x + xx, Y, xx === 0 ? tons[1] : xx === lw - 1 ? tons[2] : tons[0])
      }
      px(c, x + 1, y + prat - 3 - lh + 3, '#e3b04b'); px(c, x + 1, y + prat - 6, '#e3b04b')
      x += lw + (r0() > 0.9 ? 4 : 0)
    }
  }
  // janela em arco com luar
  const jx = Math.floor(W * 0.5), jw = Math.floor(W * 0.12)
  for (let y = 6; y < H * 0.5; y++) for (let x = -jw; x <= jw; x++) {
    const topo = 6 + (1 - Math.sqrt(Math.max(0, 1 - (x / jw) ** 2))) * jw * 0.8
    if (y < topo) continue
    const m = x === 0 || y === Math.floor(H * 0.28)
    px(c, jx + x, y, Math.abs(x) >= jw - 1 ? '#3a2412' : m ? '#4a2e16' : (x + y) % 6 === 0 ? '#9ab8e8' : '#7a98d0')
  }
}
function bibliotecaMeio(c: Ctx, W: number, H: number) {
  const topo = Math.floor(H * 0.58)
  // mesa de madeira nobre com veios
  for (let y = topo; y < H; y++) for (let x = 0; x < W; x++) {
    const tabua = Math.floor((y - topo) / 8)
    const veio = fbm((x + tabua * 37) / 18, (y - topo) / 2.5, 2, 83 + tabua)
    const k = (y - topo) % 8 === 7 ? 0 : (y - topo) % 8 === 0 ? 3 : Math.floor(1 + veio * 2.4 + (bayer(x, y) - 0.5) * 0.4)
    px(c, x, y, ['#1e1006', '#4a2c16', '#6a4022', '#8f5a30', '#a86e3c'][Math.max(0, Math.min(4, k))])
  }
  for (let x = 0; x < W; x++) { px(c, x, topo - 1, '#c08a54'); px(c, x, topo - 2, '#8f5f34') }
  // pilhas de livros, tinteiro e velas
  const livros = (x0: number, base: number) => {
    const cores = [['#7a2a1c', '#a8402a'], ['#1f4a3a', '#2f6a52'], ['#2a2a5a', '#3a3a7a'], ['#8a6a1a', '#b8902a']]
    for (let i = 0; i < 4; i++) {
      const w = 26 - i * 3, h = 5, x = x0 + i * 2, y = base - (i + 1) * h
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) px(c, x + xx, y + yy, yy === 0 ? cores[i][1] : yy === h - 1 ? '#1a0a06' : xx > w - 3 ? '#efe4c8' : cores[i][0])
      for (let xx = 3; xx < 10; xx++) px(c, x + xx, y + 2, '#e3b04b')
    }
  }
  livros(Math.floor(W * 0.04), topo + 10); livros(Math.floor(W * 0.84), topo + 12)
  const vela = (x: number, y: number) => {
    for (let k = 0; k < 4; k++) for (let xx = -4; xx <= 4; xx++) px(c, x + xx, y + 12 + k, k === 0 ? '#e3b04b' : '#8a6a2a')
    for (let k = 0; k < 12; k++) for (let xx = -2; xx <= 2; xx++) px(c, x + xx, y + k, xx === -2 ? '#fff6e0' : xx === 2 ? '#b8aa8a' : '#e8dcc0')
    ;[[0, -1, '#fff6c0'], [0, -2, '#ffd27a'], [0, -3, '#ff9a3c'], [-1, -1, '#ff9a3c'], [1, -1, '#ff9a3c']].forEach(([dx, dy, cor]) => px(c, x + (dx as number), y + (dy as number), cor as string))
  }
  vela(Math.floor(W * 0.16), topo - 4); vela(Math.floor(W * 0.86), topo - 6)
}

/* ------------------------------------------------------- Biomas novos */
/* Cada bioma tem paleta, adereços, luz e partícula próprios (LUZES, MESA,
   corDaParticula). Só pedra, madeira, metal, planta, água e cristal. */

function arco(c: Ctx, cx: number, y0: number, y1: number, meia: number, cor: (x: number, y: number, borda: boolean) => string | null) {
  for (let y = y0; y < y1; y++) for (let x = -meia; x <= meia; x++) {
    const topo = y0 + (1 - Math.sqrt(Math.max(0, 1 - (x / meia) ** 2))) * meia * 0.9
    if (y < topo) continue
    const borda = Math.abs(x) >= meia - 1 || y < topo + 1
    const k = cor(x, y, borda)
    if (k) px(c, cx + x, y, k)
  }
}
function engrenagem(c: Ctx, cx: number, cy: number, r: number, dentes: number, tons: string[]) {
  for (let y = -r - 3; y <= r + 3; y++) for (let x = -r - 3; x <= r + 3; x++) {
    const d = Math.hypot(x, y), a = Math.atan2(y, x)
    const dente = Math.cos(a * dentes) > 0.3 ? 3 : 0
    if (d > r + dente) continue
    if (d < r * 0.28) { px(c, cx + x, cy + y, d < r * 0.14 ? tons[0] : tons[3]); continue }
    if (d > r * 0.45 && d < r * 0.75 && Math.cos(a * 5) > 0.55) continue
    const luz = -x / r * 0.5 - y / r * 0.6
    px(c, cx + x, cy + y, d > r + dente - 1 ? tons[0] : tons[Math.max(1, Math.min(4, 2 + Math.round(luz * 2 + bayer(x, y) * 0.6)))])
  }
}
function cristal(c: Ctx, x: number, base: number, alt: number, larg: number, tons: string[]) {
  for (let k = 0; k < alt; k++) {
    const w2 = Math.max(0, Math.round(larg * Math.min(1, (alt - k) / (alt * 0.35))))
    for (let d = -w2; d <= w2; d++) px(c, x + d, base - k, d === -w2 ? tons[3] : d < 0 ? tons[2] : d === w2 ? tons[0] : tons[1])
  }
  px(c, x - 1, base - alt + 2, tons[4])
}
function velaPequena(c: Ctx, x: number, y: number, alt = 4) {
  for (let k = 0; k < alt; k++) { px(c, x, y + k, '#efe4c8'); px(c, x + 1, y + k, '#b8aa8a') }
  px(c, x, y - 1, '#ffd27a'); px(c, x, y - 2, '#fff6c0'); px(c, x + 1, y - 1, '#ff9a3c')
}
function braseiro(c: Ctx, x: number, y: number) {
  for (let k = 0; k < 8; k++) px(c, x, y + 3 + k, k % 3 ? '#4a3a2a' : '#7a5a3a')
  for (let d = -4; d <= 4; d++) { px(c, x + d, y + 2, '#c28a2a'); px(c, x + d, y + 3, '#7a5214') }
  ;[[0, 1, '#fff6c0'], [0, 0, '#ffd27a'], [-1, 1, '#ff9a3c'], [1, 1, '#ff9a3c'], [0, -1, '#ff9a3c'], [-2, 1, '#ff6a2a'], [2, 1, '#ff6a2a'], [-1, 0, '#ff6a2a'], [1, -2, '#ffd27a']].forEach(([dx, dy, cor]) => px(c, x + (dx as number), y + (dy as number), cor as string))
}

/* Forja da Osteossíntese: fornalha, bigorna, placas e parafusos no cavalete */
function forjaFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, H, ['#0c0806', '#1a100a', '#24160c', '#140a06'])
  muro(c, 0, 0, W, Math.floor(H * 0.4), 201, ['#100a06', '#2e2018', '#3e2c20', '#4e3828', '#5e4632'], false)
  // fornalha central com boca incandescente
  const fx = Math.floor(W / 2), fw = Math.max(22, Math.floor(W * 0.1))
  for (let y = 0; y < H * 0.1; y++) for (let x = -fw - 6 + y; x <= fw + 6 - y; x++) px(c, fx + x, y, x % 6 === 0 ? '#1a120c' : '#3a2a1e')
  arco(c, fx, Math.floor(H * 0.1), Math.floor(H * 0.38), fw + 4, (x, y, b) => b ? '#6a4a30' : Math.abs(x) > fw ? ((x + y) % 4 ? '#4a3424' : '#5a4030') : null)
  arco(c, fx, Math.floor(H * 0.16), Math.floor(H * 0.38), fw, (x, y) => {
    const v = (y - H * 0.16) / (H * 0.22) + fbm(x / 4, y / 3, 2, 203) * 0.5
    return v > 1.05 ? '#fff0a0' : v > 0.85 ? '#ffb04a' : v > 0.6 ? '#ff6a1a' : v > 0.4 ? '#a02a10' : '#3a0a04'
  })
  // correntes penduradas
  for (const fxs of [0.28, 0.36, 0.64, 0.72]) {
    const x = Math.floor(W * fxs), L = Math.floor(H * (0.12 + ruido(fxs * 9, 1, 205) * 0.12))
    for (let k = 0; k < L; k++) px(c, x + (k % 4 < 2 ? 0 : 1), k, k % 2 ? '#8a7a6a' : '#4a3e34')
    for (let d = -2; d <= 2; d++) px(c, x + d, L, '#9a8a7a'); px(c, x, L + 1, '#5a4e44')
  }
}
function forjaMeio(c: Ctx, W: number, H: number) {
  const chao = Math.floor(H * 0.38)
  pedras(c, 0, chao, W, H - chao, 10, ['#0a0604', '#2a1e16', '#36281e', '#443226', '#523e30', '#624a38'], '#0e0806', null, 207)
  // brasas e limalha no chão perto da fornalha
  for (let y = chao; y < chao + H * 0.16; y++) for (let x = Math.floor(W * 0.36); x < W * 0.64; x++) if (ruido(x * 1.3, y * 1.7, 209) > 0.965) px(c, x, y, (x + y) % 2 ? '#ffb04a' : '#ff6a1a')
  // bigorna
  const bx = Math.floor(W * 0.2), by = Math.floor(H * 0.5)
  for (let y = 0; y < 5; y++) for (let x = -10 + (y === 0 ? 0 : 1); x <= 8; x++) px(c, bx + x, by + y, y === 0 ? '#b9c6d8' : x < -6 ? '#3a404c' : '#5a6272')
  for (let x = -14; x < -9; x++) px(c, bx + x, by + 1, x === -14 ? '#3a404c' : '#7a8496')
  for (let y = 5; y < 12; y++) for (let x = -4; x <= 4; x++) px(c, bx + x, by + y, Math.abs(x) === 4 ? '#262a32' : '#464c58')
  for (let x = -8; x <= 8; x++) { px(c, bx + x, by + 12, '#5a6272'); px(c, bx + x, by + 13, '#262a32') }
  for (let x = -4; x <= 4; x++) for (let y = by + 14; y < by + 20; y++) px(c, bx + x, y, Math.abs(x) === 4 ? '#3a2412' : '#6a4022')
  // tina de têmpera
  const tx = Math.floor(W * 0.8), ty = Math.floor(H * 0.52)
  for (let y = 0; y < 14; y++) for (let x = -9; x <= 9; x++) px(c, tx + x, ty + y, y === 0 ? (Math.abs(x) < 8 ? ((x + y) % 3 ? '#2a4a6a' : '#4a7aa0') : '#8a5a2a') : y % 5 === 0 ? '#3a3a3a' : Math.abs(x) === 9 ? '#3a2412' : x < -4 ? '#8a5a2a' : '#6a4022')
  // cavalete com placas furadas e parafusos (metal genérico)
  const mw = Math.max(24, Math.floor(W * 0.1))
  for (const lado of [0, 1]) {
    const x0 = lado ? W - mw : 0
    pedras(c, x0, 0, mw, H, 9, ['#080504', '#241a12', '#2e2218', '#3a2c20', '#46362a'], '#0a0604', null, 211 + lado)
    for (let i = 0; i < 3; i++) {
      const py = Math.floor(H * (0.12 + i * 0.1)), px0 = x0 + 4
      for (let y = 0; y < 3; y++) for (let x = 0; x < mw - 8; x++) px(c, px0 + x, py + y, y === 0 ? '#e0e8f0' : y === 2 ? '#4a5262' : x % 5 === 2 ? '#262a32' : '#9aa6b8')
    }
    for (let i = 0; i < 4; i++) { const sx = x0 + 6 + i * Math.floor((mw - 12) / 3), sy = Math.floor(H * 0.44); for (let k = 0; k < 7; k++) px(c, sx, sy + k, k === 0 ? '#e0e8f0' : k % 2 ? '#7a8496' : '#b9c6d8'); px(c, sx - 1, sy, '#9aa6b8'); px(c, sx + 1, sy, '#9aa6b8') }
  }
  tocha(c, mw - 3, Math.floor(H * 0.62)); tocha(c, W - mw + 2, Math.floor(H * 0.62))
  mapaDeLuz(c, W, H, 'rgba(255,140,60,.45)', 'rgba(10,4,0,.7)')
}

/* Coliseu do Acetábulo: arena de areia em anel, arquibancadas em arcos */
function coliseuFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, Math.ceil(H * 0.2), ['#2a1a3a', '#6a3a4a', '#c86a4a', '#f0a060'])
  for (let fileira = 0; fileira < 3; fileira++) {
    const y0 = Math.floor(H * (0.08 + fileira * 0.09)), alt = Math.floor(H * 0.09)
    const n = Math.max(6, Math.round(W / (22 - fileira * 2)))
    for (let y = y0; y < y0 + alt; y++) for (let x = 0; x < W; x++) {
      const i = Math.floor(x / (W / n)), lx = x - i * (W / n), meio = W / n / 2
      const abertura = y > y0 + 2 && Math.abs(lx - meio) < meio * 0.55 && (y - y0 - 2) > (1 - Math.sqrt(Math.max(0, 1 - ((lx - meio) / (meio * 0.55)) ** 2))) * alt * 0.4
      const tom = fileira === 0 ? ['#6a4a3a', '#8a6a52', '#a8866a'] : fileira === 1 ? ['#5a3e30', '#7a5a46', '#967460'] : ['#4a3226', '#6a4c3a', '#86664e']
      if (abertura) px(c, x, y, ruido(x * 2, y * 2, 221 + fileira) > 0.55 ? ['#c84a3a', '#3a6ac8', '#e8c84a', '#f0e0d0', '#4aa86a'][Math.floor(ruido(x, y, 223) * 5)] : '#1a100c')
      else px(c, x, y, y === y0 ? tom[2] : y === y0 + alt - 1 ? '#2a1a12' : (x + y) % 7 === 0 ? tom[0] : tom[1])
    }
  }
  // estandartes no alto
  for (const fx of [0.15, 0.38, 0.62, 0.85]) {
    const x = Math.floor(W * fx)
    for (let y = 0; y < H * 0.12; y++) px(c, x, y, '#3a2a1a')
    for (let y = 2; y < H * 0.11; y++) for (let k = 1; k <= 6; k++) if (y < H * 0.11 - (k % 3)) px(c, x + k, y, k === 1 ? '#7a1a14' : y % 6 === 3 ? '#e3b04b' : '#a8241c')
  }
}
function coliseuMeio(c: Ctx, W: number, H: number) {
  const chao = Math.floor(H * 0.37)
  // muro da arena
  muro(c, 0, chao - 10, W, 12, 225, ['#2a1c14', '#6a5038', '#7e6248', '#927458', '#aa8a6a'], false)
  for (let x = 0; x < W; x++) px(c, x, chao - 11, '#c8a888')
  // portão gradeado no centro
  const gx = Math.floor(W / 2), gw = Math.max(10, Math.floor(W * 0.05))
  arco(c, gx, chao - 18, chao + 2, gw, (x, y, b) => b ? '#c8a888' : x % 3 === 0 || y % 4 === 0 ? '#5a5a62' : '#0e0806')
  // areia com marcas de rodas e círculo central
  const cx = W / 2, cy = H * 0.7
  for (let y = chao + 2; y < H; y++) for (let x = 0; x < W; x++) {
    const v = fbm(x / 9, y / 5, 3, 227) + (bayer(x, y) - 0.5) * 0.25
    const d = Math.hypot((x - cx) / 1.8, (y - cy) * 1.1)
    const anel = Math.abs(d - H * 0.22) < 0.8
    px(c, x, y, anel ? '#b48a5a' : ['#a87e52', '#c09466', '#d2a878', '#e2bc8c'][Math.max(0, Math.min(3, Math.floor(v * 4)))])
  }
  // armas cravadas na areia e escudos encostados
  for (const [fx, fy] of [[0.12, 0.55], [0.88, 0.6], [0.2, 0.85], [0.82, 0.88]] as const) {
    const x = Math.floor(W * fx), y = Math.floor(H * fy)
    for (let k = 0; k < 12; k++) px(c, x, y - k, k > 8 ? '#6a4022' : k === 8 ? '#e3b04b' : k % 2 ? '#b9c6d8' : '#e0e8f0')
    px(c, x - 1, y - 8, '#c28a2a'); px(c, x + 1, y - 8, '#c28a2a')
    sombraEliptica(c, x + 2, y + 1, 4, 1, 0.3)
  }
  mapaDeLuz(c, W, H, 'rgba(255,200,140,.5)', 'rgba(40,10,20,.55)')
}

/* Jardim das Fises: sebes, fonte, caminho de pedra e flores */
function jardimFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, Math.ceil(H * 0.3), ['#7ac0e8', '#9ad0f0', '#c0e4f4', '#e8f4e8'])
  const verdes = ['#163a1e', '#225228', '#2f6a32', '#46883e', '#68a650', '#94c868']
  for (let i = 0; i < 7; i++) copa(c, Math.floor(W * (i / 6)), Math.floor(H * 0.22), Math.floor(H * 0.12), verdes, 231 + i)
  // pérgola de pedra clara com trepadeira florida
  for (const fx of [0.3, 0.7]) {
    const x = Math.floor(W * fx)
    for (let y = Math.floor(H * 0.08); y < H * 0.36; y++) for (let k = -2; k <= 2; k++) px(c, x + k, y, k === -2 ? '#f0ece0' : k === 2 ? '#9a968a' : '#d0ccc0')
  }
  for (let x = Math.floor(W * 0.28); x < W * 0.72; x++) for (let y = Math.floor(H * 0.06); y < H * 0.09; y++) px(c, x, y, y === Math.floor(H * 0.06) ? '#f0ece0' : '#b0aca0')
  for (let x = Math.floor(W * 0.28); x < W * 0.72; x++) if (ruido(x / 2, 3, 239) > 0.4) { const L = 2 + Math.floor(ruido(x, 5, 241) * 8); for (let k = 0; k < L; k++) px(c, x, Math.floor(H * 0.09) + k, k % 3 === 2 ? '#f29bb0' : '#3f7a2a') }
}
function jardimMeio(c: Ctx, W: number, H: number) {
  const chao = Math.floor(H * 0.34)
  for (let y = chao; y < H; y++) for (let x = 0; x < W; x++) {
    const m = fbm(x / 20, y / 12, 3, 243), d = fbm(x / 6, y / 4, 2, 245)
    px(c, x, y, ['#3a6a2a', '#4a8234', '#5e9a40', '#7ab452'][Math.max(0, Math.min(3, Math.floor(m * 2 + d * 1.6 + (bayer(x, y) - 0.5) * 0.5)))])
  }
  // caminho de lajes até a fonte
  const ax = Math.floor(W * 0.3), aw = Math.floor(W * 0.4)
  pedras(c, ax, chao + 6, aw, H - chao - 6, 8, ['#4a4a40', '#a8a490', '#bab6a2', '#ccc8b4', '#e0dcc8'], '#4a7a2a', '#5e9a40', 247, (x, y) => {
    const borda = Math.min(x - ax, ax + aw - x)
    return !(borda < 6 && fbm(x / 3, y / 3, 2, 249) * 8 > borda)
  })
  // fonte
  const fx = Math.floor(W / 2), fy = Math.floor(H * 0.38), fr = Math.max(14, Math.floor(W * 0.06))
  for (let y = -6; y <= 6; y++) for (let x = -fr; x <= fr; x++) {
    const d = (x / fr) ** 2 + (y / 6) ** 2
    if (d > 1) continue
    px(c, fx + x, fy + y, d > 0.72 ? (y < 0 ? '#e0dcc8' : '#8a8676') : (x + y * 2) % 7 === 0 ? '#c8ecff' : (y + x) % 3 ? '#4a9ad0' : '#6ab8e8')
  }
  for (let k = 0; k < 12; k++) { px(c, fx, fy - 2 - k, k > 9 ? '#c8ecff' : '#a8a490'); px(c, fx + 1, fy - 2 - k, '#7a7666') }
  for (let k = 0; k < 6; k++) { px(c, fx - 2 - (k >> 1), fy - 14 + k, '#c8ecff'); px(c, fx + 3 + (k >> 1), fy - 14 + k, '#c8ecff') }
  // sebes podadas nas laterais
  const sebe = ['#0e2a12', '#1a3e1a', '#265426', '#356c32', '#4a8a40', '#68a650']
  for (const lado of [0, 1]) for (let i = 0; i < 3; i++) copa(c, lado ? W - 8 : 8, Math.floor(H * (0.42 + i * 0.2)), Math.floor(H * 0.1), sebe, 251 + i + lado * 7)
  const r0 = rnd(253)
  for (let i = 0; i < W / 2.5; i++) {
    const x = Math.floor(r0() * W), y = chao + 3 + Math.floor(r0() * (H - chao - 5))
    if (x > ax && x < ax + aw) continue
    flor(c, x, y, ['#f4e3a1', '#f29bb0', '#b9a7f4', '#ffffff', '#ff8a6a', '#ffb0e0'][i % 6])
  }
  mapaDeLuz(c, W, H, 'rgba(255,245,200,.55)', 'rgba(20,50,40,.5)')
}

/* Laboratório Biomecânico: engrenagens, tubos de ensaio, piso de placas */
function laboratorioFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, H, ['#060c10', '#0c1820', '#12222c', '#0a141a'])
  // painéis de metal rebitados
  for (let y = 0; y < H * 0.4; y++) for (let x = 0; x < W; x++) {
    const bx = x % 28, by = y % 20
    px(c, x, y, bx === 0 || by === 0 ? '#060c10' : bx === 1 || by === 1 ? '#3a5a66' : (bx === 3 || bx === 25) && (by === 3 || by === 17) ? '#7aa0aa' : (x + y) % 9 === 0 ? '#1e3640' : '#1a2e38')
  }
  const metal = ['#0a1418', '#2a4a52', '#3e6670', '#5a8a92', '#8abcc0']
  engrenagem(c, Math.floor(W * 0.24), Math.floor(H * 0.16), Math.floor(H * 0.1), 10, metal)
  engrenagem(c, Math.floor(W * 0.36), Math.floor(H * 0.25), Math.floor(H * 0.06), 7, ['#140c04', '#6a4a1a', '#8a6a2a', '#b88a3a', '#e3b04b'])
  engrenagem(c, Math.floor(W * 0.76), Math.floor(H * 0.18), Math.floor(H * 0.12), 12, metal)
  // canos horizontais
  for (const fy of [0.05, 0.33]) for (let x = 0; x < W; x++) for (let k = 0; k < 4; k++) px(c, x, Math.floor(H * fy) + k, x % 40 < 3 ? '#8abcc0' : ['#8abcc0', '#5a8a92', '#3e6670', '#1a2e38'][k])
}
function laboratorioMeio(c: Ctx, W: number, H: number) {
  const chao = Math.floor(H * 0.4)
  for (let y = chao; y < H; y++) for (let x = 0; x < W; x++) {
    const bx = x % 16, by = (y - chao) % 12
    const desgaste = fbm(x / 10, y / 6, 2, 261)
    px(c, x, y, bx === 0 || by === 0 ? '#0a1418' : bx === 1 || by === 1 ? '#4a6e78' : (bx === 3 && by === 3) ? '#8abcc0' : desgaste > 0.62 ? '#26404a' : (x + y) % 5 === 0 ? '#2e4a54' : '#34525c')
  }
  // faixas de segurança na borda do piso
  for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) px(c, x, chao + k, Math.floor((x + k) / 4) % 2 ? '#e3b04b' : '#1a1a1a')
  // tubos com líquido brilhante
  const tubo = (x: number, y: number, h: number, liquido: string[]) => {
    for (let k = 0; k < h; k++) for (let d = -3; d <= 3; d++) {
      const nivel = k > h * 0.35
      px(c, x + d, y + k, Math.abs(d) === 3 ? '#8abcc0' : nivel ? (d === -2 ? liquido[2] : (k + d) % 7 === 0 ? liquido[2] : liquido[d < 1 ? 1 : 0]) : d === -2 ? '#c8ecf0' : '#1e3a44')
    }
    for (let d = -4; d <= 4; d++) { px(c, x + d, y - 1, '#5a8a92'); px(c, x + d, y + h, '#5a8a92'); px(c, x + d, y + h + 1, '#1a2e38') }
  }
  const mw = Math.max(26, Math.floor(W * 0.1))
  for (const lado of [0, 1]) {
    const x0 = lado ? W - mw : 0
    for (let y = Math.floor(H * 0.2); y < H; y++) for (let x = x0; x < x0 + mw; x++) px(c, x, y, x === x0 + (lado ? 0 : mw - 1) ? '#8abcc0' : (y % 18 === 0) ? '#0a1418' : '#22404a')
    tubo(x0 + Math.floor(mw * 0.3), Math.floor(H * 0.26), Math.floor(H * 0.16), ['#1a8a6a', '#3ad0a0', '#c8fff0'])
    tubo(x0 + Math.floor(mw * 0.7), Math.floor(H * 0.3), Math.floor(H * 0.12), ['#3a4ab0', '#6a8af0', '#e0e8ff'])
    // painel com luzes
    for (let i = 0; i < 6; i++) px(c, x0 + 4 + i * 3, Math.floor(H * 0.55), ['#ff5a4a', '#3ad0a0', '#ffd76a', '#3ad0a0', '#6a8af0', '#3ad0a0'][i])
    for (let y = Math.floor(H * 0.58); y < H * 0.66; y++) for (let x = x0 + 3; x < x0 + mw - 3; x++) px(c, x, y, (y === Math.floor(H * 0.58)) ? '#8abcc0' : Math.sin(x * 0.7 + y) > 0.85 ? '#3ad0a0' : '#0a1418')
  }
  mapaDeLuz(c, W, H, 'rgba(140,230,220,.4)', 'rgba(0,10,20,.65)')
}

/* Caverna da Pseudoartrose: cristais, cogumelos e lago luminoso */
function cavernaFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, H, ['#06040c', '#0e0a1a', '#160f26', '#0a0812'])
  for (let x = 0; x < W; x++) {
    const teto = Math.floor(H * 0.08 + fbm(x / 20, 1, 3, 271) * H * 0.14)
    for (let y = 0; y < teto; y++) px(c, x, y, y > teto - 2 ? '#3a2a4a' : '#0e0a16')
    const base = Math.floor(H * 0.4 - fbm(x / 28, 2, 3, 273) * H * 0.16)
    for (let y = base; y < H * 0.44; y++) px(c, x, y, y - base < 2 ? '#4a3a5a' : (x + y) % 5 === 0 ? '#22183a' : '#1a122c')
  }
  const r0 = rnd(275)
  for (let i = 0; i < W / 12; i++) {
    const x = Math.floor(r0() * W), L = 5 + Math.floor(r0() * H * 0.1), larg = 1 + Math.floor(r0() * 3)
    for (let k = 0; k < L; k++) { const w2 = Math.max(0, Math.round(larg * (1 - k / L))); for (let d = -w2; d <= w2; d++) px(c, x + d, Math.floor(H * 0.1) + k, d === -w2 ? '#3a2a4a' : '#160f26') }
  }
  const tons = [['#2a0a5a', '#7a3ad0', '#a86af0', '#d8b0ff', '#ffffff'], ['#0a3a4a', '#2aa0b0', '#5ad0e0', '#b0f4ff', '#ffffff']]
  for (let i = 0; i < 9; i++) { const x = Math.floor(W * (0.05 + i * 0.11 + r0() * 0.04)); cristal(c, x, Math.floor(H * 0.42), Math.floor(H * (0.06 + r0() * 0.08)), 2 + Math.floor(r0() * 2), tons[i % 2]) }
}
function cavernaMeio(c: Ctx, W: number, H: number) {
  const chao = Math.floor(H * 0.4)
  pedras(c, 0, chao, W, H - chao, 11, ['#06040a', '#1e1628', '#261c32', '#2e223c', '#382a48', '#443456'], '#0a0812', '#1e3a2a', 281)
  // lago com brilho turquesa
  const lx = Math.floor(W * 0.5), ly = Math.floor(H * 0.5)
  for (let y = -8; y <= 8; y++) for (let x = -Math.floor(W * 0.14); x <= W * 0.14; x++) {
    const d = (x / (W * 0.14)) ** 2 + (y / 8) ** 2 + fbm(x / 6, y / 3, 2, 283) * 0.3
    if (d > 1) continue
    px(c, lx + x, ly + y, d > 0.85 ? '#2a6a6a' : (x + y * 3) % 9 === 0 ? '#b0f4ff' : d < 0.4 ? '#3ad0c0' : '#1a8a8a')
  }
  // cogumelos luminosos
  const cogu = (x: number, y: number, r: number, cor: string[]) => {
    for (let k = 0; k < r + 2; k++) px(c, x, y - k, '#d8d0c0')
    for (let yy = -r; yy <= 0; yy++) for (let xx = -r * 2; xx <= r * 2; xx++) if ((xx / (r * 2)) ** 2 + (yy / r) ** 2 <= 1) px(c, x + xx, y - r - 2 + yy, yy === 0 ? cor[0] : (xx + yy) % 4 === 0 ? cor[2] : cor[1])
  }
  const r0 = rnd(285)
  for (let i = 0; i < 10; i++) {
    const lado = i % 2, x = lado ? Math.floor(W * (0.8 + r0() * 0.16)) : Math.floor(W * (0.04 + r0() * 0.16))
    cogu(x, Math.floor(H * (0.48 + r0() * 0.45)), 1 + Math.floor(r0() * 3), i % 3 ? ['#2a8a4a', '#5ad07a', '#c8ffb0'] : ['#6a2a8a', '#b05ad0', '#f0c0ff'])
  }
  const tons = ['#2a0a5a', '#7a3ad0', '#a86af0', '#d8b0ff', '#ffffff']
  cristal(c, Math.floor(W * 0.06), H - 2, Math.floor(H * 0.3), 5, tons); cristal(c, Math.floor(W * 0.13), H - 2, Math.floor(H * 0.18), 3, tons)
  cristal(c, Math.floor(W * 0.93), H - 2, Math.floor(H * 0.34), 5, ['#0a3a4a', '#2aa0b0', '#5ad0e0', '#b0f4ff', '#ffffff']); cristal(c, Math.floor(W * 0.86), H - 2, Math.floor(H * 0.16), 3, ['#0a3a4a', '#2aa0b0', '#5ad0e0', '#b0f4ff', '#ffffff'])
  mapaDeLuz(c, W, H, 'rgba(160,120,255,.4)', 'rgba(0,0,10,.75)')
}

/* Templo do Escafoide: arenito, colunas, disco solar e canal de água */
function temploFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, H, ['#3a1a10', '#6a3a1a', '#a86a32', '#d8a058'])
  // fachada com colunas
  for (let y = Math.floor(H * 0.04); y < H * 0.4; y++) for (let x = 0; x < W; x++) px(c, x, y, (y % 8 === 0) ? '#8a5a2a' : (x + Math.floor(y / 8) * 5) % 18 === 0 ? '#9a6a3a' : '#c0904e')
  const n = Math.max(4, Math.round(W / 70))
  for (let i = 0; i < n; i++) {
    const x = Math.floor((i + 0.5) * (W / n)), cw = Math.max(5, Math.floor(W / n * 0.12))
    if (Math.abs(x - W / 2) < W * 0.12) continue
    for (let y = Math.floor(H * 0.06); y < H * 0.4; y++) for (let k = -cw; k <= cw; k++) px(c, x + k, y, Math.abs(k) === cw ? '#6a4020' : k % 3 === 0 ? '#c8985a' : k < 0 ? '#f0c888' : '#d8aa6a')
    for (let k = -cw - 2; k <= cw + 2; k++) { px(c, x + k, Math.floor(H * 0.06), '#f6d8a0'); px(c, x + k, Math.floor(H * 0.06) + 1, '#8a5a2a') }
  }
  // disco solar e portal
  const sx = Math.floor(W / 2), sy = Math.floor(H * 0.13), sr = Math.max(7, Math.floor(H * 0.06))
  for (let y = -sr - 3; y <= sr + 3; y++) for (let x = -sr - 3; x <= sr + 3; x++) {
    const d = Math.hypot(x, y), a = Math.atan2(y, x)
    if (d <= sr) px(c, sx + x, sy + y, d > sr - 1 ? '#8a5a1a' : (x + y) % 5 === 0 ? '#fff1b0' : '#f2c45a')
    else if (d <= sr + 3 && Math.cos(a * 12) > 0.6) px(c, sx + x, sy + y, '#e3b04b')
  }
  arco(c, sx, Math.floor(H * 0.22), Math.floor(H * 0.4), Math.floor(W * 0.06), (_, __, b) => b ? '#f6d8a0' : '#1a0c06')
}
function temploMeio(c: Ctx, W: number, H: number) {
  const chao = Math.floor(H * 0.4)
  // degraus
  for (let d = 0; d < 3; d++) for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) px(c, x, chao + d * 3 + k, k === 0 ? '#f6d8a0' : k === 2 ? '#8a5a2a' : '#d8aa6a')
  for (let y = chao + 9; y < H; y++) for (let x = 0; x < W; x++) {
    const bx = (x + (Math.floor((y - chao) / 10) % 2) * 8) % 16, by = (y - chao - 9) % 10
    px(c, x, y, bx === 0 || by === 0 ? '#8a5a2a' : bx === 1 || by === 1 ? '#f0c888' : fbm(x / 8, y / 5, 2, 291) > 0.64 ? '#b8884a' : '#d0a060')
  }
  // canal de água no centro
  const cw = Math.max(8, Math.floor(W * 0.04))
  for (let y = chao + 9; y < H; y++) for (let k = -cw; k <= cw; k++) px(c, Math.floor(W / 2) + k, y, Math.abs(k) === cw ? '#6a4020' : (y + k * 3) % 11 === 0 ? '#c8ecff' : k < 0 ? '#3a8ab0' : '#2a6a90')
  // obeliscos e braseiros
  for (const fx of [0.1, 0.9]) {
    const x = Math.floor(W * fx), base = Math.floor(H * 0.92), alt = Math.floor(H * 0.5)
    for (let k = 0; k < alt; k++) { const w2 = Math.max(1, Math.round(5 * (1 - k / alt * 0.45))); for (let d = -w2; d <= w2; d++) px(c, x + d, base - k, d === -w2 ? '#f6d8a0' : d === w2 ? '#6a4020' : k % 9 === 4 && Math.abs(d) < 2 ? '#8a5a2a' : '#c8985a') }
    for (let d = -2; d <= 2; d++) px(c, x + d, base - alt, '#f2c45a')
  }
  braseiro(c, Math.floor(W * 0.24), Math.floor(H * 0.5)); braseiro(c, Math.floor(W * 0.76), Math.floor(H * 0.5))
  mapaDeLuz(c, W, H, 'rgba(255,220,150,.55)', 'rgba(60,20,0,.5)')
}

/* Passarela Suspensa: ponte de tábuas sobre o mar de nuvens */
function passarelaFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, H, ['#1a3270', '#2a5aa8', '#5a8ad0', '#a8c8ec', '#e8ecf0'])
  // picos e falésias
  for (const [fx, alt, lw] of [[0.06, 0.34, 0.14], [0.24, 0.2, 0.1], [0.5, 0.14, 0.12], [0.78, 0.24, 0.12], [0.96, 0.36, 0.14]] as const) {
    const cx = Math.floor(W * fx), topo = Math.floor(H * (0.42 - alt))
    for (let y = topo; y < H * 0.5; y++) { const w2 = Math.floor((y - topo) / (H * alt) * W * lw); for (let x = -w2; x <= w2; x++) px(c, cx + x, y, y - topo < 4 + (x & 1) ? '#f4f8ff' : x < -w2 / 3 ? '#5a6a90' : x < w2 / 3 ? '#46567a' : '#34446a') }
  }
  // mar de nuvens embaixo
  for (let y = Math.floor(H * 0.42); y < H; y++) for (let x = 0; x < W; x++) {
    const v = fbm(x / 26, y / 8, 3, 301) + (y - H * 0.44) / (H * 0.4)
    if (v > 0.62) px(c, x, y, v > 1.15 ? '#ffffff' : v > 0.9 ? '#e0e8f6' : v > 0.75 ? '#b8c8e4' : '#8aa0cc')
  }
}
function passarelaMeio(c: Ctx, W: number, H: number) {
  const topo = Math.floor(H * 0.44), base = Math.floor(H * 0.92)
  // tábuas com folgas e pregos
  for (let y = topo; y < base; y++) for (let x = 0; x < W; x++) {
    const t = Math.floor(x / 9), lx = x % 9
    const falha = ruido(t, 1, 303) > 0.93 && y > topo + 6 && y < base - 6
    if (lx === 0 || falha) { if (!falha) px(c, x, y, '#2a1a0e'); continue }
    const veio = fbm((x + t * 13) / 3, y / 14, 2, 305 + t)
    px(c, x, y, (lx === 2 || lx === 7) && (y === topo + 3 || y === base - 4) ? '#b9c6d8' : ['#5a3a1e', '#7a5230', '#8f6440', '#a87a50'][Math.max(0, Math.min(3, Math.floor(veio * 3.2 + (lx === 1 ? 0.8 : 0))))])
  }
  // vigas e cordas
  for (const y0 of [topo - 2, base]) for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) px(c, x, y0 + k, ['#a87a50', '#5a3a1e', '#2a1a0e'][k])
  for (let x = 0; x < W; x++) {
    const ondula = Math.round(Math.sin(x / W * Math.PI * 3) * 3)
    px(c, x, topo - 12 + ondula, (x % 4) < 2 ? '#d8c08a' : '#a8905a'); px(c, x, topo - 11 + ondula, '#6a5a3a')
    px(c, x, base + 6 + ondula, (x % 4) < 2 ? '#d8c08a' : '#a8905a')
  }
  for (let i = 0; i <= 6; i++) {
    const x = Math.floor(i * (W - 1) / 6)
    for (let y = topo - 16; y < topo + 2; y++) for (let k = -1; k <= 1; k++) px(c, x + k, y, k === -1 ? '#a87a50' : k === 1 ? '#2a1a0e' : '#6a4a2a')
    for (let k = 0; k < 10; k++) px(c, x + (k % 2), topo - 10 + k, '#d8c08a')
  }
  mapaDeLuz(c, W, H, 'rgba(255,240,210,.5)', 'rgba(20,40,80,.45)')
}

/* Cripta Óssea: nichos com urnas, velas, teias e sarcófagos lisos */
function catacumbaFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, H, ['#06080c', '#0e121a', '#141a24', '#0a0e14'])
  muro(c, 0, 0, W, Math.floor(H * 0.42), 311, ['#080a0e', '#22262e', '#2e323a', '#3a3e48', '#484c58'])
  const n = Math.max(4, Math.round(W / 46))
  for (let fil = 0; fil < 2; fil++) for (let i = 0; i < n; i++) {
    const x = Math.floor((i + 0.5) * (W / n)), y0 = Math.floor(H * (0.05 + fil * 0.18)), meia = Math.max(6, Math.floor(W / n * 0.28))
    arco(c, x, y0, y0 + Math.floor(H * 0.13), meia, (_, __, b) => b ? '#5a5e6a' : '#040508')
    // urna
    const uy = y0 + Math.floor(H * 0.13) - 1
    for (let k = 0; k < 7; k++) { const w2 = k < 1 ? 1 : k < 5 ? 3 : 2; for (let d = -w2; d <= w2; d++) px(c, x + d, uy - k, d === -w2 ? '#8a7a5a' : d === w2 ? '#3a3020' : '#6a5a3a') }
    if ((i + fil) % 2) velaPequena(c, x + meia - 3, uy - 3, 3)
  }
}
function catacumbaMeio(c: Ctx, W: number, H: number) {
  const chao = Math.floor(H * 0.42)
  pedras(c, 0, chao, W, H - chao, 10, ['#06070a', '#1e222a', '#262a34', '#2e323e', '#383c48', '#444856'], '#08090c', '#1e2a2a', 313)
  // sarcófagos lisos
  const sarc = (x: number, y: number, w: number) => {
    for (let yy = 0; yy < 10; yy++) for (let xx = 0; xx < w; xx++) px(c, x + xx, y + yy, yy === 0 ? '#8a8e9a' : yy < 3 ? '#6a6e7a' : yy === 9 ? '#0e1014' : xx === 0 ? '#5a5e6a' : xx === w - 1 ? '#22262e' : '#3a3e48')
    for (let xx = 3; xx < w - 3; xx++) px(c, x + xx, y + 5, '#8a7a4a')
  }
  sarc(Math.floor(W * 0.04), Math.floor(H * 0.52), Math.floor(W * 0.14)); sarc(Math.floor(W * 0.82), Math.floor(H * 0.56), Math.floor(W * 0.14))
  // velas em grupos
  for (const [fx, fy] of [[0.24, 0.48], [0.76, 0.5], [0.14, 0.84], [0.88, 0.86]] as const) for (let i = 0; i < 4; i++) velaPequena(c, Math.floor(W * fx) + i * 3 - 4, Math.floor(H * fy) - (i % 2) * 2, 3 + (i % 3))
  // teias nos cantos
  const teia = (x0: number, y0: number, sx: number, r: number) => {
    for (let a = 0; a < 5; a++) { const ang = (a / 4) * Math.PI / 2; for (let k = 0; k < r; k++) px(c, x0 + sx * Math.round(Math.cos(ang) * k), y0 + Math.round(Math.sin(ang) * k), '#8a90a0') }
    for (let k = 4; k < r; k += 4) for (let a = 0; a < 20; a++) { const ang = (a / 19) * Math.PI / 2; px(c, x0 + sx * Math.round(Math.cos(ang) * k), y0 + Math.round(Math.sin(ang) * k), '#5a6070') }
  }
  teia(0, 0, 1, Math.floor(H * 0.12)); teia(W - 1, 0, -1, Math.floor(H * 0.12))
  mapaDeLuz(c, W, H, 'rgba(160,190,255,.3)', 'rgba(0,0,8,.75)')
}

/* Ala de Treino: paliçada, bonecos de palha, cavalete de espadas de madeira */
function treinoFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, Math.ceil(H * 0.3), ['#6ab0e0', '#9acce8', '#cce4ee', '#f0ecd8'])
  // telhados de barracas e quartel
  for (const [fx, w, cor] of [[0.15, 0.16, ['#7a2a1c', '#a8402a']], [0.5, 0.22, ['#2a4a7a', '#3a6aa8']], [0.85, 0.16, ['#7a2a1c', '#a8402a']]] as const) {
    const cx = Math.floor(W * fx), hw = Math.floor(W * w / 2), topo = Math.floor(H * 0.1)
    for (let y = topo; y < H * 0.24; y++) { const w2 = Math.floor((y - topo) / (H * 0.14) * hw); for (let x = -w2; x <= w2; x++) px(c, cx + x, y, x < 0 ? cor[1] : cor[0]) }
    for (let y = Math.floor(H * 0.24); y < H * 0.3; y++) for (let x = -hw + 2; x <= hw - 2; x++) px(c, cx + x, y, Math.abs(x) < 3 ? '#1a100a' : '#d8c8a8')
    for (let k = 0; k < 6; k++) px(c, cx, topo - k, '#4a3a2a'); for (let k = 1; k < 5; k++) for (let j = 0; j < 3; j++) px(c, cx + k, topo - 5 + j, '#e3b04b')
  }
  // paliçada
  for (let x = 0; x < W; x++) {
    const ponta = Math.floor(H * 0.26) - (x % 7 === 3 ? 3 : x % 7 === 2 || x % 7 === 4 ? 2 : 0)
    for (let y = ponta; y < H * 0.38; y++) px(c, x, y, x % 7 === 0 ? '#3a2412' : x % 7 < 3 ? '#a87a50' : '#7a5230')
  }
  for (let x = 0; x < W; x++) { px(c, x, Math.floor(H * 0.3), '#4a3a2a'); px(c, x, Math.floor(H * 0.34), '#4a3a2a') }
}
function treinoMeio(c: Ctx, W: number, H: number) {
  const chao = Math.floor(H * 0.38)
  for (let y = chao; y < H; y++) for (let x = 0; x < W; x++) {
    const v = fbm(x / 12, y / 7, 3, 321) + (bayer(x, y) - 0.5) * 0.3
    const grama = Math.min(x, W - 1 - x) < W * 0.12 + fbm(x / 5, y / 5, 2, 323) * 12
    px(c, x, y, grama ? ['#3f6a2a', '#56873a', '#74a24a'][Math.max(0, Math.min(2, Math.floor(v * 3)))] : ['#7a603a', '#8f7046', '#a48254', '#b49262'][Math.max(0, Math.min(3, Math.floor(v * 4)))])
  }
  // bonecos de palha com alvo
  const boneco = (x: number, y: number) => {
    sombraEliptica(c, x + 3, y + 1, 9, 3, 0.3)
    for (let k = 0; k < 34; k++) for (let d = -1; d <= 1; d++) px(c, x + d, y - k, d === -1 ? '#6a4022' : '#4a2c16')
    for (let k = -11; k <= 11; k++) for (let d = 0; d < 2; d++) px(c, x + k, y - 24 + d, d ? '#4a2c16' : '#7a5230')
    for (let yy = -10; yy <= 10; yy++) for (let xx = -7; xx <= 7; xx++) if ((xx / 7) ** 2 + (yy / 10) ** 2 <= 1) px(c, x + xx, y - 20 + yy, (xx * 3 + yy * 2) % 7 === 0 ? '#a88040' : xx < -3 ? '#f0cc7a' : xx > 3 ? '#c8a058' : '#e0bc6a')
    for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) { const d = Math.hypot(xx, yy); if (d <= 5) px(c, x + xx, y - 20 + yy, d < 1.5 ? '#a8241c' : d < 3 ? '#f0ece0' : d < 4.3 ? '#a8241c' : '#6a1410') }
    for (let k = -8; k <= 8; k++) px(c, x + k, y - 12, '#8a6a2a')
    for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) if (xx * xx + yy * yy <= 25) px(c, x + xx, y - 36 + yy, (xx + yy) % 3 === 0 ? '#c8a058' : xx < -1 ? '#f0cc7a' : '#e0bc6a')
    for (let k = -5; k <= 5; k++) px(c, x + k, y - 33, '#8a6a2a')
  }
  boneco(Math.floor(W * 0.16), Math.floor(H * 0.62)); boneco(Math.floor(W * 0.86), Math.floor(H * 0.66))
  // cavalete de espadas de madeira
  const rx = Math.floor(W * 0.06), ry = Math.floor(H * 0.88)
  for (let x = rx; x < rx + 22; x++) { px(c, x, ry - 10, '#7a5230'); px(c, x, ry - 2, '#7a5230') }
  for (let i = 0; i < 4; i++) for (let k = 0; k < 14; k++) px(c, rx + 3 + i * 5, ry - 14 + k, k < 3 ? '#4a2c16' : k === 3 ? '#a87a50' : '#c8a070')
  // fardos de feno
  for (const fx of [0.9, 0.95]) for (let y = 0; y < 7; y++) for (let x = -6; x <= 6; x++) px(c, Math.floor(W * fx) + x, Math.floor(H * 0.9) + y, y === 2 || y === 5 ? '#8a6a2a' : (x + y) % 3 ? '#e0bc6a' : '#c8a058')
  mapaDeLuz(c, W, H, 'rgba(255,240,190,.55)', 'rgba(30,30,50,.45)')
}

/* Biblioteca Ancestral (sala do preceptor): estantes altas, círculo de runas */
function arquivoFundo(c: Ctx, W: number, H: number) {
  degradeVertical(c, 0, 0, W, H, ['#060814', '#0c1024', '#141a36', '#0a0e1e'])
  const r0 = rnd(331)
  const prat = 16
  for (const [x0, x1] of [[0, W * 0.36], [W * 0.64, W]] as const) for (let y = 2; y < H * 0.42; y += prat) {
    for (let x = Math.floor(x0); x < x1; x++) { px(c, x, y + prat - 2, '#4a3a6a'); px(c, x, y + prat - 1, '#1a1430') }
    for (let x = Math.floor(x0) + 1; x < x1;) {
      const lw = 2 + Math.floor(r0() * 3), lh = 8 + Math.floor(r0() * 5)
      const tons = [['#3a2a7a', '#5a4aa8'], ['#1f4a5a', '#2f6a7a'], ['#6a2a4a', '#8a3a6a'], ['#6a5a1a', '#a8902a']][Math.floor(r0() * 4)]
      for (let yy = 0; yy < lh; yy++) for (let xx = 0; xx < lw; xx++) px(c, x + xx, y + prat - 2 - lh + yy, xx === 0 ? tons[1] : tons[0])
      if (r0() > 0.5) px(c, x, y + prat - lh, '#e3b04b')
      x += lw + (r0() > 0.88 ? 3 : 0)
    }
  }
  // grande janela redonda com estrelas e constelação
  const jx = Math.floor(W / 2), jy = Math.floor(H * 0.2), jr = Math.floor(Math.min(W * 0.12, H * 0.18))
  for (let y = -jr - 2; y <= jr + 2; y++) for (let x = -jr - 2; x <= jr + 2; x++) {
    const d = Math.hypot(x, y)
    if (d > jr + 2) continue
    if (d > jr) { px(c, jx + x, jy + y, '#c28a2a'); continue }
    const raio = Math.abs(x) < 1 || Math.abs(y) < 1 || Math.abs(Math.abs(x) - Math.abs(y)) < 1
    px(c, jx + x, jy + y, raio && d > jr * 0.3 ? '#7a5214' : ruido(x * 3, y * 3, 333) > 0.93 ? '#ffffff' : d < jr * 0.3 ? '#3a3a8a' : '#1a1e4a')
  }
}
function arquivoMeio(c: Ctx, W: number, H: number) {
  const chao = Math.floor(H * 0.42)
  for (let y = chao; y < H; y++) for (let x = 0; x < W; x++) {
    const tabua = Math.floor((y - chao) / 7)
    const veio = fbm((x + tabua * 41) / 16, (y - chao) / 2.5, 2, 335 + tabua)
    px(c, x, y, (y - chao) % 7 === 6 ? '#0e0a14' : ['#2a1e2a', '#3a2a36', '#4a3644', '#5a4252'][Math.max(0, Math.min(3, Math.floor(veio * 3.2)))])
  }
  // círculo de runas (só símbolos geométricos)
  const cx = W / 2, cy = H * 0.7, R = Math.min(W * 0.3, H * 0.24)
  for (let y = chao; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - cx) / 1.8, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx)
    if (Math.abs(d - R) < 0.7 || Math.abs(d - R * 0.82) < 0.6) px(c, x, y, '#6a9aff')
    else if (d > R * 0.84 && d < R * 0.98 && Math.cos(a * 16) > 0.85) px(c, x, y, '#e3b04b')
    else if (Math.abs(d - R * 0.4) < 0.6 && Math.cos(a * 3) > -0.2) px(c, x, y, '#a8c4ff')
  }
  // atris: púlpitos com livros abertos e velas
  for (const fx of [0.12, 0.88]) {
    const x = Math.floor(W * fx), y = Math.floor(H * 0.58)
    for (let k = 0; k < 16; k++) for (let d = -2; d <= 2; d++) px(c, x + d, y + k, d === -2 ? '#8a5a30' : d === 2 ? '#2a1a0e' : '#6a4022')
    for (let d = -8; d <= 8; d++) for (let k = 0; k < 3; k++) px(c, x + d, y - 2 + k + Math.abs(d) / 6, k === 0 ? (d === 0 ? '#8a7a5a' : '#f0e8d0') : '#6a4022')
    for (let d = -6; d <= 6; d += 2) if (d) px(c, x + d, y - 1, '#5a5a7a')
    velaPequena(c, x + (fx < 0.5 ? 10 : -11), y - 3, 5)
  }
  // estantes nas bordas
  const mw = Math.max(20, Math.floor(W * 0.07))
  for (const lado of [0, 1]) for (let y = 0; y < H; y++) for (let x = lado ? W - mw : 0; x < (lado ? W : mw); x++) {
    const u = lado ? x - (W - mw) : mw - 1 - x
    px(c, x, y, y % 40 < 2 ? '#c28a2a' : u === 0 ? '#8a5a30' : u < 3 ? '#6a4022' : u % 6 === 0 ? '#2a1a0e' : '#4a2c16')
  }
  mapaDeLuz(c, W, H, 'rgba(150,170,255,.4)', 'rgba(0,0,12,.7)')
}

/* ------------------------------------------------------------ Públicas */

const LUZES: Record<Cena, Array<[number, number, string, number]>> = {
  // [x, y, cor, raio relativo]
  campo: [[0.12, 0.05, '255,236,190', 0.55], [0.1, 0.34, '255,170,80', 0.12], [0.9, 0.34, '255,170,80', 0.12], [0.1, 0.74, '255,170,80', 0.12], [0.9, 0.74, '255,170,80', 0.12]],
  masmorra: [[0.08, 0.3, '255,150,60', 0.2], [0.92, 0.3, '255,150,60', 0.2], [0.08, 0.72, '255,150,60', 0.2], [0.92, 0.72, '255,150,60', 0.2], [0.5, 0.15, '110,150,230', 0.4]],
  salao: [[0.08, 0.34, '255,180,90', 0.18], [0.92, 0.34, '255,180,90', 0.18], [0.08, 0.8, '255,180,90', 0.18], [0.92, 0.8, '255,180,90', 0.18], [0.5, 0.18, '255,215,150', 0.45]],
  biblioteca: [[0.16, 0.56, '255,180,90', 0.28], [0.86, 0.55, '255,180,90', 0.26], [0.5, 0.25, '150,180,240', 0.35]],
  covil: [[0.08, 0.34, '255,150,60', 0.18], [0.92, 0.34, '255,150,60', 0.18], [0.12, 0.8, '255,110,30', 0.3], [0.88, 0.8, '255,110,30', 0.3], [0.5, 0.4, '255,120,50', 0.35]],
  torre: [[0.78, 0.12, '150,180,240', 0.3], [0.1, 0.07, '255,180,90', 0.16], [0.9, 0.07, '255,180,90', 0.16], [0.5, 0.42, '255,200,160', 0.5]],
  forja: [[0.5, 0.26, '255,120,40', 0.5], [0.08, 0.6, '255,150,60', 0.16], [0.92, 0.6, '255,150,60', 0.16], [0.2, 0.5, '255,180,90', 0.12]],
  coliseu: [[0.5, 0.05, '255,190,120', 0.6], [0.5, 0.7, '255,220,170', 0.4]],
  jardim: [[0.3, 0.02, '255,245,210', 0.55], [0.5, 0.38, '170,230,255', 0.2]],
  laboratorio: [[0.18, 0.32, '80,240,190', 0.18], [0.82, 0.32, '80,240,190', 0.18], [0.12, 0.35, '120,150,255', 0.12], [0.88, 0.35, '120,150,255', 0.12], [0.5, 0.15, '140,220,230', 0.4]],
  caverna: [[0.5, 0.5, '90,230,220', 0.35], [0.06, 0.75, '170,110,255', 0.24], [0.93, 0.72, '110,210,255', 0.24], [0.5, 0.38, '170,110,255', 0.3]],
  templo: [[0.5, 0.13, '255,230,150', 0.4], [0.24, 0.5, '255,170,80', 0.14], [0.76, 0.5, '255,170,80', 0.14], [0.5, 0.75, '170,220,255', 0.18]],
  passarela: [[0.7, 0.05, '255,250,230', 0.6], [0.5, 0.95, '255,255,255', 0.35]],
  catacumba: [[0.24, 0.47, '255,180,90', 0.12], [0.76, 0.49, '255,180,90', 0.12], [0.14, 0.83, '255,180,90', 0.12], [0.88, 0.85, '255,180,90', 0.12], [0.5, 0.2, '120,150,230', 0.35]],
  treino: [[0.85, 0.02, '255,245,210', 0.6], [0.5, 0.6, '255,230,180', 0.3]],
  arquivo: [[0.5, 0.2, '120,140,255', 0.35], [0.5, 0.7, '110,150,255', 0.4], [0.17, 0.56, '255,180,90', 0.1], [0.83, 0.56, '255,180,90', 0.1]],
}

/** Desenha os planos da cena. Retorna a escala usada (pixel da arte em px de tela). */
export function pintarCena(planos: { fundo: HTMLCanvasElement; meio: HTMLCanvasElement; frente: HTMLCanvasElement; brilho: HTMLCanvasElement }, cena: Cena) {
  const w = planos.meio.clientWidth || window.innerWidth, h = planos.meio.clientHeight || window.innerHeight
  const s = escalaPixel(w)
  const W = Math.ceil(w / s), H = Math.ceil(h / s)
  for (const cv of [planos.fundo, planos.meio, planos.frente]) { cv.width = W; cv.height = H; cv.getContext('2d')!.clearRect(0, 0, W, H) }
  const f = planos.fundo.getContext('2d')!, m = planos.meio.getContext('2d')!, fr = planos.frente.getContext('2d')!
  if (cena === 'campo') { campoFundo(f, W, H); campoMeio(m, W, H); campoFrente(fr, W, H) }
  else if (cena === 'masmorra') { masmorraFundo(f, W, H); masmorraMeio(m, W, H) }
  else if (cena === 'salao') { salaoFundo(f, W, H); salaoMeio(m, W, H) }
  else if (cena === 'covil') { covilFundo(f, W, H); covilMeio(m, W, H) }
  else if (cena === 'torre') { torreFundo(f, W, H); torreMeio(m, W, H) }
  else if (cena === 'forja') { forjaFundo(f, W, H); forjaMeio(m, W, H) }
  else if (cena === 'coliseu') { coliseuFundo(f, W, H); coliseuMeio(m, W, H) }
  else if (cena === 'jardim') { jardimFundo(f, W, H); jardimMeio(m, W, H); campoFrente(fr, W, H) }
  else if (cena === 'laboratorio') { laboratorioFundo(f, W, H); laboratorioMeio(m, W, H) }
  else if (cena === 'caverna') { cavernaFundo(f, W, H); cavernaMeio(m, W, H) }
  else if (cena === 'templo') { temploFundo(f, W, H); temploMeio(m, W, H) }
  else if (cena === 'passarela') { passarelaFundo(f, W, H); passarelaMeio(m, W, H) }
  else if (cena === 'catacumba') { catacumbaFundo(f, W, H); catacumbaMeio(m, W, H) }
  else if (cena === 'treino') { treinoFundo(f, W, H); treinoMeio(m, W, H); campoFrente(fr, W, H) }
  else if (cena === 'arquivo') { arquivoFundo(f, W, H); arquivoMeio(m, W, H) }
  else { bibliotecaFundo(f, W, H); bibliotecaMeio(m, W, H) }
  // brilho suave (bloom das fontes de luz), em resolução de tela
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const b = planos.brilho
  b.width = Math.round(w * dpr * 0.5); b.height = Math.round(h * dpr * 0.5)
  const bc = b.getContext('2d')!
  bc.clearRect(0, 0, b.width, b.height)
  for (const [x, y, cor, r] of LUZES[cena]) {
    const R = Math.max(b.width, b.height) * r
    const g = bc.createRadialGradient(x * b.width, y * b.height, 0, x * b.width, y * b.height, R)
    g.addColorStop(0, `rgba(${cor},.55)`); g.addColorStop(0.25, `rgba(${cor},.22)`); g.addColorStop(1, `rgba(${cor},0)`)
    bc.fillStyle = g; bc.fillRect(0, 0, b.width, b.height)
  }
  return s
}

const MESA: Record<Cenario, { borda: string[]; tampo: string[]; metal: string[]; junta: string }> = {
  campo: { borda: ['#2a2620', '#5a5446', '#7d7664', '#9a927c', '#b8b098'], tampo: ['#4a4a3a', '#8a8470', '#9e9882', '#b0aa92', '#c8c2a8'], metal: ['#3a2408', '#7a5214', '#c28a2a', '#f2c45a', '#fff1b0'], junta: '#3f5a26' },
  masmorra: { borda: ['#0c0d12', '#2a2d36', '#3a3d47', '#4a4e5a', '#626674'], tampo: ['#14161c', '#3a3e4a', '#464a56', '#525664', '#666a7a'], metal: ['#161a26', '#465066', '#7a889f', '#b9c6d8', '#f4f8ff'], junta: '#20283a' },
  salao: { borda: ['#140c08', '#3a2a20', '#54402e', '#6e5640', '#8a7056'], tampo: ['#1e140e', '#5a4636', '#6a5442', '#7a6250', '#927a64'], metal: ['#3a2408', '#7a5214', '#c28a2a', '#f2c45a', '#fff1b0'], junta: '#2a1a10' },
  covil: { borda: ['#0a0302', '#2a120c', '#3c1a10', '#4e2416', '#62301e'], tampo: ['#120604', '#3a1c14', '#46241a', '#542c20', '#6a3a28'], metal: ['#3a0a04', '#a02a10', '#f0702a', '#ffc24a', '#fff6b0'], junta: '#5a1a08' },
  torre: { borda: ['#24203a', '#5a5270', '#7a7290', '#9a92b0', '#c0b8d4'], tampo: ['#2a2640', '#7a7290', '#8a82a0', '#9a92b0', '#b4acc8'], metal: ['#140628', '#3a1e70', '#6a40b8', '#a878f0', '#e2c8ff'], junta: '#3a3448' },
  forja: { borda: ['#0a0604', '#2e2018', '#3e2c20', '#4e3828', '#5e4632'], tampo: ['#120c08', '#3a3e48', '#464a56', '#525664', '#666a7a'], metal: ['#3a0a04', '#a02a10', '#f0702a', '#ffc24a', '#fff6b0'], junta: '#5a2a10' },
  coliseu: { borda: ['#2a1c14', '#6a5038', '#7e6248', '#927458', '#aa8a6a'], tampo: ['#3a2a1c', '#9a7a58', '#aa8a66', '#ba9a74', '#d0b08a'], metal: ['#3a0a0a', '#7a1a14', '#a8241c', '#e3b04b', '#fff1b0'], junta: '#5a4030' },
  jardim: { borda: ['#3a3a30', '#8a8676', '#a8a490', '#bab6a2', '#e0dcc8'], tampo: ['#4a4a40', '#b0ac98', '#c0bca8', '#d0ccb8', '#e8e4d0'], metal: ['#1a3a1a', '#2f6a32', '#5e9a40', '#94c868', '#e0ffb0'], junta: '#4a7a2a' },
  laboratorio: { borda: ['#0a1418', '#2a4a52', '#3e6670', '#5a8a92', '#8abcc0'], tampo: ['#0e1a20', '#2e4a54', '#34525c', '#3e5e68', '#4a6e78'], metal: ['#0a2a20', '#1a8a6a', '#3ad0a0', '#8af0d0', '#e0fff4'], junta: '#0a1418' },
  caverna: { borda: ['#06040a', '#1e1628', '#2e223c', '#382a48', '#443456'], tampo: ['#0a0812', '#261c32', '#2e223c', '#382a48', '#4a3a5a'], metal: ['#2a0a5a', '#7a3ad0', '#a86af0', '#d8b0ff', '#ffffff'], junta: '#1e3a2a' },
  templo: { borda: ['#6a4020', '#a8783e', '#c0904e', '#d8aa6a', '#f6d8a0'], tampo: ['#8a5a2a', '#c8985a', '#d0a060', '#dcb070', '#f0c888'], metal: ['#3a2408', '#7a5214', '#c28a2a', '#f2c45a', '#fff1b0'], junta: '#8a5a2a' },
  passarela: { borda: ['#2a1a0e', '#5a3a1e', '#7a5230', '#8f6440', '#a87a50'], tampo: ['#2a1a0e', '#6a4428', '#7a5230', '#8f6440', '#a87a50'], metal: ['#262a32', '#5a6272', '#9aa6b8', '#d0dae8', '#ffffff'], junta: '#2a1a0e' },
  catacumba: { borda: ['#06070a', '#22262e', '#2e323a', '#3a3e48', '#484c58'], tampo: ['#0a0c10', '#2a2e38', '#323640', '#3a3e48', '#4a4e5a'], metal: ['#101828', '#3a4a6a', '#6a7aa0', '#a8b8e0', '#e8f0ff'], junta: '#1e2a2a' },
  treino: { borda: ['#2a1a0e', '#5a3a1e', '#7a5230', '#8f6440', '#a87a50'], tampo: ['#4a3a24', '#8f7046', '#a48254', '#b49262', '#c8a678'], metal: ['#3a0a0a', '#7a2a1c', '#a8402a', '#e3b04b', '#fff1b0'], junta: '#5a4a2a' },
  arquivo: { borda: ['#0e0a14', '#2a1e2a', '#3a2a36', '#4a3644', '#5a4252'], tampo: ['#100c18', '#2a2440', '#342c4c', '#3e3658', '#4a4268'], metal: ['#101040', '#3a4ab0', '#6a9aff', '#a8c4ff', '#ffffff'], junta: '#1a1430' },
}

/**
 * A mesa como peça do mundo: um estrado de pedra lavrada em pixel art, com
 * borda de blocos chanfrados, cantoneiras de metal com rebites, lajes grandes
 * no tampo e oclusão nas bordas internas.
 */
/** Altura do canvas da mesa em relação à mesa (a sobra é a frente do tampo). */
export const ESPESSURA_MESA = 1.06

/** Material do tampo da mesa: lajes de pedra, tábuas de madeira ou facetas de cristal. */
type MaterialMesa = 'pedra' | 'madeira' | 'cristal'
const MATERIAL_MESA: Partial<Record<Cenario, MaterialMesa>> = { salao: 'madeira', arquivo: 'madeira', laboratorio: 'cristal' }

/** Tom (0 a 4) de um pixel do tampo de tábuas: veio alongado, nós, juntas e pregos nas pontas. */
function tomMadeira(x: number, y: number) {
  const ALT = 9
  const linha = Math.floor(y / ALT), v = y % ALT
  const deslocado = x + ruido(linha, 3, 111) * 40
  const tabua = Math.floor(deslocado / 46), u = deslocado % 46
  if (v === ALT - 1 || u < 1) return 0
  if (v === 0) return 4
  if ((u > 2 && u < 4 || u > 42 && u < 44) && (v === 2 || v === ALT - 3)) return 4 // prego
  const id = linha * 31 + tabua
  const veio = fbm(x / 14, y / 1.6 + id * 3.1, 3, 113)
  // nó: anel escuro em volta de um ponto
  const nx = (ruido(id, 1, 117) * 30 + 8) | 0, ny = ALT / 2
  const dn = Math.hypot((u - nx) / 1.6, v - ny)
  if (ruido(id, 2, 119) > 0.86 && dn < 2.4) return dn < 1.1 ? 1 : 2
  let k = 2 + Math.floor(ruido(id, 4, 121) * 2)
  if (veio > 0.62) k = Math.max(1, k - 1)
  if (veio < 0.3) k = Math.min(4, k + 1)
  if (v === ALT - 2) k = Math.max(1, k - 1)
  return k
}

/** Tom (0 a 4) de um pixel do tampo de cristal: facetas com aresta clara, reflexo diagonal e veio luminoso. */
function tomCristal(x: number, y: number) {
  const { id, borda, cx, cy } = celula(x, y, 26, 131, 1.25)
  // só algumas arestas acendem; as outras são um corte escuro e fino
  const acesa = ruido(id, 5, 139) > 0.62
  if (borda < 0.9) return acesa ? 4 : 0
  // cada faceta tem um degradê próprio (a luz entra de um lado) e um reflexo diagonal largo
  const lado = Math.sign(cx * 0.8 + cy) || 1
  const reflexo = (((x * 0.7 - y) / 22 + ruido(id, 1, 133) * 2) % 3 + 3) % 3
  let k = 1 + Math.floor(ruido(id, 2, 135) * 2)
  if (borda < 2.2) k = lado > 0 ? 3 : 0
  else if (reflexo < 0.22) k = Math.min(3, k + 2)
  else if (reflexo < 0.5) k = Math.min(3, k + 1)
  if (ruido(x * 1.9, y * 1.7, 137) > 0.985) k = 4
  return k
}

export function pintarMesa(canvas: HTMLCanvasElement, cenario: Cenario) {
  const w = canvas.clientWidth, h = canvas.clientHeight
  if (!w || !h) return
  const s = escalaPixel(window.innerWidth)
  // o canvas é um pouco mais alto que a mesa (CSS): embaixo, a frente do tampo mostra a espessura
  const W = Math.ceil(w / s), Htot = Math.ceil(h / s), H = Math.round(Htot / ESPESSURA_MESA)
  canvas.width = W; canvas.height = Htot
  const c = canvas.getContext('2d')!
  c.clearRect(0, 0, W, Htot)
  const p = MESA[cenario]
  // frente do tampo: blocos mais escuros, junta vertical a cada bloco, quina clara em cima e sombra embaixo
  for (let y = H - 4; y < Htot; y++) for (let x = 0; x < W; x++) {
    const t = (y - (H - 4)) / Math.max(1, Htot - H + 4)
    const cantoX = Math.max(0, 8 - x, x - (W - 9))
    if (cantoX * cantoX + Math.max(0, y - (Htot - 8)) ** 2 > 64) continue
    const bloco = Math.floor((x + (y > H + 3 ? 7 : 0)) / 15)
    const junta = (x + (y > H + 3 ? 7 : 0)) % 15 === 0
    const tom = junta ? 0 : Math.max(0, Math.min(3, Math.floor(3 - t * 2.6 + ruido(bloco, 2, 101) * 0.9)))
    c.fillStyle = y === H - 4 ? p.borda[4] : p.borda[tom]; c.fillRect(x, y, 1, 1)
  }
  const B = Math.max(6, Math.min(10, Math.floor(Math.min(W, H) * 0.05)))
  const canto = 5
  const dentroCanto = (x: number, y: number) => {
    const cx = x < canto ? canto - x : x > W - 1 - canto ? x - (W - 1 - canto) : 0
    const cy = y < canto ? canto - y : y > H - 1 - canto ? y - (H - 1 - canto) : 0
    return cx * cx + cy * cy <= canto * canto
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!dentroCanto(x, y)) continue
    const naBorda = x < B || y < B || x >= W - B || y >= H - B
    if (naBorda) {
      // blocos da moldura, alongados ao longo da borda
      const horizontal = y < B || y >= H - B
      const u = horizontal ? x : y, v = horizontal ? (y < B ? y : H - 1 - y) : (x < B ? x : W - 1 - x)
      const bl = Math.floor(u / 12), lu = u % 12
      const tom = 1 + Math.floor(ruido(bl, horizontal ? 1 : 2, 91) * 3)
      let k = lu === 11 ? 0 : v === 0 ? 0 : v === 1 || lu === 0 ? Math.min(4, tom + 1) : v === B - 1 ? 0 : v === B - 2 ? Math.max(1, tom - 1) : tom
      if (k > 0 && ruido(x / 1.6, y / 1.6, 93) > 0.8) k = Math.max(1, k - 1)
      c.fillStyle = p.borda[k]; c.fillRect(x, y, 1, 1)
    } else {
      const mat = MATERIAL_MESA[cenario] ?? 'pedra'
      if (mat !== 'pedra') {
        const k = mat === 'madeira' ? tomMadeira(x - B, y - B) : tomCristal(x - B, y - B)
        c.fillStyle = mat === 'cristal' && k === 4 ? p.metal[3] : p.tampo[k]; c.fillRect(x, y, 1, 1)
        continue
      }
      // tampo: lajes grandes e irregulares, gastas no meio
      const { id, borda, cx, cy } = celula(x, y, 22, 95, 1.3)
      let k: number
      if (borda < 1.1) k = 0
      else {
        const tom = 2 + Math.floor(ruido(id, 1, 95) * 2)
        k = borda < 2.2 ? (cx > 0 || cy > 0 ? Math.min(4, tom + 1) : Math.max(1, tom - 1)) : tom
        if (fbm(x / 4, y / 4, 2, 97 + id) > 0.66) k = Math.max(1, k - 1)
        if (ruido(x * 1.7, y * 1.3, 98) > 0.94) k = Math.min(4, k + 1)
      }
      c.fillStyle = k === 0 && ruido(x / 2, y / 2, 99) > 0.6 ? p.junta : p.tampo[k]; c.fillRect(x, y, 1, 1)
    }
  }
  // medalhão entalhado no centro, com filete de metal (fica sob o flashcard)
  const mx = Math.floor(W / 2), my = Math.floor(H / 2), mr = Math.floor(Math.min(W, H) * 0.34)
  for (let y = my - mr - 2; y <= my + mr + 2; y++) for (let x = mx - Math.floor(mr * 1.4) - 2; x <= mx + Math.floor(mr * 1.4) + 2; x++) {
    const d = Math.hypot((x - mx) / 1.4, y - my)
    if (Math.abs(d - mr) < 0.8) { c.fillStyle = (x + y) % 2 ? p.metal[2] : p.metal[3]; c.fillRect(x, y, 1, 1) }
    else if (Math.abs(d - mr - 1.4) < 0.6) { c.fillStyle = p.borda[0]; c.fillRect(x, y, 1, 1) }
    else if (Math.abs(d - mr + 4) < 0.6 && Math.floor(Math.atan2(y - my, x - mx) * 12) % 2 === 0) { c.fillStyle = p.metal[1]; c.fillRect(x, y, 1, 1) }
  }
  // oclusão nas bordas internas do tampo
  for (let d = 0; d < 4; d++) {
    c.globalAlpha = 0.28 - d * 0.06; c.fillStyle = '#000'
    c.fillRect(B, B + d, W - 2 * B, 1); c.fillRect(B + d, B, 1, H - 2 * B)
    c.globalAlpha = 0.18 - d * 0.04
    c.fillRect(B, H - B - 1 - d, W - 2 * B, 1); c.fillRect(W - B - 1 - d, B, 1, H - 2 * B)
  }
  c.globalAlpha = 1
  // cantoneiras de metal com rebites
  const cantoneira = (ox: number, oy: number, sx: number, sy: number) => {
    for (let i = 0; i < B + 8; i++) for (let j = 0; j < B + 8; j++) {
      if (i >= B - 1 && j >= B - 1) continue
      const x = ox + sx * i, y = oy + sy * j
      if (!dentroCanto(x, y)) continue
      const k = i === 0 || j === 0 ? 4 : i === B + 7 || j === B + 7 ? 0 : (i + j) % 7 === 0 ? 3 : 2
      c.fillStyle = p.metal[k]; c.fillRect(x, y, 1, 1)
    }
    for (const [i, j] of [[3, 3], [B + 4, 3], [3, B + 4]]) { c.fillStyle = p.metal[4]; c.fillRect(ox + sx * i, oy + sy * j, 1, 1); c.fillStyle = p.metal[0]; c.fillRect(ox + sx * (i + 1), oy + sy * (j + 1), 1, 1) }
  }
  cantoneira(0, 0, 1, 1); cantoneira(W - 1, 0, -1, 1); cantoneira(0, H - 1, 1, -1); cantoneira(W - 1, H - 1, -1, -1)
  // rebites ao longo da borda
  for (let x = 20; x < W - 20; x += 16) for (const y of [Math.floor(B / 2), H - 1 - Math.floor(B / 2)]) { c.fillStyle = p.metal[4]; c.fillRect(x, y, 1, 1); c.fillStyle = p.metal[1]; c.fillRect(x + 1, y + 1, 1, 1) }
}

/** Ambiente HD-2D: bokeh suave, poeira na luz, brasas ou vaga-lumes. Baixa frequência. */
/** Sprite de poeira (miolo forte) ou de bokeh (disco suave), pintado uma vez por cor. */
const particulas = new Map<string, HTMLCanvasElement>()
function particula(cor: string, bokeh: boolean) {
  const chave = cor + (bokeh ? 'b' : 'p')
  let b = particulas.get(chave)
  if (!b) {
    b = document.createElement('canvas'); b.width = b.height = 48
    const c = b.getContext('2d')!
    const g = c.createRadialGradient(24, 24, 0, 24, 24, 24)
    g.addColorStop(0, `rgba(${cor},1)`); g.addColorStop(bokeh ? 0.8 : 0.4, `rgba(${cor},${bokeh ? 0.8 : 0.3})`); g.addColorStop(1, `rgba(${cor},0)`)
    c.fillStyle = g; c.fillRect(0, 0, 48, 48)
    particulas.set(chave, b)
  }
  return b
}

/** Clima do ato: o mesmo cenário em outra hora e tempo (dia, entardecer, noite com neblina, chuva). */
/** Cor da partícula ambiente de cada cena (brasas, pólen, esporos, poeira, faíscas, runas). */
const CORES_PARTICULA: Partial<Record<Cena, [string, string, number]>> = {
  covil: ['255,110,30', '255,220,120', 3], masmorra: ['255,130,50', '255,200,110', 3], campo: ['255,240,200', '210,255,150', 4],
  torre: ['255,240,250', '210,200,255', 3], forja: ['255,140,40', '255,230,140', 2], coliseu: ['255,225,180', '255,200,150', 3],
  jardim: ['255,200,230', '240,255,190', 2], laboratorio: ['120,255,210', '160,190,255', 3], caverna: ['170,255,170', '200,150,255', 2],
  templo: ['255,225,140', '255,250,210', 3], passarela: ['255,255,255', '220,235,255', 2], catacumba: ['170,200,255', '230,240,255', 3],
  treino: ['255,240,200', '230,210,150', 3], arquivo: ['150,180,255', '255,220,140', 3],
}
function corDaParticula(cena: Cena, i: number) {
  const k = CORES_PARTICULA[cena]
  if (!k) return '255,215,150'
  return i % k[2] === 0 ? k[1] : k[0]
}

export type Clima = 'dia' | 'entardecer' | 'noite' | 'chuva'
export const climaDoAndar = (andar: number): Clima => (['dia', 'entardecer', 'noite', 'chuva'] as const)[Math.floor((andar - 1) / 3) % 4]

export function criarAmbiente(canvas: HTMLCanvasElement, cena: Cena, clima: Clima = 'dia') {
  const c = canvas.getContext('2d')
  if (!c) return () => {}
  // poeira e bokeh são luz difusa: no celular, 1 pixel do canvas por pixel CSS basta
  const dpr = matchMedia('(pointer: coarse)').matches ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
  const ajustar = () => { canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr) }
  ajustar()
  const n = cena === 'masmorra' || cena === 'covil' || cena === 'forja' ? 38 : cena === 'biblioteca' ? 30 : cena === 'passarela' ? 44 : 32
  const sobe = cena === 'masmorra' || cena === 'covil' || cena === 'forja' || cena === 'caverna' || cena === 'laboratorio' || cena === 'catacumba'
  const parts = Array.from({ length: n }, (_, i) => ({ x: Math.random(), y: Math.random(), v: 0.2 + Math.random() * 0.8, f: Math.random() * 6, i, bokeh: i % 5 === 0 }))
  const luzes = LUZES[cena]
  // chuva: gotas finas em diagonal; noite: vaga-lumes esverdeados
  const gotas = clima === 'chuva' ? Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), v: 0.9 + Math.random() * 0.8, l: 0.02 + Math.random() * 0.025 })) : []
  const vagalumes = clima === 'noite' && cena !== 'biblioteca' ? Array.from({ length: 18 }, (_, i) => ({ x: Math.random(), y: 0.35 + Math.random() * 0.6, f: Math.random() * 6, i })) : []
  let quadro = 0, ultimo = 0, t = 0
  const passo = (agora: number) => {
    quadro = requestAnimationFrame(passo)
    if (agora - ultimo < 40 || document.hidden) return
    const dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora; t += dt
    const w = canvas.width, h = canvas.height
    c.clearRect(0, 0, w, h)
    c.globalCompositeOperation = 'lighter'
    // tremor das chamas
    for (const [x, y, cor, r] of luzes) {
      if (cor.startsWith('255,236') || cor.startsWith('150') || cor.startsWith('110')) continue
      const tremor = 0.8 + Math.sin(t * 8 + x * 20) * 0.1 + Math.sin(t * 13 + y * 9) * 0.08
      const R = Math.max(w, h) * r * 0.7 * tremor
      c.globalAlpha = 0.3 * tremor
      c.drawImage(particula(cor, true), x * w - R, y * h - R, R * 2, R * 2)
      c.globalAlpha = 1
    }
    for (const p of parts) {
      if (sobe) { p.y -= p.v * dt * (cena === 'covil' || cena === 'forja' ? 0.09 : 0.06); p.x += Math.sin(t + p.f) * dt * 0.01 }
      else if (cena === 'passarela') { p.x += (0.08 + p.v * 0.08) * dt; p.y += Math.sin(t * 1.4 + p.f) * dt * 0.02 }
      else if (cena === 'jardim' || cena === 'treino') { p.x += (0.012 + Math.sin(t * 0.7 + p.f) * 0.014) * dt; p.y += (0.012 + p.v * 0.01) * dt }
      else if (cena === 'torre') { p.x += (0.03 + p.v * 0.03) * dt; p.y += Math.sin(t * 0.8 + p.f) * dt * 0.01 }
      else if (cena === 'campo') { p.x += (0.006 + Math.sin(t * 0.6 + p.f) * 0.01) * dt; p.y += (0.004 + Math.cos(t * 0.5 + p.f) * 0.008) * dt }
      else { p.y += p.v * dt * 0.008; p.x += Math.sin(t * 0.3 + p.f) * dt * 0.006 }
      if (p.y < -0.05) p.y = 1.05; if (p.y > 1.05) p.y = -0.05; if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05
      const brilho = 0.5 + 0.5 * Math.sin(t * 1.6 + p.f * 2)
      const cor = corDaParticula(cena, p.i)
      const r = p.bokeh ? (14 + p.v * 22) * dpr : (1.6 + p.v * 1.6) * dpr
      const a = p.bokeh ? 0.12 * brilho : 0.75 * brilho
      c.globalAlpha = a
      c.drawImage(particula(cor, p.bokeh), p.x * w - r, p.y * h - r, r * 2, r * 2)
      c.globalAlpha = 1
    }
    for (const v of vagalumes) {
      const x = (v.x + Math.sin(t * 0.4 + v.f) * 0.03) * w, y = (v.y + Math.cos(t * 0.5 + v.f * 2) * 0.03) * h
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + v.f * 3))
      const r = 6 * dpr
      c.globalAlpha = a
      c.drawImage(particula('200,255,140', false), x - r, y - r, r * 2, r * 2)
      c.globalAlpha = 1
    }
    c.globalCompositeOperation = 'source-over'
    if (gotas.length) {
      c.strokeStyle = 'rgba(200, 222, 255, .55)'; c.lineWidth = Math.max(1, dpr)
      c.beginPath()
      for (const g of gotas) {
        g.y += g.v * dt; g.x -= g.v * dt * 0.18
        if (g.y > 1.05) { g.y = -0.05; g.x = Math.random() * 1.2 }
        if (g.x < -0.05) g.x += 1.1
        c.moveTo(g.x * w, g.y * h); c.lineTo((g.x + g.l * 0.18) * w, (g.y - g.l) * h)
      }
      c.stroke()
    }
  }
  quadro = requestAnimationFrame(passo)
  window.addEventListener('resize', ajustar)
  return () => { cancelAnimationFrame(quadro); window.removeEventListener('resize', ajustar) }
}

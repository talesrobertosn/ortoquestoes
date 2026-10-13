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
function celula(x: number, y: number, tam: number, s: number, esticar = 1) {
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
function pedras(c: Ctx, x0: number, y0: number, w: number, h: number, tam: number, tons: string[], junta: string, musgo: string | null, s: number, mascara?: (x: number, y: number) => boolean) {
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
function muro(c: Ctx, x0: number, y0: number, w: number, h: number, semente: number, tons = ['#2a2620', '#4c463b', '#6e6656', '#8f8672', '#aaa08a']) {
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
  for (let i = 0; i < w / 6; i++) {
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

/* ------------------------------------------------------------ Públicas */

const LUZES: Record<Cena, Array<[number, number, string, number]>> = {
  // [x, y, cor, raio relativo]
  campo: [[0.12, 0.05, '255,236,190', 0.55], [0.1, 0.34, '255,170,80', 0.12], [0.9, 0.34, '255,170,80', 0.12], [0.1, 0.74, '255,170,80', 0.12], [0.9, 0.74, '255,170,80', 0.12]],
  masmorra: [[0.08, 0.3, '255,150,60', 0.2], [0.92, 0.3, '255,150,60', 0.2], [0.08, 0.72, '255,150,60', 0.2], [0.92, 0.72, '255,150,60', 0.2], [0.5, 0.15, '110,150,230', 0.4]],
  salao: [[0.08, 0.34, '255,180,90', 0.18], [0.92, 0.34, '255,180,90', 0.18], [0.08, 0.8, '255,180,90', 0.18], [0.92, 0.8, '255,180,90', 0.18], [0.5, 0.18, '255,215,150', 0.45]],
  biblioteca: [[0.16, 0.56, '255,180,90', 0.28], [0.86, 0.55, '255,180,90', 0.26], [0.5, 0.25, '150,180,240', 0.35]],
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
}

/**
 * A mesa como peça do mundo: um estrado de pedra lavrada em pixel art, com
 * borda de blocos chanfrados, cantoneiras de metal com rebites, lajes grandes
 * no tampo e oclusão nas bordas internas.
 */
export function pintarMesa(canvas: HTMLCanvasElement, cenario: Cenario) {
  const w = canvas.clientWidth, h = canvas.clientHeight
  if (!w || !h) return
  const s = escalaPixel(window.innerWidth)
  const W = Math.ceil(w / s), H = Math.ceil(h / s)
  canvas.width = W; canvas.height = H
  const c = canvas.getContext('2d')!
  c.clearRect(0, 0, W, H)
  const p = MESA[cenario]
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
export type Clima = 'dia' | 'entardecer' | 'noite' | 'chuva'
export const climaDoAndar = (andar: number): Clima => (['dia', 'entardecer', 'noite', 'chuva'] as const)[Math.floor((andar - 1) / 3) % 4]

export function criarAmbiente(canvas: HTMLCanvasElement, cena: Cena, clima: Clima = 'dia') {
  const c = canvas.getContext('2d')
  if (!c) return () => {}
  // poeira e bokeh são luz difusa: no celular, 1 pixel do canvas por pixel CSS basta
  const dpr = matchMedia('(pointer: coarse)').matches ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
  const ajustar = () => { canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr) }
  ajustar()
  const n = cena === 'masmorra' ? 34 : cena === 'biblioteca' ? 30 : 32
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
      const g = c.createRadialGradient(x * w, y * h, 0, x * w, y * h, R)
      g.addColorStop(0, `rgba(${cor},${0.3 * tremor})`); g.addColorStop(1, `rgba(${cor},0)`)
      c.fillStyle = g; c.fillRect(x * w - R, y * h - R, R * 2, R * 2)
    }
    for (const p of parts) {
      if (cena === 'masmorra') { p.y -= p.v * dt * 0.06; p.x += Math.sin(t + p.f) * dt * 0.01 }
      else if (cena === 'campo') { p.x += (0.006 + Math.sin(t * 0.6 + p.f) * 0.01) * dt; p.y += (0.004 + Math.cos(t * 0.5 + p.f) * 0.008) * dt }
      else { p.y += p.v * dt * 0.008; p.x += Math.sin(t * 0.3 + p.f) * dt * 0.006 }
      if (p.y < -0.05) p.y = 1.05; if (p.y > 1.05) p.y = -0.05; if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05
      const brilho = 0.5 + 0.5 * Math.sin(t * 1.6 + p.f * 2)
      const cor = cena === 'masmorra' ? (p.i % 3 ? '255,130,50' : '255,200,110') : cena === 'campo' ? (p.i % 4 === 0 ? '210,255,150' : '255,240,200') : '255,215,150'
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

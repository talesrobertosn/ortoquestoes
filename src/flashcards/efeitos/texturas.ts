/**
 * Texturas procedurais (ruído e células de Voronoi), geradas uma vez por
 * tamanho de tela. É o que faz pedra parecer pedra e madeira parecer madeira
 * sem baixar nenhuma imagem: cada laje tem altura, chanfro, juntas escuras
 * (oclusão) e luz vinda de cima à esquerda.
 */

/** Hash inteiro → [0, 1). */
function hash(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const suave = (t: number) => t * t * (3 - 2 * t)

/** Ruído de valor 2D contínuo. */
export function ruido(x: number, y: number, s = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s)
  const u = suave(xf), v = suave(yf)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Ruído fractal (várias oitavas). */
export function fbm(x: number, y: number, oitavas = 4, s = 0): number {
  let soma = 0, amp = 0.5, f = 1, norma = 0
  for (let i = 0; i < oitavas; i++) { soma += amp * ruido(x * f, y * f, s + i * 17); norma += amp; amp *= 0.5; f *= 2.03 }
  return soma / norma
}

export type Cor = [number, number, number]
export const hex = (h: string): Cor => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const mix = (a: Cor, b: Cor, t: number): Cor => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

export interface OpcoesPedras {
  /** Tamanho médio de cada laje, em pixels da textura. */
  celula: number
  /** Alongamento horizontal (1 = lajes redondas; 2 = blocos de muro). */
  esticar?: number
  /** Tons das lajes. */
  tons: string[]
  /** Cor das juntas (o fundo entre as lajes). */
  junta: string
  /** Cor do musgo nas juntas (null = sem musgo). */
  musgo?: string | null
  /** Largura da junta e do chanfro. */
  chanfro?: number
  /** Brilho especular (0 = fosco, 1 = pedra molhada). */
  brilho?: number
  semente?: number
  rachaduras?: number
}

/**
 * Pavimento de lajes irregulares (Voronoi). Calcula a altura de cada pixel
 * (chanfro até a junta + ruído), tira a normal por diferença finita e ilumina
 * com luz direcional; as juntas ficam escuras (oclusão ambiente).
 */
export function pintarPedras(w: number, h: number, o: OpcoesPedras): ImageData {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h))
  const s = o.semente ?? 1
  const est = o.esticar ?? 1
  const cel = o.celula
  const chanfro = o.chanfro ?? cel * 0.12
  const tons = o.tons.map(hex), junta = hex(o.junta), musgo = o.musgo ? hex(o.musgo) : null
  const brilho = o.brilho ?? 0.15
  const altura = new Float32Array(w * h)
  const celulaDe = new Int32Array(w * h)
  const cw = cel * est, ch = cel
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = x / cw, gy = y / ch
      const ix = Math.floor(gx), iy = Math.floor(gy)
      let d1 = 1e9, d2 = 1e9, id = 0
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const cx = ix + i, cy = iy + j
        const px = cx + 0.15 + 0.7 * hash(cx, cy, s), py = cy + 0.15 + 0.7 * hash(cx, cy, s + 7)
        const dx = (gx - px) * est, dy = gy - py
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < d1) { d2 = d1; d1 = d; id = cx * 7919 + cy } else if (d < d2) d2 = d
      }
      const borda = (d2 - d1) * ch // distância à junta, em pixels
      const n = fbm(x / 18, y / 18, 3, s)
      let alt = Math.min(1, borda / chanfro)
      alt = borda < chanfro * 0.25 ? 0 : suave(alt)
      // cada laje tem uma inclinação e altura próprias
      const inc = (hash(id, 3, s) - 0.5) * 0.25
      altura[y * w + x] = alt * (0.75 + 0.25 * n) + (alt > 0 ? inc * (x / w) + hash(id, 5, s) * 0.15 : 0)
      celulaDe[y * w + x] = id
    }
  }
  const img = new ImageData(w, h)
  const L = [-0.55, -0.65, 0.52] // luz de cima à esquerda
  const nl = Math.hypot(L[0], L[1], L[2]); L[0] /= nl; L[1] /= nl; L[2] /= nl
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x
      const a = altura[k]
      const ax = altura[y * w + Math.min(w - 1, x + 1)] - altura[y * w + Math.max(0, x - 1)]
      const ay = altura[Math.min(h - 1, y + 1) * w + x] - altura[Math.max(0, y - 1) * w + x]
      let nx = -ax * 2.4, ny = -ay * 2.4, nz = 1
      const nn = Math.hypot(nx, ny, nz); nx /= nn; ny /= nn; nz /= nn
      const dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2])
      // especular (meio-vetor entre luz e olho)
      const hx = L[0], hy = L[1], hz = L[2] + 1, hn = Math.hypot(hx, hy, hz)
      const esp = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hn), 24) * brilho
      const id = celulaDe[k]
      const base = tons[Math.floor(hash(id, 11, s) * tons.length)]
      const n2 = fbm(x / 6, y / 6, 3, s + 3)
      let cor: Cor
      if (a <= 0.001) {
        cor = musgo && fbm(x / 9, y / 9, 2, s + 9) > 0.45 ? mix(junta, musgo, 0.75) : junta
        cor = mix(cor, [0, 0, 0], 0.25)
      } else {
        cor = mix(base, [255, 255, 255], (n2 - 0.5) * 0.18 + 0.02)
        cor = mix(cor, [0, 0, 0], Math.max(0, 0.5 - n2) * 0.25)
        // oclusão perto da junta
        const ao = Math.min(1, a * 1.6)
        cor = [cor[0] * (0.45 + 0.55 * ao), cor[1] * (0.45 + 0.55 * ao), cor[2] * (0.45 + 0.55 * ao)]
        if (musgo && a < 0.5 && fbm(x / 7, y / 7, 2, s + 13) > 0.62) cor = mix(cor, musgo, 0.45)
      }
      const luz = 0.38 + 0.82 * dif
      img.data[k * 4] = Math.min(255, cor[0] * luz + esp * 255)
      img.data[k * 4 + 1] = Math.min(255, cor[1] * luz + esp * 255)
      img.data[k * 4 + 2] = Math.min(255, cor[2] * luz + esp * 240)
      img.data[k * 4 + 3] = 255
    }
  }
  // rachaduras finas
  const rach = o.rachaduras ?? 0
  for (let r = 0; r < rach; r++) {
    let x = hash(r, 1, s) * w, y = hash(r, 2, s) * h
    let ang = hash(r, 3, s) * Math.PI * 2
    const passos = 20 + Math.floor(hash(r, 4, s) * 40)
    for (let p = 0; p < passos; p++) {
      ang += (hash(r, p, s + 5) - 0.5) * 0.9
      x += Math.cos(ang) * 1.4; y += Math.sin(ang) * 1.4
      const xi = Math.round(x), yi = Math.round(y)
      if (xi < 1 || yi < 1 || xi >= w - 1 || yi >= h - 1) break
      const k = (yi * w + xi) * 4
      img.data[k] *= 0.45; img.data[k + 1] *= 0.45; img.data[k + 2] *= 0.45
      const k2 = ((yi + 1) * w + xi) * 4 // borda iluminada embaixo da fenda
      img.data[k2] = Math.min(255, img.data[k2] * 1.15); img.data[k2 + 1] = Math.min(255, img.data[k2 + 1] * 1.15); img.data[k2 + 2] = Math.min(255, img.data[k2 + 2] * 1.12)
    }
  }
  return img
}

/** Madeira: veios alongados com nós, fosca. */
export function pintarMadeira(w: number, h: number, tons: [string, string, string], semente = 3, tabua = 0): ImageData {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h))
  const [c0, c1, c2] = tons.map(hex) as [Cor, Cor, Cor]
  const img = new ImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const linha = tabua ? Math.floor(y / tabua) : 0
      const yy = tabua ? y - linha * tabua : y
      const desloc = hash(linha, 1, semente) * 400
      const t = fbm((x + desloc) / 160, yy / 9, 4, semente + linha)
      const veio = Math.abs(Math.sin((t * 9 + (x + desloc) / 300) * Math.PI))
      let cor = mix(c0, c1, suave(veio))
      cor = mix(cor, c2, Math.max(0, fbm((x + desloc) / 40, yy / 40, 2, semente + 7) - 0.55) * 1.6)
      let luz = 0.9 + (fbm(x / 3, y / 3, 1, semente + 9) - 0.5) * 0.12
      if (tabua) { const borda = Math.min(yy, tabua - 1 - yy); luz *= borda < 1 ? 0.45 : borda < 3 ? 0.8 + borda * 0.06 : 1; if (yy < 2) luz *= 1.08 }
      const k = (y * w + x) * 4
      img.data[k] = Math.min(255, cor[0] * luz); img.data[k + 1] = Math.min(255, cor[1] * luz); img.data[k + 2] = Math.min(255, cor[2] * luz); img.data[k + 3] = 255
    }
  }
  return img
}

/** Grama vista de cima: manchas e folhas em várias camadas de verde. */
export function pintarGrama(w: number, h: number, semente = 5): ImageData {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h))
  const escuro = hex('#22411c'), medio = hex('#3f6b2c'), claro = hex('#7aa449'), seco = hex('#8f8a4a')
  const img = new ImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const m = fbm(x / 70, y / 70, 3, semente)
      const f = fbm(x / 3.2, y / 1.6, 2, semente + 4)
      let cor = mix(escuro, medio, suave(Math.min(1, m * 1.3)))
      cor = mix(cor, claro, Math.max(0, f - 0.55) * 1.8)
      cor = mix(cor, seco, Math.max(0, fbm(x / 120, y / 120, 2, semente + 8) - 0.62) * 1.5)
      const luz = 0.8 + f * 0.35
      const k = (y * w + x) * 4
      img.data[k] = Math.min(255, cor[0] * luz); img.data[k + 1] = Math.min(255, cor[1] * luz); img.data[k + 2] = Math.min(255, cor[2] * luz); img.data[k + 3] = 255
    }
  }
  return img
}

/** Ladrilhos regulares de mármore polido, em xadrez, com veios. */
export function pintarMarmore(w: number, h: number, lado: number, tons: [string, string], semente = 9): ImageData {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h))
  const a = hex(tons[0]), b = hex(tons[1])
  const img = new ImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ix = Math.floor(x / lado), iy = Math.floor(y / lado)
      const lx = x - ix * lado, ly = y - iy * lado
      let cor = (ix + iy) % 2 ? a : b
      const veio = Math.abs(Math.sin((x + y) / 26 + fbm(x / 40, y / 40, 4, semente) * 9))
      cor = mix(cor, [255, 255, 255], Math.pow(1 - veio, 6) * 0.35)
      cor = mix(cor, [0, 0, 0], (fbm(x / 12, y / 12, 2, semente + 2) - 0.5) * 0.2)
      const borda = Math.min(lx, ly, lado - 1 - lx, lado - 1 - ly)
      let luz = borda < 1 ? 0.35 : borda < 3 ? 0.85 : 1
      if (lx < 2 || ly < 2) luz *= 1.12
      const k = (y * w + x) * 4
      img.data[k] = Math.min(255, cor[0] * luz); img.data[k + 1] = Math.min(255, cor[1] * luz); img.data[k + 2] = Math.min(255, cor[2] * luz); img.data[k + 3] = 255
    }
  }
  return img
}

/** Coloca uma ImageData gerada em baixa resolução num canvas, ampliada com suavização. */
export function desenharTextura(ctx: CanvasRenderingContext2D, img: ImageData, x: number, y: number, w: number, h: number) {
  const tmp = document.createElement('canvas')
  tmp.width = img.width; tmp.height = img.height
  tmp.getContext('2d')!.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(tmp, x, y, w, h)
}

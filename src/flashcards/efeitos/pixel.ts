/**
 * Motor de pixel art na resolução nativa (sem filtro sobre imagem lisa).
 * Desenha formas direto na grade de pixels, sombreia cada material com uma
 * rampa curta de cores (claro, médio, sombra, escuro) a partir do volume da
 * forma e da luz de cima à esquerda, aplica pontilhado (dithering) só na
 * transição entre tons e contorna com a cor escura do próprio material
 * ("selout"), como se faz à mão. Depois, detalhes pixel a pixel.
 */

export interface Material { rampa: string[]; contorno: string }

interface Celula { m: number; luz: number; fixo?: string; f: number }

/** Matriz de Bayer 4×4 para o pontilhado. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)

export class Grade {
  readonly w: number
  readonly h: number
  private c: (Celula | null)[]
  private mats: Material[] = []
  /** Número da forma atual: cada forma nova fica na frente das anteriores. */
  private forma = 0
  /** Direção da luz (normalizada): de cima à esquerda. */
  luz = { x: -0.55, y: -0.75, z: 0.62 }

  constructor(w: number, h: number) { this.w = w; this.h = h; this.c = new Array(w * h).fill(null) }

  material(m: Material): number { this.mats.push(m); return this.mats.length - 1 }

  private por(x: number, y: number, m: number, nx: number, ny: number, nz: number, bonus = 0) {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const n = Math.hypot(nx, ny, nz) || 1
    const dif = Math.max(0, (nx * this.luz.x + ny * this.luz.y + nz * this.luz.z) / n)
    this.c[y * this.w + x] = { m, luz: Math.min(1, dif + bonus), f: this.forma }
  }

  /** Elipse com volume de esfera (bojo). `achatar` < 1 deixa a forma mais chapada. */
  elipse(cx: number, cy: number, rx: number, ry: number, m: number, achatar = 1, bonus = 0) {
    this.forma++
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry
      const d = dx * dx + dy * dy
      if (d > 1) continue
      const nz = Math.sqrt(1 - d) * achatar + (1 - achatar) * 0.7
      this.por(x, y, m, dx, dy, nz, bonus)
    }
  }

  /** Polígono com volume calculado a partir da distância à borda (bisel arredondado). */
  poligono(pts: Array<[number, number]>, m: number, bisel = 3, bonus = 0) {
    this.forma++
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
    const dentro = (x: number, y: number) => {
      let r = false
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j]
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r
      }
      return r
    }
    const distBorda = (x: number, y: number) => {
      let melhor = 1e9, gx = 0, gy = 0
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [ax, ay] = pts[j], [bx, by] = pts[i]
        const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)))
        const px = ax + vx * t, py = ay + vy * t, d = Math.hypot(x - px, y - py)
        if (d < melhor) { melhor = d; gx = x - px; gy = y - py }
      }
      return { d: melhor, gx, gy }
    }
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      if (!dentro(x + 0.5, y + 0.5)) continue
      const { d, gx, gy } = distBorda(x + 0.5, y + 0.5)
      const t = Math.min(1, d / bisel)
      // perto da borda a normal aponta para fora; no miolo, para a frente
      const n = Math.hypot(gx, gy) || 1
      this.por(x, y, m, (-gx / n) * (1 - t), (-gy / n) * (1 - t), 0.35 + t * 0.65, bonus)
    }
  }

  retangulo(x0: number, y0: number, w: number, h: number, m: number, bisel = 2, bonus = 0) {
    this.poligono([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], m, bisel, bonus)
  }

  /** Pixel de cor fixa (detalhe à mão): olhos, brilhos, rebites. */
  ponto(x: number, y: number, cor: string) {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.c[y * this.w + x] = { m: -1, luz: 1, fixo: cor, f: this.c[y * this.w + x]?.f ?? this.forma }
  }

  /** Linha de pixels (Bresenham) de cor fixa. */
  linha(x0: number, y0: number, x1: number, y1: number, cor: string) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
    let e = dx + dy
    for (;;) {
      this.ponto(x0, y0, cor)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * e
      if (e2 >= dy) { e += dy; x0 += sx }
      if (e2 <= dx) { e += dx; y0 += sy }
    }
  }

  /** Apaga pixels (recortes, buracos). */
  apagar(x: number, y: number) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = null }

  ocupado(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.c[y * this.w + x] !== null }

  /** Escurece um tom (cavidade, sombra de oclusão) sem trocar o material. */
  sombrear(x: number, y: number, k: number) {
    const cel = this.c[y * this.w + x]
    if (cel && cel.m >= 0) cel.luz = Math.max(0, cel.luz - k)
  }

  /** Converte para cores: rampa por material, pontilhado nas transições e contorno colorido. */
  pintar(canvas: HTMLCanvasElement, contornoExterno = true) {
    canvas.width = this.w; canvas.height = this.h
    const ctx = canvas.getContext('2d')!
    const img = ctx.createImageData(this.w, this.h)
    const cores = new Array<string | null>(this.w * this.h).fill(null)
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const cel = this.c[y * this.w + x]
      if (!cel) continue
      if (cel.fixo) { cores[y * this.w + x] = cel.fixo; continue }
      const r = this.mats[cel.m].rampa
      // quantiza a luz na rampa com pontilhado ordenado
      // pontilhado só numa faixa estreita de transição, como na pixel art à mão
      const v = cel.luz * (r.length - 1)
      const base = Math.floor(v), frac = v - base
      const sobe = frac > 0.62 || (frac > 0.38 && BAYER[(y % 4) * 4 + (x % 4)] < (frac - 0.38) / 0.24)
      let k = Math.min(r.length - 1, base + (sobe ? 1 : 0))
      // contorno interno: borda de uma forma da frente sobre outra de trás
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const vz = this.c[(y + dy) * this.w + (x + dx)]
        if (x + dx < 0 || x + dx >= this.w || y + dy < 0 || y + dy >= this.h || !vz) continue
        if (vz.f < cel.f && vz.m !== cel.m) { k = 0; break }
        if (vz.f < cel.f && vz.m === cel.m && dy >= 0) { k = Math.max(0, k - 1); break }
      }
      cores[y * this.w + x] = r[r.length - 1 - k]
    }
    // contorno: pixel vazio colado num ocupado recebe a cor de contorno do vizinho
    if (contornoExterno) {
      const borda: Array<[number, string]> = []
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        if (this.c[y * this.w + x]) continue
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const vz = this.c[(y + dy) * this.w + (x + dx)]
          if (x + dx < 0 || x + dx >= this.w || y + dy < 0 || y + dy >= this.h || !vz) continue
          borda.push([y * this.w + x, vz.m >= 0 ? this.mats[vz.m].contorno : '#140c10'])
          break
        }
      }
      borda.forEach(([i, cor]) => { cores[i] = cor })
    }
    cores.forEach((cor, i) => {
      if (!cor) return
      const n = parseInt(cor.slice(1), 16)
      img.data[i * 4] = n >> 16; img.data[i * 4 + 1] = (n >> 8) & 255; img.data[i * 4 + 2] = n & 255; img.data[i * 4 + 3] = 255
    })
    ctx.putImageData(img, 0, 0)
  }
}

/** Rampas de material (do claro ao escuro) e contorno. */
export const MAT = {
  gesso: { rampa: ['#fbf6e8', '#ddd3bb', '#ab9f86', '#6f6553'], contorno: '#2b2219' },
  pedra: { rampa: ['#c8c4b4', '#97927f', '#6a6656', '#433f35'], contorno: '#1d1a15' },
  aco: { rampa: ['#f4f8ff', '#b9c6d8', '#7a889f', '#465066'], contorno: '#161a26' },
  ouro: { rampa: ['#fff1b0', '#f2c45a', '#c28a2a', '#7a5214'], contorno: '#3a2408' },
  azul: { rampa: ['#7fb2f0', '#3f78c8', '#24508f', '#15305c'], contorno: '#0b1730' },
  vermelho: { rampa: ['#f07a5a', '#c43a24', '#8a1e14', '#4f0e0a'], contorno: '#2a0606' },
  couro: { rampa: ['#b98250', '#8a5530', '#5e351a', '#3a1f0e'], contorno: '#1e0f06' },
  escama: { rampa: ['#fff0a0', '#e2b444', '#a8781e', '#5e3c0c'], contorno: '#2a1806' },
  ventre: { rampa: ['#fff8dc', '#f0dca0', '#c8aa6a', '#8a6e3a'], contorno: '#3a2a10' },
  musgo: { rampa: ['#9cc65a', '#6a9a34', '#40691e', '#24400e'], contorno: '#122008' },
  pele: { rampa: ['#ffe2c4', '#f2b98e', '#c98a62', '#8f5a3c'], contorno: '#3a1e12' },
  cabelo: { rampa: ['#c98a4a', '#8f5428', '#5e3216', '#3a1d0a'], contorno: '#1e0e04' },
  madeira: { rampa: ['#c08a54', '#8f5f34', '#61391c', '#3c210e'], contorno: '#1e1006' },
} satisfies Record<string, Material>

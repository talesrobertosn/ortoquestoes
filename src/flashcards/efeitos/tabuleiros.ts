/**
 * Três arquiteturas de tabuleiro, escolhidas pelo bioma. O lugar das cartas,
 * das alternativas e dos botões não muda: só o objeto sobre o qual a luta
 * acontece.
 *
 *   mesa       objeto físico (Hearthstone): moldura grossa, tampo de lajes ou
 *              tábuas, frente com espessura visível, cantoneiras de metal;
 *   chao       arena integrada ao chão do cenário (HD-2D): sem moldura, o
 *              próprio piso do bioma aparece, só com a marcação da arena;
 *   plataforma suspensa (Torre, passarela, covil): borda irregular de rocha
 *              ou madeira e a parte de baixo pendurada sobre o vazio.
 *
 * Pintado uma vez por tamanho, em pixel art (ver pintura.ts).
 */
import type { Cenario } from '../motor/bestiario'
import { celula, escalaPixel, pintarMesa } from './pintura'
import { fbm, ruido } from './texturas'

import { TABULEIRO } from './ambiente'
export { TABULEIRO, type Tabuleiro } from './ambiente'

type Ctx = CanvasRenderingContext2D
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)]
function px(c: Ctx, x: number, y: number, cor: string, a = 1) {
  if (a < 1) { c.globalAlpha = a; c.fillStyle = cor; c.fillRect(x | 0, y | 0, 1, 1); c.globalAlpha = 1; return }
  c.fillStyle = cor; c.fillRect(x | 0, y | 0, 1, 1)
}

/* ------------------------------------------------------------ chão integrado */

interface EstiloChao { linha: string; luz: string; sombra: string; tipo: 'pedrinhas' | 'sulco' | 'cristal' }
const CHAO: Partial<Record<Cenario, EstiloChao>> = {
  campo: { linha: '#b4ae94', luz: '#e0dcc8', sombra: '#3a3a2c', tipo: 'pedrinhas' },
  jardim: { linha: '#cfc8b0', luz: '#f0ece0', sombra: '#4a4a40', tipo: 'pedrinhas' },
  treino: { linha: '#8f7046', luz: '#c8a678', sombra: '#3a2a16', tipo: 'sulco' },
  coliseu: { linha: '#8a6440', luz: '#f0d0a0', sombra: '#5a3e24', tipo: 'sulco' },
  templo: { linha: '#c28a2a', luz: '#fff1b0', sombra: '#6a4020', tipo: 'sulco' },
  caverna: { linha: '#7a3ad0', luz: '#d8b0ff', sombra: '#1a1028', tipo: 'cristal' },
}

function pintarChao(c: Ctx, W: number, H: number, cenario: Cenario) {
  const e = CHAO[cenario] ?? CHAO.campo!
  const cx = W / 2, cy = H / 2, rx = W * 0.47, ry = H * 0.45
  // sombra suave no miolo: separa a carta do piso sem esconder o cenário
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    if (d < 1) { const a = 0.22 * (1 - d) ** 0.6; if (bayer(x, y) < a * 2.2) px(c, x, y, e.sombra, 0.55) }
  }
  // o anel da arena
  for (let k = 0; k < 2; k++) {
    const r1 = 1 - k * 0.06
    const passos = Math.ceil(2 * Math.PI * Math.max(rx, ry) * r1 * 1.6)
    for (let i = 0; i < passos; i++) {
      const a = (i / passos) * 2 * Math.PI
      const x = cx + Math.cos(a) * rx * r1, y = cy + Math.sin(a) * ry * r1
      if (e.tipo === 'pedrinhas') {
        if (k === 1) continue
        // faixa de lajotas: 5 pixels de largura, com junta escura, chanfro claro em cima e sombra embaixo
        for (let d = -2; d <= 2; d++) {
          const X = x + Math.cos(a) * d, Y = y + Math.sin(a) * d * 0.9
          const { borda, id } = celula(X, Y, 6, 31)
          const cor = borda < 1 ? e.sombra : d === -2 ? e.luz : d === 2 ? e.sombra : ruido(id, 1, 33) > 0.45 ? e.luz : e.linha
          px(c, X, Y, cor)
        }
      } else if (e.tipo === 'sulco') {
        px(c, x, y, e.sombra); px(c, x, y + 1, k === 0 ? e.luz : e.linha, 0.8)
      } else {
        px(c, x, y, k === 0 ? e.linha : e.sombra); if (k === 0 && i % 9 === 0) { px(c, x, y - 1, e.luz); px(c, x, y - 2, e.luz, 0.6) }
      }
    }
  }
  // marcas nos quatro pontos cardeais e, no templo e na caverna, runas pequenas no anel
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 2 * Math.PI
    const x = cx + Math.cos(a) * rx * 0.97, y = cy + Math.sin(a) * ry * 0.97
    const forte = i % 4 === 0
    const t = forte ? 3 : 1
    for (let d = -t; d <= t; d++) px(c, x + Math.cos(a) * d, y + Math.sin(a) * d, forte ? e.luz : e.linha)
  }
  // pequenos detalhes do piso perto da borda (seixos, folhas, areia remexida)
  for (let i = 0; i < W * 0.6; i++) {
    const x = (ruido(i, 3, 41) * W) | 0, y = (ruido(i, 5, 43) * H) | 0
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    if (d > 0.82 && d < 1.25) px(c, x, y, ruido(i, 7, 45) > 0.5 ? e.luz : e.sombra, 0.7)
  }
}

/* ------------------------------------------------------------ clareira (Floresta das Fises) */

const MUSGO = ['#14251a', '#1f3a22', '#2d5229', '#3f6a30', '#5a8a3c', '#7fae4c']
const PEDRA_C = ['#151a16', '#2a312b', '#3d463c', '#535e50', '#6c7a66', '#8e9c84', '#b0bca2']
const CASCA_C = ['#120c0a', '#24190f', '#3a2a1c', '#53402a', '#6e5838', '#8a744c']

/** Círculo de pedras baixas com musgo, raízes que atravessam o anel e cogumelos que brilham. */
function pintarClareira(c: Ctx, W: number, H: number) {
  const cx = W / 2, cy = H / 2, rx = W * 0.47, ry = H * 0.44
  // sombra fresca no miolo (a copa) e a luz que cai no centro
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    // degraus de sombra lisos (sem pontilhado: no celular o xadrez ficava gritante)
    if (d < 1.15 && y > cy - ry * 0.1) px(c, x, y, '#0c1a10', Math.round(4 * 0.22 * Math.max(0, 1.15 - d) ** 0.7 * 4) / 16)
  }
  // raízes: entram pelas laterais e passam por baixo do anel (pintadas antes das pedras)
  const raiz = (x0: number, y0: number, ang: number, comp: number, w0: number, s: number) => {
    let x = x0, y = y0, a = ang
    const n = Math.ceil(comp)
    for (let i = 0; i < n; i++) {
      const t = i / n
      a += (fbm(i / 14, s, 2, s) - 0.5) * 0.12
      x += Math.cos(a); y += Math.sin(a) * 0.5
      const r = w0 * (1 - t) ** 0.7 + 0.6
      if (t > 0.55 && t < 0.66) continue // mergulha no musgo
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const q = Math.hypot(dx, dy * 1.2) / r
        if (q > 1) continue
        const luz = 0.15 + 0.5 * Math.sqrt(1 - q * q) + (dy < 0 ? 0.2 : -0.05) + (bayer(x + dx, y + dy) - 0.5) * 0.2
        const mus = dy < -r * 0.3 && fbm((x + dx) / 3, (y + dy) / 3, 2, s + 3) > 0.55
        const tons = mus ? MUSGO : CASCA_C
        px(c, x + dx, y + dy, tons[Math.max(0, Math.min(tons.length - 1, Math.floor(luz * tons.length)))])
      }
      if (r > 1.2 && i % 2 === 0) px(c, x, y + r + 1, '#06100a', 0.5)
    }
  }
  // só raízes baixas, no chão da frente (as de cima pareciam soltas no ar)
  raiz(-2, H * 0.8, -0.2, W * 0.2, 2.6, 5)
  raiz(W + 2, H * 0.76, Math.PI + 0.18, W * 0.18, 2.4, 9)
  // pedras do anel: tamanhos e intervalos irregulares, musgo no topo, contorno e sombra de contato
  const passo = 0.13
  let i = 0
  for (let a = 0; a < Math.PI * 2; a += passo * (0.75 + ruido(i, 3, 71) * 0.6), i++) {
    if (ruido(i, 1, 73) < 0.12) continue // falha no anel
    const perto = Math.sin(a) // > 0: metade da frente (mais perto da câmera, pedras maiores)
    // só a metade da frente: a de trás ficava acima do horizonte da floresta e parecia flutuar (Tales, 14/10/2026)
    if (perto < 0.28) continue
    const x0 = cx + Math.cos(a) * rx, y0 = cy + Math.sin(a) * ry
    const lw = 4 + ruido(i, 5, 75) * 4 + perto * 1.5, lh = 2.6 + ruido(i, 7, 77) * 2.2 + perto * 0.8
    // sombra de contato
    for (let dx = -lw - 1; dx <= lw + 1; dx++) for (let dy = 0; dy <= 2; dy++) if (bayer(x0 + dx, y0 + lh + dy) < 0.5) px(c, x0 + dx, y0 + lh * 0.6 + dy, '#07100a', 0.5)
    for (let dy = -lh - 1; dy <= lh + 1; dy++) for (let dx = -lw - 1; dx <= lw + 1; dx++) {
      const q = Math.hypot(dx / lw, dy / lh) + (fbm((x0 + dx) / 2.5, (y0 + dy) / 2.5, 2, 79 + i) - 0.5) * 0.35
      if (q > 1.12) continue
      if (q > 1) { px(c, x0 + dx, y0 + dy, '#070b08'); continue }
      const nz = Math.sqrt(Math.max(0, 1 - q * q))
      const luz = 0.12 + 0.5 * nz + 0.28 * Math.max(0, -dx / lw - dy / lh) * 0.7 + (bayer(x0 + dx, y0 + dy) - 0.5) * 0.18
      const topo = dy < -lh * 0.15 + (fbm((x0 + dx) / 2, 1, 2, 81 + i) - 0.5) * lh
      const tons = topo && ruido(i, 9, 83) > 0.2 ? MUSGO : PEDRA_C
      px(c, x0 + dx, y0 + dy, tons[Math.max(0, Math.min(tons.length - 1, Math.floor(luz * tons.length)))])
    }
  }
  // tufos de capim e folhas secas em volta do anel
  for (let k = 0; k < W * 1.2; k++) {
    const a = ruido(k, 11, 85) * Math.PI * 2, d = 0.86 + ruido(k, 13, 87) * 0.32
    if (Math.sin(a) < 0.2) continue // nada solto na metade de trás
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d
    if (ruido(k, 15, 89) < 0.25) { px(c, x, y, ['#7a4a20', '#9a6428', '#c08a3a'][k % 3]); continue }
    const alt = 1 + Math.floor(ruido(k, 17, 91) * 3)
    for (let h = 0; h < alt; h++) px(c, x + (h === alt - 1 ? (k % 3) - 1 : 0), y - h, MUSGO[Math.min(5, 2 + h + (k % 2))])
  }
  // cogumelos que brilham de leve (dois grupos, perto das raízes)
  for (const [fx, fy, s] of [[0.12, 0.84, 1], [0.88, 0.8, 2]] as const) {
    for (let k = 0; k < 3; k++) {
      const x = W * fx + (k - 1) * 2.5 + s, y = H * fy + (k % 2)
      px(c, x, y, '#c8d2b8'); px(c, x, y - 1, '#8f9a86')
      px(c, x - 1, y - 2, '#2c8f8a'); px(c, x, y - 2, '#5ccfc0'); px(c, x + 1, y - 2, '#2c8f8a'); px(c, x, y - 3, '#b8f6ea')
      px(c, x, y - 2, '#b8f6ea', 0.4)
    }
  }
}

/* ------------------------------------------------------------ plataforma suspensa */

interface EstiloPlataforma { topo: string[]; lado: string[]; junta: string; aro: string[]; brilho?: string[]; madeira?: boolean }
const PLATAFORMA: Partial<Record<Cenario, EstiloPlataforma>> = {
  torre: { topo: ['#3a3448', '#8a82a0', '#9a92b0', '#aaa2c0', '#c0b8d4'], lado: ['#141020', '#2a2440', '#3a3456', '#4a4468'], junta: '#4a4258', aro: ['#7a5214', '#c28a2a', '#f2c45a', '#fff1b0'] },
  covil: { topo: ['#0a0404', '#2a1410', '#3a1c14', '#4a2418', '#5a2e1e'], lado: ['#050202', '#160806', '#24100a', '#341810'], junta: '#120604', aro: ['#5a1a08', '#a02a10', '#ff6a1a', '#ffb04a'], brilho: ['#a02a10', '#ff6a1a', '#ffb04a', '#fff0a0'] },
  passarela: { topo: ['#2a1a0e', '#6a4428', '#7a5230', '#8f6440', '#a87a50'], lado: ['#140a04', '#2a1a0e', '#3a2414', '#4a2e1a'], junta: '#2a1a0e', aro: ['#4a3a2a', '#8a7a5a', '#d8c08a', '#f0e0b0'], madeira: true },
}

function pintarPlataforma(c: Ctx, W: number, H: number, cenario: Cenario, alturaTopo: number) {
  const e = PLATAFORMA[cenario] ?? PLATAFORMA.torre!
  const Ht = alturaTopo
  const m = 4
  // borda irregular do topo: um retângulo de cantos bem arredondados com recortes de rocha
  const borda = (x: number, y: number) => {
    const r = Math.min(W, Ht) * 0.16
    const qx = Math.max(m + r - x, 0, x - (W - m - r)), qy = Math.max(m + r - y, 0, y - (Ht - m - r))
    const dentro = r - Math.hypot(qx, qy)
    const morde = (fbm(x / 9, y / 9, 2, 51) - 0.5) * 5
    return dentro + morde
  }
  // lado de baixo: rocha (ou tábuas) que afina em pontas penduradas
  const fundo = H - Ht
  for (let x = 0; x < W; x++) {
    const ponta = fundo * (0.35 + 0.65 * fbm(x / 14, 1, 3, 53)) * (1 - Math.abs(x - W / 2) / (W / 2) * 0.55)
    for (let y = Ht - 6; y < Math.min(H, Ht + ponta); y++) {
      if (borda(x, Math.min(y, Ht - m - 1)) < 0) continue
      const t = (y - Ht) / Math.max(1, ponta)
      let k = Math.max(0, Math.min(e.lado.length - 1, Math.floor((1 - t) * e.lado.length - 0.3 + (bayer(x, y) - 0.5) * 0.8)))
      if (e.madeira && x % 11 === 0) k = 0
      px(c, x, y, e.lado[k])
      if (e.brilho && fbm(x / 6, y / 4, 2, 57) > 0.68) px(c, x, y, e.brilho[Math.min(3, Math.floor((fbm(x / 3, y / 3, 2, 59) - 0.5) * 8 + 2))])
    }
  }
  // topo
  for (let y = 0; y < Ht; y++) for (let x = 0; x < W; x++) {
    const b = borda(x, y)
    if (b < 0) continue
    if (b < 2.2) { px(c, x, y, e.aro[b < 1 ? 0 : 1 + ((x + y) % 3 === 0 ? 1 : 0)]); continue }
    if (b < 3.2) { px(c, x, y, e.aro[0]); continue }
    let cor: string
    if (e.madeira) {
      const tabua = Math.floor(x / 10), lx = x % 10
      const veio = fbm((x + tabua * 13) / 3, y / 16, 2, 61 + tabua)
      cor = lx === 0 ? e.junta : e.topo[Math.max(1, Math.min(4, Math.floor(1 + veio * 3.4 + (lx === 1 ? 0.8 : 0))))]
      if ((lx === 2 || lx === 8) && (y === 6 || y === Ht - 7)) cor = '#c8d4e4'
    } else {
      const { id, borda: bj, cx: dx, cy: dy } = celula(x, y, 13, 63, 1.3)
      if (bj < 1.1) cor = e.junta
      else {
        const tom = 1 + Math.floor(ruido(id, 1, 65) * 3)
        let k = bj < 2.2 ? (dx > 0 || dy > 0 ? Math.min(4, tom + 1) : Math.max(1, tom - 1)) : tom
        if (fbm(x / 4, y / 4, 2, 67 + id) > 0.68) k = Math.max(1, k - 1)
        cor = e.topo[k]
      }
      if (e.brilho && bj < 1.1 && fbm(x / 10, y / 10, 2, 69) > 0.55) cor = e.brilho[2]
    }
    // luz vinda de cima à esquerda e sombra na borda de baixo
    px(c, x, y, cor)
    if (y > Ht - 9 && b < 9) px(c, x, y, '#000', 0.18)
  }
  // runa central da Torre: anel fino de ouro
  if (cenario === 'torre') {
    const cx = W / 2, cy = Ht / 2, R = Math.min(W * 0.42, Ht * 0.38)
    for (let a = 0; a < 2 * Math.PI; a += 0.6 / R) { px(c, cx + Math.cos(a) * R * 1.35, cy + Math.sin(a) * R, e.aro[2]); px(c, cx + Math.cos(a) * R * 1.35, cy + Math.sin(a) * R + 1, e.aro[0]) }
  }
}

/** Pinta o tabuleiro do bioma no canvas (tamanho do canvas = tamanho na tela). */
export function pintarTabuleiro(canvas: HTMLCanvasElement, cenario: Cenario) {
  const tipo = TABULEIRO[cenario] ?? 'mesa'
  if (tipo === 'mesa') return pintarMesa(canvas, cenario)
  const w = canvas.clientWidth, h = canvas.clientHeight
  if (!w || !h) return
  const s = escalaPixel(window.innerWidth)
  const W = Math.ceil(w / s), H = Math.ceil(h / s)
  canvas.width = W; canvas.height = H
  const c = canvas.getContext('2d')!
  c.clearRect(0, 0, W, H)
  if (tipo === 'chao' && cenario === 'campo') pintarClareira(c, W, H)
  else if (tipo === 'chao') pintarChao(c, W, H, cenario)
  // a plataforma desce além da mesa (o canvas é mais alto que ela: ver o CSS de data-tabuleiro)
  else pintarPlataforma(c, W, H, cenario, Math.round(H / 1.22))
}

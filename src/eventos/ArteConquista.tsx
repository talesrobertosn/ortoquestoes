import { memo } from 'react'
import type { ArteConquista, NivelConquista } from './conquistasDia'

/**
 * As artes das conquistas do dia, em pixel art 16 × 16 desenhada por código (sem arquivos para
 * baixar): cada desenho é uma grade de letras, e cada letra uma cor. O metal muda com o nível
 * (bronze, prata, ouro, diamante). As formas redondas saem de círculos na grade, com contorno
 * escuro e luz no alto à esquerda, como nos outros desenhos do site.
 */
const N = 16
type Grade = string[][]
const nova = (): Grade => Array.from({ length: N }, () => Array<string>(N).fill('.'))
const centro = (i: number) => i + 0.5
const dist = (x: number, y: number, cx: number, cy: number) => Math.hypot(centro(x) - cx, centro(y) - cy)

/** Pinta onde `dentro` vale, com contorno (k) nas bordas e luz/sombra no metal. */
function forma(g: Grade, dentro: (x: number, y: number) => boolean, cor: (x: number, y: number) => string) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!dentro(x, y)) continue
    const borda = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const a = x + dx, b = y + dy; return a < 0 || b < 0 || a >= N || b >= N || !dentro(a, b) })
    g[y][x] = borda ? 'k' : cor(x, y)
  }
}
const pintar = (g: Grade, pontos: Array<[number, number]>, cor: string) => { for (const [x, y] of pontos) if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = cor }
/** Metal com volume: claro no alto à esquerda, escuro embaixo à direita. */
const metal = (cx: number, cy: number) => (x: number, y: number) => {
  const d = (centro(x) - cx) + (centro(y) - cy)
  return d < -3 ? 'l' : d > 2.5 ? 'd' : 'm'
}

function medalha(): Grade {
  const g = nova()
  // fita em V, com contorno: vermelha à esquerda, azul à direita
  const fita = (lado: 1 | -1) => (x: number, y: number) => centro(y) <= 8 && Math.abs(centro(x) - (8 - lado * (5 - centro(y) * 0.5))) <= 2.1
  forma(g, (x, y) => fita(1)(x, y) || fita(-1)(x, y), (x) => (centro(x) < 8 ? 'r' : 'b'))
  forma(g, (x, y) => dist(x, y, 8, 10.4) <= 5.4, (x, y) => ((centro(x) - 8) + (centro(y) - 10.4) > 2.8 ? 'd' : 'm'))
  // estrela clara no centro
  pintar(g, [[7, 7], [8, 7], [7, 8], [8, 8], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [6, 10], [7, 10], [8, 10], [9, 10], [6, 11], [7, 11], [8, 11], [9, 11], [5, 12], [6, 12], [9, 12], [10, 12]], 'l')
  return g
}

const TROFEU = [
  '................',
  '..kkkkkkkkkkkk..',
  'kkkllmmmmmmmdkkk',
  'k.klmmmmmmmmdk.k',
  'k.klmmmmmmmmdk.k',
  'kk.kmmmmmmmdk.kk',
  '.kk.kmmmmmdk.kk.',
  '...kkmmmmmdkk...',
  '.....kmmmdk.....',
  '......kmdk......',
  '......kmdk......',
  '.....kmmmdk.....',
  '....kkkkkkkk....',
  '....krrrrrrk....',
  '...kkkkkkkkkk...',
  '................',
]
const trofeu = (): Grade => TROFEU.map((l) => l.split(''))

function alvo(): Grade {
  const g = nova()
  forma(g, (x, y) => dist(x, y, 8, 8.5) <= 7.2, (x, y) => { const d = dist(x, y, 8, 8.5); return d < 1.8 ? 'r' : d < 3.5 ? 'w' : d < 5.3 ? 'r' : 'w' })
  // flecha cravada no centro, vinda do alto à direita
  for (let i = 0; i < 6; i++) pintar(g, [[8 + i, 8 - i]], 'k')
  pintar(g, [[13, 1], [14, 2], [14, 1], [15, 0], [13, 0], [15, 2]], 'y')
  return g
}

function chama(): Grade {
  const g = nova()
  const gota = (cx: number, base: number, r: number, topo: number) => (x: number, y: number) => {
    if (centro(y) >= base) return dist(x, y, cx, base) <= r
    const hw = (r * (centro(y) - topo)) / (base - topo)
    return hw > 0 && Math.abs(centro(x) - cx) <= hw
  }
  const fora = gota(8, 10.5, 5.4, 0.6), meio = gota(8, 11.4, 3.2, 4.6), nucleo = (x: number, y: number) => dist(x, y, 8, 12.4) <= 1.6
  forma(g, fora, (x, y) => (nucleo(x, y) ? 'w' : meio(x, y) ? 'y' : 'o'))
  return g
}

function seta(): Grade {
  const g = nova()
  forma(g, (x, y) => {
    const cx = centro(x), cy = centro(y)
    if (cy >= 1 && cy <= 8) return Math.abs(cx - 8) <= (cy - 1) * 0.95 + 0.6
    return cy > 8 && cy <= 15 && cx >= 5.5 && cx <= 10.5
  }, (x) => (x >= 8 ? 'h' : 'g'))
  pintar(g, [[6, 9], [6, 10], [6, 11], [6, 12]], 'w')
  return g
}

function bussola(): Grade {
  const g = nova()
  forma(g, (x, y) => dist(x, y, 8, 8) <= 7.4, (x, y) => (dist(x, y, 8, 8) > 5.6 ? metal(8, 8)(x, y) : 'c'))
  // agulha: norte vermelho, sul azul
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.abs(centro(x) - 8) / 1.9 + Math.abs(centro(y) - 8) / 5.2 <= 1) g[y][x] = centro(y) < 8 ? 'r' : 'b'
  pintar(g, [[7, 7], [8, 8]], 'k')
  pintar(g, [[3, 8], [12, 8]], 'd')
  return g
}

function calendario(): Grade {
  const g = nova()
  forma(g, (x, y) => x >= 1 && x <= 14 && y >= 2 && y <= 14, (_x, y) => (y <= 5 ? 'r' : 'w'))
  pintar(g, [[4, 1], [4, 2], [4, 3], [11, 1], [11, 2], [11, 3]], 'k')
  pintar(g, [[2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6]], 'k')
  // um visto grande, de dia cumprido
  pintar(g, [[4, 10], [5, 11], [6, 12], [7, 11], [8, 10], [9, 9], [10, 8], [11, 7]], 'g')
  pintar(g, [[4, 11], [5, 12], [6, 13], [7, 12], [8, 11], [9, 10], [10, 9], [11, 8]], 'h')
  return g
}

const DESENHOS: Record<ArteConquista, () => Grade> = { medalha, trofeu, alvo, chama, seta, bussola, calendario }

const METAL: Record<NivelConquista, [string, string, string]> = {
  bronze: ['#f2b27c', '#cd7f3e', '#7d451f'],
  prata: ['#f4f8fb', '#b8c3cd', '#66727e'],
  ouro: ['#fff1a6', '#f2bf45', '#a5701a'],
  diamante: ['#e4fdff', '#72d9ea', '#2b88a3'],
}
const CORES: Record<string, string> = {
  k: '#1b1208', r: '#d9473a', b: '#3d6fd6', w: '#fff7e9', y: '#f7cf4a', o: '#f08a2c', g: '#47b86f', h: '#25844a', c: '#fbf1d9',
}

/** As corridas horizontais de mesma cor viram um retângulo só (bem menos nós no SVG). */
function retangulos(g: Grade, nivel: NivelConquista) {
  const [l, m, d] = METAL[nivel]
  const cor = (k: string) => (k === 'l' ? l : k === 'm' ? m : k === 'd' ? d : CORES[k])
  const saida: Array<{ x: number; y: number; w: number; fill: string }> = []
  g.forEach((linha, y) => {
    let x = 0
    while (x < N) {
      const k = linha[x]
      if (k === '.') { x++; continue }
      let w = 1
      while (x + w < N && linha[x + w] === k) w++
      saida.push({ x, y, w, fill: cor(k) })
      x += w
    }
  })
  return saida
}

export const ArteConquistaPixel = memo(function ArteConquistaPixel({ arte, nivel, tamanho = 64 }: { arte: ArteConquista; nivel: NivelConquista; tamanho?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={tamanho} height={tamanho} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {retangulos(DESENHOS[arte](), nivel).map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />)}
    </svg>
  )
})

import { memo } from 'react'
import type { ArteConquista } from './conquistasDia'

/**
 * As artes das conquistas do dia, no clima de jogo aconchegante (cozy game): vasinho com rosto,
 * planta que cresce, estrelinha, arco-íris entre nuvens e gatinho no almofadão. Pixel art 24 × 24
 * desenhada por código (sem arquivos para baixar): formas arredondadas com contorno marrom quente
 * (nunca preto), luz no alto à esquerda, bochechas rosadas e olhinhos.
 */
/** A grade tem 24 pixels; as formas são pensadas numa tela de 16 (E converte). */
const N = 24
const E = N / 16
type Grade = string[][]
const nova = (): Grade => Array.from({ length: N }, () => Array<string>(N).fill('.'))
/** Centro do pixel, na tela de 16. */
const c = (i: number) => (i + 0.5) / E
const dist = (x: number, y: number, cx: number, cy: number, rx = 1, ry = 1) => Math.hypot((c(x) - cx) / rx, (c(y) - cy) / ry)
const dentroDe = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N

/** Pinta onde `dentro` vale, com contorno marrom (o) só na borda de fora da forma. */
function forma(g: Grade, dentro: (x: number, y: number) => boolean, cor: (x: number, y: number) => string) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!dentro(x, y)) continue
    const borda = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !dentroDe(x + dx, y + dy) || !dentro(x + dx, y + dy))
    g[y][x] = borda ? 'o' : cor(x, y)
  }
}
/** Detalhes à mão (olhos, bochechas, brilhos), em pixels da grade de 24. */
const pintar = (g: Grade, pontos: Array<[number, number]>, cor: string) => { for (const [x, y] of pontos) if (dentroDe(x, y)) g[y][x] = cor }
/** Luz suave: claro no alto à esquerda, sombra embaixo à direita. */
const volume = (cx: number, cy: number, claro: string, meio: string, escuro: string, corte = 2.2) => (x: number, y: number) => {
  const d = (c(x) - cx) + (c(y) - cy)
  return d < -corte ? claro : d > corte ? escuro : meio
}
/** Rostinho fofo: olhos de dois pixels, bochechas e sorriso, centrado em x (pixels de 24). */
function rosto(g: Grade, x: number, y: number, fechados = false) {
  if (fechados) pintar(g, [[x - 3, y + 1], [x - 2, y], [x - 1, y + 1], [x + 2, y + 1], [x + 3, y], [x + 4, y + 1]], 'o')
  else pintar(g, [[x - 2, y], [x - 2, y + 1], [x + 3, y], [x + 3, y + 1]], 'o')
  pintar(g, [[x - 4, y + 2], [x - 3, y + 2], [x + 4, y + 2], [x + 5, y + 2]], 'r')
  pintar(g, [[x - 1, y + 2], [x, y + 3], [x + 1, y + 3], [x + 2, y + 2]], 'o')
}

/** O vasinho de terracota com rosto (base das quatro fases do jardim). */
function vaso(g: Grade) {
  const cor = (x: number) => (c(x) < 5 ? 's' : c(x) > 11.3 ? 'T' : 't')
  forma(g, (x, y) => (c(y) >= 9.2 && c(y) <= 11 && c(x) >= 3 && c(x) <= 13) || (c(y) > 10.5 && c(y) <= 15.8 && c(x) >= 4 + (c(y) - 10.5) * 0.3 && c(x) <= 12 - (c(y) - 10.5) * 0.3), cor)
  for (let x = 6; x <= 17; x++) pintar(g, [[x, 14]], 'e') // terra
  for (let x = 5; x <= 18; x++) pintar(g, [[x, 16]], 'o') // borda da boca do vaso
  rosto(g, 11, 18)
}
const caule = (g: Grade, de: number, ate: number) => forma(g, (x, y) => c(y) >= de && c(y) <= ate && Math.abs(c(x) - 8) <= 0.75, (x) => (c(x) < 8 ? 'G' : 'g'))
const folha = (g: Grade, cx: number, cy: number, rx: number, ry: number) => forma(g, (x, y) => dist(x, y, cx, cy, rx, ry) <= 1, volume(cx, cy, 'L', 'g', 'G', 0.8))

function broto(): Grade {
  const g = nova(); vaso(g)
  caule(g, 5.6, 9.6)
  folha(g, 5.5, 5.4, 2.8, 1.7); folha(g, 10.5, 4.6, 2.8, 1.7)
  return g
}
function muda(): Grade {
  const g = nova(); vaso(g)
  caule(g, 2.2, 9.6)
  folha(g, 5.1, 7, 2.8, 1.6); folha(g, 10.9, 6, 2.8, 1.6); folha(g, 5.7, 3.6, 2.4, 1.4); folha(g, 10.3, 2.4, 2.4, 1.4)
  return g
}
function flor(): Grade {
  const g = nova(); vaso(g)
  caule(g, 4.6, 9.6)
  folha(g, 5, 7.6, 2.5, 1.4); folha(g, 11, 7.2, 2.5, 1.4)
  const centro = [8, 3.9] as const
  forma(g, (x, y) => [[8, 1.6], [5.7, 3.4], [10.3, 3.4], [6.5, 6], [9.5, 6]].some(([px, py]) => dist(x, y, px, py) <= 1.8) || dist(x, y, ...centro) <= 2.3,
    (x, y) => (dist(x, y, ...centro) <= 1.2 ? 'y' : volume(...centro, 'w', 'p', 'P', 1.8)(x, y)))
  pintar(g, [[11, 5]], 'w')
  return g
}
function arvore(): Grade {
  const g = nova(); vaso(g)
  forma(g, (x, y) => c(y) >= 7 && c(y) <= 9.6 && Math.abs(c(x) - 8) <= 1, (x) => (c(x) < 8 ? 'b' : 'B'))
  forma(g, (x, y) => dist(x, y, 8, 4.6, 1.3, 1) <= 4.4, volume(8, 4.6, 'L', 'g', 'G', 2.2))
  pintar(g, [[6, 4], [7, 4], [6, 5], [15, 3], [16, 3], [15, 4], [17, 8], [16, 8], [9, 9], [10, 9], [9, 10], [12, 1]], 'p') // florzinhas na copa
  pintar(g, [[6, 4], [15, 3], [9, 9]], 'w')
  pintar(g, [[4, 6], [5, 5]], 'L')
  return g
}
function estrela(): Grade {
  const g = nova()
  const pontas = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 3.9 : 7.6; return [8 + Math.cos(a) * r, 8.8 + Math.sin(a) * r] })
  const dentro = (x: number, y: number) => {
    let sim = false
    for (let i = 0, j = pontas.length - 1; i < pontas.length; j = i++) {
      const [xi, yi] = pontas[i], [xj, yj] = pontas[j]
      if ((yi > c(y)) !== (yj > c(y)) && c(x) < ((xj - xi) * (c(y) - yi)) / (yj - yi) + xi) sim = !sim
    }
    return sim
  }
  forma(g, dentro, volume(8, 8.8, 'w', 'y', 'Y', 4.4))
  rosto(g, 11, 12)
  return g
}
function arcoiris(): Grade {
  const g = nova()
  const faixas = ['R', 'A', 'Y', 'V', 'Z']
  forma(g, (x, y) => c(y) <= 12.6 && dist(x, y, 8, 12.6) <= 7.6 && dist(x, y, 8, 12.6) >= 2.6, (x, y) => faixas[Math.min(4, Math.floor((7.6 - dist(x, y, 8, 12.6)) / 0.96))])
  const nuvem = (cx: number) => forma(g, (x, y) => dist(x, y, cx, 13, 1.6, 1) <= 2 || dist(x, y, cx + (cx < 8 ? 1 : -1), 11.6) <= 1.5, (_x, y) => (c(y) > 13.8 ? 'n' : 'w'))
  nuvem(3.3); nuvem(12.7)
  pintar(g, [[3, 19], [6, 19], [17, 19], [20, 19]], 'o') // olhinhos das nuvens
  pintar(g, [[2, 20], [7, 20], [16, 20], [21, 20]], 'r')
  return g
}
function gato(coracao: boolean): Grade {
  const g = nova()
  forma(g, (x, y) => dist(x, y, 8, 14.2, 7.6, 1.8) <= 1, volume(8, 14.2, 'p', 'p', 'Q', 3)) // almofadão
  const corpo = (x: number, y: number) =>
    dist(x, y, 9.6, 11.2, 5.4, 3) <= 1 // corpo enroladinho
    || dist(x, y, 5.6, 8.6, 3.5, 3.1) <= 1 // cabeça
    || (c(y) >= 4 && c(y) <= 7 && Math.abs(c(x) - 3.5) <= (c(y) - 4) * 0.75 + 0.2) // orelhas
    || (c(y) >= 4 && c(y) <= 7 && Math.abs(c(x) - 7.7) <= (c(y) - 4) * 0.75 + 0.2)
    || dist(x, y, 13.9, 12.4, 1.5, 1.4) <= 1 // rabinho
  forma(g, corpo, (x, y) => ((Math.round(c(x) * 2) === 21 || Math.round(c(x) * 2) === 24) && c(y) < 10.6 ? 'K' : volume(7, 9, 'l', 'k', 'K', 3.2)(x, y)))
  pintar(g, [[5, 8], [5, 9], [11, 8], [11, 9]], 'p') // dentro das orelhas
  rosto(g, 8, 12, true)
  if (coracao) {
    forma(g, (x, y) => dist(x, y, 12, 2.2, 1.1, 1.1) <= 1 || dist(x, y, 14, 2.2, 1.1, 1.1) <= 1 || (c(y) >= 2.4 && c(y) <= 5 && Math.abs(c(x) - 13) <= (5 - c(y)) * 0.85), (x, y) => (c(x) < 12.6 && c(y) < 2.6 ? 'w' : 'P'))
  }
  return g
}

const DESENHOS: Record<ArteConquista, () => Grade> = {
  broto, muda, flor, arvore, estrela, arcoiris, gato: () => gato(false), gatoCoracao: () => gato(true),
}
/** Paleta quente e suave, de jogo aconchegante. */
const CORES: Record<string, string> = {
  o: '#5b3a29', // contorno marrom
  t: '#e08e63', s: '#f4b48e', T: '#b9643f', e: '#7a5238', // vaso e terra
  g: '#79c37b', L: '#b7e59d', G: '#4c955a', // folhas
  b: '#a8754f', B: '#845436', // tronco
  p: '#f7a8c0', P: '#e57a9a', Q: '#c95f82', w: '#fffaf0', y: '#ffd76a', Y: '#f2b23e', // flor e estrela
  r: '#f6a5a0', // bochechas
  R: '#f28b82', A: '#f7b267', V: '#a7d8a0', Z: '#9cc9f0', n: '#dbe6f2', // arco-íris e nuvem
  k: '#f4b56f', l: '#fcd7a4', K: '#d98a49', // gatinho laranja
}

/** As corridas horizontais de mesma cor viram um retângulo só (bem menos nós no SVG). */
function retangulos(g: Grade) {
  const saida: Array<{ x: number; y: number; w: number; fill: string }> = []
  g.forEach((linha, y) => {
    let x = 0
    while (x < N) {
      const k = linha[x]
      if (k === '.') { x++; continue }
      let w = 1
      while (x + w < N && linha[x + w] === k) w++
      saida.push({ x, y, w, fill: CORES[k] })
      x += w
    }
  })
  return saida
}

export const ArteConquistaPixel = memo(function ArteConquistaPixel({ arte, tamanho = 64 }: { arte: ArteConquista; tamanho?: number }) {
  return (
    <svg viewBox={`0 0 ${N} ${N}`} width={tamanho} height={tamanho} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {retangulos(DESENHOS[arte]()).map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />)}
    </svg>
  )
})

import { memo } from 'react'
import type { ArteConquista } from './conquistasDia'

/**
 * As artes das conquistas do dia, em pixel art 24 × 24 desenhada por código (sem arquivos para
 * baixar). Tom de jogo aconchegante, mas de quem trabalha com ortopedia (Tales, 26/10/2026: "lembra
 * que é um site para ortopedistas"): o filme de raio-X com a fratura consolidando, a placa com
 * parafusos, o martelo de reflexo, a caneca do plantão e a prancheta da escala. Contorno marrom
 * escuro, luz no alto à esquerda, cores sóbrias.
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
/** Pinta sem contorno (o que fica dentro do filme de raio-X não tem traço). */
function preencher(g: Grade, dentro: (x: number, y: number) => boolean, cor: (x: number, y: number) => string) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (dentro(x, y)) g[y][x] = cor(x, y)
}
/** Distância do ponto ao segmento (a, b), na tela de 16. */
function aoSegmento(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const px = c(x) - ax, py = c(y) - ay, dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - t * dx, py - t * dy)
}

/**
 * O filme de raio-X com a diáfise (só o corpo do osso, sem as pontas) e a consolidação avançando:
 * 0 traço de fratura, 1 calo mole, 2 ponte óssea, 3 consolidada (com o carimbo de alta).
 */
function radiografia(fase: 0 | 1 | 2 | 3): Grade {
  const g = nova()
  forma(g, (x, y) => c(x) >= 1.4 && c(x) <= 14.6 && c(y) >= 0.8 && c(y) <= 15.2, (_x, y) => (c(y) < 2.4 ? 'F' : 'f'))
  const osso = (x: number, y: number) => c(y) > 1.4 && c(y) < 14.6 && Math.abs(c(x) - 8.4) <= 2.7
  const foco = (x: number, y: number) => Math.abs(c(y) - (8 + (c(x) - 8.4) * 0.6)) <= 0.45
  if (fase === 1) preencher(g, (x, y) => dist(x, y, 8.4, 8, 4.4, 2.2) <= 1 && !osso(x, y), () => 'c')
  if (fase === 2) preencher(g, (x, y) => dist(x, y, 8.4, 8, 4.1, 2) <= 1 && !osso(x, y), () => 'B')
  if (fase === 3) preencher(g, (x, y) => dist(x, y, 8.4, 8, 3.4, 1.5) <= 1 && !osso(x, y), () => 'm')
  preencher(g, osso, (x) => (Math.abs(c(x) - 8.4) > 1.5 ? 'W' : 'm'))
  if (fase < 3) preencher(g, (x, y) => osso(x, y) && foco(x, y), () => (fase === 0 ? 'f' : fase === 1 ? 'c' : 'B'))
  // marcador de lado (R) no canto, como nos filmes de verdade
  pintar(g, [[4, 3], [5, 3], [4, 4], [6, 4], [4, 5], [5, 5], [4, 6], [6, 6], [4, 7], [6, 7]], 'W')
  if (fase === 3) {
    forma(g, (x, y) => dist(x, y, 12.2, 12.2) <= 2.9, () => 'g')
    pintar(g, [[15, 18], [16, 19], [17, 20], [18, 19], [19, 18], [20, 17], [21, 16]], 'W')
  }
  return g
}

/** Placa de osteossíntese com quatro parafusos, inclinada. */
function placa(): Grade {
  const g = nova()
  const a = -0.62, cos = Math.cos(a), sen = Math.sin(a)
  const u = (x: number, y: number) => (c(x) - 8) * cos + (c(y) - 8.4) * sen
  const v = (x: number, y: number) => -(c(x) - 8) * sen + (c(y) - 8.4) * cos
  forma(g, (x, y) => aoSegmento(x, y, 8 - 5 * cos, 8.4 - 5 * sen, 8 + 5 * cos, 8.4 + 5 * sen) <= 2.25, (x, y) => (v(x, y) < -0.9 ? 'S' : v(x, y) > 0.9 ? 'D' : 's'))
  for (const k of [-4.4, -1.5, 1.5, 4.4]) {
    preencher(g, (x, y) => Math.hypot(u(x, y) - k, v(x, y)) <= 1.3, () => 'D')
    preencher(g, (x, y) => Math.hypot(u(x, y) - k, v(x, y)) <= 0.62, () => 'o')
  }
  return g
}

/** Martelo de reflexo de Taylor: cabeça triangular de borracha e cabo de metal. */
function martelo(): Grade {
  const g = nova()
  forma(g, (x, y) => aoSegmento(x, y, 6, 6.4, 14, 14.4) <= 0.95, (x, y) => (c(x) - c(y) > 0.2 ? 'D' : 's'))
  const tri = [[0.9, 6.4], [6.6, 0.6], [9.6, 7.2]] as const
  const lado = (x: number, y: number, [ax, ay]: readonly number[], [bx, by]: readonly number[]) => (bx - ax) * (c(y) - ay) - (by - ay) * (c(x) - ax)
  forma(g, (x, y) => { const s1 = lado(x, y, tri[0], tri[1]), s2 = lado(x, y, tri[1], tri[2]), s3 = lado(x, y, tri[2], tri[0]); return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0) },
    volume(5.6, 4.8, 'q', 'r', 'R', 1.6))
  pintar(g, [[11, 11], [12, 12], [13, 13]], 'S')
  return g
}

/** A caneca do plantão, com a cruz do hospital e o vapor do café. */
function caneca(): Grade {
  const g = nova()
  forma(g, (x, y) => (Math.hypot(c(x) - 11.4, c(y) - 10.4) <= 3 && Math.hypot(c(x) - 11.4, c(y) - 10.4) >= 1.3 && c(x) > 10.5), () => 'v')
  forma(g, (x, y) => c(x) >= 3 && c(x) <= 11.4 && c(y) >= 5.6 && c(y) <= 15 && !(c(y) > 14.2 && (c(x) < 3.8 || c(x) > 10.6)), (x) => (c(x) < 4.6 ? 'V' : c(x) > 9.8 ? 'X' : 'v'))
  for (let x = 5; x <= 16; x++) pintar(g, [[x, 9]], 'e') // café
  pintar(g, [[10, 14], [11, 14], [10, 15], [11, 15], [10, 16], [11, 16], [8, 15], [9, 15], [12, 15], [13, 15]], 'w') // cruz
  pintar(g, [[8, 1], [7, 2], [7, 3], [8, 4], [8, 5], [7, 6], [13, 2], [12, 3], [12, 4], [13, 5], [13, 6], [12, 7]], 'n') // vapor
  return g
}

/** Prancheta com a escala da semana conferida. */
function prancheta(): Grade {
  const g = nova()
  forma(g, (x, y) => c(x) >= 2.4 && c(x) <= 13.6 && c(y) >= 2 && c(y) <= 15.4, (x) => (c(x) > 12 ? 'M' : 'b'))
  forma(g, (x, y) => c(x) >= 4 && c(x) <= 12 && c(y) >= 3.6 && c(y) <= 14.4, () => 'w')
  for (const y of [8, 11, 14, 17]) for (let x = 7; x <= 16; x++) pintar(g, [[x, y]], 'n')
  forma(g, (x, y) => c(x) >= 5.4 && c(x) <= 10.6 && c(y) >= 0.9 && c(y) <= 3.8, (x) => (c(x) < 7 ? 'S' : 's')) // presilha
  pintar(g, [[8, 16], [9, 17], [10, 18], [11, 17], [12, 16], [13, 15], [14, 14], [15, 13]], 'G')
  pintar(g, [[8, 17], [9, 18], [10, 19], [11, 18], [12, 17], [13, 16], [14, 15], [15, 14]], 'g')
  return g
}

const DESENHOS: Record<ArteConquista, () => Grade> = {
  fratura: () => radiografia(0), caloMole: () => radiografia(1), ponteOssea: () => radiografia(2), consolidada: () => radiografia(3),
  placa, martelo, caneca, prancheta,
}
/** Paleta sóbria e quente: filme azul-ardósia, osso marfim, aço, borracha do martelo, verde do site. */
const CORES: Record<string, string> = {
  o: '#33261d', // contorno marrom-escuro
  f: '#22364a', F: '#2d4760', W: '#eef2f4', m: '#b9c6d0', c: '#7d93a6', B: '#cfd9e1', // raio-X
  s: '#c3ccd4', S: '#eef2f5', D: '#7f8c98', // aço
  q: '#e48c79', r: '#c8604f', R: '#9c4538', // borracha do martelo
  v: '#2f7d6d', V: '#4fa08f', X: '#215b50', e: '#5b3a29', w: '#fbf7ef', n: '#c9d2d9', // caneca
  b: '#b07a4f', M: '#8a5a37', g: '#3f9a63', G: '#2b7149', // prancheta
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

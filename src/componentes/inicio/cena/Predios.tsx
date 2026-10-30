import { memo, type ReactElement } from 'react'
import { BARRACA, PALETA_BARRACA } from './artes'

/**
 * As construções em miniatura dos atalhos da página inicial (30/10/2026): cada atalho é um prédio em pixel art, com
 * o nome real na placa (o desenho é decoração; o texto do link é o que conta). 40 x 36 pixels de arte cada, desenhados
 * com retângulos. A janela (classe pd-janela) acende ao passar o mouse.
 */
export type TipoPredio = 'treinar' | 'revisao' | 'flashcards' | 'torneio' | 'resumos' | 'atlas'

const K = '#1b1208'
type R = [number, number, number, number, string, string?]
const desenhar = (lista: R[]) => lista.map(([x, y, w, h, cor, classe], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={cor} className={classe} />)

function grade(g: readonly string[], paleta: Record<string, string>, ox: number, oy: number): R[] {
  const r: R[] = []
  g.forEach((linha, y) => { for (let x = 0; x < linha.length; x++) if (linha[x] !== '.') r.push([ox + x, oy + y, 1, 1, paleta[linha[x]]]) })
  return r
}

/** Telhado em degraus: de largura `base` em y até a ponta. */
function telhado(x: number, y: number, base: number, cor: string, luz: string): R[] {
  const r: R[] = []
  for (let i = 0, w = base; w > 0; i++, w -= 4) {
    r.push([x + i * 2, y - i * 2, w, 2, cor])
    r.push([x + i * 2, y - i * 2, w, 1, luz])
    r.push([x + i * 2 - 1, y - i * 2, 1, 2, K], [x + i * 2 + w, y - i * 2, 1, 2, K])
  }
  return r
}

const DESENHOS: Record<TipoPredio, () => R[]> = {
  treinar: () => [
    ...grade(BARRACA, PALETA_BARRACA, 1, 20),
    // Boneco de treino com alvo.
    [31, 18, 2, 17, '#7a4a26'], [30, 18, 1, 17, K], [33, 18, 1, 17, K],
    [27, 14, 9, 9, K], [28, 15, 7, 7, '#f4ead2'], [29, 16, 5, 5, '#c0392b'], [30, 17, 3, 3, '#f4ead2'], [31, 18, 1, 1, '#c0392b', 'pd-janela'],
  ],
  revisao: () => [
    ...telhado(11, 10, 18, '#3a4a7a', '#5a6fa8'),
    [12, 11, 16, 24, '#a9a196'], [11, 11, 1, 24, K], [28, 11, 1, 24, K], [12, 11, 16, 1, '#c9c2b6'],
    ...Array.from({ length: 5 }, (_, i): R => [12, 15 + i * 4, 16, 1, '#8f877c']),
    [15, 13, 10, 10, K], [16, 14, 8, 8, '#f6efe0', 'pd-janela'], [19, 15, 1, 4, K], [19, 18, 3, 1, K],
    [17, 27, 6, 8, K], [18, 28, 4, 7, '#5a3a22'], [19, 2, 2, 2, '#e9b54a'],
  ],
  flashcards: () => [
    [5, 12, 2, 23, '#7a4a26'], [33, 12, 2, 23, '#7a4a26'],
    ...Array.from({ length: 8 }, (_, i): R => [3 + i * 4, 9, 4, 6, i % 2 ? '#f4ead2' : '#c0392b']),
    [3, 8, 34, 1, K], [3, 15, 34, 1, K], ...Array.from({ length: 8 }, (_, i): R => [4 + i * 4, 16, 2, 1, i % 2 ? '#f4ead2' : '#c0392b']),
    [4, 25, 32, 2, '#9a6236'], [4, 27, 32, 8, '#7a4a26'], [3, 24, 34, 1, K], [3, 35, 34, 1, K],
    [8, 20, 6, 5, K], [9, 21, 4, 3, '#f4ead2', 'pd-janela'], [16, 19, 6, 6, K], [17, 20, 4, 4, '#3f8a3a'], [24, 20, 6, 5, K], [25, 21, 4, 3, '#e9b54a'],
  ],
  torneio: () => [
    [2, 18, 36, 17, '#b8a48a'], [2, 18, 36, 2, '#d6c6a8'], [1, 17, 38, 1, K], [1, 18, 1, 17, K], [38, 18, 1, 17, K],
    ...Array.from({ length: 6 }, (_, i): R => [4 + i * 6, 22, 4, 6, K]), ...Array.from({ length: 6 }, (_, i): R => [5 + i * 6, 23, 2, 5, '#4a3a2a', i === 2 ? 'pd-janela' : undefined]),
    [2, 30, 36, 1, '#8f7d64'],
    [6, 6, 1, 12, K], [7, 6, 5, 6, '#c0392b'], [7, 12, 2, 1, '#c0392b'],
    [33, 6, 1, 12, K], [28, 6, 5, 6, '#2f6aa8'], [31, 12, 2, 1, '#2f6aa8'],
    [19, 4, 1, 14, K], [20, 4, 6, 5, '#e9b54a'],
  ],
  resumos: () => [
    ...telhado(5, 13, 30, '#7a3a2a', '#a8523a'),
    [6, 14, 28, 21, '#c9b48e'], [5, 14, 1, 21, K], [34, 14, 1, 21, K], [6, 14, 28, 1, '#e0cfaa'],
    [9, 17, 10, 9, K], [10, 18, 8, 7, '#f6d27a', 'pd-janela'], [11, 19, 1, 6, '#b8452f'], [12, 19, 1, 6, '#2f6aa8'], [13, 20, 1, 5, '#3f8a3a'], [15, 19, 1, 6, '#7a4a8c'], [16, 21, 1, 4, '#b8452f'],
    [22, 23, 8, 12, K], [23, 24, 6, 11, '#5a3a22'], [22, 17, 8, 4, K], [23, 18, 6, 2, '#f4ead2'],
  ],
  atlas: () => [
    [4, 13, 32, 3, '#e6dfd0'], [3, 12, 34, 1, K], [3, 16, 34, 1, K],
    ...telhado(6, 11, 28, '#d6cdb9', '#f2ecdf'),
    ...Array.from({ length: 4 }, (_, i): R => [7 + i * 8, 17, 3, 15, '#efe8da']), ...Array.from({ length: 4 }, (_, i): R => [6 + i * 8, 17, 1, 15, K]),
    [12, 20, 16, 12, '#3a3040'], [13, 21, 14, 11, '#5a4a62', 'pd-janela'],
    // Um osso no frontão.
    [16, 7, 8, 2, '#f6efe0'], [15, 6, 2, 2, '#f6efe0'], [15, 9, 2, 1, '#f6efe0'], [23, 6, 2, 2, '#f6efe0'], [23, 9, 2, 1, '#f6efe0'],
    [3, 32, 34, 3, '#b8ad98'], [2, 31, 36, 1, K], [2, 35, 36, 1, K],
  ],
}

export const Predio = memo(function Predio({ tipo }: { tipo: TipoPredio }) {
  const partes: ReactElement[] = desenhar(DESENHOS[tipo]())
  return (
    <svg className={`pd pd--${tipo}`} viewBox="0 0 40 36" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <ellipse cx={20} cy={35} rx={18} ry={1.6} fill="rgba(0,0,0,0.28)" />
      {partes}
    </svg>
  )
})

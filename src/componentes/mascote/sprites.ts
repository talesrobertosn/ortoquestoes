/**
 * As folhas de sprites do mascote em pixel art HD-2D (30/10/2026), pintadas por scripts/gerar_mascote.py.
 * Cada linha da folha é um comportamento e cada coluna um quadro; o CSS amplia com image-rendering: pixelated.
 * Esta lista precisa bater com a ordem das linhas do script (LINHAS e LINHAS_GATO).
 */

/** Esqueleto: public/pixel/mascote/esqueleto.png */
export const SPRITE_ESQUELETO = {
  src: '/pixel/mascote/esqueleto.png?v=e',
  larguraQuadro: 96,
  alturaQuadro: 128,
  quadrosPorLinha: 8,
} as const

export const LINHAS_ESQUELETO = [
  { id: 'acenar', nome: 'acenando', halloween: false },
  { id: 'ler', nome: 'lendo', halloween: false },
  { id: 'cafe', nome: 'tomando café', halloween: false },
  { id: 'dormir', nome: 'cochilando', halloween: false },
  { id: 'alongar', nome: 'se espreguiçando', halloween: false },
  { id: 'raiox', nome: 'olhando um raio X', halloween: false },
  { id: 'malabares', nome: 'fazendo malabares com ossos', halloween: false },
  { id: 'reflexo', nome: 'testando o próprio reflexo patelar', halloween: false },
  { id: 'marshmallow', nome: 'assando marshmallow', halloween: false },
  { id: 'parado', nome: 'parado', halloween: false },
  { id: 'foice', nome: 'passeando com a foice', halloween: true },
  { id: 'abobora', nome: 'com a lanterna de abóbora', halloween: true },
  { id: 'velas', nome: 'com o castiçal de velas', halloween: true },
  { id: 'morcegos', nome: 'com os morcegos', halloween: true },
] as const

export type IdLinhaEsqueleto = (typeof LINHAS_ESQUELETO)[number]['id']

/** Gato: public/pixel/mascote/gato.png */
export const SPRITE_GATO = {
  src: '/pixel/mascote/gato.png',
  larguraQuadro: 64,
  alturaQuadro: 40,
  quadrosPorLinha: 6,
} as const

export const LINHAS_GATO = [
  { id: 'dormindo', nome: 'dormindo' },
  { id: 'acordado', nome: 'acordado' },
  { id: 'tala', nome: 'com a tala no braço' },
] as const

export type IdLinhaGato = (typeof LINHAS_GATO)[number]['id']

/** Linha (0, 1, 2...) de um comportamento na folha do esqueleto. */
export function linhaEsqueleto(id: IdLinhaEsqueleto): number {
  return LINHAS_ESQUELETO.findIndex((l) => l.id === id)
}

/** Linha de um estado na folha do gato. */
export function linhaGato(id: IdLinhaGato): number {
  return LINHAS_GATO.findIndex((l) => l.id === id)
}

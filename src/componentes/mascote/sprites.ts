/**
 * Os comportamentos do mascote (desenhados em vetor em desenho.ts) e a folha de sprites do gato em pixel art
 * (scripts/gerar_mascote.py; LINHAS_GATO precisa bater com a ordem das linhas do script).
 */

/** Os comportamentos do esqueleto (o desenho de cada um fica em desenho.ts). */
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

/** Linha de um estado na folha do gato. */
export function linhaGato(id: IdLinhaGato): number {
  return LINHAS_GATO.findIndex((l) => l.id === id)
}

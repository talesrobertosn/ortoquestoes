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
  // Linhas novas (31/10/2026): usadas por id em lugares específicos; sorteio: false = fora do sorteio do topo.
  { id: 'estudioso', nome: 'estudando de óculos', halloween: false, sorteio: false },
  { id: 'mago', nome: 'de mago com o cajado', halloween: false, sorteio: false },
  { id: 'inverno', nome: 'de gorro e cachecol com café', halloween: false, sorteio: false },
  { id: 'pergaminho', nome: 'lendo as missões do dia', halloween: false, sorteio: false },
  { id: 'comemorando', nome: 'comemorando', halloween: false, sorteio: false },
  { id: 'trofeu', nome: 'erguendo um troféu', halloween: false, sorteio: false },
  { id: 'descansando', nome: 'cochilando sentado com um livro', halloween: false, sorteio: false },
  { id: 'orientando', nome: 'mostrando o caminho', halloween: false, sorteio: false },
  { id: 'ortopedia', nome: 'de jaleco com martelo de reflexo', halloween: false, sorteio: false },
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
  // Linhas novas (31/10/2026)
  { id: 'sentado', nome: 'sentado' },
  { id: 'andando', nome: 'andando' },
  { id: 'espreguicando', nome: 'se espreguiçando' },
  { id: 'brincando', nome: 'brincando com a bolinha de lã' },
  { id: 'lendo', nome: 'lendo' },
  { id: 'comemorando', nome: 'comemorando' },
] as const

export type IdLinhaGato = (typeof LINHAS_GATO)[number]['id']

/**
 * As poses de 31/10/2026 em diante ficam numa segunda folha (esqueleto-poses.png, gato-poses.png): a folha de sempre
 * continua leve no topo da página inicial, e a das poses só carrega onde uma pose fixa aparece.
 */
export const LINHAS_ESQUELETO_ANTIGAS = 14
export const LINHAS_GATO_ANTIGAS = 3

export interface Folha { src: string; linha: number; linhas: number }

function folha(indice: number, antigas: number, total: number, src: string, srcPoses: string): Folha {
  return indice < antigas
    ? { src, linha: indice, linhas: antigas }
    : { src: srcPoses, linha: indice - antigas, linhas: total - antigas }
}

/** Folha, linha e número de linhas de um comportamento do esqueleto. */
export function folhaEsqueleto(id: IdLinhaEsqueleto): Folha {
  return folha(LINHAS_ESQUELETO.findIndex((l) => l.id === id), LINHAS_ESQUELETO_ANTIGAS, LINHAS_ESQUELETO.length,
    SPRITE_ESQUELETO.src, '/pixel/mascote/esqueleto-poses.png')
}

/** Folha, linha e número de linhas de um estado do gato. */
export function folhaGato(id: IdLinhaGato): Folha {
  return folha(LINHAS_GATO.findIndex((l) => l.id === id), LINHAS_GATO_ANTIGAS, LINHAS_GATO.length,
    SPRITE_GATO.src, '/pixel/mascote/gato-poses.png')
}

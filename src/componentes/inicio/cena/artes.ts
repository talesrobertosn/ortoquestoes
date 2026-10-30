import type { Grade, Paleta } from '../../../biblioteca/salao/sprites'

/**
 * Pixel art da cena do topo da página inicial (30/10/2026, pedido do Tales com o Octopath Traveler de referência):
 * o residente lendo no acampamento, a barraca, o tronco e os livros. Mesmo formato de grade do salão da Biblioteca
 * (uma letra por cor, "." transparente); o teste fixtures/testar_salao_biblioteca.mjs confere as larguras.
 */

const K = '#1b1208'

export const PALETA_RESIDENTE: Paleta = {
  k: K, h: '#3b2414', s: '#f0c49a', S: '#d49a70', w: '#f4f1ea', W: '#c9c4b8', g: '#4d7fa8', b: '#b8452f', p: '#34445e', e: '#2a1a10', K: '#5a3a22',
}
const CORPO_RESIDENTE = [
  '....kssSSssk....', '......kssk......', '...kkwwwwwwkk...', '..kwwwwggwwwwk..', '..kwkbbbbbbkwk..', '..kskbwwwwbksk..', '..kwkbbbbbbkwk..',
  '..kwwwwwwwwwwk..', '..kppppppppppk..', '..kppppppppppk..', '...kppk..kppk...', '...kppk..kppk...', '...keek..keek...', '...kkkk..kkkk...',
]
const CABELO = ['.....kkkkkk.....', '....khhhhhhk....', '...khhhhhhhhk...', '...khsssssshk...']
/** O residente sentado no tronco, lendo. */
export const RESIDENTE: Grade = [...CABELO, '...kskssssksk...', '...kssssssssk...', ...CORPO_RESIDENTE]
/** Cochilando (segredo: cinco cliques nele). */
export const RESIDENTE_DORMINDO: Grade = [...CABELO, '...ksKKssKKsk...', '...kssssssssk...', ...CORPO_RESIDENTE]

export const PALETA_BARRACA: Paleta = { k: K, g: '#6fa86a', G: '#4a8048', d: '#22301e', r: '#c0392b', m: '#8a5530' }
export const BARRACA: Grade = [
  '.........k.rr...........', '.........krrr...........', '.........k..............',
  '..........kk............', '..........kgGk..........', '.........kgGGgk.........', '........kgGGGGgk........', '.......kgGGkkGGgk.......',
  '......kgGGkddkGGgk......', '.....kgGGkddddkGGgk.....', '....kgGGkddddddkGGgk....', '...kgGGkddddddddkGGgk...',
  '..kgGGkddddddddddkGGgk..', '.kgGGkddddddddddddkGGgk.', 'kkkkkkkkkkkkkkkkkkkkkkkk',
]

export const PALETA_TRONCO: Paleta = { k: K, m: '#7a4a26', l: '#9a6236', y: '#e2b779', w: '#c7955a' }
const linha = (borda: string, miolo: string, n: number, fim: string) => borda + miolo.repeat(n) + fim
export const TRONCO: Grade = [
  '.' + 'k'.repeat(24) + '.',
  linha('k', 'llllm', 4, 'lllwk'),
  linha('k', 'm', 22, 'wyk'),
  linha('k', 'mmlmm', 4, 'mmwyk'),
  '.' + 'k'.repeat(24) + '.',
]

export const PALETA_LIVROS: Paleta = { k: K, r: '#b8452f', b: '#2f6aa8', g: '#3f8a3a', w: '#f4ead2' }
export const LIVROS: Grade = ['..kkkkkk..', '..krrrrk..', '.kkkkkkkk.', '.kbbbbbbk.', 'kkkkkkkkkk', 'kggggggggk', 'kkkkkkkkkk']

export const PALETA_LANTERNA: Paleta = { k: K, m: '#3a2a1a', y: '#f6d27a', Y: '#fff1b8', o: '#f08a2a' }
export const LANTERNA: Grade = ['...kk...', '..kmmk..', '.kkkkkk.', '.kyYYyk.', '.kyoYyk.', '.kYooYk.', '.kyooyk.', '.kyYYyk.', '.kkkkkk.', '..kmmk..', '...kk...']

/** Todos os desenhos, para o teste conferir as grades. */
export const OBJETOS_CENA: Record<string, Grade> = { RESIDENTE, RESIDENTE_DORMINDO, BARRACA, TRONCO, LIVROS, LANTERNA }

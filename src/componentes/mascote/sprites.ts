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
  // Segunda leva (01/11/2026), também fora do sorteio. comemora2 toca uma vez (começa e termina na pose de 'parado').
  { id: 'escrevendo', nome: 'escrevendo no caderno', halloween: false, sorteio: false },
  { id: 'aventureiro', nome: 'de mochila e cajado, pronto para explorar', halloween: false, sorteio: false },
  { id: 'mago2', nome: 'de manto e chapéu de mago', halloween: false, sorteio: false },
  { id: 'quadro', nome: 'mostrando uma dica na lousa', halloween: false, sorteio: false },
  { id: 'fogueira', nome: 'se aquecendo na fogueira', halloween: false, sorteio: false },
  { id: 'carinho', nome: 'fazendo carinho no gato', halloween: false, sorteio: false },
  { id: 'comemora2', nome: 'comemorando a meta do dia', halloween: false, sorteio: false },
  // Tela de entrar (31/10/2026): roupas novas do mesmo mascote, na folha esqueleto-acesso.png (fora do sorteio).
  { id: 'acesso_jaleco', nome: 'de jaleco longo dando boas-vindas', halloween: false, sorteio: false },
  { id: 'acesso_social', nome: 'de blazer e gravata-borboleta dando boas-vindas', halloween: false, sorteio: false },
] as const

export type IdLinhaEsqueleto = (typeof LINHAS_ESQUELETO)[number]['id']

/**
 * Gato: o gato fofo novo (31/10/2026, pedido do Tales: "o gato está muito feio, faz um baita gato fofo e usa em tudo"),
 * de scripts/gerar_gato_fofo.py: public/pixel/mascote/gato-fofo.png, quadros de 64 x 48, as mesmas linhas de antes.
 */
export const SPRITE_GATO = {
  src: '/pixel/mascote/gato-fofo.png?v=1',
  larguraQuadro: 64,
  alturaQuadro: 48,
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
  // Segunda leva (01/11/2026). acordando toca uma vez (começa em 'dormindo' e termina em 'acordado').
  { id: 'observando', nome: 'observando' },
  { id: 'fogueira', nome: 'deitado perto da fogueira' },
  { id: 'ronronando', nome: 'ronronando' },
  { id: 'acordando', nome: 'acordando' },
  // Terceira leva (31/10/2026, Biblioteca 3.0): olhando para cima (para a coruja bibliotecária).
  { id: 'olhando_cima', nome: 'olhando para cima' },
] as const

export type IdLinhaGato = (typeof LINHAS_GATO)[number]['id']

/**
 * As poses de 31/10/2026 em diante ficam numa segunda folha (esqueleto-poses.png, gato-poses.png): a folha de sempre
 * continua leve no topo da página inicial, e a das poses só carrega onde uma pose fixa aparece.
 */
/**
 * Cada leva de poses fica na sua folha: a de sempre (o topo da página inicial, leve), a de 31/10/2026, a segunda
 * leva e as roupas da tela de entrar (esqueleto-acesso.png). Só carrega a folha da pose que aparece. `ate` é o índice (exclusivo) da última linha de cada folha.
 */
export interface Folha { src: string; linha: number; linhas: number }
interface Leva { src: string; ate: number }

const FOLHAS_ESQUELETO: Leva[] = [
  { src: SPRITE_ESQUELETO.src, ate: 14 },
  { src: '/pixel/mascote/esqueleto-poses.png', ate: 23 },
  { src: '/pixel/mascote/esqueleto-poses2.png', ate: 30 },
  { src: '/pixel/mascote/esqueleto-acesso.png', ate: LINHAS_ESQUELETO.length },
]
const FOLHAS_GATO: Leva[] = [
  { src: SPRITE_GATO.src, ate: LINHAS_GATO.length },
]

function folha(indice: number, levas: Leva[]): Folha {
  let inicio = 0
  for (const leva of levas) {
    if (indice < leva.ate) return { src: leva.src, linha: indice - inicio, linhas: leva.ate - inicio }
    inicio = leva.ate
  }
  return { src: levas[0].src, linha: 0, linhas: levas[0].ate }
}

/** Folha, linha e número de linhas de um comportamento do esqueleto. */
export function folhaEsqueleto(id: IdLinhaEsqueleto): Folha {
  return folha(LINHAS_ESQUELETO.findIndex((l) => l.id === id), FOLHAS_ESQUELETO)
}

/** Folha, linha e número de linhas de um estado do gato. */
export function folhaGato(id: IdLinhaGato): Folha {
  return folha(LINHAS_GATO.findIndex((l) => l.id === id), FOLHAS_GATO)
}

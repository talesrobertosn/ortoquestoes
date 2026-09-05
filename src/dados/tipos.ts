/** Modelo de dados do acervo. Espelhado no pipeline de importação (Python). */

export type Letra = 'A' | 'B' | 'C' | 'D' | 'E'

export type Dificuldade = 'facil' | 'medio' | 'dificil'

export type TipoProva = string // "TEOT", "TARO", "SBOT", "Simulado"

export interface Alternativa {
  letra: Letra
  texto: string
}

export interface Imagem {
  arquivo: string
  legenda?: string | null
  largura?: number | null
  altura?: number | null
}

export interface Origem {
  arquivo: string
  pagina: number | null
  numeroOriginal: number | null
}

/**
 * Comentário enviado por um colega e publicado com crédito.
 * Chega por e-mail, é conferido e entra no acervo pela mão do autor do site —
 * não há servidor nem envio automático, o que mantém o site estático e sem
 * moderação automática de conteúdo médico.
 */
export interface ComentarioComunidade {
  texto: string
  autor: string
  especialidade?: string | null
  subespecialidade?: string | null
  centro?: string | null
  referencias?: string[]
  imagens?: Imagem[]
  data?: string | null
}

export interface Questao {
  id: string
  tema: string
  subtemas: string[]
  prova: TipoProva | null
  ano: number | null
  dificuldade: Dificuldade | null
  enunciado: string
  imagens: Imagem[]
  alternativas: Alternativa[]
  gabarito: Letra | null
  comentario: string | null
  comentariosComunidade?: ComentarioComunidade[]
  referencias: string[]
  anulada: boolean
  /** Enunciado se refere a uma figura que não veio no PDF de origem. */
  figuraPendente?: boolean
  revisado: boolean
  /** Subtemas propostos pelo pipeline e ainda não conferidos por humano. */
  subtemasPendentes?: boolean
  origem?: Origem
}

/** Registro leve por questão, presente no índice: sem enunciado, sem alternativas. */
export interface ItemIndice {
  /** id */
  id: string
  /** índice do tema em Indice.temas */
  t: number
  /** índices dos subtemas em Indice.subtemas */
  s: number[]
  /** índice da prova em Indice.provas, ou null */
  p: number | null
  /** ano, ou null */
  a: number | null
  /** dificuldade, ou null */
  d: Dificuldade | null
  /** tem imagem no enunciado */
  img: 0 | 1
  /** anulada */
  an: 0 | 1
  /** tem comentário */
  c: 0 | 1
}

export interface TemaIndice {
  slug: string
  nome: string
  arquivo: string
  total: number
}

export interface Indice {
  versao: number
  geradoEm: string | null
  total: number
  temas: TemaIndice[]
  subtemas: string[]
  provas: string[]
  anos: number[]
  questoes: ItemIndice[]
}

/** Filtros de montagem de sessão. */
export interface Filtros {
  temas: string[]
  subtemas: string[]
  provas: string[]
  anos: number[]
  dificuldades: Dificuldade[]
  comImagem: boolean
  comComentario: boolean
  incluirAnuladas: boolean
  embaralhar: boolean
  limite: number | null
}

export const FILTROS_VAZIOS: Filtros = {
  temas: [],
  subtemas: [],
  provas: [],
  anos: [],
  dificuldades: [],
  comImagem: false,
  comComentario: false,
  incluirAnuladas: false,
  embaralhar: true,
  limite: null,
}

export const ROTULO_DIFICULDADE: Record<Dificuldade, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
}

/** Uma resposta dada dentro de uma sessão. */
export interface Resposta {
  escolhida: Letra
  correta: boolean | null
  segundos: number
}

export interface EstadoSessao {
  id: string
  criadaEm: number
  filtros: Filtros
  ids: string[]
  posicao: number
  respostas: Record<string, Resposta>
  revisar: string[]
  riscadas: Record<string, Letra[]>
  concluidaEm: number | null
}

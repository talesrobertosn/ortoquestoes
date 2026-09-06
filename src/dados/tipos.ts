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

/**
 * Recorte pelo que já aconteceu neste navegador. Não é propriedade da questão
 * e sim do histórico de quem está estudando — por isso mora aqui e não no
 * índice do acervo.
 */
export type Situacao = 'todas' | 'naoRespondidas' | 'erradas' | 'acertadas' | 'favoritas'

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  todas: 'Todas',
  naoRespondidas: 'Não respondidas',
  erradas: 'Que eu errei',
  acertadas: 'Que eu acertei',
  favoritas: 'Favoritas',
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
  situacao: Situacao
  busca: string
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
  situacao: 'todas',
  busca: '',
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
  /**
   * Simulado: o gabarito fica guardado até o fim, como em prova. Sem isso, o
   * modo seria só um cronômetro em cima do treino comum.
   */
  simulado?: boolean
  /** Tempo total do simulado. O relógio corre no mundo, não na aba aberta. */
  limiteSegundos?: number | null
}

/** Quanto falta, em segundos. Negativo quando o tempo acabou. */
export function segundosRestantes(sessao: EstadoSessao, agora = Date.now()): number | null {
  if (!sessao.limiteSegundos) return null
  return Math.round((sessao.criadaEm + sessao.limiteSegundos * 1000 - agora) / 1000)
}

export function formatarDuracao(segundos: number): string {
  const total = Math.max(0, segundos)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const dois = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`
}

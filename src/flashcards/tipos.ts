/**
 * Tipos do Torneio de Flashcards.
 *
 * O formato do flashcard segue docs/flashcards/ARQUITETURA.md. Na frente, as
 * lacunas usam o marcador do Anki, {{c1::termo}}; na explicação, **negrito**.
 * Nenhum dos dois aceita HTML: o texto é montado em elementos React.
 */

export type Raridade = 'comum' | 'rara' | 'epica' | 'lendaria'
export type Dificuldade = 1 | 2 | 3

export interface ImagemFlashcard {
  /** Caminho dentro de public/imagens, igual ao da questão de origem. */
  arquivo: string
  legenda: string
  largura?: number
  altura?: number
}

export interface Flashcard {
  id: string
  /** Questão de origem no acervo (botões "De onde veio" e "Fazer a questão"). */
  questao: string
  area: string
  assunto: string
  tipo: string
  raridade: Raridade
  dificuldade: Dificuldade
  frente: string
  resposta: string
  explicacao: string
  imagem?: ImagemFlashcard
  /** Alternativas da Batalha. A ordem é embaralhada a cada vez que o flashcard aparece. */
  opcoes: string[]
  certa: number
  /** Quando o comentário diverge do gabarito oficial, o flashcard cita a divergência aqui. */
  alerta?: string
  /** Campos da fábrica (scripts/flashcards/fabrica.py). */
  areaId?: string
  subtemas?: string[]
  /** false: alternativas longas demais para a Batalha; o flashcard fica só no Estudo. */
  batalha?: boolean
  prova?: string | null
  ano?: number | null
  /** Hash da questão e do comentário de origem: muda quando a fonte muda. */
  fonte?: string
  /** "autoral": escrito a partir do comentário (scripts/flashcards/autorais.py). Sem o campo: fábrica. */
  origem?: 'autoral'
  /** "simulados": a questão de origem é dos OrtoQuestões Simulados, e não de uma prova oficial. */
  colecao?: 'simulados'
}

/** Resumo publicado pela fábrica (public/flashcards/indice.json). */
export interface IndiceAcervo {
  versao: number
  geradoEm: string
  total: number
  batalha: number
  soEstudo: number
  comImagem: number
  /** Flashcards cuja questão de origem é dos OrtoQuestões Simulados. */
  simulados?: number
  autorais?: number
  quarentena: number
  assinatura: string
  areas: Record<string, { nome: string; arquivo: string; total: number; batalha: number; comImagem: number; simulados?: number; tipos: Record<string, number>; assuntos: Record<string, number> }>
}

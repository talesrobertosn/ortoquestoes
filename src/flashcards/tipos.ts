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
}

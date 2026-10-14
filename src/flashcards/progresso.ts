/**
 * Progresso educacional dos flashcards, separado do progresso das questões:
 * a fila de revisão de flashcards é independente (docs/flashcards/DECISOES.md).
 * O registro tem o mesmo formato do RegistroQuestao e a mesma escada de
 * intervalos. Na Batalha:
 *   - acerto sem ajuda conta como certeza;
 *   - acerto com o Pergaminho da pista conta como dúvida (não vira domínio);
 *   - erro volta para a fila.
 * Por enquanto fica só neste aparelho (localStorage da conta); a sincronização
 * com o Supabase é uma etapa do roteiro.
 */
import { INTERVALOS, proximoRegistro, type RegistroQuestao } from '../estado/revisao'

export const CHAVE_REGISTROS = 'flashcards:registros'
export const CHAVE_PARTIDA = 'flashcards:partida'
/** Torre do Título: a subida em andamento e o último patamar (ponto de retorno ao cair). */
export const CHAVE_PARTIDA_TORRE = 'flashcards:torre'
export const CHAVE_PATAMAR = 'flashcards:torre-patamar'
/** Altar do Saber (cristais e talentos permanentes). */
export const CHAVE_ALTAR = 'flashcards:altar'
/** Bestiário: adversários vistos e vencidos (ids). */
export const CHAVE_BESTIARIO = 'flashcards:bestiario'
export const CHAVE_AJUSTES = 'flashcards:ajustes'
/** Últimos flashcards vistos (mais novo primeiro): a seleção evita repeti-los. */
export const CHAVE_HISTORICO = 'flashcards:historico'
/**
 * Recordes da conta neste aparelho, já no formato que o ranking futuro vai
 * ler: flashcards únicos respondidos (sem contar repetição) e andar mais
 * fundo da masmorra. Vai para o servidor quando a sincronização existir.
 */
export const CHAVE_RECORDES = 'flashcards:recordes'
/** Dificuldade escolhida para as próximas partidas (fácil, normal ou difícil). */
export const CHAVE_NIVEL = 'flashcards:nivel'
/** A pessoa já escolheu entrar com ou sem som (pergunta só na primeira entrada). */
export const CHAVE_SOM_ESCOLHIDO = 'flashcards:som-escolhido'
/**
 * A escolha da primeira entrada ("com som" ou "sem som"), guardada no aparelho.
 * Valores antigos (true) só diziam que a pessoa já escolheu: o som fica nos ajustes.
 */
export type SomEscolhido = 'com' | 'sem' | true | false
export const somPreferido = (v: SomEscolhido): boolean | undefined => (v === 'com' ? true : v === 'sem' ? false : undefined)
const TAMANHO_HISTORICO = 600

export interface Recordes {
  versao: 1
  /** Andar mais fundo alcançado numa partida da Cripta (ranking da Cripta). */
  andarMaximo: number
  /** Andar mais alto da Torre do Título (ranking da Torre). */
  torreMaximo?: number
  /** Vezes que chegou ao topo da Torre. */
  torreConcluida?: number
  partidas: number
  chefesDerrotados: number
  melhorSequencia: number
  /** Respostas na Batalha e no Estudo (com repetição). */
  respostas: number
  atualizadoEm: number
}

export const RECORDES_VAZIOS: Recordes = { versao: 1, andarMaximo: 0, torreMaximo: 0, torreConcluida: 0, partidas: 0, chefesDerrotados: 0, melhorSequencia: 0, respostas: 0, atualizadoEm: 0 }

export interface Bestiario { vistos: string[]; vencidos: string[] }
export const BESTIARIO_VAZIO: Bestiario = { vistos: [], vencidos: [] }

export function lembrarVisto(historico: string[], id: string): string[] {
  return [id, ...historico.filter((x) => x !== id)].slice(0, TAMANHO_HISTORICO)
}

/** Flashcards únicos respondidos: é a medida principal do ranking (repetição não conta). */
export function flashcardsUnicos(registros: Record<string, unknown>): number {
  return Object.keys(registros).length
}

export type RegistroFlashcard = RegistroQuestao & { assistidos?: number }

export function registrarResposta(anterior: RegistroFlashcard | undefined, certo: boolean, assistida: boolean, agora = Date.now()): RegistroFlashcard {
  const confianca = !certo ? 'chute' : assistida ? 'duvida' : 'seguro'
  let novo = proximoRegistro(anterior, certo, agora, confianca)
  // Com a pista, a escada não passa do último degrau: o flashcard volta e nunca sai da fila por um acerto ajudado.
  const degraus = INTERVALOS.duvida.length
  if (certo && assistida && (novo.sequencia ?? 0) > degraus) {
    novo = { ...novo, sequencia: degraus, proximaRevisao: agora + INTERVALOS.duvida[degraus - 1] * 86400000 }
  }
  return { ...novo, assistidos: (anterior?.assistidos ?? 0) + Number(certo && assistida) }
}

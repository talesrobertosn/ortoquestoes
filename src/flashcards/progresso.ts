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
export const CHAVE_AJUSTES = 'flashcards:ajustes'

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

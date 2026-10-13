/**
 * Ponte do Torneio com o servidor (migration 202610130100_flashcards_limite_e_progresso.sql):
 *  - autorizarFlashcard: o limite do plano grátis (10 flashcards por 24 h) é
 *    decidido no servidor; assinante sem limite. O cliente só mostra o aviso.
 *  - sincronizarProgresso: mescla a fila de revisão e os recordes da conta
 *    entre aparelhos (por flashcard, vale a resposta mais recente).
 * Tudo atrás de travas que nascem desligadas: sem VITE_LIMITES_HABILITADOS e
 * VITE_FLASHCARDS_LIMITE, nada é chamado (o recurso segue só pelo link).
 */
import { gravar, ler } from '../estado/armazenamento'
import { LIMITES_HABILITADOS } from '../estado/limiteDiario'
import { chamarRpc } from '../servicos/supabase'
import { CHAVE_RECORDES, CHAVE_REGISTROS, RECORDES_VAZIOS, type Recordes, type RegistroFlashcard } from './progresso'

export const FLASHCARDS_NO_SERVIDOR = LIMITES_HABILITADOS && import.meta.env?.VITE_FLASHCARDS_LIMITE === 'true'

export interface LimiteFlashcard { permitido: boolean; ilimitado: boolean; restantes: number | null; liberaEm: string; motivo?: string; falha?: boolean }

const novaChave = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)))

/** Pede ao servidor para contar este flashcard. Uma chave por resposta (repetir não gasta duas vezes). */
export async function autorizarFlashcard(idFlashcard: string, chave = novaChave()): Promise<LimiteFlashcard> {
  if (!FLASHCARDS_NO_SERVIDOR) return { permitido: true, ilimitado: true, restantes: null, liberaEm: '' }
  try {
    const prazo = new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error('A validação demorou demais.')), 10_000))
    const r = (await Promise.race([chamarRpc<Array<Record<string, unknown>>>('autorizar_flashcard', { p_chave_idempotencia: chave, p_id_flashcard: idFlashcard }), prazo]))[0]
    return { permitido: Boolean(r.permitido), ilimitado: Boolean(r.ilimitado), restantes: r.restantes === null ? null : Number(r.restantes), liberaEm: String(r.libera_em), motivo: r.motivo ? String(r.motivo) : undefined }
  } catch (erro) {
    return { permitido: false, ilimitado: false, restantes: null, liberaEm: '', falha: true, motivo: erro instanceof Error ? erro.message : 'Não foi possível validar.' }
  }
}

/** Mescla dois conjuntos de registros: por flashcard, fica o de resposta mais recente. */
export function mesclarRegistros(a: Record<string, RegistroFlashcard>, b: Record<string, RegistroFlashcard>) {
  const saida = { ...a }
  for (const [id, r] of Object.entries(b)) {
    const atual = saida[id]
    if (!atual || (r.q ?? 0) > (atual.q ?? 0)) saida[id] = r
  }
  return saida
}

export function mesclarRecordes(a: Partial<Recordes>, b: Partial<Recordes>): Recordes {
  const x = { ...RECORDES_VAZIOS, ...a }, y = { ...RECORDES_VAZIOS, ...b }
  return {
    versao: 1, andarMaximo: Math.max(x.andarMaximo, y.andarMaximo), partidas: Math.max(x.partidas, y.partidas),
    chefesDerrotados: Math.max(x.chefesDerrotados, y.chefesDerrotados), melhorSequencia: Math.max(x.melhorSequencia, y.melhorSequencia),
    respostas: Math.max(x.respostas, y.respostas), atualizadoEm: Math.max(x.atualizadoEm, y.atualizadoEm),
  }
}

/** Traz o progresso da conta, mescla com o do aparelho e grava os dois lados. */
export async function sincronizarProgresso(): Promise<boolean> {
  if (!FLASHCARDS_NO_SERVIDOR) return false
  try {
    const [remoto] = await chamarRpc<Array<{ registros: Record<string, RegistroFlashcard>; recordes: Partial<Recordes> }>>('ler_progresso_flashcards', {})
    const registros = mesclarRegistros(ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {}), remoto?.registros ?? {})
    const recordes = mesclarRecordes(ler<Partial<Recordes>>(CHAVE_RECORDES, {}), remoto?.recordes ?? {})
    gravar(CHAVE_REGISTROS, registros)
    gravar(CHAVE_RECORDES, recordes)
    await chamarRpc('salvar_progresso_flashcards', { p_registros: registros, p_recordes: recordes })
    return true
  } catch {
    return false
  }
}

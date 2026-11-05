import type { EnvioHistorico } from '../../../supabase/functions/_shared/cartas'

/**
 * Anti-flood das cartas em lote (Tales, 05/11/2026): quem recebeu e-mail nos últimos N dias fica de fora.
 * Os avisos de pagamento (Pix: faltam 3 dias, termina hoje, recibo, encerramento, relato resolvido) não
 * contam: são notificação do acesso, não carta.
 */
const NAO_CONTA = /pix|pagamento_aprovado|obrigado_tempo|relato_resolvido|alerta_admin|renovacao/
export const contaNoFlood = (e: EnvioHistorico) => e.status !== 'falhou' && !NAO_CONTA.test(`${e.tipo ?? ''} ${e.modelo ?? ''}`)

/** Dias desde o último e-mail que conta (null: nenhum). */
export function diasDesdeUltimo(lista: readonly EnvioHistorico[], agora = Date.now()): number | null {
  const ultimos = lista.filter(contaNoFlood).map(e => new Date(e.em).getTime()).filter(Number.isFinite)
  if (!ultimos.length) return null
  return (agora - Math.max(...ultimos)) / 86_400_000
}

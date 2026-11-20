import { chamarFuncao } from '../../servicos/supabase'

/**
 * Conciliação das cobranças do cartão (20/11/2026). O aviso de pagamento do Mercado Pago nem sempre
 * chega ligado à assinatura; sem ele, a cobrança aprovada não ficava gravada e o "Recebido" do Agora
 * mostrava R$ 0,00. Ao abrir uma tela com dinheiro, o painel pede ao webhook que confira no Mercado
 * Pago as assinaturas no cartão sem cobrança recente gravada. No máximo uma vez a cada 15 minutos por
 * navegador, para não pesar no Mercado Pago nem no Supabase. Só lê o Mercado Pago: nunca cobra.
 */
export interface ResultadoConciliacao { conferidas: number; gravada: number; em_dia: number; sem_cobranca: number; sem_assinatura: number; erro: number }

const CHAVE = 'admin:conciliar-cartoes'
export const INTERVALO_CONCILIACAO = 15 * 60_000

export function conciliacaoVencida(agora = Date.now(), ler: () => string | null = () => localStorage.getItem(CHAVE)) {
  let ultima = 0
  try { ultima = Number(ler() ?? 0) || 0 } catch { ultima = 0 }
  return agora - ultima >= INTERVALO_CONCILIACAO
}

let emCurso: Promise<ResultadoConciliacao | null> | null = null

/** Pede a conciliação se a última foi há mais de 15 minutos. Devolve null quando não pediu ou falhou. */
export function conciliarCartoes({ forcar = false } = {}): Promise<ResultadoConciliacao | null> {
  if (emCurso) return emCurso
  if (!forcar && !conciliacaoVencida()) return Promise.resolve(null)
  try { localStorage.setItem(CHAVE, String(Date.now())) } catch { /* sem armazenamento: segue, só não guarda a hora */ }
  emCurso = chamarFuncao<ResultadoConciliacao>('webhook-mercado-pago?acao=conciliar_cartoes', {}, { prazoMs: 90_000 })
    .catch(() => null)
    .finally(() => { emCurso = null })
  return emCurso
}

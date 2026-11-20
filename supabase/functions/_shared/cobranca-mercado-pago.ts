export interface FaturaMercadoPago {
  id: number | string
  preapproval_id?: string
  debit_date?: string
  date_created?: string
  payment?: { id?: number | string; status?: string }
}

export interface PagamentoMercadoPago {
  id: number | string
  external_reference?: string
  payment_method_id?: string
  transaction_amount?: number
  currency_id?: string
  live_mode?: boolean
  /** Na cobrança de assinatura no cartão, o id da assinatura vem em transaction_data.subscription_id. */
  point_of_interaction?: { type?: string; transaction_data?: { ticket_url?: string; subscription_id?: string } }
  status?: string
  /** Motivo da situação (na recusa: cc_rejected_insufficient_amount, cc_rejected_call_for_authorize…). */
  status_detail?: string
  date_approved?: string | null
  preapproval_id?: string
  subscription_id?: string
  metadata?: { preapproval_id?: string }
}

/**
 * De qual assinatura no cartão é este pagamento. O Mercado Pago não manda o id sempre no mesmo lugar:
 * nas cobranças de assinatura (primeira e renovações) ele costuma vir só em
 * point_of_interaction.transaction_data.subscription_id; sem ler ali, o aviso "payment" era ignorado e a
 * cobrança nunca ficava gravada (20/11/2026: "Recebido" do painel em R$ 0,00 com assinatura anual paga).
 */
export function assinaturaDoPagamento(pagamento: PagamentoMercadoPago): string | null {
  const id = pagamento.preapproval_id ?? pagamento.metadata?.preapproval_id ?? pagamento.subscription_id
    ?? pagamento.point_of_interaction?.transaction_data?.subscription_id
  return id ? String(id) : null
}

export async function consultarMercadoPago<T>(token: string, caminho: string): Promise<T> {
  const resposta = await fetch(`https://api.mercadopago.com/${caminho}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resposta.ok) throw new Error('consulta_mercado_pago_falhou')
  return await resposta.json() as T
}

export const consultarFatura = (token: string, id: string) =>
  consultarMercadoPago<FaturaMercadoPago>(token, `authorized_payments/${encodeURIComponent(id)}`)

export const consultarPagamento = (token: string, id: string) =>
  consultarMercadoPago<PagamentoMercadoPago>(token, `v1/payments/${encodeURIComponent(id)}`)

export async function buscarUltimaFaturaAprovada(token: string, preapprovalId: string) {
  const busca = await consultarMercadoPago<{ results?: FaturaMercadoPago[] }>(
    token,
    `authorized_payments/search?preapproval_id=${encodeURIComponent(preapprovalId)}`,
  )
  const faturas = (busca.results ?? []).filter((fatura) =>
    fatura.preapproval_id === preapprovalId && fatura.payment?.id && fatura.payment.status === 'approved',
  )
  faturas.sort((a, b) => String(b.debit_date ?? b.date_created ?? '').localeCompare(String(a.debit_date ?? a.date_created ?? '')))
  return faturas[0] ?? null
}

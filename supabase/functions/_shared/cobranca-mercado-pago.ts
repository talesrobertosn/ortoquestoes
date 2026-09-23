export interface FaturaMercadoPago {
  id: number | string
  preapproval_id?: string
  debit_date?: string
  date_created?: string
  payment?: { id?: number | string; status?: string }
}

export interface PagamentoMercadoPago {
  id: number | string
  status?: string
  date_approved?: string | null
  preapproval_id?: string
  subscription_id?: string
  metadata?: { preapproval_id?: string }
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

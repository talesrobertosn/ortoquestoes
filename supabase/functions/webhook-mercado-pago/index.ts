import { banco, json } from '../_shared/http.ts'
import { consultarFatura, consultarPagamento, consultarMercadoPago, type PagamentoMercadoPago } from '../_shared/cobranca-mercado-pago.ts'

const planos = {
  mensal: { frequency: 1, transaction_amount: 39.90 },
  semestral: { frequency: 6, transaction_amount: 179.90 },
  anual: { frequency: 12, transaction_amount: 239.90 },
} as const

async function hmacHex(segredo: string, texto: string) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(texto)))].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function igualSeguro(a: string, b: string) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0 }
function planoDaRecorrencia(autoRecurring: unknown) {
  if (!autoRecurring || typeof autoRecurring !== 'object') throw new Error('recorrencia_ausente')
  const recorrencia = autoRecurring as Record<string, unknown>
  if (recorrencia.frequency_type !== 'months' || recorrencia.currency_id !== 'BRL') throw new Error('recorrencia_invalida')
  const frequency = Number(recorrencia.frequency)
  const transactionAmount = Number(recorrencia.transaction_amount)
  for (const [plano, configuracao] of Object.entries(planos)) {
    if (configuracao.frequency === frequency && configuracao.transaction_amount === transactionAmount) return plano
  }
  throw new Error('recorrencia_desconhecida')
}
async function marcarEvento(idEvento: string, status: 'processado' | 'ignorado' | 'erro', erro?: unknown) {
  const resposta = await banco(`eventos_pagamento?provedor=eq.mercado_pago&id_evento=eq.${encodeURIComponent(idEvento)}`, {
    method: 'PATCH', body: JSON.stringify({ status_processamento: status, erro: erro ? String(erro) : null, processado_em: new Date().toISOString() }),
  })
  if (!resposta.ok) throw new Error('atualizacao_evento_falhou')
}
function alteracaoDaCobranca(status: string, pagamento: PagamentoMercadoPago, statusAtual: string) {
  const agora = new Date().toISOString()
  if (status === 'approved') {
    if (!pagamento.date_approved) throw new Error('data_aprovacao_ausente')
    return { status: statusAtual === 'cancelada' || statusAtual === 'reembolsada' ? statusAtual : 'ativa', ultima_cobranca_id: String(pagamento.id), ultima_cobranca_em: pagamento.date_approved, atualizada_em: agora }
  }
  if (status === 'refunded' || status === 'charged_back') return { status: 'reembolsada', cancelar_ao_fim: true, fim_periodo: agora, atualizada_em: agora }
  if (status === 'cancelled') return { status: 'cancelada', fim_periodo: agora, cancelar_ao_fim: true, atualizada_em: agora }
  if (status === 'expired') return { status: 'vencida', fim_periodo: agora, atualizada_em: agora }
  if (status === 'rejected') return { status: 'falha_pagamento', fim_periodo: agora, atualizada_em: agora }
  return null
}

async function assinaturaPorExterno(idExterno: string) {
  const resposta = await banco(`assinaturas?id_externo=eq.${encodeURIComponent(idExterno)}&select=id,status`)
  if (!resposta.ok) throw new Error('consulta_assinatura_falhou')
  const assinaturas = await resposta.json() as Array<{ id: string; status: string }>
  return assinaturas[0] ?? null
}

async function sincronizarPreapproval(idRecurso: string) {
  const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!
  const preapproval = await consultarMercadoPago<Record<string, unknown>>(token, `preapproval/${encodeURIComponent(idRecurso)}`)
  const statusMercadoPago = String(preapproval.status ?? '')
  const status = statusMercadoPago === 'authorized' ? 'ativa'
    : statusMercadoPago === 'cancelled' ? 'cancelada'
      : statusMercadoPago === 'expired' ? 'vencida'
        : statusMercadoPago === 'rejected' ? 'falha_pagamento'
          : statusMercadoPago === 'paused' ? 'pausada' : 'pendente'
  const plano = planoDaRecorrencia(preapproval.auto_recurring)
  const criacao = await banco('assinaturas?on_conflict=id_externo', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({
      id_usuario: preapproval.external_reference,
      id_externo: preapproval.id,
      plano,
      status,
      cancelar_ao_fim: status === 'cancelada',
      inicio_periodo: preapproval.date_created,
      fim_periodo: preapproval.next_payment_date,
      atualizada_em: new Date().toISOString(),
    }),
  })
  if (!criacao.ok) throw new Error('criacao_assinatura_falhou')
  const atual = await assinaturaPorExterno(idRecurso)
  if (!atual) throw new Error('assinatura_nao_encontrada')
  if (atual.status !== 'reembolsada') {
    const atualizacao = await banco(`assinaturas?id_externo=eq.${encodeURIComponent(idRecurso)}&status=neq.reembolsada`, {
      method: 'PATCH', body: JSON.stringify({
        status,
        cancelar_ao_fim: status === 'cancelada',
        inicio_periodo: preapproval.date_created,
        fim_periodo: preapproval.next_payment_date,
        atualizada_em: new Date().toISOString(),
      }),
    })
    if (!atualizacao.ok) throw new Error('atualizacao_assinatura_falhou')
  }
  return statusMercadoPago
}

async function aplicarCobranca(idAssinatura: string, pagamento: PagamentoMercadoPago, idEvento: string) {
  const atual = await assinaturaPorExterno(idAssinatura)
  if (!atual) throw new Error('assinatura_nao_encontrada')
  const alteracao = alteracaoDaCobranca(String(pagamento.status ?? ''), pagamento, atual.status)
  if (!alteracao) return marcarEvento(idEvento, 'ignorado')
  const resposta = await banco(`assinaturas?id_externo=eq.${encodeURIComponent(idAssinatura)}`, {
    method: 'PATCH', body: JSON.stringify(alteracao),
  })
  if (!resposta.ok) throw new Error('atualizacao_cobranca_falhou')
  await marcarEvento(idEvento, 'processado')
}

async function processarPagamento(idRecurso: string, idEvento: string) {
  const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!
  const pagamento = await consultarPagamento(token, idRecurso)
  const idAssinatura = pagamento.preapproval_id ?? pagamento.metadata?.preapproval_id ?? pagamento.subscription_id
  if (!idAssinatura) return marcarEvento(idEvento, 'ignorado')
  await sincronizarPreapproval(String(idAssinatura))
  await aplicarCobranca(String(idAssinatura), pagamento, idEvento)
}

async function processarPagamentoAutorizado(idRecurso: string, idEvento: string) {
  const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!
  const fatura = await consultarFatura(token, idRecurso)
  if (!fatura.preapproval_id || !fatura.payment?.id) return marcarEvento(idEvento, 'ignorado')
  const pagamento = await consultarPagamento(token, String(fatura.payment.id))
  if (String(pagamento.id) !== String(fatura.payment.id)) throw new Error('pagamento_divergente')
  await sincronizarPreapproval(fatura.preapproval_id)
  await aplicarCobranca(fatura.preapproval_id, pagamento, idEvento)
}

async function processarPreapproval(idRecurso: string, idEvento: string) {
  const statusMercadoPago = await sincronizarPreapproval(idRecurso)
  await marcarEvento(idEvento, statusMercadoPago === 'pending' || statusMercadoPago === 'in_process' ? 'ignorado' : 'processado')
}

async function processar(idRecurso: string, idEvento: string, tipo: string) {
  try {
    if (tipo === 'payment') return await processarPagamento(idRecurso, idEvento)
    if (tipo === 'subscription_authorized_payment') return await processarPagamentoAutorizado(idRecurso, idEvento)
    if (tipo === 'subscription_preapproval') return await processarPreapproval(idRecurso, idEvento)
    return await marcarEvento(idEvento, 'ignorado')
  } catch (erro) {
    await marcarEvento(idEvento, 'erro', erro)
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({}, 405)
  if (Deno.env.get('MERCADO_PAGO_INTEGRACAO_VALIDADA') !== 'true') return json({ erro: 'integracao_nao_validada' }, 503)
  const segredo = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET') ?? ''
  const assinatura = req.headers.get('x-signature') ?? '', requestId = req.headers.get('x-request-id') ?? ''
  const partes = Object.fromEntries(assinatura.split(',').map((p) => p.trim().split('=', 2)))
  const url = new URL(req.url), idRecursoOriginal = url.searchParams.get('data.id') ?? ''
  const idRecurso = /^[a-z0-9]+$/i.test(idRecursoOriginal) ? idRecursoOriginal.toLowerCase() : idRecursoOriginal
  const manifesto = [idRecurso && `id:${idRecurso}`, requestId && `request-id:${requestId}`, partes.ts && `ts:${partes.ts}`].filter(Boolean).join(';') + ';'
  const esperado = await hmacHex(segredo, manifesto)
  if (!segredo || !partes.v1 || !igualSeguro(esperado, partes.v1)) return json({ erro: 'assinatura_invalida' }, 401)
  const payload = await req.json(), tipo = String(payload.type ?? ''), idEvento = String(payload.id ?? `${tipo}:${idRecurso}:${partes.ts}`)
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload))).then((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''))
  const insercao = await banco('eventos_pagamento?on_conflict=provedor,id_evento', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify({ id_evento: idEvento, tipo, id_recurso: idRecurso, hash_payload: hash, payload }) })
  const novos = await insercao.json().catch(() => [])
  if (!insercao.ok) return json({ erro: 'registro_evento_falhou' }, 502)
  if (Array.isArray(novos) && novos.length) EdgeRuntime.waitUntil(processar(idRecurso, idEvento, tipo))
  else if (tipo === 'subscription_authorized_payment') {
    const existente = await banco(`eventos_pagamento?provedor=eq.mercado_pago&id_evento=eq.${encodeURIComponent(idEvento)}&select=hash_payload,status_processamento`)
    if (!existente.ok) return json({ erro: 'consulta_evento_falhou' }, 502)
    const [evento] = await existente.json() as Array<{ hash_payload: string; status_processamento: string }>
    if (evento?.hash_payload !== hash) return json({ erro: 'evento_divergente' }, 409)
    if (evento.status_processamento === 'ignorado' || evento.status_processamento === 'erro') EdgeRuntime.waitUntil(processar(idRecurso, idEvento, tipo))
  }
  return json({ recebido: true })
})

import { banco, json } from '../_shared/http.ts'

async function hmacHex(segredo: string, texto: string) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(texto)))].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function igualSeguro(a: string, b: string) { if (a.length !== b.length) return false; let x=0; for(let i=0;i<a.length;i++) x |= a.charCodeAt(i)^b.charCodeAt(i); return x===0 }

async function processar(idRecurso: string, idEvento: string, tipo: string, payload: unknown) {
  const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!
  try {
    if (tipo === 'payment') {
      const respostaPagamento = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(idRecurso)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!respostaPagamento.ok) throw new Error('consulta_pagamento_falhou')
      const pagamento = await respostaPagamento.json()
      const idAssinatura = pagamento.metadata?.preapproval_id ?? pagamento.subscription_id
      if (!idAssinatura) throw new Error('pagamento_sem_assinatura')
      const alteracao = pagamento.status === 'approved'
        ? { status:'ativa', ultima_cobranca_id:String(pagamento.id), ultima_cobranca_em:pagamento.date_approved ?? new Date().toISOString(), atualizada_em:new Date().toISOString() }
        : pagamento.status === 'refunded'
          ? { status:'reembolsada', fim_periodo:new Date().toISOString(), atualizada_em:new Date().toISOString() }
          : { status:'falha_pagamento', fim_periodo:new Date().toISOString(), atualizada_em:new Date().toISOString() }
      await banco(`assinaturas?id_externo=eq.${encodeURIComponent(idAssinatura)}`, { method:'PATCH', body:JSON.stringify(alteracao) })
      await banco(`eventos_pagamento?provedor=eq.mercado_pago&id_evento=eq.${encodeURIComponent(idEvento)}`, { method:'PATCH', body:JSON.stringify({status_processamento:'processado',processado_em:new Date().toISOString()}) })
      return
    }
    if (tipo !== 'subscription_preapproval') throw new Error('tipo_ignorado')
    const resposta = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(idRecurso)}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!resposta.ok) throw new Error('consulta_preapproval_falhou')
    const p = await resposta.json()
    const status = p.status === 'authorized' ? 'ativa' : p.status === 'cancelled' ? 'cancelada' : p.status === 'paused' ? 'pausada' : 'pendente'
    const plano = p.auto_recurring?.frequency === 12 ? 'anual' : p.auto_recurring?.frequency === 6 ? 'semestral' : 'mensal'
    await banco('assinaturas?on_conflict=id_externo', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id_usuario: p.external_reference, id_externo: p.id, plano, status, cancelar_ao_fim: status === 'cancelada', inicio_periodo: p.date_created, fim_periodo: p.next_payment_date, atualizada_em: new Date().toISOString() }) })
    await banco(`eventos_pagamento?provedor=eq.mercado_pago&id_evento=eq.${encodeURIComponent(idEvento)}`, { method: 'PATCH', body: JSON.stringify({ status_processamento: 'processado', processado_em: new Date().toISOString() }) })
  } catch (erro) {
    await banco(`eventos_pagamento?provedor=eq.mercado_pago&id_evento=eq.${encodeURIComponent(idEvento)}`, { method: 'PATCH', body: JSON.stringify({ status_processamento: erro instanceof Error && erro.message==='tipo_ignorado' ? 'ignorado' : 'erro', erro: String(erro), processado_em: new Date().toISOString() }) })
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({}, 405)
  if (Deno.env.get('MERCADO_PAGO_INTEGRACAO_VALIDADA') !== 'true') return json({ erro: 'integracao_nao_validada' }, 503)
  const segredo = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET') ?? ''
  const assinatura = req.headers.get('x-signature') ?? '', requestId = req.headers.get('x-request-id') ?? ''
  const partes = Object.fromEntries(assinatura.split(',').map((p) => p.trim().split('=', 2)))
  const url = new URL(req.url), idRecurso = url.searchParams.get('data.id') ?? ''
  const manifesto = `id:${idRecurso};request-id:${requestId};ts:${partes.ts};`
  const esperado = await hmacHex(segredo, manifesto)
  if (!segredo || !partes.v1 || !igualSeguro(esperado, partes.v1)) return json({ erro: 'assinatura_invalida' }, 401)
  const payload = await req.json(), tipo = String(payload.type ?? ''), idEvento = String(payload.id ?? `${tipo}:${idRecurso}:${partes.ts}`)
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload))).then((b) => [...new Uint8Array(b)].map((x)=>x.toString(16).padStart(2,'0')).join(''))
  const insercao = await banco('eventos_pagamento?on_conflict=provedor,id_evento', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify({ id_evento: idEvento, tipo, id_recurso: idRecurso, hash_payload: hash, payload }) })
  const novos = await insercao.json().catch(() => [])
  if (Array.isArray(novos) && novos.length) EdgeRuntime.waitUntil(processar(idRecurso,idEvento,tipo,payload))
  return json({ recebido: true })
})

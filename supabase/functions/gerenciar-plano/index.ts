import { banco, cors, json, usuarioDoPedido } from '../_shared/http.ts'
import { buscarUltimaFaturaAprovada, consultarMercadoPago, consultarPagamento } from '../_shared/cobranca-mercado-pago.ts'

interface Assinatura {
  id: string
  id_externo: string
  status: string
  ultima_cobranca_id: string | null
  ultima_cobranca_em: string | null
}

async function assinaturaDoUsuario(idUsuario: string, acao: 'cancelar' | 'reembolsar' | 'sincronizar_cobranca') {
  const filtro = acao === 'cancelar' ? 'status=eq.ativa' : 'status=in.(ativa,cancelada,pendente,falha_pagamento,pausada)'
  const ordenacao = acao === 'reembolsar' ? 'ultima_cobranca_em.desc.nullslast' : 'atualizada_em.desc'
  const resposta = await banco(`assinaturas?id_usuario=eq.${encodeURIComponent(idUsuario)}&${filtro}&order=${ordenacao}&limit=1&select=id,id_externo,status,ultima_cobranca_id,ultima_cobranca_em`)
  if (!resposta.ok) throw new Error('consulta_assinatura_falhou')
  const [assinatura] = await resposta.json() as Assinatura[]
  return assinatura ?? null
}

async function atualizarAssinatura(id: string, alteracao: Record<string, unknown>) {
  const resposta = await banco(`assinaturas?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify({ ...alteracao, atualizada_em: new Date().toISOString() }),
  })
  if (!resposta.ok) throw new Error('atualizacao_assinatura_falhou')
}

async function sincronizarCobranca(token: string, assinatura: Assinatura) {
  const fatura = await buscarUltimaFaturaAprovada(token, assinatura.id_externo)
  if (!fatura?.payment?.id) return false
  const pagamento = await consultarPagamento(token, String(fatura.payment.id))
  if (String(pagamento.id) !== String(fatura.payment.id) || pagamento.status !== 'approved' || !pagamento.date_approved) return false
  const preapproval = await consultarMercadoPago<{ status?: string }>(token, `preapproval/${encodeURIComponent(assinatura.id_externo)}`)
  const ativar = assinatura.status !== 'cancelada' && assinatura.status !== 'reembolsada' && preapproval.status === 'authorized'
  if (assinatura.ultima_cobranca_id !== String(pagamento.id)
    || Date.parse(assinatura.ultima_cobranca_em ?? '') !== Date.parse(pagamento.date_approved)
    || (ativar && assinatura.status !== 'ativa')) {
    await atualizarAssinatura(assinatura.id, {
      ultima_cobranca_id: String(pagamento.id),
      ultima_cobranca_em: pagamento.date_approved,
      ...(ativar ? { status: 'ativa' } : {}),
    })
  }
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json({ erro: 'metodo_invalido' }, 405, req)
  try {
    const usuario = await usuarioDoPedido(req)
    const { acao } = await req.json() as { acao?: 'cancelar' | 'reembolsar' | 'sincronizar_cobranca' }
    if (!acao || !['cancelar', 'reembolsar', 'sincronizar_cobranca'].includes(acao)) return json({ erro: 'acao_invalida' }, 400, req)
    if (Deno.env.get('MERCADO_PAGO_INTEGRACAO_VALIDADA') !== 'true') return json({ erro: 'integracao_nao_validada' }, 503, req)
    const assinatura = await assinaturaDoUsuario(usuario.id, acao)
    if (!assinatura) return json({ erro: 'assinatura_nao_encontrada' }, 404, req)
    const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!

    if (acao === 'sincronizar_cobranca') {
      const encontrada = await sincronizarCobranca(token, assinatura)
      return json({ ok: true, cobranca_encontrada: encontrada }, 200, req)
    }

    if (acao === 'reembolsar') {
      if (assinatura.status !== 'ativa' && assinatura.status !== 'cancelada') return json({ erro: 'assinatura_nao_reembolsavel' }, 409, req)
      if (!assinatura.ultima_cobranca_id || !assinatura.ultima_cobranca_em) return json({ erro: 'cobranca_aprovada_nao_encontrada' }, 409, req)
      const idade = Date.now() - new Date(assinatura.ultima_cobranca_em).getTime()
      if (!Number.isFinite(idade) || idade < 0 || idade > 7 * 864e5) return json({ erro: 'prazo_de_garantia_encerrado' }, 409, req)
      const pagamento = await consultarPagamento(token, assinatura.ultima_cobranca_id)
      if (!['approved', 'refunded'].includes(String(pagamento.status)) || String(pagamento.id) !== assinatura.ultima_cobranca_id
        || !pagamento.date_approved || Date.parse(pagamento.date_approved) !== Date.parse(assinatura.ultima_cobranca_em)) {
        return json({ erro: 'cobranca_aprovada_nao_confirmada' }, 409, req)
      }
      if (pagamento.status === 'approved') {
        const reembolso = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(assinatura.ultima_cobranca_id)}/refunds`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `garantia-${assinatura.id}-${assinatura.ultima_cobranca_id}` },
        })
        if (!reembolso.ok) {
          const resposta = await reembolso.json().catch(() => ({})) as { error?: unknown; cause?: Array<{ code?: unknown }> }
          const codigo = typeof resposta.error === 'string' && /^[a-z0-9_-]{1,80}$/i.test(resposta.error) ? resposta.error : null
          const causa = resposta.cause?.find((item) => typeof item.code === 'string' && /^[a-z0-9_-]{1,80}$/i.test(item.code))?.code
          const detalhe = Deno.env.get('MERCADO_PAGO_AMBIENTE') === 'teste'
            ? `_http_${reembolso.status}${codigo ? `_erro_${codigo}` : ''}${causa ? `_causa_${causa}` : ''}` : ''
          return json({ erro: `reembolso_nao_confirmado${detalhe}` }, 502, req)
        }
      }
    } else if (assinatura.status !== 'ativa') {
      return json({ erro: 'plano_ativo_nao_encontrado' }, 404, req)
    }

    const preapproval = await consultarMercadoPago<{ status?: string }>(token, `preapproval/${encodeURIComponent(assinatura.id_externo)}`)
    if (preapproval.status !== 'cancelled') {
      const cancelamento = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(assinatura.id_externo)}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!cancelamento.ok) return json({ erro: 'cancelamento_nao_confirmado' }, 502, req)
    }

    const agora = new Date().toISOString()
    await atualizarAssinatura(assinatura.id, acao === 'reembolsar'
      ? { status: 'reembolsada', cancelar_ao_fim: true, fim_periodo: agora, cancelada_em: agora }
      : { cancelar_ao_fim: true, cancelada_em: agora })
    return json({ ok: true, garantia: acao === 'reembolsar' }, 200, req)
  } catch (erro) {
    const codigo = erro instanceof Error && erro.message === 'autenticacao_necessaria' ? 401 : 502
    return json({ erro: erro instanceof Error ? erro.message : 'erro_inesperado' }, codigo, req)
  }
})

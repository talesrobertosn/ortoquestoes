import { banco, cors, json, usuarioDoPedido } from '../_shared/http.ts'

const planos = {
  mensal: { reason: 'OrtoQuestoes Mensal', frequency: 1, transaction_amount: 39.90 },
  semestral: { reason: 'OrtoQuestoes Semestral', frequency: 6, transaction_amount: 179.90 },
  anual: { reason: 'OrtoQuestoes Anual', frequency: 12, transaction_amount: 239.90 },
} as const

async function contaTesteAtiva(idUsuario: string) {
  const resposta = await banco(`contas_teste?id_usuario=eq.${encodeURIComponent(idUsuario)}&ativa=eq.true&select=id_usuario`)
  if (!resposta.ok) throw new Error('consulta_conta_teste_falhou')
  return (await resposta.json() as unknown[]).length > 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json({ erro: 'metodo_invalido' }, 405, req)
  try {
    const usuario = await usuarioDoPedido(req)
    const { plano } = await req.json() as { plano?: keyof typeof planos }
    if (!plano || !planos[plano]) return json({ erro: 'plano_invalido' }, 400, req)
    if (Deno.env.get('PAGAMENTOS_HABILITADOS') !== 'true' || Deno.env.get('MERCADO_PAGO_INTEGRACAO_VALIDADA') !== 'true') {
      return json({ erro: 'Os pagamentos ainda não estão disponíveis.' }, 503, req)
    }

    const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    const origem = Deno.env.get('APP_ORIGIN')
    const ambiente = Deno.env.get('MERCADO_PAGO_AMBIENTE')
    if (ambiente !== 'teste' && ambiente !== 'producao') return json({ erro: 'checkout_nao_configurado' }, 503, req)
    const payerEmail = ambiente === 'teste' ? Deno.env.get('MERCADO_PAGO_PAYER_EMAIL_TESTE') : usuario.email
    if (!token || !origem || !payerEmail) return json({ erro: 'checkout_nao_configurado' }, 503, req)
    const restritoContasTeste = ambiente === 'teste' || Deno.env.get('MERCADO_PAGO_RESTRITO_CONTAS_TESTE') !== 'false'
    if (restritoContasTeste && !await contaTesteAtiva(usuario.id)) return json({ erro: 'checkout_requer_conta_teste' }, 403, req)

    const resposta = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        reason: planos[plano].reason,
        external_reference: usuario.id,
        payer_email: payerEmail,
        back_url: `${origem.replace(/\/$/, '')}/#/assinatura`,
        status: 'pending',
        auto_recurring: {
          frequency: planos[plano].frequency,
          frequency_type: 'months',
          transaction_amount: planos[plano].transaction_amount,
          currency_id: 'BRL',
        },
      }),
    })
    const dados = await resposta.json()
    if (!resposta.ok || !dados.init_point) return json({ erro: 'mercado_pago_recusou_checkout' }, 502, req)
    return json({ url: dados.init_point }, 200, req)
  } catch (erro) {
    return json({ erro: erro instanceof Error ? erro.message : 'erro_interno' }, 401, req)
  }
})

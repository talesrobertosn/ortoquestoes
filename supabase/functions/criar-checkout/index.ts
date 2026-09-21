import { banco, cors, json, usuarioDoPedido } from '../_shared/http.ts'

const planos = {
  mensal: 'MERCADO_PAGO_PLANO_MENSAL_ID',
  semestral: 'MERCADO_PAGO_PLANO_SEMESTRAL_ID',
  anual: 'MERCADO_PAGO_PLANO_ANUAL_ID',
} as const

async function contaTesteAtiva(idUsuario: string) {
  const resposta = await banco(`contas_teste?id_usuario=eq.${encodeURIComponent(idUsuario)}&ativa=eq.true&select=id_usuario`)
  if (!resposta.ok) throw new Error('consulta_conta_teste_falhou')
  return (await resposta.json() as unknown[]).length > 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ erro: 'metodo_invalido' }, 405)
  try {
    const usuario = await usuarioDoPedido(req)
    const { plano } = await req.json() as { plano?: keyof typeof planos }
    if (!plano || !planos[plano]) return json({ erro: 'plano_invalido' }, 400)
    if (Deno.env.get('PAGAMENTOS_HABILITADOS') !== 'true' || Deno.env.get('MERCADO_PAGO_INTEGRACAO_VALIDADA') !== 'true') {
      return json({ erro: 'Os pagamentos ainda não estão disponíveis.' }, 503)
    }

    const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    const origem = Deno.env.get('APP_ORIGIN')
    const ambiente = Deno.env.get('MERCADO_PAGO_AMBIENTE')
    const preapprovalPlanId = Deno.env.get(planos[plano])
    if (!token || !origem || !preapprovalPlanId || !usuario.email) return json({ erro: 'checkout_nao_configurado' }, 503)
    if (ambiente === 'teste' && !await contaTesteAtiva(usuario.id)) return json({ erro: 'checkout_sandbox_requer_conta_teste' }, 403)

    const resposta = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        preapproval_plan_id: preapprovalPlanId,
        external_reference: usuario.id,
        payer_email: usuario.email,
        back_url: `${origem.replace(/\/$/, '')}/#/assinatura`,
        status: 'pending',
      }),
    })
    const dados = await resposta.json()
    if (!resposta.ok || !dados.init_point) return json({ erro: 'mercado_pago_recusou_checkout' }, 502)
    return json({ url: dados.init_point })
  } catch (erro) {
    return json({ erro: erro instanceof Error ? erro.message : 'erro_interno' }, 401)
  }
})

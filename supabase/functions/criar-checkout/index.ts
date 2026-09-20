import { cors, json, usuarioDoPedido } from '../_shared/http.ts'

const planos = {
  mensal: { valor: 39.90, frequencia: 1, rotulo: 'Plano mensal OrtoQuestões' },
  semestral: { valor: 179.90, frequencia: 6, rotulo: 'Plano semestral OrtoQuestões' },
  anual: { valor: 239.90, frequencia: 12, rotulo: 'Plano anual OrtoQuestões' },
} as const

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
    if (!token || !usuario.email) return json({ erro: 'checkout_nao_configurado' }, 503)
    const escolhido = planos[plano]
    const resposta = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ reason: escolhido.rotulo, external_reference: usuario.id, payer_email: usuario.email, back_url: `${Deno.env.get('APP_ORIGIN')}/#/assinatura`, auto_recurring: { frequency: escolhido.frequencia, frequency_type: 'months', transaction_amount: escolhido.valor, currency_id: 'BRL' }, status: 'pending' }),
    })
    const dados = await resposta.json()
    if (!resposta.ok || !dados.init_point) return json({ erro: 'mercado_pago_recusou_checkout' }, 502)
    return json({ url: dados.init_point })
  } catch (erro) { return json({ erro: erro instanceof Error ? erro.message : 'erro_interno' }, 401) }
})

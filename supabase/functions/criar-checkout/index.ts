import { banco, cors, json, usuarioDoPedido } from '../_shared/http.ts'
import { PRECOS, centavosPara } from '../_shared/precos.ts'

// O valor vem de precos.ts: o novo, ou o antigo para quem já pagou antes do reajuste.
const planos = {
  mensal: { reason: 'OrtoQuestoes Mensal', frequency: PRECOS.mensal.meses },
  semestral: { reason: 'OrtoQuestoes Semestral', frequency: PRECOS.semestral.meses },
  anual: { reason: 'OrtoQuestoes Anual', frequency: PRECOS.anual.meses },
} as const
// A primeira é a vigente; as seguintes continuam aceitas por algum tempo para
// quem abriu a página de planos antes da atualização. O aceite registra a versão
// que a pessoa de fato viu.
const versoesCondicoesAceitas = ['2026-11-07', '2026-10-16', '2026-10-01', '2026-09-30', '2026-09-28', '2026-09-27']

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
    const { plano, aceite_termos_versao, aceite_confirmado } = await req.json() as {
      plano?: keyof typeof planos
      aceite_termos_versao?: string
      aceite_confirmado?: boolean
    }
    if (!plano || !planos[plano]) return json({ erro: 'plano_invalido' }, 400, req)
    if (aceite_confirmado !== true || !aceite_termos_versao || !versoesCondicoesAceitas.includes(aceite_termos_versao)) {
      return json({ erro: 'Atualize a página para revisar e aceitar as condições atuais da assinatura.' }, 400, req)
    }
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

    // Renovação pelo cartão de quem está num Pix (28/10/2026): nos 7 dias finais do Pix, a
    // assinatura no cartão nasce com a primeira cobrança marcada para o fim do período já pago,
    // então nenhum dia se perde e nada é cobrado em dobro. Com um cartão vigente, não há o que renovar.
    const vigentesResp = await banco(`assinaturas?id_usuario=eq.${encodeURIComponent(usuario.id)}&status=eq.ativa&fim_periodo=gt.${encodeURIComponent(new Date().toISOString())}&select=id_externo,fim_periodo`)
    if (!vigentesResp.ok) throw new Error('consulta_assinatura_falhou')
    const vigentes = await vigentesResp.json() as Array<{ id_externo: string | null; fim_periodo: string | null }>
    let inicioCobranca: string | null = null
    if (vigentes.length) {
      if (!vigentes.every((a) => a.id_externo?.startsWith('pix:') && a.fim_periodo)) return json({ erro: 'Você já tem uma assinatura no cartão em andamento.' }, 409, req)
      const fimPix = Math.max(...vigentes.map((a) => Date.parse(a.fim_periodo as string)))
      if (fimPix - Date.now() > 7 * 864e5) return json({ erro: 'A renovação abre nos 7 dias antes do fim do seu Pix, e os dias que faltam continuam valendo.' }, 409, req)
      inicioCobranca = new Date(fimPix).toISOString()
    }

    const centavos = await centavosPara(usuario.id, plano)
    const aceite = await banco('aceites_assinatura', {
      method: 'POST',
      body: JSON.stringify({
        id_usuario: usuario.id,
        versao: aceite_termos_versao,
        plano,
        valor_centavos: centavos,
        periodicidade_meses: planos[plano].frequency,
      }),
    })
    if (!aceite.ok) return json({ erro: 'Não foi possível registrar o aceite das condições. Tente novamente.' }, 503, req)

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
          transaction_amount: centavos / 100,
          currency_id: 'BRL',
          ...(inicioCobranca ? { start_date: inicioCobranca } : {}),
        },
      }),
    })
    const dados = await resposta.json()
    if (!resposta.ok || !dados.init_point) return json({ erro: 'mercado_pago_recusou_checkout' }, 502, req)
    // `inicio_cobranca` diz à página que esta versão marcou a primeira cobrança no fim do Pix.
    return json({ url: dados.init_point, inicio_cobranca: inicioCobranca }, 200, req)
  } catch (erro) {
    return json({ erro: erro instanceof Error ? erro.message : 'erro_interno' }, 401, req)
  }
})

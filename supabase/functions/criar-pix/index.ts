import { banco, cors, json, usuarioDoPedido } from '../_shared/http.ts'
import { PLANOS_PIX, cpfValido, consultarPixDoUsuario, validarPagamentoPix, type PedidoPix } from '../_shared/pix.ts'
import { consultarPagamento } from '../_shared/cobranca-mercado-pago.ts'

// A primeira é a vigente; a anterior continua aceita para quem abriu os planos antes da
// atualização (o aceite registra a versão que a pessoa de fato viu).
const VERSOES_CONDICOES_PIX = ['2026-10-16', '2026-10-01']

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json({ erro: 'metodo_invalido' }, 405, req)
  try {
    const usuario = await usuarioDoPedido(req)
    const body = await req.json() as { plano?: keyof typeof PLANOS_PIX; cpf?: string; aceite_confirmado?: boolean; aceite_termos_versao?: string; pedido_id?: string }
    if (Deno.env.get('PAGAMENTOS_HABILITADOS') !== 'true' || Deno.env.get('MERCADO_PAGO_INTEGRACAO_VALIDADA') !== 'true') return json({ erro: 'O pagamento por Pix ainda não está disponível.' }, 503, req)
    const ambiente = Deno.env.get('MERCADO_PAGO_AMBIENTE')
    const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    if (!token || !['teste','producao'].includes(ambiente ?? '')) return json({ erro: 'checkout_nao_configurado' }, 503, req)
    if (ambiente === 'teste' || Deno.env.get('MERCADO_PAGO_RESTRITO_CONTAS_TESTE') !== 'false') {
      const r = await banco(`contas_teste?id_usuario=eq.${encodeURIComponent(usuario.id)}&ativa=eq.true&select=id_usuario`)
      if (!r.ok) throw new Error('consulta_conta_teste_falhou')
      if (!(await r.json()).length) return json({ erro: 'checkout_requer_conta_teste' }, 403, req)
    }
    if (body.pedido_id) {
      const resultado = await consultarPixDoUsuario(usuario.id, body.pedido_id)
      return json({ status: resultado.status }, 200, req)
    }
    const plano = body.plano && PLANOS_PIX[body.plano]
    if (!plano) return json({ erro: 'plano_invalido' }, 400, req)
    if (body.aceite_confirmado !== true || !VERSOES_CONDICOES_PIX.includes(body.aceite_termos_versao ?? '')) return json({ erro: 'Atualize a página e aceite as condições do pagamento por Pix.' }, 400, req)
    if (typeof body.cpf !== 'string' || !cpfValido(body.cpf)) return json({ erro: 'Informe um CPF válido para o pagamento.' }, 400, req)
    const email = ambiente === 'teste' ? Deno.env.get('MERCADO_PAGO_PAYER_EMAIL_TESTE') : usuario.email
    if (!email) return json({ erro: 'checkout_nao_configurado' }, 503, req)
    // Renovação antecipada: com um Pix terminando nos próximos 7 dias, pode pagar o
    // próximo agora. confirmar_pagamento_pix começa o período novo no fim do atual,
    // então nenhum dia se perde. Cartão vigente ou Pix longe do fim continuam barrados.
    const ativo = await banco(`assinaturas?id_usuario=eq.${encodeURIComponent(usuario.id)}&status=in.(ativa,cancelada)&or=(fim_periodo.is.null,fim_periodo.gt.${encodeURIComponent(new Date().toISOString())})&select=id_externo,fim_periodo`)
    if (!ativo.ok) throw new Error('consulta_assinatura_falhou')
    const vigentes = await ativo.json() as Array<{ id_externo: string | null; fim_periodo: string | null }>
    const limiteRenovacao = Date.now() + 7 * 864e5
    const podeRenovar = vigentes.every((a) => a.id_externo?.startsWith('pix:') && a.fim_periodo && Date.parse(a.fim_periodo) <= limiteRenovacao)
    if (vigentes.length && !podeRenovar) return json({ erro: 'Você já tem um período pago vigente. A renovação pelo Pix abre nos 7 dias antes do fim, e os dias que faltam continuam valendo.' }, 409, req)
    // Expiração local só libera outro pedido; jamais ativa ou revoga acesso.
    const expirar = await banco(`pedidos_pix?id_usuario=eq.${encodeURIComponent(usuario.id)}&status=in.(criando,pending)&expira_em=lt.${encodeURIComponent(new Date().toISOString())}`, { method: 'PATCH', body: JSON.stringify({ status: 'expired' }) })
    if (!expirar.ok) throw new Error('consulta_pix_falhou')
    const abertos = await banco(`pedidos_pix?id_usuario=eq.${encodeURIComponent(usuario.id)}&status=in.(criando,pending)&select=*&limit=1`)
    if (!abertos.ok) throw new Error('consulta_pix_falhou')
    let [pedido] = await abertos.json() as PedidoPix[]
    if (pedido && pedido.plano !== body.plano) return json({ erro: 'Já existe um Pix pendente para outro plano. Aguarde o vencimento ou conclua aquele pagamento.' }, 409, req)
    if (!pedido) {
      const aceite = await banco('aceites_assinatura', { method: 'POST', body: JSON.stringify({ id_usuario: usuario.id, plano: body.plano, versao: body.aceite_termos_versao, valor_centavos: plano.centavos, periodicidade_meses: plano.meses, meio_pagamento: 'pix' }) })
      if (!aceite.ok) throw new Error('aceite_pix_falhou')
      const inserir = await banco('pedidos_pix', { method: 'POST', body: JSON.stringify({ id_usuario: usuario.id, plano: body.plano, valor_centavos: plano.centavos, meses: plano.meses }) })
      if (!inserir.ok) return json({ erro: 'Já existe um pedido em andamento. Tente novamente para recuperar o Pix.' }, 409, req)
      ;[pedido] = await inserir.json() as PedidoPix[]
    }
    let pagamento
    if (pedido.pagamento_id) pagamento = await consultarPagamento(token, pedido.pagamento_id)
    else {
      const r = await fetch('https://api.mercadopago.com/v1/payments', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `pix-${pedido.id}` }, body: JSON.stringify({ transaction_amount: pedido.valor_centavos / 100, description: `OrtoQuestões ${pedido.plano} — ${pedido.meses} mês(es), sem renovação automática`, payment_method_id: 'pix', external_reference: `pix:${pedido.id}`, date_of_expiration: new Date(pedido.expira_em).toISOString(), payer: { email, identification: { type: 'CPF', number: body.cpf.replace(/\D/g, '') } } }) })
      if (!r.ok) {
        const resposta = await r.json().catch(() => ({})) as { error?: unknown; cause?: Array<{ code?: unknown }> }
        const seguro = (valor: unknown) => (typeof valor === 'string' || typeof valor === 'number') && /^[a-z0-9_-]{1,80}$/i.test(String(valor)) ? String(valor) : null
        const codigo = seguro(resposta.error)
        const causas = Array.isArray(resposta.cause) ? resposta.cause.map(item => seguro(item.code)).filter(Boolean).slice(0, 5) : []
        // Nunca registrar CPF, email, token nem a resposta completa do provedor.
        console.error('mercado_pago_pix_recusado', { http_status: r.status, codigo, causas, pedido_id: pedido.id })
        const referencia = [codigo, ...causas].filter(Boolean).join('/') || `HTTP ${r.status}`
        return json({ erro: `O Mercado Pago recusou a geração do Pix (${referencia}). Nenhuma cobrança foi confirmada.` }, 502, req)
      }
      pagamento = await r.json()
      const salvar = await banco(`pedidos_pix?id=eq.${pedido.id}&pagamento_id=is.null&status=eq.criando`, { method: 'PATCH', body: JSON.stringify({ pagamento_id: String(pagamento.id), status: 'pending' }) })
      if (!salvar.ok) throw new Error('registro_pix_falhou')
    }
    validarPagamentoPix(pedido, pagamento, ambiente!)
    const url = pagamento.point_of_interaction?.transaction_data?.ticket_url
    if (typeof url !== 'string' || new URL(url).protocol !== 'https:' || new URL(url).hostname !== 'www.mercadopago.com.br') throw new Error('link_pix_invalido')
    // QR Code e Pix Copia e Cola, para pagar sem sair da página (16/10/2026). Opcionais: se o
    // Mercado Pago não devolver ou vierem em formato inesperado, a página usa só o link acima.
    const dadosPix = pagamento.point_of_interaction?.transaction_data ?? {}
    const qr_code = typeof dadosPix.qr_code === 'string' && dadosPix.qr_code.length <= 1024 && dadosPix.qr_code.startsWith('000201') ? dadosPix.qr_code : undefined
    const qr_code_base64 = typeof dadosPix.qr_code_base64 === 'string' && dadosPix.qr_code_base64.length <= 200_000 && /^[A-Za-z0-9+/=]+$/.test(dadosPix.qr_code_base64) ? dadosPix.qr_code_base64 : undefined
    return json({ url, pedido_id: pedido.id, expira_em: pedido.expira_em, qr_code, qr_code_base64 }, 200, req)
  } catch (erro) {
    return json({ erro: erro instanceof Error ? erro.message : 'erro_pix' }, erro instanceof Error && erro.message === 'autenticacao_necessaria' ? 401 : 502, req)
  }
})

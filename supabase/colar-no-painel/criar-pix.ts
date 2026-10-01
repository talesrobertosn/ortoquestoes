// @ts-nocheck
// Arquivo gerado por scripts/juntar-funcoes.mjs: a função inteira num arquivo só, para colar no editor do painel do Supabase.

// supabase/functions/_shared/http.ts
var origemConfigurada = Deno.env.get("APP_ORIGIN") ?? "https://ortoquestoes.com.br";
var origensSandbox = /* @__PURE__ */ new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);
function cors(req) {
  const origem = req?.headers.get("origin");
  const checkoutRestrito = Deno.env.get("MERCADO_PAGO_RESTRITO_CONTAS_TESTE") === "true";
  const permitirOrigemLocal = (Deno.env.get("MERCADO_PAGO_AMBIENTE") === "teste" || checkoutRestrito) && origem && origensSandbox.has(origem);
  return {
    "Access-Control-Allow-Origin": permitirOrigemLocal ? origem : origemConfigurada,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Content-Type": "application/json"
  };
}
var json = (dados, status = 200, req) => new Response(JSON.stringify(dados), { status, headers: cors(req) });
async function usuarioDoPedido(req) {
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: req.headers.get("authorization") ?? "" } });
  if (!r.ok) throw new Error("autenticacao_necessaria");
  return await r.json();
}
async function banco(caminho, init = {}) {
  const base = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return fetch(`${base}/rest/v1/${caminho}`, { ...init, headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers ?? {} } });
}

// supabase/functions/_shared/cobranca-mercado-pago.ts
async function consultarMercadoPago(token, caminho) {
  const resposta = await fetch(`https://api.mercadopago.com/${caminho}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resposta.ok) throw new Error("consulta_mercado_pago_falhou");
  return await resposta.json();
}
var consultarPagamento = (token, id) => consultarMercadoPago(token, `v1/payments/${encodeURIComponent(id)}`);

// supabase/functions/_shared/pix.ts
var PLANOS_PIX = {
  mensal: { meses: 1, centavos: 3990 },
  semestral: { meses: 6, centavos: 17990 },
  anual: { meses: 12, centavos: 23990 }
};
function cpfValido(valor) {
  const cpf = valor.replace(/\D/g, "");
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let tamanho = 9; tamanho <= 10; tamanho++) {
    const soma = [...cpf.slice(0, tamanho)].reduce((s, n, i) => s + Number(n) * (tamanho + 1 - i), 0);
    const digito = soma * 10 % 11 % 10;
    if (digito !== Number(cpf[tamanho])) return false;
  }
  return true;
}
function validarPagamentoPix(pedido, pagamento, ambiente) {
  if (pagamento.external_reference !== `pix:${pedido.id}` || pagamento.payment_method_id !== "pix" || pagamento.currency_id !== "BRL" || Math.round(Number(pagamento.transaction_amount) * 100) !== pedido.valor_centavos || pagamento.live_mode !== (ambiente === "producao") || pedido.pagamento_id && String(pagamento.id) !== pedido.pagamento_id) throw new Error("pagamento_pix_divergente");
  const plano = PLANOS_PIX[pedido.plano];
  if (!plano || plano.centavos !== pedido.valor_centavos || plano.meses !== pedido.meses) throw new Error("pedido_pix_invalido");
}
async function sincronizarPix(pagamento) {
  const referencia = String(pagamento.external_reference ?? "");
  if (!/^pix:[0-9a-f-]{36}$/i.test(referencia)) throw new Error("referencia_pix_invalida");
  const resposta = await banco(`pedidos_pix?id=eq.${encodeURIComponent(referencia.slice(4))}&select=*`);
  if (!resposta.ok) throw new Error("consulta_pix_falhou");
  const [pedido] = await resposta.json();
  if (!pedido) throw new Error("pedido_pix_nao_encontrado");
  validarPagamentoPix(pedido, pagamento, Deno.env.get("MERCADO_PAGO_AMBIENTE") ?? "");
  const atualizacao = await banco("rpc/confirmar_pagamento_pix", {
    method: "POST",
    body: JSON.stringify({
      p_pedido: pedido.id,
      p_pagamento: String(pagamento.id),
      p_status: pagamento.status,
      p_aprovado_em: pagamento.date_approved ?? null
    })
  });
  if (!atualizacao.ok) throw new Error("confirmacao_pix_falhou");
  return { pedido, status: await atualizacao.json() };
}
async function consultarPixDoUsuario(idUsuario, idPedido) {
  const consulta = await banco(`pedidos_pix?id=eq.${encodeURIComponent(idPedido)}&id_usuario=eq.${encodeURIComponent(idUsuario)}&select=*`);
  if (!consulta.ok) throw new Error("consulta_pix_falhou");
  const [pedido] = await consulta.json();
  if (!pedido) throw new Error("pedido_pix_nao_encontrado");
  if (!pedido.pagamento_id) return { pedido, status: pedido.status };
  const pagamento = await consultarPagamento(Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN"), pedido.pagamento_id);
  return sincronizarPix(pagamento);
}

// supabase/functions/criar-pix/index.ts
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json({ erro: "metodo_invalido" }, 405, req);
  try {
    const usuario = await usuarioDoPedido(req);
    const body = await req.json();
    if (Deno.env.get("PAGAMENTOS_HABILITADOS") !== "true" || Deno.env.get("MERCADO_PAGO_INTEGRACAO_VALIDADA") !== "true") return json({ erro: "O pagamento por Pix ainda n\xE3o est\xE1 dispon\xEDvel." }, 503, req);
    const ambiente = Deno.env.get("MERCADO_PAGO_AMBIENTE");
    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!token || !["teste", "producao"].includes(ambiente ?? "")) return json({ erro: "checkout_nao_configurado" }, 503, req);
    if (ambiente === "teste" || Deno.env.get("MERCADO_PAGO_RESTRITO_CONTAS_TESTE") !== "false") {
      const r = await banco(`contas_teste?id_usuario=eq.${encodeURIComponent(usuario.id)}&ativa=eq.true&select=id_usuario`);
      if (!r.ok) throw new Error("consulta_conta_teste_falhou");
      if (!(await r.json()).length) return json({ erro: "checkout_requer_conta_teste" }, 403, req);
    }
    if (body.pedido_id) {
      const resultado = await consultarPixDoUsuario(usuario.id, body.pedido_id);
      return json({ status: resultado.status }, 200, req);
    }
    const plano = body.plano && PLANOS_PIX[body.plano];
    if (!plano) return json({ erro: "plano_invalido" }, 400, req);
    if (body.aceite_confirmado !== true || body.aceite_termos_versao !== "2026-10-01") return json({ erro: "Atualize a p\xE1gina e aceite as condi\xE7\xF5es do pagamento por Pix." }, 400, req);
    if (typeof body.cpf !== "string" || !cpfValido(body.cpf)) return json({ erro: "Informe um CPF v\xE1lido para o pagamento." }, 400, req);
    const email = ambiente === "teste" ? Deno.env.get("MERCADO_PAGO_PAYER_EMAIL_TESTE") : usuario.email;
    if (!email) return json({ erro: "checkout_nao_configurado" }, 503, req);
    const ativo = await banco(`assinaturas?id_usuario=eq.${encodeURIComponent(usuario.id)}&status=in.(ativa,cancelada)&or=(fim_periodo.is.null,fim_periodo.gt.${encodeURIComponent((/* @__PURE__ */ new Date()).toISOString())})&select=id&limit=1`);
    if (!ativo.ok) throw new Error("consulta_assinatura_falhou");
    if ((await ativo.json()).length) return json({ erro: "Voc\xEA j\xE1 tem um per\xEDodo pago vigente. Aguarde o t\xE9rmino antes de comprar outro." }, 409, req);
    const expirar = await banco(`pedidos_pix?id_usuario=eq.${encodeURIComponent(usuario.id)}&status=in.(criando,pending)&expira_em=lt.${encodeURIComponent((/* @__PURE__ */ new Date()).toISOString())}`, { method: "PATCH", body: JSON.stringify({ status: "expired" }) });
    if (!expirar.ok) throw new Error("consulta_pix_falhou");
    const abertos = await banco(`pedidos_pix?id_usuario=eq.${encodeURIComponent(usuario.id)}&status=in.(criando,pending)&select=*&limit=1`);
    if (!abertos.ok) throw new Error("consulta_pix_falhou");
    let [pedido] = await abertos.json();
    if (pedido && pedido.plano !== body.plano) return json({ erro: "J\xE1 existe um Pix pendente para outro plano. Aguarde o vencimento ou conclua aquele pagamento." }, 409, req);
    if (!pedido) {
      const aceite = await banco("aceites_assinatura", { method: "POST", body: JSON.stringify({ id_usuario: usuario.id, plano: body.plano, versao: body.aceite_termos_versao, valor_centavos: plano.centavos, periodicidade_meses: plano.meses, meio_pagamento: "pix" }) });
      if (!aceite.ok) throw new Error("aceite_pix_falhou");
      const inserir = await banco("pedidos_pix", { method: "POST", body: JSON.stringify({ id_usuario: usuario.id, plano: body.plano, valor_centavos: plano.centavos, meses: plano.meses }) });
      if (!inserir.ok) return json({ erro: "J\xE1 existe um pedido em andamento. Tente novamente para recuperar o Pix." }, 409, req);
      [pedido] = await inserir.json();
    }
    let pagamento;
    if (pedido.pagamento_id) pagamento = await consultarPagamento(token, pedido.pagamento_id);
    else {
      const r = await fetch("https://api.mercadopago.com/v1/payments", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": `pix-${pedido.id}` }, body: JSON.stringify({ transaction_amount: pedido.valor_centavos / 100, description: `OrtoQuest\xF5es ${pedido.plano} \u2014 ${pedido.meses} m\xEAs(es), sem renova\xE7\xE3o autom\xE1tica`, payment_method_id: "pix", external_reference: `pix:${pedido.id}`, date_of_expiration: pedido.expira_em, payer: { email, identification: { type: "CPF", number: body.cpf.replace(/\D/g, "") } } }) });
      if (!r.ok) return json({ erro: "O Mercado Pago n\xE3o conseguiu gerar o Pix. Tente novamente." }, 502, req);
      pagamento = await r.json();
      const salvar = await banco(`pedidos_pix?id=eq.${pedido.id}&pagamento_id=is.null&status=eq.criando`, { method: "PATCH", body: JSON.stringify({ pagamento_id: String(pagamento.id), status: "pending" }) });
      if (!salvar.ok) throw new Error("registro_pix_falhou");
    }
    validarPagamentoPix(pedido, pagamento, ambiente);
    const url = pagamento.point_of_interaction?.transaction_data?.ticket_url;
    if (typeof url !== "string" || new URL(url).protocol !== "https:" || new URL(url).hostname !== "www.mercadopago.com.br") throw new Error("link_pix_invalido");
    return json({ url, pedido_id: pedido.id, expira_em: pedido.expira_em }, 200, req);
  } catch (erro) {
    return json({ erro: erro instanceof Error ? erro.message : "erro_pix" }, erro instanceof Error && erro.message === "autenticacao_necessaria" ? 401 : 502, req);
  }
});

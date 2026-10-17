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
async function buscarUltimaFaturaAprovada(token, preapprovalId) {
  const busca = await consultarMercadoPago(
    token,
    `authorized_payments/search?preapproval_id=${encodeURIComponent(preapprovalId)}`
  );
  const faturas = (busca.results ?? []).filter(
    (fatura) => fatura.preapproval_id === preapprovalId && fatura.payment?.id && fatura.payment.status === "approved"
  );
  faturas.sort((a, b) => String(b.debit_date ?? b.date_created ?? "").localeCompare(String(a.debit_date ?? a.date_created ?? "")));
  return faturas[0] ?? null;
}

// supabase/functions/_shared/pix.ts
var PLANOS_PIX = {
  mensal: { meses: 1, centavos: 3990 },
  semestral: { meses: 6, centavos: 17990 },
  anual: { meses: 12, centavos: 23990 }
};
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

// supabase/functions/_shared/email.ts
var emailConfigurado = () => !!Deno.env.get("RESEND_API_KEY") && !!Deno.env.get("EMAIL_REMETENTE");
async function pedirAutomaticoServidor(idUsuario, tipo, extra = {}) {
  try {
    const segredo = Deno.env.get("EMAIL_SEGREDO"), base = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!segredo || !base || !idUsuario || !emailConfigurado()) return null;
    const r = await fetch(`${base}/functions/v1/enviar-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anon, Authorization: `Bearer ${anon}`, "x-segredo": segredo },
      body: JSON.stringify({ acao: "automatico", tipo, id_usuario: idUsuario, ...extra })
    });
    const dados = await r.json().catch(() => ({}));
    return dados.resultado ?? dados.erro ?? null;
  } catch {
    return null;
  }
}

// supabase/functions/gerenciar-plano/index.ts
async function assinaturaDoUsuario(idUsuario, acao) {
  const filtro = acao === "cancelar" ? "status=eq.ativa" : "status=in.(ativa,cancelada,pendente,falha_pagamento,pausada)";
  const ordenacao = acao === "reembolsar" ? "ultima_cobranca_em.desc.nullslast" : "atualizada_em.desc";
  const resposta = await banco(`assinaturas?id_usuario=eq.${encodeURIComponent(idUsuario)}&${filtro}&order=${ordenacao}&limit=1&select=id,id_externo,status,ultima_cobranca_id,ultima_cobranca_em,plano,inicio_periodo,fim_periodo`);
  if (!resposta.ok) throw new Error("consulta_assinatura_falhou");
  const [assinatura] = await resposta.json();
  return assinatura ?? null;
}
async function atualizarAssinatura(id, alteracao) {
  const resposta = await banco(`assinaturas?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...alteracao, atualizada_em: (/* @__PURE__ */ new Date()).toISOString() })
  });
  if (!resposta.ok) throw new Error("atualizacao_assinatura_falhou");
}
async function reciboDaCobranca(idUsuario, assinatura, idPagamento, meio, renovacao) {
  const r = await banco(`assinaturas?id=eq.${encodeURIComponent(assinatura.id)}&select=plano,inicio_periodo,fim_periodo`);
  const [a] = r.ok ? await r.json() : [];
  await pedirAutomaticoServidor(idUsuario, "pagamento_aprovado", { referencia: `pg:${idPagamento}`, plano: a?.plano ?? assinatura.plano, inicio_periodo: a?.inicio_periodo ?? assinatura.inicio_periodo, fim_periodo: a?.fim_periodo ?? assinatura.fim_periodo, meio, renovacao });
}
async function sincronizarCobranca(token, assinatura, idUsuario) {
  if (assinatura.id_externo.startsWith("pix:")) {
    if (!assinatura.ultima_cobranca_id) return false;
    const pagamento2 = await consultarPagamento(token, assinatura.ultima_cobranca_id);
    if (pagamento2.external_reference !== assinatura.id_externo) throw new Error("pagamento_pix_divergente");
    const resultado = await sincronizarPix(pagamento2);
    if (resultado.status === "approved") await reciboDaCobranca(idUsuario, assinatura, String(pagamento2.id), "pix", false).catch(() => void 0);
    return pagamento2.status === "approved";
  }
  const fatura = await buscarUltimaFaturaAprovada(token, assinatura.id_externo);
  if (!fatura?.payment?.id) return false;
  const pagamento = await consultarPagamento(token, String(fatura.payment.id));
  if (String(pagamento.id) !== String(fatura.payment.id) || pagamento.status !== "approved" || !pagamento.date_approved) return false;
  const preapproval = await consultarMercadoPago(token, `preapproval/${encodeURIComponent(assinatura.id_externo)}`);
  const ativar = assinatura.status !== "cancelada" && assinatura.status !== "reembolsada" && preapproval.status === "authorized";
  if (assinatura.ultima_cobranca_id !== String(pagamento.id) || Date.parse(assinatura.ultima_cobranca_em ?? "") !== Date.parse(pagamento.date_approved) || ativar && assinatura.status !== "ativa") {
    await atualizarAssinatura(assinatura.id, {
      ultima_cobranca_id: String(pagamento.id),
      ultima_cobranca_em: pagamento.date_approved,
      ...ativar ? { status: "ativa" } : {}
    });
  }
  await reciboDaCobranca(idUsuario, assinatura, String(pagamento.id), "cartao", !!assinatura.ultima_cobranca_id && assinatura.ultima_cobranca_id !== String(pagamento.id)).catch(() => void 0);
  return true;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json({ erro: "metodo_invalido" }, 405, req);
  try {
    const usuario = await usuarioDoPedido(req);
    const { acao } = await req.json();
    if (!acao || !["cancelar", "reembolsar", "sincronizar_cobranca"].includes(acao)) return json({ erro: "acao_invalida" }, 400, req);
    if (Deno.env.get("MERCADO_PAGO_INTEGRACAO_VALIDADA") !== "true") return json({ erro: "integracao_nao_validada" }, 503, req);
    const assinatura = await assinaturaDoUsuario(usuario.id, acao);
    if (!assinatura) return json({ erro: "assinatura_nao_encontrada" }, 404, req);
    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (acao === "sincronizar_cobranca") {
      const encontrada = await sincronizarCobranca(token, assinatura, usuario.id);
      return json({ ok: true, cobranca_encontrada: encontrada }, 200, req);
    }
    const obrigado = (reembolso, fimEm) => pedirAutomaticoServidor(usuario.id, "obrigado_tempo", { referencia: `fim:${assinatura.id}`, reembolso, fim_periodo: fimEm }).catch(() => void 0);
    if (acao === "reembolsar") {
      if (assinatura.status !== "ativa" && assinatura.status !== "cancelada") return json({ erro: "assinatura_nao_reembolsavel" }, 409, req);
      if (!assinatura.ultima_cobranca_id || !assinatura.ultima_cobranca_em) return json({ erro: "cobranca_aprovada_nao_encontrada" }, 409, req);
      const idade = Date.now() - new Date(assinatura.ultima_cobranca_em).getTime();
      if (!Number.isFinite(idade) || idade < 0 || idade > 7 * 864e5) return json({ erro: "prazo_de_garantia_encerrado" }, 409, req);
      const pagamento = await consultarPagamento(token, assinatura.ultima_cobranca_id);
      if (assinatura.id_externo.startsWith("pix:") && (pagamento.external_reference !== assinatura.id_externo || pagamento.payment_method_id !== "pix")) {
        return json({ erro: "pagamento_pix_divergente" }, 409, req);
      }
      if (!["approved", "refunded"].includes(String(pagamento.status)) || String(pagamento.id) !== assinatura.ultima_cobranca_id || !pagamento.date_approved || Date.parse(pagamento.date_approved) !== Date.parse(assinatura.ultima_cobranca_em)) {
        return json({ erro: "cobranca_aprovada_nao_confirmada" }, 409, req);
      }
      if (pagamento.status === "approved") {
        const reembolso = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(assinatura.ultima_cobranca_id)}/refunds`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": `garantia-${assinatura.id}-${assinatura.ultima_cobranca_id}` },
          body: "{}"
        });
        if (!reembolso.ok) {
          const resposta2 = await reembolso.json().catch(() => ({}));
          const codigo = typeof resposta2.error === "string" && /^[a-z0-9_-]{1,80}$/i.test(resposta2.error) ? resposta2.error : null;
          const causa = Array.isArray(resposta2.cause) ? resposta2.cause.find((item) => typeof item.code === "string" && /^[a-z0-9_-]{1,80}$/i.test(item.code))?.code : null;
          console.error("mercado_pago_reembolso_recusado", { http_status: reembolso.status, codigo, causa });
          return json({ erro: "O Mercado Pago n\xE3o confirmou o reembolso. Sua assinatura n\xE3o foi alterada; tente novamente mais tarde." }, 502, req);
        }
        const resposta = await reembolso.json().catch(() => ({}));
        if (resposta.payment_id && String(resposta.payment_id) !== assinatura.ultima_cobranca_id) {
          console.error("mercado_pago_reembolso_pagamento_divergente");
          return json({ erro: "N\xE3o foi poss\xEDvel confirmar o reembolso da cobran\xE7a desta assinatura." }, 502, req);
        }
      }
      const pagamentoAposReembolso = await consultarPagamento(token, assinatura.ultima_cobranca_id);
      if (String(pagamentoAposReembolso.id) !== assinatura.ultima_cobranca_id || pagamentoAposReembolso.status !== "refunded") {
        console.error("mercado_pago_reembolso_aguardando_confirmacao");
        return json({ erro: "O reembolso ainda n\xE3o foi confirmado pelo Mercado Pago. Sua assinatura n\xE3o foi alterada." }, 502, req);
      }
    } else if (assinatura.status !== "ativa") {
      return json({ erro: "plano_ativo_nao_encontrado" }, 404, req);
    }
    if (assinatura.id_externo.startsWith("pix:")) {
      if (acao === "reembolsar") {
        await sincronizarPix(await consultarPagamento(token, assinatura.ultima_cobranca_id));
        await obrigado(true, (/* @__PURE__ */ new Date()).toISOString());
      }
      return json({ ok: true, garantia: acao === "reembolsar" }, 200, req);
    }
    const preapproval = await consultarMercadoPago(token, `preapproval/${encodeURIComponent(assinatura.id_externo)}`);
    if (preapproval.status !== "cancelled") {
      const cancelamento = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(assinatura.id_externo)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" })
      });
      if (!cancelamento.ok) return json({ erro: "cancelamento_nao_confirmado" }, 502, req);
    }
    const agora = (/* @__PURE__ */ new Date()).toISOString();
    await atualizarAssinatura(assinatura.id, acao === "reembolsar" ? { status: "reembolsada", cancelar_ao_fim: true, fim_periodo: agora, cancelada_em: agora } : { cancelar_ao_fim: true, cancelada_em: agora });
    await obrigado(acao === "reembolsar", acao === "reembolsar" ? agora : assinatura.fim_periodo);
    return json({ ok: true, garantia: acao === "reembolsar" }, 200, req);
  } catch (erro) {
    const codigo = erro instanceof Error && erro.message === "autenticacao_necessaria" ? 401 : 502;
    return json({ erro: erro instanceof Error ? erro.message : "erro_inesperado" }, codigo, req);
  }
});

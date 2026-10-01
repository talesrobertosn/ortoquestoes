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

// supabase/functions/criar-checkout/index.ts
var planos = {
  mensal: { reason: "OrtoQuestoes Mensal", frequency: 1, transaction_amount: 39.9 },
  semestral: { reason: "OrtoQuestoes Semestral", frequency: 6, transaction_amount: 179.9 },
  anual: { reason: "OrtoQuestoes Anual", frequency: 12, transaction_amount: 239.9 }
};
var versoesCondicoesAceitas = ["2026-10-01", "2026-09-30", "2026-09-28", "2026-09-27"];
async function contaTesteAtiva(idUsuario) {
  const resposta = await banco(`contas_teste?id_usuario=eq.${encodeURIComponent(idUsuario)}&ativa=eq.true&select=id_usuario`);
  if (!resposta.ok) throw new Error("consulta_conta_teste_falhou");
  return (await resposta.json()).length > 0;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json({ erro: "metodo_invalido" }, 405, req);
  try {
    const usuario = await usuarioDoPedido(req);
    const { plano, aceite_termos_versao, aceite_confirmado } = await req.json();
    if (!plano || !planos[plano]) return json({ erro: "plano_invalido" }, 400, req);
    if (aceite_confirmado !== true || !aceite_termos_versao || !versoesCondicoesAceitas.includes(aceite_termos_versao)) {
      return json({ erro: "Atualize a p\xE1gina para revisar e aceitar as condi\xE7\xF5es atuais da assinatura." }, 400, req);
    }
    if (Deno.env.get("PAGAMENTOS_HABILITADOS") !== "true" || Deno.env.get("MERCADO_PAGO_INTEGRACAO_VALIDADA") !== "true") {
      return json({ erro: "Os pagamentos ainda n\xE3o est\xE3o dispon\xEDveis." }, 503, req);
    }
    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const origem = Deno.env.get("APP_ORIGIN");
    const ambiente = Deno.env.get("MERCADO_PAGO_AMBIENTE");
    if (ambiente !== "teste" && ambiente !== "producao") return json({ erro: "checkout_nao_configurado" }, 503, req);
    const payerEmail = ambiente === "teste" ? Deno.env.get("MERCADO_PAGO_PAYER_EMAIL_TESTE") : usuario.email;
    if (!token || !origem || !payerEmail) return json({ erro: "checkout_nao_configurado" }, 503, req);
    const restritoContasTeste = ambiente === "teste" || Deno.env.get("MERCADO_PAGO_RESTRITO_CONTAS_TESTE") !== "false";
    if (restritoContasTeste && !await contaTesteAtiva(usuario.id)) return json({ erro: "checkout_requer_conta_teste" }, 403, req);
    const aceite = await banco("aceites_assinatura", {
      method: "POST",
      body: JSON.stringify({
        id_usuario: usuario.id,
        versao: aceite_termos_versao,
        plano,
        valor_centavos: Math.round(planos[plano].transaction_amount * 100),
        periodicidade_meses: planos[plano].frequency
      })
    });
    if (!aceite.ok) return json({ erro: "N\xE3o foi poss\xEDvel registrar o aceite das condi\xE7\xF5es. Tente novamente." }, 503, req);
    const resposta = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID()
      },
      body: JSON.stringify({
        reason: planos[plano].reason,
        external_reference: usuario.id,
        payer_email: payerEmail,
        back_url: `${origem.replace(/\/$/, "")}/#/assinatura`,
        status: "pending",
        auto_recurring: {
          frequency: planos[plano].frequency,
          frequency_type: "months",
          transaction_amount: planos[plano].transaction_amount,
          currency_id: "BRL"
        }
      })
    });
    const dados = await resposta.json();
    if (!resposta.ok || !dados.init_point) return json({ erro: "mercado_pago_recusou_checkout" }, 502, req);
    return json({ url: dados.init_point }, 200, req);
  } catch (erro) {
    return json({ erro: erro instanceof Error ? erro.message : "erro_interno" }, 401, req);
  }
});

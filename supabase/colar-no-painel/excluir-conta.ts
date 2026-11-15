// @ts-nocheck
// Gerado por scripts/juntar-funcoes.mjs; função completa para o painel Supabase.

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

// supabase/functions/excluir-conta/handler.ts
var VERSAO = "2026-11-15";
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function rpc(nome, corpo) {
  const r = await banco(`rpc/${nome}`, { method: "POST", body: JSON.stringify(corpo) });
  if (!r.ok) {
    const erro = await r.json().catch(() => ({}));
    console.error("exclusao_rpc_falhou", JSON.stringify({ funcao: nome, http: r.status, codigo: erro.code }));
    if (erro.message === "administrador_protegido") throw new Error("A conta de administrador \xE9 protegida e n\xE3o pode ser exclu\xEDda por esta a\xE7\xE3o.");
    throw new Error("N\xE3o foi poss\xEDvel concluir a exclus\xE3o no banco. Tente novamente ou fale com o suporte.");
  }
  return r.json();
}
async function authAdmin(id) {
  const base = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(id)}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("N\xE3o foi poss\xEDvel conferir a conta selecionada.");
  return r.json();
}
async function atender(req) {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json({ erro: "M\xE9todo inv\xE1lido." }, 405, req);
  try {
    const ator = await usuarioDoPedido(req);
    const corpo = await req.json();
    const id = corpo.id_usuario ?? ator.id;
    if (!UUID.test(id)) return json({ erro: "Conta inv\xE1lida." }, 400, req);
    if (id !== ator.id) {
      const admin = await banco(`administradores?id_usuario=eq.${ator.id}&select=id_usuario`);
      if (!admin.ok || !(await admin.json()).length) return json({ erro: "Acesso negado." }, 403, req);
      if (corpo.solicitacao_confirmada !== true) return json({ erro: "Confirme que o titular solicitou a exclus\xE3o." }, 400, req);
    } else if (corpo.aceite !== VERSAO) return json({ erro: "Leia e aceite as condi\xE7\xF5es de exclus\xE3o." }, 400, req);
    const alvo = await authAdmin(id);
    if (!alvo) return json({ ok: true, excluida: true }, 200, req);
    if (!corpo.email || corpo.email.toLowerCase() !== alvo.email?.toLowerCase()) return json({ erro: "O e-mail n\xE3o corresponde \xE0 conta selecionada. Atualize a p\xE1gina." }, 409, req);
    const dados = await rpc("dados_exclusao_conta_servidor", { p_id: id });
    if (dados.legado) return json({ erro: "Esta conta tem uma assinatura antiga que precisa ser encerrada pelo suporte antes da exclus\xE3o." }, 409, req);
    const assinaturas = [...dados.assinaturas];
    if (dados.checkout) {
      const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
      if (!token) throw new Error("N\xE3o foi poss\xEDvel conferir os checkouts. A conta n\xE3o foi exclu\xEDda.");
      const vistos = new Set(assinaturas.map((a) => a.externo));
      for (const filtro of [`q=${encodeURIComponent(id)}`, `payer_email=${encodeURIComponent(alvo.email)}`]) {
        let acabou = false;
        for (let offset = 0; offset < 1e3; offset += 100) {
          const r = await fetch(`https://api.mercadopago.com/preapproval/search?${filtro}&limit=100&offset=${offset}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!r.ok) throw new Error("N\xE3o foi poss\xEDvel conferir todos os checkouts. A conta n\xE3o foi exclu\xEDda.");
          const lista = await r.json();
          if (!Array.isArray(lista.results)) throw new Error("O provedor n\xE3o confirmou a consulta de assinaturas.");
          for (const a of lista.results) if (a.external_reference === id && a.id && a.status !== "cancelled" && !vistos.has(a.id)) {
            assinaturas.push({ id: null, externo: a.id });
            vistos.add(a.id);
          }
          if (offset + lista.results.length >= (lista.paging?.total ?? Infinity) || lista.results.length < 100) {
            acabou = true;
            break;
          }
        }
        if (!acabou) throw new Error("A consulta de checkouts excedeu o limite. Fale com o suporte antes de excluir.");
      }
    }
    for (const a of assinaturas) {
      const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
      if (!token) throw new Error("N\xE3o foi poss\xEDvel cancelar a renova\xE7\xE3o. A conta n\xE3o foi exclu\xEDda.");
      const url = `https://api.mercadopago.com/preapproval/${encodeURIComponent(a.externo)}`;
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const consulta = await fetch(url, { headers });
      if (!consulta.ok) throw new Error("N\xE3o foi poss\xEDvel conferir a renova\xE7\xE3o. A conta n\xE3o foi exclu\xEDda.");
      const remota = await consulta.json();
      if (remota.external_reference !== id) throw new Error("A assinatura n\xE3o corresponde \xE0 conta. A exclus\xE3o foi interrompida.");
      if (remota.status !== "cancelled") {
        const canc = await fetch(url, { method: "PUT", headers, body: JSON.stringify({ status: "cancelled" }) });
        if (!canc.ok) throw new Error("O Mercado Pago n\xE3o confirmou o cancelamento. A conta n\xE3o foi exclu\xEDda.");
      }
      const confirmado = await fetch(url, { headers });
      if (!confirmado.ok || (await confirmado.json()).status !== "cancelled") throw new Error("A renova\xE7\xE3o ainda n\xE3o est\xE1 cancelada. A conta n\xE3o foi exclu\xEDda.");
      const salva = a.id ? await banco(`assinaturas?id=eq.${a.id}&id_usuario=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelada", cancelar_ao_fim: true, cancelada_em: (/* @__PURE__ */ new Date()).toISOString() }) }) : new Response("[]");
      if (!salva.ok) throw new Error("A renova\xE7\xE3o foi cancelada, mas a exclus\xE3o n\xE3o terminou. Tente novamente.");
    }
    for (const bucket of new Set(dados.arquivos.map((a) => a.bucket))) {
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const nomes = dados.arquivos.filter((a) => a.bucket === bucket).map((a) => a.nome);
      for (let i = 0; i < nomes.length; i += 100) {
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/storage/v1/object/${encodeURIComponent(bucket)}`, { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: nomes.slice(i, i + 100) }) });
        if (!r.ok) throw new Error("N\xE3o foi poss\xEDvel remover os arquivos desta conta. Tente novamente.");
      }
    }
    await rpc("excluir_conta_servidor", { p_id: id, p_email: alvo.email });
    return json({ ok: true, excluida: true }, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "autenticacao_necessaria") return json({ erro: "Entre na sua conta para continuar." }, 401, req);
    return json({ erro: msg.startsWith("N\xE3o ") || msg.startsWith("A ") || msg.startsWith("O ") ? msg : "N\xE3o foi poss\xEDvel excluir a conta. Tente novamente ou contate o suporte." }, 409, req);
  }
}

// supabase/functions/excluir-conta/index.ts
Deno.serve(atender);

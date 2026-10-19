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

// supabase/functions/_shared/cartas.ts
var TIPOS_AUTOMATICOS_NOVOS = ["boas_vindas_dia0", "primeiras_10", "voltou", "cronograma_pronto", "pagamento_aprovado", "obrigado_tempo"];
var TIPOS_CAMPANHAS_DIARIAS = ["assinou_sem_cronograma", "assinante_parado_7", "simulado_resultado", "vespera_prova", "depois_prova", "aniversario", "um_ano", "indicacao_deu_certo", "resumo_do_tema", "simulado_lembrete"];

// supabase/functions/_shared/modelo-email.ts
var TIPOS_AUTOMATICOS = [...TIPOS_AUTOMATICOS_NOVOS, ...TIPOS_CAMPANHAS_DIARIAS];

// supabase/functions/_shared/email.ts
var emailConfigurado = () => !!Deno.env.get("RESEND_API_KEY") && !!Deno.env.get("EMAIL_REMETENTE");
async function enviarEmail(para, assunto, html, texto2, descadastro, responderPara) {
  const chave = Deno.env.get("RESEND_API_KEY"), remetente = Deno.env.get("EMAIL_REMETENTE");
  const responder = responderPara?.trim() || Deno.env.get("EMAIL_RESPONDER_PARA")?.trim();
  if (!chave || !remetente) throw new Error("email_nao_configurado");
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: remetente,
      to: Array.isArray(para) ? para : [para],
      subject: assunto,
      html,
      text: texto2,
      ...responder ? { reply_to: responder } : {},
      ...descadastro ? { headers: { "List-Unsubscribe": [`<${descadastro}>`, ...responder ? [`<mailto:${responder}?subject=parar>`] : []].join(", ") } } : {}
    })
  });
  if (!resposta.ok) {
    const motivo = await resposta.json().then((d) => d.message ?? "").catch(() => "");
    throw new Error(`envio_recusado_${resposta.status}${motivo ? `: ${motivo}` : ""}`.slice(0, 300));
  }
}

// supabase/functions/suporte/index.ts
var PARA = () => (Deno.env.get("SUPORTE_PARA") ?? "talesroberto23@gmail.com").trim();
var MOTIVOS = {
  assinatura: "Assinatura ou cobran\xE7a",
  acesso: "Acesso \xE0 conta",
  questao: "Quest\xE3o ou coment\xE1rio",
  dados: "Meus dados",
  outro: "Outro assunto"
};
var JANELA_CURTA = 10 * 6e4;
var MAX_CURTA = 3;
var JANELA_DIA = 24 * 60 * 6e4;
var MAX_DIA = 12;
var envios = /* @__PURE__ */ new Map();
function podeEnviar(chave, agora = Date.now()) {
  const lista = (envios.get(chave) ?? []).filter((t) => agora - t < JANELA_DIA);
  const recentes = lista.filter((t) => agora - t < JANELA_CURTA).length;
  if (recentes >= MAX_CURTA || lista.length >= MAX_DIA) {
    envios.set(chave, lista);
    return false;
  }
  lista.push(agora);
  envios.set(chave, lista);
  if (envios.size > 5e3) {
    for (const [k, v] of envios) if (!v.some((t) => agora - t < JANELA_DIA)) envios.delete(k);
  }
  return true;
}
var texto = (v, max) => (typeof v === "string" ? v : "").replace(/\r\n?/g, "\n").trim().slice(0, max);
var linha = (v, max) => texto(v, max).replace(/[\n\t]+/g, " ");
var emailValido = (e) => /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(e) && e.length <= 200;
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
async function contaDoPedido(req) {
  const auth = req.headers.get("authorization") ?? "";
  if (!/^Bearer\s+ey/i.test(auth)) return null;
  try {
    const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
    const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth } });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? { id: u.id, email: u.email, nome: u.user_metadata?.nome } : null;
  } catch {
    return null;
  }
}
function ipDoPedido(req) {
  return (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "sem-ip").trim();
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json({ erro: "metodo_invalido" }, 405, req);
  try {
    const corpo = await req.json().catch(() => ({}));
    if (texto(corpo.site, 200)) return json({ ok: true }, 200, req);
    const mensagem = texto(corpo.mensagem, 6e3);
    if (mensagem.length < 10) return json({ erro: "mensagem_curta" }, 400, req);
    const conta = await contaDoPedido(req);
    const email = (linha(corpo.email, 200) || conta?.email || "").toLowerCase();
    if (!emailValido(email)) return json({ erro: "email_invalido" }, 400, req);
    if (!podeEnviar(conta ? `u:${conta.id}` : `ip:${ipDoPedido(req)}`)) return json({ erro: "muitas_mensagens" }, 429, req);
    if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
    const motivo = MOTIVOS[linha(corpo.motivo, 30)] ?? MOTIVOS.outro;
    const nome = linha(corpo.nome, 80) || linha(conta?.nome, 80);
    const questao = linha(corpo.questao, 80);
    const assunto = linha(corpo.assunto, 160) || `Orto Quest\xF5es \u2014 ${motivo}`;
    const ctx = corpo.contexto && typeof corpo.contexto === "object" ? corpo.contexto : {};
    const detalhes = [
      ["Motivo", motivo],
      ["De", nome ? `${nome} <${email}>` : email],
      ["Conta", conta ? `${conta.id}${conta.email && conta.email.toLowerCase() !== email ? ` (e-mail da conta: ${conta.email})` : ""}` : "visitante, sem conta"],
      ...questao ? [["Quest\xE3o", questao]] : [],
      ["P\xE1gina", linha(ctx.pagina, 300)],
      ["Navegador", linha(ctx.navegador, 300)],
      ["Tela", linha(ctx.tela, 60)],
      ["Tema", linha(ctx.tema, 20)],
      ["Idioma e fuso", [linha(ctx.idioma, 20), linha(ctx.fuso, 60)].filter(Boolean).join(" \xB7 ")]
    ].filter(([, v]) => v);
    const textoEmail = `${mensagem}

---
${detalhes.map(([k, v]) => `${k}: ${v}`).join("\n")}

Responda este e-mail para falar direto com ${email}.`;
    const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.55;color:#1b1208;max-width:640px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#14655e;font-weight:700">Suporte do Orto Quest\xF5es \xB7 ${esc(motivo)}</p>
<div style="white-space:pre-wrap;padding:14px 16px;border:2px solid #c9d5d1;border-radius:6px;background:#fbfaf6">${esc(mensagem)}</div>
<table style="margin-top:14px;border-collapse:collapse;font-size:13px;color:#4a5652">${detalhes.map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;font-weight:700;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:2px 0">${esc(v)}</td></tr>`).join("")}</table>
<p style="margin-top:14px;font-size:13px;color:#4a5652">Responda este e-mail para falar direto com ${esc(email)}.</p>
</div>`;
    try {
      await enviarEmail(PARA(), assunto, html, textoEmail, void 0, email);
    } catch (falha) {
      console.error("suporte: envio falhou", String(falha));
      return json({ erro: "envio_falhou" }, 502, req);
    }
    return json({ ok: true }, 200, req);
  } catch (falha) {
    console.error("suporte: erro", String(falha));
    return json({ erro: "erro_interno" }, 500, req);
  }
});

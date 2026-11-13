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
async function banco(caminho, init = {}) {
  const base = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return fetch(`${base}/rest/v1/${caminho}`, { ...init, headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers ?? {} } });
}

// supabase/functions/_shared/cartas.ts
var TIPOS_AUTOMATICOS_NOVOS = ["boas_vindas_dia0", "primeiras_10", "voltou", "cronograma_pronto", "pagamento_aprovado", "obrigado_tempo"];
var TIPOS_CAMPANHAS_DIARIAS = ["assinante_parado_7", "simulado_resultado", "vespera_prova", "depois_prova", "aniversario", "um_ano", "indicacao_deu_certo", "resumo_do_tema", "simulado_lembrete"];

// supabase/functions/_shared/modelo-email.ts
var TIPOS_AUTOMATICOS = [...TIPOS_AUTOMATICOS_NOVOS, ...TIPOS_CAMPANHAS_DIARIAS];

// supabase/functions/_shared/email.ts
var emailConfigurado = () => !!Deno.env.get("RESEND_API_KEY") && !!Deno.env.get("EMAIL_REMETENTE");
async function enviarEmail(para, assunto, html, texto2, descadastro, responderPara, anexos, idempotencia) {
  const chave = Deno.env.get("RESEND_API_KEY"), remetente = Deno.env.get("EMAIL_REMETENTE");
  const responder = responderPara?.trim() || Deno.env.get("EMAIL_RESPONDER_PARA")?.trim();
  if (!chave || !remetente) throw new Error("email_nao_configurado");
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json", ...idempotencia ? { "Idempotency-Key": idempotencia } : {} },
    body: JSON.stringify({
      from: remetente,
      to: Array.isArray(para) ? para : [para],
      subject: assunto,
      html,
      text: texto2,
      ...responder ? { reply_to: responder } : {},
      ...anexos?.length ? { attachments: anexos } : {},
      ...descadastro ? { headers: { "List-Unsubscribe": [`<${descadastro}>`, ...responder ? [`<mailto:${responder}?subject=parar>`] : []].join(", ") } } : {}
    })
  });
  if (!resposta.ok) {
    const motivo = await resposta.json().then((d) => d.message ?? "").catch(() => "");
    throw new Error(`envio_recusado_${resposta.status}${motivo ? `: ${motivo}` : ""}`.slice(0, 300));
  }
}

// supabase/functions/suporte/carta.ts
var MOTIVOS_SUPORTE = {
  pagar: "N\xE3o consegui assinar ou pagar",
  assinatura: "Minha assinatura",
  acesso: "Acesso \xE0 conta",
  questao: "Erro em quest\xE3o",
  dados: "Meus dados",
  direitos: "Direitos autorais",
  outro: "Sugest\xE3o ou outro assunto"
};
var MAX_IMAGENS = 3;
var MAX_BYTES_IMAGEM = 2e6;
var MAX_BYTES_TOTAL = 5e6;
var TIPOS_IMAGEM = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
function conferirAnexos(bruto) {
  if (bruto === void 0 || bruto === null) return { anexos: [] };
  if (!Array.isArray(bruto)) return { anexos: [], erro: "anexo_invalido" };
  if (bruto.length > MAX_IMAGENS) return { anexos: [], erro: "anexos_demais" };
  const anexos = [];
  let total = 0;
  for (const [i, item] of bruto.entries()) {
    const { nome, tipo, base64 } = item ?? {};
    const extensao = typeof tipo === "string" ? TIPOS_IMAGEM[tipo] : void 0;
    if (!extensao || typeof base64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return { anexos: [], erro: "anexo_invalido" };
    const bytes = Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
    total += bytes;
    if (bytes > MAX_BYTES_IMAGEM || total > MAX_BYTES_TOTAL) return { anexos: [], erro: "anexo_grande" };
    const base = (typeof nome === "string" ? nome : "").replace(/\.[a-z0-9]{1,5}$/i, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    anexos.push({ filename: `${base || `imagem-${i + 1}`}.${extensao}`, content: base64 });
  }
  return { anexos };
}
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function montarCarta(d) {
  const titulo = MOTIVOS_SUPORTE[d.motivo] ?? MOTIVOS_SUPORTE.outro;
  const quem = d.nome ? `${d.nome} \xB7 ${d.email}` : d.email;
  const imagens = d.imagens ?? [];
  const fichas = [...d.campos, ["Conta", d.situacao], ...imagens.length ? [["Anexos", imagens.length === 1 ? "1 imagem" : `${imagens.length} imagens`]] : []];
  const responder = `mailto:${encodeURIComponent(d.email)}?subject=${encodeURIComponent(`Re: ${d.assunto}`)}`;
  const primeiroNome2 = d.nome.trim().split(/\s+/)[0] ?? "";
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(d.assunto)}</title></head>
<body style="margin:0;padding:24px 12px;background:#eef2f1;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td style="padding:20px 28px 18px 28px;background:#146b61;">
<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:#bfe9e1;">Suporte \xB7 Orto Quest\xF5es</div>
<div style="margin-top:6px;font-size:21px;line-height:27px;font-weight:bold;color:#ffffff;">${esc(titulo)}</div>
<div style="margin-top:4px;font-size:14px;line-height:20px;color:#dff3ef;">${esc(quem)}</div>
</td></tr>
<tr><td style="padding:18px 28px 4px 28px;">
${fichas.map(([k, v]) => `<span style="display:inline-block;margin:0 6px 8px 0;padding:5px 11px;border-radius:999px;background:#eef6ee;border:1px solid #c9e2c6;font-size:13px;line-height:18px;color:#24452a;"><b>${esc(k)}:</b> ${esc(v)}</span>`).join("")}
</td></tr>
<tr><td style="padding:6px 28px 6px 28px;">
<div style="white-space:pre-wrap;padding:14px 16px;border-left:4px solid #146b61;border-radius:6px;background:#fbfaf6;font-size:15px;line-height:23px;color:#1b2624;">${esc(d.mensagem)}</div>
</td></tr>
<tr><td style="padding:16px 28px 22px 28px;">
<a href="${responder}" style="display:inline-block;padding:12px 22px;background:#146b61;color:#ffffff;border-radius:10px;font-weight:bold;text-decoration:none;font-size:14px;">Responder${primeiroNome2 ? ` a ${esc(primeiroNome2)}` : ""}</a>
<span style="display:inline-block;margin-left:10px;font-size:12px;color:#5b6b67;">ou s\xF3 responda este e-mail</span>
</td></tr>
<tr><td style="padding:14px 28px 22px 28px;border-top:1px solid #e3e9e7;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:12px;line-height:17px;color:#5b6b67;">
${d.detalhes.map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;font-weight:bold;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:2px 0;word-break:break-word;">${esc(v)}</td></tr>`).join("")}
</table>
</td></tr>
</table></td></tr></table></body></html>`;
  const texto2 = `${titulo}
${quem}

${fichas.map(([k, v]) => `${k}: ${v}`).join("\n")}

${d.mensagem}

---
${d.detalhes.map(([k, v]) => `${k}: ${v}`).join("\n")}

Responda este e-mail para falar direto com ${d.email}.`;
  return { html, texto: texto2 };
}
function descreverSituacao(a, precoAntigo = false, agora = Date.now()) {
  if (!a?.plano) return "Sem assinatura";
  const plano = a.plano.charAt(0).toUpperCase() + a.plano.slice(1);
  const meio = a.id_externo?.startsWith("pix:") ? "no Pix" : "no cart\xE3o";
  const fim = a.fim_periodo ? Date.parse(a.fim_periodo) : NaN;
  const data = Number.isFinite(fim) ? new Date(fim).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
  const vigente = Number.isFinite(fim) && fim > agora;
  const estado = a.status === "reembolsada" ? "reembolsada" : a.status === "falha_pagamento" ? "cobran\xE7a recusada" : a.status === "pendente" ? "pagamento pendente" : vigente ? `ativa at\xE9 ${data}${a.cancelar_ao_fim && !a.id_externo?.startsWith("pix:") ? ", sem renovar" : ""}` : data ? `terminou em ${data}` : a.status ?? "";
  return `${plano} ${meio} \xB7 ${estado}${precoAntigo ? " \xB7 pre\xE7o antigo garantido" : ""}`;
}

// supabase/functions/suporte/index.ts
var PARA = () => (Deno.env.get("SUPORTE_PARA") ?? "talesroberto23@gmail.com").trim();
var CAMPOS = {
  Plano: ["Mensal", "Semestral", "Anual", "N\xE3o sei"],
  Pagamento: ["Pix", "Cart\xE3o", "N\xE3o cheguei a escolher"],
  Quest\u00E3o: null
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
async function situacaoDaConta(idUsuario) {
  try {
    const r = await banco(`assinaturas?id_usuario=eq.${encodeURIComponent(idUsuario)}&order=criada_em.desc&limit=1&select=plano,status,id_externo,fim_periodo,cancelar_ao_fim`);
    if (!r.ok) return "n\xE3o consegui consultar";
    const [a] = await r.json();
    let precoAntigo = false;
    if (a && (a.plano === "semestral" || a.plano === "anual")) {
      const p = await banco("rpc/tem_preco_antigo", { method: "POST", body: JSON.stringify({ p_usuario: idUsuario, p_plano: a.plano }) });
      precoAntigo = p.ok && await p.json() === true;
    }
    return descreverSituacao(a ?? null, precoAntigo);
  } catch {
    return "n\xE3o consegui consultar";
  }
}
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
    const { anexos, erro: erroAnexo } = conferirAnexos(corpo.imagens);
    if (erroAnexo) return json({ erro: erroAnexo }, 400, req);
    if (!podeEnviar(conta ? `u:${conta.id}` : `ip:${ipDoPedido(req)}`)) return json({ erro: "muitas_mensagens" }, 429, req);
    if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
    const idMotivo = linha(corpo.motivo, 30);
    const motivo = idMotivo in MOTIVOS_SUPORTE ? idMotivo : "outro";
    const nome = linha(corpo.nome, 80) || linha(conta?.nome, 80);
    const questao = linha(corpo.questao, 80);
    const assunto = linha(corpo.assunto, 160) || `[Suporte] ${MOTIVOS_SUPORTE[motivo]}`;
    const ctx = corpo.contexto && typeof corpo.contexto === "object" ? corpo.contexto : {};
    const brutos = corpo.campos && typeof corpo.campos === "object" ? corpo.campos : {};
    const campos = Object.entries(CAMPOS).flatMap(([rotulo, aceitos]) => {
      const valor = linha(brutos[rotulo], 80);
      return valor && (!aceitos || aceitos.includes(valor)) ? [[rotulo, valor]] : [];
    });
    if (questao && !campos.some(([k]) => k === "Quest\xE3o")) campos.push(["Quest\xE3o", questao]);
    const situacao = conta ? await situacaoDaConta(conta.id) : "Visitante, sem conta";
    const detalhes = [
      ["Conta", conta ? `${conta.id}${conta.email && conta.email.toLowerCase() !== email ? ` (e-mail da conta: ${conta.email})` : ""}` : "visitante, sem conta"],
      ["Enviado em", (/* @__PURE__ */ new Date()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) + " (Bras\xEDlia)"],
      ["P\xE1gina", linha(ctx.pagina, 300)],
      ["Navegador", linha(ctx.navegador, 300)],
      ["Tela", linha(ctx.tela, 60)],
      ["Tema", linha(ctx.tema, 20)],
      ["Idioma e fuso", [linha(ctx.idioma, 20), linha(ctx.fuso, 60)].filter(Boolean).join(" \xB7 ")]
    ].filter(([, v]) => v);
    const { html, texto: textoEmail } = montarCarta({ motivo, assunto, mensagem, email, nome, campos, situacao, detalhes, imagens: anexos.map((a) => a.filename) });
    try {
      await enviarEmail(PARA(), assunto, html, textoEmail, void 0, email, anexos);
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

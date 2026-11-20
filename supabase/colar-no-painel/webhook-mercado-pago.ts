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
function assinaturaDoPagamento(pagamento) {
  const id = pagamento.preapproval_id ?? pagamento.metadata?.preapproval_id ?? pagamento.subscription_id ?? pagamento.point_of_interaction?.transaction_data?.subscription_id;
  return id ? String(id) : null;
}
async function consultarMercadoPago(token, caminho) {
  const resposta = await fetch(`https://api.mercadopago.com/${caminho}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resposta.ok) throw new Error("consulta_mercado_pago_falhou");
  return await resposta.json();
}
var consultarFatura = (token, id) => consultarMercadoPago(token, `authorized_payments/${encodeURIComponent(id)}`);
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

// supabase/functions/_shared/cartas.ts
var TIPOS_AUTOMATICOS_NOVOS = ["boas_vindas_dia0", "pagamento_aprovado", "obrigado_tempo"];
var TIPOS_CAMPANHAS_DIARIAS = ["assinante_parado_7", "simulado_resultado", "vespera_prova", "depois_prova", "aniversario", "um_ano", "indicacao_deu_certo", "resumo_do_tema", "simulado_lembrete"];

// supabase/functions/_shared/modelo-email.ts
var esc = (texto) => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function emailAlerta(titulo, linhas, link) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:24px 12px;background:#eef2f1;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:14px;">
<tr><td style="padding:22px 28px 6px 28px;font-size:12px;letter-spacing:2px;color:#146b61;text-transform:uppercase;font-weight:bold;">Painel do administrador</td></tr>
<tr><td style="padding:0 28px 10px 28px;font-size:20px;line-height:26px;font-weight:bold;color:#1b2624;">${esc(titulo)}</td></tr>
<tr><td style="padding:0 28px 8px 28px;font-size:15px;line-height:23px;color:#33413d;">${linhas.map((l) => esc(l)).join("<br>")}</td></tr>
<tr><td style="padding:14px 28px 26px 28px;"><a href="${link}" style="display:inline-block;padding:12px 22px;background:#146b61;color:#ffffff;border-radius:10px;font-weight:bold;text-decoration:none;font-size:14px;">Abrir o painel</a></td></tr>
</table></td></tr></table></body></html>`;
  return { assunto: `[OrtoQuest\xF5es] ${titulo}`, html, texto: `${titulo}

${linhas.join("\n")}

${link}` };
}
var TIPOS_AUTOMATICOS = [...TIPOS_AUTOMATICOS_NOVOS, ...TIPOS_CAMPANHAS_DIARIAS];

// supabase/functions/_shared/email.ts
var emailConfigurado = () => !!Deno.env.get("RESEND_API_KEY") && !!Deno.env.get("EMAIL_REMETENTE");
async function enviarEmail(para, assunto, html, texto, descadastro, responderPara, anexos, idempotencia) {
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
      text: texto,
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
function site() {
  return (Deno.env.get("APP_ORIGIN") ?? "https://ortoquestoes.com.br").replace(/\/+$/, "") + "/";
}
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
async function emailsAdministradores() {
  const resposta = await banco("rpc/emails_administradores", { method: "POST", body: "{}" });
  if (!resposta.ok) return [];
  return (await resposta.json()).map((l) => l.email).filter(Boolean);
}
async function alertarAdministradores(titulo, linhas, aba, referencia) {
  try {
    if (!emailConfigurado()) return;
    const config = await banco("configuracao_emails?id=eq.true&select=alertas_admin");
    if (config.ok && (await config.json())[0]?.alertas_admin === false) return;
    if (referencia) {
      const ja = await banco(`emails_enviados?tipo=eq.alerta_admin&referencia=eq.${encodeURIComponent(referencia)}&select=id&limit=1`);
      if (ja.ok && (await ja.json()).length) return;
    }
    const para = await emailsAdministradores();
    if (!para.length) return;
    const e = emailAlerta(titulo, linhas, `${site()}#/admin?aba=${aba}`);
    await enviarEmail(para, e.assunto, e.html, e.texto);
    await banco("emails_enviados", { method: "POST", body: JSON.stringify({ tipo: "alerta_admin", referencia: referencia ?? null, assunto: e.assunto }) });
  } catch {
  }
}

// supabase/functions/_shared/precos.ts
var PRECOS = {
  mensal: { meses: 1, centavos: 3990 },
  semestral: { meses: 6, centavos: 20940 },
  anual: { meses: 12, centavos: 35880 }
};
var PRECOS_ANTIGOS = { mensal: 3990, semestral: 17990, anual: 23990 };
var valoresAceitos = (plano) => [PRECOS[plano].centavos, PRECOS_ANTIGOS[plano]];

// supabase/functions/_shared/pix.ts
var PLANOS_PIX = PRECOS;
function validarPagamentoPix(pedido, pagamento, ambiente) {
  if (pagamento.external_reference !== `pix:${pedido.id}` || pagamento.payment_method_id !== "pix" || pagamento.currency_id !== "BRL" || Math.round(Number(pagamento.transaction_amount) * 100) !== pedido.valor_centavos || pagamento.live_mode !== (ambiente === "producao") || pedido.pagamento_id && String(pagamento.id) !== pedido.pagamento_id) throw new Error("pagamento_pix_divergente");
  const plano = PLANOS_PIX[pedido.plano];
  if (!plano || !valoresAceitos(pedido.plano).includes(pedido.valor_centavos) || plano.meses !== pedido.meses) throw new Error("pedido_pix_invalido");
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

// supabase/functions/webhook-mercado-pago/index.ts
async function hmacHex(segredo, texto) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function igualSeguro(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
function planoDaRecorrencia(autoRecurring) {
  if (!autoRecurring || typeof autoRecurring !== "object") throw new Error("recorrencia_ausente");
  const recorrencia = autoRecurring;
  if (recorrencia.frequency_type !== "months" || recorrencia.currency_id !== "BRL") throw new Error("recorrencia_invalida");
  const frequency = Number(recorrencia.frequency);
  const centavos = Math.round(Number(recorrencia.transaction_amount) * 100);
  for (const [plano, configuracao] of Object.entries(PRECOS)) {
    if (configuracao.meses === frequency && valoresAceitos(plano).includes(centavos)) return plano;
  }
  throw new Error("recorrencia_desconhecida");
}
async function marcarEvento(idEvento, status, erro) {
  const resposta = await banco(`eventos_pagamento?provedor=eq.mercado_pago&id_evento=eq.${encodeURIComponent(idEvento)}`, {
    method: "PATCH",
    body: JSON.stringify({ status_processamento: status, erro: erro ? String(erro) : null, processado_em: (/* @__PURE__ */ new Date()).toISOString() })
  });
  if (!resposta.ok) throw new Error("atualizacao_evento_falhou");
  if (status === "erro") {
    await alertarAdministradores(
      "Pagamento precisa de aten\xE7\xE3o",
      [
        `Evento ${idEvento} do Mercado Pago ficou com erro.`,
        `C\xF3digo: ${String(erro ?? "").replace(/^Error: /, "").slice(0, 120)}`,
        "Abra a aba Pagamentos para ver o que significa e reprocessar."
      ],
      "pagamentos",
      `evento:${idEvento}`
    );
  }
}
function alteracaoDaCobranca(status, pagamento, statusAtual) {
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  if (status === "approved") {
    if (!pagamento.date_approved) throw new Error("data_aprovacao_ausente");
    return { status: statusAtual === "cancelada" || statusAtual === "reembolsada" ? statusAtual : "ativa", ultima_cobranca_id: String(pagamento.id), ultima_cobranca_em: pagamento.date_approved, atualizada_em: agora };
  }
  if (status === "refunded" || status === "charged_back") return { status: "reembolsada", cancelar_ao_fim: true, fim_periodo: agora, atualizada_em: agora };
  if (status === "cancelled") return { status: "cancelada", fim_periodo: agora, cancelar_ao_fim: true, atualizada_em: agora };
  if (status === "expired") return { status: "vencida", fim_periodo: agora, atualizada_em: agora };
  if (status === "rejected") return { status: "falha_pagamento", fim_periodo: agora, atualizada_em: agora };
  return null;
}
async function assinaturaPorExterno(idExterno) {
  const resposta = await banco(`assinaturas?id_externo=eq.${encodeURIComponent(idExterno)}&select=id,status,id_usuario,plano,inicio_periodo,fim_periodo,ultima_cobranca_id,ultima_cobranca_em`);
  if (!resposta.ok) throw new Error("consulta_assinatura_falhou");
  const assinaturas = await resposta.json();
  return assinaturas[0] ?? null;
}
async function cartaDaCobranca(status, pagamento, antes) {
  if (!antes.id_usuario) return;
  if (status === "approved") {
    const depois = await assinaturaPorExterno(assinaturaDoPagamento(pagamento) ?? "").catch(() => null);
    await pedirAutomaticoServidor(antes.id_usuario, "pagamento_aprovado", {
      referencia: `pg:${pagamento.id}`,
      plano: depois?.plano ?? antes.plano,
      inicio_periodo: depois?.inicio_periodo ?? antes.inicio_periodo,
      fim_periodo: depois?.fim_periodo ?? antes.fim_periodo,
      meio: pagamento.payment_method_id === "pix" ? "pix" : "cartao",
      renovacao: !!antes.ultima_cobranca_id && antes.ultima_cobranca_id !== String(pagamento.id)
    });
  } else if (status === "refunded" || status === "charged_back" || status === "cancelled") {
    await pedirAutomaticoServidor(antes.id_usuario, "obrigado_tempo", { referencia: `fim:${pagamento.id}`, reembolso: status !== "cancelled", fim_periodo: (/* @__PURE__ */ new Date()).toISOString() });
  }
}
async function cartaDoPix(status, pedido, pagamento) {
  if (status === "approved") {
    const r = await banco(`assinaturas?id_externo=eq.${encodeURIComponent(`pix:${pedido.id}`)}&select=plano,inicio_periodo,fim_periodo`);
    const [a] = r.ok ? await r.json() : [];
    await pedirAutomaticoServidor(pedido.id_usuario, "pagamento_aprovado", { referencia: `pg:${pagamento.id}`, plano: a?.plano ?? pedido.plano, inicio_periodo: a?.inicio_periodo ?? null, fim_periodo: a?.fim_periodo ?? null, meio: "pix", renovacao: false });
  } else if (status === "refunded" || status === "charged_back") {
    await pedirAutomaticoServidor(pedido.id_usuario, "obrigado_tempo", { referencia: `fim:${pagamento.id}`, reembolso: true, fim_periodo: (/* @__PURE__ */ new Date()).toISOString() });
  }
}
async function sincronizarPreapproval(idRecurso) {
  const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const preapproval = await consultarMercadoPago(token, `preapproval/${encodeURIComponent(idRecurso)}`);
  const statusMercadoPago = String(preapproval.status ?? "");
  const status = statusMercadoPago === "authorized" ? "ativa" : statusMercadoPago === "cancelled" ? "cancelada" : statusMercadoPago === "expired" ? "vencida" : statusMercadoPago === "rejected" ? "falha_pagamento" : statusMercadoPago === "paused" ? "pausada" : "pendente";
  const plano = planoDaRecorrencia(preapproval.auto_recurring);
  const criacao = await banco("assinaturas?on_conflict=id_externo", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      id_usuario: preapproval.external_reference,
      id_externo: preapproval.id,
      plano,
      status,
      cancelar_ao_fim: status === "cancelada",
      inicio_periodo: preapproval.date_created,
      fim_periodo: preapproval.next_payment_date,
      atualizada_em: (/* @__PURE__ */ new Date()).toISOString()
    })
  });
  if (!criacao.ok) throw new Error("criacao_assinatura_falhou");
  const atual = await assinaturaPorExterno(idRecurso);
  if (!atual) throw new Error("assinatura_nao_encontrada");
  if (atual.status !== "reembolsada") {
    const atualizacao = await banco(`assinaturas?id_externo=eq.${encodeURIComponent(idRecurso)}&status=neq.reembolsada`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        cancelar_ao_fim: status === "cancelada",
        inicio_periodo: preapproval.date_created,
        fim_periodo: preapproval.next_payment_date,
        atualizada_em: (/* @__PURE__ */ new Date()).toISOString()
      })
    });
    if (!atualizacao.ok) throw new Error("atualizacao_assinatura_falhou");
  }
  if (status === "ativa" && typeof preapproval.external_reference === "string") {
    await encerrarPlanosMaisCurtos(preapproval.external_reference, String(preapproval.id), PRECOS[plano].meses, token);
  }
  return statusMercadoPago;
}
async function encerrarPlanosMaisCurtos(idUsuario, idNovo, mesesNovo, token) {
  const resposta = await banco(`assinaturas?id_usuario=eq.${encodeURIComponent(idUsuario)}&status=eq.ativa&cancelar_ao_fim=eq.false&id_externo=neq.${encodeURIComponent(idNovo)}&select=id,id_externo,plano`);
  if (!resposta.ok) return;
  const outras = await resposta.json();
  for (const antiga of outras) {
    if (!antiga.id_externo || antiga.id_externo.startsWith("pix:")) continue;
    const meses = PRECOS[antiga.plano]?.meses;
    if (!meses || meses >= mesesNovo) continue;
    try {
      const cancelamento = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(antiga.id_externo)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" })
      });
      if (!cancelamento.ok) throw new Error(`mercado_pago_${cancelamento.status}`);
      const agora = (/* @__PURE__ */ new Date()).toISOString();
      await banco(`assinaturas?id=eq.${encodeURIComponent(antiga.id)}`, { method: "PATCH", body: JSON.stringify({ cancelar_ao_fim: true, cancelada_em: agora, atualizada_em: agora }) });
    } catch (erro) {
      await alertarAdministradores(
        "Amplia\xE7\xE3o de plano precisa de aten\xE7\xE3o",
        [
          `A pessoa ampliou para um plano de ${mesesNovo} meses, mas a recorr\xEAncia antiga (${antiga.id_externo}) n\xE3o foi cancelada.`,
          `C\xF3digo: ${String(erro).replace(/^Error: /, "").slice(0, 120)}`,
          "Cancele a recorr\xEAncia antiga no Mercado Pago para n\xE3o haver cobran\xE7a em dobro."
        ],
        "pagamentos",
        `ampliacao:${antiga.id_externo}`
      ).catch(() => {
      });
    }
  }
}
async function anotarDono(idEvento, idUsuario) {
  if (!idUsuario) return;
  await banco(`eventos_pagamento?provedor=eq.mercado_pago&id_evento=eq.${encodeURIComponent(idEvento)}&id_usuario=is.null`, {
    method: "PATCH",
    body: JSON.stringify({ id_usuario: idUsuario })
  }).catch(() => void 0);
}
async function anotarMotivo(idAssinatura, status, detalhe) {
  const corpo = status === "rejected" ? { motivo_falha: /^[a-z0-9_]{1,80}$/.test(detalhe ?? "") ? detalhe : "sem_motivo", falha_em: (/* @__PURE__ */ new Date()).toISOString() } : status === "approved" ? { motivo_falha: null, falha_em: null } : null;
  if (!corpo) return;
  await banco(`assinaturas?id_externo=eq.${encodeURIComponent(idAssinatura)}`, { method: "PATCH", body: JSON.stringify(corpo) }).catch(() => void 0);
}
async function aplicarCobranca(idAssinatura, pagamento, idEvento) {
  const atual = await assinaturaPorExterno(idAssinatura);
  if (!atual) throw new Error("assinatura_nao_encontrada");
  await anotarDono(idEvento, atual.id_usuario);
  const alteracao = alteracaoDaCobranca(String(pagamento.status ?? ""), pagamento, atual.status);
  if (!alteracao) return marcarEvento(idEvento, "ignorado");
  const resposta = await banco(`assinaturas?id_externo=eq.${encodeURIComponent(idAssinatura)}`, {
    method: "PATCH",
    body: JSON.stringify(alteracao)
  });
  if (!resposta.ok) throw new Error("atualizacao_cobranca_falhou");
  await anotarMotivo(idAssinatura, String(pagamento.status ?? ""), pagamento.status_detail);
  await marcarEvento(idEvento, "processado");
  await cartaDaCobranca(String(pagamento.status ?? ""), pagamento, atual).catch(() => void 0);
}
async function processarPagamento(idRecurso, idEvento) {
  const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const pagamento = await consultarPagamento(token, idRecurso);
  if (pagamento.payment_method_id === "pix" && pagamento.external_reference?.startsWith("pix:")) {
    const resultado = await sincronizarPix(pagamento);
    await marcarEvento(idEvento, "processado");
    return cartaDoPix(resultado.status, resultado.pedido, pagamento).catch(() => void 0);
  }
  const idAssinatura = assinaturaDoPagamento(pagamento);
  if (!idAssinatura) return marcarEvento(idEvento, "ignorado");
  await sincronizarPreapproval(String(idAssinatura));
  await aplicarCobranca(String(idAssinatura), pagamento, idEvento);
}
async function processarPagamentoAutorizado(idRecurso, idEvento) {
  const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const fatura = await consultarFatura(token, idRecurso);
  if (!fatura.preapproval_id || !fatura.payment?.id) return marcarEvento(idEvento, "ignorado");
  const pagamento = await consultarPagamento(token, String(fatura.payment.id));
  if (String(pagamento.id) !== String(fatura.payment.id)) throw new Error("pagamento_divergente");
  await sincronizarPreapproval(fatura.preapproval_id);
  await aplicarCobranca(fatura.preapproval_id, pagamento, idEvento);
}
async function conciliarCobrancaDoCartao(idAssinatura, token) {
  const fatura = await buscarUltimaFaturaAprovada(token, idAssinatura);
  if (!fatura?.payment?.id) return "sem_cobranca";
  const pagamento = await consultarPagamento(token, String(fatura.payment.id));
  if (String(pagamento.id) !== String(fatura.payment.id) || pagamento.status !== "approved" || !pagamento.date_approved) return "sem_cobranca";
  const atual = await assinaturaPorExterno(idAssinatura);
  if (!atual) return "sem_assinatura";
  if (atual.ultima_cobranca_id === String(pagamento.id)) return "em_dia";
  if (atual.ultima_cobranca_em && Date.parse(atual.ultima_cobranca_em) >= Date.parse(pagamento.date_approved)) return "em_dia";
  const alteracao = alteracaoDaCobranca("approved", pagamento, atual.status);
  const resposta = await banco(`assinaturas?id_externo=eq.${encodeURIComponent(idAssinatura)}`, { method: "PATCH", body: JSON.stringify(alteracao) });
  if (!resposta.ok) throw new Error("atualizacao_cobranca_falhou");
  await anotarMotivo(idAssinatura, "approved", pagamento.status_detail);
  if (Date.now() - Date.parse(pagamento.date_approved) < 2 * 864e5) await cartaDaCobranca("approved", pagamento, atual).catch(() => void 0);
  return "gravada";
}
var esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function processarPreapproval(idRecurso, idEvento) {
  const statusMercadoPago = await sincronizarPreapproval(idRecurso);
  await marcarEvento(idEvento, statusMercadoPago === "pending" || statusMercadoPago === "in_process" ? "ignorado" : "processado");
  if (statusMercadoPago !== "authorized") return;
  const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  try {
    if (await conciliarCobrancaDoCartao(idRecurso, token) === "sem_cobranca") {
      await esperar(6e4);
      await conciliarCobrancaDoCartao(idRecurso, token);
    }
  } catch {
  }
}
async function processar(idRecurso, idEvento, tipo) {
  try {
    if (tipo === "payment") return await processarPagamento(idRecurso, idEvento);
    if (tipo === "subscription_authorized_payment") return await processarPagamentoAutorizado(idRecurso, idEvento);
    if (tipo === "subscription_preapproval") return await processarPreapproval(idRecurso, idEvento);
    return await marcarEvento(idEvento, "ignorado");
  } catch (erro) {
    await marcarEvento(idEvento, "erro", erro);
  }
}
async function exigirAdministrador(req) {
  let usuario;
  try {
    usuario = await usuarioDoPedido(req);
  } catch {
    return json({ erro: "autenticacao_necessaria" }, 401, req);
  }
  const autorizacao = await banco(`administradores?id_usuario=eq.${encodeURIComponent(usuario.id)}&select=id_usuario&limit=1`);
  if (!autorizacao.ok) return json({ erro: "autorizacao_indisponivel" }, 503, req);
  const administradores = await autorizacao.json();
  if (administradores.length !== 1) return json({ erro: "acesso_negado" }, 403, req);
  return null;
}
async function conciliarCartoesComoAdmin(req) {
  const recusa = await exigirAdministrador(req);
  if (recusa) return recusa;
  const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const limite = new Date(Date.now() - 20 * 864e5).toISOString();
  const consulta = await banco(`assinaturas?status=in.(ativa,pendente,falha_pagamento,pausada,cancelada)&or=(ultima_cobranca_em.is.null,ultima_cobranca_em.lt.${encodeURIComponent(limite)})&select=id_externo&order=atualizada_em.desc&limit=200`);
  if (!consulta.ok) return json({ erro: "consulta_assinaturas_falhou" }, 503, req);
  const linhas = await consulta.json();
  const ids = [...new Set(linhas.map((l) => l.id_externo ?? "").filter((id) => /^[0-9a-f]{32}$/i.test(id)))];
  const contagem = { gravada: 0, em_dia: 0, sem_cobranca: 0, sem_assinatura: 0, erro: 0 };
  const fila = [...ids];
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let id = fila.shift(); id; id = fila.shift()) {
      try {
        contagem[await conciliarCobrancaDoCartao(id, token)]++;
      } catch {
        contagem.erro++;
      }
    }
  }));
  return json({ conferidas: ids.length, ...contagem }, 200, req);
}
async function reprocessarComoAdmin(req) {
  const recusa = await exigirAdministrador(req);
  if (recusa) return recusa;
  const pedido = await req.json().catch(() => ({}));
  if (!Number.isSafeInteger(pedido.id_evento) || Number(pedido.id_evento) <= 0) return json({ erro: "evento_invalido" }, 400, req);
  const id = Number(pedido.id_evento);
  const consulta = await banco(`eventos_pagamento?id=eq.${id}&status_processamento=eq.erro&select=id_evento,id_recurso,tipo&limit=1`);
  if (!consulta.ok) return json({ erro: "consulta_evento_falhou" }, 503, req);
  const [evento] = await consulta.json();
  if (!evento?.id_recurso || !evento.tipo) return json({ erro: "evento_nao_reprocessavel" }, 409, req);
  const reserva = await banco(`eventos_pagamento?id=eq.${id}&status_processamento=eq.erro`, {
    method: "PATCH",
    body: JSON.stringify({ status_processamento: "recebido", erro: null, processado_em: null })
  });
  if (!reserva.ok) return json({ erro: "reserva_evento_falhou" }, 503, req);
  const atualizados = await reserva.json();
  if (atualizados.length !== 1) return json({ erro: "evento_ja_reprocessado" }, 409, req);
  EdgeRuntime.waitUntil(processar(evento.id_recurso, evento.id_evento, evento.tipo));
  return json({ recebido: true }, 202, req);
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json({}, 405);
  if (Deno.env.get("MERCADO_PAGO_INTEGRACAO_VALIDADA") !== "true") return json({ erro: "integracao_nao_validada" }, 503);
  if (new URL(req.url).searchParams.get("acao") === "reprocessar") return reprocessarComoAdmin(req);
  if (new URL(req.url).searchParams.get("acao") === "conciliar_cartoes") return conciliarCartoesComoAdmin(req);
  const segredo = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET") ?? "";
  const assinatura = req.headers.get("x-signature") ?? "", requestId = req.headers.get("x-request-id") ?? "";
  const partes = Object.fromEntries(assinatura.split(",").map((p) => p.trim().split("=", 2)));
  const url = new URL(req.url), idRecursoOriginal = url.searchParams.get("data.id") ?? "";
  const idRecurso = /^[a-z0-9]+$/i.test(idRecursoOriginal) ? idRecursoOriginal.toLowerCase() : idRecursoOriginal;
  const manifesto = [idRecurso && `id:${idRecurso}`, requestId && `request-id:${requestId}`, partes.ts && `ts:${partes.ts}`].filter(Boolean).join(";") + ";";
  const esperado = await hmacHex(segredo, manifesto);
  if (!segredo || !partes.v1 || !igualSeguro(esperado, partes.v1)) return json({ erro: "assinatura_invalida" }, 401);
  const payload = await req.json(), tipo = String(payload.type ?? ""), idEvento = String(payload.id ?? `${tipo}:${idRecurso}:${partes.ts}`);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload))).then((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""));
  const insercao = await banco("eventos_pagamento?on_conflict=provedor,id_evento", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify({ id_evento: idEvento, tipo, id_recurso: idRecurso, hash_payload: hash, payload }) });
  const novos = await insercao.json().catch(() => []);
  if (!insercao.ok) return json({ erro: "registro_evento_falhou" }, 502);
  if (Array.isArray(novos) && novos.length) EdgeRuntime.waitUntil(processar(idRecurso, idEvento, tipo));
  else if (tipo === "subscription_authorized_payment") {
    const existente = await banco(`eventos_pagamento?provedor=eq.mercado_pago&id_evento=eq.${encodeURIComponent(idEvento)}&select=hash_payload,status_processamento`);
    if (!existente.ok) return json({ erro: "consulta_evento_falhou" }, 502);
    const [evento] = await existente.json();
    if (evento?.hash_payload !== hash) return json({ erro: "evento_divergente" }, 409);
    if (evento.status_processamento === "ignorado" || evento.status_processamento === "erro") EdgeRuntime.waitUntil(processar(idRecurso, idEvento, tipo));
  }
  return json({ recebido: true });
});

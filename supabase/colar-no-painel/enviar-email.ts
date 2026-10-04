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

// supabase/functions/_shared/modelo-email.ts
var MARCOS = [
  { minimo: 50, rotulo: "Primeiros passos", nivel: "bronze" },
  { minimo: 100, rotulo: "Interno", nivel: "bronze" },
  { minimo: 250, rotulo: "R1", nivel: "prata" },
  { minimo: 500, rotulo: "R2", nivel: "prata" },
  { minimo: 1e3, rotulo: "R3", nivel: "ouro" },
  { minimo: 2e3, rotulo: "Preceptor", nivel: "ouro" },
  { minimo: 3e3, rotulo: "Chefe de servi\xE7o", nivel: "esmeralda" },
  { minimo: 4e3, rotulo: "Lenda do OrtoQuest\xF5es", nivel: "esmeralda" }
];
function marcoAtingido(total) {
  let atual = null;
  for (const m of MARCOS) if (total >= m.minimo) atual = m;
  return atual;
}
function proximoMarco(total) {
  return MARCOS.find((m) => total < m.minimo) ?? null;
}
var CORES = {
  bronze: { fundo: "#f6e4d3", borda: "#c98b55", texto: "#7a4518", faixa: "#c98b55" },
  prata: { fundo: "#eef1f4", borda: "#9aa6b2", texto: "#3c4650", faixa: "#8a97a4" },
  ouro: { fundo: "#fbf0cf", borda: "#d4a52c", texto: "#6b4e00", faixa: "#d4a52c" },
  esmeralda: { fundo: "#d9f1ea", borda: "#1f9c7f", texto: "#0b5746", faixa: "#1f9c7f" }
};
var MENSAGENS = {
  50: { titulo: "O come\xE7o j\xE1 ficou para tr\xE1s", texto: "As primeiras 50 quest\xF5es s\xE3o as mais dif\xEDceis de fazer: \xE9 quando o h\xE1bito ainda n\xE3o existe. Voc\xEA passou por elas. Daqui para frente, cada sess\xE3o curta soma, e a revis\xE3o espa\xE7ada come\xE7a a trabalhar a seu favor." },
  100: { titulo: "Cem quest\xF5es, e o h\xE1bito est\xE1 nascendo", texto: "Cem quest\xF5es j\xE1 mostram um padr\xE3o: voc\xEA sabe onde acerta com folga e onde trope\xE7a. Vale abrir o Caderno de erros e a Revis\xE3o de hoje. \xC9 ali que o estudo rende mais por minuto." },
  250: { titulo: "Voc\xEA j\xE1 passou da fase de teste", texto: "Com 250 quest\xF5es, os temas come\xE7am a se conectar: a mesma classifica\xE7\xE3o aparece em provas diferentes, a mesma armadilha se repete. Continue alternando temas novos com as revis\xF5es que vencem a cada dia." },
  500: { titulo: "Quinhentas quest\xF5es: isso \xE9 const\xE2ncia", texto: "Meio milhar de quest\xF5es n\xE3o acontece por acaso. \xC9 a soma de muitos dias em que voc\xEA escolheu estudar mesmo cansado. Agora o maior ganho est\xE1 nos pontos fracos: um tema com acerto baixo, treinado com calma, sobe r\xE1pido." },
  1e3: { titulo: "Mil quest\xF5es. Poucos chegam aqui", texto: "Mil quest\xF5es \xE9 uma marca de quem leva a prova a s\xE9rio. Voc\xEA j\xE1 viu boa parte do que as bancas gostam de perguntar. O que separa uma boa nota de uma \xF3tima, daqui em diante, \xE9 a revis\xE3o: voltar ao que errou at\xE9 virar certeza." },
  2e3: { titulo: "Duas mil quest\xF5es: n\xEDvel de preceptor", texto: "Com duas mil quest\xF5es, voc\xEA n\xE3o est\xE1 mais conhecendo a prova, est\xE1 dominando. Mantenha o ritmo das revis\xF5es e use as sess\xF5es por prova para treinar o tempo e o formato de cada banca." },
  3e3: { titulo: "Tr\xEAs mil quest\xF5es: chefe de servi\xE7o", texto: "Tr\xEAs mil quest\xF5es \xE9 trabalho de muitos meses, feito um dia de cada vez. A esta altura, os detalhes fazem a diferen\xE7a: releia os coment\xE1rios das quest\xF5es que voc\xEA errou mais de uma vez." },
  4e3: { titulo: "Quatro mil quest\xF5es: voc\xEA fez hist\xF3ria aqui", texto: "Voc\xEA respondeu praticamente o acervo inteiro. \xC9 raro, e merece ser comemorado. Agora a miss\xE3o \xE9 manter afiado: as revis\xF5es programadas v\xE3o trazendo de volta, no momento certo, o que mais importa." }
};
var esc = (texto) => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var numero = (n) => n.toLocaleString("pt-BR");
function emailMarco(d) {
  const nome = d.nome?.trim().split(/\s+/)[0] ?? "";
  const cor = CORES[d.marco.nivel];
  const msg = MENSAGENS[d.marco.minimo] ?? { titulo: `${numero(d.marco.minimo)} quest\xF5es`, texto: "Continue no seu ritmo: cada sess\xE3o soma." };
  const acerto = d.acertos + d.erros > 0 ? Math.round(d.acertos / (d.acertos + d.erros) * 100) : null;
  const proximo = proximoMarco(d.respondidas);
  const faltam = proximo ? proximo.minimo - d.respondidas : 0;
  const base = proximo ? MARCOS[MARCOS.indexOf(proximo) - 1]?.minimo ?? 0 : 0;
  const progresso = proximo ? Math.max(4, Math.min(100, Math.round((d.respondidas - base) / (proximo.minimo - base) * 100))) : 100;
  const assunto = nome ? `${nome}, voc\xEA chegou a ${numero(d.marco.minimo)} quest\xF5es` : `Voc\xEA chegou a ${numero(d.marco.minimo)} quest\xF5es no OrtoQuest\xF5es`;
  const linkTreinar = `${d.site}#/treinar`;
  const linkRevisao = `${d.site}#/revisao`;
  const selo = d.marco.minimo >= 1e3 ? `${d.marco.minimo / 1e3}k` : String(d.marco.minimo);
  const recado = d.recado?.trim() ? `<tr><td style="padding:0 40px 8px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f7f6;border-left:3px solid #146b61;border-radius:8px;">
          <tr><td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#23302d;">
            <strong style="color:#0f4f49;">Um recado do Tales:</strong><br>${esc(d.recado.trim()).replace(/\n/g, "<br>")}
          </td></tr>
        </table>
      </td></tr>` : "";
  const estatistica = (valor, rotulo) => `
    <td width="33%" align="center" valign="top" style="padding:14px 6px;background:#f6f8f7;border-radius:10px;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:28px;font-weight:bold;color:#0f4f49;">${valor}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#5f6d69;padding-top:4px;">${rotulo}</div>
    </td>`;
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(assunto)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f1;">${esc(`Emblema ${d.marco.rotulo} desbloqueado. ${msg.titulo}.`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f1;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">

      <tr><td style="background:#0f4f49;background-image:linear-gradient(135deg,#0c3f3a 0%,#146b61 55%,#1d8a7c 100%);padding:26px 40px 30px 40px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:22px;color:#ffffff;"><strong>Orto</strong> Quest\xF5es</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:2px;color:#bfe3dc;padding-top:22px;text-transform:uppercase;">Nova conquista</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:34px;font-weight:bold;color:#ffffff;padding-top:6px;">
          ${nome ? `Parab\xE9ns, ${esc(nome)}!` : "Parab\xE9ns!"}
        </div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#dff1ed;padding-top:6px;">
          Voc\xEA chegou a ${numero(d.marco.minimo)} quest\xF5es respondidas.
        </div>
      </td></tr>

      <tr><td align="center" style="padding:30px 40px 6px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" valign="middle" width="112" height="112" style="width:112px;height:112px;border-radius:56px;background:${cor.fundo};border:4px solid ${cor.borda};">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:38px;font-weight:bold;color:${cor.texto};">${selo}</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;letter-spacing:1px;color:${cor.texto};text-transform:uppercase;">quest\xF5es</div>
          </td></tr>
        </table>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;letter-spacing:1px;color:${cor.texto};text-transform:uppercase;padding-top:14px;font-weight:bold;">Emblema desbloqueado</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;font-weight:bold;color:#1b2624;padding-top:2px;">${esc(d.marco.rotulo)}</div>
      </td></tr>

      <tr><td style="padding:22px 40px 8px 40px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:19px;line-height:26px;font-weight:bold;color:#0f4f49;">${esc(msg.titulo)}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#33413d;padding-top:8px;">${esc(msg.texto)}</div>
      </td></tr>

      ${recado}

      <tr><td style="padding:16px 34px 4px 34px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="6" border="0">
          <tr>
            ${estatistica(numero(d.respondidas), "quest\xF5es respondidas")}
            ${estatistica(acerto === null ? "\u2014" : `${acerto}%`, "de acerto")}
            ${estatistica(numero(d.respondidas7d), "nos \xFAltimos 7 dias")}
          </tr>
        </table>
      </td></tr>

      ${proximo ? `<tr><td style="padding:18px 40px 4px 40px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#33413d;">
          Pr\xF3ximo emblema: <strong>${esc(proximo.rotulo)}</strong>. Faltam <strong>${numero(faltam)}</strong> quest\xF5es.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;background:#e6ecea;border-radius:6px;">
          <tr><td width="${progresso}%" style="height:10px;line-height:10px;font-size:0;background:${cor.faixa};border-radius:6px;">&nbsp;</td><td style="font-size:0;line-height:10px;">&nbsp;</td></tr>
        </table>
      </td></tr>` : ""}

      <tr><td align="center" style="padding:28px 40px 8px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="border-radius:12px;background:#146b61;">
            <a href="${linkTreinar}" style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">Continuar estudando</a>
          </td></tr>
        </table>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#5f6d69;padding-top:14px;">
          Ou comece pela <a href="${linkRevisao}" style="color:#146b61;font-weight:bold;">revis\xE3o de hoje</a>, onde o estudo rende mais.
        </div>
      </td></tr>

      <tr><td style="padding:26px 40px 30px 40px;">
        <div style="border-top:1px solid #e3e9e7;padding-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#33413d;">
          Bons estudos,<br><strong>Tales</strong>, do OrtoQuest\xF5es
        </div>
      </td></tr>
    </table>

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
      <tr><td align="center" style="padding:18px 24px 6px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#7a8784;">
        Siga <a href="https://www.instagram.com/ortoquestoes" style="color:#146b61;font-weight:bold;text-decoration:none;">@ortoquestoes</a> no Instagram: quest\xE3o comentada e macetes de prova.
      </td></tr>
      <tr><td align="center" style="padding:4px 24px 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#98a4a1;">
        Voc\xEA recebe este e-mail porque tem uma conta no OrtoQuest\xF5es e atingiu um novo emblema.<br>
        <a href="${d.linkDescadastro}" style="color:#98a4a1;text-decoration:underline;">N\xE3o quero mais receber e-mails de conquistas</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  const texto = [
    nome ? `Parab\xE9ns, ${nome}!` : "Parab\xE9ns!",
    `Voc\xEA chegou a ${numero(d.marco.minimo)} quest\xF5es respondidas e desbloqueou o emblema ${d.marco.rotulo}.`,
    "",
    msg.titulo,
    msg.texto,
    ...d.recado?.trim() ? ["", `Um recado do Tales: ${d.recado.trim()}`] : [],
    "",
    `Quest\xF5es respondidas: ${numero(d.respondidas)}`,
    `Acerto: ${acerto === null ? "\u2014" : `${acerto}%`}`,
    `Nos \xFAltimos 7 dias: ${numero(d.respondidas7d)}`,
    ...proximo ? ["", `Pr\xF3ximo emblema: ${proximo.rotulo}. Faltam ${numero(faltam)} quest\xF5es.`] : [],
    "",
    `Continuar estudando: ${linkTreinar}`,
    "",
    "Bons estudos,",
    "Tales, do OrtoQuest\xF5es",
    "",
    `N\xE3o quer mais receber e-mails de conquistas? ${d.linkDescadastro}`
  ].join("\n");
  return { assunto, html, texto };
}
function emailCarta(d) {
  const nome = d.nome?.trim().split(/\s+/)[0] ?? "";
  const acerto = d.acertos + d.erros > 0 ? Math.round(d.acertos / (d.acertos + d.erros) * 100) : null;
  const recado = d.recado?.trim();
  const assunto = nome ? `${nome}, um recado sobre o seu estudo` : "Um recado sobre o seu estudo";
  const numeros = `${numero(d.respondidas)} quest\xF5es respondidas${acerto === null ? "" : `, ${acerto}% de acerto`}${d.respondidas7d ? ` e ${numero(d.respondidas7d)} s\xF3 nos \xFAltimos 7 dias` : ""}.`;
  const paragrafos = recado ? recado.split(/\n{2,}/).map((p2) => p2.trim()).filter(Boolean) : [`Passando para te dar parab\xE9ns: voc\xEA chegou a ${numero(d.respondidas)} quest\xF5es no OrtoQuest\xF5es. Const\xE2ncia \xE9 o que mais faz diferen\xE7a na prova, e voc\xEA est\xE1 construindo isso.`];
  const linkTreinar = `${d.site}#/treinar`;
  const p = (conteudo, estilo = "") => `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#222222;${estilo}">${conteudo}</p>`;
  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;padding:24px 20px;">
${p(nome ? `Oi, ${esc(nome)},` : "Oi,")}
${paragrafos.map((t) => p(esc(t).replace(/\n/g, "<br>"))).join("\n")}
${p(`Seus n\xFAmeros at\xE9 aqui: ${esc(numeros)}`, "color:#444444;")}
${p(`Quando quiser continuar: <a href="${linkTreinar}" style="color:#146b61;">${esc(linkTreinar.replace(/^https?:\/\//, ""))}</a>`)}
${p('Um abra\xE7o,<br>Tales<br><span style="color:#666666;">OrtoQuest\xF5es</span>')}
<p style="margin:28px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#999999;">N\xE3o quer receber este tipo de e-mail? <a href="${d.linkDescadastro}" style="color:#999999;">Descadastrar</a></p>
</div>
</body>
</html>`;
  const texto = [
    nome ? `Oi, ${nome},` : "Oi,",
    "",
    ...paragrafos.flatMap((t) => [t, ""]),
    `Seus n\xFAmeros at\xE9 aqui: ${numeros}`,
    "",
    `Quando quiser continuar: ${linkTreinar}`,
    "",
    "Um abra\xE7o,",
    "Tales",
    "OrtoQuest\xF5es",
    "",
    `N\xE3o quer receber este tipo de e-mail? ${d.linkDescadastro}`
  ].join("\n");
  return { assunto, html, texto };
}
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
var TEMAS = {
  "mao": "M\xE3o e punho",
  "ombro-cotovelo": "Ombro e cotovelo",
  "quadril": "Quadril",
  "joelho": "Joelho",
  "coluna": "Coluna",
  "pe-tornozelo": "P\xE9 e tornozelo",
  "trauma": "Trauma adulto",
  "pediatria": "Ortopedia pedi\xE1trica",
  "tumores": "Tumores \xF3sseos e de partes moles",
  "conceitos-basicos": "Conceitos b\xE1sicos",
  "osteometabolicas": "Osteometab\xF3licas"
};
var MESES = ["janeiro", "fevereiro", "mar\xE7o", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
function nomeMes(mes) {
  const [ano, m] = mes.split("-").map(Number);
  return MESES[m - 1] ? `${MESES[m - 1]} de ${ano}` : mes;
}
var pctDe = (certas, total) => total > 0 ? Math.round(certas / total * 100) : null;
function analisarMes(d) {
  const acerto = pctDe(d.certas, d.certas + d.erradas);
  const acertoAnterior = pctDe(d.certas_anterior, d.certas_anterior + d.erradas_anterior);
  const comparaveis = d.temas.filter((t) => t.total >= 5 && t.total_ant >= 5 && TEMAS[t.tema]).map((t) => ({ slug: t.tema, nome: TEMAS[t.tema], agora: pctDe(t.certas, t.total), antes: pctDe(t.certas_ant, t.total_ant) })).map((t) => ({ ...t, delta: t.agora - t.antes }));
  const subiram = comparaveis.filter((t) => t.delta >= 5).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const cairam = comparaveis.filter((t) => t.delta <= -5).sort((a, b) => a.delta - b.delta).slice(0, 3);
  const doMes = d.temas.filter((t) => t.total >= 5 && TEMAS[t.tema]).map((t) => ({ slug: t.tema, nome: TEMAS[t.tema], acerto: pctDe(t.certas, t.total), total: t.total }));
  const maisFraco = [...doMes].sort((a, b) => a.acerto - b.acerto)[0] ?? null;
  const maisEstudados = [...doMes].sort((a, b) => b.total - a.total).slice(0, 3);
  return { acerto, acertoAnterior, subiram, cairam, maisFraco, maisEstudados };
}
function emailRelatorio(d) {
  const nome = d.nome?.trim().split(/\s+/)[0] ?? "";
  const mes = nomeMes(d.mes);
  const Mes = mes[0].toUpperCase() + mes.slice(1);
  const a = analisarMes(d);
  const parado = d.respostas === 0;
  const assunto = parado ? `${nome ? `${nome}, s` : "S"}eu ${mes.split(" ")[0]} no OrtoQuest\xF5es` : `${nome ? `${nome}, v` : "V"}oc\xEA respondeu ${numero(d.respostas)} quest\xF5es em ${mes.split(" ")[0]}`;
  const variacao = (agora, antes, unidade = "") => {
    const delta = agora - antes;
    if (!antes && !agora) return "";
    if (delta === 0) return `<span style="color:#5f6d69;">igual ao m\xEAs anterior</span>`;
    const cor = delta > 0 ? "#1f7a4d" : "#b3423a";
    return `<span style="color:${cor};font-weight:bold;">${delta > 0 ? "\u25B2" : "\u25BC"} ${numero(Math.abs(delta))}${unidade}</span> <span style="color:#5f6d69;">vs. m\xEAs anterior</span>`;
  };
  const cartao = (valor, rotulo, extra) => `
    <td width="33%" align="center" valign="top" style="padding:14px 6px;background:#f6f8f7;border-radius:10px;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:30px;font-weight:bold;color:#0f4f49;">${valor}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#5f6d69;padding-top:4px;">${rotulo}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;padding-top:6px;">${extra}</div>
    </td>`;
  const linhaTema = (nomeTema, valor, cor) => `
    <tr><td style="padding:7px 0;border-bottom:1px solid #edf1f0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;color:#23302d;">${esc(nomeTema)}</td>
    <td align="right" style="padding:7px 0;border-bottom:1px solid #edf1f0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:bold;color:${cor};white-space:nowrap;">${valor}</td></tr>`;
  const bloco = (titulo, linhas) => `
    <tr><td style="padding:20px 40px 0 40px;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#5f6d69;font-weight:bold;padding-bottom:4px;">${titulo}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linhas}</table>
    </td></tr>`;
  const temasHtml = [
    a.subiram.length ? bloco("Subiram", a.subiram.map((t) => linhaTema(t.nome, `${t.antes}% \u2192 ${t.agora}%`, "#1f7a4d")).join("")) : "",
    a.cairam.length ? bloco("Ca\xEDram", a.cairam.map((t) => linhaTema(t.nome, `${t.antes}% \u2192 ${t.agora}%`, "#b3423a")).join("")) : "",
    !a.subiram.length && !a.cairam.length && a.maisEstudados.length ? bloco("Mais estudados no m\xEAs", a.maisEstudados.map((t) => linhaTema(t.nome, `${t.total} quest\xF5es \xB7 ${t.acerto}%`, "#0f4f49")).join("")) : ""
  ].join("");
  const simulado = d.simulado ? `
    <tr><td style="padding:20px 40px 0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf3de;border-radius:12px;">
        <tr><td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#4a3710;">
          <strong>${esc(d.simulado.titulo)}:</strong> ${d.simulado.acertos} de ${d.simulado.total} (${pctDe(d.simulado.acertos, d.simulado.total)}%).
          <a href="${d.site}#/simulado-nacional" style="color:#7a5710;font-weight:bold;">Ver posi\xE7\xE3o e prontid\xE3o</a>
        </td></tr>
      </table>
    </td></tr>` : "";
  const passo = parado ? { titulo: "Recomece com 10 quest\xF5es", texto: "Um m\xEAs parado n\xE3o apaga o que voc\xEA j\xE1 estudou. Dez quest\xF5es hoje e a revis\xE3o do dia colocam tudo de volta nos trilhos.", botao: "Fazer 10 quest\xF5es", link: `${d.site}#/treinar` } : a.maisFraco && a.maisFraco.acerto < 70 ? { titulo: `Comece o pr\xF3ximo m\xEAs por ${a.maisFraco.nome}`, texto: `Foi o seu menor acerto em ${mes.split(" ")[0]} (${a.maisFraco.acerto}%). \xC9 o tema em que cada sess\xE3o mais faz a nota subir.`, botao: `Treinar ${a.maisFraco.nome}`, link: `${d.site}#/treinar?temas=${a.maisFraco.slug}` } : { titulo: "Mantenha o plano rodando", texto: "Seu acerto est\xE1 s\xF3lido nos temas que voc\xEA estudou. Agora vale ampliar: temas que voc\xEA ainda n\xE3o viu e o Simulado Nacional do m\xEAs.", botao: "Abrir meu plano at\xE9 a prova", link: `${d.site}#/plano-de-estudo` };
  const manchete = parado ? `${Mes} passou sem quest\xF5es. Tudo bem: o pr\xF3ximo m\xEAs come\xE7a hoje.` : `Voc\xEA respondeu ${numero(d.respostas)} ${d.respostas === 1 ? "quest\xE3o" : "quest\xF5es"} em ${d.dias_ativos} ${d.dias_ativos === 1 ? "dia" : "dias"} de estudo.`;
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(assunto)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f1;">${esc(manchete)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f1;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
      <tr><td style="background:#0f4f49;background-image:linear-gradient(135deg,#0c3f3a 0%,#146b61 55%,#1d8a7c 100%);padding:26px 40px 30px 40px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:22px;color:#ffffff;"><strong>Orto</strong> Quest\xF5es</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:2px;color:#bfe3dc;padding-top:22px;text-transform:uppercase;">Seu relat\xF3rio de ${esc(mes)}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;font-weight:bold;color:#ffffff;padding-top:6px;">${nome ? `Ol\xE1, ${esc(nome)}` : "Ol\xE1"}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#dff1ed;padding-top:6px;">${esc(manchete)}</div>
      </td></tr>

      <tr><td style="padding:24px 34px 4px 34px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="6" border="0">
          <tr>
            ${cartao(numero(d.respostas), "quest\xF5es no m\xEAs", variacao(d.respostas, d.respostas_anterior))}
            ${cartao(a.acerto === null ? "\u2014" : `${a.acerto}%`, "de acerto", a.acerto !== null && a.acertoAnterior !== null ? variacao(a.acerto, a.acertoAnterior, " pts") : "")}
            ${cartao(String(d.dias_ativos), d.dias_ativos === 1 ? "dia de estudo" : "dias de estudo", "")}
          </tr>
        </table>
      </td></tr>

      ${temasHtml}
      ${simulado}

      <tr><td style="padding:24px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f7f6;border-left:3px solid #146b61;border-radius:8px;">
          <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:12px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#146b61;font-weight:bold;">Pr\xF3ximo passo</div>
            <div style="font-size:18px;line-height:24px;font-weight:bold;color:#1b2624;padding-top:4px;">${esc(passo.titulo)}</div>
            <div style="font-size:15px;line-height:22px;color:#33413d;padding-top:6px;">${esc(passo.texto)}</div>
          </td></tr>
        </table>
      </td></tr>

      <tr><td align="center" style="padding:26px 40px 8px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="border-radius:12px;background:#146b61;">
            <a href="${passo.link}" style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(passo.botao)}</a>
          </td></tr>
        </table>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#5f6d69;padding-top:14px;">
          No total, voc\xEA j\xE1 respondeu <strong>${numero(d.total_acumulado)}</strong> quest\xF5es diferentes.
        </div>
      </td></tr>

      <tr><td style="padding:26px 40px 30px 40px;">
        <div style="border-top:1px solid #e3e9e7;padding-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#33413d;">
          Bons estudos,<br><strong>Tales</strong>, do OrtoQuest\xF5es
        </div>
      </td></tr>
    </table>

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
      <tr><td align="center" style="padding:18px 24px 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#98a4a1;">
        Voc\xEA recebe este relat\xF3rio porque \xE9 assinante do OrtoQuest\xF5es.<br>
        <a href="${d.linkDescadastro}" style="color:#98a4a1;text-decoration:underline;">N\xE3o quero mais receber o relat\xF3rio mensal</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  const texto = [
    `Seu relat\xF3rio de ${mes}`,
    nome ? `Ol\xE1, ${nome}.` : "Ol\xE1.",
    manchete,
    "",
    `Quest\xF5es no m\xEAs: ${numero(d.respostas)} (m\xEAs anterior: ${numero(d.respostas_anterior)})`,
    `Acerto: ${a.acerto === null ? "\u2014" : `${a.acerto}%`}${a.acertoAnterior !== null ? ` (m\xEAs anterior: ${a.acertoAnterior}%)` : ""}`,
    `Dias de estudo: ${d.dias_ativos}`,
    ...a.subiram.length ? ["", "Subiram: " + a.subiram.map((t) => `${t.nome} (${t.antes}% \u2192 ${t.agora}%)`).join(", ")] : [],
    ...a.cairam.length ? ["", "Ca\xEDram: " + a.cairam.map((t) => `${t.nome} (${t.antes}% \u2192 ${t.agora}%)`).join(", ")] : [],
    ...d.simulado ? ["", `${d.simulado.titulo}: ${d.simulado.acertos} de ${d.simulado.total}`] : [],
    "",
    `Pr\xF3ximo passo: ${passo.titulo}. ${passo.texto}`,
    passo.link,
    "",
    "Bons estudos,",
    "Tales, do OrtoQuest\xF5es",
    "",
    `N\xE3o quer mais receber o relat\xF3rio mensal? ${d.linkDescadastro}`
  ].join("\n");
  return { assunto, html, texto };
}
function emailLembrete(d) {
  const nome = d.nome?.trim().split(/\s+/)[0] ?? "";
  const img = (caminho, largura, altura, alt = "") => `<img src="${d.site}${caminho}" width="${largura}" height="${altura}" alt="${esc(alt)}" style="display:block;border:0;image-rendering:pixelated;-ms-interpolation-mode:nearest-neighbor;">`;
  const linkTreinar = `${d.site}#/treinar`;
  const linkRevisao = `${d.site}#/revisao`;
  const linkCronograma = `${d.site}#/cronograma`;
  const C = {
    nunca: {
      assunto: nome ? `${nome}, sua primeira miss\xE3o no OrtoQuest\xF5es est\xE1 esperando` : "Sua primeira miss\xE3o no OrtoQuest\xF5es est\xE1 esperando",
      previa: "Quest\xF5es oficiais de TEOT, TARO e ENARE R4 comentadas, alternativa por alternativa. Comece com 10.",
      selo: "Miss\xE3o: primeira batalha",
      titulo: nome ? `${nome}, o mensageiro trouxe um convite` : "O mensageiro trouxe um convite",
      lide: "Voc\xEA criou sua conta, mas ainda n\xE3o respondeu nenhuma quest\xE3o. Que tal dar uma chance? Leva uns 15 minutos.",
      corpo: [
        ["pixel/treinar.png", "Provas oficiais comentadas", "TEOT, TARO e ENARE R4 separadas por tema, com a explica\xE7\xE3o de cada alternativa: por que a certa est\xE1 certa e cada errada est\xE1 errada."],
        ["pixel/revisao.png", "Revis\xE3o que lembra por voc\xEA", "Errou? A quest\xE3o volta no momento certo. Acertou com certeza? S\xF3 reaparece daqui a semanas."],
        ["pixel/ranking.png", "Ranking, emblemas e sequ\xEAncia", "Cada quest\xE3o soma pontos, destrava emblemas e acende a sua fogueira de dias seguidos."]
      ],
      botao: "Come\xE7ar minha primeira miss\xE3o",
      link: linkTreinar,
      rodape: "Comece por um tema de que voc\xEA gosta. Dez quest\xF5es j\xE1 mostram como funciona."
    },
    tres_dias: {
      assunto: nome ? `${nome}, sua fogueira est\xE1 apagando` : "Sua fogueira de estudo est\xE1 apagando",
      previa: "Faz alguns dias que voc\xEA n\xE3o aparece. Dez quest\xF5es hoje mant\xEAm o h\xE1bito vivo.",
      selo: "Miss\xE3o: manter a chama",
      titulo: nome ? `${nome}, a fogueira est\xE1 esperando lenha` : "A fogueira est\xE1 esperando lenha",
      lide: `Faz ${d.diasFora} dias que voc\xEA n\xE3o aparece. Const\xE2ncia vence intensidade: uma sess\xE3o curta hoje vale mais do que uma maratona no fim de semana.`,
      corpo: [
        ["ranking/chama.png", "Dez quest\xF5es, quinze minutos", "\xC9 o suficiente para manter o h\xE1bito e n\xE3o deixar as revis\xF5es acumularem."],
        ["pixel/revisao.png", "Suas revis\xF5es est\xE3o prontas", "As quest\xF5es que voc\xEA errou j\xE1 voltaram para a fila. \xC9 onde o estudo rende mais por minuto."],
        ["pixel/ranking.png", "O ranking continua andando", `Voc\xEA j\xE1 respondeu ${numero(d.respondidas)} quest\xF5es. Cada uma nova soma um ponto.`]
      ],
      botao: "Voltar com 10 quest\xF5es",
      link: linkTreinar,
      rodape: `Prefere come\xE7ar pelo que j\xE1 errou? Abra a <a href="${linkRevisao}" style="color:#146b61;font-weight:bold;">revis\xE3o de hoje</a>.`
    },
    sete_dias: {
      assunto: nome ? `${nome}, uma semana longe acontece. O importante \xE9 voltar` : "Uma semana longe acontece. O importante \xE9 voltar",
      previa: "Sua jornada at\xE9 a prova continua de onde parou. Volte com uma sess\xE3o curta.",
      selo: "Miss\xE3o: retomar a jornada",
      titulo: nome ? `${nome}, sua jornada continua de onde parou` : "Sua jornada continua de onde parou",
      lide: `Faz ${d.diasFora} dias desde a \xFAltima visita. Plant\xE3o, cansa\xE7o, vida: acontece com todo mundo. O que separa quem chega pronto na prova \xE9 voltar, n\xE3o ser perfeito.`,
      corpo: [
        ["pixel/treinar.png", "Recomece pequeno", "Uma sess\xE3o de 10 quest\xF5es hoje. Amanh\xE3, outra. O h\xE1bito volta mais r\xE1pido do que parece."],
        ["pixel/planos.png", "Seu progresso est\xE1 guardado", `As ${numero(d.respondidas)} quest\xF5es que voc\xEA respondeu, as revis\xF5es e o caderno de erros continuam l\xE1, esperando.`],
        ["pixel/simulado.png", "Um plano at\xE9 a prova", "O cronograma divide o que falta pelos dias at\xE9 a prova e diz o que estudar hoje."]
      ],
      botao: "Retomar minha jornada",
      link: linkTreinar,
      rodape: `Quer um plano dia a dia? Veja o <a href="${linkCronograma}" style="color:#146b61;font-weight:bold;">cronograma at\xE9 a prova</a>.`
    }
  }[d.campanha];
  const blocos = C.corpo.map(([icone, titulo, texto2]) => `
      <tr><td style="padding:0 40px 14px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f8f7;border-radius:12px;">
          <tr>
            <td width="64" valign="middle" align="center" style="padding:14px 6px 14px 14px;">${img(icone, 44, 44)}</td>
            <td valign="middle" style="padding:14px 18px 14px 8px;font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:16px;line-height:22px;font-weight:bold;color:#0f4f49;">${esc(titulo)}</div>
              <div style="font-size:14px;line-height:21px;color:#33413d;padding-top:3px;">${esc(texto2)}</div>
            </td>
          </tr>
        </table>
      </td></tr>`).join("");
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(C.assunto)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f1;">${esc(C.previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f1;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">

      <tr><td style="background:#0b3a35;background-image:linear-gradient(135deg,#071f1c 0%,#0b3a35 55%,#14655e 100%);padding:26px 40px 28px 40px;border-bottom:4px solid #e0b862;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="top" style="font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:18px;line-height:22px;color:#ffffff;"><strong>Orto</strong> Quest\xF5es</div>
              <div style="display:inline-block;margin-top:20px;padding:4px 10px;background:#e0b862;color:#2b1d02;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">${esc(C.selo)}</div>
              <div style="font-size:26px;line-height:32px;font-weight:bold;color:#ffffff;padding-top:12px;">${esc(C.titulo)}</div>
            </td>
            <td width="96" valign="bottom" align="right" style="padding-left:12px;">${img("ranking/mensageiro.png", 72, 90, "O mensageiro do OrtoQuest\xF5es")}</td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="padding:26px 40px 18px 40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#33413d;">${esc(C.lide)}</td></tr>

      ${blocos}

      <tr><td align="center" style="padding:16px 40px 6px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="border-radius:12px;background:#146b61;box-shadow:inset 0 -4px 0 #0f4f49;">
            <a href="${C.link}" style="display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(C.botao)}</a>
          </td></tr>
        </table>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#5f6d69;padding-top:14px;">${C.rodape}</div>
      </td></tr>

      <tr><td style="padding:24px 40px 30px 40px;">
        <div style="border-top:1px solid #e3e9e7;padding-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#33413d;">
          Bons estudos,<br><strong>Tales</strong>, do OrtoQuest\xF5es
        </div>
      </td></tr>
    </table>

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
      <tr><td align="center" style="padding:18px 24px 6px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#7a8784;">
        Siga <a href="https://www.instagram.com/ortoquestoes" style="color:#146b61;font-weight:bold;text-decoration:none;">@ortoquestoes</a> no Instagram: quest\xE3o comentada e macetes de prova.
      </td></tr>
      <tr><td align="center" style="padding:4px 24px 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#98a4a1;">
        Voc\xEA recebe este e-mail porque tem uma conta no OrtoQuest\xF5es.<br>
        <a href="${d.linkDescadastro}" style="color:#98a4a1;text-decoration:underline;">N\xE3o quero mais receber lembretes</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  const texto = [
    C.titulo,
    "",
    C.lide,
    "",
    ...C.corpo.flatMap(([, titulo, texto2]) => [`\u2022 ${titulo}: ${texto2}`]),
    "",
    `${C.botao}: ${C.link}`,
    "",
    "Bons estudos,",
    "Tales, do OrtoQuest\xF5es",
    "",
    `N\xE3o quer mais receber lembretes? ${d.linkDescadastro}`
  ].join("\n");
  return { assunto: C.assunto, html, texto };
}
function rotuloQuestao(id) {
  const [, prefixo, numero2] = id.match(/^(.*)-(\d+)$/) ?? [];
  return prefixo && TEMAS[prefixo] ? `${TEMAS[prefixo]}, quest\xE3o ${Number(numero2)}` : id;
}
function emailRelatoResolvido(d) {
  const nome = d.nome?.trim().split(/\s+/)[0] ?? "";
  const rotulo = rotuloQuestao(d.idQuestao);
  const link = `${d.site}#/questao/${encodeURIComponent(d.idQuestao)}`;
  const relato = d.relato.trim().replace(/\s+/g, " ");
  const trecho = relato.length > 240 ? relato.slice(0, 240).replace(/\s\S*$/, "") + "\u2026" : relato;
  const nota = d.nota?.trim() || null;
  const assunto = `Corrigimos a quest\xE3o que voc\xEA relatou (${rotulo})`;
  const paragrafos = [
    `Voc\xEA relatou um problema na quest\xE3o de ${rotulo} do OrtoQuest\xF5es. Conferimos e a quest\xE3o j\xE1 foi corrigida no site.`,
    ...nota ? [`O que foi feito: ${nota}`] : [],
    "Obrigado por avisar. Cada relato deixa o banco de quest\xF5es melhor para todo mundo que est\xE1 estudando."
  ];
  const p = (conteudo, estilo = "") => `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#222222;${estilo}">${conteudo}</p>`;
  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;padding:24px 20px;">
${p(nome ? `Oi, ${esc(nome)},` : "Oi,")}
${paragrafos.map((t) => p(esc(t))).join("\n")}
${p(`Seu relato: \u201C${esc(trecho)}\u201D`, "color:#555555;font-style:italic;")}
${p(`Ver a quest\xE3o: <a href="${link}" style="color:#146b61;">${esc(link.replace(/^https?:\/\//, ""))}</a>`)}
${p('Um abra\xE7o,<br>Tales<br><span style="color:#666666;">OrtoQuest\xF5es</span>')}
</div>
</body>
</html>`;
  const texto = [
    nome ? `Oi, ${nome},` : "Oi,",
    "",
    ...paragrafos.flatMap((t) => [t, ""]),
    `Seu relato: "${trecho}"`,
    "",
    `Ver a quest\xE3o: ${link}`,
    "",
    "Um abra\xE7o,",
    "Tales",
    "OrtoQuest\xF5es"
  ].join("\n");
  return { assunto, html, texto };
}

// supabase/functions/_shared/email.ts
var emailConfigurado = () => !!Deno.env.get("RESEND_API_KEY") && !!Deno.env.get("EMAIL_REMETENTE");
async function enviarEmail(para, assunto, html, texto, descadastro) {
  const chave = Deno.env.get("RESEND_API_KEY"), remetente = Deno.env.get("EMAIL_REMETENTE");
  const responder = Deno.env.get("EMAIL_RESPONDER_PARA")?.trim();
  if (!chave || !remetente) throw new Error("email_nao_configurado");
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: remetente,
      to: Array.isArray(para) ? para : [para],
      subject: assunto,
      html,
      text: texto,
      ...responder ? { reply_to: responder } : {},
      ...descadastro ? { headers: { "List-Unsubscribe": `<${descadastro}>` } } : {}
    })
  });
  if (!resposta.ok) {
    const motivo2 = await resposta.json().then((d) => d.message ?? "").catch(() => "");
    throw new Error(`envio_recusado_${resposta.status}${motivo2 ? `: ${motivo2}` : ""}`.slice(0, 300));
  }
}
function site() {
  return (Deno.env.get("APP_ORIGIN") ?? "https://ortoquestoes.com.br").replace(/\/+$/, "") + "/";
}
async function hmac(texto) {
  const segredo = Deno.env.get("EMAIL_SEGREDO");
  if (!segredo) throw new Error("email_nao_configurado");
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const assinatura = new Uint8Array(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto)));
  return [...assinatura].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}
var textoAssinado = (idUsuario, tipo) => tipo === "conquistas" ? `descadastro:${idUsuario}` : `descadastro:${tipo}:${idUsuario}`;
async function linkDescadastro(idUsuario, tipo = "conquistas") {
  return `${site()}#/emails?u=${idUsuario}&t=${await hmac(textoAssinado(idUsuario, tipo))}${tipo === "conquistas" ? "" : `&tipo=${tipo}`}`;
}
async function tokenDescadastroValido(idUsuario, token, tipo = "conquistas") {
  const esperado = await hmac(textoAssinado(idUsuario, tipo));
  if (esperado.length !== token.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i++) diferenca |= esperado.charCodeAt(i) ^ token.charCodeAt(i);
  return diferenca === 0;
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

// supabase/functions/enviar-email/index.ts
var folga = (m) => Math.max(60, Math.round(m.minimo * 0.05));
async function dadosUsuario(id) {
  const r = await banco("rpc/dados_email_usuario", { method: "POST", body: JSON.stringify({ p_id: id }) });
  if (!r.ok) throw new Error("consulta_usuario_falhou");
  const [linha] = await r.json();
  return linha ?? null;
}
async function ehAdministrador(id) {
  const r = await banco(`administradores?id_usuario=eq.${encodeURIComponent(id)}&select=id_usuario`);
  return r.ok && (await r.json()).length > 0;
}
async function montar(id, marco, recado, carta = false) {
  const dados = await dadosUsuario(id);
  if (!dados?.email) return null;
  const m = marco ?? marcoAtingido(Number(dados.respondidas)) ?? MARCOS[0];
  const email = (carta ? emailCarta : emailMarco)({
    nome: dados.nome,
    marco: m,
    respondidas: Number(dados.respondidas),
    acertos: Number(dados.acertos),
    erros: Number(dados.erros),
    respondidas7d: Number(dados.respondidas_7d),
    recado,
    site: site(),
    linkDescadastro: await linkDescadastro(id)
  });
  return { dados, marco: m, email };
}
var motivo = (falha) => (falha instanceof Error ? falha.message : String(falha)).slice(0, 300);
function mesAnterior(agora = /* @__PURE__ */ new Date()) {
  const sp = new Date(agora.getTime() - 3 * 36e5);
  const ano = sp.getUTCMonth() === 0 ? sp.getUTCFullYear() - 1 : sp.getUTCFullYear();
  const mes = sp.getUTCMonth() === 0 ? 12 : sp.getUTCMonth();
  return `${ano}-${String(mes).padStart(2, "0")}`;
}
var mesValido = (mes) => mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : mesAnterior();
async function segredoValido(recebido) {
  const esperado = Deno.env.get("EMAIL_SEGREDO") ?? "";
  if (!esperado || esperado.length !== recebido.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i++) diferenca |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  return diferenca === 0;
}
async function montarRelatorio(id, mes) {
  const r = await banco("rpc/dados_relatorio_mensal", { method: "POST", body: JSON.stringify({ p_id: id, p_mes: mes }) });
  if (!r.ok) throw new Error("consulta_relatorio_falhou");
  const dados = await r.json();
  if (!dados?.email) return null;
  const email = emailRelatorio({ ...dados, site: site(), linkDescadastro: await linkDescadastro(id, "relatorio") });
  return { ...email, para: dados.email };
}
var esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
async function enviarRelatorios(mesPedido, limitePedido) {
  const mes = mesValido(mesPedido);
  const limite = Math.max(1, Math.min(Number(limitePedido) || 40, 80));
  const r = await banco("rpc/destinatarios_relatorio_mensal", { method: "POST", body: JSON.stringify({ p_mes: mes, p_limite: limite }) });
  if (!r.ok) throw new Error("consulta_destinatarios_falhou");
  const destinatarios = (await r.json()).map((d) => d.id_usuario);
  let enviados = 0, falhas = 0;
  for (const id of destinatarios) {
    const reserva = await registrar({ id_usuario: id, tipo: "relatorio", referencia: mes, status: "enviando" });
    let linha;
    if (reserva.ok) [linha] = await reserva.json();
    else {
      const retomada = await banco(`emails_enviados?id_usuario=eq.${id}&tipo=eq.relatorio&referencia=eq.${mes}&status=eq.falhou`, {
        method: "PATCH",
        body: JSON.stringify({ status: "enviando", erro: null, enviado_em: (/* @__PURE__ */ new Date()).toISOString() })
      });
      if (retomada.ok) [linha] = await retomada.json();
    }
    if (!linha) continue;
    try {
      const pronto = await montarRelatorio(id, mes);
      if (!pronto) throw new Error("usuario_sem_email");
      await enviarEmail(pronto.para, pronto.assunto, pronto.html, pronto.texto, await linkDescadastro(id, "relatorio"));
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "enviado", assunto: pronto.assunto }) });
      enviados++;
    } catch (falha) {
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "falhou", erro: motivo(falha) }) });
      falhas++;
    }
    await esperar(600);
  }
  return { mes, enviados, falhas, lote: destinatarios.length, talvez_restem: destinatarios.length === limite };
}
var CAMPANHAS = ["nunca", "tres_dias", "sete_dias"];
var campanhaValida = (c) => CAMPANHAS.includes(c ?? "") ? c : null;
async function enviarLembretes(campanha, limitePedido, por) {
  const limite = Math.max(1, Math.min(Number(limitePedido) || 40, 80));
  const r = await banco("rpc/destinatarios_lembrete", { method: "POST", body: JSON.stringify({ p_campanha: campanha, p_limite: limite }) });
  if (!r.ok) throw new Error("consulta_destinatarios_falhou");
  const destinatarios = await r.json();
  let enviados = 0, falhas = 0;
  for (const d of destinatarios) {
    const reserva = await registrar({ id_usuario: d.id_usuario, tipo: "lembrete", referencia: d.referencia, status: "enviando", enviado_por: por });
    let linha;
    if (reserva.ok) [linha] = await reserva.json();
    else {
      const retomada = await banco(`emails_enviados?id_usuario=eq.${d.id_usuario}&tipo=eq.lembrete&referencia=eq.${encodeURIComponent(d.referencia)}&status=eq.falhou`, {
        method: "PATCH",
        body: JSON.stringify({ status: "enviando", erro: null, enviado_em: (/* @__PURE__ */ new Date()).toISOString() })
      });
      if (retomada.ok) [linha] = await retomada.json();
    }
    if (!linha) continue;
    try {
      const descadastro = await linkDescadastro(d.id_usuario, "lembretes");
      const e = emailLembrete({ campanha, nome: d.nome, respondidas: Number(d.respondidas), diasFora: Number(d.dias_fora), site: site(), linkDescadastro: descadastro });
      await enviarEmail(d.email, e.assunto, e.html, e.texto, descadastro);
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "enviado", assunto: e.assunto }) });
      enviados++;
    } catch (falha) {
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "falhou", erro: motivo(falha) }) });
      falhas++;
    }
    await esperar(600);
  }
  return { campanha, enviados, falhas, lote: destinatarios.length, talvez_restem: destinatarios.length === limite };
}
async function registrar(corpo) {
  return banco("emails_enviados", { method: "POST", body: JSON.stringify(corpo) });
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json({ erro: "metodo_invalido" }, 405, req);
  try {
    const corpo = await req.json();
    if (corpo.acao === "descadastrar") {
      const tipo = corpo.tipo === "relatorio" ? "relatorio" : corpo.tipo === "lembretes" ? "lembretes" : "conquistas";
      if (!corpo.u || !corpo.t || !/^[0-9a-f-]{36}$/.test(corpo.u) || !await tokenDescadastroValido(corpo.u, corpo.t, tipo)) return json({ erro: "link_invalido" }, 400, req);
      const coluna = tipo === "relatorio" ? "relatorio_mensal" : tipo === "lembretes" ? "lembretes" : "conquistas";
      const r = await banco("preferencias_email", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id_usuario: corpo.u, [coluna]: false, atualizado_em: (/* @__PURE__ */ new Date()).toISOString() })
      });
      return r.ok ? json({ ok: true, tipo }, 200, req) : json({ erro: "nao_foi_possivel" }, 503, req);
    }
    if (corpo.acao === "relatorios_mensais" && req.headers.get("x-segredo")) {
      if (!await segredoValido(req.headers.get("x-segredo"))) return json({ erro: "acesso_negado" }, 403, req);
      return json(await enviarRelatorios(corpo.mes, corpo.limite), 200, req);
    }
    const usuario = await usuarioDoPedido(req);
    if (corpo.acao === "relatorios_mensais" || corpo.acao === "previa_relatorio") {
      if (!await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      if (corpo.acao === "previa_relatorio") {
        const pronto = await montarRelatorio(corpo.id_usuario && /^[0-9a-f-]{36}$/.test(corpo.id_usuario) ? corpo.id_usuario : usuario.id, mesValido(corpo.mes));
        return pronto ? json({ assunto: pronto.assunto, html: pronto.html }, 200, req) : json({ erro: "usuario_sem_email" }, 404, req);
      }
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      return json(await enviarRelatorios(corpo.mes, corpo.limite), 200, req);
    }
    if (corpo.acao === "lembretes" || corpo.acao === "previa_lembrete") {
      if (!await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      const campanha = campanhaValida(corpo.campanha);
      if (!campanha) return json({ erro: "campanha_invalida" }, 400, req);
      if (corpo.acao === "previa_lembrete") {
        const dados = await dadosUsuario(usuario.id);
        const e = emailLembrete({ campanha, nome: dados?.nome ?? null, respondidas: Number(dados?.respondidas ?? 0), diasFora: campanha === "sete_dias" ? 9 : 3, site: site(), linkDescadastro: await linkDescadastro(usuario.id, "lembretes") });
        return json({ assunto: e.assunto, html: e.html }, 200, req);
      }
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      return json(await enviarLembretes(campanha, corpo.limite, usuario.id), 200, req);
    }
    if (corpo.acao === "relato_resolvido" || corpo.acao === "previa_relato") {
      if (!await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      const idRelato = Number(corpo.id_relato);
      if (!Number.isInteger(idRelato) || idRelato <= 0) return json({ erro: "relato_invalido" }, 400, req);
      const r = await banco(`relatos_erro?id=eq.${idRelato}&select=id,id_usuario,id_questao,texto,status,nota_admin`);
      const [relato] = r.ok ? await r.json() : [];
      if (!relato) return json({ erro: "relato_nao_encontrado" }, 404, req);
      if (!relato.id_usuario) return json({ erro: "conta_removida" }, 404, req);
      const dados = await dadosUsuario(relato.id_usuario);
      if (!dados?.email) return json({ erro: "usuario_sem_email" }, 404, req);
      const e = emailRelatoResolvido({ nome: dados.nome, idQuestao: relato.id_questao, relato: relato.texto, nota: relato.nota_admin, site: site() });
      if (corpo.acao === "previa_relato") return json({ assunto: e.assunto, html: e.html, para: dados.email }, 200, req);
      if (relato.status !== "resolvido") return json({ erro: "relato_nao_resolvido" }, 409, req);
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      try {
        await enviarEmail(dados.email, e.assunto, e.html, e.texto);
        await banco(`relatos_erro?id=eq.${idRelato}`, { method: "PATCH", body: JSON.stringify({ avisado_em: (/* @__PURE__ */ new Date()).toISOString() }) });
        await registrar({ id_usuario: relato.id_usuario, tipo: "relato_resolvido", referencia: `relato:${idRelato}`, assunto: e.assunto, enviado_por: usuario.id });
        return json({ resultado: "enviado", para: dados.email }, 200, req);
      } catch (falha) {
        await registrar({ id_usuario: relato.id_usuario, tipo: "relato_resolvido", referencia: `relato:${idRelato}`, assunto: e.assunto, status: "falhou", erro: motivo(falha), enviado_por: usuario.id });
        return json({ erro: motivo(falha) }, 502, req);
      }
    }
    if (corpo.acao === "marco") {
      if (!emailConfigurado()) return json({ resultado: "email_nao_configurado" }, 200, req);
      const config = await banco("configuracao_emails?id=eq.true&select=marcos_automaticos");
      if (config.ok && (await config.json())[0]?.marcos_automaticos === false) return json({ resultado: "desativado" }, 200, req);
      const dados = await dadosUsuario(usuario.id);
      if (!dados?.email) return json({ resultado: "sem_email" }, 200, req);
      if (!dados.quer_conquistas) return json({ resultado: "nao_quer" }, 200, req);
      const marco = marcoAtingido(Number(dados.respondidas));
      if (!marco) return json({ resultado: "ainda_nao" }, 200, req);
      if (Number(dados.respondidas) > marco.minimo + folga(marco)) return json({ resultado: "longe_do_marco", marco: marco.minimo }, 200, req);
      const reserva = await registrar({ id_usuario: usuario.id, tipo: "marco", marco: marco.minimo, status: "enviando" });
      let linha;
      if (reserva.ok) [linha] = await reserva.json();
      else {
        const retomada = await banco(`emails_enviados?id_usuario=eq.${usuario.id}&tipo=eq.marco&marco=eq.${marco.minimo}&status=eq.falhou`, {
          method: "PATCH",
          body: JSON.stringify({ status: "enviando", erro: null, enviado_em: (/* @__PURE__ */ new Date()).toISOString() })
        });
        if (retomada.ok) [linha] = await retomada.json();
      }
      if (!linha) return json({ resultado: "ja_enviado", marco: marco.minimo }, 200, req);
      const pronto = await montar(usuario.id, marco);
      try {
        await enviarEmail(pronto.dados.email, pronto.email.assunto, pronto.email.html, pronto.email.texto, await linkDescadastro(usuario.id));
        await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "enviado", assunto: pronto.email.assunto }) });
        return json({ resultado: "enviado", marco: marco.minimo }, 200, req);
      } catch (falha) {
        await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "falhou", erro: motivo(falha) }) });
        return json({ resultado: "falhou" }, 200, req);
      }
    }
    if (corpo.acao === "alerta_avaliacao") {
      if (!corpo.id_questao || !/^[a-z0-9-]{3,80}$/.test(corpo.id_questao)) return json({ erro: "questao_invalida" }, 400, req);
      const r = await banco(`avaliacoes_comentario?usuario_id=eq.${usuario.id}&id_questao=eq.${corpo.id_questao}&util=eq.false&select=observacao,motivo,atualizado_em`);
      const [av] = r.ok ? await r.json() : [];
      if (!av?.observacao?.trim() || Date.now() - new Date(av.atualizado_em).getTime() > 15 * 6e4) return json({ resultado: "nada_a_avisar" }, 200, req);
      await alertarAdministradores(
        `Coment\xE1rio n\xE3o ajudou: ${corpo.id_questao}`,
        [`Motivo: ${av.motivo ?? "n\xE3o informado"}`, `Mensagem: ${av.observacao.trim().slice(0, 600)}`, `De: ${usuario.email ?? "conta sem e-mail"}`],
        "avaliacoes",
        `avaliacao:${usuario.id}:${corpo.id_questao}:${av.atualizado_em.slice(0, 13)}`
      );
      return json({ resultado: "ok" }, 200, req);
    }
    if (corpo.acao === "parabens" || corpo.acao === "previa") {
      if (!await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      if (!corpo.id_usuario || !/^[0-9a-f-]{36}$/.test(corpo.id_usuario)) return json({ erro: "usuario_invalido" }, 400, req);
      const recado = typeof corpo.recado === "string" ? corpo.recado.slice(0, 600) : null;
      const carta = corpo.formato !== "cartao";
      const pronto = await montar(corpo.id_usuario, null, recado, carta);
      if (!pronto) return json({ erro: "usuario_sem_email" }, 404, req);
      if (corpo.acao === "previa") return json({ assunto: pronto.email.assunto, html: pronto.email.html, quer_conquistas: pronto.dados.quer_conquistas }, 200, req);
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      if (!pronto.dados.quer_conquistas) return json({ erro: "pessoa_nao_quer_emails" }, 409, req);
      try {
        await enviarEmail(pronto.dados.email, pronto.email.assunto, pronto.email.html, pronto.email.texto, carta ? void 0 : await linkDescadastro(corpo.id_usuario));
        await registrar({ id_usuario: corpo.id_usuario, tipo: "parabens", marco: pronto.marco.minimo, assunto: pronto.email.assunto, enviado_por: usuario.id });
        return json({ resultado: "enviado" }, 200, req);
      } catch (falha) {
        await registrar({ id_usuario: corpo.id_usuario, tipo: "parabens", marco: pronto.marco.minimo, assunto: pronto.email.assunto, status: "falhou", erro: motivo(falha), enviado_por: usuario.id });
        return json({ erro: motivo(falha) }, 502, req);
      }
    }
    return json({ erro: "acao_invalida" }, 400, req);
  } catch (falha) {
    const texto = String(falha);
    if (texto.includes("autenticacao_necessaria")) return json({ erro: "autenticacao_necessaria" }, 401, req);
    return json({ erro: "erro_interno" }, 500, req);
  }
});

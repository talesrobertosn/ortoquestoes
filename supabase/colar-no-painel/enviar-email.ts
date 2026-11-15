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

// supabase/functions/_shared/cartas-versoes.ts
var N = (n) => Math.round(n).toLocaleString("pt-BR");
var Q = (n) => n >= 10 ? `${N(n)} quest\xF5es` : "algumas quest\xF5es";
var dataCurta = (iso) => iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }) : null;
var nm = (c, texto, semNome = texto.charAt(0).toUpperCase() + texto.slice(1)) => c.nome ? `${c.nome}, ${texto}` : semNome;
var ajuda = (c) => c.um("Se precisar de ajuda com o site, basta responder este e-mail.", "Pode responder por aqui se encontrar alguma dificuldade no site.", "Se tiver alguma d\xFAvida para usar esse recurso, pode me chamar por aqui.");
var prova = (c) => {
  const n = (c.p.provaCronograma ?? "").trim();
  if (/^(outra(?: prova)?|outro|prova|não informad[oa])$/i.test(n)) return "a sua prova";
  if (n) return /^(TEOT|TEPOT|TARO|ENARE)(\b|$)/i.test(n) ? `o ${n}` : `a prova de ${n}`;
  return c.nomeProva || "a sua prova";
};
var acesso = (c) => c.um("Seu hist\xF3rico de estudo e suas anota\xE7\xF5es continuam salvos na conta.", "As quest\xF5es respondidas e as revis\xF5es ficam guardadas no seu hist\xF3rico.", "Seu progresso permanece salvo para continuar de onde parou.");
var sugestao = (c, rota) => rota === "erros" ? c.um("No Caderno de erros, voc\xEA pode refazer quest\xF5es e consultar a explica\xE7\xE3o de cada alternativa.", "Uma sess\xE3o no Caderno de erros permite revisar os pontos das quest\xF5es anteriores.", "Para revisar d\xFAvidas espec\xEDficas, o Caderno de erros re\xFAne as quest\xF5es e os coment\xE1rios.") : rota === "revisao" ? c.um("Na Revis\xE3o, voc\xEA encontra as quest\xF5es indicadas para retomar os temas j\xE1 estudados.", "A Revis\xE3o re\xFAne os assuntos do seu hist\xF3rico para a pr\xF3xima sess\xE3o.", "Voc\xEA pode come\xE7ar a pr\xF3xima sess\xE3o pela Revis\xE3o e consultar os coment\xE1rios das alternativas.") : c.um("Voc\xEA pode escolher um tema e resolver algumas quest\xF5es, consultando o coment\xE1rio das alternativas.", "Uma forma de organizar a pr\xF3xima sess\xE3o \xE9 escolher um tema e ler o coment\xE1rio de cada resposta.", "Na p\xE1gina de quest\xF5es, os filtros ajudam a escolher o tema e a prova da pr\xF3xima sess\xE3o.");
var PREFERIR = [["etapa", "prova"], ["horario", "cidade"], ["servico", "flashcards"], ["resumos", "sequencia"], ["melhorArea", "areaFraca"], ["cronograma", "semana"], ["ranking", "aniversario"]];
function estudo(tema, rota = "revisao", total = 6) {
  return Array.from({ length: total }, (_, i) => ({
    id: `v${i + 21}`,
    assuntos: (c) => [nm(c, [tema, "uma sugest\xE3o para sua pr\xF3xima sess\xE3o", "seu pr\xF3ximo tema de estudo", "revis\xE3o dos temas estudados", "para organizar o pr\xF3ximo treino", "uma op\xE7\xE3o para continuar"][i % 6])],
    corpo: (c) => [
      c.um("Separei uma sugest\xE3o para a sua pr\xF3xima sess\xE3o de estudo.", "Voc\xEA pode continuar o estudo pelos temas do seu hist\xF3rico.", "H\xE1 uma forma de revisar os pontos das sess\xF5es anteriores."),
      c.tipo === "ativo" && c.chance(0.4) && c.pctBom !== null ? `Seu hist\xF3rico registra ${c.pctBom}% de acerto em ${Q(c.r)}.` : null,
      c.obs(2, ["pausa", "sumiu", "comecou_parou", "assinante_parado_7"].includes(c.tipo) ? ["maisEstudada"] : c.um(...PREFERIR)),
      sugestao(c, rota),
      `Para abrir: ${c.link(rota)}`,
      ajuda(c)
    ]
  }));
}
var nunca = () => Array.from({ length: 6 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, ["por onde come\xE7ar", "sua primeira sess\xE3o", "para escolher um tema", "um ponto de partida", "como usar os coment\xE1rios", "as quest\xF5es por assunto"][i])],
  corpo: (c) => [
    c.um("Sua conta est\xE1 pronta para come\xE7ar a estudar.", "Voc\xEA j\xE1 pode escolher um assunto para sua primeira sess\xE3o.", "As quest\xF5es est\xE3o organizadas por assunto e por prova para voc\xEA come\xE7ar."),
    sugestao(c, "treinar"),
    c.um("Depois de responder, voc\xEA pode conferir o coment\xE1rio e a an\xE1lise das alternativas.", "Os coment\xE1rios explicam a resposta e os motivos das alternativas.", "A corre\xE7\xE3o fica dispon\xEDvel depois da resposta, com a explica\xE7\xE3o das alternativas."),
    `Para escolher o primeiro tema: ${c.link("treinar")}`,
    ajuda(c)
  ]
}));
var convite = () => Array.from({ length: 6 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, ["op\xE7\xF5es para ampliar seu estudo", "sobre os planos de acesso", "recursos do plano completo", "para conhecer os planos", "assinatura do Orto Quest\xF5es", "op\xE7\xF5es de assinatura"][i])],
  corpo: (c) => [
    c.um("Queria apresentar as op\xE7\xF5es de assinatura do Orto Quest\xF5es.", "Voc\xEA pode conhecer os planos de acesso e os recursos inclu\xEDdos em cada um.", "A p\xE1gina de planos re\xFAne as op\xE7\xF5es para ampliar o acesso ao conte\xFAdo."),
    c.obs(1),
    ...c.beneficios(2, true),
    "Os planos t\xEAm garantia de sete dias. As condi\xE7\xF5es e os recursos inclu\xEDdos est\xE3o na p\xE1gina de assinatura.",
    `Para consultar os planos: ${c.link("assinatura")}`,
    ajuda(c)
  ]
}));
var boasVindas = [{ id: "v21", assuntos: (c) => [nm(c, "sua conta no Orto Quest\xF5es")], corpo: (c) => [
  "Sua conta no Orto Quest\xF5es est\xE1 pronta.",
  "Voc\xEA encontra quest\xF5es comentadas, Biblioteca de resumos e Revis\xE3o. O Cronograma permite organizar o estudo pela data da prova e pelo tempo dispon\xEDvel.",
  `Para come\xE7ar pelas quest\xF5es: ${c.link("treinar")}`,
  "Voc\xEA tamb\xE9m pode indicar o site aos colegas que estudam ortopedia.",
  ajuda(c)
] }];
var provaVersoes = (tipo) => Array.from({ length: 6 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, (tipo === "depois_prova" ? ["sobre a sua prova", "como foi o formato da prova", "sua experi\xEAncia na prova", "conte\xFAdo da prova", "sobre os temas cobrados", "coment\xE1rios sobre a prova"] : tipo === "vespera_prova" ? ["sobre a prova de amanh\xE3", "sua revis\xE3o antes da prova", "para consultar suas anota\xE7\xF5es", "\xFAltima revis\xE3o dos temas", "sua prova est\xE1 chegando", "anota\xE7\xF5es para a prova"] : ["organizar a revis\xE3o para a prova", "seus pr\xF3ximos temas de revis\xE3o", "o plano de estudo para a prova", "sobre sua revis\xE3o", "as pr\xF3ximas sess\xF5es de estudo", "sua prepara\xE7\xE3o para a prova"])[i])],
  corpo: (c) => tipo === "depois_prova" ? [
    `Como foi ${prova(c)}?`,
    c.um("Gostaria de saber quais temas apareceram e como foi o formato da prova.", "Voc\xEA pode contar quais assuntos foram cobrados e como as quest\xF5es foram apresentadas.", "Sua experi\xEAncia com o conte\xFAdo e o formato ajuda a orientar as pr\xF3ximas revis\xF5es do acervo."),
    "Se puder compartilhar alguma observa\xE7\xE3o sobre a prova, responda por aqui."
  ] : [
    tipo === "vespera_prova" ? `A data informada para ${prova(c)} \xE9 amanh\xE3.` : `A prepara\xE7\xE3o para ${prova(c)} pode ser organizada pelas pr\xF3ximas sess\xF5es de revis\xE3o.`,
    c.obs(1),
    c.um("Uma op\xE7\xE3o \xE9 revisar as quest\xF5es j\xE1 respondidas e as anota\xE7\xF5es que voc\xEA salvou.", "Os coment\xE1rios das quest\xF5es anteriores e suas anota\xE7\xF5es podem orientar a pr\xF3xima revis\xE3o.", "Voc\xEA pode selecionar os temas que quer revisar e consultar os coment\xE1rios de cada alternativa."),
    `Sua revis\xE3o fica aqui: ${c.link("revisao")}`,
    ajuda(c)
  ]
}));
var marco = (primeiro = false) => Array.from({ length: 6 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, [primeiro ? "suas primeiras quest\xF5es" : "seu novo marco de estudo", "progresso no seu hist\xF3rico", "um marco nas quest\xF5es", "seu hist\xF3rico est\xE1 crescendo", "as quest\xF5es j\xE1 respondidas", "seu progresso de estudo"][i])],
  corpo: (c) => [
    primeiro ? "Voc\xEA concluiu suas primeiras dez quest\xF5es no Orto Quest\xF5es." : `Voc\xEA chegou ao marco de ${Q(c.marco ?? 100)} respondidas. Parab\xE9ns!`,
    c.obs(1),
    sugestao(c, "revisao"),
    `Para consultar seu hist\xF3rico e sua revis\xE3o: ${c.link("revisao")}`,
    ajuda(c)
  ]
}));
var opiniao = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, ["como est\xE1 sendo usar o site?", "sua opini\xE3o sobre o Orto Quest\xF5es", "o que funciona no seu estudo", "sugest\xF5es para o site", "sobre sua experi\xEAncia no site"][i])],
  corpo: (c) => [
    c.um("Como tem sido usar o Orto Quest\xF5es?", "Queria saber sua opini\xE3o sobre o uso do site.", "Voc\xEA pode contar como est\xE1 sendo estudar pelo Orto Quest\xF5es?"),
    c.um("O que tem ajudado no estudo e o que poderia funcionar melhor?", "Quais recursos t\xEAm sido \xFAteis e onde voc\xEA encontrou dificuldade?", "Tem alguma melhoria que facilitaria sua pr\xF3xima sess\xE3o?"),
    "Voc\xEA pode responder diretamente a este e-mail com suas observa\xE7\xF5es."
  ]
}));
var indicar = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, ["indica\xE7\xE3o para colegas", "como indicar o Orto Quest\xF5es", "sua p\xE1gina de indica\xE7\xF5es", "compartilhar o site com colegas", "o programa de indica\xE7\xF5es"][i])],
  corpo: (c) => [
    c.um("Voc\xEA pode compartilhar o Orto Quest\xF5es com colegas que tamb\xE9m estudam ortopedia.", "A p\xE1gina de indica\xE7\xF5es re\xFAne o seu convite para colegas.", "O programa de indica\xE7\xF5es permite compartilhar o site com colegas de estudo."),
    "Na p\xE1gina Indique e ganhe, voc\xEA encontra o convite e os crit\xE9rios do programa.",
    `Para consultar: ${c.link("indicar")}`,
    ajuda(c)
  ]
}));
var cronograma = (pronto2 = false) => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, [pronto2 ? "seu cronograma est\xE1 salvo" : "organizar seu estudo", "sobre o cronograma", "suas pr\xF3ximas sess\xF5es", "organiza\xE7\xE3o dos temas", "consultar o plano de estudo"][i])],
  corpo: (c) => [
    pronto2 ? `Seu cronograma foi salvo${c.diasProva !== null ? `, com ${c.diasProva} dias at\xE9 ${prova(c)}` : ""}. As pr\xF3ximas sess\xF5es est\xE3o dispon\xEDveis na sua conta.` : "O Cronograma permite organizar o estudo pela data da prova e pelo tempo dispon\xEDvel.",
    c.obs(1),
    c.um("Voc\xEA pode consultar a lista de cada dia e ajustar sua disponibilidade.", "A p\xE1gina mostra as sess\xF5es previstas e permite atualizar o tempo dispon\xEDvel.", "Os temas e as revis\xF5es aparecem no planejamento das pr\xF3ximas sess\xF5es."),
    `Para abrir o Cronograma: ${c.link("cronograma")}`,
    ajuda(c)
  ]
}));
var pagamento = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, ["pagamento aprovado", "sua assinatura foi confirmada", "seu acesso est\xE1 ativo", "confirma\xE7\xE3o do seu plano", "seu per\xEDodo de acesso"][i])],
  corpo: (c) => [
    c.um("Seu pagamento foi aprovado. Obrigado pela assinatura.", "A assinatura foi confirmada e seu acesso est\xE1 ativo. Obrigado pela confian\xE7a.", "O pagamento da sua assinatura foi aprovado."),
    c.pagamento?.plano ? `O plano confirmado \xE9 o ${c.pagamento.plano}.` : null,
    c.pagamento?.fimEm ? `O per\xEDodo de acesso vai at\xE9 ${dataCurta(c.pagamento.fimEm)}.` : null,
    c.pagamento?.meio === "pix" ? "O per\xEDodo foi pago por Pix, sem renova\xE7\xE3o autom\xE1tica." : "Voc\xEA pode consultar o per\xEDodo e gerenciar a renova\xE7\xE3o em Minha assinatura.",
    `Para consultar os detalhes do seu plano: ${c.link("conta")}`,
    ajuda(c)
  ]
}));
var encerramento = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, ["sobre a altera\xE7\xE3o na assinatura", "detalhes da sua assinatura", "confirma\xE7\xE3o da sua solicita\xE7\xE3o", "atualiza\xE7\xE3o do seu plano", "informa\xE7\xF5es da sua assinatura"][i])],
  corpo: (c) => [
    c.encerramento?.reembolso ? "Sua solicita\xE7\xE3o de reembolso foi registrada." : `O cancelamento da renova\xE7\xE3o foi registrado${dataCurta(c.encerramento?.fimEm) ? `, com acesso at\xE9 ${dataCurta(c.encerramento?.fimEm)}` : ""}.`,
    acesso(c),
    `Voc\xEA pode consultar os detalhes em Minha assinatura: ${c.link("conta")}`,
    "Se houver alguma d\xFAvida sobre a solicita\xE7\xE3o, responda a este e-mail."
  ]
}));
var relatorio = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, ["seu resumo de estudo", "o estudo neste per\xEDodo", "seu hist\xF3rico no per\xEDodo", "suas sess\xF5es de estudo", "resumo das suas sess\xF5es"][i])],
  corpo: (c) => {
    const d = c.relatorio, n = d?.respostas ?? 0, total = (d?.certas ?? 0) + (d?.erradas ?? 0), pct = total ? Math.round((d?.certas ?? 0) / total * 100) : null;
    const citavel = n >= 30 && pct !== null && pct >= 50;
    const delta = citavel && d?.acertoAnterior !== null && d?.acertoAnterior !== void 0 ? pct - d.acertoAnterior : null;
    return [
      d?.rotulo ? `Este \xE9 seu resumo de estudo ${d.rotulo}.` : "Seu resumo de estudo est\xE1 dispon\xEDvel.",
      n >= 10 ? `No per\xEDodo, voc\xEA respondeu ${Q(n)}.` : n > 0 ? "Seu hist\xF3rico registra novas respostas neste per\xEDodo." : "O hist\xF3rico e as anota\xE7\xF5es das sess\xF5es anteriores continuam dispon\xEDveis.",
      citavel ? `O acerto no per\xEDodo foi de ${pct}%.${delta !== null && delta > 0 ? ` O resultado subiu ${delta} pontos em rela\xE7\xE3o ao per\xEDodo anterior.` : ""}` : null,
      c.um("Voc\xEA pode consultar os temas estudados e as quest\xF5es indicadas para revis\xE3o.", "Os detalhes das sess\xF5es ajudam a escolher os pr\xF3ximos temas para revisar.", "O hist\xF3rico re\xFAne suas respostas e as revis\xF5es dos temas j\xE1 estudados."),
      `Para consultar: ${c.link("desempenho")}`,
      ajuda(c)
    ];
  }
}));
var aniversario = (conta = false) => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, (conta ? ["anivers\xE1rio da sua conta", "seu tempo no Orto Quest\xF5es", "um ano de conta", "sua conta faz anivers\xE1rio", "anivers\xE1rio no Orto Quest\xF5es"] : ["feliz anivers\xE1rio", "um \xF3timo anivers\xE1rio", "para o seu anivers\xE1rio", "parab\xE9ns pelo anivers\xE1rio", "felicidades no seu anivers\xE1rio"])[i])],
  corpo: (c) => conta ? [
    `Sua conta no Orto Quest\xF5es completa ${(c.campanha.anos ?? 1) === 2 ? "dois" : c.campanha.anos ?? 1} ${(c.campanha.anos ?? 1) === 1 ? "ano" : "anos"}.`,
    c.um("Obrigado por fazer parte do Orto Quest\xF5es.", "Obrigado por estudar com o Orto Quest\xF5es.", "Obrigado por compartilhar esse per\xEDodo com o Orto Quest\xF5es."),
    acesso(c)
  ] : [
    c.um("Feliz anivers\xE1rio!", "Parab\xE9ns pelo seu anivers\xE1rio!", "Desejo um \xF3timo anivers\xE1rio para voc\xEA!"),
    c.um("Desejo sa\xFAde e bons momentos neste novo ano de vida.", "Que este novo ano traga sa\xFAde e boas realiza\xE7\xF5es.", "Espero que voc\xEA tenha um \xF3timo dia e um novo ano de boas realiza\xE7\xF5es.")
  ]
}));
var indicacao = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, ["sua indica\xE7\xE3o foi confirmada", "atualiza\xE7\xE3o da sua indica\xE7\xE3o", "resultado da sua indica\xE7\xE3o", "sobre seu convite", "indica\xE7\xE3o no Orto Quest\xF5es"][i])],
  corpo: (c) => [
    "A pessoa que voc\xEA indicou chegou a 20 quest\xF5es respondidas. Sua indica\xE7\xE3o foi confirmada.",
    c.campanha.cortesia ? "Os detalhes dos dias de cortesia est\xE3o na p\xE1gina de indica\xE7\xF5es." : "Voc\xEA pode consultar o resultado e os crit\xE9rios do programa na p\xE1gina de indica\xE7\xF5es.",
    `Para consultar: ${c.link("indicar")}`,
    ajuda(c)
  ]
}));
var resumo = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, ["resumo novo para seu estudo", "uma atualiza\xE7\xE3o na Biblioteca", "novo conte\xFAdo na Biblioteca", "um resumo do seu tema", "resumo dispon\xEDvel para leitura"][i])],
  corpo: (c) => [
    c.campanha.resumo?.titulo ? `O resumo "${c.campanha.resumo.titulo}" est\xE1 dispon\xEDvel na Biblioteca.` : "H\xE1 um resumo novo relacionado aos temas do seu estudo na Biblioteca.",
    c.um("O texto re\xFAne os pontos do tema e as quest\xF5es vinculadas para resolver durante a leitura.", "Voc\xEA pode ler por se\xE7\xE3o e resolver as quest\xF5es relacionadas ao tema.", "O resumo pode ser consultado junto das quest\xF5es do tema."),
    `Para abrir: ${c.link("resumo")}`,
    ajuda(c)
  ]
}));
var simulado = (resultado = false) => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, (resultado ? ["resultado do Simulado Nacional", "seu resultado est\xE1 dispon\xEDvel", "corre\xE7\xE3o do seu simulado", "os coment\xE1rios do simulado", "consulta do seu resultado"] : ["sobre o Simulado Nacional", "sua inscri\xE7\xE3o no simulado", "acesso ao seu simulado", "data do Simulado Nacional", "informa\xE7\xF5es do seu simulado"])[i])],
  corpo: (c) => {
    const s = c.campanha.simulado, l = c.campanha.lembrete;
    return [
      resultado ? `O resultado${s?.titulo ? ` de "${s.titulo}"` : " do Simulado Nacional"} est\xE1 dispon\xEDvel.` : `Voc\xEA se inscreveu no Simulado Nacional${l?.titulo ? ` "${l.titulo}"` : ""}.`,
      resultado && s?.total && s?.acertos !== null && s?.acertos !== void 0 && s.acertos >= 10 && s.acertos * 2 >= s.total ? `Seu resultado foi de ${s.acertos} em ${s.total} respostas.` : null,
      !resultado && l?.tipo_lembrete === "abre_amanha" ? "O simulado abre amanh\xE3." : !resultado && l?.tipo_lembrete === "abriu_hoje" ? "O simulado j\xE1 est\xE1 aberto." : !resultado && l?.abre_em ? `A abertura est\xE1 prevista para ${dataCurta(l.abre_em)}${l.fecha_em ? `, com encerramento em ${dataCurta(l.fecha_em)}` : ""}.` : null,
      !resultado && l?.total && l.total >= 10 ? `A edi\xE7\xE3o tem ${l.total} quest\xF5es${l.duracao_min ? `, com dura\xE7\xE3o de ${{ 120: "duas horas", 240: "quatro horas" }[l.duracao_min] ?? `${l.duracao_min} minutos`}` : ""}.` : null,
      !resultado && l?.precisa_plano ? "Esta edi\xE7\xE3o exige assinatura ativa para participar." : null,
      c.um("A p\xE1gina do simulado re\xFAne as informa\xE7\xF5es da edi\xE7\xE3o.", "Voc\xEA pode consultar as informa\xE7\xF5es da edi\xE7\xE3o na p\xE1gina do simulado.", "As informa\xE7\xF5es e o acesso \xE0 edi\xE7\xE3o est\xE3o na p\xE1gina do simulado."),
      `Para consultar: ${c.link("simulado")}`,
      ajuda(c)
    ];
  }
}));
var pix_3_dias = /* @__PURE__ */ ["sobre a renova\xE7\xE3o do seu acesso", "para prolongar sua assinatura", "seu acesso ao Orto Quest\xF5es", "sobre o per\xEDodo do seu plano", "renova\xE7\xE3o da sua assinatura"].map((assunto, i) => ({
  id: `v${i + 11}`,
  assuntos: (c) => [nm(c, assunto, assunto.charAt(0).toUpperCase() + assunto.slice(1))],
  corpo: (c) => [
    c.um(`Seu acesso pago por Pix termina em ${dataCurta(c.pix?.fimEm) ?? "tr\xEAs dias"}.`, `O per\xEDodo atual da sua assinatura por Pix vai at\xE9 ${dataCurta(c.pix?.fimEm) ?? "daqui a tr\xEAs dias"}.`, `Seu plano pago por Pix est\xE1 perto do fim do per\xEDodo${dataCurta(c.pix?.fimEm) ? `, em ${dataCurta(c.pix?.fimEm)}` : ""}.`),
    c.um("Voc\xEA j\xE1 pode prolongar a assinatura em Minha assinatura. Os dias do novo per\xEDodo s\xE3o somados aos que voc\xEA ainda tem, sem perder o saldo atual.", "Em Minha assinatura, voc\xEA pode acrescentar mais tempo ao seu plano. O novo per\xEDodo come\xE7a depois dos dias que j\xE1 est\xE3o pagos.", "Para prolongar o acesso, basta escolher o pr\xF3ximo per\xEDodo em Minha assinatura. Os dias restantes continuam valendo e o novo per\xEDodo \xE9 acrescentado ao saldo."),
    c.um("Seu hist\xF3rico de quest\xF5es, revis\xF5es e anota\xE7\xF5es continua salvo na conta.", "Suas quest\xF5es respondidas e anota\xE7\xF5es permanecem guardadas na conta.", "Seu progresso de estudo continua salvo para voc\xEA seguir de onde parou."),
    `Para consultar as op\xE7\xF5es e prolongar: ${c.link("conta")}`,
    c.um("Se precisar de ajuda com a renova\xE7\xE3o, basta responder este e-mail.", "Pode responder por aqui se tiver alguma d\xFAvida sobre a renova\xE7\xE3o.", "Se surgir alguma dificuldade para prolongar o acesso, me avise por aqui.")
  ]
}));
var cartao_recusado = /* @__PURE__ */ ["sobre a tentativa de pagamento", "posso ajudar com o pagamento?", "uma alternativa para o seu pagamento", "para concluir sua assinatura", "sobre o seu cart\xE3o"].map((assunto, i) => ({
  id: `v${i + 1}`,
  assuntos: (c) => [nm(c, assunto, assunto.charAt(0).toUpperCase() + assunto.slice(1))],
  corpo: (c) => [
    c.um("N\xE3o foi poss\xEDvel concluir o pagamento no cart\xE3o. Posso ajudar?", "O pagamento no cart\xE3o n\xE3o foi confirmado. Voc\xEA tamb\xE9m pode concluir a assinatura por Pix.", "A tentativa de pagamento no cart\xE3o n\xE3o foi conclu\xEDda. H\xE1 outra op\xE7\xE3o dispon\xEDvel para assinar: o Pix."),
    c.um("O Pix est\xE1 dispon\xEDvel na p\xE1gina de planos, junto das op\xE7\xF5es de cart\xE3o.", "Voc\xEA pode concluir a assinatura por Pix na p\xE1gina de planos.", "A p\xE1gina de planos permite escolher o per\xEDodo de assinatura e pagar por Pix."),
    `Voc\xEA pode conferir por aqui: ${c.link("assinatura")}`,
    "Se aparecer uma mensagem de erro, pode responder este e-mail com uma captura dela. Esconda n\xFAmeros de cart\xE3o, c\xF3digos de seguran\xE7a e outros dados pessoais antes de enviar.",
    c.um("Se precisar de ajuda para concluir, pode me chamar respondendo este e-mail.", "Pode responder por aqui se tiver alguma d\xFAvida sobre o pagamento.", "Se tiver alguma d\xFAvida ao escolher o Pix, responda por aqui que eu te ajudo.")
  ]
}));
var pix_hoje = /* @__PURE__ */ ["seu per\xEDodo de acesso termina hoje", "renova\xE7\xE3o do seu acesso", "para continuar com seu plano", "sobre sua assinatura", "prolongar o per\xEDodo do seu plano"].map((assunto, i) => ({
  id: `v${i + 11}`,
  assuntos: (c) => [nm(c, assunto, assunto.charAt(0).toUpperCase() + assunto.slice(1))],
  corpo: (c) => [
    c.um("O per\xEDodo atual do seu acesso pago por Pix termina hoje.", "Seu plano pago por Pix chega ao fim do per\xEDodo hoje.", "Hoje termina o per\xEDodo que voc\xEA pagou por Pix."),
    c.um("Voc\xEA pode prolongar a assinatura em Minha assinatura. O novo per\xEDodo se soma ao que voc\xEA j\xE1 tem.", "Para continuar com o plano, escolha o pr\xF3ximo per\xEDodo em Minha assinatura. Os dias j\xE1 pagos s\xE3o preservados.", "A op\xE7\xE3o de prolongar o acesso j\xE1 est\xE1 em Minha assinatura, com os per\xEDodos dispon\xEDveis para escolher."),
    c.um("Seu hist\xF3rico de estudo e suas anota\xE7\xF5es continuam salvos.", "Suas quest\xF5es respondidas e revis\xF5es seguem guardadas na conta.", "Seu progresso permanece salvo para continuar de onde parou."),
    `As op\xE7\xF5es est\xE3o aqui: ${c.link("conta")}`,
    c.um("Se precisar de ajuda com o pagamento, pode responder este e-mail.", "Pode me chamar por aqui se tiver alguma d\xFAvida para renovar.", "Se encontrar alguma dificuldade na renova\xE7\xE3o, me avise respondendo por aqui.")
  ]
}));
var VERSOES = {
  "ativo:0-10": /* @__PURE__ */ estudo("uma sugest\xE3o para estudar por tema", "treinar"),
  "ativo:10-20": /* @__PURE__ */ estudo("coment\xE1rios e quest\xF5es por tema", "treinar"),
  "ativo:20-30": /* @__PURE__ */ estudo("revis\xE3o das quest\xF5es anteriores", "erros"),
  "ativo:30-40": /* @__PURE__ */ estudo("sua pr\xF3xima revis\xE3o", "revisao"),
  "ativo:40-60": /* @__PURE__ */ estudo("organizar a pr\xF3xima sess\xE3o", "revisao"),
  "ativo:60-70": /* @__PURE__ */ estudo("revis\xE3o dos pontos espec\xEDficos", "erros"),
  "ativo:70-80": /* @__PURE__ */ estudo("para consultar seu Caderno de erros", "erros"),
  "ativo:80-90": /* @__PURE__ */ estudo("revis\xE3o de temas espec\xEDficos", "erros"),
  "ativo:90-100": /* @__PURE__ */ estudo("suas pr\xF3ximas revis\xF5es", "revisao"),
  nunca_comecou: /* @__PURE__ */ nunca(),
  boas_vindas: /* @__PURE__ */ estudo("recursos para seu estudo", "treinar"),
  boas_vindas_dia0: boasVindas,
  comecando: /* @__PURE__ */ estudo("uma sess\xE3o de quest\xF5es", "treinar"),
  comecou_parou: /* @__PURE__ */ estudo("continuar pelos temas j\xE1 estudados"),
  pausa: /* @__PURE__ */ estudo("sua revis\xE3o est\xE1 dispon\xEDvel"),
  sumiu: /* @__PURE__ */ estudo("seu hist\xF3rico de estudo"),
  voltou: /* @__PURE__ */ estudo("continuar sua revis\xE3o"),
  assinante_parado_7: /* @__PURE__ */ estudo("acesso \xE0s suas revis\xF5es"),
  como_estao: /* @__PURE__ */ estudo("uma op\xE7\xE3o para a pr\xF3xima sess\xE3o"),
  acesso_terminou: /* @__PURE__ */ estudo("consultar seu hist\xF3rico de estudo"),
  convite_20: /* @__PURE__ */ convite(),
  convite_50: /* @__PURE__ */ convite(),
  reta_final: /* @__PURE__ */ provaVersoes("reta_final"),
  vespera_prova: /* @__PURE__ */ provaVersoes("vespera_prova"),
  depois_prova: /* @__PURE__ */ provaVersoes("depois_prova"),
  marco: /* @__PURE__ */ marco(),
  primeiras_10: /* @__PURE__ */ marco(true),
  opiniao: /* @__PURE__ */ opiniao(),
  indicar: /* @__PURE__ */ indicar(),
  cronograma: /* @__PURE__ */ cronograma(),
  cronograma_pronto: /* @__PURE__ */ cronograma(true),
  pagamento_aprovado: /* @__PURE__ */ pagamento(),
  obrigado_tempo: /* @__PURE__ */ encerramento(),
  relatorio: /* @__PURE__ */ relatorio(),
  aniversario: /* @__PURE__ */ aniversario(),
  um_ano: /* @__PURE__ */ aniversario(true),
  indicacao_deu_certo: /* @__PURE__ */ indicacao(),
  resumo_do_tema: /* @__PURE__ */ resumo(),
  simulado_resultado: /* @__PURE__ */ simulado(true),
  simulado_lembrete: /* @__PURE__ */ simulado(),
  pix_3_dias,
  pix_hoje,
  cartao_recusado,
  // Mantidos apenas para leitura de histórico; o bloqueio central impede novos envios.
  obrigado_assinatura: /* @__PURE__ */ pagamento(),
  assinou_sem_cronograma: /* @__PURE__ */ cronograma()
};

// supabase/functions/_shared/cartas.ts
var ROTULO_FAIXA = {
  "0-10": "at\xE9 10%",
  "10-20": "10 a 20%",
  "20-30": "20 a 30%",
  "30-40": "30 a 40%",
  "40-60": "na m\xE9dia (40 a 60%)",
  "60-70": "60 a 70%",
  "70-80": "70 a 80%",
  "80-90": "80 a 90%",
  "90-100": "90% ou mais"
};
function nomeProvaInformado(valor) {
  const nome = (valor ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return /^(outra(?: prova)?|outro|n[aã]o informad[oa]|prova)$/i.test(nome) || /[@<>]/.test(nome) || !/\p{L}/u.test(nome) ? "" : nome;
}
function provaComArtigo(valor) {
  const nome = nomeProvaInformado(valor);
  return !nome ? "a sua prova" : /^(?:TEOT|TEPOT|TARO|ENARE)(?:\b|$)/i.test(nome) ? `o ${nome}` : `a prova de ${nome.replace(/^prova\s+(?:de\s+)?/i, "")}`;
}
var TIPOS_AUTOMATICOS_NOVOS = ["boas_vindas_dia0", "primeiras_10", "voltou", "cronograma_pronto", "pagamento_aprovado", "obrigado_tempo"];
var TIPOS_CAMPANHAS_DIARIAS = ["assinante_parado_7", "simulado_resultado", "vespera_prova", "depois_prova", "aniversario", "um_ano", "indicacao_deu_certo", "resumo_do_tema", "simulado_lembrete"];
var TIPOS_TRANSACIONAIS = ["pix_hoje", "pagamento_aprovado", "obrigado_tempo", "relato_resolvido", "alerta_admin"];
var ASSINATURA = "Um abra\xE7o,\nTales, do Orto Quest\xF5es";
var DATA_TEOT = "2027-01-10T12:00:00-03:00";
var MINIMO_PARA_ACERTO = 30;
var MINIMO_PARA_NUMERO = 10;
var MAXIMO_ASSUNTO = 55;
var LINHAS = { minimo: 6, maximo: 12 };
var CADENCIA = { horas: 48, dias: 14, maximoNoPeriodo: 3 };
var PALAVRAS_PROMOCAO = ["gr\xE1tis", "gratis", "gratuito", "oferta", "desconto", "aproveite", "imperd\xEDvel", "imperdivel", "promo\xE7\xE3o", "promocao", "\xFAltima chance", "ultima chance", "urgente", "compre", "r$"];
var SITE_PADRAO = "https://ortoquestoes.com.br/";
var numero = (n) => Math.round(n).toLocaleString("pt-BR");
var questoes = (n) => n >= MINIMO_PARA_NUMERO ? `${numero(n)} quest\xF5es` : "os primeiros passos";
var dias = (n) => n === 1 ? "1 dia" : `${numero(n)} dias`;
var AREAS = {
  // sabor[0] entra em elogio (melhor área); o último entra em "área mais estudada" e não
  // pode afirmar desempenho, só reconhecer o tema.
  "mao": { em: "m\xE3o e punho", de: "m\xE3o", sabor: ["\xC9 uma \xE1rea cheia de detalhe bonito de anatomia, e a banca adora.", "M\xE3o \xE9 uma \xE1rea linda, e a banca adora cobrar.", "\xC1rea bem da hora, essa."] },
  "ombro-cotovelo": { em: "ombro e cotovelo", de: "ombro e cotovelo", sabor: ["Ombro tem muita classifica\xE7\xE3o, ent\xE3o isso pesa a seu favor.", "\xC9 um tema que recompensa quem se dedica."] },
  "quadril": { em: "quadril", de: "quadril", sabor: ["Quadril aparece em toda prova, ent\xE3o isso vale muito.", "Bom tema para ter na ponta da l\xEDngua."] },
  "joelho": { em: "joelho", de: "joelho", sabor: ["Joelho rende muito na prova, ent\xE3o isso vale ouro.", "Tema cl\xE1ssico, bom de ter afiado."] },
  "coluna": { em: "coluna", de: "coluna", sabor: ["Coluna assusta muita gente, ent\xE3o ter isso afiado conta muito.", "Coluna recompensa muito quem se dedica."] },
  "pe-tornozelo": { em: "p\xE9 e tornozelo", de: "p\xE9 e tornozelo", sabor: ["P\xE9 e tornozelo tem muito ep\xF4nimo, e voc\xEA est\xE1 dominando.", "\xC1rea cheia de detalhe, boa de conhecer a fundo."] },
  "trauma": { em: "trauma", de: "trauma", sabor: ["Trauma \xE9 o feij\xE3o com arroz da prova, ent\xE3o isso sustenta a nota.", "Trauma bem estudado sustenta a nota."] },
  "pediatria": { em: "ortopedia pedi\xE1trica", de: "ortopedia pedi\xE1trica", sabor: ["Pedi\xE1trica tem muita classifica\xE7\xE3o, ent\xE3o isso tem muito valor.", "\xC1rea cheia de nome pr\xF3prio, boa de conhecer a fundo."] },
  "tumores": { em: "tumores", de: "tumor", sabor: ["Tumor assusta muita gente, ent\xE3o isso \xE9 \xF3timo.", "Tumor \xE9 um tema que muita gente evita, e voc\xEA est\xE1 encarando."] },
  "conceitos-basicos": { em: "conceitos b\xE1sicos", de: "conceitos b\xE1sicos", sabor: ["Base bem feita sustenta todo o resto."] },
  "osteometabolicas": { em: "doen\xE7as osteometab\xF3licas", de: "doen\xE7as osteometab\xF3licas", sabor: ["Tema pequeno, mas que a banca n\xE3o esquece."] }
};
function mulberry32(semente) {
  let a = semente >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function sementeDe(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function primeiroNome(nome) {
  const primeiro = (nome ?? "").trim().split(/\s+/)[0] ?? "";
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return "";
  return primeiro.charAt(0).toLocaleUpperCase("pt-BR") + primeiro.slice(1).toLocaleLowerCase("pt-BR");
}
function faixaDe(acerto) {
  if (acerto < 10) return "0-10";
  if (acerto < 20) return "10-20";
  if (acerto < 30) return "20-30";
  if (acerto < 40) return "30-40";
  if (acerto < 60) return "40-60";
  if (acerto < 70) return "60-70";
  if (acerto < 80) return "70-80";
  if (acerto < 90) return "80-90";
  return "90-100";
}
function acertoCitavel(p) {
  const a = Number(p.acertos ?? 0), e = Number(p.erros ?? 0);
  if (!(p.respondidas >= MINIMO_PARA_ACERTO) || a + e <= 0 || !Number.isFinite(a) || !Number.isFinite(e)) return null;
  return Math.round(100 * a / (a + e));
}
function diasAteTeot(hoje = /* @__PURE__ */ new Date()) {
  return Math.max(0, Math.ceil((new Date(DATA_TEOT).getTime() - hoje.getTime()) / 864e5));
}
var MARCOS_CARTA = [100, 250, 500, 1e3, 2e3];
function marcoRecente(respondidas, marcos = MARCOS_CARTA) {
  for (const m of [...marcos].reverse()) if (respondidas >= m && respondidas <= m + Math.max(30, Math.round(m * 0.05))) return m;
  return null;
}
var diasDesde = (iso, hoje) => (hoje.getTime() - new Date(iso).getTime()) / 864e5;
var familia = (modelo) => (modelo ?? "").split(":")[0];
var saiu = (e) => (e.status ?? "enviado") !== "falhou";
var contaNaCadencia = (e) => saiu(e) && !TIPOS_TRANSACIONAIS.includes(e.tipo ?? "") && !TIPOS_TRANSACIONAIS.includes(familia(e.modelo));
var TIPOS_PERIODICOS = ["relatorio"];
function cadenciaBloqueia(anteriores = [], hoje = /* @__PURE__ */ new Date(), tipo) {
  if (tipo && (TIPOS_TRANSACIONAIS.includes(tipo) || TIPOS_PERIODICOS.includes(tipo))) return null;
  const validos = anteriores.filter(contaNaCadencia).filter((e) => Number.isFinite(new Date(e.em).getTime()));
  const ultimo = validos.map((e) => diasDesde(e.em, hoje)).filter((d) => d >= 0).sort((a, b) => a - b)[0];
  if (ultimo !== void 0 && ultimo * 24 < CADENCIA.horas) {
    const horas = Math.max(1, Math.ceil(CADENCIA.horas - ultimo * 24));
    return `Cad\xEAncia: recebeu um e-mail h\xE1 menos de 48 horas. A pr\xF3xima carta pode sair em ${horas === 1 ? "1 hora" : `${horas} horas`}.`;
  }
  const noPeriodo = validos.filter((e) => {
    const d = diasDesde(e.em, hoje);
    return d >= 0 && d <= CADENCIA.dias;
  });
  if (noPeriodo.length >= CADENCIA.maximoNoPeriodo) {
    const maisAntigo = Math.max(...noPeriodo.map((e) => diasDesde(e.em, hoje)));
    const faltam = Math.max(1, Math.ceil(CADENCIA.dias - maisAntigo));
    return `Cad\xEAncia: j\xE1 recebeu ${noPeriodo.length} e-mails nos \xFAltimos 14 dias. A pr\xF3xima carta pode sair em ${dias(faltam)}.`;
  }
  return null;
}
function escolherTipo(p, anteriores = [], hoje = /* @__PURE__ */ new Date()) {
  const r = Math.max(0, Math.floor(Number(p.respondidas) || 0));
  const parado = p.diasParado ?? null;
  const conta = p.diasConta ?? 999;
  const recebeu = (f, dentroDeDias = Infinity) => anteriores.some((e) => saiu(e) && familia(e.modelo) === f && diasDesde(e.em, hoje) <= dentroDeDias);
  const acerto = acertoCitavel({ ...p, respondidas: r });
  const com = (tipo, faixa, marco3, motivo2) => ({ tipo, faixa, marco: marco3, motivo: motivo2, bloqueio: cadenciaBloqueia(anteriores, hoje, tipo) });
  if (r === 0) return com("nunca_comecou", null, null, "Ainda n\xE3o respondeu nenhuma quest\xE3o.");
  const fimAcesso = p.fimAcesso ? new Date(p.fimAcesso) : null;
  if (!p.assinante && fimAcesso && Number.isFinite(fimAcesso.getTime())) {
    const desde = Math.floor(diasDesde(p.fimAcesso, hoje));
    if (desde >= 0 && desde <= 30 && !recebeu("acesso_terminou", 60)) return com("acesso_terminou", null, null, `O acesso pago terminou ${desde === 0 ? "hoje" : desde === 1 ? "ontem" : `h\xE1 ${dias(desde)}`} e n\xE3o foi renovado.`);
  }
  if (parado !== null && parado >= 10) return com("sumiu", null, null, `Sem responder h\xE1 ${dias(parado)}.`);
  if (r < MINIMO_PARA_ACERTO && parado !== null && parado >= 3) return com("comecou_parou", null, null, `Fez ${questoes(r)} e parou h\xE1 ${dias(parado)}.`);
  if (r < MINIMO_PARA_ACERTO && conta <= 3) return com("boas_vindas", null, null, "Chegou h\xE1 poucos dias e j\xE1 come\xE7ou.");
  const marco2 = marcoRecente(r, MARCOS_CARTA);
  if (marco2 && !anteriores.some((e) => (e.tipo === "marco" || familia(e.modelo) === "marco") && (e.marco ?? null) === marco2) && !recebeu("marco", 20)) {
    return com("marco", null, marco2, `Acabou de passar de ${numero(marco2)} quest\xF5es.`);
  }
  const provas = p.provas ?? [];
  const teot = provas.includes("teot") || !provas.length && (p.ano === "r3" || p.situacao === "r4");
  const diasProva = p.diasParaProva ?? (teot ? diasAteTeot(hoje) : null);
  if (diasProva !== null && diasProva <= 60 && (teot || p.diasParaProva) && !recebeu("reta_final", 30)) return com("reta_final", null, null, `Faltam ${dias(diasProva)} para a prova.`);
  if (!p.assinante && r > 20 && !recebeu("convite_20", 30) && !recebeu("convite_50", 30)) {
    return r > 50 ? com("convite_50", acerto === null ? null : faixaDe(acerto), null, `N\xE3o assina e j\xE1 fez ${questoes(r)}.`) : com("convite_20", null, null, `N\xE3o assina e j\xE1 fez ${questoes(r)}.`);
  }
  if (acerto === null) return com("comecando", null, null, `Estudando, com ${questoes(r)} (pouco para falar de acerto).`);
  return com("ativo", faixaDe(acerto), null, `Estudando, acerto de ${acerto}% (faixa ${ROTULO_FAIXA[faixaDe(acerto)]}).`);
}
function servicoComArtigo(nome) {
  const n = nome.trim().replace(/\s+/g, " ");
  if (!n || n.length > 60 || /[@\d]{3,}/.test(n)) return "do seu servi\xE7o";
  if (/^(hospital|hosp\.?|hc\b|hu\b|hm\b|hgo|hge|hospital geral|instituto|into|centro|complexo|hcfmusp|hupe|hupaa|hb\b)/i.test(n)) return `do ${n}`;
  if (/^(santa casa|clínica|clinica|faculdade|universidade|unimed|beneficência|beneficencia|irmandade|fundação|fundacao|maternidade|casa de saúde|casa de saude|rede|aacd)/i.test(n)) return `da ${n}`;
  return "do seu servi\xE7o";
}
function aniversarioDe(nascimento, hoje) {
  const m = (nascimento ?? "").trim().match(/^(?:\d{4}-)?(\d{2})-(\d{2})/);
  if (!m) return null;
  const mes = Number(m[1]), dia = Number(m[2]);
  if (!(mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31)) return null;
  const sp = new Date(hoje.getTime() - 3 * 36e5);
  const ano = sp.getUTCFullYear();
  const base = Date.UTC(ano, sp.getUTCMonth(), sp.getUTCDate());
  for (const a of [ano, ano + 1]) {
    const d = Math.round((Date.UTC(a, mes - 1, dia) - base) / 864e5);
    if (d === 0) return "hoje";
    if (d > 0 && d <= 3) return "perto";
  }
  return null;
}
function fatosDe(p, hoje = /* @__PURE__ */ new Date()) {
  const f = {};
  const geral = acertoCitavel(p);
  const areas = (p.areas ?? []).filter((a) => AREAS[a.slug] && a.total > 0 && a.certas >= 0 && a.certas <= a.total);
  const comAcerto = areas.filter((a) => a.total >= 15).map((a) => ({ ...a, pct: Math.round(100 * a.certas / a.total) }));
  const melhor = [...comAcerto].sort((a, b) => b.pct - a.pct || b.total - a.total)[0];
  if (melhor && melhor.pct >= 70 && (geral === null || melhor.pct >= geral + 5)) f.melhorArea = { slug: melhor.slug, pct: melhor.pct, total: melhor.total };
  const fraca = [...comAcerto].filter((a) => a.total >= 40).sort((a, b) => a.pct - b.pct || b.total - a.total)[0];
  if (fraca && geral !== null && fraca.pct < 60 && fraca.pct <= geral - 10 && fraca.slug !== f.melhorArea?.slug) f.areaFraca = { slug: fraca.slug, total: fraca.total };
  const total = areas.reduce((s, a) => s + a.total, 0);
  const estudada = [...areas].sort((a, b) => b.total - a.total)[0];
  if (estudada && estudada.total >= 25 && total > 0 && estudada.total / total >= 0.35) f.maisEstudada = { slug: estudada.slug, total: estudada.total };
  const horas = (p.horas ?? []).filter((h) => Number.isInteger(h.hora) && h.hora >= 0 && h.hora < 24 && h.n > 0);
  const soma = horas.reduce((s, h) => s + h.n, 0);
  if (soma >= 40) {
    const parte = (de, ate) => horas.filter((h) => h.hora >= de && h.hora < ate).reduce((s, h) => s + h.n, 0) / soma;
    if (parte(0, 5) >= 0.3) f.horario = "madrugada";
    else if (parte(19, 24) >= 0.5) f.horario = "noite";
    else if (parte(5, 9) >= 0.45) f.horario = "manha";
    else if (parte(11, 14) >= 0.45) f.horario = "almoco";
    else if (parte(14, 19) >= 0.55) f.horario = "tarde";
  }
  const provas = (p.provas ?? []).filter(Boolean);
  for (const prova2 of ["teot", "taro", "mao", "r4", "atualizacao"]) if (provas.includes(prova2)) {
    f.prova = prova2;
    break;
  }
  if (p.situacao === "residente" && (p.ano === "r1" || p.ano === "r2" || p.ano === "r3")) f.etapa = p.ano;
  else if (p.situacao === "r4" || p.situacao === "mao" || p.situacao === "estudante" || p.situacao === "ortopedista") f.etapa = p.situacao;
  const pos = Number(p.posicaoRanking);
  if (Number.isInteger(pos) && pos >= 1 && pos <= 100 && p.respondidas >= 50) f.ranking = pos;
  const seq = Number(p.sequencia);
  if (Number.isInteger(seq) && seq >= 3) f.sequencia = seq;
  const fc = Number(p.flashcards);
  if (Number.isFinite(fc) && fc >= 20) f.flashcards = Math.round(fc);
  const sem = Number(p.semana);
  if (Number.isFinite(sem) && sem >= 30) f.semana = Math.round(sem);
  const rl = p.resumosLidos;
  if (rl && Number.isFinite(Number(rl.total)) && Number(rl.total) >= 1) {
    const titulo = (rl.titulos ?? []).map((t) => String(t ?? "").trim()).find((t) => t.length >= 3 && t.length <= 80) ?? null;
    f.resumos = { total: Math.round(Number(rl.total)), titulo };
  }
  let diasProva = p.diasParaProva === null || p.diasParaProva === void 0 ? NaN : Number(p.diasParaProva);
  if (!Number.isFinite(diasProva) && p.provaData) diasProva = Math.ceil((new Date(p.provaData).getTime() - hoje.getTime()) / 864e5);
  if (Number.isFinite(diasProva) && diasProva >= 1 && diasProva <= 730) {
    const nome = nomeProvaInformado(p.provaCronograma);
    f.cronograma = { dias: Math.round(diasProva), prova: nome || null };
  }
  const servico = (p.servico ?? "").trim();
  if (servico.length >= 3) f.servico = { nome: servico, de: servicoComArtigo(servico) };
  const cidade = (p.cidade ?? "").trim();
  if (cidade.length >= 3 && cidade.length <= 40 && !/[@\d_]/.test(cidade)) f.cidade = cidade;
  const aniv = aniversarioDe(p.nascimento, hoje);
  if (aniv) f.aniversario = aniv;
  return f;
}
var ROTAS = {
  treinar: "#/treinar",
  revisao: "#/revisao",
  erros: "#/erros",
  assinatura: "#/assinatura",
  cronograma: "#/cronograma",
  indicar: "#/indicar",
  flashcards: "#/flashcards",
  dados: "#/dados",
  conta: "#/conta/assinatura",
  resumos: "#/resumos",
  desempenho: "#/desempenho",
  // "resumo" abre o resumo da campanha (#/resumos/<id>) quando se sabe qual; senão, a Biblioteca.
  resumo: "#/resumos",
  simulado: "#/simulado-nacional"
};
function frasesDoFato(chave, f, mostrar) {
  const A = (slug) => AREAS[slug];
  switch (chave) {
    case "melhorArea": {
      const m = f.melhorArea, a = A(m.slug);
      return mostrar ? [`Seu maior acerto por tema est\xE1 em ${a.em}, com ${m.pct}%.`, `Em ${a.em}, seu hist\xF3rico registra ${m.pct}% de acerto em ${questoes(m.total)}.`, `O tema com maior acerto no seu hist\xF3rico \xE9 ${a.de}, com ${m.pct}%.`] : [`${a.de.charAt(0).toUpperCase() + a.de.slice(1)} aparece entre os temas j\xE1 consolidados no seu hist\xF3rico.`, `Voc\xEA pode usar os resultados de ${a.de} para orientar a revis\xE3o dos pr\xF3ximos temas.`];
    }
    case "maisEstudada": {
      const m = f.maisEstudada, a = A(m.slug);
      return [`O tema com mais quest\xF5es no seu hist\xF3rico \xE9 ${a.de}.`, `Seu hist\xF3rico re\xFAne ${questoes(m.total)} de ${a.de}.`, `O tema que voc\xEA mais estudou por aqui foi ${a.de}.`];
    }
    case "areaFraca": {
      const a = A(f.areaFraca.slug);
      return [`Uma op\xE7\xE3o para a pr\xF3xima revis\xE3o \xE9 incluir quest\xF5es de ${a.de}.`, `Voc\xEA pode selecionar ${a.de} para uma sess\xE3o espec\xEDfica de revis\xE3o.`, `Os coment\xE1rios das quest\xF5es de ${a.de} podem orientar a pr\xF3xima sess\xE3o.`];
    }
    case "horario": {
      const h = { noite: "\xE0 noite", madrugada: "de madrugada", manha: "pela manh\xE3", almoco: "no hor\xE1rio do almo\xE7o", tarde: "\xE0 tarde" }[f.horario];
      return [`Suas sess\xF5es costumam acontecer ${h}.`, `Os registros mostram que voc\xEA costuma estudar ${h}.`];
    }
    case "prova": {
      const p = { teot: "TEOT", taro: "TARO", mao: "cirurgia da m\xE3o", r4: "R4", atualizacao: "atualiza\xE7\xE3o profissional" }[f.prova];
      return [`Seu perfil indica interesse em ${p}.`, `Voc\xEA informou ${p} entre seus objetivos de estudo.`];
    }
    case "etapa": {
      const e = { r1: "R1", r2: "R2", r3: "R3", r4: "R4", mao: "resid\xEAncia de cirurgia da m\xE3o", estudante: "gradua\xE7\xE3o", ortopedista: "ortopedista" }[f.etapa];
      return [`A etapa informada no seu perfil \xE9 ${e}.`, `Seu cadastro est\xE1 identificado com a etapa ${e}.`];
    }
    case "ranking":
      return [`Sua posi\xE7\xE3o atual no ranking geral \xE9 ${f.ranking}\xAA.`, `Voc\xEA est\xE1 na ${f.ranking}\xAA posi\xE7\xE3o do ranking geral.`];
    case "sequencia":
      return [`Sua sequ\xEAncia atual registra ${dias(f.sequencia)} de estudo.`, `O hist\xF3rico mostra ${dias(f.sequencia)} seguidos de estudo.`];
    case "flashcards":
      return [`Seu hist\xF3rico tamb\xE9m registra ${numero(f.flashcards)} flashcards.`, "Os Flashcards tamb\xE9m aparecem entre os recursos que voc\xEA j\xE1 utilizou."];
    case "semana":
      return [`Na \xFAltima semana, o hist\xF3rico registra ${questoes(f.semana)}.`, `Voc\xEA respondeu ${questoes(f.semana)} nos \xFAltimos sete dias.`];
    case "resumos":
      return f.resumos.titulo ? [`O resumo "${f.resumos.titulo}" est\xE1 entre as leituras do seu hist\xF3rico.`] : ["Seu hist\xF3rico inclui leituras na Biblioteca de resumos."];
    case "cronograma":
      return [`Seu cronograma registra ${dias(f.cronograma.dias)} at\xE9 ${f.cronograma.prova || "a prova informada"}.`];
    case "servico":
      return [`Seu cadastro informa o servi\xE7o ${f.servico.nome}.`];
    case "cidade":
      return [`A cidade informada no seu cadastro \xE9 ${f.cidade}.`];
    case "aniversario":
      return ["A data de anivers\xE1rio informada no seu perfil \xE9 hoje."];
  }
}
var ORDEM_FATOS = ["aniversario", "cronograma", "melhorArea", "ranking", "resumos", "servico", "maisEstudada", "horario", "prova", "sequencia", "semana", "etapa", "cidade", "flashcards", "areaFraca"];
var MAXIMO_OBS = 3;
var TEMPO = ["Voc\xEA pode dividir o estudo em sess\xF5es por tema.", "O hist\xF3rico permite continuar a sess\xE3o de onde voc\xEA parou.", "Uma sess\xE3o curta pode ser dedicada a um tema e aos coment\xE1rios das alternativas."];
var DICAS = {
  baixo: ["Voc\xEA pode ler o coment\xE1rio de cada alternativa depois de responder.", "Os filtros permitem selecionar um tema para a pr\xF3xima sess\xE3o."],
  medio: ["A Revis\xE3o re\xFAne quest\xF5es do seu hist\xF3rico para retomar os temas.", "O Caderno de erros permite refazer quest\xF5es e consultar os coment\xE1rios."],
  alto: ["Voc\xEA pode combinar provas e temas nos filtros da sess\xE3o.", "Os coment\xE1rios das alternativas podem complementar a revis\xE3o de um tema."]
};
var FECHOS = ["Se precisar de ajuda com o site, basta responder este e-mail.", "Pode responder por aqui se encontrar alguma dificuldade.", "Se tiver alguma d\xFAvida, pode me chamar por aqui."];
var simples = (t) => t.toLowerCase().replace(/ç/g, "c");
var PALAVRAS_FORTES = [/\bfeliz\b/, /\borgulho\b/, /\bbonit[ao]\b/, /\badmir/, /\btorc/, /\bcarinho\b/, /\bparab[ée]ns\b/, /\bconstancia\b/];
function fortesDe(texto) {
  const t = simples(texto);
  const achadas = /* @__PURE__ */ new Set();
  PALAVRAS_FORTES.forEach((re, i) => {
    if (re.test(t)) achadas.add(i);
  });
  return achadas;
}
function frasesDe(texto) {
  return texto.replace(/^P\.S\.:\s*/gm, "").split(/(?<=[.!?])\s+|\n+/).map((f) => f.trim()).filter((f) => f.length > 0);
}
function frasesSeguidasRepetem(texto) {
  const frases = frasesDe(texto);
  for (let i = 1; i < frases.length; i++) {
    const comuns = [...fortesDe(frases[i])].filter((k) => fortesDe(frases[i - 1]).has(k));
    if (comuns.length) return PALAVRAS_FORTES[comuns[0]].source.replace(/\\b|\[ao\]/g, "");
  }
  return null;
}
function tomDaFaixa(f) {
  if (!f) return "baixo";
  return ["0-10", "10-20", "20-30", "30-40"].includes(f) ? "baixo" : f === "40-60" || f === "60-70" ? "medio" : "alto";
}
var NOME_PROVA = { teot: "o TEOT", taro: "o TARO", mao: "a prova da m\xE3o", r4: "a sele\xE7\xE3o do R4", atualizacao: "a prova" };
function criarCtx(p, tipo, faixa, marco2, rnd, op, estado) {
  const hoje = op.hoje ?? /* @__PURE__ */ new Date();
  const site2 = (op.site ?? SITE_PADRAO).replace(/\/*$/, "/");
  const pct = acertoCitavel(p);
  const pctBomValor = pct !== null && pct >= 50 ? pct : null;
  const fatos = fatosDe(p, hoje);
  const usados = /* @__PURE__ */ new Set();
  const r = Math.max(0, Math.floor(Number(p.respondidas) || 0));
  const um = (...opcoes) => {
    const validas = opcoes.filter((o) => o !== null && o !== void 0 && o !== false && o !== "");
    return validas[Math.floor(rnd() * validas.length)];
  };
  const mostrarAcerto = () => pctBomValor !== null && !usados.has("areaFraca");
  const nObs = () => [...usados].filter((u) => u !== "acerto").length;
  const fato = (chave) => {
    if (fatos[chave] === void 0 || usados.has(chave) || nObs() >= MAXIMO_OBS) return null;
    if ((chave === "maisEstudada" && usados.has("melhorArea") || chave === "melhorArea" && usados.has("maisEstudada")) && fatos.melhorArea?.slug === fatos.maisEstudada?.slug) return null;
    if (chave === "areaFraca" && usados.has("acerto")) return null;
    const comNumero = mostrarAcerto();
    const frases = frasesDoFato(chave, fatos, comNumero);
    if (!frases.length) return null;
    usados.add(chave);
    if (chave === "melhorArea" && comNumero) usados.add("acerto");
    return frases[Math.floor(rnd() * frases.length)];
  };
  const teot = fatos.prova === "teot" || !fatos.prova && (fatos.etapa === "r3" || fatos.etapa === "r4");
  const diasProva = fatos.cronograma?.dias ?? (teot ? diasAteTeot(hoje) : null);
  const nomeProva = p.provaData || p.provaCronograma ? provaComArtigo(p.provaCronograma) : fatos.prova ? NOME_PROVA[fatos.prova] : teot ? "o TEOT" : "a sua prova";
  const ctx = {
    p,
    tipo,
    faixa,
    nome: primeiroNome(p.nome),
    r,
    dez: r >= MINIMO_PARA_NUMERO,
    q: questoes(r),
    pct,
    get pctBom() {
      if (!mostrarAcerto()) return null;
      usados.add("acerto");
      return pctBomValor;
    },
    fatos,
    hoje,
    diasTeot: diasAteTeot(hoje),
    diasProva,
    nomeProva,
    daProva: nomeProva.replace(/^o /, "do ").replace(/^a /, "da "),
    marco: marco2,
    pix: op.pix,
    relatorio: op.relatorio,
    pagamento: op.pagamento,
    encerramento: op.encerramento,
    campanha: op.campanha ?? {},
    usados,
    um,
    chance: (x) => rnd() < x,
    link: (rota) => {
      estado.link = rota;
      const id = op.campanha?.resumo?.id;
      const caminho = rota === "resumo" && typeof id === "string" && /^[a-z0-9-]{3,80}$/.test(id) ? `#/resumos/${id}` : ROTAS[rota];
      return (site2 + caminho).replace(/^https?:\/\//, "");
    },
    fato,
    obs: (k = 1, preferir = []) => {
      const limite = Math.min(MAXIMO_OBS, Math.max(1, k));
      const ordem = [...preferir, ...ORDEM_FATOS.filter((c) => !preferir.includes(c))].filter((c) => fatos[c] !== void 0 && !usados.has(c));
      const escolhidos = [];
      for (const c of ordem) {
        if (escolhidos.length >= limite) break;
        if (rnd() < 0.8 || ordem.length - ordem.indexOf(c) <= limite - escolhidos.length) escolhidos.push(c);
      }
      const frases = escolhidos.map((c) => fato(c)).filter((x) => !!x);
      return frases.length ? frases.join(" ") : null;
    },
    tempo: () => um(...TEMPO),
    dica: () => um(...DICAS[tomDaFaixa(faixa)]),
    // "Torço pela sua aprovação" só para quem tem prova pela frente.
    fecho: () => rnd() < 0.15 ? null : um(...FECHOS.filter((f) => !(f.includes("aprova\xE7\xE3o") && (fatos.prova === "atualizacao" || fatos.etapa === "ortopedista")))),
    ps: () => "",
    beneficios: (k, curto = false) => {
      const lista = [
        ["o cronograma at\xE9 a prova: voc\xEA diz a data e a lista de cada dia j\xE1 est\xE1 pronta quando voc\xEA senta, com o que mais cai primeiro; se a semana apertar, ele se ajusta sozinho", "o cronograma at\xE9 a prova", fatos.prova || fatos.etapa || fatos.cronograma ? 10 : 6],
        ["o Simulado Nacional todo m\xEAs, com a sua posi\xE7\xE3o", "o Simulado Nacional do m\xEAs", fatos.ranking ? 9 : 5],
        ["os temas que mais caem em cada \xE1rea e como a turma respondeu cada alternativa", "os temas que mais caem", fatos.areaFraca ? 9 : 4],
        ["o Resum\xE3o, com o que cai em uma frase por assunto", "o Resum\xE3o da reta final", (diasProva ?? 999) <= 90 ? 7 : 3],
        ["a Biblioteca de resumos inteira, cada resumo sa\xEDdo de um cap\xEDtulo de livro e com as quest\xF5es reais no meio do texto", "a Biblioteca de resumos", fatos.resumos ? 9 : 4],
        ["a liga da resid\xEAncia e o relat\xF3rio do m\xEAs", "a liga da resid\xEAncia", fatos.etapa && fatos.etapa.startsWith("r") ? 4 : 2]
      ];
      if (p.limiteGratisLigado) {
        const t = fatos.flashcards ? "quest\xF5es e flashcards sem limite di\xE1rio" : "quest\xF5es sem limite di\xE1rio";
        lista.push([t, t, fatos.flashcards || (fatos.semana ?? 0) >= 100 ? 11 : 6]);
      }
      return lista.map(([longo, breve, peso]) => [curto ? breve : longo, peso + rnd() * 2]).sort((a, b) => b[1] - a[1]).slice(0, k).map(([t]) => t);
    },
    quando: (d) => d <= 0 ? "hoje" : d === 1 ? "ontem" : d < 60 ? `h\xE1 ${dias(d)}` : "h\xE1 alguns meses",
    area: (slug) => AREAS[slug],
    areaRecente: () => {
      const a = [...p.areas ?? []].filter((x) => AREAS[x.slug] && x.total >= MINIMO_PARA_NUMERO).sort((x, y) => y.total - x.total)[0];
      return a ? AREAS[a.slug] : null;
    }
  };
  return ctx;
}
var SAUDACOES_NOME = ["{n}, tudo bem?", "Oi, {n}, tudo bem?", "Ol\xE1, {n}, tudo bem?", "{n}, tudo bem por a\xED?", "Oi, {n}, espero que esteja tudo bem por a\xED."];
var SAUDACOES = ["Oi, tudo bem?", "Ol\xE1, tudo bem?", "Tudo bem por a\xED?", "Oi, espero que esteja tudo bem por a\xED."];
function modeloDe(tipo, faixa) {
  return tipo === "ativo" && faixa ? `ativo:${faixa}` : tipo;
}
function contarLinhas(corpo) {
  return corpo.split("\n").filter((l) => l.trim() !== "").length;
}
function contarPS(corpo) {
  return (corpo.match(/(^|\n)\s*P\.S\.:/g) ?? []).length;
}
function problemaNoTexto(texto) {
  if (/\bundefined\b|\bnull\b|\bNaN\b|\[object/i.test(texto)) return "valor vazio no texto";
  if (/(^|[^\d.,])0 (questões|questão|dias|dia)\b/.test(texto)) return "n\xFAmero zerado";
  if (/(^|[^\d.,])[0-9] (questões|questão)\b/.test(texto)) return "n\xFAmero de quest\xF5es abaixo de 10";
  if (/\{[a-z]+\}/i.test(texto)) return "marcador sem preencher";
  if (/R\$\s?\d/.test(texto)) return "pre\xE7o no texto";
  if (/ ,|,,|(?<!\.)\.\.(?!\.)| \.(?!\w)/.test(texto)) return "pontua\xE7\xE3o quebrada";
  return null;
}
function problemaNoAssunto(assunto) {
  const minusculo = assunto.toLocaleLowerCase("pt-BR");
  if (!assunto.trim()) return "assunto vazio";
  if (assunto.length > MAXIMO_ASSUNTO) return "assunto longo";
  if (PALAVRAS_PROMOCAO.some((p) => minusculo.includes(p))) return "palavra de promo\xE7\xE3o";
  if (/[!]{1}|[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}/.test(assunto.replace(/TEOT|TARO|ENARE/g, ""))) return "grito no assunto";
  if (/\p{Extended_Pictographic}/u.test(assunto)) return "emoji no assunto";
  return problemaNoTexto(assunto);
}
function tipoCombina(tipo, p) {
  const r = Math.max(0, Math.floor(Number(p.respondidas) || 0));
  switch (tipo) {
    case "nunca_comecou":
      return r === 0;
    case "ativo":
      return acertoCitavel(p) !== null;
    case "marco":
      return r >= 100;
    case "primeiras_10":
      return r >= MINIMO_PARA_NUMERO;
    case "boas_vindas":
    case "comecando":
    case "comecou_parou":
    case "pausa":
    case "sumiu":
    case "convite_20":
    case "convite_50":
    case "voltou":
    case "assinante_parado_7":
      return r > 0;
    case "acesso_terminou":
      return !p.assinante && r > 0;
    case "como_estao":
      return r > 0;
    default:
      return true;
  }
}
function gerarCarta(p, op = {}) {
  const hoje = op.hoje ?? /* @__PURE__ */ new Date();
  const anteriores = op.anteriores ?? [];
  const auto = escolherTipo(p, anteriores, hoje);
  const tipo = op.tipo ?? auto.tipo;
  const minimoLinhas = 3;
  if (!tipoCombina(tipo, p)) throw new Error(`tipo_nao_combina_${tipo}`);
  if (!op.ignorarCadencia) {
    const bloqueio = cadenciaBloqueia(anteriores, hoje, tipo);
    if (bloqueio) throw new Error(`cadencia_bloqueada: ${bloqueio}`);
  }
  const acerto = acertoCitavel(p);
  let faixa = op.faixa ?? (tipo === auto.tipo ? auto.faixa : null) ?? (acerto !== null ? faixaDe(acerto) : null);
  if (tipo === "ativo" && !faixa) faixa = "40-60";
  const marco2 = tipo === "marco" ? op.marco ?? auto.marco ?? marcoRecente(p.respondidas) ?? ([...MARCOS_CARTA].reverse().find((m) => p.respondidas >= m) ?? 100) : null;
  const modelo = modeloDe(tipo, faixa);
  const todas = VERSOES[modelo];
  if (!todas?.length) throw new Error(`sem_versoes_para_${modelo}`);
  const jaRecebidas = new Set(anteriores.filter(saiu).map((e) => e.versao).filter(Boolean));
  const semente = (op.semente ?? Math.floor(Math.random() * 2 ** 31)) >>> 0;
  for (let tentativa = 0; tentativa < 80; tentativa++) {
    const rnd = mulberry32(semente + tentativa * 7919);
    const estado = { link: null };
    const ctx = criarCtx(p, tipo, faixa, marco2, rnd, op, estado);
    const possiveis = todas.filter((v2) => !v2.requer || v2.requer(ctx));
    if (!possiveis.length) continue;
    const novas = possiveis.filter((v2) => !jaRecebidas.has(`${modelo}#${v2.id}`));
    const lista = novas.length ? novas : possiveis;
    const v = lista[Math.floor(rnd() * lista.length)];
    const brutos = v.corpo(ctx).filter((x) => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
    const saudacao = v.saudacao ? v.saudacao(ctx) : ctx.nome ? ctx.um(...SAUDACOES_NOME).replace("{n}", ctx.nome) : ctx.um(...SAUDACOES);
    const semPS = brutos.filter((x) => !/^P\.S\.:/.test(x));
    const assuntos = v.assuntos(ctx).filter((x) => typeof x === "string" && x.trim() !== "").map((x) => x.trim()).filter((a) => !problemaNoAssunto(a));
    const assunto = assuntos[Math.floor(rnd() * assuntos.length)];
    const corpo = [saudacao, ...semPS].join("\n\n");
    const linhas = contarLinhas(corpo);
    if (!assunto || problemaNoTexto(corpo) || contarLinks(corpo) > 1 || contarPS(corpo) !== 0 || linhas < minimoLinhas || linhas > LINHAS.maximo) continue;
    if (frasesSeguidasRepetem(corpo)) continue;
    return {
      tipo,
      faixa: tipo === "ativo" || tipo === "convite_50" ? faixa : null,
      modelo,
      versao: `${modelo}#${v.id}`,
      assunto,
      corpo,
      personalizacao: [...ctx.usados].map((c) => ROTULO_FATO[c] ?? (c === "acerto" ? "acerto" : c)),
      versoes: { total: todas.length, novas: todas.filter((x) => !jaRecebidas.has(`${modelo}#${x.id}`)).length }
    };
  }
  throw new Error(`nao_foi_possivel_escrever_${modelo}`);
}
var ROTULO_FATO = {
  melhorArea: "melhor \xE1rea",
  maisEstudada: "\xE1rea mais estudada",
  areaFraca: "\xE1rea a melhorar",
  horario: "hor\xE1rio de estudo",
  prova: "prova de interesse",
  etapa: "etapa",
  ranking: "posi\xE7\xE3o no ranking",
  sequencia: "sequ\xEAncia de dias",
  flashcards: "flashcards",
  semana: "ritmo da semana",
  resumos: "resumos lidos",
  cronograma: "dias para a prova",
  servico: "servi\xE7o",
  cidade: "cidade",
  aniversario: "anivers\xE1rio"
};
var esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var RE_LINK = /\b(?:https?:\/\/)?(?:www\.)?ortoquestoes\.com\.br\/?[^\s<>"')]*[^\s<>"').,;:!?]|\bhttps?:\/\/[^\s<>"')]+[^\s<>"').,;:!?]/g;
function contarLinks(texto) {
  return (texto.match(RE_LINK) ?? []).length;
}
function semAssinatura(corpo) {
  return corpo.replace(/\s*(?:um abraço|abraço|abraços)[,.!]?\s*\n+\s*tales[^\n]*\s*$/i, "").replace(/\s+$/, "");
}
function renderizarCarta(c) {
  const corpo = semAssinatura(c.corpo.replace(/\r\n/g, "\n").trim());
  const todos = corpo.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
  const paragrafos = todos.filter((x) => !/^P\.S\.:/.test(x));
  const ps = todos.filter((x) => /^P\.S\.:/.test(x));
  const assinatura = ASSINATURA.split("\n");
  const avisoSair = c.textoDescadastro ?? "Se preferir n\xE3o receber mais estas mensagens";
  const rodape = c.descadastro ? `${avisoSair}: ${c.descadastro}` : "";
  const comLink = (t) => esc(t).replace(RE_LINK, (url) => {
    const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
    return `<a href="${href}" style="color:#1a5fb4;">${url}</a>`;
  });
  const p = (html2, estilo = "") => `<p style="margin:0 0 14px 0;${estilo}">${html2}</p>`;
  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(c.assunto)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;padding:16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222222;">
${paragrafos.map((t) => p(comLink(t).replace(/\n/g, "<br>"))).join("\n")}
${p(assinatura.map(esc).join("<br>"))}
${ps.map((t) => p(comLink(t).replace(/\n/g, "<br>"))).join("\n")}
${c.descadastro ? p(`${esc(avisoSair)}, <a href="${esc(c.descadastro)}" style="color:#888888;">\xE9 s\xF3 clicar aqui</a>.`, "margin-top:28px;font-size:12px;line-height:1.4;color:#888888;") : ""}
</div>
</body>
</html>`;
  const texto = [...paragrafos, assinatura.join("\n"), ...ps, ...rodape ? ["--", rodape] : []].join("\n\n");
  return { assunto: c.assunto.trim(), html, texto };
}
function problemaGrave(texto) {
  if (/\bundefined\b|\bNaN\b|\[object/i.test(texto)) return "valor vazio no texto";
  if (/\{[a-z]+\}/i.test(texto)) return "marcador sem preencher";
  return null;
}
function perfilDosDados(d, limiteGratisLigado = false) {
  const num = (v) => v === null || v === void 0 || !Number.isFinite(Number(v)) ? null : Number(v);
  const texto = (v) => typeof v === "string" && v.trim() ? v.trim() : null;
  const resumos = num(d.resumos_lidos);
  return {
    nome: d.nome ?? null,
    respondidas: num(d.respondidas) ?? 0,
    acertos: num(d.acertos),
    erros: num(d.erros),
    semana: num(d.semana),
    diasParado: num(d.dias_parado),
    diasConta: num(d.dias_conta),
    assinante: !!d.assinante,
    situacao: d.situacao ?? null,
    ano: d.ano ?? null,
    provas: Array.isArray(d.provas) ? d.provas.map(String) : [],
    areas: Array.isArray(d.areas) ? d.areas.map((a) => ({ slug: String(a.slug), total: Number(a.total) || 0, certas: Number(a.certas) || 0 })) : [],
    horas: Array.isArray(d.horas) ? d.horas.map((h) => ({ hora: Number(h.hora), n: Number(h.n) || 0 })) : [],
    posicaoRanking: num(d.posicao_ranking),
    sequencia: num(d.sequencia),
    flashcards: num(d.flashcards),
    viuPlanos: num(d.viu_planos),
    limiteGratisLigado,
    servico: texto(d.servico),
    cidade: texto(d.cidade),
    nascimento: texto(d.nascimento),
    resumosLidos: resumos !== null && resumos > 0 ? { total: resumos, titulos: Array.isArray(d.resumos_titulos) ? d.resumos_titulos.map(String) : [] } : null,
    diasParaProva: num(d.dias_para_prova),
    provaData: texto(d.data_prova),
    provaCronograma: texto(d.prova_cronograma),
    fimAcesso: texto(d.fim_acesso),
    renovaSozinho: !!d.renova_sozinho
  };
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
function marcoComCarta(total) {
  let atual = null;
  for (const m of MARCOS) if (total >= m.minimo && MARCOS_CARTA.includes(m.minimo)) atual = m;
  return atual;
}
function pronto(carta, descadastro, aviso) {
  const e = renderizarCarta({ assunto: carta.assunto, corpo: carta.corpo, descadastro, textoDescadastro: aviso });
  return { ...e, modelo: carta.modelo, versao: carta.versao, corpo: carta.corpo, personalizacao: carta.personalizacao };
}
function perfilDe(d, extra) {
  return {
    nome: d.nome,
    respondidas: Number(d.respondidas) || 0,
    acertos: d.acertos ?? null,
    erros: d.erros ?? null,
    semana: d.respondidas7d ?? null,
    ...extra ?? {},
    ...extra?.nome ? {} : { nome: d.nome }
  };
}
function emailMarco(d) {
  const carta = gerarCarta(perfilDe(d, d.perfil), {
    tipo: "marco",
    marco: d.marco.minimo,
    anteriores: d.anteriores,
    site: d.site,
    hoje: d.hoje,
    semente: d.semente ?? sementeDe(`marco:${d.marco.minimo}:${d.nome ?? ""}:${d.respondidas}`)
  });
  return pronto(carta, d.linkDescadastro, "Se preferir n\xE3o receber mais os e-mails de conquistas");
}
function emailCarta(d) {
  const nome = primeiroNome(d.nome);
  const recado = d.recado?.trim();
  const padrao = d.respondidas >= 10 ? `Seu hist\xF3rico registra ${questoes(d.respondidas)}. Voc\xEA pode consultar as quest\xF5es anteriores e os coment\xE1rios para organizar a pr\xF3xima revis\xE3o.` : "Sua conta est\xE1 pronta. Voc\xEA pode escolher um tema para come\xE7ar pelas quest\xF5es comentadas.";
  const corpo = [nome ? `${nome}, tudo bem?` : "Oi, tudo bem?", recado || padrao, "Se precisar de ajuda com o site, pode responder este e-mail."].join("\n\n");
  const e = renderizarCarta({ assunto: nome ? `${nome}, um recado sobre o seu estudo` : "Um recado sobre o seu estudo", corpo });
  return { ...e, modelo: null, versao: null };
}
var esc2 = (texto) => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function emailAlerta(titulo, linhas, link) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc2(titulo)}</title></head>
<body style="margin:0;padding:24px 12px;background:#eef2f1;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:14px;">
<tr><td style="padding:22px 28px 6px 28px;font-size:12px;letter-spacing:2px;color:#146b61;text-transform:uppercase;font-weight:bold;">Painel do administrador</td></tr>
<tr><td style="padding:0 28px 10px 28px;font-size:20px;line-height:26px;font-weight:bold;color:#1b2624;">${esc2(titulo)}</td></tr>
<tr><td style="padding:0 28px 8px 28px;font-size:15px;line-height:23px;color:#33413d;">${linhas.map((l) => esc2(l)).join("<br>")}</td></tr>
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
function nomeQuinzena(ref) {
  const m = ref.match(/^(\d{4})-(\d{2})-q([12])$/);
  if (!m) return null;
  const ultimo = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
  return `${m[3] === "1" ? "1 a 15" : `16 a ${ultimo}`} de ${MESES[Number(m[2]) - 1]}`;
}
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
function emailLembrete(d) {
  const tipo = { nunca: "nunca_comecou", tres_dias: "pausa", sete_dias: "sumiu", renovacao_pix: "pix_3_dias", renovacao_pix_hoje: "pix_hoje" }[d.campanha];
  const perfil = perfilDe({
    nome: d.nome,
    respondidas: d.respondidas,
    acertos: d.acertos,
    respondidas7d: d.respondidas7d,
    erros: d.acertos !== void 0 && d.respondidas > 0 ? Math.max(0, d.respondidas - d.acertos) : void 0
  }, d.perfil);
  if (d.campanha === "tres_dias" || d.campanha === "sete_dias") perfil.diasParado = Math.max(1, d.diasFora);
  const carta = gerarCarta(perfil, {
    // Se a pessoa mudou de situação desde que a lista foi montada, vale a carta da situação nova.
    tipo: tipoCombina(tipo, perfil) ? tipo : escolherTipo(perfil, d.anteriores, d.hoje).tipo,
    anteriores: d.anteriores,
    site: d.site,
    hoje: d.hoje,
    semente: d.semente ?? sementeDe(`${d.campanha}:${d.referencia ?? ""}:${d.nome ?? ""}`),
    pix: { diasRestantes: d.diasRestantes ?? 3, fimEm: d.fimEm ?? null, plano: d.plano ?? null }
  });
  return pronto(carta, d.linkDescadastro, "Se preferir n\xE3o receber mais lembretes de estudo");
}
function emailRelatorio(d) {
  const a = analisarMes(d);
  const quinzena = nomeQuinzena(d.mes);
  const mes = nomeMes(d.mes).split(" ")[0];
  const relatorio2 = {
    rotulo: quinzena ? `de ${quinzena}` : `de ${mes}`,
    em: quinzena ? `de ${quinzena}` : `em ${mes}`,
    frase: quinzena ? `Entre ${quinzena.replace(" a ", " e ")}` : `Em ${mes}`,
    quinzena: !!quinzena,
    respostas: Number(d.respostas) || 0,
    certas: Number(d.certas) || 0,
    erradas: Number(d.erradas) || 0,
    diasAtivos: Number(d.dias_ativos) || 0,
    respostasAnterior: Number(d.respostas_anterior) || 0,
    acertoAnterior: a.acertoAnterior,
    totalAcumulado: Number(d.total_acumulado) || 0,
    subiram: a.subiram.map((t) => ({ slug: t.slug, antes: t.antes, agora: t.agora })),
    cairam: a.cairam.map((t) => ({ slug: t.slug, antes: t.antes, agora: t.agora })),
    maisFraco: a.maisFraco ? { slug: a.maisFraco.slug, acerto: a.maisFraco.acerto } : null,
    simulado: d.simulado
  };
  const carta = gerarCarta(perfilDe({ nome: d.nome, respondidas: Number(d.total_acumulado) || 0 }, d.perfil), {
    tipo: "relatorio",
    relatorio: relatorio2,
    anteriores: d.anteriores,
    site: d.site,
    hoje: d.hoje,
    semente: d.semente ?? sementeDe(`relatorio:${d.mes}:${d.nome ?? ""}`)
  });
  return pronto(carta, d.linkDescadastro, "Se preferir n\xE3o receber mais os resumos de estudo");
}
var TIPOS_AUTOMATICOS = [...TIPOS_AUTOMATICOS_NOVOS, ...TIPOS_CAMPANHAS_DIARIAS];
var CAMPANHAS_DIARIAS = TIPOS_CAMPANHAS_DIARIAS;
var ehCampanhaDiaria = (t) => CAMPANHAS_DIARIAS.includes(t ?? "");
var tipoAutomaticoValido = (t) => TIPOS_AUTOMATICOS.includes(t ?? "") ? t : null;
var ehTransacional = (t) => TIPOS_TRANSACIONAIS.includes(t);
function emailAutomatico(d) {
  const perfil = perfilDe({ nome: d.nome, respondidas: d.respondidas }, d.perfil);
  if (d.tipo === "voltou") perfil.diasParado = Math.max(10, Math.round(Number(d.diasFora) || 10));
  if (d.tipo === "assinante_parado_7") perfil.diasParado = Math.max(7, Math.round(Number(d.diasFora ?? perfil.diasParado) || 7));
  if ((d.tipo === "vespera_prova" || d.tipo === "depois_prova") && d.provaCronograma) perfil.provaCronograma = d.provaCronograma;
  if (d.tipo === "vespera_prova") perfil.diasParaProva = 1;
  if (d.tipo === "cronograma_pronto") {
    if (d.diasParaProva) perfil.diasParaProva = d.diasParaProva;
    if (d.provaCronograma) perfil.provaCronograma = d.provaCronograma;
  }
  const carta = gerarCarta(perfil, {
    tipo: d.tipo,
    anteriores: d.anteriores,
    site: d.site,
    hoje: d.hoje,
    semente: d.semente ?? sementeDe(`${d.tipo}:${d.referencia ?? ""}:${d.nome ?? ""}:${d.respondidas}`),
    pagamento: d.pagamento,
    encerramento: d.encerramento,
    campanha: d.campanha ?? void 0,
    // Transacionais nunca são barrados; os demais respeitam a cadência (gerarCarta recusa).
    ignorarCadencia: ehTransacional(d.tipo)
  });
  const descadastro = ehTransacional(d.tipo) ? null : d.linkDescadastro ?? null;
  return pronto(carta, descadastro, "Se preferir n\xE3o receber mais estas cartas");
}
function automaticoBloqueado(tipo, anteriores, hoje = /* @__PURE__ */ new Date()) {
  return cadenciaBloqueia(anteriores, hoje, tipo);
}
function rotuloQuestao(id) {
  const [, prefixo, numero2] = id.match(/^(.*)-(\d+)$/) ?? [];
  return prefixo && TEMAS[prefixo] ? `${TEMAS[prefixo]}, quest\xE3o ${Number(numero2)}` : id;
}
function alternativaCitada(...textos) {
  for (const t of textos) {
    const m = (t ?? "").match(/\b(?:letra|alternativa|op[çc][aã]o|gabarito)\s+(?:é\s+|era\s+|a\s+|para\s+(?:a\s+)?)?["“']?([A-Ea-e])\b["”']?/);
    if (m) return m[1].toUpperCase();
  }
  return null;
}
function emailRelatoResolvido(d) {
  const nome = primeiroNome(d.nome);
  const rotulo = rotuloQuestao(d.idQuestao);
  const link = `${d.site}#/questao/${encodeURIComponent(d.idQuestao)}`;
  const relato = d.relato.trim().replace(/\s+/g, " ");
  const trecho = relato.length > 240 ? relato.slice(0, 240).replace(/\s\S*$/, "") + "\u2026" : relato;
  const nota = d.nota?.trim() || null;
  const alternativa = (d.alternativa ?? "").trim().toUpperCase().match(/^[A-E]$/) ? d.alternativa.trim().toUpperCase() : alternativaCitada(nota, relato);
  const corpo = [
    nome ? `${nome}, tudo bem?` : "Oi, tudo bem?",
    `Obrigado pelo aviso sobre ${rotulo}: "${trecho}"`,
    alternativa ? `A revis\xE3o foi conclu\xEDda, incluindo a alternativa ${alternativa}. A quest\xE3o j\xE1 est\xE1 corrigida no site${nota ? `, e o que mudou foi isto: ${nota}` : ", e o coment\xE1rio foi ajustado para explicar o ponto"}.` : `A revis\xE3o foi conclu\xEDda e a quest\xE3o foi atualizada no site.${nota ? ` O que mudou: ${nota}` : " O coment\xE1rio foi ajustado para deixar o ponto claro."}`,
    "Obrigado por contribuir com a revis\xE3o do acervo.",
    `Se quiser ver como ficou: ${link.replace(/^https?:\/\//, "")}`,
    "Se houver alguma d\xFAvida sobre a altera\xE7\xE3o, pode responder este e-mail."
  ].join("\n\n");
  const assunto = nome ? `${nome}, obrigado pelo aviso sobre a quest\xE3o` : `Obrigado pelo aviso sobre ${rotulo}`;
  return renderizarCarta({ assunto: assunto.length <= 55 ? assunto : "Obrigado pelo aviso sobre a quest\xE3o", corpo });
}

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

// supabase/functions/_shared/preferencias.ts
var PREFERENCIAS_PADRAO = { conquistas: true, relatorio_mensal: true, lembretes: true, cartas: true };
var COLUNA = {
  conquistas: "conquistas",
  relatorio: "relatorio_mensal",
  lembretes: "lembretes",
  cartas: "cartas"
};
function preferenciasDaLinha(linha) {
  if (!linha) return { ...PREFERENCIAS_PADRAO };
  return {
    conquistas: linha.conquistas !== false,
    relatorio_mensal: linha.relatorio_mensal !== false,
    lembretes: linha.lembretes !== false,
    cartas: linha.cartas !== false
  };
}
var desligouTudo = (p) => !p.conquistas && !p.relatorio_mensal && !p.lembretes && !p.cartas;
function permiteEnvio(p, categoria) {
  if (!p) return false;
  if (desligouTudo(p)) return false;
  return p[COLUNA[categoria]];
}

// supabase/functions/enviar-email/index.ts
var folga = (m) => Math.max(60, Math.round(m.minimo * 0.05));
async function dadosUsuario(id) {
  const r = await banco("rpc/dados_email_usuario", { method: "POST", body: JSON.stringify({ p_id: id }) });
  if (!r.ok) throw new Error("consulta_usuario_falhou");
  const [linha] = await r.json();
  return linha ?? null;
}
async function podeReceber(id, categoria) {
  try {
    const r = await banco(`preferencias_email?id_usuario=eq.${id}&select=conquistas,relatorio_mensal,lembretes,cartas&limit=1`);
    if (!r.ok) return false;
    const [linha] = await r.json();
    return permiteEnvio(preferenciasDaLinha(linha), categoria);
  } catch {
    return false;
  }
}
async function bloqueioCentral(id, tipo, categoria, referencia = null) {
  const r = await banco("rpc/hub_bloqueio", { method: "POST", body: JSON.stringify({ p_id: id, p_tipo: tipo, p_categoria: categoria, p_referencia: referencia }) });
  if (!r.ok) throw new Error("sql_hub_pendente");
  return await r.json();
}
async function ehAdministrador(id) {
  const r = await banco(`administradores?id_usuario=eq.${encodeURIComponent(id)}&select=id_usuario`);
  return r.ok && (await r.json()).length > 0;
}
async function montar(id, marco2, recado, carta = false) {
  const dados = await dadosUsuario(id);
  if (!dados?.email) return null;
  const m = marco2 ?? marcoAtingido(Number(dados.respondidas)) ?? MARCOS[0];
  const [perfil, anteriores] = carta ? [null, []] : await Promise.all([perfilCompleto(id).catch(() => null), anterioresDe(id).catch(() => [])]);
  const email = (carta ? emailCarta : emailMarco)({
    nome: dados.nome,
    marco: m,
    respondidas: Number(dados.respondidas),
    acertos: Number(dados.acertos),
    erros: Number(dados.erros),
    respondidas7d: Number(dados.respondidas_7d),
    recado,
    site: site(),
    linkDescadastro: await linkDescadastro(id),
    perfil,
    anteriores
  });
  return { dados, marco: m, email };
}
async function anterioresDe(id) {
  const base = `emails_enviados?id_usuario=eq.${id}&order=enviado_em.desc&limit=40`;
  let r = await banco(`${base}&select=tipo,modelo,versao,marco,status,em:enviado_em`);
  if (!r.ok) r = await banco(`${base}&select=tipo,marco,status,em:enviado_em`);
  return r.ok ? await r.json() : [];
}
async function perfilCompleto(id) {
  const r = await banco("rpc/dados_carta_usuario", { method: "POST", body: JSON.stringify({ p_id: id }) });
  if (!r.ok) return null;
  const dados = await r.json();
  return dados ? perfilDosDados(dados) : null;
}
async function atualizarEnvio(id, campos, extras) {
  const limpos = Object.fromEntries(Object.entries(extras).filter(([, v]) => v !== null && v !== void 0));
  if (Object.keys(limpos).length) {
    const r = await banco(`emails_enviados?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ ...campos, ...limpos }) });
    if (r.ok) return r;
  }
  return banco(`emails_enviados?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(campos) });
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
  const email = emailRelatorio({ ...dados, site: site(), linkDescadastro: await linkDescadastro(id, "relatorio"), anteriores: await anterioresDe(id).catch(() => []) });
  return { ...email, para: dados.email };
}
function quinzenaAnterior(agora = /* @__PURE__ */ new Date()) {
  const sp = new Date(agora.getTime() - 3 * 36e5);
  if (sp.getUTCDate() >= 16) return `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, "0")}-q1`;
  return `${mesAnterior(agora)}-q2`;
}
var quinzenaValida = (q) => q && /^\d{4}-(0[1-9]|1[0-2])-q[12]$/.test(q) ? q : quinzenaAnterior();
function limitesQuinzena(ref) {
  const [ano, mes] = ref.split("-").map(Number);
  const dois = (n) => String(n).padStart(2, "0");
  if (ref.endsWith("q1")) return [`${ano}-${dois(mes)}-01`, `${ano}-${dois(mes)}-16`];
  const seguinte = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${dois(mes + 1)}-01`;
  return [`${ano}-${dois(mes)}-16`, seguinte];
}
async function montarQuinzenal(id, ref) {
  const [inicio, fim] = limitesQuinzena(ref);
  const r = await banco("rpc/dados_relatorio_periodo", { method: "POST", body: JSON.stringify({ p_id: id, p_inicio: inicio, p_fim: fim, p_ref: ref }) });
  if (!r.ok) throw new Error("consulta_relatorio_falhou");
  const dados = await r.json();
  if (!dados?.email) return null;
  const email = emailRelatorio({ ...dados, site: site(), linkDescadastro: await linkDescadastro(id, "relatorio"), anteriores: await anterioresDe(id).catch(() => []) });
  return { ...email, para: dados.email };
}
var esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
async function enviarRelatorios(mesPedido, limitePedido, quinzenal = false) {
  const mes = quinzenal ? quinzenaValida(mesPedido) : mesValido(mesPedido);
  const limite = Math.max(1, Math.min(Number(limitePedido) || 40, 80));
  const r = quinzenal ? await banco("rpc/destinatarios_relatorio_quinzenal", { method: "POST", body: JSON.stringify({ p_ref: mes, p_limite: JANELA_RELATORIO }) }) : await banco("rpc/destinatarios_relatorio_mensal", { method: "POST", body: JSON.stringify({ p_mes: mes, p_limite: JANELA_RELATORIO }) });
  if (!r.ok) throw new Error("consulta_destinatarios_falhou");
  const destinatarios = (await r.json()).map((d) => d.id_usuario);
  let enviados = 0, falhas = 0, adiados = 0, recusados = 0, vistos = 0;
  const inicio = Date.now();
  for (const id of destinatarios) {
    if (enviados + falhas >= limite || Date.now() - inicio > ORCAMENTO_LOTE_MS) break;
    vistos++;
    if (!await podeReceber(id, "relatorio")) {
      recusados++;
      continue;
    }
    if (await bloqueioCentral(id, "relatorio", "relatorio", mes)) {
      adiados++;
      continue;
    }
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
      const pronto2 = quinzenal ? await montarQuinzenal(id, mes) : await montarRelatorio(id, mes);
      if (!pronto2) throw new Error("usuario_sem_email");
      await enviarEmail(pronto2.para, pronto2.assunto, pronto2.html, pronto2.texto, await linkDescadastro(id, "relatorio"), void 0, void 0, `relatorio/${id}/${mes}`);
      await atualizarEnvio(linha.id, { status: "enviado", assunto: pronto2.assunto }, { modelo: pronto2.modelo, versao: pronto2.versao, origem: "automatico" });
      enviados++;
    } catch (falha) {
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: /envio_recusado_4\d\d/.test(motivo(falha)) ? "falhou" : "enviando", erro: motivo(falha) }) });
      falhas++;
    }
    await esperar(600);
  }
  return { mes, enviados, falhas, adiados, recusados, lote: destinatarios.length, talvez_restem: restam(vistos, destinatarios.length, JANELA_RELATORIO, enviados + falhas) };
}
var JANELA_RELATORIO = 500;
var JANELA_LEMBRETE = 200;
var ORCAMENTO_LOTE_MS = 4e4;
var restam = (vistos, total, janela, feitos) => vistos < total || total >= janela && feitos > 0;
var TIPO_DA_CAMPANHA = { nunca: "nunca_comecou", tres_dias: "pausa", sete_dias: "sumiu", renovacao_pix: "pix_3_dias", renovacao_pix_hoje: "pix_hoje" };
var CAMPANHAS = ["nunca", "tres_dias", "sete_dias", "renovacao_pix", "renovacao_pix_hoje"];
var ehPix = (c) => c === "renovacao_pix" || c === "renovacao_pix_hoje";
var campanhaValida = (c) => CAMPANHAS.includes(c ?? "") ? c : null;
async function enviarLembretes(campanha, limitePedido, por) {
  const limite = Math.max(1, Math.min(Number(limitePedido) || 40, 80));
  const r = ehPix(campanha) ? await banco("rpc/destinatarios_renovacao_pix", { method: "POST", body: JSON.stringify({ p_etapa: campanha === "renovacao_pix_hoje" ? "hoje" : "tres_dias", p_limite: JANELA_LEMBRETE }) }) : await banco("rpc/destinatarios_lembrete", { method: "POST", body: JSON.stringify({ p_campanha: campanha, p_limite: JANELA_LEMBRETE }) });
  if (!r.ok) throw new Error("consulta_destinatarios_falhou");
  const destinatarios = await r.json();
  let enviados = 0, falhas = 0, adiados = 0, recusados = 0, vistos = 0;
  const inicio = Date.now();
  for (const d of destinatarios) {
    if (enviados + falhas >= limite || Date.now() - inicio > ORCAMENTO_LOTE_MS) break;
    vistos++;
    if (!await podeReceber(d.id_usuario, "lembretes")) {
      recusados++;
      continue;
    }
    const anteriores = await anterioresDe(d.id_usuario).catch(() => []);
    if (await bloqueioCentral(d.id_usuario, TIPO_DA_CAMPANHA[campanha], "lembretes", d.referencia)) {
      adiados++;
      continue;
    }
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
      const numeros = ehPix(campanha) ? await dadosUsuario(d.id_usuario) : null;
      const e = emailLembrete({
        campanha,
        nome: d.nome,
        respondidas: Number(numeros?.respondidas ?? d.respondidas),
        diasFora: Number(d.dias_fora ?? 0),
        diasRestantes: Number(d.dias_restantes ?? 3),
        fimEm: d.fim_periodo ?? null,
        plano: d.plano ?? null,
        acertos: Number(numeros?.acertos ?? 0),
        respondidas7d: Number(numeros?.respondidas_7d ?? 0),
        site: site(),
        linkDescadastro: descadastro,
        referencia: d.referencia,
        anteriores,
        // O perfil completo (parte 27) deixa a carta citar a área em que a pessoa estava e os fatos pessoais.
        perfil: await perfilCompleto(d.id_usuario).catch(() => null)
      });
      await enviarEmail(d.email, e.assunto, e.html, e.texto, descadastro, void 0, void 0, `lembrete/${d.id_usuario}/${d.referencia}`);
      await atualizarEnvio(linha.id, { status: "enviado", assunto: e.assunto }, { modelo: e.modelo, versao: e.versao, origem: por ? "lote" : "automatico" });
      enviados++;
    } catch (falha) {
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: /envio_recusado_4\d\d/.test(motivo(falha)) ? "falhou" : "enviando", erro: motivo(falha) }) });
      falhas++;
    }
    await esperar(600);
  }
  return { campanha, enviados, falhas, adiados, recusados, lote: destinatarios.length, talvez_restem: restam(vistos, destinatarios.length, JANELA_LEMBRETE, enviados + falhas) };
}
async function registrar(corpo) {
  return banco("emails_enviados", { method: "POST", body: JSON.stringify(corpo) });
}
var diaDeHoje = () => new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 10);
var UMA_VEZ = ["boas_vindas_dia0", "primeiras_10", "cronograma_pronto"];
async function enviarAutomatico(id, tipo, pedido, por) {
  if (!emailConfigurado()) return { resultado: "email_nao_configurado" };
  const transacional = ehTransacional(tipo);
  let pessoa = null;
  const r = await banco("rpc/dados_carta_envio", { method: "POST", body: JSON.stringify({ p_id: id, p_modelo: tipo }) });
  if (r.ok) pessoa = await r.json();
  else {
    const antigo = await dadosUsuario(id);
    pessoa = antigo ? { email: antigo.email, nome: antigo.nome, confirmado: true, quer_cartas: antigo.quer_conquistas } : null;
  }
  if (!pessoa?.email) return { resultado: "sem_email" };
  if (pessoa.confirmado === false) return { resultado: "email_nao_confirmado" };
  if (!transacional && !pessoa.quer_cartas) return { resultado: "nao_quer" };
  if (!await podeReceber(id, "cartas")) return { resultado: "nao_quer" };
  const dados = await dadosUsuario(id);
  const respondidas = Number(dados?.respondidas ?? 0);
  const perfil = await perfilCompleto(id).catch(() => null);
  let diasFora = Number(pedido.dias_fora ?? 0);
  if (tipo === "voltou") {
    const parado = perfil?.diasParado ?? null;
    if (parado !== null && parado >= 10) diasFora = parado;
    if (diasFora < 10) return { resultado: "ainda_nao" };
  }
  if (tipo === "primeiras_10" && respondidas < 10) return { resultado: "ainda_nao" };
  let diasParaProva = Number(pedido.dias_para_prova ?? 0) || null, prova2 = typeof pedido.prova === "string" ? pedido.prova.slice(0, 40) : null;
  if (tipo === "cronograma_pronto") {
    const p = await banco(`planos_estudo?usuario_id=eq.${id}&select=data_prova,prova&limit=1`);
    const [plano] = p.ok ? await p.json() : [];
    if (!plano?.data_prova) return { resultado: "sem_cronograma" };
    diasParaProva = Math.max(1, Math.ceil(((/* @__PURE__ */ new Date(`${plano.data_prova}T12:00:00-03:00`)).getTime() - Date.now()) / 864e5));
    prova2 = plano.prova ?? prova2;
  }
  if (tipo === "vespera_prova" && !diasParaProva) diasParaProva = 1;
  if ((tipo === "vespera_prova" || tipo === "depois_prova") && !prova2) {
    const p = await banco(`planos_estudo?usuario_id=eq.${id}&select=prova&limit=1`);
    const [plano] = p.ok ? await p.json() : [];
    prova2 = plano?.prova ?? null;
  }
  const umaVez = UMA_VEZ.includes(tipo);
  const sufixo = typeof pedido.referencia === "string" && /^[a-zA-Z0-9_:.-]{1,60}$/.test(pedido.referencia) ? pedido.referencia : tipo === "voltou" ? diaDeHoje() : "";
  const referencia = umaVez ? tipo : `${tipo}:${sufixo || diaDeHoje()}`;
  const existe = await banco(`emails_enviados?id_usuario=eq.${id}&referencia=eq.${encodeURIComponent(referencia)}&status=in.(enviado,enviando)&select=id&limit=1`);
  if (existe.ok && (await existe.json()).length) return { resultado: "ja_enviado", tipo };
  const anteriores = await anterioresDe(id).catch(() => []);
  const bloqueio = automaticoBloqueado(tipo, anteriores) ?? (transacional ? null : await bloqueioCentral(id, tipo, "cartas", referencia));
  if (bloqueio) return { resultado: "adiado", tipo, motivo: bloqueio };
  const meio = pedido.meio === "pix" ? "pix" : pedido.meio === "cartao" ? "cartao" : null;
  const e = emailAutomatico({
    tipo,
    nome: pessoa.nome ?? dados?.nome ?? null,
    respondidas,
    site: site(),
    perfil,
    anteriores,
    referencia,
    linkDescadastro: transacional ? null : await linkDescadastro(id, "cartas"),
    diasFora,
    diasParaProva,
    provaCronograma: prova2,
    campanha: pedido.dados_campanha ?? null,
    pagamento: tipo === "pagamento_aprovado" ? { plano: pedido.plano ?? null, inicioEm: pedido.inicio_periodo ?? null, fimEm: pedido.fim_periodo ?? null, meio, renovacao: !!pedido.renovacao } : void 0,
    encerramento: tipo === "obrigado_tempo" ? { reembolso: !!pedido.reembolso, fimEm: pedido.fim_periodo ?? null } : void 0
  });
  const base = { id_usuario: id, referencia, assunto: e.assunto, status: "enviando", enviado_por: por };
  let reserva = await registrar({ ...base, tipo: "carta", modelo: e.modelo, versao: e.versao, origem: "automatico" });
  let linha;
  if (reserva.status === 409) {
    const retomada = await banco(`emails_enviados?id_usuario=eq.${id}&tipo=eq.carta&referencia=eq.${encodeURIComponent(referencia)}&status=eq.falhou`, {
      method: "PATCH",
      body: JSON.stringify({ status: "enviando", erro: null, enviado_em: (/* @__PURE__ */ new Date()).toISOString(), assunto: e.assunto, modelo: e.modelo, versao: e.versao })
    });
    if (retomada.ok) [linha] = await retomada.json();
    if (!linha) return { resultado: "ja_enviado", tipo };
  } else {
    if (!reserva.ok) reserva = await registrar({ ...base, tipo: "parabens" });
    if (!reserva.ok) return { resultado: "sql_pendente" };
    [linha] = await reserva.json();
  }
  try {
    await enviarEmail(pessoa.email, e.assunto, e.html, e.texto, transacional ? void 0 : await linkDescadastro(id, "cartas"), void 0, void 0, `automatico/${id}/${referencia}`);
    if (linha) await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "enviado" }) });
    return { resultado: "enviado", tipo, para: pessoa.email };
  } catch (falha) {
    if (linha) await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: /envio_recusado_4\d\d/.test(motivo(falha)) ? "falhou" : "enviando", erro: motivo(falha) }) });
    return { resultado: "falhou", tipo };
  }
}
function pedidoDaCampanha(tipo, c) {
  const d = c.dados ?? {};
  const num = (v) => v === null || v === void 0 || !Number.isFinite(Number(v)) ? null : Number(v);
  const texto = (v) => typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null;
  const sufixo = c.referencia.startsWith(`${tipo}:`) ? c.referencia.slice(tipo.length + 1) : void 0;
  const pedido = { tipo, referencia: sufixo };
  if (tipo === "assinante_parado_7") pedido.dias_fora = num(d.dias_fora) ?? void 0;
  if (tipo === "vespera_prova" || tipo === "depois_prova") pedido.prova = texto(d.prova) ?? void 0;
  if (tipo === "simulado_resultado") pedido.dados_campanha = { simulado: { titulo: texto(d.titulo), acertos: num(d.acertos), total: num(d.total), posicao: num(d.posicao), participantes: num(d.participantes) } };
  if (tipo === "um_ano") pedido.dados_campanha = { anos: num(d.anos) };
  if (tipo === "indicacao_deu_certo") pedido.dados_campanha = { cortesia: d.cortesia === true };
  if (tipo === "resumo_do_tema") pedido.dados_campanha = { resumo: { id: texto(d.id), titulo: texto(d.titulo), especialidade: texto(d.especialidade) } };
  if (tipo === "simulado_lembrete") pedido.dados_campanha = { lembrete: {
    edicao: texto(d.edicao),
    titulo: texto(d.titulo),
    tipo_lembrete: d.tipo_lembrete === "abre_amanha" || d.tipo_lembrete === "abriu_hoje" ? d.tipo_lembrete : null,
    abre_em: texto(d.abre_em),
    fecha_em: texto(d.fecha_em),
    total: num(d.total),
    duracao_min: num(d.duracao_min),
    precisa_plano: d.precisa_plano === true
  } };
  return pedido;
}
async function sincronizarCatalogo() {
  try {
    const r = await fetch(`${site()}biblioteca/indice.json`, { headers: { accept: "application/json" } });
    if (!r.ok) return null;
    const indice = await r.json();
    const capitulos = (indice.capitulos ?? []).map((c) => ({ id: c.id, titulo: c.titulo, especialidade: c.especialidade }));
    if (!capitulos.length) return null;
    const g = await banco("rpc/registrar_catalogo_biblioteca", { method: "POST", body: JSON.stringify({ p_capitulos: capitulos }) });
    return g.ok ? Number(await g.json()) : null;
  } catch {
    return null;
  }
}
async function enviarCampanhas(pedida, limitePedido, simular) {
  if (!emailConfigurado() && !simular) return { erro: "email_nao_configurado" };
  const limite = Math.max(1, Math.min(Number(limitePedido) || 20, 80));
  const lista = pedida ? ehCampanhaDiaria(pedida) ? [pedida] : [] : CAMPANHAS_DIARIAS;
  if (!lista.length) return { erro: "campanha_invalida" };
  const resultado = {};
  let catalogo = null;
  const inicio = Date.now(), noTempo = () => Date.now() - inicio < 11e4;
  let interrompida = false;
  for (const tipo of lista) {
    if (!noTempo()) {
      interrompida = true;
      break;
    }
    if (tipo === "resumo_do_tema") catalogo = await sincronizarCatalogo();
    const r = await banco(`rpc/candidatos_${tipo}`, { method: "POST", body: JSON.stringify({ p_limite: limite }) });
    if (!r.ok) {
      resultado[tipo] = { erro: "sql_pendente" };
      continue;
    }
    const candidatas = await r.json();
    const contagem = { candidatas: candidatas.length };
    for (const c of candidatas) {
      if (!noTempo()) {
        interrompida = true;
        break;
      }
      if (!/^[0-9a-f-]{36}$/.test(c.id_usuario)) continue;
      if (simular) {
        contagem.simuladas = (contagem.simuladas ?? 0) + 1;
        continue;
      }
      const envio = await enviarAutomatico(c.id_usuario, tipo, pedidoDaCampanha(tipo, c), null).catch(() => ({ resultado: "falhou" }));
      contagem[envio.resultado] = (contagem[envio.resultado] ?? 0) + 1;
      if (tipo === "simulado_lembrete" && (envio.resultado === "enviado" || envio.resultado === "ja_enviado") && typeof c.dados?.edicao === "string") {
        await banco("rpc/sn_marcar_lembrete", { method: "POST", body: JSON.stringify({ p_edicao: c.dados.edicao, p_usuario: c.id_usuario }) }).catch(() => null);
      }
      if (envio.resultado === "enviado" || envio.resultado === "falhou") await esperar(600);
    }
    resultado[tipo] = contagem;
  }
  return { campanhas: resultado, limite, catalogo_novos: catalogo, interrompida };
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json({ erro: "metodo_invalido" }, 405, req);
  try {
    const corpo = await req.json();
    if (corpo.acao === "automatico" && req.headers.get("x-segredo")) {
      if (!await segredoValido(req.headers.get("x-segredo"))) return json({ erro: "acesso_negado" }, 403, req);
      const tipo = tipoAutomaticoValido(corpo.tipo);
      if (!tipo) return json({ erro: "tipo_invalido" }, 400, req);
      if (!corpo.id_usuario || !/^[0-9a-f-]{36}$/.test(corpo.id_usuario)) return json({ erro: "usuario_invalido" }, 400, req);
      return json(await enviarAutomatico(corpo.id_usuario, tipo, corpo, null), 200, req);
    }
    if (corpo.acao === "campanhas_diarias" && req.headers.get("x-segredo")) {
      if (!await segredoValido(req.headers.get("x-segredo"))) return json({ erro: "acesso_negado" }, 403, req);
      return json(await enviarCampanhas(corpo.campanha, corpo.limite, corpo.simular === true), 200, req);
    }
    if (corpo.acao === "descadastrar") {
      const tipo = corpo.tipo === "relatorio" ? "relatorio" : corpo.tipo === "lembretes" ? "lembretes" : corpo.tipo === "cartas" ? "cartas" : "conquistas";
      if (!corpo.u || !corpo.t || !/^[0-9a-f-]{36}$/.test(corpo.u) || !await tokenDescadastroValido(corpo.u, corpo.t, tipo)) return json({ erro: "link_invalido" }, 400, req);
      const coluna = tipo === "relatorio" ? "relatorio_mensal" : tipo === "lembretes" ? "lembretes" : tipo === "cartas" ? "cartas" : "conquistas";
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
    if (corpo.acao === "relatorios_quinzenais" && req.headers.get("x-segredo")) {
      if (!await segredoValido(req.headers.get("x-segredo"))) return json({ erro: "acesso_negado" }, 403, req);
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      return json(await enviarRelatorios(corpo.quinzena, corpo.limite, true), 200, req);
    }
    if (corpo.acao === "lembretes" && (corpo.campanha === "renovacao_pix" || corpo.campanha === "renovacao_pix_hoje") && req.headers.get("x-segredo")) {
      if (!await segredoValido(req.headers.get("x-segredo"))) return json({ erro: "acesso_negado" }, 403, req);
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      return json(await enviarLembretes(corpo.campanha, corpo.limite, null), 200, req);
    }
    const usuario = await usuarioDoPedido(req);
    if (corpo.acao === "relatorios_mensais" || corpo.acao === "previa_relatorio") {
      if (!await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      if (corpo.acao === "previa_relatorio") {
        const pronto2 = await montarRelatorio(corpo.id_usuario && /^[0-9a-f-]{36}$/.test(corpo.id_usuario) ? corpo.id_usuario : usuario.id, mesValido(corpo.mes));
        return pronto2 ? json({ assunto: pronto2.assunto, html: pronto2.html }, 200, req) : json({ erro: "usuario_sem_email" }, 404, req);
      }
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      return json(await enviarRelatorios(corpo.mes, corpo.limite), 200, req);
    }
    if (corpo.acao === "relatorios_quinzenais" || corpo.acao === "previa_quinzenal") {
      if (!await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      if (corpo.acao === "previa_quinzenal") {
        const pronto2 = await montarQuinzenal(corpo.id_usuario && /^[0-9a-f-]{36}$/.test(corpo.id_usuario) ? corpo.id_usuario : usuario.id, quinzenaValida(corpo.quinzena));
        return pronto2 ? json({ assunto: pronto2.assunto, html: pronto2.html }, 200, req) : json({ erro: "usuario_sem_email" }, 404, req);
      }
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      return json(await enviarRelatorios(corpo.quinzena, corpo.limite, true), 200, req);
    }
    if (corpo.acao === "lembretes" || corpo.acao === "previa_lembrete") {
      if (!await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      const campanha = campanhaValida(corpo.campanha);
      if (!campanha) return json({ erro: "campanha_invalida" }, 400, req);
      if (corpo.acao === "previa_lembrete") {
        const alvo = corpo.id_usuario && /^[0-9a-f-]{36}$/.test(corpo.id_usuario) ? corpo.id_usuario : usuario.id;
        const dados = await dadosUsuario(alvo);
        const hoje = campanha === "renovacao_pix_hoje";
        const e = emailLembrete({
          campanha,
          nome: dados?.nome ?? null,
          respondidas: Number(dados?.respondidas ?? 0),
          diasFora: Number(corpo.dias_fora ?? (campanha === "sete_dias" ? 9 : 3)),
          diasRestantes: Number(corpo.dias_restantes ?? (hoje ? 0 : 3)),
          fimEm: corpo.fim_periodo ?? new Date(Date.now() + (hoje ? 0 : 3) * 864e5).toISOString(),
          plano: corpo.plano ?? "semestral",
          acertos: Number(dados?.acertos ?? 0),
          respondidas7d: Number(dados?.respondidas_7d ?? 0),
          site: site(),
          linkDescadastro: await linkDescadastro(alvo, "lembretes")
        });
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
      if (!await podeReceber(relato.id_usuario, "cartas")) return json({ erro: "pessoa_nao_quer_emails" }, 409, req);
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
    if (corpo.acao === "campanhas_diarias") {
      if (!await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      return json(await enviarCampanhas(corpo.campanha, corpo.limite, corpo.simular === true), 200, req);
    }
    if (corpo.acao === "automatico") {
      const tipo = tipoAutomaticoValido(corpo.tipo);
      if (!tipo) return json({ erro: "tipo_invalido" }, 400, req);
      if (ehCampanhaDiaria(tipo) && !await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      if ((tipo === "pagamento_aprovado" || tipo === "obrigado_tempo") && !await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      const alvo = corpo.id_usuario && /^[0-9a-f-]{36}$/.test(corpo.id_usuario) && await ehAdministrador(usuario.id) ? corpo.id_usuario : usuario.id;
      return json(await enviarAutomatico(alvo, tipo, corpo, alvo === usuario.id ? null : usuario.id), 200, req);
    }
    if (corpo.acao === "marco") {
      if (!emailConfigurado()) return json({ resultado: "email_nao_configurado" }, 200, req);
      const config = await banco("configuracao_emails?id=eq.true&select=marcos_automaticos");
      if (config.ok && (await config.json())[0]?.marcos_automaticos === false) return json({ resultado: "desativado" }, 200, req);
      const dados = await dadosUsuario(usuario.id);
      if (!dados?.email) return json({ resultado: "sem_email" }, 200, req);
      if (!dados.quer_conquistas || !await podeReceber(usuario.id, "conquistas")) return json({ resultado: "nao_quer" }, 200, req);
      const marco2 = marcoComCarta(Number(dados.respondidas));
      if (!marco2) return json({ resultado: "ainda_nao" }, 200, req);
      if (Number(dados.respondidas) > marco2.minimo + folga(marco2)) return json({ resultado: "longe_do_marco", marco: marco2.minimo }, 200, req);
      const bloqueio = await bloqueioCentral(usuario.id, "marco", "conquistas");
      if (bloqueio) return json({ resultado: "adiado", marco: marco2.minimo, motivo: bloqueio }, 200, req);
      const pronto2 = await montar(usuario.id, marco2);
      if (!pronto2?.dados.email) return json({ resultado: "sem_email" }, 200, req);
      const reserva = await registrar({ id_usuario: usuario.id, tipo: "marco", marco: marco2.minimo, status: "enviando" });
      let linha;
      if (reserva.ok) [linha] = await reserva.json();
      else {
        const retomada = await banco(`emails_enviados?id_usuario=eq.${usuario.id}&tipo=eq.marco&marco=eq.${marco2.minimo}&status=eq.falhou`, {
          method: "PATCH",
          body: JSON.stringify({ status: "enviando", erro: null, enviado_em: (/* @__PURE__ */ new Date()).toISOString() })
        });
        if (retomada.ok) [linha] = await retomada.json();
      }
      if (!linha) return json({ resultado: "ja_enviado", marco: marco2.minimo }, 200, req);
      try {
        await enviarEmail(pronto2.dados.email, pronto2.email.assunto, pronto2.email.html, pronto2.email.texto, await linkDescadastro(usuario.id), void 0, void 0, `marco/${usuario.id}/${marco2.minimo}`);
        await atualizarEnvio(linha.id, { status: "enviado", assunto: pronto2.email.assunto }, { modelo: pronto2.email.modelo, versao: pronto2.email.versao, origem: "automatico" });
        return json({ resultado: "enviado", marco: marco2.minimo }, 200, req);
      } catch (falha) {
        await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: /envio_recusado_4\d\d/.test(motivo(falha)) ? "falhou" : "enviando", erro: motivo(falha) }) });
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
    if (corpo.acao === "carta") {
      if (!await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      if (!corpo.id_usuario || !/^[0-9a-f-]{36}$/.test(corpo.id_usuario)) return json({ erro: "usuario_invalido" }, 400, req);
      const assunto = typeof corpo.assunto === "string" ? corpo.assunto.trim() : "";
      const texto = typeof corpo.corpo === "string" ? corpo.corpo.trim() : "";
      if (!assunto || assunto.length > 120 || !texto || texto.length > 6e3) return json({ erro: "carta_invalida" }, 400, req);
      const grave = problemaGrave(`${assunto}
${texto}`);
      if (grave) return json({ erro: `carta_com_problema: ${grave}` }, 400, req);
      const modelo = typeof corpo.modelo === "string" && /^[a-z0-9_:-]{1,60}$/.test(corpo.modelo) ? corpo.modelo : null;
      const versao = typeof corpo.versao === "string" && /^[a-z0-9_:#-]{1,80}$/.test(corpo.versao) ? corpo.versao : null;
      if (["obrigado_assinatura", "assinou_sem_cronograma"].includes(modelo?.split(":")[0] ?? "")) return json({ erro: "modelo_aposentado" }, 409, req);
      const lote = corpo.origem === "lote";
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      const r = await banco("rpc/dados_carta_envio", { method: "POST", body: JSON.stringify({ p_id: corpo.id_usuario, p_modelo: modelo }) });
      if (!r.ok) return json({ erro: "sql_pendente" }, 409, req);
      const pessoa = await r.json();
      if (!pessoa?.email) return json({ erro: "usuario_sem_email" }, 404, req);
      if (!pessoa.quer_cartas || !await podeReceber(corpo.id_usuario, "cartas")) return json({ erro: "pessoa_nao_quer_emails" }, 409, req);
      if (lote) {
        if (pessoa.administrador) return json({ erro: "administrador" }, 409, req);
        if (!pessoa.confirmado) return json({ erro: "email_nao_confirmado" }, 409, req);
        if (modelo?.startsWith("convite") && !pessoa.novidades) return json({ erro: "sem_aceite_novidades" }, 409, req);
      }
      const impedimento = await bloqueioCentral(corpo.id_usuario, modelo?.split(":")[0] ?? "opiniao", "cartas");
      if (impedimento) return json({ erro: impedimento }, 409, req);
      const descadastro = await linkDescadastro(corpo.id_usuario, "cartas");
      const e = renderizarCarta({ assunto, corpo: texto, descadastro });
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${corpo.id_usuario}:${diaDeHoje()}:${assunto}:${texto}`));
      const referencia = "individual:" + [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
      const registro = { id_usuario: corpo.id_usuario, assunto, referencia, status: "enviando", enviado_por: usuario.id };
      const reserva = await registrar({ ...registro, tipo: "carta", modelo, versao, origem: lote ? "lote" : "manual" });
      if (!reserva.ok) return json({ erro: reserva.status === 409 ? "mensagem_ja_reservada" : "reserva_falhou" }, 409, req);
      const [linha] = await reserva.json();
      if (!linha) return json({ erro: "reserva_falhou" }, 503, req);
      try {
        await enviarEmail(pessoa.email, e.assunto, e.html, e.texto, descadastro ?? void 0, void 0, void 0, referencia);
        if (linha) await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "enviado" }) });
        return json({ resultado: "enviado", para: pessoa.email }, 200, req);
      } catch (falha) {
        if (linha) await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: /envio_recusado_4\d\d/.test(motivo(falha)) ? "falhou" : "enviando", erro: motivo(falha) }) });
        return json({ erro: motivo(falha) }, 502, req);
      }
    }
    if (corpo.acao === "parabens" || corpo.acao === "previa") {
      if (!await ehAdministrador(usuario.id)) return json({ erro: "acesso_negado" }, 403, req);
      if (!corpo.id_usuario || !/^[0-9a-f-]{36}$/.test(corpo.id_usuario)) return json({ erro: "usuario_invalido" }, 400, req);
      const recado = typeof corpo.recado === "string" ? corpo.recado.slice(0, 600) : null;
      const carta = true;
      const pronto2 = await montar(corpo.id_usuario, null, recado, carta);
      if (!pronto2) return json({ erro: "usuario_sem_email" }, 404, req);
      if (corpo.acao === "previa") return json({ assunto: pronto2.email.assunto, html: pronto2.email.html, quer_conquistas: pronto2.dados.quer_conquistas }, 200, req);
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      if (!pronto2.dados.quer_conquistas || !await podeReceber(corpo.id_usuario, "cartas")) return json({ erro: "pessoa_nao_quer_emails" }, 409, req);
      try {
        await enviarEmail(pronto2.dados.email, pronto2.email.assunto, pronto2.email.html, pronto2.email.texto, carta ? void 0 : await linkDescadastro(corpo.id_usuario));
        await registrar({ id_usuario: corpo.id_usuario, tipo: "parabens", marco: pronto2.marco.minimo, assunto: pronto2.email.assunto, enviado_por: usuario.id });
        return json({ resultado: "enviado" }, 200, req);
      } catch (falha) {
        await registrar({ id_usuario: corpo.id_usuario, tipo: "parabens", marco: pronto2.marco.minimo, assunto: pronto2.email.assunto, status: "falhou", erro: motivo(falha), enviado_por: usuario.id });
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

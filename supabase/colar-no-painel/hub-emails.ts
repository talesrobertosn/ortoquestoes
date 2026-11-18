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
var primeirosPassos = (c) => [
  c.um("Vi que voc\xEA ainda n\xE3o come\xE7ou as quest\xF5es por aqui. Que tal experimentar uma sess\xE3o?", "Voc\xEA ainda n\xE3o respondeu suas primeiras quest\xF5es no site. Queria te convidar a experimentar.", "Vi que sua primeira sess\xE3o ainda est\xE1 por come\xE7ar. Separei uma sugest\xE3o para voc\xEA experimentar o site."),
  c.um("Escolha um assunto de que voc\xEA gosta e comece por algumas quest\xF5es. Acho que voc\xEA vai gostar de estudar pelos coment\xE1rios.", "Comece por um tema que voc\xEA quer aprender e leia as explica\xE7\xF5es depois de responder. \xC9 uma boa forma de conhecer o site.", "Experimente algumas quest\xF5es de um assunto do seu interesse. Os coment\xE1rios ajudam a entender o racioc\xEDnio e a revisar o tema."),
  c.um("Vale ler tamb\xE9m por que as outras alternativas est\xE3o erradas; \xE9 uma parte importante do estudo.", "Depois de responder, confira o coment\xE1rio de cada alternativa e use a explica\xE7\xE3o para revisar suas d\xFAvidas.", "A ideia \xE9 aproveitar cada quest\xE3o para aprender, consultando a explica\xE7\xE3o depois da resposta."),
  `Para come\xE7ar: ${c.link("treinar")}`,
  ajuda(c)
];
var incentivo = (c) => c.um(
  "Continue praticando e lendo os coment\xE1rios. Cada sess\xE3o \xE9 uma oportunidade de entender melhor os temas.",
  "Continue se dedicando ao estudo. Escolha um tema por vez e use os coment\xE1rios para esclarecer as d\xFAvidas.",
  "Siga fazendo as quest\xF5es e revisando as explica\xE7\xF5es. O importante \xE9 aproveitar cada resposta para aprender.",
  "Continue estudando pelos coment\xE1rios e volte \xE0s quest\xF5es que trouxeram d\xFAvidas. Isso ajuda a ganhar seguran\xE7a no racioc\xEDnio.",
  "Vamos continuar o estudo com algumas quest\xF5es de um tema e a leitura dos coment\xE1rios de cada alternativa."
);
function proximoPasso(c) {
  const pct = c.pctBom;
  if (pct === null) return [incentivo(c), c.obs(1, ["maisEstudada", "semana", "sequencia"])];
  const meta = pct < 90 ? Math.min(90, (Math.floor(pct / 10) + 1) * 10) : pct < 95 ? 95 : null;
  return [
    c.um(
      `Vi que sua taxa de acerto est\xE1 em ${pct}%.${meta ? ` Continue praticando para buscar os ${meta}%.` : " Parab\xE9ns pelo resultado! Continue variando os temas para manter o estudo completo."}`,
      `Voc\xEA est\xE1 com ${pct}% de acerto nas quest\xF5es.${meta ? ` Vamos continuar o estudo e mirar os ${meta}%?` : " Parab\xE9ns! Agora vale revisar os detalhes e manter contato com as diferentes \xE1reas."}`,
      `Sua taxa de acerto est\xE1 em ${pct}%.${meta ? ` Continue se dedicando para avan\xE7ar em dire\xE7\xE3o aos ${meta}%.` : " Parab\xE9ns pelo resultado! Siga revisando os temas para consolidar o que aprendeu."}`
    ),
    c.fato("melhorArea"),
    c.fato("areaFraca"),
    c.fato("ranking"),
    // Só usa um complemento se faltarem temas/ranking; nunca preenche com cadastro.
    c.obs(1, ["sequencia", "semana", "maisEstudada"])
  ];
}
function estudo(tema, rota = "revisao", total = 6) {
  return Array.from({ length: total }, (_, i) => ({
    id: `v${i + 31}`,
    assuntos: (c) => [nm(c, [tema, "vamos continuar as quest\xF5es?", "uma sugest\xE3o para seu pr\xF3ximo treino", "para avan\xE7ar no seu estudo", "seus pr\xF3ximos temas de revis\xE3o", "vamos praticar mais um pouco?"][i % 6])],
    corpo: (c) => c.r === 0 ? primeirosPassos(c) : [
      c.um("Voc\xEA j\xE1 come\xE7ou a resolver as quest\xF5es. Tenho uma sugest\xE3o para o pr\xF3ximo treino.", "Vi que voc\xEA est\xE1 fazendo as quest\xF5es. Vamos continuar o estudo?", "Voc\xEA j\xE1 come\xE7ou a estudar por aqui. Queria te incentivar a continuar pelas quest\xF5es e pelos coment\xE1rios."),
      ...proximoPasso(c),
      sugestao(c, rota),
      `Para continuar: ${c.link(rota)}`,
      ajuda(c)
    ]
  }));
}
var nunca = () => Array.from({ length: 6 }, (_, i) => ({
  id: `v${i + 31}`,
  assuntos: (c) => [nm(c, ["vamos come\xE7ar as quest\xF5es?", "sua primeira sess\xE3o", "um tema para come\xE7ar", "experimente as quest\xF5es comentadas", "por onde come\xE7ar o estudo", "um convite para seu primeiro treino"][i])],
  corpo: primeirosPassos
}));
var convite = () => Array.from({ length: 6 }, (_, i) => ({
  id: `v${i + 21}`,
  assuntos: (c) => [nm(c, ["op\xE7\xF5es para ampliar seu estudo", "sobre os planos de acesso", "recursos do plano completo", "para conhecer os planos", "assinatura do Orto Quest\xF5es", "op\xE7\xF5es de assinatura"][i])],
  corpo: (c) => [
    c.um("Queria apresentar as op\xE7\xF5es de assinatura do Orto Quest\xF5es.", "Voc\xEA pode conhecer os planos de acesso e os recursos inclu\xEDdos em cada um.", "A p\xE1gina de planos re\xFAne as op\xE7\xF5es para ampliar o acesso ao conte\xFAdo."),
    c.obs(1, ["maisEstudada", "semana"]),
    ...c.beneficios(2, true),
    "Os planos t\xEAm garantia de sete dias. As condi\xE7\xF5es e os recursos inclu\xEDdos est\xE3o na p\xE1gina de assinatura.",
    `Para consultar os planos: ${c.link("assinatura")}`,
    ajuda(c)
  ]
}));
var boasVindas = [{ id: "v41", assuntos: (c) => [nm(c, "sua conta no Orto Quest\xF5es")], corpo: (c) => [
  "Que bom ter voc\xEA no Orto Quest\xF5es! Sua conta j\xE1 est\xE1 pronta para come\xE7ar.",
  "Minha sugest\xE3o para o primeiro treino \xE9 escolher um tema e resolver algumas quest\xF5es. Depois de responder, leia tamb\xE9m a explica\xE7\xE3o das outras alternativas.",
  "A Biblioteca de resumos ajuda a consultar o conte\xFAdo, e a Revis\xE3o re\xFAne as quest\xF5es para retomar depois. O Cronograma est\xE1 dispon\xEDvel para organizar as sess\xF5es pela data da prova.",
  `Para come\xE7ar pelas quest\xF5es: ${c.link("treinar")}`,
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
    tipo === "vespera_prova" ? `Amanh\xE3 \xE9 ${prova(c)}.` : `Com ${prova(c)} se aproximando, vale retomar as quest\xF5es e as anota\xE7\xF5es que trouxeram d\xFAvidas.`,
    c.obs(1),
    c.um("Uma op\xE7\xE3o \xE9 revisar as quest\xF5es j\xE1 respondidas e as anota\xE7\xF5es que voc\xEA salvou.", "Os coment\xE1rios das quest\xF5es anteriores e suas anota\xE7\xF5es podem orientar a pr\xF3xima revis\xE3o.", "Voc\xEA pode selecionar os temas que quer revisar e consultar os coment\xE1rios de cada alternativa."),
    `Sua revis\xE3o fica aqui: ${c.link("revisao")}`,
    ajuda(c)
  ]
}));
var marco = (primeiro = false) => Array.from({ length: 6 }, (_, i) => ({
  id: `v${i + 41}`,
  assuntos: (c) => [nm(c, [primeiro ? "suas primeiras quest\xF5es" : "parab\xE9ns pelo seu novo marco", "mais um passo no seu estudo", "suas quest\xF5es e a pr\xF3xima revis\xE3o", "seu progresso nas quest\xF5es", "para continuar seu treino", "um marco para comemorar"][i])],
  corpo: (c) => [
    primeiro ? "Voc\xEA concluiu suas primeiras dez quest\xF5es no Orto Quest\xF5es." : `Voc\xEA completou ${Q(c.marco ?? 100)} no Orto Quest\xF5es. Parab\xE9ns pela dedica\xE7\xE3o ao estudo!`,
    c.obs(1, ["ranking", "melhorArea"]),
    c.um("Para aproveitar esse treino, vale voltar \xE0s quest\xF5es que trouxeram d\xFAvidas e reler os coment\xE1rios.", "A pr\xF3xima sess\xE3o pode ser dedicada a refazer quest\xF5es e conferir o racioc\xEDnio de cada alternativa.", "Continue praticando e reserve uma parte do treino para revisar os conceitos das quest\xF5es anteriores."),
    `Sua revis\xE3o est\xE1 aqui: ${c.link("revisao")}`,
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
var dataCompleta = (iso) => iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : null;
var planoPorExtenso = (id) => id ? { mensal: "mensal", trimestral: "trimestral", semestral: "semestral", anual: "anual" }[id] ?? null : null;
var pagamento = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 41}`,
  assuntos: (c) => [nm(c, (c.pagamento?.renovacao ? ["renova\xE7\xE3o confirmada", "seu novo per\xEDodo est\xE1 confirmado", "pagamento da renova\xE7\xE3o aprovado", "confirma\xE7\xE3o da sua renova\xE7\xE3o", "seu acesso foi prolongado"] : ["pagamento aprovado", "sua assinatura foi confirmada", "seu acesso est\xE1 ativo", "confirma\xE7\xE3o do seu plano", "seu per\xEDodo de acesso"])[i])],
  corpo: (c) => [
    c.pagamento?.renovacao ? "O pagamento da renova\xE7\xE3o foi aprovado. Seu novo per\xEDodo de acesso est\xE1 confirmado. Obrigado por continuar estudando com o Orto Quest\xF5es." : c.um("Seu pagamento foi aprovado e a assinatura est\xE1 confirmada. Obrigado pela confian\xE7a!", "Sua assinatura foi confirmada. Obrigado por escolher o Orto Quest\xF5es para o seu estudo.", "O pagamento foi aprovado e seu acesso est\xE1 ativo. Obrigado pela assinatura!"),
    planoPorExtenso(c.pagamento?.plano) ? `Plano confirmado: ${planoPorExtenso(c.pagamento?.plano)}.` : null,
    dataCompleta(c.pagamento?.fimEm) ? `Seu acesso pago vai at\xE9 ${dataCompleta(c.pagamento?.fimEm)}.` : null,
    c.pagamento?.meio === "pix" ? "O pagamento foi feito por Pix. N\xE3o h\xE1 renova\xE7\xE3o autom\xE1tica; os detalhes do per\xEDodo e as op\xE7\xF5es para prolongar ficam em Minha assinatura." : c.pagamento?.meio === "cartao" ? "O pagamento foi confirmado no cart\xE3o. Em Minha assinatura voc\xEA consulta o per\xEDodo, a renova\xE7\xE3o e os recibos." : "Em Minha assinatura voc\xEA consulta os detalhes do acesso, os pagamentos e os recibos.",
    `Para consultar seu plano: ${c.link("conta")}`,
    ajuda(c)
  ]
}));
var encerramento = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 41}`,
  assuntos: (c) => [nm(c, (c.encerramento?.reembolso ? ["sobre o reembolso da assinatura", "atualiza\xE7\xE3o do seu reembolso", "reembolso registrado", "detalhes do reembolso", "sua assinatura e o reembolso"] : ["renova\xE7\xE3o autom\xE1tica desligada", "cancelamento confirmado", "sobre o fim do per\xEDodo pago", "atualiza\xE7\xE3o da assinatura", "detalhes do cancelamento"])[i])],
  corpo: (c) => {
    const fim = dataCompleta(c.encerramento?.fimEm);
    const vigente = !!c.encerramento?.fimEm && Date.parse(c.encerramento.fimEm) > c.hoje.getTime();
    return [
      c.encerramento?.reembolso ? "O reembolso desta assinatura foi registrado, e o per\xEDodo de acesso pago foi encerrado." : vigente ? `A renova\xE7\xE3o autom\xE1tica foi desligada. Voc\xEA continua com o per\xEDodo pago at\xE9 ${fim}; essa renova\xE7\xE3o n\xE3o gerar\xE1 outro pagamento.` : fim ? `O cancelamento da assinatura foi confirmado. O per\xEDodo pago terminou em ${fim}.` : "O cancelamento da assinatura foi confirmado. Voc\xEA pode consultar o per\xEDodo e os detalhes na sua conta.",
      acesso(c),
      `Os detalhes ficam em Minha assinatura: ${c.link("conta")}`,
      "Se precisar esclarecer alguma informa\xE7\xE3o sobre a solicita\xE7\xE3o, basta responder este e-mail."
    ];
  }
}));
var relatorio = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 41}`,
  assuntos: (c) => [nm(c, [c.relatorio?.quinzena ? "seu resumo quinzenal" : "seu resumo mensal", "seu progresso e a pr\xF3xima revis\xE3o", "seu estudo neste per\xEDodo", "quest\xF5es, resultados e pr\xF3ximos passos", "uma sugest\xE3o para sua pr\xF3xima sess\xE3o"][i])],
  corpo: (c) => {
    const d = c.relatorio, n = d?.respostas ?? 0, total = (d?.certas ?? 0) + (d?.erradas ?? 0), pct = total ? Math.round((d?.certas ?? 0) / total * 100) : null;
    const citavel = n >= 30 && pct !== null && pct >= 50;
    const delta = citavel && d?.acertoAnterior !== null && d?.acertoAnterior !== void 0 ? pct - d.acertoAnterior : null;
    const forte = d?.melhorArea && c.area(d.melhorArea.slug) && d.melhorArea.acerto >= 70 ? d.melhorArea : null;
    const revisar = d?.maisFraco && c.area(d.maisFraco.slug) && d.maisFraco.slug !== forte?.slug ? d.maisFraco : null;
    return [
      d?.rotulo ? `Separei seu resumo de estudo ${d.rotulo}, com uma sugest\xE3o para a pr\xF3xima sess\xE3o.` : "Seu resumo de estudo est\xE1 dispon\xEDvel, com uma sugest\xE3o para continuar.",
      n >= 10 ? `Voc\xEA respondeu ${Q(n)} neste per\xEDodo${d?.diasAtivos && d.diasAtivos > 0 ? `, distribu\xEDdas em ${d.diasAtivos === 1 ? "um dia" : `${d.diasAtivos} dias`} de estudo` : ""}.` : n > 0 ? "Voc\xEA j\xE1 come\xE7ou a responder as quest\xF5es neste per\xEDodo. Continue praticando e lendo os coment\xE1rios." : "Seu hist\xF3rico e suas anota\xE7\xF5es continuam salvos. Para retomar, escolha um tema e experimente uma sess\xE3o de quest\xF5es comentadas.",
      citavel ? `Sua taxa de acerto no per\xEDodo foi de ${pct}%.${delta !== null && delta > 0 ? ` O resultado subiu ${delta} pontos em rela\xE7\xE3o ao per\xEDodo anterior.` : " Continue praticando e revisando os coment\xE1rios para consolidar os temas."}` : n > 0 ? incentivo(c) : null,
      citavel && forte ? `Seu ponto forte no per\xEDodo foi ${c.area(forte.slug).de}. Parab\xE9ns pelo estudo desse tema!` : null,
      revisar ? `Para a pr\xF3xima sess\xE3o, minha sugest\xE3o \xE9 refor\xE7ar ${c.area(revisar.slug).de}, refazendo as quest\xF5es e consultando os coment\xE1rios.` : n > 0 ? "Para a pr\xF3xima sess\xE3o, vale retomar as quest\xF5es que trouxeram d\xFAvidas e ler a explica\xE7\xE3o de cada alternativa." : null,
      d?.simulado && d.simulado.acertos >= 10 && d.simulado.total >= d.simulado.acertos && d.simulado.acertos * 2 >= d.simulado.total ? `Na edi\xE7\xE3o "${d.simulado.titulo}", voc\xEA acertou ${d.simulado.acertos} de ${d.simulado.total} quest\xF5es.` : null,
      `Seu desempenho e os temas estudados: ${c.link("desempenho")}`,
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
var TIPOS_APOSENTADOS = ["obrigado_assinatura", "assinou_sem_cronograma", "primeiras_10", "voltou", "cronograma_pronto"];
var TIPOS = {
  nunca_comecou: { grupo: "situacao", rotulo: "Criou a conta e n\xE3o come\xE7ou", descricao: "Conta criada h\xE1 pelo menos um dia e nenhuma quest\xE3o respondida." },
  boas_vindas: { grupo: "situacao", rotulo: "Boas-vindas", descricao: "Chegou nos \xFAltimos 3 dias e j\xE1 respondeu algumas quest\xF5es." },
  comecando: { grupo: "situacao", rotulo: "Come\xE7ando", descricao: "Ativo, com menos de 30 quest\xF5es: pergunta como est\xE1 sendo e d\xE1 uma ideia pr\xE1tica." },
  comecou_parou: { grupo: "situacao", rotulo: "Come\xE7ou e parou", descricao: "Menos de 30 quest\xF5es respondidas e alguns dias sem nova sess\xE3o." },
  pausa: { grupo: "automatico", rotulo: "Revis\xE3o ap\xF3s 3 a 6 dias", descricao: "\xDAltima sess\xE3o h\xE1 tr\xEAs a seis dias, com hist\xF3rico de estudo anterior." },
  sumiu: { grupo: "situacao", rotulo: "Sem estudar h\xE1 v\xE1rios dias", descricao: "J\xE1 respondia quest\xF5es e est\xE1 h\xE1 v\xE1rios dias sem estudar; o motivo mostra a janela aplicada." },
  ativo: { grupo: "situacao", rotulo: "Estudando (pela faixa de acerto)", descricao: "Uma voz para cada faixa de acerto, com o que a pessoa tem de especial." },
  obrigado_assinatura: { grupo: "pessoal", rotulo: "Obrigado pela assinatura", descricao: "Aposentado: o agradecimento j\xE1 sai automaticamente no pagamento." },
  convite_20: { grupo: "convite", rotulo: "Convite para assinar (mais de 20 quest\xF5es)", descricao: "Leve: o que o plano faz pela rotina, a garantia, sem pre\xE7o." },
  convite_50: { grupo: "convite", rotulo: "Convite pessoal (mais de 50 quest\xF5es)", descricao: "Dias para a prova, \xE1rea forte, o cronograma como horas devolvidas; garantia." },
  reta_final: { grupo: "situacao", rotulo: "Reta final", descricao: "A prova informada est\xE1 se aproximando; a carta usa a data e o nome dispon\xEDveis." },
  marco: { grupo: "situacao", rotulo: "Marco de quest\xF5es (100, 250, 500, 1.000, 2.000)", descricao: "Alcan\xE7ou 100, 250, 500, 1.000 ou 2.000 quest\xF5es respondidas." },
  opiniao: { grupo: "pessoal", rotulo: "Pedir opini\xE3o", descricao: "Tr\xEAs perguntas concretas." },
  indicar: { grupo: "pessoal", rotulo: "Pedir para indicar", descricao: '"Quem voc\xEA conhece que est\xE1 nessa?"; os 7 dias para os dois.' },
  cronograma: { grupo: "pessoal", rotulo: "Apresentar o cronograma", descricao: "Quando ele devolve tempo." },
  cartao_recusado: { grupo: "automatico", rotulo: "Ajuda com o cart\xE3o", descricao: "Tentativa de pagamento n\xE3o conclu\xEDda; oferece ajuda e a alternativa do Pix." },
  pix_3_dias: { grupo: "automatico", rotulo: "Pix: faltam 3 dias", descricao: "O per\xEDodo de acesso pago no Pix termina em tr\xEAs dias." },
  pix_hoje: { grupo: "automatico", rotulo: "Pix: termina hoje", descricao: "O per\xEDodo de acesso pago no Pix termina hoje." },
  relatorio: { grupo: "automatico", rotulo: "Resumo de estudo", descricao: "Autom\xE1tico: a quinzena ou o m\xEAs contados como uma hist\xF3ria." },
  boas_vindas_dia0: { grupo: "automatico", rotulo: "Boas-vindas no dia da confirma\xE7\xE3o", descricao: "Primeiro login depois de confirmar o e-mail: boas-vindas, as fun\xE7\xF5es do site (quest\xF5es, Cronograma, resumos) e o pedido para contar aos colegas." },
  primeiras_10: { grupo: "automatico", rotulo: "Primeiras 10 quest\xF5es", descricao: "Desativado pelo Tales em 17/11/2026. Hist\xF3rico preservado; nenhum novo envio." },
  voltou: { grupo: "automatico", rotulo: "Retomada do estudo", descricao: "Desativado pelo Tales em 17/11/2026. Hist\xF3rico preservado; nenhum novo envio." },
  cronograma_pronto: { grupo: "automatico", rotulo: "Cronograma pronto", descricao: "Desativado pelo Tales em 17/11/2026. Hist\xF3rico preservado; nenhum novo envio." },
  pagamento_aprovado: { grupo: "automatico", rotulo: "Obrigado pela assinatura", descricao: "Sai quando a assinatura ou a renova\xE7\xE3o \xE9 aprovada: agradecimento, plano, per\xEDodo, o que libera e o link do cronograma. Transacional." },
  obrigado_tempo: { grupo: "automatico", rotulo: "Obrigado pelo tempo de assinatura", descricao: "Confirma\xE7\xE3o da solicita\xE7\xE3o de cancelamento ou reembolso." },
  assinou_sem_cronograma: { grupo: "automatico", rotulo: "Assinou e n\xE3o montou o cronograma", descricao: "Aposentado: montar um cronograma \xE9 opcional." },
  assinante_parado_7: { grupo: "automatico", rotulo: "Assinante parado h\xE1 7 dias", descricao: "Assinatura ativa e pelo menos uma semana sem responder quest\xF5es." },
  simulado_resultado: { grupo: "automatico", rotulo: "Resultado do Simulado Nacional", descricao: "Quando a edi\xE7\xE3o fecha: obrigado por ter feito, o que o resultado mostra e o que fazer com ele." },
  vespera_prova: { grupo: "automatico", rotulo: "V\xE9spera da prova", descricao: "Na v\xE9spera da data do cronograma: orienta\xE7\xF5es pr\xE1ticas e boa prova." },
  depois_prova: { grupo: "automatico", rotulo: "Depois da prova: como foi?", descricao: "De 1 a 3 dias depois da data do cronograma: pergunta como foi, sem presumir o resultado." },
  aniversario: { grupo: "automatico", rotulo: "Anivers\xE1rio", descricao: "No dia do anivers\xE1rio (data de nascimento do cadastro): curta, sem convite." },
  um_ano: { grupo: "automatico", rotulo: "Um ano de Orto Quest\xF5es", descricao: "No dia em que a conta faz um ano (ou mais): o caminho at\xE9 aqui, sem convite." },
  indicacao_deu_certo: { grupo: "automatico", rotulo: "Sua indica\xE7\xE3o deu certo", descricao: "Quem a pessoa indicou chegou a 20 quest\xF5es: obrigado pela confian\xE7a." },
  resumo_do_tema: { grupo: "automatico", rotulo: "Saiu um resumo do seu tema", descricao: "Semanal, s\xF3 para quem aceitou novidades: um resumo novo na \xE1rea que a pessoa mais estuda." },
  acesso_terminou: { grupo: "situacao", rotulo: "Acesso encerrado", descricao: "O acesso pago terminou h\xE1 at\xE9 30 dias. Sugere consultar o hist\xF3rico e as revis\xF5es salvas." },
  como_estao: { grupo: "situacao", rotulo: "Como est\xE3o os estudos? (risco de parar)", descricao: "Assinante que o painel marcou com risco moderado ou alto: pergunta da rotina, a Revis\xE3o e o cronograma que se ajusta; se o acesso estiver perto do fim, a conta dos dias somados." },
  simulado_lembrete: { grupo: "automatico", rotulo: "Lembrete do Simulado Nacional", descricao: "Para quem se inscreveu: a edi\xE7\xE3o abre amanh\xE3 (ou abriu hoje), quantas quest\xF5es, quanto tempo e at\xE9 quando d\xE1 para fazer." }
};
var TIPOS_AUTOMATICOS_NOVOS = ["boas_vindas_dia0", "pagamento_aprovado", "obrigado_tempo"];
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
  "tumores": { em: "tumores", de: "tumores", sabor: ["Tumor assusta muita gente, ent\xE3o isso \xE9 \xF3timo.", "Tumor \xE9 um tema que muita gente evita, e voc\xEA est\xE1 encarando."] },
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
  const com = (tipo, faixa, marco3, motivo) => ({ tipo, faixa, marco: marco3, motivo, bloqueio: cadenciaBloqueia(anteriores, hoje, tipo) });
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
  if (melhor && melhor.pct >= 70) f.melhorArea = { slug: melhor.slug, pct: melhor.pct, total: melhor.total };
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
      return mostrar ? [`Voc\xEA est\xE1 indo muito bem em ${a.em}. Parab\xE9ns! Continue revisando para manter esse resultado.`, `Sua melhor \xE1rea \xE9 ${a.de}. Parab\xE9ns pelo estudo nesse tema!`, `Vi que ${a.de} \xE9 seu ponto forte nas quest\xF5es. Continue praticando para consolidar esse resultado.`] : [`Voc\xEA j\xE1 vem praticando ${a.de}. Continue lendo os coment\xE1rios para aprofundar o tema.`, `Que tal aproveitar a pr\xF3xima sess\xE3o para continuar o estudo de ${a.de}?`];
    }
    case "maisEstudada": {
      const a = A(f.maisEstudada.slug);
      return [`Vi que voc\xEA vem praticando ${a.de}. Continue pelas quest\xF5es do tema e reveja as explica\xE7\xF5es que trouxeram d\xFAvidas.`, `Voc\xEA j\xE1 tem estudado ${a.de}. Que tal retomar algumas quest\xF5es desse tema na pr\xF3xima sess\xE3o?`, `Para continuar o que voc\xEA j\xE1 come\xE7ou em ${a.em}, vale reler os coment\xE1rios das quest\xF5es anteriores.`];
    }
    case "areaFraca": {
      const a = A(f.areaFraca.slug);
      return [`Vale dar uma aten\xE7\xE3o extra ao estudo de ${a.de} na pr\xF3xima sess\xE3o. As quest\xF5es comentadas podem ajudar a esclarecer os pontos que ainda trazem d\xFAvidas.`, `Para equilibrar o estudo entre as \xE1reas, reserve tamb\xE9m uma sess\xE3o para ${a.de} e leia os coment\xE1rios das alternativas.`, `Minha sugest\xE3o para a pr\xF3xima revis\xE3o \xE9 resolver mais quest\xF5es de ${a.de}, retomando as explica\xE7\xF5es das quest\xF5es.`];
    }
    case "ranking":
      return [`Parab\xE9ns pela ${f.ranking}\xAA posi\xE7\xE3o no ranking geral! Continue praticando e variando os temas para ampliar seu dom\xEDnio das \xE1reas.`, `Voc\xEA est\xE1 na ${f.ranking}\xAA posi\xE7\xE3o do ranking geral. Parab\xE9ns! Siga fazendo as quest\xF5es e revisando os temas para continuar avan\xE7ando.`];
    case "sequencia":
      return [`Voc\xEA j\xE1 est\xE1 h\xE1 ${dias(f.sequencia)} seguidos estudando. Continue aproveitando cada sess\xE3o para revisar suas d\xFAvidas.`, `Parab\xE9ns pelos ${dias(f.sequencia)} seguidos de estudo! Siga combinando quest\xF5es e leitura dos coment\xE1rios.`];
    case "flashcards":
      return ["Voc\xEA tamb\xE9m j\xE1 experimentou os Flashcards. Uma op\xE7\xE3o \xE9 us\xE1-los depois das quest\xF5es para revisar os conceitos do tema."];
    case "semana":
      return [`Voc\xEA respondeu ${questoes(f.semana)} nos \xFAltimos sete dias. Continue praticando e use os coment\xE1rios para revisar as d\xFAvidas.`, `Foram ${questoes(f.semana)} nesta semana. Que tal usar a pr\xF3xima sess\xE3o para retomar os pontos que trouxeram d\xFAvidas?`];
    case "resumos":
      return f.resumos.titulo ? [`Voc\xEA j\xE1 leu o resumo "${f.resumos.titulo}". Que tal praticar as quest\xF5es vinculadas para revisar esse conte\xFAdo?`] : ["Voc\xEA j\xE1 come\xE7ou a leitura dos resumos. As quest\xF5es vinculadas ao texto ajudam a praticar o conte\xFAdo depois de cada se\xE7\xE3o."];
    case "cronograma":
      return [`Faltam ${dias(f.cronograma.dias)} para ${f.cronograma.prova || "a sua prova"}. Use as pr\xF3ximas sess\xF5es para revisar as d\xFAvidas e consultar seus coment\xE1rios salvos.`];
    case "horario":
    case "prova":
    case "etapa":
    case "servico":
    case "cidade":
    case "aniversario":
      return [];
  }
}
var ORDEM_FATOS = ["melhorArea", "areaFraca", "ranking", "maisEstudada", "sequencia", "semana", "resumos", "cronograma", "flashcards"];
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
function criarCtx(p, tipo, faixa, marco2, rnd, op, estado2) {
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
  const mostrarAcerto = () => pctBomValor !== null;
  const nObs = () => [...usados].filter((u) => u !== "acerto").length;
  const fato = (chave) => {
    if (!ORDEM_FATOS.includes(chave) || fatos[chave] === void 0 || usados.has(chave) || nObs() >= MAXIMO_OBS) return null;
    if ((chave === "maisEstudada" && usados.has("melhorArea") || chave === "melhorArea" && usados.has("maisEstudada")) && fatos.melhorArea?.slug === fatos.maisEstudada?.slug) return null;
    const comNumero = mostrarAcerto();
    const frases = frasesDoFato(chave, fatos, comNumero);
    if (!frases.length) return null;
    usados.add(chave);
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
      estado2.link = rota;
      const id = op.campanha?.resumo?.id;
      const caminho = rota === "resumo" && typeof id === "string" && /^[a-z0-9-]{3,80}$/.test(id) ? `#/resumos/${id}` : ROTAS[rota];
      return (site2 + caminho).replace(/^https?:\/\//, "");
    },
    fato,
    obs: (k = 1, preferir = []) => {
      const limite = Math.min(MAXIMO_OBS, Math.max(1, k));
      const ordem = [...preferir, ...ORDEM_FATOS.filter((c) => !preferir.includes(c))].filter((c) => ORDEM_FATOS.includes(c) && fatos[c] !== void 0 && !usados.has(c));
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
function problemaDeTomCarta(texto) {
  if (/seu cadastro|etapa informada|seu perfil indica|cidade informada|data de aniversário informada|você informou[^.\n]*objetivos de estudo|cadastro está identificado|P\.S\.:|lembrete amigo/i.test(texto))
    return "Atualize a pr\xE9via: esta mensagem usa um modelo de texto antigo.";
  return null;
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
    case "voltou":
    case "cronograma_pronto":
      return false;
    case "boas_vindas":
    case "comecando":
    case "comecou_parou":
    case "pausa":
    case "sumiu":
    case "convite_20":
    case "convite_50":
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
    const estado2 = { link: null };
    const ctx = criarCtx(p, tipo, faixa, marco2, rnd, op, estado2);
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
function anterioresDosDados(d) {
  return [...d.emails?.lista ?? [], ...d.emails?.antigos ?? []];
}

// supabase/functions/_shared/modelo-email.ts
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
  const melhorArea = [...doMes].filter((t) => t.total >= 15 && t.acerto >= 70).sort((a, b) => b.acerto - a.acerto || b.total - a.total)[0] ?? null;
  return { acerto, acertoAnterior, subiram, cairam, maisFraco, maisEstudados, melhorArea };
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
    melhorArea: a.melhorArea,
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

// src/admin/dados/risco.ts
var PESOS_PADRAO = {
  parado: [{ dias: 3, pontos: 1 }, { dias: 7, pontos: 3 }, { dias: 14, pontos: 4 }],
  queda: [{ fracao: 0.6, pontos: 1 }, { fracao: 0.3, pontos: 2 }],
  mediaMinima: 20,
  vencimento: [{ dias: 7, pontos: 2 }, { dias: 3, pontos: 3 }],
  semSessaoNaSemana: 1,
  moderado: 3,
  alto: 5
};
var DIA = 864e5;
var maiorQue = (lista, ok) => lista.filter(ok).reduce((m, x) => Math.max(m, x.pontos), 0);
function avaliarRisco(e, pesos = PESOS_PADRAO, agora = Date.now()) {
  const motivos = [];
  let pontos = 0;
  const diasParado = e.ultimaAtividade ? Math.floor((agora - new Date(e.ultimaAtividade).getTime()) / DIA) : Math.floor((agora - new Date(e.criadoEm).getTime()) / DIA);
  const p1 = maiorQue(pesos.parado, (x) => diasParado >= x.dias);
  if (p1) {
    pontos += p1;
    motivos.push(`${diasParado} dias sem estudar`);
  }
  const semanas = Math.max(0, (agora - new Date(e.criadoEm).getTime()) / DIA / 7 - 1);
  const media = semanas >= 1 ? Math.max(0, e.respondidas - e.respondidas7d) / semanas : 0;
  if (media >= pesos.mediaMinima) {
    const fracao = e.respondidas7d / media;
    const p2 = maiorQue(pesos.queda, (x) => fracao < x.fracao);
    if (p2) {
      pontos += p2;
      motivos.push(`semana em ${Math.round(fracao * 100)}% do ritmo de antes (${Math.round(media)} por semana)`);
    }
  }
  if (e.respondidas7d === 0 && e.respondidas > 0 && pesos.semSessaoNaSemana) {
    pontos += pesos.semSessaoNaSemana;
    motivos.push("nenhuma quest\xE3o nos \xFAltimos 7 dias");
  }
  if (e.fimSemRenovar) {
    const dias2 = Math.ceil((new Date(e.fimSemRenovar).getTime() - agora) / DIA);
    const p3 = dias2 >= 0 ? maiorQue(pesos.vencimento, (x) => dias2 <= x.dias) : 0;
    if (p3) {
      pontos += p3;
      motivos.push(dias2 === 0 ? "acesso termina hoje" : `acesso termina em ${dias2} ${dias2 === 1 ? "dia" : "dias"}, sem renova\xE7\xE3o autom\xE1tica`);
    }
  }
  const nivel = pontos >= pesos.alto ? "alto" : pontos >= pesos.moderado ? "moderado" : "baixo";
  const perto = e.fimSemRenovar && (new Date(e.fimSemRenovar).getTime() - agora) / DIA <= 7;
  const acao = nivel === "baixo" ? "Nada a fazer agora." : perto && diasParado >= 3 ? "Carta gentil lembrando o vencimento e mostrando o progresso at\xE9 aqui." : perto ? "Lembrete gentil de renova\xE7\xE3o (os dias que faltam n\xE3o se perdem)." : diasParado >= 7 ? "Carta de retomada: o cronograma reorganizado e um treino curto para voltar." : "Mensagem de incentivo com os temas em que a pessoa mais evoluiu.";
  return { pontos, nivel, motivos, acao };
}

// supabase/functions/_shared/hub-regras.ts
var CENARIOS_HUB = [
  { id: "cartao_recusado", titulo: "O cart\xE3o n\xE3o passou", descricao: "Ajuda cordial para quem n\xE3o conseguiu concluir o pagamento, com a alternativa do Pix.", grupo: "Com prazo", tipos: ["cartao_recusado"] },
  { id: "pix_hoje", titulo: "Pix: acesso termina hoje", descricao: "\xDAltimo dia do per\xEDodo pago no Pix.", grupo: "Com prazo", tipos: ["pix_hoje"] },
  { id: "pix_3_dias", titulo: "Pix: faltam 3 dias", descricao: "O acesso pago no Pix termina em tr\xEAs dias.", grupo: "Com prazo", tipos: ["pix_3_dias"] },
  { id: "fogo_apagando", titulo: "Fogo apagando", descricao: "J\xE1 estudava e est\xE1 sem responder. A mensagem considera h\xE1 quanto tempo parou.", grupo: "Voltar a estudar", tipos: ["pausa", "sumiu", "como_estao", "assinante_parado_7"] },
  { id: "comecou_parou", titulo: "Come\xE7ou e parou", descricao: "Deu os primeiros passos, com menos de 30 quest\xF5es, e interrompeu o estudo.", grupo: "Voltar a estudar", tipos: ["comecou_parou"] },
  { id: "nunca_comecou", titulo: "Criou a conta e n\xE3o come\xE7ou", descricao: "Ainda n\xE3o respondeu nenhuma quest\xE3o. O primeiro convite n\xE3o se repete.", grupo: "Voltar a estudar", tipos: ["nunca_comecou"] },
  { id: "acesso_terminou", titulo: "Acesso pago terminou", descricao: "O per\xEDodo pago acabou e a pessoa ainda n\xE3o renovou.", grupo: "Voltar a estudar", tipos: ["acesso_terminou"] },
  { id: "reta_final", titulo: "Reta final", descricao: "A prova se aproxima: revisar erros e treinar com tempo marcado.", grupo: "Provas e estudo", tipos: ["reta_final"] },
  { id: "vespera_prova", titulo: "A prova \xE9 amanh\xE3", descricao: "V\xE9spera da data informada no cronograma.", grupo: "Provas e estudo", tipos: ["vespera_prova"] },
  { id: "depois_prova", titulo: "Depois da prova: como foi?", descricao: "De um a tr\xEAs dias depois da prova, sem presumir o resultado.", grupo: "Provas e estudo", tipos: ["depois_prova"] },
  { id: "simulado_lembrete", titulo: "Simulado: inscri\xE7\xE3o feita", descricao: "Aviso para quem se inscreveu na edi\xE7\xE3o e ainda precisa faz\xEA-la.", grupo: "Provas e estudo", tipos: ["simulado_lembrete"] },
  { id: "simulado_resultado", titulo: "Resultado do simulado", descricao: "A edi\xE7\xE3o encerrou; o resultado j\xE1 pode ser consultado.", grupo: "Provas e estudo", tipos: ["simulado_resultado"] },
  { id: "marco", titulo: "Marco de quest\xF5es", descricao: "100, 250, 500, 1.000 ou 2.000 quest\xF5es respondidas.", grupo: "Acompanhar e celebrar", tipos: ["marco"] },
  { id: "relatorio", titulo: "Resumo de estudo", descricao: "Relat\xF3rios mensais e quinzenais, nas datas devidas.", grupo: "Acompanhar e celebrar", tipos: ["relatorio"] },
  { id: "aniversario", titulo: "Anivers\xE1rio", descricao: "Anivers\xE1rio da pessoa, sem sugest\xE3o de estudo ou de compra.", grupo: "Acompanhar e celebrar", tipos: ["aniversario"] },
  { id: "um_ano", titulo: "Anivers\xE1rio da conta", descricao: "Um ano ou mais de Orto Quest\xF5es.", grupo: "Acompanhar e celebrar", tipos: ["um_ano"] },
  { id: "indicacao_deu_certo", titulo: "Indica\xE7\xE3o deu certo", descricao: "A pessoa indicada alcan\xE7ou o marco necess\xE1rio.", grupo: "Acompanhar e celebrar", tipos: ["indicacao_deu_certo"] },
  { id: "resumo_do_tema", titulo: "Resumo novo do tema", descricao: "Novidade da Biblioteca relacionada ao estudo da pessoa.", grupo: "Provas e estudo", tipos: ["resumo_do_tema"] },
  { id: "convite", titulo: "Conhecer o plano completo", descricao: "J\xE1 usa as quest\xF5es e aceitou receber novidades.", grupo: "Convites", tipos: ["convite_20", "convite_50"] },
  { id: "boas_vindas", titulo: "Primeiros dias de estudo", descricao: "Criou a conta recentemente e j\xE1 come\xE7ou a responder.", grupo: "Acompanhar e celebrar", tipos: ["boas_vindas"] }
];
var cenarioValido = (id) => CENARIOS_HUB.some((c) => c.id === id);
var PRIORIDADE = {
  pix_hoje: 0,
  cartao_recusado: 5,
  vespera_prova: 10,
  simulado_lembrete: 11,
  simulado_resultado: 12,
  relatorio: 20,
  aniversario: 25,
  depois_prova: 26,
  pix_3_dias: 30,
  marco: 45,
  reta_final: 46,
  assinante_parado_7: 50,
  como_estao: 51,
  sumiu: 52,
  pausa: 53,
  comecou_parou: 54,
  acesso_terminou: 55,
  nunca_comecou: 60,
  boas_vindas: 61,
  resumo_do_tema: 70,
  indicacao_deu_certo: 71,
  um_ano: 72,
  convite_50: 90,
  convite_20: 91
};
var diaSP = (hoje = /* @__PURE__ */ new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(hoje);
var intencao = (tipo) => tipo.startsWith("convite") ? "convite" : ["sumiu", "pausa", "comecou_parou", "assinante_parado_7", "como_estao", "voltou"].includes(tipo) ? "retomada" : tipo;
function contaTeste(nome, email) {
  const n = (nome ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
  let hash = 2166136261;
  for (const b of new TextEncoder().encode((email ?? "").trim().toLowerCase())) {
    hash ^= b;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return n.split(" ")[0] === "tales" || ["thales roberto", "valeria godoy"].some((x) => n === x || n.startsWith(x + " ")) || ["d0140159", "9e0ee00a"].includes(hash.toString(16).padStart(8, "0"));
}
function sugestaoPessoal(id, d, hoje = /* @__PURE__ */ new Date(), site2) {
  if (!d.email || contaTeste(d.nome, d.email) || d.administrador || !d.confirmado || d.quer_cartas === false)
    return null;
  const p = perfilDosDados(d), hist = anterioresDosDados(d), e = escolherTipo(p, hist, hoje);
  if (Number(d.respondidas) > 0 && Number(d.respondidas) < 10 && Number(d.dias_conta) >= 2 && Number(d.dias_conta) < 30 && Number(d.dias_parado) >= 2) {
    e.tipo = "comecou_parou";
    e.motivo = "Conta recente: deu os primeiros passos e est\xE1 h\xE1 pelo menos dois dias sem estudar.";
  }
  if (d.assinante && Number(d.respondidas) > 0 && !["marco", "reta_final", "comecou_parou"].includes(e.tipo)) {
    const risco = avaliarRisco(
      {
        ultimaAtividade: d.ultima_atividade ?? null,
        criadoEm: d.criado_em ?? hoje.toISOString(),
        respondidas: Number(d.respondidas),
        respondidas7d: Number(d.semana ?? 0),
        fimSemRenovar: d.renova_sozinho ? null : d.fim_acesso ?? null
      },
      void 0,
      hoje.getTime()
    );
    if (risco.nivel !== "baixo") {
      e.tipo = "como_estao";
      e.motivo = `Risco ${risco.nivel} de parar: ${risco.motivos.join("; ")}.`;
    }
  }
  if (["ativo", "comecando", "obrigado_assinatura"].includes(e.tipo)) return null;
  if (e.tipo === "nunca_comecou" && Number(d.dias_conta ?? 0) < 1) return null;
  if (e.tipo.startsWith("convite") && !d.novidades) return null;
  if (["sumiu", "comecou_parou"].includes(e.tipo) && Number(d.dias_parado ?? 0) > 90) return null;
  const carta = gerarCarta(p, {
    tipo: e.tipo,
    marco: e.marco ?? void 0,
    anteriores: hist,
    hoje,
    site: site2,
    ignorarCadencia: true,
    semente: sementeDe(`${id}:${diaSP(hoje)}`)
  });
  const referencia = e.tipo === "marco" ? `marco:${e.marco}` : e.tipo === "nunca_comecou" ? "nunca_comecou" : `hub:${intencao(e.tipo)}:${diaSP(hoje)}`;
  return {
    chave: `${id}:${referencia}`,
    id_usuario: id,
    nome: d.nome ?? d.email,
    email: d.email,
    tipo: e.tipo,
    categoria: e.tipo === "marco" ? "conquistas" : "cartas",
    tipo_log: e.tipo === "marco" ? "marco" : "carta",
    referencia,
    prioridade: PRIORIDADE[e.tipo] ?? 80,
    motivo: e.motivo,
    assunto: carta.assunto,
    corpo: carta.corpo,
    modelo: carta.modelo,
    versao: carta.versao,
    personalizacao: carta.personalizacao,
    ultimo_envio: hist.find((x) => x.status !== "falhou")?.em ?? null,
    concorrentes: [],
    bloqueio: null,
    fonte: "pessoal"
  };
}
function selecionarHub(candidatas, cenario) {
  const grupos = /* @__PURE__ */ new Map();
  for (const original of candidatas) {
    if (cenario && !CENARIOS_HUB.find((c) => c.id === cenario).tipos.includes(original.tipo)) continue;
    const m = { ...original };
    grupos.set(m.id_usuario, [...grupos.get(m.id_usuario) ?? [], m]);
  }
  const prontas = [], adiadas = [];
  for (const grupo of grupos.values()) {
    grupo.sort((a, b) => a.prioridade - b.prioridade || a.chave.localeCompare(b.chave));
    const principal = grupo.find((m) => !m.bloqueio) ?? grupo[0];
    principal.concorrentes = [...new Set(grupo.filter((m) => m !== principal).map((m) => TIPOS[m.tipo].rotulo))];
    (principal.bloqueio ? adiadas : prontas).push(principal);
  }
  return {
    prontas: prontas.sort((a, b) => a.prioridade - b.prioridade || a.nome.localeCompare(b.nome, "pt-BR")),
    adiadas
  };
}

// supabase/functions/hub-emails/index.ts
var erro = (e) => (e instanceof Error ? e.message : String(e)).slice(0, 300);
async function ler(caminho, init = {}) {
  const r = await banco(caminho, init);
  if (!r.ok) throw new Error(`consulta_falhou:${caminho.split("?")[0]}:${r.status}`);
  return await r.json();
}
var rpc = (nome, args = {}) => ler(`rpc/${nome}`, { method: "POST", body: JSON.stringify(args) });
var gravar = (t, corpo) => ler(t, { method: "PATCH", body: JSON.stringify(corpo) });
var LIMITES = 200;
var TIPO_LEMBRETE = {
  nunca: "nunca_comecou",
  tres_dias: "pausa",
  sete_dias: "sumiu",
  renovacao_pix: "pix_3_dias",
  renovacao_pix_hoje: "pix_hoje"
};
function campanhaDados(t, d) {
  if (t === "simulado_resultado") return { simulado: d };
  if (t === "um_ano") return { anos: Number(d.anos) };
  if (t === "indicacao_deu_certo") return { cortesia: d.cortesia === true };
  if (t === "resumo_do_tema") return { resumo: d };
  if (t === "simulado_lembrete") return { lembrete: d };
  return {};
}
async function preparar(variar, incluirCartao = false) {
  const hoje = /* @__PURE__ */ new Date(), dia = diaSP(hoje), avisos = [];
  const pessoas = await rpc("hub_pessoas");
  if (pessoas.length > 2e3)
    throw new Error(
      "Mais de 2.000 pessoas: ampliar a pagina\xE7\xE3o antes de preparar a rodada; nenhuma sele\xE7\xE3o parcial ser\xE1 enviada."
    );
  const perfis = new Map(pessoas.map((p) => [p.id_usuario, p.dados]));
  const candidatas = [];
  for (const p of pessoas) {
    try {
      const m = sugestaoPessoal(p.id_usuario, p.dados, hoje, site());
      if (m) candidatas.push(m);
    } catch {
      avisos.push(`N\xE3o foi poss\xEDvel escrever a carta de ${p.dados.nome ?? "uma pessoa"}.`);
    }
  }
  try {
    const r = await fetch(`${site()}biblioteca/indice.json`);
    if (!r.ok) throw new Error("catalogo_indisponivel");
    const indice = await r.json();
    if (indice.capitulos?.length)
      await rpc("registrar_catalogo_biblioteca", {
        p_capitulos: indice.capitulos.map(({ id, titulo, especialidade }) => ({ id, titulo, especialidade }))
      });
  } catch {
    avisos.push("N\xE3o foi poss\xEDvel atualizar as novidades da Biblioteca. Confira esse grupo antes de enviar.");
  }
  const fontes = await Promise.all(
    CAMPANHAS_DIARIAS.map(async (t) => {
      const linhas = await rpc(`candidatos_${t}`, { p_limite: LIMITES });
      if (linhas.length === LIMITES)
        avisos.push(
          `${TIPOS[t].rotulo}: janela de ${LIMITES} pessoas atingida; pode haver mais eleg\xEDveis al\xE9m desta rodada.`
        );
      return { t, linhas };
    })
  );
  const lembretes = await Promise.all(
    Object.keys(TIPO_LEMBRETE).map(async (c) => {
      const pix = c.startsWith("renovacao");
      const linhas = await rpc(
        pix ? "destinatarios_renovacao_pix" : "destinatarios_lembrete",
        pix ? { p_etapa: c === "renovacao_pix_hoje" ? "hoje" : "tres_dias", p_limite: 500 } : { p_campanha: c, p_limite: 500 }
      );
      if (linhas.length === 500) avisos.push(`${TIPOS[TIPO_LEMBRETE[c]].rotulo}: janela de 500 pessoas atingida.`);
      return { c, linhas };
    })
  );
  const diaMes = Number(dia.slice(-2)), ano = Number(dia.slice(0, 4)), mes = Number(dia.slice(5, 7));
  const anterior = `${mes === 1 ? ano - 1 : ano}-${String(mes === 1 ? 12 : mes - 1).padStart(2, "0")}`;
  const periodos = [];
  if (diaMes === 1)
    periodos.push({
      fonte: "mensal",
      ref: anterior,
      ids: await rpc("destinatarios_relatorio_mensal", { p_mes: anterior, p_limite: 500 })
    });
  if (diaMes === 1 || diaMes === 16) {
    const ref = diaMes === 16 ? `${dia.slice(0, 7)}-q1` : `${anterior}-q2`;
    periodos.push({
      fonte: "quinzenal",
      ref,
      ids: await rpc("destinatarios_relatorio_quinzenal", { p_ref: ref, p_limite: 500 })
    });
  }
  const faltantes = [
    ...new Set(
      [
        ...fontes.flatMap((x) => x.linhas),
        ...lembretes.flatMap((x) => x.linhas),
        ...periodos.flatMap((x) => x.ids)
      ].map((x) => x.id_usuario)
    )
  ].filter((id) => !perfis.has(id));
  for (let i = 0; i < faltantes.length; i += 12)
    await Promise.all(
      faltantes.slice(i, i + 12).map(async (id) => {
        const p = await rpc("dados_carta_usuario", { p_id: id });
        if (p) perfis.set(id, p);
      })
    );
  const base = (id) => {
    const d = perfis.get(id);
    return d?.email && !contaTeste(d.nome, d.email) && !d.administrador && d.confirmado ? d : null;
  };
  const acrescentar = (id, ref, t, fonte, d, e, origem, categoria = "cartas") => {
    if (!e.corpo) throw new Error("modelo_sem_corpo");
    candidatas.push({
      chave: `${id}:${ref}`,
      id_usuario: id,
      nome: d.nome ?? d.email,
      email: d.email,
      tipo: t,
      referencia: ref,
      fonte,
      origem_dados: origem,
      categoria,
      tipo_log: fonte === "lembrete" ? "lembrete" : t === "relatorio" ? "relatorio" : "carta",
      prioridade: PRIORIDADE[t] ?? 80,
      motivo: TIPOS[t].descricao,
      assunto: e.assunto,
      corpo: e.corpo,
      modelo: e.modelo ?? t,
      versao: e.versao ?? t,
      personalizacao: e.personalizacao ?? [],
      ultimo_envio: anterioresDosDados(d).find((x) => x.status !== "falhou")?.em ?? null,
      concorrentes: [],
      bloqueio: null
    });
  };
  for (const { t, linhas } of fontes)
    for (const l of linhas) {
      const d = base(l.id_usuario);
      if (!d) continue;
      const perfil = perfilDosDados(d), origem = l.dados ?? {};
      if (t === "vespera_prova") perfil.diasParaProva = 1;
      if (typeof origem.prova === "string") perfil.provaCronograma = origem.prova;
      if (t === "assinante_parado_7") perfil.diasParado = Number(origem.dias_fora ?? perfil.diasParado);
      const carta = gerarCarta(perfil, {
        tipo: t,
        anteriores: anterioresDosDados(d),
        hoje,
        site: site(),
        ignorarCadencia: true,
        campanha: campanhaDados(t, origem),
        semente: variar?.chave === `${l.id_usuario}:${l.referencia}` ? variar.semente : sementeDe(`${l.id_usuario}:${l.referencia}:${dia}`)
      });
      acrescentar(l.id_usuario, l.referencia, t, "campanha", d, carta, origem);
    }
  const cartoes = incluirCartao ? await rpc("hub_cartoes_recusados", { p_limite: 200 }) : [];
  if (cartoes.length === 200) avisos.push("Cart\xF5es n\xE3o conclu\xEDdos: janela de 200 pessoas atingida; pode haver mais pessoas al\xE9m desta sele\xE7\xE3o.");
  for (const l of cartoes) {
    const d = base(l.id_usuario);
    if (!d || d.assinante) continue;
    const carta = gerarCarta(perfilDosDados(d), { tipo: "cartao_recusado", anteriores: anterioresDosDados(d), hoje, site: site(), ignorarCadencia: true, semente: sementeDe(l.referencia) });
    acrescentar(l.id_usuario, l.referencia, "cartao_recusado", "pagamento", d, carta, l.dados ?? {});
  }
  for (const { c, linhas } of lembretes)
    for (const l of linhas) {
      const d = base(l.id_usuario);
      if (!d) continue;
      const e = emailLembrete({
        campanha: c,
        nome: d.nome ?? null,
        respondidas: Number(d.respondidas),
        diasFora: Number(l.dias_fora ?? 0),
        diasRestantes: Number(l.dias_restantes ?? 3),
        fimEm: typeof l.fim_periodo === "string" ? l.fim_periodo : null,
        plano: typeof l.plano === "string" ? l.plano : null,
        site: site(),
        linkDescadastro: "",
        perfil: perfilDosDados(d),
        anteriores: [],
        referencia: l.referencia,
        hoje,
        semente: variar?.chave === `${l.id_usuario}:${l.referencia}` ? variar.semente : void 0
      });
      acrescentar(l.id_usuario, l.referencia, TIPO_LEMBRETE[c], "lembrete", d, e, { ...l, campanha: c }, "lembretes");
    }
  for (const p of periodos) {
    if (p.ids.length === 500) avisos.push("Relat\xF3rios: janela de 500 pessoas atingida.");
    for (const { id_usuario: id } of p.ids) {
      const d = base(id);
      if (!d) continue;
      let dados;
      if (p.fonte === "mensal") dados = await rpc("dados_relatorio_mensal", { p_id: id, p_mes: p.ref });
      else {
        const [a, m] = p.ref.split("-").map(Number), q1 = p.ref.endsWith("q1"), inicio = `${p.ref.slice(0, 7)}-${q1 ? "01" : "16"}`, fim = q1 ? `${p.ref.slice(0, 7)}-16` : `${m === 12 ? a + 1 : a}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
        dados = await rpc("dados_relatorio_periodo", { p_id: id, p_inicio: inicio, p_fim: fim, p_ref: p.ref });
      }
      const e = emailRelatorio({
        ...dados,
        site: site(),
        linkDescadastro: "",
        perfil: perfilDosDados(d),
        anteriores: anterioresDosDados(d),
        hoje,
        semente: variar?.chave === `${id}:${p.ref}` ? variar.semente : void 0
      });
      acrescentar(id, p.ref, "relatorio", p.fonte, d, e, {}, "relatorio");
    }
  }
  if (variar) {
    const m = candidatas.find((x) => x.chave === variar.chave);
    if (m && ["pessoal", "pagamento"].includes(m.fonte)) {
      const d = perfis.get(m.id_usuario);
      const c = gerarCarta(perfilDosDados(d), {
        tipo: m.tipo,
        anteriores: anterioresDosDados(d),
        hoje,
        site: site(),
        ignorarCadencia: true,
        semente: variar.semente
      });
      Object.assign(m, { assunto: c.assunto, corpo: c.corpo, versao: c.versao, personalizacao: c.personalizacao });
    }
  }
  const bloqueios = await rpc("hub_avaliar", {
    p_itens: candidatas.map(({ chave, id_usuario, tipo, categoria, referencia }) => ({
      chave,
      id_usuario,
      tipo,
      categoria,
      referencia
    }))
  });
  const porChave = new Map(bloqueios.map((x) => [x.chave, x.bloqueio]));
  for (const m of candidatas)
    m.bloqueio = porChave.has(m.chave) ? porChave.get(m.chave) : "N\xE3o foi poss\xEDvel conferir as regras";
  const deHoje = await ler(`email_rodadas?dia=eq.${dia}&select=id`);
  const enfileiradas = deHoje.length ? await ler(`email_fila?rodada=eq.${deHoje[0].id}&select=id_usuario&limit=2001`) : [];
  if (enfileiradas.length > 2e3) throw new Error("Fila di\xE1ria excedeu o limite de consulta");
  const incluidos = new Set(enfileiradas.map((x) => x.id_usuario));
  for (const m of candidatas) if (incluidos.has(m.id_usuario)) m.bloqueio = "J\xE1 inclu\xEDdo nos envios de hoje";
  return { dia, opcoes: candidatas, ...selecionarHub(candidatas), avisos: [...new Set(avisos)], consultadas: perfis.size };
}
async function estado(rodadaId) {
  const dia = diaSP(), rodadas = await ler(
    "email_rodadas?order=dia.desc&limit=14"
  );
  const rodada = rodadaId ? rodadas.find((r) => r.id === rodadaId) ?? null : rodadas.find((r) => r.dia === dia) ?? null;
  const fila = rodada ? await ler(`email_fila?rodada=eq.${rodada.id}&order=atualizado_em.asc&limit=2000`) : [];
  const inicio = (/* @__PURE__ */ new Date(`${dia}T00:00:00-03:00`)).toISOString();
  const automaticos = await ler(
    `emails_enviados?origem=eq.automatico&enviado_em=gte.${inicio}&select=id,assunto,status,enviado_em,modelo&order=enviado_em.desc&limit=100`
  );
  return { dia, rodada, fila, rodadas, automaticos, worker_ativo: await rpc("hub_worker_ativo") };
}
async function aindaPertinente(m) {
  if (TIPOS_APOSENTADOS.includes(m.tipo)) return false;
  const atual = await rpc("dados_carta_usuario", { p_id: m.id_usuario });
  if (!atual?.email || !atual.confirmado || atual.administrador || contaTeste(atual.nome, atual.email) || atual.email !== m.email)
    return false;
  if (m.fonte === "pagamento") return !atual.assinante && (await rpc("hub_cartoes_recusados", { p_limite: 200 })).some((x) => x.id_usuario === m.id_usuario && x.referencia === m.referencia);
  if (m.fonte === "campanha")
    return (await rpc(`candidatos_${m.tipo}`, { p_limite: LIMITES })).some(
      (x) => x.id_usuario === m.id_usuario && x.referencia === m.referencia
    );
  if (m.fonte === "lembrete") {
    const c = m.origem_dados?.campanha, pix = c.startsWith("renovacao");
    const linhas = await rpc(
      pix ? "destinatarios_renovacao_pix" : "destinatarios_lembrete",
      pix ? { p_etapa: c === "renovacao_pix_hoje" ? "hoje" : "tres_dias", p_limite: 500 } : { p_campanha: c, p_limite: 500 }
    );
    return linhas.some((x) => x.id_usuario === m.id_usuario && x.referencia === m.referencia);
  }
  if (m.fonte === "mensal" || m.fonte === "quinzenal")
    return (await rpc(
      m.fonte === "mensal" ? "destinatarios_relatorio_mensal" : "destinatarios_relatorio_quinzenal",
      m.fonte === "mensal" ? { p_mes: m.referencia, p_limite: 500 } : { p_ref: m.referencia, p_limite: 500 }
    )).some((x) => x.id_usuario === m.id_usuario);
  const nova = sugestaoPessoal(m.id_usuario, atual, /* @__PURE__ */ new Date(), site());
  return nova?.tipo === m.tipo && nova?.referencia === m.referencia;
}
async function processar() {
  if (!emailConfigurado()) return { erro: "email_nao_configurado" };
  const inicio = Date.now();
  let feitos = 0;
  while (Date.now() - inicio < 45e3 && feitos < 40) {
    const [item] = await rpc("hub_proximo");
    if (!item) break;
    const m = item.mensagem;
    let reservado = false, aceito = false;
    try {
      if (TIPOS_APOSENTADOS.includes(m.tipo)) {
        await gravar(`email_fila?id=eq.${item.id}`, { status: "adiado", motivo: "Tipo de e-mail desativado", atualizado_em: (/* @__PURE__ */ new Date()).toISOString() });
        continue;
      }
      const textoAntigo = problemaDeTomCarta(m.assunto + "\n" + m.corpo);
      if (textoAntigo) {
        await gravar(`email_fila?id=eq.${item.id}`, { status: "adiado", motivo: textoAntigo, atualizado_em: (/* @__PURE__ */ new Date()).toISOString() });
        continue;
      }
      if (!await aindaPertinente(m)) {
        await gravar(`email_fila?id=eq.${item.id}`, {
          status: "adiado",
          motivo: "A situa\xE7\xE3o mudou desde a prepara\xE7\xE3o",
          atualizado_em: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      const reserva = await rpc("hub_reservar", { p_fila: item.id });
      if (!reserva.envio_id) continue;
      reservado = true;
      const descadastro = await linkDescadastro(m.id_usuario, m.categoria);
      const e = renderizarCarta({ assunto: m.assunto, corpo: m.corpo, descadastro });
      await enviarEmail(m.email, e.assunto, e.html, e.texto, descadastro, void 0, void 0, `hub/${item.id}`);
      aceito = true;
      await gravar(`emails_enviados?id=eq.${reserva.envio_id}`, { status: "enviado" });
      await gravar(`email_fila?id=eq.${item.id}`, {
        status: "enviado",
        motivo: null,
        atualizado_em: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (m.tipo === "simulado_lembrete")
        await rpc("sn_marcar_lembrete", { p_edicao: m.origem_dados?.edicao, p_usuario: m.id_usuario }).catch(() => null);
    } catch (e) {
      const explicito = /envio_recusado_4\d\d/.test(erro(e)), status = aceito || reservado && !explicito ? "incerto" : "falhou";
      await gravar(`email_fila?id=eq.${item.id}`, {
        status,
        motivo: erro(e),
        atualizado_em: (/* @__PURE__ */ new Date()).toISOString()
      }).catch(() => null);
      if (explicito && reservado) {
        const [atual] = await ler(`email_fila?id=eq.${item.id}`);
        if (atual?.envio_id)
          await gravar(`emails_enviados?id=eq.${atual.envio_id}`, { status: "falhou", erro: erro(e) }).catch(() => null);
      }
      if (/envio_recusado_(429|401|403)/.test(erro(e))) {
        await gravar(`email_rodadas?id=eq.${item.rodada}`, { status: "pausada" });
        break;
      }
    }
    feitos++;
    await new Promise((r) => setTimeout(r, 650));
  }
  const ativas = await ler("email_rodadas?status=eq.ativa&select=id");
  for (const r of ativas) await rpc("hub_concluir", { p_rodada: r.id });
  return { processados: feitos };
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json({ erro: "metodo_invalido" }, 405, req);
  try {
    const p = await req.json();
    if (p.acao === "processar") {
      const esperado = Deno.env.get("EMAIL_SEGREDO") ?? "", recebido = req.headers.get("x-segredo") ?? "";
      const legado = !!esperado && esperado === recebido;
      const agendador = !legado && /^[a-f0-9]{64}$/.test(recebido) ? await rpc("hub_autenticar_processador", { p_segredo: recebido }).catch(() => false) : false;
      if (!legado && !agendador) return json({ erro: "acesso_negado" }, 403, req);
      return json(await processar(), 200, req);
    }
    const u = await usuarioDoPedido(req);
    const adm = await ler(`administradores?id_usuario=eq.${u.id}&select=id_usuario`);
    if (!adm.length) return json({ erro: "acesso_negado" }, 403, req);
    if (p.acao === "estado") {
      const atual = await estado(p.rodada);
      if (p.versao !== 2 && atual.fila.some((x) => x.mensagem.tipo === "cartao_recusado")) return json({ erro: "Atualize a p\xE1gina para ver os novos cen\xE1rios de e-mail." }, 409, req);
      return json(atual, 200, req);
    }
    if (p.acao === "preparar")
      return json(
        await preparar(p.chave ? { chave: p.chave, semente: Number(p.semente) || Date.now() } : void 0, p.versao === 2),
        200,
        req
      );
    if (p.acao === "iniciar") {
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      if (!await rpc("hub_worker_ativo"))
        return json({ erro: "O processador da fila precisa estar ativo antes de iniciar uma rodada." }, 503, req);
      const atual = await estado();
      if (!Array.isArray(p.itens) || !p.itens.length || p.itens.length > 2e3)
        return json({ erro: "selecao_invalida" }, 400, req);
      if (p.cenario !== void 0 && !cenarioValido(p.cenario)) return json({ erro: "cenario_invalido" }, 400, req);
      if (atual.rodada && p.itens.every((i) => atual.fila.some((f) => f.mensagem.chave === i.chave))) return json(atual, 200, req);
      const previa = await preparar(void 0, p.versao === 2), selecao = selecionarHub(previa.opcoes, p.cenario), mapa = new Map(selecao.prontas.map((x) => [x.chave, x])), vistos = /* @__PURE__ */ new Set(), itens = [];
      for (const i of p.itens) {
        const m = mapa.get(i.chave);
        if (!m || vistos.has(m.id_usuario))
          return json({ erro: "A sele\xE7\xE3o mudou. Atualize a rodada antes de enviar." }, 409, req);
        const assunto = i.assunto?.trim() ?? m.assunto, corpo = i.corpo?.trim() ?? m.corpo;
        const textoAntigo = problemaDeTomCarta(assunto + "\n" + corpo);
        if (textoAntigo) return json({ erro: textoAntigo }, 409, req);
        if (!assunto || assunto.length > 120 || !corpo || corpo.length > 6e3 || problemaGrave(assunto + "\n" + corpo))
          return json({ erro: "texto_invalido" }, 400, req);
        vistos.add(m.id_usuario);
        itens.push({
          ...m,
          assunto,
          corpo,
          versao: assunto !== m.assunto || corpo !== m.corpo ? `${m.modelo}#editada` : m.versao
        });
      }
      await rpc("hub_iniciar", {
        p_admin: u.id,
        p_itens: itens,
        p_resumo: {
          cenario: p.cenario ?? "todos",
          consultadas: previa.consultadas,
          avisos: previa.avisos,
          excluidas: [
            ...selecao.adiadas.map((m) => ({ nome: m.nome, motivo: m.bloqueio })),
            ...selecao.prontas.filter((m) => !vistos.has(m.id_usuario)).map((m) => ({ nome: m.nome, motivo: "Pulado pelo administrador" }))
          ]
        }
      });
      EdgeRuntime.waitUntil(processar().catch(console.error));
      return json(await estado(), 200, req);
    }
    if (p.acao === "repetir") {
      if (!p.id || !/^[0-9a-f-]{36}$/.test(p.id)) return json({ erro: "rodada_invalida" }, 400, req);
      await rpc("hub_repetir", { p_rodada: p.id });
      EdgeRuntime.waitUntil(processar().catch(console.error));
      return json(await estado(), 200, req);
    }
    if (p.acao === "pausar" || p.acao === "retomar") {
      if (!p.id || !/^[0-9a-f-]{36}$/.test(p.id)) return json({ erro: "rodada_invalida" }, 400, req);
      await gravar(`email_rodadas?id=eq.${p.id}&dia=eq.${diaSP()}&status=in.(ativa,pausada)`, {
        status: p.acao === "pausar" ? "pausada" : "ativa"
      });
      if (p.acao === "retomar") EdgeRuntime.waitUntil(processar().catch(console.error));
      return json(await estado(), 200, req);
    }
    return json({ erro: "acao_invalida" }, 400, req);
  } catch (e) {
    return json({ erro: erro(e) }, erro(e) === "autenticacao_necessaria" ? 401 : 500, req);
  }
});

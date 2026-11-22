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

// supabase/functions/_shared/cartas-prova.ts
var numero = (n) => n.toLocaleString("pt-BR");
var COMPARAR = "Refa\xE7a duas quest\xF5es e, antes de ler o coment\xE1rio, escreva por que descartaria a alternativa que quase marcou.";
var APRENDER_O_ERRO = "Escolha algumas quest\xF5es que errou, escreva em uma frase o que mudava a resposta e teste essa ideia em uma quest\xE3o parecida.";
var SO_O_ESSENCIAL = "Releia s\xF3 os coment\xE1rios que esclarecem d\xFAvidas conhecidas. Uma revis\xE3o curta hoje j\xE1 \xE9 suficiente.";
var DICAS_POR_TEMA = {
  "conceitos-basicos": "Pegue duas quest\xF5es que confundem termos parecidos. Tente explicar em uma frase o que distingue um conceito do outro antes de conferir o coment\xE1rio.",
  tumores: "Nas quest\xF5es que voc\xEA errou, anote o detalhe do enunciado que mudava a hip\xF3tese. Compare com a alternativa que voc\xEA marcou.",
  trauma: "Ao refazer as quest\xF5es, veja se a d\xFAvida estava em reconhecer a les\xE3o ou em escolher a conduta. Essa diferen\xE7a ajuda a decidir o que ler no coment\xE1rio.",
  coluna: "Nas quest\xF5es que quase acertou, sublinhe o achado que pesou mais para escolher a resposta e compare com a explica\xE7\xE3o do coment\xE1rio.",
  mao: "Ao rever os erros, desenhe para voc\xEA o trajeto ou a rela\xE7\xE3o anat\xF4mica que a quest\xE3o pede. Depois confira como esse detalhe muda a resposta.",
  pediatria: "Ao comparar duas quest\xF5es parecidas, anote se foi a idade, o exame ou outro detalhe do enunciado que mudou a resposta.",
  joelho: "Refa\xE7a algumas quest\xF5es e veja se o erro veio da leitura do exame ou de uma d\xFAvida de conduta. Revise primeiro o que mais se repetir."
};
function prazo(c, vespera) {
  if (vespera) return `Amanh\xE3 voc\xEA faz ${c.nomeProva}`;
  if (c.diasProva === null || c.diasProva <= 0) return `Com ${c.nomeProva} chegando`;
  const dias2 = c.diasProva === 1 ? "um dia" : `${numero(c.diasProva)} dias`;
  return `Falta${c.diasProva === 1 ? "" : "m"} ${dias2} para ${c.nomeProva}`;
}
function percurso(c, pct, variante, vespera) {
  if (!c.r) return "Se quiser fazer um primeiro treino, escolha um assunto familiar e resolva algumas quest\xF5es comentadas. Isso j\xE1 pode mostrar o que vale rever.";
  if (!c.dez) return "Vi que voc\xEA j\xE1 come\xE7ou pelas quest\xF5es. Escolha um coment\xE1rio que te ajudou e tente explicar, sem olhar, o que fez aquela alternativa ser a certa.";
  if (pct === null) return variante % 2 ? `Voc\xEA j\xE1 respondeu ${c.q} por aqui. Mesmo no come\xE7o, j\xE1 d\xE1 para escolher a pr\xF3xima leitura pelo que te deixou em d\xFAvida nessas quest\xF5es.` : `Foram ${c.q} at\xE9 aqui. Obrigado por separar esse tempo para estudar com a gente. Conforme voc\xEA fizer mais quest\xF5es, fica mais f\xE1cil comparar os resultados por tema.`;
  const dado = [
    `Vi que voc\xEA j\xE1 respondeu ${c.q} no Orto Quest\xF5es e est\xE1 com ${pct}% de acertos no hist\xF3rico.`,
    `No seu hist\xF3rico, vi que foram ${c.q} e ${pct}% de acertos at\xE9 aqui.`,
    `Voc\xEA j\xE1 resolveu ${c.q} por aqui. No seu hist\xF3rico, o acerto est\xE1 em ${pct}%.`,
    `Quero reconhecer o caminho que voc\xEA j\xE1 percorreu. Foram ${c.q}, com ${pct}% de acertos.`,
    `Passei pelos seus n\xFAmeros de estudo. Voc\xEA j\xE1 fez ${c.q} e est\xE1 em ${pct}% de acertos.`,
    `Voc\xEA j\xE1 reservou tempo para responder ${c.q} no site. O acerto registrado no seu estudo foi de ${pct}%.`
  ][variante];
  if (vespera) return `${dado} ${pct < 55 ? "Tem muito estudo por tr\xE1s desse n\xFAmero. Para hoje, eu usaria esse hist\xF3rico para separar uma d\xFAvida que ainda cabe rever." : pct < 70 ? "J\xE1 tem bastante coisa aprendida a\xED. Eu encerraria a revis\xE3o com uma pergunta que te ajude a lembrar o racioc\xEDnio de um tema conhecido." : "\xC9 um bom resultado para reconhecer antes de fechar o material. Hoje vale relembrar s\xF3 o que ainda te faz hesitar."}`;
  const leituras = pct < 55 ? [
    "Chegar a esse volume j\xE1 \xE9 um trabalho e tanto. D\xE1 para usar as d\xFAvidas que aparecem no hist\xF3rico para escolher o que vale rever em sess\xF5es curtas.",
    "Tem dedica\xE7\xE3o por tr\xE1s desse n\xFAmero. O que mais pode ajudar agora \xE9 voltar \xE0s quest\xF5es que trouxeram a mesma d\xFAvida mais de uma vez.",
    "Voc\xEA j\xE1 tem perguntas suficientes para escolher onde concentrar a revis\xE3o. Eu separaria um tema pequeno e mediria o avan\xE7o pela clareza na hora de explicar as respostas."
  ] : pct < 70 ? [
    "J\xE1 tem bastante coisa a\xED que voc\xEA aprendeu. Agora vale olhar com calma as quest\xF5es em que ficou entre duas alternativas, porque elas costumam mostrar bem o que falta esclarecer.",
    "Voc\xEA j\xE1 ganhou bastante pr\xE1tica. Agora vale ver se a dificuldade se repete em algum tipo de enunciado. Isso ajuda a escolher o pr\xF3ximo treino.",
    "Voc\xEA j\xE1 tem de onde partir. Escolha um erro que consiga explicar hoje e outro que ainda ficou sem entender. \xC9 no segundo que eu investiria um pouco mais de tempo."
  ] : pct < 85 ? [
    "\xC9 um bom resultado. A reta final \xE9 uma oportunidade de testar se o racioc\xEDnio funciona tamb\xE9m quando os temas se misturam.",
    "\xC9 um bom resultado. Para continuar avan\xE7ando, volte \xE0s perguntas em que ficou entre duas alternativas e veja qual detalhe deveria ter decidido a resposta.",
    "\xC9 um bom acerto para levar para uma sess\xE3o com temas misturados. Assim d\xE1 para ver se identifica o assunto mesmo quando ele vem no meio de outros."
  ] : [
    "\xC9 um resultado muito bom. Nesta altura, vale voltar tamb\xE9m \xE0s quest\xF5es que acertou com d\xFAvida. Elas mostram os detalhes que ainda vale confirmar.",
    "\xC9 um \xF3timo acerto. Eu reservaria um pouco do tempo que resta para as decis\xF5es dif\xEDceis, aquelas em que duas alternativas parecem defens\xE1veis.",
    "Que bom ver esse resultado. Eu manteria contato com os temas em que est\xE1 bem e escolheria alguns erros pontuais para revisar."
  ];
  return `${dado} ${leituras[[0, 1, 2, 2, 0, 1][variante]]}${!c.fatos.ranking && pct >= 70 ? " Parab\xE9ns por esse trabalho." : ""}`;
}
function pontoForte(c, pct, variante) {
  const area = c.fatos.melhorArea;
  if (!area || pct === null) return null;
  c.usados.add("melhorArea");
  const nome = c.area(area.slug).em;
  if (area.pct >= 70) return [
    `Foi bom ver o seu resultado em ${nome}. Voc\xEA resolveu ${numero(area.total)} quest\xF5es da \xE1rea e acertou ${area.pct}%. D\xE1 para ver que seu estudo rendeu ali.`,
    `O resultado que mais me chamou aten\xE7\xE3o foi em ${nome}, com ${area.pct}% de acerto em ${numero(area.total)} quest\xF5es. Vale levar para outros assuntos o que funcionou nesse estudo.`,
    `E tem um assunto que j\xE1 est\xE1 bem encaminhado. Em ${nome}, foram ${numero(area.total)} quest\xF5es com ${area.pct}% de acertos. Vale manter esse tema fresco na mem\xF3ria.`
  ][[0, 1, 2, 1, 2, 0][variante]];
  return `Entre as \xE1reas em que j\xE1 d\xE1 para comparar o seu desempenho, ${nome} saiu na frente, com ${area.pct}% em ${numero(area.total)} quest\xF5es. \xC9 um assunto em que voc\xEA j\xE1 tem por onde continuar.`;
}
function focoDaRevisao(c, vespera, variante, alternativa) {
  const area = c.fatos.areaFraca;
  if (!area) return alternativa;
  c.usados.add("areaFraca");
  const nome = c.area(area.slug).em;
  const dado = [
    `Para a pr\xF3xima revis\xE3o, eu come\xE7aria por ${nome}. Vi ${area.pct}% de acerto em ${numero(area.total)} quest\xF5es desse assunto. \xC9 a \xE1rea a que eu daria mais aten\xE7\xE3o agora.`,
    `Se eu fosse escolher onde concentrar a pr\xF3xima revis\xE3o, come\xE7aria por ${nome}. Foram ${numero(area.total)} quest\xF5es, com ${area.pct}% de acertos.`,
    `Eu reservaria um tempo para ${nome}. Vi ${area.pct}% de acerto nas ${numero(area.total)} quest\xF5es que fez nesse assunto. A\xED est\xE1 um bom ponto para come\xE7ar a revis\xE3o.`
  ][[0, 1, 2, 2, 0, 1][variante]];
  const dica = vespera ? [
    "Para hoje, eu escolheria s\xF3 dois erros conhecidos desse tema e releria os coment\xE1rios.",
    "Hoje, basta retomar uma anota\xE7\xE3o sua ou um coment\xE1rio que j\xE1 te fez entender por que a resposta mudava.",
    "Deixe esse repasse bem curto. Ao reler uma pergunta, tente recuperar o racioc\xEDnio antes de conferir a resposta."
  ][variante % 3] : variante % 2 === 0 ? DICAS_POR_TEMA[area.slug] ?? APRENDER_O_ERRO : alternativa;
  return `${dado} ${dica}`;
}
function ranking(c, variante) {
  if (!c.fatos.ranking) return null;
  c.usados.add("ranking");
  const posicao = `${c.fatos.ranking}\xAA posi\xE7\xE3o no ranking geral`;
  return [
    `Ah, e vi tamb\xE9m a sua ${posicao}. Fico contente de ver o quanto voc\xEA vem se dedicando. Parab\xE9ns.`,
    `Vi tamb\xE9m sua ${posicao}. Parab\xE9ns, de verdade, pelo tempo que voc\xEA tem colocado no estudo.`,
    `E parab\xE9ns pela ${posicao}. \xC9 uma conquista que merece ser comemorada.`
  ][variante % 3];
}
var RETA_FINAL = [
  {
    assunto: "o que eu revisaria at\xE9 a prova",
    abrir: (data) => `${data}. Passei para dividir uma ideia de revis\xE3o que caiba nesse tempo.`,
    revisar: "Se for dif\xEDcil escolher um assunto para revisar, comece por uma quest\xE3o que errou mais de uma vez. Entender aquele erro j\xE1 d\xE1 um rumo para a pr\xF3xima sess\xE3o.",
    encerrar: "Obrigado por deixar o Orto Quest\xF5es fazer parte da sua prepara\xE7\xE3o. Boa sorte na prova. Vou torcer para voc\xEA conseguir p\xF4r em pr\xE1tica o que estudou."
  },
  {
    assunto: "o que seu estudo j\xE1 mostra",
    abrir: (data) => `${data}. Antes de pensar em mais uma lista de quest\xF5es, achei que valia compartilhar um pouco do que voc\xEA j\xE1 fez por aqui.`,
    revisar: "Volte a uma quest\xE3o que exigiu uma segunda leitura do enunciado e compare com uma quest\xE3o parecida. Veja qual palavra ou achado muda a resposta.",
    encerrar: "Obrigado por estudar com a gente at\xE9 aqui. Desejo uma prova tranquila e uma boa oportunidade de mostrar o que aprendeu."
  },
  {
    assunto: "uma ideia para o pr\xF3ximo treino",
    abrir: (data) => `${data}. Na reta final, d\xE1 um al\xEDvio quando a pr\xF3xima sess\xE3o j\xE1 tem um objetivo. Queria te ajudar a escolher um.`,
    revisar: COMPARAR,
    encerrar: "Boa prova. Obrigado pela confian\xE7a durante a prepara\xE7\xE3o. Espero que o estudo que voc\xEA fez aqui te acompanhe na hora de decidir entre duas alternativas."
  },
  {
    assunto: "sua prepara\xE7\xE3o at\xE9 aqui",
    abrir: (data) => `${data}. Queria te escrever antes da prova. Tem bastante valor em parar um momento para ver o que j\xE1 ficou mais claro e o que ainda cabe revisar.`,
    revisar: "Experimente uma sess\xE3o curta com tempo marcado. Quando terminar, retome as perguntas em que a leitura levou mais tempo e veja o que poderia identificar logo de in\xEDcio.",
    encerrar: "Obrigado por trazer o Orto Quest\xF5es para o seu estudo. Desejo sorte, tranquilidade e muito sucesso no dia da prova."
  },
  {
    assunto: "para aproveitar a reta final",
    abrir: (data) => `${data}. Achei que valia olhar para o seu estudo at\xE9 aqui e pensar no que ainda cabe revisar antes da prova.`,
    revisar: APRENDER_O_ERRO,
    encerrar: "Obrigado por ter estudado com a gente. Espero que chegue \xE0 prova com calma para lembrar do que voc\xEA j\xE1 sabe. Boa sorte."
  },
  {
    assunto: "um recado antes da prova",
    abrir: (data) => `${data}. Passei por aqui para te desejar sucesso e deixar uma sugest\xE3o de revis\xE3o que caiba nesses \xFAltimos dias.`,
    revisar: "Abra a Revis\xE3o e escolha quest\xF5es com d\xFAvidas de naturezas diferentes. Separe o que foi dificuldade de conte\xFAdo do que se resolveu ao ler o enunciado com mais aten\xE7\xE3o.",
    encerrar: "Foi bom acompanhar um pouco dessa caminhada pelo Orto Quest\xF5es. Obrigado pela confian\xE7a. Tor\xE7o para que d\xEA tudo certo na prova."
  }
];
var VESPERA = [
  {
    assunto: "boa prova amanh\xE3",
    abrir: (data) => `${data}. Queria te desejar boa sorte antes que o dia fique cheio de preparativos.`,
    revisar: SO_O_ESSENCIAL,
    encerrar: "Muito obrigado por estudar com a gente. Boa prova amanh\xE3. Na hora, leia com calma o que cada pergunta est\xE1 pedindo. Espero que consiga mostrar o que aprendeu."
  },
  {
    assunto: "um recado para amanh\xE3",
    abrir: (data) => `${data}. Hoje quis passar para agradecer pelo estudo que voc\xEA compartilhou com a gente e deixar uma ideia breve de revis\xE3o.`,
    revisar: "Se for abrir a Revis\xE3o, procure uma quest\xE3o cujo coment\xE1rio te ajudou a destravar um assunto. Recordar esse racioc\xEDnio pode ser mais \xFAtil hoje do que abrir material novo.",
    encerrar: "Que amanh\xE3 voc\xEA encontre tranquilidade para resolver uma quest\xE3o de cada vez. Obrigado por contar com o Orto Quest\xF5es. Boa prova."
  },
  {
    assunto: "o que vale rever hoje",
    abrir: (data) => `${data}. Na v\xE9spera, eu escolheria com cuidado o que vale abrir e deixaria o restante do tempo livre para os preparativos.`,
    revisar: COMPARAR,
    encerrar: "Quando fechar a revis\xE3o, vale conferir o local, o hor\xE1rio e o documento da prova. Estou torcendo por voc\xEA. Obrigado pela confian\xE7a."
  },
  {
    assunto: "seu estudo antes da prova",
    abrir: (data) => `${data}. Antes de desejar boa prova, queria reconhecer o que voc\xEA j\xE1 fez at\xE9 aqui.`,
    revisar: "Se quiser repassar alguma coisa, pegue suas anota\xE7\xF5es e escolha uma d\xFAvida que voc\xEA j\xE1 resolveu. Tente lembrar qual detalhe fez a resposta ficar clara.",
    encerrar: "Obrigado por estudar com a gente. Espero que amanh\xE3 voc\xEA consiga ler com calma, confiar no seu racioc\xEDnio e mostrar o que aprendeu."
  },
  {
    assunto: "faltando um dia para a prova",
    abrir: (data) => `${data}. Se ainda for estudar hoje, deixo uma sugest\xE3o que d\xE1 para p\xF4r em pr\xE1tica em poucos minutos.`,
    revisar: "Escolha um coment\xE1rio que voc\xEA j\xE1 leu e tente recuperar a ideia central sem olhar. Em seguida, confira o que faltou lembrar e siga com o resto do dia.",
    encerrar: "Boa sorte amanh\xE3. Foi muito bom fazer parte da sua prepara\xE7\xE3o. Desejo que voc\xEA tenha uma boa prova."
  },
  {
    assunto: "para fechar a revis\xE3o de hoje",
    abrir: (data) => `${data}. Queria te lembrar de um jeito simples de aproveitar a \xFAltima revis\xE3o e te desejar sucesso.`,
    revisar: "Para encerrar por hoje, escolha algumas perguntas conhecidas e releia a explica\xE7\xE3o das alternativas que te deixaram em d\xFAvida.",
    encerrar: "Quando terminar, confira os detalhes da prova e deixe o que precisa levar separado. Obrigado pelo carinho com o Orto Quest\xF5es. Boa prova."
  }
];
function cartasDeProva(vespera) {
  const roteiros = vespera ? VESPERA : RETA_FINAL;
  return roteiros.map((r, i) => ({
    id: `v${61 + i}`,
    assuntos: (c) => [c.nome ? `${c.nome}, ${r.assunto}` : r.assunto[0].toUpperCase() + r.assunto.slice(1)],
    saudacao: (c) => c.nome ? `Oi, ${c.nome},` : "Oi,",
    corpo: (c) => {
      const pct = c.pctProva;
      const data = prazo(c, vespera);
      const abertura = data.startsWith("Com ") ? `${data}, quis passar para te desejar uma boa prova e sugerir um caminho para a revis\xE3o.` : r.abrir(data);
      const oi = percurso(c, pct, i, vespera);
      const bom = pontoForte(c, pct, i);
      const rever = c.r > 0 ? focoDaRevisao(c, vespera, i, r.revisar) : null;
      const resultado = i === 2 || i === 5 ? [oi, rever, bom] : [oi, bom, rever];
      return [
        abertura,
        ...resultado,
        ranking(c, i),
        c.r ? `Deixo o link da sua Revis\xE3o aqui. ${c.link("revisao")}` : `Para fazer um treino curto, voc\xEA pode come\xE7ar aqui. ${c.link("treinar")}`,
        r.encerrar
      ];
    }
  }));
}

// supabase/functions/_shared/cartas-versoes.ts
var N = (n) => Math.round(n).toLocaleString("pt-BR");
var Q = (n) => n >= 10 ? `${N(n)} quest\xF5es` : "algumas quest\xF5es";
var dataCurta = (iso) => iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }) : null;
var nm = (c, texto, semNome = texto.charAt(0).toUpperCase() + texto.slice(1)) => c.nome ? `${c.nome}, ${texto}` : semNome;
var ajuda = (c) => c.um("Se precisar de ajuda com o site, basta responder este e-mail.", "Pode responder por aqui se encontrar alguma dificuldade no site.", "Se tiver alguma d\xFAvida para usar esse recurso, pode me chamar por aqui.");
function dicaCronograma(c, i = 0) {
  const guia = [
    "Se j\xE1 sabe a data da prova, d\xE1 para usar o Cronograma para poupar o tempo de montar uma lista a cada dia.",
    "Uma coisa que ajuda quando o tempo \xE9 curto \xE9 sentar e j\xE1 saber o que fazer. \xC9 para isso que serve o Cronograma.",
    "Se montar o plano de estudo est\xE1 tomando tempo, vale passar pelo Cronograma."
  ][i % 3];
  return c.p.assinante ? `${guia} Informe a data e o tempo que tem na semana. Ele organiza o que fazer em cada dia e j\xE1 encaixa as revis\xF5es, para voc\xEA poder ir direto \xE0s quest\xF5es.` : `${guia} A demonstra\xE7\xE3o mostra como as quest\xF5es e as revis\xF5es cabem nos dias dispon\xEDveis. Com a assinatura, d\xE1 para montar e salvar um plano pr\xF3prio.`;
}
var acesso = (c) => c.um("Seu hist\xF3rico de estudo e suas anota\xE7\xF5es continuam salvos na conta.", "As quest\xF5es respondidas e as revis\xF5es ficam guardadas no seu hist\xF3rico.", "Seu progresso permanece salvo para continuar de onde parou.");
var saudacaoEstudo = (c) => c.nome ? `Oi, ${c.nome},` : "Oi,";
var COMECO = [
  {
    assunto: "uma ideia para o primeiro treino",
    novo: "Quando abrir Treinar, escolha um assunto familiar e fa\xE7a algumas quest\xF5es. Depois, pegue a que mais te deixou em d\xFAvida e leia a explica\xE7\xE3o das alternativas com calma.",
    fez: "Voc\xEA j\xE1 fez suas primeiras quest\xF5es aqui. Se tiver alguns minutos hoje, volte \xE0quela em que duas alternativas pareciam poss\xEDveis e veja o que fez uma delas sair na frente.",
    rota: "treinar"
  },
  {
    assunto: "por onde d\xE1 para come\xE7ar",
    novo: "Comece por um assunto que voc\xEA gostaria de entender melhor. Depois de responder, leia por que as alternativas que pareciam boas tamb\xE9m foram descartadas. \xC9 a\xED que muita d\xFAvida se resolve.",
    fez: "Seu primeiro treino j\xE1 ficou salvo. Vale escolher uma pergunta que voc\xEA errou e ler a explica\xE7\xE3o antes de resolver outra parecida. Assim voc\xEA consegue testar o que entendeu.",
    rota: "treinar"
  },
  {
    assunto: "como o Cronograma ajuda na semana",
    novo: "Se estiver com pouco tempo hoje, escolha um tema em Treinar e resolva algumas perguntas. Reserve uns minutos para olhar o coment\xE1rio da que mais te fez pensar.",
    fez: "J\xE1 vi que voc\xEA come\xE7ou pelas quest\xF5es. No pr\xF3ximo treino, volte a uma explica\xE7\xE3o que te ajudou e tente lembrar a ideia principal antes de reler.",
    rota: "cronograma"
  },
  {
    assunto: "um jeito de estudar pelos coment\xE1rios",
    novo: "Na primeira sess\xE3o, recomendo responder primeiro e olhar o coment\xE1rio depois. Tente guardar uma frase sobre o que levou \xE0 resposta certa. Essa frase pode te ajudar quando o assunto aparecer de novo.",
    fez: "Para aproveitar o primeiro treino, escolha uma quest\xE3o que trouxe d\xFAvida. Tente explicar em voz baixa por que as duas alternativas mais parecidas t\xEAm respostas diferentes.",
    rota: "treinar"
  },
  {
    assunto: "uma sess\xE3o curta para come\xE7ar",
    novo: "Escolha um assunto s\xF3. Responda algumas quest\xF5es em Treinar e marque para rever o que ainda quer entender melhor. D\xE1 para come\xE7ar com uma sess\xE3o bem curta.",
    fez: "Voc\xEA j\xE1 come\xE7ou a estudar com a gente. Para a pr\xF3xima sess\xE3o, separe o que quer rever e escolha um assunto s\xF3. Assim fica f\xE1cil enxergar o que ficou mais claro de um treino para o outro.",
    rota: "treinar"
  },
  {
    assunto: "para organizar os pr\xF3ximos estudos",
    novo: "Se preferir conhecer o site antes de planejar a semana, fa\xE7a algumas quest\xF5es de um tema de que gosta. Leia o coment\xE1rio de pelo menos uma em que ficou entre duas respostas.",
    fez: "Voc\xEA j\xE1 come\xE7ou pelas quest\xF5es. Agora d\xE1 para usar esse primeiro treino para decidir o que revisar e o que deixar para mais adiante.",
    rota: "cronograma"
  }
];
var AGRADECIMENTOS = [
  "Que bom ter voc\xEA por aqui. Obrigado por escolher o Orto Quest\xF5es para estudar.",
  "Obrigado por abrir sua conta. Queria te dar as boas-vindas e deixar uma dica que d\xE1 para testar j\xE1 no primeiro dia.",
  "Obrigado por trazer o Orto Quest\xF5es para o seu estudo. Separei uma ideia para a pr\xF3xima vez que voc\xEA tiver um tempo para estudar."
];
function primeirosPassos(c, i, primeiroDia) {
  const roteiro = COMECO[i];
  const rota = roteiro.rota;
  return [
    primeiroDia ? AGRADECIMENTOS[i % 3] : c.um(
      "Obrigado por ter criado sua conta. Queria te deixar uma ideia para quando quiser experimentar as quest\xF5es.",
      "Passei para deixar uma sugest\xE3o de primeiro treino. Que bom que voc\xEA veio conhecer o Orto Quest\xF5es.",
      "Se estiver procurando por onde come\xE7ar, eu separaria um assunto e faria uma sess\xE3o curta."
    ),
    c.r === 0 ? roteiro.novo : roteiro.fez,
    dicaCronograma(c, i),
    rota === "cronograma" ? `Aqui est\xE1 o Cronograma: ${c.link(rota)}` : `Aqui \xE9 onde voc\xEA escolhe o assunto e come\xE7a a treinar: ${c.link(rota)}`,
    c.um(
      "Se quiser ajuda para escolher por onde come\xE7ar, me escreva por aqui. Vou ficar contente em ajudar.",
      "Se alguma coisa ficar confusa no primeiro treino, pode responder a este e-mail e me contar.",
      "Desejo um bom come\xE7o de estudo. Se surgir alguma d\xFAvida com o site, pode me escrever por aqui."
    )
  ];
}
var boasVindas = /* @__PURE__ */ COMECO.map((r, i) => ({
  id: `v${61 + i}`,
  assuntos: (c) => [nm(c, r.assunto)],
  saudacao: saudacaoEstudo,
  corpo: (c) => primeirosPassos(c, i, true)
}));
var nunca = () => COMECO.map((r, i) => ({
  id: `v${61 + i}`,
  assuntos: (c) => [nm(c, r.assunto)],
  saudacao: saudacaoEstudo,
  corpo: (c) => primeirosPassos(c, i, false)
}));
var incentivo = (c) => c.um(
  "Para o pr\xF3ximo treino, eu escolheria uma quest\xE3o cujo coment\xE1rio mudou a forma como voc\xEA pensava no assunto. Refa\xE7a a pergunta e veja se a ideia ficou.",
  "Se um erro ainda parece dif\xEDcil de explicar, vale come\xE7ar por ele. Leia o coment\xE1rio e procure outra pergunta que cobre o mesmo ponto.",
  "Quando tiver alguns minutos, volte a duas quest\xF5es de um mesmo assunto. Tente dizer o que as duas t\xEAm em comum antes de conferir o coment\xE1rio."
);
function proximoPasso(c) {
  const pct = c.pctBom;
  const meta = pct !== null && pct < 95 ? pct < 90 ? (Math.floor(pct / 10) + 1) * 10 : 95 : null;
  const leitura = pct === null ? c.um(incentivo(c), "O pr\xF3ximo treino pode ser pequeno. Escolha um assunto que j\xE1 viu e compare duas perguntas que pareciam cobrar a mesma coisa.") : c.um(
    `Vi que seu acerto chegou a ${pct}%. ${c.fatos.ranking ? "\xC9 um bom resultado para ter em mente." : "Parab\xE9ns pelo estudo que voc\xEA j\xE1 fez."} ${meta === null ? "Eu usaria o pr\xF3ximo treino para confirmar as respostas que ainda escolhe com alguma d\xFAvida." : `Se ${meta}% fizer sentido como pr\xF3xima meta, vale come\xE7ar pelas d\xFAvidas que aparecem mais de uma vez. \xC9 um bom jeito de escolher o que revisar.`}`,
    `Voc\xEA est\xE1 com ${pct}% de acertos. ${meta === null ? "Para o pr\xF3ximo treino" : `Para buscar os ${meta}% aos poucos`}, experimente rever as quest\xF5es em que ficou entre duas alternativas e escreva o que deveria desempatar a escolha.`,
    `Seu acerto est\xE1 em ${pct}%. ${meta === null ? "\xC9 um bom momento para comparar seus erros por assunto." : `Se quiser mirar os ${meta}%, eu come\xE7aria comparando os erros por assunto.`} Aqueles que t\xEAm a mesma causa podem entrar juntos na pr\xF3xima revis\xE3o.`
  );
  const forte = c.fato("melhorArea");
  const proximo = c.fato("areaFraca");
  const posicao = c.fato("ranking");
  return [leitura, forte, proximo, posicao, c.obs(1, ["sequencia", "semana", "maisEstudada"])];
}
function aberturaEstudo(c, i) {
  const r = c.dez ? `Voc\xEA j\xE1 resolveu ${c.q} por aqui.` : "Voc\xEA j\xE1 come\xE7ou pelas quest\xF5es.";
  if (c.tipo === "comecando" || c.tipo === "boas_vindas") {
    return `${r} Obrigado por estudar com o Orto Quest\xF5es. Queria te dar uma ideia para aproveitar o que acabou de ver.`;
  }
  if (c.tipo === "acesso_terminou") return `${r} Seu hist\xF3rico continua na conta. Na pr\xF3xima vez que for estudar, voc\xEA pode come\xE7ar pelos temas que deixou em andamento.`;
  if (c.tipo === "pausa" || c.tipo === "sumiu" || c.tipo === "comecou_parou" || c.tipo === "voltou" || c.tipo === "assinante_parado_7" || c.tipo === "como_estao") {
    return c.um(
      `${r} Se estiver pensando em retomar, vale abrir uma quest\xE3o familiar e partir do coment\xE1rio dela. \xC9 um jeito de voltar a um assunto sem precisar planejar a semana inteira.`,
      `${r} Queria deixar uma ideia para a pr\xF3xima sess\xE3o. Pegue uma quest\xE3o do seu hist\xF3rico e veja o que ainda lembra antes de ler a explica\xE7\xE3o.`,
      `${r} Quando for abrir o site de novo, voc\xEA pode retomar um assunto que j\xE1 estudou e come\xE7ar pelo que ainda traz d\xFAvida.`
    );
  }
  const intro = [
    "Achei que valia te escrever com uma sugest\xE3o para aproveitar melhor esse treino.",
    "Queria compartilhar uma ideia para a pr\xF3xima vez que voc\xEA sentar para estudar.",
    "D\xE1 para usar o que j\xE1 estudou para escolher onde colocar a aten\xE7\xE3o agora.",
    "Para tirar mais proveito desse estudo, vale voltar a uma d\xFAvida que apareceu nas quest\xF5es.",
    "Se estiver planejando o pr\xF3ximo treino, tem um jeito simples de escolher o assunto.",
    "Faz diferen\xE7a parar um momento para ver o que j\xE1 aprendeu. Queria te sugerir um pr\xF3ximo passo."
  ][i];
  return c.um(`${r} ${intro}`, `${intro} ${r}`);
}
function estudo(tema, rota = "revisao") {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `v${i + 61}`,
    assuntos: (c) => [nm(c, [tema, "uma ideia para o pr\xF3ximo treino", "o que vale revisar agora", "um assunto para retomar", "como aproveitar seu treino", "para a pr\xF3xima sess\xE3o"][i])],
    saudacao: saudacaoEstudo,
    corpo: (c) => c.r === 0 ? primeirosPassos(c, i, false) : [
      aberturaEstudo(c, i),
      ...proximoPasso(c),
      (c.tipo === "comecando" || c.tipo === "boas_vindas") && !c.fatos.cronograma ? dicaCronograma(c, i) : null,
      rota === "erros" ? `Voc\xEA encontra as suas quest\xF5es no Caderno de erros: ${c.link(rota)}` : rota === "revisao" ? `Aqui est\xE1 a sua Revis\xE3o, com o que j\xE1 d\xE1 para retomar: ${c.link(rota)}` : `Aqui voc\xEA pode escolher o pr\xF3ximo assunto em Treinar: ${c.link(rota)}`,
      c.um(
        "Bom estudo. Se quiser me contar o que tem funcionado para voc\xEA, pode escrever por aqui.",
        "Obrigado por estudar com a gente. Se precisar de ajuda no site, pode responder a este e-mail.",
        "Desejo um bom pr\xF3ximo treino. Pode me escrever se tiver alguma d\xFAvida sobre como encontrar essas quest\xF5es."
      )
    ]
  }));
}
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
var depoisDaProva = /* @__PURE__ */ [
  ["quer me contar como foi?", "Qual assunto mais te chamou aten\xE7\xE3o nas quest\xF5es? Se lembrar de um tema ou de um tipo de pergunta, j\xE1 \xE9 uma ajuda e tanto para preparar as pr\xF3ximas revis\xF5es."],
  ["sobre o formato da prova", "Como foi o formato das perguntas? Se teve algo diferente no enunciado, nas imagens ou no tempo para responder, eu gostaria de saber."],
  ["como foi a sua prova", "Fiquei curioso para saber se algum assunto te pegou de surpresa. Se quiser me contar, as suas observa\xE7\xF5es ajudam a pr\xF3xima turma a se preparar."],
  ["uma pergunta depois da prova", "Se pudesse rever um \xFAnico tema antes de fazer a prova de novo, qual seria? \xC9 uma forma de entender que revis\xE3o teria feito mais diferen\xE7a."],
  ["o que chamou aten\xE7\xE3o na prova", "Ao sair da prova, ficou algum tema na cabe\xE7a? Pode ser algo que apareceu v\xE1rias vezes ou uma pergunta com uma forma diferente de cobrar o assunto."],
  ["sua experi\xEAncia na prova", "O que voc\xEA achou dos casos apresentados? Queria entender que tipo de enunciado teria valido a pena praticar mais."]
].map(([assunto, pergunta], i) => ({
  id: `v${61 + i}`,
  assuntos: (c) => [nm(c, assunto)],
  corpo: (c) => [
    `Espero que tenha corrido bem com ${c.nomeProva}. Obrigado por ter contado com o Orto Quest\xF5es na prepara\xE7\xE3o.`,
    pergunta,
    "Se quiser dividir sua experi\xEAncia, pode responder por aqui. Vou gostar de ler."
  ]
}));
var marco = (primeiro = false) => Array.from({ length: 6 }, (_, i) => ({
  id: `v${i + (primeiro ? 41 : 61)}`,
  assuntos: (c) => [nm(c, [primeiro ? "suas primeiras quest\xF5es" : "parab\xE9ns pelo seu novo marco", "mais um passo no seu estudo", "suas quest\xF5es e a pr\xF3xima revis\xE3o", "seu progresso nas quest\xF5es", "para continuar seu treino", "um marco para comemorar"][i])],
  corpo: (c) => [
    primeiro ? "Voc\xEA concluiu suas primeiras dez quest\xF5es no Orto Quest\xF5es." : c.um(
      `Queria comemorar uma marca com voc\xEA. Voc\xEA chegou \xE0s ${Q(c.marco ?? 100)} no Orto Quest\xF5es. Parab\xE9ns pelo trabalho que teve para chegar at\xE9 aqui.`,
      `Passei para te dar os parab\xE9ns pelas ${Q(c.marco ?? 100)}. Vale guardar esse n\xFAmero como lembran\xE7a de quanto estudo j\xE1 coube nas suas sess\xF5es.`,
      `Voc\xEA chegou \xE0 marca de ${Q(c.marco ?? 100)}. Obrigado por escolher estudar com a gente e reservar esse tempo para as quest\xF5es.`
    ),
    ...primeiro ? [c.obs(1, ["ranking", "melhorArea"])] : proximoPasso(c),
    `Se quiser aproveitar esse treino, suas pr\xF3ximas quest\xF5es de Revis\xE3o ficam aqui: ${c.link("revisao")}`,
    c.um(
      "Bom estudo. Obrigado por deixar o Orto Quest\xF5es fazer parte desse caminho.",
      "Se tiver alguma dificuldade para encontrar as quest\xF5es da revis\xE3o, me escreva por aqui. Fico \xE0 disposi\xE7\xE3o."
    )
  ]
}));
var PERGUNTAS_OPINIAO = [
  ["como tem sido estudar pelo site?", "Teve algum coment\xE1rio de quest\xE3o que te fez entender uma resposta que antes parecia confusa? Queria saber o que ajudou ali."],
  ["o que ajudaria no seu pr\xF3ximo treino?", "Quando abre o site para estudar, tem alguma coisa que toma mais tempo do que deveria? Pode ser escolher o assunto, encontrar uma revis\xE3o ou voltar a uma quest\xE3o."],
  ["uma pergunta sobre o seu estudo", "Se pudesse mudar uma coisa no jeito de fazer as quest\xF5es, o que mudaria? Um exemplo da \xFAltima vez que usou o site j\xE1 ajuda bastante."],
  ["como est\xE1 sendo usar a Revis\xE3o?", "Na hora de refazer uma quest\xE3o, consegue encontrar os coment\xE1rios que quer consultar? Queria entender o que funciona e o que poderia ficar mais simples."],
  ["uma ideia para melhorar o Orto Quest\xF5es", "Tem alguma parte do site que hoje j\xE1 ajuda no seu estudo e voc\xEA gostaria que a gente desenvolvesse melhor? Fico contente em ouvir sugest\xF5es."]
];
var opiniao = () => PERGUNTAS_OPINIAO.map(([assunto, pergunta], i) => ({
  id: `v${61 + i}`,
  assuntos: (c) => [nm(c, assunto)],
  saudacao: saudacaoEstudo,
  corpo: (c) => [
    c.um(
      "Obrigado por estudar com o Orto Quest\xF5es. Queria aproveitar para te fazer uma pergunta.",
      "Queria saber um pouco de como est\xE1 sendo usar o Orto Quest\xF5es. Obrigado por reservar um tempo para conhecer o site.",
      "Passei para agradecer pelo tempo que voc\xEA j\xE1 estudou com a gente. Se puder, queria ouvir uma impress\xE3o sua."
    ),
    pergunta,
    "Se quiser me contar, \xE9 s\xF3 responder por aqui."
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
  id: `v${61 + i}`,
  assuntos: (c) => [nm(c, [
    pronto2 ? "seu cronograma ficou salvo" : "para poupar tempo no come\xE7o da sess\xE3o",
    "o que estudar quando sentar para treinar",
    "uma ideia para organizar a semana",
    "suas pr\xF3ximas sess\xF5es",
    "como distribuir as revis\xF5es"
  ][i])],
  saudacao: saudacaoEstudo,
  corpo: (c) => [
    pronto2 ? "Seu cronograma ficou salvo. Quando abrir o plano de novo, pode come\xE7ar pela lista do dia." : c.um(
      "Queria te mostrar um jeito de poupar tempo na pr\xF3xima sess\xE3o. Quando voc\xEA j\xE1 tem a lista do dia, d\xE1 para usar aqueles minutos escolhendo respostas em vez de montando filtros.",
      "Se estiver acertando como distribuir o estudo at\xE9 a prova, vale abrir o Cronograma. Ele foi feito para ajudar a decidir o que cabe hoje, mesmo quando o tempo muda de uma semana para a outra."
    ),
    dicaCronograma(c, i),
    `O Cronograma est\xE1 aqui: ${c.link("cronograma")}`,
    ajuda(c)
  ]
}));
var dataCompleta = (iso) => iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : null;
var planoPorExtenso = (id) => id ? { mensal: "mensal", trimestral: "trimestral", semestral: "semestral", anual: "anual" }[id] ?? null : null;
var pagamento = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 61}`,
  assuntos: (c) => [nm(c, (c.pagamento?.renovacao ? ["renova\xE7\xE3o confirmada", "seu novo per\xEDodo est\xE1 confirmado", "pagamento da renova\xE7\xE3o aprovado", "confirma\xE7\xE3o da sua renova\xE7\xE3o", "seu acesso foi prolongado"] : ["pagamento aprovado", "sua assinatura foi confirmada", "seu acesso est\xE1 ativo", "confirma\xE7\xE3o do seu plano", "seu per\xEDodo de acesso"])[i])],
  corpo: (c) => [
    c.pagamento?.renovacao ? "Obrigado por continuar estudando com a gente. O pagamento da renova\xE7\xE3o foi aprovado e o novo per\xEDodo da sua assinatura est\xE1 confirmado." : c.um("Obrigado pela confian\xE7a. Seu pagamento foi aprovado e sua assinatura est\xE1 ativa.", "Obrigado por escolher estudar com o Orto Quest\xF5es. Passo para confirmar que o pagamento foi aprovado e o acesso est\xE1 ativo.", "Obrigado por fazer parte do Orto Quest\xF5es. O pagamento foi aprovado e voc\xEA j\xE1 pode usar os recursos da assinatura."),
    planoPorExtenso(c.pagamento?.plano) ? `Plano confirmado: ${planoPorExtenso(c.pagamento?.plano)}.` : null,
    dataCompleta(c.pagamento?.fimEm) ? `Seu acesso pago vai at\xE9 ${dataCompleta(c.pagamento?.fimEm)}.` : null,
    c.pagamento?.meio === "pix" ? "Voc\xEA pagou por Pix, ent\xE3o este per\xEDodo fica ativo at\xE9 a data informada e a renova\xE7\xE3o \xE9 feita por voc\xEA. Em Minha assinatura, d\xE1 para conferir os detalhes e prolongar quando achar melhor." : c.pagamento?.meio === "cartao" ? "O pagamento foi confirmado no cart\xE3o. Em Minha assinatura voc\xEA consulta o per\xEDodo, a renova\xE7\xE3o e os recibos." : "Em Minha assinatura voc\xEA consulta os detalhes do acesso, os pagamentos e os recibos.",
    `Para consultar seu plano: ${c.link("conta")}`,
    ajuda(c)
  ]
}));
var encerramento = () => Array.from({ length: 5 }, (_, i) => ({
  id: `v${i + 61}`,
  assuntos: (c) => [nm(c, (c.encerramento?.reembolso ? ["sobre o reembolso da assinatura", "atualiza\xE7\xE3o do seu reembolso", "reembolso registrado", "detalhes do reembolso", "sua assinatura e o reembolso"] : ["renova\xE7\xE3o autom\xE1tica desligada", "cancelamento confirmado", "sobre o fim do per\xEDodo pago", "atualiza\xE7\xE3o da assinatura", "detalhes do cancelamento"])[i])],
  corpo: (c) => {
    const fim = dataCompleta(c.encerramento?.fimEm);
    const vigente = !!c.encerramento?.fimEm && Date.parse(c.encerramento.fimEm) > c.hoje.getTime();
    return [
      c.encerramento?.reembolso ? "Passo para confirmar que o reembolso da sua assinatura foi registrado. O per\xEDodo de acesso pago foi encerrado." : vigente ? `A renova\xE7\xE3o autom\xE1tica foi desligada. Seu acesso pago segue ativo at\xE9 ${fim}. Depois dessa data, essa assinatura n\xE3o gera outro pagamento.` : fim ? `O cancelamento da assinatura foi confirmado. O per\xEDodo pago terminou em ${fim}.` : "O cancelamento da assinatura foi confirmado. Voc\xEA pode consultar o per\xEDodo e os detalhes na sua conta.",
      acesso(c),
      `Os detalhes ficam em Minha assinatura: ${c.link("conta")}`,
      "Se precisar esclarecer alguma informa\xE7\xE3o sobre a solicita\xE7\xE3o, basta responder este e-mail."
    ];
  }
}));
var ABERTURAS_RELATORIO = [
  "Queria te contar como foi seu estudo e deixar uma ideia para o pr\xF3ximo treino.",
  "\xC0s vezes fica dif\xEDcil perceber o que avan\xE7ou entre uma sess\xE3o e outra. Juntei o que aparece no seu estudo para ficar mais f\xE1cil de ver.",
  "Se estiver escolhendo o que revisar nos pr\xF3ximos dias, d\xE1 para partir das quest\xF5es que voc\xEA j\xE1 resolveu. Foi isso que olhei para te escrever.",
  "Passei para dividir o que chamou minha aten\xE7\xE3o no seu estudo. D\xE1 para usar esses n\xFAmeros para decidir o que fazer na pr\xF3xima sess\xE3o.",
  "Antes de montar a pr\xF3xima lista, vale olhar um pouco para tr\xE1s. Queria te mostrar o que seu estudo j\xE1 diz sobre onde continuar."
];
var relatorio = () => ABERTURAS_RELATORIO.map((abertura, i) => ({
  id: `v${61 + i}`,
  assuntos: (c) => [nm(c, [
    c.relatorio?.quinzena ? "como foi seu estudo na quinzena" : "como foi seu estudo no m\xEAs",
    "o que seu estudo mostra at\xE9 aqui",
    "para escolher o que revisar",
    "sua pr\xF3xima sess\xE3o de estudo",
    "seu estudo em perspectiva"
  ][i])],
  saudacao: saudacaoEstudo,
  corpo: (c) => {
    const d = c.relatorio;
    const n = d?.respostas ?? 0;
    const total = (d?.certas ?? 0) + (d?.erradas ?? 0);
    const pct = total ? Math.round((d?.certas ?? 0) / total * 100) : 0;
    const citavel = n >= 30 && total >= 30 && pct >= 50;
    const delta = citavel && d?.acertoAnterior != null ? pct - d.acertoAnterior : 0;
    const forte = d?.melhorArea && c.area(d.melhorArea.slug) && d.melhorArea.acerto >= 70 ? d.melhorArea : null;
    const revisar = d?.maisFraco && c.area(d.maisFraco.slug) && d.maisFraco.slug !== forte?.slug ? d.maisFraco : null;
    const dias2 = d?.diasAtivos ? d.diasAtivos === 1 ? " em um dia de estudo" : ` ao longo de ${d.diasAtivos} dias de estudo` : "";
    const volume = n >= 10 ? `${d?.frase || "Neste per\xEDodo"}, voc\xEA respondeu ${Q(n)}${dias2}.` : n > 0 ? "Voc\xEA j\xE1 respondeu algumas quest\xF5es neste per\xEDodo. Vale voltar \xE0 que mais te fez pensar e ver se hoje voc\xEA chegaria mais r\xE1pido \xE0 resposta." : "Se quiser retomar, suas quest\xF5es anteriores est\xE3o guardadas. Eu come\xE7aria com um assunto familiar e um \xFAnico coment\xE1rio que valha a pena reler.";
    const resultado = citavel ? delta > 0 ? `Voc\xEA acertou ${pct}% no per\xEDodo. S\xE3o ${delta} ${delta === 1 ? "ponto percentual a mais" : "pontos percentuais a mais"} que no per\xEDodo anterior. Parab\xE9ns por esse avan\xE7o.` : c.um(
      `Seu acerto no per\xEDodo ficou em ${pct}%. \xC9 um bom ponto de partida para decidir quais erros vale retomar.`,
      `Voc\xEA chegou a ${pct}% de acertos no per\xEDodo. Vale abrir algumas das quest\xF5es em que ficou entre duas respostas e conferir o que fez a diferen\xE7a.`
    ) : n >= 10 ? incentivo(c) : null;
    return [
      abertura,
      [volume, resultado].filter(Boolean).join(" "),
      citavel && forte ? `Um assunto que se destacou foi ${c.area(forte.slug).de}. Voc\xEA ficou em ${forte.acerto}% nas quest\xF5es desse tema. Vale lembrar o que funcionou bem quando for revisar outra \xE1rea.` : null,
      revisar ? `Para o pr\xF3ximo treino, eu abriria o tema de ${c.area(revisar.slug).de}. Refa\xE7a uma quest\xE3o que errou e veja em qual trecho do enunciado estava a informa\xE7\xE3o que mudava a resposta.` : null,
      d?.simulado && d.simulado.acertos >= 10 && d.simulado.total >= d.simulado.acertos && d.simulado.acertos * 2 >= d.simulado.total ? `Tamb\xE9m vi seu resultado em \u201C${d.simulado.titulo}\u201D. Voc\xEA acertou ${d.simulado.acertos} de ${d.simulado.total} quest\xF5es. Confira as suas d\xFAvidas na corre\xE7\xE3o para aproveitar esse treino.` : null,
      `Voc\xEA pode ver o hist\xF3rico por tema aqui: ${c.link("desempenho")}`,
      c.um(
        "Obrigado por estudar com a gente. Se quiser ajuda para usar a p\xE1gina de Desempenho, pode responder por aqui.",
        "Bom estudo. Se tiver alguma d\xFAvida sobre como encontrar esses dados no site, me escreva por aqui."
      )
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
  id: `v${61 + i}`,
  assuntos: (c) => [nm(c, [
    "uma leitura para o pr\xF3ximo treino",
    "tem novidade na Biblioteca",
    "um resumo para revisar o tema",
    "para ler e praticar o assunto",
    "uma ideia para a pr\xF3xima revis\xE3o"
  ][i])],
  saudacao: saudacaoEstudo,
  corpo: (c) => {
    const titulo = c.campanha.resumo?.titulo;
    return [
      titulo ? `Queria te avisar que o resumo \u201C${titulo}\u201D j\xE1 est\xE1 na Biblioteca.` : "Queria te avisar que entrou uma leitura nova na Biblioteca, relacionada aos assuntos do seu estudo.",
      c.um(
        "Se quiser aproveitar a leitura com pouco tempo, comece por um trecho que responda a uma d\xFAvida sua. Em seguida, fa\xE7a uma das quest\xF5es ligadas a ele.",
        "Uma forma de usar esse resumo \xE9 abrir primeiro uma quest\xE3o vinculada. Depois, leia o trecho que explica por que aquela resposta funciona.",
        "Se tiver uma quest\xE3o marcada para revisar sobre o tema, vale resolver de novo depois da leitura. Assim fica mais f\xE1cil ver o que ficou claro."
      ),
      `Voc\xEA encontra a leitura aqui: ${c.link("resumo")}`,
      c.um(
        "Bom estudo. Se uma parte da explica\xE7\xE3o ficar confusa, pode me escrever por aqui.",
        "Espero que a leitura ajude no pr\xF3ximo treino. Se tiver dificuldade para encontrar as quest\xF5es ligadas ao resumo, me avise por aqui.",
        "Boa leitura. Se tiver uma d\xFAvida sobre como abrir o resumo ou as quest\xF5es, \xE9 s\xF3 me escrever."
      )
    ];
  }
}));
var simulado = (resultado = false) => Array.from({ length: 5 }, (_, i) => ({
  id: `v${61 + i}`,
  assuntos: (c) => [nm(c, (resultado ? ["como aproveitar a corre\xE7\xE3o do simulado", "seu resultado no Simulado Nacional", "o que revisar depois do simulado", "voltando \xE0s quest\xF5es do simulado", "um recado sobre o seu resultado"] : ["sobre o Simulado Nacional", "seu hor\xE1rio para fazer o simulado", "para organizar o dia do simulado", "sua inscri\xE7\xE3o no simulado", "um recado antes do simulado"])[i])],
  saudacao: saudacaoEstudo,
  corpo: (c) => {
    const s = c.campanha.simulado;
    const l = c.campanha.lembrete;
    const prazo2 = l?.tipo_lembrete === "abre_amanha" ? "A edi\xE7\xE3o abre amanh\xE3." : l?.tipo_lembrete === "abriu_hoje" ? "O simulado j\xE1 est\xE1 aberto." : l?.abre_em ? `A abertura est\xE1 prevista para ${dataCurta(l.abre_em)}.` : null;
    const certas = s?.acertos ?? 0;
    const total = s?.total ?? 0;
    const nota = certas >= 10 && certas <= total && certas * 2 >= total ? `Voc\xEA acertou ${certas} de ${total} quest\xF5es nessa edi\xE7\xE3o. Parab\xE9ns por ter feito esse treino completo.` : null;
    return resultado ? [
      `Seu resultado${s?.titulo ? ` em \u201C${s.titulo}\u201D` : " no Simulado Nacional"} j\xE1 est\xE1 dispon\xEDvel.`,
      nota,
      c.um(
        "Quando abrir a corre\xE7\xE3o, veja primeiro as quest\xF5es em que ficou entre duas alternativas. Vale ler com calma o detalhe que separa uma resposta da outra.",
        "Uma coisa que ajuda depois do simulado \xE9 separar os erros de conte\xFAdo das quest\xF5es que ficaram dif\xEDceis pelo tempo. Assim d\xE1 para escolher o tipo de treino que mais vai ajudar.",
        "Se uma quest\xE3o te tomou mais tempo que as outras, comece por ela. Leia o coment\xE1rio e pense no que poderia ter identificado de cara no enunciado."
      ),
      `Aqui est\xE1 a p\xE1gina do simulado: ${c.link("simulado")}`,
      ajuda(c)
    ] : [
      c.um(
        `Sua inscri\xE7\xE3o no Simulado Nacional${l?.titulo ? ` \u201C${l.titulo}\u201D` : ""} est\xE1 registrada. ${prazo2 ?? "Queria deixar uma sugest\xE3o para voc\xEA se organizar."}`,
        `Passei para lembrar do Simulado Nacional${l?.titulo ? ` \u201C${l.titulo}\u201D` : ""}. ${prazo2 ?? "Vale conferir os hor\xE1rios antes de escolher quando fazer."}`
      ),
      l?.fecha_em ? `O prazo para participar vai at\xE9 ${dataCurta(l.fecha_em)}.` : null,
      l?.total && l.total >= 10 ? `S\xE3o ${l.total} quest\xF5es${l.duracao_min ? `, com ${l.duracao_min === 120 ? "duas horas" : l.duracao_min === 240 ? "quatro horas" : `${l.duracao_min} minutos`} para responder` : ""}. Se puder, separe um hor\xE1rio para fazer do come\xE7o ao fim.` : null,
      l?.precisa_plano ? "Para participar desta edi\xE7\xE3o, \xE9 preciso ter assinatura ativa." : null,
      `Voc\xEA pode conferir os detalhes da prova aqui: ${c.link("simulado")}`,
      c.um(
        "Bom simulado. Se tiver alguma dificuldade para abrir a edi\xE7\xE3o, me escreva por aqui.",
        "Quando reservar um hor\xE1rio, confira tamb\xE9m o prazo de encerramento. Tomara que tenha um bom treino.",
        "Se puder, escolha um momento em que d\xEA para fazer a prova inteira. Depois, as quest\xF5es que trouxerem d\xFAvida j\xE1 podem orientar a revis\xE3o."
      )
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
  reta_final: /* @__PURE__ */ cartasDeProva(false),
  vespera_prova: /* @__PURE__ */ cartasDeProva(true),
  depois_prova: depoisDaProva,
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
  const nome = (valor ?? "").replace(/\b(?:SBCM|SIMÃO)\b/gi, "cirurgia da m\xE3o").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return /^(outra(?: prova)?|outro|n[aã]o informad[oa]|prova)$/i.test(nome) || /[@<>]|https?:|www\.|ortoquestoes\.com\.br/i.test(nome) || !/\p{L}/u.test(nome) ? "" : nome;
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
var numero2 = (n) => Math.round(n).toLocaleString("pt-BR");
var questoes = (n) => n >= MINIMO_PARA_NUMERO ? `${numero2(n)} quest\xF5es` : "os primeiros passos";
var dias = (n) => n === 1 ? "1 dia" : `${numero2(n)} dias`;
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
  const a = p.acertos, e = p.erros;
  if (a == null || e == null || !Number.isInteger(a) || !Number.isInteger(e) || a < 0 || e < 0) return null;
  if (!(p.respondidas >= MINIMO_PARA_ACERTO) || a + e < MINIMO_PARA_ACERTO) return null;
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
    return com("marco", null, marco2, `Acabou de passar de ${numero2(marco2)} quest\xF5es.`);
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
function fatosDe(p, hoje = /* @__PURE__ */ new Date(), paraProva = false) {
  const f = {};
  const geral = acertoCitavel(p);
  const areas = (p.areas ?? []).filter((a) => AREAS[a.slug] && a.total > 0 && a.certas >= 0 && a.certas <= a.total);
  const comAcerto = areas.filter((a) => a.total >= 15).map((a) => ({ ...a, pct: Math.round(100 * a.certas / a.total) })).sort((a, b) => b.pct - a.pct || b.total - a.total);
  const [melhor, segunda] = comAcerto;
  if (melhor && (melhor.pct >= 70 || paraProva && geral !== null && segunda && melhor.pct - segunda.pct >= 10)) {
    f.melhorArea = { slug: melhor.slug, pct: melhor.pct, total: melhor.total };
  }
  const fraca = comAcerto.filter((a) => a.total >= (paraProva ? 15 : 40) && a.slug !== f.melhorArea?.slug).sort((a, b) => a.pct - b.pct || b.total - a.total)[0];
  if (fraca && geral !== null) {
    const abaixoDoGeral = fraca.pct < 60 && fraca.pct <= geral - 10 && fraca.total >= 40;
    const espacoParaMelhorar = paraProva && melhor && fraca.slug !== melhor.slug && fraca.pct < 85 && fraca.pct <= Math.max(geral, melhor.pct) - 10;
    if (abaixoDoGeral || espacoParaMelhorar) f.areaFraca = { slug: fraca.slug, total: fraca.total, pct: fraca.pct };
  }
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
  for (const prova of ["teot", "taro", "mao", "r4", "atualizacao"]) if (provas.includes(prova)) {
    f.prova = prova;
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
      return mostrar ? [
        `Entre os temas que voc\xEA praticou, um resultado se destacou em ${a.em}. Vale prestar aten\xE7\xE3o ao que funcionou na hora de estudar esse assunto.`,
        `Seu estudo rendeu bem em ${a.em}. \xC9 um bom tema para revisitar de vez em quando e conservar o que j\xE1 ficou claro.`,
        `Tamb\xE9m reparei no seu resultado em ${a.em}. Ali est\xE1 um bom exemplo de como o estudo j\xE1 est\xE1 aparecendo nas respostas.`
      ] : [
        `Voc\xEA j\xE1 tem pr\xE1tica em ${a.em}. D\xE1 para retomar uma pergunta desse tema sempre que quiser organizar o pr\xF3ximo treino.`,
        `Se quiser come\xE7ar por um assunto familiar, j\xE1 tem algumas boas perguntas para rever em ${a.em}.`
      ];
    }
    case "maisEstudada": {
      const a = A(f.maisEstudada.slug);
      return [
        `Boa parte das suas quest\xF5es foi de ${a.de}. Se quiser retomar por ali, comece pela pergunta cujo coment\xE1rio mudou a forma como voc\xEA pensava no assunto.`,
        `Vi que voc\xEA vem praticando ${a.de}. Pegue uma quest\xE3o antiga do tema e tente explicar a resposta antes de reler o coment\xE1rio.`,
        `Em ${a.em}, j\xE1 tem perguntas conhecidas para usar como ponto de partida. Uma ou duas podem bastar para lembrar o racioc\xEDnio.`
      ];
    }
    case "areaFraca": {
      const a = A(f.areaFraca.slug);
      return [
        `Pelo que apareceu nas quest\xF5es, eu daria um pouco mais de tempo a ${a.em}. Refa\xE7a um erro desse tema e diga com suas palavras o que deveria ter mudado a sua resposta.`,
        `Para a pr\xF3xima revis\xE3o, come\xE7aria por ${a.em}. Se duas alternativas pareciam certas, confira no coment\xE1rio o que fazia a diferen\xE7a entre elas.`,
        `Vale separar uma sess\xE3o curta para ${a.em}. Escolha duas perguntas em que ficou em d\xFAvida e veja se o mesmo detalhe aparece nas duas respostas.`
      ];
    }
    case "ranking":
      return [
        `Ah, e parab\xE9ns pela ${f.ranking}\xAA posi\xE7\xE3o no ranking geral. D\xE1 gosto ver esse reconhecimento pelo tempo que voc\xEA colocou no estudo.`,
        `Vi tamb\xE9m sua ${f.ranking}\xAA posi\xE7\xE3o no ranking geral. Parab\xE9ns por todo esse treino.`,
        `Fica meu parab\xE9ns pela ${f.ranking}\xAA posi\xE7\xE3o no ranking geral. \xC9 uma boa lembran\xE7a de quanto voc\xEA j\xE1 praticou por aqui.`
      ];
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
  const paraProva = tipo === "reta_final" || tipo === "vespera_prova";
  const pctBomValor = pct !== null && pct >= 50 ? pct : null;
  const fatos = fatosDe(p, hoje, paraProva);
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
    get pctProva() {
      if (!paraProva || pct === null) return null;
      usados.add("acerto");
      return pct;
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

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
var Q = (n) => n === 1 ? "1 quest\xE3o" : `${N(n)} quest\xF5es`;
var D = (n) => n === 1 ? "1 dia" : `${N(n)} dias`;
var cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
var J = (...partes) => {
  const t = partes.filter((x) => typeof x === "string" && x.trim() !== "").join(" ").trim();
  return t || null;
};
var nm = (c, comNome, semNome) => c.nome ? `${c.nome}, ${comNome}` : semNome;
var temFatos = (c) => Object.values(c.fatos).some((v) => v !== void 0);
var semanas = (d) => {
  const s = Math.max(1, Math.round(d / 7));
  return s === 1 ? "uma semana" : s === 2 ? "duas semanas" : s === 3 ? "tr\xEAs semanas" : s === 4 ? "quatro semanas" : `${N(s)} semanas`;
};
var tempoFora = (d) => {
  const v = Math.max(1, Math.round(Number(d) || 1));
  if (v < 14) return D(v);
  if (v < 60) return semanas(v);
  return v < 120 ? "uns dois meses" : "alguns meses";
};
var assuntosAtivo = (c, extras) => [
  nm(c, "lembrei de voc\xEA", "Lembrei de voc\xEA"),
  nm(c, "fiquei feliz de ver o seu estudo", "Fiquei feliz de ver o seu estudo"),
  `Sobre as suas ${Q(c.r)}`,
  nm(c, "um recado r\xE1pido", "Um recado r\xE1pido"),
  "Uma coisa bonita que reparei",
  c.fatos.melhorArea && `Parab\xE9ns por ${c.area(c.fatos.melhorArea.slug).em}`,
  c.fatos.ranking && `${c.fatos.ranking}\xBA no ranking`,
  c.fatos.horario === "noite" && nm(c, "estudando \xE0 noite", "Estudando \xE0 noite"),
  c.fatos.prova === "teot" && nm(c, "rumo ao TEOT", "Rumo ao TEOT"),
  ...extras
];
var ativo_0_10 = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "uma ideia para voc\xEA", "Uma ideia para voc\xEA"), "Um presente pequeno para o seu estudo", `Sobre as suas ${Q(c.r)}`],
    corpo: (c) => [
      `Estava olhando quem anda estudando por aqui e lembrei de voc\xEA: j\xE1 s\xE3o ${Q(c.r)} respondidas. Fiquei feliz de ver voc\xEA encarando quest\xF5es de prova de verdade, que s\xE3o dif\xEDceis para todo mundo.`,
      "Queria te oferecer uma ideia que ajuda muito nessa fase: escolher um tema s\xF3 e fazer cinco quest\xF5es com calma, lendo o coment\xE1rio de cada alternativa. Parece pouco, mas \xE9 assim que a mat\xE9ria come\xE7a a ficar.",
      c.obs(1),
      `Se quiser experimentar hoje, o tema fica \xE0 sua escolha aqui: ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "posso te ajudar em alguma coisa?", "Posso te ajudar em alguma coisa?"), nm(c, "como est\xE1 sendo o seu estudo?", "Como est\xE1 sendo o seu estudo?")],
    corpo: (c) => [
      "Queria saber como est\xE1 sendo o seu estudo por aqui.",
      "Quest\xE3o de prova de t\xEDtulo \xE9 dif\xEDcil, e todo mundo que passou come\xE7ou exatamente onde voc\xEA est\xE1. \xC0s vezes um ajuste pequeno no jeito de estudar faz muita diferen\xE7a, e eu gostaria de te ajudar a encontrar o seu.",
      "Se quiser, me responde contando como costuma fazer as quest\xF5es e qual prova tem em mente. Eu leio tudo e respondo pessoalmente.",
      c.ps()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "um m\xE9todo simples", "Um m\xE9todo simples para as quest\xF5es"), "Cinco quest\xF5es com calma"],
    corpo: (c) => [
      c.obs(1) ?? `Vi que voc\xEA j\xE1 passou por ${Q(c.r)} no Orto Quest\xF5es, e quis te escrever.`,
      "Queria te passar um jeito de estudar que costuma funcionar muito bem no come\xE7o.",
      "Escolha um tema s\xF3. Fa\xE7a cinco quest\xF5es com calma, lendo o enunciado inteiro. Depois de cada uma, leia o coment\xE1rio de todas as alternativas. No dia seguinte, abra a Revis\xE3o antes de qualquer quest\xE3o nova.",
      `Parece pouco, mas \xE9 assim que o estudo come\xE7a a render. A Revis\xE3o fica aqui: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "todo mundo come\xE7a assim", "Todo mundo come\xE7a assim"), "Sobre o come\xE7o"],
    corpo: (c) => [
      "Queria te contar uma coisa: todo mundo que passou na prova de t\xEDtulo come\xE7ou achando as quest\xF5es dif\xEDceis. A banca gosta de detalhe de classifica\xE7\xE3o, de exce\xE7\xE3o, de nome pr\xF3prio. Faz parte do caminho.",
      `E o que eu vi no seu hist\xF3rico me deixou feliz: ${Q(c.r)} j\xE1 respondidas. D\xE1 para ver que voc\xEA \xE9 de quem n\xE3o desiste.`,
      c.dica(),
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "como o site est\xE1 funcionando para voc\xEA?", "Como o site est\xE1 funcionando para voc\xEA?")],
    corpo: (c) => [
      "Escrevo porque gostaria de saber como o site est\xE1 funcionando para voc\xEA.",
      `Voc\xEA j\xE1 respondeu ${Q(c.r)}, e isso mostra muita vontade. Uma sugest\xE3o que costuma deixar tudo mais leve: come\xE7ar pelos conceitos b\xE1sicos. S\xE3o quest\xF5es mais diretas e ajudam a pegar o jeito das provas. D\xE1 para escolher o tema aqui: ${c.link("treinar")}`,
      "E se alguma coisa no site estiver confusa, me conta. Respondo pessoalmente."
    ]
  },
  {
    id: "v6",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, ["Menos quest\xF5es, mais coment\xE1rio"]),
    corpo: (c) => [
      c.obs(1),
      "Queria te dizer que estou acompanhando o seu come\xE7o com carinho. Cada quest\xE3o que voc\xEA faz agora est\xE1 construindo a base que vai te levar at\xE9 a prova.",
      "Uma ideia para a pr\xF3xima sess\xE3o, se fizer sentido: fazer menos e ler mais. Dez quest\xF5es com o coment\xE1rio lido com calma costumam render mais do que muitas de uma vez.",
      c.fecho(),
      c.ps()
    ]
  }
];
var ativo_10_20 = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "uma sugest\xE3o para o seu estudo", "Uma sugest\xE3o para o seu estudo"), "Errar aqui \xE9 o melhor jeito de acertar l\xE1"],
    corpo: (c) => [
      `Vi que voc\xEA j\xE1 tem ${Q(c.r)} no Orto Quest\xF5es, e quis passar para conversar um pouco.`,
      "Cada quest\xE3o que te pega aqui \xE9 um presente: mostra exatamente o que vale estudar antes da prova. Errar aqui \xE9 o melhor jeito de acertar l\xE1.",
      `Uma sugest\xE3o, se fizer sentido para voc\xEA: abrir o Caderno de erros e refazer algumas com calma. Quando uma quest\xE3o que te pegou vira acerto, ela vale mais do que dez novas. Fica aqui: ${c.link("erros")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => assuntosAtivo(c, ["Quest\xE3o de prova \xE9 dif\xEDcil mesmo"]),
    corpo: (c) => [
      `Quest\xE3o de prova de ortopedia \xE9 dif\xEDcil, \xE0s vezes muito. E voc\xEA est\xE1 encarando com coragem: ${Q(c.r)} at\xE9 aqui.`,
      c.obs(1),
      "O que mais ajuda nessa fase \xE9 voltar nas quest\xF5es que te pegaram at\xE9 elas virarem certeza. \xC9 um ajuste pequeno, e faz muita diferen\xE7a.",
      `Se der hoje, que tal s\xF3 a Revis\xE3o do dia? \xC9 r\xE1pida e \xE9 onde o estudo mais rende: ${c.link("revisao")}`,
      c.ps()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "uma estrat\xE9gia simples", "Uma estrat\xE9gia simples"), "Um tema por semana"],
    corpo: (c) => [
      "Fiquei feliz de ver que voc\xEA continua estudando por aqui.",
      "Pensei numa estrat\xE9gia que talvez combine com voc\xEA: um tema por semana. Em vez de pular de \xE1rea em \xE1rea, ficar alguns dias num s\xF3. A sensa\xE7\xE3o de progresso aparece bem mais r\xE1pido.",
      c.dica(),
      `D\xE1 para escolher o tema aqui: ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "o que eu vejo no seu estudo", "O que eu vejo no seu estudo")],
    corpo: (c) => [
      `Sabe o que eu vejo quando olho o seu estudo? Algu\xE9m que j\xE1 respondeu ${Q(c.r)} e segue em frente. \xC9 isso que mais conta l\xE1 na frente.`,
      "Os coment\xE1rios de cada alternativa foram escritos pensando justamente nessa fase. Uma ideia que ajuda: ler por que cada alternativa est\xE1 certa ou errada, n\xE3o s\xF3 a resposta. \xC9 ali que mora a pegadinha da banca.",
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "topa um desafio pequeno?", "Topa um desafio pequeno?"), "Sete dias, dez quest\xF5es"],
    corpo: (c) => [
      c.obs(1),
      "Queria te propor um desafio pequeno, se voc\xEA topar: nos pr\xF3ximos sete dias, dez quest\xF5es por dia, sempre lendo o coment\xE1rio inteiro.",
      "Depois me conta como foi? Vou adorar saber.",
      c.ps()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "estou torcendo por voc\xEA", "Estou torcendo por voc\xEA"), "Um recado curto"],
    corpo: (c) => [
      "Escrevo rapidinho s\xF3 para dizer que acompanho o seu estudo e estou torcendo por voc\xEA.",
      "Toda base come\xE7a assim, um pouco de cada vez. E voc\xEA est\xE1 construindo a sua.",
      "Um truque que ajuda: antes de olhar as alternativas, tente dizer a resposta de cabe\xE7a. Treina o racioc\xEDnio de prova.",
      c.fecho()
    ]
  }
];
var ativo_20_30 = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "uma t\xE9cnica para as alternativas", "Uma t\xE9cnica para as alternativas"), "Descarte antes de escolher"],
    corpo: (c) => [
      `Vi que voc\xEA j\xE1 est\xE1 com ${Q(c.r)}, e quis te mandar uma t\xE9cnica que costuma ajudar muito nessa fase.`,
      "Voc\xEA j\xE1 reconhece os temas, e agora o que mais rende \xE9 a leitura das alternativas. Antes de escolher a certa, descarte mentalmente as que voc\xEA sabe que n\xE3o s\xE3o. A quest\xE3o fica bem mais leve.",
      "Junto com a revis\xE3o das quest\xF5es que te pegaram, isso costuma fazer o estudo render mais r\xE1pido do que parece.",
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => assuntosAtivo(c, ["Uma fase, n\xE3o um veredito"]),
    corpo: (c) => [
      c.obs(1) ?? "Passei para ver como estava o seu estudo, e fiquei feliz com o que vi.",
      "Queria te dizer uma coisa com carinho: o come\xE7o do estudo para prova de t\xEDtulo \xE9 sempre assim, e \xE9 uma fase, n\xE3o um veredito. Todo mundo que passou viveu isso.",
      `Uma sugest\xE3o, se fizer sentido: escolher o tema que mais te desafia e ficar s\xF3 nele por uns dias. Concentrar ajuda a enxergar os padr\xF5es da banca. D\xE1 para escolher aqui: ${c.link("treinar")}`,
      c.ps()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "o coment\xE1rio \xE9 o melhor professor", "O coment\xE1rio \xE9 o melhor professor")],
    corpo: (c) => [
      "Uma coisa que talvez ningu\xE9m tenha te contado: o coment\xE1rio da quest\xE3o ensina mais justamente quando ela te pega.",
      `Voc\xEA j\xE1 tem ${Q(c.r)} respondidas, o que \xE9 muito material. Lendo com calma o coment\xE1rio de cada alternativa nas pr\xF3ximas, o estudo come\xE7a a responder. N\xE3o \xE9 m\xE1gica, \xE9 repeti\xE7\xE3o, e voc\xEA j\xE1 mostrou que tem const\xE2ncia para isso.`,
      c.dica(),
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "eu vi o seu esfor\xE7o", "Eu vi o seu esfor\xE7o")],
    corpo: (c) => [
      `S\xF3 para dizer que eu vi o seu esfor\xE7o: ${Q(c.r)} j\xE1 respondidas. Isso \xE9 muita dedica\xE7\xE3o.`,
      `Que tal manter a Revis\xE3o em dia nas pr\xF3ximas semanas? \xC9 o que mais faz diferen\xE7a nessa fase: ${c.link("revisao")}`,
      c.ps()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "agora \xE9 s\xF3 calibrar", "Agora \xE9 s\xF3 calibrar"), "Um ajuste pequeno"],
    corpo: (c) => [
      c.fatos.semana ? "Voc\xEA est\xE1 estudando com const\xE2ncia, e essa \xE9 a parte mais dif\xEDcil. Parab\xE9ns por isso." : "Voc\xEA j\xE1 criou o h\xE1bito de abrir o site, e essa \xE9 a parte mais dif\xEDcil. Parab\xE9ns por isso.",
      "Agora \xE9 s\xF3 calibrar: um pouco menos de quest\xE3o nova e um pouco mais de revis\xE3o. A Revis\xE3o traz de volta, no momento certo, o que te pegou, e \xE9 ali que a mat\xE9ria fica.",
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "me conta uma coisa?", "Me conta uma coisa?")],
    corpo: () => [
      "Me conta uma coisa: quando uma quest\xE3o te pega, voc\xEA costuma ter tempo de ler o coment\xE1rio at\xE9 o fim?",
      "Pergunto porque \xE9 ali que costuma estar o maior ganho. O coment\xE1rio explica cada alternativa, e a pegadinha da banca quase sempre est\xE1 numa delas.",
      "Se quiser testar nas pr\xF3ximas dez, me diz depois se fez diferen\xE7a? Fico curioso para saber."
    ]
  }
];
var ativo_30_40 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, ["A base est\xE1 aparecendo"]),
    corpo: (c) => [
      `Vi que voc\xEA j\xE1 passou de ${Q(c.r)}, e queria te dar uma boa not\xEDcia: a base est\xE1 aparecendo.`,
      "Nessa fase, a gente j\xE1 vai bem no que estudou, e o que escapa \xE9 o que ainda n\xE3o viu. \xC9 um \xF3timo sinal: quer dizer que o estudo est\xE1 funcionando.",
      `O pr\xF3ximo passo, se fizer sentido, \xE9 transformar as quest\xF5es que te pegaram em acertos. O Caderno de erros guarda todas elas, e vale refazer com calma: ${c.link("erros")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      "Seu estudo est\xE1 a caminho de um patamar novo, e daqui para a frente cada revis\xE3o conta muito.",
      c.dica(),
      c.ps()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "voc\xEA est\xE1 na virada", "Voc\xEA est\xE1 na virada")],
    corpo: (c) => [
      "Passei para dizer que est\xE1 tudo certo com o seu ritmo. Gosto muito do que estou vendo.",
      "Uma compara\xE7\xE3o de que eu gosto: os primeiros acertos v\xEAm do que voc\xEA j\xE1 sabia; os pr\xF3ximos v\xEAm do que voc\xEA aprende com as quest\xF5es que te pegam. Voc\xEA est\xE1 bem na virada.",
      `Que tal come\xE7ar pela Revis\xE3o do dia, antes das quest\xF5es novas? ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "uma dica curta", "Uma dica curta"), "Vinte quest\xF5es de um tema s\xF3"],
    corpo: (c) => [
      "Uma dica curta, de presente: escolher a \xE1rea que mais te desafia e fazer vinte quest\xF5es s\xF3 dela nesta semana.",
      c.fato("areaFraca"),
      "Concentrar num tema por vez deixa os padr\xF5es da banca bem mais claros.",
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "um empurr\xE3ozinho", "Um empurr\xE3ozinho"), "A revis\xE3o que vale ouro"],
    corpo: (c) => [
      "Vi o seu estudo por aqui e quis te mandar um empurr\xE3ozinho.",
      `Com ${Q(c.r)}, voc\xEA j\xE1 tem material para a revis\xE3o que mais rende. Que tal, amanh\xE3, abrir a Revis\xE3o do dia antes das quest\xF5es novas? Leva poucos minutos.`,
      c.obs(1),
      c.ps()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "o seu estudo rende mais do que parece", "O seu estudo rende mais do que parece")],
    corpo: (c) => [
      "Escrevo porque gosto de acompanhar quem est\xE1 construindo a base, e \xE9 isso que eu vejo no seu caso.",
      "Os n\xFAmeros costumam mostrar o que a gente aprendeu com algumas semanas de atraso. O que voc\xEA est\xE1 estudando agora vai aparecer l\xE1 na frente. Siga no seu ritmo.",
      c.fecho()
    ]
  }
];
var ativo_40_60 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, ["A fase em que mais d\xE1 para crescer"]),
    corpo: (c) => [
      `Olhei o seu estudo com calma e vi ${Q(c.r)} respondidas, com uma base que j\xE1 aparece.`,
      "Voc\xEA est\xE1 na fase em que mais d\xE1 para crescer. J\xE1 tem base para aproveitar bem os coment\xE1rios, e cada quest\xE3o revisada agora vira ponto na prova.",
      c.dica(),
      `A Revis\xE3o do dia fica aqui: ${c.link("revisao")}`
    ]
  },
  {
    id: "v2",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      c.pctBom !== null ? `Seu acerto est\xE1 em ${c.pctBom}%, j\xE1 passando da metade. Daqui, o que mais rende \xE9 dar uma aten\xE7\xE3o especial, por alguns dias, ao tema que mais te desafia.` : "Voc\xEA est\xE1 bem no meio do caminho, que \xE9 onde mais d\xE1 para crescer. Daqui, o que mais rende \xE9 dar uma aten\xE7\xE3o especial, por alguns dias, ao tema que mais te desafia.",
      c.fecho(),
      c.ps()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "uma dica que pode virar o jogo", "Uma dica que pode virar o jogo")],
    corpo: (c) => [
      "Uma dica que pode virar o jogo para voc\xEA: refazer as quest\xF5es que te pegaram antes de partir para as novas. Parece contraintuitivo, mas \xE9 o caminho mais curto para subir.",
      `O Caderno de erros guarda todas: ${c.link("erros")}`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "parab\xE9ns pela const\xE2ncia", "Parab\xE9ns pela const\xE2ncia")],
    corpo: (c) => [
      `Passando para te dar parab\xE9ns pela const\xE2ncia. ${cap(Q(c.r))} n\xE3o aparecem sozinhas.`,
      "Agora que voc\xEA est\xE1 no meio do caminho, os detalhes come\xE7am a fazer diferen\xE7a: classifica\xE7\xE3o, ep\xF4nimo, exce\xE7\xE3o. \xC9 o que leva um bom estudo a um \xF3timo.",
      c.ps()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "qual tema mais te desafia?", "Qual tema mais te desafia?")],
    corpo: (c) => [
      "Me conta uma coisa: qual tema est\xE1 te desafiando mais?",
      "Pergunto porque, no seu momento, um tema s\xF3 costuma fazer uma bela diferen\xE7a. Se a gente descobrir qual, d\xE1 para crescer r\xE1pido.",
      c.fatos.areaFraca ? `Pelo que vi, ${c.area(c.fatos.areaFraca.slug).em} pode ser um bom candidato.` : null,
      "\xC9 s\xF3 responder este e-mail. Vou gostar de ajudar."
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "um h\xE1bito pequeno", "Um h\xE1bito pequeno"), "Do acerto com d\xFAvida \xE0 certeza"],
    corpo: (c) => [
      "Vi que voc\xEA est\xE1 estudando com regularidade, e isso me deixou feliz.",
      "Queria sugerir um h\xE1bito pequeno: toda vez que acertar com d\xFAvida, marcar a quest\xE3o como favorita e voltar nela depois. Assim o acerto vira certeza e fica para a prova.",
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v7",
    assuntos: (c) => assuntosAtivo(c, ["No meio do caminho"]),
    corpo: (c) => [
      `${cap(Q(c.r))} e uma base que j\xE1 aparece. Sabe o que isso quer dizer? Que voc\xEA tem ch\xE3o firme e muito espa\xE7o para crescer, ao mesmo tempo.`,
      c.obs(1),
      "Se eu puder sugerir uma coisa para as pr\xF3ximas semanas: um pouco de quest\xE3o nova todo dia e a Revis\xE3o em dia. Simples assim, e funciona.",
      c.fecho()
    ]
  }
];
var ativo_60_70 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "seu acerto passou dos 60%", "Seu acerto passou dos 60%")]),
    corpo: (c) => [
      "Seu acerto passou dos 60%, e eu quis passar para te dar os parab\xE9ns. Fiquei muito feliz de ver.",
      "\xC9 o ponto em que a base j\xE1 est\xE1 firme e o que falta s\xE3o os detalhes. Uma boa ideia agora \xE9 dar um carinho especial aos temas que ainda est\xE3o abaixo da sua m\xE9dia.",
      c.obs(1),
      `Para escolher o tema: ${c.link("treinar")}`
    ]
  },
  {
    id: "v2",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      `Com ${c.pct}% de acerto, voc\xEA est\xE1 num patamar muito bom. O pr\xF3ximo salto costuma vir da revis\xE3o: as quest\xF5es que te pegam uma segunda vez s\xE3o as mais valiosas.`,
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "est\xE1 bonito o seu estudo", "Est\xE1 bonito o seu estudo")],
    corpo: (c) => [
      "S\xF3 para dizer: est\xE1 bonito o seu estudo.",
      `${cap(Q(c.r))}, ${c.pct}% de acerto e muita const\xE2ncia. D\xE1 para ver que voc\xEA leva isso a s\xE9rio.`,
      c.ps()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "uma dica para a sua fase", "Uma dica para a sua fase"), "Vale ler mesmo quando acerta"],
    corpo: (c) => [
      "Uma dica para quem j\xE1 est\xE1 na sua fase: ler o coment\xE1rio mesmo quando acertar. \xC0s vezes ele traz justamente o detalhe que a banca adora explorar.",
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v5",
    requer: (c) => !!(c.fatos.melhorArea || c.fatos.areaFraca),
    assuntos: (c) => assuntosAtivo(c, ["Seu desempenho por tema"]),
    corpo: (c) => [
      "Fiquei olhando o seu desempenho por tema, com calma.",
      J(c.fato("melhorArea"), c.fato("areaFraca")),
      `\xC9 um retrato bem claro de onde cada hora rende mais. Os temas ficam aqui: ${c.link("dados")}`,
      c.fecho()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "d\xE1 para ver o seu progresso", "D\xE1 para ver o seu progresso")],
    corpo: (c) => [
      "Escrevo porque voc\xEA est\xE1 naquela fase boa do estudo, em que d\xE1 para ver o progresso.",
      "Mais da metade certa, e com base firme. Agora \xE9 ir fechando os detalhes, um tema por vez.",
      c.dica(),
      c.ps()
    ]
  }
];
var ativo_70_80 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "que trabalho bonito", "Que trabalho bonito")]),
    corpo: (c) => [
      `${c.pct}% de acerto em ${Q(c.r)}. Que trabalho bonito.`,
      'Nessa fase, os pontos que faltam est\xE3o nos detalhes: o n\xFAmero da classifica\xE7\xE3o, a exce\xE7\xE3o, o "exceto" do enunciado. Uma ideia: ler o enunciado duas vezes antes de marcar.',
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v2",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      "Voc\xEA j\xE1 tem um acerto de quem domina boa parte da mat\xE9ria, e eu admiro muito isso. Manter a revis\xE3o em dia \xE9 o que segura esse n\xFAmero l\xE1 em cima.",
      c.ps()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "parab\xE9ns pelo seu desempenho", "Parab\xE9ns pelo seu desempenho")],
    corpo: (c) => [
      "Passei para te dar parab\xE9ns pelo seu desempenho. Mais de 70% em quest\xE3o de prova \xE9 resultado de muito estudo.",
      c.obs(1),
      `Daqui para a frente, o segredo \xE9 manter a revis\xE3o em dia: ${c.link("revisao")}`
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "que tal treinar com o rel\xF3gio?", "Que tal treinar com o rel\xF3gio?"), "Uma sugest\xE3o para a sua fase"],
    corpo: (c) => [
      "Uma sugest\xE3o para quem est\xE1 na sua fase: que tal come\xE7ar a cronometrar?",
      "Saber a resposta \xE9 uma coisa. Saber em um minuto e meio, com o rel\xF3gio correndo, \xE9 outra. Treinar com tempo deixa a prova com cara de mais uma sess\xE3o de estudo.",
      c.fecho(),
      c.ps()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "sua opini\xE3o vale muito", "Sua opini\xE3o vale muito"), "O que mais te ajuda no site?"],
    corpo: (c) => [
      `Voc\xEA est\xE1 com ${c.pct}% de acerto em ${Q(c.r)}, e isso me fez querer te ouvir.`,
      "O que mais est\xE1 te ajudando no site? E o que voc\xEA mudaria? Quem estuda como voc\xEA \xE9 quem mais me ensina o que manter e o que melhorar.",
      "Pode responder em uma linha s\xF3. Eu leio tudo."
    ]
  },
  {
    id: "v6",
    assuntos: (c) => assuntosAtivo(c, ["Const\xE2ncia com qualidade"]),
    corpo: (c) => [
      "Seu hist\xF3rico mostra uma coisa que eu admiro muito: const\xE2ncia com qualidade.",
      c.obs(1),
      c.dica(),
      c.fecho()
    ]
  }
];
var ativo_80_90 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "precisei olhar duas vezes", "Precisei olhar duas vezes")]),
    corpo: (c) => [
      `${c.pct}% de acerto. Precisei olhar duas vezes, de t\xE3o bonito.`,
      "Voc\xEA est\xE1 acertando a maior parte do que aparece, sinal de mat\xE9ria bem consolidada. Nesse n\xEDvel, o que ainda d\xE1 para ganhar est\xE1 nas quest\xF5es que voltam a te pegar. Vale dar um carinho especial a elas.",
      `O Caderno de erros ajuda nisso: ${c.link("erros")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      `E um acerto de ${c.pct}%. Parab\xE9ns, de verdade.`,
      c.ps()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "proteja o que voc\xEA j\xE1 conquistou", "Proteja o que voc\xEA j\xE1 conquistou")],
    corpo: (c) => [
      "Escrevo s\xF3 para reconhecer: voc\xEA est\xE1 estudando num n\xEDvel muito alto, e eu admiro muito isso.",
      `Uma ideia para proteger o que voc\xEA j\xE1 conquistou: a revis\xE3o espa\xE7ada. Mat\xE9ria bem sabida tamb\xE9m esfria se ficar parada, e a Revis\xE3o cuida disso: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "posso te pedir uma ajuda?", "Posso te pedir uma ajuda?"), "Um pedido para quem estuda como voc\xEA"],
    corpo: (c) => [
      "Com o seu desempenho, voc\xEA tem muito a ensinar, e eu queria te pedir uma ajuda.",
      "Se algum coment\xE1rio do site estiver incompleto, ou se voc\xEA discordar de algum gabarito, me escreve? Quem tem o seu olhar \xE9 quem mais ajuda a deixar o banco melhor para todo mundo.",
      c.obs(1)
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "uma ideia: misturar as provas", "Uma ideia: misturar as provas")],
    corpo: (c) => [
      c.obs(1) ?? `Vi as suas ${Q(c.r)}, com ${c.pct}% de acerto. Que alegria ver isso.`,
      "Uma ideia para quem est\xE1 no seu n\xEDvel: misturar as provas. Treinar TEOT, TARO e R4 na mesma sess\xE3o obriga a reconhecer o tema sem a pista do contexto, como no dia da prova.",
      `D\xE1 para montar assim: ${c.link("treinar")}`
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "s\xF3 passei para dizer que vi", "S\xF3 passei para dizer que vi")],
    corpo: (c) => [
      `${c.pct}% de acerto em ${Q(c.r)}. S\xF3 passei para dizer que vi, e que est\xE1 lindo.`,
      c.ps()
    ]
  }
];
var ativo_90_100 = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "como voc\xEA estuda?", "Como voc\xEA estuda?"), "Fiquei curioso"],
    corpo: (c) => [
      `Olhei os n\xFAmeros duas vezes para ter certeza: ${c.pct}% de acerto em ${Q(c.r)}.`,
      "\xC9 um desempenho excepcional. Fiquei curioso: como voc\xEA estuda? Se puder me contar, responde este e-mail. Queria muito entender o que est\xE1 funcionando t\xE3o bem."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => assuntosAtivo(c, ["Voc\xEA est\xE1 acertando quase tudo"]),
    corpo: (c) => [
      "Voc\xEA est\xE1 acertando quase tudo, e eu fiquei muito feliz de ver.",
      c.obs(1),
      `Nesse n\xEDvel, o \xFAnico cuidado \xE9 n\xE3o deixar a mat\xE9ria esfriar. A Revis\xE3o do dia segura isso em poucos minutos: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "parab\xE9ns, de verdade", "Parab\xE9ns, de verdade"), "Algu\xE9m reparou"],
    corpo: (c) => [
      "Parab\xE9ns, de verdade.",
      "Acima de 90% em quest\xE3o de prova de t\xEDtulo \xE9 resultado de muito trabalho, e eu quis que voc\xEA soubesse que algu\xE9m reparou.",
      c.ps()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "posso te pedir uma ajuda?", "Posso te pedir uma ajuda?"), "Me ajuda a deixar o banco melhor?"],
    corpo: (c) => [
      "Queria te pedir uma ajuda: se encontrar algum erro, coment\xE1rio fraco ou gabarito discut\xEDvel, me avisa?",
      `Com ${c.pct}% de acerto, voc\xEA enxerga detalhes que fazem diferen\xE7a para todo mundo que estuda aqui.`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => assuntosAtivo(c, ["Uma sugest\xE3o para quem est\xE1 no topo"]),
    corpo: (c) => [
      c.obs(1) ?? "Acompanho o seu estudo com admira\xE7\xE3o, e queria deixar uma sugest\xE3o.",
      c.p.assinante ? "Para quem j\xE1 est\xE1 no topo, o pr\xF3ximo degrau s\xE3o as quest\xF5es que a turma mais erra. Treinar por elas mostra o pouco que ainda escapa." : "Para quem j\xE1 est\xE1 no topo, o pr\xF3ximo degrau s\xE3o os temas que voc\xEA menos estudou. \xC9 ali que ainda pode haver alguma surpresa.",
      c.fecho()
    ]
  },
  {
    id: "v6",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      "N\xE3o tenho nada a sugerir, s\xF3 a agradecer pelo exemplo. Continue assim."
    ]
  }
];
var quandoConta = (c) => {
  const d = Math.max(0, Math.round(Number(c.p.diasConta) || 0));
  return c.quando(d);
};
var nunca_comecou = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "o pr\xF3ximo passo \xE9 pequeno", "O pr\xF3ximo passo \xE9 pequeno"), "Sobre a sua conta no Orto Quest\xF5es", nm(c, "uma quest\xE3o s\xF3", "Uma quest\xE3o s\xF3")],
    corpo: (c) => [
      `Vi que voc\xEA criou a sua conta no Orto Quest\xF5es ${quandoConta(c)}, e fiquei muito feliz. Obrigado pela confian\xE7a.`,
      `Se quiser um primeiro passo bem leve: responder uma quest\xE3o s\xF3. Uma. Ler o coment\xE1rio de cada alternativa e ver se o jeito do site combina com voc\xEA: ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "que bom ter voc\xEA por aqui", "Que bom ter voc\xEA por aqui"), "Um oi de quem cuida do site"],
    corpo: () => [
      "Passei para dar um oi. Sou eu que cuido do site, e gosto de escrever para quem acabou de chegar.",
      "Quando tiver dez minutos livres, que tal cinco quest\xF5es de um tema de que voc\xEA goste? \xC9 o bastante para pegar o jeito.",
      "E se travar em qualquer coisa, me responde aqui. Vou gostar de ajudar."
    ]
  },
  {
    id: "v3",
    requer: (c) => !!(c.fatos.prova || c.fatos.etapa),
    assuntos: (c) => [nm(c, "por onde come\xE7ar", "Por onde come\xE7ar"), c.fatos.prova === "teot" && "Come\xE7ando para o TEOT"],
    corpo: (c) => [
      J(c.fato("prova"), c.fato("etapa")),
      `O jeito mais gostoso de come\xE7ar \xE9 pelo tema de que voc\xEA mais gosta. Come\xE7ar pelo que d\xE1 prazer ajuda a criar o h\xE1bito; o resto vem depois. Fica aqui: ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "s\xF3 tr\xEAs quest\xF5es", "S\xF3 tr\xEAs quest\xF5es"), "Sua conta est\xE1 pronta"],
    corpo: (c) => [
      "Sua conta est\xE1 pronta, esperando por voc\xEA.",
      "Uma ideia: no pr\xF3ximo intervalo do plant\xE3o, abrir o site no celular e responder tr\xEAs quest\xF5es. S\xF3 tr\xEAs, para sentir como \xE9.",
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "uma coisa sobre as quest\xF5es daqui", "Uma coisa sobre as quest\xF5es daqui")],
    corpo: (c) => [
      "Uma curiosidade sobre o site: cada quest\xE3o tem a explica\xE7\xE3o de todas as alternativas, n\xE3o s\xF3 da certa. \xC9 ali que mais se aprende, e \xE9 a parte em que eu mais caprichei.",
      `Que tal ver como funciona com uma quest\xE3o s\xF3? ${c.link("treinar")}`,
      c.ps()
    ]
  },
  {
    id: "v6",
    requer: (c) => (c.p.diasConta ?? 0) > 3,
    assuntos: (c) => [nm(c, "sem pressa", "Sem pressa"), "Quando a rotina der folga"],
    corpo: (c) => [
      "Imagino que a rotina esteja puxada desde que voc\xEA criou a conta. Plant\xE3o, aula, vida.",
      "Sem pressa nenhuma. Quando der, um come\xE7o pequeno j\xE1 basta: um tema, cinco quest\xF5es, sem se preocupar com nada. O site guarda tudo, e a Revis\xE3o cuida do resto.",
      c.fecho()
    ]
  }
];
var boas_vindas = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "que bom come\xE7o", "Que bom come\xE7o"), "Tr\xEAs coisas para os primeiros dias"],
    corpo: (c) => [
      `Vi que voc\xEA chegou ao Orto Quest\xF5es h\xE1 pouco e j\xE1 respondeu ${Q(c.r)}. Que bom come\xE7o.`,
      "Tr\xEAs coisas que ajudam nos primeiros dias, de presente: ler o coment\xE1rio mesmo quando acertar, deixar a Revis\xE3o trazer de volta as quest\xF5es que te pegaram e n\xE3o se preocupar com n\xFAmeros agora.",
      "Qualquer d\xFAvida, \xE9 s\xF3 responder este e-mail. Vou gostar de ajudar."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "que bom ter voc\xEA por aqui", "Que bom ter voc\xEA por aqui")],
    corpo: (c) => [
      "Que bom ter voc\xEA por aqui. Sou eu que cuido do site, e gosto de escrever para quem est\xE1 chegando.",
      J(c.obs(1, ["prova", "etapa"])),
      `As suas primeiras ${Q(c.r)} j\xE1 est\xE3o salvas, e as que te pegaram v\xE3o voltar na Revis\xE3o no momento certo: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "um conselho de quem fez o site", "Um conselho de quem fez o site")],
    corpo: (c) => [
      "Um conselho de quem fez o site, se servir: pouco e todo dia rende mais do que muito de vez em quando.",
      `Voc\xEA j\xE1 come\xE7ou, com ${Q(c.r)}. Se conseguir manter umas dez por dia, em um m\xEAs o h\xE1bito est\xE1 criado e o seu estudo come\xE7a a contar uma hist\xF3ria bonita.`,
      c.ps()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "vi a sua chegada", "Vi a sua chegada")],
    corpo: (c) => [
      "Escrevo para dizer que vi a sua chegada, e que fico feliz de ter mais algu\xE9m estudando ortopedia com tanta vontade por aqui.",
      J(c.fato("prova"), c.fato("etapa")),
      "Se encontrar qualquer coisa estranha numa quest\xE3o ou tiver uma ideia, me conta. O site melhora muito com isso.",
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "o melhor do site", "O melhor do site"), "Uma dica para a primeira semana"],
    corpo: (c) => [
      `${cap(Q(c.r))} em poucos dias. Que bom come\xE7o.`,
      "Uma dica para a primeira semana: quando uma quest\xE3o te pegar, ler por que cada alternativa est\xE1 certa ou errada. \xC9 o que o site tem de melhor.",
      c.fecho()
    ]
  },
  {
    id: "v6",
    requer: temFatos,
    assuntos: (c) => [nm(c, "reparei no seu come\xE7o", "Reparei no seu come\xE7o")],
    corpo: (c) => [
      J("Reparei no seu come\xE7o por aqui, e fiquei feliz.", c.obs(1, ["horario", "prova", "etapa"])),
      `${cap(Q(c.r))} em poucos dias j\xE1 mostram muita vontade. O pr\xF3ximo passo \xE9 deixar a Revis\xE3o trabalhar por voc\xEA: ela traz de volta, no momento certo, as quest\xF5es que te pegaram.`,
      c.fecho()
    ]
  }
];
var comecando = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "o come\xE7o \xE9 a parte mais dif\xEDcil", "O come\xE7o \xE9 a parte mais dif\xEDcil"), `Suas primeiras ${Q(c.r)}`],
    corpo: (c) => [
      `Vi que voc\xEA j\xE1 respondeu ${Q(c.r)}. O come\xE7o \xE9 a parte mais dif\xEDcil, e voc\xEA est\xE1 atravessando com vontade.`,
      "O que mais ajuda agora \xE9 const\xE2ncia: um pouco todo dia, mesmo nos dias corridos. O resto vem quase sem perceber.",
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "vi o seu come\xE7o", "Vi o seu come\xE7o")],
    corpo: (c) => [
      c.obs(1, ["prova", "etapa", "horario"]) ?? "Passei para ver como estava o seu come\xE7o por aqui, e gostei do que vi.",
      `Voc\xEA j\xE1 tem ${Q(c.r)} respondidas. Quando chegar \xE0s trinta, o site j\xE1 consegue te mostrar os temas em que voc\xEA mais brilha.`,
      c.dica(),
      `Para seguir: ${c.link("treinar")}`
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "cinco por dia", "Cinco por dia")],
    corpo: (c) => [
      "Uma ideia simples, se combinar com voc\xEA: cinco quest\xF5es por dia.",
      `Parece pouco, mas em um m\xEAs s\xE3o mais de cem. E com as ${Q(c.r)} que voc\xEA j\xE1 fez, o caminho est\xE1 aberto.`,
      c.ps()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "como est\xE1 sendo?", "Como est\xE1 sendo?")],
    corpo: (c) => [
      `Voc\xEA j\xE1 fez ${Q(c.r)} por aqui, e eu queria saber: como est\xE1 sendo?`,
      "Os coment\xE1rios est\xE3o ajudando? Alguma coisa ficou confusa no site? Pode responder do jeito que quiser. Eu leio tudo."
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "a Revis\xE3o vai trabalhar por voc\xEA", "A Revis\xE3o vai trabalhar por voc\xEA")],
    corpo: (c) => [
      "Uma coisa de que talvez ningu\xE9m tenha te falado: as quest\xF5es que te pegam voltam sozinhas na Revis\xE3o, no momento certo para fixar.",
      `Vale abrir de vez em quando, antes das quest\xF5es novas: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v6",
    requer: temFatos,
    assuntos: (c) => [nm(c, "uma coisa que reparei", "Uma coisa que reparei")],
    corpo: (c) => [
      c.obs(1, ["horario", "prova", "etapa", "maisEstudada"]),
      `E vi que voc\xEA j\xE1 est\xE1 com ${Q(c.r)}. Quando passar das trinta, d\xE1 para enxergar com mais clareza os temas em que voc\xEA mais brilha.`,
      `At\xE9 l\xE1, o melhor \xE9 seguir no seu ritmo: ${c.link("treinar")}`
    ]
  }
];
var comecou_parou = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "tudo o que voc\xEA fez continua salvo", "Tudo o que voc\xEA fez continua salvo"), "Sobre o seu come\xE7o"],
    corpo: (c) => [
      `Lembrei de voc\xEA: o seu come\xE7o no Orto Quest\xF5es, com ${Q(c.r)}, me deixou feliz. Sei como a rotina aperta, e acontece com todo mundo: o mais dif\xEDcil \xE9 transformar o come\xE7o em h\xE1bito.`,
      "O que mais funciona \xE9 pouco e todo dia. Cinco quest\xF5es por dia e, quando voc\xEA v\xEA, j\xE1 passou de cem. Tudo o que voc\xEA fez continua salvo, e as quest\xF5es que te pegaram voltam na Revis\xE3o no momento certo.",
      `Que tal fazer as pr\xF3ximas hoje, se der? ${c.link("treinar")}`
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "posso ajudar em alguma coisa?", "Posso ajudar em alguma coisa?")],
    corpo: (c) => [
      `Voc\xEA come\xE7ou com ${Q(c.r)}, e depois imagino que a rotina tenha apertado. Fiquei pensando se alguma coisa no site ficou confusa.`,
      "Se foi isso, me conta respondendo este e-mail, que eu ajudo. Se foi s\xF3 a rotina, tudo bem tamb\xE9m: o site fica aqui, do jeito que voc\xEA deixou.",
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "recome\xE7ar \xE9 mais f\xE1cil do que parece", "Recome\xE7ar \xE9 mais f\xE1cil do que parece")],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua \xFAltima quest\xE3o, e lembrei de voc\xEA.`,
      `Recome\xE7ar \xE9 mais f\xE1cil do que parece: abrir a Revis\xE3o, fazer as que est\xE3o esperando e pronto. Em dez minutos voc\xEA est\xE1 de volta: ${c.link("revisao")}`,
      c.obs(1, ["prova", "etapa"])
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "o come\xE7o \xE9 sempre assim", "O come\xE7o \xE9 sempre assim")],
    corpo: (c) => [
      "O come\xE7o \xE9 sempre assim: alguns dias de empolga\xE7\xE3o, depois a vida aperta. Acontece com todo mundo.",
      `As suas ${Q(c.r)} est\xE3o guardadas. Quando der, que tal voltar com cinco, de um tema de que voc\xEA goste?`,
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "uma ideia para voltar com leveza", "Uma ideia para voltar com leveza")],
    corpo: (c) => [
      "Uma ideia para voltar com leveza: no hor\xE1rio em que voc\xEA costuma estar no celular, trocar cinco minutos de rede social por tr\xEAs quest\xF5es.",
      `Parece bobo, mas \xE9 assim que o h\xE1bito pega. Suas ${Q(c.r)} j\xE1 est\xE3o l\xE1, esperando a pr\xF3xima.`,
      c.ps()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "o site fica aqui por voc\xEA", "O site fica aqui por voc\xEA")],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua \xFAltima quest\xE3o, e escrevo s\xF3 para dizer que lembrei de voc\xEA.`,
      `Se alguma coisa no site n\xE3o funcionou bem para voc\xEA, me conta? Isso me ajuda muito. E se foi s\xF3 a rotina, as suas ${Q(c.r)} est\xE3o esperando, sem pressa.`,
      c.fecho()
    ]
  }
];
var pausa = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "lembrei de voc\xEA", "Lembrei de voc\xEA"), "Uma sess\xE3o curta, se der"],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua \xFAltima sess\xE3o, e lembrei de voc\xEA.`,
      "Uma sess\xE3o curta costuma valer mais do que uma maratona no fim de semana. Dez quest\xF5es j\xE1 mant\xEAm o h\xE1bito vivo, e a Revis\xE3o j\xE1 separou as que pedem uma segunda olhada.",
      `Fica aqui o atalho, se quiser: ${c.link("revisao")}`
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "uma sess\xE3o curta hoje?", "Uma sess\xE3o curta hoje?")],
    corpo: (c) => [
      "S\xF3 um oi r\xE1pido: faz alguns dias desde a sua \xFAltima sess\xE3o, e senti falta de voc\xEA por aqui.",
      `Que tal quinze minutos hoje, se a rotina deixar? As suas ${Q(c.r)} est\xE3o salvas, \xE9 s\xF3 continuar de onde parou: ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "a Revis\xE3o est\xE1 pronta", "A Revis\xE3o est\xE1 pronta")],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua \xFAltima sess\xE3o, e a Revis\xE3o j\xE1 separou as quest\xF5es que pedem uma segunda olhada, para voltar no momento certo.`,
      `\xC9 o jeito mais leve de retomar: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "dez quest\xF5es hoje?", "Dez quest\xF5es hoje?")],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua \xFAltima quest\xE3o, e passei para te mandar um empurr\xE3ozinho gentil.`,
      `Dez quest\xF5es j\xE1 bastam para retomar o ritmo. Que tal come\xE7ar pelas que a Revis\xE3o separou? ${c.link("revisao")}`,
      c.fecho()
    ]
  }
];
var sumiu = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "senti sua falta por aqui", "Senti sua falta por aqui")],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a \xFAltima vez que te vi por aqui, e senti sua falta. Sei como a rotina aperta, e est\xE1 tudo bem: as suas ${Q(c.r)} e a sua Revis\xE3o continuam guardadas.`,
      `Para retomar com leveza, que tal abrir a Revis\xE3o e fazer s\xF3 as que est\xE3o esperando? Em quinze minutos voc\xEA est\xE1 de volta ao ritmo: ${c.link("revisao")}`,
      "Estou torcendo por voc\xEA."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "seu progresso est\xE1 guardado", "Seu progresso est\xE1 guardado")],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} que n\xE3o te vejo por aqui, e passei s\xF3 para dizer que o seu progresso est\xE1 todo guardado.`,
      c.pctBom !== null ? `${cap(Q(c.r))}, ${c.pctBom}% de acerto e um caderno de erros esperando por voc\xEA. Nada disso se perde.` : `${cap(Q(c.r))} respondidas e um caderno de erros esperando por voc\xEA. Nada disso se perde.`,
      "Quando a rotina der uma folga, uma sess\xE3o curta j\xE1 retoma o embalo.",
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "plant\xE3o, cansa\xE7o, vida", "Plant\xE3o, cansa\xE7o, vida")],
    corpo: (c) => [
      "Plant\xE3o, cansa\xE7o, vida: acontece com todo mundo. O que leva algu\xE9m at\xE9 a aprova\xE7\xE3o \xE9 voltar, n\xE3o ser perfeito.",
      `Que tal recome\xE7ar pequeno? Dez quest\xF5es hoje, dez amanh\xE3. O h\xE1bito volta mais r\xE1pido do que parece: ${c.link("treinar")}`,
      c.obs(1, ["prova", "melhorArea"])
    ]
  },
  {
    id: "v4",
    requer: (c) => !!c.fatos.melhorArea || !!c.fatos.maisEstudada,
    assuntos: (c) => [nm(c, "lembrei de voc\xEA", "Lembrei de voc\xEA")],
    corpo: (c) => [
      "Lembrei de voc\xEA olhando quem estudava por aqui.",
      c.obs(1, ["melhorArea", "maisEstudada"]),
      "Esse trabalho bonito continua todo aqui, esperando por voc\xEA. Quando der, uma sess\xE3o curta j\xE1 retoma o embalo.",
      c.fecho()
    ]
  },
  {
    id: "v5",
    requer: (c) => c.fatos.prova === "teot" || c.fatos.etapa === "r3",
    assuntos: (c) => [nm(c, "o TEOT est\xE1 chegando", "O TEOT est\xE1 chegando")],
    corpo: (c) => [
      `Faltam ${D(c.diasTeot)} para o TEOT, e lembrei de voc\xEA.`,
      `Ainda d\xE1 tempo de fazer muita coisa, e as suas ${Q(c.r)} j\xE1 s\xE3o um \xF3timo come\xE7o. Quando quiser retomar, a Revis\xE3o est\xE1 aqui: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "o site est\xE1 do jeito que voc\xEA deixou", "O site est\xE1 do jeito que voc\xEA deixou"), "Um recado curto"],
    corpo: (c) => [
      "S\xF3 um recado curto, com carinho: quando quiser voltar, o site est\xE1 do jeito que voc\xEA deixou.",
      `Suas ${Q(c.r)} e as quest\xF5es para revisar continuam l\xE1, esperando por voc\xEA.`,
      c.ps()
    ]
  }
];
var obrigado_assinatura = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "obrigado pela assinatura", "Obrigado pela assinatura"), "Obrigado, de verdade"],
    corpo: () => [
      "Vi que voc\xEA assinou o Orto Quest\xF5es e quis te escrever pessoalmente para agradecer.",
      "O site \xE9 um projeto independente. \xC9 a assinatura que paga o servidor e o tempo para manter as quest\xF5es e os coment\xE1rios em dia. Ent\xE3o, de cora\xE7\xE3o: obrigado.",
      "Se alguma coisa n\xE3o funcionar, ou se sentir falta de algo, me responde aqui. Eu leio tudo."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "obrigado pela confian\xE7a", "Obrigado pela confian\xE7a"), "Uma dica para come\xE7ar a assinatura"],
    corpo: (c) => [
      "Obrigado pela confian\xE7a. Fiquei muito feliz.",
      `Uma dica para a assinatura render desde o primeiro dia: montar o cronograma com a data da sua prova. Ele organiza o que estudar em cada dia, come\xE7ando pelo que mais cai: ${c.link("cronograma")}`,
      "E qualquer d\xFAvida, \xE9 s\xF3 responder."
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "fiquei muito feliz", "Fiquei muito feliz")],
    corpo: (c) => [
      "Fiquei muito feliz de ver a sua assinatura.",
      c.r > 0 ? `Voc\xEA j\xE1 tem ${Q(c.r)} por aqui${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ""}, e agora tem tudo liberado para ir at\xE9 a prova.` : "Agora voc\xEA tem tudo liberado para ir at\xE9 a prova.",
      "Meu compromisso \xE9 continuar melhorando as quest\xF5es e os coment\xE1rios. Se encontrar qualquer coisa estranha, me avisa?",
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "um obrigado de cora\xE7\xE3o", "Um obrigado de cora\xE7\xE3o")],
    corpo: (c) => [
      "Um obrigado curto, mas de cora\xE7\xE3o, pela assinatura.",
      "Ela mant\xE9m o site de p\xE9 para voc\xEA e para todo mundo que estuda aqui. Fico muito feliz de ter voc\xEA junto.",
      c.ps()
    ]
  },
  {
    id: "v5",
    requer: temFatos,
    assuntos: (c) => [nm(c, "obrigado, e uma coisa que reparei", "Obrigado, e uma coisa que reparei")],
    corpo: (c) => [
      "Obrigado por assinar o Orto Quest\xF5es.",
      c.obs(2),
      "Se quiser aproveitar desde j\xE1, o Simulado Nacional do m\xEAs e os temas que mais caem s\xE3o um \xF3timo come\xE7o. Mas, antes de tudo, obrigado.",
      c.fecho()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "quem assina mant\xE9m o site", "Quem assina mant\xE9m o site")],
    corpo: () => [
      "Escrevo para agradecer a sua assinatura.",
      "N\xE3o tem empresa grande por tr\xE1s do Orto Quest\xF5es. Tem eu, as quest\xF5es, os coment\xE1rios e quem assina. Agora voc\xEA faz parte disso, e isso me deixa muito feliz.",
      "Se tiver ideia, cr\xEDtica ou sugest\xE3o, a resposta deste e-mail chega direto para mim."
    ]
  }
];
var lista = (itens) => itens.map((t) => `- ${cap(t)}`).join("\n");
var eLista = (itens) => itens.length <= 1 ? itens.join("") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
var presente = (c) => `Antes de tudo, uma dica de presente. ${c.dica()}`;
var garantia = "E se n\xE3o for o que voc\xEA esperava, d\xE1 para pedir o reembolso em at\xE9 7 dias pelo pr\xF3prio site, sem precisar explicar nada.";
var convite_20 = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "uma dica e um convite", "Uma dica e um convite"), nm(c, "uma coisa que pode te ajudar", "Uma coisa que pode te ajudar")],
    corpo: (c) => [
      `Vi que voc\xEA j\xE1 respondeu ${Q(c.r)} no Orto Quest\xF5es, e fiquei feliz de ver voc\xEA por aqui.`,
      presente(c),
      `E, caso seja \xFAtil para a sua prepara\xE7\xE3o, queria te contar o que a assinatura libera:
${lista(c.beneficios(3))}`,
      `Se fizer sentido para o seu momento, os planos est\xE3o aqui: ${c.link("assinatura")}`,
      "Se n\xE3o for a hora, tudo bem tamb\xE9m. Fico feliz de te ver estudando do jeito que for."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "j\xE1 conhece o cronograma?", "J\xE1 conhece o cronograma?")],
    corpo: (c) => [
      "Uma pergunta: voc\xEA j\xE1 conhece o cronograma do site?",
      "Voc\xEA coloca a data da prova e ele monta a lista de cada dia, come\xE7ando pelo que mais cai. Se um plant\xE3o bagun\xE7ar a semana, ele se ajusta. Foi pensado para quem tem pouco tempo e um sonho grande.",
      `Faz parte da assinatura, junto com ${eLista(c.beneficios(3, true).filter((b) => !b.startsWith("o cronograma")).slice(0, 2))}. D\xE1 para ver uma pr\xE9via do seu antes de decidir qualquer coisa: ${c.link("cronograma")}`,
      c.fecho()
    ]
  },
  {
    id: "v3",
    requer: temFatos,
    assuntos: (c) => [nm(c, "vi o seu come\xE7o", "Vi o seu come\xE7o"), "Uma sugest\xE3o para o seu estudo"],
    corpo: (c) => [
      J(`Vi as suas ${Q(c.r)}, e quis te escrever.`, c.obs(1)),
      `Pelo jeito que voc\xEA estuda, acho que a assinatura combinaria com voc\xEA. Ela soma:
${lista(c.beneficios(3))}`,
      `${garantia} Os planos ficam aqui, se quiser olhar: ${c.link("assinatura")}`
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "tr\xEAs coisas que podem te ajudar", "Tr\xEAs coisas que podem te ajudar"), "Para chegar \xE0 prova com mais tranquilidade"],
    corpo: (c) => [
      "Sei que o seu tempo \xE9 precioso, ent\xE3o vou deixar esta carta curta.",
      `Voc\xEA j\xE1 fez ${Q(c.r)}, ent\xE3o j\xE1 conhece o jeito do site. Se a sua meta \xE9 chegar \xE0 prova com mais tranquilidade, a assinatura soma tr\xEAs coisas que ajudam muito:
${lista(c.beneficios(3))}`,
      `Se quiser olhar com calma: ${c.link("assinatura")}`,
      "Qualquer d\xFAvida, me responde. Vou gostar de ajudar."
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "quem assina mant\xE9m o site de p\xE9", "Quem assina mant\xE9m o site de p\xE9")],
    corpo: (c) => [
      "Uma curiosidade sobre o Orto Quest\xF5es: \xE9 um projeto independente, e quem assina \xE9 quem mant\xE9m o site de p\xE9.",
      `Al\xE9m de apoiar, a assinatura libera ${eLista(c.beneficios(3, true))}.`,
      `${garantia} Se quiser conhecer: ${c.link("assinatura")}`
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "se fizer sentido para voc\xEA", "Se fizer sentido para voc\xEA")],
    corpo: (c) => [
      `${cap(Q(c.r))} j\xE1 d\xE3o uma boa ideia de se o site combina com o seu jeito de estudar.`,
      `Se combinar, a assinatura leva isso adiante, na dire\xE7\xE3o da sua prova:
${lista(c.beneficios(3))}`,
      `Os planos est\xE3o aqui, se quiser olhar: ${c.link("assinatura")}`,
      c.fecho()
    ]
  },
  {
    id: "v7",
    requer: (c) => (c.p.viuPlanos ?? 0) > 0,
    assuntos: (c) => [nm(c, "sobre os planos", "Sobre os planos"), nm(c, "alguma d\xFAvida sobre os planos?", "Alguma d\xFAvida sobre os planos?")],
    corpo: (c) => [
      `Vi que voc\xEA deu uma olhada nos planos, e quis escrever para ajudar no que for preciso.`,
      "Se ficou alguma d\xFAvida, me responde que eu explico. \xC0s vezes \xE9 coisa simples, como a forma de pagamento ou o que acontece se o site n\xE3o for o que voc\xEA esperava.",
      `Resumindo o que a assinatura soma:
${lista(c.beneficios(3))}`,
      garantia
    ]
  }
];
var tomAcerto = (c) => {
  if (c.pct === null) return null;
  const p = c.pct;
  if (p >= 80) return c.um(`E com ${p}% de acerto, o que \xE9 admir\xE1vel.`, `${p}% de acerto, ali\xE1s. Parab\xE9ns, de verdade.`);
  if (p >= 70) return c.um(`E com ${p}% de acerto, um resultado muito bonito.`, `Com ${p}% de acerto, voc\xEA j\xE1 est\xE1 num patamar muito bom.`);
  if (p >= 60) return c.um(`E com ${p}% de acerto, uma base firme.`, `Seu acerto de ${p}% mostra uma base firme.`);
  if (p >= 50) return c.um(`Seu acerto de ${p}% j\xE1 passa da metade, e \xE9 exatamente a fase em que mais d\xE1 para crescer.`, "Voc\xEA est\xE1 no meio do caminho, que \xE9 onde mais d\xE1 para crescer.");
  if (p >= 40) return "Voc\xEA est\xE1 no meio do caminho, que \xE9 onde mais d\xE1 para crescer.";
  return c.um("D\xE1 para ver que voc\xEA \xE9 de quem n\xE3o desiste, e \xE9 isso que mais conta numa prepara\xE7\xE3o longa.", "Voc\xEA est\xE1 construindo a sua base com const\xE2ncia, e \xE9 nessa fase que um bom plano mais ajuda.");
};
var convite_50 = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "escrevi para voc\xEA", "Escrevi para voc\xEA"), nm(c, "um convite pessoal", "Um convite pessoal")],
    corpo: (c) => [
      J(`Estava olhando quem mais tem estudado por aqui e parei no seu nome: ${Q(c.r)}.`, c.obs(2)),
      tomAcerto(c),
      `Por isso quis te escrever pessoalmente. Acho que voc\xEA est\xE1 num ponto em que a assinatura pode fazer diferen\xE7a de verdade no seu caminho at\xE9 a prova, principalmente ${c.beneficios(1, true)[0]}.`,
      `Se quiser dar uma olhada: ${c.link("assinatura")}. E se tiver qualquer d\xFAvida, me responde aqui, que eu mesmo respondo.`
    ]
  },
  {
    id: "v2",
    requer: (c) => !!c.fatos.ranking,
    assuntos: (c) => [`${c.fatos.ranking}\xBA no ranking`, nm(c, "uma das pessoas que mais estudam aqui", "Uma das pessoas que mais estudam aqui")],
    corpo: (c) => [
      `Voc\xEA est\xE1 em ${c.fatos.ranking}\xBA no ranking geral, ou seja, entre as pessoas que mais estudam no Orto Quest\xF5es. Quis que voc\xEA soubesse que eu vi, e que fiquei feliz.`,
      J(c.obs(1, ["melhorArea", "horario", "prova"]), tomAcerto(c)),
      `Para quem estuda com essa dedica\xE7\xE3o, acho que a assinatura faz sentido: ${eLista(c.beneficios(3, true))}. ${garantia}`,
      `Os planos ficam aqui, se quiser olhar: ${c.link("assinatura")}`
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "uma conversa sobre o seu estudo", "Uma conversa sobre o seu estudo")],
    corpo: (c) => [
      `A ideia do Orto Quest\xF5es \xE9 ser o lugar onde se estuda pelas provas reais, com cada alternativa explicada. Ver algu\xE9m com ${Q(c.r)} me deixa feliz: quer dizer que a ideia est\xE1 funcionando.`,
      J(c.obs(1), tomAcerto(c)),
      presente(c),
      `Se voc\xEA quiser ir al\xE9m, a assinatura soma:
${lista(c.beneficios(3))}`,
      `Sem press\xE3o nenhuma. Se fizer sentido: ${c.link("assinatura")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    requer: (c) => c.fatos.prova === "teot" || c.fatos.etapa === "r3",
    assuntos: (c) => [nm(c, "faltam alguns meses para o TEOT", "Faltam alguns meses para o TEOT"), nm(c, "um plano at\xE9 o TEOT", "Um plano at\xE9 o TEOT")],
    corpo: (c) => [
      `Vi que voc\xEA est\xE1 estudando para o TEOT. Faltam ${D(c.diasTeot)}, e eu fico na torcida.`,
      J(`Com ${Q(c.r)} feitas, o que mais pode te ajudar agora \xE9 ter um plano at\xE9 l\xE1.`, tomAcerto(c)),
      `O cronograma da assinatura faz isso: voc\xEA diz a data e ele monta a lista de cada dia, come\xE7ando pelo que mais cai, e se ajusta quando a semana aperta. D\xE1 para ver uma pr\xE9via do seu: ${c.link("cronograma")}`,
      garantia
    ]
  },
  {
    id: "v5",
    requer: (c) => !!c.fatos.areaFraca,
    assuntos: (c) => [nm(c, "uma ideia para o tema que mais te desafia", "Uma ideia para o tema que mais te desafia")],
    corpo: (c) => [
      `Olhei as suas ${Q(c.r)} com calma, e quis te escrever.`,
      J(c.fato("melhorArea"), c.fato("areaFraca")),
      "Na assinatura, d\xE1 para ver os temas que mais caem em cada \xE1rea e como a turma respondeu cada alternativa. Ajuda muito a saber onde vale insistir, e mostra que muita gente trope\xE7a nas mesmas quest\xF5es.",
      `Se quiser conhecer: ${c.link("assinatura")}`,
      c.fecho()
    ]
  },
  {
    id: "v6",
    requer: (c) => !!c.fatos.flashcards && !!c.p.limiteGratisLigado,
    assuntos: (c) => [nm(c, "quest\xF5es e flashcards sem limite", "Quest\xF5es e flashcards sem limite")],
    corpo: (c) => [
      `Vi que voc\xEA usa as quest\xF5es e os flashcards: ${Q(c.r)} e ${N(c.fatos.flashcards)} cartas at\xE9 agora. Que dedica\xE7\xE3o.`,
      tomAcerto(c),
      `Com esse ritmo bonito, imagino que o limite di\xE1rio \xE0s vezes atrapalhe. Na assinatura, quest\xF5es e flashcards ficam sem limite, e ainda entram ${eLista(c.beneficios(3, true).filter((b) => !b.includes("sem limite")).slice(0, 2))}.`,
      `${garantia} Os planos ficam aqui, se quiser olhar: ${c.link("assinatura")}`
    ]
  },
  {
    id: "v7",
    requer: temFatos,
    assuntos: (c) => [nm(c, "um convite, com carinho", "Um convite, com carinho")],
    corpo: (c) => [
      J("Queria te fazer um convite, e n\xE3o \xE9 pelo n\xFAmero de quest\xF5es: \xE9 pelo jeito que voc\xEA estuda.", c.obs(2)),
      presente(c),
      `A assinatura foi pensada para quem estuda assim:
${lista(c.beneficios(3))}`,
      `${garantia} Se quiser conhecer: ${c.link("assinatura")}`
    ]
  }
];
var teotOuProva = (c) => c.fatos.prova === "teot" || !c.fatos.prova && (c.fatos.etapa === "r3" || c.fatos.etapa === "r4");
var reta_final = [
  {
    id: "v1",
    requer: teotOuProva,
    assuntos: (c) => [`Faltam ${D(c.diasTeot)} para o TEOT`, nm(c, "reta final", "Reta final")],
    corpo: (c) => [
      `Faltam ${D(c.diasTeot)} para o TEOT, em 10 de janeiro, e lembrei de voc\xEA.`,
      c.r > 0 ? `Ainda d\xE1 tempo de fazer muita coisa, e voc\xEA j\xE1 tem ${Q(c.r)} no caminho.` : "Ainda d\xE1 tempo de fazer muita coisa.",
      `Se ajudar, nesta fase eu priorizaria duas coisas: revisar as quest\xF5es que te pegaram e treinar os temas que mais caem. A Revis\xE3o fica aqui: ${c.link("revisao")}`,
      "Conte comigo nessa reta final."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "o que eu faria agora", "O que eu faria agora"), "A prova est\xE1 chegando"],
    corpo: (c) => [
      teotOuProva(c) ? `O TEOT est\xE1 a ${D(c.diasTeot)}, e estou na torcida.` : "A prova est\xE1 chegando, e estou na torcida.",
      "Se ajudar, eu faria assim no seu lugar: quest\xF5es novas pela manh\xE3, Revis\xE3o \xE0 noite e um simulado por semana para treinar o tempo.",
      c.obs(1, ["areaFraca", "melhorArea"]),
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "menos conte\xFAdo novo, mais revis\xE3o", "Menos conte\xFAdo novo, mais revis\xE3o")],
    corpo: (c) => [
      "Na reta final, o instinto \xE9 correr atr\xE1s de tudo o que falta. Mas o que mais rende \xE9 proteger o que voc\xEA j\xE1 sabe.",
      `${c.r > 0 ? `Com ${Q(c.r)} feitas, voc\xEA` : "Voc\xEA"} j\xE1 tem material para isso. O Caderno de erros \xE9 um \xF3timo lugar para come\xE7ar: ${c.link("erros")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    requer: (c) => !!c.fatos.areaFraca,
    assuntos: (c) => [nm(c, "um tema para a reta final", "Um tema para a reta final")],
    corpo: (c) => [
      teotOuProva(c) ? `Faltam ${D(c.diasTeot)} para o TEOT, e olhei os seus temas com carinho.` : "A prova est\xE1 chegando, e olhei os seus temas com carinho.",
      c.fato("areaFraca"),
      `Na reta final, dar aten\xE7\xE3o a um tema assim costuma render mais do que polir um que j\xE1 est\xE1 forte: ${c.link("treinar")}`
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "cuida de voc\xEA tamb\xE9m", "Cuida de voc\xEA tamb\xE9m")],
    corpo: (c) => [
      "Um lembrete que ningu\xE9m costuma dar na reta final: dormir tamb\xE9m \xE9 estudar.",
      `A mem\xF3ria se consolida no sono. Ent\xE3o, nestas \xFAltimas semanas, vale preferir menos horas bem dormidas a madrugadas de quest\xE3o.${c.fatos.horario === "madrugada" ? " Digo isso com carinho, porque vi que voc\xEA anda estudando de madrugada." : ""}`,
      "Voc\xEA j\xE1 fez muito. Agora \xE9 chegar com a cabe\xE7a descansada.",
      c.fecho()
    ]
  },
  {
    id: "v6",
    requer: (c) => !!c.fatos.melhorArea,
    assuntos: (c) => [nm(c, "proteja o seu ponto forte", "Proteja o seu ponto forte")],
    corpo: (c) => [
      teotOuProva(c) ? `Faltam ${D(c.diasTeot)} para o TEOT.` : "A prova est\xE1 chegando.",
      c.fato("melhorArea"),
      `Na reta final, vale manter esse tema aquecido com a Revis\xE3o e usar o tempo novo nos outros. Assim voc\xEA chega sem perder nada do que j\xE1 conquistou: ${c.link("revisao")}`,
      c.fecho()
    ]
  }
];
var nomeMarco = (m) => ({ 50: "cinquenta", 100: "cem", 250: "duzentas e cinquenta", 500: "quinhentas", 1e3: "mil", 2e3: "duas mil", 3e3: "tr\xEAs mil", 4e3: "quatro mil" })[m] ?? N(m);
var marco = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, `voc\xEA passou das ${N(c.marco)} quest\xF5es`, `Voc\xEA passou das ${N(c.marco)} quest\xF5es`), `${cap(nomeMarco(c.marco))} quest\xF5es`],
    corpo: (c) => [
      `${cap(nomeMarco(c.marco))} quest\xF5es! Passei para te dar parab\xE9ns.`,
      c.marco <= 100 ? "As primeiras cem s\xE3o as mais dif\xEDceis, porque \xE9 quando o h\xE1bito ainda est\xE1 nascendo. Daqui para a frente, o site come\xE7a a mostrar onde voc\xEA est\xE1 forte e onde vale insistir." : c.marco <= 500 ? "Isso j\xE1 n\xE3o \xE9 teste, \xE9 const\xE2ncia. A essa altura, o maior ganho costuma estar no tema que mais te desafia: com calma, ele cresce r\xE1pido." : "Poucas pessoas chegam aqui. Voc\xEA j\xE1 viu boa parte do que as bancas gostam de perguntar, e daqui em diante o que leva uma boa nota a uma \xF3tima \xE9 a revis\xE3o.",
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, `${N(c.marco)} quest\xF5es`, `${N(c.marco)} quest\xF5es respondidas`)],
    corpo: (c) => [
      `Vi que voc\xEA acabou de passar das ${N(c.marco)} quest\xF5es no Orto Quest\xF5es, e fiquei muito feliz.`,
      c.pctBom !== null ? `E com ${c.pctBom}% de acerto. Cada uma dessas quest\xF5es \xE9 um tema a mais que voc\xEA viu antes da prova.` : "Cada uma delas \xE9 um tema a mais que voc\xEA viu antes da prova.",
      `Para comemorar do jeito certo, que tal uma passada na Revis\xE3o? ${c.link("revisao")}`
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "um marco bonito", "Um marco bonito")],
    corpo: (c) => [
      `${cap(N(c.marco))} quest\xF5es. N\xE3o acontece por acaso: \xE9 a soma de muitos dias em que voc\xEA escolheu estudar, mesmo com sono.`,
      c.obs(2),
      "Parab\xE9ns, de verdade."
    ]
  },
  {
    id: "v4",
    requer: (c) => c.marco >= 500,
    assuntos: (c) => [nm(c, "isso \xE9 const\xE2ncia", "Isso \xE9 const\xE2ncia")],
    corpo: (c) => [
      `Quando algu\xE9m passa das ${N(c.marco)} quest\xF5es, eu fa\xE7o quest\xE3o de escrever.`,
      J("Isso \xE9 const\xE2ncia, e eu admiro muito.", c.obs(1), c.pctBom !== null ? `${c.pctBom}% de acerto, ali\xE1s.` : null),
      "Uma sugest\xE3o para a pr\xF3xima etapa: reler os coment\xE1rios das quest\xF5es que te pegaram mais de uma vez. \xC9 onde est\xE3o os pontos que ainda escapam.",
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "parab\xE9ns pelas suas quest\xF5es", "Parab\xE9ns pelas suas quest\xF5es")],
    corpo: (c) => [
      `S\xF3 um recado r\xE1pido: parab\xE9ns pelas ${N(c.marco)} quest\xF5es. Fiquei muito feliz de ver.`,
      c.ps()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, `${N(c.marco)} quest\xF5es, e contando`, `${N(c.marco)} quest\xF5es, e contando`)],
    corpo: (c) => [
      `Voc\xEA passou das ${N(c.marco)} quest\xF5es, e eu quis registrar.`,
      c.marco < 500 ? "O h\xE1bito j\xE1 existe. Agora o que mais rende \xE9 a Revis\xE3o: as quest\xF5es que te pegaram voltam no momento certo para virar acerto." : "A partir daqui, os pontos que faltam est\xE3o nos detalhes, e o Caderno de erros \xE9 o melhor mapa deles.",
      c.obs(1),
      c.fecho()
    ]
  }
];
var opiniao = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "posso te pedir uma opini\xE3o?", "Posso te pedir uma opini\xE3o?")],
    corpo: (c) => [
      c.r > 0 ? `Voc\xEA j\xE1 fez ${Q(c.r)} no Orto Quest\xF5es, ent\xE3o ningu\xE9m melhor para me dizer o que est\xE1 bom e o que d\xE1 para melhorar.` : "Queria muito a sua opini\xE3o sobre o site.",
      "O que voc\xEA mais usa? Sentiu falta de alguma coisa? Teve algum coment\xE1rio que n\xE3o ajudou? Pode responder do jeito que quiser, mesmo que seja uma linha. Eu leio todas."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "uma pergunta s\xF3", "Uma pergunta s\xF3")],
    corpo: () => [
      "Uma pergunta s\xF3: se voc\xEA pudesse mudar uma coisa no Orto Quest\xF5es, o que seria?",
      "Responde aqui mesmo? As melhores ideias do site vieram assim."
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "me ajuda a melhorar o site?", "Me ajuda a melhorar o site?")],
    corpo: (c) => [
      J("Estou planejando as pr\xF3ximas melhorias do site e queria ouvir quem estuda de verdade por aqui.", c.obs(1)),
      "Tr\xEAs perguntas r\xE1pidas, responde s\xF3 as que quiser:\n- O que faz voc\xEA voltar ao site?\n- O que poderia ser melhor?\n- O que voc\xEA gostaria que existisse?",
      "Obrigado desde j\xE1."
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "sua opini\xE3o importa muito", "Sua opini\xE3o importa muito")],
    corpo: () => [
      "Queria muito a sua opini\xE3o, inclusive sobre o que n\xE3o est\xE1 bom.",
      "Os coment\xE1rios das quest\xF5es est\xE3o ajudando? Est\xE3o longos demais, curtos demais? Tem alguma \xE1rea em que voc\xEA sente falta de mais coisa?",
      "\xC9 s\xF3 responder. Eu leio tudo e respondo."
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "o que est\xE1 faltando?", "O que est\xE1 faltando?")],
    corpo: (c) => [
      J(c.r > 0 ? `Vi as suas ${Q(c.r)} e fiquei com uma curiosidade.` : "Fiquei com uma curiosidade.", c.obs(1)),
      "O que est\xE1 faltando no Orto Quest\xF5es para ele ser o lugar onde voc\xEA mais gosta de estudar?",
      "Pode ser coisa grande ou pequena. Respondendo este e-mail, chega direto para mim."
    ]
  }
];
var indicar = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "um pedido", "Um pedido"), "O site cresce no boca a boca"],
    corpo: (c) => [
      "Queria te agradecer por estudar no Orto Quest\xF5es. O site \xE9 um projeto independente e cresce no boca a boca, ent\xE3o tenho um pedido: se ele te ajuda, que tal mandar o seu link para os colegas da resid\xEAncia?",
      "Quando um colega cria a conta pelo seu link e responde 20 quest\xF5es, voc\xEAs dois ganham 7 dias do plano completo. Vale para at\xE9 12 amigos.",
      `Seu link pessoal fica aqui: ${c.link("indicar")}`,
      "Muito obrigado."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "estudar junto rende mais", "Estudar junto rende mais")],
    corpo: (c) => [
      "Estudar junto rende mais, e deixa o ranking mais animado.",
      `Se tiver colegas se preparando para a prova, que tal mandar o seu link? Quando algu\xE9m cria a conta por ele e responde 20 quest\xF5es, voc\xEAs dois ganham 7 dias do plano completo. ${c.link("indicar")}`,
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "voc\xEA conhece algu\xE9m?", "Voc\xEA conhece algu\xE9m?")],
    corpo: (c) => [
      "Voc\xEA conhece algu\xE9m que est\xE1 estudando para o TEOT, para o TARO ou para o R4?",
      "Se conhecer, me ajuda muito mandar o Orto Quest\xF5es para essa pessoa. E ainda vale para voc\xEA: pelo seu link, cada colega que responde 20 quest\xF5es d\xE1 7 dias do plano completo para os dois.",
      `O link est\xE1 aqui: ${c.link("indicar")}`
    ]
  },
  {
    id: "v4",
    requer: temFatos,
    assuntos: (c) => [nm(c, "obrigado, e um pedido", "Obrigado, e um pedido")],
    corpo: (c) => [
      J("Obrigado por estar por aqui.", c.obs(1)),
      `Um pedido: se o site te ajuda, conta para um colega? Pelo seu link, voc\xEAs dois ganham 7 dias do plano completo quando a pessoa responde 20 quest\xF5es: ${c.link("indicar")}`,
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "manda para um colega?", "Manda para um colega?")],
    corpo: (c) => [
      "Um pedido r\xE1pido: se o Orto Quest\xF5es tem te ajudado, que tal mandar para um colega que esteja estudando tamb\xE9m?",
      `Pelo seu link pessoal, quando a pessoa cria a conta e responde 20 quest\xF5es, voc\xEAs dois ganham 7 dias do plano completo. Vale para at\xE9 12 amigos: ${c.link("indicar")}`,
      "Obrigado pela for\xE7a."
    ]
  }
];
var cronograma = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "conhece o cronograma?", "Conhece o cronograma?"), "Um plano at\xE9 a prova"],
    corpo: (c) => [
      "Queria te apresentar uma coisa de que o pessoal tem gostado bastante: o cronograma.",
      "Voc\xEA diz a data da prova e o site monta a meta de cada dia e os temas de cada semana, come\xE7ando pelo que mais cai no TEOT e no TARO. Se um dia atrasar, ele recalcula. Se adiantar, alivia.",
      `A pr\xE9via do seu cronograma \xE9 aberta, vale dar uma olhada: ${c.link("cronograma")}`
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "o que estudar hoje", "O que estudar hoje")],
    corpo: (c) => [
      'Sabe aquela d\xFAvida de todo dia, "o que eu estudo hoje"? O cronograma responde por voc\xEA.',
      J(c.fato("prova"), "Voc\xEA coloca a data da prova, e ele monta a lista de cada dia, com o que mais cai primeiro e dia de plant\xE3o sem quebrar o plano."),
      `D\xE1 para ver a pr\xE9via do seu: ${c.link("cronograma")}`,
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "uma ideia para organizar o estudo", "Uma ideia para organizar o estudo")],
    corpo: (c) => [
      c.r > 0 ? `Voc\xEA j\xE1 tem ${Q(c.r)} por aqui. Se quiser organizar as pr\xF3ximas, o cronograma pode ajudar.` : "Se quiser organizar o estudo at\xE9 a prova, o cronograma pode ajudar.",
      `Ele divide o que falta pelos dias at\xE9 a prova e diz o que estudar hoje. A pr\xE9via \xE9 aberta: ${c.link("cronograma")}`
    ]
  },
  {
    id: "v4",
    requer: teotOuProva,
    assuntos: (c) => [`Faltam ${D(c.diasTeot)} para o TEOT`],
    corpo: (c) => [
      `Faltam ${D(c.diasTeot)} para o TEOT. D\xE1 tempo de muita coisa, ainda mais com um plano.`,
      `O cronograma do site faz esse plano com voc\xEA: passa primeiro pelo que mais cai, se ajusta quando a semana aperta e termina com uma reta final de revis\xE3o. Veja a pr\xE9via do seu: ${c.link("cronograma")}`,
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "e se o plant\xE3o bagun\xE7ar a semana?", "E se o plant\xE3o bagun\xE7ar a semana?")],
    corpo: (c) => [
      "Se voc\xEA d\xE1 plant\xE3o, talvez j\xE1 tenha pensado nisso: e se o plant\xE3o bagun\xE7ar a semana de estudo?",
      "Foi para isso que o cronograma ganhou o dia de plant\xE3o. Voc\xEA marca, e ele redistribui o que ficou para tr\xE1s, sem quebrar o plano at\xE9 a prova.",
      `A pr\xE9via do seu \xE9 aberta: ${c.link("cronograma")}`,
      c.fecho()
    ]
  }
];
var dataCurta = (iso) => iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) : null;
var mesesDoPlano = (plano) => ({ mensal: "1 m\xEAs", semestral: "6 meses", anual: "12 meses" })[plano ?? ""] ?? null;
var nomePlano = (plano) => ({ mensal: "mensal", semestral: "semestral", anual: "anual" })[plano ?? ""] ?? null;
var pix_3_dias = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, `seu acesso vai at\xE9 ${dataCurta(c.pix?.fimEm) ?? "os pr\xF3ximos dias"}`, `Seu acesso vai at\xE9 ${dataCurta(c.pix?.fimEm) ?? "os pr\xF3ximos dias"}`)],
    corpo: (c) => {
      const d = Math.max(1, c.pix?.diasRestantes ?? 3), fim = dataCurta(c.pix?.fimEm), meses = mesesDoPlano(c.pix?.plano), plano = nomePlano(c.pix?.plano);
      return [
        `Passando com um lembrete amigo: o seu plano${plano ? ` ${plano}` : ""}, pago no Pix, vai at\xE9 ${fim ?? `daqui a ${D(d)}`}. Como o Pix n\xE3o renova sozinho, quis te avisar com calma.`,
        `Se quiser continuar, d\xE1 para renovar quando preferir, sem perder nenhum dia: os ${D(d)} que faltam continuam valendo e o per\xEDodo novo come\xE7a quando o atual termina${meses ? `. Renovando o mesmo plano, voc\xEA fica com esses ${D(d)} mais ${meses}` : ""}.`,
        c.r > 0 ? `Suas ${Q(c.r)}${c.pctBom !== null ? `, os ${c.pctBom}% de acerto` : ""} e o caderno de erros ficam guardados de qualquer jeito.` : null,
        `A renova\xE7\xE3o fica na p\xE1gina de planos: ${c.link("assinatura")}`
      ];
    }
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, `faltam ${D(Math.max(1, c.pix?.diasRestantes ?? 3))} do seu plano`, `Faltam ${D(Math.max(1, c.pix?.diasRestantes ?? 3))} do seu plano`)],
    corpo: (c) => {
      const d = Math.max(1, c.pix?.diasRestantes ?? 3), fim = dataCurta(c.pix?.fimEm);
      return [
        `Faltam ${D(d)} para terminar o acesso que voc\xEA pagou no Pix${fim ? ` (vai at\xE9 ${fim})` : ""}.`,
        c.fatos.semana ? `Vi que voc\xEA fez ${Q(c.fatos.semana)} s\xF3 na \xFAltima semana, que ritmo bonito. Quis avisar com anteced\xEAncia para nada interromper esse embalo.` : "Quis avisar com anteced\xEAncia para nada interromper o seu estudo.",
        `Se renovar antes, os dias que faltam n\xE3o se perdem: o per\xEDodo novo come\xE7a quando o atual termina. Fica tudo na p\xE1gina de planos: ${c.link("assinatura")}`,
        "Se preferir n\xE3o ter que lembrar, no cart\xE3o a assinatura renova sozinha, e d\xE1 para cancelar quando quiser em Minha conta."
      ];
    }
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "um lembrete sobre o seu Pix", "Um lembrete sobre o seu Pix")],
    corpo: (c) => {
      const fim = dataCurta(c.pix?.fimEm);
      return [
        `Um lembrete r\xE1pido, com carinho: o seu acesso pago no Pix vai at\xE9 ${fim ?? "os pr\xF3ximos dias"}.`,
        "Se quiser seguir estudando com tudo liberado, d\xE1 para renovar antes, sem perder os dias que ainda faltam.",
        `\xC9 pela p\xE1gina de planos: ${c.link("assinatura")}`,
        "Se tiver qualquer d\xFAvida sobre o pagamento, me responde aqui."
      ];
    }
  }
];
var pix_hoje = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "seu acesso vai at\xE9 hoje", "Seu acesso vai at\xE9 hoje")],
    corpo: (c) => {
      const meses = mesesDoPlano(c.pix?.plano), plano = nomePlano(c.pix?.plano);
      return [
        `Hoje \xE9 o \xFAltimo dia do seu plano${plano ? ` ${plano}` : ""} pago no Pix, e quis te avisar com carinho.`,
        `Se renovar hoje, voc\xEA segue sem nenhum dia de intervalo: o per\xEDodo novo come\xE7a quando o atual termina${meses ? ` e vale ${meses === "1 m\xEAs" ? "1 m\xEAs completo" : `${meses} completos`}` : ""}. Se renovar depois, ele come\xE7a no dia do pagamento.`,
        c.r > 0 ? `Suas ${Q(c.r)} e o caderno de erros ficam guardados, renovando ou n\xE3o.` : null,
        `A renova\xE7\xE3o fica aqui: ${c.link("assinatura")}`
      ];
    }
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "\xFAltimo dia do seu plano", "\xDAltimo dia do seu plano")],
    corpo: (c) => [
      "S\xF3 para n\xE3o ter surpresa amanh\xE3: o seu acesso pago no Pix vai at\xE9 hoje.",
      `Se quiser continuar, renovar hoje mant\xE9m tudo sem interrup\xE7\xE3o, inclusive a fila da Revis\xE3o. \xC9 pela p\xE1gina de planos: ${c.link("assinatura")}`,
      "E se preferir n\xE3o renovar agora, obrigado de cora\xE7\xE3o pelo tempo de assinatura. Seu progresso fica guardado, esperando por voc\xEA."
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "hoje \xE9 o \xFAltimo dia do seu Pix", "Hoje \xE9 o \xFAltimo dia do seu Pix")],
    corpo: (c) => [
      "Hoje \xE9 o \xFAltimo dia do acesso do seu plano pago no Pix.",
      c.r > 0 ? `Voc\xEA construiu bastante coisa aqui: ${Q(c.r)}${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ""}. Fico feliz de ver tudo isso.` : null,
      `Se quiser seguir, renovando hoje o per\xEDodo novo emenda no atual: ${c.link("assinatura")}`,
      "Qualquer d\xFAvida, me responde."
    ]
  }
];
var AREA_NOME = (slug, c) => c.area(slug)?.em ?? slug;
var PONTOS = (n) => n === 1 ? "1 ponto" : `${N(n)} pontos`;
var acertoDoPeriodo = (c) => {
  const r = c.relatorio;
  const a = r.certas + r.erradas > 0 ? Math.round(100 * r.certas / (r.certas + r.erradas)) : null;
  return { acerto: a, citavel: a !== null && r.respostas >= 10 && a >= 50 ? a : null, subiu: a !== null && r.respostas >= 10 && r.acertoAnterior !== null && a > r.acertoAnterior ? a - r.acertoAnterior : null };
};
var relatorio = [
  {
    id: "v1",
    assuntos: (c) => {
      const r = c.relatorio;
      return r.respostas > 0 ? [nm(c, `seu resumo ${r.rotulo}`, `Seu resumo ${r.rotulo}`), nm(c, `voc\xEA fez ${Q(r.respostas)} ${r.em}`, `Voc\xEA fez ${Q(r.respostas)} ${r.em}`)] : [nm(c, `seu resumo ${r.rotulo}`, `Seu resumo ${r.rotulo}`)];
    },
    corpo: (c) => {
      const r = c.relatorio;
      if (r.respostas <= 0) return [
        `${r.frase}, a rotina deve ter apertado, e est\xE1 tudo bem: acontece, e nada do que voc\xEA j\xE1 fez se perdeu.`,
        r.totalAcumulado > 0 ? `Suas ${Q(r.totalAcumulado)} continuam guardadas, e a Revis\xE3o j\xE1 separou as que pedem uma segunda olhada.` : null,
        `Quando quiser recome\xE7ar, dez quest\xF5es e a Revis\xE3o do dia j\xE1 colocam tudo nos trilhos: ${c.link("revisao")}`
      ];
      const { citavel, subiu } = acertoDoPeriodo(c);
      return [
        `${r.frase}, voc\xEA respondeu ${Q(r.respostas)} em ${D(Math.max(1, r.diasAtivos))} de estudo${citavel !== null ? `, com ${citavel}% de acerto` : ""}.${subiu !== null ? ` O seu acerto subiu ${PONTOS(subiu)} em rela\xE7\xE3o ao per\xEDodo anterior. Que bom ver isso.` : " Que bom ver voc\xEA estudando."}`,
        r.subiram.length ? `O que mais cresceu: ${r.subiram.map((t) => `${AREA_NOME(t.slug, c)} (mais ${PONTOS(t.agora - t.antes)})`).join(", ")}.` : null,
        r.cairam.length ? `Vale uma revisita com carinho: ${r.cairam.map((t) => AREA_NOME(t.slug, c)).join(", ")}.` : null,
        r.simulado && r.simulado.total > 0 && r.simulado.acertos / r.simulado.total >= 0.5 ? `No ${r.simulado.titulo}, voc\xEA fez ${r.simulado.acertos} de ${r.simulado.total}. Parab\xE9ns.` : r.simulado ? `Obrigado por encarar o ${r.simulado.titulo}: s\xF3 de fazer, j\xE1 \xE9 um \xF3timo treino.` : null,
        r.maisFraco && r.maisFraco.acerto < 70 ? `Para o pr\xF3ximo per\xEDodo, se fizer sentido, eu daria uma aten\xE7\xE3o especial a ${AREA_NOME(r.maisFraco.slug, c)}: \xE9 onde cada sess\xE3o vai render mais. ${c.link("treinar")}` : `Para o pr\xF3ximo per\xEDodo, que tal manter a Revis\xE3o em dia e abrir um tema que voc\xEA ainda quer explorar? ${c.link("revisao")}`
      ];
    }
  },
  {
    id: "v2",
    requer: (c) => (c.relatorio?.respostas ?? 0) > 0,
    assuntos: (c) => [nm(c, `como foi o seu estudo ${c.relatorio.em}`, `Como foi o seu estudo ${c.relatorio.em}`)],
    corpo: (c) => {
      const r = c.relatorio;
      const { citavel, subiu } = acertoDoPeriodo(c);
      return [
        `Passando com o seu resumo: ${Q(r.respostas)} ${r.em}, em ${D(Math.max(1, r.diasAtivos))}.${citavel !== null ? ` Acerto de ${citavel}%${subiu !== null ? `, ${PONTOS(subiu)} a mais que no per\xEDodo anterior` : ""}.` : subiu !== null ? ` E o seu acerto subiu ${PONTOS(subiu)} em rela\xE7\xE3o ao per\xEDodo anterior.` : ""}`,
        r.respostasAnterior > 0 && r.respostas > r.respostasAnterior ? `Foi mais do que no per\xEDodo anterior (${Q(r.respostasAnterior)}). Que bom sinal.` : "O que mais conta \xE9 seguir, e voc\xEA est\xE1 seguindo.",
        r.subiram.length ? `Destaque para ${AREA_NOME(r.subiram[0].slug, c)}, que cresceu ${PONTOS(r.subiram[0].agora - r.subiram[0].antes)}.` : null,
        r.totalAcumulado > 0 ? `No total, j\xE1 s\xE3o ${Q(r.totalAcumulado)} diferentes.` : null,
        r.maisFraco && r.maisFraco.acerto < 70 ? `Uma ideia para o pr\xF3ximo passo: ${AREA_NOME(r.maisFraco.slug, c)}, que \xE9 onde cada sess\xE3o vai render mais. ${c.link("treinar")}` : `Uma ideia para o pr\xF3ximo passo: manter a Revis\xE3o em dia. ${c.link("revisao")}`
      ];
    }
  },
  {
    id: "v3",
    requer: (c) => (c.relatorio?.respostas ?? 0) > 0,
    assuntos: (c) => [nm(c, "seus n\xFAmeros, em poucas linhas", "Seus n\xFAmeros, em poucas linhas")],
    corpo: (c) => {
      const r = c.relatorio;
      const { citavel, subiu } = acertoDoPeriodo(c);
      return [
        `Seus n\xFAmeros ${r.rotulo}, em poucas linhas:`,
        [
          `- ${cap(Q(r.respostas))} em ${D(Math.max(1, r.diasAtivos))}`,
          citavel !== null ? `- ${citavel}% de acerto` : null,
          subiu !== null ? `- Acerto subindo: mais ${PONTOS(subiu)} que no per\xEDodo anterior` : null,
          r.subiram.length ? `- Cresceu: ${r.subiram.map((t) => AREA_NOME(t.slug, c)).join(", ")}` : null,
          r.cairam.length ? `- Vale revisitar: ${r.cairam.map((t) => AREA_NOME(t.slug, c)).join(", ")}` : null
        ].filter(Boolean).join("\n"),
        `Quando quiser continuar, a Revis\xE3o j\xE1 est\xE1 pronta: ${c.link("revisao")}`
      ];
    }
  }
];
var VERSOES = {
  "ativo:0-10": ativo_0_10,
  "ativo:10-20": ativo_10_20,
  "ativo:20-30": ativo_20_30,
  "ativo:30-40": ativo_30_40,
  "ativo:40-60": ativo_40_60,
  "ativo:60-70": ativo_60_70,
  "ativo:70-80": ativo_70_80,
  "ativo:80-90": ativo_80_90,
  "ativo:90-100": ativo_90_100,
  nunca_comecou,
  boas_vindas,
  comecando,
  comecou_parou,
  pausa,
  sumiu,
  obrigado_assinatura,
  convite_20,
  convite_50,
  reta_final,
  marco,
  opiniao,
  indicar,
  cronograma,
  pix_3_dias,
  pix_hoje,
  relatorio
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
var ASSINATURA = "Um abra\xE7o,\nTales, do Orto Quest\xF5es";
var DATA_TEOT = "2027-01-10T12:00:00-03:00";
var MINIMO_PARA_ACERTO = 30;
var PALAVRAS_PROMOCAO = ["gr\xE1tis", "gratis", "gratuito", "oferta", "desconto", "aproveite", "imperd\xEDvel", "imperdivel", "promo\xE7\xE3o", "promocao", "\xFAltima chance", "ultima chance", "urgente", "compre", "r$"];
var SITE_PADRAO = "https://ortoquestoes.com.br/";
var numero = (n) => Math.round(n).toLocaleString("pt-BR");
var questoes = (n) => n === 1 ? "1 quest\xE3o" : `${numero(n)} quest\xF5es`;
var dias = (n) => n === 1 ? "1 dia" : `${numero(n)} dias`;
var AREAS = {
  // sabor[0] entra em elogio (melhor área); o último entra em "área mais estudada" e não
  // pode afirmar desempenho, só reconhecer o tema.
  "mao": { em: "m\xE3o e punho", de: "m\xE3o", sabor: ["\xC9 uma \xE1rea bem da hora, cheia de detalhe bonito de anatomia.", "M\xE3o \xE9 uma \xE1rea linda, e a banca adora cobrar.", "\xC1rea bem da hora, essa."] },
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
var MARCOS_CARTA = [50, 100, 250, 500, 1e3, 2e3, 3e3, 4e3];
function marcoRecente(respondidas, marcos = MARCOS_CARTA) {
  for (const m of [...marcos].reverse()) if (respondidas >= m && respondidas <= m + Math.max(30, Math.round(m * 0.05))) return m;
  return null;
}
var diasDesde = (iso, hoje) => (hoje.getTime() - new Date(iso).getTime()) / 864e5;
var familia = (modelo) => (modelo ?? "").split(":")[0];
function escolherTipo(p, anteriores = [], hoje = /* @__PURE__ */ new Date()) {
  const r = Math.max(0, Math.floor(Number(p.respondidas) || 0));
  const parado = p.diasParado ?? null;
  const conta = p.diasConta ?? 999;
  const recebeu = (f, dentroDeDias = Infinity) => anteriores.some((e) => (e.status ?? "enviado") !== "falhou" && familia(e.modelo) === f && diasDesde(e.em, hoje) <= dentroDeDias);
  const acerto = acertoCitavel({ ...p, respondidas: r });
  if (r === 0) return { tipo: "nunca_comecou", faixa: null, marco: null, motivo: "Ainda n\xE3o respondeu nenhuma quest\xE3o." };
  if (p.assinante && !recebeu("obrigado_assinatura")) return { tipo: "obrigado_assinatura", faixa: null, marco: null, motivo: "Assina e ainda n\xE3o recebeu o agradecimento." };
  if (parado !== null && parado >= 10) return { tipo: "sumiu", faixa: null, marco: null, motivo: `Sem responder h\xE1 ${dias(parado)}.` };
  if (r < MINIMO_PARA_ACERTO && parado !== null && parado >= 3) return { tipo: "comecou_parou", faixa: null, marco: null, motivo: `Fez ${questoes(r)} e parou h\xE1 ${dias(parado)}.` };
  if (r < MINIMO_PARA_ACERTO && conta <= 3) return { tipo: "boas_vindas", faixa: null, marco: null, motivo: "Chegou h\xE1 poucos dias e j\xE1 come\xE7ou." };
  const marco2 = marcoRecente(r, [100, 500, 1e3]);
  if (marco2 && !anteriores.some((e) => (e.tipo === "marco" || familia(e.modelo) === "marco") && (e.marco ?? null) === marco2) && !recebeu("marco", 20)) {
    return { tipo: "marco", faixa: null, marco: marco2, motivo: `Acabou de passar de ${numero(marco2)} quest\xF5es.` };
  }
  const provas = p.provas ?? [];
  const teot = provas.includes("teot") || !provas.length && (p.ano === "r3" || p.situacao === "r4");
  if (teot && diasAteTeot(hoje) <= 60 && !recebeu("reta_final", 30)) return { tipo: "reta_final", faixa: null, marco: null, motivo: `Faltam ${dias(diasAteTeot(hoje))} para o TEOT.` };
  if (!p.assinante && r > 20 && !recebeu("convite_20", 30) && !recebeu("convite_50", 30)) {
    return r > 50 ? { tipo: "convite_50", faixa: acerto === null ? null : faixaDe(acerto), marco: null, motivo: `N\xE3o assina e j\xE1 fez ${questoes(r)}.` } : { tipo: "convite_20", faixa: null, marco: null, motivo: `N\xE3o assina e j\xE1 fez ${questoes(r)}.` };
  }
  if (acerto === null) return { tipo: "comecando", faixa: null, marco: null, motivo: `Estudando, com ${questoes(r)} (pouco para falar de acerto).` };
  return { tipo: "ativo", faixa: faixaDe(acerto), marco: null, motivo: `Estudando, acerto de ${acerto}% (faixa ${ROTULO_FAIXA[faixaDe(acerto)]}).` };
}
function fatosDe(p) {
  const f = {};
  const geral = acertoCitavel(p);
  const areas = (p.areas ?? []).filter((a) => AREAS[a.slug] && a.total > 0 && a.certas >= 0 && a.certas <= a.total);
  const comAcerto = areas.filter((a) => a.total >= 15).map((a) => ({ ...a, pct: Math.round(100 * a.certas / a.total) }));
  const melhor = [...comAcerto].sort((a, b) => b.pct - a.pct || b.total - a.total)[0];
  if (melhor && melhor.pct >= 70 && (geral === null || melhor.pct >= geral + 5)) f.melhorArea = { slug: melhor.slug, pct: melhor.pct, total: melhor.total };
  const fraca = [...comAcerto].sort((a, b) => a.pct - b.pct || b.total - a.total)[0];
  if (fraca && geral !== null && fraca.pct < 60 && fraca.pct <= geral - 10 && fraca.slug !== f.melhorArea?.slug) f.areaFraca = { slug: fraca.slug, pct: fraca.pct, total: fraca.total };
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
  conta: "#/conta/assinatura"
};
function frasesDoFato(chave, f, mostrar) {
  const A = (slug) => AREAS[slug];
  switch (chave) {
    case "melhorArea": {
      const m = f.melhorArea, a = A(m.slug);
      return mostrar ? [
        `Parab\xE9ns por estar t\xE3o bem em ${a.em}: ${m.pct}% de acerto em ${questoes(m.total)}.`,
        `Reparei que ${a.em} \xE9 o seu ponto forte agora, com ${m.pct}% de acerto. Fiquei feliz de ver.`,
        `Em ${a.em} voc\xEA est\xE1 voando: ${m.pct}% em ${questoes(m.total)}.`,
        `Seu melhor tema hoje \xE9 ${a.em}. ${m.pct}% de acerto, e d\xE1 gosto de ver.`,
        `Vi que voc\xEA est\xE1 muito bem em ${a.em}. ${a.sabor[0]}`
      ] : [
        `Vi que voc\xEA est\xE1 indo muito bem em ${a.em}. ${a.sabor[0]}`,
        `Reparei que ${a.em} j\xE1 virou um ponto forte seu. Fiquei feliz de ver.`,
        `Em ${a.em} voc\xEA j\xE1 est\xE1 mandando muito bem, e isso diz muito sobre o seu estudo.`
      ];
    }
    case "maisEstudada": {
      const m = f.maisEstudada, a = A(m.slug);
      return [
        `Vi que tem bastante quest\xE3o de ${a.de} no seu hist\xF3rico. ${a.sabor[a.sabor.length - 1]}`,
        `Reparei que ${a.em} \xE9 o tema a que voc\xEA mais tem se dedicado: ${questoes(m.total)} at\xE9 agora.`,
        `Vi que voc\xEA anda firme em ${a.em}, com ${questoes(m.total)}. ${a.sabor[a.sabor.length - 1]}`,
        `${a.de.charAt(0).toUpperCase() + a.de.slice(1)} parece ser a sua praia por aqui: j\xE1 s\xE3o ${questoes(m.total)}.`
      ];
    }
    case "areaFraca": {
      const a = A(f.areaFraca.slug);
      return [
        `Se fizer sentido dar uma aten\xE7\xE3o especial a um tema, eu iria em ${a.em}: \xE9 onde cada sess\xE3o vai render mais para voc\xEA agora.`,
        `Reparei que ${a.em} \xE9 o tema com mais espa\xE7o para crescer no seu caso, o que \xE9 uma \xF3tima not\xEDcia: \xE9 ali que os pontos v\xEAm mais r\xE1pido.`,
        `Um palpite de quem olhou o seu estudo com carinho: alguns dias em ${a.em} podem fazer uma bela diferen\xE7a.`
      ];
    }
    case "horario":
      return {
        noite: ["Vi que voc\xEA estuda bastante \xE0 noite, depois de um dia inteiro. Isso diz muito sobre a sua dedica\xE7\xE3o.", "Reparei que quase tudo seu sai \xE0 noite, quando o dia j\xE1 acabou. Admiro muito isso.", "Vi que a noite \xE9 o seu hor\xE1rio de estudo. Respeito demais quem encontra esse tempo."],
        madrugada: ["Vi que muita quest\xE3o sua sai de madrugada. Admiro a dedica\xE7\xE3o, e s\xF3 pe\xE7o que cuide do sono tamb\xE9m, viu?", "Reparei que voc\xEA estuda at\xE9 de madrugada. Admiro muito, e lembro com carinho que o sono tamb\xE9m \xE9 estudo."],
        manha: ["Reparei que voc\xEA gosta de estudar cedo, antes de o dia come\xE7ar. Que jeito bonito de come\xE7ar o dia.", "Vi que voc\xEA estuda bastante de manh\xE3 cedo. Admiro essa disciplina."],
        almoco: ["Vi que muita quest\xE3o sua sai na hora do almo\xE7o. Que jeito esperto de encaixar o estudo na rotina.", "Reparei que voc\xEA aproveita o hor\xE1rio do almo\xE7o para estudar. Isso \xE9 dedica\xE7\xE3o."],
        tarde: ["Vi que voc\xEA costuma estudar \xE0 tarde, num ritmo bem constante.", "Reparei que a tarde \xE9 o seu hor\xE1rio de quest\xF5es. Gosto de ver essa rotina."]
      }[f.horario];
    case "prova":
      return {
        teot: ["Vi que voc\xEA est\xE1 estudando para o TEOT.", "Sei que o TEOT est\xE1 no seu radar.", "Vi que o seu foco \xE9 o TEOT, e fico na torcida."],
        taro: ["Vi que voc\xEA est\xE1 se preparando para o TARO.", "Sei que o TARO est\xE1 no seu radar, e fico na torcida."],
        mao: ["Vi que voc\xEA est\xE1 se preparando para a prova da cirurgia da m\xE3o.", "Sei que a prova da m\xE3o est\xE1 no seu radar."],
        r4: ["Vi que voc\xEA est\xE1 mirando o R4.", "Sei que a sele\xE7\xE3o do R4 est\xE1 no seu radar, e fico na torcida."],
        atualizacao: ["Vi que voc\xEA estuda para se manter em dia, sem prova marcada. Acho isso muito bonito.", "Gosto muito de ver gente estudando sem prova marcada, s\xF3 pelo prazer de se manter em dia."]
      }[f.prova];
    case "etapa":
      return {
        r1: ["Sei que o R1 \xE9 um ano de muita novidade e pouco tempo, e mesmo assim voc\xEA est\xE1 aqui.", "O R1 \xE9 puxado, e estudar no meio disso tem muito valor."],
        r2: ["Sei que o R2 costuma ser puxado de plant\xE3o, e mesmo assim voc\xEA encontra tempo.", "Estudar no meio do R2 n\xE3o \xE9 pouca coisa."],
        r3: ["O R3 \xE9 o ano do TEOT, e cada quest\xE3o agora conta muito.", "Sei que o R3 \xE9 um ano intenso, de reta final."],
        r4: ["Na subespecialidade, o detalhe faz toda a diferen\xE7a.", "Estudar no R4 \xE9 escolher ir al\xE9m, e eu admiro isso."],
        mao: ["Resid\xEAncia de m\xE3o pede muito detalhe, e voc\xEA est\xE1 encarando com vontade.", "Na m\xE3o, o detalhe \xE9 tudo, e d\xE1 para ver que voc\xEA sabe disso."],
        estudante: ["Estudar ortopedia ainda na gradua\xE7\xE3o \xE9 sair na frente.", "Fico feliz de ver gente da gradua\xE7\xE3o estudando ortopedia com tanta seriedade."],
        ortopedista: ["Admiro muito quem segue estudando depois da resid\xEAncia.", "\xC9 bonito ver quem j\xE1 terminou a resid\xEAncia mantendo o estudo em dia."]
      }[f.etapa];
    case "ranking": {
      const n = f.ranking;
      return n <= 10 ? [`Voc\xEA est\xE1 em ${n}\xBA no ranking geral, entre os dez primeiros. Que orgulho.`, `${n}\xBA lugar no ranking geral. Isso \xE9 muito estudo, e fiquei feliz de ver.`] : [`Parab\xE9ns pela ${n}\xAA posi\xE7\xE3o no ranking geral.`, `Vi que voc\xEA est\xE1 em ${n}\xBA no ranking geral, e fiquei feliz de ver o seu nome l\xE1.`, `${n}\xBA no ranking geral. Bonito demais.`];
    }
    case "sequencia":
      return [`S\xE3o ${dias(f.sequencia)} seguidos estudando. Que const\xE2ncia bonita.`, `Sua sequ\xEAncia est\xE1 em ${dias(f.sequencia)}, e isso diz muito sobre voc\xEA.`, `Vi a sua sequ\xEAncia: ${dias(f.sequencia)} seguidos. Admiro muito.`];
    case "flashcards":
      return ["Vi que voc\xEA tamb\xE9m est\xE1 usando os flashcards, que bom.", `Vi que voc\xEA j\xE1 passou por ${numero(f.flashcards)} flashcards tamb\xE9m.`, "E vi voc\xEA nos flashcards tamb\xE9m. Fiquei feliz de ver."];
    case "semana":
      return [`S\xF3 nos \xFAltimos sete dias foram ${questoes(f.semana)}. Que dedica\xE7\xE3o.`, `Vi as ${questoes(f.semana)} desta \xFAltima semana, e fiquei feliz.`, `${questoes(f.semana).replace(/^./, (c) => c.toUpperCase())} em sete dias. Que ritmo bonito.`];
  }
  return [];
}
var ORDEM_FATOS = ["melhorArea", "ranking", "maisEstudada", "horario", "prova", "sequencia", "semana", "etapa", "flashcards", "areaFraca"];
var DICAS = {
  baixo: [
    "Um truque que ajuda muita gente: antes de olhar as alternativas, tente responder de cabe\xE7a. \xC9 um \xF3timo treino para o racioc\xEDnio de prova.",
    "Uma coisa que costuma fazer diferen\xE7a: ler tamb\xE9m o coment\xE1rio das alternativas que n\xE3o s\xE3o a resposta. \xC9 ali que a banca esconde as pegadinhas.",
    "Se ajudar: cinco quest\xF5es por dia, com calma, costumam render mais do que trinta de uma vez no domingo.",
    "Uma ideia que funciona bem: quando uma quest\xE3o te pegar, marque como favorita e volte nela no dia seguinte. \xC9 impressionante como ela fica.",
    "Uma estrat\xE9gia simples: antes de escolher a certa, descarte as que voc\xEA tem certeza de que n\xE3o s\xE3o. A quest\xE3o fica bem mais leve."
  ],
  medio: [
    "Que tal come\xE7ar cada sess\xE3o pela Revis\xE3o do dia? S\xE3o as quest\xF5es que pedem uma segunda olhada, voltando no momento certo.",
    "Uma ideia: abrir o Caderno de erros uma vez por semana e refazer as que ainda incomodam. Rende muito.",
    "Quando acertar com d\xFAvida, vale ler o coment\xE1rio como se tivesse errado. Assim o acerto vira certeza.",
    "Alguns dias dedicados ao tema que mais te desafia costumam render muito, se fizer sentido para voc\xEA.",
    "Um truque de prova: ler o enunciado at\xE9 o fim antes de olhar as alternativas. A banca adora esconder coisa na \xFAltima linha."
  ],
  alto: [
    "Nesse n\xEDvel, vale ler o coment\xE1rio mesmo quando acerta. \xC0s vezes ele traz um detalhe que a banca ainda vai cobrar.",
    "Uma ideia: misturar provas e temas na mesma sess\xE3o. Obriga a reconhecer o assunto sem pista, como no dia da prova.",
    "Uma lembran\xE7a gentil: mat\xE9ria bem sabida tamb\xE9m esfria se ficar parada, ent\xE3o a Revis\xE3o em dia protege o que voc\xEA conquistou.",
    "As quest\xF5es que voltam a te pegar uma segunda vez s\xE3o as mais valiosas da sua lista. Vale dar um carinho especial a elas.",
    'Um detalhe de prova: o "exceto" e o "incorreta" no enunciado. \xC9 ali que at\xE9 quem sabe muito ainda deixa escapar um ponto.'
  ]
};
var FECHOS = ["Bons estudos, e conte comigo.", "Se eu puder ajudar em qualquer coisa, \xE9 s\xF3 responder este e-mail.", "Estou torcendo por voc\xEA.", "Conte comigo no que precisar.", "Fico feliz de acompanhar o seu caminho.", "Tor\xE7o muito pela sua aprova\xE7\xE3o.", "Bons estudos por a\xED, e cuide-se."];
var CHAVES_FECHO = ["respond", "torc", "acompanh", "conte comigo", "bons estudos"];
var simples = (t) => t.toLowerCase().replace(/ç/g, "c");
function tomDaFaixa(f) {
  if (!f) return "baixo";
  return ["0-10", "10-20", "20-30", "30-40"].includes(f) ? "baixo" : f === "40-60" || f === "60-70" ? "medio" : "alto";
}
function criarCtx(p, tipo, faixa, marco2, rnd, op, estado) {
  const hoje = op.hoje ?? /* @__PURE__ */ new Date();
  const site2 = (op.site ?? SITE_PADRAO).replace(/\/*$/, "/");
  const pct = acertoCitavel(p);
  const pctBom = pct !== null && pct >= 50 ? pct : null;
  const fatos = fatosDe(p);
  const usados = /* @__PURE__ */ new Set();
  const um = (...opcoes) => {
    const validas = opcoes.filter((o) => o !== null && o !== void 0 && o !== false && o !== "");
    return validas[Math.floor(rnd() * validas.length)];
  };
  const fato = (chave) => {
    if (fatos[chave] === void 0 || usados.has(chave)) return null;
    if ((chave === "maisEstudada" && usados.has("melhorArea") || chave === "melhorArea" && usados.has("maisEstudada")) && fatos.melhorArea?.slug === fatos.maisEstudada?.slug) return null;
    const frases = frasesDoFato(chave, fatos, pctBom !== null);
    if (!frases.length) return null;
    usados.add(chave);
    return frases[Math.floor(rnd() * frases.length)];
  };
  const ctx = {
    p,
    tipo,
    faixa,
    nome: primeiroNome(p.nome),
    r: Math.max(0, Math.floor(Number(p.respondidas) || 0)),
    pct,
    pctBom,
    fatos,
    hoje,
    diasTeot: diasAteTeot(hoje),
    marco: marco2,
    pix: op.pix,
    relatorio: op.relatorio,
    usados,
    um,
    chance: (x) => rnd() < x,
    link: (rota) => {
      estado.link = rota;
      return (site2 + ROTAS[rota]).replace(/^https?:\/\//, "");
    },
    fato,
    obs: (k = 1, preferir = []) => {
      const ordem = [...preferir, ...ORDEM_FATOS.filter((c) => !preferir.includes(c))].filter((c) => fatos[c] !== void 0 && !usados.has(c));
      const escolhidos = [];
      for (const c of ordem) {
        if (escolhidos.length >= k) break;
        if (rnd() < 0.8 || ordem.length - ordem.indexOf(c) <= k - escolhidos.length) escolhidos.push(c);
      }
      const frases = escolhidos.map((c) => fato(c)).filter((x) => !!x);
      return frases.length ? frases.join(" ") : null;
    },
    dica: () => um(...DICAS[tomDaFaixa(faixa)]),
    // "Torço pela sua aprovação" só para quem tem prova pela frente.
    fecho: () => rnd() < 0.15 ? null : um(...FECHOS.filter((f) => !(f.includes("aprova\xE7\xE3o") && (fatos.prova === "atualizacao" || fatos.etapa === "ortopedista")))),
    ps: () => {
      const candidatos = [];
      if (fatos.ranking && !usados.has("ranking")) candidatos.push(["ranking", `P.S.: vi que voc\xEA est\xE1 em ${fatos.ranking}\xBA no ranking geral. Fiquei feliz de ver o seu nome l\xE1.`]);
      if (fatos.sequencia && !usados.has("sequencia")) candidatos.push(["sequencia", `P.S.: ${dias(fatos.sequencia)} seguidos de estudo. Que const\xE2ncia bonita.`]);
      if (fatos.horario === "madrugada" && !usados.has("horario")) candidatos.push(["horario", "P.S.: vi que voc\xEA estuda at\xE9 de madrugada. Admiro muito, e pe\xE7o com carinho: cuide do sono tamb\xE9m, que a mem\xF3ria agradece."]);
      if (fatos.horario === "noite" && !usados.has("horario")) candidatos.push(["horario", "P.S.: vi que voc\xEA estuda bastante \xE0 noite. Admiro muito quem encontra tempo depois de um dia inteiro."]);
      if (fatos.melhorArea && !usados.has("melhorArea")) {
        const em = AREAS[fatos.melhorArea.slug].em;
        candidatos.push(["melhorArea", pctBom !== null ? `P.S.: ${em} com ${fatos.melhorArea.pct}% de acerto. Parab\xE9ns, de verdade.` : `P.S.: ${em} est\xE1 ficando muito forte no seu estudo. Parab\xE9ns, de verdade.`]);
      }
      if (p.flashcards === 0 && tipo !== "nunca_comecou") candidatos.push([null, "P.S.: se tiver curiosidade, os flashcards est\xE3o em fase de testes. Ia adorar saber o que voc\xEA acha."]);
      candidatos.push([null, "P.S.: se encontrar algo estranho em alguma quest\xE3o, tem um bot\xE3o para relatar. Eu leio cada relato pessoalmente."]);
      if (rnd() < 0.55) return null;
      const [chave, texto] = candidatos[Math.floor(rnd() * candidatos.length)];
      if (chave) usados.add(chave);
      return texto;
    },
    beneficios: (k, curto = false) => {
      const lista2 = [
        ["o cronograma at\xE9 a prova: voc\xEA diz a data e ele monta a lista de cada dia, come\xE7ando pelo que mais cai, e se ajusta quando um plant\xE3o aperta", "o cronograma at\xE9 a prova", fatos.prova || fatos.etapa ? 10 : 6],
        ["o Simulado Nacional todo m\xEAs, com a sua posi\xE7\xE3o", "o Simulado Nacional do m\xEAs", fatos.ranking ? 9 : 5],
        ["os temas que mais caem em cada \xE1rea e como a turma respondeu cada alternativa", "os temas que mais caem", fatos.areaFraca ? 9 : 4],
        ["o Resum\xE3o, com o que cai em uma frase por assunto", "o Resum\xE3o da reta final", diasAteTeot(hoje) <= 90 ? 7 : 3],
        ["a liga da resid\xEAncia e o relat\xF3rio do m\xEAs", "a liga da resid\xEAncia", fatos.etapa && fatos.etapa.startsWith("r") ? 4 : 2]
      ];
      if (p.limiteGratisLigado) {
        const t = fatos.flashcards ? "quest\xF5es e flashcards sem limite di\xE1rio" : "quest\xF5es sem limite di\xE1rio";
        lista2.push([t, t, fatos.flashcards || (fatos.semana ?? 0) >= 100 ? 11 : 6]);
      }
      return lista2.map(([longo, breve, peso]) => [curto ? breve : longo, peso + rnd() * 2]).sort((a, b) => b[1] - a[1]).slice(0, k).map(([t]) => t);
    },
    quando: (d) => d <= 0 ? "hoje" : d === 1 ? "ontem" : d < 60 ? `h\xE1 ${dias(d)}` : "h\xE1 alguns meses",
    area: (slug) => AREAS[slug]
  };
  return ctx;
}
var SAUDACOES_NOME = ["Oi, {n}, tudo bem?", "Ol\xE1, {n}, tudo bem?", "Oi, {n}! Tudo bem por a\xED?", "{n}, tudo bem?", "Oi, {n}, como v\xE3o os estudos?", "Oi, {n}, espero que esteja tudo bem por a\xED."];
var SAUDACOES = ["Oi, tudo bem?", "Ol\xE1, tudo bem?", "Oi! Tudo bem por a\xED?", "Oi, como v\xE3o os estudos?"];
function modeloDe(tipo, faixa) {
  return tipo === "ativo" && faixa ? `ativo:${faixa}` : tipo;
}
function problemaNoTexto(texto) {
  if (/\bundefined\b|\bnull\b|\bNaN\b|\[object/i.test(texto)) return "valor vazio no texto";
  if (/(^|[^\d.,])0 (questões|questão|dias|dia)\b/.test(texto)) return "n\xFAmero zerado";
  if (/\{[a-z]+\}/i.test(texto)) return "marcador sem preencher";
  if (/R\$\s?\d/.test(texto)) return "pre\xE7o no texto";
  if (/ ,|,,|(?<!\.)\.\.(?!\.)| \.(?!\w)/.test(texto)) return "pontua\xE7\xE3o quebrada";
  return null;
}
function problemaNoAssunto(assunto) {
  const minusculo = assunto.toLocaleLowerCase("pt-BR");
  if (!assunto.trim()) return "assunto vazio";
  if (assunto.length > 70) return "assunto longo";
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
      return r >= 50;
    case "boas_vindas":
    case "comecando":
    case "comecou_parou":
    case "pausa":
    case "sumiu":
    case "convite_20":
    case "convite_50":
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
  if (!tipoCombina(tipo, p)) throw new Error(`tipo_nao_combina_${tipo}`);
  const acerto = acertoCitavel(p);
  let faixa = op.faixa ?? (tipo === auto.tipo ? auto.faixa : null) ?? (acerto !== null ? faixaDe(acerto) : null);
  if (tipo === "ativo" && !faixa) faixa = "40-60";
  const marco2 = tipo === "marco" ? op.marco ?? auto.marco ?? marcoRecente(p.respondidas) ?? ([...MARCOS_CARTA].reverse().find((m) => p.respondidas >= m) ?? 100) : null;
  const modelo = modeloDe(tipo, faixa);
  const todas = VERSOES[modelo];
  if (!todas?.length) throw new Error(`sem_versoes_para_${modelo}`);
  const jaRecebidas = new Set(anteriores.filter((e) => (e.status ?? "enviado") !== "falhou").map((e) => e.versao).filter(Boolean));
  let semente = (op.semente ?? Math.floor(Math.random() * 2 ** 31)) >>> 0;
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const rnd = mulberry32(semente + tentativa * 7919);
    const estado = { link: null };
    const ctx = criarCtx(p, tipo, faixa, marco2, rnd, op, estado);
    const possiveis = todas.filter((v2) => !v2.requer || v2.requer(ctx));
    if (!possiveis.length) continue;
    const novas = possiveis.filter((v2) => !jaRecebidas.has(`${modelo}#${v2.id}`));
    const lista2 = novas.length ? novas : possiveis;
    const v = lista2[Math.floor(rnd() * lista2.length)];
    const brutos = v.corpo(ctx).filter((x) => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
    const paragrafos = brutos.filter((x, i) => {
      if (!FECHOS.includes(x)) return true;
      const chave = CHAVES_FECHO.find((k) => simples(x).includes(k));
      return !chave || !brutos.some((y, j) => j !== i && simples(y).includes(chave));
    });
    const saudacao = v.saudacao ? v.saudacao(ctx) : ctx.nome ? ctx.um(...SAUDACOES_NOME).replace("{n}", ctx.nome) : ctx.um(...SAUDACOES);
    const assuntos = v.assuntos(ctx).filter((x) => typeof x === "string" && x.trim() !== "").map((x) => x.trim()).filter((a) => !problemaNoAssunto(a));
    const assunto = assuntos[Math.floor(rnd() * assuntos.length)];
    const corpo = [saudacao, ...paragrafos].join("\n\n");
    if (!assunto || problemaNoTexto(corpo) || contarLinks(corpo) > 1) continue;
    return {
      tipo,
      faixa: tipo === "ativo" || tipo === "convite_50" ? faixa : null,
      modelo,
      versao: `${modelo}#${v.id}`,
      assunto,
      corpo,
      personalizacao: [...ctx.usados].map((c) => ROTULO_FATO[c] ?? c),
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
  semana: "ritmo da semana"
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
  const paragrafos = corpo.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
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
${c.descadastro ? p(`${esc(avisoSair)}, <a href="${esc(c.descadastro)}" style="color:#888888;">\xE9 s\xF3 clicar aqui</a>.`, "margin-top:28px;font-size:12px;line-height:1.4;color:#888888;") : ""}
</div>
</body>
</html>`;
  const texto = [...paragrafos, assinatura.join("\n"), ...rodape ? ["--", rodape] : []].join("\n\n");
  return { assunto: c.assunto.trim(), html, texto };
}
function problemaGrave(texto) {
  if (/\bundefined\b|\bNaN\b|\[object/i.test(texto)) return "valor vazio no texto";
  if (/\{[a-z]+\}/i.test(texto)) return "marcador sem preencher";
  return null;
}
function perfilDosDados(d, limiteGratisLigado = false) {
  const num = (v) => v === null || v === void 0 || !Number.isFinite(Number(v)) ? null : Number(v);
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
    limiteGratisLigado
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
function pronto(carta, descadastro, aviso) {
  const e = renderizarCarta({ assunto: carta.assunto, corpo: carta.corpo, descadastro, textoDescadastro: aviso });
  return { ...e, modelo: carta.modelo, versao: carta.versao };
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
    semente: d.semente ?? sementeDe(`marco:${d.marco.minimo}:${d.nome ?? ""}:${d.respondidas}`)
  });
  return pronto(carta, d.linkDescadastro, "Se preferir n\xE3o receber mais os e-mails de conquistas");
}
function emailCarta(d) {
  const nome = primeiroNome(d.nome);
  const recado = d.recado?.trim();
  const padrao = d.respondidas > 0 ? `Passando para te dar parab\xE9ns: voc\xEA j\xE1 passou de ${questoes(d.respondidas)} no Orto Quest\xF5es, e fiquei muito feliz de ver. Const\xE2ncia \xE9 o que mais faz diferen\xE7a na prova, e voc\xEA est\xE1 construindo a sua com muita dedica\xE7\xE3o.` : "Passando para dar um oi e dizer que fico feliz de ter voc\xEA por aqui. Sua conta est\xE1 pronta, e quando quiser come\xE7ar, cinco quest\xF5es j\xE1 bastam para pegar o jeito.";
  const corpo = [nome ? `Oi, ${nome}, tudo bem?` : "Oi, tudo bem?", recado || padrao].join("\n\n");
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
    tipo: tipoCombina(tipo, perfil) ? tipo : escolherTipo(perfil, d.anteriores).tipo,
    anteriores: d.anteriores,
    site: d.site,
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
    semente: d.semente ?? sementeDe(`relatorio:${d.mes}:${d.nome ?? ""}`)
  });
  return pronto(carta, d.linkDescadastro, "Se preferir n\xE3o receber mais os resumos de estudo");
}
function rotuloQuestao(id) {
  const [, prefixo, numero2] = id.match(/^(.*)-(\d+)$/) ?? [];
  return prefixo && TEMAS[prefixo] ? `${TEMAS[prefixo]}, quest\xE3o ${Number(numero2)}` : id;
}
function emailRelatoResolvido(d) {
  const nome = primeiroNome(d.nome);
  const rotulo = rotuloQuestao(d.idQuestao);
  const link = `${d.site}#/questao/${encodeURIComponent(d.idQuestao)}`;
  const relato = d.relato.trim().replace(/\s+/g, " ");
  const trecho = relato.length > 240 ? relato.slice(0, 240).replace(/\s\S*$/, "") + "\u2026" : relato;
  const nota = d.nota?.trim() || null;
  const corpo = [
    nome ? `Oi, ${nome}, tudo bem?` : "Oi, tudo bem?",
    `Muito obrigado por ter avisado do problema em ${rotulo}: "${trecho}"`,
    `Conferi com cuidado, e ela j\xE1 est\xE1 corrigida no site.${nota ? ` O que foi feito: ${nota}` : ""}`,
    "Gente atenta como voc\xEA deixa o banco de quest\xF5es melhor para todo mundo que est\xE1 estudando. Fiquei muito grato.",
    `Se quiser ver como ficou: ${link.replace(/^https?:\/\//, "")}`
  ].join("\n\n");
  return renderizarCarta({ assunto: `Obrigado pelo aviso sobre ${rotulo}`, corpo });
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
  const r = quinzenal ? await banco("rpc/destinatarios_relatorio_quinzenal", { method: "POST", body: JSON.stringify({ p_ref: mes, p_limite: limite }) }) : await banco("rpc/destinatarios_relatorio_mensal", { method: "POST", body: JSON.stringify({ p_mes: mes, p_limite: limite }) });
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
      const pronto2 = quinzenal ? await montarQuinzenal(id, mes) : await montarRelatorio(id, mes);
      if (!pronto2) throw new Error("usuario_sem_email");
      await enviarEmail(pronto2.para, pronto2.assunto, pronto2.html, pronto2.texto, await linkDescadastro(id, "relatorio"));
      await atualizarEnvio(linha.id, { status: "enviado", assunto: pronto2.assunto }, { modelo: pronto2.modelo, versao: pronto2.versao, origem: "automatico" });
      enviados++;
    } catch (falha) {
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "falhou", erro: motivo(falha) }) });
      falhas++;
    }
    await esperar(600);
  }
  return { mes, enviados, falhas, lote: destinatarios.length, talvez_restem: destinatarios.length === limite };
}
var CAMPANHAS = ["nunca", "tres_dias", "sete_dias", "renovacao_pix", "renovacao_pix_hoje"];
var ehPix = (c) => c === "renovacao_pix" || c === "renovacao_pix_hoje";
var campanhaValida = (c) => CAMPANHAS.includes(c ?? "") ? c : null;
async function enviarLembretes(campanha, limitePedido, por) {
  const limite = Math.max(1, Math.min(Number(limitePedido) || 40, 80));
  const r = ehPix(campanha) ? await banco("rpc/destinatarios_renovacao_pix", { method: "POST", body: JSON.stringify({ p_etapa: campanha === "renovacao_pix_hoje" ? "hoje" : "tres_dias", p_limite: limite }) }) : await banco("rpc/destinatarios_lembrete", { method: "POST", body: JSON.stringify({ p_campanha: campanha, p_limite: limite }) });
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
        anteriores: await anterioresDe(d.id_usuario).catch(() => [])
      });
      await enviarEmail(d.email, e.assunto, e.html, e.texto, descadastro);
      await atualizarEnvio(linha.id, { status: "enviado", assunto: e.assunto }, { modelo: e.modelo, versao: e.versao, origem: por ? "lote" : "automatico" });
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
      const marco2 = marcoAtingido(Number(dados.respondidas));
      if (!marco2) return json({ resultado: "ainda_nao" }, 200, req);
      if (Number(dados.respondidas) > marco2.minimo + folga(marco2)) return json({ resultado: "longe_do_marco", marco: marco2.minimo }, 200, req);
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
      const pronto2 = await montar(usuario.id, marco2);
      try {
        await enviarEmail(pronto2.dados.email, pronto2.email.assunto, pronto2.email.html, pronto2.email.texto, await linkDescadastro(usuario.id));
        await atualizarEnvio(linha.id, { status: "enviado", assunto: pronto2.email.assunto }, { modelo: pronto2.email.modelo, versao: pronto2.email.versao, origem: "automatico" });
        return json({ resultado: "enviado", marco: marco2.minimo }, 200, req);
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
      const lote = corpo.origem === "lote";
      if (!emailConfigurado()) return json({ erro: "email_nao_configurado" }, 503, req);
      const r = await banco("rpc/dados_carta_envio", { method: "POST", body: JSON.stringify({ p_id: corpo.id_usuario, p_modelo: modelo }) });
      let pessoa = null;
      const comParte27 = r.ok;
      if (comParte27) pessoa = await r.json();
      else {
        if (lote) return json({ erro: "sql_pendente" }, 409, req);
        const antigo = await dadosUsuario(corpo.id_usuario);
        pessoa = antigo ? { email: antigo.email, quer_cartas: antigo.quer_conquistas } : null;
      }
      if (!pessoa?.email) return json({ erro: "usuario_sem_email" }, 404, req);
      if (!pessoa.quer_cartas) return json({ erro: "pessoa_nao_quer_emails" }, 409, req);
      if (lote) {
        if (pessoa.administrador) return json({ erro: "administrador" }, 409, req);
        if (!pessoa.confirmado) return json({ erro: "email_nao_confirmado" }, 409, req);
        if (modelo?.startsWith("convite") && !pessoa.novidades) return json({ erro: "sem_aceite_novidades" }, 409, req);
        if (pessoa.mesmo_tipo_30d) return json({ erro: "mesmo_tipo_30_dias" }, 409, req);
        if (Number(pessoa.emails_48h ?? 0) > 0) return json({ erro: "recebeu_email_recente" }, 409, req);
      }
      const descadastro = lote ? await linkDescadastro(corpo.id_usuario, "cartas") : null;
      const e = renderizarCarta({ assunto, corpo: texto, descadastro });
      const registro = { id_usuario: corpo.id_usuario, assunto, status: "enviando", enviado_por: usuario.id };
      let reserva = comParte27 ? await registrar({ ...registro, tipo: "carta", modelo, versao, origem: lote ? "lote" : "manual" }) : null;
      if (!reserva?.ok) reserva = await registrar({ ...registro, tipo: "parabens" });
      const [linha] = reserva.ok ? await reserva.json() : [];
      try {
        await enviarEmail(pessoa.email, e.assunto, e.html, e.texto, descadastro ?? void 0);
        if (linha) await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "enviado" }) });
        return json({ resultado: "enviado", para: pessoa.email }, 200, req);
      } catch (falha) {
        if (linha) await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "falhou", erro: motivo(falha) }) });
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
      if (!pronto2.dados.quer_conquistas) return json({ erro: "pessoa_nao_quer_emails" }, 409, req);
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

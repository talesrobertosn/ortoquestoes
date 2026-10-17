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
var Q = (n) => n >= 10 ? `${N(n)} quest\xF5es` : "os primeiros passos";
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
  return s === 1 ? "uma semana" : s === 2 ? "duas semanas" : s === 3 ? "tr\xEAs semanas" : s === 4 ? "um m\xEAs" : `${N(s)} semanas`;
};
var tempoFora = (d) => {
  const v = Math.max(1, Math.round(Number(d) || 1));
  if (v < 14) return v === 1 ? "um dia" : `${N(v)} dias`;
  if (v < 60) return semanas(v);
  return v < 120 ? "uns dois meses" : "alguns meses";
};
var jaFez = (c) => c.dez ? `${Q(c.r)} j\xE1 respondidas` : "os primeiros passos j\xE1 dados";
var asSuas = (c) => c.dez ? `as suas ${Q(c.r)}` : "o que voc\xEA j\xE1 fez";
var guardado = (c) => c.dez ? `Suas ${Q(c.r)} est\xE3o guardadas` : "O que voc\xEA j\xE1 fez est\xE1 guardado";
var momento = (c) => {
  const f = c.fatos;
  if (f.cronograma && !c.usados.has("cronograma")) {
    c.usados.add("cronograma");
    const prova = f.cronograma.prova ? `o ${f.cronograma.prova}` : "a sua prova";
    return c.um(
      `Vi que ${prova} est\xE1 a ${D(f.cronograma.dias)}. Sei como esse n\xFAmero fica na cabe\xE7a, entre um plant\xE3o e outro.`,
      `Faltam ${D(f.cronograma.dias)} para ${prova}, pelo seu cronograma. Penso nisso quando te escrevo.`
    );
  }
  const etapa = c.fato("etapa");
  if (etapa && c.chance(0.7)) return etapa;
  const horario = c.fato("horario");
  if (horario) return horario;
  if (etapa) return etapa;
  return c.um(
    "Imagino que a rotina esteja puxada por a\xED: hospital de dia, estudo quando sobra.",
    "Sei como \xE9 estudar para prova de t\xEDtulo com o dia j\xE1 cheio. Eu passei por isso, e lembro do cansa\xE7o.",
    "Espero que a semana esteja sendo leve, ou pelo menos poss\xEDvel. Resid\xEAncia raramente deixa ser mais do que isso.",
    "Passei para te escrever num intervalo meu, imaginando que voc\xEA tamb\xE9m l\xEA isso num intervalo seu."
  );
};
var diasProva = (c) => c.diasProva !== null && c.diasProva >= 1 ? D(c.diasProva) : null;
var assuntosAtivo = (c, extras) => [
  nm(c, "lembrei de voc\xEA hoje", "Lembrei de voc\xEA hoje"),
  nm(c, "uma coisa que vi no seu estudo", "Uma coisa que vi no seu estudo"),
  c.dez && nm(c, `sobre as suas ${Q(c.r)}`, `Sobre as suas ${Q(c.r)}`),
  c.fatos.melhorArea && nm(c, `${c.area(c.fatos.melhorArea.slug).em} e voc\xEA`, `Parab\xE9ns por ${c.area(c.fatos.melhorArea.slug).em}`),
  c.fatos.ranking && nm(c, `${c.fatos.ranking}\xBA no ranking`, `${c.fatos.ranking}\xBA no ranking`),
  c.fatos.horario === "noite" && nm(c, "estudando \xE0 noite", "Estudando \xE0 noite"),
  diasProva(c) && nm(c, `faltam ${diasProva(c)} e eu estou na torcida`, `Faltam ${diasProva(c)} e eu estou na torcida`),
  ...extras
];
var ativo_0_10 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "uma ideia para o seu estudo", "Uma ideia para o seu estudo")]),
    corpo: (c) => [
      momento(c),
      `Estava olhando quem anda estudando por aqui e parei no seu nome: ${jaFez(c)}. Quest\xE3o de prova de t\xEDtulo \xE9 dif\xEDcil para todo mundo, e voc\xEA est\xE1 encarando. Isso \xE9 o que importa agora.`,
      "Uma ideia que ajuda muito nessa fase: escolher um tema s\xF3 e fazer cinco quest\xF5es com calma, lendo o coment\xE1rio de cada alternativa. Dez minutos. Parece pouco, mas \xE9 assim que a mat\xE9ria come\xE7a a ficar.",
      c.obs(1),
      `Se quiser experimentar hoje, o tema fica \xE0 sua escolha aqui: ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "como est\xE1 sendo o seu estudo?", "Como est\xE1 sendo o seu estudo?"), nm(c, "posso te ajudar em algo?", "Posso te ajudar em algo?")],
    corpo: (c) => [
      momento(c),
      "Queria saber como est\xE1 sendo o seu estudo por aqui. Pergunto de verdade, n\xE3o por formalidade.",
      "Todo mundo que passou na prova come\xE7ou exatamente onde voc\xEA est\xE1: achando as quest\xF5es dif\xEDceis e o tempo curto. \xC0s vezes um ajuste pequeno no jeito de estudar faz muita diferen\xE7a, e eu gostaria de te ajudar a encontrar o seu.",
      c.tempo(),
      "Se quiser, me responde contando como costuma fazer as quest\xF5es e quanto tempo tem por dia. Eu leio tudo e respondo pessoalmente."
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "um m\xE9todo para dez minutos", "Um m\xE9todo para dez minutos"), nm(c, "cinco quest\xF5es com calma", "Cinco quest\xF5es com calma")],
    corpo: (c) => [
      momento(c),
      c.obs(1) ?? `Vi que voc\xEA j\xE1 passou por ${c.dez ? Q(c.r) : "algumas quest\xF5es"} no Orto Quest\xF5es, e quis te escrever.`,
      "Queria te passar um jeito de estudar que cabe em dez minutos: escolha um tema s\xF3, fa\xE7a cinco quest\xF5es lendo o enunciado inteiro e, depois de cada uma, leia o coment\xE1rio de todas as alternativas. No dia seguinte, abra a Revis\xE3o antes de qualquer quest\xE3o nova.",
      `\xC9 pouco de cada vez, e \xE9 exatamente por isso que funciona na rotina de hospital. A Revis\xE3o fica aqui: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "todo mundo come\xE7a assim", "Todo mundo come\xE7a assim"), nm(c, "sobre o come\xE7o", "Sobre o come\xE7o")],
    corpo: (c) => [
      momento(c),
      "Queria te contar uma coisa: todo mundo que passou na prova de t\xEDtulo come\xE7ou achando as quest\xF5es imposs\xEDveis. A banca gosta de detalhe de classifica\xE7\xE3o, de exce\xE7\xE3o, de nome pr\xF3prio. Faz parte do caminho, e n\xE3o diz nada sobre o seu futuro.",
      `E o que eu vi no seu hist\xF3rico me deixou feliz: ${jaFez(c)}. D\xE1 para ver que voc\xEA \xE9 de quem n\xE3o desiste.`,
      c.dica(),
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "o site est\xE1 funcionando para voc\xEA?", "O site est\xE1 funcionando para voc\xEA?")],
    corpo: (c) => [
      momento(c),
      "Escrevo porque gostaria de saber como o site est\xE1 funcionando para voc\xEA. Se alguma coisa estiver confusa, \xE9 comigo mesmo que voc\xEA fala.",
      `Uma sugest\xE3o que costuma deixar tudo mais leve no come\xE7o: ir pelos conceitos b\xE1sicos. S\xE3o quest\xF5es mais diretas, ajudam a pegar o jeito da banca e cabem em qualquer intervalo. D\xE1 para escolher o tema aqui: ${c.link("treinar")}`,
      c.tempo(),
      "E se preferir me contar o que est\xE1 pegando, \xE9 s\xF3 responder. Respondo pessoalmente."
    ]
  },
  {
    id: "v6",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, [nm(c, "menos quest\xF5es, mais coment\xE1rio", "Menos quest\xF5es, mais coment\xE1rio")]),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      "Queria te dizer que estou acompanhando o seu come\xE7o com carinho. Cada quest\xE3o que voc\xEA faz agora, mesmo a que te pega, est\xE1 construindo a base que vai te levar at\xE9 a prova.",
      "Uma ideia para a pr\xF3xima sess\xE3o, se fizer sentido: fazer menos e ler mais. Dez quest\xF5es com o coment\xE1rio lido com calma rendem mais do que trinta corridas, e cabem num intervalo.",
      c.fecho()
    ]
  }
];
var ativo_10_20 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "errar aqui \xE9 o melhor jeito", "Errar aqui \xE9 o melhor jeito de acertar l\xE1")]),
    corpo: (c) => [
      momento(c),
      `Vi que voc\xEA j\xE1 tem ${c.dez ? Q(c.r) : "os primeiros passos dados"} no Orto Quest\xF5es, e quis passar para conversar um pouco.`,
      "Cada quest\xE3o que te pega aqui \xE9 um presente: mostra exatamente o que vale estudar antes da prova. Errar aqui \xE9 o melhor jeito de acertar l\xE1, e custa s\xF3 uns minutos.",
      `Uma sugest\xE3o, se fizer sentido para voc\xEA: abrir o Caderno de erros e refazer algumas com calma. Quando uma quest\xE3o que te pegou vira acerto, ela vale mais do que dez novas. Fica aqui: ${c.link("erros")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "quest\xE3o de prova \xE9 dif\xEDcil mesmo", "Quest\xE3o de prova \xE9 dif\xEDcil mesmo")]),
    corpo: (c) => [
      momento(c),
      `Quest\xE3o de prova de ortopedia \xE9 dif\xEDcil, \xE0s vezes muito. E voc\xEA est\xE1 encarando com coragem: ${jaFez(c)}.`,
      c.obs(1),
      "O que mais ajuda nessa fase \xE9 voltar nas quest\xF5es que te pegaram at\xE9 elas virarem certeza. \xC9 um ajuste pequeno, n\xE3o pede mais tempo, s\xF3 muda a ordem: primeiro a Revis\xE3o, depois o novo.",
      `Se der hoje, que tal s\xF3 a Revis\xE3o do dia? \xC9 r\xE1pida e \xE9 onde o estudo mais rende: ${c.link("revisao")}`
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "um tema por semana", "Um tema por semana"), nm(c, "uma estrat\xE9gia simples", "Uma estrat\xE9gia simples")],
    corpo: (c) => [
      momento(c),
      "Fiquei feliz de ver que voc\xEA continua estudando por aqui, mesmo com a rotina que imagino.",
      "Pensei numa estrat\xE9gia que talvez combine com voc\xEA: um tema por semana. Em vez de pular de \xE1rea em \xE1rea, ficar alguns dias num s\xF3. A sensa\xE7\xE3o de progresso aparece bem mais r\xE1pido, e a cabe\xE7a cansada agradece por n\xE3o ter que decidir todo dia.",
      c.dica(),
      `D\xE1 para escolher o tema aqui: ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "o que eu vejo no seu estudo", "O que eu vejo no seu estudo")],
    corpo: (c) => [
      momento(c),
      `Sabe o que eu vejo quando olho o seu estudo? Algu\xE9m que ${c.dez ? `j\xE1 respondeu ${Q(c.r)}` : "j\xE1 come\xE7ou"} e segue em frente, mesmo com sono. \xC9 isso que mais conta l\xE1 na frente.`,
      "Os coment\xE1rios de cada alternativa foram escritos pensando justamente nessa fase. Uma ideia que ajuda: ler por que cada alternativa est\xE1 certa ou errada, n\xE3o s\xF3 a resposta. \xC9 ali que mora a pegadinha da banca, e \xE9 ali que o estudo come\xE7a a render.",
      c.obs(1),
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "topa um desafio pequeno?", "Topa um desafio pequeno?"), nm(c, "sete dias, dez quest\xF5es", "Sete dias, dez quest\xF5es")],
    corpo: (c) => [
      momento(c),
      c.obs(1),
      "Queria te propor um desafio pequeno, se voc\xEA topar: nos pr\xF3ximos sete dias, dez quest\xF5es por dia, sempre lendo o coment\xE1rio inteiro. Dez minutos, no intervalo que der.",
      "N\xE3o \xE9 para ver quantas acerta. \xC9 para sentir como o estudo fica mais leve quando vira rotina em vez de maratona.",
      "Depois me conta como foi? Vou adorar saber."
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "estou torcendo por voc\xEA", "Estou torcendo por voc\xEA"), nm(c, "um recado curto", "Um recado curto")],
    corpo: (c) => [
      momento(c),
      "Escrevo rapidinho s\xF3 para dizer que acompanho o seu estudo e estou torcendo por voc\xEA.",
      "Toda base come\xE7a assim, um pouco de cada vez. E voc\xEA est\xE1 construindo a sua nos intervalos que a rotina deixa, o que vale o dobro.",
      "Um truque que ajuda: antes de olhar as alternativas, tente dizer a resposta de cabe\xE7a. Treina o racioc\xEDnio de prova e n\xE3o gasta um minuto a mais.",
      c.obs(1)
    ]
  }
];
var ativo_20_30 = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "uma t\xE9cnica para as alternativas", "Uma t\xE9cnica para as alternativas"), nm(c, "descarte antes de escolher", "Descarte antes de escolher")],
    corpo: (c) => [
      momento(c),
      `Vi que voc\xEA j\xE1 est\xE1 com ${jaFez(c)}, e quis te mandar uma t\xE9cnica que costuma ajudar muito nessa fase.`,
      "Voc\xEA j\xE1 reconhece os temas, e agora o que mais rende \xE9 a leitura das alternativas. Antes de escolher a certa, descarte mentalmente as que voc\xEA sabe que n\xE3o s\xE3o. A quest\xE3o fica bem mais leve, e isso vale ouro na prova, quando o tempo aperta.",
      "Junto com a Revis\xE3o das quest\xF5es que te pegaram, isso costuma fazer o estudo render mais r\xE1pido do que parece.",
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "uma fase, n\xE3o um veredito", "Uma fase, n\xE3o um veredito")]),
    corpo: (c) => [
      momento(c),
      c.obs(1) ?? "Passei para ver como estava o seu estudo, e fiquei feliz com o que vi: voc\xEA continua aparecendo.",
      "Queria te dizer uma coisa com carinho: o come\xE7o do estudo para prova de t\xEDtulo \xE9 sempre assim, e \xE9 uma fase, n\xE3o um veredito. Todo mundo que passou viveu isso, inclusive eu.",
      `Uma sugest\xE3o, se fizer sentido: escolher o tema que mais te desafia e ficar s\xF3 nele por uns dias. Concentrar ajuda a enxergar os padr\xF5es da banca, e poupa o tempo de decidir o que estudar. D\xE1 para escolher aqui: ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "o coment\xE1rio \xE9 o melhor professor", "O coment\xE1rio \xE9 o melhor professor")],
    corpo: (c) => [
      momento(c),
      "Uma coisa que talvez ningu\xE9m tenha te contado: o coment\xE1rio da quest\xE3o ensina mais justamente quando ela te pega.",
      `${c.dez ? `Voc\xEA j\xE1 tem ${Q(c.r)} respondidas, o que \xE9 muito material.` : "Voc\xEA j\xE1 come\xE7ou, e cada quest\xE3o \xE9 material."} Lendo com calma o coment\xE1rio de cada alternativa nas pr\xF3ximas, o estudo come\xE7a a responder. N\xE3o \xE9 m\xE1gica, \xE9 repeti\xE7\xE3o, e voc\xEA j\xE1 mostrou que tem const\xE2ncia para isso.`,
      c.dica(),
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "eu vi o seu esfor\xE7o", "Eu vi o seu esfor\xE7o")],
    corpo: (c) => [
      momento(c),
      `S\xF3 para dizer que eu vi o seu esfor\xE7o: ${jaFez(c)}. Isso \xE9 muita dedica\xE7\xE3o para quem tem o dia tomado.`,
      "Uma coisa que eu faria no seu lugar: manter a Revis\xE3o em dia nas pr\xF3ximas semanas. Ela traz de volta, no momento certo, o que te pegou, e \xE9 ali que a mat\xE9ria fica. Dez minutos por dia bastam.",
      `A Revis\xE3o fica aqui: ${c.link("revisao")}`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "agora \xE9 s\xF3 calibrar", "Agora \xE9 s\xF3 calibrar"), nm(c, "um ajuste pequeno", "Um ajuste pequeno")],
    corpo: (c) => [
      momento(c),
      c.fatos.semana ? "Voc\xEA est\xE1 estudando com const\xE2ncia, e essa \xE9 a parte mais dif\xEDcil de toda prepara\xE7\xE3o. Parab\xE9ns por isso." : "Voc\xEA j\xE1 criou o h\xE1bito de abrir o site, e essa \xE9 a parte mais dif\xEDcil de toda prepara\xE7\xE3o. Parab\xE9ns por isso.",
      "Agora \xE9 s\xF3 calibrar: um pouco menos de quest\xE3o nova e um pouco mais de revis\xE3o. Mesmo tempo, outra ordem. \xC9 assim que o estudo come\xE7a a sobrar em vez de faltar.",
      c.obs(1),
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "me conta uma coisa?", "Me conta uma coisa?")],
    corpo: (c) => [
      momento(c),
      "Me conta uma coisa: quando uma quest\xE3o te pega, voc\xEA costuma ter tempo de ler o coment\xE1rio at\xE9 o fim?",
      "Pergunto porque \xE9 ali que costuma estar o maior ganho. O coment\xE1rio explica cada alternativa, e a pegadinha da banca quase sempre est\xE1 numa delas. Ler at\xE9 o fim leva um minuto a mais e economiza uma quest\xE3o na prova.",
      c.obs(1),
      "Se quiser testar nas pr\xF3ximas dez, me diz depois se fez diferen\xE7a? Fico curioso para saber."
    ]
  }
];
var ativo_30_40 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "a base est\xE1 aparecendo", "A base est\xE1 aparecendo")]),
    corpo: (c) => [
      momento(c),
      `Vi que voc\xEA j\xE1 passou de ${jaFez(c)}, e queria te dar uma boa not\xEDcia: a base est\xE1 aparecendo.`,
      "Nessa fase, a gente j\xE1 vai bem no que estudou, e o que escapa \xE9 o que ainda n\xE3o viu. \xC9 um \xF3timo sinal: quer dizer que o estudo est\xE1 funcionando, e que o tempo que voc\xEA arranca da rotina est\xE1 valendo.",
      `O pr\xF3ximo passo, se fizer sentido, \xE9 transformar as quest\xF5es que te pegaram em acertos. O Caderno de erros guarda todas elas, e vale refazer com calma: ${c.link("erros")}`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v2",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      "Seu estudo est\xE1 a caminho de um patamar novo, e daqui para a frente cada revis\xE3o conta muito mais do que cada quest\xE3o nova.",
      c.dica(),
      c.tempo()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "voc\xEA est\xE1 na virada", "Voc\xEA est\xE1 na virada")],
    corpo: (c) => [
      momento(c),
      "Passei para dizer que est\xE1 tudo certo com o seu ritmo. Gosto muito do que estou vendo.",
      "Uma compara\xE7\xE3o de que eu gosto: os primeiros acertos v\xEAm do que voc\xEA j\xE1 sabia; os pr\xF3ximos v\xEAm do que voc\xEA aprende com as quest\xF5es que te pegam. Voc\xEA est\xE1 bem na virada.",
      `Que tal come\xE7ar pela Revis\xE3o do dia, antes das quest\xF5es novas? S\xE3o uns dez minutos, e \xE9 onde o estudo mais rende agora: ${c.link("revisao")}`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "uma dica curta", "Uma dica curta"), nm(c, "um tema s\xF3 nesta semana", "Um tema s\xF3 nesta semana")],
    corpo: (c) => [
      momento(c),
      "Uma dica curta, de presente: escolher a \xE1rea que mais te desafia e fazer dez quest\xF5es dela por semana, at\xE9 o fim do m\xEAs.",
      c.fato("areaFraca") ?? "Concentrar num tema por vez deixa os padr\xF5es da banca bem mais claros, e poupa o tempo de ficar decidindo o que estudar cada dia.",
      c.obs(1),
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "um empurr\xE3ozinho", "Um empurr\xE3ozinho"), nm(c, "a revis\xE3o que vale ouro", "A revis\xE3o que vale ouro")],
    corpo: (c) => [
      momento(c),
      "Vi o seu estudo por aqui e quis te mandar um empurr\xE3ozinho.",
      `Com ${asSuas(c)}, voc\xEA j\xE1 tem material para a revis\xE3o que mais rende. Que tal, amanh\xE3, abrir a Revis\xE3o do dia antes das quest\xF5es novas? Leva poucos minutos e protege o que voc\xEA j\xE1 conquistou.`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "rende mais do que parece", "O seu estudo rende mais do que parece")],
    corpo: (c) => [
      momento(c),
      "Escrevo porque gosto de acompanhar quem est\xE1 construindo a base, e \xE9 isso que eu vejo no seu caso.",
      "Os n\xFAmeros costumam mostrar o que a gente aprendeu com algumas semanas de atraso. O que voc\xEA est\xE1 estudando agora vai aparecer l\xE1 na frente. Siga no seu ritmo, mesmo que seja pouco por dia.",
      c.obs(1),
      c.tempo(),
      c.fecho()
    ]
  }
];
var ativo_40_60 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "a fase em que mais d\xE1 para crescer", "A fase em que mais d\xE1 para crescer")]),
    corpo: (c) => [
      momento(c),
      `Olhei o seu estudo com calma e vi ${jaFez(c)}, com uma base que j\xE1 aparece.`,
      "Voc\xEA est\xE1 na fase em que mais d\xE1 para crescer. J\xE1 tem base para aproveitar bem os coment\xE1rios, e cada quest\xE3o revisada agora vira ponto na prova. \xC9 a fase mais barata em tempo: pouco esfor\xE7o, muito retorno.",
      c.dica(),
      `A Revis\xE3o do dia fica aqui: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      c.pctBom !== null ? `Seu acerto est\xE1 em ${c.pctBom}%, j\xE1 passando da metade. Daqui, o que mais rende \xE9 dar uma aten\xE7\xE3o especial, por alguns dias, ao tema que mais te desafia.` : "Voc\xEA est\xE1 bem no meio do caminho, que \xE9 onde mais d\xE1 para crescer. Daqui, o que mais rende \xE9 dar uma aten\xE7\xE3o especial, por alguns dias, ao tema que mais te desafia.",
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "uma dica que pode virar o jogo", "Uma dica que pode virar o jogo")],
    corpo: (c) => [
      momento(c),
      "Uma dica que pode virar o jogo para voc\xEA: refazer as quest\xF5es que te pegaram antes de partir para as novas. Parece contraintuitivo, mas \xE9 o caminho mais curto para subir, e n\xE3o pede um minuto a mais do seu dia.",
      `O Caderno de erros guarda todas: ${c.link("erros")}`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "parab\xE9ns pela const\xE2ncia", "Parab\xE9ns pela const\xE2ncia")],
    corpo: (c) => [
      momento(c),
      `Parab\xE9ns pela const\xE2ncia. ${cap(jaFez(c))}, e d\xE1 para ver que voc\xEA aparece mesmo nas semanas dif\xEDceis.`,
      c.pctBom !== null ? `Com ${c.pctBom}% de acerto, voc\xEA j\xE1 est\xE1 do lado de cima da metade. Agora \xE9 o tema que mais te desafia que vai puxar o resto para cima.` : "Agora \xE9 a fase em que cada revis\xE3o vale mais do que uma quest\xE3o nova, e isso \xE9 uma boa not\xEDcia para quem tem pouco tempo.",
      c.obs(1),
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "uma pergunta sobre o seu estudo", "Uma pergunta sobre o seu estudo")],
    corpo: (c) => [
      momento(c),
      "Uma pergunta: voc\xEA costuma estudar com a Revis\xE3o aberta antes das quest\xF5es novas, ou vai direto para o novo?",
      "Pergunto porque, nessa fase, a Revis\xE3o \xE9 o atalho. Ela traz de volta, no momento certo, as quest\xF5es que te pegaram, e cada uma que vira acerto \xE9 um ponto garantido na prova. Dez minutos por dia bastam.",
      c.obs(1),
      `Se quiser experimentar amanh\xE3: ${c.link("revisao")}`
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "o que eu faria no seu lugar", "O que eu faria no seu lugar")],
    corpo: (c) => [
      momento(c),
      `Olhando ${asSuas(c)}, pensei no que eu faria no seu lugar, e quis dividir.`,
      "Eu escolheria um hor\xE1rio fixo, mesmo que curto, e protegeria ele como protejo uma cirurgia marcada. Trinta minutos num hor\xE1rio certo valem mais que duas horas espalhadas, principalmente para quem est\xE1 no meio do caminho.",
      c.obs(1),
      c.dica(),
      c.fecho()
    ]
  },
  {
    id: "v7",
    requer: (c) => !!c.fatos.areaFraca,
    assuntos: (c) => [nm(c, "um tema para as pr\xF3ximas semanas", "Um tema para as pr\xF3ximas semanas")],
    corpo: (c) => [
      momento(c),
      `Olhei ${asSuas(c)} com calma, e uma coisa me chamou a aten\xE7\xE3o.`,
      c.fato("areaFraca"),
      "N\xE3o \xE9 para estudar mais horas. \xC9 para escolher melhor onde gastar as que voc\xEA tem. Dez quest\xF5es por semana nesse tema, com o coment\xE1rio lido, mudam o quadro em um m\xEAs.",
      `O tema fica \xE0 sua escolha aqui: ${c.link("treinar")}`,
      c.fecho()
    ]
  }
];
var ativo_60_70 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "voc\xEA est\xE1 numa fase boa", "Voc\xEA est\xE1 numa fase boa")]),
    corpo: (c) => [
      momento(c),
      J(`Duas coisas no seu hist\xF3rico me chamaram a aten\xE7\xE3o: ${jaFez(c)}`, c.pctBom !== null ? `e ${c.pctBom}% de acerto. Isso n\xE3o aparece por acaso.` : "e uma const\xE2ncia que n\xE3o aparece por acaso."),
      c.obs(1),
      "Voc\xEA est\xE1 numa fase boa, em que o estudo j\xE1 responde. O que mais rende agora \xE9 transformar os acertos com d\xFAvida em certeza: ler o coment\xE1rio mesmo quando acerta, e deixar a Revis\xE3o cuidar do resto.",
      `A Revis\xE3o fica aqui, para quando der: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      c.pctBom !== null ? `Com ${c.pctBom}% de acerto, voc\xEA j\xE1 est\xE1 acima da metade com folga. Daqui, cada ponto vem de detalhe: o "exceto", a classifica\xE7\xE3o menos comum, a alternativa que quase est\xE1 certa.` : 'Daqui, cada ponto vem de detalhe: o "exceto", a classifica\xE7\xE3o menos comum, a alternativa que quase est\xE1 certa.',
      c.dica(),
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "uma ideia para o tema mais dif\xEDcil", "Uma ideia para o tema mais dif\xEDcil")],
    corpo: (c) => [
      momento(c),
      `Fiquei feliz de ver ${asSuas(c)}. \xC9 volume de quem senta e faz, mesmo com sono.`,
      c.fato("areaFraca") ?? "Uma ideia para as pr\xF3ximas semanas: escolher o tema em que voc\xEA menos confia e dar dez quest\xF5es por semana a ele. \xC9 onde cada sess\xE3o vai render mais agora, e cabe num intervalo.",
      c.tempo(),
      `O tema fica \xE0 sua escolha aqui: ${c.link("treinar")}`
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "proteja o que voc\xEA j\xE1 conquistou", "Proteja o que voc\xEA j\xE1 conquistou")],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ""}. Isso \xE9 estudo de verdade, feito nos intervalos que a rotina deixa.`,
      "Uma lembran\xE7a gentil para essa fase: mat\xE9ria bem sabida tamb\xE9m esfria se ficar parada. A Revis\xE3o em dia protege o que voc\xEA conquistou, e custa menos tempo do que aprender de novo.",
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "um pedido pequeno", "Um pedido pequeno")],
    corpo: (c) => [
      momento(c),
      `Voc\xEA j\xE1 tem ${jaFez(c)}, ent\xE3o conhece o site melhor do que muita gente. Por isso tenho um pedido pequeno.`,
      "Se algum coment\xE1rio te deixou com d\xFAvida, ou se alguma quest\xE3o parece ter algo estranho, me conta. Tem um bot\xE3o de relatar em cada quest\xE3o, e eu leio cada relato pessoalmente. \xC9 assim que o banco melhora para voc\xEA e para quem vem depois.",
      c.obs(1),
      "E obrigado por estudar por aqui. Fico feliz de ver."
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "o que muda daqui para a frente", "O que muda daqui para a frente")],
    corpo: (c) => [
      momento(c),
      "Queria te contar o que muda daqui para a frente, porque pouca gente avisa.",
      "At\xE9 aqui, o estudo rende por volume: quanto mais quest\xE3o, mais tema visto. A partir de agora, rende por precis\xE3o: a quest\xE3o que te pega pela segunda vez vale mais do que dez novas. \xC9 uma mudan\xE7a boa para quem tem pouco tempo, porque pede menos horas e mais aten\xE7\xE3o.",
      c.obs(1),
      `O Caderno de erros \xE9 o melhor mapa dessa fase: ${c.link("erros")}`,
      c.fecho()
    ]
  }
];
var ativo_70_80 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "que estudo bonito", "Que estudo bonito")]),
    corpo: (c) => [
      momento(c),
      J(`Uma coisa no seu hist\xF3rico me chamou a aten\xE7\xE3o: ${jaFez(c)}`, c.pctBom !== null ? `com ${c.pctBom}% de acerto. Isso \xE9 de quem senta e faz, mesmo com sono.` : "com uma const\xE2ncia que \xE9 de quem senta e faz, mesmo com sono."),
      c.obs(1),
      "Nesse n\xEDvel, o que mais rende \xE9 ler o coment\xE1rio mesmo quando acerta. \xC0s vezes ele traz um detalhe que a banca ainda vai cobrar, e voc\xEA j\xE1 estar\xE1 com ele guardado.",
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v2",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      "Voc\xEA est\xE1 num patamar em que a maioria das pessoas j\xE1 passa. O que separa uma boa nota de uma \xF3tima, daqui para a frente, \xE9 a revis\xE3o do que ainda escapa, e n\xE3o mais horas de estudo.",
      c.dica(),
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "como voc\xEA estuda?", "Como voc\xEA estuda?")],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ""}. Fiquei curioso: como voc\xEA estuda?`,
      "Pergunto porque gosto de aprender com quem est\xE1 indo bem, e porque o jeito como voc\xEA encaixa o estudo na rotina pode ajudar outras pessoas que me escrevem perguntando por onde come\xE7ar.",
      c.obs(1),
      "Se tiver dois minutos, me responde contando. Prometo ler com aten\xE7\xE3o."
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "o detalhe que ainda escapa", "O detalhe que ainda escapa")],
    corpo: (c) => [
      momento(c),
      `Com ${asSuas(c)}, voc\xEA j\xE1 viu boa parte do que a banca gosta de perguntar. Agora o jogo \xE9 outro.`,
      'Os pontos que faltam est\xE3o nos detalhes: o "exceto" no enunciado, a classifica\xE7\xE3o menos comum, a alternativa que quase est\xE1 certa. Uma ideia: misturar provas e temas na mesma sess\xE3o, para reconhecer o assunto sem pista, como no dia da prova.',
      c.obs(1),
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "um pedido de quem cuida do site", "Um pedido de quem cuida do site")],
    corpo: (c) => [
      momento(c),
      `Voc\xEA est\xE1 entre as pessoas que mais aproveitam o site${c.pctBom !== null ? `: ${jaFez(c)}, ${c.pctBom}% de acerto` : `: ${jaFez(c)}`}. Por isso tenho um pedido.`,
      "Se encontrar alguma quest\xE3o com algo estranho, ou um coment\xE1rio que poderia ser melhor, me avisa pelo bot\xE3o de relatar. Quem est\xE1 nesse n\xEDvel enxerga o que escapa a todo mundo, e cada relato melhora o banco para quem vem depois.",
      c.obs(1),
      "Obrigado, de verdade, por estudar por aqui."
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "proteger o que j\xE1 est\xE1 forte", "Proteger o que j\xE1 est\xE1 forte")],
    corpo: (c) => [
      momento(c),
      c.fato("melhorArea") ?? `${cap(jaFez(c))}. D\xE1 para ver que voc\xEA j\xE1 tem temas em que est\xE1 muito forte.`,
      "Uma coisa que eu faria no seu lugar: manter esses temas aquecidos s\xF3 com a Revis\xE3o, que leva poucos minutos, e usar o tempo novo nos outros. Assim voc\xEA chega na prova sem perder nada do que j\xE1 conquistou.",
      c.obs(1),
      `A Revis\xE3o fica aqui: ${c.link("revisao")}`,
      c.fecho()
    ]
  }
];
var ativo_80_90 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "parab\xE9ns, de verdade", "Parab\xE9ns, de verdade")]),
    corpo: (c) => [
      momento(c),
      J(`${cap(jaFez(c))}`, c.pctBom !== null ? `com ${c.pctBom}% de acerto. Parab\xE9ns, de verdade.` : "e um estudo que d\xE1 gosto de ver. Parab\xE9ns, de verdade."),
      c.obs(2),
      "Nesse n\xEDvel, o que ainda escapa \xE9 pouco e espec\xEDfico. As quest\xF5es que te pegam uma segunda vez s\xE3o as mais valiosas da sua lista: vale dar um carinho especial a elas, e s\xF3 a elas.",
      c.fecho()
    ]
  },
  {
    id: "v2",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      "Pouca gente chega aqui, e eu queria que voc\xEA soubesse que eu vi. Agora \xE9 cuidar para a reta final n\xE3o virar ansiedade: menos conte\xFAdo novo, mais revis\xE3o e, principalmente, sono.",
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "me ensina uma coisa?", "Me ensina uma coisa?")],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? ` e ${c.pctBom}% de acerto` : ""}. Queria te pedir uma coisa diferente: me ensina como voc\xEA estuda?`,
      "Muita gente me escreve perguntando por onde come\xE7ar, e eu adoraria responder com o exemplo de algu\xE9m de verdade. Hor\xE1rio, ordem, o que faz quando uma quest\xE3o te pega. O que voc\xEA quiser contar.",
      c.obs(1),
      "\xC9 s\xF3 responder este e-mail. Vou guardar com carinho."
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "uma ideia para quem j\xE1 est\xE1 forte", "Uma ideia para quem j\xE1 est\xE1 forte")],
    corpo: (c) => [
      momento(c),
      `Com ${asSuas(c)}, voc\xEA j\xE1 est\xE1 no n\xEDvel em que a prova se decide no detalhe.`,
      "Uma ideia para essa fase: misturar provas e temas na mesma sess\xE3o, como no dia da prova, e cronometrar. A banca n\xE3o avisa o assunto, e treinar isso agora \xE9 o que faz a nota \xF3tima virar seguran\xE7a.",
      c.obs(1),
      c.dica(),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "quem voc\xEA conhece que est\xE1 nessa?", "Quem voc\xEA conhece que est\xE1 nessa?")],
    corpo: (c) => [
      momento(c),
      `Voc\xEA est\xE1 entre as pessoas que mais rendem por aqui${c.pctBom !== null ? `: ${c.pctBom}% em ${Q(c.r)}` : `: ${jaFez(c)}`}. Por isso quis te pedir uma ajuda.`,
      "Quem voc\xEA conhece que est\xE1 estudando para a mesma prova e ainda n\xE3o conhece o site? Estudar junto deixa tudo mais leve, e o ranking fica mais animado.",
      `Pelo seu link pessoal, quando a pessoa cria a conta e responde 20 quest\xF5es, voc\xEAs dois ganham 7 dias do plano completo: ${c.link("indicar")}`,
      "Obrigado por estudar por aqui."
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "cuida de voc\xEA tamb\xE9m", "Cuida de voc\xEA tamb\xE9m")],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? `, ${c.pctBom}% de acerto` : ""}. Voc\xEA j\xE1 fez a parte dif\xEDcil.`,
      "Agora o que mais protege a sua nota \xE9 dormir bem. A mem\xF3ria se consolida no sono, e quem chega na prova com a cabe\xE7a descansada acerta o detalhe que o cansa\xE7o esconde. Eu aprendi isso tarde demais, e por isso insisto.",
      c.obs(1),
      c.fecho()
    ]
  }
];
var ativo_90_100 = [
  {
    id: "v1",
    assuntos: (c) => assuntosAtivo(c, [nm(c, "isso \xE9 raro", "Isso \xE9 raro")]),
    corpo: (c) => [
      momento(c),
      J(`${cap(jaFez(c))}`, c.pctBom !== null ? `com ${c.pctBom}% de acerto. Isso \xE9 raro, e eu quis registrar.` : "com um acerto raro de ver. Eu quis registrar."),
      c.obs(2),
      "Nesse n\xEDvel, a \xFAnica coisa que eu sugeriria \xE9 proteger o que est\xE1 forte com a Revis\xE3o, que leva poucos minutos, e descansar. O resto voc\xEA j\xE1 faz melhor do que eu faria.",
      c.fecho()
    ]
  },
  {
    id: "v2",
    requer: temFatos,
    assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      "N\xE3o tenho nada a sugerir, s\xF3 a agradecer pelo exemplo. Gente assim deixa o ranking e a turma inteira melhores.",
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "posso te pedir uma coisa?", "Posso te pedir uma coisa?")],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? `, ${c.pctBom}% de acerto` : ""}. Pouqu\xEDssimas pessoas chegam aqui, e eu queria te pedir uma coisa.`,
      "Se encontrar qualquer quest\xE3o com algo estranho, ou um coment\xE1rio que voc\xEA faria melhor, me conta pelo bot\xE3o de relatar. Quem est\xE1 nesse n\xEDvel enxerga o que escapa a todo mundo, inclusive a mim.",
      c.obs(1),
      "E obrigado por estudar por aqui. \xC9 uma honra."
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "como voc\xEA estuda?", "Como voc\xEA estuda?")],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? ` e ${c.pctBom}% de acerto` : ""}. Fiquei curioso de verdade: como voc\xEA estuda?`,
      "Hor\xE1rio, ordem, o que faz quando uma quest\xE3o te pega. Muita gente me pergunta por onde come\xE7ar, e eu adoraria responder com o exemplo de algu\xE9m que chegou onde voc\xEA chegou.",
      c.obs(1),
      "\xC9 s\xF3 responder. Vou ler com aten\xE7\xE3o e guardar."
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "quem voc\xEA conhece que est\xE1 nessa?", "Quem voc\xEA conhece que est\xE1 nessa?")],
    corpo: (c) => [
      momento(c),
      `Com ${asSuas(c)}${c.pctBom !== null ? ` e ${c.pctBom}% de acerto` : ""}, voc\xEA conhece o site melhor do que quase todo mundo. Por isso o pedido.`,
      "Quem voc\xEA conhece que est\xE1 estudando para a mesma prova? Se o site te ajudou, mandar para essa pessoa \xE9 o melhor jeito de me agradecer, e deixa o ranking mais animado.",
      `Pelo seu link, quando a pessoa cria a conta e responde 20 quest\xF5es, voc\xEAs dois ganham 7 dias do plano completo: ${c.link("indicar")}`,
      "Obrigado, de cora\xE7\xE3o."
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "descansa tamb\xE9m", "Descansa tamb\xE9m")],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? `, ${c.pctBom}% de acerto` : ""}. Voc\xEA j\xE1 fez mais do que a prova pede.`,
      "Ent\xE3o o conselho de amigo \xE9 outro: descansa tamb\xE9m. Dormir bem nas semanas que faltam vale mais do que qualquer quest\xE3o nova, e a mem\xF3ria agradece. Eu aprendi isso tarde, e por isso insisto.",
      c.obs(1),
      c.fecho()
    ]
  }
];
var quandoConta = (c) => c.quando(Math.max(0, Math.round(Number(c.p.diasConta) || 0)));
var nunca_comecou = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "os primeiros dez minutos", "Os primeiros dez minutos"), nm(c, "por onde eu come\xE7aria", "Por onde eu come\xE7aria")],
    corpo: (c) => [
      momento(c),
      `Vi que voc\xEA criou a sua conta no Orto Quest\xF5es ${quandoConta(c)}, e fiquei feliz. Imagino que a rotina tenha apertado logo depois, porque \xE9 assim que ela funciona.`,
      "Se eu pudesse te dar um \xFAnico conselho para os primeiros dez minutos: cinco quest\xF5es de um tema que voc\xEA gosta, lendo o coment\xE1rio inteiro, inclusive das alternativas erradas. \xC9 ali que mora a pegadinha da banca, e \xE9 ali que o estudo come\xE7a a render.",
      `D\xE1 para fazer isso no intervalo, pelo celular, sem planejar nada: ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "que bom ter voc\xEA por aqui", "Que bom ter voc\xEA por aqui"), nm(c, "um oi de quem cuida do site", "Um oi de quem cuida do site")],
    corpo: (c) => [
      momento(c),
      "Passei para dar um oi. Sou eu que cuido do site, ortopedista tamb\xE9m, e gosto de escrever para quem acabou de chegar.",
      "Fiz o Orto Quest\xF5es para ser o lugar que eu queria ter tido quando estudava: abrir, fazer cinco quest\xF5es no intervalo e j\xE1 saber o que ler. Nenhuma decis\xE3o para tomar, s\xF3 sentar e fazer.",
      "Quando tiver dez minutos livres, que tal cinco quest\xF5es de um tema de que voc\xEA goste? \xC9 o bastante para pegar o jeito. O resto o site organiza.",
      "E se travar em qualquer coisa, me responde aqui. Vou gostar de ajudar."
    ]
  },
  {
    id: "v3",
    requer: (c) => !!(c.fatos.prova || c.fatos.etapa || c.fatos.cronograma),
    assuntos: (c) => [nm(c, "por onde come\xE7ar", "Por onde come\xE7ar"), diasProva(c) && nm(c, `faltam ${diasProva(c)}`, `Faltam ${diasProva(c)} para ${c.nomeProva}`)],
    corpo: (c) => [
      momento(c),
      J(c.fato("prova"), c.fato("etapa"), c.fato("cronograma")),
      "O jeito mais gostoso de come\xE7ar \xE9 pelo tema de que voc\xEA mais gosta. Come\xE7ar pelo que d\xE1 prazer ajuda a criar o h\xE1bito; o resto vem depois, e a Revis\xE3o cuida de trazer de volta o que te pegou.",
      c.tempo(),
      `O tema fica \xE0 sua escolha aqui: ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "s\xF3 tr\xEAs quest\xF5es", "S\xF3 tr\xEAs quest\xF5es"), nm(c, "sua conta est\xE1 pronta", "Sua conta est\xE1 pronta")],
    corpo: (c) => [
      momento(c),
      "Sua conta est\xE1 pronta, esperando por voc\xEA, e eu sei que o dif\xEDcil n\xE3o \xE9 a conta: \xE9 o tempo.",
      "Uma ideia: no pr\xF3ximo intervalo do plant\xE3o, abrir o site no celular e responder tr\xEAs quest\xF5es. S\xF3 tr\xEAs, para sentir como \xE9. Cada uma tem a explica\xE7\xE3o de todas as alternativas, ent\xE3o tr\xEAs j\xE1 ensinam bastante.",
      "Se gostar, o resto vem sozinho: a Revis\xE3o aprende com o que te pega e traz de volta na hora certa, e o Desempenho mostra onde voc\xEA est\xE1 crescendo.",
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "a parte que eu mais caprichei", "A parte que eu mais caprichei"), nm(c, "sobre as quest\xF5es daqui", "Sobre as quest\xF5es daqui")],
    corpo: (c) => [
      momento(c),
      "Uma curiosidade sobre o site: cada quest\xE3o tem a explica\xE7\xE3o de todas as alternativas, n\xE3o s\xF3 da certa. \xC9 ali que mais se aprende, e \xE9 a parte em que eu mais caprichei.",
      "Isso muda o jeito de estudar: uma quest\xE3o bem lida vale por quatro, e cabe em dois minutos. Para quem tem o dia tomado, \xE9 a diferen\xE7a entre estudar de verdade e adiar para sempre.",
      `Que tal ver como funciona com uma quest\xE3o s\xF3? ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v6",
    requer: (c) => (c.p.diasConta ?? 0) > 3,
    assuntos: (c) => [nm(c, "sem pressa", "Sem pressa"), nm(c, "quando a rotina der folga", "Quando a rotina der folga")],
    corpo: (c) => [
      "Imagino que a rotina esteja puxada desde que voc\xEA criou a conta. Plant\xE3o, aula, vida. Eu lembro bem.",
      "Sem pressa nenhuma. Quando der, um come\xE7o pequeno j\xE1 basta: um tema, cinco quest\xF5es, sem se preocupar com nada. O site guarda tudo, e a Revis\xE3o cuida do resto.",
      c.obs(1, ["prova", "etapa"]),
      "O que eu aprendi na resid\xEAncia \xE9 que o estudo que funciona \xE9 o que cabe na rotina real, n\xE3o na rotina ideal. Dez minutos de verdade valem mais que duas horas imagin\xE1rias.",
      c.fecho()
    ]
  }
];
var boas_vindas = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "que bom come\xE7o", "Que bom come\xE7o"), nm(c, "tr\xEAs coisas para os primeiros dias", "Tr\xEAs coisas para os primeiros dias")],
    corpo: (c) => [
      momento(c),
      `Vi que voc\xEA chegou ao Orto Quest\xF5es h\xE1 pouco e ${c.dez ? `j\xE1 respondeu ${Q(c.r)}` : "j\xE1 deu os primeiros passos"}. Que bom come\xE7o.`,
      "Tr\xEAs coisas que ajudam nos primeiros dias, de presente: ler o coment\xE1rio mesmo quando acertar, deixar a Revis\xE3o trazer de volta as quest\xF5es que te pegaram e n\xE3o se preocupar com n\xFAmeros agora.",
      "E uma quarta, de amigo: cinco quest\xF5es no intervalo j\xE1 contam. N\xE3o precisa esperar uma noite livre para o estudo valer.",
      "Qualquer d\xFAvida, \xE9 s\xF3 responder este e-mail. Vou gostar de ajudar."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "que bom ter voc\xEA por aqui", "Que bom ter voc\xEA por aqui")],
    corpo: (c) => [
      "Que bom ter voc\xEA por aqui. Sou eu que cuido do site, ortopedista tamb\xE9m, e gosto de escrever para quem est\xE1 chegando.",
      J(momento(c), c.obs(1, ["prova", "etapa", "cronograma"])),
      `${c.dez ? `As suas primeiras ${Q(c.r)}` : "As suas primeiras quest\xF5es"} j\xE1 est\xE3o salvas, e as que te pegaram v\xE3o voltar na Revis\xE3o no momento certo. Voc\xEA s\xF3 precisa sentar e fazer; o resto o site decide.`,
      `A Revis\xE3o fica aqui: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "um conselho de quem fez o site", "Um conselho de quem fez o site")],
    corpo: (c) => [
      momento(c),
      "Um conselho de quem fez o site, se servir: pouco e todo dia rende mais do que muito de vez em quando.",
      `Voc\xEA j\xE1 come\xE7ou${c.dez ? `, com ${Q(c.r)}` : ""}. Se conseguir manter umas dez por dia, no hor\xE1rio que sobrar, em um m\xEAs o h\xE1bito est\xE1 criado e o seu estudo come\xE7a a contar uma hist\xF3ria bonita.`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "vi a sua chegada", "Vi a sua chegada")],
    corpo: (c) => [
      "Escrevo para dizer que vi a sua chegada, e que fico feliz de ter mais algu\xE9m estudando ortopedia com tanta vontade por aqui.",
      J(momento(c), c.fato("prova"), c.fato("etapa")),
      "O site foi feito para quem tem pouco tempo: voc\xEA abre, a lista j\xE1 est\xE1 pronta, e cada quest\xE3o explica todas as alternativas. N\xE3o precisa planejar nada nos primeiros dias; s\xF3 aparecer.",
      "Se encontrar qualquer coisa estranha numa quest\xE3o ou tiver uma ideia, me conta. O site melhora muito com isso.",
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "o melhor do site", "O melhor do site"), nm(c, "uma dica para a primeira semana", "Uma dica para a primeira semana")],
    corpo: (c) => [
      momento(c),
      `${c.dez ? `${cap(Q(c.r))} em poucos dias.` : "Come\xE7ou em poucos dias."} Que bom come\xE7o.`,
      "Uma dica para a primeira semana: quando uma quest\xE3o te pegar, ler por que cada alternativa est\xE1 certa ou errada. \xC9 o que o site tem de melhor, e \xE9 o que faz uma quest\xE3o valer por quatro.",
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v6",
    requer: temFatos,
    assuntos: (c) => [nm(c, "reparei no seu come\xE7o", "Reparei no seu come\xE7o")],
    corpo: (c) => [
      J("Reparei no seu come\xE7o por aqui, e fiquei feliz.", momento(c)),
      c.obs(2, ["horario", "prova", "etapa", "cronograma"]),
      `${c.dez ? `${cap(Q(c.r))} em poucos dias j\xE1 mostram` : "Os primeiros passos em poucos dias j\xE1 mostram"} muita vontade. O pr\xF3ximo passo \xE9 deixar a Revis\xE3o trabalhar por voc\xEA: ela traz de volta, no momento certo, as quest\xF5es que te pegaram.`,
      c.fecho()
    ]
  }
];
var comecando = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "o come\xE7o \xE9 a parte mais dif\xEDcil", "O come\xE7o \xE9 a parte mais dif\xEDcil"), c.dez && nm(c, `suas primeiras ${Q(c.r)}`, `Suas primeiras ${Q(c.r)}`)],
    corpo: (c) => [
      momento(c),
      `Vi que voc\xEA ${c.dez ? `j\xE1 respondeu ${Q(c.r)}` : "j\xE1 deu os primeiros passos"}. O come\xE7o \xE9 a parte mais dif\xEDcil, e voc\xEA est\xE1 atravessando com vontade.`,
      "O que mais ajuda agora \xE9 const\xE2ncia: um pouco todo dia, mesmo nos dias corridos. Cinco no \xF4nibus, cinco antes de dormir. O resto vem quase sem perceber.",
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "vi o seu come\xE7o", "Vi o seu come\xE7o")],
    corpo: (c) => [
      c.obs(1, ["prova", "etapa", "horario", "cronograma"]) ?? momento(c),
      `Voc\xEA ${c.dez ? `j\xE1 tem ${Q(c.r)} respondidas` : "j\xE1 come\xE7ou"}. Quando chegar \xE0s trinta, o site j\xE1 consegue te mostrar os temas em que voc\xEA mais brilha.`,
      c.dica(),
      c.tempo(),
      `Para seguir: ${c.link("treinar")}`
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "cinco por dia", "Cinco por dia")],
    corpo: (c) => [
      momento(c),
      "Uma ideia simples, se combinar com voc\xEA: cinco quest\xF5es por dia, no mesmo hor\xE1rio.",
      `Parece pouco, mas em um m\xEAs s\xE3o mais de cem. E com ${asSuas(c)}, o caminho j\xE1 est\xE1 aberto.`,
      "O segredo n\xE3o \xE9 o n\xFAmero, \xE9 o hor\xE1rio fixo: a cabe\xE7a para de negociar se vai estudar e s\xF3 vai.",
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "como est\xE1 sendo?", "Como est\xE1 sendo?")],
    corpo: (c) => [
      momento(c),
      `Voc\xEA ${c.dez ? `j\xE1 fez ${Q(c.r)}` : "j\xE1 come\xE7ou"} por aqui, e eu queria saber: como est\xE1 sendo?`,
      "Os coment\xE1rios est\xE3o ajudando? Alguma coisa ficou confusa no site? O tempo est\xE1 dando? Pode responder do jeito que quiser, mesmo que seja uma linha. Eu leio tudo.",
      c.tempo()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "a Revis\xE3o vai trabalhar por voc\xEA", "A Revis\xE3o vai trabalhar por voc\xEA")],
    corpo: (c) => [
      momento(c),
      "Uma coisa de que talvez ningu\xE9m tenha te falado: as quest\xF5es que te pegam voltam sozinhas na Revis\xE3o, no momento certo para fixar. N\xE3o precisa anotar nada nem lembrar de nada.",
      `Vale abrir de vez em quando, antes das quest\xF5es novas. Leva poucos minutos e \xE9 onde o estudo mais rende: ${c.link("revisao")}`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v6",
    requer: temFatos,
    assuntos: (c) => [nm(c, "uma coisa que reparei", "Uma coisa que reparei")],
    corpo: (c) => [
      momento(c),
      c.obs(2, ["horario", "prova", "etapa", "maisEstudada", "cronograma"]),
      `E vi que voc\xEA ${c.dez ? `j\xE1 est\xE1 com ${Q(c.r)}` : "j\xE1 deu os primeiros passos"}. Quando passar das trinta, d\xE1 para enxergar com mais clareza os temas em que voc\xEA mais brilha.`,
      `At\xE9 l\xE1, o melhor \xE9 seguir no seu ritmo, nos intervalos que der: ${c.link("treinar")}`
    ]
  }
];
var comecou_parou = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "tudo o que voc\xEA fez continua salvo", "Tudo o que voc\xEA fez continua salvo"), nm(c, "sobre o seu come\xE7o", "Sobre o seu come\xE7o")],
    corpo: (c) => [
      momento(c),
      `Lembrei de voc\xEA: o seu come\xE7o no Orto Quest\xF5es${c.dez ? `, com ${Q(c.r)},` : ""} me deixou feliz. Sei como a rotina aperta logo depois, e acontece com todo mundo: o dif\xEDcil \xE9 transformar o come\xE7o em h\xE1bito.`,
      "O que mais funciona \xE9 pouco e todo dia. Tr\xEAs quest\xF5es no \xF4nibus, duas antes de dormir, e quando voc\xEA v\xEA, j\xE1 passou de cem. Tudo o que voc\xEA fez continua salvo, e as que te pegaram voltam na Revis\xE3o no momento certo.",
      `Que tal fazer as pr\xF3ximas hoje, se der? ${c.link("treinar")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "posso ajudar em alguma coisa?", "Posso ajudar em alguma coisa?")],
    corpo: (c) => [
      momento(c),
      `Voc\xEA come\xE7ou${c.dez ? `, com ${Q(c.r)},` : ""} e depois imagino que a rotina tenha apertado. Fiquei pensando se alguma coisa no site ficou confusa, ou se foi s\xF3 a vida.`,
      "Se foi o site, me conta respondendo este e-mail, que eu ajudo. Se foi a vida, tudo bem tamb\xE9m: o site fica aqui, do jeito que voc\xEA deixou, sem nenhuma pressa.",
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "recome\xE7ar \xE9 mais f\xE1cil do que parece", "Recome\xE7ar \xE9 mais f\xE1cil do que parece")],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua \xFAltima quest\xE3o, e lembrei de voc\xEA.`,
      momento(c),
      `Recome\xE7ar \xE9 mais f\xE1cil do que parece: abrir a Revis\xE3o, fazer as que est\xE3o esperando e pronto. Em dez minutos voc\xEA est\xE1 de volta, sem precisar decidir nada: ${c.link("revisao")}`,
      c.obs(1, ["prova", "etapa", "cronograma"]),
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "o come\xE7o \xE9 sempre assim", "O come\xE7o \xE9 sempre assim")],
    corpo: (c) => [
      momento(c),
      "O come\xE7o \xE9 sempre assim: alguns dias de empolga\xE7\xE3o, depois a vida aperta. Acontece com todo mundo, e aconteceu comigo mais de uma vez na resid\xEAncia.",
      `${guardado(c)}. Quando der, que tal voltar com cinco, de um tema de que voc\xEA goste? N\xE3o precisa recuperar nada, s\xF3 recome\xE7ar pequeno.`,
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "uma ideia para voltar com leveza", "Uma ideia para voltar com leveza")],
    corpo: (c) => [
      momento(c),
      "Uma ideia para voltar com leveza: no hor\xE1rio em que voc\xEA costuma estar no celular, trocar cinco minutos de rede social por tr\xEAs quest\xF5es.",
      `Parece bobo, mas \xE9 assim que o h\xE1bito pega. ${guardado(c)}, esperando a pr\xF3xima, e cada quest\xE3o explica todas as alternativas, ent\xE3o tr\xEAs j\xE1 ensinam.`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "o site fica aqui por voc\xEA", "O site fica aqui por voc\xEA")],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua \xFAltima quest\xE3o, e escrevo s\xF3 para dizer que lembrei de voc\xEA.`,
      momento(c),
      `Se alguma coisa no site n\xE3o funcionou bem para voc\xEA, me conta? Isso me ajuda muito. E se foi s\xF3 a rotina, ${asSuas(c)} est\xE1 esperando, sem pressa.`,
      "Dez minutos no intervalo j\xE1 contam. N\xE3o precisa esperar um dia livre, porque na resid\xEAncia ele quase nunca chega.",
      c.fecho()
    ]
  }
];
var pausa = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "lembrei de voc\xEA", "Lembrei de voc\xEA"), nm(c, "uma sess\xE3o curta, se der", "Uma sess\xE3o curta, se der")],
    corpo: (c) => {
      const a = c.areaRecente();
      return [
        `Faz ${tempoFora(c.p.diasParado)} desde a sua \xFAltima sess\xE3o, e lembrei de voc\xEA. A rotina deve ter apertado, e est\xE1 tudo bem.`,
        a ? `Voc\xEA estava em ${a.em}, e a Revis\xE3o j\xE1 separou as quest\xF5es desse tema que pedem uma segunda olhada. Est\xE1 tudo guardado, do jeito que voc\xEA deixou.` : "A Revis\xE3o j\xE1 separou as quest\xF5es que pedem uma segunda olhada. Est\xE1 tudo guardado, do jeito que voc\xEA deixou.",
        "Uma sess\xE3o curta costuma valer mais do que uma maratona no fim de semana. Dez quest\xF5es j\xE1 mant\xEAm o h\xE1bito vivo, e cabem num intervalo.",
        `Fica aqui o atalho, se quiser: ${c.link("revisao")}`,
        c.fecho()
      ];
    }
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "uma sess\xE3o curta hoje?", "Uma sess\xE3o curta hoje?")],
    corpo: (c) => {
      const a = c.areaRecente();
      return [
        momento(c),
        `S\xF3 um oi r\xE1pido: faz alguns dias desde a sua \xFAltima sess\xE3o, e senti falta de voc\xEA por aqui.${a ? ` Voc\xEA estava em ${a.em}. ${a.sabor[a.sabor.length - 1]}` : ""}`,
        `Que tal dez minutos hoje, se a rotina deixar? ${guardado(c)}, e a Revis\xE3o j\xE1 separou por onde recome\xE7ar: ${c.link("revisao")}`,
        c.tempo()
      ];
    }
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "a Revis\xE3o est\xE1 pronta", "A Revis\xE3o est\xE1 pronta")],
    corpo: (c) => {
      const a = c.areaRecente();
      return [
        `Faz ${tempoFora(c.p.diasParado)} desde a sua \xFAltima sess\xE3o${a ? `, quando voc\xEA estava em ${a.em}` : ""}.`,
        momento(c),
        "Enquanto voc\xEA estava fora, a Revis\xE3o separou as quest\xF5es que pedem uma segunda olhada, para voltar no momento certo. \xC9 o jeito mais leve de retomar: nada para decidir, s\xF3 abrir e fazer.",
        `Fica aqui: ${c.link("revisao")}`,
        c.fecho()
      ];
    }
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "dez quest\xF5es hoje?", "Dez quest\xF5es hoje?")],
    corpo: (c) => {
      const a = c.areaRecente();
      return [
        `Faz ${tempoFora(c.p.diasParado)} desde a sua \xFAltima quest\xE3o, e passei para te mandar um empurr\xE3ozinho gentil.`,
        a ? `Voc\xEA estava em ${a.em}. ${a.sabor[a.sabor.length - 1]} Vale voltar por ali, que o tema ainda est\xE1 quente na mem\xF3ria.` : "O tema em que voc\xEA estava ainda est\xE1 quente na mem\xF3ria, e vale voltar por ali.",
        `Dez quest\xF5es j\xE1 bastam para retomar o ritmo, e a Revis\xE3o j\xE1 separou as que mais valem: ${c.link("revisao")}`,
        c.fecho()
      ];
    }
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "est\xE1 tudo guardado", "Est\xE1 tudo guardado")],
    corpo: (c) => {
      const a = c.areaRecente();
      return [
        momento(c),
        `Alguns dias sem aparecer acontecem com todo mundo que estuda no meio da resid\xEAncia. ${guardado(c)}${a ? `, inclusive o que voc\xEA vinha fazendo em ${a.em}` : ""}, do jeito que voc\xEA deixou.`,
        "Para voltar sem peso: n\xE3o tente recuperar o tempo. Abra a Revis\xE3o, fa\xE7a dez, e pronto. \xC9 assim que o embalo volta.",
        `A Revis\xE3o fica aqui: ${c.link("revisao")}`,
        c.fecho()
      ];
    }
  }
];
var sumiu = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "lembrei de voc\xEA hoje", "Lembrei de voc\xEA hoje"), nm(c, "senti sua falta por aqui", "Senti sua falta por aqui")],
    corpo: (c) => [
      `Lembrei de voc\xEA hoje, olhando quem estuda por aqui. Faz ${tempoFora(c.p.diasParado)} que a gente n\xE3o se v\xEA por aqui, e a primeira coisa que pensei foi: a rotina deve ter apertado. Acontece com todo mundo, e est\xE1 tudo bem.`,
      c.obs(1, ["melhorArea", "maisEstudada", "ranking"]) ?? `Reparei numa coisa que vale registrar: ${asSuas(c)} est\xE1 guardado, do jeito que voc\xEA deixou. Nada disso se perdeu.`,
      "Uma ideia para voltar sem peso: n\xE3o tente recuperar o tempo. Abra a Revis\xE3o, que j\xE1 separou as quest\xF5es que pedem uma segunda olhada, e fa\xE7a dez. Dez minutos, no intervalo que der. \xC9 assim que o embalo volta.",
      `A Revis\xE3o fica aqui: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "seu progresso est\xE1 guardado", "Seu progresso est\xE1 guardado")],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} que n\xE3o te vejo por aqui, e passei s\xF3 para dizer que o seu progresso est\xE1 todo guardado.`,
      momento(c),
      c.pctBom !== null ? `${cap(Q(c.r))}, ${c.pctBom}% de acerto e um Caderno de erros esperando por voc\xEA. Nada disso se perde, e nada disso precisa ser refeito.` : `${cap(asSuas(c))} e um Caderno de erros esperando por voc\xEA. Nada disso se perde, e nada disso precisa ser refeito.`,
      "Quando a rotina der uma folga, uma sess\xE3o curta j\xE1 retoma o embalo. N\xE3o precisa ser uma noite inteira; dez minutos bastam para o h\xE1bito lembrar de voc\xEA.",
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "plant\xE3o, cansa\xE7o, vida", "Plant\xE3o, cansa\xE7o, vida")],
    corpo: (c) => [
      "Plant\xE3o, cansa\xE7o, vida: acontece com todo mundo. O que leva algu\xE9m at\xE9 a aprova\xE7\xE3o \xE9 voltar, n\xE3o ser perfeito. Eu mesmo parei e voltei mais vezes do que gosto de admitir.",
      c.obs(1, ["prova", "melhorArea", "etapa", "cronograma"]),
      `Que tal recome\xE7ar pequeno? Dez quest\xF5es hoje, dez amanh\xE3, no intervalo que der. O h\xE1bito volta mais r\xE1pido do que parece: ${c.link("treinar")}`,
      c.tempo(),
      c.fecho()
    ]
  },
  {
    id: "v4",
    requer: (c) => !!c.fatos.melhorArea || !!c.fatos.maisEstudada,
    assuntos: (c) => [nm(c, "lembrei de voc\xEA", "Lembrei de voc\xEA"), c.fatos.melhorArea && nm(c, `${c.area(c.fatos.melhorArea.slug).em} e voc\xEA`, `Sobre ${c.area(c.fatos.melhorArea.slug).em}`)],
    corpo: (c) => [
      `Lembrei de voc\xEA olhando quem estudava por aqui. Faz ${tempoFora(c.p.diasParado)} que a gente n\xE3o se v\xEA por aqui, e est\xE1 tudo bem.`,
      c.obs(1, ["melhorArea", "maisEstudada"]),
      "Esse trabalho bonito continua todo aqui, esperando por voc\xEA. Quando der, uma sess\xE3o curta j\xE1 retoma o embalo, e a Revis\xE3o j\xE1 sabe por onde come\xE7ar.",
      `Fica aqui: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v5",
    requer: (c) => c.diasProva !== null && c.diasProva >= 7,
    assuntos: (c) => [nm(c, `faltam ${diasProva(c)}`, `Faltam ${diasProva(c)} para ${c.nomeProva}`), nm(c, "a prova est\xE1 chegando", "A prova est\xE1 chegando")],
    corpo: (c) => [
      `Faltam ${diasProva(c)} para ${c.nomeProva}, e lembrei de voc\xEA. Faz ${tempoFora(c.p.diasParado)} que a gente n\xE3o se v\xEA por aqui, e imagino que a rotina tenha engolido o estudo.`,
      `Ainda d\xE1 tempo de fazer muita coisa, e ${asSuas(c)} j\xE1 \xE9 um \xF3timo come\xE7o. Nada se perdeu.`,
      `Quando quiser retomar, a Revis\xE3o est\xE1 aqui, com as quest\xF5es que pedem uma segunda olhada j\xE1 separadas: ${c.link("revisao")}`,
      "Dez minutos por dia, daqui at\xE9 a prova, valem mais do que uma maratona na v\xE9spera. E dormir tamb\xE9m conta.",
      c.fecho()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "do jeito que voc\xEA deixou", "O site est\xE1 do jeito que voc\xEA deixou"), nm(c, "um recado curto", "Um recado curto")],
    corpo: (c) => [
      momento(c),
      "S\xF3 um recado curto, com carinho: quando quiser voltar, o site est\xE1 do jeito que voc\xEA deixou.",
      `${cap(asSuas(c))} e as quest\xF5es para revisar continuam l\xE1, esperando por voc\xEA. N\xE3o precisa recuperar nada, nem explicar nada.`,
      c.tempo(),
      "Se quiser me contar o que aconteceu nessas semanas, \xE9 s\xF3 responder. Eu leio tudo."
    ]
  }
];
var obrigado_assinatura = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "obrigado, e os primeiros dez minutos", "Obrigado, e os primeiros dez minutos"), nm(c, "obrigado pela assinatura", "Obrigado pela assinatura")],
    corpo: (c) => [
      momento(c),
      "Vi que voc\xEA assinou o Orto Quest\xF5es e quis te escrever pessoalmente para agradecer. O site \xE9 um projeto independente, e \xE9 a assinatura que paga o servidor e o tempo de manter as quest\xF5es e os coment\xE1rios em dia.",
      `Se eu pudesse escolher o que voc\xEA faz nos primeiros dez minutos: montar o cronograma. Voc\xEA diz a data ${c.daProva}, e a partir da\xED a lista de cada dia j\xE1 est\xE1 pronta quando voc\xEA senta, com o que mais cai primeiro. \xC9 o que devolve mais tempo de tudo o que o plano tem.`,
      `Fica aqui: ${c.link("cronograma")}`,
      "E se alguma coisa n\xE3o funcionar, me responde. Eu leio tudo."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "obrigado pela confian\xE7a", "Obrigado pela confian\xE7a")],
    corpo: (c) => [
      momento(c),
      "Obrigado pela confian\xE7a. Fiquei feliz de verdade, do jeito que a gente fica quando um colega aposta no que a gente fez.",
      c.obs(1),
      `Uma dica para a assinatura render desde o primeiro dia: montar o cronograma com a data da sua prova. Ele organiza o que estudar em cada dia, come\xE7ando pelo que mais cai, e se ajusta sozinho quando a semana aperta: ${c.link("cronograma")}`,
      "E qualquer d\xFAvida, \xE9 s\xF3 responder."
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "fiquei muito feliz", "Fiquei muito feliz")],
    corpo: (c) => [
      momento(c),
      "Fiquei muito feliz de ver a sua assinatura.",
      c.dez ? `Voc\xEA j\xE1 tem ${Q(c.r)} por aqui${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ""}, e agora tem tudo liberado para ir at\xE9 a prova: cronograma, Simulado Nacional, temas que mais caem, Biblioteca de resumos.` : "Agora voc\xEA tem tudo liberado para ir at\xE9 a prova: cronograma, Simulado Nacional, temas que mais caem, Biblioteca de resumos.",
      "Meu compromisso \xE9 continuar melhorando as quest\xF5es e os coment\xE1rios toda semana. Se encontrar qualquer coisa estranha, me avisa?",
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "um obrigado de cora\xE7\xE3o", "Um obrigado de cora\xE7\xE3o")],
    corpo: (c) => [
      momento(c),
      "Um obrigado curto, mas de cora\xE7\xE3o, pela assinatura. Ela mant\xE9m o site de p\xE9 para voc\xEA e para todo mundo que estuda aqui.",
      "Nos primeiros dias, se eu pudesse sugerir uma ordem: primeiro o cronograma, para a lista do dia j\xE1 estar pronta quando voc\xEA sentar; depois os temas que mais caem, para saber onde insistir. O resto vem com calma.",
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v5",
    requer: temFatos,
    assuntos: (c) => [nm(c, "obrigado, e uma coisa que reparei", "Obrigado, e uma coisa que reparei")],
    corpo: (c) => [
      "Obrigado por assinar o Orto Quest\xF5es. Quis te escrever pessoalmente.",
      J(momento(c), c.obs(2)),
      `Se quiser aproveitar desde j\xE1, eu come\xE7aria pelo cronograma: voc\xEA coloca a data ${c.daProva} e ele monta a lista de cada dia, come\xE7ando pelo que mais cai. \xC9 o que mais devolve tempo. Fica aqui: ${c.link("cronograma")}`,
      "Mas, antes de tudo, obrigado."
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "quem assina mant\xE9m o site", "Quem assina mant\xE9m o site")],
    corpo: (c) => [
      momento(c),
      "Escrevo para agradecer a sua assinatura. N\xE3o tem empresa grande por tr\xE1s do Orto Quest\xF5es: tem eu, as quest\xF5es, os coment\xE1rios e quem assina. Agora voc\xEA faz parte disso.",
      "Em troca, o combinado \xE9 simples: voc\xEA senta e estuda, o site decide o resto. A lista do dia j\xE1 pronta, a Revis\xE3o trazendo o que precisa voltar, o Simulado Nacional todo m\xEAs.",
      c.tempo(),
      "Se tiver ideia, cr\xEDtica ou sugest\xE3o, a resposta deste e-mail chega direto para mim."
    ]
  }
];
var lista = (itens) => itens.map((t) => `- ${cap(t)}`).join("\n");
var eLista = (itens) => itens.length <= 1 ? itens.join("") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
var presente = (c) => `Antes de tudo, uma dica de presente. ${c.dica()}`;
var garantia = "Se n\xE3o for o que voc\xEA esperava, o reembolso em 7 dias \xE9 pelo pr\xF3prio site, sem precisar explicar nada.";
var portaAberta = "Se n\xE3o for a hora, tudo bem tamb\xE9m. Eu continuo por aqui.";
var cronogramaDevolve = (c) => c.um(
  `O que mais me preocupa em quem estuda com o dia cheio n\xE3o \xE9 a vontade, \xE9 o tempo gasto decidindo o que estudar. A pessoa chega, abre o site, pensa "o que eu fa\xE7o hoje?", e l\xE1 se foram quinze minutos. O cronograma existe para devolver esses quinze minutos: voc\xEA diz a data ${c.daProva}, e a partir da\xED a lista de cada dia j\xE1 est\xE1 pronta quando voc\xEA senta, com o que mais cai primeiro e o tempo de cada parte. Se a semana apertar, ele se ajusta sozinho.`,
  `O cronograma faz uma coisa simples: voc\xEA diz a data ${c.daProva}, e ele monta a lista de cada dia, com o que mais cai primeiro e o tempo de cada parte. Quando voc\xEA senta, j\xE1 est\xE1 pronto. Se um plant\xE3o bagun\xE7ar a semana, ele redistribui sozinho. \xC9 menos quinze minutos por dia decidindo, e quinze minutos por dia \xE9 muito para quem tem pouco.`
);
var convite_20 = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "uma dica e um convite", "Uma dica e um convite"), nm(c, "uma coisa que pode te ajudar", "Uma coisa que pode te ajudar")],
    corpo: (c) => [
      momento(c),
      `Vi que voc\xEA j\xE1 respondeu ${Q(c.r)} no Orto Quest\xF5es, e fiquei feliz de ver voc\xEA por aqui.`,
      presente(c),
      `E, caso seja \xFAtil para a sua rotina, queria te contar o que a assinatura faz por ela:
${lista(c.beneficios(3))}`,
      `${garantia} Se fizer sentido para o seu momento, os planos est\xE3o aqui: ${c.link("assinatura")}`,
      portaAberta
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "j\xE1 conhece o cronograma?", "J\xE1 conhece o cronograma?")],
    corpo: (c) => [
      momento(c),
      "Uma pergunta: voc\xEA j\xE1 conhece o cronograma do site?",
      cronogramaDevolve(c),
      `Faz parte da assinatura, junto com ${eLista(c.beneficios(3, true).filter((b) => !b.startsWith("o cronograma")).slice(0, 2))}. D\xE1 para ver uma pr\xE9via do seu antes de decidir qualquer coisa: ${c.link("cronograma")}`,
      portaAberta
    ]
  },
  {
    id: "v3",
    requer: temFatos,
    assuntos: (c) => [nm(c, "vi o seu come\xE7o", "Vi o seu come\xE7o"), nm(c, "uma sugest\xE3o para o seu estudo", "Uma sugest\xE3o para o seu estudo")],
    corpo: (c) => [
      J(momento(c), `Vi as suas ${Q(c.r)}, e quis te escrever.`),
      c.obs(2),
      `Pelo jeito que voc\xEA estuda, acho que a assinatura combinaria com a sua rotina. Ela soma:
${lista(c.beneficios(3))}`,
      `${garantia} Os planos ficam aqui, se quiser olhar: ${c.link("assinatura")}`,
      portaAberta
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "tr\xEAs coisas para a sua rotina", "Tr\xEAs coisas para a sua rotina"), nm(c, "chegar \xE0 prova com mais calma", "Chegar \xE0 prova com mais calma")],
    corpo: (c) => [
      momento(c),
      `Voc\xEA j\xE1 fez ${Q(c.r)}, ent\xE3o j\xE1 conhece o jeito do site. Se a sua meta \xE9 chegar \xE0 prova com mais calma e menos tempo perdido, a assinatura soma tr\xEAs coisas que ajudam muito:
${lista(c.beneficios(3))}`,
      `Se quiser olhar com calma: ${c.link("assinatura")}`,
      garantia,
      "Qualquer d\xFAvida, me responde. Vou gostar de ajudar."
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "quem assina mant\xE9m o site de p\xE9", "Quem assina mant\xE9m o site de p\xE9")],
    corpo: (c) => [
      momento(c),
      "Uma curiosidade sobre o Orto Quest\xF5es: \xE9 um projeto independente, e quem assina \xE9 quem mant\xE9m o site de p\xE9.",
      `Al\xE9m de apoiar, a assinatura libera ${eLista(c.beneficios(3, true))}. O que ela devolve, no fim, \xE9 tempo: menos decis\xE3o, mais estudo.`,
      `${garantia} Se quiser conhecer: ${c.link("assinatura")}`,
      portaAberta
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, "se fizer sentido para voc\xEA", "Se fizer sentido para voc\xEA")],
    corpo: (c) => [
      momento(c),
      `${cap(Q(c.r))} j\xE1 d\xE3o uma boa ideia de se o site combina com o seu jeito de estudar.`,
      `Se combinar, a assinatura leva isso adiante, na dire\xE7\xE3o da sua prova e da sua rotina:
${lista(c.beneficios(3))}`,
      `Os planos est\xE3o aqui, se quiser olhar: ${c.link("assinatura")}`,
      portaAberta
    ]
  },
  {
    id: "v7",
    requer: (c) => (c.p.viuPlanos ?? 0) > 0,
    assuntos: (c) => [nm(c, "sobre os planos", "Sobre os planos"), nm(c, "alguma d\xFAvida sobre os planos?", "Alguma d\xFAvida sobre os planos?")],
    corpo: (c) => [
      momento(c),
      "Vi que voc\xEA deu uma olhada nos planos, e quis escrever para ajudar no que for preciso.",
      "Se ficou alguma d\xFAvida, me responde que eu explico. \xC0s vezes \xE9 coisa simples, como a forma de pagamento ou o que acontece se o site n\xE3o for o que voc\xEA esperava.",
      `Resumindo o que a assinatura soma:
${lista(c.beneficios(3))}`,
      garantia
    ]
  }
];
var tomAcerto = (c) => {
  const p = c.pctBom;
  if (p !== null) {
    if (p >= 80) return c.um(`E com ${p}% de acerto, o que \xE9 admir\xE1vel.`, `${p}% de acerto, ali\xE1s. Parab\xE9ns, de verdade.`);
    if (p >= 70) return c.um(`E com ${p}% de acerto, um resultado muito bonito.`, `Com ${p}% de acerto, voc\xEA j\xE1 est\xE1 num patamar muito bom.`);
    if (p >= 60) return c.um(`E com ${p}% de acerto, uma base firme.`, `Seu acerto de ${p}% mostra uma base firme.`);
    return c.um(`Seu acerto de ${p}% j\xE1 passa da metade, e \xE9 exatamente a fase em que mais d\xE1 para crescer.`, "Voc\xEA est\xE1 no meio do caminho, que \xE9 onde mais d\xE1 para crescer.");
  }
  if (c.pct === null) return null;
  if (c.pct >= 40) return "Voc\xEA est\xE1 no meio do caminho, que \xE9 onde mais d\xE1 para crescer.";
  return c.um("D\xE1 para ver que voc\xEA \xE9 de quem n\xE3o desiste, e \xE9 isso que mais conta numa prepara\xE7\xE3o longa.", "Voc\xEA est\xE1 construindo a sua base com const\xE2ncia, e \xE9 nessa fase que um bom plano mais ajuda.");
};
var convite_50 = [
  {
    id: "v1",
    assuntos: (c) => [diasProva(c) && nm(c, `faltam ${diasProva(c)} e eu estou na torcida`, `Faltam ${diasProva(c)} e eu estou na torcida`), nm(c, "escrevi para voc\xEA", "Escrevi para voc\xEA"), nm(c, "um convite pessoal", "Um convite pessoal")],
    corpo: (c) => [
      momento(c),
      J(`Parei no seu nome por um motivo: ${Q(c.r)} j\xE1 respondidas.`, c.obs(1, ["melhorArea", "ranking", "maisEstudada"]), "Isso n\xE3o aparece por acaso. \xC9 de quem senta e faz, mesmo com sono."),
      cronogramaDevolve(c),
      `D\xE1 para ver uma pr\xE9via do seu aqui: ${c.link("cronograma")}. ${garantia}`,
      portaAberta
    ]
  },
  {
    id: "v2",
    requer: (c) => !!c.fatos.ranking,
    assuntos: (c) => [nm(c, `${c.fatos.ranking}\xBA no ranking`, `${c.fatos.ranking}\xBA no ranking`), nm(c, "uma das pessoas que mais estudam aqui", "Uma das pessoas que mais estudam aqui")],
    corpo: (c) => [
      momento(c),
      `Voc\xEA est\xE1 em ${c.fatos.ranking}\xBA no ranking geral, ou seja, entre as pessoas que mais estudam no Orto Quest\xF5es. Quis que voc\xEA soubesse que eu vi, e que fiquei feliz.`,
      J(c.obs(1, ["melhorArea", "horario", "prova"]), tomAcerto(c)),
      `Para quem estuda com essa dedica\xE7\xE3o, acho que a assinatura faz sentido pelo tempo que ela devolve: ${eLista(c.beneficios(3, true))}. ${garantia}`,
      `Os planos ficam aqui, se quiser olhar: ${c.link("assinatura")}`,
      portaAberta
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "uma conversa sobre o seu estudo", "Uma conversa sobre o seu estudo")],
    corpo: (c) => [
      momento(c),
      `A ideia do Orto Quest\xF5es \xE9 ser o lugar onde se estuda pelas provas reais, com cada alternativa explicada, no tempo que a rotina deixa. Ver algu\xE9m com ${Q(c.r)} me deixa feliz: quer dizer que a ideia est\xE1 funcionando.`,
      J(c.obs(1), tomAcerto(c)),
      presente(c),
      `Se voc\xEA quiser ir al\xE9m, a assinatura soma:
${lista(c.beneficios(3))}`,
      `Sem press\xE3o nenhuma. Se fizer sentido: ${c.link("assinatura")}`
    ]
  },
  {
    id: "v4",
    requer: (c) => c.diasProva !== null && c.diasProva >= 7,
    assuntos: (c) => [nm(c, `faltam ${diasProva(c)} e eu estou na torcida`, `Faltam ${diasProva(c)} para ${c.nomeProva}`), nm(c, `um plano at\xE9 ${c.nomeProva}`, `Um plano at\xE9 ${c.nomeProva}`)],
    corpo: (c) => [
      J(`Vi que ${c.nomeProva} est\xE1 a ${diasProva(c)}${c.fatos.horario ? ` e que voc\xEA estuda quase sempre ${c.fatos.horario === "noite" ? "\xE0 noite" : c.fatos.horario === "madrugada" ? "de madrugada" : c.fatos.horario === "manha" ? "de manh\xE3 cedo" : c.fatos.horario === "almoco" ? "na hora do almo\xE7o" : "\xE0 tarde"}` : ""}. Conhe\xE7o bem essa rotina: o dia inteiro no hospital e a prova esperando no fim dele.`),
      J(`No seu hist\xF3rico, ${Q(c.r)} j\xE1 respondidas me chamaram a aten\xE7\xE3o.`, c.obs(1, ["melhorArea", "ranking", "maisEstudada"]), tomAcerto(c)),
      cronogramaDevolve(c),
      `D\xE1 para ver uma pr\xE9via do seu aqui: ${c.link("cronograma")}. ${garantia}`,
      portaAberta
    ]
  },
  {
    id: "v5",
    requer: (c) => !!c.fatos.areaFraca,
    assuntos: (c) => [nm(c, "uma ideia para o tema que mais te desafia", "Uma ideia para o tema que mais te desafia")],
    corpo: (c) => [
      momento(c),
      `Olhei as suas ${Q(c.r)} com calma, e quis te escrever.`,
      J(c.fato("melhorArea"), c.fato("areaFraca")),
      "Na assinatura, d\xE1 para ver os temas que mais caem em cada \xE1rea e como a turma respondeu cada alternativa. Ajuda a saber onde vale insistir sem gastar tempo descobrindo sozinho, e mostra que muita gente trope\xE7a nas mesmas quest\xF5es.",
      `${garantia} Se quiser conhecer: ${c.link("assinatura")}`,
      portaAberta
    ]
  },
  {
    id: "v6",
    requer: (c) => !!c.fatos.flashcards && !!c.p.limiteGratisLigado,
    assuntos: (c) => [nm(c, "quest\xF5es e flashcards sem limite", "Quest\xF5es e flashcards sem limite")],
    corpo: (c) => [
      momento(c),
      `Vi que voc\xEA usa as quest\xF5es e os flashcards: ${Q(c.r)} e ${N(c.fatos.flashcards)} cartas at\xE9 agora. Que dedica\xE7\xE3o.`,
      tomAcerto(c),
      `Com esse ritmo, imagino que o limite di\xE1rio \xE0s vezes atrapalhe justamente no dia em que sobrou tempo. Na assinatura, quest\xF5es e flashcards ficam sem limite, e ainda entram ${eLista(c.beneficios(3, true).filter((b) => !b.includes("sem limite")).slice(0, 2))}.`,
      `${garantia} Os planos ficam aqui, se quiser olhar: ${c.link("assinatura")}`,
      portaAberta
    ]
  },
  {
    id: "v7",
    requer: temFatos,
    assuntos: (c) => [nm(c, "um convite, com carinho", "Um convite, com carinho")],
    corpo: (c) => [
      momento(c),
      J("Queria te fazer um convite, e n\xE3o \xE9 pelo n\xFAmero de quest\xF5es: \xE9 pelo jeito que voc\xEA estuda.", c.obs(2)),
      presente(c),
      `A assinatura foi pensada para quem estuda assim, com pouco tempo e muita vontade:
${lista(c.beneficios(3))}`,
      `${garantia} Se quiser conhecer: ${c.link("assinatura")}`,
      portaAberta
    ]
  }
];
var teotOuProva = (c) => c.fatos.prova === "teot" || !!c.fatos.cronograma || !c.fatos.prova && (c.fatos.etapa === "r3" || c.fatos.etapa === "r4");
var faltam = (c) => diasProva(c) ? `Faltam ${diasProva(c)} para ${c.nomeProva}` : `${cap(c.nomeProva)} est\xE1 chegando`;
var reta_final = [
  {
    id: "v1",
    assuntos: (c) => [diasProva(c) && nm(c, `faltam ${diasProva(c)}`, `Faltam ${diasProva(c)} para ${c.nomeProva}`), nm(c, "reta final", "Reta final")],
    corpo: (c) => [
      `${faltam(c)}, e lembrei de voc\xEA. Sei como essa fase \xE9: a cabe\xE7a corre atr\xE1s de tudo o que falta, e o corpo pede descanso.`,
      c.dez ? `Ainda d\xE1 tempo de fazer muita coisa, e voc\xEA j\xE1 tem ${Q(c.r)} no caminho. Isso \xE9 base de verdade.` : "Ainda d\xE1 tempo de fazer muita coisa, e cada quest\xE3o agora conta.",
      `Se ajudar, nesta fase eu priorizaria duas coisas: revisar as quest\xF5es que te pegaram e treinar os temas que mais caem. Nada de conte\xFAdo novo em volume. A Revis\xE3o fica aqui: ${c.link("revisao")}`,
      c.obs(1),
      "Conte comigo nessa reta final."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "o que eu faria agora", "O que eu faria agora"), nm(c, "a prova est\xE1 chegando", "A prova est\xE1 chegando")],
    corpo: (c) => [
      `${faltam(c)}, e estou na torcida.`,
      momento(c),
      "Se ajudar, eu faria assim no seu lugar: quest\xF5es novas pela manh\xE3, quando a cabe\xE7a est\xE1 fresca; Revis\xE3o \xE0 noite, que pede menos energia; e um simulado por semana, cronometrado, para treinar o tempo e o nervoso.",
      c.obs(1, ["areaFraca", "melhorArea"]),
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "menos conte\xFAdo novo, mais revis\xE3o", "Menos conte\xFAdo novo, mais revis\xE3o")],
    corpo: (c) => [
      `${faltam(c)}. Na reta final, o instinto \xE9 correr atr\xE1s de tudo o que falta. Mas o que mais rende \xE9 proteger o que voc\xEA j\xE1 sabe.`,
      `${c.dez ? `Com ${Q(c.r)} feitas, voc\xEA` : "Voc\xEA"} j\xE1 tem material para isso. O Caderno de erros \xE9 um \xF3timo lugar para come\xE7ar: cada quest\xE3o que te pegou e vira acerto agora \xE9 um ponto garantido no dia: ${c.link("erros")}`,
      c.obs(1),
      "E um lembrete de amigo: dormir tamb\xE9m \xE9 estudar. A mem\xF3ria se consolida no sono.",
      c.fecho()
    ]
  },
  {
    id: "v4",
    requer: (c) => !!c.fatos.areaFraca,
    assuntos: (c) => [nm(c, "um tema para a reta final", "Um tema para a reta final")],
    corpo: (c) => [
      `${faltam(c)}, e olhei os seus temas com carinho.`,
      c.fato("areaFraca"),
      `Na reta final, dar aten\xE7\xE3o a um tema assim costuma render mais do que polir um que j\xE1 est\xE1 forte. Dez quest\xF5es por semana bastam, e o tema fica \xE0 sua escolha aqui: ${c.link("treinar")}`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "cuida de voc\xEA tamb\xE9m", "Cuida de voc\xEA tamb\xE9m"), nm(c, "dormir tamb\xE9m \xE9 estudar", "Dormir tamb\xE9m \xE9 estudar")],
    corpo: (c) => [
      `${faltam(c)}. Um lembrete que ningu\xE9m costuma dar nessa fase: dormir tamb\xE9m \xE9 estudar.`,
      `A mem\xF3ria se consolida no sono. Ent\xE3o, nestas \xFAltimas semanas, vale preferir menos horas bem dormidas a madrugadas de quest\xE3o.${c.fatos.horario === "madrugada" ? " Digo isso com carinho, porque vi que voc\xEA anda estudando de madrugada." : ""}`,
      c.obs(1),
      "Voc\xEA j\xE1 fez muito. Agora \xE9 chegar com a cabe\xE7a descansada, que \xE9 ela que acerta o detalhe no dia.",
      c.fecho()
    ]
  },
  {
    id: "v6",
    requer: (c) => !!c.fatos.melhorArea,
    assuntos: (c) => [nm(c, "proteja o seu ponto forte", "Proteja o seu ponto forte")],
    corpo: (c) => [
      `${faltam(c)}.`,
      c.fato("melhorArea"),
      `Na reta final, vale manter esse tema aquecido com a Revis\xE3o, que leva poucos minutos, e usar o tempo novo nos outros. Assim voc\xEA chega sem perder nada do que j\xE1 conquistou: ${c.link("revisao")}`,
      c.obs(1),
      c.fecho()
    ]
  }
];
var nomeMarco = (m) => ({ 50: "cinquenta", 100: "cem", 250: "duzentas e cinquenta", 500: "quinhentas", 1e3: "mil", 2e3: "duas mil", 3e3: "tr\xEAs mil", 4e3: "quatro mil" })[m] ?? N(m);
var horasDoMarco = (m) => {
  const h = Math.round(m * 2 / 60);
  return h <= 1 ? "mais de uma hora" : `umas ${N(h)} horas`;
};
var marco = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, `${N(c.marco)} quest\xF5es`, `Voc\xEA passou das ${N(c.marco)} quest\xF5es`), nm(c, `${nomeMarco(c.marco)} quest\xF5es`, `${cap(nomeMarco(c.marco))} quest\xF5es`)],
    corpo: (c) => [
      momento(c),
      `${cap(nomeMarco(c.marco))} quest\xF5es. Passei para te dar parab\xE9ns, e para fazer uma conta: isso \xE9 ${horasDoMarco(c.marco)} de estudo arrancadas de uma rotina que n\xE3o deixa sobrar nada. N\xE3o acontece por acaso.`,
      c.marco <= 100 ? "As primeiras cem s\xE3o as mais dif\xEDceis, porque \xE9 quando o h\xE1bito ainda est\xE1 nascendo. Daqui para a frente, o site come\xE7a a mostrar onde voc\xEA est\xE1 forte e onde vale insistir." : c.marco <= 500 ? "Isso j\xE1 n\xE3o \xE9 teste, \xE9 const\xE2ncia. A essa altura, o maior ganho costuma estar no tema que mais te desafia: com calma, ele cresce r\xE1pido." : "Poucas pessoas chegam aqui. Voc\xEA j\xE1 viu boa parte do que as bancas gostam de perguntar, e daqui em diante o que leva uma boa nota a uma \xF3tima \xE9 a revis\xE3o, n\xE3o o volume.",
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, `${N(c.marco)} quest\xF5es, e contando`, `${N(c.marco)} quest\xF5es respondidas`)],
    corpo: (c) => [
      momento(c),
      `Vi que voc\xEA acabou de passar das ${N(c.marco)} quest\xF5es no Orto Quest\xF5es, e fiquei muito feliz.`,
      c.pctBom !== null ? `E com ${c.pctBom}% de acerto. Cada uma dessas quest\xF5es \xE9 um tema a mais que voc\xEA viu antes da prova, em ${horasDoMarco(c.marco)} que voc\xEA encontrou onde quase ningu\xE9m encontra.` : `Cada uma delas \xE9 um tema a mais que voc\xEA viu antes da prova, em ${horasDoMarco(c.marco)} que voc\xEA encontrou onde quase ningu\xE9m encontra.`,
      `Para comemorar do jeito certo, que tal uma passada na Revis\xE3o? Leva dez minutos e protege tudo isso: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "um marco bonito", "Um marco bonito")],
    corpo: (c) => [
      momento(c),
      `${cap(N(c.marco))} quest\xF5es. N\xE3o acontece por acaso: \xE9 a soma de muitos dias em que voc\xEA escolheu estudar, mesmo com sono. Em tempo, d\xE1 ${horasDoMarco(c.marco)}; em dias, d\xE1 muitos em que seria mais f\xE1cil n\xE3o abrir o site.`,
      c.obs(2),
      "Parab\xE9ns, de verdade."
    ]
  },
  {
    id: "v4",
    requer: (c) => c.marco >= 500,
    assuntos: (c) => [nm(c, "isso \xE9 const\xE2ncia", "Isso \xE9 const\xE2ncia")],
    corpo: (c) => [
      momento(c),
      `Quando algu\xE9m passa das ${N(c.marco)} quest\xF5es, eu fa\xE7o quest\xE3o de escrever.`,
      J("Isso \xE9 const\xE2ncia, e eu admiro muito.", c.obs(1), c.pctBom !== null ? `${c.pctBom}% de acerto, ali\xE1s.` : null),
      "Uma sugest\xE3o para a pr\xF3xima etapa: reler os coment\xE1rios das quest\xF5es que te pegaram mais de uma vez. \xC9 onde est\xE3o os pontos que ainda escapam, e pede menos tempo do que qualquer quest\xE3o nova.",
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, `parab\xE9ns pelas ${N(c.marco)} quest\xF5es`, `Parab\xE9ns pelas ${N(c.marco)} quest\xF5es`)],
    corpo: (c) => [
      momento(c),
      `S\xF3 um recado r\xE1pido: parab\xE9ns pelas ${N(c.marco)} quest\xF5es. Fiquei muito feliz de ver.`,
      `Para quem tem o dia tomado, isso \xE9 ${horasDoMarco(c.marco)} de estudo que poderiam ter virado qualquer outra coisa, e viraram prova. Eu sei o que custa.`,
      c.obs(1),
      c.tempo()
    ]
  },
  {
    id: "v6",
    assuntos: (c) => [nm(c, `${N(c.marco)} e o que vem agora`, `${N(c.marco)} quest\xF5es e o que vem agora`)],
    corpo: (c) => [
      momento(c),
      `Voc\xEA passou das ${N(c.marco)} quest\xF5es, e eu quis registrar.`,
      c.marco < 500 ? "O h\xE1bito j\xE1 existe. Agora o que mais rende \xE9 a Revis\xE3o: as quest\xF5es que te pegaram voltam no momento certo para virar acerto, e isso pede menos tempo do que o volume que voc\xEA j\xE1 fez." : "A partir daqui, os pontos que faltam est\xE3o nos detalhes, e o Caderno de erros \xE9 o melhor mapa deles. Menos horas, mais precis\xE3o.",
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
      momento(c),
      c.dez ? `Voc\xEA j\xE1 fez ${Q(c.r)} no Orto Quest\xF5es, ent\xE3o ningu\xE9m melhor para me dizer o que est\xE1 bom e o que d\xE1 para melhorar.` : "Queria muito a sua opini\xE3o sobre o site, mesmo que voc\xEA tenha usado pouco.",
      "Tr\xEAs perguntas, responde s\xF3 as que quiser: o que faz voc\xEA voltar ao site? O que te faz perder tempo nele? O que voc\xEA gostaria que existisse e ainda n\xE3o existe?",
      "Pode ser uma linha. Eu leio todas e respondo.",
      c.obs(1)
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "uma pergunta s\xF3", "Uma pergunta s\xF3")],
    corpo: (c) => [
      momento(c),
      "Uma pergunta s\xF3: se voc\xEA pudesse mudar uma coisa no Orto Quest\xF5es, o que seria?",
      "Responde aqui mesmo? As melhores ideias do site vieram assim, de quem estuda de verdade e sente onde o tempo escapa.",
      c.obs(1),
      c.tempo()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "me ajuda a melhorar o site?", "Me ajuda a melhorar o site?")],
    corpo: (c) => [
      momento(c),
      J("Estou planejando as pr\xF3ximas melhorias do site e queria ouvir quem estuda de verdade por aqui.", c.obs(1)),
      "Tr\xEAs perguntas r\xE1pidas, responde s\xF3 as que quiser:\n- Os coment\xE1rios est\xE3o ajudando, ou est\xE3o longos demais?\n- Tem alguma \xE1rea em que voc\xEA sente falta de mais quest\xF5es?\n- O site cabe na sua rotina, ou tem alguma coisa que atrapalha?",
      "Obrigado desde j\xE1. Cada resposta vira melhoria."
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "sua opini\xE3o importa muito", "Sua opini\xE3o importa muito")],
    corpo: (c) => [
      momento(c),
      "Queria muito a sua opini\xE3o, inclusive sobre o que n\xE3o est\xE1 bom. Elogio \xE9 gostoso, mas \xE9 a cr\xEDtica que melhora o site.",
      "Os coment\xE1rios das quest\xF5es est\xE3o ajudando? O cronograma e a Revis\xE3o fazem sentido na sua rotina? Tem alguma coisa que voc\xEA abre e fecha sem usar?",
      c.obs(1),
      "\xC9 s\xF3 responder. Eu leio tudo e respondo."
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "o que est\xE1 faltando?", "O que est\xE1 faltando?")],
    corpo: (c) => [
      momento(c),
      J(c.dez ? `Vi as suas ${Q(c.r)} e fiquei com uma curiosidade.` : "Fiquei com uma curiosidade.", c.obs(1)),
      "O que est\xE1 faltando no Orto Quest\xF5es para ele ser o lugar onde voc\xEA mais gosta de estudar? Pode ser coisa grande ou pequena.",
      "Respondendo este e-mail, chega direto para mim, e eu respondo."
    ]
  }
];
var indicar = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "quem voc\xEA conhece que est\xE1 nessa?", "Quem voc\xEA conhece que est\xE1 nessa?"), nm(c, "um pedido", "Um pedido")],
    corpo: (c) => [
      momento(c),
      "Queria te agradecer por estudar no Orto Quest\xF5es. O site \xE9 um projeto independente e cresce no boca a boca, ent\xE3o tenho um pedido: quem voc\xEA conhece que est\xE1 estudando para a mesma prova e ainda n\xE3o conhece o site?",
      "Quando um colega cria a conta pelo seu link e responde 20 quest\xF5es, voc\xEAs dois ganham 7 dias do plano completo. Vale para at\xE9 12 amigos. E estudar junto deixa a rotina mais leve.",
      `Seu link pessoal fica aqui: ${c.link("indicar")}`,
      "Muito obrigado."
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "estudar junto rende mais", "Estudar junto rende mais")],
    corpo: (c) => [
      momento(c),
      "Estudar junto rende mais, principalmente para quem tem pouco tempo: um lembra o outro, um explica o que o outro errou, e o ranking fica mais animado.",
      `Se tiver colegas se preparando para a prova, que tal mandar o seu link? Quando algu\xE9m cria a conta por ele e responde 20 quest\xF5es, voc\xEAs dois ganham 7 dias do plano completo: ${c.link("indicar")}`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "voc\xEA conhece algu\xE9m?", "Voc\xEA conhece algu\xE9m?")],
    corpo: (c) => [
      momento(c),
      "Voc\xEA conhece algu\xE9m que est\xE1 estudando para o TEOT, para o TARO ou para o R4, e que reclama de n\xE3o ter tempo?",
      "Se conhecer, me ajuda muito mandar o Orto Quest\xF5es para essa pessoa, porque foi para ela que eu fiz o site. E ainda vale para voc\xEA: pelo seu link, cada colega que responde 20 quest\xF5es d\xE1 7 dias do plano completo para os dois.",
      `O link est\xE1 aqui: ${c.link("indicar")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    requer: temFatos,
    assuntos: (c) => [nm(c, "obrigado, e um pedido", "Obrigado, e um pedido")],
    corpo: (c) => [
      J("Obrigado por estar por aqui.", momento(c)),
      c.obs(2),
      `Um pedido: se o site te ajuda, conta para um colega? Pelo seu link, voc\xEAs dois ganham 7 dias do plano completo quando a pessoa responde 20 quest\xF5es: ${c.link("indicar")}`,
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "manda para um colega?", "Manda para um colega?")],
    corpo: (c) => [
      momento(c),
      "Um pedido r\xE1pido: se o Orto Quest\xF5es tem te ajudado a estudar no tempo que sobra, que tal mandar para um colega que esteja na mesma?",
      `Pelo seu link pessoal, quando a pessoa cria a conta e responde 20 quest\xF5es, voc\xEAs dois ganham 7 dias do plano completo. Vale para at\xE9 12 amigos: ${c.link("indicar")}`,
      c.tempo(),
      "Obrigado pela for\xE7a."
    ]
  }
];
var cronograma = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "conhece o cronograma?", "Conhece o cronograma?"), nm(c, "um plano at\xE9 a prova", "Um plano at\xE9 a prova")],
    corpo: (c) => [
      momento(c),
      "Queria te apresentar uma coisa de que o pessoal tem gostado bastante: o cronograma.",
      cronogramaDevolve(c),
      `A pr\xE9via do seu cronograma \xE9 aberta, vale dar uma olhada: ${c.link("cronograma")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "o que estudar hoje", "O que estudar hoje")],
    corpo: (c) => [
      momento(c),
      'Sabe aquela d\xFAvida de todo dia, "o que eu estudo hoje"? Ela custa uns quinze minutos por dia, e em um m\xEAs isso \xE9 uma tarde inteira. O cronograma responde por voc\xEA.',
      J(c.fato("prova"), `Voc\xEA coloca a data ${c.daProva}, e ele monta a lista de cada dia, com o que mais cai primeiro, e dia de plant\xE3o sem quebrar o plano.`),
      `D\xE1 para ver a pr\xE9via do seu: ${c.link("cronograma")}`,
      c.fecho()
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "uma ideia para organizar o estudo", "Uma ideia para organizar o estudo")],
    corpo: (c) => [
      momento(c),
      c.dez ? `Voc\xEA j\xE1 tem ${Q(c.r)} por aqui. Se quiser organizar as pr\xF3ximas sem gastar tempo planejando, o cronograma pode ajudar.` : "Se quiser organizar o estudo at\xE9 a prova sem gastar tempo planejando, o cronograma pode ajudar.",
      `Ele divide o que falta pelos dias at\xE9 a prova e diz o que estudar hoje. Voc\xEA senta, a lista est\xE1 pronta. A pr\xE9via \xE9 aberta: ${c.link("cronograma")}`,
      c.obs(1),
      c.fecho()
    ]
  },
  {
    id: "v4",
    requer: teotOuProva,
    assuntos: (c) => [diasProva(c) && nm(c, `faltam ${diasProva(c)}`, `Faltam ${diasProva(c)} para ${c.nomeProva}`), nm(c, "um plano para o tempo que falta", "Um plano para o tempo que falta")],
    corpo: (c) => [
      `${faltam(c)}. D\xE1 tempo de muita coisa, ainda mais com um plano que j\xE1 esteja pronto quando voc\xEA senta.`,
      momento(c),
      `O cronograma do site faz esse plano com voc\xEA: passa primeiro pelo que mais cai, se ajusta quando a semana aperta e termina com uma reta final de revis\xE3o. Veja a pr\xE9via do seu: ${c.link("cronograma")}`,
      c.fecho()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "e se o plant\xE3o bagun\xE7ar a semana?", "E se o plant\xE3o bagun\xE7ar a semana?")],
    corpo: (c) => [
      momento(c),
      "Se voc\xEA d\xE1 plant\xE3o, talvez j\xE1 tenha pensado nisso: e se o plant\xE3o bagun\xE7ar a semana de estudo?",
      'Foi para isso que o cronograma ganhou o dia de plant\xE3o. Voc\xEA marca, e ele redistribui o que ficou para tr\xE1s, sem quebrar o plano at\xE9 a prova. Aquele peso de "atrasei" simplesmente deixa de existir.',
      `A pr\xE9via do seu \xE9 aberta: ${c.link("cronograma")}`,
      c.fecho()
    ]
  }
];
var dataCurta = (iso) => iso && Number.isFinite(new Date(iso).getTime()) ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) : null;
var dataLonga = (iso) => iso && Number.isFinite(new Date(iso).getTime()) ? new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }) : null;
var mesesDoPlano = (plano) => ({ mensal: "1 m\xEAs", semestral: "6 meses", anual: "12 meses" })[plano ?? ""] ?? null;
var nomePlano = (plano) => ({ mensal: "mensal", semestral: "semestral", anual: "anual" })[plano ?? ""] ?? null;
var nadaSePerde = (c) => c.dez ? `${cap(asSuas(c))}${c.pctBom !== null ? `, os ${c.pctBom}% de acerto` : ""} e o Caderno de erros ficam guardados de qualquer jeito. Nada se perde, renovando ou n\xE3o.` : "Tudo o que voc\xEA fez fica guardado de qualquer jeito. Nada se perde, renovando ou n\xE3o.";
var pix_3_dias = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, `seu acesso vai at\xE9 ${dataCurta(c.pix?.fimEm) ?? "os pr\xF3ximos dias"}`, `Seu acesso vai at\xE9 ${dataCurta(c.pix?.fimEm) ?? "os pr\xF3ximos dias"}`), nm(c, "um lembrete sobre o seu Pix", "Um lembrete sobre o seu Pix")],
    corpo: (c) => {
      const d = Math.max(1, c.pix?.diasRestantes ?? 3), fim = dataCurta(c.pix?.fimEm), meses = mesesDoPlano(c.pix?.plano), plano = nomePlano(c.pix?.plano);
      return [
        momento(c),
        `Passando com um lembrete amigo: o seu plano${plano ? ` ${plano}` : ""}, pago no Pix, vai at\xE9 ${fim ?? `daqui a ${D(d)}`}. Como o Pix n\xE3o renova sozinho, quis te avisar com calma, sem pressa nenhuma.`,
        `Se quiser continuar, d\xE1 para renovar quando preferir, sem perder nenhum dia: os ${D(d)} que faltam continuam valendo e o per\xEDodo novo come\xE7a quando o atual termina${meses ? `. Renovando o mesmo plano, voc\xEA fica com esses ${D(d)} mais ${meses}` : ""}.`,
        nadaSePerde(c),
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
        `Faltam ${D(d)} para terminar o acesso que voc\xEA pagou no Pix${fim ? ` (vai at\xE9 ${fim})` : ""}. Aviso com anteced\xEAncia porque sei que ningu\xE9m tem tempo de ficar lembrando de data.`,
        c.fatos.semana ? `Vi que voc\xEA fez ${Q(c.fatos.semana)} s\xF3 na \xFAltima semana, que ritmo bonito. Quis avisar para nada interromper esse embalo.` : "Quis avisar para nada interromper o seu estudo, se voc\xEA quiser seguir.",
        `Se renovar antes, os dias que faltam n\xE3o se perdem: o per\xEDodo novo come\xE7a quando o atual termina. Fica tudo na p\xE1gina de planos: ${c.link("assinatura")}`,
        "Se preferir n\xE3o ter que lembrar, no cart\xE3o a assinatura renova sozinha, e d\xE1 para cancelar quando quiser em Minha conta.",
        "E obrigado pelo tempo que voc\xEA j\xE1 passou por aqui."
      ];
    }
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "sobre o seu acesso no Pix", "Sobre o seu acesso no Pix")],
    corpo: (c) => {
      const fim = dataCurta(c.pix?.fimEm);
      return [
        momento(c),
        `Um lembrete r\xE1pido, com carinho: o seu acesso pago no Pix vai at\xE9 ${fim ?? "os pr\xF3ximos dias"}.`,
        nadaSePerde(c),
        `Se quiser seguir estudando com tudo liberado, d\xE1 para renovar antes, sem perder os dias que ainda faltam. \xC9 pela p\xE1gina de planos: ${c.link("assinatura")}`,
        "Se tiver qualquer d\xFAvida sobre o pagamento, me responde aqui."
      ];
    }
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "obrigado pelo tempo por aqui", "Obrigado pelo tempo por aqui")],
    corpo: (c) => {
      const d = Math.max(1, c.pix?.diasRestantes ?? 3), fim = dataCurta(c.pix?.fimEm);
      return [
        "Antes do lembrete, um obrigado: pelo tempo que voc\xEA j\xE1 passou estudando por aqui, e pela confian\xE7a.",
        `O lembrete: o seu acesso pago no Pix termina em ${D(d)}${fim ? `, dia ${fim}` : ""}. Como o Pix n\xE3o renova sozinho, aviso para a escolha ser sua, com calma.`,
        nadaSePerde(c),
        `Se fizer sentido continuar, a renova\xE7\xE3o fica aqui, e o per\xEDodo novo emenda no atual: ${c.link("assinatura")}`,
        portaAberta
      ];
    }
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "tr\xEAs dias e uma escolha sua", "Tr\xEAs dias e uma escolha sua")],
    corpo: (c) => {
      const fim = dataCurta(c.pix?.fimEm);
      return [
        momento(c),
        `O seu acesso pago no Pix vai at\xE9 ${fim ?? "daqui a poucos dias"}. Escrevo porque prefiro que a escolha de continuar seja sua, feita com tempo, e n\xE3o uma surpresa no dia.`,
        c.obs(1),
        nadaSePerde(c),
        `Se quiser seguir, a renova\xE7\xE3o emenda no atual, sem intervalo: ${c.link("assinatura")}`
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
        momento(c),
        `Hoje \xE9 o \xFAltimo dia do seu plano${plano ? ` ${plano}` : ""} pago no Pix, e quis te avisar com carinho.`,
        `Se renovar hoje, voc\xEA segue sem nenhum dia de intervalo: o per\xEDodo novo come\xE7a quando o atual termina${meses ? ` e vale ${meses === "1 m\xEAs" ? "1 m\xEAs completo" : `${meses} completos`}` : ""}. Se renovar depois, ele come\xE7a no dia do pagamento. Nos dois casos, nada se perde.`,
        nadaSePerde(c),
        `A renova\xE7\xE3o fica aqui: ${c.link("assinatura")}`
      ];
    }
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "\xFAltimo dia do seu plano", "\xDAltimo dia do seu plano")],
    corpo: (c) => [
      "S\xF3 para n\xE3o ter surpresa amanh\xE3: o seu acesso pago no Pix vai at\xE9 hoje.",
      momento(c),
      `Se quiser continuar, renovar hoje mant\xE9m tudo sem interrup\xE7\xE3o, inclusive a fila da Revis\xE3o. \xC9 pela p\xE1gina de planos: ${c.link("assinatura")}`,
      "E se preferir n\xE3o renovar agora, obrigado de cora\xE7\xE3o pelo tempo de assinatura. Seu progresso fica guardado, esperando por voc\xEA, do jeito que voc\xEA deixou.",
      portaAberta
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "hoje \xE9 o \xFAltimo dia do seu Pix", "Hoje \xE9 o \xFAltimo dia do seu Pix")],
    corpo: (c) => [
      "Hoje \xE9 o \xFAltimo dia do acesso do seu plano pago no Pix.",
      c.dez ? `Voc\xEA construiu bastante coisa aqui: ${Q(c.r)}${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ""}. Fico feliz de ver tudo isso, e nada disso se perde.` : "Tudo o que voc\xEA fez por aqui fica guardado, renovando ou n\xE3o.",
      `Se quiser seguir, renovando hoje o per\xEDodo novo emenda no atual: ${c.link("assinatura")}`,
      c.tempo(),
      "Qualquer d\xFAvida, me responde."
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "obrigado, e um aviso", "Obrigado, e um aviso")],
    corpo: (c) => [
      "Primeiro, obrigado pelo tempo que voc\xEA passou estudando por aqui com tudo liberado.",
      "O aviso: o seu acesso pago no Pix termina hoje. Como o Pix n\xE3o renova sozinho, a escolha \xE9 sua, e qualquer uma delas est\xE1 certa.",
      nadaSePerde(c),
      `Se quiser continuar, a renova\xE7\xE3o fica aqui e emenda no per\xEDodo atual: ${c.link("assinatura")}`,
      portaAberta
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "o que acontece amanh\xE3", "O que acontece amanh\xE3")],
    corpo: (c) => [
      momento(c),
      "Seu acesso pago no Pix vai at\xE9 hoje, e quis te contar com clareza o que acontece amanh\xE3, para n\xE3o ter susto.",
      c.dez ? `As quest\xF5es abertas continuam, ${asSuas(c)} e o Caderno de erros ficam guardados, e a Revis\xE3o continua separando o que precisa voltar. O que fica fechado \xE9 a parte do plano: cronograma, Simulado Nacional, temas que mais caem e Biblioteca.` : "As quest\xF5es abertas continuam e tudo o que voc\xEA fez fica guardado. O que fica fechado \xE9 a parte do plano: cronograma, Simulado Nacional, temas que mais caem e Biblioteca.",
      `Se quiser seguir com tudo liberado, a renova\xE7\xE3o fica aqui: ${c.link("assinatura")}`,
      "Se n\xE3o for a hora, tudo bem tamb\xE9m. Obrigado pelo tempo por aqui."
    ]
  }
];
var AREA_NOME = (slug, c) => c.area(slug)?.em ?? slug;
var PONTOS = (n) => n === 1 ? "1 ponto" : `${N(n)} pontos`;
var QRel = (n) => n >= 10 ? Q(n) : "algumas quest\xF5es";
var acertoDoPeriodo = (c) => {
  const r = c.relatorio;
  const a = r.certas + r.erradas > 0 ? Math.round(100 * r.certas / (r.certas + r.erradas)) : null;
  const citavel = a !== null && r.respostas >= 30 && a >= 50 ? a : null;
  return { acerto: a, citavel, subiu: a !== null && r.respostas >= 10 && r.acertoAnterior !== null && a > r.acertoAnterior ? a - r.acertoAnterior : null };
};
var diasAtivos = (r) => r.diasAtivos === 1 ? "um dia" : `${["", "um", "dois", "tr\xEAs", "quatro", "cinco", "seis", "sete", "oito", "nove"][r.diasAtivos] ?? N(r.diasAtivos)} dias`;
var relatorio = [
  {
    id: "v1",
    assuntos: (c) => {
      const r = c.relatorio;
      return [nm(c, `seu resumo ${r.rotulo}`, `Seu resumo ${r.rotulo}`), r.respostas >= 10 && nm(c, `${Q(r.respostas)} ${r.em}`, `${cap(Q(r.respostas))} ${r.em}`)];
    },
    corpo: (c) => {
      const r = c.relatorio;
      if (r.respostas <= 0) return [
        `${r.frase}, a rotina deve ter apertado, e est\xE1 tudo bem: acontece com todo mundo que estuda no meio da resid\xEAncia, e nada do que voc\xEA j\xE1 fez se perdeu.`,
        r.totalAcumulado >= 10 ? `Suas ${Q(r.totalAcumulado)} continuam guardadas, e a Revis\xE3o j\xE1 separou as que pedem uma segunda olhada.` : "O que voc\xEA j\xE1 fez continua guardado, e a Revis\xE3o j\xE1 separou o que pede uma segunda olhada.",
        "Para voltar sem peso: n\xE3o tente recuperar o tempo. Dez quest\xF5es e a Revis\xE3o do dia j\xE1 colocam tudo nos trilhos, em dez minutos.",
        `A Revis\xE3o fica aqui: ${c.link("revisao")}`,
        c.fecho()
      ];
      const { citavel, subiu } = acertoDoPeriodo(c);
      const destaque = r.subiram[0];
      return [
        `Passando com o seu resumo ${r.rotulo}, e ele veio bonito.`,
        `${r.frase}, foram ${QRel(r.respostas)} em ${diasAtivos(r)} de estudo${citavel !== null ? `, com ${citavel}% de acerto` : ""}${subiu !== null ? `, ${PONTOS(subiu)} acima do per\xEDodo anterior` : ""}.${destaque ? ` O destaque foi ${AREA_NOME(destaque.slug, c)}, que subiu ${PONTOS(destaque.agora - destaque.antes)}. D\xE1 para ver que voc\xEA est\xE1 lendo os coment\xE1rios, porque esse tipo de salto n\xE3o vem por acaso.` : " D\xE1 para ver que voc\xEA est\xE1 lendo os coment\xE1rios, e \xE9 isso que faz o estudo render."}`,
        c.fatos.horario ? c.fato("horario") : "Trinta minutos num hor\xE1rio fixo valem mais que duas horas espalhadas. Se achar o seu hor\xE1rio, protege ele.",
        r.simulado && r.simulado.total > 0 && r.simulado.acertos / r.simulado.total >= 0.5 ? `No ${r.simulado.titulo}, voc\xEA fez ${r.simulado.acertos} de ${r.simulado.total}. Parab\xE9ns.` : r.simulado ? `Obrigado por encarar o ${r.simulado.titulo}: s\xF3 de fazer, j\xE1 \xE9 um \xF3timo treino de tempo e de nervoso.` : null,
        r.maisFraco && r.maisFraco.acerto < 70 ? `Uma ideia para o pr\xF3ximo per\xEDodo: dez quest\xF5es de ${AREA_NOME(r.maisFraco.slug, c)} por semana. \xC9 onde cada sess\xE3o vai render mais agora. ${c.link("treinar")}` : `Uma ideia para o pr\xF3ximo per\xEDodo: manter a Revis\xE3o em dia e abrir um tema que voc\xEA ainda quer explorar. ${c.link("revisao")}`
      ];
    },
    ps: (c) => {
      const r = c.relatorio;
      return r.totalAcumulado >= 100 ? `P.S.: no total j\xE1 s\xE3o ${Q(r.totalAcumulado)} diferentes. Quando eu vejo um n\xFAmero desses, penso na prova e fico tranquilo por voc\xEA.` : c.ps();
    }
  },
  {
    id: "v2",
    requer: (c) => (c.relatorio?.respostas ?? 0) > 0,
    assuntos: (c) => [nm(c, `como foi o seu estudo ${c.relatorio.em}`, `Como foi o seu estudo ${c.relatorio.em}`), nm(c, `seu resumo ${c.relatorio.rotulo}`, `Seu resumo ${c.relatorio.rotulo}`)],
    corpo: (c) => {
      const r = c.relatorio;
      const { citavel, subiu } = acertoDoPeriodo(c);
      return [
        `Passando com o seu resumo: ${QRel(r.respostas)} ${r.em}, em ${diasAtivos(r)}.${citavel !== null ? ` Acerto de ${citavel}%${subiu !== null ? `, ${PONTOS(subiu)} a mais que no per\xEDodo anterior` : ""}.` : subiu !== null ? ` E o seu acerto subiu ${PONTOS(subiu)} em rela\xE7\xE3o ao per\xEDodo anterior.` : ""}`,
        r.respostasAnterior >= 10 && r.respostas > r.respostasAnterior ? `Foi mais do que no per\xEDodo anterior (${Q(r.respostasAnterior)}). Que bom sinal, porque const\xE2ncia \xE9 o que mais conta.` : "O que mais conta \xE9 seguir aparecendo, e voc\xEA est\xE1 seguindo, mesmo com a rotina que imagino.",
        r.subiram.length ? `Destaque para ${AREA_NOME(r.subiram[0].slug, c)}, que cresceu ${PONTOS(r.subiram[0].agora - r.subiram[0].antes)}. Isso \xE9 coment\xE1rio lido com aten\xE7\xE3o.` : null,
        c.obs(1, ["horario", "sequencia", "ranking"]),
        r.maisFraco && r.maisFraco.acerto < 70 ? `Uma ideia para o pr\xF3ximo passo: dez quest\xF5es de ${AREA_NOME(r.maisFraco.slug, c)} por semana, que \xE9 onde cada sess\xE3o vai render mais. ${c.link("treinar")}` : `Uma ideia para o pr\xF3ximo passo: manter a Revis\xE3o em dia, dez minutos por dia. ${c.link("revisao")}`
      ];
    },
    ps: (c) => {
      const r = c.relatorio;
      return r.totalAcumulado >= 100 ? `P.S.: no total, j\xE1 s\xE3o ${Q(r.totalAcumulado)} diferentes. Isso \xE9 base de verdade.` : c.ps();
    }
  },
  {
    id: "v3",
    requer: (c) => (c.relatorio?.respostas ?? 0) >= 10,
    assuntos: (c) => [nm(c, "a hist\xF3ria do seu estudo", `A hist\xF3ria do seu estudo ${c.relatorio.em}`), nm(c, `seu resumo ${c.relatorio.rotulo}`, `Seu resumo ${c.relatorio.rotulo}`)],
    corpo: (c) => {
      const r = c.relatorio;
      const { citavel, subiu } = acertoDoPeriodo(c);
      return [
        `Queria te contar a hist\xF3ria do seu estudo ${r.em}, porque ela \xE9 melhor do que parece de dentro da rotina.`,
        `Come\xE7a com ${diasAtivos(r)} em que voc\xEA abriu o site, mesmo com sono. Nesses dias, ${Q(r.respostas)}${citavel !== null ? `, com ${citavel}% de acerto` : ""}.${subiu !== null ? ` E o acerto subiu ${PONTOS(subiu)} em rela\xE7\xE3o ao per\xEDodo anterior, o que quer dizer que as quest\xF5es que te pegaram viraram acerto.` : ""}`,
        r.subiram.length ? `O cap\xEDtulo bonito \xE9 ${AREA_NOME(r.subiram[0].slug, c)}: subiu ${PONTOS(r.subiram[0].agora - r.subiram[0].antes)}. Esse tipo de salto n\xE3o vem por acaso; vem de coment\xE1rio lido at\xE9 o fim.` : "O cap\xEDtulo bonito \xE9 a const\xE2ncia: aparecer \xE9 a parte mais dif\xEDcil, e voc\xEA apareceu.",
        r.cairam.length ? `O pr\xF3ximo cap\xEDtulo, se eu pudesse sugerir, seria uma revisita com carinho a ${AREA_NOME(r.cairam[0].slug, c)}. Dez quest\xF5es por semana bastam.` : c.tempo(),
        `Quando quiser continuar a hist\xF3ria, a Revis\xE3o j\xE1 est\xE1 pronta: ${c.link("revisao")}`
      ];
    }
  },
  {
    id: "v4",
    requer: (c) => (c.relatorio?.respostas ?? 0) > 0,
    assuntos: (c) => [nm(c, "o que eu vi no seu per\xEDodo", `O que eu vi ${c.relatorio.em}`), nm(c, `seu resumo ${c.relatorio.rotulo}`, `Seu resumo ${c.relatorio.rotulo}`)],
    corpo: (c) => {
      const r = c.relatorio;
      const { citavel, subiu } = acertoDoPeriodo(c);
      return [
        momento(c),
        `${r.frase}, voc\xEA estudou em ${diasAtivos(r)}, com ${QRel(r.respostas)}${citavel !== null ? ` e ${citavel}% de acerto` : ""}. Para quem tem o dia tomado, isso \xE9 muito.`,
        subiu !== null ? `O que mais me chamou a aten\xE7\xE3o: o acerto subiu ${PONTOS(subiu)} em rela\xE7\xE3o ao per\xEDodo anterior. Isso \xE9 a Revis\xE3o trabalhando, e voc\xEA deixando ela trabalhar.` : r.subiram.length ? `O que mais me chamou a aten\xE7\xE3o foi ${AREA_NOME(r.subiram[0].slug, c)}, que subiu ${PONTOS(r.subiram[0].agora - r.subiram[0].antes)}.` : "O que mais me chamou a aten\xE7\xE3o foi a const\xE2ncia, que \xE9 a parte que ningu\xE9m v\xEA e a que mais conta.",
        r.maisFraco && r.maisFraco.acerto < 70 ? `Para o pr\xF3ximo per\xEDodo, se fizer sentido: dez quest\xF5es de ${AREA_NOME(r.maisFraco.slug, c)} por semana. \xC9 onde cada sess\xE3o rende mais agora. ${c.link("treinar")}` : `Para o pr\xF3ximo per\xEDodo: proteger o hor\xE1rio que funciona e manter a Revis\xE3o em dia. ${c.link("revisao")}`,
        c.fecho()
      ];
    }
  },
  {
    id: "v5",
    requer: (c) => (c.relatorio?.respostas ?? 0) > 0 && (c.relatorio?.respostas ?? 0) < 30,
    assuntos: (c) => [nm(c, `seu resumo ${c.relatorio.rotulo}`, `Seu resumo ${c.relatorio.rotulo}`), nm(c, "pouco, mas de verdade", "Pouco, mas de verdade")],
    corpo: (c) => {
      const r = c.relatorio;
      return [
        `Passando com o seu resumo ${r.rotulo}. Foi um per\xEDodo de pouco estudo, e eu queria dizer uma coisa sobre isso.`,
        `${r.frase}, voc\xEA abriu o site em ${diasAtivos(r)} e fez ${QRel(r.respostas)}. Pouco, mas de verdade: cada quest\xE3o dessas tem a explica\xE7\xE3o de todas as alternativas, ent\xE3o rendeu mais do que parece.`,
        "Para o pr\xF3ximo per\xEDodo, n\xE3o precisa recuperar nada. Dez quest\xF5es por semana, no intervalo que der, j\xE1 mant\xEAm o h\xE1bito vivo. O site guarda o resto.",
        `A Revis\xE3o fica aqui, com o que pede uma segunda olhada: ${c.link("revisao")}`,
        c.fecho()
      ];
    }
  }
];
var boas_vindas_dia0 = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "que bom ter voc\xEA no Orto Quest\xF5es", "Que bom ter voc\xEA no Orto Quest\xF5es"), nm(c, "os primeiros dez minutos", "Os primeiros dez minutos")],
    corpo: (c) => [
      "Que bom ter voc\xEA no Orto Quest\xF5es. Eu sou o Tales, ortopedista, e fiz o site que eu queria ter tido quando estudava para o TEOT: as quest\xF5es das provas de verdade, cada uma com a explica\xE7\xE3o de todas as alternativas, n\xE3o s\xF3 da certa.",
      J(c.fato("prova"), c.fato("etapa")),
      "Se eu pudesse te dar um \xFAnico conselho para os primeiros dez minutos: fa\xE7a cinco quest\xF5es de um tema que voc\xEA gosta e leia o coment\xE1rio inteiro, inclusive das alternativas erradas. \xC9 ali que mora a pegadinha da banca, e \xE9 ali que o estudo come\xE7a a render.",
      "O resto vem com calma. A Revis\xE3o aprende com o que voc\xEA erra e traz de volta na hora certa; o Desempenho mostra onde voc\xEA est\xE1 crescendo. Voc\xEA s\xF3 precisa sentar e fazer.",
      `Para come\xE7ar: ${c.link("treinar")}`
    ],
    ps: () => "P.S.: este e-mail n\xE3o \xE9 autom\xE1tico de verdade. Se responder, sou eu que leio."
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "oi, sou o Tales", "Oi, sou o Tales"), nm(c, "um oi de quem fez o site", "Um oi de quem fez o site")],
    corpo: (c) => [
      "Oi, sou o Tales. Sou ortopedista, passei pelo TEOT com a rotina que voc\xEA conhece, e fiz este site para que estudar coubesse nos intervalos que a resid\xEAncia deixa.",
      J(c.fato("etapa"), c.fato("prova")),
      "O combinado \xE9 simples: voc\xEA senta e estuda, o site decide o resto. Cada quest\xE3o vem da prova real e explica todas as alternativas. A Revis\xE3o guarda o que te pegou e traz de volta na hora certa.",
      "Para hoje, sugiro s\xF3 uma coisa: um tema de que voc\xEA goste, cinco quest\xF5es, coment\xE1rio lido at\xE9 o fim. Dez minutos.",
      `Fica aqui: ${c.link("treinar")}`
    ],
    ps: () => "P.S.: se travar em qualquer coisa, me responde. Eu leio tudo."
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "sua conta est\xE1 pronta", "Sua conta est\xE1 pronta"), nm(c, "por onde come\xE7ar hoje", "Por onde come\xE7ar hoje")],
    corpo: (c) => [
      "Sua conta est\xE1 pronta, e eu quis te escrever antes de qualquer coisa autom\xE1tica. Sou o Tales, ortopedista, e cuido do site pessoalmente.",
      J(momento(c)),
      "Uma coisa que eu gostaria que voc\xEA soubesse: aqui, errar \xE9 barato. Cada quest\xE3o que te pega vira uma explica\xE7\xE3o completa e volta na Revis\xE3o no momento certo. \xC9 na prova que errar custa; aqui, \xE9 treino.",
      "Para come\xE7ar, n\xE3o planeje nada. Abra um tema que voc\xEA gosta e fa\xE7a cinco. Depois me conta como foi, se quiser.",
      `O caminho mais curto: ${c.link("treinar")}`
    ],
    ps: () => "P.S.: este e-mail n\xE3o \xE9 autom\xE1tico de verdade. Se responder, sou eu que leio."
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "tr\xEAs coisas sobre o site", "Tr\xEAs coisas sobre o site")],
    corpo: (c) => [
      "Que bom ter voc\xEA por aqui. Sou o Tales, e queria te contar tr\xEAs coisas sobre o site antes de voc\xEA come\xE7ar.",
      "A primeira: as quest\xF5es s\xE3o das provas de verdade, com a explica\xE7\xE3o de todas as alternativas. A segunda: a Revis\xE3o aprende com o que te pega e traz de volta na hora certa, sem voc\xEA anotar nada. A terceira: dez minutos no intervalo j\xE1 contam, porque o site foi feito para caber na rotina real.",
      J(c.fato("prova"), c.fato("etapa")),
      `Para os primeiros dez minutos, cinco quest\xF5es de um tema de que voc\xEA goste: ${c.link("treinar")}`,
      "E se qualquer coisa ficar confusa, me responde. Eu leio tudo."
    ],
    ps: () => "P.S.: a parte do site em que eu mais caprichei foi o coment\xE1rio das alternativas erradas. Vale ler at\xE9 o fim."
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "o site que eu queria ter tido", "O site que eu queria ter tido")],
    corpo: (c) => [
      "Eu sou o Tales, ortopedista. Fiz o Orto Quest\xF5es porque, quando estudava para o TEOT, perdia mais tempo decidindo o que estudar do que estudando. Queria um lugar em que eu abrisse e j\xE1 soubesse o que fazer.",
      J(momento(c)),
      "\xC9 isso que o site tenta ser para voc\xEA: quest\xF5es das provas reais, cada alternativa explicada, a Revis\xE3o trazendo de volta o que te pegou. Voc\xEA senta e faz; o resto est\xE1 decidido.",
      "Para hoje, uma sugest\xE3o s\xF3: cinco quest\xF5es de um tema que voc\xEA gosta, com o coment\xE1rio lido at\xE9 o fim. Dez minutos bastam para sentir se o jeito do site combina com voc\xEA.",
      `Fica aqui: ${c.link("treinar")}`
    ],
    ps: () => "P.S.: se responder este e-mail, sou eu que leio. Pode escrever."
  }
];
var primeiras_10 = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "dez quest\xF5es, e o h\xE1bito come\xE7ou", "Dez quest\xF5es, e o h\xE1bito come\xE7ou"), nm(c, "as suas primeiras dez", "As suas primeiras dez")],
    corpo: (c) => [
      momento(c),
      "Vi que voc\xEA passou das dez primeiras quest\xF5es, e quis registrar: \xE9 aqui que o h\xE1bito come\xE7a. As dez primeiras s\xE3o as mais dif\xEDceis, porque \xE9 quando a gente ainda est\xE1 decidindo se vai continuar.",
      "Uma coisa para as pr\xF3ximas: ler o coment\xE1rio mesmo quando acerta. \xC9 onde a banca esconde o que ainda vai cobrar, e leva um minuto a mais.",
      c.tempo(),
      `A Revis\xE3o j\xE1 come\xE7ou a separar o que pede uma segunda olhada: ${c.link("revisao")}`
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "o come\xE7o est\xE1 feito", "O come\xE7o est\xE1 feito")],
    corpo: (c) => [
      momento(c),
      "Dez quest\xF5es respondidas. Parece pouco, e \xE9 exatamente por isso que eu escrevo: o come\xE7o est\xE1 feito, e come\xE7ar \xE9 a parte que mais gente deixa para depois.",
      "Daqui, o que mais ajuda \xE9 manter o ritmo pequeno: cinco por dia, no mesmo hor\xE1rio. Em um m\xEAs s\xE3o mais de cem, e o site j\xE1 consegue te mostrar os temas em que voc\xEA mais brilha.",
      J(c.fato("prova"), c.fato("etapa")),
      `Para seguir: ${c.link("treinar")}`
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "dez quest\xF5es, uma pergunta", "Dez quest\xF5es, uma pergunta")],
    corpo: (c) => [
      momento(c),
      "Vi as suas primeiras dez quest\xF5es, e queria te fazer uma pergunta: o jeito do site combinou com voc\xEA?",
      "Pergunto porque \xE9 agora que vale ajustar. Se os coment\xE1rios est\xE3o longos demais, se alguma coisa ficou confusa, se o tempo est\xE1 apertado, me conta respondendo este e-mail. Eu leio tudo.",
      "Se combinou, o conselho \xE9 s\xF3 um: siga pequeno e constante. A Revis\xE3o cuida de trazer de volta o que te pegou.",
      c.tempo()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "as dez primeiras s\xE3o as mais dif\xEDceis", "As dez primeiras s\xE3o as mais dif\xEDceis")],
    corpo: (c) => [
      momento(c),
      "As dez primeiras quest\xF5es s\xE3o as mais dif\xEDceis de toda a prepara\xE7\xE3o. N\xE3o pelo conte\xFAdo: pelo tempo que a gente precisa achar para elas. Voc\xEA achou.",
      "Agora o site come\xE7a a trabalhar por voc\xEA: a Revis\xE3o guarda o que te pegou e traz de volta na hora certa, e o Desempenho come\xE7a a desenhar onde voc\xEA est\xE1 forte.",
      J(c.fato("prova"), c.fato("etapa")),
      `Quando der, mais cinco: ${c.link("treinar")}`
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "dez feitas, e o resto \xE9 ritmo", "Dez feitas, e o resto \xE9 ritmo")],
    corpo: (c) => [
      momento(c),
      "Dez quest\xF5es feitas. Fiquei feliz de ver, porque \xE9 o sinal de que voc\xEA encontrou um jeito de encaixar o estudo no dia.",
      "O que eu faria agora no seu lugar: escolher um hor\xE1rio, mesmo que curto, e repetir. Trinta minutos num hor\xE1rio fixo valem mais que duas horas espalhadas, principalmente no come\xE7o.",
      "E ler o coment\xE1rio inteiro, inclusive das alternativas erradas. \xC9 a parte do site em que eu mais caprichei.",
      `A lista de hoje fica aqui: ${c.link("treinar")}`
    ]
  }
];
var voltou = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "que bom te ver de volta", "Que bom te ver de volta")],
    corpo: (c) => [
      `Que bom te ver de volta. Vi que voc\xEA entrou hoje depois de ${tempoFora(c.p.diasParado)} fora, e quis dizer que fiquei feliz.`,
      c.obs(1, ["melhorArea", "maisEstudada", "ranking"]) ?? `${guardado(c)}, do jeito que voc\xEA deixou. Nada se perdeu.`,
      "Para voltar sem peso: n\xE3o tente recuperar o tempo. Abra a Revis\xE3o, que j\xE1 separou as quest\xF5es que pedem uma segunda olhada, e fa\xE7a dez. \xC9 assim que o embalo volta.",
      `A Revis\xE3o fica aqui: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "voltou, e isso \xE9 o que importa", "Voltou, e isso \xE9 o que importa")],
    corpo: (c) => [
      `Vi que voc\xEA voltou hoje, depois de ${tempoFora(c.p.diasParado)}. Voltar \xE9 o que importa; o resto \xE9 detalhe.`,
      momento(c),
      `Tudo o que voc\xEA fez continua guardado${c.dez ? `: ${Q(c.r)}, o Caderno de erros, a fila da Revis\xE3o` : ""}. N\xE3o precisa refazer nada, nem explicar nada.`,
      "Uma ideia para esta semana: dez quest\xF5es por dia, no intervalo que der. Pequeno de prop\xF3sito, para o h\xE1bito voltar antes da pressa.",
      `Para come\xE7ar pelo que mais vale: ${c.link("revisao")}`
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "senti sua falta por aqui", "Senti sua falta por aqui")],
    corpo: (c) => [
      `Senti sua falta por aqui, e hoje vi que voc\xEA voltou. Faz ${tempoFora(c.p.diasParado)}, e imagino que a rotina tenha engolido o estudo. Acontece com todo mundo.`,
      c.obs(1, ["prova", "etapa", "cronograma", "melhorArea"]),
      "O que eu aprendi na resid\xEAncia \xE9 que o estudo que funciona \xE9 o que cabe na rotina real. Ent\xE3o, para voltar, nada de maratona: dez minutos, a Revis\xE3o, e pronto.",
      `Fica aqui: ${c.link("revisao")}`,
      c.fecho()
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "do jeito que voc\xEA deixou", "Do jeito que voc\xEA deixou")],
    corpo: (c) => [
      `Que bom te ver de volta depois de ${tempoFora(c.p.diasParado)}. O site est\xE1 do jeito que voc\xEA deixou, e eu tamb\xE9m.`,
      momento(c),
      `${cap(asSuas(c))} e as quest\xF5es para revisar continuam l\xE1. A Revis\xE3o at\xE9 aproveitou o tempo: separou o que mais vale uma segunda olhada.`,
      "Se quiser me contar o que aconteceu nessas semanas, \xE9 s\xF3 responder. Eu leio tudo, e \xE0s vezes a resposta vira melhoria no site.",
      c.tempo()
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "recome\xE7ar pequeno", "Recome\xE7ar pequeno")],
    corpo: (c) => [
      `Vi que voc\xEA voltou hoje, depois de ${tempoFora(c.p.diasParado)}, e quis te mandar uma ideia de amigo: recome\xE7ar pequeno.`,
      "Quem volta depois de um tempo fora costuma querer compensar, e a\xED a primeira sess\xE3o vira maratona e a segunda n\xE3o acontece. O contr\xE1rio funciona melhor: dez quest\xF5es, e amanh\xE3 mais dez.",
      c.obs(1),
      `A Revis\xE3o j\xE1 separou por onde come\xE7ar: ${c.link("revisao")}`,
      c.fecho()
    ]
  }
];
var cronograma_pronto = [
  {
    id: "v1",
    assuntos: (c) => [diasProva(c) && nm(c, `${diasProva(c)} e um plano pronto`, `${cap(diasProva(c))} e um plano pronto`), nm(c, "seu cronograma est\xE1 pronto", "Seu cronograma est\xE1 pronto")],
    corpo: (c) => [
      `Vi que voc\xEA montou o seu cronograma hoje${diasProva(c) ? `, com ${c.nomeProva} a ${diasProva(c)}` : ""}. Fiquei feliz, porque isso \xE9 a decis\xE3o que mais devolve tempo de todas.`,
      "A partir de agora, quando voc\xEA sentar, a lista do dia j\xE1 est\xE1 pronta: o que mais cai primeiro, o tempo de cada parte, a reta final de revis\xE3o no fim. Nada para decidir.",
      "Um conselho de quem usou plano parecido: n\xE3o tente adiantar. Se um dia sobrar tempo, fa\xE7a a Revis\xE3o. Se um plant\xE3o bagun\xE7ar a semana, marque o dia de plant\xE3o e deixe o cronograma redistribuir. Ele foi feito para isso.",
      c.obs(1, ["horario", "etapa", "prova"]),
      `O seu plano fica aqui: ${c.link("cronograma")}`
    ]
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "a lista do dia j\xE1 est\xE1 pronta", "A lista do dia j\xE1 est\xE1 pronta")],
    corpo: (c) => [
      momento(c),
      `Seu cronograma est\xE1 montado${diasProva(c) ? `: ${diasProva(c)} at\xE9 ${c.nomeProva}` : ""}. Quis te escrever porque conhe\xE7o a sensa\xE7\xE3o de olhar para esse plano e pensar "\xE9 muita coisa".`,
      'N\xE3o \xE9. \xC9 uma coisa por dia, e ela j\xE1 est\xE1 decidida. O que muda \xE9 que voc\xEA para de gastar os quinze minutos de "o que eu estudo hoje" e usa eles estudando.',
      "Se a semana apertar, ele se ajusta sozinho. Se voc\xEA adiantar, ele alivia. O plano \xE9 seu, n\xE3o o contr\xE1rio.",
      `A lista de hoje: ${c.link("cronograma")}`
    ]
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "o que fazer com o cronograma", "O que fazer com o cronograma pronto")],
    corpo: (c) => [
      `Cronograma pronto${diasProva(c) ? `, ${diasProva(c)} para ${c.nomeProva}` : ""}. Agora a parte boa: ele trabalha, voc\xEA estuda.`,
      "Tr\xEAs coisas que ajudam nas primeiras semanas: abrir a lista do dia antes de qualquer outra coisa, fazer a Revis\xE3o quando sobrar tempo em vez de adiantar, e marcar o dia de plant\xE3o sem peso na consci\xEAncia, porque ele redistribui sozinho.",
      c.obs(1, ["horario", "etapa"]),
      "E dormir. O cronograma conta com o seu descanso; foi calibrado assim.",
      `Fica aqui: ${c.link("cronograma")}`
    ]
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "agora \xE9 s\xF3 sentar e fazer", "Agora \xE9 s\xF3 sentar e fazer")],
    corpo: (c) => [
      momento(c),
      `Vi o seu cronograma montado${diasProva(c) ? ` para ${c.nomeProva}, a ${diasProva(c)}` : ""}, e quis dizer uma coisa: a parte dif\xEDcil j\xE1 foi. Decidir estudar com plano \xE9 o que separa quem passa com a rotina cheia de quem deixa para depois.`,
      "Daqui, \xE9 s\xF3 sentar e fazer. A lista de cada dia, o que mais cai primeiro, a reta final de revis\xE3o: tudo j\xE1 est\xE1 decidido. Se um dia faltar, o plano se ajusta, sem drama.",
      c.tempo(),
      `A lista de hoje fica aqui: ${c.link("cronograma")}`
    ]
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "seu plano at\xE9 a prova", "Seu plano at\xE9 a prova")],
    corpo: (c) => [
      `Seu plano at\xE9 ${c.nomeProva} est\xE1 pronto${diasProva(c) ? `: ${diasProva(c)}, divididos em dias que cabem na sua rotina` : ""}. Fiquei feliz de ver.`,
      "Uma coisa que eu gostaria que voc\xEA soubesse: o cronograma foi feito para a rotina real, n\xE3o para a ideal. Dia de plant\xE3o, semana ruim, atraso: ele redistribui. O que ele pede de voc\xEA \xE9 s\xF3 aparecer.",
      c.obs(1, ["horario", "etapa", "prova"]),
      "E se em algum momento o plano parecer pesado demais ou leve demais, me responde. D\xE1 para ajustar a intensidade, e eu ajudo.",
      `Fica aqui: ${c.link("cronograma")}`
    ]
  }
];
var periodoPagamento = (c) => {
  const p = c.pagamento;
  const inicio = dataLonga(p?.inicioEm), fim = dataLonga(p?.fimEm);
  if (inicio && fim) return `de ${inicio} a ${fim}`;
  if (fim) return `at\xE9 ${fim}`;
  const meses = mesesDoPlano(p?.plano);
  return meses ? `pelos pr\xF3ximos ${meses}` : "pelo per\xEDodo do plano";
};
var oQueLibera = (c) => `cronograma at\xE9 a prova, Simulado Nacional todo m\xEAs, temas que mais caem com a resposta da turma e Biblioteca de resumos${c.p.limiteGratisLigado ? ", al\xE9m de quest\xF5es sem limite di\xE1rio" : ""}`;
var pagamento_aprovado = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "seu pagamento foi aprovado", "Seu pagamento foi aprovado"), nm(c, "est\xE1 tudo liberado", "Est\xE1 tudo liberado")],
    corpo: (c) => {
      const plano = nomePlano(c.pagamento?.plano);
      return [
        `${c.pagamento?.renovacao ? "Sua renova\xE7\xE3o" : "Seu pagamento"} foi aprovad${c.pagamento?.renovacao ? "a" : "o"}, e o plano${plano ? ` ${plano}` : ""} j\xE1 est\xE1 ativo ${periodoPagamento(c)}. Obrigado pela confian\xE7a.`,
        `O que ficou liberado: ${oQueLibera(c)}. Tudo isso para uma coisa s\xF3: voc\xEA sentar e estudar, e o site decidir o resto.`,
        `Se eu pudesse escolher o que voc\xEA faz nos primeiros dez minutos: montar o cronograma. Voc\xEA diz a data ${c.daProva}, e a lista de cada dia j\xE1 fica pronta quando voc\xEA sentar. \xC9 o que mais devolve tempo de tudo o que o plano tem.`,
        `Fica aqui: ${c.link("cronograma")}`,
        c.pagamento?.meio === "pix" ? "Como foi no Pix, o plano n\xE3o renova sozinho: eu te aviso com calma quando estiver acabando." : "A assinatura renova sozinha, e d\xE1 para cancelar quando quiser em Minha conta, sem precisar explicar nada."
      ];
    },
    ps: () => "P.S.: se qualquer coisa n\xE3o funcionar como esperado, me responde. Eu resolvo pessoalmente."
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "obrigado, e o que fazer agora", "Obrigado, e o que fazer agora"), nm(c, "recebi o seu pagamento", "Recebi o seu pagamento")],
    corpo: (c) => {
      const plano = nomePlano(c.pagamento?.plano);
      return [
        `Recebi o seu pagamento${plano ? ` do plano ${plano}` : ""}, e quis te agradecer pessoalmente. O site \xE9 um projeto independente; \xE9 a assinatura que paga o servidor e o tempo de manter tudo em dia.`,
        `Seu acesso vale ${periodoPagamento(c)}, com ${oQueLibera(c)}.`,
        "Nos primeiros dias, se eu pudesse sugerir uma ordem: primeiro o cronograma, para a lista do dia j\xE1 estar pronta quando voc\xEA sentar; depois os temas que mais caem, para saber onde insistir. O resto vem com calma.",
        `O cronograma fica aqui: ${c.link("cronograma")}`,
        "E se algo n\xE3o funcionar, me responde. Eu leio tudo."
      ];
    },
    ps: () => "P.S.: este recibo \xE9 tamb\xE9m uma carta. Se quiser me contar para qual prova est\xE1 estudando, eu gosto de saber."
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "est\xE1 tudo certo com o seu plano", "Est\xE1 tudo certo com o seu plano")],
    corpo: (c) => {
      const plano = nomePlano(c.pagamento?.plano);
      return [
        `Est\xE1 tudo certo com o seu plano${plano ? ` ${plano}` : ""}: pagamento aprovado e acesso liberado ${periodoPagamento(c)}.`,
        J(momento(c), c.obs(1, ["prova", "etapa", "cronograma"])),
        `A partir de agora voc\xEA tem ${oQueLibera(c)}. E uma promessa minha: continuar melhorando as quest\xF5es e os coment\xE1rios toda semana.`,
        `Para come\xE7ar pelo que mais devolve tempo, o cronograma: ${c.link("cronograma")}`,
        c.pagamento?.meio === "pix" ? "No Pix, o plano n\xE3o renova sozinho; eu aviso com calma quando estiver perto do fim." : "A assinatura renova sozinha, e cancelar \xE9 um clique em Minha conta, quando quiser."
      ];
    },
    ps: () => "P.S.: obrigado, de verdade. Quem assina \xE9 quem mant\xE9m o site de p\xE9."
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "bem, o plano est\xE1 ativo", "O plano est\xE1 ativo"), nm(c, "pagamento aprovado", "Pagamento aprovado")],
    corpo: (c) => {
      const plano = nomePlano(c.pagamento?.plano);
      return [
        `Pagamento aprovado, plano${plano ? ` ${plano}` : ""} ativo ${periodoPagamento(c)}. Esta \xE9 a parte burocr\xE1tica; a parte boa vem agora.`,
        `O que mudou para voc\xEA: ${oQueLibera(c)}. Em outras palavras, menos tempo decidindo e mais tempo estudando.`,
        "Se eu fosse voc\xEA, hoje faria uma coisa s\xF3: montar o cronograma com a data da prova. Leva dois minutos, e a partir de amanh\xE3 a lista do dia j\xE1 est\xE1 pronta quando voc\xEA sentar.",
        `Fica aqui: ${c.link("cronograma")}`,
        "Se n\xE3o for o que voc\xEA esperava, o reembolso em 7 dias \xE9 pelo pr\xF3prio site, sem precisar explicar nada."
      ];
    },
    ps: () => "P.S.: se responder este e-mail, sou eu que leio. Pode escrever."
  },
  {
    id: "v5",
    requer: (c) => !!c.pagamento?.renovacao,
    assuntos: (c) => [nm(c, "sua renova\xE7\xE3o foi aprovada", "Sua renova\xE7\xE3o foi aprovada"), nm(c, "obrigado por continuar", "Obrigado por continuar")],
    corpo: (c) => {
      const plano = nomePlano(c.pagamento?.plano);
      return [
        `Sua renova\xE7\xE3o${plano ? ` do plano ${plano}` : ""} foi aprovada, e o acesso segue ${periodoPagamento(c)}. Obrigado por continuar.`,
        c.obs(1, ["melhorArea", "ranking", "cronograma", "sequencia"]) ?? "Renovar \xE9 a melhor coisa que algu\xE9m pode me dizer sobre o site: que ele cabe na rotina e vale o tempo.",
        `Tudo continua liberado: ${oQueLibera(c)}. Nada muda, nada se perde, a fila da Revis\xE3o segue de onde estava.`,
        `Se a data da prova mudou, vale atualizar o cronograma para ele recalcular: ${c.link("cronograma")}`,
        "E se tiver qualquer coisa a melhorar, me responde. Quem renova \xE9 quem mais me ensina."
      ];
    },
    ps: () => "P.S.: obrigado, de cora\xE7\xE3o. \xC9 gente como voc\xEA que mant\xE9m o site de p\xE9."
  }
];
var obrigado_tempo = [
  {
    id: "v1",
    assuntos: (c) => [nm(c, "obrigado pelo tempo por aqui", "Obrigado pelo tempo por aqui")],
    corpo: (c) => {
      const fim = dataLonga(c.encerramento?.fimEm);
      return [
        c.encerramento?.reembolso ? "Vi que voc\xEA pediu o reembolso, e j\xE1 est\xE1 encaminhado. Antes de qualquer coisa: obrigado pelo tempo que voc\xEA passou por aqui, e por ter dado uma chance ao site." : `Vi que voc\xEA cancelou a assinatura${fim ? `, e o acesso segue at\xE9 ${fim}` : ""}. Antes de qualquer coisa: obrigado pelo tempo que voc\xEA passou por aqui.`,
        c.dez ? `${cap(asSuas(c))}, o Caderno de erros e a fila da Revis\xE3o ficam guardados. As quest\xF5es abertas continuam abertas, e nada do que voc\xEA fez se perde.` : "Tudo o que voc\xEA fez fica guardado, e as quest\xF5es abertas continuam abertas para voc\xEA.",
        "Se foi o site que n\xE3o ajudou, eu gostaria muito de saber o que faltou. Uma linha basta, e vira melhoria. Se foi a vida, a prova que passou ou o dinheiro que apertou, tudo bem tamb\xE9m. Eu entendo.",
        "A porta fica aberta, sem pressa e sem insist\xEAncia. Quando e se fizer sentido, \xE9 s\xF3 voltar.",
        c.fecho()
      ];
    },
    ps: () => "P.S.: se responder este e-mail, sou eu que leio. Inclusive cr\xEDtica."
  },
  {
    id: "v2",
    assuntos: (c) => [nm(c, "a porta fica aberta", "A porta fica aberta")],
    corpo: (c) => {
      const fim = dataLonga(c.encerramento?.fimEm);
      return [
        `${c.encerramento?.reembolso ? "Seu reembolso est\xE1 encaminhado" : `Sua assinatura foi cancelada${fim ? `, com acesso at\xE9 ${fim}` : ""}`}, e eu quis te escrever pessoalmente, porque um e-mail de sistema n\xE3o diria o que eu queria dizer: obrigado.`,
        c.obs(1, ["melhorArea", "ranking", "sequencia"]),
        "Nada do que voc\xEA fez se perde. O que fica fechado \xE9 a parte do plano; as quest\xF5es, o Caderno de erros e a Revis\xE3o continuam seus.",
        "Se tiver dois minutos, me conta o que faria o site valer mais para voc\xEA. \xC9 o tipo de resposta que mais me ajuda.",
        "E a porta fica aberta. Sem pressa, sem insist\xEAncia."
      ];
    },
    ps: () => "P.S.: tor\xE7o por voc\xEA do mesmo jeito, assinando ou n\xE3o."
  },
  {
    id: "v3",
    assuntos: (c) => [nm(c, "obrigado, e boa prova", "Obrigado, e boa prova")],
    corpo: (c) => [
      `Vi que voc\xEA ${c.encerramento?.reembolso ? "pediu o reembolso" : "cancelou a assinatura"}, e quis agradecer pelo tempo que passamos juntos por aqui. Fico feliz de ter feito parte do seu estudo, mesmo que por um per\xEDodo.`,
      J(momento(c), c.obs(1, ["prova", "etapa", "cronograma"])),
      "Se a prova ainda est\xE1 pela frente, tor\xE7o por voc\xEA do mesmo jeito. As quest\xF5es abertas continuam abertas, e tudo o que voc\xEA fez fica guardado.",
      "Se algo no site n\xE3o funcionou como voc\xEA esperava, me conta? Uma linha j\xE1 ajuda, e eu respondo.",
      c.fecho()
    ],
    ps: () => "P.S.: quando a prova passar, se quiser me contar como foi, eu vou gostar de saber."
  },
  {
    id: "v4",
    assuntos: (c) => [nm(c, "sem insist\xEAncia, com gratid\xE3o", "Sem insist\xEAncia, com gratid\xE3o")],
    corpo: (c) => {
      const fim = dataLonga(c.encerramento?.fimEm);
      return [
        `${c.encerramento?.reembolso ? "O reembolso j\xE1 est\xE1 encaminhado." : `O cancelamento est\xE1 feito${fim ? `, e o acesso vale at\xE9 ${fim}` : ""}.`} Nada de pergunta, nada de "tem certeza?". S\xF3 um obrigado de quem cuida do site.`,
        c.dez ? `Voc\xEA deixou ${Q(c.r)} por aqui, e elas ficam suas: o Caderno de erros, a Revis\xE3o, tudo guardado.` : "Tudo o que voc\xEA fez por aqui fica guardado e continua seu.",
        "Eu entendo que a rotina muda, que a prova passa, que o or\xE7amento aperta. Se um dia fizer sentido voltar, est\xE1 tudo do jeito que voc\xEA deixou.",
        "E se tiver algo que eu possa melhorar, a resposta deste e-mail chega direto para mim.",
        c.fecho()
      ];
    },
    ps: () => "P.S.: obrigado, de verdade. Cada pessoa que assinou um dia ajudou a manter isto de p\xE9."
  },
  {
    id: "v5",
    assuntos: (c) => [nm(c, "uma pergunta s\xF3, se puder", "Uma pergunta s\xF3, se puder")],
    corpo: (c) => [
      `Vi que voc\xEA ${c.encerramento?.reembolso ? "pediu o reembolso" : "cancelou a assinatura"}. Est\xE1 tudo certo, e obrigado pelo tempo por aqui.`,
      "Tenho uma pergunta s\xF3, se puder responder: o que faltou? Pode ser o tempo, um recurso que n\xE3o existe, a prova que j\xE1 passou. Qualquer resposta me ajuda a fazer o site melhor para quem vem depois.",
      c.obs(1, ["prova", "etapa"]),
      "Independentemente da resposta, tudo o que voc\xEA fez fica guardado, e as quest\xF5es abertas continuam abertas para voc\xEA. A porta fica aberta.",
      c.fecho()
    ],
    ps: () => "P.S.: se responder, sou eu que leio. E respondo."
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
  relatorio,
  boas_vindas_dia0,
  primeiras_10,
  voltou,
  cronograma_pronto,
  pagamento_aprovado,
  obrigado_tempo
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
var TIPOS_AUTOMATICOS_NOVOS = ["boas_vindas_dia0", "primeiras_10", "voltou", "cronograma_pronto", "pagamento_aprovado", "obrigado_tempo"];
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
function cadenciaBloqueia(anteriores = [], hoje = /* @__PURE__ */ new Date(), tipo) {
  if (tipo && TIPOS_TRANSACIONAIS.includes(tipo)) return null;
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
    const faltam2 = Math.max(1, Math.ceil(CADENCIA.dias - maisAntigo));
    return `Cad\xEAncia: j\xE1 recebeu ${noPeriodo.length} e-mails nos \xFAltimos 14 dias. A pr\xF3xima carta pode sair em ${dias(faltam2)}.`;
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
  if (p.assinante && !recebeu("obrigado_assinatura") && !recebeu("pagamento_aprovado", 30)) return com("obrigado_assinatura", null, null, "Assina e ainda n\xE3o recebeu o agradecimento.");
  if (parado !== null && parado >= 10) return com("sumiu", null, null, `Sem responder h\xE1 ${dias(parado)}.`);
  if (r < MINIMO_PARA_ACERTO && parado !== null && parado >= 3) return com("comecou_parou", null, null, `Fez ${questoes(r)} e parou h\xE1 ${dias(parado)}.`);
  if (r < MINIMO_PARA_ACERTO && conta <= 3) return com("boas_vindas", null, null, "Chegou h\xE1 poucos dias e j\xE1 come\xE7ou.");
  const marco2 = marcoRecente(r, MARCOS_CARTA);
  if (marco2 && !anteriores.some((e) => (e.tipo === "marco" || familia(e.modelo) === "marco") && (e.marco ?? null) === marco2) && !recebeu("marco", 20)) {
    return com("marco", null, marco2, `Acabou de passar de ${numero(marco2)} quest\xF5es.`);
  }
  const provas = p.provas ?? [];
  const teot = provas.includes("teot") || !provas.length && (p.ano === "r3" || p.situacao === "r4");
  const diasProva2 = p.diasParaProva ?? (teot ? diasAteTeot(hoje) : null);
  if (diasProva2 !== null && diasProva2 <= 60 && (teot || p.diasParaProva) && !recebeu("reta_final", 30)) return com("reta_final", null, null, `Faltam ${dias(diasProva2)} para a prova.`);
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
  let diasProva2 = Number(p.diasParaProva);
  if (!Number.isFinite(diasProva2) && p.provaData) diasProva2 = Math.ceil((new Date(p.provaData).getTime() - hoje.getTime()) / 864e5);
  if (Number.isFinite(diasProva2) && diasProva2 >= 1 && diasProva2 <= 730) {
    const nome = (p.provaCronograma ?? "").trim();
    f.cronograma = { dias: Math.round(diasProva2), prova: nome && nome.length <= 30 && !/[@\d_]/.test(nome) ? nome : null };
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
  desempenho: "#/desempenho"
};
function frasesDoFato(chave, f, mostrar) {
  const A = (slug) => AREAS[slug];
  switch (chave) {
    case "melhorArea": {
      const m = f.melhorArea, a = A(m.slug);
      return mostrar ? [
        `Reparei que ${a.em} \xE9 o seu ponto mais forte, com ${m.pct}% de acerto. Isso n\xE3o aparece por acaso.`,
        `Reparei que ${a.em} virou o seu ponto forte, com ${m.pct}% de acerto em ${questoes(m.total)}. \xC9 fruto de quest\xE3o feita com aten\xE7\xE3o, e nada disso se perde.`,
        `Em ${a.em} voc\xEA est\xE1 voando: ${m.pct}% de acerto. ${a.sabor[0]}`,
        `Seu melhor tema hoje \xE9 ${a.em}, com ${m.pct}%. D\xE1 gosto de ver, porque isso \xE9 de quem senta e faz.`
      ] : [
        `Vi que ${a.em} j\xE1 virou um ponto forte seu. ${a.sabor[0]}`,
        `Reparei que ${a.em} \xE9 o tema em que voc\xEA mais brilha. Fiquei feliz de ver.`,
        `Em ${a.em} voc\xEA j\xE1 est\xE1 mandando muito bem, e isso diz muito sobre o jeito como voc\xEA estuda.`
      ];
    }
    case "maisEstudada": {
      const m = f.maisEstudada, a = A(m.slug);
      return [
        `Vi que ${a.em} \xE9 o tema a que voc\xEA mais tem se dedicado: ${questoes(m.total)} at\xE9 agora. ${a.sabor[a.sabor.length - 1]}`,
        `Reparei que tem bastante quest\xE3o de ${a.de} no seu hist\xF3rico. ${a.sabor[a.sabor.length - 1]}`,
        `${a.de.charAt(0).toUpperCase() + a.de.slice(1)} parece ser a sua praia por aqui: j\xE1 s\xE3o ${questoes(m.total)}.`
      ];
    }
    case "areaFraca": {
      const a = A(f.areaFraca.slug);
      return [
        `Se fosse escolher um tema para as pr\xF3ximas semanas, eu iria em ${a.em}: \xE9 onde cada sess\xE3o vai render mais para voc\xEA agora. Dez quest\xF5es por semana j\xE1 mudam o quadro.`,
        `Reparei que ${a.em} \xE9 o tema com mais espa\xE7o para crescer no seu caso, e isso \xE9 uma boa not\xEDcia: \xE9 ali que os pontos v\xEAm mais r\xE1pido. Dez quest\xF5es por semana bastam.`,
        `Um palpite de quem olhou o seu estudo com carinho: dez quest\xF5es de ${a.de} por semana podem fazer uma bela diferen\xE7a nas pr\xF3ximas semanas.`
      ];
    }
    case "horario":
      return {
        noite: ["Vi que voc\xEA estuda quase sempre \xE0 noite. Conhe\xE7o bem essa rotina: o dia inteiro no hospital e o estudo esperando no fim dele.", "Reparei que quase tudo seu sai \xE0 noite, quando o dia j\xE1 acabou. Eu tamb\xE9m estudava assim, e sei o que custa.", "Vi que a noite \xE9 o seu hor\xE1rio de estudo. Respeito demais quem encontra esse tempo depois de um dia inteiro."],
        madrugada: ["Vi que muita quest\xE3o sua sai de madrugada, provavelmente no plant\xE3o. Admiro a dedica\xE7\xE3o, e pe\xE7o com carinho que cuide do sono tamb\xE9m.", "Reparei que voc\xEA estuda at\xE9 de madrugada. J\xE1 estive a\xED, e lembro com carinho que o sono tamb\xE9m \xE9 estudo."],
        manha: ["Reparei que voc\xEA gosta de estudar cedo, antes de o dia come\xE7ar. \xC9 um jeito bonito de proteger o estudo da rotina.", "Vi que voc\xEA estuda bastante de manh\xE3 cedo, antes de o hospital te engolir. Admiro essa disciplina."],
        almoco: ["Vi que muita quest\xE3o sua sai na hora do almo\xE7o. Que jeito esperto de encaixar o estudo no \xFAnico intervalo do dia.", "Reparei que voc\xEA aproveita o hor\xE1rio do almo\xE7o para estudar. Isso \xE9 usar bem o pouco tempo que a resid\xEAncia deixa."],
        tarde: ["Vi que voc\xEA costuma estudar \xE0 tarde, num ritmo bem constante.", "Reparei que a tarde \xE9 o seu hor\xE1rio de quest\xF5es. Gosto de ver essa rotina."]
      }[f.horario];
    case "prova":
      return {
        teot: ["Vi que o TEOT est\xE1 no seu horizonte, e fico na torcida.", "Sei que o seu foco \xE9 o TEOT, e penso nisso quando olho o seu estudo."],
        taro: ["Vi que voc\xEA est\xE1 se preparando para o TARO, e fico na torcida.", "Sei que o TARO est\xE1 no seu radar."],
        mao: ["Vi que voc\xEA est\xE1 se preparando para a prova da cirurgia da m\xE3o.", "Sei que a prova da m\xE3o est\xE1 no seu radar, e fico na torcida."],
        r4: ["Vi que voc\xEA est\xE1 mirando o R4.", "Sei que a sele\xE7\xE3o do R4 est\xE1 no seu radar, e fico na torcida."],
        atualizacao: ["Vi que voc\xEA estuda para se manter em dia, sem prova marcada. Acho isso muito bonito.", "Gosto muito de ver gente estudando sem prova marcada, s\xF3 pelo prazer de se manter em dia."]
      }[f.prova];
    case "etapa":
      return {
        r1: ["Sei que o R1 \xE9 um ano de muita novidade e pouco tempo, e mesmo assim voc\xEA est\xE1 aqui.", "O R1 \xE9 o ano em que a gente aprende a sobreviver ao hospital. Estudar no meio disso tem muito valor."],
        r2: ["Sei que o R2 costuma ser o ano mais puxado de plant\xE3o, e mesmo assim voc\xEA encontra tempo.", "Estudar no meio do R2 n\xE3o \xE9 pouca coisa. Eu lembro bem desse ano."],
        r3: ["O R3 \xE9 o ano do TEOT, e sei como ele pesa. Cada quest\xE3o agora conta muito.", "Sei que o R3 \xE9 um ano intenso, com a prova no fim dele."],
        r4: ["Na subespecialidade, o detalhe faz toda a diferen\xE7a.", "Estudar no R4 \xE9 escolher ir al\xE9m, e eu admiro isso."],
        mao: ["Resid\xEAncia de m\xE3o pede muito detalhe, e voc\xEA est\xE1 encarando com vontade.", "Na m\xE3o, o detalhe \xE9 tudo, e d\xE1 para ver que voc\xEA sabe disso."],
        estudante: ["Estudar ortopedia ainda na gradua\xE7\xE3o \xE9 sair na frente.", "Fico feliz de ver gente da gradua\xE7\xE3o estudando ortopedia com tanta seriedade."],
        ortopedista: ["Admiro muito quem segue estudando depois da resid\xEAncia.", "\xC9 bonito ver quem j\xE1 terminou a resid\xEAncia mantendo o estudo em dia."]
      }[f.etapa];
    case "ranking": {
      const n = f.ranking;
      return n <= 10 ? [`Voc\xEA est\xE1 em ${n}\xBA no ranking geral, entre os dez primeiros. Que orgulho.`, `${n}\xBA lugar no ranking geral. Isso \xE9 muito estudo, e fiquei feliz de ver.`] : [`Parab\xE9ns pela ${n}\xAA posi\xE7\xE3o no ranking geral.`, `Vi que voc\xEA est\xE1 em ${n}\xBA no ranking geral, e fiquei feliz de ver o seu nome l\xE1.`];
    }
    case "sequencia":
      return [`S\xE3o ${dias(f.sequencia)} seguidos estudando. Que const\xE2ncia bonita.`, `Sua sequ\xEAncia est\xE1 em ${dias(f.sequencia)}, e isso diz muito sobre voc\xEA.`];
    case "flashcards":
      return ["Vi que voc\xEA tamb\xE9m est\xE1 usando os flashcards, que bom.", `Vi que voc\xEA j\xE1 passou por ${numero(f.flashcards)} flashcards tamb\xE9m.`];
    case "semana":
      return [`S\xF3 nos \xFAltimos sete dias foram ${questoes(f.semana)}. Que dedica\xE7\xE3o.`, `Vi as ${questoes(f.semana)} desta \xFAltima semana, e fiquei feliz.`];
    case "resumos": {
      const r = f.resumos;
      if (r.total === 1) return r.titulo ? [`Vi que voc\xEA leu o resumo "${r.titulo}" na Biblioteca. Ler o resumo e depois fazer as quest\xF5es do tema \xE9 o jeito mais r\xE1pido de fixar.`] : ["Vi que voc\xEA j\xE1 leu um resumo da Biblioteca. Resumo e quest\xE3o do mesmo tema, na mesma sess\xE3o, \xE9 a combina\xE7\xE3o que mais rende."];
      return [
        r.titulo ? `Vi que voc\xEA j\xE1 leu ${numero(r.total)} resumos da Biblioteca, entre eles "${r.titulo}". Resumo e quest\xE3o do mesmo tema, na mesma sess\xE3o, \xE9 a combina\xE7\xE3o que mais rende.` : `Vi que voc\xEA j\xE1 leu ${numero(r.total)} resumos da Biblioteca. Resumo e quest\xE3o do mesmo tema, na mesma sess\xE3o, \xE9 a combina\xE7\xE3o que mais rende.`,
        `Reparei nos ${numero(r.total)} resumos que voc\xEA j\xE1 leu na Biblioteca. Quem l\xEA o resumo antes das quest\xF5es costuma sentir o estudo render mais r\xE1pido.`
      ];
    }
    case "cronograma": {
      const c = f.cronograma, prova = c.prova ? `o ${c.prova}` : "a sua prova";
      return [
        `Vi no seu cronograma que faltam ${dias(c.dias)} para ${prova}. D\xE1 tempo de muita coisa, ainda mais com a lista de cada dia j\xE1 pronta.`,
        `Pelo seu cronograma, ${prova} est\xE1 a ${dias(c.dias)}. Gosto de saber disso quando te escrevo: muda o que vale sugerir.`
      ];
    }
    case "servico":
      return [`Vi que voc\xEA \xE9 ${f.servico.de}. Manda um abra\xE7o para o pessoal de l\xE1.`, `Reparei que voc\xEA est\xE1 ${f.servico.de}. Deve ser corrido por l\xE1, e mesmo assim voc\xEA encontra tempo para estudar.`];
    case "cidade":
      return [`Vi que voc\xEA estuda a partir de ${f.cidade}. Que bom ter algu\xE9m de l\xE1 por aqui.`, `Reparei que voc\xEA escreve de ${f.cidade}. Um abra\xE7o para a cidade.`];
    case "aniversario":
      return f.aniversario === "hoje" ? ["E hoje \xE9 o seu anivers\xE1rio. Parab\xE9ns, de cora\xE7\xE3o. Que o ano que come\xE7a traga a aprova\xE7\xE3o e, antes dela, dias mais leves."] : ["Vi que o seu anivers\xE1rio est\xE1 chegando. Deixo o parab\xE9ns adiantado, com carinho."];
  }
  return [];
}
var ORDEM_FATOS = ["aniversario", "cronograma", "melhorArea", "ranking", "resumos", "servico", "maisEstudada", "horario", "prova", "sequencia", "semana", "etapa", "cidade", "flashcards", "areaFraca"];
var MAXIMO_OBS = 3;
var TEMPO = [
  "Dez minutos no intervalo j\xE1 contam. N\xE3o precisa ser uma sess\xE3o grande para valer.",
  "Voc\xEA senta e estuda; o site decide o resto. Esse foi o combinado desde o come\xE7o.",
  "Trinta minutos num hor\xE1rio fixo valem mais que duas horas espalhadas pelo fim de semana.",
  "Estudar f\xE1cil, para mim, \xE9 abrir e j\xE1 saber o que fazer. O resto \xE9 desculpa que o cansa\xE7o inventa.",
  "O tempo que a gente mais perde n\xE3o \xE9 estudando, \xE9 decidindo o que estudar. Deixar essa decis\xE3o pronta devolve uns quinze minutos por dia.",
  "Cinco quest\xF5es no \xF4nibus, cinco no caf\xE9, cinco antes de dormir. No fim da semana, isso vira um estudo de verdade.",
  "A lista do dia j\xE1 pronta quando voc\xEA sai da cirurgia: \xE9 isso que faz o estudo caber numa rotina de hospital.",
  "Pouco e todo dia rende mais do que muito de vez em quando. A mem\xF3ria gosta de repeti\xE7\xE3o, n\xE3o de maratona.",
  "Se a semana apertar, tudo bem. O site fica do jeito que voc\xEA deixou, e a Revis\xE3o guarda o que precisa de uma segunda olhada.",
  "O segredo de quem passa com a rotina cheia n\xE3o \xE9 estudar mais horas, \xE9 n\xE3o desperdi\xE7ar as poucas que tem."
];
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
var FECHOS = ["Se n\xE3o for a hora, tudo bem tamb\xE9m. Eu continuo por aqui.", "Se eu puder ajudar em qualquer coisa, \xE9 s\xF3 responder este e-mail.", "Estou torcendo por voc\xEA.", "Conte comigo no que precisar.", "Fico feliz de acompanhar o seu caminho.", "Tor\xE7o muito pela sua aprova\xE7\xE3o.", "Bons estudos por a\xED, e cuide-se.", "Vai dar certo. E eu estou por aqui."];
var CHAVES_FECHO = ["respond", "torc", "acompanh", "conte comigo", "bons estudos", "n\xE3o for a hora", "por aqui"];
var simples = (t) => t.toLowerCase().replace(/ç/g, "c");
var PS_HUMANOS = [
  "P.S.: se responder este e-mail, sou eu que leio. Pode escrever.",
  "P.S.: cuida do sono. Ele conta como estudo, e ningu\xE9m avisa isso na resid\xEAncia.",
  "P.S.: se encontrar algo estranho numa quest\xE3o, tem um bot\xE3o para relatar. Eu leio cada relato.",
  "P.S.: dez minutos no intervalo j\xE1 contam. N\xE3o precisa esperar um dia livre para estudar.",
  "P.S.: se a semana apertar, tudo bem. O site fica do jeito que voc\xEA deixou.",
  "P.S.: se quiser me contar como est\xE1 sendo a rotina, \xE9 s\xF3 responder. Gosto de saber.",
  "P.S.: a parte do site em que eu mais caprichei foi o coment\xE1rio das alternativas erradas. Vale ler at\xE9 o fim.",
  "P.S.: toma um caf\xE9 por mim antes da pr\xF3xima sess\xE3o.",
  "P.S.: errar aqui \xE9 barato. \xC9 na prova que custa. Aproveita que aqui \xE9 treino.",
  "P.S.: se tiver um colega estudando para a mesma prova, estudar junto deixa tudo mais leve.",
  "P.S.: dormir bem na v\xE9spera de um dia cheio tamb\xE9m \xE9 estudar. Eu demorei a aprender isso.",
  "P.S.: n\xE3o precisa responder, mas se responder eu fico feliz."
];
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
  const diasProva2 = fatos.cronograma?.dias ?? (teot ? diasAteTeot(hoje) : null);
  const nomeProva = fatos.cronograma?.prova && !/[@\d_]/.test(fatos.cronograma.prova) ? `o ${fatos.cronograma.prova}` : fatos.prova ? NOME_PROVA[fatos.prova] : teot ? "o TEOT" : "a prova";
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
    diasProva: diasProva2,
    nomeProva,
    daProva: nomeProva.replace(/^o /, "do ").replace(/^a /, "da "),
    marco: marco2,
    pix: op.pix,
    relatorio: op.relatorio,
    pagamento: op.pagamento,
    encerramento: op.encerramento,
    usados,
    um,
    chance: (x) => rnd() < x,
    link: (rota) => {
      estado.link = rota;
      return (site2 + ROTAS[rota]).replace(/^https?:\/\//, "");
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
    ps: () => {
      const candidatos = [];
      if (fatos.aniversario && !usados.has("aniversario")) candidatos.push(["aniversario", fatos.aniversario === "hoje" ? "P.S.: e parab\xE9ns pelo anivers\xE1rio. Que o ano que come\xE7a traga a aprova\xE7\xE3o e dias mais leves." : "P.S.: vi que o seu anivers\xE1rio est\xE1 chegando. Deixo o parab\xE9ns adiantado, com carinho."]);
      if (fatos.ranking && !usados.has("ranking")) candidatos.push(["ranking", `P.S.: vi que voc\xEA est\xE1 em ${fatos.ranking}\xBA no ranking geral. Fiquei feliz de ver o seu nome l\xE1.`]);
      if (fatos.sequencia && !usados.has("sequencia")) candidatos.push(["sequencia", `P.S.: ${dias(fatos.sequencia)} seguidos de estudo. Que const\xE2ncia bonita.`]);
      if (fatos.horario === "madrugada" && !usados.has("horario")) candidatos.push(["horario", "P.S.: vi que voc\xEA estuda at\xE9 de madrugada. Admiro muito, e pe\xE7o com carinho: cuide do sono tamb\xE9m, que a mem\xF3ria agradece."]);
      if (fatos.horario === "noite" && !usados.has("horario")) candidatos.push(["horario", "P.S.: vi que voc\xEA estuda bastante \xE0 noite. Admiro muito quem encontra tempo depois de um dia inteiro."]);
      if (fatos.cronograma && !usados.has("cronograma")) candidatos.push(["cronograma", fatos.cronograma.dias >= 60 ? `P.S.: ${dias(fatos.cronograma.dias)} \xE9 bastante tempo. Cuida do sono nas pr\xF3ximas semanas, que ele conta como estudo.` : `P.S.: faltam ${dias(fatos.cronograma.dias)} para ${fatos.cronograma.prova ? `o ${fatos.cronograma.prova}` : "a sua prova"}. Estou na torcida.`]);
      if (fatos.servico && !usados.has("servico")) candidatos.push(["servico", `P.S.: um abra\xE7o para o pessoal ${fatos.servico.de}.`]);
      if (fatos.melhorArea && !usados.has("melhorArea")) {
        const em = AREAS[fatos.melhorArea.slug].em;
        candidatos.push(["melhorArea", mostrarAcerto() ? `P.S.: ${em} com ${fatos.melhorArea.pct}% de acerto. Parab\xE9ns, de verdade.` : `P.S.: ${em} est\xE1 ficando muito forte no seu estudo. Parab\xE9ns, de verdade.`]);
      }
      if (fatos.resumos && !usados.has("resumos")) candidatos.push(["resumos", fatos.resumos.titulo ? `P.S.: vi que voc\xEA leu "${fatos.resumos.titulo}" na Biblioteca. Fazer as quest\xF5es do tema logo depois \xE9 o que mais fixa.` : "P.S.: vi que voc\xEA anda lendo os resumos da Biblioteca. Fazer as quest\xF5es do tema logo depois \xE9 o que mais fixa."]);
      if (candidatos.length && nObs() < MAXIMO_OBS && rnd() < 0.5) {
        const [chave, texto] = candidatos[Math.floor(rnd() * candidatos.length)];
        if (chave) {
          usados.add(chave);
          if (chave === "melhorArea" && mostrarAcerto()) usados.add("acerto");
        }
        return texto;
      }
      return um(...PS_HUMANOS);
    },
    beneficios: (k, curto = false) => {
      const lista2 = [
        ["o cronograma at\xE9 a prova: voc\xEA diz a data e a lista de cada dia j\xE1 est\xE1 pronta quando voc\xEA senta, com o que mais cai primeiro; se a semana apertar, ele se ajusta sozinho", "o cronograma at\xE9 a prova", fatos.prova || fatos.etapa || fatos.cronograma ? 10 : 6],
        ["o Simulado Nacional todo m\xEAs, com a sua posi\xE7\xE3o", "o Simulado Nacional do m\xEAs", fatos.ranking ? 9 : 5],
        ["os temas que mais caem em cada \xE1rea e como a turma respondeu cada alternativa", "os temas que mais caem", fatos.areaFraca ? 9 : 4],
        ["o Resum\xE3o, com o que cai em uma frase por assunto", "o Resum\xE3o da reta final", (diasProva2 ?? 999) <= 90 ? 7 : 3],
        ["a Biblioteca de resumos inteira, cada resumo sa\xEDdo de um cap\xEDtulo de livro e com as quest\xF5es reais no meio do texto", "a Biblioteca de resumos", fatos.resumos ? 9 : 4],
        ["a liga da resid\xEAncia e o relat\xF3rio do m\xEAs", "a liga da resid\xEAncia", fatos.etapa && fatos.etapa.startsWith("r") ? 4 : 2]
      ];
      if (p.limiteGratisLigado) {
        const t = fatos.flashcards ? "quest\xF5es e flashcards sem limite di\xE1rio" : "quest\xF5es sem limite di\xE1rio";
        lista2.push([t, t, fatos.flashcards || (fatos.semana ?? 0) >= 100 ? 11 : 6]);
      }
      return lista2.map(([longo, breve, peso]) => [curto ? breve : longo, peso + rnd() * 2]).sort((a, b) => b[1] - a[1]).slice(0, k).map(([t]) => t);
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
    const lista2 = novas.length ? novas : possiveis;
    const v = lista2[Math.floor(rnd() * lista2.length)];
    const brutos = v.corpo(ctx).filter((x) => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
    const paragrafos = brutos.filter((x, i) => {
      if (!FECHOS.includes(x)) return true;
      const chave = CHAVES_FECHO.find((k) => simples(x).includes(k));
      return !chave || !brutos.some((y, j) => j !== i && simples(y).includes(chave));
    });
    const saudacao = v.saudacao ? v.saudacao(ctx) : ctx.nome ? ctx.um(...SAUDACOES_NOME).replace("{n}", ctx.nome) : ctx.um(...SAUDACOES);
    let ps = paragrafos.find((x) => /^P\.S\.:/.test(x)) ?? null;
    const semPS = paragrafos.filter((x) => !/^P\.S\.:/.test(x));
    if (!ps) ps = v.ps ? v.ps(ctx) : ctx.ps();
    const linhasDe = (lista3) => contarLinhas([saudacao, ...lista3, ps].join("\n\n"));
    const reforcos = [() => ctx.tempo(), () => ctx.fecho(), () => ctx.dica()];
    for (const reforco of reforcos) {
      if (linhasDe(semPS) >= LINHAS.minimo) break;
      const extra = reforco();
      if (extra && !semPS.includes(extra)) semPS.push(extra);
    }
    const assuntos = v.assuntos(ctx).filter((x) => typeof x === "string" && x.trim() !== "").map((x) => x.trim()).filter((a) => !problemaNoAssunto(a));
    const assunto = assuntos[Math.floor(rnd() * assuntos.length)];
    const corpo = [saudacao, ...semPS, ps].join("\n\n");
    const linhas = contarLinhas(corpo);
    if (!assunto || problemaNoTexto(corpo) || contarLinks(corpo) > 1 || contarPS(corpo) !== 1 || linhas < LINHAS.minimo || linhas > LINHAS.maximo) continue;
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
    provaCronograma: texto(d.prova_cronograma)
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
    hoje: d.hoje,
    semente: d.semente ?? sementeDe(`marco:${d.marco.minimo}:${d.nome ?? ""}:${d.respondidas}`)
  });
  return pronto(carta, d.linkDescadastro, "Se preferir n\xE3o receber mais os e-mails de conquistas");
}
function emailCarta(d) {
  const nome = primeiroNome(d.nome);
  const recado = d.recado?.trim();
  const padrao = d.respondidas >= 10 ? `Passando para te dar parab\xE9ns: voc\xEA j\xE1 passou de ${questoes(d.respondidas)} no Orto Quest\xF5es, e fiquei muito feliz de ver. Const\xE2ncia \xE9 o que mais faz diferen\xE7a na prova, e voc\xEA est\xE1 construindo a sua nos intervalos que a rotina deixa.` : "Passando para dar um oi e dizer que fico feliz de ter voc\xEA por aqui. Sua conta est\xE1 pronta, e quando quiser come\xE7ar, cinco quest\xF5es j\xE1 bastam para pegar o jeito.";
  const corpo = [nome ? `${nome}, tudo bem?` : "Oi, tudo bem?", recado || padrao, "Se eu puder ajudar em qualquer coisa, \xE9 s\xF3 responder este e-mail.", "P.S.: se responder, sou eu que leio."].join("\n\n");
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
var TIPOS_AUTOMATICOS = TIPOS_AUTOMATICOS_NOVOS;
var tipoAutomaticoValido = (t) => TIPOS_AUTOMATICOS.includes(t ?? "") ? t : null;
var ehTransacional = (t) => TIPOS_TRANSACIONAIS.includes(t);
function emailAutomatico(d) {
  const perfil = perfilDe({ nome: d.nome, respondidas: d.respondidas }, d.perfil);
  if (d.tipo === "voltou") perfil.diasParado = Math.max(10, Math.round(Number(d.diasFora) || 10));
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
    `Muito obrigado por ter avisado do problema em ${rotulo}: "${trecho}"`,
    alternativa ? `Conferi com cuidado, e voc\xEA tinha raz\xE3o sobre a alternativa ${alternativa}. A quest\xE3o j\xE1 est\xE1 corrigida no site${nota ? `, e o que mudou foi isto: ${nota}` : ", e o coment\xE1rio foi ajustado para explicar o ponto"}.` : `Conferi com cuidado, e a quest\xE3o j\xE1 est\xE1 corrigida no site.${nota ? ` O que mudou: ${nota}` : " O coment\xE1rio foi ajustado para deixar o ponto claro."}`,
    "Gente atenta como voc\xEA deixa o banco de quest\xF5es melhor para todo mundo que est\xE1 estudando com pouco tempo e precisa confiar no que l\xEA. Fiquei muito grato.",
    `Se quiser ver como ficou: ${link.replace(/^https?:\/\//, "")}`,
    "P.S.: se encontrar outra coisa estranha, o bot\xE3o de relatar continua l\xE1. Eu leio cada relato."
  ].join("\n\n");
  const assunto = nome ? `${nome}, obrigado pelo aviso sobre a quest\xE3o` : `Obrigado pelo aviso sobre ${rotulo}`;
  return renderizarCarta({ assunto: assunto.length <= 55 ? assunto : "Obrigado pelo aviso sobre a quest\xE3o", corpo });
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
  let enviados = 0, falhas = 0, adiados = 0;
  for (const id of destinatarios) {
    const anteriores = await anterioresDe(id).catch(() => []);
    if (cadenciaBloqueia(anteriores, /* @__PURE__ */ new Date(), "relatorio")) {
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
      await enviarEmail(pronto2.para, pronto2.assunto, pronto2.html, pronto2.texto, await linkDescadastro(id, "relatorio"));
      await atualizarEnvio(linha.id, { status: "enviado", assunto: pronto2.assunto }, { modelo: pronto2.modelo, versao: pronto2.versao, origem: "automatico" });
      enviados++;
    } catch (falha) {
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "falhou", erro: motivo(falha) }) });
      falhas++;
    }
    await esperar(600);
  }
  return { mes, enviados, falhas, adiados, lote: destinatarios.length, talvez_restem: destinatarios.length === limite };
}
var TIPO_DA_CAMPANHA = { nunca: "nunca_comecou", tres_dias: "pausa", sete_dias: "sumiu", renovacao_pix: "pix_3_dias", renovacao_pix_hoje: "pix_hoje" };
var CAMPANHAS = ["nunca", "tres_dias", "sete_dias", "renovacao_pix", "renovacao_pix_hoje"];
var ehPix = (c) => c === "renovacao_pix" || c === "renovacao_pix_hoje";
var campanhaValida = (c) => CAMPANHAS.includes(c ?? "") ? c : null;
async function enviarLembretes(campanha, limitePedido, por) {
  const limite = Math.max(1, Math.min(Number(limitePedido) || 40, 80));
  const r = ehPix(campanha) ? await banco("rpc/destinatarios_renovacao_pix", { method: "POST", body: JSON.stringify({ p_etapa: campanha === "renovacao_pix_hoje" ? "hoje" : "tres_dias", p_limite: limite }) }) : await banco("rpc/destinatarios_lembrete", { method: "POST", body: JSON.stringify({ p_campanha: campanha, p_limite: limite }) });
  if (!r.ok) throw new Error("consulta_destinatarios_falhou");
  const destinatarios = await r.json();
  let enviados = 0, falhas = 0, adiados = 0;
  for (const d of destinatarios) {
    const anteriores = await anterioresDe(d.id_usuario).catch(() => []);
    if (cadenciaBloqueia(anteriores, /* @__PURE__ */ new Date(), TIPO_DA_CAMPANHA[campanha])) {
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
      await enviarEmail(d.email, e.assunto, e.html, e.texto, descadastro);
      await atualizarEnvio(linha.id, { status: "enviado", assunto: e.assunto }, { modelo: e.modelo, versao: e.versao, origem: por ? "lote" : "automatico" });
      enviados++;
    } catch (falha) {
      await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "falhou", erro: motivo(falha) }) });
      falhas++;
    }
    await esperar(600);
  }
  return { campanha, enviados, falhas, adiados, lote: destinatarios.length, talvez_restem: destinatarios.length === limite };
}
async function registrar(corpo) {
  return banco("emails_enviados", { method: "POST", body: JSON.stringify(corpo) });
}
var diaDeHoje = () => new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 10);
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
  let diasParaProva = Number(pedido.dias_para_prova ?? 0) || null, prova = typeof pedido.prova === "string" ? pedido.prova.slice(0, 30) : null;
  if (tipo === "cronograma_pronto") {
    const p = await banco(`planos_estudo?usuario_id=eq.${id}&select=data_prova,prova&limit=1`);
    const [plano] = p.ok ? await p.json() : [];
    if (!plano?.data_prova) return { resultado: "sem_cronograma" };
    diasParaProva = Math.max(1, Math.ceil(((/* @__PURE__ */ new Date(`${plano.data_prova}T12:00:00-03:00`)).getTime() - Date.now()) / 864e5));
    prova = plano.prova ?? prova;
  }
  const umaVez = tipo === "boas_vindas_dia0" || tipo === "primeiras_10" || tipo === "cronograma_pronto";
  const sufixo = typeof pedido.referencia === "string" && /^[a-zA-Z0-9_:.-]{1,60}$/.test(pedido.referencia) ? pedido.referencia : tipo === "voltou" ? diaDeHoje() : "";
  const referencia = umaVez ? tipo : `${tipo}:${sufixo || diaDeHoje()}`;
  const existe = await banco(`emails_enviados?id_usuario=eq.${id}&referencia=eq.${encodeURIComponent(referencia)}&status=in.(enviado,enviando)&select=id&limit=1`);
  if (existe.ok && (await existe.json()).length) return { resultado: "ja_enviado", tipo };
  const anteriores = await anterioresDe(id).catch(() => []);
  const bloqueio = automaticoBloqueado(tipo, anteriores);
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
    provaCronograma: prova,
    pagamento: tipo === "pagamento_aprovado" ? { plano: pedido.plano ?? null, inicioEm: pedido.inicio_periodo ?? null, fimEm: pedido.fim_periodo ?? null, meio, renovacao: !!pedido.renovacao } : void 0,
    encerramento: tipo === "obrigado_tempo" ? { reembolso: !!pedido.reembolso, fimEm: pedido.fim_periodo ?? null } : void 0
  });
  const base = { id_usuario: id, referencia, assunto: e.assunto, status: "enviando", enviado_por: por };
  let reserva = await registrar({ ...base, tipo: "carta", modelo: e.modelo, versao: e.versao, origem: "automatico" });
  if (!reserva.ok) reserva = await registrar({ ...base, tipo: "parabens" });
  if (!reserva.ok) return { resultado: "sql_pendente" };
  const [linha] = await reserva.json();
  try {
    await enviarEmail(pessoa.email, e.assunto, e.html, e.texto, transacional ? void 0 : await linkDescadastro(id, "cartas"));
    if (linha) await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "enviado" }) });
    return { resultado: "enviado", tipo, para: pessoa.email };
  } catch (falha) {
    if (linha) await banco(`emails_enviados?id=eq.${linha.id}`, { method: "PATCH", body: JSON.stringify({ status: "falhou", erro: motivo(falha) }) });
    return { resultado: "falhou", tipo };
  }
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
    if (corpo.acao === "automatico") {
      const tipo = tipoAutomaticoValido(corpo.tipo);
      if (!tipo) return json({ erro: "tipo_invalido" }, 400, req);
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
      if (!dados.quer_conquistas) return json({ resultado: "nao_quer" }, 200, req);
      const marco2 = marcoComCarta(Number(dados.respondidas));
      if (!marco2) return json({ resultado: "ainda_nao" }, 200, req);
      if (Number(dados.respondidas) > marco2.minimo + folga(marco2)) return json({ resultado: "longe_do_marco", marco: marco2.minimo }, 200, req);
      const bloqueio = cadenciaBloqueia(await anterioresDe(usuario.id).catch(() => []), /* @__PURE__ */ new Date(), "marco");
      if (bloqueio) return json({ resultado: "adiado", marco: marco2.minimo, motivo: bloqueio }, 200, req);
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

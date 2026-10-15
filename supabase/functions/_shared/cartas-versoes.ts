/**
 * As versões das cartas, escritas à mão. Cada situação (e cada faixa de acerto)
 * tem várias versões completas, cada uma com a voz de quem escreve num dia
 * diferente: uma curta, uma que pergunta, uma que oferece um método, uma que só
 * reconhece o esforço. Dentro delas entram os blocos trocáveis do motor
 * (observações pessoais, dica, fecho, P.S.), o que dá centenas de combinações.
 *
 * TOM: siga docs/emails/TOM.md (pedido do dono, 15/10/2026, inspirado em "Como Fazer
 * Amigos e Influenciar Pessoas"). Em resumo: calor humano, elogio honesto e específico,
 * nunca criticar nem expor número ruim (abaixo de 50% nada de porcentagem: use
 * c.pctBom), sugestão em vez de ordem, dar antes de pedir, convite sem pressão.
 * Proibido: "vou ser direto/sincero", "sem rodeios", "olha só", "infelizmente",
 * "você não...", "só que", cobrança, culpa, urgência ou escassez falsas, e qualquer
 * insinuação sobre como a pessoa responde. O teste (fixtures/testar_modelos_email.mjs)
 * confere a lista de expressões proibidas em centenas de sorteios.
 *
 * Regras de escrita: frases curtas, primeira pessoa, sem clichê de marketing, sem
 * preço, sem "grátis", sem gênero presumido ("que bom ter você", nunca "bem-vindo"),
 * número só quando existe e é maior que zero, acerto só com amostra suficiente (c.pct
 * já vem null quando não dá para citar). Um link por carta, no máximo (c.link).
 */
import type { Ctx } from './cartas.ts'

/** Um pedaço de texto que pode faltar (falso, vazio ou zero some). */
export type Pedaco = string | null | undefined | false | 0

export interface Versao {
  id: string
  /** A versão só entra no sorteio se este teste passar (ex.: precisa de ranking). */
  requer?: (c: Ctx) => boolean
  /** Saudação própria (senão o motor sorteia uma). */
  saudacao?: (c: Ctx) => string
  assuntos: (c: Ctx) => Pedaco[]
  corpo: (c: Ctx) => Pedaco[]
}

const N = (n: number) => Math.round(n).toLocaleString('pt-BR')
const Q = (n: number) => (n === 1 ? '1 questão' : `${N(n)} questões`)
const D = (n: number) => (n === 1 ? '1 dia' : `${N(n)} dias`)
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
/** Junta pedaços de frase que podem faltar; devolve null se não sobrar nada. */
const J = (...partes: Pedaco[]) => {
  const t = partes.filter((x): x is string => typeof x === 'string' && x.trim() !== '').join(' ').trim()
  return t || null
}
/** Assunto com nome ("Ana, ...") ou sem ("..."). */
const nm = (c: Ctx, comNome: string, semNome: string) => (c.nome ? `${c.nome}, ${comNome}` : semNome)
/** A pessoa tem algum fato pessoal para citar (sem gastar o fato). */
const temFatos = (c: Ctx) => Object.values(c.fatos).some((v) => v !== undefined)
const semanas = (d: number) => {
  const s = Math.max(1, Math.round(d / 7))
  return s === 1 ? 'uma semana' : s === 2 ? 'duas semanas' : s === 3 ? 'três semanas' : s === 4 ? 'quatro semanas' : `${N(s)} semanas`
}
/** "faz X" para quem está parado (nunca devolve zero). */
const tempoFora = (d: number | null | undefined) => {
  const v = Math.max(1, Math.round(Number(d) || 1))
  if (v < 14) return D(v)
  if (v < 60) return semanas(v)
  return v < 120 ? 'uns dois meses' : 'alguns meses'
}

// ---------------------------------------------------------------------------
// Pessoas ativas, uma voz por faixa de acerto
// ---------------------------------------------------------------------------

const assuntosAtivo = (c: Ctx, extras: Pedaco[]): Pedaco[] => [
  nm(c, 'lembrei de você', 'Lembrei de você'),
  nm(c, 'fiquei feliz de ver o seu estudo', 'Fiquei feliz de ver o seu estudo'),
  `Sobre as suas ${Q(c.r)}`,
  nm(c, 'um recado rápido', 'Um recado rápido'),
  'Uma coisa bonita que reparei',
  c.fatos.melhorArea && `Parabéns por ${c.area(c.fatos.melhorArea.slug).em}`,
  c.fatos.ranking && `${c.fatos.ranking}º no ranking`,
  c.fatos.horario === 'noite' && nm(c, 'estudando à noite', 'Estudando à noite'),
  c.fatos.prova === 'teot' && nm(c, 'rumo ao TEOT', 'Rumo ao TEOT'),
  ...extras,
]

// Faixas abaixo de 40%: acolhimento, esperança e uma dica pequena oferecida como presente.
// Nenhuma porcentagem, nenhum "acerto baixo": o que se reconhece é o esforço e a constância.

const ativo_0_10: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'uma ideia para você', 'Uma ideia para você'), 'Um presente pequeno para o seu estudo', `Sobre as suas ${Q(c.r)}`],
    corpo: (c) => [
      `Estava olhando quem anda estudando por aqui e lembrei de você: já são ${Q(c.r)} respondidas. Fiquei feliz de ver você encarando questões de prova de verdade, que são difíceis para todo mundo.`,
      'Queria te oferecer uma ideia que ajuda muito nessa fase: escolher um tema só e fazer cinco questões com calma, lendo o comentário de cada alternativa. Parece pouco, mas é assim que a matéria começa a ficar.',
      c.obs(1),
      `Se quiser experimentar hoje, o tema fica à sua escolha aqui: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'posso te ajudar em alguma coisa?', 'Posso te ajudar em alguma coisa?'), nm(c, 'como está sendo o seu estudo?', 'Como está sendo o seu estudo?')],
    corpo: (c) => [
      'Queria saber como está sendo o seu estudo por aqui.',
      'Questão de prova de título é difícil, e todo mundo que passou começou exatamente onde você está. Às vezes um ajuste pequeno no jeito de estudar faz muita diferença, e eu gostaria de te ajudar a encontrar o seu.',
      'Se quiser, me responde contando como costuma fazer as questões e qual prova tem em mente. Eu leio tudo e respondo pessoalmente.',
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'um método simples', 'Um método simples para as questões'), 'Cinco questões com calma'],
    corpo: (c) => [
      c.obs(1) ?? `Vi que você já passou por ${Q(c.r)} no Orto Questões, e quis te escrever.`,
      'Queria te passar um jeito de estudar que costuma funcionar muito bem no começo.',
      'Escolha um tema só. Faça cinco questões com calma, lendo o enunciado inteiro. Depois de cada uma, leia o comentário de todas as alternativas. No dia seguinte, abra a Revisão antes de qualquer questão nova.',
      `Parece pouco, mas é assim que o estudo começa a render. A Revisão fica aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'todo mundo começa assim', 'Todo mundo começa assim'), 'Sobre o começo'],
    corpo: (c) => [
      'Queria te contar uma coisa: todo mundo que passou na prova de título começou achando as questões difíceis. A banca gosta de detalhe de classificação, de exceção, de nome próprio. Faz parte do caminho.',
      `E o que eu vi no seu histórico me deixou feliz: ${Q(c.r)} já respondidas. Dá para ver que você é de quem não desiste.`,
      c.dica(),
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'como o site está funcionando para você?', 'Como o site está funcionando para você?')],
    corpo: (c) => [
      'Escrevo porque gostaria de saber como o site está funcionando para você.',
      `Você já respondeu ${Q(c.r)}, e isso mostra muita vontade. Uma sugestão que costuma deixar tudo mais leve: começar pelos conceitos básicos. São questões mais diretas e ajudam a pegar o jeito das provas. Dá para escolher o tema aqui: ${c.link('treinar')}`,
      'E se alguma coisa no site estiver confusa, me conta. Respondo pessoalmente.',
    ] },
  { id: 'v6', requer: temFatos, assuntos: (c) => assuntosAtivo(c, ['Menos questões, mais comentário']),
    corpo: (c) => [
      c.obs(1),
      'Queria te dizer que estou acompanhando o seu começo com carinho. Cada questão que você faz agora está construindo a base que vai te levar até a prova.',
      'Uma ideia para a próxima sessão, se fizer sentido: fazer menos e ler mais. Dez questões com o comentário lido com calma costumam render mais do que muitas de uma vez.',
      c.fecho(),
      c.ps(),
    ] },
]

const ativo_10_20: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'uma sugestão para o seu estudo', 'Uma sugestão para o seu estudo'), 'Errar aqui é o melhor jeito de acertar lá'],
    corpo: (c) => [
      `Vi que você já tem ${Q(c.r)} no Orto Questões, e quis passar para conversar um pouco.`,
      'Cada questão que te pega aqui é um presente: mostra exatamente o que vale estudar antes da prova. Errar aqui é o melhor jeito de acertar lá.',
      `Uma sugestão, se fizer sentido para você: abrir o Caderno de erros e refazer algumas com calma. Quando uma questão que te pegou vira acerto, ela vale mais do que dez novas. Fica aqui: ${c.link('erros')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => assuntosAtivo(c, ['Questão de prova é difícil mesmo']),
    corpo: (c) => [
      `Questão de prova de ortopedia é difícil, às vezes muito. E você está encarando com coragem: ${Q(c.r)} até aqui.`,
      c.obs(1),
      'O que mais ajuda nessa fase é voltar nas questões que te pegaram até elas virarem certeza. É um ajuste pequeno, e faz muita diferença.',
      `Se der hoje, que tal só a Revisão do dia? É rápida e é onde o estudo mais rende: ${c.link('revisao')}`,
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma estratégia simples', 'Uma estratégia simples'), 'Um tema por semana'],
    corpo: (c) => [
      'Fiquei feliz de ver que você continua estudando por aqui.',
      'Pensei numa estratégia que talvez combine com você: um tema por semana. Em vez de pular de área em área, ficar alguns dias num só. A sensação de progresso aparece bem mais rápido.',
      c.dica(),
      `Dá para escolher o tema aqui: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'o que eu vejo no seu estudo', 'O que eu vejo no seu estudo')],
    corpo: (c) => [
      `Sabe o que eu vejo quando olho o seu estudo? Alguém que já respondeu ${Q(c.r)} e segue em frente. É isso que mais conta lá na frente.`,
      'Os comentários de cada alternativa foram escritos pensando justamente nessa fase. Uma ideia que ajuda: ler por que cada alternativa está certa ou errada, não só a resposta. É ali que mora a pegadinha da banca.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'topa um desafio pequeno?', 'Topa um desafio pequeno?'), 'Sete dias, dez questões'],
    corpo: (c) => [
      c.obs(1),
      'Queria te propor um desafio pequeno, se você topar: nos próximos sete dias, dez questões por dia, sempre lendo o comentário inteiro.',
      'Depois me conta como foi? Vou adorar saber.',
      c.ps(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'estou torcendo por você', 'Estou torcendo por você'), 'Um recado curto'],
    corpo: (c) => [
      'Escrevo rapidinho só para dizer que acompanho o seu estudo e estou torcendo por você.',
      'Toda base começa assim, um pouco de cada vez. E você está construindo a sua.',
      'Um truque que ajuda: antes de olhar as alternativas, tente dizer a resposta de cabeça. Treina o raciocínio de prova.',
      c.fecho(),
    ] },
]

const ativo_20_30: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'uma técnica para as alternativas', 'Uma técnica para as alternativas'), 'Descarte antes de escolher'],
    corpo: (c) => [
      `Vi que você já está com ${Q(c.r)}, e quis te mandar uma técnica que costuma ajudar muito nessa fase.`,
      'Você já reconhece os temas, e agora o que mais rende é a leitura das alternativas. Antes de escolher a certa, descarte mentalmente as que você sabe que não são. A questão fica bem mais leve.',
      'Junto com a revisão das questões que te pegaram, isso costuma fazer o estudo render mais rápido do que parece.',
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => assuntosAtivo(c, ['Uma fase, não um veredito']),
    corpo: (c) => [
      c.obs(1) ?? 'Passei para ver como estava o seu estudo, e fiquei feliz com o que vi.',
      'Queria te dizer uma coisa com carinho: o começo do estudo para prova de título é sempre assim, e é uma fase, não um veredito. Todo mundo que passou viveu isso.',
      `Uma sugestão, se fizer sentido: escolher o tema que mais te desafia e ficar só nele por uns dias. Concentrar ajuda a enxergar os padrões da banca. Dá para escolher aqui: ${c.link('treinar')}`,
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'o comentário é o melhor professor', 'O comentário é o melhor professor')],
    corpo: (c) => [
      'Uma coisa que talvez ninguém tenha te contado: o comentário da questão ensina mais justamente quando ela te pega.',
      `Você já tem ${Q(c.r)} respondidas, o que é muito material. Lendo com calma o comentário de cada alternativa nas próximas, o estudo começa a responder. Não é mágica, é repetição, e você já mostrou que tem constância para isso.`,
      c.dica(),
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'eu vi o seu esforço', 'Eu vi o seu esforço')],
    corpo: (c) => [
      `Só para dizer que eu vi o seu esforço: ${Q(c.r)} já respondidas. Isso é muita dedicação.`,
      `Que tal manter a Revisão em dia nas próximas semanas? É o que mais faz diferença nessa fase: ${c.link('revisao')}`,
      c.ps(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'agora é só calibrar', 'Agora é só calibrar'), 'Um ajuste pequeno'],
    corpo: (c) => [
      c.fatos.semana ? 'Você está estudando com constância, e essa é a parte mais difícil. Parabéns por isso.' : 'Você já criou o hábito de abrir o site, e essa é a parte mais difícil. Parabéns por isso.',
      'Agora é só calibrar: um pouco menos de questão nova e um pouco mais de revisão. A Revisão traz de volta, no momento certo, o que te pegou, e é ali que a matéria fica.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'me conta uma coisa?', 'Me conta uma coisa?')],
    corpo: () => [
      'Me conta uma coisa: quando uma questão te pega, você costuma ter tempo de ler o comentário até o fim?',
      'Pergunto porque é ali que costuma estar o maior ganho. O comentário explica cada alternativa, e a pegadinha da banca quase sempre está numa delas.',
      'Se quiser testar nas próximas dez, me diz depois se fez diferença? Fico curioso para saber.',
    ] },
]

const ativo_30_40: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, ['A base está aparecendo']),
    corpo: (c) => [
      `Vi que você já passou de ${Q(c.r)}, e queria te dar uma boa notícia: a base está aparecendo.`,
      'Nessa fase, a gente já vai bem no que estudou, e o que escapa é o que ainda não viu. É um ótimo sinal: quer dizer que o estudo está funcionando.',
      `O próximo passo, se fizer sentido, é transformar as questões que te pegaram em acertos. O Caderno de erros guarda todas elas, e vale refazer com calma: ${c.link('erros')}`,
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      'Seu estudo está a caminho de um patamar novo, e daqui para a frente cada revisão conta muito.',
      c.dica(),
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'você está na virada', 'Você está na virada')],
    corpo: (c) => [
      'Passei para dizer que está tudo certo com o seu ritmo. Gosto muito do que estou vendo.',
      'Uma comparação de que eu gosto: os primeiros acertos vêm do que você já sabia; os próximos vêm do que você aprende com as questões que te pegam. Você está bem na virada.',
      `Que tal começar pela Revisão do dia, antes das questões novas? ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'uma dica curta', 'Uma dica curta'), 'Vinte questões de um tema só'],
    corpo: (c) => [
      'Uma dica curta, de presente: escolher a área que mais te desafia e fazer vinte questões só dela nesta semana.',
      c.fato('areaFraca'),
      'Concentrar num tema por vez deixa os padrões da banca bem mais claros.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'um empurrãozinho', 'Um empurrãozinho'), 'A revisão que vale ouro'],
    corpo: (c) => [
      'Vi o seu estudo por aqui e quis te mandar um empurrãozinho.',
      `Com ${Q(c.r)}, você já tem material para a revisão que mais rende. Que tal, amanhã, abrir a Revisão do dia antes das questões novas? Leva poucos minutos.`,
      c.obs(1),
      c.ps(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'o seu estudo rende mais do que parece', 'O seu estudo rende mais do que parece')],
    corpo: (c) => [
      'Escrevo porque gosto de acompanhar quem está construindo a base, e é isso que eu vejo no seu caso.',
      'Os números costumam mostrar o que a gente aprendeu com algumas semanas de atraso. O que você está estudando agora vai aparecer lá na frente. Siga no seu ritmo.',
      c.fecho(),
    ] },
]

// Faixa média: encorajamento caloroso. A porcentagem só aparece de 50% para cima (c.pctBom).

const ativo_40_60: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, ['A fase em que mais dá para crescer']),
    corpo: (c) => [
      `Olhei o seu estudo com calma e vi ${Q(c.r)} respondidas, com uma base que já aparece.`,
      'Você está na fase em que mais dá para crescer. Já tem base para aproveitar bem os comentários, e cada questão revisada agora vira ponto na prova.',
      c.dica(),
      `A Revisão do dia fica aqui: ${c.link('revisao')}`,
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      c.pctBom !== null
        ? `Seu acerto está em ${c.pctBom}%, já passando da metade. Daqui, o que mais rende é dar uma atenção especial, por alguns dias, ao tema que mais te desafia.`
        : 'Você está bem no meio do caminho, que é onde mais dá para crescer. Daqui, o que mais rende é dar uma atenção especial, por alguns dias, ao tema que mais te desafia.',
      c.fecho(),
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma dica que pode virar o jogo', 'Uma dica que pode virar o jogo')],
    corpo: (c) => [
      'Uma dica que pode virar o jogo para você: refazer as questões que te pegaram antes de partir para as novas. Parece contraintuitivo, mas é o caminho mais curto para subir.',
      `O Caderno de erros guarda todas: ${c.link('erros')}`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'parabéns pela constância', 'Parabéns pela constância')],
    corpo: (c) => [
      `Passando para te dar parabéns pela constância. ${cap(Q(c.r))} não aparecem sozinhas.`,
      'Agora que você está no meio do caminho, os detalhes começam a fazer diferença: classificação, epônimo, exceção. É o que leva um bom estudo a um ótimo.',
      c.ps(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'qual tema mais te desafia?', 'Qual tema mais te desafia?')],
    corpo: (c) => [
      'Me conta uma coisa: qual tema está te desafiando mais?',
      'Pergunto porque, no seu momento, um tema só costuma fazer uma bela diferença. Se a gente descobrir qual, dá para crescer rápido.',
      c.fatos.areaFraca ? `Pelo que vi, ${c.area(c.fatos.areaFraca.slug).em} pode ser um bom candidato.` : null,
      'É só responder este e-mail. Vou gostar de ajudar.',
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'um hábito pequeno', 'Um hábito pequeno'), 'Do acerto com dúvida à certeza'],
    corpo: (c) => [
      'Vi que você está estudando com regularidade, e isso me deixou feliz.',
      'Queria sugerir um hábito pequeno: toda vez que acertar com dúvida, marcar a questão como favorita e voltar nela depois. Assim o acerto vira certeza e fica para a prova.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v7', assuntos: (c) => assuntosAtivo(c, ['No meio do caminho']),
    corpo: (c) => [
      `${cap(Q(c.r))} e uma base que já aparece. Sabe o que isso quer dizer? Que você tem chão firme e muito espaço para crescer, ao mesmo tempo.`,
      c.obs(1),
      'Se eu puder sugerir uma coisa para as próximas semanas: um pouco de questão nova todo dia e a Revisão em dia. Simples assim, e funciona.',
      c.fecho(),
    ] },
]

// Faixas altas: celebração genuína, admiração, convite a opinar e a contribuir.

const ativo_60_70: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'seu acerto passou dos 60%', 'Seu acerto passou dos 60%')]),
    corpo: (c) => [
      'Seu acerto passou dos 60%, e eu quis passar para te dar os parabéns. Fiquei muito feliz de ver.',
      'É o ponto em que a base já está firme e o que falta são os detalhes. Uma boa ideia agora é dar um carinho especial aos temas que ainda estão abaixo da sua média.',
      c.obs(1),
      `Para escolher o tema: ${c.link('treinar')}`,
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      `Com ${c.pct}% de acerto, você está num patamar muito bom. O próximo salto costuma vir da revisão: as questões que te pegam uma segunda vez são as mais valiosas.`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'está bonito o seu estudo', 'Está bonito o seu estudo')],
    corpo: (c) => [
      'Só para dizer: está bonito o seu estudo.',
      `${cap(Q(c.r))}, ${c.pct}% de acerto e muita constância. Dá para ver que você leva isso a sério.`,
      c.ps(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'uma dica para a sua fase', 'Uma dica para a sua fase'), 'Vale ler mesmo quando acerta'],
    corpo: (c) => [
      'Uma dica para quem já está na sua fase: ler o comentário mesmo quando acertar. Às vezes ele traz justamente o detalhe que a banca adora explorar.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', requer: (c) => !!(c.fatos.melhorArea || c.fatos.areaFraca), assuntos: (c) => assuntosAtivo(c, ['Seu desempenho por tema']),
    corpo: (c) => [
      'Fiquei olhando o seu desempenho por tema, com calma.',
      J(c.fato('melhorArea'), c.fato('areaFraca')),
      `É um retrato bem claro de onde cada hora rende mais. Os temas ficam aqui: ${c.link('dados')}`,
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'dá para ver o seu progresso', 'Dá para ver o seu progresso')],
    corpo: (c) => [
      'Escrevo porque você está naquela fase boa do estudo, em que dá para ver o progresso.',
      'Mais da metade certa, e com base firme. Agora é ir fechando os detalhes, um tema por vez.',
      c.dica(),
      c.ps(),
    ] },
]

const ativo_70_80: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'que trabalho bonito', 'Que trabalho bonito')]),
    corpo: (c) => [
      `${c.pct}% de acerto em ${Q(c.r)}. Que trabalho bonito.`,
      'Nessa fase, os pontos que faltam estão nos detalhes: o número da classificação, a exceção, o "exceto" do enunciado. Uma ideia: ler o enunciado duas vezes antes de marcar.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      'Você já tem um acerto de quem domina boa parte da matéria, e eu admiro muito isso. Manter a revisão em dia é o que segura esse número lá em cima.',
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'parabéns pelo seu desempenho', 'Parabéns pelo seu desempenho')],
    corpo: (c) => [
      'Passei para te dar parabéns pelo seu desempenho. Mais de 70% em questão de prova é resultado de muito estudo.',
      c.obs(1),
      `Daqui para a frente, o segredo é manter a revisão em dia: ${c.link('revisao')}`,
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'que tal treinar com o relógio?', 'Que tal treinar com o relógio?'), 'Uma sugestão para a sua fase'],
    corpo: (c) => [
      'Uma sugestão para quem está na sua fase: que tal começar a cronometrar?',
      'Saber a resposta é uma coisa. Saber em um minuto e meio, com o relógio correndo, é outra. Treinar com tempo deixa a prova com cara de mais uma sessão de estudo.',
      c.fecho(),
      c.ps(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'sua opinião vale muito', 'Sua opinião vale muito'), 'O que mais te ajuda no site?'],
    corpo: (c) => [
      `Você está com ${c.pct}% de acerto em ${Q(c.r)}, e isso me fez querer te ouvir.`,
      'O que mais está te ajudando no site? E o que você mudaria? Quem estuda como você é quem mais me ensina o que manter e o que melhorar.',
      'Pode responder em uma linha só. Eu leio tudo.',
    ] },
  { id: 'v6', assuntos: (c) => assuntosAtivo(c, ['Constância com qualidade']),
    corpo: (c) => [
      'Seu histórico mostra uma coisa que eu admiro muito: constância com qualidade.',
      c.obs(1),
      c.dica(),
      c.fecho(),
    ] },
]

const ativo_80_90: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'precisei olhar duas vezes', 'Precisei olhar duas vezes')]),
    corpo: (c) => [
      `${c.pct}% de acerto. Precisei olhar duas vezes, de tão bonito.`,
      'Você está acertando a maior parte do que aparece, sinal de matéria bem consolidada. Nesse nível, o que ainda dá para ganhar está nas questões que voltam a te pegar. Vale dar um carinho especial a elas.',
      `O Caderno de erros ajuda nisso: ${c.link('erros')}`,
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      `E um acerto de ${c.pct}%. Parabéns, de verdade.`,
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'proteja o que você já conquistou', 'Proteja o que você já conquistou')],
    corpo: (c) => [
      'Escrevo só para reconhecer: você está estudando num nível muito alto, e eu admiro muito isso.',
      `Uma ideia para proteger o que você já conquistou: a revisão espaçada. Matéria bem sabida também esfria se ficar parada, e a Revisão cuida disso: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'posso te pedir uma ajuda?', 'Posso te pedir uma ajuda?'), 'Um pedido para quem estuda como você'],
    corpo: (c) => [
      'Com o seu desempenho, você tem muito a ensinar, e eu queria te pedir uma ajuda.',
      'Se algum comentário do site estiver incompleto, ou se você discordar de algum gabarito, me escreve? Quem tem o seu olhar é quem mais ajuda a deixar o banco melhor para todo mundo.',
      c.obs(1),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'uma ideia: misturar as provas', 'Uma ideia: misturar as provas')],
    corpo: (c) => [
      c.obs(1) ?? `Vi as suas ${Q(c.r)}, com ${c.pct}% de acerto. Que alegria ver isso.`,
      'Uma ideia para quem está no seu nível: misturar as provas. Treinar TEOT, TARO e R4 na mesma sessão obriga a reconhecer o tema sem a pista do contexto, como no dia da prova.',
      `Dá para montar assim: ${c.link('treinar')}`,
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'só passei para dizer que vi', 'Só passei para dizer que vi')],
    corpo: (c) => [
      `${c.pct}% de acerto em ${Q(c.r)}. Só passei para dizer que vi, e que está lindo.`,
      c.ps(),
    ] },
]

const ativo_90_100: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'como você estuda?', 'Como você estuda?'), 'Fiquei curioso'],
    corpo: (c) => [
      `Olhei os números duas vezes para ter certeza: ${c.pct}% de acerto em ${Q(c.r)}.`,
      'É um desempenho excepcional. Fiquei curioso: como você estuda? Se puder me contar, responde este e-mail. Queria muito entender o que está funcionando tão bem.',
    ] },
  { id: 'v2', assuntos: (c) => assuntosAtivo(c, ['Você está acertando quase tudo']),
    corpo: (c) => [
      'Você está acertando quase tudo, e eu fiquei muito feliz de ver.',
      c.obs(1),
      `Nesse nível, o único cuidado é não deixar a matéria esfriar. A Revisão do dia segura isso em poucos minutos: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'parabéns, de verdade', 'Parabéns, de verdade'), 'Alguém reparou'],
    corpo: (c) => [
      'Parabéns, de verdade.',
      'Acima de 90% em questão de prova de título é resultado de muito trabalho, e eu quis que você soubesse que alguém reparou.',
      c.ps(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'posso te pedir uma ajuda?', 'Posso te pedir uma ajuda?'), 'Me ajuda a deixar o banco melhor?'],
    corpo: (c) => [
      'Queria te pedir uma ajuda: se encontrar algum erro, comentário fraco ou gabarito discutível, me avisa?',
      `Com ${c.pct}% de acerto, você enxerga detalhes que fazem diferença para todo mundo que estuda aqui.`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => assuntosAtivo(c, ['Uma sugestão para quem está no topo']),
    corpo: (c) => [
      c.obs(1) ?? 'Acompanho o seu estudo com admiração, e queria deixar uma sugestão.',
      c.p.assinante
        ? 'Para quem já está no topo, o próximo degrau são as questões que a turma mais erra. Treinar por elas mostra o pouco que ainda escapa.'
        : 'Para quem já está no topo, o próximo degrau são os temas que você menos estudou. É ali que ainda pode haver alguma surpresa.',
      c.fecho(),
    ] },
  { id: 'v6', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      'Não tenho nada a sugerir, só a agradecer pelo exemplo. Continue assim.',
    ] },
]

// ---------------------------------------------------------------------------
// Situações
// ---------------------------------------------------------------------------

const quandoConta = (c: Ctx) => {
  const d = Math.max(0, Math.round(Number(c.p.diasConta) || 0))
  return c.quando(d)
}

const nunca_comecou: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'o próximo passo é pequeno', 'O próximo passo é pequeno'), 'Sobre a sua conta no Orto Questões', nm(c, 'uma questão só', 'Uma questão só')],
    corpo: (c) => [
      `Vi que você criou a sua conta no Orto Questões ${quandoConta(c)}, e fiquei muito feliz. Obrigado pela confiança.`,
      `Se quiser um primeiro passo bem leve: responder uma questão só. Uma. Ler o comentário de cada alternativa e ver se o jeito do site combina com você: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'que bom ter você por aqui', 'Que bom ter você por aqui'), 'Um oi de quem cuida do site'],
    corpo: () => [
      'Passei para dar um oi. Sou eu que cuido do site, e gosto de escrever para quem acabou de chegar.',
      'Quando tiver dez minutos livres, que tal cinco questões de um tema de que você goste? É o bastante para pegar o jeito.',
      'E se travar em qualquer coisa, me responde aqui. Vou gostar de ajudar.',
    ] },
  { id: 'v3', requer: (c) => !!(c.fatos.prova || c.fatos.etapa), assuntos: (c) => [nm(c, 'por onde começar', 'Por onde começar'), c.fatos.prova === 'teot' && 'Começando para o TEOT'],
    corpo: (c) => [
      J(c.fato('prova'), c.fato('etapa')),
      `O jeito mais gostoso de começar é pelo tema de que você mais gosta. Começar pelo que dá prazer ajuda a criar o hábito; o resto vem depois. Fica aqui: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'só três questões', 'Só três questões'), 'Sua conta está pronta'],
    corpo: (c) => [
      'Sua conta está pronta, esperando por você.',
      'Uma ideia: no próximo intervalo do plantão, abrir o site no celular e responder três questões. Só três, para sentir como é.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'uma coisa sobre as questões daqui', 'Uma coisa sobre as questões daqui')],
    corpo: (c) => [
      'Uma curiosidade sobre o site: cada questão tem a explicação de todas as alternativas, não só da certa. É ali que mais se aprende, e é a parte em que eu mais caprichei.',
      `Que tal ver como funciona com uma questão só? ${c.link('treinar')}`,
      c.ps(),
    ] },
  { id: 'v6', requer: (c) => (c.p.diasConta ?? 0) > 3, assuntos: (c) => [nm(c, 'sem pressa', 'Sem pressa'), 'Quando a rotina der folga'],
    corpo: (c) => [
      'Imagino que a rotina esteja puxada desde que você criou a conta. Plantão, aula, vida.',
      'Sem pressa nenhuma. Quando der, um começo pequeno já basta: um tema, cinco questões, sem se preocupar com nada. O site guarda tudo, e a Revisão cuida do resto.',
      c.fecho(),
    ] },
]

const boas_vindas: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'que bom começo', 'Que bom começo'), 'Três coisas para os primeiros dias'],
    corpo: (c) => [
      `Vi que você chegou ao Orto Questões há pouco e já respondeu ${Q(c.r)}. Que bom começo.`,
      'Três coisas que ajudam nos primeiros dias, de presente: ler o comentário mesmo quando acertar, deixar a Revisão trazer de volta as questões que te pegaram e não se preocupar com números agora.',
      'Qualquer dúvida, é só responder este e-mail. Vou gostar de ajudar.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'que bom ter você por aqui', 'Que bom ter você por aqui')],
    corpo: (c) => [
      'Que bom ter você por aqui. Sou eu que cuido do site, e gosto de escrever para quem está chegando.',
      J(c.obs(1, ['prova', 'etapa'])),
      `As suas primeiras ${Q(c.r)} já estão salvas, e as que te pegaram vão voltar na Revisão no momento certo: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'um conselho de quem fez o site', 'Um conselho de quem fez o site')],
    corpo: (c) => [
      'Um conselho de quem fez o site, se servir: pouco e todo dia rende mais do que muito de vez em quando.',
      `Você já começou, com ${Q(c.r)}. Se conseguir manter umas dez por dia, em um mês o hábito está criado e o seu estudo começa a contar uma história bonita.`,
      c.ps(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'vi a sua chegada', 'Vi a sua chegada')],
    corpo: (c) => [
      'Escrevo para dizer que vi a sua chegada, e que fico feliz de ter mais alguém estudando ortopedia com tanta vontade por aqui.',
      J(c.fato('prova'), c.fato('etapa')),
      'Se encontrar qualquer coisa estranha numa questão ou tiver uma ideia, me conta. O site melhora muito com isso.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'o melhor do site', 'O melhor do site'), 'Uma dica para a primeira semana'],
    corpo: (c) => [
      `${cap(Q(c.r))} em poucos dias. Que bom começo.`,
      'Uma dica para a primeira semana: quando uma questão te pegar, ler por que cada alternativa está certa ou errada. É o que o site tem de melhor.',
      c.fecho(),
    ] },
  { id: 'v6', requer: temFatos, assuntos: (c) => [nm(c, 'reparei no seu começo', 'Reparei no seu começo')],
    corpo: (c) => [
      J('Reparei no seu começo por aqui, e fiquei feliz.', c.obs(1, ['horario', 'prova', 'etapa'])),
      `${cap(Q(c.r))} em poucos dias já mostram muita vontade. O próximo passo é deixar a Revisão trabalhar por você: ela traz de volta, no momento certo, as questões que te pegaram.`,
      c.fecho(),
    ] },
]

const comecando: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'o começo é a parte mais difícil', 'O começo é a parte mais difícil'), `Suas primeiras ${Q(c.r)}`],
    corpo: (c) => [
      `Vi que você já respondeu ${Q(c.r)}. O começo é a parte mais difícil, e você está atravessando com vontade.`,
      'O que mais ajuda agora é constância: um pouco todo dia, mesmo nos dias corridos. O resto vem quase sem perceber.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'vi o seu começo', 'Vi o seu começo')],
    corpo: (c) => [
      c.obs(1, ['prova', 'etapa', 'horario']) ?? 'Passei para ver como estava o seu começo por aqui, e gostei do que vi.',
      `Você já tem ${Q(c.r)} respondidas. Quando chegar às trinta, o site já consegue te mostrar os temas em que você mais brilha.`,
      c.dica(),
      `Para seguir: ${c.link('treinar')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'cinco por dia', 'Cinco por dia')],
    corpo: (c) => [
      'Uma ideia simples, se combinar com você: cinco questões por dia.',
      `Parece pouco, mas em um mês são mais de cem. E com as ${Q(c.r)} que você já fez, o caminho está aberto.`,
      c.ps(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'como está sendo?', 'Como está sendo?')],
    corpo: (c) => [
      `Você já fez ${Q(c.r)} por aqui, e eu queria saber: como está sendo?`,
      'Os comentários estão ajudando? Alguma coisa ficou confusa no site? Pode responder do jeito que quiser. Eu leio tudo.',
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'a Revisão vai trabalhar por você', 'A Revisão vai trabalhar por você')],
    corpo: (c) => [
      'Uma coisa de que talvez ninguém tenha te falado: as questões que te pegam voltam sozinhas na Revisão, no momento certo para fixar.',
      `Vale abrir de vez em quando, antes das questões novas: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v6', requer: temFatos, assuntos: (c) => [nm(c, 'uma coisa que reparei', 'Uma coisa que reparei')],
    corpo: (c) => [
      c.obs(1, ['horario', 'prova', 'etapa', 'maisEstudada']),
      `E vi que você já está com ${Q(c.r)}. Quando passar das trinta, dá para enxergar com mais clareza os temas em que você mais brilha.`,
      `Até lá, o melhor é seguir no seu ritmo: ${c.link('treinar')}`,
    ] },
]

const comecou_parou: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'tudo o que você fez continua salvo', 'Tudo o que você fez continua salvo'), 'Sobre o seu começo'],
    corpo: (c) => [
      `Lembrei de você: o seu começo no Orto Questões, com ${Q(c.r)}, me deixou feliz. Sei como a rotina aperta, e acontece com todo mundo: o mais difícil é transformar o começo em hábito.`,
      'O que mais funciona é pouco e todo dia. Cinco questões por dia e, quando você vê, já passou de cem. Tudo o que você fez continua salvo, e as questões que te pegaram voltam na Revisão no momento certo.',
      `Que tal fazer as próximas hoje, se der? ${c.link('treinar')}`,
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'posso ajudar em alguma coisa?', 'Posso ajudar em alguma coisa?')],
    corpo: (c) => [
      `Você começou com ${Q(c.r)}, e depois imagino que a rotina tenha apertado. Fiquei pensando se alguma coisa no site ficou confusa.`,
      'Se foi isso, me conta respondendo este e-mail, que eu ajudo. Se foi só a rotina, tudo bem também: o site fica aqui, do jeito que você deixou.',
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'recomeçar é mais fácil do que parece', 'Recomeçar é mais fácil do que parece')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua última questão, e lembrei de você.`,
      `Recomeçar é mais fácil do que parece: abrir a Revisão, fazer as que estão esperando e pronto. Em dez minutos você está de volta: ${c.link('revisao')}`,
      c.obs(1, ['prova', 'etapa']),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'o começo é sempre assim', 'O começo é sempre assim')],
    corpo: (c) => [
      'O começo é sempre assim: alguns dias de empolgação, depois a vida aperta. Acontece com todo mundo.',
      `As suas ${Q(c.r)} estão guardadas. Quando der, que tal voltar com cinco, de um tema de que você goste?`,
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'uma ideia para voltar com leveza', 'Uma ideia para voltar com leveza')],
    corpo: (c) => [
      'Uma ideia para voltar com leveza: no horário em que você costuma estar no celular, trocar cinco minutos de rede social por três questões.',
      `Parece bobo, mas é assim que o hábito pega. Suas ${Q(c.r)} já estão lá, esperando a próxima.`,
      c.ps(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'o site fica aqui por você', 'O site fica aqui por você')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua última questão, e escrevo só para dizer que lembrei de você.`,
      `Se alguma coisa no site não funcionou bem para você, me conta? Isso me ajuda muito. E se foi só a rotina, as suas ${Q(c.r)} estão esperando, sem pressa.`,
      c.fecho(),
    ] },
]

const pausa: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'lembrei de você', 'Lembrei de você'), 'Uma sessão curta, se der'],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua última sessão, e lembrei de você.`,
      'Uma sessão curta costuma valer mais do que uma maratona no fim de semana. Dez questões já mantêm o hábito vivo, e a Revisão já separou as que pedem uma segunda olhada.',
      `Fica aqui o atalho, se quiser: ${c.link('revisao')}`,
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'uma sessão curta hoje?', 'Uma sessão curta hoje?')],
    corpo: (c) => [
      'Só um oi rápido: faz alguns dias desde a sua última sessão, e senti falta de você por aqui.',
      `Que tal quinze minutos hoje, se a rotina deixar? As suas ${Q(c.r)} estão salvas, é só continuar de onde parou: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'a Revisão está pronta', 'A Revisão está pronta')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua última sessão, e a Revisão já separou as questões que pedem uma segunda olhada, para voltar no momento certo.`,
      `É o jeito mais leve de retomar: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'dez questões hoje?', 'Dez questões hoje?')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua última questão, e passei para te mandar um empurrãozinho gentil.`,
      `Dez questões já bastam para retomar o ritmo. Que tal começar pelas que a Revisão separou? ${c.link('revisao')}`,
      c.fecho(),
    ] },
]

const sumiu: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'senti sua falta por aqui', 'Senti sua falta por aqui')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a última vez que te vi por aqui, e senti sua falta. Sei como a rotina aperta, e está tudo bem: as suas ${Q(c.r)} e a sua Revisão continuam guardadas.`,
      `Para retomar com leveza, que tal abrir a Revisão e fazer só as que estão esperando? Em quinze minutos você está de volta ao ritmo: ${c.link('revisao')}`,
      'Estou torcendo por você.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'seu progresso está guardado', 'Seu progresso está guardado')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} que não te vejo por aqui, e passei só para dizer que o seu progresso está todo guardado.`,
      c.pctBom !== null ? `${cap(Q(c.r))}, ${c.pctBom}% de acerto e um caderno de erros esperando por você. Nada disso se perde.` : `${cap(Q(c.r))} respondidas e um caderno de erros esperando por você. Nada disso se perde.`,
      'Quando a rotina der uma folga, uma sessão curta já retoma o embalo.',
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'plantão, cansaço, vida', 'Plantão, cansaço, vida')],
    corpo: (c) => [
      'Plantão, cansaço, vida: acontece com todo mundo. O que leva alguém até a aprovação é voltar, não ser perfeito.',
      `Que tal recomeçar pequeno? Dez questões hoje, dez amanhã. O hábito volta mais rápido do que parece: ${c.link('treinar')}`,
      c.obs(1, ['prova', 'melhorArea']),
    ] },
  { id: 'v4', requer: (c) => !!c.fatos.melhorArea || !!c.fatos.maisEstudada, assuntos: (c) => [nm(c, 'lembrei de você', 'Lembrei de você')],
    corpo: (c) => [
      'Lembrei de você olhando quem estudava por aqui.',
      c.obs(1, ['melhorArea', 'maisEstudada']),
      'Esse trabalho bonito continua todo aqui, esperando por você. Quando der, uma sessão curta já retoma o embalo.',
      c.fecho(),
    ] },
  { id: 'v5', requer: (c) => c.fatos.prova === 'teot' || c.fatos.etapa === 'r3', assuntos: (c) => [nm(c, 'o TEOT está chegando', 'O TEOT está chegando')],
    corpo: (c) => [
      `Faltam ${D(c.diasTeot)} para o TEOT, e lembrei de você.`,
      `Ainda dá tempo de fazer muita coisa, e as suas ${Q(c.r)} já são um ótimo começo. Quando quiser retomar, a Revisão está aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'o site está do jeito que você deixou', 'O site está do jeito que você deixou'), 'Um recado curto'],
    corpo: (c) => [
      'Só um recado curto, com carinho: quando quiser voltar, o site está do jeito que você deixou.',
      `Suas ${Q(c.r)} e as questões para revisar continuam lá, esperando por você.`,
      c.ps(),
    ] },
]

const obrigado_assinatura: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'obrigado pela assinatura', 'Obrigado pela assinatura'), 'Obrigado, de verdade'],
    corpo: () => [
      'Vi que você assinou o Orto Questões e quis te escrever pessoalmente para agradecer.',
      'O site é um projeto independente. É a assinatura que paga o servidor e o tempo para manter as questões e os comentários em dia. Então, de coração: obrigado.',
      'Se alguma coisa não funcionar, ou se sentir falta de algo, me responde aqui. Eu leio tudo.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'obrigado pela confiança', 'Obrigado pela confiança'), 'Uma dica para começar a assinatura'],
    corpo: (c) => [
      'Obrigado pela confiança. Fiquei muito feliz.',
      `Uma dica para a assinatura render desde o primeiro dia: montar o cronograma com a data da sua prova. Ele organiza o que estudar em cada dia, começando pelo que mais cai: ${c.link('cronograma')}`,
      'E qualquer dúvida, é só responder.',
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'fiquei muito feliz', 'Fiquei muito feliz')],
    corpo: (c) => [
      'Fiquei muito feliz de ver a sua assinatura.',
      c.r > 0 ? `Você já tem ${Q(c.r)} por aqui${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ''}, e agora tem tudo liberado para ir até a prova.` : 'Agora você tem tudo liberado para ir até a prova.',
      'Meu compromisso é continuar melhorando as questões e os comentários. Se encontrar qualquer coisa estranha, me avisa?',
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'um obrigado de coração', 'Um obrigado de coração')],
    corpo: (c) => [
      'Um obrigado curto, mas de coração, pela assinatura.',
      'Ela mantém o site de pé para você e para todo mundo que estuda aqui. Fico muito feliz de ter você junto.',
      c.ps(),
    ] },
  { id: 'v5', requer: temFatos, assuntos: (c) => [nm(c, 'obrigado, e uma coisa que reparei', 'Obrigado, e uma coisa que reparei')],
    corpo: (c) => [
      'Obrigado por assinar o Orto Questões.',
      c.obs(2),
      'Se quiser aproveitar desde já, o Simulado Nacional do mês e os temas que mais caem são um ótimo começo. Mas, antes de tudo, obrigado.',
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'quem assina mantém o site', 'Quem assina mantém o site')],
    corpo: () => [
      'Escrevo para agradecer a sua assinatura.',
      'Não tem empresa grande por trás do Orto Questões. Tem eu, as questões, os comentários e quem assina. Agora você faz parte disso, e isso me deixa muito feliz.',
      'Se tiver ideia, crítica ou sugestão, a resposta deste e-mail chega direto para mim.',
    ] },
]

// ---------------------------------------------------------------------------
// Convites para assinar (só benefício real, sem preço, sem pressão; dar antes de pedir)
// ---------------------------------------------------------------------------

const lista = (itens: string[]) => itens.map((t) => `- ${cap(t)}`).join('\n')
/** "a, b e c". */
const eLista = (itens: string[]) => (itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`)
/** Dar antes de pedir: uma dica útil, oferecida antes do convite. */
const presente = (c: Ctx) => `Antes de tudo, uma dica de presente. ${c.dica()}`
const garantia = 'E se não for o que você esperava, dá para pedir o reembolso em até 7 dias pelo próprio site, sem precisar explicar nada.'

const convite_20: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'uma dica e um convite', 'Uma dica e um convite'), nm(c, 'uma coisa que pode te ajudar', 'Uma coisa que pode te ajudar')],
    corpo: (c) => [
      `Vi que você já respondeu ${Q(c.r)} no Orto Questões, e fiquei feliz de ver você por aqui.`,
      presente(c),
      `E, caso seja útil para a sua preparação, queria te contar o que a assinatura libera:\n${lista(c.beneficios(3))}`,
      `Se fizer sentido para o seu momento, os planos estão aqui: ${c.link('assinatura')}`,
      'Se não for a hora, tudo bem também. Fico feliz de te ver estudando do jeito que for.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'já conhece o cronograma?', 'Já conhece o cronograma?')],
    corpo: (c) => [
      'Uma pergunta: você já conhece o cronograma do site?',
      'Você coloca a data da prova e ele monta a lista de cada dia, começando pelo que mais cai. Se um plantão bagunçar a semana, ele se ajusta. Foi pensado para quem tem pouco tempo e um sonho grande.',
      `Faz parte da assinatura, junto com ${eLista(c.beneficios(3, true).filter((b) => !b.startsWith('o cronograma')).slice(0, 2))}. Dá para ver uma prévia do seu antes de decidir qualquer coisa: ${c.link('cronograma')}`,
      c.fecho(),
    ] },
  { id: 'v3', requer: temFatos, assuntos: (c) => [nm(c, 'vi o seu começo', 'Vi o seu começo'), 'Uma sugestão para o seu estudo'],
    corpo: (c) => [
      J(`Vi as suas ${Q(c.r)}, e quis te escrever.`, c.obs(1)),
      `Pelo jeito que você estuda, acho que a assinatura combinaria com você. Ela soma:\n${lista(c.beneficios(3))}`,
      `${garantia} Os planos ficam aqui, se quiser olhar: ${c.link('assinatura')}`,
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'três coisas que podem te ajudar', 'Três coisas que podem te ajudar'), 'Para chegar à prova com mais tranquilidade'],
    corpo: (c) => [
      'Sei que o seu tempo é precioso, então vou deixar esta carta curta.',
      `Você já fez ${Q(c.r)}, então já conhece o jeito do site. Se a sua meta é chegar à prova com mais tranquilidade, a assinatura soma três coisas que ajudam muito:\n${lista(c.beneficios(3))}`,
      `Se quiser olhar com calma: ${c.link('assinatura')}`,
      'Qualquer dúvida, me responde. Vou gostar de ajudar.',
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'quem assina mantém o site de pé', 'Quem assina mantém o site de pé')],
    corpo: (c) => [
      'Uma curiosidade sobre o Orto Questões: é um projeto independente, e quem assina é quem mantém o site de pé.',
      `Além de apoiar, a assinatura libera ${eLista(c.beneficios(3, true))}.`,
      `${garantia} Se quiser conhecer: ${c.link('assinatura')}`,
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'se fizer sentido para você', 'Se fizer sentido para você')],
    corpo: (c) => [
      `${cap(Q(c.r))} já dão uma boa ideia de se o site combina com o seu jeito de estudar.`,
      `Se combinar, a assinatura leva isso adiante, na direção da sua prova:\n${lista(c.beneficios(3))}`,
      `Os planos estão aqui, se quiser olhar: ${c.link('assinatura')}`,
      c.fecho(),
    ] },
  { id: 'v7', requer: (c) => (c.p.viuPlanos ?? 0) > 0, assuntos: (c) => [nm(c, 'sobre os planos', 'Sobre os planos'), nm(c, 'alguma dúvida sobre os planos?', 'Alguma dúvida sobre os planos?')],
    corpo: (c) => [
      `Vi que você deu uma olhada nos planos, e quis escrever para ajudar no que for preciso.`,
      'Se ficou alguma dúvida, me responde que eu explico. Às vezes é coisa simples, como a forma de pagamento ou o que acontece se o site não for o que você esperava.',
      `Resumindo o que a assinatura soma:\n${lista(c.beneficios(3))}`,
      garantia,
    ] },
]

/** Uma frase sobre o acerto, no tom da faixa. Abaixo de 50%, nenhum número: só esforço e caminho. */
const tomAcerto = (c: Ctx): string | null => {
  if (c.pct === null) return null
  const p = c.pct
  if (p >= 80) return c.um(`E com ${p}% de acerto, o que é admirável.`, `${p}% de acerto, aliás. Parabéns, de verdade.`)
  if (p >= 70) return c.um(`E com ${p}% de acerto, um resultado muito bonito.`, `Com ${p}% de acerto, você já está num patamar muito bom.`)
  if (p >= 60) return c.um(`E com ${p}% de acerto, uma base firme.`, `Seu acerto de ${p}% mostra uma base firme.`)
  if (p >= 50) return c.um(`Seu acerto de ${p}% já passa da metade, e é exatamente a fase em que mais dá para crescer.`, 'Você está no meio do caminho, que é onde mais dá para crescer.')
  if (p >= 40) return 'Você está no meio do caminho, que é onde mais dá para crescer.'
  return c.um('Dá para ver que você é de quem não desiste, e é isso que mais conta numa preparação longa.', 'Você está construindo a sua base com constância, e é nessa fase que um bom plano mais ajuda.')
}

const convite_50: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'escrevi para você', 'Escrevi para você'), nm(c, 'um convite pessoal', 'Um convite pessoal')],
    corpo: (c) => [
      J(`Estava olhando quem mais tem estudado por aqui e parei no seu nome: ${Q(c.r)}.`, c.obs(2)),
      tomAcerto(c),
      `Por isso quis te escrever pessoalmente. Acho que você está num ponto em que a assinatura pode fazer diferença de verdade no seu caminho até a prova, principalmente ${c.beneficios(1, true)[0]}.`,
      `Se quiser dar uma olhada: ${c.link('assinatura')}. E se tiver qualquer dúvida, me responde aqui, que eu mesmo respondo.`,
    ] },
  { id: 'v2', requer: (c) => !!c.fatos.ranking, assuntos: (c) => [`${c.fatos.ranking}º no ranking`, nm(c, 'uma das pessoas que mais estudam aqui', 'Uma das pessoas que mais estudam aqui')],
    corpo: (c) => [
      `Você está em ${c.fatos.ranking}º no ranking geral, ou seja, entre as pessoas que mais estudam no Orto Questões. Quis que você soubesse que eu vi, e que fiquei feliz.`,
      J(c.obs(1, ['melhorArea', 'horario', 'prova']), tomAcerto(c)),
      `Para quem estuda com essa dedicação, acho que a assinatura faz sentido: ${eLista(c.beneficios(3, true))}. ${garantia}`,
      `Os planos ficam aqui, se quiser olhar: ${c.link('assinatura')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma conversa sobre o seu estudo', 'Uma conversa sobre o seu estudo')],
    corpo: (c) => [
      `A ideia do Orto Questões é ser o lugar onde se estuda pelas provas reais, com cada alternativa explicada. Ver alguém com ${Q(c.r)} me deixa feliz: quer dizer que a ideia está funcionando.`,
      J(c.obs(1), tomAcerto(c)),
      presente(c),
      `Se você quiser ir além, a assinatura soma:\n${lista(c.beneficios(3))}`,
      `Sem pressão nenhuma. Se fizer sentido: ${c.link('assinatura')}`,
      c.fecho(),
    ] },
  { id: 'v4', requer: (c) => c.fatos.prova === 'teot' || c.fatos.etapa === 'r3', assuntos: (c) => [nm(c, 'faltam alguns meses para o TEOT', 'Faltam alguns meses para o TEOT'), nm(c, 'um plano até o TEOT', 'Um plano até o TEOT')],
    corpo: (c) => [
      `Vi que você está estudando para o TEOT. Faltam ${D(c.diasTeot)}, e eu fico na torcida.`,
      J(`Com ${Q(c.r)} feitas, o que mais pode te ajudar agora é ter um plano até lá.`, tomAcerto(c)),
      `O cronograma da assinatura faz isso: você diz a data e ele monta a lista de cada dia, começando pelo que mais cai, e se ajusta quando a semana aperta. Dá para ver uma prévia do seu: ${c.link('cronograma')}`,
      garantia,
    ] },
  { id: 'v5', requer: (c) => !!c.fatos.areaFraca, assuntos: (c) => [nm(c, 'uma ideia para o tema que mais te desafia', 'Uma ideia para o tema que mais te desafia')],
    corpo: (c) => [
      `Olhei as suas ${Q(c.r)} com calma, e quis te escrever.`,
      J(c.fato('melhorArea'), c.fato('areaFraca')),
      'Na assinatura, dá para ver os temas que mais caem em cada área e como a turma respondeu cada alternativa. Ajuda muito a saber onde vale insistir, e mostra que muita gente tropeça nas mesmas questões.',
      `Se quiser conhecer: ${c.link('assinatura')}`,
      c.fecho(),
    ] },
  { id: 'v6', requer: (c) => !!c.fatos.flashcards && !!c.p.limiteGratisLigado, assuntos: (c) => [nm(c, 'questões e flashcards sem limite', 'Questões e flashcards sem limite')],
    corpo: (c) => [
      `Vi que você usa as questões e os flashcards: ${Q(c.r)} e ${N(c.fatos.flashcards!)} cartas até agora. Que dedicação.`,
      tomAcerto(c),
      `Com esse ritmo bonito, imagino que o limite diário às vezes atrapalhe. Na assinatura, questões e flashcards ficam sem limite, e ainda entram ${eLista(c.beneficios(3, true).filter((b) => !b.includes('sem limite')).slice(0, 2))}.`,
      `${garantia} Os planos ficam aqui, se quiser olhar: ${c.link('assinatura')}`,
    ] },
  { id: 'v7', requer: temFatos, assuntos: (c) => [nm(c, 'um convite, com carinho', 'Um convite, com carinho')],
    corpo: (c) => [
      J('Queria te fazer um convite, e não é pelo número de questões: é pelo jeito que você estuda.', c.obs(2)),
      presente(c),
      `A assinatura foi pensada para quem estuda assim:\n${lista(c.beneficios(3))}`,
      `${garantia} Se quiser conhecer: ${c.link('assinatura')}`,
    ] },
]

// ---------------------------------------------------------------------------
// Outras cartas pessoais
// ---------------------------------------------------------------------------

const teotOuProva = (c: Ctx) => c.fatos.prova === 'teot' || (!c.fatos.prova && (c.fatos.etapa === 'r3' || c.fatos.etapa === 'r4'))

const reta_final: Versao[] = [
  { id: 'v1', requer: teotOuProva, assuntos: (c) => [`Faltam ${D(c.diasTeot)} para o TEOT`, nm(c, 'reta final', 'Reta final')],
    corpo: (c) => [
      `Faltam ${D(c.diasTeot)} para o TEOT, em 10 de janeiro, e lembrei de você.`,
      c.r > 0 ? `Ainda dá tempo de fazer muita coisa, e você já tem ${Q(c.r)} no caminho.` : 'Ainda dá tempo de fazer muita coisa.',
      `Se ajudar, nesta fase eu priorizaria duas coisas: revisar as questões que te pegaram e treinar os temas que mais caem. A Revisão fica aqui: ${c.link('revisao')}`,
      'Conte comigo nessa reta final.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'o que eu faria agora', 'O que eu faria agora'), 'A prova está chegando'],
    corpo: (c) => [
      teotOuProva(c) ? `O TEOT está a ${D(c.diasTeot)}, e estou na torcida.` : 'A prova está chegando, e estou na torcida.',
      'Se ajudar, eu faria assim no seu lugar: questões novas pela manhã, Revisão à noite e um simulado por semana para treinar o tempo.',
      c.obs(1, ['areaFraca', 'melhorArea']),
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'menos conteúdo novo, mais revisão', 'Menos conteúdo novo, mais revisão')],
    corpo: (c) => [
      'Na reta final, o instinto é correr atrás de tudo o que falta. Mas o que mais rende é proteger o que você já sabe.',
      `${c.r > 0 ? `Com ${Q(c.r)} feitas, você` : 'Você'} já tem material para isso. O Caderno de erros é um ótimo lugar para começar: ${c.link('erros')}`,
      c.fecho(),
    ] },
  { id: 'v4', requer: (c) => !!c.fatos.areaFraca, assuntos: (c) => [nm(c, 'um tema para a reta final', 'Um tema para a reta final')],
    corpo: (c) => [
      teotOuProva(c) ? `Faltam ${D(c.diasTeot)} para o TEOT, e olhei os seus temas com carinho.` : 'A prova está chegando, e olhei os seus temas com carinho.',
      c.fato('areaFraca'),
      `Na reta final, dar atenção a um tema assim costuma render mais do que polir um que já está forte: ${c.link('treinar')}`,
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'cuida de você também', 'Cuida de você também')],
    corpo: (c) => [
      'Um lembrete que ninguém costuma dar na reta final: dormir também é estudar.',
      `A memória se consolida no sono. Então, nestas últimas semanas, vale preferir menos horas bem dormidas a madrugadas de questão.${c.fatos.horario === 'madrugada' ? ' Digo isso com carinho, porque vi que você anda estudando de madrugada.' : ''}`,
      'Você já fez muito. Agora é chegar com a cabeça descansada.',
      c.fecho(),
    ] },
  { id: 'v6', requer: (c) => !!c.fatos.melhorArea, assuntos: (c) => [nm(c, 'proteja o seu ponto forte', 'Proteja o seu ponto forte')],
    corpo: (c) => [
      teotOuProva(c) ? `Faltam ${D(c.diasTeot)} para o TEOT.` : 'A prova está chegando.',
      c.fato('melhorArea'),
      `Na reta final, vale manter esse tema aquecido com a Revisão e usar o tempo novo nos outros. Assim você chega sem perder nada do que já conquistou: ${c.link('revisao')}`,
      c.fecho(),
    ] },
]

const nomeMarco = (m: number) => ({ 50: 'cinquenta', 100: 'cem', 250: 'duzentas e cinquenta', 500: 'quinhentas', 1000: 'mil', 2000: 'duas mil', 3000: 'três mil', 4000: 'quatro mil' } as Record<number, string>)[m] ?? N(m)
const marco: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, `você passou das ${N(c.marco!)} questões`, `Você passou das ${N(c.marco!)} questões`), `${cap(nomeMarco(c.marco!))} questões`],
    corpo: (c) => [
      `${cap(nomeMarco(c.marco!))} questões! Passei para te dar parabéns.`,
      c.marco! <= 100
        ? 'As primeiras cem são as mais difíceis, porque é quando o hábito ainda está nascendo. Daqui para a frente, o site começa a mostrar onde você está forte e onde vale insistir.'
        : c.marco! <= 500
          ? 'Isso já não é teste, é constância. A essa altura, o maior ganho costuma estar no tema que mais te desafia: com calma, ele cresce rápido.'
          : 'Poucas pessoas chegam aqui. Você já viu boa parte do que as bancas gostam de perguntar, e daqui em diante o que leva uma boa nota a uma ótima é a revisão.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, `${N(c.marco!)} questões`, `${N(c.marco!)} questões respondidas`)],
    corpo: (c) => [
      `Vi que você acabou de passar das ${N(c.marco!)} questões no Orto Questões, e fiquei muito feliz.`,
      c.pctBom !== null ? `E com ${c.pctBom}% de acerto. Cada uma dessas questões é um tema a mais que você viu antes da prova.` : 'Cada uma delas é um tema a mais que você viu antes da prova.',
      `Para comemorar do jeito certo, que tal uma passada na Revisão? ${c.link('revisao')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'um marco bonito', 'Um marco bonito')],
    corpo: (c) => [
      `${cap(N(c.marco!))} questões. Não acontece por acaso: é a soma de muitos dias em que você escolheu estudar, mesmo com sono.`,
      c.obs(2),
      'Parabéns, de verdade.',
    ] },
  { id: 'v4', requer: (c) => c.marco! >= 500, assuntos: (c) => [nm(c, 'isso é constância', 'Isso é constância')],
    corpo: (c) => [
      `Quando alguém passa das ${N(c.marco!)} questões, eu faço questão de escrever.`,
      J('Isso é constância, e eu admiro muito.', c.obs(1), c.pctBom !== null ? `${c.pctBom}% de acerto, aliás.` : null),
      'Uma sugestão para a próxima etapa: reler os comentários das questões que te pegaram mais de uma vez. É onde estão os pontos que ainda escapam.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'parabéns pelas suas questões', 'Parabéns pelas suas questões')],
    corpo: (c) => [
      `Só um recado rápido: parabéns pelas ${N(c.marco!)} questões. Fiquei muito feliz de ver.`,
      c.ps(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, `${N(c.marco!)} questões, e contando`, `${N(c.marco!)} questões, e contando`)],
    corpo: (c) => [
      `Você passou das ${N(c.marco!)} questões, e eu quis registrar.`,
      c.marco! < 500
        ? 'O hábito já existe. Agora o que mais rende é a Revisão: as questões que te pegaram voltam no momento certo para virar acerto.'
        : 'A partir daqui, os pontos que faltam estão nos detalhes, e o Caderno de erros é o melhor mapa deles.',
      c.obs(1),
      c.fecho(),
    ] },
]

const opiniao: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'posso te pedir uma opinião?', 'Posso te pedir uma opinião?')],
    corpo: (c) => [
      c.r > 0 ? `Você já fez ${Q(c.r)} no Orto Questões, então ninguém melhor para me dizer o que está bom e o que dá para melhorar.` : 'Queria muito a sua opinião sobre o site.',
      'O que você mais usa? Sentiu falta de alguma coisa? Teve algum comentário que não ajudou? Pode responder do jeito que quiser, mesmo que seja uma linha. Eu leio todas.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'uma pergunta só', 'Uma pergunta só')],
    corpo: () => [
      'Uma pergunta só: se você pudesse mudar uma coisa no Orto Questões, o que seria?',
      'Responde aqui mesmo? As melhores ideias do site vieram assim.',
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'me ajuda a melhorar o site?', 'Me ajuda a melhorar o site?')],
    corpo: (c) => [
      J('Estou planejando as próximas melhorias do site e queria ouvir quem estuda de verdade por aqui.', c.obs(1)),
      'Três perguntas rápidas, responde só as que quiser:\n- O que faz você voltar ao site?\n- O que poderia ser melhor?\n- O que você gostaria que existisse?',
      'Obrigado desde já.',
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'sua opinião importa muito', 'Sua opinião importa muito')],
    corpo: () => [
      'Queria muito a sua opinião, inclusive sobre o que não está bom.',
      'Os comentários das questões estão ajudando? Estão longos demais, curtos demais? Tem alguma área em que você sente falta de mais coisa?',
      'É só responder. Eu leio tudo e respondo.',
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'o que está faltando?', 'O que está faltando?')],
    corpo: (c) => [
      J(c.r > 0 ? `Vi as suas ${Q(c.r)} e fiquei com uma curiosidade.` : 'Fiquei com uma curiosidade.', c.obs(1)),
      'O que está faltando no Orto Questões para ele ser o lugar onde você mais gosta de estudar?',
      'Pode ser coisa grande ou pequena. Respondendo este e-mail, chega direto para mim.',
    ] },
]

const indicar: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'um pedido', 'Um pedido'), 'O site cresce no boca a boca'],
    corpo: (c) => [
      'Queria te agradecer por estudar no Orto Questões. O site é um projeto independente e cresce no boca a boca, então tenho um pedido: se ele te ajuda, que tal mandar o seu link para os colegas da residência?',
      'Quando um colega cria a conta pelo seu link e responde 20 questões, vocês dois ganham 7 dias do plano completo. Vale para até 12 amigos.',
      `Seu link pessoal fica aqui: ${c.link('indicar')}`,
      'Muito obrigado.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'estudar junto rende mais', 'Estudar junto rende mais')],
    corpo: (c) => [
      'Estudar junto rende mais, e deixa o ranking mais animado.',
      `Se tiver colegas se preparando para a prova, que tal mandar o seu link? Quando alguém cria a conta por ele e responde 20 questões, vocês dois ganham 7 dias do plano completo. ${c.link('indicar')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'você conhece alguém?', 'Você conhece alguém?')],
    corpo: (c) => [
      'Você conhece alguém que está estudando para o TEOT, para o TARO ou para o R4?',
      'Se conhecer, me ajuda muito mandar o Orto Questões para essa pessoa. E ainda vale para você: pelo seu link, cada colega que responde 20 questões dá 7 dias do plano completo para os dois.',
      `O link está aqui: ${c.link('indicar')}`,
    ] },
  { id: 'v4', requer: temFatos, assuntos: (c) => [nm(c, 'obrigado, e um pedido', 'Obrigado, e um pedido')],
    corpo: (c) => [
      J('Obrigado por estar por aqui.', c.obs(1)),
      `Um pedido: se o site te ajuda, conta para um colega? Pelo seu link, vocês dois ganham 7 dias do plano completo quando a pessoa responde 20 questões: ${c.link('indicar')}`,
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'manda para um colega?', 'Manda para um colega?')],
    corpo: (c) => [
      'Um pedido rápido: se o Orto Questões tem te ajudado, que tal mandar para um colega que esteja estudando também?',
      `Pelo seu link pessoal, quando a pessoa cria a conta e responde 20 questões, vocês dois ganham 7 dias do plano completo. Vale para até 12 amigos: ${c.link('indicar')}`,
      'Obrigado pela força.',
    ] },
]

const cronograma: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'conhece o cronograma?', 'Conhece o cronograma?'), 'Um plano até a prova'],
    corpo: (c) => [
      'Queria te apresentar uma coisa de que o pessoal tem gostado bastante: o cronograma.',
      'Você diz a data da prova e o site monta a meta de cada dia e os temas de cada semana, começando pelo que mais cai no TEOT e no TARO. Se um dia atrasar, ele recalcula. Se adiantar, alivia.',
      `A prévia do seu cronograma é aberta, vale dar uma olhada: ${c.link('cronograma')}`,
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'o que estudar hoje', 'O que estudar hoje')],
    corpo: (c) => [
      'Sabe aquela dúvida de todo dia, "o que eu estudo hoje"? O cronograma responde por você.',
      J(c.fato('prova'), 'Você coloca a data da prova, e ele monta a lista de cada dia, com o que mais cai primeiro e dia de plantão sem quebrar o plano.'),
      `Dá para ver a prévia do seu: ${c.link('cronograma')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma ideia para organizar o estudo', 'Uma ideia para organizar o estudo')],
    corpo: (c) => [
      c.r > 0 ? `Você já tem ${Q(c.r)} por aqui. Se quiser organizar as próximas, o cronograma pode ajudar.` : 'Se quiser organizar o estudo até a prova, o cronograma pode ajudar.',
      `Ele divide o que falta pelos dias até a prova e diz o que estudar hoje. A prévia é aberta: ${c.link('cronograma')}`,
    ] },
  { id: 'v4', requer: teotOuProva, assuntos: (c) => [`Faltam ${D(c.diasTeot)} para o TEOT`],
    corpo: (c) => [
      `Faltam ${D(c.diasTeot)} para o TEOT. Dá tempo de muita coisa, ainda mais com um plano.`,
      `O cronograma do site faz esse plano com você: passa primeiro pelo que mais cai, se ajusta quando a semana aperta e termina com uma reta final de revisão. Veja a prévia do seu: ${c.link('cronograma')}`,
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'e se o plantão bagunçar a semana?', 'E se o plantão bagunçar a semana?')],
    corpo: (c) => [
      'Se você dá plantão, talvez já tenha pensado nisso: e se o plantão bagunçar a semana de estudo?',
      'Foi para isso que o cronograma ganhou o dia de plantão. Você marca, e ele redistribui o que ficou para trás, sem quebrar o plano até a prova.',
      `A prévia do seu é aberta: ${c.link('cronograma')}`,
      c.fecho(),
    ] },
]

// ---------------------------------------------------------------------------
// Automáticos: renovação do Pix e resumo de estudo
// ---------------------------------------------------------------------------

const dataCurta = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : null)
const mesesDoPlano = (plano: string | null | undefined) => ({ mensal: '1 mês', semestral: '6 meses', anual: '12 meses' } as Record<string, string>)[plano ?? ''] ?? null
const nomePlano = (plano: string | null | undefined) => ({ mensal: 'mensal', semestral: 'semestral', anual: 'anual' } as Record<string, string>)[plano ?? ''] ?? null

const pix_3_dias: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, `seu acesso vai até ${dataCurta(c.pix?.fimEm) ?? 'os próximos dias'}`, `Seu acesso vai até ${dataCurta(c.pix?.fimEm) ?? 'os próximos dias'}`)],
    corpo: (c) => {
      const d = Math.max(1, c.pix?.diasRestantes ?? 3), fim = dataCurta(c.pix?.fimEm), meses = mesesDoPlano(c.pix?.plano), plano = nomePlano(c.pix?.plano)
      return [
        `Passando com um lembrete amigo: o seu plano${plano ? ` ${plano}` : ''}, pago no Pix, vai até ${fim ?? `daqui a ${D(d)}`}. Como o Pix não renova sozinho, quis te avisar com calma.`,
        `Se quiser continuar, dá para renovar quando preferir, sem perder nenhum dia: os ${D(d)} que faltam continuam valendo e o período novo começa quando o atual termina${meses ? `. Renovando o mesmo plano, você fica com esses ${D(d)} mais ${meses}` : ''}.`,
        c.r > 0 ? `Suas ${Q(c.r)}${c.pctBom !== null ? `, os ${c.pctBom}% de acerto` : ''} e o caderno de erros ficam guardados de qualquer jeito.` : null,
        `A renovação fica na página de planos: ${c.link('assinatura')}`,
      ]
    } },
  { id: 'v2', assuntos: (c) => [nm(c, `faltam ${D(Math.max(1, c.pix?.diasRestantes ?? 3))} do seu plano`, `Faltam ${D(Math.max(1, c.pix?.diasRestantes ?? 3))} do seu plano`)],
    corpo: (c) => {
      const d = Math.max(1, c.pix?.diasRestantes ?? 3), fim = dataCurta(c.pix?.fimEm)
      return [
        `Faltam ${D(d)} para terminar o acesso que você pagou no Pix${fim ? ` (vai até ${fim})` : ''}.`,
        c.fatos.semana ? `Vi que você fez ${Q(c.fatos.semana)} só na última semana, que ritmo bonito. Quis avisar com antecedência para nada interromper esse embalo.` : 'Quis avisar com antecedência para nada interromper o seu estudo.',
        `Se renovar antes, os dias que faltam não se perdem: o período novo começa quando o atual termina. Fica tudo na página de planos: ${c.link('assinatura')}`,
        'Se preferir não ter que lembrar, no cartão a assinatura renova sozinha, e dá para cancelar quando quiser em Minha conta.',
      ]
    } },
  { id: 'v3', assuntos: (c) => [nm(c, 'um lembrete sobre o seu Pix', 'Um lembrete sobre o seu Pix')],
    corpo: (c) => {
      const fim = dataCurta(c.pix?.fimEm)
      return [
        `Um lembrete rápido, com carinho: o seu acesso pago no Pix vai até ${fim ?? 'os próximos dias'}.`,
        'Se quiser seguir estudando com tudo liberado, dá para renovar antes, sem perder os dias que ainda faltam.',
        `É pela página de planos: ${c.link('assinatura')}`,
        'Se tiver qualquer dúvida sobre o pagamento, me responde aqui.',
      ]
    } },
]

const pix_hoje: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'seu acesso vai até hoje', 'Seu acesso vai até hoje')],
    corpo: (c) => {
      const meses = mesesDoPlano(c.pix?.plano), plano = nomePlano(c.pix?.plano)
      return [
        `Hoje é o último dia do seu plano${plano ? ` ${plano}` : ''} pago no Pix, e quis te avisar com carinho.`,
        `Se renovar hoje, você segue sem nenhum dia de intervalo: o período novo começa quando o atual termina${meses ? ` e vale ${meses === '1 mês' ? '1 mês completo' : `${meses} completos`}` : ''}. Se renovar depois, ele começa no dia do pagamento.`,
        c.r > 0 ? `Suas ${Q(c.r)} e o caderno de erros ficam guardados, renovando ou não.` : null,
        `A renovação fica aqui: ${c.link('assinatura')}`,
      ]
    } },
  { id: 'v2', assuntos: (c) => [nm(c, 'último dia do seu plano', 'Último dia do seu plano')],
    corpo: (c) => [
      'Só para não ter surpresa amanhã: o seu acesso pago no Pix vai até hoje.',
      `Se quiser continuar, renovar hoje mantém tudo sem interrupção, inclusive a fila da Revisão. É pela página de planos: ${c.link('assinatura')}`,
      'E se preferir não renovar agora, obrigado de coração pelo tempo de assinatura. Seu progresso fica guardado, esperando por você.',
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'hoje é o último dia do seu Pix', 'Hoje é o último dia do seu Pix')],
    corpo: (c) => [
      'Hoje é o último dia do acesso do seu plano pago no Pix.',
      c.r > 0 ? `Você construiu bastante coisa aqui: ${Q(c.r)}${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ''}. Fico feliz de ver tudo isso.` : null,
      `Se quiser seguir, renovando hoje o período novo emenda no atual: ${c.link('assinatura')}`,
      'Qualquer dúvida, me responde.',
    ] },
]

const AREA_NOME = (slug: string, c: Ctx) => c.area(slug)?.em ?? slug
const PONTOS = (n: number) => (n === 1 ? '1 ponto' : `${N(n)} pontos`)
/** Acerto do período, só para citar quando é motivo de orgulho (50% ou mais, com amostra). */
const acertoDoPeriodo = (c: Ctx) => {
  const r = c.relatorio!
  const a = r.certas + r.erradas > 0 ? Math.round((100 * r.certas) / (r.certas + r.erradas)) : null
  return { acerto: a, citavel: a !== null && r.respostas >= 10 && a >= 50 ? a : null, subiu: a !== null && r.respostas >= 10 && r.acertoAnterior !== null && a > r.acertoAnterior ? a - r.acertoAnterior : null }
}
const relatorio: Versao[] = [
  { id: 'v1', assuntos: (c) => {
      const r = c.relatorio!
      return r.respostas > 0
        ? [nm(c, `seu resumo ${r.rotulo}`, `Seu resumo ${r.rotulo}`), nm(c, `você fez ${Q(r.respostas)} ${r.em}`, `Você fez ${Q(r.respostas)} ${r.em}`)]
        : [nm(c, `seu resumo ${r.rotulo}`, `Seu resumo ${r.rotulo}`)]
    },
    corpo: (c) => {
      const r = c.relatorio!
      if (r.respostas <= 0) return [
        `${r.frase}, a rotina deve ter apertado, e está tudo bem: acontece, e nada do que você já fez se perdeu.`,
        r.totalAcumulado > 0 ? `Suas ${Q(r.totalAcumulado)} continuam guardadas, e a Revisão já separou as que pedem uma segunda olhada.` : null,
        `Quando quiser recomeçar, dez questões e a Revisão do dia já colocam tudo nos trilhos: ${c.link('revisao')}`,
      ]
      const { citavel, subiu } = acertoDoPeriodo(c)
      return [
        `${r.frase}, você respondeu ${Q(r.respostas)} em ${D(Math.max(1, r.diasAtivos))} de estudo${citavel !== null ? `, com ${citavel}% de acerto` : ''}.${subiu !== null ? ` O seu acerto subiu ${PONTOS(subiu)} em relação ao período anterior. Que bom ver isso.` : ' Que bom ver você estudando.'}`,
        r.subiram.length ? `O que mais cresceu: ${r.subiram.map((t) => `${AREA_NOME(t.slug, c)} (mais ${PONTOS(t.agora - t.antes)})`).join(', ')}.` : null,
        r.cairam.length ? `Vale uma revisita com carinho: ${r.cairam.map((t) => AREA_NOME(t.slug, c)).join(', ')}.` : null,
        r.simulado && r.simulado.total > 0 && r.simulado.acertos / r.simulado.total >= 0.5 ? `No ${r.simulado.titulo}, você fez ${r.simulado.acertos} de ${r.simulado.total}. Parabéns.` : r.simulado ? `Obrigado por encarar o ${r.simulado.titulo}: só de fazer, já é um ótimo treino.` : null,
        r.maisFraco && r.maisFraco.acerto < 70
          ? `Para o próximo período, se fizer sentido, eu daria uma atenção especial a ${AREA_NOME(r.maisFraco.slug, c)}: é onde cada sessão vai render mais. ${c.link('treinar')}`
          : `Para o próximo período, que tal manter a Revisão em dia e abrir um tema que você ainda quer explorar? ${c.link('revisao')}`,
      ]
    } },
  { id: 'v2', requer: (c) => (c.relatorio?.respostas ?? 0) > 0, assuntos: (c) => [nm(c, `como foi o seu estudo ${c.relatorio!.em}`, `Como foi o seu estudo ${c.relatorio!.em}`)],
    corpo: (c) => {
      const r = c.relatorio!
      const { citavel, subiu } = acertoDoPeriodo(c)
      return [
        `Passando com o seu resumo: ${Q(r.respostas)} ${r.em}, em ${D(Math.max(1, r.diasAtivos))}.${citavel !== null ? ` Acerto de ${citavel}%${subiu !== null ? `, ${PONTOS(subiu)} a mais que no período anterior` : ''}.` : subiu !== null ? ` E o seu acerto subiu ${PONTOS(subiu)} em relação ao período anterior.` : ''}`,
        r.respostasAnterior > 0 && r.respostas > r.respostasAnterior ? `Foi mais do que no período anterior (${Q(r.respostasAnterior)}). Que bom sinal.` : 'O que mais conta é seguir, e você está seguindo.',
        r.subiram.length ? `Destaque para ${AREA_NOME(r.subiram[0].slug, c)}, que cresceu ${PONTOS(r.subiram[0].agora - r.subiram[0].antes)}.` : null,
        r.totalAcumulado > 0 ? `No total, já são ${Q(r.totalAcumulado)} diferentes.` : null,
        r.maisFraco && r.maisFraco.acerto < 70 ? `Uma ideia para o próximo passo: ${AREA_NOME(r.maisFraco.slug, c)}, que é onde cada sessão vai render mais. ${c.link('treinar')}` : `Uma ideia para o próximo passo: manter a Revisão em dia. ${c.link('revisao')}`,
      ]
    } },
  { id: 'v3', requer: (c) => (c.relatorio?.respostas ?? 0) > 0, assuntos: (c) => [nm(c, 'seus números, em poucas linhas', 'Seus números, em poucas linhas')],
    corpo: (c) => {
      const r = c.relatorio!
      const { citavel, subiu } = acertoDoPeriodo(c)
      return [
        `Seus números ${r.rotulo}, em poucas linhas:`,
        [
          `- ${cap(Q(r.respostas))} em ${D(Math.max(1, r.diasAtivos))}`,
          citavel !== null ? `- ${citavel}% de acerto` : null,
          subiu !== null ? `- Acerto subindo: mais ${PONTOS(subiu)} que no período anterior` : null,
          r.subiram.length ? `- Cresceu: ${r.subiram.map((t) => AREA_NOME(t.slug, c)).join(', ')}` : null,
          r.cairam.length ? `- Vale revisitar: ${r.cairam.map((t) => AREA_NOME(t.slug, c)).join(', ')}` : null,
        ].filter(Boolean).join('\n'),
        `Quando quiser continuar, a Revisão já está pronta: ${c.link('revisao')}`,
      ]
    } },
]

export const VERSOES: Record<string, Versao[]> = {
  'ativo:0-10': ativo_0_10, 'ativo:10-20': ativo_10_20, 'ativo:20-30': ativo_20_30, 'ativo:30-40': ativo_30_40, 'ativo:40-60': ativo_40_60,
  'ativo:60-70': ativo_60_70, 'ativo:70-80': ativo_70_80, 'ativo:80-90': ativo_80_90, 'ativo:90-100': ativo_90_100,
  nunca_comecou, boas_vindas, comecando, comecou_parou, pausa, sumiu, obrigado_assinatura, convite_20, convite_50,
  reta_final, marco, opiniao, indicar, cronograma, pix_3_dias, pix_hoje, relatorio,
}

/**
 * As versões das cartas, escritas à mão. Cada situação (e cada faixa de acerto)
 * tem várias versões completas, cada uma com a voz de quem escreve num dia
 * diferente: uma curta, uma que pergunta, uma que conta um método, uma que só
 * reconhece o esforço. Dentro delas entram os blocos trocáveis do motor
 * (observações pessoais, dica, fecho, P.S.), o que dá centenas de combinações.
 *
 * Regras de escrita (pedido do dono, 15/10/2026): frases curtas, primeira pessoa,
 * sem clichê de marketing, sem preço, sem "grátis", sem gênero presumido ("que bom
 * ter você", nunca "bem-vindo"), número só quando existe e é maior que zero,
 * acerto só com amostra suficiente (c.pct já vem null quando não dá para citar).
 * Um link por carta, no máximo (c.link).
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
  nm(c, 'vi seu estudo', 'Vi seu estudo por aqui'),
  `Sobre as suas ${Q(c.r)}`,
  nm(c, 'um recado rápido', 'Um recado rápido'),
  'Uma coisa que reparei',
  c.fatos.melhorArea && `Parabéns por ${c.area(c.fatos.melhorArea.slug).em}`,
  c.fatos.ranking && `${c.fatos.ranking}º no ranking`,
  c.fatos.horario === 'noite' && nm(c, 'estudando à noite', 'Estudando à noite'),
  c.fatos.prova === 'teot' && nm(c, 'rumo ao TEOT', 'Rumo ao TEOT'),
  ...extras,
]

const ativo_0_10: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'uma sugestão rápida', 'Uma sugestão rápida'), 'Uma ideia sobre as suas questões', `Sobre as suas ${Q(c.r)}`],
    corpo: (c) => [
      `Estava olhando quem anda estudando por aqui e vi o seu nome, com ${Q(c.r)} já respondidas. Que bom que você está usando o site.`,
      'Reparei que a maior parte das respostas saiu errada, e fiquei pensando se você não está marcando uma alternativa qualquer só para chegar logo ao comentário. Se for isso, tudo bem: ler o comentário também é estudo.',
      'Só queria sugerir uma coisa. De vez em quando, tente responder de verdade, mesmo sem certeza. O erro que você comete tentando é o que a Revisão traz de volta depois, e é aí que a matéria gruda.',
      c.obs(1),
      `Se quiser testar hoje, cinco questões com calma já bastam: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'posso te perguntar uma coisa?', 'Posso te perguntar uma coisa?'), 'Uma pergunta sincera'],
    corpo: (c) => [
      'Uma pergunta sincera: as questões estão difíceis demais, ou você está passando rápido por elas?',
      'Pergunto porque o seu acerto ainda está bem baixo, e isso quase sempre tem uma explicação simples. Ou o tema está pesado para esta fase, ou a pressa está atrapalhando. Nos dois casos dá para ajustar.',
      'Se puder, me responde contando como você está estudando. Eu leio tudo e te ajudo a montar um jeito que funcione.',
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'um método simples', 'Um método simples para as questões'), 'Cinco questões devagar'],
    corpo: (c) => [
      J(c.obs(1) ?? `Vi que você já passou por ${Q(c.r)} no Orto Questões.`),
      'Quero te passar um jeito de estudar que costuma funcionar quando o acerto ainda não decolou.',
      'Escolha um tema só. Faça cinco questões devagar, lendo o enunciado inteiro. Depois de cada uma, leia o comentário da certa e das erradas, mesmo que tenha acertado. No dia seguinte, abra a Revisão antes de qualquer questão nova.',
      `Parece pouco, mas é assim que o acerto começa a subir. A Revisão fica aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'não desanime', 'Não desanime com o começo'), 'Sobre errar no começo'],
    corpo: (c) => [
      'Todo mundo começa errando muito em questão de prova de título. É assim mesmo: banca gosta de pegadinha, de detalhe de classificação, de exceção.',
      `O que eu vi no seu histórico é que você não desistiu: já são ${Q(c.r)}. Isso conta muito.`,
      c.dica(),
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'como o site está funcionando para você?', 'Como o site está funcionando para você?')],
    corpo: (c) => [
      'Escrevo porque quero entender como o site está funcionando para você.',
      `Você já respondeu ${Q(c.r)}, mas o acerto ainda está lá embaixo, e não quero que fique a impressão de que você não está aprendendo. Às vezes é só o tema que está avançado demais para o momento.`,
      `Se fizer sentido, comece por conceitos básicos: são questões mais diretas e ajudam a pegar o jeito das provas. Dá para escolher o tema aqui: ${c.link('treinar')}`,
      'E se alguma coisa no site estiver confusa, me conta. Respondo pessoalmente.',
    ] },
  { id: 'v6', requer: temFatos, assuntos: (c) => assuntosAtivo(c, ['Menos questões, mais comentário']),
    corpo: (c) => [
      c.obs(1),
      'Vi também que o acerto ainda está baixo, e quero te dizer que isso não diz nada sobre você. Diz só que o caminho está no começo.',
      'Para a próxima sessão: faça menos e leia mais. Dez questões com o comentário lido inteiro valem mais que cinquenta corridas.',
      c.fecho(),
      c.ps(),
    ] },
]

const ativo_10_20: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'sobre o seu acerto', 'Sobre o seu acerto'), 'Errar aqui é barato'],
    corpo: (c) => [
      `Vi que você já tem ${Q(c.r)} no Orto Questões, e passei para conversar um pouco sobre o acerto, que ainda está em ${c.pct}%.`,
      'Sei que é desanimador olhar esse número. Mas ele mostra exatamente o que você ainda não sabe, e isso vale ouro antes da prova. Errar aqui é barato; errar lá é que custa.',
      `Uma sugestão prática: abra o Caderno de erros e refaça as que você errou, sem pressa. Quando acertar uma que antes tinha errado, ela vale mais que dez novas. Fica aqui: ${c.link('erros')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => assuntosAtivo(c, ['Questão de prova é difícil mesmo']),
    corpo: (c) => [
      `Questão de prova de ortopedia é difícil. Muito difícil, às vezes. E você está encarando mesmo assim: ${Q(c.r)} até aqui.`,
      c.obs(1),
      'O acerto ainda está baixo, e tudo bem. O que faz ele subir é menos volume e mais revisão: voltar nas que errou até virar certeza.',
      `Hoje, se der, faça só a Revisão do dia. É rápida e é onde o estudo mais rende: ${c.link('revisao')}`,
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma estratégia simples', 'Uma estratégia simples'), 'Um tema por semana'],
    corpo: (c) => [
      'Fiquei feliz de ver que você continua estudando por aqui.',
      'Olhei seus números e acho que você vai gostar de uma estratégia simples: um tema por semana. Em vez de pular de área em área, fique alguns dias só em um, até o acerto ali começar a subir. A sensação de progresso aparece mais rápido.',
      c.dica(),
      `Dá para escolher o tema aqui: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'o que eu vejo nos seus números', 'O que eu vejo nos seus números')],
    corpo: (c) => [
      `${c.pct}% de acerto parece pouco, eu sei. Mas sabe o que eu vejo? Alguém que já respondeu ${Q(c.r)} e não desistiu.`,
      'Os comentários de cada alternativa foram escritos justamente para esse momento. Quando errar, leia por que a sua alternativa estava errada, não só por que a outra estava certa. É ali que mora a pegadinha da banca.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'um desafio de sete dias', 'Um desafio de sete dias'), 'Topa um desafio?'],
    corpo: (c) => [
      c.obs(1),
      'Quero te propor um desafio pequeno: nos próximos sete dias, dez questões por dia, sempre lendo o comentário inteiro. Depois me conta se o acerto mexeu.',
      'Se quiser, responda este e-mail com o resultado. Vou gostar de saber.',
      c.ps(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'estou torcendo', 'Estou torcendo por você'), 'Um recado curto'],
    corpo: (c) => [
      'Escrevo rapidinho só para dizer que acompanho o seu estudo e estou torcendo.',
      'O acerto ainda está baixo, mas isso é fase. Toda base começa assim.',
      'Uma coisa que ajuda: antes de responder, tente dizer a resposta sem olhar as alternativas. Treina o raciocínio de prova.',
      c.fecho(),
    ] },
]

const ativo_20_30: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'uma técnica para as alternativas', 'Uma técnica para as alternativas'), 'Elimine antes de escolher'],
    corpo: (c) => [
      `Vi que você está com ${Q(c.r)} e o acerto girando em ${c.pct}%.`,
      'Esse é um momento curioso do estudo: você já reconhece os temas, mas as alternativas ainda confundem. É exatamente aí que a eliminação ajuda. Antes de escolher a certa, risque mentalmente as que você sabe que estão erradas.',
      'Com isso e a revisão das que errou, o número sobe mais rápido do que parece.',
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => assuntosAtivo(c, ['Uma fase, não um veredito']),
    corpo: (c) => [
      c.obs(1) ?? 'Passei para ver como estava o seu estudo.',
      'Seu acerto ainda está abaixo de um terço, e quero te tranquilizar: é uma fase, não um veredito.',
      `Uma sugestão: pegue o tema em que você mais errou e faça só ele por uns dias. Concentrar ajuda a enxergar os padrões da banca. Dá para escolher aqui: ${c.link('treinar')}`,
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'o comentário vale mais quando você erra', 'O comentário vale mais quando você erra')],
    corpo: (c) => [
      'Uma coisa que talvez ninguém tenha te falado: o comentário da questão vale mais quando você erra.',
      `Você já tem ${Q(c.r)} respondidas. Se nas próximas você ler o comentário de cada alternativa errada, devagar, o acerto vai começar a responder. Não é mágica, é repetição.`,
      c.dica(),
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'eu vi o seu esforço', 'Eu vi o seu esforço')],
    corpo: (c) => [
      `Só para dizer que eu vi o seu esforço: ${Q(c.r)} já respondidas.`,
      `O acerto vai vir. Continue revisando os erros, que é o que mais faz diferença: ${c.link('revisao')}`,
      c.ps(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'agora é calibrar', 'Agora é calibrar'), 'Menos questão nova, mais revisão'],
    corpo: (c) => [
      c.fatos.semana ? 'Você está estudando com constância, e essa é a parte mais difícil.' : 'Você já criou o hábito de abrir o site, e essa é a parte mais difícil.',
      'Agora é calibrar: menos questões novas, mais revisão. A Revisão traz de volta o que você errou no tempo certo, e é ali que um erro vira acerto.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'me conta uma coisa', 'Me conta uma coisa')],
    corpo: () => [
      'Me conta uma coisa: quando você erra uma questão aqui, costuma ler o comentário até o fim?',
      'Pergunto porque, olhando o seu acerto, acho que dá para subir bastante só mudando isso. O comentário explica cada alternativa, e a pegadinha da banca quase sempre está numa delas.',
      'Faça o teste nas próximas dez e me diga se fez diferença.',
    ] },
]

const ativo_30_40: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, ['A base está aparecendo']),
    corpo: (c) => [
      `Vi que você já passou de ${Q(c.r)} e está com ${c.pct}% de acerto.`,
      'É a faixa em que a base começa a aparecer. Você já acerta o que estudou e erra o que ainda não viu, o que é um ótimo sinal: quer dizer que o estudo está funcionando.',
      `O próximo passo é transformar os erros em acertos. O Caderno de erros guarda todos eles, e vale refazer com calma: ${c.link('erros')}`,
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      'O seu acerto ainda não chegou nos 40%, mas está a caminho, e daqui para a frente cada revisão conta.',
      c.dica(),
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'você está na virada', 'Você está na virada')],
    corpo: (c) => [
      'Passei para dizer que está tudo certo com o seu ritmo, mesmo que o acerto ainda não seja o que você quer.',
      'Uma comparação de que eu gosto: os primeiros 40% vêm do que você já sabia. Os próximos vêm do que você aprende errando. Você está bem na virada.',
      `Antes de questões novas, a Revisão do dia: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'uma dica curta', 'Uma dica curta'), 'Vinte questões de um tema só'],
    corpo: (c) => [
      'Uma dica curta: escolha a área em que você mais erra e faça vinte questões só dela nesta semana.',
      c.fato('areaFraca'),
      'Concentrar num tema por vez deixa os padrões da banca mais claros.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'um empurrãozinho', 'Um empurrãozinho'), 'A revisão que vale ouro'],
    corpo: (c) => [
      'Vi o seu estudo por aqui e queria te dar um empurrãozinho.',
      `Com ${Q(c.r)}, você já tem material para a revisão que mais rende: as que errou. Antes de começar questões novas amanhã, abra a Revisão do dia. Leva poucos minutos.`,
      c.obs(1),
      c.ps(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'os números sobem com atraso', 'Os números sobem com atraso')],
    corpo: (c) => [
      'Escrevo porque gosto de acompanhar quem está construindo a base, e é isso que eu vejo no seu caso.',
      'Os números ainda não mostram tudo o que você já aprendeu. Eles sobem com atraso, quase sempre depois de algumas semanas de revisão. Continue.',
      c.fecho(),
    ] },
]

const ativo_40_60: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, ['Metade certa, metade errada']),
    corpo: (c) => [
      `Olhei o seu estudo e vi ${Q(c.r)}, com mais ou menos metade certa.`,
      'Metade certa, metade errada parece empate, mas é a faixa em que mais dá para subir. Você já tem base para entender os comentários, e cada erro revisado agora é ponto ganho na prova.',
      c.dica(),
      `A Revisão do dia fica aqui: ${c.link('revisao')}`,
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      `Seu acerto está em ${c.pct}%, bem no meio do caminho. Daqui, o que mais rende é atacar o tema mais fraco por uns dias seguidos.`,
      c.fecho(),
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma dica que pode virar o jogo', 'Uma dica que pode virar o jogo')],
    corpo: (c) => [
      `Uma dica que pode virar o jogo para você: refaça as questões que errou antes de fazer novas. Parece contraintuitivo, mas é o caminho mais curto para sair dos ${c.pct}%.`,
      `O Caderno de erros guarda todas: ${c.link('erros')}`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'parabéns pela constância', 'Parabéns pela constância')],
    corpo: (c) => [
      `Passando para te dar parabéns pela constância. ${cap(Q(c.r))} não aparecem sozinhas.`,
      'Agora que você está no meio do caminho, vale prestar atenção nos detalhes: classificação, epônimo, exceção. É o que separa quem acerta metade de quem acerta dois terços.',
      c.ps(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'qual tema está te dando mais trabalho?', 'Qual tema está te dando mais trabalho?')],
    corpo: (c) => [
      'Me conta: qual tema está te dando mais trabalho?',
      'Pergunto porque, com o seu acerto, um tema só pode estar puxando a média para baixo. Se a gente descobrir qual, dá para subir rápido.',
      c.fatos.areaFraca ? `Pelo que vi, ${c.area(c.fatos.areaFraca.slug).em} pode ser um candidato (${c.fatos.areaFraca.pct}%).` : null,
      'É só responder este e-mail.',
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'um hábito pequeno', 'Um hábito pequeno'), 'Chute certo engana'],
    corpo: (c) => [
      'Vi que você está estudando com regularidade, e com um acerto que já mostra base.',
      'Quero sugerir um hábito: toda vez que acertar no chute, marque a questão como favorita e volte nela depois. Acerto no chute engana o número e não fica para a prova.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v7', assuntos: (c) => assuntosAtivo(c, ['No meio do caminho']),
    corpo: (c) => [
      `${cap(Q(c.r))} e um acerto na média. Sabe o que isso quer dizer? Que você tem base e tem espaço para crescer, ao mesmo tempo.`,
      c.obs(1),
      'Meu conselho para as próximas semanas: um pouco de questão nova todo dia e a Revisão sem deixar acumular. Simples assim.',
      c.fecho(),
    ] },
]

const ativo_60_70: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'seu acerto passou dos 60%', 'Seu acerto passou dos 60%')]),
    corpo: (c) => [
      'Seu acerto passou dos 60%, e quis passar para te dar os parabéns.',
      'É o ponto em que a base já está firme e o que falta são os detalhes. Uma boa estratégia agora é olhar os temas em que você está abaixo da sua média e dar atenção especial a eles.',
      c.obs(1),
      `Para escolher o tema: ${c.link('treinar')}`,
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      `Com ${c.pct}% de acerto, você está num patamar bom. O próximo salto costuma vir das revisões: aquelas questões que você erra pela segunda vez são as mais valiosas.`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'está bonito o seu estudo', 'Está bonito o seu estudo')],
    corpo: (c) => [
      'Só para dizer: está bonito o seu estudo.',
      `${cap(Q(c.r))}, ${c.pct}% de acerto e constância. Continue nesse ritmo.`,
      c.ps(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'uma dica para a sua faixa', 'Uma dica para a sua faixa'), 'Leia mesmo quando acertar'],
    corpo: (c) => [
      'Uma dica para quem já está na sua faixa: leia o comentário mesmo quando acertar. Às vezes a gente acerta pelo motivo errado, e a banca adora explorar isso.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', requer: (c) => !!(c.fatos.melhorArea || c.fatos.areaFraca), assuntos: (c) => assuntosAtivo(c, ['Seu desempenho por tema']),
    corpo: (c) => [
      'Fiquei olhando o seu desempenho por tema.',
      J(c.fato('melhorArea'), c.fato('areaFraca')),
      `É um retrato bem claro de onde vale investir as próximas horas. Os temas ficam aqui: ${c.link('dados')}`,
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'dá para ver o progresso', 'Dá para ver o progresso')],
    corpo: (c) => [
      'Escrevo porque você está naquela fase boa do estudo, em que dá para ver o progresso.',
      'Mais da metade certa, e com base. Agora é ir fechando os buracos, um tema por vez.',
      c.dica(),
      c.ps(),
    ] },
]

const ativo_70_80: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'que trabalho bonito', 'Que trabalho bonito')]),
    corpo: (c) => [
      `${c.pct}% de acerto em ${Q(c.r)}. Que trabalho bonito.`,
      'Nessa faixa, os pontos que faltam estão nos detalhes: o número da classificação, a exceção, o "exceto" do enunciado. Vale ler o enunciado duas vezes antes de marcar.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      'Você já está com um acerto de quem domina boa parte da matéria. Continue revisando os erros, que é o que mantém esse número de pé.',
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'parabéns pelo seu desempenho', 'Parabéns pelo seu desempenho')],
    corpo: (c) => [
      'Passei para te dar parabéns pelo seu desempenho. Mais de 70% em questão de prova é resultado de muito estudo.',
      c.obs(1),
      `Daqui para a frente, o segredo é não deixar a revisão acumular: ${c.link('revisao')}`,
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'agora é o relógio', 'Agora é o relógio'), 'Uma sugestão para a sua faixa'],
    corpo: (c) => [
      'Uma sugestão para quem está na sua faixa: comece a cronometrar.',
      'Saber a resposta é uma coisa. Saber em um minuto e meio, com o relógio correndo, é outra. Treinar com tempo deixa a prova com cara de mais uma sessão.',
      c.fecho(),
      c.ps(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'sua opinião vale muito', 'Sua opinião vale muito'), 'O que mais te ajuda no site?'],
    corpo: (c) => [
      `Você está com ${c.pct}% de acerto em ${Q(c.r)}, o que me faz querer te perguntar uma coisa.`,
      'O que mais está te ajudando no site? E o que você mudaria? Com o seu desempenho, a sua opinião vale muito para eu saber o que manter e o que melhorar.',
      'Pode responder em uma linha só. Eu leio tudo.',
    ] },
  { id: 'v6', assuntos: (c) => assuntosAtivo(c, ['Constância com qualidade']),
    corpo: (c) => [
      'Seu histórico mostra uma coisa que eu admiro: constância com qualidade.',
      c.obs(1),
      c.dica(),
      c.fecho(),
    ] },
]

const ativo_80_90: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'precisei olhar duas vezes', 'Precisei olhar duas vezes')]),
    corpo: (c) => [
      `${c.pct}% de acerto. Precisei olhar duas vezes.`,
      'Você está acertando a maior parte do que aparece, o que quer dizer que a matéria está bem consolidada. Nesse nível, o que ainda dá para ganhar está nas questões que você erra repetidas vezes. Vale caçar essas.',
      `O Caderno de erros ajuda nisso: ${c.link('erros')}`,
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      `E um acerto de ${c.pct}%. Parabéns de verdade.`,
      c.ps(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'proteja o que você já sabe', 'Proteja o que você já sabe')],
    corpo: (c) => [
      'Escrevo só para reconhecer: você está estudando num nível muito alto.',
      `Continue protegendo o que já conquistou com a revisão espaçada. Matéria bem sabida também esfria se ficar parada: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'um pedido', 'Um pedido'), 'Você enxerga coisas que pouca gente enxerga'],
    corpo: (c) => [
      'Com o seu desempenho, você tem muito a ensinar.',
      'Se algum comentário do site estiver incompleto, ou se você discordar de algum gabarito, me escreve. Gente com o seu acerto é quem mais ajuda a deixar o banco melhor.',
      c.obs(1),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'misture as provas', 'Uma ideia: misture as provas')],
    corpo: (c) => [
      c.obs(1) ?? `Vi as suas ${Q(c.r)}, com ${c.pct}% de acerto.`,
      'Uma ideia para quem está na sua faixa: misture as provas. Treinar TEOT, TARO e R4 na mesma sessão obriga a reconhecer o tema sem a pista do contexto.',
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
      'É um desempenho excepcional. Fiquei curioso: como você estuda? Se puder me contar, responda este e-mail. Quero entender o que está funcionando.',
    ] },
  { id: 'v2', assuntos: (c) => assuntosAtivo(c, ['Você está acertando quase tudo']),
    corpo: (c) => [
      'Você está acertando quase tudo.',
      c.obs(1),
      `Nesse nível, o risco é outro: esquecer o que já sabe por falta de revisão. A Revisão do dia segura isso em poucos minutos: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'parabéns, sério', 'Parabéns, sério'), 'Alguém reparou'],
    corpo: (c) => [
      'Parabéns. Sério.',
      'Acima de 90% em questão de prova de título é resultado de muito trabalho, e quis que você soubesse que alguém reparou.',
      c.ps(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'um pedido', 'Um pedido'), 'Me ajuda a deixar o banco melhor?'],
    corpo: (c) => [
      'Tenho um pedido: se encontrar algum erro, comentário fraco ou gabarito discutível, me avise.',
      `Com ${c.pct}% de acerto, você enxerga coisas que pouca gente enxerga, e isso deixa o site melhor para todo mundo.`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => assuntosAtivo(c, ['Uma sugestão para quem está no topo']),
    corpo: (c) => [
      c.obs(1) ?? 'Acompanho o seu estudo e queria deixar uma sugestão.',
      c.p.assinante
        ? 'Para quem já está no topo, o próximo degrau são as questões que a turma mais erra. Treinar por elas mostra o que ainda escapa.'
        : 'Para quem já está no topo, o próximo degrau são os temas que você menos estudou. É ali que ainda pode haver surpresa.',
      c.fecho(),
    ] },
  { id: 'v6', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      c.obs(2),
      'Não tenho muito a sugerir, só a dizer: continue.',
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
      `Vi que você criou a sua conta no Orto Questões ${quandoConta(c)}. Obrigado pela confiança. Criar a conta já é um passo, e fico feliz que você deu.`,
      `Para o próximo, uma sugestão bem pequena: responda uma questão só. Uma. Leia o comentário da certa e das erradas e veja se o jeito do site combina com você: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'que bom ter você por aqui', 'Que bom ter você por aqui'), 'Um oi de quem cuida do site'],
    corpo: () => [
      'Passei para dar um oi. Sou eu que cuido do site, e gosto de escrever para quem acabou de chegar.',
      'Ainda não vi nenhuma questão respondida na sua conta, e está tudo bem. Quando tiver dez minutos livres, faça cinco questões de um tema de que você goste. É o bastante para pegar o jeito.',
      'Se travar em alguma coisa, me responde aqui.',
    ] },
  { id: 'v3', requer: (c) => !!(c.fatos.prova || c.fatos.etapa), assuntos: (c) => [nm(c, 'por onde começar', 'Por onde começar'), c.fatos.prova === 'teot' && 'Começando para o TEOT'],
    corpo: (c) => [
      J(c.fato('prova'), c.fato('etapa')),
      `O jeito mais fácil de começar é pelo tema de que você mais gosta. Começar pelo gostoso ajuda a criar o hábito; o difícil vem depois. Fica aqui: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'só três questões', 'Só três questões'), 'Sua conta está pronta'],
    corpo: (c) => [
      'Sua conta está pronta e esperando a primeira questão.',
      'Uma ideia: no próximo intervalo do plantão, abra o site no celular e responda três. Só três.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'uma coisa sobre as questões daqui', 'Uma coisa sobre as questões daqui')],
    corpo: (c) => [
      'Uma curiosidade sobre o site: cada questão tem a explicação de todas as alternativas, não só da certa. É ali que mais se aprende.',
      `Vi que você ainda não respondeu nenhuma. Que tal ver como funciona com uma só? ${c.link('treinar')}`,
      c.ps(),
    ] },
  { id: 'v6', requer: (c) => (c.p.diasConta ?? 0) > 3, assuntos: (c) => [nm(c, 'sem pressa', 'Sem pressa'), 'Quando a rotina der folga'],
    corpo: (c) => [
      'Imagino que a rotina não tenha dado folga desde que você criou a conta.',
      'Sem pressa. Quando der, comece pequeno: um tema, cinco questões, sem se preocupar com o acerto. O site guarda tudo, e a Revisão cuida do resto.',
      c.fecho(),
    ] },
]

const boas_vindas: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'que bom começo', 'Que bom começo'), 'Três coisas para os primeiros dias'],
    corpo: (c) => [
      `Vi que você chegou ao Orto Questões há pouco e já respondeu ${Q(c.r)}. Que bom começo.`,
      'Três coisas que ajudam nos primeiros dias: leia o comentário mesmo quando acertar, deixe a Revisão trazer de volta o que você errou e não se preocupe com o acerto agora.',
      'Qualquer dúvida, é só responder este e-mail.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'que bom ter você por aqui', 'Que bom ter você por aqui')],
    corpo: (c) => [
      'Que bom ter você por aqui. Sou eu que cuido do site, e gosto de escrever para quem está chegando.',
      J(c.obs(1, ['prova', 'etapa'])),
      `As suas primeiras ${Q(c.r)} já estão salvas, e as que você errou vão voltar na Revisão no momento certo: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'um conselho de quem fez o site', 'Um conselho de quem fez o site')],
    corpo: (c) => [
      'Um conselho de quem fez o site: pouco e todo dia rende mais que muito de vez em quando.',
      `Você já começou, com ${Q(c.r)}. Se conseguir manter umas dez por dia, em um mês o hábito está criado e o acerto começa a contar uma história.`,
      c.ps(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'vi a sua chegada', 'Vi a sua chegada')],
    corpo: (c) => [
      'Escrevo para dizer que vi a sua chegada, e que fico feliz de ter mais alguém estudando ortopedia a sério por aqui.',
      J(c.fato('prova'), c.fato('etapa')),
      'Se encontrar qualquer erro numa questão ou tiver uma ideia, me conta. O site melhora muito com isso.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'o melhor do site', 'O melhor do site'), 'Uma dica para a primeira semana'],
    corpo: (c) => [
      `${cap(Q(c.r))} em poucos dias. Bom começo.`,
      'Uma dica para a primeira semana: quando errar, leia por que a sua alternativa estava errada, não só por que a outra estava certa. É o que o site tem de melhor.',
      c.fecho(),
    ] },
  { id: 'v6', requer: temFatos, assuntos: (c) => [nm(c, 'reparei no seu começo', 'Reparei no seu começo')],
    corpo: (c) => [
      J('Reparei no seu começo por aqui.', c.obs(1, ['horario', 'prova', 'etapa'])),
      `${cap(Q(c.r))} em poucos dias já mostram vontade. O próximo passo é deixar a Revisão trabalhar: ela traz de volta, no momento certo, as que você errou.`,
      c.fecho(),
    ] },
]

const comecando: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'o começo é a parte difícil', 'O começo é a parte difícil'), `Suas primeiras ${Q(c.r)}`],
    corpo: (c) => [
      `Vi que você já respondeu ${Q(c.r)}. O começo é a parte mais difícil, e você está nele.`,
      'O que mais ajuda agora é constância: um pouco todo dia, mesmo nos dias corridos. O acerto vem depois, quase sem perceber.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'vi o seu começo', 'Vi o seu começo')],
    corpo: (c) => [
      c.obs(1, ['prova', 'etapa', 'horario']) ?? 'Passei para ver como estava o seu começo por aqui.',
      `Você já tem ${Q(c.r)} respondidas. Quando chegar às trinta, os números começam a dizer alguma coisa sobre os seus temas fortes e fracos.`,
      c.dica(),
      `Para seguir: ${c.link('treinar')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'cinco por dia', 'Cinco por dia')],
    corpo: (c) => [
      'Uma ideia simples: cinco questões por dia.',
      `Parece pouco, mas em um mês são mais de cem. E com as ${Q(c.r)} que você já fez, o caminho está aberto.`,
      c.ps(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'como está sendo?', 'Como está sendo?')],
    corpo: (c) => [
      `Você já fez ${Q(c.r)} por aqui, e eu queria saber: como está sendo?`,
      'Os comentários estão ajudando? Alguma coisa confusa no site? Pode responder do jeito que quiser. Eu leio tudo.',
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'a Revisão vai trabalhar por você', 'A Revisão vai trabalhar por você')],
    corpo: (c) => [
      'Uma coisa que talvez você ainda não tenha visto: as questões que você erra voltam sozinhas na Revisão, no momento certo para fixar.',
      `Vale abrir de vez em quando, antes de fazer questões novas: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v6', requer: temFatos, assuntos: (c) => [nm(c, 'uma coisa que reparei', 'Uma coisa que reparei')],
    corpo: (c) => [
      c.obs(1, ['horario', 'prova', 'etapa', 'maisEstudada']),
      `E vi que você já está com ${Q(c.r)}. Quando passar das trinta, dá para enxergar os seus temas fortes e fracos com mais clareza.`,
      `Até lá, o melhor é seguir no seu ritmo: ${c.link('treinar')}`,
    ] },
]

const comecou_parou: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'tudo o que você fez continua salvo', 'Tudo o que você fez continua salvo'), 'Sobre o seu começo'],
    corpo: (c) => [
      `Vi que você começou bem no Orto Questões, com ${Q(c.r)}, mas deu uma pausa. Acontece com todo mundo: o mais difícil é transformar o começo em hábito.`,
      'O que mais funciona é pouco e todo dia. Cinco questões por dia já acendem a sua sequência e, quando você vê, já passou de cem. Tudo o que você fez continua salvo, inclusive os erros, que voltam na Revisão para fixar.',
      `Que tal fazer as próximas hoje? ${c.link('treinar')}`,
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'travou em alguma coisa?', 'Travou em alguma coisa?')],
    corpo: (c) => [
      `Você fez ${Q(c.r)} e depois sumiu, e fiquei pensando se travou em alguma coisa no site.`,
      'Se foi isso, me conta respondendo este e-mail. Se foi só a rotina, tudo bem também: o site espera.',
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'recomeçar é fácil', 'Recomeçar é fácil')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua última questão.`,
      `Recomeçar é mais fácil do que parece: abra a Revisão, faça as que vencem hoje e pronto. Em dez minutos você está de volta: ${c.link('revisao')}`,
      c.obs(1, ['prova', 'etapa']),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'o começo é sempre assim', 'O começo é sempre assim')],
    corpo: (c) => [
      'O começo é sempre assim: alguns dias de empolgação, depois a vida aperta.',
      `As suas ${Q(c.r)} estão guardadas. Quando der, volte com cinco, de um tema de que você goste.`,
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'uma ideia para voltar', 'Uma ideia para voltar')],
    corpo: (c) => [
      'Uma ideia para voltar sem peso: escolha o horário em que você costuma estar no celular e troque cinco minutos de rede social por três questões.',
      `Parece bobo, mas é assim que o hábito pega. Suas ${Q(c.r)} já estão lá, esperando a próxima.`,
      c.ps(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'sem pressão', 'Sem pressão')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua última questão, e escrevo sem pressão nenhuma.`,
      `Se o site não fez sentido para você, me conta o porquê, que isso me ajuda muito. Se fez e foi só a rotina, as suas ${Q(c.r)} estão esperando.`,
      c.fecho(),
    ] },
]

const pausa: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'sua sequência está esperando', 'Sua sequência está esperando'), 'Dez questões hoje'],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} que você não responde questões por aqui.`,
      'Constância vence intensidade: uma sessão curta hoje vale mais que uma maratona no fim de semana. Dez questões já mantêm o hábito vivo, e as que você errou já voltaram para a Revisão.',
      `Fica aqui o atalho: ${c.link('revisao')}`,
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'uma sessão curta hoje?', 'Uma sessão curta hoje?')],
    corpo: (c) => [
      'Só um lembrete curto: faz alguns dias que você não aparece, e o hábito esfria rápido.',
      `Que tal uma sessão de quinze minutos hoje? As suas ${Q(c.r)} estão salvas, é continuar de onde parou: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'a Revisão está pronta', 'A Revisão está pronta')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua última sessão, e a Revisão já separou as questões que você errou para voltar no momento certo.`,
      `É o jeito mais rápido de retomar: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'dez questões hoje?', 'Dez questões hoje?')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua última questão. Nada grave, mas é o ponto em que o hábito começa a esfriar.`,
      `Dez questões hoje resolvem. Comece pelas que a Revisão separou: ${c.link('revisao')}`,
      c.fecho(),
    ] },
]

const sumiu: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'senti sua falta por aqui', 'Senti sua falta por aqui')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} que não vejo você por aqui, e senti sua falta. Sei como a rotina aperta, e está tudo bem: as suas ${Q(c.r)} e a sua Revisão continuam guardadas.`,
      `Para retomar sem peso, abra a Revisão e faça só as que vencem hoje. Em quinze minutos você está de volta ao ritmo: ${c.link('revisao')}`,
      'Estou torcendo por você.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'seu progresso está guardado', 'Seu progresso está guardado')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} que você não aparece, e passei só para dizer que o seu progresso está todo aqui.`,
      c.pct !== null ? `${cap(Q(c.r))}, ${c.pct}% de acerto e um caderno de erros esperando. Nada disso se perde.` : `${cap(Q(c.r))} respondidas e um caderno de erros esperando. Nada disso se perde.`,
      'Quando a rotina der uma folga, uma sessão curta já retoma o embalo.',
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'plantão, cansaço, vida', 'Plantão, cansaço, vida')],
    corpo: (c) => [
      'Plantão, cansaço, vida: acontece com todo mundo. O que separa quem chega preparado na prova é voltar, não ser perfeito.',
      `Recomece pequeno. Dez questões hoje, dez amanhã. O hábito volta mais rápido do que parece: ${c.link('treinar')}`,
      c.obs(1, ['prova', 'melhorArea']),
    ] },
  { id: 'v4', requer: (c) => !!c.fatos.melhorArea || !!c.fatos.maisEstudada, assuntos: (c) => [nm(c, 'lembrei de você', 'Lembrei de você')],
    corpo: (c) => [
      'Lembrei de você olhando quem estudava por aqui.',
      c.obs(1, ['melhorArea', 'maisEstudada']),
      'Faz um tempo que você não aparece, e seria uma pena deixar isso esfriar. Quando der, volta com uma sessão curta.',
      c.fecho(),
    ] },
  { id: 'v5', requer: (c) => c.fatos.prova === 'teot' || c.fatos.etapa === 'r3', assuntos: (c) => [nm(c, 'o TEOT está chegando', 'O TEOT está chegando')],
    corpo: (c) => [
      `Faltam ${D(c.diasTeot)} para o TEOT, e faz um tempinho que você não aparece por aqui.`,
      `Não é cobrança, é lembrete de quem torce: ainda dá tempo de fazer muita coisa, e as suas ${Q(c.r)} já são um bom começo. A Revisão está aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'sem cobrança', 'Sem cobrança'), 'Um recado curto'],
    corpo: (c) => [
      'Sem cobrança, só um recado: quando quiser voltar, o site está do jeito que você deixou.',
      `Suas ${Q(c.r)} e os seus erros para revisar continuam lá.`,
      c.ps(),
    ] },
]

const obrigado_assinatura: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'obrigado pela assinatura', 'Obrigado pela assinatura'), 'Obrigado, de verdade'],
    corpo: () => [
      'Vi que você assinou o Orto Questões e quis te escrever pessoalmente para agradecer.',
      'O site é um projeto independente. É a assinatura que paga o servidor e o tempo para manter as questões e os comentários em dia. Então, de verdade: obrigado.',
      'Se alguma coisa não funcionar, ou se sentir falta de algo, me responde aqui. Eu leio tudo.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'obrigado pela confiança', 'Obrigado pela confiança'), 'Uma dica para começar a assinatura'],
    corpo: (c) => [
      'Obrigado pela confiança.',
      `Uma dica para aproveitar a assinatura desde o começo: monte o cronograma com a data da sua prova. Ele organiza o que estudar em cada dia, começando pelo que mais cai: ${c.link('cronograma')}`,
      'E qualquer dúvida, é só responder.',
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'fiquei muito feliz', 'Fiquei muito feliz')],
    corpo: (c) => [
      'Fiquei muito feliz de ver a sua assinatura.',
      c.r > 0 ? `Você já tem ${Q(c.r)} por aqui${c.pct !== null ? `, com ${c.pct}% de acerto` : ''}, e agora tem tudo liberado para ir até a prova.` : 'Agora você tem tudo liberado para ir até a prova.',
      'Meu compromisso é continuar melhorando as questões e os comentários. Se encontrar qualquer coisa errada, me avise.',
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'um obrigado curto', 'Um obrigado curto')],
    corpo: (c) => [
      'Um obrigado curto, mas sincero, pela assinatura.',
      'Ela mantém o site de pé para você e para todo mundo que estuda aqui.',
      c.ps(),
    ] },
  { id: 'v5', requer: temFatos, assuntos: (c) => [nm(c, 'obrigado, e uma coisa que reparei', 'Obrigado, e uma coisa que reparei')],
    corpo: (c) => [
      'Obrigado por assinar o Orto Questões.',
      c.obs(2),
      'Com a assinatura, vale conhecer o Simulado Nacional do mês e os temas que mais caem. Mas, antes de tudo, obrigado.',
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'quem assina mantém o site', 'Quem assina mantém o site')],
    corpo: () => [
      'Escrevo para agradecer a sua assinatura.',
      'Não tem empresa grande por trás do Orto Questões. Tem eu, as questões, os comentários e quem assina. Você agora faz parte disso.',
      'Se tiver ideia, crítica ou sugestão, a resposta deste e-mail chega direto para mim.',
    ] },
]

// ---------------------------------------------------------------------------
// Convites para assinar (só benefício real, sem preço)
// ---------------------------------------------------------------------------

const lista = (itens: string[]) => itens.map((t) => `- ${cap(t)}`).join('\n')
/** "a, b e c". */
const eLista = (itens: string[]) => (itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`)
const garantia = 'E se não fizer sentido, você tem 7 dias para pedir o reembolso pelo próprio site, sem precisar explicar.'

const convite_20: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'o que a assinatura libera', 'O que a assinatura libera'), nm(c, 'uma coisa rápida', 'Uma coisa rápida')],
    corpo: (c) => [
      `Vi que você já respondeu ${Q(c.r)} no Orto Questões. Que bom ver você usando o site.`,
      `Escrevo porque talvez você ainda não conheça tudo o que a assinatura libera. Em resumo:\n${lista(c.beneficios(3))}`,
      `Se fizer sentido para o seu momento, os planos estão aqui: ${c.link('assinatura')}`,
      'Se não fizer, tudo bem. Continue estudando do jeito que está.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'já viu o cronograma?', 'Já viu o cronograma?')],
    corpo: (c) => [
      'Uma pergunta rápida: você já viu o cronograma do site?',
      'Você coloca a data da prova e ele monta a lista de cada dia, começando pelo que mais cai. Se um plantão bagunçar a semana, ele se ajusta.',
      `Faz parte da assinatura, junto com ${eLista(c.beneficios(3, true).filter((b) => !b.startsWith('o cronograma')).slice(0, 2))}. Dá para ver uma prévia do seu antes de decidir: ${c.link('cronograma')}`,
      c.fecho(),
    ] },
  { id: 'v3', requer: temFatos, assuntos: (c) => [nm(c, 'vi o seu começo', 'Vi o seu começo'), 'Uma sugestão para o seu estudo'],
    corpo: (c) => [
      J(`Vi as suas ${Q(c.r)}.`, c.obs(1)),
      `Com esse ritmo, acho que você aproveitaria bem a assinatura. Ela soma:\n${lista(c.beneficios(3))}`,
      `${garantia} Os planos ficam aqui: ${c.link('assinatura')}`,
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'vou ser direto', 'Vou ser direto'), 'Três coisas sobre a assinatura'],
    corpo: (c) => [
      'Vou ser direto, porque sei que o seu tempo é curto.',
      `Você já fez ${Q(c.r)}, então já sabe como o site funciona. A assinatura acrescenta três coisas:\n${lista(c.beneficios(3))}`,
      `Se quiser olhar com calma: ${c.link('assinatura')}`,
      'Qualquer dúvida, me responde.',
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'quem assina mantém o site de pé', 'Quem assina mantém o site de pé')],
    corpo: (c) => [
      'Uma coisa que talvez você não saiba: o Orto Questões é um projeto independente, e quem assina é quem mantém o site de pé.',
      `Além de apoiar, a assinatura libera ${eLista(c.beneficios(3, true))}.`,
      `${garantia} Se quiser ver: ${c.link('assinatura')}`,
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'se fizer sentido para você', 'Se fizer sentido para você')],
    corpo: (c) => [
      `${cap(Q(c.r))} já é o suficiente para você saber se o site combina com o seu jeito de estudar.`,
      `Se combinar, a assinatura leva isso adiante:\n${lista(c.beneficios(3))}`,
      `Os planos estão aqui: ${c.link('assinatura')}`,
      c.fecho(),
    ] },
  { id: 'v7', requer: (c) => (c.p.viuPlanos ?? 0) > 0, assuntos: (c) => [nm(c, 'sobre os planos', 'Sobre os planos'), nm(c, 'alguma dúvida sobre os planos?', 'Alguma dúvida sobre os planos?')],
    corpo: (c) => [
      `Você já fez ${Q(c.r)} por aqui e deu uma olhada nos planos, então resolvi escrever.`,
      'Se ficou alguma dúvida, me responde que eu explico. Às vezes é coisa simples, como a forma de pagamento ou o que acontece se você não gostar.',
      `Resumindo o que a assinatura soma:\n${lista(c.beneficios(3))}`,
      `${garantia}`,
    ] },
]

/** Uma frase sobre o acerto, no tom da faixa (só quando dá para citar). */
const tomAcerto = (c: Ctx): string | null => {
  if (c.pct === null) return null
  const p = c.pct
  if (p >= 80) return c.um(`E com ${p}% de acerto, o que é muito alto.`, `${p}% de acerto, aliás. Parabéns.`)
  if (p >= 70) return c.um(`E com ${p}% de acerto, um resultado muito bom.`, `Com ${p}% de acerto, você já está num patamar muito bom.`)
  if (p >= 60) return c.um(`E com ${p}% de acerto, uma base firme.`, `Seu acerto de ${p}% mostra uma base firme.`)
  if (p >= 40) return c.um('Com um acerto na média, que é exatamente a faixa em que mais dá para subir.', `Seu acerto de ${p}% está no meio do caminho, onde mais dá para crescer.`)
  return c.um('O acerto ainda está subindo, e é justamente nessa fase que um plano faz mais diferença.', 'O acerto ainda está em construção, e é aí que ter um caminho claro mais ajuda.')
}

const convite_50: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'escrevi para você', 'Escrevi para você'), nm(c, 'um convite pessoal', 'Um convite pessoal')],
    corpo: (c) => [
      J(`Estava olhando quem mais tem estudado por aqui e parei no seu nome: ${Q(c.r)}.`, c.obs(2)),
      tomAcerto(c),
      `Por isso quis te escrever pessoalmente. Acho que você está num ponto em que a assinatura faria diferença de verdade, e o que mais pesaria no seu caso é ${c.beneficios(1, true)[0]}.`,
      `Se quiser dar uma olhada: ${c.link('assinatura')}. E se tiver qualquer dúvida, me responde aqui, que eu mesmo respondo.`,
    ] },
  { id: 'v2', requer: (c) => !!c.fatos.ranking, assuntos: (c) => [`${c.fatos.ranking}º no ranking`, nm(c, 'uma das pessoas que mais estudam aqui', 'Uma das pessoas que mais estudam aqui')],
    corpo: (c) => [
      `Você está em ${c.fatos.ranking}º no ranking geral, então é uma das pessoas que mais estudam no Orto Questões. Quis que você soubesse que eu vi.`,
      J(c.obs(1, ['melhorArea', 'horario', 'prova']), tomAcerto(c)),
      `Para quem estuda nesse ritmo, a assinatura faz sentido: ${eLista(c.beneficios(3, true))}. ${garantia}`,
      `Os planos ficam aqui: ${c.link('assinatura')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma conversa sobre o seu estudo', 'Uma conversa sobre o seu estudo')],
    corpo: (c) => [
      `A ideia do Orto Questões é ser o lugar onde se estuda pelas provas reais, com cada alternativa explicada. Ver alguém com ${Q(c.r)} me diz que a ideia está funcionando.`,
      J(c.obs(1), tomAcerto(c)),
      `Se você quiser ir além, a assinatura soma:\n${lista(c.beneficios(3))}`,
      `Sem pressão nenhuma. Se fizer sentido: ${c.link('assinatura')}`,
      c.fecho(),
    ] },
  { id: 'v4', requer: (c) => c.fatos.prova === 'teot' || c.fatos.etapa === 'r3', assuntos: (c) => [nm(c, 'faltam alguns meses para o TEOT', 'Faltam alguns meses para o TEOT'), nm(c, 'um plano até o TEOT', 'Um plano até o TEOT')],
    corpo: (c) => [
      `Vi que você está estudando para o TEOT. Faltam ${D(c.diasTeot)}.`,
      J(`Com ${Q(c.r)} feitas, o que mais pode te ajudar agora é ter um plano até lá.`, tomAcerto(c)),
      `O cronograma da assinatura faz isso: você diz a data e ele monta a lista de cada dia, começando pelo que mais cai, e se ajusta quando a semana aperta. Dá para ver uma prévia do seu: ${c.link('cronograma')}`,
      garantia,
    ] },
  { id: 'v5', requer: (c) => !!c.fatos.areaFraca, assuntos: (c) => [nm(c, 'uma ideia para o seu ponto fraco', 'Uma ideia para o seu ponto fraco')],
    corpo: (c) => [
      `Olhei as suas ${Q(c.r)} com calma.`,
      J(c.fato('melhorArea'), c.fato('areaFraca')),
      'Na assinatura, dá para ver os temas que mais caem em cada área e como a turma respondeu cada alternativa. Ajuda muito a saber onde vale insistir e onde todo mundo também erra.',
      `Se quiser conhecer: ${c.link('assinatura')}`,
      c.fecho(),
    ] },
  { id: 'v6', requer: (c) => !!c.fatos.flashcards && !!c.p.limiteGratisLigado, assuntos: (c) => [nm(c, 'questões e flashcards sem limite', 'Questões e flashcards sem limite')],
    corpo: (c) => [
      `Vi que você usa as questões e os flashcards: ${Q(c.r)} e ${N(c.fatos.flashcards!)} cartas até agora.`,
      tomAcerto(c),
      `Com esse ritmo, o limite diário deve estar apertando. Na assinatura, questões e flashcards ficam sem limite, e ainda entram ${eLista(c.beneficios(3, true).filter((b) => !b.includes('sem limite')).slice(0, 2))}.`,
      `${garantia} ${c.link('assinatura')}`,
    ] },
  { id: 'v7', requer: temFatos, assuntos: (c) => [nm(c, 'vou ser sincero', 'Vou ser sincero')],
    corpo: (c) => [
      'Vou ser sincero: estou escrevendo para te convidar a assinar.',
      J('Não só pelo número de questões, mas pelo jeito que você estuda.', c.obs(2)),
      `A assinatura existe para quem estuda assim:\n${lista(c.beneficios(3))}`,
      `${garantia} Os planos: ${c.link('assinatura')}`,
    ] },
]

// ---------------------------------------------------------------------------
// Outras cartas pessoais
// ---------------------------------------------------------------------------

const teotOuProva = (c: Ctx) => c.fatos.prova === 'teot' || (!c.fatos.prova && (c.fatos.etapa === 'r3' || c.fatos.etapa === 'r4'))

const reta_final: Versao[] = [
  { id: 'v1', requer: teotOuProva, assuntos: (c) => [`Faltam ${D(c.diasTeot)} para o TEOT`, nm(c, 'reta final', 'Reta final')],
    corpo: (c) => [
      `Faltam ${D(c.diasTeot)} para o TEOT, em 10 de janeiro.`,
      c.r > 0 ? `Passei para lembrar que ainda dá tempo de fazer muita coisa, e você já tem ${Q(c.r)} no caminho.` : 'Passei para lembrar que ainda dá tempo de fazer muita coisa.',
      `Nesta fase, eu priorizaria duas coisas: revisar o que você errou e treinar os temas que mais caem. A Revisão fica aqui: ${c.link('revisao')}`,
      'Conte comigo nessa reta final.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'o que eu faria agora', 'O que eu faria agora'), 'A prova está chegando'],
    corpo: (c) => [
      teotOuProva(c) ? `O TEOT está a ${D(c.diasTeot)}.` : 'A prova está chegando.',
      'Se eu estivesse no seu lugar agora, faria assim: questões novas pela manhã, Revisão à noite e um simulado por semana para treinar o tempo.',
      c.obs(1, ['areaFraca', 'melhorArea']),
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'menos conteúdo novo, mais revisão', 'Menos conteúdo novo, mais revisão')],
    corpo: (c) => [
      'Na reta final, o instinto é correr atrás de tudo o que falta. Mas o que mais rende é proteger o que você já sabe.',
      `${c.r > 0 ? `Com ${Q(c.r)} feitas, você` : 'Você'} já tem material para isso. O Caderno de erros é o melhor lugar para começar: ${c.link('erros')}`,
      c.fecho(),
    ] },
  { id: 'v4', requer: (c) => !!c.fatos.areaFraca, assuntos: (c) => [nm(c, 'um tema para a reta final', 'Um tema para a reta final')],
    corpo: (c) => [
      teotOuProva(c) ? `Faltam ${D(c.diasTeot)} para o TEOT, e olhei os seus temas.` : 'A prova está chegando, e olhei os seus temas.',
      c.fato('areaFraca'),
      `Se der, dedique alguns dias seguidos a ele. Na reta final, subir um tema fraco rende mais que polir um forte: ${c.link('treinar')}`,
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'cuida de você também', 'Cuida de você também')],
    corpo: (c) => [
      'Um lembrete que ninguém costuma dar na reta final: dormir também é estudar.',
      `Memória se consolida no sono. Então, nestas últimas semanas, prefira menos horas bem dormidas a madrugadas de questão.${c.fatos.horario === 'madrugada' ? ' Digo isso porque vi que você anda estudando de madrugada.' : ''}`,
      'Você já fez muito. Agora é chegar com a cabeça descansada.',
      c.fecho(),
    ] },
  { id: 'v6', requer: (c) => !!c.fatos.melhorArea, assuntos: (c) => [nm(c, 'proteja o seu ponto forte', 'Proteja o seu ponto forte')],
    corpo: (c) => [
      teotOuProva(c) ? `Faltam ${D(c.diasTeot)} para o TEOT.` : 'A prova está chegando.',
      c.fato('melhorArea'),
      `Na reta final, vale manter esse tema aquecido com a Revisão e gastar o tempo novo nos temas mais fracos. Assim você chega sem perder o que já conquistou: ${c.link('revisao')}`,
      c.fecho(),
    ] },
]

const nomeMarco = (m: number) => ({ 50: 'cinquenta', 100: 'cem', 250: 'duzentas e cinquenta', 500: 'quinhentas', 1000: 'mil', 2000: 'duas mil', 3000: 'três mil', 4000: 'quatro mil' } as Record<number, string>)[m] ?? N(m)
const marco: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, `você passou das ${N(c.marco!)} questões`, `Você passou das ${N(c.marco!)} questões`), `${cap(nomeMarco(c.marco!))} questões`],
    corpo: (c) => [
      `${cap(nomeMarco(c.marco!))} questões! Passei para te dar parabéns.`,
      c.marco! <= 100
        ? 'As primeiras cem são as mais difíceis, porque é quando o hábito ainda está nascendo. Daqui para a frente, os números começam a mostrar onde você está forte e onde vale insistir.'
        : c.marco! <= 500
          ? 'Isso já não é teste, é constância. A essa altura, o maior ganho está nos pontos fracos: um tema com acerto baixo, treinado com calma, sobe rápido.'
          : 'Poucas pessoas chegam aqui. Você já viu boa parte do que as bancas gostam de perguntar, e o que separa uma boa nota de uma ótima, daqui em diante, é a revisão.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, `${N(c.marco!)} questões`, `${N(c.marco!)} questões respondidas`)],
    corpo: (c) => [
      `Vi que você acabou de passar das ${N(c.marco!)} questões no Orto Questões.`,
      c.pct !== null ? `E com ${c.pct}% de acerto. Cada uma dessas questões é um tema a mais que você viu antes da prova.` : 'Cada uma delas é um tema a mais que você viu antes da prova.',
      `Para comemorar do jeito certo, uma passada na Revisão: ${c.link('revisao')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'um marco bonito', 'Um marco bonito')],
    corpo: (c) => [
      `${cap(N(c.marco!))} questões. Não acontece por acaso: é a soma de muitos dias em que você escolheu estudar, mesmo com sono.`,
      c.obs(2),
      'Parabéns de verdade.',
    ] },
  { id: 'v4', requer: (c) => c.marco! >= 500, assuntos: (c) => [nm(c, 'isso é constância', 'Isso é constância')],
    corpo: (c) => [
      `Quando alguém passa das ${N(c.marco!)} questões, eu faço questão de escrever.`,
      J('Isso é constância.', c.obs(1), c.pct !== null ? `${c.pct}% de acerto, aliás.` : null),
      'Uma sugestão para a próxima etapa: releia os comentários das questões que você errou mais de uma vez. É onde estão os pontos que ainda escapam.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'parabéns pelas suas questões', 'Parabéns pelas suas questões')],
    corpo: (c) => [
      `Só um recado rápido: parabéns pelas ${N(c.marco!)} questões.`,
      c.ps(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, `${N(c.marco!)} questões, e contando`, `${N(c.marco!)} questões, e contando`)],
    corpo: (c) => [
      `Você passou das ${N(c.marco!)} questões, e eu quis registrar.`,
      c.marco! < 500
        ? 'O hábito já existe. Agora o que mais rende é a Revisão: as que você errou voltam no momento certo para virar acerto.'
        : 'A partir daqui, os pontos que faltam estão nos detalhes, e o Caderno de erros é o melhor mapa deles.',
      c.obs(1),
      c.fecho(),
    ] },
]

const opiniao: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'posso te pedir uma opinião?', 'Posso te pedir uma opinião?')],
    corpo: (c) => [
      c.r > 0 ? `Você já fez ${Q(c.r)} no Orto Questões, então ninguém melhor para me dizer o que está bom e o que dá para melhorar.` : 'Queria a sua opinião sobre o site.',
      'O que você mais usa? Sentiu falta de alguma coisa? Teve algum comentário que não ajudou? Pode responder do jeito que quiser, mesmo que seja uma linha. Eu leio todas.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'uma pergunta só', 'Uma pergunta só')],
    corpo: () => [
      'Uma pergunta só: se você pudesse mudar uma coisa no Orto Questões, o que seria?',
      'Responde aqui mesmo. As melhores ideias do site vieram assim.',
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'me ajuda a melhorar o site?', 'Me ajuda a melhorar o site?')],
    corpo: (c) => [
      J('Estou planejando as próximas melhorias do site e queria ouvir quem estuda de verdade por aqui.', c.obs(1)),
      'Três perguntas rápidas, responde só as que quiser:\n- O que faz você voltar ao site?\n- O que te irrita?\n- O que você gostaria que existisse?',
      'Obrigado desde já.',
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'sua opinião sincera', 'Sua opinião sincera')],
    corpo: () => [
      'Quero a sua opinião sincera, inclusive a ruim.',
      'Os comentários das questões estão ajudando? Estão longos demais, curtos demais? Tem alguma área em que você sente que o site está fraco?',
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
      'Queria te agradecer por estudar no Orto Questões. O site é um projeto independente e cresce no boca a boca, então um pedido: se você gosta, manda o seu link para os colegas da residência.',
      'Quando um colega cria a conta pelo seu link e responde 20 questões, vocês dois ganham 7 dias do plano completo. Vale para até 12 amigos.',
      `Seu link pessoal fica aqui: ${c.link('indicar')}`,
      'Muito obrigado.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'estudar junto rende mais', 'Estudar junto rende mais')],
    corpo: (c) => [
      'Estudar junto rende mais, e deixa o ranking mais disputado.',
      `Se tiver colegas se preparando para a prova, manda o seu link: quando alguém cria a conta por ele e responde 20 questões, vocês dois ganham 7 dias do plano completo. ${c.link('indicar')}`,
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
      `Um pedido: se o site te ajuda, conta para um colega. Pelo seu link, vocês dois ganham 7 dias do plano completo quando a pessoa responde 20 questões: ${c.link('indicar')}`,
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'manda para um colega?', 'Manda para um colega?')],
    corpo: (c) => [
      'Um pedido rápido: se o Orto Questões tem te ajudado, manda para um colega que esteja estudando também.',
      `Pelo seu link pessoal, quando a pessoa cria a conta e responde 20 questões, vocês dois ganham 7 dias do plano completo. Vale para até 12 amigos: ${c.link('indicar')}`,
      'Obrigado pela força.',
    ] },
]

const cronograma: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'conhece o cronograma?', 'Conhece o cronograma?'), 'Um plano até a prova'],
    corpo: (c) => [
      'Queria te apresentar uma coisa que o pessoal tem gostado bastante: o cronograma.',
      'Você diz a data da prova e o site monta a meta de cada dia e os temas de cada semana, começando pelo que mais cai no TEOT e no TARO. Se um dia você atrasar, ele recalcula. Se adiantar, alivia.',
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
      `Faltam ${D(c.diasTeot)} para o TEOT. Dá tempo de muita coisa, desde que haja um plano.`,
      `O cronograma do site faz esse plano com você: passa primeiro pelo que mais cai, se ajusta quando a semana aperta e termina com uma reta final de revisão. Veja a prévia do seu: ${c.link('cronograma')}`,
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'e se o plantão bagunçar a semana?', 'E se o plantão bagunçar a semana?')],
    corpo: (c) => [
      'Se você dá plantão, talvez já tenha pensado nisso: e se o plantão bagunçar a semana de estudo?',
      'Foi para isso que o cronograma ganhou o dia de plantão. Você marca, ele redistribui o que ficou para trás, sem quebrar o plano até a prova.',
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
  { id: 'v1', assuntos: (c) => [nm(c, `seu acesso termina ${dataCurta(c.pix?.fimEm) ? `em ${dataCurta(c.pix?.fimEm)}` : 'em breve'}`, `Seu acesso termina ${dataCurta(c.pix?.fimEm) ? `em ${dataCurta(c.pix?.fimEm)}` : 'em breve'}`)],
    corpo: (c) => {
      const d = Math.max(1, c.pix?.diasRestantes ?? 3), fim = dataCurta(c.pix?.fimEm), meses = mesesDoPlano(c.pix?.plano), plano = nomePlano(c.pix?.plano)
      return [
        `Passando para avisar: o seu plano${plano ? ` ${plano}` : ''}, pago no Pix, termina ${fim ? `em ${fim}` : `daqui a ${D(d)}`}. Como o Pix não renova sozinho, este é o lembrete.`,
        `Se quiser continuar, pode renovar já, sem perder nenhum dia: os ${D(d)} que faltam continuam valendo e o período novo começa quando o atual termina${meses ? `. Renovando hoje o mesmo plano, você fica com esses ${D(d)} mais ${meses}` : ''}.`,
        c.r > 0 ? `Suas ${Q(c.r)}${c.pct !== null ? `, os ${c.pct}% de acerto` : ''} e o caderno de erros ficam guardados de qualquer jeito.` : null,
        `A renovação fica na página de planos: ${c.link('assinatura')}`,
      ]
    } },
  { id: 'v2', assuntos: (c) => [nm(c, `faltam ${D(Math.max(1, c.pix?.diasRestantes ?? 3))} do seu plano`, `Faltam ${D(Math.max(1, c.pix?.diasRestantes ?? 3))} do seu plano`)],
    corpo: (c) => {
      const d = Math.max(1, c.pix?.diasRestantes ?? 3), fim = dataCurta(c.pix?.fimEm)
      return [
        `Faltam ${D(d)} para acabar o acesso que você pagou no Pix${fim ? ` (vai até ${fim})` : ''}.`,
        c.fatos.semana ? `Vi que você fez ${Q(c.fatos.semana)} só na última semana, então quis avisar com antecedência para o ritmo não quebrar.` : 'Quis avisar com antecedência para o seu estudo não parar no meio.',
        `Renovando agora, os dias que faltam não se perdem: o período novo começa quando o atual termina. Fica tudo na página de planos: ${c.link('assinatura')}`,
        'Prefere não precisar lembrar? No cartão, a assinatura renova sozinha e você cancela quando quiser em Minha conta.',
      ]
    } },
  { id: 'v3', assuntos: (c) => [nm(c, 'um lembrete sobre o seu Pix', 'Um lembrete sobre o seu Pix')],
    corpo: (c) => {
      const fim = dataCurta(c.pix?.fimEm)
      return [
        `Um lembrete rápido: o seu acesso pago no Pix vai até ${fim ?? 'os próximos dias'}.`,
        'Se quiser seguir estudando com tudo liberado, dá para renovar antes, sem perder os dias que ainda faltam.',
        `É pela página de planos: ${c.link('assinatura')}`,
        'Se tiver qualquer dúvida sobre o pagamento, me responde aqui.',
      ]
    } },
]

const pix_hoje: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'seu acesso termina hoje', 'Seu acesso termina hoje')],
    corpo: (c) => {
      const meses = mesesDoPlano(c.pix?.plano), plano = nomePlano(c.pix?.plano)
      return [
        `Hoje é o último dia do seu plano${plano ? ` ${plano}` : ''} pago no Pix.`,
        `Renovando hoje, você não fica nenhum dia sem acesso: o período novo começa quando o atual termina${meses ? ` e vale ${meses === '1 mês' ? '1 mês completo' : `${meses} completos`}` : ''}. Se renovar depois, ele começa no dia do pagamento.`,
        c.r > 0 ? `Suas ${Q(c.r)} e o caderno de erros ficam guardados, renovando ou não.` : null,
        `A renovação fica aqui: ${c.link('assinatura')}`,
      ]
    } },
  { id: 'v2', assuntos: (c) => [nm(c, 'último dia do seu plano', 'Último dia do seu plano')],
    corpo: (c) => [
      'Só para não ter surpresa amanhã: o seu acesso pago no Pix termina hoje.',
      `Se quiser continuar, renovar hoje mantém tudo sem interrupção, inclusive a fila da Revisão. É pela página de planos: ${c.link('assinatura')}`,
      'E se preferir não renovar, obrigado pelo tempo de assinatura. Seu progresso fica guardado.',
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'hoje termina o seu Pix', 'Hoje termina o seu Pix')],
    corpo: (c) => [
      'Hoje termina o acesso do seu plano pago no Pix.',
      c.r > 0 ? `Você construiu bastante coisa aqui: ${Q(c.r)}${c.pct !== null ? `, com ${c.pct}% de acerto` : ''}. Seria bom não deixar a Revisão esfriar.` : null,
      `Renovando hoje, o período novo emenda no atual: ${c.link('assinatura')}`,
      'Qualquer dúvida, me responde.',
    ] },
]

const AREA_NOME = (slug: string, c: Ctx) => c.area(slug)?.em ?? slug
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
        `${r.frase}, você não respondeu questões por aqui. Tudo bem: acontece, e nada do que você já fez se perdeu.`,
        r.totalAcumulado > 0 ? `Suas ${Q(r.totalAcumulado)} continuam guardadas, e a Revisão já separou as que vale rever.` : null,
        `Para recomeçar, dez questões e a Revisão do dia já colocam tudo nos trilhos: ${c.link('revisao')}`,
      ]
      const acerto = r.certas + r.erradas > 0 ? Math.round((100 * r.certas) / (r.certas + r.erradas)) : null
      const diff = acerto !== null && r.acertoAnterior !== null ? acerto - r.acertoAnterior : null
      return [
        `${r.frase}, você respondeu ${Q(r.respostas)} em ${D(Math.max(1, r.diasAtivos))} de estudo${acerto !== null && r.respostas >= 10 ? `, com ${acerto}% de acerto` : ''}.${diff !== null && r.respostas >= 10 ? diff > 0 ? ` São ${diff} pontos a mais que no período anterior.` : diff < 0 ? ` Ficou ${-diff} ${-diff === 1 ? 'ponto' : 'pontos'} abaixo do período anterior, o que é normal quando se entra em tema novo.` : ' O mesmo acerto do período anterior.' : ''}`,
        r.subiram.length ? `O que mais subiu: ${r.subiram.map((t) => `${AREA_NOME(t.slug, c)} (de ${t.antes}% para ${t.agora}%)`).join(', ')}.` : null,
        r.cairam.length ? `O que caiu um pouco: ${r.cairam.map((t) => `${AREA_NOME(t.slug, c)} (de ${t.antes}% para ${t.agora}%)`).join(', ')}.` : null,
        r.simulado ? `No ${r.simulado.titulo}, você fez ${r.simulado.acertos} de ${r.simulado.total}.` : null,
        r.maisFraco && r.maisFraco.acerto < 70
          ? `Para o próximo período, eu começaria por ${AREA_NOME(r.maisFraco.slug, c)}: foi o seu menor acerto (${r.maisFraco.acerto}%), e é onde cada sessão mais faz a nota subir. ${c.link('treinar')}`
          : `Para o próximo período, vale manter a Revisão em dia e abrir um tema que você ainda não viu: ${c.link('revisao')}`,
      ]
    } },
  { id: 'v2', requer: (c) => (c.relatorio?.respostas ?? 0) > 0, assuntos: (c) => [nm(c, `como foi o seu estudo ${c.relatorio!.em}`, `Como foi o seu estudo ${c.relatorio!.em}`)],
    corpo: (c) => {
      const r = c.relatorio!
      const acerto = r.certas + r.erradas > 0 ? Math.round((100 * r.certas) / (r.certas + r.erradas)) : null
      return [
        `Passando com o seu resumo: ${Q(r.respostas)} ${r.em}, em ${D(Math.max(1, r.diasAtivos))}.${acerto !== null && r.respostas >= 10 ? ` Acerto de ${acerto}%.` : ''}`,
        r.respostasAnterior > 0 ? (r.respostas > r.respostasAnterior ? `Foi mais do que no período anterior (${Q(r.respostasAnterior)}). Bom sinal.` : r.respostas < r.respostasAnterior ? `Foi um pouco menos que no período anterior (${Q(r.respostasAnterior)}), mas o que conta é não parar.` : null) : null,
        r.subiram.length ? `Destaque para ${AREA_NOME(r.subiram[0].slug, c)}, que foi de ${r.subiram[0].antes}% para ${r.subiram[0].agora}%.` : null,
        r.totalAcumulado > 0 ? `No total, já são ${Q(r.totalAcumulado)} diferentes.` : null,
        r.maisFraco && r.maisFraco.acerto < 70 ? `Próximo passo: ${AREA_NOME(r.maisFraco.slug, c)} (${r.maisFraco.acerto}%). ${c.link('treinar')}` : `Próximo passo: manter a Revisão em dia. ${c.link('revisao')}`,
      ]
    } },
  { id: 'v3', requer: (c) => (c.relatorio?.respostas ?? 0) > 0, assuntos: (c) => [nm(c, 'seus números, em poucas linhas', 'Seus números, em poucas linhas')],
    corpo: (c) => {
      const r = c.relatorio!
      const acerto = r.certas + r.erradas > 0 ? Math.round((100 * r.certas) / (r.certas + r.erradas)) : null
      return [
        `Seus números ${r.rotulo}, em poucas linhas:`,
        [
          `- ${cap(Q(r.respostas))} em ${D(Math.max(1, r.diasAtivos))}`,
          acerto !== null && r.respostas >= 10 ? `- ${acerto}% de acerto${r.acertoAnterior !== null ? ` (antes: ${r.acertoAnterior}%)` : ''}` : null,
          r.subiram.length ? `- Subiu: ${r.subiram.map((t) => AREA_NOME(t.slug, c)).join(', ')}` : null,
          r.cairam.length ? `- Vale rever: ${r.cairam.map((t) => AREA_NOME(t.slug, c)).join(', ')}` : null,
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

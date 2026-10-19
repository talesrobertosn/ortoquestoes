/**
 * As versões das cartas, escritas à mão e reescritas do zero em 17/10/2026 a pedido do
 * Tales (docs/emails/PLANO.md): a voz é a de um amigo que já passou pela residência,
 * lembra do plantão, do cansaço e da falta de tempo, e escreve a partir disso.
 *
 * Espinha de toda carta (o motor completa o que faltar):
 *   1. abertura com uma frase sobre o momento da pessoa (prova, etapa, horário, rotina);
 *   2. o que eu vi no estudo dela (até 3 observações, só com dado que existe);
 *   3. uma ideia prática sobre tempo, praticidade ou estudar fácil;
 *   4. um convite leve, quando couber (um link, no máximo);
 *   5. fecho afetuoso;
 *   6. P.S. humano (o motor põe um se a versão não escrever o seu).
 * De 6 a 9 linhas em parágrafos curtos, nunca mais de 12. Assunto com o nome e algo da
 * pessoa, até 55 caracteres, sem emoji.
 *
 * TOM (docs/emails/TOM.md): calor humano, elogio honesto e específico, nunca criticar nem
 * expor número ruim (abaixo de 50% nada de porcentagem: use c.pctBom), sugestão em vez de
 * ordem, dar antes de pedir, convite sem pressão, sem preço, sem "grátis", sem gênero
 * presumido. Regra dos 10: nenhum número de questões abaixo de 10 (c.dez diz se pode;
 * c.q já vem como "260 questões" ou "os primeiros passos"). Números pequenos de questões
 * sempre por extenso ("cinco questões", "dez minutos").
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
  /** P.S. próprio (senão o motor escolhe um humano ou com um fato). */
  ps?: (c: Ctx) => string
  assuntos: (c: Ctx) => Pedaco[]
  corpo: (c: Ctx) => Pedaco[]
}

const N = (n: number) => Math.round(n).toLocaleString('pt-BR')
/** Só para números a partir de 10 (quem chama confere c.dez ou o valor). */
const Q = (n: number) => (n >= 10 ? `${N(n)} questões` : 'os primeiros passos')
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
  return s === 1 ? 'uma semana' : s === 2 ? 'duas semanas' : s === 3 ? 'três semanas' : s === 4 ? 'um mês' : `${N(s)} semanas`
}
/** "faz X" para quem está parado (nunca devolve zero). */
const tempoFora = (d: number | null | undefined) => {
  const v = Math.max(1, Math.round(Number(d) || 1))
  if (v < 14) return v === 1 ? 'um dia' : `${N(v)} dias`
  if (v < 60) return semanas(v)
  return v < 120 ? 'uns dois meses' : 'alguns meses'
}
/** "260 questões já respondidas" ou "os primeiros passos já dados". */
const jaFez = (c: Ctx) => (c.dez ? `${Q(c.r)} já respondidas` : 'os primeiros passos já dados')
/** Para o meio de frase: "as suas 260 questões" / "o que você já fez". */
const asSuas = (c: Ctx) => (c.dez ? `as suas ${Q(c.r)}` : 'o que você já fez')
/** Começo de frase, com o verbo concordando: "Suas 260 questões estão guardadas" / "O que você já fez está guardado". */
const guardado = (c: Ctx) => (c.dez ? `Suas ${Q(c.r)} estão guardadas` : 'O que você já fez está guardado')

/**
 * Abertura com o momento da pessoa: prova e dias, etapa, horário, serviço; quando não há
 * dado, uma frase sobre a rotina de quem estuda para prova de título. Gasta o fato usado.
 */
const momento = (c: Ctx): string => {
  const f = c.fatos
  if (f.cronograma && !c.usados.has('cronograma')) {
    c.usados.add('cronograma')
    const prova = f.cronograma.prova ? `o ${f.cronograma.prova}` : 'a sua prova'
    return c.um(
      `Vi que ${prova} está a ${D(f.cronograma.dias)}. Sei como esse número fica na cabeça, entre um plantão e outro.`,
      `Faltam ${D(f.cronograma.dias)} para ${prova}, pelo seu cronograma. Penso nisso quando te escrevo.`,
    )
  }
  const etapa = c.fato('etapa')
  if (etapa && c.chance(0.7)) return etapa
  const horario = c.fato('horario')
  if (horario) return horario
  if (etapa) return etapa
  return c.um(
    'Imagino que a rotina esteja puxada por aí: hospital de dia, estudo quando sobra.',
    'Sei como é estudar para prova de título com o dia já cheio. Eu passei por isso, e lembro do cansaço.',
    'Espero que a semana esteja sendo leve, ou pelo menos possível. Residência raramente deixa ser mais do que isso.',
    'Passei para te escrever num intervalo meu, imaginando que você também lê isso num intervalo seu.',
  )
}
const diasProva = (c: Ctx) => (c.diasProva !== null && c.diasProva >= 1 ? D(c.diasProva) : null)

// ---------------------------------------------------------------------------
// Pessoas ativas, uma voz por faixa de acerto
// ---------------------------------------------------------------------------

const assuntosAtivo = (c: Ctx, extras: Pedaco[]): Pedaco[] => [
  nm(c, 'lembrei de você hoje', 'Lembrei de você hoje'),
  nm(c, 'uma coisa que vi no seu estudo', 'Uma coisa que vi no seu estudo'),
  c.dez && nm(c, `sobre as suas ${Q(c.r)}`, `Sobre as suas ${Q(c.r)}`),
  c.fatos.melhorArea && nm(c, `${c.area(c.fatos.melhorArea.slug).em} e você`, `Parabéns por ${c.area(c.fatos.melhorArea.slug).em}`),
  c.fatos.ranking && nm(c, `${c.fatos.ranking}º no ranking`, `${c.fatos.ranking}º no ranking`),
  c.fatos.horario === 'noite' && nm(c, 'estudando à noite', 'Estudando à noite'),
  diasProva(c) && nm(c, `faltam ${diasProva(c)} e eu estou na torcida`, `Faltam ${diasProva(c)} e eu estou na torcida`),
  ...extras,
]

// Faixas abaixo de 40%: acolhimento, esperança e uma ideia pequena oferecida como presente.
// Nenhuma porcentagem, nenhum "acerto baixo": o que se reconhece é o esforço e o tempo encontrado.

const ativo_0_10: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'uma ideia para o seu estudo', 'Uma ideia para o seu estudo')]),
    corpo: (c) => [
      momento(c),
      `Estava olhando quem anda estudando por aqui e parei no seu nome: ${jaFez(c)}. Questão de prova de título é difícil para todo mundo, e você está encarando. Isso é o que importa agora.`,
      'Uma ideia que ajuda muito nessa fase: escolher um tema só e fazer cinco questões com calma, lendo o comentário de cada alternativa. Dez minutos. Parece pouco, mas é assim que a matéria começa a ficar.',
      c.obs(1),
      `Se quiser experimentar hoje, o tema fica à sua escolha aqui: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'como está sendo o seu estudo?', 'Como está sendo o seu estudo?'), nm(c, 'posso te ajudar em algo?', 'Posso te ajudar em algo?')],
    corpo: (c) => [
      momento(c),
      'Queria saber como está sendo o seu estudo por aqui. Pergunto de verdade, não por formalidade.',
      'Todo mundo que passou na prova começou exatamente onde você está: achando as questões difíceis e o tempo curto. Às vezes um ajuste pequeno no jeito de estudar faz muita diferença, e eu gostaria de te ajudar a encontrar o seu.',
      c.tempo(),
      'Se quiser, me responde contando como costuma fazer as questões e quanto tempo tem por dia. Eu leio tudo e respondo pessoalmente.',
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'um método para dez minutos', 'Um método para dez minutos'), nm(c, 'cinco questões com calma', 'Cinco questões com calma')],
    corpo: (c) => [
      momento(c),
      c.obs(1) ?? `Vi que você já passou por ${c.dez ? Q(c.r) : 'algumas questões'} no Orto Questões, e quis te escrever.`,
      'Queria te passar um jeito de estudar que cabe em dez minutos: escolha um tema só, faça cinco questões lendo o enunciado inteiro e, depois de cada uma, leia o comentário de todas as alternativas. No dia seguinte, abra a Revisão antes de qualquer questão nova.',
      `É pouco de cada vez, e é exatamente por isso que funciona na rotina de hospital. A Revisão fica aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'todo mundo começa assim', 'Todo mundo começa assim'), nm(c, 'sobre o começo', 'Sobre o começo')],
    corpo: (c) => [
      momento(c),
      'Queria te contar uma coisa: todo mundo que passou na prova de título começou achando as questões impossíveis. A banca gosta de detalhe de classificação, de exceção, de nome próprio. Faz parte do caminho, e não diz nada sobre o seu futuro.',
      `E o que eu vi no seu histórico me deixou feliz: ${jaFez(c)}. Dá para ver que você é de quem não desiste.`,
      c.dica(),
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'o site está funcionando para você?', 'O site está funcionando para você?')],
    corpo: (c) => [
      momento(c),
      'Escrevo porque gostaria de saber como o site está funcionando para você. Se alguma coisa estiver confusa, é comigo mesmo que você fala.',
      `Uma sugestão que costuma deixar tudo mais leve no começo: ir pelos conceitos básicos. São questões mais diretas, ajudam a pegar o jeito da banca e cabem em qualquer intervalo. Dá para escolher o tema aqui: ${c.link('treinar')}`,
      c.tempo(),
      'E se preferir me contar o que está pegando, é só responder. Respondo pessoalmente.',
    ] },
  { id: 'v6', requer: temFatos, assuntos: (c) => assuntosAtivo(c, [nm(c, 'menos questões, mais comentário', 'Menos questões, mais comentário')]),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      'Queria te dizer que estou acompanhando o seu começo com carinho. Cada questão que você faz agora, mesmo a que te pega, está construindo a base que vai te levar até a prova.',
      'Uma ideia para a próxima sessão, se fizer sentido: fazer menos e ler mais. Dez questões com o comentário lido com calma rendem mais do que trinta corridas, e cabem num intervalo.',
      c.fecho(),
    ] },
]

const ativo_10_20: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'errar aqui é o melhor jeito', 'Errar aqui é o melhor jeito de acertar lá')]),
    corpo: (c) => [
      momento(c),
      `Vi que você já tem ${c.dez ? Q(c.r) : 'os primeiros passos dados'} no Orto Questões, e quis passar para conversar um pouco.`,
      'Cada questão que te pega aqui é um presente: mostra exatamente o que vale estudar antes da prova. Errar aqui é o melhor jeito de acertar lá, e custa só uns minutos.',
      `Uma sugestão, se fizer sentido para você: abrir o Caderno de erros e refazer algumas com calma. Quando uma questão que te pegou vira acerto, ela vale mais do que dez novas. Fica aqui: ${c.link('erros')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => assuntosAtivo(c, [nm(c, 'questão de prova é difícil mesmo', 'Questão de prova é difícil mesmo')]),
    corpo: (c) => [
      momento(c),
      `Questão de prova de ortopedia é difícil, às vezes muito. E você está encarando com coragem: ${jaFez(c)}.`,
      c.obs(1),
      'O que mais ajuda nessa fase é voltar nas questões que te pegaram até elas virarem certeza. É um ajuste pequeno, não pede mais tempo, só muda a ordem: primeiro a Revisão, depois o novo.',
      `Se der hoje, que tal só a Revisão do dia? É rápida e é onde o estudo mais rende: ${c.link('revisao')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'um tema por semana', 'Um tema por semana'), nm(c, 'uma estratégia simples', 'Uma estratégia simples')],
    corpo: (c) => [
      momento(c),
      'Fiquei feliz de ver que você continua estudando por aqui, mesmo com a rotina que imagino.',
      'Pensei numa estratégia que talvez combine com você: um tema por semana. Em vez de pular de área em área, ficar alguns dias num só. A sensação de progresso aparece bem mais rápido, e a cabeça cansada agradece por não ter que decidir todo dia.',
      c.dica(),
      `Dá para escolher o tema aqui: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'o que eu vejo no seu estudo', 'O que eu vejo no seu estudo')],
    corpo: (c) => [
      momento(c),
      `Sabe o que eu vejo quando olho o seu estudo? Alguém que ${c.dez ? `já respondeu ${Q(c.r)}` : 'já começou'} e segue em frente, mesmo com sono. É isso que mais conta lá na frente.`,
      'Os comentários de cada alternativa foram escritos pensando justamente nessa fase. Uma ideia que ajuda: ler por que cada alternativa está certa ou errada, não só a resposta. É ali que mora a pegadinha da banca, e é ali que o estudo começa a render.',
      c.obs(1),
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'topa um desafio pequeno?', 'Topa um desafio pequeno?'), nm(c, 'sete dias, dez questões', 'Sete dias, dez questões')],
    corpo: (c) => [
      momento(c),
      c.obs(1),
      'Queria te propor um desafio pequeno, se você topar: nos próximos sete dias, dez questões por dia, sempre lendo o comentário inteiro. Dez minutos, no intervalo que der.',
      'Não é para ver quantas acerta. É para sentir como o estudo fica mais leve quando vira rotina em vez de maratona.',
      'Depois me conta como foi? Vou adorar saber.',
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'estou torcendo por você', 'Estou torcendo por você'), nm(c, 'um recado curto', 'Um recado curto')],
    corpo: (c) => [
      momento(c),
      'Escrevo rapidinho só para dizer que acompanho o seu estudo e estou torcendo por você.',
      'Toda base começa assim, um pouco de cada vez. E você está construindo a sua nos intervalos que a rotina deixa, o que vale o dobro.',
      'Um truque que ajuda: antes de olhar as alternativas, tente dizer a resposta de cabeça. Treina o raciocínio de prova e não gasta um minuto a mais.',
      c.obs(1),
    ] },
]

const ativo_20_30: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'uma técnica para as alternativas', 'Uma técnica para as alternativas'), nm(c, 'descarte antes de escolher', 'Descarte antes de escolher')],
    corpo: (c) => [
      momento(c),
      `Vi que você já está com ${jaFez(c)}, e quis te mandar uma técnica que costuma ajudar muito nessa fase.`,
      'Você já reconhece os temas, e agora o que mais rende é a leitura das alternativas. Antes de escolher a certa, descarte mentalmente as que você sabe que não são. A questão fica bem mais leve, e isso vale ouro na prova, quando o tempo aperta.',
      'Junto com a Revisão das questões que te pegaram, isso costuma fazer o estudo render mais rápido do que parece.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => assuntosAtivo(c, [nm(c, 'uma fase, não um veredito', 'Uma fase, não um veredito')]),
    corpo: (c) => [
      momento(c),
      c.obs(1) ?? 'Passei para ver como estava o seu estudo, e fiquei feliz com o que vi: você continua aparecendo.',
      'Queria te dizer uma coisa com carinho: o começo do estudo para prova de título é sempre assim, e é uma fase, não um veredito. Todo mundo que passou viveu isso, inclusive eu.',
      `Uma sugestão, se fizer sentido: escolher o tema que mais te desafia e ficar só nele por uns dias. Concentrar ajuda a enxergar os padrões da banca, e poupa o tempo de decidir o que estudar. Dá para escolher aqui: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'o comentário é o melhor professor', 'O comentário é o melhor professor')],
    corpo: (c) => [
      momento(c),
      'Uma coisa que talvez ninguém tenha te contado: o comentário da questão ensina mais justamente quando ela te pega.',
      `${c.dez ? `Você já tem ${Q(c.r)} respondidas, o que é muito material.` : 'Você já começou, e cada questão é material.'} Lendo com calma o comentário de cada alternativa nas próximas, o estudo começa a responder. Não é mágica, é repetição, e você já mostrou que tem constância para isso.`,
      c.dica(),
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'eu vi o seu esforço', 'Eu vi o seu esforço')],
    corpo: (c) => [
      momento(c),
      `Só para dizer que eu vi o seu esforço: ${jaFez(c)}. Isso é muita dedicação para quem tem o dia tomado.`,
      'Uma coisa que eu faria no seu lugar: manter a Revisão em dia nas próximas semanas. Ela traz de volta, no momento certo, o que te pegou, e é ali que a matéria fica. Dez minutos por dia bastam.',
      `A Revisão fica aqui: ${c.link('revisao')}`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'agora é só calibrar', 'Agora é só calibrar'), nm(c, 'um ajuste pequeno', 'Um ajuste pequeno')],
    corpo: (c) => [
      momento(c),
      c.fatos.semana ? 'Você está estudando com constância, e essa é a parte mais difícil de toda preparação. Parabéns por isso.' : 'Você já criou o hábito de abrir o site, e essa é a parte mais difícil de toda preparação. Parabéns por isso.',
      'Agora é só calibrar: um pouco menos de questão nova e um pouco mais de revisão. Mesmo tempo, outra ordem. É assim que o estudo começa a sobrar em vez de faltar.',
      c.obs(1),
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'me conta uma coisa?', 'Me conta uma coisa?')],
    corpo: (c) => [
      momento(c),
      'Me conta uma coisa: quando uma questão te pega, você costuma ter tempo de ler o comentário até o fim?',
      'Pergunto porque é ali que costuma estar o maior ganho. O comentário explica cada alternativa, e a pegadinha da banca quase sempre está numa delas. Ler até o fim leva um minuto a mais e economiza uma questão na prova.',
      c.obs(1),
      'Se quiser testar nas próximas dez, me diz depois se fez diferença? Fico curioso para saber.',
    ] },
]

const ativo_30_40: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'a base está aparecendo', 'A base está aparecendo')]),
    corpo: (c) => [
      momento(c),
      `Vi que você já passou de ${jaFez(c)}, e queria te dar uma boa notícia: a base está aparecendo.`,
      'Nessa fase, a gente já vai bem no que estudou, e o que escapa é o que ainda não viu. É um ótimo sinal: quer dizer que o estudo está funcionando, e que o tempo que você arranca da rotina está valendo.',
      `O próximo passo, se fizer sentido, é transformar as questões que te pegaram em acertos. O Caderno de erros guarda todas elas, e vale refazer com calma: ${c.link('erros')}`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      'Seu estudo está a caminho de um patamar novo, e daqui para a frente cada revisão conta muito mais do que cada questão nova.',
      c.dica(),
      c.tempo(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'você está na virada', 'Você está na virada')],
    corpo: (c) => [
      momento(c),
      'Passei para dizer que está tudo certo com o seu ritmo. Gosto muito do que estou vendo.',
      'Uma comparação de que eu gosto: os primeiros acertos vêm do que você já sabia; os próximos vêm do que você aprende com as questões que te pegam. Você está bem na virada.',
      `Que tal começar pela Revisão do dia, antes das questões novas? São uns dez minutos, e é onde o estudo mais rende agora: ${c.link('revisao')}`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'uma dica curta', 'Uma dica curta'), nm(c, 'um tema só nesta semana', 'Um tema só nesta semana')],
    corpo: (c) => [
      momento(c),
      'Uma dica curta, de presente: escolher a área que mais te desafia e fazer dez questões dela por semana, até o fim do mês.',
      c.fato('areaFraca') ?? 'Concentrar num tema por vez deixa os padrões da banca bem mais claros, e poupa o tempo de ficar decidindo o que estudar cada dia.',
      c.obs(1),
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'um empurrãozinho', 'Um empurrãozinho'), nm(c, 'a revisão que vale ouro', 'A revisão que vale ouro')],
    corpo: (c) => [
      momento(c),
      'Vi o seu estudo por aqui e quis te mandar um empurrãozinho.',
      `Com ${asSuas(c)}, você já tem material para a revisão que mais rende. Que tal, amanhã, abrir a Revisão do dia antes das questões novas? Leva poucos minutos e protege o que você já conquistou.`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'rende mais do que parece', 'O seu estudo rende mais do que parece')],
    corpo: (c) => [
      momento(c),
      'Escrevo porque gosto de acompanhar quem está construindo a base, e é isso que eu vejo no seu caso.',
      'Os números costumam mostrar o que a gente aprendeu com algumas semanas de atraso. O que você está estudando agora vai aparecer lá na frente. Siga no seu ritmo, mesmo que seja pouco por dia.',
      c.obs(1),
      c.tempo(),
      c.fecho(),
    ] },
]

// Faixa média: encorajamento caloroso. A porcentagem só aparece de 50% para cima (c.pctBom).

const ativo_40_60: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'a fase em que mais dá para crescer', 'A fase em que mais dá para crescer')]),
    corpo: (c) => [
      momento(c),
      `Olhei o seu estudo com calma e vi ${jaFez(c)}, com uma base que já aparece.`,
      'Você está na fase em que mais dá para crescer. Já tem base para aproveitar bem os comentários, e cada questão revisada agora vira ponto na prova. É a fase mais barata em tempo: pouco esforço, muito retorno.',
      c.dica(),
      `A Revisão do dia fica aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      c.pctBom !== null
        ? `Seu acerto está em ${c.pctBom}%, já passando da metade. Daqui, o que mais rende é dar uma atenção especial, por alguns dias, ao tema que mais te desafia.`
        : 'Você está bem no meio do caminho, que é onde mais dá para crescer. Daqui, o que mais rende é dar uma atenção especial, por alguns dias, ao tema que mais te desafia.',
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma dica que pode virar o jogo', 'Uma dica que pode virar o jogo')],
    corpo: (c) => [
      momento(c),
      'Uma dica que pode virar o jogo para você: refazer as questões que te pegaram antes de partir para as novas. Parece contraintuitivo, mas é o caminho mais curto para subir, e não pede um minuto a mais do seu dia.',
      `O Caderno de erros guarda todas: ${c.link('erros')}`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'parabéns pela constância', 'Parabéns pela constância')],
    corpo: (c) => [
      momento(c),
      `Parabéns pela constância. ${cap(jaFez(c))}, e dá para ver que você aparece mesmo nas semanas difíceis.`,
      c.pctBom !== null ? `Com ${c.pctBom}% de acerto, você já está do lado de cima da metade. Agora é o tema que mais te desafia que vai puxar o resto para cima.` : 'Agora é a fase em que cada revisão vale mais do que uma questão nova, e isso é uma boa notícia para quem tem pouco tempo.',
      c.obs(1),
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'uma pergunta sobre o seu estudo', 'Uma pergunta sobre o seu estudo')],
    corpo: (c) => [
      momento(c),
      'Uma pergunta: você costuma estudar com a Revisão aberta antes das questões novas, ou vai direto para o novo?',
      'Pergunto porque, nessa fase, a Revisão é o atalho. Ela traz de volta, no momento certo, as questões que te pegaram, e cada uma que vira acerto é um ponto garantido na prova. Dez minutos por dia bastam.',
      c.obs(1),
      `Se quiser experimentar amanhã: ${c.link('revisao')}`,
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'o que eu faria no seu lugar', 'O que eu faria no seu lugar')],
    corpo: (c) => [
      momento(c),
      `Olhando ${asSuas(c)}, pensei no que eu faria no seu lugar, e quis dividir.`,
      'Eu escolheria um horário fixo, mesmo que curto, e protegeria ele como protejo uma cirurgia marcada. Trinta minutos num horário certo valem mais que duas horas espalhadas, principalmente para quem está no meio do caminho.',
      c.obs(1),
      c.dica(),
      c.fecho(),
    ] },
  { id: 'v7', requer: (c) => !!c.fatos.areaFraca, assuntos: (c) => [nm(c, 'um tema para as próximas semanas', 'Um tema para as próximas semanas')],
    corpo: (c) => [
      momento(c),
      `Olhei ${asSuas(c)} com calma, e uma coisa me chamou a atenção.`,
      c.fato('areaFraca'),
      'Não é para estudar mais horas. É para escolher melhor onde gastar as que você tem. Dez questões por semana nesse tema, com o comentário lido, mudam o quadro em um mês.',
      `O tema fica à sua escolha aqui: ${c.link('treinar')}`,
      c.fecho(),
    ] },
]

const ativo_60_70: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'você está numa fase boa', 'Você está numa fase boa')]),
    corpo: (c) => [
      momento(c),
      J(`Duas coisas no seu histórico me chamaram a atenção: ${jaFez(c)}`, c.pctBom !== null ? `e ${c.pctBom}% de acerto. Isso não aparece por acaso.` : 'e uma constância que não aparece por acaso.'),
      c.obs(1),
      'Você está numa fase boa, em que o estudo já responde. O que mais rende agora é transformar os acertos com dúvida em certeza: ler o comentário mesmo quando acerta, e deixar a Revisão cuidar do resto.',
      `A Revisão fica aqui, para quando der: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      c.pctBom !== null ? `Com ${c.pctBom}% de acerto, você já está acima da metade com folga. Daqui, cada ponto vem de detalhe: o "exceto", a classificação menos comum, a alternativa que quase está certa.` : 'Daqui, cada ponto vem de detalhe: o "exceto", a classificação menos comum, a alternativa que quase está certa.',
      c.dica(),
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma ideia para o tema mais difícil', 'Uma ideia para o tema mais difícil')],
    corpo: (c) => [
      momento(c),
      `Fiquei feliz de ver ${asSuas(c)}. É volume de quem senta e faz, mesmo com sono.`,
      c.fato('areaFraca') ?? 'Uma ideia para as próximas semanas: escolher o tema em que você menos confia e dar dez questões por semana a ele. É onde cada sessão vai render mais agora, e cabe num intervalo.',
      c.tempo(),
      `O tema fica à sua escolha aqui: ${c.link('treinar')}`,
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'proteja o que você já conquistou', 'Proteja o que você já conquistou')],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ''}. Isso é estudo de verdade, feito nos intervalos que a rotina deixa.`,
      'Uma lembrança gentil para essa fase: matéria bem sabida também esfria se ficar parada. A Revisão em dia protege o que você conquistou, e custa menos tempo do que aprender de novo.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'um pedido pequeno', 'Um pedido pequeno')],
    corpo: (c) => [
      momento(c),
      `Você já tem ${jaFez(c)}, então conhece o site melhor do que muita gente. Por isso tenho um pedido pequeno.`,
      'Se algum comentário te deixou com dúvida, ou se alguma questão parece ter algo estranho, me conta. Tem um botão de relatar em cada questão, e eu leio cada relato pessoalmente. É assim que o banco melhora para você e para quem vem depois.',
      c.obs(1),
      'E obrigado por estudar por aqui. Fico feliz de ver.',
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'o que muda daqui para a frente', 'O que muda daqui para a frente')],
    corpo: (c) => [
      momento(c),
      'Queria te contar o que muda daqui para a frente, porque pouca gente avisa.',
      'Até aqui, o estudo rende por volume: quanto mais questão, mais tema visto. A partir de agora, rende por precisão: a questão que te pega pela segunda vez vale mais do que dez novas. É uma mudança boa para quem tem pouco tempo, porque pede menos horas e mais atenção.',
      c.obs(1),
      `O Caderno de erros é o melhor mapa dessa fase: ${c.link('erros')}`,
      c.fecho(),
    ] },
]

const ativo_70_80: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'que estudo bonito', 'Que estudo bonito')]),
    corpo: (c) => [
      momento(c),
      J(`Uma coisa no seu histórico me chamou a atenção: ${jaFez(c)}`, c.pctBom !== null ? `com ${c.pctBom}% de acerto. Isso é de quem senta e faz, mesmo com sono.` : 'com uma constância que é de quem senta e faz, mesmo com sono.'),
      c.obs(1),
      'Nesse nível, o que mais rende é ler o comentário mesmo quando acerta. Às vezes ele traz um detalhe que a banca ainda vai cobrar, e você já estará com ele guardado.',
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      'Você está num patamar em que a maioria das pessoas já passa. O que separa uma boa nota de uma ótima, daqui para a frente, é a revisão do que ainda escapa, e não mais horas de estudo.',
      c.dica(),
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'como você estuda?', 'Como você estuda?')],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ''}. Fiquei curioso: como você estuda?`,
      'Pergunto porque gosto de aprender com quem está indo bem, e porque o jeito como você encaixa o estudo na rotina pode ajudar outras pessoas que me escrevem perguntando por onde começar.',
      c.obs(1),
      'Se tiver dois minutos, me responde contando. Prometo ler com atenção.',
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'o detalhe que ainda escapa', 'O detalhe que ainda escapa')],
    corpo: (c) => [
      momento(c),
      `Com ${asSuas(c)}, você já viu boa parte do que a banca gosta de perguntar. Agora o jogo é outro.`,
      'Os pontos que faltam estão nos detalhes: o "exceto" no enunciado, a classificação menos comum, a alternativa que quase está certa. Uma ideia: misturar provas e temas na mesma sessão, para reconhecer o assunto sem pista, como no dia da prova.',
      c.obs(1),
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'um pedido de quem cuida do site', 'Um pedido de quem cuida do site')],
    corpo: (c) => [
      momento(c),
      `Você está entre as pessoas que mais aproveitam o site${c.pctBom !== null ? `: ${jaFez(c)}, ${c.pctBom}% de acerto` : `: ${jaFez(c)}`}. Por isso tenho um pedido.`,
      'Se encontrar alguma questão com algo estranho, ou um comentário que poderia ser melhor, me avisa pelo botão de relatar. Quem está nesse nível enxerga o que escapa a todo mundo, e cada relato melhora o banco para quem vem depois.',
      c.obs(1),
      'Obrigado, de verdade, por estudar por aqui.',
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'proteger o que já está forte', 'Proteger o que já está forte')],
    corpo: (c) => [
      momento(c),
      c.fato('melhorArea') ?? `${cap(jaFez(c))}. Dá para ver que você já tem temas em que está muito forte.`,
      'Uma coisa que eu faria no seu lugar: manter esses temas aquecidos só com a Revisão, que leva poucos minutos, e usar o tempo novo nos outros. Assim você chega na prova sem perder nada do que já conquistou.',
      c.obs(1),
      `A Revisão fica aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
]

const ativo_80_90: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'parabéns, de verdade', 'Parabéns, de verdade')]),
    corpo: (c) => [
      momento(c),
      J(`${cap(jaFez(c))}`, c.pctBom !== null ? `com ${c.pctBom}% de acerto. Parabéns, de verdade.` : 'e um estudo que dá gosto de ver. Parabéns, de verdade.'),
      c.obs(2),
      'Nesse nível, o que ainda escapa é pouco e específico. As questões que te pegam uma segunda vez são as mais valiosas da sua lista: vale dar um carinho especial a elas, e só a elas.',
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      'Pouca gente chega aqui, e eu queria que você soubesse que eu vi. Agora é cuidar para a reta final não virar ansiedade: menos conteúdo novo, mais revisão e, principalmente, sono.',
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'me ensina uma coisa?', 'Me ensina uma coisa?')],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? ` e ${c.pctBom}% de acerto` : ''}. Queria te pedir uma coisa diferente: me ensina como você estuda?`,
      'Muita gente me escreve perguntando por onde começar, e eu adoraria responder com o exemplo de alguém de verdade. Horário, ordem, o que faz quando uma questão te pega. O que você quiser contar.',
      c.obs(1),
      'É só responder este e-mail. Vou guardar com carinho.',
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'uma ideia para quem já está forte', 'Uma ideia para quem já está forte')],
    corpo: (c) => [
      momento(c),
      `Com ${asSuas(c)}, você já está no nível em que a prova se decide no detalhe.`,
      'Uma ideia para essa fase: misturar provas e temas na mesma sessão, como no dia da prova, e cronometrar. A banca não avisa o assunto, e treinar isso agora é o que faz a nota ótima virar segurança.',
      c.obs(1),
      c.dica(),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'quem você conhece que está nessa?', 'Quem você conhece que está nessa?')],
    corpo: (c) => [
      momento(c),
      `Você está entre as pessoas que mais rendem por aqui${c.pctBom !== null ? `: ${c.pctBom}% em ${Q(c.r)}` : `: ${jaFez(c)}`}. Por isso quis te pedir uma ajuda.`,
      'Quem você conhece que está estudando para a mesma prova e ainda não conhece o site? Estudar junto deixa tudo mais leve, e o ranking fica mais animado.',
      `Pelo seu link pessoal, quando a pessoa cria a conta e responde 20 questões, vocês dois ganham 7 dias do plano completo: ${c.link('indicar')}`,
      'Obrigado por estudar por aqui.',
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'cuida de você também', 'Cuida de você também')],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? `, ${c.pctBom}% de acerto` : ''}. Você já fez a parte difícil.`,
      'Agora o que mais protege a sua nota é dormir bem. A memória se consolida no sono, e quem chega na prova com a cabeça descansada acerta o detalhe que o cansaço esconde. Eu aprendi isso tarde demais, e por isso insisto.',
      c.obs(1),
      c.fecho(),
    ] },
]

const ativo_90_100: Versao[] = [
  { id: 'v1', assuntos: (c) => assuntosAtivo(c, [nm(c, 'isso é raro', 'Isso é raro')]),
    corpo: (c) => [
      momento(c),
      J(`${cap(jaFez(c))}`, c.pctBom !== null ? `com ${c.pctBom}% de acerto. Isso é raro, e eu quis registrar.` : 'com um acerto raro de ver. Eu quis registrar.'),
      c.obs(2),
      'Nesse nível, a única coisa que eu sugeriria é proteger o que está forte com a Revisão, que leva poucos minutos, e descansar. O resto você já faz melhor do que eu faria.',
      c.fecho(),
    ] },
  { id: 'v2', requer: temFatos, assuntos: (c) => assuntosAtivo(c, []),
    corpo: (c) => [
      momento(c),
      c.obs(2),
      'Não tenho nada a sugerir, só a agradecer pelo exemplo. Gente assim deixa o ranking e a turma inteira melhores.',
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'posso te pedir uma coisa?', 'Posso te pedir uma coisa?')],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? `, ${c.pctBom}% de acerto` : ''}. Pouquíssimas pessoas chegam aqui, e eu queria te pedir uma coisa.`,
      'Se encontrar qualquer questão com algo estranho, ou um comentário que você faria melhor, me conta pelo botão de relatar. Quem está nesse nível enxerga o que escapa a todo mundo, inclusive a mim.',
      c.obs(1),
      'E obrigado por estudar por aqui. É uma honra.',
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'como você estuda?', 'Como você estuda?')],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? ` e ${c.pctBom}% de acerto` : ''}. Fiquei curioso de verdade: como você estuda?`,
      'Horário, ordem, o que faz quando uma questão te pega. Muita gente me pergunta por onde começar, e eu adoraria responder com o exemplo de alguém que chegou onde você chegou.',
      c.obs(1),
      'É só responder. Vou ler com atenção e guardar.',
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'quem você conhece que está nessa?', 'Quem você conhece que está nessa?')],
    corpo: (c) => [
      momento(c),
      `Com ${asSuas(c)}${c.pctBom !== null ? ` e ${c.pctBom}% de acerto` : ''}, você conhece o site melhor do que quase todo mundo. Por isso o pedido.`,
      'Quem você conhece que está estudando para a mesma prova? Se o site te ajudou, mandar para essa pessoa é o melhor jeito de me agradecer, e deixa o ranking mais animado.',
      `Pelo seu link, quando a pessoa cria a conta e responde 20 questões, vocês dois ganham 7 dias do plano completo: ${c.link('indicar')}`,
      'Obrigado, de coração.',
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'descansa também', 'Descansa também')],
    corpo: (c) => [
      momento(c),
      `${cap(jaFez(c))}${c.pctBom !== null ? `, ${c.pctBom}% de acerto` : ''}. Você já fez mais do que a prova pede.`,
      'Então o conselho de amigo é outro: descansa também. Dormir bem nas semanas que faltam vale mais do que qualquer questão nova, e a memória agradece. Eu aprendi isso tarde, e por isso insisto.',
      c.obs(1),
      c.fecho(),
    ] },
]

// ---------------------------------------------------------------------------
// Situações
// ---------------------------------------------------------------------------

const quandoConta = (c: Ctx) => c.quando(Math.max(0, Math.round(Number(c.p.diasConta) || 0)))

/** Criou a conta e não começou: o que eu faria nos primeiros dez minutos; sem número. */
const nunca_comecou: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'os primeiros dez minutos', 'Os primeiros dez minutos'), nm(c, 'por onde eu começaria', 'Por onde eu começaria')],
    corpo: (c) => [
      momento(c),
      `Vi que você criou a sua conta no Orto Questões ${quandoConta(c)}, e fiquei feliz. Imagino que a rotina tenha apertado logo depois, porque é assim que ela funciona.`,
      'Se eu pudesse te dar um único conselho para os primeiros dez minutos: cinco questões de um tema que você gosta, lendo o comentário inteiro, inclusive das alternativas erradas. É ali que mora a pegadinha da banca, e é ali que o estudo começa a render.',
      `Dá para fazer isso no intervalo, pelo celular, sem planejar nada: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'que bom ter você por aqui', 'Que bom ter você por aqui'), nm(c, 'um oi de quem cuida do site', 'Um oi de quem cuida do site')],
    corpo: (c) => [
      momento(c),
      'Passei para dar um oi. Sou eu que cuido do site, ortopedista também, e gosto de escrever para quem acabou de chegar.',
      'Fiz o Orto Questões para ser o lugar que eu queria ter tido quando estudava: abrir, fazer cinco questões no intervalo e já saber o que ler. Nenhuma decisão para tomar, só sentar e fazer.',
      'Quando tiver dez minutos livres, que tal cinco questões de um tema de que você goste? É o bastante para pegar o jeito. O resto o site organiza.',
      'E se travar em qualquer coisa, me responde aqui. Vou gostar de ajudar.',
    ] },
  { id: 'v3', requer: (c) => !!(c.fatos.prova || c.fatos.etapa || c.fatos.cronograma), assuntos: (c) => [nm(c, 'por onde começar', 'Por onde começar'), diasProva(c) && nm(c, `faltam ${diasProva(c)}`, `Faltam ${diasProva(c)} para ${c.nomeProva}`)],
    corpo: (c) => [
      momento(c),
      J(c.fato('prova'), c.fato('etapa'), c.fato('cronograma')),
      'O jeito mais gostoso de começar é pelo tema de que você mais gosta. Começar pelo que dá prazer ajuda a criar o hábito; o resto vem depois, e a Revisão cuida de trazer de volta o que te pegou.',
      c.tempo(),
      `O tema fica à sua escolha aqui: ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'só três questões', 'Só três questões'), nm(c, 'sua conta está pronta', 'Sua conta está pronta')],
    corpo: (c) => [
      momento(c),
      'Sua conta está pronta, esperando por você, e eu sei que o difícil não é a conta: é o tempo.',
      'Uma ideia: no próximo intervalo do plantão, abrir o site no celular e responder três questões. Só três, para sentir como é. Cada uma tem a explicação de todas as alternativas, então três já ensinam bastante.',
      'Se gostar, o resto vem sozinho: a Revisão aprende com o que te pega e traz de volta na hora certa, e o Desempenho mostra onde você está crescendo.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'a parte que eu mais caprichei', 'A parte que eu mais caprichei'), nm(c, 'sobre as questões daqui', 'Sobre as questões daqui')],
    corpo: (c) => [
      momento(c),
      'Uma curiosidade sobre o site: cada questão tem a explicação de todas as alternativas, não só da certa. É ali que mais se aprende, e é a parte em que eu mais caprichei.',
      'Isso muda o jeito de estudar: uma questão bem lida vale por quatro, e cabe em dois minutos. Para quem tem o dia tomado, é a diferença entre estudar de verdade e adiar para sempre.',
      `Que tal ver como funciona com uma questão só? ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v6', requer: (c) => (c.p.diasConta ?? 0) > 3, assuntos: (c) => [nm(c, 'sem pressa', 'Sem pressa'), nm(c, 'quando a rotina der folga', 'Quando a rotina der folga')],
    corpo: (c) => [
      'Imagino que a rotina esteja puxada desde que você criou a conta. Plantão, aula, vida. Eu lembro bem.',
      'Sem pressa nenhuma. Quando der, um começo pequeno já basta: um tema, cinco questões, sem se preocupar com nada. O site guarda tudo, e a Revisão cuida do resto.',
      c.obs(1, ['prova', 'etapa']),
      'O que eu aprendi na residência é que o estudo que funciona é o que cabe na rotina real, não na rotina ideal. Dez minutos de verdade valem mais que duas horas imaginárias.',
      c.fecho(),
    ] },
]

/** Boas-vindas (até 3 dias, já respondeu): questões só a partir de 10; cinco no intervalo já contam. */
const boas_vindas: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'que bom começo', 'Que bom começo'), nm(c, 'três coisas para os primeiros dias', 'Três coisas para os primeiros dias')],
    corpo: (c) => [
      momento(c),
      `Vi que você chegou ao Orto Questões há pouco e ${c.dez ? `já respondeu ${Q(c.r)}` : 'já deu os primeiros passos'}. Que bom começo.`,
      'Três coisas que ajudam nos primeiros dias, de presente: ler o comentário mesmo quando acertar, deixar a Revisão trazer de volta as questões que te pegaram e não se preocupar com números agora.',
      'E uma quarta, de amigo: cinco questões no intervalo já contam. Não precisa esperar uma noite livre para o estudo valer.',
      'Qualquer dúvida, é só responder este e-mail. Vou gostar de ajudar.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'que bom ter você por aqui', 'Que bom ter você por aqui')],
    corpo: (c) => [
      'Que bom ter você por aqui. Sou eu que cuido do site, ortopedista também, e gosto de escrever para quem está chegando.',
      J(momento(c), c.obs(1, ['prova', 'etapa', 'cronograma'])),
      `${c.dez ? `As suas primeiras ${Q(c.r)}` : 'As suas primeiras questões'} já estão salvas, e as que te pegaram vão voltar na Revisão no momento certo. Você só precisa sentar e fazer; o resto o site decide.`,
      `A Revisão fica aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'um conselho de quem fez o site', 'Um conselho de quem fez o site')],
    corpo: (c) => [
      momento(c),
      'Um conselho de quem fez o site, se servir: pouco e todo dia rende mais do que muito de vez em quando.',
      `Você já começou${c.dez ? `, com ${Q(c.r)}` : ''}. Se conseguir manter umas dez por dia, no horário que sobrar, em um mês o hábito está criado e o seu estudo começa a contar uma história bonita.`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'vi a sua chegada', 'Vi a sua chegada')],
    corpo: (c) => [
      'Escrevo para dizer que vi a sua chegada, e que fico feliz de ter mais alguém estudando ortopedia com tanta vontade por aqui.',
      J(momento(c), c.fato('prova'), c.fato('etapa')),
      'O site foi feito para quem tem pouco tempo: você abre, a lista já está pronta, e cada questão explica todas as alternativas. Não precisa planejar nada nos primeiros dias; só aparecer.',
      'Se encontrar qualquer coisa estranha numa questão ou tiver uma ideia, me conta. O site melhora muito com isso.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'o melhor do site', 'O melhor do site'), nm(c, 'uma dica para a primeira semana', 'Uma dica para a primeira semana')],
    corpo: (c) => [
      momento(c),
      `${c.dez ? `${cap(Q(c.r))} em poucos dias.` : 'Começou em poucos dias.'} Que bom começo.`,
      'Uma dica para a primeira semana: quando uma questão te pegar, ler por que cada alternativa está certa ou errada. É o que o site tem de melhor, e é o que faz uma questão valer por quatro.',
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v6', requer: temFatos, assuntos: (c) => [nm(c, 'reparei no seu começo', 'Reparei no seu começo')],
    corpo: (c) => [
      J('Reparei no seu começo por aqui, e fiquei feliz.', momento(c)),
      c.obs(2, ['horario', 'prova', 'etapa', 'cronograma']),
      `${c.dez ? `${cap(Q(c.r))} em poucos dias já mostram` : 'Os primeiros passos em poucos dias já mostram'} muita vontade. O próximo passo é deixar a Revisão trabalhar por você: ela traz de volta, no momento certo, as questões que te pegaram.`,
      c.fecho(),
    ] },
]

/** Começando (< 30 questões): pergunta como está sendo + uma ideia prática; número só a partir de 10. */
const comecando: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'o começo é a parte mais difícil', 'O começo é a parte mais difícil'), c.dez && nm(c, `suas primeiras ${Q(c.r)}`, `Suas primeiras ${Q(c.r)}`)],
    corpo: (c) => [
      momento(c),
      `Vi que você ${c.dez ? `já respondeu ${Q(c.r)}` : 'já deu os primeiros passos'}. O começo é a parte mais difícil, e você está atravessando com vontade.`,
      'O que mais ajuda agora é constância: um pouco todo dia, mesmo nos dias corridos. Cinco no ônibus, cinco antes de dormir. O resto vem quase sem perceber.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'vi o seu começo', 'Vi o seu começo')],
    corpo: (c) => [
      c.obs(1, ['prova', 'etapa', 'horario', 'cronograma']) ?? momento(c),
      `Você ${c.dez ? `já tem ${Q(c.r)} respondidas` : 'já começou'}. Quando chegar às trinta, o site já consegue te mostrar os temas em que você mais brilha.`,
      c.dica(),
      c.tempo(),
      `Para seguir: ${c.link('treinar')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'cinco por dia', 'Cinco por dia')],
    corpo: (c) => [
      momento(c),
      'Uma ideia simples, se combinar com você: cinco questões por dia, no mesmo horário.',
      `Parece pouco, mas em um mês são mais de cem. E com ${asSuas(c)}, o caminho já está aberto.`,
      'O segredo não é o número, é o horário fixo: a cabeça para de negociar se vai estudar e só vai.',
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'como está sendo?', 'Como está sendo?')],
    corpo: (c) => [
      momento(c),
      `Você ${c.dez ? `já fez ${Q(c.r)}` : 'já começou'} por aqui, e eu queria saber: como está sendo?`,
      'Os comentários estão ajudando? Alguma coisa ficou confusa no site? O tempo está dando? Pode responder do jeito que quiser, mesmo que seja uma linha. Eu leio tudo.',
      c.tempo(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'a Revisão vai trabalhar por você', 'A Revisão vai trabalhar por você')],
    corpo: (c) => [
      momento(c),
      'Uma coisa de que talvez ninguém tenha te falado: as questões que te pegam voltam sozinhas na Revisão, no momento certo para fixar. Não precisa anotar nada nem lembrar de nada.',
      `Vale abrir de vez em quando, antes das questões novas. Leva poucos minutos e é onde o estudo mais rende: ${c.link('revisao')}`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v6', requer: temFatos, assuntos: (c) => [nm(c, 'uma coisa que reparei', 'Uma coisa que reparei')],
    corpo: (c) => [
      momento(c),
      c.obs(2, ['horario', 'prova', 'etapa', 'maisEstudada', 'cronograma']),
      `E vi que você ${c.dez ? `já está com ${Q(c.r)}` : 'já deu os primeiros passos'}. Quando passar das trinta, dá para enxergar com mais clareza os temas em que você mais brilha.`,
      `Até lá, o melhor é seguir no seu ritmo, nos intervalos que der: ${c.link('treinar')}`,
    ] },
]

/** Começou e parou: tom de amigo, sem cobrança; "três questões no ônibus"; a Revisão como volta leve. */
const comecou_parou: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'tudo o que você fez continua salvo', 'Tudo o que você fez continua salvo'), nm(c, 'sobre o seu começo', 'Sobre o seu começo')],
    corpo: (c) => [
      momento(c),
      `Lembrei de você: o seu começo no Orto Questões${c.dez ? `, com ${Q(c.r)},` : ''} me deixou feliz. Sei como a rotina aperta logo depois, e acontece com todo mundo: o difícil é transformar o começo em hábito.`,
      'O que mais funciona é pouco e todo dia. Três questões no ônibus, duas antes de dormir, e quando você vê, já passou de cem. Tudo o que você fez continua salvo, e as que te pegaram voltam na Revisão no momento certo.',
      `Que tal fazer as próximas hoje, se der? ${c.link('treinar')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'posso ajudar em alguma coisa?', 'Posso ajudar em alguma coisa?')],
    corpo: (c) => [
      momento(c),
      `Você começou${c.dez ? `, com ${Q(c.r)},` : ''} e depois imagino que a rotina tenha apertado. Fiquei pensando se alguma coisa no site ficou confusa, ou se foi só a vida.`,
      'Se foi o site, me conta respondendo este e-mail, que eu ajudo. Se foi a vida, tudo bem também: o site fica aqui, do jeito que você deixou, sem nenhuma pressa.',
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'recomeçar é mais fácil do que parece', 'Recomeçar é mais fácil do que parece')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua última questão, e lembrei de você.`,
      momento(c),
      `Recomeçar é mais fácil do que parece: abrir a Revisão, fazer as que estão esperando e pronto. Em dez minutos você está de volta, sem precisar decidir nada: ${c.link('revisao')}`,
      c.obs(1, ['prova', 'etapa', 'cronograma']),
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'o começo é sempre assim', 'O começo é sempre assim')],
    corpo: (c) => [
      momento(c),
      'O começo é sempre assim: alguns dias de empolgação, depois a vida aperta. Acontece com todo mundo, e aconteceu comigo mais de uma vez na residência.',
      `${guardado(c)}. Quando der, que tal voltar com cinco, de um tema de que você goste? Não precisa recuperar nada, só recomeçar pequeno.`,
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'uma ideia para voltar com leveza', 'Uma ideia para voltar com leveza')],
    corpo: (c) => [
      momento(c),
      'Uma ideia para voltar com leveza: no horário em que você costuma estar no celular, trocar cinco minutos de rede social por três questões.',
      `Parece bobo, mas é assim que o hábito pega. ${guardado(c)}, esperando a próxima, e cada questão explica todas as alternativas, então três já ensinam.`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'o site fica aqui por você', 'O site fica aqui por você')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} desde a sua última questão, e escrevo só para dizer que lembrei de você.`,
      momento(c),
      `Se alguma coisa no site não funcionou bem para você, me conta? Isso me ajuda muito. E se foi só a rotina, ${asSuas(c)} está esperando, sem pressa.`,
      'Dez minutos no intervalo já contam. Não precisa esperar um dia livre, porque na residência ele quase nunca chega.',
      c.fecho(),
    ] },
]

/** Pausa curta (3 a 6 dias): cita a área que a pessoa estava estudando e a Revisão. */
const pausa: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'lembrei de você', 'Lembrei de você'), nm(c, 'uma sessão curta, se der', 'Uma sessão curta, se der')],
    corpo: (c) => {
      const a = c.areaRecente()
      return [
        `Faz ${tempoFora(c.p.diasParado)} desde a sua última sessão, e lembrei de você. A rotina deve ter apertado, e está tudo bem.`,
        a ? `Você estava em ${a.em}, e a Revisão já separou as questões desse tema que pedem uma segunda olhada. Está tudo guardado, do jeito que você deixou.` : 'A Revisão já separou as questões que pedem uma segunda olhada. Está tudo guardado, do jeito que você deixou.',
        'Uma sessão curta costuma valer mais do que uma maratona no fim de semana. Dez questões já mantêm o hábito vivo, e cabem num intervalo.',
        `Fica aqui o atalho, se quiser: ${c.link('revisao')}`,
        c.fecho(),
      ]
    } },
  { id: 'v2', assuntos: (c) => [nm(c, 'uma sessão curta hoje?', 'Uma sessão curta hoje?')],
    corpo: (c) => {
      const a = c.areaRecente()
      return [
        momento(c),
        `Só um oi rápido: faz alguns dias desde a sua última sessão, e senti falta de você por aqui.${a ? ` Você estava em ${a.em}. ${a.sabor[a.sabor.length - 1]}` : ''}`,
        `Que tal dez minutos hoje, se a rotina deixar? ${guardado(c)}, e a Revisão já separou por onde recomeçar: ${c.link('revisao')}`,
        c.tempo(),
      ]
    } },
  { id: 'v3', assuntos: (c) => [nm(c, 'a Revisão está pronta', 'A Revisão está pronta')],
    corpo: (c) => {
      const a = c.areaRecente()
      return [
        `Faz ${tempoFora(c.p.diasParado)} desde a sua última sessão${a ? `, quando você estava em ${a.em}` : ''}.`,
        momento(c),
        'Enquanto você estava fora, a Revisão separou as questões que pedem uma segunda olhada, para voltar no momento certo. É o jeito mais leve de retomar: nada para decidir, só abrir e fazer.',
        `Fica aqui: ${c.link('revisao')}`,
        c.fecho(),
      ]
    } },
  { id: 'v4', assuntos: (c) => [nm(c, 'dez questões hoje?', 'Dez questões hoje?')],
    corpo: (c) => {
      const a = c.areaRecente()
      return [
        `Faz ${tempoFora(c.p.diasParado)} desde a sua última questão, e passei para te mandar um empurrãozinho gentil.`,
        a ? `Você estava em ${a.em}. ${a.sabor[a.sabor.length - 1]} Vale voltar por ali, que o tema ainda está quente na memória.` : 'O tema em que você estava ainda está quente na memória, e vale voltar por ali.',
        `Dez questões já bastam para retomar o ritmo, e a Revisão já separou as que mais valem: ${c.link('revisao')}`,
        c.fecho(),
      ]
    } },
  { id: 'v5', assuntos: (c) => [nm(c, 'está tudo guardado', 'Está tudo guardado')],
    corpo: (c) => {
      const a = c.areaRecente()
      return [
        momento(c),
        `Alguns dias sem aparecer acontecem com todo mundo que estuda no meio da residência. ${guardado(c)}${a ? `, inclusive o que você vinha fazendo em ${a.em}` : ''}, do jeito que você deixou.`,
        'Para voltar sem peso: não tente recuperar o tempo. Abra a Revisão, faça dez, e pronto. É assim que o embalo volta.',
        `A Revisão fica aqui: ${c.link('revisao')}`,
        c.fecho(),
      ]
    } },
]

/** Sumiu (10+ dias): "lembrei de você" com a melhor área; o site do jeito que deixou. */
const sumiu: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'lembrei de você hoje', 'Lembrei de você hoje'), nm(c, 'senti sua falta por aqui', 'Senti sua falta por aqui')],
    corpo: (c) => [
      `Lembrei de você hoje, olhando quem estuda por aqui. Faz ${tempoFora(c.p.diasParado)} que a gente não se vê por aqui, e a primeira coisa que pensei foi: a rotina deve ter apertado. Acontece com todo mundo, e está tudo bem.`,
      c.obs(1, ['melhorArea', 'maisEstudada', 'ranking']) ?? `Reparei numa coisa que vale registrar: ${asSuas(c)} está guardado, do jeito que você deixou. Nada disso se perdeu.`,
      'Uma ideia para voltar sem peso: não tente recuperar o tempo. Abra a Revisão, que já separou as questões que pedem uma segunda olhada, e faça dez. Dez minutos, no intervalo que der. É assim que o embalo volta.',
      `A Revisão fica aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'seu progresso está guardado', 'Seu progresso está guardado')],
    corpo: (c) => [
      `Faz ${tempoFora(c.p.diasParado)} que não te vejo por aqui, e passei só para dizer que o seu progresso está todo guardado.`,
      momento(c),
      c.pctBom !== null ? `${cap(Q(c.r))}, ${c.pctBom}% de acerto e um Caderno de erros esperando por você. Nada disso se perde, e nada disso precisa ser refeito.` : `${cap(asSuas(c))} e um Caderno de erros esperando por você. Nada disso se perde, e nada disso precisa ser refeito.`,
      'Quando a rotina der uma folga, uma sessão curta já retoma o embalo. Não precisa ser uma noite inteira; dez minutos bastam para o hábito lembrar de você.',
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'plantão, cansaço, vida', 'Plantão, cansaço, vida')],
    corpo: (c) => [
      'Plantão, cansaço, vida: acontece com todo mundo. O que leva alguém até a aprovação é voltar, não ser perfeito. Eu mesmo parei e voltei mais vezes do que gosto de admitir.',
      c.obs(1, ['prova', 'melhorArea', 'etapa', 'cronograma']),
      `Que tal recomeçar pequeno? Dez questões hoje, dez amanhã, no intervalo que der. O hábito volta mais rápido do que parece: ${c.link('treinar')}`,
      c.tempo(),
      c.fecho(),
    ] },
  { id: 'v4', requer: (c) => !!c.fatos.melhorArea || !!c.fatos.maisEstudada, assuntos: (c) => [nm(c, 'lembrei de você', 'Lembrei de você'), c.fatos.melhorArea && nm(c, `${c.area(c.fatos.melhorArea.slug).em} e você`, `Sobre ${c.area(c.fatos.melhorArea.slug).em}`)],
    corpo: (c) => [
      `Lembrei de você olhando quem estudava por aqui. Faz ${tempoFora(c.p.diasParado)} que a gente não se vê por aqui, e está tudo bem.`,
      c.obs(1, ['melhorArea', 'maisEstudada']),
      'Esse trabalho bonito continua todo aqui, esperando por você. Quando der, uma sessão curta já retoma o embalo, e a Revisão já sabe por onde começar.',
      `Fica aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v5', requer: (c) => c.diasProva !== null && c.diasProva >= 7, assuntos: (c) => [nm(c, `faltam ${diasProva(c)}`, `Faltam ${diasProva(c)} para ${c.nomeProva}`), nm(c, 'a prova está chegando', 'A prova está chegando')],
    corpo: (c) => [
      `Faltam ${diasProva(c)} para ${c.nomeProva}, e lembrei de você. Faz ${tempoFora(c.p.diasParado)} que a gente não se vê por aqui, e imagino que a rotina tenha engolido o estudo.`,
      `Ainda dá tempo de fazer muita coisa, e ${asSuas(c)} já é um ótimo começo. Nada se perdeu.`,
      `Quando quiser retomar, a Revisão está aqui, com as questões que pedem uma segunda olhada já separadas: ${c.link('revisao')}`,
      'Dez minutos por dia, daqui até a prova, valem mais do que uma maratona na véspera. E dormir também conta.',
      c.fecho(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'do jeito que você deixou', 'O site está do jeito que você deixou'), nm(c, 'um recado curto', 'Um recado curto')],
    corpo: (c) => [
      momento(c),
      'Só um recado curto, com carinho: quando quiser voltar, o site está do jeito que você deixou.',
      `${cap(asSuas(c))} e as questões para revisar continuam lá, esperando por você. Não precisa recuperar nada, nem explicar nada.`,
      c.tempo(),
      'Se quiser me contar o que aconteceu nessas semanas, é só responder. Eu leio tudo.',
    ] },
]

/** Obrigado pela assinatura: "o que fazer nos primeiros dez minutos", montar o cronograma. */
const obrigado_assinatura: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'obrigado, e os primeiros dez minutos', 'Obrigado, e os primeiros dez minutos'), nm(c, 'obrigado pela assinatura', 'Obrigado pela assinatura')],
    corpo: (c) => [
      momento(c),
      'Vi que você assinou o Orto Questões e quis te escrever pessoalmente para agradecer. O site é um projeto independente, e é a assinatura que paga o servidor e o tempo de manter as questões e os comentários em dia.',
      `Se eu pudesse escolher o que você faz nos primeiros dez minutos: montar o cronograma. Você diz a data ${c.daProva}, e a partir daí a lista de cada dia já está pronta quando você senta, com o que mais cai primeiro. É o que devolve mais tempo de tudo o que o plano tem.`,
      `Fica aqui: ${c.link('cronograma')}`,
      'E se alguma coisa não funcionar, me responde. Eu leio tudo.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'obrigado pela confiança', 'Obrigado pela confiança')],
    corpo: (c) => [
      momento(c),
      'Obrigado pela confiança. Fiquei feliz de verdade, do jeito que a gente fica quando um colega aposta no que a gente fez.',
      c.obs(1),
      `Uma dica para a assinatura render desde o primeiro dia: montar o cronograma com a data da sua prova. Ele organiza o que estudar em cada dia, começando pelo que mais cai, e se ajusta sozinho quando a semana aperta: ${c.link('cronograma')}`,
      'E qualquer dúvida, é só responder.',
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'fiquei muito feliz', 'Fiquei muito feliz')],
    corpo: (c) => [
      momento(c),
      'Fiquei muito feliz de ver a sua assinatura.',
      c.dez ? `Você já tem ${Q(c.r)} por aqui${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ''}, e agora tem tudo liberado para ir até a prova: cronograma, Simulado Nacional, temas que mais caem, Biblioteca de resumos.` : 'Agora você tem tudo liberado para ir até a prova: cronograma, Simulado Nacional, temas que mais caem, Biblioteca de resumos.',
      'Meu compromisso é continuar melhorando as questões e os comentários toda semana. Se encontrar qualquer coisa estranha, me avisa?',
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'um obrigado de coração', 'Um obrigado de coração')],
    corpo: (c) => [
      momento(c),
      'Um obrigado curto, mas de coração, pela assinatura. Ela mantém o site de pé para você e para todo mundo que estuda aqui.',
      'Nos primeiros dias, se eu pudesse sugerir uma ordem: primeiro o cronograma, para a lista do dia já estar pronta quando você sentar; depois os temas que mais caem, para saber onde insistir. O resto vem com calma.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', requer: temFatos, assuntos: (c) => [nm(c, 'obrigado, e uma coisa que reparei', 'Obrigado, e uma coisa que reparei')],
    corpo: (c) => [
      'Obrigado por assinar o Orto Questões. Quis te escrever pessoalmente.',
      J(momento(c), c.obs(2)),
      `Se quiser aproveitar desde já, eu começaria pelo cronograma: você coloca a data ${c.daProva} e ele monta a lista de cada dia, começando pelo que mais cai. É o que mais devolve tempo. Fica aqui: ${c.link('cronograma')}`,
      'Mas, antes de tudo, obrigado.',
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'quem assina mantém o site', 'Quem assina mantém o site')],
    corpo: (c) => [
      momento(c),
      'Escrevo para agradecer a sua assinatura. Não tem empresa grande por trás do Orto Questões: tem eu, as questões, os comentários e quem assina. Agora você faz parte disso.',
      'Em troca, o combinado é simples: você senta e estuda, o site decide o resto. A lista do dia já pronta, a Revisão trazendo o que precisa voltar, o Simulado Nacional todo mês.',
      c.tempo(),
      'Se tiver ideia, crítica ou sugestão, a resposta deste e-mail chega direto para mim.',
    ] },
]

// ---------------------------------------------------------------------------
// Convites para assinar (sem preço; o benefício é o tempo devolvido; a garantia fica)
// ---------------------------------------------------------------------------

const lista = (itens: string[]) => itens.map((t) => `- ${cap(t)}`).join('\n')
/** "a, b e c". */
const eLista = (itens: string[]) => (itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`)
/** Dar antes de pedir: uma dica útil, oferecida antes do convite. */
const presente = (c: Ctx) => `Antes de tudo, uma dica de presente. ${c.dica()}`
const garantia = 'Se não for o que você esperava, o reembolso em 7 dias é pelo próprio site, sem precisar explicar nada.'
const portaAberta = 'Se não for a hora, tudo bem também. Eu continuo por aqui.'
/** O cronograma explicado como horas devolvidas, no tom da amostra do PLANO. */
const cronogramaDevolve = (c: Ctx) => c.um(
  `O que mais me preocupa em quem estuda com o dia cheio não é a vontade, é o tempo gasto decidindo o que estudar. A pessoa chega, abre o site, pensa "o que eu faço hoje?", e lá se foram quinze minutos. O cronograma existe para devolver esses quinze minutos: você diz a data ${c.daProva}, e a partir daí a lista de cada dia já está pronta quando você senta, com o que mais cai primeiro e o tempo de cada parte. Se a semana apertar, ele se ajusta sozinho.`,
  `O cronograma faz uma coisa simples: você diz a data ${c.daProva}, e ele monta a lista de cada dia, com o que mais cai primeiro e o tempo de cada parte. Quando você senta, já está pronto. Se um plantão bagunçar a semana, ele redistribui sozinho. É menos quinze minutos por dia decidindo, e quinze minutos por dia é muito para quem tem pouco.`,
)

const convite_20: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'uma dica e um convite', 'Uma dica e um convite'), nm(c, 'uma coisa que pode te ajudar', 'Uma coisa que pode te ajudar')],
    corpo: (c) => [
      momento(c),
      `Vi que você já respondeu ${Q(c.r)} no Orto Questões, e fiquei feliz de ver você por aqui.`,
      presente(c),
      `E, caso seja útil para a sua rotina, queria te contar o que a assinatura faz por ela:\n${lista(c.beneficios(3))}`,
      `${garantia} Se fizer sentido para o seu momento, os planos estão aqui: ${c.link('assinatura')}`,
      portaAberta,
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'já conhece o cronograma?', 'Já conhece o cronograma?')],
    corpo: (c) => [
      momento(c),
      'Uma pergunta: você já conhece o cronograma do site?',
      cronogramaDevolve(c),
      `Faz parte da assinatura, junto com ${eLista(c.beneficios(3, true).filter((b) => !b.startsWith('o cronograma')).slice(0, 2))}. Dá para ver uma prévia do seu antes de decidir qualquer coisa: ${c.link('cronograma')}`,
      portaAberta,
    ] },
  { id: 'v3', requer: temFatos, assuntos: (c) => [nm(c, 'vi o seu começo', 'Vi o seu começo'), nm(c, 'uma sugestão para o seu estudo', 'Uma sugestão para o seu estudo')],
    corpo: (c) => [
      J(momento(c), `Vi as suas ${Q(c.r)}, e quis te escrever.`),
      c.obs(2),
      `Pelo jeito que você estuda, acho que a assinatura combinaria com a sua rotina. Ela soma:\n${lista(c.beneficios(3))}`,
      `${garantia} Os planos ficam aqui, se quiser olhar: ${c.link('assinatura')}`,
      portaAberta,
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'três coisas para a sua rotina', 'Três coisas para a sua rotina'), nm(c, 'chegar à prova com mais calma', 'Chegar à prova com mais calma')],
    corpo: (c) => [
      momento(c),
      `Você já fez ${Q(c.r)}, então já conhece o jeito do site. Se a sua meta é chegar à prova com mais calma e menos tempo perdido, a assinatura soma três coisas que ajudam muito:\n${lista(c.beneficios(3))}`,
      `Se quiser olhar com calma: ${c.link('assinatura')}`,
      garantia,
      'Qualquer dúvida, me responde. Vou gostar de ajudar.',
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'quem assina mantém o site de pé', 'Quem assina mantém o site de pé')],
    corpo: (c) => [
      momento(c),
      'Uma curiosidade sobre o Orto Questões: é um projeto independente, e quem assina é quem mantém o site de pé.',
      `Além de apoiar, a assinatura libera ${eLista(c.beneficios(3, true))}. O que ela devolve, no fim, é tempo: menos decisão, mais estudo.`,
      `${garantia} Se quiser conhecer: ${c.link('assinatura')}`,
      portaAberta,
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, 'se fizer sentido para você', 'Se fizer sentido para você')],
    corpo: (c) => [
      momento(c),
      `${cap(Q(c.r))} já dão uma boa ideia de se o site combina com o seu jeito de estudar.`,
      `Se combinar, a assinatura leva isso adiante, na direção da sua prova e da sua rotina:\n${lista(c.beneficios(3))}`,
      `Os planos estão aqui, se quiser olhar: ${c.link('assinatura')}`,
      portaAberta,
    ] },
  { id: 'v7', requer: (c) => (c.p.viuPlanos ?? 0) > 0, assuntos: (c) => [nm(c, 'sobre os planos', 'Sobre os planos'), nm(c, 'alguma dúvida sobre os planos?', 'Alguma dúvida sobre os planos?')],
    corpo: (c) => [
      momento(c),
      'Vi que você deu uma olhada nos planos, e quis escrever para ajudar no que for preciso.',
      'Se ficou alguma dúvida, me responde que eu explico. Às vezes é coisa simples, como a forma de pagamento ou o que acontece se o site não for o que você esperava.',
      `Resumindo o que a assinatura soma:\n${lista(c.beneficios(3))}`,
      garantia,
    ] },
]

/** Uma frase sobre o acerto, no tom da faixa. Abaixo de 50%, nenhum número: só esforço e caminho. */
const tomAcerto = (c: Ctx): string | null => {
  const p = c.pctBom
  if (p !== null) {
    if (p >= 80) return c.um(`E com ${p}% de acerto, o que é admirável.`, `${p}% de acerto, aliás. Parabéns, de verdade.`)
    if (p >= 70) return c.um(`E com ${p}% de acerto, um resultado muito bonito.`, `Com ${p}% de acerto, você já está num patamar muito bom.`)
    if (p >= 60) return c.um(`E com ${p}% de acerto, uma base firme.`, `Seu acerto de ${p}% mostra uma base firme.`)
    return c.um(`Seu acerto de ${p}% já passa da metade, e é exatamente a fase em que mais dá para crescer.`, 'Você está no meio do caminho, que é onde mais dá para crescer.')
  }
  if (c.pct === null) return null
  if (c.pct >= 40) return 'Você está no meio do caminho, que é onde mais dá para crescer.'
  return c.um('Dá para ver que você é de quem não desiste, e é isso que mais conta numa preparação longa.', 'Você está construindo a sua base com constância, e é nessa fase que um bom plano mais ajuda.')
}

const convite_50: Versao[] = [
  { id: 'v1', assuntos: (c) => [diasProva(c) && nm(c, `faltam ${diasProva(c)} e eu estou na torcida`, `Faltam ${diasProva(c)} e eu estou na torcida`), nm(c, 'escrevi para você', 'Escrevi para você'), nm(c, 'um convite pessoal', 'Um convite pessoal')],
    corpo: (c) => [
      momento(c),
      J(`Parei no seu nome por um motivo: ${Q(c.r)} já respondidas.`, c.obs(1, ['melhorArea', 'ranking', 'maisEstudada']), 'Isso não aparece por acaso. É de quem senta e faz, mesmo com sono.'),
      cronogramaDevolve(c),
      `Dá para ver uma prévia do seu aqui: ${c.link('cronograma')}. ${garantia}`,
      portaAberta,
    ] },
  { id: 'v2', requer: (c) => !!c.fatos.ranking, assuntos: (c) => [nm(c, `${c.fatos.ranking}º no ranking`, `${c.fatos.ranking}º no ranking`), nm(c, 'uma das pessoas que mais estudam aqui', 'Uma das pessoas que mais estudam aqui')],
    corpo: (c) => [
      momento(c),
      `Você está em ${c.fatos.ranking}º no ranking geral, ou seja, entre as pessoas que mais estudam no Orto Questões. Quis que você soubesse que eu vi, e que fiquei feliz.`,
      J(c.obs(1, ['melhorArea', 'horario', 'prova']), tomAcerto(c)),
      `Para quem estuda com essa dedicação, acho que a assinatura faz sentido pelo tempo que ela devolve: ${eLista(c.beneficios(3, true))}. ${garantia}`,
      `Os planos ficam aqui, se quiser olhar: ${c.link('assinatura')}`,
      portaAberta,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma conversa sobre o seu estudo', 'Uma conversa sobre o seu estudo')],
    corpo: (c) => [
      momento(c),
      `A ideia do Orto Questões é ser o lugar onde se estuda pelas provas reais, com cada alternativa explicada, no tempo que a rotina deixa. Ver alguém com ${Q(c.r)} me deixa feliz: quer dizer que a ideia está funcionando.`,
      J(c.obs(1), tomAcerto(c)),
      presente(c),
      `Se você quiser ir além, a assinatura soma:\n${lista(c.beneficios(3))}`,
      `Sem pressão nenhuma. Se fizer sentido: ${c.link('assinatura')}`,
    ] },
  { id: 'v4', requer: (c) => c.diasProva !== null && c.diasProva >= 7, assuntos: (c) => [nm(c, `faltam ${diasProva(c)} e eu estou na torcida`, `Faltam ${diasProva(c)} para ${c.nomeProva}`), nm(c, `um plano até ${c.nomeProva}`, `Um plano até ${c.nomeProva}`)],
    corpo: (c) => [
      J(`Vi que ${c.nomeProva} está a ${diasProva(c)}${c.fatos.horario ? ` e que você estuda quase sempre ${c.fatos.horario === 'noite' ? 'à noite' : c.fatos.horario === 'madrugada' ? 'de madrugada' : c.fatos.horario === 'manha' ? 'de manhã cedo' : c.fatos.horario === 'almoco' ? 'na hora do almoço' : 'à tarde'}` : ''}. Conheço bem essa rotina: o dia inteiro no hospital e a prova esperando no fim dele.`),
      J(`No seu histórico, ${Q(c.r)} já respondidas me chamaram a atenção.`, c.obs(1, ['melhorArea', 'ranking', 'maisEstudada']), tomAcerto(c)),
      cronogramaDevolve(c),
      `Dá para ver uma prévia do seu aqui: ${c.link('cronograma')}. ${garantia}`,
      portaAberta,
    ] },
  { id: 'v5', requer: (c) => !!c.fatos.areaFraca, assuntos: (c) => [nm(c, 'uma ideia para o tema que mais te desafia', 'Uma ideia para o tema que mais te desafia')],
    corpo: (c) => [
      momento(c),
      `Olhei as suas ${Q(c.r)} com calma, e quis te escrever.`,
      J(c.fato('melhorArea'), c.fato('areaFraca')),
      'Na assinatura, dá para ver os temas que mais caem em cada área e como a turma respondeu cada alternativa. Ajuda a saber onde vale insistir sem gastar tempo descobrindo sozinho, e mostra que muita gente tropeça nas mesmas questões.',
      `${garantia} Se quiser conhecer: ${c.link('assinatura')}`,
      portaAberta,
    ] },
  { id: 'v6', requer: (c) => !!c.fatos.flashcards && !!c.p.limiteGratisLigado, assuntos: (c) => [nm(c, 'questões e flashcards sem limite', 'Questões e flashcards sem limite')],
    corpo: (c) => [
      momento(c),
      `Vi que você usa as questões e os flashcards: ${Q(c.r)} e ${N(c.fatos.flashcards!)} cartas até agora. Que dedicação.`,
      tomAcerto(c),
      `Com esse ritmo, imagino que o limite diário às vezes atrapalhe justamente no dia em que sobrou tempo. Na assinatura, questões e flashcards ficam sem limite, e ainda entram ${eLista(c.beneficios(3, true).filter((b) => !b.includes('sem limite')).slice(0, 2))}.`,
      `${garantia} Os planos ficam aqui, se quiser olhar: ${c.link('assinatura')}`,
      portaAberta,
    ] },
  { id: 'v7', requer: temFatos, assuntos: (c) => [nm(c, 'um convite, com carinho', 'Um convite, com carinho')],
    corpo: (c) => [
      momento(c),
      J('Queria te fazer um convite, e não é pelo número de questões: é pelo jeito que você estuda.', c.obs(2)),
      presente(c),
      `A assinatura foi pensada para quem estuda assim, com pouco tempo e muita vontade:\n${lista(c.beneficios(3))}`,
      `${garantia} Se quiser conhecer: ${c.link('assinatura')}`,
      portaAberta,
    ] },
]

// ---------------------------------------------------------------------------
// Outras cartas pessoais
// ---------------------------------------------------------------------------

const teotOuProva = (c: Ctx) => c.fatos.prova === 'teot' || !!c.fatos.cronograma || (!c.fatos.prova && (c.fatos.etapa === 'r3' || c.fatos.etapa === 'r4'))
const faltam = (c: Ctx) => (diasProva(c) ? `Faltam ${diasProva(c)} para ${c.nomeProva}` : `${cap(c.nomeProva)} está chegando`)

/** Reta final: dormir é estudar, modo prova, revisão. */
const reta_final: Versao[] = [
  { id: 'v1', assuntos: (c) => [diasProva(c) && nm(c, `faltam ${diasProva(c)}`, `Faltam ${diasProva(c)} para ${c.nomeProva}`), nm(c, 'reta final', 'Reta final')],
    corpo: (c) => [
      `${faltam(c)}, e lembrei de você. Sei como essa fase é: a cabeça corre atrás de tudo o que falta, e o corpo pede descanso.`,
      c.dez ? `Ainda dá tempo de fazer muita coisa, e você já tem ${Q(c.r)} no caminho. Isso é base de verdade.` : 'Ainda dá tempo de fazer muita coisa, e cada questão agora conta.',
      `Se ajudar, nesta fase eu priorizaria duas coisas: revisar as questões que te pegaram e treinar os temas que mais caem. Nada de conteúdo novo em volume. A Revisão fica aqui: ${c.link('revisao')}`,
      c.obs(1),
      'Conte comigo nessa reta final.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'o que eu faria agora', 'O que eu faria agora'), nm(c, 'a prova está chegando', 'A prova está chegando')],
    corpo: (c) => [
      `${faltam(c)}, e estou na torcida.`,
      momento(c),
      'Se ajudar, eu faria assim no seu lugar: questões novas pela manhã, quando a cabeça está fresca; Revisão à noite, que pede menos energia; e um simulado por semana, cronometrado, para treinar o tempo e o nervoso.',
      c.obs(1, ['areaFraca', 'melhorArea']),
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'menos conteúdo novo, mais revisão', 'Menos conteúdo novo, mais revisão')],
    corpo: (c) => [
      `${faltam(c)}. Na reta final, o instinto é correr atrás de tudo o que falta. Mas o que mais rende é proteger o que você já sabe.`,
      `${c.dez ? `Com ${Q(c.r)} feitas, você` : 'Você'} já tem material para isso. O Caderno de erros é um ótimo lugar para começar: cada questão que te pegou e vira acerto agora é um ponto garantido no dia: ${c.link('erros')}`,
      c.obs(1),
      'E um lembrete de amigo: dormir também é estudar. A memória se consolida no sono.',
      c.fecho(),
    ] },
  { id: 'v4', requer: (c) => !!c.fatos.areaFraca, assuntos: (c) => [nm(c, 'um tema para a reta final', 'Um tema para a reta final')],
    corpo: (c) => [
      `${faltam(c)}, e olhei os seus temas com carinho.`,
      c.fato('areaFraca'),
      `Na reta final, dar atenção a um tema assim costuma render mais do que polir um que já está forte. Dez questões por semana bastam, e o tema fica à sua escolha aqui: ${c.link('treinar')}`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'cuida de você também', 'Cuida de você também'), nm(c, 'dormir também é estudar', 'Dormir também é estudar')],
    corpo: (c) => [
      `${faltam(c)}. Um lembrete que ninguém costuma dar nessa fase: dormir também é estudar.`,
      `A memória se consolida no sono. Então, nestas últimas semanas, vale preferir menos horas bem dormidas a madrugadas de questão.${c.fatos.horario === 'madrugada' ? ' Digo isso com carinho, porque vi que você anda estudando de madrugada.' : ''}`,
      c.obs(1),
      'Você já fez muito. Agora é chegar com a cabeça descansada, que é ela que acerta o detalhe no dia.',
      c.fecho(),
    ] },
  { id: 'v6', requer: (c) => !!c.fatos.melhorArea, assuntos: (c) => [nm(c, 'proteja o seu ponto forte', 'Proteja o seu ponto forte')],
    corpo: (c) => [
      `${faltam(c)}.`,
      c.fato('melhorArea'),
      `Na reta final, vale manter esse tema aquecido com a Revisão, que leva poucos minutos, e usar o tempo novo nos outros. Assim você chega sem perder nada do que já conquistou: ${c.link('revisao')}`,
      c.obs(1),
      c.fecho(),
    ] },
]

const nomeMarco = (m: number) => ({ 50: 'cinquenta', 100: 'cem', 250: 'duzentas e cinquenta', 500: 'quinhentas', 1000: 'mil', 2000: 'duas mil', 3000: 'três mil', 4000: 'quatro mil' } as Record<number, string>)[m] ?? N(m)
/** O que o marco significa em tempo: uns dois minutos por questão, com o comentário. */
const horasDoMarco = (m: number) => {
  const h = Math.round((m * 2) / 60)
  return h <= 1 ? 'mais de uma hora' : `umas ${N(h)} horas`
}
/** Marco (100, 250, 500, 1.000, 2.000): o que o número significa em horas e dias. */
const marco: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, `${N(c.marco!)} questões`, `Você passou das ${N(c.marco!)} questões`), nm(c, `${nomeMarco(c.marco!)} questões`, `${cap(nomeMarco(c.marco!))} questões`)],
    corpo: (c) => [
      momento(c),
      `${cap(nomeMarco(c.marco!))} questões. Passei para te dar parabéns, e para fazer uma conta: isso é ${horasDoMarco(c.marco!)} de estudo arrancadas de uma rotina que não deixa sobrar nada. Não acontece por acaso.`,
      c.marco! <= 100
        ? 'As primeiras cem são as mais difíceis, porque é quando o hábito ainda está nascendo. Daqui para a frente, o site começa a mostrar onde você está forte e onde vale insistir.'
        : c.marco! <= 500
          ? 'Isso já não é teste, é constância. A essa altura, o maior ganho costuma estar no tema que mais te desafia: com calma, ele cresce rápido.'
          : 'Poucas pessoas chegam aqui. Você já viu boa parte do que as bancas gostam de perguntar, e daqui em diante o que leva uma boa nota a uma ótima é a revisão, não o volume.',
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, `${N(c.marco!)} questões, e contando`, `${N(c.marco!)} questões respondidas`)],
    corpo: (c) => [
      momento(c),
      `Vi que você acabou de passar das ${N(c.marco!)} questões no Orto Questões, e fiquei muito feliz.`,
      c.pctBom !== null ? `E com ${c.pctBom}% de acerto. Cada uma dessas questões é um tema a mais que você viu antes da prova, em ${horasDoMarco(c.marco!)} que você encontrou onde quase ninguém encontra.` : `Cada uma delas é um tema a mais que você viu antes da prova, em ${horasDoMarco(c.marco!)} que você encontrou onde quase ninguém encontra.`,
      `Para comemorar do jeito certo, que tal uma passada na Revisão? Leva dez minutos e protege tudo isso: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'um marco bonito', 'Um marco bonito')],
    corpo: (c) => [
      momento(c),
      `${cap(N(c.marco!))} questões. Não acontece por acaso: é a soma de muitos dias em que você escolheu estudar, mesmo com sono. Em tempo, dá ${horasDoMarco(c.marco!)}; em dias, dá muitos em que seria mais fácil não abrir o site.`,
      c.obs(2),
      'Parabéns, de verdade.',
    ] },
  { id: 'v4', requer: (c) => c.marco! >= 500, assuntos: (c) => [nm(c, 'isso é constância', 'Isso é constância')],
    corpo: (c) => [
      momento(c),
      `Quando alguém passa das ${N(c.marco!)} questões, eu faço questão de escrever.`,
      J('Isso é constância, e eu admiro muito.', c.obs(1), c.pctBom !== null ? `${c.pctBom}% de acerto, aliás.` : null),
      'Uma sugestão para a próxima etapa: reler os comentários das questões que te pegaram mais de uma vez. É onde estão os pontos que ainda escapam, e pede menos tempo do que qualquer questão nova.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, `parabéns pelas ${N(c.marco!)} questões`, `Parabéns pelas ${N(c.marco!)} questões`)],
    corpo: (c) => [
      momento(c),
      `Só um recado rápido: parabéns pelas ${N(c.marco!)} questões. Fiquei muito feliz de ver.`,
      `Para quem tem o dia tomado, isso é ${horasDoMarco(c.marco!)} de estudo que poderiam ter virado qualquer outra coisa, e viraram prova. Eu sei o que custa.`,
      c.obs(1),
      c.tempo(),
    ] },
  { id: 'v6', assuntos: (c) => [nm(c, `${N(c.marco!)} e o que vem agora`, `${N(c.marco!)} questões e o que vem agora`)],
    corpo: (c) => [
      momento(c),
      `Você passou das ${N(c.marco!)} questões, e eu quis registrar.`,
      c.marco! < 500
        ? 'O hábito já existe. Agora o que mais rende é a Revisão: as questões que te pegaram voltam no momento certo para virar acerto, e isso pede menos tempo do que o volume que você já fez.'
        : 'A partir daqui, os pontos que faltam estão nos detalhes, e o Caderno de erros é o melhor mapa deles. Menos horas, mais precisão.',
      c.obs(1),
      c.fecho(),
    ] },
]

/** Pedir opinião: três perguntas concretas. */
const opiniao: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'posso te pedir uma opinião?', 'Posso te pedir uma opinião?')],
    corpo: (c) => [
      momento(c),
      c.dez ? `Você já fez ${Q(c.r)} no Orto Questões, então ninguém melhor para me dizer o que está bom e o que dá para melhorar.` : 'Queria muito a sua opinião sobre o site, mesmo que você tenha usado pouco.',
      'Três perguntas, responde só as que quiser: o que faz você voltar ao site? O que te faz perder tempo nele? O que você gostaria que existisse e ainda não existe?',
      'Pode ser uma linha. Eu leio todas e respondo.',
      c.obs(1),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'uma pergunta só', 'Uma pergunta só')],
    corpo: (c) => [
      momento(c),
      'Uma pergunta só: se você pudesse mudar uma coisa no Orto Questões, o que seria?',
      'Responde aqui mesmo? As melhores ideias do site vieram assim, de quem estuda de verdade e sente onde o tempo escapa.',
      c.obs(1),
      c.tempo(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'me ajuda a melhorar o site?', 'Me ajuda a melhorar o site?')],
    corpo: (c) => [
      momento(c),
      J('Estou planejando as próximas melhorias do site e queria ouvir quem estuda de verdade por aqui.', c.obs(1)),
      'Três perguntas rápidas, responde só as que quiser:\n- Os comentários estão ajudando, ou estão longos demais?\n- Tem alguma área em que você sente falta de mais questões?\n- O site cabe na sua rotina, ou tem alguma coisa que atrapalha?',
      'Obrigado desde já. Cada resposta vira melhoria.',
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'sua opinião importa muito', 'Sua opinião importa muito')],
    corpo: (c) => [
      momento(c),
      'Queria muito a sua opinião, inclusive sobre o que não está bom. Elogio é gostoso, mas é a crítica que melhora o site.',
      'Os comentários das questões estão ajudando? O cronograma e a Revisão fazem sentido na sua rotina? Tem alguma coisa que você abre e fecha sem usar?',
      c.obs(1),
      'É só responder. Eu leio tudo e respondo.',
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'o que está faltando?', 'O que está faltando?')],
    corpo: (c) => [
      momento(c),
      J(c.dez ? `Vi as suas ${Q(c.r)} e fiquei com uma curiosidade.` : 'Fiquei com uma curiosidade.', c.obs(1)),
      'O que está faltando no Orto Questões para ele ser o lugar onde você mais gosta de estudar? Pode ser coisa grande ou pequena.',
      'Respondendo este e-mail, chega direto para mim, e eu respondo.',
    ] },
]

/** Pedir para indicar: "quem você conhece que está nessa?"; os 7 dias para os dois. */
const indicar: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'quem você conhece que está nessa?', 'Quem você conhece que está nessa?'), nm(c, 'um pedido', 'Um pedido')],
    corpo: (c) => [
      momento(c),
      'Queria te agradecer por estudar no Orto Questões. O site é um projeto independente e cresce no boca a boca, então tenho um pedido: quem você conhece que está estudando para a mesma prova e ainda não conhece o site?',
      'Quando um colega cria a conta pelo seu link e responde 20 questões, vocês dois ganham 7 dias do plano completo. Vale para até 12 amigos. E estudar junto deixa a rotina mais leve.',
      `Seu link pessoal fica aqui: ${c.link('indicar')}`,
      'Muito obrigado.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'estudar junto rende mais', 'Estudar junto rende mais')],
    corpo: (c) => [
      momento(c),
      'Estudar junto rende mais, principalmente para quem tem pouco tempo: um lembra o outro, um explica o que o outro errou, e o ranking fica mais animado.',
      `Se tiver colegas se preparando para a prova, que tal mandar o seu link? Quando alguém cria a conta por ele e responde 20 questões, vocês dois ganham 7 dias do plano completo: ${c.link('indicar')}`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'você conhece alguém?', 'Você conhece alguém?')],
    corpo: (c) => [
      momento(c),
      'Você conhece alguém que está estudando para o TEOT, para o TARO ou para o R4, e que reclama de não ter tempo?',
      'Se conhecer, me ajuda muito mandar o Orto Questões para essa pessoa, porque foi para ela que eu fiz o site. E ainda vale para você: pelo seu link, cada colega que responde 20 questões dá 7 dias do plano completo para os dois.',
      `O link está aqui: ${c.link('indicar')}`,
      c.fecho(),
    ] },
  { id: 'v4', requer: temFatos, assuntos: (c) => [nm(c, 'obrigado, e um pedido', 'Obrigado, e um pedido')],
    corpo: (c) => [
      J('Obrigado por estar por aqui.', momento(c)),
      c.obs(2),
      `Um pedido: se o site te ajuda, conta para um colega? Pelo seu link, vocês dois ganham 7 dias do plano completo quando a pessoa responde 20 questões: ${c.link('indicar')}`,
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'manda para um colega?', 'Manda para um colega?')],
    corpo: (c) => [
      momento(c),
      'Um pedido rápido: se o Orto Questões tem te ajudado a estudar no tempo que sobra, que tal mandar para um colega que esteja na mesma?',
      `Pelo seu link pessoal, quando a pessoa cria a conta e responde 20 questões, vocês dois ganham 7 dias do plano completo. Vale para até 12 amigos: ${c.link('indicar')}`,
      c.tempo(),
      'Obrigado pela força.',
    ] },
]

/** Apresentar o cronograma: quando ele devolve tempo. */
const cronograma: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'conhece o cronograma?', 'Conhece o cronograma?'), nm(c, 'um plano até a prova', 'Um plano até a prova')],
    corpo: (c) => [
      momento(c),
      'Queria te apresentar uma coisa de que o pessoal tem gostado bastante: o cronograma.',
      cronogramaDevolve(c),
      `A prévia do seu cronograma é aberta, vale dar uma olhada: ${c.link('cronograma')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'o que estudar hoje', 'O que estudar hoje')],
    corpo: (c) => [
      momento(c),
      'Sabe aquela dúvida de todo dia, "o que eu estudo hoje"? Ela custa uns quinze minutos por dia, e em um mês isso é uma tarde inteira. O cronograma responde por você.',
      J(c.fato('prova'), `Você coloca a data ${c.daProva}, e ele monta a lista de cada dia, com o que mais cai primeiro, e dia de plantão sem quebrar o plano.`),
      `Dá para ver a prévia do seu: ${c.link('cronograma')}`,
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma ideia para organizar o estudo', 'Uma ideia para organizar o estudo')],
    corpo: (c) => [
      momento(c),
      c.dez ? `Você já tem ${Q(c.r)} por aqui. Se quiser organizar as próximas sem gastar tempo planejando, o cronograma pode ajudar.` : 'Se quiser organizar o estudo até a prova sem gastar tempo planejando, o cronograma pode ajudar.',
      `Ele divide o que falta pelos dias até a prova e diz o que estudar hoje. Você senta, a lista está pronta. A prévia é aberta: ${c.link('cronograma')}`,
      c.obs(1),
      c.fecho(),
    ] },
  { id: 'v4', requer: teotOuProva, assuntos: (c) => [diasProva(c) && nm(c, `faltam ${diasProva(c)}`, `Faltam ${diasProva(c)} para ${c.nomeProva}`), nm(c, 'um plano para o tempo que falta', 'Um plano para o tempo que falta')],
    corpo: (c) => [
      `${faltam(c)}. Dá tempo de muita coisa, ainda mais com um plano que já esteja pronto quando você senta.`,
      momento(c),
      `O cronograma do site faz esse plano com você: passa primeiro pelo que mais cai, se ajusta quando a semana aperta e termina com uma reta final de revisão. Veja a prévia do seu: ${c.link('cronograma')}`,
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'e se o plantão bagunçar a semana?', 'E se o plantão bagunçar a semana?')],
    corpo: (c) => [
      momento(c),
      'Se você dá plantão, talvez já tenha pensado nisso: e se o plantão bagunçar a semana de estudo?',
      'Foi para isso que o cronograma ganhou o dia de plantão. Você marca, e ele redistribui o que ficou para trás, sem quebrar o plano até a prova. Aquele peso de "atrasei" simplesmente deixa de existir.',
      `A prévia do seu é aberta: ${c.link('cronograma')}`,
      c.fecho(),
    ] },
]

// ---------------------------------------------------------------------------
// Automáticos: renovação do Pix e resumo de estudo
// ---------------------------------------------------------------------------

const dataCurta = (iso: string | null | undefined) => (iso && Number.isFinite(new Date(iso).getTime()) ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : null)
const dataLonga = (iso: string | null | undefined) => (iso && Number.isFinite(new Date(iso).getTime()) ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }) : null)
const mesesDoPlano = (plano: string | null | undefined) => ({ mensal: '1 mês', semestral: '6 meses', anual: '12 meses' } as Record<string, string>)[plano ?? ''] ?? null
const nomePlano = (plano: string | null | undefined) => ({ mensal: 'mensal', semestral: 'semestral', anual: 'anual' } as Record<string, string>)[plano ?? ''] ?? null
/** Nada se perde: o que fica guardado renovando ou não. */
const nadaSePerde = (c: Ctx) => (c.dez
  ? `${cap(asSuas(c))}${c.pctBom !== null ? `, os ${c.pctBom}% de acerto` : ''} e o Caderno de erros ficam guardados de qualquer jeito. Nada se perde, renovando ou não.`
  : 'Tudo o que você fez fica guardado de qualquer jeito. Nada se perde, renovando ou não.')

/** Pix: faltam 3 dias. Sem urgência; nada se perde; agradecimento. */
const pix_3_dias: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, `seu acesso vai até ${dataCurta(c.pix?.fimEm) ?? 'os próximos dias'}`, `Seu acesso vai até ${dataCurta(c.pix?.fimEm) ?? 'os próximos dias'}`), nm(c, 'um lembrete sobre o seu Pix', 'Um lembrete sobre o seu Pix')],
    corpo: (c) => {
      const d = Math.max(1, c.pix?.diasRestantes ?? 3), fim = dataCurta(c.pix?.fimEm), meses = mesesDoPlano(c.pix?.plano), plano = nomePlano(c.pix?.plano)
      return [
        momento(c),
        `Passando com um lembrete amigo: o seu plano${plano ? ` ${plano}` : ''}, pago no Pix, vai até ${fim ?? `daqui a ${D(d)}`}. Como o Pix não renova sozinho, quis te avisar com calma, sem pressa nenhuma.`,
        `Se quiser continuar, dá para renovar quando preferir, sem perder nenhum dia: os ${D(d)} que faltam continuam valendo e o período novo começa quando o atual termina${meses ? `. Renovando o mesmo plano, você fica com esses ${D(d)} mais ${meses}` : ''}.`,
        nadaSePerde(c),
        `A renovação fica na página de planos: ${c.link('assinatura')}`,
      ]
    } },
  { id: 'v2', assuntos: (c) => [nm(c, `faltam ${D(Math.max(1, c.pix?.diasRestantes ?? 3))} do seu plano`, `Faltam ${D(Math.max(1, c.pix?.diasRestantes ?? 3))} do seu plano`)],
    corpo: (c) => {
      const d = Math.max(1, c.pix?.diasRestantes ?? 3), fim = dataCurta(c.pix?.fimEm)
      return [
        `Faltam ${D(d)} para terminar o acesso que você pagou no Pix${fim ? ` (vai até ${fim})` : ''}. Aviso com antecedência porque sei que ninguém tem tempo de ficar lembrando de data.`,
        c.fatos.semana ? `Vi que você fez ${Q(c.fatos.semana)} só na última semana, que ritmo bonito. Quis avisar para nada interromper esse embalo.` : 'Quis avisar para nada interromper o seu estudo, se você quiser seguir.',
        `Se renovar antes, os dias que faltam não se perdem: o período novo começa quando o atual termina. Fica tudo na página de planos: ${c.link('assinatura')}`,
        'Se preferir não ter que lembrar, no cartão a assinatura renova sozinha, e dá para cancelar quando quiser em Minha conta.',
        'E obrigado pelo tempo que você já passou por aqui.',
      ]
    } },
  { id: 'v3', assuntos: (c) => [nm(c, 'sobre o seu acesso no Pix', 'Sobre o seu acesso no Pix')],
    corpo: (c) => {
      const fim = dataCurta(c.pix?.fimEm)
      return [
        momento(c),
        `Um lembrete rápido, com carinho: o seu acesso pago no Pix vai até ${fim ?? 'os próximos dias'}.`,
        nadaSePerde(c),
        `Se quiser seguir estudando com tudo liberado, dá para renovar antes, sem perder os dias que ainda faltam. É pela página de planos: ${c.link('assinatura')}`,
        'Se tiver qualquer dúvida sobre o pagamento, me responde aqui.',
      ]
    } },
  { id: 'v4', assuntos: (c) => [nm(c, 'obrigado pelo tempo por aqui', 'Obrigado pelo tempo por aqui')],
    corpo: (c) => {
      const d = Math.max(1, c.pix?.diasRestantes ?? 3), fim = dataCurta(c.pix?.fimEm)
      return [
        'Antes do lembrete, um obrigado: pelo tempo que você já passou estudando por aqui, e pela confiança.',
        `O lembrete: o seu acesso pago no Pix termina em ${D(d)}${fim ? `, dia ${fim}` : ''}. Como o Pix não renova sozinho, aviso para a escolha ser sua, com calma.`,
        nadaSePerde(c),
        `Se fizer sentido continuar, a renovação fica aqui, e o período novo emenda no atual: ${c.link('assinatura')}`,
        portaAberta,
      ]
    } },
  { id: 'v5', assuntos: (c) => [nm(c, 'três dias e uma escolha sua', 'Três dias e uma escolha sua')],
    corpo: (c) => {
      const fim = dataCurta(c.pix?.fimEm)
      return [
        momento(c),
        `O seu acesso pago no Pix vai até ${fim ?? 'daqui a poucos dias'}. Escrevo porque prefiro que a escolha de continuar seja sua, feita com tempo, e não uma surpresa no dia.`,
        c.obs(1),
        nadaSePerde(c),
        `Se quiser seguir, a renovação emenda no atual, sem intervalo: ${c.link('assinatura')}`,
      ]
    } },
]

/** Pix: termina hoje. Transacional; sem urgência; obrigado. */
const pix_hoje: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'seu acesso vai até hoje', 'Seu acesso vai até hoje')],
    corpo: (c) => {
      const meses = mesesDoPlano(c.pix?.plano), plano = nomePlano(c.pix?.plano)
      return [
        momento(c),
        `Hoje é o último dia do seu plano${plano ? ` ${plano}` : ''} pago no Pix, e quis te avisar com carinho.`,
        `Se renovar hoje, você segue sem nenhum dia de intervalo: o período novo começa quando o atual termina${meses ? ` e vale ${meses === '1 mês' ? '1 mês completo' : `${meses} completos`}` : ''}. Se renovar depois, ele começa no dia do pagamento. Nos dois casos, nada se perde.`,
        nadaSePerde(c),
        `A renovação fica aqui: ${c.link('assinatura')}`,
      ]
    } },
  { id: 'v2', assuntos: (c) => [nm(c, 'último dia do seu plano', 'Último dia do seu plano')],
    corpo: (c) => [
      'Só para não ter surpresa amanhã: o seu acesso pago no Pix vai até hoje.',
      momento(c),
      `Se quiser continuar, renovar hoje mantém tudo sem interrupção, inclusive a fila da Revisão. É pela página de planos: ${c.link('assinatura')}`,
      'E se preferir não renovar agora, obrigado de coração pelo tempo de assinatura. Seu progresso fica guardado, esperando por você, do jeito que você deixou.',
      portaAberta,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'hoje é o último dia do seu Pix', 'Hoje é o último dia do seu Pix')],
    corpo: (c) => [
      'Hoje é o último dia do acesso do seu plano pago no Pix.',
      c.dez ? `Você construiu bastante coisa aqui: ${Q(c.r)}${c.pctBom !== null ? `, com ${c.pctBom}% de acerto` : ''}. Fico feliz de ver tudo isso, e nada disso se perde.` : 'Tudo o que você fez por aqui fica guardado, renovando ou não.',
      `Se quiser seguir, renovando hoje o período novo emenda no atual: ${c.link('assinatura')}`,
      c.tempo(),
      'Qualquer dúvida, me responde.',
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'obrigado, e um aviso', 'Obrigado, e um aviso')],
    corpo: (c) => [
      'Primeiro, obrigado pelo tempo que você passou estudando por aqui com tudo liberado.',
      'O aviso: o seu acesso pago no Pix termina hoje. Como o Pix não renova sozinho, a escolha é sua, e qualquer uma delas está certa.',
      nadaSePerde(c),
      `Se quiser continuar, a renovação fica aqui e emenda no período atual: ${c.link('assinatura')}`,
      portaAberta,
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'o que acontece amanhã', 'O que acontece amanhã')],
    corpo: (c) => [
      momento(c),
      'Seu acesso pago no Pix vai até hoje, e quis te contar com clareza o que acontece amanhã, para não ter susto.',
      c.dez ? `As questões abertas continuam, ${asSuas(c)} e o Caderno de erros ficam guardados, e a Revisão continua separando o que precisa voltar. O que fica fechado é a parte do plano: cronograma, Simulado Nacional, temas que mais caem e Biblioteca.` : 'As questões abertas continuam e tudo o que você fez fica guardado. O que fica fechado é a parte do plano: cronograma, Simulado Nacional, temas que mais caem e Biblioteca.',
      `Se quiser seguir com tudo liberado, a renovação fica aqui: ${c.link('assinatura')}`,
      'Se não for a hora, tudo bem também. Obrigado pelo tempo por aqui.',
    ] },
]

const AREA_NOME = (slug: string, c: Ctx) => c.area(slug)?.em ?? slug
const PONTOS = (n: number) => (n === 1 ? '1 ponto' : `${N(n)} pontos`)
/** "84 questões" ou "algumas questões" (regra dos 10 também no período). */
const QRel = (n: number) => (n >= 10 ? Q(n) : 'algumas questões')
/** Acerto do período, só para citar quando é motivo de orgulho (50% ou mais, com amostra). */
const acertoDoPeriodo = (c: Ctx) => {
  const r = c.relatorio!
  const a = r.certas + r.erradas > 0 ? Math.round((100 * r.certas) / (r.certas + r.erradas)) : null
  const citavel = a !== null && r.respostas >= 30 && a >= 50 ? a : null
  return { acerto: a, citavel, subiu: a !== null && r.respostas >= 10 && r.acertoAnterior !== null && a > r.acertoAnterior ? a - r.acertoAnterior : null }
}
const diasAtivos = (r: { diasAtivos: number }) => (r.diasAtivos === 1 ? 'um dia' : `${['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'][r.diasAtivos] ?? N(r.diasAtivos)} dias`)

/** Resumo quinzenal / relatório do mês: uma história (o que subiu, o destaque, uma ideia); sem número ruim. */
const relatorio: Versao[] = [
  { id: 'v1', assuntos: (c) => {
      const r = c.relatorio!
      return [nm(c, `seu resumo ${r.rotulo}`, `Seu resumo ${r.rotulo}`), r.respostas >= 10 && nm(c, `${Q(r.respostas)} ${r.em}`, `${cap(Q(r.respostas))} ${r.em}`)]
    },
    corpo: (c) => {
      const r = c.relatorio!
      if (r.respostas <= 0) return [
        `${r.frase}, a rotina deve ter apertado, e está tudo bem: acontece com todo mundo que estuda no meio da residência, e nada do que você já fez se perdeu.`,
        r.totalAcumulado >= 10 ? `Suas ${Q(r.totalAcumulado)} continuam guardadas, e a Revisão já separou as que pedem uma segunda olhada.` : 'O que você já fez continua guardado, e a Revisão já separou o que pede uma segunda olhada.',
        'Para voltar sem peso: não tente recuperar o tempo. Dez questões e a Revisão do dia já colocam tudo nos trilhos, em dez minutos.',
        `A Revisão fica aqui: ${c.link('revisao')}`,
        c.fecho(),
      ]
      const { citavel, subiu } = acertoDoPeriodo(c)
      const destaque = r.subiram[0]
      return [
        `Passando com o seu resumo ${r.rotulo}, e ele veio bonito.`,
        `${r.frase}, foram ${QRel(r.respostas)} em ${diasAtivos(r)} de estudo${citavel !== null ? `, com ${citavel}% de acerto` : ''}${subiu !== null ? `, ${PONTOS(subiu)} acima do período anterior` : ''}.${destaque ? ` O destaque foi ${AREA_NOME(destaque.slug, c)}, que subiu ${PONTOS(destaque.agora - destaque.antes)}. Dá para ver que você está lendo os comentários, porque esse tipo de salto não vem por acaso.` : ' Dá para ver que você está lendo os comentários, e é isso que faz o estudo render.'}`,
        c.fatos.horario ? c.fato('horario') : 'Trinta minutos num horário fixo valem mais que duas horas espalhadas. Se achar o seu horário, protege ele.',
        r.simulado && r.simulado.total > 0 && r.simulado.acertos / r.simulado.total >= 0.5 ? `No ${r.simulado.titulo}, você fez ${r.simulado.acertos} de ${r.simulado.total}. Parabéns.` : r.simulado ? `Obrigado por encarar o ${r.simulado.titulo}: só de fazer, já é um ótimo treino de tempo e de nervoso.` : null,
        r.maisFraco && r.maisFraco.acerto < 70
          ? `Uma ideia para o próximo período: dez questões de ${AREA_NOME(r.maisFraco.slug, c)} por semana. É onde cada sessão vai render mais agora. ${c.link('treinar')}`
          : `Uma ideia para o próximo período: manter a Revisão em dia e abrir um tema que você ainda quer explorar. ${c.link('revisao')}`,
      ]
    },
    ps: (c) => {
      const r = c.relatorio!
      return r.totalAcumulado >= 100 ? `P.S.: no total já são ${Q(r.totalAcumulado)} diferentes. Quando eu vejo um número desses, penso na prova e fico tranquilo por você.` : c.ps()
    } },
  { id: 'v2', requer: (c) => (c.relatorio?.respostas ?? 0) > 0, assuntos: (c) => [nm(c, `como foi o seu estudo ${c.relatorio!.em}`, `Como foi o seu estudo ${c.relatorio!.em}`), nm(c, `seu resumo ${c.relatorio!.rotulo}`, `Seu resumo ${c.relatorio!.rotulo}`)],
    corpo: (c) => {
      const r = c.relatorio!
      const { citavel, subiu } = acertoDoPeriodo(c)
      return [
        `Passando com o seu resumo: ${QRel(r.respostas)} ${r.em}, em ${diasAtivos(r)}.${citavel !== null ? ` Acerto de ${citavel}%${subiu !== null ? `, ${PONTOS(subiu)} a mais que no período anterior` : ''}.` : subiu !== null ? ` E o seu acerto subiu ${PONTOS(subiu)} em relação ao período anterior.` : ''}`,
        r.respostasAnterior >= 10 && r.respostas > r.respostasAnterior ? `Foi mais do que no período anterior (${Q(r.respostasAnterior)}). Que bom sinal, porque constância é o que mais conta.` : 'O que mais conta é seguir aparecendo, e você está seguindo, mesmo com a rotina que imagino.',
        r.subiram.length ? `Destaque para ${AREA_NOME(r.subiram[0].slug, c)}, que cresceu ${PONTOS(r.subiram[0].agora - r.subiram[0].antes)}. Isso é comentário lido com atenção.` : null,
        c.obs(1, ['horario', 'sequencia', 'ranking']),
        r.maisFraco && r.maisFraco.acerto < 70 ? `Uma ideia para o próximo passo: dez questões de ${AREA_NOME(r.maisFraco.slug, c)} por semana, que é onde cada sessão vai render mais. ${c.link('treinar')}` : `Uma ideia para o próximo passo: manter a Revisão em dia, dez minutos por dia. ${c.link('revisao')}`,
      ]
    },
    ps: (c) => {
      const r = c.relatorio!
      return r.totalAcumulado >= 100 ? `P.S.: no total, já são ${Q(r.totalAcumulado)} diferentes. Isso é base de verdade.` : c.ps()
    } },
  { id: 'v3', requer: (c) => (c.relatorio?.respostas ?? 0) >= 10, assuntos: (c) => [nm(c, 'a história do seu estudo', `A história do seu estudo ${c.relatorio!.em}`), nm(c, `seu resumo ${c.relatorio!.rotulo}`, `Seu resumo ${c.relatorio!.rotulo}`)],
    corpo: (c) => {
      const r = c.relatorio!
      const { citavel, subiu } = acertoDoPeriodo(c)
      return [
        `Queria te contar a história do seu estudo ${r.em}, porque ela é melhor do que parece de dentro da rotina.`,
        `Começa com ${diasAtivos(r)} em que você abriu o site, mesmo com sono. Nesses dias, ${Q(r.respostas)}${citavel !== null ? `, com ${citavel}% de acerto` : ''}.${subiu !== null ? ` E o acerto subiu ${PONTOS(subiu)} em relação ao período anterior, o que quer dizer que as questões que te pegaram viraram acerto.` : ''}`,
        r.subiram.length ? `O capítulo bonito é ${AREA_NOME(r.subiram[0].slug, c)}: subiu ${PONTOS(r.subiram[0].agora - r.subiram[0].antes)}. Esse tipo de salto não vem por acaso; vem de comentário lido até o fim.` : 'O capítulo bonito é a constância: aparecer é a parte mais difícil, e você apareceu.',
        r.cairam.length ? `O próximo capítulo, se eu pudesse sugerir, seria uma revisita com carinho a ${AREA_NOME(r.cairam[0].slug, c)}. Dez questões por semana bastam.` : c.tempo(),
        `Quando quiser continuar a história, a Revisão já está pronta: ${c.link('revisao')}`,
      ]
    } },
  { id: 'v4', requer: (c) => (c.relatorio?.respostas ?? 0) > 0, assuntos: (c) => [nm(c, 'o que eu vi no seu período', `O que eu vi ${c.relatorio!.em}`), nm(c, `seu resumo ${c.relatorio!.rotulo}`, `Seu resumo ${c.relatorio!.rotulo}`)],
    corpo: (c) => {
      const r = c.relatorio!
      const { citavel, subiu } = acertoDoPeriodo(c)
      return [
        momento(c),
        `${r.frase}, você estudou em ${diasAtivos(r)}, com ${QRel(r.respostas)}${citavel !== null ? ` e ${citavel}% de acerto` : ''}. Para quem tem o dia tomado, isso é muito.`,
        subiu !== null ? `O que mais me chamou a atenção: o acerto subiu ${PONTOS(subiu)} em relação ao período anterior. Isso é a Revisão trabalhando, e você deixando ela trabalhar.` : r.subiram.length ? `O que mais me chamou a atenção foi ${AREA_NOME(r.subiram[0].slug, c)}, que subiu ${PONTOS(r.subiram[0].agora - r.subiram[0].antes)}.` : 'O que mais me chamou a atenção foi a constância, que é a parte que ninguém vê e a que mais conta.',
        r.maisFraco && r.maisFraco.acerto < 70 ? `Para o próximo período, se fizer sentido: dez questões de ${AREA_NOME(r.maisFraco.slug, c)} por semana. É onde cada sessão rende mais agora. ${c.link('treinar')}` : `Para o próximo período: proteger o horário que funciona e manter a Revisão em dia. ${c.link('revisao')}`,
        c.fecho(),
      ]
    } },
  { id: 'v5', requer: (c) => (c.relatorio?.respostas ?? 0) > 0 && (c.relatorio?.respostas ?? 0) < 30, assuntos: (c) => [nm(c, `seu resumo ${c.relatorio!.rotulo}`, `Seu resumo ${c.relatorio!.rotulo}`), nm(c, 'pouco, mas de verdade', 'Pouco, mas de verdade')],
    corpo: (c) => {
      const r = c.relatorio!
      return [
        `Passando com o seu resumo ${r.rotulo}. Foi um período de pouco estudo, e eu queria dizer uma coisa sobre isso.`,
        `${r.frase}, você abriu o site em ${diasAtivos(r)} e fez ${QRel(r.respostas)}. Pouco, mas de verdade: cada questão dessas tem a explicação de todas as alternativas, então rendeu mais do que parece.`,
        'Para o próximo período, não precisa recuperar nada. Dez questões por semana, no intervalo que der, já mantêm o hábito vivo. O site guarda o resto.',
        `A Revisão fica aqui, com o que pede uma segunda olhada: ${c.link('revisao')}`,
        c.fecho(),
      ]
    } },
]

// ---------------------------------------------------------------------------
// Os seis automáticos novos (17/10/2026), disparados por um acontecimento
// ---------------------------------------------------------------------------

/** Boas-vindas no dia da confirmação (primeiro login): quem eu sou e os primeiros dez minutos. */
const boas_vindas_dia0: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'que bom ter você no Orto Questões', 'Que bom ter você no Orto Questões'), nm(c, 'os primeiros dez minutos', 'Os primeiros dez minutos')],
    corpo: (c) => [
      'Que bom ter você no Orto Questões. Eu sou o Tales, ortopedista, e fiz o site que eu queria ter tido quando estudava para o TEOT: as questões das provas de verdade, cada uma com a explicação de todas as alternativas, não só da certa.',
      J(c.fato('prova'), c.fato('etapa')),
      'Se eu pudesse te dar um único conselho para os primeiros dez minutos: faça cinco questões de um tema que você gosta e leia o comentário inteiro, inclusive das alternativas erradas. É ali que mora a pegadinha da banca, e é ali que o estudo começa a render.',
      'O resto vem com calma. A Revisão aprende com o que você erra e traz de volta na hora certa; o Desempenho mostra onde você está crescendo. Você só precisa sentar e fazer.',
      `Para começar: ${c.link('treinar')}`,
    ],
    ps: () => 'P.S.: este e-mail não é automático de verdade. Se responder, sou eu que leio.' },
  { id: 'v2', assuntos: (c) => [nm(c, 'oi, sou o Tales', 'Oi, sou o Tales'), nm(c, 'um oi de quem fez o site', 'Um oi de quem fez o site')],
    corpo: (c) => [
      'Oi, sou o Tales. Sou ortopedista, passei pelo TEOT com a rotina que você conhece, e fiz este site para que estudar coubesse nos intervalos que a residência deixa.',
      J(c.fato('etapa'), c.fato('prova')),
      'O combinado é simples: você senta e estuda, o site decide o resto. Cada questão vem da prova real e explica todas as alternativas. A Revisão guarda o que te pegou e traz de volta na hora certa.',
      'Para hoje, sugiro só uma coisa: um tema de que você goste, cinco questões, comentário lido até o fim. Dez minutos.',
      `Fica aqui: ${c.link('treinar')}`,
    ],
    ps: () => 'P.S.: se travar em qualquer coisa, me responde. Eu leio tudo.' },
  { id: 'v3', assuntos: (c) => [nm(c, 'sua conta está pronta', 'Sua conta está pronta'), nm(c, 'por onde começar hoje', 'Por onde começar hoje')],
    corpo: (c) => [
      'Sua conta está pronta, e eu quis te escrever antes de qualquer coisa automática. Sou o Tales, ortopedista, e cuido do site pessoalmente.',
      J(momento(c)),
      'Uma coisa que eu gostaria que você soubesse: aqui, errar é barato. Cada questão que te pega vira uma explicação completa e volta na Revisão no momento certo. É na prova que errar custa; aqui, é treino.',
      'Para começar, não planeje nada. Abra um tema que você gosta e faça cinco. Depois me conta como foi, se quiser.',
      `O caminho mais curto: ${c.link('treinar')}`,
    ],
    ps: () => 'P.S.: este e-mail não é automático de verdade. Se responder, sou eu que leio.' },
  { id: 'v4', assuntos: (c) => [nm(c, 'três coisas sobre o site', 'Três coisas sobre o site')],
    corpo: (c) => [
      'Que bom ter você por aqui. Sou o Tales, e queria te contar três coisas sobre o site antes de você começar.',
      'A primeira: as questões são das provas de verdade, com a explicação de todas as alternativas. A segunda: a Revisão aprende com o que te pega e traz de volta na hora certa, sem você anotar nada. A terceira: dez minutos no intervalo já contam, porque o site foi feito para caber na rotina real.',
      J(c.fato('prova'), c.fato('etapa')),
      `Para os primeiros dez minutos, cinco questões de um tema de que você goste: ${c.link('treinar')}`,
      'E se qualquer coisa ficar confusa, me responde. Eu leio tudo.',
    ],
    ps: () => 'P.S.: a parte do site em que eu mais caprichei foi o comentário das alternativas erradas. Vale ler até o fim.' },
  { id: 'v5', assuntos: (c) => [nm(c, 'o site que eu queria ter tido', 'O site que eu queria ter tido')],
    corpo: (c) => [
      'Eu sou o Tales, ortopedista. Fiz o Orto Questões porque, quando estudava para o TEOT, perdia mais tempo decidindo o que estudar do que estudando. Queria um lugar em que eu abrisse e já soubesse o que fazer.',
      J(momento(c)),
      'É isso que o site tenta ser para você: questões das provas reais, cada alternativa explicada, a Revisão trazendo de volta o que te pegou. Você senta e faz; o resto está decidido.',
      'Para hoje, uma sugestão só: cinco questões de um tema que você gosta, com o comentário lido até o fim. Dez minutos bastam para sentir se o jeito do site combina com você.',
      `Fica aqui: ${c.link('treinar')}`,
    ],
    ps: () => 'P.S.: se responder este e-mail, sou eu que leio. Pode escrever.' },
]

/** Primeiras 10 questões: o hábito começou. */
const primeiras_10: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'dez questões, e o hábito começou', 'Dez questões, e o hábito começou'), nm(c, 'as suas primeiras dez', 'As suas primeiras dez')],
    corpo: (c) => [
      momento(c),
      'Vi que você passou das dez primeiras questões, e quis registrar: é aqui que o hábito começa. As dez primeiras são as mais difíceis, porque é quando a gente ainda está decidindo se vai continuar.',
      'Uma coisa para as próximas: ler o comentário mesmo quando acerta. É onde a banca esconde o que ainda vai cobrar, e leva um minuto a mais.',
      c.tempo(),
      `A Revisão já começou a separar o que pede uma segunda olhada: ${c.link('revisao')}`,
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'o começo está feito', 'O começo está feito')],
    corpo: (c) => [
      momento(c),
      'Dez questões respondidas. Parece pouco, e é exatamente por isso que eu escrevo: o começo está feito, e começar é a parte que mais gente deixa para depois.',
      'Daqui, o que mais ajuda é manter o ritmo pequeno: cinco por dia, no mesmo horário. Em um mês são mais de cem, e o site já consegue te mostrar os temas em que você mais brilha.',
      J(c.fato('prova'), c.fato('etapa')),
      `Para seguir: ${c.link('treinar')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'dez questões, uma pergunta', 'Dez questões, uma pergunta')],
    corpo: (c) => [
      momento(c),
      'Vi as suas primeiras dez questões, e queria te fazer uma pergunta: o jeito do site combinou com você?',
      'Pergunto porque é agora que vale ajustar. Se os comentários estão longos demais, se alguma coisa ficou confusa, se o tempo está apertado, me conta respondendo este e-mail. Eu leio tudo.',
      'Se combinou, o conselho é só um: siga pequeno e constante. A Revisão cuida de trazer de volta o que te pegou.',
      c.tempo(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'as dez primeiras são as mais difíceis', 'As dez primeiras são as mais difíceis')],
    corpo: (c) => [
      momento(c),
      'As dez primeiras questões são as mais difíceis de toda a preparação. Não pelo conteúdo: pelo tempo que a gente precisa achar para elas. Você achou.',
      'Agora o site começa a trabalhar por você: a Revisão guarda o que te pegou e traz de volta na hora certa, e o Desempenho começa a desenhar onde você está forte.',
      J(c.fato('prova'), c.fato('etapa')),
      `Quando der, mais cinco: ${c.link('treinar')}`,
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'dez feitas, e o resto é ritmo', 'Dez feitas, e o resto é ritmo')],
    corpo: (c) => [
      momento(c),
      'Dez questões feitas. Fiquei feliz de ver, porque é o sinal de que você encontrou um jeito de encaixar o estudo no dia.',
      'O que eu faria agora no seu lugar: escolher um horário, mesmo que curto, e repetir. Trinta minutos num horário fixo valem mais que duas horas espalhadas, principalmente no começo.',
      'E ler o comentário inteiro, inclusive das alternativas erradas. É a parte do site em que eu mais caprichei.',
      `A lista de hoje fica aqui: ${c.link('treinar')}`,
    ] },
]

/** Que bom te ver de volta (primeiro login após 10+ dias). */
const voltou: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'que bom te ver de volta', 'Que bom te ver de volta')],
    corpo: (c) => [
      `Que bom te ver de volta. Vi que você entrou hoje depois de ${tempoFora(c.p.diasParado)} fora, e quis dizer que fiquei feliz.`,
      c.obs(1, ['melhorArea', 'maisEstudada', 'ranking']) ?? `${guardado(c)}, do jeito que você deixou. Nada se perdeu.`,
      'Para voltar sem peso: não tente recuperar o tempo. Abra a Revisão, que já separou as questões que pedem uma segunda olhada, e faça dez. É assim que o embalo volta.',
      `A Revisão fica aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'voltou, e isso é o que importa', 'Voltou, e isso é o que importa')],
    corpo: (c) => [
      `Vi que você voltou hoje, depois de ${tempoFora(c.p.diasParado)}. Voltar é o que importa; o resto é detalhe.`,
      momento(c),
      `Tudo o que você fez continua guardado${c.dez ? `: ${Q(c.r)}, o Caderno de erros, a fila da Revisão` : ''}. Não precisa refazer nada, nem explicar nada.`,
      'Uma ideia para esta semana: dez questões por dia, no intervalo que der. Pequeno de propósito, para o hábito voltar antes da pressa.',
      `Para começar pelo que mais vale: ${c.link('revisao')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'senti sua falta por aqui', 'Senti sua falta por aqui')],
    corpo: (c) => [
      `Senti sua falta por aqui, e hoje vi que você voltou. Faz ${tempoFora(c.p.diasParado)}, e imagino que a rotina tenha engolido o estudo. Acontece com todo mundo.`,
      c.obs(1, ['prova', 'etapa', 'cronograma', 'melhorArea']),
      'O que eu aprendi na residência é que o estudo que funciona é o que cabe na rotina real. Então, para voltar, nada de maratona: dez minutos, a Revisão, e pronto.',
      `Fica aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'do jeito que você deixou', 'Do jeito que você deixou')],
    corpo: (c) => [
      `Que bom te ver de volta depois de ${tempoFora(c.p.diasParado)}. O site está do jeito que você deixou, e eu também.`,
      momento(c),
      `${cap(asSuas(c))} e as questões para revisar continuam lá. A Revisão até aproveitou o tempo: separou o que mais vale uma segunda olhada.`,
      'Se quiser me contar o que aconteceu nessas semanas, é só responder. Eu leio tudo, e às vezes a resposta vira melhoria no site.',
      c.tempo(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'recomeçar pequeno', 'Recomeçar pequeno')],
    corpo: (c) => [
      `Vi que você voltou hoje, depois de ${tempoFora(c.p.diasParado)}, e quis te mandar uma ideia de amigo: recomeçar pequeno.`,
      'Quem volta depois de um tempo fora costuma querer compensar, e aí a primeira sessão vira maratona e a segunda não acontece. O contrário funciona melhor: dez questões, e amanhã mais dez.',
      c.obs(1),
      `A Revisão já separou por onde começar: ${c.link('revisao')}`,
      c.fecho(),
    ] },
]

/** Cronograma pronto: no dia em que a pessoa monta o plano. */
const cronograma_pronto: Versao[] = [
  { id: 'v1', assuntos: (c) => [diasProva(c) && nm(c, `${diasProva(c)} e um plano pronto`, `${cap(diasProva(c)!)} e um plano pronto`), nm(c, 'seu cronograma está pronto', 'Seu cronograma está pronto')],
    corpo: (c) => [
      `Vi que você montou o seu cronograma hoje${diasProva(c) ? `, com ${c.nomeProva} a ${diasProva(c)}` : ''}. Fiquei feliz, porque isso é a decisão que mais devolve tempo de todas.`,
      'A partir de agora, quando você sentar, a lista do dia já está pronta: o que mais cai primeiro, o tempo de cada parte, a reta final de revisão no fim. Nada para decidir.',
      'Um conselho de quem usou plano parecido: não tente adiantar. Se um dia sobrar tempo, faça a Revisão. Se um plantão bagunçar a semana, marque o dia de plantão e deixe o cronograma redistribuir. Ele foi feito para isso.',
      c.obs(1, ['horario', 'etapa', 'prova']),
      `O seu plano fica aqui: ${c.link('cronograma')}`,
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'a lista do dia já está pronta', 'A lista do dia já está pronta')],
    corpo: (c) => [
      momento(c),
      `Seu cronograma está montado${diasProva(c) ? `: ${diasProva(c)} até ${c.nomeProva}` : ''}. Quis te escrever porque conheço a sensação de olhar para esse plano e pensar "é muita coisa".`,
      'Não é. É uma coisa por dia, e ela já está decidida. O que muda é que você para de gastar os quinze minutos de "o que eu estudo hoje" e usa eles estudando.',
      'Se a semana apertar, ele se ajusta sozinho. Se você adiantar, ele alivia. O plano é seu, não o contrário.',
      `A lista de hoje: ${c.link('cronograma')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'o que fazer com o cronograma', 'O que fazer com o cronograma pronto')],
    corpo: (c) => [
      `Cronograma pronto${diasProva(c) ? `, ${diasProva(c)} para ${c.nomeProva}` : ''}. Agora a parte boa: ele trabalha, você estuda.`,
      'Três coisas que ajudam nas primeiras semanas: abrir a lista do dia antes de qualquer outra coisa, fazer a Revisão quando sobrar tempo em vez de adiantar, e marcar o dia de plantão sem peso na consciência, porque ele redistribui sozinho.',
      c.obs(1, ['horario', 'etapa']),
      'E dormir. O cronograma conta com o seu descanso; foi calibrado assim.',
      `Fica aqui: ${c.link('cronograma')}`,
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'agora é só sentar e fazer', 'Agora é só sentar e fazer')],
    corpo: (c) => [
      momento(c),
      `Vi o seu cronograma montado${diasProva(c) ? ` para ${c.nomeProva}, a ${diasProva(c)}` : ''}, e quis dizer uma coisa: a parte difícil já foi. Decidir estudar com plano é o que separa quem passa com a rotina cheia de quem deixa para depois.`,
      'Daqui, é só sentar e fazer. A lista de cada dia, o que mais cai primeiro, a reta final de revisão: tudo já está decidido. Se um dia faltar, o plano se ajusta, sem drama.',
      c.tempo(),
      `A lista de hoje fica aqui: ${c.link('cronograma')}`,
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'seu plano até a prova', 'Seu plano até a prova')],
    corpo: (c) => [
      `Seu plano até ${c.nomeProva} está pronto${diasProva(c) ? `: ${diasProva(c)}, divididos em dias que cabem na sua rotina` : ''}. Fiquei feliz de ver.`,
      'Uma coisa que eu gostaria que você soubesse: o cronograma foi feito para a rotina real, não para a ideal. Dia de plantão, semana ruim, atraso: ele redistribui. O que ele pede de você é só aparecer.',
      c.obs(1, ['horario', 'etapa', 'prova']),
      'E se em algum momento o plano parecer pesado demais ou leve demais, me responde. Dá para ajustar a intensidade, e eu ajudo.',
      `Fica aqui: ${c.link('cronograma')}`,
    ] },
]

/** Pagamento aprovado: recibo gentil (plano, período, o que libera, link do cronograma). Transacional; nunca o valor. */
const periodoPagamento = (c: Ctx) => {
  const p = c.pagamento
  const inicio = dataLonga(p?.inicioEm), fim = dataLonga(p?.fimEm)
  if (inicio && fim) return `de ${inicio} a ${fim}`
  if (fim) return `até ${fim}`
  const meses = mesesDoPlano(p?.plano)
  return meses ? `pelos próximos ${meses}` : 'pelo período do plano'
}
/** O que o plano libera, de verdade; "sem limite" só quando o limite do gratuito está ligado. */
const oQueLibera = (c: Ctx) => `cronograma até a prova, Simulado Nacional todo mês, temas que mais caem com a resposta da turma e Biblioteca de resumos${c.p.limiteGratisLigado ? ', além de questões sem limite diário' : ''}`
const pagamento_aprovado: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'seu pagamento foi aprovado', 'Seu pagamento foi aprovado'), nm(c, 'está tudo liberado', 'Está tudo liberado')],
    corpo: (c) => {
      const plano = nomePlano(c.pagamento?.plano)
      return [
        `${c.pagamento?.renovacao ? 'Sua renovação' : 'Seu pagamento'} foi aprovad${c.pagamento?.renovacao ? 'a' : 'o'}, e o plano${plano ? ` ${plano}` : ''} já está ativo ${periodoPagamento(c)}. Obrigado pela confiança.`,
        `O que ficou liberado: ${oQueLibera(c)}. Tudo isso para uma coisa só: você sentar e estudar, e o site decidir o resto.`,
        `Se eu pudesse escolher o que você faz nos primeiros dez minutos: montar o cronograma. Você diz a data ${c.daProva}, e a lista de cada dia já fica pronta quando você sentar. É o que mais devolve tempo de tudo o que o plano tem.`,
        `Fica aqui: ${c.link('cronograma')}`,
        c.pagamento?.meio === 'pix' ? 'Como foi no Pix, o plano não renova sozinho: eu te aviso com calma quando estiver acabando.' : 'A assinatura renova sozinha, e dá para cancelar quando quiser em Minha conta, sem precisar explicar nada.',
      ]
    },
    ps: () => 'P.S.: se qualquer coisa não funcionar como esperado, me responde. Eu resolvo pessoalmente.' },
  { id: 'v2', assuntos: (c) => [nm(c, 'obrigado, e o que fazer agora', 'Obrigado, e o que fazer agora'), nm(c, 'recebi o seu pagamento', 'Recebi o seu pagamento')],
    corpo: (c) => {
      const plano = nomePlano(c.pagamento?.plano)
      return [
        `Recebi o seu pagamento${plano ? ` do plano ${plano}` : ''}, e quis te agradecer pessoalmente. O site é um projeto independente; é a assinatura que paga o servidor e o tempo de manter tudo em dia.`,
        `Seu acesso vale ${periodoPagamento(c)}, com ${oQueLibera(c)}.`,
        'Nos primeiros dias, se eu pudesse sugerir uma ordem: primeiro o cronograma, para a lista do dia já estar pronta quando você sentar; depois os temas que mais caem, para saber onde insistir. O resto vem com calma.',
        `O cronograma fica aqui: ${c.link('cronograma')}`,
        'E se algo não funcionar, me responde. Eu leio tudo.',
      ]
    },
    ps: () => 'P.S.: este recibo é também uma carta. Se quiser me contar para qual prova está estudando, eu gosto de saber.' },
  { id: 'v3', assuntos: (c) => [nm(c, 'está tudo certo com o seu plano', 'Está tudo certo com o seu plano')],
    corpo: (c) => {
      const plano = nomePlano(c.pagamento?.plano)
      return [
        `Está tudo certo com o seu plano${plano ? ` ${plano}` : ''}: pagamento aprovado e acesso liberado ${periodoPagamento(c)}.`,
        J(momento(c), c.obs(1, ['prova', 'etapa', 'cronograma'])),
        `A partir de agora você tem ${oQueLibera(c)}. E uma promessa minha: continuar melhorando as questões e os comentários toda semana.`,
        `Para começar pelo que mais devolve tempo, o cronograma: ${c.link('cronograma')}`,
        c.pagamento?.meio === 'pix' ? 'No Pix, o plano não renova sozinho; eu aviso com calma quando estiver perto do fim.' : 'A assinatura renova sozinha, e cancelar é um clique em Minha conta, quando quiser.',
      ]
    },
    ps: () => 'P.S.: obrigado, de verdade. Quem assina é quem mantém o site de pé.' },
  { id: 'v4', assuntos: (c) => [nm(c, 'bem, o plano está ativo', 'O plano está ativo'), nm(c, 'pagamento aprovado', 'Pagamento aprovado')],
    corpo: (c) => {
      const plano = nomePlano(c.pagamento?.plano)
      return [
        `Pagamento aprovado, plano${plano ? ` ${plano}` : ''} ativo ${periodoPagamento(c)}. Esta é a parte burocrática; a parte boa vem agora.`,
        `O que mudou para você: ${oQueLibera(c)}. Em outras palavras, menos tempo decidindo e mais tempo estudando.`,
        'Se eu fosse você, hoje faria uma coisa só: montar o cronograma com a data da prova. Leva dois minutos, e a partir de amanhã a lista do dia já está pronta quando você sentar.',
        `Fica aqui: ${c.link('cronograma')}`,
        'Se não for o que você esperava, o reembolso em 7 dias é pelo próprio site, sem precisar explicar nada.',
      ]
    },
    ps: () => 'P.S.: se responder este e-mail, sou eu que leio. Pode escrever.' },
  { id: 'v5', requer: (c) => !!c.pagamento?.renovacao, assuntos: (c) => [nm(c, 'sua renovação foi aprovada', 'Sua renovação foi aprovada'), nm(c, 'obrigado por continuar', 'Obrigado por continuar')],
    corpo: (c) => {
      const plano = nomePlano(c.pagamento?.plano)
      return [
        `Sua renovação${plano ? ` do plano ${plano}` : ''} foi aprovada, e o acesso segue ${periodoPagamento(c)}. Obrigado por continuar.`,
        c.obs(1, ['melhorArea', 'ranking', 'cronograma', 'sequencia']) ?? 'Renovar é a melhor coisa que alguém pode me dizer sobre o site: que ele cabe na rotina e vale o tempo.',
        `Tudo continua liberado: ${oQueLibera(c)}. Nada muda, nada se perde, a fila da Revisão segue de onde estava.`,
        `Se a data da prova mudou, vale atualizar o cronograma para ele recalcular: ${c.link('cronograma')}`,
        'E se tiver qualquer coisa a melhorar, me responde. Quem renova é quem mais me ensina.',
      ]
    },
    ps: () => 'P.S.: obrigado, de coração. É gente como você que mantém o site de pé.' },
]

/** Obrigado pelo tempo de assinatura (cancelou ou pediu reembolso): porta aberta. */
const obrigado_tempo: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'obrigado pelo tempo por aqui', 'Obrigado pelo tempo por aqui')],
    corpo: (c) => {
      const fim = dataLonga(c.encerramento?.fimEm)
      return [
        c.encerramento?.reembolso ? 'Vi que você pediu o reembolso, e já está encaminhado. Antes de qualquer coisa: obrigado pelo tempo que você passou por aqui, e por ter dado uma chance ao site.' : `Vi que você cancelou a assinatura${fim ? `, e o acesso segue até ${fim}` : ''}. Antes de qualquer coisa: obrigado pelo tempo que você passou por aqui.`,
        c.dez ? `${cap(asSuas(c))}, o Caderno de erros e a fila da Revisão ficam guardados. As questões abertas continuam abertas, e nada do que você fez se perde.` : 'Tudo o que você fez fica guardado, e as questões abertas continuam abertas para você.',
        'Se foi o site que não ajudou, eu gostaria muito de saber o que faltou. Uma linha basta, e vira melhoria. Se foi a vida, a prova que passou ou o dinheiro que apertou, tudo bem também. Eu entendo.',
        'A porta fica aberta, sem pressa e sem insistência. Quando e se fizer sentido, é só voltar.',
        c.fecho(),
      ]
    },
    ps: () => 'P.S.: se responder este e-mail, sou eu que leio. Inclusive crítica.' },
  { id: 'v2', assuntos: (c) => [nm(c, 'a porta fica aberta', 'A porta fica aberta')],
    corpo: (c) => {
      const fim = dataLonga(c.encerramento?.fimEm)
      return [
        `${c.encerramento?.reembolso ? 'Seu reembolso está encaminhado' : `Sua assinatura foi cancelada${fim ? `, com acesso até ${fim}` : ''}`}, e eu quis te escrever pessoalmente, porque um e-mail de sistema não diria o que eu queria dizer: obrigado.`,
        c.obs(1, ['melhorArea', 'ranking', 'sequencia']),
        'Nada do que você fez se perde. O que fica fechado é a parte do plano; as questões, o Caderno de erros e a Revisão continuam seus.',
        'Se tiver dois minutos, me conta o que faria o site valer mais para você. É o tipo de resposta que mais me ajuda.',
        'E a porta fica aberta. Sem pressa, sem insistência.',
      ]
    },
    ps: () => 'P.S.: torço por você do mesmo jeito, assinando ou não.' },
  { id: 'v3', assuntos: (c) => [nm(c, 'obrigado, e boa prova', 'Obrigado, e boa prova')],
    corpo: (c) => [
      `Vi que você ${c.encerramento?.reembolso ? 'pediu o reembolso' : 'cancelou a assinatura'}, e quis agradecer pelo tempo que passamos juntos por aqui. Fico feliz de ter feito parte do seu estudo, mesmo que por um período.`,
      J(momento(c), c.obs(1, ['prova', 'etapa', 'cronograma'])),
      'Se a prova ainda está pela frente, torço por você do mesmo jeito. As questões abertas continuam abertas, e tudo o que você fez fica guardado.',
      'Se algo no site não funcionou como você esperava, me conta? Uma linha já ajuda, e eu respondo.',
      c.fecho(),
    ],
    ps: () => 'P.S.: quando a prova passar, se quiser me contar como foi, eu vou gostar de saber.' },
  { id: 'v4', assuntos: (c) => [nm(c, 'sem insistência, com gratidão', 'Sem insistência, com gratidão')],
    corpo: (c) => {
      const fim = dataLonga(c.encerramento?.fimEm)
      return [
        `${c.encerramento?.reembolso ? 'O reembolso já está encaminhado.' : `O cancelamento está feito${fim ? `, e o acesso vale até ${fim}` : ''}.`} Nada de pergunta, nada de "tem certeza?". Só um obrigado de quem cuida do site.`,
        c.dez ? `Você deixou ${Q(c.r)} por aqui, e elas ficam suas: o Caderno de erros, a Revisão, tudo guardado.` : 'Tudo o que você fez por aqui fica guardado e continua seu.',
        'Eu entendo que a rotina muda, que a prova passa, que o orçamento aperta. Se um dia fizer sentido voltar, está tudo do jeito que você deixou.',
        'E se tiver algo que eu possa melhorar, a resposta deste e-mail chega direto para mim.',
        c.fecho(),
      ]
    },
    ps: () => 'P.S.: obrigado, de verdade. Cada pessoa que assinou um dia ajudou a manter isto de pé.' },
  { id: 'v5', assuntos: (c) => [nm(c, 'uma pergunta só, se puder', 'Uma pergunta só, se puder')],
    corpo: (c) => [
      `Vi que você ${c.encerramento?.reembolso ? 'pediu o reembolso' : 'cancelou a assinatura'}. Está tudo certo, e obrigado pelo tempo por aqui.`,
      'Tenho uma pergunta só, se puder responder: o que faltou? Pode ser o tempo, um recurso que não existe, a prova que já passou. Qualquer resposta me ajuda a fazer o site melhor para quem vem depois.',
      c.obs(1, ['prova', 'etapa']),
      'Independentemente da resposta, tudo o que você fez fica guardado, e as questões abertas continuam abertas para você. A porta fica aberta.',
      c.fecho(),
    ],
    ps: () => 'P.S.: se responder, sou eu que leio. E respondo.' },
]

// ---------------------------------------------------------------------------
// As nove campanhas diárias (parte 31, 18/10/2026): o banco escolhe quem recebe
// (candidatos_<tipo>) e o agendador manda. Cada dado do acontecimento vem em c.campanha
// e some se faltar: a carta continua de pé sem ele.
// ---------------------------------------------------------------------------

/** "o TEOT" pelo nome que a pessoa deu no cronograma; senão o que o motor já sabe ("a prova"). */
const provaDela = (c: Ctx) => {
  const nome = (c.p.provaCronograma ?? '').trim()
  return nome && nome.length <= 30 && !/[@\d_]/.test(nome) ? `o ${nome}` : c.nomeProva
}
const daProvaDela = (c: Ctx) => provaDela(c).replace(/^o /, 'do ').replace(/^a /, 'da ')
/** Véspera e depois da prova: a data do cronograma é o assunto da carta, então o fato já está gasto. */
const usaProva = (c: Ctx): null => { if (c.fatos.cronograma) c.usados.add('cronograma'); return null }
/** O aniversário é o assunto da carta: o fato fica gasto (nenhum P.S. repete o parabéns). */
const usaAniversario = (c: Ctx): null => { if (c.fatos.aniversario) c.usados.add('aniversario'); return null }
/** Uma semana ou mais fora (a campanha só sai a partir de 7 dias). */
const semanaFora = (c: Ctx) => tempoFora(Math.max(7, Number(c.p.diasParado) || 7))

/** "34 de 50" só quando é motivo de orgulho: metade ou mais e pelo menos 10 acertos (regra dos 10). */
const notaSimulado = (c: Ctx) => {
  const s = c.campanha.simulado
  const a = Number(s?.acertos), t = Number(s?.total)
  return Number.isInteger(a) && Number.isInteger(t) && t >= 10 && a >= 10 && a <= t && a * 2 >= t ? `${N(a)} de ${N(t)}` : null
}
/** Posição só entre os 30 primeiros (o banco só manda a posição de quem assina, como no site). */
const posicaoSimulado = (c: Ctx) => {
  const p = Number(c.campanha.simulado?.posicao)
  return Number.isInteger(p) && p >= 1 && p <= 30 ? p : null
}
const resultadoSimulado = (c: Ctx): string | null => {
  const nota = notaSimulado(c), pos = posicaoSimulado(c)
  if (nota && pos) return `Você acertou ${nota} questões e ficou em ${pos}º lugar entre quem entregou no tempo.`
  if (nota) return `Você acertou ${nota} questões.`
  if (pos) return `Você ficou em ${pos}º lugar entre quem entregou no tempo.`
  return null
}

/** Anos de conta: o que o banco mandou, ou o que dá para ver pela idade da conta (no mínimo um). */
const anosConta = (c: Ctx) => Math.max(1, Math.round(Number(c.campanha.anos) || 0) || Math.round((Number(c.p.diasConta) || 0) / 365))
const anosTexto = (c: Ctx) => {
  const n = anosConta(c)
  return n === 1 ? 'um ano' : n === 2 ? 'dois anos' : n === 3 ? 'três anos' : `${N(n)} anos`
}

/** O resumo novo da campanha: título (só se for limpo) e a área no meio da frase ("mão e punho"). */
const AREA_EM: Record<string, string> = {
  'mao': 'mão e punho', 'ombro-cotovelo': 'ombro e cotovelo', 'quadril': 'quadril', 'joelho': 'joelho', 'coluna': 'coluna',
  'pe-tornozelo': 'pé e tornozelo', 'trauma': 'trauma', 'pediatria': 'ortopedia pediátrica', 'tumores': 'tumores',
  'conceitos-basicos': 'conceitos básicos', 'osteometabolicas': 'doenças osteometabólicas',
}
const tituloResumo = (c: Ctx) => {
  const t = (c.campanha.resumo?.titulo ?? '').trim()
  return t.length >= 3 && t.length <= 90 && !/[{}<>"]/.test(t) ? t : null
}
const areaResumo = (c: Ctx) => {
  const e = c.campanha.resumo?.especialidade
  return e && AREA_EM[e] ? AREA_EM[e] : null
}
const oResumo = (c: Ctx) => (tituloResumo(c) ? `o resumo "${tituloResumo(c)}"` : 'um resumo novo')

/** Assinou há 3 dias ou mais e ainda não montou o cronograma. */
const assinou_sem_cronograma: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'dois minutos que devolvem horas', 'Dois minutos que devolvem horas'), nm(c, 'o cronograma está esperando', 'O cronograma está esperando')],
    corpo: (c) => [
      momento(c),
      'Faz alguns dias que você assinou, e eu queria te contar da parte do plano que mais devolve tempo: o cronograma. Vi que ele ainda está em branco, e tudo bem, a primeira semana costuma ser corrida.',
      `Leva uns dois minutos: você diz a data ${c.daProva}, quantos dias por semana dá para estudar e quais são as folgas. A partir daí, a lista de cada dia já fica pronta quando você sentar, com o que mais cai primeiro.`,
      c.obs(1, ['prova', 'etapa', 'horario']),
      `Fica aqui: ${c.link('cronograma')}`,
      c.fecho(),
    ],
    ps: () => 'P.S.: se a data da prova ainda não saiu, vale colocar uma estimativa. Dá para mudar depois, e o plano se refaz sozinho.' },
  { id: 'v2', assuntos: (c) => [nm(c, 'uma ideia para a primeira semana', 'Uma ideia para a primeira semana'), nm(c, 'o que eu faria no seu lugar', 'O que eu faria no seu lugar')],
    corpo: (c) => [
      'Obrigado mais uma vez pela assinatura. Passaram uns dias, e eu quis te mandar a sugestão que daria a um amigo que acabou de entrar no plano.',
      'Monte o cronograma antes de qualquer outra coisa. O tempo que mais se perde na preparação não é estudando, é decidindo o que estudar, e o cronograma tira essa decisão das suas costas.',
      J(c.fato('prova'), c.fato('etapa')),
      'Se um plantão bagunçar a semana, você marca o dia e ele redistribui o resto, sem quebrar o plano até a prova.',
      `Para montar: ${c.link('cronograma')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'a lista do dia pode vir pronta', 'A lista do dia pode vir pronta')],
    corpo: (c) => [
      momento(c),
      'Uma pergunta rápida: como estão sendo os primeiros dias de plano? Pergunto porque reparei que o cronograma ainda está em branco, e ele é justamente a parte feita para quem tem pouco tempo.',
      'Funciona assim: você coloca a data da prova e o ritmo que cabe na sua rotina, e todo dia a lista já está pronta quando você sai do hospital. Nada para planejar, nada para lembrar.',
      c.tempo(),
      `Se quiser experimentar: ${c.link('cronograma')}`,
    ],
    ps: () => 'P.S.: se preferir montar comigo, me responde com a data da prova e quantas horas tem por semana. Eu te ajudo.' },
  { id: 'v4', assuntos: (c) => [nm(c, 'seu plano pode trabalhar por você', 'Seu plano pode trabalhar por você')],
    corpo: (c) => [
      'Que bom ter você no plano. Passando para lembrar, com calma, de uma coisa que faz a assinatura render muito mais: montar o cronograma até a prova.',
      c.obs(1, ['prova', 'etapa', 'horario', 'maisEstudada']) ?? 'Sei que nos primeiros dias a gente sai abrindo tudo para ver como é, e isso é ótimo.',
      'O cronograma é o que transforma isso em rotina: o que mais cai primeiro, a revisão no lugar certo e a reta final já desenhada. Se um dia faltar, ele se ajusta sozinho.',
      `Dois minutos, aqui: ${c.link('cronograma')}`,
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'menos decidir, mais estudar', 'Menos decidir, mais estudar')],
    corpo: (c) => [
      momento(c),
      'Quando eu estudava para o TEOT, o que mais me tirava tempo era abrir o material e passar quinze minutos escolhendo por onde começar.',
      'Foi por isso que o cronograma entrou no plano: você diz a data da prova, e cada dia já chega decidido. Vi que o seu ainda está por montar, e queria te mostrar como é rápido.',
      `Fica aqui: ${c.link('cronograma')}`,
      'Se não fizer sentido agora, tudo bem também. O resto do plano continua todo seu.',
    ] },
]

/** Assinante sem responder há 7 dias ou mais. */
const assinante_parado_7: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'a semana apertou?', 'A semana apertou?'), nm(c, 'tudo certo por aí?', 'Tudo certo por aí?')],
    corpo: (c) => [
      `Faz ${semanaFora(c)} desde a sua última questão, e eu quis só saber se está tudo bem por aí.`,
      'Semana de plantão, prova da residência, a vida acontecendo: eu sei como é. O plano continua aqui, e nada se perdeu.',
      'Para voltar sem peso, uma sugestão: abra a Revisão e faça dez questões. Ela já separou as que pedem uma segunda olhada, então é só sentar e fazer.',
      `A Revisão fica aqui: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'o cronograma se ajusta', 'O cronograma se ajusta sozinho')],
    corpo: (c) => [
      momento(c),
      `Reparei que faz ${semanaFora(c)} desde a sua última sessão. Quis te escrever antes que isso pese, porque não precisa pesar.`,
      'Se você usa o cronograma, marque os dias que passaram como plantão: ele redistribui o que ficou para trás, sem quebrar o plano até a prova. Se ele ainda está por montar, hoje é um ótimo dia para isso, e leva dois minutos.',
      `Fica aqui: ${c.link('cronograma')}`,
      c.obs(1, ['melhorArea', 'maisEstudada', 'prova']),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'dez questões para recomeçar', 'Dez questões para recomeçar')],
    corpo: (c) => [
      `Faz ${semanaFora(c)} sem questão por aqui, e eu imagino que a rotina tenha apertado. Acontece com todo mundo que estuda trabalhando.`,
      c.obs(1, ['maisEstudada', 'melhorArea', 'cronograma']) ?? `${guardado(c)}, e a fila da Revisão também.`,
      'O jeito mais leve de voltar é o menor: dez questões da Revisão, no intervalo que der. Amanhã, mais dez. O embalo volta antes do que parece.',
      `Para começar: ${c.link('revisao')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'passando para dar um oi', 'Passando para dar um oi')],
    corpo: (c) => [
      'Passando só para dar um oi. Vi que a última semana foi sem questões, e quis lembrar que está tudo bem: o plano é seu, no seu ritmo.',
      momento(c),
      'Se ajudar, me conta o que atrapalhou: plantão, cansaço, falta de vontade, qualquer coisa. Às vezes um ajuste pequeno no cronograma resolve, e eu gosto de ajudar a achar esse ajuste.',
      `Quando quiser voltar, a Revisão está pronta: ${c.link('revisao')}`,
      c.tempo(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'seu lugar está guardado', 'Seu lugar está guardado')],
    corpo: (c) => [
      momento(c),
      `Faz ${semanaFora(c)} desde a última questão, e eu quis te escrever do jeito que gostaria de ter recebido na residência: sem pressão nenhuma.`,
      `${guardado(c)}, o Caderno de erros continua lá e a Revisão segue separando o que vale uma segunda olhada.`,
      'Quando der, cinco questões já recolocam tudo em movimento. Não precisa ser hoje, nem ser muito.',
      `Fica aqui: ${c.link('revisao')}`,
    ],
    ps: () => 'P.S.: se a prova mudou de data, vale atualizar o cronograma. Ele refaz o plano em segundos.' },
]

/** Resultado do Simulado Nacional, quando a edição fecha. */
const simulado_resultado: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'seu resultado do Simulado Nacional', 'Seu resultado do Simulado Nacional'), posicaoSimulado(c) && nm(c, `${posicaoSimulado(c)}º no Simulado Nacional`, `${posicaoSimulado(c)}º no Simulado Nacional`)],
    corpo: (c) => [
      'O Simulado Nacional fechou, e o seu resultado já está no site. Antes de qualquer número: obrigado por ter feito. Sentar para uma prova inteira, no meio da rotina, já é treino de dia de prova.',
      resultadoSimulado(c) ?? 'O que mais vale agora não é a nota, é o que ela mostra: os temas em que a prova te pegou são os que vão render mais nas próximas semanas.',
      'Uma ideia para aproveitar: abra a correção e leia o comentário das questões que te pegaram, cinco por dia. Em uma semana, a prova inteira vira revisão.',
      `O resultado fica aqui: ${c.link('simulado')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'obrigado por fazer o simulado', 'Obrigado por fazer o simulado'), nm(c, 'o simulado fechou', 'O simulado fechou')],
    corpo: (c) => [
      momento(c),
      'A edição do Simulado Nacional fechou, e quis te escrever porque sei o que é encaixar uma prova inteira numa semana de hospital.',
      resultadoSimulado(c) ? J(resultadoSimulado(c), 'Fiquei feliz de ver.') : 'O número, seja qual for, é um retrato de hoje, não do dia da prova.',
      'O melhor uso do resultado é simples: as questões que te pegaram viram a sua lista da semana, e a Revisão já começou a separar.',
      `Correção e resultado: ${c.link('simulado')}`,
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'o que o simulado mostrou', 'O que o simulado mostrou')],
    corpo: (c) => [
      'O Simulado Nacional terminou, e o resultado está pronto. Simulado é o treino que mais se parece com o dia da prova: o tempo apertado, o último bloco, a questão longa que aparece na hora errada.',
      resultadoSimulado(c) ?? 'Mais do que a nota, vale olhar os temas: é ali que o simulado aponta onde cada hora de estudo vai render mais.',
      c.obs(1, ['cronograma', 'prova', 'etapa']),
      `Se quiser ver por tema: ${c.link('simulado')}`,
      c.fecho(),
    ],
    ps: () => 'P.S.: no mês que vem tem outra edição. Fazer todas é o jeito mais fácil de ver o quanto você cresce.' },
  { id: 'v4', assuntos: (c) => [nm(c, 'uma ideia para depois do simulado', 'Uma ideia para depois do simulado')],
    corpo: (c) => [
      momento(c),
      J('Vi que você fez o Simulado Nacional desta edição.', resultadoSimulado(c)),
      'Uma ideia de quem já fez muito simulado: em vez de refazer a prova inteira, pegue as questões que te pegaram e leia o comentário de todas as alternativas. É revisão sob medida, e cabe no intervalo.',
      `A correção fica aqui: ${c.link('simulado')}`,
      'Se quiser me contar como foi a experiência, é só responder. Cada resposta ajuda a próxima edição.',
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'seu simulado, em uma linha', 'Seu simulado, em uma linha')],
    corpo: (c) => [
      'Uma linha sobre o seu Simulado Nacional: fazer já foi a parte mais difícil. Prova inteira, no tempo, com a rotina que a residência deixa, é treino de verdade.',
      resultadoSimulado(c),
      'Daqui, a sugestão é olhar a correção sem pressa e deixar a Revisão cuidar do resto. O que te pegou nesta edição é o que mais vai render nas próximas semanas.',
      c.tempo(),
      `Resultado: ${c.link('simulado')}`,
    ] },
]

/** Véspera da prova (data do cronograma): descanso, nada de matéria nova. */
const vespera_prova: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'amanhã é o dia', 'Amanhã é o dia'), nm(c, 'um recado para a véspera', 'Um recado para a véspera')],
    corpo: (c) => [
      J(usaProva(c), `Amanhã é ${provaDela(c)}, e eu quis te escrever hoje, com calma.`),
      'O estudo que decide a prova já foi feito: nas questões de cada intervalo, nas sessões depois do hospital, em cada comentário lido até o fim. Hoje não é dia de matéria nova.',
      'Se der vontade de revisar, abra só as frases que caem por uns vinte minutos, e pare. Depois, jantar com calma, separar documento e caneta, e deitar cedo. Dormir é estudar, principalmente hoje.',
      'Vai com a cabeça descansada e confia no que você construiu.',
      c.fecho(),
    ],
    ps: () => 'P.S.: depois da prova, se quiser me contar como foi, eu vou gostar muito de saber.' },
  { id: 'v2', assuntos: (c) => [nm(c, 'boa prova amanhã', 'Boa prova amanhã')],
    corpo: (c) => [
      J(usaProva(c), `Amanhã é ${provaDela(c)}. Lembro bem da véspera da minha: a vontade de abrir tudo de novo e a sensação de que faltava alguma coisa.`),
      'Não falta. O que vale amanhã é o que você já tem, e o que mais protege isso agora é descanso: comer direito, deitar cedo e chegar com folga no local.',
      c.dez ? `Foram ${Q(c.r)} até aqui. Isso não some numa noite.` : 'Cada hora de estudo até aqui continua com você. Isso não some numa noite.',
      'Na prova, se uma questão travar, marque e siga. Volte nela no fim, com a cabeça mais leve.',
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'hoje é dia de descansar', 'Hoje é dia de descansar')],
    corpo: (c) => [
      J(usaProva(c), `Vi no seu cronograma que ${provaDela(c)} é amanhã.`),
      'Então a única tarefa de hoje é cuidar de você. Pode parecer estranho depois de tanto tempo estudando, mas descanso na véspera rende mais que qualquer revisão de última hora.',
      'Três coisas simples: separar documento, caneta e o caminho até o local; comer algo leve; deitar cedo, mesmo sem sono.',
      'Amanhã, leia cada enunciado até o fim. A banca adora esconder o detalhe na última linha, e isso você já treinou muito.',
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'estou na torcida por você amanhã', 'Estou na torcida por você amanhã')],
    corpo: (c) => [
      J(usaProva(c), `Amanhã é ${provaDela(c)}, e eu queria que este e-mail fosse uma coisa só: um lembrete de que você chegou até aqui.`),
      'Chegar à véspera estudando com a rotina que a residência impõe já diz muito sobre você.',
      'Para hoje, nada de questão nova. Se a ansiedade bater, cinco minutos olhando as frases que caem e chega. O resto do dia é para descansar.',
      'E amanhã, no intervalo, come alguma coisa e bebe água. Parece bobagem, mas faz diferença no último bloco.',
    ],
    ps: () => 'P.S.: depois da prova, se quiser me contar como foi, eu leio cada resposta.' },
  { id: 'v5', assuntos: (c) => [nm(c, 'a véspera, com calma', 'A véspera, com calma')],
    corpo: (c) => [
      J(usaProva(c), `Amanhã é o dia ${daProvaDela(c)}, e eu escrevo só para dizer duas coisas.`),
      'A primeira: o que você estudou está guardado, e uma boa noite de sono ajuda a memória a arrumar tudo. A segunda: a prova não mede quem você é, mede um dia.',
      'Se quiser fazer alguma coisa hoje, que seja leve: uma caminhada, uma refeição tranquila, desligar o celular mais cedo.',
      c.fecho(),
      'Boa prova.',
    ] },
]

/** Depois da prova (1 a 3 dias): como foi? Sem presumir o resultado. */
const depois_prova: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'como foi a prova?', 'Como foi a prova?')],
    corpo: (c) => [
      J(usaProva(c), `${cap(provaDela(c))} passou, e eu fiquei pensando em você. Como foi?`),
      'Pergunto de verdade, sem esperar resposta pronta. Às vezes a gente sai da prova achando que foi mal e vai bem, e às vezes o contrário. A sensação de hoje ainda não é o resultado.',
      'Seja como for, o que você estudou continua seu, e tudo o que fez por aqui fica guardado.',
      'Se quiser me contar, é só responder este e-mail. Eu leio tudo, e gosto muito de saber.',
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'e aí, como foi?', 'E aí, como foi?')],
    corpo: (c) => [
      J(usaProva(c), `Passando para saber como foi ${provaDela(c)}. Espero que a véspera tenha sido tranquila e que as questões tenham parecido conhecidas.`),
      'Agora é hora de descansar de verdade. Alguns dias sem questão nenhuma são merecidos.',
      c.dez ? `Foram ${Q(c.r)} até aqui, e cada uma contou.` : 'Cada hora de estudo até aqui contou.',
      'Quando sair o gabarito, se alguma questão ficar martelando, me escreve. Eu gosto de conversar sobre isso.',
      c.fecho(),
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'depois da prova, um respiro', 'Depois da prova, um respiro')],
    corpo: (c) => [
      J(usaProva(c), `Já passou ${provaDela(c)}, e eu quis te mandar um abraço antes de qualquer resultado.`),
      'Sei como são os dias seguintes: a cabeça repassando questão por questão. Tenta deixar isso de lado agora. O que podia ser feito, você fez.',
      'Se quiser, me conta como foi: o que caiu, o que surpreendeu, o que achou da prova. Cada relato me ajuda a deixar o site melhor para quem vem depois.',
      'E descansa. Você merece alguns dias leves.',
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'uma pergunta sobre a prova', 'Uma pergunta sobre a prova')],
    corpo: (c) => [
      J(usaProva(c), `${cap(provaDela(c))} passou. Antes de mais nada: parabéns por ter chegado lá, com tudo o que a rotina pede.`),
      'Tenho uma pergunta só: como foi estar lá, durante a prova? Não o resultado, a sensação. Isso diz muito sobre o que vem pela frente, e sobre o que o site pode melhorar.',
      'Se a próxima etapa já tiver data, o cronograma pode ser refeito com ela quando você quiser. Sem pressa nenhuma.',
      'Fico por aqui, esperando notícias.',
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'os dias depois da prova', 'Os dias depois da prova')],
    corpo: (c) => [
      J(usaProva(c), 'Escrevo uns dias depois de propósito: passou a correria, e ainda dá para lembrar de tudo.'),
      `Como foi ${provaDela(c)}? Fiquei com vontade de saber.`,
      'Se foi bem, quero comemorar junto. Se foi difícil, quero ouvir, e talvez ajudar a pensar no próximo passo. Nos dois casos, o que você construiu estudando continua inteiro.',
      'É só responder este e-mail, do jeito que quiser.',
    ] },
]

/** Aniversário (data de nascimento do cadastro): curta, sem convite, sem link. */
const aniversario: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'feliz aniversário', 'Feliz aniversário'), nm(c, 'hoje o dia é seu', 'Hoje o dia é seu')],
    corpo: (c) => [
      J(usaAniversario(c), 'Hoje é o seu aniversário, e eu não podia deixar passar. Parabéns, de coração.'),
      'Que o ano que começa traga dias mais leves, plantões mais tranquilos e, quando chegar a hora, a aprovação que você está construindo.',
      'Hoje não tem questão, não tem cronograma, não tem nada para fazer aqui. É dia de comemorar com quem você gosta.',
      'O estudo espera, e fica do jeito que você deixou.',
    ],
    ps: () => 'P.S.: se for comemorar com bolo, guarda um pedaço por mim.' },
  { id: 'v2', assuntos: (c) => [nm(c, 'um abraço de aniversário', 'Um abraço de aniversário')],
    corpo: (c) => [
      J(usaAniversario(c), 'Passando só para te desejar um feliz aniversário.'),
      'Sei que a residência não para nem no dia do aniversário, então espero que hoje sobre pelo menos um tempinho só seu: uma refeição sem pressa, uma ligação para alguém querido, uma noite de sono inteira.',
      c.dez ? `E já que aniversário é dia de balanço: ${Q(c.r)} respondidas até aqui. Isso é muito estudo, e merece ser lembrado hoje também.` : 'Fico contente de ter você por aqui neste ano.',
      'Que o ano novo da sua vida seja generoso com você.',
    ],
    ps: () => 'P.S.: hoje, nada de questão. Amanhã a gente volta.' },
  { id: 'v3', assuntos: (c) => [nm(c, 'parabéns pelo seu dia', 'Parabéns pelo seu dia')],
    corpo: (c) => [
      J(usaAniversario(c), 'Parabéns pelo seu dia.'),
      'Escrevo curto de propósito, porque hoje não é dia de ler e-mail longo: é dia de comemorar.',
      'Desejo um ano com mais tempo livre do que a residência costuma deixar, com gente boa por perto e com a prova indo do jeito que você merece.',
      'E se em algum momento do ano o estudo pesar, lembra que eu estou por aqui.',
    ],
    ps: () => 'P.S.: aproveita o dia. O site fica do jeito que você deixou.' },
  { id: 'v4', assuntos: (c) => [nm(c, 'hoje é dia de comemorar', 'Hoje é dia de comemorar')],
    corpo: (c) => [
      J(usaAniversario(c), 'Vi que hoje é o seu aniversário, e quis te mandar um abraço daqui.'),
      'Na correria da residência, a gente às vezes esquece de parar e reparar no caminho. Então hoje eu reparo por você: estudar com a rotina que você tem já é uma conquista.',
      'Que este ano traga descanso, gente querida por perto e boas notícias.',
      c.fecho(),
      'Feliz aniversário.',
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'um café por mim hoje', 'Um café por mim hoje')],
    corpo: (c) => [
      J(usaAniversario(c), 'Feliz aniversário. Hoje o café, o bolo e o descanso são por minha conta, pelo menos em pensamento.'),
      'Fico contente de acompanhar o seu estudo por aqui, e mais ainda de poder te desejar um ano bom de verdade: com tempo para você, com sono em dia e com a prova correndo bem.',
      'O site não vai a lugar nenhum. Hoje, o dia é seu.',
      'Comemora com quem você gosta.',
    ] },
]

/** Um ano (ou mais) de Orto Questões, no dia em que a conta faz aniversário. Sem convite. */
const um_ano: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, `${anosTexto(c)} de Orto Questões`, `${cap(anosTexto(c))} de Orto Questões`)],
    corpo: (c) => [
      `Hoje faz ${anosTexto(c)} que você criou a sua conta no Orto Questões, e eu quis marcar a data com você.`,
      c.dez ? `Nesse tempo foram ${Q(c.r)}, cada uma encaixada num intervalo da rotina. Isso é muito estudo de quem tem pouco tempo.` : 'Nesse tempo, os primeiros passos já foram dados, e começar é sempre a parte mais difícil.',
      c.obs(1, ['melhorArea', 'maisEstudada', 'resumos', 'ranking']),
      'Obrigado por ter confiado ao site uma parte tão importante da sua vida. Ele mudou muito nesse tempo, e boa parte do que mudou veio de quem estuda aqui e escreve para mim.',
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, `hoje faz ${anosTexto(c)}`, `Hoje faz ${anosTexto(c)}`)],
    corpo: (c) => [
      `Uma data diferente hoje: a sua conta no Orto Questões faz ${anosTexto(c)}. É esse o tempo que a gente se conhece por aqui.`,
      c.dez ? `Olhando para trás: ${jaFez(c)}, um Caderno de erros cheio de coisas que hoje você já sabe, e a Revisão trazendo de volta na hora certa.` : 'Olhando para trás, o mais importante já aconteceu: você escolheu um lugar para estudar.',
      'Se eu pudesse te dar um presente nesta data, seria uma ideia: escolha o tema que mais te incomodava no começo e faça dez questões dele. É impressionante ver o quanto ele mudou.',
      `Para o presente: ${c.link('treinar')}`,
    ],
    ps: () => 'P.S.: obrigado por estar aqui. Quem estuda e escreve para mim ajuda a construir o site.' },
  { id: 'v3', assuntos: (c) => [nm(c, 'obrigado pelo tempo junto', 'Obrigado pelo tempo junto')],
    corpo: (c) => [
      momento(c),
      `Hoje a sua conta faz ${anosTexto(c)}. Parece pouco no calendário, mas na residência é muita coisa: plantões, rodízios, provas, mudanças.`,
      c.obs(2, ['melhorArea', 'maisEstudada', 'resumos', 'flashcards', 'sequencia']) ?? `${guardado(c)}, como um diário do seu estudo.`,
      'Obrigado por cada sessão nesse tempo. Eu sigo melhorando questões e comentários toda semana, pensando em quem estuda como você.',
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'uma data que eu quis lembrar', 'Uma data que eu quis lembrar')],
    corpo: (c) => [
      `Há ${anosTexto(c)} você criou a sua conta por aqui. Não é uma data que aparece no calendário de ninguém, mas eu quis lembrar.`,
      'O que eu mais gosto de ver nessas datas é o caminho: quem chegou sem saber por onde começar e hoje abre o site já sabendo o que fazer.',
      c.dez ? `No seu caso, são ${Q(c.r)} nesse caminho.` : null,
      c.tempo(),
      'Se quiser me contar como foi esse tempo, o que ajudou e o que faltou, é só responder. Eu leio tudo.',
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, `${anosTexto(c)} e contando`, `${cap(anosTexto(c))} e contando`)],
    corpo: (c) => [
      `Hoje são ${anosTexto(c)} de Orto Questões, e esta carta é só para dizer obrigado.`,
      'Sei que estudar para prova de título é uma maratona, e que ninguém corre maratona sem dia ruim. Ficar por aqui nos dias bons e nos ruins é o que faz a diferença.',
      c.obs(1),
      'Que o próximo ano traga a prova que você está esperando e o tempo livre que a residência costuma roubar.',
      c.fecho(),
    ] },
]

/** Quem a pessoa indicou chegou a 20 questões. */
const indicacao_deu_certo: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'sua indicação deu certo', 'Sua indicação deu certo'), nm(c, 'obrigado pela indicação', 'Obrigado pela indicação')],
    corpo: (c) => [
      'Uma notícia boa: a pessoa que você indicou já passou de 20 questões no Orto Questões. A indicação contou.',
      'Indicar um site de estudo é emprestar um pouco da própria confiança, e eu levo isso a sério. Obrigado.',
      c.campanha.cortesia ? 'Os dias de cortesia da indicação aparecem na sua página de indicações assim que você abrir.' : null,
      `Fica aqui: ${c.link('indicar')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'alguém começou por sua causa', 'Alguém começou por sua causa')],
    corpo: (c) => [
      momento(c),
      'Quem você indicou para o Orto Questões já está estudando de verdade: passou de 20 questões. Quis te contar, porque foi você que abriu essa porta.',
      'Estudar junto, mesmo de longe, deixa a preparação mais leve. Quem sabe vocês trocam uma questão difícil de vez em quando.',
      c.campanha.cortesia ? `Os dias de cortesia que a indicação dá aparecem aqui: ${c.link('indicar')}` : `Se quiser ver as suas indicações: ${c.link('indicar')}`,
    ],
    ps: () => 'P.S.: obrigado pela confiança. É de indicação em indicação que o site cresce.' },
  { id: 'v3', assuntos: (c) => [nm(c, 'uma boa notícia sobre a indicação', 'Uma boa notícia sobre a indicação')],
    corpo: (c) => [
      'Uma boa notícia: a sua indicação deu certo. A pessoa que entrou pelo seu convite já respondeu mais de 20 questões.',
      'O site é um projeto independente, e quase tudo o que ele cresce vem de gente como você contando para quem está na mesma prova. Fico muito grato.',
      c.obs(1, ['melhorArea', 'ranking', 'sequencia']),
      c.campanha.cortesia ? `Os dias da indicação ficam na página de indicações: ${c.link('indicar')}` : `Suas indicações ficam aqui: ${c.link('indicar')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'obrigado por espalhar a palavra', 'Obrigado por espalhar a palavra')],
    corpo: (c) => [
      'Passando para agradecer: quem você indicou chegou a 20 questões, e isso quer dizer que pegou o ritmo.',
      'É o tipo de notícia que eu mais gosto de receber, porque mostra que o site ajudou alguém a encaixar o estudo na rotina, e que foi você quem mostrou o caminho.',
      c.tempo(),
      `Se quiser indicar mais alguém que está na mesma prova, o seu link continua valendo: ${c.link('indicar')}`,
      c.fecho(),
    ] },
  { id: 'v5', assuntos: (c) => [nm(c, 'a indicação contou', 'A indicação contou')],
    corpo: (c) => [
      momento(c),
      'Uma linha só para dizer obrigado: a pessoa que você indicou já passou das 20 questões, então a indicação contou.',
      c.campanha.cortesia ? 'Os dias de cortesia que vêm com ela aparecem na sua página de indicações.' : 'Fico contente de ver o site chegando a mais gente pelas suas mãos.',
      `Fica aqui: ${c.link('indicar')}`,
      'Se você conhece mais alguém estudando para a mesma prova, pode mandar o seu link. E se preferir não, tudo bem também.',
    ] },
]

/** Saiu um resumo novo na área que a pessoa mais estuda (semanal, só quem aceitou novidades). */
const resumo_do_tema: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, 'saiu um resumo do seu tema', 'Saiu um resumo do seu tema'), areaResumo(c) && nm(c, `um resumo novo de ${areaResumo(c)}`, `Um resumo novo de ${areaResumo(c)}`)],
    corpo: (c) => [
      areaResumo(c) ? `Saiu um resumo novo na Biblioteca, e lembrei de você: é de ${areaResumo(c)}, a área que você mais tem estudado.` : 'Saiu um resumo novo na Biblioteca, e lembrei de você: é do tema que você mais tem estudado.',
      tituloResumo(c) ? `Chama "${tituloResumo(c)}". Como os outros, saiu de um capítulo de livro e traz no meio do texto as questões que já caíram, para resolver ali mesmo.` : 'Como os outros, ele saiu de um capítulo de livro e traz no meio do texto as questões que já caíram, para resolver ali mesmo.',
      'Uma sugestão de uso: leia uma seção por vez, no intervalo, e faça as questões dela logo em seguida. É a combinação que mais fixa.',
      `Para abrir: ${c.link('resumo')}`,
      c.fecho(),
    ] },
  { id: 'v2', assuntos: (c) => [nm(c, 'um resumo novo para o seu tema', 'Um resumo novo para o seu tema')],
    corpo: (c) => [
      momento(c),
      `Entrou na Biblioteca esta semana ${oResumo(c)}${areaResumo(c) ? `, de ${areaResumo(c)}` : ''}, e você foi uma das primeiras pessoas em quem pensei, porque é o tema que mais aparece no seu estudo.`,
      'Ele foi feito para quem tem pouco tempo: o capítulo na ordem em que a prova cobra, com o que já caiu marcado ano a ano.',
      `Fica aqui: ${c.link('resumo')}`,
      'Se ler, me conta o que achou. É um formato novo, e a sua opinião vale muito.',
    ] },
  { id: 'v3', assuntos: (c) => [nm(c, 'para ler no intervalo', 'Para ler no intervalo')],
    corpo: (c) => [
      `Uma novidade pequena, mas com a sua cara: entrou na Biblioteca ${oResumo(c)}${areaResumo(c) ? `, de ${areaResumo(c)}` : ', do tema que você mais estuda'}.`,
      'Se o tempo estiver curto, leia só a primeira seção hoje. O resumo guarda onde você parou, e no dia seguinte é só continuar.',
      c.tempo(),
      `Para abrir: ${c.link('resumo')}`,
      c.fecho(),
    ] },
  { id: 'v4', assuntos: (c) => [nm(c, 'lembrei de você nesta semana', 'Lembrei de você nesta semana')],
    corpo: (c) => [
      J('Lembrei de você nesta semana, quando saiu', oResumo(c), areaResumo(c) ? `de ${areaResumo(c)}.` : 'no tema que você mais estuda.'),
      c.obs(1, ['maisEstudada', 'melhorArea', 'resumos']),
      'O jeito que mais rende: ler o resumo e fazer as questões do tema na mesma sessão. O que foi lido vira resposta certa mais rápido.',
      `Fica aqui: ${c.link('resumo')}`,
      c.fecho(),
    ],
    ps: () => 'P.S.: este e-mail só vai para quem aceitou receber novidades. Se preferir parar, o link no fim desliga.' },
  { id: 'v5', assuntos: (c) => [nm(c, 'uma leitura curta para a semana', 'Uma leitura curta para a semana')],
    corpo: (c) => [
      momento(c),
      `Saiu ${oResumo(c)} na Biblioteca${areaResumo(c) ? `, em ${areaResumo(c)}` : ''}. Como esse é o tema que você mais estuda, achei que fosse gostar de saber primeiro.`,
      'Um detalhe que eu gosto nos resumos: as questões reais aparecem no meio do texto, com botão para resolver. Ler e treinar viram uma coisa só.',
      `Para abrir: ${c.link('resumo')}`,
      c.fecho(),
    ] },
]

/** Lembrete do Simulado Nacional (parte 32): a edição em que a pessoa se inscreveu abre amanhã ou abriu hoje. */
const lembrete = (c: Ctx) => c.campanha.lembrete ?? null
const abreAmanha = (c: Ctx) => lembrete(c)?.tipo_lembrete === 'abre_amanha'
const abriuHoje = (c: Ctx) => lembrete(c)?.tipo_lembrete === 'abriu_hoje'
/** " (Simulado Nacional · Outubro de 2026)", para o meio da frase. */
const qualEdicao = (c: Ctx) => (lembrete(c)?.titulo ? ` (${lembrete(c)?.titulo})` : '')
/** Depois de "Simulado Nacional": " de outubro de 2026" (título padrão) ou " (Véspera do TEOT)". */
const deQualEdicao = (c: Ctx) => {
  const t = lembrete(c)?.titulo
  const mes = t?.match(/^Simulado Nacional\s*[·:-]\s*(.+)$/)?.[1]
  return mes ? ` de ${mes.charAt(0).toLowerCase()}${mes.slice(1)}` : qualEdicao(c)
}
const HORAS_EXTENSO = ['', 'uma hora', 'duas horas', 'três horas', 'quatro horas', 'cinco horas', 'seis horas']
const duracaoSimulado = (c: Ctx) => {
  const m = Math.round(Number(lembrete(c)?.duracao_min))
  if (!Number.isFinite(m) || m < 10) return null
  return m % 60 === 0 && m / 60 < HORAS_EXTENSO.length ? HORAS_EXTENSO[m / 60] : `${N(m)} minutos`
}
const questoesSimulado = (c: Ctx) => {
  const t = Math.round(Number(lembrete(c)?.total))
  return Number.isFinite(t) && t >= 10 ? `${N(t)} questões` : null
}
/** "31 de outubro", no horário de Brasília. */
const fechaSimulado = (c: Ctx) => {
  const f = lembrete(c)?.fecha_em
  const d = f ? new Date(f) : null
  return d && Number.isFinite(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }) : null
}
/** Quando: "abre amanhã" / "já está no ar" / sem dado, "está chegando". */
const quandoSimulado = (c: Ctx) => (abreAmanha(c) ? 'abre amanhã' : abriuHoje(c) ? 'já está no ar' : 'está chegando')
const formatoSimulado = (c: Ctx): string => {
  const q = questoesSimulado(c), h = duracaoSimulado(c)
  const base = q && h ? `São ${q} em ${h}` : q ? `São ${q}` : h ? `A prova tem ${h}` : 'É uma prova inteira'
  return `${base}, com o relógio correndo desde o começo, como no dia da prova.`
}
const prazoSimulado = (c: Ctx) => (fechaSimulado(c) ? `Dá para fazer até ${fechaSimulado(c)}, no horário que for melhor para você.` : null)
/** Só quando a edição pede o plano e a pessoa não assina; sem preço. */
const planoSimulado = (c: Ctx) => (lembrete(c)?.precisa_plano === true ? 'Um detalhe: esta edição é para quem assina. A página do simulado mostra como funciona.' : null)

const simulado_lembrete: Versao[] = [
  { id: 'v1', assuntos: (c) => [nm(c, `o Simulado Nacional ${quandoSimulado(c)}`, `O Simulado Nacional ${quandoSimulado(c)}`)],
    corpo: (c) => [
      momento(c),
      `Passando para lembrar: o simulado em que você se inscreveu${qualEdicao(c)} ${quandoSimulado(c)}.`,
      J(formatoSimulado(c), prazoSimulado(c)),
      'Uma ideia de quem já fez muitos: escolha um horário em que ninguém vai te chamar, deixe água por perto e faça de uma vez. As respostas ficam salvas no servidor, então uma queda de internet não apaga nada.',
      planoSimulado(c),
      `Para entrar: ${c.link('simulado')}`,
      c.fecho(),
    ],
    ps: () => 'P.S.: o gabarito e os comentários aparecem logo depois que você entrega. Vale guardar um tempo para ler.' },
  { id: 'v2', assuntos: (c) => [nm(c, 'um lembrete do simulado', 'Um lembrete do simulado'), nm(c, `o simulado ${quandoSimulado(c)}`, `O simulado ${quandoSimulado(c)}`)],
    corpo: (c) => [
      `Você se inscreveu no Simulado Nacional${deQualEdicao(c)}, e ele ${quandoSimulado(c)}. Quis te avisar com calma, antes da correria do dia.`,
      formatoSimulado(c),
      prazoSimulado(c),
      'O que eu faria: olhar a escala da semana e marcar o simulado como se fosse plantão, com hora para começar. Prova feita no meio de outras coisas rende menos do que prova feita inteira.',
      planoSimulado(c),
      `O simulado fica aqui: ${c.link('simulado')}`,
      c.fecho(),
    ],
    ps: () => 'P.S.: se cair a internet ou a bateria, nada se perde. É só abrir de novo, até em outro aparelho.' },
  { id: 'v3', assuntos: (c) => [nm(c, `seu simulado ${quandoSimulado(c)}`, `Seu simulado ${quandoSimulado(c)}`)],
    corpo: (c) => [
      momento(c),
      J(`O Simulado Nacional${deQualEdicao(c)} ${quandoSimulado(c)}.`, 'É o treino que mais se parece com o dia da prova: o tempo apertado, o último bloco, a questão longa que aparece na hora errada.'),
      formatoSimulado(c),
      prazoSimulado(c),
      planoSimulado(c),
      `Quando quiser começar: ${c.link('simulado')}`,
      c.fecho(),
    ],
    ps: () => 'P.S.: depois de entregar, você vê na hora onde está pronto e onde rende revisar. Esse retrato vale mais do que a nota.' },
  { id: 'v4', assuntos: (c) => [nm(c, 'separei um recado sobre o simulado', 'Um recado sobre o simulado')],
    corpo: (c) => [
      `Um recado curto: o Simulado Nacional${deQualEdicao(c)} ${quandoSimulado(c)}, e você está na lista.`,
      formatoSimulado(c),
      'Uma ideia prática: antes de começar, leia as regras com calma e já decida o que fazer com a questão que travar. Marcar para rever e seguir costuma salvar o fim da prova.',
      prazoSimulado(c),
      planoSimulado(c),
      `Para fazer: ${c.link('simulado')}`,
      c.fecho(),
    ],
    ps: () => 'P.S.: o ranking leva em conta o tempo nos empates, mas o que mais importa é fazer inteiro, do jeito que vai ser na prova.' },
  { id: 'v5', assuntos: (c) => [nm(c, `o simulado em que você se inscreveu ${quandoSimulado(c)}`, `O simulado ${quandoSimulado(c)}`)],
    corpo: (c) => [
      momento(c),
      `Só para lembrar: o simulado em que você se inscreveu${qualEdicao(c)} ${quandoSimulado(c)}.`,
      J(formatoSimulado(c), 'O gabarito só aparece depois da entrega, como numa prova de verdade.'),
      prazoSimulado(c),
      planoSimulado(c),
      `O link: ${c.link('simulado')}`,
      c.fecho(),
    ],
    ps: () => 'P.S.: se quiser me contar como foi, é só responder este e-mail. Cada resposta ajuda a próxima edição.' },
]

export const VERSOES: Record<string, Versao[]> = {
  'ativo:0-10': ativo_0_10, 'ativo:10-20': ativo_10_20, 'ativo:20-30': ativo_20_30, 'ativo:30-40': ativo_30_40, 'ativo:40-60': ativo_40_60,
  'ativo:60-70': ativo_60_70, 'ativo:70-80': ativo_70_80, 'ativo:80-90': ativo_80_90, 'ativo:90-100': ativo_90_100,
  nunca_comecou, boas_vindas, comecando, comecou_parou, pausa, sumiu, obrigado_assinatura, convite_20, convite_50,
  reta_final, marco, opiniao, indicar, cronograma, pix_3_dias, pix_hoje, relatorio,
  boas_vindas_dia0, primeiras_10, voltou, cronograma_pronto, pagamento_aprovado, obrigado_tempo,
  assinou_sem_cronograma, assinante_parado_7, simulado_resultado, vespera_prova, depois_prova, aniversario, um_ano, indicacao_deu_certo, resumo_do_tema,
  simulado_lembrete,
}

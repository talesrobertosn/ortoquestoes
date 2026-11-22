import type { Ctx } from './cartas.ts'
import type { Versao } from './cartas-versoes.ts'

const numero = (n: number) => n.toLocaleString('pt-BR')
const COMPARAR = 'Refaça duas questões e, antes de ler o comentário, escreva por que descartaria a alternativa que quase marcou.'
const APRENDER_O_ERRO = 'Escolha algumas questões que errou, escreva em uma frase o que mudava a resposta e teste essa ideia em uma questão parecida.'
const SO_O_ESSENCIAL = 'Releia só os comentários que esclarecem dúvidas conhecidas. Uma revisão curta hoje já é suficiente.'

const DICAS_POR_TEMA: Record<string, string> = {
  'conceitos-basicos': 'Pegue duas questões que confundem termos parecidos. Tente explicar em uma frase o que distingue um conceito do outro antes de conferir o comentário.',
  tumores: 'Nas questões que você errou, anote o detalhe do enunciado que mudava a hipótese. Compare com a alternativa que você marcou.',
  trauma: 'Ao refazer as questões, veja se a dúvida estava em reconhecer a lesão ou em escolher a conduta. Essa diferença ajuda a decidir o que ler no comentário.',
  coluna: 'Nas questões que quase acertou, sublinhe o achado que pesou mais para escolher a resposta e compare com a explicação do comentário.',
  mao: 'Ao rever os erros, desenhe para você o trajeto ou a relação anatômica que a questão pede. Depois confira como esse detalhe muda a resposta.',
  pediatria: 'Ao comparar duas questões parecidas, anote se foi a idade, o exame ou outro detalhe do enunciado que mudou a resposta.',
  joelho: 'Refaça algumas questões e veja se o erro veio da leitura do exame ou de uma dúvida de conduta. Revise primeiro o que mais se repetir.',
}

function prazo(c: Ctx, vespera: boolean): string {
  if (vespera) return `Amanhã você faz ${c.nomeProva}`
  if (c.diasProva === null || c.diasProva <= 0) return `Com ${c.nomeProva} chegando`
  const dias = c.diasProva === 1 ? 'um dia' : `${numero(c.diasProva)} dias`
  return `Falta${c.diasProva === 1 ? '' : 'm'} ${dias} para ${c.nomeProva}`
}

function percurso(c: Ctx, pct: number | null, variante: number, vespera: boolean): string {
  if (!c.r) return 'Se quiser fazer um primeiro treino, escolha um assunto familiar e resolva algumas questões comentadas. Isso já pode mostrar o que vale rever.'
  if (!c.dez) return 'Vi que você já começou pelas questões. Escolha um comentário que te ajudou e tente explicar, sem olhar, o que fez aquela alternativa ser a certa.'
  if (pct === null) return variante % 2
    ? `Você já respondeu ${c.q} por aqui. Mesmo no começo, já dá para escolher a próxima leitura pelo que te deixou em dúvida nessas questões.`
    : `Foram ${c.q} até aqui. Obrigado por separar esse tempo para estudar com a gente. Conforme você fizer mais questões, fica mais fácil comparar os resultados por tema.`

  const dado = [
    `Vi que você já respondeu ${c.q} no Orto Questões e está com ${pct}% de acertos no histórico.`,
    `No seu histórico, vi que foram ${c.q} e ${pct}% de acertos até aqui.`,
    `Você já resolveu ${c.q} por aqui. No seu histórico, o acerto está em ${pct}%.`,
    `Quero reconhecer o caminho que você já percorreu. Foram ${c.q}, com ${pct}% de acertos.`,
    `Passei pelos seus números de estudo. Você já fez ${c.q} e está em ${pct}% de acertos.`,
    `Você já reservou tempo para responder ${c.q} no site. O acerto registrado no seu estudo foi de ${pct}%.`,
  ][variante]

  if (vespera) return `${dado} ${pct < 55
    ? 'Tem muito estudo por trás desse número. Para hoje, eu usaria esse histórico para separar uma dúvida que ainda cabe rever.'
    : pct < 70
      ? 'Já tem bastante coisa aprendida aí. Eu encerraria a revisão com uma pergunta que te ajude a lembrar o raciocínio de um tema conhecido.'
      : 'É um bom resultado para reconhecer antes de fechar o material. Hoje vale relembrar só o que ainda te faz hesitar.'}`
  const leituras = pct < 55 ? [
    'Chegar a esse volume já é um trabalho e tanto. Dá para usar as dúvidas que aparecem no histórico para escolher o que vale rever em sessões curtas.',
    'Tem dedicação por trás desse número. O que mais pode ajudar agora é voltar às questões que trouxeram a mesma dúvida mais de uma vez.',
    'Você já tem perguntas suficientes para escolher onde concentrar a revisão. Eu separaria um tema pequeno e mediria o avanço pela clareza na hora de explicar as respostas.',
  ] : pct < 70 ? [
    'Já tem bastante coisa aí que você aprendeu. Agora vale olhar com calma as questões em que ficou entre duas alternativas, porque elas costumam mostrar bem o que falta esclarecer.',
    'Você já ganhou bastante prática. Agora vale ver se a dificuldade se repete em algum tipo de enunciado. Isso ajuda a escolher o próximo treino.',
    'Você já tem de onde partir. Escolha um erro que consiga explicar hoje e outro que ainda ficou sem entender. É no segundo que eu investiria um pouco mais de tempo.',
  ] : pct < 85 ? [
    'É um bom resultado. A reta final é uma oportunidade de testar se o raciocínio funciona também quando os temas se misturam.',
    'É um bom resultado. Para continuar avançando, volte às perguntas em que ficou entre duas alternativas e veja qual detalhe deveria ter decidido a resposta.',
    'É um bom acerto para levar para uma sessão com temas misturados. Assim dá para ver se identifica o assunto mesmo quando ele vem no meio de outros.',
  ] : [
    'É um resultado muito bom. Nesta altura, vale voltar também às questões que acertou com dúvida. Elas mostram os detalhes que ainda vale confirmar.',
    'É um ótimo acerto. Eu reservaria um pouco do tempo que resta para as decisões difíceis, aquelas em que duas alternativas parecem defensáveis.',
    'Que bom ver esse resultado. Eu manteria contato com os temas em que está bem e escolheria alguns erros pontuais para revisar.',
  ]
  return `${dado} ${leituras[[0, 1, 2, 2, 0, 1][variante]]}${!c.fatos.ranking && pct >= 70 ? ' Parabéns por esse trabalho.' : ''}`
}

function pontoForte(c: Ctx, pct: number | null, variante: number): string | null {
  const area = c.fatos.melhorArea
  if (!area || pct === null) return null
  c.usados.add('melhorArea')
  const nome = c.area(area.slug).em
  if (area.pct >= 70) return [
    `Foi bom ver o seu resultado em ${nome}. Você resolveu ${numero(area.total)} questões da área e acertou ${area.pct}%. Dá para ver que seu estudo rendeu ali.`,
    `O resultado que mais me chamou atenção foi em ${nome}, com ${area.pct}% de acerto em ${numero(area.total)} questões. Vale levar para outros assuntos o que funcionou nesse estudo.`,
    `E tem um assunto que já está bem encaminhado. Em ${nome}, foram ${numero(area.total)} questões com ${area.pct}% de acertos. Vale manter esse tema fresco na memória.`,
  ][[0, 1, 2, 1, 2, 0][variante]]
  return `Entre as áreas em que já dá para comparar o seu desempenho, ${nome} saiu na frente, com ${area.pct}% em ${numero(area.total)} questões. É um assunto em que você já tem por onde continuar.`
}

function focoDaRevisao(c: Ctx, vespera: boolean, variante: number, alternativa: string): string {
  const area = c.fatos.areaFraca
  if (!area) return alternativa
  c.usados.add('areaFraca')
  const nome = c.area(area.slug).em
  const dado = [
    `Para a próxima revisão, eu começaria por ${nome}. Vi ${area.pct}% de acerto em ${numero(area.total)} questões desse assunto. É a área a que eu daria mais atenção agora.`,
    `Se eu fosse escolher onde concentrar a próxima revisão, começaria por ${nome}. Foram ${numero(area.total)} questões, com ${area.pct}% de acertos.`,
    `Eu reservaria um tempo para ${nome}. Vi ${area.pct}% de acerto nas ${numero(area.total)} questões que fez nesse assunto. Aí está um bom ponto para começar a revisão.`,
  ][[0, 1, 2, 2, 0, 1][variante]]
  const dica = vespera ? [
    'Para hoje, eu escolheria só dois erros conhecidos desse tema e releria os comentários.',
    'Hoje, basta retomar uma anotação sua ou um comentário que já te fez entender por que a resposta mudava.',
    'Deixe esse repasse bem curto. Ao reler uma pergunta, tente recuperar o raciocínio antes de conferir a resposta.',
  ][variante % 3] : variante % 2 === 0 ? DICAS_POR_TEMA[area.slug] ?? APRENDER_O_ERRO : alternativa
  return `${dado} ${dica}`
}

function ranking(c: Ctx, variante: number): string | null {
  if (!c.fatos.ranking) return null
  c.usados.add('ranking')
  const posicao = `${c.fatos.ranking}ª posição no ranking geral`
  return [
    `Ah, e vi também a sua ${posicao}. Fico contente de ver o quanto você vem se dedicando. Parabéns.`,
    `Vi também sua ${posicao}. Parabéns, de verdade, pelo tempo que você tem colocado no estudo.`,
    `E parabéns pela ${posicao}. É uma conquista que merece ser comemorada.`,
  ][variante % 3]
}

interface Roteiro {
  assunto: string
  abrir: (prazo: string) => string
  revisar: string
  encerrar: string
}

const RETA_FINAL: readonly Roteiro[] = [
  {
    assunto: 'o que eu revisaria até a prova',
    abrir: data => `${data}. Passei para dividir uma ideia de revisão que caiba nesse tempo.`,
    revisar: 'Se for difícil escolher um assunto para revisar, comece por uma questão que errou mais de uma vez. Entender aquele erro já dá um rumo para a próxima sessão.',
    encerrar: 'Obrigado por deixar o Orto Questões fazer parte da sua preparação. Boa sorte na prova. Vou torcer para você conseguir pôr em prática o que estudou.',
  },
  {
    assunto: 'o que seu estudo já mostra',
    abrir: data => `${data}. Antes de pensar em mais uma lista de questões, achei que valia compartilhar um pouco do que você já fez por aqui.`,
    revisar: 'Volte a uma questão que exigiu uma segunda leitura do enunciado e compare com uma questão parecida. Veja qual palavra ou achado muda a resposta.',
    encerrar: 'Obrigado por estudar com a gente até aqui. Desejo uma prova tranquila e uma boa oportunidade de mostrar o que aprendeu.',
  },
  {
    assunto: 'uma ideia para o próximo treino',
    abrir: data => `${data}. Na reta final, dá um alívio quando a próxima sessão já tem um objetivo. Queria te ajudar a escolher um.`,
    revisar: COMPARAR,
    encerrar: 'Boa prova. Obrigado pela confiança durante a preparação. Espero que o estudo que você fez aqui te acompanhe na hora de decidir entre duas alternativas.',
  },
  {
    assunto: 'sua preparação até aqui',
    abrir: data => `${data}. Queria te escrever antes da prova. Tem bastante valor em parar um momento para ver o que já ficou mais claro e o que ainda cabe revisar.`,
    revisar: 'Experimente uma sessão curta com tempo marcado. Quando terminar, retome as perguntas em que a leitura levou mais tempo e veja o que poderia identificar logo de início.',
    encerrar: 'Obrigado por trazer o Orto Questões para o seu estudo. Desejo sorte, tranquilidade e muito sucesso no dia da prova.',
  },
  {
    assunto: 'para aproveitar a reta final',
    abrir: data => `${data}. Achei que valia olhar para o seu estudo até aqui e pensar no que ainda cabe revisar antes da prova.`,
    revisar: APRENDER_O_ERRO,
    encerrar: 'Obrigado por ter estudado com a gente. Espero que chegue à prova com calma para lembrar do que você já sabe. Boa sorte.',
  },
  {
    assunto: 'um recado antes da prova',
    abrir: data => `${data}. Passei por aqui para te desejar sucesso e deixar uma sugestão de revisão que caiba nesses últimos dias.`,
    revisar: 'Abra a Revisão e escolha questões com dúvidas de naturezas diferentes. Separe o que foi dificuldade de conteúdo do que se resolveu ao ler o enunciado com mais atenção.',
    encerrar: 'Foi bom acompanhar um pouco dessa caminhada pelo Orto Questões. Obrigado pela confiança. Torço para que dê tudo certo na prova.',
  },
]

const VESPERA: readonly Roteiro[] = [
  {
    assunto: 'boa prova amanhã',
    abrir: data => `${data}. Queria te desejar boa sorte antes que o dia fique cheio de preparativos.`,
    revisar: SO_O_ESSENCIAL,
    encerrar: 'Muito obrigado por estudar com a gente. Boa prova amanhã. Na hora, leia com calma o que cada pergunta está pedindo. Espero que consiga mostrar o que aprendeu.',
  },
  {
    assunto: 'um recado para amanhã',
    abrir: data => `${data}. Hoje quis passar para agradecer pelo estudo que você compartilhou com a gente e deixar uma ideia breve de revisão.`,
    revisar: 'Se for abrir a Revisão, procure uma questão cujo comentário te ajudou a destravar um assunto. Recordar esse raciocínio pode ser mais útil hoje do que abrir material novo.',
    encerrar: 'Que amanhã você encontre tranquilidade para resolver uma questão de cada vez. Obrigado por contar com o Orto Questões. Boa prova.',
  },
  {
    assunto: 'o que vale rever hoje',
    abrir: data => `${data}. Na véspera, eu escolheria com cuidado o que vale abrir e deixaria o restante do tempo livre para os preparativos.`,
    revisar: COMPARAR,
    encerrar: 'Quando fechar a revisão, vale conferir o local, o horário e o documento da prova. Estou torcendo por você. Obrigado pela confiança.',
  },
  {
    assunto: 'seu estudo antes da prova',
    abrir: data => `${data}. Antes de desejar boa prova, queria reconhecer o que você já fez até aqui.`,
    revisar: 'Se quiser repassar alguma coisa, pegue suas anotações e escolha uma dúvida que você já resolveu. Tente lembrar qual detalhe fez a resposta ficar clara.',
    encerrar: 'Obrigado por estudar com a gente. Espero que amanhã você consiga ler com calma, confiar no seu raciocínio e mostrar o que aprendeu.',
  },
  {
    assunto: 'faltando um dia para a prova',
    abrir: data => `${data}. Se ainda for estudar hoje, deixo uma sugestão que dá para pôr em prática em poucos minutos.`,
    revisar: 'Escolha um comentário que você já leu e tente recuperar a ideia central sem olhar. Em seguida, confira o que faltou lembrar e siga com o resto do dia.',
    encerrar: 'Boa sorte amanhã. Foi muito bom fazer parte da sua preparação. Desejo que você tenha uma boa prova.',
  },
  {
    assunto: 'para fechar a revisão de hoje',
    abrir: data => `${data}. Queria te lembrar de um jeito simples de aproveitar a última revisão e te desejar sucesso.`,
    revisar: 'Para encerrar por hoje, escolha algumas perguntas conhecidas e releia a explicação das alternativas que te deixaram em dúvida.',
    encerrar: 'Quando terminar, confira os detalhes da prova e deixe o que precisa levar separado. Obrigado pelo carinho com o Orto Questões. Boa prova.',
  },
]

export function cartasDeProva(vespera: boolean): Versao[] {
  const roteiros = vespera ? VESPERA : RETA_FINAL
  return roteiros.map((r, i) => ({
    id: `v${61 + i}`,
    assuntos: c => [c.nome ? `${c.nome}, ${r.assunto}` : r.assunto[0].toUpperCase() + r.assunto.slice(1)],
    saudacao: c => c.nome ? `Oi, ${c.nome},` : 'Oi,',
    corpo: c => {
      const pct = c.pctProva
      const data = prazo(c, vespera)
      const abertura = data.startsWith('Com ') ? `${data}, quis passar para te desejar uma boa prova e sugerir um caminho para a revisão.` : r.abrir(data)
      const oi = percurso(c, pct, i, vespera)
      const bom = pontoForte(c, pct, i)
      const rever = c.r > 0 ? focoDaRevisao(c, vespera, i, r.revisar) : null
      const resultado = i === 2 || i === 5
        ? [oi, rever, bom]
        : [oi, bom, rever]
      return [
        abertura,
        ...resultado,
        ranking(c, i),
        c.r ? `Deixo o link da sua Revisão aqui. ${c.link('revisao')}` : `Para fazer um treino curto, você pode começar aqui. ${c.link('treinar')}`,
        r.encerrar,
      ]
    },
  }))
}

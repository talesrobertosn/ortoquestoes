/** Revisão integral de 15/11/2026: informação clara, proposta útil e ajuda objetiva.
 * Sem P.S., culpa por ausência, intimidade encenada ou incentivo à compra seguido de recuo retórico.
 * Os dados pessoais continuam limitados aos fatos existentes no perfil.
 */
import type { Ctx } from './cartas.ts'
import { cartasDeProva } from './cartas-prova.ts'
export type Pedaco = string | null | undefined | false | 0
export interface Versao {
  id: string
  requer?: (c: Ctx) => boolean
  saudacao?: (c: Ctx) => string
  /** Compatibilidade com históricos e ferramentas antigas; não é emitido pelo motor. */
  ps?: (c: Ctx) => string
  assuntos: (c: Ctx) => Pedaco[]
  corpo: (c: Ctx) => Pedaco[]
}
const N = (n: number) => Math.round(n).toLocaleString('pt-BR')
const Q = (n: number) => n >= 10 ? `${N(n)} questões` : 'algumas questões'
const dataCurta = (iso?: string | null) => iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }) : null
const nm = (c: Ctx, texto: string, semNome = texto.charAt(0).toUpperCase()+texto.slice(1)) => c.nome ? `${c.nome}, ${texto}` : semNome
const ajuda = (c: Ctx) => c.um('Se precisar de ajuda com o site, basta responder este e-mail.', 'Pode responder por aqui se encontrar alguma dificuldade no site.', 'Se tiver alguma dúvida para usar esse recurso, pode me chamar por aqui.')
function dicaCronograma(c: Ctx, i = 0): string {
  const guia = [
    'Se já sabe a data da prova, dá para usar o Cronograma para poupar o tempo de montar uma lista a cada dia.',
    'Uma coisa que ajuda quando o tempo é curto é sentar e já saber o que fazer. É para isso que serve o Cronograma.',
    'Se montar o plano de estudo está tomando tempo, vale passar pelo Cronograma.',
  ][i % 3]
  return c.p.assinante
    ? `${guia} Informe a data e o tempo que tem na semana. Ele organiza o que fazer em cada dia e já encaixa as revisões, para você poder ir direto às questões.`
    : `${guia} A demonstração mostra como as questões e as revisões cabem nos dias disponíveis. Com a assinatura, dá para montar e salvar um plano próprio.`
}
const acesso = (c: Ctx) => c.um('Seu histórico de estudo e suas anotações continuam salvos na conta.', 'As questões respondidas e as revisões ficam guardadas no seu histórico.', 'Seu progresso permanece salvo para continuar de onde parou.')
const saudacaoEstudo = (c: Ctx) => c.nome ? `Oi, ${c.nome},` : 'Oi,'

const COMECO = [
  {
    assunto: 'uma ideia para o primeiro treino',
    novo: 'Quando abrir Treinar, escolha um assunto familiar e faça algumas questões. Depois, pegue a que mais te deixou em dúvida e leia a explicação das alternativas com calma.',
    fez: 'Você já fez suas primeiras questões aqui. Se tiver alguns minutos hoje, volte àquela em que duas alternativas pareciam possíveis e veja o que fez uma delas sair na frente.',
    rota: 'treinar',
  },
  {
    assunto: 'por onde dá para começar',
    novo: 'Comece por um assunto que você gostaria de entender melhor. Depois de responder, leia por que as alternativas que pareciam boas também foram descartadas. É aí que muita dúvida se resolve.',
    fez: 'Seu primeiro treino já ficou salvo. Vale escolher uma pergunta que você errou e ler a explicação antes de resolver outra parecida. Assim você consegue testar o que entendeu.',
    rota: 'treinar',
  },
  {
    assunto: 'como o Cronograma ajuda na semana',
    novo: 'Se estiver com pouco tempo hoje, escolha um tema em Treinar e resolva algumas perguntas. Reserve uns minutos para olhar o comentário da que mais te fez pensar.',
    fez: 'Já vi que você começou pelas questões. No próximo treino, volte a uma explicação que te ajudou e tente lembrar a ideia principal antes de reler.',
    rota: 'cronograma',
  },
  {
    assunto: 'um jeito de estudar pelos comentários',
    novo: 'Na primeira sessão, recomendo responder primeiro e olhar o comentário depois. Tente guardar uma frase sobre o que levou à resposta certa. Essa frase pode te ajudar quando o assunto aparecer de novo.',
    fez: 'Para aproveitar o primeiro treino, escolha uma questão que trouxe dúvida. Tente explicar em voz baixa por que as duas alternativas mais parecidas têm respostas diferentes.',
    rota: 'treinar',
  },
  {
    assunto: 'uma sessão curta para começar',
    novo: 'Escolha um assunto só. Responda algumas questões em Treinar e marque para rever o que ainda quer entender melhor. Dá para começar com uma sessão bem curta.',
    fez: 'Você já começou a estudar com a gente. Para a próxima sessão, separe o que quer rever e escolha um assunto só. Assim fica fácil enxergar o que ficou mais claro de um treino para o outro.',
    rota: 'treinar',
  },
  {
    assunto: 'para organizar os próximos estudos',
    novo: 'Se preferir conhecer o site antes de planejar a semana, faça algumas questões de um tema de que gosta. Leia o comentário de pelo menos uma em que ficou entre duas respostas.',
    fez: 'Você já começou pelas questões. Agora dá para usar esse primeiro treino para decidir o que revisar e o que deixar para mais adiante.',
    rota: 'cronograma',
  },
] as const

const AGRADECIMENTOS = [
  'Que bom ter você por aqui. Obrigado por escolher o Orto Questões para estudar.',
  'Obrigado por abrir sua conta. Queria te dar as boas-vindas e deixar uma dica que dá para testar já no primeiro dia.',
  'Obrigado por trazer o Orto Questões para o seu estudo. Separei uma ideia para a próxima vez que você tiver um tempo para estudar.',
]

function primeirosPassos(c: Ctx, i: number, primeiroDia: boolean): Pedaco[] {
  const roteiro = COMECO[i]
  const rota = roteiro.rota
  return [
    primeiroDia ? AGRADECIMENTOS[i % 3] : c.um(
      'Obrigado por ter criado sua conta. Queria te deixar uma ideia para quando quiser experimentar as questões.',
      'Passei para deixar uma sugestão de primeiro treino. Que bom que você veio conhecer o Orto Questões.',
      'Se estiver procurando por onde começar, eu separaria um assunto e faria uma sessão curta.',
    ),
    c.r === 0 ? roteiro.novo : roteiro.fez,
    dicaCronograma(c, i),
    rota === 'cronograma' ? `Aqui está o Cronograma: ${c.link(rota)}` : `Aqui é onde você escolhe o assunto e começa a treinar: ${c.link(rota)}`,
    c.um('Se quiser ajuda para escolher por onde começar, me escreva por aqui. Vou ficar contente em ajudar.',
      'Se alguma coisa ficar confusa no primeiro treino, pode responder a este e-mail e me contar.',
      'Desejo um bom começo de estudo. Se surgir alguma dúvida com o site, pode me escrever por aqui.'),
  ]
}

const boasVindas = /* @__PURE__ */ COMECO.map((r, i): Versao => ({
  id: `v${61 + i}`, assuntos: c => [nm(c, r.assunto)], saudacao: saudacaoEstudo,
  corpo: c => primeirosPassos(c, i, true),
}))

const nunca = (): Versao[] => COMECO.map((r, i) => ({
  id: `v${61 + i}`, assuntos: c => [nm(c, r.assunto)], saudacao: saudacaoEstudo,
  corpo: c => primeirosPassos(c, i, false),
}))

const incentivo = (c: Ctx): string => c.um(
  'Para o próximo treino, eu escolheria uma questão cujo comentário mudou a forma como você pensava no assunto. Refaça a pergunta e veja se a ideia ficou.',
  'Se um erro ainda parece difícil de explicar, vale começar por ele. Leia o comentário e procure outra pergunta que cobre o mesmo ponto.',
  'Quando tiver alguns minutos, volte a duas questões de um mesmo assunto. Tente dizer o que as duas têm em comum antes de conferir o comentário.',
)

function proximoPasso(c: Ctx): Pedaco[] {
  const pct = c.pctBom
  const meta = pct !== null && pct < 95 ? (pct < 90 ? (Math.floor(pct / 10) + 1) * 10 : 95) : null
  const leitura = pct === null
    ? c.um(incentivo(c), 'O próximo treino pode ser pequeno. Escolha um assunto que já viu e compare duas perguntas que pareciam cobrar a mesma coisa.')
    : c.um(
      `Vi que seu acerto chegou a ${pct}%. ${c.fatos.ranking ? 'É um bom resultado para ter em mente.' : 'Parabéns pelo estudo que você já fez.'} ${meta === null ? 'Eu usaria o próximo treino para confirmar as respostas que ainda escolhe com alguma dúvida.' : `Se ${meta}% fizer sentido como próxima meta, vale começar pelas dúvidas que aparecem mais de uma vez. É um bom jeito de escolher o que revisar.`}`,
      `Você está com ${pct}% de acertos. ${meta === null ? 'Para o próximo treino' : `Para buscar os ${meta}% aos poucos`}, experimente rever as questões em que ficou entre duas alternativas e escreva o que deveria desempatar a escolha.`,
      `Seu acerto está em ${pct}%. ${meta === null ? 'É um bom momento para comparar seus erros por assunto.' : `Se quiser mirar os ${meta}%, eu começaria comparando os erros por assunto.`} Aqueles que têm a mesma causa podem entrar juntos na próxima revisão.`,
    )
  const forte = c.fato('melhorArea')
  const proximo = c.fato('areaFraca')
  const posicao = c.fato('ranking')
  return [leitura, forte, proximo, posicao, c.obs(1, ['sequencia', 'semana', 'maisEstudada'])]
}

function aberturaEstudo(c: Ctx, i: number): string {
  const r = c.dez ? `Você já resolveu ${c.q} por aqui.` : 'Você já começou pelas questões.'
  if (c.tipo === 'comecando' || c.tipo === 'boas_vindas') {
    return `${r} Obrigado por estudar com o Orto Questões. Queria te dar uma ideia para aproveitar o que acabou de ver.`
  }
  if (c.tipo === 'acesso_terminou') return `${r} Seu histórico continua na conta. Na próxima vez que for estudar, você pode começar pelos temas que deixou em andamento.`
  if (c.tipo === 'pausa' || c.tipo === 'sumiu' || c.tipo === 'comecou_parou' || c.tipo === 'voltou' || c.tipo === 'assinante_parado_7' || c.tipo === 'como_estao') {
    return c.um(
      `${r} Se estiver pensando em retomar, vale abrir uma questão familiar e partir do comentário dela. É um jeito de voltar a um assunto sem precisar planejar a semana inteira.`,
      `${r} Queria deixar uma ideia para a próxima sessão. Pegue uma questão do seu histórico e veja o que ainda lembra antes de ler a explicação.`,
      `${r} Quando for abrir o site de novo, você pode retomar um assunto que já estudou e começar pelo que ainda traz dúvida.`,
    )
  }
  const intro = [
    'Achei que valia te escrever com uma sugestão para aproveitar melhor esse treino.',
    'Queria compartilhar uma ideia para a próxima vez que você sentar para estudar.',
    'Dá para usar o que já estudou para escolher onde colocar a atenção agora.',
    'Para tirar mais proveito desse estudo, vale voltar a uma dúvida que apareceu nas questões.',
    'Se estiver planejando o próximo treino, tem um jeito simples de escolher o assunto.',
    'Faz diferença parar um momento para ver o que já aprendeu. Queria te sugerir um próximo passo.',
  ][i]
  return c.um(`${r} ${intro}`, `${intro} ${r}`)

}

function estudo(tema: string, rota: 'treinar' | 'revisao' | 'erros' = 'revisao'): Versao[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `v${i+61}`,
    assuntos: c => [nm(c, [tema, 'uma ideia para o próximo treino', 'o que vale revisar agora', 'um assunto para retomar', 'como aproveitar seu treino', 'para a próxima sessão'][i])],
    saudacao: saudacaoEstudo,
    corpo: c => c.r === 0 ? primeirosPassos(c, i, false) : [
      aberturaEstudo(c, i),
      ...proximoPasso(c),
      (c.tipo === 'comecando' || c.tipo === 'boas_vindas') && !c.fatos.cronograma ? dicaCronograma(c, i) : null,
      rota === 'erros' ? `Você encontra as suas questões no Caderno de erros: ${c.link(rota)}`
        : rota === 'revisao' ? `Aqui está a sua Revisão, com o que já dá para retomar: ${c.link(rota)}`
        : `Aqui você pode escolher o próximo assunto em Treinar: ${c.link(rota)}`,
      c.um('Bom estudo. Se quiser me contar o que tem funcionado para você, pode escrever por aqui.',
        'Obrigado por estudar com a gente. Se precisar de ajuda no site, pode responder a este e-mail.',
        'Desejo um bom próximo treino. Pode me escrever se tiver alguma dúvida sobre como encontrar essas questões.'),
    ],
  }))
}

const convite = (): Versao[] => Array.from({length:6},(_,i)=>({
  id:`v${i+21}`, assuntos:c=>[nm(c,['opções para ampliar seu estudo','sobre os planos de acesso','recursos do plano completo','para conhecer os planos','assinatura do Orto Questões','opções de assinatura'][i])],
  corpo:c=>[
    c.um('Queria apresentar as opções de assinatura do Orto Questões.', 'Você pode conhecer os planos de acesso e os recursos incluídos em cada um.', 'A página de planos reúne as opções para ampliar o acesso ao conteúdo.'),
    c.obs(1, ['maisEstudada', 'semana']),
    ...c.beneficios(2,true),
    'Os planos têm garantia de sete dias. As condições e os recursos incluídos estão na página de assinatura.',
    `Para consultar os planos: ${c.link('assinatura')}`, ajuda(c),
  ],
}))
const depoisDaProva = /* @__PURE__ */ [
  ['quer me contar como foi?', 'Qual assunto mais te chamou atenção nas questões? Se lembrar de um tema ou de um tipo de pergunta, já é uma ajuda e tanto para preparar as próximas revisões.'],
  ['sobre o formato da prova', 'Como foi o formato das perguntas? Se teve algo diferente no enunciado, nas imagens ou no tempo para responder, eu gostaria de saber.'],
  ['como foi a sua prova', 'Fiquei curioso para saber se algum assunto te pegou de surpresa. Se quiser me contar, as suas observações ajudam a próxima turma a se preparar.'],
  ['uma pergunta depois da prova', 'Se pudesse rever um único tema antes de fazer a prova de novo, qual seria? É uma forma de entender que revisão teria feito mais diferença.'],
  ['o que chamou atenção na prova', 'Ao sair da prova, ficou algum tema na cabeça? Pode ser algo que apareceu várias vezes ou uma pergunta com uma forma diferente de cobrar o assunto.'],
  ['sua experiência na prova', 'O que você achou dos casos apresentados? Queria entender que tipo de enunciado teria valido a pena praticar mais.'],
].map(([assunto, pergunta], i): Versao => ({
  id: `v${61 + i}`,
  assuntos: c => [nm(c, assunto)],
  corpo: c => [
    `Espero que tenha corrido bem com ${c.nomeProva}. Obrigado por ter contado com o Orto Questões na preparação.`,
    pergunta,
    'Se quiser dividir sua experiência, pode responder por aqui. Vou gostar de ler.',
  ],
}))

const marco = (primeiro = false): Versao[] => Array.from({length:6},(_,i)=>({
  id:`v${i+(primeiro ? 41 : 61)}`, assuntos:c=>[nm(c,[primeiro?'suas primeiras questões':'parabéns pelo seu novo marco','mais um passo no seu estudo','suas questões e a próxima revisão','seu progresso nas questões','para continuar seu treino','um marco para comemorar'][i])],
  corpo:c=>[
    primeiro ? 'Você concluiu suas primeiras dez questões no Orto Questões.' : c.um(
      `Queria comemorar uma marca com você. Você chegou às ${Q(c.marco ?? 100)} no Orto Questões. Parabéns pelo trabalho que teve para chegar até aqui.`,
      `Passei para te dar os parabéns pelas ${Q(c.marco ?? 100)}. Vale guardar esse número como lembrança de quanto estudo já coube nas suas sessões.`,
      `Você chegou à marca de ${Q(c.marco ?? 100)}. Obrigado por escolher estudar com a gente e reservar esse tempo para as questões.`),
    ...(primeiro ? [c.obs(1, ['ranking', 'melhorArea'])] : proximoPasso(c)),
    `Se quiser aproveitar esse treino, suas próximas questões de Revisão ficam aqui: ${c.link('revisao')}`,
    c.um('Bom estudo. Obrigado por deixar o Orto Questões fazer parte desse caminho.',
      'Se tiver alguma dificuldade para encontrar as questões da revisão, me escreva por aqui. Fico à disposição.'),

  ],
}))
const PERGUNTAS_OPINIAO = [
  ['como tem sido estudar pelo site?', 'Teve algum comentário de questão que te fez entender uma resposta que antes parecia confusa? Queria saber o que ajudou ali.'],
  ['o que ajudaria no seu próximo treino?', 'Quando abre o site para estudar, tem alguma coisa que toma mais tempo do que deveria? Pode ser escolher o assunto, encontrar uma revisão ou voltar a uma questão.'],
  ['uma pergunta sobre o seu estudo', 'Se pudesse mudar uma coisa no jeito de fazer as questões, o que mudaria? Um exemplo da última vez que usou o site já ajuda bastante.'],
  ['como está sendo usar a Revisão?', 'Na hora de refazer uma questão, consegue encontrar os comentários que quer consultar? Queria entender o que funciona e o que poderia ficar mais simples.'],
  ['uma ideia para melhorar o Orto Questões', 'Tem alguma parte do site que hoje já ajuda no seu estudo e você gostaria que a gente desenvolvesse melhor? Fico contente em ouvir sugestões.'],
]

const opiniao = (): Versao[] => PERGUNTAS_OPINIAO.map(([assunto, pergunta], i) => ({
  id: `v${61 + i}`, assuntos: c => [nm(c, assunto)], saudacao: saudacaoEstudo,
  corpo: c => [
    c.um('Obrigado por estudar com o Orto Questões. Queria aproveitar para te fazer uma pergunta.',
      'Queria saber um pouco de como está sendo usar o Orto Questões. Obrigado por reservar um tempo para conhecer o site.',
      'Passei para agradecer pelo tempo que você já estudou com a gente. Se puder, queria ouvir uma impressão sua.'),
    pergunta,
    'Se quiser me contar, é só responder por aqui.',
  ],
}))

const indicar = (): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+21}`,assuntos:c=>[nm(c,['indicação para colegas','como indicar o Orto Questões','sua página de indicações','compartilhar o site com colegas','o programa de indicações'][i])],corpo:c=>[
    c.um('Você pode compartilhar o Orto Questões com colegas que também estudam ortopedia.', 'A página de indicações reúne o seu convite para colegas.', 'O programa de indicações permite compartilhar o site com colegas de estudo.'),
    'Na página Indique e ganhe, você encontra o convite e os critérios do programa.',
    `Para consultar: ${c.link('indicar')}`, ajuda(c),
  ],
}))
const cronograma = (pronto = false): Versao[] => Array.from({ length: 5 }, (_, i) => ({
  id: `v${61 + i}`,
  assuntos: c => [nm(c, [pronto ? 'seu cronograma ficou salvo' : 'para poupar tempo no começo da sessão',
    'o que estudar quando sentar para treinar', 'uma ideia para organizar a semana', 'suas próximas sessões', 'como distribuir as revisões'][i])],
  saudacao: saudacaoEstudo,
  corpo: c => [
    pronto ? 'Seu cronograma ficou salvo. Quando abrir o plano de novo, pode começar pela lista do dia.' : c.um(
      'Queria te mostrar um jeito de poupar tempo na próxima sessão. Quando você já tem a lista do dia, dá para usar aqueles minutos escolhendo respostas em vez de montando filtros.',
      'Se estiver acertando como distribuir o estudo até a prova, vale abrir o Cronograma. Ele foi feito para ajudar a decidir o que cabe hoje, mesmo quando o tempo muda de uma semana para a outra.'),
    dicaCronograma(c, i),
    `O Cronograma está aqui: ${c.link('cronograma')}`,
    ajuda(c),
  ],
}))

const dataCompleta = (iso?: string | null) => iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}) : null
const planoPorExtenso = (id?: string | null) => id ? ({mensal:'mensal',trimestral:'trimestral',semestral:'semestral',anual:'anual'}[id] ?? null) : null
const pagamento = (): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+61}`,assuntos:c=>[nm(c,(c.pagamento?.renovacao?['renovação confirmada','seu novo período está confirmado','pagamento da renovação aprovado','confirmação da sua renovação','seu acesso foi prolongado']:['pagamento aprovado','sua assinatura foi confirmada','seu acesso está ativo','confirmação do seu plano','seu período de acesso'])[i])],corpo:c=>[
    c.pagamento?.renovacao?'Obrigado por continuar estudando com a gente. O pagamento da renovação foi aprovado e o novo período da sua assinatura está confirmado.':c.um('Obrigado pela confiança. Seu pagamento foi aprovado e sua assinatura está ativa.', 'Obrigado por escolher estudar com o Orto Questões. Passo para confirmar que o pagamento foi aprovado e o acesso está ativo.', 'Obrigado por fazer parte do Orto Questões. O pagamento foi aprovado e você já pode usar os recursos da assinatura.'),
    planoPorExtenso(c.pagamento?.plano)?`Plano confirmado: ${planoPorExtenso(c.pagamento?.plano)}.`:null,
    dataCompleta(c.pagamento?.fimEm)?`Seu acesso pago vai até ${dataCompleta(c.pagamento?.fimEm)}.`:null,
    c.pagamento?.meio==='pix'?'Você pagou por Pix, então este período fica ativo até a data informada e a renovação é feita por você. Em Minha assinatura, dá para conferir os detalhes e prolongar quando achar melhor.':c.pagamento?.meio==='cartao'?'O pagamento foi confirmado no cartão. Em Minha assinatura você consulta o período, a renovação e os recibos.':'Em Minha assinatura você consulta os detalhes do acesso, os pagamentos e os recibos.',
    `Para consultar seu plano: ${c.link('conta')}`, ajuda(c),
  ],
}))
const encerramento = (): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+61}`,assuntos:c=>[nm(c,(c.encerramento?.reembolso?['sobre o reembolso da assinatura','atualização do seu reembolso','reembolso registrado','detalhes do reembolso','sua assinatura e o reembolso']:['renovação automática desligada','cancelamento confirmado','sobre o fim do período pago','atualização da assinatura','detalhes do cancelamento'])[i])],corpo:c=>{
    const fim=dataCompleta(c.encerramento?.fimEm)
    const vigente=!!c.encerramento?.fimEm&&Date.parse(c.encerramento.fimEm)>c.hoje.getTime()
    return [
      c.encerramento?.reembolso?'Passo para confirmar que o reembolso da sua assinatura foi registrado. O período de acesso pago foi encerrado.':vigente?`A renovação automática foi desligada. Seu acesso pago segue ativo até ${fim}. Depois dessa data, essa assinatura não gera outro pagamento.`:fim?`O cancelamento da assinatura foi confirmado. O período pago terminou em ${fim}.`:'O cancelamento da assinatura foi confirmado. Você pode consultar o período e os detalhes na sua conta.',
      acesso(c),
      `Os detalhes ficam em Minha assinatura: ${c.link('conta')}`,
      'Se precisar esclarecer alguma informação sobre a solicitação, basta responder este e-mail.',
    ]
  },
}))
const ABERTURAS_RELATORIO = [
  'Queria te contar como foi seu estudo e deixar uma ideia para o próximo treino.',
  'Às vezes fica difícil perceber o que avançou entre uma sessão e outra. Juntei o que aparece no seu estudo para ficar mais fácil de ver.',
  'Se estiver escolhendo o que revisar nos próximos dias, dá para partir das questões que você já resolveu. Foi isso que olhei para te escrever.',
  'Passei para dividir o que chamou minha atenção no seu estudo. Dá para usar esses números para decidir o que fazer na próxima sessão.',
  'Antes de montar a próxima lista, vale olhar um pouco para trás. Queria te mostrar o que seu estudo já diz sobre onde continuar.',
]

const relatorio = (): Versao[] => ABERTURAS_RELATORIO.map((abertura, i) => ({
  id: `v${61 + i}`,
  assuntos: c => [nm(c, [c.relatorio?.quinzena ? 'como foi seu estudo na quinzena' : 'como foi seu estudo no mês',
    'o que seu estudo mostra até aqui', 'para escolher o que revisar', 'sua próxima sessão de estudo', 'seu estudo em perspectiva'][i])],
  saudacao: saudacaoEstudo,
  corpo: c => {
    const d = c.relatorio
    const n = d?.respostas ?? 0
    const total = (d?.certas ?? 0) + (d?.erradas ?? 0)
    const pct = total ? Math.round((d?.certas ?? 0) / total * 100) : 0
    const citavel = n >= 30 && total >= 30 && pct >= 50
    const delta = citavel && d?.acertoAnterior != null ? pct - d.acertoAnterior : 0
    const forte = d?.melhorArea && c.area(d.melhorArea.slug) && d.melhorArea.acerto >= 70 ? d.melhorArea : null
    const revisar = d?.maisFraco && c.area(d.maisFraco.slug) && d.maisFraco.slug !== forte?.slug ? d.maisFraco : null
    const dias = d?.diasAtivos ? (d.diasAtivos === 1 ? ' em um dia de estudo' : ` ao longo de ${d.diasAtivos} dias de estudo`) : ''
    const volume = n >= 10
      ? `${d?.frase || 'Neste período'}, você respondeu ${Q(n)}${dias}.`
      : n > 0 ? 'Você já respondeu algumas questões neste período. Vale voltar à que mais te fez pensar e ver se hoje você chegaria mais rápido à resposta.'
        : 'Se quiser retomar, suas questões anteriores estão guardadas. Eu começaria com um assunto familiar e um único comentário que valha a pena reler.'
    const resultado = citavel
      ? delta > 0
        ? `Você acertou ${pct}% no período. São ${delta} ${delta === 1 ? 'ponto percentual a mais' : 'pontos percentuais a mais'} que no período anterior. Parabéns por esse avanço.`
        : c.um(`Seu acerto no período ficou em ${pct}%. É um bom ponto de partida para decidir quais erros vale retomar.`,
          `Você chegou a ${pct}% de acertos no período. Vale abrir algumas das questões em que ficou entre duas respostas e conferir o que fez a diferença.`)
      : n >= 10 ? incentivo(c) : null
    return [
      abertura,
      [volume, resultado].filter(Boolean).join(' '),
      citavel && forte ? `Um assunto que se destacou foi ${c.area(forte.slug).de}. Você ficou em ${forte.acerto}% nas questões desse tema. Vale lembrar o que funcionou bem quando for revisar outra área.` : null,
      revisar ? `Para o próximo treino, eu abriria o tema de ${c.area(revisar.slug).de}. Refaça uma questão que errou e veja em qual trecho do enunciado estava a informação que mudava a resposta.` : null,
      d?.simulado && d.simulado.acertos >= 10 && d.simulado.total >= d.simulado.acertos && d.simulado.acertos * 2 >= d.simulado.total
        ? `Também vi seu resultado em “${d.simulado.titulo}”. Você acertou ${d.simulado.acertos} de ${d.simulado.total} questões. Confira as suas dúvidas na correção para aproveitar esse treino.` : null,
      `Você pode ver o histórico por tema aqui: ${c.link('desempenho')}`,
      c.um('Obrigado por estudar com a gente. Se quiser ajuda para usar a página de Desempenho, pode responder por aqui.',
        'Bom estudo. Se tiver alguma dúvida sobre como encontrar esses dados no site, me escreva por aqui.'),
    ]
  },
}))

const aniversario = (conta = false): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+21}`,assuntos:c=>[nm(c,(conta?['aniversário da sua conta','seu tempo no Orto Questões','um ano de conta','sua conta faz aniversário','aniversário no Orto Questões']:['feliz aniversário','um ótimo aniversário','para o seu aniversário','parabéns pelo aniversário','felicidades no seu aniversário'])[i])],corpo:c=>conta?[
    `Sua conta no Orto Questões completa ${(c.campanha.anos??1)===2?'dois':c.campanha.anos??1} ${(c.campanha.anos??1)===1?'ano':'anos'}.`,
    c.um('Obrigado por fazer parte do Orto Questões.', 'Obrigado por estudar com o Orto Questões.', 'Obrigado por compartilhar esse período com o Orto Questões.'),
    acesso(c),
  ]:[
    c.um('Feliz aniversário!', 'Parabéns pelo seu aniversário!', 'Desejo um ótimo aniversário para você!'),
    c.um('Desejo saúde e bons momentos neste novo ano de vida.', 'Que este novo ano traga saúde e boas realizações.', 'Espero que você tenha um ótimo dia e um novo ano de boas realizações.'),
  ],
}))
const indicacao = (): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+21}`,assuntos:c=>[nm(c,['sua indicação foi confirmada','atualização da sua indicação','resultado da sua indicação','sobre seu convite','indicação no Orto Questões'][i])],corpo:c=>[
    'A pessoa que você indicou chegou a 20 questões respondidas. Sua indicação foi confirmada.',
    c.campanha.cortesia?'Os detalhes dos dias de cortesia estão na página de indicações.':'Você pode consultar o resultado e os critérios do programa na página de indicações.',
    `Para consultar: ${c.link('indicar')}`, ajuda(c),
  ],
}))
const resumo = (): Versao[] => Array.from({ length: 5 }, (_, i) => ({
  id: `v${61 + i}`,
  assuntos: c => [nm(c, ['uma leitura para o próximo treino', 'tem novidade na Biblioteca', 'um resumo para revisar o tema',
    'para ler e praticar o assunto', 'uma ideia para a próxima revisão'][i])],
  saudacao: saudacaoEstudo,
  corpo: c => {
    const titulo = c.campanha.resumo?.titulo
    return [
      titulo ? `Queria te avisar que o resumo “${titulo}” já está na Biblioteca.` : 'Queria te avisar que entrou uma leitura nova na Biblioteca, relacionada aos assuntos do seu estudo.',
      c.um('Se quiser aproveitar a leitura com pouco tempo, comece por um trecho que responda a uma dúvida sua. Em seguida, faça uma das questões ligadas a ele.',
        'Uma forma de usar esse resumo é abrir primeiro uma questão vinculada. Depois, leia o trecho que explica por que aquela resposta funciona.',
        'Se tiver uma questão marcada para revisar sobre o tema, vale resolver de novo depois da leitura. Assim fica mais fácil ver o que ficou claro.'),
      `Você encontra a leitura aqui: ${c.link('resumo')}`,
      c.um('Bom estudo. Se uma parte da explicação ficar confusa, pode me escrever por aqui.',
        'Espero que a leitura ajude no próximo treino. Se tiver dificuldade para encontrar as questões ligadas ao resumo, me avise por aqui.',
        'Boa leitura. Se tiver uma dúvida sobre como abrir o resumo ou as questões, é só me escrever.'),
    ]
  },
}))

const simulado = (resultado = false): Versao[] => Array.from({ length: 5 }, (_, i) => ({
  id: `v${61 + i}`,
  assuntos: c => [nm(c, (resultado
    ? ['como aproveitar a correção do simulado', 'seu resultado no Simulado Nacional', 'o que revisar depois do simulado', 'voltando às questões do simulado', 'um recado sobre o seu resultado']
    : ['sobre o Simulado Nacional', 'seu horário para fazer o simulado', 'para organizar o dia do simulado', 'sua inscrição no simulado', 'um recado antes do simulado'])[i])],
  saudacao: saudacaoEstudo,
  corpo: c => {
    const s = c.campanha.simulado
    const l = c.campanha.lembrete
    const prazo = l?.tipo_lembrete === 'abre_amanha' ? 'A edição abre amanhã.'
      : l?.tipo_lembrete === 'abriu_hoje' ? 'O simulado já está aberto.'
      : l?.abre_em ? `A abertura está prevista para ${dataCurta(l.abre_em)}.` : null
    const certas = s?.acertos ?? 0
    const total = s?.total ?? 0
    const nota = certas >= 10 && certas <= total && certas * 2 >= total
      ? `Você acertou ${certas} de ${total} questões nessa edição. Parabéns por ter feito esse treino completo.` : null
    return resultado ? [
      `Seu resultado${s?.titulo ? ` em “${s.titulo}”` : ' no Simulado Nacional'} já está disponível.`,
      nota,
      c.um('Quando abrir a correção, veja primeiro as questões em que ficou entre duas alternativas. Vale ler com calma o detalhe que separa uma resposta da outra.',
        'Uma coisa que ajuda depois do simulado é separar os erros de conteúdo das questões que ficaram difíceis pelo tempo. Assim dá para escolher o tipo de treino que mais vai ajudar.',
        'Se uma questão te tomou mais tempo que as outras, comece por ela. Leia o comentário e pense no que poderia ter identificado de cara no enunciado.'),
      `Aqui está a página do simulado: ${c.link('simulado')}`,
      ajuda(c),
    ] : [
      c.um(
        `Sua inscrição no Simulado Nacional${l?.titulo ? ` “${l.titulo}”` : ''} está registrada. ${prazo ?? 'Queria deixar uma sugestão para você se organizar.'}`,
        `Passei para lembrar do Simulado Nacional${l?.titulo ? ` “${l.titulo}”` : ''}. ${prazo ?? 'Vale conferir os horários antes de escolher quando fazer.'}`,
      ),
      l?.fecha_em ? `O prazo para participar vai até ${dataCurta(l.fecha_em)}.` : null,
      l?.total && l.total >= 10 ? `São ${l.total} questões${l.duracao_min ? `, com ${l.duracao_min === 120 ? 'duas horas' : l.duracao_min === 240 ? 'quatro horas' : `${l.duracao_min} minutos`} para responder` : ''}. Se puder, separe um horário para fazer do começo ao fim.` : null,
      l?.precisa_plano ? 'Para participar desta edição, é preciso ter assinatura ativa.' : null,
      `Você pode conferir os detalhes da prova aqui: ${c.link('simulado')}`,
      c.um('Bom simulado. Se tiver alguma dificuldade para abrir a edição, me escreva por aqui.',
        'Quando reservar um horário, confira também o prazo de encerramento. Tomara que tenha um bom treino.',
        'Se puder, escolha um momento em que dê para fazer a prova inteira. Depois, as questões que trouxerem dúvida já podem orientar a revisão.'),
    ]
  },
}))

const pix_3_dias: Versao[] = /* @__PURE__ */ ['sobre a renovação do seu acesso', 'para prolongar sua assinatura', 'seu acesso ao Orto Questões', 'sobre o período do seu plano', 'renovação da sua assinatura'].map((assunto,i): Versao => ({
  id: `v${i+11}`, assuntos: c => [nm(c, assunto, assunto.charAt(0).toUpperCase()+assunto.slice(1))],
  corpo: c => [
    c.um(`Seu acesso pago por Pix termina em ${dataCurta(c.pix?.fimEm) ?? 'três dias'}.`, `O período atual da sua assinatura por Pix vai até ${dataCurta(c.pix?.fimEm) ?? 'daqui a três dias'}.`, `Seu plano pago por Pix está perto do fim do período${dataCurta(c.pix?.fimEm) ? `, em ${dataCurta(c.pix?.fimEm)}` : ''}.`),
    c.um('Você já pode prolongar a assinatura em Minha assinatura. Os dias do novo período são somados aos que você ainda tem, sem perder o saldo atual.', 'Em Minha assinatura, você pode acrescentar mais tempo ao seu plano. O novo período começa depois dos dias que já estão pagos.', 'Para prolongar o acesso, basta escolher o próximo período em Minha assinatura. Os dias restantes continuam valendo e o novo período é acrescentado ao saldo.'),
    c.um('Seu histórico de questões, revisões e anotações continua salvo na conta.', 'Suas questões respondidas e anotações permanecem guardadas na conta.', 'Seu progresso de estudo continua salvo para você seguir de onde parou.'),
    `Para consultar as opções e prolongar: ${c.link('conta')}`,
    c.um('Se precisar de ajuda com a renovação, basta responder este e-mail.', 'Pode responder por aqui se tiver alguma dúvida sobre a renovação.', 'Se surgir alguma dificuldade para prolongar o acesso, me avise por aqui.'),
  ],
}))

const cartao_recusado: Versao[] = /* @__PURE__ */ ['sobre a tentativa de pagamento', 'posso ajudar com o pagamento?', 'uma alternativa para o seu pagamento', 'para concluir sua assinatura', 'sobre o seu cartão'].map((assunto, i): Versao => ({
    id: `v${i+1}`, assuntos: c => [nm(c, assunto, assunto.charAt(0).toUpperCase()+assunto.slice(1))],
    corpo: c => [
      c.um('Não foi possível concluir o pagamento no cartão. Posso ajudar?', 'O pagamento no cartão não foi confirmado. Você também pode concluir a assinatura por Pix.', 'A tentativa de pagamento no cartão não foi concluída. Há outra opção disponível para assinar: o Pix.'),
      c.um('O Pix está disponível na página de planos, junto das opções de cartão.', 'Você pode concluir a assinatura por Pix na página de planos.', 'A página de planos permite escolher o período de assinatura e pagar por Pix.'),
      `Você pode conferir por aqui: ${c.link('assinatura')}`,
      'Se aparecer uma mensagem de erro, pode responder este e-mail com uma captura dela. Esconda números de cartão, códigos de segurança e outros dados pessoais antes de enviar.',
      c.um('Se precisar de ajuda para concluir, pode me chamar respondendo este e-mail.', 'Pode responder por aqui se tiver alguma dúvida sobre o pagamento.', 'Se tiver alguma dúvida ao escolher o Pix, responda por aqui que eu te ajudo.'),
    ],

  }))

const pix_hoje: Versao[] = /* @__PURE__ */ ['seu período de acesso termina hoje', 'renovação do seu acesso', 'para continuar com seu plano', 'sobre sua assinatura', 'prolongar o período do seu plano'].map((assunto,i): Versao => ({
  id: `v${i+11}`, assuntos: c => [nm(c, assunto, assunto.charAt(0).toUpperCase()+assunto.slice(1))],
  corpo: c => [
    c.um('O período atual do seu acesso pago por Pix termina hoje.', 'Seu plano pago por Pix chega ao fim do período hoje.', 'Hoje termina o período que você pagou por Pix.'),
    c.um('Você pode prolongar a assinatura em Minha assinatura. O novo período se soma ao que você já tem.', 'Para continuar com o plano, escolha o próximo período em Minha assinatura. Os dias já pagos são preservados.', 'A opção de prolongar o acesso já está em Minha assinatura, com os períodos disponíveis para escolher.'),
    c.um('Seu histórico de estudo e suas anotações continuam salvos.', 'Suas questões respondidas e revisões seguem guardadas na conta.', 'Seu progresso permanece salvo para continuar de onde parou.'),
    `As opções estão aqui: ${c.link('conta')}`,
    c.um('Se precisar de ajuda com o pagamento, pode responder este e-mail.', 'Pode me chamar por aqui se tiver alguma dúvida para renovar.', 'Se encontrar alguma dificuldade na renovação, me avise respondendo por aqui.'),
  ],
}))

export const VERSOES: Record<string, Versao[]> = {
  'ativo:0-10': /* @__PURE__ */ estudo('uma sugestão para estudar por tema','treinar'),
  'ativo:10-20': /* @__PURE__ */ estudo('comentários e questões por tema','treinar'),
  'ativo:20-30': /* @__PURE__ */ estudo('revisão das questões anteriores','erros'),
  'ativo:30-40': /* @__PURE__ */ estudo('sua próxima revisão','revisao'),
  'ativo:40-60': /* @__PURE__ */ estudo('organizar a próxima sessão','revisao'),
  'ativo:60-70': /* @__PURE__ */ estudo('revisão dos pontos específicos','erros'),
  'ativo:70-80': /* @__PURE__ */ estudo('para consultar seu Caderno de erros','erros'),
  'ativo:80-90': /* @__PURE__ */ estudo('revisão de temas específicos','erros'),
  'ativo:90-100': /* @__PURE__ */ estudo('suas próximas revisões','revisao'),
  nunca_comecou:/* @__PURE__ */ nunca(), boas_vindas:/* @__PURE__ */ estudo('recursos para seu estudo','treinar'), boas_vindas_dia0:boasVindas,
  comecando:/* @__PURE__ */ estudo('uma sessão de questões','treinar'),
  comecou_parou:/* @__PURE__ */ estudo('continuar pelos temas já estudados'), pausa:/* @__PURE__ */ estudo('sua revisão está disponível'), sumiu:/* @__PURE__ */ estudo('seu histórico de estudo'),
  voltou:/* @__PURE__ */ estudo('continuar sua revisão'), assinante_parado_7:/* @__PURE__ */ estudo('acesso às suas revisões'), como_estao:/* @__PURE__ */ estudo('uma opção para a próxima sessão'),
  acesso_terminou:/* @__PURE__ */ estudo('consultar seu histórico de estudo'),
  convite_20:/* @__PURE__ */ convite(), convite_50:/* @__PURE__ */ convite(),
  reta_final:/* @__PURE__ */ cartasDeProva(false), vespera_prova:/* @__PURE__ */ cartasDeProva(true), depois_prova:depoisDaProva,
  marco:/* @__PURE__ */ marco(), primeiras_10:/* @__PURE__ */ marco(true), opiniao:/* @__PURE__ */ opiniao(), indicar:/* @__PURE__ */ indicar(), cronograma:/* @__PURE__ */ cronograma(), cronograma_pronto:/* @__PURE__ */ cronograma(true),
  pagamento_aprovado:/* @__PURE__ */ pagamento(), obrigado_tempo:/* @__PURE__ */ encerramento(), relatorio:/* @__PURE__ */ relatorio(), aniversario:/* @__PURE__ */ aniversario(), um_ano:/* @__PURE__ */ aniversario(true),
  indicacao_deu_certo:/* @__PURE__ */ indicacao(), resumo_do_tema:/* @__PURE__ */ resumo(), simulado_resultado:/* @__PURE__ */ simulado(true), simulado_lembrete:/* @__PURE__ */ simulado(),
  pix_3_dias, pix_hoje, cartao_recusado,
  // Mantidos apenas para leitura de histórico; o bloqueio central impede novos envios.
  obrigado_assinatura:/* @__PURE__ */ pagamento(), assinou_sem_cronograma:/* @__PURE__ */ cronograma(),
}

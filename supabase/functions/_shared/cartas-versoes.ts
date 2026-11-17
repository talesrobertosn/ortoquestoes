/** Revisão integral de 15/11/2026: informação clara, proposta útil e ajuda objetiva.
 * Sem P.S., culpa por ausência, intimidade encenada ou incentivo à compra seguido de recuo retórico.
 * Os dados pessoais continuam limitados aos fatos existentes no perfil.
 */
import type { Ctx } from './cartas.ts'
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
const prova = (c: Ctx) => {
  const n = (c.p.provaCronograma ?? '').trim()
  if (/^(outra(?: prova)?|outro|prova|não informad[oa])$/i.test(n)) return 'a sua prova'
  if (n) return /^(TEOT|TEPOT|TARO|ENARE)(\b|$)/i.test(n) ? `o ${n}` : `a prova de ${n}`
  return c.nomeProva || 'a sua prova'
}
const acesso = (c: Ctx) => c.um('Seu histórico de estudo e suas anotações continuam salvos na conta.', 'As questões respondidas e as revisões ficam guardadas no seu histórico.', 'Seu progresso permanece salvo para continuar de onde parou.')
const sugestao = (c: Ctx, rota: 'treinar' | 'revisao' | 'erros') => rota === 'erros'
  ? c.um('No Caderno de erros, você pode refazer questões e consultar a explicação de cada alternativa.', 'Uma sessão no Caderno de erros permite revisar os pontos das questões anteriores.', 'Para revisar dúvidas específicas, o Caderno de erros reúne as questões e os comentários.')
  : rota === 'revisao' ? c.um('Na Revisão, você encontra as questões indicadas para retomar os temas já estudados.', 'A Revisão reúne os assuntos do seu histórico para a próxima sessão.', 'Você pode começar a próxima sessão pela Revisão e consultar os comentários das alternativas.')
  : c.um('Você pode escolher um tema e resolver algumas questões, consultando o comentário das alternativas.', 'Uma forma de organizar a próxima sessão é escolher um tema e ler o comentário de cada resposta.', 'Na página de questões, os filtros ajudam a escolher o tema e a prova da próxima sessão.')

/** A personalização ajuda a estudar; nunca recita dados do cadastro. */
const primeirosPassos = (c: Ctx): Pedaco[] => [
  c.um('Vi que você ainda não começou as questões por aqui. Que tal experimentar uma sessão?', 'Você ainda não respondeu suas primeiras questões no site. Queria te convidar a experimentar.', 'Vi que sua primeira sessão ainda está por começar. Separei uma sugestão para você experimentar o site.'),
  c.um('Escolha um assunto de que você gosta e comece por algumas questões. Acho que você vai gostar de estudar pelos comentários.', 'Comece por um tema que você quer aprender e leia as explicações depois de responder. É uma boa forma de conhecer o site.', 'Experimente algumas questões de um assunto do seu interesse. Os comentários ajudam a entender o raciocínio e a revisar o tema.'),
  c.um('Vale ler também por que as outras alternativas estão erradas; é uma parte importante do estudo.', 'Depois de responder, confira o comentário de cada alternativa e use a explicação para revisar suas dúvidas.', 'A ideia é aproveitar cada questão para aprender, consultando a explicação depois da resposta.'),
  `Para começar: ${c.link('treinar')}`, ajuda(c),
]
const incentivo = (c: Ctx): string => c.um(
  'Continue praticando e lendo os comentários. Cada sessão é uma oportunidade de entender melhor os temas.',
  'Continue se dedicando ao estudo. Escolha um tema por vez e use os comentários para esclarecer as dúvidas.',
  'Siga fazendo as questões e revisando as explicações. O importante é aproveitar cada resposta para aprender.',
  'Continue estudando pelos comentários e volte às questões que trouxeram dúvidas. Isso ajuda a ganhar segurança no raciocínio.',
  'Vamos continuar o estudo com algumas questões de um tema e a leitura dos comentários de cada alternativa.',
)
function proximoPasso(c: Ctx): Pedaco[] {
  const pct = c.pctBom
  if (pct === null) return [incentivo(c), c.obs(1, ['maisEstudada', 'semana', 'sequencia'])]
  const meta = pct < 90 ? Math.min(90, (Math.floor(pct / 10) + 1) * 10) : pct < 95 ? 95 : null
  return [
    c.um(`Vi que sua taxa de acerto está em ${pct}%.${meta ? ` Continue praticando para buscar os ${meta}%.` : ' Parabéns pelo resultado! Continue variando os temas para manter o estudo completo.'}`,
      `Você está com ${pct}% de acerto nas questões.${meta ? ` Vamos continuar o estudo e mirar os ${meta}%?` : ' Parabéns! Agora vale revisar os detalhes e manter contato com as diferentes áreas.'}`,
      `Sua taxa de acerto está em ${pct}%.${meta ? ` Continue se dedicando para avançar em direção aos ${meta}%.` : ' Parabéns pelo resultado! Siga revisando os temas para consolidar o que aprendeu.'}`),
    c.fato('melhorArea'), c.fato('areaFraca'), c.fato('ranking'),
    // Só usa um complemento se faltarem temas/ranking; nunca preenche com cadastro.
    c.obs(1, ['sequencia', 'semana', 'maisEstudada']),
  ]
}
function estudo(tema: string, rota: 'treinar' | 'revisao' | 'erros' = 'revisao', total = 6): Versao[] {
  return Array.from({ length: total }, (_, i) => ({
    id: `v${i+31}`, assuntos: c => [nm(c, [tema, 'vamos continuar as questões?', 'uma sugestão para seu próximo treino', 'para avançar no seu estudo', 'seus próximos temas de revisão', 'vamos praticar mais um pouco?'][i%6])],
    corpo: c => c.r === 0 ? primeirosPassos(c) : [
      c.um('Você já começou a resolver as questões. Tenho uma sugestão para o próximo treino.', 'Vi que você está fazendo as questões. Vamos continuar o estudo?', 'Você já começou a estudar por aqui. Queria te incentivar a continuar pelas questões e pelos comentários.'),
      ...proximoPasso(c), sugestao(c, rota), `Para continuar: ${c.link(rota)}`, ajuda(c),
    ],
  }))
}
const nunca = (): Versao[] => Array.from({length:6},(_,i)=>({
  id:`v${i+31}`, assuntos:c=>[nm(c,['vamos começar as questões?','sua primeira sessão','um tema para começar','experimente as questões comentadas','por onde começar o estudo','um convite para seu primeiro treino'][i])],
  corpo:primeirosPassos,
}))
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
const boasVindas: Versao[] = [{id:'v41',assuntos:c=>[nm(c,'sua conta no Orto Questões')],corpo:c=>[
  'Que bom ter você no Orto Questões! Sua conta já está pronta para começar.',
  'Minha sugestão para o primeiro treino é escolher um tema e resolver algumas questões. Depois de responder, leia também a explicação das outras alternativas.',
  'A Biblioteca de resumos ajuda a consultar o conteúdo, e a Revisão reúne as questões para retomar depois. O Cronograma está disponível para organizar as sessões pela data da prova.',
  `Para começar pelas questões: ${c.link('treinar')}`,
  ajuda(c),
]}]
const provaVersoes = (tipo: 'reta_final'|'vespera_prova'|'depois_prova'): Versao[] => Array.from({length:6},(_,i)=>({
  id:`v${i+21}`, assuntos:c=>[nm(c, (tipo==='depois_prova'?['sobre a sua prova','como foi o formato da prova','sua experiência na prova','conteúdo da prova','sobre os temas cobrados','comentários sobre a prova']:tipo==='vespera_prova'?['sobre a prova de amanhã','sua revisão antes da prova','para consultar suas anotações','última revisão dos temas','sua prova está chegando','anotações para a prova']:['organizar a revisão para a prova','seus próximos temas de revisão','o plano de estudo para a prova','sobre sua revisão','as próximas sessões de estudo','sua preparação para a prova'])[i])],
  corpo:c=>tipo==='depois_prova'?[
    `Como foi ${prova(c)}?`,
    c.um('Gostaria de saber quais temas apareceram e como foi o formato da prova.', 'Você pode contar quais assuntos foram cobrados e como as questões foram apresentadas.', 'Sua experiência com o conteúdo e o formato ajuda a orientar as próximas revisões do acervo.'),
    'Se puder compartilhar alguma observação sobre a prova, responda por aqui.',
  ]:[
    tipo==='vespera_prova'?`Amanhã é ${prova(c)}.`:`Com ${prova(c)} se aproximando, vale retomar as questões e as anotações que trouxeram dúvidas.`,
    c.obs(1),
    c.um('Uma opção é revisar as questões já respondidas e as anotações que você salvou.', 'Os comentários das questões anteriores e suas anotações podem orientar a próxima revisão.', 'Você pode selecionar os temas que quer revisar e consultar os comentários de cada alternativa.'),
    `Sua revisão fica aqui: ${c.link('revisao')}`, ajuda(c),
  ],
}))
const marco = (primeiro = false): Versao[] => Array.from({length:6},(_,i)=>({
  id:`v${i+41}`, assuntos:c=>[nm(c,[primeiro?'suas primeiras questões':'parabéns pelo seu novo marco','mais um passo no seu estudo','suas questões e a próxima revisão','seu progresso nas questões','para continuar seu treino','um marco para comemorar'][i])],
  corpo:c=>[
    primeiro?'Você concluiu suas primeiras dez questões no Orto Questões.':`Você completou ${Q(c.marco ?? 100)} no Orto Questões. Parabéns pela dedicação ao estudo!`,
    c.obs(1,['ranking','melhorArea']),
    c.um('Para aproveitar esse treino, vale voltar às questões que trouxeram dúvidas e reler os comentários.', 'A próxima sessão pode ser dedicada a refazer questões e conferir o raciocínio de cada alternativa.', 'Continue praticando e reserve uma parte do treino para revisar os conceitos das questões anteriores.'),
    `Sua revisão está aqui: ${c.link('revisao')}`, ajuda(c),
  ],
}))
const opiniao = (): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+21}`,assuntos:c=>[nm(c,['como está sendo usar o site?','sua opinião sobre o Orto Questões','o que funciona no seu estudo','sugestões para o site','sobre sua experiência no site'][i])],corpo:c=>[
    c.um('Como tem sido usar o Orto Questões?', 'Queria saber sua opinião sobre o uso do site.', 'Você pode contar como está sendo estudar pelo Orto Questões?'),
    c.um('O que tem ajudado no estudo e o que poderia funcionar melhor?', 'Quais recursos têm sido úteis e onde você encontrou dificuldade?', 'Tem alguma melhoria que facilitaria sua próxima sessão?'),
    'Você pode responder diretamente a este e-mail com suas observações.',
  ],
}))
const indicar = (): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+21}`,assuntos:c=>[nm(c,['indicação para colegas','como indicar o Orto Questões','sua página de indicações','compartilhar o site com colegas','o programa de indicações'][i])],corpo:c=>[
    c.um('Você pode compartilhar o Orto Questões com colegas que também estudam ortopedia.', 'A página de indicações reúne o seu convite para colegas.', 'O programa de indicações permite compartilhar o site com colegas de estudo.'),
    'Na página Indique e ganhe, você encontra o convite e os critérios do programa.',
    `Para consultar: ${c.link('indicar')}`, ajuda(c),
  ],
}))
const cronograma = (pronto = false): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+21}`,assuntos:c=>[nm(c,[pronto?'seu cronograma está salvo':'organizar seu estudo','sobre o cronograma','suas próximas sessões','organização dos temas','consultar o plano de estudo'][i])],corpo:c=>[
    pronto?`Seu cronograma foi salvo${c.diasProva !== null ? `, com ${c.diasProva} dias até ${prova(c)}` : ''}. As próximas sessões estão disponíveis na sua conta.`:'O Cronograma permite organizar o estudo pela data da prova e pelo tempo disponível.',
    c.obs(1),
    c.um('Você pode consultar a lista de cada dia e ajustar sua disponibilidade.', 'A página mostra as sessões previstas e permite atualizar o tempo disponível.', 'Os temas e as revisões aparecem no planejamento das próximas sessões.'),
    `Para abrir o Cronograma: ${c.link('cronograma')}`, ajuda(c),
  ],
}))
const dataCompleta = (iso?: string | null) => iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}) : null
const planoPorExtenso = (id?: string | null) => id ? ({mensal:'mensal',trimestral:'trimestral',semestral:'semestral',anual:'anual'}[id] ?? null) : null
const pagamento = (): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+41}`,assuntos:c=>[nm(c,(c.pagamento?.renovacao?['renovação confirmada','seu novo período está confirmado','pagamento da renovação aprovado','confirmação da sua renovação','seu acesso foi prolongado']:['pagamento aprovado','sua assinatura foi confirmada','seu acesso está ativo','confirmação do seu plano','seu período de acesso'])[i])],corpo:c=>[
    c.pagamento?.renovacao?'O pagamento da renovação foi aprovado. Seu novo período de acesso está confirmado. Obrigado por continuar estudando com o Orto Questões.':c.um('Seu pagamento foi aprovado e a assinatura está confirmada. Obrigado pela confiança!', 'Sua assinatura foi confirmada. Obrigado por escolher o Orto Questões para o seu estudo.', 'O pagamento foi aprovado e seu acesso está ativo. Obrigado pela assinatura!'),
    planoPorExtenso(c.pagamento?.plano)?`Plano confirmado: ${planoPorExtenso(c.pagamento?.plano)}.`:null,
    dataCompleta(c.pagamento?.fimEm)?`Seu acesso pago vai até ${dataCompleta(c.pagamento?.fimEm)}.`:null,
    c.pagamento?.meio==='pix'?'O pagamento foi feito por Pix. Não há renovação automática; os detalhes do período e as opções para prolongar ficam em Minha assinatura.':c.pagamento?.meio==='cartao'?'O pagamento foi confirmado no cartão. Em Minha assinatura você consulta o período, a renovação e os recibos.':'Em Minha assinatura você consulta os detalhes do acesso, os pagamentos e os recibos.',
    `Para consultar seu plano: ${c.link('conta')}`, ajuda(c),
  ],
}))
const encerramento = (): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+41}`,assuntos:c=>[nm(c,(c.encerramento?.reembolso?['sobre o reembolso da assinatura','atualização do seu reembolso','reembolso registrado','detalhes do reembolso','sua assinatura e o reembolso']:['renovação automática desligada','cancelamento confirmado','sobre o fim do período pago','atualização da assinatura','detalhes do cancelamento'])[i])],corpo:c=>{
    const fim=dataCompleta(c.encerramento?.fimEm)
    const vigente=!!c.encerramento?.fimEm&&Date.parse(c.encerramento.fimEm)>c.hoje.getTime()
    return [
      c.encerramento?.reembolso?'O reembolso desta assinatura foi registrado, e o período de acesso pago foi encerrado.':vigente?`A renovação automática foi desligada. Você continua com o período pago até ${fim}; essa renovação não gerará outro pagamento.`:fim?`O cancelamento da assinatura foi confirmado. O período pago terminou em ${fim}.`:'O cancelamento da assinatura foi confirmado. Você pode consultar o período e os detalhes na sua conta.',
      acesso(c),
      `Os detalhes ficam em Minha assinatura: ${c.link('conta')}`,
      'Se precisar esclarecer alguma informação sobre a solicitação, basta responder este e-mail.',
    ]
  },
}))
const relatorio = (): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+41}`,assuntos:c=>[nm(c,[(c.relatorio?.quinzena?'seu resumo quinzenal':'seu resumo mensal'),'seu progresso e a próxima revisão','seu estudo neste período','questões, resultados e próximos passos','uma sugestão para sua próxima sessão'][i])],corpo:c=>{
    const d=c.relatorio, n=d?.respostas??0, total=(d?.certas??0)+(d?.erradas??0), pct=total?Math.round((d?.certas??0)/total*100):null
    const citavel=n>=30&&pct!==null&&pct>=50
    const delta=citavel&&d?.acertoAnterior!==null&&d?.acertoAnterior!==undefined?pct!-d.acertoAnterior:null
    const forte=d?.melhorArea&&c.area(d.melhorArea.slug)&&d.melhorArea.acerto>=70?d.melhorArea:null
    const revisar=d?.maisFraco&&c.area(d.maisFraco.slug)&&d.maisFraco.slug!==forte?.slug?d.maisFraco:null
    return [
      d?.rotulo?`Separei seu resumo de estudo ${d.rotulo}, com uma sugestão para a próxima sessão.`:'Seu resumo de estudo está disponível, com uma sugestão para continuar.',
      n>=10?`Você respondeu ${Q(n)} neste período${d?.diasAtivos&&d.diasAtivos>0?`, distribuídas em ${d.diasAtivos===1?'um dia':`${d.diasAtivos} dias`} de estudo`:''}.`:n>0?'Você já começou a responder as questões neste período. Continue praticando e lendo os comentários.':'Seu histórico e suas anotações continuam salvos. Para retomar, escolha um tema e experimente uma sessão de questões comentadas.',
      citavel?`Sua taxa de acerto no período foi de ${pct}%.${delta!==null&&delta>0?` O resultado subiu ${delta} pontos em relação ao período anterior.`:' Continue praticando e revisando os comentários para consolidar os temas.'}`:n>0?incentivo(c):null,
      citavel&&forte?`Seu ponto forte no período foi ${c.area(forte.slug).de}. Parabéns pelo estudo desse tema!`:null,
      revisar?`Para a próxima sessão, minha sugestão é reforçar ${c.area(revisar.slug).de}, refazendo as questões e consultando os comentários.`:n>0?'Para a próxima sessão, vale retomar as questões que trouxeram dúvidas e ler a explicação de cada alternativa.':null,
      d?.simulado&&d.simulado.acertos>=10&&d.simulado.total>=d.simulado.acertos&&d.simulado.acertos*2>=d.simulado.total?`Na edição "${d.simulado.titulo}", você acertou ${d.simulado.acertos} de ${d.simulado.total} questões.`:null,
      `Seu desempenho e os temas estudados: ${c.link('desempenho')}`, ajuda(c),
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
const resumo = (): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+21}`,assuntos:c=>[nm(c,['resumo novo para seu estudo','uma atualização na Biblioteca','novo conteúdo na Biblioteca','um resumo do seu tema','resumo disponível para leitura'][i])],corpo:c=>[
    c.campanha.resumo?.titulo?`O resumo "${c.campanha.resumo.titulo}" está disponível na Biblioteca.`:'Há um resumo novo relacionado aos temas do seu estudo na Biblioteca.',
    c.um('O texto reúne os pontos do tema e as questões vinculadas para resolver durante a leitura.', 'Você pode ler por seção e resolver as questões relacionadas ao tema.', 'O resumo pode ser consultado junto das questões do tema.'),
    `Para abrir: ${c.link('resumo')}`, ajuda(c),
  ],
}))
const simulado = (resultado = false): Versao[] => Array.from({length:5},(_,i)=>({
  id:`v${i+21}`,assuntos:c=>[nm(c,(resultado?['resultado do Simulado Nacional','seu resultado está disponível','correção do seu simulado','os comentários do simulado','consulta do seu resultado']:['sobre o Simulado Nacional','sua inscrição no simulado','acesso ao seu simulado','data do Simulado Nacional','informações do seu simulado'])[i])],corpo:c=>{
    const s=c.campanha.simulado, l=c.campanha.lembrete
    return [
      resultado?`O resultado${s?.titulo?` de "${s.titulo}"`: ' do Simulado Nacional'} está disponível.`:`Você se inscreveu no Simulado Nacional${l?.titulo?` "${l.titulo}"`:''}.`,
      resultado&&s?.total&&s?.acertos!==null&&s?.acertos!==undefined&&s.acertos>=10&&s.acertos*2>=s.total?`Seu resultado foi de ${s.acertos} em ${s.total} respostas.`:null,
      !resultado&&l?.tipo_lembrete==='abre_amanha'?'O simulado abre amanhã.':!resultado&&l?.tipo_lembrete==='abriu_hoje'?'O simulado já está aberto.':!resultado&&l?.abre_em?`A abertura está prevista para ${dataCurta(l.abre_em)}${l.fecha_em?`, com encerramento em ${dataCurta(l.fecha_em)}`:''}.`:null,
      !resultado&&l?.total&&l.total>=10?`A edição tem ${l.total} questões${l.duracao_min?`, com duração de ${{120:'duas horas',240:'quatro horas'}[l.duracao_min]??`${l.duracao_min} minutos`}`:''}.`:null,
      !resultado&&l?.precisa_plano?'Esta edição exige assinatura ativa para participar.':null,
      c.um('A página do simulado reúne as informações da edição.', 'Você pode consultar as informações da edição na página do simulado.', 'As informações e o acesso à edição estão na página do simulado.'),
      `Para consultar: ${c.link('simulado')}`, ajuda(c),
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
  reta_final:/* @__PURE__ */ provaVersoes('reta_final'), vespera_prova:/* @__PURE__ */ provaVersoes('vespera_prova'), depois_prova:/* @__PURE__ */ provaVersoes('depois_prova'),
  marco:/* @__PURE__ */ marco(), primeiras_10:/* @__PURE__ */ marco(true), opiniao:/* @__PURE__ */ opiniao(), indicar:/* @__PURE__ */ indicar(), cronograma:/* @__PURE__ */ cronograma(), cronograma_pronto:/* @__PURE__ */ cronograma(true),
  pagamento_aprovado:/* @__PURE__ */ pagamento(), obrigado_tempo:/* @__PURE__ */ encerramento(), relatorio:/* @__PURE__ */ relatorio(), aniversario:/* @__PURE__ */ aniversario(), um_ano:/* @__PURE__ */ aniversario(true),
  indicacao_deu_certo:/* @__PURE__ */ indicacao(), resumo_do_tema:/* @__PURE__ */ resumo(), simulado_resultado:/* @__PURE__ */ simulado(true), simulado_lembrete:/* @__PURE__ */ simulado(),
  pix_3_dias, pix_hoje, cartao_recusado,
  // Mantidos apenas para leitura de histórico; o bloqueio central impede novos envios.
  obrigado_assinatura:/* @__PURE__ */ pagamento(), assinou_sem_cronograma:/* @__PURE__ */ cronograma(),
}

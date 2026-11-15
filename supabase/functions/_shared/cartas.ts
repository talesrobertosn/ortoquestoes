/**
 * Cartas do Tales: o motor dos e-mails pessoais do Orto Questões (15/10/2026;
 * reescrito em 17/10/2026 conforme docs/emails/PLANO.md).
 *
 * Diretriz atual (15/11/2026): mensagens claras e cordiais, sem pressão emocional,
 * P.S. ou preenchimento automático. O painel e o servidor usam o mesmo motor puro.
 *
 * Como funciona:
 *  1. `escolherTipo` olha os dados da pessoa e decide a situação (nunca começou,
 *     começou e parou, sumiu, ativa numa faixa de acerto, assinante, convite...)
 *     e diz se a cadência permite escrever agora (`bloqueio`).
 *  2. `gerarCarta` escolhe versões por situação e fatos reais, evita a versão já
 *     recebida e verifica tamanho, assunto e link. Não acrescenta P.S. ou frases.
 *  3. `renderizarCarta` transforma o texto em HTML mínimo + texto simples, com a
 *     assinatura fixa. É a única função que monta o e-mail final.
 *
 * Regras (docs/emails/TOM.md e docs/emails/PLANO.md):
 *  - Regra dos 10: nenhum número de questões abaixo de 10 em texto nenhum (abaixo
 *    disso, "os primeiros passos"). `Ctx.q` e `Ctx.dez` cuidam disso.
 *  - Acerto só com 30 questões e 50% ou mais (`Ctx.pctBom`), e nunca na mesma
 *    carta em que a área a melhorar é citada.
 *  - Área a melhorar só com 40 questões na área, como oportunidade, sem número.
 *  - Até 3 observações pessoais por carta (`Ctx.obs`).
 *  - Cadência: nenhuma carta não transacional quando a pessoa recebeu qualquer
 *    e-mail nas últimas 48 h ou 3 nos últimos 14 dias (`cadenciaBloqueia`).
 *  - Marcos comemorados: 100, 250, 500, 1.000 e 2.000.
 */
import { VERSOES, type Versao } from './cartas-versoes.ts'

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Faixas de acerto pedidas pelo dono. "40-60" é "na média". */
export type Faixa = '0-10' | '10-20' | '20-30' | '30-40' | '40-60' | '60-70' | '70-80' | '80-90' | '90-100'
export const FAIXAS: readonly Faixa[] = ['0-10', '10-20', '20-30', '30-40', '40-60', '60-70', '70-80', '80-90', '90-100']
export const ROTULO_FAIXA: Record<Faixa, string> = {
  '0-10': 'até 10%', '10-20': '10 a 20%', '20-30': '20 a 30%', '30-40': '30 a 40%', '40-60': 'na média (40 a 60%)',
  '60-70': '60 a 70%', '70-80': '70 a 80%', '80-90': '80 a 90%', '90-100': '90% ou mais',
}

export type TipoCarta =
  | 'nunca_comecou' | 'boas_vindas' | 'comecando' | 'comecou_parou' | 'pausa' | 'sumiu' | 'ativo'
  | 'obrigado_assinatura' | 'convite_20' | 'convite_50' | 'reta_final' | 'marco'
  | 'opiniao' | 'indicar' | 'cronograma'
  | 'pix_3_dias' | 'pix_hoje' | 'relatorio' | 'cartao_recusado'
  // Novos em 17/10/2026 (sem SQL): disparados por um acontecimento no site ou no pagamento.
  | 'boas_vindas_dia0' | 'primeiras_10' | 'voltou' | 'cronograma_pronto' | 'pagamento_aprovado' | 'obrigado_tempo'
  // Parte 31 (18/10/2026): as campanhas diárias, escolhidas pelo banco (candidatos_<tipo>) e mandadas pelo agendador.
  | 'assinou_sem_cronograma' | 'assinante_parado_7' | 'simulado_resultado' | 'vespera_prova' | 'depois_prova'
  | 'aniversario' | 'um_ano' | 'indicacao_deu_certo' | 'resumo_do_tema'
  // Parte 32 (19/10/2026): o lembrete de quem se inscreveu no Simulado Nacional (candidatos_simulado_lembrete).
  | 'simulado_lembrete'
  // 05/11/2026: manuais, pela tela "Prontas para enviar" (o acesso pago terminou; assinante em risco de parar).
  | 'acesso_terminou' | 'como_estao'

/** Nomes informados no cronograma; nunca tratar o rótulo de seleção como nome da prova. */
export function nomeProvaInformado(valor?: string | null): string {
  const nome = (valor ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  return /^(outra(?: prova)?|outro|n[aã]o informad[oa]|prova)$/i.test(nome) || /[@<>]/.test(nome) || !/\p{L}/u.test(nome) ? '' : nome
}
export function provaComArtigo(valor?: string | null): string {
  const nome = nomeProvaInformado(valor)
  return !nome ? 'a sua prova' : /^(?:TEOT|TEPOT|TARO|ENARE)(?:\b|$)/i.test(nome) ? `o ${nome}` : `a prova de ${nome.replace(/^prova\s+(?:de\s+)?/i, '')}`
}
// Tales, 15/11/2026: pagamento direto e cordial, sem P.S. ou frases de pressão disfarçada.
export const TIPOS_SEM_PS: readonly TipoCarta[] = ['nunca_comecou', 'boas_vindas', 'comecando', 'comecou_parou', 'pausa', 'sumiu', 'ativo', 'obrigado_assinatura', 'convite_20', 'convite_50', 'reta_final', 'marco', 'opiniao', 'indicar', 'cronograma', 'cartao_recusado', 'pix_3_dias', 'pix_hoje', 'relatorio', 'boas_vindas_dia0', 'primeiras_10', 'voltou', 'cronograma_pronto', 'pagamento_aprovado', 'obrigado_tempo', 'assinou_sem_cronograma', 'assinante_parado_7', 'simulado_resultado', 'vespera_prova', 'depois_prova', 'aniversario', 'um_ano', 'indicacao_deu_certo', 'resumo_do_tema', 'acesso_terminou', 'como_estao', 'simulado_lembrete']
export const TIPOS_APOSENTADOS: readonly string[] = ['obrigado_assinatura', 'assinou_sem_cronograma']

export interface InfoTipo { rotulo: string; descricao: string; grupo: 'situacao' | 'convite' | 'pessoal' | 'automatico' }
export const TIPOS: Record<TipoCarta, InfoTipo> = {
  nunca_comecou: { grupo: 'situacao', rotulo: 'Criou a conta e não começou', descricao: 'Conta criada há pelo menos um dia e nenhuma questão respondida.' },
  boas_vindas: { grupo: 'situacao', rotulo: 'Boas-vindas', descricao: 'Chegou nos últimos 3 dias e já respondeu algumas questões.' },
  comecando: { grupo: 'situacao', rotulo: 'Começando', descricao: 'Ativo, com menos de 30 questões: pergunta como está sendo e dá uma ideia prática.' },
  comecou_parou: { grupo: 'situacao', rotulo: 'Começou e parou', descricao: 'Menos de 30 questões respondidas e alguns dias sem nova sessão.' },
  pausa: { grupo: 'automatico', rotulo: 'Revisão após 3 a 6 dias', descricao: 'Última sessão há três a seis dias, com histórico de estudo anterior.' },
  sumiu: { grupo: 'situacao', rotulo: 'Sem estudar há vários dias', descricao: 'Já respondia questões e está há vários dias sem estudar; o motivo mostra a janela aplicada.' },
  ativo: { grupo: 'situacao', rotulo: 'Estudando (pela faixa de acerto)', descricao: 'Uma voz para cada faixa de acerto, com o que a pessoa tem de especial.' },
  obrigado_assinatura: { grupo: 'pessoal', rotulo: 'Obrigado pela assinatura', descricao: 'Aposentado: o agradecimento já sai automaticamente no pagamento.' },
  convite_20: { grupo: 'convite', rotulo: 'Convite para assinar (mais de 20 questões)', descricao: 'Leve: o que o plano faz pela rotina, a garantia, sem preço.' },
  convite_50: { grupo: 'convite', rotulo: 'Convite pessoal (mais de 50 questões)', descricao: 'Dias para a prova, área forte, o cronograma como horas devolvidas; garantia.' },
  reta_final: { grupo: 'situacao', rotulo: 'Reta final', descricao: 'A prova informada está se aproximando; a carta usa a data e o nome disponíveis.' },
  marco: { grupo: 'situacao', rotulo: 'Marco de questões (100, 250, 500, 1.000, 2.000)', descricao: 'Alcançou 100, 250, 500, 1.000 ou 2.000 questões respondidas.' },
  opiniao: { grupo: 'pessoal', rotulo: 'Pedir opinião', descricao: 'Três perguntas concretas.' },
  indicar: { grupo: 'pessoal', rotulo: 'Pedir para indicar', descricao: '"Quem você conhece que está nessa?"; os 7 dias para os dois.' },
  cronograma: { grupo: 'pessoal', rotulo: 'Apresentar o cronograma', descricao: 'Quando ele devolve tempo.' },
  cartao_recusado: { grupo: 'automatico', rotulo: 'Ajuda com o cartão', descricao: 'Tentativa de pagamento não concluída; oferece ajuda e a alternativa do Pix.' },
  pix_3_dias: { grupo: 'automatico', rotulo: 'Pix: faltam 3 dias', descricao: 'O período de acesso pago no Pix termina em três dias.' },
  pix_hoje: { grupo: 'automatico', rotulo: 'Pix: termina hoje', descricao: 'O período de acesso pago no Pix termina hoje.' },
  relatorio: { grupo: 'automatico', rotulo: 'Resumo de estudo', descricao: 'Automático: a quinzena ou o mês contados como uma história.' },
  boas_vindas_dia0: { grupo: 'automatico', rotulo: 'Boas-vindas no dia da confirmação', descricao: 'Primeiro login depois de confirmar o e-mail: boas-vindas, as funções do site (questões, Cronograma, resumos) e o pedido para contar aos colegas.' },
  primeiras_10: { grupo: 'automatico', rotulo: 'Primeiras 10 questões', descricao: 'Ao passar de 10 questões: o hábito começou.' },
  voltou: { grupo: 'automatico', rotulo: 'Retomada do estudo', descricao: 'Primeiro login depois de 10 dias ou mais fora.' },
  cronograma_pronto: { grupo: 'automatico', rotulo: 'Cronograma pronto', descricao: 'No dia em que a pessoa monta o plano até a prova.' },
  pagamento_aprovado: { grupo: 'automatico', rotulo: 'Obrigado pela assinatura', descricao: 'Sai quando a assinatura ou a renovação é aprovada: agradecimento, plano, período, o que libera e o link do cronograma. Transacional.' },
  obrigado_tempo: { grupo: 'automatico', rotulo: 'Obrigado pelo tempo de assinatura', descricao: 'Confirmação da solicitação de cancelamento ou reembolso.' },
  assinou_sem_cronograma: { grupo: 'automatico', rotulo: 'Assinou e não montou o cronograma', descricao: 'Aposentado: montar um cronograma é opcional.' },
  assinante_parado_7: { grupo: 'automatico', rotulo: 'Assinante parado há 7 dias', descricao: 'Assinatura ativa e pelo menos uma semana sem responder questões.' },
  simulado_resultado: { grupo: 'automatico', rotulo: 'Resultado do Simulado Nacional', descricao: 'Quando a edição fecha: obrigado por ter feito, o que o resultado mostra e o que fazer com ele.' },
  vespera_prova: { grupo: 'automatico', rotulo: 'Véspera da prova', descricao: 'Na véspera da data do cronograma: orientações práticas e boa prova.' },
  depois_prova: { grupo: 'automatico', rotulo: 'Depois da prova: como foi?', descricao: 'De 1 a 3 dias depois da data do cronograma: pergunta como foi, sem presumir o resultado.' },
  aniversario: { grupo: 'automatico', rotulo: 'Aniversário', descricao: 'No dia do aniversário (data de nascimento do cadastro): curta, sem convite.' },
  um_ano: { grupo: 'automatico', rotulo: 'Um ano de Orto Questões', descricao: 'No dia em que a conta faz um ano (ou mais): o caminho até aqui, sem convite.' },
  indicacao_deu_certo: { grupo: 'automatico', rotulo: 'Sua indicação deu certo', descricao: 'Quem a pessoa indicou chegou a 20 questões: obrigado pela confiança.' },
  resumo_do_tema: { grupo: 'automatico', rotulo: 'Saiu um resumo do seu tema', descricao: 'Semanal, só para quem aceitou novidades: um resumo novo na área que a pessoa mais estuda.' },
  acesso_terminou: { grupo: 'situacao', rotulo: 'Acesso encerrado', descricao: 'O acesso pago terminou há até 30 dias. Sugere consultar o histórico e as revisões salvas.' },
  como_estao: { grupo: 'situacao', rotulo: 'Como estão os estudos? (risco de parar)', descricao: 'Assinante que o painel marcou com risco moderado ou alto: pergunta da rotina, a Revisão e o cronograma que se ajusta; se o acesso estiver perto do fim, a conta dos dias somados.' },
  simulado_lembrete: { grupo: 'automatico', rotulo: 'Lembrete do Simulado Nacional', descricao: 'Para quem se inscreveu: a edição abre amanhã (ou abriu hoje), quantas questões, quanto tempo e até quando dá para fazer.' },
}
/** Tipos que o administrador pode escolher na ficha (os automáticos ficam de fora). */
export const TIPOS_MANUAIS: readonly TipoCarta[] = ['nunca_comecou', 'boas_vindas', 'comecando', 'comecou_parou', 'sumiu', 'ativo', 'convite_20', 'convite_50', 'reta_final', 'marco', 'opiniao', 'indicar', 'cronograma', 'acesso_terminou', 'como_estao']
/** Os seis automáticos novos (17/10/2026), disparados por acontecimento, sem SQL novo. */
export const TIPOS_AUTOMATICOS_NOVOS: readonly TipoCarta[] = ['boas_vindas_dia0', 'primeiras_10', 'voltou', 'cronograma_pronto', 'pagamento_aprovado', 'obrigado_tempo']
/**
 * As dez campanhas diárias (nove da parte 31, 18/10/2026, e o lembrete do Simulado Nacional da
 * parte 32, 19/10/2026): o banco escolhe quem recebe
 * (`candidatos_<tipo>`) e o agendador manda pela ação `campanhas_diarias` de enviar-email,
 * pelo mesmo caminho dos automáticos (idempotência por referência, cadência, preferência).
 */
export const TIPOS_CAMPANHAS_DIARIAS: readonly TipoCarta[] = ['assinante_parado_7', 'simulado_resultado', 'vespera_prova', 'depois_prova', 'aniversario', 'um_ano', 'indicacao_deu_certo', 'resumo_do_tema', 'simulado_lembrete']
/** Transacionais: resposta a algo que a pessoa fez ou pagou. Não entram no teto de cadência. */
export const TIPOS_TRANSACIONAIS: readonly string[] = ['pix_hoje', 'pagamento_aprovado', 'obrigado_tempo', 'relato_resolvido', 'alerta_admin']

export interface AreaEstudo { slug: string; total: number; certas: number }

/** Tudo o que o motor sabe da pessoa. Só `respondidas` é obrigatório; o resto some se faltar. */
export interface PerfilCarta {
  nome?: string | null
  respondidas: number
  /** Acertos e erros como a pessoa vê no Desempenho (todas as tentativas). */
  acertos?: number | null
  erros?: number | null
  /** Questões nos últimos 7 dias. */
  semana?: number | null
  /** Dias desde a última resposta (null: nunca respondeu). */
  diasParado?: number | null
  /** Dias desde o cadastro. */
  diasConta?: number | null
  assinante?: boolean
  situacao?: string | null
  ano?: string | null
  provas?: readonly string[] | null
  areas?: readonly AreaEstudo[] | null
  /** Tentativas por hora do dia (Brasília). */
  horas?: ReadonlyArray<{ hora: number; n: number }> | null
  posicaoRanking?: number | null
  sequencia?: number | null
  flashcards?: number | null
  /** Vezes que abriu a página de planos nos últimos 30 dias. */
  viuPlanos?: number | null
  /** O limite diário do gratuito está ligado (aí "sem limite" é benefício real). */
  limiteGratisLigado?: boolean
  // --- Fatos novos (PLANO.md, 17/10/2026). Cada um some se faltar. ---
  /** Resumos da Biblioteca que a pessoa leu: quantos e os títulos (os mais recentes primeiro). */
  resumosLidos?: { total: number; titulos?: readonly string[] | null } | null
  /** Dias até a prova que a pessoa colocou no cronograma. */
  diasParaProva?: number | null
  /** Data da prova do cronograma (ISO) e o nome da prova que ela escolheu ("TEOT", "TARO"...). */
  provaData?: string | null
  provaCronograma?: string | null
  /** Serviço (hospital) e cidade do cadastro, como a pessoa escreveu. */
  servico?: string | null
  cidade?: string | null
  /** Data de nascimento (ISO "AAAA-MM-DD" ou "MM-DD"). */
  nascimento?: string | null
  /** Fim do último acesso pago (ISO), vigente ou já terminado (05/11/2026). */
  fimAcesso?: string | null
  /** O acesso vigente renova sozinho (cartão ligado). */
  renovaSozinho?: boolean
}

/** Um e-mail que a pessoa já recebeu (para não repetir a versão nem o tipo, e para a cadência). */
export interface EnvioAnterior { tipo?: string | null; modelo?: string | null; versao?: string | null; marco?: number | null; em: string; status?: string | null }

export interface OpcoesCarta {
  tipo?: TipoCarta
  /** Para "ativo": força a faixa (senão vem do acerto). */
  faixa?: Faixa
  /** Para "marco": o número (100, 250, 500...). */
  marco?: number
  semente?: number
  anteriores?: readonly EnvioAnterior[]
  site?: string
  hoje?: Date
  /** Lembretes do Pix. */
  pix?: { diasRestantes: number; fimEm: string | null; plano: string | null }
  /** Resumo quinzenal ou mensal. */
  relatorio?: DadosRelatorioCarta
  /** Recibo (pagamento aprovado): plano, período e meio. Nunca o valor. */
  pagamento?: { plano: string | null; inicioEm: string | null; fimEm: string | null; meio?: 'pix' | 'cartao' | null; renovacao?: boolean }
  /** Encerramento (cancelou ou pediu reembolso). */
  encerramento?: { reembolso: boolean; fimEm: string | null }
  /** Campanhas diárias (parte 31): o que o banco sabe do acontecimento. Cada campo some se faltar. */
  campanha?: DadosCampanha
  /** Não recusar pela cadência (prévia no painel, testes). O envio de verdade respeita. */
  ignorarCadencia?: boolean
}

/** Dados de uma campanha diária, como `candidatos_<tipo>` devolve (parte 31). */
export interface DadosCampanha {
  /** Resultado do Simulado Nacional: acertos e total da pessoa; posição só para quem assina (como no site). */
  simulado?: { titulo?: string | null; acertos?: number | null; total?: number | null; posicao?: number | null; participantes?: number | null } | null
  /** Um ano de Orto Questões: quantos anos a conta faz hoje. */
  anos?: number | null
  /** Saiu um resumo do seu tema: o resumo novo e a área. */
  resumo?: { id?: string | null; titulo?: string | null; especialidade?: string | null } | null
  /** Indicação: os dias de cortesia de quem indicou ainda contam (até 12 amigos). */
  cortesia?: boolean | null
  /** Lembrete do Simulado Nacional (parte 32): a edição em que a pessoa se inscreveu. */
  lembrete?: {
    edicao?: string | null; titulo?: string | null; tipo_lembrete?: 'abre_amanha' | 'abriu_hoje' | null
    abre_em?: string | null; fecha_em?: string | null; total?: number | null; duracao_min?: number | null
    /** A edição pede o plano e a pessoa não assina (a carta avisa, sem preço). */
    precisa_plano?: boolean | null
  } | null
}

export interface DadosRelatorioCarta {
  /** Para o assunto: "de 1 a 15 de outubro" ou "de setembro". */
  rotulo: string
  /** No meio da frase: "de 1 a 15 de outubro" ou "em setembro". */
  em: string
  /** Começo de frase: "Entre 1 e 15 de outubro" ou "Em setembro". */
  frase: string
  quinzena: boolean
  respostas: number
  certas: number
  erradas: number
  diasAtivos: number
  respostasAnterior: number
  acertoAnterior: number | null
  totalAcumulado: number
  subiram: Array<{ slug: string; antes: number; agora: number }>
  cairam: Array<{ slug: string; antes: number; agora: number }>
  maisFraco: { slug: string; acerto: number } | null
  simulado: { titulo: string; acertos: number; total: number } | null
}

export interface Carta {
  tipo: TipoCarta
  faixa: Faixa | null
  /** Chave do modelo (tipo, ou "ativo:70-80"), gravada no histórico. */
  modelo: string
  /** Versão sorteada ("ativo:70-80#v3"). */
  versao: string
  assunto: string
  /** Corpo editável: saudação, parágrafos e P.S., sem a assinatura. */
  corpo: string
  /** O que foi usado para personalizar ("melhor área", "ranking"...), para o painel mostrar. */
  personalizacao: string[]
  /** Quantas versões existem para este modelo e quantas a pessoa ainda não recebeu. */
  versoes: { total: number; novas: number }
}

// ---------------------------------------------------------------------------
// Constantes e utilidades
// ---------------------------------------------------------------------------

export const ASSINATURA = 'Um abraço,\nTales, do Orto Questões'
/** TEOT 2027 (a mesma data usada no painel desde 04/10/2026). */
export const DATA_TEOT = '2027-01-10T12:00:00-03:00'
/** Abaixo disso o acerto oscila demais para ser citado. */
export const MINIMO_PARA_ACERTO = 30
/** Regra dos 10: abaixo disso nenhum número de questões aparece ("os primeiros passos"). */
export const MINIMO_PARA_NUMERO = 10
/** Assunto: até 55 caracteres (cabe inteiro no celular). */
export const MAXIMO_ASSUNTO = 55
/** Linhas do corpo (saudação, parágrafos e P.S.): a espinha pedida pelo dono. */
export const LINHAS = { minimo: 6, maximo: 12 } as const
/** Teto de cadência: 1 e-mail a cada 48 h e 3 a cada 14 dias por pessoa. */
export const CADENCIA = { horas: 48, dias: 14, maximoNoPeriodo: 3 } as const
/** Palavras que não entram em assunto (promoção puxa para a aba Promoções). */
export const PALAVRAS_PROMOCAO = ['grátis', 'gratis', 'gratuito', 'oferta', 'desconto', 'aproveite', 'imperdível', 'imperdivel', 'promoção', 'promocao', 'última chance', 'ultima chance', 'urgente', 'compre', 'r$']
const SITE_PADRAO = 'https://ortoquestoes.com.br/'

export const numero = (n: number) => Math.round(n).toLocaleString('pt-BR')
/** "12 questões" (10 ou mais) ou "os primeiros passos". Nunca "0 questões" nem "7 questões". */
export const questoes = (n: number) => (n >= MINIMO_PARA_NUMERO ? `${numero(n)} questões` : 'os primeiros passos')
export const dias = (n: number) => n === 1 ? '1 dia' : `${numero(n)} dias`

/** Nome das áreas para usar no meio da frase: "em mão e punho", "questão de mão". */
export const AREAS: Record<string, { em: string; de: string; sabor: string[] }> = {
  // sabor[0] entra em elogio (melhor área); o último entra em "área mais estudada" e não
  // pode afirmar desempenho, só reconhecer o tema.
  'mao': { em: 'mão e punho', de: 'mão', sabor: ['É uma área cheia de detalhe bonito de anatomia, e a banca adora.', 'Mão é uma área linda, e a banca adora cobrar.', 'Área bem da hora, essa.'] },
  'ombro-cotovelo': { em: 'ombro e cotovelo', de: 'ombro e cotovelo', sabor: ['Ombro tem muita classificação, então isso pesa a seu favor.', 'É um tema que recompensa quem se dedica.'] },
  'quadril': { em: 'quadril', de: 'quadril', sabor: ['Quadril aparece em toda prova, então isso vale muito.', 'Bom tema para ter na ponta da língua.'] },
  'joelho': { em: 'joelho', de: 'joelho', sabor: ['Joelho rende muito na prova, então isso vale ouro.', 'Tema clássico, bom de ter afiado.'] },
  'coluna': { em: 'coluna', de: 'coluna', sabor: ['Coluna assusta muita gente, então ter isso afiado conta muito.', 'Coluna recompensa muito quem se dedica.'] },
  'pe-tornozelo': { em: 'pé e tornozelo', de: 'pé e tornozelo', sabor: ['Pé e tornozelo tem muito epônimo, e você está dominando.', 'Área cheia de detalhe, boa de conhecer a fundo.'] },
  'trauma': { em: 'trauma', de: 'trauma', sabor: ['Trauma é o feijão com arroz da prova, então isso sustenta a nota.', 'Trauma bem estudado sustenta a nota.'] },
  'pediatria': { em: 'ortopedia pediátrica', de: 'ortopedia pediátrica', sabor: ['Pediátrica tem muita classificação, então isso tem muito valor.', 'Área cheia de nome próprio, boa de conhecer a fundo.'] },
  'tumores': { em: 'tumores', de: 'tumor', sabor: ['Tumor assusta muita gente, então isso é ótimo.', 'Tumor é um tema que muita gente evita, e você está encarando.'] },
  'conceitos-basicos': { em: 'conceitos básicos', de: 'conceitos básicos', sabor: ['Base bem feita sustenta todo o resto.'] },
  'osteometabolicas': { em: 'doenças osteometabólicas', de: 'doenças osteometabólicas', sabor: ['Tema pequeno, mas que a banca não esquece.'] },
}

function mulberry32(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
/** Semente estável a partir de um texto (ex.: id da pessoa + referência do envio). */
export function sementeDe(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Primeiro nome com a inicial maiúscula; vazio se parecer e-mail ou lixo. */
export function primeiroNome(nome?: string | null): string {
  const primeiro = (nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}

export function faixaDe(acerto: number): Faixa {
  if (acerto < 10) return '0-10'
  if (acerto < 20) return '10-20'
  if (acerto < 30) return '20-30'
  if (acerto < 40) return '30-40'
  if (acerto < 60) return '40-60'
  if (acerto < 70) return '60-70'
  if (acerto < 80) return '70-80'
  if (acerto < 90) return '80-90'
  return '90-100'
}

/** Acerto citável (inteiro, 0 a 100) ou null se a amostra for pequena. */
export function acertoCitavel(p: PerfilCarta): number | null {
  const a = Number(p.acertos ?? 0), e = Number(p.erros ?? 0)
  if (!(p.respondidas >= MINIMO_PARA_ACERTO) || a + e <= 0 || !Number.isFinite(a) || !Number.isFinite(e)) return null
  return Math.round((100 * a) / (a + e))
}

export function diasAteTeot(hoje = new Date()): number {
  return Math.max(0, Math.ceil((new Date(DATA_TEOT).getTime() - hoje.getTime()) / 86_400_000))
}

/** Marcos comemorados por carta (PLANO.md): 100, 250, 500, 1.000 e 2.000. */
export const MARCOS_CARTA: readonly number[] = [100, 250, 500, 1000, 2000]
/** O marco que a pessoa acabou de passar (folga de 5%, no mínimo 30 questões), se houver. */
export function marcoRecente(respondidas: number, marcos: readonly number[] = MARCOS_CARTA): number | null {
  for (const m of [...marcos].reverse()) if (respondidas >= m && respondidas <= m + Math.max(30, Math.round(m * 0.05))) return m
  return null
}

const diasDesde = (iso: string, hoje: Date) => (hoje.getTime() - new Date(iso).getTime()) / 86_400_000
const familia = (modelo?: string | null) => (modelo ?? '').split(':')[0]
const saiu = (e: EnvioAnterior) => (e.status ?? 'enviado') !== 'falhou'
/** Um envio anterior conta para a cadência? (Transacionais e alertas não.) */
const contaNaCadencia = (e: EnvioAnterior) => saiu(e) && !TIPOS_TRANSACIONAIS.includes(e.tipo ?? '') && !TIPOS_TRANSACIONAIS.includes(familia(e.modelo))

// ---------------------------------------------------------------------------
// Cadência: 1 e-mail a cada 48 h e 3 a cada 14 dias (recibos e confirmação fora)
// ---------------------------------------------------------------------------

/**
 * Devolve o motivo para NÃO escrever agora, ou null quando a cadência permite.
 * Tipos transacionais (Pix termina hoje, pagamento aprovado, obrigado pelo tempo)
 * nunca são bloqueados: são resposta a algo que a pessoa fez.
 */
/**
 * Relatórios de estudo (mensal e quinzenal) não esperam a cadência (Tales, 02/11/2026: "não tá indo"): a pessoa
 * escolheu recebê-los, saem uma vez por período (a trava do banco impede repetir) e quem estuda todo dia
 * quase sempre recebeu outro e-mail nas últimas 48 h, o que adiava o relatório para sempre. Eles continuam
 * contando na cadência das outras cartas.
 */
export const TIPOS_PERIODICOS: readonly string[] = ['relatorio']

export function cadenciaBloqueia(anteriores: readonly EnvioAnterior[] = [], hoje = new Date(), tipo?: TipoCarta | string | null): string | null {
  if (tipo && (TIPOS_TRANSACIONAIS.includes(tipo) || TIPOS_PERIODICOS.includes(tipo))) return null
  const validos = anteriores.filter(contaNaCadencia).filter((e) => Number.isFinite(new Date(e.em).getTime()))
  const ultimo = validos.map((e) => diasDesde(e.em, hoje)).filter((d) => d >= 0).sort((a, b) => a - b)[0]
  if (ultimo !== undefined && ultimo * 24 < CADENCIA.horas) {
    const horas = Math.max(1, Math.ceil(CADENCIA.horas - ultimo * 24))
    return `Cadência: recebeu um e-mail há menos de 48 horas. A próxima carta pode sair em ${horas === 1 ? '1 hora' : `${horas} horas`}.`
  }
  const noPeriodo = validos.filter((e) => { const d = diasDesde(e.em, hoje); return d >= 0 && d <= CADENCIA.dias })
  if (noPeriodo.length >= CADENCIA.maximoNoPeriodo) {
    const maisAntigo = Math.max(...noPeriodo.map((e) => diasDesde(e.em, hoje)))
    const faltam = Math.max(1, Math.ceil(CADENCIA.dias - maisAntigo))
    return `Cadência: já recebeu ${noPeriodo.length} e-mails nos últimos 14 dias. A próxima carta pode sair em ${dias(faltam)}.`
  }
  return null
}

// ---------------------------------------------------------------------------
// Escolha automática do tipo
// ---------------------------------------------------------------------------

export interface Escolha { tipo: TipoCarta; faixa: Faixa | null; marco: number | null; motivo: string; bloqueio: string | null }

/**
 * A situação da pessoa, na ordem em que o dono pensaria: quem nunca começou, quem sumiu, quem parou cedo, marco recém-atingido, reta
 * final, convite (não assinante com mais de 20 ou 50 questões, sem convite nos
 * últimos 30 dias) e, por fim, a carta da faixa de acerto. `bloqueio` traz o
 * motivo quando a cadência não permite escrever agora.
 */
export function escolherTipo(p: PerfilCarta, anteriores: readonly EnvioAnterior[] = [], hoje = new Date()): Escolha {
  const r = Math.max(0, Math.floor(Number(p.respondidas) || 0))
  const parado = p.diasParado ?? null
  const conta = p.diasConta ?? 999
  const recebeu = (f: string, dentroDeDias = Infinity) => anteriores.some((e) => saiu(e) && familia(e.modelo) === f && diasDesde(e.em, hoje) <= dentroDeDias)
  const acerto = acertoCitavel({ ...p, respondidas: r })
  const com = (tipo: TipoCarta, faixa: Faixa | null, marco: number | null, motivo: string): Escolha => ({ tipo, faixa, marco, motivo, bloqueio: cadenciaBloqueia(anteriores, hoje, tipo) })

  if (r === 0) return com('nunca_comecou', null, null, 'Ainda não respondeu nenhuma questão.')
  const fimAcesso = p.fimAcesso ? new Date(p.fimAcesso) : null
  if (!p.assinante && fimAcesso && Number.isFinite(fimAcesso.getTime())) {
    const desde = Math.floor(diasDesde(p.fimAcesso!, hoje))
    if (desde >= 0 && desde <= 30 && !recebeu('acesso_terminou', 60)) return com('acesso_terminou', null, null, `O acesso pago terminou ${desde === 0 ? 'hoje' : desde === 1 ? 'ontem' : `há ${dias(desde)}`} e não foi renovado.`)
  }
  if (parado !== null && parado >= 10) return com('sumiu', null, null, `Sem responder há ${dias(parado)}.`)
  if (r < MINIMO_PARA_ACERTO && parado !== null && parado >= 3) return com('comecou_parou', null, null, `Fez ${questoes(r)} e parou há ${dias(parado)}.`)
  if (r < MINIMO_PARA_ACERTO && conta <= 3) return com('boas_vindas', null, null, 'Chegou há poucos dias e já começou.')
  const marco = marcoRecente(r, MARCOS_CARTA)
  if (marco && !anteriores.some((e) => (e.tipo === 'marco' || familia(e.modelo) === 'marco') && (e.marco ?? null) === marco) && !recebeu('marco', 20)) {
    return com('marco', null, marco, `Acabou de passar de ${numero(marco)} questões.`)
  }
  const provas = p.provas ?? []
  const teot = provas.includes('teot') || (!provas.length && (p.ano === 'r3' || p.situacao === 'r4'))
  const diasProva = p.diasParaProva ?? (teot ? diasAteTeot(hoje) : null)
  if (diasProva !== null && diasProva <= 60 && (teot || p.diasParaProva) && !recebeu('reta_final', 30)) return com('reta_final', null, null, `Faltam ${dias(diasProva)} para a prova.`)
  if (!p.assinante && r > 20 && !recebeu('convite_20', 30) && !recebeu('convite_50', 30)) {
    return r > 50
      ? com('convite_50', acerto === null ? null : faixaDe(acerto), null, `Não assina e já fez ${questoes(r)}.`)
      : com('convite_20', null, null, `Não assina e já fez ${questoes(r)}.`)
  }
  if (acerto === null) return com('comecando', null, null, `Estudando, com ${questoes(r)} (pouco para falar de acerto).`)
  return com('ativo', faixaDe(acerto), null, `Estudando, acerto de ${acerto}% (faixa ${ROTULO_FAIXA[faixaDe(acerto)]}).`)
}

// ---------------------------------------------------------------------------
// Fatos pessoais: cada um só existe se o dado existir e for significativo
// ---------------------------------------------------------------------------

export interface Fatos {
  melhorArea?: { slug: string; pct: number; total: number }
  maisEstudada?: { slug: string; total: number }
  /** Só com 40 questões na área; nunca leva número. */
  areaFraca?: { slug: string; total: number }
  horario?: 'noite' | 'madrugada' | 'manha' | 'almoco' | 'tarde'
  prova?: 'teot' | 'taro' | 'mao' | 'r4' | 'atualizacao'
  etapa?: 'r1' | 'r2' | 'r3' | 'r4' | 'mao' | 'estudante' | 'ortopedista'
  ranking?: number
  sequencia?: number
  flashcards?: number
  semana?: number
  // Novos (17/10/2026)
  resumos?: { total: number; titulo: string | null }
  /** Dias para a prova do cronograma (1 ou mais) e o nome da prova, se ela disse. */
  cronograma?: { dias: number; prova: string | null }
  /** "do Hospital X" / "da Santa Casa" / "do seu serviço" (quando o artigo é ambíguo). */
  servico?: { nome: string; de: string }
  cidade?: string
  aniversario?: 'hoje' | 'perto'
}

/** "do Hospital das Clínicas", "da Santa Casa", ou "do seu serviço" quando o artigo é ambíguo. */
export function servicoComArtigo(nome: string): string {
  const n = nome.trim().replace(/\s+/g, ' ')
  if (!n || n.length > 60 || /[@\d]{3,}/.test(n)) return 'do seu serviço'
  if (/^(hospital|hosp\.?|hc\b|hu\b|hm\b|hgo|hge|hospital geral|instituto|into|centro|complexo|hcfmusp|hupe|hupaa|hb\b)/i.test(n)) return `do ${n}`
  if (/^(santa casa|clínica|clinica|faculdade|universidade|unimed|beneficência|beneficencia|irmandade|fundação|fundacao|maternidade|casa de saúde|casa de saude|rede|aacd)/i.test(n)) return `da ${n}`
  return 'do seu serviço'
}

/** "Hoje" se o aniversário é hoje; "perto" até 3 dias antes; senão null. */
export function aniversarioDe(nascimento: string | null | undefined, hoje: Date): 'hoje' | 'perto' | null {
  const m = (nascimento ?? '').trim().match(/^(?:\d{4}-)?(\d{2})-(\d{2})/)
  if (!m) return null
  const mes = Number(m[1]), dia = Number(m[2])
  if (!(mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31)) return null
  const sp = new Date(hoje.getTime() - 3 * 3600_000)
  const ano = sp.getUTCFullYear()
  const base = Date.UTC(ano, sp.getUTCMonth(), sp.getUTCDate())
  for (const a of [ano, ano + 1]) {
    const d = Math.round((Date.UTC(a, mes - 1, dia) - base) / 86_400_000)
    if (d === 0) return 'hoje'
    if (d > 0 && d <= 3) return 'perto'
  }
  return null
}

export function fatosDe(p: PerfilCarta, hoje = new Date()): Fatos {
  const f: Fatos = {}
  const geral = acertoCitavel(p)
  const areas = (p.areas ?? []).filter((a) => AREAS[a.slug] && a.total > 0 && a.certas >= 0 && a.certas <= a.total)
  const comAcerto = areas.filter((a) => a.total >= 15).map((a) => ({ ...a, pct: Math.round((100 * a.certas) / a.total) }))
  const melhor = [...comAcerto].sort((a, b) => b.pct - a.pct || b.total - a.total)[0]
  if (melhor && melhor.pct >= 70 && (geral === null || melhor.pct >= geral + 5)) f.melhorArea = { slug: melhor.slug, pct: melhor.pct, total: melhor.total }
  // Área a melhorar: só com 40 questões na área e distância clara do geral; nunca leva número.
  const fraca = [...comAcerto].filter((a) => a.total >= 40).sort((a, b) => a.pct - b.pct || b.total - a.total)[0]
  if (fraca && geral !== null && fraca.pct < 60 && fraca.pct <= geral - 10 && fraca.slug !== f.melhorArea?.slug) f.areaFraca = { slug: fraca.slug, total: fraca.total }
  const total = areas.reduce((s, a) => s + a.total, 0)
  const estudada = [...areas].sort((a, b) => b.total - a.total)[0]
  if (estudada && estudada.total >= 25 && total > 0 && estudada.total / total >= 0.35) f.maisEstudada = { slug: estudada.slug, total: estudada.total }

  const horas = (p.horas ?? []).filter((h) => Number.isInteger(h.hora) && h.hora >= 0 && h.hora < 24 && h.n > 0)
  const soma = horas.reduce((s, h) => s + h.n, 0)
  if (soma >= 40) {
    const parte = (de: number, ate: number) => horas.filter((h) => h.hora >= de && h.hora < ate).reduce((s, h) => s + h.n, 0) / soma
    if (parte(0, 5) >= 0.3) f.horario = 'madrugada'
    else if (parte(19, 24) >= 0.5) f.horario = 'noite'
    else if (parte(5, 9) >= 0.45) f.horario = 'manha'
    else if (parte(11, 14) >= 0.45) f.horario = 'almoco'
    else if (parte(14, 19) >= 0.55) f.horario = 'tarde'
  }

  const provas = (p.provas ?? []).filter(Boolean)
  for (const prova of ['teot', 'taro', 'mao', 'r4', 'atualizacao'] as const) if (provas.includes(prova)) { f.prova = prova; break }
  if (p.situacao === 'residente' && (p.ano === 'r1' || p.ano === 'r2' || p.ano === 'r3')) f.etapa = p.ano
  else if (p.situacao === 'r4' || p.situacao === 'mao' || p.situacao === 'estudante' || p.situacao === 'ortopedista') f.etapa = p.situacao

  const pos = Number(p.posicaoRanking)
  if (Number.isInteger(pos) && pos >= 1 && pos <= 100 && p.respondidas >= 50) f.ranking = pos
  const seq = Number(p.sequencia)
  if (Number.isInteger(seq) && seq >= 3) f.sequencia = seq
  const fc = Number(p.flashcards)
  if (Number.isFinite(fc) && fc >= 20) f.flashcards = Math.round(fc)
  const sem = Number(p.semana)
  if (Number.isFinite(sem) && sem >= 30) f.semana = Math.round(sem)

  // Novos fatos. Resumos: a partir de 1 (não é número de questões).
  const rl = p.resumosLidos
  if (rl && Number.isFinite(Number(rl.total)) && Number(rl.total) >= 1) {
    const titulo = (rl.titulos ?? []).map((t) => String(t ?? '').trim()).find((t) => t.length >= 3 && t.length <= 80) ?? null
    f.resumos = { total: Math.round(Number(rl.total)), titulo }
  }
  // Sem o número (null), vale a data da prova do cronograma, quando houver.
  let diasProva = p.diasParaProva === null || p.diasParaProva === undefined ? NaN : Number(p.diasParaProva)
  if (!Number.isFinite(diasProva) && p.provaData) diasProva = Math.ceil((new Date(p.provaData).getTime() - hoje.getTime()) / 86_400_000)
  if (Number.isFinite(diasProva) && diasProva >= 1 && diasProva <= 730) {
    const nome = nomeProvaInformado(p.provaCronograma)
    f.cronograma = { dias: Math.round(diasProva), prova: nome || null }
  }
  const servico = (p.servico ?? '').trim()
  if (servico.length >= 3) f.servico = { nome: servico, de: servicoComArtigo(servico) }
  const cidade = (p.cidade ?? '').trim()
  if (cidade.length >= 3 && cidade.length <= 40 && !/[@\d_]/.test(cidade)) f.cidade = cidade
  const aniv = aniversarioDe(p.nascimento, hoje)
  if (aniv) f.aniversario = aniv
  return f
}

// ---------------------------------------------------------------------------
// Contexto das versões: o que cada versão usa para escrever
// ---------------------------------------------------------------------------

export type Link = 'treinar' | 'revisao' | 'erros' | 'assinatura' | 'cronograma' | 'indicar' | 'flashcards' | 'dados' | 'conta' | 'resumos' | 'desempenho' | 'resumo' | 'simulado'
const ROTAS: Record<Link, string> = {
  treinar: '#/treinar', revisao: '#/revisao', erros: '#/erros', assinatura: '#/assinatura', cronograma: '#/cronograma',
  indicar: '#/indicar', flashcards: '#/flashcards', dados: '#/dados', conta: '#/conta/assinatura', resumos: '#/resumos', desempenho: '#/desempenho',
  // "resumo" abre o resumo da campanha (#/resumos/<id>) quando se sabe qual; senão, a Biblioteca.
  resumo: '#/resumos', simulado: '#/simulado-nacional',
}

export interface Ctx {
  p: PerfilCarta
  tipo: TipoCarta
  faixa: Faixa | null
  /** Primeiro nome ou vazio. */
  nome: string
  r: number
  /** Dá para citar o número de questões (10 ou mais)? Regra dos 10. */
  dez: boolean
  /** "260 questões" ou "os primeiros passos". */
  q: string
  /** Acerto citável ou null (uso interno: faixa). As versões usam `pctBom`. */
  pct: number | null
  /** O acerto só quando é motivo de orgulho (50% ou mais, 30 questões); null abaixo disso e quando a área a melhorar já entrou na carta. */
  readonly pctBom: number | null
  fatos: Fatos
  hoje: Date
  diasTeot: number
  /** Dias para a prova: o cronograma da pessoa, ou o TEOT para quem mira o TEOT; null se não dá para saber. */
  diasProva: number | null
  /** "o TEOT", "o TARO", "a prova da mão", "a seleção do R4" ou "a prova". */
  nomeProva: string
  /** O mesmo, com "de": "do TEOT", "da prova da mão", "da prova". */
  daProva: string
  marco: number | null
  pix?: OpcoesCarta['pix']
  relatorio?: DadosRelatorioCarta
  pagamento?: OpcoesCarta['pagamento']
  encerramento?: OpcoesCarta['encerramento']
  /** Campanhas diárias (parte 31); objeto vazio quando não há. */
  campanha: DadosCampanha
  /** Sorteia um item (ignora null, undefined, false e vazio). */
  um: <T>(...opcoes: Array<T | null | undefined | false | ''>) => T
  /** Verdadeiro com a probabilidade dada. */
  chance: (p: number) => boolean
  /** O link único da carta: guarda a rota e devolve o endereço para pôr no texto. */
  link: (rota: Link) => string
  /** Até k observações pessoais (frases inteiras, no máximo 3), ou null se não houver dado. */
  obs: (k?: number, preferir?: Array<keyof Fatos>) => string | null
  /** Uma observação de um fato específico, se existir. */
  fato: (chave: keyof Fatos) => string | null
  /** Uma frase sobre tempo e praticidade (tema de fundo de toda carta). */
  tempo: () => string
  dica: () => string
  fecho: () => string | null
  /**
   * Compatibilidade com consumidores antigos. O motor atual não gera P.S.
   */
  ps: (corpo?: string) => string
  /** Benefícios reais da assinatura, os mais ligados ao perfil primeiro. */
  beneficios: (k: number, curto?: boolean) => string[]
  /** "há 3 dias", "ontem", "hoje". */
  quando: (diasAtras: number) => string
  area: (slug: string) => { em: string; de: string; sabor: string[] }
  /** A área que a pessoa mais estudou (10 questões ou mais), para "você estava em joelho"; não gasta fato. */
  areaRecente: () => { em: string; de: string; sabor: string[] } | null
  usados: Set<string>
}

/**
 * Frases de cada fato. Várias formas, para não soar como formulário. Tom (docs/emails/TOM.md):
 * elogio honesto e específico; número só quando é motivo de orgulho (`mostrar` é falso quando
 * o acerto geral está abaixo de 50% ou não dá para citar); o tema a melhorar nunca leva número.
 */
function frasesDoFato(chave: keyof Fatos, f: Fatos, mostrar: boolean): string[] {
  const A = (slug: string) => AREAS[slug]
  switch (chave) {
    case 'melhorArea': { const m=f.melhorArea!, a=A(m.slug); return mostrar
      ? [`Seu maior acerto por tema está em ${a.em}, com ${m.pct}%.`, `Em ${a.em}, seu histórico registra ${m.pct}% de acerto em ${questoes(m.total)}.`, `O tema com maior acerto no seu histórico é ${a.de}, com ${m.pct}%.`]
      : [`${a.de.charAt(0).toUpperCase()+a.de.slice(1)} aparece entre os temas já consolidados no seu histórico.`, `Você pode usar os resultados de ${a.de} para orientar a revisão dos próximos temas.`] }
    case 'maisEstudada': { const m=f.maisEstudada!,a=A(m.slug);return [`O tema com mais questões no seu histórico é ${a.de}.`, `Seu histórico reúne ${questoes(m.total)} de ${a.de}.`, `O tema que você mais estudou por aqui foi ${a.de}.`] }
    case 'areaFraca': { const a=A(f.areaFraca!.slug);return [`Uma opção para a próxima revisão é incluir questões de ${a.de}.`, `Você pode selecionar ${a.de} para uma sessão específica de revisão.`, `Os comentários das questões de ${a.de} podem orientar a próxima sessão.`] }
    case 'horario': { const h={noite:'à noite',madrugada:'de madrugada',manha:'pela manhã',almoco:'no horário do almoço',tarde:'à tarde'}[f.horario!];return [`Suas sessões costumam acontecer ${h}.`, `Os registros mostram que você costuma estudar ${h}.`] }
    case 'prova': { const p={teot:'TEOT',taro:'TARO',mao:'cirurgia da mão',r4:'R4',atualizacao:'atualização profissional'}[f.prova!];return [`Seu perfil indica interesse em ${p}.`, `Você informou ${p} entre seus objetivos de estudo.`] }
    case 'etapa': { const e={r1:'R1',r2:'R2',r3:'R3',r4:'R4',mao:'residência de cirurgia da mão',estudante:'graduação',ortopedista:'ortopedista'}[f.etapa!];return [`A etapa informada no seu perfil é ${e}.`, `Seu cadastro está identificado com a etapa ${e}.`] }
    case 'ranking':return [`Sua posição atual no ranking geral é ${f.ranking}ª.`, `Você está na ${f.ranking}ª posição do ranking geral.`]
    case 'sequencia':return [`Sua sequência atual registra ${dias(f.sequencia!)} de estudo.`, `O histórico mostra ${dias(f.sequencia!)} seguidos de estudo.`]
    case 'flashcards':return [`Seu histórico também registra ${numero(f.flashcards!)} flashcards.`, 'Os Flashcards também aparecem entre os recursos que você já utilizou.']
    case 'semana':return [`Na última semana, o histórico registra ${questoes(f.semana!)}.`, `Você respondeu ${questoes(f.semana!)} nos últimos sete dias.`]
    case 'resumos':return f.resumos!.titulo?[`O resumo "${f.resumos!.titulo}" está entre as leituras do seu histórico.`]:['Seu histórico inclui leituras na Biblioteca de resumos.']
    case 'cronograma':return [`Seu cronograma registra ${dias(f.cronograma!.dias)} até ${f.cronograma!.prova || 'a prova informada'}.`]
    case 'servico':return [`Seu cadastro informa o serviço ${f.servico!.nome}.`]
    case 'cidade':return [`A cidade informada no seu cadastro é ${f.cidade}.`]
    case 'aniversario':return ['A data de aniversário informada no seu perfil é hoje.']
  }
}


/** Ordem padrão de interesse dos fatos (o que mais faz a pessoa sentir que foi vista primeiro). */
const ORDEM_FATOS: Array<keyof Fatos> = ['aniversario', 'cronograma', 'melhorArea', 'ranking', 'resumos', 'servico', 'maisEstudada', 'horario', 'prova', 'sequencia', 'semana', 'etapa', 'cidade', 'flashcards', 'areaFraca']
/** No máximo três observações por carta (PLANO.md): a partir da quarta, vira vigilância. */
const MAXIMO_OBS = 3

/** Frases sobre tempo e praticidade: o tema de fundo de toda carta. */
const TEMPO = ['Você pode dividir o estudo em sessões por tema.', 'O histórico permite continuar a sessão de onde você parou.', 'Uma sessão curta pode ser dedicada a um tema e aos comentários das alternativas.']

/** Sugestões concretas de estudo, sem elogios ou cobranças implícitas. */
const DICAS: Record<'baixo' | 'medio' | 'alto', string[]> = {
  baixo: ['Você pode ler o comentário de cada alternativa depois de responder.', 'Os filtros permitem selecionar um tema para a próxima sessão.'],
  medio: ['A Revisão reúne questões do seu histórico para retomar os temas.', 'O Caderno de erros permite refazer questões e consultar os comentários.'],
  alto: ['Você pode combinar provas e temas nos filtros da sessão.', 'Os comentários das alternativas podem complementar a revisão de um tema.'],
}
const FECHOS = ['Se precisar de ajuda com o site, basta responder este e-mail.', 'Pode responder por aqui se encontrar alguma dificuldade.', 'Se tiver alguma dúvida, pode me chamar por aqui.']
/** O fecho não repete o que o texto já disse ("é só responder", "torcendo", "acompanhando"...). */
/** Minúsculas e sem cedilha, para "torço" e "torcida" contarem como a mesma ideia. */
const simples = (t: string) => t.toLowerCase().replace(/ç/g, 'c')

/**
 * Ideias que um P.S. pode carregar. O P.S. é a linha mais humana da carta e não
 * pode repetir o que o corpo já disse ("é só responder. Eu leio tudo" seguido de
 * "se responder, sou eu que leio"). Cada expressão aqui é uma ideia; o P.S. só
 * entra se nenhuma das ideias dele já estiver no corpo.
 */
export const IDEIAS_PS: readonly RegExp[] = [
  /respond/, /\bsono\b|dormir|dormi/, /relat(ar|o)\b/, /dez minutos|no intervalo/, /semana apertar|do jeito que voce deixou|do jeito que você deixou/,
  /comentario das alternativas|comentário das alternativas|alternativas erradas/, /\bcafe\b|\bcafé\b/, /\berrar\b|errar aqui/, /\bcolega\b|estudar junto/,
  /ranking/, /aniversario|aniversário/, /seguidos/, /madrugada/, /a noite|à noite/, /resumo/, /\bservico\b|\bserviço\b|hospital|santa casa/,
  /faltam .{1,12} dias|dias para (o|a) /, /\bfeliz\b/, /torc/, /automatico|automático/, /mantem (o|isto|o site) de pe|mantém (o|isto|o site) de pé/,
  /\bleio\b/, /parab[eé]ns/,
]
/** As ideias (índices em IDEIAS_PS) presentes num texto. */
function ideiasDe(texto: string): Set<number> {
  const t = simples(texto)
  const achadas = new Set<number>()
  IDEIAS_PS.forEach((re, i) => { if (re.test(t)) achadas.add(i) })
  return achadas
}
/** O P.S. repete uma ideia que o corpo já tem? */
export function psRepeteCorpo(ps: string, corpo: string): boolean {
  const doCorpo = ideiasDe(corpo)
  for (const i of ideiasDe(ps.replace(/^P\.S\.:\s*/, ''))) if (doCorpo.has(i)) return true
  return false
}

/**
 * Palavras fortes: duas frases seguidas não podem repetir a mesma ("Vi as 35
 * questões… e fiquei feliz." seguida de "Fico feliz de acompanhar o seu caminho.").
 * O fecho, em especial, não repete a palavra forte da observação anterior.
 */
export const PALAVRAS_FORTES: readonly RegExp[] = [/\bfeliz\b/, /\borgulho\b/, /\bbonit[ao]\b/, /\badmir/, /\btorc/, /\bcarinho\b/, /\bparab[ée]ns\b/, /\bconstancia\b/]
function fortesDe(texto: string): Set<number> {
  const t = simples(texto)
  const achadas = new Set<number>()
  PALAVRAS_FORTES.forEach((re, i) => { if (re.test(t)) achadas.add(i) })
  return achadas
}
/** Frases do texto, na ordem (ponto, exclamação, interrogação ou quebra de linha). */
export function frasesDe(texto: string): string[] {
  return texto.replace(/^P\.S\.:\s*/gm, '').split(/(?<=[.!?])\s+|\n+/).map((f) => f.trim()).filter((f) => f.length > 0)
}
/** Duas frases seguidas com a mesma palavra forte? Devolve a palavra (como texto) ou null. */
export function frasesSeguidasRepetem(texto: string): string | null {
  const frases = frasesDe(texto)
  for (let i = 1; i < frases.length; i++) {
    const comuns = [...fortesDe(frases[i])].filter((k) => fortesDe(frases[i - 1]).has(k))
    if (comuns.length) return PALAVRAS_FORTES[comuns[0]].source.replace(/\\b|\[ao\]/g, '')
  }
  return null
}

function tomDaFaixa(f: Faixa | null): 'baixo' | 'medio' | 'alto' {
  if (!f) return 'baixo'
  return ['0-10', '10-20', '20-30', '30-40'].includes(f) ? 'baixo' : f === '40-60' || f === '60-70' ? 'medio' : 'alto'
}

const NOME_PROVA: Record<NonNullable<Fatos['prova']>, string> = { teot: 'o TEOT', taro: 'o TARO', mao: 'a prova da mão', r4: 'a seleção do R4', atualizacao: 'a prova' }

function criarCtx(p: PerfilCarta, tipo: TipoCarta, faixa: Faixa | null, marco: number | null, rnd: () => number, op: OpcoesCarta, estado: { link: string | null }): Ctx {
  const hoje = op.hoje ?? new Date()
  const site = (op.site ?? SITE_PADRAO).replace(/\/*$/, '/')
  const pct = acertoCitavel(p)
  // Abaixo de 50% (ou sem amostra), nenhum número de acerto aparece: só esforço e constância.
  const pctBomValor = pct !== null && pct >= 50 ? pct : null
  const fatos = fatosDe(p, hoje)
  const usados = new Set<string>()
  const r = Math.max(0, Math.floor(Number(p.respondidas) || 0))
  const um = <T,>(...opcoes: Array<T | null | undefined | false | ''>): T => {
    const validas = opcoes.filter((o): o is T => o !== null && o !== undefined && o !== false && o !== '')
    return validas[Math.floor(rnd() * validas.length)]
  }
  const mostrarAcerto = () => pctBomValor !== null && !usados.has('areaFraca')
  /** Observações pessoais já usadas (o acerto não conta como observação). */
  const nObs = () => [...usados].filter((u) => u !== 'acerto').length
  const fato = (chave: keyof Fatos): string | null => {
    if (fatos[chave] === undefined || usados.has(chave) || nObs() >= MAXIMO_OBS) return null
    // Melhor área e área mais estudada no mesmo tema soariam repetidas: fica só uma.
    if ((chave === 'maisEstudada' && usados.has('melhorArea') || chave === 'melhorArea' && usados.has('maisEstudada')) && fatos.melhorArea?.slug === fatos.maisEstudada?.slug) return null
    // Acerto e área a melhorar nunca na mesma carta.
    if (chave === 'areaFraca' && usados.has('acerto')) return null
    const comNumero = mostrarAcerto()
    const frases = frasesDoFato(chave, fatos, comNumero)
    if (!frases.length) return null
    usados.add(chave)
    if (chave === 'melhorArea' && comNumero) usados.add('acerto')
    return frases[Math.floor(rnd() * frases.length)]
  }
  const teot = fatos.prova === 'teot' || (!fatos.prova && (fatos.etapa === 'r3' || fatos.etapa === 'r4'))
  const diasProva = fatos.cronograma?.dias ?? (teot ? diasAteTeot(hoje) : null)
  const nomeProva = p.provaData || p.provaCronograma ? provaComArtigo(p.provaCronograma) : fatos.prova ? NOME_PROVA[fatos.prova] : teot ? 'o TEOT' : 'a sua prova'
  const ctx: Ctx = {
    p, tipo, faixa, nome: primeiroNome(p.nome), r, dez: r >= MINIMO_PARA_NUMERO, q: questoes(r), pct,
    get pctBom() { if (!mostrarAcerto()) return null; usados.add('acerto'); return pctBomValor },
    fatos, hoje, diasTeot: diasAteTeot(hoje), diasProva, nomeProva, daProva: nomeProva.replace(/^o /, 'do ').replace(/^a /, 'da '), marco, pix: op.pix, relatorio: op.relatorio, pagamento: op.pagamento, encerramento: op.encerramento, campanha: op.campanha ?? {}, usados,
    um, chance: (x) => rnd() < x,
    link: (rota) => {
      estado.link = rota
      const id = op.campanha?.resumo?.id
      const caminho = rota === 'resumo' && typeof id === 'string' && /^[a-z0-9-]{3,80}$/.test(id) ? `#/resumos/${id}` : ROTAS[rota]
      return (site + caminho).replace(/^https?:\/\//, '')
    },
    fato,
    obs: (k = 1, preferir = []) => {
      const limite = Math.min(MAXIMO_OBS, Math.max(1, k))
      const ordem = [...preferir, ...ORDEM_FATOS.filter((c) => !preferir.includes(c))]
        .filter((c) => fatos[c] !== undefined && !usados.has(c))
      // Um pouco de sorte na ordem, mas os preferidos e os mais pessoais vêm na frente.
      const escolhidos: Array<keyof Fatos> = []
      for (const c of ordem) { if (escolhidos.length >= limite) break; if (rnd() < 0.8 || ordem.length - ordem.indexOf(c) <= limite - escolhidos.length) escolhidos.push(c) }
      const frases = escolhidos.map((c) => fato(c)).filter((x): x is string => !!x)
      return frases.length ? frases.join(' ') : null
    },
    tempo: () => um(...TEMPO),
    dica: () => um(...DICAS[tomDaFaixa(faixa)]),
    // "Torço pela sua aprovação" só para quem tem prova pela frente.
    fecho: () => (rnd() < 0.15 ? null : um(...FECHOS.filter((f) => !(f.includes('aprovação') && (fatos.prova === 'atualizacao' || fatos.etapa === 'ortopedista'))))),
    ps: () => '',
    beneficios: (k, curto = false) => {
      // [como item de lista, curto para o meio da frase, peso pelo perfil]
      const lista: Array<[string, string, number]> = [
        ['o cronograma até a prova: você diz a data e a lista de cada dia já está pronta quando você senta, com o que mais cai primeiro; se a semana apertar, ele se ajusta sozinho', 'o cronograma até a prova', fatos.prova || fatos.etapa || fatos.cronograma ? 10 : 6],
        ['o Simulado Nacional todo mês, com a sua posição', 'o Simulado Nacional do mês', fatos.ranking ? 9 : 5],
        ['os temas que mais caem em cada área e como a turma respondeu cada alternativa', 'os temas que mais caem', fatos.areaFraca ? 9 : 4],
        ['o Resumão, com o que cai em uma frase por assunto', 'o Resumão da reta final', (diasProva ?? 999) <= 90 ? 7 : 3],
        ['a Biblioteca de resumos inteira, cada resumo saído de um capítulo de livro e com as questões reais no meio do texto', 'a Biblioteca de resumos', fatos.resumos ? 9 : 4],
        ['a liga da residência e o relatório do mês', 'a liga da residência', fatos.etapa && fatos.etapa.startsWith('r') ? 4 : 2],
      ]
      if (p.limiteGratisLigado) {
        const t = fatos.flashcards ? 'questões e flashcards sem limite diário' : 'questões sem limite diário'
        lista.push([t, t, fatos.flashcards || (fatos.semana ?? 0) >= 100 ? 11 : 6])
      }
      return lista.map(([longo, breve, peso]) => [curto ? breve : longo, peso + rnd() * 2] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, k).map(([t]) => t)
    },
    quando: (d) => d <= 0 ? 'hoje' : d === 1 ? 'ontem' : d < 60 ? `há ${dias(d)}` : 'há alguns meses',
    area: (slug) => AREAS[slug],
    areaRecente: () => {
      const a = [...(p.areas ?? [])].filter((x) => AREAS[x.slug] && x.total >= MINIMO_PARA_NUMERO).sort((x, y) => y.total - x.total)[0]
      return a ? AREAS[a.slug] : null
    },
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Geração
// ---------------------------------------------------------------------------

const SAUDACOES_NOME = ['{n}, tudo bem?', 'Oi, {n}, tudo bem?', 'Olá, {n}, tudo bem?', '{n}, tudo bem por aí?', 'Oi, {n}, espero que esteja tudo bem por aí.']
const SAUDACOES = ['Oi, tudo bem?', 'Olá, tudo bem?', 'Tudo bem por aí?', 'Oi, espero que esteja tudo bem por aí.']

export function modeloDe(tipo: TipoCarta, faixa: Faixa | null): string {
  return tipo === 'ativo' && faixa ? `ativo:${faixa}` : tipo
}

/** Quantas versões completas existem para um modelo. */
export function versoesDe(tipo: TipoCarta, faixa: Faixa | null): readonly Versao[] {
  return VERSOES[modeloDe(tipo, faixa)] ?? []
}

/** Linhas não vazias do corpo (saudação, parágrafos, itens e P.S.). */
export function contarLinhas(corpo: string): number {
  return corpo.split('\n').filter((l) => l.trim() !== '').length
}
export function contarPS(corpo: string): number {
  return (corpo.match(/(^|\n)\s*P\.S\.:/g) ?? []).length
}

/** Confere o texto final: nada de buraco nem número zerado nem número pequeno de questões. Devolve o problema ou null. */
export function problemaNoTexto(texto: string): string | null {
  if (/\bundefined\b|\bnull\b|\bNaN\b|\[object/i.test(texto)) return 'valor vazio no texto'
  if (/(^|[^\d.,])0 (questões|questão|dias|dia)\b/.test(texto)) return 'número zerado'
  if (/(^|[^\d.,])[0-9] (questões|questão)\b/.test(texto)) return 'número de questões abaixo de 10'
  if (/\{[a-z]+\}/i.test(texto)) return 'marcador sem preencher'
  if (/R\$\s?\d/.test(texto)) return 'preço no texto'
  if (/ ,|,,|(?<!\.)\.\.(?!\.)| \.(?!\w)/.test(texto)) return 'pontuação quebrada'
  return null
}
export function problemaNoAssunto(assunto: string): string | null {
  const minusculo = assunto.toLocaleLowerCase('pt-BR')
  if (!assunto.trim()) return 'assunto vazio'
  if (assunto.length > MAXIMO_ASSUNTO) return 'assunto longo'
  if (PALAVRAS_PROMOCAO.some((p) => minusculo.includes(p))) return 'palavra de promoção'
  if (/[!]{1}|[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}/.test(assunto.replace(/TEOT|TARO|ENARE/g, ''))) return 'grito no assunto'
  if (/\p{Extended_Pictographic}/u.test(assunto)) return 'emoji no assunto'
  return problemaNoTexto(assunto)
}

/**
 * A situação combina com a pessoa? (Ninguém recebe "você ainda não respondeu nenhuma"
 * com 300 questões, nem convite ou carta de faixa sem ter respondido nada.)
 */
export function tipoCombina(tipo: TipoCarta, p: PerfilCarta): boolean {
  const r = Math.max(0, Math.floor(Number(p.respondidas) || 0))
  switch (tipo) {
    case 'nunca_comecou': return r === 0
    case 'ativo': return acertoCitavel(p) !== null
    case 'marco': return r >= 100
    case 'primeiras_10': return r >= MINIMO_PARA_NUMERO
    case 'boas_vindas': case 'comecando': case 'comecou_parou': case 'pausa': case 'sumiu': case 'convite_20': case 'convite_50': case 'voltou': case 'assinante_parado_7': return r > 0
    // Pela ficha, sem a data do fim: "terminou há pouco". A tela Prontas só escolhe estas com o dado certo.
    case 'acesso_terminou': return !p.assinante && r > 0
    case 'como_estao': return r > 0
    default: return true
  }
}

/**
 * Escreve a carta. Sem `tipo`, escolhe sozinho (escolherTipo). Sorteia uma versão
 * que a pessoa ainda não recebeu; se todas já foram, volta a sortear entre todas.
 * Recusa (erro "cadencia_bloqueada: ...") quando a cadência não permite, a menos
 * que `ignorarCadencia` seja verdadeiro ou o tipo seja transacional.
 */
export function gerarCarta(p: PerfilCarta, op: OpcoesCarta = {}): Carta {
  const hoje = op.hoje ?? new Date()
  const anteriores = op.anteriores ?? []
  const auto = escolherTipo(p, anteriores, hoje)
  const tipo = op.tipo ?? auto.tipo
  const minimoLinhas = 3
  if (!tipoCombina(tipo, p)) throw new Error(`tipo_nao_combina_${tipo}`)
  if (!op.ignorarCadencia) {
    const bloqueio = cadenciaBloqueia(anteriores, hoje, tipo)
    if (bloqueio) throw new Error(`cadencia_bloqueada: ${bloqueio}`)
  }
  const acerto = acertoCitavel(p)
  let faixa: Faixa | null = op.faixa ?? (tipo === auto.tipo ? auto.faixa : null) ?? (acerto !== null ? faixaDe(acerto) : null)
  if (tipo === 'ativo' && !faixa) faixa = '40-60'
  const marco = tipo === 'marco' ? (op.marco ?? auto.marco ?? marcoRecente(p.respondidas) ?? ([...MARCOS_CARTA].reverse().find((m) => p.respondidas >= m) ?? 100)) : null
  const modelo = modeloDe(tipo, faixa)
  const todas = VERSOES[modelo]
  if (!todas?.length) throw new Error(`sem_versoes_para_${modelo}`)
  const jaRecebidas = new Set(anteriores.filter(saiu).map((e) => e.versao).filter(Boolean))
  const semente = (op.semente ?? Math.floor(Math.random() * 2 ** 31)) >>> 0

  // Algumas tentativas: uma versão pode exigir dado que a pessoa não tem (ex.: ranking),
  // ou sair fora da espinha (linhas, P.S., link, assunto).
  for (let tentativa = 0; tentativa < 80; tentativa++) {
    const rnd = mulberry32(semente + tentativa * 7919)
    const estado = { link: null as string | null }
    const ctx = criarCtx(p, tipo, faixa, marco, rnd, op, estado)
    const possiveis = todas.filter((v) => !v.requer || v.requer(ctx))
    if (!possiveis.length) continue
    const novas = possiveis.filter((v) => !jaRecebidas.has(`${modelo}#${v.id}`))
    const lista = novas.length ? novas : possiveis
    const v = lista[Math.floor(rnd() * lista.length)]
    const brutos = v.corpo(ctx).filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
    const saudacao = v.saudacao ? v.saudacao(ctx) : ctx.nome ? ctx.um(...SAUDACOES_NOME).replace('{n}', ctx.nome) : ctx.um(...SAUDACOES)
    // Nenhuma mensagem gerada recebe P.S., fecho ou preenchimento do motor.
    const semPS = brutos.filter((x) => !/^P\.S\.:/.test(x))
    const assuntos = v.assuntos(ctx).filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()).filter((a) => !problemaNoAssunto(a))
    const assunto = assuntos[Math.floor(rnd() * assuntos.length)]
    const corpo = [saudacao, ...semPS].join('\n\n')
    const linhas = contarLinhas(corpo)
    if (!assunto || problemaNoTexto(corpo) || contarLinks(corpo) > 1 || contarPS(corpo) !== 0 || linhas < minimoLinhas || linhas > LINHAS.maximo) continue
    // Duas frases seguidas com a mesma palavra forte ou um P.S. que repete o corpo: sorteia de novo.
    if (frasesSeguidasRepetem(corpo)) continue
    return {
      tipo, faixa: tipo === 'ativo' || tipo === 'convite_50' ? faixa : null, modelo, versao: `${modelo}#${v.id}`, assunto, corpo,
      personalizacao: [...ctx.usados].map((c) => ROTULO_FATO[c as keyof Fatos] ?? (c === 'acerto' ? 'acerto' : c)),
      versoes: { total: todas.length, novas: todas.filter((x) => !jaRecebidas.has(`${modelo}#${x.id}`)).length },
    }
  }
  throw new Error(`nao_foi_possivel_escrever_${modelo}`)
}

export const ROTULO_FATO: Record<keyof Fatos, string> = {
  melhorArea: 'melhor área', maisEstudada: 'área mais estudada', areaFraca: 'área a melhorar', horario: 'horário de estudo',
  prova: 'prova de interesse', etapa: 'etapa', ranking: 'posição no ranking', sequencia: 'sequência de dias', flashcards: 'flashcards', semana: 'ritmo da semana',
  resumos: 'resumos lidos', cronograma: 'dias para a prova', servico: 'serviço', cidade: 'cidade', aniversario: 'aniversário',
}

// ---------------------------------------------------------------------------
// Renderização: o único lugar que monta o e-mail que sai
// ---------------------------------------------------------------------------

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const RE_LINK = /\b(?:https?:\/\/)?(?:www\.)?ortoquestoes\.com\.br\/?[^\s<>"')]*[^\s<>"').,;:!?]|\bhttps?:\/\/[^\s<>"')]+[^\s<>"').,;:!?]/g
export function contarLinks(texto: string): number {
  return (texto.match(RE_LINK) ?? []).length
}

/** Tira uma assinatura colada à mão no fim do texto (a fixa entra sempre). */
function semAssinatura(corpo: string): string {
  return corpo.replace(/\s*(?:um abraço|abraço|abraços)[,.!]?\s*\n+\s*tales[^\n]*\s*$/i, '').replace(/\s+$/, '')
}

export interface CartaPronta { assunto: string; html: string; texto: string }

/**
 * Carta → e-mail. HTML mínimo (parágrafos, sem imagem, sem cor de marca, sem
 * botão) e a parte de texto equivalente. Envios em lote e automáticos passam
 * `descadastro`: entra uma linha discreta no fim (o cabeçalho List-Unsubscribe
 * fica por conta de quem envia). O P.S., quando existe, fica depois da assinatura,
 * como numa carta de verdade.
 */
export function renderizarCarta(c: { assunto: string; corpo: string; descadastro?: string | null; textoDescadastro?: string }): CartaPronta {
  const corpo = semAssinatura(c.corpo.replace(/\r\n/g, '\n').trim())
  const todos = corpo.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)
  const paragrafos = todos.filter((x) => !/^P\.S\.:/.test(x))
  const ps = todos.filter((x) => /^P\.S\.:/.test(x))
  const assinatura = ASSINATURA.split('\n')
  const avisoSair = c.textoDescadastro ?? 'Se preferir não receber mais estas mensagens'
  const rodape = c.descadastro ? `${avisoSair}: ${c.descadastro}` : ''
  const comLink = (t: string) => esc(t).replace(RE_LINK, (url) => {
    const href = /^https?:\/\//.test(url) ? url : `https://${url}`
    return `<a href="${href}" style="color:#1a5fb4;">${url}</a>`
  })
  const p = (html: string, estilo = '') => `<p style="margin:0 0 14px 0;${estilo}">${html}</p>`
  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(c.assunto)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;padding:16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222222;">
${paragrafos.map((t) => p(comLink(t).replace(/\n/g, '<br>'))).join('\n')}
${p(assinatura.map(esc).join('<br>'))}
${ps.map((t) => p(comLink(t).replace(/\n/g, '<br>'))).join('\n')}
${c.descadastro ? p(`${esc(avisoSair)}, <a href="${esc(c.descadastro)}" style="color:#888888;">é só clicar aqui</a>.`, 'margin-top:28px;font-size:12px;line-height:1.4;color:#888888;') : ''}
</div>
</body>
</html>`
  const texto = [...paragrafos, assinatura.join('\n'), ...ps, ...(rodape ? ['--', rodape] : [])].join('\n\n')
  return { assunto: c.assunto.trim(), html, texto }
}

/** Só o que nunca pode sair num e-mail editado à mão: buraco de dado ou marcador sem preencher. */
export function problemaGrave(texto: string): string | null {
  if (/\bundefined\b|\bNaN\b|\[object/i.test(texto)) return 'valor vazio no texto'
  if (/\{[a-z]+\}/i.test(texto)) return 'marcador sem preencher'
  return null
}

// ---------------------------------------------------------------------------
// Dados do banco (parte 27: dados_cartas_interno) → perfil do motor
// ---------------------------------------------------------------------------

/** Um envio do histórico, como o banco devolve. */
export interface EnvioHistorico extends EnvioAnterior { assunto?: string | null; erro?: string | null; origem?: string | null }

/**
 * O que perfil_carta_admin, listar_cartas_admin e dados_carta_usuario devolvem por pessoa.
 * Os campos marcados "parte 31" só vêm depois que a parte 31 é colada; antes, somem.
 */
export interface DadosCartaBanco {
  email?: string | null
  nome?: string | null
  criado_em?: string | null
  confirmado?: boolean
  novidades?: boolean
  administrador?: boolean
  quer_cartas?: boolean
  assinante?: boolean
  plano?: string | null
  respondidas?: number | null
  acertos?: number | null
  erros?: number | null
  semana?: number | null
  ultima_atividade?: string | null
  dias_parado?: number | null
  dias_conta?: number | null
  situacao?: string | null
  ano?: string | null
  servico?: string | null
  provas?: string[] | null
  areas?: AreaEstudo[] | null
  horas?: Array<{ hora: number; n: number }> | null
  posicao_ranking?: number | null
  sequencia?: number | null
  flashcards?: number | null
  viu_planos?: number | null
  emails?: { ultimo_em: string | null; n7: number; n30: number; lista: EnvioHistorico[]; antigos?: EnvioAnterior[] } | null
  // Parte 31 (18/10/2026): devolvidos por dados_cartas_interno depois que a parte 31 é colada.
  cidade?: string | null
  nascimento?: string | null
  resumos_lidos?: number | null
  resumos_titulos?: string[] | null
  dias_para_prova?: number | null
  data_prova?: string | null
  prova_cronograma?: string | null
  ultimo_login?: string | null
  // 05/11/2026 (listar_sugestoes_cartas_admin): o último acesso pago e se ele renova sozinho.
  fim_acesso?: string | null
  renova_sozinho?: boolean | null
}

export function perfilDosDados(d: DadosCartaBanco, limiteGratisLigado = false): PerfilCarta {
  const num = (v: unknown) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v))
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const resumos = num(d.resumos_lidos)
  return {
    nome: d.nome ?? null,
    respondidas: num(d.respondidas) ?? 0,
    acertos: num(d.acertos), erros: num(d.erros), semana: num(d.semana),
    diasParado: num(d.dias_parado), diasConta: num(d.dias_conta),
    assinante: !!d.assinante,
    situacao: d.situacao ?? null, ano: d.ano ?? null,
    provas: Array.isArray(d.provas) ? d.provas.map(String) : [],
    areas: Array.isArray(d.areas) ? d.areas.map((a) => ({ slug: String(a.slug), total: Number(a.total) || 0, certas: Number(a.certas) || 0 })) : [],
    horas: Array.isArray(d.horas) ? d.horas.map((h) => ({ hora: Number(h.hora), n: Number(h.n) || 0 })) : [],
    posicaoRanking: num(d.posicao_ranking), sequencia: num(d.sequencia), flashcards: num(d.flashcards), viuPlanos: num(d.viu_planos),
    limiteGratisLigado,
    servico: texto(d.servico), cidade: texto(d.cidade), nascimento: texto(d.nascimento),
    resumosLidos: resumos !== null && resumos > 0 ? { total: resumos, titulos: Array.isArray(d.resumos_titulos) ? d.resumos_titulos.map(String) : [] } : null,
    diasParaProva: num(d.dias_para_prova), provaData: texto(d.data_prova), provaCronograma: texto(d.prova_cronograma),
    fimAcesso: texto(d.fim_acesso), renovaSozinho: !!d.renova_sozinho,
  }
}

/** Todos os envios conhecidos da pessoa (os 15 últimos e os mais antigos com versão). */
export function anterioresDosDados(d: DadosCartaBanco): EnvioAnterior[] {
  return [...(d.emails?.lista ?? []), ...(d.emails?.antigos ?? [])]
}

/**
 * Cartas do Tales: o motor dos e-mails pessoais do Orto Questões (15/10/2026;
 * reescrito em 17/10/2026 conforme docs/emails/PLANO.md).
 *
 * Pedido do dono: e-mail com cara de e-mail de um amigo que já passou pela
 * residência, só texto, sem logo, sempre assinado "Um abraço, / Tales, do Orto
 * Questões", que faça a pessoa pensar "ele reparou em mim". Este arquivo é puro
 * (sem Deno, sem rede, sem React): o painel usa para escolher e prever a carta,
 * e a Edge Function usa o MESMO código para montar o e-mail que sai. Assim a
 * prévia do painel é exatamente o que chega.
 *
 * Como funciona:
 *  1. `escolherTipo` olha os dados da pessoa e decide a situação (nunca começou,
 *     começou e parou, sumiu, ativa numa faixa de acerto, assinante, convite...)
 *     e diz se a cadência permite escrever agora (`bloqueio`).
 *  2. `gerarCarta` sorteia uma das versões escritas para essa situação (5 a 7 por
 *     situação e faixa) e preenche os blocos trocáveis (saudação, observações
 *     pessoais, frase sobre tempo, dica, fecho, P.S.), evitando a versão que a
 *     pessoa já recebeu. Garante a espinha da carta: 6 a 12 linhas, exatamente um
 *     P.S., no máximo um link, assunto com até 55 caracteres.
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
  | 'pix_3_dias' | 'pix_hoje' | 'relatorio'
  // Novos em 17/10/2026 (sem SQL): disparados por um acontecimento no site ou no pagamento.
  | 'boas_vindas_dia0' | 'primeiras_10' | 'voltou' | 'cronograma_pronto' | 'pagamento_aprovado' | 'obrigado_tempo'
  // Parte 31 (18/10/2026): as campanhas diárias, escolhidas pelo banco (candidatos_<tipo>) e mandadas pelo agendador.
  | 'assinou_sem_cronograma' | 'assinante_parado_7' | 'simulado_resultado' | 'vespera_prova' | 'depois_prova'
  | 'aniversario' | 'um_ano' | 'indicacao_deu_certo' | 'resumo_do_tema'
  // Parte 32 (19/10/2026): o lembrete de quem se inscreveu no Simulado Nacional (candidatos_simulado_lembrete).
  | 'simulado_lembrete'

export interface InfoTipo { rotulo: string; descricao: string; grupo: 'situacao' | 'convite' | 'pessoal' | 'automatico' }
export const TIPOS: Record<TipoCarta, InfoTipo> = {
  nunca_comecou: { grupo: 'situacao', rotulo: 'Criou a conta e não começou', descricao: 'O que eu faria nos primeiros dez minutos; sem número.' },
  boas_vindas: { grupo: 'situacao', rotulo: 'Boas-vindas', descricao: 'Chegou nos últimos 3 dias e já respondeu algumas questões.' },
  comecando: { grupo: 'situacao', rotulo: 'Começando', descricao: 'Ativo, com menos de 30 questões: pergunta como está sendo e dá uma ideia prática.' },
  comecou_parou: { grupo: 'situacao', rotulo: 'Começou e parou', descricao: 'Menos de 30 questões e alguns dias sem aparecer. Sem culpa; a Revisão como volta leve.' },
  pausa: { grupo: 'automatico', rotulo: 'Pausa curta (3 a 6 dias)', descricao: 'Lembrete automático: cita a área que a pessoa estava estudando e a Revisão.' },
  sumiu: { grupo: 'situacao', rotulo: 'Sumiu', descricao: 'Respondia e está há 10 dias ou mais sem aparecer. "Lembrei de você", com a melhor área.' },
  ativo: { grupo: 'situacao', rotulo: 'Estudando (pela faixa de acerto)', descricao: 'Uma voz para cada faixa de acerto, com o que a pessoa tem de especial.' },
  obrigado_assinatura: { grupo: 'pessoal', rotulo: 'Obrigado pela assinatura', descricao: 'Agradecimento e o que fazer nos primeiros dez minutos: montar o cronograma.' },
  convite_20: { grupo: 'convite', rotulo: 'Convite para assinar (mais de 20 questões)', descricao: 'Leve: o que o plano faz pela rotina, a garantia, sem preço.' },
  convite_50: { grupo: 'convite', rotulo: 'Convite pessoal (mais de 50 questões)', descricao: 'Dias para a prova, área forte, o cronograma como horas devolvidas; garantia.' },
  reta_final: { grupo: 'situacao', rotulo: 'Reta final', descricao: 'A prova está chegando: dormir é estudar, modo prova, revisão.' },
  marco: { grupo: 'situacao', rotulo: 'Marco de questões (100, 250, 500, 1.000, 2.000)', descricao: 'O que o número significa em horas e dias.' },
  opiniao: { grupo: 'pessoal', rotulo: 'Pedir opinião', descricao: 'Três perguntas concretas.' },
  indicar: { grupo: 'pessoal', rotulo: 'Pedir para indicar', descricao: '"Quem você conhece que está nessa?"; os 7 dias para os dois.' },
  cronograma: { grupo: 'pessoal', rotulo: 'Apresentar o cronograma', descricao: 'Quando ele devolve tempo.' },
  pix_3_dias: { grupo: 'automatico', rotulo: 'Pix: faltam 3 dias', descricao: 'Automático: o acesso pago no Pix está acabando. Nada se perde; sem urgência.' },
  pix_hoje: { grupo: 'automatico', rotulo: 'Pix: termina hoje', descricao: 'Automático: último dia do acesso pago no Pix. Transacional.' },
  relatorio: { grupo: 'automatico', rotulo: 'Resumo de estudo', descricao: 'Automático: a quinzena ou o mês contados como uma história.' },
  boas_vindas_dia0: { grupo: 'automatico', rotulo: 'Boas-vindas no dia da confirmação', descricao: 'Primeiro login depois de confirmar o e-mail: quem eu sou e o que fazer nos primeiros dez minutos.' },
  primeiras_10: { grupo: 'automatico', rotulo: 'Primeiras 10 questões', descricao: 'Ao passar de 10 questões: o hábito começou.' },
  voltou: { grupo: 'automatico', rotulo: 'Que bom te ver de volta', descricao: 'Primeiro login depois de 10 dias ou mais fora.' },
  cronograma_pronto: { grupo: 'automatico', rotulo: 'Cronograma pronto', descricao: 'No dia em que a pessoa monta o plano até a prova.' },
  pagamento_aprovado: { grupo: 'automatico', rotulo: 'Pagamento aprovado', descricao: 'Recibo gentil: plano, período, o que libera, link do cronograma. Transacional.' },
  obrigado_tempo: { grupo: 'automatico', rotulo: 'Obrigado pelo tempo de assinatura', descricao: 'Cancelou ou pediu reembolso: porta aberta, sem cobrança.' },
  assinou_sem_cronograma: { grupo: 'automatico', rotulo: 'Assinou e não montou o cronograma', descricao: 'Três dias depois de assinar, sem plano: o cronograma como as horas que o plano devolve.' },
  assinante_parado_7: { grupo: 'automatico', rotulo: 'Assinante parado há 7 dias', descricao: 'Assina e está há uma semana sem responder: sem culpa, a Revisão e o cronograma que se ajusta.' },
  simulado_resultado: { grupo: 'automatico', rotulo: 'Resultado do Simulado Nacional', descricao: 'Quando a edição fecha: obrigado por ter feito, o que o resultado mostra e o que fazer com ele.' },
  vespera_prova: { grupo: 'automatico', rotulo: 'Véspera da prova', descricao: 'Na véspera da data do cronograma: dormir é estudar, nada de matéria nova, torcida.' },
  depois_prova: { grupo: 'automatico', rotulo: 'Depois da prova: como foi?', descricao: 'De 1 a 3 dias depois da data do cronograma: pergunta como foi, sem presumir o resultado.' },
  aniversario: { grupo: 'automatico', rotulo: 'Aniversário', descricao: 'No dia do aniversário (data de nascimento do cadastro): curta, sem convite.' },
  um_ano: { grupo: 'automatico', rotulo: 'Um ano de Orto Questões', descricao: 'No dia em que a conta faz um ano (ou mais): o caminho até aqui, sem convite.' },
  indicacao_deu_certo: { grupo: 'automatico', rotulo: 'Sua indicação deu certo', descricao: 'Quem a pessoa indicou chegou a 20 questões: obrigado pela confiança.' },
  resumo_do_tema: { grupo: 'automatico', rotulo: 'Saiu um resumo do seu tema', descricao: 'Semanal, só para quem aceitou novidades: um resumo novo na área que a pessoa mais estuda.' },
  simulado_lembrete: { grupo: 'automatico', rotulo: 'Lembrete do Simulado Nacional', descricao: 'Para quem se inscreveu: a edição abre amanhã (ou abriu hoje), quantas questões, quanto tempo e até quando dá para fazer.' },
}
/** Tipos que o administrador pode escolher na ficha (os automáticos ficam de fora). */
export const TIPOS_MANUAIS: readonly TipoCarta[] = ['nunca_comecou', 'boas_vindas', 'comecando', 'comecou_parou', 'sumiu', 'ativo', 'obrigado_assinatura', 'convite_20', 'convite_50', 'reta_final', 'marco', 'opiniao', 'indicar', 'cronograma']
/** Os seis automáticos novos (17/10/2026), disparados por acontecimento, sem SQL novo. */
export const TIPOS_AUTOMATICOS_NOVOS: readonly TipoCarta[] = ['boas_vindas_dia0', 'primeiras_10', 'voltou', 'cronograma_pronto', 'pagamento_aprovado', 'obrigado_tempo']
/**
 * As dez campanhas diárias (nove da parte 31, 18/10/2026, e o lembrete do Simulado Nacional da
 * parte 32, 19/10/2026): o banco escolhe quem recebe
 * (`candidatos_<tipo>`) e o agendador manda pela ação `campanhas_diarias` de enviar-email,
 * pelo mesmo caminho dos automáticos (idempotência por referência, cadência, preferência).
 */
export const TIPOS_CAMPANHAS_DIARIAS: readonly TipoCarta[] = ['assinou_sem_cronograma', 'assinante_parado_7', 'simulado_resultado', 'vespera_prova', 'depois_prova', 'aniversario', 'um_ano', 'indicacao_deu_certo', 'resumo_do_tema', 'simulado_lembrete']
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
export function cadenciaBloqueia(anteriores: readonly EnvioAnterior[] = [], hoje = new Date(), tipo?: TipoCarta | string | null): string | null {
  if (tipo && TIPOS_TRANSACIONAIS.includes(tipo)) return null
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
 * A situação da pessoa, na ordem em que o dono pensaria: quem nunca começou, quem
 * acabou de assinar, quem sumiu, quem parou cedo, marco recém-atingido, reta
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
  if (p.assinante && !recebeu('obrigado_assinatura') && !recebeu('pagamento_aprovado', 30)) return com('obrigado_assinatura', null, null, 'Assina e ainda não recebeu o agradecimento.')
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
    const nome = (p.provaCronograma ?? '').trim()
    f.cronograma = { dias: Math.round(diasProva), prova: nome && nome.length <= 30 && !/[@\d_]/.test(nome) ? nome : null }
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
   * O P.S., sempre presente: a linha mais humana da carta. Com `corpo` (o texto já
   * escrito), evita um P.S. que repita uma ideia que o corpo já tem (psRepeteCorpo).
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
    case 'melhorArea': {
      const m = f.melhorArea!, a = A(m.slug)
      return mostrar
        ? [
            `Reparei que ${a.em} é o seu ponto mais forte, com ${m.pct}% de acerto. Isso não aparece por acaso.`,
            `Reparei que ${a.em} virou o seu ponto forte, com ${m.pct}% de acerto em ${questoes(m.total)}. É fruto de questão feita com atenção, e nada disso se perde.`,
            `Em ${a.em} você está voando: ${m.pct}% de acerto. ${a.sabor[0]}`,
            `Seu melhor tema hoje é ${a.em}, com ${m.pct}%. Dá gosto de ver, porque isso é de quem senta e faz.`,
          ]
        : [
            `Vi que ${a.em} já virou um ponto forte seu. ${a.sabor[0]}`,
            `Reparei que ${a.em} é o tema em que você mais brilha. Fiquei feliz de ver.`,
            `Em ${a.em} você já está mandando muito bem, e isso diz muito sobre o jeito como você estuda.`,
          ]
    }
    case 'maisEstudada': {
      const m = f.maisEstudada!, a = A(m.slug)
      return [
        `Vi que ${a.em} é o tema a que você mais tem se dedicado: ${questoes(m.total)} até agora. ${a.sabor[a.sabor.length - 1]}`,
        `Reparei que tem bastante questão de ${a.de} no seu histórico. ${a.sabor[a.sabor.length - 1]}`,
        `${a.de.charAt(0).toUpperCase() + a.de.slice(1)} parece ser a sua praia por aqui: já são ${questoes(m.total)}.`,
      ]
    }
    case 'areaFraca': {
      const a = A(f.areaFraca!.slug)
      return [
        `Se fosse escolher um tema para as próximas semanas, eu iria em ${a.em}: é onde cada sessão vai render mais para você agora. Dez questões por semana já mudam o quadro.`,
        `Reparei que ${a.em} é o tema com mais espaço para crescer no seu caso, e isso é uma boa notícia: é ali que os pontos vêm mais rápido. Dez questões por semana bastam.`,
        `Um palpite de quem olhou o seu estudo com carinho: dez questões de ${a.de} por semana podem fazer uma bela diferença nas próximas semanas.`,
      ]
    }
    case 'horario':
      return {
        noite: ['Vi que você estuda quase sempre à noite. É uma rotina pesada: o dia inteiro no hospital e o estudo esperando no fim dele.', 'Reparei que quase tudo seu sai à noite, quando o dia já acabou. Sei o que isso custa, e admiro.', 'Vi que a noite é o seu horário de estudo. Respeito demais quem encontra esse tempo depois de um dia inteiro.'],
        madrugada: ['Vi que muita questão sua sai de madrugada, provavelmente no plantão. Admiro a dedicação, e peço com carinho que cuide do sono também.', 'Reparei que você estuda até de madrugada. Peço com carinho: lembre que o sono também é estudo.'],
        manha: ['Reparei que você gosta de estudar cedo, antes de o dia começar. É um jeito bonito de proteger o estudo da rotina.', 'Vi que você estuda bastante de manhã cedo, antes de o hospital te engolir. Admiro essa disciplina.'],
        almoco: ['Vi que muita questão sua sai na hora do almoço. Que jeito esperto de encaixar o estudo no único intervalo do dia.', 'Reparei que você aproveita o horário do almoço para estudar. Isso é usar bem o pouco tempo que a residência deixa.'],
        tarde: ['Vi que você costuma estudar à tarde, num ritmo bem constante.', 'Reparei que a tarde é o seu horário de questões. Gosto de ver essa rotina.'],
      }[f.horario!]
    case 'prova':
      return {
        teot: ['Vi que o TEOT está no seu horizonte, e fico na torcida.', 'Sei que o seu foco é o TEOT, e penso nisso quando olho o seu estudo.'],
        taro: ['Vi que você está se preparando para o TARO, e fico na torcida.', 'Sei que o TARO está no seu radar.'],
        mao: ['Vi que você está se preparando para a prova da cirurgia da mão.', 'Sei que a prova da mão está no seu radar, e fico na torcida.'],
        r4: ['Vi que você está mirando o R4.', 'Sei que a seleção do R4 está no seu radar, e fico na torcida.'],
        atualizacao: ['Vi que você estuda para se manter em dia, sem prova marcada. Acho isso muito bonito.', 'Gosto muito de ver gente estudando sem prova marcada, só pelo prazer de se manter em dia.'],
      }[f.prova!]
    case 'etapa':
      return {
        r1: ['Sei que o R1 é um ano de muita novidade e pouco tempo, e mesmo assim você está aqui.', 'O R1 é o ano de aprender a sobreviver ao hospital. Estudar no meio disso tem muito valor.'],
        r2: ['Sei que o R2 costuma ser o ano mais puxado de plantão, e mesmo assim você encontra tempo.', 'Estudar no meio do R2 não é pouca coisa, e você está fazendo.'],
        r3: ['O R3 é o ano do TEOT, e sei como ele pesa. Cada questão agora conta muito.', 'Sei que o R3 é um ano intenso, com a prova no fim dele.'],
        r4: ['Na subespecialidade, o detalhe faz toda a diferença.', 'Estudar no R4 é escolher ir além, e eu admiro isso.'],
        mao: ['Residência de mão pede muito detalhe, e você está encarando com vontade.', 'Na mão, o detalhe é tudo, e dá para ver que você sabe disso.'],
        estudante: ['Estudar ortopedia ainda na graduação é sair na frente.', 'Fico feliz de ver gente da graduação estudando ortopedia com tanta seriedade.'],
        ortopedista: ['Admiro muito quem segue estudando depois da residência.', 'É bonito ver quem já terminou a residência mantendo o estudo em dia.'],
      }[f.etapa!]
    case 'ranking': {
      const n = f.ranking!
      return n <= 10
        ? [`Você está em ${n}º no ranking geral, entre os dez primeiros. Que orgulho.`, `${n}º lugar no ranking geral. Isso é muito estudo, e fiquei feliz de ver.`]
        : [`Parabéns pela ${n}ª posição no ranking geral.`, `Vi que você está em ${n}º no ranking geral, e fiquei feliz de ver o seu nome lá.`]
    }
    case 'sequencia':
      return [`São ${dias(f.sequencia!)} seguidos estudando. Que constância bonita.`, `Sua sequência está em ${dias(f.sequencia!)}, e isso diz muito sobre você.`]
    case 'flashcards':
      return ['Vi que você também está usando os flashcards, que bom.', `Vi que você já passou por ${numero(f.flashcards!)} flashcards também.`]
    case 'semana':
      return [`Só nos últimos sete dias foram ${questoes(f.semana!)}. Que dedicação.`, `Vi as ${questoes(f.semana!)} desta última semana, e fiquei feliz.`]
    case 'resumos': {
      const r = f.resumos!
      if (r.total === 1) return r.titulo ? [`Vi que você leu o resumo "${r.titulo}" na Biblioteca. Ler o resumo e depois fazer as questões do tema é o jeito mais rápido de fixar.`] : ['Vi que você já leu um resumo da Biblioteca. Resumo e questão do mesmo tema, na mesma sessão, é a combinação que mais rende.']
      return [
        r.titulo ? `Vi que você já leu ${numero(r.total)} resumos da Biblioteca, entre eles "${r.titulo}". Resumo e questão do mesmo tema, na mesma sessão, é a combinação que mais rende.` : `Vi que você já leu ${numero(r.total)} resumos da Biblioteca. Resumo e questão do mesmo tema, na mesma sessão, é a combinação que mais rende.`,
        `Reparei nos ${numero(r.total)} resumos que você já leu na Biblioteca. Quem lê o resumo antes das questões costuma sentir o estudo render mais rápido.`,
      ]
    }
    case 'cronograma': {
      const c = f.cronograma!, prova = c.prova ? `o ${c.prova}` : 'a sua prova'
      return [
        `Vi no seu cronograma que faltam ${dias(c.dias)} para ${prova}. Dá tempo de muita coisa, ainda mais com a lista de cada dia já pronta.`,
        `Pelo seu cronograma, ${prova} está a ${dias(c.dias)}. Gosto de saber disso quando te escrevo: muda o que vale sugerir.`,
      ]
    }
    case 'servico':
      return [`Vi que você é ${f.servico!.de}. Manda um abraço para o pessoal de lá.`, `Reparei que você está ${f.servico!.de}. Deve ser corrido por lá, e mesmo assim você encontra tempo para estudar.`]
    case 'cidade':
      return [`Vi que você estuda a partir de ${f.cidade}. Que bom ter alguém de lá por aqui.`, `Reparei que você escreve de ${f.cidade}. Um abraço para a cidade.`]
    case 'aniversario':
      return f.aniversario === 'hoje'
        ? ['E hoje é o seu aniversário. Parabéns, de coração. Que o ano que começa traga a aprovação e, antes dela, dias mais leves.']
        : ['Vi que o seu aniversário está chegando. Deixo o parabéns adiantado, com carinho.']
  }
  return []
}

/** Ordem padrão de interesse dos fatos (o que mais faz a pessoa sentir que foi vista primeiro). */
const ORDEM_FATOS: Array<keyof Fatos> = ['aniversario', 'cronograma', 'melhorArea', 'ranking', 'resumos', 'servico', 'maisEstudada', 'horario', 'prova', 'sequencia', 'semana', 'etapa', 'cidade', 'flashcards', 'areaFraca']
/** No máximo três observações por carta (PLANO.md): a partir da quarta, vira vigilância. */
const MAXIMO_OBS = 3

/** Frases sobre tempo e praticidade: o tema de fundo de toda carta. */
const TEMPO = [
  'Dez minutos no intervalo já contam. Não precisa ser uma sessão grande para valer.',
  'Você senta e estuda; o site decide o resto. Esse foi o combinado desde o começo.',
  'Trinta minutos num horário fixo valem mais que duas horas espalhadas pelo fim de semana.',
  'Estudar fácil, para mim, é abrir e já saber o que fazer. O resto é desculpa que o cansaço inventa.',
  'O tempo que a gente mais perde não é estudando, é decidindo o que estudar. Deixar essa decisão pronta devolve uns quinze minutos por dia.',
  'Cinco questões no ônibus, cinco no café, cinco antes de dormir. No fim da semana, isso vira um estudo de verdade.',
  'A lista do dia já pronta quando você sai da cirurgia: é isso que faz o estudo caber numa rotina de hospital.',
  'Pouco e todo dia rende mais do que muito de vez em quando. A memória gosta de repetição, não de maratona.',
  'Se a semana apertar, tudo bem. O site fica do jeito que você deixou, e a Revisão guarda o que precisa de uma segunda olhada.',
  'O segredo de quem passa com a rotina cheia não é estudar mais horas, é não desperdiçar as poucas que tem.',
]

/** Dicas oferecidas como presente ("um truque", "se ajudar"), nunca como ordem. */
const DICAS: Record<'baixo' | 'medio' | 'alto', string[]> = {
  baixo: [
    'Um truque que ajuda muita gente: antes de olhar as alternativas, tente responder de cabeça. É um ótimo treino para o raciocínio de prova.',
    'Uma coisa que costuma fazer diferença: ler também o comentário das alternativas que não são a resposta. É ali que a banca esconde as pegadinhas.',
    'Se ajudar: cinco questões por dia, com calma, costumam render mais do que trinta de uma vez no domingo.',
    'Uma ideia que funciona bem: quando uma questão te pegar, marque como favorita e volte nela no dia seguinte. É impressionante como ela fica.',
    'Uma estratégia simples: antes de escolher a certa, descarte as que você tem certeza de que não são. A questão fica bem mais leve.',
  ],
  medio: [
    'Que tal começar cada sessão pela Revisão do dia? São as questões que pedem uma segunda olhada, voltando no momento certo.',
    'Uma ideia: abrir o Caderno de erros uma vez por semana e refazer as que ainda incomodam. Rende muito.',
    'Quando acertar com dúvida, vale ler o comentário como se tivesse errado. Assim o acerto vira certeza.',
    'Alguns dias dedicados ao tema que mais te desafia costumam render muito, se fizer sentido para você.',
    'Um truque de prova: ler o enunciado até o fim antes de olhar as alternativas. A banca adora esconder coisa na última linha.',
  ],
  alto: [
    'Nesse nível, vale ler o comentário mesmo quando acerta. Às vezes ele traz um detalhe que a banca ainda vai cobrar.',
    'Uma ideia: misturar provas e temas na mesma sessão. Obriga a reconhecer o assunto sem pista, como no dia da prova.',
    'Uma lembrança gentil: matéria bem sabida também esfria se ficar parada, então a Revisão em dia protege o que você conquistou.',
    'As questões que voltam a te pegar uma segunda vez são as mais valiosas da sua lista. Vale dar um carinho especial a elas.',
    'Um detalhe de prova: o "exceto" e o "incorreta" no enunciado. É ali que até quem sabe muito ainda deixa escapar um ponto.',
  ],
}
const FECHOS = ['Se não for a hora, tudo bem também. Eu continuo por aqui.', 'Se eu puder ajudar em qualquer coisa, é só responder este e-mail.', 'Estou torcendo por você.', 'Conte comigo no que precisar.', 'Fico feliz de acompanhar o seu caminho.', 'Torço muito pela sua aprovação.', 'Bons estudos por aí, e cuide-se.', 'Vai dar certo. E eu estou por aqui.']
/** O fecho não repete o que o texto já disse ("é só responder", "torcendo", "acompanhando"...). */
const CHAVES_FECHO = ['respond', 'torc', 'acompanh', 'conte comigo', 'bons estudos', 'não for a hora', 'por aqui']
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
function repetemForte(a: string, b: string): boolean {
  const deA = fortesDe(a)
  for (const i of fortesDe(b)) if (deA.has(i)) return true
  return false
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

/** P.S. genéricos, humanos, para quando nenhum fato sobra. */
const PS_HUMANOS = [
  'P.S.: se responder este e-mail, sou eu que leio. Pode escrever.',
  'P.S.: cuida do sono. Ele conta como estudo, e ninguém avisa isso na residência.',
  'P.S.: se encontrar algo estranho numa questão, tem um botão para relatar. Eu leio cada relato.',
  'P.S.: dez minutos no intervalo já contam. Não precisa esperar um dia livre para estudar.',
  'P.S.: se a semana apertar, tudo bem. O site fica do jeito que você deixou.',
  'P.S.: se quiser me contar como está sendo a rotina, é só responder. Gosto de saber.',
  'P.S.: a parte do site em que eu mais caprichei foi o comentário das alternativas erradas. Vale ler até o fim.',
  'P.S.: toma um café por mim antes da próxima sessão.',
  'P.S.: errar aqui é barato. É na prova que custa. Aproveita que aqui é treino.',
  'P.S.: se tiver um colega estudando para a mesma prova, estudar junto deixa tudo mais leve.',
  'P.S.: dormir bem na véspera de um dia cheio também é estudar. Eu demorei a aprender isso.',
  'P.S.: não precisa responder, mas se responder eu fico feliz.',
]

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
  const nomeProva = fatos.cronograma?.prova && !/[@\d_]/.test(fatos.cronograma.prova) ? `o ${fatos.cronograma.prova}` : fatos.prova ? NOME_PROVA[fatos.prova] : teot ? 'o TEOT' : 'a prova'
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
    ps: (corpo = '') => {
      const candidatos: Array<[string | null, string]> = []
      if (fatos.aniversario && !usados.has('aniversario')) candidatos.push(['aniversario', fatos.aniversario === 'hoje' ? 'P.S.: e parabéns pelo aniversário. Que o ano que começa traga a aprovação e dias mais leves.' : 'P.S.: vi que o seu aniversário está chegando. Deixo o parabéns adiantado, com carinho.'])
      if (fatos.ranking && !usados.has('ranking')) candidatos.push(['ranking', `P.S.: vi que você está em ${fatos.ranking}º no ranking geral. Fiquei feliz de ver o seu nome lá.`])
      if (fatos.sequencia && !usados.has('sequencia')) candidatos.push(['sequencia', `P.S.: ${dias(fatos.sequencia)} seguidos de estudo. Que constância bonita.`])
      if (fatos.horario === 'madrugada' && !usados.has('horario')) candidatos.push(['horario', 'P.S.: vi que você estuda até de madrugada. Admiro muito, e peço com carinho: cuide do sono também, que a memória agradece.'])
      if (fatos.horario === 'noite' && !usados.has('horario')) candidatos.push(['horario', 'P.S.: vi que você estuda bastante à noite. Admiro muito quem encontra tempo depois de um dia inteiro.'])
      if (fatos.cronograma && !usados.has('cronograma')) candidatos.push(['cronograma', fatos.cronograma.dias >= 60 ? `P.S.: ${dias(fatos.cronograma.dias)} é bastante tempo. Cuida do sono nas próximas semanas, que ele conta como estudo.` : `P.S.: faltam ${dias(fatos.cronograma.dias)} para ${fatos.cronograma.prova ? `o ${fatos.cronograma.prova}` : 'a sua prova'}. Estou na torcida.`])
      if (fatos.servico && !usados.has('servico')) candidatos.push(['servico', `P.S.: um abraço para o pessoal ${fatos.servico.de}.`])
      if (fatos.melhorArea && !usados.has('melhorArea')) {
        const em = AREAS[fatos.melhorArea.slug].em
        candidatos.push(['melhorArea', mostrarAcerto() ? `P.S.: ${em} com ${fatos.melhorArea.pct}% de acerto. Parabéns, de verdade.` : `P.S.: ${em} está ficando muito forte no seu estudo. Parabéns, de verdade.`])
      }
      if (fatos.resumos && !usados.has('resumos')) candidatos.push(['resumos', fatos.resumos.titulo ? `P.S.: vi que você leu "${fatos.resumos.titulo}" na Biblioteca. Fazer as questões do tema logo depois é o que mais fixa.` : 'P.S.: vi que você anda lendo os resumos da Biblioteca. Fazer as questões do tema logo depois é o que mais fixa.'])
      // Nenhum P.S. repete uma ideia que o corpo já disse ("é só responder" duas vezes).
      const novos = candidatos.filter(([, texto]) => !psRepeteCorpo(texto, corpo))
      const humanos = PS_HUMANOS.filter((texto) => !psRepeteCorpo(texto, corpo))
      // Metade das vezes, um fato (se ainda couber uma observação); senão, um P.S. humano.
      if (novos.length && nObs() < MAXIMO_OBS && rnd() < 0.5) {
        const [chave, texto] = novos[Math.floor(rnd() * novos.length)]
        if (chave) { usados.add(chave); if (chave === 'melhorArea' && mostrarAcerto()) usados.add('acerto') }
        return texto
      }
      return um(...(humanos.length ? humanos : PS_HUMANOS))
    },
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

/**
 * Os fechos do corpo: nenhum repete o que o texto já disse ("é só responder", "torcendo",
 * "acompanhando") nem a palavra forte do parágrafo vizinho ("fiquei feliz" / "Fico feliz").
 * Quando o fecho sorteado pela versão quebra uma das regras, outro fecho entra no lugar;
 * se nenhum servir, a carta segue sem ele.
 */
function ajustarFechos(brutos: string[], rnd: () => number, fatos: Fatos): string[] {
  // "Torço pela sua aprovação" só para quem tem prova pela frente (como em ctx.fecho).
  const semProva = fatos.prova === 'atualizacao' || fatos.etapa === 'ortopedista'
  const repeteChave = (fecho: string, outros: string[]) => {
    const chave = CHAVES_FECHO.find((k) => simples(fecho).includes(k))
    return !!chave && outros.some((y) => simples(y).includes(chave))
  }
  const resultado: string[] = []
  brutos.forEach((x, i) => {
    if (!FECHOS.includes(x)) { resultado.push(x); return }
    const outros = brutos.filter((_, j) => j !== i)
    const vizinhos = [brutos[i - 1], brutos[i + 1]].filter((y): y is string => !!y && !FECHOS.includes(y))
    const serve = (f: string) => !repeteChave(f, outros) && !vizinhos.some((y) => repetemForte(y, f))
    if (serve(x)) { resultado.push(x); return }
    const alternativas = FECHOS.filter((f) => f !== x && serve(f) && !(semProva && f.includes('aprovação')))
    if (alternativas.length) resultado.push(alternativas[Math.floor(rnd() * alternativas.length)])
  })
  return resultado
}

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
    const paragrafos = ajustarFechos(brutos, rnd, ctx.fatos)
    const saudacao = v.saudacao ? v.saudacao(ctx) : ctx.nome ? ctx.um(...SAUDACOES_NOME).replace('{n}', ctx.nome) : ctx.um(...SAUDACOES)
    // P.S. em toda carta: o da versão, ou um do motor quando a versão não escreveu o seu.
    let ps = paragrafos.find((x) => /^P\.S\.:/.test(x)) ?? null
    const semPS = paragrafos.filter((x) => !/^P\.S\.:/.test(x))
    // A espinha pede de 6 a 12 linhas: completa com uma frase sobre tempo ou um fecho quando faltar.
    const linhasDe = (lista: string[]) => contarLinhas([saudacao, ...lista, ps ?? 'P.S.: x'].join('\n\n'))
    const reforcos = [() => ctx.tempo(), () => ctx.fecho(), () => ctx.dica()]
    for (const reforco of reforcos) {
      if (linhasDe(semPS) >= LINHAS.minimo) break
      const extra = reforco()
      // O fecho acrescentado não repete a palavra forte do parágrafo anterior ("fiquei feliz" / "Fico feliz").
      if (extra && !semPS.includes(extra) && !(FECHOS.includes(extra) && semPS.length && repetemForte(semPS[semPS.length - 1], extra))) semPS.push(extra)
    }
    // O P.S. não repete uma ideia que o corpo já tem: o da versão cede ao do motor quando repete.
    const textoCorpo = [saudacao, ...semPS].join('\n\n')
    if (!ps) ps = v.ps ? v.ps(ctx) : null
    if (!ps || psRepeteCorpo(ps, textoCorpo)) ps = ctx.ps(textoCorpo)
    const assuntos = v.assuntos(ctx).filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()).filter((a) => !problemaNoAssunto(a))
    const assunto = assuntos[Math.floor(rnd() * assuntos.length)]
    const corpo = [saudacao, ...semPS, ps].join('\n\n')
    const linhas = contarLinhas(corpo)
    if (!assunto || problemaNoTexto(corpo) || contarLinks(corpo) > 1 || contarPS(corpo) !== 1 || linhas < LINHAS.minimo || linhas > LINHAS.maximo) continue
    // Duas frases seguidas com a mesma palavra forte ou um P.S. que repete o corpo: sorteia de novo.
    if (frasesSeguidasRepetem(corpo) || psRepeteCorpo(ps, textoCorpo)) continue
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
  }
}

/** Todos os envios conhecidos da pessoa (os 15 últimos e os mais antigos com versão). */
export function anterioresDosDados(d: DadosCartaBanco): EnvioAnterior[] {
  return [...(d.emails?.lista ?? []), ...(d.emails?.antigos ?? [])]
}

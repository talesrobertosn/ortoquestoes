/**
 * Cartas do Tales: o motor dos e-mails pessoais do Orto Questões (15/10/2026).
 *
 * Pedido do dono: e-mail com cara de e-mail de amigo, só texto, sem logo, sempre
 * assinado "Um abraço, / Tales, do Orto Questões", que faça a pessoa pensar "ele
 * reparou em mim". Este arquivo é puro (sem Deno, sem rede, sem React): o painel
 * usa para escolher e prever a carta, e a Edge Function usa o MESMO código para
 * montar o e-mail que sai. Assim a prévia do painel é exatamente o que chega.
 *
 * Como funciona:
 *  1. `escolherTipo` olha os dados da pessoa e decide a situação (nunca começou,
 *     começou e parou, sumiu, ativa numa faixa de acerto, assinante, convite...).
 *  2. `gerarCarta` sorteia uma das versões escritas para essa situação (5 a 8 por
 *     situação e faixa) e preenche os blocos trocáveis (saudação, observações
 *     pessoais, dica, fecho, P.S.), evitando a versão que a pessoa já recebeu.
 *  3. `renderizarCarta` transforma o texto em HTML mínimo + texto simples, com a
 *     assinatura fixa. É a única função que monta o e-mail final.
 *
 * Regras que o teste (fixtures/testar_modelos_email.mjs) confere: nunca "0 questões",
 * "undefined", "null" ou "NaN"; plural certo; acerto só com amostra suficiente;
 * frases pessoais só com dado que existe; assunto sem palavra de promoção; no
 * máximo um link no corpo; nenhum preço.
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

export interface InfoTipo { rotulo: string; descricao: string; grupo: 'situacao' | 'convite' | 'pessoal' | 'automatico' }
export const TIPOS: Record<TipoCarta, InfoTipo> = {
  nunca_comecou: { grupo: 'situacao', rotulo: 'Criou a conta e não começou', descricao: 'Parabeniza o primeiro passo e sugere um começo bem pequeno.' },
  boas_vindas: { grupo: 'situacao', rotulo: 'Boas-vindas', descricao: 'Chegou nos últimos 3 dias e já respondeu algumas questões.' },
  comecando: { grupo: 'situacao', rotulo: 'Começando', descricao: 'Ativo, com menos de 30 questões: incentiva o hábito, sem falar em acerto.' },
  comecou_parou: { grupo: 'situacao', rotulo: 'Começou e parou', descricao: 'Menos de 30 questões e alguns dias sem aparecer.' },
  pausa: { grupo: 'automatico', rotulo: 'Pausa curta (3 a 6 dias)', descricao: 'Lembrete automático de quem sumiu há poucos dias.' },
  sumiu: { grupo: 'situacao', rotulo: 'Sumiu', descricao: 'Respondia e está há 10 dias ou mais sem aparecer.' },
  ativo: { grupo: 'situacao', rotulo: 'Estudando (pela faixa de acerto)', descricao: 'Um tom para cada faixa de acerto, com o que a pessoa tem de especial.' },
  obrigado_assinatura: { grupo: 'pessoal', rotulo: 'Obrigado pela assinatura', descricao: 'Agradecimento humano para quem assinou.' },
  convite_20: { grupo: 'convite', rotulo: 'Convite para assinar (mais de 20 questões)', descricao: 'Curto e organizado: o que a assinatura libera, sem preço e sem pressão.' },
  convite_50: { grupo: 'convite', rotulo: 'Convite pessoal (mais de 50 questões)', descricao: 'Mais pessoal: cita o que a pessoa tem de especial e liga a assinatura ao momento dela.' },
  reta_final: { grupo: 'situacao', rotulo: 'Reta final', descricao: 'A prova está chegando: o que priorizar.' },
  marco: { grupo: 'situacao', rotulo: 'Marco de questões (100, 500, 1.000...)', descricao: 'Parabéns por passar de um marco.' },
  opiniao: { grupo: 'pessoal', rotulo: 'Pedir opinião', descricao: 'Pergunta o que está bom e o que falta.' },
  indicar: { grupo: 'pessoal', rotulo: 'Pedir para indicar', descricao: 'Conta do Indique e ganhe (7 dias para os dois).' },
  cronograma: { grupo: 'pessoal', rotulo: 'Apresentar o cronograma', descricao: 'Mostra o cronograma até a prova (a prévia é aberta).' },
  pix_3_dias: { grupo: 'automatico', rotulo: 'Pix: faltam 3 dias', descricao: 'Automático: o acesso pago no Pix está acabando.' },
  pix_hoje: { grupo: 'automatico', rotulo: 'Pix: termina hoje', descricao: 'Automático: último dia do acesso pago no Pix.' },
  relatorio: { grupo: 'automatico', rotulo: 'Resumo de estudo', descricao: 'Automático: o resumo da quinzena ou do mês, em forma de carta.' },
}
/** Tipos que o administrador pode escolher na ficha (os automáticos ficam de fora). */
export const TIPOS_MANUAIS: readonly TipoCarta[] = ['nunca_comecou', 'boas_vindas', 'comecando', 'comecou_parou', 'sumiu', 'ativo', 'obrigado_assinatura', 'convite_20', 'convite_50', 'reta_final', 'marco', 'opiniao', 'indicar', 'cronograma']

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
}

/** Um e-mail que a pessoa já recebeu (para não repetir a versão nem o tipo). */
export interface EnvioAnterior { tipo?: string | null; modelo?: string | null; versao?: string | null; marco?: number | null; em: string; status?: string | null }

export interface OpcoesCarta {
  tipo?: TipoCarta
  /** Para "ativo": força a faixa (senão vem do acerto). */
  faixa?: Faixa
  /** Para "marco": o número (100, 500, 1000...). */
  marco?: number
  semente?: number
  anteriores?: readonly EnvioAnterior[]
  site?: string
  hoje?: Date
  /** Lembretes do Pix. */
  pix?: { diasRestantes: number; fimEm: string | null; plano: string | null }
  /** Resumo quinzenal ou mensal. */
  relatorio?: DadosRelatorioCarta
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
/** Palavras que não entram em assunto (promoção puxa para a aba Promoções). */
export const PALAVRAS_PROMOCAO = ['grátis', 'gratis', 'gratuito', 'oferta', 'desconto', 'aproveite', 'imperdível', 'imperdivel', 'promoção', 'promocao', 'última chance', 'ultima chance', 'urgente', 'compre', 'r$']
const SITE_PADRAO = 'https://ortoquestoes.com.br/'

export const numero = (n: number) => Math.round(n).toLocaleString('pt-BR')
/** "1 questão", "12 questões". Zero nunca vira número: quem chama não deve pedir. */
export const questoes = (n: number) => n === 1 ? '1 questão' : `${numero(n)} questões`
export const dias = (n: number) => n === 1 ? '1 dia' : `${numero(n)} dias`

/** Nome das áreas para usar no meio da frase: "em mão e punho", "questão de mão". */
export const AREAS: Record<string, { em: string; de: string; sabor: string[] }> = {
  'mao': { em: 'mão e punho', de: 'mão', sabor: ['É uma área bem da hora, cheia de detalhe bonito de anatomia.', 'Mão é uma área linda, e a banca adora cobrar.', 'Área bem da hora, essa.'] },
  'ombro-cotovelo': { em: 'ombro e cotovelo', de: 'ombro e cotovelo', sabor: ['Ombro tem muita classificação, então isso pesa a favor.', 'É um tema que recompensa quem insiste.'] },
  'quadril': { em: 'quadril', de: 'quadril', sabor: ['Quadril é um tema que aparece em toda prova.', 'Bom tema para ter na ponta da língua.'] },
  'joelho': { em: 'joelho', de: 'joelho', sabor: ['Joelho é daqueles temas que rendem muito na prova.', 'Tema clássico, bom de ter afiado.'] },
  'coluna': { em: 'coluna', de: 'coluna', sabor: ['Coluna assusta muita gente, então ter isso afiado conta.', 'Tema que costuma separar quem estudou de quem não estudou.'] },
  'pe-tornozelo': { em: 'pé e tornozelo', de: 'pé e tornozelo', sabor: ['Pé e tornozelo tem muito epônimo, e você está encarando.', 'Área cheia de detalhe, boa de dominar.'] },
  'trauma': { em: 'trauma', de: 'trauma', sabor: ['Trauma é o feijão com arroz da prova.', 'Trauma bem estudado sustenta a nota.'] },
  'pediatria': { em: 'ortopedia pediátrica', de: 'ortopedia pediátrica', sabor: ['Pediátrica tem muita classificação, então isso tem valor.', 'Área cheia de nome próprio, boa de dominar.'] },
  'tumores': { em: 'tumores', de: 'tumor', sabor: ['Tumor assusta muita gente, então isso é ótimo.', 'Tumor é um tema que pouca gente gosta, e você está indo bem.'] },
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

const MARCOS_CARTA = [50, 100, 250, 500, 1000, 2000, 3000, 4000]
/** O marco que a pessoa acabou de passar (folga de 5%, no mínimo 30 questões), se houver. */
export function marcoRecente(respondidas: number, marcos: readonly number[] = MARCOS_CARTA): number | null {
  for (const m of [...marcos].reverse()) if (respondidas >= m && respondidas <= m + Math.max(30, Math.round(m * 0.05))) return m
  return null
}

const diasDesde = (iso: string, hoje: Date) => (hoje.getTime() - new Date(iso).getTime()) / 86_400_000
const familia = (modelo?: string | null) => (modelo ?? '').split(':')[0]

// ---------------------------------------------------------------------------
// Escolha automática do tipo
// ---------------------------------------------------------------------------

/**
 * A situação da pessoa, na ordem em que o dono pensaria: quem nunca começou, quem
 * acabou de assinar, quem sumiu, quem parou cedo, marco recém-atingido, reta
 * final, convite (não assinante com mais de 20 ou 50 questões, sem convite nos
 * últimos 30 dias) e, por fim, a carta da faixa de acerto.
 */
export function escolherTipo(p: PerfilCarta, anteriores: readonly EnvioAnterior[] = [], hoje = new Date()): { tipo: TipoCarta; faixa: Faixa | null; marco: number | null; motivo: string } {
  const r = Math.max(0, Math.floor(Number(p.respondidas) || 0))
  const parado = p.diasParado ?? null
  const conta = p.diasConta ?? 999
  const recebeu = (f: string, dentroDeDias = Infinity) => anteriores.some((e) => (e.status ?? 'enviado') !== 'falhou' && familia(e.modelo) === f && diasDesde(e.em, hoje) <= dentroDeDias)
  const acerto = acertoCitavel({ ...p, respondidas: r })

  if (r === 0) return { tipo: 'nunca_comecou', faixa: null, marco: null, motivo: 'Ainda não respondeu nenhuma questão.' }
  if (p.assinante && !recebeu('obrigado_assinatura')) return { tipo: 'obrigado_assinatura', faixa: null, marco: null, motivo: 'Assina e ainda não recebeu o agradecimento.' }
  if (parado !== null && parado >= 10) return { tipo: 'sumiu', faixa: null, marco: null, motivo: `Sem responder há ${dias(parado)}.` }
  if (r < MINIMO_PARA_ACERTO && parado !== null && parado >= 3) return { tipo: 'comecou_parou', faixa: null, marco: null, motivo: `Fez ${questoes(r)} e parou há ${dias(parado)}.` }
  if (r < MINIMO_PARA_ACERTO && conta <= 3) return { tipo: 'boas_vindas', faixa: null, marco: null, motivo: 'Chegou há poucos dias e já começou.' }
  const marco = marcoRecente(r, [100, 500, 1000])
  if (marco && !anteriores.some((e) => (e.tipo === 'marco' || familia(e.modelo) === 'marco') && (e.marco ?? null) === marco) && !recebeu('marco', 20)) {
    return { tipo: 'marco', faixa: null, marco, motivo: `Acabou de passar de ${numero(marco)} questões.` }
  }
  const provas = p.provas ?? []
  const teot = provas.includes('teot') || (!provas.length && (p.ano === 'r3' || p.situacao === 'r4'))
  if (teot && diasAteTeot(hoje) <= 60 && !recebeu('reta_final', 30)) return { tipo: 'reta_final', faixa: null, marco: null, motivo: `Faltam ${dias(diasAteTeot(hoje))} para o TEOT.` }
  if (!p.assinante && r > 20 && !recebeu('convite_20', 30) && !recebeu('convite_50', 30)) {
    return r > 50
      ? { tipo: 'convite_50', faixa: acerto === null ? null : faixaDe(acerto), marco: null, motivo: `Não assina e já fez ${questoes(r)}.` }
      : { tipo: 'convite_20', faixa: null, marco: null, motivo: `Não assina e já fez ${questoes(r)}.` }
  }
  if (acerto === null) return { tipo: 'comecando', faixa: null, marco: null, motivo: `Estudando, com ${questoes(r)} (pouco para falar de acerto).` }
  return { tipo: 'ativo', faixa: faixaDe(acerto), marco: null, motivo: `Estudando, acerto de ${acerto}% (faixa ${ROTULO_FAIXA[faixaDe(acerto)]}).` }
}

// ---------------------------------------------------------------------------
// Fatos pessoais: cada um só existe se o dado existir e for significativo
// ---------------------------------------------------------------------------

export interface Fatos {
  melhorArea?: { slug: string; pct: number; total: number }
  maisEstudada?: { slug: string; total: number }
  areaFraca?: { slug: string; pct: number; total: number }
  horario?: 'noite' | 'madrugada' | 'manha' | 'almoco' | 'tarde'
  prova?: 'teot' | 'taro' | 'mao' | 'r4' | 'atualizacao'
  etapa?: 'r1' | 'r2' | 'r3' | 'r4' | 'mao' | 'estudante' | 'ortopedista'
  ranking?: number
  sequencia?: number
  flashcards?: number
  semana?: number
}

export function fatosDe(p: PerfilCarta): Fatos {
  const f: Fatos = {}
  const geral = acertoCitavel(p)
  const areas = (p.areas ?? []).filter((a) => AREAS[a.slug] && a.total > 0 && a.certas >= 0 && a.certas <= a.total)
  const comAcerto = areas.filter((a) => a.total >= 15).map((a) => ({ ...a, pct: Math.round((100 * a.certas) / a.total) }))
  const melhor = [...comAcerto].sort((a, b) => b.pct - a.pct || b.total - a.total)[0]
  if (melhor && melhor.pct >= 70 && (geral === null || melhor.pct >= geral + 5)) f.melhorArea = { slug: melhor.slug, pct: melhor.pct, total: melhor.total }
  const fraca = [...comAcerto].sort((a, b) => a.pct - b.pct || b.total - a.total)[0]
  if (fraca && geral !== null && fraca.pct < 60 && fraca.pct <= geral - 10 && fraca.slug !== f.melhorArea?.slug) f.areaFraca = { slug: fraca.slug, pct: fraca.pct, total: fraca.total }
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
  return f
}

// ---------------------------------------------------------------------------
// Contexto das versões: o que cada versão usa para escrever
// ---------------------------------------------------------------------------

export type Link = 'treinar' | 'revisao' | 'erros' | 'assinatura' | 'cronograma' | 'indicar' | 'flashcards' | 'dados' | 'conta'
const ROTAS: Record<Link, string> = {
  treinar: '#/treinar', revisao: '#/revisao', erros: '#/erros', assinatura: '#/assinatura', cronograma: '#/cronograma',
  indicar: '#/indicar', flashcards: '#/flashcards', dados: '#/dados', conta: '#/conta/assinatura',
}

export interface Ctx {
  p: PerfilCarta
  tipo: TipoCarta
  faixa: Faixa | null
  /** Primeiro nome ou vazio. */
  nome: string
  r: number
  /** Acerto citável ou null. */
  pct: number | null
  fatos: Fatos
  hoje: Date
  diasTeot: number
  marco: number | null
  pix?: OpcoesCarta['pix']
  relatorio?: DadosRelatorioCarta
  /** Sorteia um item (ignora null, undefined, false e vazio). */
  um: <T>(...opcoes: Array<T | null | undefined | false | ''>) => T
  /** Verdadeiro com a probabilidade dada. */
  chance: (p: number) => boolean
  /** O link único da carta: guarda a rota e devolve o endereço para pôr no texto. */
  link: (rota: Link) => string
  /** k observações pessoais (frases inteiras), ou null se não houver dado. */
  obs: (k?: number, preferir?: Array<keyof Fatos>) => string | null
  /** Uma observação de um fato específico, se existir. */
  fato: (chave: keyof Fatos) => string | null
  dica: () => string
  fecho: () => string | null
  ps: () => string | null
  /** Benefícios reais da assinatura, os mais ligados ao perfil primeiro. */
  beneficios: (k: number, curto?: boolean) => string[]
  /** "há 3 dias", "ontem", "hoje". */
  quando: (diasAtras: number) => string
  area: (slug: string) => { em: string; de: string; sabor: string[] }
  usados: Set<string>
}

/** Frases de cada fato. Várias formas, para não soar como formulário. */
function frasesDoFato(chave: keyof Fatos, f: Fatos, pct: number | null): string[] {
  const A = (slug: string) => AREAS[slug]
  switch (chave) {
    case 'melhorArea': {
      const m = f.melhorArea!, a = A(m.slug)
      return [
        `Parabéns por estar tão bem em ${a.em}: ${m.pct}% de acerto em ${questoes(m.total)}.`,
        `Reparei que ${a.em} é o seu ponto forte agora, com ${m.pct}% de acerto.`,
        `Em ${a.em} você está voando: ${m.pct}% em ${questoes(m.total)}.`,
        `Seu melhor tema hoje é ${a.em}. ${m.pct}% de acerto, e dá gosto de ver.`,
        `Vi que você está muito bem em ${a.em}. ${a.sabor[0]}`,
      ]
    }
    case 'maisEstudada': {
      const m = f.maisEstudada!, a = A(m.slug)
      return [
        `Vi que tem bastante questão de ${a.de} no seu histórico. ${a.sabor[a.sabor.length - 1]}`,
        `Reparei que ${a.em} é o tema que você mais estuda: ${questoes(m.total)} até agora.`,
        `Vi que você anda firme em ${a.em}, com ${questoes(m.total)}. ${a.sabor[0]}`,
        `${a.de.charAt(0).toUpperCase() + a.de.slice(1)} parece ser a sua praia por aqui: já são ${questoes(m.total)}.`,
      ]
    }
    case 'areaFraca': {
      const m = f.areaFraca!, a = A(m.slug)
      return [
        `Vi que seu acerto em ${a.em} está em ${m.pct}%. É o tema em que cada sessão mais vai render.`,
        `${a.em.charAt(0).toUpperCase() + a.em.slice(1)} ainda está te dando trabalho (${m.pct}%), e é ali que mora o ponto mais fácil de ganhar.`,
        `Reparei que ${a.em} está abaixo do seu acerto geral${pct !== null ? ` (${m.pct}%, contra ${pct}% no total)` : ''}.`,
      ]
    }
    case 'horario':
      return {
        noite: ['Vi que você estuda bastante à noite.', 'Reparei que quase tudo seu sai à noite, depois que o dia acaba.', 'Vi que a noite é o seu horário de estudo.'],
        madrugada: ['Vi que muita questão sua sai de madrugada. Cuida do sono também, viu?', 'Reparei que você estuda até de madrugada. Admiro, mas o sono também é estudo.'],
        manha: ['Reparei que você gosta de estudar cedo, antes de o dia começar.', 'Vi que você estuda bastante de manhã cedo. Bom jeito de começar o dia.'],
        almoco: ['Vi que muita questão sua sai na hora do almoço. Bom jeito de encaixar o estudo.', 'Reparei que você aproveita o horário do almoço para estudar.'],
        tarde: ['Vi que você costuma estudar à tarde.', 'Reparei que a tarde é o seu horário de questões.'],
      }[f.horario!]
    case 'prova':
      return {
        teot: ['Vi que você está estudando para o TEOT.', 'Sei que o TEOT está no seu radar.', 'Vi que o seu foco é o TEOT.'],
        taro: ['Vi que você está se preparando para o TARO.', 'Sei que o TARO está no seu radar.'],
        mao: ['Vi que você está se preparando para a prova da cirurgia da mão.', 'Sei que a prova da mão está no seu radar.'],
        r4: ['Vi que você está mirando o R4.', 'Sei que a seleção do R4 está no seu radar.'],
        atualizacao: ['Vi que você usa o site para se manter atualizado, sem prova marcada. Acho isso muito legal.', 'Gosto de ver gente estudando sem prova marcada, só para se manter em dia.'],
      }[f.prova!]
    case 'etapa':
      return {
        r1: ['Sei que o R1 é um ano de muita novidade e pouco tempo.', 'R1 é puxado, e estudar no meio disso tem muito valor.'],
        r2: ['Sei que o R2 costuma ser puxado de plantão.', 'Estudar no meio do R2 não é pouca coisa.'],
        r3: ['R3 é o ano do TEOT, então cada questão agora conta muito.', 'Sei que o R3 é um ano de reta final.'],
        r4: ['Na subespecialidade, o detalhe faz toda a diferença.', 'Estudar no R4 é escolher ir além.'],
        mao: ['Residência de mão pede muito detalhe, e você está encarando.', 'Na mão, o detalhe é tudo.'],
        estudante: ['Estudar ortopedia ainda na graduação é sair na frente.', 'Bom ver gente da graduação estudando ortopedia a sério.'],
        ortopedista: ['Bom ver ortopedista formado mantendo o estudo em dia.', 'Admiro quem continua estudando depois da residência.'],
      }[f.etapa!]
    case 'ranking': {
      const n = f.ranking!
      return n <= 10
        ? [`Você está em ${n}º no ranking geral. Top 10.`, `${n}º lugar no ranking geral. Isso é muito estudo.`]
        : [`Parabéns pela ${n}ª posição no ranking geral.`, `Vi que você está em ${n}º no ranking geral.`, `${n}º no ranking geral. Bonito.`]
    }
    case 'sequencia':
      return [`São ${dias(f.sequencia!)} seguidos estudando.`, `Sua sequência está em ${dias(f.sequencia!)}. Não deixa cair.`, `Vi a sua sequência: ${dias(f.sequencia!)} seguidos.`]
    case 'flashcards':
      return ['Vi que você também está usando os flashcards.', `Vi que você já passou por ${numero(f.flashcards!)} flashcards também.`, 'E vi você nos flashcards também, que bom.']
    case 'semana':
      return [`Só nos últimos sete dias foram ${questoes(f.semana!)}.`, `Vi as ${questoes(f.semana!)} desta última semana.`, `${questoes(f.semana!).replace(/^./, (c) => c.toUpperCase())} em sete dias. Que ritmo.`]
  }
  return []
}

/** Ordem padrão de interesse dos fatos (o que mais faz a pessoa sentir que foi vista primeiro). */
const ORDEM_FATOS: Array<keyof Fatos> = ['melhorArea', 'ranking', 'maisEstudada', 'horario', 'prova', 'sequencia', 'semana', 'etapa', 'flashcards', 'areaFraca']

const DICAS: Record<'baixo' | 'medio' | 'alto', string[]> = {
  baixo: [
    'Uma dica: antes de marcar, tente responder sem olhar as alternativas. Treina o raciocínio de prova.',
    'Uma dica que ajuda muito: leia o comentário de cada alternativa errada, não só o da certa.',
    'Uma sugestão: cinco questões por dia, todo dia, rendem mais que trinta de uma vez no domingo.',
    'Quando errar, marque a questão como favorita e volte nela no dia seguinte.',
    'Antes de escolher a certa, elimine as que você tem certeza de que estão erradas. Muda o jogo.',
  ],
  medio: [
    'Uma sugestão: comece cada sessão pela Revisão do dia. São as questões que você errou voltando no momento certo.',
    'Vale abrir o Caderno de erros uma vez por semana e refazer as que ainda incomodam.',
    'Quando acertar no chute, trate como erro e leia o comentário. Chute certo engana o número.',
    'Concentre alguns dias no tema mais fraco. É onde cada hora rende mais.',
    'Leia o enunciado até o fim antes de olhar as alternativas. A banca esconde muita coisa na última linha.',
  ],
  alto: [
    'Nesse nível, vale ler o comentário mesmo quando acerta. Às vezes o acerto veio pelo motivo errado.',
    'Uma ideia: misture provas e temas na mesma sessão. Obriga a reconhecer o assunto sem pista.',
    'Cuidado só com a revisão acumulada: matéria bem sabida também esfria se ficar parada.',
    'Preste atenção nas questões que você erra duas vezes. São as mais valiosas da sua lista.',
    'Desconfie do "exceto" e do "incorreta" no enunciado. É ali que quem sabe muito ainda perde ponto.',
  ],
}
const FECHOS = ['Bons estudos.', 'Qualquer coisa, é só responder este e-mail.', 'Estou torcendo por você.', 'Conte comigo.', 'Se quiser trocar uma ideia, é só responder.', 'Sigo acompanhando por aqui.', 'Bom estudo por aí.']

function tomDaFaixa(f: Faixa | null): 'baixo' | 'medio' | 'alto' {
  if (!f) return 'baixo'
  return ['0-10', '10-20', '20-30', '30-40'].includes(f) ? 'baixo' : f === '40-60' || f === '60-70' ? 'medio' : 'alto'
}

function criarCtx(p: PerfilCarta, tipo: TipoCarta, faixa: Faixa | null, marco: number | null, rnd: () => number, op: OpcoesCarta, estado: { link: string | null }): Ctx {
  const hoje = op.hoje ?? new Date()
  const site = (op.site ?? SITE_PADRAO).replace(/\/*$/, '/')
  const pct = acertoCitavel(p)
  const fatos = fatosDe(p)
  const usados = new Set<string>()
  const um = <T,>(...opcoes: Array<T | null | undefined | false | ''>): T => {
    const validas = opcoes.filter((o): o is T => o !== null && o !== undefined && o !== false && o !== '')
    return validas[Math.floor(rnd() * validas.length)]
  }
  const fato = (chave: keyof Fatos): string | null => {
    if (fatos[chave] === undefined || usados.has(chave)) return null
    const frases = frasesDoFato(chave, fatos, pct)
    if (!frases.length) return null
    usados.add(chave)
    return frases[Math.floor(rnd() * frases.length)]
  }
  const ctx: Ctx = {
    p, tipo, faixa, nome: primeiroNome(p.nome), r: Math.max(0, Math.floor(Number(p.respondidas) || 0)), pct, fatos, hoje,
    diasTeot: diasAteTeot(hoje), marco, pix: op.pix, relatorio: op.relatorio, usados,
    um, chance: (x) => rnd() < x,
    link: (rota) => { estado.link = rota; return (site + ROTAS[rota]).replace(/^https?:\/\//, '') },
    fato,
    obs: (k = 1, preferir = []) => {
      const ordem = [...preferir, ...ORDEM_FATOS.filter((c) => !preferir.includes(c))]
        .filter((c) => fatos[c] !== undefined && !usados.has(c))
      // Um pouco de sorte na ordem, mas os preferidos e os mais pessoais vêm na frente.
      const escolhidos: Array<keyof Fatos> = []
      for (const c of ordem) { if (escolhidos.length >= k) break; if (rnd() < 0.8 || ordem.length - ordem.indexOf(c) <= k - escolhidos.length) escolhidos.push(c) }
      const frases = escolhidos.map((c) => fato(c)).filter((x): x is string => !!x)
      return frases.length ? frases.join(' ') : null
    },
    dica: () => um(...DICAS[tomDaFaixa(faixa)]),
    fecho: () => (rnd() < 0.15 ? null : um(...FECHOS)),
    ps: () => {
      const candidatos: Array<[string | null, string]> = []
      if (fatos.ranking && !usados.has('ranking')) candidatos.push(['ranking', `P.S.: vi que você está em ${fatos.ranking}º no ranking geral. Bonito.`])
      if (fatos.sequencia && !usados.has('sequencia')) candidatos.push(['sequencia', `P.S.: ${dias(fatos.sequencia)} seguidos. Não deixa a sequência cair.`])
      if (fatos.horario === 'madrugada' && !usados.has('horario')) candidatos.push(['horario', 'P.S.: e vá dormir, viu? A memória agradece.'])
      if (fatos.horario === 'noite' && !usados.has('horario')) candidatos.push(['horario', 'P.S.: vi que você estuda bastante à noite. Respeito muito quem estuda depois de um dia inteiro.'])
      if (fatos.melhorArea && !usados.has('melhorArea')) candidatos.push(['melhorArea', `P.S.: ${AREAS[fatos.melhorArea.slug].em} com ${fatos.melhorArea.pct}% de acerto. Parabéns.`])
      if (p.flashcards === 0 && tipo !== 'nunca_comecou') candidatos.push([null, 'P.S.: se ainda não testou, os flashcards estão em beta e valem uma olhada.'])
      candidatos.push([null, 'P.S.: se encontrar erro em alguma questão, tem um botão para relatar. Eu leio todos.'])
      if (rnd() < 0.55) return null
      const [chave, texto] = candidatos[Math.floor(rnd() * candidatos.length)]
      if (chave) usados.add(chave)
      return texto
    },
    beneficios: (k, curto = false) => {
      // [como item de lista, curto para o meio da frase, peso pelo perfil]
      const lista: Array<[string, string, number]> = [
        ['o cronograma até a prova: você diz a data e ele monta a lista de cada dia, começando pelo que mais cai, e se ajusta quando um plantão aperta', 'o cronograma até a prova', fatos.prova || fatos.etapa ? 10 : 6],
        ['o Simulado Nacional todo mês, com a sua posição', 'o Simulado Nacional do mês', fatos.ranking ? 9 : 5],
        ['os temas que mais caem em cada área e como a turma respondeu cada alternativa', 'os temas que mais caem', fatos.areaFraca ? 9 : 4],
        ['o Resumão, com o que cai em uma frase por assunto', 'o Resumão da reta final', diasAteTeot(hoje) <= 90 ? 7 : 3],
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
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Geração
// ---------------------------------------------------------------------------

const SAUDACOES_NOME = ['Oi, {n},', 'Olá, {n},', '{n}, tudo bem?', 'Oi, {n}! Tudo bem?', 'Oi, {n}. Tudo certo por aí?', 'Oi, {n}.']
const SAUDACOES = ['Oi,', 'Olá,', 'Oi! Tudo bem?', 'Tudo bem?']

export function modeloDe(tipo: TipoCarta, faixa: Faixa | null): string {
  return tipo === 'ativo' && faixa ? `ativo:${faixa}` : tipo
}

/** Quantas versões completas existem para um modelo. */
export function versoesDe(tipo: TipoCarta, faixa: Faixa | null): readonly Versao[] {
  return VERSOES[modeloDe(tipo, faixa)] ?? []
}

/** Confere o texto final: nada de buraco nem número zerado. Devolve o problema ou null. */
export function problemaNoTexto(texto: string): string | null {
  if (/\bundefined\b|\bnull\b|\bNaN\b|\[object/i.test(texto)) return 'valor vazio no texto'
  if (/(^|[^\d.,])0 (questões|questão|dias|dia)\b/.test(texto)) return 'número zerado'
  if (/\{[a-z]+\}/i.test(texto)) return 'marcador sem preencher'
  if (/R\$\s?\d/.test(texto)) return 'preço no texto'
  if (/ ,|,,|(?<!\.)\.\.(?!\.)| \.(?!\w)/.test(texto)) return 'pontuação quebrada'
  return null
}
export function problemaNoAssunto(assunto: string): string | null {
  const minusculo = assunto.toLocaleLowerCase('pt-BR')
  if (!assunto.trim()) return 'assunto vazio'
  if (assunto.length > 70) return 'assunto longo'
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
    case 'marco': return r >= 50
    case 'boas_vindas': case 'comecando': case 'comecou_parou': case 'pausa': case 'sumiu': case 'convite_20': case 'convite_50': return r > 0
    default: return true
  }
}

/**
 * Escreve a carta. Sem `tipo`, escolhe sozinho (escolherTipo). Sorteia uma versão
 * que a pessoa ainda não recebeu; se todas já foram, volta a sortear entre todas.
 */
export function gerarCarta(p: PerfilCarta, op: OpcoesCarta = {}): Carta {
  const hoje = op.hoje ?? new Date()
  const anteriores = op.anteriores ?? []
  const auto = escolherTipo(p, anteriores, hoje)
  const tipo = op.tipo ?? auto.tipo
  if (!tipoCombina(tipo, p)) throw new Error(`tipo_nao_combina_${tipo}`)
  const acerto = acertoCitavel(p)
  let faixa: Faixa | null = op.faixa ?? (tipo === auto.tipo ? auto.faixa : null) ?? (acerto !== null ? faixaDe(acerto) : null)
  if (tipo === 'ativo' && !faixa) faixa = '40-60'
  const marco = tipo === 'marco' ? (op.marco ?? auto.marco ?? marcoRecente(p.respondidas) ?? ([...MARCOS_CARTA].reverse().find((m) => p.respondidas >= m) ?? 100)) : null
  const modelo = modeloDe(tipo, faixa)
  const todas = VERSOES[modelo]
  if (!todas?.length) throw new Error(`sem_versoes_para_${modelo}`)
  const jaRecebidas = new Set(anteriores.filter((e) => (e.status ?? 'enviado') !== 'falhou').map((e) => e.versao).filter(Boolean))
  let semente = (op.semente ?? Math.floor(Math.random() * 2 ** 31)) >>> 0

  // Algumas tentativas: uma versão pode exigir dado que a pessoa não tem (ex.: ranking).
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const rnd = mulberry32(semente + tentativa * 7919)
    const estado = { link: null as string | null }
    const ctx = criarCtx(p, tipo, faixa, marco, rnd, op, estado)
    const possiveis = todas.filter((v) => !v.requer || v.requer(ctx))
    if (!possiveis.length) continue
    const novas = possiveis.filter((v) => !jaRecebidas.has(`${modelo}#${v.id}`))
    const lista = novas.length ? novas : possiveis
    const v = lista[Math.floor(rnd() * lista.length)]
    const brutos = v.corpo(ctx).filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
    // O fecho não repete o que o texto já disse ("é só responder", "torcendo", "acompanhando").
    const paragrafos = brutos.filter((x, i) => {
      if (!FECHOS.includes(x)) return true
      const chave = ['respond', 'torcendo', 'acompanh', 'conte comigo', 'bons estudos'].find((k) => x.toLowerCase().includes(k))
      return !chave || !brutos.some((y, j) => j !== i && y.toLowerCase().includes(chave))
    })
    const saudacao = v.saudacao ? v.saudacao(ctx) : ctx.nome ? ctx.um(...SAUDACOES_NOME).replace('{n}', ctx.nome) : ctx.um(...SAUDACOES)
    const assuntos = v.assuntos(ctx).filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()).filter((a) => !problemaNoAssunto(a))
    const assunto = assuntos[Math.floor(rnd() * assuntos.length)]
    const corpo = [saudacao, ...paragrafos].join('\n\n')
    if (!assunto || problemaNoTexto(corpo) || contarLinks(corpo) > 1) continue
    return {
      tipo, faixa: tipo === 'ativo' || tipo === 'convite_50' ? faixa : null, modelo, versao: `${modelo}#${v.id}`, assunto, corpo,
      personalizacao: [...ctx.usados].map((c) => ROTULO_FATO[c as keyof Fatos] ?? c),
      versoes: { total: todas.length, novas: todas.filter((x) => !jaRecebidas.has(`${modelo}#${x.id}`)).length },
    }
  }
  throw new Error(`nao_foi_possivel_escrever_${modelo}`)
}

export const ROTULO_FATO: Record<keyof Fatos, string> = {
  melhorArea: 'melhor área', maisEstudada: 'área mais estudada', areaFraca: 'área a melhorar', horario: 'horário de estudo',
  prova: 'prova de interesse', etapa: 'etapa', ranking: 'posição no ranking', sequencia: 'sequência de dias', flashcards: 'flashcards', semana: 'ritmo da semana',
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
 * fica por conta de quem envia).
 */
export function renderizarCarta(c: { assunto: string; corpo: string; descadastro?: string | null; textoDescadastro?: string }): CartaPronta {
  const corpo = semAssinatura(c.corpo.replace(/\r\n/g, '\n').trim())
  const paragrafos = corpo.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)
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
${c.descadastro ? p(`${esc(avisoSair)}, <a href="${esc(c.descadastro)}" style="color:#888888;">é só clicar aqui</a>.`, 'margin-top:28px;font-size:12px;line-height:1.4;color:#888888;') : ''}
</div>
</body>
</html>`
  const texto = [...paragrafos, assinatura.join('\n'), ...(rodape ? ['--', rodape] : [])].join('\n\n')
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

/** O que perfil_carta_admin, listar_cartas_admin e dados_carta_usuario devolvem por pessoa. */
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
}

export function perfilDosDados(d: DadosCartaBanco, limiteGratisLigado = false): PerfilCarta {
  const num = (v: unknown) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v))
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
  }
}

/** Todos os envios conhecidos da pessoa (os 15 últimos e os mais antigos com versão). */
export function anterioresDosDados(d: DadosCartaBanco): EnvioAnterior[] {
  return [...(d.emails?.lista ?? []), ...(d.emails?.antigos ?? [])]
}

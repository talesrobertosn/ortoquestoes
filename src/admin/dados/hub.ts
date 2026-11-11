import {
  DIA, MES, dataCancelamento, dataReembolso, inicioDoMes, meioDe, pagaSemCobranca, precoDe, renovaSozinha, somarMesChave, vigentesPorPessoa,
  type AssinaturaBase, type Cobranca,
} from '../../componentes/admin/receita'
import { periodosPagos, type Periodo } from './metas'
import { UM_DIA, dataSP, moverDia, segunda, type Escala } from './negocio'
import { PARAMETROS_PLANO, type ParametrosModelo } from './projecao'

/**
 * Cálculos do Financeiro e das Metas refeitos em 11/11/2026 (Tales: "quanto recebi este mês, no mês passado,
 * no total; quantos pagam e de qual plano; comparar o mês passado com este"). Funções puras, testadas em
 * fixtures/testar_hub.mjs; as telas só desenham.
 */

const PLANOS = ['mensal', 'semestral', 'anual'] as const
export type PlanoId = typeof PLANOS[number]

/* ───────────── Recebido por período ───────────── */

export interface PeriodoRecebido {
  chave: string
  total: number; quantidade: number
  cartao: number; pix: number
  nova: number; renovacao: number; volta: number
  mensal: number; semestral: number; anual: number
  estimado: number
  parcial: boolean
}

/** Chaves dos últimos `n` períodos até o atual (dias, semanas que começam na segunda ou meses de São Paulo). */
export function chavesPeriodos(escala: Escala, n: number, agora = new Date()) {
  const hoje = DIA(agora)
  if (escala === 'dia') return Array.from({ length: n }, (_, i) => moverDia(hoje, i - n + 1))
  if (escala === 'semana') { const s = segunda(hoje); return Array.from({ length: n }, (_, i) => moverDia(s, (i - n + 1) * 7)) }
  return Array.from({ length: n }, (_, i) => somarMesChave(MES(agora), i - n + 1))
}
const chaveDe = (d: Date, escala: Escala) => escala === 'mes' ? MES(d) : escala === 'semana' ? segunda(DIA(d)) : DIA(d)

/** O dinheiro que entrou em cada período, dividido por meio, por tipo de compra e por plano. */
export function recebidoPorPeriodo(cobrancas: Cobranca[], escala: Escala, n: number, agora = new Date()): PeriodoRecebido[] {
  const chaves = chavesPeriodos(escala, n, agora)
  const mapa = new Map(chaves.map((chave, i) => [chave, { chave, total: 0, quantidade: 0, cartao: 0, pix: 0, nova: 0, renovacao: 0, volta: 0, mensal: 0, semestral: 0, anual: 0, estimado: 0, parcial: i === chaves.length - 1 }]))
  for (const c of cobrancas) {
    if (c.em > agora) continue
    const p = mapa.get(chaveDe(c.em, escala)); if (!p) continue
    p.total += c.valor; p.quantidade++
    p[c.meio === 'pix' ? 'pix' : 'cartao'] += c.valor
    p[c.tipo] += c.valor
    if (c.plano === 'mensal' || c.plano === 'semestral' || c.plano === 'anual') p[c.plano] += c.valor
    if (c.estimada) p.estimado += c.valor
  }
  return [...mapa.values()]
}

/** Meses desde a primeira cobrança até o atual (para "desde o começo"). */
export function mesesDesdeOInicio(cobrancas: Cobranca[], agora = new Date()) {
  const primeiro = cobrancas.reduce<Date | null>((m, c) => !m || c.em < m ? c.em : m, null)
  if (!primeiro) return [MES(agora)]
  const lista: string[] = []
  for (let k = MES(primeiro); k <= MES(agora) && lista.length < 120; k = somarMesChave(k, 1)) lista.push(k)
  return lista
}

/* ───────────── A base num instante, por plano ───────────── */

export interface Base { total: number; porPlano: Record<PlanoId, number>; pix: number; cartao: number; receitaEquivalente: number; ids: Set<string> }

/** Quem tinha acesso pago no instante `t` (períodos encadeados por pessoa), separado por plano e meio. */
export function baseEm(periodos: Periodo[], t: number): Base {
  const pessoa = new Map<string, Periodo>()
  for (const p of periodos) if (p.inicio <= t && p.fim > t) { const x = pessoa.get(p.id_usuario); if (!x || p.inicio > x.inicio) pessoa.set(p.id_usuario, p) }
  const porPlano: Record<PlanoId, number> = { mensal: 0, semestral: 0, anual: 0 }
  let pix = 0, rme = 0
  for (const p of pessoa.values()) {
    if (p.plano === 'mensal' || p.plano === 'semestral' || p.plano === 'anual') porPlano[p.plano]++
    if (p.meio === 'pix') pix++
    rme += p.mensal
  }
  return { total: pessoa.size, porPlano, pix, cartao: pessoa.size - pix, receitaEquivalente: rme, ids: new Set(pessoa.keys()) }
}

/** Mensais no cartão com a renovação ligada no instante `t` (assinatura já existia e ninguém desligou até lá). */
export function mensaisRenovandoEm(assinaturas: AssinaturaBase[], t: number) {
  const ids = new Set<string>()
  for (const a of assinaturas) {
    if (a.plano !== 'mensal' || meioDe(a) !== 'cartao' || !(a.ultima_cobranca_em || pagaSemCobranca(a))) continue
    const inicio = new Date(a.criada_em ?? a.inicio_periodo ?? a.ultima_cobranca_em ?? 0).getTime()
    const saiu = dataCancelamento(a) ?? dataReembolso(a) ?? (a.status === 'vencida' || a.status === 'falha_pagamento' ? new Date(a.fim_periodo ?? a.ultima_atualizacao ?? 0) : null)
    if (inicio <= t && (!saiu || saiu.getTime() > t)) ids.add(a.id_usuario)
  }
  return ids.size
}

/* ───────────── Um mês, inteiro ou até a mesma altura ───────────── */

export interface FotoMes {
  chave: string
  /** Até quando foi contado (o fim do mês, ou o mesmo dia e hora para comparar com o mês atual). */
  ate: number
  recebido: number; recebidoNovas: number; recebidoRenovacoes: number
  novas: number; novasPix: number; novasCartao: number; novasPorPlano: Record<PlanoId, number>
  renovacoes: number; renovacoesPix: number; voltas: number
  desligaram: number; reembolsos: number; valorReembolsado: number
  perderamAcesso: number
  baseInicio: Base; baseFim: Base
  mensaisRenovando: number
  ticketNovas: number
}

/**
 * O retrato de um mês: o que entrou, quem chegou, quem renovou, quem saiu e o tamanho da base no início e no fim.
 * Com `ate`, conta só até aquele instante (o mês passado "até o mesmo dia e hora" de hoje, para uma comparação justa).
 */
export function fotoDoMes(chave: string, assinaturas: AssinaturaBase[], cobrancas: Cobranca[], ate?: number, agora = Date.now()): FotoMes {
  const inicio = inicioDoMes(chave).getTime(), fimMes = inicioDoMes(somarMesChave(chave, 1)).getTime()
  const limite = Math.min(fimMes, ate ?? fimMes, agora)
  const doMes = cobrancas.filter(c => { const t = c.em.getTime(); return t >= inicio && t < limite })
  const novas = doMes.filter(c => c.tipo === 'nova'), renov = doMes.filter(c => c.tipo === 'renovacao'), voltas = doMes.filter(c => c.tipo === 'volta')
  const soma = (l: Cobranca[]) => l.reduce((s, c) => s + c.valor, 0)
  const novasPorPlano: Record<PlanoId, number> = { mensal: 0, semestral: 0, anual: 0 }
  for (const c of novas) if (c.plano in novasPorPlano) novasPorPlano[c.plano as PlanoId]++
  const periodos = periodosPagos(cobrancas.filter(c => c.em.getTime() < limite))
  const baseInicio = baseEm(periodos, inicio - 1), baseFim = baseEm(periodos, limite - 1)
  const noMes = (d: Date | null) => !!d && d.getTime() >= inicio && d.getTime() < limite
  let desligaram = 0, reembolsos = 0, valorReembolsado = 0
  for (const a of assinaturas) {
    if (noMes(dataCancelamento(a))) desligaram++
    if (noMes(dataReembolso(a))) { reembolsos++; valorReembolsado += precoDe(a.plano)?.total ?? 0 }
  }
  return {
    chave, ate: limite,
    recebido: soma(doMes), recebidoNovas: soma(novas), recebidoRenovacoes: soma(renov) + soma(voltas),
    novas: novas.length, novasPix: novas.filter(c => c.meio === 'pix').length, novasCartao: novas.filter(c => c.meio !== 'pix').length, novasPorPlano,
    renovacoes: renov.length, renovacoesPix: renov.filter(c => c.meio === 'pix').length, voltas: voltas.length,
    desligaram, reembolsos, valorReembolsado,
    perderamAcesso: [...baseInicio.ids].filter(id => !baseFim.ids.has(id)).length,
    baseInicio, baseFim,
    mensaisRenovando: mensaisRenovandoEm(assinaturas, limite - 1),
    ticketNovas: novas.length ? soma(novas) / novas.length : 0,
  }
}

/** O mesmo instante no mês anterior (dia 11 às 19h → dia 11 do mês passado às 19h; trava no fim do mês curto). */
export function mesmaAlturaMesPassado(agora = Date.now()) {
  const chave = MES(new Date(agora))
  const inicio = inicioDoMes(chave).getTime(), anterior = inicioDoMes(somarMesChave(chave, -1)).getTime()
  return Math.min(inicio, anterior + (agora - inicio))
}

/* ───────────── Carteira de hoje ───────────── */

export interface Carteira {
  total: number
  linhas: Array<{ plano: PlanoId; nome: string; cartaoRenova: number; cartaoDesligou: number; pix: number; total: number; ids: string[] }>
}
/** Quem tem acesso pago hoje: uma pessoa por conta, por plano e por como paga. */
export function carteiraHoje(assinaturas: AssinaturaBase[], agora = Date.now()): Carteira {
  const vig = vigentesPorPessoa(assinaturas, agora).filter(a => precoDe(a.plano))
  const linhas = PLANOS.map(plano => {
    const l = vig.filter(a => a.plano === plano)
    const pix = l.filter(a => meioDe(a) === 'pix').length, renova = l.filter(renovaSozinha).length
    return { plano, nome: precoDe(plano)?.nome ?? plano, cartaoRenova: renova, cartaoDesligou: l.length - pix - renova, pix, total: l.length, ids: l.map(a => a.id_usuario) }
  })
  return { total: vig.length, linhas }
}

/* ───────────── Médias por dia da semana ───────────── */

export const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const diaDaSemana = (dia: string) => (new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7

/**
 * Média por dia da semana de uma contagem diária, só com dias completos (hoje fica de fora), do primeiro dia
 * com movimento até ontem. `dias` é a série diária ({ dia: "2026-11-02", n }).
 */
export function mediaPorDiaDaSemana(dias: Array<{ dia: string; n: number }>, hoje: string) {
  const somas = Array.from({ length: 7 }, () => ({ soma: 0, dias: 0 }))
  for (const d of dias) { if (d.dia >= hoje) continue; const k = diaDaSemana(d.dia); somas[k].soma += d.n; somas[k].dias++ }
  return somas.map(s => ({ media: s.dias ? s.soma / s.dias : 0, dias: s.dias }))
}

/** Série diária de instantes (cadastros, compras), do primeiro dia com evento até hoje. */
export function contarPorDia(instantes: Date[], agora = new Date()): Array<{ dia: string; n: number }> {
  if (!instantes.length) return []
  const conta = new Map<string, number>()
  let primeiro = DIA(agora)
  for (const t of instantes) { if (t > agora) continue; const d = DIA(t); conta.set(d, (conta.get(d) ?? 0) + 1); if (d < primeiro) primeiro = d }
  const lista: Array<{ dia: string; n: number }> = []
  for (let d = primeiro, i = 0; d <= DIA(agora) && i < 3000; d = moverDia(d, 1), i++) lista.push({ dia: d, n: conta.get(d) ?? 0 })
  return lista
}

/** Grade dia da semana × hora (São Paulo), com o total. */
export function gradeSemanaHora(instantes: Date[]) {
  const grade = Array.from({ length: 7 }, () => Array(24).fill(0) as number[])
  for (const t of instantes) {
    const s = new Date(t.getTime() - 3 * 3_600_000)
    grade[(s.getUTCDay() + 6) % 7][s.getUTCHours()]++
  }
  return grade
}

/* ───────────── Ritmo das semanas do mês ───────────── */

export interface SemanaDoMes { de: number; ate: number; inicio: number; fim: number; estado: 'passada' | 'atual' | 'futura' }
/** As semanas do mês contadas do dia 1º (1–7, 8–14, 15–21, 22–28, 29–fim), com o estado de cada uma. */
export function semanasDoMes(chave: string, agora = Date.now()): SemanaDoMes[] {
  const [a, m] = chave.split('-').map(Number)
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate()
  const lista: SemanaDoMes[] = []
  for (let d = 1; d <= dias; d += 7) {
    const ate = Math.min(dias, d + 6)
    const inicio = dataSP(`${chave}-${String(d).padStart(2, '0')}`).getTime(), fim = inicio + (ate - d + 1) * UM_DIA
    lista.push({ de: d, ate, inicio, fim, estado: agora >= fim ? 'passada' : agora >= inicio ? 'atual' : 'futura' })
  }
  return lista
}

/* ───────────── O modelo com os números de hoje ───────────── */


/**
 * Os parâmetros do modelo de crescimento tirados dos dados de agora (para o simulador e a previsão com
 * clientes novos): o ritmo de cadastros do mês, a conversão das turmas de cadastro, os planos escolhidos nas
 * compras recentes, a parte dos mensais no Pix e a base no início do mês. O que não dá para medir ainda
 * (tamanho do público, turma de março, renovação de longos, cancelamento do cartão) vem do plano.
 */
export function parametrosAoVivo({ usuarios, cobrancas, carteira, taxaPix, agora = Date.now() }: {
  usuarios: Array<{ id_usuario: string; criado_em: string }>; cobrancas: Cobranca[]; carteira: Carteira; taxaPix: number; agora?: number
}): ParametrosModelo {
  const cadastros = usuarios.map(u => new Date(u.criado_em)).filter(d => Number.isFinite(d.getTime()))
  const chave = MES(new Date(agora))
  const inicio = inicioDoMes(chave).getTime(), fim = inicioDoMes(somarMesChave(chave, 1)).getTime()
  const passados = Math.max(1, (agora - inicio) / UM_DIA), noMes = (fim - inicio) / UM_DIA
  const cadMes = cadastros.filter(d => d.getTime() >= inicio && d.getTime() <= agora).length
  const antes = cadastros.filter(d => d.getTime() < inicio).length
  // Conversão: das pessoas cadastradas há 14 a 120 dias, quantas já pagaram (precisa de 20 pessoas).
  const primeira = new Map<string, number>()
  for (const c of cobrancas) primeira.set(c.id_usuario, Math.min(primeira.get(c.id_usuario) ?? Infinity, c.em.getTime()))
  const compradores = new Set(primeira.keys())
  const novasRecentes = cobrancas.filter(c => c.tipo === 'nova' && c.em.getTime() > agora - 60 * UM_DIA && c.em.getTime() <= agora)
  const mix = (plano: string) => novasRecentes.length >= 10 ? novasRecentes.filter(c => c.plano === plano).length / novasRecentes.length : null
  const mensal = carteira.linhas.find(l => l.plano === 'mensal')
  const periodos = periodosPagos(cobrancas.filter(c => c.em.getTime() < inicio))
  const base = baseEm(periodos, inicio - 1)
  const longos = new Map<string, { vence: string; meses: number; quantidade: number; valor: number }>()
  for (const p of periodos) {
    if (p.plano === 'mensal' || !base.ids.has(p.id_usuario) || !(p.inicio <= inicio - 1 && p.fim > inicio - 1)) continue
    const meses = precoDe(p.plano)?.meses ?? 12, valor = Math.round(p.mensal * meses * 100) / 100, vence = MES(new Date(p.fim))
    const k = `${vence}|${meses}|${valor}`
    const x = longos.get(k) ?? { vence, meses, quantidade: 0, valor }
    x.quantidade++; longos.set(k, x)
  }
  return {
    ...PARAMETROS_PLANO,
    inicio: chave,
    jaCadastrados: antes,
    cadastrosPrimeiroMes: Math.max(1, Math.round(cadMes / passados * noMes)),
    conversao: taxaConversao(usuarios, compradores, agora) ?? PARAMETROS_PLANO.conversao,
    gratisNoInicio: usuarios.filter(u => new Date(u.criado_em).getTime() < inicio && !((primeira.get(u.id_usuario) ?? Infinity) < inicio)).length,
    mixMensal: mix('mensal') ?? PARAMETROS_PLANO.mixMensal, mixSemestral: mix('semestral') ?? PARAMETROS_PLANO.mixSemestral, mixAnual: mix('anual') ?? PARAMETROS_PLANO.mixAnual,
    mensaisNoPix: mensal && mensal.total >= 5 ? mensal.pix / mensal.total : PARAMETROS_PLANO.mensaisNoPix,
    pixRenova: taxaPix,
    mensaisNoInicio: base.porPlano.mensal,
    longosNoInicio: [...longos.values()],
  }
}

/** Das contas cadastradas há 14 a 120 dias, a fração que já pagou (null com menos de 20 contas). */
export function taxaConversao(usuarios: Array<{ id_usuario: string; criado_em: string }>, compradores: Set<string>, agora = Date.now()) {
  const turma = usuarios.filter(u => { const t = new Date(u.criado_em).getTime(); return t <= agora - 14 * UM_DIA && t >= agora - 120 * UM_DIA })
  return turma.length >= 20 ? turma.filter(u => compradores.has(u.id_usuario)).length / turma.length : null
}

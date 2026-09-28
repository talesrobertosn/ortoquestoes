import type { Indice } from '../dados/tipos'
import type { RegistroQuestao } from './revisao'
import { dominada } from './revisao'

export interface DiaRevisao {
  chave: string; inicio: number; ids: string[]; temas: Map<string, number>; acertos: number; tentativas: number
  /** Venceram em dias anteriores e foram trazidas para este. */
  atrasadas: number
  /** Venceram antes deste dia, mas o teto diário empurrou para cá. */
  redistribuidas: number
}
const DIA = 86400000
/** Cobre a cauda mais longa do ciclo de certeza (até 365 dias), com folga. */
export const JANELA_REVISAO_DIAS = 400

/**
 * Quanto a pessoa aceita revisar por dia e em que dias da semana não revisa.
 * O ritmo só decide em que dia cada revisão aparece: não mexe no histórico
 * nem nas datas gravadas, então trocar de ideia reorganiza tudo na hora.
 */
export interface RitmoRevisao { limite: number | null; folgas: number[] }
export const RITMO_PADRAO: RitmoRevisao = { limite: 30, folgas: [] }
export const SEM_RITMO: RitmoRevisao = { limite: null, folgas: [] }

type Registros = Record<string, Partial<RegistroQuestao> & { c: boolean | null }>

export function inicioDia(data = Date.now()) { const d = new Date(data); d.setHours(0, 0, 0, 0); return d.getTime() }
export function chaveDia(data: number) { return new Date(data).toISOString().slice(0, 10) }
function diaSeguinte(dia: number) { const d = new Date(dia); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d.getTime() }

/** Mesma regra de revisarHoje: registros antigos sem data voltam 3 dias depois da resposta. */
function vencimentoDe(r: Partial<RegistroQuestao> & { c: boolean | null }): number | null {
  if (r.c === null || dominada(r)) return null
  if (r.proximaRevisao === undefined) return r.q !== undefined ? (r.c === false ? r.q : r.q + 3 * DIA) : null
  return r.proximaRevisao
}

/** Revisões já feitas hoje (questão respondida de novo hoje) gastam o teto do dia. */
export function revisoesFeitasHoje(registros: Registros, agora = Date.now()): number {
  const hoje = inicioDia(agora)
  let feitas = 0
  for (const r of Object.values(registros)) if ((r.q ?? 0) >= hoje && (r.tentativas ?? 1) > 1) feitas++
  return feitas
}

/**
 * Coloca cada revisão pendente num dia. Sem teto e sem folgas, cada uma fica
 * no dia em que vence (e as vencidas, hoje). Com teto, o que passar dele vai
 * para o próximo dia com espaço, sempre começando pelas que a pessoa errou e
 * pelas vencidas há mais tempo. Dia de folga não recebe nenhuma.
 */
export function distribuirRevisoes(registros: Registros, ritmo: RitmoRevisao = SEM_RITMO, dias = JANELA_REVISAO_DIAS, agora = Date.now()) {
  const hoje = inicioDia(agora)
  const fim = hoje + dias * DIA
  const folgas = new Set(ritmo.folgas.length >= 7 ? [] : ritmo.folgas)
  const feitas = ritmo.limite === null ? 0 : revisoesFeitasHoje(registros, agora)
  const capacidade = (dia: number) => {
    if (folgas.has(new Date(dia).getDay())) return 0
    if (ritmo.limite === null) return Infinity
    return dia === hoje ? Math.max(0, ritmo.limite - feitas) : ritmo.limite
  }
  const itens: Array<{ id: string; vencimento: number; base: number; erro: boolean }> = []
  for (const [id, r] of Object.entries(registros)) {
    const venc = vencimentoDe(r)
    if (venc === null) continue
    const vencimento = inicioDia(venc)
    itens.push({ id, vencimento, base: Math.max(vencimento, hoje), erro: r.c === false })
  }
  itens.sort((a, b) => a.base - b.base || Number(b.erro) - Number(a.erro) || a.vencimento - b.vencimento)
  const porDia = new Map<number, Array<{ id: string; vencimento: number; redistribuida: boolean }>>()
  for (const item of itens) {
    let dia = item.base
    while (dia <= fim && (porDia.get(dia)?.length ?? 0) >= capacidade(dia)) dia = diaSeguinte(dia)
    if (dia > fim) continue
    const lista = porDia.get(dia) ?? []
    lista.push({ id: item.id, vencimento: item.vencimento, redistribuida: dia > item.base })
    porDia.set(dia, lista)
  }
  return porDia
}

/** Ids que o ritmo reserva para hoje: é o que "Revisar hoje" mostra em todo o site. */
export function idsRevisaoHoje(registros: Registros, ritmo: RitmoRevisao, agora = Date.now()): Set<string> {
  const hoje = inicioDia(agora)
  return new Set((distribuirRevisoes(registros, ritmo, 1, agora).get(hoje) ?? []).map((i) => i.id))
}

export function planoRevisao(indice: Indice, registros: Registros, dias = JANELA_REVISAO_DIAS, ritmo: RitmoRevisao = SEM_RITMO) {
  const hoje = inicioDia(); const porDia = new Map<string, DiaRevisao>()
  const temaPorId = new Map(indice.questoes.map((q) => [q.id, indice.temas[q.t]?.nome ?? 'Outro']))
  for (const [inicio, lista] of distribuirRevisoes(registros, ritmo, dias)) {
    const chave = chaveDia(inicio)
    const dia: DiaRevisao = { chave, inicio, ids: [], temas: new Map(), acertos: 0, tentativas: 0, atrasadas: 0, redistribuidas: 0 }
    for (const { id, vencimento, redistribuida } of lista) {
      const r = registros[id]
      dia.ids.push(id)
      const tema = temaPorId.get(id) ?? 'Outro'
      dia.temas.set(tema, (dia.temas.get(tema) ?? 0) + 1)
      dia.acertos += r.acertos ?? Number(r.c === true); dia.tentativas += r.tentativas ?? 1
      if (vencimento < hoje) dia.atrasadas++
      if (redistribuida) dia.redistribuidas++
    }
    porDia.set(chave, dia)
  }
  return porDia
}
export function rotuloDia(data: number) { return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(data) }

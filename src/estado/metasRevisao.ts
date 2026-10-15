/**
 * O que a pessoa já revisou: revisões por dia, revisões feitas com atraso
 * (resgatadas) e a sequência de dias revisando. Tudo sai do histórico curto
 * que cada questão já guarda (src/estado/revisao.ts), sem mudar o algoritmo
 * de intervalos. Usado pela página de Revisão e pelos emblemas de revisão.
 *
 * "Revisão" é toda resposta a uma questão que já tinha sido respondida antes.
 */
import { INTERVALOS, type RegistroQuestao } from './revisao'
import { chaveDoDia, diaDaSemana, somarDias } from '../util/dia'

const DIA = 86400000
/** Um dia conta na sequência de revisão com este número de revisões (ou com a fila zerada). */
export const REVISOES_DIA_SEQUENCIA = 10
/** Revisão feita pelo menos estes dias depois do vencimento conta como resgatada. */
export const ATRASO_RESGATE_DIAS = 3
/** Estimativa de tempo por revisão, para o "~8 min" da página. */
export const SEGUNDOS_POR_REVISAO = 40
/** Sessão curta: quantas revisões cabem em uns 5 minutos. */
export const REVISOES_CINCO_MINUTOS = Math.round((5 * 60) / SEGUNDOS_POR_REVISAO)

type Registro = Partial<RegistroQuestao>

export interface ResumoRevisoes {
  /** Revisões feitas na vida toda (tentativas além da primeira). */
  total: number
  /** Revisões por dia de São Paulo (só o que o histórico curto ainda guarda). */
  porDia: Map<string, number>
  /** Revisões feitas com pelo menos ATRASO_RESGATE_DIAS de atraso. */
  resgatadas: number
  /** Mais revisões num mesmo dia. */
  maiorDia: number
}

/** Minutos estimados para N revisões (arredonda para cima, mínimo 1). */
export const minutosPara = (n: number) => Math.max(1, Math.ceil((n * SEGUNDOS_POR_REVISAO) / 60))

/**
 * Lê as revisões dos registros. O histórico guarda as 8 respostas mais recentes:
 * quando ele está completo (tantas entradas quanto tentativas), a primeira entrada
 * é a resposta original e não conta como revisão; quando foi cortado, todas contam.
 */
export function resumoRevisoes(registros: Record<string, Registro>): ResumoRevisoes {
  const porDia = new Map<string, number>()
  let total = 0, resgatadas = 0
  for (const r of Object.values(registros)) {
    if (!r || r.c === undefined) continue
    const tentativas = r.tentativas ?? 1
    total += Math.max(0, tentativas - 1)
    const historico = r.historico ?? []
    const completo = historico.length > 0 && historico.length >= tentativas
    const revisoes = historico.length ? (completo ? historico.slice(1) : historico).map((e) => e.em) : tentativas > 1 && r.q ? [r.q] : []
    for (const em of revisoes) {
      const k = chaveDoDia(em)
      porDia.set(k, (porDia.get(k) ?? 0) + 1)
    }
    // Resgate: refaz a escada de intervalos pelo histórico para saber quando cada resposta vencia.
    let degrau: number | null = completo ? 0 : null
    let vencimento: number | null = null
    for (const e of historico) {
      if (vencimento !== null && e.em - vencimento >= ATRASO_RESGATE_DIAS * DIA) resgatadas++
      if (e.correta === null) { degrau = 0; vencimento = null; continue }
      if (e.correta === false) { degrau = 0; vencimento = e.em; continue }
      if (degrau === null) { vencimento = null; continue }
      degrau++
      const intervalos = INTERVALOS[e.confianca ?? 'seguro']
      vencimento = degrau > intervalos.length ? null : e.em + intervalos[degrau - 1] * DIA
    }
  }
  return { total, porDia, resgatadas, maiorDia: Math.max(0, ...porDia.values()) }
}

export interface SequenciaRevisao {
  /** Dias seguidos até hoje (ou até ontem, se hoje ainda não contou). */
  atual: number
  maior: number
  hojeConta: boolean
}

/**
 * Sequência de dias revisando: o dia conta com REVISOES_DIA_SEQUENCIA revisões
 * ou com a fila de Revisar hoje zerada (dias registrados no servidor). Os dias de
 * folga do ritmo de revisão não quebram nem somam.
 */
export function sequenciaRevisao(porDia: ReadonlyMap<string, number>, opcoes: { diasZerados?: readonly string[]; folgas?: readonly number[]; minimo?: number } = {}, agora = Date.now()): SequenciaRevisao {
  const { diasZerados = [], folgas = [], minimo = REVISOES_DIA_SEQUENCIA } = opcoes
  const contam = new Set(diasZerados)
  for (const [k, n] of porDia) if (n >= minimo) contam.add(k)
  const pular = new Set(folgas.length >= 7 ? [] : folgas)
  const folga = (k: string) => pular.has(diaDaSemana(k))
  const hoje = chaveDoDia(agora)
  const hojeConta = contam.has(hoje)
  let atual = 0
  let k = hojeConta ? hoje : somarDias(hoje, -1)
  for (let guarda = 0; guarda < 2000; guarda++, k = somarDias(k, -1)) {
    if (contam.has(k)) atual++
    else if (!folga(k)) break
  }
  let maior = 0, corrente = 0, anterior: string | null = null
  for (const dia of [...contam].sort()) {
    let seguido = anterior !== null
    if (anterior !== null) for (let x = somarDias(anterior, 1); seguido && x < dia; x = somarDias(x, 1)) if (!folga(x)) seguido = false
    corrente = seguido ? corrente + 1 : 1
    maior = Math.max(maior, corrente)
    anterior = dia
  }
  return { atual, maior: Math.max(maior, atual), hojeConta }
}

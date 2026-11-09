import type { PontoColuna } from '../ui/graficos'

/* Datas no relógio de São Paulo (o resto do painel conta assim). */
const FUSO = 'America/Sao_Paulo'
const DIA_MS = 86_400_000
let fmt: Intl.DateTimeFormat | null = null
const diaSP = (d: Date) => {
  fmt ??= new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
  return fmt.format(d)
}
const somarDias = (dia: string, n: number) => new Date(new Date(`${dia}T12:00:00Z`).getTime() + n * DIA_MS).toISOString().slice(0, 10)
const segunda = (dia: string) => { const d = new Date(`${dia}T12:00:00Z`); return somarDias(dia, -((d.getUTCDay() + 6) % 7)) }
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const nomeMes = (k: string, curto = false) => new Date(`${k}-15T12:00:00Z`).toLocaleDateString('pt-BR', curto ? { month: 'short', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' }).replace('.', '')

export type Agrupamento = 'dia' | 'semana' | 'mes'
const QUANTOS: Record<Agrupamento, number> = { dia: 30, semana: 12, mes: 12 }

/**
 * Contagem de instantes por dia (30), semana (12, de segunda a domingo) ou mês (12). O último ponto é o período
 * em andamento. Semanas e meses antes do primeiro registro (de qualquer das listas) ficam de fora: o gráfico
 * começa quando o site começou, sem uma fila de zeros à esquerda.
 */
export function contarPorPeriodo(listas: Date[][], agrupar: Agrupamento, agora = new Date()): PontoColuna[][] {
  const hoje = diaSP(agora)
  let chaves: string[]
  if (agrupar === 'dia') chaves = Array.from({ length: QUANTOS.dia }, (_, i) => somarDias(hoje, i - (QUANTOS.dia - 1)))
  else if (agrupar === 'semana') { const s = segunda(hoje); chaves = Array.from({ length: QUANTOS.semana }, (_, i) => somarDias(s, (i - (QUANTOS.semana - 1)) * 7)) }
  else { const [a, m] = hoje.split('-').map(Number); chaves = Array.from({ length: QUANTOS.mes }, (_, i) => new Date(Date.UTC(a, m - 1 - (QUANTOS.mes - 1 - i), 15)).toISOString().slice(0, 7)) }
  const chaveDe = (d: Date) => { const dia = diaSP(d); return agrupar === 'dia' ? dia : agrupar === 'semana' ? segunda(dia) : dia.slice(0, 7) }
  const contagens = listas.map(lista => { const m = new Map(chaves.map(k => [k, 0])); for (const t of lista) { const k = chaveDe(t); if (m.has(k)) m.set(k, m.get(k)! + 1) } return m })
  // Corta o começo vazio (só em semana e mês; nos 30 dias, um zero é informação).
  let inicio = 0
  if (agrupar !== 'dia') { const primeiro = chaves.findIndex(k => contagens.some(m => m.get(k)! > 0)); inicio = primeiro < 0 ? chaves.length - 1 : Math.min(primeiro, chaves.length - 2) }
  const usadas = chaves.slice(Math.max(0, inicio))
  const rotulo = (k: string) => agrupar === 'dia' ? { longo: `${SEMANA[new Date(`${k}T12:00:00Z`).getUTCDay()]}, ${ddmm(k)}`, curto: ddmm(k) }
    : agrupar === 'semana' ? { longo: `Semana de ${ddmm(k)} a ${ddmm(somarDias(k, 6))}`, curto: ddmm(k) }
    : { longo: nomeMes(k), curto: nomeMes(k, true) }
  return contagens.map(m => usadas.map((k, i) => ({ ...rotulo(k), partes: [m.get(k)!], parcial: i === usadas.length - 1 })))
}

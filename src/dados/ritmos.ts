import { DATAS_PROVA } from '../estado/conquistas'
import { chaveDia } from '../estado/limiteDiario'

/**
 * Data da prova e ritmos de estudo das duas contas "até a prova": a da capa
 * (AteAProva) e a prévia do cronograma na página de planos. Cada uma tem a sua
 * escala de ritmos, de propósito: a capa fala em minutos por dia de quem está
 * começando; a prévia, no ritmo de quem segue um plano.
 */

/** A próxima prova do calendário; sem data futura cadastrada, seis meses à frente. */
export function proximaProva(): string {
  const hoje = chaveDia()
  return DATAS_PROVA.find((d) => d > hoje) ?? chaveDia(Date.now() + 182 * 864e5)
}

/** Dias corridos de hoje até a data (AAAA-MM-DD), nunca negativo. */
export const diasAte = (data: string) => Math.max(0, Math.round((Date.parse(`${data}T12:00:00Z`) - Date.parse(`${chaveDia()}T12:00:00Z`)) / 864e5))

/** Ritmos da capa, com o tempo aproximado (cerca de 1,5 minuto por questão); o "≈" fica no botão. */
export const RITMOS_CAPA: Array<[number, string]> = [[10, '15 min'], [20, '30 min'], [30, '45 min'], [50, '1h15']]

/** Ritmos da prévia do cronograma na página de planos, com o tempo aproximado. */
export const RITMOS_PLANOS: Array<[number, string]> = [[15, '≈ 25 min'], [25, '≈ 40 min'], [40, '≈ 1h'], [60, '≈ 1h30']]

import type { Clima } from './ambiente'

export const INTERVALO_CEU = 120_000
/** Quatro etapas visuais: manhã, entardecer, noite e amanhecer. */
export function climaDoCiclo(etapa: number): Clima {
  return (['dia', 'entardecer', 'noite', 'entardecer'] as const)[((Math.floor(etapa) % 4) + 4) % 4]
}

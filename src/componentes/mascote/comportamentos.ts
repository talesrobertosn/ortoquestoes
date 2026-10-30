import { LINHAS_ESQUELETO, type IdLinhaEsqueleto } from './sprites'

/**
 * Os comportamentos do mascote (30/10/2026): cada um é uma linha da folha de sprites em pixel art HD-2D
 * (scripts/gerar_mascote.py). Os de Halloween (com o manto) são os do mês de outubro.
 */
export const COMPORTAMENTOS = LINHAS_ESQUELETO
export type IdComportamento = IdLinhaEsqueleto
export type Fantasia = 'nenhuma' | 'halloween'

/** A fantasia do mês: outubro é Halloween. */
export function fantasiaDoMes(d = new Date()): Fantasia {
  return d.getMonth() === 9 ? 'halloween' : 'nenhuma'
}

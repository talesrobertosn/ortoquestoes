import type { Estrutura, Faixa } from '../tipos'

/** Ossos longos divididos em proximal, diáfise e distal (cada fratura tem a sua classificação). */
const LONGOS = new Set(['humerus', 'radius', 'ulna', 'femur', 'tibia', 'fibula'])
export function ehOssoLongo(e: Estrutura) { return e.k === 'bone' && LONGOS.has(e.id.replace(/_[lr]$/, '')) }

/** Em posição anatômica o proximal fica em cima: o terço superior (28%) é proximal, o inferior é distal. */
export function faixaPorAltura(e: Estrutura, z: number): Faixa {
  const t = (z - e.b[2]) / Math.max(1, e.b[5] - e.b[2])
  return t > 0.72 ? 'proximal' : t < 0.28 ? 'distal' : 'diafise'
}

export const NOME_FAIXA: Record<Faixa, string> = { proximal: 'proximal', diafise: '(diáfise)', distal: 'distal' }

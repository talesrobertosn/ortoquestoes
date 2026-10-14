import type { Partida } from '../motor/regras'
import type { Cena } from './pintura'
import type { CenaAmbientada } from './cenariosPintados'

/** Só apresentação: não sorteia, escreve ou altera a sala escolhida pelo motor. */
export function paisagemDaParada(partida: Pick<Partida, 'fase' | 'sala'>, batalha: boolean, original: Cena): CenaAmbientada {
  if (!batalha) return 'biblioteca'
  if (partida.fase === 'loja') return 'vilarejo'
  if (partida.fase === 'portas') return 'vila'
  if (partida.fase === 'sabio') return 'ruinas'
  if (partida.fase === 'sala') {
    if (partida.sala?.tipo === 'curandeira') return 'estufa'
    if (partida.sala?.tipo === 'secreta') return 'praia'
    if (partida.sala?.tipo === 'evento') return 'campoflorido'
    if (partida.sala?.tipo === 'bau') return 'ruinas'
    if (partida.sala?.tipo === 'ferreiro') return 'forja'
  }
  return original
}

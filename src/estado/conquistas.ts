/**
 * Emblemas. Duas famílias:
 * - Volume: questões diferentes respondidas na conta (a mesma contagem que o
 *   ranking chama de total geral). É o emblema que aparece ao lado do nome.
 * - Sequência: o recorde de dias seguidos batendo a meta diária, calculado
 *   a partir do histórico local (`streak.ts`).
 * Os nomes seguem a trajetória da residência, do primeiro contato à chefia.
 * Cada emblema é desbloqueado uma vez e vale para sempre.
 */
export type NivelMedalha = 'bronze' | 'prata' | 'ouro' | 'esmeralda'

export interface Conquista {
  minimo: number
  rotulo: string
  /** Texto curto no centro da medalha. */
  curto: string
  nivel: NivelMedalha
}

export const CONQUISTAS: readonly Conquista[] = [
  { minimo: 50, rotulo: 'Primeiros passos', curto: '50', nivel: 'bronze' },
  { minimo: 100, rotulo: 'Interno', curto: '100', nivel: 'bronze' },
  { minimo: 250, rotulo: 'R1', curto: '250', nivel: 'prata' },
  { minimo: 500, rotulo: 'R2', curto: '500', nivel: 'prata' },
  { minimo: 1000, rotulo: 'R3', curto: '1k', nivel: 'ouro' },
  { minimo: 2000, rotulo: 'Preceptor', curto: '2k', nivel: 'ouro' },
  { minimo: 3000, rotulo: 'Chefe de serviço', curto: '3k', nivel: 'esmeralda' },
  { minimo: 4000, rotulo: 'Lenda do OrtoQuestões', curto: '4k', nivel: 'esmeralda' },
]

export const CONQUISTAS_SEQUENCIA: readonly Conquista[] = [
  { minimo: 3, rotulo: 'Aquecendo', curto: '3d', nivel: 'bronze' },
  { minimo: 7, rotulo: 'Semana firme', curto: '7d', nivel: 'prata' },
  { minimo: 30, rotulo: 'Mês de ferro', curto: '30d', nivel: 'ouro' },
  { minimo: 100, rotulo: 'Cem dias', curto: '100d', nivel: 'esmeralda' },
]

/** O emblema mais alto já alcançado, ou null se ainda não bateu o primeiro. */
export function conquistaAtual(total: number, lista: readonly Conquista[] = CONQUISTAS): Conquista | null {
  let atual: Conquista | null = null
  for (const c of lista) if (total >= c.minimo) atual = c
  return atual
}

/** O próximo emblema ainda não alcançado, para mostrar "faltam N". */
export function proximaConquista(total: number, lista: readonly Conquista[] = CONQUISTAS): Conquista | null {
  return lista.find((c) => total < c.minimo) ?? null
}

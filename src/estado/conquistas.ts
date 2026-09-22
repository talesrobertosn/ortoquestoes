/**
 * Emblemas por volume de questões respondidas (soma histórica, todas as
 * contas). Complementam a sequência diária (`streak.ts`): aqui o que conta
 * é o total acumulado, não a constância dia a dia. Calculado só a partir de
 * um número já disponível — no ranking, no ícone de "Desempenho" ou onde
 * mais aparecer — sem precisar de nada novo no Supabase.
 */
export interface Conquista {
  minimo: number
  emoji: string
  rotulo: string
}

export const CONQUISTAS: readonly Conquista[] = [
  { minimo: 50, emoji: '🌱', rotulo: 'Começando' },
  { minimo: 100, emoji: '📘', rotulo: 'Estudante dedicado' },
  { minimo: 250, emoji: '🔥', rotulo: 'Em ritmo' },
  { minimo: 500, emoji: '⚡', rotulo: 'Consistente' },
  { minimo: 1000, emoji: '🏅', rotulo: 'Mil questões' },
  { minimo: 2000, emoji: '🥈', rotulo: 'Veterano' },
  { minimo: 3000, emoji: '🥇', rotulo: 'Mestre do acervo' },
  { minimo: 4000, emoji: '🏆', rotulo: 'Lenda do OrtoQuestões' },
]

/** O emblema mais alto já alcançado, ou null se ainda não bateu o primeiro. */
export function conquistaAtual(total: number): Conquista | null {
  let atual: Conquista | null = null
  for (const c of CONQUISTAS) if (total >= c.minimo) atual = c
  return atual
}

/** O próximo emblema ainda não alcançado, para mostrar "faltam N questões". */
export function proximaConquista(total: number): Conquista | null {
  return CONQUISTAS.find((c) => total < c.minimo) ?? null
}

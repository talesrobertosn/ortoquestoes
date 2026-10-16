/**
 * Estágios da fogueira da sequência (redesenho de 16/10/2026): quanto mais dias seguidos,
 * maior a chama e mais rara a cor. A arte sai de scripts/gerar_fogueira_inicio.py, que usa os
 * mesmos limites e a mesma ordem (linha do sprite = índice do estágio); os dois andam juntos.
 */
export interface EstagioFogueira {
  /** Linha do sprite e classe CSS (ip-fogueira--<id>). */
  id: 'cinzas' | 'faisca' | 'fogueira' | 'labareda' | 'fogareu' | 'azul' | 'arcana' | 'lendaria'
  nome: string
  /** Dias seguidos a partir dos quais o estágio vale. */
  desde: number
}

export const ESTAGIOS_FOGUEIRA: readonly EstagioFogueira[] = [
  { id: 'cinzas', nome: 'Cinzas', desde: 0 },
  { id: 'faisca', nome: 'Faísca', desde: 1 },
  { id: 'fogueira', nome: 'Fogueira', desde: 3 },
  { id: 'labareda', nome: 'Labareda', desde: 7 },
  { id: 'fogareu', nome: 'Fogaréu', desde: 14 },
  { id: 'azul', nome: 'Chama azul', desde: 30 },
  { id: 'arcana', nome: 'Chama arcana', desde: 60 },
  { id: 'lendaria', nome: 'Chama lendária', desde: 100 },
]

export interface SituacaoFogueira {
  indice: number
  estagio: EstagioFogueira
  proximo: EstagioFogueira | null
  /** Dias que faltam para o próximo estágio (0 quando já está no último). */
  faltam: number
}

export function estagioDaSequencia(dias: number): SituacaoFogueira {
  const n = Math.max(0, Math.floor(Number.isFinite(dias) ? dias : 0))
  let indice = 0
  for (let i = 0; i < ESTAGIOS_FOGUEIRA.length; i++) if (n >= ESTAGIOS_FOGUEIRA[i].desde) indice = i
  const proximo = ESTAGIOS_FOGUEIRA[indice + 1] ?? null
  return { indice, estagio: ESTAGIOS_FOGUEIRA[indice], proximo, faltam: proximo ? proximo.desde - n : 0 }
}

/** "falta 1 dia para a Labareda", "faltam 4 dias para a Chama azul"; null no último estágio. */
export function textoProximoEstagio(dias: number): string | null {
  const { proximo, faltam } = estagioDaSequencia(dias)
  if (!proximo) return null
  return `${faltam === 1 ? 'falta 1 dia' : `faltam ${faltam} dias`} para ${proximo.id === 'fogareu' ? 'o' : 'a'} ${proximo.nome}`
}

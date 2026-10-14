export type AvaliacaoBiblioteca = 'sabia' | 'hesitei' | 'errei'
export interface PassoBiblioteca { area: string; avaliacao: AvaliacaoBiblioteca; clima: string }

/** Resumo apenas desta sessão; não é diagnóstico de domínio nem altera a revisão. */
export function diarioBiblioteca(passos: readonly PassoBiblioteca[]) {
  const areas = new Map<string, { area: string; total: number; sabia: number }>()
  const trechos: { clima: string; inicio: number; fim: number }[] = []
  let seguida = 0, melhor = 0
  passos.forEach((p, i) => {
    seguida = p.avaliacao === 'sabia' ? seguida + 1 : p.avaliacao === 'errei' ? 0 : seguida
    melhor = Math.max(melhor, seguida)
    const a = areas.get(p.area) ?? { area: p.area, total: 0, sabia: 0 }
    a.total++; a.sabia += Number(p.avaliacao === 'sabia'); areas.set(p.area, a)
    const anterior = trechos[trechos.length - 1]
    if (anterior?.clima === p.clima) anterior.fim = i + 1
    else trechos.push({ clima: p.clima, inicio: i + 1, fim: i + 1 })
  })
  const maisSegura = [...areas.values()].filter(a => a.total >= 3 && a.sabia > 0)
    .sort((a, b) => b.sabia / b.total - a.sabia / a.total || b.total - a.total || a.area.localeCompare(b.area, 'pt-BR'))[0] ?? null
  return { melhor, trechos, maisSegura }
}

export const ambienteBiblioteca = (tranquilo: boolean, clima?: string) =>
  tranquilo || clima === 'chuva' || clima === 'tempestade' ? 'chuva' as const : 'biblioteca' as const

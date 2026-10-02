import { useMemo } from 'react'
import { usarContextoLocal } from './usarContextoLocal'
import { lerHistorico } from './sessao'
import { ler } from './armazenamento'
import { calcularMetricas, desbloqueado, EMBLEMAS, type Metricas } from './conquistas'
import { calcularStreak, type Streak } from './streak'

/** Métricas das conquistas e sequência atual, a partir do progresso guardado na conta. */
export function usarConquistas(): { metricas: Metricas; streak: Streak; conquistadas: number; total: number } {
  const { contexto } = usarContextoLocal('')
  return useMemo(() => {
    const favoritas = ler<string[]>('favoritos', []).length
    const notas = Object.values(ler<Record<string, string>>('notas', {})).filter((t) => String(t ?? '').trim()).length
    const metricas = calcularMetricas(contexto.respondidas, lerHistorico(), { favoritas, notas })
    return {
      metricas,
      streak: calcularStreak(contexto.respondidas),
      conquistadas: EMBLEMAS.filter((e) => desbloqueado(e, metricas)).length,
      total: EMBLEMAS.length,
    }
  }, [contexto.respondidas])
}

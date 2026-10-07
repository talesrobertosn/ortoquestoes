import { useMemo } from 'react'
import { usarContextoLocal } from './usarContextoLocal'
import { lerHistorico } from './sessao'
import { ler } from './armazenamento'
import { calcularMetricas, desbloqueado, EMBLEMAS, type DadosAcervo, type GrupoProva, type Metricas } from './conquistas'
import { usarIndice } from '../dados/usarIndice'
import type { Indice } from '../dados/tipos'
import { calcularStreak, type Streak } from './streak'

/** Métricas das conquistas e sequência atual, a partir do progresso guardado na conta. */
/** Grupos de prova de cada questão, para os emblemas de especialista. */
function gruposDoIndice(indice: Indice | null): Map<string, GrupoProva[]> | undefined {
  if (!indice) return undefined
  const mapa = new Map<string, GrupoProva[]>()
  for (const q of indice.questoes) {
    const prova = q.p === null ? '' : indice.provas[q.p] ?? ''
    const grupos: GrupoProva[] = []
    if (prova === 'TEOT') grupos.push('teot')
    if (prova === 'TARO') grupos.push('taro')
    if (prova.startsWith('TECOC')) grupos.push('tecoc')
    if (prova === 'Fellowship Quadril') grupos.push('quadril')
    if (q.ar === 'mao') grupos.push('mao')
    if (q.ar === 'coluna') grupos.push('coluna')
    if (q.ar === 'enare') grupos.push('enare')
    if (grupos.length) mapa.set(q.id, grupos)
  }
  return mapa
}

/** Imagem, assuntos e provas vencíveis (TEOT e TARO de cada ano) de cada questão. */
function dadosDoAcervo(indice: Indice | null): DadosAcervo | undefined {
  if (!indice) return undefined
  const imagem = new Set<string>()
  const subtemas = new Map<string, number[]>()
  const prova = new Map<string, string>()
  const totalProva = new Map<string, number>()
  for (const q of indice.questoes) {
    if (q.dup) continue
    if (q.img) imagem.add(q.id)
    if (q.s.length) subtemas.set(q.id, q.s)
    const nome = q.p === null ? '' : indice.provas[q.p] ?? ''
    if ((nome === 'TEOT' || nome === 'TARO') && q.a && !q.an) {
      const chave = `${nome} ${q.a}`
      prova.set(q.id, chave)
      totalProva.set(chave, (totalProva.get(chave) ?? 0) + 1)
    }
  }
  return { imagem, subtemas, prova, totalProva }
}

export function usarConquistas(): { metricas: Metricas; streak: Streak; conquistadas: number; total: number } {
  const { contexto } = usarContextoLocal('')
  const { indice } = usarIndice()
  const grupos = useMemo(() => gruposDoIndice(indice), [indice])
  const acervo = useMemo(() => dadosDoAcervo(indice), [indice])
  return useMemo(() => {
    const favoritas = ler<string[]>('favoritos', []).length
    const notas = Object.values(ler<Record<string, string>>('notas', {})).filter((t) => String(t ?? '').trim()).length
    const metricas = calcularMetricas(contexto.respondidas, lerHistorico(), { favoritas, notas, grupos, acervo })
    return {
      metricas,
      streak: calcularStreak(contexto.respondidas),
      conquistadas: EMBLEMAS.filter((e) => desbloqueado(e, metricas)).length,
      total: EMBLEMAS.length,
    }
  }, [contexto.respondidas, grupos, acervo])
}

import { usarContextoLocal } from './usarContextoLocal'
import { lerHistorico } from './sessao'
import { ler } from './armazenamento'
import { useEffect, useMemo } from 'react'
import { calcularMetricas, completarMetricas, desbloqueado, EMBLEMAS, type DadosAcervo, type GrupoProva, type Metricas } from './conquistas'
import { registrarConquistas, usarFeitos } from '../conta/feitos'
import { usarIndice } from '../dados/usarIndice'
import type { Indice } from '../dados/tipos'
import { calcularStreak, type Streak } from './streak'
import { usarRitmoRevisao } from './preferencias'
import { usarMetricasFlashcards } from '../flashcards/emblemas'
import { usarArmazenado } from './usarArmazenado'
import { metricasBiblioteca } from '../biblioteca/conquistas'
import { CHAVE_BIBLIOTECA, type DocBiblioteca } from '../biblioteca/tipos'

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
  const totalTema = new Map<string, number>()
  const anuladas = new Set<string>()
  for (const q of indice.questoes) {
    if (q.dup) continue
    if (q.an) anuladas.add(q.id)
    else { const tema = q.id.replace(/-\d+$/, ''); totalTema.set(tema, (totalTema.get(tema) ?? 0) + 1) }
    if (q.img) imagem.add(q.id)
    if (q.s.length) subtemas.set(q.id, q.s)
    const nome = q.p === null ? '' : indice.provas[q.p] ?? ''
    if ((nome === 'TEOT' || nome === 'TARO') && q.a && !q.an) {
      const chave = `${nome} ${q.a}`
      prova.set(q.id, chave)
      totalProva.set(chave, (totalProva.get(chave) ?? 0) + 1)
    }
  }
  return { imagem, subtemas, prova, totalProva, totalTema, anuladas }
}

/** `comLendarios`: só a página de Conquistas carrega o acervo dos flashcards para contar os lendários. */
export function usarConquistas({ comLendarios = false }: { comLendarios?: boolean } = {}): { metricas: Metricas; streak: Streak; conquistadas: number; total: number } {
  const { contexto } = usarContextoLocal('')
  const { indice } = usarIndice()
  const grupos = useMemo(() => gruposDoIndice(indice), [indice])
  const acervo = useMemo(() => dadosDoAcervo(indice), [indice])
  const servidor = usarFeitos()
  const { ritmo } = usarRitmoRevisao()
  const folgas = ritmo.folgas.join(',')
  const flashcards = usarMetricasFlashcards(comLendarios)
  // Biblioteca de Resumos: marcações, notas, leituras e o tempo de leitura ativa (chave sincronizada).
  const [docsBiblioteca] = usarArmazenado<Record<string, DocBiblioteca>>(CHAVE_BIBLIOTECA, {})
  const biblioteca = useMemo(() => metricasBiblioteca(docsBiblioteca), [docsBiblioteca])
  const resultado = useMemo(() => {
    const favoritas = ler<string[]>('favoritos', []).length
    const notas = Object.values(ler<Record<string, string>>('notas', {})).filter((t) => String(t ?? '').trim()).length
    const base = calcularMetricas(contexto.respondidas, lerHistorico(), { favoritas, notas, grupos, acervo, servidor, flashcards, biblioteca, folgasRevisao: folgas ? folgas.split(',').map(Number) : [] })
    const metricas = completarMetricas({ ...base, travadas: new Set(servidor?.conquistas ?? []) })
    return {
      metricas,
      streak: calcularStreak(contexto.respondidas),
      conquistadas: EMBLEMAS.filter((e) => desbloqueado(e, metricas)).length,
      total: EMBLEMAS.length,
    }
  }, [contexto.respondidas, grupos, acervo, servidor, flashcards, biblioteca, folgas])
  // Trava no servidor o que acabou de ser conquistado (a sequência de dias não trava: ela se perde de propósito).
  useEffect(() => {
    if (!servidor || !acervo) return
    registrarConquistas(EMBLEMAS.filter((e) => e.familia !== 'sequencia' && desbloqueado(e, resultado.metricas)).map((e) => e.id))
  }, [resultado, servidor, acervo])
  return resultado
}

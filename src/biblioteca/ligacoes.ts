import { useEffect, useState } from 'react'
import { recurso } from '../config'
import { GRUPOS_ASSUNTOS } from '../dados/gruposAssuntos'
import type { IndiceAcervo } from '../flashcards/tipos'
import type { IndiceBiblioteca, ResumoCapitulo } from './tipos'

/**
 * Resumos e flashcards ligados entre si (27/10/2026): "Estudar flashcards deste tema" no resumo e na questão,
 * "Consultar resumo" na Biblioteca de flashcards. A ligação é sempre pelos nomes exatos dos assuntos da
 * taxonomia (o campo subtemas do resumo e o assunto do flashcard), nunca por palavras parecidas no texto.
 * Sem assunto em comum com flashcard publicado, o botão não aparece; sem resumo publicado, o link não aparece.
 */

type AreasDoAcervo = Pick<IndiceAcervo, 'areas'>

/** O recorte de flashcards de um tema: uma área só (a do resumo, se tiver) e os assuntos com flashcard nela. */
export interface AlvoFlashcards { area: string; assuntos: string[]; total: number }

export function flashcardsDosSubtemas(indice: AreasDoAcervo | null | undefined, subtemas: Iterable<string>, preferida?: string): AlvoFlashcards | null {
  if (!indice) return null
  const lista = [...new Set(subtemas)]
  let melhor: AlvoFlashcards | null = null
  for (const [area, dados] of Object.entries(indice.areas)) {
    const assuntos = lista.filter((s) => (dados.assuntos[s] ?? 0) > 0)
    if (!assuntos.length) continue
    const alvo = { area, assuntos, total: assuntos.reduce((n, s) => n + dados.assuntos[s], 0) }
    const ganha = !melhor || (area === preferida && melhor.area !== preferida) || (melhor.area !== preferida && alvo.total > melhor.total)
    if (ganha) melhor = alvo
  }
  return melhor
}

/** Abre a sessão já filtrada (a Biblioteca guarda o recorte para quando a sessão terminar). */
export function linkFlashcards(alvo: AlvoFlashcards, tema?: string, n = 20): string {
  const q = new URLSearchParams({ categoria: 'todos', n: String(n), area: alvo.area })
  for (const a of alvo.assuntos) q.append('assunto', a)
  if (tema) q.set('tema', tema)
  return `/flashcards/biblioteca?${q}`
}

/** Os assuntos de um recorte da Biblioteca de flashcards: os marcados, senão os do grupo (área inteira é ampla demais). */
export function assuntosDoRecorte(f: { area: string | null; grupo: string | null; assuntos: string[] }): string[] {
  if (!f.area) return []
  if (f.assuntos.length) return f.assuntos
  return GRUPOS_ASSUNTOS[f.area]?.find((g) => g.id === f.grupo)?.assuntos ?? []
}

/** Resumos de um recorte de flashcards: os que ensinam mais assuntos dele primeiro; empate, os da mesma área. */
export function resumosDoRecorte(biblioteca: IndiceBiblioteca | null, area: string, assuntos: string[], limite = 2): ResumoCapitulo[] {
  if (!biblioteca || !assuntos.length) return []
  const alvo = new Set(assuntos)
  return biblioteca.capitulos
    .map((c) => ({ c, n: (c.subtemas ?? []).filter((s) => alvo.has(s)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || Number(b.c.especialidade === area) - Number(a.c.especialidade === area))
    .slice(0, limite).map((x) => x.c)
}

let indice: Promise<AreasDoAcervo | null> | null = null
const carregar = () => (indice ??= fetch(recurso('flashcards/indice.json'), { cache: 'no-cache' })
  .then((r) => (r.ok ? r.json() as Promise<AreasDoAcervo> : null)).catch(() => { indice = null; return null }))

/** Só o índice do acervo de flashcards (as contagens por assunto), sem baixar os flashcards. */
export function usarAreasDosFlashcards(): AreasDoAcervo | null {
  const [areas, definir] = useState<AreasDoAcervo | null>(null)
  useEffect(() => {
    let vivo = true
    carregar().then((i) => { if (vivo) definir(i) })
    return () => { vivo = false }
  }, [])
  return areas
}

import { useEffect, useState } from 'react'
import { BIBLIOTECA_PUBLICA } from '../config'
import type { Indice } from '../dados/tipos'
import { ler } from '../estado/armazenamento'
import { carregarIndiceBiblioteca } from './conteudo'
import type { IndiceBiblioteca, ResumoCapitulo } from './tipos'

/**
 * Sugestões de leitura da Biblioteca fora dela (cronograma, página inicial, questão).
 * O resumo "combina" com um assunto quando ensina um dos subtemas do acervo (campo subtemas do índice,
 * tirado das questões de prova que ele cita). Nada aqui inventa relação: sem subtema em comum, não sugere.
 */
export const bibliotecaVisivel = () => BIBLIOTECA_PUBLICA || ler<boolean>('resumos:visto', false)

export function usarIndiceBiblioteca(): IndiceBiblioteca | null {
  const [indice, definir] = useState<IndiceBiblioteca | null>(null)
  useEffect(() => {
    if (!bibliotecaVisivel()) return
    let vivo = true
    carregarIndiceBiblioteca().then((i) => { if (vivo) definir(i) }).catch(() => {})
    return () => { vivo = false }
  }, [])
  return indice
}

/** Resumos que ensinam algum destes subtemas, do que mais casa para o que menos. */
export function resumosDosSubtemas(biblioteca: IndiceBiblioteca | null, subtemas: Iterable<string>): ResumoCapitulo[] {
  if (!biblioteca) return []
  const alvo = new Set(subtemas)
  return biblioteca.capitulos
    .map((c) => ({ c, n: (c.subtemas ?? []).filter((s) => alvo.has(s)).length }))
    .filter((x) => x.n > 0).sort((a, b) => b.n - a.n).map((x) => x.c)
}

/** Nomes dos subtemas das questões (pelo índice do acervo). */
export function subtemasDasQuestoes(indice: Indice | null | undefined, ids: Iterable<string>): Set<string> {
  const saida = new Set<string>()
  if (!indice) return saida
  const quero = new Set(ids)
  for (const q of indice.questoes) if (quero.has(q.id)) for (const s of q.s) { const nome = indice.subtemas[s]; if (nome) saida.add(nome) }
  return saida
}

/** Embaralha de um jeito estável no dia (a caixa não troca de livro a cada visita). */
export function ordemDoDia<T extends { id: string }>(lista: T[], dia: string): T[] {
  const peso = (id: string) => { let h = 2166136261; for (const ch of dia + id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0 }
  return [...lista].sort((a, b) => peso(a.id) - peso(b.id))
}

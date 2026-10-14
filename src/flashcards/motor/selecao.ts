/**
 * Jornada única (diretriz do Tales, 13/10/2026): a Cripta começa fácil e fica
 * mais difícil, sempre nesta ordem de grupos:
 *   1. questões que a pessoa já fez e acertou (diretriz de 14/10/2026);
 *   2. questões de maior acerto da turma;
 *   3. questões que a pessoa já fez e errou;
 *   4. questões novas (que a pessoa nunca fez nem viu em flashcard);
 * e só depois a mistura livre. Dentro de cada grupo o sorteio é uniforme
 * (completamente aleatório, pela semente). Grupos vazios são pulados, e um
 * flashcard nunca repete no lote.
 * As faixas vêm de estatísticas reais com pelo menos três respondentes.
 * A rodada persistida evita reiniciar a introdução a cada reposição de baralho.
 */
import type { Flashcard, Raridade } from '../tipos'
import { sortear } from './aleatorio'
import { NIVEIS, type NivelJogo } from './regras'

export interface RegistroLeve { c?: boolean | null; proximaRevisao?: number | null; sequencia?: number; confianca?: string; q?: number }

export interface ContextoSelecao {
  registros: Record<string, RegistroLeve | undefined>
  /** Ids vistos recentemente (das últimas partidas), do mais novo ao mais velho. */
  recentes: string[]
  agora: number
  /** Filtros da sessão (área, só imagem). Vazio = acervo todo. */
  areas?: string[]
  soImagem?: boolean
  /** Dificuldade da partida: muda a mistura de flashcards fáceis, moderados e difíceis. */
  nivel?: NivelJogo
  /** Respostas às QUESTÕES de origem, independentes dos flashcards. */
  questoes?: Record<string, RegistroLeve | undefined>
  turma?: ReadonlyMap<string, { respondentes: number; acerto: number }> | null
  inicio?: number
  faixas?: ReadonlyMap<string, 1 | 2 | 3> | null
  /** Filtro extra (poderes Mapa do especialista e Desvio de área). */
  aceita?: (c: Flashcard) => boolean
}

/** Flashcards sorteados em cada grupo antes de passar ao seguinte. */
export const POR_GRUPO = 8
export const GRUPOS_DA_JORNADA = ['acertadas por você', 'maior acerto da turma', 'erradas por você', 'novas'] as const

const PESO_RARIDADE: Record<Raridade, number> = { lendaria: 4, epica: 2.8, rara: 1.9, comum: 1.3 }

export function pesoDoFlashcard(c: Flashcard, ctx: ContextoSelecao, posRecente: number | undefined): number {
  let p = PESO_RARIDADE[c.raridade] ?? 1
  const r = ctx.registros[c.id]
  if (!r) p *= 1.5
  else if (r.c === false) p *= 2.2
  else if (r.proximaRevisao != null && r.proximaRevisao <= ctx.agora) p *= 2.5
  else p *= 0.45 // estudado e ainda não venceu: aparece menos
  if (c.imagem) p *= 1.3
  if (ctx.nivel) p *= NIVEIS[ctx.nivel].pesoFlashcard[c.dificuldade] ?? 1
  // exposição recente: quanto mais novo na memória, menor a chance
  if (posRecente !== undefined) p *= 0.05 + 0.95 * Math.min(1, posRecente / 300)
  return p
}

/** Flashcards que a Batalha pode usar (alternativas curtas, validados) dentro dos filtros. */
export function elegiveisParaBatalha(pool: Flashcard[], ctx: Pick<ContextoSelecao, 'areas' | 'soImagem' | 'aceita'>) {
  return pool.filter((c) => c.batalha !== false && c.opcoes.length >= 2
    && (!ctx.areas?.length || ctx.areas.includes(c.areaId ?? '')) && (!ctx.soImagem || !!c.imagem) && (!ctx.aceita || ctx.aceita(c)))
}

/**
 * Sorteia `n` flashcards distintos. Devolve os ids na ordem de jogo e a
 * próxima semente. `excluir` tira os que já estão na partida.
 */
export function montarBaralho(pool: Flashcard[], ctx: ContextoSelecao, semente: number, n: number, excluir: ReadonlySet<string> = new Set()): [string[], number] {
  let s = semente
  const elegiveis = elegiveisParaBatalha(pool, ctx).filter(c => !excluir.has(c.id))
  const taxas = [...new Map(elegiveis.flatMap(c => {
    const t = ctx.turma?.get(c.questao)
    return t && t.respondentes >= 3 && Number.isFinite(t.acerto) ? [[c.questao, t.acerto] as const] : []
  })).values()].sort((a,b) => b-a)
  // Quartil de maior acerto real. Empates pertencem ao mesmo grupo.
  const corte = taxas.length ? taxas[Math.max(0, Math.ceil(taxas.length / 4)-1)] : Infinity
  const usados = new Set<string>()
  const saida: Flashcard[] = []
  const grupos = [
    (c: Flashcard) => ctx.questoes?.[c.questao]?.c === true,
    (c: Flashcard) => { const t=ctx.turma?.get(c.questao); return ctx.faixas?.get(c.questao) === 1 || (!!t && t.respondentes >= 3 && t.acerto >= corte) },
    (c: Flashcard) => ctx.questoes?.[c.questao]?.c === false,
    (c: Flashcard) => !ctx.questoes?.[c.questao] && !ctx.registros[c.id],
  ]
  const nGrupos = grupos.length
  let inicio = ctx.inicio ?? 0
  while (saida.length < n) {
    const fase = Math.floor(inicio / POR_GRUPO)
    const lista = elegiveis.filter(c => !usados.has(c.id) && (fase >= nGrupos || grupos[fase](c)))
    if (!lista.length) {
      if (fase >= nGrupos) break
      inicio = (fase + 1) * POR_GRUPO
      continue
    }
    const [u, proxima] = sortear(s); s = proxima
    const c = lista[Math.min(lista.length-1, Math.floor(u * lista.length))]
    usados.add(c.id); saida.push(c); inicio++
  }
  return [saida.map(c => c.id), s]
}

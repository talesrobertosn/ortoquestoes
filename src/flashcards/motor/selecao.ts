/**
 * Seleção procedural dos flashcards de uma partida, com semente reproduzível.
 *
 * Princípio (mega plano, etapa 4): a dificuldade do RPG vem das regras do
 * combate, não de perguntas cada vez mais obscuras. Um jogador no andar 20
 * ainda recebe flashcards fáceis, moderados e difíceis.
 *
 * O peso de cada flashcard combina, só com dados reais:
 *   - incidência do assunto na prova (a raridade sai de src/dados/incidencia.json);
 *   - revisão vencida e erro anterior (a fila de revisão dos flashcards);
 *   - nunca estudado;
 *   - figura da questão (valorizada sem exagero);
 *   - exposição recente (o que saiu nas últimas partidas quase não volta).
 * O sorteio sem reposição usa chaves de Efraimidis-Spirakis (u^(1/peso)), e a
 * ordem final espalha os assuntos para não repetir o mesmo tema em seguida.
 */
import type { Flashcard, Raridade } from '../tipos'
import { sortear } from './aleatorio'

export interface RegistroLeve { c?: boolean | null; proximaRevisao?: number | null; sequencia?: number; confianca?: string; q?: number }

export interface ContextoSelecao {
  registros: Record<string, RegistroLeve | undefined>
  /** Ids vistos recentemente (das últimas partidas), do mais novo ao mais velho. */
  recentes: string[]
  agora: number
  /** Filtros da sessão (área, só imagem). Vazio = acervo todo. */
  areas?: string[]
  soImagem?: boolean
}

const PESO_RARIDADE: Record<Raridade, number> = { lendaria: 4, epica: 2.8, rara: 1.9, comum: 1.3 }

export function pesoDoFlashcard(c: Flashcard, ctx: ContextoSelecao, posRecente: number | undefined): number {
  let p = PESO_RARIDADE[c.raridade] ?? 1
  const r = ctx.registros[c.id]
  if (!r) p *= 1.5
  else if (r.c === false) p *= 2.2
  else if (r.proximaRevisao != null && r.proximaRevisao <= ctx.agora) p *= 2.5
  else p *= 0.45 // estudado e ainda não venceu: aparece menos
  if (c.imagem) p *= 1.3
  // exposição recente: quanto mais novo na memória, menor a chance
  if (posRecente !== undefined) p *= 0.05 + 0.95 * Math.min(1, posRecente / 300)
  return p
}

/** Flashcards que a Batalha pode usar (alternativas curtas, validados) dentro dos filtros. */
export function elegiveisParaBatalha(pool: Flashcard[], ctx: Pick<ContextoSelecao, 'areas' | 'soImagem'>) {
  return pool.filter((c) => c.batalha !== false && c.opcoes.length >= 2
    && (!ctx.areas?.length || ctx.areas.includes(c.areaId ?? '')) && (!ctx.soImagem || !!c.imagem))
}

/**
 * Sorteia `n` flashcards distintos. Devolve os ids na ordem de jogo e a
 * próxima semente. `excluir` tira os que já estão na partida.
 */
export function montarBaralho(pool: Flashcard[], ctx: ContextoSelecao, semente: number, n: number, excluir: ReadonlySet<string> = new Set()): [string[], number] {
  const pos = new Map(ctx.recentes.map((id, i) => [id, i]))
  let s = semente
  const chaves: Array<{ c: Flashcard; k: number }> = []
  for (const c of elegiveisParaBatalha(pool, ctx)) {
    if (excluir.has(c.id)) continue
    const [u, p] = sortear(s); s = p
    const w = pesoDoFlashcard(c, ctx, pos.get(c.id))
    chaves.push({ c, k: Math.log(Math.max(u, 1e-12)) / w })
  }
  chaves.sort((a, b) => b.k - a.k)
  const escolhidos = chaves.slice(0, n).map((x) => x.c)
  return [espalhar(escolhidos).map((c) => c.id), s]
}

/** Reordena para não cair o mesmo assunto (ou a mesma área) duas vezes seguidas, quando houver como. */
function espalhar(cartas: Flashcard[]): Flashcard[] {
  const resto = cartas.slice(), saida: Flashcard[] = []
  while (resto.length) {
    const ult = saida[saida.length - 1], penult = saida[saida.length - 2]
    let i = resto.findIndex((c) => c.assunto !== ult?.assunto && c.assunto !== penult?.assunto && c.areaId !== ult?.areaId)
    if (i < 0) i = resto.findIndex((c) => c.assunto !== ult?.assunto)
    if (i < 0) i = 0
    saida.push(resto.splice(i, 1)[0])
  }
  return saida
}

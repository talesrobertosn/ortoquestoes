import { normalizar } from '../../dados/acervo'
import { GRUPOS_ASSUNTOS, OUTROS_ASSUNTOS, grupoDoAssunto } from '../../dados/gruposAssuntos'
import type { Flashcard } from '../tipos'

/**
 * Filtro por assunto da Biblioteca de flashcards (27/10/2026): Área > Grupo > Assunto.
 * Área é o tema do acervo (areaId), assunto é o subtema que o flashcard herdou da questão de origem
 * (campo assunto e, quando a questão tinha mais de um, subtemas), e o grupo vem da tabela de
 * src/dados/gruposAssuntos.ts. Nada é deduzido do texto do flashcard. Regras puras, sem React.
 */
export interface FiltroAssunto { area: string | null; grupo: string | null; assuntos: string[] }
export const FILTRO_VAZIO: FiltroAssunto = { area: null, grupo: null, assuntos: [] }

export interface NoAssuntoFc { nome: string; total: number }
export interface NoGrupoFc { id: string; nome: string; total: number; assuntos: NoAssuntoFc[] }
export interface NoAreaFc { id: string; nome: string; total: number; grupos: NoGrupoFc[] }

export const areaDaCarta = (c: Pick<Flashcard, 'areaId' | 'area'>) => c.areaId ?? c.area
/** Os assuntos do flashcard: o principal e os demais subtemas da questão de origem, sem repetir. */
export function assuntosDaCarta(c: Pick<Flashcard, 'assunto' | 'subtemas'>): string[] {
  return [...new Set([c.assunto, ...(c.subtemas ?? [])].filter(Boolean))]
}
/**
 * Cada assunto do flashcard com o seu grupo na área. Assunto de fora da tabela vai para "Outros
 * assuntos" só quando é o principal; os secundários de fora (de outra área) ficam de fora.
 */
export function paresDaCarta(c: Pick<Flashcard, 'areaId' | 'area' | 'assunto' | 'subtemas'>): Array<{ assunto: string; grupo: string }> {
  const area = areaDaCarta(c)
  return assuntosDaCarta(c)
    .map((assunto) => ({ assunto, grupo: grupoDoAssunto(area, assunto).id }))
    .filter((p) => p.grupo !== OUTROS_ASSUNTOS.id || p.assunto === c.assunto)
}
/** Os grupos do flashcard dentro da área (sem nenhum assunto reconhecido, "Outros assuntos"). */
export function gruposDaCarta(c: Pick<Flashcard, 'areaId' | 'area' | 'assunto' | 'subtemas'>): string[] {
  const ids = new Set(paresDaCarta(c).map((p) => p.grupo))
  return ids.size ? [...ids] : [OUTROS_ASSUNTOS.id]
}

export const filtroAtivo = (f: FiltroAssunto) => !!f.area

/** O flashcard está no recorte? Assuntos marcados valem mais que o grupo, que vale mais que a área. */
export function casaFiltro(c: Flashcard, f: FiltroAssunto): boolean {
  if (!f.area) return true
  if (areaDaCarta(c) !== f.area) return false
  if (f.assuntos.length) return paresDaCarta(c).some((p) => f.assuntos.includes(p.assunto))
  if (f.grupo) return gruposDaCarta(c).includes(f.grupo)
  return true
}

const colacao = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })
const ehResto = (s: string) => /^outr[ao]s? /i.test(s)
const ordenar = (a: string, b: string) => Number(ehResto(a)) - Number(ehResto(b)) || colacao.compare(a, b)

/**
 * A árvore com as quantidades reais, contando só os flashcards que `aceita` deixa passar (os filtros
 * de tipo, dificuldade e "só novos" da Biblioteca). Assuntos da tabela sem flashcard aparecem com 0,
 * para a pessoa saber que existem; o grupo "Outros assuntos" só aparece quando tem flashcard.
 */
export function arvoreFlashcards(cartas: readonly Flashcard[], nomesArea: Record<string, string>, aceita: (c: Flashcard) => boolean = () => true): NoAreaFc[] {
  const areas = new Map<string, { total: number; grupos: Map<string, { total: number; assuntos: Map<string, number> }> }>()
  const daArea = (id: string) => {
    let a = areas.get(id)
    if (!a) {
      a = { total: 0, grupos: new Map() }
      for (const g of GRUPOS_ASSUNTOS[id] ?? []) a.grupos.set(g.id, { total: 0, assuntos: new Map(g.assuntos.map((s) => [s, 0])) })
      areas.set(id, a)
    }
    return a
  }
  for (const id of Object.keys(nomesArea)) daArea(id)
  for (const c of cartas) {
    const id = areaDaCarta(c)
    if (!id || !(id in nomesArea)) continue
    const a = daArea(id)
    if (!aceita(c)) continue
    a.total++
    const vistos = new Set<string>()
    for (const { assunto, grupo } of paresDaCarta(c)) {
      let g = a.grupos.get(grupo)
      if (!g) { g = { total: 0, assuntos: new Map() }; a.grupos.set(grupo, g) }
      g.assuntos.set(assunto, (g.assuntos.get(assunto) ?? 0) + 1)
      if (!vistos.has(grupo)) { vistos.add(grupo); g.total++ }
    }
  }
  const nomeGrupo = (area: string, id: string) => (GRUPOS_ASSUNTOS[area] ?? []).find((g) => g.id === id)?.nome ?? OUTROS_ASSUNTOS.nome
  return [...areas.entries()]
    .map(([id, a]) => ({
      id, nome: nomesArea[id] ?? id, total: a.total,
      grupos: [...a.grupos.entries()]
        .filter(([gid, g]) => gid !== OUTROS_ASSUNTOS.id || g.assuntos.size > 0)
        .map(([gid, g]) => ({ id: gid, nome: nomeGrupo(id, gid), total: g.total, assuntos: [...g.assuntos.entries()].map(([nome, total]) => ({ nome, total })).sort((x, y) => ordenar(x.nome, y.nome)) })),
    }))
    .sort((x, y) => colacao.compare(x.nome, y.nome))
}

/** Uma área com um grupo só pula esse nível: os assuntos aparecem direto. */
export const temGrupos = (area: NoAreaFc | undefined) => !!area && area.grupos.length > 1

/** Tira o que não existe mais (link antigo, assunto renomeado) e mantém o filtro coerente. */
export function normalizarFiltro(f: Partial<FiltroAssunto> | null | undefined, arvore: readonly NoAreaFc[]): FiltroAssunto {
  const area = arvore.find((a) => a.id === f?.area)
  if (!area) return FILTRO_VAZIO
  const grupo = area.grupos.find((g) => g.id === f?.grupo) ?? null
  const possiveis = new Set((grupo ? [grupo] : area.grupos).flatMap((g) => g.assuntos.map((a) => a.nome)))
  const assuntos = [...new Set((Array.isArray(f?.assuntos) ? f.assuntos : []).filter((a) => typeof a === 'string' && possiveis.has(a)))]
  // assunto escolhido sem grupo: o grupo é o dele (assim a navegação e os chips mostram o caminho certo)
  const grupoDoPrimeiro = !grupo && assuntos.length ? area.grupos.find((g) => assuntos.every((a) => g.assuntos.some((x) => x.nome === a))) ?? null : null
  return { area: area.id, grupo: (grupo ?? grupoDoPrimeiro)?.id ?? null, assuntos }
}

/** O caminho escrito, para o título da sessão e a migalha: "Ortopedia pediátrica > Fraturas > Lesões fisárias". */
export function caminhoDoFiltro(f: FiltroAssunto, arvore: readonly NoAreaFc[]): string[] {
  const area = arvore.find((a) => a.id === f.area)
  if (!area) return []
  const grupo = temGrupos(area) ? area.grupos.find((g) => g.id === f.grupo) : undefined
  const assuntos = f.assuntos.length === 1 ? f.assuntos : f.assuntos.length > 1 ? [`${f.assuntos.length} assuntos`] : []
  return [area.nome, ...(grupo ? [grupo.nome] : []), ...assuntos]
}

export interface ResultadoBusca { filtro: FiltroAssunto; nome: string; caminho: string; total: number; nivel: 'area' | 'grupo' | 'assunto' }
/** Busca sem acento por área, grupo ou assunto; assuntos primeiro, os que têm flashcard antes. */
export function buscarAssunto(arvore: readonly NoAreaFc[], termo: string, limite = 12): ResultadoBusca[] {
  const t = normalizar(termo.trim())
  if (t.length < 2) return []
  const saida: ResultadoBusca[] = []
  const peso = { assunto: 0, grupo: 1, area: 2 }
  for (const area of arvore) {
    if (normalizar(area.nome).includes(t)) saida.push({ filtro: { area: area.id, grupo: null, assuntos: [] }, nome: area.nome, caminho: 'Área inteira', total: area.total, nivel: 'area' })
    for (const grupo of area.grupos) {
      if (temGrupos(area) && normalizar(grupo.nome).includes(t)) saida.push({ filtro: { area: area.id, grupo: grupo.id, assuntos: [] }, nome: grupo.nome, caminho: area.nome, total: grupo.total, nivel: 'grupo' })
      for (const assunto of grupo.assuntos) {
        if (normalizar(assunto.nome).includes(t)) saida.push({ filtro: { area: area.id, grupo: grupo.id, assuntos: [assunto.nome] }, nome: assunto.nome, caminho: temGrupos(area) ? `${area.nome} › ${grupo.nome}` : area.nome, total: assunto.total, nivel: 'assunto' })
      }
    }
  }
  return saida.sort((a, b) => peso[a.nivel] - peso[b.nivel] || Number(b.total > 0) - Number(a.total > 0) || colacao.compare(a.nome, b.nome)).slice(0, limite)
}

/** O filtro no endereço da Biblioteca: ?area=pediatria&grupo=fraturas&assunto=Lesões%20fisárias (assunto pode repetir). */
export function filtroDaConsulta(q: URLSearchParams): Partial<FiltroAssunto> | null {
  const area = q.get('area')
  if (!area || q.getAll('area').length > 1) return null
  return { area, grupo: q.get('grupo'), assuntos: q.getAll('assunto') }
}
export function consultaDoFiltro(f: FiltroAssunto): URLSearchParams {
  const q = new URLSearchParams()
  if (!f.area) return q
  q.set('area', f.area)
  if (f.grupo) q.set('grupo', f.grupo)
  for (const a of f.assuntos) q.append('assunto', a)
  return q
}

import type { Leitura, ResumoCapitulo } from './tipos'

/**
 * Regras puras da vitrine da Biblioteca (redesenho de 27/10/2026): livro de cada resumo, ordem dos
 * capítulos, estado de leitura, filtros e o próximo capítulo publicado. Sem React, para o teste
 * (fixtures/testar_estante_biblioteca.mjs) e para o leitor usarem as mesmas contas.
 */

export type EstadoLeitura = 'novo' | 'andamento' | 'concluido'
export type OrdemEstante = 'livro' | 'recentes' | 'cobrados' | 'titulo'
export interface FiltrosEstante { q: string; livro: string | null; area: string | null; progresso: EstadoLeitura | null; ordem: OrdemEstante }

export const FILTROS_PADRAO: FiltrosEstante = { q: '', livro: null, area: null, progresso: null, ordem: 'livro' }
const ORDENS: OrdemEstante[] = ['livro', 'recentes', 'cobrados', 'titulo']
const ESTADOS: EstadoLeitura[] = ['novo', 'andamento', 'concluido']

export const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** "10ª edição (2025)" e "10ª edição" são o mesmo livro: a chave ignora o ano entre parênteses. */
const edicaoSemAno = (edicao: string) => edicao.replace(/\s*\(.*?\)\s*/g, '').trim()
export const chaveLivro = (c: Pick<ResumoCapitulo, 'livro' | 'edicao'>) => `${c.livro}|${edicaoSemAno(c.edicao)}`

/** "Rockwood adulto", "Rockwood infantil" ou o nome do livro sem o subtítulo. */
export function nomeCurtoLivro(livro: string): string {
  if (/Fractures in Children/i.test(livro)) return 'Rockwood infantil'
  if (/Fractures in Adults/i.test(livro)) return 'Rockwood adulto'
  return livro.replace(/:.*$/, '').trim()
}
/** "Rockwood infantil · 10ª ed." */
export function rotuloLivro(c: Pick<ResumoCapitulo, 'livro' | 'edicao'>): string {
  const ed = edicaoSemAno(c.edicao).replace(/\s*edição$/i, ' ed.')
  return `${nomeCurtoLivro(c.livro)} · ${ed}`
}
/** Número do capítulo no livro ("Capítulo 19 · ..." → 19); sem número, vai para o fim. */
export function numeroCapitulo(c: Pick<ResumoCapitulo, 'capitulo'>): number {
  const n = Number(c.capitulo.match(/\d+/)?.[0])
  return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER
}
/** O título em inglês do capítulo ("Capítulo 19 · Shoulder ..." → "Shoulder ..."). */
export const tituloOriginal = (c: Pick<ResumoCapitulo, 'capitulo'>) => c.capitulo.split('·').slice(1).join('·').trim()

export function estadoLeitura(l?: Pick<Leitura, 'em' | 'concluidoEm'>): EstadoLeitura {
  return l?.concluidoEm ? 'concluido' : l?.em ? 'andamento' : 'novo'
}

/** Livros na ordem da estante: pelo nome; a edição mais nova primeiro. */
export function livrosDaEstante(capitulos: ResumoCapitulo[]): Array<{ chave: string; rotulo: string; capitulos: ResumoCapitulo[] }> {
  const mapa = new Map<string, ResumoCapitulo[]>()
  for (const c of capitulos) { const k = chaveLivro(c); mapa.set(k, [...(mapa.get(k) ?? []), c]) }
  const edicao = (k: string) => Number(k.split('|')[1].match(/\d+/)?.[0] ?? 0)
  return [...mapa].sort(([a], [b]) => nomeCurtoLivro(a.split('|')[0]).localeCompare(nomeCurtoLivro(b.split('|')[0]), 'pt-BR') || edicao(b) - edicao(a))
    .map(([chave, lista]) => ({ chave, rotulo: rotuloLivro(lista[0]), capitulos: [...lista].sort(compararNoLivro) }))
}
const compararNoLivro = (a: ResumoCapitulo, b: ResumoCapitulo) => numeroCapitulo(a) - numeroCapitulo(b) || a.titulo.localeCompare(b.titulo, 'pt-BR')

export function filtrarEstante(capitulos: ResumoCapitulo[], f: FiltrosEstante, leituras: Record<string, Leitura | undefined>): ResumoCapitulo[] {
  const q = normalizar(f.q.trim())
  const lista = capitulos.filter((c) => (!f.livro || chaveLivro(c) === f.livro) && (!f.area || c.especialidade === f.area)
    && (!f.progresso || estadoLeitura(leituras[c.id]) === f.progresso)
    && (!q || normalizar(`${c.titulo} ${c.livro} ${c.capitulo} ${c.resumo} ${c.secoes.map((s) => s.titulo).join(' ')}`).includes(q)))
  if (f.ordem === 'recentes') return lista.sort((a, b) => (leituras[b.id]?.em ?? 0) - (leituras[a.id]?.em ?? 0) || compararNoLivro(a, b))
  if (f.ordem === 'cobrados') return lista.sort((a, b) => b.questoes.length - a.questoes.length || compararNoLivro(a, b))
  if (f.ordem === 'titulo') return lista.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
  return lista.sort((a, b) => chaveLivro(a).localeCompare(chaveLivro(b)) || compararNoLivro(a, b))
}

export const filtrosAtivos = (f: FiltrosEstante) => !!(f.q.trim() || f.livro || f.area || f.progresso)

/** Os filtros vão no endereço (#/resumos?livro=…): voltar do leitor reabre a estante igual. */
export function filtrosDaConsulta(consulta: URLSearchParams): FiltrosEstante {
  const progresso = consulta.get('progresso') as EstadoLeitura | null
  const ordem = consulta.get('ordem') as OrdemEstante | null
  return {
    q: consulta.get('q') ?? '', livro: consulta.get('livro') || null, area: consulta.get('area') || null,
    progresso: progresso && ESTADOS.includes(progresso) ? progresso : null, ordem: ordem && ORDENS.includes(ordem) ? ordem : 'livro',
  }
}
export function consultaDosFiltros(f: FiltrosEstante): string {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.livro) p.set('livro', f.livro)
  if (f.area) p.set('area', f.area)
  if (f.progresso) p.set('progresso', f.progresso)
  if (f.ordem !== 'livro') p.set('ordem', f.ordem)
  return p.toString()
}

/** O próximo capítulo publicado do mesmo livro e edição, na ordem do livro; nenhum se este for o último. */
export function proximoCapitulo(capitulos: ResumoCapitulo[], atual: Pick<ResumoCapitulo, 'id' | 'livro' | 'edicao' | 'capitulo'>): ResumoCapitulo | null {
  const n = numeroCapitulo(atual)
  return capitulos.filter((c) => c.id !== atual.id && chaveLivro(c) === chaveLivro(atual) && numeroCapitulo(c) > n)
    .sort(compararNoLivro)[0] ?? null
}

/** Onde a pessoa deixou a estante (filtros e busca, na aba): o "Biblioteca" do leitor reabre igual. */
export const CHAVE_CONSULTA_ESTANTE = 'resumos:estante'
export function voltarAEstante(): string {
  try { const c = sessionStorage.getItem(CHAVE_CONSULTA_ESTANTE); return c ? `/resumos?${c}` : '/resumos' } catch { return '/resumos' }
}

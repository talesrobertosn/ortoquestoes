import type { ResumoCapitulo } from './tipos'
import { apelidoLivro, chaveLivro, nomeCurtoLivro, normalizar, rotuloLivro } from './estante'

/**
 * Busca da Biblioteca 3.0 (31/10/2026, pedido do Tales: "encontrar um conteúdo deve ser fácil"). Regras puras, sem
 * React, para o teste (fixtures/testar_busca_biblioteca.mjs), a estante e a lista usarem a mesma conta.
 *
 * - Sem acento e sem maiúscula; palavra por palavra ("femur colo" acha "Fratura do colo do fêmur").
 * - Cada palavra digitada precisa aparecer no resumo (inteira, como começo de palavra, no singular ou no plural, por
 *   um sinônimo da lista abaixo ou com UMA letra trocada em palavras de 5 letras ou mais). Sem similaridade solta: a
 *   busca não inventa parentesco entre assuntos.
 * - Olha o título, as partes do resumo (onde moram as classificações: Garden, Schatzker, Neer...), os subtemas, o
 *   livro, a edição, o capítulo (com o título original em inglês), a área e o texto de apresentação.
 */

/** As áreas da estante, na ordem do acervo (slug dos temas). */
export const AREAS_BIBLIOTECA: Array<{ slug: string; nome: string }> = [
  { slug: 'conceitos-basicos', nome: 'Conceitos básicos' }, { slug: 'trauma', nome: 'Trauma' }, { slug: 'quadril', nome: 'Quadril' },
  { slug: 'joelho', nome: 'Joelho' }, { slug: 'ombro-cotovelo', nome: 'Ombro e cotovelo' }, { slug: 'mao', nome: 'Mão e punho' },
  { slug: 'coluna', nome: 'Coluna' }, { slug: 'pediatria', nome: 'Ortopedia pediátrica' }, { slug: 'tumores', nome: 'Tumores' }, { slug: 'pe-tornozelo', nome: 'Pé e tornozelo' },
]
export const nomeArea = (slug: string) => AREAS_BIBLIOTECA.find((a) => a.slug === slug)?.nome ?? slug

/**
 * Siglas e nomes alternativos de uso corrente na ortopedia, conferidos com o acervo (cada grupo é um assunto só).
 * Uma sigla digitada busca também o nome por extenso, e vice-versa.
 */
export const SINONIMOS: string[][] = [
  ['lca', 'ligamento cruzado anterior'],
  ['lcp', 'ligamento cruzado posterior'],
  ['ddq', 'displasia do desenvolvimento do quadril'],
  ['atq', 'ptq', 'artroplastia total do quadril'],
  ['atj', 'ptj', 'artroplastia total do joelho'],
  ['stc', 'tunel do carpo'],
  ['colo femoral', 'colo do femur'],
  ['pertrocanteriana', 'intertrocanteriana', 'transtrocanteriana'],
  ['pilao tibial', 'plafond', 'pilao'],
  ['triade terrivel', 'terrible triad'],
  ['epifisiolise', 'escorregamento epifisario'],
  ['coluna toracolombar', 'toracolombar'],
  ['manguito rotador', 'manguito'],
]

const VAZIAS = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'com', 'para', 'por', 'um', 'uma', 'the', 'of', 'and', 'in', 'to'])

/** Palavras de um texto, sem acento, sem pontuação e sem as palavras vazias ("do", "da", "the"). */
export function palavras(texto: string): string[] {
  return normalizar(texto).split(/[^a-z0-9]+/).filter((p) => p && !VAZIAS.has(p))
}
/** Singular simples: "fraturas" → "fratura", "luxacoes" → "luxaco" (só para comparar, nunca para mostrar). */
const raiz = (p: string) => (p.length > 4 ? p.replace(/(oes|aes|es|s)$/, '') : p)

/** Distância de edição até 1 (uma letra trocada, sobrando ou faltando). */
function umaLetra(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, erros = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++erros > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  return erros + (a.length - i) + (b.length - j) <= 1
}

type Campo = 'titulo' | 'secao' | 'subtema' | 'livro' | 'capitulo' | 'area' | 'resumo'
const PESO: Record<Campo, number> = { titulo: 10, secao: 6, subtema: 5, livro: 4, capitulo: 3, area: 3, resumo: 1 }

interface Indexado {
  c: ResumoCapitulo
  campos: Array<{ campo: Campo; texto: string; palavras: string[]; raizes: string[]; secao?: { id: string; titulo: string } }>
}

const cache = new WeakMap<ResumoCapitulo, Indexado>()
function indexar(c: ResumoCapitulo): Indexado {
  const pronto = cache.get(c)
  if (pronto) return pronto
  const campo = (campo: Campo, texto: string, secao?: { id: string; titulo: string }) => {
    const p = palavras(texto)
    return { campo, texto: normalizar(texto), palavras: p, raizes: p.map(raiz), secao }
  }
  const ix: Indexado = {
    c,
    campos: [
      campo('titulo', c.titulo),
      ...c.secoes.map((s) => campo('secao', s.titulo, { id: s.id, titulo: s.titulo })),
      ...(c.subtemas ?? []).map((s) => campo('subtema', s)),
      campo('livro', `${c.livro} ${nomeCurtoLivro(c.livro)} ${apelidoLivro(c.livro)} ${c.edicao}`),
      campo('capitulo', c.capitulo),
      campo('area', nomeArea(c.especialidade)),
      campo('resumo', c.resumo),
    ],
  }
  cache.set(c, ix)
  return ix
}

/** O que foi digitado, em grupos: cada grupo é uma palavra (ou um sinônimo de várias palavras) que precisa aparecer. */
interface Termo { alternativas: string[][] }
function termos(q: string): Termo[] {
  let texto = normalizar(q).replace(/[^a-z0-9]+/g, ' ').trim()
  if (!texto) return []
  const saida: Termo[] = []
  // Sinônimos de várias palavras primeiro ("colo femoral" vira um termo só, com as alternativas do grupo).
  for (const grupo of SINONIMOS) {
    for (const forma of [...grupo].sort((a, b) => b.length - a.length)) {
      const re = new RegExp(`(^| )${forma}( |$)`)
      if (re.test(texto)) {
        saida.push({ alternativas: grupo.map((g) => palavras(g)) })
        texto = texto.replace(re, ' ').trim()
        break
      }
    }
  }
  for (const p of palavras(texto)) saida.push({ alternativas: [[p]] })
  return saida
}

/** Quanto uma palavra digitada combina com uma palavra do texto: 3 inteira, 2 começo ou plural, 1 uma letra trocada. */
function combinaPalavra(q: string, p: string, r: string): number {
  if (p === q) return 3
  const rq = raiz(q)
  if (r === rq) return 3
  // Começo de palavra só com 3 letras ou mais: "pe" (pé) não pode achar "perna" nem "pelve".
  if (q.length >= 3 && p.startsWith(q)) return 2
  if (q.length >= 5 && p.length >= 5 && umaLetra(q, p)) return 1
  return 0
}

export interface Achado {
  c: ResumoCapitulo
  pontos: number
  /** A parte do resumo que mais combinou (para "Classificação de Garden, em Fratura do colo do fêmur"). */
  secao?: { id: string; titulo: string }
}

/** Pontua um resumo para a busca; null se alguma palavra não aparece em lugar nenhum. */
export function pontuar(c: ResumoCapitulo, q: string): Achado | null {
  const ts = termos(q)
  if (!ts.length) return { c, pontos: 0 }
  const ix = indexar(c)
  let pontos = 0
  const porSecao = new Map<string, number>()
  for (const t of ts) {
    let melhor = 0
    for (const f of ix.campos) {
      for (const alt of t.alternativas) {
        // Todas as palavras da alternativa no mesmo campo (ex.: "ligamento cruzado anterior").
        let soma = 0
        for (const qp of alt) {
          let m = 0
          for (let i = 0; i < f.palavras.length && m < 3; i++) m = Math.max(m, combinaPalavra(qp, f.palavras[i], f.raizes[i]))
          if (!m) { soma = 0; break }
          soma += m
        }
        if (!soma) continue
        const valor = (soma / alt.length) * PESO[f.campo]
        if (valor > melhor) melhor = valor
        if (f.secao) porSecao.set(f.secao.id, (porSecao.get(f.secao.id) ?? 0) + valor)
      }
    }
    if (!melhor) return null
    pontos += melhor
  }
  // O texto inteiro dentro do título vale um bônus (a frase exata vem primeiro).
  const frase = normalizar(q).trim()
  if (frase.length > 2 && normalizar(c.titulo).includes(frase)) pontos += 12
  let secao: Achado['secao']
  if (porSecao.size) {
    const [id, v] = [...porSecao].sort((a, b) => b[1] - a[1])[0]
    // Só aponta a parte quando ela explica o achado (todas as palavras ali, ou a busca bate mais nela que no título).
    const s = c.secoes.find((x) => x.id === id)
    if (s && v >= pontos * 0.5) secao = { id: s.id, titulo: s.titulo }
  }
  return { c, pontos, secao }
}

/** Os resumos que combinam com a busca, do mais ao menos relevante. */
export function buscarResumos(capitulos: ResumoCapitulo[], q: string): Achado[] {
  if (!q.trim()) return capitulos.map((c) => ({ c, pontos: 0 }))
  return capitulos.map((c) => pontuar(c, q)).filter((a): a is Achado => !!a).sort((a, b) => b.pontos - a.pontos || a.c.titulo.localeCompare(b.c.titulo, 'pt-BR'))
}
export const combinaBusca = (c: ResumoCapitulo, q: string) => !q.trim() || pontuar(c, q) !== null

export interface Sugestoes {
  resumos: Achado[]
  /** Partes de resumos cujo título combina com tudo o que foi digitado (abre o leitor direto na parte). */
  partes: Array<{ c: ResumoCapitulo; secao: { id: string; titulo: string } }>
  livros: Array<{ chave: string; rotulo: string; total: number }>
  areas: Array<{ slug: string; nome: string; total: number }>
  total: number
}

/** Sugestões do campo de busca, em grupos (assuntos, partes, livros e áreas), para abrir direto o que foi achado. */
export function sugerir(capitulos: ResumoCapitulo[], q: string, limite = 6): Sugestoes {
  const achados = buscarResumos(capitulos, q)
  const ts = termos(q)
  const partes: Sugestoes['partes'] = []
  if (ts.length) {
    for (const { c } of achados) {
      for (const s of c.secoes) {
        const p = palavras(s.titulo), r = p.map(raiz)
        const tudo = ts.every((t) => t.alternativas.some((alt) => alt.every((qp) => p.some((x, i) => combinaPalavra(qp, x, r[i]) >= 2))))
        if (tudo && !/^como ler/i.test(s.titulo)) partes.push({ c, secao: { id: s.id, titulo: s.titulo } })
      }
    }
  }
  const nq = normalizar(q).trim()
  const livros = new Map<string, { chave: string; rotulo: string; total: number }>()
  const areas = new Map<string, { slug: string; nome: string; total: number }>()
  if (nq.length >= 2) {
    for (const c of capitulos) {
      const nomeLivro = normalizar(`${nomeCurtoLivro(c.livro)} ${c.livro}`)
      if (palavras(q).every((p) => nomeLivro.split(/[^a-z0-9]+/).some((x) => x.startsWith(p)))) {
        const k = chaveLivro(c)
        const l = livros.get(k) ?? { chave: k, rotulo: rotuloLivro(c), total: 0 }
        l.total++; livros.set(k, l)
      }
      const area = nomeArea(c.especialidade)
      if (palavras(q).every((p) => palavras(area).some((x) => x.startsWith(p)))) {
        const a = areas.get(c.especialidade) ?? { slug: c.especialidade, nome: area, total: 0 }
        a.total++; areas.set(c.especialidade, a)
      }
    }
  }
  return {
    resumos: achados.slice(0, limite),
    partes: partes.slice(0, 4),
    livros: [...livros.values()].sort((a, b) => b.total - a.total).slice(0, 3),
    areas: [...areas.values()].slice(0, 3),
    total: achados.length,
  }
}

/** Os trechos de `texto` que combinam com a busca, para pintar com <mark> (pares início-fim no texto original). */
export function trechosAchados(texto: string, q: string): Array<[number, number]> {
  const ts = termos(q)
  if (!ts.length) return []
  const norm = normalizar(texto)
  // normalizar() não muda o tamanho das letras comuns do português (o acento some na decomposição + remoção).
  if (norm.length !== texto.length) return []
  const faixas: Array<[number, number]> = []
  const re = /[a-z0-9]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(norm))) {
    const p = m[0], r = raiz(p)
    if (VAZIAS.has(p)) continue
    if (ts.some((t) => t.alternativas.some((alt) => alt.some((qp) => combinaPalavra(qp, p, r) >= 2)))) faixas.push([m.index, m.index + p.length])
  }
  return faixas
}

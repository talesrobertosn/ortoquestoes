import type { CSSProperties, MouseEvent } from 'react'
import { urlCss } from '../../config'
import type { Indice } from '../../dados/tipos'
import { apelidoLivro, chaveLivro, estadoLeitura, nomeCurtoLivro, numeroCapitulo, rotuloLivro, sobreLivro, type EstadoLeitura } from '../estante'
import type { Leitura, ResumoCapitulo } from '../tipos'

/**
 * Peças comuns da Biblioteca 3.0 (31/10/2026): a estante e a lista leem o mesmo catálogo, os mesmos estados de leitura
 * e as mesmas provas, daqui. Nada de duas contas diferentes para o mesmo número.
 */

export const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const cliqueComum = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
export const temMouse = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches

export const ESTADO_NOME: Record<EstadoLeitura, string> = { novo: 'Não iniciado', andamento: 'Em andamento', concluido: 'Concluído' }

/** As provas em que o capítulo já caiu: "TARO 2007–2024". Só das questões citadas no resumo (ids). */
// Mapa id → questão, montado uma vez por índice (antes cada cartão varria o acervo inteiro para cada id: lento).
const porId = new WeakMap<Indice, Map<string, Indice['questoes'][number]>>()
export function provasDoCapitulo(indice: Indice | null, ids: string[]): string[] {
  if (!indice) return []
  let mapa = porId.get(indice)
  if (!mapa) { mapa = new Map(indice.questoes.map((q) => [q.id, q])); porId.set(indice, mapa) }
  const porProva = new Map<string, number[]>()
  for (const id of ids) {
    const q = mapa.get(id)
    if (!q || q.p === null || q.p === undefined) continue
    const p = indice.provas[q.p]
    const l = porProva.get(p) ?? []; if (q.a) l.push(q.a); porProva.set(p, l)
  }
  return [...porProva].sort((a, b) => b[1].length - a[1].length).map(([p, anos]) => anos.length ? `${p} ${Math.min(...anos)}${Math.max(...anos) !== Math.min(...anos) ? `–${Math.max(...anos)}` : ''}` : p)
}

/** Cor da capa de cada obra (placa da estante, capa da ficha), para reconhecer o livro de longe. */
const CAPAS: Array<[RegExp, string]> = [
  [/Fractures in Adults/i, '#9e2f2a'], [/Fractures in Children/i, '#2b5c9e'], [/Campbell/i, '#23395b'],
  [/Tachdjian/i, '#1f6f78'], [/Green/i, '#2f6b3a'], [/Netter/i, '#b5762a'], [/Adult Hip/i, '#6b2d5c'],
]
export const corDaCapa = (livro: string) => CAPAS.find(([r]) => r.test(livro))?.[1] ?? '#5b3519'

/** Id da estante de uma obra no endereço da página (a busca e o filtro rolam até ela). */
export const idObra = (livro: string) => `bb-obra-${livro.normalize('NFD').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/^-|-$/g, '')}`

export interface Obra {
  /** O nome do livro sem a edição ("Green's Operative Hand Surgery"): edições diferentes dividem a mesma estante. */
  livro: string
  apelido: string
  nome: string
  edicoes: string[]
  sobre: string
  capa: string
  capitulos: ResumoCapitulo[]
}

/**
 * As obras da estante: uma por livro, juntando as edições (o Green 8ª e o Green 7ª ficam na mesma estante, cada volume
 * com a sua edição na lombada e na ficha). Os capítulos na ordem do livro; a edição mais nova antes.
 */
export function obrasDaEstante(livros: Array<{ chave: string; rotulo: string; capitulos: ResumoCapitulo[] }>): Obra[] {
  const mapa = new Map<string, Obra>()
  for (const l of livros) {
    const c0 = l.capitulos[0]
    const o = mapa.get(c0.livro) ?? { livro: c0.livro, apelido: apelidoLivro(c0.livro), nome: nomeCurtoLivro(c0.livro), edicoes: [], sobre: sobreLivro(c0.livro), capa: corDaCapa(c0.livro), capitulos: [] }
    o.edicoes.push(l.rotulo.split(' · ')[1] ?? '')
    o.capitulos.push(...l.capitulos)
    mapa.set(c0.livro, o)
  }
  return [...mapa.values()]
}

/** "Rockwood adulto · 10ª ed. · Cap. 53" (ou "Caps. 35 a 38" quando o resumo junta capítulos). */
export function referencia(c: ResumoCapitulo): string {
  const n = numeroCapitulo(c)
  return `${rotuloLivro(c)}${n === Number.MAX_SAFE_INTEGER ? '' : ` · Cap. ${n}`}`
}

export const pctLido = (l?: Leitura) => (estadoLeitura(l) === 'concluido' ? 100 : Math.max(0, Math.min(100, l?.progresso ?? 0)))

/** A parte em que a pessoa parou ("Parou em: Classificação de Garden"), quando o leitor guardou o bloco. */
export function parouEm(c: ResumoCapitulo, l?: Leitura): string | null {
  if (!l?.bloco) return null
  return c.secoes.find((s) => l.bloco.startsWith(s.id) || l.bloco === `h-${s.id}`)?.titulo ?? null
}

/** Texto do botão principal, pelo estado de verdade da leitura. */
export const acaoLeitura = (l?: Leitura) => ({ novo: 'Ler o resumo', andamento: 'Continuar a leitura', concluido: 'Reler o resumo' })[estadoLeitura(l)]

export { chaveLivro }

/** Texturas da estante (scripts/gerar_cena_salao.py), com o endereço absoluto do site (a base é relativa). */
export const texturas = () => (typeof document === 'undefined' ? {} : {
  '--bb-fundo': urlCss('pixel/biblioteca/estante-fundo.png'), '--bb-tabua': urlCss('pixel/biblioteca/estante-tabua.png'), '--bb-coluna': urlCss('pixel/biblioteca/estante-coluna.png'),
}) as CSSProperties

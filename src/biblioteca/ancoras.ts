/**
 * Ancoragem das marcações dos resumos (Biblioteca, 16/10/2026).
 *
 * Uma marcação nunca é guardada como posição na tela nem só como índice de caractere: a tela muda
 * com a fonte, a largura, o modo paginado e o aparelho, e o texto muda com as revisões editoriais.
 * Cada trecho guarda, no espírito do Web Annotation Data Model:
 * - o bloco (id estável do parágrafo, título, item de lista...);
 * - o trecho exato (TextQuoteSelector: exact) com um pouco do texto antes e depois (prefix/suffix);
 * - o deslocamento dentro do bloco (TextPositionSelector: start/end), só como dica rápida;
 * - a versão do capítulo em que foi feita.
 *
 * Para reencontrar: (1) o deslocamento ainda bate com o trecho exato; (2) o trecho exato aparece no
 * mesmo bloco (escolhe a ocorrência com melhor contexto); (3) aparece em outro bloco do capítulo;
 * (4) não aparece mais: a marcação fica ÓRFÃ, preservada com o texto original, e a pessoa vê que ela
 * precisa ser reassociada. Nada é apagado em silêncio.
 */

export interface TrechoAncora {
  bloco: string
  inicio: number
  fim: number
  exato: string
}

export interface Ancora {
  capitulo: string
  /** Versão do conteúdo do capítulo quando a marcação foi feita. */
  versao: number
  /** Um trecho por bloco atravessado pela seleção (em ordem). */
  trechos: TrechoAncora[]
  prefixo: string
  sufixo: string
}

export type EstadoAncora = 'exata' | 'movida' | 'orfa'

export interface AncoraResolvida {
  estado: EstadoAncora
  trechos: TrechoAncora[]
}

export const CONTEXTO = 32

/** Cria a âncora de uma seleção já convertida em (bloco, deslocamento) de início e fim. */
export function criarAncora(capitulo: string, versao: number, ordem: string[], textos: Map<string, string>, inicio: { bloco: string; offset: number }, fim: { bloco: string; offset: number }): Ancora | null {
  const a = ordem.indexOf(inicio.bloco), b = ordem.indexOf(fim.bloco)
  if (a < 0 || b < 0) return null
  const [ini, fin] = a < b || (a === b && inicio.offset <= fim.offset) ? [inicio, fim] : [fim, inicio]
  const de = Math.min(a, b), ate = Math.max(a, b)
  const trechos: TrechoAncora[] = []
  for (let i = de; i <= ate; i++) {
    const id = ordem[i]; const texto = textos.get(id) ?? ''
    const s = i === de ? ini.offset : 0
    const e = i === ate ? fin.offset : texto.length
    // Ignora espaços nas pontas (seleção que pega o fim de um parágrafo e o começo do seguinte).
    let s2 = Math.max(0, Math.min(s, texto.length)), e2 = Math.max(s2, Math.min(e, texto.length))
    while (s2 < e2 && /\s/.test(texto[s2])) s2++
    while (e2 > s2 && /\s/.test(texto[e2 - 1])) e2--
    if (e2 > s2) trechos.push({ bloco: id, inicio: s2, fim: e2, exato: texto.slice(s2, e2) })
  }
  if (!trechos.length) return null
  const primeiro = trechos[0], ultimo = trechos[trechos.length - 1]
  const tp = textos.get(primeiro.bloco) ?? '', tu = textos.get(ultimo.bloco) ?? ''
  return {
    capitulo, versao, trechos,
    prefixo: tp.slice(Math.max(0, primeiro.inicio - CONTEXTO), primeiro.inicio),
    sufixo: tu.slice(ultimo.fim, ultimo.fim + CONTEXTO),
  }
}

/** Quantos caracteres do fim de `a` batem com o fim de `b` (ou do começo, com `doInicio`). */
function semelhanca(a: string, b: string, doInicio: boolean): number {
  let n = 0
  const max = Math.min(a.length, b.length)
  for (let i = 0; i < max; i++) {
    const x = doInicio ? a[i] : a[a.length - 1 - i]
    const y = doInicio ? b[i] : b[b.length - 1 - i]
    if (x !== y) break
    n++
  }
  return n
}

function ocorrencias(texto: string, trecho: string): number[] {
  const r: number[] = []
  if (!trecho) return r
  for (let i = texto.indexOf(trecho); i >= 0; i = texto.indexOf(trecho, i + 1)) r.push(i)
  return r
}

/** A melhor posição do trecho dentro de um texto, pelo contexto e pela proximidade da dica. */
function melhorPosicao(texto: string, exato: string, prefixo: string, sufixo: string, dica: number): number | null {
  const lista = ocorrencias(texto, exato)
  if (!lista.length) return null
  let melhor = lista[0], nota = -Infinity
  for (const i of lista) {
    const p = semelhanca(texto.slice(Math.max(0, i - prefixo.length), i), prefixo, false)
    const s = semelhanca(texto.slice(i + exato.length, i + exato.length + sufixo.length), sufixo, true)
    const n = p + s - Math.abs(i - dica) / 1000
    if (n > nota) { nota = n; melhor = i }
  }
  return melhor
}

/**
 * Reencontra a âncora no texto atual do capítulo. `ordem` é a ordem dos blocos; `textos`, o texto
 * puro de cada bloco (o mesmo usado na criação).
 */
export function resolverAncora(ancora: Ancora, ordem: string[], textos: Map<string, string>): AncoraResolvida {
  const saida: TrechoAncora[] = []
  let movida = false
  for (let k = 0; k < ancora.trechos.length; k++) {
    const t = ancora.trechos[k]
    const prefixo = k === 0 ? ancora.prefixo : ''
    const sufixo = k === ancora.trechos.length - 1 ? ancora.sufixo : ''
    const atual = textos.get(t.bloco)
    // 1. A dica de posição ainda vale.
    if (atual !== undefined && atual.slice(t.inicio, t.fim) === t.exato) { saida.push(t); continue }
    // 2. O mesmo bloco, em outra posição.
    if (atual !== undefined) {
      const i = melhorPosicao(atual, t.exato, prefixo, sufixo, t.inicio)
      if (i !== null) { saida.push({ ...t, inicio: i, fim: i + t.exato.length }); movida = true; continue }
    }
    // 3. Outro bloco (parágrafo dividido, reordenado ou com id novo), a partir do mais próximo.
    const base = Math.max(0, ordem.indexOf(t.bloco))
    const candidatos = [...ordem].sort((x, y) => Math.abs(ordem.indexOf(x) - base) - Math.abs(ordem.indexOf(y) - base))
    let achou = false
    for (const id of candidatos) {
      if (id === t.bloco) continue
      const texto = textos.get(id) ?? ''
      const i = melhorPosicao(texto, t.exato, prefixo, sufixo, t.inicio)
      if (i !== null) { saida.push({ bloco: id, inicio: i, fim: i + t.exato.length, exato: t.exato }); movida = true; achou = true; break }
    }
    // 4. Sumiu: a marcação inteira fica órfã (preservada como está).
    if (!achou) return { estado: 'orfa', trechos: ancora.trechos }
  }
  return { estado: movida || ancora.trechos.length !== saida.length ? 'movida' : 'exata', trechos: saida }
}

/** Faixas [inicio, fim) de cada marcação num bloco, para desenhar sem sobrepor texto. */
export interface FaixaMarca { inicio: number; fim: number; ids: string[] }

/**
 * Divide o texto de um bloco nos pedaços em que cada conjunto de marcações vale. Marcações
 * sobrepostas viram pedaços com mais de um id (a última criada aparece por cima).
 */
export function faixasDoBloco(tamanho: number, marcas: Array<{ id: string; inicio: number; fim: number }>): FaixaMarca[] {
  const cortes = new Set<number>([0, tamanho])
  for (const m of marcas) { cortes.add(Math.max(0, Math.min(tamanho, m.inicio))); cortes.add(Math.max(0, Math.min(tamanho, m.fim))) }
  const pontos = [...cortes].sort((a, b) => a - b)
  const faixas: FaixaMarca[] = []
  for (let i = 0; i < pontos.length - 1; i++) {
    const de = pontos[i], ate = pontos[i + 1]
    if (ate <= de) continue
    const ids = marcas.filter((m) => m.inicio <= de && m.fim >= ate).map((m) => m.id)
    const ultima = faixas[faixas.length - 1]
    if (ultima && ultima.ids.join() === ids.join()) ultima.fim = ate
    else faixas.push({ inicio: de, fim: ate, ids })
  }
  return faixas
}

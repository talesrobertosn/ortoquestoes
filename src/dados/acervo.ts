import { recurso } from '../config'
import type { Filtros, Indice, ItemIndice, Questao } from './tipos'

const INDICE_VAZIO: Indice = {
  versao: 1,
  geradoEm: null,
  total: 0,
  temas: [],
  subtemas: [],
  provas: [],
  anos: [],
  questoes: [],
}

let promessaIndice: Promise<Indice> | null = null
const temasCarregados = new Map<string, Promise<Questao[]>>()

async function buscarJson<T>(caminho: string): Promise<T> {
  const resposta = await fetch(recurso(caminho), { cache: 'no-cache' })
  if (!resposta.ok) throw new Error(`Falha ao carregar ${caminho} (${resposta.status})`)
  return (await resposta.json()) as T
}

/** Índice leve: metadados de todas as questões, sem enunciados. */
export function carregarIndice(): Promise<Indice> {
  if (!promessaIndice) {
    promessaIndice = buscarJson<Indice>('acervo/indice.json').catch((erro) => {
      // Acervo ainda não publicado: a interface mostra estado vazio, não erro.
      if (import.meta.env.DEV) console.warn('Índice indisponível:', erro)
      return INDICE_VAZIO
    })
  }
  return promessaIndice
}

/** Questões completas de um tema, carregadas sob demanda e memorizadas. */
export function carregarTema(slug: string): Promise<Questao[]> {
  let existente = temasCarregados.get(slug)
  if (!existente) {
    existente = buscarJson<{ questoes: Questao[] } | Questao[]>(`acervo/temas/${slug}.json`).then(
      (dados) => (Array.isArray(dados) ? dados : dados.questoes),
    )
    temasCarregados.set(slug, existente)
  }
  return existente
}

/** Carrega as questões de uma lista de ids, baixando só os temas envolvidos. */
export async function carregarQuestoes(indice: Indice, ids: string[]): Promise<Questao[]> {
  const temaPorId = new Map<string, number>()
  for (const item of indice.questoes) temaPorId.set(item.id, item.t)

  const slugs = new Set<string>()
  for (const id of ids) {
    const t = temaPorId.get(id)
    if (t !== undefined && indice.temas[t]) slugs.add(indice.temas[t].slug)
  }

  const listas = await Promise.all([...slugs].map((slug) => carregarTema(slug)))
  const porId = new Map<string, Questao>()
  for (const lista of listas) for (const q of lista) porId.set(q.id, q)

  const resultado: Questao[] = []
  for (const id of ids) {
    const q = porId.get(id)
    if (q) resultado.push(q)
  }
  return resultado
}

/** Uma questão isolada, para o link direto. */
export async function carregarQuestao(indice: Indice, id: string): Promise<Questao | null> {
  const [q] = await carregarQuestoes(indice, [id])
  return q ?? null
}

type ChaveFaceta = 'assunto' | 'provas' | 'anos' | 'dificuldades' | 'comImagem' | 'comComentario'

function aplicaUm(
  indice: Indice,
  item: ItemIndice,
  filtros: Filtros,
  ignorar?: ChaveFaceta,
): boolean {
  if (!filtros.incluirAnuladas && item.an === 1) return false

  // Assunto é uma árvore: marcar um tema significa "o tema inteiro" e marcar
  // subtemas significa "só estes". Os dois se somam, nunca se anulam.
  if (ignorar !== 'assunto' && (filtros.temas.length > 0 || filtros.subtemas.length > 0)) {
    const tema = indice.temas[item.t]
    const temaMarcado = !!tema && filtros.temas.includes(tema.slug)
    const subtemaMarcado =
      filtros.subtemas.length > 0 &&
      item.s.some((i) => filtros.subtemas.includes(indice.subtemas[i]))
    if (!temaMarcado && !subtemaMarcado) return false
  }
  if (ignorar !== 'provas' && filtros.provas.length > 0) {
    const prova = item.p === null ? null : indice.provas[item.p]
    if (!prova || !filtros.provas.includes(prova)) return false
  }
  if (ignorar !== 'anos' && filtros.anos.length > 0) {
    if (item.a === null || !filtros.anos.includes(item.a)) return false
  }
  if (ignorar !== 'dificuldades' && filtros.dificuldades.length > 0) {
    if (!item.d || !filtros.dificuldades.includes(item.d)) return false
  }
  if (ignorar !== 'comImagem' && filtros.comImagem && item.img !== 1) return false
  if (ignorar !== 'comComentario' && filtros.comComentario && item.c !== 1) return false
  return true
}

/** Itens do índice que atendem aos filtros. */
export function filtrar(indice: Indice, filtros: Filtros): ItemIndice[] {
  return indice.questoes.filter((item) => aplicaUm(indice, item, filtros))
}

/**
 * Contagens por faceta. Cada faceta é contada ignorando o próprio filtro,
 * para que o número ao lado de uma opção diga quantas questões ela traria.
 */
export interface Contagens {
  total: number
  porTema: Record<string, number>
  porSubtema: Record<string, number>
  porProva: Record<string, number>
  porAno: Record<number, number>
  porDificuldade: Record<string, number>
}

export function contar(indice: Indice, filtros: Filtros): Contagens {
  const contagens: Contagens = {
    total: 0,
    porTema: {},
    porSubtema: {},
    porProva: {},
    porAno: {},
    porDificuldade: {},
  }

  for (const item of indice.questoes) {
    if (aplicaUm(indice, item, filtros)) contagens.total++

    if (aplicaUm(indice, item, filtros, 'assunto')) {
      const tema = indice.temas[item.t]
      if (tema) contagens.porTema[tema.slug] = (contagens.porTema[tema.slug] ?? 0) + 1
      for (const i of item.s) {
        const nome = indice.subtemas[i]
        if (nome) contagens.porSubtema[nome] = (contagens.porSubtema[nome] ?? 0) + 1
      }
    }
    if (aplicaUm(indice, item, filtros, 'provas') && item.p !== null) {
      const prova = indice.provas[item.p]
      if (prova) contagens.porProva[prova] = (contagens.porProva[prova] ?? 0) + 1
    }
    if (aplicaUm(indice, item, filtros, 'anos') && item.a !== null) {
      contagens.porAno[item.a] = (contagens.porAno[item.a] ?? 0) + 1
    }
    if (aplicaUm(indice, item, filtros, 'dificuldades') && item.d) {
      contagens.porDificuldade[item.d] = (contagens.porDificuldade[item.d] ?? 0) + 1
    }
  }

  return contagens
}

/** Embaralhamento determinístico (Fisher-Yates com gerador semeado). */
export function embaralhar<T>(lista: T[], semente: number): T[] {
  const copia = lista.slice()
  let estado = semente >>> 0 || 1
  for (let i = copia.length - 1; i > 0; i--) {
    estado ^= estado << 13
    estado ^= estado >>> 17
    estado ^= estado << 5
    estado >>>= 0
    const j = estado % (i + 1)
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/** Monta a lista de ids de uma sessão a partir dos filtros. */
export function montarSessao(indice: Indice, filtros: Filtros, semente: number): string[] {
  let ids = filtrar(indice, filtros).map((i) => i.id)
  if (filtros.embaralhar) ids = embaralhar(ids, semente)
  if (filtros.limite && filtros.limite > 0) ids = ids.slice(0, filtros.limite)
  return ids
}

export interface NoAssunto {
  slug: string
  nome: string
  subtemas: string[]
}

/** Árvore de assuntos derivada do próprio acervo: só aparece o que existe. */
export function arvoreAssuntos(indice: Indice): NoAssunto[] {
  const porTema = new Map<number, Set<string>>()
  for (const item of indice.questoes) {
    let conjunto = porTema.get(item.t)
    if (!conjunto) {
      conjunto = new Set<string>()
      porTema.set(item.t, conjunto)
    }
    for (const i of item.s) {
      const nome = indice.subtemas[i]
      if (nome) conjunto.add(nome)
    }
  }
  return indice.temas.map((tema, i) => ({
    slug: tema.slug,
    nome: tema.nome,
    subtemas: [...(porTema.get(i) ?? [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  }))
}

/** Normaliza para busca: sem acento, minúsculo. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

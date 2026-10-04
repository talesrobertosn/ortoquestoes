import { dominada, revisarHoje, type RegistroQuestao } from '../estado/revisao'
import { recurso } from '../config'
import type { Filtros, Indice, ItemIndice, Progresso, Questao } from './tipos'
import { embaralhar } from './embaralhar'
import { aplicarEdicao, aplicarEdicoesNoIndice, carregarEdicoes } from './edicoes'

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

/** Pedido do índice feito pelo index.html antes do código carregar; usado uma vez. */
function adiantado(): Promise<Response | null> | null {
  const janela = window as unknown as { __indiceOrtoQuestoes?: Promise<Response> }
  const pedido = janela.__indiceOrtoQuestoes
  if (!pedido) return null
  delete janela.__indiceOrtoQuestoes
  // Se o pedido adiantado falhar, o fetch normal tenta de novo.
  return pedido.then(r => (r.ok ? r : null), () => null)
}
const temasCarregados = new Map<string, Promise<Questao[]>>()

async function buscarJson<T>(caminho: string): Promise<T> {
  const resposta = await (caminho === 'acervo/indice.json' ? adiantado() : null) ?? await fetch(recurso(caminho), { cache: 'no-cache' })
  if (!resposta.ok) throw new Error(`Falha ao carregar ${caminho} (${resposta.status})`)
  return (await resposta.json()) as T
}

/** Índice leve: metadados de todas as questões, sem enunciados. */
export function carregarIndice(): Promise<Indice> {
  if (!promessaIndice) {
    promessaIndice = Promise.all([buscarJson<Indice>('acervo/indice.json'), carregarEdicoes()])
      .then(([indice, edicoes]) => aplicarEdicoesNoIndice(indice, edicoes))
      .catch((erro) => {
        // Acervo ainda não publicado: a interface mostra estado vazio, não erro.
        if (import.meta.env.DEV) console.warn('Índice indisponível:', erro)
        return INDICE_VAZIO
      })
  }
  return promessaIndice
}

/**
 * Série histórica de cobertura dos comentários. Arquivo pequeno e só usado na
 * página de progresso, por isso fica fora do índice e é buscado sob demanda.
 */
let promessaProgresso: Promise<Progresso | null> | null = null

export function carregarProgresso(): Promise<Progresso | null> {
  if (!promessaProgresso) {
    promessaProgresso = buscarJson<Progresso>('acervo/progresso.json').catch(() => null)
  }
  return promessaProgresso
}

/** Questões completas de um tema, carregadas sob demanda e memorizadas. */
export function carregarTema(slug: string): Promise<Questao[]> {
  let existente = temasCarregados.get(slug)
  if (!existente) {
    existente = Promise.all([buscarJson<{ questoes: Questao[] } | Questao[]>(`acervo/temas/${slug}.json`), carregarEdicoes()]).then(
      ([dados, edicoes]) => (Array.isArray(dados) ? dados : dados.questoes).map((q) => aplicarEdicao(q, edicoes.get(q.id))),
    )
    temasCarregados.set(slug, existente)
  }
  return existente
}

/**
 * Até este tanto de questões de um mesmo tema, vale mais buscar uma a uma
 * (acervo/q/<id>.json, cerca de 1 KB cada) do que o tema inteiro (30 a 100 KB
 * compactados). Acima disso, o arquivo do tema sai mais barato.
 */
const MAXIMO_AVULSAS_POR_TEMA = 30
const avulsas = new Map<string, Promise<Questao | null>>()

function carregarAvulsa(id: string): Promise<Questao | null> {
  let existente = avulsas.get(id)
  if (!existente) {
    existente = fetch(recurso(`acervo/q/${encodeURIComponent(id)}.json`), { cache: 'no-cache' })
      .then((r) => (r.ok ? (r.json() as Promise<Questao>) : null))
      .then(async (q) => (q ? aplicarEdicao(q, (await carregarEdicoes()).get(q.id)) : null))
      .catch(() => null)
    avulsas.set(id, existente)
    // Falhou (arquivo ainda não publicado, rede caiu): a próxima tentativa busca de novo.
    existente.then((q) => { if (!q) avulsas.delete(id) })
  }
  return existente
}

async function questoesDoTema(slug: string, ids: string[]): Promise<Questao[]> {
  if (temasCarregados.has(slug) || ids.length > MAXIMO_AVULSAS_POR_TEMA) return carregarTema(slug)
  const lista = await Promise.all(ids.map(carregarAvulsa))
  // Se alguma não veio, o arquivo do tema resolve de uma vez.
  return lista.every((q) => q) ? (lista as Questao[]) : carregarTema(slug)
}

/** Carrega as questões de uma lista de ids, baixando só o necessário de cada tema. */
export async function carregarQuestoes(indice: Indice, ids: string[]): Promise<Questao[]> {
  const temaPorId = new Map<string, number>()
  for (const item of indice.questoes) temaPorId.set(item.id, item.t)

  const porTema = new Map<string, string[]>()
  for (const id of ids) {
    const t = temaPorId.get(id)
    if (t === undefined || !indice.temas[t]) continue
    const slug = indice.temas[t].slug
    porTema.set(slug, [...(porTema.get(slug) ?? []), id])
  }

  const listas = await Promise.all([...porTema].map(([slug, doTema]) => questoesDoTema(slug, doTema)))
  const porId = new Map<string, Questao>()
  for (const lista of listas) for (const q of lista) porId.set(q.id, q)

  const resultado: Questao[] = []
  for (const id of ids) {
    const q = porId.get(id)
    if (q) resultado.push(q)
  }
  return resultado
}

/** Depois de salvar uma edição no painel: índice e questões são lidos de novo. */
export function recarregarAcervo() {
  promessaIndice = null
  temasCarregados.clear()
  avulsas.clear()
}

/** Uma questão isolada, para o link direto. */
export async function carregarQuestao(indice: Indice, id: string): Promise<Questao | null> {
  const [q] = await carregarQuestoes(indice, [id])
  return q ?? null
}

type ChaveFaceta =
  | 'assunto'
  | 'provas'
  | 'anos'
  | 'dificuldades'
  | 'comImagem'
  | 'comComentario'
  | 'soSimulados'
  | 'situacao'
  | 'busca'

/**
 * O que o navegador sabe sobre quem está estudando. Fica fora do índice do
 * acervo de propósito: são dados locais da pessoa, não do conteúdo.
 */
export interface ContextoLocal {
  respondidas: Record<string, Partial<RegistroQuestao> & { c: boolean | null }>
  favoritos: string[]
  /** id → enunciado e alternativas, normalizados. Só existe depois de buscar. */
  textos: Map<string, string> | null
  /** O que o ritmo de revisão reserva para hoje. Sem ele, vale a data de cada questão. */
  revisaoHoje?: Set<string>
  /** Acerto de primeira da turma por questão (só assinantes recebem). */
  turma?: Map<string, { respondentes: number; acerto: number }> | null
}

/** Acerto de primeira da turma abaixo disso: "as que a turma mais erra". */
export const LIMITE_TURMA_ERRA = 50
/** Acerto de primeira da turma a partir disso: errar uma dessas é sinal de lacuna. */
export const LIMITE_TURMA_ACERTA = 80

/** A turma erra mais da metade de primeira. */
function turmaErra(id: string, contexto: ContextoLocal): boolean {
  const t = contexto.turma?.get(id)
  return !!t && t.acerto < LIMITE_TURMA_ERRA
}
/** Quase todo mundo acerta, e a pessoa errou da última vez. */
function turmaAcertaVoceErrou(id: string, contexto: ContextoLocal): boolean {
  const t = contexto.turma?.get(id)
  return !!t && t.acerto >= LIMITE_TURMA_ACERTA && contexto.respondidas[id]?.c === false
}

export const CONTEXTO_VAZIO: ContextoLocal = {
  respondidas: {},
  favoritos: [],
  textos: null,
}

let ultimaBusca: string | null = null
let ultimosTermos: string[] = []

/**
 * A contagem por faceta roda o filtro várias vezes sobre o acervo inteiro a
 * cada tecla digitada. Normalizar a busca uma vez por texto, e não uma vez por
 * questão, é a diferença entre digitar liso e digitar travado.
 */
function termosDeBusca(busca: string): string[] {
  if (busca !== ultimaBusca) {
    ultimaBusca = busca
    ultimosTermos = normalizar(busca).split(/\s+/).filter(Boolean)
  }
  return ultimosTermos
}

function venceHoje(id: string, contexto: ContextoLocal): boolean {
  return contexto.revisaoHoje ? contexto.revisaoHoje.has(id) : revisarHoje(contexto.respondidas[id])
}

function aplicaUm(
  indice: Indice,
  item: ItemIndice,
  filtros: Filtros,
  contexto: ContextoLocal,
  ignorar?: ChaveFaceta,
): boolean {
  // Cópias duplicadas continuam no índice para o histórico, mas nunca são sorteadas nem contadas.
  if (item.dup) return false
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
  if (ignorar !== 'soSimulados' && filtros.soSimulados && item.sim !== 1) return false

  if (ignorar !== 'situacao' && filtros.situacao !== 'todas') {
    const registro = contexto.respondidas[item.id]
    if (filtros.situacao === 'revisarHoje' && !venceHoje(item.id, contexto)) return false
    if (filtros.situacao === 'dominadas' && !dominada(registro)) return false
    if (filtros.situacao === 'naoRespondidas' && registro) return false
    if (filtros.situacao === 'erradas' && registro?.c !== false) return false
    if (filtros.situacao === 'acertadas' && registro?.c !== true) return false
    if (filtros.situacao === 'favoritas' && !contexto.favoritos.includes(item.id)) return false
    if (filtros.situacao === 'incertas' && (!registro || (registro.confianca !== 'duvida' && registro.confianca !== 'chute'))) return false
    if (filtros.situacao === 'turmaErra' && !turmaErra(item.id, contexto)) return false
    if (filtros.situacao === 'turmaAcertaVoceErrou' && !turmaAcertaVoceErrou(item.id, contexto)) return false
  }

  if (ignorar !== 'busca' && filtros.busca.trim()) {
    // Sem o índice de texto carregado ainda, a busca não exclui nada: melhor
    // mostrar demais por um instante do que piscar "nenhuma questão".
    if (contexto.textos) {
      const alvo = contexto.textos.get(item.id)
      if (!alvo) return false
      for (const termo of termosDeBusca(filtros.busca)) {
        if (!alvo.includes(termo)) return false
      }
    }
  }

  return true
}

/** Itens do índice que atendem aos filtros. */
export function filtrar(
  indice: Indice,
  filtros: Filtros,
  contexto: ContextoLocal = CONTEXTO_VAZIO,
): ItemIndice[] {
  return indice.questoes.filter((item) => aplicaUm(indice, item, filtros, contexto))
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
  porSituacao: Record<string, number>
  /** questões OrtoQuestões Simulados no recorte, sem contar o próprio filtro */
  simulados: number
}

export function contar(
  indice: Indice,
  filtros: Filtros,
  contexto: ContextoLocal = CONTEXTO_VAZIO,
): Contagens {
  const contagens: Contagens = {
    total: 0,
    porTema: {},
    porSubtema: {},
    porProva: {},
    porAno: {},
    porDificuldade: {},
    porSituacao: {},
    simulados: 0,
  }

  for (const item of indice.questoes) {
    if (aplicaUm(indice, item, filtros, contexto)) contagens.total++

    if (aplicaUm(indice, item, filtros, contexto, 'situacao')) {
      const registro = contexto.respondidas[item.id]
      contagens.porSituacao.todas = (contagens.porSituacao.todas ?? 0) + 1
      if (!registro) {
        contagens.porSituacao.naoRespondidas = (contagens.porSituacao.naoRespondidas ?? 0) + 1
      } else if (registro.c === false) {
        contagens.porSituacao.erradas = (contagens.porSituacao.erradas ?? 0) + 1
      } else if (registro.c === true) {
        contagens.porSituacao.acertadas = (contagens.porSituacao.acertadas ?? 0) + 1
      }
      if (venceHoje(item.id, contexto)) contagens.porSituacao.revisarHoje = (contagens.porSituacao.revisarHoje ?? 0) + 1
      if (dominada(registro)) contagens.porSituacao.dominadas = (contagens.porSituacao.dominadas ?? 0) + 1
      if (contexto.favoritos.includes(item.id)) {
        contagens.porSituacao.favoritas = (contagens.porSituacao.favoritas ?? 0) + 1
      }
      if (registro && (registro.confianca === 'duvida' || registro.confianca === 'chute')) {
        contagens.porSituacao.incertas = (contagens.porSituacao.incertas ?? 0) + 1
      }
      if (turmaErra(item.id, contexto)) contagens.porSituacao.turmaErra = (contagens.porSituacao.turmaErra ?? 0) + 1
      if (turmaAcertaVoceErrou(item.id, contexto)) contagens.porSituacao.turmaAcertaVoceErrou = (contagens.porSituacao.turmaAcertaVoceErrou ?? 0) + 1
    }

    if (aplicaUm(indice, item, filtros, contexto, 'assunto')) {
      const tema = indice.temas[item.t]
      if (tema) contagens.porTema[tema.slug] = (contagens.porTema[tema.slug] ?? 0) + 1
      for (const i of item.s) {
        const nome = indice.subtemas[i]
        if (nome) contagens.porSubtema[nome] = (contagens.porSubtema[nome] ?? 0) + 1
      }
    }
    if (aplicaUm(indice, item, filtros, contexto, 'provas') && item.p !== null) {
      const prova = indice.provas[item.p]
      if (prova) contagens.porProva[prova] = (contagens.porProva[prova] ?? 0) + 1
    }
    if (item.sim === 1 && aplicaUm(indice, item, filtros, contexto, 'soSimulados')) contagens.simulados++
    if (aplicaUm(indice, item, filtros, contexto, 'anos') && item.a !== null) {
      contagens.porAno[item.a] = (contagens.porAno[item.a] ?? 0) + 1
    }
    if (aplicaUm(indice, item, filtros, contexto, 'dificuldades') && item.d) {
      contagens.porDificuldade[item.d] = (contagens.porDificuldade[item.d] ?? 0) + 1
    }
  }

  return contagens
}

export { embaralhar } from './embaralhar'

/** Monta a lista de ids de uma sessão a partir dos filtros. */
export function montarSessao(
  indice: Indice,
  filtros: Filtros,
  semente: number,
  contexto: ContextoLocal = CONTEXTO_VAZIO,
): string[] {
  const itens = filtrar(indice, filtros, contexto)
  let ids = itens.map((i) => i.id)
  if (filtros.embaralhar) ids = embaralhar(ids, semente)
  // "As que a turma mais erra" começa pelas mais erradas; o embaralhamento
  // acima só desempata. Com limite, a sessão fica com as mais difíceis.
  if (filtros.situacao === 'turmaErra') {
    const acerto = (id: string) => contexto.turma?.get(id)?.acerto ?? 100
    ids = [...ids].sort((a, b) => acerto(a) - acerto(b))
    if (filtros.limite && filtros.embaralhar) ids = embaralhar(ids.slice(0, filtros.limite), semente)
  }
  // No treino amplo, alterna uma revisão/erro, uma questão nova e uma já
  // acertada. A sessão fica mais sustentável sem esconder a prioridade de
  // revisão e os filtros explícitos continuam sendo respeitados integralmente.
  if (filtros.situacao === 'todas' && !filtros.busca.trim()) {
    const grupos = [[], [], []] as string[][]
    for (const id of ids) {
      const registro = contexto.respondidas[id]
      if (venceHoje(id, contexto)) grupos[0].push(id)
      else if (!registro) grupos[1].push(id)
      else grupos[2].push(id)
    }
    const alternados: string[] = []
    while (grupos.some(grupo => grupo.length)) {
      for (const grupo of grupos) {
        const id = grupo.shift()
        if (id) alternados.push(id)
      }
    }
    ids = alternados
  }
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

let promessaBusca: Promise<Map<string, string>> | null = null

/**
 * Índice de busca por texto. Fica num arquivo à parte e só é baixado quando
 * alguém digita algo: é grande, e a maioria das visitas nunca busca.
 */
export function carregarBusca(): Promise<Map<string, string>> {
  if (!promessaBusca) {
    promessaBusca = buscarJson<Array<[string, string]>>('acervo/busca.json')
      .then((linhas) => new Map(linhas))
      .catch(() => new Map())
  }
  return promessaBusca
}

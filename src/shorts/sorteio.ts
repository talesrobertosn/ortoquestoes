/*
 * Sorteio do feed dos Shorts (25/11/2026, pedido do Tales). Sem React, para testar
 * (fixtures/testar_shorts.mjs).
 *
 * - Imagem tem mais chance, sem roteiro fixo: o peso da imagem se ajusta ao que a pessoa ainda tem para
 *   ver, mirando em torno de 6 de cada 10 com imagem. Só a primeira do feed é sempre com imagem.
 * - Revisão escondida: depois de responder, a questão pode voltar em 3 a 7 dias (errou: 70% de chance,
 *   puxando para 3 dias; acertou: 30%, puxando para 7). Errou na revisão, volta em 3 dias; acertou, fixou.
 *   No máximo uma revisão a cada quatro Shorts. Nada disso entra na fila da página Revisão.
 */

export const DIA = 86_400_000

/** 0 TEOT, 1 TARO, 2 Cirurgia da Mão, 3 outras provas (scripts/gerar_shorts.py). */
export type GrupoShort = 0 | 1 | 2 | 3

export interface ItemShort {
  id: string
  /** Slug do tema (arquivo em public/acervo/temas). */
  tema: string
  grupo: GrupoShort
  imagem: boolean
  /** Letras do enunciado com as alternativas. */
  tamanho: number
}

export interface AjustesShorts {
  teot: boolean
  taro: boolean
  mao: boolean
  outras: boolean
  soImagem: boolean
  soIneditas: boolean
  revanche: boolean
  passarSozinha: boolean
  /** Sininho baixinho ao acertar (26/11/2026). */
  som: boolean
}

export const AJUSTES_PADRAO: AjustesShorts = {
  teot: true, taro: true, mao: false, outras: false,
  soImagem: false, soIneditas: false, revanche: true, passarSozinha: true, som: true,
}

/** A última resposta de uma questão nos Shorts. */
export interface RespostaShort {
  id: string
  em: number
  certo: boolean
  /** Foi respondida como revisão. */
  revisao: boolean
  /** Quando volta como revisão; null se não volta. */
  voltaEm: number | null
}

export type Historico = Record<string, RespostaShort>

/** Meta de questões com imagem no feed, enquanto houver imagem para mostrar. */
export const META_IMAGEM = 0.6
/** Questão já vista não volta pelo sorteio comum antes disso (a revisão é à parte). */
export const DESCANSO_VISTA = 60 * DIA
/** Uma revisão no máximo a cada tantos Shorts. */
export const INTERVALO_REVISAO = 4

/** Lê public/acervo/shorts.json. */
export function lerIndice(json: { temas: string[]; q: [string, number, number, number, number][] }): ItemShort[] {
  return json.q.map(([id, t, grupo, imagem, tamanho]) => ({ id, tema: json.temas[t], grupo: grupo as GrupoShort, imagem: imagem === 1, tamanho }))
}

/**
 * As questões que podem entrar no feed com estes ajustes. Com TEOT e TARO, as questões com imagem das
 * outras provas de ortopedia geral também entram (são poucas imagens no TEOT e no TARO); as de
 * Cirurgia da Mão só entram com a Mão ligada.
 */
export function aptas(itens: ItemShort[], a: AjustesShorts): ItemShort[] {
  const grupos = [a.teot, a.taro, a.mao, a.outras]
  const nenhum = !grupos.some(Boolean)
  return itens.filter((q) => {
    if (a.soImagem && !q.imagem) return false
    if (nenhum || grupos[q.grupo]) return true
    return q.grupo === 3 && q.imagem && (a.teot || a.taro)
  })
}

/** Peso da imagem para a meta de ~60%, conforme a proporção que sobrou para a pessoa. */
export function pesoImagem(comImagem: number, semImagem: number): number {
  if (!comImagem || !semImagem) return 1
  const p = (META_IMAGEM / (1 - META_IMAGEM)) * (semImagem / comImagem)
  return Math.min(25, Math.max(1, p))
}

/** Quando a questão volta como revisão (ou null). `sorte` devolve um número de 0 a 1. */
export function agendarVolta(certo: boolean, eraRevisao: boolean, agora: number, sorte: () => number): number | null {
  if (eraRevisao) return certo ? null : agora + 3 * DIA
  const chance = certo ? 0.3 : 0.7
  if (sorte() >= chance) return null
  // Errou puxa para 3 dias; acertou, para 7. Sempre 3 a 7 dias.
  const r = sorte()
  const dias = certo ? 3 + Math.round(4 * Math.sqrt(r)) : 3 + Math.round(4 * r * r)
  return agora + dias * DIA
}

export function revisoesVencidas(h: Historico, agora: number, fora: Set<string>): RespostaShort[] {
  return Object.values(h).filter((r) => r.voltaEm !== null && r.voltaEm <= agora && !fora.has(r.id)).sort((x, y) => (x.voltaEm ?? 0) - (y.voltaEm ?? 0))
}

export interface ContextoSorteio {
  itens: ItemShort[]
  historico: Historico
  ajustes: AjustesShorts
  /** Já estão no feed desta abertura. */
  noFeed: Set<string>
  anterior?: ItemShort | null
  /** Posição da questão a sortear no feed (0 = primeira). */
  posicao: number
  /** Quantos Shorts desde a última revisão mostrada. */
  desdeRevisao: number
  agora: number
  sorte: () => number
}

export interface Sorteada {
  item: ItemShort
  /** Preenchido quando a questão volta como revisão. */
  revisao: RespostaShort | null
}

function pesoDe(q: ItemShort, ctx: ContextoSorteio, pImg: number): number {
  let p = q.imagem ? pImg : 1
  const r = ctx.historico[q.id]
  if (r) p *= 0.35
  if (q.tamanho > 1200) p *= 0.25
  else if (q.tamanho > 700) p *= 0.5
  if (ctx.anterior && q.tema === ctx.anterior.tema) p *= 0.15
  return p
}

function sortearComPeso<T>(lista: T[], peso: (x: T) => number, sorte: () => number): T | null {
  let total = 0
  const pesos = lista.map((x) => { const p = Math.max(0, peso(x)); total += p; return p })
  if (!total) return lista.length ? lista[Math.floor(sorte() * lista.length)] : null
  let alvo = sorte() * total
  for (let i = 0; i < lista.length; i++) { alvo -= pesos[i]; if (alvo < 0) return lista[i] }
  return lista[lista.length - 1]
}

/** A próxima questão do feed. */
export function sortear(ctx: ContextoSorteio): Sorteada | null {
  const { historico: h, agora, noFeed, ajustes } = ctx
  const pool = aptas(ctx.itens, ajustes)
  const porId = new Map(pool.map((q) => [q.id, q]))

  // Revisão escondida: uma a cada quatro, nunca a primeira do feed.
  if (ajustes.revanche && ctx.posicao > 0 && ctx.desdeRevisao >= INTERVALO_REVISAO - 1) {
    const vencidas = revisoesVencidas(h, agora, noFeed).filter((r) => porId.has(r.id))
    if (vencidas.length) {
      const r = vencidas[Math.floor(ctx.sorte() * Math.min(3, vencidas.length))]
      return { item: porId.get(r.id)!, revisao: r }
    }
  }

  const livre = (q: ItemShort) => {
    if (noFeed.has(q.id)) return false
    const r = h[q.id]
    if (!r) return true
    if (ajustes.soIneditas) return false
    if (r.voltaEm !== null) return false // espera a vez de voltar como revisão
    return agora - r.em >= DESCANSO_VISTA
  }
  let candidatas = pool.filter(livre)
  if (!candidatas.length) {
    // Acabaram as inéditas: volta a mais antiga respondida, para o feed nunca ficar vazio.
    candidatas = pool.filter((q) => !noFeed.has(q.id)).sort((x, y) => (h[x.id]?.em ?? 0) - (h[y.id]?.em ?? 0)).slice(0, 200)
  }
  if (ctx.posicao === 0) {
    const comImagem = candidatas.filter((q) => q.imagem)
    if (comImagem.length) candidatas = comImagem
  }
  const ineditas = candidatas.filter((q) => !h[q.id])
  const base = ineditas.length ? ineditas : candidatas
  const pImg = pesoImagem(base.filter((q) => q.imagem).length, base.filter((q) => !q.imagem).length)
  const item = sortearComPeso(candidatas, (q) => pesoDe(q, ctx, pImg), ctx.sorte)
  return item ? { item, revisao: null } : null
}

/** Texto da faixa de revisão: "Você errou essa há 3 dias". */
export function textoRevisao(r: RespostaShort, agora: number): string {
  const dias = Math.max(1, Math.round((agora - r.em) / DIA))
  return `Você ${r.certo ? 'acertou' : 'errou'} essa há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

/** Registra uma resposta no histórico (devolve o histórico novo). */
export function registrar(h: Historico, id: string, certo: boolean, eraRevisao: boolean, agora: number, sorte: () => number): Historico {
  return { ...h, [id]: { id, em: agora, certo, revisao: eraRevisao, voltaEm: agendarVolta(certo, eraRevisao, agora, sorte) } }
}

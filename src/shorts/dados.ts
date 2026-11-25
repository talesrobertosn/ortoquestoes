/*
 * Dados dos Shorts (25/11/2026): o índice leve do feed, as capas, o histórico (no aparelho e no servidor),
 * os ajustes, a cota do dia e os corações.
 */
import { recurso } from '../config'
import { guardarVolta } from './volta'
import { gravar, ler } from '../estado/armazenamento'
import { chamarRpc, chamarRpcPublica } from '../servicos/supabase'
import { AJUSTES_PADRAO, lerIndice, type AjustesShorts, type GrupoShort, type Historico, type ItemShort } from './sorteio'

export const CHAVE_HISTORICO = 'shorts:historico'
export const CHAVE_AJUSTES = 'shorts:ajustes'
export const CHAVE_CORACOES = 'shorts:coracoes'
export const CHAVE_VISITANTE = 'shorts:visitante'
export { CHAVE_VOLTA } from './volta'

/** Abre os Shorts guardando a página de volta. */
export function abrirShorts(id?: string | null) {
  guardarVolta()
  location.hash = '#/shorts' + (id ? '/' + id : '')
}
/** Sem conta, a pessoa faz um Short; a conta grátis libera mais. */
export const LIMITE_VISITANTE = 1
/** Cota grátis padrão (o servidor manda o valor real, configurável no painel). */
export const LIMITE_GRATIS_SHORTS = 5

let indice: Promise<ItemShort[]> | null = null
export function carregarIndiceShorts(): Promise<ItemShort[]> {
  indice ??= fetch(recurso('acervo/shorts.json')).then((r) => { if (!r.ok) throw new Error('indice'); return r.json() }).then(lerIndice)
    .catch((e) => { indice = null; throw e })
  return indice
}

export interface CapaShort {
  id: string
  tema: string
  grupo: GrupoShort
  arquivo: string
  largura: number
  altura: number
  prova: string
  ano: number
  trecho: string
}
let capas: Promise<CapaShort[]> | null = null
export function carregarCapas(): Promise<CapaShort[]> {
  capas ??= fetch(recurso('acervo/shorts-capas.json')).then((r) => { if (!r.ok) throw new Error('capas'); return r.json() })
    .then((j: { temas: string[]; q: [string, number, number, string, number, number, string, number, string][] }) =>
      j.q.map(([id, t, grupo, arquivo, largura, altura, prova, ano, trecho]) => ({ id, tema: j.temas[t], grupo: grupo as GrupoShort, arquivo, largura, altura, prova, ano, trecho })))
    .catch((e) => { capas = null; throw e })
  return capas
}

/** Capas do dia para a prateleira: sorteio estável no dia, com as provas do padrão (TEOT e TARO) primeiro. */
export function capasDoDia(lista: CapaShort[], n: number, semente = new Date().toISOString().slice(0, 10)): CapaShort[] {
  let h = 2166136261
  for (const c of semente) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  const hist = ler<Historico>(CHAVE_HISTORICO, {})
  const pontua = (c: CapaShort) => {
    let x = h
    for (const ch of c.id) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0
    return (c.grupo <= 1 ? 0 : 0.5) + (hist[c.id] ? 1 : 0) + (x % 1000) / 2000
  }
  const escolhidas: CapaShort[] = []
  const temas = new Set<string>()
  for (const c of [...lista].filter((c) => c.grupo !== 2).sort((a, b) => pontua(a) - pontua(b))) {
    if (temas.has(c.tema) && temas.size < 8) continue
    escolhidas.push(c); temas.add(c.tema)
    if (escolhidas.length >= n) break
  }
  return escolhidas
}

export function lerAjustes(): AjustesShorts { return { ...AJUSTES_PADRAO, ...ler<Partial<AjustesShorts>>(CHAVE_AJUSTES, {}) } }
export function gravarAjustes(a: AjustesShorts) { gravar(CHAVE_AJUSTES, a) }

export function lerHistorico(): Historico { return ler<Historico>(CHAVE_HISTORICO, {}) }
export function gravarHistorico(h: Historico) {
  // Guarda só os últimos 180 dias e no máximo 4000 questões.
  const limite = Date.now() - 180 * 86_400_000
  const lista = Object.values(h).filter((r) => r.em >= limite || (r.voltaEm ?? 0) > Date.now()).sort((a, b) => b.em - a.em).slice(0, 4000)
  gravar(CHAVE_HISTORICO, Object.fromEntries(lista.map((r) => [r.id, r])))
}

/** Junta o histórico do servidor (outros aparelhos) com o do aparelho: vale a resposta mais recente. */
export async function sincronizarHistorico(): Promise<Historico> {
  const local = lerHistorico()
  try {
    const linhas = await chamarRpc<Array<{ id_questao: string; em: string; certo: boolean; revisao: boolean; volta_em: string | null }>>('meu_historico_shorts', {}, { prazoMs: 10_000 })
    const junto: Historico = { ...local }
    for (const l of linhas) {
      const em = Date.parse(l.em)
      if (!junto[l.id_questao] || junto[l.id_questao].em < em - 1000) {
        junto[l.id_questao] = { id: l.id_questao, em, certo: l.certo, revisao: l.revisao, voltaEm: l.volta_em ? Date.parse(l.volta_em) : null }
      }
    }
    gravarHistorico(junto)
    return junto
  } catch {
    return local
  }
}

export interface SaldoShorts { permitido: boolean; ilimitado: boolean; feitas: number; limite: number; liberaEm: string }
interface LinhaSaldo { permitido?: boolean; ilimitado: boolean; feitas: number; limite: number; libera_em: string }
const saldoDe = (l: LinhaSaldo): SaldoShorts => ({ permitido: l.permitido ?? true, ilimitado: l.ilimitado, feitas: l.feitas, limite: l.limite, liberaEm: l.libera_em })

export async function lerSaldo(): Promise<SaldoShorts | null> {
  try {
    const [l] = await chamarRpc<LinhaSaldo[]>('saldo_shorts', {}, { prazoMs: 10_000 })
    return l ? saldoDe(l) : null
  } catch { return null }
}

export async function enviarResposta(id: string, certo: boolean, revisao: boolean, voltaEm: number | null, segundos: number): Promise<SaldoShorts> {
  const [l] = await chamarRpc<LinhaSaldo[]>('responder_short', {
    p_id_questao: id, p_certo: certo, p_revisao: revisao, p_volta_em: voltaEm ? new Date(voltaEm).toISOString() : null, p_segundos: Math.round(segundos),
  }, { prazoMs: 12_000 })
  return saldoDe(l)
}

/** Visitante sem conta: quantos Shorts fez hoje neste aparelho. */
export function feitasVisitante(): number {
  const v = ler<{ dia: string; n: number } | null>(CHAVE_VISITANTE, null)
  return v && v.dia === new Date().toDateString() ? v.n : 0
}
export function somarVisitante() { gravar(CHAVE_VISITANTE, { dia: new Date().toDateString(), n: feitasVisitante() + 1 }) }

export function lerCoracoes(): string[] { return ler<string[]>(CHAVE_CORACOES, []) }
export async function alternarCoracao(id: string, ligar: boolean): Promise<number | null> {
  const atual = new Set(lerCoracoes())
  if (ligar) atual.add(id); else atual.delete(id)
  gravar(CHAVE_CORACOES, [...atual].slice(-3000))
  try { return await chamarRpc<number>('alternar_coracao_short', { p_id_questao: id, p_ligar: ligar }) } catch { return null }
}

const totais = new Map<string, number>()
export async function carregarTotaisCoracoes(ids: string[]): Promise<Map<string, number>> {
  const faltam = ids.filter((id) => !totais.has(id)).slice(0, 200)
  if (faltam.length) {
    try {
      const linhas = await chamarRpcPublica<Array<{ id_questao: string; n: number }>>('coracoes_shorts', { p_ids: faltam })
      for (const id of faltam) totais.set(id, 0)
      for (const l of linhas) totais.set(l.id_questao, l.n)
    } catch { /* sem rede: o número aparece quando der */ }
  }
  return totais
}
export function totalCoracoes(id: string): number { return totais.get(id) ?? 0 }
export function definirTotalCoracoes(id: string, n: number) { totais.set(id, n) }

/** Vistas e pulos vão em lotes, sem atrasar o feed. */
const vistas: string[] = []
const puladas: string[] = []
let envio: ReturnType<typeof setTimeout> | null = null
export function anotarVista(id: string, pulou: boolean) {
  vistas.push(id)
  if (pulou) puladas.push(id)
  envio ??= setTimeout(enviarVistas, 15_000)
}
export function enviarVistas() {
  if (envio) { clearTimeout(envio); envio = null }
  if (!vistas.length && !puladas.length) return
  const v = vistas.splice(0, 100), p = puladas.splice(0, 100)
  chamarRpc('registrar_vistas_shorts', { p_vistas: v, p_puladas: p }, { keepalive: true }).catch(() => undefined)
}

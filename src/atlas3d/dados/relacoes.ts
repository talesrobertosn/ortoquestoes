import type { Destaque, Marco } from '../motor/Motor'
import type { Estrutura, Faixa, Grupo, Ponto } from '../tipos'
import { baseDoId, idNoLado, type IndiceAnatomico, type NoOsso, type RegistroAnatomico } from './anatomia'

/** O que a pessoa liga na ficha: cada item vira cor no modelo. */
export type Relacao = 'origem' | 'insercao' | 'nervo' | 'relacionadas'
export const CORES_RELACAO: Record<Relacao, string> = { origem: '#d64541', insercao: '#2e6fd8', nervo: '#d9a406', relacionadas: '#8e5bd1' }
export const ROTULO_RELACAO: Record<Relacao, string> = { origem: 'Origem', insercao: 'Inserção', nervo: 'Inervação', relacionadas: 'Relacionadas' }

export interface Mundo {
  existe: (id: string) => boolean
  estrutura: (id: string) => Estrutura | undefined
  grupoDe: (id: string) => Grupo | undefined
}

/** Índice dos pontos anatômicos por "id do osso|nome do marco". */
export function indexarPontos(pontos: Ponto[]) {
  const mapa = new Map<string, Ponto>()
  for (const p of pontos) mapa.set(`${p.o}|${p.en}`, p)
  return mapa
}

/** "humerus:Greater tubercle" → ponto do lado certo, se o modelo tiver esse marco. */
export function pontoDoMarco(marco: string, lado: Estrutura['s'], pontos: Map<string, Ponto>, mundo: Mundo) {
  const [osso, nome] = marco.split(':')
  const id = idNoLado(osso, lado, mundo.existe)
  return id ? pontos.get(`${id}|${nome}`) : undefined
}

/** Ids reais (com lado) das malhas de um registro. */
export function idsDoRegistro(r: RegistroAnatomico, lado: Estrutura['s'], mundo: Mundo) {
  return r.ids.map((b) => idNoLado(b, lado, mundo.existe)).filter(Boolean) as string[]
}

/** Estruturas citadas pelo registro: ossos de origem e inserção, nervos e relações "ver". */
export function relacionadosDe(r: RegistroAnatomico, indice: IndiceAnatomico) {
  const chaves = new Set<string>([...(r.nervos ?? []), ...(r.ver ?? []), ...(r.inerva ?? [])])
  chaves.delete(r.chave)
  return [...chaves].map((c) => indice.porChave.get(c)).filter(Boolean) as RegistroAnatomico[]
}

export interface Montagem { destaques: Destaque[]; marcos: Marco[]; linhas: [Marco['p'], Marco['p'], string][]; semGeometria: Relacao[]; precisa: Set<Grupo> }

/**
 * Traduz as relações ligadas em pintura no modelo. Usa só marcos que existem em pontos.json e
 * malhas que existem no catálogo; o que não tem geometria validada fica em "semGeometria" e a
 * ficha avisa que a marcação 3D ainda não está disponível.
 */
export function montarRelacoes(r: RegistroAnatomico, indice: IndiceAnatomico, lado: Estrutura['s'], ativas: Set<Relacao>, pontos: Map<string, Ponto>, mundo: Mundo): Montagem {
  const m: Montagem = { destaques: [], marcos: [], linhas: [], semGeometria: [], precisa: new Set() }
  const fixacao = (rel: 'origem' | 'insercao') => {
    const f = r[rel]
    const cor = CORES_RELACAO[rel]
    const pts = (f?.m ?? []).map((x) => pontoDoMarco(x, lado, pontos, mundo)).filter(Boolean) as Ponto[]
    const ossos = (f?.o ?? []).map((o) => idNoLado(o, lado, mundo.existe)).filter(Boolean) as string[]
    if (!pts.length && !ossos.length) { m.semGeometria.push(rel); return [] }
    for (const p of pts) m.marcos.push({ p: p.p, cor })
    for (const o of ossos) { m.destaques.push({ id: o, cor }); m.precisa.add('osso') }
    if (pts.length) m.precisa.add('osso')
    return pts
  }
  const origens = ativas.has('origem') ? fixacao('origem') : []
  const insercoes = ativas.has('insercao') ? fixacao('insercao') : []
  // linha de referência: do centro dos marcos de origem ao centro dos de inserção
  if (origens.length && insercoes.length) m.linhas.push([centro(origens), centro(insercoes), '#3b3a36'])
  if (ativas.has('nervo')) {
    const nervos = (r.nervos ?? []).map((c) => indice.porChave.get(c)).filter(Boolean) as RegistroAnatomico[]
    const ids = nervos.flatMap((n) => idsDoRegistro(n, lado, mundo))
    if (!ids.length) m.semGeometria.push('nervo')
    for (const id of ids) { m.destaques.push({ id, cor: CORES_RELACAO.nervo }); m.precisa.add('nervo') }
  }
  if (ativas.has('relacionadas')) {
    const ids = relacionadosDe(r, indice).filter((x) => !(r.nervos ?? []).includes(x.chave) || !ativas.has('nervo')).flatMap((x) => idsDoRegistro(x, lado, mundo))
    if (!ids.length) m.semGeometria.push('relacionadas')
    for (const id of ids) { m.destaques.push({ id, cor: CORES_RELACAO.relacionadas }); const g = mundo.grupoDe(id); if (g) m.precisa.add(g) }
  }
  // a mesma malha pedida duas vezes fica com a primeira cor
  const vistos = new Set<string>()
  m.destaques = m.destaques.filter((d) => (vistos.has(d.id) ? false : (vistos.add(d.id), true)))
  return m
}

function centro(pts: Ponto[]): [number, number, number] {
  const s = pts.reduce((a, p) => [a[0] + p.p[0], a[1] + p.p[1], a[2] + p.p[2]], [0, 0, 0])
  return [s[0] / pts.length, s[1] / pts.length, s[2] / pts.length]
}

/**
 * O que se fixa num osso. Nos ossos longos com faixa (proximal, diáfise, distal), só o que tem marco
 * naquela parte; os que não têm marco pontual nesse osso continuam na lista, sem filtro.
 */
export function fixadosNoOsso(indice: IndiceAnatomico, osso: Estrutura, faixa: Faixa | undefined, pontos: Map<string, Ponto>, faixaDoPonto: (z: number) => Faixa | undefined) {
  const lista: NoOsso[] = indice.noOsso[baseDoId(osso.id)] ?? []
  if (!faixa) return lista
  return lista.filter((x) => {
    if (!x.m?.length) return true
    return x.m.some((nome) => { const p = pontos.get(`${osso.id}|${nome}`); return p && faixaDoPonto(p.p[2]) === faixa })
  })
}

/** Marcos de um osso para a ficha do osso: origens em vermelho, inserções em azul. */
export function marcosNoOsso(itens: NoOsso[], osso: Estrutura, pontos: Map<string, Ponto>): Marco[] {
  const marcos: Marco[] = []
  const usados = new Set<string>()
  for (const x of itens) for (const nome of x.m ?? []) {
    const p = pontos.get(`${osso.id}|${nome}`)
    const chave = `${nome}|${x.t}`
    if (!p || usados.has(chave)) continue
    usados.add(chave)
    marcos.push({ p: p.p, cor: x.t === 'o' ? CORES_RELACAO.origem : CORES_RELACAO.insercao })
  }
  return marcos
}

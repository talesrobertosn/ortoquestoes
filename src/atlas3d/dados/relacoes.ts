import type { Destaque, Marco } from '../motor/Motor'
import type { Area, Estrutura, Faixa, Grupo, Ponto } from '../tipos'
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
  const chaves = new Set<string>([...(r.nervos ?? []), ...(r.ver ?? []), ...(r.inerva ?? []), ...(r.citado ?? [])])
  chaves.delete(r.chave)
  return [...chaves].map((c) => indice.porChave.get(c)).filter(Boolean) as RegistroAnatomico[]
}

export interface Montagem { destaques: Destaque[]; marcos: Marco[]; linhas: [Marco['p'], Marco['p'], string][]; semGeometria: Relacao[]; precisa: Set<Grupo>; areas: Destaque[] }

// ---------- áreas de origem e inserção (Z-Anatomy) ----------

/** Áreas indexadas pelo músculo (id base da malha e nome em inglês) e pelo osso onde ficam. */
export interface IndiceAreas { porChave: Map<string, Area[]>; porOsso: Map<string, Area[]> }
const chaveNome = (en: string) => en.toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
export function indexarAreas(areas: Area[]): IndiceAreas {
  const porChave = new Map<string, Area[]>()
  const porOsso = new Map<string, Area[]>()
  const por = (m: Map<string, Area[]>, k: string, a: Area) => m.set(k, [...(m.get(k) ?? []), a])
  for (const a of areas) {
    por(porChave, `k:${a.k}`, a)
    if (a.mu) por(porChave, `mu:${a.mu}`, a)
    if (a.o) por(porOsso, a.o, a)
  }
  return { porChave, porOsso }
}

/** Áreas de um músculo no lado pedido: pela malha (ids do registro) e pelo nome (músculo inteiro, como "Biceps brachii"). */
export function areasDoMusculo(idx: IndiceAreas, lado: Estrutura['s'], bases: string[], nomesEn: string[]) {
  const vistas = new Set<string>()
  const lista: Area[] = []
  const chaves = [...bases.map((b) => `mu:${b}`), ...nomesEn.flatMap((n) => [`k:${chaveNome(n)}`, `k:${chaveNome(n.replace(/ muscle$/i, ''))}`])]
  for (const c of chaves) for (const a of idx.porChave.get(c) ?? []) {
    if (a.s !== lado && lado !== 'm') continue
    if (!vistas.has(a.id)) { vistas.add(a.id); lista.push(a) }
  }
  return lista
}

const centroCaixa = (b: Area['b']): Marco['p'] => [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2]

/** Origem e inserção de um músculo só pelas áreas do modelo (músculos fora do banco conferido). */
export function montarAreas(areas: Area[], ativas: Set<Relacao>): Montagem {
  const m: Montagem = { destaques: [], marcos: [], linhas: [], semGeometria: [], precisa: new Set(), areas: [] }
  const origens = ativas.has('origem') ? areas.filter((a) => a.t === 'o') : []
  const insercoes = ativas.has('insercao') ? areas.filter((a) => a.t === 'i') : []
  for (const a of origens) m.areas.push({ id: a.id, cor: CORES_RELACAO.origem })
  for (const a of insercoes) m.areas.push({ id: a.id, cor: CORES_RELACAO.insercao })
  if (m.areas.length) m.precisa.add('osso')
  if (origens.length && insercoes.length) m.linhas.push([media(origens.map((a) => centroCaixa(a.b))), media(insercoes.map((a) => centroCaixa(a.b))), '#3b3a36'])
  return m
}

/** Áreas que ficam num osso; nos ossos longos com faixa, só as daquela parte (pelo centro da área). */
export function areasNoOsso(idx: IndiceAreas, osso: Estrutura, faixa: Faixa | undefined, faixaDoPonto: (z: number) => Faixa | undefined) {
  const lista = idx.porOsso.get(osso.id) ?? []
  return faixa ? lista.filter((a) => faixaDoPonto((a.b[2] + a.b[5]) / 2) === faixa) : lista
}

/**
 * Traduz as relações ligadas em pintura no modelo. Usa só marcos que existem em pontos.json e
 * malhas que existem no catálogo; o que não tem geometria validada fica em "semGeometria" e a
 * ficha avisa que a marcação 3D ainda não está disponível.
 */
export function montarRelacoes(r: RegistroAnatomico, indice: IndiceAnatomico, lado: Estrutura['s'], ativas: Set<Relacao>, pontos: Map<string, Ponto>, mundo: Mundo, idxAreas?: IndiceAreas | null): Montagem {
  const m: Montagem = { destaques: [], marcos: [], linhas: [], semGeometria: [], precisa: new Set(), areas: [] }
  // músculo com área desenhada no modelo (Z-Anatomy): a área exata no osso substitui o ponto e o osso inteiro
  const areas = idxAreas && r.tipo === 'musculo'
    ? areasDoMusculo(idxAreas, lado, r.ids, [r.en, ...idsDoRegistro(r, lado, mundo).map((id) => mundo.estrutura(id)?.en ?? '')].filter(Boolean))
    : []
  const fixacao = (rel: 'origem' | 'insercao'): Marco['p'][] => {
    const f = r[rel]
    const cor = CORES_RELACAO[rel]
    const doModelo = areas.filter((a) => a.t === (rel === 'origem' ? 'o' : 'i'))
    if (doModelo.length) {
      for (const a of doModelo) m.areas.push({ id: a.id, cor })
      m.precisa.add('osso')
      return doModelo.map((a) => centroCaixa(a.b))
    }
    const pts = (f?.m ?? []).map((x) => pontoDoMarco(x, lado, pontos, mundo)).filter(Boolean) as Ponto[]
    const ossos = (f?.o ?? []).map((o) => idNoLado(o, lado, mundo.existe)).filter(Boolean) as string[]
    if (!pts.length && !ossos.length) { m.semGeometria.push(rel); return [] }
    for (const p of pts) m.marcos.push({ p: p.p, cor })
    for (const o of ossos) { m.destaques.push({ id: o, cor }); m.precisa.add('osso') }
    if (pts.length) m.precisa.add('osso')
    return pts.map((p) => p.p)
  }
  const origens = ativas.has('origem') ? fixacao('origem') : []
  const insercoes = ativas.has('insercao') ? fixacao('insercao') : []
  // linha de referência: do centro dos marcos de origem ao centro dos de inserção
  if (origens.length && insercoes.length) m.linhas.push([media(origens), media(insercoes), '#3b3a36'])
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

function media(pts: Marco['p'][]): Marco['p'] {
  const s = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0])
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

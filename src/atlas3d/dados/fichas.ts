import FICHAS from './fichas.json'
import { BASE_ASSETS } from '../config'
import type { Estrutura, Faixa } from '../tipos'
import { baseDoId } from './nomes'

/** Ficha ortopédica: a parte do esqueleto com as suas lesões, classificações e questões. */
export interface Ficha {
  chave: string
  nome: string
  ossos?: string[]
  prefixos?: string[]
  faixa?: Faixa
  regiao: string
  /** subtemas do acervo de fraturas e lesões dessa parte */
  lesoes: string[]
  anatomia: { subtemas: string[]; termos: string[] }
  /** seções dos resumos da Biblioteca com as classificações (capítulo e seções) */
  biblioteca?: { c: string; s: string[] }[]
}
export const LISTA_FICHAS = FICHAS as Ficha[]

/** A ficha de uma estrutura (e da faixa clicada, nos ossos longos). */
export function fichaDe(e: Estrutura, faixa?: Faixa): Ficha | undefined {
  const base = baseDoId(e.id)
  return LISTA_FICHAS.find((f) =>
    (f.ossos?.includes(base) || f.prefixos?.some((p) => base.includes(p))) && (!f.faixa || f.faixa === faixa))
}

export function fichaPorChave(chave: string | null | undefined) { return LISTA_FICHAS.find((f) => f.chave === chave) }

/** Questões ligadas a cada ficha (gerado por scripts/atlas3d/vincular_questoes.mjs). */
export interface Vinculo { l: string[]; a: string[] }
let vinculos: Promise<Record<string, Vinculo>> | null = null
export function carregarVinculos() {
  vinculos ??= fetch(`${BASE_ASSETS}questoes.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {}))
  vinculos.catch(() => { vinculos = null })
  return vinculos
}

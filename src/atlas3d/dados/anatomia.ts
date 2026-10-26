import { BASE_ASSETS } from '../config'
import type { Estrutura } from '../tipos'

/**
 * Banco anatômico do Atlas 3D (public/atlas3d/v1/anatomia.json, gerado por
 * scripts/atlas3d/montar_anatomia.mjs a partir dos lotes conferidos página a página).
 * Fica separado da interface e só é baixado quando o atlas abre.
 */
export type TipoRegistro = 'musculo' | 'nervo' | 'ligamento' | 'osso' | 'arteria' | 'veia' | 'fascia'
export type StatusRegistro = 'verificado' | 'pendente' | 'conflito'
/** Fixação: texto próprio, marcos pontuais do modelo ("osso:Nome do marco") e ossos inteiros. */
export interface Fixacao { t: string; m?: string[]; o?: string[] }
export interface RegistroAnatomico {
  chave: string
  tipo: TipoRegistro
  nome: string
  en: string
  /** ids das malhas 3D, sem o sufixo de lado */
  ids: string[]
  regiao: string
  grupo?: string
  articulacao?: string
  origem?: Fixacao
  insercao?: Fixacao
  nervos?: string[]
  acao?: string
  funcao?: string
  restringe?: string
  raizes?: string
  trajeto?: string
  sensitivo?: string
  relacoes?: string[]
  clinica?: string
  ver?: string[]
  /** derivado: músculos que o nervo inerva */
  inerva?: string[]
  /** derivado: registros que citam este em "ver" */
  citado?: string[]
  ramos?: string
  irriga?: string
  fonte: { l: string; p: number[] }[]
  status: StatusRegistro
  notas?: string
}
export interface NoOsso { c: string; t: 'o' | 'i'; m?: string[] }
export interface BancoAnatomico {
  versao: number
  fontes: Record<string, string>
  registros: RegistroAnatomico[]
  porId: Record<string, string>
  noOsso: Record<string, NoOsso[]>
}

export interface IndiceAnatomico extends BancoAnatomico { porChave: Map<string, RegistroAnatomico> }

let banco: Promise<IndiceAnatomico> | null = null
export function carregarAnatomia(): Promise<IndiceAnatomico> {
  banco ??= fetch(`${BASE_ASSETS}anatomia.json`).then((r) => {
    if (!r.ok) throw new Error('anatomia')
    return r.json()
  }).then((b: BancoAnatomico) => ({ ...b, porChave: new Map(b.registros.map((x) => [x.chave, x])) }))
  banco.catch(() => { banco = null })
  return banco
}

export const baseDoId = (id: string) => id.replace(/_[lr]$/, '')
const SUFIXO: Record<string, string> = { d: '_r', e: '_l' }

export function registroDaEstrutura(indice: IndiceAnatomico, e: Estrutura) {
  const chave = indice.porId[baseDoId(e.id)]
  return chave ? indice.porChave.get(chave) : undefined
}

/**
 * Id real no modelo para um id base, no lado pedido: os bilaterais têm _l/_r, os da linha média não.
 * Sem o lado pedido, cai no direito.
 */
export function idNoLado(base: string, lado: Estrutura['s'], existe: (id: string) => boolean) {
  const comLado = `${base}${SUFIXO[lado] ?? '_r'}`
  if (existe(comLado)) return comLado
  return existe(base) ? base : undefined
}

/** Fonte para mostrar na ficha. As páginas ficam só no banco, para auditoria: são as posições no PDF local, não a paginação impressa. */
export function nomeDaFonte(indice: IndiceAnatomico, r: RegistroAnatomico) {
  return [...new Set(r.fonte.map((f) => (f.l === 'netter-ao2' ? 'Netter, Atlas de Anatomia Ortopédica, 2ª ed.' : indice.fontes[f.l] ?? f.l)))].join(' · ')
}

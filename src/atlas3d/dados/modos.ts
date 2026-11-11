import type { Arvore, Estrutura, Grupo } from '../tipos'

/**
 * Dois jeitos de usar o atlas (Tales, 11/11/2026): a Ortopedia é a casa (aparelho locomotor, regiões e
 * visualizações prontas); o Corpo inteiro abre os sistemas e as camadas além do aparelho locomotor, sem
 * perder o esqueleto como referência. A interface nunca chama nada de "não ortopédico".
 */
export type Modo = 'ortopedia' | 'corpo'

/** Camadas que aparecem na barra em cada modo (na ordem da tela). */
export const GRUPOS_DO_MODO: Record<Modo, Grupo[]> = {
  ortopedia: ['osso', 'musculo', 'ligamento', 'nervo', 'arteria', 'veia', 'fascia'],
  // a pelve feminina não aparece como camada: é a chave Masculino | Feminino do Corpo inteiro
  corpo: ['osso', 'musculo', 'ligamento', 'nervo', 'arteria', 'veia', 'orgao', 'encefalo', 'linfatico', 'dente', 'fascia', 'regiao'],
}
/** As camadas que só existem no Corpo inteiro (busca e quiz da Ortopedia ficam sem elas). */
export const SO_CORPO = new Set<Grupo>(['orgao', 'encefalo', 'linfatico', 'dente', 'regiao', 'feminino'])

/**
 * Sistemas do Corpo inteiro: cada um aponta para nós da hierarquia (arvore.json, nomes da TA2). Abrir um sistema
 * liga as camadas que ele usa, isola o que pertence a ele e permite descer pelas partes.
 */
export interface Sistema { id: string; nome: string; resumo: string; nos: string[]; cor: string }
export const SISTEMAS: Sistema[] = [
  { id: 'cardiovascular', nome: 'Coração e vasos', resumo: 'Câmaras, valvas, artérias e veias', nos: ['Sistema arterial', 'Sistema venoso'], cor: '#c23b30' },
  { id: 'respiratorio', nome: 'Respiratório', resumo: 'Pulmões, brônquios e traqueia', nos: ['Sistema respiratório'], cor: '#4f8fc0' },
  { id: 'digestorio', nome: 'Digestório', resumo: 'Do esôfago ao colo, fígado e pâncreas', nos: ['Sistema digestório', 'Cavidade abdominopélvica'], cor: '#b97a5c' },
  { id: 'urinario', nome: 'Urinário', resumo: 'Rins, ureteres, bexiga e uretra', nos: ['Sistema urinário'], cor: '#c9a227' },
  { id: 'genital', nome: 'Genital', resumo: 'Masculino e a pelve feminina', nos: ['Sistemas genitais', 'Órgãos genitais femininos internos'], cor: '#c9727e' },
  { id: 'endocrino', nome: 'Glândulas endócrinas', resumo: 'Tireoide, paratireoides, suprarrenais, hipófise', nos: ['Glândulas endócrinas'], cor: '#8e5bd1' },
  { id: 'nervoso-central', nome: 'Encéfalo e medula', resumo: 'Lobos, tronco, cerebelo e tratos da medula', nos: ['Sistema nervoso central'], cor: '#d5a2a8' },
  { id: 'nervos', nome: 'Nervos', resumo: 'Cranianos, plexos e nervos periféricos', nos: ['Sistema nervoso periférico'], cor: '#e9bf3c' },
  { id: 'sentidos', nome: 'Órgãos dos sentidos', resumo: 'Olho, orelha, nariz e língua', nos: ['Órgãos dos sentidos'], cor: '#4fb3a8' },
  { id: 'linfatico', nome: 'Linfático', resumo: 'Linfonodos, baço, timo e tonsilas', nos: ['Órgãos linfoides'], cor: '#5cb88a' },
  { id: 'dentes', nome: 'Dentes', resumo: 'Incisivos, caninos, pré-molares e molares', nos: ['Dentes'], cor: '#bfb59a' },
  { id: 'regioes', nome: 'Regiões do corpo', resumo: 'A superfície dividida como no exame físico', nos: ['Regiões do corpo humano'], cor: '#d9a98c' },
]

/** Hierarquia pronta para navegar: filhos de cada nó, estruturas sob cada nó e busca por nome. */
export interface IndiceArvore {
  arvore: Arvore
  filhos: Map<number, number[]>
  /** ids (com lado) de todas as estruturas abaixo de cada nó */
  ids: Map<number, string[]>
  porNome: Map<string, number[]>
}
export function indexarArvore(arvore: Arvore, estruturas: Estrutura[]): IndiceArvore {
  const filhos = new Map<number, number[]>()
  const porNome = new Map<string, number[]>()
  arvore.n.forEach((no, i) => {
    if (no[1] !== undefined) filhos.set(no[1], [...(filhos.get(no[1]) ?? []), i])
    porNome.set(no[0], [...(porNome.get(no[0]) ?? []), i])
  })
  const ids = new Map<number, string[]>()
  for (const e of estruturas) {
    let i: number | undefined = arvore.e[e.id]
    let passos = 0
    while (i !== undefined && i >= 0 && passos++ < 20) { ids.set(i, [...(ids.get(i) ?? []), e.id]); i = arvore.n[i][1] }
  }
  return { arvore, filhos, ids, porNome }
}

/** Do nó até a raiz (raiz primeiro). */
export function caminhoDoNo(idx: IndiceArvore, no: number) {
  const c: number[] = []
  let i: number | undefined = no
  while (i !== undefined && i >= 0 && c.length < 20) { c.unshift(i); i = idx.arvore.n[i][1] }
  return c
}

/** Nós de um sistema (pelos nomes) e todas as estruturas deles. */
export function nosDoSistema(idx: IndiceArvore, s: Sistema) { return s.nos.flatMap((n) => idx.porNome.get(n) ?? []) }
export function idsDoSistema(idx: IndiceArvore, s: Sistema) { return [...new Set(nosDoSistema(idx, s).flatMap((n) => idx.ids.get(n) ?? []))] }

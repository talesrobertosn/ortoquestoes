/** Camadas dos arquivos GLB (uma malha por estrutura, nó = id estável). */
export type Camada = 'bone' | 'muscle' | 'connective' | 'fascia' | 'nerve' | 'vessel' | 'lymph' | 'organ' | 'brain' | 'tooth'
/** Camadas que a pessoa liga e desliga. Os vasos se dividem em artérias e veias pelo nome. */
export type Grupo = 'osso' | 'musculo' | 'ligamento' | 'fascia' | 'nervo' | 'arteria' | 'veia' | 'linfatico' | 'orgao' | 'encefalo' | 'dente'
export type Lado = 'e' | 'd' | 'm'

/** Uma estrutura do catálogo (public/atlas3d/v1/estruturas.json). */
export interface Estrutura {
  id: string
  k: Camada
  s: Lado
  en: string
  la?: string
  /** caixa em mm: [minX, minY, minZ, maxX, maxY, maxZ]; Z para cima, esquerda = +X, anterior = −Y */
  b: [number, number, number, number, number, number]
}

export interface Catalogo {
  versao: string
  camadas: Record<Camada, { estruturas: number; arquivo: string; kb: number }>
  estruturas: Estrutura[]
}

/** Ponto anatômico de um osso (pontos.json). */
export interface Ponto { o: string; en: string; p: [number, number, number]; a?: 1 }

/** Parte de um osso longo, para as fichas (proximal, diáfise, distal). */
export type Faixa = 'proximal' | 'diafise' | 'distal'

/** O que está selecionado: uma estrutura e, nos ossos longos, a faixa clicada. */
export interface Selecao { id: string; faixa?: Faixa }

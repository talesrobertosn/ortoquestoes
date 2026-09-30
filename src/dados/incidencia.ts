import type { Indice } from './tipos'

/**
 * Temas que mais caem no TEOT e no TARO: ranking das áreas e, dentro de cada
 * uma, dos assuntos, em quatro níveis. Serve de bússola, não de contagem —
 * por isso guarda só a ordem, um peso aproximado de 1 a 10 por área (para o
 * tamanho da barra) e o nível de cada assunto, sem números de questões.
 *
 * Os nomes dos assuntos são os mesmos subtemas do acervo; quando existem no
 * tema indicado, viram atalho para treinar exatamente aquele assunto.
 */

/** 4 = cai muito · 3 = cai com frequência · 2 = cai às vezes · 1 = cai pouco */
export type Nivel = 1 | 2 | 3 | 4

export const ROTULO_NIVEL: Record<Nivel, string> = {
  4: 'Cai muito',
  3: 'Cai com frequência',
  2: 'Cai às vezes',
  1: 'Cai pouco',
}

export interface Foco {
  nome: string
  nivel: Nivel
  /** Subtema do acervo que representa o assunto, quando o nome não bate. */
  noAcervo?: string
}
export interface AreaIncidencia {
  id: string
  nome: string
  /** Tema do acervo onde ficam as questões desta área. */
  slug: string
  /** Quando a área é um recorte do tema (trauma pediátrico), o subtema que a reúne. */
  subtema?: string
  /** Peso aproximado na prova, de 1 a 10. Só para o tamanho da barra. */
  peso: number
  focos: Foco[]
}

const f = (nivel: Nivel, ...nomes: string[]): Foco[] => nomes.map((nome) => ({ nome, nivel }))

/** Na ordem do ranking: a primeira é a área que mais cai. */
export const AREAS: AreaIncidencia[] = [
  {
    id: 'trauma', nome: 'Trauma adulto', slug: 'trauma', peso: 10,
    focos: [
      ...f(4, 'Fratura do Cotovelo', 'Fratura da Coluna Toracolombosacra', 'Fratura do Antebraço', 'Fratura do Metacarpo e Falange', 'Fratura do Úmero Proximal'),
      ...f(3, 'Síndrome Compartimental', 'Fratura do Carpo', 'Fratura da Clavícula', 'Fratura da Escápula', 'Fratura do Rádio Distal', 'Fratura do Colo do Fêmur', 'Fratura Diafisária da Tíbia', 'Fratura do Retropé', 'Luxação Acromioclavicular', 'Fratura da Coluna Cervical Alta', 'Fratura do Acetábulo', 'Fratura de Úmero Distal', 'Fratura do Anel Pélvico', 'Fratura Diafisária do Fêmur', 'Fratura do Planalto Tibial', 'Fratura do Tornozelo', 'Fraturas Expostas', 'Fratura por Estresse'),
      ...f(2, 'Fratura do Fêmur Distal', 'Fratura do Pilão Tibial', 'Politrauma', 'Fratura Subtrocantérica', 'Fratura da Diáfise Umeral', 'Fratura Transtrocantérica', 'Fratura da Patela', 'Luxação do Quadril', 'Fratura da Coluna Cervical Baixa', 'Luxação do Joelho', 'Fratura do Medio e Antepé'),
      ...f(1, 'Fratura da Cabeça Femoral', 'Fratura da mão'),
    ],
  },
  {
    id: 'ombro-cotovelo', nome: 'Ombro e cotovelo', slug: 'ombro-cotovelo', peso: 7,
    focos: [
      ...f(4, 'Anatomia', 'Lesões do Manguito Rotador', 'Luxação e Instabilidade do Ombro', 'Artrose e artroplastia de ombro', 'Exame Físico', 'Instabilidade do Cotovelo'),
      ...f(3, 'Lesões Tendíneas', 'Miscelânea', 'Artroplastia e Artroscopia do Cotovelo', 'Radiologia do ombro', 'Vias de acesso'),
      ...f(2, 'Epicondilites', 'Tendinite Calcárea', 'Capsulite Adesiva', 'Rigidez do Cotovelo', 'Artroscopia de ombro', 'Biomecânica', 'Lesões SLAP'),
      ...f(1, 'Ossificação heterotópica'),
    ],
  },
  {
    id: 'mao', nome: 'Mão e punho', slug: 'mao', peso: 6,
    focos: [
      ...f(4, 'Anatomia', 'Síndromes Compressivas dos MMSS', 'Alterações Congênitas dos MMSS', 'Lesões Tendíneas', 'Lesões Nervosas'),
      ...f(3, 'Exame Físico', 'Doença de Dupuytren', 'Miscelânea', 'Cobertura Cutânea'),
      ...f(2, 'Amputações', 'Luxação e instabilidade do Carpo', 'Mão Reumatoide', 'Tenossinovites', 'Doença de Kienbock', 'Lesão ligamentar da mão', 'Radiologia da mão', 'Deformidades dos Dedos', 'Paralisia obstétrica'),
      ...f(1, 'Lesões da Fibrocartilagem Triangular', 'Rizartrose', 'Biomecânica', 'Artroscopia de Punho', 'Artrose do punho', 'Vias de acesso', 'Artrose e artroplastia da mão'),
    ],
  },
  {
    id: 'pediatria', nome: 'Ortopedia pediátrica', slug: 'pediatria', peso: 5,
    focos: [
      ...f(4, 'Deformidades dos Membros Inferiores', 'Displasia do Desenvolvimento do Quadril'),
      ...f(3, 'Alterações Congênitas', 'Paralisia Cerebral', 'Pé Torto Congênito', 'Marcha', 'Epifisiólise'),
      ...f(2, 'Doença de Legg-Calvè-Perthes', 'Maus Tratos', 'Miscelânea', 'Tíbia Vara de Blount', 'Síndromes Genéticas', 'Menisco discoide', 'Mielomeningocele', 'Osteogênese Imperfeita', 'Desenvolvimento Neuropsicomotor', 'Sinovite Transitória', 'Artrogripose'),
      ...f(1, 'Osteocondroses', 'Torcicolo congênito', 'Síndrome de Grisel', 'Luxação congênita da cabeça do rádio'),
    ],
  },
  {
    id: 'joelho', nome: 'Joelho', slug: 'joelho', peso: 4,
    focos: [
      ...f(4, 'Anatomia', 'Artrose e Artroplastia de Joelho'),
      ...f(3, 'Lesões Meniscais', 'Exame Físico', 'Lesão do LCA', 'Lesão do LCP', 'Lesões do Mecanismo Extensor', 'Instabilidade Femoropatelar'),
      ...f(2, 'Radiologia do joelho', 'Osteocondrite Dissecante', 'Menisco discoide', 'Osteotomias'),
      ...f(1, 'Biomecânica', 'Lesão Osteocondral de Joelho', 'Artroscopia de joelho', 'Osteonecrose', 'Tendinite patelar'),
    ],
  },
  {
    id: 'trauma-pediatrico', nome: 'Trauma pediátrico', slug: 'pediatria', subtema: 'Trauma Pediátrico', peso: 3,
    focos: [
      { nome: 'Fraturas do Cotovelo', nivel: 4, noAcervo: 'Ombro e cotovelo' },
      ...f(4, 'Fraturas do Fêmur'),
      ...f(3, 'Fraturas da Perna', 'Fraturas do Antebraço', 'Fraturas do Tornozelo', 'Lesões Fisárias'),
      ...f(2, 'Fraturas da Bacia', 'Fraturas do Ombro', 'Fraturas do Punho e Mão', 'Trauma da Coluna', 'Luxações'),
      ...f(1, 'Fraturas por estresse', 'Fraturas do Pé'),
    ],
  },
  {
    id: 'coluna', nome: 'Coluna', slug: 'coluna', peso: 3,
    focos: [
      ...f(4, 'Exame Físico', 'Anatomia'),
      ...f(3, 'Escoliose', 'Trauma Raquimedular e Síndromes Medulares', 'Espondilolistese', 'Hérnia de disco'),
      ...f(2, 'Radiologia da coluna', 'Lombalgia', 'Doença de Scheuermann'),
      ...f(1, 'Infecções da coluna', 'Estenose de Canal', 'Vias de acesso', 'Biomecânica', 'Neoplasias', 'Espondilite Anquilosante'),
    ],
  },
  {
    id: 'pe-tornozelo', nome: 'Pé e tornozelo', slug: 'pe-tornozelo', peso: 3,
    focos: [
      ...f(4, 'Anatomia', 'Deformidades dos Pés'),
      ...f(3, 'Hálux Valgo'),
      ...f(2, 'Exame Físico', 'Miscelânea', 'Pé Diabético', 'Ruptura do Tendão Calcâneo', 'Coalizões Tarsais', 'Artrose e Artroplastia de Tornozelo', 'Entorse de Tornozelo', 'Lesões Osteocondrais do Tornozelo'),
      ...f(1, 'Hálux rígido', 'Radiologia do pé e tornozelo', 'Vias de acesso', 'Biomecânica', 'Tendinopatias', 'Pé Reumatoide', 'Artroscopia de tornozelo'),
    ],
  },
  {
    id: 'tumores', nome: 'Tumores', slug: 'tumores', peso: 3,
    focos: [
      ...f(4, 'Generalidades dos Tumores'),
      ...f(3, 'Metástase', 'Tumores de Partes Moles', 'Tumores Cartilaginosos', 'Miscelânea', 'Tumor de Células Gigantes'),
      ...f(2, 'Osteossarcoma', 'Mieloma Múltiplo', 'Cistos Ósseos', 'Doença de Paget', 'Tumor de Ewing', 'Histiocitose de Células de Langerhans', 'Tumores Fibrosos'),
      ...f(1, 'Osteocondroma', 'Cordoma', 'Condrossarcoma', 'Osteoma osteoide'),
    ],
  },
  {
    id: 'conceitos-basicos', nome: 'Conceitos básicos', slug: 'conceitos-basicos', peso: 2,
    focos: [
      ...f(4, 'Osteomielite'),
      ...f(3, 'Princípios de Osteossíntese'),
      ...f(2, 'Pseudoartrose', 'Artrite Séptica', 'Dor', 'Fixadores Externos', 'Infecções', 'Ossificação', 'Amputações'),
      ...f(1, 'Lesões Musculares', 'Distúrbios da Consolidação Óssea', 'Tratamento conservador', 'Laboratório e Medicamentos', 'Metodologia científica', 'Deformidades Ósseas', 'Exames de imagem'),
    ],
  },
  {
    id: 'quadril', nome: 'Quadril', slug: 'quadril', peso: 2,
    focos: [
      ...f(4, 'Anatomia', 'Artrose e Artroplastia do Quadril'),
      ...f(3, 'Osteonecrose', 'Exame Físico'),
      ...f(2, 'Impacto Femoro-acetabular', 'Radiologia do quadril', 'Vias de acesso'),
      ...f(1, 'Biomecânica', 'Artroscopia de quadril', 'Tendinopatias', 'Fraturas Periprotéticas', 'Osteotomias', 'Pubalgia'),
    ],
  },
  {
    id: 'osteometabolicas', nome: 'Osteometabólicas', slug: 'osteometabolicas', peso: 1,
    focos: [
      ...f(3, 'Doenças Osteometabólicas'),
      ...f(2, 'Tuberculose Óssea', 'Osteoporose', 'Artrites Inflamatórias'),
    ],
  },
]

/** Os assuntos campeões de cobrança, somando todas as áreas, do mais para o menos cobrado. */
export const TOP_ASSUNTOS: Array<{ area: string; nome: string; rotulo: string }> = [
  { area: 'ombro-cotovelo', nome: 'Anatomia', rotulo: 'Anatomia do ombro e cotovelo' },
  { area: 'mao', nome: 'Anatomia', rotulo: 'Anatomia da mão e punho' },
  { area: 'joelho', nome: 'Anatomia', rotulo: 'Anatomia do joelho' },
  { area: 'trauma', nome: 'Fratura do Cotovelo', rotulo: 'Fratura do cotovelo (adulto)' },
  { area: 'trauma-pediatrico', nome: 'Fraturas do Cotovelo', rotulo: 'Fraturas do cotovelo na criança' },
  { area: 'ombro-cotovelo', nome: 'Lesões do Manguito Rotador', rotulo: 'Lesões do manguito rotador' },
  { area: 'pediatria', nome: 'Deformidades dos Membros Inferiores', rotulo: 'Deformidades dos membros inferiores' },
  { area: 'ombro-cotovelo', nome: 'Luxação e Instabilidade do Ombro', rotulo: 'Luxação e instabilidade do ombro' },
  { area: 'ombro-cotovelo', nome: 'Artrose e artroplastia de ombro', rotulo: 'Artrose e artroplastia do ombro' },
  { area: 'quadril', nome: 'Anatomia', rotulo: 'Anatomia do quadril' },
  { area: 'mao', nome: 'Síndromes Compressivas dos MMSS', rotulo: 'Síndromes compressivas dos MMSS' },
  { area: 'pe-tornozelo', nome: 'Anatomia', rotulo: 'Anatomia do pé e tornozelo' },
  { area: 'tumores', nome: 'Generalidades dos Tumores', rotulo: 'Generalidades dos tumores' },
  { area: 'ombro-cotovelo', nome: 'Exame Físico', rotulo: 'Exame físico do ombro e cotovelo' },
  { area: 'trauma', nome: 'Fratura da Coluna Toracolombosacra', rotulo: 'Fratura da coluna toracolombar' },
  { area: 'mao', nome: 'Alterações Congênitas dos MMSS', rotulo: 'Alterações congênitas dos MMSS' },
  { area: 'mao', nome: 'Lesões Tendíneas', rotulo: 'Lesões tendíneas da mão' },
  { area: 'pe-tornozelo', nome: 'Deformidades dos Pés', rotulo: 'Deformidades dos pés' },
  { area: 'joelho', nome: 'Artrose e Artroplastia de Joelho', rotulo: 'Artrose e artroplastia do joelho' },
  { area: 'conceitos-basicos', nome: 'Osteomielite', rotulo: 'Osteomielite' },
]

export const areaPorId = (id: string) => AREAS.find((a) => a.id === id)

/**
 * Peso de cada tema do acervo no plano, pela posição no ranking: as áreas
 * que mais caem ganham até 35% a mais de espaço, as que menos caem perdem até 20%.
 */
export function pesoIncidenciaDoTema(slug: string): number {
  const areas = AREAS.filter((a) => a.slug === slug)
  if (!areas.length) return 1
  const melhor = Math.min(...areas.map((a) => AREAS.indexOf(a)))
  return 1.35 - (0.55 * melhor) / (AREAS.length - 1)
}

/**
 * Nível de incidência de cada questão do acervo, pelo subtema mais cobrado
 * que ela tem dentro do próprio tema. Questões sem subtema mapeado ficam de fora.
 */
/** posicao: lugar do assunto no ranking da própria área (1 = o que mais cai); 0 quando não está no ranking. */
export interface FocoDaQuestao { nome: string; nivel: Nivel | 0; ordem: number; posicao: number }

const cacheFocos = new WeakMap<Indice, Map<string, FocoDaQuestao>>()
/**
 * O assunto principal de cada questão: o mais cobrado entre os subtemas dela
 * (desempate pela ordem do ranking). Sem assunto mapeado, fica o primeiro
 * subtema da questão, com nível 0. Calculado uma vez por acervo.
 */
export function focoPorQuestao(indice: Indice): Map<string, FocoDaQuestao> {
  const pronto = cacheFocos.get(indice)
  if (pronto) return pronto
  const mapa = new Map<string, FocoDaQuestao>()
  const melhor = (id: string, novo: FocoDaQuestao) => {
    const atual = mapa.get(id)
    if (!atual || novo.nivel > atual.nivel || (novo.nivel === atual.nivel && novo.ordem < atual.ordem)) mapa.set(id, novo)
  }
  let ordem = 0
  for (const area of AREAS) {
    // Recorte inteiro que já é muito cobrado (trauma pediátrico): nível mínimo 3.
    if (area.subtema) { const o = ordem++; for (const id of idsDoFoco(indice, area)) melhor(id, { nome: area.subtema, nivel: 3, ordem: o + 500, posicao: 0 }) }
    area.focos.forEach((foco, i) => { const o = ordem++; for (const id of idsDoFoco(indice, area, foco)) melhor(id, { nome: foco.nome, nivel: foco.nivel, ordem: o, posicao: i + 1 }) })
  }
  for (const q of indice.questoes) {
    if (mapa.has(q.id)) continue
    const primeiro = q.s.length ? indice.subtemas[q.s[0]] : null
    mapa.set(q.id, { nome: primeiro ?? 'Outros assuntos', nivel: 0, ordem: 100000, posicao: 0 })
  }
  cacheFocos.set(indice, mapa)
  return mapa
}

export function nivelPorQuestao(indice: Indice): Map<string, Nivel> {
  const niveis = new Map<string, Nivel>()
  for (const [id, f] of focoPorQuestao(indice)) if (f.nivel) niveis.set(id, f.nivel)
  return niveis
}

const minusculo = (s: string) => s.toLocaleLowerCase('pt-BR')

/** Questões válidas (sem cópias nem anuladas) de uma área, ou de um assunto dentro dela. */
export function idsDoFoco(indice: Indice, area: AreaIncidencia, foco?: Foco): string[] {
  const tema = indice.temas.findIndex((t) => t.slug === area.slug)
  if (tema < 0) return []
  const exigidos = [area.subtema, foco ? (foco.noAcervo ?? foco.nome) : undefined].filter((s): s is string => !!s).map(minusculo)
  return indice.questoes
    .filter((q) => q.t === tema && !q.dup && q.an !== 1 && exigidos.every((alvo) => q.s.some((s) => minusculo(indice.subtemas[s] ?? '') === alvo)))
    .map((q) => q.id)
}

/** Lugar do tema do acervo no ranking das áreas (1 = a que mais cai), ou null. */
export function posicaoDaArea(slug: string): number | null {
  const i = AREAS.findIndex((a) => a.slug === slug && !a.subtema)
  return i < 0 ? null : i + 1
}

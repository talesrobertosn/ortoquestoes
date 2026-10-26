import type { Indice, ItemIndice } from './tipos'

/**
 * Modalidades de prova (27/10/2026). Cada prova tem o próprio ranking de temas, calculado aqui,
 * no navegador, direto do índice do acervo: quando entram questões novas (uma edição do TEOT, mais
 * uma prova de ingresso da mão), o ranking muda sozinho na próxima publicação do acervo, sem número
 * escrito à mão e sem script para rodar.
 *
 * Regras da contagem (as mesmas em todas as modalidades):
 * - cópias (dup) e anuladas não contam; questão sem assunto classificado fica fora do ranking e é
 *   mostrada à parte, como "sem classificação";
 * - cada questão conta uma vez, pelo assunto principal (o primeiro subtema); os outros assuntos não
 *   multiplicam o total;
 * - ingresso e título nunca se misturam, e TEOT e TARO também não;
 * - no título da mão, as questões são do OrtoQuestões, feitas por engenharia reversa de cada questão
 *   da SBCM e do SIMÃO (uma para cada questão da prova). Elas mostram os assuntos que a prova cobrou,
 *   mas não são as questões oficiais: a página diz isso com todas as letras.
 */
export type IdModalidade = 'teot' | 'taro' | 'mao-ingresso' | 'mao-titulo'

export interface Modalidade {
  id: IdModalidade
  nome: string
  curto: string
  grupo: 'ortopedia' | 'mao'
  descricao: string
  /** de onde vêm as questões contadas, para a nota de metodologia */
  origem: string
  /** área de treino das questões (filtro da sessão) */
  area: 'base' | 'mao'
  entra: (q: ItemIndice, prova: string) => boolean
}

export const PROVAS_TITULO_MAO = ['SBCM', 'SIMÃO'] as const
const ehTitulo = (prova: string) => (PROVAS_TITULO_MAO as readonly string[]).includes(prova)

export const MODALIDADES: Modalidade[] = [
  {
    id: 'teot', nome: 'TEOT', curto: 'TEOT', grupo: 'ortopedia', area: 'base',
    descricao: 'Título de Especialista em Ortopedia e Traumatologia.',
    origem: 'questões das provas do TEOT no acervo',
    entra: (q, prova) => prova === 'TEOT' && q.sim !== 1,
  },
  {
    id: 'taro', nome: 'TARO', curto: 'TARO', grupo: 'ortopedia', area: 'base',
    descricao: 'Avaliação do residente de ortopedia.',
    origem: 'questões das provas do TARO no acervo',
    entra: (q, prova) => prova === 'TARO' && q.sim !== 1,
  },
  {
    id: 'mao-ingresso', nome: 'Ingresso em Cirurgia da Mão', curto: 'Ingresso na Mão', grupo: 'mao', area: 'mao',
    descricao: 'Provas de seleção para a residência e os programas de Cirurgia da Mão.',
    origem: 'questões oficiais das provas de seleção em Cirurgia da Mão no acervo (USP, ENARE, UFG, PUC-SP, INTO e outras)',
    entra: (q, prova) => q.ar === 'mao' && q.sim !== 1 && !ehTitulo(prova),
  },
  {
    id: 'mao-titulo', nome: 'Título de Cirurgia da Mão: SBCM e SIMÃO', curto: 'Título da Mão', grupo: 'mao', area: 'mao',
    descricao: 'Exame de título da SBCM e o SIMÃO, o simulado do exame.',
    origem: 'OrtoQuestões Simulados feitos por engenharia reversa da SBCM e do SIMÃO: uma questão nossa para cada questão da prova, no mesmo assunto. Não são as questões oficiais',
    entra: (q, prova) => q.ar === 'mao' && ehTitulo(prova),
  },
]
export const modalidadePorId = (id: string | null | undefined) => MODALIDADES.find((m) => m.id === id)

/**
 * Grandes áreas da Cirurgia da Mão, a partir dos assuntos que o acervo já usa (nenhuma questão muda de
 * classificação). Assunto de outro tema (cotovelo, pediatria, trauma) vai para "Ortopedia geral".
 */
export const GRANDES_AREAS_MAO: Array<{ slug: string; nome: string; assuntos: string[] }> = [
  { slug: 'mao-fraturas', nome: 'Fraturas e lesões do punho e da mão', assuntos: ['Fratura do rádio distal', 'Fraturas do escafoide e do carpo', 'Fraturas dos metacarpos e falanges', 'Instabilidade do carpo', 'Fibrocartilagem triangular e punho ulnar', 'Lesões ligamentares dos dedos', 'Doença de Kienböck', 'Artrose do punho e artroscopia'] },
  { slug: 'mao-tendoes', nome: 'Tendões', assuntos: ['Lesões dos tendões flexores', 'Lesões dos tendões extensores', 'Deformidades dos dedos', 'Tenossinovite de De Quervain', 'Dedo em gatilho e outras tenossinovites', 'Transferências tendinosas e paralisias'] },
  { slug: 'mao-nervos', nome: 'Nervos e plexo braquial', assuntos: ['Síndrome do túnel do carpo', 'Neuropatia ulnar e outras compressões', 'Lesões de nervos periféricos', 'Plexo braquial e paralisia obstétrica', 'Síndrome da dor complexa regional'] },
  { slug: 'mao-microcirurgia', nome: 'Microcirurgia, retalhos e reimplantes', assuntos: ['Microcirurgia e retalhos livres', 'Retalhos e cobertura cutânea', 'Amputações e reimplantes'] },
  { slug: 'mao-plastica', nome: 'Cirurgia plástica, pele e queimaduras', assuntos: ['Cirurgia plástica geral', 'Cicatrização e enxertos de pele', 'Queimaduras'] },
  { slug: 'mao-congenitas', nome: 'Congênitas', assuntos: ['Sindactilia e polidactilia', 'Deficiências longitudinais e mão torta', 'Outras malformações congênitas'] },
  { slug: 'mao-degenerativas', nome: 'Degenerativas, inflamatórias e Dupuytren', assuntos: ['Doença de Dupuytren', 'Mão reumatoide', 'Rizartrose e artrose da mão'] },
  { slug: 'mao-infeccoes-tumores', nome: 'Infecções e tumores', assuntos: ['Infecções da mão', 'Tumores da mão', 'Cistos sinoviais e gangliões'] },
  { slug: 'mao-anatomia', nome: 'Anatomia, exame, imagem e anestesia', assuntos: ['Anatomia da mão e punho', 'Biomecânica da mão', 'Exame físico da mão e punho', 'Imagem da mão e punho', 'Anestesia em cirurgia da mão', 'Outros temas da mão'] },
]
const AREA_DO_ASSUNTO_MAO = new Map(GRANDES_AREAS_MAO.flatMap((g) => g.assuntos.map((a) => [a, g.nome] as const)))
export const ORTOPEDIA_GERAL = 'Ortopedia geral'
/** Identificador de cada grande área da mão (cor no cronograma e no calendário). */
export const slugDaAreaMao = (nome: string) => GRANDES_AREAS_MAO.find((g) => g.nome === nome)?.slug ?? 'mao-geral'

export type Nivel = 1 | 2 | 3 | 4
export interface TemaRanking {
  /** o assunto (subtema do acervo) */
  nome: string
  /** grande área do assunto */
  area: string
  /** questões que contam (assunto principal) */
  n: number
  /** fatia nas questões elegíveis, em % */
  pct: number
  /** média da fatia por edição (cada edição pesa igual, a prova maior não domina), em % */
  pctEdicao: number
  /** em quantas edições o assunto apareceu, de quantas */
  presenca: number
  edicoes: number
  nivel: Nivel
  tendencia: 'alta' | 'baixa' | null
  ids: string[]
}
export interface Edicao { prova: string; ano: number | null; n: number }
export interface Ranking {
  modalidade: Modalidade
  /** questões elegíveis com assunto (a base dos percentuais) */
  amostra: number
  semClassificacao: number
  anuladas: number
  edicoes: Edicao[]
  fontes: string[]
  anos: number[]
  areas: Array<{ nome: string; n: number; pct: number }>
  temas: TemaRanking[]
}

const chaveEdicao = (prova: string, ano: number | null) => `${prova}|${ano ?? ''}`
const umaCasa = (x: number) => Math.round(x * 10) / 10

/** As questões de uma modalidade que entram na contagem (com o filtro de fonte, se houver). */
export function questoesDaModalidade(indice: Indice, m: Modalidade, fonte?: string | null): ItemIndice[] {
  return indice.questoes.filter((q) => {
    if (q.p === null || q.dup || q.an === 1) return false
    const prova = indice.provas[q.p] ?? ''
    return m.entra(q, prova) && (!fonte || prova === fonte)
  })
}

/** Grande área de um assunto: na mão, pela tabela acima; nas outras provas, pelo tema do acervo. */
export function areaDoAssunto(indice: Indice, q: ItemIndice, assunto: string, m: Modalidade): string {
  if (m.grupo === 'mao') {
    const t = indice.temas[q.t]?.slug
    return t === 'mao' ? (AREA_DO_ASSUNTO_MAO.get(assunto) ?? 'Anatomia, exame, imagem e anestesia') : ORTOPEDIA_GERAL
  }
  return indice.temas[q.t]?.nome ?? 'Outros'
}

/**
 * O ranking de uma modalidade. Sem cache próprio: quem chama memoriza por índice e modalidade.
 * Tendência só com pelo menos três anos e cinco questões do assunto: compara a fatia nas duas edições
 * mais recentes com a das anteriores e só marca diferenças de 3 pontos ou mais.
 */
export function rankingModalidade(indice: Indice, m: Modalidade, fonte?: string | null): Ranking {
  const todas = indice.questoes.filter((q) => {
    if (q.p === null || q.dup) return false
    const prova = indice.provas[q.p] ?? ''
    return m.entra(q, prova) && (!fonte || prova === fonte)
  })
  const anuladas = todas.filter((q) => q.an === 1).length
  const validas = todas.filter((q) => q.an !== 1)
  const comAssunto = validas.filter((q) => q.s.length > 0)
  const porEdicao = new Map<string, Edicao>()
  for (const q of comAssunto) {
    const prova = indice.provas[q.p!]
    const k = chaveEdicao(prova, q.a)
    const e = porEdicao.get(k) ?? { prova, ano: q.a, n: 0 }
    e.n++
    porEdicao.set(k, e)
  }
  const edicoes = [...porEdicao.values()].sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0) || a.prova.localeCompare(b.prova))
  const anos = [...new Set(edicoes.map((e) => e.ano).filter((a): a is number => a !== null))].sort((a, b) => a - b)
  const recentes = new Set(anos.slice(-2))

  interface Acumulado { nome: string; area: string; ids: string[]; porEdicao: Map<string, number>; recente: number; antigo: number }
  const temas = new Map<string, Acumulado>()
  const areas = new Map<string, number>()
  let nRecente = 0, nAntigo = 0
  for (const q of comAssunto) {
    const nome = indice.subtemas[q.s[0]]
    const area = areaDoAssunto(indice, q, nome, m)
    const t: Acumulado = temas.get(nome) ?? { nome, area, ids: [], porEdicao: new Map(), recente: 0, antigo: 0 }
    t.ids.push(q.id)
    const k = chaveEdicao(indice.provas[q.p!], q.a)
    t.porEdicao.set(k, (t.porEdicao.get(k) ?? 0) + 1)
    if (q.a !== null && recentes.has(q.a)) { t.recente++; nRecente++ } else { t.antigo++; nAntigo++ }
    temas.set(nome, t)
    areas.set(area, (areas.get(area) ?? 0) + 1)
  }
  const amostra = comAssunto.length
  const lista = [...temas.values()].map((t) => {
    const fatias = edicoes.map((e) => (t.porEdicao.get(chaveEdicao(e.prova, e.ano)) ?? 0) / e.n)
    const pctEdicao = edicoes.length ? (100 * fatias.reduce((s, x) => s + x, 0)) / edicoes.length : 0
    let tendencia: TemaRanking['tendencia'] = null
    if (anos.length >= 3 && t.ids.length >= 5 && nRecente && nAntigo) {
      const delta = 100 * (t.recente / nRecente - t.antigo / nAntigo)
      if (delta >= 3) tendencia = 'alta'
      else if (delta <= -3) tendencia = 'baixa'
    }
    return { nome: t.nome, area: t.area, n: t.ids.length, pct: umaCasa((100 * t.ids.length) / Math.max(1, amostra)), pctEdicao: umaCasa(pctEdicao), presenca: t.porEdicao.size, edicoes: edicoes.length, nivel: 1 as Nivel, tendencia, ids: t.ids }
  })
  // Ordem: fatia média por edição (o que a prova costuma cobrar), depois o total; "Outros..." no fim.
  lista.sort((a, b) => Number(a.nome.startsWith('Outr')) - Number(b.nome.startsWith('Outr')) || b.pctEdicao - a.pctEdicao || b.n - a.n || a.nome.localeCompare(b.nome))
  const reais = lista.filter((t) => !t.nome.startsWith('Outr'))
  reais.forEach((t, i) => { t.nivel = (4 - Math.min(3, Math.floor((i * 4) / Math.max(1, reais.length)))) as Nivel })
  return {
    modalidade: m, amostra, semClassificacao: validas.length - amostra, anuladas, edicoes,
    fontes: [...new Set(edicoes.map((e) => e.prova))].sort((a, b) => a.localeCompare(b)),
    anos,
    areas: [...areas.entries()].map(([nome, n]) => ({ nome, n, pct: umaCasa((100 * n) / Math.max(1, amostra)) })).sort((a, b) => b.n - a.n),
    temas: lista,
  }
}

export interface RegistroMin { c: boolean | null }
export interface Desempenho { feitas: number; validas: number; certas: number; acerto: number | null }
export function desempenhoEm(ids: string[], respondidas: Record<string, RegistroMin | undefined>): Desempenho {
  let feitas = 0, validas = 0, certas = 0
  for (const id of ids) {
    const r = respondidas[id]
    if (!r) continue
    feitas++
    if (r.c === true) { certas++; validas++ } else if (r.c === false) validas++
  }
  return { feitas, validas, certas, acerto: validas >= 3 ? Math.round((100 * certas) / validas) : null }
}

/**
 * Prioridade de estudo de um assunto para a pessoa (determinística e explicável):
 * peso da prova (fatia por edição) × (1 + o quanto ela erra) × (1 + o quanto falta fazer).
 * Quem nunca fez conta como 50% de acerto: o assunto pesa pela prova e pelo que falta.
 */
export function prioridade(t: Pick<TemaRanking, 'pctEdicao' | 'ids'>, d: Desempenho): number {
  const erro = d.acerto === null ? 0.5 : 1 - d.acerto / 100
  const falta = 1 - Math.min(1, d.feitas / Math.max(1, t.ids.length))
  return t.pctEdicao * (1 + erro) * (1 + falta)
}

import type { Indice } from './tipos'
import { diaCivil, chaveCivil, inicioDoDia } from '../util/dia'
import { entraNoPlano, incluiSimulados, indiceDoPlano, type PlanoSalvo, type RegistroMinimo } from './planoEstudo'
import type { IndiceBibliotecaLeve, ResumoCapituloLeve } from '../biblioteca/tipos'

/**
 * O roteiro do dia no cronograma (10/11/2026): as peças que não mexem na conta do plano.
 * - resumosDoDia: os resumos da Biblioteca mais próximos das questões do dia, pelos dados;
 * - errosDoCronograma: as questões erradas nos dias anteriores do plano que ainda não foram acertadas.
 * Tudo puro e testado em fixtures/testar_cronograma_roteiro.mjs.
 */

// ─── Resumos do dia ──────────────────────────────────────────────────────────

export interface ResumoDoDia {
  resumo: ResumoCapituloLeve
  /** Questões do dia que o resumo cita no texto (prova real ou OrtoQuestões Simulados). */
  questoes: number
  /** Assuntos do dia que o resumo ensina (subtemas em comum), dos mais presentes para os menos. */
  assuntos: string[]
  /** Proximidade: 3 por questão citada, 1 por questão do dia de um subtema que ele ensina. */
  pontos: number
}

/** Quantos resumos o dia recomenda (pedido do Tales: os 3 mais próximos dos temas do dia). */
export const RESUMOS_POR_DIA = 3

/**
 * Os resumos mais próximos das questões de um dia. A ligação sai só dos dados da Biblioteca
 * (public/biblioteca/indice.json, gerado de conteudo/biblioteca/*.md): as questões que cada resumo cita
 * (`questoes` e `treino`) e os subtemas que ele ensina (`subtemas`). Resumo novo aparece sozinho quando
 * entra no índice; tema sem resumo devolve lista vazia e a tela mostra o caminho alternativo.
 */
export function resumosDoDia(biblioteca: IndiceBibliotecaLeve | null | undefined, indice: Indice | null | undefined, ids: Iterable<string>, maximo = RESUMOS_POR_DIA): ResumoDoDia[] {
  if (!biblioteca || !indice) return []
  const doDia = new Set(ids)
  if (!doDia.size) return []
  // Quantas questões do dia tem cada subtema.
  const pesoSubtema = new Map<string, number>()
  for (const q of indice.questoes) {
    if (!doDia.has(q.id)) continue
    for (const s of q.s) { const nome = indice.subtemas[s]; if (nome) pesoSubtema.set(nome, (pesoSubtema.get(nome) ?? 0) + 1) }
  }
  const lista: ResumoDoDia[] = []
  for (const resumo of biblioteca.capitulos) {
    let questoes = 0
    for (const id of resumo.questoes ?? []) if (doDia.has(id)) questoes++
    for (const id of resumo.treino ?? []) if (doDia.has(id)) questoes++
    const assuntos = (resumo.subtemas ?? []).filter((s) => pesoSubtema.has(s)).sort((a, b) => pesoSubtema.get(b)! - pesoSubtema.get(a)!)
    const pontos = questoes * 3 + assuntos.reduce((soma, s) => soma + pesoSubtema.get(s)!, 0)
    if (pontos > 0) lista.push({ resumo, questoes, assuntos, pontos })
  }
  // Empate: o que cita mais questões do dia; depois, o mais curto (cabe antes das questões).
  return lista.sort((a, b) => b.pontos - a.pontos || b.questoes - a.questoes || a.resumo.minutos - b.resumo.minutos || a.resumo.id.localeCompare(b.resumo.id)).slice(0, maximo)
}

// ─── Erros dos dias anteriores do cronograma ─────────────────────────────────

/** Até quantos dias para trás os erros do cronograma ficam na fila da revanche. */
export const JANELA_ERROS_DIAS = 14
/** Tamanho padrão de uma sessão de erros. */
export const TAMANHO_REVANCHE = 20

export interface ErrosDoDia { chave: string; data: Date; /** Erradas na primeira vez naquele dia. */ total: number; /** As que ainda não foram acertadas depois. */ pendentes: string[] }
export interface ErrosCronograma {
  /** Do dia mais recente para o mais antigo; só dias com erro. */
  dias: ErrosDoDia[]
  /** A fila: as pendentes, das mais recentes para as mais antigas. */
  pendentes: string[]
  /** Erradas na janela que a pessoa já refez e acertou. */
  resolvidos: number
  total: number
}

/**
 * As questões do plano que a pessoa errou na primeira vez, nos dias anteriores do cronograma (da criação
 * do plano para cá, até JANELA_ERROS_DIAS dias, sem hoje), separadas por dia. Uma questão sai da fila
 * quando é refeita e acertada. Na sessão de erros as alternativas aparecem em ordem nova
 * (dados/ordemAlternativas.ts, que vale para toda questão já respondida antes).
 */
export function errosDoCronograma(indiceInteiro: Indice, respondidas: Record<string, RegistroMinimo>, plano: PlanoSalvo, agora: Date | number = new Date()): ErrosCronograma {
  const indice = indiceDoPlano(indiceInteiro, plano)
  const simulados = incluiSimulados(plano)
  const inicioHoje = inicioDoDia(agora)
  const hoje = diaCivil(agora)
  const limite = Math.max(Date.parse(plano.criado_em), new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - JANELA_ERROS_DIAS).getTime())
  const porDia = new Map<string, ErrosDoDia & { ordem: Array<{ id: string; em: number }> }>()
  let resolvidos = 0, total = 0
  for (const q of indice.questoes) {
    if (!entraNoPlano(q, simulados)) continue
    const r = respondidas[q.id]
    if (!r) continue
    const primeira = r.historico?.[0]
    const em = primeira?.em ?? r.q
    const errouNaPrimeira = primeira ? primeira.correta === false : r.c === false
    if (em === undefined || !errouNaPrimeira || em < limite || em >= inicioHoje) continue
    total++
    const data = diaCivil(em)
    const chave = chaveCivil(data)
    const dia = porDia.get(chave) ?? { chave, data, total: 0, pendentes: [], ordem: [] }
    dia.total++
    if (r.c === true) resolvidos++
    else dia.ordem.push({ id: q.id, em })
    porDia.set(chave, dia)
  }
  const dias = [...porDia.values()].sort((a, b) => b.chave.localeCompare(a.chave)).map(({ ordem, ...d }) => ({ ...d, pendentes: ordem.sort((a, b) => a.em - b.em || a.id.localeCompare(b.id)).map((x) => x.id) }))
  return { dias, pendentes: dias.flatMap((d) => d.pendentes), resolvidos, total }
}

/** A sessão de erros: as pendentes mais recentes primeiro, até `n`. */
export function idsRevanche(erros: Pick<ErrosCronograma, 'pendentes'>, n = TAMANHO_REVANCHE): string[] {
  return erros.pendentes.slice(0, Math.max(0, n))
}

// ─── Previsão, áreas para melhorar e o histórico dos dias (página de 10/11/2026, 2ª versão) ───

export interface Previsao {
  /** Questões novas por dia de estudo nos últimos 7 dias (sem hoje). Null sem dia de estudo na janela. */
  ritmo: number | null
  /** Quando o conteúdo novo termina nesse ritmo; null sem ritmo ou sem nada por fazer. */
  termina: Date | null
  /** Dias de sobra (positivo) ou de falta (negativo) em relação ao começo da reta final. */
  folga: number | null
  /** O ritmo que fecha o plano no prazo (a meta de um dia normal). */
  precisa: number
}

/**
 * No ritmo real da pessoa, quando o conteúdo novo acaba: as questões novas do plano feitas nos últimos 7 dias,
 * divididas pelos dias de estudo da janela, projetadas sobre o que resta, pulando as folgas.
 */
export function previsaoDeTermino(indiceInteiro: Indice, respondidas: Record<string, RegistroMinimo>, plano: PlanoSalvo, calculo: { restante: number; metaDiaNormal: number; inicioRetaFinal: Date }, agora: Date | number = new Date()): Previsao {
  const indice = indiceDoPlano(indiceInteiro, plano)
  const simulados = incluiSimulados(plano)
  const hoje = diaCivil(agora)
  const fim = inicioDoDia(agora)
  const criado = diaCivil(Date.parse(plano.criado_em))
  let diasEstudo = 0
  let inicio = fim
  for (let k = 1; k <= 7; k++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - k)
    if (d < criado) break
    inicio = Math.min(inicio, d.getTime())
    if (!plano.folgas.includes(d.getDay())) diasEstudo++
  }
  let feitas = 0
  if (diasEstudo) for (const q of indice.questoes) {
    if (!entraNoPlano(q, simulados)) continue
    const r = respondidas[q.id]
    const primeira = r?.historico?.[0]?.em ?? r?.q
    if (primeira !== undefined && primeira >= inicio && primeira < fim) feitas++
  }
  const ritmo = diasEstudo ? Math.round((feitas / diasEstudo) * 10) / 10 : null
  const precisa = calculo.metaDiaNormal
  if (!ritmo || calculo.restante <= 0) return { ritmo, termina: null, folga: null, precisa }
  let faltam = Math.ceil(calculo.restante / ritmo)
  let d = hoje
  for (let guarda = 0; faltam > 0 && guarda < 1500; guarda++) {
    if (!plano.folgas.includes(d.getDay())) faltam--
    if (faltam > 0) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  }
  const folga = Math.round((calculo.inicioRetaFinal.getTime() - d.getTime()) / 86_400_000) - 1
  return { ritmo, termina: d, folga, precisa }
}

export interface AreaDesempenho {
  slug: string; nome: string
  /** Acerto real (10+ respostas) ou estimado (3+); null sem dados. */
  acerto: number | null
  respondidas: number
  faltam: number
  /** % das questões da área já vistas. */
  cobertura: number
  /** Diferença para a média da pessoa, em pontos. */
  diferenca: number | null
  situacao: 'melhorar' | 'na-media' | 'forte' | 'sem-dados'
  /** Quanto vale melhorar aqui: a distância da média vezes o quanto a área cai. */
  impacto: number
}

/**
 * O desempenho por área, na ordem de onde vale mais a pena melhorar: abaixo da média e que cai muito vem primeiro.
 * Usa os temas que o motor já calcula (acerto com chute valendo meio), sem conta nova sobre o histórico.
 */
export function areasParaMelhorar(temas: Array<{ slug: string; nome: string; faltam: number; acerto: number | null; acertoEstimado: number | null; respondidas: number; incidencia: number }>): { areas: AreaDesempenho[]; media: number | null } {
  const comDados = temas.filter((t) => (t.acerto ?? t.acertoEstimado) !== null && t.respondidas > 0)
  const peso = comDados.reduce((s, t) => s + t.respondidas, 0)
  const media = peso ? Math.round(comDados.reduce((s, t) => s + (t.acerto ?? t.acertoEstimado!) * t.respondidas, 0) / peso) : null
  const areas = temas.filter((t) => t.respondidas + t.faltam > 0).map((t): AreaDesempenho => {
    const acerto = t.acerto ?? t.acertoEstimado
    const diferenca = acerto !== null && media !== null ? acerto - media : null
    const situacao = diferenca === null ? 'sem-dados' : diferenca <= -5 ? 'melhorar' : diferenca >= 5 ? 'forte' : 'na-media'
    return { slug: t.slug, nome: t.nome, acerto, respondidas: t.respondidas, faltam: t.faltam, cobertura: Math.round((100 * t.respondidas) / (t.respondidas + t.faltam)), diferenca, situacao, impacto: diferenca === null ? -1 : Math.max(0, -diferenca) * t.incidencia }
  })
  areas.sort((a, b) => b.impacto - a.impacto || (a.acerto ?? 101) - (b.acerto ?? 101) || a.nome.localeCompare(b.nome))
  return { areas, media }
}

export interface DiaFeito { n: number; certas: number; validas: number; areas: Array<{ slug: string; n: number }> }

/** O que foi feito em cada dia desde a criação do plano (primeiras respostas das questões do plano), para o calendário. */
export function historicoDosDias(indiceInteiro: Indice, respondidas: Record<string, RegistroMinimo>, plano: PlanoSalvo): Map<string, DiaFeito> {
  const indice = indiceDoPlano(indiceInteiro, plano)
  const simulados = incluiSimulados(plano)
  const desde = diaCivil(Date.parse(plano.criado_em)).getTime()
  const mapa = new Map<string, DiaFeito>()
  for (const q of indice.questoes) {
    if (!entraNoPlano(q, simulados)) continue
    const r = respondidas[q.id]
    if (!r) continue
    const primeira = r.historico?.[0]
    const em = primeira?.em ?? r.q
    if (em === undefined || em < desde) continue
    const chave = chaveCivil(diaCivil(em))
    const dia = mapa.get(chave) ?? { n: 0, certas: 0, validas: 0, areas: [] }
    dia.n++
    const certa = primeira ? primeira.correta : r.c
    if (certa !== null) { dia.validas++; if (certa) dia.certas++ }
    const slug = indice.temas[q.t]?.slug ?? String(q.t)
    const area = dia.areas.find((a) => a.slug === slug)
    if (area) area.n++; else dia.areas.push({ slug, n: 1 })
    mapa.set(chave, dia)
  }
  for (const d of mapa.values()) d.areas.sort((a, b) => b.n - a.n)
  return mapa
}

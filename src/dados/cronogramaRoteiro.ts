import type { Indice } from './tipos'
import { diaCivil, chaveCivil, inicioDoDia } from '../util/dia'
import { entraNoPlano, incluiSimulados, indiceDoPlano, type PlanoSalvo, type RegistroMinimo } from './planoEstudo'
import type { IndiceBiblioteca, ResumoCapitulo } from '../biblioteca/tipos'

/**
 * O roteiro do dia no cronograma (10/11/2026): as peças que não mexem na conta do plano.
 * - resumosDoDia: os resumos da Biblioteca mais próximos das questões do dia, pelos dados;
 * - errosDoCronograma: as questões erradas nos dias anteriores do plano que ainda não foram acertadas.
 * Tudo puro e testado em fixtures/testar_cronograma_roteiro.mjs.
 */

// ─── Resumos do dia ──────────────────────────────────────────────────────────

export interface ResumoDoDia {
  resumo: ResumoCapitulo
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
export function resumosDoDia(biblioteca: IndiceBiblioteca | null | undefined, indice: Indice | null | undefined, ids: Iterable<string>, maximo = RESUMOS_POR_DIA): ResumoDoDia[] {
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

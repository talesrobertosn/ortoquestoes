import type { Indice } from './tipos'
import { desempenhoEm, modalidadePorId, prioridade, rankingModalidade, type Ranking, type TemaRanking } from './modalidades'
import { diaDaSemana, diasEntre, hojeBR, somarDias } from '../util/dia'

/**
 * Cronograma de Cirurgia da Mão (27/10/2026): dois planos independentes, ingresso (provas de seleção
 * da residência) e título (SBCM e SIMÃO). O plano não é guardado pronto: a cada abertura ele é
 * recalculado a partir da configuração da pessoa, das respostas dela e do dia de hoje. Por isso ele
 * se adapta sozinho a atraso, erros, mudança de data ou de tempo, sem apagar nada do que foi feito.
 *
 * Decisões (determinísticas e explicáveis):
 * - meta do dia = o que falta do plano dividido pelos dias de estudo até a reta final, limitada ao
 *   tempo que a pessoa tem (atrasou: a meta sobe no máximo 25% acima do tempo dela; o resto aparece
 *   na projeção de cobertura, sem empurrar tudo para amanhã);
 * - o dia começa pelo assunto de maior prioridade: o quanto cai na prova × o quanto a pessoa erra ×
 *   o quanto falta fazer (src/dados/modalidades.ts, prioridade);
 * - até um quarto do dia é revisão dos erros com pelo menos 3 dias (espaçamento);
 * - a cada 14 dias de plano, num dia de estudo, um simulado; as duas últimas semanas são reta final
 *   (erros, assuntos de prioridade máxima e um simulado);
 * - os dois planos usam todas as questões da mão (provas de ingresso e padrão SBCM e SIMÃO): no fim, as
 *   provas cobram coisas parecidas (Tales, 26/10/2026). O que muda é a prioridade, que segue o ranking da
 *   prova escolhida; dentro de cada assunto, as questões da própria prova vêm primeiro. Assunto que só
 *   aparece na outra prova entra com metade do peso e prioridade baixa.
 */
export type ProvaMao = 'ingresso' | 'titulo'
export interface ConfigMao {
  tipo: 'pref'
  prova: ProvaMao
  /** "AAAA-MM-DD"; estimada se ainda não há edital */
  dataProva: string
  /** dias da semana de estudo (0 = domingo) */
  dias: number[]
  minutosDia: number
  /** essencial: só prioridade máxima e alta; completa: todos os assuntos */
  cobertura: 'essencial' | 'completa'
  criadoEm: string
  /** última alteração (para a sincronização escolher a mais recente) */
  em: number
}

export const MINUTOS_POR_QUESTAO_MAO = 2.5
export const INTERVALO_SIMULADO = 14
export const TAMANHO_SIMULADO = 40
export const DIAS_RETA_FINAL = 14
const ESPACO_REVISAO_MS = 3 * 86400000

type Respondidas = Record<string, { c: boolean | null; q?: number } | undefined>
export interface TemaDoPlano extends TemaRanking { pendentes: string[]; feitas: number; certas: number; validas: number; acerto: number | null; dominio: number; prioridade: number }
export interface DiaMao { data: string; tipo: 'estudo' | 'simulado' | 'reta-final' | 'folga'; n: number; temas: string[] }
export interface PlanoMao {
  config: ConfigMao
  ranking: Ranking
  temas: TemaDoPlano[]
  /** questões que o plano quer ver (no escopo da cobertura) e quantas já foram feitas */
  total: number
  feitas: number
  diasRestantes: number
  diasDeEstudo: number
  capacidadeDia: number
  metaHoje: number
  hoje: DiaMao
  /** ids da sessão de hoje: revisão de erros espalhada entre as novas, na ordem de prioridade */
  idsHoje: string[]
  revisaoHoje: number
  proximos: DiaMao[]
  /** % do plano que dá para cumprir até a prova, no ritmo dos últimos 14 dias */
  projecao: number
  ritmo: number
  cobertura: number
  acerto: number | null
  /** estimativa pedagógica (não é chance de aprovação): domínio médio ponderado pelo quanto cada assunto cai */
  prontidao: number
  encerrado: boolean
}

/**
 * Assuntos do plano: o ranking da prova escolhida dá a prioridade; as questões vêm das duas provas da mão,
 * as da própria prova primeiro. Assunto que só a outra prova cobra entra com metade do peso, como prioridade baixa.
 */
function rankingDoPlano(indice: Indice, prova: ProvaMao): { ranking: Ranking; temas: TemaRanking[] } {
  const ranking = rankingModalidade(indice, modalidadePorId(prova === 'titulo' ? 'mao-titulo' : 'mao-ingresso')!)
  const outra = rankingModalidade(indice, modalidadePorId(prova === 'titulo' ? 'mao-ingresso' : 'mao-titulo')!)
  const daOutra = new Map(outra.temas.map((t) => [t.nome, t]))
  const temas: TemaRanking[] = ranking.temas.map((t) => ({ ...t, ids: [...t.ids, ...(daOutra.get(t.nome)?.ids ?? [])] }))
  const proprios = new Set(ranking.temas.map((t) => t.nome))
  for (const t of outra.temas) if (!proprios.has(t.nome)) temas.push({ ...t, pctEdicao: Math.round(t.pctEdicao * 5) / 10, nivel: 1, tendencia: null })
  return { ranking, temas }
}

/** Domínio do assunto (0 a 1): acerto suavizado (Laplace), para três acertos em três não virarem 100%. */
const dominioDe = (certas: number, validas: number) => (certas + 1) / (validas + 2)

export function calcularPlanoMao(indice: Indice, respondidas: Respondidas, config: ConfigMao, agora = Date.now()): PlanoMao {
  const hoje = hojeBR(agora)
  const { ranking, temas: doPlano } = rankingDoPlano(indice, config.prova)
  const dias = config.dias.length ? config.dias : [1, 2, 3, 4, 5]
  const diasRestantes = Math.max(0, diasEntre(hoje, config.dataProva))
  const encerrado = diasRestantes <= 0
  const capacidadeDia = Math.max(5, Math.min(120, Math.round(config.minutosDia / MINUTOS_POR_QUESTAO_MAO)))

  const noEscopo = (t: TemaRanking) => !t.nome.startsWith('Outr') ? (config.cobertura === 'completa' || t.nivel >= 3) : config.cobertura === 'completa'
  const temas: TemaDoPlano[] = doPlano.filter(noEscopo).map((t) => {
    const ids = t.ids
    const d = desempenhoEm(ids, respondidas)
    return { ...t, ids, pendentes: ids.filter((id) => !respondidas[id]), feitas: d.feitas, certas: d.certas, validas: d.validas, acerto: d.acerto, dominio: dominioDe(d.certas, d.validas), prioridade: prioridade({ pctEdicao: t.pctEdicao, ids }, d) }
  }).sort((a, b) => b.prioridade - a.prioridade || b.pctEdicao - a.pctEdicao)

  const total = temas.reduce((s, t) => s + t.ids.length, 0)
  const feitas = temas.reduce((s, t) => s + t.feitas, 0)
  const pendentes = total - feitas

  // dias de estudo de hoje até a véspera da prova, separando a reta final
  const calendario: Array<{ data: string; estudo: boolean; reta: boolean }> = []
  for (let i = 0; i < Math.min(diasRestantes, 730); i++) {
    const data = somarDias(hoje, i)
    calendario.push({ data, estudo: dias.includes(diaDaSemana(data)), reta: diasRestantes - i <= DIAS_RETA_FINAL })
  }
  const diasDeEstudo = calendario.filter((d) => d.estudo).length
  const antesDaReta = calendario.filter((d) => d.estudo && !d.reta).length
  const metaBase = antesDaReta ? Math.ceil(pendentes / antesDaReta) : pendentes
  const metaNormal = Math.max(Math.min(5, pendentes), Math.min(Math.round(capacidadeDia * 1.25), metaBase || 0))
  const ehSimulado = (data: string, estudo: boolean) => estudo && diasEntre(config.criadoEm, data) > 0 && diasEntre(config.criadoEm, data) % INTERVALO_SIMULADO === 0

  // revisão: erros com pelo menos 3 dias, dos assuntos do plano, os mais importantes primeiro
  const prioridadeDe = new Map(temas.flatMap((t) => t.ids.map((id) => [id, t.prioridade] as const)))
  const erros = [...prioridadeDe.keys()].filter((id) => { const r = respondidas[id]; return r?.c === false && (agora - (r.q ?? 0)) >= ESPACO_REVISAO_MS })
    .sort((a, b) => (prioridadeDe.get(b) ?? 0) - (prioridadeDe.get(a) ?? 0))

  // simula os próximos dias consumindo os assuntos na ordem de prioridade
  const filas = temas.map((t) => ({ nome: t.nome, fila: [...t.pendentes] }))
  const proximos: DiaMao[] = []
  let idsHoje: string[] = [], revisaoHoje = 0, diaHoje: DiaMao | null = null
  for (const c of calendario.slice(0, 15)) {
    let dia: DiaMao
    if (!c.estudo) dia = { data: c.data, tipo: 'folga', n: 0, temas: [] }
    else if (c.reta) dia = { data: c.data, tipo: 'reta-final', n: capacidadeDia, temas: ['Erros e assuntos de prioridade máxima'] }
    else if (ehSimulado(c.data, c.estudo)) dia = { data: c.data, tipo: 'simulado', n: TAMANHO_SIMULADO, temas: [`Simulado de ${TAMANHO_SIMULADO} questões`] }
    else {
      const revisao = c.data === hoje ? Math.min(erros.length, Math.floor(metaNormal / 4)) : 0
      let falta = metaNormal - revisao
      const doDia: string[] = [], nomes: string[] = []
      for (const f of filas) {
        if (falta <= 0) break
        if (!f.fila.length) continue
        const pega = f.fila.splice(0, falta)
        doDia.push(...pega); nomes.push(f.nome); falta -= pega.length
      }
      dia = { data: c.data, tipo: 'estudo', n: doDia.length + revisao, temas: nomes }
      if (c.data === hoje) { idsHoje = intercalar(doDia, erros.slice(0, revisao)); revisaoHoje = revisao }
    }
    if (c.data === hoje) diaHoje = dia
    else proximos.push(dia)
  }
  if (diaHoje?.tipo === 'simulado') { idsHoje = sortearSimulado(temas, respondidas, agora); revisaoHoje = 0 }
  if (diaHoje?.tipo === 'reta-final') { idsHoje = [...erros.slice(0, Math.ceil(capacidadeDia / 2)), ...temas.filter((t) => t.nivel === 4).flatMap((t) => t.pendentes)].slice(0, capacidadeDia); revisaoHoje = Math.min(erros.length, Math.ceil(capacidadeDia / 2)) }

  // ritmo: questões do plano feitas nos últimos 14 dias
  const desde = agora - 14 * 86400000
  const recentes = [...prioridadeDe.keys()].filter((id) => (respondidas[id]?.q ?? 0) >= desde).length
  const ritmo = Math.round((recentes / 14) * 10) / 10
  const projetadas = Math.min(total, feitas + ritmo * diasRestantes)
  const pesos = temas.reduce((s, t) => s + t.pctEdicao, 0) || 1
  const certasTotais = temas.reduce((s, t) => s + t.certas, 0)
  const validasTotais = temas.reduce((s, t) => s + t.validas, 0)

  return {
    config, ranking, temas, total, feitas, diasRestantes, diasDeEstudo, capacidadeDia,
    metaHoje: diaHoje?.n ?? 0,
    hoje: diaHoje ?? { data: hoje, tipo: 'folga', n: 0, temas: [] },
    idsHoje, revisaoHoje, proximos: proximos.slice(0, 7),
    projecao: total ? Math.round((100 * projetadas) / total) : 0,
    ritmo,
    cobertura: temas.length ? Math.round((100 * temas.filter((t) => t.feitas >= Math.min(3, t.ids.length)).length) / temas.length) : 0,
    acerto: validasTotais >= 5 ? Math.round((100 * certasTotais) / validasTotais) : null,
    prontidao: Math.round((100 * temas.reduce((s, t) => s + t.pctEdicao * (t.feitas ? t.dominio : 0), 0)) / pesos),
    encerrado,
  }
}

/** Revisão espalhada entre as novas (uma a cada quatro), para não virar um bloco de erros no fim. */
function intercalar(novas: string[], revisao: string[]): string[] {
  const r = [...revisao], saida: string[] = []
  novas.forEach((id, i) => { saida.push(id); if ((i + 1) % 3 === 0 && r.length) saida.push(r.shift()!) })
  return [...saida, ...r]
}

/** Simulado: questões de todos os assuntos do plano na proporção do quanto caem; as já feitas também valem. */
function sortearSimulado(temas: TemaDoPlano[], respondidas: Respondidas, semente: number): string[] {
  const soma = temas.reduce((s, t) => s + t.pctEdicao, 0) || 1
  const saida: string[] = []
  let x = semente % 2147483647
  const aleatorio = () => (x = (x * 48271) % 2147483647) / 2147483647
  for (const t of temas) {
    const quantas = Math.max(0, Math.round((TAMANHO_SIMULADO * t.pctEdicao) / soma))
    const opcoes = [...t.pendentes, ...t.ids.filter((id) => respondidas[id])]
    for (let i = 0; i < quantas && opcoes.length; i++) saida.push(opcoes.splice(Math.floor(aleatorio() * opcoes.length), 1)[0])
  }
  return [...new Set(saida)].slice(0, TAMANHO_SIMULADO)
}

/** Configuração nova com valores de partida razoáveis para a rotina de residência. */
export function configInicial(prova: ProvaMao, agora = Date.now()): ConfigMao {
  const hoje = hojeBR(agora)
  return { tipo: 'pref', prova, dataProva: somarDias(hoje, prova === 'titulo' ? 180 : 120), dias: [1, 2, 3, 4, 5, 6], minutosDia: 60, cobertura: 'completa', criadoEm: hoje, em: agora }
}

/** Valida o que veio da conta (outro aparelho, versão antiga): o que não serve vira null. */
export function lerConfig(v: unknown): ConfigMao | null {
  const c = v as Partial<ConfigMao> | null
  if (!c || c.tipo !== 'pref' || (c.prova !== 'ingresso' && c.prova !== 'titulo') || !/^\d{4}-\d{2}-\d{2}$/.test(c.dataProva ?? '') || !Array.isArray(c.dias)) return null
  return {
    tipo: 'pref', prova: c.prova, dataProva: c.dataProva!, dias: c.dias.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    minutosDia: Math.max(15, Math.min(300, Number(c.minutosDia) || 60)), cobertura: c.cobertura === 'essencial' ? 'essencial' : 'completa',
    criadoEm: /^\d{4}-\d{2}-\d{2}$/.test(c.criadoEm ?? '') ? c.criadoEm! : c.dataProva!, em: Number(c.em) || 0,
  }
}

/** Item da conta onde cada plano fica (sincroniza entre aparelhos junto com a Biblioteca). */
export const itemConfigMao = (prova: ProvaMao) => `c.mao-${prova}`

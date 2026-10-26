import type { Indice } from './tipos'
import { desempenhoEm, modalidadePorId, prioridade, rankingModalidade, type Ranking, type TemaRanking } from './modalidades'
import { diaDaSemana, diasEntre, hojeBR, inicioDaChave, somarDias } from '../util/dia'
import { DIA_MINIMO, TAMANHO_MINI } from './planoEstudo'

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
 * - passadas, como no cronograma de ortopedia: 1ª os assuntos de prioridade máxima, 2ª os de prioridade
 *   alta, 3ª o resto (dentro de cada passada, pela prioridade acima);
 * - a cada 14 dias de plano, num dia de estudo, um mini-simulado; as duas últimas semanas são reta final
 *   (revisão forte e, na última semana, modo prova), sem conteúdo novo; plano curto: só a última semana;
 * - ingresso: a pessoa faz de tudo (Tales, 26/10/2026). O plano usa todas as questões da mão, das provas de
 *   ingresso e do padrão SBCM e SIMÃO, misturadas em cada assunto; a ordem dos assuntos segue o ranking do
 *   ingresso, e assunto que só o título cobra entra com metade do peso, como prioridade baixa;
 * - título: o foco é a SBCM e o SIMÃO. O plano segue o ranking do título, e as questões de ingresso entram só
 *   como reforço nos mesmos assuntos (no máximo uma para cada quatro do título, e nenhuma no essencial).
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
  /** Segundas-feiras ("AAAA-MM-DD") das semanas difíceis: só o dia mínimo, como no cronograma de ortopedia. */
  semanasDificeis?: string[]
  /** Questões feitas além da meta em cada dia ("AAAA-MM-DD"): saem do próximo dia de estudo. */
  adiantados?: Record<string, number>
  criadoEm: string
  /** última alteração (para a sincronização escolher a mais recente) */
  em: number
}

export const MINUTOS_POR_QUESTAO_MAO = 2.5
export const INTERVALO_SIMULADO = 14
export const TAMANHO_SIMULADO = TAMANHO_MINI
export const DIAS_RETA_FINAL = 14
export const DIAS_MODO_PROVA = 7
const ESPACO_REVISAO_MS = 3 * 86400000

type Respondidas = Record<string, { c: boolean | null; q?: number } | undefined>
export type PassadaMao = 1 | 2 | 3
export interface TemaDoPlano extends TemaRanking { pendentes: string[]; feitas: number; certas: number; validas: number; acerto: number | null; dominio: number; prioridade: number; passada: PassadaMao }
/** Um assunto dentro de um dia: quantas questões novas dele e de que passada. */
export interface ParteDia { nome: string; area: string; n: number; passada: PassadaMao; ids: string[] }
export interface DiaMao { data: string; tipo: 'estudo' | 'simulado' | 'reta-final' | 'folga'; n: number; temas: string[]; partes: ParteDia[]; /** dia de semana difícil (só o dia mínimo) */ dificil?: boolean; /** questões que a pessoa já fez antes, num dia anterior */ adiantado?: number }
export type FaseMao = 'conteudo' | 'revisao' | 'prova' | 'vespera' | 'passou'
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
  /** todos os dias de hoje até a véspera, com o que o plano põe em cada um */
  agenda: DiaMao[]
  /** meta de um dia de estudo normal e quanto o plano previa até ontem (para o ritmo) */
  metaNormal: number
  esperadoAteHoje: number
  feitasDesdeInicio: number
  feitasHoje: number
  fase: FaseMao
  diasRetaFinal: number
  /** quando começa cada passada (hoje em diante) e em que passada a pessoa está */
  inicioPassada: Partial<Record<PassadaMao, string>>
  passadaAtual: PassadaMao | null
  /** % do plano até a reta final, % da prioridade máxima vista e quando ela termina; questões que não cabem */
  projecaoAlvo: number
  projecaoMaisCai: number
  fimMaisCai: string | null
  cortadas: number
  tetoAtivo: boolean
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

/** Reforço do título: no máximo uma questão de ingresso para cada quatro do padrão SBCM e SIMÃO. */
export const REFORCO_TITULO = 0.25

/** Junta duas listas espalhando a segunda pela primeira, na proporção dos tamanhos. */
function misturar(a: string[], b: string[]): string[] {
  if (!b.length) return a
  if (!a.length) return b
  const saida: string[] = []
  const passo = (a.length + b.length) / b.length
  let j = 0
  for (let i = 0; i < a.length + b.length; i++) {
    if (j < b.length && (i + 1) >= Math.round((j + 1) * passo)) saida.push(b[j++])
    else saida.push(a[i - j] ?? b[j++])
  }
  return saida
}

/** Assuntos e questões do plano, pela regra de cada prova (ver o comentário do topo). */
function rankingDoPlano(indice: Indice, prova: ProvaMao, cobertura: ConfigMao['cobertura']): { ranking: Ranking; temas: TemaRanking[] } {
  const ranking = rankingModalidade(indice, modalidadePorId(prova === 'titulo' ? 'mao-titulo' : 'mao-ingresso')!)
  const outra = rankingModalidade(indice, modalidadePorId(prova === 'titulo' ? 'mao-ingresso' : 'mao-titulo')!)
  const daOutra = new Map(outra.temas.map((t) => [t.nome, t]))
  if (prova === 'titulo') {
    const temas = ranking.temas.map((t) => {
      const reforco = cobertura === 'essencial' ? [] : (daOutra.get(t.nome)?.ids ?? []).slice(0, Math.ceil(t.ids.length * REFORCO_TITULO))
      return { ...t, ids: misturar(t.ids, reforco) }
    })
    return { ranking, temas }
  }
  const temas: TemaRanking[] = ranking.temas.map((t) => ({ ...t, ids: misturar(t.ids, daOutra.get(t.nome)?.ids ?? []) }))
  const proprios = new Set(ranking.temas.map((t) => t.nome))
  for (const t of outra.temas) if (!proprios.has(t.nome)) temas.push({ ...t, pctEdicao: Math.round(t.pctEdicao * 5) / 10, nivel: 1, tendencia: null })
  return { ranking, temas }
}

/** Domínio do assunto (0 a 1): acerto suavizado (Laplace), para três acertos em três não virarem 100%. */
const dominioDe = (certas: number, validas: number) => (certas + 1) / (validas + 2)
const passadaDe = (nivel: number): PassadaMao => (nivel >= 4 ? 1 : nivel === 3 ? 2 : 3)

export function calcularPlanoMao(indice: Indice, respondidas: Respondidas, config: ConfigMao, agora = Date.now()): PlanoMao {
  const hoje = hojeBR(agora)
  const { ranking, temas: doPlano } = rankingDoPlano(indice, config.prova, config.cobertura)
  const dias = config.dias.length ? config.dias : [1, 2, 3, 4, 5]
  const diasRestantes = Math.max(0, diasEntre(hoje, config.dataProva))
  const encerrado = diasRestantes <= 0
  const capacidadeDia = Math.max(5, Math.min(120, Math.round(config.minutosDia / MINUTOS_POR_QUESTAO_MAO)))

  const noEscopo = (t: TemaRanking) => !t.nome.startsWith('Outr') ? (config.cobertura === 'completa' || t.nivel >= 3) : config.cobertura === 'completa'
  const temas: TemaDoPlano[] = doPlano.filter(noEscopo).map((t) => {
    const ids = t.ids
    const d = desempenhoEm(ids, respondidas)
    return { ...t, ids, pendentes: ids.filter((id) => !respondidas[id]), feitas: d.feitas, certas: d.certas, validas: d.validas, acerto: d.acerto, dominio: dominioDe(d.certas, d.validas), prioridade: prioridade({ pctEdicao: t.pctEdicao, ids }, d), passada: passadaDe(t.nivel) }
  }).sort((a, b) => a.passada - b.passada || b.prioridade - a.prioridade || b.pctEdicao - a.pctEdicao)

  const total = temas.reduce((s, t) => s + t.ids.length, 0)
  const feitas = temas.reduce((s, t) => s + t.feitas, 0)
  // o que já foi feito hoje continua contando na meta de hoje: a meta do dia não muda enquanto a pessoa estuda
  const inicioHoje = inicioDaChave(hoje)
  const feitoHoje = (id: string) => (respondidas[id]?.q ?? 0) >= inicioHoje
  const feitasHoje = temas.reduce((s, t) => s + t.ids.filter(feitoHoje).length, 0)
  // o que foi adiantado no último dia de estudo sai do próximo (e volta à conta da meta, para não descontar duas vezes)
  let anterior = somarDias(hoje, -1)
  for (let i = 0; i < 14 && anterior >= config.criadoEm && !(config.dias.length ? config.dias : [1, 2, 3, 4, 5]).includes(diaDaSemana(anterior)); i++) anterior = somarDias(anterior, -1)
  const creditoAnterior = anterior >= config.criadoEm ? Math.max(0, Math.round(config.adiantados?.[anterior] ?? 0)) : 0
  const pendentes = total - feitas + feitasHoje + creditoAnterior

  // dias de hoje até a véspera da prova, separando a reta final (revisão forte e modo prova)
  const diasRetaFinal = diasEntre(config.criadoEm, config.dataProva) >= 6 * 7 ? DIAS_RETA_FINAL : DIAS_MODO_PROVA
  const dificeis = new Set(config.semanasDificeis ?? [])
  const calendario: Array<{ data: string; estudo: boolean; reta: boolean; dificil: boolean }> = []
  for (let i = 0; i < Math.min(diasRestantes, 730); i++) {
    const data = somarDias(hoje, i)
    calendario.push({ data, estudo: dias.includes(diaDaSemana(data)), reta: diasRestantes - i <= diasRetaFinal, dificil: dificeis.has(segundaDaChave(data)) })
  }
  const faltam = diasRestantes
  const fase: FaseMao = encerrado ? 'passou' : faltam <= 1 ? 'vespera' : faltam <= DIAS_MODO_PROVA ? 'prova' : faltam <= diasRetaFinal ? 'revisao' : 'conteudo'
  const diasDeEstudo = calendario.filter((d) => d.estudo).length
  // a semana difícil leva só o dia mínimo; o resto se espalha pelos outros dias
  const antesDaReta = calendario.filter((d) => d.estudo && !d.reta && !d.dificil).length
  const naDificil = calendario.filter((d) => d.estudo && !d.reta && d.dificil).length * DIA_MINIMO
  const metaBase = antesDaReta ? Math.ceil(Math.max(0, pendentes - naDificil) / antesDaReta) : pendentes
  const teto = Math.round(capacidadeDia * 1.25)
  const metaNormal = Math.max(Math.min(5, pendentes), Math.min(teto, metaBase || 0))
  const ehSimulado = (data: string, estudo: boolean) => estudo && diasEntre(config.criadoEm, data) > 0 && diasEntre(config.criadoEm, data) % INTERVALO_SIMULADO === 0

  // revisão: erros com pelo menos 3 dias, dos assuntos do plano, os mais importantes primeiro
  const prioridadeDe = new Map(temas.flatMap((t) => t.ids.map((id) => [id, t.prioridade] as const)))
  const erros = [...prioridadeDe.keys()].filter((id) => { const r = respondidas[id]; return r?.c === false && (agora - (r.q ?? 0)) >= ESPACO_REVISAO_MS })
    .sort((a, b) => (prioridadeDe.get(b) ?? 0) - (prioridadeDe.get(a) ?? 0))

  // o plano inteiro, dia a dia, consumindo os assuntos na ordem das passadas e da prioridade
  const filas = temas.map((t) => ({ nome: t.nome, area: t.area, passada: t.passada, fila: [...t.pendentes] }))
  const agenda: DiaMao[] = []
  const inicioPassada: Partial<Record<PassadaMao, string>> = {}
  let idsHoje: string[] = [], revisaoHoje = 0, fimMaisCai: string | null = null
  let credito = creditoAnterior
  for (const c of calendario) {
    let dia: DiaMao
    if (!c.estudo) dia = { data: c.data, tipo: 'folga', n: 0, temas: [], partes: [] }
    else if (c.reta) dia = { data: c.data, tipo: 'reta-final', n: capacidadeDia, temas: ['Erros e assuntos de prioridade máxima'], partes: [] }
    else if (ehSimulado(c.data, c.estudo)) dia = { data: c.data, tipo: 'simulado', n: TAMANHO_SIMULADO, temas: [`Mini-simulado de ${TAMANHO_SIMULADO} questões`], partes: [] }
    else {
      const metaCheia = c.dificil ? Math.min(DIA_MINIMO, metaNormal) : metaNormal
      const adiantado = Math.min(credito, metaCheia)
      credito -= adiantado
      const metaDia = metaCheia - adiantado
      // hoje: só o que falta da meta (as já feitas hoje saíram da fila)
      const resta = c.data === hoje ? Math.max(0, metaDia - feitasHoje) : metaDia
      const revisao = c.data === hoje ? Math.min(erros.length, Math.floor(metaDia / 4), resta) : 0
      let falta = resta - revisao
      const partes: ParteDia[] = []
      for (const f of filas) {
        if (falta <= 0) break
        if (!f.fila.length) continue
        const pega = f.fila.splice(0, falta)
        partes.push({ nome: f.nome, area: f.area, n: pega.length, passada: f.passada, ids: pega }); falta -= pega.length
        if (!inicioPassada[f.passada]) inicioPassada[f.passada] = c.data
        if (f.passada === 1 && !filas.some((x) => x.passada === 1 && x.fila.length)) fimMaisCai = fimMaisCai ?? c.data
      }
      const novas = partes.flatMap((x) => x.ids)
      dia = { data: c.data, tipo: 'estudo', n: c.data === hoje ? Math.min(metaDia, novas.length + revisao + feitasHoje) : novas.length + revisao, temas: partes.map((x) => x.nome), partes, dificil: c.dificil, adiantado }
      if (c.data === hoje) { idsHoje = intercalar(novas, erros.slice(0, revisao)); revisaoHoje = revisao }
    }
    // o que passar da meta de hoje adianta os próximos dias de estudo
    if (c.data === hoje && dia.tipo !== 'reta-final') credito += Math.max(0, feitasHoje - dia.n)
    agenda.push(dia)
  }
  const diaHoje = agenda[0]?.data === hoje ? agenda[0] : null
  const proximos = agenda.slice(diaHoje ? 1 : 0)
  // o simulado do dia é sorteado uma vez por dia (a semente é o dia) e o que já foi feito hoje sai da lista
  if (diaHoje?.tipo === 'simulado') { idsHoje = sortearSimulado(temas, (id) => !respondidas[id] || feitoHoje(id), inicioHoje).filter((id) => !feitoHoje(id)); revisaoHoje = 0 }
  if (diaHoje?.tipo === 'reta-final') { idsHoje = [...erros.slice(0, Math.ceil(capacidadeDia / 2)), ...temas.filter((t) => t.nivel === 4).flatMap((t) => t.pendentes)].slice(0, Math.max(0, capacidadeDia - feitasHoje)); revisaoHoje = Math.min(erros.length, Math.ceil(capacidadeDia / 2), idsHoje.length) }
  const cortadas = filas.reduce((s2, f) => s2 + f.fila.length, 0)
  const maisCai = temas.filter((t) => t.passada === 1).reduce((s2, t) => s2 + t.ids.length, 0)
  const maisCaiFeitas = temas.filter((t) => t.passada === 1).reduce((s2, t) => s2 + t.feitas, 0)
  const maisCaiCortadas = filas.filter((f) => f.passada === 1).reduce((s2, f) => s2 + f.fila.length, 0)
  const passadaAtual: PassadaMao | null = fase !== 'conteudo' ? null : (diaHoje?.partes[0]?.passada ?? proximos.find((d) => d.partes.length)?.partes[0]?.passada ?? null)

  // o que o plano previa até ontem (dias de estudo desde a criação, fora a reta final) e o que foi feito desde então
  const inicioPlano = inicioDaChave(config.criadoEm)
  let diasPassados = 0
  for (let d = config.criadoEm; d < hoje; d = somarDias(d, 1)) if (dias.includes(diaDaSemana(d))) diasPassados++
  const noPlano = [...prioridadeDe.keys()]
  const feitasDesdeInicio = noPlano.filter((id) => (respondidas[id]?.q ?? 0) >= inicioPlano && (respondidas[id]?.q ?? 0) < inicioHoje).length

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
    hoje: diaHoje ?? { data: hoje, tipo: 'folga', n: 0, temas: [], partes: [] },
    idsHoje, revisaoHoje, proximos: proximos.slice(0, 7), agenda,
    metaNormal, esperadoAteHoje: diasPassados * metaNormal, feitasDesdeInicio, feitasHoje, fase, diasRetaFinal, inicioPassada, passadaAtual,
    projecaoAlvo: total ? Math.round((100 * (total - cortadas)) / total) : 0,
    projecaoMaisCai: maisCai ? Math.round((100 * (maisCai - maisCaiCortadas)) / maisCai) : 0,
    fimMaisCai: maisCaiFeitas >= maisCai ? null : fimMaisCai,
    cortadas, tetoAtivo: metaBase > teto,
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
function sortearSimulado(temas: TemaDoPlano[], novaNoDia: (id: string) => boolean, semente: number): string[] {
  const soma = temas.reduce((s, t) => s + t.pctEdicao, 0) || 1
  const saida: string[] = []
  let x = semente % 2147483647
  const aleatorio = () => (x = (x * 48271) % 2147483647) / 2147483647
  for (const t of temas) {
    const quantas = Math.max(0, Math.round((TAMANHO_SIMULADO * t.pctEdicao) / soma))
    const opcoes = [...t.ids.filter(novaNoDia), ...t.ids.filter((id) => !novaNoDia(id))]
    for (let i = 0; i < quantas && opcoes.length; i++) saida.push(opcoes.splice(Math.floor(aleatorio() * opcoes.length), 1)[0])
  }
  // o arredondamento pode deixar faltando: completa pelos assuntos que mais caem
  const unicas = [...new Set(saida)]
  for (const t of temas) for (const id of t.ids) { if (unicas.length >= TAMANHO_SIMULADO) break; if (!unicas.includes(id)) unicas.push(id) }
  return unicas.slice(0, TAMANHO_SIMULADO)
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
    ...(c.adiantados && typeof c.adiantados === 'object' ? { adiantados: Object.fromEntries(Object.entries(c.adiantados).filter(([d, n]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(n) && n > 0).slice(-14)) } : {}),
    ...(Array.isArray(c.semanasDificeis) ? { semanasDificeis: c.semanasDificeis.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-20) } : {}),
    criadoEm: /^\d{4}-\d{2}-\d{2}$/.test(c.criadoEm ?? '') ? c.criadoEm! : c.dataProva!, em: Number(c.em) || 0,
  }
}

/** Item da conta onde cada plano fica (sincroniza entre aparelhos junto com a Biblioteca). */
/** A segunda-feira ("AAAA-MM-DD") da semana de um dia. */
export const segundaDaChave = (dia: string) => somarDias(dia, -((diaDaSemana(dia) + 6) % 7))

/** Liga ou desliga a semana difícil da semana de hoje. */
export function comSemanaDificil(config: ConfigMao, ativar: boolean, agora = Date.now()): ConfigMao {
  const seg = segundaDaChave(hojeBR(agora))
  const resto = (config.semanasDificeis ?? []).filter((d) => d !== seg && d >= somarDias(seg, -60))
  return { ...config, semanasDificeis: ativar ? [...resto, seg] : resto }
}

/** Guarda o que foi feito além da meta hoje (o próximo dia de estudo fica mais leve, em qualquer aparelho). */
export function comAdiantado(config: ConfigMao, dia: string, n: number): ConfigMao {
  const resto = Object.entries(config.adiantados ?? {}).filter(([d]) => d !== dia && d >= somarDias(dia, -14))
  return { ...config, adiantados: Object.fromEntries(n > 0 ? [...resto, [dia, n]] : resto) }
}

export const itemConfigMao = (prova: ProvaMao) => `c.mao-${prova}`

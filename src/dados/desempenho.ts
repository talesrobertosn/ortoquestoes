/*
 * Cálculos da página de Desempenho (14/11/2026, pedido do Tales: evolução, assuntos, mapa de prioridades, erros e
 * retenção, calendário, confiança, nota estimada, turma e resumos indicados). Sem React, para testar
 * (fixtures/testar_desempenho.mjs). Todas as abas leem daqui, e o Cronograma pode ler as mesmas definições.
 *
 * Definições (as mesmas em toda a página):
 * - Primeira vez: a resposta mais antiga guardada de uma questão, desde que o histórico ainda tenha todas as
 *   tentativas (o aparelho guarda as últimas 8). É o acerto que prevê a prova.
 * - Revisão: qualquer resposta depois da primeira.
 * - Estados de retenção, para cada questão já errada alguma vez:
 *   erro novo (a última resposta é erro e nunca acertou depois de errar), recuperada (acertou depois do erro, há
 *   menos de 7 dias), consolidada (acertou 7 dias ou mais depois do último erro), reincidente (errou de novo depois
 *   de já ter acertado a questão que tinha errado).
 */
import type { Indice } from './tipos'
import { AREAS, focoPorQuestao } from './incidencia'

export type Confianca = 'seguro' | 'duvida' | 'chute'
export interface Tentativa { em: number; correta: boolean | null; confianca?: Confianca }
export interface RegistroDesempenho {
  c: boolean | null
  q: number
  tentativas?: number
  confianca?: Confianca
  historico?: Tentativa[]
}
export type Respondidas = Record<string, RegistroDesempenho>

export interface Evento {
  id: string
  em: number
  correta: boolean | null
  confianca: Confianca
  /** Primeira resposta da questão (só quando o histórico guarda todas as tentativas). */
  primeira: boolean
  tema: string | null
  assunto: string | null
}

export const DIA = 86_400_000
export const DIAS_CONSOLIDAR = 7

/** Tentativas de uma questão, da mais antiga para a mais nova. */
export function tentativasDe(r: RegistroDesempenho): Tentativa[] {
  const h = r.historico?.length ? r.historico : r.q ? [{ em: r.q, correta: r.c, confianca: r.confianca ?? 'seguro' }] : []
  return [...h].sort((a, b) => a.em - b.em)
}

/** O histórico ainda tem a primeira tentativa? (registros antigos não dizem quantas foram: contam como completos) */
const temPrimeira = (r: RegistroDesempenho, n: number) => r.tentativas === undefined || r.tentativas <= n

/** Todas as respostas a partir de `limite`, com tema e assunto. */
export function eventosDe(respondidas: Respondidas, indice: Indice | null, limite = 0): Evento[] {
  const tema = new Map<string, string>()
  const focos = indice ? focoPorQuestao(indice) : null
  if (indice) for (const q of indice.questoes) { const t = indice.temas[q.t]; if (t) tema.set(q.id, t.slug) }
  const lista: Evento[] = []
  for (const [id, r] of Object.entries(respondidas)) {
    const ts = tentativasDe(r)
    const completo = temPrimeira(r, ts.length)
    ts.forEach((t, i) => {
      if (t.em < limite) return
      lista.push({ id, em: t.em, correta: t.correta, confianca: t.confianca ?? 'seguro', primeira: i === 0 && completo,
        tema: tema.get(id) ?? null, assunto: focos?.get(id)?.nome ?? null })
    })
  }
  return lista.sort((a, b) => a.em - b.em)
}

/* ───────────── Margem de uma porcentagem ───────────── */

/** Intervalo de Wilson (95%) de certas em n, em 0–1. Com poucas respostas, a faixa é larga. */
export function intervalo(certas: number, n: number, z = 1.96): [number, number] {
  if (!n) return [0, 1]
  const p = certas / n
  const z2 = z * z
  const centro = (p + z2 / (2 * n)) / (1 + z2 / n)
  const meia = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n)
  return [Math.max(0, centro - meia), Math.min(1, centro + meia)]
}
/** Abaixo disso, a porcentagem aparece como "poucos dados". */
export const MINIMO_LEITURA = 10

/* ───────────── Evolução ───────────── */

export type Escala = 'dia' | 'semana' | 'mes'
export interface Balde {
  inicio: number
  fim: number
  novas: { n: number; certas: number }
  revisoes: { n: number; certas: number }
}

/** Início do dia, da semana (segunda) ou do mês, no horário local. */
export function inicioDe(em: number, escala: Escala): number {
  const d = new Date(em)
  if (escala === 'mes') return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
  const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (escala === 'semana') dia.setDate(dia.getDate() - ((dia.getDay() + 6) % 7))
  return dia.getTime()
}
function proximo(inicio: number, escala: Escala, passos = 1): number {
  const d = new Date(inicio)
  if (escala === 'mes') return new Date(d.getFullYear(), d.getMonth() + passos, 1).getTime()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (escala === 'semana' ? 7 : 1) * passos).getTime()
}

/** Os últimos `quantos` períodos (o atual incluído), com novas e revisões separadas. */
export function serieEvolucao(eventos: Evento[], escala: Escala, quantos: number, agora = Date.now()): Balde[] {
  const atual = inicioDe(agora, escala)
  const baldes: Balde[] = []
  for (let i = quantos - 1; i >= 0; i--) {
    const inicio = proximo(atual, escala, -i)
    baldes.push({ inicio, fim: proximo(inicio, escala), novas: { n: 0, certas: 0 }, revisoes: { n: 0, certas: 0 } })
  }
  const primeiro = baldes[0]?.inicio ?? 0
  for (const e of eventos) {
    if (e.correta === null || e.em < primeiro) continue
    const b = baldes.find((x) => e.em >= x.inicio && e.em < x.fim)
    if (!b) continue
    const alvo = e.primeira ? b.novas : b.revisoes
    alvo.n++; if (e.correta) alvo.certas++
  }
  return baldes
}

/** Acerto de primeira e quantidade num intervalo de tempo. */
export function resumoJanela(eventos: Evento[], de: number, ate: number) {
  let n = 0, certas = 0, novas = 0, revisoes = 0
  for (const e of eventos) {
    if (e.em < de || e.em >= ate || e.correta === null) continue
    if (e.primeira) { novas++; n++; if (e.correta) certas++ } else revisoes++
  }
  return { n, certas, acerto: n ? certas / n : null, novas, revisoes }
}

/** Este período contra o anterior, de mesmo tamanho (7, 30 ou 90 dias). */
export function compararPeriodos(eventos: Evento[], dias: number, agora = Date.now()) {
  const fim = agora, meio = agora - dias * DIA, inicio = agora - 2 * dias * DIA
  const atual = resumoJanela(eventos, meio, fim)
  const anterior = resumoJanela(eventos, inicio, meio)
  const diferenca = atual.acerto !== null && anterior.acerto !== null && atual.n >= MINIMO_LEITURA && anterior.n >= MINIMO_LEITURA
    ? Math.round((atual.acerto - anterior.acerto) * 100) : null
  return { atual, anterior, diferenca }
}

/* ───────────── Retenção ───────────── */

export type EstadoRetencao = 'nunca_errou' | 'erro_novo' | 'recuperada' | 'consolidada' | 'reincidente'

export function estadoRetencao(r: RegistroDesempenho): EstadoRetencao {
  const ts = tentativasDe(r).filter((t) => t.correta !== null)
  const primeiroErro = ts.findIndex((t) => t.correta === false)
  if (primeiroErro < 0) return 'nunca_errou'
  const depois = ts.slice(primeiroErro)
  const ultima = depois[depois.length - 1]
  const recuperouAntes = depois.some((t, i) => t.correta && depois.slice(0, i).some((x) => x.correta === false))
  if (ultima.correta === false) return recuperouAntes ? 'reincidente' : 'erro_novo'
  // A última é acerto: conta o tempo desde o último erro.
  const ultimoErro = [...depois].reverse().find((t) => t.correta === false)!
  const acertoTardio = depois.some((t) => t.correta && t.em - ultimoErro.em >= DIAS_CONSOLIDAR * DIA)
  return acertoTardio ? 'consolidada' : 'recuperada'
}

export function contarRetencao(respondidas: Respondidas, filtro?: (id: string) => boolean) {
  const conta: Record<EstadoRetencao, number> = { nunca_errou: 0, erro_novo: 0, recuperada: 0, consolidada: 0, reincidente: 0 }
  const ids: Record<EstadoRetencao, string[]> = { nunca_errou: [], erro_novo: [], recuperada: [], consolidada: [], reincidente: [] }
  for (const [id, r] of Object.entries(respondidas)) {
    if (filtro && !filtro(id)) continue
    const e = estadoRetencao(r)
    conta[e]++; ids[e].push(id)
  }
  const erradas = conta.erro_novo + conta.recuperada + conta.consolidada + conta.reincidente
  return { conta, ids, erradas }
}

/** Questões cuja última resposta foi erro marcado com certeza: o erro que a pessoa não sabe que tem. */
export function errosComCerteza(respondidas: Respondidas): string[] {
  const lista: Array<[string, number]> = []
  for (const [id, r] of Object.entries(respondidas)) {
    const ts = tentativasDe(r)
    const u = ts[ts.length - 1]
    if (u && u.correta === false && (u.confianca ?? 'seguro') === 'seguro') lista.push([id, u.em])
  }
  return lista.sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

/** Questões com erro pendente (a última resposta é erro). */
export function errosPendentes(respondidas: Respondidas): string[] {
  return Object.entries(respondidas).filter(([, r]) => { const ts = tentativasDe(r); return ts[ts.length - 1]?.correta === false }).map(([id]) => id)
}

/* ───────────── Nota estimada ───────────── */

export interface AreaNota { slug: string; nome: string; peso: number; n: number; certas: number; p: number; ganho: number }
export interface NotaEstimada {
  nota: number
  baixa: number
  alta: number
  /** Respostas de primeira vez usadas. */
  base: number
  /** Fatia da prova (em %) com 5 respostas ou mais. */
  cobertura: number
  confianca: 'alta' | 'media' | 'baixa'
  areas: AreaNota[]
}
/** Respostas de primeira vez que a estimativa pede para aparecer. */
export const MINIMO_NOTA = 30
/** Quanto o acerto geral "puxa" um tema com poucas respostas (respostas fictícias somadas). */
const ENCOLHER = 6
/** Meta usada no "quanto sobe": chegar a 80% no tema. */
export const META_TEMA = 0.8

/**
 * Nota estimada (0 a 100) na prova: o acerto de primeira vez em cada tema, puxado para o acerto geral quando há
 * poucas respostas, ponderado pela fatia do tema nas provas oficiais (incidencia.json). A faixa é de 90%.
 */
export function notaEstimada(eventos: Evento[], nomes: Map<string, string> = new Map()): NotaEstimada | null {
  const primeiras = eventos.filter((e) => e.primeira && e.correta !== null)
  if (primeiras.length < MINIMO_NOTA) return null
  const geral = primeiras.filter((e) => e.correta).length / primeiras.length
  const porTema = new Map<string, { n: number; certas: number }>()
  for (const e of primeiras) {
    if (!e.tema) continue
    const x = porTema.get(e.tema) ?? { n: 0, certas: 0 }
    x.n++; if (e.correta) x.certas++
    porTema.set(e.tema, x)
  }
  const pesoTotal = AREAS.reduce((t, a) => t + (a.pct ?? 0), 0)
  let soma = 0, variancia = 0, coberto = 0
  const areas: AreaNota[] = AREAS.map((a) => {
    const w = (a.pct ?? 0) / pesoTotal
    const d = porTema.get(a.slug) ?? { n: 0, certas: 0 }
    const p = (d.certas + ENCOLHER * geral) / (d.n + ENCOLHER)
    soma += w * p
    variancia += (w * w * p * (1 - p)) / (d.n + ENCOLHER)
    if (d.n >= 5) coberto += a.pct ?? 0
    return { slug: a.slug, nome: nomes.get(a.slug) ?? a.nome, peso: a.pct ?? 0, n: d.n, certas: d.certas, p, ganho: Math.max(0, w * (META_TEMA - p) * 100) }
  })
  const margem = 1.645 * Math.sqrt(variancia) * 100
  const nota = Math.round(soma * 100)
  const cobertura = Math.round((coberto / pesoTotal) * 100)
  return {
    nota, baixa: Math.max(0, Math.round(soma * 100 - margem)), alta: Math.min(100, Math.round(soma * 100 + margem)),
    base: primeiras.length, cobertura, confianca: cobertura >= 70 && primeiras.length >= 150 ? 'alta' : cobertura >= 40 ? 'media' : 'baixa',
    areas: areas.sort((x, y) => y.ganho - x.ganho),
  }
}

/* ───────────── Turma ───────────── */

export interface ComparacaoTurma { n: number; voce: number; turma: number; diferenca: number; porTema: Map<string, { n: number; voce: number; turma: number }> }

/** Seu acerto de primeira contra o da turma nas mesmas questões (turma = acerto de primeira de todos, em %). */
export function compararTurma(eventos: Evento[], turma: Map<string, { acerto: number }>): ComparacaoTurma | null {
  let n = 0, voce = 0, esperado = 0
  const porTema = new Map<string, { n: number; voce: number; turma: number }>()
  for (const e of eventos) {
    if (!e.primeira || e.correta === null) continue
    const t = turma.get(e.id)
    if (!t) continue
    n++; if (e.correta) voce++; esperado += t.acerto / 100
    if (e.tema) {
      const x = porTema.get(e.tema) ?? { n: 0, voce: 0, turma: 0 }
      x.n++; if (e.correta) x.voce++; x.turma += t.acerto / 100
      porTema.set(e.tema, x)
    }
  }
  if (n < MINIMO_LEITURA) return null
  return { n, voce: voce / n, turma: esperado / n, diferenca: Math.round(((voce - esperado) / n) * 100), porTema }
}

/* ───────────── Assuntos e prioridades ───────────── */

export interface LinhaAssunto {
  chave: string
  tema: string
  nome: string
  /** Questões de prova do assunto nas provas oficiais (incidência), ou da área inteira na linha do tema. */
  incidencia: number
  respondidas: number
  noAcervo: number
  certas: number
  n: number
  /** Acerto nos últimos 30 dias menos o de antes (em pontos), quando os dois têm respostas suficientes. */
  tendencia: number | null
  pendentes: number
  prioridade: number
}

/**
 * Uma linha por tema e uma por assunto (o assunto principal de cada questão, o mesmo do Cronograma). Acerto de
 * primeira vez; prioridade = incidência × o quanto falta para 80%, puxado para a média quando há poucas respostas.
 */
export function linhasAssuntos(indice: Indice, respondidas: Respondidas, eventos: Evento[], agora = Date.now()) {
  const focos = focoPorQuestao(indice)
  const incTema = new Map(AREAS.map((a) => [a.slug, a.n ?? 0]))
  const incAssunto = new Map<string, number>()
  for (const a of AREAS) for (const f of a.focos) incAssunto.set(`${a.slug}|${f.nome}`, f.n ?? 0)
  const nomeTema = new Map(indice.temas.map((t) => [t.slug, t.nome]))
  const vazia = (chave: string, tema: string, nome: string, incidencia: number): LinhaAssunto =>
    ({ chave, tema, nome, incidencia, respondidas: 0, noAcervo: 0, certas: 0, n: 0, tendencia: null, pendentes: 0, prioridade: 0 })
  const temas = new Map<string, LinhaAssunto>()
  const assuntos = new Map<string, LinhaAssunto>()
  const linhaDe = (id: string, tema: string) => {
    const nome = focos.get(id)?.nome ?? 'Outros assuntos'
    const kT = tema, kA = `${tema}|${nome}`
    if (!temas.has(kT)) temas.set(kT, vazia(kT, tema, nomeTema.get(tema) ?? tema, incTema.get(tema) ?? 0))
    if (!assuntos.has(kA)) assuntos.set(kA, vazia(kA, tema, nome, incAssunto.get(kA) ?? 0))
    return [temas.get(kT)!, assuntos.get(kA)!]
  }
  for (const q of indice.questoes) {
    if (q.dup || q.an === 1) continue
    const t = indice.temas[q.t]; if (!t) continue
    for (const l of linhaDe(q.id, t.slug)) l.noAcervo++
  }
  const pend = new Set(errosPendentes(respondidas))
  const temaDe = new Map<string, string>()
  for (const q of indice.questoes) { const t = indice.temas[q.t]; if (t) temaDe.set(q.id, t.slug) }
  for (const id of Object.keys(respondidas)) {
    const tema = temaDe.get(id); if (!tema) continue
    for (const l of linhaDe(id, tema)) { l.respondidas++; if (pend.has(id)) l.pendentes++ }
  }
  const corte = agora - 30 * DIA
  const recente = new Map<string, { n: number; c: number }>(), antigo = new Map<string, { n: number; c: number }>()
  for (const e of eventos) {
    if (!e.primeira || e.correta === null || !e.tema) continue
    for (const l of linhaDe(e.id, e.tema)) {
      l.n++; if (e.correta) l.certas++
      const alvo = e.em >= corte ? recente : antigo
      const x = alvo.get(l.chave) ?? { n: 0, c: 0 }; x.n++; if (e.correta) x.c++; alvo.set(l.chave, x)
    }
  }
  const total = [...temas.values()].reduce((t, l) => ({ n: t.n + l.n, c: t.c + l.certas }), { n: 0, c: 0 })
  const media = total.n ? total.c / total.n : 0.6
  const maxTema = Math.max(1, ...[...temas.values()].map((l) => l.incidencia))
  const maxAssunto = Math.max(1, ...[...assuntos.values()].map((l) => l.incidencia))
  const fechar = (l: LinhaAssunto, max: number) => {
    const r = recente.get(l.chave), a = antigo.get(l.chave)
    l.tendencia = r && a && r.n >= 5 && a.n >= 5 ? Math.round((r.c / r.n - a.c / a.n) * 100) : null
    const p = (l.certas + ENCOLHER * media) / (l.n + ENCOLHER)
    l.prioridade = Math.round((l.incidencia / max) * Math.max(0, META_TEMA - p) * 1000) / 10
    return l
  }
  return {
    temas: [...temas.values()].map((l) => fechar(l, maxTema)),
    assuntos: [...assuntos.values()].map((l) => fechar(l, maxAssunto)),
  }
}

/* ───────────── Resumos indicados ───────────── */

export interface CapituloResumo { id: string; titulo: string; livro: string; especialidade: string; minutos: number; acesso: 'gratis' | 'assinante'; questoes: string[]; treino: string[]; subtemas?: string[] }
export interface ResumoIndicado { capitulo: CapituloResumo; cobre: number; assuntos: string[] }

/**
 * Resumos que mais cobrem os seus erros: o resumo que cita a questão errada vale 1; o que ensina o assunto dela
 * (subtemas do resumo) vale meio. Os que não cobrem nenhuma questão errada ficam de fora.
 */
export function indicarResumos(capitulos: CapituloResumo[], erradas: string[], indice: Indice, maximo = 4): ResumoIndicado[] {
  if (!erradas.length) return []
  const subtemasDe = new Map<string, string[]>()
  const porId = new Map(indice.questoes.map((q) => [q.id, q]))
  for (const id of erradas) { const q = porId.get(id); if (q) subtemasDe.set(id, q.s.map((s) => (indice.subtemas[s] ?? '').toLocaleLowerCase('pt-BR'))) }
  const focos = focoPorQuestao(indice)
  const lista: Array<ResumoIndicado & { pontos: number }> = []
  for (const c of capitulos) {
    const citadas = new Set([...c.questoes, ...c.treino])
    const ensina = new Set((c.subtemas ?? []).map((s) => s.toLocaleLowerCase('pt-BR')))
    let pontos = 0, cobre = 0
    const assuntos = new Set<string>()
    for (const id of erradas) {
      const cita = citadas.has(id)
      const tema = (subtemasDe.get(id) ?? []).some((s) => ensina.has(s))
      if (!cita && !tema) continue
      pontos += cita ? 1 : 0.5; cobre++
      const f = focos.get(id)?.nome; if (f) assuntos.add(f)
    }
    if (cobre) lista.push({ capitulo: c, cobre, assuntos: [...assuntos].slice(0, 3), pontos })
  }
  return lista.sort((a, b) => b.pontos - a.pontos || a.capitulo.minutos - b.capitulo.minutos).slice(0, maximo).map(({ pontos: _p, ...r }) => r)
}

/* ───────────── Calendário ───────────── */

export interface DiaCalendario { inicio: number; n: number; certas: number; novas: number; revisoes: number }

/** Os últimos `dias` dias (hoje incluído), com respostas, acertos, novas e revisões. */
export function calendario(eventos: Evento[], dias = 364, agora = Date.now()): DiaCalendario[] {
  const hoje = inicioDe(agora, 'dia')
  const mapa = new Map<number, DiaCalendario>()
  const lista: DiaCalendario[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje); d.setDate(d.getDate() - i)
    const x = { inicio: d.getTime(), n: 0, certas: 0, novas: 0, revisoes: 0 }
    mapa.set(x.inicio, x); lista.push(x)
  }
  for (const e of eventos) {
    const x = mapa.get(inicioDe(e.em, 'dia')); if (!x) continue
    x.n++; if (e.correta) x.certas++
    if (e.primeira) x.novas++; else x.revisoes++
  }
  return lista
}

/** Nível de 0 a 4 da intensidade do dia, pelos quartis dos dias com estudo. */
export function niveisCalendario(dias: DiaCalendario[]): (n: number) => 0 | 1 | 2 | 3 | 4 {
  const ativos = dias.map((d) => d.n).filter((n) => n > 0).sort((a, b) => a - b)
  const q = (f: number) => ativos[Math.min(ativos.length - 1, Math.floor(f * ativos.length))] ?? 1
  const [a, b, c] = [q(0.25), q(0.5), q(0.75)]
  return (n) => (n <= 0 ? 0 : n <= a ? 1 : n <= b ? 2 : n <= c ? 3 : 4)
}

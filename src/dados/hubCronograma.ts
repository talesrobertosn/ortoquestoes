import type { Indice } from './tipos'
import { AREAS, focoPorQuestao, idsDoFoco, type AreaIncidencia, type Foco, type Nivel } from './incidencia'
import { entraNoPlano, incluiSimulados, type CalculoPlano, type PlanoSalvo } from './planoEstudo'

/**
 * O que a página do cronograma mostra além do plano em si: a constância de
 * quem segue o plano, os temas que estão ficando esquecidos, os assuntos que
 * mais caem e em que a pessoa mais erra (mapa de risco), o diagnóstico inicial
 * e as sessões prontas da reta final. Tudo calculado no aparelho, a partir do
 * histórico de respostas.
 */

type Confianca = 'seguro' | 'duvida' | 'chute'
export interface RegistroHub {
  c: boolean | null
  q?: number
  confianca?: Confianca
  historico?: Array<{ em: number; correta: boolean | null }>
}
type Respondidas = Record<string, RegistroHub>

const DIA = 86_400_000
const meiaNoite = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const somarDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const chave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
/** Momentos em que a questão foi respondida (o histórico guarda as últimas 8). */
const momentos = (r: RegistroHub) => (r.historico?.length ? r.historico.map((h) => h.em) : r.q !== undefined ? [r.q] : [])
const ultimaVez = (r: RegistroHub) => Math.max(0, ...momentos(r))
/** Chute certo vale meio acerto. */
const pontos = (r: RegistroHub) => (r.c === true ? (r.confianca === 'chute' ? 0.5 : 1) : 0)

// ─── Constância ────────────────────────────────────────────────────────────

export type EstadoDia = 'cumprido' | 'parcial' | 'vazio' | 'folga' | 'hoje' | 'antes'
export interface Constancia {
  /** Dias de estudo seguidos com a meta cumprida (folga não quebra). */
  sequencia: number
  melhor: number
  /** % dos dias de estudo cumpridos nos últimos 14 (sem contar hoje). Null no começo do plano. */
  aderencia: number | null
  cumpridos: number
  contados: number
  /** Os últimos 14 dias, do mais antigo para hoje. */
  ultimos: Array<{ dia: Date; estado: EstadoDia; n: number }>
  /** Mínimo de questões (novas ou revisão) para o dia contar como cumprido. */
  minimo: number
}

/** Quantas respostas (novas e de revisão) cada dia teve. */
export function respostasPorDia(respondidas: Respondidas): Map<string, number> {
  const porDia = new Map<string, number>()
  for (const r of Object.values(respondidas)) for (const em of momentos(r)) {
    const k = chave(new Date(em))
    porDia.set(k, (porDia.get(k) ?? 0) + 1)
  }
  return porDia
}

export function calcularConstancia(respondidas: Respondidas, plano: PlanoSalvo, calculo: CalculoPlano, agora = new Date()): Constancia {
  const hoje = meiaNoite(agora)
  const criado = meiaNoite(new Date(plano.criado_em))
  const porDia = respostasPorDia(respondidas)
  // Cumprir é chegar a 80% da média planejada (a meta do dia oscila; a média é estável).
  const minimo = Math.max(5, Math.round(calculo.metaMedia * 0.8))
  const estadoDe = (d: Date): { estado: EstadoDia; n: number } => {
    const n = porDia.get(chave(d)) ?? 0
    if (d < criado) return { estado: 'antes', n }
    if (d.getTime() === hoje.getTime()) return { estado: n >= minimo ? 'cumprido' : 'hoje', n }
    if (plano.folgas.includes(d.getDay())) return { estado: 'folga', n }
    return { estado: n >= minimo ? 'cumprido' : n > 0 ? 'parcial' : 'vazio', n }
  }
  let sequencia = 0
  const hojeEstado = estadoDe(hoje)
  if (hojeEstado.estado === 'cumprido') sequencia++
  for (let d = somarDias(hoje, -1); d >= criado; d = somarDias(d, -1)) {
    const { estado } = estadoDe(d)
    if (estado === 'folga') continue
    if (estado !== 'cumprido') break
    sequencia++
  }
  let melhor = 0, atual = 0
  const inicioJanela = new Date(Math.max(criado.getTime(), hoje.getTime() - 180 * DIA))
  for (let d = meiaNoite(inicioJanela); d <= hoje; d = somarDias(d, 1)) {
    const { estado } = estadoDe(d)
    if (estado === 'folga' || estado === 'hoje') continue
    atual = estado === 'cumprido' ? atual + 1 : 0
    melhor = Math.max(melhor, atual)
  }
  const ultimos: Constancia['ultimos'] = []
  let cumpridos = 0, contados = 0
  for (let i = 13; i >= 0; i--) {
    const d = somarDias(hoje, -i)
    const e = estadoDe(d)
    ultimos.push({ dia: d, ...e })
    if (i > 0 && (e.estado === 'cumprido' || e.estado === 'parcial' || e.estado === 'vazio')) { contados++; if (e.estado === 'cumprido') cumpridos++ }
  }
  return { sequencia, melhor: Math.max(melhor, sequencia), aderencia: contados >= 3 ? Math.round((cumpridos / contados) * 100) : null, cumpridos, contados, ultimos, minimo }
}

export interface Elogio { titulo: string; texto: string; tom: 'ouro' | 'verde' | 'neutro' }

/** Uma frase para quem está seguindo (ou para quem precisa voltar), sem exagero. */
export function elogio(c: Constancia, calculo: CalculoPlano): Elogio {
  const pct = calculo.alvo ? Math.round((calculo.feitas / calculo.alvo) * 100) : 0
  if (c.sequencia >= 14) return { tom: 'ouro', titulo: `${c.sequencia} dias seguidos no plano`, texto: 'Duas semanas sem falhar. Isso é o que separa quem passa: constância vale mais que maratona.' }
  if (c.sequencia >= 7) return { tom: 'ouro', titulo: `Uma semana inteira no plano`, texto: `${c.sequencia} dias de estudo seguidos com a meta cumprida. Continue assim.` }
  if (calculo.ritmo > 5 && calculo.esperadoAteHoje >= 20) return { tom: 'verde', titulo: `${calculo.ritmo}% à frente do cronograma`, texto: 'Você está adiantado: a meta dos próximos dias já ficou menor.' }
  if (c.aderencia !== null && c.aderencia >= 80) return { tom: 'verde', titulo: `Cumpriu ${c.cumpridos} de ${c.contados} dias`, texto: 'Ótima aderência nas últimas duas semanas. O plano está funcionando.' }
  if (pct >= 75) return { tom: 'verde', titulo: 'Mais de três quartos do caminho', texto: 'A maior parte das questões do plano já foi feita. Falta pouco para a reta final.' }
  if (pct >= 50) return { tom: 'verde', titulo: 'Metade do cronograma feita', texto: 'Você já passou da metade das questões do plano.' }
  if (c.sequencia >= 3) return { tom: 'verde', titulo: `${c.sequencia} dias seguidos`, texto: 'Bom começo de sequência. O objetivo é chegar a uma semana.' }
  if (c.aderencia !== null && c.aderencia < 50) return { tom: 'neutro', titulo: 'Vamos retomar o ritmo', texto: 'Alguns dias ficaram para trás. Não precisa compensar tudo de uma vez: cumpra a meta de hoje e a sequência recomeça.' }
  return { tom: 'neutro', titulo: 'Cada dia cumprido conta', texto: `Faça pelo menos ${c.minimo} questões (novas ou de revisão) por dia de estudo para o dia entrar na sua sequência.` }
}

// ─── Esquecimento ──────────────────────────────────────────────────────────

export interface Esquecido { slug: string; nome: string; dias: number; respondidas: number; erros: number }

/**
 * Temas já estudados que estão há 3 semanas ou mais sem nenhuma resposta e
 * não estão na semana atual do cronograma: a memória começa a apagar.
 */
export function temasEsquecidos(indice: Indice, respondidas: Respondidas, calculo: CalculoPlano, plano: PlanoSalvo, agora = Date.now(), limiteDias = 21): Esquecido[] {
  const simulados = incluiSimulados(plano)
  const daSemana = new Set(calculo.semanas.find((s) => s.atual)?.temas.map((t) => t.slug) ?? [])
  const porTema = new Map<number, { ultima: number; respondidas: number; erros: number }>()
  for (const q of indice.questoes) {
    if (!entraNoPlano(q, simulados)) continue
    const r = respondidas[q.id]
    if (!r) continue
    const t = porTema.get(q.t) ?? { ultima: 0, respondidas: 0, erros: 0 }
    t.ultima = Math.max(t.ultima, ultimaVez(r)); t.respondidas++
    if (r.c === false) t.erros++
    porTema.set(q.t, t)
  }
  const lista: Esquecido[] = []
  for (const [i, t] of porTema) {
    const tema = indice.temas[i]
    if (!tema || t.respondidas < 10 || daSemana.has(tema.slug)) continue
    const dias = Math.floor((meiaNoite(new Date(agora)).getTime() - meiaNoite(new Date(t.ultima)).getTime()) / DIA)
    if (dias >= limiteDias) lista.push({ slug: tema.slug, nome: tema.nome, dias, respondidas: t.respondidas, erros: t.erros })
  }
  const peso = (slug: string) => { const i = AREAS.findIndex((a) => a.slug === slug); return i < 0 ? 1 : 1.35 - (0.55 * i) / Math.max(1, AREAS.length - 1) }
  return lista.sort((a, b) => b.dias * peso(b.slug) - a.dias * peso(a.slug))
}

/**
 * Sessão curta para reativar um tema esquecido: primeiro os erros, depois as
 * marcadas como chute ou dúvida, depois as acertadas há mais tempo dos
 * assuntos que mais caem.
 */
export function idsReativar(indice: Indice, respondidas: Respondidas, slug: string, n = 15): string[] {
  const tema = indice.temas.findIndex((t) => t.slug === slug)
  if (tema < 0) return []
  const focos = focoPorQuestao(indice)
  const vistas = indice.questoes.filter((q) => q.t === tema && !q.dup && !q.an && respondidas[q.id] && respondidas[q.id].c !== null)
  const prioridade = (id: string) => {
    const r = respondidas[id]
    return (r.c === false ? 3 : r.confianca && r.confianca !== 'seguro' ? 2 : 1) * 10 + (focos.get(id)?.nivel ?? 0)
  }
  return vistas.map((q) => q.id).sort((a, b) => prioridade(b) - prioridade(a) || ultimaVez(respondidas[a]) - ultimaVez(respondidas[b])).slice(0, n)
}

// ─── Mapa de risco ─────────────────────────────────────────────────────────

export interface Risco { area: AreaIncidencia; foco: Foco; respondidas: number; acerto: number; total: number; feitas: number; risco: number }

/**
 * Assuntos de prioridade alta ou máxima (os que mais caem) em que a pessoa
 * acerta menos de 65%, com pelo menos 3 respostas. Quanto mais o assunto cai
 * e quanto mais ela erra, mais alto no mapa.
 */
export function mapaDeRisco(indice: Indice, respondidas: Respondidas, maximo = 6): Risco[] {
  const lista: Risco[] = []
  const vistos = new Set<string>()
  for (const area of AREAS) {
    for (const foco of area.focos) {
      if (foco.nivel < 3 || vistos.has(`${area.slug}:${foco.nome}`)) continue
      vistos.add(`${area.slug}:${foco.nome}`)
      const ids = idsDoFoco(indice, area, foco)
      let validas = 0, certas = 0, feitas = 0
      for (const id of ids) {
        const r = respondidas[id]
        if (!r) continue
        feitas++
        if (r.c === null) continue
        validas++; certas += pontos(r)
      }
      if (validas < 3) continue
      const acerto = Math.round((certas / validas) * 100)
      if (acerto >= 65) continue
      lista.push({ area, foco, respondidas: validas, acerto, total: ids.length, feitas, risco: (foco.nivel === 4 ? 1.3 : 1) * (100 - acerto) })
    }
  }
  return lista.sort((a, b) => b.risco - a.risco).slice(0, maximo)
}

/** Assuntos que mais caem e que a pessoa ainda não abriu (nenhuma resposta). */
export function pontosCegos(indice: Indice, respondidas: Respondidas, maximo = 4): Array<{ area: AreaIncidencia; foco: Foco; total: number }> {
  const lista: Array<{ area: AreaIncidencia; foco: Foco; total: number }> = []
  for (const area of AREAS) for (const foco of area.focos) {
    if (foco.nivel < 4) continue
    const ids = idsDoFoco(indice, area, foco)
    if (ids.length >= 3 && !ids.some((id) => respondidas[id])) lista.push({ area, foco, total: ids.length })
  }
  return lista.slice(0, maximo)
}

// ─── Diagnóstico inicial ───────────────────────────────────────────────────

export const TAMANHO_DIAGNOSTICO = 30

/**
 * 30 questões que ainda não foram feitas, repartidas pelas áreas na proporção
 * do que cai na prova (no mínimo uma por área), dos assuntos de prioridade
 * mais alta e das provas mais recentes. Cerca de um sexto são OrtoQuestões
 * Simulados, no mesmo padrão da prova. Sempre a mesma seleção para o mesmo histórico.
 */
export function idsDiagnostico(indice: Indice, respondidas: Respondidas, simulados = true): string[] {
  const focos = focoPorQuestao(indice)
  const areas = AREAS.filter((a) => !a.subtema)
  const totalPct = areas.reduce((s, a) => s + (a.pct ?? 1), 0)
  const nSim = simulados ? 5 : 0
  const nOficiais = TAMANHO_DIAGNOSTICO - nSim
  const cotas = areas.map((a) => ({ a, n: Math.max(1, Math.round(((a.pct ?? 1) / totalPct) * nOficiais)) }))
  while (cotas.reduce((s, c) => s + c.n, 0) > nOficiais) { const maior = cotas.reduce((m, c) => (c.n > m.n ? c : m)); maior.n-- }
  const porArea: string[][] = []
  for (const { a, n } of cotas) {
    const escolhidas: string[] = []
    porArea.push(escolhidas)
    const tema = indice.temas.findIndex((t) => t.slug === a.slug)
    const candidatas = indice.questoes
      .filter((q) => q.t === tema && !q.dup && !q.ar && q.an !== 1 && q.sim !== 1 && !respondidas[q.id] && q.a)
      .sort((x, y) => (focos.get(y.id)?.nivel ?? 0) - (focos.get(x.id)?.nivel ?? 0) || (y.a ?? 0) - (x.a ?? 0) || (x.id < y.id ? -1 : 1))
    // Um assunto por vez: evita 5 questões do mesmo subtema.
    const usados = new Set<string>()
    for (const q of candidatas) {
      if (usados.size >= n) break
      const nome = focos.get(q.id)?.nome ?? q.id
      if (usados.has(nome)) continue
      usados.add(nome); escolhidas.push(q.id)
    }
  }
  // Intercaladas: uma de cada área por vez, para não vir um bloco inteiro de trauma.
  const escolhidas: string[] = []
  for (let i = 0; porArea.some((l) => i < l.length); i++) for (const l of porArea) if (i < l.length) escolhidas.push(l[i])
  if (nSim) {
    const sims = indice.questoes.filter((q) => q.sim === 1 && !q.dup && q.an !== 1 && !respondidas[q.id]).map((q) => q.id)
    // Espalhados pelo acervo: um a cada tanto, sempre os mesmos.
    const passo = Math.max(1, Math.floor(sims.length / nSim))
    for (let i = 0; i < nSim && i * passo < sims.length; i++) escolhidas.splice(Math.min(escolhidas.length, 3 + i * 6), 0, sims[i * passo])
  }
  return escolhidas
}

// ─── Reta final ────────────────────────────────────────────────────────────

/**
 * Semana −2, um dia de cada vez: as áreas, da que mais cai para a que menos
 * cai, repartidas pelos dias de estudo da semana (cada dia com uma fatia
 * parecida da prova). Devolve as áreas do dia de hoje.
 */
export function areasDoDiaRevisao(plano: PlanoSalvo, calculo: CalculoPlano, agora = new Date()): AreaIncidencia[] {
  const hoje = meiaNoite(agora)
  const dias: Date[] = []
  for (let d = meiaNoite(calculo.inicioRetaFinal); d < meiaNoite(calculo.inicioModoProva); d = somarDias(d, 1)) if (!plano.folgas.includes(d.getDay())) dias.push(d)
  const indiceHoje = dias.findIndex((d) => d.getTime() === hoje.getTime())
  if (indiceHoje < 0 || !dias.length) return []
  const areas = AREAS.filter((a) => !a.subtema)
  const total = areas.reduce((s, a) => s + (a.pct ?? 1), 0)
  const grupos: AreaIncidencia[][] = dias.map(() => [])
  let acumulado = 0
  for (const a of areas) {
    const g = Math.min(dias.length - 1, Math.floor((acumulado / total) * dias.length))
    grupos[g].push(a); acumulado += a.pct ?? 1
  }
  return grupos[indiceHoje]
}

/**
 * Sessão da revisão forte: nas áreas dadas, os erros primeiro (dos assuntos
 * que mais caem para os outros), depois chute e dúvida, depois as acertadas
 * dos assuntos de prioridade alta há mais tempo (para reativar a memória).
 */
export function idsRevisaoForte(indice: Indice, respondidas: Respondidas, slugs: string[], n: number): string[] {
  const temas = new Set(slugs.map((s) => indice.temas.findIndex((t) => t.slug === s)))
  const focos = focoPorQuestao(indice)
  const vistas = indice.questoes.filter((q) => temas.has(q.t) && !q.dup && q.an !== 1 && respondidas[q.id] && respondidas[q.id].c !== null)
  const grupo = (id: string) => {
    const r = respondidas[id]
    if (r.c === false) return 3
    if (r.confianca && r.confianca !== 'seguro') return 2
    return (focos.get(id)?.nivel ?? 0) >= 3 ? 1 : 0
  }
  return vistas.map((q) => q.id)
    .filter((id) => grupo(id) > 0)
    .sort((a, b) => grupo(b) - grupo(a) || (focos.get(b)?.nivel ?? 0) - (focos.get(a)?.nivel ?? 0) || ultimaVez(respondidas[a]) - ultimaVez(respondidas[b]))
    .slice(0, n)
}

/** Os erros que importam: questões erradas (ainda não corrigidas) dos assuntos de prioridade alta e máxima. */
export function idsErrosQueImportam(indice: Indice, respondidas: Respondidas, n = 40): string[] {
  const focos = focoPorQuestao(indice)
  return indice.questoes
    .filter((q) => !q.dup && q.an !== 1 && respondidas[q.id]?.c === false && (focos.get(q.id)?.nivel ?? 0) >= 3)
    .sort((a, b) => (focos.get(b.id)?.nivel ?? 0) - (focos.get(a.id)?.nivel ?? 0) || ultimaVez(respondidas[a.id]) - ultimaVez(respondidas[b.id]))
    .slice(0, n)
    .map((q) => q.id)
}
export function contarErrosQueImportam(indice: Indice, respondidas: Respondidas): number {
  const focos = focoPorQuestao(indice)
  return indice.questoes.filter((q) => !q.dup && q.an !== 1 && respondidas[q.id]?.c === false && (focos.get(q.id)?.nivel ?? 0) >= 3).length
}

/** Véspera: um aquecimento curto, só dos assuntos de prioridade máxima, já vistos e acertados (para chegar confiante). */
export function idsAquecimentoVespera(indice: Indice, respondidas: Respondidas, n = 25): string[] {
  const focos = focoPorQuestao(indice)
  const nivel4 = indice.questoes.filter((q) => !q.dup && q.an !== 1 && !q.ar && (focos.get(q.id)?.nivel ?? 0) === 4)
  const acertadas = nivel4.filter((q) => respondidas[q.id]?.c === true).sort((a, b) => ultimaVez(respondidas[a.id]) - ultimaVez(respondidas[b.id]))
  const novas = nivel4.filter((q) => !respondidas[q.id] && q.sim !== 1).sort((a, b) => (b.a ?? 0) - (a.a ?? 0))
  return [...acertadas, ...novas].slice(0, n).map((q) => q.id)
}

/** Quantas questões dos OrtoQuestões Simulados a pessoa fez e quantas há no acervo. */
export function contagemSimulados(indice: Indice, respondidas: Respondidas): { feitas: number; total: number; acerto: number | null } {
  let total = 0, feitas = 0, validas = 0, certas = 0
  for (const q of indice.questoes) {
    if (q.sim !== 1 || q.dup || q.an === 1) continue
    total++
    const r = respondidas[q.id]
    if (!r) continue
    feitas++
    if (r.c !== null) { validas++; certas += pontos(r) }
  }
  return { feitas, total, acerto: validas >= 5 ? Math.round((certas / validas) * 100) : null }
}

/** Acerto por área (só questões do plano), para o painel de desempenho do cronograma. */
export function desempenhoPorArea(calculo: CalculoPlano): Array<{ slug: string; nome: string; acerto: number; respondidas: number; posicao: number }> {
  return calculo.temas
    .filter((t) => t.acertoEstimado !== null)
    .map((t) => ({ slug: t.slug, nome: t.nome, acerto: t.acerto ?? t.acertoEstimado!, respondidas: t.respondidas, posicao: AREAS.findIndex((a) => a.slug === t.slug && !a.subtema) }))
    .sort((a, b) => (a.posicao < 0 ? 99 : a.posicao) - (b.posicao < 0 ? 99 : b.posicao))
}

export type { Nivel }

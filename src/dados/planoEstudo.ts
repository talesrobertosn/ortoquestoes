import type { Indice } from './tipos'
import { AREAS, focoPorQuestao, idsDoFoco, pesoIncidenciaDoTema, posicaoDaArea, type Nivel } from './incidencia'

/**
 * Cronograma até a prova. Tudo é recalculado a cada dia a partir do que a pessoa
 * já respondeu: atrasou, a meta sobe um pouco; adiantou, ela desce. A última
 * semana antes da prova fica reservada para a reta final (erros e simulado).
 * Os temas que mais caem na prova ganham mais espaço e vêm antes, e dentro de
 * cada tema o dia começa pelos assuntos mais cobrados.
 */

export type Intensidade = 'leve' | 'firme' | 'completo'
export interface PlanoSalvo {
  data_prova: string
  intensidade: Intensidade
  folgas: number[]
  prova: string
  base_respondidas: number
  criado_em: string
}

export const COBERTURA: Record<Intensidade, number> = { leve: 0.5, firme: 0.8, completo: 1 }
export const ROTULO_INTENSIDADE: Record<Intensidade, { nome: string; texto: string }> = {
  leve: { nome: 'Leve', texto: 'Metade das questões que faltam. Para quem concilia com plantão pesado.' },
  firme: { nome: 'Firme', texto: '80% das questões que faltam. O equilíbrio para a maioria.' },
  completo: { nome: 'Completo', texto: 'Todas as questões que faltam. Para quem quer ver o acervo inteiro.' },
}
export const DIAS_RETA_FINAL = 7
const DIA = 86_400_000

/** Meia-noite local de uma data "AAAA-MM-DD". */
export function dataLocal(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, d)
}
const meiaNoite = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const diasEntre = (a: Date, b: Date) => Math.round((meiaNoite(b).getTime() - meiaNoite(a).getTime()) / DIA)

/** Dias de estudo em [inicio, fim), sem os dias da semana de folga. */
export function diasDeEstudo(inicio: Date, fim: Date, folgas: number[]): number {
  let n = 0
  for (let d = meiaNoite(inicio); d < meiaNoite(fim); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (!folgas.includes(d.getDay())) n++
  }
  return n
}

export interface RegistroMinimo { c: boolean | null; q?: number; historico?: Array<{ em: number; correta: boolean | null }> }

export interface TemaPlano { slug: string; nome: string; faltam: number; acerto: number | null; respondidas: number; reforcado: boolean; incidencia: number }
/** Um assunto dentro do tema da semana: quantas questões dele entram e quanto ele cai. */
/** posicao: lugar do assunto no ranking da área (1 = o que mais cai); 0 fora do ranking. */
export interface AssuntoSemana { nome: string; n: number; nivel: Nivel | 0; posicao: number }
export interface SemanaPlano { inicio: Date; fim: Date; diasEstudo: number; temas: Array<{ slug: string; nome: string; n: number; focos: string[]; assuntos: AssuntoSemana[]; posicaoArea: number | null; depois: string[] }>; total: number; atual: boolean }
export interface CalculoPlano {
  diasAteProva: number
  diasEstudoRestantes: number
  inicioRetaFinal: Date
  alvo: number
  feitas: number
  restante: number
  metaDiaria: number
  feitasHoje: number
  faltaHoje: number
  esperadoAteHoje: number
  /** Positivo = adiantado, em % do esperado. */
  ritmo: number
  temas: TemaPlano[]
  semanas: SemanaPlano[]
  hoje: { slug: string; nome: string; n: number; focos: string[] } | null
  naRetaFinal: boolean
  provaPassou: boolean
}

export function calcularPlano(indice: Indice, respondidas: Record<string, RegistroMinimo>, plano: PlanoSalvo, agora = new Date()): CalculoPlano {
  const hoje = meiaNoite(agora)
  const prova = dataLocal(plano.data_prova)
  const criado = meiaNoite(new Date(plano.criado_em))
  const inicioRetaFinal = new Date(prova.getFullYear(), prova.getMonth(), prova.getDate() - DIAS_RETA_FINAL)
  const fimEstudo = inicioRetaFinal > hoje ? inicioRetaFinal : prova

  // Acervo por tema: quantas faltam e o acerto de cada um.
  const porTema = new Map<number, { faltam: number; certas: number; erradas: number; respondidas: number }>()
  let elegiveis = 0, respondidasNoAcervo = 0
  for (const q of indice.questoes) {
    if (q.dup || q.cm || q.an === 1) continue
    elegiveis++
    const t = porTema.get(q.t) ?? { faltam: 0, certas: 0, erradas: 0, respondidas: 0 }
    const r = respondidas[q.id]
    if (!r) t.faltam++
    else {
      respondidasNoAcervo++; t.respondidas++
      if (r.c === true) t.certas++
      else if (r.c === false) t.erradas++
    }
    porTema.set(q.t, t)
  }
  const certasTotal = [...porTema.values()].reduce((s, t) => s + t.certas, 0)
  const validasTotal = [...porTema.values()].reduce((s, t) => s + t.certas + t.erradas, 0)
  const media = validasTotal ? (certasTotal / validasTotal) * 100 : null

  const temas: TemaPlano[] = [...porTema.entries()].map(([i, t]) => {
    const tema = indice.temas[i]
    const validas = t.certas + t.erradas
    const acerto = validas >= 10 ? Math.round((t.certas / validas) * 100) : null
    const slug = tema?.slug ?? String(i)
    return { slug, nome: tema?.nome ?? String(i), faltam: t.faltam, acerto, respondidas: t.respondidas, reforcado: acerto !== null && media !== null && acerto < media - 5, incidencia: pesoIncidenciaDoTema(slug) }
  })
  const focosPendentes = focosQueFaltam(indice, respondidas)

  const alvo = Math.max(0, Math.ceil((elegiveis - Math.min(plano.base_respondidas, elegiveis)) * COBERTURA[plano.intensidade]))
  const feitas = Math.max(0, respondidasNoAcervo - plano.base_respondidas)
  const restante = Math.max(0, alvo - feitas)

  // Primeira resposta de hoje (não conta revisão de questão já vista).
  // Só o que entra no cronograma: cirurgia da mão, cópias e anuladas não contam.
  const feitasHoje = indice.questoes.filter((q) => {
    if (q.dup || q.cm || q.an === 1) return false
    const r = respondidas[q.id]
    const primeira = r?.historico?.[0]?.em ?? r?.q
    return primeira !== undefined && primeira >= hoje.getTime()
  }).length

  const diasEstudoRestantes = diasDeEstudo(hoje, fimEstudo, plano.folgas)
  // A meta de hoje soma o que já foi feito hoje ao restante: responder não baixa a meta do próprio dia.
  const metaDiaria = diasEstudoRestantes > 0 ? Math.ceil((restante + feitasHoje) / diasEstudoRestantes) : restante
  const faltaHoje = Math.max(0, metaDiaria - feitasHoje)

  const totalDiasPlano = Math.max(1, diasDeEstudo(criado, inicioRetaFinal > criado ? inicioRetaFinal : prova, plano.folgas))
  const decorridos = Math.min(totalDiasPlano, diasDeEstudo(criado, hoje, plano.folgas))
  const esperadoAteHoje = Math.round((alvo * decorridos) / totalDiasPlano)
  const feitasAntesDeHoje = feitas - feitasHoje
  const ritmo = esperadoAteHoje > 0 ? Math.round(((feitasAntesDeHoje - esperadoAteHoje) / esperadoAteHoje) * 100) : 0

  // Distribuição: cada tema pesa pelo que falta, com reforço para os fracos
  // e para os que mais caem na prova.
  const fator = (t: TemaPlano) => (1 + (t.acerto !== null && media !== null ? Math.min(1.5, Math.max(0, ((media - t.acerto) / 100) * 4)) : 0)) * t.incidencia
  const pesos = temas.filter((t) => t.faltam > 0).map((t) => ({ t, peso: t.faltam * fator(t) }))
  const somaPesos = pesos.reduce((s, p) => s + p.peso, 0)
  const cotas = pesos
    .map(({ t, peso }) => ({ t, n: Math.min(t.faltam, Math.round((restante * peso) / (somaPesos || 1))) }))
    .filter((c) => c.n > 0)
    // Os mais fracos e os que mais caem primeiro: dá tempo de revisar o que foi aprendido neles.
    .sort((a, b) => fator(b.t) - fator(a.t) || b.n - a.n)

  const semanas: SemanaPlano[] = []
  const segunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7))
  // As questões de cada tema na ordem em que o cronograma vai passar por elas
  // (a mesma da sessão do dia), para dizer quais assuntos entram em cada semana.
  const focos = focoPorQuestao(indice)
  const livresPorTema = new Map<string, string[]>()
  const usadasPorTema = new Map<string, number>()
  for (const q of indice.questoes) {
    if (q.dup || q.cm || q.an === 1 || respondidas[q.id]) continue
    const slug = indice.temas[q.t]?.slug ?? String(q.t)
    const lista = livresPorTema.get(slug) ?? []
    lista.push(q.id)
    livresPorTema.set(slug, lista)
  }
  const assuntosDe = (slug: string, n: number): { assuntos: AssuntoSemana[]; depois: string[] } => {
    let lista = livresPorTema.get(slug)
    if (!lista) return { assuntos: [], depois: [] }
    if (!(lista as string[] & { ordenada?: boolean }).ordenada) {
      lista = ordenarPorFoco(lista, focos)
      ;(lista as string[] & { ordenada?: boolean }).ordenada = true
      livresPorTema.set(slug, lista)
    }
    const inicio = usadasPorTema.get(slug) ?? 0
    usadasPorTema.set(slug, inicio + n)
    const contagem = new Map<string, AssuntoSemana>()
    for (const id of lista.slice(inicio, inicio + n)) {
      const f = focos.get(id)
      const nome = f?.nome ?? 'Outros assuntos'
      const item = contagem.get(nome) ?? { nome, n: 0, nivel: f?.nivel ?? 0, posicao: f?.posicao ?? 0 }
      item.n++
      contagem.set(nome, item)
    }
    // O que o tema ainda tem para as próximas semanas (os próximos assuntos da fila).
    const depois: string[] = []
    for (const id of lista.slice(inicio + n)) {
      const nome = focos.get(id)?.nome ?? 'Outros assuntos'
      if (!contagem.has(nome) && !depois.includes(nome)) depois.push(nome)
      if (depois.length >= 4) break
    }
    return { assuntos: [...contagem.values()], depois }
  }
  const fila = cotas.map((c) => ({ ...c }))
  for (let inicio = segunda; inicio < fimEstudo && semanas.length < 80; inicio = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 7)) {
    const fimSemana = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 7)
    const de = inicio < hoje ? hoje : inicio
    const ate = fimSemana > fimEstudo ? fimEstudo : fimSemana
    const dias = diasDeEstudo(de, ate, plano.folgas)
    let capacidade = dias * metaDiaria - (inicio <= hoje && hoje < fimSemana ? feitasHoje : 0)
    const temasSemana: SemanaPlano['temas'] = []
    while (capacidade > 0 && fila.length) {
      const atual = fila[0]
      const n = Math.min(atual.n, capacidade)
      temasSemana.push({ slug: atual.t.slug, nome: atual.t.nome, n, focos: focosPendentes.get(atual.t.slug) ?? [], ...assuntosDe(atual.t.slug, n), posicaoArea: posicaoDaArea(atual.t.slug) })
      atual.n -= n; capacidade -= n
      if (atual.n <= 0) fila.shift()
    }
    // O tema que não coube inteiro vai para o fim da fila: as semanas alternam
    // os temas em vez de passar um mês inteiro no mesmo.
    if (fila.length > 1 && temasSemana.length && fila[0].t.slug === temasSemana[temasSemana.length - 1].slug) fila.push(fila.shift()!)
    semanas.push({ inicio: de, fim: new Date(ate.getTime() - DIA), diasEstudo: dias, temas: temasSemana, total: temasSemana.reduce((s, t) => s + t.n, 0), atual: de <= hoje && hoje < fimSemana })
  }

  const primeiraSemana = semanas.find((s) => s.atual && s.temas.length)
  const hojeTarefa = primeiraSemana && faltaHoje > 0 ? { slug: primeiraSemana.temas[0].slug, nome: primeiraSemana.temas[0].nome, n: Math.min(faltaHoje, 100), focos: primeiraSemana.temas[0].focos } : null

  return {
    diasAteProva: diasEntre(hoje, prova),
    diasEstudoRestantes, inicioRetaFinal, alvo, feitas, restante, metaDiaria, feitasHoje, faltaHoje,
    esperadoAteHoje, ritmo, temas, semanas, hoje: hojeTarefa,
    naRetaFinal: hoje >= inicioRetaFinal && hoje < prova,
    provaPassou: hoje >= prova,
  }
}

/** Linha de base do plano: questões do acervo (sem cópias nem anuladas) já respondidas. */
export function respondidasNoAcervo(indice: Indice, respondidas: Record<string, unknown>): number {
  return indice.questoes.filter((q) => !q.dup && !q.cm && q.an !== 1 && respondidas[q.id]).length
}

/** Meta diária que um plano novo teria, para mostrar ao escolher a intensidade. */
export function simularMeta(indice: Indice, respondidas: Record<string, RegistroMinimo>, dataProva: string, intensidade: Intensidade, folgas: number[]): number {
  const base = respondidasNoAcervo(indice, respondidas)
  return calcularPlano(indice, respondidas, { data_prova: dataProva, intensidade, folgas, prova: '', base_respondidas: base, criado_em: new Date().toISOString() }).metaDiaria
}

/**
 * Por tema do acervo, os assuntos mais cobrados (os que caem muito ou com
 * frequência) que ainda têm questão por fazer, do mais para o menos cobrado.
 */
export function focosQueFaltam(indice: Indice, respondidas: Record<string, unknown>, maximo = 3): Map<string, string[]> {
  const porTema = new Map<string, Array<{ nome: string; nivel: Nivel }>>()
  for (const area of AREAS) {
    for (const foco of area.focos) {
      if (foco.nivel < 3) continue
      if (!idsDoFoco(indice, area, foco).some((id) => !respondidas[id])) continue
      const lista = porTema.get(area.slug) ?? []
      if (!lista.some((f) => f.nome === foco.nome)) lista.push({ nome: foco.nome, nivel: foco.nivel })
      porTema.set(area.slug, lista)
    }
  }
  const resultado = new Map<string, string[]>()
  for (const [slug, lista] of porTema) resultado.set(slug, lista.sort((a, b) => b.nivel - a.nivel).slice(0, maximo).map((f) => f.nome))
  return resultado
}

/** Semente estável a partir do id, para sortear sempre na mesma ordem. */
function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/**
 * Ordem fixa das questões de um tema no cronograma: primeiro os assuntos que
 * mais caem, um assunto de cada vez (na ordem do ranking), e dentro de cada
 * assunto uma ordem sorteada, mas sempre a mesma.
 */
export function ordenarPorFoco(ids: string[], focos: Map<string, { nivel: number; ordem: number }>): string[] {
  return [...ids].sort((a, b) => {
    const fa = focos.get(a), fb = focos.get(b)
    return (fb?.nivel ?? 0) - (fa?.nivel ?? 0) || (fa?.ordem ?? 1e6) - (fb?.ordem ?? 1e6) || hashId(a) - hashId(b)
  })
}

function ordemDoTema(indice: Indice, livres: string[]): string[] {
  return ordenarPorFoco(livres, focoPorQuestao(indice))
}

/**
 * As questões de hoje dentro de um tema: só as que ainda não foram feitas,
 * começando pelos assuntos que mais caem (sorteadas dentro de cada nível).
 */
export function idsDoDia(indice: Indice, slug: string, respondidas: Record<string, unknown>, n: number): string[] {
  const tema = indice.temas.findIndex((t) => t.slug === slug)
  if (tema < 0) return []
  const livres = indice.questoes.filter((q) => q.t === tema && !q.dup && !q.cm && q.an !== 1 && !respondidas[q.id]).map((q) => q.id)
  return ordemDoTema(indice, livres).slice(0, Math.max(0, n))
}

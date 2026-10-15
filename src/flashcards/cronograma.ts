/**
 * Cronograma dos flashcards (reprojetado em 15/10/2026, pedido do Tales:
 * "não está funcionando muito bem, está meio aleatório... fazer quantos por
 * dia quiser; se quiser fazer a mais, faça. Não engessado. Algo palpável").
 *
 * O plano agora é uma SEQUÊNCIA concreta e visível, não uma conta de carga:
 *   1. os assuntos entram na fila pela incidência na prova (a mesma contagem
 *      de "Temas que mais caem" e do cronograma de criação da fábrica);
 *   2. dentro de cada assunto, do flashcard mais fácil para o mais difícil;
 *   3. cada dia de estudo sugere `ritmo` flashcards novos dessa fila, e as
 *      revisões que venceram entram ANTES das novidades;
 *   4. a meta é sugestão: passar dela adianta a fila (amanhã começa de onde
 *      você parou) e ficar abaixo só reprograma, sem bronca;
 *   5. a data-alvo é opcional e nunca vira erro: mostramos a previsão
 *      realista de término e, se quiser, o ritmo que chega na data.
 * Tudo é recalculado a partir dos registros de aprendizagem, então não há
 * estado do plano para "atrasar". O formato salvo antigo (data obrigatória,
 * ritmo como teto) abre sem perda: veja `migrarPlano`.
 */
import { AREAS, type Nivel } from '../dados/incidencia'
import { dominada, revisarHoje } from '../estado/revisao'
import { chaveDoDia, diaDaSemana, diasEntre, somarDias } from '../util/dia'
import type { RegistroFlashcard } from './progresso'
import type { Flashcard } from './tipos'

export const CHAVE_PLANO = 'flashcards:plano'
/** Rota de um uso só que a Entrada deixa para a Cripta seguir o cronograma (sessionStorage). */
export const CHAVE_ROTA_CRONOGRAMA = 'flashcards:rota-cronograma'

export interface PlanoFlashcards {
  /** 2 = sequência por incidência (15/10/2026). Ausente nos planos antigos. */
  versao?: 2
  /** Data-alvo opcional (AAAA-MM-DD). Só serve para a previsão; nunca bloqueia. */
  data?: string | null
  /** Áreas incluídas (vazio = todas). */
  areas: string[]
  /** Dias da semana com meta (0 = domingo). Vazio = todos. Nos outros dias, estudar adianta. */
  diasSemana: number[]
  /** Sugestão de flashcards NOVOS por dia de estudo. As revisões vencidas vêm à parte, antes. */
  ritmo: number
  criadoEm: number
}

export const RITMOS = [10, 20, 30, 50, 80] as const
/** Quanto tempo leva, em média, um flashcard (responder, virar e avaliar). */
export const SEGUNDOS_POR_FLASHCARD = 30
/** Teto de revisões numa sessão: o resto fica para a próxima, sempre antes das novidades. */
export const MAX_REVISOES_SESSAO = 60

/** Plano usado enquanto a pessoa não monta o dela: tudo, 20 por dia, de segunda a sábado. */
export function planoSugerido(agora = Date.now()): PlanoFlashcards {
  return { versao: 2, data: null, areas: [], diasSemana: [1, 2, 3, 4, 5, 6], ritmo: 20, criadoEm: agora }
}

/**
 * Abre qualquer formato salvo. O antigo tinha `data` obrigatória e `ritmo` como teto de
 * (revisões + novos); o número continua sendo o mesmo, agora como sugestão de novos.
 * Nada é apagado: campos desconhecidos seguem junto.
 */
export function migrarPlano(bruto: unknown): PlanoFlashcards | null {
  if (!bruto || typeof bruto !== 'object') return null
  const p = bruto as Record<string, unknown>
  const ritmo = Math.round(Number(p.ritmo))
  const data = typeof p.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.data) ? p.data : null
  return {
    ...(p as object),
    versao: 2,
    data,
    areas: Array.isArray(p.areas) ? p.areas.filter((a): a is string => typeof a === 'string') : [],
    diasSemana: Array.isArray(p.diasSemana) ? [...new Set(p.diasSemana.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [],
    ritmo: Number.isFinite(ritmo) && ritmo > 0 ? Math.min(500, ritmo) : 20,
    criadoEm: Number(p.criadoEm) || Date.now(),
  }
}

/* ------------------------------------------------------------ incidência */

let mapaIncidencia: Map<string, { n: number; nivel: Nivel }> | null = null
/** Questões de prova e nível de cada assunto, pelo nome (o mesmo do acervo). */
export function incidenciaDoAssunto(assunto: string) {
  if (!mapaIncidencia) {
    mapaIncidencia = new Map()
    for (const a of AREAS) for (const f of a.focos) {
      for (const nome of [f.nome, f.noAcervo].filter(Boolean) as string[]) {
        const atual = mapaIncidencia.get(nome)
        if (!atual || (f.n ?? 0) > atual.n) mapaIncidencia.set(nome, { n: f.n ?? 0, nivel: f.nivel })
      }
    }
  }
  return mapaIncidencia.get(assunto) ?? { n: 0, nivel: 1 as Nivel }
}

const areaDe = (c: Flashcard) => c.areaId ?? c.area ?? 'outras'

/* ------------------------------------------------------------ registros */

/** Quando o flashcard foi visto pela primeira vez (só dá para saber com o histórico completo). */
export function primeiraVez(r?: Partial<RegistroFlashcard>): number | undefined {
  const h = r?.historico
  if (!h?.length) return undefined
  return (r?.tentativas ?? 1) <= h.length ? h[0].em : undefined
}

/* ------------------------------------------------------------ cálculo */

export type EstadoAssunto = 'feito' | 'agora' | 'a-fazer'

export interface AssuntoDoPlano {
  chave: string
  assunto: string
  areaId: string
  area: string
  /** Questões de prova do assunto (Temas que mais caem). */
  questoesProva: number
  nivel: Nivel
  total: number
  estudados: number
  dominados: number
  pendentes: number
  /** Ids ainda nunca vistos, na ordem do plano. */
  novos: string[]
  estado: EstadoAssunto
  /** Primeiro e último dia previstos para os novos deste assunto (ausente se já visto). */
  inicio?: string
  fim?: string
}

export interface FatiaDoDia { assunto: string; areaId: string; area: string; n: number }

export interface DiaDoPlano {
  dia: string
  /** É dia de meta pelo plano (os outros são folga). */
  estudo: boolean
  hoje: boolean
  /** Novos previstos (hoje: só o que falta da meta). */
  novos: number
  assuntos: FatiaDoDia[]
  /** Hoje: novos já feitos. */
  feitos?: number
}

export interface Cronograma {
  plano: PlanoFlashcards
  hoje: string
  ehDiaDeEstudo: boolean
  /** Ordem completa dos assuntos do plano. */
  assuntos: AssuntoDoPlano[]
  totalFlashcards: number
  estudados: number
  novosRestantes: number
  /** Revisões que venceram nos assuntos do plano (errados primeiro). */
  revisoes: string[]
  /** Novos sugeridos para hoje e quantos já foram feitos hoje. */
  metaNovos: number
  novosFeitosHoje: number
  revisoesFeitasHoje: number
  /** A sessão de hoje: revisões (até o teto) e depois os novos que faltam da meta. */
  sessaoHoje: string[]
  /** Os novos da sessão de hoje. */
  novosHoje: string[]
  /** Meta de novos cumprida e nenhuma revisão vencida. */
  metaFeita: boolean
  /** Próximos dias (hoje e mais 6). */
  semana: DiaDoPlano[]
  /** Primeiro dia de estudo depois de hoje. */
  amanha: DiaDoPlano | null
  /** Dia previsto para ver o último flashcard novo, no ritmo atual. Null quando já viu tudo. */
  previsao: string | null
  /** Com data-alvo: quantos novos por dia chegariam nela e a folga (dias) da previsão. */
  alvo: { data: string; diasDeEstudo: number; ritmoNaData: number; folga: number } | null
  concluido: boolean
}

const ehEstudo = (plano: PlanoFlashcards, dia: string) => !plano.diasSemana.length || plano.diasSemana.includes(diaDaSemana(dia))

/** Dias de estudo de `de` até `ate`, inclusive. */
export function contarDiasDeEstudo(plano: PlanoFlashcards, de: string, ate: string) {
  let n = 0
  for (let k = de; k <= ate; k = somarDias(k, 1)) if (ehEstudo(plano, k)) n++
  return n
}

/** Ordem dos assuntos e dos flashcards dentro de cada um. Pura e determinística. */
export function ordenarPlano(cartas: Flashcard[], areas: string[] = []) {
  const grupos = new Map<string, Flashcard[]>()
  for (const c of cartas) {
    if (areas.length && !areas.includes(areaDe(c))) continue
    const k = areaDe(c) + '|' + (c.assunto || 'Outros temas')
    const g = grupos.get(k)
    if (g) g.push(c); else grupos.set(k, [c])
  }
  const lista = [...grupos.entries()].map(([chave, cs]) => {
    const inc = incidenciaDoAssunto(cs[0].assunto)
    return { chave, cartas: cs.sort((a, b) => a.dificuldade - b.dificuldade || a.id.localeCompare(b.id)), ...inc }
  })
  // mais questões de prova primeiro; empate: mais flashcards, depois o nome. Os assuntos de resto
  // ("Outras fraturas na criança", "Outros temas...") vão para o fim, como no cronograma da fábrica.
  const resto = (g: { cartas: Flashcard[] }) => Number(/^Outr[oa]s\b/.test(g.cartas[0].assunto ?? ''))
  lista.sort((a, b) => resto(a) - resto(b) || b.n - a.n || b.cartas.length - a.cartas.length || a.chave.localeCompare(b.chave, 'pt-BR'))
  return lista
}

export function calcularCronograma(planoBruto: PlanoFlashcards | null, cartas: Flashcard[], registros: Record<string, RegistroFlashcard>, agora = Date.now()): Cronograma {
  const plano = migrarPlano(planoBruto) ?? planoSugerido(agora)
  const hoje = chaveDoDia(agora)
  const ehDiaDeEstudo = ehEstudo(plano, hoje)
  const ordem = ordenarPlano(cartas, plano.areas)

  let estudados = 0, novosFeitosHoje = 0, revisoesFeitasHoje = 0, total = 0
  const vencidas: Array<{ id: string; peso: number }> = []
  const assuntos: AssuntoDoPlano[] = ordem.map((g) => {
    const c0 = g.cartas[0]
    const a: AssuntoDoPlano = { chave: g.chave, assunto: c0.assunto || 'Outros temas', areaId: areaDe(c0), area: c0.area, questoesProva: g.n, nivel: g.nivel, total: g.cartas.length, estudados: 0, dominados: 0, pendentes: 0, novos: [], estado: 'a-fazer' }
    for (const c of g.cartas) {
      total++
      const r = registros[c.id]
      if (!r) { a.novos.push(c.id); continue }
      a.estudados++; estudados++
      if (dominada(r)) a.dominados++
      const pv = primeiraVez(r)
      const novoHoje = pv !== undefined && chaveDoDia(pv) === hoje
      if (novoHoje) novosFeitosHoje++
      else if (r.q && chaveDoDia(r.q) === hoje) revisoesFeitasHoje++
      if (revisarHoje(r, agora)) {
        a.pendentes++
        // errados primeiro, depois os que venceram há mais tempo
        vencidas.push({ id: c.id, peso: r.c === false ? -1e15 + (r.q ?? 0) : r.proximaRevisao ?? r.q ?? 0 })
      }
    }
    return a
  })
  vencidas.sort((a, b) => a.peso - b.peso)
  const revisoes = vencidas.map((v) => v.id)
  const fila = assuntos.flatMap((a) => a.novos.map((id) => ({ id, a })))
  const novosRestantes = fila.length

  const metaNovos = ehDiaDeEstudo ? plano.ritmo : 0
  const faltaHoje = Math.max(0, metaNovos - novosFeitosHoje)
  const novosHoje = fila.slice(0, faltaHoje).map((x) => x.id)
  const sessaoHoje = [...revisoes.slice(0, MAX_REVISOES_SESSAO), ...novosHoje]

  // Projeção: hoje leva o que falta da meta; cada dia de estudo seguinte, `ritmo`.
  let pos = 0
  const fatias = (n: number): FatiaDoDia[] => {
    const out: FatiaDoDia[] = []
    for (const x of fila.slice(pos, pos + n)) {
      const ult = out[out.length - 1]
      if (ult && ult.assunto === x.a.assunto && ult.areaId === x.a.areaId) ult.n++
      else out.push({ assunto: x.a.assunto, areaId: x.a.areaId, area: x.a.area, n: 1 })
    }
    return out
  }
  const marcar = (dia: string, n: number) => {
    for (const x of fila.slice(pos, pos + n)) { x.a.inicio ??= dia; x.a.fim = dia }
    pos += n
  }
  const semana: DiaDoPlano[] = []
  let previsao: string | null = null
  for (let i = 0, dia = hoje; pos < fila.length || i < 7; i++, dia = somarDias(dia, 1)) {
    const estudo = ehEstudo(plano, dia)
    const n = Math.min(fila.length - pos, i === 0 ? faltaHoje : estudo ? plano.ritmo : 0)
    if (i < 7) semana.push({ dia, estudo, hoje: i === 0, novos: n, assuntos: fatias(n), ...(i === 0 ? { feitos: novosFeitosHoje } : {}) })
    if (n > 0) { marcar(dia, n); if (pos >= fila.length) previsao = dia }
    if (i > 4000) break // segurança: 11 anos
  }
  if (!fila.length) previsao = null
  // "agora": o assunto onde a fila está (e os que entram hoje); "feito": todos vistos
  const daVez = fila[0]?.a
  for (const a of assuntos) a.estado = !a.novos.length ? 'feito' : a === daVez || a.inicio === hoje ? 'agora' : 'a-fazer'

  let alvo: Cronograma['alvo'] = null
  if (plano.data && plano.data >= hoje) {
    const dias = contarDiasDeEstudo(plano, hoje, plano.data)
    // hoje já conta com os novos que você fez
    const ritmoNaData = dias > 0 ? Math.ceil((novosRestantes + (ehDiaDeEstudo ? novosFeitosHoje : 0)) / dias) : novosRestantes
    alvo = { data: plano.data, diasDeEstudo: dias, ritmoNaData, folga: previsao ? diasEntre(previsao, plano.data) : diasEntre(hoje, plano.data) }
  }

  const amanha = semana.slice(1).find((d) => d.estudo && d.novos > 0) ?? semana.slice(1).find((d) => d.estudo) ?? null
  return {
    plano, hoje, ehDiaDeEstudo, assuntos, totalFlashcards: total, estudados, novosRestantes, revisoes,
    metaNovos, novosFeitosHoje, revisoesFeitasHoje, sessaoHoje, novosHoje,
    metaFeita: novosFeitosHoje >= metaNovos && !revisoes.length,
    semana, amanha, previsao, alvo, concluido: !novosRestantes && !revisoes.length,
  }
}

/**
 * A sessão que o botão "Seguir cronograma" abre. Sem nada para hoje (meta feita),
 * adianta: as revisões que houver e os próximos `extra` novos da fila.
 */
export function sessaoDoCronograma(c: Cronograma, extra = 0): string[] {
  if (extra > 0) {
    const proximos = c.assuntos.flatMap((a) => a.novos).filter((id) => !c.novosHoje.includes(id)).slice(0, extra)
    return [...c.revisoes.slice(0, MAX_REVISOES_SESSAO), ...c.novosHoje, ...proximos]
  }
  return c.sessaoHoje
}

/** Minutos de um número de flashcards, arredondado para cima de 5 em 5 (mínimo 5). */
export const minutos = (n: number) => Math.max(5, Math.ceil((n * SEGUNDOS_POR_FLASHCARD) / 60 / 5) * 5)

/** "~25 min" ou "~1h10". */
export function rotuloTempo(n: number) {
  const m = minutos(n)
  return m < 60 ? `~${m} min` : `~${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`
}

/**
 * Rota para a Cripta seguir o cronograma: os próximos flashcards vêm do assunto de hoje
 * (o mesmo filtro do poder Mapa do especialista). Devolve null quando não há novos hoje.
 */
export function rotaDoCronograma(c: Cronograma): { modo: 'so'; area: string; subtemas: string[]; restam: number } | null {
  const novos = c.novosHoje.length ? c.semana[0].assuntos : c.amanha?.assuntos ?? []
  const primeiro = novos[0] ?? c.assuntos.find((a) => a.novos.length)
  if (!primeiro) return null
  const area = primeiro.areaId
  const subtemas = [...new Set(novos.filter((f) => f.areaId === area).map((f) => f.assunto))]
  if (!subtemas.length) subtemas.push(primeiro.assunto)
  const restam = Math.max(10, novos.filter((f) => f.areaId === area).reduce((s, f) => s + f.n, 0))
  return { modo: 'so', area, subtemas, restam }
}

/**
 * Registro de aprendizagem dos flashcards (beta público, 13/10/2026).
 *
 * Um só caminho para o Estudo e para a Cripta registrarem uma resposta:
 *   - atualiza a fila de revisão (mesma escada de intervalos das questões, estado próprio);
 *   - soma o dia (no fuso do aparelho) para "atividade por dia";
 *   - guarda a chave do evento e ignora a mesma chave de novo (clique duplo,
 *     recarregar a página, reenvio, reconexão);
 *   - separa a resposta OBJETIVA (alternativa certa ou errada) da AUTOAVALIAÇÃO
 *     (Errei, Hesitei, Sabia). "Sabia" nunca entra no acerto objetivo.
 * Os dados antigos não tinham fonte nem dia: as métricas que dependem disso
 * contam a partir desta versão (nada é inventado para trás).
 */
import { ler, gravar } from '../estado/armazenamento'
import { dominada, proximoRegistro, revisarHoje } from '../estado/revisao'
import { CHAVE_HISTORICO, CHAVE_RECORDES, CHAVE_REGISTROS, RECORDES_VAZIOS, lembrarVisto, registrarResposta, type Recordes, type RegistroFlashcard } from './progresso'
import type { Flashcard } from './tipos'

export const CHAVE_DIARIO = 'flashcards:diario'
export const CHAVE_EVENTOS = 'flashcards:eventos'
const MAX_EVENTOS = 1500

export type Avaliacao = 'errei' | 'hesitei' | 'sabia'
export type ModoEstudo = 'estudo' | 'cripta'

/** Contagem de um dia (chave AAAA-MM-DD no fuso do aparelho). */
export interface Dia {
  /** Respostas registradas (com repetição). */
  revisoes: number
  /** Flashcards estudados pela primeira vez neste dia. */
  novos: number
  /** Respostas objetivas (alternativa) e quantas acertaram. */
  objetivas: number
  objetivasCertas: number
  /** Primeira resposta objetiva de cada flashcard e quantas acertaram. */
  primeiras: number
  primeirasCertas: number
  errei: number
  hesitei: number
  sabia: number
  estudo: number
  cripta: number
}
const DIA_VAZIO: Dia = { revisoes: 0, novos: 0, objetivas: 0, objetivasCertas: 0, primeiras: 0, primeirasCertas: 0, errei: 0, hesitei: 0, sabia: 0, estudo: 0, cripta: 0 }

/** Registro do flashcard com os campos novos desta versão (opcionais: os antigos não têm). */
export type RegistroAprendizagem = RegistroFlashcard & {
  /** Resultado da primeira resposta objetiva (alternativa) deste flashcard. */
  po?: boolean
  /** Última autoavaliação no Estudo. */
  av?: Avaliacao
}

export function chaveDoDia(t: number) {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface EventoEstudo {
  /** Identifica o evento: a mesma chave nunca conta duas vezes. */
  chave: string
  id: string
  modo: ModoEstudo
  /** Resposta objetiva: true/false; sem alternativa: null. */
  objetiva: boolean | null
  /** Autoavaliação do Estudo; a Cripta não pergunta (fica ausente). */
  avaliacao?: Avaliacao
  /** Na Cripta: acerto com o Pergaminho da pista. */
  assistida?: boolean
  agora?: number
}

/**
 * Registra uma resposta e devolve o registro novo, ou null se a chave já foi vista.
 * Regra do agendamento:
 *   - Estudo com autoavaliação: Errei = chute (volta hoje), Hesitei = dúvida (3 dias), Sabia = certeza (10 dias);
 *   - Cripta (resposta objetiva, sem perguntar confiança): acerto = certeza, acerto com pista = dúvida, erro volta hoje.
 */
export function registrarEstudo(ev: EventoEstudo): RegistroAprendizagem | null {
  const agora = ev.agora ?? Date.now()
  const vistos = ler<string[]>(CHAVE_EVENTOS, [])
  if (vistos.includes(ev.chave)) return null
  gravar(CHAVE_EVENTOS, [ev.chave, ...vistos].slice(0, MAX_EVENTOS))

  const registros = ler<Record<string, RegistroAprendizagem>>(CHAVE_REGISTROS, {})
  const anterior = registros[ev.id]
  let novo: RegistroAprendizagem
  if (ev.avaliacao) {
    novo = { ...proximoRegistro(anterior, ev.avaliacao !== 'errei', agora, ev.avaliacao === 'errei' ? 'chute' : ev.avaliacao === 'hesitei' ? 'duvida' : 'seguro'), assistidos: anterior?.assistidos, av: ev.avaliacao }
  } else {
    novo = { ...registrarResposta(anterior, ev.objetiva === true, !!ev.assistida, agora), av: anterior?.av }
  }
  // "Primeira resposta": a primeira vez que o flashcard é respondido, quando ela é objetiva (com alternativa).
  // Flashcards já estudados antes desta versão não entram (não se sabe como foi a primeira vez).
  const primeiraObjetiva = !anterior && ev.objetiva !== null
  novo.po = anterior ? anterior.po : primeiraObjetiva ? ev.objetiva === true : undefined
  registros[ev.id] = novo
  gravar(CHAVE_REGISTROS, registros)
  gravar(CHAVE_HISTORICO, lembrarVisto(ler<string[]>(CHAVE_HISTORICO, []), ev.id))

  const diario = ler<Record<string, Dia>>(CHAVE_DIARIO, {})
  const k = chaveDoDia(agora)
  const d = { ...DIA_VAZIO, ...diario[k] }
  d.revisoes++
  if (!anterior) d.novos++
  if (ev.objetiva !== null) {
    d.objetivas++; if (ev.objetiva) d.objetivasCertas++
    if (primeiraObjetiva) { d.primeiras++; if (ev.objetiva) d.primeirasCertas++ }
  }
  if (ev.avaliacao) d[ev.avaliacao]++
  d[ev.modo]++
  diario[k] = d
  // guarda até 400 dias
  const dias = Object.keys(diario).sort()
  for (const velho of dias.slice(0, Math.max(0, dias.length - 400))) delete diario[velho]
  gravar(CHAVE_DIARIO, diario)

  const rec = { ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }
  gravar(CHAVE_RECORDES, { ...rec, respostas: rec.respostas + 1, atualizadoEm: agora })
  return novo
}

/* ------------------------------------------------------------ Estatísticas */

export interface Estatisticas {
  /** Flashcards diferentes com pelo menos uma resposta (repetição não conta). */
  unicos: number
  /** Respostas registradas (com repetição): soma das tentativas de cada flashcard. */
  revisoes: number
  /** Para revisar hoje (vencidos e errados). */
  pendentes: number
  dominados: number
  /** Última avaliação de cada flashcard no Estudo (registros novos). */
  ultimaAvaliacao: Record<Avaliacao, number>
  /** No período: respostas, objetivas e acerto; dias com estudo. */
  periodo: { dias: number; revisoes: number; novos: number; objetivas: number; objetivasCertas: number; primeiras: number; primeirasCertas: number; errei: number; hesitei: number; sabia: number; diasAtivos: number; porDia: Array<{ dia: string; revisoes: number }> }
  porArea: Array<{ area: string; nome: string; total: number; estudados: number; dominados: number; pendentes: number; tentativas: number; acertos: number }>
  /** Primeiro dia com dados por dia (antes disso, o histórico antigo não tem a contagem diária). */
  desde: string | null
}

export function calcularEstatisticas(cartas: Flashcard[], nomes: Record<string, string>, dias = 30, agora = Date.now()): Estatisticas {
  const registros = ler<Record<string, RegistroAprendizagem>>(CHAVE_REGISTROS, {})
  const diario = ler<Record<string, Dia>>(CHAVE_DIARIO, {})
  const porId = new Map(cartas.map((c) => [c.id, c]))
  let revisoes = 0, pendentes = 0, dominados = 0
  const ultimaAvaliacao: Record<Avaliacao, number> = { errei: 0, hesitei: 0, sabia: 0 }
  const areas = new Map<string, Estatisticas['porArea'][number]>()
  for (const c of cartas) {
    const a = c.areaId ?? c.area ?? 'outras'
    if (!areas.has(a)) areas.set(a, { area: a, nome: nomes[a] ?? c.area ?? a, total: 0, estudados: 0, dominados: 0, pendentes: 0, tentativas: 0, acertos: 0 })
    areas.get(a)!.total++
  }
  for (const [id, r] of Object.entries(registros)) {
    revisoes += r.tentativas ?? 1
    const pend = revisarHoje(r, agora), dom = dominada(r)
    if (pend) pendentes++
    if (dom) dominados++
    if (r.av) ultimaAvaliacao[r.av]++
    const c = porId.get(id)
    if (c) {
      const x = areas.get(c.areaId ?? c.area ?? 'outras')!
      x.estudados++; x.tentativas += r.tentativas ?? 1; x.acertos += r.acertos ?? Number(r.c === true)
      if (dom) x.dominados++
      if (pend) x.pendentes++
    }
  }
  const limite = chaveDoDia(agora - (dias - 1) * 86400000)
  const p = { dias, revisoes: 0, novos: 0, objetivas: 0, objetivasCertas: 0, primeiras: 0, primeirasCertas: 0, errei: 0, hesitei: 0, sabia: 0, diasAtivos: 0, porDia: [] as Array<{ dia: string; revisoes: number }> }
  for (let i = dias - 1; i >= 0; i--) {
    const k = chaveDoDia(agora - i * 86400000)
    const d = diario[k]
    p.porDia.push({ dia: k, revisoes: d?.revisoes ?? 0 })
    if (!d || k < limite) continue
    p.revisoes += d.revisoes; p.novos += d.novos; p.objetivas += d.objetivas; p.objetivasCertas += d.objetivasCertas
    p.primeiras += d.primeiras; p.primeirasCertas += d.primeirasCertas; p.errei += d.errei; p.hesitei += d.hesitei; p.sabia += d.sabia
    if (d.revisoes) p.diasAtivos++
  }
  const desde = Object.keys(diario).sort()[0] ?? null
  return {
    unicos: Object.keys(registros).length, revisoes, pendentes, dominados, ultimaAvaliacao, periodo: p,
    porArea: [...areas.values()].filter((x) => x.total > 0).sort((a, b) => b.estudados - a.estudados || b.total - a.total),
    desde,
  }
}

/* ------------------------------------------------------------ Cronograma */

export const CHAVE_PLANO = 'flashcards:plano'

export interface PlanoFlashcards {
  /** Data-alvo (AAAA-MM-DD). */
  data: string
  /** Áreas incluídas (vazio = todas). */
  areas: string[]
  /** Dias da semana em que a pessoa estuda (0 = domingo). */
  diasSemana: number[]
  /** Teto de flashcards por dia (novos + revisões). */
  ritmo: number
  criadoEm: number
}

export interface CalculoPlano {
  situacao: 'sem-data' | 'data-passada' | 'sem-flashcards' | 'concluido' | 'ok' | 'acima-do-ritmo'
  diasRestantes: number
  novosRestantes: number
  revisoesHoje: number
  /** Novos por dia de estudo para terminar na data. */
  novosPorDia: number
  /** Meta de hoje: revisões vencidas + novos do dia (limitada ao ritmo quando dá). */
  metaHoje: number
  /** Estudados hoje que contam para o plano (nas áreas do plano). */
  feitosHoje: number
  /** Carga necessária por dia (novos + revisões médias). */
  cargaPorDia: number
  ehDiaDeEstudo: boolean
}

/** Dias de estudo entre amanhã/hoje e a data-alvo (inclui hoje e a data), conforme os dias da semana escolhidos. */
export function diasDeEstudo(plano: Pick<PlanoFlashcards, 'data' | 'diasSemana'>, agora = Date.now()) {
  const [a, m, d] = plano.data.split('-').map(Number)
  if (!a || !m || !d) return -1
  const fim = new Date(a, m - 1, d).getTime()
  const hoje = new Date(agora); hoje.setHours(0, 0, 0, 0)
  if (fim < hoje.getTime()) return -1
  let n = 0
  for (let t = hoje.getTime(); t <= fim; t += 86400000) {
    const dia = new Date(t).getDay()
    if (!plano.diasSemana.length || plano.diasSemana.includes(dia)) n++
  }
  return n
}

export function calcularPlano(plano: PlanoFlashcards | null, cartas: Flashcard[], agora = Date.now()): CalculoPlano {
  const vazio: CalculoPlano = { situacao: 'sem-data', diasRestantes: 0, novosRestantes: 0, revisoesHoje: 0, novosPorDia: 0, metaHoje: 0, feitosHoje: 0, cargaPorDia: 0, ehDiaDeEstudo: false }
  if (!plano?.data) return vazio
  const registros = ler<Record<string, RegistroAprendizagem>>(CHAVE_REGISTROS, {})
  const doPlano = cartas.filter((c) => !plano.areas.length || plano.areas.includes(c.areaId ?? c.area ?? ''))
  if (!doPlano.length) return { ...vazio, situacao: 'sem-flashcards' }
  const dias = diasDeEstudo(plano, agora)
  const hoje = chaveDoDia(agora)
  const novosRestantes = doPlano.filter((c) => !registros[c.id]).length
  const revisoesHoje = doPlano.filter((c) => revisarHoje(registros[c.id], agora)).length
  const feitosHoje = doPlano.filter((c) => registros[c.id] && chaveDoDia(registros[c.id].q) === hoje).length
  const ehDiaDeEstudo = !plano.diasSemana.length || plano.diasSemana.includes(new Date(agora).getDay())
  if (dias < 0) return { ...vazio, situacao: 'data-passada', novosRestantes, revisoesHoje, feitosHoje, ehDiaDeEstudo }
  if (!novosRestantes && !revisoesHoje) return { ...vazio, situacao: 'concluido', diasRestantes: dias, feitosHoje, ehDiaDeEstudo }
  const novosPorDia = dias > 0 ? Math.ceil(novosRestantes / dias) : novosRestantes
  // revisões: as vencidas hoje mais uma estimativa das que vão vencer (cerca de 1 por novo estudado nos próximos dias)
  const cargaPorDia = novosPorDia * 2 + Math.ceil(revisoesHoje / Math.max(1, Math.min(dias, 3)))
  const metaHoje = ehDiaDeEstudo ? Math.min(Math.max(plano.ritmo, revisoesHoje), revisoesHoje + novosPorDia) : revisoesHoje
  return {
    situacao: cargaPorDia > plano.ritmo ? 'acima-do-ritmo' : 'ok', diasRestantes: dias, novosRestantes, revisoesHoje, novosPorDia,
    metaHoje, feitosHoje, cargaPorDia, ehDiaDeEstudo,
  }
}

/**
 * Números dos emblemas de Flashcards (ligados ao sistema do site em 15/10/2026).
 *
 * Os emblemas em si ficam em src/estado/conquistas.ts (famílias "fc…"), junto
 * com todos os outros, para aparecerem no inventário, na vitrine e no ranking.
 * Aqui só se calcula cada métrica a partir do que o jogo e a Biblioteca guardam:
 *   - andar mais fundo: SÓ o recorde validado pelo servidor (corridas com
 *     flashcards autorizados, migrações 202610130200/0300); o recorde do
 *     aparelho não conta, para ninguém ganhar emblema editando o aparelho;
 *   - mestre da revisão, especialista e lendários: registros dos flashcards
 *     (sincronizados com a conta);
 *   - bestiário, dragões e sem errar: o que o jogo guarda no aparelho (o
 *     servidor ainda não registra adversários nem sequências).
 * Fora do jogo o nome é sempre "Flashcards" (regra do Tales, 13/10/2026).
 */
import { dominada } from '../estado/revisao'
import { resumoRevisoes, sequenciaRevisao } from '../estado/metasRevisao'
import { BESTIARIO } from './motor/bestiario'
import type { Bestiario, Recordes, RegistroFlashcard } from './progresso'

/** Mestre da revisão: o dia conta com pelo menos estas revisões de flashcards. */
export const FC_REVISOES_DIA = 15
/** Adversários que contam para o Bestiário completo (o dragão do topo da Torre fica de fora). */
export const ADVERSARIOS_BESTIARIO = BESTIARIO.filter((b) => !b.exclusivo).map((b) => b.id)
/** Os dragões das profundezas. */
export const DRAGOES = ['dragao-de-ossos', 'dragao-rubro'] as const

export interface MetricasFlashcards {
  fcAndar: number
  fcMestreRevisao: number
  fcEspecialista: number
  fcBestiario: number
  fcDragaoOssos: number
  fcDragoes: number
  fcSemErrar: number
  fcLendarios: number
}
export const METRICAS_FLASHCARDS_VAZIAS: MetricasFlashcards = { fcAndar: 0, fcMestreRevisao: 0, fcEspecialista: 0, fcBestiario: 0, fcDragaoOssos: 0, fcDragoes: 0, fcSemErrar: 0, fcLendarios: 0 }

/** Recordes conferidos pelo servidor (RPC meus_recordes_flashcards). */
export interface RecordesServidor { andar_masmorra: number; unicos: number }

export interface DadosFlashcards {
  registros: Record<string, Partial<RegistroFlashcard>>
  bestiario?: Partial<Bestiario>
  recordes?: Partial<Recordes>
  servidor?: RecordesServidor | null
  /** Ids dos flashcards lendários (do acervo carregado); sem ele, os lendários ficam como estão. */
  lendarias?: ReadonlySet<string> | null
}

/** Área do flashcard pelo id ("fc-joelho-0123-q" → "joelho"). */
export function areaDoFlashcard(id: string): string | null {
  return /^fc-(.+?)-\d{2,5}-[a-z0-9]+$/.exec(id)?.[1] ?? null
}

export function metricasFlashcards(d: DadosFlashcards, agora = Date.now()): MetricasFlashcards {
  const dominadosPorArea = new Map<string, number>()
  let lendarios = 0
  for (const [id, r] of Object.entries(d.registros)) {
    if (!r) continue
    const area = areaDoFlashcard(id)
    if (area && dominada(r)) dominadosPorArea.set(area, (dominadosPorArea.get(area) ?? 0) + 1)
    if (d.lendarias?.has(id) && ((r.acertos ?? 0) > 0 || r.c === true)) lendarios++
  }
  const revisoes = resumoRevisoes(d.registros)
  const vencidos = new Set(d.bestiario?.vencidos ?? [])
  return {
    fcAndar: Math.max(0, Number(d.servidor?.andar_masmorra) || 0),
    fcMestreRevisao: sequenciaRevisao(revisoes.porDia, { minimo: FC_REVISOES_DIA }, agora).maior,
    fcEspecialista: Math.max(0, ...dominadosPorArea.values()),
    fcBestiario: ADVERSARIOS_BESTIARIO.filter((id) => vencidos.has(id)).length,
    fcDragaoOssos: vencidos.has('dragao-de-ossos') ? 1 : 0,
    fcDragoes: DRAGOES.filter((id) => vencidos.has(id)).length,
    fcSemErrar: Math.max(0, d.recordes?.melhorSequencia ?? 0),
    // Sem o acervo na memória não dá para saber a raridade: o valor fica 0 e o emblema, se já travado no servidor, continua.
    fcLendarios: lendarios,
  }
}

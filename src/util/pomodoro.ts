// Pomodoro da sessão (19/10/2026): blocos de foco e pausa que seguem correndo ao trocar de
// questão e ao recarregar a página. O estado guarda o instante em que a fase termina (e não
// um contador), então o tempo não atrasa com a aba em segundo plano.

export type FasePomodoro = 'foco' | 'pausa'

export interface EstadoPomodoro {
  fase: FasePomodoro
  /** Instante (ms) em que a fase termina, se estiver correndo. */
  fimEm: number | null
  /** Tempo que falta (ms) quando está parado. */
  restanteMs: number
  minutosFoco: number
  minutosPausa: number
  /** Blocos de foco completos. */
  ciclos: number
}

export const RITMOS: Array<{ foco: number; pausa: number }> = [
  { foco: 25, pausa: 5 },
  { foco: 50, pausa: 10 },
]

const MINUTO = 60_000

export function duracaoDaFase(e: Pick<EstadoPomodoro, 'minutosFoco' | 'minutosPausa'>, fase: FasePomodoro) {
  return (fase === 'foco' ? e.minutosFoco : e.minutosPausa) * MINUTO
}

export function estadoInicial(minutosFoco = 25, minutosPausa = 5): EstadoPomodoro {
  return { fase: 'foco', fimEm: null, restanteMs: minutosFoco * MINUTO, minutosFoco, minutosPausa, ciclos: 0 }
}

export function restante(e: EstadoPomodoro, agora: number) {
  return e.fimEm === null ? e.restanteMs : Math.max(0, e.fimEm - agora)
}

export function correndo(e: EstadoPomodoro) {
  return e.fimEm !== null
}

export function iniciar(e: EstadoPomodoro, agora: number): EstadoPomodoro {
  return correndo(e) ? e : { ...e, fimEm: agora + e.restanteMs }
}

export function pausar(e: EstadoPomodoro, agora: number): EstadoPomodoro {
  return correndo(e) ? { ...e, fimEm: null, restanteMs: restante(e, agora) } : e
}

/** Volta ao começo do foco, parado; os ciclos completos ficam. */
export function reiniciar(e: EstadoPomodoro): EstadoPomodoro {
  return { ...e, fase: 'foco', fimEm: null, restanteMs: duracaoDaFase(e, 'foco') }
}

/** Troca o ritmo (25/5 ou 50/10) e recomeça o foco, parado. */
export function trocarRitmo(e: EstadoPomodoro, minutosFoco: number, minutosPausa: number): EstadoPomodoro {
  return reiniciar({ ...e, minutosFoco, minutosPausa })
}

/**
 * Fecha as fases que já terminaram até `agora`. Foco que termina vira pausa já correndo;
 * pausa que termina vira foco parado, esperando a pessoa voltar (não começa sozinho).
 * `terminou` diz qual fase acabou por último, para o aviso.
 */
export function atualizar(e: EstadoPomodoro, agora: number): { estado: EstadoPomodoro; terminou: FasePomodoro | null } {
  if (e.fimEm === null || agora < e.fimEm) return { estado: e, terminou: null }
  if (e.fase === 'foco') {
    const fimPausa = e.fimEm + duracaoDaFase(e, 'pausa')
    const pausa: EstadoPomodoro = { ...e, fase: 'pausa', fimEm: fimPausa, restanteMs: duracaoDaFase(e, 'pausa'), ciclos: e.ciclos + 1 }
    if (agora < fimPausa) return { estado: pausa, terminou: 'foco' }
    return { estado: { ...pausa, fase: 'foco', fimEm: null, restanteMs: duracaoDaFase(e, 'foco') }, terminou: 'pausa' }
  }
  return { estado: { ...e, fase: 'foco', fimEm: null, restanteMs: duracaoDaFase(e, 'foco') }, terminou: 'pausa' }
}

export function formatarRelogio(ms: number) {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Lê um estado salvo, descartando o que não tiver o formato esperado. */
export function validar(bruto: unknown): EstadoPomodoro | null {
  if (!bruto || typeof bruto !== 'object') return null
  const e = bruto as Partial<EstadoPomodoro>
  const ritmo = RITMOS.find((r) => r.foco === e.minutosFoco && r.pausa === e.minutosPausa)
  if (!ritmo || (e.fase !== 'foco' && e.fase !== 'pausa')) return null
  const limite = duracaoDaFase({ minutosFoco: ritmo.foco, minutosPausa: ritmo.pausa }, e.fase)
  if (typeof e.restanteMs !== 'number' || !(e.restanteMs >= 0) || e.restanteMs > limite) return null
  if (e.fimEm !== null && typeof e.fimEm !== 'number') return null
  return { fase: e.fase, fimEm: e.fimEm ?? null, restanteMs: e.restanteMs, minutosFoco: ritmo.foco, minutosPausa: ritmo.pausa, ciclos: Math.max(0, Math.floor(Number(e.ciclos) || 0)) }
}

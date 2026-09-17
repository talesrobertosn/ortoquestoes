import type { Indice } from '../dados/tipos'
import type { RegistroQuestao } from './revisao'
import { dominada } from './revisao'

export interface DiaRevisao { chave: string; inicio: number; ids: string[]; temas: Map<string, number>; acertos: number; tentativas: number; atrasadas: number }
const DIA = 86400000
/** Cobre a cauda mais longa do ciclo de certeza (até 365 dias), com folga. */
export const JANELA_REVISAO_DIAS = 400
export function inicioDia(data = Date.now()) { const d = new Date(data); d.setHours(0, 0, 0, 0); return d.getTime() }
export function chaveDia(data: number) { return new Date(data).toISOString().slice(0, 10) }
export function planoRevisao(indice: Indice, registros: Record<string, Partial<RegistroQuestao> & { c: boolean | null }>, dias = JANELA_REVISAO_DIAS) {
  const hoje = inicioDia(); const porDia = new Map<string, DiaRevisao>()
  const temaPorId = new Map(indice.questoes.map((q) => [q.id, indice.temas[q.t]?.nome ?? 'Outro']))
  for (const [id, r] of Object.entries(registros)) {
    if (r.c === null || dominada(r) || r.proximaRevisao == null) continue
    const vencimento = inicioDia(r.proximaRevisao)
    const alvo = vencimento < hoje ? hoje : vencimento
    if (alvo > hoje + dias * DIA) continue
    const chave = chaveDia(alvo); let dia = porDia.get(chave)
    if (!dia) { dia = { chave, inicio: alvo, ids: [], temas: new Map(), acertos: 0, tentativas: 0, atrasadas: 0 }; porDia.set(chave, dia) }
    dia.ids.push(id); dia.temas.set(temaPorId.get(id) ?? 'Outro', (dia.temas.get(temaPorId.get(id) ?? 'Outro') ?? 0) + 1)
    dia.acertos += r.acertos ?? Number(r.c === true); dia.tentativas += r.tentativas ?? 1
    if (vencimento < hoje) dia.atrasadas++
  }
  return porDia
}
export function rotuloDia(data: number) { return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(data) }


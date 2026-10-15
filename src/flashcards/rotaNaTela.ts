/**
 * Contador da rota na tela (acabamento, 16/10/2026): quantos flashcards da rota de estudo
 * (Mapa do especialista, Desvio de área ou "Jogar o assunto de hoje") ainda faltam.
 *
 * O motor desconta `rota.restam` quando COMPRA o flashcard e apaga a rota ao comprar o último.
 * Para a tela, o flashcard que está na mesa ainda "falta": conta junto enquanto estiver à vista.
 * Só leitura: não muda a partida nem o save.
 */
import { aceitaNaRota, type RotaEstudo } from './motor/regras'
import type { Flashcard } from './tipos'

export interface MemoriaRota { id?: string; rota: RotaEstudo | null; daRota: RotaEstudo | null; total: number }
export interface RotaNaTela { modo: RotaEstudo['modo']; area: string; faltam: number; total: number }

export const memoriaRotaInicial = (rota: RotaEstudo | null | undefined, id?: string): MemoriaRota => ({ id, rota: rota ?? null, daRota: null, total: rota?.restam ?? 0 })

/** Atualiza a memória (mutável, guardada num ref) com o estado novo e devolve o que mostrar. */
export function rotaNaTela(m: MemoriaRota, rota: RotaEstudo | null | undefined, id: string | undefined, carta: (id: string) => Pick<Flashcard, 'areaId' | 'area' | 'subtemas'> | undefined): RotaNaTela | null {
  const r = rota ?? null
  const c = id ? carta(id) : undefined
  if (id !== m.id) {
    // flashcard novo na mesa: é da rota se foi comprado com a rota ainda valendo e se encaixa nela
    m.daRota = m.rota && m.rota.restam > 0 && c && aceitaNaRota(c, m.rota) ? m.rota : null
    m.id = id
  }
  if (r && (!m.rota || r.area !== m.rota.area || r.modo !== m.rota.modo || r.restam > m.rota.restam)) {
    // Rota nova (poder usado agora): o motor já descontou o flashcard da mesa quando ele serve
    // (ou trocou por um que serve), então ele é o primeiro dos N.
    m.daRota = c && aceitaNaRota(c, r) ? r : null
    m.total = r.restam + (m.daRota ? 1 : 0)
  }
  m.rota = r
  const base = r ?? m.daRota
  const faltam = (r?.restam ?? 0) + (m.daRota ? 1 : 0)
  if (!base || faltam <= 0) return null
  return { modo: base.modo, area: base.area, faltam, total: Math.max(m.total, faltam) }
}

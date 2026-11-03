/**
 * Consultas analíticas do painel 3.0, todas RPCs já existentes (com exigir_administrador no servidor)
 * e com o cache de usarRpc: dois módulos pedindo a mesma série recebem a mesma resposta.
 */
import type { DiaSerie } from '../../componentes/admin/estudoHoje'
import { CINCO_MIN, usarRpc } from '../../componentes/admin/usarRpc'
import { usarPainel } from './painel'

export interface Funil { cadastrados: number; confirmaram: number; responderam: number; passaram_50: number; passaram_500: number; assinaram: number }
export interface Coorte { semana: string; cadastros: number; estudaram_1a_semana: number; voltaram_2a_semana: number }

/** Série diária de `dias` dias (cadastros, pessoas que estudaram, questões), dia de São Paulo. */
export function usarSerie(dias: number, aoVivo = false) {
  const { conta } = usarPainel()
  return usarRpc<DiaSerie[]>(conta, 'serie_diaria_admin', { p_dias: dias }, { atualizarCada: aoVivo ? CINCO_MIN : undefined })
}
export function usarFunil() {
  const { conta } = usarPainel()
  const q = usarRpc<Funil[]>(conta, 'funil_admin', {}, { atualizarCada: CINCO_MIN })
  const linha = q.dados?.[0]
  return { ...q, funil: linha ? Object.fromEntries(Object.entries(linha).map(([k, v]) => [k, Number(v)])) as unknown as Funil : null }
}
export function usarRetencao() {
  const { conta } = usarPainel()
  return usarRpc<Coorte[]>(conta, 'retencao_admin')
}

/** Série normalizada para números. */
export const serieLimpa = (s: DiaSerie[] | undefined | null) => Array.isArray(s)
  ? s.map(d => ({ dia: String(d.dia).slice(0, 10), cadastros: Number(d.cadastros), ativos: Number(d.ativos), respostas: Number(d.respostas) })).sort((a, b) => a.dia.localeCompare(b.dia))
  : null

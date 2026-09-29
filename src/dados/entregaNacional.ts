import type { EstadoSessao } from './tipos'
import type { ResultadoNacional } from './simuladoNacional'
import { chamarRpc } from '../servicos/supabase'

const emAndamento = new Map<string, Promise<ResultadoNacional>>()

/**
 * Manda as letras marcadas para a correção no servidor. Repetir é seguro: o
 * banco devolve o mesmo resultado para quem já entregou, e aqui um pedido em
 * voo não é duplicado.
 */
export function entregarSessaoNacional(sessao: EstadoSessao): Promise<ResultadoNacional> {
  const edicao = sessao.nacional
  if (!edicao) return Promise.reject(new Error('Sessão sem edição do Simulado Nacional.'))
  const existente = emAndamento.get(edicao)
  if (existente) return existente
  const respostas = Object.fromEntries(Object.entries(sessao.respostas).map(([id, r]) => [id, r.escolhida]))
  const pedido = chamarRpc<ResultadoNacional>('entregar_simulado_nacional', { p_edicao: edicao, p_respostas: respostas })
    .finally(() => emAndamento.delete(edicao))
  emAndamento.set(edicao, pedido)
  return pedido
}

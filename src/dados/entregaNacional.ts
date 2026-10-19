import type { EstadoSessao } from './tipos'
import { snEntregar, snGabarito, type EntregaSN, type RespostasSN } from './apiSimuladoNacional'
import { respostasParaServidor } from './provaNacional'
import { registrarEntregaNacional } from '../estado/sessao'

const emAndamento = new Map<string, Promise<EntregaSN>>()

/**
 * Entrega a prova do Simulado Nacional (sn_entregar), com as últimas letras
 * marcadas neste aparelho (as letras novas da edição). Repetir é seguro: o
 * banco devolve o resultado gravado, e aqui um pedido em voo não é duplicado.
 * Sem sessão local (a prova foi feita em outro aparelho ou a aba fechou), entrega
 * com o que o servidor já salvou. Depois, as respostas entram no histórico local
 * com a correção do servidor.
 */
export function entregarNacional(edicao: string, sessao: EstadoSessao | null): Promise<EntregaSN> {
  const existente = emAndamento.get(edicao)
  if (existente) return existente
  const local = sessao?.nacional === edicao ? sessao : null
  const respostas: RespostasSN | null = local ? respostasParaServidor(local) : null
  const pedido = snEntregar(edicao, respostas)
    .then(async (entrega) => {
      await registrarDepoisDaEntrega(edicao, local, entrega)
      return entrega
    })
    .finally(() => emAndamento.delete(edicao))
  emAndamento.set(edicao, pedido)
  return pedido
}

/** A sessão local da prova, se houver. */
export function entregarSessaoNacional(sessao: EstadoSessao): Promise<EntregaSN> {
  if (!sessao.nacional) return Promise.reject(new Error('Sessão sem edição do Simulado Nacional.'))
  return entregarNacional(sessao.nacional, sessao)
}

/** Histórico local depois da entrega (uma vez por edição; falhar aqui não desfaz a entrega). */
export async function registrarDepoisDaEntrega(edicao: string, sessao: EstadoSessao | null, entrega: Pick<EntregaSN, 'acertos' | 'total' | 'segundos'>) {
  try {
    const gabarito = await snGabarito(edicao)
    registrarEntregaNacional(sessao, edicao, entrega, gabarito)
  } catch { /* o resultado continua no servidor; o histórico local fica para a próxima visita */ }
}

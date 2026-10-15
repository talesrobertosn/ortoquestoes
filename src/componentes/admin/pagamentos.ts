import { ErroRpc, chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { nomeErro } from './formatos'

/** SQL das RPCs de cobranças e da assinatura na ficha. */
export const PARTE_COBRANCAS = 'parte 23 (supabase/colar-no-painel/sql-202610151600-parte23.sql)'

/** A função ainda não existe no banco (o SQL não foi colado): o PostgREST responde 404 / PGRST202. */
export function funcaoAusente(falha: unknown): boolean {
  if (falha instanceof ErroRpc) return falha.status === 404 || /PGRST202|could not find the function/i.test(falha.codigo)
  return /\(404\)|PGRST202/.test(String(falha))
}

/** Motivo real de uma falha de RPC ou Edge Function, para mostrar junto da mensagem. */
export function codigoDaFalha(falha: unknown): string {
  if (falha instanceof ErroRpc) return falha.codigo || `HTTP ${falha.status}`
  return String(falha instanceof Error ? falha.message : falha).replace(/^Error: /, '').slice(0, 160)
}

/**
 * Endereço do pagamento no painel do Mercado Pago (busca em Atividades pelo
 * número da operação). Só números: o id do Pix e o da cobrança do cartão.
 */
export const linkMercadoPago = (idPagamento: string | null | undefined) =>
  idPagamento && /^\d{3,20}$/.test(idPagamento) ? `https://www.mercadopago.com.br/activities?q=${idPagamento}` : null

/** Aviso do Mercado Pago como as RPCs do painel devolvem. */
export interface EventoPagamento {
  id: number
  id_evento: string
  tipo: string | null
  id_recurso: string | null
  status_processamento: string
  erro: string | null
  recebido_em: string
  processado_em: string | null
  // Da parte 23 em diante: de quem é o aviso, quando dá para ligar.
  id_usuario?: string | null
  usuario?: string | null
  nome?: string | null
}

/** Só o pagamento avulso (Pix ou cobrança do cartão) tem número que o Mercado Pago acha em Atividades. */
export const linkDoEvento = (e: Pick<EventoPagamento, 'tipo' | 'id_recurso'>) => e.tipo === 'payment' ? linkMercadoPago(e.id_recurso) : null

/** O que cada recusa do reprocessamento quer dizer. */
const RECUSAS: Record<string, string> = {
  evento_ja_reprocessado: 'Este aviso já tinha saído da fila de erro (outro clique ou outra aba reprocessou). Atualize a lista.',
  evento_nao_reprocessavel: 'Este aviso não tem número ou tipo do Mercado Pago, então não dá para reprocessar. Confira direto no Mercado Pago.',
  evento_invalido: 'Número do aviso inválido.',
  acesso_negado: 'Acesso negado: só administradores podem reprocessar.',
  autenticacao_necessaria: 'A sessão expirou. Entre de novo e tente outra vez.',
  integracao_nao_validada: 'A integração com o Mercado Pago está desligada (MERCADO_PAGO_INTEGRACAO_VALIDADA).',
  reserva_evento_falhou: 'Não foi possível reservar o aviso para reprocessar. Tente de novo.',
  consulta_evento_falhou: 'Não foi possível ler o aviso no banco. Tente de novo.',
  autorizacao_indisponivel: 'Não foi possível conferir se a conta é de administrador. Tente de novo.',
}
export function motivoRecusa(codigo: string): string {
  return RECUSAS[codigo] ?? 'Não foi possível pedir o reprocessamento. Nada foi alterado nas assinaturas.'
}

export interface ResultadoReprocesso { ok: boolean; texto: string; status: string | null }

const esperar = (ms: number) => new Promise(resolver => setTimeout(resolver, ms))

/**
 * Pede o reprocessamento e espera o resultado: a Edge Function responde 202 e
 * processa em segundo plano, então a lista recarregada na hora ainda mostrava
 * "Na fila". `ler` relê o aviso (status e erro) até sair da fila ou o prazo
 * acabar (cerca de 20 s).
 */
export async function reprocessarEvento(id: number, ler: () => Promise<Pick<EventoPagamento, 'status_processamento' | 'erro'> | null>): Promise<ResultadoReprocesso> {
  try {
    await chamarFuncao('webhook-mercado-pago?acao=reprocessar', { id_evento: id })
  } catch (falha) {
    const codigo = codigoDaFalha(falha)
    return { ok: false, status: null, texto: `${motivoRecusa(codigo)} (código: ${codigo})` }
  }
  let atual: Awaited<ReturnType<typeof ler>> = null
  for (const pausa of [1500, 2500, 4000, 5000, 7000]) {
    await esperar(pausa)
    try { atual = await ler() } catch { atual = null }
    if (atual && atual.status_processamento !== 'recebido') break
  }
  const status = atual?.status_processamento ?? null
  if (status === 'processado') return { ok: true, status, texto: 'Reprocessado: o aviso foi aplicado. Confira a assinatura da pessoa.' }
  if (status === 'ignorado') return { ok: true, status, texto: 'Reprocessado: o Mercado Pago não pediu mudança (ignorado, o que é normal para alguns avisos).' }
  if (status === 'erro') return { ok: false, status, texto: `Reprocessado, mas continuou com erro: ${nomeErro(atual?.erro ?? null) || 'sem código'} (código: ${atual?.erro ?? '—'}). Confira no Mercado Pago.` }
  return { ok: false, status, texto: 'Pedido aceito, mas o aviso ainda está na fila depois de 20 s. Atualize daqui a pouco.' }
}

/** Relê um aviso pela lista geral (a mesma RPC da aba Pagamentos). */
export async function lerEvento(id: number) {
  const lista = await chamarRpc<EventoPagamento[]>('listar_eventos_pagamento_admin', {})
  return lista.find(e => e.id === id) ?? null
}

import { banco } from './http.ts'
import { consultarPagamento, type PagamentoMercadoPago } from './cobranca-mercado-pago.ts'
import { PRECOS, valoresAceitos } from './precos.ts'

export const PLANOS_PIX = PRECOS
export interface PedidoPix {
  id: string; id_usuario: string; plano: keyof typeof PLANOS_PIX; valor_centavos: number
  meses: number; pagamento_id: string | null; status: string; expira_em: string
}
export function cpfValido(valor: string) {
  const cpf = valor.replace(/\D/g, '')
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  for (let tamanho = 9; tamanho <= 10; tamanho++) {
    const soma = [...cpf.slice(0, tamanho)].reduce((s, n, i) => s + Number(n) * (tamanho + 1 - i), 0)
    const digito = (soma * 10 % 11) % 10
    if (digito !== Number(cpf[tamanho])) return false
  }
  return true
}
export function validarPagamentoPix(pedido: PedidoPix, pagamento: PagamentoMercadoPago, ambiente: string) {
  if (pagamento.external_reference !== `pix:${pedido.id}` || pagamento.payment_method_id !== 'pix'
    || pagamento.currency_id !== 'BRL' || Math.round(Number(pagamento.transaction_amount) * 100) !== pedido.valor_centavos
    || pagamento.live_mode !== (ambiente === 'producao')
    || (pedido.pagamento_id && String(pagamento.id) !== pedido.pagamento_id)) throw new Error('pagamento_pix_divergente')
  const plano = PLANOS_PIX[pedido.plano]
  // Preço novo ou o antigo de quem já assinava (e um Pix gerado antes do reajuste, que vale 24 h).
  if (!plano || !valoresAceitos(pedido.plano).includes(pedido.valor_centavos) || plano.meses !== pedido.meses) throw new Error('pedido_pix_invalido')
}
export async function sincronizarPix(pagamento: PagamentoMercadoPago) {
  const referencia = String(pagamento.external_reference ?? '')
  if (!/^pix:[0-9a-f-]{36}$/i.test(referencia)) throw new Error('referencia_pix_invalida')
  const resposta = await banco(`pedidos_pix?id=eq.${encodeURIComponent(referencia.slice(4))}&select=*`)
  if (!resposta.ok) throw new Error('consulta_pix_falhou')
  const [pedido] = await resposta.json() as PedidoPix[]
  if (!pedido) throw new Error('pedido_pix_nao_encontrado')
  validarPagamentoPix(pedido, pagamento, Deno.env.get('MERCADO_PAGO_AMBIENTE') ?? '')
  const atualizacao = await banco('rpc/confirmar_pagamento_pix', {
    method: 'POST', body: JSON.stringify({ p_pedido: pedido.id, p_pagamento: String(pagamento.id),
      p_status: pagamento.status, p_aprovado_em: pagamento.date_approved ?? null }),
  })
  if (!atualizacao.ok) throw new Error('confirmacao_pix_falhou')
  return { pedido, status: await atualizacao.json() as string }
}
export async function consultarPixDoUsuario(idUsuario: string, idPedido: string) {
  const consulta = await banco(`pedidos_pix?id=eq.${encodeURIComponent(idPedido)}&id_usuario=eq.${encodeURIComponent(idUsuario)}&select=*`)
  if (!consulta.ok) throw new Error('consulta_pix_falhou')
  const [pedido] = await consulta.json() as PedidoPix[]
  if (!pedido) throw new Error('pedido_pix_nao_encontrado')
  if (!pedido.pagamento_id) return { pedido, status: pedido.status }
  const pagamento = await consultarPagamento(Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!, pedido.pagamento_id)
  return sincronizarPix(pagamento)
}

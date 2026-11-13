/*
 * Recibo eletrônico (13/11/2026, Condições da Assinatura, item 2.3). Sem React, para testar
 * (fixtures/testar_recibo.mjs). O recebedor é pessoa física; quando houver CNPJ, os dados de RECEBEDOR mudam e o
 * recibo dá lugar à nota fiscal de serviço.
 */

/** Quem recebe: os mesmos dados da Cláusula 1.1 das Condições da Assinatura. */
export const RECEBEDOR = {
  nome: 'Tales Roberto Siqueira Nascimento',
  documento: 'CPF 027.298.132-09',
  endereco: 'Rua Alderico Bandeira de Lima, nº 1302, Edifício Zacarias, CEP 83430-000',
} as const

/** Uma linha de meus_recibos() (supabase/migrations/20261113031000_meus_recibos.sql). */
export interface Pagamento {
  id_pagamento: string
  plano: string
  meio: 'pix' | 'cartao' | string
  valor: number | string | null
  em: string | null
  situacao: 'paga' | 'reembolsada' | string
}

const NOMES_PLANO: Record<string, string> = { mensal: 'Plano mensal (1 mês)', semestral: 'Plano semestral (6 meses)', anual: 'Plano anual (12 meses)' }
const NOMES_MEIO: Record<string, string> = { pix: 'Pix', cartao: 'Cartão de crédito' }

export const nomePlano = (plano: string) => NOMES_PLANO[plano] ?? `Plano ${plano}`
export const nomeMeio = (meio: string) => NOMES_MEIO[meio] ?? meio

/** "R$ 209,40", ou null quando o valor não veio. */
export function valorEmReais(valor: Pagamento['valor']): string | null {
  const n = typeof valor === 'string' ? Number(valor) : valor
  if (n === null || n === undefined || !Number.isFinite(n) || n <= 0) return null
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Data do pagamento no fuso de Brasília ("13/11/2026"). */
export function dataDoPagamento(em: string | null): string | null {
  if (!em) return null
  const d = new Date(em)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

/** Número do recibo: estável para o mesmo pagamento (meio + id do Mercado Pago). */
export const numeroRecibo = (p: Pick<Pagamento, 'meio' | 'id_pagamento'>) => `OQ-${p.meio === 'pix' ? 'PIX' : 'CC'}-${p.id_pagamento}`

/** Só pagamentos aprovados geram recibo; reembolsados ficam listados como tal, sem recibo. */
export const temRecibo = (p: Pagamento) => p.situacao === 'paga' && Boolean(valorEmReais(p.valor)) && Boolean(dataDoPagamento(p.em))

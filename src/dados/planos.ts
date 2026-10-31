// Valores cobrados por período. Os mesmos números aparecem por extenso nos
// Termos e nas Condições da Assinatura e, em centavos, nas Edge Functions
// (supabase/functions/_shared/precos.ts): mudar aqui exige mudar lá também.
//
// Reajuste (Tales, 31/10/2026): escada de R$ 5 por mês, 39,90 / 34,90 / 29,90. Os totais
// ficam quebrados de propósito: o número grande do cartão é o valor por mês. Quem já pagou
// antes do reajuste mantém o preço antigo para sempre (PLANOS_PRECO_ANTIGO).
export const MENSAL = 39.9
const SEMESTRAL = 209.4
const ANUAL = 358.8
const SEMESTRAL_ANTIGO = 179.9
const ANUAL_ANTIGO = 239.9

export interface Plano { id: 'mensal' | 'semestral' | 'anual'; nome: string; total: number; meses: number; destaque: boolean; chamada: string }

/** "pela metade do preço" só enquanto for verdade: mudar um dos preços ajusta o texto. */
export function economiaAnual(anual: number) {
  const desconto = 1 - anual / 12 / MENSAL
  return Math.abs(desconto - 0.5) < 0.03 ? 'metade do preço' : `${Math.round(desconto * 100)}% mais barato`
}
export const ECONOMIA_ANUAL = economiaAnual(ANUAL)

function montarPlanos(semestral: number, anual: number): readonly [Plano, Plano, Plano] {
  const economia = economiaAnual(anual)
  return [
    { id: 'mensal', nome: 'Mensal', total: MENSAL, meses: 1, destaque: false, chamada: 'Para testar o ritmo sem compromisso longo.' },
    { id: 'semestral', nome: 'Semestral', total: semestral, meses: 6, destaque: false, chamada: 'Um ciclo inteiro de preparação para a prova.' },
    { id: 'anual', nome: 'Anual', total: anual, meses: 12, destaque: true, chamada: economia === 'metade do preço' ? 'O ano todo de estudo pela metade do preço.' : `O ano todo de estudo, ${economia} que o mensal.` },
  ]
}
export const PLANOS = montarPlanos(SEMESTRAL, ANUAL)
/** Os preços de quem já assinava antes do reajuste (função meu_preco_antigo no Supabase). */
export const PLANOS_PRECO_ANTIGO = montarPlanos(SEMESTRAL_ANTIGO, ANUAL_ANTIGO)

/**
 * Preço de abertura (Tales, 31/10/2026): o aviso de que o semestral e o anual vão subir.
 * Desligado no reajuste.
 */
export const PRECO_DE_ABERTURA = false

export const real = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** O plano de menor custo por dia, para comparação: a cobrança é por período. */
export const PLANO_MAIS_EM_CONTA = PLANOS.reduce((melhor, plano) => plano.total / plano.meses < melhor.total / melhor.meses ? plano : melhor)
/** "a partir de R$ 29,90/mês": o menor preço por mês, derivado dos planos (antes digitado em 4 lugares). */
export const A_PARTIR_DE = real(PLANO_MAIS_EM_CONTA.total / PLANO_MAIS_EM_CONTA.meses)
export const CUSTO_POR_DIA = Math.ceil((PLANO_MAIS_EM_CONTA.total / (PLANO_MAIS_EM_CONTA.meses * 365 / 12)) * 100) / 100

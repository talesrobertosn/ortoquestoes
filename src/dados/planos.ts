// Valores cobrados por período. Os mesmos números aparecem por extenso nos
// Termos e nas Condições da Assinatura e, em centavos, nas Edge Functions
// (supabase/functions/_shared/precos.ts): mudar aqui exige mudar lá também.
//
// Reajuste (Tales, 31/10/2026): escada de R$ 5 por mês, 39,90 / 34,90 / 29,90. Os totais
// ficam quebrados de propósito: o número grande do cartão é o valor por mês. Quem já pagava
// antes do reajuste mantém o preço antigo do plano que pagava (PLANOS_PRECO_ANTIGO) enquanto
// continuar assinando, com DIAS_PARA_RENOVAR dias para renovar depois que o plano acaba (Tales, 03/11/2026).
export const MENSAL = 39.9
const SEMESTRAL = 209.4
const ANUAL = 358.8
const SEMESTRAL_ANTIGO = 179.9
const ANUAL_ANTIGO = 239.9
/** Dias depois do fim do plano em que ainda dá para renovar pelo preço antigo (o mesmo número da função preco_antigo_ate no Supabase). */
export const DIAS_PARA_RENOVAR = 30

export interface Plano { id: 'mensal' | 'semestral' | 'anual'; nome: string; total: number; meses: number; destaque: boolean; chamada: string }

/** "pela metade do preço" só enquanto for verdade: mudar um dos preços ajusta o texto. */
export function economiaAnual(anual: number) {
  const desconto = 1 - anual / 12 / MENSAL
  return Math.abs(desconto - 0.5) < 0.03 ? 'metade do preço' : `${Math.round(desconto * 100)}% mais barato`
}
export const ECONOMIA_ANUAL = economiaAnual(ANUAL)

// Destaque no anual desde 13/11/2026 (Tales; antes, no mensal): é o melhor preço por mês. Os três planos
// dizem que custam menos que uma pizza por mês, o que é verdade: de R$ 29,90 a R$ 39,90 contra R$ 50 a 70
// de uma pizza média no delivery. Os descontos do semestral e do anual continuam à mostra, com a conta certa.
function montarPlanos(semestral: number, anual: number): readonly [Plano, Plano, Plano] {
  const economia = economiaAnual(anual)
  return [
    { id: 'mensal', nome: 'Mensal', total: MENSAL, meses: 1, destaque: false, chamada: 'Prepare-se para o TEOT por menos que uma pizza por mês.' },
    { id: 'semestral', nome: 'Semestral', total: semestral, meses: 6, destaque: false, chamada: 'Seis meses de estudo, pagos de uma vez, por menos que uma pizza por mês.' },
    { id: 'anual', nome: 'Anual', total: anual, meses: 12, destaque: true, chamada: economia === 'metade do preço' ? 'O melhor preço: o ano todo, pago de uma vez, pela metade do preço do mensal.' : `O melhor preço: o ano todo, pago de uma vez, ${economia} que o mensal.` },
  ]
}
export const PLANOS = montarPlanos(SEMESTRAL, ANUAL)
/** Os preços de quem já assinava antes do reajuste (função meus_precos_antigos no Supabase). */
export const PLANOS_PRECO_ANTIGO = montarPlanos(SEMESTRAL_ANTIGO, ANUAL_ANTIGO)

/**
 * Preço de inauguração (Tales, 31/10/2026; religado em 03/11/2026 com os valores novos): o aviso,
 * abaixo dos planos, de que estes preços ainda são de inauguração e que quem assina agora guarda
 * o valor enquanto renovar. Promessa a cumprir no próximo reajuste: quem já assina mantém o preço
 * do plano que paga (como em PLANOS_PRECO_ANTIGO e na função tem_preco_antigo).
 */
export const PRECO_DE_ABERTURA = true

export const real = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** O plano de menor custo por mês, para o "a partir de": a cobrança é por período. */
export const PLANO_MAIS_EM_CONTA = PLANOS.reduce((melhor, plano) => plano.total / plano.meses < melhor.total / melhor.meses ? plano : melhor)
/** "a partir de R$ 29,90/mês": o menor preço por mês, derivado dos planos (antes digitado em 4 lugares). */
export const A_PARTIR_DE = real(PLANO_MAIS_EM_CONTA.total / PLANO_MAIS_EM_CONTA.meses)

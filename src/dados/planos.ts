// Valores cobrados por período. Os mesmos números aparecem por extenso nos
// Termos e nas Condições da Assinatura: mudar aqui exige mudar lá também.
export const MENSAL = 39.9
const ANUAL = 239.9
/** "pela metade do preço" só enquanto for verdade: mudar um dos preços ajusta o texto. */
const DESCONTO_ANUAL = 1 - ANUAL / 12 / MENSAL
export const ECONOMIA_ANUAL = Math.abs(DESCONTO_ANUAL - 0.5) < 0.03 ? 'metade do preço' : `${Math.round(DESCONTO_ANUAL * 100)}% mais barato`
export const PLANOS = [
  { id: 'mensal', nome: 'Mensal', total: 39.9, meses: 1, destaque: false, chamada: 'Para testar o ritmo sem compromisso longo.' },
  { id: 'semestral', nome: 'Semestral', total: 179.9, meses: 6, destaque: false, chamada: 'Um ciclo inteiro de preparação para a prova.' },
  { id: 'anual', nome: 'Anual', total: ANUAL, meses: 12, destaque: true, chamada: ECONOMIA_ANUAL === 'metade do preço' ? 'O ano todo de estudo pela metade do preço.' : `O ano todo de estudo, ${ECONOMIA_ANUAL} que o mensal.` },
] as const

/**
 * Preço de abertura (Tales, 31/10/2026): o semestral e o anual vão subir para quem ainda não assina,
 * e quem assinar antes mantém o valor nas renovações. Desligar no dia do reajuste.
 */
export const PRECO_DE_ABERTURA = true

export const real = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** O plano de menor custo por dia, para comparação: a cobrança é por período. */
export const PLANO_MAIS_EM_CONTA = PLANOS.reduce((melhor, plano) => plano.total / plano.meses < melhor.total / melhor.meses ? plano : melhor)
/** "a partir de R$ 19,99/mês": o menor preço por mês, derivado dos planos (antes digitado em 4 lugares). */
export const A_PARTIR_DE = real(PLANO_MAIS_EM_CONTA.total / PLANO_MAIS_EM_CONTA.meses)
export const CUSTO_POR_DIA = Math.ceil((PLANO_MAIS_EM_CONTA.total / (PLANO_MAIS_EM_CONTA.meses * 365 / 12)) * 100) / 100

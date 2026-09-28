// Valores cobrados por período. Os mesmos números aparecem por extenso nos
// Termos e nas Condições da Assinatura: mudar aqui exige mudar lá também.
export const MENSAL = 39.9
export const PLANOS = [
  { id: 'mensal', nome: 'Mensal', total: 39.9, meses: 1, destaque: false, chamada: 'Para testar o ritmo sem compromisso longo.' },
  { id: 'semestral', nome: 'Semestral', total: 179.9, meses: 6, destaque: false, chamada: 'Um ciclo inteiro de preparação para a prova.' },
  { id: 'anual', nome: 'Anual', total: 239.9, meses: 12, destaque: true, chamada: 'O ano todo de estudo pela metade do preço.' },
] as const

export const real = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** O plano de menor custo por dia, para comparação: a cobrança é por período. */
export const PLANO_MAIS_EM_CONTA = PLANOS.reduce((melhor, plano) => plano.total / plano.meses < melhor.total / melhor.meses ? plano : melhor)
export const CUSTO_POR_DIA = Math.ceil((PLANO_MAIS_EM_CONTA.total / (PLANO_MAIS_EM_CONTA.meses * 365 / 12)) * 100) / 100

/** Contagens abaixo de dez vão por extenso, como nos e-mails (docs/emails/TOM.md). */
const FEMININO = ['nenhuma', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
const MASCULINO = ['nenhum', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']

export function porExtenso(n: number, genero: 'f' | 'm' = 'f'): string {
  return Number.isInteger(n) && n >= 0 && n < 10 ? (genero === 'f' ? FEMININO : MASCULINO)[n] : String(n)
}

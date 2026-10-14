export type EstacaoBiblioteca = 'verao' | 'outono' | 'inverno' | 'inverno-neve' | 'primavera'

/** Calendário decorativo do hemisfério sul; julho traz neve de fantasia. */
export function estacaoBiblioteca(data: Date): EstacaoBiblioteca {
  const mes = data.getMonth()
  if (mes >= 2 && mes <= 4) return 'outono'
  if (mes >= 5 && mes <= 7) return mes === 6 ? 'inverno-neve' : 'inverno'
  if (mes >= 8 && mes <= 10) return 'primavera'
  return 'verao'
}

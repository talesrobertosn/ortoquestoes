import { useEffect, useState } from 'react'
import { EVENTO_APARENCIA, lerCenario, type Cenario } from './aparencia'

const CENAS = {
  manha: 'cena-manha-960.webp',
  tarde: 'cena-cais-manha-960.webp',
  entardecer: 'cena-cais-tarde-960.webp',
  noite: 'cena-observatorio-noite-960.webp',
} as const
const horaBrasilia = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' })

/** Quatro momentos no automático; a escolha fixa de aparência continua valendo. */
export function paisagemTreinar(agora = new Date(), cenario: Cenario = 'horario'): string {
  const hora = Number(horaBrasilia.format(agora))
  const momento = cenario !== 'horario' ? cenario
    : hora >= 5 && hora < 12 ? 'manha'
    : hora >= 12 && hora < 17 ? 'tarde'
    : hora >= 17 && hora < 19 ? 'entardecer' : 'noite'
  // A opção fixa "tarde" do site representa o pôr do sol.
  return CENAS[cenario === 'tarde' ? 'entardecer' : momento]
}

export function usarPaisagemTreinar(): string {
  const atual = () => paisagemTreinar(new Date(), lerCenario())
  const [paisagem, definir] = useState(atual)
  useEffect(() => {
    const atualizar = () => definir(atual())
    const aoVoltar = () => { if (!document.hidden) atualizar() }
    const intervalo = window.setInterval(aoVoltar, 60_000)
    window.addEventListener(EVENTO_APARENCIA, atualizar)
    window.addEventListener('focus', atualizar)
    document.addEventListener('visibilitychange', aoVoltar)
    atualizar()
    return () => {
      window.clearInterval(intervalo)
      window.removeEventListener(EVENTO_APARENCIA, atualizar)
      window.removeEventListener('focus', atualizar)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [])
  return paisagem
}

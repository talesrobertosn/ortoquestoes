import { useEffect, useState } from 'react'
import { hojeBR, msAteAmanha } from './dia'

const chaveHoje = () => hojeBR()

/**
 * A data de hoje (dia de São Paulo, src/util/dia.ts) como chave que muda à meia-noite e ao
 * voltar para a aba. Serve de dependência para cálculos presos ao dia: sem ela,
 * uma aba aberta de um dia para o outro mostrava a meta e a lista de ontem.
 */
export function usarDiaAtual(): string {
  const [dia, definirDia] = useState(chaveHoje)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const conferir = () => definirDia(chaveHoje())
    const agendar = () => {
      timer = setTimeout(() => { conferir(); agendar() }, msAteAmanha() + 5000)
    }
    agendar()
    document.addEventListener('visibilitychange', conferir)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', conferir) }
  }, [])
  return dia
}

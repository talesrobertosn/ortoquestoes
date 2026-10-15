import { useEffect, useState } from 'react'

const chaveHoje = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }

/**
 * A data de hoje (no relógio do aparelho) como chave que muda à meia-noite e ao
 * voltar para a aba. Serve de dependência para cálculos presos ao dia: sem ela,
 * uma aba aberta de um dia para o outro mostrava a meta e a lista de ontem.
 */
export function usarDiaAtual(): string {
  const [dia, definirDia] = useState(chaveHoje)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const conferir = () => definirDia(chaveHoje())
    const agendar = () => {
      const agora = new Date()
      const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 0, 0, 5)
      timer = setTimeout(() => { conferir(); agendar() }, amanha.getTime() - agora.getTime())
    }
    agendar()
    document.addEventListener('visibilitychange', conferir)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', conferir) }
  }, [])
  return dia
}

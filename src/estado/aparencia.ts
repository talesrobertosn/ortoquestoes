import { useEffect, useState } from 'react'
import { gravar, ler } from './armazenamento'

/**
 * Aparência (pedido do Tales, 30/10/2026): o cenário pintado das páginas e a cor da interface são escolhas
 * separadas. O cenário segue a hora do dia (manhã, pôr do sol, noite) ou fica fixo num período; a interface
 * (clara ou escura) fica em estado/tema.ts, que também pode seguir o horário. Muita gente estuda à noite e quer o
 * cenário noturno lendo em fundo claro, ou o contrário.
 */
export type Periodo = 'manha' | 'tarde' | 'noite'
export type Cenario = 'horario' | Periodo

export const EVENTO_APARENCIA = 'ortoquestoes:aparencia'
const CHAVE = 'cenario'

/** Manhã das 5h às 12h, tarde até as 18h, noite no resto (hora de Brasília). */
export function periodoAgora(d = new Date()): Periodo {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' }).format(d))
  return h >= 5 && h < 12 ? 'manha' : h >= 12 && h < 18 ? 'tarde' : 'noite'
}

export function lerCenario(): Cenario {
  const c = ler<Cenario>(CHAVE, 'horario')
  return c === 'manha' || c === 'tarde' || c === 'noite' ? c : 'horario'
}

export function trocarCenario(c: Cenario) {
  gravar(CHAVE, c)
  window.dispatchEvent(new CustomEvent(EVENTO_APARENCIA))
}

export function periodoDoCenario(c: Cenario = lerCenario()): Periodo {
  return c === 'horario' ? periodoAgora() : c
}

/** O período que os cenários pintados mostram agora; muda sozinho com a hora e quando a pessoa troca a escolha. */
export function usarPeriodo(): Periodo {
  const [p, definir] = useState<Periodo>(() => periodoDoCenario())
  useEffect(() => {
    const atualizar = () => definir(periodoDoCenario())
    const id = window.setInterval(atualizar, 300_000)
    window.addEventListener(EVENTO_APARENCIA, atualizar)
    return () => { window.clearInterval(id); window.removeEventListener(EVENTO_APARENCIA, atualizar) }
  }, [])
  return p
}

export function usarCenario(): [Cenario, (c: Cenario) => void] {
  const [c, definir] = useState<Cenario>(lerCenario)
  useEffect(() => {
    const atualizar = () => definir(lerCenario())
    window.addEventListener(EVENTO_APARENCIA, atualizar)
    return () => window.removeEventListener(EVENTO_APARENCIA, atualizar)
  }, [])
  return [c, trocarCenario]
}

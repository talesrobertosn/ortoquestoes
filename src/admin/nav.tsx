import { createContext, useContext } from 'react'
import type { EstadoUrl, Parte } from './rotas'

/**
 * Navegação do painel 3.0. Trocar de parte cria entrada no histórico (Voltar volta);
 * filtro, vista, questão e período dentro da mesma parte só substituem o endereço.
 * A ficha de uma pessoa abre por cima de qualquer parte (gaveta), sem perder a lista.
 */
export interface Nav {
  estado: EstadoUrl
  ir: (parte: Parte, extra?: Partial<Omit<EstadoUrl, 'parte'>>) => void
  ajustar: (extra: Partial<Omit<EstadoUrl, 'parte'>>) => void
  link: (parte: Parte, extra?: Partial<Omit<EstadoUrl, 'parte'>>) => string
  abrirPessoa: (idUsuario: string, aba?: AbaFicha) => void
  abrirPaleta: () => void
}
export type AbaFicha = 'resumo' | 'atividade' | 'assinatura' | 'carta' | 'acoes'

export const ContextoNav = createContext<Nav | null>(null)
export const usarNav = () => { const n = useContext(ContextoNav); if (!n) throw new Error('usarNav fora do painel'); return n }

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { usarArmazenado } from '../../estado/usarArmazenado'
import { CHAVE_AJUSTES } from '../progresso'
const ContextoMovimento = createContext(false)
export const usarMovimentoVisualReduzido = () => useContext(ContextoMovimento)
export interface PreferenciasVisuais { semTremor?: boolean; altoContraste?: boolean; textoMaior?: boolean; efeitos?: 'completos' | 'reduzidos' }
export function usarReducaoSistema() {
 const [reduzir,definir]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)
 useEffect(()=>{const mq=window.matchMedia('(prefers-reduced-motion: reduce)');const mudar=()=>definir(mq.matches);mq.addEventListener('change',mudar);return()=>mq.removeEventListener('change',mudar)},[])
 return reduzir
}
export function usarPreferenciasVisuais() {
 const [prefs]=usarArmazenado<PreferenciasVisuais>(CHAVE_AJUSTES,{})
 const sistema=usarReducaoSistema()
 return {...prefs,movimentoReduzido:sistema||prefs.efeitos==='reduzidos'}
}
/** Preferências compartilhadas pelas telas do jogo; não mudam a questão nem as regras. */
export function AparenciaFlashcards({children}:{children:ReactNode}){
 const p=usarPreferenciasVisuais()
 const classes=['fc-acessibilidade',p.semTremor?'fc-acessibilidade--sem-tremor':'',p.altoContraste?'fc-acessibilidade--contraste':'',p.textoMaior?'fc-acessibilidade--texto-maior':'',p.movimentoReduzido?'fc-acessibilidade--movimento-reduzido':''].filter(Boolean).join(' ')
 return <ContextoMovimento.Provider value={p.movimentoReduzido}><div className={classes}>{children}</div></ContextoMovimento.Provider>
}

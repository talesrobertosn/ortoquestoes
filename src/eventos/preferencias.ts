/** Preferência deste aparelho, fora dos documentos sincronizados de estudo. */
import { useEffect, useState } from 'react'
const CHAVE = 'oq:eventos:ligados:v1'
export const AVISO_EVENTOS = 'oq:eventos:preferencia'
let memoria = true
let somenteMemoria = false
export function eventosLigados() {
  if (somenteMemoria) return memoria
  try { return localStorage.getItem(CHAVE) !== '0' } catch { return memoria }
}
export function definirEventos(ligados: boolean) {
  memoria = ligados
  try { localStorage.setItem(CHAVE, ligados ? '1' : '0') } catch { somenteMemoria = true }
  window.dispatchEvent(new Event(AVISO_EVENTOS))
}
export function usarEventosLigados() {
  const [ligados, definir] = useState(eventosLigados)
  useEffect(() => {
    const atualizar = () => definir(eventosLigados())
    window.addEventListener(AVISO_EVENTOS, atualizar); window.addEventListener('storage', atualizar)
    return () => { window.removeEventListener(AVISO_EVENTOS, atualizar); window.removeEventListener('storage', atualizar) }
  }, [])
  return [ligados, definirEventos] as const
}

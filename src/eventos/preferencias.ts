/** Preferência deste aparelho, fora dos documentos sincronizados de estudo. */
import { useEffect, useState } from 'react'
import { CHAVE_AVISOS } from '../conquistas/chaves'
import { gravar, ler } from '../estado/armazenamento'
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
  if (!ligados) {
    const salvo = ler<Record<string, unknown> | null>(CHAVE_AVISOS, null)
    if (salvo && typeof salvo === 'object' && !Array.isArray(salvo)) gravar(CHAVE_AVISOS, { ...salvo, pendentes: [], silenciado: true }, 'nuvem')
  }
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


const CHAVE_METAS = 'oq:conquistas:metas:v1'
let metasNaMemoria = true
export function metasLigadas(): boolean {
  if (!eventosLigados()) return false
  try { return localStorage.getItem(CHAVE_METAS) !== '0' } catch { return metasNaMemoria }
}
export function definirMetas(ligadas: boolean) {
  metasNaMemoria = ligadas
  try { localStorage.setItem(CHAVE_METAS, ligadas ? '1' : '0') } catch { /* preferência na memória */ }
  window.dispatchEvent(new Event(AVISO_EVENTOS))
}
export function usarMetasLigadas() {
  const [ligadas, definir] = useState(metasLigadas)
  useEffect(() => {
    const atualizar = () => definir(metasLigadas())
    window.addEventListener(AVISO_EVENTOS, atualizar); window.addEventListener('storage', atualizar)
    return () => { window.removeEventListener(AVISO_EVENTOS, atualizar); window.removeEventListener('storage', atualizar) }
  }, [])
  return [ligadas, definirMetas] as const
}

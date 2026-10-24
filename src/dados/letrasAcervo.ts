import { useEffect, useState } from 'react'
import { recurso } from '../config'
import type { LetrasAcervo } from './ordemAlternativas'

/**
 * public/acervo/letras.json (gerado por scripts/letras_alternativas.py): quais
 * questões ficam na ordem da prova e onde cada comentário cita uma alternativa
 * pela letra. Baixado uma vez; se falhar, nada é embaralhado.
 */
let promessa: Promise<LetrasAcervo | null> | null = null
let pronto: LetrasAcervo | null | undefined

export function carregarLetrasAcervo(): Promise<LetrasAcervo | null> {
  promessa ??= fetch(recurso('acervo/letras.json'), { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<LetrasAcervo>) : null))
    .then((dados) => (dados && dados.fixas && dados.refs && Array.isArray(dados.numeros) ? dados : null))
    .catch(() => null)
    .then((dados) => { pronto = dados; return dados })
  return promessa
}

/** undefined enquanto carrega; null se não veio (aí nada embaralha). */
export function usarLetrasAcervo(): LetrasAcervo | null | undefined {
  const [letras, definir] = useState<LetrasAcervo | null | undefined>(pronto)
  useEffect(() => {
    if (pronto !== undefined) { definir(pronto); return }
    let vivo = true
    void carregarLetrasAcervo().then((d) => vivo && definir(d))
    return () => { vivo = false }
  }, [])
  return letras
}

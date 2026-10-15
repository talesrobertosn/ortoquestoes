import { useCallback, useEffect, useRef } from 'react'

/**
 * Tempo gasto em cada questão, só enquanto a página está visível. Fica
 * acumulado por chave (a questão dentro da sessão) enquanto o site estiver
 * aberto: voltar para uma questão continua de onde parou, e a aba em segundo
 * plano não conta.
 */
const acumulado = new Map<string, number>()

export interface Relogio {
  /** Passa a contar para outra chave (guarda o que a anterior já tinha). */
  trocar(chave: string, visivel: boolean): void
  pausar(): void
  retomar(): void
  /** Milissegundos acumulados na chave atual, incluindo o trecho em andamento. */
  ms(): number
}

export function criarRelogio(agora: () => number = Date.now, guardado: Map<string, number> = acumulado): Relogio {
  let chave = ''
  let desde: number | null = null
  const relogio: Relogio = {
    trocar(nova, visivel) {
      relogio.pausar()
      if (guardado.size > 5000) guardado.clear()
      chave = nova
      if (visivel) relogio.retomar()
    },
    pausar() {
      if (desde === null) return
      if (chave) guardado.set(chave, (guardado.get(chave) ?? 0) + Math.max(0, agora() - desde))
      desde = null
    },
    retomar() {
      if (desde === null && chave) desde = agora()
    },
    ms() {
      return (guardado.get(chave) ?? 0) + (desde !== null ? Math.max(0, agora() - desde) : 0)
    },
  }
  return relogio
}

const paginaVisivel = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'

/** Devolve uma função que lê os segundos (no mínimo 1) gastos na chave atual. */
export function usarTempoVisivel(chave: string): () => number {
  const relogio = useRef<Relogio | null>(null)
  relogio.current ??= criarRelogio()
  useEffect(() => {
    const r = relogio.current!
    r.trocar(chave, paginaVisivel())
    const aoMudarVisibilidade = () => (paginaVisivel() ? r.retomar() : r.pausar())
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      r.pausar()
    }
  }, [chave])
  return useCallback(() => Math.max(1, Math.round(relogio.current!.ms() / 1000)), [])
}

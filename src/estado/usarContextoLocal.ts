import { useEffect, useMemo, useState } from 'react'
import { carregarBusca, type ContextoLocal } from '../dados/acervo'
import { lerRespondidas, usarFavoritos } from './sessao'

/**
 * Reúne o que este navegador sabe sobre quem estuda — o que já foi respondido
 * e o que está favoritado — e, só quando há busca por texto, o índice de
 * palavras. Esse índice pesa e a maioria das visitas nunca busca, então ele é
 * baixado sob demanda.
 */
export function usarContextoLocal(busca: string) {
  const { favoritos } = usarFavoritos()
  const respondidas = useMemo(() => lerRespondidas(), [])
  const [textos, definirTextos] = useState<Map<string, string> | null>(null)
  const precisa = busca.trim().length > 0

  useEffect(() => {
    if (!precisa || textos) return
    let vivo = true
    carregarBusca().then((mapa) => vivo && definirTextos(mapa))
    return () => {
      vivo = false
    }
  }, [precisa, textos])

  const contexto: ContextoLocal = useMemo(
    () => ({ respondidas, favoritos, textos }),
    [respondidas, favoritos, textos],
  )

  return { contexto, carregandoBusca: precisa && !textos }
}

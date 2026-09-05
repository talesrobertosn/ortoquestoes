import { useEffect, useState } from 'react'

/** Acompanha uma media query, para variar a interface por tamanho de tela. */
export function usarMedia(consulta: string): boolean {
  const [combina, definir] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(consulta).matches,
  )

  useEffect(() => {
    const lista = window.matchMedia(consulta)
    const aoMudar = (evento: MediaQueryListEvent) => definir(evento.matches)
    definir(lista.matches)
    lista.addEventListener('change', aoMudar)
    return () => lista.removeEventListener('change', aoMudar)
  }, [consulta])

  return combina
}

import { useEffect, useState } from 'react'
import { carregarIndice } from './acervo'
import type { Indice } from './tipos'

export function usarIndice() {
  const [indice, definirIndice] = useState<Indice | null>(null)
  const [erro, definirErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    carregarIndice()
      .then((dados) => vivo && definirIndice(dados))
      .catch((e) => vivo && definirErro(String(e)))
    return () => {
      vivo = false
    }
  }, [])

  return { indice, erro, carregando: !indice && !erro }
}

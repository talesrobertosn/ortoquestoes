import { useEffect, useState } from 'react'
import { carregarIndice } from './acervo'
import type { Indice } from './tipos'

export function usarIndice(ativo = true) {
  const [indice, definirIndice] = useState<Indice | null>(null)
  const [erro, definirErro] = useState<string | null>(null)

  useEffect(() => {
    if (!ativo) return
    let vivo = true
    carregarIndice()
      .then((dados) => vivo && definirIndice(dados))
      .catch((e) => vivo && definirErro(String(e)))
    return () => {
      vivo = false
    }
  }, [ativo])

  return { indice, erro, carregando: !indice && !erro }
}

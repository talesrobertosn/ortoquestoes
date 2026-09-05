import { useCallback, useEffect, useState } from 'react'
import { gravar, ler, remover } from './armazenamento'

export type Tema = 'claro' | 'escuro' | 'sistema'

function aplicar(tema: Tema) {
  const raiz = document.documentElement
  if (tema === 'sistema') delete raiz.dataset.tema
  else raiz.dataset.tema = tema
}

export function usarTema() {
  const [tema, definir] = useState<Tema>(() => ler<Tema>('tema', 'sistema'))

  useEffect(() => {
    aplicar(tema)
  }, [tema])

  const trocar = useCallback((proximo: Tema) => {
    if (proximo === 'sistema') remover('tema')
    else gravar('tema', proximo)
    definir(proximo)
  }, [])

  /** Alterna entre claro e escuro a partir do que está na tela. */
  const alternar = useCallback(() => {
    const escuroAgora =
      document.documentElement.dataset.tema === 'escuro' ||
      (!document.documentElement.dataset.tema &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    trocar(escuroAgora ? 'claro' : 'escuro')
  }, [trocar])

  return { tema, trocar, alternar }
}

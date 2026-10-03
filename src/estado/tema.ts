import { useCallback, useEffect, useState } from 'react'
import { gravar, ler, remover } from './armazenamento'

export type Tema = 'claro' | 'escuro' | 'sistema'

const COR_BARRA: Record<'claro' | 'escuro', string> = { claro: '#F1F3F2', escuro: '#101615' }

function aplicar(tema: Tema) {
  const raiz = document.documentElement
  if (tema === 'sistema') delete raiz.dataset.tema
  else raiz.dataset.tema = tema
  const efetivo = tema === 'claro' ? 'claro' : 'escuro'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[efetivo])
}

export function usarTema() {
  // O site abre no tema escuro. Só quem escolheu o claro (em Minha conta ou
  // no botão do cabeçalho) fica no claro, e essa escolha vale para sempre.
  const [tema, definir] = useState<Tema>(() => {
    const salvo = ler<Tema>('tema', 'escuro')
    return salvo === 'claro' ? 'claro' : 'escuro'
  })

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

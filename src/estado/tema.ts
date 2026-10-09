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
  // Quem escolheu um tema (em Minha conta ou no botão do cabeçalho) fica nele
  // para sempre. Sem escolha, vale o sorteio feito no index.html antes da
  // primeira pintura (claro ou escuro a cada visita), que não é gravado.
  const [tema, definir] = useState<Tema>(() => {
    const salvo = ler<Tema | null>('tema', null)
    if (salvo === 'claro' || salvo === 'escuro') return salvo
    return document.documentElement.dataset.tema === 'claro' ? 'claro' : 'escuro'
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

import { useCallback, useEffect, useState } from 'react'
import { gravar, ler } from './armazenamento'
import { periodoAgora } from './aparencia'

/** 'horario': clara de dia e escura à noite (das 18h às 5h, hora de Brasília), com o cenário. */
export type Tema = 'claro' | 'escuro' | 'sistema' | 'horario'

const COR_BARRA: Record<'claro' | 'escuro', string> = { claro: '#F1F3F2', escuro: '#101615' }

const ESCURO_NO_APARELHO = '(prefers-color-scheme: dark)'

/**
 * "Sistema" segue o aparelho. Antes o atributo era apagado e o CSS não tinha
 * regra para isso, então "sistema" ficava sempre claro, mesmo no celular escuro.
 */
function aplicar(tema: Tema) {
  const raiz = document.documentElement
  const efetivo = tema === 'sistema' ? (window.matchMedia(ESCURO_NO_APARELHO).matches ? 'escuro' : 'claro')
    : tema === 'horario' ? (periodoAgora() === 'noite' ? 'escuro' : 'claro') : tema
  raiz.dataset.tema = efetivo
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[efetivo])
}

export function usarTema() {
  // Quem escolheu um tema (em Minha conta ou no botão do cabeçalho) fica nele
  // para sempre. Sem escolha, vale o claro, aplicado no index.html antes da
  // primeira pintura.
  const [tema, definir] = useState<Tema>(() => {
    const salvo = ler<Tema | null>('tema', null)
    if (salvo === 'claro' || salvo === 'escuro' || salvo === 'horario' || salvo === 'sistema') return salvo
    return document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro'
  })

  useEffect(() => {
    aplicar(tema)
    if (tema === 'horario') {
      const id = window.setInterval(() => aplicar('horario'), 300_000)
      return () => window.clearInterval(id)
    }
    if (tema !== 'sistema') return
    const aparelho = window.matchMedia(ESCURO_NO_APARELHO)
    const mudou = () => aplicar('sistema')
    aparelho.addEventListener('change', mudou)
    return () => aparelho.removeEventListener('change', mudou)
  }, [tema])

  const trocar = useCallback((proximo: Tema) => {
    gravar('tema', proximo)
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

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icone } from './Icone'

/** Verdadeiro em telas largas (computador), onde cabe uma janela no meio da tela. */
export function usarTelaLarga(minimo = '60rem') {
  const consulta = `(min-width: ${minimo})`
  const [larga, definirLarga] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches)
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const mudar = () => definirLarga(mq.matches)
    mudar()
    mq.addEventListener('change', mudar)
    return () => mq.removeEventListener('change', mudar)
  }, [consulta])
  return larga
}

/**
 * Janela grande no meio da tela, com fundo escurecido e um X fácil de achar.
 * Fecha com Esc, com o X ou clicando fora; prende o foco enquanto aberta.
 */
export function JanelaCentral({ aberta, aoFechar, rotulo, children, className = '' }: { aberta: boolean; aoFechar: () => void; rotulo: string; children: ReactNode; className?: string }) {
  const caixa = useRef<HTMLDivElement>(null)
  const fechar = useRef(aoFechar)
  fechar.current = aoFechar

  useEffect(() => {
    if (!aberta) return
    const anterior = document.activeElement as HTMLElement | null
    const rolagem = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    caixa.current?.querySelector<HTMLElement>('.jc__fechar')?.focus()
    const teclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); fechar.current(); return }
      if (e.key !== 'Tab' || !caixa.current) return
      const focaveis = caixa.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      if (!focaveis.length) return
      const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', teclar, true)
    return () => { document.removeEventListener('keydown', teclar, true); document.body.style.overflow = rolagem; anterior?.focus?.() }
  }, [aberta])

  if (!aberta) return null
  return createPortal(
    <div className="jc" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar() }}>
      <div ref={caixa} className={`jc__caixa ${className}`} role="dialog" aria-modal="true" aria-label={rotulo}>
        <button type="button" className="jc__fechar" onClick={aoFechar} aria-label="Fechar"><Icone nome="fechar" tamanho={26} /></button>
        {children}
      </div>
    </div>,
    document.body,
  )
}

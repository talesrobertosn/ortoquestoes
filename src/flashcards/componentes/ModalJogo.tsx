import { useEffect, useRef, type ReactNode } from 'react'

const FOCAVEIS = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Pop-up do Torneio por cima do site: a página de onde a pessoa veio continua
 * atrás, translúcida (pedido do Tales: não se sentir presa no jogo). Moldura de
 * fantasia, foco preso dentro, rolagem do fundo bloqueada e foco devolvido ao
 * fechar. O X, a tecla Esc e um clique fora do pop-up pedem para fechar (a
 * partida pede confirmação e fica salva) e voltam para o site.
 */
export function ModalJogo({ children, titulo, aoPedirFechar }: { children: ReactNode; titulo: string; aoPedirFechar: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const pedir = useRef(aoPedirFechar)
  pedir.current = aoPedirFechar

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null
    const html = document.documentElement
    const overflow = html.style.overflow
    html.style.overflow = 'hidden'
    document.body.classList.add('fc-modal-aberto')
    const t = window.setTimeout(() => ref.current?.focus({ preventScroll: true }), 30)
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return
      const lista = [...ref.current.querySelectorAll<HTMLElement>(FOCAVEIS)].filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (!lista.length) return
      const primeiro = lista[0], ultimo = lista[lista.length - 1]
      if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === ref.current)) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', aoTeclar)
      html.style.overflow = overflow
      document.body.classList.remove('fc-modal-aberto')
      antes?.focus?.({ preventScroll: true })
    }
  }, [])

  return (
    <div className="fc-modal-veu" onPointerDown={(e) => { if (e.target === e.currentTarget) pedir.current() }}>
      <div className="fc-modal" role="dialog" aria-modal="true" aria-label={titulo} ref={ref} tabIndex={-1}>
        <span className="fc-modal__canto fc-modal__canto--1" aria-hidden="true" /><span className="fc-modal__canto fc-modal__canto--2" aria-hidden="true" />
        <span className="fc-modal__canto fc-modal__canto--3" aria-hidden="true" /><span className="fc-modal__canto fc-modal__canto--4" aria-hidden="true" />
        {children}
        <button type="button" className="fc-fechar" onClick={() => pedir.current()} aria-label="Fechar e voltar ao site" title="Fechar e voltar ao site">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  )
}

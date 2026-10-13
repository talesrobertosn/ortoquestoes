import { useEffect, useRef, type ReactNode } from 'react'

const FOCAVEIS = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Modal imersivo do Torneio, por cima do site: fundo escurecido e desfocado,
 * moldura de fantasia, foco preso dentro, rolagem do fundo bloqueada e foco
 * devolvido ao fechar. Clicar no fundo não fecha (evita perder a partida sem
 * querer); fechar é pelo X ou pela tecla Esc, que passam pela confirmação.
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
    <div className="fc-modal-veu">
      <div className="fc-modal" role="dialog" aria-modal="true" aria-label={titulo} ref={ref} tabIndex={-1}>
        <span className="fc-modal__canto fc-modal__canto--1" aria-hidden="true" /><span className="fc-modal__canto fc-modal__canto--2" aria-hidden="true" />
        <span className="fc-modal__canto fc-modal__canto--3" aria-hidden="true" /><span className="fc-modal__canto fc-modal__canto--4" aria-hidden="true" />
        {children}
        <button type="button" className="fc-fechar" onClick={() => pedir.current()} aria-label="Fechar jogo" title="Fechar jogo">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  )
}

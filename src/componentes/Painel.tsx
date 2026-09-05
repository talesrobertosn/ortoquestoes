import { useEffect, useRef, type ReactNode } from 'react'
import { Icone } from './Icone'

/**
 * Painel lateral no desktop, folha deslizante no celular.
 * Fecha com Esc, devolve o foco a quem abriu e prende o foco enquanto aberto.
 */
export function Painel({
  titulo,
  aberto,
  aoFechar,
  children,
  rodape,
}: {
  titulo: string
  aberto: boolean
  aoFechar: () => void
  children: ReactNode
  rodape?: ReactNode
}) {
  const referencia = useRef<HTMLDivElement>(null)
  const anterior = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!aberto) return
    anterior.current = document.activeElement as HTMLElement | null
    const caixa = referencia.current
    caixa?.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus()

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.stopPropagation()
        aoFechar()
        return
      }
      if (evento.key !== 'Tab' || !caixa) return
      const focaveis = caixa.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focaveis.length === 0) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar, true)
    return () => {
      document.removeEventListener('keydown', aoTeclar, true)
      anterior.current?.focus?.()
    }
  }, [aberto, aoFechar])

  if (!aberto) return null

  return (
    <>
      <button className="veu" aria-label="Fechar painel" onClick={aoFechar} />
      <div className="painel" role="dialog" aria-modal="true" aria-label={titulo} ref={referencia}>
        <div className="painel__topo">
          <h2 className="painel__titulo">{titulo}</h2>
          <button
            type="button"
            className="botao-icone painel__fechar"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            <Icone nome="fechar" />
          </button>
        </div>
        <div className="painel__corpo">{children}</div>
        {rodape && <div className="painel__topo" style={{ borderTop: 'var(--borda)', borderBottom: 0 }}>{rodape}</div>}
      </div>
    </>
  )
}

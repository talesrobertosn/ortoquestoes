import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  rotulo: string
  /** questões precisam de mais altura que a ficha */
  alto?: boolean
  aoFechar: () => void
  children: ReactNode
}

/**
 * Detalhes no celular (27/10/2026): um modal centralizado por cima do modelo, com rolagem própria.
 * Abrir e fechar não mexe no canvas nem na câmera; o X (no cabeçalho do conteúdo), tocar fora,
 * Esc ou arrastar a alça para baixo devolvem a pessoa ao cartão da mesma estrutura.
 */
export function ModalDetalhes({ rotulo, alto, aoFechar, children }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const arraste = useRef<{ y: number; id: number } | null>(null)
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null
    caixa.current?.querySelector<HTMLElement>('button, [href], [tabindex]')?.focus({ preventScroll: true })
    return () => antes?.focus?.({ preventScroll: true })
  }, [])
  const mover = (dy: number) => { if (caixa.current) caixa.current.style.transform = dy > 0 ? `translateY(${dy}px)` : '' }

  return (
    <div className="at-modal" role="presentation">
      <div className="at-modal__fundo" onClick={aoFechar} />
      <div ref={caixa} className={`at-modal__caixa${alto ? ' at-modal__caixa--alta' : ''}`} role="dialog" aria-modal="true" aria-label={rotulo}>
        <div className="at-modal__alca" aria-hidden="true"
          onPointerDown={(ev) => { arraste.current = { y: ev.clientY, id: ev.pointerId }; try { (ev.target as HTMLElement).setPointerCapture(ev.pointerId) } catch { /* ponteiro já solto */ } }}
          onPointerMove={(ev) => { const a = arraste.current; if (a && a.id === ev.pointerId) mover(ev.clientY - a.y) }}
          onPointerUp={(ev) => { const a = arraste.current; arraste.current = null; mover(0); if (a && ev.clientY - a.y > 80) aoFechar() }}
          onPointerCancel={() => { arraste.current = null; mover(0) }}><span /></div>
        <div className="at-modal__conteudo">{children}</div>
      </div>
    </div>
  )
}

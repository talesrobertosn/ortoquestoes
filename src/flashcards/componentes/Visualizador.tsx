import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  src: string
  legenda: string
  aoFechar: () => void
}

const MIN = 1, MAX = 5

/**
 * Visualizador da figura da questão: imagem inteira (contain), zoom por
 * pinça, roda do mouse, toque duplo ou botões, e arraste para ver as regiões.
 * Nada de filtro ou corte: a figura médica aparece como veio.
 */
export function Visualizador({ src, legenda, aoFechar }: Props) {
  const [zoom, definirZoom] = useState(1)
  const [pos, definirPos] = useState({ x: 0, y: 0 })
  const [erro, definirErro] = useState(false)
  const area = useRef<HTMLDivElement>(null)
  const toques = useRef(new Map<number, { x: number; y: number }>())
  const inicio = useRef<{ dist: number; zoom: number } | null>(null)
  const ultimoToque = useRef(0)

  const limitar = useCallback((z: number, p: { x: number; y: number }) => {
    const el = area.current
    if (!el || z <= 1) return { x: 0, y: 0 }
    const mx = (el.clientWidth * (z - 1)) / 2, my = (el.clientHeight * (z - 1)) / 2
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) }
  }, [])

  const aplicar = useCallback((z: number, p = pos) => {
    const zz = Math.max(MIN, Math.min(MAX, z))
    definirZoom(zz)
    definirPos(limitar(zz, p))
  }, [limitar, pos])

  useEffect(() => {
    const el = area.current
    if (!el) return
    const roda = (e: WheelEvent) => { e.preventDefault(); aplicar(zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2)) }
    el.addEventListener('wheel', roda, { passive: false })
    return () => el.removeEventListener('wheel', roda)
  }, [aplicar, zoom])

  const aoBaixar = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId)
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (toques.current.size === 2) {
      const [a, b] = [...toques.current.values()]
      inicio.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    } else if (e.pointerType !== 'mouse') {
      const agora = Date.now()
      if (agora - ultimoToque.current < 300) aplicar(zoom > 1 ? 1 : 2.5, { x: 0, y: 0 })
      ultimoToque.current = agora
    }
  }
  const aoMover = (e: React.PointerEvent) => {
    const antes = toques.current.get(e.pointerId)
    if (!antes) return
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (toques.current.size === 2 && inicio.current) {
      const [a, b] = [...toques.current.values()]
      aplicar((inicio.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / (inicio.current.dist || 1))
    } else if (toques.current.size === 1 && zoom > 1) {
      definirPos((p) => limitar(zoom, { x: p.x + e.clientX - antes.x, y: p.y + e.clientY - antes.y }))
    }
  }
  const aoSoltar = (e: React.PointerEvent) => {
    toques.current.delete(e.pointerId)
    if (toques.current.size < 2) inicio.current = null
  }

  return (
    <div className="fc-veu fc-veu--imagem" role="dialog" aria-modal="true" aria-label="Imagem ampliada" onClick={aoFechar}>
      <figure className="fc-ampliada" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="fc-ampliada__fechar" onClick={aoFechar} aria-label="Fechar imagem" autoFocus>×</button>
        <div
          ref={area}
          className={'fc-ampliada__area' + (zoom > 1 ? ' fc-ampliada__area--zoom' : '')}
          onPointerDown={aoBaixar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          onDoubleClick={() => aplicar(zoom > 1 ? 1 : 2.5, { x: 0, y: 0 })}
        >
          {erro ? (
            <p className="fc-ampliada__erro">Não foi possível carregar a imagem. Confira a conexão e tente de novo.</p>
          ) : (
            <img src={src} alt="Figura da questão de origem, ampliada" draggable={false} onError={() => definirErro(true)}
              style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})` }} />
          )}
        </div>
        <div className="fc-ampliada__controles" role="group" aria-label="Zoom">
          <button type="button" onClick={() => aplicar(zoom / 1.5)} disabled={zoom <= MIN} aria-label="Diminuir o zoom">−</button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => aplicar(zoom * 1.5)} disabled={zoom >= MAX} aria-label="Aumentar o zoom">+</button>
          <button type="button" onClick={() => aplicar(1, { x: 0, y: 0 })} disabled={zoom === 1} className="fc-ampliada__ajustar">Ajustar</button>
        </div>
        <figcaption>{legenda}</figcaption>
        <small className="fc-ampliada__dica">Pinça, roda do mouse ou toque duplo para ampliar · arraste para mover · Esc fecha</small>
      </figure>
    </div>
  )
}

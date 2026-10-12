import { useEffect, useRef } from 'react'
import type { Cenario as TipoCenario } from '../motor/bestiario'
import { criarAmbiente, pintarCenario, pintarMesa } from '../efeitos/pintura'

/** Fundo pintado (uma vez por tamanho) e camada de ambiente com paralaxe discreta. */
export function Cenario({ cenario, reduzido }: { cenario: TipoCenario; reduzido: boolean }) {
  const fundo = useRef<HTMLCanvasElement>(null)
  const ambiente = useRef<HTMLCanvasElement>(null)
  const camada = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const c = fundo.current
    if (!c) return
    let espera = 0
    const pintar = () => pintarCenario(c, cenario)
    pintar()
    const aoRedimensionar = () => { clearTimeout(espera); espera = window.setTimeout(pintar, 120) }
    window.addEventListener('resize', aoRedimensionar)
    return () => { window.removeEventListener('resize', aoRedimensionar); clearTimeout(espera) }
  }, [cenario])

  useEffect(() => {
    if (reduzido || !ambiente.current) return
    return criarAmbiente(ambiente.current, cenario)
  }, [cenario, reduzido])

  // Paralaxe: o cenário desliza um pouco contra o ponteiro (só com mouse).
  useEffect(() => {
    if (reduzido || !matchMedia('(pointer: fine)').matches) return
    const aoMover = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * -14, y = (e.clientY / window.innerHeight - 0.5) * -10
      if (camada.current) camada.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.04)`
    }
    window.addEventListener('pointermove', aoMover)
    return () => window.removeEventListener('pointermove', aoMover)
  }, [reduzido])

  return (
    <div className="fc-cenario" aria-hidden="true">
      <div className="fc-cenario__camada" ref={camada}>
        <canvas ref={fundo} className="fc-cenario__fundo" />
        <canvas ref={ambiente} className="fc-cenario__ambiente" />
      </div>
    </div>
  )
}

/** Tampo da mesa, repintado quando o tamanho ou o cenário mudam. */
export function TampoMesa({ cenario }: { cenario: TipoCenario }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    let quadro = 0
    const pintar = () => { cancelAnimationFrame(quadro); quadro = requestAnimationFrame(() => pintarMesa(c, cenario)) }
    pintar()
    const obs = new ResizeObserver(pintar)
    obs.observe(c)
    return () => { obs.disconnect(); cancelAnimationFrame(quadro) }
  }, [cenario])
  return <canvas ref={ref} className="fc-mesa__tampo" aria-hidden="true" />
}

import { useEffect, useRef } from 'react'
import type { Cenario as TipoCenario } from '../motor/bestiario'
import { criarAmbiente, pintarCena, pintarMesa, type Cena } from '../efeitos/pintura'

/**
 * Diorama HD-2D: pixel art em planos e luz moderna por cima.
 *  fundo (desfocado) → meio (nítido) → cópia do meio desfocada só no alto e
 *  embaixo (tilt-shift) → brilho somado (bloom) → feixes de luz → ambiente
 *  (bokeh e poeira) → frente desfocada → névoa e vinheta.
 * Repinta só quando o tamanho ou a cena mudam; paralaxe leve com o mouse.
 */
export function Cenario({ cena, reduzido }: { cena: Cena; reduzido: boolean }) {
  const fundo = useRef<HTMLCanvasElement>(null)
  const meio = useRef<HTMLCanvasElement>(null)
  const tilt = useRef<HTMLCanvasElement>(null)
  const frente = useRef<HTMLCanvasElement>(null)
  const brilho = useRef<HTMLCanvasElement>(null)
  const ambiente = useRef<HTMLCanvasElement>(null)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const f = fundo.current, m = meio.current, t = tilt.current, fr = frente.current, b = brilho.current
    if (!f || !m || !t || !fr || !b) return
    let espera = 0, ultimo = ''
    const pintar = () => {
      const chave = `${m.clientWidth}x${m.clientHeight}`
      if (chave === ultimo || !m.clientWidth) return
      ultimo = chave
      pintarCena({ fundo: f, meio: m, frente: fr, brilho: b }, cena)
      t.width = m.width; t.height = m.height
      t.getContext('2d')!.drawImage(m, 0, 0)
    }
    pintar()
    const obs = new ResizeObserver(() => { window.clearTimeout(espera); espera = window.setTimeout(pintar, 140) })
    obs.observe(m)
    return () => { obs.disconnect(); window.clearTimeout(espera) }
  }, [cena])

  useEffect(() => {
    if (reduzido || !ambiente.current) return
    return criarAmbiente(ambiente.current, cena)
  }, [cena, reduzido])

  useEffect(() => {
    if (reduzido || !matchMedia('(pointer: fine)').matches) return
    let quadro = 0
    const aoMover = (e: PointerEvent) => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(() => {
        raiz.current?.style.setProperty('--px', (e.clientX / window.innerWidth - 0.5).toFixed(3))
        raiz.current?.style.setProperty('--py', (e.clientY / window.innerHeight - 0.5).toFixed(3))
      })
    }
    window.addEventListener('pointermove', aoMover)
    return () => { window.removeEventListener('pointermove', aoMover); cancelAnimationFrame(quadro) }
  }, [reduzido])

  return (
    <div className={`fc-cena fc-cena--${cena}`} ref={raiz} aria-hidden="true">
      <canvas ref={fundo} className="fc-cena__fundo" />
      <canvas ref={meio} className="fc-cena__meio" />
      <canvas ref={tilt} className="fc-cena__tilt" />
      <canvas ref={brilho} className="fc-cena__brilho" />
      <span className="fc-cena__feixes" />
      <canvas ref={ambiente} className="fc-cena__ambiente" />
      <canvas ref={frente} className="fc-cena__frente" />
      <span className="fc-cena__nevoa" />
    </div>
  )
}

/** Estrado de pedra da mesa (pixel art), repintado quando o tamanho muda. */
export function TampoMesa({ cenario }: { cenario: TipoCenario }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    let espera = 0, ultimo = ''
    const pintar = () => {
      const chave = `${c.clientWidth}x${c.clientHeight}`
      if (chave === ultimo) return
      ultimo = chave
      pintarMesa(c, cenario)
    }
    pintar()
    const obs = new ResizeObserver(() => { window.clearTimeout(espera); espera = window.setTimeout(pintar, 120) })
    obs.observe(c)
    return () => { obs.disconnect(); window.clearTimeout(espera) }
  }, [cenario])
  return <canvas ref={ref} className="fc-mesa__tampo" aria-hidden="true" />
}

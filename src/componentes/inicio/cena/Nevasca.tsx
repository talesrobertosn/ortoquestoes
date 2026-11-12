import { useEffect, useRef } from 'react'

/**
 * A nevasca dos cenários (12/11/2026, clima.ts): neve densa em três camadas de profundidade, como no HD-2D. Ao fundo,
 * flocos miúdos e lentos; no meio, os de sempre; na frente, poucos flocos grandes e desfocados que passam rápido. O vento
 * balança tudo junto e de vez em quando vem uma rajada que inclina a neve. `intensidade` (0 a 1) muda devagar: a neve
 * começa rala e engrossa. Para quando a aba some ou a cena sai da tela; com "menos movimento" não aparece.
 */
type Floco = { x: number; y: number; r: number; v: number; fase: number; balanco: number; a: number }
const CAMADAS = [
  { densidade: 0.00042, raio: [0.6, 1.1], vel: [14, 26], alfa: 0.55, desfoque: 0, balanco: 6 },
  { densidade: 0.00018, raio: [1.1, 1.9], vel: [30, 48], alfa: 0.8, desfoque: 0, balanco: 10 },
  { densidade: 0.000018, raio: [3.2, 5.6], vel: [70, 110], alfa: 0.55, desfoque: 2.2, balanco: 18 },
] as const

export function Nevasca({ intensidade }: { intensidade: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const alvo = useRef(intensidade)
  alvo.current = intensidade
  useEffect(() => {
    const tela = ref.current
    const ctx = tela?.getContext('2d')
    if (!tela || !ctx || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let largura = 0, altura = 0, quadro = 0, antes = performance.now(), visivel = true, atual = 0, tempo = 0
    let rajada = 0, proximaRajada = 6 + Math.random() * 10
    const camadas: Floco[][] = CAMADAS.map(() => [])
    const novo = (c: (typeof CAMADAS)[number], topo: boolean): Floco => ({
      x: Math.random() * (largura + 120) - 60,
      y: topo ? -10 - Math.random() * 40 : Math.random() * altura,
      r: c.raio[0] + Math.random() * (c.raio[1] - c.raio[0]),
      v: c.vel[0] + Math.random() * (c.vel[1] - c.vel[0]),
      fase: Math.random() * Math.PI * 2,
      balanco: c.balanco * (0.5 + Math.random()),
      a: c.alfa * (0.6 + Math.random() * 0.4),
    })
    const medir = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      largura = tela.clientWidth
      altura = tela.clientHeight
      tela.width = Math.round(largura * dpr)
      tela.height = Math.round(altura * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      CAMADAS.forEach((c, i) => {
        const n = Math.round(largura * altura * c.densidade)
        while (camadas[i].length < n) camadas[i].push(novo(c, false))
        camadas[i].length = n
      })
    }
    medir()
    const medidor = new ResizeObserver(medir)
    medidor.observe(tela)
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting })
    io.observe(tela)
    const passo = (agora: number) => {
      quadro = requestAnimationFrame(passo)
      const dt = Math.min(0.05, (agora - antes) / 1000)
      antes = agora
      if (document.hidden || !visivel) return
      tempo += dt
      // A intensidade segue o tempo devagar (a neve engrossa e afina em uns 20 s).
      atual += (alvo.current - atual) * Math.min(1, dt / 6)
      proximaRajada -= dt
      if (proximaRajada < 0) { rajada = 1; proximaRajada = 9 + Math.random() * 14 }
      rajada = Math.max(0, rajada - dt * 0.35)
      const vento = 10 + Math.sin(tempo * 0.21) * 14 + Math.sin(tempo * 0.067) * 10 + Math.sin(rajada * Math.PI) * 70
      ctx.clearRect(0, 0, largura, altura)
      CAMADAS.forEach((c, i) => {
        const lista = camadas[i]
        const mostrar = Math.round(lista.length * Math.min(1, atual))
        const prof = 0.45 + i * 0.4
        ctx.filter = c.desfoque ? `blur(${c.desfoque}px)` : 'none'
        ctx.fillStyle = '#f4f8ff'
        for (let k = 0; k < lista.length; k++) {
          const f = lista[k]
          f.y += f.v * dt
          f.x += (vento * prof + Math.sin(tempo * 1.3 + f.fase) * f.balanco) * dt
          if (f.y > altura + 12 || f.x > largura + 70 || f.x < -70) Object.assign(f, novo(c, true))
          if (k >= mostrar) continue
          ctx.globalAlpha = f.a
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      ctx.globalAlpha = 1
      ctx.filter = 'none'
    }
    quadro = requestAnimationFrame(passo)
    return () => { cancelAnimationFrame(quadro); medidor.disconnect(); io.disconnect() }
  }, [])
  return <canvas ref={ref} className="hd-nevasca" aria-hidden="true" />
}

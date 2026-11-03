import { useEffect, useRef, useState } from 'react'
import { recurso } from '../../config'
import { usarPeriodo } from '../../estado/aparencia'
import '../../estilos/componentes/CenaTorre.css'

/**
 * A Torre do Tempo (31/10/2026): o cenário do topo do cronograma, pintado por scripts/gerar_cena_cronograma.py.
 * A praça da vila na estrada que leva ao castelo da prova; a hora do dia segue a escolha de aparência
 * (manhã, tarde, noite), independente do tema claro/escuro. Só a imagem da hora em uso é carregada.
 *
 * O palco tem a proporção da arte (1440 x 600) e cobre a moldura: as posições abaixo são em pixels da arte,
 * então o sino, as lanternas e a poeira ficam sempre em cima do que a pintura mostra. O relógio é cenário:
 * os dias até a prova são o número do HTML, não os ponteiros.
 */
const BASE = { w: 1440, h: 600 }
const pct = (v: number, total: number) => `${(v / total) * 100}%`
/** O sino recortado da cena (o script imprime o retângulo). */
const SINO = { x: 1134, y: 120, w: 75, h: 69 }
/** As luzes que tremulam: lampiões da estrada e da praça e as arandelas da porta da torre. */
const LUZES = [
  { x: 759, y: 466, r: 46 }, { x: 860, y: 453, r: 34 }, { x: 1368, y: 455, r: 58 },
  { x: 1128, y: 444, r: 34 }, { x: 1215, y: 444, r: 34 },
]
/** Grãos de poeira no feixe de sol (de dia) ou vaga-lumes (à noite). */
const GRAOS = [
  { x: 1030, y: 380, d: 9, a: 0 }, { x: 1080, y: 470, d: 11, a: -3 }, { x: 1150, y: 520, d: 8, a: -6 },
  { x: 990, y: 440, d: 12, a: -2 }, { x: 1250, y: 500, d: 10, a: -7 }, { x: 900, y: 420, d: 13, a: -4 },
  { x: 1300, y: 400, d: 9, a: -8 }, { x: 760, y: 410, d: 12, a: -5 },
]

export function CenaTorre() {
  const periodo = usarPeriodo()
  const palco = useRef<HTMLDivElement>(null)
  const [visivel, definirVisivel] = useState(true)
  useEffect(() => {
    const el = palco.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => definirVisivel(e.isIntersecting), { rootMargin: '60px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const img = (nome: string) => recurso(`pixel/cronograma/${nome}`)
  const fundo = `torre-tempo-${periodo}`
  return (
    <div ref={palco} className={`ct-cena ct-cena--${periodo}${visivel ? '' : ' ct-cena--pausada'}`} aria-hidden="true">
      <div className="ct-cena__mundo">
        <img className="ct-cena__fundo" src={img(`${fundo}.webp`)} srcSet={`${img(`${fundo}-960.webp`)} 960w, ${img(`${fundo}.webp`)} 1440w`}
          sizes="(max-width: 46rem) 150vw, min(76rem, 100vw)" alt="" width={BASE.w} height={BASE.h} decoding="async" fetchPriority="high" draggable={false} />
        <img className="ct-cena__sino" src={img(`torre-tempo-sino-${periodo}.png`)} alt="" width={SINO.w} height={SINO.h} decoding="async" draggable={false}
          style={{ left: pct(SINO.x, BASE.w), top: pct(SINO.y, BASE.h), width: pct(SINO.w, BASE.w), height: pct(SINO.h, BASE.h) }} />
        {periodo !== 'manha' && LUZES.map((l, i) => <span key={i} className="ct-cena__luz"
          style={{ left: pct(l.x - l.r, BASE.w), top: pct(l.y - l.r, BASE.h), width: pct(l.r * 2, BASE.w), height: pct(l.r * 2, BASE.h), animationDelay: `${-i * 0.7}s` }} />)}
        <span className="ct-cena__graos">{GRAOS.map((g, i) => <i key={i} style={{ left: pct(g.x, BASE.w), top: pct(g.y, BASE.h), animationDuration: `${g.d}s`, animationDelay: `${g.a}s` }} />)}</span>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { recurso } from '../../config'
import { usarPeriodo } from '../../estado/aparencia'
import { modoNatalAtivo } from '../../natal/modoNatal'
import '../../estilos/componentes/CenaTorre.css'
import '../../estilos/natal/NatalCronograma.css'

/**
 * A estrada até o castelo da prova (10/11/2026): o cenário do topo do cronograma, pintado por
 * scripts/cenarios/cronograma_estrada.py (substitui a Torre do Tempo, que o Tales recusou). O castelo assentado no
 * platô, a estrada em zigue-zague até o portão, a ponte, a vila e a Torre do Relógio; a hora do dia segue a escolha
 * de aparência (manhã, tarde, noite). Só a imagem da hora em uso é carregada.
 *
 * O palco tem a proporção da arte (1440 x 600) e cobre a moldura: as posições abaixo são em pixels da arte e vêm de
 * scripts/cenarios/cronograma-estrada.json. O relógio é cenário: os dias até a prova são o número do HTML.
 */
const BASE = { w: 1440, h: 600 }
const pct = (v: number, total: number) => `${(v / total) * 100}%`
/** O sino recortado da cena e os estandartes das torres do castelo (balançam por cima da pintura). */
const SINO = { x: 1245, y: 189, w: 45, h: 54 }
const ESTANDARTES = [{ x: 834, y: 54, w: 30, h: 21 }, { x: 1032, y: 129, w: 30, h: 21 }]
/** As luzes que tremulam: os lampiões da estrada e da praça e o portão do castelo. */
const LUZES = [
  { x: 711, y: 462, r: 36 }, { x: 831, y: 468, r: 36 }, { x: 880, y: 465, r: 50 }, { x: 658, y: 411, r: 39 },
  { x: 1131, y: 483, r: 70 }, { x: 891, y: 318, r: 27 },
]
/** A fumaça das chaminés da vila. */
const CHAMINES = [{ x: 990, y: 405, e: 0.5 }, { x: 1044, y: 402, e: 0.5 }, { x: 1167, y: 333, e: 1 }]
/** Grãos de poeira dourada no vale (de dia) ou vaga-lumes (à noite). */
const GRAOS = [
  { x: 760, y: 430, d: 9, a: 0 }, { x: 840, y: 500, d: 11, a: -3 }, { x: 930, y: 520, d: 8, a: -6 },
  { x: 690, y: 500, d: 12, a: -2 }, { x: 1010, y: 470, d: 10, a: -7 }, { x: 880, y: 400, d: 13, a: -4 },
  { x: 1060, y: 530, d: 9, a: -8 }, { x: 640, y: 450, d: 12, a: -5 },
]

// Centros das lâmpadas de scripts/natal/cenario_cronograma.py, na grade da pintura.
const NATAL_LUZES = [
  { x: 402, y: 55, cor: '#ffe0a0' }, { x: 410, y: 57, cor: '#ff6a50' }, { x: 418, y: 59, cor: '#60f0b0' },
  { x: 427, y: 59, cor: '#ffc050' }, { x: 435, y: 57, cor: '#ff6a50' }, { x: 443, y: 55, cor: '#ffe0a0' },
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
  const natal = modoNatalAtivo()
  const prefixo = natal ? 'estrada-prova-natal' : 'estrada-prova'
  const fundo = `${prefixo}-${periodo}`
  return (
    <div ref={palco} className={`ct-cena ct-cena--${periodo}${visivel ? '' : ' ct-cena--pausada'}`} aria-hidden="true">
      <div className="ct-cena__mundo">
        <img className="ct-cena__fundo" src={img(`${fundo}.webp`)} srcSet={`${img(`${fundo}-960.webp`)} 960w, ${img(`${fundo}.webp`)} 1440w`}
          sizes="(max-width: 46rem) 150vw, min(76rem, 100vw)" alt="" width={BASE.w} height={BASE.h} decoding="async" fetchPriority="high" draggable={false} />
        <img className="ct-cena__sino" src={img(`${prefixo}-sino-${periodo}.png`)} alt="" width={SINO.w} height={SINO.h} decoding="async" draggable={false}
          style={{ left: pct(SINO.x, BASE.w), top: pct(SINO.y, BASE.h), width: pct(SINO.w, BASE.w), height: pct(SINO.h, BASE.h) }} />
        {natal && NATAL_LUZES.map((l, i) => <span key={l.x} className="ct-cena__pisca-natal" style={{
          left: pct(l.x, BASE.w / 3), top: pct(l.y, BASE.h / 3), width: pct(7, BASE.w / 3),
          animationDelay: `${-i * 0.72}s`, '--cor-lampada': l.cor,
        } as CSSProperties} />)}
        {ESTANDARTES.map((e, i) => <img key={i} className="ct-cena__estandarte" src={img(`estrada-prova-estandarte-${periodo}.png`)} alt="" width={e.w} height={e.h} decoding="async" draggable={false}
          style={{ left: pct(e.x, BASE.w), top: pct(e.y, BASE.h), width: pct(e.w, BASE.w), height: pct(e.h, BASE.h), animationDelay: `${-i * 1.3}s` }} />)}
        {CHAMINES.map((c, i) => <span key={i} className="ct-cena__fumaca" style={{ left: pct(c.x, BASE.w), top: pct(c.y, BASE.h), width: pct(18 * c.e, BASE.w), animationDelay: `${-i * 2.1}s` }} />)}
        {periodo !== 'manha' && LUZES.map((l, i) => <span key={i} className="ct-cena__luz"
          style={{ left: pct(l.x - l.r, BASE.w), top: pct(l.y - l.r, BASE.h), width: pct(l.r * 2, BASE.w), height: pct(l.r * 2, BASE.h), animationDelay: `${-i * 0.7}s` }} />)}
        <span className="ct-cena__graos">{GRAOS.map((g, i) => <i key={i} style={{ left: pct(g.x, BASE.w), top: pct(g.y, BASE.h), animationDuration: `${g.d}s`, animationDelay: `${g.a}s` }} />)}</span>
      </div>
    </div>
  )
}

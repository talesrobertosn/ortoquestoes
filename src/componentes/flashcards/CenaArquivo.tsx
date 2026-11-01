import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { recurso, urlCss } from '../../config'
import { usarPeriodo } from '../../estado/aparencia'
import '../../estilos/componentes/CenaTorre.css'

/**
 * O Arquivo da Vila (01/11/2026): o cenário do topo dos Flashcards, pintado por scripts/gerar_cena_flashcards.py.
 * O salão do arquivo público ao lado da praça da torre, com o grande fichário de fichas e, no fundo, a escada que
 * desce para a Cripta (o Torneio). A hora do dia segue a escolha de aparência; só a imagem da hora em uso é carregada.
 * Usa o palco e as animações da Torre do Tempo (CenaTorre.css): posições em pixels da arte de 1440 x 600.
 */
const BASE = { w: 1440, h: 600 }
const pct = (v: number, total: number) => `${(v / total) * 100}%`
/** A lamparina em cima do fichário, a vela da mesa e a luz fria que sobe da escada da Cripta. */
const LUZES = [{ x: 834, y: 168, r: 70 }, { x: 282, y: 472, r: 34 }]
const CRIPTA = { x: 1344, y: 470, r: 64 }
/** Poeira no feixe da janela (de dia) ou fagulhas azuis subindo da Cripta (à noite). */
const POEIRA = [
  { x: 420, y: 260, d: 10, a: 0 }, { x: 520, y: 340, d: 12, a: -3 }, { x: 610, y: 420, d: 9, a: -6 }, { x: 470, y: 380, d: 13, a: -2 },
  { x: 700, y: 470, d: 11, a: -7 }, { x: 560, y: 250, d: 12, a: -4 },
]
const FAGULHAS = [{ x: 1316, y: 520, d: 7, a: 0 }, { x: 1352, y: 500, d: 8, a: -2 }, { x: 1384, y: 530, d: 6, a: -4 }, { x: 1334, y: 470, d: 9, a: -5 }]

/** O assoalho do Arquivo, fundo das páginas dos Flashcards embaixo do topo (CentralFlashcardsArquivo.css). */
export const PISO_DO_ARQUIVO = { '--ca-piso': urlCss('pixel/flashcards/arquivo-piso.webp') } as CSSProperties

export function CenaArquivo() {
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
  const img = (nome: string) => recurso(`pixel/flashcards/${nome}`)
  const fundo = `arquivo-${periodo}`
  const graos = periodo === 'noite' ? FAGULHAS : POEIRA
  return (
    <div ref={palco} className={`ct-cena ct-cena--${periodo} ca-cena${visivel ? '' : ' ct-cena--pausada'}`} aria-hidden="true">
      <div className="ct-cena__mundo">
        <img className="ct-cena__fundo" src={img(`${fundo}.webp`)} srcSet={`${img(`${fundo}-960.webp`)} 960w, ${img(`${fundo}.webp`)} 1440w`}
          sizes="(max-width: 46rem) 150vw, min(76rem, 100vw)" alt="" width={BASE.w} height={BASE.h} decoding="async" fetchPriority="high" draggable={false} />
        {LUZES.map((l, i) => <span key={i} className="ct-cena__luz ca-cena__chama"
          style={{ left: pct(l.x - l.r, BASE.w), top: pct(l.y - l.r, BASE.h), width: pct(l.r * 2, BASE.w), height: pct(l.r * 2, BASE.h), animationDelay: `${-i * 0.9}s` }} />)}
        <span className="ca-cena__cripta" style={{ left: pct(CRIPTA.x - CRIPTA.r, BASE.w), top: pct(CRIPTA.y - CRIPTA.r, BASE.h), width: pct(CRIPTA.r * 2, BASE.w), height: pct(CRIPTA.r * 2, BASE.h) }} />
        <span className="ct-cena__graos">{graos.map((g, i) => <i key={i} style={{ left: pct(g.x, BASE.w), top: pct(g.y, BASE.h), animationDuration: `${g.d}s`, animationDelay: `${g.a}s` }} />)}</span>
      </div>
    </div>
  )
}

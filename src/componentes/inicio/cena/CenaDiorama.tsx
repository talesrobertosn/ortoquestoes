import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import { recurso } from '../../../config'
import { Mascote } from '../../mascote/Mascote'
import { GATO_ACORDADO, GATO_DORMINDO, PALETA_GATO, type Grade, type Paleta } from '../../../biblioteca/salao/sprites'

/**
 * O cenário "HD-2D" do topo da página inicial (30/10/2026, pedido do Tales com o Octopath Traveler II de referência).
 * O fundo é pintado pixel a pixel por scripts/gerar_cena_inicio.py, com a luz calculada (feixes de sol, sombras, luz da
 * fogueira, profundidade de campo); há uma imagem para cada hora do dia. Por cima, animados e no lugar certo:
 * a fogueira da sequência (scripts/gerar_sprites_inicio.py, um estágio por linha), o esqueleto lendo no tronco e o
 * gato. O "palco" tem a proporção da arte (480 x 200) e cobre o espaço; as posições são porcentagens da arte.
 *
 * O esqueleto é o mascote (componentes/mascote): faz uma coisa diferente a cada visita e fala; dois cliques no gato
 * e ele aparece com uma tala.
 */
export type Periodo = 'manha' | 'tarde' | 'noite'

export function periodoAgora(d = new Date()): Periodo {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' }).format(d))
  return h >= 5 && h < 12 ? 'manha' : h >= 12 && h < 18 ? 'tarde' : 'noite'
}

/** Pixel art pequena em SVG (o gato do salão), no tamanho do elemento. */
const PixelSvg = memo(function PixelSvg({ grade, paleta }: { grade: Grade; paleta: Paleta }) {
  const r: ReactElement[] = []
  grade.forEach((linha, y) => {
    let x = 0
    while (x < linha.length) {
      const c = linha[x]
      let f = x + 1
      while (f < linha.length && linha[f] === c) f++
      if (c !== '.' && paleta[c]) r.push(<rect key={`${x}-${y}`} x={x} y={y} width={f - x} height={1} fill={paleta[c]} />)
      x = f
    }
  })
  return <svg viewBox={`0 0 ${grade[0].length} ${grade.length}`} shapeRendering="crispEdges" width="100%" height="100%" aria-hidden="true">{r}</svg>
})

/** Posição e tamanho em porcentagem do palco, a partir de pixels da arte (480 x 200). */
const lugar = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: `${(x / 480) * 100}%`, top: `${(y / 200) * 100}%`, width: `${(w / 480) * 100}%`, height: `${(h / 200) * 100}%` })

export function CenaDiorama({ linhaFogo, periodo }: { linhaFogo: number; periodo: Periodo }) {
  const [gato, definirGato] = useState<'dormindo' | 'acordado' | 'tala'>('dormindo')
  const palco = useRef<HTMLDivElement>(null)

  // Parallax leve com o mouse (computador, sem "menos animação").
  useEffect(() => {
    const el = palco.current
    const alvo = el?.closest('.hd-topo') as HTMLElement | null
    if (!el || !alvo || !window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return
    let quadro = 0
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(() => {
        const r = alvo.getBoundingClientRect()
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
      })
    }
    const sair = () => { el.style.setProperty('--mx', '0'); el.style.setProperty('--my', '0') }
    alvo.addEventListener('pointermove', mover)
    alvo.addEventListener('pointerleave', sair)
    return () => { cancelAnimationFrame(quadro); alvo.removeEventListener('pointermove', mover); alvo.removeEventListener('pointerleave', sair) }
  }, [])

  const paletaGato = useMemo(() => (gato === 'tala' ? { ...PALETA_GATO, p: '#5aa0d8', g: '#8a8e9c' } : PALETA_GATO), [gato])
  const particulas = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 70 + 5, t: 6 + (i % 5) * 1.6, d: -((i * 1.7) % 8) })), [])
  const brasas = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ dx: ((i * 29) % 13) - 6, t: 1.8 + (i % 4) * 0.5, d: -((i * 0.7) % 3) })), [])
  const imagem = (larg: number) => recurso(`pixel/inicio/cena-${periodo}${larg === 960 ? '-960' : ''}.webp`)

  return (
    <div className="hd-cena" aria-hidden="true">
      <div ref={palco} className={`hd-palco hd-palco--${periodo}`}>
        <img className="hd-palco__fundo" src={imagem(1440)} srcSet={`${imagem(960)} 960w, ${imagem(1440)} 1440w`} sizes="(max-width: 60rem) 170vw, 100vw"
          width={1440} height={600} alt="" decoding="async" fetchPriority="high" />
        <span className="hd-luz-fogo" style={{ left: `${(240 / 480) * 100}%`, top: `${(140 / 200) * 100}%`, '--forca': linhaFogo === 0 ? 0.2 : 1 } as CSSProperties} />
        <span className={`hd-fogo hd-fogo--${linhaFogo}`} style={{ ...lugar(220, 104, 40, 48), '--linha': linhaFogo } as CSSProperties} />
        {linhaFogo > 0 && <span className="hd-brasas" style={lugar(232, 96, 16, 30)}>{brasas.map((b, i) => <i key={i} style={{ '--dx': `${b.dx * 3}px`, '--t': `${b.t}s`, '--d': `${b.d}s` } as CSSProperties} />)}</span>}
        {/* O mascote, sentado no tronco: um comportamento diferente a cada visita (componentes/mascote). */}
        <Mascote className="hd-mascote" style={lugar(236, 87, 80, 90.67)} />
        <button type="button" tabIndex={-1} className="hd-gato" style={lugar(226, 155, 22, 10)}
          onClick={() => definirGato((g) => (g === 'dormindo' ? 'acordado' : 'tala'))}>
          <PixelSvg grade={gato === 'dormindo' ? GATO_DORMINDO : GATO_ACORDADO} paleta={paletaGato} />
        </button>
        {gato === 'tala' && <span className="hd-balao" style={{ left: `${(237 / 480) * 100}%`, top: `${(150 / 200) * 100}%` }}>Tala ok. Retorno em 3 semanas.</span>}
        <span className="hd-particulas">{particulas.map((p, i) => <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, '--t': `${p.t}s`, '--d': `${p.d}s` } as CSSProperties} />)}</span>
      </div>
    </div>
  )
}

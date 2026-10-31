import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { recurso } from '../../../config'
import { Mascote } from '../../mascote/Mascote'
import { folhaGato, type IdLinhaGato } from '../../mascote/sprites'
import { urlCss } from '../../../config'
import type { Periodo } from '../../../estado/aparencia'

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
export { periodoAgora, type Periodo } from '../../../estado/aparencia'

/** Posição e tamanho em porcentagem do palco, a partir de pixels da arte (480 x 200). */
const lugar = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: `${(x / 480) * 100}%`, top: `${(y / 200) * 100}%`, width: `${(w / 480) * 100}%`, height: `${(h / 200) * 100}%` })

export function CenaDiorama({ linhaFogo, periodo, descanso = false, festa = 0 }: {
  linhaFogo: number; periodo: Periodo
  /** Meta do dia cumprida (31/10/2026): o esqueleto senta para se aquecer na fogueira e o gato ronrona. */
  descanso?: boolean
  /** Muda de valor para disparar a comemoração curta da meta cumprida (esqueleto pula e o gato comemora). */
  festa?: number
}) {
  const repouso: IdLinhaGato = descanso ? 'ronronando' : 'dormindo'
  const [gato, definirGato] = useState<IdLinhaGato>(repouso)
  const palco = useRef<HTMLDivElement>(null)
  const espera = useRef(0)

  // O gato acompanha a cena: com a meta cumprida ele ronrona; numa comemoração, pula junto por um instante.
  useEffect(() => { definirGato(repouso) }, [repouso])
  useEffect(() => {
    if (!festa || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    definirGato('comemorando')
    const fim = window.setTimeout(() => definirGato(repouso), 2600)
    return () => window.clearTimeout(fim)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [festa])

  // Passar o mouse pelo acampamento acorda o gato devagar (acorda, boceja e fica olhando); ao sair, ele volta a dormir.
  useEffect(() => {
    const alvo = palco.current?.closest('.hd-topo') as HTMLElement | null
    if (!alvo || !window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return
    const entrar = () => {
      window.clearTimeout(espera.current)
      espera.current = window.setTimeout(() => {
        definirGato((g) => (g === 'dormindo' || g === 'ronronando' ? 'acordando' : g))
        espera.current = window.setTimeout(() => definirGato((g) => (g === 'acordando' ? 'observando' : g)), 1400)
      }, 900)
    }
    const sair = () => {
      window.clearTimeout(espera.current)
      espera.current = window.setTimeout(() => definirGato((g) => (g === 'acordando' || g === 'observando' ? repouso : g)), 3500)
    }
    alvo.addEventListener('pointerenter', entrar)
    alvo.addEventListener('pointerleave', sair)
    return () => { window.clearTimeout(espera.current); alvo.removeEventListener('pointerenter', entrar); alvo.removeEventListener('pointerleave', sair) }
  }, [repouso])

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
        {/* O mascote, em pé ao lado da fogueira: um comportamento diferente a cada visita (componentes/mascote). */}
        {descanso
          ? <Mascote key="descanso" className="hd-mascote" comportamento="fogueira" reacao={festa ? 'comemora2' : null} style={lugar(262, 96, 46, 66.7)} />
          : <Mascote key="dia" className="hd-mascote" style={lugar(262, 96, 46, 66.7)} />}
        {/* O gato (pixel art de scripts/gerar_mascote.py): dorme; um clique e acorda; outro e aparece com a tala. */}
        <button type="button" tabIndex={-1} className="hd-gato" style={lugar(219, 150, 36, 22.5)}
          onClick={() => definirGato((g) => (g === 'tala' ? 'tala' : g === 'dormindo' || g === 'ronronando' ? 'acordado' : 'tala'))}>
          <span className={`hd-gato__sprite${gato === 'acordando' ? ' hd-gato__sprite--uma-vez' : ''}`} style={{ '--sprite': urlCss(folhaGato(gato).src.slice(1)), '--linha': folhaGato(gato).linha, '--linhas': folhaGato(gato).linhas } as CSSProperties} />
        </button>
        {gato === 'tala' && <span className="hd-balao" style={{ left: `${(237 / 480) * 100}%`, top: `${(148 / 200) * 100}%` }}>Tala ok. Retorno em 3 semanas.</span>}
        <span className="hd-particulas">{particulas.map((p, i) => <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, '--t': `${p.t}s`, '--d': `${p.d}s` } as CSSProperties} />)}</span>
      </div>
    </div>
  )
}

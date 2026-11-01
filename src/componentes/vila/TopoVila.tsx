import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { recurso } from '../../config'
import { usarPeriodo, type Periodo } from '../../estado/aparencia'
import { CorujaPixel, type EstadoCoruja } from '../../biblioteca/sala/CorujaPixel'
import { GatoPixel } from '../mascote/GatoPixel'
import type { IdLinhaGato } from '../mascote/sprites'
import { CONCEITOS_CORUJA, FALAS_GATO, proximaFala } from '../mascote/falasBichos'
import '../../estilos/componentes/Cristal.css'
import './TopoVila.css'

/*
 * Topo pintado das páginas da vila (01/11/2026), na família do observatório do Desempenho: a cena HD-2D da hora do
 * dia (scripts/gerar_cena_<arquivo>.py, 480 x 160 de arte), o título e a mensagem sobre a parte calma da esquerda e,
 * logo abaixo, a "bancada" com os números e as ações, que nunca cobre a arte. A coruja pousa num ponto firme da
 * pintura e o gato fica no chão livre; um toque em cada um traz uma fala (a coruja explica um conceito de prova, o
 * gato reclama de preguiça), um de cada vez. No celular só aparece o recorte de x 184 até a borda (-movel.webp).
 */

/** Uma luz que tremula por cima da pintura (a chama já está pintada; aqui só o brilho que respira). */
type Chama = { x: number; y: number; r: number; horas?: Periodo[] }
export type CenaVila = {
  arquivo: string
  /** Pés da coruja (o ponto firme da pintura) e canto de cima à esquerda do gato (caixa de 34 x 25,5). */
  coruja: { x: number; y: number }
  gato: { x: number; y: number; estado: IdLinhaGato; acordado: IdLinhaGato }
  chamas: Chama[]
  /** Onde a poeira (ou o vaga-lume, à noite) flutua: x, y, largura e altura na arte. */
  particulas?: [number, number, number, number]
}

const ARTE = { w: 480, h: 160, movelX: 184 }
const lugar = (x: number, y: number, w: number, h: number) => ({
  '--l': `${(x / ARTE.w) * 100}%`, '--lm': `${((x - ARTE.movelX) / (ARTE.w - ARTE.movelX)) * 100}%`,
  '--t': `${(y / ARTE.h) * 100}%`, '--w': `${(w / ARTE.w) * 100}%`, '--wm': `${(w / (ARTE.w - ARTE.movelX)) * 100}%`, '--h': `${(h / ARTE.h) * 100}%`,
}) as CSSProperties
/** Os pontos de poeira, cada um no seu ritmo (fixos: a cena não sorteia nada a cada visita). */
const PONTOS = [[0.12, 0.3, 7, 0], [0.3, 0.55, 9, -3], [0.46, 0.18, 8, -5], [0.62, 0.7, 10, -2], [0.2, 0.82, 9, -6], [0.78, 0.4, 11, -4], [0.9, 0.62, 8, -1], [0.55, 0.9, 10, -7]]
/** A coruja não fica parada como um enfeite: olha, lê e às vezes acena. */
const ROTINA_CORUJA: EstadoCoruja[] = ['parada', 'olhando', 'parada', 'lendo', 'lendo', 'parada']
const CORUJA = { w: 44, h: 32 }

function Bichos({ cena, dicas }: { cena: CenaVila; dicas: readonly string[] }) {
  const [fala, definirFala] = useState<{ quem: 'coruja' | 'gato'; texto: string } | null>(null)
  const [passo, definirPasso] = useState(0)
  const [acenou, definirAcenou] = useState(0)
  const [gatoAcordado, definirGatoAcordado] = useState(false)
  const toquesCoruja = useRef(0)
  // A fala some sozinha (a coruja dá tempo de ler o conceito; o gato é curto).
  useEffect(() => {
    if (!fala) return
    const t = window.setTimeout(() => definirFala(null), fala.quem === 'coruja' ? 11000 : 5500)
    return () => window.clearTimeout(t)
  }, [fala])
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => { if (!document.hidden) definirPasso((p) => (p + 1) % ROTINA_CORUJA.length) }, 5200)
    return () => window.clearInterval(t)
  }, [])
  const tocarCoruja = () => {
    toquesCoruja.current++
    definirAcenou((n) => n + 1)
    // A cada quatro toques, uma dica da própria página no lugar do conceito.
    const texto = dicas.length && toquesCoruja.current % 4 === 0 ? dicas[(toquesCoruja.current / 4 - 1) % dicas.length] : proximaFala('coruja', CONCEITOS_CORUJA)
    definirFala({ quem: 'coruja', texto })
  }
  const tocarGato = () => { definirGatoAcordado(true); definirFala({ quem: 'gato', texto: proximaFala('gato', FALAS_GATO) }) }
  const { coruja, gato } = cena
  const estadoCoruja: EstadoCoruja = fala?.quem === 'coruja' ? 'acenando' : ROTINA_CORUJA[passo]
  // O balão abre para o lado de dentro da cena (os bichos ficam à direita, então ele cresce para a esquerda). Coruja
  // pousada alto não tem céu para o balão: ele abre para baixo, com a ponta nos pés dela.
  const embaixo = fala?.quem === 'coruja' && coruja.y < 100
  const ponta = fala?.quem === 'coruja' ? (embaixo ? { x: coruja.x, y: coruja.y + 2 } : { x: coruja.x, y: coruja.y - CORUJA.h + 3 }) : { x: gato.x + 17, y: gato.y + 2 }
  return <>
    <button type="button" className="vl-bicho vl-coruja" aria-label="A coruja: tocar para ouvir um conceito de prova" onClick={tocarCoruja}
      style={lugar(coruja.x - CORUJA.w / 2, coruja.y - CORUJA.h * 31 / 32, CORUJA.w, CORUJA.h)}>
      <CorujaPixel key={`${estadoCoruja}-${acenou}`} estado={estadoCoruja} />
    </button>
    <button type="button" className="vl-bicho vl-gato" aria-label="O gato: tocar para ouvir o que ele acha" onClick={tocarGato}
      style={lugar(gato.x, gato.y, 34, 25.5)}>
      <GatoPixel estado={gatoAcordado ? gato.acordado : gato.estado} />
    </button>
    {fala && <span className={`vl-balao vl-balao--${fala.quem}${embaixo ? ' vl-balao--embaixo' : ''}`} role="status" onClick={() => definirFala(null)} style={lugar(ponta.x, ponta.y, 0, 0)}>{fala.texto}</span>}
  </>
}

function Palco({ cena, dicas }: { cena: CenaVila; dicas: readonly string[] }) {
  const periodo = usarPeriodo()
  const palco = useRef<HTMLDivElement>(null)
  const [visivel, definirVisivel] = useState(true)
  // Fora da tela, chama e poeira param (nada de animação gastando bateria lá embaixo na página).
  useEffect(() => {
    const el = palco.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => definirVisivel(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const arte = (sufixo: string) => recurso(`pixel/paginas/${cena.arquivo}-${periodo}${sufixo}.webp`)
  const p = cena.particulas
  return (
    <div ref={palco} className={`vl-palco vl-palco--${periodo}${visivel ? '' : ' vl-palco--parado'}`}>
      {/* Só a variante da hora e do tamanho certos é baixada: o <source> do celular é o recorte próprio da cena. */}
      <picture aria-hidden="true">
        <source media="(max-width: 40rem)" srcSet={arte('-movel')} width={888} height={480} />
        <img className="vl-palco__arte" src={arte('')} srcSet={`${arte('-960')} 960w, ${arte('')} 1440w`} sizes="(max-width: 76rem) 100vw, 76rem"
          width={1440} height={480} alt="" decoding="async" fetchPriority="high" draggable={false} />
      </picture>
      {cena.chamas.filter((c) => !c.horas || c.horas.includes(periodo)).map((c, i) => (
        <span key={i} aria-hidden="true" className="vl-palco__peca vl-palco__chama" style={{ ...lugar(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2), '--atraso': `${-i * 1.1}s` } as CSSProperties} />
      ))}
      {p && <span aria-hidden="true" className="vl-palco__peca vl-palco__poeira" style={lugar(p[0], p[1], p[2], p[3])}>
        {PONTOS.map(([x, y, t, d], i) => <i key={i} style={{ left: `${x * 100}%`, top: `${y * 100}%`, '--t': `${t}s`, '--d': `${d}s` } as CSSProperties} />)}
      </span>}
      <Bichos cena={cena} dicas={dicas} />
    </div>
  )
}

/**
 * O topo: `cabeca` (selo e título) e `texto` (mensagem e ações principais) ficam sobre a arte no computador; a
 * `bancada` (números e atalhos) fica logo abaixo. No celular a arte vira uma janela inteira em cima e o resto desce.
 */
export function TopoVila({ cena, cabeca, texto, bancada, dicas = [], className = '', rotulo }: {
  cena: CenaVila; cabeca: ReactNode; texto: ReactNode; bancada?: ReactNode; dicas?: readonly string[]; className?: string; rotulo: string
}) {
  const periodo = usarPeriodo()
  return (
    // A classe da página vem antes: base.css dá padding de celular a toda seção cuja classe termina em "-heroi".
    <section className={`${className} vl vl--${cena.arquivo} vl--${periodo}`.trim()} aria-labelledby={rotulo}>
      <div className="vl__cena">
        <Palco cena={cena} dicas={dicas} />
        <div className="vl__cabeca">{cabeca}</div>
        <div className="vl__texto">{texto}</div>
      </div>
      {bancada && <div className="vl__bancada">{bancada}</div>}
    </section>
  )
}

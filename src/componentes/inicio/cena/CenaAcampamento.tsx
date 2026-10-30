import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import { recurso } from '../../../config'
import { GATO_ACORDADO, GATO_DORMINDO, PALETA_GATO, type Grade, type Paleta } from '../../../biblioteca/salao/sprites'
import {
  BARRACA, LANTERNA, LIVROS, PALETA_BARRACA, PALETA_LANTERNA, PALETA_LIVROS, PALETA_RESIDENTE, PALETA_TRONCO, RESIDENTE, RESIDENTE_DORMINDO, TRONCO,
} from './artes'

/**
 * Cena do topo da página inicial (30/10/2026, pedido do Tales com o Octopath Traveler II de referência): um acampamento
 * em pixel art com luz "HD-2D". Tudo num SVG só, de 320 x 150 pixels de arte: céu, montanhas e mata ao fundo com
 * desfoque (profundidade de campo), a clareira, a barraca, o residente lendo no tronco, o gato e a fogueira. A fogueira
 * é a da sequência de dias (mesma folha de sprites do painel, um estágio por linha). A luz segue o relógio: manhã,
 * tarde e noite (o tema escuro força a noite). Decoração: o leitor de tela pula a cena (aria-hidden).
 *
 * Segredos: cinco cliques no residente e ele cochila; um clique no gato e ele aparece com uma tala.
 */
export type Periodo = 'manha' | 'tarde' | 'noite'

export function periodoAgora(d = new Date()): Periodo {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' }).format(d))
  return h >= 5 && h < 12 ? 'manha' : h >= 12 && h < 18 ? 'tarde' : 'noite'
}

/** Pixels de uma grade como retângulos (uma corrida da mesma cor por retângulo), deslocados para (x, y). */
function pixels(grade: Grade, paleta: Paleta, x: number, y: number, chave: string): ReactElement {
  const r: ReactElement[] = []
  grade.forEach((linha, j) => {
    let i = 0
    while (i < linha.length) {
      const c = linha[i]
      let f = i + 1
      while (f < linha.length && linha[f] === c) f++
      if (c !== '.' && paleta[c]) r.push(<rect key={`${i}-${j}`} x={x + i} y={y + j} width={f - i} height={1} fill={paleta[c]} />)
      i = f
    }
  })
  return <g key={chave}>{r}</g>
}

/** Sorteio fixo (mesma cena em toda abertura). */
function sorteio(semente: number) {
  let s = semente
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/** O cenário parado: montanhas, mata, chão e as árvores da frente (memo: não muda entre renders). */
const Cenario = memo(function Cenario() {
  const montes: ReactElement[] = []
  for (let x = 0; x < 320; x += 2) {
    const h = Math.round(52 + 12 * Math.sin(x / 26) + 6 * Math.sin(x / 9 + 1.3) + 4 * Math.sin(x / 4.3))
    montes.push(<rect key={x} x={x} y={h} width={2} height={96 - h} />)
  }
  const sorte = sorteio(11)
  const mata: ReactElement[] = []
  for (let x = -4, k = 0; x < 324; x += 6 + Math.floor(sorte() * 5), k++) {
    const alto = 16 + Math.floor(sorte() * 14), base = 92 + Math.floor(sorte() * 3)
    for (let j = 0; j < alto; j++) {
      const larg = 1 + Math.floor(j / 2) * 2
      mata.push(<rect key={`${k}-${j}`} x={x - Math.floor(larg / 2)} y={base - alto + j} width={larg} height={1} className={j % 5 === 0 ? 'cn-mata-luz' : undefined} />)
    }
    mata.push(<rect key={`${k}-t`} x={x} y={base} width={1} height={3} className="cn-tronco-fundo" />)
  }
  const chao: ReactElement[] = []
  const s2 = sorteio(29)
  for (let k = 0; k < 520; k++) {
    const x = Math.floor(s2() * 320), y = 95 + Math.floor(s2() * 55)
    chao.push(<rect key={k} x={x} y={y} width={1 + Math.floor(s2() * 3)} height={1} className={s2() < 0.5 ? 'cn-grama-luz' : 'cn-grama-escura'} />)
  }
  const clareira: ReactElement[] = []
  for (let y = 104; y < 136; y++) {
    const t = (y - 120) / 16, meia = Math.round(92 * Math.sqrt(Math.max(0, 1 - t * t)))
    if (meia > 0) clareira.push(<rect key={y} x={172 - meia} y={y} width={meia * 2} height={1} />)
  }
  const tufos: ReactElement[] = []
  const s3 = sorteio(5)
  for (let k = 0; k < 70; k++) {
    const x = Math.floor(s3() * 320), y = 98 + Math.floor(s3() * 50)
    if (Math.abs(x - 172) < 80 && y > 106 && y < 134) continue
    tufos.push(<path key={k} d={`M${x} ${y}h1v-2h1v2h1v-3h1v3h1v1h-5z`} />)
  }
  return (
    <>
      <g className="cn-montes" filter="url(#cn-desfoque-longe)">{montes}</g>
      <g className="cn-mata" filter="url(#cn-desfoque-meio)">{mata}</g>
      <rect className="cn-chao" x={0} y={94} width={320} height={56} />
      <g className="cn-chao-pontos">{chao}</g>
      <g className="cn-clareira">{clareira}</g>
      <g className="cn-tufos">{tufos}</g>
    </>
  )
})

/** As árvores da frente, escuras e desfocadas (o primeiro plano da profundidade de campo). */
const PrimeiroPlano = memo(function PrimeiroPlano() {
  const copa = (cx: number, cy: number, r: number, k: string) => {
    const linhas: ReactElement[] = []
    for (let y = -r; y <= r; y += 2) {
      const meia = Math.round(Math.sqrt(r * r - y * y))
      linhas.push(<rect key={`${k}${y}`} x={cx - meia} y={cy + y} width={meia * 2} height={2} />)
    }
    return linhas
  }
  return (
    <g className="cn-frente" filter="url(#cn-desfoque-perto)">
      <rect x={14} y={30} width={9} height={120} className="cn-frente-tronco" />
      {copa(16, 22, 30, 'a')}{copa(-6, 50, 24, 'b')}{copa(306, 18, 28, 'c')}{copa(326, 52, 22, 'd')}
      <rect x={300} y={40} width={8} height={110} className="cn-frente-tronco" />
      {copa(30, 150, 18, 'e')}{copa(292, 152, 20, 'f')}
    </g>
  )
})

/** Balão de fala em pixel, dentro da cena (acompanha o enquadramento em qualquer tela). */
function Balao({ x, y, texto }: { x: number; y: number; texto: string }) {
  const w = Math.ceil(texto.length * 2.2) + 8
  // Fica no meio da cena, entre o cartão e o painel da sequência.
  const esq = Math.max(110, Math.min(228 - w, x - w / 2))
  return (
    <g className="cn-balao">
      <rect x={esq} y={y - 9} width={w} height={8} fill="#fbf3df" stroke="#1b1208" strokeWidth={0.6} />
      <path d={`M${x - 1} ${y - 1}h3l-2 2z`} fill="#fbf3df" />
      <text x={esq + w / 2} y={y - 3.6} textAnchor="middle">{texto}</text>
    </g>
  )
}

export function CenaAcampamento({ linhaFogo, estagio, periodo }: { linhaFogo: number; estagio: string; periodo: Periodo }) {
  const [cliques, definirCliques] = useState(0)
  const [gatoTala, definirGatoTala] = useState(false)
  const [gatoAcordado, definirGatoAcordado] = useState(false)
  const dormindo = cliques >= 5
  const cena = useRef<HTMLDivElement>(null)

  // Parallax leve com o mouse (computador, sem "menos animação"): cada camada anda um pouco, as do fundo menos.
  useEffect(() => {
    const el = cena.current
    if (!el || !window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return
    let quadro = 0
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
        el.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
      })
    }
    const sair = () => { el.style.setProperty('--px', '0'); el.style.setProperty('--py', '0') }
    const alvo = el.closest('.cn-heroi') ?? el
    alvo.addEventListener('pointermove', mover as EventListener)
    alvo.addEventListener('pointerleave', sair)
    return () => { cancelAnimationFrame(quadro); alvo.removeEventListener('pointermove', mover as EventListener); alvo.removeEventListener('pointerleave', sair) }
  }, [])

  const clicarResidente = () => definirCliques((n) => (n >= 5 ? 0 : n + 1))
  const clicarGato = () => {
    if (!gatoAcordado) { definirGatoAcordado(true); return }
    definirGatoTala(true)
  }
  const gato = gatoAcordado ? GATO_ACORDADO : GATO_DORMINDO
  const paletaGato = useMemo(() => (gatoTala ? { ...PALETA_GATO, p: '#5aa0d8' } : PALETA_GATO), [gatoTala])
  const vagalumes = useMemo(() => { const s = sorteio(3); return Array.from({ length: 14 }, () => ({ x: 8 + s() * 84, y: 30 + s() * 55, t: 4 + s() * 5, d: -s() * 6 })) }, [])
  const brasas = useMemo(() => { const s = sorteio(17); return Array.from({ length: 10 }, () => ({ x: (s() - 0.5) * 3, t: 2.2 + s() * 2, d: -s() * 3 })) }, [])

  return (
    <div ref={cena} className={`cn-cena cn-cena--${periodo} cn-fogo--${estagio}`} aria-hidden="true">
      <svg className="cn-svg" viewBox="0 0 320 150" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges">
        <defs>
          <linearGradient id="cn-ceu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="cn-ceu-1" /><stop offset="0.55" className="cn-ceu-2" /><stop offset="1" className="cn-ceu-3" />
          </linearGradient>
          <radialGradient id="cn-luz-fogo"><stop offset="0" stopColor="#ffd27a" stopOpacity="0.85" /><stop offset="0.45" stopColor="#ff9a3a" stopOpacity="0.3" /><stop offset="1" stopColor="#ff7a1a" stopOpacity="0" /></radialGradient>
          <radialGradient id="cn-luz-lanterna"><stop offset="0" stopColor="#ffe6a0" stopOpacity="0.7" /><stop offset="1" stopColor="#ffb040" stopOpacity="0" /></radialGradient>
          <filter id="cn-desfoque-longe" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="1.1" /></filter>
          <filter id="cn-desfoque-meio" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="0.55" /></filter>
          <filter id="cn-desfoque-perto" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" /></filter>
        </defs>
        <rect width={320} height={150} fill="url(#cn-ceu)" />
        <g className="cn-astro"><circle className="cn-sol" cx={250} cy={26} r={11} /><circle className="cn-lua" cx={244} cy={24} r={8} /></g>
        <g className="cn-estrelas">{[[30, 12], [62, 26], [94, 8], [128, 20], [170, 10], [204, 30], [276, 14], [300, 34], [112, 38], [150, 30], [44, 40], [224, 8]].map(([x, y], i) => <rect key={i} x={x} y={y} width={1} height={1} style={{ '--i': i } as CSSProperties} />)}</g>

        <g className="cn-camada cn-camada--fundo"><Cenario /></g>

        <g className="cn-camada cn-camada--meio">
          {/* Sombra dos objetos no chão, para o lado oposto ao fogo. */}
          <g className="cn-sombras"><ellipse cx={128} cy={110} rx={14} ry={2} /><ellipse cx={196} cy={119} rx={15} ry={2} /><ellipse cx={219} cy={121} rx={10} ry={1.5} /></g>
          {pixels(BARRACA, PALETA_BARRACA, 116, 96, 'barraca')}
          {pixels(TRONCO, PALETA_TRONCO, 181, 114, 'tronco')}
          <g className="cn-residente" onClick={clicarResidente} style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
            {pixels(dormindo ? RESIDENTE_DORMINDO : RESIDENTE, PALETA_RESIDENTE, 185, 96, 'residente')}
          </g>
          {pixels(LIVROS, PALETA_LIVROS, 138, 113, 'livros')}
          <g className={'cn-gato' + (gatoAcordado ? ' cn-gato--acordado' : '')} onClick={clicarGato} style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
            {pixels(gato, paletaGato, 207, 112, 'gato')}
          </g>
        </g>

        <g className="cn-camada cn-camada--frente"><PrimeiroPlano /></g>

        {/* Luz da cena: a cor do período por cima de tudo (multiplicar) e as luzes quentes por cima da cor (tela). */}
        <rect className="cn-tom" width={320} height={150} />
        {/* O que emite luz fica por cima da cor do período: a fogueira e a lanterna não escurecem à noite. */}
        <g className="cn-camada cn-camada--meio">
          {pixels(LANTERNA, PALETA_LANTERNA, 199, 103, 'lanterna')}
          {/* A fogueira da sequência: a folha de sprites do painel (32 x 36 por quadro, 4 quadros, um estágio por linha). */}
          <svg x={148} y={84} width={32} height={36} viewBox="0 0 32 36" overflow="hidden">
            <image className="cn-fogo" href={recurso('pixel/inicio/fogueira-estagios.png')} width={128} height={288} y={-36 * linhaFogo} style={{ imageRendering: 'pixelated' }} />
          </svg>
        </g>
        <g className="cn-luzes">
          <circle className="cn-luz-fogo" cx={164} cy={110} r={linhaFogo === 0 ? 0 : 70} fill="url(#cn-luz-fogo)" />
          <circle className="cn-luz-lanterna" cx={203} cy={108} r={20} fill="url(#cn-luz-lanterna)" />
        </g>
        {linhaFogo > 0 && <g className="cn-brasas">{brasas.map((b, i) => <rect key={i} x={164 + b.x} y={96} width={1} height={1} style={{ '--t': `${b.t}s`, '--d': `${b.d}s`, '--dx': `${b.x * 2}px` } as CSSProperties} />)}</g>}
        {dormindo && <Balao x={193} y={88} texto="Zzz… plantão de 24 h conta?" />}
        {gatoTala && <Balao x={218} y={104} texto="Tala ok. Retorno em 3 semanas." />}
      </svg>

      <span className="cn-raios" />
      <span className="cn-vinheta" />
      <span className="cn-vagalumes">{vagalumes.map((v, i) => <i key={i} style={{ left: `${v.x}%`, top: `${v.y}%`, '--t': `${v.t}s`, '--d': `${v.d}s` } as CSSProperties} />)}</span>
      <span className="cn-folhas">{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ left: `${10 + i * 16}%`, '--d': `${-i * 2.3}s`, '--t': `${11 + (i % 3) * 3}s` } as CSSProperties} />)}</span>
    </div>
  )
}

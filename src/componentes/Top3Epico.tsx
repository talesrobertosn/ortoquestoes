import type { ReactNode } from 'react'
import '@fontsource/cinzel/latin-700.css'
import '@fontsource/cinzel/latin-900.css'

/**
 * Top 3 do ranking das questões (14/10/2026): "Hall da Fama" em arte 2D vetorial.
 * Palco à noite com holofotes, brasões de ouro, prata e bronze com a posição,
 * faixa com o nome, pedestais metálicos e louros atrás do campeão.
 * Tudo em SVG e CSS: nítido em qualquer tela, sem imagem pintada.
 */
export interface LugarTop3 { posicao: number; nome: string; total: string; rotuloTotal: string; ehVoce?: boolean; extra?: ReactNode }

const TITULO = ['', 'Campeão', 'Vice', '3º lugar']
const METAL: Record<number, [string, string, string, string]> = {
  // claro, médio, escuro, brilho
  1: ['#fff3b8', '#f2c14e', '#9a6a12', '#fffbe6'],
  2: ['#ffffff', '#c9d3df', '#6c7a8c', '#ffffff'],
  3: ['#ffd7b0', '#d98a4e', '#7a3f18', '#fff0e2'],
}

function Brasao({ posicao }: { posicao: number }) {
  const [claro, medio, escuro, brilho] = METAL[posicao]
  const id = `t3b${posicao}`
  return (
    <svg className="t3__brasao" viewBox="0 0 120 140" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={claro} /><stop offset="0.45" stopColor={medio} /><stop offset="1" stopColor={escuro} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={posicao === 1 ? '#7a1420' : posicao === 2 ? '#14306e' : '#3c1a52'} />
          <stop offset="1" stopColor={posicao === 1 ? '#3a0710' : posicao === 2 ? '#0a1838' : '#1c0c28'} />
        </linearGradient>
        <linearGradient id={`${id}n`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={brilho} /><stop offset="0.55" stopColor={medio} /><stop offset="1" stopColor={escuro} />
        </linearGradient>
      </defs>
      {/* escudo: borda de metal e campo esmaltado */}
      <path d="M60 4 L112 18 V64 C112 98 90 122 60 136 C30 122 8 98 8 64 V18 Z" fill={`url(#${id}m)`} />
      <path d="M60 13 L103 25 V64 C103 93 85 113 60 126 C35 113 17 93 17 64 V25 Z" fill={`url(#${id}f)`} />
      <path d="M60 13 L103 25 V40 C80 34 40 34 17 40 V25 Z" fill="#ffffff" opacity="0.1" />
      {/* estrelas de cada lado */}
      {[34, 86].map((x) => <path key={x} d={`M${x} 34 l2.4 5 5.4 .6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z`} fill={medio} />)}
      <text x="60" y="94" textAnchor="middle" className="t3__brasao-numero" fill={`url(#${id}n)`} stroke={escuro} strokeWidth="1.5" paintOrder="stroke">{posicao}</text>
    </svg>
  )
}

/** Coroa vetorial sobre o brasão do campeão. */
function Coroa() {
  return (
    <svg className="t3__coroa" viewBox="0 0 100 60" aria-hidden="true">
      <defs>
        <linearGradient id="t3coroa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6c4" /><stop offset="0.5" stopColor="#f2c14e" /><stop offset="1" stopColor="#8a5a0c" /></linearGradient>
      </defs>
      <path d="M8 50 L4 14 L28 32 L50 4 L72 32 L96 14 L92 50 Z" fill="url(#t3coroa)" stroke="#6b4508" strokeWidth="2" strokeLinejoin="round" />
      <rect x="8" y="48" width="84" height="9" rx="2" fill="url(#t3coroa)" stroke="#6b4508" strokeWidth="2" />
      <circle cx="50" cy="30" r="5" fill="#e0304a" /><circle cx="28" cy="38" r="3.5" fill="#3a7bf0" /><circle cx="72" cy="38" r="3.5" fill="#3a7bf0" />
      {[4, 50, 96].map((x, i) => <circle key={x} cx={x} cy={i === 1 ? 4 : 14} r="4" fill="#fff6c4" stroke="#6b4508" strokeWidth="1.5" />)}
    </svg>
  )
}

/** Ramos de louro dourado atrás do campeão: caule em arco e folhas alternadas. */
function Louros() {
  const ramo = Array.from({ length: 11 }, (_, i) => {
    const ang = 104 + i * 12.5, rad = (ang * Math.PI) / 180
    const raio = 84 + (i % 2 ? 9 : -9)
    const x = 100 + Math.cos(rad) * raio, y = 100 + Math.sin(rad) * raio
    const giro = ang + 90 + (i % 2 ? 28 : -28)
    const tam = 15 - i * 0.55
    return <ellipse key={i} cx={x} cy={y} rx={tam} ry={tam * 0.38} transform={`rotate(${giro} ${x} ${y})`} fill="url(#t3louro)" stroke="#7a5208" strokeWidth="0.8" />
  })
  const caule = <path d={`M ${100 + Math.cos(1.74) * 84} ${100 + Math.sin(1.74) * 84} A 84 84 0 0 1 ${100 + Math.cos(4.24) * 84} ${100 + Math.sin(4.24) * 84}`} fill="none" stroke="#b98318" strokeWidth="2.4" strokeLinecap="round" />
  return (
    <svg className="t3__louros" viewBox="0 0 200 200" aria-hidden="true">
      <defs><linearGradient id="t3louro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3b0" /><stop offset="0.5" stopColor="#f2c14e" /><stop offset="1" stopColor="#a8720f" /></linearGradient></defs>
      <g>{caule}{ramo}</g>
      <g transform="translate(200 0) scale(-1 1)">{caule}{ramo}</g>
    </svg>
  )
}

/** Partículas douradas e luzes da plateia, fixas para não mudar a cada render. */
const LUZES = Array.from({ length: 26 }, (_, i) => ({ x: (i * 37.3) % 100, y: 8 + ((i * 53.7) % 60), r: 2 + (i % 4), d: -((i * 0.71) % 6) }))

export function Top3Epico({ lugares, titulo, subtitulo, chamada }: { lugares: LugarTop3[]; titulo: string; subtitulo: string; chamada?: ReactNode }) {
  return (
    <section className="t3" aria-labelledby="t3-titulo">
      <div className="t3__fundo" aria-hidden="true">
        <span className="t3__feixe t3__feixe--esq" /><span className="t3__feixe t3__feixe--meio" /><span className="t3__feixe t3__feixe--dir" />
        {LUZES.map((l, i) => <i key={i} className="t3__luz" style={{ left: `${l.x}%`, top: `${l.y}%`, width: l.r * 2, height: l.r * 2, animationDelay: `${l.d}s` }} />)}
      </div>
      <header className="t3__cabeca">
        <p className="t3__selo">Hall da Fama</p>
        <h2 id="t3-titulo" className="t3__titulo">{titulo}</h2>
        <p className="t3__sub">{subtitulo}</p>
      </header>
      <ol className="t3__podio">
        {lugares.map((l) => (
          <li key={l.posicao} className={`t3__lugar t3__lugar--${l.posicao}${l.ehVoce ? ' t3__lugar--voce' : ''}`}>
            <div className="t3__emblema">
              {l.posicao === 1 && <><Louros /><Coroa /></>}
              <Brasao posicao={l.posicao} />
            </div>
            <div className="t3__faixa"><strong className="t3__nome">{l.nome}</strong></div>
            {l.ehVoce && <span className="t3__voce">você</span>}
            <p className="t3__total"><b className="numerico">{l.total}</b> {l.rotuloTotal}</p>
            {l.extra}
            <div className="t3__pedestal"><span className="t3__pedestal-titulo">{TITULO[l.posicao]}</span></div>
          </li>
        ))}
      </ol>
      {chamada && <p className="t3__chamada">{chamada}</p>}
    </section>
  )
}

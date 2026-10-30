import type { CSSProperties, ReactNode } from 'react'
import type { Fantasia, IdComportamento } from './comportamentos'

/**
 * O esqueleto mascote em SVG (30/10/2026, personagem original no estilo chibi de desenho animado). Montado por
 * articulações: cada parte é um grupo que gira em volta do próprio ponto de articulação (ombro, cotovelo, punho,
 * quadril, joelho, pescoço, mandíbula), e as animações de cada comportamento (Mascote.css) só giram esses grupos.
 * Os objetos ficam presos à mão que segura, então acompanham o braço. Reaproveitável em qualquer tamanho.
 *
 * Desenho: crânio grande com rachadura, órbitas pretas com brilho, nariz de coração, sorriso de dentes com a mandíbula
 * separada (abre para falar, bocejar e mastigar), costelas, coluna e pelve, ossos com contorno grosso e pontas de bolinha.
 */
const TINTA = '#2b2320'
const OSSO = '#f6efdf'
const SOMBRA = '#ddd1b8'

/** Um osso: o traço escuro por baixo e o claro por cima (o contorno de desenho animado), com as pontas em bolinha. */
function Osso({ x1, y1, x2, y2, g = 7 }: { x1: number; y1: number; x2: number; y2: number; g?: number }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={TINTA} strokeWidth={g + 5} strokeLinecap="round" />
      <circle cx={x1} cy={y1} r={g * 0.78 + 2.5} fill={TINTA} /><circle cx={x2} cy={y2} r={g * 0.78 + 2.5} fill={TINTA} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={OSSO} strokeWidth={g} strokeLinecap="round" />
      <circle cx={x1} cy={y1} r={g * 0.78} fill={OSSO} /><circle cx={x2} cy={y2} r={g * 0.78} fill={OSSO} />
      <line x1={x1 + 1.5} y1={y1 + 1} x2={x2 + 1.5} y2={y2 + 1} stroke={SOMBRA} strokeWidth={g * 0.35} strokeLinecap="round" opacity={0.9} />
    </g>
  )
}

/** Grupo que gira em volta de uma articulação (x, y em unidades do desenho). */
function Junta({ nome, x, y, children }: { nome: string; x: number; y: number; children: ReactNode }) {
  return <g className={`mq-${nome}`} style={{ transformOrigin: `${x}px ${y}px` } as CSSProperties}>{children}</g>
}

function Mao({ lado }: { lado: 1 | -1 }) {
  return (
    <g>
      {[-1, 0, 1].map((k) => <Osso key={k} x1={0} y1={0} x2={k * 4.5 * lado + lado * 1} y2={9 - Math.abs(k)} g={3.4} />)}
      <Osso x1={0} y1={0} x2={-lado * 6} y2={4} g={3.4} />
      <circle r={6.2} fill={TINTA} /><circle r={4} fill={OSSO} />
    </g>
  )
}

/* ─────────────── Objetos ─────────────── */
const Livro = () => (
  <g className="mq-obj-livro">
    <path d="M-30 -4 Q-15 -12 0 -6 Q15 -12 30 -4 L30 18 Q15 10 0 16 Q-15 10 -30 18 Z" fill="#b8452f" stroke={TINTA} strokeWidth={3.5} strokeLinejoin="round" />
    <path d="M-27 -6 Q-14 -13 0 -7 L0 13 Q-14 7 -27 14 Z" fill="#fffaf0" stroke={TINTA} strokeWidth={2.5} strokeLinejoin="round" />
    <path className="mq-pagina" d="M27 -6 Q14 -13 0 -7 L0 13 Q14 7 27 14 Z" fill="#fffaf0" stroke={TINTA} strokeWidth={2.5} strokeLinejoin="round" />
    {[0, 1, 2, 3].map((k) => <g key={k} stroke="#9a8a6a" strokeWidth={1.6} strokeLinecap="round"><line x1={-22} y1={-2 + k * 4} x2={-6} y2={-4 + k * 4} /><line x1={6} y1={-4 + k * 4} x2={22} y2={-2 + k * 4} /></g>)}
  </g>
)
const Caneca = () => (
  <g>
    <g className="mq-vapor" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" opacity={0.85}>
      <path d="M-5 -22 q4 -6 0 -12 q-4 -6 0 -12" /><path d="M4 -20 q4 -6 0 -12 q-4 -6 0 -12" />
    </g>
    <path d="M10 -6 q10 0 10 8 q0 8 -10 8" fill="none" stroke={TINTA} strokeWidth={7} /><path d="M10 -6 q10 0 10 8 q0 8 -10 8" fill="none" stroke="#c0392b" strokeWidth={3} />
    <rect x={-12} y={-14} width={24} height={26} rx={5} fill="#c0392b" stroke={TINTA} strokeWidth={3.5} />
    <ellipse cx={0} cy={-13} rx={10} ry={3} fill="#5a3418" />
    <rect x={-8} y={-6} width={3.5} height={12} rx={1.5} fill="#fff" opacity={0.6} />
  </g>
)
const RaioX = () => (
  <g>
    <rect x={-24} y={-32} width={48} height={60} rx={4} fill="#152238" stroke={TINTA} strokeWidth={3.5} />
    <rect className="mq-raiox-luz" x={-21} y={-29} width={42} height={54} rx={2} fill="#2c4a74" />
    <g stroke="#e4f2ff" strokeWidth={4.5} strokeLinecap="round" fill="none"><path d="M2 -18 q-8 -2 -10 6 M-4 -10 L4 20" /></g>
    <circle cx={-9} cy={-15} r={6} fill="#e4f2ff" />
  </g>
)
const Ossinho = ({ c }: { c: string }) => (
  <g className={c}><Osso x1={-7} y1={0} x2={7} y2={0} g={4.5} /></g>
)
const Martelo = () => (
  <g>
    <line x1={0} y1={0} x2={0} y2={-34} stroke={TINTA} strokeWidth={6} strokeLinecap="round" /><line x1={0} y1={0} x2={0} y2={-34} stroke="#c8ced8" strokeWidth={3} strokeLinecap="round" />
    <path d="M-12 -40 L12 -40 L4 -30 L-4 -30 Z" fill="#c83a3a" stroke={TINTA} strokeWidth={3} strokeLinejoin="round" />
  </g>
)
const Maca = () => (
  <g>
    <path d="M0 -10 C-14 -18 -20 2 -10 12 C-4 18 4 18 10 12 C20 2 14 -18 0 -10 Z" fill="#d23a2a" stroke={TINTA} strokeWidth={3.5} />
    <circle className="mq-mordida" cx={12} cy={-2} r={6} fill="#fff8e0" stroke={TINTA} strokeWidth={2.5} />
    <path d="M0 -10 q2 -8 6 -10" stroke="#5a3418" strokeWidth={3} fill="none" strokeLinecap="round" />
    <path d="M4 -16 q8 -6 12 0 q-8 4 -12 0 Z" fill="#5fae4a" stroke={TINTA} strokeWidth={2} />
    <ellipse cx={-6} cy={-4} rx={3} ry={5} fill="#fff" opacity={0.45} />
  </g>
)
const Espeto = () => (
  <g>
    <line x1={0} y1={0} x2={-62} y2={22} stroke={TINTA} strokeWidth={5} strokeLinecap="round" /><line x1={0} y1={0} x2={-62} y2={22} stroke="#a8743e" strokeWidth={2.4} strokeLinecap="round" />
    <rect className="mq-marsh" x={-74} y={15} width={14} height={13} rx={4} fill="#fff8f0" stroke={TINTA} strokeWidth={3} transform="rotate(-20 -67 21)" />
  </g>
)
const Foice = () => (
  <g>
    <line x1={0} y1={34} x2={0} y2={-92} stroke={TINTA} strokeWidth={9} strokeLinecap="round" /><line x1={0} y1={34} x2={0} y2={-92} stroke="#8a5a30" strokeWidth={4.5} strokeLinecap="round" />
    <path d="M-2 -88 C 20 -112 64 -100 74 -64 C 58 -88 26 -92 -2 -76 Z" fill="#c9d2dc" stroke={TINTA} strokeWidth={3.5} strokeLinejoin="round" />
    <path d="M6 -88 C 28 -100 52 -94 64 -76" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" opacity={0.85} />
  </g>
)
const Sorvete = () => (
  <g>
    <path d="M-12 -6 L0 30 L12 -6 Z" fill="#e2b06a" stroke={TINTA} strokeWidth={3.2} strokeLinejoin="round" />
    <path d="M-8 2 L6 -4 M-6 10 L8 4 M-4 18 L5 14" stroke="#b07a3a" strokeWidth={1.6} />
    <circle cx={0} cy={-14} r={13} fill="#f48ab8" stroke={TINTA} strokeWidth={3.2} />
    <circle cx={-6} cy={-26} r={7} fill="#f48ab8" stroke={TINTA} strokeWidth={3} /><circle cx={5} cy={-27} r={6} fill="#f48ab8" stroke={TINTA} strokeWidth={3} />
    {[[-5, -12, '#ffe066'], [4, -17, '#7ad0ff'], [-2, -22, '#8ee08a'], [6, -9, '#fff']].map(([x, y, c], i) => <rect key={i} x={x as number} y={y as number} width={3.5} height={1.6} rx={0.8} fill={c as string} transform={`rotate(${i * 40} ${x} ${y})`} />)}
    <ellipse cx={-5} cy={-18} rx={3} ry={4} fill="#fff" opacity={0.5} />
  </g>
)
const Abobora = () => (
  <g>
    <path d="M-20 -14 Q0 -44 20 -14" fill="none" stroke={TINTA} strokeWidth={4} />
    <g className="mq-doces">{[[-8, -16, '#ffe066'], [3, -20, '#7ad0ff'], [10, -15, '#f48ab8']].map(([x, y, c], i) => <circle key={i} cx={x as number} cy={y as number} r={5} fill={c as string} stroke={TINTA} strokeWidth={2.2} />)}</g>
    <path d="M-24 -12 C-30 4 -18 20 0 20 C18 20 30 4 24 -12 C14 -18 -14 -18 -24 -12 Z" fill="#f08a24" stroke={TINTA} strokeWidth={3.5} />
    <path d="M-8 -12 Q-11 4 -8 18 M8 -12 Q11 4 8 18" fill="none" stroke="#c8641a" strokeWidth={2.4} />
    <path d="M-15 -4 l5 -5 l5 5 Z M5 -4 l5 -5 l5 5 Z" fill={TINTA} />
    <path d="M-13 6 q13 9 26 0 l-4 3 l-4 -3 l-5 3 l-5 -3 l-4 3 Z" fill={TINTA} />
  </g>
)
const Doce = () => <circle className="mq-doce-voando" cx={0} cy={0} r={5} fill="#ffe066" stroke={TINTA} strokeWidth={2.2} />
const Notas = () => (
  <g className="mq-notas" fill="#f0c46a" stroke={TINTA} strokeWidth={1.5}>
    <g className="mq-nota mq-nota--1"><ellipse cx={0} cy={0} rx={5} ry={4} /><rect x={3.5} y={-16} width={2.5} height={16} /></g>
    <g className="mq-nota mq-nota--2" fill="#7ad0ff"><ellipse cx={0} cy={0} rx={5} ry={4} /><rect x={3.5} y={-16} width={2.5} height={16} /><rect x={3.5} y={-16} width={10} height={3} /></g>
  </g>
)

/** O que cada comportamento põe em cada mão (as coordenadas são as da mão, no punho). */
function objetoMao(c: IdComportamento, lado: 1 | -1): ReactNode {
  if (lado === 1) {
    if (c === 'cafe') return <g transform="translate(4 8)"><Caneca /></g>
    if (c === 'reflexo') return <g transform="translate(0 6) rotate(-100)"><Martelo /></g>
    if (c === 'comer') return <g transform="translate(2 12)"><Maca /></g>
    if (c === 'sorvete') return <g transform="translate(2 4)"><Sorvete /></g>
    if (c === 'doces') return <g transform="translate(0 4)"><Doce /></g>
  } else {
    if (c === 'raiox') return <g transform="translate(-4 -26)"><RaioX /></g>
    if (c === 'marshmallow') return <g transform="translate(0 4)"><Espeto /></g>
    if (c === 'foice') return <g transform="translate(0 4)"><Foice /></g>
    if (c === 'doces') return <g transform="translate(0 30)"><Abobora /></g>
  }
  return null
}

export function EsqueletoSvg({ comportamento, fantasia }: { comportamento: IdComportamento; fantasia: Fantasia }) {
  const halloween = fantasia === 'halloween'
  return (
    <svg className={`mq-svg mq--${comportamento}`} viewBox="0 0 200 290" aria-hidden="true" focusable="false">
      <ellipse className="mq-sombra" cx={100} cy={281} rx={44} ry={7} fill="rgba(0,0,0,0.28)" />
      <g className="mq-corpo">
        {/* Manto de Halloween, atrás de tudo, aberto na frente (aparece o tórax). */}
        {halloween && (
          <path d="M70 160 C52 196 48 236 44 270 L58 262 L68 274 L80 262 L92 274 L100 264 L108 274 L120 262 L132 274 L142 262 L156 270 C152 236 148 196 130 160 Z" fill="#3a2a58" stroke={TINTA} strokeWidth={4} strokeLinejoin="round" />
        )}
        {/* Pernas: coxa gira no quadril, canela no joelho. */}
        {([[-1, 88], [1, 112]] as const).map(([lado, x]) => (
          <Junta key={lado} nome={`perna${lado === -1 ? 'E' : 'D'}`} x={x} y={226}>
            <Osso x1={x} y1={226} x2={x - lado * 2} y2={248} />
            <Junta nome={`canela${lado === -1 ? 'E' : 'D'}`} x={x - lado * 2} y={248}>
              <Osso x1={x - lado * 2} y1={248} x2={x - lado * 3} y2={268} />
              <path d={`M${x - lado * 3 - 8} 266 q${lado * 10} -6 ${lado * 22} 2 q2 8 -6 9 l-14 0 q-6 -2 -2 -11 Z`} fill={OSSO} stroke={TINTA} strokeWidth={4} strokeLinejoin="round" transform={lado === -1 ? `translate(${2 * (x - lado * 3)} 0) scale(-1 1)` : undefined} />
            </Junta>
          </Junta>
        ))}
        {/* Pelve, coluna e caixa torácica. */}
        <path d="M100 212 C86 206 74 212 76 224 C78 234 92 232 100 238 C108 232 122 234 124 224 C126 212 114 206 100 212 Z" fill={OSSO} stroke={TINTA} strokeWidth={4} strokeLinejoin="round" />
        <circle cx={88} cy={224} r={3.6} fill={TINTA} /><circle cx={112} cy={224} r={3.6} fill={TINTA} />
        {[200, 207].map((y) => <rect key={y} x={93} y={y} width={14} height={6} rx={3} fill={OSSO} stroke={TINTA} strokeWidth={3} />)}
        <rect x={95} y={160} width={10} height={40} rx={5} fill={OSSO} stroke={TINTA} strokeWidth={3.5} />
        {[0, 1, 2].map((k) => (
          <g key={k} fill="none" strokeLinecap="round">
            <path d={`M96 ${168 + k * 10} C ${80 - k * 2} ${160 + k * 10} ${72 - k} ${178 + k * 10} ${82 + k * 2} ${184 + k * 10}`} stroke={TINTA} strokeWidth={10} />
            <path d={`M104 ${168 + k * 10} C ${120 + k * 2} ${160 + k * 10} ${128 + k} ${178 + k * 10} ${118 - k * 2} ${184 + k * 10}`} stroke={TINTA} strokeWidth={10} />
            <path d={`M96 ${168 + k * 10} C ${80 - k * 2} ${160 + k * 10} ${72 - k} ${178 + k * 10} ${82 + k * 2} ${184 + k * 10}`} stroke={OSSO} strokeWidth={5} />
            <path d={`M104 ${168 + k * 10} C ${120 + k * 2} ${160 + k * 10} ${128 + k} ${178 + k * 10} ${118 - k * 2} ${184 + k * 10}`} stroke={OSSO} strokeWidth={5} />
          </g>
        ))}
        <Osso x1={80} y1={160} x2={120} y2={160} g={5.5} />

        {/* O livro fica na frente do tórax, entre as duas mãos. */}
        {comportamento === 'ler' && <g transform="translate(100 196)"><Livro /></g>}

        {/* Braços: braço gira no ombro, antebraço no cotovelo, mão no punho. */}
        {([[-1, 78], [1, 122]] as const).map(([lado, x]) => {
          const n = lado === -1 ? 'E' : 'D'
          return (
            <Junta key={lado} nome={`braco${n}`} x={x} y={164}>
              <Osso x1={x} y1={164} x2={x + lado * 4} y2={188} g={6.5} />
              <Junta nome={`antebraco${n}`} x={x + lado * 4} y={188}>
                <Osso x1={x + lado * 4} y1={188} x2={x + lado * 6} y2={210} g={6} />
                <Junta nome={`mao${n}`} x={x + lado * 6} y={210}>
                  <g transform={`translate(${x + lado * 6} 212)`}>
                    {objetoMao(comportamento, lado === -1 ? -1 : 1)}
                    <Mao lado={lado === -1 ? -1 : 1} />
                  </g>
                </Junta>
              </Junta>
            </Junta>
          )
        })}

        {/* Cabeça: gira no pescoço; a mandíbula abre sozinha. */}
        <Junta nome="cabeca" x={100} y={152}>
          {halloween && <path d="M100 4 C40 4 26 60 30 108 C34 140 52 158 70 162 L130 162 C148 158 166 140 170 108 C174 60 160 4 100 4 Z" fill="#3a2a58" stroke={TINTA} strokeWidth={4.5} />}
          <rect x={92} y={140} width={16} height={18} rx={6} fill={OSSO} stroke={TINTA} strokeWidth={3.5} />
          <Junta nome="mandibula" x={100} y={128}>
            <path d="M66 124 C66 146 84 152 100 152 C116 152 134 146 134 124 Z" fill={OSSO} stroke={TINTA} strokeWidth={4.5} strokeLinejoin="round" />
            <rect className="mq-lingua" x={92} y={132} width={16} height={10} rx={5} fill="#f08aa0" stroke={TINTA} strokeWidth={2.5} />
            <path d="M80 127 L120 127 L118 135 L82 135 Z" fill="#fffdf6" stroke={TINTA} strokeWidth={3} strokeLinejoin="round" />
            {[88, 96, 104, 112].map((x) => <line key={x} x1={x} y1={127} x2={x} y2={135} stroke={TINTA} strokeWidth={2} />)}
          </Junta>
          <path d="M100 16 C54 16 34 50 36 86 C38 112 54 124 70 126 L130 126 C146 124 162 112 164 86 C166 50 146 16 100 16 Z" fill={OSSO} stroke={TINTA} strokeWidth={5} strokeLinejoin="round" />
          {/* sombra embaixo e à direita, e o brilho em cima */}
          <path d="M150 54 C166 78 162 108 140 122 L128 124 C150 110 156 82 150 54 Z" fill={SOMBRA} />
          <path d="M60 40 C70 28 84 22 96 22" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.9} />
          {/* rachadura */}
          <path d="M138 30 l-6 10 l7 4 l-8 10" fill="none" stroke={TINTA} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
          {/* dentes de cima */}
          <path d="M80 119 L120 119 L118 127 L82 127 Z" fill="#fffdf6" stroke={TINTA} strokeWidth={3} strokeLinejoin="round" />
          {[88, 96, 104, 112].map((x) => <line key={x} x1={x} y1={119} x2={x} y2={127} stroke={TINTA} strokeWidth={2} />)}
          {/* olhos: órbitas pretas com brilho (piscam juntas) */}
          <g className="mq-olhos">
            <ellipse cx={74} cy={82} rx={18} ry={21} fill="#15101a" />
            <ellipse cx={126} cy={82} rx={18} ry={21} fill="#15101a" />
            <circle cx={67} cy={74} r={5.5} fill="#fff" /><circle cx={119} cy={74} r={5.5} fill="#fff" />
            <circle cx={80} cy={91} r={2.6} fill="#fff" opacity={0.8} /><circle cx={132} cy={91} r={2.6} fill="#fff" opacity={0.8} />
          </g>
          <path className="mq-olhos-fechados" d="M58 84 q16 10 32 0 M110 84 q16 10 32 0" fill="none" stroke={TINTA} strokeWidth={4} strokeLinecap="round" />
          <path d="M100 98 l-6 8 l6 6 l6 -6 Z" fill={TINTA} strokeLinejoin="round" />
          <ellipse cx={56} cy={106} rx={7} ry={3.6} fill="#f2a6a0" opacity={0.75} /><ellipse cx={144} cy={106} rx={7} ry={3.6} fill="#f2a6a0" opacity={0.75} />
          {halloween && <path d="M100 4 C62 4 44 28 38 52 C56 30 76 22 100 22 C124 22 144 30 162 52 C156 28 138 4 100 4 Z" fill="#4a3670" stroke={TINTA} strokeWidth={4} />}
        </Junta>

        {comportamento === 'malabares' && <g className="mq-malabares"><Ossinho c="mq-bola mq-bola--1" /><Ossinho c="mq-bola mq-bola--2" /><Ossinho c="mq-bola mq-bola--3" /></g>}
        {comportamento === 'dancar' && <g transform="translate(160 120)"><Notas /></g>}
        {comportamento === 'comer' && <circle className="mq-farelo" cx={104} cy={140} r={3.4} fill="#fff8e0" stroke={TINTA} strokeWidth={1.8} />}
        {halloween && (
          <g className="mq-brilhos" fill="#c9a8ff">
            <path d="M24 60 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" /><path d="M176 150 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" />
          </g>
        )}
      </g>
    </svg>
  )
}

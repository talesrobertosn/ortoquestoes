import type { IdComportamento } from './comportamentos'

/**
 * O mascote desenhado em vetor (31/10/2026, o Tales escolheu o "modelo E" entre os modelos de traço limpo):
 * esqueletinho chibi de armadura (crânio grande com rachadura, órbitas ovais escuras, nariz de coração, uma fileira
 * de dentes), ombreira de aço com rebites, correia, cinto com fivela e saiote vermelho esfarrapado. Contorno grosso
 * e sombra em duas cores, como nas referências que ele mandou. Cada comportamento muda os braços e o objeto; as
 * partes que se mexem levam classes animadas em Mascote.css (só transform e opacity: leve no celular).
 *
 * Tudo é texto fixo montado aqui (sem nada vindo da pessoa), injetado como SVG. viewBox de 360 x 480, com o
 * esqueleto no meio e os pés em y ≈ 455.
 */
const C = { osso: '#f5ecd6', sombra: '#dccba4', luz: '#fffaf0', tinta: '#2b1d16', oco: '#2b211e', dente: '#fffdf6', aco: '#9aa4ab', aco2: '#6e7880', aco3: '#dfe5e8', pano: '#a8282a', couro: '#7a4a24', ouro: '#e0b54a', capa: '#34323f', capa2: '#15141b' }
const T = C.tinta

/** Grupo animado em volta de um ponto fixo (o ombro, o pescoço...). */
const gira = (classe: string, x: number, y: number, dentro: string) => `<g class="${classe}" style="transform-origin:${x}px ${y}px">${dentro}</g>`

function osso(x1: number, y1: number, x2: number, y2: number, g = 11) {
  const k = g * 0.78
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${T}" stroke-width="${g + 8}" stroke-linecap="round"/>`
    + `<circle cx="${x1}" cy="${y1}" r="${k + 4}" fill="${T}"/><circle cx="${x2}" cy="${y2}" r="${k + 4}" fill="${T}"/>`
    + `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.osso}" stroke-width="${g}" stroke-linecap="round"/>`
    + `<circle cx="${x1}" cy="${y1}" r="${k}" fill="${C.osso}"/><circle cx="${x2}" cy="${y2}" r="${k}" fill="${C.osso}"/>`
    + `<line x1="${x1 + 3}" y1="${y1 + 2}" x2="${x2 + 3}" y2="${y2 + 2}" stroke="${C.sombra}" stroke-width="${g * 0.35}" stroke-linecap="round" opacity="0.8"/>`
}

function mao(x: number, y: number, ang = 0, fechada = false) {
  const dedos = fechada ? '' : [-7, 0, 7].map((dx) => `<line x1="${dx}" y1="4" x2="${dx * 1.2}" y2="16" stroke="${T}" stroke-width="9" stroke-linecap="round"/><line x1="${dx}" y1="4" x2="${dx * 1.2}" y2="16" stroke="${C.osso}" stroke-width="4" stroke-linecap="round"/>`).join('')
  return `<g transform="translate(${x} ${y}) rotate(${ang})">${dedos}<ellipse cx="0" cy="0" rx="12" ry="10" fill="${C.osso}" stroke="${T}" stroke-width="4"/>${fechada ? `<path d="M-9 2 h18" stroke="${T}" stroke-width="2.5"/>` : ''}</g>`
}

const braco = (o: [number, number], c: [number, number], m: [number, number]) => osso(o[0], o[1], c[0], c[1], 10) + osso(c[0], c[1], m[0], m[1], 9)

let serie = 0
/** O crânio; dormindo, as órbitas viram traços fechados. */
function cranio(dormindo = false) {
  const id = `mq-cab-${++serie}`
  const cabeca = '<circle cx="150" cy="118" r="94"/><ellipse cx="150" cy="168" rx="86" ry="46"/><rect x="110" y="182" width="80" height="50" rx="20"/>'
  const olhos = dormindo
    ? [110, 190].map((x) => `<path d="M${x - 24} 150 Q${x} 166 ${x + 24} 150" fill="none" stroke="${C.oco}" stroke-width="10" stroke-linecap="round"/>`).join('')
    : [110, 190].map((x, i) => `<g transform="rotate(${i ? 8 : -8} ${x} 148)"><ellipse cx="${x}" cy="148" rx="28" ry="33" fill="${C.oco}"/><ellipse cx="${x + 4}" cy="156" rx="17" ry="20" fill="#3a2e2a"/></g>`).join('')
  return `<g class="mq-cabeca" style="transform-origin:150px 240px">
    <clipPath id="${id}">${cabeca}</clipPath>
    <g fill="${T}" stroke="${T}" stroke-width="14" stroke-linejoin="round">${cabeca}</g>
    <g fill="${C.sombra}">${cabeca}</g>
    <g clip-path="url(#${id})"><circle cx="126" cy="100" r="118" fill="${C.osso}"/><ellipse cx="96" cy="64" rx="34" ry="20" fill="${C.luz}" opacity="0.85" transform="rotate(-25 96 64)"/>
      <path d="M118 186 Q112 198 120 206" fill="none" stroke="${C.sombra}" stroke-width="7"/><path d="M182 186 Q188 198 180 206" fill="none" stroke="${C.sombra}" stroke-width="7"/></g>
    <path d="M112 196 Q104 186 92 190" fill="none" stroke="${T}" stroke-width="4" stroke-linecap="round"/><path d="M188 196 Q196 186 208 190" fill="none" stroke="${T}" stroke-width="4" stroke-linecap="round"/>
    <path d="M196 36 L205 54 L196 66 L214 80 L208 92" fill="none" stroke="${T}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><path d="M205 54 L218 50" stroke="${T}" stroke-width="3.5" stroke-linecap="round"/>
    ${olhos}
    <path d="M150 204 C138 194 138 184 145 183 C148 183 150 186 150 188 C150 186 152 183 155 183 C162 184 162 194 150 204 Z" fill="${C.oco}"/>
    <rect x="120" y="210" width="60" height="20" rx="6" fill="${C.dente}" stroke="${T}" stroke-width="4.5"/>
    ${[132, 144, 156, 168].map((x) => `<line x1="${x}" y1="211" x2="${x}" y2="229" stroke="${T}" stroke-width="3"/>`).join('')}
  </g>`
}

function tronco() {
  const vert = [244, 256].map((y) => `<ellipse cx="150" cy="${y}" rx="9" ry="6" fill="${C.osso}" stroke="${T}" stroke-width="4"/>`).join('')
  const caixa = `<path d="M110 270 Q150 258 190 270 Q198 300 186 326 Q150 336 114 326 Q102 300 110 270 Z" fill="${C.oco}" stroke="${T}" stroke-width="5"/>`
  const costelas = [278, 294, 310].map((y, i) => [-1, 1].map((s) => {
    const d = `M${150 + s * 6} ${y} Q${150 + s * 34} ${y - 8} ${150 + s * (40 - i * 3)} ${y + 8}`
    return `<path d="${d}" fill="none" stroke="${T}" stroke-width="13" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${C.osso}" stroke-width="6" stroke-linecap="round"/>`
  }).join('')).join('')
  const esterno = `<rect x="143" y="266" width="14" height="52" rx="7" fill="${C.osso}" stroke="${T}" stroke-width="4"/>`
  const coluna = [334, 346].map((y) => `<rect x="141" y="${y - 5}" width="18" height="11" rx="5" fill="${C.osso}" stroke="${T}" stroke-width="4"/>`).join('')
  const pelve = `<path d="M116 360 Q118 348 136 352 L150 360 L164 352 Q182 348 184 360 Q186 382 166 384 L150 376 L134 384 Q114 382 116 360 Z" fill="${C.osso}" stroke="${T}" stroke-width="5" stroke-linejoin="round"/>`
  return vert + caixa + costelas + esterno + coluna + pelve
}

const pernas = () => [132, 168].map((x) => {
  const s = x < 150 ? -1 : 1
  return osso(x, 384, x + s * 2, 420) + osso(x + s * 2, 424, x + s * 2, 446) + `<ellipse cx="${x + s * 8}" cy="452" rx="17" ry="8" fill="${C.osso}" stroke="${T}" stroke-width="4.5"/>`
}).join('')

/** Saiote vermelho esfarrapado, cinto com fivela e a correia da ombreira. */
const roupa = () => `<path d="M112 356 L188 356 L194 404 L180 396 L172 410 L160 398 L148 412 L136 398 L124 408 L118 394 L106 402 Z" fill="${C.pano}" stroke="${T}" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M128 362 L124 396 M160 362 L162 398" stroke="#7d1b1e" stroke-width="3" opacity="0.7"/>
  <rect x="112" y="348" width="76" height="12" rx="4" fill="#6b4220" stroke="${T}" stroke-width="4"/><rect x="143" y="347" width="14" height="14" rx="2" fill="${C.ouro}" stroke="${T}" stroke-width="3.5"/>
  <path d="M118 266 L184 344" stroke="${T}" stroke-width="13" stroke-linecap="round"/><path d="M118 266 L184 344" stroke="${C.couro}" stroke-width="7" stroke-linecap="round"/>`

const ombreira = () => `<path d="M168 278 Q170 244 200 244 Q228 246 230 280 Q214 270 200 272 Q182 272 168 278 Z" fill="${C.aco}" stroke="${T}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M168 278 Q184 268 200 270 Q218 270 230 280 L228 290 Q214 282 200 282 Q184 282 170 288 Z" fill="${C.aco2}" stroke="${T}" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M180 256 Q196 248 214 256" fill="none" stroke="${C.aco3}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="182" cy="282" r="2.6" fill="${T}"/><circle cx="200" cy="278" r="2.6" fill="${T}"/><circle cx="218" cy="282" r="2.6" fill="${T}"/>`

const espada = (x: number, y: number, ang: number) => `<g transform="translate(${x} ${y}) rotate(${ang})">
  <path d="M-7 -14 L-7 -96 L0 -112 L7 -96 L7 -14 Z" fill="#c9d1d6" stroke="${T}" stroke-width="4.5" stroke-linejoin="round"/><path d="M0 -18 L0 -100" stroke="#97a3aa" stroke-width="3"/>
  <rect x="-20" y="-16" width="40" height="9" rx="4" fill="#8a5a2b" stroke="${T}" stroke-width="4"/><rect x="-5" y="-8" width="10" height="24" rx="3" fill="#6b4220" stroke="${T}" stroke-width="4"/></g>`

/** Braço esquerdo (do lado de quem olha) com a espada baixa, e o direito solto. */
const bracoEspada = () => braco([110, 272], [96, 306], [86, 330]) + espada(84, 334, -6) + mao(84, 334, 170, true)
const bracoSolto = () => braco([190, 272], [206, 304], [208, 336]) + mao(208, 340, -10)

const caneca = (x: number, y: number) => `<g transform="translate(${x} ${y})"><rect x="-26" y="-24" width="48" height="46" rx="8" fill="#fbfbf8" stroke="${T}" stroke-width="5"/>
  <path d="M22 -12 Q38 -12 38 0 Q38 12 22 12" fill="none" stroke="${T}" stroke-width="11"/><path d="M22 -12 Q38 -12 38 0 Q38 12 22 12" fill="none" stroke="#fbfbf8" stroke-width="4.5"/>
  <ellipse cx="-2" cy="-21" rx="20" ry="5" fill="#6b3f22" stroke="${T}" stroke-width="3"/><circle cx="-11" cy="-3" r="5" fill="${C.oco}"/><circle cx="7" cy="-3" r="5" fill="${C.oco}"/><path d="M-11 10 H7 M-7 7 V13 M-2 7 V13 M3 7 V13" stroke="${C.oco}" stroke-width="2.2"/></g>
  <g class="mq-vapor"><path d="M${x - 8} ${y - 34} q-8 -12 0 -24 q8 -12 0 -22" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.75"/><path d="M${x + 6} ${y - 36} q8 -10 0 -20" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity="0.6"/></g>`

const livro = () => `<g transform="translate(150 318)"><path d="M-46 -6 L0 2 L46 -6 L44 30 L0 38 L-44 30 Z" fill="#7d1b1e" stroke="${T}" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M-40 -10 Q-20 -14 0 -4 L0 32 Q-20 22 -40 26 Z" fill="#fbf6e8" stroke="${T}" stroke-width="4" stroke-linejoin="round"/><path d="M40 -10 Q20 -14 0 -4 L0 32 Q20 22 40 26 Z" fill="#f4eedc" stroke="${T}" stroke-width="4" stroke-linejoin="round"/>
  ${[-2, 6, 14].map((y) => `<path d="M-32 ${y} Q-18 ${y - 3} -6 ${y + 3}" fill="none" stroke="#b9ad92" stroke-width="2.5"/><path d="M32 ${y} Q18 ${y - 3} 6 ${y + 3}" fill="none" stroke="#b9ad92" stroke-width="2.5"/>`).join('')}
  <path d="M10 -6 Q16 4 12 18" fill="none" stroke="#c8342b" stroke-width="3"/></g>`

const radiografia = () => `<g transform="translate(262 176) rotate(8)"><rect x="-38" y="-30" width="76" height="60" rx="5" fill="#1d2e44" stroke="${T}" stroke-width="5"/>
  <path d="M-22 18 Q-24 10 -16 10 L12 -8 Q14 -18 22 -16 Q28 -12 22 -6 Q26 2 18 2 L-10 18 Q-12 26 -20 24 Q-26 22 -22 18 Z" fill="#cfe2f0" opacity="0.9"/><rect x="-34" y="-26" width="68" height="52" rx="3" fill="none" stroke="#9ec3e0" stroke-width="2" opacity="0.5"/></g>`

const martelo = () => `<g transform="translate(244 228) rotate(-30)"><rect x="-3" y="-4" width="6" height="44" rx="3" fill="#8a5a2b" stroke="${T}" stroke-width="3.5"/><path d="M-16 -14 L16 -14 L12 -4 L-12 -4 Z" fill="#d6503f" stroke="${T}" stroke-width="3.5" stroke-linejoin="round"/></g>`

const ossinho = (classe: string) => `<g class="${classe}"><g transform="rotate(30) scale(1.5)"><rect x="-12" y="-3" width="24" height="6" rx="3" fill="${C.osso}" stroke="${T}" stroke-width="3"/>${[-12, 12].map((x) => `<circle cx="${x}" cy="-3" r="4" fill="${C.osso}" stroke="${T}" stroke-width="3"/><circle cx="${x}" cy="3" r="4" fill="${C.osso}" stroke="${T}" stroke-width="3"/>`).join('')}<rect x="-12" y="-2" width="24" height="4" fill="${C.osso}"/></g></g>`

/** Capuz e capa de Halloween (outubro): a capa por trás do corpo, o capuz em volta do crânio. */
const capaTras = () => `<path d="M100 262 Q150 248 200 262 Q232 350 236 446 L214 436 L200 450 L182 438 L164 452 L150 440 L134 452 L118 438 L100 450 L86 436 L64 446 Q68 350 100 262 Z" fill="${C.capa}" stroke="${T}" stroke-width="5" stroke-linejoin="round"/>`
const capuzTras = () => `<path d="M150 4 Q190 8 224 38 Q266 80 264 142 Q262 200 228 244 Q150 266 72 244 Q38 200 36 142 Q34 80 76 38 Q110 8 150 4 Z" fill="${C.capa}" stroke="${T}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M150 24 Q238 32 246 138 Q246 198 216 230 Q150 250 84 230 Q54 198 54 138 Q62 32 150 24 Z" fill="${C.capa2}"/>`
const capuzFrente = () => `<path d="M150 4 Q190 8 224 38 Q208 26 150 26 Q92 26 76 38 Q110 8 150 4 Z" fill="#4a4858"/>`
const cranioEncapuzado = () => `<g transform="translate(150 144) scale(0.86) translate(-150 -134)">${cranio()}</g>`

const foice = () => `<g transform="translate(250 60) rotate(6)"><rect x="-5" y="0" width="10" height="400" rx="5" fill="${C.couro}" stroke="${T}" stroke-width="4.5"/>
  <path d="M2 10 Q-60 -30 -128 22 Q-70 0 -8 40 Z" fill="#cdd5da" stroke="${T}" stroke-width="5" stroke-linejoin="round"/><path d="M-20 14 Q-70 -6 -112 22" fill="none" stroke="#eef2f4" stroke-width="4" stroke-linecap="round"/>
  <rect x="-9" y="2" width="18" height="18" rx="3" fill="#5d636b" stroke="${T}" stroke-width="4"/></g>`

const abobora = () => `<g transform="translate(150 316)"><path d="M0 -30 Q-4 -40 4 -44" fill="none" stroke="#4d6b2a" stroke-width="7" stroke-linecap="round"/>
  <ellipse cx="0" cy="0" rx="42" ry="32" fill="#e07a24" stroke="${T}" stroke-width="5"/><path d="M-14 -30 Q-24 0 -14 30 M14 -30 Q24 0 14 30" fill="none" stroke="#b5561a" stroke-width="4"/>
  <g class="mq-chama"><path d="M-22 -6 L-10 -14 L-8 -2 Z M22 -6 L10 -14 L8 -2 Z" fill="#ffd25a"/><path d="M-20 12 L-12 8 L-6 14 L0 8 L6 14 L12 8 L20 12 L14 20 L-14 20 Z" fill="#ffd25a"/></g></g>`

const velas = () => `<g transform="translate(240 250)"><rect x="-20" y="30" width="40" height="8" rx="3" fill="${C.ouro}" stroke="${T}" stroke-width="4"/><rect x="-3" y="10" width="6" height="22" fill="${C.ouro}" stroke="${T}" stroke-width="3"/>
  ${[-14, 0, 14].map((x) => `<rect x="${x - 5}" y="${-14 + Math.abs(x) * 0.4}" width="10" height="${26 - Math.abs(x) * 0.4}" rx="2" fill="#fbf3dc" stroke="${T}" stroke-width="3.5"/><g class="mq-chama" style="transform-origin:${x}px ${-16 + Math.abs(x) * 0.4}px"><path d="M${x} ${-34 + Math.abs(x) * 0.4} Q${x + 7} ${-22 + Math.abs(x) * 0.4} ${x} ${-16 + Math.abs(x) * 0.4} Q${x - 7} ${-22 + Math.abs(x) * 0.4} ${x} ${-34 + Math.abs(x) * 0.4} Z" fill="#ffc04a" stroke="${T}" stroke-width="2.5"/></g>`).join('')}</g>`

const morcego = (classe: string) => `<g class="${classe}"><g transform="scale(1.6)"><g class="mq-asa"><path d="M0 0 Q-10 -12 -26 -8 Q-20 -2 -22 6 Q-12 2 0 6 Q12 2 22 6 Q20 -2 26 -8 Q10 -12 0 0 Z" fill="#2a2633" stroke="${T}" stroke-width="3" stroke-linejoin="round"/></g><circle cx="-3" cy="1" r="1.6" fill="#ffd25a"/><circle cx="3" cy="1" r="1.6" fill="#ffd25a"/></g></g>`

const marshmallow = () => `<g transform="translate(244 282) rotate(35)"><rect x="-2.5" y="-70" width="5" height="76" rx="2" fill="#8a5a2b" stroke="${T}" stroke-width="3"/><rect x="-11" y="-92" width="22" height="22" rx="6" fill="#fff7ec" stroke="${T}" stroke-width="4"/><path d="M-9 -78 Q0 -72 9 -78 L9 -74 Q0 -68 -9 -74 Z" fill="#c98a4b"/></g>`

const sombraChao = `<ellipse cx="150" cy="462" rx="72" ry="9" fill="#000" opacity="0.14"/>`

function corpo(id: IdComportamento): string {
  const base = (bracos: string, extraFrente = '', dormindo = false) =>
    `${pernas()}${tronco()}${roupa()}${bracos}${extraFrente ? '' : ombreira()}${cranio(dormindo)}${extraFrente}${extraFrente ? ombreira() : ''}`
  const halloween = (bracos: string, frente = '') => `${capaTras()}${pernas()}${tronco()}${roupa()}${bracos}${capuzTras()}${cranioEncapuzado()}${capuzFrente()}${frente}${ombreira()}`
  switch (id) {
    case 'acenar':
      return base(bracoEspada(), gira('mq-acena', 196, 270, braco([196, 270], [232, 248], [246, 206]) + mao(248, 198, 196)))
    case 'ler':
      return base(braco([110, 272], [102, 306], [118, 320]) + braco([190, 272], [198, 306], [182, 320]) + livro() + mao(112, 322, 60, true) + mao(188, 322, -60, true))
    case 'cafe':
      return base(braco([110, 272], [100, 306], [124, 314]) + braco([190, 272], [200, 306], [176, 314]) + caneca(150, 306) + mao(124, 312, 80, true) + mao(176, 316, -80, true))
    case 'dormir':
      return base(braco([110, 272], [100, 306], [104, 338]) + mao(104, 342, 10) + bracoSolto(),
        `<g class="mq-z"><text x="232" y="70" font-family="system-ui,sans-serif" font-weight="800" font-size="34" fill="#fff" stroke="${T}" stroke-width="5" paint-order="stroke">Z</text><text x="262" y="34" font-family="system-ui,sans-serif" font-weight="800" font-size="24" fill="#fff" stroke="${T}" stroke-width="4" paint-order="stroke">z</text></g>`, true)
    case 'alongar':
      return base('', gira('mq-alonga', 150, 272, braco([110, 272], [76, 250], [58, 210]) + mao(56, 202, 164) + braco([190, 272], [224, 250], [242, 210]) + mao(244, 202, 196)))
    case 'raiox':
      return base(bracoEspada(), braco([196, 270], [234, 252], [244, 214]) + radiografia() + mao(244, 212, 180, true))
    case 'malabares':
      return base(braco([110, 272], [98, 300], [116, 296]) + mao(118, 292, 120) + braco([190, 272], [202, 300], [184, 296]) + mao(182, 292, -120),
        `<g transform="translate(150 280)">${ossinho('mq-malabar mq-malabar--1')}${ossinho('mq-malabar mq-malabar--2')}${ossinho('mq-malabar mq-malabar--3')}</g>`)
    case 'reflexo':
      return base(bracoEspada(), gira('mq-martelo', 196, 270, braco([196, 270], [232, 262], [246, 232]) + martelo() + mao(246, 232, 200, true)))
    case 'marshmallow':
      return base(bracoEspada(), braco([196, 270], [230, 302], [240, 286]) + marshmallow() + mao(240, 286, -40, true))
    case 'foice':
      return halloween(braco([110, 272], [100, 306], [104, 338]) + mao(104, 342, 10), foice() + braco([196, 270], [226, 300], [240, 290]) + mao(242, 290, -90, true))
    case 'abobora':
      return halloween(braco([110, 272], [100, 306], [114, 316]) + braco([190, 272], [200, 306], [186, 316]) + abobora() + mao(110, 318, 70, true) + mao(190, 318, -70, true))
    case 'velas':
      return halloween(braco([110, 272], [100, 306], [104, 338]) + mao(104, 342, 10), braco([196, 270], [230, 300], [240, 290]) + velas() + mao(240, 292, -90, true))
    case 'morcegos':
      return halloween(braco([110, 272], [100, 306], [104, 338]) + mao(104, 342, 10) + bracoSolto(),
        `${morcego('mq-morcego mq-morcego--1')}${morcego('mq-morcego mq-morcego--2')}${morcego('mq-morcego mq-morcego--3')}`)
    case 'parado':
    default:
      return base(bracoEspada() + bracoSolto())
  }
}

export function svgMascote(id: IdComportamento): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -6 360 480" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${sombraChao}<g class="mq-corpo">${corpo(id)}</g></svg>`
}

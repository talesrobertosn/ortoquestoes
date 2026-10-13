/**
 * Sprites em pixel art nativa, montados num esqueleto articulado sobre o motor
 * de pixel.ts: ombro, cotovelo, mão, quadril, joelho e arma são pontos, e cada
 * pose só move esses pontos. Assim o mesmo desenho vira várias poses
 * (parado, preparo, golpe, dano, vitória) sem redesenhar à mão.
 * Fantasia original, sem anatomia humana médica.
 */
import { Grade, MAT } from './pixel'

export type Personagem = 'golem' | 'serpente' | 'guardiao' | 'heroi'
export type Pose = 'parado' | 'respira' | 'preparo' | 'golpe' | 'dano' | 'vitoria'
export const POSES: Pose[] = ['parado', 'respira', 'preparo', 'golpe', 'dano', 'vitoria']

/** Tamanho do canvas de cada sprite, em pixels nativos. */
export const TAMANHO: Record<Personagem, [number, number]> = { heroi: [34, 42], golem: [104, 100], serpente: [84, 76], guardiao: [124, 128] }
/** Origem do desenho local dentro do canvas. */
const ORIGEM: Record<Personagem, [number, number]> = { heroi: [0, 0], golem: [12, 16], serpente: [16, 14], guardiao: [16, 26] }

/** Cores de fragmentos e partículas (dano e derrota). */
export const PALETA_PERSONAGEM: Record<Personagem, string[]> = {
  golem: ['#fbf6e8', '#ddd3bb', '#ab9f86', '#7fe6ff'],
  serpente: ['#fff0a0', '#e2b444', '#a8781e', '#ff6a4a'],
  guardiao: ['#e8eef8', '#a9b6ca', '#f2c45a', '#c43a24'],
  heroi: ['#7fb2f0', '#b9c6d8', '#f4f8ff'],
}

type P = [number, number]
type Desenho = (g: Grade, pose: Pose) => void

const unit = (x: number, y: number): P => { const n = Math.hypot(x, y) || 1; return [x / n, y / n] }
const soma = (a: P, u: P, k: number): P => [a[0] + u[0] * k, a[1] + u[1] * k]

/** Cotovelo/joelho por cinemática inversa de dois ossos; `lado` escolhe para onde dobra. */
function junta(a: P, b: P, l1: number, l2: number, lado: 1 | -1): P {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1
  if (d >= l1 + l2 - 0.01) return [a[0] + (dx * l1) / (l1 + l2), a[1] + (dy * l1) / (l1 + l2)]
  const t = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - t * t))
  return [a[0] + (dx * t) / d - (dy / d) * h * lado, a[1] + (dy * t) / d + (dx / d) * h * lado]
}

/** Placa girada (bloco de martelo, guarda de espada): centro, eixo, comprimento e largura. */
function placa(g: Grade, c: P, u: P, comp: number, larg: number, m: number, bisel = 2) {
  const v: P = [-u[1], u[0]]
  const p = (a: number, b: number): P => [c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b]
  g.poligono([p(-comp / 2, -larg / 2), p(comp / 2, -larg / 2), p(comp / 2, larg / 2), p(-comp / 2, larg / 2)], m, bisel)
}

/* ------------------------------------------------------------ Herói */
/**
 * O cavaleirinho original (aprovado pelo Tales em 13/10/2026): chibi com
 * elmo e pluma, escudo azul e espada. Só tem os dois quadros de respiração;
 * preparo, golpe e dano dele são feitos por animação no CSS.
 */
const heroi: Desenho = (g, pose) => {
  const r = pose === 'respira' || pose === 'dano' ? 1 : 0
  const aco = g.material(MAT.aco), azul = g.material(MAT.azul), couro = g.material(MAT.couro), pele = g.material(MAT.pele), cabelo = g.material(MAT.cabelo), verm = g.material(MAT.vermelho)
  // capa vermelha atrás, esvoaçando
  g.poligono([[10, 21 + r], [24, 21 + r], [29, 37], [22, 39], [15, 38], [6, 39]], verm, 3)
  // pernas e botas
  g.retangulo(12, 31, 4, 5, azul, 1); g.retangulo(18, 31, 4, 5, azul, 1)
  g.retangulo(11, 35, 6, 5, couro, 1); g.retangulo(17, 35, 6, 5, couro, 1)
  // túnica azul e peitoral de aço
  g.poligono([[10, 23 + r], [24, 23 + r], [25, 33], [9, 33]], azul, 3)
  g.elipse(17, 25 + r, 6, 4.5, aco)
  g.retangulo(9, 29 + r, 16, 2, couro, 1)
  g.ponto(17, 29 + r, '#fff1b0'); g.ponto(17, 30 + r, '#c28a2a')
  // braço do escudo e escudo azul com borda dourada
  g.elipse(7, 28 + r, 5, 6, azul, 0.8)
  for (let a = 0; a < Math.PI * 2; a += 0.3) g.ponto(7 + Math.cos(a) * 4.6, 28 + r + Math.sin(a) * 5.6, a > 2.4 && a < 4.2 ? '#fff1b0' : '#c28a2a')
  g.ponto(7, 27 + r, '#fff1b0'); g.ponto(7, 28 + r, '#f2c45a'); g.ponto(6, 28 + r, '#f2c45a'); g.ponto(8, 28 + r, '#c28a2a'); g.ponto(7, 29 + r, '#c28a2a')
  // braço da espada e espada erguida
  g.elipse(26, 27 + r, 2.4, 3.4, pele)
  for (let i = 0; i < 15; i++) { g.ponto(27 + i * 0.3, 25 + r - i, i < 1 ? '#7a889f' : '#f4f8ff'); g.ponto(28 + i * 0.3, 25 + r - i, '#9fb0c8') }
  g.linha(24, 26 + r, 30, 26 + r, '#c28a2a'); g.ponto(24, 26 + r, '#fff1b0'); g.ponto(30, 26 + r, '#fff1b0')
  // cabeça grande (chibi): cabelo atrás, rosto, franja e meio-elmo
  g.elipse(17, 13 + r, 9, 8.6, cabelo)
  g.elipse(17, 15 + r, 7, 6.4, pele)
  g.poligono([[9, 12 + r], [13, 9 + r], [21, 9 + r], [25, 12 + r], [24, 14 + r], [20, 12 + r], [14, 12 + r], [10, 14 + r]], cabelo, 2, 0.1)
  // olhos com brilho e boca
  for (const x of [14, 20]) { g.ponto(x, 15 + r, '#1e1430'); g.ponto(x, 16 + r, '#2a3a7a'); g.ponto(x + 1, 15 + r, '#1e1430'); g.ponto(x + 1, 16 + r, '#2a3a7a'); g.ponto(x, 15 + r, '#ffffff') }
  g.ponto(17, 18 + r, '#c0604a'); g.ponto(18, 18 + r, '#a84a3a')
  g.ponto(12, 17 + r, '#f5a08a'); g.ponto(22, 17 + r, '#f5a08a')
  // meio-elmo de aço com crista e pluma
  g.poligono([[8, 10 + r], [11, 4 + r], [17, 2 + r], [23, 4 + r], [26, 10 + r], [22, 8 + r], [12, 8 + r]], aco, 2)
  for (let x = 9; x <= 25; x++) if (g.ocupado(x, 9 + r)) g.ponto(x, 9 + r, x % 3 ? '#c28a2a' : '#f2c45a')
  for (let y = 2; y <= 7; y++) g.ponto(17, y + r, y % 2 ? '#f2c45a' : '#fff1b0')
  g.elipse(21, 1.5 + r, 3.6, 1.8, azul); g.elipse(25.5, 2.5 + r, 3.4, 1.8, azul); g.elipse(29, 5 + r, 2.6, 2.2, azul)
  g.ponto(20, 1 + r, '#bfe0ff'); g.ponto(24, 1 + r, '#bfe0ff')
}


/* ------------------------------------------------------------ Golem */
interface PoseGolem { b: number; lx: number; cot: [P, P]; punho: [P, P]; brilho: number; olhos: 'normais' | 'fortes' | 'apagados' }

const POSE_GOLEM: Record<Pose, PoseGolem> = {
  parado: { b: 0, lx: 0, cot: [[12, 46], [68, 46]], punho: [[11, 62], [69, 62]], brilho: 0, olhos: 'normais' },
  respira: { b: 1, lx: 0, cot: [[12, 47], [68, 47]], punho: [[11, 63], [69, 63]], brilho: 0.1, olhos: 'normais' },
  preparo: { b: -3, lx: 0, cot: [[14, 14], [66, 14]], punho: [[32, 0], [48, 0]], brilho: 0.6, olhos: 'fortes' },
  golpe: { b: 5, lx: 2, cot: [[20, 52], [62, 52]], punho: [[33, 75], [49, 75]], brilho: 0.8, olhos: 'fortes' },
  dano: { b: 1, lx: -4, cot: [[4, 38], [74, 36]], punho: [[1, 50], [80, 46]], brilho: 0.3, olhos: 'apagados' },
  vitoria: { b: -1, lx: 0, cot: [[8, 30], [72, 30]], punho: [[10, 16], [70, 16]], brilho: 0.5, olhos: 'fortes' },
}

const golem: Desenho = (g, pose) => {
  const Q = POSE_GOLEM[pose]
  const { b, lx } = Q
  const gesso = g.material(MAT.gesso), pedra = g.material(MAT.pedra), musgo = g.material(MAT.musgo)
  const ombroE: P = [18 + lx, 32 + b], ombroD: P = [62 + lx, 32 + b]
  // pernas-pilar
  for (const [q, pe] of [[[30, 64], [28, 78]], [[50, 64], [52, 78]]] as Array<[P, P]>) {
    g.membro(q[0], q[1], pe[0], pe[1], 7, 7.5, pedra)
    g.poligono([[pe[0] - 9, pe[1] - 1], [pe[0] + 9, pe[1] - 1], [pe[0] + 10, pe[1] + 4], [pe[0] - 10, pe[1] + 4]], pedra, 2)
    g.linha(pe[0] - 6, pe[1] - 6, pe[0] + 5, pe[1] - 5, '#fffaf0')
  }
  // braço de trás primeiro, o da frente por cima
  const braco = (ombro: P, cot: P, punho: P) => {
    g.membro(ombro[0], ombro[1], cot[0], cot[1], 6.5, 6, pedra)
    g.membro(cot[0], cot[1], punho[0], punho[1], 7, 8, pedra)
    // faixas de gesso no antebraço
    for (const k of [0.3, 0.55]) { const c: P = [cot[0] + (punho[0] - cot[0]) * k, cot[1] + (punho[1] - cot[1]) * k]; const u = unit(punho[0] - cot[0], punho[1] - cot[1]); placa(g, c, u, 3, 15, gesso, 1) }
    g.elipse(punho[0], punho[1], 8.5, 7.5, gesso)
    g.linha(punho[0] - 5, punho[1] - 2, punho[0] + 4, punho[1] - 3, '#fffdf6')
    for (const dx of [-4, 0, 4]) g.ponto(punho[0] + dx, punho[1] + 3, '#6f6553')
  }
  braco(ombroE, Q.cot[0], Q.punho[0])
  // tronco curvado de gesso e rocha
  const T = (x: number, y: number): P => [x + lx, y + b]
  g.poligono([T(18, 42), T(26, 22), T(54, 20), T(64, 34), [60 + lx * 0.5, 58], [50, 68], [30, 68], [20 + lx * 0.5, 58]], gesso, 7)
  g.poligono([T(24, 28), T(38, 25), T(39, 38), T(25, 40)], gesso, 2, 0.12)
  g.poligono([T(42, 25), T(56, 28), T(55, 40), T(42, 38)], gesso, 2, 0.08)
  g.poligono([[26 + lx * 0.5, 46 + b], [54 + lx * 0.5, 46 + b], [51, 62], [29, 62]], gesso, 3, 0.04)
  for (const [a, c] of [[T(24, 28), T(38, 25)], [T(42, 25), T(56, 28)]]) g.linha(a[0], a[1], c[0], c[1], '#fffdf6')
  // ombros de pedra
  g.elipse(ombroE[0], ombroE[1], 10, 9, gesso); g.elipse(ombroD[0], ombroD[1], 10, 9, gesso)
  for (const o of [ombroE, ombroD]) { g.linha(o[0] - 6, o[1] - 5, o[0] + 4, o[1] - 7, '#fffdf6'); for (let k = -3; k <= 3; k++) g.ponto(o[0] + k * 2, o[1] - 8 + Math.abs(k) * 0.4, k % 2 ? '#9cc65a' : '#6a9a34') }
  g.elipse(ombroE[0] - 4, ombroE[1] - 8, 4, 2, musgo); g.elipse(ombroD[0] + 3, ombroD[1] - 8, 4, 2, musgo)
  // fendas de energia (mais brilhantes no golpe)
  const ciano = Q.brilho > 0.5 ? '#bff8ff' : '#7fe6ff', nucleo = Q.brilho > 0.5 ? '#ffffff' : '#e8ffff'
  const fenda = (pts: P[]) => { for (let i = 1; i < pts.length; i++) g.linha(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], ciano); pts.forEach(([x, y]) => g.ponto(x, y, nucleo)) }
  fenda([T(39, 22), T(42, 30), T(37, 36), [41 + lx * 0.5, 46 + b], [38, 56], [41, 64]])
  fenda([T(52, 34), T(58, 38), [57 + lx * 0.5, 48 + b]])
  fenda([T(24, 38), [27 + lx * 0.5, 47 + b], [25, 56]])
  if (Q.brilho > 0.5) { fenda([T(46, 30), T(50, 36)]); fenda([[33, 52], [30, 60]]) }
  // núcleo no peito
  const nc = T(40, 33)
  g.elipse(nc[0], nc[1], 3.2, 3.2, gesso, 1, 0.3)
  g.ponto(nc[0], nc[1], '#ffffff'); g.ponto(nc[0] - 1, nc[1], ciano); g.ponto(nc[0] + 1, nc[1], ciano); g.ponto(nc[0], nc[1] - 1, ciano); g.ponto(nc[0], nc[1] + 1, ciano)
  // cabeça afundada entre os ombros
  const [cx, cy] = T(40, 17)
  g.poligono([[cx - 9, cy - 3], [cx - 5, cy - 9], [cx + 5, cy - 9], [cx + 9, cy - 3], [cx + 7, cy + 5], [cx - 7, cy + 5]], gesso, 3, 0.06)
  g.linha(cx - 8, cy - 2, cx + 8, cy - 2, '#6f6553'); g.linha(cx - 7, cy - 3, cx + 7, cy - 3, '#ab9f86')
  for (const x of [cx - 5, cx + 3]) {
    if (Q.olhos === 'apagados') { g.ponto(x, cy, '#3a5a66'); g.ponto(x + 1, cy, '#3a5a66') }
    else { g.ponto(x, cy, nucleo); g.ponto(x + 1, cy, Q.olhos === 'fortes' ? '#ffffff' : '#9ff0ff'); g.ponto(x, cy + 1, '#4fc8e8'); g.ponto(x + 1, cy + 1, '#4fc8e8'); if (Q.olhos === 'fortes') { g.ponto(x - 1, cy, '#7fe6ff'); g.ponto(x + 2, cy, '#7fe6ff') } }
  }
  g.linha(cx - 4, cy + 3, cx + 4, cy + 3, '#6f6553')
  braco(ombroD, Q.cot[1], Q.punho[1])
  // lasca arrancada no dano
  if (pose === 'dano') for (let y = 0; y < 4; y++) for (let x = 0; x < 5 - y; x++) g.apagar(60 + lx + x, 22 + b + y)
}

/* ------------------------------------------------------------ Serpente */
interface PoseSerpente { cab: P; boca: boolean; b: number }
const POSE_SERPENTE: Record<Pose, PoseSerpente> = {
  parado: { cab: [26, 9], boca: false, b: 0 },
  respira: { cab: [26, 10], boca: false, b: 1 },
  preparo: { cab: [20, 4], boca: true, b: -1 },
  golpe: { cab: [40, 20], boca: true, b: 1 },
  dano: { cab: [18, 12], boca: true, b: 1 },
  vitoria: { cab: [26, 5], boca: true, b: 0 },
}

const serpente: Desenho = (g, pose) => {
  const S = POSE_SERPENTE[pose]
  const escama = g.material(MAT.escama), vermelho = g.material(MAT.vermelho)
  for (let i = 0; i <= 46; i++) {
    const t = i / 46, a = t * Math.PI * 2.6 + 0.5
    const raio = 17 * (1 - t * 0.45)
    g.elipse(26 + Math.cos(a) * raio, 37 - t * 12 + Math.sin(a) * raio * 0.38 + S.b * t, 6.5 - t * 2, 5.5 - t * 1.6, escama)
  }
  for (let x = 14; x <= 38; x++) { const y = 42 + Math.round(Math.sin((x - 14) / 24 * Math.PI) * 2); if (g.ocupado(x, y)) { g.ponto(x, y, x % 3 ? '#f0dca0' : '#fff8dc'); g.ponto(x, y - 1, '#c8aa6a') } }
  for (let i = 0; i < 9; i++) { const x = 12 + i * 3.4, y = 34 + Math.sin(i) * 3; g.ponto(x, y, '#5e3c0c'); g.ponto(x + 1, y, '#a8781e') }
  // pescoço até a cabeça da pose
  const base: P = [31, 27]
  for (let i = 0; i <= 10; i++) { const t = i / 10; g.elipse(base[0] + (S.cab[0] - base[0]) * t, base[1] + (S.cab[1] + 8 - base[1]) * t - Math.sin(t * Math.PI) * 3, 4.6 - t * 0.6, 3.6, escama) }
  const [hx, hy] = S.cab
  g.elipse(hx, hy, 10, 7.5, escama, 0.8)
  g.elipse(hx, hy + 1, 5.5, 4.5, vermelho, 0.6)
  g.poligono([[hx - 7, hy - 2], [hx, hy - 8], [hx + 7, hy - 2], [hx + 4, hy + 3], [hx - 4, hy + 3]], escama, 2, 0.1)
  g.ponto(hx - 3, hy - 2, '#ffe0c0'); g.ponto(hx + 3, hy - 2, '#ffe0c0'); g.ponto(hx - 3, hy - 1, '#ff5a3c'); g.ponto(hx + 3, hy - 1, '#ff5a3c')
  if (S.boca) { g.retangulo(hx - 3, hy + 3, 6, 3, vermelho, 1); g.ponto(hx - 2, hy + 4, '#ffffff'); g.ponto(hx + 2, hy + 4, '#ffffff') }
  g.linha(hx, hy + 3, hx, hy + 7, '#d0281c'); g.ponto(hx - 1, hy + 8, '#d0281c'); g.ponto(hx + 1, hy + 8, '#d0281c')
}

/* ------------------------------------------------------------ Guardião (chefe) */
/**
 * Guardião do Acetábulo: cavaleiro colossal de armadura de placas, elmo
 * fechado com viseira em brasa, tabardo com o emblema da taça e espadão de
 * duas mãos. Parado, finca a espada no chão como sentinela.
 */
interface PoseGuardiao { b: number; lx: number; mao: P; dir: P; lamina: number; pes: [P, P]; viseira: string }
const POSE_GUARDIAO: Record<Pose, PoseGuardiao> = {
  parado: { b: 0, lx: 0, mao: [56, 50], dir: unit(0.04, 1), lamina: 44, pes: [[34, 94], [62, 94]], viseira: '#ffb347' },
  respira: { b: 1, lx: 0, mao: [56, 51], dir: unit(0.04, 1), lamina: 44, pes: [[34, 94], [62, 94]], viseira: '#ffd27a' },
  preparo: { b: -2, lx: -3, mao: [46, 14], dir: unit(-0.45, -0.9), lamina: 40, pes: [[30, 94], [64, 94]], viseira: '#ff7a3a' },
  golpe: { b: 3, lx: 5, mao: [70, 52], dir: unit(0.7, 0.72), lamina: 42, pes: [[28, 95], [72, 94]], viseira: '#ff5a2a' },
  dano: { b: 1, lx: -5, mao: [54, 56], dir: unit(0.35, 0.94), lamina: 42, pes: [[32, 94], [58, 94]], viseira: '#7a4a2a' },
  vitoria: { b: -1, lx: 0, mao: [58, 16], dir: unit(0.1, -1), lamina: 38, pes: [[34, 94], [62, 94]], viseira: '#ffd27a' },
}

const guardiao: Desenho = (g, pose) => {
  const Q = POSE_GUARDIAO[pose]
  const { b, lx } = Q
  const aco = g.material(MAT.aco2), ouro = g.material(MAT.ouro), tab = g.material(MAT.tabardo), couro = g.material(MAT.couro), escuro = g.material(MAT.ferro)
  const quadrilT: P = [38 + lx * 0.3, 66], quadrilF: P = [54 + lx * 0.3, 66]
  const ombroT: P = [30 + lx, 36 + b], ombroF: P = [60 + lx, 35 + b]
  const cabeca: P = [46 + lx, 20 + b]
  const mao2 = soma(Q.mao, Q.dir, -6)

  // capa pesada atrás
  g.poligono([[ombroT[0] - 2, ombroT[1] - 4], [ombroF[0], ombroF[1] - 4], [ombroF[0] + 2, 70], [quadrilT[0] - 4, 96], [6 - lx, 98], [ombroT[0] - 14 - lx, 62]], tab, 4)
  for (let k = 0; k < 4; k++) g.linha(ombroT[0] - 6 + k * 6, ombroT[1] + 6, ombroT[0] - 16 + k * 7 - lx, 96, '#741610')
  // braço de trás
  const cotT = junta(ombroT, mao2, 13, 13, -1)
  g.membro(ombroT[0], ombroT[1], cotT[0], cotT[1], 5.4, 4.6, escuro)
  g.membro(cotT[0], cotT[1], mao2[0], mao2[1], 5, 4.4, aco)
  g.elipse(mao2[0], mao2[1], 3.6, 3.6, escuro)
  // pernas blindadas
  for (const [q, pe, lado] of [[quadrilT, Q.pes[0], 1], [quadrilF, Q.pes[1], -1]] as Array<[P, P, 1 | -1]>) {
    const joelho = junta(q, pe, 14, 14, lado)
    g.membro(q[0], q[1], joelho[0], joelho[1], 6.4, 5.6, escuro)
    g.membro(joelho[0], joelho[1], pe[0], pe[1], 5.6, 5, aco)
    g.elipse(joelho[0], joelho[1], 4.6, 4.2, aco)
    g.ponto(joelho[0], joelho[1] - 1, '#fff1b0')
    g.poligono([[pe[0] - 7, pe[1] - 2], [pe[0] + 4, pe[1] - 3], [pe[0] + 10, pe[1] + 2], [pe[0] + 10, pe[1] + 6], [pe[0] - 7, pe[1] + 6]], aco, 2)
  }
  // tronco: peitoral de placas e tabardo com a taça
  g.poligono([[quadrilT[0] - 6, 68], [quadrilF[0] + 6, 68], [ombroF[0] + 4, 50 + b], [ombroF[0] + 5, ombroF[1]], [ombroF[0] - 2, ombroF[1] - 6], [ombroT[0] + 2, ombroT[1] - 6], [ombroT[0] - 5, ombroT[1] + 1], [ombroT[0] - 4, 50 + b]], aco, 6)
  for (let y = 0; y < 3; y++) g.linha(ombroT[0] + 2, 54 + y * 4, ombroF[0] - 2, 54 + y * 4, '#3e475c')
  g.poligono([[quadrilT[0] + 1, 44 + b], [quadrilF[0] - 1, 44 + b], [quadrilF[0] + 1, 86], [(quadrilT[0] + quadrilF[0]) / 2, 90], [quadrilT[0] - 1, 86]], tab, 3)
  for (let y = 44; y <= 86; y += 2) { g.ponto(quadrilT[0] + 1, y + (y < 60 ? b : 0), '#f2c45a'); g.ponto(quadrilF[0] - 1, y + (y < 60 ? b : 0), '#f2c45a') }
  // emblema: taça dourada
  const ex = (quadrilT[0] + quadrilF[0]) / 2, ey = 56 + b
  g.poligono([[ex - 5, ey - 4], [ex + 5, ey - 4], [ex + 3, ey + 1], [ex - 3, ey + 1]], ouro, 1)
  g.retangulo(ex - 1, ey + 1, 2, 3, ouro, 1); g.retangulo(ex - 3, ey + 4, 6, 2, ouro, 1)
  g.ponto(ex - 3, ey - 3, '#ffffff')
  // cinto de ouro
  g.retangulo(quadrilT[0] - 5, 64, 26, 4, ouro, 1)
  // ombreiras colossais em camadas
  for (const o of [ombroT, ombroF]) {
    g.elipse(o[0], o[1] + 1, 10, 7, aco)
    g.elipse(o[0], o[1] + 6, 9, 4.5, aco)
    for (let a = Math.PI * 1.05; a < Math.PI * 1.95; a += 0.12) g.ponto(o[0] + Math.cos(a) * 9.6, o[1] + 1 + Math.sin(a) * 6.6, '#f2c45a')
    g.poligono([[o[0] - 2, o[1] - 6], [o[0] + 1, o[1] - 13], [o[0] + 3, o[1] - 6]], aco, 1)
  }
  // elmo fechado com viseira em brasa e penacho
  const [hx, hy] = cabeca
  g.membro(hx - 3, hy - 8, hx - 18, hy - 2 + b, 3, 1.5, tab)
  g.membro(hx - 1, hy - 9, hx - 14, hy - 10, 2.6, 1.2, tab)
  g.poligono([[hx - 9, hy - 6], [hx - 5, hy - 11], [hx + 6, hy - 11], [hx + 10, hy - 6], [hx + 10, hy + 8], [hx + 4, hy + 11], [hx - 6, hy + 11], [hx - 9, hy + 6]], aco, 3)
  g.linha(hx + 1, hy - 11, hx + 1, hy + 11, '#f2c45a')
  g.linha(hx - 7, hy, hx + 9, hy, '#12141e'); g.linha(hx - 6, hy + 1, hx + 9, hy + 1, '#12141e')
  g.linha(hx - 5, hy, hx + 8, hy, Q.viseira); g.ponto(hx + 5, hy, '#fff7d0'); g.ponto(hx + 6, hy, '#fff7d0')
  for (const y of [hy + 4, hy + 6, hy + 8]) for (const x of [hx + 4, hx + 7]) g.ponto(x, y, '#12141e')
  g.ponto(hx - 5, hy - 8, '#ffffff'); g.ponto(hx - 4, hy - 9, '#e8eef8')

  // espadão: lâmina com sulco, guarda larga de ouro, punho de couro e pomo
  const guarda = soma(Q.mao, Q.dir, 4), ponta = soma(guarda, Q.dir, Q.lamina), pomo = soma(Q.mao, Q.dir, -10)
  const v: P = [-Q.dir[1], Q.dir[0]]
  g.poligono([soma(guarda, v, -3.2), soma(guarda, v, 3.2), soma(soma(ponta, Q.dir, -6), v, 2.6), ponta, soma(soma(ponta, Q.dir, -6), v, -2.6)], aco, 1)
  for (let k = 2; k < Q.lamina - 7; k++) { const q = soma(guarda, Q.dir, k); g.ponto(q[0], q[1], '#8a96aa'); const l = soma(q, v, -2); g.ponto(l[0], l[1], '#ffffff') }
  g.membro(pomo[0], pomo[1], guarda[0], guarda[1], 2, 2, couro)
  placa(g, guarda, Q.dir, 3, 18, ouro, 1)
  for (const k of [-9, 9]) { const q = soma(guarda, v, k); g.elipse(q[0], q[1], 1.8, 1.8, ouro) }
  g.elipse(pomo[0], pomo[1], 3, 3, ouro); g.ponto(pomo[0], pomo[1], '#ff5a3c')

  // braço da frente por cima do punho
  const cotF = junta(ombroF, Q.mao, 13, 13, pose === 'preparo' || pose === 'vitoria' ? -1 : 1)
  g.membro(ombroF[0], ombroF[1], cotF[0], cotF[1], 5.6, 4.8, escuro)
  g.membro(cotF[0], cotF[1], Q.mao[0], Q.mao[1], 5.2, 4.6, aco)
  g.elipse(cotF[0], cotF[1], 4, 4, aco)
  g.elipse(Q.mao[0], Q.mao[1], 4, 4, escuro)
  g.ponto(Q.mao[0] - 1, Q.mao[1] - 1, '#a9b6ca')
  // ombreira da frente de novo, por cima do braço
  g.elipse(ombroF[0], ombroF[1] + 1, 10, 7, aco)
  for (let a = Math.PI * 1.05; a < Math.PI * 1.95; a += 0.12) g.ponto(ombroF[0] + Math.cos(a) * 9.6, ombroF[1] + 1 + Math.sin(a) * 6.6, '#f2c45a')
  g.poligono([[ombroF[0] - 2, ombroF[1] - 6], [ombroF[0] + 1, ombroF[1] - 13], [ombroF[0] + 3, ombroF[1] - 6]], aco, 1)
}

const DESENHOS: Record<Personagem, Desenho> = { heroi, golem, serpente, guardiao }

function montar(quem: Personagem, pose: Pose) {
  const [w, h] = TAMANHO[quem]
  const g = new Grade(w, h)
  ;[g.ox, g.oy] = ORIGEM[quem]
  DESENHOS[quem](g, pose)
  return g
}

/** Pinta uma pose do sprite, na resolução nativa. */
export function pintarPersonagem(canvas: HTMLCanvasElement, quem: Personagem, pose: Pose = 'parado') {
  montar(quem, pose).pintar(canvas)
}

const caixas = new Map<Personagem, [number, number, number, number]>()
/**
 * Caixa do corpo na pose parada (x, y, largura, altura no canvas): é o que
 * ocupa espaço no layout. As outras poses podem passar dela (martelo erguido,
 * espada no golpe) sem empurrar nada.
 */
export function caixaDoCorpo(quem: Personagem) {
  let c = caixas.get(quem)
  if (!c) { c = montar(quem, 'parado').limites(); caixas.set(quem, c) }
  return c
}

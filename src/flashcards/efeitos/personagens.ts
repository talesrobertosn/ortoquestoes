/**
 * Sprites em pixel art nativa, montados num esqueleto articulado sobre o motor
 * de pixel.ts: ombro, cotovelo, mão, quadril, joelho e arma são pontos, e cada
 * pose só move esses pontos. Assim o mesmo desenho vira várias poses
 * (parado, preparo, golpe, dano, vitória) sem redesenhar à mão.
 * Fantasia original, sem anatomia humana médica.
 */
import { Grade, MAT } from './pixel'

export type Personagem = 'golem' | 'serpente' | 'guardiao' | 'heroi' | 'dragao' | 'raptor' | 'gosma' | 'mimico' | 'sabio' | 'caixeira'
export type Pose = 'parado' | 'respira' | 'preparo' | 'golpe' | 'dano' | 'vitoria'
export const POSES: Pose[] = ['parado', 'respira', 'preparo', 'golpe', 'dano', 'vitoria']

/** Tamanho do canvas de cada sprite, em pixels nativos. */
export const TAMANHO: Record<Personagem, [number, number]> = {
  heroi: [56, 52], golem: [104, 100], serpente: [84, 76], guardiao: [124, 128],
  dragao: [156, 132], raptor: [100, 88], gosma: [92, 80], mimico: [92, 84], sabio: [48, 60], caixeira: [52, 58],
}
/** Origem do desenho local dentro do canvas (o herói tem folga para capa, asas e coroa dos estágios). */
const ORIGEM: Record<Personagem, [number, number]> = {
  heroi: [11, 10], golem: [12, 16], serpente: [16, 14], guardiao: [16, 26],
  dragao: [12, 16], raptor: [8, 12], gosma: [6, 12], mimico: [8, 12], sabio: [3, 3], caixeira: [3, 3],
}

/** Cores de fragmentos e partículas (dano e derrota). */
export const PALETA_PERSONAGEM: Record<Personagem, string[]> = {
  golem: ['#fbf6e8', '#ddd3bb', '#ab9f86', '#7fe6ff'],
  serpente: ['#fff0a0', '#e2b444', '#a8781e', '#ff6a4a'],
  guardiao: ['#e8eef8', '#a9b6ca', '#f2c45a', '#c43a24'],
  heroi: ['#7fb2f0', '#b9c6d8', '#f4f8ff'],
  dragao: ['#fffaf0', '#e8dcc0', '#7fe0ff', '#86789e'],
  raptor: ['#c8f0a0', '#7ac850', '#f07a5a', '#fff8dc'],
  gosma: ['#f0f4f8', '#bcc8d4', '#8494a6', '#ffffff'],
  mimico: ['#c08a54', '#8f5f34', '#f2c45a', '#c43a24'],
  sabio: ['#a878f0', '#ffffff', '#7fe0ff'],
  caixeira: ['#5fdc7a', '#f2c45a', '#b98250'],
}

type P = [number, number]
type Desenho = (g: Grade, pose: Pose, variante?: string) => void

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
const heroi: Desenho = (g, pose, variante) => {
  const r = pose === 'respira' || pose === 'dano' ? 1 : 0
  const estagio = variante?.startsWith('heroi-') ? Number(variante.slice(6)) : 1
  adornoAtras(g, r, estagio)
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
  adornoFrente(g, r, estagio)
}

/**
 * Equipamento dos estágios (o cavaleirinho original continua o mesmo por
 * baixo; só ganha peças): 2 ombreira de ouro; 3 capa longa e as duas
 * ombreiras; 4 asas de ouro no elmo e lâmina que brilha; 5 asas de luz,
 * coroa e auréola.
 */
function adornoAtras(g: Grade, r: number, estagio: number) {
  if (estagio >= 5) {
    const luz = g.material(MAT.luz)
    for (const lado of [-1, 1]) {
      const ox = lado < 0 ? 11 : 23
      for (let k = 0; k < 5; k++) {
        const ang = -0.35 - k * 0.32, comp = 15 - k * 1.6
        const tx = ox + lado * Math.cos(ang) * comp * 1.25, ty = 22 + r + Math.sin(ang) * comp - 2
        g.membro(ox, 23 + r, tx, ty, 2.4, 1.1, luz, 0.15 - k * 0.04)
      }
    }
  }
  if (estagio >= 4) {
    const ciano = g.material(MAT.ciano)
    for (let i = 0; i < 19; i++) g.elipse(27 + i * 0.3, 25 + r - i, 1.7, 1.2, ciano, 0.6, 0.4)
  }
  if (estagio >= 3) {
    const tab = g.material(MAT.tabardo)
    g.poligono([[9, 20 + r], [25, 20 + r], [35, 40], [27, 41.5], [17, 40.5], [1, 41.5]], tab, 3)
    for (let x = 2; x <= 34; x++) if (g.ocupado(x, 40)) g.ponto(x, 40, x % 2 ? '#f2c45a' : '#c28a2a')
  }
}
function adornoFrente(g: Grade, r: number, estagio: number) {
  if (estagio < 2) return
  const ouro = g.material(MAT.ouro)
  g.elipse(24.5, 23.5 + r, 3.6, 2.6, ouro); g.ponto(23.5, 22.5 + r, '#ffffff')
  if (estagio >= 3) { g.elipse(10, 23 + r, 3.4, 2.4, ouro); g.ponto(9, 22 + r, '#ffffff') }
  if (estagio >= 4) {
    g.poligono([[9, 8 + r], [1, 1 + r], [4, 6 + r], [0, 6 + r], [7, 11 + r]], ouro, 1)
    g.poligono([[25, 8 + r], [33, 1 + r], [30, 6 + r], [34, 6 + r], [27, 11 + r]], ouro, 1)
  }
  if (estagio >= 5) {
    g.poligono([[11, 1 + r], [12, -4 + r], [14, -1 + r], [17, -6 + r], [20, -1 + r], [22, -4 + r], [23, 1 + r]], ouro, 1)
    g.ponto(17, -3 + r, '#ff5a7a'); g.ponto(12, -2 + r, '#7fe0ff'); g.ponto(22, -2 + r, '#7fe0ff')
    for (let a = 0; a < Math.PI * 2; a += 0.22) g.ponto(17 + Math.cos(a) * 8, -8 + r + Math.sin(a) * 1.8, a < Math.PI ? '#fff1b0' : '#f2c45a')
  }
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

/* ------------------------------------------------------------ Dragão de Ossos (chefe) */
/**
 * Dragão de Ossos: fantasia pura, um dragão esqueleto com chifres, asas de
 * membrana rasgada e um fogo-fátuo no peito e nos olhos. Encara a esquerda.
 */
interface PoseDragao { b: number; cab: P; boca: number; asa: number; fogo: number; pe: P }
const POSE_DRAGAO: Record<Pose, PoseDragao> = {
  parado: { b: 0, cab: [26, 36], boca: 0.1, asa: 0, fogo: 0.35, pe: [52, 102] },
  respira: { b: 1, cab: [26, 37], boca: 0.15, asa: 0.12, fogo: 0.45, pe: [52, 102] },
  preparo: { b: -2, cab: [36, 22], boca: 0.55, asa: 0.95, fogo: 0.95, pe: [56, 102] },
  golpe: { b: 3, cab: [12, 50], boca: 1, asa: -0.45, fogo: 1, pe: [42, 102] },
  dano: { b: 1, cab: [38, 40], boca: 0.6, asa: -0.7, fogo: 0.1, pe: [56, 102] },
  vitoria: { b: -2, cab: [24, 16], boca: 0.85, asa: 1.25, fogo: 0.85, pe: [52, 102] },
}

const dragao: Desenho = (g, pose) => {
  const Q = POSE_DRAGAO[pose]
  const { b } = Q
  const osso = g.material(MAT.osso), memb = g.material(MAT.membrana), fogo = g.material(MAT.ciano)
  const chama = Q.fogo > 0.6 ? '#ffffff' : '#bff8ff', chama2 = '#7fe0ff'
  const asa = (A: P, k: number, escuro: number, ergue: number) => {
    const sobe = Q.asa + ergue
    const E: P = [A[0] + 22 * k, A[1] - (30 + sobe * 14) * k]
    const T: P = [E[0] + 32 * k, Math.max(-14, E[1] - (6 + sobe * 14) * k)]
    const dedos: P[] = [[E[0] + 38 * k, E[1] + (26 - sobe * 6) * k], [E[0] + 26 * k, E[1] + (40 - sobe * 3) * k], [E[0] + 10 * k, E[1] + 45 * k]]
    // membrana em arcos entre os dedos (cada borda recua em direção ao cotovelo)
    const recuo = (a: P, c: P, f = 0.3): P => { const m: P = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]; return [m[0] + (E[0] - m[0]) * f, m[1] + (E[1] - m[1]) * f] }
    const fim: P = [A[0] + 8, A[1] + 12]
    g.poligono([A, E, T, recuo(T, dedos[0], 0.22), dedos[0], recuo(dedos[0], dedos[1]), dedos[1], recuo(dedos[1], dedos[2]), dedos[2], recuo(dedos[2], fim, 0.2), fim], memb, 3, escuro)
    // dois rasgos na borda de fuga
    for (const [a, c, t] of [[dedos[0], dedos[1], 0.4], [dedos[1], dedos[2], 0.6]] as Array<[P, P, number]>) {
      const x = a[0] + (c[0] - a[0]) * t, y = a[1] + (c[1] - a[1]) * t
      for (let i = 0; i < 6; i++) for (let j = -2 + Math.floor(i / 2); j <= 2 - Math.floor(i / 2); j++) g.apagar(x + (E[0] - x) * i * 0.03 + j, y + (E[1] - y) * i * 0.06)
    }
    g.membro(A[0], A[1], E[0], E[1], 3, 2.2, osso, escuro)
    g.membro(E[0], E[1], T[0], T[1], 2.2, 1.2, osso, escuro)
    for (const d of dedos) g.membro(E[0], E[1], d[0], d[1], 1.6, 0.8, osso, escuro)
    g.elipse(E[0], E[1], 2.6, 2.6, osso, 1, escuro)
    g.poligono([[T[0] - 1, T[1]], [T[0] + 3, T[1] - 4], [T[0] + 2, T[1] + 1]], osso, 1, escuro)
  }
  // asa de trás (mais escura) e cauda
  asa([58, 40 + b], 0.86, -0.3, 0.45)
  const cauda: P[] = [[100, 66 + b], [114, 72], [126, 82], [130, 94], [122, 102], [110, 100]]
  for (let i = 0; i < cauda.length - 1; i++) {
    const [a, c] = [cauda[i], cauda[i + 1]]
    for (let t = 0; t < 1; t += 0.25) {
      const x = a[0] + (c[0] - a[0]) * t, y = a[1] + (c[1] - a[1]) * t, r = 4 - (i + t) * 0.55
      g.elipse(x, y, Math.max(1.2, r), Math.max(1.2, r * 0.9), osso)
      if (t === 0 && i < 4) g.poligono([[x - 1, y - r], [x + 1, y - r - 4], [x + 2, y - r]], osso, 1)
    }
  }
  g.poligono([[110, 100], [104, 95], [100, 101], [106, 105]], osso, 1)
  // pata de trás
  const quadril: P = [96, 66 + b], peT: P = [94, 102]
  const joelho = junta(quadril, peT, 20, 20, -1)
  g.membro(quadril[0], quadril[1], joelho[0], joelho[1], 4.4, 3, osso, -0.15)
  g.membro(joelho[0], joelho[1], peT[0], peT[1], 3, 2.4, osso, -0.15)
  for (const dx of [-6, -3, 0]) g.membro(peT[0], peT[1], peT[0] + dx - 3, peT[1] + 2, 1.4, 0.8, osso, -0.15)
  // fogo-fátuo no peito, atrás das costelas
  g.elipse(80, 64 + b, 8 + Q.fogo * 2, 7 + Q.fogo * 2, fogo, 0.7, 0.2 + Q.fogo * 0.5)
  for (const [x, y] of [[80, 62], [78, 64], [82, 65], [80, 66], [79, 60]] as P[]) g.ponto(x, y + b, chama)
  // espinha e costelas
  const coluna = (t: number): P => [62 + (100 - 62) * t, 46 + b + Math.sin(t * Math.PI) * -6 + t * 18]
  for (let t = 0; t <= 1.001; t += 0.07) {
    const [x, y] = coluna(t)
    g.elipse(x, y, 3.2, 2.8, osso)
    g.poligono([[x - 1.5, y - 2], [x + 0.5, y - 7 - Math.sin(t * Math.PI) * 2], [x + 2, y - 2]], osso, 1)
  }
  for (let k = 0; k < 7; k++) {
    const t = 0.1 + k * 0.12, [x, y] = coluna(t)
    const meio: P = [x + 3, y + 10 + k * 0.4], fim: P = [x - 2 + k * 0.6, 80 + b - Math.abs(k - 3) * 1.2]
    g.membro(x, y, meio[0], meio[1], 1.5, 1.3, osso)
    g.membro(meio[0], meio[1], fim[0], fim[1], 1.3, 1, osso)
  }
  g.membro(64, 82 + b, 92, 80 + b, 1.4, 1.4, osso, -0.1)
  // pata da frente
  const ombro: P = [66, 54 + b]
  const cot = junta(ombro, Q.pe, 22, 22, 1)
  g.membro(ombro[0], ombro[1], cot[0], cot[1], 4.2, 3, osso)
  g.membro(cot[0], cot[1], Q.pe[0], Q.pe[1], 3, 2.4, osso)
  g.elipse(cot[0], cot[1], 3.4, 3.4, osso)
  for (const dx of [-7, -4, -1]) { g.membro(Q.pe[0], Q.pe[1], Q.pe[0] + dx - 2, Q.pe[1] + 2, 1.5, 0.7, osso); g.ponto(Q.pe[0] + dx - 3, Q.pe[1] + 3, '#ffffff') }
  // pescoço em vértebras até o crânio
  const [hx, hy] = Q.cab
  const baseCab: P = [hx + 12, hy + 4]
  for (let i = 0; i <= 9; i++) {
    const t = i / 9
    const x = 62 + (baseCab[0] - 62) * t, y = 46 + b + (baseCab[1] - 46 - b) * t - Math.sin(t * Math.PI) * 9
    g.elipse(x, y, 3.8 - t * 0.8, 3.2 - t * 0.6, osso)
    g.poligono([[x - 1, y - 3], [x + 1, y - 7], [x + 2, y - 3]], osso, 1)
  }
  // crânio de dragão: focinho longo, chifres, órbita com fogo-fátuo
  g.membro(hx + 6, hy - 6, hx + 22, hy - 18, 2.4, 0.6, osso, -0.05)
  g.membro(hx + 9, hy - 3, hx + 24, hy - 6, 2, 0.5, osso, -0.1)
  const mand = Q.boca * 0.55
  const J: P = [hx + 8, hy + 3]
  const ponta: P = [J[0] - 26 * Math.cos(mand), J[1] + 26 * Math.sin(mand) + 2]
  // boca aberta: fogo-fátuo entre as mandíbulas
  if (Q.boca > 0.4) {
    g.poligono([[hx - 16, hy + 2], J, [ponta[0] + 2, ponta[1] - 1]], fogo, 2, Q.fogo * 0.6)
    if (Q.fogo > 0.8) for (let k = 0; k < 6; k++) g.elipse(hx - 20 - k * 3, hy + 6 + k * (pose === 'golpe' ? 1.5 : -0.6), 2.4 - k * 0.3, 1.8, fogo, 0.6, 0.5)
  }
  g.poligono([[J[0], J[1] - 1], [J[0] + 2, J[1] + 2], [ponta[0] + 1, ponta[1] + 2], [ponta[0] - 1, ponta[1]]], osso, 1.5)
  for (let k = 3; k < 24; k += 3) { const x = J[0] - k * Math.cos(mand), y = J[1] + k * Math.sin(mand) - 1; g.ponto(x, y, '#ffffff') }
  g.poligono([[hx + 12, hy], [hx + 9, hy - 7], [hx + 1, hy - 9], [hx - 9, hy - 7], [hx - 18, hy - 3], [hx - 21, hy + 1], [hx - 16, hy + 3], [hx - 4, hy + 2], [hx + 7, hy + 5]], osso, 2)
  g.linha(hx - 14, hy - 4, hx + 4, hy - 8, '#ffffff')
  for (let x = hx - 18; x <= hx - 2; x += 2) g.ponto(x, hy + 3, '#ffffff')
  g.ponto(hx - 18, hy - 1, '#3a2a14'); g.ponto(hx - 17, hy - 1, '#3a2a14')
  g.elipse(hx, hy - 3, 3.4, 2.4, g.material(MAT.ferro), 1, -0.7)
  g.ponto(hx, hy - 3, chama); g.ponto(hx - 1, hy - 3, chama2); g.ponto(hx + 1, hy - 4, chama2); g.ponto(hx - 1, hy - 4, chama2)
  if (Q.fogo > 0.6) { g.ponto(hx + 2, hy - 5, chama2); g.ponto(hx + 3, hy - 6, '#bff8ff') }
  // asa da frente por cima do corpo
  asa([70, 44 + b], 1, 0, 0)
}

/* ------------------------------------------------------------ Raptor */
interface PoseRaptor { b: number; cab: P; boca: number; pes: [P, P]; garra: boolean; cauda: number }
const POSE_RAPTOR: Record<Pose, PoseRaptor> = {
  parado: { b: 0, cab: [18, 22], boca: 0, pes: [[40, 74], [58, 74]], garra: false, cauda: 0 },
  respira: { b: 1, cab: [18, 23], boca: 0.1, pes: [[40, 74], [58, 74]], garra: false, cauda: 1 },
  preparo: { b: 4, cab: [28, 28], boca: 0.35, pes: [[36, 74], [60, 74]], garra: true, cauda: -3 },
  golpe: { b: 2, cab: [4, 34], boca: 1, pes: [[26, 72], [56, 74]], garra: true, cauda: 4 },
  dano: { b: 0, cab: [28, 18], boca: 0.6, pes: [[42, 74], [60, 74]], garra: false, cauda: -2 },
  vitoria: { b: -2, cab: [14, 8], boca: 1, pes: [[40, 74], [58, 74]], garra: true, cauda: -4 },
}
const raptor: Desenho = (g, pose) => {
  const Q = POSE_RAPTOR[pose]
  const { b } = Q
  const esc = g.material(MAT.escamaVerde), ventre = g.material(MAT.ventre), crista = g.material(MAT.vermelho), osso = g.material(MAT.osso)
  const perna = (pe: P, escuro: number) => {
    const quadril: P = [50, 46 + b]
    const tornozelo: P = [pe[0] + 5, pe[1] - 9]
    const joelho = junta(quadril, tornozelo, 13, 14, -1)
    g.elipse(quadril[0], quadril[1], 8, 9, esc, 1, escuro)
    g.membro(quadril[0], quadril[1], joelho[0], joelho[1], 6, 4, esc, escuro)
    g.membro(joelho[0], joelho[1], tornozelo[0], tornozelo[1], 3.4, 2.4, esc, escuro)
    g.membro(tornozelo[0], tornozelo[1], pe[0], pe[1], 2.4, 2, esc, escuro)
    g.membro(pe[0], pe[1], pe[0] - 6, pe[1] + 1, 1.8, 1, esc, escuro)
    if (Q.garra) g.membro(pe[0] + 1, pe[1] - 1, pe[0] - 1, pe[1] - 7, 1.4, 0.6, osso, escuro)
    else g.membro(pe[0] + 1, pe[1] - 1, pe[0] - 3, pe[1] - 3, 1.3, 0.6, osso, escuro)
  }
  perna(Q.pes[1], -0.25)
  // cauda longa que equilibra o corpo
  const pts: P[] = [[60, 38 + b], [70, 34 + b + Q.cauda * 0.3], [80, 30 + Q.cauda * 0.6], [88, 28 + Q.cauda]]
  for (let i = 0; i < pts.length - 1; i++) for (let t = 0; t < 1; t += 0.2) {
    const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t
    const r = 7 - (i + t) * 2
    g.elipse(x, y, Math.max(1.4, r), Math.max(1.2, r * 0.8), esc)
  }
  // tronco, ventre claro e listras
  g.elipse(46, 40 + b, 17, 10.5, esc)
  g.elipse(43, 45 + b, 11, 5, ventre, 0.7)
  for (const x of [40, 46, 52, 58]) { g.linha(x, 31 + b, x + 3, 36 + b, '#1e4a18'); g.linha(x + 1, 31 + b, x + 4, 36 + b, '#3e8a2e') }
  // braço curto com garras
  g.membro(36, 42 + b, 30, 48 + b, 2.4, 1.8, esc)
  g.membro(30, 48 + b, 27, 51 + b, 1.4, 1, osso)
  perna(Q.pes[0], 0)
  // pescoço e cabeça alongada
  const [hx, hy] = Q.cab
  for (let i = 0; i <= 6; i++) { const t = i / 6; g.elipse(34 + (hx + 6 - 34) * t, 34 + b + (hy + 4 - 34 - b) * t, 5.4 - t, 4.6 - t * 0.6, esc) }
  // crista de penas vermelhas na nuca e no pescoço
  for (let i = 0; i < 5; i++) { const t = i / 5, x = hx + 8 + (34 - hx - 8) * t, y = hy - 2 + (30 + b - hy) * t; g.poligono([[x - 2, y], [x + 3, y - 5 - (i === 0 ? 2 : 0)], [x + 2, y + 1]], crista, 1) }
  const mand = Q.boca * 0.5
  const J: P = [hx + 6, hy + 2]
  const ponta: P = [J[0] - 19 * Math.cos(mand), J[1] + 19 * Math.sin(mand) + 1]
  if (Q.boca > 0.2) g.poligono([[hx - 12, hy + 2], J, ponta], crista, 1, -0.4)
  g.poligono([J, [J[0] + 1, J[1] + 3], [ponta[0] + 1, ponta[1] + 2], [ponta[0] - 1, ponta[1]]], esc, 1.5, -0.1)
  for (let k = 3; k < 18; k += 3) g.ponto(J[0] - k * Math.cos(mand), J[1] + k * Math.sin(mand) - 1, '#ffffff')
  g.poligono([[hx + 9, hy - 3], [hx - 1, hy - 6], [hx - 12, hy - 3], [hx - 15, hy + 1], [hx - 12, hy + 3], [hx + 8, hy + 4]], esc, 2)
  for (let x = hx - 13; x <= hx - 2; x += 2) g.ponto(x, hy + 3, '#ffffff')
  g.ponto(hx + 1, hy - 3, '#ffe040'); g.ponto(hx + 2, hy - 3, '#ffe040'); g.ponto(hx + 1, hy - 2, '#1a1006'); g.ponto(hx + 2, hy - 2, '#ffb020')
  g.ponto(hx - 14, hy, '#0a1e08')
}

/* ------------------------------------------------------------ Gosma de cimento */
interface PoseGosma { w: number; h: number; dx: number; boca: number; brava: boolean }
const POSE_GOSMA: Record<Pose, PoseGosma> = {
  parado: { w: 30, h: 36, dx: 0, boca: 0.2, brava: false },
  respira: { w: 32, h: 34, dx: 0, boca: 0.2, brava: false },
  preparo: { w: 24, h: 48, dx: 2, boca: 0.6, brava: true },
  golpe: { w: 39, h: 27, dx: -9, boca: 1, brava: true },
  dano: { w: 28, h: 33, dx: 4, boca: 0.5, brava: false },
  vitoria: { w: 27, h: 46, dx: 0, boca: 1, brava: false },
}
const gosma: Desenho = (g, pose, variante) => {
  const Q = POSE_GOSMA[pose]
  const cim = g.material(MAT.cimento), ferro = g.material(MAT.ferro)
  const cx = 40 + Q.dx, base = 66, topo = base - Q.h
  // poça na base e corpo em gota
  g.elipse(40 + Q.dx * 0.5, base - 1, Q.w + 7, 4.5, cim, 0.5)
  g.poligono([[cx - Q.w, base], [cx - Q.w * 0.95, base - Q.h * 0.45], [cx - Q.w * 0.7, base - Q.h * 0.82], [cx - Q.w * 0.3, topo + 1], [cx + 2, topo - 2], [cx + Q.w * 0.35, topo + 2], [cx + Q.w * 0.75, base - Q.h * 0.8], [cx + Q.w, base - Q.h * 0.4], [cx + Q.w + 1, base]], cim, 9)
  for (const k of [-0.8, -0.4, 0.5, 0.85]) g.elipse(cx + Q.w * k, base + 1, 3, 3.5, cim, 0.8)
  // parafusos e bolhas presos na massa
  for (const [fx, fy, ang] of [[-0.45, 0.35, 0.6], [0.4, 0.55, -0.8], [0.1, 0.22, 1.9]] as Array<[number, number, number]>) {
    const x = cx + Q.w * fx, y = base - Q.h * fy
    g.membro(x, y, x + Math.cos(ang) * 6, y + Math.sin(ang) * 6, 1.2, 1, ferro, -0.1)
    g.elipse(x, y, 2, 2, ferro, 1, 0.1)
    for (let k = 1; k < 6; k += 2) g.ponto(x + Math.cos(ang) * k, y + Math.sin(ang) * k, '#373c47')
  }
  for (const [fx, fy, r] of [[-0.2, 0.7, 1.6], [0.55, 0.3, 1.2], [-0.65, 0.6, 1]] as Array<[number, number, number]>) {
    const x = cx + Q.w * fx, y = base - Q.h * fy
    for (let a = 0; a < Math.PI * 2; a += 0.6) g.ponto(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6, '#e8eef4')
  }
  // brilho molhado
  for (let k = 0; k < 7; k++) g.ponto(cx - Q.w * 0.55 + k * 1.2, topo + Q.h * 0.22 - k * 0.4 + k * k * 0.12, '#ffffff')
  // olhos e boca
  const oy = topo + Q.h * 0.42
  for (const ox of [cx - 8, cx + 6]) {
    g.elipse(ox, oy, 4, 4.6, g.material(MAT.papel), 1, 0.3)
    g.ponto(ox - 1 + (pose === 'golpe' ? -1 : 0), oy + 1, '#141820'); g.ponto(ox + (pose === 'golpe' ? -1 : 0), oy + 1, '#141820'); g.ponto(ox - 1 + (pose === 'golpe' ? -1 : 0), oy, '#2a3a5a'); g.ponto(ox - 2, oy - 2, '#ffffff')
    if (Q.brava) g.linha(ox - 4, oy - 6 + (ox < cx ? 0 : 2), ox + 3, oy - 4 - (ox < cx ? 0 : 2), '#161e2a')
  }
  const by = oy + 8, bw = 6 + Q.boca * 4
  g.elipse(cx - 1, by, bw, 1.2 + Q.boca * 3.6, g.material(MAT.vermelho), 1, -0.5)
  if (Q.boca > 0.5) { g.ponto(cx - 4, by - 2, '#ffffff'); g.ponto(cx + 2, by - 2, '#ffffff') }
  g.membro(cx + 3, by + 2, cx + 4, by + 7, 1.2, 0.8, cim, 0.2)
  if (pose === 'dano') for (let y = 0; y < 5; y++) for (let x = 0; x < 6 - y; x++) g.apagar(cx + Q.w * 0.6 + x, topo + Q.h * 0.3 + y)
  // a rainha tem coroa de ouro
  if (variante === 'rainha') {
    const ouro = g.material(MAT.ouro)
    const ty = topo - 1
    g.poligono([[cx - 10, ty + 2], [cx - 11, ty - 6], [cx - 6, ty - 2], [cx - 1, ty - 9], [cx + 4, ty - 2], [cx + 9, ty - 6], [cx + 8, ty + 2]], ouro, 1)
    g.ponto(cx - 1, ty - 4, '#ff5a7a'); g.ponto(cx - 7, ty - 1, '#7fe0ff'); g.ponto(cx + 5, ty - 1, '#7fe0ff'); g.ponto(cx - 9, ty - 4, '#fff1b0')
  }
}

/* ------------------------------------------------------------ Mímico do Arsenal */
interface PoseMimico { abre: number; dx: number; b: number; lingua: boolean }
const POSE_MIMICO: Record<Pose, PoseMimico> = {
  parado: { abre: 0.18, dx: 0, b: 0, lingua: false },
  respira: { abre: 0.26, dx: 0, b: 1, lingua: false },
  preparo: { abre: 0.95, dx: 2, b: -2, lingua: true },
  golpe: { abre: 0.7, dx: -9, b: 2, lingua: true },
  dano: { abre: 0.05, dx: 4, b: 1, lingua: false },
  vitoria: { abre: 0.85, dx: 0, b: -3, lingua: true },
}
const mimico: Desenho = (g, pose) => {
  const Q = POSE_MIMICO[pose]
  const mad = g.material(MAT.madeira), ferro = g.material(MAT.ferro), ouro = g.material(MAT.ouro), verm = g.material(MAT.vermelho), aco = g.material(MAT.aco)
  const x0 = 12 + Q.dx, x1 = 68 + Q.dx, topoBase = 42 + Q.b, fundo = 68
  const k = Q.abre * 22
  // pezinhos
  for (const x of [x0 + 5, x1 - 7]) g.retangulo(x, fundo - 1, 5, 4, mad, 1, -0.2)
  // interior escuro de veludo
  g.poligono([[x0 + 2, topoBase - k + 4], [x1 - 2, topoBase - k * 0.55 + 4], [x1 - 2, topoBase + 6], [x0 + 2, topoBase + 6]], verm, 2, -0.55)
  // olhos que brilham lá dentro
  if (Q.abre > 0.12) for (const ox of [x0 + 18, x0 + 34]) { g.ponto(ox, topoBase - k * 0.8 + 6, '#fff6b0'); g.ponto(ox + 1, topoBase - k * 0.8 + 6, '#ffd24a'); g.ponto(ox, topoBase - k * 0.8 + 7, '#ff9a2a') }
  // língua
  if (Q.lingua) { g.membro(x0 + 22, topoBase + 4, x0 + 8, topoBase + 16, 4.2, 3, g.material(MAT.pele), -0.1); g.linha(x0 + 20, topoBase + 5, x0 + 10, topoBase + 14, '#c98a62') }
  // caixa: madeira com cintas de ferro, cantos e fechadura de ouro
  g.retangulo(x0, topoBase + 4, x1 - x0, fundo - topoBase - 4, mad, 3)
  for (let y = topoBase + 8; y < fundo - 2; y += 5) g.linha(x0 + 2, y, x1 - 2, y, '#61391c')
  for (const x of [x0 + 2, x1 - 6]) g.retangulo(x, topoBase + 4, 4, fundo - topoBase - 4, ferro, 1)
  g.retangulo(x0 + (x1 - x0) / 2 - 4, topoBase + 8, 8, 9, ouro, 1)
  g.ponto(x0 + (x1 - x0) / 2, topoBase + 12, '#3a2408'); g.ponto(x0 + (x1 - x0) / 2, topoBase + 13, '#3a2408')
  // dentes: lâminas de aço na borda de baixo e na tampa
  for (let x = x0 + 4; x < x1 - 4; x += 5) g.poligono([[x, topoBase + 5], [x + 2, topoBase - 1], [x + 4, topoBase + 5]], aco, 1, 0.1)
  const tampa = (t: number) => topoBase - k * (1 - t * 0.45)
  for (let x = x0 + 4; x < x1 - 4; x += 5) { const t = (x - x0) / (x1 - x0); g.poligono([[x, tampa(t) + 1], [x + 2, tampa(t) + 7], [x + 4, tampa(t) + 1]], aco, 1, 0.1) }
  // tampa abaulada com cintas e um emblema de ouro
  g.poligono([[x0 - 2, tampa(0) + 2], [x0, tampa(0) - 8], [x0 + 10, tampa(0.18) - 12], [x1 - 10, tampa(0.82) - 12], [x1, tampa(1) - 8], [x1 + 2, tampa(1) + 2]], mad, 4)
  for (const x of [x0 + 3, x1 - 7]) { const t = (x - x0) / (x1 - x0); g.retangulo(x, tampa(t) - 10, 4, 12, ferro, 1) }
  const mx = x0 + (x1 - x0) / 2, my = tampa(0.5) - 5
  g.elipse(mx, my, 5, 4, ouro); g.linha(mx - 2, my, mx + 2, my, '#7a5214'); g.linha(mx, my - 2, mx, my + 2, '#7a5214')
  if (pose === 'dano') for (let y = 0; y < 4; y++) for (let x = 0; x < 5 - y; x++) g.apagar(x1 - 2 + x - 5, tampa(1) - 9 + y)
}

/* ------------------------------------------------------------ NPCs */
/** O Velho Preceptor: mago de barba branca, chapéu estrelado e cajado com cristal. */
const sabio: Desenho = (g, pose) => {
  const r = pose === 'respira' ? 1 : 0
  const ergue = pose === 'vitoria'
  const manto = g.material(MAT.roxo), barba = g.material(MAT.barba), pele = g.material(MAT.pele), mad = g.material(MAT.madeira), ouro = g.material(MAT.ouro), cristal = g.material(MAT.ciano)
  // cajado atrás da mão
  const topo = ergue ? 2 : 8
  g.membro(36, topo + 4, 36, 55, 1.4, 1.4, mad)
  g.elipse(36, topo + 1, 3.4, 4.4, cristal, 1, ergue ? 0.5 : 0.25)
  g.ponto(35, topo - 1, '#ffffff'); g.ponto(35, topo, '#ffffff')
  g.membro(33, topo + 5, 39, topo + 5, 1, 1, ouro)
  // manto longo
  g.poligono([[12, 27 + r], [30, 27 + r], [35, 55], [7, 55]], manto, 4)
  for (let x = 8; x <= 34; x++) if (g.ocupado(x, 54)) g.ponto(x, 54, x % 2 ? '#f2c45a' : '#c28a2a')
  g.retangulo(11, 38 + r, 20, 2.4, ouro, 1)
  // mãos
  g.elipse(36, (ergue ? 16 : 30) + r, 2.6, 2.4, pele)
  g.elipse(10, 38 + r, 2.4, 2.4, pele)
  // rosto, óculos redondos e barba enorme
  g.elipse(21, 20 + r, 7, 6.2, pele)
  g.poligono([[13, 21 + r], [29, 21 + r], [27, 32 + r], [21, 41 + r], [15, 32 + r]], barba, 4)
  g.poligono([[15, 23 + r], [21, 21 + r], [27, 23 + r], [24, 25 + r], [18, 25 + r]], barba, 2, 0.2)
  for (const ox of [18, 24]) for (let a = 0; a < Math.PI * 2; a += 0.5) g.ponto(ox + Math.cos(a) * 2.2, 19 + r + Math.sin(a) * 2, '#c28a2a')
  g.ponto(18, 19 + r, '#2a1a10'); g.ponto(24, 19 + r, '#2a1a10'); g.ponto(17, 18 + r, '#ffffff'); g.ponto(23, 18 + r, '#ffffff')
  g.ponto(21, 22 + r, '#e0907a')
  // chapéu pontudo e estrelado, com a ponta caída
  g.elipse(21, 15 + r, 14, 3.2, manto, 0.6)
  g.poligono([[11, 15 + r], [31, 15 + r], [27, 7 + r], [23, 1 + r], [30, -1 + r], [20, 0 + r], [15, 6 + r]], manto, 3)
  for (const [x, y] of [[17, 10], [24, 6], [21, 12], [27, 11]] as P[]) { g.ponto(x, y + r, '#fff1b0'); g.ponto(x + 1, y + r, '#f2c45a') }
  g.ponto(30, -1 + r, '#fff1b0')
}

/** A Caixeira do Arsenal: mercadora de capuz verde e mochila de instrumentos. */
const caixeira: Desenho = (g, pose) => {
  const r = pose === 'respira' ? 1 : 0
  const ergue = pose === 'vitoria'
  const capuz = g.material(MAT.verde), couro = g.material(MAT.couro), pele = g.material(MAT.pele), mad = g.material(MAT.madeira), ferro = g.material(MAT.ferro), ouro = g.material(MAT.ouro), cachecol = g.material(MAT.vermelho)
  // mochila enorme atrás, com cabos e uma régua saindo
  g.retangulo(26, 14 + r, 18, 26, mad, 3)
  for (const y of [20, 30]) g.linha(27, y + r, 43, y + r, '#3c210e')
  g.membro(30, 14 + r, 27, 2 + r, 1.4, 1.2, ferro); g.elipse(27, 2 + r, 2.6, 2, ferro)
  g.membro(38, 14 + r, 41, 4 + r, 1.2, 1.2, mad)
  for (let y = 5; y < 14; y += 2) g.ponto(41, y + r, '#fff1b0')
  // botas, saia de couro e capa verde com bordas
  g.retangulo(13, 50, 6, 5, couro, 1, -0.2); g.retangulo(23, 50, 6, 5, couro, 1, -0.2)
  g.poligono([[13, 30 + r], [29, 30 + r], [31, 51], [11, 51]], couro, 4)
  g.retangulo(12, 40 + r, 18, 2.4, g.material(MAT.ouro), 1)
  g.poligono([[11, 25 + r], [31, 25 + r], [33, 33 + r], [27, 38 + r], [21, 35 + r], [15, 38 + r], [9, 33 + r]], capuz, 3)
  g.retangulo(12, 24 + r, 18, 4, cachecol, 2)
  g.membro(25, 28 + r, 27, 37 + r, 2, 1.8, cachecol)
  // bolsa de moedas na mão
  const by = ergue ? 14 : 36
  g.elipse(8, by + r, 4, 4.6, couro); g.linha(6, by - 3 + r, 10, by - 3 + r, '#3a1f0e')
  g.elipse(8, by - 5 + r, 1.8, 1.4, ouro); g.ponto(7, by - 6 + r, '#ffffff')
  g.elipse(9, (ergue ? 18 : 33) + r, 2.4, 2.2, pele)
  // rosto dentro do capuz
  g.elipse(21, 16 + r, 10, 9.4, capuz)
  g.elipse(21, 18 + r, 6.6, 6, pele)
  g.poligono([[12, 15 + r], [18, 10 + r], [26, 10 + r], [30, 15 + r], [26, 13 + r], [17, 13 + r]], capuz, 2, 0.15)
  for (const x of [18, 24]) { g.ponto(x, 18 + r, '#1e1430'); g.ponto(x, 19 + r, '#2a5a3a'); g.ponto(x, 17 + r, '#ffffff') }
  g.ponto(20, 22 + r, '#c0604a'); g.ponto(21, 22 + r, '#c0604a'); g.ponto(22, 22 + r, '#c0604a')
  g.ponto(16, 20 + r, '#f5a08a'); g.ponto(26, 20 + r, '#f5a08a')
}

const DESENHOS: Record<Personagem, Desenho> = { heroi, golem, serpente, guardiao, dragao, raptor, gosma, mimico, sabio, caixeira }


/**
 * Variantes por troca de paleta (técnica clássica de RPG): o mesmo desenho com
 * outras rampas de material. Cada entrada troca a rampa inteira de um material
 * (e o contorno dele) e, se preciso, cores fixas (olhos, fendas, brasas).
 */
type Rampa = [string, string, string, string]
interface Variante { rampas?: Partial<Record<keyof typeof MAT, { rampa: Rampa; contorno?: string }>>; cores?: Record<string, string> }
export const VARIANTES: Record<string, Variante> = {
  // inimigos
  cristal: { rampas: { gesso: { rampa: ['#e8fbff', '#a9e4f2', '#5fb2cc', '#2c6a86'], contorno: '#0e2a3a' }, pedra: { rampa: ['#9fd6e8', '#5ea6c4', '#35708e', '#1c4058'], contorno: '#0a1c28' } }, cores: { '#7fe6ff': '#ff9ff0', '#e8ffff': '#fff0fb', '#bff8ff': '#ffd0f6', '#4fc8e8': '#e070c8', '#9ff0ff': '#ffc0ee' } },
  cimento: { rampas: { gesso: { rampa: ['#dcdcd6', '#aeaea6', '#7c7c76', '#4c4c48'], contorno: '#1c1c1a' }, pedra: { rampa: ['#9a9890', '#706e68', '#4c4a46', '#2e2d2a'], contorno: '#121210' }, musgo: { rampa: ['#c8c070', '#9a9244', '#6a6424', '#3c380e'] } }, cores: { '#7fe6ff': '#ffb35a', '#e8ffff': '#fff0c8', '#bff8ff': '#ffd890', '#4fc8e8': '#e07a28', '#9ff0ff': '#ffcc80' } },
  rubro: { rampas: { gesso: { rampa: ['#f6c8a8', '#d68a64', '#a4553a', '#64301e'], contorno: '#2a0e06' }, pedra: { rampa: ['#c27056', '#94483a', '#642c24', '#3c1612'], contorno: '#1a0604' } }, cores: { '#7fe6ff': '#ffe46a', '#e8ffff': '#fffbe0', '#bff8ff': '#fff2a0', '#4fc8e8': '#ff9a2a', '#9ff0ff': '#fff0a0' } },
  obsidiana: { rampas: { gesso: { rampa: ['#9a8ab8', '#6a5a8c', '#463a62', '#2a2240'], contorno: '#0c0816' }, pedra: { rampa: ['#5a4a74', '#3e3256', '#28203a', '#161022'], contorno: '#06040c' }, musgo: { rampa: ['#ff9a4a', '#e0602a', '#a03a14', '#601e08'] } }, cores: { '#7fe6ff': '#ff8a2a', '#e8ffff': '#fff0c0', '#bff8ff': '#ffc070', '#4fc8e8': '#e0501a', '#9ff0ff': '#ffb060' } },
  eletrica: { rampas: { escama: { rampa: ['#c8f6ff', '#5ec8e8', '#2c86b0', '#144a6a'], contorno: '#061826' }, ventre: { rampa: ['#f6ffff', '#d0f0ff', '#90c8e0', '#4a7a94'] }, vermelho: { rampa: ['#fff07a', '#f2c42a', '#b08410', '#604404'] } }, cores: { '#ff5a3c': '#fff27a', '#5e3c0c': '#0e3a5a', '#a8781e': '#2c86b0', '#d0281c': '#ffe040' } },
  prata: { rampas: { tabardo: { rampa: ['#6aa8f0', '#3a6ec8', '#22468a', '#122852'], contorno: '#060e22' }, ouro: { rampa: ['#ffffff', '#d8e2f0', '#9aa8c0', '#5a6680'], contorno: '#1a2030' } }, cores: { '#f2c45a': '#d8e2f0', '#fff1b0': '#ffffff', '#c28a2a': '#9aa8c0', '#ffb347': '#9fe0ff', '#ffd27a': '#c8f0ff', '#ff7a3a': '#5fc8ff', '#ff5a2a': '#3aa8ff', '#741610': '#22468a' } },
  real: { rampas: { tabardo: { rampa: ['#c890f0', '#8a4ac8', '#5a2a8a', '#321452'], contorno: '#120622' }, aco2: { rampa: ['#fff6d8', '#e8c878', '#b08a3a', '#6a5018'], contorno: '#241a06' } }, cores: { '#741610': '#5a2a8a', '#ffb347': '#e080ff', '#ffd27a': '#f0b0ff', '#ff7a3a': '#c050ff', '#ff5a2a': '#a030f0' } },
  acida: { rampas: { cimento: { rampa: ['#e8ffc8', '#a8e070', '#5fa83a', '#2e5a1e'], contorno: '#0e200a' } }, cores: { '#e8eef4': '#f4ffd8' } },
  rainha: { rampas: { cimento: { rampa: ['#fffaf0', '#f0dcc8', '#c8a894', '#86685a'], contorno: '#2a1a12' } } },
  sombrio: { rampas: { escamaVerde: { rampa: ['#c8b0e8', '#7a5aa8', '#46306e', '#22163c'], contorno: '#0c0618' }, ventre: { rampa: ['#f0e8ff', '#c8b8e0', '#9a88b8', '#5e4e7a'] }, vermelho: { rampa: ['#9ff0d8', '#3ac8a0', '#1a8a6a', '#0a4a3a'] } }, cores: { '#ffe040': '#7fffd8', '#ffb020': '#3ac8a0', '#1e4a18': '#22163c', '#3e8a2e': '#46306e' } },
  alfa: { rampas: { escamaVerde: { rampa: ['#ffd8a0', '#e08a40', '#a0501e', '#5a280c'], contorno: '#200a02' }, vermelho: { rampa: ['#fff07a', '#f2c42a', '#b08410', '#604404'] } }, cores: { '#1e4a18': '#5a280c', '#3e8a2e': '#a0501e', '#ffe040': '#ff5a3c', '#ffb020': '#c42a14' } },
  escarlate: { rampas: { osso: { rampa: ['#ffe8d8', '#e8a888', '#b0644a', '#6a2e1e'], contorno: '#2a0a04' }, membrana: { rampa: ['#ff9a6a', '#d0502a', '#8a2a14', '#4a1006'], contorno: '#1e0402' }, ciano: { rampa: ['#fff6b0', '#ffc24a', '#f0702a', '#a02a10'], contorno: '#3a0a04' } }, cores: { '#bff8ff': '#ffe08a', '#7fe0ff': '#ff9a3c' } },
  ancestral: { rampas: { osso: { rampa: ['#6a6280', '#463e5a', '#2c2640', '#16121e'], contorno: '#06040a' }, membrana: { rampa: ['#f2c45a', '#c28a2a', '#7a5214', '#3a2408'], contorno: '#1a0e02' }, ciano: { rampa: ['#ffe8ff', '#e0a0ff', '#a050e0', '#5a2090'], contorno: '#1e0630' } }, cores: { '#bff8ff': '#f0c8ff', '#7fe0ff': '#c070ff', '#ffffff': '#fff1b0' } },
  // estágios do herói (o mesmo cavaleirinho, com equipamento melhor)
  'heroi-2': { rampas: { azul: { rampa: ['#9fd0ff', '#4a90e0', '#2a5ea8', '#18366a'] } }, cores: { '#c28a2a': '#f2c45a', '#bfe0ff': '#ffffff' } },
  'heroi-3': { rampas: { azul: { rampa: ['#a8e0ff', '#3a88e8', '#1e56b0', '#0e2e6a'] }, vermelho: { rampa: ['#ff8a6a', '#e04a2a', '#a02414', '#5a0e08'] }, aco: { rampa: ['#ffffff', '#cfdcf0', '#8a9cbc', '#4e5c7a'] } }, cores: { '#c28a2a': '#ffd76a', '#f4f8ff': '#ffffff', '#9fb0c8': '#bfe8ff' } },
  'heroi-4': { rampas: { azul: { rampa: ['#c0a8ff', '#7a5ae0', '#4a32a8', '#28186a'] }, vermelho: { rampa: ['#ffe08a', '#f2b030', '#b07414', '#5e3c06'] }, aco: { rampa: ['#ffffff', '#e0e6f6', '#a2aed0', '#5e6888'] } }, cores: { '#c28a2a': '#fff1b0', '#9fb0c8': '#d8c0ff' } },
  'heroi-5': { rampas: { azul: { rampa: ['#fff6c8', '#f2d06a', '#c8962a', '#7a5414'] }, vermelho: { rampa: ['#ffffff', '#f0e6ff', '#c0aef0', '#7a68b0'] }, aco: { rampa: ['#ffffff', '#fff6d8', '#e0c890', '#9a8050'] } }, cores: { '#c28a2a': '#ffffff', '#9fb0c8': '#fff6c0', '#f4f8ff': '#ffffff' } },
}

function tabelaDeTroca(nome?: string): Map<string, string> | undefined {
  const v = nome ? VARIANTES[nome] : undefined
  if (!v) return undefined
  const t = new Map<string, string>()
  for (const [k, nova] of Object.entries(v.rampas ?? {})) {
    const orig = MAT[k as keyof typeof MAT]
    if (!orig || !nova) continue
    orig.rampa.forEach((c, i) => t.set(c, nova.rampa[i] ?? c))
    if (nova.contorno) t.set(orig.contorno, nova.contorno)
  }
  for (const [a, b] of Object.entries(v.cores ?? {})) t.set(a, b)
  return t
}

function montar(quem: Personagem, pose: Pose, variante?: string) {
  const [w, h] = TAMANHO[quem]
  const g = new Grade(w, h)
  ;[g.ox, g.oy] = ORIGEM[quem]
  DESENHOS[quem](g, pose, variante)
  return g
}

/** Pinta uma pose do sprite, na resolução nativa, com a variante de paleta (se houver). */
export function pintarPersonagem(canvas: HTMLCanvasElement, quem: Personagem, pose: Pose = 'parado', variante?: string) {
  montar(quem, pose, variante).pintar(canvas, true, tabelaDeTroca(variante))
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

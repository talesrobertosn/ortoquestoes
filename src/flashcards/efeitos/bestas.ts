/**
 * Segunda leva de adversários (13/10/2026), cada um com desenho próprio no
 * motor de pixel art (pixel.ts) e 6 poses: parado, respira, preparo, golpe,
 * dano e vitória. Fantasia original; nada de anatomia humana realista (o
 * esqueleto e os ossos são de fantasia, estilizados, pedidos pelo Tales).
 */
import { Grade, MAT } from './pixel'

export type Besta =
  | 'corvo' | 'morcego' | 'aranha' | 'escaravelho' | 'goblin' | 'esqueleto' | 'cavaleiro'
  | 'espectro' | 'quimera' | 'mao' | 'leviata' | 'rei' | 'arconte' | 'ent' | 'harpia' | 'cogumelo'
type Pose = 'parado' | 'respira' | 'preparo' | 'golpe' | 'dano' | 'vitoria'
type P = [number, number]
type Desenho = (g: Grade, pose: Pose, variante?: string) => void

const unit = (x: number, y: number): P => { const n = Math.hypot(x, y) || 1; return [x / n, y / n] }
const soma = (a: P, u: P, k: number): P => [a[0] + u[0] * k, a[1] + u[1] * k]
function junta(a: P, b: P, l1: number, l2: number, lado: 1 | -1): P {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1
  if (d >= l1 + l2 - 0.01) return [a[0] + (dx * l1) / (l1 + l2), a[1] + (dy * l1) / (l1 + l2)]
  const t = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - t * t))
  return [a[0] + (dx * t) / d - (dy / d) * h * lado, a[1] + (dy * t) / d + (dx / d) * h * lado]
}
function placa(g: Grade, c: P, u: P, comp: number, larg: number, m: number, bisel = 2) {
  const v: P = [-u[1], u[0]]
  const p = (a: number, b: number): P => [c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b]
  g.poligono([p(-comp / 2, -larg / 2), p(comp / 2, -larg / 2), p(comp / 2, larg / 2), p(-comp / 2, larg / 2)], m, bisel)
}
/** Quanto cada pose "respira", avança e se encolhe (valores comuns a todos). */
const ANIMO: Record<Pose, { b: number; dx: number; abre: number; alto: number }> = {
  parado: { b: 0, dx: 0, abre: 0, alto: 0 }, respira: { b: 1, dx: 0, abre: 0.1, alto: 0 },
  preparo: { b: -2, dx: 3, abre: 0.6, alto: 1 }, golpe: { b: 2, dx: -8, abre: 1, alto: -1 },
  dano: { b: 1, dx: 4, abre: 0.5, alto: 0 }, vitoria: { b: -3, dx: 0, abre: 1, alto: 1 },
}
const olho = (g: Grade, x: number, y: number, cor: string, brilho = '#ffffff') => { g.ponto(x, y, cor); g.ponto(x + 1, y, cor); g.ponto(x, y - 1, brilho) }

/* ------------------------------------------------ Corvo de Kocher */
const corvo: Desenho = (g, pose) => {
  const A = ANIMO[pose], pena = g.material(MAT.pluma), bico = g.material(MAT.ouro), osso = g.material(MAT.osso)
  const asa = pose === 'golpe' ? 1 : pose === 'preparo' || pose === 'vitoria' ? -1 : pose === 'respira' ? 0.3 : 0
  const cx = 30 + A.dx * 0.6, cy = 30 + A.b
  // asas: de trás, depois o corpo, depois a da frente
  const asaDe = (lado: number, escuro: number) => {
    const ox = cx + lado * 4, oy = cy - 4
    const ponta: P = [ox + lado * 24, oy - 14 + asa * 18]
    g.poligono([[ox, oy], ponta, [ox + lado * 22, oy - 4 + asa * 14], [ox + lado * 18, oy + 2 + asa * 10], [ox + lado * 12, oy + 6 + asa * 6], [ox + lado * 4, oy + 8]], pena, 2, escuro)
    for (let k = 0; k < 4; k++) g.linha(ox + lado * (6 + k * 4), oy + 4 - k * 2 + asa * (k + 1) * 3, ox + lado * (12 + k * 4), oy - 4 - k * 2 + asa * (k + 2) * 3, '#8a9ac8')
  }
  asaDe(1, -0.25)
  g.elipse(cx, cy + 4, 11, 13, pena)
  g.elipse(cx - 2, cy + 8, 6, 8, pena, 1, 0.12)
  // cauda em leque
  g.poligono([[cx + 4, cy + 14], [cx + 16, cy + 24], [cx + 10, cy + 26], [cx + 2, cy + 18]], pena, 2, -0.1)
  // patas com garras
  for (const x of [cx - 4, cx + 3]) { g.linha(x, cy + 16, x, cy + 22, '#c28a2a'); g.linha(x - 2, cy + 22, x + 2, cy + 22, '#c28a2a') }
  // cabeça e bico de pinça (a pinça de Kocher), olho vermelho
  const hx = cx - 9 + (pose === 'golpe' ? -5 : 0), hy = cy - 10 + A.b * 0.5
  g.elipse(hx, hy, 7, 6.5, pena)
  const abre = A.abre * 3
  g.poligono([[hx - 5, hy - 1], [hx - 17, hy - 1 - abre], [hx - 6, hy + 1]], bico, 1)
  g.poligono([[hx - 5, hy + 1], [hx - 15, hy + 3 + abre], [hx - 6, hy + 3]], bico, 1, -0.2)
  for (let k = 0; k < 3; k++) g.ponto(hx - 8 - k * 3, hy - 1 - abre * 0.5, '#7a5214')
  olho(g, hx - 2, hy - 1, '#ff3a2a')
  g.elipse(hx + 2, hy - 5, 2.4, 1.4, osso, 1, 0.1)
  asaDe(-1, 0)
}

/* ------------------------------------------------ Morcego do Túnel do Carpo */
const morcego: Desenho = (g, pose) => {
  const A = ANIMO[pose], mem = g.material(MAT.membrana), pelo = g.material(MAT.couro)
  const bate = pose === 'respira' ? -6 : pose === 'golpe' ? 6 : pose === 'preparo' ? -10 : pose === 'vitoria' ? -12 : 0
  const cx = 34 + A.dx * 0.5, cy = 26 + A.b
  for (const lado of [-1, 1]) {
    const pts: P[] = [[cx + lado * 4, cy - 2]]
    for (let k = 1; k <= 4; k++) pts.push([cx + lado * (6 + k * 7), cy - 8 + bate * (k / 4) + (k % 2 ? -4 : 2)])
    pts.push([cx + lado * 32, cy + 6 + bate * 0.6])
    for (let k = 4; k >= 1; k--) pts.push([cx + lado * (6 + k * 6.4), cy + 10 + bate * (k / 6) - (k % 2 ? 0 : 4)])
    pts.push([cx + lado * 4, cy + 8])
    g.poligono(pts, mem, 2, lado > 0 ? -0.15 : 0)
    for (let k = 1; k <= 4; k++) g.linha(cx + lado * 4, cy - 2, cx + lado * (6 + k * 7), cy - 8 + bate * (k / 4) + (k % 2 ? -4 : 2), '#2c2448')
  }
  g.elipse(cx, cy + 4, 7, 9, pelo)
  g.elipse(cx, cy - 6, 6.5, 6, pelo)
  // orelhas pontudas, olhos amarelos e presas
  g.poligono([[cx - 6, cy - 9], [cx - 7, cy - 18], [cx - 2, cy - 11]], pelo, 1); g.poligono([[cx + 6, cy - 9], [cx + 7, cy - 18], [cx + 2, cy - 11]], pelo, 1)
  olho(g, cx - 4, cy - 6, '#ffe040'); olho(g, cx + 2, cy - 6, '#ffe040')
  g.ponto(cx - 1, cy - 2, '#ffffff'); g.ponto(cx + 1, cy - 2, '#ffffff')
  if (A.abre > 0.4) { g.linha(cx - 2, cy - 3, cx + 2, cy - 3, '#4f0e0a'); g.ponto(cx - 1, cy - 1, '#ffffff'); g.ponto(cx + 1, cy - 1, '#ffffff') }
  for (const x of [cx - 3, cx + 3]) g.linha(x, cy + 12, x, cy + 16, '#3a1f0e')
}

/* ------------------------------------------------ Aranha dos Ligamentos */
const aranha: Desenho = (g, pose) => {
  const A = ANIMO[pose], quit = g.material(MAT.roxo), olhos = '#ff4a6a', fio = '#e8e2f0'
  const cx = 44 + A.dx * 0.5, cy = 34 + A.b
  // fio de teia pendurado (ligamento) e pernas de trás
  g.linha(cx + 2, 0, cx + 2, cy - 14, fio)
  const perna = (k: number, lado: number, escuro: number) => {
    const base: P = [cx + lado * 6, cy + k * 2 - 2]
    const abre = [-10, -2, 8, 16][k]
    const pe: P = [cx + lado * (26 + k * 3) + abre + (pose === 'golpe' && k < 2 ? -lado * 8 : 0), 60 - (k === 0 || k === 3 ? 2 : 0) + (pose === 'preparo' && k === 0 ? -14 : 0)]
    const joelho: P = [base[0] + lado * (14 + k * 2) + abre * 0.5, cy - 14 + Math.abs(k - 1.5) * 3 + A.b]
    g.membro(base[0], base[1], joelho[0], joelho[1], 2.2, 1.8, quit, escuro)
    g.membro(joelho[0], joelho[1], pe[0], pe[1], 1.8, 0.8, quit, escuro)
    g.ponto(joelho[0], joelho[1] - 1, '#e2c8ff')
  }
  for (let k = 0; k < 4; k++) perna(k, 1, -0.3)
  g.elipse(cx + 8, cy + 6, 13, 11, quit)          // abdome
  for (let k = 0; k < 3; k++) { g.linha(cx + 1 + k * 4, cy + 2, cx + 3 + k * 4, cy + 12, '#3a1e70') }
  g.poligono([[cx + 6, cy + 2], [cx + 10, cy - 1], [cx + 14, cy + 2], [cx + 10, cy + 8]], g.material(MAT.vermelho), 1, 0.1) // marca de ampulheta
  g.elipse(cx - 6, cy, 8, 7, quit, 1, 0.1)         // cefalotórax
  for (const [x, y] of [[-10, -2], [-7, -3], [-4, -2], [-9, 1], [-5, 1]] as P[]) olho(g, cx + x, cy + y, olhos)
  // quelíceras
  const abre = A.abre * 2
  g.membro(cx - 11, cy + 3, cx - 15 - abre, cy + 9, 1.4, 0.7, g.material(MAT.osso)); g.membro(cx - 8, cy + 4, cx - 9 + abre, cy + 10, 1.4, 0.7, g.material(MAT.osso))
  for (let k = 0; k < 4; k++) perna(k, -1, 0)
}

/* ------------------------------------------------ Escaravelho da Cartilagem */
const escaravelho: Desenho = (g, pose) => {
  const A = ANIMO[pose], casco = g.material(MAT.verde), corpo = g.material(MAT.ferro), cart = g.material(MAT.ciano)
  const cx = 40 + A.dx * 0.6, cy = 34 + A.b, abre = pose === 'preparo' || pose === 'vitoria' ? 1 : 0
  for (let k = 0; k < 3; k++) for (const lado of [-1, 1]) {
    const bx = cx - 6 + k * 8, by = cy + 8
    g.membro(bx, by, bx + lado * 4 - 6, 54, 1.6, 1.2, corpo, lado > 0 ? -0.3 : 0)
  }
  // asas membranosas quando abre o casco
  if (abre) for (const lado of [-1, 1]) g.poligono([[cx, cy - 6], [cx + lado * 28, cy - 22], [cx + lado * 24, cy - 6]], g.material(MAT.membrana), 2, 0.2)
  g.elipse(cx + 2, cy + 2, 18, 12, corpo, 1, -0.2)
  // élitros (casco) brilhantes, abertos em "V" no preparo
  for (const lado of [-1, 1]) g.poligono([[cx + 2, cy - 10 - abre * 3], [cx + 2 + lado * (16 + abre * 6), cy - 4 - abre * 6], [cx + 2 + lado * 18, cy + 8], [cx + 2, cy + 12]], casco, 4)
  g.linha(cx + 2, cy - 10, cx + 2, cy + 12, '#145a26')
  for (const [x, y] of [[-8, -2], [10, 0], [-5, 6]] as P[]) g.elipse(cx + x, cy + y, 2.6, 2, cart, 1, 0.3)
  // cabeça com chifre de cartilagem
  const hx = cx - 16, hy = cy + 2
  g.elipse(hx, hy, 7, 6, corpo)
  g.membro(hx - 3, hy - 3, hx - 12 - (pose === 'golpe' ? 6 : 0), hy - 14 + (pose === 'golpe' ? 8 : 0), 3, 1, cart, 0.1)
  olho(g, hx - 3, hy, '#b0ff8a')
}

/* ------------------------------------------------ Goblin da Fratura */
const goblin: Desenho = (g, pose) => {
  const A = ANIMO[pose], pele = g.material(MAT.escamaVerde), roupa = g.material(MAT.couro), mad = g.material(MAT.madeira), ferro = g.material(MAT.ferro)
  const cx = 28 + A.dx * 0.4, b = A.b
  // martelo: erguido no preparo, batendo no golpe
  const mao: P = pose === 'preparo' || pose === 'vitoria' ? [cx + 8, 14 + b] : pose === 'golpe' ? [cx - 10, 34 + b] : [cx + 12, 34 + b]
  const dir = pose === 'preparo' ? unit(-0.4, -1) : pose === 'golpe' ? unit(-1, 0.6) : pose === 'vitoria' ? unit(0.1, -1) : unit(0.2, -1)
  const cab = soma(mao, dir, 16)
  g.membro(mao[0], mao[1], cab[0], cab[1], 1.4, 1.4, mad)
  placa(g, cab, dir, 7, 12, ferro, 2)
  for (const x of [cx - 4, cx + 3]) { g.retangulo(x - 2, 44 + Math.abs(b) * 0.3, 4, 8, pele, 1); g.retangulo(x - 3, 51, 6, 3, roupa, 1) }
  g.poligono([[cx - 8, 30 + b], [cx + 8, 30 + b], [cx + 9, 46], [cx - 9, 46]], roupa, 3)
  g.retangulo(cx - 9, 40 + b, 18, 2, ferro, 1)
  g.elipse(cx, 22 + b, 10, 9, pele)
  // orelhas longas, nariz, olhos e dentes tortos
  g.poligono([[cx - 9, 20 + b], [cx - 22, 14 + b], [cx - 10, 25 + b]], pele, 2); g.poligono([[cx + 9, 20 + b], [cx + 22, 14 + b], [cx + 10, 25 + b]], pele, 2)
  olho(g, cx - 5, 21 + b, '#ffe040'); olho(g, cx + 3, 21 + b, '#ffe040')
  g.elipse(cx, 25 + b, 2, 2.2, pele, 1, 0.2)
  g.linha(cx - 4, 28 + b, cx + 4, 28 + b, '#1e4a18'); g.ponto(cx - 2, 29 + b, '#ffffff'); g.ponto(cx + 2, 29 + b, '#ffffff')
  g.elipse(mao[0], mao[1], 2.6, 2.6, pele)
  // atadura de gesso na testa (a fratura)
  g.retangulo(cx - 7, 14 + b, 14, 3, g.material(MAT.gesso), 1)
}

/* ------------------------------------------------ Esqueleto do Metacarpo (fantasia) */
const esqueleto: Desenho = (g, pose, variante) => {
  const A = ANIMO[pose], osso = g.material(MAT.osso), ferro = g.material(MAT.ferro), olhos = variante === 'mago' ? '#c070ff' : '#7fe0ff'
  const cx = 32 + A.dx * 0.4, b = A.b
  // escudo redondo na esquerda e espada curta na direita
  g.elipse(cx - 13, 40 + b, 8, 9, g.material(MAT.madeira)); for (let a = 0; a < 6.3; a += 0.4) g.ponto(cx - 13 + Math.cos(a) * 7.4, 40 + b + Math.sin(a) * 8.4, '#9ea5b2')
  const mao: P = pose === 'golpe' ? [cx + 10, 38 + b] : pose === 'preparo' ? [cx + 8, 22 + b] : [cx + 12, 42 + b]
  const dir = pose === 'golpe' ? unit(-0.8, 0.5) : pose === 'preparo' ? unit(0.2, -1) : pose === 'vitoria' ? unit(0, -1) : unit(0.3, -1)
  const ponta = soma(mao, dir, 18)
  g.membro(mao[0], mao[1], ponta[0], ponta[1], 1.4, 0.6, ferro, 0.2)
  placa(g, soma(mao, dir, 1), dir, 1.4, 7, g.material(MAT.couro), 1)
  // pernas e bacia estilizadas
  for (const x of [cx - 5, cx + 5]) { g.membro(x, 52, x + (x < cx ? -1 : 1), 62, 1.6, 1.4, osso); g.membro(x + (x < cx ? -1 : 1), 62, x, 72, 1.4, 1.4, osso); g.retangulo(x - 3, 71, 6, 3, osso, 1) }
  g.poligono([[cx - 8, 48 + b * 0.5], [cx + 8, 48 + b * 0.5], [cx + 6, 54], [cx - 6, 54]], osso, 2)
  // coluna, costelas em arcos e ombros
  for (let y = 30; y <= 48; y += 3) g.elipse(cx, y + b, 1.8, 1.4, osso)
  for (let k = 0; k < 4; k++) { const y = 31 + k * 4 + b; g.membro(cx - 1, y, cx - 8 + k * 0.5, y + 2, 1, 1, osso); g.membro(cx + 1, y, cx + 8 - k * 0.5, y + 2, 1, 1, osso) }
  for (const lado of [-1, 1]) { const o: P = [cx + lado * 9, 29 + b]; g.elipse(o[0], o[1], 3, 2.4, osso); const m: P = lado < 0 ? [cx - 12, 38 + b] : mao; const c = junta(o, m, 7, 7, lado as 1 | -1); g.membro(o[0], o[1], c[0], c[1], 1.4, 1.2, osso); g.membro(c[0], c[1], m[0], m[1], 1.2, 1.2, osso) }
  // crânio estilizado (redondo, de desenho animado) com elmo amassado
  g.elipse(cx, 20 + b, 8.5, 8, osso)
  g.retangulo(cx - 5, 25 + b, 10, 4, osso, 1)
  for (const x of [cx - 4, cx + 2]) { g.elipse(x + 1, 20 + b, 2.4, 2.4, g.material(MAT.ferro), 1, -0.7); g.ponto(x + 1, 20 + b, olhos) }
  for (let x = cx - 4; x <= cx + 4; x += 2) g.linha(x, 26 + b, x, 28 + b, '#7a6a50')
  g.poligono([[cx - 9, 17 + b], [cx - 6, 10 + b], [cx + 6, 10 + b], [cx + 9, 17 + b]], ferro, 2, -0.1)
  if (variante === 'mago') { g.poligono([[cx - 9, 13 + b], [cx + 9, 13 + b], [cx + 2, -4 + b], [cx - 1, 0 + b]], g.material(MAT.roxo), 2) }
}

/* ------------------------------------------------ Cavaleiros (Tala, Fíbula, Artrodese) */
/** Um corpo de cavaleiro, três armas e armaduras: maça e talas, lança longa, escudo-torre. */
const cavaleiro: Desenho = (g, pose, variante) => {
  const A = ANIMO[pose], tipo = variante === 'fibula' ? 'lanca' : variante === 'artrodese' ? 'torre' : 'maca'
  const aco = g.material(tipo === 'torre' ? MAT.pedra : MAT.aco2), escuro = g.material(MAT.ferro), tab = g.material(tipo === 'lanca' ? MAT.verde : tipo === 'torre' ? MAT.roxo : MAT.tabardo), ouro = g.material(MAT.ouro), gesso = g.material(MAT.gesso)
  const cx = 38 + A.dx * 0.4, b = A.b
  // capa
  g.poligono([[cx - 10, 32 + b], [cx + 10, 32 + b], [cx + 14, 80], [cx - 16, 80]], tab, 3, -0.15)
  // pernas
  for (const x of [cx - 6, cx + 6]) { g.membro(x, 58, x, 72, 4, 3.6, escuro); g.membro(x, 70, x, 80, 3.6, 3.6, aco); g.retangulo(x - 5, 79, 9, 4, aco, 1) }
  // tronco
  g.poligono([[cx - 11, 32 + b], [cx + 11, 32 + b], [cx + 9, 60], [cx - 9, 60]], aco, 4)
  g.poligono([[cx - 6, 42 + b], [cx + 6, 42 + b], [cx + 5, 64], [cx, 68], [cx - 5, 64]], tab, 2)
  if (tipo === 'maca') for (const y of [36, 46, 54]) g.retangulo(cx - 12, y + b, 24, 3, gesso, 1) // talas de gesso
  g.retangulo(cx - 10, 56 + b * 0.5, 20, 3, ouro, 1)
  // ombreiras
  for (const lado of [-1, 1]) { g.elipse(cx + lado * 12, 33 + b, 7, 5, aco); for (let a = 3.3; a < 6.2; a += 0.2) g.ponto(cx + lado * 12 + Math.cos(a) * 6.6, 33 + b + Math.sin(a) * 4.6, '#f2c45a') }
  // arma
  const mao: P = pose === 'golpe' ? [cx - 14, 46 + b] : pose === 'preparo' ? [cx + 12, 22 + b] : pose === 'vitoria' ? [cx + 12, 18 + b] : [cx + 16, 48 + b]
  if (tipo === 'lanca') {
    const dir = pose === 'golpe' ? unit(-1, 0.1) : pose === 'preparo' ? unit(0.6, -0.8) : unit(0.05, -1)
    const ponta = soma(mao, dir, 46), cabo = soma(mao, dir, -14)
    g.membro(cabo[0], cabo[1], ponta[0], ponta[1], 1.2, 1.2, g.material(MAT.madeira))
    const v: P = [-dir[1], dir[0]]
    g.poligono([soma(ponta, v, -3), soma(soma(ponta, dir, 9), v, 0), soma(ponta, v, 3)], aco, 1, 0.2)
    g.ponto(...(soma(ponta, dir, 3) as [number, number]), '#ffffff')
  } else if (tipo === 'maca') {
    const dir = pose === 'golpe' ? unit(-0.9, 0.5) : pose === 'preparo' ? unit(-0.3, -1) : unit(0.2, -1)
    const cab = soma(mao, dir, 18)
    g.membro(mao[0], mao[1], cab[0], cab[1], 1.4, 1.4, g.material(MAT.madeira))
    g.elipse(cab[0], cab[1], 6, 6, escuro)
    for (let a = 0; a < 6.3; a += 0.8) g.poligono([[cab[0] + Math.cos(a) * 5, cab[1] + Math.sin(a) * 5], [cab[0] + Math.cos(a) * 9, cab[1] + Math.sin(a) * 9], [cab[0] + Math.cos(a + 0.3) * 5, cab[1] + Math.sin(a + 0.3) * 5]], aco, 1)
  }
  g.elipse(mao[0], mao[1], 3.4, 3.4, escuro)
  // escudo: torre de pedra (artrodese) ou pipa
  if (tipo === 'torre') {
    g.poligono([[cx - 30, 30 + b], [cx - 12, 30 + b], [cx - 12, 70], [cx - 30, 70]], aco, 3)
    g.retangulo(cx - 30, 30 + b, 18, 3, ouro, 1); g.retangulo(cx - 23, 40 + b, 4, 22, ouro, 1); g.retangulo(cx - 28, 48 + b, 14, 4, ouro, 1)
  } else {
    g.poligono([[cx - 26, 36 + b], [cx - 12, 36 + b], [cx - 12, 52 + b], [cx - 19, 62 + b], [cx - 26, 52 + b]], tab, 2)
    g.linha(cx - 19, 38 + b, cx - 19, 58 + b, '#f2c45a')
  }
  // elmo fechado com viseira em fenda e pluma
  const hy = 22 + b
  g.poligono([[cx - 8, hy - 6], [cx - 5, hy - 11], [cx + 5, hy - 11], [cx + 8, hy - 6], [cx + 8, hy + 8], [cx - 8, hy + 8]], aco, 3)
  g.linha(cx - 6, hy, cx + 6, hy, '#12141e'); g.linha(cx - 4, hy, cx + 4, hy, tipo === 'lanca' ? '#7fe08f' : tipo === 'torre' ? '#c070ff' : '#ffb347')
  g.membro(cx, hy - 11, cx - 10, hy - 18 + b, 2.4, 1, tab)
}

/* ------------------------------------------------ Espectros e conjuradores */
/** Manto flutuante: espectro do nervo (raios), necromante (cajado e crânio de fantasia), arquiteto (compasso). */
const espectro: Desenho = (g, pose, variante) => {
  const A = ANIMO[pose], tipo = variante ?? 'nervo'
  const manto = g.material(tipo === 'necromante' ? MAT.roxo : tipo === 'arquiteto' ? MAT.azul : MAT.ciano), escuro = g.material(MAT.ferro), ouro = g.material(MAT.ouro)
  const cx = 40 + A.dx * 0.4, flut = pose === 'respira' ? -2 : 0, b = A.b + flut
  const brilho = tipo === 'necromante' ? '#9fff7a' : tipo === 'arquiteto' ? '#ffd76a' : '#e8ffff'
  // manto em chamas na base (sem pernas: flutua)
  g.poligono([[cx - 14, 30 + b], [cx + 14, 30 + b], [cx + 20, 76 + b], [cx + 12, 88 + b], [cx + 6, 80 + b], [cx, 92 + b], [cx - 6, 80 + b], [cx - 12, 88 + b], [cx - 20, 76 + b]], manto, 4, tipo === 'nervo' ? 0.15 : 0)
  for (let k = -2; k <= 2; k++) g.linha(cx + k * 5, 40 + b, cx + k * 7, 84 + b, tipo === 'nervo' ? '#3aa0d0' : '#2c2448')
  // braços e mãos de energia
  const maoD: P = pose === 'golpe' ? [cx - 22, 46 + b] : pose === 'preparo' || pose === 'vitoria' ? [cx + 18, 20 + b] : [cx + 20, 50 + b]
  const maoE: P = [cx - 18, 52 + b]
  for (const m of [maoE, maoD]) { g.membro(cx + (m[0] > cx ? 10 : -10), 36 + b, m[0], m[1], 4, 2.6, manto); g.elipse(m[0], m[1], 2.6, 2.6, escuro, 1, 0.3); g.ponto(m[0], m[1], brilho) }
  // cajado, compasso ou raio na mão
  if (tipo === 'necromante') {
    g.membro(maoD[0], maoD[1] - 22, maoD[0], maoD[1] + 30, 1.3, 1.3, g.material(MAT.madeira))
    g.elipse(maoD[0], maoD[1] - 26, 5, 5, g.material(MAT.osso)); olho(g, maoD[0] - 2, maoD[1] - 26, '#9fff7a'); olho(g, maoD[0] + 1, maoD[1] - 26, '#9fff7a')
  } else if (tipo === 'arquiteto') {
    g.membro(maoD[0], maoD[1], maoD[0] - 6, maoD[1] + 18, 1, 1, ouro); g.membro(maoD[0], maoD[1], maoD[0] + 6, maoD[1] + 18, 1, 1, ouro); g.elipse(maoD[0], maoD[1], 2, 2, ouro)
    g.retangulo(maoE[0] - 8, maoE[1] - 4, 12, 9, g.material(MAT.papel), 1); for (const y of [0, 3]) g.linha(maoE[0] - 6, maoE[1] - 2 + y, maoE[0] + 2, maoE[1] - 2 + y, '#3a5aa0')
  } else {
    for (let k = 0; k < 5; k++) g.linha(maoD[0] + (k % 2 ? 3 : -2), maoD[1] - 4 - k * 4, maoD[0] + (k % 2 ? -2 : 3), maoD[1] - 8 - k * 4, '#ffffff')
  }
  // capuz com rosto oculto e olhos brilhantes
  const hy = 22 + b
  g.poligono([[cx - 12, hy + 10], [cx - 11, hy - 4], [cx - 4, hy - 14], [cx + 4, hy - 14], [cx + 11, hy - 4], [cx + 12, hy + 10]], manto, 3)
  g.elipse(cx, hy + 2, 7, 7, escuro, 1, -0.6)
  olho(g, cx - 4, hy + 2, brilho, '#ffffff'); olho(g, cx + 2, hy + 2, brilho, '#ffffff')
  if (tipo === 'necromante') g.poligono([[cx - 7, hy - 10], [cx - 5, hy - 18], [cx - 2, hy - 12], [cx, hy - 20], [cx + 2, hy - 12], [cx + 5, hy - 18], [cx + 7, hy - 10]], ouro, 1)
}

/* ------------------------------------------------ Quimeras e basilisco (quadrúpedes) */
/** Leão de juba (quimera), com asas no chefe (escafoide); lagarto de crista (basilisco). */
const quimera: Desenho = (g, pose, variante) => {
  const A = ANIMO[pose], tipo = variante ?? 'quimera'
  const lagarto = tipo === 'basilisco'
  const pele = g.material(lagarto ? MAT.escamaVerde : MAT.couro), juba = g.material(lagarto ? MAT.vermelho : MAT.chama), osso = g.material(MAT.osso)
  const b = A.b, dx = A.dx * 0.6
  const corpoX = 62 + dx, corpoY = 52 + b
  // asas (quimera do escafoide)
  if (tipo === 'escafoide') for (const lado of [-1, 1]) g.poligono([[corpoX + lado * 4, corpoY - 10], [corpoX + lado * 30 + 10, corpoY - 44 - A.alto * 6], [corpoX + lado * 26 + 14, corpoY - 18], [corpoX + lado * 12, corpoY - 4]], g.material(MAT.membrana), 3, lado > 0 ? -0.2 : 0)
  // cauda: serpente (quimera) ou cauda grossa (basilisco)
  const cauda: P[] = [[corpoX + 22, corpoY - 2], [corpoX + 34, corpoY - 10], [corpoX + 44, corpoY - 22 + b], [corpoX + 50, corpoY - 34]]
  for (let i = 0; i < cauda.length - 1; i++) g.membro(cauda[i][0], cauda[i][1], cauda[i + 1][0], cauda[i + 1][1], 4.5 - i * 1.2, 3.6 - i * 1.1, lagarto ? pele : g.material(MAT.escama))
  if (!lagarto) { const [hx, hy] = cauda[3]; g.elipse(hx, hy, 4, 3, g.material(MAT.escama)); olho(g, hx - 1, hy - 1, '#ff3a2a'); g.linha(hx - 4, hy + 1, hx - 7, hy + 2, '#d0281c') }
  // pernas
  for (const [x, esc, tras] of [[corpoX + 18, -0.25, 1], [corpoX - 18, -0.25, 0], [corpoX + 13, 0, 1], [corpoX - 22, 0, 0]] as Array<[number, number, number]>) {
    const pe: P = [x - 3 - (pose === 'golpe' && !tras ? 8 : 0), 92]
    const quadril: P = [x, corpoY + 8]
    const joelho = junta(quadril, pe, 16, 16, tras ? -1 : 1)
    g.membro(quadril[0], quadril[1], joelho[0], joelho[1], 7, 5, pele, esc); g.membro(joelho[0], joelho[1], pe[0], pe[1], 5, 4, pele, esc)
    g.elipse(pe[0] - 2, pe[1], 5.5, 3, pele, 1, esc)
    for (const k of [-3, 0, 3]) g.ponto(pe[0] - 6 + k, pe[1] + 2, '#ffffff')
  }
  g.elipse(corpoX, corpoY, 30, 17, pele)
  g.elipse(corpoX - 4, corpoY + 6, 20, 8, pele, 0.6, 0.12)
  if (lagarto) for (let x = -20; x <= 20; x += 5) g.poligono([[corpoX + x - 2, corpoY - 13], [corpoX + x, corpoY - 20], [corpoX + x + 2, corpoY - 13]], juba, 1)
  else g.poligono([[corpoX - 6, corpoY - 14], [corpoX + 4, corpoY - 18], [corpoX + 2, corpoY - 10]], g.material(MAT.couro), 2, 0.2)
  // cabeça (leão de juba ou lagarto) e segunda cabeça de bode na quimera
  const hx = corpoX - 30 + dx * 0.3 + (pose === 'golpe' ? -6 : 0), hy = corpoY - 14 + (pose === 'golpe' ? 6 : 0)
  if (!lagarto) {
    const pts: P[] = []
    for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2, r = k % 2 ? 13 : 18; pts.push([hx + 5 + Math.cos(a) * r, hy + 1 + Math.sin(a) * r * 0.95]) }
    g.poligono(pts, juba, 4)
    g.elipse(corpoX - 4, corpoY - 18, 6, 6, g.material(MAT.gesso)); g.membro(corpoX - 6, corpoY - 22, corpoX - 12, corpoY - 32, 1.6, 0.6, osso); g.membro(corpoX - 2, corpoY - 22, corpoX + 2, corpoY - 32, 1.6, 0.6, osso)
  }
  const rosto = lagarto ? pele : g.material(MAT.escama)
  g.elipse(hx, hy + 2, lagarto ? 11 : 9, lagarto ? 7 : 8, rosto)
  if (!lagarto) { g.elipse(hx - 9, hy + 5, 3, 2.4, g.material(MAT.couro)); g.ponto(hx - 11, hy + 4, '#3a1f0e') }
  g.poligono([[hx - 8, hy + 2], [hx - (lagarto ? 20 : 15), hy + 4], [hx - 8, hy + 8]], rosto, 2)
  const boca = A.abre * 4
  g.poligono([[hx - 8, hy + 6], [hx - (lagarto ? 19 : 14), hy + 6 + boca], [hx - 6, hy + 10]], g.material(MAT.vermelho), 1, -0.4)
  for (let k = 0; k < 4; k++) g.ponto(hx - 9 - k * 2.5, hy + 6, '#ffffff')
  olho(g, hx - 3, hy - 1, lagarto ? '#ffe040' : '#ff9a2a')
  if (lagarto) { g.elipse(hx - 3, hy - 1, 3, 3, g.material(MAT.ouro), 1, 0.4); g.ponto(hx - 3, hy - 1, '#120a04'); g.poligono([[hx + 2, hy - 6], [hx + 8, hy - 16], [hx + 10, hy - 4]], juba, 2) }
}

/* ------------------------------------------------ Mão dos Tendões (manopla viva) */
const mao: Desenho = (g, pose) => {
  const A = ANIMO[pose], aco = g.material(MAT.aco2), cabo = g.material(MAT.vermelho), ouro = g.material(MAT.ouro)
  const cx = 46 + A.dx * 0.5, b = A.b, fecha = pose === 'golpe' ? 1 : pose === 'preparo' ? 0.4 : 0
  // cabos de tendão saindo do punho até o chão
  for (let k = 0; k < 5; k++) { const x = cx - 10 + k * 5; for (let y = 64 + b; y < 86; y += 2) g.ponto(x + Math.sin(y / 4 + k) * 2, y, k % 2 ? '#c43a24' : '#f07a5a') }
  // punho (manopla) e dorso com placas
  g.retangulo(cx - 13, 54 + b, 26, 12, aco, 3)
  g.poligono([[cx - 16, 30 + b], [cx + 16, 30 + b], [cx + 14, 56 + b], [cx - 14, 56 + b]], aco, 5)
  for (const y of [36, 44]) g.linha(cx - 14, y + b, cx + 14, y + b, '#323a52')
  g.elipse(cx, 42 + b, 4, 4, g.material(MAT.ciano), 1, 0.3)
  // dedos articulados (curvam no golpe), polegar e unhas de ouro
  for (let k = 0; k < 4; k++) {
    const x = cx - 12 + k * 8, base: P = [x, 30 + b]
    const meio: P = [x - fecha * 2, 18 + b + fecha * 8], ponta: P = [x - fecha * 6, 8 + b + fecha * 20]
    g.membro(base[0], base[1], meio[0], meio[1], 3.4, 3, aco); g.membro(meio[0], meio[1], ponta[0], ponta[1], 3, 2.4, aco)
    g.elipse(meio[0], meio[1], 3, 2.6, g.material(MAT.ferro)); g.poligono([[ponta[0] - 2, ponta[1]], [ponta[0], ponta[1] - 5 + fecha * 6], [ponta[0] + 2, ponta[1]]], ouro, 1)
    for (let y = base[1]; y > ponta[1]; y -= 3) g.ponto(x - fecha * (30 + b - y) * 0.2, y, '#f07a5a')
  }
  g.membro(cx + 16, 44 + b, cx + 26 - fecha * 8, 34 + b + fecha * 6, 3.6, 3, aco)
  void cabo
}

/* ------------------------------------------------ Leviatã dos Tendões (chefe) */
const leviata: Desenho = (g, pose) => {
  const A = ANIMO[pose], esc = g.material(MAT.ciano), ventre = g.material(MAT.ventre), barb = g.material(MAT.membrana)
  const b = A.b
  // água em ondas na base
  for (let x = 0; x < 136; x++) { const y = 104 + Math.round(Math.sin(x / 7) * 2); for (let k = 0; k < 10; k++) g.ponto(x, y + k, k === 0 ? '#bff8ff' : k < 3 ? '#4fc8e8' : '#1a5a80') }
  // anéis do corpo saindo e entrando da água
  for (const [x0, r] of [[110, 13], [86, 15]] as Array<[number, number]>) { for (let a = Math.PI; a <= Math.PI * 2; a += 0.08) g.elipse(x0 + Math.cos(a) * r, 104 + Math.sin(a) * r * 1.3 + b * 0.3, 6, 6, esc, 1, -0.1); g.poligono([[x0 - 3, 104 - r * 1.3 - 4], [x0, 104 - r * 1.3 - 12], [x0 + 3, 104 - r * 1.3 - 4]], barb, 1) }
  // pescoço longo até a cabeça
  const hx = 34 + A.dx, hy = 30 + b + (pose === 'golpe' ? 18 : pose === 'preparo' ? -6 : 0)
  for (let i = 0; i <= 14; i++) { const t = i / 14; const x = 64 + (hx + 10 - 64) * t + Math.sin(t * 3) * 6, y = 104 + (hy + 8 - 104) * t; g.elipse(x, y, 9 - t * 2, 8 - t * 2, esc); g.elipse(x - 3, y + 2, 5 - t, 4, ventre, 0.6) }
  for (let i = 1; i < 10; i++) { const t = i / 10; const x = 64 + (hx + 10 - 64) * t, y = 104 + (hy + 8 - 104) * t; g.poligono([[x + 4, y - 7], [x + 10, y - 12], [x + 8, y - 4]], barb, 1) }
  // cabeça com barbatanas, fios de tendão como bigodes
  g.elipse(hx, hy, 14, 10, esc)
  g.poligono([[hx - 10, hy + 2], [hx - 28, hy + 4], [hx - 10, hy + 9]], esc, 2)
  const boca = A.abre * 6
  g.poligono([[hx - 10, hy + 7], [hx - 26, hy + 8 + boca], [hx - 8, hy + 12]], g.material(MAT.vermelho), 1, -0.4)
  for (let k = 0; k < 6; k++) g.ponto(hx - 12 - k * 2.4, hy + 7, '#ffffff')
  for (const lado of [-1, 1]) g.poligono([[hx + 4, hy - 6], [hx + 16, hy - 20 - lado * 4], [hx + 14, hy - 4]], barb, 2)
  for (const k of [0, 1]) for (let i = 0; i < 12; i++) g.ponto(hx - 20 + i * -1, hy + 10 + k * 3 + Math.sin(i / 2) * 2 + i * 0.6, '#f07a5a')
  olho(g, hx - 4, hy - 2, '#fff07a'); g.ponto(hx - 4, hy - 1, '#ff9a2a')
}

/* ------------------------------------------------ Imperador do Carpo e Rei da Consolidação */
const rei: Desenho = (g, pose, variante) => {
  const A = ANIMO[pose], consolidacao = variante === 'consolidacao'
  const manto = g.material(consolidacao ? MAT.verde : MAT.roxo), ouro = g.material(MAT.ouro), aco = g.material(MAT.aco2), pele = g.material(consolidacao ? MAT.gesso : MAT.pedra), arminho = g.material(MAT.barba)
  const cx = 52 + A.dx * 0.4, b = A.b
  // manto real com arminho
  g.poligono([[cx - 20, 34 + b], [cx + 20, 34 + b], [cx + 34, 104], [cx - 36, 104]], manto, 5)
  g.poligono([[cx - 36, 98], [cx + 34, 98], [cx + 34, 104], [cx - 36, 104]], arminho, 1)
  for (let x = cx - 34; x < cx + 34; x += 6) g.ponto(x, 101, '#22222e')
  // corpo com couraça dourada
  g.poligono([[cx - 15, 36 + b], [cx + 15, 36 + b], [cx + 13, 74], [cx - 13, 74]], aco, 5)
  g.poligono([[cx - 10, 40 + b], [cx + 10, 40 + b], [cx + 8, 62], [cx, 68], [cx - 8, 62]], ouro, 3)
  // brasão: oito ossinhos do carpo em fileiras (estilizados como gemas)
  for (let k = 0; k < 8; k++) g.elipse(cx - 6 + (k % 4) * 4, 48 + b + Math.floor(k / 4) * 5, 1.6, 1.8, g.material(consolidacao ? MAT.verde : MAT.ciano), 1, 0.3)
  g.retangulo(cx - 16, 70, 32, 4, ouro, 1)
  // cetro e mão livre
  const maoD: P = pose === 'golpe' ? [cx - 24, 56 + b] : pose === 'preparo' || pose === 'vitoria' ? [cx + 22, 22 + b] : [cx + 24, 56 + b]
  const dir = pose === 'golpe' ? unit(-0.6, 0.8) : unit(0.05, -1)
  const topo = soma(maoD, dir, 30), base = soma(maoD, dir, -16)
  g.membro(base[0], base[1], topo[0], topo[1], 1.8, 1.8, ouro)
  g.elipse(topo[0], topo[1], 5, 5, g.material(consolidacao ? MAT.verde : MAT.roxo), 1, 0.4); g.ponto(topo[0] - 1, topo[1] - 2, '#ffffff')
  for (const m of [maoD, [cx - 22, 58 + b] as P]) { g.membro(cx + (m[0] > cx ? 14 : -14), 40 + b, m[0], m[1], 5, 4, manto); g.elipse(m[0], m[1], 4, 4, pele) }
  // ombreiras
  for (const lado of [-1, 1]) g.elipse(cx + lado * 16, 38 + b, 9, 6, ouro)
  // cabeça de estátua, barba de pedra e coroa alta
  const hy = 24 + b
  g.elipse(cx, hy, 10, 11, pele)
  g.poligono([[cx - 9, hy + 2], [cx + 9, hy + 2], [cx + 6, hy + 16], [cx, hy + 20], [cx - 6, hy + 16]], pele, 3, -0.1)
  olho(g, cx - 5, hy, consolidacao ? '#9fff7a' : '#e080ff'); olho(g, cx + 3, hy, consolidacao ? '#9fff7a' : '#e080ff')
  g.poligono([[cx - 11, hy - 8], [cx - 12, hy - 22], [cx - 6, hy - 14], [cx, hy - 26], [cx + 6, hy - 14], [cx + 12, hy - 22], [cx + 11, hy - 8]], ouro, 2)
  for (const x of [-6, 0, 6]) g.ponto(cx + x, hy - 12, x ? '#7fe0ff' : '#ff5a7a')
}

/* ------------------------------------------------ Arconte da Biomecânica (chefe) */
const arconte: Desenho = (g, pose) => {
  const A = ANIMO[pose], aco = g.material(MAT.ferro), ouro = g.material(MAT.ouro), nucleo = g.material(MAT.chama), cabo = g.material(MAT.couro)
  const cx = 56 + A.dx * 0.4, b = A.b
  // engrenagem gigante nas costas
  const eng = (x: number, y: number, r: number, m: number) => { g.elipse(x, y, r, r, m); for (let a = 0; a < 6.28; a += 0.5) placa(g, [x + Math.cos(a) * r, y + Math.sin(a) * r], [Math.cos(a), Math.sin(a)], 4, 4, m, 1); g.elipse(x, y, r * 0.4, r * 0.4, aco, 1, -0.3) }
  eng(cx + 22, 36 + b, 16, ouro)
  // pernas de pistão
  for (const lado of [-1, 1]) { const q: P = [cx + lado * 12, 70], pe: P = [cx + lado * 20, 108]; const j = junta(q, pe, 20, 20, lado as 1 | -1); g.membro(q[0], q[1], j[0], j[1], 5, 4, aco); g.membro(j[0], j[1], pe[0], pe[1], 3, 3, g.material(MAT.aco2)); g.elipse(j[0], j[1], 4, 4, ouro); g.retangulo(pe[0] - 8, pe[1] - 2, 16, 6, aco, 2) }
  // tronco com núcleo incandescente e tubos
  g.poligono([[cx - 20, 40 + b], [cx + 20, 40 + b], [cx + 16, 74], [cx - 16, 74]], aco, 5)
  g.elipse(cx, 56 + b, 8, 8, nucleo, 1, 0.3 + A.abre * 0.3); g.ponto(cx - 2, 54 + b, '#ffffff')
  for (const k of [-1, 1]) { for (let y = 44; y < 72; y += 2) g.ponto(cx + k * 14 + Math.sin(y / 3) * 1.5, y + b, '#c08a54') }
  // braços: pinça e martelo-pistão
  const garra: P = pose === 'golpe' ? [cx - 34, 62 + b] : [cx - 30, 54 + b]
  g.membro(cx - 18, 44 + b, garra[0], garra[1], 4, 3.4, aco)
  g.poligono([[garra[0], garra[1] - 4], [garra[0] - 12, garra[1] - 8 - A.abre * 4], [garra[0] - 4, garra[1]]], ouro, 1); g.poligono([[garra[0], garra[1] + 4], [garra[0] - 12, garra[1] + 8 + A.abre * 4], [garra[0] - 4, garra[1]]], ouro, 1)
  const mart: P = pose === 'preparo' || pose === 'vitoria' ? [cx + 30, 18 + b] : [cx + 32, 62 + b]
  g.membro(cx + 18, 44 + b, mart[0], mart[1], 4, 3.4, aco)
  g.retangulo(mart[0] - 7, mart[1] - 5, 14, 12, g.material(MAT.aco2), 2)
  // cabeça: elmo com lente única
  const hy = 28 + b
  g.poligono([[cx - 10, hy + 8], [cx - 10, hy - 6], [cx - 4, hy - 12], [cx + 4, hy - 12], [cx + 10, hy - 6], [cx + 10, hy + 8]], aco, 3)
  g.elipse(cx, hy - 1, 5, 5, g.material(MAT.ciano), 1, 0.3 + A.abre * 0.4); g.ponto(cx - 1, hy - 2, '#ffffff')
  g.membro(cx, hy - 12, cx + 6, hy - 22, 1, 1, cabo); g.elipse(cx + 6, hy - 23, 2, 2, nucleo, 1, 0.4)
}

/* ------------------------------------------------ Guardião da Fise (árvore) */
const ent: Desenho = (g, pose) => {
  const A = ANIMO[pose], casca = g.material(MAT.madeira), folha = g.material(MAT.musgo), luz = g.material(MAT.verde)
  const cx = 56 + A.dx * 0.3, b = A.b
  // raízes
  for (const k of [-3, -1, 1, 3]) g.membro(cx + k * 5, 98, cx + k * 12, 112, 4, 1.6, casca, -0.1)
  // tronco com anéis de crescimento luminosos (a placa de crescimento)
  g.poligono([[cx - 16, 40 + b], [cx + 16, 40 + b], [cx + 20, 104], [cx - 20, 104]], casca, 5)
  for (const y of [58, 74, 90]) { for (let x = -15; x <= 15; x++) g.ponto(cx + x, y + Math.round(Math.sin(x / 3)) + (y < 70 ? b : 0), x % 2 ? '#b8ffb0' : '#5fdc7a') }
  for (let k = 0; k < 5; k++) g.linha(cx - 12 + k * 6, 44 + b, cx - 13 + k * 6.5, 100, '#3c210e')
  // rosto na casca
  const hy = 50 + b
  for (const x of [cx - 7, cx + 5]) { g.elipse(x + 1, hy, 3, 2.4, g.material(MAT.ferro), 1, -0.6); g.ponto(x + 1, hy, '#b8ffb0') }
  g.linha(cx - 5, hy + 8, cx + 5, hy + 8 + A.abre * 2, '#1e1006')
  // braços-galho
  for (const lado of [-1, 1]) {
    const ponta: P = pose === 'golpe' && lado < 0 ? [cx - 40, 70 + b] : pose === 'preparo' || pose === 'vitoria' ? [cx + lado * 30, 10 + b] : [cx + lado * 38, 52 + b]
    g.membro(cx + lado * 14, 46 + b, ponta[0], ponta[1], 5, 2, casca)
    for (const t of [0.5, 0.8]) { const x = cx + lado * 14 + (ponta[0] - cx - lado * 14) * t, y = 46 + b + (ponta[1] - 46 - b) * t; g.membro(x, y, x + lado * 6, y - 8, 1.6, 0.8, casca) }
    g.elipse(ponta[0], ponta[1], 7, 6, folha)
  }
  // copa com flores que brilham
  g.elipse(cx, 26 + b, 30, 20, folha)
  g.elipse(cx - 14, 32 + b, 14, 10, folha, 1, -0.1); g.elipse(cx + 16, 30 + b, 14, 11, folha, 1, -0.1)
  for (const [x, y] of [[-18, 20], [4, 12], [18, 24], [-6, 30], [12, 36]] as P[]) { g.elipse(cx + x, y + b, 2.4, 2.4, luz, 1, 0.4); g.ponto(cx + x, y + b, '#ffffff') }
}

/* ------------------------------------------------ Cogumelo da Necrose (desenho de reserva; a arte é a folha assada de scripts/sprites/cogumelo.py) */
const cogumelo: Desenho = (g, pose) => {
  const A = ANIMO[pose], chapeu = g.material(MAT.vermelho), caule = g.material(MAT.ventre), pinta = g.material(MAT.gesso)
  const cx = 30 + A.dx * 0.5, b = A.b
  for (const x of [cx - 5, cx + 5]) g.elipse(x, 52, 3.5, 2, caule)
  g.elipse(cx, 40 + b * 0.5, 10, 11, caule)
  olho(g, cx - 5, 38 + b * 0.5, '#ff4a2a'); olho(g, cx + 3, 38 + b * 0.5, '#ff4a2a')
  g.elipse(cx, 22 + b, 19, 11, chapeu)
  for (const [x, y] of [[-10, 20], [0, 15], [9, 19], [-3, 24]] as P[]) g.elipse(cx + x, y + b, 2.6, 2, pinta)
}

/* ------------------------------------------------ Harpia do Manguito */
const harpia: Desenho = (g, pose) => {
  const A = ANIMO[pose], pena = g.material(MAT.tabardo), pele = g.material(MAT.pele), garra = g.material(MAT.ouro), cabelo = g.material(MAT.roxo)
  const cx = 46 + A.dx * 0.4, b = A.b, bate = pose === 'golpe' ? 14 : pose === 'preparo' || pose === 'vitoria' ? -12 : pose === 'respira' ? -4 : 0
  for (const lado of [-1, 1]) {
    const o: P = [cx + lado * 8, 36 + b]
    const pts: P[] = [o, [o[0] + lado * 18, o[1] - 24 + bate], [o[0] + lado * 38, o[1] - 30 + bate * 1.4], [o[0] + lado * 40, o[1] - 10 + bate], [o[0] + lado * 34, o[1] + 6 + bate * 0.6], [o[0] + lado * 24, o[1] + 14], [o[0] + lado * 12, o[1] + 16]]
    g.poligono(pts, pena, 3, lado > 0 ? -0.2 : 0)
    for (let k = 0; k < 5; k++) g.linha(o[0] + lado * (10 + k * 6), o[1] + 10 - k, o[0] + lado * (16 + k * 5), o[1] - 18 + bate * (0.6 + k * 0.15), '#741610')
  }
  // corpo emplumado, pernas de ave com garras de ouro
  g.elipse(cx, 50 + b, 10, 14, pena)
  for (const x of [cx - 5, cx + 5]) { g.membro(x, 62 + b, x, 76, 2, 1.6, garra); for (const k of [-3, 0, 3]) g.membro(x, 76, x + k, 80, 1, 0.6, garra) }
  // rosto e cabelo selvagem
  // cabelo selvagem atrás, rosto grande na frente, crista de penas
  g.elipse(cx, 27 + b, 13, 13, cabelo, 1, -0.1)
  for (const [x, y] of [[-12, 30], [12, 30], [-9, 38], [9, 38]] as P[]) g.poligono([[cx + x - 3, y + b], [cx + x * 1.4, y + 10 + b], [cx + x + 3, y + b]], cabelo, 1, -0.1)
  for (const k of [-6, 0, 6]) g.poligono([[cx + k - 3, 16 + b], [cx + k * 1.5, 4 + b - Math.abs(k) * 0.3], [cx + k + 3, 16 + b]], pena, 1)
  g.elipse(cx, 29 + b, 9, 9.5, pele)
  g.poligono([[cx - 9, 25 + b], [cx - 5, 20 + b], [cx + 5, 20 + b], [cx + 9, 25 + b], [cx + 3, 23 + b], [cx - 3, 23 + b]], cabelo, 1, 0.1)
  for (const x of [cx - 5, cx + 3]) { g.retangulo(x, 27 + b, 2.5, 2.5, g.material(MAT.ouro), 0, 0.4); g.ponto(x + 1, 28 + b, '#120a04') }
  g.poligono([[cx - 1.5, 31 + b], [cx + 1.5, 31 + b], [cx, 35 + b]], garra, 1)
  g.linha(cx - 3, 36 + b, cx + 3, 36 + b, A.abre > 0.5 ? '#4f0e0a' : '#c0604a')
}

export const DESENHOS_BESTAS: Record<Besta, Desenho> = { corvo, morcego, aranha, escaravelho, goblin, esqueleto, cavaleiro, espectro, quimera, mao, leviata, rei, arconte, ent, harpia, cogumelo }

export const TAMANHO_BESTAS: Record<Besta, [number, number]> = {
  corvo: [76, 70], morcego: [84, 64], aranha: [100, 76], escaravelho: [90, 68], goblin: [70, 66], esqueleto: [72, 86], cavaleiro: [92, 98],
  espectro: [92, 112], quimera: [130, 104], mao: [100, 98], leviata: [148, 128], rei: [124, 120], arconte: [124, 124], ent: [120, 126], harpia: [108, 92], cogumelo: [64, 58],
}
export const ORIGEM_BESTAS: Record<Besta, [number, number]> = {
  corvo: [4, 6], morcego: [4, 8], aranha: [4, 6], escaravelho: [4, 6], goblin: [6, 6], esqueleto: [4, 4], cavaleiro: [8, 6],
  espectro: [6, 8], quimera: [2, 6], mao: [4, 4], leviata: [4, 4], rei: [8, 14], arconte: [6, 6], ent: [6, 4], harpia: [6, 6], cogumelo: [4, 4],
}
export const PALETA_BESTAS: Record<Besta, string[]> = {
  corvo: ['#9ea5b2', '#646b78', '#f2c45a'], morcego: ['#86789e', '#8a5530', '#ffe040'], aranha: ['#a878f0', '#6a40b8', '#ff4a6a'], escaravelho: ['#5fdc7a', '#7fe0ff', '#9ea5b2'],
  goblin: ['#7ac850', '#8a5530', '#9ea5b2'], esqueleto: ['#e8dcc0', '#fffaf0', '#7fe0ff'], cavaleiro: ['#98a8c0', '#e4ecf6', '#f2c45a'], espectro: ['#7fe0ff', '#d8ffff', '#a878f0'],
  quimera: ['#ffc24a', '#8a5530', '#e2b444'], mao: ['#98a8c0', '#f07a5a', '#f2c45a'], leviata: ['#7fe0ff', '#3aa0d0', '#f0dca0'], rei: ['#a878f0', '#f2c45a', '#97927f'],
  arconte: ['#9ea5b2', '#f2c45a', '#ffc24a'], ent: ['#8f5f34', '#6a9a34', '#b8ffb0'], harpia: ['#b02c1e', '#f2b98e', '#f2c45a'], cogumelo: ['#ac3434', '#e0d0b0', '#e0e09a'],
}

/**
 * Sprites em pixel art nativa, montados pixel a pixel no motor de pixel.ts:
 * formas na grade, sombreadas com rampas de 4 tons, contorno colorido e
 * detalhes à mão (olhos, fendas, rebites). Dois quadros de respiração por
 * personagem; dano, ataque e derrota ficam no CSS e no palco de efeitos.
 * Fantasia original, sem anatomia humana médica.
 */
import { Grade, MAT } from './pixel'

export type Personagem = 'golem' | 'serpente' | 'guardiao' | 'heroi'

/** Tamanho nativo de cada sprite, em pixels. */
export const TAMANHO: Record<Personagem, [number, number]> = { heroi: [34, 42], golem: [52, 50], serpente: [52, 46], guardiao: [60, 64] }

/** Cores de fragmentos e partículas (dano e derrota). */
export const PALETA_PERSONAGEM: Record<Personagem, string[]> = {
  golem: ['#fbf6e8', '#ddd3bb', '#ab9f86', '#7fe6ff'],
  serpente: ['#fff0a0', '#e2b444', '#a8781e', '#ff6a4a'],
  guardiao: ['#f4f8ff', '#b9c6d8', '#f2c45a', '#c43a24'],
  heroi: ['#7fb2f0', '#b9c6d8', '#f4f8ff'],
}

type Desenho = (g: Grade, r: number) => void

const heroi: Desenho = (g, r) => {
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

const golem: Desenho = (g, r) => {
  const gesso = g.material(MAT.gesso), pedra = g.material(MAT.pedra)
  // pernas curtas e pesadas
  g.elipse(18, 43, 6.5, 6, pedra); g.elipse(34, 43, 6.5, 6, pedra)
  g.retangulo(11, 45, 14, 4, pedra, 1); g.retangulo(27, 45, 14, 4, pedra, 1)
  // tronco de rocha e gesso
  g.poligono([[10, 20 + r], [17, 12 + r], [35, 11 + r], [43, 19 + r], [45, 31], [38, 41], [14, 41], [7, 31]], gesso, 6)
  // placas de gesso em relevo
  g.poligono([[14, 18 + r], [24, 16 + r], [25, 25 + r], [15, 27 + r]], gesso, 2, 0.12)
  g.poligono([[28, 17 + r], [38, 19 + r], [37, 27 + r], [28, 26 + r]], gesso, 2, 0.08)
  g.poligono([[17, 30], [35, 30], [33, 38], [19, 38]], gesso, 2, 0.05)
  for (const [a, b, c, d] of [[14, 18, 24, 16], [28, 17, 38, 19], [17, 30, 35, 30]]) g.linha(a, b + (b < 30 ? r : 0), c, d + (d < 30 ? r : 0), '#fffdf6')
  // ombros e braços de pedra com faixas de gesso
  g.elipse(8, 21 + r, 7, 7, gesso); g.elipse(44, 21 + r, 7, 7, gesso)
  g.elipse(6, 33, 6.5, 7, pedra); g.elipse(46, 33, 6.5, 7, pedra)
  for (const cx of [6, 46]) for (let k = -1; k <= 1; k++) for (let x = -5; x <= 5; x++) { const y = 32 + k * 3 + Math.round(x * 0.4); if (g.ocupado(cx + x, y)) g.ponto(cx + x, y, k === 0 ? '#fffaf0' : '#d9cfb6') }
  // musgo nos ombros
  for (const [x, y] of [[4, 15], [5, 15], [6, 14], [7, 14], [45, 14], [46, 14], [47, 15], [44, 15]]) g.ponto(x, y + r, (x + y) % 2 ? '#6a9a34' : '#9cc65a')
  // fendas com energia mágica
  const fenda = (pts: Array<[number, number]>) => { for (let i = 1; i < pts.length; i++) g.linha(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], '#7fe6ff'); pts.forEach(([x, y]) => g.ponto(x, y, '#e8ffff')) }
  fenda([[25, 14 + r], [27, 19 + r], [24, 23 + r], [27, 28], [25, 33]])
  fenda([[36, 22 + r], [40, 25 + r], [41, 29]])
  fenda([[12, 27], [15, 30], [14, 35]])
  // cabeça encaixada no tronco
  g.poligono([[18, 4 + r], [32, 3 + r], [36, 10 + r], [32, 16 + r], [19, 16 + r], [15, 10 + r]], gesso, 3, 0.06)
  g.linha(17, 9 + r, 34, 9 + r, '#6f6553'); g.linha(18, 8 + r, 33, 8 + r, '#ab9f86')
  for (const x of [21, 29]) { g.ponto(x, 11 + r, '#e8ffff'); g.ponto(x + 1, 11 + r, '#9ff0ff'); g.ponto(x, 12 + r, '#4fc8e8'); g.ponto(x + 1, 12 + r, '#4fc8e8') }
  g.linha(22, 14 + r, 29, 14 + r, '#6f6553')
}

const serpente: Desenho = (g, r) => {
  const escama = g.material(MAT.escama), vermelho = g.material(MAT.vermelho)
  // espiral do corpo (de trás para a frente)
  for (let i = 0; i <= 46; i++) {
    const t = i / 46, a = t * Math.PI * 2.6 + 0.5
    const raio = 17 * (1 - t * 0.45)
    const x = 26 + Math.cos(a) * raio, y = 37 - t * 12 + Math.sin(a) * raio * 0.38
    g.elipse(x, y, 6.5 - t * 2, 5.5 - t * 1.6, escama)
  }
  // ventre claro na volta da frente
  for (let x = 14; x <= 38; x++) { const y = 42 + Math.round(Math.sin((x - 14) / 24 * Math.PI) * 2); if (g.ocupado(x, y)) { g.ponto(x, y, x % 3 ? '#f0dca0' : '#fff8dc'); g.ponto(x, y - 1, '#c8aa6a') } }
  // faixas escuras das escamas
  for (let i = 0; i < 9; i++) { const x = 12 + i * 3.4, y = 34 + Math.sin(i) * 3; g.ponto(x, y, '#5e3c0c'); g.ponto(x + 1, y, '#a8781e') }
  // pescoço erguido
  for (let i = 0; i < 10; i++) g.elipse(31 - i * 0.6, 26 - i * 1.6 + r * (i / 10), 4.5 - i * 0.12, 3.5, escama)
  // capuz
  g.elipse(26, 9 + r, 10, 7.5, escama, 0.8)
  g.elipse(26, 10 + r, 5.5, 4.5, vermelho, 0.6)
  // cabeça
  g.poligono([[19, 7 + r], [26, 1 + r], [33, 7 + r], [30, 12 + r], [22, 12 + r]], escama, 2, 0.1)
  g.ponto(23, 7 + r, '#ffe0c0'); g.ponto(29, 7 + r, '#ffe0c0'); g.ponto(23, 8 + r, '#ff5a3c'); g.ponto(29, 8 + r, '#ff5a3c')
  // língua bifurcada
  g.linha(26, 12 + r, 26, 15 + r, '#d0281c'); g.ponto(25, 16 + r, '#d0281c'); g.ponto(27, 16 + r, '#d0281c')
}

const guardiao: Desenho = (g, r) => {
  const aco = g.material(MAT.aco), verm = g.material(MAT.vermelho), couro = g.material(MAT.couro)
  // capa
  g.poligono([[16, 22 + r], [44, 22 + r], [52, 60], [8, 60]], verm, 4)
  // pernas
  g.retangulo(21, 46, 7, 12, aco, 2); g.retangulo(32, 46, 7, 12, aco, 2)
  g.retangulo(20, 56, 9, 5, couro, 1); g.retangulo(31, 56, 9, 5, couro, 1)
  // saiote de placas e peitoral
  g.retangulo(18, 41, 24, 7, aco, 2)
  g.poligono([[17, 24 + r], [43, 24 + r], [41, 42], [19, 42]], aco, 5)
  for (let y = 25; y <= 41; y++) g.ponto(30, y + (y < 34 ? r : 0), y % 2 ? '#f2c45a' : '#fff1b0')
  for (const [x, y] of [[24, 30], [36, 30], [30, 36]]) { g.ponto(x, y + r, '#fff7c8'); g.ponto(x + 1, y + r, '#f2c45a') }
  // ombreiras
  g.elipse(15, 26 + r, 6.5, 5, aco); g.elipse(45, 26 + r, 6.5, 5, aco)
  for (let x = 9; x <= 21; x++) g.ponto(x, 30 + r, '#c28a2a')
  for (let x = 39; x <= 51; x++) g.ponto(x, 30 + r, '#c28a2a')
  // elmo com viseira em brasa e penacho
  g.elipse(30, 15 + r, 9, 9.5, aco)
  g.retangulo(21, 18 + r, 18, 5, aco, 1)
  g.linha(23, 16 + r, 37, 16 + r, '#2a1a08'); g.linha(24, 16 + r, 36, 16 + r, '#ffd76a'); g.ponto(30, 16 + r, '#fff7c8')
  for (let x = 21; x <= 38; x++) g.ponto(x, 23 + r, x % 2 ? '#f2c45a' : '#c28a2a')
  g.elipse(33, 4 + r, 4, 2.5, verm); g.elipse(38, 5 + r, 4, 2.5, verm); g.elipse(42, 9 + r, 3, 3, verm)
  // escudo-taça (côncavo) na esquerda
  g.elipse(11, 40, 10, 11, aco, 0.5)
  for (let a = 0; a < Math.PI * 2; a += 0.18) { const x = 11 + Math.cos(a) * 9.6, y = 40 + Math.sin(a) * 10.6; g.ponto(x, y, a > 3 && a < 5 ? '#fff1b0' : '#c28a2a') }
  for (let y = 34; y <= 46; y++) for (let x = 6; x <= 16; x++) { const d = Math.hypot(x - 12, y - 41); if (d < 5) g.sombrear(x, y, 0.5 - d * 0.06) }
  g.ponto(8, 35, '#ffffff'); g.ponto(9, 34, '#f4f8ff')
  // espada longa na direita
  for (let i = 0; i < 26; i++) { g.ponto(52, 44 - i, i > 23 ? '#f4f8ff' : '#dfe6ee'); g.ponto(53, 44 - i, '#8a96aa') }
  g.linha(48, 45, 57, 45, '#c28a2a'); g.ponto(52, 45, '#fff1b0'); g.linha(52, 46, 53, 49, '#5e351a')
}

const DESENHOS: Record<Personagem, Desenho> = { heroi, golem, serpente, guardiao }

/** Pinta o quadro (0 ou 1) do sprite, na resolução nativa. */
export function pintarPersonagem(canvas: HTMLCanvasElement, quem: Personagem, quadro: 0 | 1 = 0) {
  const [w, h] = TAMANHO[quem]
  const g = new Grade(w, h)
  DESENHOS[quem](g, quadro)
  g.pintar(canvas)
}

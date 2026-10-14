/**
 * Ícones dos poderes, relíquias e eventos, em pixel art nativa 20×20 no mesmo
 * motor dos personagens (pixel.ts): formas com volume, rampa de 4 tons e
 * contorno colorido. Nada de anatomia: o bisturi e a tala são ferramentas.
 */
import { Grade, MAT } from './pixel'

type Desenho = (g: Grade, m: (k: keyof typeof MAT) => number) => void
const P = (g: Grade, pts: Array<[number, number]>, cor: string) => pts.forEach(([x, y]) => g.ponto(x, y, cor))

const ICONES: Record<string, Desenho> = {
  espada: (g, m) => { g.membro(4, 16, 15, 4, 1.6, 1, m('aco')); g.linha(5, 15, 15, 5, '#ffffff'); g.membro(3, 12, 8, 17, 1.2, 1.2, m('ouro')); g.membro(2, 18, 5, 15, 1.4, 1.4, m('couro')); g.elipse(2, 18, 1.4, 1.4, m('ouro')) },
  martelo: (g, m) => { g.membro(5, 17, 12, 8, 1.3, 1.3, m('madeira')); g.poligono([[8, 3], [17, 7], [14, 13], [5, 9]], m('ferro'), 2); g.linha(9, 5, 15, 8, '#f2c45a'); P(g, [[7, 6], [8, 5]], '#ffffff') },
  eco: (g, m) => { g.membro(3, 16, 13, 4, 1.4, 0.9, m('ciano')); g.membro(8, 18, 17, 7, 1.2, 0.8, m('ciano'), -0.2); P(g, [[13, 4], [17, 7], [12, 5]], '#ffffff') },
  quebra: (g, m) => { g.poligono([[3, 5], [10, 3], [10, 17], [3, 15]], m('aco2'), 2); g.poligono([[11, 3], [17, 5], [17, 15], [11, 17]], m('aco2'), 2, -0.1); g.linha(10, 3, 11, 17, '#120a06'); P(g, [[9, 8], [12, 11], [8, 13]], '#ffd27a'); P(g, [[5, 6], [13, 6]], '#ffffff') },
  escudo: (g, m) => { g.poligono([[3, 3], [17, 3], [17, 10], [10, 18], [3, 10]], m('azul'), 3); g.linha(10, 4, 10, 16, '#f2c45a'); g.linha(4, 9, 16, 9, '#f2c45a'); g.elipse(10, 9, 2, 2, m('ouro')); P(g, [[5, 5], [6, 5]], '#bfe0ff') },
  barreira: (g, m) => { for (let a = 0; a < 6; a++) { const x = 10 + Math.cos(a * 1.047) * 5, y = 10 + Math.sin(a * 1.047) * 5; g.elipse(x, y, 3.2, 3.2, m('ciano'), 0.7) } g.elipse(10, 10, 3, 3, m('ciano'), 1, 0.3); P(g, [[9, 9]], '#ffffff') },
  olho: (g, m) => { g.elipse(10, 10, 8, 5, m('papel')); g.elipse(10, 10, 3.6, 3.6, m('roxo')); g.elipse(10, 10, 1.6, 1.6, m('ferro'), 1, -0.6); P(g, [[9, 8]], '#ffffff'); g.linha(2, 10, 4, 7, '#3a2410'); g.linha(18, 10, 16, 7, '#3a2410') },
  coroa: (g, m) => { g.poligono([[3, 7], [6, 11], [10, 4], [14, 11], [17, 7], [16, 16], [4, 16]], m('ouro'), 2); g.elipse(10, 12, 1.6, 1.6, m('vermelho')); g.elipse(5, 13, 1, 1, m('azul')); g.elipse(15, 13, 1, 1, m('azul')); P(g, [[10, 4], [3, 7], [17, 7]], '#fff1b0') },
  pocao: (g, m) => { g.elipse(10, 12, 6, 6, m('vermelho')); g.retangulo(8, 2, 4, 5, m('vermelho'), 1); g.retangulo(7, 1, 6, 2, m('madeira'), 1); P(g, [[7, 10], [8, 9]], '#ffd0c0'); P(g, [[12, 14], [13, 12]], '#fff1b0') },
  frasco: (g, m) => { g.poligono([[7, 2], [13, 2], [13, 7], [17, 16], [3, 16], [7, 7]], m('verde'), 2); g.retangulo(6, 1, 8, 2, m('madeira'), 1); g.linha(5, 12, 15, 12, '#e8ffe0'); P(g, [[8, 9], [8, 10]], '#ffffff') },
  pergaminho: (g, m) => { g.retangulo(4, 4, 12, 12, m('papel'), 2); g.membro(3, 4, 17, 4, 1.8, 1.8, m('madeira')); g.membro(3, 16, 17, 16, 1.8, 1.8, m('madeira')); for (const y of [7, 9, 11, 13]) g.linha(6, y, y === 13 ? 10 : 14, y, '#8a6a3a'); g.elipse(13, 13, 1.6, 1.6, m('vermelho')) },
  bisturi: (g, m) => { g.membro(3, 17, 10, 10, 1.6, 1.6, m('aco2')); g.poligono([[10, 10], [16, 2], [17, 4], [12, 11]], m('aco'), 1, 0.2); g.linha(11, 9, 16, 3, '#ffffff'); for (let k = 0; k < 4; k++) g.ponto(4 + k * 1.6, 16 - k * 1.6, '#5b6884') },
  chama: (g, m) => { g.poligono([[10, 1], [15, 8], [16, 13], [13, 18], [7, 18], [4, 13], [6, 7], [8, 9]], m('chama'), 3); g.poligono([[10, 8], [13, 13], [11, 17], [9, 17], [7, 13]], m('chama'), 2, 0.4) },
  estrela: (g, m) => { const pts: Array<[number, number]> = []; for (let k = 0; k < 10; k++) { const r = k % 2 ? 3.4 : 8.4, a = -Math.PI / 2 + k * Math.PI / 5; pts.push([10 + Math.cos(a) * r, 10.5 + Math.sin(a) * r]) } g.poligono(pts, m('ouro'), 3); P(g, [[10, 4], [9, 6]], '#ffffff') },
  tala: (g, m) => { g.retangulo(6, 2, 8, 16, m('gesso'), 2); for (const y of [5, 10, 15]) g.retangulo(4, y - 1, 12, 2.4, m('couro'), 1); P(g, [[8, 3], [8, 4]], '#ffffff') },
  peitoral: (g, m) => { g.poligono([[3, 4], [8, 3], [10, 5], [12, 3], [17, 4], [16, 12], [10, 18], [4, 12]], m('aco2'), 3); g.linha(10, 5, 10, 16, '#323a52'); P(g, [[6, 6], [13, 6], [6, 7]], '#ffffff'); g.elipse(10, 10, 1.4, 1.4, m('ouro')) },
  'escudo-ouro': (g, m) => { g.poligono([[3, 3], [17, 3], [17, 10], [10, 18], [3, 10]], m('ouro'), 3); g.poligono([[6, 6], [14, 6], [14, 10], [10, 15], [6, 10]], m('vermelho'), 2); P(g, [[10, 8], [9, 9], [11, 9], [10, 10]], '#fff1b0') },
  mao: (g, m) => { g.elipse(10, 12, 6, 5.5, m('pele')); for (const [x, h] of [[5, 6], [8, 4], [11, 4], [14, 5]] as Array<[number, number]>) g.membro(x, 10, x, h, 1.4, 1.3, m('pele')); g.membro(4, 13, 2, 10, 1.4, 1.2, m('pele')); g.elipse(10, 12, 2.4, 2.4, m('verde'), 1, 0.2) },
  coracao: (g, m) => { g.elipse(7, 8, 4.2, 4, m('vermelho')); g.elipse(13, 8, 4.2, 4, m('vermelho')); g.poligono([[3, 9], [17, 9], [10, 18]], m('vermelho'), 3); P(g, [[6, 6], [7, 6], [5, 7]], '#ffd0c0') },
  vigor: (g, m) => { g.elipse(7, 8, 4.2, 4, m('vermelho')); g.elipse(13, 8, 4.2, 4, m('vermelho')); g.poligono([[3, 9], [17, 9], [10, 18]], m('vermelho'), 3); g.retangulo(9, 6, 2, 8, m('ouro'), 0); g.retangulo(6, 9, 8, 2, m('ouro'), 0) },
  selo: (g, m) => { g.elipse(10, 9, 7, 7, m('verde')); g.poligono([[6, 14], [9, 15], [8, 19], [6, 17]], m('vermelho'), 1); g.poligono([[14, 14], [11, 15], [12, 19], [14, 17]], m('vermelho'), 1); P(g, [[10, 6], [10, 7], [9, 8], [11, 8], [8, 9], [12, 9], [10, 11]], '#fff1b0') },
  raio: (g, m) => { g.poligono([[11, 1], [5, 11], [9, 11], [7, 19], [15, 8], [11, 8], [13, 1]], m('verde'), 2, 0.2); P(g, [[11, 3], [8, 10]], '#ffffff') },
  insignia: (g, m) => { g.poligono([[10, 1], [17, 6], [15, 15], [10, 19], [5, 15], [3, 6]], m('ouro'), 3); g.elipse(10, 10, 3.4, 3.4, m('vermelho')); P(g, [[10, 9], [9, 10], [11, 10]], '#fff1b0') },
  vela: (g, m) => { g.retangulo(7, 8, 6, 11, m('papel'), 2); g.poligono([[10, 1], [12, 5], [10, 7], [8, 5]], m('chama'), 1, 0.3); g.linha(10, 7, 10, 8, '#120a06') },
  amuleto: (g, m) => { g.linha(4, 1, 10, 6, '#c28a2a'); g.linha(16, 1, 10, 6, '#c28a2a'); g.poligono([[10, 5], [16, 11], [10, 18], [4, 11]], m('ouro'), 2); g.elipse(10, 11, 2.6, 3.2, m('vermelho')); P(g, [[9, 10]], '#ffd0c0') },
  lupa: (g, m) => { g.membro(12, 12, 17, 17, 1.8, 2, m('madeira')); g.elipse(8, 8, 6, 6, m('ouro')); g.elipse(8, 8, 4.2, 4.2, m('ciano'), 0.6); P(g, [[6, 6], [7, 5]], '#ffffff') },
  livro: (g, m) => { g.poligono([[2, 5], [10, 3], [18, 5], [18, 17], [10, 15], [2, 17]], m('vermelho'), 2); g.poligono([[4, 6], [10, 4.6], [10, 14], [4, 15]], m('papel'), 1); g.poligono([[10, 4.6], [16, 6], [16, 15], [10, 14]], m('papel'), 1, -0.1); for (const y of [7, 9, 11]) { g.linha(5, y + 0.4, 9, y, '#8a6a3a'); g.linha(11, y, 15, y + 0.4, '#8a6a3a') } },
  fogueira: (g, m) => { g.membro(3, 17, 17, 13, 1.6, 1.6, m('madeira')); g.membro(3, 13, 17, 17, 1.6, 1.6, m('madeira')); g.poligono([[10, 2], [14, 8], [14, 13], [6, 13], [6, 8], [8, 9]], m('chama'), 3); g.poligono([[10, 8], [12, 11], [10, 13], [8, 11]], m('chama'), 1, 0.4) },
  bigorna: (g, m) => { g.poligono([[2, 6], [17, 6], [16, 9], [13, 10], [13, 13], [16, 16], [4, 16], [7, 13], [7, 10], [4, 9]], m('ferro'), 2); P(g, [[4, 7], [5, 7], [6, 7]], '#ffffff'); P(g, [[15, 3], [13, 2], [17, 4]], '#ffc24a') },
  halter: (g, m) => { g.membro(5, 10, 15, 10, 1.4, 1.4, m('ferro')); for (const x of [3, 5.5, 14.5, 17]) g.retangulo(x - 1.2, 5, 2.4, 10, m('aco2'), 1) },
  // bússola (Mapa do especialista): caixa de latão, rosa dos ventos e agulha
  bussola: (g, m) => { g.elipse(10, 10, 8, 8, m('ouro')); g.elipse(10, 10, 6, 6, m('papel'), 1); g.poligono([[10, 3.5], [12, 10], [10, 11], [8, 10]], m('vermelho'), 1); g.poligono([[10, 16.5], [8, 10], [10, 9], [12, 10]], m('aco2'), 1); g.elipse(10, 10, 1.2, 1.2, m('ouro')); P(g, [[10, 2], [18, 10], [10, 18], [2, 10]], '#3a2410'); P(g, [[6, 5], [7, 5]], '#ffffff') },
  // placa de desvio (Desvio de área): poste com duas setas em sentidos opostos
  desvio: (g, m) => { g.retangulo(9, 2, 2.4, 17, m('madeira'), 1); g.poligono([[3, 4], [14, 4], [17, 6.5], [14, 9], [3, 9]], m('chama'), 1); g.poligono([[17, 11], [6, 11], [3, 13.5], [6, 16], [17, 16]], m('verde'), 1); P(g, [[5, 5], [6, 5]], '#fff1b0'); P(g, [[15, 12]], '#e8ffe0') },
  brasao: (g, m) => { g.poligono([[3, 3], [17, 3], [17, 10], [10, 18], [3, 10]], m('ouro'), 3); g.poligono([[5, 5], [15, 5], [15, 10], [10, 15], [5, 10]], m('vermelho'), 2); P(g, [[8, 7], [12, 7], [10, 9], [10, 11], [9, 8], [11, 8]], '#fff1b0') },
  ampulheta: (g, m) => { g.retangulo(4, 1, 12, 2.4, m('madeira'), 1); g.retangulo(4, 17, 12, 2.4, m('madeira'), 1); g.poligono([[5, 3], [15, 3], [11, 10], [15, 17], [5, 17], [9, 10]], m('ciano'), 2, -0.2); g.poligono([[7, 13], [13, 13], [14, 16.5], [6, 16.5]], m('papel'), 1); g.poligono([[7, 4], [13, 4], [10, 8]], m('papel'), 1); P(g, [[10, 9], [10, 11]], '#f0dca8'); P(g, [[6, 4]], '#ffffff') },
  cartas: (g, m) => { g.poligono([[3, 5], [10, 3], [12, 16], [5, 18]], m('papel'), 2, -0.1); g.poligono([[8, 3], [16, 2], [17, 16], [9, 17]], m('roxo'), 2); g.retangulo(10.5, 5, 4.5, 9, m('ouro'), 1); P(g, [[12, 8], [13, 9], [12, 10]], '#fff1b0'); P(g, [[9, 4]], '#ffffff') },
  alvo: (g, m) => { g.elipse(10, 10, 8, 8, m('vermelho')); g.elipse(10, 10, 5.6, 5.6, m('papel')); g.elipse(10, 10, 3.2, 3.2, m('vermelho')); g.elipse(10, 10, 1.2, 1.2, m('papel'), 1, 0.3); g.membro(18, 2, 11, 9, 1, 0.8, m('madeira')); P(g, [[18, 2], [17, 1], [19, 3]], '#5fdc7a') },
  nuvem: (g, m) => { g.elipse(7, 8, 4.6, 4, m('ferro')); g.elipse(12, 6.5, 5, 4.6, m('ferro')); g.elipse(15, 9, 3.6, 3.2, m('ferro')); g.retangulo(4, 8, 13, 3.6, m('ferro'), 1); g.poligono([[11, 11], [7, 16], [10, 16], [8, 19.5], [14, 13.5], [11, 13.5], [13, 11]], m('ouro'), 1, 0.2); P(g, [[9, 4], [10, 4]], '#ffffff') },
  muralha: (g, m) => { g.retangulo(2, 7, 16, 11, m('pedra'), 2); for (const x of [2, 7, 12]) g.retangulo(x, 3, 4, 5, m('pedra'), 1); g.linha(2, 12, 18, 12, '#433f35'); g.linha(9, 7, 9, 12, '#433f35'); g.linha(6, 12, 6, 17, '#433f35'); g.linha(13, 12, 13, 17, '#433f35'); g.elipse(10, 14, 2.4, 2.4, m('ouro')); P(g, [[3, 8], [4, 8]], '#ffffff') },
  espadas: (g, m) => { g.membro(3, 17, 15, 3, 1.3, 0.9, m('aco')); g.membro(17, 17, 5, 3, 1.3, 0.9, m('aco')); g.membro(2, 13, 7, 18, 1, 1, m('ouro')); g.membro(18, 13, 13, 18, 1, 1, m('ouro')); P(g, [[15, 3], [5, 3]], '#ffffff') },
  folha: (g, m) => { g.poligono([[10, 2], [16, 7], [16, 13], [10, 18], [4, 13], [4, 7]], m('verde'), 3); g.linha(10, 4, 10, 18, '#145a26'); for (let k = 0; k < 3; k++) { g.linha(10, 7 + k * 3, 6, 5 + k * 3, '#2a9a48'); g.linha(10, 7 + k * 3, 14, 5 + k * 3, '#2a9a48') } g.elipse(10, 10, 2, 2, m('vermelho'), 1, 0.2); P(g, [[7, 6]], '#ffffff') },
  fenix: (g, m) => { g.poligono([[10, 3], [13, 8], [19, 5], [15, 12], [18, 17], [10, 14], [2, 17], [5, 12], [1, 5], [7, 8]], m('chama'), 2); g.elipse(10, 9, 2.4, 2.8, m('ouro'), 1, 0.2); P(g, [[10, 3], [9, 7]], '#ffffff') },
  moeda: (g, m) => { g.elipse(10, 10, 7.6, 7.6, m('ouro')); g.elipse(10, 10, 5.4, 5.4, m('ouro'), 1, -0.15); g.linha(10, 6, 10, 14, '#7a5214'); g.linha(8, 7, 12, 7, '#7a5214'); g.linha(8, 13, 12, 13, '#7a5214'); P(g, [[6, 6], [7, 5], [5, 8]], '#ffffff') },
  bolsa: (g, m) => { g.elipse(10, 12, 7.4, 6.4, m('couro')); g.poligono([[6, 6], [14, 6], [12, 3], [8, 3]], m('couro'), 1); g.linha(6, 6, 14, 6, '#3a1f0e'); g.elipse(10, 12, 2.6, 2.6, m('ouro')); P(g, [[6, 9], [7, 8]], '#e0b080'); P(g, [[9, 11]], '#fff1b0') },
  lanterna: (g, m) => { g.membro(10, 1, 10, 4, 1, 1, m('ferro')); g.retangulo(5, 4, 10, 2.4, m('ouro'), 1); g.retangulo(5, 16, 10, 2.4, m('ouro'), 1); g.retangulo(6, 6, 8, 10, m('chama'), 1, 0.3); g.linha(6, 6, 6, 16, '#7a5214'); g.linha(13, 6, 13, 16, '#7a5214'); P(g, [[9, 9], [10, 10], [9, 11]], '#ffffff') },
  porta: (g, m) => { g.poligono([[3, 19], [3, 8], [6, 3], [10, 1.5], [14, 3], [17, 8], [17, 19]], m('pedra'), 2); g.poligono([[6, 19], [6, 9], [8, 6], [10, 5], [12, 6], [14, 9], [14, 19]], m('madeira'), 2); g.linha(10, 5, 10, 19, '#3c210e'); g.elipse(12, 13, 0.9, 0.9, m('ouro')) },
}

ICONES['coracao2'] = ICONES.coracao

export function temIcone(nome: string) { return nome in ICONES }

export function pintarIcone(canvas: HTMLCanvasElement, nome: string) {
  const f = ICONES[nome]
  if (!f) return false
  const g = new Grade(20, 20)
  const cache = new Map<string, number>()
  f(g, (k) => { let i = cache.get(k); if (i === undefined) { i = g.material(MAT[k]); cache.set(k, i) } return i })
  g.pintar(canvas)
  return true
}

/**
 * Pixel art do salão da Biblioteca (pedido do Tales, 30/10/2026: "como se a página inteira fosse um jogo").
 * Cada desenho é uma grade de letras; cada letra é uma cor da paleta e "." é transparente. O componente
 * Sprite transforma a grade numa sombra de caixa (box-shadow), sem imagem nenhuma: leve e nítido em qualquer tela.
 * O teste fixtures/testar_salao_biblioteca.mjs confere que as linhas de cada desenho têm a mesma largura.
 */

export type Grade = readonly string[]
export type Paleta = Readonly<Record<string, string>>

const CONTORNO = '#1b1208'

// ─── Coruja, a bibliotecária ──────────────────────────────────────────────
export const PALETA_CORUJA: Paleta = { k: CONTORNO, b: '#7a4b26', d: '#5b3519', l: '#d8b07a', w: '#f6efe0', y: '#f3c64a', p: CONTORNO, o: '#e0892a' }
const CORUJA_CORPO = [
  '.kbwwwwoowwwwbk.',
  '.kdbbbbbobbbbdk.',
  '.kdbllllllllbdk.',
  '.kdbllkllkllbdk.',
  '.kdbllllllllbdk.',
  '..kdblllllllbk..',
  '...kkbbbbbbkk...',
  '....kok..kok....',
]
const CORUJA_TOPO = ['...k........k...', '..kbk......kbk..', '..kbbkkkkkkbbk..', '.kbbbbbbbbbbbbk.', '.kbwwwwbbwwwwbk.']
export const CORUJA_ACORDADA: Grade = [...CORUJA_TOPO, '.kwwyyywwyyywwk.', '.kwyypywwypyywk.', '.kwwyyywwyyywwk.', ...CORUJA_CORPO]
export const CORUJA_DORMINDO: Grade = [...CORUJA_TOPO, '.kwwwwwwwwwwwwk.', '.kwkkkwwwwkkkwk.', '.kwwwwwwwwwwwwk.', ...CORUJA_CORPO]

// ─── Gato da biblioteca (deitado, de lado) ────────────────────────────────
export const PALETA_GATO: Paleta = { k: CONTORNO, g: '#7d8190', d: '#5a5e6b', w: '#f1ece0', p: '#e58aa0', y: '#9bd36a' }
const GATO_CORPO = [
  'kgggpgggkkkkkkkgggk...',
  'kgwwwwggggggggggggk.k.',
  '.kwwwgggdggdggdgggkkgk',
  '.kggggggggggggggggggk.',
  '..kgkkkkkkkkkkkgkkkk..',
  '...k...........k......',
]
export const GATO_DORMINDO: Grade = ['..k...k...............', '.kgk.kgk..............', '.kgggggk..............', 'kgkkgkkgk......kkk....', ...GATO_CORPO]
export const GATO_ORELHA: Grade = ['......................', '.kgk.kkk..............', '.kgggggk..............', 'kgkkgkkgk......kkk....', ...GATO_CORPO]
export const GATO_ACORDADO: Grade = ['..k...k...............', '.kgk.kgk..............', '.kgggggk..............', 'kgykgkygk......kkk....', ...GATO_CORPO]

// ─── Planta no vaso (e florida, depois de buscar "garden") ────────────────
export const PALETA_PLANTA: Paleta = { k: CONTORNO, t: '#b5562e', T: '#8a3c1e', G: '#2f7a4a', g: '#4fa865', L: '#79c97f', f: '#f3a7c4', F: '#f6d27a' }
const VASO = ['.kkkkkkkkkk.', '.kttttttttk.', '.kTTTTTTTTk.', '..kttttttk..', '..kttttttk..', '..kTttttTk..', '...kkkkkk...']
export const PLANTA: Grade = [
  '....gg......', '...gLLg..g..', '..gLgg..gLg.', '.gLg.gg.gLg.', 'gLg...gGLg..', 'gg.g..GLg..g',
  '...gLgGg..gL', '..gLLGGg.gLg', '.gLg.GG.gLg.', '.gg..GGgLg..', '....gGGgg...', ...VASO,
]
export const PLANTA_FLORIDA: Grade = [
  '....ff......', '...gFFg..f..', '..gLgg..fFf.', '.fLg.gg.gLg.', 'fFf...gGLg..', 'gf.g..GLg..f',
  '...gLgGg..fF', '..gLLGGg.gLf', '.gFg.GG.gLg.', '.gg..GGgLg..', '....gGGgg...', ...VASO,
]

// ─── Lamparina (acesa e apagada) ──────────────────────────────────────────
export const PALETA_LAMPARINA: Paleta = { k: CONTORNO, m: '#3a2a1a', y: '#f6d27a', Y: '#fff1b8', o: '#f08a2a' }
export const PALETA_LAMPARINA_APAGADA: Paleta = { k: CONTORNO, m: '#3a2a1a', y: '#4a3b28', Y: '#5b4a33', o: '#3a2e20' }
export const LAMPARINA: Grade = ['...kk...', '..kmmk..', '.kkkkkk.', '.kyYYyk.', '.kyoYyk.', '.kYooYk.', '.kyooyk.', '.kyYYyk.', '.kkkkkk.', '..kmmk..', '...kk...']

// ─── Sazonais e objetos ───────────────────────────────────────────────────
export const PALETA_ABOBORA: Paleta = { k: CONTORNO, a: '#e87a1e', A: '#b85512', s: '#4a7a2a', y: '#ffd76a' }
export const ABOBORA: Grade = ['.....ss.....', '....kssk....', '..kkaaaakk..', '.kaAaaaaAak.', 'kaAyyaayyAak', 'kaAaaayaaAak', 'kaAyyyyyyAak', 'kaAayaayaAak', '.kaAaaaaAak.', '..kkkkkkkk..']
export const PALETA_MORCEGO: Paleta = { k: '#120c08' }
export const MORCEGO: Grade = ['k........k', 'kk.k..k.kk', 'kkkkkkkkkk', '.kkk..kkk.', '..k....k..']
export const PALETA_XICARA: Paleta = { k: CONTORNO, b: '#5b3519', c: '#f6efe0', C: '#d9cfbf' }
export const XICARA: Grade = ['kkkkkkkk...', 'kbbbbbbk...', 'kcccccckkk.', 'kcccccck.k.', 'kcccccck.k.', 'kCccccckkk.', '.kCcccck...', 'kCCCCCCCCk.', '.kkkkkkkk..']

/** Largura e altura da grade, em pixels de arte. */
export function tamanhoGrade(g: Grade): { w: number; h: number } {
  return { w: Math.max(...g.map((l) => l.length)), h: g.length }
}

/**
 * A grade como box-shadow: cada pixel vira uma sombra deslocada de (x+1, y+1) unidades, porque a sombra
 * na posição do próprio elemento fica escondida atrás dele. O elemento-base fica em (-1, -1).
 */
export function sombraPixel(g: Grade, paleta: Paleta, px: number): string {
  const partes: string[] = []
  g.forEach((linha, y) => {
    for (let x = 0; x < linha.length; x++) {
      const cor = paleta[linha[x]]
      if (cor) partes.push(`${(x + 1) * px}px ${(y + 1) * px}px 0 0 ${cor}`)
    }
  })
  return partes.join(',')
}

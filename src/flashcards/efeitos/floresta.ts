/**
 * Floresta das Fises Antigas: o cenário do primeiro lugar da Cripta (cena `campo`).
 *
 * Diferente das outras cenas, que são pintadas em código a cada tamanho, a
 * floresta é pintada OFFLINE por `scripts/cenarios/floresta.py` (ruído, voronoi,
 * rampas de cor com pontilhado e contorno) e salva em camadas PNG pequenas em
 * `public/flashcards/cenarios/`: fundo, meio, frente e luz, em paisagem
 * (520×330) e retrato (250×470).
 *
 * No jogo, cada camada é recortada no centro, sem reescalar: um pixel da arte
 * vira um bloco inteiro de pixels de tela (escala inteira), como numa pixel art
 * de verdade. A camada `luz` (feixes de sol, brilho das pedras e dos cogumelos)
 * é somada por cima em modo screen e também alimenta o bloom.
 */
import { recurso } from '../../config'

type Formato = 'paisagem' | 'retrato'
const CAMADAS = ['fundo', 'meio', 'frente', 'luz'] as const
type Camada = (typeof CAMADAS)[number]
export type ImagensFloresta = Record<Formato, Record<Camada, HTMLImageElement>>

let promessa: Promise<ImagensFloresta | null> | null = null

function carregar(src: string) {
  return new Promise<HTMLImageElement>((ok, falha) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => ok(img)
    img.onerror = falha
    img.src = src
  })
}

/** Carrega as 8 camadas uma vez só (cache do módulo). Devolve null se algo falhar: o jogo usa a cena antiga. */
export function carregarFloresta(): Promise<ImagensFloresta | null> {
  if (!promessa) {
    const formatos: Formato[] = ['paisagem', 'retrato']
    promessa = Promise.all(formatos.flatMap((f) => CAMADAS.map((c) => carregar(recurso(`flashcards/cenarios/floresta-${f}-${c}.png`)))))
      .then((imgs) => {
        const r = {} as ImagensFloresta
        formatos.forEach((f, i) => { r[f] = {} as Record<Camada, HTMLImageElement>; CAMADAS.forEach((c, j) => { r[f][c] = imgs[i * CAMADAS.length + j] }) })
        return r
      })
      .catch(() => null)
  }
  return promessa
}

/** Já carregou? (para pintar direto, sem esperar um quadro) */
let pronta: ImagensFloresta | null = null
carregarFloresta().then((r) => { pronta = r })
export const florestaPronta = () => pronta

/**
 * Preenche os planos da cena com as camadas recortadas no centro.
 * `w`×`h` é o tamanho em px CSS; a escala é o menor inteiro que cobre a tela
 * (nunca menor que 2, para o pixel continuar visível).
 */
export function pintarFloresta(
  planos: { fundo: HTMLCanvasElement; meio: HTMLCanvasElement; frente: HTMLCanvasElement; brilho: HTMLCanvasElement; luz?: HTMLCanvasElement },
  imgs: ImagensFloresta, w: number, h: number,
) {
  const formato: Formato = h > w * 1.05 ? 'retrato' : 'paisagem'
  const conj = imgs[formato]
  const iw = conj.fundo.naturalWidth, ih = conj.fundo.naturalHeight
  const s = Math.max(2, Math.ceil(Math.max(w / iw, h / ih) - 0.02))
  const W = Math.ceil(w / s), H = Math.ceil(h / s)
  const ox = Math.round((W - iw) / 2), oy = Math.round((H - ih) * 0.55)
  const pares: [HTMLCanvasElement | undefined, Camada][] = [[planos.fundo, 'fundo'], [planos.meio, 'meio'], [planos.frente, 'frente'], [planos.luz, 'luz'], [planos.brilho, 'luz']]
  for (const [cv, nome] of pares) {
    if (!cv) continue
    cv.width = W; cv.height = H
    const c = cv.getContext('2d')!
    c.imageSmoothingEnabled = false
    c.clearRect(0, 0, W, H)
    c.drawImage(conj[nome], ox, oy)
  }
  return s
}

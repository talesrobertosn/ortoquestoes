/**
 * Cenários pintados offline (direção criativa de 13/10/2026):
 *   jardim      Jardim Suspenso (`scripts/cenarios/jardim.py`), o andar a céu aberto dentro da cripta
 *   campo       Floresta das Fises Antigas (`scripts/cenarios/floresta.py`), 1º lugar da Cripta
 *   biblioteca  Biblioteca Ancestral (`scripts/cenarios/biblioteca.py`), o modo Estudo
 *   covil       Covil do Dragão (`scripts/cenarios/covil.py`), chefe Dragão de Ossos
 *   masmorra    Masmorra (`scripts/cenarios/masmorra.py`), 2º andar e o resto dos atos de masmorra
 *   caverna     Caverna dos Cristais (`scripts/cenarios/caverna.py`): rocha em névoa azul, cristais, lago e a fenda de luz
 *   laboratorio Laboratório do Alquimista (`scripts/cenarios/laboratorio.py`): frascos, caldeirão e o negatoscópio com o molde da placa
 *   catacumba   Catacumba das Velas (`scripts/cenarios/catacumba.py`): portão com luz verde, sarcófagos, urnas e velas (sem ossos)
 *   templo      Templo do Sol (`scripts/cenarios/templo.py`): teto aberto, disco solar, colunas com hera e espelho d'água
 *   passarela   Passarela das Nuvens (`scripts/cenarios/passarela.py`): ponte de pedra sobre o mar de nuvens, montanhas e lanternas
 *   forja       Forja dos Implantes (`scripts/cenarios/forja.py`): fornalha com coifa, bigorna com a placa em brasa, ferramentas e implantes prontos
 *   coliseu     Coliseu da Consolidação (`scripts/cenarios/coliseu.py`): arquibancada em arcos ao entardecer, portão com grade, tochas e areia
 *   salao       Salão do Trono (`scripts/cenarios/salao.py`), onde moram os chefes: colunas, vitral e tapete vermelho
 *   treino      Pátio dos Estandartes (`scripts/cenarios/treino.py`): alvo, galeria de madeira, flores e luz de manhã
 *   arquivo     Arquivo dos Mapas (`scripts/cenarios/arquivo.py`): estantes, plantas geométricas, janela e lanternas
 *   torre       Terraço do Horizonte (`scripts/cenarios/torre.py`): nuvens, montanhas, parapeito e estandartes ao entardecer
 *   vilarejo    Vilarejo dos Caminhos: casas de pedra e madeira, árvore e cerca (`vilarejo.py`)
 *   ruinas      Ruínas do Bosque: colunas, rio e ponte de madeira (`ruinas.py`)
 *   vila        Vila do Rio: telhados, hortas e caminhos vistos de cima (`vila.py`)
 *   campoflorido Campo do Poente: flores e banco de descanso (`campoflorido.py`)
 *   praia       Enseada do Farol: mar, dunas e farol (`praia.py`)
 *   estufa      Jardim dos Curandeiros: vidro, ervas e canteiros (`estufa.py`)
 *               Os seis scripts usam ferramentas de `scripts/cenarios/paisagens.py`.
 *
 * Diferente das outras cenas, que são pintadas em código a cada tamanho, estas
 * são pintadas OFFLINE com `scripts/cenarios/pintor.py` (ruído, voronoi,
 * rampas de cor com pontilhado e contorno) e salvas em camadas PNG pequenas em
 * `public/flashcards/cenarios/`: fundo, meio, frente e luz, em paisagem
 * (520×330) e retrato (250×470).
 *
 * No jogo, cada camada é recortada no centro, sem reescalar: um pixel da arte
 * vira um bloco inteiro de pixels de tela (escala inteira), como numa pixel art
 * de verdade. A camada `luz` (feixes de sol, brilho das pedras e dos cogumelos)
 * é somada por cima em modo screen e também alimenta o bloom.
 */
import { recurso } from '../../config'
import type { Cena } from './pintura'

type Formato = 'paisagem' | 'retrato'
export type Paisagem = 'vilarejo' | 'ruinas' | 'vila' | 'campoflorido' | 'praia' | 'estufa'
export type CenaAmbientada = Cena | Paisagem
export const PAISAGENS: readonly Paisagem[] = ['vilarejo', 'ruinas', 'vila', 'campoflorido', 'praia', 'estufa']
const CAMADAS = ['fundo', 'meio', 'frente', 'luz'] as const
type Camada = (typeof CAMADAS)[number]
export type ImagensCenario = Record<Formato, Record<Camada, HTMLImageElement>>

/** Cena do jogo → nome do arquivo pintado. */
export const CENAS_PINTADAS: Partial<Record<CenaAmbientada, string>> = { campo: 'floresta', biblioteca: 'biblioteca', covil: 'covil', masmorra: 'masmorra', jardim: 'jardim', salao: 'salao', caverna: 'caverna', laboratorio: 'laboratorio', catacumba: 'catacumba', templo: 'templo', passarela: 'passarela', forja: 'forja', coliseu: 'coliseu', treino: 'treino', arquivo: 'arquivo', torre: 'torre', vilarejo: 'vilarejo', ruinas: 'ruinas', vila: 'vila', campoflorido: 'campoflorido', praia: 'praia', estufa: 'estufa' }

const promessas = new Map<string, Promise<ImagensCenario | null>>()
const prontas = new Map<string, ImagensCenario | null>()

function carregar(src: string) {
  return new Promise<HTMLImageElement>((ok, falha) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => ok(img)
    img.onerror = falha
    img.src = src
  })
}

/** Carrega as 8 camadas de uma cena uma vez só (cache do módulo). Devolve null se algo falhar: o jogo usa a cena antiga. */
export function carregarCenarioPintado(nome: string): Promise<ImagensCenario | null> {
  let p = promessas.get(nome)
  if (!p) {
    const formatos: Formato[] = ['paisagem', 'retrato']
    p = Promise.all(formatos.flatMap((f) => CAMADAS.map((c) => carregar(recurso(`flashcards/cenarios/${nome}-${f}-${c}.png`)))))
      .then((imgs) => {
        const r = {} as ImagensCenario
        formatos.forEach((f, i) => { r[f] = {} as Record<Camada, HTMLImageElement>; CAMADAS.forEach((c, j) => { r[f][c] = imgs[i * CAMADAS.length + j] }) })
        return r
      })
      .catch(() => null)
      .then((r) => { prontas.set(nome, r); return r })
    promessas.set(nome, p)
  }
  return p
}

/** Já carregou? (para pintar direto, sem esperar um quadro). undefined = ainda carregando. */
export const cenarioPintadoPronto = (nome: string) => prontas.get(nome)

/**
 * Preenche os planos da cena com as camadas recortadas no centro.
 * `w`×`h` é o tamanho em px CSS; a escala é o menor inteiro que cobre a tela
 * (nunca menor que 2, para o pixel continuar visível).
 */
export function pintarCamadas(
  planos: { fundo: HTMLCanvasElement; meio: HTMLCanvasElement; frente: HTMLCanvasElement; brilho: HTMLCanvasElement; luz?: HTMLCanvasElement },
  imgs: ImagensCenario, w: number, h: number,
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

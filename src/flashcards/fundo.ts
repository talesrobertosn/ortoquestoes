/**
 * O jogo abre como pop-up por cima do site (pedido do Tales, 13/10/2026): a
 * página de onde a pessoa veio continua desenhada atrás, translúcida, e o X
 * (ou "Sair") volta para ela. "Menu" leva à entrada do jogo.
 */
import { navegar } from '../util/rotas'

const CHAVE = 'flashcards:fundo'
/** Central, desempenho e cronograma dos flashcards são páginas do site; o resto é o jogo em tela cheia. */
const PAGINAS_DO_SITE: Array<string | undefined> = [undefined, 'desempenho', 'cronograma']

/** Rotas do jogo dos flashcards: abrem como pop-up por cima do site. */
export function ehRotaDoJogo(segmentos: string[]) {
  return segmentos[0] === 'flashcards' && !PAGINAS_DO_SITE.includes(segmentos[1])
}
const PADRAO = '/flashcards'
let fundo: string | null = null

/** Chamado pelo App a cada página do site (fora do jogo). */
export function lembrarFundo(caminho: string) {
  if (caminho === fundo) return
  fundo = caminho
  try { window.sessionStorage.setItem(CHAVE, caminho) } catch { /* sem armazenamento: fica na memória */ }
}

export function rotaDoFundo(): string {
  if (fundo) return fundo
  try { return window.sessionStorage.getItem(CHAVE) || PADRAO } catch { return PADRAO }
}

/** Fecha o jogo e volta para o site (a página que estava atrás), trocando a
 * entrada do jogo no histórico: o Voltar do navegador não reabre o jogo. */
export function sairDoJogo() { navegar(rotaDoFundo(), true) }

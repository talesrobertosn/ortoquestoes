/**
 * O jogo abre como pop-up por cima do site (pedido do Tales, 13/10/2026): a
 * página de onde a pessoa veio continua desenhada atrás, translúcida, e o X
 * (ou "Sair") volta para ela. "Menu" leva à entrada do jogo.
 */
import { navegar } from '../util/rotas'

const CHAVE = 'flashcards:fundo'
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

/** Fecha o jogo e volta para o site (a página que estava atrás). */
export function sairDoJogo() { navegar(rotaDoFundo()) }

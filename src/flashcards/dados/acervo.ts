/**
 * Acervo de flashcards publicado pela fábrica (public/flashcards/), carregado
 * sob demanda: primeiro o índice, depois os arquivos das áreas em paralelo.
 * O baralho de demonstração (feito à mão) entra junto. Enquanto carrega, ou
 * se a rede falhar, o jogo usa só o baralho de demonstração.
 */
import { recurso } from '../../config'
import type { Flashcard, IndiceAcervo } from '../tipos'
import { BARALHO_DEMO } from './baralhoDemo'

let cartas: Flashcard[] = BARALHO_DEMO
let indice: IndiceAcervo | null = null
let carregando: Promise<Flashcard[]> | null = null
let falhou = false

export function todasAsCartas() { return cartas }
export function indiceDoAcervo() { return indice }
/** A rede falhou e só o baralho de demonstração está carregado (a central avisa e oferece tentar de novo). */
export function acervoFalhou() { return falhou }

export function carregarAcervo(): Promise<Flashcard[]> {
  if (carregando) return carregando
  carregando = (async () => {
    try {
      const r = await fetch(recurso('flashcards/indice.json'), { cache: 'no-cache' })
      if (!r.ok) throw new Error('índice ' + r.status)
      const ind = (await r.json()) as IndiceAcervo
      const versao = '?v=' + ind.assinatura
      const listas = await Promise.all(Object.values(ind.areas).map(async (a) => {
        const resp = await fetch(recurso('flashcards/' + a.arquivo) + versao)
        if (!resp.ok) return [] as Flashcard[]
        return ((await resp.json()) as { flashcards: Flashcard[] }).flashcards
      }))
      const demo = new Set(BARALHO_DEMO.map((c) => c.questao))
      cartas = [...BARALHO_DEMO, ...listas.flat().filter((c) => !demo.has(c.questao))]
      indice = ind
      falhou = false
    } catch {
      cartas = BARALHO_DEMO
      falhou = true
    }
    return cartas
  })()
  return carregando
}

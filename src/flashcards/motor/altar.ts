/**
 * Altar do Saber: progresso permanente entre partidas (inspiração: o Espelho
 * da Noite, do Hades). Os cristais de conhecimento vêm de acertar flashcards
 * (o difícil vale o dobro; o brilhante, o dobro de novo) e de vencer elites e
 * chefes. Cada talento tem até 3 níveis e um efeito pequeno: o Altar ajuda,
 * mas quem vence a masmorra é quem sabe a matéria.
 */
import type { Talentos } from './regras'

export type IdTalento = keyof Talentos

export interface Talento {
  id: IdTalento
  nome: string
  texto: (nivel: number) => string
  icone: string
  /** Custo de cada nível (o tamanho da lista é o nível máximo). */
  custos: number[]
}

export const TALENTOS: Talento[] = [
  { id: 'vida', nome: 'Vigor do plantonista', icone: 'coracao2', custos: [20, 45, 90], texto: (n) => `Começa com +${5 * n} de vida (5 por nível).` },
  { id: 'pista', nome: 'Bolso de pergaminhos', icone: 'pergaminho', custos: [30, 70], texto: (n) => `Começa com ${n} pergaminho${n === 1 ? '' : 's'} da pista.` },
  { id: 'ouro', nome: 'Bolsa de residente', icone: 'moeda', custos: [15, 35, 70], texto: (n) => `Começa com ${15 * n} moedas.` },
  { id: 'sorte', nome: 'Sorte de principiante', icone: 'estrela', custos: [40, 90, 160], texto: (n) => `Recompensas raras, épicas e lendárias aparecem ${25 * n}% mais.` },
  { id: 'portas', nome: 'Visão do corredor', icone: 'lupa', custos: [120], texto: () => 'Uma porta a mais para escolher entre os andares.' },
  { id: 'rota', nome: 'Rota de estudo', icone: 'bussola', custos: [60, 140], texto: (n) => n >= 2 ? 'Começa com o Mapa do especialista e o Desvio de área.' : 'Começa com o Desvio de área (o nível 2 traz também o Mapa do especialista).' },
  { id: 'segunda', nome: 'Última chance', icone: 'coroa', custos: [200], texto: () => 'Começa com a Segunda chance equipada.' },
]

export interface EstadoAltar { versao: 1; cristais: number; ganhos: number; talentos: Talentos }
export const ALTAR_VAZIO: EstadoAltar = { versao: 1, cristais: 0, ganhos: 0, talentos: {} }

export function nivelDe(altar: EstadoAltar, id: IdTalento) { return altar.talentos[id] ?? 0 }

export function custoDoProximo(altar: EstadoAltar, t: Talento): number | null {
  const n = nivelDe(altar, t.id)
  return n >= t.custos.length ? null : t.custos[n]
}

/** Compra o próximo nível; devolve o mesmo objeto se não der (sem cristais ou no máximo). */
export function comprarTalento(altar: EstadoAltar, id: IdTalento): EstadoAltar {
  const t = TALENTOS.find((x) => x.id === id)
  if (!t) return altar
  const custo = custoDoProximo(altar, t)
  if (custo === null || altar.cristais < custo) return altar
  return { ...altar, cristais: altar.cristais - custo, talentos: { ...altar.talentos, [id]: nivelDe(altar, id) + 1 } }
}

export function ganharCristais(altar: EstadoAltar, valor: number): EstadoAltar {
  return valor > 0 ? { ...altar, cristais: altar.cristais + valor, ganhos: altar.ganhos + valor } : altar
}

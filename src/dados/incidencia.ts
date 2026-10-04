import type { Indice } from './tipos'
import contagem from './incidencia.json'

/**
 * Temas que mais caem: quanto cada área e cada assunto aparece nas provas
 * oficiais do acervo (TEOT, TARO, TECOC e ENARE), contado questão por
 * questão por scripts/gerar_incidencia.py. Entram só questões de prova, sem
 * cópias, anuladas ou questões autorais. Rodar o script de novo sempre que o
 * acervo ou a classificação mudar.
 *
 * Os nomes dos assuntos são os mesmos do acervo, então cada um vira atalho
 * para treinar exatamente aquele assunto.
 */

/** Prioridade de estudo pela contagem, em quartis dentro da área: 4 = máxima … 1 = baixa. */
export type Nivel = 1 | 2 | 3 | 4

export const ROTULO_NIVEL: Record<Nivel, string> = {
  4: 'Prioridade máxima',
  3: 'Prioridade alta',
  2: 'Prioridade média',
  1: 'Prioridade baixa',
}

export interface Foco {
  nome: string
  nivel: Nivel
  /** Questões de prova do assunto no acervo. */
  n?: number
  /** Subtema do acervo que representa o assunto, quando o nome não bate. */
  noAcervo?: string
}
export interface AreaIncidencia {
  id: string
  nome: string
  /** Tema do acervo onde ficam as questões desta área. */
  slug: string
  /** Quando a área é um recorte do tema, o subtema que a reúne. */
  subtema?: string
  /** Peso relativo, de 1 a 10, pela contagem. Só para o tamanho da barra. */
  peso: number
  /** Questões de prova da área no acervo e a fatia delas no total contado. */
  n?: number
  pct?: number
  focos: Foco[]
}

/** Quantas questões de prova entraram na contagem, somando todas as áreas. */
export const BASE_CONTAGEM: number = contagem.base

/** Da área com mais questões de prova para a com menos. */
export const AREAS: AreaIncidencia[] = contagem.areas.map((a) => ({ ...a, focos: a.focos.map((f) => ({ ...f, nivel: f.nivel as Nivel })) }))

/** Os assuntos com mais questões de prova, somando todas as áreas. */
export const TOP_ASSUNTOS: Array<{ area: string; nome: string; rotulo: string; n: number }> =
  contagem.top.map((t) => ({ ...t, rotulo: t.nome }))

export const areaPorId = (id: string) => AREAS.find((a) => a.id === id)

/**
 * Peso de cada tema do acervo no plano, pela posição no ranking: as áreas
 * que mais caem ganham até 35% a mais de espaço, as que menos caem perdem até 20%.
 */
export function pesoIncidenciaDoTema(slug: string): number {
  const areas = AREAS.filter((a) => a.slug === slug)
  if (!areas.length) return 1
  const melhor = Math.min(...areas.map((a) => AREAS.indexOf(a)))
  return 1.35 - (0.55 * melhor) / (AREAS.length - 1)
}

/**
 * Nível de incidência de cada questão do acervo, pelo subtema mais cobrado
 * que ela tem dentro do próprio tema. Questões sem subtema mapeado ficam de fora.
 */
/** posicao: lugar do assunto no ranking da própria área (1 = o que mais cai); 0 quando não está no ranking. */
export interface FocoDaQuestao { nome: string; nivel: Nivel | 0; ordem: number; posicao: number }

const cacheFocos = new WeakMap<Indice, Map<string, FocoDaQuestao>>()
/**
 * O assunto principal de cada questão: o mais cobrado entre os subtemas dela
 * (desempate pela ordem do ranking). Sem assunto mapeado, fica o primeiro
 * subtema da questão, com nível 0. Calculado uma vez por acervo.
 */
export function focoPorQuestao(indice: Indice): Map<string, FocoDaQuestao> {
  const pronto = cacheFocos.get(indice)
  if (pronto) return pronto
  const mapa = new Map<string, FocoDaQuestao>()
  const melhor = (id: string, novo: FocoDaQuestao) => {
    const atual = mapa.get(id)
    if (!atual || novo.nivel > atual.nivel || (novo.nivel === atual.nivel && novo.ordem < atual.ordem)) mapa.set(id, novo)
  }
  let ordem = 0
  for (const area of AREAS) {
    // Recorte inteiro que já é muito cobrado (trauma pediátrico): nível mínimo 3.
    if (area.subtema) { const o = ordem++; for (const id of idsDoFoco(indice, area)) melhor(id, { nome: area.subtema, nivel: 3, ordem: o + 500, posicao: 0 }) }
    area.focos.forEach((foco, i) => { const o = ordem++; for (const id of idsDoFoco(indice, area, foco)) melhor(id, { nome: foco.nome, nivel: foco.nivel, ordem: o, posicao: i + 1 }) })
  }
  for (const q of indice.questoes) {
    if (mapa.has(q.id)) continue
    const primeiro = q.s.length ? indice.subtemas[q.s[0]] : null
    mapa.set(q.id, { nome: primeiro ?? 'Outros assuntos', nivel: 0, ordem: 100000, posicao: 0 })
  }
  cacheFocos.set(indice, mapa)
  return mapa
}

export function nivelPorQuestao(indice: Indice): Map<string, Nivel> {
  const niveis = new Map<string, Nivel>()
  for (const [id, f] of focoPorQuestao(indice)) if (f.nivel) niveis.set(id, f.nivel)
  return niveis
}

const minusculo = (s: string) => s.toLocaleLowerCase('pt-BR')

/** Questões válidas (sem cópias nem anuladas) de uma área, ou de um assunto dentro dela. */
export function idsDoFoco(indice: Indice, area: AreaIncidencia, foco?: Foco): string[] {
  const tema = indice.temas.findIndex((t) => t.slug === area.slug)
  if (tema < 0) return []
  const exigidos = [area.subtema, foco ? (foco.noAcervo ?? foco.nome) : undefined].filter((s): s is string => !!s).map(minusculo)
  return indice.questoes
    .filter((q) => q.t === tema && !q.dup && !q.cm && q.an !== 1 && exigidos.every((alvo) => q.s.some((s) => minusculo(indice.subtemas[s] ?? '') === alvo)))
    .map((q) => q.id)
}

/** Lugar do tema do acervo no ranking das áreas (1 = a que mais cai), ou null. */
export function posicaoDaArea(slug: string): number | null {
  const i = AREAS.findIndex((a) => a.slug === slug && !a.subtema)
  return i < 0 ? null : i + 1
}

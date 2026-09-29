import { embaralhar } from './embaralhar'

/** Formato do Simulado Nacional: 50 questões de prova em 2 horas. */
export const QUESTOES_EDICAO = 50
export const DURACAO_EDICAO_MIN = 120

export interface EdicaoNacional {
  edicao: string | null
  titulo: string
  abre_em: string
  fecha_em: string
  duracao_min: number
  total: number
  por_tema: Record<string, number>
  participantes: number
  aberto: boolean
  minha: { iniciado_em: string; entregue_em: string | null; acertos: number | null; total: number | null; segundos: number | null; no_tempo: boolean | null } | null
  anteriores: Array<{ edicao: string; titulo: string }>
}

export interface LinhaTopNacional { posicao: number; apelido: string; acertos: number; total: number; segundos: number; eh_voce: boolean }
export interface TemaNacional { tema: string; certas: number; total: number; media: number | null }
export interface ResultadoNacional {
  entregue: boolean
  premium?: boolean
  acertos?: number
  total?: number
  segundos?: number
  no_tempo?: boolean
  entregue_em?: string
  participantes?: number
  media?: number | null
  posicao?: number | null
  percentil?: number | null
  temas?: TemaNacional[] | null
  top?: LinhaTopNacional[]
}

export interface CandidataEdicao { id: string; tema: string; gabarito: string }

/** Semente estável a partir do nome da edição: o sorteio de "2026-10" é sempre o mesmo. */
export function sementeEdicao(edicao: string): number {
  let h = 2166136261
  for (const c of `simulado-nacional:${edicao}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

/**
 * Sorteia as questões da edição: cada tema entra na proporção do acervo de
 * prova (mínimo de 1 por tema), sem repetir questões de edições anteriores
 * enquanto houver alternativa. A ordem final é misturada, como na prova.
 */
export function escolherEdicao(candidatas: CandidataEdicao[], edicao: string, total = QUESTOES_EDICAO, jaUsadas: Set<string> = new Set()): CandidataEdicao[] {
  const semente = sementeEdicao(edicao)
  const porTema = new Map<string, CandidataEdicao[]>()
  for (const c of candidatas) porTema.set(c.tema, [...(porTema.get(c.tema) ?? []), c])
  const temas = [...porTema.keys()].sort()
  const soma = candidatas.length
  // Maiores restos: a divisão proporcional fecha exatamente no total.
  const cotas = temas.map((tema) => {
    const exata = (porTema.get(tema)!.length / soma) * total
    return { tema, n: Math.max(1, Math.floor(exata)), resto: exata - Math.floor(exata) }
  })
  let falta = total - cotas.reduce((s, c) => s + c.n, 0)
  for (const c of [...cotas].sort((a, b) => b.resto - a.resto || a.tema.localeCompare(b.tema))) {
    if (falta <= 0) break
    c.n++; falta--
  }
  while (falta < 0) {
    const maior = [...cotas].sort((a, b) => b.n - a.n)[0]
    maior.n--; falta++
  }
  const escolhidas: CandidataEdicao[] = []
  temas.forEach((tema, i) => {
    const lista = embaralhar(porTema.get(tema)!, semente + i * 7919)
    const novas = lista.filter((c) => !jaUsadas.has(c.id))
    const ordem = [...novas, ...lista.filter((c) => jaUsadas.has(c.id))]
    escolhidas.push(...ordem.slice(0, cotas[i].n))
  })
  return embaralhar(escolhidas, semente ^ 0x9e3779b9)
}

/** "2026-10" do mês de uma data, no fuso de São Paulo. */
export function edicaoDoMes(data = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(data)
  return `${partes.find((p) => p.type === 'year')!.value}-${partes.find((p) => p.type === 'month')!.value}`
}

/** Fim do mês da edição, 23:59:59 em São Paulo (UTC-3). */
export function fimDaEdicao(edicao: string): string {
  const [ano, mes] = edicao.split('-').map(Number)
  const primeiroDoProximo = Date.UTC(mes === 12 ? ano + 1 : ano, mes === 12 ? 0 : mes, 1, 3, 0, 0)
  return new Date(primeiroDoProximo - 1000).toISOString()
}

/** Classificação de prontidão de um tema no simulado, comparando com a turma. */
export type Prontidao = 'pronto' | 'caminho' | 'reforcar'
export function prontidaoDoTema(certas: number, total: number, media: number | null): Prontidao {
  const p = total ? (certas / total) * 100 : 0
  if (p >= 70 && (media === null || p >= media)) return 'pronto'
  if (p < 50 || (media !== null && p < media - 15)) return 'reforcar'
  return 'caminho'
}

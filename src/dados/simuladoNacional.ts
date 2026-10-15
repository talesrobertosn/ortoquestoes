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

/** Formato do simulado de véspera: tamanho e tempo de uma prova teórica inteira. */
export const QUESTOES_VESPERA = 100
export const DURACAO_VESPERA_MIN = 240

export interface CandidataVespera extends CandidataEdicao {
  /** Prioridade do assunto nos temas que mais caem (4 = máxima, 0 = sem classificação). */
  nivel: number
  ano: number | null
}

/**
 * Sorteio do simulado de véspera. Mesma proporção por tema do Simulado
 * Nacional, mas dentro de cada tema vêm primeiro os assuntos que mais caem e,
 * entre eles, as provas mais recentes. Questões já usadas em edições
 * anteriores ficam por último.
 */
export function escolherVespera(candidatas: CandidataVespera[], edicao: string, total = QUESTOES_VESPERA, jaUsadas: Set<string> = new Set()): CandidataEdicao[] {
  const semente = sementeEdicao(edicao)
  const porTema = new Map<string, CandidataVespera[]>()
  for (const c of candidatas) porTema.set(c.tema, [...(porTema.get(c.tema) ?? []), c])
  const temas = [...porTema.keys()].sort()
  const cotas = temas.map((tema) => {
    const exata = (porTema.get(tema)!.length / candidatas.length) * total
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
    // Embaralha antes de ordenar: dentro do mesmo nível e ano, a ordem é sorteada.
    const lista = embaralhar(porTema.get(tema)!, semente + i * 7919)
      .sort((a, b) => Number(jaUsadas.has(a.id)) - Number(jaUsadas.has(b.id)) || b.nivel - a.nivel || (b.ano ?? 0) - (a.ano ?? 0))
    escolhidas.push(...lista.slice(0, cotas[i].n).map(({ id, tema: t, gabarito }) => ({ id, tema: t, gabarito })))
  })
  return embaralhar(escolhidas, semente ^ 0x9e3779b9)
}

/**
 * Em que pé está a edição para esta pessoa. Uma só regra para o botão do topo,
 * o texto do prazo e o histórico (antes cada pedaço da página decidia sozinho,
 * e uma edição ainda por abrir aparecia como "encerrada").
 */
export type SituacaoEdicao = 'em-breve' | 'aberta' | 'andamento' | 'tempo-esgotado' | 'entregue' | 'encerrada'
export function situacaoEdicao(ed: Pick<EdicaoNacional, 'abre_em' | 'fecha_em' | 'duracao_min' | 'minha'>, agora = Date.now()): SituacaoEdicao {
  const minha = ed.minha
  if (minha?.entregue_em) return 'entregue'
  if (minha) return Date.parse(minha.iniciado_em) + ed.duracao_min * 60_000 < agora ? 'tempo-esgotado' : 'andamento'
  if (agora < Date.parse(ed.abre_em)) return 'em-breve'
  if (agora > Date.parse(ed.fecha_em)) return 'encerrada'
  return 'aberta'
}

/** Segundos que faltam da prova começada (nunca negativo). */
export function segundosRestantesProva(iniciadoEm: string, duracaoMin: number, agora = Date.now()): number {
  return Math.max(0, Math.round((Date.parse(iniciadoEm) + duracaoMin * 60_000 - agora) / 1000))
}

/** "abre em 3 dias", "encerra em 5 horas": o prazo que importa agora, ou null quando já encerrou. */
export function prazoEdicao(ed: Pick<EdicaoNacional, 'abre_em' | 'fecha_em'>, agora = Date.now()): string | null {
  const abrir = Date.parse(ed.abre_em) - agora
  const [ms, verbo] = abrir > 0 ? [abrir, 'abre'] : [Date.parse(ed.fecha_em) - agora, 'encerra']
  if (ms <= 0) return null
  // Arredonda os dias: "2 dias e 23 horas" diz "3 dias", como a data mostrada ao lado.
  const dias = Math.round(ms / 86_400_000)
  if (ms >= 86_400_000) return `${verbo} em ${dias} ${dias === 1 ? 'dia' : 'dias'}`
  const horas = Math.floor(ms / 3_600_000)
  if (horas >= 1) return `${verbo} em ${horas} ${horas === 1 ? 'hora' : 'horas'}`
  const minutos = Math.max(1, Math.ceil(ms / 60_000))
  return `${verbo} em ${minutos} min`
}

export interface ItemCorrecao { id_questao: string; gabarito: string; marcada: string | null }
export interface ResumoCorrecao {
  certas: number
  erradas: number
  brancas: number
  /** Erradas e em branco, agrupadas pelo tema, do tema com mais erros para o com menos. */
  porTema: Array<{ tema: string; ids: string[] }>
  /** Ids errados ou em branco, na ordem da prova. */
  paraRever: string[]
}
/** Conta a correção e junta o que errou por tema (o tema vem do índice do acervo). */
export function resumirCorrecao(itens: ItemCorrecao[], temaDe: (id: string) => string | undefined): ResumoCorrecao {
  let certas = 0, erradas = 0, brancas = 0
  const paraRever: string[] = []
  const grupos = new Map<string, string[]>()
  for (const q of itens) {
    if (q.marcada && q.marcada === q.gabarito) { certas++; continue }
    if (q.marcada) erradas++
    else brancas++
    paraRever.push(q.id_questao)
    const tema = temaDe(q.id_questao) ?? 'Outros'
    grupos.set(tema, [...(grupos.get(tema) ?? []), q.id_questao])
  }
  const porTema = [...grupos].map(([tema, ids]) => ({ tema, ids })).sort((a, b) => b.ids.length - a.ids.length || a.tema.localeCompare(b.tema, 'pt-BR'))
  return { certas, erradas, brancas, porTema, paraRever }
}

export interface EdicaoHistorico { edicao: string; acertos: number; total: number; noTempo: boolean | null }
/** Nota de cada edição feita e a variação (em pontos) sobre a anterior; da mais recente para a mais antiga. */
export function evolucaoHistorico(historico: EdicaoHistorico[]): Array<EdicaoHistorico & { nota: number; variacao: number | null }> {
  const nota = (h: EdicaoHistorico) => (h.total ? Math.round((h.acertos / h.total) * 100) : 0)
  const ordenado = [...historico].sort((a, b) => a.edicao.localeCompare(b.edicao))
  return ordenado.map((h, i) => ({ ...h, nota: nota(h), variacao: i ? nota(h) - nota(ordenado[i - 1]) : null })).reverse()
}

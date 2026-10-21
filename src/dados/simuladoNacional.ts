import { focoPorQuestao } from './incidencia'
import type { Indice } from './tipos'

/*
 * Simulado Nacional 2.0 (docs/superpowers/specs/2026-10-19-simulado-nacional-contrato.md).
 *
 * Um sorteio único para a edição mensal e a véspera: a proporção de cada área
 * sai das provas oficiais do TEOT e do TARO (as dos últimos 5 anos pesam o
 * dobro); dentro da área, cerca de 60% vêm dos assuntos que mais caem (níveis
 * 3 e 4 de incidencia.ts); no máximo um terço da prova vem do mesmo ano; as
 * questões usadas em edições anteriores só entram se faltar. Tudo sai de uma
 * semente fixa pelo nome da edição, então o sorteio pode ser conferido.
 */

export const QUESTOES_MENSAL = 50
export const DURACAO_MENSAL_MIN = 120
export type TipoEdicao = 'mensal' | 'vespera'

/** As únicas provas que entram no Simulado Nacional (nome em indice.provas). */
export const PROVAS_NACIONAL: ReadonlySet<string> = new Set(['TEOT', 'TARO', 'Ortopedia'])

/** O que o painel pode ajustar no sorteio. Os padrões são os do contrato. */
export interface ConfigSorteio {
  /** Provas que entram (nomes de indice.provas). */
  provas: string[]
  /** Peso das provas recentes na conta da proporção (as demais pesam 1). */
  pesoRecentes: number
  /** Quantos anos contam como recentes: ano ≥ anoAtual − (anosRecentes − 1). */
  anosRecentes: number
  /** Parte de cada área, em %, que sai dos assuntos de nível 3 e 4. */
  nivelAltoPct: number
  /** Cotas manuais por área (nome da área → questões), ou null para a conta automática. */
  cotas: Record<string, number> | null
}
export const CONFIG_PADRAO: ConfigSorteio = { provas: [...PROVAS_NACIONAL], pesoRecentes: 2, anosRecentes: 5, nivelAltoPct: 60, cotas: null }

export interface CandidataNacional {
  id: string
  area: string
  areaSlug: string
  /** Assunto principal da questão (incidencia.ts), ou null se não houver. */
  foco: string | null
  /** Nível de incidência do assunto: 4 = máxima, 0 = sem classificação. */
  nivel: 0 | 1 | 2 | 3 | 4
  ano: number | null
  /** Nome da prova (indice.provas); opcional para quem monta candidatas à mão. */
  prova?: string
  /** Letra correta no acervo (antes da permutação). */
  gabarito: 'A' | 'B' | 'C' | 'D' | 'E'
  nAlternativas: number
}

const LETRAS = 'ABCDEFGHIJ'

/**
 * Questões do acervo que podem entrar: oficiais do TEOT, do TARO e de Ortopedia (origem não confirmada, antes "TEOT/TARO"),
 * sem anuladas, cópias (dup) e autorais (sim), com gabarito A–E dentro das
 * alternativas da questão. O índice não traz gabarito nem alternativas: quem
 * chama carrega os arquivos dos temas e responde por `gabaritoDe` e `nAltDe`,
 * devolvendo undefined para a questão anulada ou com figura pendente.
 */
export function candidatasDoIndice(
  indice: Indice,
  gabaritoDe: (id: string) => string | undefined,
  nAltDe: (id: string) => number | undefined,
  provas: ReadonlySet<string> = PROVAS_NACIONAL,
): CandidataNacional[] {
  const focos = focoPorQuestao(indice)
  const lista: CandidataNacional[] = []
  for (const q of indice.questoes) {
    if (q.dup || q.an === 1 || q.sim === 1 || q.p === null) continue
    if (!provas.has(indice.provas[q.p])) continue
    const gabarito = gabaritoDe(q.id)
    const nAlt = nAltDe(q.id)
    if (!gabarito || !/^[A-E]$/.test(gabarito) || !nAlt || nAlt < 2 || nAlt > LETRAS.length) continue
    if (LETRAS.indexOf(gabarito) >= nAlt) continue
    const tema = indice.temas[q.t]
    const foco = focos.get(q.id)
    lista.push({
      id: q.id, area: tema.nome, areaSlug: tema.slug,
      foco: foco && foco.nome !== 'Outros assuntos' ? foco.nome : null,
      nivel: (foco?.nivel ?? 0) as CandidataNacional['nivel'],
      ano: q.a, prova: indice.provas[q.p], gabarito: gabarito as CandidataNacional['gabarito'], nAlternativas: nAlt,
    })
  }
  return lista
}

/** Ano corrente em São Paulo. */
function anoEmSaoPaulo(data = new Date()): number {
  return Number(edicaoDoMes(data).slice(0, 4))
}

export interface OpcoesPeso { anoAtual?: number; pesoRecentes?: number; anosRecentes?: number }

/** Prova recente (padrão: dos últimos 5 anos, ano ≥ anoAtual − 4) pesa pesoRecentes; as demais e as sem ano pesam 1. */
function pesador(opcoes: OpcoesPeso) {
  const anoAtual = opcoes.anoAtual ?? anoEmSaoPaulo()
  const peso = opcoes.pesoRecentes ?? CONFIG_PADRAO.pesoRecentes
  const desde = anoAtual - ((opcoes.anosRecentes ?? CONFIG_PADRAO.anosRecentes) - 1)
  return (c: CandidataNacional) => (c.ano !== null && c.ano >= desde ? peso : 1)
}

export interface Cota {
  area: string
  areaSlug: string
  /** Quantas questões a área leva na edição. */
  alvo: number
  /** Soma dos pesos das candidatas da área. */
  peso: number
  /** Parte da prova, em %, pela soma dos pesos. */
  pct: number
}

/**
 * Quantas questões cada área leva: proporcional ao peso, pelo método dos
 * maiores restos, com mínimo de 1 por área que tem candidatas e nunca mais
 * do que as candidatas da área. A soma fecha exatamente no total (se houver
 * candidatas suficientes). Ordem: da maior cota para a menor.
 */
export function cotasPorArea(candidatas: CandidataNacional[], total: number, opcoes: OpcoesPeso | number = {}): Cota[] {
  // Aceita o ano direto no terceiro argumento (primeira versão do contrato).
  const pesoDaQuestao = pesador(typeof opcoes === 'number' ? { anoAtual: opcoes } : opcoes)
  const porArea = new Map<string, { area: string; areaSlug: string; peso: number; n: number }>()
  for (const c of candidatas) {
    const a = porArea.get(c.area) ?? { area: c.area, areaSlug: c.areaSlug, peso: 0, n: 0 }
    a.peso += pesoDaQuestao(c)
    a.n++
    porArea.set(c.area, a)
  }
  const nome = (a: { area: string }, b: { area: string }) => a.area.localeCompare(b.area, 'pt-BR')
  const areas = [...porArea.values()].sort(nome)
  const somaPesos = areas.reduce((s, a) => s + a.peso, 0)
  const alvoTotal = Math.min(total, candidatas.length)
  const cotas = areas.map((a) => {
    const exata = somaPesos ? (a.peso / somaPesos) * alvoTotal : 0
    return { ...a, exata, alvo: Math.min(a.n, Math.max(1, Math.floor(exata))) }
  })
  const soma = () => cotas.reduce((s, c) => s + c.alvo, 0)
  // Faltou: sobe quem tem o maior resto (e ainda tem candidata sobrando).
  while (soma() < alvoTotal) {
    const livres = cotas.filter((c) => c.alvo < c.n)
    if (!livres.length) break
    livres.sort((a, b) => (b.exata - b.alvo) - (a.exata - a.alvo) || b.peso - a.peso || nome(a, b))
    livres[0].alvo++
  }
  // Passou (o mínimo de 1 empurrou a soma): desce quem mais passou da conta exata.
  while (soma() > alvoTotal) {
    const redutiveis = cotas.filter((c) => c.alvo > 1)
    const lista = redutiveis.length ? redutiveis : cotas.filter((c) => c.alvo > 0)
    lista.sort((a, b) => (b.alvo - b.exata) - (a.alvo - a.exata) || a.peso - b.peso || nome(a, b))
    lista[0].alvo--
  }
  return cotas
    .map(({ area, areaSlug, alvo, peso }) => ({ area, areaSlug, alvo, peso, pct: somaPesos ? (peso / somaPesos) * 100 : 0 }))
    .sort((a, b) => b.alvo - a.alvo || b.peso - a.peso || nome(a, b))
}

export interface ItemSorteado extends CandidataNacional {
  ordem: number
  /** A letra nova i mostra a alternativa original permutacao[i] (ex.: 'CADB'). */
  permutacao: string
  /** Letra nova correta: letraNova(permutacao, gabarito). */
  gabaritoNovo: string
}

/** Semente estável a partir de um texto (FNV-1a). */
function hashTexto(texto: string): number {
  let h = 2166136261
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

/** Gerador pseudoaleatório semeado (mulberry32): números em [0, 1). */
function gerador(semente: number): () => number {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function misturar<T>(lista: T[], aleatorio: () => number): T[] {
  const copia = lista.slice()
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/** Ordem embaralhada das n primeiras letras, ex.: permutar(4, s) = 'CADB'. Mesma semente, mesma ordem. */
export function permutar(n: number, semente: number): string {
  return misturar([...LETRAS.slice(0, n)], gerador(semente)).join('')
}

/** Letra do acervo que aparece na posição da letra nova. */
export function letraOriginal(permutacao: string, letraNova: string): string {
  return permutacao[LETRAS.indexOf(letraNova)]
}

/** Letra nova em que aparece a alternativa original. */
export function letraNova(permutacao: string, letraOriginal: string): string {
  return LETRAS[permutacao.indexOf(letraOriginal)]
}

/** A permutação de uma questão depende só da edição e do id: trocar outra questão não a muda. */
function itemDaEdicao(c: CandidataNacional, edicao: string, ordem: number): ItemSorteado {
  const permutacao = permutar(c.nAlternativas, hashTexto(`simulado-nacional:${edicao}:alternativas:${c.id}`))
  return { ...c, ordem, permutacao, gabaritoNovo: letraNova(permutacao, c.gabarito) }
}

export interface OpcoesSorteio extends OpcoesPeso {
  total?: number
  usadas?: Set<string>
  /** Restringe às candidatas destas provas (as sem `prova` ficam). */
  provas?: ReadonlySet<string>
  /** % de cada área nos níveis 3–4 (padrão 60). */
  nivelAltoPct?: number
  /** Cotas manuais por área: valem se somam o total e cada área tem candidatas que cheguem; senão, a conta automática. */
  cotas?: Record<string, number> | null
}

/** Aplica as cotas manuais sobre as automáticas, se forem válidas. */
function aplicarCotasManuais(cotas: Cota[], manuais: Record<string, number> | null | undefined, total: number, disponiveis: Map<string, number>): Cota[] {
  if (!manuais) return cotas
  const entradas = Object.entries(manuais)
  const valida = entradas.every(([area, n]) => Number.isInteger(n) && n >= 0 && n <= (disponiveis.get(area) ?? 0))
  if (!valida || entradas.reduce((s, [, n]) => s + n, 0) !== total) return cotas
  return cotas.map((c) => ({ ...c, alvo: manuais[c.area] ?? 0 }))
}

/**
 * Sorteia a edição. Determinístico pela edição; ~60% (nivelAltoPct) dos níveis 3–4 dentro de
 * cada área; no máximo ceil(total/3) do mesmo ano (relaxa se for impossível);
 * as `usadas` ficam de fora e só entram, por último, se faltar questão; a
 * ordem final é embaralhada e cada questão ganha a sua ordem de alternativas.
 */
export function sortearEdicao(
  candidatas: CandidataNacional[],
  edicao: string,
  opcoes: OpcoesSorteio = {},
): ItemSorteado[] {
  const total = opcoes.total ?? QUESTOES_MENSAL
  const usadas = opcoes.usadas ?? new Set<string>()
  const parteAlta = Math.min(100, Math.max(0, opcoes.nivelAltoPct ?? CONFIG_PADRAO.nivelAltoPct)) / 100
  if (opcoes.provas) {
    const provas = opcoes.provas
    candidatas = candidatas.filter((c) => c.prova === undefined || provas.has(c.prova))
  }
  const aleatorio = gerador(hashTexto(`simulado-nacional:${edicao}`))
  const disponiveis = new Map<string, number>()
  for (const c of candidatas) disponiveis.set(c.area, (disponiveis.get(c.area) ?? 0) + 1)
  const cotas = aplicarCotasManuais(cotasPorArea(candidatas, total, opcoes), opcoes.cotas, total, disponiveis)
  const tetoAno = Math.ceil(total / 3)
  const porAno = new Map<number, number>()
  const escolhidas: CandidataNacional[] = []
  const pegos = new Set<string>()

  const anoLivre = (c: CandidataNacional) => c.ano === null || (porAno.get(c.ano) ?? 0) < tetoAno
  /** Do mais exigente ao mais frouxo: nova e de ano livre → nova → usada de ano livre → qualquer. */
  const PASSES: Array<(c: CandidataNacional) => boolean> = [
    (c) => !usadas.has(c.id) && anoLivre(c),
    (c) => !usadas.has(c.id),
    (c) => anoLivre(c),
    () => true,
  ]
  /** Pega até n da lista (na ordem dela), passe a passe; devolve quantas pegou. */
  const preencher = (lista: CandidataNacional[], n: number, passes: typeof PASSES) => {
    let pegou = 0
    for (const passe of passes) {
      for (const c of lista) {
        if (pegou >= n) return pegou
        if (pegos.has(c.id) || !passe(c)) continue
        escolhidas.push(c); pegos.add(c.id); pegou++
        if (c.ano !== null) porAno.set(c.ano, (porAno.get(c.ano) ?? 0) + 1)
      }
    }
    return pegou
  }

  const daArea = new Map<string, CandidataNacional[]>()
  for (const c of candidatas) daArea.set(c.area, [...(daArea.get(c.area) ?? []), c])
  // As áreas com menos folga (menos candidatas por vaga) escolhem o ano primeiro.
  const folga = (c: Cota) => daArea.get(c.area)!.length / Math.max(1, c.alvo)
  const ordemAreas = cotas.filter((c) => c.alvo > 0).sort((a, b) => folga(a) - folga(b) || a.area.localeCompare(b.area, 'pt-BR'))
  for (const cota of ordemAreas) {
    const lista = misturar(daArea.get(cota.area)!, aleatorio)
    const altas = lista.filter((c) => c.nivel >= 3)
    const outras = lista.filter((c) => c.nivel < 3)
    const nAltas = Math.round(cota.alvo * parteAlta)
    // A divisão alta/baixa só com o que é novo e de ano livre; o que faltar vem da
    // área inteira (a faixa maior à frente), afrouxando as regras aos poucos.
    let pegou = preencher(altas, nAltas, PASSES.slice(0, 1))
    pegou += preencher(outras, cota.alvo - nAltas, PASSES.slice(0, 1))
    preencher(parteAlta >= 0.5 ? [...altas, ...outras] : [...outras, ...altas], cota.alvo - pegou, PASSES)
  }
  return misturar(escolhidas, aleatorio).map((c, i) => itemDaEdicao(c, edicao, i + 1))
}

/**
 * Substituta para a questão da `ordem`: mesma área (e mesmo foco, se houver
 * outra), fora da edição e, se der, fora de `evitar` (as já usadas ou já
 * trocadas). Determinística pela edição, pela ordem e pela questão que sai.
 * Null se a área não tem outra candidata.
 */
export function trocarItem(
  candidatas: CandidataNacional[],
  atual: ItemSorteado[],
  ordem: number,
  edicao: string,
  evitar: Set<string> = new Set(),
): ItemSorteado | null {
  const sai = atual.find((i) => i.ordem === ordem)
  if (!sai) return null
  const naEdicao = new Set(atual.map((i) => i.id))
  const livres = candidatas.filter((c) => c.area === sai.area && !naEdicao.has(c.id))
  if (!livres.length) return null
  const aleatorio = gerador(hashTexto(`simulado-nacional:${edicao}:troca:${ordem}:${sai.id}`))
  // Menor é melhor: fora de `evitar` pesa mais que o foco, que pesa mais que a faixa de nível.
  const custo = (c: CandidataNacional) =>
    (evitar.has(c.id) ? 4 : 0) + (sai.foco !== null && c.foco === sai.foco ? 0 : 2) + ((c.nivel >= 3) === (sai.nivel >= 3) ? 0 : 1)
  const escolhida = misturar(livres, aleatorio).sort((a, b) => custo(a) - custo(b))[0]
  return itemDaEdicao(escolhida, edicao, ordem)
}

/** "2026-10" do mês de uma data, no fuso de São Paulo. */
export function edicaoDoMes(data = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(data)
  return `${partes.find((p) => p.type === 'year')!.value}-${partes.find((p) => p.type === 'month')!.value}`
}

/** [ano, mês] de 'AAAA-MM' ou 'AAAA-MM-vespera-…'. */
const anoMes = (edicao: string) => edicao.slice(0, 7).split('-').map(Number) as [number, number]
const dois = (n: number) => String(n).padStart(2, '0')

/** Dia 1º do mês da edição, 00:00 em São Paulo (sem horário de verão desde 2019). */
export function inicioDoMes(edicao: string): string {
  const [ano, mes] = anoMes(edicao)
  return `${ano}-${dois(mes)}-01T00:00:00-03:00`
}

/** Último segundo do mês da edição, 23:59:59 em São Paulo. */
export function fimDoMes(edicao: string): string {
  const [ano, mes] = anoMes(edicao)
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  return `${ano}-${dois(mes)}-${dois(ultimoDia)}T23:59:59-03:00`
}

/**
 * Em que pé está a edição para esta pessoa: uma só regra para o botão, o
 * prazo e o histórico. Quem começou segue pelo próprio prazo (o do servidor),
 * mesmo que a edição feche no meio da prova.
 */
export type Situacao = 'em-breve' | 'aberta' | 'andamento' | 'tempo-esgotado' | 'entregue' | 'encerrada'
export function situacao(
  ed: { abre_em: string; fecha_em: string; minha: null | { prazo_em: string; entregue_em: string | null } },
  agora = Date.now(),
): Situacao {
  const minha = ed.minha
  if (minha?.entregue_em) return 'entregue'
  if (minha) return agora > Date.parse(minha.prazo_em) ? 'tempo-esgotado' : 'andamento'
  if (agora < Date.parse(ed.abre_em)) return 'em-breve'
  if (agora > Date.parse(ed.fecha_em)) return 'encerrada'
  return 'aberta'
}

/** Segundos inteiros que faltam até o prazo (arredonda para cima; nunca negativo). */
export function segundosRestantes(prazoEm: string, agora = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(prazoEm) - agora) / 1000))
}

/* ------------------------------------------------------------------------
 * Auxiliares de exibição: servem à página antiga e à nova.
 * ---------------------------------------------------------------------- */

/** Classificação de prontidão de um tema no simulado, comparando com a turma. */
export type Prontidao = 'pronto' | 'caminho' | 'reforcar'
export function prontidaoDoTema(certas: number, total: number, media: number | null): Prontidao {
  const p = total ? (certas / total) * 100 : 0
  if (p >= 70 && (media === null || p >= media)) return 'pronto'
  if (p < 50 || (media !== null && p < media - 15)) return 'reforcar'
  return 'caminho'
}

/** "abre em 3 dias", "encerra em 5 horas": o prazo que importa agora, ou null quando já encerrou. */
export function prazoEdicao(ed: { abre_em: string; fecha_em: string }, agora = Date.now()): string | null {
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

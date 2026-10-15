/**
 * O dia do OrtoQuestões é o dia de São Paulo (America/Sao_Paulo), qualquer que
 * seja o fuso do aparelho. É a mesma referência do servidor (limite diário,
 * ranking, sequência publicada) e do painel de receita: quem viaja ou usa o
 * celular em UTC não vê "hoje", a meta, a sequência e o cronograma virarem o
 * dia numa hora diferente da do resto do site.
 *
 * Três formas de falar de um dia, para não misturar:
 * - chave: "AAAA-MM-DD" (o dia de São Paulo), boa para comparar e guardar;
 * - instante: milissegundos do primeiro momento desse dia em São Paulo;
 * - data civil: um Date à meia-noite LOCAL com o ano, mês e dia de São Paulo,
 *   para o código de calendário que soma dias com new Date(a, m, d + 1).
 *
 * O Brasil não tem horário de verão desde 2019, mas a conta usa o banco de
 * fusos do navegador (Intl) em vez de cristalizar "UTC−3".
 */
export const FUSO_DIA = 'America/Sao_Paulo'
const DIA_MS = 86_400_000
const HORA_MS = 3_600_000

// Criar um Intl.DateTimeFormat custa caro (dezenas de microssegundos, mais no
// celular) e a chave do dia roda uma vez por resposta do histórico: um formato
// só, criado na primeira vez.
let formatoDia: Intl.DateTimeFormat | null = null
let formatoHora: Intl.DateTimeFormat | null = null

const instanteDe = (data: Date | number) => typeof data === 'number' ? data : data.getTime()

/** "AAAA-MM-DD": o dia de São Paulo em que cai o instante. */
export function chaveDoDia(data: Date | number = Date.now()): string {
  formatoDia ??= new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_DIA, year: 'numeric', month: '2-digit', day: '2-digit' })
  return formatoDia.format(instanteDe(data))
}

/** A chave de hoje em São Paulo. */
export const hojeBR = (agora: Date | number = Date.now()) => chaveDoDia(agora)

/** [ano, mês (1–12), dia] de uma chave "AAAA-MM-DD". */
export function partesDaChave(chave: string): [number, number, number] {
  const [ano, mes, dia] = chave.split('-').map(Number)
  return [ano, mes, dia]
}

/** Número sequencial do dia (dias desde 1970-01-01), para contar dias seguidos. */
export function numeroDoDia(chave: string): number {
  const [ano, mes, dia] = partesDaChave(chave)
  return Math.round(Date.UTC(ano, mes - 1, dia) / DIA_MS)
}

/** Volta do número do dia para a chave. */
export function chaveDoNumero(numero: number): string {
  return new Date(numero * DIA_MS).toISOString().slice(0, 10)
}

/** A chave `n` dias depois (ou antes, com n negativo). */
export const somarDias = (chave: string, n: number) => chaveDoNumero(numeroDoDia(chave) + n)

/** Quantos dias de `de` até `ate` (negativo se `ate` vem antes). */
export const diasEntre = (de: string, ate: string) => numeroDoDia(ate) - numeroDoDia(de)

/** Dia da semana em São Paulo (0 = domingo … 6 = sábado), de um instante ou de uma chave. */
export function diaDaSemana(data: Date | number | string = Date.now()): number {
  const chave = typeof data === 'string' ? data : chaveDoDia(data)
  const [ano, mes, dia] = partesDaChave(chave)
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
}

/** Quanto o relógio de São Paulo está à frente (ou atrás, negativo) de UTC no instante. */
function deslocamento(instante: number): number {
  formatoHora ??= new Intl.DateTimeFormat('en-US', { timeZone: FUSO_DIA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
  const partes = formatoHora.formatToParts(instante)
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value)
  const comoUtc = Date.UTC(valor('year'), valor('month') - 1, valor('day'), valor('hour'), valor('minute'), valor('second'))
  return comoUtc - Math.floor(instante / 1000) * 1000
}

const cacheInicio = new Map<string, number>()

/** Primeiro instante (ms) do dia `chave` em São Paulo. */
export function inicioDaChave(chave: string): number {
  const guardado = cacheInicio.get(chave)
  if (guardado !== undefined) return guardado
  const [ano, mes, dia] = partesDaChave(chave)
  const meiaNoiteUtc = Date.UTC(ano, mes - 1, dia)
  let inicio = meiaNoiteUtc - deslocamento(meiaNoiteUtc)
  // Dia em que o relógio pulou a meia-noite (horário de verão antigo): o
  // primeiro instante é uma hora depois; e nunca começa antes da chave.
  for (let i = 0; i < 3 && chaveDoDia(inicio) < chave; i++) inicio += HORA_MS
  for (let i = 0; i < 3 && chaveDoDia(inicio - HORA_MS) === chave; i++) inicio -= HORA_MS
  if (cacheInicio.size > 4000) cacheInicio.clear()
  cacheInicio.set(chave, inicio)
  return inicio
}

/** Primeiro instante (ms) do dia de São Paulo em que cai `data`. */
export const inicioDoDia = (data: Date | number = Date.now()) => inicioDaChave(chaveDoDia(data))

/** Primeiro instante (ms) do dia seguinte ao de `data`, em São Paulo. */
export const inicioDoDiaSeguinte = (data: Date | number = Date.now()) => inicioDaChave(somarDias(chaveDoDia(data), 1))

/** Milissegundos até a próxima meia-noite de São Paulo. */
export const msAteAmanha = (agora: number = Date.now()) => inicioDoDiaSeguinte(agora) - agora

/**
 * Data civil: um Date à meia-noite local com o ano, o mês e o dia de São Paulo
 * em que cai o instante (ou da chave). Para o código de calendário que trabalha
 * com getFullYear/getMonth/getDate/getDay e soma dias com new Date(a, m, d + n).
 */
export function diaCivil(data: Date | number | string = Date.now()): Date {
  const [ano, mes, dia] = partesDaChave(typeof data === 'string' ? data : chaveDoDia(data))
  return new Date(ano, mes - 1, dia)
}

/** "AAAA-MM-DD" de uma data civil (lida pelos campos locais, sem converter fuso). */
export function chaveCivil(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

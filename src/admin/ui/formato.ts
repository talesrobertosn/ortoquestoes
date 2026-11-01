/** Formatação única do painel 3.0: moeda em BRL, datas no fuso de São Paulo, números com milhar. */
const FUSO = 'America/Sao_Paulo'

export const inteiro = (v: number | null | undefined) => v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
export const reais = (v: number | null | undefined) => v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const reaisCurto = (v: number) => Math.abs(v) >= 10_000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : reais(v)
export const pct = (v: number | null | undefined, casas = 0) => v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`
/** Parte de um todo, em %, ou null quando o todo é zero (nunca divide por zero). */
export const parte = (n: number, total: number) => total > 0 ? Math.round((n / total) * 1000) / 10 : null

const dia = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' })
const diaCurto = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' })
const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' })
const diaSemana = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'short', day: '2-digit', month: 'short' })
const chaveDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })

const valida = (d: string | number | Date | null | undefined) => {
  if (d === null || d === undefined || d === '') return null
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? null : x
}
export const data = (d: string | number | Date | null | undefined) => { const x = valida(d); return x ? dia.format(x) : '—' }
export const dataCurta = (d: string | number | Date | null | undefined) => { const x = valida(d); return x ? diaCurto.format(x) : '—' }
export const horario = (d: string | number | Date | null | undefined) => { const x = valida(d); return x ? hora.format(x) : '—' }
export const dataHora = (d: string | number | Date | null | undefined) => { const x = valida(d); return x ? `${dia.format(x)} ${hora.format(x)}` : '—' }
export const dataSemana = (d: string | number | Date | null | undefined) => { const x = valida(d); return x ? diaSemana.format(x) : '—' }
/** "AAAA-MM-DD" no dia de São Paulo. */
export const chaveDoDia = (d: string | number | Date) => chaveDia.format(new Date(d))
/** Rótulo de um dia vindo do servidor como "AAAA-MM-DD" (meio-dia evita virar o dia por fuso). */
export const diaDaSerie = (iso: string, longo = false) => (longo ? diaSemana : diaCurto).format(new Date(`${iso.slice(0, 10)}T12:00:00-03:00`))

/** "há 3 min", "há 2 h", "há 5 dias", "agora". */
export function haQuanto(d: string | number | Date | null | undefined, agora = Date.now()) {
  const x = valida(d)
  if (!x) return '—'
  const s = Math.max(0, Math.round((agora - x.getTime()) / 1000))
  if (s < 45) return 'agora'
  if (s < 3600) return `há ${Math.round(s / 60)} min`
  if (s < 86_400) return `há ${Math.round(s / 3600)} h`
  const dias = Math.round(s / 86_400)
  return dias === 1 ? 'ontem' : dias < 60 ? `há ${dias} dias` : `há ${Math.round(dias / 30)} meses`
}

export const iniciais = (nome: string | null | undefined, reserva = '?') => {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return reserva
  return ((partes[0][0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

/** Tira acentos e caixa, para busca. */
export const normalizar = (t: string | null | undefined) => (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const combina = (campos: Array<string | null | undefined>, termo: string) => !termo || campos.some(c => normalizar(c).includes(termo))

import { DIA, MES, somarMesChave, type Cobranca } from './receita'

/**
 * Ganhos para acompanhar de relance (Financeiro › Ganhos, 17/10/2026): quanto entrou hoje, nos
 * últimos 7 dias, no mês, no ano e desde o começo, cada um com a base justa de comparação, e a
 * receita dia a dia do último mês. Tudo sai das mesmas cobranças do resto do Financeiro
 * (`cobrancas(assinaturas, reais)`), em dias e meses de Brasília; nenhuma consulta nova.
 */
export interface Soma { valor: number; quantidade: number }
export interface DiaGanho { dia: string; cartao: number; pix: number }

const DIA_MS = 86_400_000
const vazio = (): Soma => ({ valor: 0, quantidade: 0 })
const somar = (s: Soma, c: Cobranca) => { s.valor += c.valor; s.quantidade++ }

export function calcularGanhos(todas: Cobranca[], agora = new Date(), diasNaSerie = 30) {
  const ms = agora.getTime()
  const hoje = DIA(agora), ontem = DIA(new Date(ms - DIA_MS))
  const ultimos7 = new Set(Array.from({ length: 7 }, (_, i) => DIA(new Date(ms - i * DIA_MS))))
  const anteriores7 = new Set(Array.from({ length: 7 }, (_, i) => DIA(new Date(ms - (i + 7) * DIA_MS))))
  const esteMes = MES(agora), mesPassado = somarMesChave(esteMes, -1), ano = esteMes.slice(0, 4)
  const diaDoMes = Number(hoje.slice(8, 10))
  const serie = new Map<string, DiaGanho>()
  for (let i = diasNaSerie - 1; i >= 0; i--) { const d = DIA(new Date(ms - i * DIA_MS)); serie.set(d, { dia: d, cartao: 0, pix: 0 }) }

  const r = {
    hoje: vazio(), ontem: vazio(), semana: vazio(), semanaAnterior: vazio(),
    mes: vazio(), mesPassadoAteHoje: vazio(), mesPassado: vazio(), ano: vazio(), total: vazio(),
  }
  for (const c of todas) {
    if (c.em.getTime() > ms) continue
    const dia = DIA(c.em), mes = dia.slice(0, 7)
    somar(r.total, c)
    if (dia === hoje) somar(r.hoje, c)
    if (dia === ontem) somar(r.ontem, c)
    if (ultimos7.has(dia)) somar(r.semana, c)
    if (anteriores7.has(dia)) somar(r.semanaAnterior, c)
    if (mes === esteMes) somar(r.mes, c)
    if (mes === mesPassado) { somar(r.mesPassado, c); if (Number(dia.slice(8, 10)) <= diaDoMes) somar(r.mesPassadoAteHoje, c) }
    if (dia.startsWith(ano)) somar(r.ano, c)
    const s = serie.get(dia)
    if (s) s[c.meio === 'pix' ? 'pix' : 'cartao'] += c.valor
  }
  return { ...r, chaveMes: esteMes, chaveMesPassado: mesPassado, chaveAno: ano, diaDoMes, porDia: [...serie.values()] }
}
export type Ganhos = ReturnType<typeof calcularGanhos>

/**
 * Previsão de fechamento do mês: o que já entrou + as renovações do cartão que ainda caem neste mês
 * + a recompra estimada do Pix neste mês. `cartaoPorMes` e `pixPorMes` são os `porMes` de
 * aReceberNoCartao e aReceberNoPix (a partir de hoje).
 */
export function fechamentoDoMes(recebido: number, chaveMes: string,
  cartaoPorMes: Array<[string, { valor: number; quantidade: number }]>, pixPorMes: Array<[string, { valor: number; quantidade: number }]>) {
  const cartao = cartaoPorMes.find(([k]) => k === chaveMes)?.[1] ?? { valor: 0, quantidade: 0 }
  const pix = pixPorMes.find(([k]) => k === chaveMes)?.[1] ?? { valor: 0, quantidade: 0 }
  return { recebido, cartao, pix, total: recebido + cartao.valor + pix.valor }
}

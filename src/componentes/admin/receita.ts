import { PLANOS as PRECOS } from '../../dados/planos'

/**
 * Receita reconstruída a partir das assinaturas, com o que o painel precisa
 * para ser fiel ao extrato: separa compra por Pix (avulsa, nunca renova) de
 * cartão (renovação automática), a primeira cobrança das renovações, e
 * cancelamento (a pessoa desligou a renovação) de reembolso e de Pix que
 * simplesmente terminou. Estimativa: o extrato oficial é o do Mercado Pago.
 */

export interface AssinaturaBase {
  id_usuario: string
  plano: string
  status: string
  criada_em?: string | null
  inicio_periodo?: string | null
  fim_periodo?: string | null
  ultima_cobranca_em?: string | null
  cancelar_ao_fim?: boolean
  cancelada_em?: string | null
  ultima_atualizacao?: string | null
  /** 'pix' ou 'cartao' (migração 202610060100 em diante). */
  meio?: string | null
  /** E-mail e nome, quando a lista vem do painel (para conferir uma a uma). */
  usuario?: string | null
  nome?: string | null
}

export type Meio = 'pix' | 'cartao'
export interface Cobranca { em: Date; valor: number; plano: string; id_usuario: string; estimada: boolean; tipo: 'nova' | 'renovacao'; meio: Meio }

export const MES = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
export const NOME_MES = (chave: string, curto = false) => new Date(`${chave}-15T12:00:00`).toLocaleDateString('pt-BR', curto ? { month: 'short' } : { month: 'long', year: 'numeric' })
export const precoDe = (plano: string) => PRECOS.find(p => p.id === plano)
export const somarMeses = (d: Date, meses: number) => { const n = new Date(d); n.setMonth(n.getMonth() + meses); return n }

/**
 * Pix ou cartão. Sem a coluna do banco, deduz: o Pix é gravado já "sem renovar"
 * e sem data de cancelamento, enquanto o cartão só fica assim quando a pessoa
 * cancela (e aí a data é gravada) ou quando o Mercado Pago encerra (status cancelada).
 */
export function meioDe(a: AssinaturaBase): Meio {
  if (a.meio === 'pix' || a.meio === 'cartao') return a.meio
  return a.cancelar_ao_fim && !a.cancelada_em && (a.status === 'ativa' || a.status === 'vencida') ? 'pix' : 'cartao'
}

/** Assinatura que dá acesso agora (em dia, ou cancelada que ainda vale até o fim do período). */
export const vigente = (a: AssinaturaBase, agora = Date.now()) =>
  (a.status === 'ativa' || (a.status === 'cancelada' && !!a.cancelar_ao_fim)) && (!a.fim_periodo || new Date(a.fim_periodo).getTime() > agora)
/** Cartão que vai renovar sozinho. */
export const renovaSozinha = (a: AssinaturaBase) => meioDe(a) === 'cartao' && a.status === 'ativa' && !a.cancelar_ao_fim

/**
 * Cartões com acesso agora que vão renovar sozinhos, com o valor do plano (o que será cobrado na
 * renovação) e o equivalente por mês (anual dividido por 12, semestral por 6), da próxima
 * renovação para a mais distante.
 */
export function recorrentesNoCartao(assinaturas: AssinaturaBase[], agora = Date.now()) {
  return assinaturas
    .filter(a => vigente(a, agora) && renovaSozinha(a))
    .map(a => { const p = precoDe(a.plano); return { assinatura: a, plano: p?.nome ?? a.plano, valor: p?.total ?? 0, mensal: p ? p.total / p.meses : 0, proxima: a.fim_periodo ?? null } })
    .sort((x, y) => (x.proxima ?? '').localeCompare(y.proxima ?? ''))
}

/** Data em que a pessoa (ou o Mercado Pago) desligou a renovação de um cartão; null se não desligou. */
export function dataCancelamento(a: AssinaturaBase): Date | null {
  if (meioDe(a) === 'pix' || a.status === 'reembolsada') return null
  if (a.cancelada_em) return new Date(a.cancelada_em)
  if (a.status === 'cancelada') return new Date(a.ultima_atualizacao ?? a.fim_periodo ?? a.criada_em ?? Date.now())
  return null
}
/** No reembolso, o fim do período é gravado como o momento do reembolso. */
export const dataReembolso = (a: AssinaturaBase) => a.status === 'reembolsada' ? new Date(a.fim_periodo ?? a.cancelada_em ?? a.ultima_atualizacao ?? Date.now()) : null

/**
 * Paga, mas sem a cobrança gravada (o aviso do Mercado Pago não chegou ou não
 * foi processado). No cartão, a assinatura só fica ativa depois de a primeira
 * cobrança ser aprovada.
 */
export function pagaSemCobranca(a: AssinaturaBase) {
  if (a.ultima_cobranca_em || !precoDe(a.plano)) return false
  if (a.status === 'ativa' || a.status === 'pausada' || a.status === 'vencida') return true
  if (a.status === 'cancelada' && a.fim_periodo && (a.inicio_periodo ?? a.criada_em)) {
    const dias = (new Date(a.fim_periodo).getTime() - new Date((a.inicio_periodo ?? a.criada_em)!).getTime()) / 86_400_000
    return dias >= 25
  }
  return false
}

/**
 * Cobranças: a última paga e, para trás, uma a cada período do plano até a
 * criação da assinatura (a mais antiga é a "nova", as demais são renovações).
 * Pix é sempre uma cobrança só. Reembolso tira a última. Paga sem cobrança
 * gravada entra com uma cobrança estimada no início.
 */
export function cobrancas(assinaturas: AssinaturaBase[]): Cobranca[] {
  const lista: Cobranca[] = []
  for (const a of assinaturas) {
    const preco = precoDe(a.plano)
    if (!preco) continue
    const meio = meioDe(a)
    if (!a.ultima_cobranca_em) {
      if (pagaSemCobranca(a)) lista.push({ em: new Date(a.inicio_periodo ?? a.criada_em ?? a.ultima_atualizacao ?? Date.now()), valor: preco.total, plano: a.plano, id_usuario: a.id_usuario, estimada: true, tipo: 'nova', meio })
      continue
    }
    const datas: Date[] = []
    if (meio === 'pix') datas.push(new Date(a.ultima_cobranca_em))
    else {
      const inicio = new Date(a.criada_em ?? a.inicio_periodo ?? a.ultima_cobranca_em).getTime() - 3 * 86_400_000
      for (let d = new Date(a.ultima_cobranca_em); d.getTime() >= inicio && datas.length < 120; d = somarMeses(d, -preco.meses)) datas.push(d)
    }
    if (a.status === 'reembolsada') datas.shift()
    datas.reverse()
    datas.forEach((em, i) => lista.push({ em, valor: preco.total, plano: a.plano, id_usuario: a.id_usuario, estimada: false, tipo: i === 0 ? 'nova' : 'renovacao', meio }))
  }
  return lista.sort((x, y) => x.em.getTime() - y.em.getTime())
}

export interface Mes {
  chave: string
  receita: number
  novasCartao: number
  novasPix: number
  receitaNovas: number
  renovacoes: number
  receitaRenovacoes: number
  cancelamentos: number
  reembolsos: number
  valorReembolsado: number
  pixEncerrados: number
  /** Cartões renovando sozinhos no fim do mês (base para o churn). */
  baseCartao: number
}

/** Mês a mês, dos últimos `meses` meses até o atual. */
export function mesAMes(assinaturas: AssinaturaBase[], meses = 12): Mes[] {
  const agora = new Date()
  const lista = cobrancas(assinaturas)
  const mapa = new Map<string, Mes>()
  for (let i = meses - 1; i >= 0; i--) {
    const chave = MES(somarMeses(agora, -i))
    mapa.set(chave, { chave, receita: 0, novasCartao: 0, novasPix: 0, receitaNovas: 0, renovacoes: 0, receitaRenovacoes: 0, cancelamentos: 0, reembolsos: 0, valorReembolsado: 0, pixEncerrados: 0, baseCartao: 0 })
  }
  for (const c of lista) {
    const m = mapa.get(MES(c.em)); if (!m) continue
    m.receita += c.valor
    if (c.tipo === 'nova') { m.receitaNovas += c.valor; if (c.meio === 'pix') m.novasPix++; else m.novasCartao++ }
    else { m.renovacoes++; m.receitaRenovacoes += c.valor }
  }
  for (const a of assinaturas) {
    const cancelada = dataCancelamento(a)
    if (cancelada) { const m = mapa.get(MES(cancelada)); if (m) m.cancelamentos++ }
    const reembolso = dataReembolso(a)
    if (reembolso) { const m = mapa.get(MES(reembolso)); if (m) { m.reembolsos++; m.valorReembolsado += precoDe(a.plano)?.total ?? 0 } }
    if (meioDe(a) === 'pix' && a.status !== 'reembolsada' && a.fim_periodo && new Date(a.fim_periodo) <= agora) { const m = mapa.get(MES(new Date(a.fim_periodo))); if (m) m.pixEncerrados++ }
  }
  // Base de cartões ativos no fim de cada mês: criada antes do fim do mês e sem cancelamento/reembolso até lá.
  for (const m of mapa.values()) {
    const [ano, mes] = m.chave.split('-').map(Number)
    const fim = new Date(ano, mes, 1).getTime()
    m.baseCartao = assinaturas.filter(a => {
      if (meioDe(a) !== 'cartao' || !(a.ultima_cobranca_em || pagaSemCobranca(a))) return false
      const inicio = new Date(a.criada_em ?? a.inicio_periodo ?? a.ultima_cobranca_em ?? 0).getTime()
      const saiu = dataCancelamento(a) ?? dataReembolso(a) ?? (a.status === 'vencida' || a.status === 'falha_pagamento' ? new Date(a.fim_periodo ?? a.ultima_atualizacao ?? 0) : null)
      return inicio < fim && (!saiu || saiu.getTime() >= fim)
    }).length
  }
  return [...mapa.values()]
}

/**
 * Quanto as renovações automáticas do cartão trazem de hoje até daqui a `meses` meses, supondo que
 * ninguém cancele: cada assinatura cobra o valor do plano na próxima renovação e, depois, a cada
 * período do plano (o mensal cobra todo mês, o anual só uma vez em 12 meses). Pix não entra.
 */
export function aReceberNoCartao(assinaturas: AssinaturaBase[], meses: number, agora = new Date()) {
  const limite = somarMeses(agora, meses)
  let valor = 0, cobrancas = 0
  // Mês a mês dentro da mesma janela (o mês de hoje até o mês do limite), para o gráfico somar igual.
  const porMes = new Map<string, { valor: number; quantidade: number }>()
  for (let d = new Date(agora.getFullYear(), agora.getMonth(), 1); d < limite; d = somarMeses(d, 1)) porMes.set(MES(d), { valor: 0, quantidade: 0 })
  for (const a of assinaturas) {
    const preco = precoDe(a.plano)
    if (!preco || !vigente(a, agora.getTime()) || !renovaSozinha(a) || !a.fim_periodo) continue
    for (let d = new Date(a.fim_periodo); d < limite; d = somarMeses(d, preco.meses)) {
      if (d < agora) continue
      valor += preco.total; cobrancas++
      const m = porMes.get(MES(d)); if (m) { m.valor += preco.total; m.quantidade++ }
    }
  }
  return { valor, cobrancas, porMes: [...porMes] }
}

/** Quando a pessoa comprou (para achar a recompra de quem pagou Pix). */
const compradaEm = (a: AssinaturaBase) => new Date(a.criada_em ?? a.inicio_periodo ?? a.ultima_cobranca_em ?? 0).getTime()

/**
 * Quantos Pix já terminados foram renovados: a mesma pessoa pagou de novo (Pix ou cartão, qualquer
 * plano) depois da compra e até `folgaDias` dias depois do fim do acesso. Só conta o Pix cujo prazo
 * para decidir já passou (fim + folga antes de hoje); os que ainda podem renovar ficam de fora para
 * não puxar a taxa para baixo.
 */
export function renovacaoDoPix(assinaturas: AssinaturaBase[], agora = new Date(), folgaDias = 30) {
  const folga = folgaDias * 86_400_000
  const pagas = assinaturas.filter(a => a.status !== 'reembolsada' && (a.ultima_cobranca_em || pagaSemCobranca(a)))
  let encerrados = 0, renovados = 0
  for (const a of pagas) {
    if (meioDe(a) !== 'pix' || !a.fim_periodo) continue
    const fim = new Date(a.fim_periodo).getTime()
    if (fim + folga > agora.getTime()) continue
    encerrados++
    const inicio = compradaEm(a)
    if (pagas.some(b => b !== a && b.id_usuario === a.id_usuario && compradaEm(b) > inicio && compradaEm(b) <= fim + folga)) renovados++
  }
  return { encerrados, renovados, taxa: encerrados ? renovados / encerrados : null }
}

/**
 * Estimativa do que o Pix traz de hoje até daqui a `meses` meses se uma fração `taxa` (0 a 1) de
 * quem pagou Pix comprar de novo o mesmo plano quando o acesso acabar. Cada pessoa entra uma vez,
 * pelo Pix com acesso que termina por último (quem já recomprou não conta em dobro), e fica de fora
 * quem também tem cartão renovando sozinho. A segunda recompra vale taxa², a terceira taxa³, e assim
 * por diante (para renovar de novo, a pessoa precisa ter renovado antes). `renovacoes` é o número
 * esperado de recompras, fracionário.
 */
export function aReceberNoPix(assinaturas: AssinaturaBase[], meses: number, taxa: number, agora = new Date()) {
  const limite = somarMeses(agora, meses), ms = agora.getTime()
  const p = Math.max(0, Math.min(1, taxa))
  const porMes = new Map<string, { valor: number; quantidade: number }>()
  for (let d = new Date(agora.getFullYear(), agora.getMonth(), 1); d < limite; d = somarMeses(d, 1)) porMes.set(MES(d), { valor: 0, quantidade: 0 })
  const comCartao = new Set(assinaturas.filter(a => vigente(a, ms) && renovaSozinha(a)).map(a => a.id_usuario))
  const ultimo = new Map<string, AssinaturaBase>()
  for (const a of assinaturas) {
    if (meioDe(a) !== 'pix' || a.status === 'reembolsada' || !a.fim_periodo || !precoDe(a.plano) || !vigente(a, ms) || comCartao.has(a.id_usuario)) continue
    const atual = ultimo.get(a.id_usuario)
    if (!atual || new Date(a.fim_periodo) > new Date(atual.fim_periodo!)) ultimo.set(a.id_usuario, a)
  }
  let valor = 0, renovacoes = 0, pessoas = 0
  for (const a of ultimo.values()) {
    const preco = precoDe(a.plano)!
    let chance = p, conta = false
    for (let d = new Date(a.fim_periodo!); d < limite; d = somarMeses(d, preco.meses), chance *= p) {
      if (d < agora) continue
      conta = true
      valor += preco.total * chance; renovacoes += chance
      const m = porMes.get(MES(d)); if (m) { m.valor += preco.total * chance; m.quantidade += chance }
    }
    if (conta) pessoas++
  }
  return { valor, renovacoes, pessoas, porMes: [...porMes] }
}

/** Próximas renovações automáticas, mês a mês, supondo que ninguém cancele. */
export function previsao(assinaturas: AssinaturaBase[], meses: number) {
  const agora = new Date(), limite = somarMeses(agora, meses)
  const porMes = new Map<string, { valor: number; quantidade: number }>()
  for (let i = 0; i < meses; i++) porMes.set(MES(somarMeses(agora, i)), { valor: 0, quantidade: 0 })
  for (const a of assinaturas) {
    const preco = precoDe(a.plano)
    if (!preco || !renovaSozinha(a) || !a.fim_periodo) continue
    for (let d = new Date(a.fim_periodo); d < limite; d = somarMeses(d, preco.meses)) {
      if (d < agora) continue
      const atual = porMes.get(MES(d))
      if (atual) { atual.valor += preco.total; atual.quantidade++ }
    }
  }
  return [...porMes]
}

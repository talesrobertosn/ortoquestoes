import { PLANOS as PRECOS } from '../../dados/planos'

/**
 * Receita reconstruída a partir das assinaturas, com o que o painel precisa
 * para ser fiel ao extrato: separa compra por Pix (avulsa, nunca renova) de
 * cartão (renovação automática), a primeira cobrança das renovações, e
 * cancelamento (a pessoa desligou a renovação) de reembolso e de Pix que
 * simplesmente terminou. Estimativa: o extrato oficial é o do Mercado Pago.
 *
 * Com a RPC cobrancas_admin (parte 23), o Pix passa a usar o valor e a data
 * que o banco gravou ao confirmar o pagamento, e o cartão o valor contratado no
 * checkout; renovações antigas do cartão continuam reconstruídas (o banco só
 * guarda a última cobrança de cada assinatura) e saem marcadas como estimadas.
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
export interface Cobranca {
  em: Date; valor: number; plano: string; id_usuario: string
  /** Data ou valor deduzidos (renovação antiga reconstruída, ou paga sem a cobrança gravada). */
  estimada: boolean
  tipo: 'nova' | 'renovacao'; meio: Meio
  /** Número do pagamento no Mercado Pago, quando o banco guarda. */
  id_pagamento?: string | null
}

/**
 * Cobrança gravada no banco, como a RPC cobrancas_admin devolve: no Pix, cada
 * pedido pago (valor confirmado pelo Mercado Pago); no cartão, a última
 * cobrança aprovada de cada assinatura, com o valor contratado no checkout.
 */
export interface CobrancaReal {
  id_usuario: string
  plano: string
  meio: string
  valor: number | string | null
  em: string
  id_pagamento: string | null
  /** 'paga' ou 'reembolsada'. */
  situacao: string
  usuario?: string | null
  nome?: string | null
  id_assinatura?: string | null
}

/**
 * Fuso único da receita: cada cobrança cai no dia e no mês de Brasília, qualquer
 * que seja o fuso do navegador (o resto do painel já conta assim). O Brasil não
 * tem horário de verão desde 2019, então Brasília é UTC−3 o ano inteiro.
 */
const FUSO_MS = 3 * 3_600_000
/** Os campos UTC do Date devolvido são a data e a hora no relógio de Brasília. */
const relogioSP = (d: Date) => new Date(d.getTime() - FUSO_MS)
/** "2026-10": o mês da data em Brasília. */
export const MES = (d: Date) => { const s = relogioSP(d); return `${s.getUTCFullYear()}-${String(s.getUTCMonth() + 1).padStart(2, '0')}` }
/** "2026-10-15": o dia da data em Brasília. */
export const DIA = (d: Date) => relogioSP(d).toISOString().slice(0, 10)
/** O mês `chave` andando `n` meses ("2026-01" e −1 dão "2025-12"). */
export function somarMesChave(chave: string, n: number) {
  const [ano, mes] = chave.split('-').map(Number)
  const total = ano * 12 + (mes - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}
/** Primeiro instante do mês `chave` em Brasília. */
export const inicioDoMes = (chave: string) => { const [ano, mes] = chave.split('-').map(Number); return new Date(Date.UTC(ano, mes - 1, 1) + FUSO_MS) }
/** Meses (chaves) com algum instante em [de, ate): do mês de `de` ao mês de `ate`. */
export function mesesEntre(de: Date, ate: Date) {
  const lista: string[] = []
  for (let k = MES(de); inicioDoMes(k) < ate && lista.length < 600; k = somarMesChave(k, 1)) lista.push(k)
  return lista
}
export const NOME_MES = (chave: string, curto = false) => new Date(`${chave}-15T12:00:00`).toLocaleDateString('pt-BR', curto ? { month: 'short', timeZone: 'America/Sao_Paulo' } : { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
export const precoDe = (plano: string) => PRECOS.find(p => p.id === plano)
/**
 * A mesma data `meses` meses depois (ou antes), no relógio de Brasília, travando
 * no último dia quando o mês de destino é mais curto: 31/01 + 1 mês = 28/02
 * (29/02 no bissexto), e não 03/03. Numa série (renovação a renovação), conte
 * sempre da mesma âncora (âncora + k períodos), senão o dia encolhe de vez
 * depois do primeiro fevereiro.
 */
export function somarMeses(d: Date, meses: number) {
  const s = relogioSP(d)
  const dia = s.getUTCDate()
  s.setUTCDate(1)
  s.setUTCMonth(s.getUTCMonth() + meses)
  const ultimo = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 0)).getUTCDate()
  s.setUTCDate(Math.min(dia, ultimo))
  return new Date(s.getTime() + FUSO_MS)
}

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
 * cobrança ser aprovada (pausada também já passou por ativa). "Vencida" sem
 * cobrança não conta: é o que o webhook grava quando o pagamento expira, e
 * assinatura que nunca pagou não pode entrar na receita.
 */
export function pagaSemCobranca(a: AssinaturaBase) {
  if (a.ultima_cobranca_em || !precoDe(a.plano)) return false
  if (a.status === 'ativa' || a.status === 'pausada') return true
  if (a.status === 'cancelada' && a.fim_periodo && (a.inicio_periodo ?? a.criada_em)) {
    const dias = (new Date(a.fim_periodo).getTime() - new Date((a.inicio_periodo ?? a.criada_em)!).getTime()) / 86_400_000
    return dias >= 25
  }
  return false
}

/** Valor gravado (o PostgREST manda numeric como número; texto também serve); null se faltar. */
const valorDe = (v: number | string | null | undefined) => {
  const n = v === null || v === undefined || v === '' ? NaN : Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Cobranças: a última paga e, para trás, uma a cada período do plano até a
 * criação da assinatura (a mais antiga é a "nova", as demais são renovações).
 * Pix é sempre uma cobrança só. Reembolso tira a última. Paga sem cobrança
 * gravada entra com uma cobrança estimada no início.
 *
 * Com `reais` (RPC cobrancas_admin), o Pix sai dos pedidos pagos, com o valor e
 * a data gravados (reembolsado não entra), e o cartão usa o valor contratado.
 * Só entram pessoas presentes em `assinaturas` (quem tira contas de teste de lá
 * tira daqui também). Sem `reais`, tudo pelo preço atual do plano.
 */
export function cobrancas(assinaturas: AssinaturaBase[], reais?: CobrancaReal[] | null): Cobranca[] {
  const lista: Cobranca[] = []
  const quem = new Set(assinaturas.map(a => a.id_usuario))
  const ultimaNoCartao = new Map<string, CobrancaReal>()
  const chaveCartao = (id: string, em: string) => `${id}|${new Date(em).getTime()}`
  for (const r of reais ?? []) {
    if (!quem.has(r.id_usuario) || !r.em) continue
    if (r.meio !== 'pix') { ultimaNoCartao.set(chaveCartao(r.id_usuario, r.em), r); continue }
    const gravado = valorDe(r.valor)
    const valor = gravado ?? precoDe(r.plano)?.total
    if (r.situacao !== 'paga' || !valor) continue
    lista.push({ em: new Date(r.em), valor, plano: r.plano, id_usuario: r.id_usuario, estimada: gravado === null, tipo: 'nova', meio: 'pix', id_pagamento: r.id_pagamento })
  }
  for (const a of assinaturas) {
    const preco = precoDe(a.plano)
    if (!preco) continue
    const meio = meioDe(a)
    if (meio === 'pix' && reais) continue
    if (!a.ultima_cobranca_em) {
      if (pagaSemCobranca(a)) lista.push({ em: new Date(a.inicio_periodo ?? a.criada_em ?? a.ultima_atualizacao ?? Date.now()), valor: preco.total, plano: a.plano, id_usuario: a.id_usuario, estimada: true, tipo: 'nova', meio })
      continue
    }
    const real = meio === 'cartao' ? ultimaNoCartao.get(chaveCartao(a.id_usuario, a.ultima_cobranca_em)) : undefined
    const valor = valorDe(real?.valor) ?? preco.total
    // A última cobrança é a gravada; as anteriores do cartão são reconstruídas, contando da mesma âncora.
    const ultima = new Date(a.ultima_cobranca_em)
    const datas: Array<{ em: Date; gravada: boolean }> = [{ em: ultima, gravada: true }]
    if (meio === 'cartao') {
      const inicio = new Date(a.criada_em ?? a.inicio_periodo ?? a.ultima_cobranca_em).getTime() - 3 * 86_400_000
      for (let k = 1; k < 120; k++) {
        const d = somarMeses(ultima, -k * preco.meses)
        if (d.getTime() < inicio) break
        datas.push({ em: d, gravada: false })
      }
    }
    if (a.status === 'reembolsada') datas.shift()
    datas.reverse()
    datas.forEach(({ em, gravada }, i) => lista.push({
      em, valor, plano: a.plano, id_usuario: a.id_usuario, estimada: !gravada, tipo: i === 0 ? 'nova' : 'renovacao', meio,
      id_pagamento: gravada ? real?.id_pagamento ?? null : null,
    }))
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

/** Mês a mês (meses de Brasília), dos últimos `meses` meses até o atual. */
export function mesAMes(assinaturas: AssinaturaBase[], meses = 12, agora = new Date(), reais?: CobrancaReal[] | null): Mes[] {
  const lista = cobrancas(assinaturas, reais)
  const mapa = new Map<string, Mes>()
  const atual = MES(agora)
  for (let i = meses - 1; i >= 0; i--) {
    const chave = somarMesChave(atual, -i)
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
    const fim = inicioDoMes(somarMesChave(m.chave, 1)).getTime()
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
  const porMes = new Map<string, { valor: number; quantidade: number }>(mesesEntre(agora, limite).map(k => [k, { valor: 0, quantidade: 0 }]))
  for (const a of assinaturas) {
    const preco = precoDe(a.plano)
    if (!preco || !vigente(a, agora.getTime()) || !renovaSozinha(a) || !a.fim_periodo) continue
    const ancora = new Date(a.fim_periodo)
    for (let k = 0, d = ancora; d < limite && k < 600; k++, d = somarMeses(ancora, k * preco.meses)) {
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
  const porMes = new Map<string, { valor: number; quantidade: number }>(mesesEntre(agora, limite).map(k => [k, { valor: 0, quantidade: 0 }]))
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
    const ancora = new Date(a.fim_periodo!)
    for (let k = 0, d = ancora; d < limite && k < 600; k++, d = somarMeses(ancora, k * preco.meses), chance *= p) {
      if (d < agora) continue
      conta = true
      valor += preco.total * chance; renovacoes += chance
      const m = porMes.get(MES(d)); if (m) { m.valor += preco.total * chance; m.quantidade += chance }
    }
    if (conta) pessoas++
  }
  return { valor, renovacoes, pessoas, porMes: [...porMes] }
}

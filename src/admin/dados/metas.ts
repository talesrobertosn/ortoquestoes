import { MES, inicioDoMes, meioDe, precoDe, renovaSozinha, somarMesChave, somarMeses, vigentesPorPessoa, type AssinaturaBase, type Cobranca } from '../../componentes/admin/receita'

/**
 * Metas do OrtoQuestões (Tales, 05/11/2026). A meta oficial é o CENÁRIO MODERADO: um planejamento, não uma
 * previsão garantida. A tabela abaixo é a versão fixa e identificável (`moderado-2026-11`); resultados reais
 * nunca a alteram. Metas futuras editadas pelo painel ficam numa camada à parte ("vigente", tabela
 * metas_comerciais no Supabase) e a versão original continua visível para comparação.
 */

export interface MetaMes {
  /** "2026-11" */
  mes: string
  cadastros: number
  novosPagantes: number
  /** Pagantes com acesso pago no fim do mês. */
  ativosFim: number
  /** Soma do valor mensalizado das assinaturas pagas com acesso ativo no fim do mês. */
  receitaEquivalente: number
  /** Pagamentos confirmados no mês (caixa). */
  faturamento: number
}

export interface VersaoMetas { id: string; nome: string; registradaEm: string; meses: MetaMes[] }

const m = (mes: string, cadastros: number, novosPagantes: number, ativosFim: number, receitaEquivalente: number, faturamento: number): MetaMes =>
  ({ mes, cadastros, novosPagantes, ativosFim, receitaEquivalente, faturamento })

export const META_MODERADA: VersaoMetas = {
  id: 'moderado-2026-11',
  nome: 'Cenário moderado · novembro de 2026',
  registradaEm: '2026-11-05',
  meses: [
    m('2026-11', 102, 22, 58, 1882, 2899),
    m('2026-12', 96, 21, 65, 2107, 3082),
    m('2027-01', 90, 20, 71, 2314, 2999),
    m('2027-02', 85, 18, 77, 2497, 2911),
    m('2027-03', 80, 17, 82, 2651, 2969),
    m('2027-04', 75, 16, 85, 2746, 3011),
    m('2027-05', 70, 15, 88, 2840, 2841),
    m('2027-06', 66, 14, 90, 2912, 2779),
    m('2027-07', 62, 13, 93, 2970, 2650),
    m('2027-08', 58, 12, 94, 3018, 2521),
    m('2027-09', 55, 12, 95, 3046, 2932),
    m('2027-10', 52, 11, 91, 2952, 4809),
  ],
}

/**
 * O plano oficial desde 11/11/2026 (Tales: "faz a projeção baseada nos dados"): o modelo de público finito de
 * `projecao.ts`, rodado uma vez com os números reais de 11/11/2026 (`PARAMETROS_PLANO`) e congelado aqui. Os
 * cadastros caem devagar porque o público é finito (com a turma nova de R1 em março); as primeiras assinaturas
 * acompanham; a base cresce porque os mensais renovam. O cenário moderado de 05/11 fica guardado para comparação.
 * Esta versão nunca muda: ajustes vão para a camada "vigente", só em meses futuros.
 */
export const PLANO_2026_11: VersaoMetas = {
  id: 'plano-2026-11-11',
  nome: 'Plano de 12 meses · dados reais de 11/11/2026',
  registradaEm: '2026-11-11',
  meses: [
    m('2026-11', 125, 50, 88, 3037, 5460),
    m('2026-12', 116, 48, 126, 4463, 6502),
    m('2027-01', 109, 47, 157, 5633, 7299),
    m('2027-02', 101, 46, 183, 6596, 7898),
    m('2027-03', 139, 61, 221, 8006, 10042),
    m('2027-04', 129, 60, 252, 9146, 10989),
    m('2027-05', 120, 58, 278, 10082, 11477),
    m('2027-06', 112, 57, 300, 10850, 11814),
    m('2027-07', 104, 55, 318, 11483, 12026),
    m('2027-08', 97, 54, 333, 12005, 12137),
    m('2027-09', 91, 52, 345, 12409, 12713),
    m('2027-10', 84, 51, 351, 12648, 15037),
  ],
}
/** A versão que vale nas telas (faixas de metas, página Metas). */
export const META_OFICIAL = PLANO_2026_11

/** Linha da tabela metas_comerciais (camada "vigente", editável pelo painel). */
export interface LinhaMetaBanco { versao: string; mes: string; cadastros: number; novos_pagantes: number; ativos_fim: number; receita_equivalente: number; faturamento: number }

/** A meta que vale para cada mês: a editada (se houver) por cima da original. */
export function metasVigentes(original: VersaoMetas, editadas: LinhaMetaBanco[] | null | undefined): Array<MetaMes & { editada: boolean; original: MetaMes }> {
  const porMes = new Map((editadas ?? []).filter(l => l.versao === 'vigente').map(l => [String(l.mes).slice(0, 7), l]))
  return original.meses.map(o => {
    const e = porMes.get(o.mes)
    return e ? { mes: o.mes, cadastros: Number(e.cadastros), novosPagantes: Number(e.novos_pagantes), ativosFim: Number(e.ativos_fim), receitaEquivalente: Number(e.receita_equivalente), faturamento: Number(e.faturamento), editada: true, original: o }
      : { ...o, editada: false, original: o }
  })
}

/* ───────────── Realizado ───────────── */

/** Período pago de cada cobrança, encadeado por pessoa (renovação antecipada soma os dias, como no checkout). */
export interface Periodo { id_usuario: string; inicio: number; fim: number; mensal: number; plano: string; meio: string }
export function periodosPagos(cobrancas: Cobranca[]): Periodo[] {
  const fimDe = new Map<string, number>()
  const lista: Periodo[] = []
  for (const c of [...cobrancas].sort((a, b) => a.em.getTime() - b.em.getTime())) {
    const meses = precoDe(c.plano)?.meses ?? 1
    const anterior = fimDe.get(c.id_usuario)
    const inicio = anterior !== undefined && anterior > c.em.getTime() ? anterior : c.em.getTime()
    const fim = somarMeses(new Date(inicio), meses).getTime()
    fimDe.set(c.id_usuario, fim)
    lista.push({ id_usuario: c.id_usuario, inicio, fim, mensal: c.valor / meses, plano: c.plano, meio: c.meio })
  }
  return lista
}

/** Pagantes com acesso e a receita mensal equivalente num instante. */
export function baseNoInstante(periodos: Periodo[], t: number) {
  const pessoa = new Map<string, Periodo>()
  for (const p of periodos) if (p.inicio <= t && p.fim > t) { const x = pessoa.get(p.id_usuario); if (!x || p.inicio > x.inicio) pessoa.set(p.id_usuario, p) }
  let rme = 0
  for (const p of pessoa.values()) rme += p.mensal
  return { ativos: pessoa.size, receitaEquivalente: rme }
}

export interface RealizadoMes { mes: string; cadastros: number; novosPagantes: number; ativosFim: number; receitaEquivalente: number; faturamento: number; completo: boolean; reembolsado: number }

/**
 * O realizado de cada mês. `instantes` são as datas de cadastro (já sem teste, admin e fora do público-alvo);
 * `cobrancas` as cobranças pagas (reembolsadas já saem). No mês em andamento, ativos e receita equivalente
 * são os de agora (ainda não é o fim do mês).
 */
export function realizadoPorMes(meses: string[], cadastros: Date[], cobrancas: Cobranca[], reembolsadoPorMes: Map<string, number>, agora = Date.now()): RealizadoMes[] {
  const periodos = periodosPagos(cobrancas)
  const atual = MES(new Date(agora))
  const cad = new Map<string, number>(), novos = new Map<string, number>(), fat = new Map<string, number>()
  for (const d of cadastros) { const k = MES(d); cad.set(k, (cad.get(k) ?? 0) + 1) }
  for (const c of cobrancas) { const k = MES(c.em); fat.set(k, (fat.get(k) ?? 0) + c.valor); if (c.tipo === 'nova') novos.set(k, (novos.get(k) ?? 0) + 1) }
  return meses.map(k => {
    const futuro = k > atual
    const fimMes = inicioDoMes(somarMesChave(k, 1)).getTime() - 1
    const base = futuro ? { ativos: 0, receitaEquivalente: 0 } : baseNoInstante(periodos, Math.min(fimMes, agora))
    return { mes: k, cadastros: cad.get(k) ?? 0, novosPagantes: novos.get(k) ?? 0, ativosFim: base.ativos, receitaEquivalente: base.receitaEquivalente, faturamento: fat.get(k) ?? 0, completo: k < atual, reembolsado: reembolsadoPorMes.get(k) ?? 0 }
  })
}

/* ───────────── Projeção do mês corrente ───────────── */

/** Aproximação normal de Poisson para contagens; cenários financeiros não são intervalos calibrados. */
const Z90 = 1.645
export interface Faixa { centro: number; baixo: number; alto: number }
export interface ProjecaoMes {
  diasPassados: number; diasNoMes: number; diasRestantes: number
  /** Menos de 7 dias ou menos de 5 eventos: o intervalo é largo e a projeção é só uma ideia. */
  amostraPequena: boolean
  cadastros: Faixa; novosPagantes: Faixa; faturamento: Faixa; ativosFim: Faixa; receitaEquivalente: Faixa
  /** As partes do faturamento: já recebido, cartões que renovam no mês, Pix que vence no mês, compras novas esperadas. */
  partes: { recebido: number; cartao: number; pix: number; pixPessoas: number; novas: number; ticketNovo: number }
}

/**
 * Ritmo observado até hoje projetado nos dias que faltam. A aproximação normal de Poisson
 * fornece uma faixa de sensibilidade de contagens, sem misturar objetivo e previsão.
 * Poucos dias de dado são sinalizados na interface; não há garantia estatística para receita.
 */
function poisson(ate: number, diasPassados: number, diasRestantes: number, _meta?: number, _diasNoMes = 30): Faixa {
  const ritmoReal = diasPassados > 0 ? ate / diasPassados : 0
  const ritmo = ritmoReal
  const esperado = ritmo * diasRestantes
  const d = Z90 * Math.sqrt(Math.max(esperado, 0))
  return { centro: ate + esperado, baixo: ate + Math.max(0, esperado - d), alto: ate + esperado + d }
}

/**
 * Metodologia (documentada em docs/admin/METAS.md):
 * - Cadastros e primeiras compras: o ritmo diário do mês até agora, projetado nos dias que faltam
 *   (aproximação de Poisson para contagens); a meta não altera a previsão.
 * - Faturamento: o que já entrou + as renovações agendadas até o fim do mês, pelo calendário de cada pessoa
 *   (cartão que renova entra inteiro; Pix entra pela taxa de recompra escolhida, com faixa de 30% a 100%)
 *   + as compras novas esperadas × o valor médio das compras novas do mês (ou o mensal, sem compras ainda).
 *   Nada de anual dividido por dia: cada cobrança cai no dia em que vence.
 * - Pagantes e receita equivalente no fim do mês: a base de hoje, menos quem vence sem renovar (cartão
 *   desligado sai; Pix fica pela taxa), mais as primeiras compras esperadas.
 */
export function projetarMes({ agora = Date.now(), cadastros, cobrancas, assinaturas, taxaPix, meta }: {
  agora?: number; cadastros: Date[]; cobrancas: Cobranca[]; assinaturas: AssinaturaBase[]; taxaPix: number
  /** Compatibilidade dos chamadores: objetivo não altera o ritmo observado nem a projeção. */
  meta?: Pick<MetaMes, 'cadastros' | 'novosPagantes'>
}): ProjecaoMes {
  const chave = MES(new Date(agora))
  const inicio = inicioDoMes(chave).getTime(), fimMes = inicioDoMes(somarMesChave(chave, 1)).getTime()
  const diasNoMes = Math.round((fimMes - inicio) / 86_400_000)
  const diasPassados = Math.max(1 / 24, (agora - inicio) / 86_400_000)
  const diasRestantes = Math.max(0, (fimMes - agora) / 86_400_000)
  const noMes = (t: number) => t >= inicio && t < agora
  const cad = cadastros.filter(d => noMes(d.getTime())).length
  const doMes = cobrancas.filter(c => noMes(c.em.getTime()))
  const novas = doMes.filter(c => c.tipo === 'nova')
  const recebido = doMes.reduce((s, c) => s + c.valor, 0)
  const ticketNovo = novas.length ? novas.reduce((s, c) => s + c.valor, 0) / novas.length : precoDe('mensal')?.total ?? 39.9

  // Renovações agendadas até o fim do mês: o último valor pago por pessoa, no dia em que o acesso acaba.
  const ultimo = new Map<string, number>()
  for (const c of [...cobrancas].sort((a, b) => a.em.getTime() - b.em.getTime())) ultimo.set(c.id_usuario, c.valor)
  let cartao = 0, pix = 0, pixPessoas = 0, saindo = 0, saindoMensal = 0
  for (const a of vigentesPorPessoa(assinaturas, agora)) {
    if (!a.fim_periodo) continue
    const fim = new Date(a.fim_periodo).getTime()
    if (fim < agora || fim >= fimMes) continue
    const valor = ultimo.get(a.id_usuario) ?? precoDe(a.plano)?.total ?? 0
    const mensal = valor / (precoDe(a.plano)?.meses ?? 1)
    if (renovaSozinha(a)) cartao += valor
    else if (meioDe(a) === 'pix') { pix += valor; pixPessoas++; saindoMensal += mensal * (1 - taxaPix); saindo += 1 - taxaPix }
    else { saindo += 1; saindoMensal += mensal }
  }
  const fCad = poisson(cad, diasPassados, diasRestantes, meta?.cadastros, diasNoMes)
  const fNovas = poisson(novas.length, diasPassados, diasRestantes, meta?.novosPagantes, diasNoMes)
  const novasEsperadas = fNovas.centro - novas.length
  const fat = (taxa: number, novasExtra: number) => recebido + cartao + pix * taxa + novasExtra * ticketNovo
  const periodos = periodosPagos(cobrancas)
  const base = baseNoInstante(periodos, agora)
  const ticketMensalNovo = novas.length ? novas.reduce((s, c) => s + c.valor / (precoDe(c.plano)?.meses ?? 1), 0) / novas.length : precoDe('mensal')?.total ?? 39.9
  const ativos = (extra: number, sai: number) => Math.max(0, base.ativos - sai + extra)
  const rme = (extra: number, saiMensal: number) => Math.max(0, base.receitaEquivalente - saiMensal + extra * ticketMensalNovo)
  return {
    diasPassados: Math.floor(diasPassados), diasNoMes, diasRestantes: Math.ceil(diasRestantes),
    amostraPequena: diasPassados < 7 || novas.length + cad < 5,
    cadastros: fCad,
    novosPagantes: fNovas,
    faturamento: { centro: fat(taxaPix, novasEsperadas), baixo: fat(Math.min(0.3, taxaPix), fNovas.baixo - novas.length), alto: fat(1, fNovas.alto - novas.length) },
    ativosFim: { centro: ativos(novasEsperadas, saindo), baixo: ativos(fNovas.baixo - novas.length, saindo + pixPessoas * Math.max(0, taxaPix - 0.3)), alto: ativos(fNovas.alto - novas.length, saindo - pixPessoas * (1 - taxaPix)) },
    receitaEquivalente: { centro: rme(novasEsperadas, saindoMensal), baixo: rme(fNovas.baixo - novas.length, saindoMensal * 1.4), alto: rme(fNovas.alto - novas.length, 0) },
    partes: { recebido, cartao, pix, pixPessoas, novas: novasEsperadas, ticketNovo },
  }
}

/* ───────────── Situação diante da meta ───────────── */

export type Situacao = 'acima' | 'proximo' | 'abaixo'
/**
 * Critério matemático, igual para todas as metas:
 * - Acima da meta: a projeção de fechamento chega a 100% da meta ou mais.
 * - Próximo da meta: a projeção fica entre 90% e 100%.
 * - Abaixo do ritmo necessário: a projeção fica abaixo de 90%.
 * Para metas de estoque (pagantes ativos, receita equivalente) vale a mesma régua sobre a projeção do fim do mês.
 */
export function situacao(projecao: number, meta: number): Situacao {
  if (meta <= 0) return 'acima'
  const r = projecao / meta
  return r >= 1 ? 'acima' : r >= 0.9 ? 'proximo' : 'abaixo'
}
export const ROTULO_SITUACAO: Record<Situacao, string> = { acima: 'Projeção alcança o objetivo', proximo: 'Projeção próxima do objetivo', abaixo: 'Projeção abaixo do objetivo' }

/** O esperado até hoje, para metas de fluxo (cadastros, primeiras compras, faturamento): a meta × a parte do mês que já passou. */
export const esperadoAteHoje = (meta: number, diasPassados: number, diasNoMes: number) => meta * Math.min(1, diasPassados / diasNoMes)

/** Quanto falta por semana para chegar à meta até o fim do mês (semana de 7 dias corridos). */
export function porSemanaNecessario(meta: number, realizado: number, diasRestantes: number) {
  const falta = Math.max(0, meta - realizado)
  const semanas = Math.max(diasRestantes, 1) / 7
  return { falta, porSemana: falta / semanas, porDia: falta / Math.max(diasRestantes, 1) }
}

/* ───────────── Tipos de receita ───────────── */

export interface TiposReceita {
  recebido: number; reembolsado: number; competencia: number; equivalente: number; recorrenteAutomatica: number
  primeiras: number; renovacoes: number; voltas: number
  porPlano: Array<{ plano: string; valor: number; quantidade: number }>; porMeio: Array<{ meio: string; valor: number; quantidade: number }>
}

/**
 * Os tipos de receita de um mês, cada um com a sua definição (nenhum vira "dinheiro que vai entrar"):
 * recebido (caixa, reembolsos à parte), competência (cada cobrança espalhada pelos meses que ela cobre),
 * equivalente (a base mensalizada no fim do mês, ou agora), recorrente automática (só cartões que renovam),
 * primeiras compras, renovações, por plano e por meio. Cortesia nunca entra: não tem cobrança.
 */
export function tiposDeReceita(mes: string, cobrancas: Cobranca[], assinaturas: AssinaturaBase[], reembolsado: number, agora = Date.now()): TiposReceita {
  const doMes = cobrancas.filter(c => MES(c.em) === mes)
  const soma = (l: Cobranca[]) => l.reduce((s, c) => s + c.valor, 0)
  // Competência: valor ÷ meses do plano em cada mês coberto, a partir do mês em que o período começa.
  let competencia = 0
  for (const p of periodosPagos(cobrancas)) {
    const meses = precoDe(p.plano)?.meses ?? 1
    const primeiro = MES(new Date(p.inicio))
    for (let i = 0; i < meses; i++) if (somarMesChave(primeiro, i) === mes) competencia += p.mensal
  }
  const fimMes = inicioDoMes(somarMesChave(mes, 1)).getTime() - 1
  const equivalente = baseNoInstante(periodosPagos(cobrancas), Math.min(fimMes, agora)).receitaEquivalente
  const ultimo = new Map<string, number>()
  for (const c of [...cobrancas].sort((a, b) => a.em.getTime() - b.em.getTime())) ultimo.set(c.id_usuario, c.valor)
  const recorrenteAutomatica = vigentesPorPessoa(assinaturas, agora).filter(renovaSozinha).reduce((s, a) => s + (ultimo.get(a.id_usuario) ?? precoDe(a.plano)?.total ?? 0) / (precoDe(a.plano)?.meses ?? 1), 0)
  const agrupar = (f: (c: Cobranca) => string) => { const mm = new Map<string, { valor: number; quantidade: number }>(); for (const c of doMes) { const k = f(c); const x = mm.get(k) ?? { valor: 0, quantidade: 0 }; x.valor += c.valor; x.quantidade++; mm.set(k, x) } return [...mm].map(([k, v]) => ({ k, ...v })).sort((a, b) => b.valor - a.valor) }
  return {
    recebido: soma(doMes), reembolsado, competencia, equivalente, recorrenteAutomatica,
    primeiras: soma(doMes.filter(c => c.tipo === 'nova')), renovacoes: soma(doMes.filter(c => c.tipo === 'renovacao')), voltas: soma(doMes.filter(c => c.tipo === 'volta')),
    porPlano: agrupar(c => c.plano).map(x => ({ plano: x.k, valor: x.valor, quantidade: x.quantidade })),
    porMeio: agrupar(c => c.meio).map(x => ({ meio: x.k, valor: x.valor, quantidade: x.quantidade })),
  }
}


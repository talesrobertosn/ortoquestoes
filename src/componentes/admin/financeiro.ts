import { PLANOS as PRECOS } from '../../dados/planos'
import type { PontoEmpilhado } from './AdminGraficos'
import {
  MES, NOME_MES, aReceberNoCartao, inicioDoMes, dataCancelamento, meioDe, pagaSemCobranca, precoDe,
  recorrentesNoCartao, renovacaoDoPix, renovaSozinha, somarMesChave, vigentesPorPessoa, type AssinaturaBase, type Cobranca,
} from './receita'

/**
 * Números do Financeiro num lugar só (tirados de dentro de AdminFinanceiro na revisão de
 * 15/10/2026, sem mudar nenhuma conta): a tela e a exportação do painel leem daqui, então os
 * dois sempre batem. `todas` é o resultado de `cobrancas(assinaturas, reais)`.
 */
export const HORIZONTES = [1, 3, 6, 12] as const
/** Sem histórico suficiente de Pix encerrados, a suposição de recompra começa aqui. */
export const TAXA_PIX_PADRAO = 0.6
export const MINIMO_PARA_OBSERVADA = 5
export const curto = (chave: string) => NOME_MES(chave, true).replace('.', '')

/** Taxa de recompra do Pix que a tela usa de partida: a observada, com amostra suficiente; senão 60%. */
export function taxaPixSugerida(assinaturas: AssinaturaBase[], agora = new Date()) {
  const observado = renovacaoDoPix(assinaturas, agora)
  const taxa = observado.taxa !== null && observado.encerrados >= MINIMO_PARA_OBSERVADA ? Math.round(observado.taxa * 100) / 100 : TAXA_PIX_PADRAO
  return { taxa, observado }
}

export function calcularFinanceiro(assinaturas: AssinaturaBase[], todas: Cobranca[], agora = new Date()) {
  const ms = agora.getTime()
  const esteMes = MES(agora), mesPassado = somarMesChave(esteMes, -1)
  // Recebido por mês (de Brasília), separado em cartão e Pix (últimos 12 meses).
  const porMes = new Map<string, [number, number]>()
  for (let i = 11; i >= 0; i--) porMes.set(somarMesChave(esteMes, -i), [0, 0])
  for (const c of todas) { const m = porMes.get(MES(c.em)); if (m) m[c.meio === 'pix' ? 1 : 0] += c.valor }
  const totalMes = (k: string) => { const m = porMes.get(k); return m ? m[0] + m[1] : 0 }
  const total = todas.reduce((s, c) => s + c.valor, 0)
  const pagantes = new Set(todas.map(c => c.id_usuario)).size
  const primeira = todas[0]?.em ?? null
  const mesesDeVida = primeira ? Math.max(1, (ms - primeira.getTime()) / (30.44 * 86_400_000)) : 0

  // Recorrência e previsão.
  const recorrentes = recorrentesNoCartao(assinaturas, ms)
  const valorRecorrente = recorrentes.reduce((s, x) => s + x.valor, 0)
  const mrr = recorrentes.reduce((s, x) => s + x.mensal, 0)
  const aReceber = HORIZONTES.map(m => ({ meses: m, ...aReceberNoCartao(assinaturas, m, agora) }))

  // Base com acesso agora: uma linha por pessoa (Pix renovado antes do fim ou Pix → cartão não contam em dobro).
  const comAcesso = vigentesPorPessoa(assinaturas, ms)

  // Taxa de renovação do mês: de quem tinha o acesso terminando de 1º do mês até hoje (ou já renovou
  // no mês), quantos renovaram. Perdeu = o acesso acabou no mês e a pessoa está sem acesso agora.
  const inicioMes = inicioDoMes(esteMes).getTime()
  const renovaramMes = new Set(todas.filter(c => c.tipo === 'renovacao' && c.em.getTime() >= inicioMes).map(c => c.id_usuario))
  const comAcessoIds = new Set(comAcesso.map(a => a.id_usuario))
  const perderamMes = new Set(assinaturas.filter(a => a.status !== 'reembolsada' && a.status !== 'pendente' && a.fim_periodo
    && new Date(a.fim_periodo).getTime() >= inicioMes && new Date(a.fim_periodo).getTime() <= ms && !comAcessoIds.has(a.id_usuario) && !renovaramMes.has(a.id_usuario)).map(a => a.id_usuario))
  const porPlano = PRECOS.map(p => {
    const lista = comAcesso.filter(a => a.plano === p.id)
    const renovam = lista.filter(renovaSozinha).length
    const pix = lista.filter(a => meioDe(a) === 'pix').length
    return { ...p, vigentes: lista.length, renovam, pix, cartaoSemRenovar: lista.length - renovam - pix, mensal: renovam * (p.total / p.meses) }
  })
  const em30 = (iso?: string | null) => !!iso && new Date(iso).getTime() > ms && new Date(iso).getTime() - ms < 30 * 86_400_000
  const renovam30 = assinaturas.filter(a => renovaSozinha(a) && em30(a.fim_periodo))

  // Histórico de cancelamentos e meios.
  const pagas = assinaturas.filter(a => a.ultima_cobranca_em || pagaSemCobranca(a))
  const pagasCartao = pagas.filter(a => meioDe(a) === 'cartao')
  const receitaPix = todas.filter(c => c.meio === 'pix').reduce((s, c) => s + c.valor, 0)
  const renovacoes = todas.filter(c => c.tipo === 'renovacao')

  return {
    total, pagantes, primeira, recorrentes, valorRecorrente, mrr, aReceber, chaveMes: esteMes, chaveMesPassado: mesPassado,
    esteMes: totalMes(esteMes), mesPassado: totalMes(mesPassado),
    mediaMensal: mesesDeVida ? total / mesesDeVida : 0,
    ticket: todas.length ? total / todas.length : 0,
    porPagante: pagantes ? total / pagantes : 0,
    serie: [...porMes].map(([k, v]): PontoEmpilhado => ({ rotulo: NOME_MES(k), rotuloCurto: curto(k), partes: [Math.round(v[0] * 100) / 100, Math.round(v[1] * 100) / 100] })),
    comAcesso: comAcesso.length, porPlano,
    renovaramMes: renovaramMes.size, perderamMes: perderamMes.size,
    taxaRenovacaoMes: renovaramMes.size + perderamMes.size ? Math.round(renovaramMes.size / (renovaramMes.size + perderamMes.size) * 100) : null,
    renovamAgora: comAcesso.filter(renovaSozinha).length,
    pixComAcesso: comAcesso.filter(a => meioDe(a) === 'pix').length,
    cartaoSemRenovar: comAcesso.filter(a => meioDe(a) === 'cartao' && !renovaSozinha(a)).length,
    pixAcabando30: comAcesso.filter(a => meioDe(a) === 'pix' && em30(a.fim_periodo)).length,
    renovacoes30: renovam30.length, valorRenovacoes30: renovam30.reduce((s, a) => s + (precoDe(a.plano)?.total ?? 0), 0),
    cancelaram: pagasCartao.filter(a => dataCancelamento(a)).length, pagasCartao: pagasCartao.length,
    reembolsos: assinaturas.filter(a => a.status === 'reembolsada').length,
    pagasPix: pagas.length - pagasCartao.length, receitaPix, receitaCartao: total - receitaPix,
    renovacoes: renovacoes.length, receitaRenovacoes: renovacoes.reduce((s, c) => s + c.valor, 0),
    receitaPorPlano: PRECOS.map(p => { const lista = todas.filter(c => c.plano === p.id); return { nome: p.nome, valor: lista.reduce((s, c) => s + c.valor, 0), cobrancas: lista.length } }),
  }
}
export type ResumoFinanceiro = ReturnType<typeof calcularFinanceiro>

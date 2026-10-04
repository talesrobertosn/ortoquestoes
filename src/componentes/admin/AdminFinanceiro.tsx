import { useMemo, useState } from 'react'
import { PLANOS as PRECOS, real } from '../../dados/planos'
import { BarrasHorizontais, GraficoColunas, type Ponto } from './AdminGraficos'
import { baixarCsv, porcentagem } from './formatos'

export interface AssinaturaFinanceira {
  id_usuario: string
  usuario?: string | null
  nome?: string | null
  plano: string
  status: string
  criada_em?: string | null
  inicio_periodo?: string | null
  fim_periodo?: string | null
  ultima_cobranca_em?: string | null
  cancelar_ao_fim?: boolean
  cancelada_em?: string | null
  ultima_atualizacao: string
}

interface Cobranca { em: Date; valor: number; plano: string; id_usuario: string; estimada: boolean }

const MES = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const NOME_MES = (chave: string, curto = false) => new Date(`${chave}-15T12:00:00`).toLocaleDateString('pt-BR', curto ? { month: 'short' } : { month: 'long', year: 'numeric' })
const precoDe = (plano: string) => PRECOS.find(p => p.id === plano)
const somarMeses = (d: Date, meses: number) => { const n = new Date(d); n.setMonth(n.getMonth() + meses); return n }

/**
 * Assinatura que já foi paga, mas cuja cobrança não ficou gravada (o aviso do
 * pagamento do Mercado Pago não chegou ou não foi processado). No cartão, a
 * assinatura só fica ativa depois de a primeira cobrança ser aprovada.
 */
function pagaSemCobranca(a: AssinaturaFinanceira) {
  if (a.ultima_cobranca_em || !precoDe(a.plano)) return false
  if (a.status === 'ativa' || a.status === 'pausada' || a.status === 'vencida') return true
  // Cancelada depois de ter valido um período: o fim ficou bem depois do início.
  if (a.status === 'cancelada' && a.fim_periodo && (a.inicio_periodo ?? a.criada_em)) {
    const dias = (new Date(a.fim_periodo).getTime() - new Date((a.inicio_periodo ?? a.criada_em)!).getTime()) / 86_400_000
    return dias >= 25
  }
  return false
}

/**
 * Cobranças reconstruídas a partir das assinaturas: a última cobrança paga e,
 * para trás, uma a cada período do plano até a data em que a assinatura foi
 * criada. Pix é sempre uma cobrança só. Reembolso tira a última. Assinatura
 * paga sem cobrança gravada entra com uma cobrança estimada no início.
 */
function cobrancas(assinaturas: AssinaturaFinanceira[]): Cobranca[] {
  const lista: Cobranca[] = []
  for (const a of assinaturas) {
    const preco = precoDe(a.plano)
    if (!preco) continue
    if (!a.ultima_cobranca_em) {
      if (pagaSemCobranca(a)) lista.push({ em: new Date(a.inicio_periodo ?? a.criada_em ?? a.ultima_atualizacao), valor: preco.total, plano: a.plano, id_usuario: a.id_usuario, estimada: true })
      continue
    }
    const inicio = new Date(a.criada_em ?? a.inicio_periodo ?? a.ultima_cobranca_em).getTime() - 3 * 86_400_000
    const datas: Date[] = []
    for (let d = new Date(a.ultima_cobranca_em); d.getTime() >= inicio && datas.length < 120; d = somarMeses(d, -preco.meses)) datas.push(d)
    if (a.status === 'reembolsada') datas.shift()
    for (const em of datas) lista.push({ em, valor: preco.total, plano: a.plano, id_usuario: a.id_usuario, estimada: false })
  }
  return lista.sort((x, y) => x.em.getTime() - y.em.getTime())
}

/** Próximas cobranças de quem renova automaticamente, mês a mês, supondo que ninguém cancele. */
function previsao(assinaturas: AssinaturaFinanceira[], meses: number) {
  const agora = new Date(), limite = somarMeses(agora, meses)
  const porMes = new Map<string, number>()
  for (let i = 0; i < meses; i++) porMes.set(MES(somarMeses(agora, i)), 0)
  for (const a of assinaturas) {
    const preco = precoDe(a.plano)
    if (!preco || a.status !== 'ativa' || a.cancelar_ao_fim || !a.fim_periodo) continue
    for (let d = new Date(a.fim_periodo); d < limite; d = somarMeses(d, preco.meses)) {
      if (d < agora) continue
      const chave = MES(d)
      if (porMes.has(chave)) porMes.set(chave, (porMes.get(chave) ?? 0) + preco.total)
    }
  }
  return [...porMes]
}

/** Financeiro: quanto entrou, mês a mês, de onde veio e o que está previsto. Estimativa; o extrato oficial é o do Mercado Pago. */
export function AdminFinanceiro({ assinaturas, usuarios }: { assinaturas: AssinaturaFinanceira[]; usuarios: number | null }) {
  const [mesesPrevisao, definirMesesPrevisao] = useState(6)
  const todas = useMemo(() => cobrancas(assinaturas), [assinaturas])

  const d = useMemo(() => {
    const agora = new Date()
    const esteMes = MES(agora), mesPassado = MES(somarMeses(agora, -1))
    const porMes = new Map<string, number>()
    for (let i = 11; i >= 0; i--) porMes.set(MES(somarMeses(agora, -i)), 0)
    for (const c of todas) { const k = MES(c.em); if (porMes.has(k)) porMes.set(k, (porMes.get(k) ?? 0) + c.valor) }
    const total = todas.reduce((s, c) => s + c.valor, 0)
    const pagantes = new Set(todas.map(c => c.id_usuario)).size
    const porPlano = PRECOS.map(p => {
      const doPlano = todas.filter(c => c.plano === p.id)
      return { nome: p.nome, valor: doPlano.reduce((s, c) => s + c.valor, 0), cobrancas: doPlano.length }
    })
    const vigente = (a: AssinaturaFinanceira) => (a.status === 'ativa' || (a.status === 'cancelada' && !!a.cancelar_ao_fim)) && (!a.fim_periodo || new Date(a.fim_periodo) > agora)
    const renovam = assinaturas.filter(a => a.status === 'ativa' && !a.cancelar_ao_fim && vigente(a))
    const mrr = renovam.reduce((s, a) => { const p = precoDe(a.plano); return s + (p ? p.total / p.meses : 0) }, 0)
    const pagas = assinaturas.filter(a => a.ultima_cobranca_em || pagaSemCobranca(a))
    const cancelaram = pagas.filter(a => a.cancelar_ao_fim || ['cancelada', 'reembolsada', 'vencida'].includes(a.status)).length
    const reembolsos = assinaturas.filter(a => a.status === 'reembolsada').length
    const primeira = todas[0]?.em ?? null
    const mesesDeVida = primeira ? Math.max(1, (agora.getTime() - primeira.getTime()) / (30.44 * 86_400_000)) : 0
    return {
      total, pagantes, porPlano, mrr, renovam: renovam.length, cancelaram, pagas: pagas.length, reembolsos, primeira,
      esteMes: porMes.get(esteMes) ?? 0, mesPassado: porMes.get(mesPassado) ?? 0,
      ticket: todas.length ? total / todas.length : 0,
      porPagante: pagantes ? total / pagantes : 0,
      mediaMensal: mesesDeVida ? total / mesesDeVida : 0,
      serie: [...porMes].map(([k, v]): Ponto => ({ rotulo: NOME_MES(k), rotuloCurto: NOME_MES(k, true).replace('.', ''), valor: Math.round(v * 100) / 100 })),
    }
  }, [todas, assinaturas])

  const semCobranca = useMemo(() => assinaturas.filter(pagaSemCobranca), [assinaturas])
  const prev = useMemo(() => previsao(assinaturas, mesesPrevisao), [assinaturas, mesesPrevisao])
  const totalPrevisto = prev.reduce((s, [, v]) => s + v, 0)
  const variacao = d.mesPassado ? Math.round(((d.esteMes - d.mesPassado) / d.mesPassado) * 100) : null
  const conversao = usuarios ? porcentagem(d.pagantes, usuarios) : null

  return <div className="empilha-2">
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-financeiro">
      <div className="adm-secao__cabeca"><div>
        <h2 id="adm-titulo-financeiro">Financeiro</h2>
        <p>Valores brutos, reconstruídos a partir das assinaturas (cada cobrança paga pelo preço do plano; reembolsos descontados). Não descontam a taxa do Mercado Pago e não substituem o extrato dele.</p>
      </div>
        <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-cobrancas-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Data', 'Plano', 'Valor', 'Origem'], todas.map(c => [c.em.toLocaleDateString('pt-BR'), precoDe(c.plano)?.nome ?? c.plano, c.valor.toFixed(2).replace('.', ','), c.estimada ? 'estimada (sem cobrança gravada)' : 'cobrança gravada']))}>Exportar cobranças</button>
      </div>
      <div className="adm-kpis">
        <div className="adm-kpi adm-kpi--destaque adm-kpi--dinheiro"><span>Total recebido</span><strong>{real(d.total)}</strong><small>{d.primeira ? `desde ${d.primeira.toLocaleDateString('pt-BR')}` : 'nenhuma cobrança ainda'}</small></div>
        <div className="adm-kpi"><span>Neste mês</span><strong>{real(d.esteMes)}</strong><small>{variacao === null ? 'sem base no mês passado' : `${variacao >= 0 ? '+' : ''}${variacao}% sobre ${real(d.mesPassado)} do mês passado`}</small></div>
        <div className="adm-kpi"><span>Receita mensal recorrente</span><strong>{real(d.mrr)}</strong><small>{d.renovam} assinatura(s) que renovam sozinhas</small></div>
        <div className="adm-kpi"><span>Média por mês</span><strong>{real(d.mediaMensal)}</strong><small>desde a primeira cobrança</small></div>
        <div className="adm-kpi"><span>Ticket médio</span><strong>{real(d.ticket)}</strong><small>por cobrança paga</small></div>
        <div className="adm-kpi"><span>Receita por pagante</span><strong>{real(d.porPagante)}</strong><small>{d.pagantes} pessoa(s) já pagaram</small></div>
        <div className="adm-kpi"><span>Conversão</span><strong>{conversao === null ? '—' : `${conversao}%`}</strong><small>dos cadastrados já pagaram</small></div>
        <div className="adm-kpi"><span>Cancelamentos</span><strong>{d.pagas ? `${porcentagem(d.cancelaram, d.pagas)}%` : '—'}</strong><small>{d.cancelaram} de {d.pagas} pagas · {d.reembolsos} reembolso(s)</small></div>
      </div>
      {semCobranca.length > 0 && <div className="adm-alerta" role="status">
        <p><strong>{semCobranca.length} assinatura(s) paga(s) sem a cobrança gravada.</strong> Elas já entram no total acima pelo preço do plano, mas vale conferir no Mercado Pago e reprocessar o aviso na aba Pagamentos:</p>
        <ul>{semCobranca.map(a => <li key={`${a.id_usuario}-${a.criada_em ?? a.ultima_atualizacao}`}>{a.nome || a.usuario || a.id_usuario} · {precoDe(a.plano)?.nome ?? a.plano} · {real(precoDe(a.plano)?.total ?? 0)} · desde {new Date(a.inicio_periodo ?? a.criada_em ?? a.ultima_atualizacao).toLocaleDateString('pt-BR')}</li>)}</ul>
      </div>}
    </section>

    <section className="empilha adm-secao">
      <GraficoColunas titulo="Receita por mês" subtitulo="últimos 12 meses, em reais" pontos={d.serie} unidade="reais" />
    </section>

    <div className="adm-duas">
      <section className="empilha adm-secao" aria-labelledby="adm-titulo-previsao">
        <div className="adm-secao__cabeca">
          <div><h2 id="adm-titulo-previsao">Previsão</h2><p>Renovações já agendadas, supondo que ninguém cancele. Assinaturas novas entram por cima.</p></div>
          <div className="adm-filtros" role="group" aria-label="Meses de previsão">
            {[3, 6, 12].map(v => <button key={v} type="button" className="adm-chip" aria-pressed={mesesPrevisao === v} onClick={() => definirMesesPrevisao(v)}>{v} meses</button>)}
          </div>
        </div>
        <p className="adm-financeiro__previsto"><strong>{real(totalPrevisto)}</strong> previstos nos próximos {mesesPrevisao} meses</p>
        <BarrasHorizontais formato={v => real(v)} itens={prev.map(([k, v]) => ({ rotulo: NOME_MES(k), valor: v }))} />
      </section>
      <section className="empilha adm-secao" aria-labelledby="adm-titulo-planos-receita">
        <div><h2 id="adm-titulo-planos-receita">De onde veio</h2><p>Total recebido por plano, desde o começo.</p></div>
        <BarrasHorizontais formato={v => real(v)} itens={d.porPlano.map(p => ({ rotulo: p.nome, valor: p.valor, detalhe: `${p.cobrancas} cobrança(s)${d.total ? ` · ${porcentagem(p.valor, d.total)}% do total` : ''}` }))} />
      </section>
    </div>
  </div>
}

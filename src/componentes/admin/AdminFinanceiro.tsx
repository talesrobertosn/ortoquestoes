import { useMemo, useState } from 'react'
import { PLANOS as PRECOS, real } from '../../dados/planos'
import { BarrasHorizontais, GraficoColunas, type Ponto } from './AdminGraficos'
import { baixarCsv, porcentagem } from './formatos'
import { TabelaMensal } from './AdminMensal'
import { MES, NOME_MES, cobrancas, dataCancelamento, mesAMes, meioDe, pagaSemCobranca, precoDe, previsao, renovaSozinha, somarMeses } from './receita'

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
  meio?: string | null
}

/** Financeiro: quanto entrou, mês a mês, de onde veio e o que está previsto. Estimativa; o extrato oficial é o do Mercado Pago. */
export function AdminFinanceiro({ assinaturas, usuarios, testes = 0 }: { assinaturas: AssinaturaFinanceira[]; usuarios: number | null; testes?: number }) {
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
    const renovam = assinaturas.filter(a => renovaSozinha(a) && vigente(a))
    const mrr = renovam.reduce((s, a) => { const p = precoDe(a.plano); return s + (p ? p.total / p.meses : 0) }, 0)
    const pagas = assinaturas.filter(a => a.ultima_cobranca_em || pagaSemCobranca(a))
    // Cancelamento de verdade: cartão com a renovação desligada. Pix é avulso (termina sem renovar) e reembolso conta à parte.
    const pagasCartao = pagas.filter(a => meioDe(a) === 'cartao')
    const cancelaram = pagasCartao.filter(a => dataCancelamento(a)).length
    const reembolsos = assinaturas.filter(a => a.status === 'reembolsada').length
    const pagasPix = pagas.length - pagasCartao.length
    const renovacoes = todas.filter(c => c.tipo === 'renovacao')
    const receitaPix = todas.filter(c => c.meio === 'pix').reduce((s, c) => s + c.valor, 0)
    const primeira = todas[0]?.em ?? null
    const mesesDeVida = primeira ? Math.max(1, (agora.getTime() - primeira.getTime()) / (30.44 * 86_400_000)) : 0
    return {
      total, pagantes, porPlano, mrr, renovam: renovam.length, cancelaram, pagas: pagas.length, pagasCartao: pagasCartao.length, pagasPix, reembolsos, primeira,
      renovacoes: renovacoes.length, receitaRenovacoes: renovacoes.reduce((s, c) => s + c.valor, 0), receitaPix,
      esteMes: porMes.get(esteMes) ?? 0, mesPassado: porMes.get(mesPassado) ?? 0,
      ticket: todas.length ? total / todas.length : 0,
      porPagante: pagantes ? total / pagantes : 0,
      mediaMensal: mesesDeVida ? total / mesesDeVida : 0,
      serie: [...porMes].map(([k, v]): Ponto => ({ rotulo: NOME_MES(k), rotuloCurto: NOME_MES(k, true).replace('.', ''), valor: Math.round(v * 100) / 100 })),
    }
  }, [todas, assinaturas])

  const semCobranca = useMemo(() => assinaturas.filter(pagaSemCobranca), [assinaturas])
  const prev = useMemo(() => previsao(assinaturas, mesesPrevisao), [assinaturas, mesesPrevisao])
  const meses = useMemo(() => mesAMes(assinaturas, 12), [assinaturas])
  const totalPrevisto = prev.reduce((s, [, v]) => s + v.valor, 0)
  const variacao = d.mesPassado ? Math.round(((d.esteMes - d.mesPassado) / d.mesPassado) * 100) : null
  const conversao = usuarios ? porcentagem(d.pagantes, usuarios) : null

  return <div className="empilha-2">
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-financeiro">
      <div className="adm-secao__cabeca"><div>
        <h2 id="adm-titulo-financeiro">Financeiro</h2>
        <p>Valores brutos, reconstruídos a partir das assinaturas (cada cobrança paga pelo preço do plano; reembolsos descontados). Não descontam a taxa do Mercado Pago e não substituem o extrato dele.{testes > 0 && ` ${testes} assinatura(s) de teste do dono ficam de fora.`}</p>
      </div>
        <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-cobrancas-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Data', 'Plano', 'Valor', 'Meio', 'Tipo', 'Origem'], todas.map(c => [c.em.toLocaleDateString('pt-BR'), precoDe(c.plano)?.nome ?? c.plano, c.valor.toFixed(2).replace('.', ','), c.meio === 'pix' ? 'Pix' : 'Cartão', c.tipo === 'nova' ? 'Assinatura nova' : 'Renovação automática', c.estimada ? 'estimada (sem cobrança gravada)' : 'cobrança gravada']))}>Exportar cobranças</button>
      </div>
      <div className="adm-kpis">
        <div className="adm-kpi adm-kpi--destaque adm-kpi--dinheiro"><span>Total recebido</span><strong>{real(d.total)}</strong><small>{d.primeira ? `desde ${d.primeira.toLocaleDateString('pt-BR')}` : 'nenhuma cobrança ainda'}</small></div>
        <div className="adm-kpi"><span>Neste mês</span><strong>{real(d.esteMes)}</strong><small>{variacao === null ? 'sem base no mês passado' : `${variacao >= 0 ? '+' : ''}${variacao}% sobre ${real(d.mesPassado)} do mês passado`}</small></div>
        <div className="adm-kpi"><span>Receita mensal recorrente</span><strong>{real(d.mrr)}</strong><small>{d.renovam} assinatura(s) que renovam sozinhas</small></div>
        <div className="adm-kpi"><span>Média por mês</span><strong>{real(d.mediaMensal)}</strong><small>desde a primeira cobrança</small></div>
        <div className="adm-kpi"><span>Ticket médio</span><strong>{real(d.ticket)}</strong><small>por cobrança paga</small></div>
        <div className="adm-kpi"><span>Receita por pagante</span><strong>{real(d.porPagante)}</strong><small>{d.pagantes} pessoa(s) já pagaram</small></div>
        <div className="adm-kpi"><span>Conversão</span><strong>{conversao === null ? '—' : `${conversao}%`}</strong><small>dos cadastrados já pagaram</small></div>
        <div className="adm-kpi"><span>Cancelamentos</span><strong>{d.pagasCartao ? `${porcentagem(d.cancelaram, d.pagasCartao)}%` : '—'}</strong><small>{d.cancelaram} de {d.pagasCartao} no cartão desligaram a renovação · {d.reembolsos} reembolso(s)</small></div>
        <div className="adm-kpi"><span>Renovações automáticas</span><strong>{d.renovacoes}</strong><small>{real(d.receitaRenovacoes)} vieram de renovação</small></div>
        <div className="adm-kpi"><span>Pix</span><strong>{d.pagasPix}</strong><small>compra(s) avulsa(s) · {real(d.receitaPix)}{d.total ? ` · ${porcentagem(d.receitaPix, d.total)}% da receita` : ''}</small></div>
      </div>
      {semCobranca.length > 0 && <div className="adm-alerta" role="status">
        <p><strong>{semCobranca.length} assinatura(s) paga(s) sem a cobrança gravada.</strong> Elas já entram no total acima pelo preço do plano, mas vale conferir no Mercado Pago e reprocessar o aviso na aba Pagamentos:</p>
        <ul>{semCobranca.map(a => <li key={`${a.id_usuario}-${a.criada_em ?? a.ultima_atualizacao}`}>{a.nome || a.usuario || a.id_usuario} · {precoDe(a.plano)?.nome ?? a.plano} · {real(precoDe(a.plano)?.total ?? 0)} · desde {new Date(a.inicio_periodo ?? a.criada_em ?? a.ultima_atualizacao).toLocaleDateString('pt-BR')}</li>)}</ul>
      </div>}
    </section>

    <section className="empilha adm-secao">
      <GraficoColunas titulo="Receita por mês" subtitulo="últimos 12 meses, em reais" pontos={d.serie} unidade="reais" />
    </section>

    <section className="empilha adm-secao" aria-labelledby="adm-titulo-mensal">
      <div><h2 id="adm-titulo-mensal">Mês a mês</h2><p>Assinaturas novas, renovações automáticas, cancelamentos, reembolsos e Pix encerrados em cada mês.</p></div>
      <TabelaMensal meses={meses} />
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
        <BarrasHorizontais formato={v => real(v)} itens={prev.map(([k, v]) => ({ rotulo: NOME_MES(k), valor: v.valor, detalhe: `${v.quantidade} renovação(ões)` }))} />
      </section>
      <section className="empilha adm-secao" aria-labelledby="adm-titulo-planos-receita">
        <div><h2 id="adm-titulo-planos-receita">De onde veio</h2><p>Total recebido por plano, desde o começo.</p></div>
        <BarrasHorizontais formato={v => real(v)} itens={d.porPlano.map(p => ({ rotulo: p.nome, valor: p.valor, detalhe: `${p.cobrancas} cobrança(s)${d.total ? ` · ${porcentagem(p.valor, d.total)}% do total` : ''}` }))} />
      </section>
    </div>
  </div>
}

import { useMemo, useState, type ReactNode } from 'react'
import { real } from '../../dados/planos'
import { Icone } from '../Icone'
import { BarraComposicao, BarrasHorizontais, GraficoColunasEmpilhadas, type PontoEmpilhado } from './AdminGraficos'
import { calcularGanhos, fechamentoDoMes } from './ganhos'
import { baixarCsv, haQuanto, porcentagem } from './formatos'
import { TabelaMensal } from './AdminMensal'
import { NOME_MES, aReceberNoPix, cobrancas, meioDe, mesAMes, pagaSemCobranca, precoDe, type CobrancaReal } from './receita'
import { HORIZONTES, MINIMO_PARA_OBSERVADA, calcularFinanceiro, curto, taxaPixSugerida } from './financeiro'
import { rotuloMeio, rotuloPlano, rotuloTipoCobranca, situacaoAssinatura } from './rotulos'
import { Comparacao } from './Comparacao'
import type { Aba } from './secoes'

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

const SERIES = [{ nome: 'Cartão', classe: 'adm-serie-cartao' }, { nome: 'Pix', classe: 'adm-serie-pix' }]
const SERIES_PREVISAO = [{ nome: 'Cartão (renovação automática)', classe: 'adm-serie-cartao' }, { nome: 'Pix (recompra estimada)', classe: 'adm-serie-pix-estimado' }]
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`
/** "outubro" (sem o ano), para as comparações do resumo. */
const soMes = (chave: string) => NOME_MES(chave).replace(/ de \d{4}$/, '')

/** Nome de cada pessoa a partir das assinaturas (para as listas de cobranças). */
export function nomesDasAssinaturas(assinaturas: Array<Pick<AssinaturaFinanceira, 'id_usuario' | 'nome' | 'usuario'>>) {
  const mapa = new Map<string, { nome: string | null; email: string | null }>()
  for (const a of assinaturas) {
    const atual = mapa.get(a.id_usuario)
    if (!atual || (!atual.nome && a.nome)) mapa.set(a.id_usuario, { nome: a.nome ?? atual?.nome ?? null, email: a.usuario ?? atual?.email ?? null })
  }
  return mapa
}

/** Um número do resumo: rótulo, valor e linhas de apoio. */
function Numero({ rotulo, valor, children, destaque, icone }: { rotulo: string; valor: ReactNode; children?: ReactNode; destaque?: boolean; icone?: ReactNode }) {
  return <div className={'adm-kpi adm-fin-numero' + (destaque ? ' adm-fin-numero--destaque' : '')}>
    <span>{icone}{rotulo}</span><strong>{valor}</strong>{children}
  </div>
}

/**
 * Financeiro › Ganhos (painel de observação, 17/10/2026; base na revisão de 15/10/2026,
 * docs/admin/FINANCEIRO.md). De cima para baixo, cada número num lugar só:
 * 1. Ganhos: hoje, 7 dias, mês, ano e desde o começo, cada um com a base de comparação justa,
 *    a previsão de fechamento do mês e a receita dia a dia.
 * 2. Resumo do mês: recorrência, assinantes, novas, cancelamentos, renovações, Pix vencendo e
 *    pagamentos pendentes; últimas cobranças e assinaturas recentes.
 * 3. Previsão: o que vai entrar (recorrência no cartão e recompra do Pix).
 * 4. Histórico: o que já entrou (mês a mês, por meio e por plano).
 * 5. Base de assinantes agora (como pagam e por plano).
 * 6. Mês a mês (movimento e churn).
 * 7. Ações sensíveis, reunidas, cada uma com confirmação onde ela acontece.
 * Estimativa reconstruída a partir das assinaturas e das cobranças gravadas; o extrato oficial é o do Mercado Pago.
 */
export function AdminFinanceiro({ assinaturas, usuarios, testes = 0, reais = null, avisoReais = null, errosPagamento = 0, irPara }: {
  assinaturas: AssinaturaFinanceira[]; usuarios: number | null; testes?: number
  /** Cobranças gravadas no banco (RPC cobrancas_admin, parte 23); null sem a RPC: tudo pelo preço dos planos. */
  reais?: CobrancaReal[] | null
  /** Por que as cobranças gravadas não vieram (SQL não colado ou falha), para avisar. */
  avisoReais?: string | null
  errosPagamento?: number
  irPara?: (aba: Aba) => void
}) {
  const todas = useMemo(() => cobrancas(assinaturas, reais), [assinaturas, reais])
  const nomes = useMemo(() => nomesDasAssinaturas(assinaturas), [assinaturas])

  const d = useMemo(() => calcularFinanceiro(assinaturas, todas), [todas, assinaturas])
  const g = useMemo(() => calcularGanhos(todas), [todas])

  // Pix: suposição de recompra. A taxa começa na observada (quando já há Pix encerrados o bastante) e o dono ajusta.
  const { observado: pixObservado, taxa: taxaSugerida } = useMemo(() => taxaPixSugerida(assinaturas), [assinaturas])
  const [taxaEscolhida, escolherTaxa] = useState<number | null>(null)
  const taxaPix = taxaEscolhida ?? taxaSugerida
  const previsao = useMemo(() => {
    const agora = new Date()
    const pix = HORIZONTES.map(m => ({ meses: m, ...aReceberNoPix(assinaturas, m, taxaPix, agora) }))
    const doze = HORIZONTES.indexOf(12)
    const cartaoPorMes = new Map(d.aReceber[doze].porMes)
    const pontos: PontoEmpilhado[] = pix[doze].porMes.map(([k, v], i) => {
      const c = cartaoPorMes.get(k) ?? { valor: 0, quantidade: 0 }
      return { rotulo: `${NOME_MES(k)} · ${c.quantidade} no cartão, ~${Math.round(v.quantidade)} no Pix`, rotuloCurto: i === 0 || k.endsWith('-01') ? `${curto(k)} ${k.slice(2, 4)}` : curto(k), partes: [c.valor, v.valor] }
    })
    return { pix, pontos, pessoas: pix[doze].pessoas, fechamento: fechamentoDoMes(d.esteMes, d.chaveMes, d.aReceber[doze].porMes, pix[doze].porMes) }
  }, [assinaturas, taxaPix, d.aReceber, d.esteMes, d.chaveMes])
  const pctPix = Math.round(taxaPix * 100)

  const semCobranca = useMemo(() => assinaturas.filter(pagaSemCobranca), [assinaturas])
  const meses = useMemo(() => mesAMes(assinaturas, 12, new Date(), reais), [assinaturas, reais])
  const atual = meses[meses.length - 1], anterior = meses[meses.length - 2]
  const conversao = usuarios ? porcentagem(d.pagantes, usuarios) : null
  const ultimas = useMemo(() => [...todas].reverse().slice(0, 5), [todas])
  // Assinaturas recentes (antes em Hoje): as últimas que começaram, com plano, meio e situação.
  const recentes = useMemo(() => {
    const inicio = (a: AssinaturaFinanceira) => new Date(a.criada_em ?? a.inicio_periodo ?? a.ultima_atualizacao).getTime()
    return [...assinaturas].sort((a, b) => inicio(b) - inicio(a)).slice(0, 5)
  }, [assinaturas])
  // Pagamentos que ainda não caíram: Pix gerado e não pago, ou cartão aguardando o primeiro pagamento.
  const pendentes = useMemo(() => {
    const lista = assinaturas.filter(a => a.status === 'pendente')
    const semana = lista.filter(a => Date.now() - new Date(a.criada_em ?? a.ultima_atualizacao).getTime() < 7 * 86_400_000)
    return { total: lista.length, semana: semana.length, pix: semana.filter(a => meioDe(a) === 'pix').length }
  }, [assinaturas])
  const mesAtual = soMes(d.chaveMes), mesAnterior = soMes(d.chaveMesPassado)
  const novasAgora = (atual?.novasCartao ?? 0) + (atual?.novasPix ?? 0), novasAntes = (anterior?.novasCartao ?? 0) + (anterior?.novasPix ?? 0)
  const nomeDe = (id: string) => { const n = nomes.get(id); return n?.nome || n?.email || 'Pessoa sem nome' }
  const pontosDia = useMemo((): PontoEmpilhado[] => g.porDia.map(x => {
    const [, m, dd] = x.dia.split('-')
    return { rotulo: new Date(`${x.dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }), rotuloCurto: `${dd}/${m}`, partes: [Math.round(x.cartao * 100) / 100, Math.round(x.pix * 100) / 100] }
  }), [g.porDia])
  const quantas = (n: number) => plural(n, 'cobrança', 'cobranças')

  return <div className="empilha-2 adm-fin">
    {/* 1. Ganhos */}
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-financeiro">
      <div className="adm-secao__cabeca">
        <div>
          <p className="adm-fin-rotulo">Ganhos</p>
          <h2 id="adm-titulo-financeiro">Quanto entrou</h2>
          <p>Valores brutos, em dias e meses de Brasília.{testes > 0 && ` ${plural(testes, 'assinatura de teste do dono fica', 'assinaturas de teste do dono ficam')} de fora.`}</p>
        </div>
        <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-cobrancas-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Data', 'Pessoa', 'E-mail', 'Plano', 'Valor bruto', 'Meio', 'Tipo', 'Origem', 'Pagamento no Mercado Pago'], todas.map(c => [c.em.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), nomes.get(c.id_usuario)?.nome ?? '', nomes.get(c.id_usuario)?.email ?? '', rotuloPlano(c.plano), c.valor.toFixed(2).replace('.', ','), rotuloMeio(c.meio), rotuloTipoCobranca(c), c.estimada ? 'estimada (renovação reconstruída ou paga sem cobrança gravada)' : 'cobrança gravada', c.id_pagamento ?? '']))}>
          <Icone nome="baixar" tamanho={15} /> Exportar cobranças
        </button>
      </div>

      {avisoReais && <p className="adm-alerta" role="status">{avisoReais}</p>}
      {semCobranca.length > 0 && <div className="adm-alerta" role="status">
        <p><strong>{plural(semCobranca.length, 'assinatura paga sem a cobrança gravada', 'assinaturas pagas sem a cobrança gravada')}.</strong> Elas já entram nos totais pelo preço do plano, mas vale conferir no Mercado Pago e reprocessar o aviso em Financeiro › Avisos de pagamento:</p>
        <ul>{semCobranca.map(a => <li key={`${a.id_usuario}-${a.criada_em ?? a.ultima_atualizacao}`}>{a.nome || a.usuario || a.id_usuario} · {rotuloPlano(a.plano)} · {real(precoDe(a.plano)?.total ?? 0)} · desde {new Date(a.inicio_periodo ?? a.criada_em ?? a.ultima_atualizacao).toLocaleDateString('pt-BR')}</li>)}</ul>
      </div>}

      <div className="adm-ganhos" role="group" aria-label="Quanto entrou por período">
        <Numero rotulo={`Receita de ${mesAtual}`} valor={real(g.mes.valor)} destaque>
          <Comparacao atual={g.mes.valor} anterior={g.mesPassadoAteHoje.valor} base={`${mesAnterior} até o dia ${g.diaDoMes}`} formato={real} />
          <small>{mesAnterior} inteiro: {real(d.mesPassado)}</small>
        </Numero>
        <Numero rotulo="Hoje" valor={real(g.hoje.valor)}>
          <Comparacao atual={g.hoje.valor} anterior={g.ontem.valor} base="ontem" formato={real} />
          <small>{quantas(g.hoje.quantidade)}</small>
        </Numero>
        <Numero rotulo="Últimos 7 dias" valor={real(g.semana.valor)}>
          <Comparacao atual={g.semana.valor} anterior={g.semanaAnterior.valor} base="os 7 dias antes" formato={real} />
          <small>{quantas(g.semana.quantidade)}</small>
        </Numero>
        <Numero rotulo={`Em ${g.chaveAno}`} valor={real(g.ano.valor)}>
          <small>{quantas(g.ano.quantidade)} desde 1º de janeiro</small>
        </Numero>
        <Numero rotulo="Desde o começo" valor={real(d.total)}>
          <small>{d.primeira ? `desde ${d.primeira.toLocaleDateString('pt-BR')} · ${real(d.mediaMensal)} por mês em média` : 'nenhuma cobrança ainda'}</small>
        </Numero>
      </div>

      <div className="adm-fin-fechamento">
        <div>
          <span>Previsão de fechamento de {mesAtual}</span>
          <strong>{real(previsao.fechamento.total)}</strong>
        </div>
        <p>
          <b>{real(previsao.fechamento.recebido)}</b> já recebidos
          {' + '}<b>{real(previsao.fechamento.cartao.valor)}</b> de {plural(previsao.fechamento.cartao.quantidade, 'renovação', 'renovações')} do cartão até o fim do mês
          {' + '}<b>~{real(previsao.fechamento.pix.valor)}</b> se {pctPix}% de quem tem Pix vencendo neste mês recomprar. Assinaturas novas entram por cima.
        </p>
      </div>

      <GraficoColunasEmpilhadas titulo="Receita por dia" subtitulo="últimos 30 dias, cartão e Pix" pontos={pontosDia} series={SERIES} formato={real} rotuloTabela="Dia" />

      <details className="adm-fin-como">
        <summary>Como estes números são calculados</summary>
        <p>{reais
          ? 'Cobranças gravadas no banco: Pix pelo valor pago, cartão pelo valor contratado no checkout. O banco guarda só a última cobrança de cada cartão; as renovações anteriores são reconstruídas a cada período do plano (marcadas como estimadas). Reembolsos descontados.'
          : 'Reconstruídos a partir das assinaturas: cada cobrança pelo preço do plano; reembolsos descontados.'} Cartão renova sozinho; Pix é compra avulsa, sem renovação. Os valores são brutos: não descontam a taxa do Mercado Pago e não substituem o extrato dele.</p>
        <p>Nova, renovação ou volta é decidido pela pessoa, não pela assinatura: a primeira compra paga é a nova; pagar de novo com o acesso valendo (ou até 30 dias depois do fim) é renovação, no Pix ou no cartão, inclusive quem passou do Pix para o cartão; pagar depois disso é "voltou a assinar". Assinantes com acesso contam pessoas, então quem renovou o Pix antes do fim não conta duas vezes.</p>
        <p>Receita recorrente por mês = soma dos cartões que renovam sozinhos, cada um dividido pelos meses do plano (anual ÷ 12, semestral ÷ 6). Pix não entra, porque não renova.</p>
        <p>A receita do mês é comparada com o mês passado até o mesmo dia, para não comparar meio mês com um mês inteiro.</p>
      </details>
    </section>

    {/* 2. Resumo do mês */}
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-situacao">
      <div><p className="adm-fin-rotulo">Resumo de {mesAtual}</p><h2 id="adm-titulo-situacao">Assinaturas e recorrência</h2><p className="adm-nota">Comparado com {mesAnterior}.</p></div>
      <div className="adm-fin-resumo">
        <Numero rotulo="Receita recorrente por mês" valor={real(d.mrr)} destaque>
          <small>{plural(d.recorrentes.length, 'cartão renovando sozinho', 'cartões renovando sozinhos')} · {real(d.valorRecorrente)} por ciclo</small>
        </Numero>
        <Numero rotulo="Assinantes com acesso" valor={d.comAcesso.toLocaleString('pt-BR')}>
          <small>pessoas, cada uma contada uma vez (renovar não soma) · {d.renovamAgora} no cartão que renova · {d.pixComAcesso} no Pix{d.cartaoSemRenovar ? ` · ${d.cartaoSemRenovar} cancelado(s) com acesso` : ''}</small>
          <small>conversão {conversao === null ? '—' : `${conversao}%`}: {d.pagantes} de {usuarios ?? '—'} cadastrados já pagaram</small>
        </Numero>
        <Numero rotulo={`Assinaturas novas em ${mesAtual}`} valor={novasAgora}>
          <Comparacao atual={novasAgora} anterior={novasAntes} base={mesAnterior} />
          <small>primeira compra de cada pessoa · {atual?.novasCartao ?? 0} no cartão · {atual?.novasPix ?? 0} no Pix · {real(atual?.receitaNovas ?? 0)}</small>
          {(atual?.voltas ?? 0) > 0 && <small>+ {plural(atual?.voltas ?? 0, 'pessoa voltou', 'pessoas voltaram')} a assinar ({real(atual?.receitaVoltas ?? 0)})</small>}
        </Numero>
        <Numero rotulo={`Cancelamentos em ${mesAtual}`} valor={atual?.cancelamentos ?? 0}>
          <Comparacao atual={atual?.cancelamentos ?? 0} anterior={anterior?.cancelamentos ?? 0} base={mesAnterior} bom="desce" />
          <small>renovação do cartão desligada · {plural(atual?.reembolsos ?? 0, 'reembolso', 'reembolsos')}</small>
        </Numero>
        <Numero rotulo={`Renovações em ${mesAtual}`} valor={atual?.renovacoes ?? 0}>
          <Comparacao atual={atual?.renovacoes ?? 0} anterior={anterior?.renovacoes ?? 0} base={mesAnterior} />
          <small>{(atual?.renovacoes ?? 0) - (atual?.renovacoesPix ?? 0)} no cartão · {atual?.renovacoesPix ?? 0} no Pix · {real(atual?.receitaRenovacoes ?? 0)} renovados</small>
          <small>{d.taxaRenovacaoMes === null ? 'taxa de renovação: ninguém venceu no mês ainda' : `taxa de renovação ${d.taxaRenovacaoMes}%: ${d.renovaramMes} de ${d.renovaramMes + d.perderamMes} que venciam`}</small>
        </Numero>
        <Numero rotulo="Renovações em 30 dias" valor={d.renovacoes30}>
          <small>{real(d.valorRenovacoes30)} previstos no cartão, se ninguém cancelar</small>
        </Numero>
        <Numero rotulo="Pix que vencem em 30 dias" valor={d.pixAcabando30}>
          <small>~{real(previsao.pix[0].valor)} se {pctPix}% recomprarem no próximo mês</small>
          <small>bons candidatos a um lembrete de renovação</small>
        </Numero>
        <Numero rotulo="Pagamentos pendentes" valor={pendentes.semana}>
          <small>{pendentes.semana ? `nos últimos 7 dias (${pendentes.pix} no Pix): gerados e ainda não pagos` : 'nenhum nos últimos 7 dias'}</small>
          <small>{plural(pendentes.total, 'pendente', 'pendentes')} no histórico</small>
          {irPara && pendentes.total > 0 && <button type="button" className="adm-link" onClick={() => irPara('assinaturas')}>Ver em Assinaturas <Icone nome="direita" tamanho={13} /></button>}
        </Numero>
      </div>

      <div className="adm-duas">
        <div className="adm-fin-ultimas">
          <div className="adm-secao__cabeca"><h3>Últimas cobranças</h3>{irPara && <button type="button" className="adm-link" onClick={() => irPara('cobrancas')}>Ver todas <Icone nome="direita" tamanho={14} /></button>}</div>
          {ultimas.length === 0 ? <p className="adm-vazio">Nenhuma cobrança ainda.</p> : <ol className="adm-mini">
            {ultimas.map((c, i) => <li key={`${c.id_usuario}-${c.em.getTime()}-${i}`}>
              <span className="adm-mini__nome"><span className="adm-reticencias">{nomeDe(c.id_usuario)}</span><small>{c.em.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · {rotuloPlano(c.plano)} · {rotuloMeio(c.meio)} · {rotuloTipoCobranca(c)}{c.estimada ? ' · estimada' : ''}</small></span>
              <span className="adm-mini__valor numerico">{real(c.valor)}</span>
            </li>)}
          </ol>}
        </div>
        <div className="adm-fin-ultimas">
          <div className="adm-secao__cabeca"><h3>Assinaturas recentes</h3>{irPara && <button type="button" className="adm-link" onClick={() => irPara('assinaturas')}>Ver todas <Icone nome="direita" tamanho={14} /></button>}</div>
          {recentes.length === 0 ? <p className="adm-vazio">Nenhuma assinatura ainda.</p> : <ol className="adm-mini">
            {recentes.map(a => <li key={`${a.id_usuario}:${a.ultima_atualizacao}`}>
              <span className="adm-mini__nome"><span className="adm-reticencias">{a.nome ?? a.usuario ?? 'Pessoa sem nome'}</span><small>{rotuloPlano(a.plano)} · {rotuloMeio(meioDe(a))} · {situacaoAssinatura(a).rotulo}</small></span>
              <span className="adm-mini__valor">{haQuanto(a.criada_em ?? a.inicio_periodo ?? a.ultima_atualizacao)}</span>
            </li>)}
          </ol>}
        </div>
      </div>
    </section>

    {/* 3. Previsão */}
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-previsao">
      <div><p className="adm-fin-rotulo">Previsão</p><h2 id="adm-titulo-previsao">O que vai entrar</h2>
        <p className="adm-nota">{plural(d.recorrentes.length, 'cartão renova', 'cartões renovam')} sozinho(s), somando {real(d.valorRecorrente)} por ciclo ({real(d.mrr)} por mês); o Pix entra pela recompra estimada abaixo.</p></div>
      <div className="adm-fin-receber adm-fin-receber--linha">
        {d.aReceber.map((x, i) => { const pix = previsao.pix[i]; return <div className="adm-kpi" key={x.meses}>
          <span>{x.meses === 1 ? 'Próximo mês' : `Próximos ${x.meses} meses`}</span>
          <strong>{real(x.valor + pix.valor)}</strong>
          <small><i className="adm-serie-cartao" aria-hidden="true" />Cartão <b>{real(x.valor)}</b> <span>· {plural(x.cobrancas, 'renovação', 'renovações')}</span></small>
          <small><i className="adm-serie-pix-estimado" aria-hidden="true" />Pix <b>~{real(pix.valor)}</b> <span>· ~{plural(Math.round(pix.renovacoes), 'recompra', 'recompras')}</span></small>
        </div> })}
      </div>
      <div className="adm-fin-pix" role="group" aria-labelledby="adm-pix-titulo">
        <div className="adm-fin-pix__texto">
          <strong id="adm-pix-titulo">E se quem pagou Pix comprar de novo?</strong>
          <p>O Pix não renova sozinho, mas muita gente recompra quando o acesso acaba. Para {plural(previsao.pessoas, 'pessoa', 'pessoas')} com Pix vigente, conta {pctPix}% do plano no dia em que o acesso termina; quem recompra pode recomprar de novo no fim do plano seguinte ({pctPix}% de {pctPix}%, e assim por diante). Quem também tem cartão renovando fica só no cartão.</p>
          <small>{pixObservado.encerrados === 0
            ? 'Ainda não há Pix encerrado há mais de 30 dias para medir a taxa real; a suposição começa em 60%.'
            : `Na prática: ${pixObservado.renovados} de ${pixObservado.encerrados} Pix já encerrados (${Math.round((pixObservado.taxa ?? 0) * 100)}%) foram renovados até 30 dias depois do fim, no Pix ou no cartão${pixObservado.encerrados < MINIMO_PARA_OBSERVADA ? '; amostra pequena, por isso a suposição começa em 60%' : ''}.`}</small>
        </div>
        <div className="adm-fin-pix__controle">
          <input type="range" min={0} max={100} step={1} value={pctPix} aria-label="Porcentagem de quem pagou Pix e recompra" aria-valuetext={`${pctPix}% recompram`} onChange={e => escolherTaxa(Number(e.target.value) / 100)} />
          <output aria-live="polite">{pctPix}%</output>
          <div className="adm-fin-pix__atalhos">
            {pixObservado.taxa !== null && <button type="button" aria-pressed={Math.abs(taxaPix - Math.round(pixObservado.taxa * 100) / 100) < 0.001} onClick={() => escolherTaxa(Math.round(pixObservado.taxa! * 100) / 100)}>Real ({Math.round(pixObservado.taxa * 100)}%)</button>}
            {[0.3, 0.5, 0.7, 0.9].map(t => <button type="button" key={t} aria-pressed={Math.abs(taxaPix - t) < 0.001} onClick={() => escolherTaxa(t)}>{t === 0.3 ? 'Pessimista' : t === 0.5 ? 'Metade' : t === 0.7 ? 'Otimista' : 'Quase todos'} ({Math.round(t * 100)}%)</button>)}
          </div>
        </div>
      </div>
      <GraficoColunasEmpilhadas titulo="Previsão mês a mês" subtitulo={`próximos 12 meses; cartão se ninguém cancelar, Pix se ${pctPix}% recomprarem. Assinaturas novas entram por cima`}
        pontos={previsao.pontos} series={SERIES_PREVISAO} formato={real} previsto />
      <details className="adm-grafico__tabela"><summary>Ver os {plural(d.recorrentes.length, 'cartão que renova', 'cartões que renovam')} sozinho(s)</summary>
        {d.recorrentes.length === 0 ? <p className="adm-vazio">Nenhum cartão renovando sozinho agora.</p> :
          <div className="adm-tabela-rolagem" role="region" aria-label="Cartões que renovam sozinhos" tabIndex={0}><table className="tabela adm-tabela">
            <thead><tr><th scope="col">Assinante</th><th scope="col">Plano</th><th scope="col">Valor do plano</th><th scope="col">Por mês</th><th scope="col">Próxima renovação</th></tr></thead>
            <tbody>{d.recorrentes.map((x, i) => <tr key={`${x.assinatura.id_usuario}-${i}`}>
              <td>{x.assinatura.nome || x.assinatura.usuario || x.assinatura.id_usuario.slice(0, 8)}</td><td>{x.plano}</td>
              <td className="numerico">{real(x.valor)}</td><td className="numerico">{real(x.mensal)}</td>
              <td>{x.proxima ? new Date(x.proxima).toLocaleDateString('pt-BR') : 'sem data'}</td>
            </tr>)}</tbody>
          </table></div>}
      </details>
    </section>

    {/* 3. Histórico */}
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-entrou">
      <div><p className="adm-fin-rotulo">Histórico</p><h2 id="adm-titulo-entrou">O que já entrou</h2></div>
      <div className="adm-kpis">
        <div className="adm-kpi"><span>Média por mês</span><strong>{real(d.mediaMensal)}</strong><small>desde a primeira cobrança</small></div>
        <div className="adm-kpi"><span>Ticket médio</span><strong>{real(d.ticket)}</strong><small>por cobrança paga</small></div>
        <div className="adm-kpi"><span>Por pagante</span><strong>{real(d.porPagante)}</strong><small>{plural(d.pagantes, 'pessoa já pagou', 'pessoas já pagaram')}</small></div>
      </div>
      <GraficoColunasEmpilhadas titulo="Receita por mês" subtitulo="últimos 12 meses, cartão e Pix" pontos={d.serie} series={SERIES} formato={real} />
      <div className="adm-duas">
        <section className="empilha" aria-labelledby="adm-titulo-meio">
          <div><h3 id="adm-titulo-meio">Por meio de pagamento</h3><p className="adm-nota">Total recebido desde o começo.</p></div>
          <BarraComposicao formato={real} partes={[
            { nome: 'Cartão', valor: d.receitaCartao, classe: 'adm-serie-cartao', detalhe: `${plural(d.renovacoes, 'renovação automática', 'renovações automáticas')}, ${real(d.receitaRenovacoes)}` },
            { nome: 'Pix', valor: d.receitaPix, classe: 'adm-serie-pix', detalhe: plural(d.pagasPix, 'compra avulsa', 'compras avulsas') },
          ]} />
        </section>
        <section className="empilha" aria-labelledby="adm-titulo-planos-receita">
          <div><h3 id="adm-titulo-planos-receita">Por plano</h3><p className="adm-nota">Total recebido desde o começo.</p></div>
          <BarrasHorizontais formato={v => real(v)} itens={d.receitaPorPlano.map(p => ({ rotulo: p.nome, valor: p.valor, detalhe: `${plural(p.cobrancas, 'cobrança', 'cobranças')}${d.total ? ` · ${porcentagem(p.valor, d.total)}% do total` : ''}` }))} />
        </section>
      </div>
    </section>

    {/* 4. Base de assinantes */}
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-base">
      <div><p className="adm-fin-rotulo">Agora</p><h2 id="adm-titulo-base">Base de assinantes</h2><p className="adm-nota">Os totais estão no resumo do mês; aqui, como pagam e em que plano.</p></div>
      <div className="adm-duas">
        <section className="empilha" aria-labelledby="adm-titulo-composicao-base">
          <div><h3 id="adm-titulo-composicao-base">Como pagam</h3><p className="adm-nota">Quem tem acesso pago agora.</p></div>
          <BarraComposicao partes={[
            { nome: 'Cartão que renova', valor: d.renovamAgora, classe: 'adm-serie-cartao' },
            { nome: 'Pix', valor: d.pixComAcesso, classe: 'adm-serie-pix', detalhe: d.cartaoSemRenovar ? `${d.cartaoSemRenovar} cartão(ões) cancelado(s) com acesso ficam fora da barra` : undefined },
          ]} />
        </section>
        <section className="empilha" aria-labelledby="adm-titulo-planos-base">
          <div><h3 id="adm-titulo-planos-base">Por plano</h3><p className="adm-nota">Receita recorrente por mês de cada plano (só o que renova sozinho).</p></div>
          <BarrasHorizontais formato={v => real(v)} itens={d.porPlano.map(p => ({ rotulo: `${p.nome} · ${p.vigentes} com acesso`, valor: p.mensal, detalhe: `${real(p.total)} a cada ${p.meses === 1 ? 'mês' : `${p.meses} meses`} · ${p.renovam} renovam${p.pix ? ` · ${p.pix} no Pix` : ''}${p.cartaoSemRenovar > 0 ? ` · ${p.cartaoSemRenovar} cancelado(s) com acesso` : ''}` }))} />
        </section>
      </div>
    </section>

    {/* 5. Mês a mês */}
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-mensal">
      <div><p className="adm-fin-rotulo">Movimento</p><h2 id="adm-titulo-mensal">Mês a mês</h2><p className="adm-nota">Assinaturas novas, renovações automáticas, cancelamentos, reembolsos e Pix encerrados em cada mês.</p></div>
      <div className="adm-kpis">
        <div className="adm-kpi"><span>Reembolsos em {mesAtual}</span><strong>{atual?.reembolsos ?? 0}</strong><small>{real(atual?.valorReembolsado ?? 0)} devolvidos</small></div>
        <div className="adm-kpi"><span>Pix encerrados em {mesAtual}</span><strong>{atual?.pixEncerrados ?? 0}</strong><small>acesso terminou sem renovar (normal no Pix)</small></div>
        <div className="adm-kpi"><span>Cancelamento acumulado</span><strong>{d.pagasCartao ? `${porcentagem(d.cancelaram, d.pagasCartao)}%` : '—'}</strong><small>{d.cancelaram} de {d.pagasCartao} no cartão desligaram a renovação · {plural(d.reembolsos, 'reembolso', 'reembolsos')}</small></div>
      </div>
      <TabelaMensal meses={meses} />
    </section>

    {/* 6. Ações sensíveis */}
    <section className="empilha adm-secao adm-fin-acoes" aria-labelledby="adm-titulo-acoes">
      <div><p className="adm-fin-rotulo">Ações sensíveis</p><h2 id="adm-titulo-acoes">Reembolso, cortesia, cancelamento e avisos</h2>
        <p className="adm-nota">Tudo o que mexe em dinheiro ou em acesso fica aqui reunido. Cada ação pede confirmação no lugar onde acontece, e nenhuma muda preço, plano ou regra de pagamento.</p></div>
      <ul className="adm-acoes-lista">
        <li className={errosPagamento ? 'adm-acao adm-acao--alerta' : 'adm-acao'}>
          <span className="adm-acao__icone" aria-hidden="true"><Icone nome="reiniciar" tamanho={18} /></span>
          <div><strong>Reprocessar aviso do Mercado Pago</strong><p>{errosPagamento ? `${plural(errosPagamento, 'aviso precisa', 'avisos precisam')} de atenção.` : 'Nenhum aviso com problema agora.'} O site consulta o Mercado Pago de novo e aplica o que ele disser; nada é cobrado nem devolvido.</p></div>
          {irPara && <button type="button" className="botao botao--fantasma" onClick={() => irPara('pagamentos')}>Abrir avisos</button>}
        </li>
        <li className="adm-acao">
          <span className="adm-acao__icone" aria-hidden="true"><Icone nome="estrela" tamanho={18} /></span>
          <div><strong>Conceder ou remover cortesia</strong><p>Acesso sem pagar, para preceptores, parceiros e sorteios. Fica na ficha da pessoa (Pessoas › Usuários › ficha › Carta e ações), com confirmação.</p></div>
          {irPara && <button type="button" className="botao botao--fantasma" onClick={() => irPara('usuarios')}>Abrir pessoas</button>}
        </li>
        <li className="adm-acao">
          <span className="adm-acao__icone" aria-hidden="true"><Icone nome="cadeado" tamanho={18} /></span>
          <div><strong>Reembolso e cancelamento</strong><p>A própria pessoa pede em Minha conta › Assinatura (reembolso integral em até 7 dias da cobrança; o cancelamento desliga a renovação e o acesso vale até o fim do período). O site só marca "Reembolsada" depois que o Mercado Pago confirma. Fora disso, faça direto no Mercado Pago.</p></div>
          <a className="botao botao--fantasma" href="https://www.mercadopago.com.br/activities" target="_blank" rel="noopener noreferrer">Abrir o Mercado Pago</a>
        </li>
      </ul>
    </section>
  </div>
}

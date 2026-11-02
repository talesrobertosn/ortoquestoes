import { useMemo, useState } from 'react'
import { HORIZONTES, MINIMO_PARA_OBSERVADA, calcularFinanceiro, curto, taxaPixSugerida } from '../../componentes/admin/financeiro'
import { baixarCsv, porcentagem } from '../../componentes/admin/formatos'
import { calcularGanhos, fechamentoDoMes } from '../../componentes/admin/ganhos'
import { NOME_MES, aReceberNoPix, cobrancas as cobrancasDe, mesAMes, pagaSemCobranca, precoDe, type Mes } from '../../componentes/admin/receita'
import { rotuloMeio, rotuloPlano, rotuloTipoCobranca } from '../../componentes/admin/rotulos'
import { receitaDoPeriodo } from '../dados/metricas'
import { usarPainel, type LinhaAssinatura } from '../dados/painel'
import { usarNav } from '../nav'
import { PERIODOS, defAba } from '../rotas'
import { Icone } from '../ui/Icone'
import { data, diaDaSerie, inteiro, pct, reais } from '../ui/formato'
import { Composicao, Legenda, Quadro, SerieTempo } from '../ui/graficos'
import { Cabeca, Carregando, Estado, Faixa, Metrica, Painel, Segmento, SeloQualidade, VariacaoTexto } from '../ui/kit'
import { Tabela } from '../ui/tabela'
import { variacao } from '../dados/metricas'

/** Receita › Visão financeira e Receita › Previsão. */
export default function Receita() {
  const { estado } = usarNav()
  const p = usarPainel()
  if (!p.reais) return <Carregando linhas={8} />
  if (p.cobrancasCarregando) return <Carregando linhas={8} texto="Carregando as cobranças…" />
  return estado.sub === 'previsao' ? <Previsao assinaturas={p.reais} /> : <Visao assinaturas={p.reais} />
}

const plural = (n: number, um: string, varios: string) => `${inteiro(n)} ${n === 1 ? um : varios}`
const soMes = (k: string) => NOME_MES(k).replace(/ de \d{4}$/, '')

function usarNomes(assinaturas: LinhaAssinatura[]) {
  return useMemo(() => {
    const m = new Map<string, { nome: string | null; email: string | null }>()
    for (const a of assinaturas) { const x = m.get(a.id_usuario); if (!x || (!x.nome && a.nome)) m.set(a.id_usuario, { nome: a.nome ?? x?.nome ?? null, email: a.usuario ?? x?.email ?? null }) }
    return m
  }, [assinaturas])
}

function Visao({ assinaturas }: { assinaturas: LinhaAssinatura[] }) {
  const p = usarPainel()
  const nav = usarNav()
  const periodo = nav.estado.periodo
  const todas = useMemo(() => cobrancasDe(assinaturas, p.cobrancas), [assinaturas, p.cobrancas])
  const d = useMemo(() => calcularFinanceiro(assinaturas, todas), [assinaturas, todas])
  const g = useMemo(() => calcularGanhos(todas), [todas])
  const r = useMemo(() => receitaDoPeriodo(assinaturas, p.cobrancas, periodo), [assinaturas, p.cobrancas, periodo])
  const meses = useMemo(() => mesAMes(assinaturas, 12, new Date(), p.cobrancas), [assinaturas, p.cobrancas])
  const nomes = usarNomes(assinaturas)
  const semCobranca = useMemo(() => assinaturas.filter(pagaSemCobranca), [assinaturas])
  const atual = meses[meses.length - 1], anterior = meses[meses.length - 2]
  const mesAtual = soMes(d.chaveMes), mesAnterior = soMes(d.chaveMesPassado)
  const parte = defAba('financeiro')
  const exportar = () => baixarCsv(`ortoquestoes-cobrancas-${new Date().toISOString().slice(0, 10)}.csv`, ['Data', 'Pessoa', 'E-mail', 'Plano', 'Valor bruto', 'Meio', 'Tipo', 'Origem', 'Pagamento no Mercado Pago'],
    todas.map(c => [c.em.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), nomes.get(c.id_usuario)?.nome ?? '', nomes.get(c.id_usuario)?.email ?? '', rotuloPlano(c.plano), c.valor.toFixed(2).replace('.', ','), rotuloMeio(c.meio), rotuloTipoCobranca(c), c.estimada ? 'estimada (renovação antiga ou paga sem cobrança gravada)' : 'cobrança gravada', c.id_pagamento ?? '']))
  const novasAgora = (atual?.novasCartao ?? 0) + (atual?.novasPix ?? 0), novasAntes = (anterior?.novasCartao ?? 0) + (anterior?.novasPix ?? 0)
  const usuarios = p.resumo?.usuarios ?? p.usuarios?.length ?? null
  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Financeiro" titulo={parte.rotulo} pergunta={`${parte.pergunta} Valores brutos, em dias e meses de São Paulo; o extrato oficial é o do Mercado Pago.${p.testes ? ` ${plural(p.testes, 'assinatura de teste do dono fica', 'assinaturas de teste do dono ficam')} de fora.` : ''}`}
      acoes={<><Segmento rotulo="Período" valor={periodo} aoMudar={x => nav.ajustar({ periodo: x })} opcoes={PERIODOS.map(x => [x, `${x} dias`] as [typeof x, string])} />
        <button type="button" className="a3-botao a3-botao--contorno" onClick={exportar}><Icone nome="baixar" tamanho={15} />CSV das cobranças</button></>} />
    {p.avisoCobrancas && <Faixa tom="aviso" titulo="Cobranças gravadas indisponíveis">{p.avisoCobrancas}</Faixa>}
    {semCobranca.length > 0 && <Faixa tom="aviso" titulo={plural(semCobranca.length, 'assinatura paga sem a cobrança gravada', 'assinaturas pagas sem a cobrança gravada')}>
      Entram como estimadas, pelo preço do plano. Vale conferir no Mercado Pago e reprocessar o aviso: {semCobranca.slice(0, 4).map(a => `${a.nome || a.usuario} (${rotuloPlano(a.plano)}, desde ${data(a.inicio_periodo ?? a.criada_em ?? a.ultima_atualizacao)})`).join('; ')}{semCobranca.length > 4 ? '…' : ''}
    </Faixa>}

    <section className="a3-painel" aria-label="Quanto entrou por período">
      <div className="a3-faixa-metricas" style={{ '--colunas': 5 } as React.CSSProperties}>
        <Metrica rotulo={`Receita de ${mesAtual}`} grande valor={reais(g.mes.valor)} qualidade="derivado" variacao={variacao(g.mes.valor, g.mesPassadoAteHoje.valor)} formato={reais}
          nota={`contra ${mesAnterior} até o dia ${g.diaDoMes} · ${mesAnterior} inteiro: ${reais(d.mesPassado)}`} />
        <Metrica rotulo="Hoje" valor={reais(g.hoje.valor)} qualidade="derivado" variacao={variacao(g.hoje.valor, g.ontem.valor)} formato={reais} nota={plural(g.hoje.quantidade, 'cobrança', 'cobranças')} />
        <Metrica rotulo="Últimos 7 dias" valor={reais(g.semana.valor)} qualidade="derivado" variacao={variacao(g.semana.valor, g.semanaAnterior.valor)} formato={reais} nota={plural(g.semana.quantidade, 'cobrança', 'cobranças')} />
        <Metrica rotulo={`Em ${g.chaveAno}`} valor={reais(g.ano.valor)} qualidade="derivado" nota={`${plural(g.ano.quantidade, 'cobrança', 'cobranças')} desde 1º de janeiro`} />
        <Metrica rotulo="Desde o começo" valor={reais(d.total)} qualidade="derivado" nota={d.primeira ? `desde ${data(d.primeira)} · ${reais(d.mediaMensal)} por mês` : 'nenhuma cobrança ainda'} />
      </div>
    </section>

    <Quadro titulo={`Receita por dia · últimos ${periodo} dias`} descricao="Confirmado (cobrança gravada) em preto; estimado (renovação antiga do cartão ou paga sem registro) hachurado. Os dois nunca viram um número só."
      fonte="cobrancas_admin + listar_assinaturas_admin · contas de teste fora" qualidade="derivado"
      legenda={<Legenda itens={[{ nome: 'Confirmado', chave: 'serie1' }, { nome: 'Estimado', chave: 'hachura' }]} />}
      tabela={{ cabecalho: ['Dia', 'Confirmado', 'Estimado'], linhas: r.porDia.filter(x => x.confirmada || x.reconstruida).map(x => [diaDaSerie(x.dia, true), reais(x.confirmada), reais(x.reconstruida)]) }}
      estado={r.porDia.every(x => !x.confirmada && !x.reconstruida) ? <Estado compacto titulo={`Nenhuma cobrança nos últimos ${periodo} dias`} texto="É zero de verdade, não falta de dado." /> : undefined}>
      <div className="a3-grade a3-grade--12" style={{ alignItems: 'start' }}>
        <div style={{ gridColumn: 'span 8' }}><SerieTempo descricao={`Receita por dia, confirmada e estimada, nos últimos ${periodo} dias`} formato={reais}
          rotulos={r.porDia.map(x => ({ longo: diaDaSerie(x.dia, true), curto: diaDaSerie(x.dia) }))}
          series={[{ nome: 'Confirmado', tipo: 'barra', valores: r.porDia.map(x => x.confirmada) }, { nome: 'Estimado', tipo: 'barra', estilo: 'hachura', valores: r.porDia.map(x => x.reconstruida) }]} /></div>
        <dl className="a3-pares" style={{ gridColumn: 'span 4' }}>
          <div><dt>Confirmado</dt><dd>{reais(r.confirmada.atual)} <VariacaoTexto v={r.confirmada} formato={reais} curto /></dd></div>
          <div><dt>Estimado (à parte)</dt><dd>{reais(r.reconstruida)}</dd></div>
          <div><dt>Primeiras assinaturas</dt><dd>{r.novas.atual} <VariacaoTexto v={r.novas} curto /></dd></div>
          <div><dt>Renovações</dt><dd>{r.renovacoes}</dd></div>
          <div><dt>Pix · cartão</dt><dd>{reais(r.porMeio.pix)} · {reais(r.porMeio.cartao)}</dd></div>
        </dl>
      </div>
    </Quadro>

    <div className="a3-grade a3-grade--12">
      <div style={{ gridColumn: 'span 8' }}>
        <Quadro titulo="Receita por mês" descricao="Últimos 12 meses, cartão e Pix empilhados" fonte="receita.ts › cobrancas (confirmado + estimado)" qualidade="derivado"
          legenda={<Legenda itens={[{ nome: 'Cartão', chave: 'serie1' }, { nome: 'Pix', chave: 'serie2' }]} />}
          tabela={{ cabecalho: ['Mês', 'Cartão', 'Pix', 'Total'], linhas: d.serie.map(x => [x.rotulo, reais(x.partes[0]), reais(x.partes[1]), reais(x.partes[0] + x.partes[1])]) }}>
          <SerieTempo descricao="Receita por mês nos últimos 12 meses" formato={reais} altura={220} rotulos={d.serie.map(x => ({ longo: x.rotulo, curto: x.rotuloCurto }))}
            series={[{ nome: 'Cartão', tipo: 'barra', valores: d.serie.map(x => x.partes[0]) }, { nome: 'Pix', tipo: 'barra', estilo: 2, valores: d.serie.map(x => x.partes[1]) }]} />
        </Quadro>
      </div>
      <div style={{ gridColumn: 'span 4' }} className="a3-pilha">
        <Painel titulo="Composição desde o começo">
          <div className="a3-pilha">
            <span className="a3-rotulo">Por meio</span>
            <Composicao formato={reais} partes={[{ nome: 'Cartão', valor: d.receitaCartao }, { nome: 'Pix', valor: d.receitaPix }]} />
            <span className="a3-rotulo">Por plano</span>
            <Composicao formato={reais} partes={d.receitaPorPlano.map(x => ({ nome: `${x.nome} · ${x.cobrancas}`, valor: x.valor }))} />
            <dl className="a3-pares">
              <div><dt>Ticket médio</dt><dd>{reais(d.ticket)}</dd></div>
              <div><dt>Por pagante</dt><dd>{reais(d.porPagante)} <span className="a3-mudo">({d.pagantes})</span></dd></div>
            </dl>
          </div>
        </Painel>
      </div>
    </div>

    <div className="a3-grade a3-grade--2">
      <Painel titulo="Base de assinantes agora" descricao="Pessoas com acesso pago; renovar não soma">
        <dl className="a3-pares">
          <div><dt>Com acesso</dt><dd>{inteiro(d.comAcesso)}</dd></div>
          <div><dt>Cartão que renova sozinho</dt><dd>{inteiro(d.renovamAgora)}</dd></div>
          <div><dt>Pix</dt><dd>{inteiro(d.pixComAcesso)}</dd></div>
          <div><dt>Cancelados que ainda têm acesso</dt><dd>{inteiro(d.cartaoSemRenovar)}</dd></div>
          <div><dt>Receita recorrente por mês</dt><dd>{reais(d.mrr)} <SeloQualidade q="derivado" /></dd></div>
          <div><dt>Conversão</dt><dd>{usuarios ? `${pct(porcentagem(d.pagantes, usuarios))} · ${d.pagantes} de ${inteiro(usuarios)} já pagaram` : '—'}</dd></div>
        </dl>
        <div style={{ marginTop: 16 }}><Tabela rotulo="Base por plano" compacta linhas={d.porPlano} chave={x => x.id} colunas={[
          { id: 'p', titulo: 'Plano', celula: x => <span className="a3-nome">{x.nome}</span> },
          { id: 'v', titulo: 'Com acesso', numero: true, celula: x => inteiro(x.vigentes), rotuloCelular: 'Com acesso' },
          { id: 'r', titulo: 'Renovam', numero: true, celula: x => inteiro(x.renovam), rotuloCelular: 'Renovam' },
          { id: 'x', titulo: 'Pix', numero: true, celula: x => inteiro(x.pix), rotuloCelular: 'Pix' },
          { id: 'm', titulo: 'Por mês', numero: true, celula: x => reais(x.mensal), rotuloCelular: 'Por mês' },
        ]} /></div>
      </Painel>
      <Painel titulo={`Movimento de ${mesAtual}`} descricao={`Comparado com ${mesAnterior}`}>
        <dl className="a3-pares">
          <div><dt>Primeiras assinaturas</dt><dd>{novasAgora} <VariacaoTexto v={variacao(novasAgora, novasAntes)} curto /> <span className="a3-mudo">· {atual?.novasCartao ?? 0} cartão · {atual?.novasPix ?? 0} Pix</span></dd></div>
          {(atual?.voltas ?? 0) > 0 && <div><dt>Voltaram a assinar</dt><dd>{atual?.voltas} · {reais(atual?.receitaVoltas ?? 0)}</dd></div>}
          <div><dt>Renovações</dt><dd>{atual?.renovacoes ?? 0} <VariacaoTexto v={variacao(atual?.renovacoes ?? 0, anterior?.renovacoes ?? 0)} curto /> <span className="a3-mudo">· {reais(atual?.receitaRenovacoes ?? 0)}</span></dd></div>
          <div><dt>Taxa de renovação do mês</dt><dd>{d.taxaRenovacaoMes === null ? <span className="a3-mudo">ninguém venceu ainda</span> : `${d.taxaRenovacaoMes}% · ${d.renovaramMes} de ${d.renovaramMes + d.perderamMes}`}</dd></div>
          <div><dt>Renovações desligadas</dt><dd>{atual?.cancelamentos ?? 0} <VariacaoTexto v={variacao(atual?.cancelamentos ?? 0, anterior?.cancelamentos ?? 0)} bom="desce" curto /></dd></div>
          <div><dt>Reembolsos</dt><dd>{atual?.reembolsos ?? 0} · {reais(atual?.valorReembolsado ?? 0)}</dd></div>
          <div><dt>Pix encerrados (normal no Pix)</dt><dd>{atual?.pixEncerrados ?? 0}</dd></div>
          <div><dt>Cancelamento acumulado no cartão</dt><dd>{d.pagasCartao ? `${pct(porcentagem(d.cancelaram, d.pagasCartao))} · ${d.cancelaram} de ${d.pagasCartao}` : '—'}</dd></div>
        </dl>
      </Painel>
    </div>

    <div className="a3-atalhos-finance">
      <a href={nav.link('cobrancas')} onClick={e => { e.preventDefault(); nav.ir('cobrancas') }}><Icone nome="receita" tamanho={16} /><span>Ver cada pagamento<small>{todas.length} cobranças, dia a dia</small></span><Icone nome="direita" tamanho={15} /></a>
      <a href={nav.link('assinaturas')} onClick={e => { e.preventDefault(); nav.ir('assinaturas') }}><Icone nome="pessoas" tamanho={16} /><span>Ver os assinantes<small>quem paga e até quando</small></span><Icone nome="direita" tamanho={15} /></a>
      <a href={nav.link('pagamentos')} onClick={e => { e.preventDefault(); nav.ir('pagamentos') }}><Icone nome="alerta" tamanho={16} /><span>Avisos de pagamento<small>{p.errosPagamento ? `${plural(p.errosPagamento, 'aviso precisa', 'avisos precisam')} de atenção` : 'nenhum com problema'}</small></span><Icone nome="direita" tamanho={15} /></a>
    </div>
    <details className="a3-painel a3-metodo">
      <summary>Mês a mês (tabela completa, com churn e CSV)</summary>
      <MesAMes meses={meses} />
    </details>
    <details className="a3-painel a3-metodo">
      <summary>Como estes números são calculados</summary>
      <div className="a3-texto">
        <p>{p.cobrancas ? 'Confirmado: cobranças gravadas no banco (Pix pelo valor pago, cartão pelo valor contratado). O banco guarda só a última cobrança de cada cartão; as renovações anteriores são estimadas a cada período do plano. Reembolsos descontados.' : 'Sem as cobranças gravadas, tudo sai do preço dos planos e aparece como estimado.'} Cartão renova sozinho; Pix é compra avulsa. Valores brutos, sem a taxa do Mercado Pago.</p>
        <p>Nova, renovação ou volta é decidido pela pessoa: a primeira compra paga é a nova; pagar de novo com o acesso valendo (ou até 30 dias depois do fim) é renovação; depois disso é "voltou a assinar".</p>
        <p>Receita recorrente por mês = soma dos cartões que renovam sozinhos, cada um dividido pelos meses do plano. A receita do mês é comparada com o mês passado até o mesmo dia.</p>
      </div>
    </details>
  </div>
}

function MesAMes({ meses }: { meses: Mes[] }) {
  const linhas = [...meses].reverse()
  const churn = (m: Mes, i: number) => { const a = linhas[i + 1]?.baseCartao ?? 0; return a ? porcentagem(m.cancelamentos, a) : null }
  return <Painel titulo="Mês a mês" descricao="Churn = cancelamentos do mês sobre os cartões que renovavam no fim do mês anterior (Pix não entra: termina sem renovar)." justo
    acoes={<button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => baixarCsv(`ortoquestoes-mes-a-mes-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Mês', 'Receita', 'Novas no cartão', 'Novas no Pix', 'Receita de novas', 'Renovações automáticas', 'Receita de renovações', 'Cancelamentos', 'Reembolsos', 'Valor reembolsado', 'Pix encerrados', 'Cartões renovando no fim do mês', 'Churn (%)'],
      linhas.map((m, i) => [NOME_MES(m.chave), m.receita.toFixed(2).replace('.', ','), m.novasCartao, m.novasPix, m.receitaNovas.toFixed(2).replace('.', ','), m.renovacoes, m.receitaRenovacoes.toFixed(2).replace('.', ','), m.cancelamentos, m.reembolsos, m.valorReembolsado.toFixed(2).replace('.', ','), m.pixEncerrados, m.baseCartao, churn(m, i)]))}><Icone nome="baixar" tamanho={14} />CSV</button>}>
    <Tabela rotulo="Mês a mês" compacta porPagina={12} linhas={linhas.map((m, i) => ({ m, c: churn(m, i) }))} chave={x => x.m.chave} colunas={[
      { id: 'm', titulo: 'Mês', celula: x => <span className="a3-nome">{NOME_MES(x.m.chave)}</span> },
      { id: 'r', titulo: 'Receita', numero: true, celula: x => <b>{reais(x.m.receita)}</b>, rotuloCelular: 'Receita' },
      { id: 'n', titulo: 'Novas', numero: true, celula: x => <>{x.m.novasCartao + x.m.novasPix}<span className="a3-sub">{x.m.novasCartao} cartão · {x.m.novasPix} Pix</span></>, rotuloCelular: 'Novas' },
      { id: 'v', titulo: 'Renovações', numero: true, celula: x => inteiro(x.m.renovacoes), rotuloCelular: 'Renovações' },
      { id: 'c', titulo: 'Cancelamentos', numero: true, celula: x => inteiro(x.m.cancelamentos), rotuloCelular: 'Cancelamentos' },
      { id: 'e', titulo: 'Reembolsos', numero: true, soLargo: true, celula: x => x.m.reembolsos ? `${x.m.reembolsos} · ${reais(x.m.valorReembolsado)}` : '0' },
      { id: 'p', titulo: 'Pix encerrados', numero: true, soLargo: true, celula: x => inteiro(x.m.pixEncerrados) },
      { id: 'b', titulo: 'Cartões renovando', numero: true, soLargo: true, celula: x => inteiro(x.m.baseCartao) },
      { id: 'h', titulo: 'Churn', numero: true, celula: x => x.c === null ? '—' : <span style={{ color: x.c > 10 ? 'var(--a3-erro)' : undefined }}>{x.c}%</span>, rotuloCelular: 'Churn' },
    ]} />
  </Painel>
}

/* ───────────── Previsão ───────────── */

function Previsao({ assinaturas }: { assinaturas: LinhaAssinatura[] }) {
  const p = usarPainel()
  const todas = useMemo(() => cobrancasDe(assinaturas, p.cobrancas), [assinaturas, p.cobrancas])
  const d = useMemo(() => calcularFinanceiro(assinaturas, todas), [assinaturas, todas])
  const { observado, taxa: sugerida } = useMemo(() => taxaPixSugerida(assinaturas), [assinaturas])
  const [escolhida, escolher] = useState<number | null>(null)
  const taxa = escolhida ?? sugerida
  const pctPix = Math.round(taxa * 100)
  const prev = useMemo(() => {
    const agora = new Date()
    const pix = HORIZONTES.map(m => ({ meses: m, ...aReceberNoPix(assinaturas, m, taxa, agora) }))
    const doze = HORIZONTES.indexOf(12)
    const cartao = new Map(d.aReceber[doze].porMes)
    const pontos = pix[doze].porMes.map(([k, v], i) => { const c = cartao.get(k) ?? { valor: 0, quantidade: 0 }; return { k, longo: `${NOME_MES(k)} · ${c.quantidade} no cartão, ~${Math.round(v.quantidade)} no Pix`, curto: i === 0 || k.endsWith('-01') ? `${curto(k)} ${k.slice(2, 4)}` : curto(k), cartao: c.valor, pix: v.valor } })
    return { pix, pontos, pessoas: pix[doze].pessoas, fechamento: fechamentoDoMes(d.esteMes, d.chaveMes, d.aReceber[doze].porMes, pix[doze].porMes) }
  }, [assinaturas, taxa, d.aReceber, d.esteMes, d.chaveMes])
  const parte = defAba('previsao')
  const f = prev.fechamento
  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Financeiro" titulo={parte.rotulo} pergunta={parte.pergunta} />
    <section className="a3-painel a3-previsao-topo">
      <div className="a3-metrica a3-metrica--grande">
        <span className="a3-rotulo">Previsão de fechamento de {soMes(d.chaveMes)}</span>
        <span className="a3-metrica__valor">{reais(f.total)}</span>
        <span className="a3-metrica__linha"><span className="a3-qualidade a3-qualidade--previsao"><i />Previsão</span> com {pctPix}% de recompra do Pix</span>
      </div>
      <ol className="a3-soma">
        <li><span>Já recebido no mês</span><b>{reais(f.recebido)}</b><span className="a3-qualidade"><i />Recebido</span></li>
        <li><span>+ {plural(f.cartao.quantidade, 'renovação', 'renovações')} do cartão até o fim do mês</span><b>{reais(f.cartao.valor)}</b><span className="a3-qualidade a3-qualidade--previsao"><i />Se ninguém cancelar</span></li>
        <li><span>+ recompra do Pix que vence no mês</span><b>~{reais(f.pix.valor)}</b><span className="a3-qualidade a3-qualidade--previsao"><i />Se {pctPix}% recomprarem</span></li>
      </ol>
    </section>

    <div className="a3-grade a3-grade--4">{d.aReceber.map((x, i) => { const pix = prev.pix[i]; return <div key={x.meses} className="a3-painel"><div className="a3-metrica">
      <span className="a3-rotulo">{x.meses === 1 ? 'Próximo mês' : `Próximos ${x.meses} meses`}</span>
      <span className="a3-metrica__valor">{reais(x.valor + pix.valor)}</span>
      <span className="a3-metrica__linha">Cartão {reais(x.valor)} · {plural(x.cobrancas, 'renovação', 'renovações')}</span>
      <span className="a3-metrica__linha">Pix ~{reais(pix.valor)} · ~{plural(Math.round(pix.renovacoes), 'recompra', 'recompras')}</span>
    </div></div> })}</div>

    <Painel titulo="Hipótese de recompra do Pix" descricao="O Pix não renova sozinho, mas muita gente recompra quando o acesso acaba. Ajuste a hipótese: toda a previsão se refaz.">
      <div className="a3-simulador">
        <div className="a3-simulador__controle">
          <input type="range" min={0} max={100} step={1} value={pctPix} aria-label="Porcentagem de quem pagou Pix e recompra" aria-valuetext={`${pctPix}% recompram`} onChange={e => escolher(Number(e.target.value) / 100)} />
          <output className="num" aria-live="polite">{pctPix}%</output>
        </div>
        <div className="a3-acoes-linha">
          {observado.taxa !== null && <button type="button" className="a3-filtro" aria-pressed={Math.abs(taxa - Math.round(observado.taxa * 100) / 100) < 0.001} onClick={() => escolher(Math.round(observado.taxa! * 100) / 100)}>Observada ({Math.round(observado.taxa * 100)}%)</button>}
          {[0.3, 0.5, 0.7, 0.9].map(t => <button key={t} type="button" className="a3-filtro" aria-pressed={Math.abs(taxa - t) < 0.001} onClick={() => escolher(t)}>{t === 0.3 ? 'Pessimista' : t === 0.5 ? 'Metade' : t === 0.7 ? 'Otimista' : 'Quase todos'} {Math.round(t * 100)}%</button>)}
        </div>
        <p className="a3-mudo a3-pequeno">Para {plural(prev.pessoas, 'pessoa', 'pessoas')} com Pix vigente, conta {pctPix}% do plano no dia em que o acesso termina; quem recompra pode recomprar de novo no fim do plano seguinte. Quem também tem cartão renovando fica só no cartão. {observado.encerrados === 0 ? 'Ainda não há Pix encerrado há mais de 30 dias para medir; a hipótese começa em 60%.' : `Observado: ${observado.renovados} de ${observado.encerrados} Pix encerrados (${Math.round((observado.taxa ?? 0) * 100)}%) renovaram em até 30 dias${observado.encerrados < MINIMO_PARA_OBSERVADA ? '; amostra pequena, por isso a hipótese começa em 60%' : ''}.`}</p>
      </div>
    </Painel>

    <Quadro titulo="Previsão mês a mês" descricao={`Próximos 12 meses: cartão se ninguém cancelar, Pix se ${pctPix}% recomprarem. Assinaturas novas entram por cima, não aqui.`} fonte="receita.ts › aReceberNoCartao e aReceberNoPix" qualidade="previsao"
      legenda={<Legenda itens={[{ nome: 'Cartão (renovação automática)', chave: 'serie1' }, { nome: 'Pix (recompra estimada)', chave: 'hachura' }]} />}
      tabela={{ cabecalho: ['Mês', 'Cartão', 'Pix (estimado)', 'Total'], linhas: prev.pontos.map(x => [x.longo, reais(x.cartao), reais(x.pix), reais(x.cartao + x.pix)]) }}>
      <SerieTempo descricao="Previsão de receita por mês nos próximos 12 meses" formato={reais} altura={220} rotulos={prev.pontos.map(x => ({ longo: x.longo, curto: x.curto }))}
        series={[{ nome: 'Cartão', tipo: 'barra', valores: prev.pontos.map(x => x.cartao) }, { nome: 'Pix estimado', tipo: 'barra', estilo: 'hachura', valores: prev.pontos.map(x => x.pix) }]} />
    </Quadro>

    <div className="a3-grade a3-grade--2">
      <Painel titulo="Próximos 30 dias">
        <dl className="a3-pares">
          <div><dt>Renovações no cartão</dt><dd>{d.renovacoes30} · {reais(d.valorRenovacoes30)} <span className="a3-mudo">se ninguém cancelar</span></dd></div>
          <div><dt>Pix que vencem</dt><dd>{d.pixAcabando30} · ~{reais(prev.pix[0].valor)} <span className="a3-mudo">se {pctPix}% recomprarem</span></dd></div>
          <div><dt>Receita recorrente por mês</dt><dd>{reais(d.mrr)} <span className="a3-mudo">· {plural(d.recorrentes.length, 'cartão', 'cartões')}</span></dd></div>
        </dl>
        <p className="a3-mudo a3-pequeno" style={{ marginTop: 10 }}>Pix vencendo são bons candidatos à campanha "Pix a vencer" (Comunicação › Campanhas).</p>
      </Painel>
      <Painel titulo="Cartões que renovam sozinhos" justo>
        <Tabela rotulo="Cartões que renovam sozinhos" compacta porPagina={8} linhas={d.recorrentes} chave={x => `${x.assinatura.id_usuario}-${x.proxima ?? ''}`}
          vazio={<div style={{ padding: 20 }}><Estado compacto titulo="Nenhum cartão renovando sozinho agora" /></div>} colunas={[
            { id: 'a', titulo: 'Assinante', celula: x => <span className="a3-nome">{x.assinatura.nome || x.assinatura.usuario || x.assinatura.id_usuario.slice(0, 8)}</span> },
            { id: 'p', titulo: 'Plano', celula: x => x.plano, rotuloCelular: 'Plano' },
            { id: 'm', titulo: 'Por mês', numero: true, celula: x => reais(x.mensal), ordem: x => x.mensal, rotuloCelular: 'Por mês' },
            { id: 'r', titulo: 'Próxima', numero: true, celula: x => x.proxima ? data(x.proxima) : 'sem data', ordem: x => x.proxima ?? '', rotuloCelular: 'Próxima' },
          ]} />
      </Painel>
    </div>
    <p className="a3-mudo a3-pequeno">Previsão não é receita: nunca entra nos números de Visão financeira. Valores pelo preço dos planos ({['mensal', 'semestral', 'anual'].map(x => `${rotuloPlano(x)} ${reais(precoDe(x)?.total ?? 0)}`).join(' · ')}).</p>
  </div>
}

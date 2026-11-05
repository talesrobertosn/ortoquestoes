import { useMemo, useState } from 'react'
import { calcularFinanceiro, taxaPixSugerida } from '../../componentes/admin/financeiro'
import { baixarCsv, porcentagem } from '../../componentes/admin/formatos'
import { calcularGanhos } from '../../componentes/admin/ganhos'
import { MES, NOME_MES, cobrancas as cobrancasDe, meioDe, mesAMes, pagaSemCobranca, precoDe, renovaSozinha, somarMesChave, somarMeses, vigentesPorPessoa, type Cobranca, type Mes } from '../../componentes/admin/receita'
import { rotuloMeio, rotuloPlano, rotuloTipoCobranca } from '../../componentes/admin/rotulos'
import { usarPainel, type LinhaAssinatura } from '../dados/painel'
import { variacao } from '../dados/metricas'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { data, diaDaSerie, inteiro, reais } from '../ui/formato'
import { Colunas, type PontoColuna } from '../ui/graficos'
import { Carregando, Estado, Faixa, Painel, VariacaoTexto } from '../ui/kit'
import { Tabela } from '../ui/tabela'
import { Calendario } from './calendario'
import { FaixaMetas } from './metasResumo'

/**
 * Financeiro › Resumo, refeito do zero em 04/11/2026 (Tales: "quanto vou ganhar em cada mês; os cenários de 50% a 90%;
 * só os mensais primeiro; semestral e anual: quem paga neste mês e daqui quanto tempo renova"). De cima para baixo:
 *   1. Receita do mês (o que já entrou) e o fechamento previsto.
 *   2. Mensais: quanto entra por mês só com eles, cartão e Pix, com os cenários de recompra do Pix.
 *   3. Semestrais e anuais: quem paga, quando e quanto falta para renovar.
 *   4. Previsão dos próximos 12 meses, no cenário escolhido.
 *   5. O que já entrou: por mês e por dia, e o movimento do mês.
 * Assinantes viraram área própria; Extrato e Avisos do Mercado Pago continuam no Financeiro.
 */
export default function Receita() {
  const p = usarPainel()
  if (!p.reais) return <Carregando linhas={8} />
  if (p.cobrancasCarregando) return <Carregando linhas={8} texto="Carregando as cobranças…" />
  return <Financeiro assinaturas={p.reais} />
}

const plural = (n: number, um: string, varios: string) => `${inteiro(n)} ${n === 1 ? um : varios}`
const soMes = (k: string) => NOME_MES(k).replace(/ de \d{4}$/, '')
const nomeCurto = (a: LinhaAssinatura) => a.nome || a.usuario || a.id_usuario.slice(0, 8)

/** Quem paga hoje, uma linha por pessoa: plano, como paga, o último valor pago e quando vence. */
export interface Pagante { id: string; nome: string; plano: string; meses: number; meio: 'cartao' | 'pix'; renova: boolean; saindo: boolean; preco: number; fim: Date }
function carteiraDe(assinaturas: LinhaAssinatura[], todas: Cobranca[], agora = Date.now()): Pagante[] {
  const ultimo = new Map<string, number>()
  for (const c of [...todas].sort((a, b) => a.em.getTime() - b.em.getTime())) ultimo.set(c.id_usuario, c.valor)
  return vigentesPorPessoa(assinaturas, agora).flatMap(a => {
    const p = precoDe(a.plano)
    if (!p || !a.fim_periodo) return []
    const meio = meioDe(a), renova = renovaSozinha(a)
    return [{ id: a.id_usuario, nome: nomeCurto(a), plano: a.plano, meses: p.meses, meio, renova, saindo: meio === 'cartao' && !renova, preco: ultimo.get(a.id_usuario) ?? p.total, fim: new Date(a.fim_periodo) }]
  })
}

/** Cada próximo pagamento de quem continua (cartão que renova e Pix, que precisa pagar de novo), até `ate`. */
function proximosPagamentos(c: Pagante[], ate: Date, agora = new Date()) {
  const lista: Array<{ quem: Pagante; em: Date; chave: string }> = []
  for (const x of c) {
    if (x.saindo) continue
    for (let j = 0; j < 40; j++) {
      const em = j === 0 ? x.fim : somarMeses(x.fim, j * x.meses)
      if (em > ate) break
      if (em >= agora) lista.push({ quem: x, em, chave: MES(em) })
    }
  }
  return lista.sort((a, b) => a.em.getTime() - b.em.getTime())
}

export const CENARIOS: Array<{ taxa: number; nome: string }> = [
  { taxa: 0.3, nome: 'Pessimista' }, { taxa: 0.5, nome: 'Metade' }, { taxa: 0.6, nome: '60%' }, { taxa: 0.7, nome: '70%' },
  { taxa: 0.8, nome: '80%' }, { taxa: 0.9, nome: '90%' }, { taxa: 1, nome: 'Todos' },
]

function Financeiro({ assinaturas }: { assinaturas: LinhaAssinatura[] }) {
  const p = usarPainel()
  const nav = usarNav()
  const todas = useMemo(() => cobrancasDe(assinaturas, p.cobrancas), [assinaturas, p.cobrancas])
  const g = useMemo(() => calcularGanhos(todas), [todas])
  const f = useMemo(() => calcularFinanceiro(assinaturas, todas), [assinaturas, todas])
  const meses = useMemo(() => mesAMes(assinaturas, 12, new Date(), p.cobrancas), [assinaturas, p.cobrancas])
  const carteira = useMemo(() => carteiraDe(assinaturas, todas), [assinaturas, todas])
  const { observado, taxa: sugerida } = useMemo(() => taxaPixSugerida(assinaturas), [assinaturas])
  const [escolhida, escolher] = useState<number | null>(null)
  const taxa = escolhida ?? sugerida
  const semCobranca = useMemo(() => assinaturas.filter(pagaSemCobranca), [assinaturas])

  const agora = new Date()
  const chaveMes = MES(agora)
  const doze = useMemo(() => { const ate = new Date(); ate.setMonth(ate.getMonth() + 12); return proximosPagamentos(carteira, ate) }, [carteira])
  const valorDe = (x: { quem: Pagante }) => x.quem.meio === 'pix' ? x.quem.preco * taxa : x.quem.preco
  const restoDoMes = doze.filter(x => x.chave === chaveMes)
  const fechamento = g.mes.valor + restoDoMes.reduce((s, x) => s + valorDe(x), 0)

  const exportar = () => baixarCsv(`ortoquestoes-cobrancas-${new Date().toISOString().slice(0, 10)}.csv`, ['Data', 'Plano', 'Valor bruto', 'Meio', 'Tipo', 'Origem', 'Pagamento no Mercado Pago'],
    todas.map(c => [c.em.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), rotuloPlano(c.plano), c.valor.toFixed(2).replace('.', ','), rotuloMeio(c.meio), rotuloTipoCobranca(c), c.estimada ? 'estimada' : 'cobrança gravada', c.id_pagamento ?? '']))

  return <div className="a3-pilha a3-pilha--larga fi">
    <header className="fi-topo">
      <div className="fi-topo__texto">
        <span className="a3-rotulo">Financeiro · {soMes(chaveMes)} de {chaveMes.slice(0, 4)}</span>
        <h1 className="a3-so-leitor">Financeiro</h1>
        <span className="fi-topo__legenda">Já entrou em {soMes(chaveMes)}</span>
        <b className="fi-topo__valor">{reais(g.mes.valor)}</b>
        <span className="fi-topo__comparacao"><VariacaoTexto v={variacao(g.mes.valor, g.mesPassadoAteHoje.valor)} formato={reais} curto /> contra {soMes(g.chaveMesPassado)} até o dia {g.diaDoMes} · {soMes(g.chaveMesPassado)} inteiro: {reais(f.mesPassado)}</span>
      </div>
      <div className="fi-topo__fechamento">
        <span>Fechamento previsto de {soMes(chaveMes)}</span>
        <b>{reais(fechamento)}</b>
        <small>{reais(g.mes.valor)} já recebido + {plural(restoDoMes.length, 'pagamento', 'pagamentos')} até o fim do mês ({Math.round(taxa * 100)}% do Pix)</small>
      </div>
      <dl className="fi-topo__pequenos">
        <div><dt>Hoje</dt><dd>{reais(g.hoje.valor)}</dd></div>
        <div><dt>Últimos 7 dias</dt><dd>{reais(g.semana.valor)}</dd></div>
        <div><dt>Em {g.chaveAno}</dt><dd>{reais(g.ano.valor)}</dd></div>
        <div><dt>Desde o começo</dt><dd>{reais(f.total)}</dd></div>
      </dl>
    </header>
    <FaixaMetas titulo="Metas financeiras" chaves={['faturamento', 'receitaEquivalente', 'ativosFim']} />
    {p.avisoCobrancas && <Faixa tom="aviso" titulo="Cobranças gravadas indisponíveis">{p.avisoCobrancas}</Faixa>}
    {semCobranca.length > 0 && <Faixa tom="aviso" titulo={plural(semCobranca.length, 'assinatura paga sem a cobrança gravada', 'assinaturas pagas sem a cobrança gravada')}>
      Entram como estimadas, pelo preço do plano. Vale conferir no Mercado Pago: {semCobranca.slice(0, 4).map(a => `${a.nome || a.usuario} (${rotuloPlano(a.plano)})`).join('; ')}{semCobranca.length > 4 ? '…' : ''}
    </Faixa>}

    <Mensais carteira={carteira} taxa={taxa} escolher={escolher} observado={observado.taxa !== null ? { taxa: observado.taxa, renovados: observado.renovados, encerrados: observado.encerrados } : null} />
    <Calendario pagamentos={doze} todas={todas} assinaturas={assinaturas} taxa={taxa} escolher={escolher} />
    <Longos carteira={carteira} doze={doze} taxa={taxa} />
    <Previsao doze={doze} taxa={taxa} recebido={g.mes.valor} chaveMes={chaveMes} />
    <Recebido serie={f.serie} porDia={g.porDia} meses={meses} taxaRenovacao={f.taxaRenovacaoMes} renovaram={f.renovaramMes} perderam={f.perderamMes} />

    <div className="fi-atalhos">
      <a href={nav.link('cobrancas')} onClick={e => { e.preventDefault(); nav.ir('cobrancas') }}><Icone nome="receita" tamanho={16} /><span>Extrato<small>{todas.length} cobranças, dia a dia</small></span><Icone nome="direita" tamanho={15} /></a>
      <a href={nav.link('assinaturas')} onClick={e => { e.preventDefault(); nav.ir('assinaturas') }}><Icone nome="estrela" tamanho={16} /><span>Assinantes<small>quem paga e até quando</small></span><Icone nome="direita" tamanho={15} /></a>
      <a href={nav.link('pagamentos')} onClick={e => { e.preventDefault(); nav.ir('pagamentos') }}><Icone nome="alerta" tamanho={16} /><span>Avisos do Mercado Pago<small>{p.errosPagamento ? `${plural(p.errosPagamento, 'aviso precisa', 'avisos precisam')} de atenção` : 'nenhum com problema'}</small></span><Icone nome="direita" tamanho={15} /></a>
      <button type="button" onClick={exportar}><Icone nome="baixar" tamanho={16} /><span>CSV das cobranças<small>para planilha</small></span></button>
    </div>
    <details className="a3-painel a3-metodo">
      <summary>Como estes números são calculados</summary>
      <div className="a3-texto">
        <p>Valores brutos, sem a taxa do Mercado Pago, em dias e meses de São Paulo. O preço de cada pessoa é o último que ela pagou (quem assinou antes do reajuste segue no preço antigo).</p>
        <p>Cartão renova sozinho na data do fim do acesso. Pix não renova: a pessoa precisa pagar de novo, e o cenário escolhido diz quantos fazem isso a cada vencimento. Quem desligou a renovação do cartão ainda tem acesso, mas não entra na previsão. Assinantes novos que ainda vão chegar também não entram: a previsão é só de quem já assina.</p>
        <p>Nova, renovação ou volta é decidido pela pessoa: a primeira compra paga é a nova; pagar de novo com o acesso valendo (ou até 30 dias depois do fim) é renovação.</p>
      </div>
    </details>
  </div>
}

/* ───────────── 2. Mensais ───────────── */

function Mensais({ carteira, taxa, escolher, observado }: { carteira: Pagante[]; taxa: number; escolher: (t: number) => void; observado: { taxa: number; renovados: number; encerrados: number } | null }) {
  const m = carteira.filter(x => x.plano === 'mensal')
  const cartao = m.filter(x => x.renova), pix = m.filter(x => x.meio === 'pix'), saindo = m.filter(x => x.saindo)
  const soma = (l: Pagante[]) => l.reduce((s, x) => s + x.preco, 0)
  const vCartao = soma(cartao), vPix = soma(pix)
  const pctAtual = Math.round(taxa * 100)
  const cenarios = [...CENARIOS, ...(observado ? [{ taxa: Math.round(observado.taxa * 100) / 100, nome: 'O que já aconteceu' }] : [])].sort((a, b) => a.taxa - b.taxa)
  return <section className="fi-secao" aria-labelledby="fi-mensais">
    <header className="fi-secao__cabeca"><span className="fi-secao__selo">Mensais</span><div><h2 id="fi-mensais">Quanto entra por mês só com os assinantes mensais</h2>
      <p>{plural(m.length, 'assinante mensal', 'assinantes mensais')} hoje. O cartão cai sozinho todo mês; o Pix só entra se a pessoa pagar de novo quando o acesso acaba.</p></div></header>
    <div className="fi-mensais">
      <div className="fi-soma">
        <div className="fi-soma__linha"><span className="fi-ponto fi-ponto--verde" /><span>Cartão, renova sozinho<small>{plural(cartao.length, 'pessoa', 'pessoas')}</small></span><b>{reais(vCartao)}</b><em>certo</em></div>
        <div className="fi-soma__linha"><span className="fi-ponto fi-ponto--ouro" /><span>Pix, se pagarem de novo<small>{plural(pix.length, 'pessoa', 'pessoas')} · {reais(vPix)} se todos pagarem</small></span><b>{reais(vPix * taxa)}</b><em>{pctAtual}% do Pix</em></div>
        <div className="fi-soma__total"><span>Por mês, com {pctAtual}% do Pix voltando</span><b>{reais(vCartao + vPix * taxa)}</b></div>
        {saindo.length > 0 && <p className="fi-nota">Fora da conta: {plural(saindo.length, 'mensal desligou', 'mensais desligaram')} a renovação do cartão ({reais(soma(saindo))} por mês a menos quando o acesso acabar).</p>}
      </div>
      <div className="fi-cenarios">
        <h3>E se só uma parte do Pix pagar de novo? <small>Toque num cenário: a previsão de toda a página muda.</small></h3>
        <table className="fi-cenarios__tabela">
          <thead><tr><th scope="col">Cenário</th><th scope="col" className="num">Pix que voltam</th><th scope="col" className="num">Por mês</th></tr></thead>
          <tbody>{cenarios.map(c => { const ativo = Math.abs(c.taxa - taxa) < 0.001; return <tr key={c.nome} className={ativo ? 'ativo' : undefined}>
            <th scope="row"><button type="button" aria-pressed={ativo} onClick={() => escolher(c.taxa)}>{c.nome}{c.nome !== `${Math.round(c.taxa * 100)}%` && <small> {Math.round(c.taxa * 100)}%</small>}</button></th>
            <td className="num">{inteiro(Math.round(pix.length * c.taxa))} de {inteiro(pix.length)}</td>
            <td className="num"><b>{reais(vCartao + vPix * c.taxa)}</b></td>
          </tr> })}</tbody>
        </table>
        {observado && <p className="fi-nota">O que já aconteceu: {observado.renovados} de {observado.encerrados} Pix encerrados pagaram de novo em até 30 dias ({Math.round(observado.taxa * 100)}%){observado.encerrados < 5 ? ', amostra ainda pequena' : ''}.</p>}
      </div>
    </div>
  </section>
}

/* ───────────── 3. Semestrais e anuais ───────────── */

const emQuanto = (d: Date, agora = new Date()) => {
  const dias = Math.round((d.getTime() - agora.getTime()) / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias < 31) return dias === 1 ? 'amanhã' : `em ${dias} dias`
  const m = Math.round(dias / 30.44)
  return m === 1 ? 'em 1 mês' : `em ${m} meses`
}

function Longos({ carteira, doze, taxa }: { carteira: Pagante[]; doze: Array<{ quem: Pagante; em: Date; chave: string }>; taxa: number }) {
  const longos = carteira.filter(x => x.plano !== 'mensal').sort((a, b) => a.fim.getTime() - b.fim.getTime())
  const chave = MES(new Date())
  const pagamentos = doze.filter(x => x.quem.plano !== 'mensal')
  const esteMes = pagamentos.filter(x => x.chave === chave)
  const proximo = pagamentos[0]
  const porMes = Array.from({ length: 12 }, (_, i) => somarMesChave(chave, i)).map(k => ({ k, l: pagamentos.filter(x => x.chave === k) }))
  const pontos: PontoColuna[] = porMes.map(({ k, l }) => ({ longo: `${NOME_MES(k)}: ${l.map(x => `${x.quem.nome} (${rotuloPlano(x.quem.plano)})`).join(', ') || 'ninguém'}`, curto: NOME_MES(k, true).replace('.', ''), partes: [l.filter(x => x.quem.meio === 'cartao').reduce((s, x) => s + x.quem.preco, 0), l.filter(x => x.quem.meio === 'pix').reduce((s, x) => s + x.quem.preco * taxa, 0)] }))
  return <section className="fi-secao" aria-labelledby="fi-longos">
    <header className="fi-secao__cabeca"><span className="fi-secao__selo fi-secao__selo--ouro">Semestrais e anuais</span><div><h2 id="fi-longos">Quem paga de uma vez, e quando paga de novo</h2>
      <p>Esses planos não pagam todo mês: pagam tudo de uma vez quando o acesso acaba. Aqui está quem paga neste mês e quanto falta para cada um.</p></div></header>
    <div className="fi-longos__destaques">
      <div className={esteMes.length ? 'tem' : ''}><span>Neste mês ({soMes(chave)})</span><b>{esteMes.length ? plural(esteMes.length, 'pagamento', 'pagamentos') : 'Ninguém paga'}</b>
        <small>{esteMes.length ? `${esteMes.map(x => `${x.quem.nome}, ${rotuloPlano(x.quem.plano).toLowerCase()} em ${data(x.em.toISOString())}`).join('; ')} · ${reais(esteMes.reduce((s, x) => s + (x.quem.meio === 'pix' ? x.quem.preco * taxa : x.quem.preco), 0))}` : 'nenhum semestral ou anual vence até o fim do mês'}</small></div>
      <div><span>Próximo a renovar</span><b>{proximo ? emQuanto(proximo.em) : '—'}</b><small>{proximo ? `${proximo.quem.nome} · ${rotuloPlano(proximo.quem.plano)} · ${reais(proximo.quem.preco)} em ${data(proximo.em.toISOString())}` : 'ninguém nos próximos 12 meses'}</small></div>
      <div><span>Assinantes com plano longo</span><b>{inteiro(longos.length)}</b><small>{longos.filter(x => x.plano === 'semestral').length} semestrais · {longos.filter(x => x.plano === 'anual').length} anuais</small></div>
    </div>
    {longos.length > 0 && <div className="fi-cartao">
      <h3>Pagamentos de semestrais e anuais nos próximos 12 meses <small>verde: cartão (certo); dourado: Pix ({Math.round(taxa * 100)}% do valor, se pagar de novo)</small></h3>
      <Colunas descricao="Pagamentos de semestrais e anuais por mês" pontos={pontos} series={[{ nome: 'Cartão' }, { nome: 'Pix', estilo: 2 }]} formato={reais} media={false} altura={190} />
    </div>}
    <div className="fi-cartao">
      <h3>Cada assinante semestral e anual <small>do vencimento mais próximo ao mais distante</small></h3>
      {!longos.length ? <Estado compacto titulo="Ninguém com plano semestral ou anual agora" /> : <Tabela rotulo="Semestrais e anuais" compacta linhas={longos} chave={x => x.id} colunas={[
        { id: 'n', titulo: 'Assinante', celula: x => <span className="a3-nome">{x.nome}</span> },
        { id: 'p', titulo: 'Plano', celula: x => rotuloPlano(x.plano), rotuloCelular: 'Plano' },
        { id: 'm', titulo: 'Como paga', celula: x => x.saindo ? <span className="fraco">Cartão, desligou a renovação</span> : x.meio === 'pix' ? 'Pix, precisa pagar de novo' : 'Cartão, renova sozinho', rotuloCelular: 'Como paga' },
        { id: 'v', titulo: 'Valor', numero: true, celula: x => reais(x.preco), ordem: x => x.preco, rotuloCelular: 'Valor' },
        { id: 'd', titulo: 'Próximo pagamento', numero: true, celula: x => <><b>{data(x.fim.toISOString())}</b><span className="a3-sub">{x.saindo ? 'não renova' : emQuanto(x.fim)}</span></>, ordem: x => x.fim.getTime(), rotuloCelular: 'Próximo' },
      ]} />}
    </div>
  </section>
}

/* ───────────── 4. Previsão ───────────── */

function Previsao({ doze, taxa, recebido, chaveMes }: { doze: Array<{ quem: Pagante; em: Date; chave: string }>; taxa: number; recebido: number; chaveMes: string }) {
  const linhas = Array.from({ length: 12 }, (_, i) => somarMesChave(chaveMes, i)).map(k => {
    const l = doze.filter(x => x.chave === k)
    const v = (f: (x: { quem: Pagante }) => boolean) => l.filter(f).reduce((s, x) => s + (x.quem.meio === 'pix' ? x.quem.preco * taxa : x.quem.preco), 0)
    return { k, mensais: v(x => x.quem.plano === 'mensal'), longos: v(x => x.quem.plano !== 'mensal'), ja: k === chaveMes ? recebido : 0, pessoas: l.length }
  })
  const total12 = linhas.reduce((s, x) => s + x.mensais + x.longos, 0) + recebido
  const pontos: PontoColuna[] = linhas.map(x => ({ longo: `${NOME_MES(x.k)}${x.ja ? ` (já entrou ${reais(x.ja)})` : ''}`, curto: NOME_MES(x.k, true).replace('.', ''), partes: [x.ja + x.mensais, x.longos] }))
  return <section className="fi-secao" aria-labelledby="fi-previsao">
    <header className="fi-secao__cabeca"><span className="fi-secao__selo fi-secao__selo--claro">Previsão</span><div><h2 id="fi-previsao">Quanto deve entrar em cada mês</h2>
      <p>Só com quem já assina, no cenário de {Math.round(taxa * 100)}% do Pix pagando de novo. Assinantes novos entram por cima disso. Em 12 meses: <b>{reais(total12)}</b>.</p></div></header>
    <div className="fi-cartao">
      <Colunas descricao="Previsão de receita por mês" pontos={pontos} series={[{ nome: 'Mensais' }, { nome: 'Semestrais e anuais', estilo: 2 }]} formato={reais} media={false} altura={230} />
      <ul className="fi-legenda"><li><i className="verde" />Mensais (no mês atual, inclui o que já entrou)</li><li><i className="ouro" />Semestrais e anuais que vencem no mês</li></ul>
      <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta fi-tabela">
        <thead><tr><th scope="col">Mês</th><th scope="col" className="num">Mensais</th><th scope="col" className="num">Semestrais e anuais</th><th scope="col" className="num">Total</th></tr></thead>
        <tbody>{linhas.map(x => <tr key={x.k}><th scope="row">{NOME_MES(x.k).replace(/^./, c => c.toUpperCase())}</th><td className="num">{reais(x.ja + x.mensais)}</td><td className="num">{x.longos ? reais(x.longos) : '—'}</td><td className="num"><b>{reais(x.ja + x.mensais + x.longos)}</b></td></tr>)}</tbody>
      </table></div>
    </div>
  </section>
}

/* ───────────── 5. O que já entrou ───────────── */

function Recebido({ serie, porDia, meses, taxaRenovacao, renovaram, perderam }: {
  serie: Array<{ rotulo: string; rotuloCurto: string; partes: number[] }>; porDia: Array<{ dia: string; cartao: number; pix: number }>; meses: Mes[]
  taxaRenovacao: number | null; renovaram: number; perderam: number
}) {
  const i0 = serie.findIndex(x => x.partes[0] + x.partes[1] > 0)
  const hist = i0 < 0 ? serie.slice(-1) : serie.slice(i0)
  const atual = meses[meses.length - 1], anterior = meses[meses.length - 2]
  const novas = (m?: Mes) => (m?.novasCartao ?? 0) + (m?.novasPix ?? 0)
  return <section className="fi-secao" aria-labelledby="fi-recebido">
    <header className="fi-secao__cabeca"><span className="fi-secao__selo fi-secao__selo--claro">Recebido</span><div><h2 id="fi-recebido">O que já entrou</h2><p>Cartão e Pix somados; passe o mouse para ver a divisão.</p></div></header>
    <div className="fi-grade">
      <div className="fi-cartao"><h3>Por mês</h3>
        <Colunas descricao="Receita por mês" formato={reais} altura={220} rotuloMedia="média" pontos={hist.map((x, i) => ({ longo: x.rotulo, curto: x.rotuloCurto, partes: [x.partes[0] + x.partes[1]], parcial: i === hist.length - 1 }))} series={[{ nome: 'Recebido' }]} /></div>
      <div className="fi-cartao"><h3>Por dia <small>últimos 30 dias</small></h3>
        <Colunas descricao="Receita por dia nos últimos 30 dias" formato={reais} altura={220} media={false} cor="claro" pontos={porDia.map((x, i) => ({ longo: diaDaSerie(x.dia, true), curto: diaDaSerie(x.dia), partes: [x.cartao + x.pix], parcial: i === porDia.length - 1 }))} series={[{ nome: 'Recebido' }]} /></div>
    </div>
    <div className="fi-movimento">
      <div><span>Assinantes novos no mês</span><b>{novas(atual)}</b><small><VariacaoTexto v={variacao(novas(atual), novas(anterior))} curto /> · {atual?.novasCartao ?? 0} cartão · {atual?.novasPix ?? 0} Pix</small></div>
      <div><span>Renovações no mês</span><b>{atual?.renovacoes ?? 0}</b><small>{reais(atual?.receitaRenovacoes ?? 0)}</small></div>
      <div><span>Taxa de renovação</span><b>{taxaRenovacao === null ? '—' : `${taxaRenovacao}%`}</b><small>{taxaRenovacao === null ? 'ninguém venceu ainda' : `${renovaram} de ${renovaram + perderam} que venceram`}</small></div>
      <div><span>Desligaram a renovação</span><b>{atual?.cancelamentos ?? 0}</b><small>reembolsos: {atual?.reembolsos ?? 0} · {reais(atual?.valorReembolsado ?? 0)}</small></div>
    </div>
    <details className="a3-painel a3-metodo"><summary>Mês a mês (tabela completa, com churn e CSV)</summary><MesAMes meses={meses} /></details>
  </section>
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
      { id: 'h', titulo: 'Churn', numero: true, celula: x => x.c === null ? '—' : <span style={{ color: x.c > 10 ? 'var(--a3-erro)' : undefined }}>{x.c}%</span>, rotuloCelular: 'Churn' },
    ]} />
  </Painel>
}


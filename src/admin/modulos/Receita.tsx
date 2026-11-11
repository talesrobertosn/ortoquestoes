import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { taxaPixSugerida } from '../../componentes/admin/financeiro'
import { baixarCsv, porcentagem } from '../../componentes/admin/formatos'
import { calcularGanhos } from '../../componentes/admin/ganhos'
import { DIA, MES, NOME_MES, cobrancas as cobrancasDe, meioDe, mesAMes, pagaSemCobranca, precoDe, renovaSozinha, somarMesChave, somarMeses, vigentesPorPessoa, type Cobranca, type Mes } from '../../componentes/admin/receita'
import { rotuloMeio, rotuloPlano, rotuloTipoCobranca } from '../../componentes/admin/rotulos'
import { usarRpc } from '../../componentes/admin/usarRpc'
import { usarPainel, type LinhaAssinatura } from '../dados/painel'
import { baseEm, carteiraHoje, fotoDoMes, mesesDesdeOInicio, mesmaAlturaMesPassado, parametrosAoVivo, recebidoPorPeriodo, type FotoMes } from '../dados/hub'
import { META_OFICIAL, metasVigentes, periodosPagos, projetarMes, type LinhaMetaBanco } from '../dados/metas'
import { projetarCrescimento, retencaoMensal } from '../dados/projecao'
import type { Escala } from '../dados/negocio'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { data, horario, inteiro, reais } from '../ui/formato'
import { Carregando, Estado, Faixa, Segmento } from '../ui/kit'
import { Tabela } from '../ui/tabela'
import { Composicao, Torres, Variacao, type PontoTorre } from '../ui/torres'
import { Calendario } from './calendario'
import { FaixaMetas } from './metasResumo'
import './hub.css'

/**
 * Financeiro › Resumo, refeito do zero em 11/11/2026. Pedido do Tales: "quando eu clico no financeiro, quero ver
 * com clareza quanto recebi este mês, quanto recebi no mês anterior, quanto já recebi no total, quantos pagantes
 * com acesso, quantos mensais, semestrais e anuais; gráficos de bater o olho". De cima para baixo:
 *   1. Placar do caixa: recebido no mês (com o mesmo trecho do mês passado), mês passado inteiro, hoje, 7 dias,
 *      desde o começo e as torres mês a mês com o que ainda pode entrar.
 *   2. Este mês × mês passado, linha a linha (dinheiro, pessoas, base).
 *   3. Quem paga hoje, por plano e por meio.
 *   4. Quando entrou: dia, semana ou mês, dividido por meio, tipo ou plano.
 *   5. Quanto deve entrar em cada mês (12 meses), com ou sem clientes novos; quando os longos voltam a pagar.
 *   6. Simulador dos mensais (quantos Pix renovam e quanto entra por mês).
 *   7. Calendário de quem paga em cada dia.
 *   8. Histórico mês a mês completo.
 * A taxa de renovação do Pix é uma só para a página toda e fica guardada no navegador.
 */
export default function Receita() {
  const p = usarPainel()
  if (!p.reais && p.assinaturasQ.erro) return <div className="ng-painel"><Estado tipo="erro" titulo="Não foi possível carregar o Financeiro" texto="Os valores não foram substituídos por zero. Tente carregar novamente." /><button type="button" className="a3-botao" onClick={() => void p.atualizar()}>Tentar novamente</button></div>
  if (!p.reais) return <Carregando linhas={8} />
  if (p.cobrancasCarregando) return <Carregando linhas={8} texto="Carregando as cobranças…" />
  return <Financeiro assinaturas={p.reais} />
}

const plural = (n: number, um: string, varios: string) => `${inteiro(n)} ${n === 1 ? um : varios}`
const soMes = (k: string) => NOME_MES(k).replace(/ de \d{4}$/, '')
const mesCurto = (k: string) => NOME_MES(k, true).replace('.', '')
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const nomeCurto = (a: LinhaAssinatura) => a.nome || a.usuario || a.id_usuario.slice(0, 8)
const reaisCurto = (v: number) => reais(v).replace(/,00$/, '')

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
  const lista: Array<{ quem: Pagante; em: Date; chave: string; ciclo: number }> = []
  for (const x of c) {
    if (x.saindo) continue
    for (let j = 0; j < 40; j++) {
      const em = j === 0 ? x.fim : somarMeses(x.fim, j * x.meses)
      if (em > ate) break
      if (em >= agora) lista.push({ quem: x, em, chave: MES(em), ciclo: j + 1 })
    }
  }
  return lista.sort((a, b) => a.em.getTime() - b.em.getTime())
}

/** Atalhos de cenário do Pix (o calendário usa os mesmos). */
export const CENARIOS: Array<{ taxa: number; nome: string }> = [
  { taxa: 0.3, nome: 'Pessimista' }, { taxa: 0.5, nome: 'Metade' }, { taxa: 0.6, nome: '60%' }, { taxa: 0.7, nome: '70%' },
  { taxa: 0.8, nome: '80%' }, { taxa: 0.9, nome: '90%' }, { taxa: 1, nome: 'Todos' },
]

const CHAVE_TAXA = 'oq-admin-taxa-pix'
/** A taxa escolhida na página (guardada no navegador; some quando volta para a sugerida). */
export function usarTaxaPix(sugerida: number) {
  const [escolhida, definir] = useState<number | null>(() => { try { const v = Number(localStorage.getItem(CHAVE_TAXA)); return v > 0 && v <= 1 ? v : null } catch { return null } })
  useEffect(() => { try { if (escolhida === null) localStorage.removeItem(CHAVE_TAXA); else localStorage.setItem(CHAVE_TAXA, String(escolhida)) } catch { /* sem armazenamento */ } }, [escolhida])
  return { taxa: escolhida ?? sugerida, escolhida, escolher: (t: number | null) => definir(t === null || Math.abs(t - sugerida) < 0.001 ? null : Math.round(t * 100) / 100) }
}

function Financeiro({ assinaturas }: { assinaturas: LinhaAssinatura[] }) {
  const p = usarPainel()
  const nav = usarNav()
  const metasQ = usarRpc<LinhaMetaBanco[]>(p.conta, 'listar_metas_comerciais_admin')
  const agora = useMemo(() => new Date(), [p.cobrancas, assinaturas]) // eslint-disable-line react-hooks/exhaustive-deps
  const todas = useMemo(() => cobrancasDe(assinaturas, p.cobrancas), [assinaturas, p.cobrancas])
  const g = useMemo(() => calcularGanhos(todas, agora), [todas, agora])
  const sugestao = useMemo(() => taxaPixSugerida(assinaturas, agora), [assinaturas, agora])
  const { taxa, escolhida, escolher } = usarTaxaPix(sugestao.taxa)
  const carteira = useMemo(() => carteiraDe(assinaturas, todas, agora.getTime()), [assinaturas, todas, agora])
  const resumo = useMemo(() => carteiraHoje(assinaturas, agora.getTime()), [assinaturas, agora])
  const doze = useMemo(() => proximosPagamentos(carteira, somarMeses(agora, 13), agora), [carteira, agora])
  const chaveMes = MES(agora), chaveAnterior = somarMesChave(chaveMes, -1)
  const fotos = useMemo(() => ({
    atual: fotoDoMes(chaveMes, assinaturas, todas, agora.getTime(), agora.getTime()),
    anteriorMesmaAltura: fotoDoMes(chaveAnterior, assinaturas, todas, mesmaAlturaMesPassado(agora.getTime()), agora.getTime()),
    anterior: fotoDoMes(chaveAnterior, assinaturas, todas, undefined, agora.getTime()),
  }), [chaveMes, chaveAnterior, assinaturas, todas, agora])
  const valorDe = (x: { quem: Pagante; ciclo: number }) => x.quem.meio === 'pix' ? x.quem.preco * taxa ** x.ciclo : x.quem.preco
  const restoDoMes = doze.filter(x => x.chave === chaveMes).reduce((s, x) => s + valorDe(x), 0)
  // Com clientes novos: o que o ritmo de hoje traz até o fim do mês (a mesma conta da página Metas).
  const projMes = useMemo(() => p.usuariosReais ? projetarMes({ agora: agora.getTime(), cadastros: p.usuariosReais.map(u => new Date(u.criado_em)), cobrancas: todas, assinaturas, taxaPix: taxa }) : null, [p.usuariosReais, todas, assinaturas, taxa, agora])
  const novasEsperadas = projMes ? Math.max(0, projMes.partes.novas) * projMes.partes.ticketNovo : 0
  const meta = useMemo(() => metasVigentes(META_OFICIAL, Array.isArray(metasQ.dados) ? metasQ.dados : null), [metasQ.dados])
  const semCobranca = useMemo(() => assinaturas.filter(pagaSemCobranca), [assinaturas])
  const meses = useMemo(() => mesesDesdeOInicio(todas, agora), [todas, agora])
  const historico = useMemo(() => mesAMes(assinaturas, meses.length, agora, p.cobrancas), [assinaturas, meses.length, agora, p.cobrancas])
  const nomes = useMemo(() => { const m = new Map<string, string>(); for (const a of assinaturas) if (!m.has(a.id_usuario) || a.nome) m.set(a.id_usuario, nomeCurto(a)); return m }, [assinaturas])

  const exportar = () => baixarCsv(`ortoquestoes-cobrancas-${DIA(agora)}.csv`, ['Data', 'Plano', 'Valor bruto', 'Meio', 'Tipo', 'Origem', 'Pagamento no Mercado Pago'],
    todas.map(c => [c.em.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), rotuloPlano(c.plano), c.valor.toFixed(2).replace('.', ','), rotuloMeio(c.meio), rotuloTipoCobranca(c), c.estimada ? 'estimada' : 'cobrança gravada', c.id_pagamento ?? '']))

  const ANCORAS: Array<[string, string]> = [['fi-caixa', 'Recebido'], ['fi-comparar', 'Este mês × anterior'], ['fi-pagantes', 'Quem paga'], ['fi-entrou', 'Quando entrou'], ['fi-previsao', 'Previsão'], ['fi-mensais', 'Simulador'], ['fi-calendario', 'Calendário'], ['fi-historico', 'Histórico']]
  return <div className="a3-pilha a3-pilha--larga hb">
    <header className="hb-cabeca">
      <div className="hb-cabeca__sobre"><b>Financeiro</b><span>{maiuscula(NOME_MES(chaveMes))}</span><span>valores brutos, antes da taxa do Mercado Pago</span></div>
      <h1>Quanto entrou, quem paga<br />e quanto ainda vai entrar.</h1>
      <nav className="hb-ancoras" aria-label="Partes do Financeiro">{ANCORAS.map(([id, t]) => <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{t}</a>)}
        <a href={nav.link('metas')} onClick={e => { e.preventDefault(); nav.ir('metas') }} className="hb-ancoras__ir">Metas <Icone nome="direita" tamanho={13} /></a></nav>
    </header>
    {p.avisoCobrancas && <Faixa tom="aviso" titulo="Cobranças gravadas indisponíveis">{p.avisoCobrancas}</Faixa>}
    {semCobranca.length > 0 && <Faixa tom="aviso" titulo={plural(semCobranca.length, 'assinatura paga sem a cobrança gravada', 'assinaturas pagas sem a cobrança gravada')}>
      Entram como estimadas, pelo preço do plano. Vale conferir no Mercado Pago: {semCobranca.slice(0, 4).map(a => `${a.nome || a.usuario} (${rotuloPlano(a.plano)})`).join('; ')}{semCobranca.length > 4 ? '…' : ''}
    </Faixa>}

    <Caixa g={g} fotos={fotos} agora={agora} restoDoMes={restoDoMes} novasEsperadas={novasEsperadas} taxa={taxa} historico={historico} meses={meses} metaMes={meta} />
    <FaixaMetas titulo="Metas do mês" chaves={['faturamento', 'novosPagantes', 'ativosFim']} />
    <Comparar fotos={fotos} chaveMes={chaveMes} chaveAnterior={chaveAnterior} />
    <Pagantes resumo={resumo} carteira={carteira} nomes={nomes} todas={todas} agora={agora} />
    <Entrou todas={todas} agora={agora} />
    <Previsao doze={doze} taxa={taxa} todas={todas} agora={agora} carteira={carteira} resumo={resumo} novasMes={novasEsperadas} />
    <Simulador carteira={carteira} taxa={taxa} escolhida={escolhida} escolher={escolher} sugestao={sugestao} />
    <div className="hb-secao"><Calendario pagamentos={doze} todas={todas} assinaturas={assinaturas} taxa={taxa} escolher={t => escolher(t)} /></div>
    <Historico historico={historico} assinaturas={assinaturas} todas={todas} agora={agora} />

    <div className="fi-atalhos">
      <a href={nav.link('cobrancas')} onClick={e => { e.preventDefault(); nav.ir('cobrancas') }}><Icone nome="receita" tamanho={16} /><span>Extrato<small>{todas.length} cobranças, dia a dia</small></span><Icone nome="direita" tamanho={15} /></a>
      <a href={nav.link('assinaturas')} onClick={e => { e.preventDefault(); nav.ir('assinaturas') }}><Icone nome="estrela" tamanho={16} /><span>Assinantes<small>quem paga e até quando</small></span><Icone nome="direita" tamanho={15} /></a>
      <a href={nav.link('pagamentos')} onClick={e => { e.preventDefault(); nav.ir('pagamentos') }}><Icone nome="alerta" tamanho={16} /><span>Avisos do Mercado Pago<small>{p.errosPagamento ? `${plural(p.errosPagamento, 'aviso precisa', 'avisos precisam')} de atenção` : 'nenhum com problema'}</small></span><Icone nome="direita" tamanho={15} /></a>
      <button type="button" onClick={exportar}><Icone nome="baixar" tamanho={16} /><span>CSV das cobranças<small>para planilha</small></span></button>
    </div>
    <details className="a3-painel a3-metodo">
      <summary>Como estes números são calculados</summary>
      <div className="a3-texto">
        <p><b>Recebido</b> é o valor bruto de cada pagamento confirmado, antes da taxa do Mercado Pago, no dia e no mês de São Paulo. Pagamento devolvido sai do recebido; reembolsos aparecem à parte. Quando falta o valor gravado, usamos o preço do plano e marcamos como estimado. Renovações antigas do cartão são reconstruídas (o banco guarda a última de cada assinatura).</p>
        <p><b>Comparação justa:</b> o mês atual é comparado com o mês passado até o mesmo dia e hora; o mês passado inteiro aparece ao lado, para referência.</p>
        <p><b>Nova, renovação ou volta</b> é decidido pela pessoa: a primeira compra paga é a nova; pagar de novo com o acesso valendo ou até 30 dias depois do fim é renovação; depois disso, volta.</p>
        <p><b>Previsão:</b> o cartão renova sozinho na data do fim do acesso (pode falhar ou ser cancelado). O Pix não renova sozinho: a pessoa precisa pagar de novo, e a taxa escolhida estima quantos pagam. Nos ciclos seguintes a chance se acumula (taxa², taxa³), porque só renova de novo quem renovou antes. Quem desligou a renovação do cartão não entra. "Com clientes novos" soma o que o ritmo de hoje traz (o modelo das Metas).</p>
        <p><b>Taxa do Pix:</b> de partida, a que aconteceu ({sugestao.fonte === 'fechada' ? `${sugestao.observado.renovados} de ${sugestao.observado.encerrados} Pix com o prazo encerrado renovaram` : sugestao.fonte === 'parcial' ? `${sugestao.parcial.renovados} de ${sugestao.parcial.encerrados} Pix vencidos já renovaram; pode subir, porque quem venceu há menos de 30 dias ainda pode pagar` : 'ainda há poucos Pix vencidos; vale a regra de que o Pix, em geral, renova (80%)'}). Você pode mudar no simulador.</p>
      </div>
    </details>
  </div>
}

/* ───────────── 1. Placar do caixa ───────────── */

function Caixa({ g, fotos, agora, restoDoMes, novasEsperadas, taxa, historico, meses, metaMes }: {
  g: ReturnType<typeof calcularGanhos>; fotos: { atual: FotoMes; anteriorMesmaAltura: FotoMes; anterior: FotoMes }; agora: Date
  restoDoMes: number; novasEsperadas: number; taxa: number; historico: Mes[]; meses: string[]; metaMes: Array<{ mes: string; faturamento: number }>
}) {
  const chave = MES(agora)
  const fechamento = g.mes.valor + restoDoMes
  const comNovos = fechamento + novasEsperadas
  const maior = Math.max(1, fotos.anterior.recebido, comNovos, g.mes.valor)
  const metaAtual = metaMes.find(m => m.mes === chave)?.faturamento
  const porMes = new Map(historico.map(m => [m.chave, m]))
  const pontos: PontoTorre[] = meses.map(k => {
    const m = porMes.get(k), atual = k === chave
    const novas = m?.receitaNovas ?? 0, renov = (m?.receitaRenovacoes ?? 0) + (m?.receitaVoltas ?? 0)
    return { curto: mesCurto(k) + (k.slice(5) === '01' || k === meses[0] ? ` ${k.slice(2, 4)}` : ''), longo: maiuscula(NOME_MES(k)) + (atual ? ' (em andamento)' : ''), partes: [novas, renov], previsto: atual ? restoDoMes + novasEsperadas : undefined, meta: metaMes.find(x => x.mes === k)?.faturamento, parcial: atual, nota: m ? `${m.novasCartao + m.novasPix} primeiras compras · ${m.renovacoes + m.voltas} renovações` : undefined }
  })
  const diaHoje = Number(DIA(agora).slice(8))
  const ultimoDia = new Date(Date.UTC(Number(chave.slice(0, 4)), Number(chave.slice(5)), 0)).getUTCDate()
  return <section id="fi-caixa" className="hb-secao" aria-labelledby="fi-caixa-t">
    <div className="hb-placar">
      <article className="hb-heroi">
        <span className="hb-kicker">Recebido em {soMes(chave)}</span>
        <h2 id="fi-caixa-t" className="hb-heroi__valor">{reais(g.mes.valor)}</h2>
        <p className="hb-heroi__sub">até hoje, dia {diaHoje}, às {horario(agora)} · {plural(g.mes.quantidade, 'pagamento', 'pagamentos')}</p>
        <div className="hb-heroi__comparar">
          <Variacao atual={g.mes.valor} anterior={fotos.anteriorMesmaAltura.recebido} formato={reaisCurto} />
          <span>contra {reais(fotos.anteriorMesmaAltura.recebido)} em {soMes(fotos.anterior.chave)} até o dia {diaHoje}</span>
        </div>
        <ul className="hb-regua" aria-label="Recebido em reais, na mesma escala">
          {[
            { nome: `${maiuscula(soMes(chave))} até agora`, v: g.mes.valor, cor: 'verde' },
            { nome: `${maiuscula(soMes(fotos.anterior.chave))} até o dia ${diaHoje}`, v: fotos.anteriorMesmaAltura.recebido, cor: 'cinza' },
            { nome: `${maiuscula(soMes(fotos.anterior.chave))} inteiro`, v: fotos.anterior.recebido, cor: 'cinza-claro' },
          ].map(x => <li key={x.nome}><span>{x.nome}</span><span className="hb-regua__trilho"><i className={`hb-c-${x.cor}`} style={{ width: `${x.v / maior * 100}%` }} /></span><b>{reaisCurto(x.v)}</b></li>)}
          <li className="hb-regua__previsao"><span>{maiuscula(soMes(chave))} pode fechar em</span><span className="hb-regua__trilho"><i className="hb-c-verde" style={{ width: `${g.mes.valor / maior * 100}%` }} /><i className="hb-c-previsto-barra" style={{ width: `${(restoDoMes + novasEsperadas) / maior * 100}%` }} /></span><b>≈ {reaisCurto(comNovos)}</b></li>
        </ul>
        <p className="hb-nota">Fechamento: o recebido, mais {reaisCurto(restoDoMes)} de quem já assina e vence até o dia {ultimoDia} (Pix com {Math.round(taxa * 100)}% renovando), mais ≈ {reaisCurto(novasEsperadas)} de clientes novos no ritmo de hoje. Só com quem já assina: {reaisCurto(fechamento)}.{metaAtual ? ` Meta do mês: ${reaisCurto(metaAtual)}.` : ''}</p>
      </article>
      <dl className="hb-lado">
        <div><dt>{maiuscula(soMes(fotos.anterior.chave))}, mês inteiro</dt><dd>{reais(fotos.anterior.recebido)}</dd><small>{plural(fotos.anterior.novas, 'primeira compra', 'primeiras compras')} · {plural(fotos.anterior.renovacoes + fotos.anterior.voltas, 'renovação', 'renovações')}</small></div>
        <div><dt>Hoje</dt><dd>{reais(g.hoje.valor)}</dd><small>{plural(g.hoje.quantidade, 'pagamento', 'pagamentos')} · ontem até esta hora: {reaisCurto(g.ontem.valor)}</small></div>
        <div><dt>Últimos 7 dias</dt><dd>{reais(g.semana.valor)}</dd><small>nos 7 dias antes: {reaisCurto(g.semanaAnterior.valor)}</small></div>
        <div className="hb-lado__total"><dt>Desde o começo</dt><dd>{reais(g.total.valor)}</dd><small>{plural(g.total.quantidade, 'pagamento', 'pagamentos')} desde {meses[0] ? NOME_MES(meses[0]) : '—'}</small></div>
      </dl>
    </div>
    <div className="hb-painel">
      <div className="hb-titulo"><div><h3>Mês a mês, desde o começo</h3><p>Verde: primeiras compras. Dourado: renovações. No mês atual, a parte hachurada é o que ainda deve entrar; o traço é a meta.</p></div></div>
      <Torres titulo="Recebido por mês" formato={reais} altura={250} pontos={pontos} series={[{ nome: 'Primeiras compras', cor: 'verde' }, { nome: 'Renovações', cor: 'ouro' }]} rotuloPrevisto="Ainda deve entrar" rotuloMeta="Meta do mês" />
    </div>
  </section>
}

/* ───────────── 2. Este mês × mês passado ───────────── */

function Comparar({ fotos, chaveMes, chaveAnterior }: { fotos: { atual: FotoMes; anteriorMesmaAltura: FotoMes; anterior: FotoMes }; chaveMes: string; chaveAnterior: string }) {
  const { atual: a, anteriorMesmaAltura: m, anterior: t } = fotos
  const dia = Number(DIA(new Date(a.ate)).slice(8))
  type Linha = { nome: string; ajuda?: string; v: (f: FotoMes) => number; formato?: (n: number) => string; bom?: 'sobe' | 'desce'; detalhe?: (f: FotoMes) => string }
  const grupos: Array<{ titulo: string; linhas: Linha[] }> = [
    { titulo: 'Dinheiro', linhas: [
      { nome: 'Recebido', v: f => f.recebido, formato: reais },
      { nome: 'De primeiras compras', v: f => f.recebidoNovas, formato: reais },
      { nome: 'De renovações', v: f => f.recebidoRenovacoes, formato: reais },
      { nome: 'Valor médio da primeira compra', v: f => f.ticketNovas, formato: reais },
    ] },
    { titulo: 'Pessoas', linhas: [
      { nome: 'Assinantes novos', ajuda: 'primeira compra paga', v: f => f.novas, detalhe: f => `${f.novasPorPlano.mensal} mensal · ${f.novasPorPlano.semestral} sem. · ${f.novasPorPlano.anual} anual` },
      { nome: 'Pagaram com Pix', ajuda: 'entre os novos', v: f => f.novasPix, detalhe: f => `${f.novasCartao} no cartão` },
      { nome: 'Renovações', v: f => f.renovacoes, detalhe: f => `${f.renovacoesPix} no Pix` },
      { nome: 'Voltaram a assinar', ajuda: 'depois de mais de 30 dias sem acesso', v: f => f.voltas },
      { nome: 'Desligaram a renovação do cartão', v: f => f.desligaram, bom: 'desce' },
      { nome: 'Pediram reembolso', v: f => f.reembolsos, bom: 'desce' },
      { nome: 'Ficaram sem acesso', ajuda: 'tinham acesso no dia 1º e não têm mais', v: f => f.perderamAcesso, bom: 'desce' },
    ] },
    { titulo: 'Base de pagantes', linhas: [
      { nome: 'Pagantes no dia 1º', v: f => f.baseInicio.total },
      { nome: 'Pagantes no fim', ajuda: 'no mês atual, agora', v: f => f.baseFim.total },
      { nome: 'Mensais', v: f => f.baseFim.porPlano.mensal },
      { nome: 'Mensais no cartão com a renovação ligada', v: f => f.mensaisRenovando },
      { nome: 'Semestrais', v: f => f.baseFim.porPlano.semestral },
      { nome: 'Anuais', v: f => f.baseFim.porPlano.anual },
      { nome: 'Receita mensal equivalente', ajuda: 'semestral ÷ 6, anual ÷ 12', v: f => f.baseFim.receitaEquivalente, formato: reais },
    ] },
  ]
  return <section id="fi-comparar" className="hb-secao" aria-labelledby="fi-comparar-t">
    <div className="hb-titulo"><div><span className="hb-kicker">Comparação</span><h2 id="fi-comparar-t">{maiuscula(soMes(chaveMes))} × {soMes(chaveAnterior)}</h2>
      <p>A comparação justa é com {soMes(chaveAnterior)} até o dia {dia}, na mesma hora. A última coluna mostra {soMes(chaveAnterior)} inteiro, para saber quanto falta para empatar.</p></div></div>
    <div className="hb-painel hb-duelo" role="table" aria-label={`${soMes(chaveMes)} comparado com ${soMes(chaveAnterior)}`}>
      <div className="hb-duelo__cab" role="row">
        <span role="columnheader"><span className="a3-so-leitor">Indicador</span></span>
        <span role="columnheader" className="hb-duelo__atual">{maiuscula(soMes(chaveMes))}<small>até agora</small></span>
        <span role="columnheader">{maiuscula(soMes(chaveAnterior))}<small>até o dia {dia}</small></span>
        <span role="columnheader">Diferença</span>
        <span role="columnheader">{maiuscula(soMes(chaveAnterior))}<small>inteiro</small></span>
      </div>
      {grupos.map(gr => <div key={gr.titulo} role="rowgroup" className="hb-duelo__grupo">
        <div className="hb-duelo__grupo-t" role="row"><span role="rowheader">{gr.titulo}</span></div>
        {gr.linhas.map(l => { const f = l.formato ?? inteiro; return <div key={l.nome} className="hb-duelo__linha" role="row">
          <span role="rowheader" className="hb-duelo__nome">{l.nome}{l.ajuda && <small>{l.ajuda}</small>}</span>
          <span role="cell" className="hb-duelo__atual" data-rotulo={`${maiuscula(soMes(chaveMes))} até agora`}><b>{f(l.v(a))}</b>{l.detalhe && <small>{l.detalhe(a)}</small>}</span>
          <span role="cell" data-rotulo={`${maiuscula(soMes(chaveAnterior))} até o dia ${dia}`}>{f(l.v(m))}{l.detalhe && <small>{l.detalhe(m)}</small>}</span>
          <span role="cell" data-rotulo="Diferença"><Variacao atual={l.v(a)} anterior={l.v(m)} formato={l.formato ? reaisCurto : inteiro} bom={l.bom} /></span>
          <span role="cell" data-rotulo={`${maiuscula(soMes(chaveAnterior))} inteiro`} className="hb-duelo__fraco">{f(l.v(t))}</span>
        </div> })}
      </div>)}
    </div>
  </section>
}

/* ───────────── 3. Quem paga hoje ───────────── */

function Pagantes({ resumo, carteira, nomes, todas, agora }: { resumo: ReturnType<typeof carteiraHoje>; carteira: Pagante[]; nomes: Map<string, string>; todas: Cobranca[]; agora: Date }) {
  const nav = usarNav()
  const p = usarPainel()
  const [aberto, abrir] = useState<{ titulo: string; ids: string[] } | null>(null)
  const base = useMemo(() => baseEm(periodosPagos(todas.filter(c => c.em <= agora)), agora.getTime()), [todas, agora])
  const cor = { mensal: 'verde', semestral: 'azul', anual: 'ouro' } as const
  const mostrar = (titulo: string, ids: string[]) => { abrir(aberto?.titulo === titulo ? null : { titulo, ids }); requestAnimationFrame(() => document.getElementById('fi-pessoas')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' })) }
  const pix = resumo.linhas.reduce((s, l) => s + l.pix, 0), renova = resumo.linhas.reduce((s, l) => s + l.cartaoRenova, 0), desligou = resumo.linhas.reduce((s, l) => s + l.cartaoDesligou, 0)
  const porId = new Map(carteira.map(x => [x.id, x]))
  return <section id="fi-pagantes" className="hb-secao" aria-labelledby="fi-pagantes-t">
    <div className="hb-titulo"><div><span className="hb-kicker">Base</span><h2 id="fi-pagantes-t">Quem paga hoje</h2><p>Uma pessoa por conta, só acesso pago (cortesia fica de fora). Toque num número para ver as pessoas.</p></div></div>
    <div className="hb-painel hb-pagantes">
      <div className="hb-pagantes__total">
        <button type="button" className="hb-numero-grande" onClick={() => mostrar('Todos os pagantes com acesso', resumo.linhas.flatMap(l => l.ids))}>{inteiro(resumo.total)}<Icone nome="direita" tamanho={18} /></button>
        <span>pagantes com acesso</span>
        <small>Receita mensal equivalente: <b>{reais(base.receitaEquivalente)}</b> (semestral ÷ 6, anual ÷ 12)</small>
      </div>
      <Composicao rotulo="Pagantes por plano" partes={resumo.linhas.map(l => ({ nome: l.nome, valor: l.total, cor: cor[l.plano], detalhe: `${l.pix} Pix · ${l.cartaoRenova} cartão${l.cartaoDesligou ? ` · ${l.cartaoDesligou} desligou` : ''}`, aoClicar: () => mostrar(l.nome, l.ids) }))} />
      <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta hb-tabela">
        <thead><tr><th scope="col">Plano</th><th scope="col" className="num">Pix<small>paga de novo a cada vencimento</small></th><th scope="col" className="num">Cartão<small>renova sozinho</small></th><th scope="col" className="num">Cartão<small>desligou a renovação</small></th><th scope="col" className="num">Total</th></tr></thead>
        <tbody>{resumo.linhas.map(l => {
          const ids = (f: (x: Pagante) => boolean) => l.ids.filter(id => { const x = porId.get(id); return x ? f(x) : false })
          const celula = (n: number, titulo: string, lista: string[]) => n ? <button type="button" className="ng-numero" onClick={() => mostrar(titulo, lista)}>{inteiro(n)}</button> : <span className="hb-zero">0</span>
          return <tr key={l.plano}><th scope="row"><i className={`hb-chave hb-c-${cor[l.plano]}`} aria-hidden="true" /> {l.nome}</th>
            <td className="num">{celula(l.pix, `${l.nome} · Pix`, ids(x => x.meio === 'pix'))}</td>
            <td className="num">{celula(l.cartaoRenova, `${l.nome} · cartão que renova`, ids(x => x.renova))}</td>
            <td className="num">{celula(l.cartaoDesligou, `${l.nome} · cartão sem renovação`, ids(x => x.saindo))}</td>
            <td className="num"><b>{inteiro(l.total)}</b></td></tr>
        })}</tbody>
        <tfoot><tr><th scope="row">Total</th><td className="num">{inteiro(pix)}</td><td className="num">{inteiro(renova)}</td><td className="num">{inteiro(desligou)}</td><td className="num"><b>{inteiro(resumo.total)}</b></td></tr></tfoot>
      </table></div>
      <Equivalente carteira={carteira} />
      {aberto && <div id="fi-pessoas" className="hb-pessoas">
        <div className="hb-titulo"><h3>{aberto.titulo} <small>{plural(aberto.ids.length, 'pessoa', 'pessoas')}</small></h3><button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => abrir(null)}>Fechar</button></div>
        <ul>{aberto.ids.map(id => { const x = porId.get(id); return <li key={id}><button type="button" onClick={() => nav.abrirPessoa(id, 'assinatura')}>
          <span>{nomes.get(id) ?? p.usuarios?.find(u => u.id_usuario === id)?.nome ?? 'Pessoa sem nome'}</span>
          {x && <small>{rotuloPlano(x.plano)} · {x.meio === 'pix' ? 'Pix' : x.renova ? 'cartão' : 'cartão, sem renovar'} · {reais(x.preco)} · vence {data(x.fim.toISOString())}</small>}
        </button></li> })}</ul>
      </div>}
    </div>
  </section>
}

/**
 * A receita mensal equivalente por plano e por preço (Tales, 11/11/2026: "contando os planos antigos"): cada
 * grupo de quem pagou o mesmo valor, com o valor de cada mês (semestral ÷ 6, anual ÷ 12). Os preços antigos
 * (semestral R$ 179,90 ≈ R$ 29,98/mês; anual R$ 239,90 ≈ R$ 19,99/mês) aparecem separados dos atuais.
 */
function Equivalente({ carteira }: { carteira: Pagante[] }) {
  const grupos = new Map<string, { plano: string; meses: number; preco: number; pessoas: number }>()
  for (const x of carteira) {
    const k = `${x.plano}|${x.preco.toFixed(2)}`
    const g = grupos.get(k) ?? { plano: x.plano, meses: x.meses, preco: x.preco, pessoas: 0 }
    g.pessoas++; grupos.set(k, g)
  }
  const ordem = ['mensal', 'semestral', 'anual']
  const linhas = [...grupos.values()].sort((a, b) => ordem.indexOf(a.plano) - ordem.indexOf(b.plano) || b.preco - a.preco)
  const total = linhas.reduce((s, l) => s + l.pessoas * l.preco / l.meses, 0)
  const atual = (plano: string) => precoDe(plano)?.total ?? 0
  return <div className="hb-equiv">
    <div className="hb-titulo"><div><h3>Receita mensal equivalente: <span className="hb-equiv__total">{reais(total)}</span> por mês</h3><p>Quanto cada pagante vale por mês, pelo preço que de fato pagou: mensal inteiro, semestral ÷ 6, anual ÷ 12. Quem entrou antes do reajuste de 31/10 continua no preço antigo enquanto renovar.</p></div></div>
    <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta hb-tabela">
      <thead><tr><th scope="col">Plano e preço</th><th scope="col" className="num">Pessoas</th><th scope="col" className="num">Pagou</th><th scope="col" className="num">Por mês, cada um</th><th scope="col" className="num">Por mês, o grupo</th><th scope="col" className="num">Parte do total</th></tr></thead>
      <tbody>{linhas.map(l => { const mes = l.preco / l.meses, grupo = l.pessoas * mes, antigo = l.preco < atual(l.plano) - 0.01; return <tr key={`${l.plano}${l.preco}`}>
        <th scope="row">{rotuloPlano(l.plano)}{l.plano !== 'mensal' && <small>{antigo ? 'preço antigo' : l.preco > atual(l.plano) + 0.01 ? 'outro preço' : 'preço atual'}</small>}</th>
        <td className="num">{inteiro(l.pessoas)}</td><td className="num">{reais(l.preco)}{l.meses > 1 && <small>a cada {l.meses} meses</small>}</td>
        <td className="num"><b>{reais(mes)}</b></td><td className="num">{reais(grupo)}</td>
        <td className="num"><span className="hb-equiv__parte"><i style={{ width: `${total ? grupo / total * 100 : 0}%` }} /></span>{total ? `${Math.round(grupo / total * 100)}%` : '—'}</td></tr> })}</tbody>
      <tfoot><tr><th scope="row">Total</th><td className="num">{inteiro(carteira.length)}</td><td /><td className="num">{carteira.length ? reais(total / carteira.length) : '—'}<small>média por pessoa</small></td><td className="num"><b>{reais(total)}</b></td><td className="num">100%</td></tr></tfoot>
    </table></div>
  </div>
}

/* ───────────── 4. Quando entrou ───────────── */

type Divisao = 'meio' | 'tipo' | 'plano'
function Entrou({ todas, agora }: { todas: Cobranca[]; agora: Date }) {
  const [escala, definirEscala] = useState<Escala>('dia')
  const [divisao, definirDivisao] = useState<Divisao>('meio')
  const n = escala === 'dia' ? 30 : escala === 'semana' ? 12 : Math.max(3, mesesDesdeOInicio(todas, agora).length)
  const serie = useMemo(() => recebidoPorPeriodo(todas, escala, n, agora), [todas, escala, n, agora])
  const series = divisao === 'meio' ? [{ nome: 'Pix', cor: 'ouro' as const, k: 'pix' as const }, { nome: 'Cartão', cor: 'verde' as const, k: 'cartao' as const }]
    : divisao === 'tipo' ? [{ nome: 'Primeiras compras', cor: 'verde' as const, k: 'nova' as const }, { nome: 'Renovações', cor: 'ouro' as const, k: 'renovacao' as const }, { nome: 'Voltaram', cor: 'azul' as const, k: 'volta' as const }]
      : [{ nome: 'Mensal', cor: 'verde' as const, k: 'mensal' as const }, { nome: 'Semestral', cor: 'azul' as const, k: 'semestral' as const }, { nome: 'Anual', cor: 'ouro' as const, k: 'anual' as const }]
  const rot = (k: string) => escala === 'mes' ? { curto: mesCurto(k), longo: maiuscula(NOME_MES(k)) } : escala === 'semana' ? { curto: `${k.slice(8)}/${k.slice(5, 7)}`, longo: `Semana de ${k.slice(8)}/${k.slice(5, 7)}` } : { curto: `${k.slice(8)}`, longo: maiuscula(new Date(`${k}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' })) }
  const pontos: PontoTorre[] = serie.map(s => ({ ...rot(s.chave), partes: series.map(x => s[x.k]), parcial: s.parcial, nota: `${plural(s.quantidade, 'pagamento', 'pagamentos')}${s.parcial ? ' · em andamento' : ''}` }))
  const completos = serie.filter(s => !s.parcial)
  const media = completos.length ? completos.reduce((s, x) => s + x.total, 0) / completos.length : 0
  const melhor = serie.reduce((m, s) => s.total > m.total ? s : m, serie[0])
  const nomeP = escala === 'dia' ? 'dia' : escala === 'semana' ? 'semana' : 'mês'
  return <section id="fi-entrou" className="hb-secao" aria-labelledby="fi-entrou-t">
    <div className="hb-titulo"><div><span className="hb-kicker">Recebimentos</span><h2 id="fi-entrou-t">Quando o dinheiro entrou</h2><p>Cada coluna é {escala === 'semana' ? 'uma' : 'um'} {nomeP}; o número em cima é o total. O último período ainda está em andamento.</p></div>
      <div className="hb-controles"><Segmento rotulo="Período" valor={escala} aoMudar={definirEscala} opcoes={[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']]} /><Segmento rotulo="Dividir por" valor={divisao} aoMudar={definirDivisao} opcoes={[['meio', 'Pix ou cartão'], ['tipo', 'Nova ou renovação'], ['plano', 'Plano']]} /></div></div>
    <div className="hb-painel">
      <dl className="hb-mini">
        <div><dt>Média por {nomeP} completo</dt><dd>{reais(media)}</dd></div>
        <div><dt>{escala === 'semana' ? 'Melhor semana' : `Melhor ${nomeP}`}</dt><dd>{melhor ? reais(melhor.total) : '—'}</dd><small>{melhor && melhor.total ? rot(melhor.chave).longo : ''}</small></div>
        <div><dt>Total no gráfico</dt><dd>{reais(serie.reduce((s, x) => s + x.total, 0))}</dd><small>{plural(serie.reduce((s, x) => s + x.quantidade, 0), 'pagamento', 'pagamentos')}</small></div>
      </dl>
      <Torres titulo={`Recebido por ${nomeP}`} formato={reais} altura={240} pontos={pontos} series={series.map(({ nome, cor }) => ({ nome, cor }))} />
    </div>
  </section>
}

/* ───────────── 5. Previsão de 12 meses ───────────── */

function Previsao({ doze, taxa, todas, agora, carteira, resumo, novasMes }: {
  doze: Array<{ quem: Pagante; em: Date; chave: string; ciclo: number }>; taxa: number; todas: Cobranca[]; agora: Date; carteira: Pagante[]; resumo: ReturnType<typeof carteiraHoje>
  /** Clientes novos até o fim do mês atual: o mesmo número do placar do caixa (ritmo do mês). */
  novasMes: number
}) {
  const p = usarPainel()
  const [comNovos, definirComNovos] = useState(true)
  const chave = MES(agora)
  // Clientes novos: o modelo de crescimento com os números de hoje, com e sem compras novas; a diferença é o que os novos trazem.
  const novos = useMemo(() => {
    if (!p.usuariosReais) return null
    const base = parametrosAoVivo({ usuarios: p.usuariosReais, cobrancas: todas, carteira: resumo, taxaPix: taxa, agora: agora.getTime() })
    const com = projetarCrescimento(base), sem = projetarCrescimento({ ...base, conversao: 0, conversaoAtrasada: 0 })
    return new Map(com.map((x, i) => [x.mes, i === 0 ? novasMes : Math.max(0, x.faturamento - sem[i].faturamento)]))
  }, [p.usuariosReais, todas, resumo, taxa, agora, novasMes])
  const linhas = Array.from({ length: 12 }, (_, i) => somarMesChave(chave, i)).map(k => {
    const l = doze.filter(x => x.chave === k)
    const recebido = k === chave ? todas.filter(c => MES(c.em) === k && c.em <= agora).reduce((s, c) => s + c.valor, 0) : 0
    const cartao = l.filter(x => x.quem.meio === 'cartao').reduce((s, x) => s + x.quem.preco, 0)
    const pix = l.filter(x => x.quem.meio === 'pix').reduce((s, x) => s + x.quem.preco * taxa ** x.ciclo, 0)
    return { k, recebido, cartao, pix, novos: comNovos ? novos?.get(k) ?? 0 : 0, longos: l.filter(x => x.quem.plano !== 'mensal').length, pessoas: l.length }
  })
  const total = (x: typeof linhas[number]) => x.recebido + x.cartao + x.pix + x.novos
  const soma12 = linhas.reduce((s, x) => s + total(x), 0)
  const pontos: PontoTorre[] = linhas.map(x => ({ curto: mesCurto(x.k), longo: maiuscula(NOME_MES(x.k)) + (x.k === chave ? ' (em andamento)' : ''), partes: [x.recebido, x.cartao, x.pix], previsto: x.novos || undefined, parcial: x.k === chave, nota: `${plural(x.pessoas, 'vencimento', 'vencimentos')} de quem já assina${x.longos ? `, ${x.longos} de plano longo` : ''}` }))
  const longos = carteira.filter(x => x.plano !== 'mensal').sort((a, b) => a.fim.getTime() - b.fim.getTime())
  const porMesLongo = Array.from({ length: 13 }, (_, i) => somarMesChave(chave, i)).map(k => ({ k, l: doze.filter(x => x.chave === k && x.quem.plano !== 'mensal') }))
  return <section id="fi-previsao" className="hb-secao" aria-labelledby="fi-previsao-t">
    <div className="hb-titulo"><div><span className="hb-kicker">Previsão</span><h2 id="fi-previsao-t">Quanto deve entrar em cada mês</h2>
      <p>Verde: já entrou. Azul: cartão agendado. Dourado: Pix de quem já assina, com {Math.round(taxa * 100)}% renovando. {comNovos ? 'Hachurado: clientes novos no ritmo de hoje (modelo das Metas).' : 'Só quem já assina.'} Em 12 meses: <b>{reais(soma12)}</b>.</p></div>
      <div className="hb-controles"><Segmento rotulo="Clientes novos" valor={comNovos ? 'com' : 'sem'} aoMudar={v => definirComNovos(v === 'com')} opcoes={[['com', 'Com clientes novos'], ['sem', 'Só quem já assina']]} /></div></div>
    <div className="hb-painel">
      <Torres titulo="Previsão de recebimento por mês" formato={reais} altura={260} pontos={pontos} series={[{ nome: 'Já entrou', cor: 'verde' }, { nome: 'Cartão agendado', cor: 'azul' }, { nome: 'Pix provável', cor: 'ouro' }]} rotuloPrevisto="Clientes novos (estimativa)" />
      <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta hb-tabela">
        <thead><tr><th scope="col">Mês</th><th scope="col" className="num">Já entrou</th><th scope="col" className="num">Cartão agendado</th><th scope="col" className="num">Pix provável</th>{comNovos && <th scope="col" className="num">Clientes novos</th>}<th scope="col" className="num">Total</th></tr></thead>
        <tbody>{linhas.map(x => <tr key={x.k} className={x.k === chave ? 'hb-linha-atual' : undefined}><th scope="row">{maiuscula(NOME_MES(x.k))}</th><td className="num">{x.recebido ? reais(x.recebido) : '—'}</td><td className="num">{x.cartao ? reais(x.cartao) : '—'}</td><td className="num">{x.pix ? reais(x.pix) : '—'}</td>{comNovos && <td className="num">{x.novos ? `≈ ${reais(x.novos)}` : '—'}</td>}<td className="num"><b>{reais(total(x))}</b></td></tr>)}</tbody>
      </table></div>
    </div>
    <div className="hb-painel hb-longos">
      <div className="hb-titulo"><div><h3>Semestrais e anuais: quando o dinheiro deles volta</h3><p>Esses planos já pagaram adiantado e só voltam a pagar quando o plano vence. A linha mostra quantos vencem em cada mês e quanto deve entrar. Hoje são {inteiro(longos.length)}: {longos.filter(x => x.plano === 'semestral').length} semestrais e {longos.filter(x => x.plano === 'anual').length} anuais.</p></div></div>
      <ol className="hb-trilho">{porMesLongo.map(({ k, l }) => <li key={k} className={l.length ? 'tem' : undefined}>
        <span>{mesCurto(k)}<small>{k.slice(2, 4)}</small></span>
        <b>{l.length || '·'}</b>
        <small>{l.length ? reaisCurto(l.reduce((s, x) => s + (x.quem.meio === 'pix' ? x.quem.preco * taxa ** x.ciclo : x.quem.preco), 0)) : ''}</small>
      </li>)}</ol>
      <details className="hb-dados"><summary>Ver cada assinante semestral e anual</summary>
        {!longos.length ? <Estado compacto titulo="Ninguém com plano semestral ou anual agora" /> : <Tabela rotulo="Semestrais e anuais" compacta linhas={longos} chave={x => x.id} porPagina={30} colunas={[
          { id: 'n', titulo: 'Assinante', celula: x => <span className="a3-nome">{x.nome}</span> },
          { id: 'p', titulo: 'Plano', celula: x => rotuloPlano(x.plano), rotuloCelular: 'Plano' },
          { id: 'm', titulo: 'Como paga', celula: x => x.saindo ? <span className="fraco">Cartão, desligou a renovação</span> : x.meio === 'pix' ? 'Pix (precisa pagar de novo)' : 'Cartão (renova sozinho)', rotuloCelular: 'Como paga' },
          { id: 'v', titulo: 'Pagou', numero: true, celula: x => reais(x.preco), ordem: x => x.preco, rotuloCelular: 'Pagou' },
          { id: 'd', titulo: 'Vence em', numero: true, celula: x => <b>{data(x.fim.toISOString())}</b>, ordem: x => x.fim.getTime(), rotuloCelular: 'Vence' },
        ]} />}
      </details>
    </div>
  </section>
}

/* ───────────── 6. Simulador dos mensais ───────────── */

function Simulador({ carteira, taxa, escolhida, escolher, sugestao }: {
  carteira: Pagante[]; taxa: number; escolhida: number | null; escolher: (t: number | null) => void; sugestao: ReturnType<typeof taxaPixSugerida>
}) {
  const m = carteira.filter(x => x.plano === 'mensal')
  const cartao = m.filter(x => x.renova), pix = m.filter(x => x.meio === 'pix'), saindo = m.filter(x => x.saindo)
  const soma = (l: Pagante[]) => l.reduce((s, x) => s + x.preco, 0)
  const vCartao = soma(cartao), vPix = soma(pix), porMes = vCartao + vPix * taxa
  const [novosMes, definirNovos] = useState(() => Math.max(5, Math.round(m.length / 2)))
  const ret = retencaoMensal({ mensaisNoPix: m.length ? pix.length / m.length : 0.9, pixRenova: taxa, cartaoContinua: 0.95 })
  const preco = precoDe('mensal')?.total ?? 39.9
  const seis: Array<{ i: number; mensais: number }> = []
  for (let i = 1, ant = m.length; i <= 6; i++) { ant = ant * ret + novosMes; seis.push({ i, mensais: ant }) }
  const teto = ret < 1 ? novosMes / (1 - ret) : Infinity
  const fonte = sugestao.fonte === 'fechada' ? `${sugestao.observado.renovados} de ${sugestao.observado.encerrados} Pix renovaram (${Math.round(sugestao.taxa * 100)}%)`
    : sugestao.fonte === 'parcial' ? `até agora, ${sugestao.parcial.renovados} de ${sugestao.parcial.encerrados} Pix vencidos renovaram (${Math.round(sugestao.taxa * 100)}%)` : 'ainda há poucos Pix vencidos; a regra é 80%'
  const pontos = Math.round(pix.length * taxa)
  return <section id="fi-mensais" className="hb-secao" aria-labelledby="fi-mensais-t">
    <div className="hb-titulo"><div><span className="hb-kicker">Simulador</span><h2 id="fi-mensais-t">Quanto os mensais trazem por mês</h2>
      <p>{plural(m.length, 'assinante mensal', 'assinantes mensais')} hoje: {cartao.length} no cartão (renova sozinho) e {pix.length} no Pix (paga de novo quando o mês acaba). Arraste para ver o que acontece se mais ou menos gente do Pix renovar. A escolha vale para a página toda.</p></div></div>
    <div className="hb-painel hb-sim">
      <div className="hb-sim__controle">
        <label htmlFor="fi-taxa" className="hb-sim__pergunta">Dos {pix.length} que pagam com Pix, quantos renovam? <b>{Math.round(taxa * 100)}%</b> <small>({pontos} {pontos === 1 ? 'pessoa' : 'pessoas'})</small></label>
        <div className="hb-sim__deslizador">
          <input id="fi-taxa" type="range" min={0} max={100} step={5} value={Math.round(taxa * 100)} onChange={e => escolher(Number(e.target.value) / 100)} aria-valuetext={`${Math.round(taxa * 100)}%, ${pontos} de ${pix.length} pessoas`} />
          <span className="hb-sim__marca" style={{ left: `${sugestao.taxa * 100}%` }} title={fonte}>o que aconteceu</span>
        </div>
        <div className="hb-sim__atalhos" role="group" aria-label="Atalhos de porcentagem">{[0.5, 0.6, 0.7, 0.8, 0.9, 1].map(t => <button key={t} type="button" aria-pressed={Math.abs(t - taxa) < 0.001} onClick={() => escolher(t)}>{Math.round(t * 100)}%</button>)}
          {escolhida !== null && <button type="button" className="hb-sim__voltar" onClick={() => escolher(null)}>Voltar ao que aconteceu ({Math.round(sugestao.taxa * 100)}%)</button>}</div>
        <p className="hb-nota">Base da sugestão: {fonte}.</p>
        <div className="hb-gente" role="img" aria-label={`${cartao.length} no cartão, ${pontos} do Pix renovando e ${pix.length - pontos} do Pix sem renovar`}>
          {cartao.map((x, i) => <i key={`c${i}`} className="hb-gente--cartao" title={`${x.nome} · cartão`} />)}
          {pix.map((x, i) => <i key={`p${i}`} className={i < pontos ? 'hb-gente--pix' : 'hb-gente--sai'} title={`${x.nome} · Pix`} />)}
          {saindo.map((x, i) => <i key={`s${i}`} className="hb-gente--sai" title={`${x.nome} · desligou o cartão`} />)}
        </div>
        <ul className="hb-legenda"><li><i className="hb-chave hb-c-verde" />Cartão</li><li><i className="hb-chave hb-c-ouro" />Pix que renova</li><li><i className="hb-chave hb-c-vazio" />Não renova</li></ul>
      </div>
      <div className="hb-sim__conta">
        <span className="hb-kicker">Por mês, só com quem já é mensal</span>
        <b className="hb-sim__resultado">{reais(porMes)}</b>
        <ul>
          <li><span>{cartao.length} no cartão × {reaisCurto(cartao.length ? vCartao / cartao.length : preco)}</span><b>{reais(vCartao)}</b></li>
          <li><span>{pix.length} no Pix × {Math.round(taxa * 100)}% × {reaisCurto(pix.length ? vPix / pix.length : preco)}</span><b>{reais(vPix * taxa)}</b></li>
          <li className="hb-sim__ano"><span>Num ano, se ficar assim</span><b>{reais(porMes * 12)}</b></li>
        </ul>
        {saindo.length > 0 && <p className="hb-nota">Fora da conta: {plural(saindo.length, 'mensal desligou', 'mensais desligaram')} a renovação do cartão.</p>}
        <div className="hb-sim__futuro">
          <label htmlFor="fi-novos">E se entrarem <b>{novosMes}</b> mensais novos por mês?</label>
          <input id="fi-novos" type="range" min={0} max={Math.max(80, m.length * 2)} step={1} value={novosMes} onChange={e => definirNovos(Number(e.target.value))} />
          <ol className="hb-sim__meses">{seis.map(x => <li key={x.i}><span>em {x.i} {x.i === 1 ? 'mês' : 'meses'}</span><b>{inteiro(Math.round(x.mensais))}</b><small>{reaisCurto(Math.round(x.mensais * preco))}/mês</small></li>)}</ol>
          <p className="hb-nota">Cada mês, {Math.round(ret * 100)}% dos mensais continuam (Pix com {Math.round(taxa * 100)}%, cartão com 95%). Nesse ritmo, a base de mensais tende a {Number.isFinite(teto) ? `${inteiro(Math.round(teto))} pessoas (${reaisCurto(Math.round(teto * preco))} por mês)` : 'crescer sem parar'}.</p>
        </div>
      </div>
    </div>
  </section>
}

/* ───────────── 8. Histórico mês a mês ───────────── */

function Historico({ historico, assinaturas, todas, agora }: { historico: Mes[]; assinaturas: LinhaAssinatura[]; todas: Cobranca[]; agora: Date }) {
  const linhas = useMemo(() => [...historico].reverse().map((m, i, l) => {
    const foto = fotoDoMes(m.chave, assinaturas, todas, undefined, agora.getTime())
    const antes = l[i + 1]?.baseCartao ?? 0
    return { m, foto, churn: antes ? porcentagem(m.cancelamentos, antes) : null }
  }), [historico, assinaturas, todas, agora])
  const csv = () => baixarCsv(`ortoquestoes-mes-a-mes-${DIA(agora)}.csv`,
    ['Mês', 'Receita', 'Primeiras compras', 'Novas no cartão', 'Novas no Pix', 'Receita de primeiras compras', 'Renovações', 'Renovações no Pix', 'Voltaram', 'Receita de renovações', 'Desligaram a renovação', 'Reembolsos', 'Valor reembolsado', 'Pagantes no fim', 'Mensais no fim', 'Semestrais no fim', 'Anuais no fim', 'Receita mensal equivalente', 'Churn do cartão (%)'],
    linhas.map(({ m, foto, churn }) => [NOME_MES(m.chave), m.receita.toFixed(2).replace('.', ','), m.novasCartao + m.novasPix, m.novasCartao, m.novasPix, m.receitaNovas.toFixed(2).replace('.', ','), m.renovacoes, m.renovacoesPix, m.voltas, (m.receitaRenovacoes + m.receitaVoltas).toFixed(2).replace('.', ','), m.cancelamentos, m.reembolsos, m.valorReembolsado.toFixed(2).replace('.', ','), foto.baseFim.total, foto.baseFim.porPlano.mensal, foto.baseFim.porPlano.semestral, foto.baseFim.porPlano.anual, foto.baseFim.receitaEquivalente.toFixed(2).replace('.', ','), churn]))
  const cel = (v: ReactNode, rot: string) => <td className="num" data-rotulo={rot}>{v}</td>
  return <section id="fi-historico" className="hb-secao" aria-labelledby="fi-historico-t">
    <div className="hb-titulo"><div><span className="hb-kicker">Histórico</span><h2 id="fi-historico-t">Mês a mês, desde o começo</h2><p>Cada mês com o que entrou, quem chegou, quem renovou, quem saiu e o tamanho da base no último dia. O mês atual conta até agora.</p></div>
      <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={csv}><Icone nome="baixar" tamanho={14} />CSV</button></div>
    <div className="hb-painel"><div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta hb-tabela hb-historico">
      <thead><tr><th scope="col">Mês</th><th scope="col" className="num">Recebido</th><th scope="col" className="num">Assinantes novos</th><th scope="col" className="num">Renovações</th><th scope="col" className="num">Desligaram</th><th scope="col" className="num">Reembolsos</th><th scope="col" className="num">Pagantes no fim</th><th scope="col" className="num">Mensais no fim</th><th scope="col" className="num">Churn do cartão</th></tr></thead>
      <tbody>{linhas.map(({ m, foto, churn }) => <tr key={m.chave} className={m.chave === MES(agora) ? 'hb-linha-atual' : undefined}>
        <th scope="row">{maiuscula(NOME_MES(m.chave))}{m.chave === MES(agora) && <small>até agora</small>}</th>
        {cel(<><b>{reais(m.receita)}</b><small>{reaisCurto(m.receitaNovas)} novas · {reaisCurto(m.receitaRenovacoes + m.receitaVoltas)} renov.</small></>, 'Recebido')}
        {cel(<>{m.novasCartao + m.novasPix}<small>{m.novasPix} Pix · {m.novasCartao} cartão</small></>, 'Novos')}
        {cel(<>{m.renovacoes + m.voltas}<small>{m.renovacoesPix} Pix{m.voltas ? ` · ${m.voltas} voltaram` : ''}</small></>, 'Renovações')}
        {cel(inteiro(m.cancelamentos), 'Desligaram')}
        {cel(m.reembolsos ? <>{m.reembolsos}<small>{reais(m.valorReembolsado)}</small></> : '0', 'Reembolsos')}
        {cel(<><b>{inteiro(foto.baseFim.total)}</b><small>{reaisCurto(Math.round(foto.baseFim.receitaEquivalente))}/mês equiv.</small></>, 'Pagantes no fim')}
        {cel(<>{inteiro(foto.baseFim.porPlano.mensal)}<small>{foto.baseFim.porPlano.semestral} sem. · {foto.baseFim.porPlano.anual} anual</small></>, 'Mensais no fim')}
        {cel(churn === null ? '—' : <span className={churn > 10 ? 'hb-ruim' : undefined}>{churn}%</span>, 'Churn')}
      </tr>)}</tbody>
    </table></div>
    <p className="hb-nota">Churn do cartão: quem desligou a renovação no mês, sobre os cartões que renovavam no fim do mês anterior. O Pix não entra aqui, porque ele termina sem renovar (a renovação do Pix está no simulador).</p></div>
  </section>
}

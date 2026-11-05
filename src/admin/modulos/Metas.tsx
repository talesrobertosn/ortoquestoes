import { useMemo, useState, type ReactNode } from 'react'
import { taxaPixSugerida } from '../../componentes/admin/financeiro'
import { MES, NOME_MES, cobrancas as cobrancasDe, mesAMes, somarMesChave } from '../../componentes/admin/receita'
import { rotuloMeio, rotuloPlano } from '../../componentes/admin/rotulos'
import { rpcInexistente, usarRpc } from '../../componentes/admin/usarRpc'
import { chamarRpc } from '../../servicos/supabase'
import { usarPainel } from '../dados/painel'
import { META_MODERADA, ROTULO_SITUACAO, esperadoAteHoje, metasVigentes, porSemanaNecessario, projetarMes, realizadoPorMes, situacao, tiposDeReceita, type Faixa, type LinhaMetaBanco, type MetaMes, type RealizadoMes, type Situacao } from '../dados/metas'
import { inteiro, reais } from '../ui/formato'
import { Colunas } from '../ui/graficos'
import { Carregando, Estado, Faixa as FaixaAviso } from '../ui/kit'
import { avisoRapido } from '../ui/sobreposicoes'
import { CENARIOS } from './Receita'

/**
 * Financeiro › Metas (Tales, 05/11/2026): o cenário moderado como referência permanente, nunca como garantia.
 * Em camadas: o progresso do mês, as cinco metas com projeção e ritmo, a comparação mês a mês, os tipos de
 * receita e, por último, a edição das metas futuras. Metodologia em docs/admin/METAS.md.
 */

type Chave = 'faturamento' | 'cadastros' | 'novosPagantes' | 'ativosFim' | 'receitaEquivalente'
const DEF: Record<Chave, { nome: string; curto: string; dinheiro: boolean; fluxo: boolean; explica: string }> = {
  faturamento: { nome: 'Faturamento recebido', curto: 'Faturamento', dinheiro: true, fluxo: true, explica: 'Pagamentos confirmados no mês (caixa). Reembolsos ficam de fora e aparecem à parte.' },
  cadastros: { nome: 'Cadastros', curto: 'Cadastros', dinheiro: false, fluxo: true, explica: 'Contas novas do público-alvo (sem teste, administrador e contas marcadas fora do público).' },
  novosPagantes: { nome: 'Novos pagantes', curto: 'Primeiras compras', dinheiro: false, fluxo: true, explica: 'Primeira compra paga de cada pessoa. Renovação não conta.' },
  ativosFim: { nome: 'Pagantes ativos', curto: 'Pagantes ativos', dinheiro: false, fluxo: false, explica: 'Pessoas com acesso pago no fim do mês (agora, no mês em andamento). Cortesia não conta.' },
  receitaEquivalente: { nome: 'Receita mensal equivalente', curto: 'Receita equivalente', dinheiro: true, fluxo: false, explica: 'O valor de cada assinatura com acesso ativo, mensalizado (semestral ÷ 6, anual ÷ 12). Não é dinheiro que entra no mês.' },
}
const ORDEM: Chave[] = ['faturamento', 'cadastros', 'novosPagantes', 'ativosFim', 'receitaEquivalente']
const fmt = (k: Chave) => (n: number) => DEF[k].dinheiro ? reais(n) : inteiro(Math.round(n))
const soMes = (k: string) => NOME_MES(k).replace(/ de \d{4}$/, '')

export default function Metas() {
  const p = usarPainel()
  const metasQ = usarRpc<LinhaMetaBanco[]>(p.conta, 'listar_metas_comerciais_admin')
  const semTabela = !!metasQ.erro && rpcInexistente(metasQ.erro)
  const [escolhida, escolher] = useState<number | null>(null)
  const sugerida = useMemo(() => p.reais ? taxaPixSugerida(p.reais).taxa : 0.6, [p.reais])
  const taxa = escolhida ?? sugerida

  const d = useMemo(() => {
    if (!p.reais || !p.usuariosReais) return null
    const todas = cobrancasDe(p.reais, p.cobrancas)
    const cadastros = p.usuariosReais.map(u => new Date(u.criado_em)).filter(x => Number.isFinite(x.getTime()))
    const reemb = new Map(mesAMes(p.reais, 24, new Date(), p.cobrancas).map(x => [x.chave, x.valorReembolsado]))
    const metas = metasVigentes(META_MODERADA, Array.isArray(metasQ.dados) ? metasQ.dados : null)
    const real = realizadoPorMes(metas.map(x => x.mes), cadastros, todas, reemb)
    const metaAtual = metas.find(x => x.mes === MES(new Date()))
    const proj = projetarMes({ cadastros, cobrancas: todas, assinaturas: p.reais, taxaPix: taxa, meta: metaAtual })
    return { todas, metas, real, proj, reemb }
  }, [p.reais, p.usuariosReais, p.cobrancas, metasQ.dados, taxa])

  if (!d) return <Carregando linhas={8} texto="Somando metas e resultados…" />
  const atual = MES(new Date())
  const i = d.metas.findIndex(x => x.mes === atual)
  const meta = d.metas[i]
  const real = d.real[i]
  return <div className="a3-pilha a3-pilha--larga mt">
    {!meta ? <Estado titulo="Fora do período das metas" texto={`O cenário moderado vai de novembro de 2026 a outubro de 2027.`} /> : <>
      <Topo meta={meta} real={real} proj={d.proj} />
      <section className="mt-cartoes" aria-label="As cinco metas do mês">
        {ORDEM.map(k => <CartaoMeta key={k} k={k} meta={meta[k]} real={real[k]} proj={d.proj[k]} diasPassados={d.proj.diasPassados} diasNoMes={d.proj.diasNoMes} diasRestantes={d.proj.diasRestantes} />)}
      </section>
      <Projecao proj={d.proj} meta={meta} taxa={taxa} escolher={escolher} />
      <RitmoSemanal meta={meta} real={real} proj={d.proj} todas={d.todas} />
    </>}
    <Comparacao metas={d.metas} real={d.real} />
    <TiposReceita todas={d.todas} reemb={d.reemb} />
    <Editor metas={d.metas} semTabela={semTabela} aoSalvar={() => void metasQ.recarregar()} />
    <p className="a3-mudo a3-pequeno">Versão fixa: <b>{META_MODERADA.nome}</b> ({META_MODERADA.id}), registrada em {META_MODERADA.registradaEm.split('-').reverse().join('/')}. As metas são planejamento, não garantia de resultado. Faturamento previsto nos 12 meses: {reais(META_MODERADA.meses.reduce((s, x) => s + x.faturamento, 0))}.</p>
  </div>
}

/* ───────────── 1. O progresso do mês ───────────── */

function Barra({ valor, meta, esperado, tom = 'verde' }: { valor: number; meta: number; esperado?: number; tom?: 'verde' | 'ouro' }) {
  const p = meta > 0 ? Math.min(1, valor / meta) : 1
  return <span className={`mt-barra mt-barra--${tom}`} aria-hidden="true">
    <i style={{ width: `${p * 100}%` }} />
    {esperado !== undefined && meta > 0 && <em style={{ left: `${Math.min(100, (esperado / meta) * 100)}%` }} title="esperado até hoje" />}
  </span>
}

function Topo({ meta, real, proj }: { meta: MetaMes; real: RealizadoMes; proj: ReturnType<typeof projetarMes> }) {
  const pct = meta.faturamento ? real.faturamento / meta.faturamento : 0
  const falta = Math.max(0, meta.faturamento - real.faturamento)
  const s = situacao(proj.faturamento.centro, meta.faturamento)
  const bateu = pct >= 1
  const esperado = esperadoAteHoje(meta.faturamento, proj.diasPassados, proj.diasNoMes)
  return <header className={'mt-topo' + (bateu ? ' mt-topo--bateu' : '')}>
    {bateu && <span className="mt-confete" aria-hidden="true">{Array.from({ length: 14 }, (_, k) => <i key={k} style={{ '--k': k } as React.CSSProperties} />)}</span>}
    <span className="a3-rotulo">Metas do OrtoQuestões · {soMes(meta.mes)}</span>
    <h1>Seu progresso neste mês</h1>
    <p className="mt-topo__frase">{bateu ? <>Meta de {soMes(meta.mes)} alcançada! <b>{reais(real.faturamento)}</b> recebidos, {Math.round(pct * 100)}% do objetivo.</>
      : <>Você já alcançou <b>{Math.round(pct * 100)}%</b> da meta de {soMes(meta.mes)}. Faltam <b>{reais(falta)}</b> para chegar ao objetivo.</>}</p>
    <div className="mt-topo__barra">
      <Barra valor={real.faturamento} meta={meta.faturamento} esperado={esperado} tom="ouro" />
      <div className="mt-topo__marcas"><span>{reais(real.faturamento)} recebidos</span><span>esperado até hoje: {reais(esperado)}</span><span>meta {reais(meta.faturamento)}</span></div>
    </div>
    <div className="mt-topo__rodape">
      <Selo s={s} />
      <span>Projeção de fechamento: <b>{reais(proj.faturamento.centro)}</b> (entre {reais(proj.faturamento.baixo)} e {reais(proj.faturamento.alto)})</span>
      <span>Dia {proj.diasPassados} de {proj.diasNoMes} · faltam {proj.diasRestantes} dias</span>
    </div>
  </header>
}

function Selo({ s }: { s: Situacao }) {
  return <span className={`mt-selo mt-selo--${s}`}><i aria-hidden="true" />{ROTULO_SITUACAO[s]}</span>
}

function CartaoMeta({ k, meta, real, proj, diasPassados, diasNoMes, diasRestantes }: { k: Chave; meta: number; real: number; proj: Faixa; diasPassados: number; diasNoMes: number; diasRestantes: number }) {
  const f = fmt(k), def = DEF[k]
  const s = situacao(proj.centro, meta)
  const esperado = def.fluxo ? esperadoAteHoje(meta, diasPassados, diasNoMes) : undefined
  const ritmo = def.fluxo ? porSemanaNecessario(meta, real, diasRestantes) : null
  return <article className={`mt-cartao mt-cartao--${s}`}>
    <header><h3>{def.nome}</h3><Selo s={s} /></header>
    <div className="mt-cartao__numeros"><b>{f(real)}</b><span>de {f(meta)}</span></div>
    <Barra valor={real} meta={meta} esperado={esperado} tom={def.dinheiro ? 'ouro' : 'verde'} />
    <dl>
      {esperado !== undefined && <div><dt>Esperado até hoje</dt><dd>{f(esperado)}</dd></div>}
      <div><dt>Projeção do fim do mês</dt><dd>{f(proj.centro)} <small>({f(proj.baixo)} a {f(proj.alto)})</small></dd></div>
      {ritmo && ritmo.falta > 0 && <div><dt>Para chegar à meta</dt><dd>{f(ritmo.porSemana)} por semana</dd></div>}
      {ritmo && ritmo.falta === 0 && <div><dt>Para chegar à meta</dt><dd className="ok">meta alcançada</dd></div>}
    </dl>
    <p className="mt-cartao__explica">{def.explica}</p>
  </article>
}

/* ───────────── 2. Projeção ───────────── */

function Projecao({ proj, meta, taxa, escolher }: { proj: ReturnType<typeof projetarMes>; meta: MetaMes; taxa: number; escolher: (t: number) => void }) {
  const pt = proj.partes
  const total = Math.max(1, proj.faturamento.alto)
  const seg = (v: number) => `${Math.max(0, (v / total) * 100)}%`
  return <section className="fi-secao" aria-labelledby="mt-proj">
    <header className="fi-secao__cabeca"><span className="fi-secao__selo">Projeção</span><div><h2 id="mt-proj">Projeção de fechamento de {soMes(meta.mes)}</h2>
      <p>Se mantivermos o ritmo atual, {soMes(meta.mes)} pode terminar com aproximadamente <b>{reais(proj.faturamento.centro)}</b>, entre {reais(proj.faturamento.baixo)} e {reais(proj.faturamento.alto)} (intervalo de 90%).</p></div></header>
    {proj.amostraPequena && <FaixaAviso tom="aviso" titulo="Ainda é cedo">Com {proj.diasPassados} {proj.diasPassados === 1 ? 'dia' : 'dias'} de mês, a projeção é só uma ideia: o intervalo é largo de propósito.</FaixaAviso>}
    <div className="fi-cartao">
      <h3>De onde vem a projeção <small>cada parte no seu calendário, sem dividir planos anuais por dia</small></h3>
      <div className="mt-pilha" aria-hidden="true">
        <i className="r" style={{ width: seg(pt.recebido) }} /><i className="c" style={{ width: seg(pt.cartao) }} /><i className="p" style={{ width: seg(pt.pix * taxa) }} /><i className="n" style={{ width: seg(Math.max(0, pt.novas) * pt.ticketNovo) }} />
        <em style={{ left: `${Math.min(100, (meta.faturamento / total) * 100)}%` }}><span>meta</span></em>
      </div>
      <ul className="mt-partes">
        <li><i className="r" />Já recebido<b>{reais(pt.recebido)}</b></li>
        <li><i className="c" />Cartões que renovam até o fim do mês<b>{reais(pt.cartao)}</b></li>
        <li><i className="p" />Pix que vence no mês ({pt.pixPessoas} {pt.pixPessoas === 1 ? 'pessoa' : 'pessoas'}) × {Math.round(taxa * 100)}%<b>{reais(pt.pix * taxa)}</b></li>
        <li><i className="n" />Compras novas esperadas (~{inteiro(Math.round(Math.max(0, pt.novas) * 10) / 10)} × {reais(pt.ticketNovo)})<b>{reais(Math.max(0, pt.novas) * pt.ticketNovo)}</b></li>
      </ul>
      <div className="cal__cenario" role="group" aria-label="Quantos do Pix pagam de novo"><span>Pix pagando de novo:</span>
        {CENARIOS.map(c => <button key={c.nome} type="button" aria-pressed={Math.abs(c.taxa - taxa) < 0.001} onClick={() => escolher(c.taxa)}>{c.nome === 'Metade' ? '50%' : c.nome === 'Todos' ? '100%' : c.nome === 'Pessimista' ? 'Pessimista 30%' : c.nome}</button>)}</div>
    </div>
  </section>
}

/* ───────────── 3. Ritmo semanal ───────────── */

function RitmoSemanal({ meta, real, proj, todas }: { meta: MetaMes; real: RealizadoMes; proj: ReturnType<typeof projetarMes>; todas: ReturnType<typeof cobrancasDe> }) {
  const p = usarPainel()
  const semanas = useMemo(() => {
    const [a, m] = meta.mes.split('-').map(Number)
    const dias = new Date(Date.UTC(a, m, 0)).getUTCDate()
    const lista: Array<{ de: number; ate: number; cad: number; novas: number; receita: number; cohorte: number; cohorteAssinou: number }> = []
    for (let d = 1; d <= dias; d += 7) lista.push({ de: d, ate: Math.min(dias, d + 6), cad: 0, novas: 0, receita: 0, cohorte: 0, cohorteAssinou: 0 })
    const semanaDe = (t: Date) => { const s = new Date(t.getTime() - 3 * 3_600_000); return s.getUTCFullYear() === a && s.getUTCMonth() + 1 === m ? Math.floor((s.getUTCDate() - 1) / 7) : -1 }
    const pagou = new Set(todas.map(c => c.id_usuario))
    for (const u of p.usuariosReais ?? []) { const i = semanaDe(new Date(u.criado_em)); if (i >= 0) { lista[i].cad++; lista[i].cohorte++; if (pagou.has(u.id_usuario)) lista[i].cohorteAssinou++ } }
    for (const c of todas) { const i = semanaDe(c.em); if (i >= 0) { lista[i].receita += c.valor; if (c.tipo === 'nova') lista[i].novas++ } }
    return lista
  }, [meta.mes, p.usuariosReais, todas])
  const rc = porSemanaNecessario(meta.cadastros, real.cadastros, proj.diasRestantes)
  const rn = porSemanaNecessario(meta.novosPagantes, real.novosPagantes, proj.diasRestantes)
  const rf = porSemanaNecessario(meta.faturamento, real.faturamento, proj.diasRestantes)
  const semanaAtual = Math.floor((proj.diasPassados) / 7)
  return <section className="fi-secao" aria-labelledby="mt-ritmo">
    <header className="fi-secao__cabeca"><span className="fi-secao__selo fi-secao__selo--claro">Ritmo</span><div><h2 id="mt-ritmo">O ritmo necessário, semana a semana</h2>
      <p>Semanas do mês contadas a partir do dia 1º (1–7, 8–14…). {rc.falta > 0 || rn.falta > 0 || rf.falta > 0 ? <>Para alcançar a meta de {soMes(meta.mes)}, precisamos de aproximadamente <b>{inteiro(Math.ceil(rc.porSemana))} {Math.ceil(rc.porSemana) === 1 ? 'novo cadastro' : 'novos cadastros'} por semana</b>, <b>{(Math.ceil(rn.porSemana * 10) / 10).toLocaleString('pt-BR')} {rn.porSemana <= 1 ? 'novo pagante' : 'novos pagantes'} por semana</b> e <b>{reais(rf.porSemana)}</b> recebidos por semana até o fim do mês.</> : 'As metas de fluxo do mês já foram alcançadas.'}</p></div></header>
    <div className="fi-cartao">
      <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta mt-tabela">
        <thead><tr><th scope="col">Semana</th><th scope="col" className="num">Cadastros</th><th scope="col" className="num">Novos pagantes</th><th scope="col" className="num">Conversão da coorte</th><th scope="col" className="num">Recebido</th></tr></thead>
        <tbody>{semanas.map((s, k) => <tr key={k} className={k === semanaAtual ? 'atual' : k > semanaAtual ? 'futura' : undefined}>
          <th scope="row">{s.de}–{s.ate} {k === semanaAtual ? <small>em andamento</small> : k > semanaAtual ? <small>ainda não chegou</small> : null}</th>
          <td className="num">{k > semanaAtual ? '—' : inteiro(s.cad)}<span className="a3-sub">meta ≈ {inteiro(Math.round(meta.cadastros * (s.ate - s.de + 1) / proj.diasNoMes))}</span></td>
          <td className="num">{k > semanaAtual ? '—' : inteiro(s.novas)}<span className="a3-sub">meta ≈ {(meta.novosPagantes * (s.ate - s.de + 1) / proj.diasNoMes).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span></td>
          <td className="num">{k > semanaAtual || !s.cohorte ? '—' : `${Math.round((s.cohorteAssinou / s.cohorte) * 100)}%`}<span className="a3-sub">{s.cohorte ? `${s.cohorteAssinou} de ${s.cohorte} já pagaram` : ''}</span></td>
          <td className="num">{k > semanaAtual ? '—' : reais(s.receita)}</td>
        </tr>)}</tbody>
      </table></div>
      <p className="a3-mudo a3-pequeno">Conversão da coorte: das pessoas que se cadastraram naquela semana, quantas já fizeram alguma compra paga (até hoje).</p>
    </div>
  </section>
}

/* ───────────── 4. Comparação mês a mês ───────────── */

function Comparacao({ metas, real }: { metas: Array<MetaMes & { editada: boolean; original: MetaMes }>; real: RealizadoMes[] }) {
  const [k, definirK] = useState<Chave>('faturamento')
  const [mes, definirMes] = useState<string>(MES(new Date()))
  const atual = MES(new Date())
  const f = fmt(k)
  const pontos = metas.map((m, i) => ({ longo: `${NOME_MES(m.mes)}${m.mes === atual ? ' (em andamento)' : m.mes > atual ? ' (ainda não chegou)' : ''}`, curto: NOME_MES(m.mes, true).replace('.', '') + ` ${m.mes.slice(2, 4)}`, partes: [m[k], m.mes > atual ? 0 : real[i][k]] }))
  const iSel = metas.findIndex(m => m.mes === mes)
  const acima = metas.filter((m, i) => m.mes < atual && real[i][k] >= m[k]).length
  const passados = metas.filter(m => m.mes < atual).length
  return <section className="fi-secao" aria-labelledby="mt-comp">
    <header className="fi-secao__cabeca"><span className="fi-secao__selo">Mês a mês</span><div><h2 id="mt-comp">Meta moderada × resultado real</h2>
      <p>Em verde claro, a meta; em verde cheio, o resultado. {passados ? `Em ${acima} de ${passados} meses fechados o resultado superou a meta.` : 'Nenhum mês das metas fechou ainda: o primeiro é novembro de 2026.'}</p></div></header>
    <div className="fi-cartao cc-comparar">
      <div className="mt-chips" role="group" aria-label="O que comparar">{ORDEM.map(x => <button key={x} type="button" aria-pressed={k === x} onClick={() => definirK(x)}>{DEF[x].curto}</button>)}</div>
      <Colunas descricao={`${DEF[k].nome}: meta × real por mês`} pontos={pontos} lado formato={f} media={false} altura={230} series={[{ nome: 'Meta moderada' }, { nome: 'Resultado real', estilo: 2 }]} />
      <div className="mt-meses" role="group" aria-label="Ver os detalhes de um mês">{metas.map(m => <button key={m.mes} type="button" aria-pressed={mes === m.mes} onClick={() => definirMes(m.mes)}>{NOME_MES(m.mes, true).replace('.', '')}<small>{m.mes.slice(2, 4)}</small></button>)}</div>
      {iSel >= 0 && <DetalheMes meta={metas[iSel]} real={real[iSel]} futuro={metas[iSel].mes > atual} andamento={metas[iSel].mes === atual} />}
    </div>
  </section>
}

function DetalheMes({ meta, real, futuro, andamento }: { meta: MetaMes & { editada: boolean; original: MetaMes }; real: RealizadoMes; futuro: boolean; andamento: boolean }) {
  return <div className="mt-detalhe">
    <h3>{NOME_MES(meta.mes)} {andamento ? <small>em andamento</small> : futuro ? <small>ainda não chegou</small> : <small>fechado</small>}{meta.editada && <small> · meta editada (original abaixo)</small>}</h3>
    <ul>{ORDEM.map(k => { const f = fmt(k); const pct = meta[k] ? real[k] / meta[k] : 0; return <li key={k}>
      <span>{DEF[k].nome}</span>
      <b>{futuro ? '—' : f(real[k])}</b>
      <small>meta {f(meta[k])}{meta.editada && meta.original[k] !== meta[k] ? ` · original ${f(meta.original[k])}` : ''}{!futuro ? ` · ${Math.round(pct * 100)}%` : ''}</small>
      {!futuro && <Barra valor={real[k]} meta={meta[k]} tom={DEF[k].dinheiro ? 'ouro' : 'verde'} />}
    </li> })}</ul>
    {real.reembolsado > 0 && <p className="a3-mudo a3-pequeno">Reembolsos do mês (fora do faturamento): {reais(real.reembolsado)}.</p>}
  </div>
}

/* ───────────── 5. Tipos de receita ───────────── */

function TiposReceita({ todas, reemb }: { todas: ReturnType<typeof cobrancasDe>; reemb: Map<string, number> }) {
  const p = usarPainel()
  const atual = MES(new Date())
  const [mes, definirMes] = useState(atual)
  const t = useMemo(() => tiposDeReceita(mes, todas, p.reais ?? [], reemb.get(mes) ?? 0), [mes, todas, p.reais, reemb])
  const meses = Array.from({ length: 6 }, (_, i) => somarMesChave(atual, i - 5))
  const Item = ({ nome, valor, texto, tom }: { nome: string; valor: number; texto: ReactNode; tom?: string }) => <div className={`mt-tipo${tom ? ` mt-tipo--${tom}` : ''}`}><span>{nome}</span><b>{reais(valor)}</b><small>{texto}</small></div>
  return <section className="fi-secao" aria-labelledby="mt-tipos">
    <header className="fi-secao__cabeca"><span className="fi-secao__selo fi-secao__selo--ouro">Receitas</span><div><h2 id="mt-tipos">Cada tipo de receita, com a sua definição</h2>
      <p>Números diferentes respondem a perguntas diferentes. Nenhum deles vira "dinheiro que vai entrar" sem dizer de onde vem.</p></div></header>
    <div className="fi-cartao">
      <div className="mt-chips" role="group" aria-label="Mês">{meses.map(k => <button key={k} type="button" aria-pressed={mes === k} onClick={() => definirMes(k)}>{NOME_MES(k, true).replace('.', '')} {k.slice(2, 4)}</button>)}</div>
      <div className="mt-tipos">
        <Item tom="forte" nome="1. Faturamento recebido" valor={t.recebido} texto={<>Pagamentos confirmados no mês.{t.reembolsado ? ` Reembolsos à parte: ${reais(t.reembolsado)}.` : ' Sem reembolsos.'}</>} />
        <Item nome="2. Receita por competência" valor={t.competencia} texto="Cada pagamento espalhado pelos meses que ele cobre (semestral ÷ 6, anual ÷ 12)." />
        <Item nome="3. Receita mensal equivalente" valor={t.equivalente} texto={mes === atual ? 'Base paga com acesso ativo agora, mensalizada. Não é caixa do mês.' : 'Base paga com acesso no fim do mês, mensalizada.'} />
        <Item nome="4. Recorrente automática" valor={t.recorrenteAutomatica} texto="Só cartões que renovam sozinhos, mensalizados (hoje)." />
        <Item tom="ouro" nome="5. Primeiras compras" valor={t.primeiras} texto="Receita da primeira compra paga de cada pessoa." />
        <Item tom="ouro" nome="6. Renovações" valor={t.renovacoes + t.voltas} texto={t.voltas ? `Inclui ${reais(t.voltas)} de quem voltou depois de mais de 30 dias.` : 'Pagar de novo com acesso valendo ou até 30 dias depois.'} />
      </div>
      <div className="cr-grade-2">
        <div><span className="cc-sub">7. Por plano</span><ul className="mt-lista">{t.porPlano.map(x => <li key={x.plano}><span>{rotuloPlano(x.plano)}<small>{x.quantidade} {x.quantidade === 1 ? 'pagamento' : 'pagamentos'}</small></span><b>{reais(x.valor)}</b></li>)}{!t.porPlano.length && <li className="a3-mudo">Nenhum pagamento no mês.</li>}</ul></div>
        <div><span className="cc-sub">8. Por meio de pagamento</span><ul className="mt-lista">{t.porMeio.map(x => <li key={x.meio}><span>{rotuloMeio(x.meio)}<small>{x.quantidade} {x.quantidade === 1 ? 'pagamento' : 'pagamentos'}</small></span><b>{reais(x.valor)}</b></li>)}{!t.porMeio.length && <li className="a3-mudo">Nenhum pagamento no mês.</li>}</ul></div>
      </div>
      <p className="a3-mudo a3-pequeno">Preço efetivamente pago por cada pessoa (inclusive o preço antigo). Cortesias não entram: não têm cobrança. Cada pagamento conta uma vez; renovação e assinatura duplicada da mesma pessoa não somam duas vezes.</p>
    </div>
  </section>
}

/* ───────────── 6. Editar metas futuras ───────────── */

function Editor({ metas, semTabela, aoSalvar }: { metas: Array<MetaMes & { editada: boolean; original: MetaMes }>; semTabela: boolean; aoSalvar: () => void }) {
  const atual = MES(new Date())
  const futuras = metas.filter(m => m.mes > atual)
  const [aberto, abrir] = useState(false)
  const [rascunho, definirRascunho] = useState<Record<string, MetaMes>>({})
  const [salvando, definirSalvando] = useState<string | null>(null)
  const valor = (m: MetaMes, k: Chave) => rascunho[m.mes]?.[k] ?? m[k]
  const mudar = (m: MetaMes, k: Chave, v: string) => definirRascunho(r => ({ ...r, [m.mes]: { ...(r[m.mes] ?? m), [k]: Number(v.replace(',', '.')) || 0 } }))
  async function salvar(m: MetaMes) {
    const x = rascunho[m.mes]; if (!x) return
    definirSalvando(m.mes)
    try {
      await chamarRpc('salvar_meta_comercial_admin', { p_mes: `${m.mes}-01`, p_cadastros: Math.round(x.cadastros), p_novos_pagantes: Math.round(x.novosPagantes), p_ativos_fim: Math.round(x.ativosFim), p_receita_equivalente: x.receitaEquivalente, p_faturamento: x.faturamento })
      avisoRapido(`Meta de ${soMes(m.mes)} salva. A versão original continua guardada.`); definirRascunho(r => { const n = { ...r }; delete n[m.mes]; return n }); aoSalvar()
    } catch (f) { avisoRapido(rpcInexistente(f) ? 'Rode o SQL das metas no Supabase para poder editar.' : 'Não foi possível salvar a meta.', 'erro') } finally { definirSalvando(null) }
  }
  async function voltar(m: MetaMes) {
    definirSalvando(m.mes)
    try { await chamarRpc('remover_meta_comercial_admin', { p_mes: `${m.mes}-01` }); avisoRapido(`${soMes(m.mes)} voltou à meta original.`); aoSalvar() }
    catch { avisoRapido('Não foi possível voltar à original.', 'erro') } finally { definirSalvando(null) }
  }
  return <details className="a3-painel a3-metodo" open={aberto} onToggle={e => abrir((e.target as HTMLDetailsElement).open)}>
    <summary>Editar metas futuras ({futuras.length} meses) e como os números são calculados</summary>
    <div className="a3-texto">
      {semTabela && <FaixaAviso tom="aviso" titulo="Edição desligada">Rode o SQL das metas (202611050100_metas_e_publico.sql) no Supabase para editar. Enquanto isso, vale a versão fixa.</FaixaAviso>}
      <p>Só meses futuros podem ser editados. A versão original <b>{META_MODERADA.id}</b> nunca muda; a editada fica numa camada à parte e a comparação mostra as duas.</p>
      <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta mt-tabela mt-editor">
        <thead><tr><th scope="col">Mês</th>{ORDEM.map(k => <th key={k} scope="col" className="num">{DEF[k].curto}</th>)}<th scope="col" /></tr></thead>
        <tbody>{futuras.map(m => <tr key={m.mes}><th scope="row">{NOME_MES(m.mes)}{m.editada && <small> editada</small>}</th>
          {ORDEM.map(k => <td key={k} className="num"><input className="a3-entrada num" inputMode="decimal" aria-label={`${DEF[k].nome} de ${NOME_MES(m.mes)}`} disabled={semTabela} value={String(valor(m, k))} onChange={e => mudar(m, k, e.target.value)} /><span className="a3-sub">original {fmt(k)(m.original[k])}</span></td>)}
          <td><span className="a3-acoes-linha">{rascunho[m.mes] && <button type="button" className="a3-botao a3-botao--pequeno" disabled={salvando !== null} onClick={() => void salvar(m)}>Salvar</button>}
            {m.editada && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" disabled={salvando !== null} onClick={() => void voltar(m)}>Original</button>}</span></td></tr>)}</tbody>
      </table></div>
      <p><b>Como a situação é decidida.</b> Acima da meta: a projeção de fechamento chega a 100% da meta. Próximo: entre 90% e 100%. Abaixo do ritmo necessário: menos de 90%. O traço na barra mostra o esperado até hoje (a meta × a parte do mês que já passou), para metas que se acumulam no mês.</p>
      <p><b>Projeção.</b> Cadastros e primeiras compras: o ritmo diário do mês até agora, projetado nos dias que faltam (modelo de Poisson), com intervalo de 90%. Faturamento: o que já entrou, mais as renovações no calendário de cada pessoa (cartão inteiro; Pix pela taxa escolhida, de 30% a 100% no intervalo), mais as compras novas esperadas × o valor médio delas. Com menos de 7 dias ou poucos eventos, a projeção vem marcada como "ainda é cedo".</p>
    </div>
  </details>
}

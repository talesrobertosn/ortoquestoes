import { useMemo, useState, type ReactNode } from 'react'
import { taxaPixSugerida } from '../../componentes/admin/financeiro'
import { DIA, MES, NOME_MES, cobrancas as cobrancasDe, mesAMes, somarMesChave, type Cobranca } from '../../componentes/admin/receita'
import { rotuloMeio, rotuloPlano } from '../../componentes/admin/rotulos'
import { rpcInexistente, usarRpc } from '../../componentes/admin/usarRpc'
import { chamarRpc } from '../../servicos/supabase'
import { usarPainel } from '../dados/painel'
import { MARCOS_RESIDENCIA, META_MODERADA, META_OFICIAL, PLANO_2026_11, ROTULO_SITUACAO, esperadoAteHoje, metasVigentes, projetarMes, realizadoPorMes, situacao, tiposDeReceita, type LinhaMetaBanco, type MetaMes, type ProjecaoMes, type RealizadoMes, type VersaoMetas } from '../dados/metas'
import { carteiraHoje, parametrosAoVivo, semanasDoMes } from '../dados/hub'
import { CENARIOS_PLANO, PARAMETROS_PLANO, projetarCrescimento, type ParametrosModelo } from '../dados/projecao'
import { dataSP, diaCurto, moverDia, UM_DIA } from '../dados/negocio'
import { inteiro, reais } from '../ui/formato'
import { Linhas } from '../ui/linhas'
import { Carregando, Estado, Segmento, Faixa as FaixaAviso } from '../ui/kit'
import { avisoRapido } from '../ui/sobreposicoes'
import { Torres, type PontoTorre } from '../ui/torres'
import { usarTaxaPix } from './taxaPix'
import { SemanaTipica } from './semanaTipica'
import './hub.css'

/**
 * Financeiro › Metas, refeito em 11/11/2026 (Tales: "reorganiza as metas, faz a projeção baseada nos dados; o ritmo
 * semana a semana é um dos quadros mais importantes; saber se o site está indo bem, se ficou morto, se precisa de
 * marketing mais agressivo"). De cima para baixo:
 *   1. Diagnóstico do mês numa frase (bom, atenção, abaixo).
 *   2. Os três objetivos do mês: cadastros, primeiras assinaturas e recebido.
 *   3. Placar semana a semana (o mais importante): realizado × meta de cada semana, e quanto falta.
 *   4. O caminho do mês (acumulado × meta × projeção).
 *   5. O que esperar de cada dia da semana.
 *   6. O plano até a prova de 2028 × o que aconteceu (com piso, meta e ousada e os marcos do ano da residência).
 *   7. Simulador do futuro: o modelo de público finito com os números de hoje.
 *   8. Tipos de receita, edição dos meses futuros e o método.
 * O plano oficial (PLANO_2026_11_22) é o modelo de projecao.ts com o ciclo do TEOT (prova em janeiro, R1 em março),
 * rodado com os números reais e congelado em 22/11/2026. O plano de 11/11 e o moderado de 05/11 ficam para comparação.
 */

type Chave = 'faturamento' | 'cadastros' | 'novosPagantes' | 'ativosFim' | 'receitaEquivalente'
const DEF: Record<Chave, { nome: string; curto: string; dinheiro: boolean; fluxo: boolean; explica: string }> = {
  faturamento: { nome: 'Recebido no mês', curto: 'Recebido', dinheiro: true, fluxo: true, explica: 'Pagamentos confirmados no mês (caixa). Reembolsos ficam de fora.' },
  cadastros: { nome: 'Cadastros', curto: 'Cadastros', dinheiro: false, fluxo: true, explica: 'Contas novas do público (sem teste, administrador e contas fora do público).' },
  novosPagantes: { nome: 'Primeiras assinaturas', curto: 'Assinantes novos', dinheiro: false, fluxo: true, explica: 'Primeira compra paga de cada pessoa. Renovação não conta.' },
  ativosFim: { nome: 'Pagantes ativos', curto: 'Pagantes', dinheiro: false, fluxo: false, explica: 'Pessoas com acesso pago no fim do mês (no mês atual, agora). Cortesia não conta.' },
  receitaEquivalente: { nome: 'Receita mensal equivalente', curto: 'Receita equivalente', dinheiro: true, fluxo: false, explica: 'Cada assinatura com acesso, mensalizada (semestral ÷ 6, anual ÷ 12). Não é o caixa do mês.' },
}
const ORDEM: Chave[] = ['faturamento', 'cadastros', 'novosPagantes', 'ativosFim', 'receitaEquivalente']
const fmt = (k: Chave) => (n: number) => DEF[k].dinheiro ? reais(n) : inteiro(Math.round(n))
const fmtCurto = (k: Chave) => (n: number) => DEF[k].dinheiro ? reais(Math.round(n)).replace(/,00$/, '') : inteiro(Math.round(n))
const soMes = (k: string) => NOME_MES(k).replace(/ de \d{4}$/, '')
const mesCurto = (k: string) => NOME_MES(k, true).replace('.', '')
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export default function Metas() {
  const p = usarPainel()
  const metasQ = usarRpc<LinhaMetaBanco[]>(p.conta, 'listar_metas_comerciais_admin')
  const semTabela = !!metasQ.erro && rpcInexistente(metasQ.erro)
  const sugestao = useMemo(() => p.reais ? taxaPixSugerida(p.reais) : null, [p.reais])
  const { taxa } = usarTaxaPix(sugestao?.taxa ?? 0.8)

  const d = useMemo(() => {
    if (!p.reais || !p.usuariosReais) return null
    const todas = cobrancasDe(p.reais, p.cobrancas)
    const cadastros = p.usuariosReais.map(u => new Date(u.criado_em)).filter(x => Number.isFinite(x.getTime()))
    const reemb = new Map(mesAMes(p.reais, 24, new Date(), p.cobrancas).map(x => [x.chave, x.valorReembolsado]))
    const metas = metasVigentes(META_OFICIAL, Array.isArray(metasQ.dados) ? metasQ.dados : null)
    const real = realizadoPorMes(metas.map(x => x.mes), cadastros, todas, reemb)
    const metaAtual = metas.find(x => x.mes === MES(new Date()))
    const proj = projetarMes({ cadastros, cobrancas: todas, assinaturas: p.reais, taxaPix: taxa, meta: metaAtual })
    return { todas, cadastros, metas, real, proj, reemb }
  }, [p.reais, p.usuariosReais, p.cobrancas, metasQ.dados, taxa])

  if (!d && (p.assinaturasQ.erro || p.usuariosQ.erro)) return <div className="ng-painel"><Estado tipo="erro" titulo="Não foi possível carregar os resultados" texto="Tente novamente para comparar os resultados com os objetivos." /><button type="button" className="a3-botao" onClick={() => void p.atualizar()}>Tentar novamente</button></div>
  if (!d || p.cobrancasCarregando) return <Carregando linhas={8} texto="Somando metas e resultados…" />
  const atual = MES(new Date())
  const i = d.metas.findIndex(x => x.mes === atual)
  const meta = d.metas[i], real = d.real[i]
  const ANCORAS: Array<[string, string]> = [['mt-objetivos', 'Objetivos do mês'], ['mt-semanas', 'Semana a semana'], ['mt-caminho', 'Caminho do mês'], ['mt-dias', 'Cada dia da semana'], ['mt-plano', 'Plano até a prova de 2028'], ['mt-futuro', 'Simulador do futuro']]
  return <div className="a3-pilha a3-pilha--larga hb">
    <header className="hb-cabeca">
      <div className="hb-cabeca__sobre"><b>Metas</b><span>{maiuscula(NOME_MES(atual))}</span><span>{META_OFICIAL.nome}</span></div>
      <h1>Onde estamos, quanto falta<br />e para onde vamos.</h1>
      <p>Meta é o alvo do plano. Realizado é o que aconteceu. Projeção é o que o ritmo de hoje indica para o fim do mês. As três coisas aparecem separadas em todos os quadros.</p>
      <nav className="hb-ancoras" aria-label="Partes das Metas">{ANCORAS.map(([id, t]) => <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{t}</a>)}</nav>
    </header>
    {!meta ? <Estado titulo="Fora do período das metas" texto={`O plano vai de ${NOME_MES(META_OFICIAL.meses[0].mes)} a ${NOME_MES(META_OFICIAL.meses[META_OFICIAL.meses.length - 1].mes)}.`} /> : <>
      <Diagnostico meta={meta} proj={d.proj} cadastros={d.cadastros} />
      <section id="mt-objetivos" className="hb-secao" aria-label="Os três objetivos do mês">
        <div className="hb-objetivos">{(['cadastros', 'novosPagantes', 'faturamento'] as Chave[]).map(k => <Objetivo key={k} k={k} meta={meta[k]} real={real[k]} proj={d.proj} />)}</div>
        <div className="hb-objetivos">{(['ativosFim', 'receitaEquivalente'] as Chave[]).map(k => <Objetivo key={k} k={k} meta={meta[k]} real={real[k]} proj={d.proj} />)}</div>
      </section>
      <PlacarSemanal meta={meta} real={real} proj={d.proj} todas={d.todas} cadastros={d.cadastros} />
      <Caminho meta={meta} real={real} proj={d.proj} todas={d.todas} cadastros={d.cadastros} />
    </>}
    <section id="mt-dias" className="hb-secao" aria-labelledby="mt-dias-t">
      <div className="hb-titulo"><div><span className="hb-kicker">Ritmo</span><h2 id="mt-dias-t">O que esperar de cada dia da semana</h2><p>A média de cada dia, desde o começo: quantos se cadastram, quantos assinam, quanto entra e quantos estudam. Serve para saber se hoje está normal, fraco ou forte.</p></div></div>
      <SemanaTipica />
    </section>
    <Plano metas={d.metas} real={d.real} proj={d.proj} />
    <Futuro taxa={taxa} todas={d.todas} />
    <details className="ng-detalhes"><summary>Entenda os tipos de receita <small>Recebido, competência e mensalização</small></summary><TiposReceita todas={d.todas} reemb={d.reemb} /></details>
    <details className="ng-detalhes"><summary>O plano de 11/11 (sem o ciclo do TEOT) <small>guardado para comparação</small></summary><PlanoAntigo antiga={PLANO_2026_11} nota={<>O plano de 11/11/2026 ({PLANO_2026_11.id}) supunha a base crescendo todo mês, sem a prova no meio: 157 pagantes em janeiro e 351 em outubro de 2027. Ele esquecia que os R3 saem depois do TEOT e que os R1 de março demoram a assinar. Fica guardado aqui, sem mudar.</>} /></details>
    <details className="ng-detalhes"><summary>O cenário moderado de 05/11 <small>guardado para comparação</small></summary><PlanoAntigo antiga={META_MODERADA} nota={<>O cenário moderado de 05/11/2026 ({META_MODERADA.id}) foi feito antes dos números de novembro e ficou baixo (22 assinantes novos no mês, contra 27 só nos 11 primeiros dias). Ele continua guardado aqui, sem mudar.</>} /></details>
    <Editor metas={d.metas} semTabela={semTabela} aoSalvar={() => void metasQ.recarregar()} />
    <p className="a3-mudo a3-pequeno">Versão fixa: <b>{META_OFICIAL.nome}</b> ({META_OFICIAL.id}), registrada em {META_OFICIAL.registradaEm.split('-').reverse().join('/')}. Metas são planejamento, não garantia. Recebido previsto no período do plano ({META_OFICIAL.meses.length} meses): {reais(META_OFICIAL.meses.reduce((s, x) => s + x.faturamento, 0))}.</p>
  </div>
}

/* ───────────── 1. Diagnóstico ───────────── */

function Diagnostico({ meta, proj, cadastros }: { meta: MetaMes; proj: ProjecaoMes; cadastros: Date[] }) {
  const itens = (['cadastros', 'novosPagantes', 'faturamento'] as Chave[]).map(k => ({ k, r: meta[k] ? proj[k].centro / meta[k] : 1 }))
  const pior = Math.min(...itens.map(x => x.r))
  const agora = Date.now()
  const ult7 = cadastros.filter(d => d.getTime() > agora - 7 * UM_DIA).length, ant7 = cadastros.filter(d => d.getTime() <= agora - 7 * UM_DIA && d.getTime() > agora - 14 * UM_DIA).length
  const ontem = DIA(new Date(agora - UM_DIA)), anteontem = DIA(new Date(agora - 2 * UM_DIA))
  const parado = !cadastros.some(d => DIA(d) === ontem || DIA(d) === anteontem)
  const tom = parado || pior < 0.8 ? 'ruim' : pior < 1 ? 'atencao' : 'bom'
  const titulo = tom === 'bom' ? `No ritmo de hoje, ${soMes(meta.mes)} bate as três metas.` : tom === 'atencao' ? `${maiuscula(soMes(meta.mes))} está perto das metas, mas ainda não chega lá.` : parado ? 'Nenhum cadastro nos últimos dois dias: vale reforçar a divulgação.' : `${maiuscula(soMes(meta.mes))} está abaixo do ritmo: hora de apertar o marketing.`
  return <section className={`hb-diag hb-diag--${tom}`} aria-live="polite">
    <span className="hb-diag__selo" aria-hidden="true">{tom === 'bom' ? '✓' : tom === 'atencao' ? '!' : '↓'}</span>
    <div><h2>{titulo}</h2>
      <p>Projeção sobre a meta: {itens.map((x, i) => <span key={x.k}>{i ? ' · ' : ''}{DEF[x.k].curto.toLowerCase()} <b>{Math.round(x.r * 100)}%</b></span>)}. Cadastros nos últimos 7 dias: <b>{ult7}</b> ({ult7 > ant7 ? `${ult7 - ant7} a mais` : ult7 < ant7 ? `${ant7 - ult7} a menos` : 'o mesmo'} que nos 7 anteriores).{proj.amostraPequena ? ' O mês ainda está no começo: a projeção pode mudar bastante.' : ''}</p></div>
  </section>
}

/* ───────────── 2. Objetivo ───────────── */

function Objetivo({ k, meta, real, proj }: { k: Chave; meta: number; real: number; proj: ProjecaoMes }) {
  const f = fmt(k), fc = fmtCurto(k), def = DEF[k]
  const pr = proj[k]
  const s = situacao(pr.centro, meta)
  const escala = Math.max(meta, pr.centro, real, 1) * 1.04
  const falta = Math.max(0, meta - real), dias = Math.max(1, proj.diasRestantes)
  const ritmo = real / Math.max(1, proj.diasPassados)
  const esperado = def.fluxo ? esperadoAteHoje(meta, proj.diasPassados, proj.diasNoMes) : null
  return <article className="hb-obj">
    <div className="hb-obj__topo"><h3>{def.nome}</h3><span className={`hb-selo hb-selo--${s}`}>{ROTULO_SITUACAO[s].replace('Projeção ', '')}</span></div>
    <div className="hb-obj__num"><b>{fc(real)}</b><span>de {fc(meta)} · {meta ? Math.round(real / meta * 100) : 0}%</span></div>
    <div className="hb-obj__barra" role="img" aria-label={`${def.nome}: ${f(real)} de ${f(meta)}; projeção ${f(pr.centro)}`}>
      <i className="proj" style={{ width: `${pr.centro / escala * 100}%` }} />
      <i className={DEF[k].dinheiro ? 'hb-c-ouro' : 'hb-c-verde'} style={{ width: `${real / escala * 100}%` }} />
      <em style={{ left: `${meta / escala * 100}%` }} data-rotulo="meta" />
    </div>
    <dl>
      {def.fluxo ? <>
        <div><dt>Falta</dt><dd>{falta ? fc(falta) : 'meta batida'}</dd></div>
        <div><dt>Precisa por dia</dt><dd>{falta ? (def.dinheiro ? fc(falta / dias) : (falta / dias).toLocaleString('pt-BR', { maximumFractionDigits: 1 })) : '—'} <small>hoje: {def.dinheiro ? fc(ritmo) : ritmo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/dia</small></dd></div>
        <div><dt>Esperado até hoje</dt><dd>{esperado !== null ? fc(esperado) : '—'}</dd></div>
      </> : <div><dt>Hoje</dt><dd>{fc(real)}</dd></div>}
      <div><dt>Projeção do fim do mês</dt><dd>{fc(pr.centro)} <small>{fc(pr.baixo)} a {fc(pr.alto)}</small></dd></div>
    </dl>
    <p className="hb-nota">{def.explica}</p>
  </article>
}

/* ───────────── 3. Placar semana a semana ───────────── */

function PlacarSemanal({ meta, real, proj, todas, cadastros }: { meta: MetaMes; real: RealizadoMes; proj: ProjecaoMes; todas: Cobranca[]; cadastros: Date[] }) {
  const semanas = semanasDoMes(meta.mes)
  const diasNoMes = proj.diasNoMes
  const linhas: Array<{ k: 'cadastros' | 'novosPagantes' | 'faturamento'; valores: number[] }> = [
    { k: 'cadastros', valores: semanas.map(s => cadastros.filter(d => d.getTime() >= s.inicio && d.getTime() < s.fim).length) },
    { k: 'novosPagantes', valores: semanas.map(s => todas.filter(c => c.tipo === 'nova' && c.em.getTime() >= s.inicio && c.em.getTime() < s.fim).length) },
    { k: 'faturamento', valores: semanas.map(s => todas.filter(c => c.em.getTime() >= s.inicio && c.em.getTime() < s.fim).reduce((t, c) => t + c.valor, 0)) },
  ]
  const atual = semanas.findIndex(s => s.estado === 'atual')
  return <section id="mt-semanas" className="hb-secao" aria-labelledby="mt-semanas-t">
    <div className="hb-titulo"><div><span className="hb-kicker">O quadro mais importante</span><h2 id="mt-semanas-t">Semana a semana</h2>
      <p>Cada semana do mês (contada do dia 1º) com o que aconteceu e a meta daquela semana. Verde: bateu. Dourado: chegou a 80%. Vermelho: abaixo disso. Nas semanas que ainda vêm, o número é <b>quanto precisa</b> para fechar a meta do mês, já descontado o que falta.</p></div></div>
    <div className="hb-painel hb-semanas" style={{ '--n': semanas.length } as React.CSSProperties} role="table" aria-label="Placar semanal">
      <div className="hb-semanas__linha hb-semanas__cab" role="row"><span role="columnheader" />{semanas.map((s, i) => <span key={i} role="columnheader" className={s.estado === 'atual' ? 'atual' : undefined}>Dias {s.de}–{s.ate}<small>{s.estado === 'atual' ? 'esta semana' : s.estado === 'passada' ? 'fechada' : 'ainda vem'}</small></span>)}</div>
      {linhas.map(l => {
        const alvo = meta[l.k], fc = fmtCurto(l.k), feito = real[l.k]
        const falta = Math.max(0, alvo - feito)
        const diasFuturos = semanas.filter(s => s.estado === 'futura').reduce((t, s) => t + (s.ate - s.de + 1), 0)
        const restoAtual = atual >= 0 ? Math.max(0, (semanas[atual].fim - Date.now()) / UM_DIA) : 0
        const diasRestantes = diasFuturos + restoAtual
        return <div key={l.k} className="hb-semanas__linha" role="row">
          <span role="rowheader" className="hb-semanas__nome">{DEF[l.k].nome}<small>meta do mês {fc(alvo)} · feito {fc(feito)}</small></span>
          {semanas.map((s, i) => {
            const metaSemana = alvo * (s.ate - s.de + 1) / diasNoMes
            const v = l.valores[i]
            if (s.estado === 'futura') {
              const precisa = diasRestantes ? falta * (s.ate - s.de + 1) / diasRestantes : 0
              return <span key={i} role="cell" className="hb-sem hb-sem--futura"><b>{falta ? fc(precisa) : '—'}</b><small>{falta ? 'precisa' : 'meta batida'}</small><small>plano: {fc(metaSemana)}</small></span>
            }
            // Na semana em andamento, a régua é a parte da semana que já passou (meta até agora).
            const fracao = s.estado === 'atual' ? Math.min(1, Math.max(0.05, (Date.now() - s.inicio) / (s.fim - s.inicio))) : 1
            const alvoAgora = metaSemana * fracao
            const r = alvoAgora ? v / alvoAgora : 1
            const tom = r >= 1 ? 'bom' : r >= 0.8 ? 'perto' : 'baixo'
            const falSem = Math.max(0, metaSemana - v)
            return <span key={i} role="cell" className={`hb-sem hb-sem--${tom}${s.estado === 'atual' ? ' hb-sem--atual' : ''}`}>
              <b>{fc(v)}</b><small>{s.estado === 'atual' ? `até agora: ${fc(alvoAgora)} · ${Math.round(r * 100)}%` : `de ${fc(metaSemana)} · ${Math.round(r * 100)}%`}</small>
              <span className="hb-sem__barra" aria-hidden="true"><i style={{ width: `${Math.min(100, r * 100)}%` }} /></span>
              {s.estado === 'atual' && <small className="hb-sem__falta">{falSem ? `faltam ${fc(falSem)} de ${fc(metaSemana)}` : 'semana batida'}</small>}
            </span>
          })}
        </div>
      })}
    </div>
  </section>
}

/* ───────────── 4. Caminho do mês ───────────── */

function Caminho({ meta, real, proj, todas, cadastros }: { meta: MetaMes; real: RealizadoMes; proj: ProjecaoMes; todas: Cobranca[]; cadastros: Date[] }) {
  const [k, escolher] = useState<'cadastros' | 'novosPagantes' | 'faturamento'>('faturamento')
  const hoje = Number(DIA(new Date()).slice(8))
  const f = fmtCurto(k)
  const pontos = Array.from({ length: proj.diasNoMes }, (_, i) => {
    const dia = moverDia(`${meta.mes}-01`, i), limite = Math.min(Date.now(), dataSP(moverDia(dia, 1)).getTime()), ini = dataSP(`${meta.mes}-01`).getTime()
    const acumulado = k === 'cadastros' ? cadastros.filter(d => d.getTime() >= ini && d.getTime() < limite).length : todas.filter(c => MES(c.em) === meta.mes && c.em.getTime() < limite && (k === 'faturamento' || c.tipo === 'nova')).reduce((n, c) => n + (k === 'faturamento' ? c.valor : 1), 0)
    const progresso = (i + 1 - hoje) / Math.max(1, proj.diasNoMes - hoje)
    return { rotulo: diaCurto(dia), valores: [i + 1 <= hoje ? acumulado : null, meta[k] * (i + 1) / proj.diasNoMes, i + 1 >= hoje ? real[k] + (proj[k].centro - real[k]) * progresso : null] }
  })
  return <section id="mt-caminho" className="hb-secao" aria-labelledby="mt-caminho-t">
    <div className="hb-titulo"><div><span className="hb-kicker">Acompanhamento</span><h2 id="mt-caminho-t">O caminho do mês</h2><p>Quanto já se acumulou no mês, dia a dia (linha cheia), contra o caminho reto até a meta (tracejado) e a projeção daqui até o fim. Linha cheia acima do tracejado é adiantado; abaixo, atrasado.</p></div>
      <Segmento rotulo="Objetivo no gráfico" valor={k} aoMudar={escolher} opcoes={[['faturamento', 'Recebido'], ['cadastros', 'Cadastros'], ['novosPagantes', 'Assinantes novos']]} /></div>
    <div className="hb-painel">
      <Linhas titulo={`${DEF[k].nome}: realizado, caminho até a meta e projeção`} formato={f} pontos={pontos} series={[{ nome: 'Realizado (acumulado)' }, { nome: 'Caminho até a meta', tracejada: true }, { nome: 'Projeção', tracejada: true }]} altura={260} />
      <p className="hb-nota">Meta: <b>{f(meta[k])}</b>. No ritmo de hoje, o mês fecha perto de <b>{f(proj[k].centro)}</b>{proj.amostraPequena ? ' (ainda é cedo para confiar)' : `, entre ${f(proj[k].baixo)} e ${f(proj[k].alto)}`}. A meta não entra no cálculo da projeção.</p>
    </div>
  </section>
}

/* ───────────── 6. Plano de 12 meses ───────────── */

function Plano({ metas, real, proj }: { metas: Array<MetaMes & { editada: boolean; original: MetaMes }>; real: RealizadoMes[]; proj: ProjecaoMes }) {
  const [k, definirK] = useState<Chave>('faturamento')
  const atual = MES(new Date())
  const f = fmt(k)
  const pontos: PontoTorre[] = metas.map((m, i) => {
    const futuro = m.mes > atual, emCurso = m.mes === atual
    const v = futuro ? 0 : real[i][k]
    return { curto: mesCurto(m.mes) + (m.mes.endsWith('-01') || i === 0 ? ` ${m.mes.slice(2, 4)}` : ''), longo: maiuscula(NOME_MES(m.mes)) + (emCurso ? ' (em andamento)' : futuro ? ' (ainda vem)' : ''), partes: [v], meta: m[k], previsto: emCurso ? Math.max(0, proj[k].centro - v) : undefined, parcial: emCurso }
  })
  const fechados = metas.filter(m => m.mes < atual)
  const acima = fechados.filter(m => real[metas.indexOf(m)][k] >= m[k]).length
  return <section id="mt-plano" className="hb-secao" aria-labelledby="mt-plano-t">
    <div className="hb-titulo"><div><span className="hb-kicker">Plano</span><h2 id="mt-plano-t">O plano até a prova de 2028 e o que aconteceu</h2>
      <p>O traço de cada mês é a meta do plano; a coluna é o que aconteceu (no mês atual, a parte hachurada é a projeção). O plano segue o ano da residência: a base sobe até a reta final do TEOT, cai em janeiro e fevereiro quando os R3 saem depois da prova e volta a subir com os R1 de março. {fechados.length ? `Em ${acima} de ${fechados.length} meses fechados, o resultado bateu a meta.` : 'Nenhum mês do plano fechou ainda.'}</p></div>
      <Segmento rotulo="Indicador" valor={k} aoMudar={definirK} opcoes={ORDEM.map(x => [x, DEF[x].curto] as [Chave, string])} /></div>
    <div className="hb-painel">
      <Torres titulo={`${DEF[k].nome}: plano × realizado`} formato={f} altura={250} pontos={pontos} series={[{ nome: 'Realizado', cor: DEF[k].dinheiro ? 'ouro' : 'verde' }]} rotuloPrevisto="Projeção do mês" rotuloMeta="Meta do plano" />
      <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta hb-tabela">
        <thead><tr><th scope="col">Mês</th>{(['cadastros', 'novosPagantes', 'ativosFim', 'faturamento'] as Chave[]).map(x => <th key={x} scope="col" className="num">{DEF[x].curto}<small>meta · real</small></th>)}</tr></thead>
        <tbody>{metas.map((m, i) => { const fut = m.mes > atual; return <tr key={m.mes} className={m.mes === atual ? 'hb-linha-atual' : undefined}><th scope="row">{maiuscula(NOME_MES(m.mes))}{m.editada && <small>meta editada</small>}</th>
          {(['cadastros', 'novosPagantes', 'ativosFim', 'faturamento'] as Chave[]).map(x => { const r = real[i][x], pct = m[x] ? Math.round(r / m[x] * 100) : 0; return <td key={x} className="num">{fmtCurto(x)(m[x])}<small>{fut ? '—' : <>{fmtCurto(x)(r)} · <span className={pct >= 100 ? 'hb-bom-t' : undefined}>{pct}%</span></>}</small></td> })}
        </tr> })}</tbody>
      </table></div>
      <Marcos />
      <Cenarios />
    </div>
  </section>
}

/** Os marcos do ano da residência, na ordem do calendário (Tales, 22/11/2026). */
function Marcos() {
  const atual = MES(new Date())
  return <div><div className="hb-titulo"><h3>O ano da residência no plano</h3></div>
    <ul className="mt-lista">{MARCOS_RESIDENCIA.map(x => <li key={x.mes}><span>{x.titulo}<small>{x.texto}</small></span><b>{maiuscula(mesCurto(x.mes))}/{x.mes.slice(2, 4)}{x.mes < atual ? ' ✓' : ''}</b></li>)}</ul></div>
}

/**
 * Piso, meta e ousada (22/11/2026): o mesmo modelo do plano com marketing, conversão e renovação do Pix
 * piores ou melhores. Mostra o mês mais fraco (janeiro, depois da prova), o fim de 2027 e o recebido em 2027.
 */
function Cenarios() {
  const linhas = useMemo(() => CENARIOS_PLANO.map(c => {
    const r = projetarCrescimento({ ...PARAMETROS_PLANO, ...c.ajuste })
    const em = (mes: string) => r.find(x => x.mes === mes)
    return { ...c, jan: em('2027-01'), dez: em('2027-12'), ano: r.filter(x => x.mes.startsWith('2027')).reduce((s, x) => s + x.faturamento, 0) }
  }), [])
  const din = (v: number) => reais(Math.round(v)).replace(/,00$/, '')
  return <div><div className="hb-titulo"><div><h3>Piso, meta e ousada</h3><p>O piso diz quando acender o alerta; a ousada, até onde dá para ir com marketing forte. Hoje o site tem cerca de 2,6% dos residentes pagando; a meta leva a uns 6% no fim de 2027, perto do que cursos consolidados têm (200 a 500 alunos). Os cadastros caem conforme o público se esgota: em fevereiro sai a turma de R3 que terminou e só a turma nova de R1, em março, renova o público.</p></div></div>
    <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta hb-tabela">
      <thead><tr><th scope="col">Cenário</th><th scope="col" className="num">Pagantes<small>jan 27 (o vale)</small></th><th scope="col" className="num">Pagantes<small>dez 27</small></th><th scope="col" className="num">Receita equivalente<small>dez 27</small></th><th scope="col" className="num">Recebido<small>em 2027</small></th></tr></thead>
      <tbody>{linhas.map(c => <tr key={c.id} className={c.id === 'meta' ? 'hb-linha-atual' : undefined}><th scope="row">{c.nome}<small>{c.explica}</small></th>
        <td className="num">{inteiro(Math.round(c.jan?.ativosFim ?? 0))}</td><td className="num">{inteiro(Math.round(c.dez?.ativosFim ?? 0))}</td><td className="num">{din(c.dez?.receitaEquivalente ?? 0)}/mês</td><td className="num">{din(c.ano)}</td></tr>)}</tbody>
    </table></div></div>
}

function PlanoAntigo({ antiga, nota }: { antiga: VersaoMetas; nota: ReactNode }) {
  const nova = new Map(META_OFICIAL.meses.map(x => [x.mes, x]))
  return <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta hb-tabela">
    <thead><tr><th scope="col">Mês</th><th scope="col" className="num">Cadastros<small>antigo · novo</small></th><th scope="col" className="num">Assinantes novos<small>antigo · novo</small></th><th scope="col" className="num">Pagantes<small>antigo · novo</small></th><th scope="col" className="num">Recebido<small>antigo · novo</small></th></tr></thead>
    <tbody>{antiga.meses.map(m => { const n = nova.get(m.mes); return <tr key={m.mes}><th scope="row">{maiuscula(NOME_MES(m.mes))}</th>
      <td className="num">{m.cadastros} · <b>{n?.cadastros ?? '—'}</b></td><td className="num">{m.novosPagantes} · <b>{n?.novosPagantes ?? '—'}</b></td><td className="num">{m.ativosFim} · <b>{n?.ativosFim ?? '—'}</b></td><td className="num">{reais(m.faturamento).replace(/,00$/, '')} · <b>{n ? reais(n.faturamento).replace(/,00$/, '') : '—'}</b></td></tr> })}</tbody>
  </table><p className="hb-nota">{nota}</p></div>
}

/* ───────────── 7. Simulador do futuro ───────────── */

function Futuro({ taxa, todas }: { taxa: number; todas: Cobranca[] }) {
  const p = usarPainel()
  const hoje = useMemo(() => p.usuariosReais && p.reais ? parametrosAoVivo({ usuarios: p.usuariosReais, cobrancas: todas, carteira: carteiraHoje(p.reais), taxaPix: taxa }) : null, [p.usuariosReais, p.reais, todas, taxa])
  const [mudancas, definir] = useState<Partial<ParametrosModelo>>({})
  if (!hoje) return null
  const par: ParametrosModelo = { ...hoje, ...mudancas }
  const res = projetarCrescimento(par)
  const ult = res[res.length - 1]
  const total = res.reduce((s, x) => s + x.faturamento, 0)
  const totalPlano = res.reduce((s, x) => s + (META_OFICIAL.meses.find(m => m.mes === x.mes)?.faturamento ?? 0), 0)
  const metaPorMes = new Map(META_OFICIAL.meses.map(m => [m.mes, m]))
  const mudar = (k: keyof ParametrosModelo, v: number) => definir(m => ({ ...m, [k]: v }))
  const mix = (mensal: number) => { const resto = 1 - mensal; definir(m => ({ ...m, mixMensal: mensal, mixSemestral: resto * 0.25, mixAnual: resto * 0.75 })) }
  const deslizador = (rotulo: string, ajuda: string, k: keyof ParametrosModelo, min: number, max: number, passo: number, exibir: (v: number) => string) => {
    const v = par[k] as number
    return <label key={k}><span>{rotulo}<b>{exibir(v)}</b></span><input type="range" min={min} max={max} step={passo} value={v} onChange={e => mudar(k, Number(e.target.value))} aria-valuetext={exibir(v)} /><small>{ajuda}</small></label>
  }
  const pct = (v: number) => `${Math.round(v * 100)}%`
  const pontosFat: PontoTorre[] = res.map((x, i) => ({ curto: mesCurto(x.mes) + (x.mes.endsWith('-01') || i === 0 ? ` ${x.mes.slice(2, 4)}` : ''), longo: maiuscula(NOME_MES(x.mes)), partes: [x.partes.novas, x.partes.renovacoesMensais, x.partes.renovacoesLongas], meta: metaPorMes.get(x.mes)?.faturamento, nota: `${inteiro(Math.round(x.cadastros))} cadastros · ${inteiro(Math.round(x.novosPagantes))} assinantes novos · ${inteiro(Math.round(x.ativosFim))} pagantes no fim` }))
  const pontosBase: PontoTorre[] = res.map((x, i) => ({ curto: mesCurto(x.mes) + (x.mes.endsWith('-01') || i === 0 ? ` ${x.mes.slice(2, 4)}` : ''), longo: maiuscula(NOME_MES(x.mes)), partes: [x.mensaisR3, x.mensaisAtivos - x.mensaisR3, x.longosAtivos], meta: metaPorMes.get(x.mes)?.ativosFim }))
  const pontosCad: PontoTorre[] = res.map((x, i) => ({ curto: mesCurto(x.mes) + (x.mes.endsWith('-01') || i === 0 ? ` ${x.mes.slice(2, 4)}` : ''), longo: maiuscula(NOME_MES(x.mes)), partes: [x.novosPagantes, Math.max(0, x.cadastros - x.novosPagantes)], meta: metaPorMes.get(x.mes)?.cadastros }))
  return <section id="mt-futuro" className="hb-secao" aria-labelledby="mt-futuro-t">
    <div className="hb-titulo"><div><span className="hb-kicker">Simulador</span><h2 id="mt-futuro-t">E se…? O futuro com os números de hoje</h2>
      <p>O mesmo modelo que fez o plano, começando com os números de agora e com o ano da residência (a prova em janeiro, os R1 em março). Mexa nos controles para ver o que muda: mais marketing, mais gente escolhendo o mensal, mais Pix renovando, mais R3 ficando depois da prova. Os traços são as metas do plano oficial.</p></div></div>
    <div className="hb-painel hb-plano">
      <div className="hb-param">
        {deslizador('Público alcançável', 'Residentes de ortopedia e afins que o site consegue alcançar. Quanto mais gente já se cadastrou, menos sobra.', 'mercado', 800, 4000, 100, v => inteiro(v))}
        {deslizador('Cadastros neste mês', 'O ritmo de hoje, projetado até o fim do mês. Os meses seguintes caem conforme o público se esgota.', 'cadastrosPrimeiroMes', 20, 400, 5, v => inteiro(v))}
        {deslizador('Força do marketing', '100% é o ritmo de hoje; 150% traz metade a mais de cadastros (e esgota o público mais rápido).', 'marketing', 0.5, 2.5, 0.05, pct)}
        {deslizador('Cadastros que assinam', 'Das pessoas que se cadastram, quantas assinam (medido nas turmas de cadastro de 14 a 120 dias).', 'conversao', 0.1, 0.7, 0.01, pct)}
        <label><span>Escolhem o mensal<b>{pct(par.mixMensal)}</b></span><input type="range" min={0.3} max={1} step={0.05} value={par.mixMensal} onChange={e => mix(Number(e.target.value))} aria-valuetext={pct(par.mixMensal)} /><small>O resto se divide entre anual (3/4) e semestral (1/4). Hoje o foco é o mensal.</small></label>
        {deslizador('Pix mensal que renova', 'Chance de um mensal no Pix pagar de novo quando o mês acaba (o cartão renova sozinho, com 95% continuando).', 'pixRenova', 0.3, 1, 0.05, pct)}
        {deslizador('R3 entre os mensais', 'Dos mensais de hoje, quantos são R3 e fazem o TEOT em janeiro. Em novembro de 2026 eram cerca de metade.', 'fracaoR3Inicio', 0, 1, 0.05, pct)}
        {deslizador('R3 que saem depois da prova', 'Dos mensais R3, quantos não renovam no mês da prova (e, dos que sobram, no mês seguinte). Quem fica estuda para R4, fellowship ou título.', 'saidaPosTeot', 0, 1, 0.05, pct)}
        {deslizador('Turma que sai depois da prova', 'Os R3 que terminam a residência e deixam o público em fevereiro (quem já tinha conta sai na mesma proporção). Com zero, o público só cresceria.', 'turmaSaiDepoisDaProva', 0, 1500, 50, v => inteiro(v))}
        {deslizador('Turma nova de R1 em março', 'Gente nova que passa a ser alcançável quando a residência começa.', 'turmaNovaMarco', 0, 1500, 50, v => inteiro(v))}
        <div className="hb-param__acoes"><button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => definir({})}>Números de hoje</button><button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definir({ ...PARAMETROS_PLANO, inicio: hoje.inicio, jaCadastrados: hoje.jaCadastrados, gratisNoInicio: hoje.gratisNoInicio, mensaisNoInicio: hoje.mensaisNoInicio, longosNoInicio: hoje.longosNoInicio })}>Premissas do plano</button></div>
      </div>
      <div className="hb-plano__res">
        <dl className="hb-plano__kpis">
          <div><dt>Pagantes em {mesCurto(ult.mes)}/{ult.mes.slice(2, 4)}</dt><dd>{inteiro(Math.round(ult.ativosFim))}</dd><small>plano: {inteiro(metaPorMes.get(ult.mes)?.ativosFim ?? 0)}</small></div>
          <div><dt>Recebido em {mesCurto(ult.mes)}/{ult.mes.slice(2, 4)}</dt><dd>{reais(Math.round(ult.faturamento)).replace(/,00$/, '')}</dd><small>equivalente: {reais(Math.round(ult.receitaEquivalente)).replace(/,00$/, '')}/mês</small></div>
          <div><dt>Em {res.length} meses</dt><dd>{reais(Math.round(total)).replace(/,00$/, '')}</dd><small>plano nos mesmos meses: {reais(Math.round(totalPlano)).replace(/,00$/, '')}</small></div>
          <div><dt>Público já alcançado</dt><dd>{pct(ult.alcance)}</dd><small>{inteiro(Math.round(res.reduce((s, x) => s + x.cadastros, 0)))} cadastros no período</small></div>
        </dl>
        <div className="hb-alcance"><span>Quanto do público alcançável terá se cadastrado no fim do período: <b>{pct(ult.alcance)}</b></span><div className="hb-alcance__barra" aria-hidden="true"><i className="hb-c-verde" style={{ width: `${ult.alcance * 100}%` }} /></div></div>
        <div className="hb-titulo"><h3>Recebido por mês</h3></div>
        <Torres titulo="Recebido por mês no simulador" formato={v => reais(Math.round(v)).replace(/,00$/, "")} altura={220} pontos={pontosFat} series={[{ nome: 'Primeiras compras', cor: 'verde' }, { nome: 'Mensais renovando', cor: 'ouro' }, { nome: 'Semestrais e anuais renovando', cor: 'azul' }]} rotuloMeta="Meta do plano" />
        <div className="hb-titulo"><h3>Pagantes no fim de cada mês</h3></div>
        <Torres titulo="Pagantes no simulador" altura={190} formato={v => inteiro(Math.round(v))} pontos={pontosBase} series={[{ nome: 'Mensais R3 (saem depois do TEOT)', cor: 'ouro' }, { nome: 'Outros mensais', cor: 'verde' }, { nome: 'Semestrais e anuais', cor: 'azul' }]} rotuloMeta="Meta do plano" />
        <div className="hb-titulo"><h3>Cadastros e assinantes novos por mês</h3></div>
        <Torres titulo="Cadastros no simulador" altura={190} formato={v => inteiro(Math.round(v))} pontos={pontosCad} series={[{ nome: 'Assinam', cor: 'ouro' }, { nome: 'Ficam no grátis', cor: 'cinza-claro' }]} rotuloMeta="Meta de cadastros" />
      </div>
    </div>
  </section>
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
      <p>Os objetivos atuais vêm do plano de 22/11/2026, feito com os números reais e com o ciclo do TEOT (novembro continua com a meta do plano de 11/11, porque o mês já estava em andamento). Só meses futuros podem ser editados, para não mover o alvo depois de conhecer o resultado. A versão original <b>{META_OFICIAL.id}</b> nunca muda; a editada fica numa camada à parte e a comparação mostra as duas. Edições feitas antes de {META_OFICIAL.registradaEm.split('-').reverse().join('/')} ajustavam o plano anterior e deixaram de valer: edite de novo, se quiser.</p>
      <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta mt-tabela mt-editor">
        <thead><tr><th scope="col">Mês</th>{ORDEM.map(k => <th key={k} scope="col" className="num">{DEF[k].curto}</th>)}<th scope="col" /></tr></thead>
        <tbody>{futuras.map(m => <tr key={m.mes}><th scope="row">{NOME_MES(m.mes)}{m.editada && <small> editada</small>}</th>
          {ORDEM.map(k => <td key={k} className="num"><input className="a3-entrada num" inputMode="decimal" aria-label={`${DEF[k].nome} de ${NOME_MES(m.mes)}`} disabled={semTabela} value={String(valor(m, k))} onChange={e => mudar(m, k, e.target.value)} /><span className="a3-sub">original {fmt(k)(m.original[k])}</span></td>)}
          <td><span className="a3-acoes-linha">{rascunho[m.mes] && <button type="button" className="a3-botao a3-botao--pequeno" disabled={salvando !== null} onClick={() => void salvar(m)}>Salvar</button>}
            {m.editada && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" disabled={salvando !== null} onClick={() => void voltar(m)}>Original</button>}</span></td></tr>)}</tbody>
      </table></div>
      <p><b>Como a situação é decidida.</b> Acima da meta: a projeção de fechamento chega a 100% da meta. Próximo: entre 90% e 100%. Abaixo do ritmo necessário: menos de 90%. O traço na barra mostra o esperado até hoje (a meta × a parte do mês que já passou), para metas que se acumulam no mês.</p>
      <p><b>Projeção.</b> Cadastros e primeiras compras: o ritmo diário do mês até agora, projetado nos dias que faltam (modelo de Poisson), com uma faixa aproximada para as contagens. Faturamento: o que já entrou, mais as renovações no calendário de cada pessoa (cartão inteiro; Pix pela taxa escolhida, do cenário cauteloso ao cenário favorável), mais as compras novas esperadas × o valor médio delas. Com menos de 7 dias ou poucos eventos, a projeção vem marcada como "ainda é cedo".</p>
    </div>
  </details>
}

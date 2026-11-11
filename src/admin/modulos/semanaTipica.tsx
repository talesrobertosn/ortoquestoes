import { useMemo, useState } from 'react'
import { DIA, cobrancas as cobrancasDe } from '../../componentes/admin/receita'
import { usarPainel } from '../dados/painel'
import { DIAS_SEMANA, contarPorDia, gradeSemanaHora, mediaPorDiaDaSemana } from '../dados/hub'
import { inteiro, reais } from '../ui/formato'
import { Carregando, Segmento } from '../ui/kit'
import { usarJornada } from './PulsoCrescimento'
import './hub.css'

/**
 * A semana típica (Tales, 11/11/2026: "na segunda, qual é a média de pessoas que estudam? No sábado, quanto as
 * pessoas se cadastram?"). Média de cada dia da semana, só com dias completos, do primeiro dia com movimento até
 * ontem: cadastros, primeiras assinaturas, recebido, pessoas que estudaram e questões respondidas. Em cima, o que
 * esperar de hoje; com `calor`, a grade dia × hora de cadastros e assinaturas.
 */
const um = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: v > 0 && v < 10 ? 1 : 0 })
const nomeDia = (i: number) => DIAS_SEMANA[i].toLowerCase()
const artigo = (i: number) => i >= 5 ? 'o' : 'a'

export function SemanaTipica({ calor = false }: { calor?: boolean }) {
  const p = usarPainel()
  const jornada = usarJornada()
  const [grade, definirGrade] = useState<'cad' | 'ass'>('cad')
  const d = useMemo(() => {
    if (!p.usuariosReais || !p.reais) return null
    const agora = new Date(), hoje = DIA(agora)
    const cad = p.usuariosReais.map(u => new Date(u.criado_em)).filter(x => Number.isFinite(x.getTime()))
    const todas = cobrancasDe(p.reais, p.cobrancas)
    const publico = new Set(p.usuariosReais.map(u => u.id_usuario))
    const novas = todas.filter(c => c.tipo === 'nova' && publico.has(c.id_usuario)).map(c => c.em)
    const porDiaValor = new Map<string, number>()
    for (const c of todas) { const k = DIA(c.em); porDiaValor.set(k, (porDiaValor.get(k) ?? 0) + c.valor) }
    const diasCad = contarPorDia(cad, agora)
    // Assinaturas e recebido contam nos mesmos dias dos cadastros (do primeiro cadastro até ontem).
    const contNovas = new Map(contarPorDia(novas, agora).map(x => [x.dia, x.n]))
    const diasNovas = diasCad.map(x => ({ dia: x.dia, n: contNovas.get(x.dia) ?? 0 }))
    const serie = (jornada.dados?.serie ?? []).map(x => ({ dia: String(x.dia).slice(0, 10), ativos: Number(x.ativos), respostas: Number(x.respostas) }))
    const primeiroEstudo = serie.find(x => x.ativos > 0)?.dia ?? hoje
    const estudo = serie.filter(x => x.dia >= primeiroEstudo)
    const colunas = [
      { nome: 'Cadastros', medias: mediaPorDiaDaSemana(diasCad, hoje), formato: um, hoje: diasCad.find(x => x.dia === hoje)?.n ?? 0, cor: 'verde' },
      { nome: 'Primeiras assinaturas', medias: mediaPorDiaDaSemana(diasNovas, hoje), formato: um, hoje: contNovas.get(hoje) ?? 0, cor: 'ouro' },
      { nome: 'Recebido', medias: mediaPorDiaDaSemana(diasCad.map(x => ({ dia: x.dia, n: porDiaValor.get(x.dia) ?? 0 })), hoje), formato: (v: number) => reais(v).replace(/,\d\d$/, ''), hoje: porDiaValor.get(hoje) ?? 0, cor: 'ouro' },
      ...(estudo.length ? [
        { nome: 'Pessoas estudando', medias: mediaPorDiaDaSemana(estudo.map(x => ({ dia: x.dia, n: x.ativos })), hoje), formato: um, hoje: estudo.find(x => x.dia === hoje)?.ativos ?? 0, cor: 'azul' },
        { nome: 'Questões respondidas', medias: mediaPorDiaDaSemana(estudo.map(x => ({ dia: x.dia, n: x.respostas })), hoje), formato: (v: number) => inteiro(Math.round(v)), hoje: estudo.find(x => x.dia === hoje)?.respostas ?? 0, cor: 'azul' },
      ] : []),
    ]
    const diaHoje = (new Date(`${hoje}T12:00:00Z`).getUTCDay() + 6) % 7
    const semanas = Math.min(...colunas[0].medias.map(m => m.dias))
    return { colunas, diaHoje, semanas, gradeCad: gradeSemanaHora(cad), gradeAss: gradeSemanaHora(novas), totalCad: cad.length, totalAss: novas.length }
  }, [p.usuariosReais, p.reais, p.cobrancas, jornada.dados])
  if (!d) return <Carregando linhas={6} />
  const estudo = d.colunas.find(c => c.nome === 'Pessoas estudando')
  const frase = (c: typeof d.colunas[number], palavra: string) => {
    const v = c.medias.map(m => m.media), max = v.indexOf(Math.max(...v)), min = v.indexOf(Math.min(...v))
    const media = v.reduce((s, x) => s + x, 0) / 7
    return <>{palavra}: mais forte n{artigo(max)} <b>{nomeDia(max)}</b> ({c.formato(v[max])}), mais fraco n{artigo(min)} <b>{nomeDia(min)}</b> ({c.formato(v[min])}{media ? `, ${Math.round((1 - v[min] / media) * 100)}% abaixo da média` : ''}).</>
  }
  const g = grade === 'cad' ? d.gradeCad : d.gradeAss
  const maxG = Math.max(1, ...g.flat())
  return <div className="hb hb-secao">
    <div className="hb-hoje" aria-label={`Hoje, ${nomeDia(d.diaHoje)}: o que costuma acontecer`}>
      <div><span>Hoje é {nomeDia(d.diaHoje)}. Em média, n{artigo(d.diaHoje)} {nomeDia(d.diaHoje)}:</span><b>{um(d.colunas[0].medias[d.diaHoje].media)} cadastros</b><small>hoje, até agora: {inteiro(d.colunas[0].hoje)}</small></div>
      <div><span>Primeiras assinaturas</span><b>{um(d.colunas[1].medias[d.diaHoje].media)}</b><small>hoje, até agora: {inteiro(d.colunas[1].hoje)}</small></div>
      <div><span>Recebido</span><b>{d.colunas[2].formato(d.colunas[2].medias[d.diaHoje].media)}</b><small>hoje, até agora: {reais(d.colunas[2].hoje)}</small></div>
      {estudo ? <div><span>Pessoas estudando</span><b>{um(estudo.medias[d.diaHoje].media)}</b><small>hoje, até agora: {inteiro(estudo.hoje)}</small></div> : <div><span>Pessoas estudando</span><b>—</b><small>{jornada.carregando ? 'carregando…' : 'sem a série de estudo'}</small></div>}
    </div>
    <div className="hb-painel">
      <div className="hb-titulo"><div><h3>A média de cada dia da semana</h3>
        <p>{frase(d.colunas[0], 'Cadastros')} {estudo && frase(estudo, 'Estudo')} Base: {inteiro(d.semanas)} {d.semanas === 1 ? 'semana' : 'semanas'} completas (hoje fica de fora).</p></div></div>
      <div className="hb-tipica" style={{ '--n': d.colunas.length } as React.CSSProperties} role="table" aria-label="Média por dia da semana">
        <div className="hb-tipica__linha hb-tipica__cab" role="row"><span role="columnheader">Dia</span>{d.colunas.map(c => <span key={c.nome} role="columnheader">{c.nome}</span>)}</div>
        {DIAS_SEMANA.map((dia, i) => <div key={dia} role="row" className={'hb-tipica__linha' + (i === d.diaHoje ? ' hoje' : '')}>
          <span role="rowheader" className="hb-tipica__dia">{dia}{i === d.diaHoje && <em>hoje</em>}</span>
          {d.colunas.map(c => { const v = c.medias.map(m => m.media), max = Math.max(...v, 0.0001); return <span key={c.nome} role="cell" className={'hb-tipica__cel' + (v[i] === max ? ' max' : v[i] === Math.min(...v) ? ' min' : '')}>
            <span aria-hidden="true"><i className={`hb-c-${c.cor}`} style={{ width: `${v[i] / max * 100}%` }} /></span><b>{c.formato(v[i])}</b></span> })}
        </div>)}
      </div>
    </div>
    {calor && <div className="hb-painel">
      <div className="hb-titulo"><div><h3>Dia da semana × hora</h3><p>Cada quadrado é uma hora de um dia da semana, somando tudo desde o começo ({grade === 'cad' ? `${inteiro(d.totalCad)} cadastros` : `${inteiro(d.totalAss)} primeiras assinaturas`}). Quanto mais forte, mais movimento. Horário de São Paulo.</p></div>
        <Segmento rotulo="O que mostrar" valor={grade} aoMudar={definirGrade} opcoes={[['cad', 'Cadastros'], ['ass', 'Assinaturas']]} /></div>
      <div className={'hb-calor' + (grade === 'ass' ? ' ouro' : '')} role="grid" aria-label="Movimento por dia da semana e hora">
        <span />{Array.from({ length: 24 }, (_, h) => <span key={h} aria-hidden="true">{h % 3 === 0 ? `${h}h` : ''}</span>)}
        {g.map((linha, s) => [<span key={`r${s}`} role="rowheader">{DIAS_SEMANA[s].slice(0, 3)}</span>, ...linha.map((n, h) => <button key={`${s}-${h}`} type="button" role="gridcell" data-n={n === 0 ? 0 : Math.min(4, Math.ceil(n / maxG * 4))} title={`${DIAS_SEMANA[s]}, das ${h}h às ${h + 1}h: ${n}`} aria-label={`${DIAS_SEMANA[s]}, das ${h}h às ${h + 1}h: ${n}`} />)])}
      </div>
      <div className="hb-escala" aria-hidden="true">menos{[0, 1, 2, 3, 4].map(n => <i key={n} style={{ background: n === 0 ? 'var(--a3-recuo)' : `color-mix(in srgb, var(--hb-s-${grade === 'ass' ? 'ouro' : 'verde'}) ${[0, 22, 45, 70, 100][n]}%, var(--a3-papel))` }} />)}mais</div>
      <p className="hb-nota">{(() => { const h = Array.from({ length: 24 }, (_, x) => g.reduce((s, l) => s + l[x], 0)); const top = h.map((n, x) => ({ n, x })).sort((a, b) => b.n - a.n).slice(0, 3).map(o => `${o.x}h`); return `Horas mais fortes: ${top.join(', ')}.` })()}</p>
    </div>}
  </div>
}

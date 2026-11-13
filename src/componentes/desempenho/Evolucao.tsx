import { useMemo, useState } from 'react'
import { colunaPath, setas, tetoRedondo, usarLargura } from '../GraficosDesempenho'
import { compararPeriodos, serieEvolucao, type Escala, type Evento } from '../../dados/desempenho'

/*
 * Evolução (14/11/2026): o gráfico principal da página. Em cima, duas linhas de acerto: o de primeira vez (o que
 * prevê a prova) e o das revisões (o que mostra a fixação). Embaixo, as colunas de volume, com questões novas e
 * revisões empilhadas. Dia, semana ou mês; o ponto sob o cursor (ou sob as setas do teclado) aparece na legenda
 * fixa, e há a tabela equivalente logo abaixo.
 */

const ESCALAS: Array<[Escala, string, number, number]> = [['dia', 'Dia', 30, 7], ['semana', 'Semana', 12, 28], ['mes', 'Mês', 12, 90]]
const pct = (c: number, n: number) => (n ? Math.round((c / n) * 100) : null)
const rotulo = (inicio: number, e: Escala, longo = false) => {
  const d = new Date(inicio)
  if (e === 'mes') return d.toLocaleDateString('pt-BR', { month: longo ? 'long' : 'short', year: longo ? 'numeric' : undefined }).replace('.', '')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: longo ? 'long' : '2-digit' })
}

export function Evolucao({ eventos }: { eventos: Evento[] }) {
  const [escala, definirEscala] = useState<Escala>('semana')
  const [, , quantos, dias] = ESCALAS.find(([e]) => e === escala)!
  const baldes = useMemo(() => serieEvolucao(eventos, escala, quantos), [eventos, escala, quantos])
  const comparacao = useMemo(() => compararPeriodos(eventos, dias), [eventos, dias])
  const [ref, larg] = usarLargura<HTMLDivElement>(640)
  const [ativo, definirAtivo] = useState<number | null>(null)

  const E = 40, D = 14, T = 16, AL = 150, VAO = 22, AC = 76, EIXO = 24
  const plotW = larg - E - D
  const passo = plotW / baldes.length
  const xc = (i: number) => E + passo * i + passo / 2
  const yl = (v: number) => T + AL - (v / 100) * AL
  const topoCol = T + AL + VAO
  const maxVol = tetoRedondo(Math.max(1, ...baldes.map((b) => b.novas.n + b.revisoes.n)))
  const hc = (v: number) => (v / maxVol) * AC
  const total = topoCol + AC + EIXO
  const largCol = Math.max(3, Math.min(26, passo - 4))
  const ultimo = baldes.reduce((u, b, i) => (b.novas.n + b.revisoes.n ? i : u), baldes.length - 1)
  const mostrado = ativo ?? ultimo
  const b = baldes[mostrado]

  const linha = (serie: 'novas' | 'revisoes') => {
    const trechos: string[] = []
    let atual = ''
    baldes.forEach((x, i) => {
      const v = pct(x[serie].certas, x[serie].n)
      if (v === null || x[serie].n < 3) { if (atual) trechos.push(atual); atual = ''; return }
      atual += `${atual ? 'L' : 'M'}${xc(i)} ${yl(v)}`
    })
    if (atual) trechos.push(atual)
    return trechos
  }
  const passoEixo = Math.ceil(baldes.length / Math.max(3, Math.floor(plotW / 54)))
  const nomePeriodo = escala === 'dia' ? '7 dias' : escala === 'semana' ? '4 semanas' : '3 meses'
  const descricao = b ? `${escala === 'semana' ? 'Semana de ' : ''}${rotulo(b.inicio, escala, true)}: ${b.novas.n} ${b.novas.n === 1 ? 'questão nova' : 'questões novas'}${b.novas.n ? ` (${pct(b.novas.certas, b.novas.n)}% de acerto)` : ''} e ${b.revisoes.n} ${b.revisoes.n === 1 ? 'revisão' : 'revisões'}${b.revisoes.n ? ` (${pct(b.revisoes.certas, b.revisoes.n)}% de acerto)` : ''}.` : ''

  return (
    <section className="ds-cartao ev" aria-labelledby="ev-titulo">
      <div className="ds-cartao__cabeca ds-cartao__cabeca--linha">
        <div>
          <h3 id="ev-titulo">Evolução do acerto</h3>
          <p>A linha cheia é o acerto de primeira vez, o que mais se parece com a prova. A tracejada é o das revisões.</p>
        </div>
        <div className="ds-seg ds-seg--mini seletor" role="group" aria-label="Escala do gráfico">
          {ESCALAS.map(([e, r]) => <button key={e} type="button" aria-pressed={escala === e} onClick={() => { definirEscala(e); definirAtivo(null) }}>{r}</button>)}
        </div>
      </div>

      <dl className="ev__resumo">
        <div>
          <dt>Acerto de primeira · últimos {nomePeriodo}</dt>
          <dd><b className="ds-num">{comparacao.atual.acerto === null ? '–' : `${Math.round(comparacao.atual.acerto * 100)}%`}</b>
            {comparacao.diferenca !== null && <span className={'ev__var' + (comparacao.diferenca > 0 ? ' ev__var--sobe' : comparacao.diferenca < 0 ? ' ev__var--desce' : '')}>
              {comparacao.diferenca > 0 ? '▲' : comparacao.diferenca < 0 ? '▼' : '='} {Math.abs(comparacao.diferenca)} {Math.abs(comparacao.diferenca) === 1 ? 'ponto' : 'pontos'} contra os {nomePeriodo} anteriores
            </span>}
            {comparacao.diferenca === null && comparacao.atual.n > 0 && <span className="ev__var">poucos dados para comparar</span>}
          </dd>
        </div>
        <div><dt>Questões novas</dt><dd><b className="ds-num">{comparacao.atual.novas.toLocaleString('pt-BR')}</b><span className="ev__var">antes {comparacao.anterior.novas.toLocaleString('pt-BR')}</span></dd></div>
        <div><dt>Revisões</dt><dd><b className="ds-num">{comparacao.atual.revisoes.toLocaleString('pt-BR')}</b><span className="ev__var">antes {comparacao.anterior.revisoes.toLocaleString('pt-BR')}</span></dd></div>
      </dl>

      <ul className="ev__legenda" aria-hidden="true">
        <li><i className="ev__chave ev__chave--primeira" /> Acerto de primeira</li>
        <li><i className="ev__chave ev__chave--revisao" /> Acerto nas revisões</li>
        <li><i className="ev__chave ev__chave--novas" /> Novas</li>
        <li><i className="ev__chave ev__chave--revisoes" /> Revisões</li>
      </ul>

      <figure className="ds-grafico" ref={ref}>
        <div className="ds-grafico__area" tabIndex={0} role="group" aria-label="Evolução do acerto e do volume. Use as setas para percorrer."
          onKeyDown={(e) => setas(e, mostrado, baldes.length, definirAtivo)} onBlur={() => definirAtivo(null)}>
          <svg width={larg} height={total} viewBox={`0 0 ${larg} ${total}`} aria-hidden="true" onMouseLeave={() => definirAtivo(null)}>
            {[0, 50, 100].map((v) => <g key={v}>
              <line x1={E} x2={larg - D} y1={yl(v)} y2={yl(v)} className={v === 0 ? 'ds-grafico__base' : 'ds-grafico__grade'} />
              <text x={E - 6} y={yl(v) + 4} textAnchor="end" className="ds-grafico__tique">{v}%</text>
            </g>)}
            <line x1={xc(mostrado)} x2={xc(mostrado)} y1={T} y2={topoCol + AC} className="ds-grafico__mira" />
            {linha('revisoes').map((d) => <path key={d} d={d} className="ev__linha ev__linha--revisao" />)}
            {linha('novas').map((d) => <path key={d} d={d} className="ev__linha ev__linha--primeira" />)}
            {baldes.map((x, i) => {
              const p1 = x.novas.n >= 3 ? pct(x.novas.certas, x.novas.n) : null
              const p2 = x.revisoes.n >= 3 ? pct(x.revisoes.certas, x.revisoes.n) : null
              const hN = hc(x.novas.n), hR = hc(x.revisoes.n)
              const x0 = xc(i) - largCol / 2
              return <g key={x.inicio}>
                {p2 !== null && <circle cx={xc(i)} cy={yl(p2)} r={i === mostrado ? 4.5 : 3} className="ev__ponto ev__ponto--revisao" />}
                {p1 !== null && <circle cx={xc(i)} cy={yl(p1)} r={i === mostrado ? 5.5 : 3.5} className="ev__ponto ev__ponto--primeira" />}
                {i === mostrado && p1 !== null && <text x={xc(i)} y={yl(p1) - 10} textAnchor="middle" className="ds-grafico__valor">{p1}%</text>}
                <rect x={x0} y={topoCol + AC - hN} width={largCol} height={hN} className="ev__col ev__col--novas" />
                {hR > 0 && <path d={colunaPath(x0, topoCol + AC - hN - hR, largCol, hR)} className="ev__col ev__col--revisoes" />}
                {(i % passoEixo === (baldes.length - 1) % passoEixo) && <text x={xc(i)} y={topoCol + AC + 16} textAnchor="middle" className={'ds-grafico__tique' + (i === mostrado ? ' ds-grafico__tique--ativo' : '')}>{i === baldes.length - 1 ? (escala === 'dia' ? 'hoje' : escala === 'semana' ? 'esta' : 'este') : rotulo(x.inicio, escala)}</text>}
                <rect x={E + passo * i} y={0} width={passo} height={total} fill="transparent" onMouseEnter={() => definirAtivo(i)} />
              </g>
            })}
            <text x={E - 6} y={topoCol + 8} textAnchor="end" className="ds-grafico__tique">{maxVol}</text>
            <text x={E + 4} y={topoCol - 4} className="ds-grafico__tique">respostas</text>
            <line x1={E} x2={larg - D} y1={topoCol + AC} y2={topoCol + AC} className="ds-grafico__base" />
          </svg>
        </div>
        <figcaption className="ds-grafico__leitura" aria-live="polite">{descricao}</figcaption>
      </figure>

      <details className="ds-tabela">
        <summary>Ver em tabela</summary>
        <div className="rolagem-x"><table className="tabela ds-tabela__tabela">
          <thead><tr><th scope="col">Período</th><th scope="col" className="numerico">Novas</th><th scope="col" className="numerico">Acerto de primeira</th><th scope="col" className="numerico">Revisões</th><th scope="col" className="numerico">Acerto nas revisões</th></tr></thead>
          <tbody>{[...baldes].reverse().map((x) => <tr key={x.inicio}>
            <th scope="row">{rotulo(x.inicio, escala, true)}</th>
            <td className="numerico">{x.novas.n}</td><td className="numerico">{x.novas.n ? `${pct(x.novas.certas, x.novas.n)}%` : '–'}</td>
            <td className="numerico">{x.revisoes.n}</td><td className="numerico">{x.revisoes.n ? `${pct(x.revisoes.certas, x.revisoes.n)}%` : '–'}</td>
          </tr>)}</tbody>
        </table></div>
      </details>
    </section>
  )
}

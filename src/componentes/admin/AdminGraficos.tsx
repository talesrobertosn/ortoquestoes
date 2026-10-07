import { useEffect, useRef, useState } from 'react'

/**
 * Gráficos do painel, sem biblioteca: uma série por gráfico (três medidas de
 * escalas diferentes viram três gráficos, nunca dois eixos no mesmo). Colunas
 * finas com a ponta arredondada, grade discreta, dica ao passar o dedo ou o
 * foco, e a mesma informação numa tabela para quem não enxerga o gráfico.
 */

export interface Ponto { rotulo: string; rotuloCurto: string; valor: number }

function usarLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [largura, definirLargura] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => definirLargura(el.clientWidth)
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, largura] as const
}

/** Topo do eixo em número redondo: 7 vira 8, 43 vira 50, 1.240 vira 1.500. */
function topoRedondo(maximo: number) {
  if (maximo <= 4) return 4
  const potencia = 10 ** Math.floor(Math.log10(maximo))
  for (const passo of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (passo * potencia >= maximo) return passo * potencia
  return 10 * potencia
}

const n = (v: number) => v.toLocaleString('pt-BR')
/** Rótulo curto do eixo: 1.500 vira "1,5 mil"; em reais, com "R$". */
function compacto(v: number, numero: boolean) {
  const t = v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : Math.round(v).toLocaleString('pt-BR')
  return numero ? t : `R$ ${t}`
}

export function GraficoColunas({ titulo, subtitulo, pontos, unidade, formato = n, rotuloTabela = 'Dia', previsto = false }: {
  titulo: string; subtitulo?: string; pontos: Ponto[]; unidade: string
  /** Formata valores (eixo, dica, total e tabela); padrão: número inteiro. */
  formato?: (v: number) => string
  rotuloTabela?: string
  /** Colunas de previsão: mesmo verde, mais claras e com contorno tracejado. */
  previsto?: boolean
}) {
  const [ref, largura] = usarLargura<HTMLDivElement>()
  const [ativo, definirAtivo] = useState<number | null>(null)
  const altura = 170, margemEsq = formato === n ? 36 : 56, margemBaixo = 22, margemTopo = 8
  const areaL = Math.max(0, largura - margemEsq), areaA = altura - margemBaixo - margemTopo
  const topo = topoRedondo(Math.max(0, ...pontos.map(p => p.valor)))
  const slot = pontos.length ? areaL / pontos.length : 0
  // A borda tracejada da previsão come o respiro de 2px; por isso a folga maior.
  const grossura = Math.max(2, Math.min(24, slot - (previsto ? 5 : 2)))
  const total = pontos.reduce((s, p) => s + p.valor, 0)
  const passoRotulo = Math.max(1, Math.ceil(pontos.length / Math.max(2, Math.floor(areaL / 64))))
  const y = (v: number) => margemTopo + areaA - (v / topo) * areaA
  const eixo = (v: number) => compacto(v, formato === n)

  const coluna = (x: number, v: number) => {
    const h = Math.max(v > 0 ? 2 : 0, (v / topo) * areaA)
    const r = Math.min(4, grossura / 2, h)
    const base = margemTopo + areaA, topoY = base - h
    return `M${x},${base} V${topoY + r} Q${x},${topoY} ${x + r},${topoY} H${x + grossura - r} Q${x + grossura},${topoY} ${x + grossura},${topoY + r} V${base} Z`
  }

  const p = ativo === null ? null : pontos[ativo]
  return <figure className={'adm-grafico' + (previsto ? ' adm-grafico--previsto' : '')}>
    <figcaption><strong>{titulo}</strong>{subtitulo && <span>{subtitulo}</span>}<b className="numerico">{formato(total)} no período</b></figcaption>
    <div className="adm-grafico__area" ref={ref} onPointerLeave={() => definirAtivo(null)}>
      {largura > 0 && <svg width={largura} height={altura} role="img" aria-label={`${titulo}: ${formato(total)} ${unidade} no período`}>
        {[0, topo / 2, topo].map(v => <g key={v}>
          <line x1={margemEsq} x2={largura} y1={y(v)} y2={y(v)} className="adm-grafico__grade" />
          <text x={margemEsq - 6} y={y(v) + 4} textAnchor="end" className="adm-grafico__eixo">{eixo(v)}</text>
        </g>)}
        {pontos.map((pt, i) => {
          const x = margemEsq + i * slot + (slot - grossura) / 2
          return <g key={pt.rotulo}>
            <path d={coluna(x, pt.valor)} className={'adm-grafico__coluna' + (ativo === i ? ' adm-grafico__coluna--ativa' : '')} />
            {/* Alvo do toque do tamanho do espaço inteiro, não só da coluna pintada. */}
            <rect x={margemEsq + i * slot} y={margemTopo} width={slot} height={areaA} fill="transparent" tabIndex={0}
              aria-label={`${pt.rotulo}: ${formato(pt.valor)} ${unidade}`}
              onPointerEnter={() => definirAtivo(i)} onPointerDown={() => definirAtivo(i)} onFocus={() => definirAtivo(i)} onBlur={() => definirAtivo(null)} />
            {i % passoRotulo === 0 && <text x={margemEsq + i * slot + slot / 2} y={altura - 6} textAnchor="middle" className="adm-grafico__eixo">{pt.rotuloCurto}</text>}
          </g>
        })}
      </svg>}
      {p && ativo !== null && <div className="adm-grafico__dica" style={{ left: Math.min(Math.max(margemEsq + ativo * slot + slot / 2, 60), largura - 60) }}>
        <strong className="numerico">{formato(p.valor)}</strong><span>{unidade}</span><small>{p.rotulo}</small>
      </div>}
    </div>
    <details className="adm-grafico__tabela"><summary>Ver em tabela</summary>
      <table className="tabela"><thead><tr><th scope="col">{rotuloTabela}</th><th scope="col">{unidade}</th></tr></thead>
        <tbody>{(previsto ? pontos : [...pontos].reverse()).map(pt => <tr key={pt.rotulo}><td>{pt.rotulo}</td><td className="numerico">{formato(pt.valor)}</td></tr>)}</tbody></table>
    </details>
  </figure>
}

/** Barras horizontais com o valor na ponta: funil, temas. */
export function BarrasHorizontais({ itens, formato = (v) => n(v), maximo }: {
  itens: Array<{ rotulo: string; valor: number; detalhe?: string; destaque?: 'bom' | 'ruim' }>
  formato?: (v: number) => string
  maximo?: number
}) {
  const topo = maximo ?? Math.max(1, ...itens.map(i => i.valor))
  return <ul className="adm-barras">
    {itens.map(item => <li key={item.rotulo}>
      <div className="adm-barras__topo"><span>{item.rotulo}</span><strong className={'numerico' + (item.destaque ? ` adm-${item.destaque}` : '')}>{formato(item.valor)}</strong></div>
      <div className="adm-barras__trilho" aria-hidden="true"><span style={{ width: `${Math.max(item.valor > 0 ? 1.5 : 0, (item.valor / topo) * 100)}%` }} /></div>
      {item.detalhe && <small>{item.detalhe}</small>}
    </li>)}
  </ul>
}

/**
 * Colunas empilhadas de duas séries (por exemplo, cartão e Pix em cada mês): a ordem e a cor de
 * cada série são fixas, há 2px de folga entre os segmentos, legenda sempre visível e a dica mostra
 * as duas partes e o total. A mesma informação fica numa tabela.
 */
export interface PontoEmpilhado { rotulo: string; rotuloCurto: string; partes: number[] }
export function GraficoColunasEmpilhadas({ titulo, subtitulo, pontos, series, formato = n, rotuloTabela = 'Mês' }: {
  titulo: string; subtitulo?: string; pontos: PontoEmpilhado[]
  series: Array<{ nome: string; classe: string }>
  formato?: (v: number) => string
  rotuloTabela?: string
}) {
  const [ref, largura] = usarLargura<HTMLDivElement>()
  const [ativo, definirAtivo] = useState<number | null>(null)
  const altura = 190, margemEsq = 52, margemBaixo = 22, margemTopo = 8, folga = 2
  const areaL = Math.max(0, largura - margemEsq), areaA = altura - margemBaixo - margemTopo
  const soma = (p: PontoEmpilhado) => p.partes.reduce((a, b) => a + b, 0)
  const topo = topoRedondo(Math.max(0, ...pontos.map(soma)))
  const slot = pontos.length ? areaL / pontos.length : 0
  const grossura = Math.max(2, Math.min(26, slot - 4))
  const total = pontos.reduce((s, p) => s + soma(p), 0)
  const passoRotulo = Math.max(1, Math.ceil(pontos.length / Math.max(2, Math.floor(areaL / 64))))
  const y = (v: number) => margemTopo + areaA - (v / topo) * areaA
  const base = margemTopo + areaA

  /** Segmento: só o de cima ganha a ponta arredondada. */
  const segmento = (x: number, y0: number, h: number, arredonda: boolean) => {
    const r = arredonda ? Math.min(4, grossura / 2, h) : 0
    const yt = y0 - h
    return `M${x},${y0} V${yt + r} Q${x},${yt} ${x + r},${yt} H${x + grossura - r} Q${x + grossura},${yt} ${x + grossura},${yt + r} V${y0} Z`
  }
  const p = ativo === null ? null : pontos[ativo]
  return <figure className="adm-grafico">
    <figcaption><strong>{titulo}</strong>{subtitulo && <span>{subtitulo}</span>}<b className="numerico">{formato(total)} no período</b></figcaption>
    <ul className="adm-legenda" aria-label="Legenda">{series.map(se => <li key={se.nome}><i className={se.classe} aria-hidden="true" />{se.nome}</li>)}</ul>
    <div className="adm-grafico__area" ref={ref} onPointerLeave={() => definirAtivo(null)} style={{ minHeight: altura }}>
      {largura > 0 && <svg width={largura} height={altura} role="img" aria-label={`${titulo}: ${formato(total)} no período`}>
        {[0, topo / 2, topo].map(v => <g key={v}>
          <line x1={margemEsq} x2={largura} y1={y(v)} y2={y(v)} className="adm-grafico__grade" />
          <text x={margemEsq - 6} y={y(v) + 4} textAnchor="end" className="adm-grafico__eixo">{compacto(v, formato === n)}</text>
        </g>)}
        {pontos.map((pt, i) => {
          const x = margemEsq + i * slot + (slot - grossura) / 2
          let y0 = base
          const ultimo = pt.partes.reduce((u, v, k) => v > 0 ? k : u, -1)
          return <g key={pt.rotulo} className={ativo === null || ativo === i ? '' : 'adm-grafico__apagado'}>
            {pt.partes.map((v, k) => {
              if (v <= 0) return null
              const h = Math.max(2, (v / topo) * areaA) - (k === ultimo ? 0 : folga)
              const d = segmento(x, y0, Math.max(1, h), k === ultimo)
              y0 = y0 - h - (k === ultimo ? 0 : folga)
              return <path key={k} d={d} className={series[k].classe} />
            })}
            <rect x={margemEsq + i * slot} y={margemTopo} width={slot} height={areaA} fill="transparent" tabIndex={0}
              aria-label={`${pt.rotulo}: ${series.map((se, k) => `${se.nome} ${formato(pt.partes[k] ?? 0)}`).join(', ')}`}
              onPointerEnter={() => definirAtivo(i)} onPointerDown={() => definirAtivo(i)} onFocus={() => definirAtivo(i)} onBlur={() => definirAtivo(null)} />
            {i % passoRotulo === 0 && <text x={margemEsq + i * slot + slot / 2} y={altura - 6} textAnchor="middle" className="adm-grafico__eixo">{pt.rotuloCurto}</text>}
          </g>
        })}
      </svg>}
      {p && ativo !== null && <div className="adm-grafico__dica adm-grafico__dica--lista" style={{ left: Math.min(Math.max(margemEsq + ativo * slot + slot / 2, 90), largura - 90) }}>
        <small>{p.rotulo}</small>
        {series.map((se, k) => <span key={se.nome}><i className={se.classe} aria-hidden="true" />{se.nome}<b className="numerico">{formato(p.partes[k] ?? 0)}</b></span>)}
        <strong className="numerico">{formato(soma(p))}</strong>
      </div>}
    </div>
    <details className="adm-grafico__tabela"><summary>Ver em tabela</summary>
      <table className="tabela"><thead><tr><th scope="col">{rotuloTabela}</th>{series.map(se => <th scope="col" key={se.nome}>{se.nome}</th>)}<th scope="col">Total</th></tr></thead>
        <tbody>{[...pontos].reverse().map(pt => <tr key={pt.rotulo}><td>{pt.rotulo}</td>{pt.partes.map((v, k) => <td key={k} className="numerico">{formato(v)}</td>)}<td className="numerico">{formato(soma(pt))}</td></tr>)}</tbody></table>
    </details>
  </figure>
}

/** Uma barra só, dividida em partes (composição de um total), com rótulo direto em cada parte. */
export function BarraComposicao({ partes, formato = n }: { partes: Array<{ nome: string; valor: number; classe: string; detalhe?: string }>; formato?: (v: number) => string }) {
  const total = partes.reduce((s, p) => s + p.valor, 0)
  if (!total) return <p className="adm-vazio">Ainda não há valores para comparar.</p>
  return <div className="adm-composicao">
    <div className="adm-composicao__barra" role="img" aria-label={partes.map(p => `${p.nome}: ${formato(p.valor)} (${Math.round((p.valor / total) * 100)}%)`).join('; ')}>
      {partes.filter(p => p.valor > 0).map(p => <span key={p.nome} className={p.classe} style={{ flexGrow: p.valor }} />)}
    </div>
    <ul className="adm-composicao__itens">{partes.map(p => <li key={p.nome}>
      <i className={p.classe} aria-hidden="true" /><span>{p.nome}</span>
      <strong className="numerico">{formato(p.valor)}</strong><small>{Math.round((p.valor / total) * 100)}%{p.detalhe ? ` · ${p.detalhe}` : ''}</small>
    </li>)}</ul>
  </div>
}

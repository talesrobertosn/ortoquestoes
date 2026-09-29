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

export function GraficoColunas({ titulo, subtitulo, pontos, unidade }: { titulo: string; subtitulo?: string; pontos: Ponto[]; unidade: string }) {
  const [ref, largura] = usarLargura<HTMLDivElement>()
  const [ativo, definirAtivo] = useState<number | null>(null)
  const altura = 170, margemEsq = 36, margemBaixo = 22, margemTopo = 8
  const areaL = Math.max(0, largura - margemEsq), areaA = altura - margemBaixo - margemTopo
  const topo = topoRedondo(Math.max(0, ...pontos.map(p => p.valor)))
  const slot = pontos.length ? areaL / pontos.length : 0
  const grossura = Math.max(2, Math.min(24, slot - 2))
  const total = pontos.reduce((s, p) => s + p.valor, 0)
  const passoRotulo = Math.max(1, Math.ceil(pontos.length / Math.max(2, Math.floor(areaL / 64))))
  const y = (v: number) => margemTopo + areaA - (v / topo) * areaA

  const coluna = (x: number, v: number) => {
    const h = Math.max(v > 0 ? 2 : 0, (v / topo) * areaA)
    const r = Math.min(4, grossura / 2, h)
    const base = margemTopo + areaA, topoY = base - h
    return `M${x},${base} V${topoY + r} Q${x},${topoY} ${x + r},${topoY} H${x + grossura - r} Q${x + grossura},${topoY} ${x + grossura},${topoY + r} V${base} Z`
  }

  const p = ativo === null ? null : pontos[ativo]
  return <figure className="adm-grafico">
    <figcaption><strong>{titulo}</strong>{subtitulo && <span>{subtitulo}</span>}<b className="numerico">{n(total)} no período</b></figcaption>
    <div className="adm-grafico__area" ref={ref} onPointerLeave={() => definirAtivo(null)}>
      {largura > 0 && <svg width={largura} height={altura} role="img" aria-label={`${titulo}: ${n(total)} ${unidade} no período`}>
        {[0, topo / 2, topo].map(v => <g key={v}>
          <line x1={margemEsq} x2={largura} y1={y(v)} y2={y(v)} className="adm-grafico__grade" />
          <text x={margemEsq - 6} y={y(v) + 4} textAnchor="end" className="adm-grafico__eixo">{n(Math.round(v))}</text>
        </g>)}
        {pontos.map((pt, i) => {
          const x = margemEsq + i * slot + (slot - grossura) / 2
          return <g key={pt.rotulo}>
            <path d={coluna(x, pt.valor)} className={'adm-grafico__coluna' + (ativo === i ? ' adm-grafico__coluna--ativa' : '')} />
            {/* Alvo do toque do tamanho do espaço inteiro, não só da coluna pintada. */}
            <rect x={margemEsq + i * slot} y={margemTopo} width={slot} height={areaA} fill="transparent" tabIndex={0}
              aria-label={`${pt.rotulo}: ${n(pt.valor)} ${unidade}`}
              onPointerEnter={() => definirAtivo(i)} onPointerDown={() => definirAtivo(i)} onFocus={() => definirAtivo(i)} onBlur={() => definirAtivo(null)} />
            {i % passoRotulo === 0 && <text x={margemEsq + i * slot + slot / 2} y={altura - 6} textAnchor="middle" className="adm-grafico__eixo">{pt.rotuloCurto}</text>}
          </g>
        })}
      </svg>}
      {p && ativo !== null && <div className="adm-grafico__dica" style={{ left: Math.min(Math.max(margemEsq + ativo * slot + slot / 2, 60), largura - 60) }}>
        <strong className="numerico">{n(p.valor)}</strong><span>{unidade}</span><small>{p.rotulo}</small>
      </div>}
    </div>
    <details className="adm-grafico__tabela"><summary>Ver em tabela</summary>
      <table className="tabela"><thead><tr><th scope="col">Dia</th><th scope="col">{unidade}</th></tr></thead>
        <tbody>{[...pontos].reverse().map(pt => <tr key={pt.rotulo}><td>{pt.rotulo}</td><td className="numerico">{n(pt.valor)}</td></tr>)}</tbody></table>
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

import { useId, useLayoutEffect, useRef, useState } from 'react'
import { inteiro } from './formato'

export interface PontoLinha { rotulo: string; valores: Array<number | null>; nota?: string }
/** Gráfico de linhas sem dependências: teclado, toque, dados tabulares e CSV pelo consumidor. */
export function Linhas({ pontos, series, formato = inteiro, titulo, altura = 240 }: {
  pontos: PontoLinha[]; series: Array<{ nome: string; tracejada?: boolean }>; formato?: (v: number) => string; titulo: string; altura?: number
}) {
  const [ativo, selecionar] = useState<number | null>(null)
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, medir] = useState(600)
  useLayoutEffect(() => {
    if (!caixa.current) return
    const r = new ResizeObserver(([e]) => medir(Math.max(240, Math.round(e.contentRect.width))))
    r.observe(caixa.current)
    return () => r.disconnect()
  }, [])
  const id = useId()
  const w = largura, h = altura, esq = 70, dir = 20, topo = 18, baixo = 32
  const max = Math.max(1, ...pontos.flatMap(p => p.valores.map(v => v ?? 0))) * 1.12
  const x = (i: number) => esq + i / Math.max(1, pontos.length - 1) * (w - esq - dir)
  const y = (v: number) => h - baixo - v / max * (h - topo - baixo)
  const escolhido = ativo === null ? null : pontos[ativo]
  const passoX = Math.max(1, Math.ceil((pontos.length - 1) / Math.max(1, Math.floor((w - esq - dir) / 70))))
  function caminho(k: number) {
    let ligado = false
    return pontos.map((p, i) => { const v = p.valores[k]; if (v === null || v === undefined) { ligado = false; return '' }; const s = `${ligado ? 'L' : 'M'}${x(i)},${y(v)}`; ligado = true; return s }).join(' ')
  }
  return <div className="ng-linhas" ref={caixa}>
    <div className="ng-legenda">{series.map((s, k) => <span key={s.nome}><i className={`ng-cor ng-cor-${k}`} style={{ borderTopStyle: s.tracejada ? 'dashed' : 'solid' }} />{s.nome}</span>)}</div>
    <svg viewBox={`0 0 ${w} ${h}`} style={{ height: h }} role="img" aria-labelledby={id} tabIndex={0} onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); selecionar(Math.max(0, Math.min(pontos.length - 1, Math.round(((e.clientX - r.left) / r.width * w - esq) / (w - esq - dir) * (pontos.length - 1))))) }} onPointerLeave={() => selecionar(null)} onKeyDown={e => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(e.key)) { e.preventDefault(); selecionar(e.key === 'Escape' ? null : e.key === 'Home' ? 0 : e.key === 'End' ? pontos.length - 1 : Math.max(0, Math.min(pontos.length - 1, (ativo ?? pontos.length - 1) + (e.key === 'ArrowLeft' ? -1 : 1)))) }
    }} onBlur={() => selecionar(null)}>
      <title id={id}>{titulo}. Use as setas para explorar os valores; tabela disponível abaixo.</title>
      {[0, 0.25, 0.5, 0.75, 1].map(f => <g key={f}><line x1={esq} x2={w - dir} y1={y(max * f)} y2={y(max * f)} className="ng-grade" /><text x={esq - 10} y={y(max * f) + 4} textAnchor="end">{formato(max * f).replace(/,00$/, '')}</text></g>)}
      {series.map((s, k) => <path key={s.nome} d={caminho(k)} fill="none" className={`ng-traco ng-traco-${k}`} strokeWidth={k ? 2.5 : 3.5} strokeDasharray={s.tracejada ? '7 5' : undefined} />)}
      {pontos.map((p, i) => p.nota && <g key={`nota-${i}`}><title>{p.nota}</title><line x1={x(i)} x2={x(i)} y1={topo} y2={h-baixo} className="ng-guia" opacity={0.4} /><circle cx={x(i)} cy={topo} r={4} className="ng-ponto ng-traco-1" /></g>)}
      {pontos.map((p, i) => (i === 0 || i === pontos.length - 1 || (i % passoX === 0 && pontos.length - 1 - i >= passoX)) && <text key={i} x={x(i)} y={h - 7} textAnchor={i === 0 ? 'start' : i === pontos.length - 1 ? 'end' : 'middle'}>{p.rotulo}</text>)}
      {ativo !== null && escolhido && <g><line x1={x(ativo)} x2={x(ativo)} y1={topo} y2={h - baixo} className="ng-guia" />{escolhido.valores.map((v, k) => v !== null && <circle key={k} cx={x(ativo)} cy={y(v)} r={5} className={`ng-ponto ng-traco-${k}`} />)}</g>}
    </svg>
    <div className="ng-leitura" aria-live="polite">{escolhido ? <><strong>{escolhido.rotulo}</strong>{series.map((s, k) => <span key={s.nome}>{s.nome}: <b>{escolhido.valores[k] === null ? '—' : formato(escolhido.valores[k] ?? 0)}</b></span>)}{escolhido.nota && <small>{escolhido.nota}</small>}</> : <span>Passe o cursor, toque no gráfico ou use as setas para ver os valores.</span>}</div>
    <details className="ng-dados"><summary>Ver dados do gráfico</summary><div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta"><caption className="a3-so-leitor">{titulo}</caption><thead><tr><th>Período</th>{series.map(s => <th key={s.nome} className="num">{s.nome}</th>)}</tr></thead><tbody>{pontos.map((p, i) => <tr key={i}><th scope="row">{p.rotulo}</th>{p.valores.map((v, k) => <td key={k} className="num">{v === null ? '—' : formato(v)}</td>)}</tr>)}</tbody></table></div></details>
  </div>
}

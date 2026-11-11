import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { inteiro } from './formato'

/**
 * Torres (11/11/2026, Tales: "o gráfico tem que ser de bater o olho"): colunas com o número escrito em cima,
 * partes empilhadas com 2 px de respiro, o período em andamento com a parte prevista hachurada por cima
 * ("ainda pode entrar") e, se houver, um traço da meta em cada coluna. Passar o dedo, o mouse ou as setas
 * mostra a divisão; "Ver os números" abre a mesma informação em tabela.
 */
export type CorSerie = 'verde' | 'ouro' | 'azul' | 'cinza' | 'cinza-claro' | 'verde-claro'
export interface PontoTorre {
  curto: string
  longo: string
  partes: number[]
  /** Parte prevista (ainda não aconteceu), desenhada hachurada por cima. */
  previsto?: number
  /** Meta do período (traço horizontal). */
  meta?: number
  parcial?: boolean
  /** Linha extra na dica ("3 pessoas", "fechado"). */
  nota?: string
}

function degrau(max: number) {
  const bruto = max / 4, pot = 10 ** Math.floor(Math.log10(Math.max(bruto, 1e-9))), n = bruto / pot
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pot
}

export function Torres({ pontos, series, formato = inteiro, altura = 240, titulo, rotuloPrevisto = 'Ainda previsto', rotuloMeta = 'Meta', mostrarValores = true, rodape, aoEscolher, escolhido }: {
  pontos: PontoTorre[]; series: Array<{ nome: string; cor: CorSerie }>; formato?: (n: number) => string; altura?: number; titulo: string
  rotuloPrevisto?: string; rotuloMeta?: string; mostrarValores?: boolean; rodape?: ReactNode
  aoEscolher?: (i: number) => void; escolhido?: number | null
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, medir] = useState(640)
  const [ativo, definirAtivo] = useState<number | null>(null)
  const id = useId()
  useLayoutEffect(() => {
    const el = caixa.current; if (!el) return
    const r = new ResizeObserver(([e]) => medir(Math.max(260, Math.round(e.contentRect.width))))
    r.observe(el); return () => r.disconnect()
  }, [])
  const n = pontos.length
  const real = (p: PontoTorre) => p.partes.reduce((s, v) => s + Math.max(0, v || 0), 0)
  const topoDe = (p: PontoTorre) => real(p) + Math.max(0, p.previsto ?? 0)
  const maxBruto = Math.max(1, ...pontos.map(p => Math.max(topoDe(p), p.meta ?? 0)))
  const passo = degrau(maxBruto), max = Math.ceil(maxBruto * 1.04 / passo) * passo
  const curtoV = (v: number) => formato(v).replace(/,00$/, '').replace(/^R\$\s?/, '')
  const textoMaior = Math.max(...pontos.map(p => curtoV(topoDe(p)).length), 1)
  const esq = Math.max(34, curtoV(max).length * 7 + 12), dir = 6, topo = 24, baixo = 26
  const w = largura - esq - dir, h = altura - topo - baixo
  const coluna = w / Math.max(1, n)
  const barra = Math.max(4, Math.min(coluna * 0.62, 64))
  const xc = (i: number) => esq + coluna * i + coluna / 2
  const y = (v: number) => topo + h - (v / max) * h
  const cabeNumero = mostrarValores && coluna >= textoMaior * 6.4 + 4
  const passoRotulo = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(w / 46))))
  const marcas = Array.from({ length: Math.round(max / passo) + 1 }, (_, i) => i * passo)
  const sel = ativo ?? escolhido ?? null
  const p = sel === null ? null : pontos[sel]
  const teclado = (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape', 'Enter', ' '].includes(e.key)) return
    e.preventDefault()
    if (e.key === 'Escape') return definirAtivo(null)
    if ((e.key === 'Enter' || e.key === ' ') && sel !== null) return aoEscolher?.(sel)
    const atual = sel ?? n - 1
    definirAtivo(e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : Math.max(0, Math.min(n - 1, atual + (e.key === 'ArrowLeft' ? -1 : 1))))
  }
  const temPrevisto = pontos.some(x => (x.previsto ?? 0) > 0), temMeta = pontos.some(x => x.meta !== undefined)
  return <div className="hb-torres" ref={caixa}>
    {(series.length > 1 || temPrevisto || temMeta) && <ul className="hb-legenda" aria-hidden="true">
      {series.map(s => <li key={s.nome}><i className={`hb-chave hb-c-${s.cor}`} />{s.nome}</li>)}
      {temPrevisto && <li><i className="hb-chave hb-c-previsto" />{rotuloPrevisto}</li>}
      {temMeta && <li><i className="hb-chave hb-c-meta" />{rotuloMeta}</li>}
    </ul>}
    <div className="hb-torres__area">
      <svg viewBox={`0 0 ${largura} ${altura}`} style={{ height: altura }} role="img" aria-labelledby={id} tabIndex={0} onKeyDown={teclado}
        onPointerLeave={() => definirAtivo(null)} onBlur={() => definirAtivo(null)}>
        <title id={id}>{titulo}. Use as setas para ver cada coluna; os números também estão na tabela abaixo.</title>
        <defs><pattern id={`${id}-h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" className="hb-hachura-fundo" /><line x1="0" y1="0" x2="0" y2="6" className="hb-hachura-linha" /></pattern></defs>
        {marcas.map(v => <g key={v}><line x1={esq} x2={largura - dir} y1={y(v)} y2={y(v)} className={v ? 'hb-grade' : 'hb-base'} /><text x={esq - 8} y={y(v) + 4} textAnchor="end" className="hb-eixo">{curtoV(v)}</text></g>)}
        {pontos.map((pt, i) => {
          let acc = 0
          const x = xc(i) - barra / 2
          const total = real(pt), prev = Math.max(0, pt.previsto ?? 0)
          const segs = pt.partes.map((v, k) => { const de = acc; acc += Math.max(0, v || 0); return { k, de, ate: acc } }).filter(s => s.ate > s.de)
          return <g key={i} className={'hb-coluna' + (sel === i ? ' ativa' : '') + (pt.parcial ? ' parcial' : '') + (aoEscolher ? ' clicavel' : '')}
            onPointerEnter={() => definirAtivo(i)} onPointerDown={() => definirAtivo(i)} onClick={() => aoEscolher?.(i)}>
            <rect x={esq + coluna * i} y={topo} width={coluna} height={h} className="hb-alvo" />
            {segs.map(s => { const y1 = y(s.ate), y0 = y(s.de); const alto = Math.max(0, y0 - y1 - (s.de > 0 ? 2 : 0)); return <rect key={s.k} x={x} y={y1} width={barra} height={Math.max(alto, 1)} rx={Math.min(4, barra / 4)} className={`hb-seg hb-c-${series[s.k]?.cor ?? 'cinza'}`} /> })}
            {prev > 0 && (() => { const y1 = y(total + prev), y0 = y(total) - (total > 0 ? 2 : 0); return <rect x={x} y={y1} width={barra} height={Math.max(1, y0 - y1)} rx={Math.min(4, barra / 4)} fill={`url(#${id}-h)`} className="hb-previsto" /> })()}
            {pt.meta !== undefined && pt.meta > 0 && <line x1={x - 5} x2={x + barra + 5} y1={y(pt.meta)} y2={y(pt.meta)} className="hb-meta" />}
            {cabeNumero && (total + prev > 0) && <text x={xc(i)} y={y(total + prev) - 7} textAnchor="middle" className={'hb-valor' + (sel === i ? ' forte' : '')}>{prev > 0 ? `≈${curtoV(total + prev)}` : curtoV(total)}</text>}
            {(i % passoRotulo === 0 || i === n - 1) && <text x={xc(i)} y={altura - 8} textAnchor="middle" className={'hb-eixo' + (pt.parcial ? ' parcial' : '')}>{pt.curto}</text>}
          </g>
        })}
      </svg>
      {p && sel !== null && <div className="hb-dica" style={{ left: `${Math.min(88, Math.max(12, xc(sel) / largura * 100))}%` }} role="status">
        <b>{p.longo}</b>
        {p.partes.map((v, k) => (series.length > 1 || v > 0) && <span key={k}><i className={`hb-chave hb-c-${series[k]?.cor}`} />{series[k]?.nome}<em>{formato(v)}</em></span>)}
        {(p.previsto ?? 0) > 0 && <span><i className="hb-chave hb-c-previsto" />{rotuloPrevisto}<em>{formato(p.previsto ?? 0)}</em></span>}
        {series.length > 1 && <span className="hb-dica__total">Total{(p.previsto ?? 0) > 0 ? ' até agora' : ''}<em>{formato(real(p))}</em></span>}
        {p.meta !== undefined && <span>{rotuloMeta}<em>{formato(p.meta)}</em></span>}
        {p.nota && <small>{p.nota}</small>}
      </div>}
    </div>
    {rodape}
    <details className="hb-dados"><summary>Ver os números</summary><div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta">
      <caption className="a3-so-leitor">{titulo}</caption>
      <thead><tr><th scope="col">Período</th>{series.map(s => <th key={s.nome} scope="col" className="num">{s.nome}</th>)}{series.length > 1 && <th scope="col" className="num">Total</th>}{temPrevisto && <th scope="col" className="num">{rotuloPrevisto}</th>}{temMeta && <th scope="col" className="num">{rotuloMeta}</th>}</tr></thead>
      <tbody>{pontos.map((pt, i) => <tr key={i}><th scope="row">{pt.longo}</th>{pt.partes.map((v, k) => <td key={k} className="num">{formato(v)}</td>)}{series.length > 1 && <td className="num"><b>{formato(real(pt))}</b></td>}{temPrevisto && <td className="num">{pt.previsto ? formato(pt.previsto) : '—'}</td>}{temMeta && <td className="num">{pt.meta !== undefined ? formato(pt.meta) : '—'}</td>}</tr>)}</tbody>
    </table></div></details>
  </div>
}

/** Barra horizontal de composição (planos, meios): proporções com o número e a porcentagem ao lado. */
export function Composicao({ partes, total, formato = inteiro, rotulo }: { partes: Array<{ nome: string; valor: number; cor: CorSerie; detalhe?: string; aoClicar?: () => void }>; total?: number; formato?: (n: number) => string; rotulo: string }) {
  const soma = total ?? partes.reduce((s, x) => s + x.valor, 0)
  return <div className="hb-comp">
    <div className="hb-comp__barra" role="img" aria-label={`${rotulo}: ${partes.map(x => `${x.nome} ${formato(x.valor)}`).join(', ')}`}>
      {partes.filter(x => x.valor > 0).map(x => <i key={x.nome} className={`hb-c-${x.cor}`} style={{ flexGrow: x.valor }} />)}
      {soma === 0 && <i className="hb-c-vazio" style={{ flexGrow: 1 }} />}
    </div>
    <ul className="hb-comp__lista">{partes.map(x => {
      const conteudo = <><i className={`hb-chave hb-c-${x.cor}`} aria-hidden="true" /><span>{x.nome}{x.detalhe && <small>{x.detalhe}</small>}</span><b>{formato(x.valor)}</b><em>{soma ? `${Math.round(x.valor / soma * 100)}%` : '—'}</em></>
      return <li key={x.nome}>{x.aoClicar ? <button type="button" onClick={x.aoClicar}>{conteudo}</button> : <div>{conteudo}</div>}</li>
    })}</ul>
  </div>
}

/** Variação em pílula: "+12 (+30%)" verde, "−3" vermelho, "igual" neutro. */
export function Variacao({ atual, anterior, formato = inteiro, bom = 'sobe' }: { atual: number; anterior: number; formato?: (n: number) => string; bom?: 'sobe' | 'desce' }) {
  const d = atual - anterior
  if (Math.abs(d) < 1e-9) return <span className="hb-var hb-var--igual">igual</span>
  const pct = anterior > 0 ? Math.round(Math.abs(d) / anterior * 100) : null
  const melhor = bom === 'sobe' ? d > 0 : d < 0
  return <span className={`hb-var ${melhor ? 'hb-var--bom' : 'hb-var--ruim'}`}><span aria-hidden="true">{d > 0 ? '▲' : '▼'}</span> {d > 0 ? '+' : '−'}{formato(Math.abs(d))}{pct !== null && pct < 1000 ? ` (${d > 0 ? '+' : '−'}${pct}%)` : ''}</span>
}

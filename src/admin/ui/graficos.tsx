import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { inteiro } from './formato'
import { SeloQualidade } from './kit'
import type { Qualidade } from '../dados/metricas'

/* ───────────── Moldura ───────────── */

/**
 * Moldura de gráfico: título (a pergunta), descrição, legenda, o gráfico, e no pé a fonte e "Ver dados"
 * com a mesma tabela. `estado` cobre carregando, vazio e erro sem mudar a geometria.
 */
export function Quadro({ titulo, descricao, acoes, legenda, fonte, qualidade, tabela, children, estado, className = '' }: {
  titulo: string; descricao?: ReactNode; acoes?: ReactNode; legenda?: ReactNode; fonte: string; qualidade?: Qualidade
  tabela?: { cabecalho: string[]; linhas: Array<Array<string | number>> } | null
  children?: ReactNode; estado?: ReactNode; className?: string
}) {
  const id = useId()
  return <figure className={`a3-painel ${className}`} aria-labelledby={id} style={{ display: 'flex', flexDirection: 'column' }}>
    <figcaption className="a3-painel__cabeca">
      <div><h2 id={id} className="a3-titulo-3">{titulo}</h2>{descricao && <p>{descricao}</p>}</div>
      {acoes && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{acoes}</div>}
    </figcaption>
    <div className="a3-painel__corpo" style={{ flex: 1, display: 'grid', gap: 14, alignContent: 'start' }}>
      {legenda}
      {estado ?? children}
    </div>
    <footer className="a3-quadro__pe">
      <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{qualidade && <SeloQualidade q={qualidade} />}<span>Fonte: {fonte}</span></span>
      {tabela && tabela.linhas.length > 0 && !estado && <details className="a3-quadro__dados">
        <summary>Ver dados</summary>
        <div className="a3-tabela-caixa"><table className="a3-tabela a3-tabela--compacta">
          <thead><tr>{tabela.cabecalho.map((c, i) => <th key={c} scope="col" className={i ? 'num' : ''}>{c}</th>)}</tr></thead>
          <tbody>{tabela.linhas.map((l, i) => <tr key={i}>{l.map((c, k) => k === 0 ? <th key={k} scope="row" style={{ position: 'static', background: 'none', height: 'auto', fontWeight: 500, color: 'var(--a3-tinta)' }}>{c}</th> : <td key={k} className="num">{c}</td>)}</tr>)}</tbody>
        </table></div>
      </details>}
    </footer>
  </figure>
}

export function Legenda({ itens }: { itens: Array<{ nome: string; chave: 'serie1' | 'serie2' | 'serie3' | 'linha' | 'tracejada' | 'hachura' | 'acento' }> }) {
  const classe = { serie1: '', serie2: ' a3-chave--2', serie3: ' a3-chave--3', linha: ' a3-chave--linha', tracejada: ' a3-chave--tracejada', hachura: ' a3-chave--hachura', acento: ' a3-chave--acento' }
  return <ul className="a3-legenda">{itens.map(i => <li key={i.nome}><i className={'a3-chave' + classe[i.chave]} aria-hidden="true" />{i.nome}</li>)}</ul>
}

/* ───────────── Série temporal ───────────── */

export interface Serie { nome: string; valores: Array<number | null>; tipo: 'barra' | 'area' | 'linha'; estilo?: 1 | 2 | 3 | 'hachura' | 'tracejada' | 'acento' }

function degrau(max: number) {
  const bruto = max / 4
  const p = 10 ** Math.floor(Math.log10(Math.max(bruto, 1e-9)))
  const f = bruto / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}

/**
 * Série temporal: barras (empilháveis), área e linhas sobre o mesmo eixo, sempre começando no zero.
 * Teclado: foco no gráfico e setas, Home e End andam pelos dias; Esc fecha a dica.
 * `rotulos`: longo (dica e tabela) e curto (eixo).
 */
export function SerieTempo({ rotulos, series, formato = inteiro, altura = 220, descricao }: {
  rotulos: Array<{ longo: string; curto: string }>; series: Serie[]; formato?: (n: number) => string; altura?: number; descricao: string
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, definirLargura] = useState(300)
  const [ativo, definirAtivo] = useState<number | null>(null)
  const [teclado, definirTeclado] = useState(false)
  const idH = useId().replace(/:/g, '')
  useLayoutEffect(() => {
    const el = caixa.current
    if (!el) return
    const medir = () => definirLargura(Math.max(260, Math.round(el.getBoundingClientRect().width)))
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const n = rotulos.length
  const esq = 40, dir = 6, topo = 8, baixo = 24
  const w = largura - esq - dir, h = altura - topo - baixo
  const barras = series.filter(s => s.tipo === 'barra')
  const outras = series.filter(s => s.tipo !== 'barra')
  const somaBarras = (i: number) => barras.reduce((s, b) => s + (b.valores[i] ?? 0), 0)
  const maxBruto = Math.max(1, ...Array.from({ length: n }, (_, i) => somaBarras(i)), ...outras.flatMap(s => s.valores.map(v => v ?? 0)))
  const passo = degrau(maxBruto)
  const max = Math.ceil(maxBruto / passo) * passo
  const y = (v: number) => topo + h - (v / max) * h
  const coluna = w / Math.max(n, 1)
  const xc = (i: number) => esq + i * coluna + coluna / 2
  const marcas = Array.from({ length: Math.round(max / passo) + 1 }, (_, k) => k * passo)
  const passoX = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 64))))
  const larguraBarra = Math.max(1.5, Math.min(coluna * 0.62, 28))

  function tecla(e: KeyboardEvent<SVGSVGElement>) {
    const atual = ativo ?? n - 1
    const destino = e.key === 'ArrowRight' ? Math.min(n - 1, atual + 1) : e.key === 'ArrowLeft' ? Math.max(0, atual - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null
    if (destino === null) { if (e.key === 'Escape') definirAtivo(null); return }
    e.preventDefault(); definirTeclado(true); definirAtivo(destino)
  }
  function mover(e: PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - r.left - esq) / coluna)
    definirTeclado(false)
    definirAtivo(i >= 0 && i < n ? i : null)
  }
  const caminho = (valores: Array<number | null>) => {
    let d = '', aberto = false
    valores.forEach((v, i) => { if (v === null) { aberto = false; return } d += `${aberto ? 'L' : 'M'}${xc(i).toFixed(1)} ${y(v).toFixed(1)} `; aberto = true })
    return d
  }
  const dicaX = ativo !== null ? Math.min(Math.max(xc(ativo), 90), largura - 90) : 0

  return <div className="a3-grafico" ref={caixa}>
    <svg width={largura} style={{ maxWidth: '100%' }} height={altura} role="img" aria-label={descricao} tabIndex={0} onKeyDown={tecla} onPointerMove={mover}
      onPointerLeave={() => !teclado && definirAtivo(null)} onFocus={() => { definirTeclado(true); definirAtivo(a => a ?? n - 1) }} onBlur={() => definirAtivo(null)}>
      <defs><pattern id={`a3-h-${idH}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="5" className="a3-g-hachura-fundo" /><line x1="0" y1="0" x2="0" y2="5" className="a3-g-hachura-linha" />
      </pattern></defs>
      {marcas.map(v => <g key={v}>
        <line x1={esq} x2={largura - dir} y1={y(v)} y2={y(v)} className={v === 0 ? 'a3-g-base' : 'a3-g-grade'} strokeDasharray={v === 0 ? undefined : '2 4'} />
        <text x={esq - 8} y={y(v) + 4} textAnchor="end" className="a3-g-eixo">{v >= 1000 && formato === inteiro ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : formato(v).replace(/,00$/, '')}</text>
      </g>)}
      {barras.length > 0 && Array.from({ length: n }, (_, i) => {
        let acumulado = 0
        return <g key={i} opacity={ativo !== null && ativo !== i ? 0.45 : 1}>{barras.map(b => {
          const v = b.valores[i] ?? 0
          if (v <= 0) return null
          const y0 = y(acumulado + v), alt = y(acumulado) - y0
          acumulado += v
          const estilo = b.estilo === 'hachura' ? '' : b.estilo === 2 ? ' a3-g-barra--2' : b.estilo === 3 ? ' a3-g-barra--3' : ''
          return <rect key={b.nome} x={xc(i) - larguraBarra / 2} width={larguraBarra} y={y0} height={Math.max(0.6, alt)} rx={Math.min(4, larguraBarra / 3)}
            className={'a3-g-barra' + estilo} fill={b.estilo === 'hachura' ? `url(#a3-h-${idH})` : undefined} />
        })}</g>
      })}
      {outras.map(s => {
        const d = caminho(s.valores)
        if (s.tipo === 'area') {
          const primeiro = s.valores.findIndex(v => v !== null), ultimo = s.valores.length - 1 - [...s.valores].reverse().findIndex(v => v !== null)
          return <g key={s.nome}>{primeiro >= 0 && <path className="a3-g-area" d={`${d} L${xc(ultimo)} ${y(0)} L${xc(primeiro)} ${y(0)} Z`} />}<path className="a3-g-linha" d={d} /></g>
        }
        return <path key={s.nome} className={'a3-g-linha' + (s.estilo === 'tracejada' ? ' a3-g-linha--b' : s.estilo === 'acento' ? ' a3-g-linha--acento' : '')} d={d} />
      })}
      {Array.from({ length: n }, (_, i) => i).filter(i => i % passoX === 0 || i === n - 1).filter((i, k, l) => !(k === l.length - 2 && n - 1 - i < passoX * 0.6)).map(i =>
        <text key={i} x={xc(i)} y={altura - 6} textAnchor="middle" className="a3-g-eixo">{rotulos[i]?.curto}</text>)}
      {ativo !== null && <>
        <line x1={xc(ativo)} x2={xc(ativo)} y1={topo} y2={topo + h} className="a3-g-cursor" />
        {outras.map(s => s.valores[ativo] !== null && s.valores[ativo] !== undefined && <circle key={s.nome} cx={xc(ativo)} cy={y(s.valores[ativo] as number)} r={3.5} className="a3-g-ponto" />)}
      </>}
    </svg>
    {ativo !== null && rotulos[ativo] && <div className="a3-dica" style={{ left: dicaX, top: -6 }} role={teclado ? 'status' : undefined}>
      <b>{rotulos[ativo].longo}</b>
      {series.map(s => <span key={s.nome}>{s.nome}<strong>{s.valores[ativo] === null || s.valores[ativo] === undefined ? 'sem dado' : formato(s.valores[ativo] as number)}</strong></span>)}
    </div>}
  </div>
}

/* ───────────── Funil ───────────── */

/**
 * Funil em degraus: cada etapa com a contagem, a largura relativa ao topo e a taxa sobre a etapa
 * anterior. A etapa com a maior queda fica marcada (onde agir). O denominador é sempre explícito.
 */
export function Funil({ etapas }: { etapas: Array<{ nome: string; valor: number; base?: string; sobre?: number }> }) {
  const topo = Math.max(1, etapas[0]?.valor ?? 1)
  // A taxa é sobre a etapa anterior, ou sobre a etapa `sobre` quando a anterior não é pré-requisito.
  const taxas = etapas.map((e, i) => { const d = i ? etapas[e.sobre ?? i - 1].valor : 0; return i && d > 0 ? e.valor / d : null })
  const pior = taxas.reduce<number | null>((m, t, i) => t !== null && t <= 1 && (m === null || t < (taxas[m] ?? 1)) ? i : m, null)
  return <ol className="a3-funil">
    {etapas.map((e, i) => <li key={e.nome} className="a3-funil__etapa">
      <span className="a3-funil__nome">{e.nome}{e.base && <span className="a3-funil__base">sobre {e.base}</span>}</span>
      <span className="a3-funil__trilho" aria-hidden="true"><span style={{ width: `${Math.max(0.6, (e.valor / topo) * 100)}%` }} /></span>
      <span className="a3-funil__valor">{inteiro(e.valor)}</span>
      <span className={'a3-funil__taxa' + (i === pior ? ' a3-funil__taxa--pior' : '')}>
        {taxas[i] === null ? '100%' : `${Math.round((taxas[i] as number) * 100)}%`}{i === pior && <span className="a3-so-leitor"> (maior queda)</span>}
      </span>
    </li>)}
  </ol>
}

/* ───────────── Mapa de calor ───────────── */

/**
 * Tabela em mapa de calor: cada célula com o número escrito (a cor só reforça). `valor` em 0..1
 * para a intensidade; `texto` é o que se lê. Linhas sem base (denominador zero) ficam vazias.
 */
export function MapaCalor({ colunas, linhas, rotuloLinha, extra }: {
  colunas: string[]; rotuloLinha: string
  linhas: Array<{ nome: string; extra?: string; celulas: Array<{ intensidade: number | null; texto: string; titulo?: string }> }>
  extra?: string
}) {
  return <div className="a3-tabela-caixa" style={{ borderTop: 0 }} role="region" aria-label={rotuloLinha} tabIndex={0}>
    <table className="a3-calor">
      <thead><tr><th scope="col">{rotuloLinha}</th>{extra && <th scope="col" style={{ textAlign: 'right' }}>{extra}</th>}{colunas.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
      <tbody>{linhas.map(l => <tr key={l.nome}>
        <th scope="row">{l.nome}</th>
        {extra && <td className="n">{l.extra}</td>}
        {l.celulas.map((c, i) => c.intensidade === null
          ? <td key={i} className="vazio" title={c.titulo}>{c.texto}</td>
          : <td key={i} title={c.titulo} style={{ background: `color-mix(in srgb, var(--a3-tinta) ${Math.round(6 + c.intensidade * 84)}%, var(--a3-papel))`, color: c.intensidade > 0.48 ? 'var(--a3-sobre-tinta)' : 'var(--a3-tinta)' }}>{c.texto}</td>)}
      </tr>)}</tbody>
    </table>
  </div>
}

/* ───────────── Composição ───────────── */

const TONS = ['var(--a3-serie-1)', 'var(--a3-serie-2)', 'var(--a3-serie-3)', 'var(--a3-acento)', 'var(--a3-ouro)', 'var(--a3-linha-2)']

/** Composição de um todo: uma barra de 100% e a lista com valor e parte. Até 6 partes (o resto vira "outros"). */
export function Composicao({ partes, formato = inteiro }: { partes: Array<{ nome: string; valor: number; hachura?: boolean }>; formato?: (n: number) => string }) {
  const total = partes.reduce((s, p) => s + p.valor, 0)
  if (!total) return <p className="a3-mudo">Nada no período.</p>
  const ordenadas = [...partes].sort((a, b) => b.valor - a.valor)
  const vis = ordenadas.length > 6 ? [...ordenadas.slice(0, 5), { nome: 'Outros', valor: ordenadas.slice(5).reduce((s, p) => s + p.valor, 0) }] : ordenadas
  const fundo = (p: { hachura?: boolean }, i: number) => p.hachura ? 'repeating-linear-gradient(135deg, var(--a3-aviso) 0 2px, var(--a3-aviso-veu) 2px 5px)' : TONS[i % TONS.length]
  return <div className="a3-comp">
    <div className="a3-comp__barra" aria-hidden="true">{vis.map((p, i) => <span key={p.nome} style={{ width: `${(p.valor / total) * 100}%`, background: fundo(p, i) }} />)}</div>
    <ul>{vis.map((p, i) => <li key={p.nome}>
      <i className="a3-chave" style={{ background: fundo(p, i) }} aria-hidden="true" />
      <span>{p.nome}</span><b>{formato(p.valor)}</b><small>{Math.round((p.valor / total) * 100)}%</small>
    </li>)}</ul>
  </div>
}

/** Ranking com trilho fino ("top N"), relativo ao maior. */
export function Ranking({ itens, formato = inteiro }: { itens: Array<{ nome: string; valor: number; detalhe?: string }>; formato?: (n: number) => string }) {
  const max = Math.max(1, ...itens.map(i => i.valor))
  if (!itens.length) return <p className="a3-mudo">Sem dados.</p>
  return <ul className="a3-rank">{itens.map(i => <li key={i.nome}>
    <span title={i.nome}>{i.nome}{i.detalhe && <span className="a3-mudo"> · {i.detalhe}</span>}</span><b>{formato(i.valor)}</b>
    <i style={{ '--p': `${(i.valor / max) * 100}%` } as React.CSSProperties} aria-hidden="true" />
  </li>)}</ul>
}

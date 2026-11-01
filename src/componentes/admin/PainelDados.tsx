import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Icone } from '../Icone'
import { METRICAS, ROTULO_QUALIDADE, type IdMetrica, type Qualidade, type Variacao } from './metricas'
import { PERIODOS, type Periodo } from './secoes'

/**
 * Gramática de dados da Mesa de Comando (01/11/2026): indicador com estado de qualidade e comparação,
 * seletor de período, moldura de gráfico com pergunta, legenda, fonte e "Ver dados" (tabela com os mesmos
 * números), e o gráfico de série temporal navegável por teclado, toque e ponteiro.
 */

export const inteiro = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
export const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const reaisCurto = (v: number) => v >= 10_000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : reais(v)

/** Selo do estado do dado. Confirmado é discreto; o resto chama atenção na medida certa. */
export function SeloQualidade({ qualidade, compacto = false }: { qualidade: Qualidade; compacto?: boolean }) {
  return <span className={`adm-q adm-q--${qualidade}${compacto ? ' adm-q--compacto' : ''}`}>
    <i aria-hidden="true" />{ROTULO_QUALIDADE[qualidade]}
  </span>
}

/** "▲ 12% sobre os 30 dias anteriores (1.204)". Cor só quando há sentido de bom/ruim; sem base, diz isso. */
export function Mudanca({ v, bom = 'sobe', formato = inteiro, base }: { v: Variacao; bom?: 'sobe' | 'desce'; formato?: (n: number) => string; base: string }) {
  if (v.anterior === null || v.delta === null) return <small className="adm-mudanca adm-mudanca--sem">sem período anterior para comparar</small>
  const sentido = v.delta > 0 ? 'sobe' : v.delta < 0 ? 'desce' : 'igual'
  const tom = sentido === 'igual' ? 'igual' : sentido === bom ? 'bom' : 'ruim'
  const quanto = sentido === 'igual' ? 'igual a' : v.pct !== null ? `${v.pct > 0 ? '+' : ''}${v.pct}% sobre` : `${v.delta > 0 ? '+' : '−'}${formato(Math.abs(v.delta))} sobre`
  return <small className={`adm-mudanca adm-mudanca--${tom}`}>
    <b aria-hidden="true">{sentido === 'sobe' ? '▲' : sentido === 'desce' ? '▼' : '='}</b> {quanto} {base} ({formato(v.anterior)})
  </small>
}

/** Minigráfico de linha (tendência dentro do indicador). Decorativo: o número e a comparação dizem o mesmo em texto. */
export function Minigrafico({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null
  const max = Math.max(...valores, 1)
  const pts = valores.map((v, i) => `${(i / (valores.length - 1)) * 100},${28 - (v / max) * 26}`).join(' ')
  return <svg className="adm-mini-grafico" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <polyline points={`0,30 ${pts} 100,30`} className="adm-mini-grafico__area" />
    <polyline points={pts} className="adm-mini-grafico__linha" vectorEffect="non-scaling-stroke" />
  </svg>
}

/**
 * Indicador: rótulo, valor, estado de qualidade, comparação, nota e a definição (pergunta, fonte, janela).
 * Valor null = indisponível (nunca zero). Com `destino`, ganha o "Investigar" que leva à lista/registro.
 */
export function Indicador({ metrica, valor, qualidade, variacao, base, formato = inteiro, nota, tendencia, destino, escala = 'normal' }: {
  metrica: IdMetrica; valor: string | null; qualidade?: Qualidade; variacao?: Variacao | null; base?: string
  formato?: (n: number) => string; nota?: ReactNode; tendencia?: number[]; destino?: { rotulo: string; aoAbrir: () => void }; escala?: 'normal' | 'grande'
}) {
  const def = METRICAS[metrica]
  const q: Qualidade = valor === null ? 'indisponivel' : qualidade ?? def.qualidade
  const idDef = useId()
  const [aberta, definirAberta] = useState(false)
  return <article className={`adm-ind adm-ind--${escala}${valor === null ? ' adm-ind--indisponivel' : ''}`} aria-label={def.nome}>
    <header className="adm-ind__cabeca">
      <h3>{def.nome}</h3>
      <button type="button" className="adm-ind__def-botao" aria-expanded={aberta} aria-controls={idDef} onClick={() => definirAberta(a => !a)}>
        <Icone nome="interrogacao" tamanho={14} /><span className="so-leitor">Como este número é calculado</span>
      </button>
    </header>
    <p className="adm-ind__valor numerico">{valor ?? 'Indisponível'}</p>
    <div className="adm-ind__linha">
      <SeloQualidade qualidade={q} compacto />
      {variacao && base && valor !== null && <Mudanca v={variacao} bom={def.bom} formato={formato} base={base} />}
    </div>
    {nota && <p className="adm-ind__nota">{nota}</p>}
    {tendencia && valor !== null && <Minigrafico valores={tendencia} />}
    {aberta && <dl className="adm-ind__def" id={idDef}>
      <div><dt>Pergunta</dt><dd>{def.pergunta}</dd></div>
      <div><dt>Conta</dt><dd>{def.numerador}{'denominador' in def && def.denominador ? ` ÷ ${def.denominador}` : ''}</dd></div>
      <div><dt>Janela</dt><dd>{def.janela}</dd></div>
      <div><dt>Fonte</dt><dd>{def.fonte}</dd></div>
      <div><dt>Contas de teste</dt><dd>{def.testes}</dd></div>
    </dl>}
    {destino && <button type="button" className="adm-ind__ir" onClick={destino.aoAbrir}>{destino.rotulo} <Icone nome="direita" tamanho={14} /></button>}
  </article>
}

/** Seletor de período (7, 30, 90 dias), sempre comparado com o mesmo número de dias logo antes. */
export function ControlePeriodo({ periodo, aoMudar }: { periodo: Periodo; aoMudar: (p: Periodo) => void }) {
  return <div className="seletor adm-periodo" role="group" aria-label="Período, comparado com o período anterior do mesmo tamanho">
    {PERIODOS.map(p => <button key={p} type="button" aria-pressed={periodo === p} onClick={() => aoMudar(p)}>{p} dias</button>)}
  </div>
}

/* ───────────────────────── Gráfico de série ───────────────────────── */

export interface SerieGrafico {
  id: string
  nome: string
  /** a: série principal (verdete); b: período anterior (tracejado); c: reconstruído (hachurado). */
  estilo: 'a' | 'b' | 'c'
  valores: Array<number | null>
}

/**
 * Série temporal: barras (uma série, ou empilhadas) com até uma linha de comparação. Eixo Y começa no zero.
 * Teclado: foco no gráfico e setas/Home/End andam pelos dias; a dica mostra todas as séries daquele dia.
 * Os rótulos têm a versão longa (dica, tabela) e curta (eixo).
 */
export function GraficoSerie({ rotulos, barras, linha, formato = inteiro, altura = 200, rotulo }: {
  rotulos: Array<{ longo: string; curto: string }>; barras: SerieGrafico[]; linha?: SerieGrafico | null
  formato?: (n: number) => string; altura?: number; rotulo: string
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, definirLargura] = useState(640)
  const [ativo, definirAtivo] = useState<number | null>(null)
  const [peloTeclado, definirPeloTeclado] = useState(false)
  const idPadrao = useId().replace(/:/g, '')
  useLayoutEffect(() => {
    const el = caixa.current
    if (!el) return
    const medir = () => definirLargura(Math.max(240, Math.round(el.getBoundingClientRect().width)))
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const n = rotulos.length
  const esq = 44, dir = 8, topo = 10, baixo = 24
  const w = largura - esq - dir, h = altura - topo - baixo
  const somaDia = (i: number) => barras.reduce((s, b) => s + (b.valores[i] ?? 0), 0)
  const maxBruto = Math.max(1, ...Array.from({ length: n }, (_, i) => somaDia(i)), ...(linha?.valores.map(v => v ?? 0) ?? []))
  const passo = degrau(maxBruto)
  const max = Math.ceil(maxBruto / passo) * passo
  const y = (v: number) => topo + h - (v / max) * h
  const larguraBarra = w / Math.max(n, 1)
  const xDe = (i: number) => esq + i * larguraBarra
  const marcas = Array.from({ length: Math.floor(max / passo) + 1 }, (_, k) => k * passo).filter((_, k, l) => l.length <= 5 || k % Math.ceil(l.length / 4) === 0 || k === l.length - 1)
  const indicesX = n <= 1 ? [0] : n <= 8 ? rotulos.map((_, i) => i) : [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1]

  function tecla(e: KeyboardEvent<SVGSVGElement>) {
    const atual = ativo ?? n - 1
    const destino = e.key === 'ArrowRight' ? Math.min(n - 1, atual + 1) : e.key === 'ArrowLeft' ? Math.max(0, atual - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null
    if (destino === null) { if (e.key === 'Escape') definirAtivo(null); return }
    e.preventDefault(); definirPeloTeclado(true); definirAtivo(destino)
  }
  function ponteiro(e: PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - r.left - esq) / larguraBarra)
    definirPeloTeclado(false)
    definirAtivo(i >= 0 && i < n ? i : null)
  }
  const dica = ativo !== null && ativo < n ? ativo : null
  const xDica = dica !== null ? Math.min(Math.max(xDe(dica) + larguraBarra / 2, 90), largura - 90) : 0

  return <div className="adm-serie" ref={caixa}>
    <svg width={largura} height={altura} role="img" aria-label={rotulo} tabIndex={0} onKeyDown={tecla} onPointerMove={ponteiro} onPointerLeave={() => !peloTeclado && definirAtivo(null)}
      onFocus={() => { definirPeloTeclado(true); definirAtivo(a => a ?? n - 1) }} onBlur={() => definirAtivo(null)}>
      <defs>
        <pattern id={`hachura-${idPadrao}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" className="adm-serie__hachura-fundo" /><line x1="0" y1="0" x2="0" y2="6" className="adm-serie__hachura-linha" />
        </pattern>
      </defs>
      {marcas.map(v => <g key={v}>
        <line x1={esq} x2={largura - dir} y1={y(v)} y2={y(v)} className={v === 0 ? 'adm-serie__base' : 'adm-serie__grade'} />
        <text x={esq - 6} y={y(v) + 4} textAnchor="end" className="adm-serie__eixo">{formatoEixo(v, formato)}</text>
      </g>)}
      {Array.from({ length: n }, (_, i) => {
        let acumulado = 0
        return <g key={i} className={dica === i ? 'adm-serie__dia adm-serie__dia--ativo' : 'adm-serie__dia'}>
          {barras.map(b => {
            const v = b.valores[i] ?? 0
            if (v <= 0) return null
            const y0 = y(acumulado + v), alt = y(acumulado) - y0
            acumulado += v
            return <rect key={b.id} x={xDe(i) + Math.max(1, larguraBarra * 0.14)} width={Math.max(1, larguraBarra * 0.72)} y={y0} height={Math.max(0.5, alt)}
              className={`adm-serie__barra adm-serie__barra--${b.estilo}`} fill={b.estilo === 'c' ? `url(#hachura-${idPadrao})` : undefined} rx={Math.min(3, larguraBarra * 0.2)} />
          })}
        </g>
      })}
      {linha && <polyline className={`adm-serie__linha adm-serie__linha--${linha.estilo}`} fill="none"
        points={linha.valores.map((v, i) => v === null ? null : `${xDe(i) + larguraBarra / 2},${y(v)}`).filter(Boolean).join(' ')} />}
      {indicesX.map(i => <text key={i} x={Math.min(Math.max(xDe(i) + larguraBarra / 2, esq + 14), largura - dir - 14)} y={altura - 6} textAnchor="middle" className="adm-serie__eixo">{rotulos[i]?.curto}</text>)}
      {dica !== null && <line x1={xDe(dica) + larguraBarra / 2} x2={xDe(dica) + larguraBarra / 2} y1={topo} y2={topo + h} className="adm-serie__cursor" />}
    </svg>
    {dica !== null && <div className="adm-serie__dica" style={{ left: xDica }} role={peloTeclado ? 'status' : undefined}>
      <strong>{rotulos[dica].longo}</strong>
      {[...barras, ...(linha ? [linha] : [])].map(s => <span key={s.id}><i className={`adm-serie__chave adm-serie__chave--${s.estilo}`} aria-hidden="true" />{s.nome}: <b>{s.valores[dica] === null ? 'sem dado' : formato(s.valores[dica] ?? 0)}</b></span>)}
    </div>}
  </div>
}

/** Passo "bonito" para a grade do eixo (1, 2, 5 × 10ⁿ). */
function degrau(max: number) {
  const bruto = max / 4
  const p = 10 ** Math.floor(Math.log10(bruto))
  const f = bruto / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}
function formatoEixo(v: number, formato: (n: number) => string) {
  if (v >= 1000 && formato === inteiro) return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  const t = formato(v)
  return t.replace(/,00$/, '')
}

/** Legenda junto do gráfico: cor + padrão + nome (a cor nunca é a única pista). */
export function Legenda({ series }: { series: Array<Pick<SerieGrafico, 'id' | 'nome' | 'estilo'>> }) {
  return <ul className="adm-legenda">{series.map(s => <li key={s.id}><i className={`adm-serie__chave adm-serie__chave--${s.estilo}`} aria-hidden="true" />{s.nome}</li>)}</ul>
}

/**
 * Moldura de gráfico: pergunta (título), estado e fonte; o gráfico; "Ver dados" com a mesma tabela.
 * `estado` cobre carregando, vazio, erro e dado antigo sem trocar a geometria (sem cintilar).
 */
export function QuadroGrafico({ titulo, pergunta, fonte, qualidade, legenda, tabela, estado, children, acoes }: {
  titulo: string; pergunta: string; fonte: string; qualidade?: Qualidade; legenda?: ReactNode
  tabela?: { cabecalho: string[]; linhas: Array<Array<string | number>> } | null
  estado?: { tipo: 'carregando' | 'vazio' | 'erro'; texto: string; tentar?: () => void } | null
  children?: ReactNode; acoes?: ReactNode
}) {
  const idTitulo = useId()
  return <figure className="adm-quadro" aria-labelledby={idTitulo}>
    <figcaption className="adm-quadro__cabeca">
      <div>
        <h3 id={idTitulo}>{titulo}</h3>
        <p>{pergunta}</p>
      </div>
      <div className="adm-quadro__meta">{qualidade && <SeloQualidade qualidade={qualidade} compacto />}{acoes}</div>
    </figcaption>
    {legenda}
    <div className="adm-quadro__corpo">
      {estado ? <div className={`adm-quadro__estado adm-quadro__estado--${estado.tipo}`} role={estado.tipo === 'erro' ? 'alert' : 'status'}>
        <p>{estado.texto}</p>{estado.tentar && <button type="button" className="botao botao--fantasma" onClick={estado.tentar}>Tentar novamente</button>}
      </div> : children}
    </div>
    <footer className="adm-quadro__pe">
      <small>Fonte: {fonte}</small>
      {tabela && tabela.linhas.length > 0 && !estado && <details className="adm-quadro__dados">
        <summary>Ver dados</summary>
        <div className="adm-tabela-rolagem"><table className="tabela adm-quadro__tabela">
          <thead><tr>{tabela.cabecalho.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{tabela.linhas.map((l, i) => <tr key={i}>{l.map((c, k) => k === 0 ? <th key={k} scope="row">{c}</th> : <td key={k} className="numerico">{c}</td>)}</tr>)}</tbody>
        </table></div>
      </details>}
    </footer>
  </figure>
}

/** "Atualizado às 14:32 (há 2 min)", refeito a cada 30 s. */
export function Atualizado({ em, carregando }: { em: number | null; carregando?: boolean }) {
  const [, tique] = useState(0)
  useEffect(() => { const t = window.setInterval(() => tique(k => k + 1), 30_000); return () => window.clearInterval(t) }, [])
  if (carregando && !em) return <span className="adm-atualizado">Carregando…</span>
  if (!em) return <span className="adm-atualizado">Ainda sem dados</span>
  const min = Math.floor((Date.now() - em) / 60_000)
  const hora = new Date(em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return <span className="adm-atualizado">{carregando ? 'Atualizando… ' : ''}Atualizado às <time dateTime={new Date(em).toISOString()}>{hora}</time>{min >= 1 ? ` (há ${min} min)` : ''}</span>
}

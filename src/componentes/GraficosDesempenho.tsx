import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

/*
 * Gráficos da página de desempenho (refeita em 18/10/2026, skill dataviz).
 * Uma série por gráfico, um tom só (--ds-serie), barra no máximo 24 px com a
 * ponta arredondada e a base reta, 2 px de folga entre barras, grade em traço
 * fino e sólido. Cada gráfico mostra o valor do ponto sob o cursor (ou sob o
 * foco do teclado, com as setas) numa legenda fixa embaixo, e tem uma tabela
 * equivalente na própria página: o valor nunca depende só da cor ou do hover.
 * O SVG é desenhado na largura real do cartão, para o texto não encolher no celular.
 */

function usarLargura<T extends HTMLElement>(inicial: number) {
  const ref = useRef<T>(null)
  const [largura, definir] = useState(inicial)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => definir(Math.max(240, Math.round(el.getBoundingClientRect().width)))
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, largura] as const
}

/** Teto "redondo" do eixo: 1, 2, 2,5 ou 5 vezes uma potência de 10. */
function tetoRedondo(maior: number) {
  if (maior <= 4) return 4
  const base = 10 ** Math.floor(Math.log10(maior))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * base >= maior) return m * base
  return 10 * base
}

function setas(e: KeyboardEvent, atual: number, total: number, definir: (i: number) => void) {
  const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  if (e.key === 'Home') { e.preventDefault(); definir(0); return }
  if (e.key === 'End') { e.preventDefault(); definir(total - 1); return }
  if (!passo) return
  e.preventDefault()
  definir(Math.min(total - 1, Math.max(0, atual + passo)))
}

/** Barra vertical com a ponta de cima arredondada (4 px) e a base reta. */
function colunaPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return ''
  const r = Math.min(4, w / 2, h)
  return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`
}

export interface Coluna {
  chave: string
  valor: number
  /** Texto do eixo x (vazio para não rotular). */
  eixo: string
  /** Segunda linha do eixo x (ex.: acerto do dia). */
  eixo2?: string
  /** Frase completa para a legenda e o leitor de tela. */
  descricao: string
  /** Ponto em destaque (ex.: hoje), na cor de ênfase. */
  destaque?: boolean
  /** Fora do período escolhido: desenhado apagado. */
  apagada?: boolean
}

export function GraficoColunas({ colunas, rotulo, valorNoTopo = false, altura = 132, padrao }: {
  colunas: Coluna[]
  rotulo: string
  valorNoTopo?: boolean
  altura?: number
  /** Índice mostrado na legenda quando nada está sob o cursor. */
  padrao?: number
}) {
  const [ref, larg] = usarLargura<HTMLDivElement>(640)
  const [ativo, definirAtivo] = useState<number | null>(null)
  const maior = Math.max(0, ...colunas.map((c) => c.valor))
  const teto = tetoRedondo(maior)
  const E = 30
  const D = 4
  const T = valorNoTopo ? 20 : 10
  const eixoAlt = colunas.some((c) => c.eixo2) ? 40 : 24
  const plotW = larg - E - D
  const total = T + altura + eixoAlt
  const fatia = plotW / colunas.length
  const barra = Math.max(3, Math.min(24, fatia - Math.max(2, fatia * 0.32)))
  const y = (v: number) => T + altura - (v / teto) * altura
  const mostrado = ativo ?? padrao ?? colunas.length - 1
  const atual = colunas[mostrado]

  return (
    <figure className="ds-grafico" ref={ref}>
      <div
        className="ds-grafico__area"
        tabIndex={0}
        role="group"
        aria-label={`${rotulo}. Use as setas para percorrer.`}
        onKeyDown={(e) => setas(e, mostrado, colunas.length, definirAtivo)}
        onBlur={() => definirAtivo(null)}
      >
        <svg width={larg} height={total} viewBox={`0 0 ${larg} ${total}`} aria-hidden="true" onMouseLeave={() => definirAtivo(null)}>
          {[0, teto / 2, teto].map((v) => (
            <g key={v}>
              <line x1={E} x2={larg - D} y1={y(v)} y2={y(v)} className={v === 0 ? 'ds-grafico__base' : 'ds-grafico__grade'} />
              <text x={E - 6} y={y(v) + 4} textAnchor="end" className="ds-grafico__tique">{v.toLocaleString('pt-BR')}</text>
            </g>
          ))}
          <rect x={E + mostrado * fatia} y={T} width={fatia} height={altura} className="ds-grafico__faixa" />
          {colunas.map((c, i) => {
            const h = c.valor ? Math.max(2, altura - (y(c.valor) - T)) : 0
            const x = E + i * fatia + (fatia - barra) / 2
            const classe = 'ds-grafico__coluna' + (c.destaque ? ' ds-grafico__coluna--destaque' : '') + (c.apagada ? ' ds-grafico__coluna--apagada' : '')
            return (
              <g key={c.chave}>
                <path d={colunaPath(x, T + altura - h, barra, h)} className={classe} />
                {valorNoTopo && <text x={x + barra / 2} y={T + altura - h - 6} textAnchor="middle" className="ds-grafico__valor">{c.valor.toLocaleString('pt-BR')}</text>}
                {c.eixo && <text x={x + barra / 2} y={T + altura + 16} textAnchor="middle" className={'ds-grafico__tique' + (i === mostrado ? ' ds-grafico__tique--ativo' : '')}>{c.eixo}</text>}
                {c.eixo2 && <text x={x + barra / 2} y={T + altura + 33} textAnchor="middle" className="ds-grafico__tique ds-grafico__tique--forte">{c.eixo2}</text>}
                {/* Alvo do ponteiro: a fatia inteira, não a barra fina. */}
                <rect x={E + i * fatia} y={0} width={fatia} height={total} fill="transparent" onMouseEnter={() => definirAtivo(i)} />
              </g>
            )
          })}
        </svg>
      </div>
      <figcaption className="ds-grafico__leitura" aria-live="polite">{atual?.descricao}</figcaption>
    </figure>
  )
}

export interface Ponto {
  chave: string
  /** Porcentagem de 0 a 100, ou null quando não houve resposta. */
  valor: number | null
  eixo: string
  descricao: string
}

/** Linha de porcentagem (0–100 %) com buracos onde não houve resposta. */
export function GraficoLinha({ pontos, rotulo, altura = 150 }: { pontos: Ponto[]; rotulo: string; altura?: number }) {
  const [ref, larg] = usarLargura<HTMLDivElement>(560)
  const [ativo, definirAtivo] = useState<number | null>(null)
  const E = 38
  const D = 26
  const T = 14
  const eixoAlt = 26
  const plotW = larg - E - D
  const total = T + altura + eixoAlt
  const x = (i: number) => E + (pontos.length === 1 ? plotW / 2 : (i * plotW) / (pontos.length - 1))
  const y = (v: number) => T + altura - (v / 100) * altura
  const ultimoComValor = pontos.reduce((u, p, i) => (p.valor === null ? u : i), -1)
  const mostrado = ativo ?? (ultimoComValor >= 0 ? ultimoComValor : pontos.length - 1)

  // Trechos contínuos: uma semana sem respostas quebra a linha, em vez de inventar um valor.
  const trechos: string[] = []
  let atual = ''
  pontos.forEach((p, i) => {
    if (p.valor === null) { if (atual) trechos.push(atual); atual = ''; return }
    atual += `${atual ? 'L' : 'M'}${x(i)} ${y(p.valor)}`
  })
  if (atual) trechos.push(atual)
  const passoEixo = larg < 420 ? 2 : 1

  return (
    <figure className="ds-grafico" ref={ref}>
      <div
        className="ds-grafico__area"
        tabIndex={0}
        role="group"
        aria-label={`${rotulo}. Use as setas para percorrer.`}
        onKeyDown={(e) => setas(e, mostrado, pontos.length, definirAtivo)}
        onBlur={() => definirAtivo(null)}
      >
        <svg width={larg} height={total} viewBox={`0 0 ${larg} ${total}`} aria-hidden="true" onMouseLeave={() => definirAtivo(null)}>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={E} x2={larg - D} y1={y(v)} y2={y(v)} className={v === 0 ? 'ds-grafico__base' : 'ds-grafico__grade'} />
              <text x={E - 6} y={y(v) + 4} textAnchor="end" className="ds-grafico__tique">{v}%</text>
            </g>
          ))}
          <line x1={x(mostrado)} x2={x(mostrado)} y1={T} y2={T + altura} className="ds-grafico__mira" />
          {trechos.map((d) => <path key={d} d={d} className="ds-grafico__linha" />)}
          {pontos.map((p, i) => (
            <g key={p.chave}>
              {p.valor !== null && <circle cx={x(i)} cy={y(p.valor)} r={i === mostrado ? 5.5 : 4} className={'ds-grafico__ponto' + (i === mostrado ? ' ds-grafico__ponto--ativo' : '')} />}
              {i === ultimoComValor && p.valor !== null && <text x={x(i)} y={y(p.valor) - 10} textAnchor="middle" className="ds-grafico__valor">{p.valor}%</text>}
              {(i % passoEixo === (pontos.length - 1) % passoEixo) && <text x={x(i)} y={T + altura + 18} textAnchor="middle" className={'ds-grafico__tique' + (i === mostrado ? ' ds-grafico__tique--ativo' : '')}>{p.eixo}</text>}
              <rect x={x(i) - plotW / Math.max(1, pontos.length - 1) / 2} y={0} width={plotW / Math.max(1, pontos.length - 1)} height={total} fill="transparent" onMouseEnter={() => definirAtivo(i)} />
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="ds-grafico__leitura" aria-live="polite">{pontos[mostrado]?.descricao}</figcaption>
    </figure>
  )
}

/** Barra horizontal de 0–100 % sobre um trilho do mesmo tom, mais clarinho. */
export function Medidor({ valor, rotulo, fina = false }: { valor: number; rotulo?: string; fina?: boolean }): ReactNode {
  const v = Math.max(0, Math.min(100, valor))
  return (
    <span className={'ds-medidor' + (fina ? ' ds-medidor--fina' : '')} aria-hidden={rotulo ? undefined : true} role={rotulo ? 'img' : undefined} aria-label={rotulo}>
      <span style={{ width: `${v}%` }} />
    </span>
  )
}

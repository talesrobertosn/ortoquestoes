import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { recurso } from '../../config'
import type { Periodo } from '../../estado/aparencia'
import { Mascote } from '../mascote/Mascote'

/**
 * O Ranking como o torneio do reino (31/10/2026, refeito do zero a pedido do Tales: "seja ranking mesmo, mas design
 * diferente", no mundo de RPG medieval do site). Cada posição é uma raia de torneio; o corredor de cada pessoa (um
 * escudo com o brasão das iniciais) está tão à frente quanto as questões dela em relação ao líder, e a chegada é o
 * portão do castelo. Você corre como a caveira, o mascote do site. Os três primeiros aparecem na chegada, diante da
 * arena pintada na luz da hora. A sua raia fica presa na tela enquanto a lista rola, com quanto falta para passar
 * quem está logo à frente.
 */
export interface Corredor { posicao: number; apelido: string; total: number; eh_voce: boolean; subiu: number }

/** Cor do brasão de cada pessoa, sempre a mesma para o mesmo nome. */
const matiz = (apelido: string) => [...apelido].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

const iniciais = (apelido: string) => {
  const p = apelido.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?'
}

export function Corrida({ periodo, chegada, pistas, lider, nome, selos, movimento, missao, rodape, unidade }: {
  periodo: Periodo
  /** Os três primeiros (foto de chegada). */
  chegada: Corredor[]
  /** Do 4º para baixo. */
  pistas: Corredor[]
  /** Total do líder (a linha de chegada). */
  lider: number
  /** Nome de cada um, com o selo "você". */
  nome: (c: Corredor) => ReactNode
  /** Emblemas, fogueira, serviço... */
  selos: (c: Corredor) => ReactNode
  /** Seta de subida/descida e foguinho. */
  movimento: (c: Corredor) => ReactNode
  /** O que falta para você passar quem está à frente. */
  missao: ReactNode
  rodape?: ReactNode
  unidade: string
}) {
  // A corrida "larga" ao abrir: os corredores saem da largada até o lugar de cada um.
  const [largou, definirLargou] = useState(false)
  useEffect(() => { const t = requestAnimationFrame(() => definirLargou(true)); return () => cancelAnimationFrame(t) }, [])
  const pct = (total: number) => Math.max(2.5, Math.min(100, (total / Math.max(1, lider)) * 100))
  const todos = [...chegada, ...pistas]
  const anterior = (c: Corredor) => todos.find((o) => o.posicao === c.posicao - 1)
  // O corredor: a caveira para você; para os outros, o escudo com o brasão das iniciais.
  const corredor = (c: Corredor) => c.eh_voce
    ? <span className="cor-corredor cor-corredor--caveira"><Mascote className="cor-caveira" comportamento="acenar" fantasia="nenhuma" falar={false} interativo={false} /></span>
    : <span className="cor-corredor" style={{ '--h': matiz(c.apelido) } as CSSProperties}><b>{iniciais(c.apelido)}</b></span>

  return (
    <div className={`cor${largou ? ' cor--largou' : ''}`}>
      <section className="cor-foto" aria-label="Top 3" style={{ '--cor-arena': `url("${recurso(`pixel/paginas/arena-${periodo}.webp`)}")` } as CSSProperties}>
        <p className="cor-foto__selo">Top 3 · a chegada</p>
        <ol className="cor-foto__raias">
          {chegada.map((c) => {
            const frente = anterior(c)
            return (
              <li key={c.posicao} className={`cor-foto__raia cor-foto__raia--${c.posicao}${c.eh_voce ? ' cor-voce' : ''}`} style={{ '--p': `${pct(c.total)}%` } as CSSProperties}>
                <span className="cor-foto__lugar" aria-hidden="true">{c.posicao}º</span>
                <span className="cor-foto__quem">{nome(c)}<span className="cor-foto__selos">{selos(c)}{movimento(c)}</span></span>
                <span className="cor-foto__trilho" aria-hidden="true">{corredor(c)}</span>
                <span className="cor-foto__placar"><b className="numerico">{c.total.toLocaleString('pt-BR')}</b><small>{c.posicao === 1 ? unidade : frente ? `−${(frente.total - c.total).toLocaleString('pt-BR')} do ${frente.posicao}º` : unidade}</small></span>
              </li>
            )
          })}
        </ol>
      </section>

      <ol className="cor-pistas" aria-label="Classificação">
        {pistas.map((c) => {
          const frente = anterior(c)
          return (
            <li key={c.posicao} id={c.eh_voce ? 'cor-minha-pista' : undefined}
              className={`cor-pista${c.eh_voce ? ' cor-voce' : ''}${c.subiu > 0 ? ' cor-pista--subindo' : ''}${c.posicao <= 10 ? ' cor-pista--top10' : ''}`}
              style={{ '--p': `${pct(c.total)}%` } as CSSProperties}>
              <span className="cor-pista__pos numerico">{c.posicao}</span>
              <span className="cor-pista__quem">{nome(c)}<span className="cor-pista__selos">{selos(c)}</span></span>
              <span className="cor-pista__trilho" aria-hidden="true">
                <span className="cor-rastro" />
                {corredor(c)}
              </span>
              <span className="cor-pista__placar">
                <span className="cor-pista__total"><b className="numerico">{c.total.toLocaleString('pt-BR')}</b>{movimento(c)}</span>
                {frente && <small>−{(frente.total - c.total).toLocaleString('pt-BR')} do {frente.posicao}º</small>}
              </span>
              {c.eh_voce && missao && <span className="cor-pista__missao">{missao}</span>}
            </li>
          )
        })}
      </ol>
      {rodape}
    </div>
  )
}

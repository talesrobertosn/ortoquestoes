import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Icone } from '../Icone'
import { href } from '../../util/rotas'
import { niveisCalendario, type DiaCalendario, type Evento } from '../../dados/desempenho'
import type { ResumoHistorico } from '../../estado/sessao'

/*
 * Calendário do ano (14/11/2026): 52 semanas em quadradinhos, a cor pela quantidade de respostas (quartis dos seus
 * próprios dias). Tocar num dia mostra os temas estudados, o acerto, novas e revisões e as sessões concluídas.
 */

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const SEMANA = ['seg', '', 'qua', '', 'sex', '', '']
const dataLonga = (em: number) => new Date(em).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

export function Calendario({ dias, eventos, historico, nomes }: { dias: DiaCalendario[]; eventos: Evento[]; historico: ResumoHistorico[]; nomes: Map<string, string> }) {
  const nivel = useMemo(() => niveisCalendario(dias), [dias])
  // No celular a grade rola de lado: começa mostrando as semanas mais recentes.
  const rolagem = useRef<HTMLDivElement>(null)
  useEffect(() => { const el = rolagem.current; if (el) el.scrollLeft = el.scrollWidth }, [])
  const hoje = dias[dias.length - 1]
  const [escolhido, definirEscolhido] = useState<number>(() => [...dias].reverse().find((d) => d.n > 0)?.inicio ?? hoje.inicio)
  // Colunas de segunda a domingo: o primeiro dia da grade é a segunda da semana mais antiga.
  const primeiro = new Date(dias[0].inicio)
  const vazio = (primeiro.getDay() + 6) % 7
  const celulas: Array<DiaCalendario | null> = [...Array(vazio).fill(null), ...dias]
  const colunas = Math.ceil(celulas.length / 7)
  const rotulosMes: Array<{ col: number; nome: string }> = []
  for (let c = 0; c < colunas; c++) {
    const d = celulas[c * 7] ?? celulas[c * 7 + 6]
    if (!d) continue
    const m = new Date(d.inicio).getMonth()
    if (!rotulosMes.length || MESES[m] !== rotulosMes[rotulosMes.length - 1].nome) rotulosMes.push({ col: c, nome: MESES[m] })
  }
  const ativos = dias.filter((d) => d.n > 0)
  const total = ativos.reduce((t, d) => t + d.n, 0)
  const melhor = ativos.reduce<DiaCalendario | null>((m, d) => (!m || d.n > m.n ? d : m), null)

  const dia = dias.find((d) => d.inicio === escolhido) ?? hoje
  const doDia = useMemo(() => {
    const fim = dia.inicio + 86_400_000
    const temas = new Map<string, { n: number; certas: number }>()
    for (const e of eventos) {
      if (e.em < dia.inicio || e.em >= fim || !e.tema) continue
      const x = temas.get(e.tema) ?? { n: 0, certas: 0 }; x.n++; if (e.correta) x.certas++; temas.set(e.tema, x)
    }
    return {
      temas: [...temas].sort((a, b) => b[1].n - a[1].n),
      sessoes: historico.filter((h) => h.concluidaEm >= dia.inicio && h.concluidaEm < fim),
    }
  }, [dia, eventos, historico])

  const mover = (e: KeyboardEvent, i: number) => {
    const passo = e.key === 'ArrowRight' ? 7 : e.key === 'ArrowLeft' ? -7 : e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!passo) return
    e.preventDefault()
    const alvo = celulas[i + passo]
    if (alvo) { definirEscolhido(alvo.inicio); (document.querySelector(`[data-dia="${alvo.inicio}"]`) as HTMLElement | null)?.focus() }
  }

  return (
    <section className="ds-cartao cal" aria-labelledby="cal-titulo">
      <div className="ds-cartao__cabeca">
        <h3 id="cal-titulo">Seu ano de estudo</h3>
        <p className="ds-num">{total.toLocaleString('pt-BR')} respostas em {ativos.length} {ativos.length === 1 ? 'dia' : 'dias'} de estudo nas últimas 52 semanas{melhor ? ` · o dia mais forte foi ${dataLonga(melhor.inicio)}, com ${melhor.n}` : ''}.</p>
      </div>
      <div className="cal__rolagem" ref={rolagem}>
        <div className="cal__grade" style={{ gridTemplateColumns: `2rem repeat(${colunas}, var(--cal-q))` }}>
          <span />
          {Array.from({ length: colunas }, (_, c) => <span key={`m${c}`} className="cal__mes">{rotulosMes.find((r) => r.col === c)?.nome ?? ''}</span>)}
          {Array.from({ length: 7 }, (_, linha) => <div key={`l${linha}`} className="cal__linha" style={{ display: 'contents' }}>
            <span className="cal__semana">{SEMANA[linha]}</span>
            {Array.from({ length: colunas }, (_, c) => {
              const i = c * 7 + linha
              const d = celulas[i]
              if (!d) return <span key={i} />
              const pct = d.n ? Math.round((d.certas / d.n) * 100) : null
              return <button key={i} type="button" data-dia={d.inicio} className={`cal__dia cal__dia--${nivel(d.n)}` + (d.inicio === escolhido ? ' cal__dia--escolhido' : '') + (d.inicio === hoje.inicio ? ' cal__dia--hoje' : '')}
                aria-label={`${dataLonga(d.inicio)}: ${d.n} ${d.n === 1 ? 'resposta' : 'respostas'}${pct !== null ? `, ${pct}% de acerto` : ''}`}
                aria-pressed={d.inicio === escolhido} tabIndex={d.inicio === escolhido ? 0 : -1}
                onClick={() => definirEscolhido(d.inicio)} onKeyDown={(e) => mover(e, i)} />
            })}
          </div>)}
        </div>
      </div>
      <div className="cal__legenda" aria-hidden="true">menos {[0, 1, 2, 3, 4].map((n) => <i key={n} className={`cal__dia cal__dia--${n}`} />)} mais</div>

      <div className="cal__detalhe" aria-live="polite">
        <h4>{dataLonga(dia.inicio)}</h4>
        {dia.n === 0 ? <p className="ds-vazio">Nenhuma resposta neste dia.</p> : <>
          <dl className="cal__numeros">
            <div><dt>Respostas</dt><dd className="ds-num">{dia.n}</dd></div>
            <div><dt>Acerto</dt><dd className="ds-num">{Math.round((dia.certas / dia.n) * 100)}%</dd></div>
            <div><dt>Novas</dt><dd className="ds-num">{dia.novas}</dd></div>
            <div><dt>Revisões</dt><dd className="ds-num">{dia.revisoes}</dd></div>
            <div><dt>Sessões</dt><dd className="ds-num">{doDia.sessoes.length}</dd></div>
          </dl>
          {doDia.temas.length > 0 && <ul className="cal__temas">{doDia.temas.map(([slug, x]) => <li key={slug}>
            <a href={href(`/treinar?temas=${slug}&limite=10`)}><span>{nomes.get(slug) ?? slug}</span><b className="ds-num">{x.n}</b><small className="ds-num">{Math.round((x.certas / x.n) * 100)}%</small></a>
          </li>)}</ul>}
          {doDia.sessoes.length > 0 && <ul className="cal__sessoes">{doDia.sessoes.map((s) => <li key={s.id}><Icone nome="relogio" tamanho={14} /> {s.descricao || 'Sessão'} · {s.acertos} de {s.respondidas}</li>)}</ul>}
        </>}
      </div>
    </section>
  )
}

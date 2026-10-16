import { useMemo, useRef, useState, type RefObject } from 'react'
import type { Indice } from '../dados/tipos'
import type { DiaRevisao } from '../estado/planoRevisao'
import { corDaArea } from '../dados/coresAreas'
import { Icone } from '../componentes/Icone'
import { REVISOES_CINCO_MINUTOS, minutosPara } from '../estado/metasRevisao'
import { FUSO_DIA, chaveDoDia, diaDaSemana, inicioDaChave, somarDias } from '../util/dia'
import '../estilos/paginas/CronogramaPainel.css'
import '../estilos/paginas/CronogramaCalendario.css'

/**
 * Calendário da revisão (pedido do Tales, 16/10/2026): o mesmo desenho do calendário do
 * cronograma, de segunda a domingo. Os dias que passaram mostram quantas revisões foram
 * feitas (verde ✓) e de que áreas; hoje e os próximos, quantas vencem, com a cor das áreas.
 * Tocar num dia abre o detalhe, com revisar (hoje), adiantar (os próximos) e revisar só
 * uma área daquele dia.
 */

const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const FORMATO_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: FUSO_DIA })
const FORMATO_DIA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: FUSO_DIA })
const curto = (nome: string, max = 16) => nome.length <= max ? nome : `${nome.slice(0, max - 2).trimEnd()}.`
const questoes = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'revisão' : 'revisões'}`
const faixa = (partes: Array<{ slug: string; n: number }>) => {
  const total = partes.reduce((s, p) => s + p.n, 0)
  if (!total) return 'transparent'
  let acc = 0
  return `linear-gradient(90deg, ${partes.map((p) => { const ini = (acc / total) * 100; acc += p.n; return `${corDaArea(p.slug)} ${ini}% ${(acc / total) * 100}%` }).join(', ')})`
}
const mesDaChave = (k: string) => k.slice(0, 7)
const somarMeses = (mes: string, delta: number) => { const [a, m] = mes.split('-').map(Number); return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7) }

interface Area { slug: string; nome: string; n: number; ids: string[] }
interface Celula { k: string; passado: boolean; ehHoje: boolean; dia?: DiaRevisao; feitas: number; folga: boolean; areas: Area[] }

export function CalendarioRevisao({ indice, registros, plano, folgas, hoje, rotuloArea, aoRevisar }: {
  indice: Indice
  /** As respostas (já filtradas pela área escolhida, se houver). */
  registros: Record<string, { c?: boolean | null; q?: number; tentativas?: number; historico?: Array<{ em: number }> }>
  plano: Map<string, DiaRevisao>
  folgas: number[]
  /** Início de hoje (São Paulo). */
  hoje: number
  /** "de coluna", quando a página está filtrada por uma área. */
  rotuloArea?: string
  aoRevisar: (ids: string[]) => void
}) {
  const chaveHoje = chaveDoDia(hoje)
  const [mes, definirMes] = useState(() => mesDaChave(chaveHoje))
  const [selecionado, definirSelecionado] = useState(chaveHoje)
  const [direcao, definirDirecao] = useState<'frente' | 'tras' | null>(null)
  const detalhe = useRef<HTMLElement>(null)
  const mesMinimo = mesDaChave(somarDias(chaveHoje, -90))
  const ultimo = [...plano.keys()].sort().pop() ?? chaveHoje
  const mesLimite = mesDaChave(ultimo > chaveHoje ? ultimo : chaveHoje)

  const areaDe = useMemo(() => new Map(indice.questoes.map((q) => [q.id, indice.temas[q.t]])), [indice])
  const agrupar = (ids: string[]): Area[] => {
    const m = new Map<string, Area>()
    for (const id of ids) {
      const t = areaDe.get(id); const slug = t?.slug ?? 'outro'
      const a = m.get(slug) ?? { slug, nome: t?.nome ?? 'Outro', n: 0, ids: [] }
      a.n++; a.ids.push(id); m.set(slug, a)
    }
    return [...m.values()].sort((a, b) => b.n - a.n)
  }

  // As revisões já feitas, por dia e por área (a primeira resposta não é revisão).
  const feitasPorDia = useMemo(() => {
    const porDia = new Map<string, string[]>()
    for (const [id, r] of Object.entries(registros)) {
      if (!r || r.c === undefined) continue
      const tentativas = r.tentativas ?? 1
      const historico = r.historico ?? []
      const completo = historico.length > 0 && historico.length >= tentativas
      const momentos = historico.length ? (completo ? historico.slice(1) : historico).map((e) => e.em) : tentativas > 1 && r.q ? [r.q] : []
      for (const em of momentos) { const k = chaveDoDia(em); const l = porDia.get(k) ?? []; l.push(id); porDia.set(k, l) }
    }
    return porDia
  }, [registros])

  const montar = (k: string): Celula => {
    const passado = k < chaveHoje
    const dia = plano.get(k)
    const feitas = feitasPorDia.get(k) ?? []
    const folga = folgas.includes(diaDaSemana(k))
    const areas = agrupar(passado ? feitas : dia?.ids ?? [])
    return { k, passado, ehHoje: k === chaveHoje, dia, feitas: feitas.length, folga, areas }
  }

  const grade = useMemo(() => {
    const recuo = (diaDaSemana(`${mes}-01`) + 6) % 7
    const [a, m] = mes.split('-').map(Number)
    const dias = new Date(Date.UTC(a, m, 0)).getUTCDate()
    const celulas: Array<Celula | null> = Array.from({ length: recuo }, () => null)
    for (let d = 1; d <= dias; d++) celulas.push(montar(`${mes}-${String(d).padStart(2, '0')}`))
    while (celulas.length % 7) celulas.push(null)
    return celulas
  }, [mes, plano, feitasPorDia, chaveHoje, folgas.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useMemo(() => montar(selecionado), [selecionado, plano, feitasPorDia, chaveHoje, folgas.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const resumo = grade.reduce((r, c) => {
    if (!c) return r
    if (c.passado) r.feitas += c.feitas; else r.previstas += c.dia?.ids.length ?? 0
    return r
  }, { feitas: 0, previstas: 0 })
  const areasMes = new Map<string, string>()
  for (const c of grade) for (const a of c?.areas ?? []) areasMes.set(a.slug, a.nome)

  function irMes(delta: number) {
    const novo = somarMeses(mes, delta)
    if (novo < mesMinimo || novo > mesLimite) return
    definirDirecao(delta > 0 ? 'frente' : 'tras'); definirMes(novo)
    if (mesDaChave(selecionado) !== novo) definirSelecionado(novo === mesDaChave(chaveHoje) ? chaveHoje : `${novo}-01`)
  }
  function escolher(c: Celula) {
    definirSelecionado(c.k)
    const r = detalhe.current?.getBoundingClientRect()
    if (window.matchMedia('(max-width: 52rem)').matches && (!r || r.top > innerHeight - 120 || r.top < 0)) {
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      requestAnimationFrame(() => detalhe.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' }))
    }
  }
  const nomeMes = (m: string) => { const s = FORMATO_MES.format(inicioDaChave(`${m}-15`)); return s[0].toUpperCase() + s.slice(1) }

  return (
    <section className="cp cc cc--embutido cc--revisao" id="calendario-revisao" aria-labelledby="ccr-titulo">
      <div className="cc-janela">
        <header className="cc-topo">
          <div className="cc-topo__titulo">
            <p className="cc-topo__selo"><Icone nome="calendario" tamanho={14} /> Calendário da revisão{rotuloArea ? ` · só ${rotuloArea}` : ''}</p>
            <h2 id="ccr-titulo" aria-live="polite">{nomeMes(mes)} <span className="cc-de">de </span>{mes.slice(0, 4)}</h2>
            <p className="cc-topo__resumo">
              {resumo.feitas > 0 && <span><b className="numerico">{resumo.feitas.toLocaleString('pt-BR')}</b> feitas</span>}
              {resumo.previstas > 0 && <span><b className="numerico">{resumo.previstas.toLocaleString('pt-BR')}</b> previstas</span>}
              {!resumo.feitas && !resumo.previstas && <span>Nada neste mês</span>}
            </p>
          </div>
          <div className="cc-nav">
            <button type="button" className="cc-nav__botao" onClick={() => irMes(-1)} disabled={mes <= mesMinimo} aria-label="Mês anterior"><Icone nome="esquerda" tamanho={18} /></button>
            <button type="button" className="cc-nav__hoje" onClick={() => { definirDirecao(null); definirMes(mesDaChave(chaveHoje)); definirSelecionado(chaveHoje) }}>Hoje</button>
            <button type="button" className="cc-nav__botao" onClick={() => irMes(1)} disabled={mes >= mesLimite} aria-label="Próximo mês"><Icone nome="direita" tamanho={18} /></button>
          </div>
        </header>
        <div className="cc-corpo">
          <div className="cc-mes">
            <ol className="cc-semana" aria-hidden="true">{SEMANA.map((s) => <li key={s}>{s}</li>)}</ol>
            <ol key={mes} className={'cc-grade' + (direcao ? ` cc-grade--${direcao}` : '')} aria-label={`Revisões de ${nomeMes(mes)}`}>
              {grade.map((c, i) => c ? <CelulaRevisao key={c.k} c={c} minimo={somarDias(chaveHoje, -90)} selecionado={c.k === selecionado} aoEscolher={escolher} /> : <li key={`v${i}`} className="cc-dia cc-dia--vazio" aria-hidden="true" />)}
            </ol>
            <ul className="cp-legenda cc-legenda" aria-label="Legenda">
              {[...areasMes].map(([slug, nome]) => <li key={slug}><i style={{ background: corDaArea(slug) }} />{nome}</li>)}
              <li><i className="cc-legenda__feito" />feitas</li>
              <li><i className="cc-legenda__hoje" />hoje</li>
              {folgas.length > 0 && <li><i className="cp-legenda__folga" />folga</li>}
            </ul>
          </div>
          <DetalheRevisao ancora={detalhe} c={sel} hoje={chaveHoje} aoRevisar={aoRevisar} />
        </div>
      </div>
    </section>
  )
}

function DetalheRevisao({ ancora, c, hoje, aoRevisar }: {
  ancora: RefObject<HTMLElement>
  c: Celula
  hoje: string
  aoRevisar: (ids: string[]) => void
}) {
  const ids = c.dia?.ids ?? []
  const n = c.passado ? c.feitas : ids.length
  const principal = c.areas[0]
  const titulo = c.passado ? (n ? `${questoes(n)} feitas` : 'Sem revisões') : n ? `${questoes(n)} · ~${minutosPara(n)} min` : c.folga ? 'Folga do seu ritmo' : 'Nada vence neste dia'
  const sub = c.passado
    ? (n ? 'O que você revisou neste dia, por área.' : 'Nenhuma revisão feita neste dia.')
    : n ? <>{c.ehHoje && c.dia?.atrasadas ? `${c.dia.atrasadas} vencidas foram trazidas para hoje. ` : !c.ehHoje && c.dia?.redistribuidas ? `${c.dia.redistribuidas} vieram de dias anteriores pelo seu ritmo. ` : ''}{c.dia?.tentativas ? <>Acerto histórico nelas: <b>{Math.round((c.dia.acertos / c.dia.tentativas) * 100)}%</b>.</> : null}</>
      : c.folga ? 'O que venceria neste dia passa para o próximo dia de revisão.' : 'Escolha outro dia ou avance com questões novas.'
  const porVir = !c.passado && n > 0
  return (
    <section ref={ancora} className={`cc-detalhe cc-detalhe--${c.ehHoje ? 'hoje' : c.passado ? 'passado' : 'futuro'}`} aria-live="polite" aria-labelledby="ccr-detalhe-titulo" style={{ ['--cor-area' as string]: principal ? corDaArea(principal.slug) : undefined }}>
      <p className="cc-detalhe__data">{FORMATO_DIA.format(inicioDaChave(c.k))}{c.ehHoje && <span className="cc-detalhe__agora">hoje</span>}</p>
      <h3 id="ccr-detalhe-titulo">{titulo}</h3>
      {sub && <p className="cc-detalhe__sub">{sub}</p>}
      {c.areas.length > 0 && <ul className="cc-detalhe__lista">
        {c.areas.map((a) => (
          <li key={a.slug} className="cc-detalhe__item">
            <i style={{ background: corDaArea(a.slug) }} aria-hidden="true" />
            <span><strong>{a.n} de {a.nome}</strong>{porVir && <small>~{minutosPara(a.n)} min</small>}</span>
            {porVir && c.areas.length > 1 && <button type="button" className="cp-lista__acao" onClick={() => aoRevisar(a.ids)} aria-label={`Revisar só as ${a.n} de ${a.nome}`}>Só esta</button>}
          </li>
        ))}
      </ul>}
      {porVir && <button type="button" className="cp-botao" onClick={() => aoRevisar(ids)}>{c.ehHoje ? 'Revisar as de hoje' : c.k > hoje ? 'Adiantar este dia' : 'Revisar'}<small>{questoes(n)} · ~{minutosPara(n)} min</small></button>}
      {porVir && n > REVISOES_CINCO_MINUTOS && <button type="button" className="cc-abrir" onClick={() => aoRevisar(ids.slice(0, REVISOES_CINCO_MINUTOS))}><Icone nome="relogio" tamanho={16} /> Só 5 minutos ({REVISOES_CINCO_MINUTOS})</button>}
    </section>
  )
}

function CelulaRevisao({ c, minimo, selecionado, aoEscolher }: { c: Celula; minimo: string; selecionado: boolean; aoEscolher: (c: Celula) => void }) {
  const n = c.passado ? c.feitas : c.dia?.ids.length ?? 0
  const fora = c.k < minimo
  const estado = fora ? 'fora' : c.passado ? (n ? 'feito' : 'vazio') : c.ehHoje ? 'hoje' : !n && c.folga ? 'folga' : 'futuro'
  const texto = c.passado ? (n ? `${n} feitas` : '') : !n && c.folga ? 'folga' : n ? `${n} rev.` : ''
  const descricao = [FORMATO_DIA.format(inicioDaChave(c.k)), c.passado ? (n ? `${questoes(n)} feitas` : 'sem revisões') : n ? `${questoes(n)} previstas` : c.folga ? 'folga' : 'nada previsto', ...c.areas.slice(0, 3).map((a) => `${a.nome} ${a.n}`)].join(', ')
  return (
    <li className={`cc-dia cc-dia--${estado}${selecionado ? ' cc-dia--selecionado' : ''}${c.ehHoje ? ' cc-dia--atual' : ''}`}>
      <button type="button" onClick={() => aoEscolher(c)} aria-label={descricao} aria-pressed={selecionado} aria-current={c.ehHoje ? 'date' : undefined} disabled={fora}>
        <span className="cc-dia__topo">
          <b className="cc-dia__num">{Number(c.k.slice(8))}</b>
          {estado === 'feito' && <span className="cc-dia__selo cc-dia__selo--feito" aria-hidden="true"><Icone nome="certo" tamanho={11} /></span>}
          {c.ehHoje && <span className="cc-dia__hoje">hoje</span>}
        </span>
        {c.areas.length > 0 && <span className="cc-dia__areas">
          {c.areas.slice(0, 2).map((a) => <span key={a.slug} className="cc-dia__area"><i style={{ background: corDaArea(a.slug) }} /><span>{curto(a.nome)}</span></span>)}
          {c.areas.length > 2 && <span className="cc-dia__area cc-dia__area--mais">+{c.areas.length - 2}</span>}
        </span>}
        <span className="cc-dia__rodape">{texto && <em data-curto={texto.match(/^\d+/)?.[0] ?? (estado === 'folga' ? '' : texto)}><span>{texto}</span></em>}</span>
        {c.areas.length > 0 && <span className="cc-dia__faixa" style={{ background: faixa(c.areas) }} aria-hidden="true" />}
      </button>
    </li>
  )
}

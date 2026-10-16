import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { Indice } from '../dados/tipos'
import { DIA_MINIMO, TAMANHO_MINI, ROTULO_PASSADA, type CalculoPlano, type DiaPlano, type Passada, type PlanoSalvo } from '../dados/planoEstudo'
import { formatarTempo } from '../dados/hubCronograma'
import { corDaArea } from '../dados/coresAreas'
import { Icone } from '../componentes/Icone'
import { chaveCivil, chaveDoDia, diaCivil } from '../util/dia'
import '../estilos/paginas/CronogramaCalendario.css'

/**
 * Calendário do cronograma (pedido do Tales, 16/10/2026): o plano inteiro num mês de
 * computador, de segunda a domingo, até a prova. Cada dia mostra a cor e o nome das
 * áreas, quantas questões, a folga, o que já foi feito, hoje, os marcos (mini-simulado,
 * passadas, reta final, prova). Tocar num dia abre o que estudar nele, com o botão de
 * começar (hoje) ou de adiantar (os próximos dias, como no painel Adiantar).
 * Os estados são os do resto do cronograma: feito (verde ✓), agora (dourado), a fazer,
 * folga (hachurado), atrasado (laranja) e marco (dourado tracejado).
 */

const DIA = 86_400_000
const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
/** Quantos dias de estudo dá para adiantar de uma vez pelo calendário (os mesmos do painel Adiantar). */
const ADIANTAR_ATE = 3
const MINUTOS_RESUMAO = 4

type Fase = 'antes' | 'passado' | 'hoje' | 'conteudo' | 'revisao' | 'prova' | 'vespera' | 'dia-prova' | 'depois'
interface DiaCalendario {
  data: Date
  chave: string
  fase: Fase
  folga: boolean
  /** Do motor: hoje e os dias de estudo até a reta final. */
  plano: DiaPlano | null
  /** O que foi feito nesse dia (respostas, por área). */
  feitas: number
  areasFeitas: Array<{ slug: string; nome: string; n: number }>
  marcos: string[]
}

const mesDe = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const nomeMes = (d: Date) => { const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1) }
const dataLonga = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const faixa = (partes: Array<{ slug: string; n: number }>) => {
  const total = partes.reduce((s, p) => s + p.n, 0)
  if (!total) return 'transparent'
  let acc = 0
  return `linear-gradient(90deg, ${partes.map((p) => { const ini = (acc / total) * 100; acc += p.n; return `${corDaArea(p.slug)} ${ini}% ${(acc / total) * 100}%` }).join(', ')})`
}
const juntar = (nomes: string[]) => nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
/** Nome curto da área para caber na célula ("Ombro e cotovelo" → "Ombro e cot."). */
const curto = (nome: string, max = 13) => nome.length <= max ? nome : `${nome.slice(0, max - 2).trimEnd()}.`

export interface AcoesCalendario {
  /** Começa (ou continua) a sessão de hoje. */
  aoComecar?: () => void
  /** Sessão pela metade: o link para continuar. */
  pendente?: { feitas: number; total: number } | null
  /** Pede para adiantar n questões (o mesmo do painel Adiantar). */
  aoAdiantar?: (n: number) => void
  salvando?: boolean
}

export function CalendarioCronograma({ plano, calculo, indice, respondidas, minutos, revisoesHoje = 0, acoes, aoFechar }: {
  plano: PlanoSalvo
  calculo: CalculoPlano
  indice: Indice
  respondidas: Record<string, { q?: number; historico?: Array<{ em: number }> }>
  minutos: number
  revisoesHoje?: number
  acoes: AcoesCalendario
  aoFechar: () => void
}) {
  const hoje = diaCivil()
  const prova = new Date(calculo.vespera.getTime() + DIA)
  const criado = diaCivil(Date.parse(plano.criado_em))
  const primeiroMes = mesDe(criado < hoje ? criado : hoje)
  const ultimoMes = mesDe(prova)
  const [mes, definirMes] = useState(() => mesDe(hoje))
  const [selecionado, definirSelecionado] = useState<string>(() => chaveCivil(hoje))
  const [direcao, definirDirecao] = useState<'frente' | 'tras' | null>(null)
  const fechar = useRef<HTMLButtonElement>(null)
  const detalhe = useRef<HTMLElement>(null)

  // O que foi feito em cada dia (todas as respostas, como na constância), por área.
  const feitoPorDia = useMemo(() => {
    const temaDe = new Map(indice.questoes.map((q) => [q.id, q.t]))
    const mapa = new Map<string, { n: number; temas: Map<number, number> }>()
    for (const [id, r] of Object.entries(respondidas)) {
      const momentos = r.historico?.length ? r.historico.map((h) => h.em) : r.q !== undefined ? [r.q] : []
      for (const em of momentos) {
        const k = chaveDoDia(em)
        const dia = mapa.get(k) ?? { n: 0, temas: new Map() }
        dia.n++
        const t = temaDe.get(id)
        if (t !== undefined) dia.temas.set(t, (dia.temas.get(t) ?? 0) + 1)
        mapa.set(k, dia)
      }
    }
    return mapa
  }, [indice, respondidas])

  const porChave = useMemo(() => new Map(calculo.dias.map((d) => [chaveCivil(d.data), d])), [calculo])
  const inicioPassada = useMemo(() => {
    const m = new Map<string, Passada>()
    for (const p of [2, 3] as Passada[]) { const d = calculo.inicioPassada[p]; if (d && d > hoje) m.set(chaveCivil(d), p) }
    return m
  }, [calculo]) // eslint-disable-line react-hooks/exhaustive-deps
  const extra = plano.opcoes?.provaExtra && /^\d{4}-\d{2}-\d{2}$/.test(plano.opcoes.provaExtra.data) ? plano.opcoes.provaExtra : null

  function montarDia(data: Date): DiaCalendario {
    const chave = chaveCivil(data)
    const folga = plano.folgas.includes(data.getDay())
    const ehHoje = data.getTime() === hoje.getTime()
    const fase: Fase = data < criado ? 'antes'
      : data.getTime() === prova.getTime() ? 'dia-prova'
      : data > prova ? 'depois'
      : data.getTime() === calculo.vespera.getTime() ? 'vespera'
      : data >= calculo.inicioModoProva ? 'prova'
      : data >= calculo.inicioRetaFinal ? 'revisao'
      : ehHoje ? 'hoje' : data < hoje ? 'passado' : 'conteudo'
    const doPlano = porChave.get(chave) ?? null
    const plano_ = ehHoje && doPlano ? { ...doPlano, itens: calculo.hoje?.itens ?? doPlano.itens, meta: calculo.metaDiaria, total: calculo.metaDiaria } : doPlano
    const feito = feitoPorDia.get(chave)
    const areasFeitas = feito ? [...feito.temas].map(([t, n]) => ({ slug: indice.temas[t]?.slug ?? String(t), nome: indice.temas[t]?.nome ?? '', n })).sort((a, b) => b.n - a.n) : []
    const marcos: string[] = []
    if (data.getTime() === calculo.inicioRetaFinal.getTime() && calculo.diasRetaFinal > 7) marcos.push('Começa a revisão forte')
    if (data.getTime() === calculo.inicioModoProva.getTime()) marcos.push('Começa o modo prova')
    const passada = inicioPassada.get(chave)
    if (passada) marcos.push(`Começa a ${ROTULO_PASSADA[passada].nome}`)
    if (extra && extra.data === chave) marcos.push(`Prova: ${extra.nome}`)
    return { data, chave, fase, folga, plano: plano_, feitas: feito?.n ?? 0, areasFeitas, marcos }
  }

  // A grade do mês: semanas de segunda a domingo; os dias de fora do mês ficam vazios.
  const grade = useMemo(() => {
    const primeiro = mes
    const recuo = (primeiro.getDay() + 6) % 7
    const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
    const celulas: Array<DiaCalendario | null> = Array.from({ length: recuo }, () => null)
    for (let i = 1; i <= diasNoMes; i++) celulas.push(montarDia(new Date(mes.getFullYear(), mes.getMonth(), i)))
    while (celulas.length % 7) celulas.push(null)
    return celulas
  }, [mes, calculo, feitoPorDia, plano]) // eslint-disable-line react-hooks/exhaustive-deps

  const diaSelecionado = useMemo(() => {
    const [a, m, d] = selecionado.split('-').map(Number)
    return montarDia(new Date(a, m - 1, d))
  }, [selecionado, calculo, feitoPorDia, plano]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resumo do mês: dias de estudo, questões planejadas e feitas.
  const resumoMes = useMemo(() => {
    let estudo = 0, questoes = 0, feitas = 0, folgas = 0
    for (const c of grade) {
      if (!c || c.fase === 'antes' || c.fase === 'depois') continue
      if (rotuloEstado(c).estado === 'folga') folgas++
      if (c.plano && c.plano.tipo !== 'folga') { estudo++; questoes += c.plano.total }
      if (c.fase === 'passado' || c.fase === 'hoje') feitas += c.feitas
    }
    return { estudo, questoes, feitas, folgas }
  }, [grade])

  // Teclado, rolagem da página e foco: Esc fecha; o fundo não rola; o foco volta para quem abriu.
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    fechar.current?.focus()
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); aoFechar() } }
    window.addEventListener('keydown', tecla)
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = overflow; antes?.focus?.() }
  }, [aoFechar])

  const podeVoltar = mes > primeiroMes, podeAvancar = mes < ultimoMes
  function irMes(delta: number) {
    const novo = new Date(mes.getFullYear(), mes.getMonth() + delta, 1)
    if (novo < primeiroMes || novo > ultimoMes) return
    definirDirecao(delta > 0 ? 'frente' : 'tras'); definirMes(novo)
  }
  function escolher(d: DiaCalendario) {
    definirSelecionado(d.chave)
    // No celular o detalhe fica embaixo da grade: rola até ele.
    if (window.matchMedia('(max-width: 52rem)').matches) {
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      requestAnimationFrame(() => detalhe.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' }))
    }
  }
  function irHoje() { definirDirecao(null); definirMes(mesDe(hoje)); definirSelecionado(chaveCivil(hoje)) }

  // Áreas do mês para a legenda.
  const areasMes = new Map<string, string>()
  for (const c of grade) for (const i of c?.plano?.itens ?? []) areasMes.set(i.slug, i.nome)

  return createPortal(
    <div className="cp cc" role="dialog" aria-modal="true" aria-labelledby="cc-titulo">
      <button type="button" className="cc-veu" aria-label="Fechar o calendário" tabIndex={-1} onClick={aoFechar} />
      <div className="cc-janela">
        <header className="cc-topo">
          <div className="cc-topo__titulo">
            <p className="cc-topo__selo"><Icone nome="calendario" tamanho={14} /> Calendário do cronograma · {plano.prova}</p>
            <h2 id="cc-titulo" aria-live="polite">{nomeMes(mes).replace(/ de \d+$/, '')} <span className="cc-de">de </span>{mes.getFullYear()}</h2>
            <p className="cc-topo__resumo">
              {resumoMes.estudo > 0 && <span><b className="numerico">{resumoMes.estudo}</b> dias de estudo · <b className="numerico">{resumoMes.questoes.toLocaleString('pt-BR')}</b> questões</span>}
              {resumoMes.feitas > 0 && <span><b className="numerico">{resumoMes.feitas.toLocaleString('pt-BR')}</b> feitas</span>}
              {resumoMes.folgas > 0 && <span>{resumoMes.folgas} {resumoMes.folgas === 1 ? 'folga' : 'folgas'}</span>}
            </p>
          </div>
          <div className="cc-nav">
            <button type="button" className="cc-nav__botao" onClick={() => irMes(-1)} disabled={!podeVoltar} aria-label="Mês anterior"><Icone nome="esquerda" tamanho={18} /></button>
            <button type="button" className="cc-nav__hoje" onClick={irHoje}>Hoje</button>
            <button type="button" className="cc-nav__botao" onClick={() => irMes(1)} disabled={!podeAvancar} aria-label="Próximo mês"><Icone nome="direita" tamanho={18} /></button>
            <button type="button" className="cc-fechar" ref={fechar} onClick={aoFechar} aria-label="Fechar o calendário"><Icone nome="fechar" tamanho={18} /></button>
          </div>
        </header>

        <div className="cc-corpo">
          <div className="cc-mes">
            <ol className="cc-semana" aria-hidden="true">{SEMANA.map((s) => <li key={s}>{s}</li>)}</ol>
            <ol key={mes.getTime()} className={'cc-grade' + (direcao ? ` cc-grade--${direcao}` : '')} aria-label={`Dias de ${nomeMes(mes)}`}>
              {grade.map((c, i) => c ? <Celula key={c.chave} dia={c} selecionado={c.chave === selecionado} aoEscolher={escolher} /> : <li key={`v${i}`} className="cc-dia cc-dia--vazio" aria-hidden="true" />)}
            </ol>
            <ul className="cp-legenda cc-legenda" aria-label="Legenda">
              {[...areasMes].map(([slug, nome]) => <li key={slug}><i style={{ background: corDaArea(slug) }} />{nome}</li>)}
              <li><i className="cc-legenda__feito" />feito</li>
              <li><i className="cc-legenda__hoje" />hoje</li>
              <li><i className="cp-legenda__folga" />folga</li>
              <li><i className="cc-legenda__marco" />marco</li>
              <li><i className="cc-legenda__reta" />reta final</li>
            </ul>
          </div>
          <Detalhe ancora={detalhe} dia={diaSelecionado} calculo={calculo} plano={plano} minutos={minutos} revisoesHoje={revisoesHoje} acoes={acoes} aoFechar={aoFechar} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function rotuloEstado(d: DiaCalendario): { estado: string; texto: string } {
  if (d.fase === 'antes' || d.fase === 'depois') return { estado: 'fora', texto: '' }
  if (d.fase === 'dia-prova') return { estado: 'prova', texto: 'Prova' }
  if (d.folga && (d.fase === 'conteudo' || d.fase === 'passado' || d.fase === 'hoje') && !(d.fase === 'passado' && d.feitas > 0)) return { estado: 'folga', texto: 'folga' }
  if (d.fase === 'hoje') {
    const meta = d.plano?.meta ?? 0
    return { estado: 'hoje', texto: meta > 0 ? `${meta} q` : 'hoje' }
  }
  if (d.fase === 'passado') {
    if (d.feitas >= DIA_MINIMO) return { estado: 'feito', texto: `${d.feitas} feitas` }
    if (d.feitas > 0) return { estado: 'parcial', texto: `${d.feitas} feitas` }
    return { estado: 'atrasado', texto: 'sem estudo' }
  }
  if (d.fase === 'revisao') return { estado: 'reta', texto: 'revisão' }
  if (d.fase === 'prova') return { estado: 'reta', texto: 'modo prova' }
  if (d.fase === 'vespera') return { estado: 'reta', texto: 'véspera' }
  const p = d.plano
  if (!p) return { estado: 'futuro', texto: '' }
  if (p.total === 0 && p.adiantado > 0 && !p.mini) return { estado: 'adiantado', texto: 'adiantado' }
  return { estado: 'futuro', texto: p.total ? `${p.total} q${p.tipo === 'leve' ? ' · leve' : p.tipo === 'dificil' ? ' · mínimo' : ''}` : p.mini ? 'mini' : '' }
}

/** O rótulo da célula no celular, onde cabe só um número ou uma palavra curta. */
function textoCurto(estado: string, texto: string): string {
  if (estado === 'atrasado') return '–'
  if (estado === 'folga' || estado === 'hoje' && texto === 'hoje') return ''
  if (estado === 'adiantado') return 'livre'
  if (estado === 'prova') return 'PROVA'
  if (texto === 'revisão') return 'rev.'
  if (texto === 'modo prova') return 'prova'
  if (texto === 'véspera') return 'vésp.'
  const n = texto.match(/^\d+/)?.[0]
  return n ?? texto
}

function Celula({ dia: d, selecionado, aoEscolher }: { dia: DiaCalendario; selecionado: boolean; aoEscolher: (d: DiaCalendario) => void }) {
  const { estado, texto } = rotuloEstado(d)
  const passado = d.fase === 'passado' || (d.fase === 'hoje' && d.feitas > 0 && !d.plano?.itens.length)
  const partes = passado ? d.areasFeitas.slice(0, 4) : (d.plano?.itens ?? []).map((i) => ({ slug: i.slug, nome: i.nome, n: i.n }))
  const areas = [...partes].reduce<Array<{ slug: string; nome: string; n: number }>>((acc, p) => { const a = acc.find((x) => x.slug === p.slug); if (a) a.n += p.n; else acc.push({ ...p }); return acc }, []).sort((a, b) => b.n - a.n)
  const mini = !!d.plano?.mini
  const marco = mini || d.marcos.length > 0
  const descricao = [dataLonga(d.data), texto, areas.length ? juntar(areas.map((a) => `${a.nome} ${a.n}`)) : '', mini ? 'mini-simulado' : '', ...d.marcos].filter(Boolean).join(', ')
  return (
    <li className={`cc-dia cc-dia--${estado}${marco ? ' cc-dia--marco' : ''}${d.plano?.adiantado ? ' cc-dia--com-adiantado' : ''}${selecionado ? ' cc-dia--selecionado' : ''}`}>
      <button type="button" onClick={() => aoEscolher(d)} aria-label={descricao} aria-pressed={selecionado} disabled={estado === 'fora'}>
        <span className="cc-dia__topo">
          <b className="cc-dia__num">{d.data.getDate()}</b>
          {estado === 'feito' && <span className="cc-dia__selo cc-dia__selo--feito" aria-hidden="true"><Icone nome="certo" tamanho={11} /></span>}
          {estado === 'hoje' && <span className="cc-dia__hoje">hoje</span>}
          {mini && <span className="cc-dia__selo cc-dia__selo--marco" aria-hidden="true" title="Mini-simulado">★</span>}
        </span>
        {areas.length > 0 && estado !== 'folga' && <span className="cc-dia__areas">
          {areas.slice(0, 2).map((a) => <span key={a.slug} className="cc-dia__area"><i style={{ background: corDaArea(a.slug) }} /><span>{curto(a.nome, 16)}</span></span>)}
          {areas.length > 2 && <span className="cc-dia__area cc-dia__area--mais">+{areas.length - 2}</span>}
        </span>}
        {d.marcos.length > 0 && <span className="cc-dia__marco">{d.marcos[0]}</span>}
        <span className="cc-dia__rodape">
          {texto && <em data-curto={textoCurto(estado, texto)}><span>{texto}</span></em>}
          {d.plano && d.plano.adiantado > 0 && d.plano.total > 0 && <s className="numerico">{d.plano.total + d.plano.adiantado}</s>}
        </span>
        {areas.length > 0 && estado !== 'folga' && <span className="cc-dia__faixa" style={{ background: faixa(areas) }} aria-hidden="true" />}
      </button>
    </li>
  )
}

function Detalhe({ ancora, dia: d, calculo, plano, minutos, revisoesHoje, acoes, aoFechar }: {
  ancora: RefObject<HTMLElement>
  dia: DiaCalendario; calculo: CalculoPlano; plano: PlanoSalvo; minutos: number; revisoesHoje: number; acoes: AcoesCalendario; aoFechar: () => void
}) {
  const { estado } = rotuloEstado(d)
  const p = d.plano
  const principal = p?.itens.find((i) => !i.mistura) ?? p?.itens[0]
  const linhas: Array<{ id: string; cor?: string; titulo: ReactNode; texto?: ReactNode; minutos?: number | null; chips?: string[]; opcional?: boolean }> = []
  let titulo = ''
  let sub: ReactNode = null
  let acao: ReactNode = null

  if (d.fase === 'dia-prova') { titulo = `Prova: ${plano.prova}`; sub = 'O dia que o plano inteiro prepara. Boa prova!' }
  else if (d.fase === 'antes') { titulo = 'Antes do cronograma'; sub = 'O plano começou depois deste dia.' }
  else if (d.fase === 'depois') { titulo = 'Depois da prova'; sub = 'O cronograma termina no dia da prova.' }
  else if (d.fase === 'revisao' || d.fase === 'prova' || d.fase === 'vespera') {
    titulo = d.fase === 'revisao' ? 'Reta final: revisão forte' : d.fase === 'prova' ? 'Reta final: modo prova' : 'Véspera da prova'
    sub = d.fase === 'revisao' ? 'Sem conteúdo novo: uma fatia da prova por dia, com os seus erros, as dúvidas e o que mais cai.'
      : d.fase === 'prova' ? 'Simulado cronometrado, os erros que importam e o resumão.'
      : 'Aquecimento leve e descanso. Durma cedo.'
    if (d.fase === 'revisao') linhas.push({ id: 'forte', titulo: `Revisão forte: ~${calculo.metaMedia} questões`, texto: 'As áreas do dia, dos seus erros e dúvidas primeiro', minutos: calculo.metaMedia * minutos })
    if (d.fase === 'prova') linhas.push({ id: 'sim', titulo: 'Simulado cronometrado', texto: 'No horário e com a duração da prova' }, { id: 'erros', titulo: 'Os erros que importam', texto: 'O que mais cai e você errou' })
    if (d.fase === 'vespera') linhas.push({ id: 'aq', titulo: 'Aquecimento leve', texto: 'Poucas questões, só para entrar no ritmo' })
  } else if (d.fase === 'passado') {
    titulo = d.folga && !d.feitas ? 'Folga' : d.feitas >= DIA_MINIMO ? 'Feito' : d.feitas > 0 ? 'Feito em parte' : 'Sem estudo'
    sub = d.feitas ? `Você respondeu ${d.feitas} ${d.feitas === 1 ? 'questão' : 'questões'} neste dia${d.feitas >= DIA_MINIMO ? ', o bastante para manter a sequência' : ''}.` : d.folga ? 'Dia de descanso do seu plano.' : 'Nenhuma questão neste dia. O que ficou para trás já foi redistribuído pelos próximos dias.'
    for (const a of d.areasFeitas.slice(0, 6)) linhas.push({ id: a.slug, cor: corDaArea(a.slug), titulo: `${a.n} de ${a.nome}` })
  } else if (d.folga && (!p || p.tipo === 'folga')) {
    titulo = 'Folga'
    sub = d.fase === 'hoje' ? 'Dia de descanso no seu plano. Se quiser estudar, adiante o próximo dia de estudo no cartão Hoje.' : 'Dia de descanso no seu plano: a meta foi espalhada pelos outros dias.'
  } else if (d.fase === 'hoje' && p && calculo.metaDiaria > 0 && calculo.faltaHoje === 0) {
    // Hoje, com a meta feita: o que foi feito, por área, e o que passou da meta (sai dos próximos dias).
    titulo = 'Meta de hoje feita'
    const extra = calculo.extraHoje
    sub = <>{calculo.feitasHoje} questões novas hoje: {calculo.metaDiaria} da meta{extra > 0 ? <> e <b className="cc-verde">+{extra} adiantadas</b>, que saem dos próximos dias</> : null}.</>
    for (const a of d.areasFeitas.slice(0, 6)) linhas.push({ id: a.slug, cor: corDaArea(a.slug), titulo: `${a.n} de ${a.nome}` })
    linhas.push({ id: 'extras', titulo: revisoesHoje > 0 ? `${revisoesHoje} ${revisoesHoje === 1 ? 'revisão' : 'revisões'} e flashcards` : 'Revisões e flashcards', texto: 'Se sobrar tempo; não contam na meta', opcional: true })
  } else if (p) {
    const livre = p.total === 0 && p.adiantado > 0 && !p.mini
    titulo = livre ? 'Livre: você já adiantou' : principal ? principal.nome : p.mini ? 'Mini-simulado' : 'Dia de estudo'
    const tipo = p.tipo === 'leve' ? 'Dia leve (plantão). ' : p.tipo === 'dificil' ? 'Semana difícil: só o dia mínimo. ' : ''
    const passada = principal ? `${ROTULO_PASSADA[principal.passada].nome}: ${ROTULO_PASSADA[principal.passada].texto}.` : ''
    sub = livre ? `As ${p.adiantado} questões deste dia você fez antes.` : <>{tipo}{passada}{p.adiantado > 0 ? <> <b className="cc-verde">−{p.adiantado} adiantadas</b> (eram {p.total + p.adiantado}).</> : null}</>
    if (!livre && principal) linhas.push({ id: 'resumao', titulo: `Resumão de ${principal.nome.toLowerCase()}`, texto: 'As frases "Na prova", antes das questões', minutos: MINUTOS_RESUMAO })
    for (const it of p.itens) linhas.push({ id: `${it.slug}-${it.mistura}`, cor: corDaArea(it.slug), titulo: <>{it.n} questões de {it.nome}{it.mistura && <span className="cp-tag">mistura</span>}</>, chips: it.assuntos.slice(0, 4), minutos: it.n * minutos })
    if (p.mini) linhas.push({ id: 'mini', titulo: `Mini-simulado de ${TAMANHO_MINI} questões`, texto: 'Cronometrado, do que você já viu', minutos: TAMANHO_MINI * 1.5 })
    if (!livre) linhas.push({ id: 'extras', titulo: d.fase === 'hoje' && revisoesHoje > 0 ? `${revisoesHoje} ${revisoesHoje === 1 ? 'revisão' : 'revisões'} e flashcards` : 'Revisões e flashcards', texto: 'Se sobrar tempo; não contam na meta', opcional: true })
  }
  for (const m of d.marcos) if (!titulo.includes(m)) linhas.unshift({ id: `marco-${m}`, titulo: m, texto: m.startsWith('Começa a') && m.includes('passada') ? 'Muda o nível de prioridade dos assuntos' : undefined })
  const total = linhas.filter((l) => !l.opcional).reduce((s, l) => s + (l.minutos ?? 0), 0)

  // Ações: hoje começa ou continua; os próximos dias de estudo podem ser adiantados (na ordem, como no painel).
  if (d.fase === 'hoje') {
    const falta = calculo.faltaHoje + calculo.adiantarFalta
    if (acoes.pendente) acao = <a className="cp-botao" href="#/sessao" onClick={aoFechar}>Continuar: faltam {acoes.pendente.total - acoes.pendente.feitas} questões</a>
    else if (calculo.hoje && falta > 0 && acoes.aoComecar) acao = <button type="button" className="cp-botao" onClick={() => { aoFechar(); acoes.aoComecar!() }}>{calculo.feitasHoje > 0 ? `Continuar: faltam ${falta} questões` : `Começar: ${falta} questões`}<small>~{formatarTempo(falta * minutos)}</small></button>
    else if (calculo.metaDiaria > 0 && calculo.faltaHoje === 0) acao = <p className="cc-detalhe__ok"><Icone nome="certo" tamanho={16} /> Meta de hoje feita: {calculo.metaDiaria} questões.</p>
  } else if (d.fase === 'conteudo' && p && acoes.aoAdiantar && calculo.restante > 0) {
    const proximos = calculo.dias.slice(1).filter((x) => x.meta > 0)
    const k = proximos.findIndex((x) => x.data.getTime() === d.data.getTime())
    if (k >= 0 && k < ADIANTAR_ATE) {
      const n = proximos.slice(0, k + 1).reduce((s, x) => s + x.meta, 0)
      acao = <button type="button" className="cp-botao cp-botao--ouro" disabled={acoes.salvando} onClick={() => { aoFechar(); acoes.aoAdiantar!(n); setTimeout(() => document.getElementById('adiantar')?.scrollIntoView({ block: 'center' }), 200) }}>
        {k === 0 ? `Adiantar este dia: ${n} questões` : `Adiantar até este dia: ${n} questões`}
        <small>{k === 0 ? 'Entram na sua sessão de hoje' : `Os ${k + 1} próximos dias de estudo, na ordem`} · ~{formatarTempo(n * minutos)}</small>
      </button>
    } else if (k >= ADIANTAR_ATE) acao = <p className="cc-detalhe__nota">O adiantado sai dos dias em ordem, a começar pelo próximo. Pelo calendário dá para adiantar até {ADIANTAR_ATE} dias de estudo de uma vez.</p>
  }

  return (
    <section ref={ancora} className={`cc-detalhe cc-detalhe--${estado}`} aria-live="polite" aria-labelledby="cc-detalhe-titulo" style={{ ['--cor-area' as string]: principal ? corDaArea(principal.slug) : undefined }}>
      <p className="cc-detalhe__data">{dataLonga(d.data)}{d.fase === 'hoje' && <span className="cc-detalhe__agora">hoje</span>}</p>
      <h3 id="cc-detalhe-titulo">{titulo}</h3>
      {sub && <p className="cc-detalhe__sub">{sub}</p>}
      {d.fase === 'hoje' && calculo.feitasHoje > 0 && calculo.faltaHoje > 0 && <p className="cc-detalhe__progresso"><span style={{ width: `${Math.min(100, (calculo.feitasHoje / Math.max(1, calculo.metaDiaria)) * 100)}%` }} /><b>{Math.min(calculo.feitasHoje, calculo.metaDiaria)} de {calculo.metaDiaria} feitas</b></p>}
      {linhas.length > 0 && <ul className="cc-detalhe__lista">
        {linhas.map((l) => (
          <li key={l.id} className={l.opcional ? 'cc-detalhe__item cc-detalhe__item--extra' : l.id.startsWith('marco') ? 'cc-detalhe__item cc-detalhe__item--marco' : 'cc-detalhe__item'}>
            <i style={{ background: l.cor }} aria-hidden="true" />
            <span>
              <strong>{l.titulo}</strong>
              {l.texto && <small>{l.texto}</small>}
              {l.chips && l.chips.length > 0 && <span className="cc-detalhe__chips">{l.chips.map((c) => <span key={c}>{c}</span>)}</span>}
            </span>
            {l.minutos ? <em>~{formatarTempo(l.minutos)}</em> : null}
          </li>
        ))}
      </ul>}
      {total > 0 && <p className="cc-detalhe__total">Seu dia: <b>~{formatarTempo(total)}</b></p>}
      {acao}
    </section>
  )
}

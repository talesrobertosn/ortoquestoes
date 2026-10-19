import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { Indice } from '../dados/tipos'
import { DIA_MINIMO, TAMANHO_MINI, ROTULO_PASSADA, type CalculoPlano, type DiaPlano, type Passada, type PlanoSalvo } from '../dados/planoEstudo'
import { formatarTempo } from '../dados/hubCronograma'
import { corDaArea } from '../dados/coresAreas'
import { Icone } from '../componentes/Icone'
import { chaveCivil, chaveDoDia, diaCivil } from '../util/dia'
import { faseNoCalendario, limitesCalendario, limitarData, mesCivil, selecaoNoMes, type FaseCalendario } from '../dados/calendarioCronograma'
import { usarDiaAtual } from '../util/usarDiaAtual'
import { diaCurto, textoAdiantadoDia, textoPuxar } from '../dados/frasesAdiantar'
import '../estilos/paginas/CronogramaCalendario.css'

/**
 * Calendário do cronograma (pedido do Tales, 16/10/2026): o plano inteiro num mês de
 * computador, de segunda a domingo, até a prova. Cada dia mostra a cor e o nome das
 * áreas, quantas questões, a folga, o que já foi feito, hoje, os marcos (mini-simulado,
 * passadas, reta final, prova). Tocar num dia abre o que estudar nele, com o botão de
 * começar (hoje) ou de fazer as questões dele (os próximos dias): desde 19/10/2026 o dia é
 * puxado com as suas questões, o que for feito conta para ele e o resto continua lá.
 * Os estados são os do resto do cronograma: feito (verde ✓), agora (dourado), a fazer,
 * folga (hachurado), atrasado (laranja) e marco (dourado tracejado).
 */

const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const MINUTOS_RESUMAO = 4

interface DiaCalendario {
  data: Date
  chave: string
  fase: FaseCalendario
  ehHoje: boolean
  folga: boolean
  /** Do motor: hoje e os dias de estudo até a reta final. */
  plano: DiaPlano | null
  /** O que foi feito nesse dia (respostas, por área). */
  feitas: number
  areasFeitas: Array<{ slug: string; nome: string; n: number }>
  marcos: string[]
}

const mesDe = mesCivil
const FORMATO_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const FORMATO_LONGO = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const nomeMes = (d: Date) => { const s = FORMATO_MES.format(d); return s[0].toUpperCase() + s.slice(1) }
const dataLonga = (d: Date) => FORMATO_LONGO.format(d)
const juntar = (nomes: string[]) => nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`

export interface AcoesCalendario {
  /** Começa (ou continua) a sessão de hoje. */
  aoComecar?: () => void
  /** Sessão pela metade: o link para continuar. */
  pendente?: { feitas: number; total: number } | null
  /** Puxa um dia ("AAAA-MM-DD"): abre a sessão com as questões dele, que contam para ele. */
  aoPuxar?: (dia: string) => void
  /** Hoje terminado: o próximo dia de estudo para puxar (o mesmo botão do cartão Hoje). */
  proximo?: DiaPlano | null
  salvando?: boolean
}

export type VistaCalendario = 'semana' | 'mes'
const CHAVE_VISTA = 'oq:cronograma:calendario:vista'
function lerVista(): VistaCalendario {
  try { return sessionStorage.getItem(CHAVE_VISTA) === 'mes' ? 'mes' : 'semana' } catch { return 'semana' }
}
function gravarVista(v: VistaCalendario) {
  try { sessionStorage.setItem(CHAVE_VISTA, v) } catch { /* sem armazenamento: a escolha vale só nesta tela */ }
}
/** A segunda-feira da semana (o calendário vai de segunda a domingo), sem somar horas a uma meia-noite. */
const segundaDe = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7)
const maisDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const FORMATO_DIA_MES = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })
const FORMATO_MES_CURTO = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const mesCurto = (d: Date) => FORMATO_MES_CURTO.format(d).replace('.', '')
/** "19 a 25 de outubro" ou "26 de outubro a 1 de novembro". */
function faixaDaSemana(seg: Date): string {
  const dom = maisDias(seg, 6)
  if (seg.getMonth() === dom.getMonth()) return `${seg.getDate()} a ${FORMATO_DIA_MES.format(dom)}`
  return `${FORMATO_DIA_MES.format(seg)} a ${FORMATO_DIA_MES.format(dom)}`
}

export function CalendarioCronograma({ plano, calculo, indice, respondidas, minutos, revisoesHoje = 0, acoes, aoFechar, embutido = false, nome = '' }: {
  plano: PlanoSalvo
  calculo: CalculoPlano
  indice: Indice
  respondidas: Record<string, { q?: number; historico?: Array<{ em: number }> }>
  minutos: number
  revisoesHoje?: number
  acoes: AcoesCalendario
  /** Sem ela o calendário fica na página (embutido); com ela, abre como janela. */
  aoFechar?: () => void
  /** Na página do cronograma o calendário fica sempre aberto (pedido do Tales, 16/10/2026). */
  embutido?: boolean
  /** O primeiro nome da pessoa, para a frase de abertura (vazio: a frase funciona sem ele). */
  nome?: string
}) {
  const chaveHoje = usarDiaAtual()
  const hoje = diaCivil(chaveHoje)
  const prova = diaCivil(plano.data_prova)
  const criado = diaCivil(Date.parse(plano.criado_em))
  const { inicio, primeiroMes, ultimoMes, inicial } = limitesCalendario(criado, hoje, prova)
  const primeiraSemana = segundaDe(inicio), ultimaSemana = segundaDe(prova)
  // Pedido do Tales (19/10/2026): abre na semana; um botão abre o mês inteiro na própria página.
  const [vista, definirVista] = useState<VistaCalendario>(lerVista)
  const [mes, definirMes] = useState(() => mesDe(inicial))
  const [semana, definirSemana] = useState(() => segundaDe(inicial))
  const [selecionado, definirSelecionado] = useState<string>(() => chaveCivil(inicial))
  const ontem = useRef(chaveHoje)
  const janela = useRef<HTMLDivElement>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const trocouVista = useRef(false)
  const fecharAtual = useRef(aoFechar)
  fecharAtual.current = aoFechar
  const sair = () => aoFechar?.()
  useEffect(() => {
    const seguiaHoje = selecionado === ontem.current
    ontem.current = chaveHoje
    const atual = limitarData(seguiaHoje ? hoje : diaCivil(selecionado), inicio, prova)
    definirSelecionado(chaveCivil(atual))
    definirMes(m => seguiaHoje ? mesDe(atual) : limitarData(m, primeiroMes, ultimoMes))
    definirSemana(s => seguiaHoje ? segundaDe(atual) : limitarData(s, primeiraSemana, ultimaSemana))
  }, [chaveHoje, plano.data_prova, plano.criado_em]) // preserva a navegação manual entre atualizações do plano
  const [direcao, definirDirecao] = useState<'frente' | 'tras' | null>(null)
  const fechar = useRef<HTMLButtonElement>(null)
  const detalhe = useRef<HTMLElement>(null)

  // Trocar de vista leva o foco ao título novo (quem usa leitor de tela ouve o que abriu).
  useEffect(() => {
    if (!trocouVista.current) return
    titulo.current?.focus({ preventScroll: true })
    const r = janela.current?.getBoundingClientRect()
    if (r && (r.top < 0 || r.top > innerHeight * 0.6)) janela.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }, [vista])
  function mudarVista(v: VistaCalendario) {
    trocouVista.current = true
    const sel = diaCivil(selecionado)
    if (v === 'mes') definirMes(mesDe(sel)); else definirSemana(segundaDe(sel))
    definirDirecao(null); definirVista(v); gravarVista(v)
  }

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
  }, [calculo, chaveHoje]) // eslint-disable-line react-hooks/exhaustive-deps
  const extra = plano.opcoes?.provaExtra && /^\d{4}-\d{2}-\d{2}$/.test(plano.opcoes.provaExtra.data) ? plano.opcoes.provaExtra : null

  function montarDia(data: Date): DiaCalendario {
    const chave = chaveCivil(data)
    const folga = plano.folgas.includes(data.getDay())
    const ehHoje = data.getTime() === hoje.getTime()
    const fase = faseNoCalendario(data, criado, hoje, prova, calculo.inicioRetaFinal, calculo.inicioModoProva, calculo.vespera)
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
    return { data, chave, fase, ehHoje, folga, plano: plano_, feitas: feito?.n ?? 0, areasFeitas, marcos }
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
  }, [mes, calculo, feitoPorDia, plano, chaveHoje]) // eslint-disable-line react-hooks/exhaustive-deps

  // Os sete dias da semana visível, de segunda a domingo.
  const dias7 = useMemo(() => Array.from({ length: 7 }, (_, i) => montarDia(maisDias(semana, i))), [semana, calculo, feitoPorDia, plano, chaveHoje]) // eslint-disable-line react-hooks/exhaustive-deps

  const diaSelecionado = useMemo(() => {
    const [a, m, d] = selecionado.split('-').map(Number)
    return montarDia(new Date(a, m - 1, d))
  }, [selecionado, calculo, feitoPorDia, plano, chaveHoje]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resumo do trecho visível (mês ou semana): dias de estudo, questões planejadas e feitas.
  const resumo = useMemo(() => {
    let estudo = 0, questoes = 0, feitas = 0, folgas = 0
    for (const c of vista === 'mes' ? grade : dias7) {
      if (!c || c.fase === 'antes' || c.fase === 'depois') continue
      if (rotuloEstado(c).estado === 'folga') folgas++
      if (c.plano && c.plano.tipo !== 'folga') { estudo++; questoes += c.plano.total }
      if (c.data <= hoje) feitas += c.feitas
    }
    return { estudo, questoes, feitas, folgas }
  }, [grade, dias7, vista]) // eslint-disable-line react-hooks/exhaustive-deps

  // Teclado, rolagem da página e foco: Esc fecha; o fundo não rola; o foco volta para quem abriu.
  useEffect(() => {
    if (embutido) return
    const antes = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    fechar.current?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); fecharAtual.current?.(); return }
      if (e.key !== 'Tab' || !janela.current) return
      const itens = [...janela.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]')].filter(el => el.getClientRects().length > 0)
      const primeiro = itens[0], ultimo = itens[itens.length - 1]
      if (!primeiro) return
      if (e.shiftKey && (document.activeElement === primeiro || !janela.current.contains(document.activeElement))) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && (document.activeElement === ultimo || !janela.current.contains(document.activeElement))) { e.preventDefault(); primeiro.focus() }
    }
    window.addEventListener('keydown', tecla)
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = overflow; antes?.focus?.() }
  }, [embutido])

  const noMes = vista === 'mes'
  const podeVoltar = noMes ? mes > primeiroMes : semana > primeiraSemana
  const podeAvancar = noMes ? mes < ultimoMes : semana < ultimaSemana
  function irMes(delta: number) {
    const novo = new Date(mes.getFullYear(), mes.getMonth() + delta, 1)
    if (novo < primeiroMes || novo > ultimoMes) return
    definirDirecao(delta > 0 ? 'frente' : 'tras'); definirMes(novo)
    definirSelecionado(chaveCivil(selecaoNoMes(selecionado, novo, inicio, prova)))
  }
  function irSemana(delta: number) {
    const nova = maisDias(semana, 7 * delta)
    if (nova < primeiraSemana || nova > ultimaSemana) return
    definirDirecao(delta > 0 ? 'frente' : 'tras'); definirSemana(nova)
    definirSelecionado(chaveCivil(limitarData(maisDias(diaCivil(selecionado), 7 * delta), inicio, prova)))
  }
  function escolher(d: DiaCalendario) {
    definirSelecionado(d.chave)
    // O detalhe fica embaixo (no celular, e na semana em qualquer tela): rola até ele se não estiver à vista.
    const r = detalhe.current?.getBoundingClientRect()
    const embaixo = !noMes || window.matchMedia('(max-width: 52rem)').matches
    if (embaixo && (!r || r.top > innerHeight - 120 || r.top < 0)) {
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      requestAnimationFrame(() => detalhe.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' }))
    }
  }
  function irHoje() { definirDirecao(null); definirMes(mesDe(inicial)); definirSemana(segundaDe(inicial)); definirSelecionado(chaveCivil(inicial)) }

  // Áreas do mês para a legenda.
  const areasMes = new Map<string, string>()
  for (const c of grade) for (const i of c?.plano?.itens ?? []) areasMes.set(i.slug, i.nome)

  const semanaDeHoje = segundaDe(inicial).getTime() === semana.getTime()
  const seloSemana = semanaDeHoje ? (hoje > prova ? 'Semana da prova' : 'Esta semana') : semana > segundaDe(inicial) ? (semana.getTime() === maisDias(segundaDe(inicial), 7).getTime() ? 'Próxima semana' : 'Mais adiante') : (semana.getTime() === maisDias(segundaDe(inicial), -7).getTime() ? 'Semana passada' : 'Semanas atrás')
  const explicacao = noMes
    ? <>O mês inteiro do cronograma, até a prova em <b>{FORMATO_DIA_MES.format(prova)}</b>. A barra colorida de cada dia mostra as áreas; toque num dia para ver o que estudar.</>
    : <>{nome ? `${nome}, esta` : 'Esta'} é a sua semana no cronograma. Cada dia mostra a área, quantas questões novas e o que você já fez. Toque num dia para ver o que estudar nele.</>
  const corpoId = 'cc-corpo'
  const rotuloAnterior = noMes ? 'Mês anterior' : 'Semana anterior'
  const rotuloProximo = noMes ? 'Próximo mês' : 'Próxima semana'

  const conteudo = (
      <div className="cc-janela" ref={janela}>
        <header className="cc-topo">
          <div className="cc-topo__titulo">
            <p className="cc-topo__selo"><Icone nome="calendario" tamanho={14} /> {noMes ? 'O mês inteiro' : seloSemana} · {plano.prova}</p>
            {noMes
              ? <h2 id="cc-titulo" ref={titulo} tabIndex={-1} aria-live="polite">{nomeMes(mes).replace(/ de \d+$/, '')} <span className="cc-de">de </span>{mes.getFullYear()}</h2>
              : <h2 id="cc-titulo" ref={titulo} tabIndex={-1} aria-live="polite" className="ccs-titulo">{faixaDaSemana(semana)}</h2>}
            <p className="cc-topo__resumo">
              {resumo.estudo > 0 && <span><b className="numerico">{resumo.estudo}</b> {resumo.estudo === 1 ? 'dia' : 'dias'} de estudo · <b className="numerico">{resumo.questoes.toLocaleString('pt-BR')}</b> questões novas</span>}
              {resumo.feitas > 0 && <span><b className="numerico">{resumo.feitas.toLocaleString('pt-BR')}</b> feitas</span>}
              {resumo.folgas > 0 && <span>{resumo.folgas} {resumo.folgas === 1 ? 'folga' : 'folgas'}</span>}
            </p>
          </div>
          <div className="ccs-controles">
            <div className="cc-nav">
              <button type="button" className="cc-nav__botao" onClick={() => noMes ? irMes(-1) : irSemana(-1)} disabled={!podeVoltar} aria-label={rotuloAnterior} title={rotuloAnterior}><Icone nome="esquerda" tamanho={18} /></button>
              <button type="button" className="cc-nav__hoje" onClick={irHoje}>{hoje > prova ? 'Dia da prova' : 'Hoje'}</button>
              <button type="button" className="cc-nav__botao" onClick={() => noMes ? irMes(1) : irSemana(1)} disabled={!podeAvancar} aria-label={rotuloProximo} title={rotuloProximo}><Icone nome="direita" tamanho={18} /></button>
              {!embutido && <button type="button" className="cc-fechar" ref={fechar} onClick={sair} aria-label="Fechar o calendário"><Icone nome="fechar" tamanho={18} /></button>}
            </div>
            <button type="button" className={'ccs-alternar' + (noMes ? ' ccs-alternar--voltar' : '')} onClick={() => mudarVista(noMes ? 'semana' : 'mes')} aria-expanded={noMes} aria-controls={corpoId}>
              <Icone nome={noMes ? 'cima' : 'calendario'} tamanho={18} />
              {noMes ? 'Ver só a semana' : 'Ver o mês inteiro'}
            </button>
          </div>
          <p className="ccs-explica">{explicacao}</p>
        </header>

        <div id={corpoId} className={'cc-corpo' + (noMes ? ' cc-corpo--mes' : ' cc-corpo--semana') + (trocouVista.current ? (noMes ? ' ccm-entra' : ' ccs-entra') : '')} key={vista}>
          {noMes ? <div className="cc-mes">
            <ol className="cc-semana" aria-hidden="true">{SEMANA.map((s) => <li key={s}>{s}</li>)}</ol>
            <ol key={mes.getTime()} className={'cc-grade cc-mes-grade' + (direcao ? ` cc-grade--${direcao}` : '')} aria-label={`Dias de ${nomeMes(mes)}`}>
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
          : <ol key={semana.getTime()} className={'ccs-semana' + (direcao ? ` ccs-semana--${direcao}` : '')} aria-label={`Semana de ${faixaDaSemana(semana)}`}>
              {dias7.map((d) => <CelulaSemana key={d.chave} dia={d} selecionado={d.chave === selecionado} aoEscolher={escolher} metaRevisao={calculo.metaMedia} />)}
            </ol>}
          <Detalhe ancora={detalhe} dia={diaSelecionado} calculo={calculo} plano={plano} minutos={minutos} revisoesHoje={revisoesHoje} acoes={acoes} aoFechar={sair} />
        </div>
      </div>
  )
  const classes = `cp cc cc--cronograma cc--vista-${vista}`
  if (embutido) return <section className={`${classes} cc--embutido`} id="calendario" aria-labelledby="cc-titulo">{conteudo}</section>
  return createPortal(
    <div className={classes} role="dialog" aria-modal="true" aria-labelledby="cc-titulo">
      <button type="button" className="cc-veu" aria-label="Fechar o calendário" tabIndex={-1} onClick={sair} />
      {conteudo}
    </div>,
    document.body,
  )
}

/** Que tipo de dia é (o que o plano pede), sem repetir o estado. */
function tipoDoDia(d: DiaCalendario): string {
  if (d.fase === 'antes') return 'Antes do cronograma'
  if (d.fase === 'depois') return 'Depois da prova'
  if (d.fase === 'dia-prova') return 'Dia da prova'
  if (d.fase === 'revisao') return 'Revisão forte'
  if (d.fase === 'prova') return 'Modo prova'
  if (d.fase === 'vespera') return 'Véspera da prova'
  if (d.folga && !(d.fase === 'passado' && d.feitas > 0)) return 'Dia de descanso'
  const p = d.plano
  if (p?.tipo === 'leve') return 'Dia leve'
  if (p?.tipo === 'dificil') return 'Dia mínimo'
  return 'Dia de estudo'
}

/** O selo de estado de cada dia da semana: ícone e palavra (a cor nunca fala sozinha). */
const SELO_ESTADO: Record<string, { texto: string; icone: Parameters<typeof Icone>[0]['nome'] }> = {
  hoje: { texto: 'Hoje', icone: 'alvo' },
  feito: { texto: 'Feito', icone: 'certo' },
  parcial: { texto: 'Em parte', icone: 'relogio' },
  atrasado: { texto: 'Sem estudo', icone: 'reiniciar' },
  folga: { texto: 'Folga', icone: 'lua' },
  prova: { texto: 'Prova', icone: 'bandeira' },
  reta: { texto: 'Reta final', icone: 'fogo' },
  adiantado: { texto: 'Adiantado', icone: 'raio' },
  puxado: { texto: 'Adiantado', icone: 'raio' },
}

function CelulaSemana({ dia: d, selecionado, aoEscolher, metaRevisao }: { dia: DiaCalendario; selecionado: boolean; aoEscolher: (d: DiaCalendario) => void; metaRevisao: number }) {
  const { estado, texto } = rotuloEstado(d)
  const fora = estado === 'fora'
  const passado = d.fase === 'passado' || (d.fase === 'hoje' && d.feitas > 0 && !d.plano?.itens.length)
  const partes = passado ? d.areasFeitas : (d.plano?.itens ?? []).map((i) => ({ slug: i.slug, nome: i.nome, n: i.n }))
  const areas = partes.reduce<Array<{ slug: string; nome: string; n: number }>>((acc, p) => { const a = acc.find((x) => x.slug === p.slug); if (a) a.n += p.n; else acc.push({ ...p }); return acc }, []).sort((a, b) => b.n - a.n)
  const mostrarAreas = areas.length > 0 && estado !== 'folga'
  const visiveis = areas.slice(0, 3)
  const mini = !!d.plano?.mini
  const ehHojeComMeta = estado === 'hoje' && (d.plano?.meta ?? 0) > 0
  // O número grande do dia: questões novas planejadas, ou as feitas (dias que passaram).
  let numero: string | null = null, rotulo = ''
  if (estado === 'feito' || estado === 'parcial' || (passado && d.feitas > 0)) { numero = d.feitas.toLocaleString('pt-BR'); rotulo = d.feitas === 1 ? 'feita' : 'feitas' }
  else if (ehHojeComMeta) { numero = String(d.plano!.meta); rotulo = 'questões novas' }
  else if (estado === 'futuro' && d.plano && d.plano.total > 0) { numero = String(d.plano.total); rotulo = 'questões novas' }
  else if (estado === 'puxado' && d.plano) { numero = String(d.plano.total); rotulo = 'faltam' }
  else if (estado === 'reta' && d.fase === 'revisao' && metaRevisao > 0) { numero = `~${metaRevisao}`; rotulo = 'de revisão' }
  // "A fazer" é o normal dos próximos dias: sem selo, para o olho ir ao que muda (hoje, feito, folga, prova).
  const selo = fora || estado === 'futuro' ? null : estado === 'puxado' ? { ...SELO_ESTADO.puxado, texto } : SELO_ESTADO[estado]
  const descricao = [dataLonga(d.data), selo?.texto, tipoDoDia(d), numero ? `${numero} ${rotulo}` : texto, mostrarAreas ? juntar(areas.map((a) => `${a.nome} ${a.n}`)) : '', mini ? 'mini-simulado' : '', ...d.marcos].filter(Boolean).join(', ')
  const total = areas.reduce((s, a) => s + a.n, 0)
  return (
    <li className={`ccs-dia ccs-dia--${estado}${d.ehHoje ? ' ccs-dia--atual' : ''}${selecionado ? ' ccs-dia--selecionado' : ''}${mini || d.marcos.length ? ' ccs-dia--marco' : ''}`}>
      <button type="button" onClick={() => aoEscolher(d)} aria-label={descricao} aria-pressed={selecionado} aria-current={d.ehHoje ? 'date' : undefined} disabled={fora}>
        <span className="ccs-dia__data">
          <small>{SEMANA[(d.data.getDay() + 6) % 7]}</small>
          <b className="numerico">{d.data.getDate()}</b>
          <small className="ccs-dia__mes">{mesCurto(d.data)}</small>
        </span>
        <span className="ccs-dia__meio">
          <span className="ccs-dia__etiquetas">
            {selo && <span className={`ccs-selo ccs-selo--${estado}`}><Icone nome={selo.icone} tamanho={13} />{estado === 'puxado' ? <span>{selo.texto.split(' · ')[0]} <span className="cc-junto">· {selo.texto.split(' · ')[1]}</span></span> : selo.texto}</span>}
            {!fora && <span className="ccs-dia__tipo">{tipoDoDia(d)}</span>}
            {mini && <span className="ccs-selo ccs-selo--mini"><Icone nome="estrela" tamanho={12} />Mini-simulado</span>}
          </span>
          {fora && <span className="ccs-dia__fora">{tipoDoDia(d)}</span>}
          {mostrarAreas && <ul className="ccs-dia__areas">
            {visiveis.map((a) => <li key={a.slug}><i style={{ background: corDaArea(a.slug) }} aria-hidden="true" /><span>{a.nome}</span><em>{a.n}</em></li>)}
            {areas.length > 3 && <li className="ccs-dia__mais">+ {areas.length - 3} {areas.length - 3 === 1 ? 'área' : 'áreas'}</li>}
          </ul>}
          {d.marcos.length > 0 && <span className="ccs-dia__marco"><Icone nome="bandeira" tamanho={12} />{d.marcos.join(' · ')}</span>}
          {estado === 'adiantado' && <span className="ccs-dia__nota">Você já fez as questões deste dia</span>}
        </span>
        {numero && <span className="ccs-dia__numero"><b className="numerico">{numero}</b><small>{rotulo}</small>{ehHojeComMeta && d.feitas > 0 && <em>{Math.min(d.feitas, d.plano!.meta)} já feitas</em>}{d.plano && d.plano.adiantado > 0 && d.plano.total > 0 && !d.plano.puxado && <s className="numerico" title="Antes de adiantar">{d.plano.total + d.plano.adiantado}</s>}</span>}
        {mostrarAreas && total > 0 && <span className="ccs-dia__barra" aria-hidden="true">{areas.map((a) => <i key={a.slug} style={{ flexGrow: a.n, background: corDaArea(a.slug) }} />)}</span>}
      </button>
    </li>
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
  if (p.total === 0 && (p.adiantado > 0 || !!p.puxado) && !p.mini) return { estado: 'adiantado', texto: 'adiantado' }
  // Dia puxado e começado (19/10/2026): "Adiantado · 8 de 77"; o resto continua nele.
  const adiantadoDia = textoAdiantadoDia(p)
  if (adiantadoDia) return { estado: 'puxado', texto: adiantadoDia }
  return { estado: 'futuro', texto: p.total ? `${p.total} q${p.tipo === 'leve' ? ' · leve' : p.tipo === 'dificil' ? ' · mínimo' : ''}` : p.mini ? 'mini' : '' }
}

/** O rótulo da célula no celular, onde cabe só um número ou uma palavra curta. */
function textoCurto(estado: string, texto: string): string {
  if (estado === 'atrasado') return '–'
  if (estado === 'folga' || estado === 'hoje' && texto === 'hoje') return ''
  if (estado === 'adiantado') return 'livre'
  if (estado === 'puxado') return texto.replace(/^Adiantado · (\d+) de (\d+)$/, '$1/$2')
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
    <li className={`cc-dia cc-dia--${estado}${marco ? ' cc-dia--marco' : ''}${d.plano?.adiantado ? ' cc-dia--com-adiantado' : ''}${selecionado ? ' cc-dia--selecionado' : ''}${d.ehHoje ? ' cc-dia--atual' : ''}`}>
      <button type="button" onClick={() => aoEscolher(d)} aria-label={descricao} aria-pressed={selecionado} aria-current={d.ehHoje ? 'date' : undefined} disabled={estado === 'fora'}>
        <span className="cc-dia__topo">
          <b className="cc-dia__num">{d.data.getDate()}</b>
          {estado === 'feito' && <span className="cc-dia__selo cc-dia__selo--feito" aria-hidden="true"><Icone nome="certo" tamanho={11} /></span>}
          {d.ehHoje && <span className="cc-dia__hoje">hoje</span>}
          {mini && <span className="cc-dia__selo cc-dia__selo--marco" aria-hidden="true" title="Mini-simulado">★</span>}
        </span>
        {areas.length > 0 && estado !== 'folga' && <span className="cc-dia__areas">
          {areas.slice(0, 2).map((a) => <span key={a.slug} className="cc-dia__area"><i style={{ background: corDaArea(a.slug) }} /><span>{a.nome}</span></span>)}
          {areas.length > 2 && <span className="cc-dia__area cc-dia__area--mais">+{areas.length - 2}</span>}
        </span>}
        {d.marcos.length > 0 && <span className="cc-dia__marco">{d.marcos[0]}</span>}
        <span className="cc-dia__rodape">
          {texto && <em data-curto={textoCurto(estado, texto)}><span>{texto}</span></em>}
          {d.plano && d.plano.adiantado > 0 && d.plano.total > 0 && !d.plano.puxado && <s className="numerico">{d.plano.total + d.plano.adiantado}</s>}
        </span>
        {areas.length > 0 && estado !== 'folga' && <span className="cc-dia__faixa" aria-hidden="true">{areas.map((a) => <i key={a.slug} style={{ flexGrow: a.n, background: corDaArea(a.slug) }} />)}</span>}
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
    const livre = p.total === 0 && (p.adiantado > 0 || !!p.puxado) && !p.mini
    titulo = livre ? 'Livre: você já adiantou' : principal ? principal.nome : p.mini ? 'Mini-simulado' : 'Dia de estudo'
    const tipo = p.tipo === 'leve' ? 'Dia leve (plantão). ' : p.tipo === 'dificil' ? 'Semana difícil: só o dia mínimo. ' : ''
    const passada = principal ? `${ROTULO_PASSADA[principal.passada].nome}: ${ROTULO_PASSADA[principal.passada].texto}.` : ''
    const adiantadoDia = textoAdiantadoDia(p)
    sub = livre ? `As ${p.puxado?.total ?? p.adiantado} questões deste dia você fez antes.`
      : adiantadoDia ? <><b className="cc-verde">{adiantadoDia} feitas.</b> Faltam {p.total}, que continuam aqui para você fazer quando quiser.</>
      : <>{tipo}{passada}{p.adiantado > 0 ? <> <b className="cc-verde">−{p.adiantado} adiantadas</b> (eram {p.total + p.adiantado}).</> : null}</>
    if (!livre && principal) linhas.push({ id: 'resumao', titulo: `Frases que caem de ${principal.nome.toLowerCase()}`, texto: 'As frases "Na prova", antes das questões', minutos: MINUTOS_RESUMAO })
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
    else {
      const ok = calculo.metaDiaria > 0 && calculo.faltaHoje === 0 ? <p className="cc-detalhe__ok"><Icone nome="certo" tamanho={16} /> Meta de hoje feita: {calculo.metaDiaria} questões.</p> : null
      // Hoje terminado (ou folga): o mesmo botão do cartão Hoje, para puxar o próximo dia de estudo.
      const prox = acoes.proximo
      const puxar = prox && acoes.aoPuxar ? (() => { const t = textoPuxar(prox); return <button type="button" className="cp-botao cp-botao--ouro" disabled={acoes.salvando} onClick={() => { aoFechar(); acoes.aoPuxar!(chaveCivil(prox.data)) }}>{t.rotulo}<small>{t.detalhe} · ~{formatarTempo(prox.total * minutos)}</small></button> })() : null
      if (ok || puxar) acao = <>{ok}{puxar}</>
    }
  } else if (d.fase === 'conteudo' && p && p.tipo !== 'folga' && p.total > 0 && acoes.aoPuxar) {
    // Um dia futuro: puxa as questões dele (pedido do Tales, 19/10/2026). Contam para ele, não para hoje.
    const comecado = !!textoAdiantadoDia(p)
    acao = <button type="button" className="cp-botao cp-botao--ouro" disabled={acoes.salvando} onClick={() => { aoFechar(); acoes.aoPuxar!(d.chave) }}>
      {comecado ? <>Continuar <span className="cc-junto">{diaCurto(d.data)}</span></> : <>Fazer as questões de <span className="cc-junto">{diaCurto(d.data)}</span></>}
      <small>{comecado ? `faltam ${p.total}` : `${p.total} ${p.total === 1 ? 'questão' : 'questões'}`} · ~{formatarTempo(p.total * minutos)} · contam para este dia, não para hoje</small>
    </button>
  }
  const dica = acoes.aoPuxar && (d.fase === 'hoje' || d.fase === 'conteudo') && calculo.restante > 0

  return (
    <section ref={ancora} className={`cc-detalhe cc-detalhe--${estado}`} aria-live="polite" aria-labelledby="cc-detalhe-titulo" style={{ ['--cor-area' as string]: principal ? corDaArea(principal.slug) : undefined }}>
      <div className="cc-detalhe__cabeca">
        <p className="cc-detalhe__data">{dataLonga(d.data)}{d.ehHoje && <span className="cc-detalhe__agora">hoje</span>}</p>
        <h3 id="cc-detalhe-titulo">{titulo}</h3>
        {sub && <p className="cc-detalhe__sub">{sub}</p>}
        {d.fase === 'hoje' && calculo.feitasHoje > 0 && calculo.faltaHoje > 0 && <p className="cc-detalhe__progresso"><span style={{ width: `${Math.min(100, (calculo.feitasHoje / Math.max(1, calculo.metaDiaria)) * 100)}%` }} /><b>{Math.min(calculo.feitasHoje, calculo.metaDiaria)} de {calculo.metaDiaria} feitas</b></p>}
      </div>
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
      {(total > 0 || acao || dica) && <div className="cc-detalhe__fim">
        {total > 0 && <p className="cc-detalhe__total">Seu dia: <b>~{formatarTempo(total)}</b></p>}
        {acao}
        {dica && <p className="cc-detalhe__dica"><Icone nome="raio" tamanho={14} /> Toque num dia para adiantar as questões dele. O que você fizer conta para aquele dia, e o resto continua lá.</p>}
      </div>}
    </section>
  )
}

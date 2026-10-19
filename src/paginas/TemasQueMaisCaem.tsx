import { useMemo, useRef, useState } from 'react'
import { usarPremium } from '../conta/premium'
import { usarConta } from '../conta/ContextoConta'
import { usarIndice } from '../dados/usarIndice'
import { embaralhar } from '../dados/embaralhar'
import { FILTROS_VAZIOS, type Indice } from '../dados/tipos'
import { AREAS, BASE_CONTAGEM, ROTULO_NIVEL, TOP_ASSUNTOS, areaPorId, idsDoFoco, type AreaIncidencia, type Foco, type Nivel } from '../dados/incidencia'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { usarSessao } from '../estado/sessao'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { SeloAssinante } from '../componentes/Premium'
import { IconePixel } from '../componentes/IconePixel'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/TemasQueMaisCaem.css'
import { VoltarAoTopo } from '../componentes/IndicePagina'

const QUESTOES_POR_TREINO = 20
type Respondidas = Record<string, RegistroQuestao>

interface Marca { total: number; feitas: number; acerto: number | null }
function marca(ids: string[], respondidas: Respondidas): Marca {
  let feitas = 0, certas = 0, validas = 0
  for (const id of ids) {
    const r = respondidas[id]
    if (!r) continue
    feitas++
    if (r.c === true) { certas++; validas++ } else if (r.c === false) validas++
  }
  return { total: ids.length, feitas, acerto: validas >= 5 ? Math.round((certas / validas) * 100) : null }
}

/** Não feitas primeiro, depois as erradas, depois o resto; sorteadas dentro de cada grupo. */
function ordemDeTreino(ids: string[], respondidas: Respondidas, semente: number): string[] {
  const novas = ids.filter((id) => !respondidas[id])
  const erradas = ids.filter((id) => respondidas[id]?.c === false)
  const resto = ids.filter((id) => respondidas[id] && respondidas[id].c !== false)
  return [...embaralhar(novas, semente), ...embaralhar(erradas, semente), ...embaralhar(resto, semente)].slice(0, QUESTOES_POR_TREINO)
}

/** O primeiro nome, como nos e-mails (primeiroNome de supabase/functions/_shared/cartas.ts): vazio se não parecer um nome. */
function primeiroNome(nome?: unknown): string {
  const primeiro = String(nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}

const num = (n: number) => n.toLocaleString('pt-BR')
const questoes = (n: number) => `${num(n)} ${n === 1 ? 'questão' : 'questões'}`

/**
 * O progresso da pessoa num assunto, com o tato dos e-mails (docs/emails/TOM.md):
 * abaixo de dez questões, só a marca de visto, sem número; acerto só a partir de 50%.
 */
function progresso(m: Marca): string | null {
  if (!m.feitas) return null
  if (m.feitas === m.total) return 'você fez todas'
  if (m.feitas < 10) return null
  const base = `você fez ${num(m.feitas)} de ${num(m.total)}`
  return m.acerto !== null && m.acerto >= 50 ? `${base}, ${m.acerto}% de acerto` : base
}

/**
 * Prévia de quem não assina ("mostrando mas não mostrando", Tales, 19/10/2026): o ranking das áreas
 * fica todo aberto (é informação geral) e, de cada área, os 2 assuntos de prioridade máxima que mais
 * caem aparecem inteiros. Os outros aparecem só como lugar e prioridade, sem nome e sem treino.
 */
const PREVIA_ASSUNTOS = 2
const chave = (area: string, foco: string) => `${area}|${foco}`
const porCobranca = (a: Foco, b: Foco) => (b.n ?? 0) - (a.n ?? 0)
/** Os assuntos da área do mais cobrado para o menos: prioridade primeiro, depois questões de prova. */
const emOrdem = (area: AreaIncidencia) => NIVEIS.flatMap((n) => area.focos.filter((f) => f.nivel === n).sort(porCobranca))
const LIBERADOS = new Set(AREAS.flatMap((a) => a.focos.filter((f) => f.nivel === 4).sort(porCobranca).slice(0, PREVIA_ASSUNTOS).map((f) => chave(a.id, f.nome))))
const CRIAR_CONTA = '/conta?modo=criar&voltar=%2Ftemas-que-mais-caem'

const NIVEIS: Nivel[] = [4, 3, 2, 1]
const EXPLICA_NIVEL: Record<Nivel, string> = {
  4: 'O quarto dos assuntos da área com mais questões de prova. Comece por eles.',
  3: 'O segundo quarto: ainda muito cobrados.',
  2: 'O terceiro quarto: caem de vez em quando.',
  1: 'O quarto com menos questões. Deixe para depois.',
}

/** Selo de prioridade: texto e um ícone de degraus (quantos cheios = o nível), nunca só a cor. */
function SeloNivel({ nivel }: { nivel: Nivel }) {
  return (
    <span className={`tq-nivel tq-nivel--${nivel}`}>
      <svg className="tq-nivel__icone" viewBox="0 0 16 12" width="16" height="12" aria-hidden="true" focusable="false">
        {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 4} y={9 - i * 3} width="3" height={3 + i * 3} opacity={i < nivel ? 1 : 0.28} />)}
      </svg>
      {ROTULO_NIVEL[nivel]}
    </span>
  )
}

export function TemasQueMaisCaem() {
  const { premium, logado, carregado, pagamentos_ativos } = usarPremium()
  const { sessao: sessaoConta } = usarConta()
  const { indice } = usarIndice()
  const [respondidas] = usarArmazenado<Respondidas>('respondidas', {})
  const { iniciarComAviso } = usarSessao()

  if (logado && !carregado) return <Carregando linhas={4} rotulo="Carregando" />
  if (!indice) return <Carregando linhas={6} rotulo="Carregando o ranking" />

  async function treinar(area: AreaIncidencia, foco?: Foco) {
    if (!indice) return
    const ids = ordemDeTreino(idsDoFoco(indice, area, foco), respondidas, Date.now())
    if (!ids.length) return
    const subtemas = [area.subtema, foco ? (foco.noAcervo ?? foco.nome) : undefined].filter((s): s is string => !!s)
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, temas: subtemas.length ? [] : [area.slug], subtemas, embaralhar: true, limite: ids.length }, ids))) return
    navegar('/sessao')
  }

  const nome = logado ? primeiroNome(sessaoConta?.user.user_metadata?.nome) : ''
  return <><Ranking indice={indice} respondidas={respondidas} treinar={treinar} aberto={premium} logado={logado} nome={nome} vendasAbertas={!logado || !carregado || pagamentos_ativos} /><VoltarAoTopo /></>
}

interface PropsRanking { indice: Indice; respondidas: Respondidas; treinar: (area: AreaIncidencia, foco?: Foco) => void; aberto: boolean; logado: boolean; nome: string; vendasAbertas: boolean }

/** O convite da prévia: diz o que fica para o assinante e leva aos planos, sem preço. */
function Convite({ titulo, texto, vendasAbertas }: { titulo: string; texto: string; vendasAbertas: boolean }) {
  return (
    <div className="tq-convite">
      <span className="tq-cadeado" aria-hidden="true"><span className="tq-cadeado__arco" /><span className="tq-cadeado__corpo" /></span>
      <div className="tq-convite__texto">
        <p className="tq-convite__titulo">{titulo}</p>
        <p>{texto}</p>
      </div>
      <a className="botao tq-ouro tq-convite__botao" href={href('/assinatura')}>Conhecer os planos</a>
      {!vendasAbertas && <small className="tq-convite__nota">As assinaturas abrem em breve.</small>}
    </div>
  )
}

function Ranking({ indice, respondidas, treinar, aberto, logado, nome, vendasAbertas }: PropsRanking) {
  // Questões de cada área e de cada assunto, calculadas uma vez por acervo.
  const mapa = useMemo(() => new Map(AREAS.map((a) => [a.id, { area: idsDoFoco(indice, a), focos: new Map(a.focos.map((f) => [f.nome, idsDoFoco(indice, a, f)])) }])), [indice])
  const [areaId, setAreaId] = useState(AREAS[0]?.id ?? '')
  const [tabela, setTabela] = useState(false)
  const [verTodos, setVerTodos] = useState<Record<string, boolean>>({})
  const detalheRef = useRef<HTMLDivElement>(null)

  const area = areaPorId(areaId) ?? AREAS[0]
  const nAreas = AREAS.filter((a) => !a.subtema).length
  const nAssuntos = AREAS.reduce((s, a) => s + a.focos.length, 0)
  const maxPct = Math.max(...AREAS.map((a) => a.pct ?? 0), 1)

  // Camada pessoal: só com conta e só com o que a pessoa realmente fez.
  const topTreinados = TOP_ASSUNTOS.filter((t) => (mapa.get(t.area)?.focos.get(t.nome) ?? []).some((id) => respondidas[id])).length
  const fraseTopo = logado
    ? topTreinados > 0
      ? `${nome ? `${nome}, você` : 'Você'} já treinou ${topTreinados === TOP_ASSUNTOS.length ? 'todos os' : `${topTreinados} dos`} ${TOP_ASSUNTOS.length} assuntos que mais caem na prova.`
      : `${nome ? `${nome}, que` : 'Que'} tal começar pelo primeiro dos ${TOP_ASSUNTOS.length} assuntos que mais caem?`
    : null

  function escolher(id: string) {
    setAreaId(id)
    // No celular o detalhe fica abaixo do gráfico: leva a pessoa até ele.
    requestAnimationFrame(() => {
      const el = detalheRef.current
      if (!el) return
      const topo = el.getBoundingClientRect().top
      if (topo > window.innerHeight * 0.6 || topo < 0) {
        const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' })
      }
      el.focus({ preventScroll: true })
    })
  }

  const dados = mapa.get(area.id)!
  const mArea = marca(dados.area, respondidas)
  const posicaoArea = AREAS.indexOf(area) + 1
  const maximos = area.focos.filter((f) => f.nivel === 4)
  const maximosTreinados = maximos.filter((f) => (dados.focos.get(f.nome) ?? []).some((id) => respondidas[id])).length
  const nomeAreaMin = area.nome.toLocaleLowerCase('pt-BR')
  const fraseArea = logado && maximos.length
    ? !aberto
      ? `${nome ? `${nome}, comece` : 'Comece'} pelos assuntos abertos abaixo: são os que mais caem em ${nomeAreaMin}.`
      : maximosTreinados > 0
      ? `${nome ? `${nome}, você` : 'Você'} já treinou ${maximosTreinados === maximos.length ? 'todos os' : `${maximosTreinados} dos`} ${maximos.length} assuntos que mais caem em ${nomeAreaMin}.`
      : `${nome ? `${nome}, os` : 'Os'} ${maximos.length} assuntos de prioridade máxima são o melhor ponto de partida em ${nomeAreaMin}.`
    : null
  const todosGrupos = NIVEIS.map((n) => ({ n, focos: area.focos.filter((f) => f.nivel === n).sort((a, b) => (b.n ?? 0) - (a.n ?? 0)) }))
    .filter((g) => g.focos.length)
  // As duas prioridades de cima aparecem logo; média e baixa abrem com um toque.
  const grupos = verTodos[area.id] ? todosGrupos : todosGrupos.filter((g) => g.n >= 3)
  const escondidos = todosGrupos.filter((g) => !grupos.includes(g)).reduce((s, g) => s + g.focos.length, 0)
  // Prévia: a lista da área em ordem; os liberados aparecem inteiros, o resto só como lugar e prioridade.
  const ordemArea = emOrdem(area)
  const livre = (f: Foco) => LIBERADOS.has(chave(area.id, f.nome))
  const gruposPrevia = NIVEIS.map((n) => {
    const doNivel = ordemArea.map((f, i) => ({ f, lugar: i + 1 })).filter(({ f }) => f.nivel === n)
    return { n, total: doNivel.length, livres: doNivel.filter(({ f }) => livre(f)).map(({ f }) => f), fechados: doNivel.filter(({ f }) => !livre(f)) }
  }).filter((g) => g.total)
  const nFechadosArea = ordemArea.filter((f) => !livre(f)).length
    const nFechadosTop = TOP_ASSUNTOS.filter((t) => !LIBERADOS.has(chave(t.area, t.nome))).length

  /** O botão de treino: assinante e conta grátis treinam; o visitante cria a conta antes. */
  function acaoTreino(a: AreaIncidencia, f: Foco, ids: string[], rotulo: string, curto: boolean) {
    if (!logado) return <a className="tq-acao" href={href(CRIAR_CONTA)} aria-label={`Criar conta para treinar ${rotulo}`}><span>Treinar{!curto && <span className="tq-acao__mais"> este assunto</span>}</span><Icone nome="direita" tamanho={14} /></a>
    if (!ids.length) return <span className="tq-foco__sem">Em breve</span>
    return <button type="button" className="tq-acao" onClick={() => treinar(a, f)} aria-label={curto ? `Treinar ${rotulo}` : `Treinar este assunto: ${rotulo}`}><span>Treinar{!curto && <span className="tq-acao__mais"> este assunto</span>}</span><Icone nome="direita" tamanho={14} /></button>
  }

  function linhaFoco(f: Foco) {
    const ids = dados.focos.get(f.nome) ?? []
    const mf = marca(ids, respondidas)
    const feito = logado && mf.feitas > 0
    const texto = logado ? progresso(mf) : null
    return (
      <li key={f.nome} className={'tq-foco' + (feito ? ' tq-foco--feito' : '')}>
        <span className="tq-foco__marca" aria-hidden="true">{feito ? <Icone nome="certo" tamanho={14} /> : null}</span>
        <span className="tq-foco__nome">
          <strong>{f.nome}</strong>
          <small className="tq-num">{f.n ? `${questoes(f.n)} de prova` : 'Sem contagem'}{feito && texto ? <> · <span className="tq-foco__feito">{texto}</span></> : ''}{feito ? <span className="so-leitor"> · você já treinou este assunto</span> : null}</small>
        </span>
        {acaoTreino(area, f, ids, f.nome, false)}
      </li>
    )
  }

  const trauma = areaPorId('trauma'), pediatria = areaPorId('pediatria')
  const somaPesadas = Math.round(((trauma?.pct ?? 0) + (pediatria?.pct ?? 0)) * 10) / 10

  return (
    <div className="empilha-2 tq">
      <section className="tq-heroi" aria-labelledby="tq-titulo">
        <div className="tq-heroi__texto">
          <p className="tr-heroi__selo">Temas que mais caem</p>
          <h1 id="tq-titulo">Estude primeiro o que a prova mais cobra</h1>
          <p className="tq-heroi__lead">O que as provas oficiais mais cobraram, área por área.</p>
          <p>Contamos uma por uma as <b className="numerico">{num(BASE_CONTAGEM)}</b> questões das provas oficiais (TEOT, TARO, TECOC e ENARE) que estão no acervo e separamos por área e por assunto: {nAreas} áreas, {num(nAssuntos)} assuntos.</p>
          {fraseTopo && <p className="tq-heroi__pessoal"><Icone nome="alvo" tamanho={15} /> {fraseTopo}</p>}
          {!aberto && <p className="tq-heroi__previa"><Icone nome="cadeado" tamanho={14} /><span><b>Prévia:</b> {nome ? `${nome}, você` : 'você'} vê os {PREVIA_ASSUNTOS} assuntos que mais caem de cada área. Assinando, vê todos e treina cada um.</span></p>}
        </div>
        <ol className="tq-passos" aria-label="Como usar esta página">
          <li><span className="px-numero" aria-hidden="true">1</span><span><strong>Escolha a área</strong><small>A barra mostra quanto ela pesa na prova.</small></span></li>
          <li><span className="px-numero" aria-hidden="true">2</span><span><strong>Veja os assuntos que mais caem</strong><small>Em ordem, do mais cobrado para o menos.</small></span></li>
          <li><span className="px-numero" aria-hidden="true">3</span><span><strong>Treine aquele assunto</strong><small>Um toque abre um treino com as que você ainda não fez.</small></span></li>
        </ol>
      </section>

      <section className="tq-legenda" aria-labelledby="tq-legenda-titulo">
        <h2 id="tq-legenda-titulo">Como ler a prioridade</h2>
        <p className="texto-2">Dentro de cada área, os assuntos são divididos em quatro partes iguais pela quantidade de questões de prova.</p>
        <ul className="tq-legenda__lista">
          {NIVEIS.map((n) => <li key={n}><SeloNivel nivel={n} /><span>{EXPLICA_NIVEL[n]}</span></li>)}
        </ul>
      </section>

      <section className="tq-explorar" aria-labelledby="tq-areas-titulo">
        <div className="tq-grafico">
          <header className="tq-cabeca">
            <span className="px-numero" aria-hidden="true">1</span>
            <div>
              <h2 id="tq-areas-titulo">Ranking das áreas</h2>
              <p className="texto-2">Quanto cada área ocupa das {num(BASE_CONTAGEM)} questões de prova contadas. Toque numa área para ver os assuntos dela.</p>
            </div>
          </header>
          <button type="button" className="tq-alternar" aria-pressed={tabela} onClick={() => setTabela((t) => !t)}>
            <Icone nome={tabela ? 'grafico' : 'menu'} tamanho={15} /> {tabela ? 'Ver como gráfico' : 'Ver como tabela'}
          </button>
          {tabela
            ? <table className="tq-tabela">
                <caption className="so-leitor">Questões de prova por área, da que mais cai para a que menos cai</caption>
                <thead><tr><th scope="col">Lugar</th><th scope="col">Área</th><th scope="col">Questões de prova</th><th scope="col">Da prova</th></tr></thead>
                <tbody>
                  {AREAS.map((a, i) => (
                    <tr key={a.id} aria-current={a.id === area.id ? 'true' : undefined}>
                      <td className="tq-num">{i + 1}º</td>
                      <th scope="row"><button type="button" className="tq-tabela__area" onClick={() => escolher(a.id)}>{a.nome}</button></th>
                      <td className="tq-num">{a.n !== undefined ? num(a.n) : '—'}</td>
                      <td className="tq-num">{a.pct !== undefined ? `${num(a.pct)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            : <ol className="tq-barras">
                {AREAS.map((a, i) => {
                  const atual = a.id === area.id
                  const corpo = <>
                    <span className="tq-barra__lugar numerico">{i + 1}º</span>
                    <span className="tq-barra__nome"><strong>{a.nome}</strong>{a.n !== undefined && <small className="tq-num">{questoes(a.n)}</small>}</span>
                    <span className="tq-barra__trilho" aria-hidden="true"><span className="tq-barra__marca" style={{ width: `${((a.pct ?? 0) / maxPct) * 100}%` }} /></span>
                    <span className="tq-barra__pct numerico">{a.pct !== undefined ? `${num(a.pct)}%` : ''}</span>
                  </>
                  return (
                    <li key={a.id}>
                      <button type="button" className={'tq-barra' + (atual ? ' tq-barra--atual' : '')} aria-pressed={atual} aria-controls="tq-detalhe" onClick={() => escolher(a.id)}>{corpo}</button>
                    </li>
                  )
                })}
              </ol>}
        </div>

        <div className="tq-detalhe" id="tq-detalhe" ref={detalheRef} tabIndex={-1} aria-labelledby="tq-detalhe-titulo">
          <header className="tq-cabeca">
            <span className="px-numero" aria-hidden="true">2</span>
            <div>
              <p className="tq-detalhe__sobre tq-num">{posicaoArea}º lugar{area.pct !== undefined ? ` · ${num(area.pct)}% da prova` : ''}</p>
              <h2 id="tq-detalhe-titulo">{area.nome}</h2>
              <p className="texto-2 tq-num">
                {area.n ? `${questoes(area.n)} de prova · ` : ''}{area.focos.length} assuntos
                {mArea.total ? '' : ' · sem questões no acervo ainda'}
              </p>
            </div>
          </header>
          {fraseArea && <p className="tq-detalhe__pessoal">{fraseArea}</p>}

          {aberto
            ? grupos.map((g) => (
                <div key={g.n} className="tq-grupo">
                  <div className="tq-grupo__cabeca"><SeloNivel nivel={g.n} /><small className="tq-num">{g.focos.length} {g.focos.length === 1 ? 'assunto' : 'assuntos'}</small></div>
                  <ul className="tq-focos">{g.focos.map((f) => linhaFoco(f))}</ul>
                </div>
              ))
            : <>
                {gruposPrevia.map((g) => {
                  const primeiro = g.fechados[0]?.lugar, ultimo = g.fechados[g.fechados.length - 1]?.lugar
                  return (
                    <div key={g.n} className="tq-grupo">
                      <div className="tq-grupo__cabeca"><SeloNivel nivel={g.n} /><small className="tq-num">{g.total} {g.total === 1 ? 'assunto' : 'assuntos'}{!g.livres.length && primeiro ? ` · ${primeiro === ultimo ? `${primeiro}º lugar` : `do ${primeiro}º ao ${ultimo}º`}` : ''}</small></div>
                      {g.livres.length > 0 && <ul className="tq-focos">{g.livres.map((f) => linhaFoco(f))}</ul>}
                      {g.fechados.length > 0 && <ol className={`tq-lugares tq-lugares--${g.n}`} aria-label={`${g.livres.length ? 'Os outros ' : ''}${g.fechados.length} ${g.fechados.length === 1 ? 'assunto' : 'assuntos'} de ${ROTULO_NIVEL[g.n].toLocaleLowerCase('pt-BR')}, reservados ao assinante`}>
                        {g.fechados.map(({ f, lugar }) => <li key={f.nome}><span className="tq-num">{lugar}º</span><Icone nome="cadeado" tamanho={11} /></li>)}
                      </ol>}
                    </div>
                  )
                })}
                {nFechadosArea > 0 && <Convite vendasAbertas={vendasAbertas}
                  titulo={`Os outros ${nFechadosArea} assuntos de ${nomeAreaMin}, em ordem de cobrança, são do assinante`}
                  texto="Cada um com o nome, as questões de prova e o treino em um toque." />}
              </>}
          {aberto && escondidos > 0 && <button type="button" className="tq-alternar tq-mais" onClick={() => setVerTodos((v) => ({ ...v, [area.id]: true }))}>
            <Icone nome="baixo" tamanho={15} /> Ver os outros {escondidos} assuntos (prioridade média e baixa)
          </button>}
          {aberto && mArea.total > 0 && <button type="button" className="botao tq-ouro tq-area__treinar" onClick={() => treinar(area)}><Icone nome="raio" tamanho={15} /> Treinar a área inteira</button>}
        </div>
      </section>

      <section className="tq-top" aria-labelledby="tq-top-titulo">
        <header className="tq-cabeca tq-cabeca--larga">
          <span className="px-numero" aria-hidden="true">3</span>
          <div>
            <h2 id="tq-top-titulo">Tempo curto? Os {TOP_ASSUNTOS.length} assuntos com mais questões de prova</h2>
            <p className="texto-2">Somando todas as áreas, do mais frequente para o menos.</p>
          </div>
          {!aberto && <SeloAssinante />}
        </header>
        <ol className="tq-top__lista">
          {TOP_ASSUNTOS.map((t, i) => {
            const a = areaPorId(t.area)!
            if (!aberto && !LIBERADOS.has(chave(t.area, t.nome))) return (
              <li key={`${t.area}-${t.nome}`} className="tq-top__item tq-top__item--fechado">
                <span className="tq-top__posicao tq-num">{i + 1}</span>
                <span className="tq-top__nome"><strong><Icone nome="cadeado" tamanho={13} /> Assunto do assinante</strong><small className="tq-num">{a.nome} · {questoes(t.n)} de prova</small></span>
              </li>
            )
            const foco = a.focos.find((f) => f.nome === t.nome)!
            const ids = mapa.get(a.id)?.focos.get(foco.nome) ?? []
            const m = marca(ids, respondidas)
            const feito = logado && m.feitas > 0
            return (
              <li key={`${t.area}-${t.nome}`} className={'tq-top__item' + (feito ? ' tq-top__item--feito' : '')}>
                <span className="tq-top__posicao tq-num">{i + 1}</span>
                <span className="tq-top__nome"><strong>{t.rotulo}</strong><small className="tq-num">{feito && <span className="tq-top__visto" aria-hidden="true"><Icone nome="certo" tamanho={13} /></span>}{a.nome} · {questoes(t.n)} de prova{feito && progresso(m) ? ` · ${progresso(m)}` : ''}{feito ? <span className="so-leitor"> · você já treinou este assunto</span> : null}</small></span>
                {acaoTreino(a, foco, ids, t.rotulo, true)}
              </li>
            )
          })}
        </ol>
        {!aberto && nFechadosTop > 0 && <Convite vendasAbertas={vendasAbertas}
          titulo={`Os outros ${nFechadosTop} assuntos desta lista são do assinante`}
          texto="Aqui você já vê os que também estão na prévia de cada área. Assinando, vê o nome de todos e treina cada um." />}
      </section>

      <section className="tq-proximo" aria-label="Próximos passos">
        <a className="tq-proximo__cartao" href={href('/cronograma')}>
          <IconePixel nome="planos" tamanho={44} />
          <span><strong>Siga esta ordem sem pensar</strong><small>O cronograma usa este ranking: as áreas que mais caem ganham mais espaço e cada dia começa pelo assunto de prioridade máxima. No fim, duas semanas de reta final.</small></span>
          <Icone nome="direita" tamanho={18} />
        </a>
        <a className="tq-proximo__cartao tq-proximo__cartao--simulados" href={href('/treinar?simulados=1')}>
          <IconePixel nome="simulado" tamanho={44} />
          <span><strong>OrtoQuestões Simulados</strong><small>Questões novas desses mesmos assuntos, feitas por engenharia reversa das provas reais: o mesmo padrão da banca, a partir da bibliografia. Para fixar o conteúdo, e não só decorar as provas antigas.</small></span>
          <Icone nome="direita" tamanho={18} />
        </a>
      </section>

      <section className="tq-perguntas" aria-labelledby="tq-perguntas-titulo">
        <h2 id="tq-perguntas-titulo">Perguntas rápidas</h2>
        <dl>
          <div>
            <dt>De onde vêm os números?</dt>
            <dd>Das provas oficiais que estão no acervo: TEOT, TARO, TECOC e ENARE. Entram {num(BASE_CONTAGEM)} questões, sem cópias, anuladas ou questões autorais. O número ao lado de cada assunto é quantas questões de prova dele há no acervo; a porcentagem de cada área é a parte dela nesse total.</dd>
          </div>
          <div>
            <dt>Por que trauma e pediatria pesam mais?</dt>
            <dd>Porque foram as áreas com mais questões nas provas contadas: juntas, {trauma?.nome.toLocaleLowerCase('pt-BR') ?? 'trauma'} e {pediatria?.nome.toLocaleLowerCase('pt-BR') ?? 'pediatria'} somam {num(somaPesadas)}% de tudo. Também são as áreas com mais assuntos no ranking ({trauma?.focos.length ?? 0} e {pediatria?.focos.length ?? 0}), então a cobrança se espalha por muitos temas.</dd>
          </div>
          <div>
            <dt>Isso garante o que vai cair?</dt>
            <dd>Não. O ranking mostra o que mais caiu nas provas passadas e serve para decidir por onde começar; não é previsão. Assuntos de prioridade baixa também caem, só que menos. O <a href={href('/cronograma')}>cronograma</a> já usa esta ordem e passa por todos.</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

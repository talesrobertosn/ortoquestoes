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
import { Degustacao, SeloAssinante } from '../componentes/Premium'
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

/** Linhas de enchimento da prévia: texto neutro, nunca o conteúdo real. */
const GUARDADO = ['Assunto guardado para assinantes', 'Outro assunto do ranking', 'Assunto muito cobrado', 'Mais um assunto campeão', 'Assunto da lista completa']
const AREAS_GUARDADAS = ['Área guardada', 'Outra área do ranking', 'Área da lista completa', 'Mais uma área', 'Área guardada para assinantes', 'Área do ranking', 'Mais uma área guardada', 'Outra área']

/** Quantos itens o não assinante vê antes do desfoque. */
const PREVIA_TOP = 3
/** Áreas no gráfico da prévia (as mesmas três que o pódio antigo já mostrava). */
const PREVIA_AREAS = 3

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
  const { premium, logado, carregado } = usarPremium()
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
  return <><Ranking indice={indice} respondidas={respondidas} treinar={treinar} aberto={premium} logado={logado} nome={nome} /><VoltarAoTopo /></>
}

interface PropsRanking { indice: Indice; respondidas: Respondidas; treinar: (area: AreaIncidencia, foco?: Foco) => void; aberto: boolean; logado: boolean; nome: string }

function Ranking({ indice, respondidas, treinar, aberto, logado, nome }: PropsRanking) {
  // Questões de cada área e de cada assunto, calculadas uma vez por acervo.
  const mapa = useMemo(() => new Map(AREAS.map((a) => [a.id, { area: idsDoFoco(indice, a), focos: new Map(a.focos.map((f) => [f.nome, idsDoFoco(indice, a, f)])) }])), [indice])
  const [areaId, setAreaId] = useState(AREAS[0]?.id ?? '')
  const [tabela, setTabela] = useState(false)
  const [verTodos, setVerTodos] = useState<Record<string, boolean>>({})
  const detalheRef = useRef<HTMLDivElement>(null)

  const area = (aberto ? areaPorId(areaId) : undefined) ?? AREAS[0]
  const nAreas = AREAS.filter((a) => !a.subtema).length
  const nAssuntos = AREAS.reduce((s, a) => s + a.focos.length, 0)
  const maxPct = Math.max(...AREAS.map((a) => a.pct ?? 0), 1)
  const areasVisiveis = AREAS.slice(0, aberto ? AREAS.length : PREVIA_AREAS)

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
    ? maximosTreinados > 0
      ? `${nome ? `${nome}, você` : 'Você'} já treinou ${maximosTreinados === maximos.length ? 'todos os' : `${maximosTreinados} dos`} ${maximos.length} assuntos que mais caem em ${nomeAreaMin}.`
      : `${nome ? `${nome}, os` : 'Os'} ${maximos.length} assuntos de prioridade máxima são o melhor ponto de partida em ${nomeAreaMin}.`
    : null
  const todosGrupos = NIVEIS.map((n) => ({ n, focos: area.focos.filter((f) => f.nivel === n).sort((a, b) => (b.n ?? 0) - (a.n ?? 0)) }))
    .filter((g) => g.focos.length).slice(0, aberto ? 4 : 1)
  // As duas prioridades de cima aparecem logo; média e baixa abrem com um toque.
  const grupos = verTodos[area.id] ? todosGrupos : todosGrupos.filter((g) => g.n >= 3)
  const escondidos = todosGrupos.filter((g) => !grupos.includes(g)).reduce((s, g) => s + g.focos.length, 0)

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
          {!aberto && <p className="tq-heroi__previa"><Icone nome="cadeado" tamanho={14} /> Você está vendo uma prévia. O ranking completo é do assinante.</p>}
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
              <p className="texto-2">Quanto cada área ocupa das {num(BASE_CONTAGEM)} questões de prova contadas. {aberto ? 'Toque numa área para ver os assuntos dela.' : ''}</p>
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
                  {areasVisiveis.map((a, i) => (
                    <tr key={a.id} aria-current={aberto && a.id === area.id ? 'true' : undefined}>
                      <td className="tq-num">{i + 1}º</td>
                      <th scope="row">{aberto ? <button type="button" className="tq-tabela__area" onClick={() => escolher(a.id)}>{a.nome}</button> : a.nome}</th>
                      <td className="tq-num">{a.n !== undefined ? num(a.n) : '—'}</td>
                      <td className="tq-num">{a.pct !== undefined ? `${num(a.pct)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            : <ol className="tq-barras">
                {areasVisiveis.map((a, i) => {
                  const atual = a.id === area.id
                  const corpo = <>
                    <span className="tq-barra__lugar numerico">{i + 1}º</span>
                    <span className="tq-barra__nome"><strong>{a.nome}</strong>{a.n !== undefined && <small className="tq-num">{questoes(a.n)}</small>}</span>
                    <span className="tq-barra__trilho" aria-hidden="true"><span className="tq-barra__marca" style={{ width: `${((a.pct ?? 0) / maxPct) * 100}%` }} /></span>
                    <span className="tq-barra__pct numerico">{a.pct !== undefined ? `${num(a.pct)}%` : ''}</span>
                  </>
                  return (
                    <li key={a.id}>
                      {aberto
                        ? <button type="button" className={'tq-barra' + (atual ? ' tq-barra--atual' : '')} aria-pressed={atual} aria-controls="tq-detalhe" onClick={() => escolher(a.id)}>{corpo}</button>
                        : <div className={'tq-barra tq-barra--fixa' + (atual ? ' tq-barra--atual' : '')}>{corpo}</div>}
                    </li>
                  )
                })}
              </ol>}
          {!aberto && <Degustacao className="tq-degustacao" titulo={`As outras ${AREAS.length - PREVIA_AREAS} áreas, em ordem`} texto={<p>Da quarta área que mais cai à que menos cai, com todos os assuntos de cada uma e o seu progresso.</p>} acao="Liberar o ranking das áreas">
            <ol className="tq-barras">
              {Array.from({ length: Math.min(5, AREAS.length - PREVIA_AREAS) }, (_, i) => (
                <li key={i}><div className="tq-barra tq-barra--fixa">
                  <span className="tq-barra__lugar numerico">{PREVIA_AREAS + i + 1}º</span>
                  <span className="tq-barra__nome"><strong>{AREAS_GUARDADAS[i]}</strong><small>000 questões</small></span>
                  <span className="tq-barra__trilho"><span className="tq-barra__marca" style={{ width: `${45 - i * 6}%` }} /></span>
                  <span className="tq-barra__pct numerico">0%</span>
                </div></li>
              ))}
            </ol>
          </Degustacao>}
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

          {grupos.map((g) => (
            <div key={g.n} className="tq-grupo">
              <div className="tq-grupo__cabeca"><SeloNivel nivel={g.n} /><small className="tq-num">{g.focos.length} {g.focos.length === 1 ? 'assunto' : 'assuntos'}</small></div>
              <ul className="tq-focos">
                {g.focos.map((f) => {
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
                      {!aberto
                        ? <a className="tq-acao" href={href('/assinatura')}><Icone nome="cadeado" tamanho={14} /> Treinar</a>
                        : ids.length > 0
                          ? <button type="button" className="tq-acao" onClick={() => treinar(area, f)} aria-label={`Treinar este assunto: ${f.nome}`}><span>Treinar<span className="tq-acao__mais"> este assunto</span></span><Icone nome="direita" tamanho={14} /></button>
                          : <span className="tq-foco__sem">Em breve</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {escondidos > 0 && <button type="button" className="tq-alternar tq-mais" onClick={() => setVerTodos((v) => ({ ...v, [area.id]: true }))}>
            <Icone nome="baixo" tamanho={15} /> Ver os outros {escondidos} assuntos (prioridade média e baixa)
          </button>}
          {!aberto && <p className="tq-guardado"><Icone nome="cadeado" tamanho={14} /> Os assuntos de prioridade alta, média e baixa ficam guardados para assinantes.</p>}
          {aberto && mArea.total > 0 && <button type="button" className="botao tq-area__treinar" onClick={() => treinar(area)}><Icone nome="raio" tamanho={15} /> Treinar a área inteira</button>}
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
          {TOP_ASSUNTOS.slice(0, aberto ? TOP_ASSUNTOS.length : PREVIA_TOP).map((t, i) => {
            const a = areaPorId(t.area)!
            const foco = a.focos.find((f) => f.nome === t.nome)!
            const ids = mapa.get(a.id)?.focos.get(foco.nome) ?? []
            const m = marca(ids, respondidas)
            const feito = logado && m.feitas > 0
            return (
              <li key={`${t.area}-${t.nome}`} className={'tq-top__item' + (feito ? ' tq-top__item--feito' : '')}>
                <span className="tq-top__posicao tq-num">{i + 1}</span>
                <span className="tq-top__nome"><strong>{t.rotulo}</strong><small className="tq-num">{feito && <span className="tq-top__visto" aria-hidden="true"><Icone nome="certo" tamanho={13} /></span>}{a.nome} · {questoes(t.n)} de prova{feito && progresso(m) ? ` · ${progresso(m)}` : ''}{feito ? <span className="so-leitor"> · você já treinou este assunto</span> : null}</small></span>
                {!aberto
                  ? <a className="tq-acao" href={href('/assinatura')}><Icone nome="cadeado" tamanho={14} /> Treinar</a>
                  : ids.length > 0
                    ? <button type="button" className="tq-acao" onClick={() => treinar(a, foco)} aria-label={`Treinar ${t.rotulo}`}><span>Treinar</span><Icone nome="direita" tamanho={14} /></button>
                    : <span className="tq-foco__sem">Em breve</span>}
              </li>
            )
          })}
        </ol>
        {!aberto && <Degustacao className="tq-degustacao" titulo={`Os outros ${TOP_ASSUNTOS.length - PREVIA_TOP} assuntos campeões`} texto={<p>A lista completa, com treino de cada assunto em um toque, fica guardada para assinantes.</p>} acao="Ver o ranking completo">
          <ol className="tq-top__lista" start={PREVIA_TOP + 1}>
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="tq-top__item">
                <span className="tq-top__posicao tq-num">{PREVIA_TOP + i + 1}</span>
                <span className="tq-top__nome"><strong>{GUARDADO[i % GUARDADO.length]}</strong><small>Área do assunto · 40 questões de prova</small></span>
                <span className="tq-acao">Treinar</span>
              </li>
            ))}
          </ol>
        </Degustacao>}
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

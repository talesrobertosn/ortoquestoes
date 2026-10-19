import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { usarPremium } from '../conta/premium'
import { usarConta } from '../conta/ContextoConta'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestoes } from '../dados/acervo'
import { AREAS_TREINO, FILTROS_VAZIOS, type EstadoSessao, type Questao } from '../dados/tipos'
import { CHAVE_SESSAO, usarSessao } from '../estado/sessao'
import { ler } from '../estado/armazenamento'
import { situacao as situacaoDaEdicao, segundosRestantes } from '../dados/simuladoNacional'
import {
  codigoErroSN, snCancelarInscricao, snGabarito, snIniciar, snInscrever, snObter, snRanking, snResultado,
  type EdicaoSN, type ItemGabaritoSN, type RankingSN, type ResultadoSN,
} from '../dados/apiSimuladoNacional'
import {
  alternativasDaCorrecao, contagem, dataDaEdicao, dataPorExtenso, diaDoRankingFinal, estadoDaPagina, fraseDoResultado,
  icsDaEdicao, montarSessaoNacional, nomeDaEdicao, prontidaoPorArea, tempoCurto, type EstadoPagina,
} from '../dados/provaNacional'
import { entregarNacional, registrarDepoisDaEntrega } from '../dados/entregaNacional'
import { esquecerEdicaoEmDestaque } from '../dados/nacionalEmDestaque'
import { ErroRpc } from '../servicos/supabase'
import { confirmar } from '../componentes/Confirmar'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { ConvitePremium, SeloAssinante } from '../componentes/Premium'
import { primeiroNome } from '../componentes/Cabecalho'
import { irParaSecao } from '../componentes/IndicePagina'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/SimuladoNacional.css'

/*
 * Simulado Nacional 2.0 (pedido do Tales, 19/10/2026: "não fica claro quando vai ser, por que vai
 * ser, como faz para se inscrever"). O topo responde de cara: QUANDO (as datas grandes, com a
 * contagem), O QUE É (50 questões oficiais, 2 horas, ranking), POR QUE e COMO (um botão por
 * estado). Depois: como funciona em 4 passos, o que cai, o resultado, o ranking e as dúvidas.
 */

/** As datas planejadas da edição de lançamento, para quando o banco ainda não tem a parte 32. */
export const OUTUBRO_PLANEJADO = { abre_em: '2026-10-24T08:00:00-03:00', fecha_em: '2026-10-31T23:59:59-03:00', total: 50, duracao_min: 120 }
/** Prévia da distribuição com o acervo de hoje (docs/superpowers/specs/2026-10-19-simulado-nacional-design.md). */
const DISTRIBUICAO_PREVISTA: Array<{ area: string; n: number }> = [
  { area: 'Trauma adulto', n: 10 }, { area: 'Ortopedia pediátrica', n: 9 }, { area: 'Mão e punho', n: 6 }, { area: 'Ombro e cotovelo', n: 5 },
  { area: 'Tumores', n: 4 }, { area: 'Pé e tornozelo', n: 4 }, { area: 'Coluna', n: 3 }, { area: 'Joelho', n: 3 },
  { area: 'Conceitos básicos', n: 3 }, { area: 'Quadril', n: 2 }, { area: 'Osteometabólicas', n: 1 },
]
const FILTROS_PROVA = { ...FILTROS_VAZIOS, areas: AREAS_TREINO, embaralhar: false }

/** A RPC não existe no banco (parte 32 ainda não colada): PostgREST responde 404. */
function rpcAusente(falha: unknown): boolean {
  if (falha instanceof ErroRpc) return falha.status === 404 || /could not find the function/i.test(falha.codigo)
  return falha instanceof Error && falha.message.includes('(404)')
}

const duracaoTexto = (min: number) => (min % 60 === 0 ? `${min / 60} ${min === 60 ? 'hora' : 'horas'}` : `${min} minutos`)
function duracaoProva(segundos: number) {
  const h = Math.floor(segundos / 3600), m = Math.round((segundos % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}
const mil = (n: number) => n.toLocaleString('pt-BR')
const iniciais = (apelido: string) => {
  const partes = apelido.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?'
}
/** "Simulado Nacional de outubro" (mensal) ou o título da véspera. */
function tituloGrande(ed: Pick<EdicaoSN, 'titulo' | 'tipo'>) {
  const nome = nomeDaEdicao(ed.titulo)
  if (ed.tipo === 'vespera') return nome
  const mes = nome.split(' ')[0]?.toLocaleLowerCase('pt-BR')
  return mes ? `Simulado Nacional de ${mes}` : 'Simulado Nacional'
}

/** O relógio da página, corrigido pelo relógio do servidor. */
function usarAgora(desvio: number, intervaloMs: number) {
  const [agora, definirAgora] = useState(() => Date.now() + desvio)
  useEffect(() => {
    definirAgora(Date.now() + desvio)
    const t = window.setInterval(() => definirAgora(Date.now() + desvio), intervaloMs)
    return () => window.clearInterval(t)
  }, [desvio, intervaloMs])
  return agora
}

type Carga = { tipo: 'carregando' } | { tipo: 'ok'; ed: EdicaoSN; desvio: number } | { tipo: 'chegando' } | { tipo: 'erro' }

export function SimuladoNacional({ consulta }: { consulta: URLSearchParams }) {
  const { premium, logado, carregado } = usarPremium()
  const { sessao: conta } = usarConta()
  const nome = primeiroNome(conta?.user.user_metadata?.nome)
  const { sessao, definirSessao, liberarParaNova, iniciarComAviso, encerrar } = usarSessao()
  const pedida = consulta.get('edicao')
  const [carga, definirCarga] = useState<Carga>({ tipo: 'carregando' })
  const [ocupado, definirOcupado] = useState(false)
  const [erro, definirErro] = useState('')
  const [aviso, definirAviso] = useState('')

  const carregar = useCallback(async () => {
    try {
      const ed = await snObter(pedida, { logado })
      if (!ed?.edicao) { definirCarga({ tipo: 'chegando' }); return }
      definirCarga({ tipo: 'ok', ed, desvio: ed.agora ? Date.parse(ed.agora) - Date.now() : 0 })
    } catch (falha) {
      definirCarga(rpcAusente(falha) ? { tipo: 'chegando' } : { tipo: 'erro' })
    }
  }, [pedida, logado])
  useEffect(() => { void carregar() }, [carregar])

  const ed = carga.tipo === 'ok' ? carga.ed : null
  const agora = usarAgora(carga.tipo === 'ok' ? carga.desvio : 0, 15_000)
  const estado: EstadoPagina | null = ed ? estadoDaPagina(ed, { logado, premium }, agora) : null

  // Prova entregue pelo relógio (ou em outro aparelho): o histórico local recebe a correção e a sessão daqui fecha.
  const edicaoId = ed?.edicao ?? null
  const entregueNoServidor = !!ed?.minha?.entregue_em
  useEffect(() => {
    if (!edicaoId || !entregueNoServidor || !ed?.minha) return
    const local = ler<EstadoSessao | null>(CHAVE_SESSAO, null)
    void registrarDepoisDaEntrega(edicaoId, local, { acertos: ed.minha.acertos ?? 0, total: ed.minha.total ?? 0, segundos: ed.minha.segundos ?? 0 })
    if (local?.nacional === edicaoId) encerrar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId, entregueNoServidor])

  // Tempo acabou sem entrega (aba fechada), ou a prova acabou aqui e a entrega não chegou: entrega agora.
  const pendenteAqui = !!edicaoId && sessao?.nacional === edicaoId && !!sessao.concluidaEm && estado === 'continuar'
  const precisaEntregar = estado === 'entregando' || pendenteAqui
  const [entrega, definirEntrega] = useState<'enviando' | 'erro' | null>(null)
  const entregar = useCallback(() => {
    if (!edicaoId) return
    definirEntrega('enviando')
    entregarNacional(edicaoId, ler<EstadoSessao | null>(CHAVE_SESSAO, null))
      .then(() => { definirEntrega(null); esquecerEdicaoEmDestaque(); if (ler<EstadoSessao | null>(CHAVE_SESSAO, null)?.nacional === edicaoId) encerrar(); void carregar() })
      .catch(() => definirEntrega('erro'))
  }, [edicaoId, carregar, encerrar])
  useEffect(() => {
    if (precisaEntregar && entrega === null) entregar()
    // Só ao ficar pendente: tentar de novo depois de uma falha é do botão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precisaEntregar])

  async function abrirProva(retomar: boolean) {
    if (!ed?.edicao || ocupado) return
    if (!retomar && !(await confirmar({
      titulo: 'Começar a prova agora?',
      texto: `São ${ed.total ?? 50} questões e ${duracaoTexto(ed.duracao_min ?? 120)} no relógio, a partir de agora. O tempo não para se você fechar a aba. As respostas são salvas sozinhas e você pode continuar em outro aparelho. O gabarito aparece depois de entregar.`,
      sim: 'Começar agora',
      nao: 'Ainda não',
    }))) return
    if (!(await liberarParaNova({ nacional: ed.edicao }))) return
    definirOcupado(true); definirErro('')
    try {
      const inicio = await snIniciar(ed.edicao)
      definirSessao(montarSessaoNacional(inicio, ler<EstadoSessao | null>(CHAVE_SESSAO, null), FILTROS_PROVA))
      esquecerEdicaoEmDestaque()
      navegar('/sessao')
    } catch (falha) {
      const codigo = codigoErroSN(falha)
      definirErro(
        codigo === 'premium_necessario' ? 'Esta edição é para assinantes.'
          : codigo === 'edicao_nao_aberta' ? `A prova abre ${dataPorExtenso(ed.abre_em!)}.`
          : codigo === 'edicao_fechada' ? 'Esta edição já encerrou.'
          : codigo === 'ja_entregue' ? 'Você já entregou esta prova. O resultado está abaixo.'
          : 'Não foi possível abrir a prova agora. Confira a conexão e tente de novo.')
      void carregar()
    } finally { definirOcupado(false) }
  }

  async function inscrever() {
    if (!ed?.edicao || ocupado) return
    definirOcupado(true); definirErro('')
    try {
      const r = await snInscrever(ed.edicao)
      definirCarga((c) => (c.tipo === 'ok' ? { ...c, ed: { ...c.ed, minha_inscricao: r.inscrito_em ?? new Date().toISOString(), inscritos: r.inscritos } } : c))
      definirAviso(`Inscrição confirmada${nome ? `, ${nome}` : ''}. A gente avisa por e-mail na véspera e no dia.`)
      esquecerEdicaoEmDestaque()
    } catch (falha) {
      definirErro(codigoErroSN(falha) === 'edicao_fechada' ? 'As inscrições desta edição encerraram.' : 'Não foi possível confirmar a inscrição agora. Tente de novo em instantes.')
    } finally { definirOcupado(false) }
  }

  async function cancelarInscricao() {
    if (!ed?.edicao || ocupado) return
    if (!(await confirmar({ titulo: 'Cancelar a inscrição?', texto: 'Você deixa de receber os avisos por e-mail. Dá para se inscrever de novo até a prova fechar.', sim: 'Cancelar a inscrição', nao: 'Manter' }))) return
    definirOcupado(true); definirErro('')
    try {
      const r = await snCancelarInscricao(ed.edicao)
      definirCarga((c) => (c.tipo === 'ok' ? { ...c, ed: { ...c.ed, minha_inscricao: null, inscritos: r.inscritos } } : c))
      definirAviso('')
      esquecerEdicaoEmDestaque()
    } catch { definirErro('Não foi possível cancelar agora. Tente de novo em instantes.') } finally { definirOcupado(false) }
  }

  /** Uma sessão de treino comum (com gabarito e comentário) só com as questões escolhidas. */
  async function treinar(ids: string[]) {
    if (!ids.length) return
    if (await iniciarComAviso(FILTROS_PROVA, ids)) navegar('/sessao')
  }

  if (carga.tipo === 'carregando' || (logado && !carregado)) return <Carregando linhas={6} rotulo="Carregando o Simulado Nacional" />
  if (carga.tipo === 'erro') return (
    <Estado titulo="Não foi possível carregar o Simulado Nacional." acoes={<button type="button" className="botao botao--principal" onClick={() => void carregar()}>Tentar de novo</button>}>
      <p>Confira a conexão. Se você estava no meio da prova, as respostas continuam salvas.</p>
    </Estado>
  )
  if (carga.tipo === 'chegando' || !ed || !estado) return <Chegando logado={logado} nome={nome} />

  const restanteProva = ed.minha && estado === 'continuar' ? segundosRestantes(ed.minha.prazo_em, agora) : 0
  const abriu = agora >= Date.parse(ed.abre_em!)
  const encerrada = agora > Date.parse(ed.fecha_em!)
  const comResultado = estado === 'resultado'

  return (
    <div className="snx">
      <Heroi ed={ed} estado={estado} agora={agora} nome={nome} restante={restanteProva} ocupado={ocupado} erro={erro} aviso={aviso}
        entrega={precisaEntregar ? entrega ?? 'enviando' : null}
        aoComecar={() => void abrirProva(false)} aoContinuar={() => void abrirProva(true)} aoInscrever={() => void inscrever()}
        aoCancelar={() => void cancelarInscricao()} aoEntregar={entregar} />

      {estado === 'assinar' && (
        <ConvitePremium variante="faixa" icone="trofeu" titulo="Esta edição é para assinantes"
          texto={<p>A prova, a correção comentada e a sua posição no ranking vêm com o plano. Sem assinar, você vê a distribuição das áreas e o ranking.</p>} />
      )}

      {comResultado && <Resultado ed={ed} nome={nome} aoTreinar={treinar} />}

      <ComoFunciona abreEm={ed.abre_em!} fechaEm={ed.fecha_em!} duracaoMin={ed.duracao_min ?? 120} />

      <OQueCai porArea={ed.por_area} total={ed.total ?? 0} />

      {(abriu || comResultado) && <Ranking ed={ed} logado={logado} encerrada={encerrada} />}

      {logado && <Evolucao ed={ed} />}

      <Duvidas abertoATodos={!!ed.aberto_a_todos} fechaEm={ed.fecha_em!} duracaoMin={ed.duracao_min ?? 120} />

      {(ed.tambem_no_ar.length > 0 || pedida || ed.anteriores.some((a) => a.edicao !== '2026-10-antiga')) && (
        <nav className="snx-edicoes" aria-label="Outras edições">
          <span>Outras edições:</span>
          {pedida && <a href={href('/simulado-nacional')}>A edição em destaque</a>}
          {ed.tambem_no_ar.map((t) => <a key={t.edicao} href={href(`/simulado-nacional?edicao=${t.edicao}`)}>{nomeDaEdicao(t.titulo)} · no ar</a>)}
          {ed.anteriores.filter((a) => a.edicao !== '2026-10-antiga').map((a) => <a key={a.edicao} href={href(`/simulado-nacional?edicao=${a.edicao}`)}>{nomeDaEdicao(a.titulo)}</a>)}
        </nav>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Topo: quando, o que é, por que e o botão
// ---------------------------------------------------------------------------

function Heroi({ ed, estado, agora, nome, restante, ocupado, erro, aviso, entrega, aoComecar, aoContinuar, aoInscrever, aoCancelar, aoEntregar }: {
  ed: EdicaoSN; estado: EstadoPagina; agora: number; nome: string; restante: number; ocupado: boolean; erro: string; aviso: string
  entrega: 'enviando' | 'erro' | null
  aoComecar: () => void; aoContinuar: () => void; aoInscrever: () => void; aoCancelar: () => void; aoEntregar: () => void
}) {
  const abre = ed.abre_em!, fecha = ed.fecha_em!
  const total = ed.total ?? 50
  const duracao = duracaoTexto(ed.duracao_min ?? 120)
  const fim = dataDaEdicao(fecha)
  const voce = (frase: string) => (nome ? `${nome}, ${frase}` : frase.charAt(0).toUpperCase() + frase.slice(1))
  const s = situacaoDaEdicao({ abre_em: abre, fecha_em: fecha, minha: null }, agora)

  const status: string = (() => {
    switch (estado) {
      case 'inscrito': return aviso || `${voce(`a prova abre em ${contagem(Date.parse(abre) - agora)}.`)} A gente avisa por e-mail na véspera e no dia.`
      case 'comecar': return `${voce('a prova está no ar.')} Comece quando quiser, até ${fim.semana}, ${fim.data}, às ${fim.hora}.`
      case 'continuar': return `${voce('sua prova está em andamento:')} ${ed.minha?.respondidas ?? 0} de ${total} respondidas.`
      case 'entregando': return 'O tempo da sua prova acabou. Ela está sendo entregue com as respostas salvas.'
      case 'resultado': return `${voce('prova entregue.')} O seu resultado está logo abaixo.`
      case 'encerrada': return `Esta edição encerrou. ${ed.participantes ? `${mil(ed.participantes)} pessoas entregaram a prova.` : 'O ranking final está abaixo.'}`
      default: return s === 'em-breve'
        ? `${voce(`a prova abre em ${contagem(Date.parse(abre) - agora)}.`)} Inscreva-se para receber o aviso.`
        : `${voce('a prova está no ar.')} Dá tempo até ${fim.semana}, ${fim.data}, às ${fim.hora}.`
    }
  })()

  const acao: ReactNode = (() => {
    switch (estado) {
      case 'visitante': return (
        <>
          <a className="botao snx-botao" href={href('/conta?modo=criar&voltar=%2Fsimulado-nacional')}><Icone nome="raio" tamanho={18} /> Criar conta grátis e participar</a>
          <a className="snx-link" href={href('/conta?modo=entrar&voltar=%2Fsimulado-nacional')}>Já tenho conta · Entrar</a>
        </>
      )
      case 'inscrever': return <button type="button" className="botao snx-botao" onClick={aoInscrever} disabled={ocupado}><Icone nome="certo" tamanho={18} /> {ocupado ? 'Inscrevendo…' : 'Quero participar'}</button>
      case 'inscrito': {
        const d = dataDaEdicao(abre)
        return (
          <>
            <p className="snx-inscrito" role="status"><Icone nome="certo" tamanho={18} /> <span>Inscrição confirmada · abre {d.semana}, {d.data}, às {d.hora}</span></p>
            <button type="button" className="botao snx-vidro" onClick={() => baixarIcs(ed)}><Icone nome="calendario" tamanho={16} /> Adicionar ao calendário</button>
            <button type="button" className="snx-link snx-link--discreto" onClick={aoCancelar} disabled={ocupado}>Cancelar a inscrição</button>
          </>
        )
      }
      case 'assinar': return <a className="botao snx-botao" href={href('/assinatura')}><Icone nome="cadeado" tamanho={18} /> Conhecer os planos</a>
      case 'comecar': return <button type="button" className="botao snx-botao" onClick={aoComecar} disabled={ocupado}><Icone nome="relogio" tamanho={18} /> {ocupado ? 'Preparando a prova…' : 'Começar a prova'}</button>
      case 'continuar': return <button type="button" className="botao snx-botao" onClick={aoContinuar} disabled={ocupado}><Icone nome="direita" tamanho={18} /> {ocupado ? 'Abrindo…' : `Continuar a prova · ${tempoCurto(restante)} restantes`}</button>
      case 'entregando': return entrega === 'erro'
        ? <button type="button" className="botao snx-botao" onClick={aoEntregar}><Icone nome="reiniciar" tamanho={18} /> Tentar entregar de novo</button>
        : <p className="snx-inscrito" role="status"><Icone nome="relogio" tamanho={18} /> <span>Entregando suas respostas…</span></p>
      case 'resultado': return <button type="button" className="botao snx-botao" onClick={() => { const el = document.getElementById('snx-resultado'); if (el) irParaSecao(el) }}><Icone nome="trofeu" tamanho={18} /> Ver meu resultado</button>
      case 'encerrada': return <button type="button" className="botao snx-botao" onClick={() => { const el = document.getElementById('snx-ranking'); if (el) irParaSecao(el) }}><Icone nome="trofeu" tamanho={18} /> Ver o ranking final</button>
    }
  })()

  return (
    <section className="snx-heroi" aria-labelledby="snx-titulo">
      <div className="snx-heroi__texto">
        <p className="tr-heroi__selo">Simulado Nacional · {nomeDaEdicao(ed.titulo)}</p>
        <h1 id="snx-titulo">{tituloGrande(ed)}</h1>
        <p className="snx-heroi__oque"><strong>{total} questões oficiais do TEOT e do TARO</strong>, no peso do que mais cai · <strong>{duracao}</strong> · <strong>ranking nacional</strong></p>
        <p className="snx-heroi__porque">Para treinar a prova de verdade, com tempo e ranking, e saber onde você está.</p>
        <p className="snx-heroi__badges">
          {ed.aberto_a_todos
            ? <span className="snx-badge"><Icone nome="estrela" tamanho={14} /> Edição de lançamento: aberta a todos com conta grátis</span>
            : <span className="snx-badge snx-badge--plano"><SeloAssinante texto="Para assinantes" /></span>}
          {ed.inscritos != null && <span className="snx-contador"><Icone nome="grupo" tamanho={14} /> <b className="snx-num">{mil(ed.inscritos)}</b> inscritos</span>}
          {ed.participantes != null && <span className="snx-contador"><Icone nome="certo" tamanho={14} /> <b className="snx-num">{mil(ed.participantes)}</b> já entregaram</span>}
        </p>
        <p className="snx-heroi__status">{status}</p>
        <div className="snx-heroi__acao">{acao}</div>
        {erro && <p className="snx-heroi__erro" role="alert">{erro}</p>}
      </div>
      <Bilhete abreEm={abre} fechaEm={fecha} agora={agora} estado={estado} restante={restante} />
    </section>
  )
}

/** O bilhete do topo: as duas datas grandes, o horário de Brasília e a contagem. */
function Bilhete({ abreEm, fechaEm, agora, estado, restante }: { abreEm: string; fechaEm: string; agora: number; estado: EstadoPagina | 'chegando'; restante: number }) {
  const abre = dataDaEdicao(abreEm), fecha = dataDaEdicao(fechaEm)
  const antes = agora < Date.parse(abreEm)
  const depois = agora > Date.parse(fechaEm)
  const conta = estado === 'continuar' ? { rotulo: 'Sua prova', valor: `${tempoCurto(restante)} restantes` }
    : estado === 'chegando' ? { rotulo: 'Previsto', valor: 'inscrições em breve' }
    : antes ? { rotulo: 'Abre em', valor: contagem(Date.parse(abreEm) - agora) }
    : depois ? { rotulo: 'Ranking final', valor: diaDoRankingFinal(fechaEm) }
    : { rotulo: 'Termina em', valor: contagem(Date.parse(fechaEm) - agora) }
  return (
    <aside className="snx-bilhete" aria-label="Quando é a prova">
      <p className="snx-bilhete__rotulo">Quando · horário de Brasília</p>
      <div className="snx-bilhete__datas">
        <div className="snx-bilhete__data">
          <span className="snx-bilhete__quando">Abre</span>
          <strong className="snx-num">{abre.semana}, {abre.data}</strong>
          <span className="snx-bilhete__hora snx-num">{abre.hora}</span>
        </div>
        <span className="snx-bilhete__seta" aria-hidden="true"><Icone nome="direita" tamanho={20} /></span>
        <div className="snx-bilhete__data">
          <span className="snx-bilhete__quando">Fecha</span>
          <strong className="snx-num">{fecha.semana}, {fecha.data}</strong>
          <span className="snx-bilhete__hora snx-num">{fecha.hora}</span>
        </div>
      </div>
      <p className="snx-bilhete__nota">Você escolhe a hora de começar dentro da semana; o ranking final sai em {diaDoRankingFinal(fechaEm)}.</p>
      <p className="snx-bilhete__contagem" aria-live="off"><span>{conta.rotulo}</span><b className="snx-num">{conta.valor}</b></p>
    </aside>
  )
}

function baixarIcs(ed: EdicaoSN) {
  if (!ed.edicao || !ed.abre_em || !ed.fecha_em) return
  const url = window.location.href.split('#')[0] + href('/simulado-nacional')
  const texto = icsDaEdicao({ edicao: ed.edicao, titulo: ed.titulo ?? 'Simulado Nacional', abre_em: ed.abre_em, fecha_em: ed.fecha_em, duracao_min: ed.duracao_min ?? 120 }, url)
  const blob = new Blob([texto], { type: 'text/calendar;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `simulado-nacional-${ed.edicao}.ics`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

// ---------------------------------------------------------------------------
// Como funciona e o que cai
// ---------------------------------------------------------------------------

function ComoFunciona({ abreEm, fechaEm, duracaoMin }: { abreEm: string; fechaEm: string; duracaoMin: number }) {
  const abre = dataDaEdicao(abreEm), fecha = dataDaEdicao(fechaEm)
  const passos: Array<{ icone: NomeIcone; titulo: string; texto: string }> = [
    { icone: 'correio', titulo: 'Inscreva-se', texto: 'Um toque em "Quero participar". A gente avisa por e-mail na véspera e no dia em que a prova abre.' },
    { icone: 'calendario', titulo: 'No dia, comece quando quiser', texto: `A prova fica aberta de ${abre.semana}, ${abre.data}, às ${abre.hora}, até ${fecha.semana}, ${fecha.data}, às ${fecha.hora}. Escolha um horário tranquilo da semana.` },
    { icone: 'relogio', titulo: `${duracaoTexto(duracaoMin)} no relógio`, texto: 'Sem gabarito durante a prova. Cada marcação é salva sozinha no servidor, e dá para trocar de aparelho no meio.' },
    { icone: 'trofeu', titulo: 'Entregue e veja tudo', texto: `Na hora: a nota, a correção comentada de cada questão e a sua posição. O ranking final sai em ${diaDoRankingFinal(fechaEm)}.` },
  ]
  return (
    <section className="snx-secao snx-como" aria-labelledby="snx-como-titulo">
      <header className="snx-secao__cabeca">
        <h2 id="snx-como-titulo">Como funciona</h2>
        <p>Quatro passos, do convite ao ranking.</p>
      </header>
      <ol className="snx-passos">
        {passos.map((p, i) => (
          <li key={p.titulo} className="snx-passo">
            <span className="snx-passo__topo">
              <span className="px-numero snx-passo__n" aria-hidden="true">{i + 1}</span>
              <span className="snx-passo__icone" aria-hidden="true"><Icone nome={p.icone} tamanho={20} /></span>
            </span>
            <strong>{p.titulo}</strong>
            <span>{p.texto}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Barras horizontais de uma cor só (dataviz: magnitude de uma série), com a tabela ao lado. */
function OQueCai({ porArea, total, previa = false }: { porArea: Array<{ area: string; n: number }>; total: number; previa?: boolean }) {
  const [tabela, definirTabela] = useState(false)
  const areas = [...porArea].sort((a, b) => b.n - a.n || a.area.localeCompare(b.area, 'pt-BR'))
  const soma = total || areas.reduce((s, a) => s + a.n, 0)
  const maior = Math.max(1, ...areas.map((a) => a.n))
  return (
    <section className="snx-secao snx-cai" aria-labelledby="snx-cai-titulo">
      <header className="snx-secao__cabeca snx-secao__cabeca--linha">
        <div>
          <h2 id="snx-cai-titulo">O que cai nesta edição</h2>
          <p>Na proporção do que mais caiu nas provas oficiais do TEOT e do TARO, com peso maior para os últimos 5 anos.{previa ? ' Prévia com o acervo de hoje: a conta é refeita quando a edição é montada.' : ''}</p>
        </div>
        {areas.length > 0 && <button type="button" className="snx-alternar" aria-pressed={tabela} onClick={() => definirTabela((t) => !t)}><Icone nome={tabela ? 'grafico' : 'menu'} tamanho={15} /> {tabela ? 'Ver as barras' : 'Ver em tabela'}</button>}
      </header>
      {areas.length === 0 ? <p className="snx-vazio">A lista das áreas aparece quando a edição for montada.</p> : tabela ? (
        <table className="snx-tabela">
          <caption className="so-leitor">Questões por área nesta edição</caption>
          <thead><tr><th scope="col">Área</th><th scope="col">Questões</th><th scope="col">Parte da prova</th></tr></thead>
          <tbody>{areas.map((a) => <tr key={a.area}><th scope="row">{a.area}</th><td className="snx-num">{a.n}</td><td className="snx-num">{soma ? Math.round((a.n / soma) * 100) : 0}%</td></tr>)}</tbody>
        </table>
      ) : (
        <ul className="snx-barras">
          {areas.map((a) => (
            <li key={a.area} title={`${a.area}: ${a.n} ${a.n === 1 ? 'questão' : 'questões'} (${soma ? Math.round((a.n / soma) * 100) : 0}% da prova)`}>
              <span className="snx-barras__nome">{a.area}</span>
              <span className="snx-barras__trilho" aria-hidden="true"><span style={{ '--w': `${(a.n / maior) * 100}%` } as CSSProperties} /></span>
              <b className="snx-num">{a.n}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

type FiltroCorrecao = 'todas' | 'rever' | 'certas'

function Resultado({ ed, nome, aoTreinar }: { ed: EdicaoSN; nome: string; aoTreinar: (ids: string[]) => void }) {
  const { indice } = usarIndice()
  const [resultado, definirResultado] = useState<ResultadoSN | null>(null)
  const [gabarito, definirGabarito] = useState<ItemGabaritoSN[] | null>(null)
  const [questoes, definirQuestoes] = useState<Map<string, Questao> | null>(null)
  const [falhou, definirFalhou] = useState(false)
  const [filtro, definirFiltro] = useState<FiltroCorrecao>('todas')
  const edicao = ed.edicao!

  const buscar = useCallback(() => {
    definirFalhou(false)
    Promise.all([snResultado(edicao), snGabarito(edicao)])
      .then(([r, g]) => { definirResultado(r); definirGabarito([...g].sort((a, b) => a.ordem - b.ordem)) })
      .catch(() => definirFalhou(true))
  }, [edicao])
  useEffect(() => { buscar() }, [buscar])
  useEffect(() => {
    if (!indice || !gabarito) return
    let vivo = true
    carregarQuestoes(indice, gabarito.map((g) => g.id_questao)).then((lista) => { if (vivo) definirQuestoes(new Map(lista.map((q) => [q.id, q]))) }).catch(() => {})
    return () => { vivo = false }
  }, [indice, gabarito])

  const temaDe = useMemo(() => {
    const mapa = new Map<string, { nome: string; slug: string }>()
    for (const q of indice?.questoes ?? []) { const t = indice!.temas[q.t]; if (t) mapa.set(q.id, { nome: t.nome, slug: t.slug }) }
    return mapa
  }, [indice])
  const slugDaArea = useMemo(() => new Map(indice?.temas.map((t) => [t.nome, t.slug]) ?? []), [indice])

  if (falhou) return (
    <section className="snx-secao" id="snx-resultado"><p className="snx-vazio">Não foi possível carregar o seu resultado agora. <button type="button" className="snx-link snx-link--tinta" onClick={buscar}>Tentar de novo</button></p></section>
  )
  if (!resultado || !gabarito) return <section className="snx-secao" id="snx-resultado"><Carregando linhas={4} rotulo="Carregando o seu resultado" /></section>

  const nota = resultado.total ? Math.round((resultado.acertos / resultado.total) * 100) : 0
  const areas = prontidaoPorArea(resultado.por_area)
  const fortes = areas.filter((a) => a.estado === 'pronto')
  const rever = areas.filter((a) => a.estado === 'reforcar').reverse()
  const paraRever = gabarito.filter((g) => g.marcada !== g.gabarito).map((g) => g.id_questao)
  const certas = gabarito.length - paraRever.length
  const brancas = gabarito.filter((g) => !g.marcada).length
  const diferenca = resultado.media != null ? Math.round(nota - resultado.media) : null
  const finalEm = diaDoRankingFinal(ed.fecha_em!)

  return (
    <section className="snx-secao snx-resultado" id="snx-resultado" aria-labelledby="snx-resultado-titulo">
      <header className="snx-secao__cabeca">
        <h2 id="snx-resultado-titulo">{nome ? `${nome}, o seu resultado` : 'O seu resultado'}</h2>
        <p>Entregue em {new Date(resultado.entregue_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}{resultado.encerrada ? ' · edição encerrada, posição final' : ` · posição parcial, o ranking final sai em ${finalEm}`}.</p>
      </header>

      <div className="snx-placar">
        <div className="snx-placar__nota">
          <strong className="snx-num">{resultado.acertos}</strong>
          <span>de {resultado.total} acertos</span>
          {nota >= 50 && <small className="snx-num">{nota}% de acerto</small>}
        </div>
        <dl className="snx-placar__dados">
          <div className="snx-placar__destaque">
            <dt>{resultado.encerrada ? 'Posição final' : 'Posição agora'}</dt>
            <dd>{resultado.posicao ? <><span className="snx-num">{resultado.posicao}<span className="snx-ordinal">º</span></span><small> de {mil(resultado.colocados)}</small></> : resultado.no_tempo === false ? 'Fora do ranking' : '—'}</dd>
          </div>
          <div><dt>Seu tempo</dt><dd className="snx-num">{duracaoProva(resultado.segundos)}</dd></div>
          {resultado.media != null && <div><dt>Média da edição</dt><dd><span className="snx-num">{Math.round(resultado.media)}%</span>{diferenca != null && diferenca >= 1 && <small className="snx-acima"> você, {diferenca} {diferenca === 1 ? 'ponto' : 'pontos'} acima</small>}</dd></div>}
          {resultado.percentil != null && resultado.percentil >= 50 && <div><dt>À frente de</dt><dd><span className="snx-num">{resultado.percentil}%</span><small> de quem entregou</small></dd></div>}
        </dl>
        <p className="snx-placar__conta">
          <span className="snx-conta snx-conta--certa"><Icone nome="certo" tamanho={14} /> {certas} {certas === 1 ? 'certa' : 'certas'}</span>
          <span className="snx-conta snx-conta--errada"><Icone nome="errado" tamanho={14} /> {paraRever.length - brancas} {paraRever.length - brancas === 1 ? 'errada' : 'erradas'}</span>
          {brancas > 0 && <span className="snx-conta">{brancas} em branco</span>}
        </p>
        {resultado.no_tempo === false && <p className="snx-placar__aviso">A entrega passou do tempo da prova: a nota vale para você, mas não entra no ranking.</p>}
      </div>

      {areas.length > 0 && (
        <div className="snx-prontidao">
          <p className="snx-prontidao__frase">{fraseDoResultado(areas, nome)}</p>
          <div className="snx-prontidao__colunas">
            <div className="snx-prontidao__grupo snx-prontidao__grupo--forte">
              <h3><Icone nome="certo" tamanho={16} /> Pontos fortes</h3>
              {fortes.length ? <ul>{fortes.map((a) => <li key={a.area}><span>{a.area}</span><b className="snx-num">{a.certas} de {a.total}</b></li>)}</ul> : <p>Os pontos fortes aparecem aqui conforme as áreas passam de 70% e da média.</p>}
            </div>
            <div className="snx-prontidao__grupo snx-prontidao__grupo--rever">
              <h3><Icone nome="alvo" tamanho={16} /> Onde rende revisar</h3>
              {rever.length ? <ul>{rever.map((a) => { const slug = slugDaArea.get(a.area); return <li key={a.area}><span>{a.area}</span>{slug ? <a href={href(`/treinar?temas=${slug}&situacao=naoRespondidas`)}>Treinar</a> : null}</li> })}</ul> : <p>Nenhuma área ficou para trás nesta prova.</p>}
            </div>
          </div>
          <ul className="snx-areas" aria-label="Acertos por área, com a média da edição">
            {areas.map((a) => (
              <li key={a.area} title={`${a.area}: ${a.certas} de ${a.total}${a.media != null ? ` · média da edição ${Math.round(a.media)}%` : ''}`}>
                <span className="snx-areas__nome">{a.area}</span>
                <span className="snx-areas__trilho" aria-hidden="true">
                  <span className="snx-areas__voce" style={{ '--w': `${a.pct}%` } as CSSProperties} />
                  {a.media != null && <span className="snx-areas__media" style={{ left: `${Math.min(100, Math.max(0, a.media))}%` }} />}
                </span>
                <b className="snx-num">{a.certas}/{a.total}</b>
              </li>
            ))}
          </ul>
          <p className="snx-legenda"><span className="snx-legenda__voce" aria-hidden="true" /> você <span className="snx-legenda__media" aria-hidden="true" /> média de quem entregou no prazo</p>
        </div>
      )}

      <div className="snx-correcao">
        <div className="snx-correcao__cabeca">
          <div>
            <h3>Correção questão por questão</h3>
            <p>As letras seguem a ordem desta edição. No comentário da questão, valem as letras do acervo: a correspondência aparece em cada uma.</p>
          </div>
          {paraRever.length > 0 && <button type="button" className="botao snx-botao snx-botao--menor" onClick={() => aoTreinar(paraRever)}><Icone nome="reiniciar" tamanho={16} /> Refazer as erradas ({paraRever.length})</button>}
        </div>
        <div className="snx-filtro" role="group" aria-label="Mostrar">
          {([['todas', 'Todas'], ['rever', 'Erradas e em branco'], ['certas', 'Certas']] as const).map(([valor, rotulo]) => (
            <button key={valor} type="button" aria-pressed={filtro === valor} className="snx-filtro__item" onClick={() => definirFiltro(valor)}>{rotulo}</button>
          ))}
        </div>
        <ol className="snx-questoes">
          {gabarito.map((g) => {
            const certa = g.marcada === g.gabarito
            if ((filtro === 'rever' && certa) || (filtro === 'certas' && !certa)) return null
            const q = questoes?.get(g.id_questao)
            const tema = temaDe.get(g.id_questao)?.nome ?? q?.tema
            const tipo = certa ? 'certa' : g.marcada ? 'errada' : 'branca'
            return (
              <li key={g.id_questao} className={`snx-questao snx-questao--${tipo}`}>
                <details>
                  <summary>
                    <span className="snx-questao__n snx-num">{g.ordem}</span>
                    <Icone nome={certa ? 'certo' : 'errado'} tamanho={15} />
                    <span className="snx-questao__tema">{tema ?? 'Questão'}</span>
                    <span className="snx-questao__letras">{g.marcada ? (certa ? `marcou ${g.marcada}` : `marcou ${g.marcada} · certa ${g.gabarito}`) : `em branco · certa ${g.gabarito}`}</span>
                  </summary>
                  {q ? <CorrecaoDaQuestao questao={q} item={g} /> : <p className="snx-vazio">Carregando a questão…</p>}
                </details>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function CorrecaoDaQuestao({ questao, item }: { questao: Questao; item: ItemGabaritoSN }) {
  const alternativas = alternativasDaCorrecao(questao, item.permutacao, item.gabarito, item.marcada)
  const correta = alternativas.find((a) => a.gabarito)
  const marcada = alternativas.find((a) => a.marcada)
  const resumo = questao.enunciado.replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim()
  return (
    <div className="snx-questao__corpo">
      <p className="snx-questao__enunciado">{resumo.length > 320 ? `${resumo.slice(0, 320)}…` : resumo}</p>
      <ul className="snx-questao__alts">
        {alternativas.map((a) => (
          <li key={a.letra} className={a.gabarito ? 'snx-alt--certa' : a.marcada ? 'snx-alt--marcada' : ''}>
            <span className="snx-alt__letra">{a.letra}</span>
            <span className="snx-alt__texto">{a.texto.replace(/[*_`]/g, '')}</span>
            <span className="snx-alt__marca">{a.gabarito ? 'Gabarito' : a.marcada ? 'Sua resposta' : ''}{a.original !== a.letra ? <small>{a.gabarito || a.marcada ? ' · ' : ''}{a.original} no comentário</small> : null}</span>
          </li>
        ))}
      </ul>
      <p className="snx-questao__rodape">
        {correta && correta.original !== correta.letra && <>No comentário, a certa é a <b>{correta.original}</b>{marcada && !marcada.gabarito ? <> e a sua é a <b>{marcada.original}</b></> : null}. </>}
        <a href={href(`/questao/${questao.id}`)}>Abrir o comentário completo <Icone nome="direita" tamanho={13} /></a>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ranking e evolução
// ---------------------------------------------------------------------------

function Ranking({ ed, logado, encerrada }: { ed: EdicaoSN; logado: boolean; encerrada: boolean }) {
  const [ranking, definirRanking] = useState<RankingSN | null>(null)
  const edicao = ed.edicao!
  const entregou = !!ed.minha?.entregue_em
  useEffect(() => {
    let vivo = true
    snRanking(edicao, { logado }).then((r) => { if (vivo) definirRanking(r) }).catch(() => { if (vivo) definirRanking(null) })
    return () => { vivo = false }
  }, [edicao, logado, entregou])
  if (!ranking) return null
  const vocePresente = ranking.top.some((l) => l.eh_voce)
  return (
    <section className="snx-secao snx-ranking" id="snx-ranking" aria-labelledby="snx-ranking-titulo">
      <header className="snx-secao__cabeca">
        <h2 id="snx-ranking-titulo">{encerrada ? 'Ranking final' : 'Ranking parcial'}</h2>
        <p>{ranking.colocados ? `${mil(ranking.colocados)} ${ranking.colocados === 1 ? 'entrega' : 'entregas'} no prazo. ` : ''}Mais acertos na frente; no empate, menos tempo.{encerrada ? '' : ` O final sai em ${diaDoRankingFinal(ed.fecha_em!)}.`}</p>
      </header>
      {ranking.top.length === 0 ? <p className="snx-vazio">O ranking aparece aqui assim que as primeiras provas forem entregues.</p> : (
        <ol className="snx-top">
          {ranking.top.map((l) => (
            <li key={l.posicao} className={'snx-top__linha' + (l.eh_voce ? ' snx-top__linha--voce' : '') + (l.posicao <= 3 ? ' snx-top__linha--podio' : '')}>
              <span className="snx-top__pos snx-num">{l.posicao}<span className="snx-ordinal">º</span></span>
              <span className="snx-top__avatar" aria-hidden="true">{iniciais(l.apelido)}</span>
              <span className="snx-top__nome">{l.apelido}{l.eh_voce && <span className="snx-top__voce">você</span>}</span>
              <span className="snx-top__tempo snx-num">{duracaoProva(l.segundos)}</span>
              <b className="snx-top__acertos snx-num">{l.acertos}/{l.total}</b>
            </li>
          ))}
          {ranking.voce && !vocePresente && (
            <li className="snx-top__linha snx-top__linha--voce snx-top__linha--fora">
              <span className="snx-top__pos snx-num">{ranking.voce.posicao}<span className="snx-ordinal">º</span></span>
              <span className="snx-top__avatar" aria-hidden="true"><Icone nome="usuario" tamanho={14} /></span>
              <span className="snx-top__nome">Você</span>
              <span className="snx-top__tempo snx-num">{duracaoProva(ranking.voce.segundos)}</span>
              <b className="snx-top__acertos snx-num">{ranking.voce.acertos}/{ranking.voce.total}</b>
            </li>
          )}
        </ol>
      )}
      {ranking.melhores_por_area.length > 0 && (
        <div className="snx-melhores">
          <h3>Melhores por área</h3>
          <ul>{ranking.melhores_por_area.map((m) => <li key={m.area}><span>{m.area}</span><strong>{m.apelido}</strong><b className="snx-num">{m.certas}/{m.total}</b></li>)}</ul>
        </div>
      )}
      <p className="snx-privacidade"><Icone nome="olho" tamanho={14} /> Aparece o apelido do ranking. Para trocar o apelido ou não aparecer, vá em <a href={href('/conta?secao=ranking')}>Minha conta › Ranking</a>.</p>
    </section>
  )
}

/** As edições feitas, uma coluna por edição (uma série só: sem legenda; o valor em texto em cada uma). */
function Evolucao({ ed }: { ed: EdicaoSN }) {
  const pontos = useMemo(() => {
    const feitas = ed.anteriores.filter((a) => a.minha?.total).map((a) => ({ chave: a.edicao, nome: nomeDaEdicao(a.titulo), acertos: a.minha!.acertos ?? 0, total: a.minha!.total ?? 0, noTempo: a.minha!.no_tempo }))
    feitas.reverse()
    if (ed.minha?.entregue_em && ed.minha.total) feitas.push({ chave: ed.edicao!, nome: nomeDaEdicao(ed.titulo), acertos: ed.minha.acertos ?? 0, total: ed.minha.total, noTempo: ed.minha.no_tempo })
    return feitas.map((p) => ({ ...p, pct: Math.round((p.acertos / p.total) * 100) }))
  }, [ed])
  if (!pontos.length) return null
  return (
    <section className="snx-secao snx-evolucao" aria-labelledby="snx-evolucao-titulo">
      <header className="snx-secao__cabeca">
        <h2 id="snx-evolucao-titulo">Sua evolução nas edições</h2>
        <p>{pontos.length === 1 ? 'A primeira de muitas: a próxima edição já mostra a evolução.' : 'Acertos em cada edição que você entregou.'}</p>
      </header>
      <ol className="snx-colunas" style={{ '--n': pontos.length } as CSSProperties}>
        {pontos.map((p) => (
          <li key={p.chave} title={`${p.nome}: ${p.acertos} de ${p.total} (${p.pct}%)${p.noTempo === false ? ', fora do prazo' : ''}`}>
            <b className="snx-num">{p.acertos}/{p.total}</b>
            <span className="snx-colunas__trilho" aria-hidden="true"><span style={{ '--h': `${Math.max(4, p.pct)}%` } as CSSProperties} /></span>
            <span className="snx-colunas__nome">{p.nome}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Dúvidas e a edição que está chegando
// ---------------------------------------------------------------------------

function Duvidas({ abertoATodos, fechaEm, duracaoMin }: { abertoATodos: boolean; fechaEm: string; duracaoMin: number }) {
  const duracao = duracaoTexto(duracaoMin)
  const itens: Array<[string, string]> = [
    ['Quem pode fazer?', abertoATodos
      ? 'Nesta edição de lançamento, qualquer pessoa com conta no OrtoQuestões, inclusive a conta grátis. Criar a conta leva um minuto.'
      : 'Quem assina o OrtoQuestões. Sem assinar, você vê a página, a distribuição das áreas e o ranking.'],
    ['Posso pausar?', `Não. Depois de começar, o relógio corre ${duracao} sem parar, como na prova. Escolha um horário tranquilo dentro da semana.`],
    ['E se a internet cair ou eu trocar de aparelho?', 'As respostas são salvas no servidor a cada poucos segundos. Sem conexão, elas ficam no aparelho e sobem quando a rede volta. Para trocar de aparelho, entre na mesma conta e toque em "Continuar a prova". Se o tempo acabar com a aba fechada, a prova é entregue sozinha com o que foi salvo.'],
    ['Como o ranking é calculado?', `Pela quantidade de acertos. No empate, vence quem levou menos tempo; persistindo, quem entregou antes. Só entra quem entregou dentro das ${duracao} (com 5 minutos de tolerância para rede lenta).`],
    ['Quando sai o resultado?', `Na hora da entrega: a nota, o tempo, a correção e a posição parcial. O ranking final sai em ${diaDoRankingFinal(fechaEm)}.`],
    ['Dá para ver o gabarito?', 'Sim, depois de entregar: cada questão com a sua resposta, o gabarito e o comentário completo. Durante a prova, não.'],
  ]
  return (
    <section className="snx-secao snx-duvidas" aria-labelledby="snx-duvidas-titulo">
      <header className="snx-secao__cabeca"><h2 id="snx-duvidas-titulo">Dúvidas rápidas</h2></header>
      <dl className="snx-duvidas__lista">
        {itens.map(([p, r]) => <div key={p}><dt>{p}</dt><dd>{r}</dd></div>)}
      </dl>
    </section>
  )
}

/** Sem a parte 32 no banco (ou sem edição publicada): as datas planejadas, o como funciona e as dúvidas, sem erro. */
function Chegando({ logado, nome }: { logado: boolean; nome: string }) {
  const agora = useRef(Date.now()).current
  const plano = OUTUBRO_PLANEJADO
  const valePlano = agora < Date.parse(plano.fecha_em)
  return (
    <div className="snx">
      <section className="snx-heroi" aria-labelledby="snx-titulo">
        <div className="snx-heroi__texto">
          <p className="tr-heroi__selo">Simulado Nacional · {valePlano ? 'Outubro de 2026' : 'próxima edição'}</p>
          <h1 id="snx-titulo">{valePlano ? 'O Simulado Nacional de outubro está chegando' : 'A próxima edição está sendo preparada'}</h1>
          <p className="snx-heroi__oque"><strong>{plano.total} questões oficiais do TEOT e do TARO</strong>, no peso do que mais cai · <strong>{duracaoTexto(plano.duracao_min)}</strong> · <strong>ranking nacional</strong></p>
          <p className="snx-heroi__porque">Para treinar a prova de verdade, com tempo e ranking, e saber onde você está.</p>
          {valePlano && <p className="snx-heroi__badges"><span className="snx-badge"><Icone nome="estrela" tamanho={14} /> Edição de lançamento: aberta a todos com conta grátis</span></p>}
          <p className="snx-heroi__status">{nome ? `${nome}, as inscrições abrem em breve, nesta página.` : 'As inscrições abrem em breve, nesta página.'}</p>
          <div className="snx-heroi__acao">
            {logado
              ? <a className="botao snx-vidro" href={href('/treinar')}><Icone nome="raio" tamanho={16} /> Treinar enquanto isso</a>
              : <a className="botao snx-botao" href={href('/conta?modo=criar&voltar=%2Fsimulado-nacional')}><Icone nome="raio" tamanho={18} /> Criar conta grátis</a>}
          </div>
        </div>
        {valePlano && <Bilhete abreEm={plano.abre_em} fechaEm={plano.fecha_em} agora={agora} estado="chegando" restante={0} />}
      </section>
      {valePlano && <ComoFunciona abreEm={plano.abre_em} fechaEm={plano.fecha_em} duracaoMin={plano.duracao_min} />}
      {valePlano && <OQueCai porArea={DISTRIBUICAO_PREVISTA} total={plano.total} previa />}
      <Duvidas abertoATodos={valePlano} fechaEm={valePlano ? plano.fecha_em : new Date(agora + 30 * 86_400_000).toISOString()} duracaoMin={plano.duracao_min} />
    </div>
  )
}

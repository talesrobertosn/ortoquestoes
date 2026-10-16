import { useCallback, useEffect, useMemo, useState } from 'react'
import { chamarRpc, chamarRpcPublica, codigoErro } from '../servicos/supabase'
import { usarPremium } from '../conta/premium'
import { usarIndice } from '../dados/usarIndice'
import { AREAS_TREINO, FILTROS_VAZIOS } from '../dados/tipos'
import { nomeEdicao, usarSessao } from '../estado/sessao'
import {
  evolucaoHistorico, prazoEdicao, prontidaoDoTema, resumirCorrecao, segundosRestantesProva, situacaoEdicao,
  type EdicaoHistorico, type EdicaoNacional, type ItemCorrecao, type Prontidao, type ResultadoNacional,
} from '../dados/simuladoNacional'
import { entregarSessaoNacional } from '../dados/entregaNacional'
import { confirmar } from '../componentes/Confirmar'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { Degustacao, SeloAssinante } from '../componentes/Premium'
import { irParaSecao } from '../componentes/IndicePagina'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/SimuladoNacional.css'

const ROTULO_PRONTIDAO: Record<Prontidao, string> = { pronto: 'Pronto', caminho: 'No caminho', reforcar: 'Reforçar' }

function duracao(segundos: number) {
  const h = Math.floor(segundos / 3600), m = Math.round((segundos % 3600) / 60)
  return h ? (m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`) : `${m} min`
}
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })
const maiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)
const lista = (nomes: string[]) => nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
const iniciais = (apelido: string) => {
  const partes = apelido.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?'
}
/** O título gravado ("Simulado Nacional · outubro de 2026") sem o prefixo; sem título próprio, o mês por extenso. */
const tituloEdicao = (ed: EdicaoNacional) => {
  const t = ed.titulo.replace(/^Simulado Nacional · /, '')
  return ed.edicao && t === ed.edicao ? nomeEdicao(ed.edicao) : t
}

/** Relógio da página: o prazo e o tempo restante se atualizam sozinhos. */
function usarAgora(intervaloMs: number) {
  const [agora, definirAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => definirAgora(Date.now()), intervaloMs)
    return () => window.clearInterval(t)
  }, [intervaloMs])
  return agora
}

/** Edições anteriores que a pessoa entregou: uma consulta por edição, em paralelo (são poucas). */
function usarHistorico(logado: boolean, edicao: EdicaoNacional | null) {
  const [historico, definirHistorico] = useState<EdicaoHistorico[] | null>(null)
  const chave = edicao?.edicao ? `${edicao.edicao}|${edicao.anteriores.map((a) => a.edicao).join(',')}|${edicao.minha?.entregue_em ?? ''}` : ''
  useEffect(() => {
    if (!logado || !edicao?.edicao) { definirHistorico(null); return }
    let vivo = true
    const daAtual = edicao.minha?.entregue_em ? [edicao] : []
    Promise.all(edicao.anteriores.slice(0, 11).map((a) => chamarRpc<EdicaoNacional>('obter_simulado_nacional', { p_edicao: a.edicao }).catch(() => null)))
      .then((outras) => {
        if (!vivo) return
        const feitas = [...daAtual, ...outras].filter((e): e is EdicaoNacional => !!e?.edicao && !!e.minha?.entregue_em)
        definirHistorico(feitas.map((e) => ({ edicao: e.edicao!, acertos: e.minha!.acertos ?? 0, total: e.minha!.total ?? e.total, noTempo: e.minha!.no_tempo })))
      })
    return () => { vivo = false }
    // A chave resume o que importa da edição; o objeto muda a cada recarga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logado, chave])
  return historico
}

export function SimuladoNacional({ consulta }: { consulta: URLSearchParams }) {
  const { premium, logado, carregado } = usarPremium()
  const { indice } = usarIndice()
  const { sessao, iniciar, iniciarComAviso, liberarParaNova } = usarSessao()
  const pedida = consulta.get('edicao')
  const [edicao, definirEdicao] = useState<EdicaoNacional | null>(null)
  const [resultado, definirResultado] = useState<ResultadoNacional | null>(null)
  const [erro, definirErro] = useState('')
  const [ocupado, definirOcupado] = useState(false)
  const [correcao, definirCorrecao] = useState<ItemCorrecao[] | null>(null)
  const [erroCorrecao, definirErroCorrecao] = useState(false)
  const [entrega, definirEntrega] = useState<'enviando' | 'erro' | null>(null)
  const agora = usarAgora(20_000)

  const carregar = useCallback(async () => {
    try {
      const chamada = logado ? chamarRpc<EdicaoNacional>('obter_simulado_nacional', { p_edicao: pedida }) : chamarRpcPublica<EdicaoNacional>('obter_simulado_nacional', { p_edicao: pedida })
      const ed = await chamada
      definirEdicao(ed)
      definirErro('')
      if (logado && ed.edicao && ed.minha?.entregue_em) definirResultado(await chamarRpc<ResultadoNacional>('resultado_simulado_nacional', { p_edicao: ed.edicao }))
      else definirResultado(null)
    } catch (falha) {
      definirErro(String(falha).includes('(404)') ? 'O Simulado Nacional ainda não está disponível. Volte em breve.' : 'Não foi possível carregar o simulado agora. Confira a conexão e tente de novo.')
    }
  }, [logado, pedida])
  useEffect(() => { void carregar() }, [carregar])
  // Trocar de edição (link de edição anterior) não pode mostrar a correção da outra.
  useEffect(() => { definirCorrecao(null); definirErroCorrecao(false) }, [pedida])

  const situacao = edicao?.edicao ? situacaoEdicao(edicao, agora) : null
  // Prova feita neste aparelho, encerrada (ou com o tempo esgotado com a aba
  // fechada), mas ainda sem entrega registrada: entrega agora.
  const pendenteAqui = !!edicao?.edicao && (situacao === 'andamento' || situacao === 'tempo-esgotado') && sessao?.nacional === edicao.edicao && (!!sessao.concluidaEm || situacao === 'tempo-esgotado')
  const entregar = useCallback(() => {
    if (!sessao) return
    definirEntrega('enviando')
    entregarSessaoNacional(sessao).then(() => { definirEntrega(null); void carregar() }).catch(() => definirEntrega('erro'))
  }, [sessao, carregar])
  useEffect(() => {
    if (pendenteAqui && entrega === null) entregar()
    // Só ao ficar pendente: a nova tentativa depois de uma falha é do botão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendenteAqui])

  // O gabarito vem junto com o resultado: a correção e "o que rever" já aparecem prontos.
  const entregueEdicao = resultado?.entregue ? edicao?.edicao ?? null : null
  useEffect(() => {
    if (!entregueEdicao) return
    let vivo = true
    chamarRpc<ItemCorrecao[]>('gabarito_simulado_nacional', { p_edicao: entregueEdicao })
      .then((c) => { if (vivo) { definirCorrecao(c); definirErroCorrecao(false) } })
      .catch(() => { if (vivo) definirErroCorrecao(true) })
    return () => { vivo = false }
  }, [entregueEdicao])
  const recarregarCorrecao = () => {
    if (!entregueEdicao) return
    definirErroCorrecao(false)
    chamarRpc<ItemCorrecao[]>('gabarito_simulado_nacional', { p_edicao: entregueEdicao }).then(definirCorrecao).catch(() => definirErroCorrecao(true))
  }

  async function comecar() {
    if (!edicao?.edicao || ocupado) return
    const retomando = situacao === 'andamento'
    // O relógio liga no servidor ao começar: confirma antes, sem susto.
    if (!retomando && !(await confirmar({
      titulo: 'Começar o Simulado Nacional agora?',
      texto: `São ${edicao.total} questões em ${duracao(edicao.duracao_min * 60)}. O cronômetro começa agora e não pausa se você fechar a aba. Faça a prova inteira neste aparelho: as marcações ficam nele até a entrega.`,
      sim: 'Começar agora',
      nao: 'Ainda não',
    }))) return
    // Pergunta antes de chamar o servidor: iniciar a edição já liga o relógio da prova.
    if (!(await liberarParaNova({ nacional: edicao.edicao }))) return
    definirOcupado(true); definirErro('')
    try {
      const inicio = await chamarRpc<{ ids: string[]; iniciado_em: string; duracao_min: number }>('iniciar_simulado_nacional', { p_edicao: edicao.edicao })
      // Retomar no mesmo aparelho mantém as respostas já marcadas.
      if (!(sessao?.nacional === edicao.edicao && !sessao.concluidaEm)) {
        iniciar({ ...FILTROS_VAZIOS, areas: AREAS_TREINO, embaralhar: false }, inicio.ids, { simulado: true, limiteSegundos: inicio.duracao_min * 60, nacional: edicao.edicao, criadaEm: Date.parse(inicio.iniciado_em) })
      }
      navegar('/sessao')
    } catch (falha) {
      const codigo = codigoErro(falha)
      definirErro(codigo === 'premium_necessario' ? 'O Simulado Nacional é exclusivo para assinantes.' : codigo === 'edicao_fechada' ? 'Esta edição não está aberta agora.' : codigo === 'ja_entregue' ? 'Você já entregou esta edição.' : 'Não foi possível começar agora. Tente de novo em instantes.')
      void carregar()
    } finally { definirOcupado(false) }
  }

  /** Uma sessão de treino comum (com gabarito e comentário) só com as questões escolhidas. */
  async function treinar(ids: string[]) {
    if (!ids.length) return
    if (await iniciarComAviso({ ...FILTROS_VAZIOS, areas: AREAS_TREINO, embaralhar: false }, ids)) navegar('/sessao')
  }

  const slugDoTema = useMemo(() => new Map(indice?.temas.map((t) => [t.nome, t.slug]) ?? []), [indice])
  const temaDaQuestao = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const q of indice?.questoes ?? []) { const t = indice!.temas[q.t]; if (t) mapa.set(q.id, t.nome) }
    return mapa
  }, [indice])
  const historico = usarHistorico(logado, edicao)

  if (erro && !edicao) return <Estado titulo="Simulado Nacional" acoes={<button type="button" className="botao botao--principal" onClick={() => void carregar()}>Tentar de novo</button>}><p>{erro}</p></Estado>
  if (!edicao || (logado && !carregado)) return <Carregando linhas={5} rotulo="Carregando o Simulado Nacional" />
  if (!edicao.edicao) return (
    <Estado titulo="A primeira edição do Simulado Nacional está chegando" acoes={<a className="botao botao--principal" href={href('/treinar')}>Treinar enquanto isso</a>}>
      <p>Todo mês, uma prova igual para todos os assinantes, com nota, posição e relatório de prontidão.</p>
    </Estado>
  )

  const minha = edicao.minha
  const temas = Object.entries(edicao.por_tema).sort((a, b) => b[1] - a[1])
  const prazo = prazoEdicao(edicao, agora)
  const restante = minha && situacao === 'andamento' ? segundosRestantesProva(minha.iniciado_em, edicao.duracao_min, agora) : 0

  const acao = (() => {
    if (!logado) return <a className="botao botao--claro botao--grande" href={href('/conta?modo=entrar')}>Entrar para participar</a>
    if (!premium && !minha) return <a className="botao botao--ouro botao--grande" href={href('/assinatura')}><Icone nome="cadeado" tamanho={18} /> Exclusivo para assinantes</a>
    if (situacao === 'entregue') return (
      <>
        <p className="sn-heroi__status"><Icone nome="certo" tamanho={18} /> Prova entregue em {dataCurta(minha!.entregue_em!)}</p>
        {resultado?.entregue && <button type="button" className="sn-heroi__link" onClick={() => { const el = document.getElementById('sn-resultado'); if (el) irParaSecao(el) }}>Ver meu resultado <Icone nome="baixo" tamanho={14} /></button>}
      </>
    )
    if (pendenteAqui) return entrega === 'erro' ? (
      <>
        <p className="sn-heroi__status"><Icone nome="alerta" tamanho={18} /> A entrega não chegou ao servidor. Suas respostas estão guardadas neste aparelho.</p>
        <button type="button" className="botao botao--claro botao--grande" onClick={entregar}>Tentar entregar de novo</button>
      </>
    ) : <p className="sn-heroi__status" role="status"><Icone nome="relogio" tamanho={18} /> Entregando suas respostas…</p>
    if (situacao === 'andamento') return (
      <>
        <button type="button" className="botao botao--claro botao--grande" onClick={comecar} disabled={ocupado}>{ocupado ? 'Abrindo…' : 'Continuar a prova'}</button>
        <p className="sn-heroi__restante"><Icone nome="relogio" tamanho={14} /> Faltam <b className="numerico">{duracao(restante)}</b></p>
      </>
    )
    if (situacao === 'tempo-esgotado') return <p className="sn-heroi__status"><Icone nome="relogio" tamanho={18} /> Tempo encerrado. Suas marcações ficaram no aparelho em que você fez a prova: abra o site nele para entregar.</p>
    if (situacao === 'aberta') return <button type="button" className="botao botao--claro botao--grande" onClick={comecar} disabled={ocupado}>{ocupado ? 'Preparando…' : 'Começar a prova'}</button>
    if (situacao === 'em-breve') return <p className="sn-heroi__status"><Icone nome="calendario" tamanho={18} /> Abre em {dataCurta(edicao.abre_em)}. Separe {duracao(edicao.duracao_min * 60)} para fazer de uma vez.</p>
    return (
      <>
        <p className="sn-heroi__status">Esta edição encerrou{pedida ? '' : '. A próxima abre no dia 1º'}.</p>
        {pedida && <a className="sn-heroi__link" href={href('/simulado-nacional')}>Ir para a edição atual <Icone nome="direita" tamanho={14} /></a>}
      </>
    )
  })()

  return (
    <div className="empilha-2 sn">
      <section className="sn-heroi">
        <div className="sn-heroi__texto">
          <p className="sn-heroi__selo"><Icone nome="trofeu" tamanho={15} /> Simulado Nacional OrtoQuestões</p>
          <h1>{tituloEdicao(edicao)}</h1>
          <p>A mesma prova para todos os assinantes do Brasil. No fim, sua nota, sua posição e o que falta para você estar pronto.</p>
          <ul className="sn-fatos">
            <li><Icone nome="livro" tamanho={16} /><b className="numerico">{edicao.total}</b> questões de TEOT e TARO</li>
            <li><Icone nome="relogio" tamanho={16} /><b className="numerico">{duracao(edicao.duracao_min * 60)}</b> de prova</li>
            <li><Icone nome="grupo" tamanho={16} /><b className="numerico">{edicao.participantes.toLocaleString('pt-BR')}</b> {edicao.participantes === 1 ? 'entregou' : 'entregaram'}</li>
            <li><Icone nome="calendario" tamanho={16} />{prazo ?? 'encerrada'}</li>
          </ul>
        </div>
        <div className="sn-heroi__acao">
          {acao}
          {erro && <p className="sn-heroi__erro" role="alert">{erro}</p>}
        </div>
      </section>

      {!premium && !minha && (
        <Degustacao titulo="Assim chega o seu resultado (exemplo)" texto={<p>Uma prova por mês, igual para todos os assinantes, corrigida na hora, com a sua posição e um relatório de prontidão por tema.</p>} acao="Quero fazer o Simulado Nacional">
          <AmostraResultado />
        </Degustacao>
      )}

      {resultado?.entregue ? (
        <Resultado resultado={resultado} slugDoTema={slugDoTema} correcao={correcao} erroCorrecao={erroCorrecao} aoRecarregarCorrecao={recarregarCorrecao}
          temaDaQuestao={(id) => temaDaQuestao.get(id)} aoTreinar={treinar} />
      ) : (
        <div className="sn-duas">
          <section className="cartao cartao__corpo sn-regras">
            <h2>Como funciona</h2>
            <ol className="sn-passos">
              <li><span className="sn-passos__n numerico">1</span><span><strong>Separe {duracao(edicao.duracao_min * 60)} sem interrupção.</strong> O cronômetro começa no primeiro toque e corre mesmo com a aba fechada, como na prova.</span></li>
              <li><span className="sn-passos__n numerico">2</span><span><strong>Faça tudo no mesmo aparelho.</strong> As marcações ficam nele até a entrega; você pode sair e voltar para continuar de onde parou.</span></li>
              <li><span className="sn-passos__n numerico">3</span><span><strong>Use o mapa de questões.</strong> Pule, marque para revisar e risque alternativas; o gabarito só aparece depois de entregar.</span></li>
              <li><span className="sn-passos__n numerico">4</span><span><strong>Entregue e veja o resultado na hora:</strong> nota, posição, percentil e o relatório de prontidão por tema, comparado à média de quem fez a mesma prova.</span></li>
            </ol>
            <p className="sn-regras__nota"><Icone nome="trofeu" tamanho={15} /> Uma tentativa por edição. Ranking por acertos, com desempate pelo menor tempo; entregas fora do tempo recebem nota, mas não entram no ranking.</p>
          </section>
          <section className="cartao cartao__corpo sn-temas">
            <h2>O que cai nesta edição</h2>
            <p className="texto-2">Temas na proporção das provas de TEOT e TARO do acervo.</p>
            <ul className="sn-composicao">
              {temas.map(([tema, n]) => (
                <li key={tema}><span>{tema}</span><span className="sn-composicao__barra" aria-hidden="true"><span style={{ width: `${(n / temas[0][1]) * 100}%` }} /></span><b className="numerico">{n}</b></li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {historico && historico.length > 0 && <Historico historico={historico} atual={edicao.edicao} />}

      {edicao.anteriores.length > 0 && (
        <nav className="sn-anteriores" aria-label="Edições anteriores">
          <span>Edições:</span>
          {pedida && <a href={href('/simulado-nacional')}>Edição atual</a>}
          {edicao.anteriores.map((a) => <a key={a.edicao} href={href(`/simulado-nacional?edicao=${a.edicao}`)}>{nomeEdicao(a.edicao)}</a>)}
        </nav>
      )}
    </div>
  )
}

function Historico({ historico, atual }: { historico: EdicaoHistorico[]; atual: string }) {
  const linhas = evolucaoHistorico(historico)
  const melhor = Math.max(...linhas.map((l) => l.nota))
  return (
    <section className="cartao cartao__corpo sn-historico" aria-labelledby="sn-historico-titulo">
      <div className="sn-historico__cabeca">
        <h2 id="sn-historico-titulo"><Icone nome="grafico" tamanho={20} /> Seu histórico</h2>
        <p className="texto-2">{linhas.length === 1 ? 'Sua primeira edição. A próxima mostra a evolução.' : `${linhas.length} edições feitas · melhor nota ${melhor}%`}</p>
      </div>
      <ol className="sn-historico__lista">
        {linhas.map((l) => (
          <li key={l.edicao} className={l.edicao === atual ? 'sn-historico--atual' : ''}>
            <a href={href(l.edicao === atual ? '/simulado-nacional' : `/simulado-nacional?edicao=${l.edicao}`)}>
              <span className="sn-historico__nome">{maiuscula(nomeEdicao(l.edicao))}<small>{l.acertos} de {l.total}{l.noTempo === false ? ' · fora do ranking' : ''}</small></span>
              <span className="sn-historico__barra" aria-hidden="true"><span style={{ width: `${l.nota}%` }} /></span>
              <b className="numerico">{l.nota}%</b>
              <span className={'sn-historico__var numerico' + (l.variacao == null ? '' : l.variacao > 0 ? ' sn-historico__var--sobe' : l.variacao < 0 ? ' sn-historico__var--desce' : '')}>
                {l.variacao == null ? '' : l.variacao > 0 ? `+${l.variacao}` : l.variacao === 0 ? '=' : `${l.variacao}`}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}

type FiltroCorrecao = 'todas' | 'rever' | 'certas'

function Resultado({ resultado, slugDoTema, correcao, erroCorrecao, aoRecarregarCorrecao, temaDaQuestao, aoTreinar }: {
  resultado: ResultadoNacional
  slugDoTema: Map<string, string>
  correcao: ItemCorrecao[] | null
  erroCorrecao: boolean
  aoRecarregarCorrecao: () => void
  temaDaQuestao: (id: string) => string | undefined
  aoTreinar: (ids: string[]) => void
}) {
  const [filtro, definirFiltro] = useState<FiltroCorrecao>('todas')
  const [topAberto, definirTopAberto] = useState(false)
  const acertos = resultado.acertos ?? 0, total = resultado.total ?? 0
  const nota = total ? Math.round((acertos / total) * 100) : 0
  const temas = (resultado.temas ?? []).map((t) => ({ ...t, estado: prontidaoDoTema(t.certas, t.total, t.media), p: t.total ? Math.round((t.certas / t.total) * 100) : 0 }))
  const prontos = temas.filter((t) => t.estado === 'pronto').sort((a, b) => b.p - a.p).map((t) => t.tema)
  const reforcar = temas.filter((t) => t.estado === 'reforcar').sort((a, b) => a.p - b.p).map((t) => t.tema)
  const manchete = prontos.length && reforcar.length
    ? `Você está pronto em ${lista(prontos.slice(0, 3))}; ${lista(reforcar.slice(0, 3))} ${reforcar.length === 1 ? 'está abaixo' : 'estão abaixo'} da média.`
    : prontos.length ? `Você está pronto em ${lista(prontos.slice(0, 4))}. Continue no ritmo.`
    : reforcar.length ? `${lista(reforcar.slice(0, 4))} ${reforcar.length === 1 ? 'pede' : 'pedem'} reforço antes da prova.`
    : 'Você está no caminho em todos os temas. Um pouco mais de volume e a nota sobe.'
  const resumo = useMemo(() => (correcao ? resumirCorrecao(correcao, temaDaQuestao) : null), [correcao, temaDaQuestao])
  const top = resultado.top ?? []
  const topVisivel = topAberto ? top : top.slice(0, 5)
  const comparacao = resultado.media != null ? Math.round(nota - resultado.media) : null

  return (
    <>
      <section className="sn-placar" id="sn-resultado" aria-label="Seu resultado">
        <div className="sn-nota" style={{ '--p': `${nota}%` } as React.CSSProperties}>
          <strong className="numerico">{nota}%</strong>
          <span>{acertos} de {total}</span>
        </div>
        <div className="sn-placar__lado">
          <dl className="sn-numeros">
            <div className="sn-numeros__destaque">
              <dt>Sua posição</dt>
              <dd>{resultado.premium && resultado.posicao ? <>#{resultado.posicao}<small> de {resultado.participantes}</small></> : resultado.no_tempo === false ? 'Fora do ranking' : '—'}</dd>
            </div>
            {resultado.percentil != null && <div><dt>Melhor que</dt><dd>{resultado.percentil}%<small> dos participantes</small></dd></div>}
            <div><dt>Média da edição</dt><dd>{resultado.media != null ? `${Math.round(resultado.media)}%` : '—'}{comparacao != null && <small className={comparacao >= 0 ? 'sn-acima' : 'sn-abaixo'}> {comparacao >= 0 ? `você +${comparacao}` : `você ${comparacao}`}</small>}</dd></div>
            <div><dt>Seu tempo</dt><dd>{duracao(resultado.segundos ?? 0)}</dd></div>
          </dl>
          {resumo && (
            <p className="sn-contagem">
              <span className="sn-contagem--certa"><Icone nome="certo" tamanho={14} /> {resumo.certas} {resumo.certas === 1 ? 'certa' : 'certas'}</span>
              <span className="sn-contagem--errada"><Icone nome="errado" tamanho={14} /> {resumo.erradas} {resumo.erradas === 1 ? 'errada' : 'erradas'}</span>
              {resumo.brancas > 0 && <span className="sn-contagem--branca">{resumo.brancas} em branco</span>}
            </p>
          )}
        </div>
        {resultado.no_tempo === false && <p className="sn-aviso">A entrega passou do tempo da prova: a nota vale para você, mas não entra no ranking.</p>}
      </section>

      {resumo && resumo.paraRever.length > 0 && (
        <section className="cartao cartao__corpo sn-rever" aria-labelledby="sn-rever-titulo">
          <div className="sn-rever__cabeca">
            <div>
              <p className="meta">O QUE REVER AGORA</p>
              <h2 id="sn-rever-titulo">{resumo.paraRever.length} {resumo.paraRever.length === 1 ? 'questão para rever' : 'questões para rever'}, com gabarito e comentário</h2>
            </div>
            <button type="button" className="botao botao--principal" onClick={() => aoTreinar(resumo.paraRever)}><Icone nome="reiniciar" tamanho={16} /> Refazer as {resumo.paraRever.length}</button>
          </div>
          <ul className="sn-rever__temas">
            {resumo.porTema.map((g) => {
              const slug = slugDoTema.get(g.tema)
              return (
                <li key={g.tema}>
                  <span className="sn-rever__tema"><strong>{g.tema}</strong><small>{g.ids.length} {g.ids.length === 1 ? 'questão' : 'questões'}</small></span>
                  <span className="sn-rever__acoes">
                    <button type="button" className="botao sn-botao-mini" onClick={() => aoTreinar(g.ids)}>Refazer</button>
                    {slug && <a className="sn-rever__link" href={href(`/treinar?temas=${slug}&situacao=naoRespondidas`)}>Treinar o tema</a>}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="sn-rever__rodape texto-2">
            As questões feitas neste aparelho já entraram no <a href={href('/erros')}>caderno de erros</a> e na <a href={href('/revisao')}>revisão</a>. Para fixar os conceitos, use os <a href={href('/flashcards')}>flashcards</a> e as <a href={href('/resumos/frases')}>frases que caem</a>.
          </p>
        </section>
      )}

      {resultado.premium && temas.length > 0 && (
        <section className="cartao cartao__corpo sn-prontidao" aria-labelledby="sn-prontidao-titulo">
          <header className="sn-prontidao__cabeca">
            <div>
              <p className="meta">RELATÓRIO DE PRONTIDÃO</p>
              <h2 id="sn-prontidao-titulo">{manchete}</h2>
            </div>
            <SeloAssinante />
          </header>
          <ul className="sn-temas-lista">
            {[...temas].sort((a, b) => a.p - b.p).map((t) => {
              const slug = slugDoTema.get(t.tema)
              return (
                <li key={t.tema} className={`sn-tema sn-tema--${t.estado}`}>
                  <span className="sn-tema__nome">{t.tema}<small>{t.certas} de {t.total}</small></span>
                  <span className="sn-tema__barra" aria-hidden="true">
                    <span className="sn-tema__voce" style={{ width: `${t.p}%` }} />
                    {t.media != null && <span className="sn-tema__media" style={{ left: `${t.media}%` }} title={`Média da turma: ${Math.round(t.media)}%`} />}
                  </span>
                  <span className="sn-tema__pct numerico">{t.p}%<small>{t.media != null ? `média ${Math.round(t.media)}%` : ''}</small></span>
                  <span className={`sn-tema__selo sn-tema__selo--${t.estado}`}>{ROTULO_PRONTIDAO[t.estado]}</span>
                  {t.estado !== 'pronto' && slug ? <a className="sn-tema__treinar" href={href(`/treinar?temas=${slug}&situacao=naoRespondidas`)}>Treinar</a> : <span className="sn-tema__treinar" aria-hidden="true" />}
                </li>
              )
            })}
          </ul>
          <p className="sn-legenda"><span className="sn-legenda__voce" /> você <span className="sn-legenda__media" /> média de quem fez esta edição</p>
        </section>
      )}

      {top.length > 0 && (
        <section className="cartao cartao__corpo sn-top" aria-labelledby="sn-top-titulo">
          <h2 id="sn-top-titulo"><Icone nome="trofeu" tamanho={20} /> Top {top.length} da edição</h2>
          <ol className="rk-lista">
            {topVisivel.map((linha) => (
              <li key={linha.posicao} className={'rk-linha' + (linha.eh_voce ? ' rk-linha--voce' : '')}>
                <span className="rk-linha__posicao numerico">{linha.posicao}</span>
                <span className="rk-linha__avatar">{iniciais(linha.apelido)}</span>
                <span className="rk-linha__nome"><span className="rk-linha__apelido">{linha.apelido}{linha.eh_voce && <span className="rk-voce">você</span>}</span><small className="texto-2">{duracao(linha.segundos)}</small></span>
                <span className="rk-linha__total numerico">{linha.acertos}/{linha.total}</span>
              </li>
            ))}
          </ol>
          {top.length > 5 && <button type="button" className="botao sn-top__mais" onClick={() => definirTopAberto((a) => !a)} aria-expanded={topAberto}>{topAberto ? 'Mostrar só os 5 primeiros' : `Ver os ${top.length}`}</button>}
        </section>
      )}

      <section className="cartao cartao__corpo sn-correcao">
        <div className="sn-correcao__cabeca">
          <div>
            <h2>Correção questão a questão</h2>
            <p className="texto-2">Toque numa questão para ler o enunciado e o comentário completo.</p>
          </div>
          {correcao && (
            <div className="sn-filtro" role="group" aria-label="Mostrar">
              {([['todas', 'Todas'], ['rever', 'Erradas e em branco'], ['certas', 'Certas']] as const).map(([valor, rotulo]) => (
                <button key={valor} type="button" aria-pressed={filtro === valor} className={'sn-filtro__item' + (filtro === valor ? ' sn-filtro__item--ativo' : '')} onClick={() => definirFiltro(valor)}>{rotulo}</button>
              ))}
            </div>
          )}
        </div>
        {!correcao && !erroCorrecao && <p className="texto-2">Carregando o gabarito…</p>}
        {erroCorrecao && <p className="sn-correcao__erro">Não foi possível carregar o gabarito agora. <button type="button" className="botao sn-botao-mini" onClick={aoRecarregarCorrecao}>Tentar de novo</button></p>}
        {correcao && (
          <ol className="sn-gabarito">
            {correcao.map((q, i) => {
              const certa = q.marcada === q.gabarito
              if ((filtro === 'rever' && certa) || (filtro === 'certas' && !certa)) return null
              const tema = temaDaQuestao(q.id_questao)
              return (
                <li key={q.id_questao} className={certa ? 'sn-gabarito--certa' : q.marcada ? 'sn-gabarito--errada' : 'sn-gabarito--branca'}>
                  <a href={href(`/questao/${q.id_questao}`)} title={tema}>
                    <span className="numerico">{i + 1}</span>
                    <Icone nome={certa ? 'certo' : 'errado'} tamanho={14} />
                    <small>{q.marcada ? (certa ? `marcou ${q.marcada}` : `${q.marcada} → ${q.gabarito}`) : `em branco → ${q.gabarito}`}</small>
                    {tema && <small className="sn-gabarito__tema">{tema}</small>}
                  </a>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </>
  )
}

/** Exemplo de resultado para quem não assina: números fictícios, sob desfoque. */
function AmostraResultado() {
  const temas: Array<[string, number, number, string]> = [['Trauma adulto', 80, 62, 'pronto'], ['Ombro e cotovelo', 71, 64, 'caminho'], ['Mão e punho', 43, 58, 'reforcar']]
  return (
    <div className="empilha">
      <section className="sn-placar">
        <div className="sn-nota" style={{ '--p': '74%' } as React.CSSProperties}><strong className="numerico">74%</strong><span>37 de 50</span></div>
        <dl className="sn-numeros">
          <div className="sn-numeros__destaque"><dt>Sua posição</dt><dd>#12<small> de 318</small></dd></div>
          <div><dt>Melhor que</dt><dd>96%<small> dos participantes</small></dd></div>
          <div><dt>Média da edição</dt><dd>61%</dd></div>
        </dl>
      </section>
      <section className="cartao cartao__corpo sn-prontidao">
        <ul className="sn-temas-lista">
          {temas.map(([tema, p, media, estado]) => (
            <li key={tema} className={`sn-tema sn-tema--${estado}`}>
              <span className="sn-tema__nome">{tema}</span>
              <span className="sn-tema__barra"><span className="sn-tema__voce" style={{ width: `${p}%` }} /><span className="sn-tema__media" style={{ left: `${media}%` }} /></span>
              <span className="sn-tema__pct numerico">{p}%</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

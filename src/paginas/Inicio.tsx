import { usarContextoLocal } from '../estado/usarContextoLocal'
import { type CSSProperties, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { contar, montarSessao } from '../dados/acervo'
import { AREAS_TREINO, FILTROS_VAZIOS } from '../dados/tipos'
import { href, navegar } from '../util/rotas'
import { Carregando, Estado } from '../componentes/Estados'
import { AmostraQuestao } from '../componentes/AmostraQuestao'
import { AteAProva } from '../componentes/AteAProva'
import { PodioPrevia } from '../componentes/PodioPrevia'
import { Icone } from '../componentes/Icone'
import { ModalEntrar } from '../componentes/ModalEntrar'
import { VitrineAssinante } from '../componentes/VitrineAssinante'
import { CaixasAssinante, CartaoCronograma, usarCronogramaHoje } from '../componentes/CaixasAssinante'
import { ConviteLimiteDoDia } from '../componentes/LimiteRespostas'
import { SecaoIndique } from '../componentes/SecaoIndique'
import { CartaoPlanos } from '../componentes/CartaoPlanos'
import { IconePixel } from '../componentes/IconePixel'
import { usarConquistas } from '../estado/usarConquistas'
import { recurso } from '../config'
import '@fontsource/pixelify-sans/latin-700.css'
import { type ResumoHistorico, usarSessao } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { usarConta } from '../conta/ContextoConta'
import { PerguntaEtapa } from '../componentes/PerguntaEtapa'
import { contasDisponiveis } from '../conta/supabase'
import { EXIGIR_CONTA_PARA_QUESTOES } from '../config'
import { planoRevisao } from '../estado/planoRevisao'
import { usarRitmoRevisao } from '../estado/preferencias'
import { calcularStreak } from '../estado/streak'
import { FUSO_DIA, chaveDia } from '../estado/limiteDiario'
import { proximaFraseInicio } from '../dados/frasesInicio'
import '../estilos/paginas/Inicio.css'

/** "Hoje", "Ontem" ou a data curta: a lista de sessões lê melhor assim. */
function quandoFoi(instante: number): string {
  const dia = chaveDia(new Date(instante))
  if (dia === chaveDia()) return 'Hoje'
  if (dia === chaveDia(new Date(Date.now() - 86400000))) return 'Ontem'
  return new Date(instante).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: FUSO_DIA }).replace('.', '')
}

const VARIACOES_INICIO = [
  { explicacao: 'Errou? A questão volta hoje. Acertou por chute? Volta amanhã. Acertou com certeza? Só reaparece daqui a semanas.', acao: 'Treinar 10 questões', revisar: 'Retome o que precisa fixar', novas: 'Avance no acervo' },
  { explicacao: 'Comece pelas revisões de hoje. Sessões curtas e frequentes fixam mais do que maratonas de fim de semana.', acao: 'Fazer 10 questões agora', revisar: 'Transforme erro em domínio', novas: 'Descubra um assunto novo' },
  { explicacao: 'Uma questão lida com atenção vale mais do que dez respondidas no automático. Leia o comentário, entenda e siga.', acao: 'Começar sessão de 10', revisar: 'Volte ao que ainda desafia', novas: 'Amplie seu repertório' },
  { explicacao: 'A fila prioriza o que venceu e o que você errou. O intervalo entre as revisões também faz parte do estudo.', acao: 'Treinar 10 questões', revisar: 'Sua fila de consolidação', novas: 'Comece algo diferente' },
  { explicacao: 'Erros voltam cedo; acertos seguros ganham intervalos longos. Assim o seu tempo vai para onde rende mais.', acao: 'Praticar 10 questões', revisar: 'Fortaleça os pontos frágeis', novas: 'Explore questões inéditas' },
]

/** As provas do acervo, cada uma com a cor da sua linha (a mesma do mapa de metrô do marketing). */
const PROVAS_DO_ACERVO = [
  { nome: 'TEOT', cor: '#7ee0c8' },
  { nome: 'TARO', cor: '#7ee0c8' },
  { nome: 'R4 ENARE', cor: '#f08f78' },
  { nome: 'R4 Coluna', cor: '#8fb6ef' },
  { nome: 'Cirurgia da mão', cor: '#f0c46a' },
  { nome: 'Fellowship de quadril', cor: '#c5a8f0' },
  { nome: 'TECOC', cor: '#9fd8f2' },
]

export function Inicio() {
  const { indice, carregando } = usarIndice()
  const { iniciar } = usarSessao()
  const { sessao: conta } = usarConta()
  const cronograma = usarCronogramaHoje()
  const { conquistadas, total: totalConquistas, streak: sequenciaViva } = usarConquistas()
  // Sem conta, as questões ficam fechadas (ver config.ts): o botão principal leva ao cadastro.
  const pedeConta = EXIGIR_CONTA_PARA_QUESTOES && contasDisponiveis && !conta
  const [sessao] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)

  const { contexto } = usarContextoLocal('')
  const contagens = useMemo(
    () => (indice ? contar(indice, { ...FILTROS_VAZIOS, areas: AREAS_TREINO }, contexto) : null),
    [indice, contexto],
  )
  const [historico] = usarArmazenado<ResumoHistorico[]>('historico', [])
  const [textoDoDia] = useState(() => VARIACOES_INICIO[Math.floor(Math.random() * VARIACOES_INICIO.length)])
  const [cabecalhoDoDia] = useState(proximaFraseInicio)
  const [modalEntrarAberto, definirModalEntrarAberto] = useState(false)

  const { ritmo } = usarRitmoRevisao()
  const revisoesPlanejadas = useMemo(
    () => (indice ? planoRevisao(indice, contexto.respondidas, 7, ritmo) : new Map()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indice, contexto.respondidas, ritmo.limite, ritmo.folgas.join(',')],
  )
  const temaFragil = useMemo(() => {
    if (!indice) return null
    const porTema = new Map<string, { acertos: number; tentativas: number; pendentes: number; slug: string }>()
    for (const item of indice.questoes) {
      const registro = contexto.respondidas[item.id]
      if (!registro) continue
      const tema = indice.temas[item.t]
      if (!tema) continue
      const atual = porTema.get(tema.nome) ?? { acertos: 0, tentativas: 0, pendentes: 0, slug: tema.slug }
      atual.acertos += registro.acertos ?? Number(registro.c === true)
      atual.tentativas += registro.tentativas ?? 1
      porTema.set(tema.nome, atual)
    }
    for (const dia of revisoesPlanejadas.values()) for (const [tema, quantidade] of dia.temas) {
      const atual = porTema.get(tema)
      if (atual) atual.pendentes += quantidade
    }
    return [...porTema.entries()]
      .filter(([, valor]) => valor.tentativas >= 2)
      .sort((a, b) => a[1].acertos / a[1].tentativas - b[1].acertos / b[1].tentativas)[0] ?? null
  }, [indice, contexto.respondidas, revisoesPlanejadas])
  // Questões por dia nos últimos 7 dias (fuso de São Paulo), contadas pelo
  // histórico de cada resposta, inclusive as de sessões não concluídas.
  const semana = useMemo(() => {
    const dias = Array.from({ length: 7 }, (_, i) => {
      const data = new Date(Date.now() - (6 - i) * 86400000)
      return {
        chave: chaveDia(data), hoje: i === 6, total: 0, acertos: 0,
        rotulo: i === 6 ? 'Hoje' : data.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: FUSO_DIA }).replace('.', ''),
        nomeCompleto: i === 6 ? 'Hoje' : data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', timeZone: FUSO_DIA }),
      }
    })
    const porChave = new Map(dias.map(d => [d.chave, d]))
    const inicio = Date.now() - 8 * 86400000
    for (const registro of Object.values(contexto.respondidas)) {
      const eventos = registro.historico?.length ? registro.historico : [{ em: registro.q, correta: registro.c }]
      for (const evento of eventos) {
        if (!evento.em || evento.em < inicio) continue
        const dia = porChave.get(chaveDia(new Date(evento.em)))
        if (!dia) continue
        dia.total++
        if (evento.correta === true) dia.acertos++
      }
    }
    const total = dias.reduce((soma, d) => soma + d.total, 0)
    const acertos = dias.reduce((soma, d) => soma + d.acertos, 0)
    return { dias, total, acerto: total ? Math.round((acertos / total) * 100) : null, diasAtivos: dias.filter(d => d.total > 0).length, maximo: Math.max(1, ...dias.map(d => d.total)) }
  }, [contexto.respondidas])

  /** Treino rápido: uma sessão embaralhada de todo o acervo, num clique. */
  function treinoRapido(quantidade: number) {
    if (!indice) return
    if (sessaoEmAndamento && !window.confirm('Iniciar outro treino substitui a sessão em andamento. Seu histórico será mantido. Continuar?')) return
    const filtros = { ...FILTROS_VAZIOS, embaralhar: true, limite: quantidade }
    iniciar(filtros, montarSessao(indice, filtros, Date.now()))
    navegar('/sessao')
  }

  const sessaoEmAndamento =
    sessao && !sessao.concluidaEm && Object.keys(sessao.respostas).length < sessao.ids.length

  const nome = String(conta?.user.user_metadata?.nome ?? '').trim()
  const revisarHoje = contagens?.porSituacao.revisarHoje ?? 0
  const streak = useMemo(() => calcularStreak(contexto.respondidas), [contexto.respondidas])
  const desempenho = useMemo(() => {
    const registros = Object.values(contexto.respondidas)
    const tentativas = registros.reduce((t, r) => t + (r.tentativas ?? 1), 0)
    const acertos = registros.reduce((t, r) => t + (r.acertos ?? Number(r.c === true)), 0)
    return { respondidas: registros.length, acerto: tentativas ? Math.round((acertos / tentativas) * 100) : null }
  }, [contexto.respondidas])
  const respondidasPorTema = useMemo(() => {
    const mapa: Record<string, number> = {}
    if (!indice) return mapa
    for (const item of indice.questoes) {
      if (!contexto.respondidas[item.id]) continue
      const slug = indice.temas[item.t]?.slug
      if (slug) mapa[slug] = (mapa[slug] ?? 0) + 1
    }
    return mapa
  }, [indice, contexto.respondidas])
  // Com cronograma e meta ainda por fazer, a meta de hoje é a ação principal do topo.
  const metaHoje = cronograma.calculo && !cronograma.calculo.provaPassou && !cronograma.calculo.naRetaFinal && cronograma.calculo.hoje && cronograma.calculo.faltaHoje ? cronograma.calculo : null
  const titulo = nome ? cabecalhoDoDia.comNome(`${conta?.user.user_metadata?.situacao === 'ortopedista' ? 'Dr. ' : ''}${nome}`) : cabecalhoDoDia.semNome

  return (
    <div className="empilha-2">
      {sessaoEmAndamento && (
        <a className="aviso-sessao nao-imprime" href={href('/sessao')}>
          <Icone nome="raio" tamanho={22} />
          <span>
            <strong>Você tem uma sessão em andamento</strong>
            <small>{Object.keys(sessao!.respostas).length} de {sessao!.ids.length} respondidas. Toque para continuar</small>
          </span>
          <Icone nome="direita" tamanho={20} />
        </a>
      )}
      <PerguntaEtapa />
      <section className="inicio-heroi">
        <div className="inicio-heroi__texto">
          {indice && indice.total > 0 && (
            <div className="inicio-provas">
              <p className="inicio-provas__titulo"><span className="ponto-vivo" aria-hidden="true" /> Provas oficiais comentadas</p>
              <ul className="inicio-provas__lista" aria-label="Provas no acervo">
                {PROVAS_DO_ACERVO.map(({ nome, cor }) => (
                  <li key={nome} style={{ '--cor-linha': cor } as CSSProperties}>{nome}</li>
                ))}
              </ul>
            </div>
          )}
          <h1>{titulo}</h1>
          <p className="inicio-heroi__sub">{metaHoje
            ? <>Faltam <strong>{metaHoje.diasAteProva} dias</strong> para a prova. Meta de hoje: <strong>{metaHoje.feitasHoje} de {metaHoje.metaDiaria}</strong> questões de <strong>{metaHoje.hoje?.nome}</strong>{metaHoje.hoje?.focos[0] ? `, começando por ${metaHoje.hoje.focos[0].toLowerCase()}` : ''}.</>
            : cabecalhoDoDia.incentivo}</p>
          {indice && contagens && indice.total > 0 && (
            <div className="inicio-heroi__acoes">
              {pedeConta ? (
                <>
                  <a className="botao botao--claro botao--grande" href={href('/conta?modo=criar&voltar=%2Ftreinar')}>
                    <Icone nome="raio" tamanho={18} /> Criar conta grátis e treinar
                  </a>
                  <button type="button" className="inicio-heroi__entrar" onClick={() => definirModalEntrarAberto(true)}>Já tenho conta · Entrar</button>
                  <p className="inicio-heroi__pratico"><Icone nome="certo" tamanho={14} /> No celular ou no computador, de onde estiver: sua conta continua de onde você parou.</p>
                </>
              ) : sessaoEmAndamento ? (
                <a className="botao botao--claro botao--grande" href={href('/sessao')}>
                  <Icone nome="raio" tamanho={18} /> Continuar sessão · {Object.keys(sessao!.respostas).length}/{sessao!.ids.length}
                </a>
              ) : metaHoje ? (
                <a className="botao botao--claro botao--grande" href={href('/cronograma')}>
                  <Icone nome="rota" tamanho={18} /> Começar a meta de hoje
                </a>
              ) : (
                <button type="button" className="botao botao--claro botao--grande" onClick={() => treinoRapido(10)} disabled={contagens.total < 10}>
                  <Icone nome="raio" tamanho={18} /> {textoDoDia.acao}
                </button>
              )}
              {!pedeConta && (
                <div className="inicio-heroi__secundarias">
                  <a className="inicio-atalho-heroi" href={href('/treinar')}>
                    <Icone nome="filtro" tamanho={18} />
                    <span>Montar minha sessão</span>
                  </a>
                  {conta && (
                    <a className="inicio-atalho-heroi" href={href('/revisao')}>
                      <Icone nome="calendario" tamanho={18} />
                      <span>Revisar hoje</span>
                      <strong className="inicio-atalho-heroi__contador numerico">{revisarHoje}</strong>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {conta ? (
          <div className="inicio-heroi__painel" aria-label="Seu dia">
            <div className="inicio-kpi">
              <span className="inicio-kpi__icone"><Icone nome="fogo" tamanho={18} /></span>
              <span className="inicio-kpi__rotulo">Sequência</span>
              <strong className="numerico">{streak.atual} {streak.atual === 1 ? 'dia' : 'dias'}</strong>
            </div>
            <a className="inicio-kpi" href={href('/dados')}>
              <span className="inicio-kpi__icone"><Icone nome="alvo" tamanho={18} /></span>
              <span className="inicio-kpi__rotulo">Acerto geral</span>
              <strong className="numerico">{desempenho.acerto === null ? '0%' : `${desempenho.acerto}%`}</strong>
            </a>
            <a className="inicio-kpi" href={href('/dados')}>
              <span className="inicio-kpi__icone"><Icone nome="certo" tamanho={18} /></span>
              <span className="inicio-kpi__rotulo">Respondidas</span>
              <strong className="numerico">{desempenho.respondidas.toLocaleString('pt-BR')}</strong>
            </a>
          </div>
        ) : (
          <AmostraQuestao />
        )}
      </section>
      <ModalEntrar aberto={modalEntrarAberto} aoFechar={() => definirModalEntrarAberto(false)} />

      {carregando && <Carregando linhas={3} rotulo="Carregando o acervo" />}

      {indice && contagens && indice.total === 0 && (
        <Estado
          titulo="O acervo ainda está sendo importado."
          acoes={
            <>
              <a className="botao" href={href('/sobre')}>
                Sobre o projeto
              </a>
              <a className="botao" href={href('/contato')}>
                Falar com o autor
              </a>
            </>
          }
        >
          <p>
            As questões chegam por tema, conferidas uma a uma antes de entrar no ar. Assim que o
            primeiro tema for publicado, ele aparece aqui.
          </p>
        </Estado>
      )}

      {indice && contagens && indice.total > 0 && (
        <>
          <CartaoCronograma cronograma={cronograma} />

          {!cronograma.calculo && <AteAProva total={indice.total} conta={Boolean(conta)} />}

          <section className="inicio-ranking" aria-label="Ranking e conquistas">
            <img className="inicio-ranking__coroa" src={recurso('emblemas/podio-1.png')} alt="" width={72} height={72} />
            <div className="inicio-ranking__texto">
              <p className="inicio-ranking__selo">Ranking e conquistas</p>
              <h2>{conta ? <>Suba no <em>ranking</em> e destrave emblemas</> : <>Entre no <em>ranking</em> de quem mais estuda</>}</h2>
              <p>{conta
                ? <>Você tem <b>{conquistadas}</b> de {totalConquistas} conquistas{sequenciaViva.atual >= 3 ? <> · <b>{sequenciaViva.atual} dias</b> seguidos</> : ''}. Exiba três no seu nome.</>
                : 'Cada questão respondida conta pontos, destrava emblemas e acende a sua fogueira de dias seguidos.'}</p>
              {!conta && <PodioPrevia />}
            </div>
            <div className="inicio-ranking__acoes">
              <a className="botao botao--ouro" href={href('/ranking')}>Ver ranking</a>
              <a className="botao inicio-ranking__secundario" href={href('/conquistas')}>Minhas conquistas</a>
            </div>
          </section>

          <CartaoPlanos />

          <SecaoIndique />

          <nav className="inicio-atalhos" aria-label="Atalhos">
            <a className="inicio-atalho" href={href('/treinar')}>
              <span className="inicio-atalho__icone inicio-atalho__icone--pixel"><IconePixel nome="treinar" tamanho={44} /></span>
              <span className="inicio-atalho__titulo">Treinar</span>
              <span className="inicio-atalho__nota">Por tema, prova ou dificuldade</span>
            </a>
            <a className="inicio-atalho" href={href('/revisao')}>
              <span className="inicio-atalho__icone inicio-atalho__icone--pixel"><IconePixel nome="revisao" tamanho={44} /></span>
              <span className="inicio-atalho__titulo">Revisão {revisarHoje > 0 && <span className="acao-rapida__contador">{revisarHoje}</span>}</span>
              <span className="inicio-atalho__nota">O que vence hoje e nos próximos dias</span>
            </a>
            <a className="inicio-atalho" href={href('/dados')}>
              <span className="inicio-atalho__icone inicio-atalho__icone--pixel"><IconePixel nome="desempenho" tamanho={44} /></span>
              <span className="inicio-atalho__titulo">Desempenho</span>
              <span className="inicio-atalho__nota">Sua evolução por tema e por prova</span>
            </a>
            <a className="inicio-atalho inicio-atalho--ouro" href={href('/ranking')}>
              <span className="inicio-atalho__icone inicio-atalho__icone--pixel"><IconePixel nome="ranking" tamanho={44} /></span>
              <span className="inicio-atalho__titulo">Ranking</span>
              <span className="inicio-atalho__nota">{conta ? 'Sua posição e seus emblemas' : 'Quem mais estuda por aqui'}</span>
            </a>
          </nav>

          <div className="inicio-grade">
            <section className="inicio-hoje" aria-labelledby="inicio-hoje-titulo">
              <h2 id="inicio-hoje-titulo">Seu estudo de hoje</h2>
              <p className="inicio-hoje__intro">{Object.keys(contexto.respondidas).length > 0 || conta
                ? textoDoDia.explicacao
                : <>Com a conta, esta área organiza o seu dia: o que revisar, o que ainda é novo e o que você já domina. <a href={href('/conta?modo=criar')}>Criar conta grátis</a></>}</p>
              {(
                <div className="inicio-hoje__lista">
                  <a className="inicio-hoje__item inicio-hoje__item--destaque" href={href('/treinar?areas=base,enare,coluna,mao&situacao=revisarHoje&limite=20')}>
                    <span className="inicio-hoje__icone"><Icone nome="calendario" tamanho={18} /></span>
                    <span className="inicio-hoje__rotulo"><strong>Revisar hoje</strong><small>{textoDoDia.revisar}</small></span>
                    <b className="numerico">{(contagens.porSituacao.revisarHoje ?? 0).toLocaleString('pt-BR')}</b>
                  </a>
                  <a className="inicio-hoje__item" href={href('/treinar?areas=base,enare,coluna,mao&situacao=naoRespondidas&limite=10')}>
                    <span className="inicio-hoje__icone"><Icone nome="livro" tamanho={18} /></span>
                    <span className="inicio-hoje__rotulo"><strong>Questões novas</strong><small>{textoDoDia.novas}</small></span>
                    <b className="numerico">{(contagens.porSituacao.naoRespondidas ?? 0).toLocaleString('pt-BR')}</b>
                  </a>
                  <a className="inicio-hoje__item" href={href('/treinar?areas=base,enare,coluna,mao&situacao=dominadas')}>
                    <span className="inicio-hoje__icone"><Icone nome="medalha" tamanho={18} /></span>
                    <span className="inicio-hoje__rotulo"><strong>Dominadas</strong><small>Ciclo de revisão completo</small></span>
                    <b className="numerico">{(contagens.porSituacao.dominadas ?? 0).toLocaleString('pt-BR')}</b>
                  </a>
                </div>
              )}
            </section>

            {temaFragil && (() => {
              const acerto = Math.round((temaFragil[1].acertos / temaFragil[1].tentativas) * 100)
              return <section className="inicio-foco" aria-labelledby="inicio-foco-titulo">
                <h2 id="inicio-foco-titulo">Onde você mais erra</h2>
                <p className="inicio-foco__tema">{temaFragil[0]}</p>
                <div className="inicio-foco__medida">
                  <span className="inicio-foco__valor numerico">{100 - acerto}%</span>
                  <span className="inicio-foco__rotulo">de erro neste tema ({acerto}% de acerto)</span>
                </div>
                <span className="inicio-foco__barra inicio-foco__barra--erro" role="img" aria-label={`${100 - acerto}% de erro`}><span style={{ width: `${Math.max(3, 100 - acerto)}%` }} /></span>
                <dl className="inicio-foco__numeros">
                  <div><dt>Respostas</dt><dd className="numerico">{temaFragil[1].tentativas.toLocaleString('pt-BR')}</dd></div>
                  <div><dt>Erros</dt><dd className="numerico">{(temaFragil[1].tentativas - temaFragil[1].acertos).toLocaleString('pt-BR')}</dd></div>
                  <div><dt>Revisões</dt><dd className="numerico">{temaFragil[1].pendentes.toLocaleString('pt-BR')}</dd></div>
                </dl>
                <p className="texto-2">De todos os temas que você já treinou, é onde você mais erra. Por isso é onde uma sessão curta rende mais pontos na prova.</p>
                <a className="botao botao--principal" href={href(`/treinar?areas=base,enare,coluna,mao&temas=${temaFragil[1].slug}&limite=10`)}>Treinar este tema <Icone nome="direita" tamanho={16} /></a>
              </section>
            })()}
          </div>

          <ConviteLimiteDoDia />
          <CaixasAssinante />
          <VitrineAssinante />

          <div className="inicio-grade">
            {Object.keys(contexto.respondidas).length > 0 && <section className="inicio-semana" aria-labelledby="inicio-semana-titulo">
              <h2 id="inicio-semana-titulo">{semana.total > 0 ? `${semana.total.toLocaleString('pt-BR')} ${semana.total === 1 ? 'questão' : 'questões'} em 7 dias` : 'Nenhuma questão nos últimos 7 dias'}</h2>
              <dl className="inicio-semana__numeros">
                <div><dt>Dias ativos</dt><dd className="numerico">{semana.diasAtivos} de 7</dd></div>
                <div><dt>Acerto</dt><dd className="numerico">{semana.acerto === null ? '—' : `${semana.acerto}%`}</dd></div>
                <div><dt>Média por dia</dt><dd className="numerico">{semana.diasAtivos ? Math.round(semana.total / semana.diasAtivos) : 0}</dd></div>
              </dl>
              <ol className="inicio-semana__grafico" aria-label="Questões respondidas por dia">
                {semana.dias.map(dia => (
                  <li key={dia.chave} className={dia.hoje ? 'inicio-semana__dia--hoje' : undefined} title={`${dia.nomeCompleto}: ${dia.total} ${dia.total === 1 ? 'questão' : 'questões'}${dia.total ? `, ${Math.round((dia.acertos / dia.total) * 100)}% de acerto` : ''}`}>
                    <span className="inicio-semana__coluna"><span style={{ height: `${dia.total ? Math.max(6, (dia.total / semana.maximo) * 100) : 0}%` }} /></span>
                    <span className="inicio-semana__rotulo">{dia.rotulo}</span>
                    <span className="inicio-semana__sr">{dia.nomeCompleto}: {dia.total} {dia.total === 1 ? 'questão' : 'questões'}</span>
                  </li>
                ))}
              </ol>
            </section>}
              {historico.length > 0 && (
              <section className="inicio-bloco inicio-bloco--sessoes">
                <h2>Suas últimas sessões</h2>
                <ol className="inicio-sessoes">
                  {historico.slice(0, 3).map((h) => {
                    const acerto = h.respondidas > 0 ? Math.round((h.acertos / h.respondidas) * 100) : null
                    return (
                      <li key={h.id} className="inicio-sessao">
                        <span className="inicio-sessao__quando">{quandoFoi(h.concluidaEm)}</span>
                        <span className="inicio-sessao__nome">
                          <strong>{h.descricao}</strong>
                          <small>{h.respondidas} de {h.total} {h.total === 1 ? 'questão' : 'questões'}</small>
                        </span>
                        <span className={`inicio-sessao__acerto inicio-sessao__acerto--${acerto === null ? 'vazio' : acerto >= 70 ? 'bom' : acerto >= 50 ? 'medio' : 'baixo'}`}>
                          {acerto === null ? '—' : `${acerto}%`}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </section>
            )}
          </div>

          <section className="inicio-bloco">
            <h2>Por tema</h2>
            <p className="meta" style={{ marginTop: '0.25rem' }}>
              Um clique monta a sessão do tema inteiro.
            </p>
            <ul className="inicio-temas">
              {indice.temas
                .filter((tema) => (contagens.porTema[tema.slug] ?? 0) > 0)
                .map((tema) => {
                  const quantidade = contagens.porTema[tema.slug] ?? 0
                  const feitas = Math.min(quantidade, respondidasPorTema[tema.slug] ?? 0)
                  const porcento = quantidade ? Math.round((feitas / quantidade) * 100) : 0
                  return (
                    <li key={tema.slug}>
                      <a className="inicio-tema" href={href(`/treinar?areas=base,enare,coluna,mao&temas=${tema.slug}`)}>
                        <span className="inicio-tema__nome">{tema.nome}</span>
                        <span className="inicio-tema__numeros numerico">{feitas > 0 ? `${feitas} de ${quantidade}` : `${quantidade} questões`}</span>
                        <span className="inicio-tema__trilho" aria-hidden="true"><span style={{ width: `${Math.max(feitas > 0 ? 2 : 0, porcento)}%` }} /></span>
                        <Icone nome="direita" tamanho={16} />
                      </a>
                    </li>
                  )
                })}
            </ul>
          </section>

        </>
      )}
      {!conta && (
        <section className="inicio-bloco inicio-seo" aria-labelledby="inicio-apresentacao">
          <h2 id="inicio-apresentacao">Orto Questões: banco de questões comentadas</h2>
          <p>O Orto Questões reúne questões para TEOT, TARO, cirurgia da mão, R4 ENARE, quadril e coluna. Estude por assunto, entenda as alternativas e revise seus erros.</p>
          <nav className="inicio-guias" aria-label="Conheça o banco e organize sua preparação">
            <a href={recurso('questoes/')}>Questões por assunto</a>
            <a href={recurso('guias/preparacao-teot-taro.html')}>Preparação para TEOT e TARO</a>
            <a href={recurso('guias/curso-de-ortopedia.html')}>Curso de ortopedia: como escolher</a>
            <a href={recurso('guias/como-estudar-para-o-taro.html')}>Como estudar para o TARO</a>
            <a href={recurso('guias/questoes-cirurgia-da-mao.html')}>Cirurgia da mão</a>
            <a href={recurso('guias/questoes-r4-quadril-coluna.html')}>R4 de quadril e coluna</a>
          </nav>
        </section>
      )}
    </div>
  )
}

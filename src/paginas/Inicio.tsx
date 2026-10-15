import { usarContextoLocal } from '../estado/usarContextoLocal'
import { type CSSProperties, type ReactNode, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { contar, montarSessao } from '../dados/acervo'
import { AREAS_TREINO, FILTROS_VAZIOS } from '../dados/tipos'
import { href, navegar } from '../util/rotas'
import { Carregando, Estado } from '../componentes/Estados'
import { AteAProva } from '../componentes/AteAProva'
import { PodioPrevia } from '../componentes/PodioPrevia'
import { Icone } from '../componentes/Icone'
import { IconePixel } from '../componentes/IconePixel'
import { Medalha } from '../componentes/Medalha'
import { ModalEntrar } from '../componentes/ModalEntrar'
import { VitrineAssinante } from '../componentes/VitrineAssinante'
import { CaixasAssinante, CartaoCronograma, TrilhaJornada, usarCronogramaHoje } from '../componentes/CaixasAssinante'
import { NovidadeSimulados } from '../componentes/NovidadeSimulados'
import { ConviteLimiteDoDia } from '../componentes/LimiteRespostas'
import { SecaoIndique } from '../componentes/SecaoIndique'
import { CartaoPlanos } from '../componentes/CartaoPlanos'
import { AmostraRespondivel } from '../componentes/inicio/AmostraRespondivel'
import { usarConquistas } from '../estado/usarConquistas'
import { emblemasQuaseLa } from '../estado/conquistas'
import { FLASHCARDS_NA_CAPA, fraseGratis, recurso } from '../config'
import { type ResumoHistorico, usarSessao } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { usarConta } from '../conta/ContextoConta'
import { CompletarPerfil } from '../componentes/CompletarPerfil'
import { contasDisponiveis } from '../conta/supabase'
import { EXIGIR_CONTA_PARA_QUESTOES } from '../config'
import { planoRevisao } from '../estado/planoRevisao'
import { usarRitmoRevisao } from '../estado/preferencias'
import { META_STREAK_DIARIA, calcularStreak } from '../estado/streak'
import { FUSO_DIA, chaveDia } from '../estado/limiteDiario'
import { proximaFraseInicio } from '../dados/frasesInicio'
import '../estilos/paginas/Inicio.css'
import '../estilos/paginas/InicioPainel.css'

/*
 * Página inicial (proposta de 16/10/2026, docs/propostas/INICIO-16-10.md).
 * Duas páginas numa só, cada uma com um trabalho:
 * - Visitante: uma vitrine. Proposta de valor, uma questão para responder ali
 *   mesmo, o que o site faz, o que mais cai, cronograma, flashcards e um convite claro.
 * - Com conta: o painel do dia. UMA próxima ação no topo (continuar a sessão,
 *   a meta do cronograma, a revisão de hoje ou um treino rápido), o progresso
 *   e a sequência ao lado, atalhos, "quase lá" e o resto mais abaixo.
 */

/** "Hoje", "Ontem" ou a data curta: a lista de sessões lê melhor assim. */
function quandoFoi(instante: number): string {
  const dia = chaveDia(new Date(instante))
  if (dia === chaveDia()) return 'Hoje'
  if (dia === chaveDia(new Date(Date.now() - 86400000))) return 'Ontem'
  return new Date(instante).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: FUSO_DIA }).replace('.', '')
}

const VARIACOES_INICIO = [
  { explicacao: 'Errou? A questão volta hoje. Acertou por chute? Volta amanhã. Acertou com certeza? Só reaparece daqui a semanas.', acao: 'Treinar 10 questões' },
  { explicacao: 'Sessões curtas e frequentes fixam mais do que maratonas de fim de semana.', acao: 'Fazer 10 questões agora' },
  { explicacao: 'Uma questão lida com atenção vale mais do que dez respondidas no automático. Leia o comentário, entenda e siga.', acao: 'Começar sessão de 10' },
  { explicacao: 'A fila prioriza o que venceu e o que você errou. O intervalo entre as revisões também faz parte do estudo.', acao: 'Treinar 10 questões' },
  { explicacao: 'Erros voltam cedo; acertos seguros ganham intervalos longos. Assim o seu tempo vai para onde rende mais.', acao: 'Praticar 10 questões' },
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

/** A ação do topo do painel: uma só, a mais útil agora. */
interface ProximaAcao {
  selo: string
  titulo: string
  detalhe: ReactNode
  botao: string
  icone: 'raio' | 'rota' | 'calendario'
  destino?: string
  aoClicar?: () => void
  desabilitada?: boolean
  progresso?: { feitas: number; total: number }
}

export function Inicio() {
  const { indice, carregando } = usarIndice()
  const { iniciarComAviso } = usarSessao()
  const { sessao: conta } = usarConta()
  const cronograma = usarCronogramaHoje()
  const { metricas, conquistadas, total: totalConquistas } = usarConquistas()
  // Sem conta, as questões ficam fechadas (ver config.ts): a página vira vitrine e o botão leva ao cadastro.
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
    () => (indice && !pedeConta ? planoRevisao(indice, contexto.respondidas, 7, ritmo) : new Map()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indice, pedeConta, contexto.respondidas, ritmo.limite, ritmo.folgas.join(',')],
  )
  const temaFragil = useMemo(() => {
    if (!indice || pedeConta) return null
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
  }, [indice, pedeConta, contexto.respondidas, revisoesPlanejadas])
  // Questões por dia nos últimos 7 dias (fuso de São Paulo), contadas pelo
  // histórico de cada resposta, inclusive as de sessões não concluídas.
  const hojeChave = chaveDia(new Date())
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
    // hojeChave: aba aberta depois da meia-noite recalcula o "Hoje" no próximo render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexto.respondidas, hojeChave])

  /** Treino rápido: uma sessão embaralhada de todo o acervo, num clique. */
  async function treinoRapido(quantidade: number) {
    if (!indice) return
    const filtros = { ...FILTROS_VAZIOS, embaralhar: true, limite: quantidade }
    if (!(await iniciarComAviso(filtros, montarSessao(indice, filtros, Date.now())))) return
    navegar('/sessao')
  }

  const sessaoEmAndamento =
    sessao && !sessao.concluidaEm && Object.keys(sessao.respostas).length < sessao.ids.length

  const nome = String(conta?.user.user_metadata?.nome ?? '').trim()
  const revisarHoje = contagens?.porSituacao.revisarHoje ?? 0
  const streak = useMemo(() => calcularStreak(contexto.respondidas), [contexto.respondidas])
  const respondidasTotal = Object.keys(contexto.respondidas).length
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
  const quaseLa = useMemo(() => (pedeConta ? [] : emblemasQuaseLa(metricas, 3)), [pedeConta, metricas])

  const calculo = cronograma.calculo
  // Com cronograma e meta ainda por fazer, a meta de hoje é a ação principal do topo.
  const metaHoje = calculo && !calculo.provaPassou && !calculo.naRetaFinal && calculo.hoje && calculo.faltaHoje ? calculo : null
  const metaCumprida = calculo && !calculo.provaPassou && !calculo.naRetaFinal && calculo.hoje && !calculo.faltaHoje && calculo.metaDiaria > 0
  // A jornada do cronograma já está no painel: o cartão grande só aparece para quem não tem
  // (convite ou "montar") e na reta final, que tem texto próprio.
  const cronogramaNoPainel = Boolean(cronograma.premium && calculo && !calculo.naRetaFinal && !calculo.provaPassou)
  const titulo = nome ? cabecalhoDoDia.comNome(`${conta?.user.user_metadata?.situacao === 'ortopedista' ? 'Dr. ' : ''}${nome}`) : cabecalhoDoDia.semNome

  const acao: ProximaAcao | null = !contagens ? null
    : sessaoEmAndamento ? {
      selo: 'Continue de onde parou',
      titulo: sessao!.origem === 'cronograma' ? 'Sessão do cronograma' : 'Sua sessão de questões',
      detalhe: <>{Object.keys(sessao!.respostas).length} de {sessao!.ids.length} respondidas. Falta pouco para fechar.</>,
      botao: 'Continuar sessão', icone: 'raio', destino: '/sessao',
      progresso: { feitas: Object.keys(sessao!.respostas).length, total: sessao!.ids.length },
    }
    : metaHoje ? {
      selo: 'Cronograma de hoje',
      titulo: metaHoje.hoje!.nome,
      detalhe: <>{metaHoje.hoje!.focos[0] ? <>Começando por <strong>{metaHoje.hoje!.focos[0].toLowerCase()}</strong>. </> : null}Faltam {metaHoje.faltaHoje} {metaHoje.faltaHoje === 1 ? 'questão' : 'questões'} para a meta.</>,
      botao: 'Seguir o cronograma', icone: 'rota', destino: '/cronograma',
      progresso: { feitas: metaHoje.feitasHoje, total: metaHoje.metaDiaria },
    }
    : revisarHoje > 0 ? {
      selo: metaCumprida ? 'Meta cumprida · agora a revisão' : 'Revisão de hoje',
      titulo: `${revisarHoje.toLocaleString('pt-BR')} ${revisarHoje === 1 ? 'questão para rever' : 'questões para rever'}`,
      detalhe: 'O que você errou ou marcou com dúvida volta no dia certo. Rever hoje é o que fixa.',
      botao: 'Revisar agora', icone: 'calendario', destino: '/revisao',
    }
    : {
      selo: metaCumprida ? 'Meta de hoje cumprida' : 'Treino rápido',
      titulo: metaCumprida ? 'Quer ir além hoje?' : '10 questões, de todo o acervo',
      detalhe: textoDoDia.explicacao,
      botao: textoDoDia.acao, icone: 'raio', aoClicar: () => treinoRapido(10), desabilitada: contagens.total < 10,
    }

  const vazio = indice && contagens && indice.total === 0 && (
    <Estado
      titulo="O acervo ainda está sendo importado."
      acoes={<>
        <a className="botao" href={href('/sobre')}>Sobre o projeto</a>
        <a className="botao" href={href('/contato')}>Falar com o autor</a>
      </>}
    >
      <p>As questões chegam por tema, conferidas uma a uma antes de entrar no ar. Assim que o primeiro tema for publicado, ele aparece aqui.</p>
    </Estado>
  )
  const temAcervo = Boolean(indice && contagens && indice.total > 0)

  // ---------------------------------------------------------------- Visitante
  if (pedeConta) {
    return (
      <div className="ip ip--vitrine">
        <section className="ip-heroi ip-heroi--vitrine ip-entra" aria-labelledby="ip-vitrine-titulo">
          <div className="ip-heroi__texto">
            <p className="ip-selo"><span className="ponto-vivo" aria-hidden="true" /> Provas oficiais comentadas</p>
            <h1 id="ip-vitrine-titulo">As provas de ortopedia, <em>comentadas como uma aula</em>.</h1>
            <p className="ip-heroi__lide">Treine pelas questões oficiais do TEOT, do TARO e das provas de subespecialidade. Cada alternativa explicada, a revisão no dia certo e um cronograma até a prova.</p>
            <div className="ip-heroi__acoes">
              <a className="botao ip-botao-ouro botao--grande" href={href('/conta?modo=criar&voltar=%2Ftreinar')}>
                <Icone nome="raio" tamanho={18} /> Criar conta grátis e treinar
              </a>
              <button type="button" className="ip-heroi__entrar" onClick={() => definirModalEntrarAberto(true)}>Já tenho conta · Entrar</button>
            </div>
            <p className="ip-heroi__nota"><Icone nome="certo" tamanho={14} /> Conta grátis, {fraseGratis('curto')}. No celular ou no computador, continua de onde parou.</p>
            <ul className="ip-provas" aria-label="Provas no acervo">
              {PROVAS_DO_ACERVO.map(({ nome: prova, cor }) => <li key={prova} style={{ '--cor-linha': cor } as CSSProperties}>{prova}</li>)}
            </ul>
          </div>
          <AmostraRespondivel />
        </section>
        <ModalEntrar aberto={modalEntrarAberto} aoFechar={() => definirModalEntrarAberto(false)} />
        {carregando && <Carregando linhas={3} rotulo="Carregando o acervo" />}
        {vazio}
        <ConviteLimiteDoDia />

        <section className="ip-pilares ip-entra" aria-labelledby="ip-pilares-titulo" style={{ '--i': 1 } as CSSProperties}>
          <h2 id="ip-pilares-titulo" className="ip-invisivel">O que o Orto Questões faz por você</h2>
          {[
            { arte: 'treinar' as const, titulo: 'Questões oficiais comentadas', texto: 'Cada alternativa explicada, a certa e as erradas, com o conceito por trás.' },
            { arte: 'revisao' as const, titulo: 'Revisão no dia certo', texto: 'Errou, a questão volta logo. Acertou com certeza, só daqui a semanas.' },
            { arte: 'simulado' as const, titulo: 'Cronograma até a prova', texto: 'A lista de cada dia, passando primeiro pelo que mais cai.' },
            { arte: 'desempenho' as const, titulo: 'Seu desempenho por tema', texto: 'Onde você acerta, onde erra e o que treinar a seguir.' },
          ].map((p) => (
            <article key={p.titulo} className="ip-pilar">
              <IconePixel nome={p.arte} tamanho={44} />
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </article>
          ))}
        </section>

        {temAcervo && <>
          <CaixasAssinante />
          <CartaoCronograma cronograma={cronograma} />
          {FLASHCARDS_NA_CAPA && <QuadroFlashcards classe="inicio-flash--faixa" />}
          <AteAProva total={indice!.total} conta={false} />
          <div className="ip-dupla ip-dupla--rodape">
            <BlocoRanking conta={false} conquistadas={conquistadas} totalConquistas={totalConquistas} sequencia={streak.atual} />
            <CartaoPlanos />
          </div>
          <section className="ip-chamada" aria-labelledby="ip-chamada-titulo">
            <img src={recurso('ranking/mensageiro.png')} width={48} height={60} alt="" loading="lazy" decoding="async" />
            <div>
              <h2 id="ip-chamada-titulo">A primeira sessão leva um minuto.</h2>
              <p>Crie a conta, escolha um tema e responda. O resto o site organiza para você.</p>
            </div>
            <a className="botao ip-botao-ouro botao--grande" href={href('/conta?modo=criar&voltar=%2Ftreinar')}>Criar conta grátis</a>
          </section>
        </>}

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
      </div>
    )
  }

  // ---------------------------------------------------------------- Painel do dia
  const pctAcao = acao?.progresso && acao.progresso.total ? Math.min(100, Math.round((acao.progresso.feitas / acao.progresso.total) * 100)) : null
  const faltamSequencia = Math.max(0, META_STREAK_DIARIA - streak.hojeContagem)
  return (
    <div className="ip ip--painel">
      <section className="ip-heroi ip-heroi--painel ip-entra" aria-labelledby="ip-painel-titulo">
        <div className="ip-heroi__texto">
          <p className="ip-selo">Seu dia de estudo</p>
          <h1 id="ip-painel-titulo">{titulo}</h1>
          <p className="ip-heroi__lide">{calculo && !calculo.provaPassou
            ? <>Faltam <strong>{calculo.diasAteProva} dias</strong> para a prova. {cabecalhoDoDia.incentivo}</>
            : cabecalhoDoDia.incentivo}</p>

          {acao && (
            <div className="ip-acao">
              <p className="ip-acao__selo">{acao.selo}</p>
              <h2 className="ip-acao__titulo">{acao.titulo}</h2>
              <p className="ip-acao__detalhe">{acao.detalhe}</p>
              {acao.progresso && (
                acao.progresso.total > 0 && acao.progresso.total <= 40
                  ? <span className="ip-blocos" role="img" aria-label={`${acao.progresso.feitas} de ${acao.progresso.total}`} style={{ gridTemplateColumns: `repeat(${acao.progresso.total}, minmax(0, 1fr))` }}>
                    {Array.from({ length: acao.progresso.total }, (_, i) => <span key={i} className={i < acao.progresso!.feitas ? 'cheio' : ''} style={{ '--i': i } as CSSProperties} />)}
                  </span>
                  : <span className="ip-barra" role="img" aria-label={`${pctAcao}%`}><span style={{ width: `${pctAcao}%` }} /></span>
              )}
              <div className="ip-acao__linha">
                {acao.destino
                  ? <a className="botao ip-botao-ouro botao--grande" href={href(acao.destino)}><Icone nome={acao.icone} tamanho={18} /> {acao.botao}</a>
                  : <button type="button" className="botao ip-botao-ouro botao--grande" onClick={acao.aoClicar} disabled={acao.desabilitada}><Icone nome={acao.icone} tamanho={18} /> {acao.botao}</button>}
                {acao.progresso && <span className="ip-acao__conta numerico"><strong>{acao.progresso.feitas}</strong> de {acao.progresso.total}</span>}
              </div>
              {/* O que vem depois, sem competir com a ação principal. */}
              {(metaHoje || sessaoEmAndamento) && revisarHoje > 0 && (
                <a className="ip-acao__depois" href={href('/revisao')}><Icone nome="calendario" tamanho={15} /> Depois: {revisarHoje} {revisarHoje === 1 ? 'questão' : 'questões'} para rever hoje <Icone nome="direita" tamanho={14} /></a>
              )}
            </div>
          )}
        </div>

        <aside className="ip-progresso" aria-label="Seu progresso">
          <div className="ip-fogo">
            <img src={recurso('emblemas/fogueira.png')} width={44} height={44} alt="" className={streak.atual > 0 ? 'ip-fogo__arte ip-fogo__arte--viva' : 'ip-fogo__arte ip-fogo__arte--apagada'} />
            <div>
              <strong>{streak.atual} {streak.atual === 1 ? 'dia seguido' : 'dias seguidos'}</strong>
              <small>{streak.metaHojeAtingida ? 'Hoje já conta. Fogueira acesa.' : streak.emRisco ? `Faltam ${faltamSequencia} hoje para manter.` : `${META_STREAK_DIARIA} questões por dia acendem a fogueira.`}</small>
            </div>
          </div>
          <ol className="ip-semana-pontos" aria-label="Últimos 7 dias">
            {semana.dias.map((dia) => (
              <li key={dia.chave} className={(dia.total >= META_STREAK_DIARIA ? 'cheio' : dia.total > 0 ? 'meio' : '') + (dia.hoje ? ' hoje' : '')} title={`${dia.nomeCompleto}: ${dia.total} ${dia.total === 1 ? 'questão' : 'questões'}`}>
                <span aria-hidden="true" />
                <small>{dia.hoje ? 'Hoje' : dia.rotulo.slice(0, 3)}</small>
              </li>
            ))}
          </ol>
          <dl className="ip-numeros">
            <div><dt>Na semana</dt><dd className="numerico">{semana.total.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Acerto 7 dias</dt><dd className="numerico">{semana.acerto === null ? '—' : `${semana.acerto}%`}</dd></div>
            <div><dt>Respondidas</dt><dd className="numerico">{respondidasTotal.toLocaleString('pt-BR')}</dd></div>
          </dl>
          {cronogramaNoPainel && calculo && calculo.semanas.length > 0 && (
            <a className="ip-jornada" href={href('/cronograma')} aria-label="Abrir o cronograma">
              <span className="ip-jornada__rotulo"><Icone nome="rota" tamanho={14} /> Sua jornada até a prova</span>
              <TrilhaJornada semanas={calculo.semanas} />
            </a>
          )}
        </aside>
      </section>

      <nav className="ip-atalhos ip-entra" aria-label="Atalhos" style={{ '--i': 1 } as CSSProperties}>
        <a className="ip-atalho" href={href('/treinar')}>
          <IconePixel nome="treinar" tamanho={40} />
          <span><strong>Treinar</strong><small>Monte a sua sessão</small></span>
        </a>
        <a className="ip-atalho" href={href('/revisao')}>
          <IconePixel nome="revisao" tamanho={40} />
          <span><strong>Revisão</strong><small>{revisarHoje ? `${revisarHoje.toLocaleString('pt-BR')} para hoje` : 'Em dia por hoje'}</small></span>
          {revisarHoje > 0 && <b className="ip-atalho__contador numerico">{revisarHoje > 99 ? '99+' : revisarHoje}</b>}
        </a>
        {FLASHCARDS_NA_CAPA && <>
          <a className="ip-atalho ip-atalho--arte" href={href('/flashcards/biblioteca')} style={{ '--arte': `url(${recurso('flashcards/promo/cartao-biblioteca.png')})` } as CSSProperties}>
            <span><strong>Estudar flashcards</strong><small>Revisão espaçada</small></span>
          </a>
          <a className="ip-atalho ip-atalho--arte ip-atalho--jogo" href={href('/flashcards/cripta')} style={{ '--arte': `url(${recurso('flashcards/promo/cartao-cripta.png')})` } as CSSProperties}>
            <span><strong>Jogar o Torneio</strong><small>Flashcards · Beta</small></span>
          </a>
        </>}
      </nav>

      <ModalEntrar aberto={modalEntrarAberto} aoFechar={() => definirModalEntrarAberto(false)} />
      <ConviteLimiteDoDia />
      {carregando && <Carregando linhas={3} rotulo="Carregando o acervo" />}
      {vazio}

      {temAcervo && <>
        <div className="ip-trio">
          {quaseLa.length > 0 && (
            <section className="ip-cartao ip-quase" aria-labelledby="ip-quase-titulo">
              <header className="ip-cartao__cabeca">
                <h2 id="ip-quase-titulo">Quase lá</h2>
                <a href={href('/conquistas')}>{conquistadas} de {totalConquistas} <Icone nome="direita" tamanho={14} /></a>
              </header>
              <ul className="ip-quase__lista">
                {quaseLa.map((q) => (
                  <li key={q.emblema.id}>
                    <Medalha conquista={q.emblema} tamanho={40} />
                    <span className="ip-quase__texto">
                      <strong>{q.emblema.rotulo}</strong>
                      <small>Faltam {q.texto}</small>
                      <span className="ip-barra ip-barra--fina" aria-hidden="true"><span style={{ width: `${Math.max(4, Math.round(q.fracao * 100))}%` }} /></span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {temaFragil && (() => {
            const acerto = Math.round((temaFragil[1].acertos / temaFragil[1].tentativas) * 100)
            return (
              <section className="ip-cartao ip-foco" aria-labelledby="ip-foco-titulo">
                <header className="ip-cartao__cabeca"><h2 id="ip-foco-titulo">Onde uma sessão rende mais</h2></header>
                <p className="ip-foco__tema">{temaFragil[0]}</p>
                <p className="ip-foco__texto">É o tema em que você mais erra até aqui ({acerto}% de acerto em {temaFragil[1].tentativas} respostas){temaFragil[1].pendentes ? `, com ${temaFragil[1].pendentes} ${temaFragil[1].pendentes === 1 ? 'revisão marcada' : 'revisões marcadas'} na semana` : ''}. Dez questões dele agora valem mais do que trinta de um tema que você já domina.</p>
                <a className="botao ip-botao-contorno" href={href(`/treinar?areas=${AREAS_TREINO.join(',')}&temas=${temaFragil[1].slug}&limite=10`)}>Treinar 10 deste tema <Icone nome="direita" tamanho={16} /></a>
              </section>
            )
          })()}

          {respondidasTotal > 0 && (
            <section className="ip-cartao ip-semana" aria-labelledby="ip-semana-titulo">
              <header className="ip-cartao__cabeca">
                <h2 id="ip-semana-titulo">Sua semana</h2>
                <a href={href('/dados')}>Desempenho <Icone nome="direita" tamanho={14} /></a>
              </header>
              <ol className="ip-semana__grafico" aria-label="Questões respondidas por dia">
                {semana.dias.map((dia, i) => (
                  <li key={dia.chave} className={dia.hoje ? 'hoje' : undefined} title={`${dia.nomeCompleto}: ${dia.total} ${dia.total === 1 ? 'questão' : 'questões'}`}>
                    <span className="ip-semana__coluna"><span style={{ height: `${dia.total ? Math.max(8, (dia.total / semana.maximo) * 100) : 0}%`, '--i': i } as CSSProperties} /></span>
                    <small>{dia.hoje ? 'Hoje' : dia.rotulo.slice(0, 3)}</small>
                  </li>
                ))}
              </ol>
              {historico.length > 0 && (
                <ol className="ip-sessoes">
                  {historico.slice(0, 3).map((h) => {
                    const acerto = h.respondidas > 0 ? Math.round((h.acertos / h.respondidas) * 100) : null
                    return (
                      <li key={h.id}>
                        <span className="ip-sessoes__quando">{quandoFoi(h.concluidaEm)}</span>
                        <span className="ip-sessoes__nome">{h.descricao}</span>
                        <span className={`ip-sessoes__acerto ip-sessoes__acerto--${acerto === null ? 'vazio' : acerto >= 70 ? 'bom' : acerto >= 50 ? 'medio' : 'baixo'}`}>{acerto === null ? '—' : `${acerto}%`}</span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          )}
        </div>

        {/* Depois do estudo do dia, não antes: os pedidos (perfil, novidade) não podem empurrar a ação principal para baixo. */}
        <CompletarPerfil />
        {cronogramaNoPainel && <NovidadeSimulados plano={cronograma.plano} aoMudarPlano={cronograma.definirPlano} />}
        {!cronogramaNoPainel && !cronograma.carregando && <CartaoCronograma cronograma={cronograma} />}
        {!calculo && !cronograma.carregando && respondidasTotal < 30 && <AteAProva total={indice!.total} conta={Boolean(conta)} />}

        <section className="ip-temas" aria-labelledby="ip-temas-titulo">
          <header className="ip-secao-cabeca">
            <h2 id="ip-temas-titulo">Treinar por tema</h2>
            <p>Um toque monta a sessão do tema. A barra mostra quanto você já passou por ele.</p>
          </header>
          <ul className="ip-temas__lista">
            {indice!.temas
              .filter((tema) => (contagens!.porTema[tema.slug] ?? 0) > 0)
              .map((tema) => {
                const quantidade = contagens!.porTema[tema.slug] ?? 0
                const feitas = Math.min(quantidade, respondidasPorTema[tema.slug] ?? 0)
                const porcento = quantidade ? Math.round((feitas / quantidade) * 100) : 0
                return (
                  <li key={tema.slug}>
                    <a className="ip-tema" href={href(`/treinar?areas=${AREAS_TREINO.join(',')}&temas=${tema.slug}`)}>
                      <span className="ip-tema__nome">{tema.nome}</span>
                      <span className="ip-tema__pct numerico">{feitas > 0 ? `${Math.max(1, porcento)}%` : 'Novo'}</span>
                      <span className="ip-tema__trilho" aria-hidden="true"><span style={{ width: `${Math.max(feitas > 0 ? 2 : 0, porcento)}%` }} /></span>
                    </a>
                  </li>
                )
              })}
          </ul>
        </section>

        <div className="ip-dupla">
          <CaixasAssinante />
          <VitrineAssinante />
        </div>
        <div className="ip-dupla ip-dupla--rodape">
          <BlocoRanking conta={Boolean(conta)} conquistadas={conquistadas} totalConquistas={totalConquistas} sequencia={streak.atual} />
          <CartaoPlanos />
        </div>
        <SecaoIndique />
      </>}
    </div>
  )
}

/** Ranking e conquistas, compacto, com a coroa em pixel art. */
function BlocoRanking({ conta, conquistadas, totalConquistas, sequencia }: { conta: boolean; conquistadas: number; totalConquistas: number; sequencia: number }) {
  return (
    <section className="inicio-ranking ip-ranking" aria-label="Ranking e conquistas">
      <img className="inicio-ranking__coroa" src={recurso('emblemas/podio-1.png')} alt="" width={64} height={64} loading="lazy" decoding="async" />
      <div className="inicio-ranking__texto">
        <p className="inicio-ranking__selo">Ranking e conquistas</p>
        <h2>{conta ? <>Suba no <em>ranking</em> e destrave emblemas</> : <>Entre no <em>ranking</em> de quem mais estuda</>}</h2>
        <p>{conta
          ? <>Você tem <b>{conquistadas}</b> de {totalConquistas} conquistas{sequencia >= 3 ? <> · <b>{sequencia} dias</b> seguidos</> : ''}. Exiba três no seu nome.</>
          : 'Cada questão respondida conta pontos, destrava emblemas e acende a sua fogueira de dias seguidos.'}</p>
        {!conta && <PodioPrevia />}
      </div>
      <div className="inicio-ranking__acoes">
        <a className="botao botao--ouro" href={href('/ranking')}>Ver ranking</a>
        <a className="botao inicio-ranking__secundario" href={href('/conquistas')}>{conta ? 'Minhas conquistas' : 'Conquistas'}</a>
      </div>
    </section>
  )
}

/**
 * Flashcards na vitrine do visitante (beta público, 13/10/2026). Fala só em
 * flashcards (pedido do Tales, 13/10/2026): o nome Cripta só aparece dentro do
 * jogo; fora dele é "Flashcards" ou "Torneio de Flashcards". Para quem tem conta,
 * os mesmos destinos viram atalhos logo abaixo do painel.
 */
function QuadroFlashcards({ classe }: { classe: string }) {
  const id = classe.split(' ')[0] + '-titulo'
  return (
    <section className={`inicio-flash ${classe}`} aria-labelledby={id}>
      <picture className="inicio-flash__arte">
        <source media="(max-width: 52rem)" srcSet={recurso('flashcards/promo/capa-retrato.png')} />
        <img src={recurso('flashcards/promo/capa-larga.png')} alt="" width={520} height={330} loading="lazy" decoding="async" />
      </picture>
      <span className="inicio-flash__texto">
        <span className="inicio-flash__selo">Flashcards · Beta público</span>
        {/* o quadro todo leva à central; os botões vão direto (pedido do Tales, 15/10/2026: nem todo mundo quer o jogo) */}
        <a className="inicio-flash__capa" href={href('/flashcards')}><strong id={id}>Conhecimento que evolui com você.</strong></a>
        <span className="inicio-flash__desc">Flashcards de Ortopedia, revisão espaçada e uma jornada para testar o que você sabe.</span>
        <span className="inicio-flash__botoes">
          <a className="botao botao--ouro inicio-flash__botao" href={href('/flashcards/biblioteca')}><Icone nome="livro" tamanho={16} /> Estudar flashcards</a>
          <a className="botao inicio-flash__botao inicio-flash__botao--jogo" href={href('/flashcards/cripta')}><Icone nome="raio" tamanho={16} /> Jogar o Torneio</a>
        </span>
        <a className="inicio-flash__crono" href={href('/flashcards/biblioteca?categoria=plano')}><Icone nome="rota" tamanho={15} /> Seguir o cronograma de hoje</a>
      </span>
    </section>
  )
}

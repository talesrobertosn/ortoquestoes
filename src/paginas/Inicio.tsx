import { usarContextoLocal } from '../estado/usarContextoLocal'
import { useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { contar, montarSessao } from '../dados/acervo'
import { FILTROS_VAZIOS } from '../dados/tipos'
import { href, navegar } from '../util/rotas'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { ModalEntrar } from '../componentes/ModalEntrar'
import { CartaoStreak } from '../componentes/CartaoStreak'
import { VitrineAssinante } from '../componentes/VitrineAssinante'
import { CaixasAssinante } from '../componentes/CaixasAssinante'
import { ConviteLimiteDoDia } from '../componentes/LimiteRespostas'
import { CartaoCompartilhar } from '../componentes/CartaoCompartilhar'
import { CartaoPlanos } from '../componentes/CartaoPlanos'
import { type ResumoHistorico, usarSessao } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { usarConta } from '../conta/ContextoConta'
import { planoRevisao } from '../estado/planoRevisao'
import { usarRitmoRevisao } from '../estado/preferencias'
import { calcularStreak } from '../estado/streak'
import { FUSO_DIA, chaveDia } from '../estado/limiteDiario'
import '../estilos/paginas/Inicio.css'

// A maior parte do acervo ainda não distingue TEOT de TARO (prova genérica
// "TEOT/TARO"); enquanto isso não é resolvido, as três provas são somadas
// numa única contagem em vez de aparecerem como linhas separadas.
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

function periodoDoDia(): string {
  const hora = new Date().getHours()
  return hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite'
}

const VARIACOES_CABECALHO: { comNome: (nome: string) => string; semNome: string; incentivo: string }[] = [
  { comNome: (nome) => `${periodoDoDia()}, ${nome}.`, semNome: `${periodoDoDia()}. Bora estudar?`, incentivo: 'Dez questões hoje valem mais do que cinquenta no domingo.' },
  { comNome: (nome) => `Redução anatômica, fixação estável. Bora, ${nome}.`, semNome: 'Redução anatômica, fixação estável.', incentivo: 'Conceito bem fixado não solta na hora da prova.' },
  { comNome: (nome) => `Um conceito de cada vez, ${nome}.`, semNome: 'Um conceito de cada vez.', incentivo: 'Consolidação leva tempo. Constância acelera.' },
  { comNome: (nome) => `Carga progressiva, ${nome}.`, semNome: 'Carga progressiva, todos os dias.', incentivo: 'Como na reabilitação: um pouco por dia, sem pular etapas.' },
  { comNome: (nome) => `Classificações na ponta da língua, ${nome}?`, semNome: 'Classificações na ponta da língua?', incentivo: 'Garden, Schatzker, Neer: a repetição transforma em reflexo.' },
  { comNome: (nome) => `Que bom ver você de novo, ${nome}.`, semNome: 'Que bom ver você por aqui.', incentivo: 'A sequência de hoje começa na primeira questão.' },
  { comNome: (nome) => `Menos dúvida, mais critério, ${nome}.`, semNome: 'Menos dúvida, mais critério.', incentivo: 'Entender por que a alternativa está errada também é acertar.' },
  { comNome: (nome) => `Hora de afiar o raciocínio, ${nome}.`, semNome: 'Hora de afiar o raciocínio.', incentivo: 'Leia o enunciado com calma. O detalhe que decide costuma estar lá.' },
  { comNome: (nome) => `A prova fica mais perto a cada questão, ${nome}.`, semNome: 'A prova fica mais perto a cada questão.', incentivo: 'E você chega mais preparado a cada sessão.' },
  { comNome: (nome) => `Mais um dia, mais um degrau, ${nome}.`, semNome: 'Mais um dia, mais um degrau.', incentivo: 'Você responde; a revisão espaçada cuida do resto.' },
  { comNome: (nome) => `Todo osso consolida com carga, ${nome}.`, semNome: 'Todo osso consolida com carga.', incentivo: 'O conhecimento também. Estímulo certo, na frequência certa.' },
  { comNome: (nome) => `Seu estudo, no seu ritmo, ${nome}.`, semNome: 'Seu estudo, no seu ritmo.', incentivo: 'Uma sessão curta hoje mantém a engrenagem girando.' },
  { comNome: (nome) => `Raciocínio clínico se treina, ${nome}.`, semNome: 'Raciocínio clínico se treina.', incentivo: 'Cada questão comentada é uma aula curta e objetiva.' },
  { comNome: (nome) => `Bora somar repertório, ${nome}.`, semNome: 'Bora somar repertório.', incentivo: 'Quem revisa com método erra menos pelo mesmo caminho.' },
  { comNome: (nome) => `Do enunciado à conduta, ${nome}.`, semNome: 'Do enunciado à conduta.', incentivo: 'Diagnóstico, classificação e tratamento: é assim que a prova pensa.' },
  { comNome: (nome) => `Constância vence intensidade, ${nome}.`, semNome: 'Constância vence intensidade.', incentivo: 'Pouco todo dia rende mais do que muito de vez em quando.' },
]

export function Inicio() {
  const { indice, carregando } = usarIndice()
  const { iniciar } = usarSessao()
  const { sessao: conta } = usarConta()
  const [sessao] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)

  const { contexto } = usarContextoLocal('')
  const contagens = useMemo(
    () => (indice ? contar(indice, FILTROS_VAZIOS, contexto) : null),
    [indice, contexto],
  )
  const [historico] = usarArmazenado<ResumoHistorico[]>('historico', [])
  const [textoDoDia] = useState(() => VARIACOES_INICIO[Math.floor(Math.random() * VARIACOES_INICIO.length)])
  const [cabecalhoDoDia] = useState(() => VARIACOES_CABECALHO[Math.floor(Math.random() * VARIACOES_CABECALHO.length)])
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
      <section className="inicio-heroi">
        <div className="inicio-heroi__texto">
          {indice && indice.total > 0 && (
            <p className="inicio-heroi__selo">
              <span className="ponto-vivo" aria-hidden="true" />
              <strong>Provas oficiais comentadas</strong><span className="inicio-heroi__provas"> · TEOT · TARO · ENARE R4 · TECOC</span>
            </p>
          )}
          <h1>{titulo}</h1>
          <p className="inicio-heroi__sub">{cabecalhoDoDia.incentivo}</p>
          {indice && contagens && indice.total > 0 && (
            <div className="inicio-heroi__acoes">
              {sessaoEmAndamento ? (
                <a className="botao botao--claro botao--grande" href={href('/sessao')}>
                  <Icone nome="raio" tamanho={18} /> Continuar sessão · {Object.keys(sessao!.respostas).length}/{sessao!.ids.length}
                </a>
              ) : (
                <button type="button" className="botao botao--claro botao--grande" onClick={() => treinoRapido(10)} disabled={contagens.total < 10}>
                  <Icone nome="raio" tamanho={18} /> {textoDoDia.acao}
                </button>
              )}
              <a className="botao botao--vidro botao--grande" href={href('/treinar')}>Montar minha sessão</a>
            </div>
          )}
        </div>
        {conta ? (
          <div className="inicio-heroi__painel" aria-label="Seu dia">
            <a className="inicio-kpi" href={href('/revisao')}>
              <span className="inicio-kpi__icone"><Icone nome="calendario" tamanho={18} /></span>
              <span className="inicio-kpi__rotulo">Revisar hoje</span>
              <strong className="numerico">{revisarHoje}</strong>
            </a>
            <div className="inicio-kpi">
              <span className="inicio-kpi__icone"><Icone nome="raio" tamanho={18} /></span>
              <span className="inicio-kpi__rotulo">Sequência</span>
              <strong className="numerico">{streak.atual} {streak.atual === 1 ? 'dia' : 'dias'}</strong>
            </div>
            <a className="inicio-kpi" href={href('/dados')}>
              <span className="inicio-kpi__icone"><Icone nome="alvo" tamanho={18} /></span>
              <span className="inicio-kpi__rotulo">Acerto geral</span>
              <strong className="numerico">{desempenho.acerto === null ? '0%' : `${desempenho.acerto}%`}</strong>
            </a>
          </div>
        ) : (
          <div className="inicio-heroi__painel inicio-heroi__painel--visitante">
            <p className="inicio-heroi__convite"><strong>Crie sua conta grátis</strong> e o site passa a guardar seu progresso, montar sua revisão e colocar você no ranking.</p>
            <a className="botao botao--claro" href={href('/conta?modo=criar')}>Criar conta grátis</a>
            <button type="button" className="botao botao--vidro" onClick={() => definirModalEntrarAberto(true)}>Já tenho conta · Entrar</button>
          </div>
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
          <nav className="inicio-atalhos" aria-label="Atalhos">
            <a className="inicio-atalho" href={href('/treinar')}>
              <span className="inicio-atalho__icone"><Icone nome="livro" tamanho={22} /></span>
              <span className="inicio-atalho__titulo">Treinar</span>
              <span className="inicio-atalho__nota">Por tema, prova ou dificuldade</span>
            </a>
            <a className="inicio-atalho" href={href('/revisao')}>
              <span className="inicio-atalho__icone"><Icone nome="calendario" tamanho={22} /></span>
              <span className="inicio-atalho__titulo">Revisão {revisarHoje > 0 && <span className="acao-rapida__contador">{revisarHoje}</span>}</span>
              <span className="inicio-atalho__nota">O que vence hoje e nos próximos dias</span>
            </a>
            <a className="inicio-atalho" href={href('/dados')}>
              <span className="inicio-atalho__icone"><Icone nome="grafico" tamanho={22} /></span>
              <span className="inicio-atalho__titulo">Desempenho</span>
              <span className="inicio-atalho__nota">Sua evolução por tema e por prova</span>
            </a>
            <a className="inicio-atalho inicio-atalho--ouro" href={href('/ranking')}>
              <span className="inicio-atalho__icone"><Icone nome="trofeu" tamanho={22} /></span>
              <span className="inicio-atalho__titulo">Ranking</span>
              <span className="inicio-atalho__nota">{conta ? 'Sua posição e seus emblemas' : 'Quem mais estuda por aqui'}</span>
            </a>
          </nav>

          <div className="inicio-grade">
            <section className="inicio-hoje" aria-labelledby="inicio-hoje-titulo">
              <p className="meta">SUA ROTINA DE ESTUDO</p>
              <h2 id="inicio-hoje-titulo">Seu estudo de hoje</h2>
              {Object.keys(contexto.respondidas).length > 0 || conta ? <>
              <p className="inicio-hoje__intro">{textoDoDia.explicacao}</p>
              {(
                <div className="inicio-hoje__lista">
                  <a className="inicio-hoje__item inicio-hoje__item--destaque" href={href('/treinar?situacao=revisarHoje&limite=20')}>
                    <span className="inicio-hoje__icone"><Icone nome="calendario" tamanho={18} /></span>
                    <span className="inicio-hoje__rotulo"><strong>Revisar hoje</strong><small>{textoDoDia.revisar}</small></span>
                    <b className="numerico">{(contagens.porSituacao.revisarHoje ?? 0).toLocaleString('pt-BR')}</b>
                  </a>
                  <a className="inicio-hoje__item" href={href('/treinar?situacao=naoRespondidas&limite=10')}>
                    <span className="inicio-hoje__icone"><Icone nome="livro" tamanho={18} /></span>
                    <span className="inicio-hoje__rotulo"><strong>Questões novas</strong><small>{textoDoDia.novas}</small></span>
                    <b className="numerico">{(contagens.porSituacao.naoRespondidas ?? 0).toLocaleString('pt-BR')}</b>
                  </a>
                  <a className="inicio-hoje__item" href={href('/treinar?situacao=dominadas')}>
                    <span className="inicio-hoje__icone"><Icone nome="medalha" tamanho={18} /></span>
                    <span className="inicio-hoje__rotulo"><strong>Dominadas</strong><small>Ciclo de revisão completo</small></span>
                    <b className="numerico">{(contagens.porSituacao.dominadas ?? 0).toLocaleString('pt-BR')}</b>
                  </a>
                </div>
              )}</> : (
                <p className="texto-2">Escolha uma sessão curta. Depois da primeira resposta, esta área passa a mostrar suas revisões, evolução e próximos passos.</p>
              )}
            </section>

            {temaFragil && (() => {
              const acerto = Math.round((temaFragil[1].acertos / temaFragil[1].tentativas) * 100)
              return <section className="inicio-foco" aria-labelledby="inicio-foco-titulo">
                <p className="meta">SUA MAIOR PORCENTAGEM DE ERRO</p>
                <h2 id="inicio-foco-titulo">{temaFragil[0]}</h2>
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
                <a className="botao botao--principal" href={href(`/treinar?temas=${temaFragil[1].slug}&limite=10`)}>Treinar este tema <Icone nome="direita" tamanho={16} /></a>
              </section>
            })()}
          </div>

          <CaixasAssinante />
          <ConviteLimiteDoDia />

          <VitrineAssinante />

          <div className="inicio-grade">
            <CartaoStreak />
            {Object.keys(contexto.respondidas).length > 0 && <section className="inicio-semana" aria-labelledby="inicio-semana-titulo">
              <p className="meta">SUA SEMANA</p>
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
                      <a className="inicio-tema" href={href(`/treinar?temas=${tema.slug}`)}>
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

          {historico.length > 0 && (
            <section className="inicio-bloco">
              <h2>Suas últimas sessões</h2>
              <ol className="inicio-sessoes">
                {historico.slice(0, 5).map((h) => {
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

          <div className="inicio-grade inicio-grade--rodape">
            <CartaoCompartilhar />
            <CartaoPlanos />
          </div>

        </>
      )}
    </div>
  )
}

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
import { bibliotecaVisivel } from '../biblioteca/recomendar'
import { QuadroAtlas } from '../componentes/QuadroAtlas'
import { EstanteResumos } from '../componentes/inicio/EstanteResumos'
import { ModalEntrar } from '../componentes/ModalEntrar'
import { VitrineAssinante } from '../componentes/VitrineAssinante'
import { ChamadaSimuladoNacional } from '../componentes/ChamadaSimuladoNacional'
import { CaixasAssinante, CartaoCronograma, usarCronogramaHoje } from '../componentes/CaixasAssinante'
import { NovidadeSimulados } from '../componentes/NovidadeSimulados'
import { ConviteLimiteDoDia } from '../componentes/LimiteRespostas'
import { SecaoIndique } from '../componentes/SecaoIndique'
import { CartaoPlanos, FaixaPlanos } from '../componentes/CartaoPlanos'
import { AmostraRespondivel } from '../componentes/inicio/AmostraRespondivel'
import type { DiaSequencia } from '../componentes/inicio/PainelSequencia'
import { TopoDia, TopoVisitante } from '../componentes/inicio/cena/TopoDia'
import type { Atalho } from '../componentes/inicio/cena/TopoDia'
import { MapaCorpo } from '../componentes/inicio/cena/MapaCorpo'
import { Mascote } from '../componentes/mascote/Mascote'
import '../estilos/paginas/InicioHd.css'
import { CaminhoConvite, CaminhoProva } from '../componentes/inicio/CaminhoProva'
import { usarConquistas } from '../estado/usarConquistas'
import { emblemasQuaseLa } from '../estado/conquistas'
import { FLASHCARDS_NA_CAPA, fraseGratis, recurso } from '../config'
import { type ResumoHistorico, usarSessao } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { usarConta } from '../conta/ContextoConta'
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

/**
 * Primeiro nome, como os e-mails (primeiroNome em supabase/functions/_shared/cartas.ts):
 * vazio quando o cadastro não traz um nome que dê para chamar a pessoa.
 */
function primeiroNome(nome?: string | null): string {
  const primeiro = (nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}

/** Tato dos e-mails (docs/emails/TOM.md): abaixo de 10 questões não se mostra o número. */
const MINIMO_PARA_NUMERO = 10

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
  { nome: 'Título de cirurgia da mão (SBCM)', cor: '#f0c46a' },
  { nome: 'SIMÃO (simulado do título)', cor: '#f0c46a' },
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

  // A semana corrente, de segunda a domingo, para a sequência do topo: feito, hoje e o que ainda vem.
  const diasSequencia = useMemo<DiaSequencia[]>(() => {
    const porChave = new Map(semana.dias.map((d) => [d.chave, d.total]))
    const curto = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: FUSO_DIA }).format(new Date())
    const desdeSegunda = (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(curto) + 7) % 7
    return Array.from({ length: 7 }, (_, i) => {
      const data = new Date(Date.now() + (i - desdeSegunda) * 86400000)
      const chave = chaveDia(data)
      const total = porChave.get(chave) ?? 0
      const estado: DiaSequencia['estado'] = i === desdeSegunda ? (total >= META_STREAK_DIARIA ? 'hoje-feito' : 'hoje')
        : i > desdeSegunda ? 'futuro' : total >= META_STREAK_DIARIA ? 'feito' : total > 0 ? 'parcial' : 'perdido'
      return {
        chave, total, estado,
        inicial: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i],
        nome: data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: FUSO_DIA }),
        numero: Number(data.toLocaleDateString('pt-BR', { day: 'numeric', timeZone: FUSO_DIA })),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semana, hojeChave])

  /** Treino rápido: uma sessão embaralhada de todo o acervo, num clique. */
  async function treinoRapido(quantidade: number) {
    if (!indice) return
    const filtros = { ...FILTROS_VAZIOS, embaralhar: true, limite: quantidade }
    if (!(await iniciarComAviso(filtros, montarSessao(indice, filtros, Date.now())))) return
    navegar('/sessao')
  }

  const sessaoEmAndamento =
    sessao && !sessao.concluidaEm && Object.keys(sessao.respostas).length < sessao.ids.length

  // Primeiro nome, sem título nem gênero presumido (adendo do dono, 18/10/2026).
  const nome = primeiroNome(String(conta?.user.user_metadata?.nome ?? ''))
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
  const titulo = nome ? cabecalhoDoDia.comNome(nome) : cabecalhoDoDia.semNome

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
  // Refeita do zero em 30/10/2026: a vitrine no mesmo mundo do painel (cenário com luz, pergaminho com a questão,
  // estandartes das provas, molduras e o portão final). Os textos, convites e links são os de sempre.
  if (pedeConta) {
    return (
      <div className="ip ip--vitrine hd">
        <TopoVisitante
          titulo={cabecalhoDoDia.semNome}
          proposta={<>As provas de ortopedia, <em>comentadas como uma aula</em>.</>}
          lide="Treine pelas questões oficiais do TEOT, do TARO e das provas de subespecialidade. Cada alternativa explicada, a revisão no dia certo e um cronograma até a prova."
          cta={<a className="hd-cristal" href={href('/conta?modo=criar&voltar=%2Ftreinar')}><Icone nome="raio" tamanho={18} /> Criar conta grátis e treinar</a>}
          entrar={<button type="button" className="hd-botao" onClick={() => definirModalEntrarAberto(true)}>Já tenho conta · Entrar</button>}
          nota={<><Icone nome="certo" tamanho={14} /> Conta grátis, {fraseGratis('curto')}. No celular ou no computador, continua de onde parou.</>}
          provas={PROVAS_DO_ACERVO}
          amostra={<AmostraRespondivel />}
        />
        <ModalEntrar aberto={modalEntrarAberto} aoFechar={() => definirModalEntrarAberto(false)} />
        {carregando && <Carregando linhas={3} rotulo="Carregando o acervo" />}
        {vazio}
        <div className="hd-avisos">
          <ConviteLimiteDoDia />
          <FaixaPlanos />
          <ChamadaSimuladoNacional />
        </div>

        {/* O que o site faz, em quatro pedras de runa com o mesmo texto de antes. */}
        <section className="hd-pilares" aria-labelledby="ip-pilares-titulo">
          <header className="hd-faixa"><h2 id="ip-pilares-titulo">O que o Orto Questões faz por você</h2></header>
          <div className="hd-pilares__grade">
            {[
              { arte: 'simulado' as const, titulo: 'Questões oficiais comentadas', texto: 'Cada alternativa explicada, a certa e as erradas, com o conceito por trás.' },
              { arte: 'revisao' as const, titulo: 'Revisão no dia certo', texto: 'Errou, a questão volta logo. Acertou com certeza, só daqui a semanas.' },
              { arte: 'treinar' as const, titulo: 'Cronograma até a prova', texto: 'A lista de cada dia, passando primeiro pelo que mais cai.' },
              { arte: 'desempenho' as const, titulo: 'Seu desempenho por tema', texto: 'Onde você acerta, onde erra e o que treinar a seguir.' },
            ].map((p) => (
              <article key={p.titulo} className="hd-pilar">
                <span className="hd-losango__pedra" aria-hidden="true"><span className="hd-losango__icone"><IconePixel nome={p.arte} tamanho={44} /></span></span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="hd-galeria">
          <div className="hd-moldura"><QuadroAtlas /></div>
          {bibliotecaVisivel() && <div className="hd-moldura"><EstanteResumos /></div>}
        </div>

        {temAcervo && <>
          <div className="hd-moldura"><CaixasAssinante /></div>
          <div className="hd-moldura"><CartaoCronograma cronograma={cronograma} /></div>
          {FLASHCARDS_NA_CAPA && <div className="hd-moldura"><QuadroFlashcards classe="inicio-flash--faixa" /></div>}
          <div className="hd-moldura"><AteAProva total={indice!.total} conta={false} /></div>
          <div className="hd-dupla hd-dupla--rodape">
            <BlocoRanking conta={false} conquistadas={conquistadas} totalConquistas={totalConquistas} sequencia={streak.atual} />
            <div className="hd-moldura"><CartaoPlanos /></div>
          </div>
          {/* O portão final: o mesmo convite de antes, com o mensageiro em pixel e o botão de cristal. */}
          <section className="hd-portao" aria-labelledby="ip-chamada-titulo">
            <img src={recurso('ranking/mensageiro.png')} width={64} height={80} alt="" loading="lazy" decoding="async" />
            <div>
              <h2 id="ip-chamada-titulo">A primeira sessão leva um minuto.</h2>
              <p>Crie a conta, escolha um tema e responda. O resto o site organiza para você.</p>
            </div>
            <a className="hd-cristal hd-cristal--ouro" href={href('/conta?modo=criar&voltar=%2Ftreinar')}>Criar conta grátis</a>
          </section>
        </>}

        <section className="hd-sobre" aria-labelledby="inicio-apresentacao">
          <h2 id="inicio-apresentacao">Orto Questões: banco de questões comentadas</h2>
          <p>O Orto Questões reúne questões para TEOT, TARO, cirurgia da mão, R4 ENARE, quadril e coluna. Para o título de especialista em cirurgia da mão, da SBCM, há OrtoQuestões Simulados no padrão da prova de título e do SIMÃO, o Simulado do Exame para Obtenção do Título de Especialista em Cirurgia da Mão. Estude por assunto, entenda as alternativas e revise seus erros.</p>
          <nav className="hd-sobre__guias" aria-label="Conheça o banco e organize sua preparação">
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
  // Refeito do zero em 30/10/2026 (pedido do Tales, Octopath Traveler II de referência): o cenário com a luz da hora do
  // dia no topo, a barra de comando com os atalhos e a próxima ação, e embaixo as mesmas seções de antes, numa
  // apresentação nova (painéis de vidro escuro, molduras e mapa dos temas). Lógica, textos e destinos são os de sempre.
  const pctAcao = acao?.progresso && acao.progresso.total ? Math.min(100, Math.round((acao.progresso.feitas / acao.progresso.total) * 100)) : null
  const atalhos: Atalho[] = [
    { destino: '/treinar', rotulo: 'Treinar', texto: 'Monte a sua sessão', icone: <IconePixel nome="simulado" tamanho={44} /> },
    { destino: '/revisao', rotulo: 'Revisão', texto: revisarHoje ? `${revisarHoje.toLocaleString('pt-BR')} para hoje` : 'Em dia por hoje', icone: <IconePixel nome="revisao" tamanho={44} />, contador: revisarHoje },
    ...(FLASHCARDS_NA_CAPA ? [
      { destino: '/flashcards/biblioteca', rotulo: 'Estudar flashcards', texto: 'Revisão espaçada', icone: <span className="ip-px ip-px--cartas" aria-hidden="true"><i /><i /><i /></span> },
      { destino: '/flashcards/cripta', rotulo: 'Jogar o Torneio', texto: 'Flashcards no modo jogo', icone: <IconePixel nome="ranking" tamanho={44} /> },
    ] : []),
    ...(bibliotecaVisivel() ? [{ destino: '/resumos', rotulo: 'Resumos', texto: 'Leia antes das questões', icone: <IconePixel nome="treinar" tamanho={44} /> }] : []),
    { destino: '/atlas', rotulo: 'Atlas 3D', texto: 'Clique no osso', icone: <img src={recurso('atlas3d/icone-mao.png')} width={48} height={48} alt="" loading="lazy" decoding="async" />, novo: true },
  ]
  const temas = temAcervo ? indice!.temas.filter((tema) => (contagens!.porTema[tema.slug] ?? 0) > 0) : []
  return (
    <div className="ip ip--painel hd">
      <TopoDia
        selo="Seu dia de estudo"
        titulo={titulo}
        lide={calculo && !calculo.provaPassou ? <>Faltam <strong>{calculo.diasAteProva} dias</strong> para a prova. {cabecalhoDoDia.incentivo}</> : cabecalhoDoDia.incentivo}
        streak={streak} dias={diasSequencia} quaseLa={quaseLa} conquistadas={conquistadas} totalConquistas={totalConquistas}
        atalhos={atalhos}
        acao={acao ? <>
          <p className="hd-acao__selo">{acao.selo}</p>
          <h2 className="hd-acao__titulo">{acao.titulo}</h2>
          <p className="hd-acao__detalhe">{acao.detalhe}</p>
          {acao.progresso && (
            <div className="hd-acao__progresso">
              <span className="hd-barra hd-barra--ouro" role="img" aria-label={`${acao.progresso.feitas} de ${acao.progresso.total}`}><span style={{ width: `${pctAcao ?? 0}%` }} /></span>
              <span className="numerico"><strong>{acao.progresso.feitas}</strong> de {acao.progresso.total}</span>
            </div>
          )}
        </> : <p className="hd-acao__detalhe" aria-busy="true">Preparando o seu dia…</p>}
        botao={acao ? (acao.destino
          ? <a className="hd-cristal" href={href(acao.destino)}><Icone nome={acao.icone} tamanho={20} /> {acao.botao}</a>
          : <button type="button" className="hd-cristal" onClick={acao.aoClicar} disabled={acao.desabilitada}><Icone nome={acao.icone} tamanho={20} /> {acao.botao}</button>) : null}
        depois={acao && (metaHoje || sessaoEmAndamento) && revisarHoje > 0 ? (
          <a className="hd-depois" href={href('/revisao')}><Icone nome="calendario" tamanho={14} /> Depois: {revisarHoje} {revisarHoje === 1 ? 'questão' : 'questões'} para rever hoje <Icone nome="direita" tamanho={13} /></a>
        ) : undefined}
      />

      {(cronogramaNoPainel && calculo && cronograma.plano) || (!cronograma.carregando && !calculo) ? (
        <div className="hd-caminho">
          {cronogramaNoPainel && calculo && cronograma.plano && <CaminhoProva calculo={calculo} plano={cronograma.plano} />}
          {!cronograma.carregando && !calculo && <CaminhoConvite premium={cronograma.premium} />}
        </div>
      ) : null}

      <ModalEntrar aberto={modalEntrarAberto} aoFechar={() => definirModalEntrarAberto(false)} />
      <div className="hd-avisos">
        <ConviteLimiteDoDia />
        <FaixaPlanos />
        <ChamadaSimuladoNacional />
      </div>
      {carregando && <Carregando linhas={3} rotulo="Carregando o acervo" />}
      {vazio}

      {temAcervo && <>
        {/* O cronograma vale muito: quem ainda não tem um vê o convite logo depois do topo. */}
        {!cronograma.premium && !cronograma.carregando && <div className="hd-moldura"><CartaoCronograma cronograma={cronograma} /></div>}
        {cronograma.premium && calculo && (calculo.naRetaFinal || calculo.provaPassou) && <div className="hd-moldura"><CartaoCronograma cronograma={cronograma} /></div>}

        {/* O diário aberto (como os diários de jogo): à esquerda o estudo de hoje e onde rende mais, à direita a semana.
            Os marcadores na borda levam às outras partes da página. */}
        <section className="hd-diario" aria-label="Seu estudo, onde render mais e a sua semana">
          <nav className="hd-diario__marcadores" aria-label="Ir para">
            <a href="#hd-temas" style={{ '--cor': '#2f8a7e' } as CSSProperties}>Temas</a>
            <a href="#hd-galeria" style={{ '--cor': '#2f6aa8' } as CSSProperties}>Atlas e Resumos</a>
            <a href="#hd-assinante" style={{ '--cor': '#7a4a8c' } as CSSProperties}>O que mais cai</a>
            <a href="#hd-trofeus" style={{ '--cor': '#b8452f' } as CSSProperties}>Ranking</a>
          </nav>
          <div className="hd-diario__folhas">
          <div className="hd-diario__pagina">
          <section className="hd-janela" aria-labelledby="ip-hoje-titulo">
            <h2 id="ip-hoje-titulo" className="hd-janela__titulo">Seu estudo de hoje</h2>
            <p className="hd-janela__intro">{textoDoDia.explicacao}</p>
            <div className="hd-missoes">
              <a className="hd-missao hd-missao--destaque" href={href(`/treinar?areas=${AREAS_TREINO.join(',')}&situacao=revisarHoje&limite=20`)}>
                <IconePixel nome="revisao" tamanho={34} />
                <span><strong>Revisar hoje</strong><small>{textoDoDia.revisar}</small></span>
                <b className="numerico">{revisarHoje.toLocaleString('pt-BR')}</b>
              </a>
              <a className="hd-missao" href={href(`/treinar?areas=${AREAS_TREINO.join(',')}&situacao=naoRespondidas&limite=10`)}>
                <IconePixel nome="simulado" tamanho={34} />
                <span><strong>Questões novas</strong><small>{textoDoDia.novas}</small></span>
                <b className="hd-missao__seta"><Icone nome="direita" tamanho={16} /></b>
              </a>
              <a className="hd-missao" href={href(`/treinar?areas=${AREAS_TREINO.join(',')}&situacao=dominadas`)}>
                <IconePixel nome="ranking" tamanho={34} />
                <span><strong>Dominadas</strong><small>Ciclo de revisão completo</small></span>
                {(contagens!.porSituacao.dominadas ?? 0) >= MINIMO_PARA_NUMERO
                  ? <b className="numerico">{(contagens!.porSituacao.dominadas ?? 0).toLocaleString('pt-BR')}</b>
                  : <b className="hd-missao__seta"><Icone nome="direita" tamanho={16} /></b>}
              </a>
            </div>
          </section>

          <section className="hd-janela hd-janela--alvo" aria-labelledby="ip-foco-titulo">
            <h2 id="ip-foco-titulo" className="hd-janela__titulo">Onde uma sessão rende mais</h2>
            {temaFragil ? (() => {
              const acerto = Math.round((temaFragil[1].acertos / temaFragil[1].tentativas) * 100)
              return <>
                <p className="hd-alvo__tema">{temaFragil[0]}</p>
                {/* Tato dos e-mails: o tema mais frágil é oportunidade; acerto só a partir de 50%, contagens só a partir de 10, sem "erros". */}
                {acerto >= 50 && (
                  <div className="hd-alvo__medida">
                    <span className="hd-barra hd-barra--verde" role="img" aria-label={`${acerto}% de acerto`}><span style={{ width: `${acerto}%` }} /></span>
                    <small><b className="numerico">{acerto}%</b> de acerto, com espaço para subir</small>
                  </div>
                )}
                {(temaFragil[1].tentativas >= MINIMO_PARA_NUMERO || temaFragil[1].pendentes >= MINIMO_PARA_NUMERO) && (
                  <dl className="hd-numeros">
                    {temaFragil[1].tentativas >= MINIMO_PARA_NUMERO && <div><dt>Respostas</dt><dd className="numerico">{temaFragil[1].tentativas.toLocaleString('pt-BR')}</dd></div>}
                    {temaFragil[1].pendentes >= MINIMO_PARA_NUMERO && <div><dt>Para rever</dt><dd className="numerico">{temaFragil[1].pendentes.toLocaleString('pt-BR')}</dd></div>}
                  </dl>
                )}
                <p className="hd-janela__intro">De todos os temas que você já treinou, este é a melhor oportunidade: uma sessão curta aqui rende mais pontos na prova.</p>
                <a className="hd-botao" href={href(`/treinar?areas=${AREAS_TREINO.join(',')}&temas=${temaFragil[1].slug}&limite=10`)}>Treinar este tema <Icone nome="direita" tamanho={16} /></a>
              </>
            })() : <>
              <p className="hd-janela__intro">Responda pelo menos duas questões de um tema e este quadro mostra onde uma sessão curta rende mais.</p>
              <a className="hd-botao" href={href('/treinar')}>Montar uma sessão <Icone nome="direita" tamanho={16} /></a>
            </>}
          </section>
          </div>
          <span className="hd-diario__lombada" aria-hidden="true">{Array.from({ length: 6 }, (_, k) => <i key={k} />)}</span>
          <div className="hd-diario__pagina">
          <section className="hd-janela" aria-labelledby="ip-semana-titulo">
            <h2 id="ip-semana-titulo" className="hd-janela__titulo"><span>Sua semana</span><a href={href('/dados')}>Desempenho <Icone nome="direita" tamanho={13} /></a></h2>
            <dl className="hd-numeros">
              <div><dt>Questões</dt><dd className={`numerico${semana.total > 0 && semana.total < MINIMO_PARA_NUMERO ? ' hd-numeros__palavra' : ''}`}>{semana.total >= MINIMO_PARA_NUMERO ? semana.total.toLocaleString('pt-BR') : semana.total > 0 ? 'Primeiros passos' : '—'}</dd></div>
              <div><dt>Acerto</dt><dd className="numerico">{semana.acerto !== null && semana.acerto >= 50 && semana.total >= MINIMO_PARA_NUMERO ? `${semana.acerto}%` : '—'}</dd></div>
              <div><dt>Dias ativos</dt><dd className="numerico">{semana.diasAtivos} de 7</dd></div>
            </dl>
            {semana.total > 0 && (
              <p className="hd-janela__intro">{semana.diasAtivos >= 3
                ? <>{nome ? `${nome}, você` : 'Você'} estudou em <strong>{semana.diasAtivos} dos últimos 7 dias</strong>. É essa constância que fixa.</>
                : <>{nome ? `${nome}, os` : 'Os'} primeiros passos da semana já estão aqui. Um pouco por dia leva longe.</>}</p>
            )}
            {/* Sete colunas de luz: a altura é o número de questões do dia. */}
            <ol className="hd-colunas" aria-label="Questões respondidas por dia">
              {semana.dias.map((dia, i) => (
                <li key={dia.chave} className={dia.hoje ? 'hoje' : undefined} title={`${dia.nomeCompleto}: ${dia.total} ${dia.total === 1 ? 'questão' : 'questões'}`}>
                  <span className="hd-colunas__trilho"><span style={{ '--h': `${dia.total ? Math.max(8, (dia.total / semana.maximo) * 100) : 0}%`, '--i': i } as CSSProperties} />
                    {dia.total >= MINIMO_PARA_NUMERO && (dia.hoje || dia.total === semana.maximo) && <b className="numerico" aria-hidden="true">{dia.total}</b>}
                  </span>
                  <small aria-hidden="true">{dia.hoje ? 'Hoje' : dia.rotulo.slice(0, 3)}</small>
                  <span className="ip-invisivel">{dia.nomeCompleto}: {dia.total} {dia.total === 1 ? 'questão' : 'questões'}</span>
                </li>
              ))}
            </ol>
            {historico.length > 0 && (
              <ol className="hd-sessoes">
                {historico.slice(0, 3).map((h) => {
                  const acerto = h.respondidas > 0 ? Math.round((h.acertos / h.respondidas) * 100) : null
                  return (
                    <li key={h.id}>
                      <span className="hd-sessoes__quando">{quandoFoi(h.concluidaEm)}</span>
                      <span className="hd-sessoes__nome">{h.descricao}</span>
                      {/* Abaixo de 50% não se mostra a porcentagem (tato dos e-mails). */}
                      <span className={`hd-sessoes__acerto hd-sessoes__acerto--${acerto === null ? 'vazio' : acerto >= 70 ? 'bom' : acerto >= 50 ? 'medio' : 'vazio'}`}>{acerto === null ? '—' : acerto >= 50 ? `${acerto}%` : 'Feita'}</span>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
          <Mascote className="hd-diario__mascote" comportamento="ler" falar={false} />
          </div>
          </div>
        </section>

        {/* Treinar por tema: a prancha de anatomia, com a névoa saindo conforme o progresso (MapaCorpo.tsx). */}
        <div id="hd-temas">
          <MapaCorpo temas={temas.map((tema) => {
            const quantidade = contagens!.porTema[tema.slug] ?? 0
            return { slug: tema.slug, nome: tema.nome, quantidade, feitas: Math.min(quantidade, respondidasPorTema[tema.slug] ?? 0), destino: `/treinar?areas=${AREAS_TREINO.join(',')}&temas=${tema.slug}` }
          })} />
        </div>

        {/* Atlas 3D e Resumos lado a lado, cada um na sua moldura. */}
        <div className="hd-galeria" id="hd-galeria">
          <div className="hd-moldura"><QuadroAtlas /></div>
          {bibliotecaVisivel() && <div className="hd-moldura"><EstanteResumos /></div>}
        </div>

        <div className="hd-dupla" id="hd-assinante">
          <div className="hd-moldura"><CaixasAssinante /></div>
          <div className="hd-moldura"><VitrineAssinante /></div>
        </div>

        {/* Depois do estudo do dia, não antes: a novidade não pode empurrar a ação principal para baixo. */}
        {cronogramaNoPainel && <div className="hd-moldura"><NovidadeSimulados plano={cronograma.plano} aoMudarPlano={cronograma.definirPlano} /></div>}
        {!calculo && !cronograma.carregando && respondidasTotal < 30 && <div className="hd-moldura"><AteAProva total={indice!.total} conta={Boolean(conta)} /></div>}

        <div className="hd-dupla hd-dupla--rodape" id="hd-trofeus">
          <BlocoRanking conta={Boolean(conta)} conquistadas={conquistadas} totalConquistas={totalConquistas} sequencia={streak.atual} />
          <div className="hd-moldura"><CartaoPlanos /></div>
        </div>
        <div className="hd-moldura"><SecaoIndique /></div>
      </>}
    </div>
  )
}

/** Ranking e conquistas: o pódio iluminado sobre um estandarte escuro (30/10/2026). */
function BlocoRanking({ conta, conquistadas, totalConquistas, sequencia }: { conta: boolean; conquistadas: number; totalConquistas: number; sequencia: number }) {
  return (
    <section className="hd-estandarte" aria-label="Ranking e conquistas">
      <span className="hd-estandarte__luz" aria-hidden="true" />
      <img className="hd-estandarte__trofeu" src={recurso('emblemas/podio-1.png')} alt="" width={84} height={84} loading="lazy" decoding="async" />
      <p className="hd-selo">Ranking e conquistas</p>
      <h2>{conta ? <>Suba no <em>ranking</em> e destrave emblemas</> : <>Entre no <em>ranking</em> de quem mais estuda</>}</h2>
      <p>{conta
        ? <>Você tem <b>{conquistadas}</b> de {totalConquistas} conquistas{sequencia >= 3 ? <> · <b>{sequencia} dias</b> seguidos</> : ''}. Exiba três no seu nome.</>
        : 'Cada questão respondida conta pontos, destrava emblemas e acende a sua fogueira de dias seguidos.'}</p>
      {!conta && <PodioPrevia />}
      <div className="hd-estandarte__acoes">
        <a className="hd-cristal hd-cristal--ouro" href={href('/ranking')}>Ver ranking</a>
        <a className="hd-botao" href={href('/conquistas')}>{conta ? 'Minhas conquistas' : 'Conquistas'}</a>
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
        <span className="inicio-flash__selo">Flashcards</span>
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

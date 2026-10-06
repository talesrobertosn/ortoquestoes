import { useEffect, useMemo, useState } from 'react'
import { chamarRpc, codigoErro } from '../servicos/supabase'
import { avisoSimuladosVisto, marcarAvisoSimulados, obterPlano, salvarPlano } from '../conta/cronograma'
import { usarPremium } from '../conta/premium'
import { usarIndice } from '../dados/usarIndice'
import { FILTROS_VAZIOS, type Indice } from '../dados/tipos'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { usarSessao } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { calcularPlano, dataLocal, idsDoDia, incluiSimulados, respondidasNoAcervo, ROTULO_INTENSIDADE, simularMeta, type CalculoPlano, type Intensidade, type PlanoSalvo } from '../dados/planoEstudo'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { Degustacao, SeloAssinante } from '../componentes/Premium'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/PlanoEstudo.css'

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const ROTULO_COBRANCA: Record<number, string> = { 4: 'prioridade máxima', 3: 'prioridade alta', 2: 'prioridade média', 1: 'prioridade baixa', 0: 'fora do ranking' }
const PROVAS = ['TEOT', 'TARO', 'ENARE R4', 'Outra prova']
/** Próxima prova teórica do TEOT e do TEPOT: vem preenchida por padrão. */
const DATA_TEOT = '2027-01-10'
/** Semanas que o não assinante vê na prévia do próprio cronograma. */
const SEMANAS_PREVIA = 2
const curta = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const longa = (iso: string) => dataLocal(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
type Respondidas = Record<string, RegistroQuestao>

function amanhaIso() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Cronograma até a prova. O assinante salva e segue o dele; quem não assina
 * pode preencher a data e ver a prévia do próprio cronograma (hoje e as duas
 * primeiras semanas), com o resto guardado.
 */
export function PlanoEstudo() {
  const { premium, logado, carregado } = usarPremium()
  const { indice } = usarIndice()
  const [respondidas] = usarArmazenado<Respondidas>('respondidas', {})
  const { sessao, iniciar } = usarSessao()
  const [plano, definirPlano] = useState<PlanoSalvo | null | undefined>(undefined)
  const [editando, definirEditando] = useState(false)
  const [erro, definirErro] = useState('')
  const [avisoFechado, definirAvisoFechado] = useState(false)

  useEffect(() => {
    if (!premium) { definirPlano(null); return }
    let vivo = true
    obterPlano()
      .then((p) => { if (vivo) { definirPlano(p); definirEditando(!p) } })
      .catch(() => { if (vivo) { definirPlano(null); definirErro('Não foi possível carregar seu cronograma. Confira a conexão.') } })
    return () => { vivo = false }
  }, [premium])

  const calculo = useMemo(() => (indice && plano ? calcularPlano(indice, respondidas, plano) : null), [indice, plano, respondidas])

  if (logado && !carregado) return <Carregando linhas={4} rotulo="Carregando" />
  if (!indice) return <Carregando linhas={5} rotulo="Carregando o acervo" />
  if (!premium) return <PreviaCronograma indice={indice} respondidas={respondidas} />
  if (plano === undefined) return <Carregando linhas={5} rotulo="Montando seu cronograma" />

  function comecarHoje() {
    if (!indice || !calculo?.hoje) return
    if (sessao && !sessao.concluidaEm && !window.confirm('Substituir a sessão em andamento? Seu histórico será mantido.')) return
    const filtros = { ...FILTROS_VAZIOS, temas: [calculo.hoje.slug], situacao: 'naoRespondidas' as const, embaralhar: true, limite: calculo.hoje.n }
    iniciar(filtros, idsDoDia(indice, calculo.hoje.slug, respondidas, calculo.hoje.n, incluiSimulados(plano)), { origem: 'cronograma' })
    navegar('/sessao')
  }

  function adiantar(n: number) {
    if (!indice || !calculo) return
    const tema = proximoTema(calculo)
    if (!tema) return
    if (sessao && !sessao.concluidaEm && !window.confirm('Substituir a sessão em andamento? Seu histórico será mantido.')) return
    const filtros = { ...FILTROS_VAZIOS, temas: [tema.slug], situacao: 'naoRespondidas' as const, embaralhar: true, limite: n }
    iniciar(filtros, idsDoDia(indice, tema.slug, respondidas, n, incluiSimulados(plano)), { origem: 'cronograma' })
    navegar('/sessao')
  }

  if (editando || !plano || !calculo) {
    return <FormularioPlano indice={indice} respondidas={respondidas} atual={plano} aoCancelar={plano ? () => definirEditando(false) : undefined}
      aoSalvar={(novo) => { marcarAvisoSimulados(); definirAvisoFechado(true); definirPlano(novo); definirEditando(false) }} />
  }

  async function soOficiais() {
    if (!plano) return
    definirErro('')
    try {
      // Sem recomeçar: o plano foi montado quando os simulados ainda não entravam.
      const salvo = await salvarPlano({ p_data_prova: plano.data_prova, p_intensidade: plano.intensidade, p_folgas: plano.folgas, p_prova: plano.prova, p_base: plano.base_respondidas, p_recomecar: false }, false)
      if (salvo) definirPlano(salvo)
      marcarAvisoSimulados(); definirAvisoFechado(true)
    } catch { definirErro('Não foi possível salvar agora. Tente de novo.') }
  }

  return (
    <div className="empilha-2 pe">
      {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}
      {!avisoFechado && planoSemEscolha(plano) && !avisoSimuladosVisto() && (
        <section className="pe-novidade" aria-labelledby="pe-novidade-titulo">
          <span className="pe-novidade__selo">Novidade</span>
          <h2 id="pe-novidade-titulo">OrtoQuestões Simulados no seu cronograma</h2>
          <p>Agora temos questões feitas por <strong>engenharia reversa</strong> das provas oficiais do TEOT e do TARO: o mesmo padrão de enunciado e de cobrança, com perguntas e conteúdo tirados diretamente do livro de referência e cada alternativa comentada com a citação.</p>
          <p>Elas já foram <strong>adicionadas automaticamente</strong> ao seu cronograma. Quer manter?</p>
          <div className="linha">
            <button type="button" className="botao botao--principal" onClick={() => { marcarAvisoSimulados(); definirAvisoFechado(true) }}><Icone nome="certo" tamanho={16} /> Sim, manter no cronograma</button>
            <button type="button" className="botao botao--fantasma" onClick={soOficiais}>Prefiro só as questões oficiais</button>
          </div>
          <small>Dá para mudar quando quiser em Ajustar o cronograma. Os simulados não contam para os temas que mais caem.</small>
        </section>
      )}
      <VisaoCronograma plano={plano} calculo={calculo} aberto aoComecar={comecarHoje} aoAdiantar={adiantar} pendente={sessaoPendente(sessao)} />
      <div className="linha">
        <button type="button" className="botao" onClick={() => definirEditando(true)}><Icone nome="lapis" tamanho={16} /> Ajustar o cronograma</button>
      </div>
    </div>
  )
}

/** Planos criados antes da etapa 4 do formulário: a pessoa ainda não escolheu sobre os simulados. */
const ETAPA_SIMULADOS_EM = Date.parse('2026-10-06T21:45:00Z')
function planoSemEscolha(plano: PlanoSalvo): boolean {
  return incluiSimulados(plano) && Date.parse(plano.criado_em) < ETAPA_SIMULADOS_EM
}

/**
 * O próximo tema da fila do cronograma, para quem quer fazer mais que a meta:
 * o tema desta semana que ainda tem questões, ou o primeiro da semana seguinte.
 */
function proximoTema(calculo: CalculoPlano): { slug: string; nome: string; semana: Date; estaSemana: boolean } | null {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  for (const s of calculo.semanas) {
    if (!s.temas.length || s.fim < hoje) continue
    return { slug: s.temas[0].slug, nome: s.temas[0].nome, semana: s.inicio, estaSemana: s.atual }
  }
  return null
}

/** Sessão do cronograma que ficou pela metade (a pessoa fechou o site no meio). */
function sessaoPendente(sessao: EstadoSessao | null): { feitas: number; total: number; tema: string } | null {
  if (!sessao || sessao.concluidaEm || sessao.origem !== 'cronograma') return null
  const feitas = Object.keys(sessao.respostas).length
  if (feitas >= sessao.ids.length) return null
  return { feitas, total: sessao.ids.length, tema: sessao.filtros.temas[0] ?? '' }
}

function VisaoCronograma({ plano, calculo, aberto, aoComecar, aoAdiantar, pendente = null }: { plano: PlanoSalvo; calculo: CalculoPlano; aberto: boolean; aoComecar?: () => void; aoAdiantar?: (n: number) => void; pendente?: { feitas: number; total: number; tema: string } | null }) {
  const proximo = proximoTema(calculo)
  const [explicacaoAberta] = useState(primeiraVisita)
  const podeAdiantar = aberto && !!aoAdiantar && !!proximo && !calculo.naRetaFinal && !calculo.provaPassou && calculo.restante > 0
  const nomeTemaPendente = pendente ? calculo.temas.find((t) => t.slug === pendente.tema)?.nome ?? 'o tema do dia' : ''
  const ritmoTexto = !aberto || Math.abs(calculo.ritmo) <= 5 || calculo.esperadoAteHoje < 20
    ? { classe: 'em-dia', texto: aberto ? 'Em dia com o cronograma' : 'Começando hoje' }
    : calculo.ritmo > 0 ? { classe: 'frente', texto: `${calculo.ritmo}% à frente do cronograma` } : { classe: 'atras', texto: `${-calculo.ritmo}% atrás do cronograma` }
  const progresso = calculo.alvo ? Math.min(100, Math.round((calculo.feitas / calculo.alvo) * 100)) : 100
  const reforcados = calculo.temas.filter((t) => t.reforcado).sort((a, b) => (a.acerto ?? 0) - (b.acerto ?? 0))
  const semanas = calculo.semanas.filter((s) => s.diasEstudo > 0)
  const visiveis = aberto ? semanas : semanas.slice(0, SEMANAS_PREVIA)

  const linhaSemana = (s: CalculoPlano['semanas'][number], i: number) => (
    <li key={i} className={'pe-semana pe-semana--detalhe' + (s.atual ? ' pe-semana--atual' : '')}>
      <details open={s.atual && aberto}>
        <summary className="pe-semana__linha">
          <span className="pe-semana__data">{curta(s.inicio)} – {curta(s.fim)}{s.atual && <em>esta semana</em>}</span>
          <span className="pe-semana__temas">
            {s.temas.length ? s.temas.map((t) => <span key={t.slug} className="pe-chip">{t.nome}<b className="numerico">{t.n}</b></span>) : <span className="texto-2">Folga do cronograma: revisão e questões livres.</span>}
          </span>
          <span className="pe-semana__total numerico">{s.total}<Icone nome="baixo" tamanho={14} /></span>
          {s.temas.length > 0 && <span className="pe-semana__resumo">
            {s.temas.map((t) => <span key={t.slug}><b>{t.nome}:</b> {t.assuntos.slice(0, 3).map((a) => a.nome).join(', ')}{t.assuntos.length > 3 ? ` e mais ${t.assuntos.length - 3}` : ''}</span>)}
            <em>Abra para ver por que estes e quanto cada um cai</em>
          </span>}
        </summary>
        {s.temas.length > 0 && <div className="pe-semana__corpo">
          <p className="pe-semana__explica">{s.diasEstudo} {s.diasEstudo === 1 ? 'dia' : 'dias'} de estudo, cerca de <b>{Math.round(s.total / Math.max(1, s.diasEstudo))} questões por dia</b>.</p>
          {s.temas.map((t) => (
            <div key={t.slug} className="pe-semana__tema">
              <div className="pe-semana__tema-cabeca">
                <p className="pe-semana__tema-nome"><strong>{t.nome}</strong><span className="numerico">{t.n} questões</span></p>
                {t.posicaoArea && <span className="pe-semana__area">{t.posicaoArea}ª área em número de questões</span>}
              </div>
              <p className="pe-semana__porque">
                <span>{t.assuntos.some((a) => a.nivel >= 3)
                  ? <>Estas {t.n} questões são dos assuntos de {t.nome.toLowerCase()} com <b>mais questões nas provas oficiais</b>. O cronograma segue a contagem da área: começa pelo assunto com mais questões e desce.</>
                  : <>Os assuntos de prioridade máxima em {t.nome.toLowerCase()} já ficaram para trás: agora entram os de prioridade menor, para você cobrir a área inteira.</>}</span>
              </p>
              <ul className="pe-assuntos">
                {t.assuntos.slice(0, 10).map((a) => (
                  <li key={a.nome} className={a.nivel ? `pe-assunto pe-assunto--${a.nivel}` : 'pe-assunto'}>
                    <span className="pe-assunto__posicao numerico">{a.posicao ? `${a.posicao}º` : '·'}</span>
                    <span className="pe-assunto__nome">{a.nome}<small>{ROTULO_COBRANCA[a.nivel]}</small></span>
                    <b className="numerico">{a.n}</b>
                  </li>
                ))}
                {t.assuntos.length > 10 && <li className="pe-assunto pe-assunto--resto"><span className="pe-assunto__posicao">+</span><span className="pe-assunto__nome">e mais {t.assuntos.length - 10} assuntos</span><b className="numerico">{t.assuntos.slice(10).reduce((soma, a) => soma + a.n, 0)}</b></li>}
              </ul>
              <p className="pe-semana__legenda">O número à esquerda é o lugar do assunto no ranking de {t.nome.toLowerCase()}; o da direita, quantas questões dele entram nesta semana.</p>
              {t.depois.length > 0 && <p className="pe-semana__depois"><Icone nome="direita" tamanho={14} /> Nas próximas semanas de {t.nome.toLowerCase()}: {t.depois.join(', ')}.</p>}
            </div>
          ))}
        </div>}
      </details>
    </li>
  )

  return <>
    <section className="pe-heroi">
      <div className="pe-heroi__texto">
        <p className="pe-heroi__selo"><Icone nome="rota" tamanho={15} /> {aberto ? 'Cronograma' : 'Prévia do seu cronograma'} · {plano.prova}</p>
        <h1>{calculo.provaPassou ? 'A prova chegou. Boa sorte!' : <>Faltam <span className="numerico">{calculo.diasAteProva}</span> {calculo.diasAteProva === 1 ? 'dia' : 'dias'}</>}</h1>
        <p>Prova em {longa(plano.data_prova)}. Intensidade {ROTULO_INTENSIDADE[plano.intensidade].nome.toLowerCase()}{plano.folgas.length ? `, folga ${plano.folgas.map((d) => DIAS_SEMANA[d]).join(', ')}` : ''}. {incluiSimulados(plano) ? 'Questões oficiais e OrtoQuestões Simulados.' : 'Só questões oficiais.'}</p>
        <p className={`pe-ritmo pe-ritmo--${ritmoTexto.classe}`}><Icone nome={ritmoTexto.classe === 'atras' ? 'baixo' : ritmoTexto.classe === 'frente' ? 'cima' : 'certo'} tamanho={15} /> {ritmoTexto.texto}</p>
      </div>
      <div className="pe-meta">
        <span className="pe-meta__rotulo">Meta de hoje</span>
        <strong className="numerico">{calculo.metaDiaria}</strong>
        <span className="pe-meta__rotulo">questões novas</span>
        <span className="pe-meta__barra" aria-label={`${calculo.feitasHoje} de ${calculo.metaDiaria} feitas hoje`}><span style={{ width: `${calculo.metaDiaria ? Math.min(100, (calculo.feitasHoje / calculo.metaDiaria) * 100) : 100}%` }} /></span>
        <small>{calculo.faltaHoje ? `${calculo.feitasHoje} feitas · faltam ${calculo.faltaHoje}` : 'Meta de hoje cumprida'}</small>
      </div>
    </section>

    {aberto && pendente && (
      <section className="pe-retomar" aria-label="Sessão em andamento">
        <span className="pe-retomar__icone" aria-hidden="true"><Icone nome="raio" tamanho={22} /></span>
        <div>
          <strong>Você parou no meio: {pendente.feitas} de {pendente.total} questões de {nomeTemaPendente}</strong>
          <small>Continue de onde parou. As que você já respondeu ficam salvas.</small>
          <span className="pe-retomar__barra"><span style={{ width: `${Math.round((pendente.feitas / pendente.total) * 100)}%` }} /></span>
        </div>
        <a className="botao botao--principal botao--grande" href={href('/sessao')}>Continuar de onde parei</a>
      </section>
    )}

    <section className="pe-hoje">
      <div>
        <p className="meta">{calculo.naRetaFinal ? 'RETA FINAL' : 'HOJE'}</p>
        {calculo.naRetaFinal ? (
          <><h2>Semana da reta final</h2><p className="texto-2">Nada de conteúdo novo: refaça os erros e as marcadas com dúvida, e faça um simulado cronometrado.</p></>
        ) : calculo.hoje ? (
          <><h2>{calculo.hoje.n} questões de {calculo.hoje.nome}</h2><p className="texto-2">{calculo.hoje.focos.length ? <>Começando pelo que mais cai: {calculo.hoje.focos.join(', ')}. </> : 'Questões que você ainda não fez. '}Depois, passe pela revisão do dia.</p></>
        ) : calculo.restante === 0 ? (
          <><h2>Você cumpriu o cronograma inteiro</h2><p className="texto-2">Mantenha a revisão em dia e faça o Simulado Nacional do mês.</p></>
        ) : (
          <><h2>Meta de hoje cumprida</h2><p className="texto-2">Amanhã tem mais. Se sobrar fôlego, adiante as próximas logo abaixo.</p></>
        )}
      </div>
      <div className="pe-hoje__acoes">
        {!aberto ? (
          <a className="botao botao--ouro botao--grande" href={href('/assinatura')}><Icone nome="cadeado" tamanho={17} /> Seguir este cronograma</a>
        ) : calculo.naRetaFinal ? <>
          <a className="botao botao--principal botao--grande" href={href('/treinar?situacao=erradas')}>Refazer os erros</a>
          <a className="botao" href={href('/simulado-nacional')}>Simulado Nacional</a>
        </> : calculo.hoje ? (
          <button type="button" className={'botao botao--grande ' + (pendente ? '' : 'botao--principal')} onClick={aoComecar}>{pendente ? 'Começar uma nova' : 'Começar agora'}</button>
        ) : (
          <a className="botao botao--principal" href={href('/revisao')}>Ir para a revisão</a>
        )}
      </div>
    </section>

    {podeAdiantar && proximo && <section className={'pe-adiantar' + (calculo.hoje ? '' : ' pe-adiantar--destaque')} aria-labelledby="pe-adiantar-titulo">
      <span className="pe-adiantar__icone" aria-hidden="true"><Icone nome="raio" tamanho={22} /></span>
      <div className="pe-adiantar__texto">
        <h2 id="pe-adiantar-titulo">{calculo.hoje ? 'Terminou e quer mais?' : 'Meta de hoje feita. Quer adiantar?'}</h2>
        <p>Puxe as próximas questões do cronograma: <b>{proximo.nome}</b>{proximo.estaSemana ? ', o próximo tema desta semana' : `, da semana de ${curta(proximo.semana)}`}. O que você adiantar hoje alivia a meta dos próximos dias.</p>
      </div>
      <div className="pe-adiantar__acoes">
        <button type="button" className="botao" onClick={() => aoAdiantar!(10)}>+10 questões</button>
        <button type="button" className="botao" onClick={() => aoAdiantar!(20)}>+20</button>
        <button type="button" className={'botao ' + (calculo.hoje ? '' : 'botao--principal')} onClick={() => aoAdiantar!(Math.max(10, calculo.metaDiaria))}>Adiantar um dia ({Math.max(10, calculo.metaDiaria)})</button>
      </div>
    </section>}

    {aberto && <div className="pe-duas">
      <section className="cartao cartao__corpo pe-progresso">
        <h2>Progresso do cronograma</h2>
        <div className="pe-progresso__numero"><strong className="numerico">{calculo.feitas.toLocaleString('pt-BR')}</strong><span>de {calculo.alvo.toLocaleString('pt-BR')} questões</span></div>
        <span className="pe-barra"><span style={{ width: `${progresso}%` }} /></span>
        <dl className="pe-dados">
          <div><dt>Esperado até hoje</dt><dd className="numerico">{calculo.esperadoAteHoje.toLocaleString('pt-BR')}</dd></div>
          <div><dt>Dias de estudo até a reta final</dt><dd className="numerico">{calculo.diasEstudoRestantes}</dd></div>
          <div><dt>Reta final a partir de</dt><dd>{curta(calculo.inicioRetaFinal)}</dd></div>
        </dl>
      </section>
      <section className="cartao cartao__corpo pe-fracos">
        <h2>Reforço nos pontos fracos</h2>
        {reforcados.length ? <>
          <p className="texto-2">Estes temas estão abaixo do seu acerto médio e ganham mais espaço no cronograma:</p>
          <ul className="pe-fracos__lista">{reforcados.slice(0, 5).map((t) => <li key={t.slug}><span>{t.nome}</span><b className="numerico">{t.acerto}%</b></li>)}</ul>
        </> : <p className="texto-2">Ainda não há tema claramente abaixo da sua média. O cronograma distribui pelo que falta em cada tema e reforça automaticamente quando algum ficar para trás.</p>}
      </section>
    </div>}

    <details className="cartao cartao__corpo pe-entenda" open={explicacaoAberta}>
      <summary><Icone nome="interrogacao" tamanho={18} /> Como o cronograma funciona</summary>
      <ul>
        <li><strong>Meta de hoje:</strong> questões novas (que você ainda não fez) para hoje. As revisões do dia são à parte, na página Revisão.</li>
        <li><strong>Semana a semana:</strong> quais temas entram em cada semana e quantas questões de cada um. As áreas que mais caem vêm antes e ganham mais espaço; os temas em que você está abaixo da média também.</li>
        <li><strong>À frente ou atrás:</strong> compara o que você fez com o esperado até hoje. Atrasou, a meta dos próximos dias sobe um pouco; adiantou, ela alivia.</li>
        <li><strong>Reta final:</strong> a última semana antes da prova não tem conteúdo novo. É para refazer os erros, as marcadas com dúvida e fazer um simulado.</li>
        <li><strong>Intensidade:</strong> leve cobre metade das questões que faltam, firme 80% e completo todas. Dá para mudar em "Ajustar o cronograma".</li>
        <li><strong>Adiantar:</strong> terminou a meta e quer mais? Puxe as próximas questões do cronograma (inclusive da semana que vem). Elas contam como feitas e a meta dos próximos dias diminui.</li>
      </ul>
    </details>

    <a className="pe-incidencia" href={href('/temas-que-mais-caem')}>
      <span className="pe-incidencia__icone" aria-hidden="true"><Icone nome="grafico" tamanho={20} /></span>
      <span><strong>O cronograma segue os temas que mais caem</strong><small>As áreas com mais questões nas provas ganham mais espaço, e cada dia começa pelos assuntos de prioridade máxima. Veja a contagem.</small></span>
      <Icone nome="direita" tamanho={18} />
    </a>

    <section className="cartao cartao__corpo pe-semanas" aria-labelledby="pe-semanas-titulo">
      <header className="pe-semanas__cabeca">
        <div><h2 id="pe-semanas-titulo">Semana a semana</h2><p className="pe-semanas__dica">Cada semana mostra os assuntos que entram nela. Toque para ver o porquê e quanto cada um cai.</p></div>
        <SeloAssinante />
      </header>
      <ol className="pe-linha">
        {visiveis.map(linhaSemana)}
        {aberto && !calculo.provaPassou && <li className="pe-semana pe-semana--final">
          <span className="pe-semana__data">{curta(calculo.inicioRetaFinal)} – véspera</span>
          <div className="pe-semana__temas"><span className="pe-chip pe-chip--final">Reta final: erros, dúvidas e simulado</span></div>
          <span className="pe-semana__total"><Icone nome="bandeira" tamanho={16} /></span>
        </li>}
      </ol>
      {!aberto && semanas.length > SEMANAS_PREVIA && (
        <Degustacao className="pe-degustacao" titulo={`Mais ${semanas.length - SEMANAS_PREVIA} semanas até a prova`} texto={<p>O cronograma completo, com a reta final, o progresso dia a dia e o ajuste automático quando você atrasa ou adianta.</p>} acao="Liberar o cronograma completo">
          <ol className="pe-linha">{semanas.slice(SEMANAS_PREVIA, SEMANAS_PREVIA + 4).map((s, i) => linhaSemana(s, i + SEMANAS_PREVIA))}</ol>
        </Degustacao>
      )}
    </section>
  </>
}

/** A explicação do cronograma vem aberta só na primeira vez que a pessoa vê o próprio cronograma. */
function primeiraVisita(): boolean {
  try {
    if (localStorage.getItem('ortoquestoes:cronograma-visto')) return false
    localStorage.setItem('ortoquestoes:cronograma-visto', '1')
    return true
  } catch { return false }
}

/** O que o cronograma faz, em três passos. */
function ComoFunciona() {
  const passos = [
    { titulo: 'Você diz a data da prova', texto: 'E os dias da semana em que não estuda (plantão, descanso).' },
    { titulo: 'Ele monta o caminho', texto: 'Divide as questões que faltam pelos dias até a prova, começando pelas áreas e assuntos que mais caem e reforçando os seus temas fracos.' },
    { titulo: 'E se ajusta sozinho, todo dia', texto: 'Atrasou, a meta sobe um pouco; adiantou, alivia. A última semana fica reservada para a reta final: erros, dúvidas e simulado.' },
  ]
  return (
    <ol className="cr-destaque__passos pe-como">
      {passos.map((p, i) => (
        <li key={p.titulo}><span className="cr-destaque__passo-num numerico">{i + 1}</span><span><strong>{p.titulo}</strong><small>{p.texto}</small></span></li>
      ))}
    </ol>
  )
}

/** Não assinante: preenche como o assinante e vê o começo do próprio cronograma. */
function PreviaCronograma({ indice, respondidas }: { indice: Indice; respondidas: Respondidas }) {
  const [previa, definirPrevia] = useState<PlanoSalvo | null>(null)
  const calculo = useMemo(() => (previa ? calcularPlano(indice, respondidas, previa) : null), [indice, respondidas, previa])
  if (!previa || !calculo) return <FormularioPlano indice={indice} respondidas={respondidas} atual={null} aoSalvar={definirPrevia} previa />
  return (
    <div className="empilha-2 pe">
      <p className="pe-aviso-previa"><Icone nome="cadeado" tamanho={15} /> Esta é a prévia do seu cronograma. Assinando, ele fica salvo e se ajusta todo dia.</p>
      <VisaoCronograma plano={previa} calculo={calculo} aberto={false} />
      <div className="linha">
        <button type="button" className="botao" onClick={() => definirPrevia(null)}><Icone nome="lapis" tamanho={16} /> Mudar a data ou a intensidade</button>
      </div>
    </div>
  )
}

function FormularioPlano({ indice, respondidas, atual, aoSalvar, aoCancelar, previa = false }: {
  indice: Indice
  respondidas: Respondidas
  atual: PlanoSalvo | null
  aoSalvar: (p: PlanoSalvo) => void
  aoCancelar?: () => void
  /** Sem salvar no servidor: monta a prévia no próprio aparelho. */
  previa?: boolean
}) {
  const [data, definirData] = useState(atual?.data_prova ?? (dataLocal(DATA_TEOT) > new Date() ? DATA_TEOT : ''))
  const [prova, definirProva] = useState(atual?.prova ?? 'TEOT')
  const [intensidade, definirIntensidade] = useState<Intensidade>(atual?.intensidade ?? 'firme')
  const [folgas, definirFolgas] = useState<number[]>(atual?.folgas ?? [0])
  const [simulados, definirSimulados] = useState(incluiSimulados(atual))
  const [recomecar, definirRecomecar] = useState(false)
  const [salvando, definirSalvando] = useState(false)
  const [erro, definirErro] = useState('')
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data) && dataLocal(data) > new Date()

  async function salvar() {
    if (!dataValida || salvando) return
    const base = respondidasNoAcervo(indice, respondidas, simulados)
    if (previa) {
      aoSalvar({ data_prova: data, intensidade, folgas, prova, base_respondidas: base, criado_em: new Date().toISOString(), incluir_simulados: simulados })
      return
    }
    definirSalvando(true); definirErro('')
    try {
      // Trocar a escolha dos simulados muda o tamanho do acervo do plano: a contagem recomeça.
      const mudouSimulados = !!atual && incluiSimulados(atual) !== simulados
      const salvo = await salvarPlano({ p_data_prova: data, p_intensidade: intensidade, p_folgas: folgas, p_prova: prova, p_base: base, p_recomecar: !atual || recomecar || mudouSimulados }, simulados)
      if (!salvo) throw new Error('Plano não encontrado depois de salvar.')
      aoSalvar(salvo)
    } catch (falha) {
      definirErro(codigoErro(falha) === 'data_invalida' ? 'Escolha uma data futura, em até dois anos.' : codigoErro(falha) === 'premium_necessario' ? 'O cronograma é exclusivo para assinantes.' : 'Não foi possível salvar agora. Tente de novo.')
    } finally { definirSalvando(false) }
  }

  async function apagar() {
    if (!window.confirm('Apagar o seu cronograma?')) return
    try { await chamarRpc('apagar_plano_estudo', {}); window.location.reload() } catch { definirErro('Não foi possível apagar agora.') }
  }

  return (
    <div className="empilha-2 pe">
      <section className="pe-heroi pe-heroi--convite pe-heroi--form">
        <div>
          <p className="pe-heroi__selo"><Icone nome="rota" tamanho={15} /> {atual ? 'Ajustar' : 'Seu estudo até a prova'}</p>
          <h1 className="pe-heroi__nome">Cronograma</h1>
          <p>Um plano de estudo até o dia da sua prova. Você responde quatro perguntas e ele diz <strong>quantas questões fazer por dia</strong> e <strong>qual tema estudar em cada semana</strong>, começando pelo que mais cai no TEOT e no TARO.{previa ? ' Preencha abaixo e veja a prévia do seu.' : ''}</p>
        </div>
        <ComoFunciona />
      </section>
      <section className="cartao cartao__corpo pe-form">
        <div className="pe-form__passo">
          <span className="tr-etapa__numero">1</span>
          <div className="pe-form__campos">
            <h2>Qual prova e quando?</h2>
            <div className="pe-form__linha">
              <label className="campo">Prova<select className="entrada" value={PROVAS.includes(prova) ? prova : 'Outra prova'} onChange={(e) => definirProva(e.target.value)}>{PROVAS.map((p) => <option key={p}>{p}</option>)}</select></label>
              <label className="campo">Data da prova<input className="entrada" type="date" min={amanhaIso()} value={data} onChange={(e) => definirData(e.target.value)} /></label>
            </div>
            {dataLocal(DATA_TEOT) > new Date() && <button type="button" className={'pe-data-atalho' + (data === DATA_TEOT ? ' pe-data-atalho--ativo' : '')} onClick={() => { definirData(DATA_TEOT); if (!PROVAS.slice(0, 2).includes(prova)) definirProva('TEOT') }}>
              <Icone nome="calendario" tamanho={16} /> <span><strong>TEOT e TEPOT 2027</strong> · prova teórica em 10 de janeiro de 2027</span>{data === DATA_TEOT && <Icone nome="certo" tamanho={16} />}
            </button>}
            {dataValida && <p className="pe-form__resumo"><Icone nome="relogio" tamanho={15} /> Faltam <b>{Math.ceil((dataLocal(data).getTime() - Date.now()) / 86_400_000)} dias</b> até a prova.</p>}
          </div>
        </div>
        <div className="pe-form__passo">
          <span className="tr-etapa__numero">2</span>
          <div className="pe-form__campos">
            <h2>Qual intensidade?</h2>
            <p className="texto-2">É quanto do acervo você quer cobrir até a prova. O número embaixo de cada opção é a sua meta de questões novas por dia; a revisão do dia é à parte. Dá para trocar depois, e quem termina a meta pode sempre adiantar.</p>
            <div className="pe-intensidades" role="radiogroup" aria-label="Intensidade">
              {(Object.keys(ROTULO_INTENSIDADE) as Intensidade[]).map((i) => (
                <button key={i} type="button" role="radio" aria-checked={intensidade === i} className="pe-intensidade" onClick={() => definirIntensidade(i)}>
                  <strong>{ROTULO_INTENSIDADE[i].nome}</strong>
                  <span>{ROTULO_INTENSIDADE[i].texto}</span>
                  {dataValida && <b className="numerico">{simularMeta(indice, respondidas, data, i, folgas, simulados)} por dia</b>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="pe-form__passo">
          <span className="tr-etapa__numero">3</span>
          <div className="pe-form__campos">
            <h2>Em que dias você não estuda?</h2>
            <p className="texto-2">Plantão fixo, dia de descanso. A meta se espalha pelos outros dias.</p>
            <div className="tr-pilulas">
              {DIAS_SEMANA.map((d, i) => (
                <button key={d} type="button" className="tr-pilula" aria-pressed={folgas.includes(i)} disabled={!folgas.includes(i) && folgas.length >= 5}
                  onClick={() => definirFolgas(folgas.includes(i) ? folgas.filter((x) => x !== i) : [...folgas, i].sort())}>{d}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="pe-form__passo">
          <span className="tr-etapa__numero">4</span>
          <div className="pe-form__campos">
            <h2>Incluir os OrtoQuestões Simulados?</h2>
            <p className="texto-2">São questões autorais do site, feitas por <strong>engenharia reversa das provas originais</strong>: o mesmo estilo, o mesmo tipo de cobrança e o mesmo nível, escritas a partir da bibliografia de referência e comentadas com a citação do livro. Cobrem pontos do livro que ainda não caíram e fixam o conteúdo de onde saem as próximas questões. Não contam para os temas que mais caem, que usam só as provas oficiais.</p>
            <div className="pe-intensidades" role="radiogroup" aria-label="OrtoQuestões Simulados">
              <button type="button" role="radio" aria-checked={simulados} className="pe-intensidade" onClick={() => definirSimulados(true)}>
                <strong>Oficiais e Simulados</strong>
                <span>Recomendado. Mais questões no padrão da prova, para aprender o conteúdo e não só decorar as provas anteriores.</span>
              </button>
              <button type="button" role="radio" aria-checked={!simulados} className="pe-intensidade" onClick={() => definirSimulados(false)}>
                <strong>Só questões oficiais</strong>
                <span>Apenas as questões das provas anteriores. Os simulados continuam disponíveis no treino livre.</span>
              </button>
            </div>
            {atual && incluiSimulados(atual) !== simulados && <p className="pe-form__resumo"><Icone nome="relogio" tamanho={15} /> Trocar esta opção recomeça a contagem do cronograma a partir de hoje.</p>}
          </div>
        </div>
        {atual && <label className="caixa"><input type="checkbox" checked={recomecar} onChange={(e) => definirRecomecar(e.target.checked)} /><span>Recomeçar a contagem hoje (zera o "à frente ou atrás do cronograma")</span></label>}
        {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}
        <div className="linha">
          <button type="button" className={'botao botao--grande ' + (previa ? 'botao--ouro' : 'botao--principal')} disabled={!dataValida || salvando} onClick={salvar}>{salvando ? 'Salvando…' : previa ? 'Ver a prévia do meu cronograma' : atual ? 'Salvar ajustes' : 'Criar meu cronograma'}</button>
          {aoCancelar && <button type="button" className="botao botao--fantasma" onClick={aoCancelar}>Cancelar</button>}
          {atual && <button type="button" className="botao botao--fantasma pe-form__apagar" onClick={apagar}>Apagar cronograma</button>}
        </div>
        {previa && <p className="texto-2 pe-form__nota"><Icone nome="cadeado" tamanho={14} /> A prévia mostra o dia de hoje e as duas primeiras semanas. O cronograma completo, salvo e ajustado todo dia, é do assinante.</p>}
      </section>
    </div>
  )
}

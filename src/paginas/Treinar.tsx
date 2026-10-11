import { useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { arvoreAssuntos, contar, filtrar, LIMITE_TURMA_ACERTA, LIMITE_TURMA_ERRA, montarSessao } from '../dados/acervo'
import { usarPremium } from '../conta/premium'
import { ConvitePremium, SeloAssinante } from '../componentes/Premium'
import {
  FILTROS_VAZIOS,
  ROTULO_DIFICULDADE,
  ROTULO_SITUACAO,
  SITUACOES_TURMA,
  type Dificuldade,
  type Filtros,
  type Area,
  AREAS_TREINO,
  ROTULO_AREA,
  type Situacao,
} from '../dados/tipos'
import { consultaParaFiltros, filtrosParaConsulta, navegar } from '../util/rotas'
import { SeletorArvore } from '../componentes/SeletorArvore'
import { Carregando, Estado } from '../componentes/Estados'
import { usarSessao } from '../estado/sessao'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { usarEtiquetas } from '../estado/preferencias'
import { href } from '../util/rotas'
import { usarConta } from '../conta/ContextoConta'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { usarCronogramaHoje } from '../componentes/CaixasAssinante'
import '../estilos/paginas/Treinar.css'

// TEOT e TARO vêm primeiro, cada um na sua pílula. "TEOT/TARO" fica para as
// questões cuja prova de origem ainda não foi confirmada com o PDF oficial.
// CET-PR: prova da Comissão de Ensino e Treinamento da Regional Paraná.
const ORDEM_PROVAS = ['TEOT', 'TARO', 'TEOT/TARO', 'CET-PR']

// Ortopedia é o padrão do site; cirurgia da mão só entra quando a pessoa escolhe.
const DESCRICAO_AREA: Record<Area, string> = {
  base: 'TEOT, TARO e afins',
  enare: 'Ano adicional em ortopedia',
  coluna: 'R4 de cirurgia da coluna',
  quadril: 'Simulados autorais no padrão da prova',
  mao: 'Especialidade à parte, inclui cirurgia plástica',
}

const DIFICULDADES: Dificuldade[] = ['facil', 'medio', 'dificil']
const LIMITES = [5, 10, 20, 30, 50, 100]
const SITUACOES: Situacao[] = ['todas', 'naoRespondidas', 'erradas', 'acertadas', 'favoritas', 'revisarHoje', 'incertas', 'dominadas', 'turmaErra', 'turmaAcertaVoceErrou']
/** O que cada situação seleciona, dito por extenso: o rótulo curto sozinho gerava dúvida. */
const DESCRICAO_SITUACAO: Record<Situacao, string> = {
  todas: 'Todas as questões do recorte, respondidas ou não. Revisões, novas e já acertadas vêm intercaladas.',
  naoRespondidas: 'Só as que você ainda não respondeu.',
  erradas: 'As que você errou na última vez que respondeu.',
  acertadas: 'As que você acertou na última vez que respondeu.',
  favoritas: 'As que você marcou com a estrela durante as sessões.',
  revisarHoje: 'As que o seu ritmo de revisão separou para hoje.',
  incertas: 'As que você marcou como chute ou dúvida ao responder.',
  dominadas: 'As que você acertou em todas as revisões programadas.',
  turmaErra: `As que menos de ${LIMITE_TURMA_ERRA}% da turma acerta de primeira, começando pelas mais erradas. É onde mora a pegadinha.`,
  turmaAcertaVoceErrou: `As que ${LIMITE_TURMA_ACERTA}% ou mais da turma acerta e você errou da última vez: lacunas que custam ponto fácil na prova.`,
}
const DURACOES: Array<[number, string]> = [
  [60, '1 hora'],
  [120, '2 horas'],
  [180, '3 horas'],
  [240, '4 horas'],
]

export function Treinar({ consulta }: { consulta: URLSearchParams }) {
  const cronograma = usarCronogramaHoje()
  const rotuloCronograma = cronograma.calculo ? 'Seguir o cronograma' : 'Montar meu cronograma'
  const { indice, carregando } = usarIndice()
  const { iniciar, sessao } = usarSessao()
  const { sessao: conta } = usarConta()
  const [filtros, definirFiltros] = useState<Filtros>(() => consulta.size ? consultaParaFiltros(consulta) : { ...FILTROS_VAZIOS, limite: 10 })
  useEffect(() => {
    const mudou = () => {
      const [caminho, query = ''] = window.location.hash.slice(1).split('?')
      if (caminho === '/treinar') {
        const proximos = consultaParaFiltros(new URLSearchParams(query))
        definirFiltros(atuais => filtrosParaConsulta(atuais) === filtrosParaConsulta(proximos) ? atuais : proximos)
      }
    }
    window.addEventListener('hashchange', mudou)
    return () => window.removeEventListener('hashchange', mudou)
  }, [])
  const [simulado, definirSimulado] = useState(false)
  const [minutos, definirMinutos] = useState(180)

  // A URL acompanha os filtros: o endereço da barra é o filtro compartilhável.
  useEffect(() => {
    const destino = '/treinar' + filtrosParaConsulta(filtros)
    if (window.location.hash !== '#' + destino) {
      navegar(destino, true)
    }
  }, [filtros])

  const { contexto, carregandoBusca, turmaFalhou } = usarContextoLocal(filtros.busca, true)
  const { premium, carregado: premiumCarregado, logado } = usarPremium()
  const semTurma = (!logado || premiumCarregado) && !premium
  const [conviteTurma, definirConviteTurma] = useState(false)
  // Link compartilhado com filtro da turma, aberto por quem não assina.
  useEffect(() => {
    if (semTurma && SITUACOES_TURMA.includes(filtros.situacao)) { definirConviteTurma(true); definirFiltros((f) => ({ ...f, situacao: 'todas' })) }
  }, [semTurma, filtros.situacao])
  const { mostrarEtiquetas, definirEtiquetas } = usarEtiquetas()
  const contagens = useMemo(
    () => (indice ? contar(indice, filtros, contexto) : null),
    [indice, filtros, contexto],
  )
  const arvore = useMemo(() => (indice ? arvoreAssuntos(indice) : []), [indice])
  const gruposProva = useMemo(() => {
    const provasNoAcervo = indice?.provas ?? []
    const grupos: Array<{ rotulo: string; provas: string[] }> = []
    for (const prova of ORDEM_PROVAS) if (provasNoAcervo.includes(prova)) grupos.push({ rotulo: prova, provas: [prova] })
    for (const prova of provasNoAcervo) {
      if (ORDEM_PROVAS.includes(prova)) continue
      grupos.push({ rotulo: prova, provas: [prova] })
    }
    return grupos
  }, [indice])

  const gerais = useMemo(() => (indice ? contar(indice, { ...FILTROS_VAZIOS, areas: filtros.areas }, contexto) : null), [indice, contexto, filtros.areas])
  // Quantas questões cada categoria traz sozinha, com os demais filtros como estão
  // (sem as provas, que a troca de categoria limpa).
  const porArea = useMemo(() => {
    if (!indice) return null
    const presentes = AREAS_TREINO.filter((a) => a === 'base' || indice.questoes.some((q) => q.ar === a))
    if (presentes.length < 2) return null
    return presentes.map((area) => ({ area, n: contar(indice, { ...filtros, areas: [area], provas: [] }, contexto).total }))
  }, [indice, filtros, contexto])

  const provasDoFoco = useMemo(() => {
    if (!indice || !porArea) return null
    return new Set(filtrar(indice, { ...FILTROS_VAZIOS, areas: filtros.areas, incluirAnuladas: true }).map((q) => q.p).filter((p): p is number => p !== null).map((p) => indice.provas[p]))
  }, [indice, porArea, filtros.areas])

  function alternarArea(area: Area) {
    const marcada = filtros.areas.includes(area)
    // Sempre fica ao menos uma categoria marcada.
    if (marcada && filtros.areas.length === 1) return
    const areas = marcada ? filtros.areas.filter((a) => a !== area) : AREAS_TREINO.filter((a) => a === area || filtros.areas.includes(a))
    atualizar({ areas, provas: [] })
  }

  // Filtro que não tem nenhuma opção não vira campo vazio na tela.
  const temProva = gruposProva.length > 0
  const totalSimulados = gerais?.simulados ?? 0
  // O convite dos simulados olha o acervo todo: hoje eles moram na categoria
  // Fellowship Quadril, e quem treina só ortopedia também precisa encontrá-los.
  const areasComSimulados = useMemo(() => (indice ? AREAS_TREINO.filter((a) => indice.questoes.some((q) => q.sim === 1 && (q.ar ?? 'base') === a)) : []), [indice])
  const simuladosAcervo = useMemo(() => (indice ? contar(indice, { ...FILTROS_VAZIOS, areas: AREAS_TREINO }, contexto).simulados : 0), [indice, contexto])
  const areasSimulado = useMemo(() => AREAS_TREINO.filter((a) => filtros.areas.includes(a) || areasComSimulados.includes(a)), [filtros.areas, areasComSimulados])
  const soSimulados = filtros.soSimulados
  // O botão de simulados mantém as categorias marcadas; só acrescenta as que têm
  // simulados quando as marcadas não têm nenhum.
  const simuladosNoRecorte = useMemo(() => {
    if (!indice) return { n: 0, areas: filtros.areas }
    const nasMarcadas = contar(indice, { ...filtros, soSimulados: true, provas: [] }, contexto).total
    if (nasMarcadas > 0) return { n: nasMarcadas, areas: filtros.areas }
    return { n: contar(indice, { ...filtros, soSimulados: true, areas: areasSimulado, provas: [] }, contexto).total, areas: areasSimulado }
  }, [indice, filtros, areasSimulado, contexto])
  const temAno = (indice?.anos.length ?? 0) > 0
  const temComentario = useMemo(
    () => (indice?.questoes ?? []).some((q) => q.c === 1),
    [indice],
  )
  const temImagem = useMemo(() => (indice?.questoes ?? []).some((q) => q.img === 1), [indice])
  const temAnulada = useMemo(() => (indice?.questoes ?? []).some((q) => q.an === 1), [indice])

  const total = contagens?.total ?? 0
  const quantidadeSessao = filtros.limite ? Math.min(filtros.limite, total) : total
  const estimativaMinutos = Math.max(1, Math.round(quantidadeSessao * (simulado ? 1.5 : 0.8)))
  const desempenhoAnterior = useMemo(() => {
    const registros = Object.values(contexto.respondidas)
    const tentativas = registros.reduce((total, registro) => total + (registro.tentativas ?? 1), 0)
    const acertos = registros.reduce((total, registro) => total + (registro.acertos ?? Number(registro.c === true)), 0)
    return tentativas ? Math.round((acertos / tentativas) * 100) : null
  }, [contexto.respondidas])

  const rapidas: { titulo: string; icone: NomeIcone; quantidade: number; preset: Partial<Filtros> }[] = [
    { titulo: 'Revisar hoje', icone: 'calendario', quantidade: gerais?.porSituacao.revisarHoje ?? 0, preset: { situacao: 'revisarHoje' } },
    { titulo: 'Questões novas', icone: 'alvo', quantidade: gerais?.porSituacao.naoRespondidas ?? 0, preset: { situacao: 'naoRespondidas' } },
    { titulo: 'Que eu errei', icone: 'reiniciar', quantidade: gerais?.porSituacao.erradas ?? 0, preset: { situacao: 'erradas' } },
    { titulo: 'Favoritas', icone: 'estrela', quantidade: gerais?.porSituacao.favoritas ?? 0, preset: { situacao: 'favoritas' } },
  ]
  const [filtrosProvaAbertos, definirFiltrosProvaAbertos] = useState(
    () => filtros.provas.length + filtros.anos.length + filtros.dificuldades.length > 0 || filtros.soSimulados,
  )

  // No celular, Situação e Formato começam recolhidos mostrando o que está
  // escolhido; o botão fixo de começar já funciona com o padrão.
  const [telaLarga] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 52rem)').matches)
  const [situacaoAberta, definirSituacaoAberta] = useState(() => telaLarga || filtros.situacao !== 'todas')
  const [formatoAberto, definirFormatoAberto] = useState(telaLarga)

  /** Sessão de 10 num clique, sem passar pelos filtros. */
  function sessaoRapida(preset: Partial<Filtros> = {}) {
    if (!indice) return
    if (sessao && !sessao.concluidaEm && !window.confirm('Substituir a sessão em andamento? Seu histórico será mantido.')) return
    const rapido: Filtros = { ...FILTROS_VAZIOS, areas: filtros.areas, embaralhar: true, limite: 10, ...preset }
    iniciar(rapido, montarSessao(indice, rapido, Date.now(), contexto))
    navegar('/sessao')
  }

  function atualizar(parcial: Partial<Filtros>) {
    definirFiltros((atuais) => ({ ...atuais, ...parcial }))
  }

  /** Recorte dos OrtoQuestões Simulados já no modo prova, levando ao formato. */
  function montarSimulado() {
    atualizar(areasSimulado.length === filtros.areas.length ? { soSimulados: true } : { soSimulados: true, areas: areasSimulado, provas: [] })
    definirSimulado(true)
    definirFiltrosProvaAbertos(true)
    definirFormatoAberto(true)
    document.getElementById('etapa-formato')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function comecar() {
    if (!indice || total === 0 || carregandoBusca) return
    if (sessao && !sessao.concluidaEm && !window.confirm('Substituir a sessão em andamento? Seu histórico será mantido.')) return
    const ids = montarSessao(indice, filtros, Date.now(), contexto)
    iniciar(filtros, ids, simulado ? { simulado: true, limiteSegundos: minutos * 60 } : {})
    navegar('/sessao')
  }

  if (carregando) return <Carregando linhas={6} rotulo="Carregando os filtros" />

  if (indice && indice.total === 0) {
    return (
      <Estado
        titulo="Ainda não há questões para filtrar."
        acoes={
          <a className="botao" href={href('/')}>
            Voltar ao início
          </a>
        }
      >
        <p>O primeiro tema entra no ar assim que a conferência da importação terminar.</p>
      </Estado>
    )
  }

  const selecionados = filtros.temas.length + filtros.subtemas.length
  const nomesProva = gruposProva.filter((g) => g.provas.some((p) => filtros.provas.includes(p))).map((g) => g.rotulo)
  const resumoProva = [
    nomesProva.length ? nomesProva.join(', ') : 'Todas as provas',
    filtros.soSimulados ? 'só simulados' : '',
    filtros.anos.length ? [...filtros.anos].sort((a, b) => b - a).join(', ') : 'todos os anos',
    filtros.dificuldades.length ? filtros.dificuldades.map((d) => ROTULO_DIFICULDADE[d].toLowerCase()).join(', ') : '',
  ].filter(Boolean).join(' · ')
  const opcoesAtivas = [filtros.comImagem, filtros.comComentario, filtros.incluirAnuladas, !filtros.embaralhar, !mostrarEtiquetas].filter(Boolean).length
  const situacoesVisiveis = SITUACOES.filter((s) => !SITUACOES_TURMA.includes(s) && (s === 'todas' || s === filtros.situacao || (contagens?.porSituacao[s] ?? 0) > 0))
  return (
    <div className="empilha-2 treinar-pagina">
      <section className="tr-heroi">
        <div className="tr-heroi__texto">
          <p className="tr-heroi__selo">Montar sessão</p>
          <h1>Treinar</h1>
          <p>Escolha o que estudar, quais questões, e quantas. Sem tempo? Comece já com 10.</p>
          <a className="tr-heroi__link" href={href('/cronograma')}><Icone nome="rota" tamanho={15} /> {cronograma.calculo?.hoje ? `${rotuloCronograma}: hoje, ${cronograma.calculo.hoje.nome} · ${cronograma.calculo.feitasHoje} de ${cronograma.calculo.metaDiaria}` : 'Prefere que alguém monte por você? Use o cronograma'}</a>
        </div>
        <button type="button" className="botao botao--claro tr-heroi__rapida" onClick={() => sessaoRapida()} disabled={!indice}>
          <Icone nome="raio" tamanho={20} />
          <span><strong>Sessão rápida</strong><small>10 questões de todo o acervo</small></span>
        </button>
        <div className="tr-rapidas" aria-label="Atalhos de 10 questões">
          <span className="tr-rapidas__rotulo">Atalhos de 10:</span>
          {rapidas.map((r) => (
            <button key={r.titulo} type="button" className="tr-rapida" disabled={r.quantidade === 0} onClick={() => sessaoRapida(r.preset)}>
              <Icone nome={r.icone} tamanho={16} />
              <span>{r.titulo}</span>
              <b className="numerico">{r.quantidade}</b>
            </button>
          ))}
        </div>
      </section>

      <nav className="tr-trilha" aria-label="Passos para montar a sessão">
        {[
          ['etapa-1', 'O que estudar', selecionados ? `${selecionados} ${selecionados === 1 ? 'assunto' : 'assuntos'}` : 'todos os assuntos'],
          ['etapa-2', 'Quais questões', ROTULO_SITUACAO[filtros.situacao]],
          ['etapa-3', 'Filtrar mais', 'opcional'],
          ['etapa-formato', 'Quantas e como', `${filtros.limite ?? 'todas'} · ${simulado ? 'prova' : 'estudo'}`],
        ].map(([alvo, titulo, resumo], i) => (
          <a key={alvo} className="tr-trilha__passo" href={`#${alvo}`} onClick={(e) => { e.preventDefault(); document.getElementById(alvo)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
            <b>{i + 1}</b><span><strong>{titulo}</strong><small>{resumo}</small></span>
          </a>
        ))}
        <button type="button" className="tr-trilha__passo tr-trilha__passo--fim" disabled={total === 0 || carregandoBusca} onClick={comecar}>
          <b>▶</b><span><strong>Começar</strong><small>{total === 0 ? 'ajuste os filtros' : `${quantidadeSessao} ${quantidadeSessao === 1 ? 'questão' : 'questões'}`}</small></span>
        </button>
      </nav>

      {!conta && <p className="aviso-ia">Crie sua conta gratuita para guardar respostas, favoritos e revisões entre acessos e dispositivos. No gratuito, você responde um número limitado de questões a cada 24 horas; os planos liberam sem limite. <a href={href('/conta')}>Criar minha conta</a></p>}

      <section className="tr-etapa" id="etapa-1">
        <header className="tr-etapa__cabeca">
          <span className="tr-etapa__numero">1</span>
          <div>
            <h2>O que estudar</h2>
            <p>{selecionados ? `${selecionados} ${selecionados === 1 ? 'selecionado' : 'selecionados'}. Toque de novo para desmarcar.` : 'Marque um ou mais temas. Abra os subtemas para um recorte mais fino.'}</p>
          </div>
        </header>
        {porArea && (
          <>
            <p className="tr-foco__titulo"><span className="tr-sub">A</span> Provas <small>Marque uma ou mais.</small></p>
            <div className="tr-foco" role="group" aria-label="Categorias de prova">
              {porArea.map(({ area }) => (
                <button key={area} type="button" className="tr-foco__opcao" aria-pressed={filtros.areas.includes(area)} onClick={() => alternarArea(area)}>
                  <strong>{ROTULO_AREA[area]}</strong>
                  <small>{DESCRICAO_AREA[area]}</small>
                </button>
              ))}
              {simuladosAcervo > 0 && (
                <button type="button" className="tr-foco__opcao tr-foco__opcao--simulados" aria-pressed={soSimulados}
                  onClick={() => atualizar(soSimulados ? { soSimulados: false } : { soSimulados: true, areas: simuladosNoRecorte.areas, provas: [] })}>
                  <strong>OrtoQuestões Simulados</strong>
                  <small>Só as nossas, por engenharia reversa das provas oficiais</small>
                </button>
              )}
            </div>
          </>
        )}
        <p className="tr-foco__titulo"><span className="tr-sub">B</span> Temas <small>Sem marcar nenhum, entram todos.</small></p>
        <SeletorArvore
          variante="lista"
          arvore={arvore}
          temas={filtros.temas}
          subtemas={filtros.subtemas}
          porTema={contagens?.porTema ?? {}}
          porSubtema={contagens?.porSubtema ?? {}}
          aoMudar={(temas, subtemas) => atualizar({ temas, subtemas })}
        />
        <a className="tr-incidencia" href={href('/temas-que-mais-caem')}>
          <Icone nome="grafico" tamanho={16} />
          <span>Não sabe por onde começar? <b>Veja os temas que mais caem</b></span>
          {!premium && <SeloAssinante />}
        </a>
        <p className="tr-foco__titulo"><span className="tr-sub">C</span> Palavra-chave <small>opcional: procura no texto das questões</small></p>
        <div className="tr-busca">
          <Icone nome="busca" tamanho={18} />
          <label className="so-leitor" htmlFor="busca-acervo">Buscar no texto das questões</label>
          <input
            id="busca-acervo"
            className="entrada"
            type="search"
            name="busca"
            autoComplete="off"
            placeholder="Ex.: Salter-Harris, Weber, manguito…"
            value={filtros.busca}
            onChange={(e) => atualizar({ busca: e.target.value })}
          />
        </div>
        {carregandoBusca && <span className="campo__auxilio">Carregando o texto das questões…</span>}
      </section>

      <details className="tr-etapa tr-etapa--recolhivel" id="etapa-2" open={situacaoAberta} onToggle={(e) => definirSituacaoAberta((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="tr-etapa__cabeca">
          <span className="tr-etapa__numero">2</span>
          <div>
            <h2>Quais questões</h2>
            <p>{situacaoAberta ? 'Todas, só as novas, as que você errou ou as que vencem hoje.' : `${ROTULO_SITUACAO[filtros.situacao]} · ${(contagens?.porSituacao[filtros.situacao] ?? 0).toLocaleString('pt-BR')} questões`}</p>
          </div>
          <Icone nome="baixo" tamanho={18} />
        </summary>
        <div className="tr-pilulas" id="filtro-situacao">
          {situacoesVisiveis.map((situacao) => (
            <button
              key={situacao}
              type="button"
              className="tr-pilula"
              aria-pressed={filtros.situacao === situacao}
              onClick={() => atualizar({ situacao })}
            >
              {ROTULO_SITUACAO[situacao]}
              <span className="numerico">{contagens?.porSituacao[situacao] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="tr-turma" role="group" aria-labelledby="tr-turma-titulo">
          <p className="tr-turma__titulo" id="tr-turma-titulo"><Icone nome="grupo" tamanho={16} /> Pelo que a turma responde <SeloAssinante /></p>
          <div className="tr-pilulas">
            {SITUACOES_TURMA.map((situacao) => (
              <button
                key={situacao}
                type="button"
                className={'tr-pilula tr-pilula--turma' + (semTurma ? ' tr-pilula--bloqueada' : '')}
                aria-pressed={filtros.situacao === situacao}
                onClick={() => semTurma ? definirConviteTurma(true) : atualizar({ situacao: filtros.situacao === situacao ? 'todas' : situacao })}
              >
                {semTurma && <Icone nome="cadeado" tamanho={14} />}
                {ROTULO_SITUACAO[situacao]}
                {!semTurma && !turmaFalhou && <span className="numerico">{contexto.turma ? contagens?.porSituacao[situacao] ?? 0 : '…'}</span>}
              </button>
            ))}
          </div>
          {!semTurma && turmaFalhou && <p className="tr-dica">Não foi possível carregar agora como a turma respondeu. Tente de novo mais tarde.</p>}
          {conviteTurma && semTurma && (
            <ConvitePremium
              variante="faixa"
              icone="grupo"
              titulo="Estude pelo que a turma erra"
              texto={<p>Monte sessões com as questões que a maioria erra de primeira e com as que quase todo mundo acerta, mas você errou. Depois de cada resposta, veja quantos marcaram cada alternativa.</p>}
            />
          )}
        </div>
        <p className="tr-dica">
          {DESCRICAO_SITUACAO[filtros.situacao]}
          {SITUACOES_TURMA.includes(filtros.situacao) && contexto.turma && (contagens?.porSituacao[filtros.situacao] ?? 0) === 0 && ' Ainda não há questões assim no seu recorte: a turma precisa de pelo menos 3 respostas por questão.'}
          {filtros.situacao === 'favoritas' && <> <a href={href('/favoritas')}>Ver a lista das favoritas</a></>}
          {filtros.situacao === 'revisarHoje' && <> <a href={href('/revisao')}>Ajustar o ritmo</a></>}
        </p>
      </details>

      {(temProva || temAno || totalSimulados > 0 || Object.keys(contagens?.porDificuldade ?? {}).length > 0) && (
        <details
          className="tr-etapa tr-etapa--recolhivel"
          id="etapa-3"
          open={filtrosProvaAbertos}
          onToggle={(e) => definirFiltrosProvaAbertos((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="tr-etapa__cabeca">
            <span className="tr-etapa__numero">3</span>
            <div>
              <h2>Filtrar mais <small className="tr-opcional">opcional</small></h2>
              <p>{resumoProva}</p>
            </div>
            <Icone nome="baixo" tamanho={18} />
          </summary>
          {temProva && (
            <div className="tr-grupo">
              <span className="tr-grupo__rotulo">Prova</span>
              <div className="tr-pilulas">
                {gruposProva.map((grupo) => {
                  const marcado = grupo.provas.some((p) => filtros.provas.includes(p))
                  const quantidade = grupo.provas.reduce((soma, p) => soma + (contagens?.porProva[p] ?? 0), 0)
                  // Provas que o foco escolhido não traz (ex.: as da mão no foco ortopedia) somem da lista.
                  if (!marcado && provasDoFoco && !grupo.provas.some((p) => provasDoFoco.has(p))) return null
                  return (
                    <button
                      key={grupo.rotulo}
                      type="button"
                      className="tr-pilula"
                      aria-pressed={marcado}
                      title={grupo.rotulo === 'TEOT/TARO' ? 'TEOT ou TARO: questões com a prova de origem ainda a confirmar' : undefined}
                      onClick={() =>
                        atualizar({
                          provas: marcado
                            ? filtros.provas.filter((x) => !grupo.provas.includes(x))
                            : [...filtros.provas, ...grupo.provas.filter((p) => !filtros.provas.includes(p))],
                        })
                      }
                    >
                      {grupo.rotulo}
                      <span className="numerico">{quantidade}</span>
                    </button>
                  )
                })}
                {totalSimulados > 0 && (
                  <button type="button" className="tr-pilula tr-pilula--simulados" aria-pressed={soSimulados} onClick={() => atualizar({ soSimulados: !soSimulados })}>
                    Só OrtoQuestões Simulados
                    <span className="numerico">{contagens?.simulados ?? 0}</span>
                  </button>
                )}
              </div>
            </div>
          )}
          {temAno && (
            <div className="tr-grupo">
              <span className="tr-grupo__rotulo">Ano</span>
              <div className="tr-pilulas">
                {[...(indice?.anos ?? [])].sort((a, b) => b - a).map((ano) => (
                  <button
                    key={ano}
                    type="button"
                    className="tr-pilula"
                    aria-pressed={filtros.anos.includes(ano)}
                    onClick={() =>
                      atualizar({
                        anos: filtros.anos.includes(ano)
                          ? filtros.anos.filter((x) => x !== ano)
                          : [...filtros.anos, ano],
                      })
                    }
                  >
                    {ano}
                  </button>
                ))}
              </div>
            </div>
          )}
          {Object.keys(contagens?.porDificuldade ?? {}).length > 0 && (
            <div className="tr-grupo">
              <span className="tr-grupo__rotulo">Dificuldade</span>
              <div className="tr-pilulas">
                {DIFICULDADES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="tr-pilula"
                    aria-pressed={filtros.dificuldades.includes(d)}
                    onClick={() =>
                      atualizar({
                        dificuldades: filtros.dificuldades.includes(d)
                          ? filtros.dificuldades.filter((x) => x !== d)
                          : [...filtros.dificuldades, d],
                      })
                    }
                  >
                    {ROTULO_DIFICULDADE[d]}
                    <span className="numerico">{contagens?.porDificuldade[d] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </details>
      )}

      <details className="tr-etapa tr-etapa--recolhivel" id="etapa-formato" open={formatoAberto} onToggle={(e) => definirFormatoAberto((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="tr-etapa__cabeca">
          <span className="tr-etapa__numero">4</span>
          <div>
            <h2>Quantas e como</h2>
            <p>{formatoAberto ? 'O número de questões e se o gabarito vem a cada resposta ou só no fim.' : `${filtros.limite ?? 'Todas as'} questões · ${simulado ? 'modo prova' : 'modo estudo'}`}</p>
          </div>
          <Icone nome="baixo" tamanho={18} />
        </summary>
        <div className="tr-grupo">
          <span className="tr-grupo__rotulo">Quantas questões</span>
          <div className="tr-pilulas" id="filtro-limite">
            {LIMITES.map((n) => (
              <button key={n} type="button" className="tr-pilula" aria-pressed={filtros.limite === n} disabled={total < n} onClick={() => atualizar({ limite: n })}>
                {n}
              </button>
            ))}
            <button type="button" className="tr-pilula" aria-pressed={filtros.limite === null} onClick={() => atualizar({ limite: null })}>Todas</button>
            <label className="tr-quantidade">
              <span className="so-leitor">Quantidade personalizada</span>
              <input className="entrada" type="number" min="1" step="1" max={Math.max(total, 1)} value={filtros.limite ?? ''} placeholder="Outra" onChange={(e) => atualizar({ limite: e.target.value ? Math.max(1, Math.min(total || 1, Math.floor(Number(e.target.value)) || 1)) : null })} />
            </label>
          </div>
        </div>
        <div className="tr-modos" role="radiogroup" aria-label="Como você quer estudar">
          <button type="button" role="radio" aria-checked={!simulado} className="tr-modo" onClick={() => definirSimulado(false)}>
            <Icone nome="livro" tamanho={20} />
            <strong>Modo estudo</strong>
            <span>Gabarito e comentário logo após cada resposta.</span>
          </button>
          <button type="button" role="radio" aria-checked={simulado} className="tr-modo" onClick={() => definirSimulado(true)}>
            <Icone nome="relogio" tamanho={20} />
            <strong>Modo prova</strong>
            <span>Com cronômetro. Gabarito e comentários só ao entregar.</span>
          </button>
        </div>
        {simulado && (
          <div className="tr-grupo">
            <span className="tr-grupo__rotulo">Tempo de prova</span>
            <div className="tr-pilulas" id="filtro-duracao">
              {DURACOES.map(([valor, rotulo]) => (
                <button key={valor} type="button" className="tr-pilula" aria-pressed={minutos === valor} onClick={() => definirMinutos(valor)}>{rotulo}</button>
              ))}
            </div>
          </div>
        )}
        <details className="tr-mais">
          <summary>
            Mais opções {opcoesAtivas > 0 && <span className="tr-mais__ativas">{opcoesAtivas} {opcoesAtivas === 1 ? 'ativa' : 'ativas'}</span>}
            <small>Imagem, comentário, anuladas, ordem e etiquetas</small>
          </summary>
          <div className="tr-mais__lista">
            {temImagem && (
              <label className="caixa">
                <input type="checkbox" checked={filtros.comImagem} onChange={(e) => atualizar({ comImagem: e.target.checked })} />
                <span>Só questões com imagem no enunciado</span>
              </label>
            )}
            {temComentario && (
              <label className="caixa">
                <input type="checkbox" checked={filtros.comComentario} onChange={(e) => atualizar({ comComentario: e.target.checked })} />
                <span>Só questões com comentário</span>
              </label>
            )}
            {temAnulada && (
              <label className="caixa">
                <input type="checkbox" checked={filtros.incluirAnuladas} onChange={(e) => atualizar({ incluirAnuladas: e.target.checked })} />
                <span>Incluir questões anuladas (não contam no desempenho)</span>
              </label>
            )}
            <label className="caixa">
              <input type="checkbox" checked={filtros.embaralhar} onChange={(e) => atualizar({ embaralhar: e.target.checked })} />
              <span>Embaralhar a ordem</span>
            </label>
            <label className="caixa">
              <input type="checkbox" checked={!mostrarEtiquetas} onChange={(e) => definirEtiquetas(!e.target.checked)} />
              <span>
                Esconder as etiquetas de assunto até responder
                <span className="campo__auxilio" style={{ marginTop: 0 }}>
                  Ler "Salter-Harris" antes do enunciado já elimina metade das alternativas. Vale
                  para todas as sessões e dá para trocar no meio, pela tecla E.
                </span>
              </span>
            </label>
          </div>
        </details>
      </details>

      {total === 0 && (
        <Estado titulo="Nenhuma questão atende a esse recorte.">
          <p>
            {filtros.busca.trim()
              ? `Nenhuma questão contém "${filtros.busca.trim()}". A busca procura no enunciado, nas alternativas e nas etiquetas, e exige todas as palavras.`
              : 'Tire um filtro por vez. O botão volta a habilitar assim que houver questões.'}
          </p>
        </Estado>
      )}

      {simuladosAcervo > 0 && (
        <section className="tr-simulados" aria-labelledby="tr-simulados-titulo">
          <div className="tr-simulados__texto">
            <span className="tr-simulados__selo">Autorais</span>
            <h2 id="tr-simulados-titulo">OrtoQuestões Simulados</h2>
            <p>
              <strong className="numerico">{simuladosAcervo}</strong> questões do site, no padrão das provas e todas
              comentadas. Não são questões oficiais.
            </p>
          </div>
          <div className="tr-simulados__acoes">
            <button type="button" className="botao" onClick={() => sessaoRapida({ soSimulados: true, areas: areasSimulado })}>
              <Icone nome="raio" tamanho={16} /> 10 questões
            </button>
            <button type="button" className="botao" onClick={montarSimulado}>
              <Icone nome="relogio" tamanho={16} /> Fazer como prova
            </button>
          </div>
        </section>
      )}

      <div className="tr-barra" role="region" aria-label="Resumo da sessão">
        <div className="tr-barra__resumo">
          <strong>{total === 0 ? 'Nenhuma questão' : `${quantidadeSessao} ${quantidadeSessao === 1 ? 'questão' : 'questões'}`}</strong>
          <span>
            {total > 0 && `cerca de ${estimativaMinutos} min · `}
            {soSimulados ? 'OrtoQuestões Simulados · ' : ''}
            {selecionados ? `${selecionados} ${selecionados === 1 ? 'assunto' : 'assuntos'}` : 'acervo misto'}
            {desempenhoAnterior !== null ? ` · seu acerto: ${desempenhoAnterior}%` : ''}
          </span>
        </div>
        <a className="botao botao--ouro tr-barra__cronograma" href={href('/cronograma')} title={rotuloCronograma} aria-label={rotuloCronograma}><Icone nome="rota" tamanho={18} /><span>{rotuloCronograma}</span></a>
        <button type="button" className="botao botao--fantasma tr-barra__limpar" onClick={() => definirFiltros({ ...FILTROS_VAZIOS, limite: 10 })}>Limpar</button>
        <button type="button" className="botao botao--principal botao--grande" disabled={total === 0 || carregandoBusca} onClick={comecar}>
          {total === 0 ? 'Ajuste os filtros' : simulado ? (
            <>Iniciar modo prova · <span className="botao__contador">{quantidadeSessao}</span></>
          ) : (
            <>Responder <span className="botao__contador">{quantidadeSessao}</span> {quantidadeSessao === 1 ? 'questão' : 'questões'}</>
          )}
        </button>
      </div>
    </div>
  )
}

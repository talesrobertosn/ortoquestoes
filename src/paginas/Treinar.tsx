import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { FLASHCARDS_NO_MENU, fraseGratis } from '../config'
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
import { consultaParaFiltros, filtrosParaConsulta, navegar, rotaDe } from '../util/rotas'
import { SeletorArvore } from '../componentes/SeletorArvore'
import { Carregando, Estado } from '../componentes/Estados'
import { usarSessao } from '../estado/sessao'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { usarEtiquetas } from '../estado/preferencias'
import { href } from '../util/rotas'
import { usarConta } from '../conta/ContextoConta'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { usarCronogramaHoje } from '../componentes/CaixasAssinante'
import { confirmar, pedirTexto } from '../componentes/Confirmar'
import { usarArmazenado } from '../estado/usarArmazenado'
import '../estilos/paginas/Treinar.css'

// TEOT e TARO vêm primeiro, cada um na sua pílula. "TEOT/TARO" fica para as
// questões cuja prova de origem ainda não foi confirmada com o PDF oficial.
// CET-PR: prova da Comissão de Ensino e Treinamento da Regional Paraná.
const ORDEM_PROVAS = ['TEOT', 'TARO', 'TEOT/TARO', 'CET-PR']

// Ortopedia é o padrão do site; cirurgia da mão só entra quando a pessoa escolhe.
const DESCRICAO_AREA: Record<Area, string> = {
  base: 'TEOT, TARO e afins',
  enare: 'Ano adicional em ortopedia',
  coluna: 'R4 de coluna e todas as questões de coluna do site',
  quadril: 'Fellowship e todas as questões de quadril do site',
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
/** Padrão de quem chega sem filtro: Ortopedia, todos os temas, só as não respondidas, 20. */
const PADRAO: Filtros = { ...FILTROS_VAZIOS, situacao: 'naoRespondidas', limite: 20 }
/** Situação em minúsculas, curta, para caber no botão de responder do celular. */
const SITUACAO_CURTA: Record<Situacao, string> = {
  todas: 'todas',
  naoRespondidas: 'não respondidas',
  erradas: 'que errei',
  acertadas: 'que acertei',
  favoritas: 'favoritas',
  revisarHoje: 'revisar hoje',
  incertas: 'chute ou dúvida',
  dominadas: 'dominadas',
  turmaErra: 'a turma erra',
  turmaAcertaVoceErrou: 'turma acerta, errei',
}
const AREA_CURTA: Record<Area, string> = { base: 'Ortopedia', enare: 'R4 ENARE', coluna: 'R4 Coluna', quadril: 'Quadril', mao: 'Mão' }

/** Filtro guardado com nome; a consulta da URL (o endereço do filtro) é a chave. */
interface FiltroSalvo { id: string; nome: string; consulta: string }
const CHAVE_SALVOS = 'treinar:filtros-salvos'
const MAXIMO_SALVOS = 12

const DURACOES: Array<[number, string]> = [
  [60, '1 hora'],
  [120, '2 horas'],
  [180, '3 horas'],
  [240, '4 horas'],
]

export function Treinar({ consulta }: { consulta: URLSearchParams }) {
  const cronograma = usarCronogramaHoje()
  const { indice, carregando } = usarIndice()
  const { iniciarComAviso } = usarSessao()
  const { sessao: conta } = usarConta()
  const [filtros, definirFiltros] = useState<Filtros>(() => consulta.size ? consultaParaFiltros(consulta) : PADRAO)
  // Chegou sem filtro: vale o padrão até a pessoa mexer (ver o efeito mais abaixo).
  const comecouNoPadrao = useRef(!consulta.size)
  useEffect(() => {
    const mudou = () => {
      const rota = rotaDe(window.location.hash)
      if (rota.caminho === '/treinar') {
        const proximos = consultaParaFiltros(rota.consulta)
        definirFiltros(atuais => filtrosParaConsulta(atuais) === filtrosParaConsulta(proximos) ? atuais : proximos)
      }
    }
    window.addEventListener('hashchange', mudou)
    return () => window.removeEventListener('hashchange', mudou)
  }, [])
  const [simulado, definirSimulado] = useState(false)
  const [minutos, definirMinutos] = useState(180)
  // Link antigo com tema, subtema ou prova renomeados: fica só o que existe no
  // acervo, em vez de "1 assunto" na trilha e zero questões sem explicação.
  function semInexistentes(atuais: Filtros): Filtros {
    if (!indice) return atuais
    const temas = new Set(indice.temas.map((t) => t.slug)), subtemas = new Set(indice.subtemas), provas = new Set(indice.provas)
    const limpos = { ...atuais, temas: atuais.temas.filter((t) => temas.has(t)), subtemas: atuais.subtemas.filter((s) => subtemas.has(s)), provas: atuais.provas.filter((p) => provas.has(p)) }
    return limpos.temas.length === atuais.temas.length && limpos.subtemas.length === atuais.subtemas.length && limpos.provas.length === atuais.provas.length ? atuais : limpos
  }
  useEffect(() => {
    if (!indice) return
    definirFiltros(semInexistentes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice])

  // A URL acompanha os filtros: o endereço da barra é o filtro compartilhável.
  useEffect(() => {
    const destino = '/treinar' + filtrosParaConsulta(filtros)
    if (window.location.hash !== '#' + destino) {
      navegar(destino, true)
    }
  }, [filtros])

  // Digitar na busca não recalcula tudo a cada tecla: o texto vai para o filtro
  // depois de 250 ms sem digitar, e as contagens pesadas usam a versão adiada
  // dos filtros (o React atualiza a tela antes e conta em seguida).
  const [buscaDigitada, definirBuscaDigitada] = useState(filtros.busca)
  useEffect(() => { definirBuscaDigitada(filtros.busca) }, [filtros.busca])
  useEffect(() => {
    if (buscaDigitada === filtros.busca) return
    const t = window.setTimeout(() => definirFiltros((atuais) => ({ ...atuais, busca: buscaDigitada })), 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaDigitada])
  const filtrosAdiados = useDeferredValue(filtros)
  const { contexto, carregandoBusca: carregandoTextos, turmaFalhou } = usarContextoLocal(filtros.busca, true)
  // Busca ainda não aplicada (dentro dos 250 ms) conta como carregando: "Começar" espera.
  const carregandoBusca = carregandoTextos || buscaDigitada !== filtros.busca
  const { premium, carregado: premiumCarregado, logado } = usarPremium()
  const semTurma = (!logado || premiumCarregado) && !premium
  const [conviteTurma, definirConviteTurma] = useState(false)
  // Link compartilhado com filtro da turma, aberto por quem não assina.
  useEffect(() => {
    if (semTurma && SITUACOES_TURMA.includes(filtros.situacao)) { definirConviteTurma(true); definirFiltros((f) => ({ ...f, situacao: 'todas' })) }
  }, [semTurma, filtros.situacao])
  const { mostrarEtiquetas, definirEtiquetas } = usarEtiquetas()
  const contagens = useMemo(
    () => (indice ? contar(indice, filtrosAdiados, contexto) : null),
    [indice, filtrosAdiados, contexto],
  )
  // Quantas questões o recorte tem com e sem os OrtoQuestões Simulados (para a escolha da origem).
  const origemContagem = useMemo(() => (indice ? contar(indice, { ...filtrosAdiados, soSimulados: false, semSimulados: false }, contexto) : null), [indice, filtrosAdiados, contexto])
  const arvore = useMemo(() => (indice ? arvoreAssuntos(indice) : []), [indice])
  const [salvos, definirSalvos] = usarArmazenado<FiltroSalvo[]>(CHAVE_SALVOS, [])

  /** O padrão possível agora: quem já respondeu tudo cai em "Todas", não em zero questões. */
  function filtrosPadrao(): Filtros {
    if (!indice) return PADRAO
    return (contar(indice, FILTROS_VAZIOS, contexto).porSituacao.naoRespondidas ?? 0) > 0 ? PADRAO : { ...PADRAO, situacao: 'todas' }
  }
  useEffect(() => {
    if (!indice || !comecouNoPadrao.current) return
    comecouNoPadrao.current = false
    definirFiltros((atuais) => filtrosParaConsulta(atuais) === filtrosParaConsulta(PADRAO) ? filtrosPadrao() : atuais)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice])
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

  /** Uma prova por vez, ou todas: os OrtoQuestões Simulados da prova escolhida já vêm misturados. */
  function escolherArea(area: Area | 'todas') {
    const presentes = porArea?.map((p) => p.area) ?? AREAS_TREINO
    atualizar({ areas: area === 'todas' ? [...presentes] : [area], provas: [] })
  }
  /** De onde vêm as questões: tudo misturado (padrão), só das provas oficiais ou só os simulados. */
  function escolherOrigem(origem: 'tudo' | 'oficiais' | 'simulados') {
    atualizar({ soSimulados: origem === 'simulados', semSimulados: origem === 'oficiais' })
  }

  // Filtro que não tem nenhuma opção não vira campo vazio na tela.
  const temProva = gruposProva.length > 0
  // O convite dos simulados olha o acervo todo: hoje eles moram na categoria
  // Fellowship Quadril, e quem treina só ortopedia também precisa encontrá-los.
  const areasComSimulados = useMemo(() => (indice ? AREAS_TREINO.filter((a) => indice.questoes.some((q) => q.sim === 1 && (q.ar ?? 'base') === a)) : []), [indice])
  const simuladosAcervo = useMemo(() => (indice ? contar(indice, { ...FILTROS_VAZIOS, areas: AREAS_TREINO }, contexto).simulados : 0), [indice, contexto])
  const areasSimulado = useMemo(() => AREAS_TREINO.filter((a) => filtros.areas.includes(a) || areasComSimulados.includes(a)), [filtros.areas, areasComSimulados])
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

  const primeiroNome = String(conta?.user.user_metadata?.nome ?? '').trim().split(/\s+/)[0] ?? ''
  const rapidas: { titulo: string; icone: NomeIcone; quantidade: number; preset: Partial<Filtros> }[] = [
    { titulo: 'Revisar hoje', icone: 'calendario', quantidade: gerais?.porSituacao.revisarHoje ?? 0, preset: { situacao: 'revisarHoje' } },
    { titulo: 'Novas', icone: 'alvo', quantidade: gerais?.porSituacao.naoRespondidas ?? 0, preset: { situacao: 'naoRespondidas' } },
    { titulo: 'Que errei', icone: 'reiniciar', quantidade: gerais?.porSituacao.erradas ?? 0, preset: { situacao: 'erradas' } },
    { titulo: 'Favoritas', icone: 'estrela', quantidade: gerais?.porSituacao.favoritas ?? 0, preset: { situacao: 'favoritas' } },
  ]
  const [filtrosProvaAbertos, definirFiltrosProvaAbertos] = useState(
    () => filtros.provas.length + filtros.anos.length + filtros.dificuldades.length > 0 || filtros.soSimulados,
  )

  // Quantidade digitada: só limita ao total ao sair do campo (digitar "75" passava por "7").
  const [rascunhoQtd, definirRascunhoQtd] = useState<string | null>(null)

  /** Sessão de 10 num clique, sem passar pelos filtros. */
  async function sessaoRapida(preset: Partial<Filtros> = {}) {
    if (!indice) return
    const rapido: Filtros = { ...FILTROS_VAZIOS, areas: filtros.areas, embaralhar: true, limite: 10, ...preset }
    if (!(await iniciarComAviso(rapido, montarSessao(indice, rapido, Date.now(), contexto)))) return
    navegar('/sessao')
  }

  function atualizar(parcial: Partial<Filtros>) {
    definirFiltros((atuais) => ({ ...atuais, ...parcial }))
  }

  /** Recorte dos OrtoQuestões Simulados já no modo prova, levando ao formato. */
  function montarSimulado() {
    atualizar(areasSimulado.length === filtros.areas.length ? { soSimulados: true, semSimulados: false } : { soSimulados: true, semSimulados: false, areas: areasSimulado, provas: [] })
    definirSimulado(true)
    document.getElementById('tn-resumo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function comecar() {
    if (!indice || total === 0 || carregandoBusca) return
    const ids = montarSessao(indice, filtros, Date.now(), contexto)
    if (!(await iniciarComAviso(filtros, ids, simulado ? { simulado: true, limiteSegundos: minutos * 60 } : {}))) return
    navegar('/sessao')
  }

  function nomeTema(slug: string) { return indice?.temas.find((t) => t.slug === slug)?.nome ?? slug }
  /** "Joelho", "3 assuntos" ou a categoria inteira ("Ortopedia"). */
  function rotuloOQue(f: Filtros) {
    const n = f.temas.length + f.subtemas.length
    if (f.temas.length === 1 && !f.subtemas.length) return nomeTema(f.temas[0])
    if (!f.temas.length && f.subtemas.length === 1) return f.subtemas[0]
    if (n > 1) return `${n} assuntos`
    if (f.soSimulados) return 'Simulados'
    return f.areas.length > 2 ? `${f.areas.length} categorias` : f.areas.map((a) => AREA_CURTA[a]).join(' + ')
  }
  function rotuloFiltro(f: Filtros) {
    return [rotuloOQue(f), SITUACAO_CURTA[f.situacao], f.limite ?? 'todas'].join(' · ')
  }

  // Filtros salvos: a consulta da URL guarda tudo (assunto, situação, prova, quantidade…).
  const consultaAtual = filtrosParaConsulta(filtros)
  const salvoAtual = salvos.find((s) => s.consulta === consultaAtual)
  async function salvarFiltro() {
    if (salvoAtual || salvos.length >= MAXIMO_SALVOS) return
    const consultaGravada = consultaAtual
    const nome = (await pedirTexto({
      titulo: 'Salvar este filtro',
      texto: 'Dê um nome curto. Ele fica no topo do Treinar e refaz este filtro com um toque.',
      rotulo: 'Nome do filtro',
      valorInicial: rotuloFiltro(filtros).replace(/ · /g, ' '),
      sim: 'Salvar',
      obrigatorio: true,
      maximo: 40,
    }))?.trim()
    if (!nome) return
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    definirSalvos((atuais) => [...atuais.filter((s) => s.consulta !== consultaGravada), { id, nome, consulta: consultaGravada }])
  }
  function aplicarSalvo(salvo: FiltroSalvo) {
    comecouNoPadrao.current = false
    definirFiltros(semInexistentes(consultaParaFiltros(new URLSearchParams(salvo.consulta.replace(/^\?/, '')))))
  }
  async function renomearSalvo(salvo: FiltroSalvo) {
    const nome = (await pedirTexto({ titulo: 'Renomear filtro', rotulo: 'Nome do filtro', valorInicial: salvo.nome, sim: 'Renomear', obrigatorio: true, maximo: 40 }))?.trim()
    if (nome) definirSalvos((atuais) => atuais.map((s) => (s.id === salvo.id ? { ...s, nome } : s)))
  }
  async function apagarSalvo(salvo: FiltroSalvo) {
    if (!(await confirmar({ titulo: `Apagar o filtro "${salvo.nome}"?`, texto: 'Some só o atalho. Suas respostas e o filtro que está na tela continuam iguais.', sim: 'Apagar' }))) return
    definirSalvos((atuais) => atuais.filter((s) => s.id !== salvo.id))
  }

  /** "Salvar este filtro": no topo (quando já há salvos), nos 3 toques e na barra do computador. */
  function botaoSalvar(classe: string) {
    return (
      <button type="button" className={'botao botao--fantasma ' + classe} onClick={salvarFiltro} disabled={!!salvoAtual || salvos.length >= MAXIMO_SALVOS || !indice} title={salvoAtual ? `Salvo como "${salvoAtual.nome}"` : 'Guardar este filtro com um nome'}>
        <Icone nome={salvoAtual ? 'certo' : 'estrela'} tamanho={16} /> {salvoAtual ? 'Filtro salvo' : 'Salvar filtro'}
      </button>
    )
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
    filtros.soSimulados ? 'só simulados' : filtros.semSimulados ? 'só provas oficiais' : '',
    filtros.anos.length ? [...filtros.anos].sort((a, b) => b - a).join(', ') : 'todos os anos',
    filtros.dificuldades.length ? filtros.dificuldades.map((d) => ROTULO_DIFICULDADE[d].toLowerCase()).join(', ') : '',
  ].filter(Boolean).join(' · ')
  const opcoesAtivas = [filtros.comImagem, filtros.comComentario, filtros.incluirAnuladas, !filtros.embaralhar, !mostrarEtiquetas].filter(Boolean).length
  // Sempre as mesmas pílulas, no mesmo lugar: esconder as vazias fazia as outras mudarem de
  // posição a cada filtro. A vazia fica visível e desabilitada (com 0).
  const situacoesVisiveis = SITUACOES.filter((s) => !SITUACOES_TURMA.includes(s))

  // O botão de começar diz o que vai começar: "Responder 20 · Joelho · não respondidas".
  const escolha = `${rotuloOQue(filtros)} · ${SITUACAO_CURTA[filtros.situacao]}`
  const verbo = simulado ? 'Iniciar prova' : 'Responder'
  const rotuloComecar = total === 0 ? 'Ajuste os filtros' : `${verbo} ${quantidadeSessao} · ${escolha}`
  const conteudoComecar = total === 0 ? 'Ajuste os filtros' : (
    <>
      <span className="tr-comecar__verbo">{verbo} <span className="botao__contador">{quantidadeSessao}</span></span>
      <span className="tr-comecar__ponto" aria-hidden="true">·</span>
      <span className="tr-comecar__escolha">{escolha}</span>
    </>
  )

  const tambemValem = [
    nomesProva.join(', '),
    [...filtros.anos].sort((a, b) => b - a).join(', '),
    filtros.dificuldades.map((d) => ROTULO_DIFICULDADE[d].toLowerCase()).join(', '),
    filtros.busca.trim() ? `busca "${filtros.busca.trim()}"` : '',
    filtros.comImagem ? 'só com imagem' : '',
    filtros.comComentario ? 'só com comentário' : '',
    filtros.incluirAnuladas ? 'com anuladas' : '',
    filtros.embaralhar ? '' : 'na ordem da prova',
    simulado ? `modo prova, ${DURACOES.find(([v]) => v === minutos)?.[1] ?? `${minutos} min`}` : '',
  ].filter(Boolean)
  const comecarBotao = (classe: string) => (
    <button type="button" className={'botao botao--grande tr-comecar ' + classe} disabled={total === 0 || carregandoBusca} onClick={comecar} title={rotuloComecar} aria-label={rotuloComecar}>
      {conteudoComecar}
    </button>
  )
  const totalSituacao = contagens?.porSituacao[filtros.situacao] ?? 0
  const areasPresentes = porArea?.map((p) => p.area) ?? []
  const todasMarcadas = areasPresentes.length > 1 && areasPresentes.every((a) => filtros.areas.includes(a))
  const origem: 'tudo' | 'oficiais' | 'simulados' = filtros.soSimulados ? 'simulados' : filtros.semSimulados ? 'oficiais' : 'tudo'
  const nOrigem = { tudo: origemContagem?.total ?? 0, simulados: origemContagem?.simulados ?? 0, oficiais: (origemContagem?.total ?? 0) - (origemContagem?.simulados ?? 0) }
  const nomeArea = todasMarcadas ? 'Todas as provas' : filtros.areas.length === 1 ? ROTULO_AREA[filtros.areas[0]] : `${filtros.areas.length} provas`

  return (
    <div className="tn treinar-pagina">
      <section className="tn-heroi" aria-labelledby="tn-titulo">
        <div className="tn-heroi__texto">
          <p className="tr-heroi__selo">Montar sessão</p>
          <h1 id="tn-titulo">Treinar</h1>
          <p>{fraseTreinar(primeiroNome, Object.keys(contexto.respondidas).length, desempenhoAnterior, gerais?.porSituacao.revisarHoje ?? 0)}</p>
          <a className="tr-heroi__link" href={href('/cronograma')}>
            <Icone nome="rota" tamanho={15} />
            {cronograma.calculo?.hoje ? <>Hoje no cronograma: {cronograma.calculo.hoje.nome} · {cronograma.calculo.feitasHoje} de {cronograma.calculo.metaDiaria}</> : 'Prefere um plano pronto? Use o cronograma'}
          </a>
          {FLASHCARDS_NO_MENU && <a className="tr-heroi__link tn-heroi__link2" href={href('/flashcards/biblioteca')}><Icone nome="livro" tamanho={15} /> Estudar flashcards</a>}
        </div>
        <button type="button" className="botao tn-heroi__rapida" onClick={() => sessaoRapida()} disabled={!indice}>
          <Icone nome="raio" tamanho={20} />
          <span><strong>Sessão rápida</strong><small>10 questões de todo o acervo</small></span>
        </button>
        <div className="tn-heroi__atalhos" role="group" aria-label="Começar com 10">
          {rapidas.map((r) => (
            <button key={r.titulo} type="button" className="tn-vidro" disabled={r.quantidade === 0} onClick={() => sessaoRapida(r.preset)}>
              <Icone nome={r.icone} tamanho={16} />
              <span>{r.titulo}</span>
              <b className="tn-num">{r.quantidade.toLocaleString('pt-BR')}</b>
            </button>
          ))}
        </div>
      </section>

      {salvos.length > 0 && (
        <section className="tn-salvos" aria-labelledby="tn-salvos-titulo">
          <h2 id="tn-salvos-titulo" className="tn-rotulo"><Icone nome="filtro" tamanho={15} /> Seus filtros</h2>
          <ul className="tn-salvos__lista">
            {salvos.map((salvo) => (
              <li key={salvo.id} className="tn-salvo">
                <button type="button" className="tn-salvo__usar" aria-pressed={salvo.consulta === consultaAtual} onClick={() => aplicarSalvo(salvo)}>
                  <strong>{salvo.nome}</strong>
                  <small>{rotuloFiltro(consultaParaFiltros(new URLSearchParams(salvo.consulta.replace(/^\?/, ''))))}</small>
                </button>
                <button type="button" className="tn-salvo__acao" aria-label={`Renomear o filtro ${salvo.nome}`} title="Renomear" onClick={() => renomearSalvo(salvo)}><Icone nome="lapis" tamanho={15} /></button>
                <button type="button" className="tn-salvo__acao" aria-label={`Apagar o filtro ${salvo.nome}`} title="Apagar" onClick={() => apagarSalvo(salvo)}><Icone nome="lixeira" tamanho={15} /></button>
              </li>
            ))}
          </ul>
          {salvos.length >= MAXIMO_SALVOS && !salvoAtual && <p className="tn-nota">Chegou a {MAXIMO_SALVOS} filtros salvos: apague um para salvar outro.</p>}
          {!conta && <p className="tn-nota">Sem conta, os filtros salvos valem só enquanto esta aba estiver aberta.</p>}
        </section>
      )}

      {!conta && <p className="aviso-ia">Crie sua conta gratuita para guardar respostas, favoritos e revisões entre acessos e dispositivos. {fraseGratis('treinar')} <a href={href('/conta')}>Criar minha conta</a></p>}

      <div className="tn-grade">
        <div className="tn-montagem">
          {porArea && (
            <section className="tn-bloco" id="etapa-1" aria-labelledby="tn-prova-titulo">
              <header className="tn-bloco__cabeca">
                <span className="px-numero" aria-hidden="true">1</span>
                <div>
                  <h2 id="tn-prova-titulo">Para qual prova</h2>
                  <p>Os OrtoQuestões Simulados da prova escolhida já entram misturados com as questões oficiais.</p>
                </div>
              </header>
              <div className="tn-provas" role="radiogroup" aria-labelledby="tn-prova-titulo">
                {porArea.map(({ area, n }) => (
                  <button key={area} type="button" role="radio" className={`tn-prova tn-prova--${area}`} aria-checked={!todasMarcadas && filtros.areas.length === 1 && filtros.areas[0] === area} onClick={() => escolherArea(area)}>
                    <strong>{ROTULO_AREA[area]}</strong>
                    <small>{DESCRICAO_AREA[area]}</small>
                    <span className="tn-prova__n tn-num">{n.toLocaleString('pt-BR')} questões</span>
                  </button>
                ))}
                {porArea.length > 1 && (
                  <button type="button" role="radio" className="tn-prova tn-prova--todas" aria-checked={todasMarcadas} onClick={() => escolherArea('todas')}>
                    <strong>Todas as provas</strong>
                    <small>Ortopedia, R4, quadril e cirurgia da mão juntos</small>
                    <span className="tn-prova__n tn-num">{porArea.reduce((s, p) => s + p.n, 0).toLocaleString('pt-BR')} questões</span>
                  </button>
                )}
              </div>
              {(origemContagem?.simulados ?? 0) > 0 && (
                <div className="tn-origem">
                  <span className="tn-origem__rotulo" id="tn-origem-titulo">De onde vêm as questões</span>
                  <div className="tn-segmentos" role="radiogroup" aria-labelledby="tn-origem-titulo">
                    {([
                      ['tudo', 'Provas + OrtoQuestões Simulados'],
                      ['oficiais', 'Só das provas oficiais'],
                      ['simulados', 'Só OrtoQuestões Simulados'],
                    ] as const).map(([valor, rotulo]) => (
                      <button key={valor} type="button" role="radio" className="tn-segmento" aria-checked={origem === valor} disabled={nOrigem[valor] === 0 && origem !== valor} onClick={() => escolherOrigem(valor)}>
                        <span>{rotulo}</span>
                        <small className="tn-num">{nOrigem[valor].toLocaleString('pt-BR')}</small>
                      </button>
                    ))}
                  </div>
                  <p className="tn-nota">OrtoQuestões Simulados são questões autorais do site, feitas por engenharia reversa das provas e comentadas. Não são questões oficiais.</p>
                </div>
              )}
            </section>
          )}

          <section className="tn-bloco" id="etapa-assunto" aria-labelledby="tn-assunto-titulo">
            <header className="tn-bloco__cabeca">
              <span className="px-numero" aria-hidden="true">2</span>
              <div>
                <h2 id="tn-assunto-titulo">Assunto</h2>
                <p>{selecionados ? `${selecionados} ${selecionados === 1 ? 'escolhido' : 'escolhidos'}. Toque de novo para desmarcar.` : 'Sem marcar nenhum, entram todos. Abra um tema para escolher subtemas.'}</p>
              </div>
            </header>
            <div className="tr-busca tn-busca">
              <Icone nome="busca" tamanho={18} />
              <label className="so-leitor" htmlFor="busca-acervo">Buscar no texto das questões</label>
              <input id="busca-acervo" className="entrada" type="search" name="busca" autoComplete="off" placeholder="Palavra no enunciado: Salter-Harris, Weber, manguito…" value={buscaDigitada} onChange={(e) => definirBuscaDigitada(e.target.value)} />
            </div>
            {carregandoTextos && <span className="campo__auxilio">Carregando o texto das questões…</span>}
            <SeletorArvore
              variante="lista"
              arvore={arvore}
              temas={filtros.temas}
              subtemas={filtros.subtemas}
              porTema={contagens?.porTema ?? {}}
              porSubtema={contagens?.porSubtema ?? {}}
              aoMudar={(temas, subtemas) => atualizar({ temas, subtemas })}
            />
            <a className="tn-incidencia" href={href('/temas-que-mais-caem')}>
              <Icone nome="grafico" tamanho={16} />
              <span>Não sabe por onde começar? <b>Veja os temas que mais caem</b></span>
              {!premium && <SeloAssinante />}
            </a>
          </section>

          <section className="tn-bloco" id="etapa-2" aria-labelledby="tn-quais-titulo">
            <header className="tn-bloco__cabeca">
              <span className="px-numero" aria-hidden="true">3</span>
              <div>
                <h2 id="tn-quais-titulo">Quais questões</h2>
                <p>{DESCRICAO_SITUACAO[filtros.situacao]}</p>
              </div>
            </header>
            <div className="tr-pilulas" id="filtro-situacao">
              {situacoesVisiveis.map((situacao) => (
                <button key={situacao} type="button" className="tr-pilula" aria-pressed={filtros.situacao === situacao}
                  disabled={situacao !== 'todas' && situacao !== filtros.situacao && (contagens?.porSituacao[situacao] ?? 0) === 0}
                  onClick={() => atualizar({ situacao })}>
                  {ROTULO_SITUACAO[situacao]}
                  <span className="numerico">{contagens?.porSituacao[situacao] ?? 0}</span>
                </button>
              ))}
            </div>
            <div className="tn-turma" role="group" aria-labelledby="tn-turma-titulo">
              <p className="tn-turma__titulo" id="tn-turma-titulo"><Icone nome="grupo" tamanho={16} /> Pelo que a turma responde <SeloAssinante /></p>
              <div className="tr-pilulas">
                {SITUACOES_TURMA.map((situacao) => (
                  <button key={situacao} type="button" className={'tr-pilula tr-pilula--turma' + (semTurma ? ' tr-pilula--bloqueada' : '')} aria-pressed={filtros.situacao === situacao}
                    onClick={() => semTurma ? definirConviteTurma(true) : atualizar({ situacao: filtros.situacao === situacao ? 'todas' : situacao })}>
                    {semTurma && <Icone nome="cadeado" tamanho={14} />}
                    {ROTULO_SITUACAO[situacao]}
                    {!semTurma && !turmaFalhou && <span className="numerico">{contexto.turma ? contagens?.porSituacao[situacao] ?? 0 : '…'}</span>}
                  </button>
                ))}
              </div>
              {!semTurma && turmaFalhou && <p className="tn-nota">Não foi possível carregar agora como a turma respondeu. Tente de novo mais tarde.</p>}
              {conviteTurma && semTurma && (
                <ConvitePremium variante="faixa" icone="grupo" titulo="Estude pelo que a turma erra"
                  texto={<p>Monte sessões com as questões que a maioria erra de primeira e com as que quase todo mundo acerta, mas você errou. Depois de cada resposta, veja quantos marcaram cada alternativa.</p>} />
              )}
            </div>
            {(SITUACOES_TURMA.includes(filtros.situacao) && contexto.turma && totalSituacao === 0) || filtros.situacao === 'favoritas' || filtros.situacao === 'revisarHoje' ? (
              <p className="tn-nota">
                {SITUACOES_TURMA.includes(filtros.situacao) && contexto.turma && totalSituacao === 0 && 'Ainda não há questões assim no seu recorte: a turma precisa de pelo menos 3 respostas por questão. '}
                {filtros.situacao === 'favoritas' && <a href={href('/favoritas')}>Ver a lista das favoritas</a>}
                {filtros.situacao === 'revisarHoje' && <a href={href('/revisao')}>Ajustar o ritmo da revisão</a>}
              </p>
            ) : null}
          </section>

          <details className="tn-bloco tn-mais" id="etapa-3" open={filtrosProvaAbertos} onToggle={(e) => definirFiltrosProvaAbertos((e.currentTarget as HTMLDetailsElement).open)}>
            <summary className="tn-bloco__cabeca tn-mais__cabeca">
              <span className="px-numero" aria-hidden="true">4</span>
              <span className="tn-mais__texto">
                <h2>Mais filtros <small className="tn-opcional">opcional</small>{opcoesAtivas > 0 && <span className="tn-mais__ativas">{opcoesAtivas} {opcoesAtivas === 1 ? 'opção' : 'opções'}</span>}</h2>
                <p>{resumoProva}</p>
              </span>
              <Icone nome="baixo" tamanho={18} />
            </summary>
            <div className="tn-mais__corpo">
              {temProva && (
                <div className="tr-grupo">
                  <span className="tr-grupo__rotulo">Prova de origem</span>
                  <div className="tr-pilulas">
                    {gruposProva.map((grupo) => {
                      const marcado = grupo.provas.some((p) => filtros.provas.includes(p))
                      const quantidade = grupo.provas.reduce((soma, p) => soma + (contagens?.porProva[p] ?? 0), 0)
                      // Provas que a prova escolhida não traz (ex.: as da mão em ortopedia) somem da lista.
                      if (!marcado && provasDoFoco && !grupo.provas.some((p) => provasDoFoco.has(p))) return null
                      return (
                        <button key={grupo.rotulo} type="button" className="tr-pilula" aria-pressed={marcado}
                          title={grupo.rotulo === 'TEOT/TARO' ? 'TEOT ou TARO: questões com a prova de origem ainda a confirmar' : grupo.rotulo === 'SIMÃO' ? 'OrtoQuestões Simulados no padrão do SIMÃO, o simulado do exame de título de especialista em cirurgia da mão' : undefined}
                          onClick={() => atualizar({ provas: marcado ? filtros.provas.filter((x) => !grupo.provas.includes(x)) : [...filtros.provas, ...grupo.provas.filter((p) => !filtros.provas.includes(p))] })}>
                          {grupo.rotulo}
                          <span className="numerico">{quantidade}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {temAno && (
                <div className="tr-grupo">
                  <span className="tr-grupo__rotulo">Ano</span>
                  <div className="tr-pilulas">
                    {[...(indice?.anos ?? [])].sort((a, b) => b - a).map((ano) => (
                      <button key={ano} type="button" className="tr-pilula" aria-pressed={filtros.anos.includes(ano)}
                        onClick={() => atualizar({ anos: filtros.anos.includes(ano) ? filtros.anos.filter((x) => x !== ano) : [...filtros.anos, ano] })}>
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
                      <button key={d} type="button" className="tr-pilula" aria-pressed={filtros.dificuldades.includes(d)}
                        onClick={() => atualizar({ dificuldades: filtros.dificuldades.includes(d) ? filtros.dificuldades.filter((x) => x !== d) : [...filtros.dificuldades, d] })}>
                        {ROTULO_DIFICULDADE[d]}
                        <span className="numerico">{contagens?.porDificuldade[d] ?? 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="tr-grupo">
                <span className="tr-grupo__rotulo">Opções</span>
                <div className="tn-opcoes">
                  {temImagem && <label className="caixa"><input type="checkbox" checked={filtros.comImagem} onChange={(e) => atualizar({ comImagem: e.target.checked })} /><span>Só questões com imagem no enunciado</span></label>}
                  {temComentario && <label className="caixa"><input type="checkbox" checked={filtros.comComentario} onChange={(e) => atualizar({ comComentario: e.target.checked })} /><span>Só questões com comentário</span></label>}
                  {temAnulada && <label className="caixa"><input type="checkbox" checked={filtros.incluirAnuladas} onChange={(e) => atualizar({ incluirAnuladas: e.target.checked })} /><span>Incluir questões anuladas (não contam no desempenho)</span></label>}
                  <label className="caixa"><input type="checkbox" checked={filtros.embaralhar} onChange={(e) => atualizar({ embaralhar: e.target.checked })} /><span>Embaralhar a ordem</span></label>
                  <label className="caixa">
                    <input type="checkbox" checked={!mostrarEtiquetas} onChange={(e) => definirEtiquetas(!e.target.checked)} />
                    <span>
                      Esconder as etiquetas de assunto até responder
                      <span className="campo__auxilio tn-opcoes__ajuda">Ler "Salter-Harris" antes do enunciado já elimina metade das alternativas. Vale para todas as sessões e dá para trocar no meio, pela tecla E.</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
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
        </div>

        <aside className="tn-resumo" id="tn-resumo" aria-labelledby="tn-resumo-titulo">
          <div className="tn-bilhete">
            <header className="tn-bilhete__cabeca">
              <p className="tr-heroi__selo" id="tn-resumo-titulo">Sua sessão</p>
              <p className="tn-bilhete__total"><strong className="tn-num">{total === 0 ? 0 : quantidadeSessao}</strong> {quantidadeSessao === 1 ? 'questão' : 'questões'}</p>
              <dl className="tn-bilhete__dados">
                <div><dt>Prova</dt><dd>{nomeArea}</dd></div>
                <div><dt>Origem</dt><dd>{origem === 'tudo' ? 'Provas + Simulados' : origem === 'oficiais' ? 'Só provas oficiais' : 'Só Simulados'}</dd></div>
                <div><dt>Assunto</dt><dd>{selecionados ? rotuloOQue(filtros) : 'Todos'}</dd></div>
                <div><dt>Quais</dt><dd>{ROTULO_SITUACAO[filtros.situacao]}</dd></div>
                {total > 0 && <div><dt>Tempo</dt><dd>cerca de {estimativaMinutos} min</dd></div>}
                {desempenhoAnterior !== null && <div><dt>Seu acerto</dt><dd className="tn-num">{desempenhoAnterior}%</dd></div>}
              </dl>
            </header>

            <div className="tn-bilhete__grupo">
              <span className="tn-bilhete__rotulo" id="tn-quantas">Quantas</span>
              <div className="tn-quantas" role="group" aria-labelledby="tn-quantas" id="filtro-limite">
                {LIMITES.map((n) => (
                  <button key={n} type="button" className="tn-vidro tn-vidro--quadrado" aria-pressed={filtros.limite === n} disabled={total < n && filtros.limite !== n} onClick={() => atualizar({ limite: n })}>{n}</button>
                ))}
                <button type="button" className="tn-vidro tn-vidro--quadrado" aria-pressed={filtros.limite === null} onClick={() => atualizar({ limite: null })}>Todas</button>
                <label className="tn-outra">
                  <span className="so-leitor">Quantidade personalizada</span>
                  <input className="entrada" type="number" min="1" step="1" max={Math.max(total, 1)} value={rascunhoQtd ?? (filtros.limite !== null && !LIMITES.includes(filtros.limite) ? filtros.limite : '')} placeholder="Outra" onChange={(e) => definirRascunhoQtd(e.target.value)} onBlur={() => { if (rascunhoQtd === null) return; const n = Math.floor(Number(rascunhoQtd)); atualizar({ limite: rascunhoQtd && n > 0 ? Math.max(1, Math.min(total || 1, n)) : null }); definirRascunhoQtd(null) }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
                </label>
              </div>
            </div>

            <div className="tn-bilhete__grupo">
              <span className="tn-bilhete__rotulo" id="tn-modo">Como</span>
              <div className="tn-modos" role="radiogroup" aria-labelledby="tn-modo">
                <button type="button" role="radio" aria-checked={!simulado} className="tn-modo" onClick={() => definirSimulado(false)}>
                  <Icone nome="livro" tamanho={18} />
                  <span><strong>Estudo</strong><small>Comentário a cada resposta</small></span>
                </button>
                <button type="button" role="radio" aria-checked={simulado} className="tn-modo" onClick={() => definirSimulado(true)}>
                  <Icone nome="relogio" tamanho={18} />
                  <span><strong>Prova</strong><small>Cronômetro e gabarito no fim</small></span>
                </button>
              </div>
              {simulado && (
                <div className="tn-quantas" id="filtro-duracao" role="group" aria-label="Tempo de prova">
                  {DURACOES.map(([valor, rotulo]) => (
                    <button key={valor} type="button" className="tn-vidro" aria-pressed={minutos === valor} onClick={() => definirMinutos(valor)}>{rotulo}</button>
                  ))}
                </div>
              )}
            </div>

            {tambemValem.length > 0 && (
              <ul className="tn-valem" aria-label="Filtros que também valem">
                {tambemValem.map((t) => <li key={t}>{t}</li>)}
              </ul>
            )}

            {comecarBotao('tn-bilhete__comecar')}

            <div className="tn-bilhete__acoes">
              {botaoSalvar('tn-bilhete__acao')}
              <button type="button" className="botao botao--fantasma tn-bilhete__acao" title="Voltar ao padrão: Ortopedia, não respondidas, 20" onClick={() => definirFiltros(filtrosPadrao())}>
                <Icone nome="reiniciar" tamanho={16} /> Limpar
              </button>
            </div>
          </div>

          {simuladosAcervo > 0 && (
            <section className="tn-simulados" aria-labelledby="tn-simulados-titulo">
              <h2 id="tn-simulados-titulo">Treinar como prova</h2>
              <p>Uma prova inteira só com OrtoQuestões Simulados, com cronômetro e gabarito no fim.</p>
              <div className="tn-simulados__acoes">
                <button type="button" className="botao botao--fantasma" onClick={montarSimulado}><Icone nome="relogio" tamanho={16} /> Montar a prova</button>
                <button type="button" className="botao botao--fantasma" onClick={() => sessaoRapida({ soSimulados: true, areas: areasSimulado })}><Icone nome="raio" tamanho={16} /> 10 simulados</button>
              </div>
            </section>
          )}
        </aside>
      </div>

      <div className="tn-barra" role="region" aria-label="Começar a sessão">
        <p className="tn-barra__resumo">
          <strong>{total === 0 ? 'Nenhuma questão' : <><span className="tn-num">{quantidadeSessao}</span> {quantidadeSessao === 1 ? 'questão' : 'questões'}</>}</strong>
          {total > 0 && <span>cerca de {estimativaMinutos} min · {simulado ? 'prova' : 'estudo'}</span>}
        </p>
        {comecarBotao('tn-barra__comecar')}
      </div>
    </div>
  )
}

/** Frase do topo: o primeiro nome e o que os dados da pessoa dizem, no tom dos e-mails. */
function fraseTreinar(nome: string, respondidas: number, acerto: number | null, revisarHoje: number): string {
  const abertura = nome ? `${nome}, ` : ''
  if (revisarHoje >= 10) return `${abertura}${revisarHoje.toLocaleString('pt-BR')} questões estão no ponto de revisão hoje. Comece por elas ou monte a sua sessão.`
  if (respondidas >= 10 && acerto !== null && acerto >= 50) return `${abertura}você já respondeu ${respondidas.toLocaleString('pt-BR')} questões e acerta ${acerto}%. Bora para a próxima sessão?`
  if (respondidas >= 10) return `${abertura}você já respondeu ${respondidas.toLocaleString('pt-BR')} questões. Cada uma deixa a próxima mais fácil.`
  return nome ? `${nome}, escolha a prova, o assunto e quais questões. Ou comece agora com 10.` : 'Escolha a prova, o assunto e quais questões. Ou comece agora com 10.'
}

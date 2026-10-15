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
/** "Montar em 3 toques": as situações e quantidades mais usadas, sem rolar a página. */
const SITUACOES_RAPIDAS: Situacao[] = ['naoRespondidas', 'todas', 'erradas', 'revisarHoje']
const QUANTIDADES_RAPIDAS = [10, 20, 30, 50]
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
  const rotuloCronograma = cronograma.calculo ? 'Seguir o cronograma' : 'Montar meu cronograma'
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
  // "Quais questões" vem aberto também no celular: fechado, quem não percebia o <details>
  // treinava "Todas" sem saber que dava para escolher só as novas ou as erradas.
  const [situacaoAberta, definirSituacaoAberta] = useState(true)
  const [formatoAberto, definirFormatoAberto] = useState(telaLarga)
  // Girar o tablet ou alargar a janela abre os passos que no celular ficam recolhidos.
  useEffect(() => {
    const largura = window.matchMedia('(min-width: 52rem)')
    const aoMudar = () => { if (largura.matches) { definirSituacaoAberta(true); definirFormatoAberto(true) } }
    largura.addEventListener('change', aoMudar)
    return () => largura.removeEventListener('change', aoMudar)
  }, [])
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
    atualizar(areasSimulado.length === filtros.areas.length ? { soSimulados: true } : { soSimulados: true, areas: areasSimulado, provas: [] })
    definirSimulado(true)
    definirFiltrosProvaAbertos(true)
    definirFormatoAberto(true)
    document.getElementById('etapa-formato')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function comecar() {
    if (!indice || total === 0 || carregandoBusca) return
    const ids = montarSessao(indice, filtros, Date.now(), contexto)
    if (!(await iniciarComAviso(filtros, ids, simulado ? { simulado: true, limiteSegundos: minutos * 60 } : {}))) return
    navegar('/sessao')
  }

  /** Rola até um passo e o abre se estiver recolhido (botão, não âncora: as rotas usam o #). */
  function irPara(alvo: string) {
    if (alvo === 'etapa-2') definirSituacaoAberta(true)
    if (alvo === 'etapa-3') definirFiltrosProvaAbertos(true)
    if (alvo === 'etapa-formato') definirFormatoAberto(true)
    window.requestAnimationFrame(() => document.getElementById(alvo)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
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
    filtros.soSimulados ? 'só simulados' : '',
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

  // Montar em 3 toques: O que · Quais · Quantas. O que mais estiver valendo aparece escrito.
  const valorTema = selecionados === 0 ? '' : filtros.temas.length === 1 && !filtros.subtemas.length ? filtros.temas[0] : '__varios'
  const temasDaCategoria = arvore.filter((t) => (gerais?.porTema[t.slug] ?? 0) > 0 || filtros.temas.includes(t.slug))
  const totalTodosTemas = Object.values(contagens?.porTema ?? {}).reduce((soma, n) => soma + n, 0)
  const situacoesTres = SITUACOES_RAPIDAS.includes(filtros.situacao) ? SITUACOES_RAPIDAS : [...SITUACOES_RAPIDAS, filtros.situacao]
  const quantidadesTres = filtros.limite === null || QUANTIDADES_RAPIDAS.includes(filtros.limite) ? QUANTIDADES_RAPIDAS : [...QUANTIDADES_RAPIDAS, filtros.limite].sort((a, b) => a - b)
  const tambemValem = [
    nomesProva.join(', '),
    filtros.soSimulados && selecionados ? 'só simulados' : '',
    [...filtros.anos].sort((a, b) => b - a).join(', '),
    filtros.dificuldades.map((d) => ROTULO_DIFICULDADE[d].toLowerCase()).join(', '),
    filtros.busca.trim() ? `busca "${filtros.busca.trim()}"` : '',
    filtros.comImagem ? 'só com imagem' : '',
    filtros.comComentario ? 'só com comentário' : '',
    filtros.incluirAnuladas ? 'com anuladas' : '',
    filtros.embaralhar ? '' : 'na ordem da prova',
    simulado ? `modo prova, ${DURACOES.find(([v]) => v === minutos)?.[1] ?? `${minutos} min`}` : '',
  ].filter(Boolean)
  return (
    <div className="empilha-2 treinar-pagina">
      <section className="tr-heroi">
        <div className="tr-heroi__texto">
          <p className="tr-heroi__selo">Montar sessão</p>
          <h1>Treinar</h1>
          <p>Escolha o que estudar, quais questões, e quantas. Sem tempo? Comece já com 10.</p>
          {FLASHCARDS_NO_MENU && (
            <span className="tr-heroi__flashcards">
              <a className="tr-heroi__link tr-heroi__link--flashcards" href={href('/flashcards/biblioteca')}><Icone nome="livro" tamanho={15} /> Estudar flashcards</a>
              <a className="tr-heroi__link tr-heroi__link--flashcards" href={href('/flashcards/cripta')}><Icone nome="raio" tamanho={15} /> Jogar o Torneio</a>
              <a className="tr-heroi__link" href={href('/flashcards')}>Central de flashcards (beta)</a>
            </span>
          )}
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

      {salvos.length > 0 && <section className="tr-salvos" aria-labelledby="tr-salvos-titulo">
        <div className="tr-salvos__cabeca">
          <h2 id="tr-salvos-titulo"><Icone nome="filtro" tamanho={16} /> Seus filtros salvos</h2>
          {botaoSalvar('tr-salvos__salvar')}
        </div>
        <ul className="tr-salvos__lista">
          {salvos.map((salvo) => (
            <li key={salvo.id} className="tr-salvo">
              <button type="button" className="tr-salvo__usar" aria-pressed={salvo.consulta === consultaAtual} onClick={() => aplicarSalvo(salvo)}>
                <strong>{salvo.nome}</strong>
                <small>{rotuloFiltro(consultaParaFiltros(new URLSearchParams(salvo.consulta.replace(/^\?/, ''))))}</small>
              </button>
              <button type="button" className="tr-salvo__acao" aria-label={`Renomear o filtro ${salvo.nome}`} title="Renomear" onClick={() => renomearSalvo(salvo)}><Icone nome="lapis" tamanho={16} /></button>
              <button type="button" className="tr-salvo__acao" aria-label={`Apagar o filtro ${salvo.nome}`} title="Apagar" onClick={() => apagarSalvo(salvo)}><Icone nome="lixeira" tamanho={16} /></button>
            </li>
          ))}
        </ul>
        {salvos.length >= MAXIMO_SALVOS && !salvoAtual && <p className="tr-salvos__vazio">Chegou a {MAXIMO_SALVOS} filtros salvos: apague um para salvar outro.</p>}
        {!conta && <p className="tr-salvos__vazio">Sem conta, os filtros salvos valem só enquanto esta aba estiver aberta.</p>}
      </section>}

      <section className="tr-tres" aria-labelledby="tr-tres-titulo">
        <header className="tr-tres__cabeca">
          <h2 id="tr-tres-titulo">Montar em 3 toques</h2>
          <p>O que, quais e quantas. Já vem no padrão: é só tocar em responder.</p>
        </header>
        <div className="tr-tres__linha">
          <label className="tr-tres__rotulo" htmlFor="tr-tres-tema"><b>1</b> O que</label>
          <select
            id="tr-tres-tema"
            className="entrada tr-tres__tema"
            value={valorTema}
            onChange={(e) => { if (e.target.value !== '__varios') atualizar({ temas: e.target.value ? [e.target.value] : [], subtemas: [] }) }}
          >
            {valorTema === '__varios' && <option value="__varios" disabled>{rotuloOQue(filtros)} (escolhidos abaixo)</option>}
            <option value="">{rotuloOQue({ ...filtros, temas: [], subtemas: [] })} · todos os temas ({totalTodosTemas})</option>
            {temasDaCategoria.map((t) => {
              const n = contagens?.porTema[t.slug] ?? 0
              return <option key={t.slug} value={t.slug} disabled={n === 0 && valorTema !== t.slug}>{t.nome} ({n})</option>
            })}
          </select>
        </div>
        <div className="tr-tres__linha">
          <span className="tr-tres__rotulo" id="tr-tres-quais"><b>2</b> Quais</span>
          <div className="tr-pilulas" role="group" aria-labelledby="tr-tres-quais">
            {situacoesTres.map((situacao) => (
              <button
                key={situacao}
                type="button"
                className="tr-pilula"
                aria-pressed={filtros.situacao === situacao}
                disabled={situacao !== 'todas' && situacao !== filtros.situacao && (contagens?.porSituacao[situacao] ?? 0) === 0}
                onClick={() => atualizar({ situacao })}
              >
                {ROTULO_SITUACAO[situacao]}
                <span className="numerico">{contagens?.porSituacao[situacao] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="tr-tres__linha">
          <span className="tr-tres__rotulo" id="tr-tres-quantas"><b>3</b> Quantas</span>
          <div className="tr-pilulas" role="group" aria-labelledby="tr-tres-quantas">
            {quantidadesTres.map((n) => (
              <button key={n} type="button" className="tr-pilula" aria-pressed={filtros.limite === n} disabled={total < n && filtros.limite !== n} onClick={() => atualizar({ limite: n })}>{n}</button>
            ))}
            <button type="button" className="tr-pilula" aria-pressed={filtros.limite === null} onClick={() => atualizar({ limite: null })}>Todas</button>
          </div>
        </div>
        {tambemValem.length > 0 && (
          <p className="tr-tres__extras"><Icone nome="filtro" tamanho={15} /> <span>Também valem: <b>{tambemValem.join(' · ')}</b>.</span></p>
        )}
        <div className="tr-tres__acoes">
          <button type="button" className="botao botao--principal botao--grande tr-comecar" disabled={total === 0 || carregandoBusca} onClick={comecar} title={rotuloComecar} aria-label={rotuloComecar}>
            {conteudoComecar}
          </button>
          <div className="tr-tres__secundarias">
            <button type="button" className="botao botao--fantasma tr-tres__mais" onClick={() => irPara('etapa-1')}>Ajustar mais <Icone nome="baixo" tamanho={16} /></button>
            {botaoSalvar('tr-tres__salvar')}
          </div>
        </div>
      </section>

      <nav className="tr-trilha" aria-label="Passos para montar a sessão">
        {[
          ['etapa-1', 'O que estudar', selecionados ? `${selecionados} ${selecionados === 1 ? 'assunto' : 'assuntos'}` : 'todos os assuntos'],
          ['etapa-2', 'Quais questões', ROTULO_SITUACAO[filtros.situacao]],
          ['etapa-3', 'Filtrar mais', 'opcional'],
          ['etapa-formato', 'Quantas e como', `${filtros.limite ?? 'todas'} · ${simulado ? 'prova' : 'estudo'}`],
        ].map(([alvo, titulo, resumo], i) => (
          <button key={alvo} type="button" className="tr-trilha__passo" onClick={() => irPara(alvo)}>
            <b>{i + 1}</b><span><strong>{titulo}</strong><small>{resumo}</small></span>
          </button>
        ))}
      </nav>

      {!conta && <p className="aviso-ia">Crie sua conta gratuita para guardar respostas, favoritos e revisões entre acessos e dispositivos. {fraseGratis('treinar')} <a href={href('/conta')}>Criar minha conta</a></p>}

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
            value={buscaDigitada}
            onChange={(e) => definirBuscaDigitada(e.target.value)}
          />
        </div>
        {carregandoTextos && <span className="campo__auxilio">Carregando o texto das questões…</span>}
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
              disabled={situacao !== 'todas' && situacao !== filtros.situacao && (contagens?.porSituacao[situacao] ?? 0) === 0}
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
              <input className="entrada" type="number" min="1" step="1" max={Math.max(total, 1)} value={rascunhoQtd ?? filtros.limite ?? ''} placeholder="Outra" onChange={(e) => definirRascunhoQtd(e.target.value)} onBlur={() => { if (rascunhoQtd === null) return; const n = Math.floor(Number(rascunhoQtd)); atualizar({ limite: rascunhoQtd && n > 0 ? Math.max(1, Math.min(total || 1, n)) : null }); definirRascunhoQtd(null) }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
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
        {botaoSalvar('tr-barra__salvar')}
        <button type="button" className="botao botao--fantasma tr-barra__limpar" title="Voltar ao padrão: Ortopedia, não respondidas, 20" onClick={() => definirFiltros(filtrosPadrao())}>Limpar</button>
        <button type="button" className="botao botao--principal botao--grande tr-comecar" disabled={total === 0 || carregandoBusca} onClick={comecar} title={rotuloComecar} aria-label={rotuloComecar}>
          {conteudoComecar}
        </button>
      </div>
    </div>
  )
}

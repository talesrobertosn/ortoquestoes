import { PassagemNatal } from '../natal/PassagemNatal'
import { DATA_TEOT } from '../dados/calendarioProvas'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { conferirMetaCronograma } from '../conta/feitos'
import { chamarRpc, codigoErro } from '../servicos/supabase'
import { enviarMarcas, guardarAdiantamento, marcarAvisoSimulados, obterPlano, trocarSimulados, opcoesComAdiantamento, salvarOpcoes, salvarPlano, usarPlanoSalvo } from '../conta/cronograma'
import { NovidadeSimulados } from '../componentes/NovidadeSimulados'
import { usarPremium } from '../conta/premium'
import { usarConta } from '../conta/ContextoConta'
import {  marcarAvisoNaConta } from '../conta/avisosVistos'
import { usarIndice } from '../dados/usarIndice'
import { FILTROS_VAZIOS, type Indice } from '../dados/tipos'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { lerHistorico, usarSessao } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { acervoDoPlano, type AcervoPlano, alternarData, type AjusteDia, cotaRevisoesDaMeta, revisoesExtrasDoDia, revisoesNaMetaAtivas, entraNoPlano, calcularPlano, diasAte, idsDaSessaoDoDia, idsDoDiaPlano, idsParaPuxar, incluiSimulados, indiceDoPlano, marcarReservadas, opcoesComPuxado,  opcoesDe,  type OpcoesPlano, respondidasNoAcervo, ROTULO_INTENSIDADE, type CalculoPlano, type Intensidade, type PlanoSalvo, type RevisaoNoCronograma } from '../dados/planoEstudo'
import { areasDoDiaRevisao, TAMANHO_DIAGNOSTICO, calcularConstancia, contagemSimulados, contarErrosQueImportam, desempenhoPorArea, elogio, idsAquecimentoVespera, idsDiagnostico, idsErrosQueImportam, idsReativar, idsRevisaoForte, idsMiniSimulado, mapaDeRisco, minutosPorQuestao, pontosCegos, prontidaoPorArea, temasEsquecidos, formatarTempo } from '../dados/hubCronograma'
import { idsDoFoco, posicaoDaArea, type AreaIncidencia, type Foco } from '../dados/incidencia'
import { idsRevisaoHoje } from '../estado/planoRevisao'
import { usarRitmoRevisao } from '../estado/preferencias'
import {       HojeRetaFinal } from './CronogramaHub'
import { VisaoCronograma } from './CronogramaVisao'
export { VisaoCronograma }
import { ConviteFicticio,  type MotivoConvite } from './CronogramaFicticio'
import { CenaTorre } from '../componentes/cronograma/CenaTorre'
import { vistaDoCronograma } from '../dados/vistaCronograma'
import { CONTEXTO_VAZIO, montarSessao } from '../dados/acervo'
import '../estilos/paginas/CronogramaPainel.css'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import {  navegar } from '../util/rotas'
import '../estilos/paginas/PlanoEstudo.css'
import '../estilos/paginas/Cronograma.css'
import '../estilos/paginas/CronogramaTorre.css'
import '../estilos/componentes/Cristal.css'
import { usarDiaAtual } from '../util/usarDiaAtual'
import { chaveCivil, chaveDoDia, diaCivil, hojeBR, inicioDaChave, somarDias } from '../util/dia'
import { CHAVE_RESUMAO_HOJE,  RESUMAO_HOJE_VAZIO, type ResumaoHoje } from '../estado/resumaoLido'
import { juntarMarcas, marcasDoPlano, opcoesComMarcas, type MarcasDia } from '../conta/marcasDia'
import { ler } from '../estado/armazenamento'
import { IndicadorSincronia } from '../componentes/IndicadorSincronia'

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const PROVAS = ['TEOT', 'TARO', 'ENARE R4', 'Outra prova']
/** Próxima prova teórica do TEOT e do TEPOT: vem preenchida por padrão. */
// A data também é usada pelos lembretes discretos de véspera.
/** Semanas que o não assinante vê na prévia do próprio cronograma. */
type Respondidas = Record<string, RegistroQuestao>

/** Amanhã no dia de São Paulo (src/util/dia.ts). */
function amanhaIso() {
  return somarDias(hojeBR(), 1)
}

/**
 * Cronograma até a prova. O assinante salva e segue o dele; quem não assina
 * pode preencher a data e ver a prévia do próprio cronograma (hoje e as duas
 * primeiras semanas), com o resto guardado.
 */
/**
 * Só no ambiente de desenvolvimento: #/cronograma?demo=1 mostra o painel do assinante com um plano de exemplo.
 * O mesmo plano e as mesmas respostas de exemplo alimentam, em produção, o cenário fictício de quem não
 * assina (pedido do Tales, 19/10/2026): o painel inteiro, só a semana no calendário, nada gravado.
 */
const DEMO = import.meta.env.DEV && typeof location !== 'undefined' && location.hash.includes('demo=1')
const planoDemo = (): PlanoSalvo => {
  const criado = new Date(); criado.setDate(criado.getDate() - 6)
  // demoProva=AAAA-MM-DD (só em desenvolvimento): ver a reta final, o modo prova e a véspera.
  const prova = (DEMO ? location.hash.match(/demoProva=(\d{4}-\d{2}-\d{2})/)?.[1] : null) ?? DATA_TEOT
  return { data_prova: prova, intensidade: 'firme', folgas: [0], prova: 'TEOT', base_respondidas: 0, criado_em: criado.toISOString(), incluir_simulados: true, opcoes: { diasLeves: [3], qtdLeve: 15 } }
}

/** Respostas de exemplo do modo demo: ~50 por dia nos últimos dias, 70% de acerto, nas duas primeiras áreas do plano. */
function respondidasDemo(indice: Indice): Respondidas {
  const r: Respondidas = {}
  const temas = ['trauma', 'pediatria'].map((slug) => indice.temas.findIndex((t) => t.slug === slug))
  const alvos = indice.questoes.filter((q) => !q.dup && !q.ar && q.an !== 1 && temas.includes(q.t))
  let k = 0
  for (let d = 5; d >= 0; d--) {
    const dia = new Date(); dia.setDate(dia.getDate() - d)
    if (dia.getDay() === 0) continue
    // `demo=1&feita` mostra o dia com a meta de hoje já feita (e além); `demo=1&pendente`, com pouco feito.
    const deHoje = DEMO && location.hash.includes('feita') ? 95 : DEMO && location.hash.includes('pendente') ? 5 : 23
    for (let i = 0; i < (d === 0 ? deHoje : d === 3 ? 12 : 55) && k < alvos.length; i++, k++) {
      const em = dia.getTime() - i * 60_000; const c = (k * 7) % 10 < 7
      r[alvos[k].id] = { c, q: em, historico: [{ em, correta: c }] } as unknown as RegistroQuestao
    }
  }
  return r
}

/**
 * Respostas do cenário fictício: cada dia de estudo desde a criação do plano com um pouco mais do que
 * ele pedia (o exemplo fica em dia, sem atraso nem cobrança), 70% de acerto, e hoje começado.
 */
function respondidasFicticias(indice: Indice, plano: PlanoSalvo | null): Respondidas {
  const r: Respondidas = {}
  const temas = ['trauma', 'pediatria'].map((slug) => indice.temas.findIndex((t) => t.slug === slug))
  const alvos = indice.questoes.filter((q) => !q.dup && !q.ar && q.an !== 1 && temas.includes(q.t))
  const folgas = plano?.folgas ?? [0], leves = plano?.opcoes?.diasLeves ?? [], qtdLeve = plano?.opcoes?.qtdLeve ?? 15
  let k = 0
  for (let d = 6; d >= 0; d--) {
    const dia = new Date(); dia.setDate(dia.getDate() - d)
    if (folgas.includes(dia.getDay())) continue
    const n = d === 0 ? 23 : leves.includes(dia.getDay()) ? qtdLeve + 3 : 75
    for (let i = 0; i < n && k < alvos.length; i++, k++) {
      const em = dia.getTime() - i * 60_000; const c = (k * 7) % 10 < 7
      r[alvos[k].id] = { c, q: em, historico: [{ em, correta: c }] } as unknown as RegistroQuestao
    }
  }
  return r
}

export function PlanoEstudo() {
  const acesso = usarPremium()
  const premium = acesso.premium || DEMO, logado = acesso.logado
  // Quem não assina vê o painel do assinante num cenário fictício (src/dados/vistaCronograma.ts).
  const vista = vistaDoCronograma({ premium: acesso.premium, logado, carregado: acesso.carregado, demo: DEMO })
  const ficticio = vista === 'ficticio'
  /** Plano e respostas de exemplo (demo ou cenário fictício): nada vai para o servidor. */
  const exemplo = DEMO || ficticio
  const { indice } = usarIndice()
  const [respondidasReais] = usarArmazenado<Respondidas>('respondidas', {})
  // Só no modo demo: as respostas de exemplo de um dia puxado (`demo=1&puxado`).
  const [extrasDemo, definirExtrasDemo] = useState<Respondidas>({})
  const respondidas = useMemo(() => (exemplo && indice ? { ...(ficticio ? respondidasFicticias(indice, planoDemo()) : respondidasDemo(indice)), ...extrasDemo } : respondidasReais), [exemplo, ficticio, respondidasReais, indice, extrasDemo])
  const { sessao, iniciarComAviso } = usarSessao()
  const salvoNoServidor = usarPlanoSalvo(premium && !DEMO)
  const [planoDemo_, definirPlanoDemo] = useState<PlanoSalvo | null>(planoDemo)
  const plano = exemplo ? planoDemo_ : salvoNoServidor.plano
  const definirPlano = exemplo ? definirPlanoDemo : salvoNoServidor.definirPlano
  const { status, aguardarSincronia, sessao: sessaoConta } = usarConta()
  // Cenário fictício: o que seria uma sessão ou uma gravação abre um convite (CronogramaFicticio.tsx).
  const [convite, definirConvite] = useState<MotivoConvite | null>(null)
  // Antes do primeiro sync as respostas deste aparelho podem estar atrasadas:
  // nada que dependa delas é gravado no plano compartilhado até lá.
  const sincronizado = exemplo || (status.pronto && status.pendentes === 0)
  const [editando, definirEditando] = useState(false)
  const [erro, definirErro] = useState('')
  const [salvandoOpcoes, definirSalvandoOpcoes] = useState(false)
  const [preparando, definirPreparando] = useState(false)
  const [diagnosticoFeito, marcarDiagnostico] = usarArmazenado<string | null>('cronograma:diagnostico', null)
  const [feitosDia, definirFeitosDia] = usarArmazenado<FeitosDoDia>('cronograma:dia', { data: '' })
  const [resumaoLocal] = usarArmazenado<ResumaoHoje>(CHAVE_RESUMAO_HOJE, RESUMAO_HOJE_VAZIO)
  const { ritmo } = usarRitmoRevisao()

  // Sem plano no servidor, abre direto o formulário (só na primeira leitura).
  const primeiraLeitura = useRef(true)
  useEffect(() => {
    if (exemplo || plano === undefined || !primeiraLeitura.current) return
    primeiraLeitura.current = false
    if (!plano) definirEditando(true)
  }, [plano, exemplo])
  useEffect(() => {
    if (salvoNoServidor.falhou && !plano) definirErro('Não foi possível carregar seu cronograma. Confira a conexão.')
  }, [salvoNoServidor.falhou, plano])

  const dia = usarDiaAtual()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calculo = useMemo(() => (indice && plano ? calcularPlano(indice, respondidas, plano) : null), [indice, plano, respondidas, dia])
  // A conquista da meta é da pessoa: o cenário fictício não conta.
  useEffect(() => { if (!ficticio) conferirMetaCronograma(calculo) }, [calculo, ficticio])
  // Demo `demo=1&puxado`: o próximo dia de estudo puxado, com 8 questões dele feitas hoje (para ver o calendário).
  const demoPuxou = useRef(false)
  useEffect(() => {
    if (!DEMO || demoPuxou.current || !calculo || !plano || !location.hash.includes('puxado')) return
    demoPuxou.current = true
    const dia = calculo.dias.slice(1).find((d) => d.tipo !== 'folga' && d.total > 8)
    if (!dia) return
    const chave = chaveCivil(dia.data)
    const ids = idsParaPuxar(calculo, chave)
    const opcoes = opcoesComPuxado(plano, chave, ids, hojeBR())
    if (!opcoes) return
    const agora = Date.now()
    definirExtrasDemo(Object.fromEntries(ids.slice(0, 8).map((id, k) => [id, { c: k % 4 !== 0, q: agora - k * 60_000, historico: [{ em: agora - k * 60_000, correta: k % 4 !== 0 }] } as unknown as RegistroQuestao])))
    definirPlano({ ...plano, opcoes })
  }, [calculo, plano]) // eslint-disable-line react-hooks/exhaustive-deps
  // O que foi feito hoje fora das questões, neste aparelho e nos outros (conta/marcasDia.ts).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const marcasLocais = useMemo(() => marcasDoAparelho(feitosDia, resumaoLocal), [feitosDia, resumaoLocal, dia])
  const marcasHoje = useMemo(() => juntarMarcas(marcasDoPlano(plano), marcasLocais), [plano, marcasLocais])
  // Sobe para o plano o que este aparelho marcou e o servidor ainda não tem.
  useEffect(() => {
    if (exemplo || !premium || !plano || !opcoesComMarcas(plano, marcasLocais)) return
    enviarMarcas(marcasLocais).catch(() => undefined)
  }, [plano, marcasLocais, premium, exemplo])
  // Fez além da meta hoje: guarda o dia (e a meta dele), para amanhã a meta já vir mais leve.
  const extraHoje = calculo?.extraHoje ?? 0
  useEffect(() => {
    if (exemplo || !sincronizado || !plano || !calculo || !extraHoje || !opcoesComAdiantamento(plano, calculo)) return
    guardarAdiantamento(calculo).catch(() => undefined)
  }, [plano, extraHoje, sincronizado]) // eslint-disable-line react-hooks/exhaustive-deps
  // Vindo do fim da sessão ("adiantar"): rola até o painel.
  const irAoAdiantar = typeof location !== 'undefined' && location.hash.includes('adiantar=1')
  useEffect(() => {
    if (!irAoAdiantar || !calculo) return
    const t = setTimeout(() => document.getElementById('adiantar')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250)
    return () => clearTimeout(t)
  }, [irAoAdiantar, !!calculo]) // eslint-disable-line react-hooks/exhaustive-deps
  // Vindo do fim da sessão ("Puxar as questões de amanhã"): #/cronograma?puxar=AAAA-MM-DD abre a sessão daquele dia.
  const pedidoPuxar = typeof location !== 'undefined' ? location.hash.match(/puxar=(\d{4}-\d{2}-\d{2})/)?.[1] ?? null : null
  const puxouDoLink = useRef(false)
  useEffect(() => {
    if (ficticio || !pedidoPuxar || puxouDoLink.current || !calculo || !plano || !sincronizado) return
    puxouDoLink.current = true
    void puxarDia(pedidoPuxar)
  }, [pedidoPuxar, !!calculo, !!plano, sincronizado]) // eslint-disable-line react-hooks/exhaustive-deps

  // O histórico mora no armazenamento local: lido uma vez por mudança nas respostas, não a cada render.
  const minutosQuestao = useMemo(() => minutosPorQuestao(lerHistorico()), [respondidas])
  const chaveRitmo = `${ritmo.limite}:${ritmo.folgas.join(',')}`
  // Os números do painel (constância, risco, esquecimento...) só mudam quando muda o histórico.
  const dadosHub = useMemo(() => {
    if (!indice || !plano || !calculo) return null
    const simulados = incluiSimulados(plano)
    const recorte = indiceDoPlano(indice, plano)
    const indiceAtivo = plano.opcoes?.acervo && plano.opcoes.acervo.em <= hojeBR() ? { ...recorte, questoes: recorte.questoes.filter((q) => entraNoPlano(q, simulados)) } : indice
    const constancia = calcularConstancia(respondidas, plano, calculo)
    const areasRevisao = calculo.fase === 'revisao' ? areasDoDiaRevisao(plano, calculo) : []
    const temas = calculo.temas.filter((t) => t.acertoEstimado !== null)
    const pesoTotal = temas.reduce((s, t) => s + t.respondidas, 0)
    return {
      constancia, elogio: elogio(constancia, calculo),
      esquecidos: calculo.fase === 'conteudo' ? temasEsquecidos(indice, respondidas, calculo, plano) : [],
      riscos: mapaDeRisco(indice, respondidas), cegos: pontosCegos(indice, respondidas),
      desempenho: desempenhoPorArea(calculo),
      prontidao: prontidaoPorArea(calculo),
      media: pesoTotal ? Math.round(temas.reduce((s, t) => s + (t.acerto ?? t.acertoEstimado!) * t.respondidas, 0) / pesoTotal) : null,
      revisoesHoje: idsRevisaoHoje(respondidas, ritmo).size,
      mostrarDiagnostico: !diagnosticoFeito && calculo.fase === 'conteudo' && respondidasNoAcervo(indice, respondidas, simulados) < 40,
      simulados: contagemSimulados(indice, respondidas),
      semana: resumoDaSemana(indice, respondidas, calculo),
      areasRevisao,
      idsForte: areasRevisao.length ? idsRevisaoForte(indiceAtivo, respondidas, areasRevisao.map((a) => a.slug), calculo.metaMedia) : [],
      erros: contarErrosQueImportam(indiceAtivo, respondidas),
    }
  }, [indice, plano, calculo, respondidas, chaveRitmo, diagnosticoFeito])

  if (vista === 'carregando') return <Carregando linhas={4} rotulo="Carregando" />
  if (!indice) return <Carregando linhas={5} rotulo="Carregando o acervo" />
  if (plano === undefined) return <Carregando linhas={5} rotulo="Montando seu cronograma" />

  /**
   * Cenário fictício: em vez de abrir a sessão do plano de exemplo, um convite. Ele também oferece
   * 10 questões grátis da área do dia, numa sessão comum (fora do cronograma), com o histórico real.
   */
  function convidar(motivo: MotivoConvite) { definirConvite(motivo) }
  async function treinarGratis(slug: string) {
    if (!indice) return
    const filtros = { ...FILTROS_VAZIOS, temas: slug ? [slug] : [], situacao: 'naoRespondidas' as const, embaralhar: true, limite: 10 }
    const ids = montarSessao(indice, filtros, Date.now(), { ...CONTEXTO_VAZIO, respondidas: respondidasReais }).slice(0, 10)
    if (!ids.length) { navegar('/treinar'); return }
    if (!(await iniciarComAviso(filtros, ids))) return
    navegar('/sessao')
  }

  /** A sessão do dia: a área principal com a mistura espalhada (as duas da lista do dia), com o que a pessoa pediu para adiantar. */
  async function comecarHoje(c: CalculoPlano | null = calculo, p: PlanoSalvo | null | undefined = plano, /** Dia curto: só as primeiras `limite` questões da sessão de hoje (o resto continua no dia). */ limite = 100) {
    if (ficticio) { convidar('comecar'); return }
    if (!indice || !c || (!c.hoje && !c.revisoesHoje?.some((r) => !r.feita)) || !p) return
    // Antes de escolher as questões, traz o que foi feito nos outros aparelhos:
    // sem isso, abrir o computador logo depois de estudar no MacBook montava a
    // sessão com as mesmas questões. Sem rede, segue com o que este aparelho tem.
    if (!DEMO) { definirPreparando(true); await aguardarSincronia(8000); definirPreparando(false) }
    const atuais = DEMO ? respondidas : ler<Respondidas>('respondidas', {})
    if (!DEMO && atuais !== respondidas) { c = calcularPlano(indice, atuais, p); if (!c.hoje && !c.revisoesHoje?.some((r) => !r.feita)) return }
    const itens = c.hoje?.itens.length ? c.hoje.itens : c.hoje ? [{ slug: c.hoje.slug, n: c.hoje.n, mistura: false }] : []
    // Hoje foi puxado num dia anterior: a sessão é a que ficou guardada para ele. Senão, a de sempre,
    // sem as questões presas aos próximos dias puxados.
    const ids = c.puxados[hojeBR()] && c.dias[0]
      ? idsDaSessaoDoDia(c.dias[0], atuais).slice(0, 100)
      : idsDoDiaPlano(indiceDoPlano(indice, p), itens.map((i) => ({ ...i, n: Math.min(i.n, 100) })), { ...atuais, ...marcarReservadas(c) }, incluiSimulados(p))
    const restantes = c.revisoesHoje?.filter((r) => !r.feita) ?? []
    const revisoes = restantes.slice(0, limite === 10 ? cotaRevisoesDaMeta(limite) : limite)
    const novas = ids.slice(0, limite - revisoes.length)
    const fila = [...novas]
    revisoes.forEach((r, i) => {
      fila.splice(Math.floor(((i + 1) * novas.length) / (revisoes.length + 1)) + i, 0, r.id)
    })
    if (!fila.length) return
    const filtros = { ...FILTROS_VAZIOS, temas: [...new Set(itens.map((i) => i.slug))], situacao: revisoes.length ? 'todas' as const : 'naoRespondidas' as const, embaralhar: false, limite: fila.length }
    const cronograma: NonNullable<EstadoSessao['cronograma']> = {
      modalidade: 'ortopedia',
      ...(c.revisoesHoje?.length ? {
        meta: c.metaDiaria + c.revisoesHoje.length,
        feitasAntes: Math.min(c.feitasHoje, c.metaDiaria) + c.revisoesHoje.filter((r) => r.feita).length,
        revisoes: Object.fromEntries(revisoes.map(({ id, assunto, ultimoErroEm }) => [id, { assunto, ultimoErroEm }])),
      } : {}),
    }
    if (!(await iniciarComAviso(filtros, fila, { origem: 'cronograma', cronograma, diaPlano: hojeBR() }))) return
    navegar('/sessao')
  }

  /**
   * Puxar um dia (pedido do Tales, 19/10/2026): prende ao dia as questões que o plano dá a ele,
   * grava no plano e abre a sessão com as que faltam dele. O que a pessoa fizer conta para aquele
   * dia, não para a meta de hoje, e o resto continua lá.
   */
  async function puxarDia(dia: string) {
    if (ficticio) { convidar('puxar'); return }
    if (!indice || !calculo || !plano) return
    const ids = idsParaPuxar(calculo, dia)
    if (!ids.length) return
    let novo = plano
    const opcoes = opcoesComPuxado(plano, dia, ids, hojeBR())
    if (opcoes) {
      novo = { ...plano, opcoes }
      definirPlano(novo)
      if (!DEMO) {
        // Grava antes de abrir a sessão: o fim da sessão e os outros aparelhos já contam as respostas para o dia certo.
        definirSalvandoOpcoes(true); definirErro('')
        try { const salvo = await salvarOpcoes((atual) => opcoesComPuxado(atual, dia, ids, hojeBR())); if (salvo) novo = salvo }
        catch { definirPlano(plano); definirErro('Não foi possível guardar as questões desse dia agora. Confira a conexão e tente de novo.'); return }
        finally { definirSalvandoOpcoes(false) }
      }
    }
    if (!DEMO) { definirPreparando(true); await aguardarSincronia(8000); definirPreparando(false) }
    const atuais = DEMO ? respondidas : ler<Respondidas>('respondidas', {})
    const c = calcularPlano(indice, atuais, novo)
    const doDia = c.dias.find((d) => chaveCivil(d.data) === dia)
    const sessaoIds = doDia ? idsDaSessaoDoDia(doDia, atuais) : ids.filter((id) => !atuais[id])
    if (!sessaoIds.length) return
    const temas = [...new Set((doDia?.itens ?? []).map((i) => i.slug))]
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, temas, situacao: 'naoRespondidas' as const, embaralhar: false, limite: sessaoIds.length }, sessaoIds, { origem: 'cronograma', cronograma: { modalidade: 'ortopedia' }, diaPlano: dia }))) return
    navegar('/sessao')
  }
  /** Começa uma sessão já montada (diagnóstico, reta final, reativar, risco). */
  async function comecarIds(ids: string[], origem: 'cronograma' | 'diagnostico' | 'reta-final' | 'reativar' | 'erros', temas: string[] = []) {
    if (ficticio) { convidar('outro'); return }
    if (!ids.length) return
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, temas, embaralhar: false, limite: ids.length }, ids, { origem }))) return
    navegar('/sessao')
  }

  async function comecarRevisoesExtras(revisoes: RevisaoNoCronograma[]) {
    if (ficticio || !revisoes.length) return
    const ids = revisoes.map((r) => r.id)
    const detalhes = Object.fromEntries(revisoes.map(({ id, assunto, ultimoErroEm }) => [id, { assunto, ultimoErroEm }]))
    if (await iniciarComAviso({ ...FILTROS_VAZIOS, embaralhar: false, limite: ids.length }, ids, {
      origem: 'erros', cronograma: { modalidade: 'ortopedia', revisoes: detalhes },
    })) navegar('/sessao')
  }

  function indiceParaAtividades() {
    const base = indice!
    if (!plano?.opcoes?.acervo || plano.opcoes.acervo.em > hojeBR()) return base
    const recorte = indiceDoPlano(base, plano)
    return { ...recorte, questoes: recorte.questoes.filter((q) => entraNoPlano(q, incluiSimulados(plano))) }
  }

  /** Mini-simulado: 30 questões já vistas, cronometradas (1,5 min cada). */
  async function comecarMini(marcar = true) {
    if (ficticio) { convidar('outro'); return }
    if (!indice) return
    const ids = idsMiniSimulado(indiceParaAtividades(), respondidas)
    if (!ids.length) return
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, embaralhar: false, limite: ids.length }, ids, { origem: 'cronograma', cronograma: { modalidade: 'ortopedia' }, simulado: true, limiteSegundos: Math.round(ids.length * 90), diaPlano: hojeBR() }))) return
    if (marcar) marcarFeito('mini')
    navegar('/sessao')
  }

  /**
   * Adiantar n questões: soma ao que já foi adiantado hoje e guarda no plano (o motor tira
   * isso de amanhã em diante). Com a meta de hoje feita, já abre a sessão com elas.
   */
  async function adiantar(n: number) {
    if (ficticio) { convidar('adiantar'); return }
    if (!indice || !calculo || !plano) return
    const pedido = Math.max(calculo.extraHoje, calculo.adiantarPedido) + n
    const opcoes = opcoesComAdiantamento(plano, calculo, pedido)
    const novo = opcoes ? { ...plano, opcoes } : plano
    definirPlano(novo)
    if (calculo.faltaHoje === 0) comecarHoje(calcularPlano(indice, respondidas, novo), novo)
    if (DEMO || !opcoes) return
    definirSalvandoOpcoes(true); definirErro('')
    try { await guardarAdiantamento(calculo, pedido) } catch { definirPlano(plano); definirErro('Não foi possível salvar o adiantamento agora. Confira a conexão e tente de novo.') } finally { definirSalvandoOpcoes(false) }
  }

  /** Cancela o que foi pedido e ainda não foi feito (o que já foi feito a mais continua valendo). */
  async function cancelarAdiantar() {
    if (!calculo || !plano) return
    const opcoes = opcoesComAdiantamento(plano, calculo, 0)
    if (!opcoes) return
    definirPlano({ ...plano, opcoes })
    if (DEMO) return
    definirSalvandoOpcoes(true); definirErro('')
    try { await guardarAdiantamento(calculo, 0) } catch { definirPlano(plano); definirErro('Não foi possível cancelar agora. Confira a conexão e tente de novo.') } finally { definirSalvandoOpcoes(false) }
  }

  function marcarFeito(chave: keyof Omit<FeitosDoDia, 'data'>) {
    if (ficticio) return
    const hojeChave = chaveHoje()
    definirFeitosDia((atual) => ({ ...(atual.data === hojeChave ? atual : { data: hojeChave }), [chave]: true }))
  }

  async function semanaDificil(ativar: boolean) {
    if (!plano) return
    const hoje = diaCivil()
    const seg = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7))
    const chave = chaveCivil(seg)
    const alternarSemana = (p: PlanoSalvo) => {
      const atuais = (p.opcoes?.semanasDificeis ?? []).filter((s) => s >= chave)
      return { ...(p.opcoes ?? {}), semanasDificeis: ativar ? [...new Set([...atuais, chave])] : atuais.filter((s) => s !== chave) }
    }
    definirSalvandoOpcoes(true); definirErro('')
    // Mostra na hora; o servidor confirma em seguida.
    definirPlano({ ...plano, opcoes: alternarSemana(plano) })
    if (exemplo) { definirSalvandoOpcoes(false); return }
    try { await salvarOpcoes(alternarSemana) } catch { definirPlano(plano); definirErro('Não foi possível salvar a semana difícil agora. Confira a conexão e tente de novo.') } finally { definirSalvandoOpcoes(false) }
  }

  /** Muda uma opção do plano (só TEOT, dia dos erros): mostra na hora e o servidor confirma em seguida. */
  async function mudarOpcao(alterar: (p: PlanoSalvo) => OpcoesPlano, falha: string) {
    if (ficticio) { convidar('outro'); return }
    if (!plano) return
    definirSalvandoOpcoes(true); definirErro('')
    definirPlano({ ...plano, opcoes: alterar(plano) })
    if (exemplo) { definirSalvandoOpcoes(false); return }
    try { await salvarOpcoes(alterar) } catch { definirPlano(plano); definirErro(falha) } finally { definirSalvandoOpcoes(false) }
  }
  /**
   * Começar do zero (Tales, 14/11/2026): o mesmo plano (data, ritmo, folgas e opções) recomeça hoje, e todas as questões
   * voltam para ele; só as respostas dadas daqui em diante contam (opcoes.zeradoEm). Nada do histórico é apagado.
   */
  async function zerar() {
    if (ficticio) { convidar('outro'); return }
    if (!plano || salvandoOpcoes) return
    if (!window.confirm('Começar o cronograma do zero?\n\nTodas as questões voltam para o plano, como no primeiro dia, com a mesma data, o mesmo ritmo e as mesmas folgas. Suas respostas, o desempenho e as revisões continuam salvos.')) return
    const { adiantados: _a, puxados: _p, marcasDia: _m, ...resto } = plano.opcoes ?? {}
    const opcoes: OpcoesPlano = { ...resto, zeradoEm: Date.now() }
    if (exemplo) { definirPlano({ ...plano, criado_em: new Date().toISOString(), base_respondidas: 0, opcoes }); definirEditando(false); return }
    definirSalvandoOpcoes(true); definirErro('')
    try {
      const salvo = await salvarPlano({ p_data_prova: plano.data_prova, p_intensidade: plano.intensidade, p_folgas: plano.folgas, p_prova: plano.prova, p_base: 0, p_recomecar: true }, incluiSimulados(plano), opcoes, { avisar: false })
      if (salvo) definirPlano(salvo)
      definirEditando(false)
    } catch { definirErro('Não foi possível recomeçar o cronograma agora. Confira a conexão e tente de novo.') } finally { definirSalvandoOpcoes(false) }
  }
  /** Abandonar o cronograma (14/11/2026): apaga o plano; as respostas, o desempenho e as revisões continuam salvos. */
  async function abandonar() {
    if (ficticio) { convidar('outro'); return }
    if (!plano || !window.confirm('Abandonar o seu cronograma?\n\nO plano deixa de existir e a página volta para o início, onde dá para montar outro quando quiser. Suas respostas, o desempenho e as revisões continuam salvos.')) return
    if (exemplo) { definirPlano(null); return }
    try { await chamarRpc('apagar_plano_estudo', {}); window.location.reload() } catch { definirErro('Não foi possível abandonar o cronograma agora. Confira a conexão e tente de novo.') }
  }
  const vigencia = (() => {
    let dia = somarDias(hojeBR(), 1)
    for (let i = 0; i < 6 && plano?.folgas.includes(diaCivil(dia).getDay()); i++) dia = somarDias(dia, 1)
    return dia
  })()
  function comAcervo(atual: PlanoSalvo, novo: AcervoPlano): OpcoesPlano {
    return { ...atual.opcoes, acervo: { em: vigencia, anterior: acervoDoPlano(atual), novo } }
  }
  function comDiaAvulso(atual: PlanoSalvo, dia: string, tipo: AjusteDia): OpcoesPlano {
    const ops = atual.opcoes ?? {}
    const chave = tipo === 'leve' ? 'diasLevesAvulsos' : 'diasExtras'
    return {
      ...ops,
      [chave]: alternarData(ops[chave], dia),
      metaPreservada: ops.metaPreservada?.em === hojeBR() ? ops.metaPreservada : { em: hojeBR(), n: calculo?.metaHojeSemAdiantar ?? 0 },
    }
  }
  const acoesVisao = {
    aoZerar: () => { void zerar() },
    aoAbandonar: () => { void abandonar() },
    aoEstudarPendentes: () => {
      if (!plano) return
      const recorte = indiceDoPlano(indice, plano)
      const simulados = incluiSimulados(plano)
      const ids = recorte.questoes.filter((q) => entraNoPlano(q, simulados) && !respondidas[q.id]).slice(0, 30).map((q) => q.id)
      void comecarIds(ids, 'reativar')
    },
    aoRevanche: (ids: string[]) => comecarIds(ids, 'erros'),
    aoComecarCurto: (n: number) => { void comecarHoje(calculo, plano, n) },
    previaAcervo: (novo: AcervoPlano) => {
      if (!plano) return { data: vigencia, meta: 0, cobertura: 0, total: 0, respondidas: 0 }
      const proximaData = inicioDaChave(vigencia)
      const proximo = { ...plano, opcoes: comAcervo(plano, novo) }
      const simulado = calcularPlano(indice, respondidas, proximo, proximaData)
      const elegiveis = indiceDoPlano(indice, proximo, proximaData).questoes.filter((q) => entraNoPlano(q, novo.simulados))
      const respondidasNoRecorte = elegiveis.filter((q) => Boolean(respondidas[q.id])).length
      return { data: vigencia, meta: simulado.metaDiaria, cobertura: simulado.projecao.maisCaiPct, total: elegiveis.length, respondidas: respondidasNoRecorte }
    },
    aoAcervo: (novo: AcervoPlano) => mudarOpcao((p) => comAcervo(p, novo), 'Não foi possível salvar o acervo agora. Tente de novo.'),
    ajusteDia: {
      previa: (dia: string, tipo: AjusteDia) => {
        if (!plano || dia <= hojeBR()) return null
        const previsto = calcularPlano(indice, respondidas, { ...plano, opcoes: comDiaAvulso(plano, dia, tipo) })
        return { carga: previsto.dias.find((d) => chaveCivil(d.data) === dia)?.total ?? 0, metaNormal: previsto.metaDiaNormal, cobertura: previsto.projecao.maisCaiPct }
      },
      aplicar: (dia: string, tipo: AjusteDia) => {
        if (dia > hojeBR()) void mudarOpcao((atual) => comDiaAvulso(atual, dia, tipo), 'Não foi possível ajustar esse dia. Tente de novo.')
      },
    },
    aoPermitirRevisoes: (novo: boolean) => mudarOpcao((atual) => ({
      ...atual.opcoes,
      ...(atual.opcoes?.revisoesNaMeta
        ? { revisoesNaMeta: { em: vigencia, anterior: revisoesNaMetaAtivas(atual, hojeBR()), novo } }
        : { revisoesExtras: novo }),
    }), 'Não foi possível salvar a opção de revisões agora. Tente de novo.'),
    aoRevisoesExtras: comecarRevisoesExtras,
    aoDiaErros: (dia: number | null) => mudarOpcao((p) => ({ ...(p.opcoes ?? {}), diaErros: dia }), 'Não foi possível guardar o dia dos erros agora. Confira a conexão e tente de novo.'),
  }

  const hub = montarHub()
  function montarHub(): HubDados | null {
    if (!indice || !plano || !calculo || !dadosHub) return null
    const simulados = incluiSimulados(plano)
    const { areasRevisao, idsForte, erros, ...dados } = dadosHub
    return {
      ...dados,
      retaFinal: {
        revisaoHoje: areasRevisao.length ? { areas: areasRevisao, n: idsForte.length } : null,
        aoRevisaoForte: () => comecarIds(idsForte, 'reta-final', areasRevisao.map((a) => a.slug)),
        errosQueImportam: erros,
        aoSimuladoDaProva: plano.opcoes?.acervo && plano.opcoes.acervo.em <= hojeBR() && acervoDoPlano(plano).oficiais !== 'todas' ? () => comecarMini(false) : undefined,
        aoErros: () => comecarIds(idsErrosQueImportam(indiceParaAtividades(), respondidas, Math.max(20, calculo.metaMedia)), 'reta-final'),
        aoAquecimento: () => comecarIds(idsAquecimentoVespera(indiceParaAtividades(), respondidas), 'reta-final'),
      },
      aoDiagnostico: () => { if (ficticio) { convidar('outro'); return } marcarDiagnostico(new Date().toISOString()); comecarIds(idsDiagnostico(indice, respondidas, simulados), 'diagnostico') },
      aoReativar: (slug: string) => comecarIds(idsReativar(indiceParaAtividades(), respondidas, slug), 'reativar', [slug]),
      aoTreinarFoco: async (area: AreaIncidencia, foco: Foco) => {
        if (ficticio) { convidar('outro'); return }
        const ids = idsDoFoco(indiceParaAtividades(), area, foco)
        const ordem = [...ids.filter((id) => respondidas[id]?.c === false), ...ids.filter((id) => !respondidas[id]), ...ids.filter((id) => respondidas[id] && respondidas[id].c !== false)].slice(0, 20)
        if (!ordem.length) return
        const subtemas = [area.subtema, foco.noAcervo ?? foco.nome].filter((s): s is string => !!s)
        if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, subtemas, embaralhar: false, limite: ordem.length }, ordem))) return
        navegar('/sessao')
      },
      aoTrocarSimulados: async (incluir: boolean) => {
        if (ficticio) { convidar('outro'); return }
        const salvo = await trocarSimulados(plano, incluir)
        if (salvo) definirPlano(salvo)
        marcarAvisoNaConta(sessaoConta?.user.user_metadata, 'cronograma-simulados')
      },
      aoMini: comecarMini,
      aoMarcar: marcarFeito,
      feitosDia: ficticio ? { data: chaveHoje() } : { data: chaveHoje(), ...(marcasHoje.flashcards ? { flashcards: true } : {}), ...(marcasHoje.mini ? { mini: true } : {}) },
      resumaoLido: ficticio ? [] : marcasHoje.resumao ?? [],
      minutosQuestao,
      aoSemanaDificil: semanaDificil,
      aoCancelarAdiantar: cancelarAdiantar,
      salvandoOpcoes,
    }
  }

  if (ficticio && calculo && plano) {
    const nome = primeiroNome(sessaoConta?.user.user_metadata?.nome)
    const area = calculo.hoje?.itens.find((i) => !i.mistura) ?? calculo.hoje?.itens[0] ?? null
    return (
      <div className="empilha-2 pe cp cr cr--torre cg cf">
        <VisaoCronograma plano={plano} calculo={calculo} indice={indice} respondidas={respondidas} aberto ficticio={{ nome, aoConvidar: convidar }}
          aoComecar={() => comecarHoje()} aoAdiantar={adiantar} aoPuxar={puxarDia} hub={hub} acoes={acoesVisao} />
        {convite && <ConviteFicticio motivo={convite} nome={nome} area={area ? { slug: area.slug, nome: area.nome } : null}
          aoTreinar={(slug) => { definirConvite(null); void treinarGratis(slug) }} aoFechar={() => definirConvite(null)} />}
      </div>
    )
  }

  if (editando || !plano || !calculo) {
    return <FormularioPlano indice={indice} respondidas={respondidas} atual={plano} aoCancelar={plano ? () => definirEditando(false) : undefined} aoZerar={plano && !exemplo ? () => { void zerar() } : undefined}
      aoSalvar={(novo, fazerDiagnostico) => {
        marcarAvisoSimulados(); marcarAvisoNaConta(sessaoConta?.user.user_metadata, 'cronograma-simulados'); definirPlano(novo); definirEditando(false)
        if (fazerDiagnostico) { marcarDiagnostico(new Date().toISOString()); comecarIds(idsDiagnostico(indice, respondidas, incluiSimulados(novo)), 'diagnostico') }
      }} />
  }

  return (
    <div className="empilha-2 pe cp cr cr--torre cg">
      {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}
      {!DEMO && <IndicadorSincronia preparando={preparando} />}
      <NovidadeSimulados plano={plano} aoMudarPlano={definirPlano} />
      <VisaoCronograma plano={plano} calculo={calculo} indice={indice} respondidas={respondidas} aberto aoComecar={() => comecarHoje()} aoAdiantar={adiantar} aoPuxar={puxarDia} pendente={sessaoPendente(sessao)} hub={hub} aoAjustar={() => definirEditando(true)} acoes={acoesVisao} revisoesExtras={revisoesExtrasDoDia(indice, respondidas, plano, calculo)} />
    </div>
  )
}

/** O primeiro nome, como nos e-mails (primeiroNome de supabase/functions/_shared/cartas.ts): vazio se não parecer um nome. */
function primeiroNome(nome?: unknown): string {
  const primeiro = String(nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}

/** O que a pessoa marcou como feito hoje fora das questões (flashcards, mini-simulado). O resumão tem registro próprio (estado/resumaoLido). */
interface FeitosDoDia { data: string; flashcards?: boolean; mini?: boolean }
const chaveHoje = () => { const d = diaCivil(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }
/** As marcas de hoje guardadas neste aparelho (as chaves antigas, que continuam valendo offline). */
function marcasDoAparelho(feitos: FeitosDoDia, resumao: ResumaoHoje): MarcasDia {
  const em = hojeBR()
  const deHoje = feitos.data === chaveHoje()
  const areas = resumao.data === em ? resumao.areas : []
  return {
    em,
    ...(areas.length ? { resumao: areas } : {}),
    ...(deHoje && feitos.flashcards ? { flashcards: true } : {}),
    ...(deHoje && feitos.mini ? { mini: true } : {}),
  }
}

/** Sessão do cronograma que ficou pela metade (a pessoa fechou o site no meio). */
/**
 * A sessão do cronograma que ainda dá para continuar. Só a de hoje: a de ontem
 * (meio feita ou nem começada) prendia o botão do dia em "Continuar: faltam N",
 * que levava de volta às questões de ontem, e não havia como montar a de hoje.
 */
export function sessaoPendente(sessao: EstadoSessao | null, agora: number = Date.now()): { feitas: number; total: number; tema: string; simulado: boolean } | null {
  if (!sessao || sessao.concluidaEm || !sessao.origem || sessao.cronograma?.modalidade.startsWith('mao-')) return null
  // Só a sessão aberta pelo próprio cronograma de TEOT/TARO (o dia, um dia puxado ou o mini-simulado) vira o
  // "Continuar" do dia (06/11/2026: uma sessão de 18 questões aberta por outra tela prendia o botão em
  // "faltam 17" de um dia de 65). As outras continuam em Questões, mas não tomam o lugar do dia.
  if (!sessao.diaPlano) return null
  if (chaveDoDia(sessao.criadaEm) !== chaveDoDia(agora)) return null
  const feitas = Object.keys(sessao.respostas).length
  if (feitas >= sessao.ids.length) return null
  return { feitas, total: sessao.ids.length, tema: sessao.filtros?.temas?.[0] ?? '', simulado: !!sessao.simulado }
}

/** Resumo da semana que passou (para domingo e segunda): questões, dias, acerto e a área mais fraca. */
function resumoDaSemana(indice: Indice, respondidas: Respondidas, calculo: CalculoPlano) {
  const hoje = diaCivil()
  if (hoje.getDay() !== 0 && hoje.getDay() !== 1) return null
  // Semana de segunda a domingo em dias de São Paulo (src/util/dia.ts).
  const chaveFim = somarDias(hojeBR(), hoje.getDay() === 1 ? 0 : 1)
  const fim = inicioDaChave(chaveFim)
  const inicio = inicioDaChave(somarDias(chaveFim, -7))
  const temaDe = new Map(indice.questoes.map((q) => [q.id, q.t]))
  let feitas = 0, certas = 0, validas = 0
  const dias = new Set<string>()
  const porTema = new Map<number, { c: number; v: number }>()
  for (const [id, r] of Object.entries(respondidas)) {
    for (const h of r.historico ?? (r.q !== undefined ? [{ em: r.q, correta: r.c }] : [])) {
      if (h.em < inicio || h.em >= fim) continue
      feitas++; dias.add(chaveDoDia(h.em))
      if (h.correta === null) continue
      validas++; if (h.correta) certas++
      const t = temaDe.get(id)
      if (t !== undefined) { const x = porTema.get(t) ?? { c: 0, v: 0 }; x.v++; if (h.correta) x.c++; porTema.set(t, x) }
    }
  }
  const fraca = [...porTema].filter(([, x]) => x.v >= 8).sort((a, b) => a[1].c / a[1].v - b[1].c / b[1].v)[0]
  const proxima = calculo.dias.find((d) => d.data.getTime() >= fim && d.itens.length)
  return {
    feitas, dias: dias.size, acerto: validas >= 5 ? Math.round((certas / validas) * 100) : null,
    fraca: fraca ? indice.temas[fraca[0]]?.nome ?? null : null,
    proxima: proxima ? [...new Set(calculo.dias.filter((d) => d.data.getTime() >= fim && d.data.getTime() < fim + 7 * 86_400_000).flatMap((d) => d.itens.filter((i) => !i.mistura).map((i) => i.nome)))].join(', ') : null,
  }
}

/** Tudo o que o painel do assinante mostra além do plano (calculado em PlanoEstudo). */
export interface HubDados {
  constancia: ReturnType<typeof calcularConstancia>
  elogio: ReturnType<typeof elogio>
  esquecidos: ReturnType<typeof temasEsquecidos>
  riscos: ReturnType<typeof mapaDeRisco>
  cegos: ReturnType<typeof pontosCegos>
  desempenho: ReturnType<typeof desempenhoPorArea>
  prontidao: ReturnType<typeof prontidaoPorArea>
  media: number | null
  revisoesHoje: number
  mostrarDiagnostico: boolean
  simulados: ReturnType<typeof contagemSimulados>
  semana: ReturnType<typeof resumoDaSemana>
  retaFinal: Parameters<typeof HojeRetaFinal>[0]['acoes']
  aoDiagnostico: () => void
  aoReativar: (slug: string) => void
  aoTreinarFoco: (area: AreaIncidencia, foco: Foco) => void
  aoTrocarSimulados: (incluir: boolean) => Promise<void>
  aoMini: () => void
  aoMarcar: (chave: 'flashcards' | 'mini') => void
  feitosDia: FeitosDoDia
  /** Áreas do resumão lidas hoje em qualquer aparelho. */
  resumaoLido: string[]
  minutosQuestao: number
  aoSemanaDificil: (ativar: boolean) => void
  aoCancelarAdiantar: () => void
  salvandoOpcoes: boolean
}

function FormularioPlano({ indice, respondidas, atual, aoSalvar, aoCancelar, aoZerar, previa = false }: {
  aoZerar?: () => void
  indice: Indice
  respondidas: Respondidas
  atual: PlanoSalvo | null
  aoSalvar: (p: PlanoSalvo, diagnostico?: boolean) => void
  aoCancelar?: () => void
  /** Sem salvar no servidor: monta a prévia no próprio aparelho. */
  previa?: boolean
}) {
  const [data, definirData] = useState(atual?.data_prova ?? (DATA_TEOT > hojeBR() ? DATA_TEOT : ''))
  const [prova, definirProva] = useState(atual?.prova ?? 'TEOT')
  const [nomeOutraProva, definirNomeOutraProva] = useState(atual?.prova && !PROVAS.includes(atual.prova) ? atual.prova : '')
  const outraProva = !PROVAS.slice(0, 3).includes(prova)
  const nomeProva = outraProva ? nomeOutraProva.replace(/\s+/g, ' ').trim() : prova
  const provaValida = nomeProva.length >= 2 && nomeProva.length <= 40 && !/[<>@]/.test(nomeProva) && !/^outra(?: prova)?$/i.test(nomeProva) && /\p{L}/u.test(nomeProva)
  const [intensidade, definirIntensidade] = useState<Intensidade>(atual?.intensidade ?? 'firme')
  const [folgas, definirFolgas] = useState<number[]>(atual?.folgas ?? [0])
  const [simulados, definirSimulados] = useState(incluiSimulados(atual))
  const [revisoesNaMeta, definirRevisoesNaMeta] = useState(true)
  const opcoesAtuais = opcoesDe(atual)
  const [diasLeves, definirDiasLeves] = useState<number[]>(opcoesAtuais.diasLeves)
  const [qtdLeve, definirQtdLeve] = useState(opcoesAtuais.qtdLeve)
  const [comecarPor, definirComecarPor] = useState<string | null>(opcoesAtuais.comecarPor)
  const [dominadas, definirDominadas] = useState<string[]>(opcoesAtuais.dominadas)
  const [provaExtra, definirProvaExtra] = useState<{ nome: string; data: string }>(atual?.opcoes?.provaExtra ?? { nome: '', data: '' })
  const [diagnostico, definirDiagnostico] = useState(!atual && respondidasNoAcervo(indice, respondidas, true) < 40)
  const [recomecar, definirRecomecar] = useState(false)
  const [salvando, definirSalvando] = useState(false)
  const [erro, definirErro] = useState('')
  const [passo, definirPasso] = useState(0)
  const { status, sessao: sessaoConta } = usarConta()
  const nome = primeiroNome(sessaoConta?.user.user_metadata?.nome)
  const sincronizado = !!previa || (status.pronto && status.pendentes === 0)
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data) && data > hojeBR()
  const minutos = useMemo(() => minutosPorQuestao(lerHistorico()), [])
  const areas = useMemo(() => indice.temas.map((t) => ({ slug: t.slug, nome: t.nome })).filter((t) => posicaoDaArea(t.slug) !== null || indice.questoes.some((q) => indice.temas[q.t]?.slug === t.slug && !q.ar)), [indice])

  const opcoes = (): OpcoesPlano => ({
    diasLeves: diasLeves.filter((d) => !folgas.includes(d)), qtdLeve, comecarPor, dominadas,
    semanasDificeis: atual?.opcoes?.semanasDificeis ?? [],
    ...(atual?.opcoes?.revisoesNaMeta ? { revisoesNaMeta: atual.opcoes.revisoesNaMeta } : {}),
    ...(!atual ? { revisoesNaMeta: { em: hojeBR(), anterior: false, novo: revisoesNaMeta } } : {}),
    // O que já foi feito hoje (em qualquer aparelho) continua feito depois de editar o plano.
    ...(atual?.opcoes?.marcasDia ? { marcasDia: atual.opcoes.marcasDia } : {}),
    // Um plano recomeçado do zero continua contando só a partir do recomeço depois de editar.
    ...(atual?.opcoes?.zeradoEm ? { zeradoEm: atual.opcoes.zeradoEm } : {}),
    ...(provaExtra.nome.trim() && /^\d{4}-\d{2}-\d{2}$/.test(provaExtra.data) ? { provaExtra: { nome: provaExtra.nome.trim().slice(0, 30), data: provaExtra.data } } : {}),
  })
  // As três intensidades simuladas com as escolhas atuais: meta, tempo e o que cobre.
  // A data é digitada: as três simulações (o cálculo inteiro, três vezes) seguem
  // a digitação com folga, sem travar o campo a cada tecla.
  // Todas as escolhas passam adiadas (não só a data): tocar numa folga ou num dia leve responde
  // na hora e as simulações chegam logo depois, sem travar o toque.
  const escolhas = useMemo(() => ({ data, folgas, simulados, op: opcoes() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, folgas, simulados, revisoesNaMeta, diasLeves, qtdLeve, comecarPor, dominadas.join(','), provaExtra.nome, provaExtra.data, atual?.opcoes?.revisoesNaMeta])
  const adiadas = useDeferredValue(escolhas)
  const simulacoes = useMemo(() => {
    const { data: dataSimulada, folgas: f, simulados: sim, op } = adiadas
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataSimulada) || dataSimulada <= hojeBR()) return null
    const base = respondidasNoAcervo(indice, respondidas, sim)
    // Criado "hoje" (início do dia): o mesmo plano dá o mesmo resultado em toda a digitação.
    const criado = new Date(inicioDaChave(hojeBR())).toISOString()
    const resultado = {} as Record<Intensidade, { meta: number; maisCai: number; alvo: number }>
    for (const i of Object.keys(ROTULO_INTENSIDADE) as Intensidade[]) {
      const c = calcularPlano(indice, respondidas, { data_prova: dataSimulada, intensidade: i, folgas: f, prova, base_respondidas: base, criado_em: criado, incluir_simulados: sim, opcoes: op })
      resultado[i] = { meta: c.metaDiaNormal, maisCai: c.projecao.maisCaiPct, alvo: c.alvo }
    }
    return resultado
  }, [indice, respondidas, adiadas, prova])

  async function salvar() {
    if (!dataValida || !provaValida || salvando) return
    const base = respondidasNoAcervo(indice, respondidas, simulados)
    if (previa) {
      aoSalvar({ data_prova: data, intensidade, folgas, prova: nomeProva, base_respondidas: base, criado_em: new Date().toISOString(), incluir_simulados: simulados, opcoes: opcoes() })
      return
    }
    // A contagem do plano parte das respostas deste aparelho: se ele ainda não
    // recebeu as dos outros, a base sairia baixa para sempre, em todos eles.
    if (!sincronizado) { definirErro('Aguarde alguns segundos: seu progresso ainda está sincronizando.'); return }
    definirSalvando(true); definirErro('')
    try {
      // Relê o plano: outro aparelho pode ter adiantado o dia ou marcado a semana difícil.
      const fresco = await obterPlano()
      // Trocar a escolha dos simulados muda o tamanho do acervo do plano: a contagem recomeça.
      const mudouSimulados = !!fresco && incluiSimulados(fresco) !== simulados
      const recomecando = !fresco || recomecar
      const anteriores = opcoesDe(fresco)
      const campos = opcoes()
      const novasOpcoes: OpcoesPlano = {
        ...fresco?.opcoes,
        ...(!fresco && !atual && campos.revisoesNaMeta ? { revisoesNaMeta: campos.revisoesNaMeta } : {}),
        diasLeves: campos.diasLeves,
        qtdLeve: campos.qtdLeve,
        comecarPor: campos.comecarPor,
        dominadas: campos.dominadas,
        provaExtra: campos.provaExtra ?? null,
        semanasDificeis: anteriores.semanasDificeis,
        ...(recomecar ? { adiantados: [], puxados: {} } : {}),
      }
      if (fresco && mudouSimulados) {
        const atual = acervoDoPlano(fresco)
        let em = somarDias(hojeBR(), 1)
        while (folgas.includes(diaCivil(em).getDay())) em = somarDias(em, 1)
        novasOpcoes.acervo = { em, anterior: atual, novo: { ...atual, simulados } }
      }
      const salvo = await salvarPlano({ p_data_prova: data, p_intensidade: intensidade, p_folgas: folgas, p_prova: nomeProva, p_base: base, p_recomecar: recomecando }, fresco?.incluir_simulados ?? simulados, novasOpcoes)
      if (!salvo) throw new Error('Plano não encontrado depois de salvar.')
      aoSalvar(salvo, diagnostico)
    } catch (falha) {
      definirErro(codigoErro(falha) === 'data_invalida' ? 'Escolha uma data futura, em até dois anos.' : codigoErro(falha) === 'premium_necessario' ? 'O cronograma é exclusivo para assinantes.' : 'Não foi possível salvar agora. Tente de novo.')
    } finally { definirSalvando(false) }
  }

  async function apagar() {
    if (!window.confirm('Apagar o seu cronograma?')) return
    try { await chamarRpc('apagar_plano_estudo', {}); window.location.reload() } catch { definirErro('Não foi possível apagar agora.') }
  }

  const alternar = (lista: number[], dia: number) => lista.includes(dia) ? lista.filter((x) => x !== dia) : [...lista, dia].sort()
  const passos = [
    { titulo: 'Qual prova e quando?', curto: 'Prova', pronto: dataValida && provaValida },
    { titulo: 'Quanto tempo por dia?', curto: 'Tempo', pronto: true },
    { titulo: 'Como é a sua semana?', curto: 'Semana', pronto: true },
    { titulo: 'Por onde começar?', curto: 'Prioridades', pronto: true },
  ]
  const ultimo = passo === passos.length - 1
  const sim = simulacoes?.[intensidade]

  return (
    <div className="empilha-2 pe cr-form cr--torre">
      <section className="pe-heroi pe-heroi--convite pe-heroi--form pe-heroi--torre">
        {/* A Torre do Tempo em faixa curta: o relógio à vista, sem gastar uma dobra antes do primeiro campo. */}
        <CenaTorre />
        <div>
          <p className="tr-heroi__selo">{atual ? 'Ajustar o cronograma' : 'Seu estudo até a prova'}</p>
          <h1 className="pe-heroi__nome">Cronograma</h1>
          <p>{nome ? `${nome}, quatro` : 'Quatro'} perguntas e ele diz <strong>o que estudar em cada dia</strong>, começando pelo que mais cai, misturando as áreas e terminando com a <strong>reta final</strong>.{previa ? ' Veja a prévia do seu no fim.' : ''}</p>
        </div>
      </section>
      <PassagemNatal forma="sinos" compacta inicio />
      <div className="pe-montar">
      <section className="cartao cartao__corpo pe-form pe-form--passos">
        <ol className="pe-passos" aria-label="Passos">
          {passos.map((p, i) => <li key={p.curto}><button type="button" className={'pe-passos__item' + (i === passo ? ' pe-passos__item--atual' : i < passo ? ' pe-passos__item--feito' : '')} aria-current={i === passo ? 'step' : undefined} disabled={i > 0 && (!dataValida || !provaValida)} onClick={() => definirPasso(i)}><span className="numerico">{i < passo ? '✓' : i + 1}</span>{p.curto}</button></li>)}
        </ol>
        <h2 className="pe-form__titulo">{passos[passo].titulo}</h2>

        {passo === 0 && <div className="pe-form__campos">
          <div className="pe-form__linha">
            <label className="campo">Prova<select className="entrada" value={PROVAS.includes(prova) ? prova : 'Outra prova'} onChange={(e) => definirProva(e.target.value)}>{PROVAS.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label className="campo">Data da prova<input className="entrada" type="date" min={amanhaIso()} value={data} onChange={(e) => definirData(e.target.value)} /></label>
          </div>
          {outraProva && <label className="campo">Qual é a prova?
            <input className="entrada" value={nomeOutraProva} onChange={e => definirNomeOutraProva(e.target.value)} maxLength={40} minLength={2} required placeholder="Ex.: Cirurgia da mão — USP" aria-describedby="pe-nome-prova-ajuda" />
            <small id="pe-nome-prova-ajuda" className="texto-2">Informe o nome da prova ou da instituição. Ele aparecerá no cronograma e nos e-mails sobre essa data.</small>
          </label>}
          {DATA_TEOT > hojeBR() && <button type="button" className={'pe-data-atalho' + (data === DATA_TEOT ? ' pe-data-atalho--ativo' : '')} onClick={() => { definirData(DATA_TEOT); if (!PROVAS.slice(0, 2).includes(prova)) definirProva('TEOT') }}>
            <Icone nome="calendario" tamanho={16} /> <span><strong>TEOT e TEPOT {DATA_TEOT.slice(0, 4)}</strong> · prova teórica em {diaCivil(DATA_TEOT).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>{data === DATA_TEOT && <Icone nome="certo" tamanho={16} />}
          </button>}
          {dataValida && <p className="pe-form__resumo"><Icone nome="relogio" tamanho={15} /> Faltam <b>{diasAte(data)} dias</b> até a prova.</p>}
          <details className="pe-form__mais" open={!!provaExtra.nome}>
            <summary>Vai fazer outra prova antes? (opcional)</summary>
            <p className="texto-2">Ela aparece como marco no seu caminho até a prova principal, por exemplo o TARO antes do TEOT.</p>
            <div className="pe-form__linha">
              <label className="campo">Nome<input className="entrada" maxLength={30} placeholder="Ex.: TARO" value={provaExtra.nome} onChange={(e) => definirProvaExtra({ ...provaExtra, nome: e.target.value })} /></label>
              <label className="campo">Data<input className="entrada" type="date" min={amanhaIso()} max={data || undefined} value={provaExtra.data} onChange={(e) => definirProvaExtra({ ...provaExtra, data: e.target.value })} /></label>
            </div>
          </details>
        </div>}

        {passo === 1 && <div className="pe-form__campos">
          <p className="texto-2">Cada opção mostra o tempo por dia com o seu ritmo (~{String(minutos).replace('.', ',')} min por questão) e quanto do acervo ela cobre até a prova. As revisões do dia vêm à parte, e dá para trocar depois.</p>
          <div className="pe-intensidades pe-intensidades--tempo" role="radiogroup" aria-label="Tempo por dia">
            {(Object.keys(ROTULO_INTENSIDADE) as Intensidade[]).map((i) => {
              const r = simulacoes?.[i]
              return (
                <button key={i} type="button" role="radio" aria-checked={intensidade === i} className="pe-intensidade" onClick={() => definirIntensidade(i)}>
                  <b className="pe-intensidade__tempo">{r ? `~${formatarTempo(r.meta * minutos)} por dia` : ROTULO_INTENSIDADE[i].nome}</b>
                  <strong>{ROTULO_INTENSIDADE[i].nome}{r && <span className="numerico"> · {r.meta} questões</span>}</strong>
                  <span>{ROTULO_INTENSIDADE[i].texto}</span>
                  {r && <small>{r.maisCai >= 100 ? 'Cobre toda a prioridade máxima' : `Cobre ${r.maisCai}% da prioridade máxima`}</small>}
                </button>
              )
            })}
          </div>
        </div>}

        {passo === 2 && <div className="pe-form__campos">
          <h3 className="pe-form__sub">Folga: em que dias você não estuda?</h3>
          <div className="tr-pilulas">
            {DIAS_SEMANA.map((d, i) => <button key={d} type="button" className="tr-pilula" aria-pressed={folgas.includes(i)} disabled={!folgas.includes(i) && folgas.length >= 5} onClick={() => { definirFolgas(alternar(folgas, i)); definirDiasLeves(diasLeves.filter((x) => x !== i)) }}>{d}</button>)}
          </div>
          <h3 className="pe-form__sub">Dia leve: em que dias você tem plantão?</h3>
          <p className="texto-2">Nesses dias a meta cai para poucas questões, e o resto se espalha pelos dias normais.</p>
          <div className="tr-pilulas">
            {DIAS_SEMANA.map((d, i) => <button key={d} type="button" className="tr-pilula" aria-pressed={diasLeves.includes(i)} disabled={folgas.includes(i)} onClick={() => definirDiasLeves(alternar(diasLeves, i))}>{d}</button>)}
          </div>
          {diasLeves.length > 0 && <div className="pe-form__linha pe-form__linha--leve">
            <span className="texto-2">Questões num dia leve:</span>
            <div className="tr-pilulas">{[10, 15, 20, 25].map((n) => <button key={n} type="button" className="tr-pilula" aria-pressed={qtdLeve === n} onClick={() => definirQtdLeve(n)}>{n}</button>)}</div>
          </div>}
        </div>}

        {passo === 3 && <div className="pe-form__campos">
          <h3 className="pe-form__sub">Começar por qual área? <small>(opcional)</small></h3>
          <p className="texto-2">Sem escolha, o plano começa pelas áreas que mais caem e pelas suas mais fracas.</p>
          <select className="entrada" value={comecarPor ?? ''} onChange={(e) => definirComecarPor(e.target.value || null)}>
            <option value="">Deixar o cronograma escolher</option>
            {areas.map((a) => <option key={a.slug} value={a.slug}>{a.nome}</option>)}
          </select>
          <h3 className="pe-form__sub">Já domina alguma área? <small>(opcional)</small></h3>
          <p className="texto-2">Ela entra só com os assuntos de prioridade máxima, e o tempo vai para o resto.</p>
          <div className="tr-pilulas">{areas.map((a) => <button key={a.slug} type="button" className="tr-pilula" aria-pressed={dominadas.includes(a.slug)} onClick={() => definirDominadas(dominadas.includes(a.slug) ? dominadas.filter((x) => x !== a.slug) : [...dominadas, a.slug])}>{a.nome}</button>)}</div>
          <h3 className="pe-form__sub">Incluir os OrtoQuestões Simulados?</h3>
          <div className="pe-intensidades" role="radiogroup" aria-label="OrtoQuestões Simulados">
            <button type="button" role="radio" aria-checked={simulados} className="pe-intensidade" onClick={() => definirSimulados(true)}><strong>Oficiais e Simulados</strong><span>Recomendado: cerca de 1 a cada 5 questões oficiais, no padrão da prova.</span></button>
            <button type="button" role="radio" aria-checked={!simulados} className="pe-intensidade" onClick={() => definirSimulados(false)}><strong>Só questões oficiais</strong><span>Os simulados seguem no treino livre.</span></button>
          </div>
          <details className="pe-form__mais"><summary>O que são os OrtoQuestões Simulados?</summary><p className="texto-2">Questões autorais do site, feitas por <strong>engenharia reversa das provas originais</strong>: o mesmo estilo, o mesmo tipo de cobrança e o mesmo nível, escritas a partir da bibliografia de referência e comentadas com a citação do livro. Não contam para os temas que mais caem, que usam só as provas oficiais.</p></details>
          {atual && incluiSimulados(atual) !== simulados && <p className="pe-form__resumo"><Icone nome="relogio" tamanho={15} /> A mudança vale a partir do próximo dia de estudo.</p>}
          {!atual && <label className="caixa"><input type="checkbox" checked={revisoesNaMeta} onChange={(e) => definirRevisoesNaMeta(e.target.checked)} /><span><b>Permitir pequenas revisões</b><br />Até 10% da meta, com no máximo 5 questões de assuntos frequentes que você errou em outros dias.</span></label>}
          {!previa && !atual && <label className="caixa"><input type="checkbox" checked={diagnostico} onChange={(e) => definirDiagnostico(e.target.checked)} /><span>Começar com o <b>diagnóstico de {TAMANHO_DIAGNOSTICO} questões</b> (uns 45 minutos): o cronograma já sabe onde você está mais fraco desde o primeiro dia.</span></label>}
          {atual && <label className="caixa"><input type="checkbox" checked={recomecar} onChange={(e) => definirRecomecar(e.target.checked)} /><span>Recomeçar a contagem hoje (zera o "à frente ou atrás do cronograma")</span></label>}
        </div>}

        {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}
        <div className="pe-form__navegacao">
          {passo > 0 && <button type="button" className="botao botao--fantasma" onClick={() => definirPasso(passo - 1)}><Icone nome="esquerda" tamanho={16} /> Voltar</button>}
          {!ultimo
            ? <button type="button" className="botao botao--principal botao--grande" disabled={!passos[passo].pronto} onClick={() => definirPasso(passo + 1)}>Continuar <Icone nome="direita" tamanho={16} /></button>
            : <button type="button" className={'botao botao--grande ' + (previa ? 'botao--ouro' : 'botao--principal')} disabled={!dataValida || !provaValida || salvando} onClick={salvar}>{salvando ? 'Salvando…' : previa ? 'Ver a prévia do meu cronograma' : atual ? 'Salvar ajustes' : 'Criar meu cronograma'}</button>}
          {atual && !ultimo && <button type="button" className="botao" disabled={!dataValida || !provaValida || salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar agora'}</button>}
        </div>
        <div className="pe-form__rodape">
          {aoCancelar && <button type="button" className="botao botao--fantasma" onClick={aoCancelar}>Cancelar</button>}
          {atual && aoZerar && <button type="button" className="botao botao--contorno" onClick={aoZerar}><Icone nome="reiniciar" tamanho={16} /> Começar do zero</button>}
          {atual && <button type="button" className="botao botao--fantasma pe-form__apagar" onClick={apagar}>Apagar cronograma</button>}
        </div>
        {previa && <p className="texto-2 pe-form__nota"><Icone nome="cadeado" tamanho={14} /> A prévia mostra o dia de hoje e as duas primeiras semanas. O cronograma completo, salvo e ajustado todo dia, é do assinante.</p>}
      </section>
      <ResultadoAoVivo data={dataValida ? data : null} prova={nomeProva} folgas={folgas} diasLeves={diasLeves} qtdLeve={qtdLeve} simulados={simulados} intensidade={intensidade} meta={sim?.meta ?? null} maisCai={sim?.maisCai ?? null} minutos={minutos} />
      </div>
    </div>
  )
}

/**
 * O cronograma se formando enquanto a pessoa responde: no computador, ao lado
 * do formulário; no celular, uma barra fixa no rodapé. Quando uma escolha muda
 * a meta, mostra a diferença ("e se").
 */
function ResultadoAoVivo({ data, prova, folgas, diasLeves, qtdLeve, simulados, intensidade, meta, maisCai, minutos }: {
  data: string | null; prova: string; folgas: number[]; diasLeves: number[]; qtdLeve: number; simulados: boolean; intensidade: Intensidade; meta: number | null; maisCai: number | null; minutos: number
}) {
  const dias = data ? diasAte(data) : 0
  const anterior = useRef<number | null>(null)
  const [diferenca, definirDiferenca] = useState<number | null>(null)
  useEffect(() => {
    if (meta === null) return
    if (anterior.current !== null && anterior.current !== meta) {
      definirDiferenca(meta - anterior.current)
      const t = setTimeout(() => definirDiferenca(null), 2600)
      anterior.current = meta
      return () => clearTimeout(t)
    }
    anterior.current = meta
  }, [meta])
  const diasEstudo = 7 - folgas.length
  return (
    <aside className="pe-ao-vivo" aria-live="polite" aria-label="Seu cronograma">
      <p className="pe-ao-vivo__selo">Seu cronograma</p>
      {data && meta !== null ? <>
        <p className="pe-ao-vivo__dias"><strong className="numerico">{dias}</strong> dias até a prova{prova ? ` (${prova})` : ''}</p>
        <dl className="pe-ao-vivo__lista">
          <div><dt>Num dia normal</dt><dd><b className="numerico">{meta}</b> questões <small>≈ {formatarTempo(meta * minutos)}</small>{diferenca !== null && <em className={'pe-ao-vivo__dif' + (diferenca > 0 ? ' pe-ao-vivo__dif--mais' : '')}>{diferenca > 0 ? '+' : ''}{diferenca} por dia</em>}</dd></div>
          <div><dt>Semana</dt><dd><b className="numerico">{diasEstudo}</b> dias de estudo{folgas.length ? <small>folga: {folgas.map((d) => DIAS_SEMANA[d]).join(', ')}</small> : null}{diasLeves.length ? <small>dia leve ({qtdLeve}): {diasLeves.filter((d) => !folgas.includes(d)).map((d) => DIAS_SEMANA[d]).join(', ')}</small> : null}</dd></div>
          <div><dt>Ritmo</dt><dd><b>{ROTULO_INTENSIDADE[intensidade].nome}</b>{simulados ? <small>com os OrtoQuestões Simulados</small> : <small>só questões oficiais</small>}</dd></div>
        </dl>
        {maisCai !== null && <p className="pe-ao-vivo__total">{maisCai >= 100 ? 'Cobre toda a' : `Cobre ${maisCai}% da`} <span>prioridade máxima</span> até a reta final</p>}
        <p className="pe-ao-vivo__nota">Um pouco por dia, do celular ou do computador. Atrasou, a meta sobe no máximo 25%; adiantou, alivia.</p>
      </> : <p className="pe-ao-vivo__vazio">Escolha a data da prova e o cronograma aparece aqui, se formando enquanto você responde.</p>}
    </aside>
  )
}

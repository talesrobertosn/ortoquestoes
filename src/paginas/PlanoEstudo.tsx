import { DATA_TEOT } from '../dados/calendarioProvas'
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { conferirMetaCronograma } from '../conta/feitos'
import { chamarRpc, codigoErro } from '../servicos/supabase'
import { enviarMarcas, guardarAdiantamento, marcarAvisoSimulados, obterPlano, trocarSimulados, opcoesComAdiantamento, salvarOpcoes, salvarPlano, usarPlanoSalvo } from '../conta/cronograma'
import { NovidadeSimulados } from '../componentes/NovidadeSimulados'
import { usarPremium } from '../conta/premium'
import { usarConta } from '../conta/ContextoConta'
import { avisoVistoNaConta, marcarAvisoNaConta } from '../conta/avisosVistos'
import { usarIndice } from '../dados/usarIndice'
import { FILTROS_VAZIOS, type Indice } from '../dados/tipos'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { lerHistorico, usarSessao } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { calcularPlano, diasAte, idsDaSessaoDoDia, idsDoDiaPlano, idsParaPuxar, incluiSimulados, marcarReservadas, opcoesComPuxado, proximoDiaParaPuxar, MINUTOS_POR_QUESTAO, opcoesDe, TAMANHO_MINI, type OpcoesPlano, respondidasNoAcervo, ROTULO_INTENSIDADE, type CalculoPlano, type Intensidade, type PlanoSalvo } from '../dados/planoEstudo'
import { areasDoDiaRevisao, TAMANHO_DIAGNOSTICO, calcularConstancia, contagemSimulados, contarErrosQueImportam, desempenhoPorArea, elogio, idsAquecimentoVespera, idsDiagnostico, idsErrosQueImportam, idsReativar, idsRevisaoForte, idsMiniSimulado, mapaDeRisco, minutosPorQuestao, pontosCegos, prontidaoPorArea, temasEsquecidos, formatarTempo } from '../dados/hubCronograma'
import { idsDoFoco, posicaoDaArea, type AreaIncidencia, type Foco } from '../dados/incidencia'
import { idsRevisaoHoje } from '../estado/planoRevisao'
import { usarRitmoRevisao } from '../estado/preferencias'
import { AvisoDiagnostico, AvisoEsquecimento, CartaoConstancia, CartaoDesempenho, CartaoSimulados, ComoFuncionaCompleto, HojeRetaFinal, MapaRisco } from './CronogramaHub'
import { diaCurto, textoPuxar } from '../dados/frasesAdiantar'
import { CartaoHoje, fraseAdiantadoHoje, PainelAdiantar, ComoEstouIndo, Depois, EstaSemana, ExportarCalendario, LinhaAmanha, OndeVoceEsta, porQueHoje, Prontidao, Recolhido, ResumoSemana, TourCronograma, type ItemChecklist } from './CronogramaPainel'
import { corDaArea } from '../dados/coresAreas'
import { CalendarioCronograma } from './CronogramaCalendario'
import { ConviteFicticio, FaixaFicticio, type MotivoConvite } from './CronogramaFicticio'
import { CenaTorre, CHAO_DA_PRACA } from '../componentes/cronograma/CenaTorre'
import { VisitaCronograma } from '../componentes/cronograma/VisitaCronograma'
import { vistaDoCronograma } from '../dados/vistaCronograma'
import { CONTEXTO_VAZIO, montarSessao } from '../dados/acervo'
import '../estilos/paginas/CronogramaPainel.css'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { Degustacao, SeloAssinante } from '../componentes/Premium'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/PlanoEstudo.css'
import '../estilos/paginas/Cronograma.css'
import '../estilos/paginas/CronogramaTorre.css'
import { usarDiaAtual } from '../util/usarDiaAtual'
import { chaveCivil, chaveDoDia, diaCivil, hojeBR, inicioDaChave, somarDias } from '../util/dia'
import { CHAVE_RESUMAO_HOJE, lidoHoje, RESUMAO_HOJE_VAZIO, type ResumaoHoje } from '../estado/resumaoLido'
import { juntarMarcas, marcasDoPlano, opcoesComMarcas, type MarcasDia } from '../conta/marcasDia'
import { ler } from '../estado/armazenamento'
import { IndicadorSincronia } from '../componentes/IndicadorSincronia'
import { CaixaResumos } from '../biblioteca/CaixaResumos'
import { resumosDosSubtemas, subtemasDasQuestoes, usarIndiceBiblioteca } from '../biblioteca/recomendar'
import { usarBiblioteca } from '../biblioteca/usarBiblioteca'

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const ROTULO_COBRANCA: Record<number, string> = { 4: 'prioridade máxima', 3: 'prioridade alta', 2: 'prioridade média', 1: 'prioridade baixa', 0: 'fora do ranking' }
const PROVAS = ['TEOT', 'TARO', 'ENARE R4', 'Outra prova']
/** Próxima prova teórica do TEOT e do TEPOT: vem preenchida por padrão. */
// A data também é usada pelos lembretes discretos de véspera.
/** Semanas que o não assinante vê na prévia do próprio cronograma. */
const SEMANAS_PREVIA = 2
const FORMATO_CURTA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const curta = (d: Date) => FORMATO_CURTA.format(d)
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
      idsForte: areasRevisao.length ? idsRevisaoForte(indice, respondidas, areasRevisao.map((a) => a.slug), calculo.metaMedia) : [],
      erros: contarErrosQueImportam(indice, respondidas),
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
  async function comecarHoje(c: CalculoPlano | null = calculo, p: PlanoSalvo | null | undefined = plano) {
    if (ficticio) { convidar('comecar'); return }
    if (!indice || !c?.hoje || !p) return
    // Antes de escolher as questões, traz o que foi feito nos outros aparelhos:
    // sem isso, abrir o computador logo depois de estudar no MacBook montava a
    // sessão com as mesmas questões. Sem rede, segue com o que este aparelho tem.
    if (!DEMO) { definirPreparando(true); await aguardarSincronia(8000); definirPreparando(false) }
    const atuais = DEMO ? respondidas : ler<Respondidas>('respondidas', {})
    if (!DEMO && atuais !== respondidas) { c = calcularPlano(indice, atuais, p); if (!c.hoje) return }
    const itens = c.hoje!.itens.length ? c.hoje!.itens : [{ slug: c.hoje!.slug, n: c.hoje!.n, mistura: false }]
    // Hoje foi puxado num dia anterior: a sessão é a que ficou guardada para ele. Senão, a de sempre,
    // sem as questões presas aos próximos dias puxados.
    const ids = c.puxados[hojeBR()] && c.dias[0]
      ? idsDaSessaoDoDia(c.dias[0], atuais).slice(0, 100)
      : idsDoDiaPlano(indice, itens.map((i) => ({ ...i, n: Math.min(i.n, 100) })), { ...atuais, ...marcarReservadas(c) }, incluiSimulados(p))
    if (!ids.length) return
    const filtros = { ...FILTROS_VAZIOS, temas: [...new Set(itens.map((i) => i.slug))], situacao: 'naoRespondidas' as const, embaralhar: false, limite: ids.length }
    if (!(await iniciarComAviso(filtros, ids, { origem: 'cronograma' }))) return
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
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, temas, situacao: 'naoRespondidas' as const, embaralhar: false, limite: sessaoIds.length }, sessaoIds, { origem: 'cronograma' }))) return
    navegar('/sessao')
  }
  /** Começa uma sessão já montada (diagnóstico, reta final, reativar, risco). */
  async function comecarIds(ids: string[], origem: 'cronograma' | 'diagnostico' | 'reta-final' | 'reativar', temas: string[] = []) {
    if (ficticio) { convidar('outro'); return }
    if (!ids.length) return
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, temas, embaralhar: false, limite: ids.length }, ids, { origem }))) return
    navegar('/sessao')
  }

  /** Mini-simulado: 30 questões já vistas, cronometradas (1,5 min cada). */
  async function comecarMini() {
    if (ficticio) { convidar('outro'); return }
    if (!indice) return
    const ids = idsMiniSimulado(indice, respondidas)
    if (!ids.length) return
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, embaralhar: false, limite: ids.length }, ids, { origem: 'cronograma', simulado: true, limiteSegundos: Math.round(ids.length * 90) }))) return
    marcarFeito('mini')
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
        aoErros: () => comecarIds(idsErrosQueImportam(indice, respondidas, Math.max(20, calculo.metaMedia)), 'reta-final'),
        aoAquecimento: () => comecarIds(idsAquecimentoVespera(indice, respondidas), 'reta-final'),
      },
      aoDiagnostico: () => { if (ficticio) { convidar('outro'); return } marcarDiagnostico(new Date().toISOString()); comecarIds(idsDiagnostico(indice, respondidas, simulados), 'diagnostico') },
      aoReativar: (slug: string) => comecarIds(idsReativar(indice, respondidas, slug), 'reativar', [slug]),
      aoTreinarFoco: async (area: AreaIncidencia, foco: Foco) => {
        if (ficticio) { convidar('outro'); return }
        const ids = idsDoFoco(indice, area, foco)
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
      <div className="empilha-2 pe cp cr cr--torre cf" style={CHAO_DA_PRACA}>
        <VisaoCronograma plano={plano} calculo={calculo} indice={indice} respondidas={respondidas} aberto ficticio={{ nome, aoConvidar: convidar }}
          aoComecar={() => comecarHoje()} aoAdiantar={adiantar} aoPuxar={puxarDia} hub={hub} />
        {convite && <ConviteFicticio motivo={convite} nome={nome} area={area ? { slug: area.slug, nome: area.nome } : null}
          aoTreinar={(slug) => { definirConvite(null); void treinarGratis(slug) }} aoFechar={() => definirConvite(null)} />}
        <VisitaCronograma />
      </div>
    )
  }

  if (editando || !plano || !calculo) {
    return <FormularioPlano indice={indice} respondidas={respondidas} atual={plano} aoCancelar={plano ? () => definirEditando(false) : undefined}
      aoSalvar={(novo, fazerDiagnostico) => {
        marcarAvisoSimulados(); marcarAvisoNaConta(sessaoConta?.user.user_metadata, 'cronograma-simulados'); definirPlano(novo); definirEditando(false)
        if (fazerDiagnostico) { marcarDiagnostico(new Date().toISOString()); comecarIds(idsDiagnostico(indice, respondidas, incluiSimulados(novo)), 'diagnostico') }
      }} />
  }

  return (
    <div className="empilha-2 pe cp cr cr--torre" style={CHAO_DA_PRACA}>
      {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}
      {!DEMO && <IndicadorSincronia preparando={preparando} />}
      <NovidadeSimulados plano={plano} aoMudarPlano={definirPlano} />
      <VisaoCronograma plano={plano} calculo={calculo} indice={indice} respondidas={respondidas} aberto aoComecar={() => comecarHoje()} aoAdiantar={adiantar} aoPuxar={puxarDia} pendente={sessaoPendente(sessao)} hub={hub} aoAjustar={() => definirEditando(true)} />
      {/* A coruja ou o gato, de vez em quando, sentados num botão (easter egg). */}
      <VisitaCronograma />
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
  if (!sessao || sessao.concluidaEm || !sessao.origem) return null
  if (chaveDoDia(sessao.criadaEm) !== chaveDoDia(agora)) return null
  const feitas = Object.keys(sessao.respostas).length
  if (feitas >= sessao.ids.length) return null
  return { feitas, total: sessao.ids.length, tema: sessao.filtros.temas[0] ?? '', simulado: !!sessao.simulado }
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

export function VisaoCronograma({ plano, calculo, indice, respondidas, aberto, aoComecar, aoAdiantar, aoPuxar, pendente = null, hub = null, aoAjustar, ficticio = null }: { plano: PlanoSalvo; calculo: CalculoPlano; indice?: Indice; respondidas?: Respondidas; aberto: boolean; aoComecar?: () => void; aoAdiantar?: (n: number) => void; /** Puxar um dia ("AAAA-MM-DD"): abre a sessão com as questões dele. */ aoPuxar?: (dia: string) => void; pendente?: { feitas: number; total: number; tema: string; simulado?: boolean } | null; hub?: HubDados | null; aoAjustar?: () => void; /** Cenário fictício de quem não assina: o painel do assinante com um plano de exemplo (CronogramaFicticio.tsx). */ ficticio?: { nome: string; aoConvidar: (motivo: MotivoConvite) => void } | null }) {
  // O tour só é lido e gravado no cronograma do assinante (aberto): a vitrine não toca nele,
  // para ele aparecer sozinho na primeira visita depois de assinar.
  const [tourVisto, definirTourVisto] = usarArmazenado<boolean>('cronograma:tour-v2', false)
  // O resumão marca a área como lida hoje (botão "Li esta área" ou um minuto com ela aberta).
  const [resumaoHoje] = usarArmazenado<ResumaoHoje>(CHAVE_RESUMAO_HOJE, RESUMAO_HOJE_VAZIO)
  const minutos = hub?.minutosQuestao ?? MINUTOS_POR_QUESTAO
  const { sessao: sessaoConta } = usarConta()
  // Quem já tinha fechado o tour neste aparelho leva o "já vi" para a conta.
  useEffect(() => { if (aberto && !ficticio && tourVisto && sessaoConta) marcarAvisoNaConta(sessaoConta.user.user_metadata, 'cronograma-tour') }, [aberto, ficticio, tourVisto, sessaoConta])
  const naRetaFinalComRoteiro = aberto && !!hub && (calculo.fase === 'revisao' || calculo.fase === 'prova' || calculo.fase === 'vespera')
  const semanas = calculo.semanas.filter((s) => s.diasEstudo > 0)
  const visiveis = aberto ? semanas : semanas.slice(0, SEMANAS_PREVIA)
  const feitos = hub?.feitosDia ?? { data: '' }
  // Calendário do mês (16/10/2026): só no cronograma do assinante; #/cronograma?calendario=1 abre direto.
  const temCalendario = aberto && !!indice && !!respondidas
  // Desde 16/10/2026 ele fica sempre aberto na página (embaixo de Hoje); "ver no calendário" só rola até ele.
  const abrirCalendario = temCalendario ? () => document.getElementById('calendario')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }) : undefined
  useEffect(() => {
    if (!temCalendario || !location.hash.includes('calendario=1')) return
    const t = setTimeout(() => abrirCalendario?.(), 300)
    return () => clearTimeout(t)
  }, [temCalendario]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── A lista de hoje ──
  const itensDia = calculo.hoje?.itens ?? []
  const principal = itensDia.find((i) => !i.mistura) ?? itensDia[0] ?? null
  const mistura = itensDia.filter((i) => i !== principal)
  const folgaHoje = calculo.tipoHoje === 'folga'
  const metaFeita = calculo.metaDiaria > 0 && calculo.faltaHoje === 0
  const corHoje = corDaArea(principal?.slug ?? calculo.dias.find((d) => d.itens.length)?.itens[0]?.slug)
  // O resumo da Biblioteca que ensina os assuntos de hoje (pelos subtemas das questões do dia).
  const biblioteca = usarIndiceBiblioteca()
  const { leituras } = usarBiblioteca()
  const subtemasHoje = useMemo(() => subtemasDasQuestoes(indice, (calculo.hoje?.itens ?? []).flatMap((i) => i.ids)), [indice, calculo.hoje])
  // O dia escolhido no calendário (1/11/2026): os resumos ao lado acompanham o dia tocado; hoje, como antes.
  const [diaEscolhido, definirDiaEscolhido] = useState<{ data: Date; ehHoje: boolean; ids: string[] } | null>(null)
  const subtemasEscolhido = useMemo(() => (diaEscolhido && !diaEscolhido.ehHoje && diaEscolhido.ids.length ? subtemasDasQuestoes(indice, diaEscolhido.ids) : subtemasHoje), [indice, diaEscolhido, subtemasHoje])
  const rotuloEscolhido = diaEscolhido && !diaEscolhido.ehHoje && diaEscolhido.ids.length ? diaEscolhido.data.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'numeric' }).replace('.', '') : undefined
  const resumoHoje = resumosDosSubtemas(biblioteca, subtemasHoje)[0] ?? null
  const lista: ItemChecklist[] = []
  if (!calculo.provaPassou && !calculo.naRetaFinal) {
    if (principal) lista.push({ id: 'resumao', titulo: 'Frases que caem do tema', texto: `As frases "Na prova" de ${principal.nome.toLowerCase()}, para chegar às questões sabendo o que procurar.`, minutos: aberto ? 4 : null, estado: !ficticio && lidoHoje(resumaoHoje, principal.slug) || (hub?.resumaoLido ?? []).includes(principal.slug) ? 'feito' : 'afazer', acao: aberto ? { rotulo: 'Ler', href: href(`/resumos/frases?tema=${principal.slug}`) } : undefined })
    if (resumoHoje) {
      const l = leituras[resumoHoje.id]
      lista.push({ id: 'resumo-biblioteca', titulo: 'Resumo do capítulo', texto: <>{resumoHoje.titulo}: o capítulo na ordem em que a prova cobra, com as questões que já caíram no texto.{l?.progresso && !l.concluidoEm ? ` ${l.progresso}% lido.` : ''}</>, minutos: Math.max(1, Math.round(resumoHoje.minutos * (1 - (l?.progresso ?? 0) / 100))), estado: l?.concluidoEm || (l?.progresso ?? 0) >= 95 ? 'feito' : 'afazer', acao: { rotulo: l?.progresso ? 'Continuar' : 'Ler', href: href(`/resumos/${resumoHoje.id}`) }, opcional: true, icone: 'livro' })
    }
    const jaAdiantado = calculo.adiantadoHoje > 0 ? ` ${fraseAdiantadoHoje(calculo)}` : ''
    // A vitrine mostra o jeito do dia, sem os números (orientação de 14/10): quantas e quanto tempo é do assinante.
    if (calculo.metaDiaria > 0 && !aberto) lista.push({
      id: 'novas', titulo: 'Questões novas',
      texto: <>{principal ? <>{principal.nome}{mistura.length ? <>, com {mistura.map((m) => m.nome).join(' e ')} para misturar</> : null}</> : 'Do cronograma'}{incluiSimulados(plano) ? ', com alguns OrtoQuestões Simulados no meio' : ''}.</>,
      minutos: null, estado: 'afazer',
    })
    else if (calculo.metaDiaria > 0) lista.push({
      id: 'novas', titulo: `${calculo.metaDiaria} questões novas`,
      texto: <>{principal && !metaFeita ? <>{mistura.length ? (calculo.adiantarFalta > 0 ? <>{principal.nome}, com {mistura.map((m) => m.nome).join(' e ')} para misturar</> : <>{principal.n} de {principal.nome} e {mistura.reduce((s, m) => s + m.n, 0)} de {mistura.map((m) => m.nome).join(' e ')} para misturar</>) : principal.nome}</> : 'Do cronograma'}{incluiSimulados(plano) ? ', com alguns OrtoQuestões Simulados no meio' : ''}. {calculo.feitasHoje > 0 ? `${Math.min(calculo.feitasHoje, calculo.metaDiaria)} de ${calculo.metaDiaria} feitas.` : ''}{jaAdiantado}</>,
      minutos: calculo.metaDiaria * minutos, estado: metaFeita ? 'feito' : calculo.feitasHoje > 0 || pendente ? 'agora' : 'afazer',
      progresso: { feitas: Math.min(calculo.feitasHoje, calculo.metaDiaria), total: calculo.metaDiaria },
    })
    else if (calculo.adiantadoHoje > 0) lista.push({ id: 'novas', titulo: 'Hoje já está adiantado', texto: `Você adiantou ${calculo.adiantadoHoje} questões; hoje sua meta é 0 (era ${calculo.metaHojeSemAdiantar}). Descanse ou adiante mais.`, minutos: null, estado: 'feito' })
    const adiantando = Math.max(calculo.extraHoje, calculo.adiantarPedido)
    if (adiantando > 0 && aberto) lista.push({
      id: 'adiantadas', titulo: `+${adiantando} adiantadas`,
      texto: calculo.adiantarFalta > 0 ? `Pedidas para adiantar: ${Math.min(calculo.extraHoje, adiantando)} de ${adiantando} feitas.` : 'Feitas além da meta. Saem dos próximos dias.',
      minutos: calculo.adiantarFalta > 0 ? adiantando * minutos : null, estado: calculo.adiantarFalta > 0 ? (calculo.extraHoje > 0 ? 'agora' : 'afazer') : 'feito',
      progresso: calculo.adiantarFalta > 0 ? { feitas: Math.min(calculo.extraHoje, adiantando), total: adiantando } : undefined,
    })
    if (calculo.miniHoje) lista.push({ id: 'mini', titulo: aberto ? `Mini-simulado de ${TAMANHO_MINI} questões` : 'Mini-simulado', texto: 'Cronometrado, com o que você já viu nas últimas semanas, misturado como na prova. Os seus erros e dúvidas vêm primeiro.', minutos: aberto ? TAMANHO_MINI * 1.5 : null, estado: feitos.mini ? 'feito' : 'afazer', acao: aberto && hub ? { rotulo: 'Começar', aoClicar: hub.aoMini } : undefined })
  }
  if (hub && !calculo.provaPassou && !calculo.naRetaFinal) {
    // Revisões e flashcards ajudam a fixar, mas não são obrigatórios: ficam à parte, sem contar na meta.
    if (hub.revisoesHoje > 0) lista.push({ id: 'revisoes', titulo: `${hub.revisoesHoje} ${hub.revisoesHoje === 1 ? 'revisão' : 'revisões'}`, texto: `Erros, chutes e dúvidas que voltam hoje · ~${formatarTempo(hub.revisoesHoje * minutos)}`, minutos: hub.revisoesHoje * minutos, estado: 'afazer', opcional: true, icone: 'reiniciar', acao: { rotulo: 'Revisar', href: href('/revisao') } })
    lista.push({ id: 'flashcards', titulo: 'Flashcards', texto: 'Uma rodada curta para fixar o que você errou · ~5 min', minutos: 5, estado: feitos.flashcards ? 'feito' : 'afazer', opcional: true, icone: 'raio', acao: { rotulo: 'Abrir', href: href('/flashcards'), aoClicar: () => hub.aoMarcar('flashcards') } })
  }

  // ── O botão único ──
  let botao: Parameters<typeof CartaoHoje>[0]['botao'] = null
  if (!aberto) botao = { rotulo: 'Criar meu cronograma', detalhe: 'Exclusivo para assinantes', href: href('/assinatura'), ouro: true }
  else if (pendente) botao = { rotulo: `Continuar: faltam ${pendente.total - pendente.feitas} questões`, detalhe: `Você parou na ${pendente.feitas + 1}ª. As que já respondeu ficam salvas.`, href: href('/sessao') }
  else if (calculo.hoje && calculo.faltaHoje + calculo.adiantarFalta > 0) {
    const n = calculo.faltaHoje + calculo.adiantarFalta
    const so = calculo.faltaHoje === 0
    botao = { rotulo: so ? `Continuar: faltam ${n} adiantadas` : calculo.feitasHoje > 0 ? `Continuar: faltam ${n} questões` : `Começar: ${n} questões`, detalhe: `${principal ? `${principal.nome}${mistura.length ? ` + ${mistura.map((m) => m.nome).join(' e ')}` : ''}` : 'Do cronograma'}${calculo.adiantarFalta > 0 && !so ? `, com ${calculo.adiantarFalta} adiantadas` : ''} · ~${formatarTempo(n * minutos)}`, aoClicar: aoComecar }
  }
  else if (calculo.miniHoje && !feitos.mini && hub) botao = { rotulo: 'Fazer o mini-simulado', detalhe: `${TAMANHO_MINI} questões · ~45 min`, aoClicar: hub.aoMini }
  // Hoje terminado (ou folga): o botão passa a puxar o próximo dia de estudo (pedido do Tales, 19/10/2026),
  // para quem não sabe que dá para tocar no dia no calendário.
  const proximoPuxar = aberto && aoPuxar && !pendente ? proximoDiaParaPuxar(calculo) : null
  let acaoTopo = botao
  if (!botao && proximoPuxar) {
    const t = textoPuxar(proximoPuxar)
    const aoClicar = () => aoPuxar!(chaveCivil(proximoPuxar.data))
    botao = { rotulo: t.rotulo, detalhe: `${t.detalhe} · ~${formatarTempo(proximoPuxar.total * minutos)} · contam para ${diaCurto(proximoPuxar.data).split(',')[0]}`, aoClicar, ouro: true }
    // No topo cabe pouco: o mesmo botão, com a data embaixo.
    const comecado = !!proximoPuxar.puxado?.feitas
    const amanha = t.rotulo.includes('amanhã')
    const semana = diaCurto(proximoPuxar.data).split(',')[0]
    acaoTopo = { rotulo: comecado ? `Continuar ${semana}` : amanha ? 'Puxar amanhã' : `Puxar ${semana}`, detalhe: `${diaCurto(proximoPuxar.data)} · ${t.detalhe}`, aoClicar, ouro: true }
  }
  // Meta feita: o destaque passa a ser o painel de adiantar (e as revisões ficam como extra, sem cobrança).
  const podeAdiantar = aberto && !!aoAdiantar && !calculo.naRetaFinal && !calculo.provaPassou && calculo.restante > 0
  const painelAdiantar = podeAdiantar && hub ? <PainelAdiantar calculo={calculo} minutos={minutos} destaque={!botao} salvando={hub.salvandoOpcoes} aoAdiantar={aoAdiantar!} aoCancelar={hub.aoCancelarAdiantar} /> : null

  const tituloHoje = calculo.provaPassou ? 'A prova chegou' : folgaHoje ? 'Hoje é folga' : !aberto && principal ? principal.nome : calculo.restante === 0 && !calculo.naRetaFinal ? 'Você cumpriu o cronograma inteiro' : calculo.metaDiaria === 0 && calculo.adiantadoHoje > 0 ? 'Hoje já está adiantado' : metaFeita && !calculo.miniHoje ? 'Meta de hoje feita' : principal ? principal.nome : calculo.miniHoje ? 'Dia de mini-simulado' : 'Hoje'
  const porQue = folgaHoje ? 'Dia de descanso no seu plano: a meta foi espalhada pelos outros dias. Se quiser, adiante o próximo dia de estudo.'
    : !aberto ? (principal ? porQueHoje(calculo, principal.slug, plano.prova, true) : '')
    : calculo.metaDiaria === 0 && calculo.adiantadoHoje > 0 ? 'Você fez as questões de hoje num dia anterior. Pode descansar ou adiantar mais.'
    : metaFeita ? `Feito: ${calculo.metaDiaria} questões. Revisões e flashcards são extras, se sobrar tempo.`
    : calculo.tipoHoje === 'leve' ? `Dia leve (plantão): só ${calculo.metaDiaria} questões. ${principal ? porQueHoje(calculo, principal.slug, plano.prova).replace('Por que hoje: ', 'A área: ') : ''}`
    : calculo.tipoHoje === 'dificil' ? `Semana difícil: só o dia mínimo (${calculo.metaDiaria} questões), para não quebrar a sequência.`
    : principal ? porQueHoje(calculo, principal.slug, plano.prova) : calculo.restante === 0 ? 'Mantenha a revisão em dia e faça o Simulado Nacional do mês.' : ''

  // O nome e duas frases com os dados da pessoa no topo (adendo do dono, 18/10/2026), com o tato
  // dos e-mails (docs/emails/TOM.md): nada abaixo de 10 questões, nenhum acerto abaixo de 50%, sem cobrança.
  const nome = primeiroNome(sessaoConta?.user.user_metadata?.nome)
  const recados: ReactNode[] = []
  if (aberto && !calculo.provaPassou) {
    if (calculo.naRetaFinal) recados.push(<>Reta final: agora é revisar o que mais cai, sem conteúdo novo.</>)
    else if (folgaHoje) recados.push(<>Hoje é dia de descanso. {calculo.amanha?.total ? <>Amanhã o plano segue com <b>{calculo.amanha.total >= 10 ? `${calculo.amanha.total} questões` : 'poucas questões'}</b>.</> : 'O plano segue no próximo dia de estudo.'}</>)
    else if (metaFeita) recados.push(<>A meta de hoje está feita. O que vier agora adianta os próximos dias.</>)
    else if (calculo.metaDiaria > 0) recados.push(<>A meta de hoje: <b>{calculo.metaDiaria >= 10 ? `${calculo.metaDiaria} questões` : 'poucas questões'}</b>, cerca de {formatarTempo(calculo.metaDiaria * minutos)}.</>)
    const forte = (hub?.desempenho ?? []).filter((a) => a.respondidas >= 15 && a.acerto >= 50 && a.nome !== hub?.semana?.fraca).sort((a, b) => b.acerto - a.acerto)[0]
    if (forte) recados.push(ficticio ? <>Neste exemplo, a área mais forte é <b>{forte.nome}</b>, com {forte.acerto}% de acerto.</> : <>Sua área mais forte até aqui: <b>{forte.nome}</b>, com {forte.acerto}% de acerto.</>)
  }

  return <>
    {ficticio && <FaixaFicticio nome={ficticio.nome} />}
    {!aberto && <p className="pe-aviso-previa"><Icone nome="cadeado" tamanho={15} /> Um exemplo do cronograma até o {plano.prova}, montado com o seu histórico. Montar e seguir o seu, com a data, o ritmo e a semana que você escolher, é exclusivo para assinantes.</p>}

    {/* O botão do dia também no topo: o calendário vem antes do cartão Hoje e o empurra para baixo. */}
    {/* A Torre do Tempo (31/10/2026): o cenário pintado do topo. O tour da primeira visita fica curto, logo abaixo
        do botão do dia, com o "Entendi" e o registro de sempre. */}
    <OndeVoceEsta plano={plano} calculo={calculo} previa={!aberto} selo={ficticio ? 'Cenário fictício' : undefined} aoAjustar={aberto ? aoAjustar : undefined} acao={naRetaFinalComRoteiro ? null : acaoTopo} nome={nome} recados={recados}
      rodape={aberto && hub?.semana ? <ResumoSemana {...hub.semana} /> : undefined} cena={<CenaTorre />}
      depois={aberto && !ficticio && !tourVisto && !avisoVistoNaConta(sessaoConta?.user.user_metadata, 'cronograma-tour') ? <TourCronograma compacto aoFechar={() => { definirTourVisto(true); marcarAvisoNaConta(sessaoConta?.user.user_metadata, 'cronograma-tour') }} /> : undefined} />

    {/* Prioridade da página (Tales, 17/10/2026): o calendário grande vem logo abaixo de "Onde você está";
        o detalhe de hoje, a coluna lateral e os recolhidos ficam depois. */}
    {temCalendario && <CalendarioCronograma embutido ficticio={!!ficticio} nome={nome} plano={plano} calculo={calculo} indice={indice!} respondidas={respondidas!} minutos={minutos} revisoesHoje={hub?.revisoesHoje ?? 0}
      acoes={{ aoComecar, pendente, aoPuxar: podeAdiantar ? aoPuxar : undefined, proximo: proximoPuxar, salvando: hub?.salvandoOpcoes }} aoSelecionar={definirDiaEscolhido} />}

    <div className="cp-colunas">
      <div className="cp-col cp-col--principal">
        <div className="cp-ordem-1">{naRetaFinalComRoteiro && hub
          ? <HojeRetaFinal calculo={calculo} acoes={hub.retaFinal} minutos={minutos} />
          : <CartaoHoje calculo={calculo} titulo={tituloHoje} porQue={porQue} assuntos={principal ? [...principal.assuntos, ...mistura.flatMap((m) => m.assuntos.slice(0, 1))] : []} itens={lista} botao={botao} cor={corHoje} adiantar={painelAdiantar}
            aviso={folgaHoje && aberto && aoAjustar ? <p className="cp-hoje__ajustar"><span>Vai estudar hoje ou quer mudar as folgas?</span><button type="button" className="botao" onClick={aoAjustar}><Icone nome="lapis" tamanho={15} /> Ajustar o cronograma</button></p> : resumoHoje && !(leituras[resumoHoje.id]?.concluidoEm) ? <a className="cp-hoje__resumo" href={href(`/resumos/${resumoHoje.id}`)}><Icone nome="livro" tamanho={16} /><span><strong>Antes das questões, leia o resumo</strong><small>{resumoHoje.titulo} · ~{resumoHoje.minutos} min · o que já caiu, ano a ano</small></span><Icone nome="direita" tamanho={15} /></a> : undefined} />}</div>
        {(hub?.mostrarDiagnostico || (hub?.esquecidos.length ?? 0) > 0) && <div className="cp-ordem-2">
          {hub?.mostrarDiagnostico && <AvisoDiagnostico aoFazer={hub.aoDiagnostico} simulados={incluiSimulados(plano)} />}
          {hub && <AvisoEsquecimento esquecidos={hub.esquecidos} aoReativar={hub.aoReativar} />}
        </div>}
        {aberto && !temCalendario && <div className="cp-ordem-6"><ComoEstouIndo calculo={calculo} constancia={hub?.constancia ?? null} minutosQuestao={minutos} /></div>}
      </div>
      <div className="cp-col cp-col--lado">
        {!calculo.provaPassou && <div className="cp-ordem-3"><CaixaResumos subtemasHoje={subtemasEscolhido} rotuloDia={rotuloEscolhido} /></div>}
        {aberto && !calculo.naRetaFinal && !calculo.provaPassou && <div className="cp-ordem-3"><LinhaAmanha dia={calculo.amanha} /></div>}
        {temCalendario && <div className="cp-ordem-4"><ComoEstouIndo calculo={calculo} constancia={hub?.constancia ?? null} minutosQuestao={minutos} /></div>}
        {!calculo.naRetaFinal && !calculo.provaPassou && <div className="cp-ordem-4"><EstaSemana calculo={calculo} plano={plano} constancia={hub?.constancia ?? null} aoSemanaDificil={aberto && hub ? hub.aoSemanaDificil : undefined} salvando={hub?.salvandoOpcoes} simples={!aberto} compacta={temCalendario} /></div>}
        {!calculo.provaPassou && !temCalendario && <div className="cp-ordem-5">{aberto
          ? <Depois calculo={calculo} plano={plano} detalhe={<SemanaASemana semanas={visiveis} aberto calculo={calculo} />} aoVerCalendario={abrirCalendario} />
          : <div className="cp-previa-depois">
              <Degustacao className="pe-degustacao" titulo="O resto é do assinante" texto={<ul className="cp-vitrine-lista">
                <li>Amanhã e as semanas até a prova, com os marcos</li>
                <li>A sua data, o seu tempo por dia, folgas e dias de plantão</li>
                <li>Ajuste automático quando atrasa ou adianta</li>
                <li>Semana difícil, mini-simulados e reta final</li>
                <li>Desempenho, prontidão e mapa de risco por área</li>
              </ul>} acao={null}>
                <Depois calculo={calculo} plano={plano} maximo={3} semMais />
              </Degustacao>
            </div>}</div>}
      </div>
    </div>

        {aberto && hub && <div className="cp-recolhidos cp-recolhidos--grade">
          <Recolhido titulo="Constância: os últimos 14 dias" icone="fogo"><CartaoConstancia constancia={hub.constancia} elogio={hub.elogio} /></Recolhido>
          <Recolhido titulo="Desempenho e prontidão por área" icone="grafico"><Prontidao areas={hub.prontidao} /><CartaoDesempenho areas={hub.desempenho} media={hub.media} /></Recolhido>
          <Recolhido titulo="Mapa de risco" icone="alvo"><MapaRisco riscos={hub.riscos} cegos={hub.cegos} aoTreinar={hub.aoTreinarFoco} /></Recolhido>
          <Recolhido titulo="OrtoQuestões Simulados" icone="estrela"><CartaoSimulados plano={plano} feitas={hub.simulados.feitas} total={hub.simulados.total} acerto={hub.simulados.acerto} aoTrocar={hub.aoTrocarSimulados} /></Recolhido>
          {!calculo.provaPassou && <Recolhido titulo="Até a prova, semana a semana" icone="rota"><Depois calculo={calculo} plano={plano} detalhe={<SemanaASemana semanas={visiveis} aberto calculo={calculo} />} /></Recolhido>}
          {!ficticio && <Recolhido titulo="Levar para o calendário do celular" icone="calendario"><ExportarCalendario calculo={calculo} plano={plano} /></Recolhido>}
          {/* Recolhido sempre: o tour de 3 partes já explica a página na primeira visita. */}
          <ComoFuncionaCompleto aberto={false} plano={plano} />
        </div>}

    {aberto && <p className="cr-rodape">
      <a className="cr-rodape__link" href={href('/temas-que-mais-caem')}><Icone nome="grafico" tamanho={16} /> Temas que mais caem</a>
    </p>}
  </>
}

/** A lista detalhada de cada semana: os assuntos, o porquê e quanto cada um cai. */
function SemanaASemana({ semanas, aberto, calculo }: { semanas: CalculoPlano['semanas']; aberto: boolean; calculo: CalculoPlano }) {
  return (
    <section className="pe-semanas" aria-label="Semana a semana, em detalhe">
      {aberto && <header className="pe-semanas__cabeca"><div><h2>Semana a semana, em detalhe</h2><p className="pe-semanas__dica">Toque numa semana para ver os assuntos, o porquê e quanto cada um cai.</p></div><SeloAssinante /></header>}
      <ol className="pe-linha">
        {semanas.map((s, i) => (
          <li key={i} className={'pe-semana pe-semana--detalhe' + (s.atual ? ' pe-semana--atual' : '')}>
            <details>
              <summary className="pe-semana__linha">
                <span className="pe-semana__data">{curta(s.inicio)} – {curta(s.fim)}{s.atual && <em>esta semana</em>}</span>
                <span className="pe-semana__temas">
                  {s.temas.length ? s.temas.map((t) => <span key={t.slug} className="pe-chip" style={{ borderLeft: `4px solid ${corDaArea(t.slug)}` }}>{t.nome}<b className="numerico">{t.n}</b></span>) : <span className="texto-2">Folga do cronograma: revisão e questões livres.</span>}
                </span>
                <span className="pe-semana__total numerico">{s.total}<Icone nome="baixo" tamanho={14} /></span>
              </summary>
              {s.temas.length > 0 && <div className="pe-semana__corpo">
                <p className="pe-semana__explica">{s.diasEstudo} {s.diasEstudo === 1 ? 'dia' : 'dias'} de estudo, cerca de <b>{Math.round(s.total / Math.max(1, s.diasEstudo))} questões por dia</b>.</p>
                {s.temas.map((t) => (
                  <div key={t.slug} className="pe-semana__tema">
                    <div className="pe-semana__tema-cabeca">
                      <p className="pe-semana__tema-nome"><strong>{t.nome}</strong><span className="numerico">{t.n} questões</span></p>
                      {t.posicaoArea && <span className="pe-semana__area">{t.posicaoArea}ª área em número de questões</span>}
                    </div>
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
                    {t.depois.length > 0 && <p className="pe-semana__depois"><Icone nome="direita" tamanho={14} /> Nas próximas semanas de {t.nome.toLowerCase()}: {t.depois.join(', ')}.</p>}
                  </div>
                ))}
              </div>}
            </details>
          </li>
        ))}
        {aberto && !calculo.provaPassou && calculo.diasRetaFinal > 7 && <li className="pe-semana pe-semana--final"><span className="pe-semana__data">{curta(calculo.inicioRetaFinal)} – {curta(new Date(calculo.inicioModoProva.getTime() - 86_400_000))}</span><div className="pe-semana__temas"><span className="pe-chip pe-chip--final">Revisão forte: erros, dúvidas e o que mais cai</span></div><span className="pe-semana__total"><Icone nome="reiniciar" tamanho={16} /></span></li>}
        {aberto && !calculo.provaPassou && <li className="pe-semana pe-semana--final"><span className="pe-semana__data">{curta(calculo.inicioModoProva)} – véspera</span><div className="pe-semana__temas"><span className="pe-chip pe-chip--final">Modo prova: simulado, erros que importam e resumão</span></div><span className="pe-semana__total"><Icone nome="bandeira" tamanho={16} /></span></li>}
      </ol>
    </section>
  )
}

function FormularioPlano({ indice, respondidas, atual, aoSalvar, aoCancelar, previa = false }: {
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
  const [intensidade, definirIntensidade] = useState<Intensidade>(atual?.intensidade ?? 'firme')
  const [folgas, definirFolgas] = useState<number[]>(atual?.folgas ?? [0])
  const [simulados, definirSimulados] = useState(incluiSimulados(atual))
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
    // O que já foi feito hoje (em qualquer aparelho) continua feito depois de editar o plano.
    ...(atual?.opcoes?.marcasDia ? { marcasDia: atual.opcoes.marcasDia } : {}),
    ...(provaExtra.nome.trim() && /^\d{4}-\d{2}-\d{2}$/.test(provaExtra.data) ? { provaExtra: { nome: provaExtra.nome.trim().slice(0, 30), data: provaExtra.data } } : {}),
  })
  // As três intensidades simuladas com as escolhas atuais: meta, tempo e o que cobre.
  // A data é digitada: as três simulações (o cálculo inteiro, três vezes) seguem
  // a digitação com folga, sem travar o campo a cada tecla.
  // Todas as escolhas passam adiadas (não só a data): tocar numa folga ou num dia leve responde
  // na hora e as simulações chegam logo depois, sem travar o toque.
  const escolhas = useMemo(() => ({ data, folgas, simulados, op: opcoes() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, folgas, simulados, diasLeves, qtdLeve, comecarPor, dominadas.join(','), provaExtra.nome, provaExtra.data])
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
    if (!dataValida || salvando) return
    const base = respondidasNoAcervo(indice, respondidas, simulados)
    if (previa) {
      aoSalvar({ data_prova: data, intensidade, folgas, prova, base_respondidas: base, criado_em: new Date().toISOString(), incluir_simulados: simulados, opcoes: opcoes() })
      return
    }
    // A contagem do plano parte das respostas deste aparelho: se ele ainda não
    // recebeu as dos outros, a base sairia baixa para sempre, em todos eles.
    if (!sincronizado) { definirErro('Aguarde alguns segundos: seu progresso ainda está sincronizando.'); return }
    definirSalvando(true); definirErro('')
    try {
      // Relê o plano: outro aparelho pode ter adiantado o dia ou marcado a semana difícil.
      const fresco = atual ? await obterPlano() : null
      // Trocar a escolha dos simulados muda o tamanho do acervo do plano: a contagem recomeça.
      const mudouSimulados = !!fresco && incluiSimulados(fresco) !== simulados
      const recomecando = !fresco || recomecar || mudouSimulados
      const anteriores = opcoesDe(fresco)
      const novasOpcoes: OpcoesPlano = { ...opcoes(), semanasDificeis: anteriores.semanasDificeis, ...(recomecando ? {} : { adiantados: anteriores.adiantados }) }
      const salvo = await salvarPlano({ p_data_prova: data, p_intensidade: intensidade, p_folgas: folgas, p_prova: prova, p_base: base, p_recomecar: recomecando }, simulados, novasOpcoes)
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
    { titulo: 'Qual prova e quando?', curto: 'Prova', pronto: dataValida },
    { titulo: 'Quanto tempo por dia?', curto: 'Tempo', pronto: true },
    { titulo: 'Como é a sua semana?', curto: 'Semana', pronto: true },
    { titulo: 'Por onde começar?', curto: 'Prioridades', pronto: true },
  ]
  const ultimo = passo === passos.length - 1
  const sim = simulacoes?.[intensidade]

  return (
    <div className="empilha-2 pe cr-form cr--torre" style={CHAO_DA_PRACA}>
      <section className="pe-heroi pe-heroi--convite pe-heroi--form pe-heroi--torre">
        {/* A Torre do Tempo em faixa curta: o relógio à vista, sem gastar uma dobra antes do primeiro campo. */}
        <CenaTorre />
        <div>
          <p className="tr-heroi__selo">{atual ? 'Ajustar o cronograma' : 'Seu estudo até a prova'}</p>
          <h1 className="pe-heroi__nome">Cronograma</h1>
          <p>{nome ? `${nome}, quatro` : 'Quatro'} perguntas e ele diz <strong>o que estudar em cada dia</strong>, começando pelo que mais cai, misturando as áreas e terminando com a <strong>reta final</strong>.{previa ? ' Veja a prévia do seu no fim.' : ''}</p>
        </div>
      </section>
      <div className="pe-montar">
      <section className="cartao cartao__corpo pe-form pe-form--passos">
        <ol className="pe-passos" aria-label="Passos">
          {passos.map((p, i) => <li key={p.curto}><button type="button" className={'pe-passos__item' + (i === passo ? ' pe-passos__item--atual' : i < passo ? ' pe-passos__item--feito' : '')} aria-current={i === passo ? 'step' : undefined} disabled={i > 0 && !dataValida} onClick={() => definirPasso(i)}><span className="numerico">{i < passo ? '✓' : i + 1}</span>{p.curto}</button></li>)}
        </ol>
        <h2 className="pe-form__titulo">{passos[passo].titulo}</h2>

        {passo === 0 && <div className="pe-form__campos">
          <div className="pe-form__linha">
            <label className="campo">Prova<select className="entrada" value={PROVAS.includes(prova) ? prova : 'Outra prova'} onChange={(e) => definirProva(e.target.value)}>{PROVAS.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label className="campo">Data da prova<input className="entrada" type="date" min={amanhaIso()} value={data} onChange={(e) => definirData(e.target.value)} /></label>
          </div>
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
          {atual && incluiSimulados(atual) !== simulados && <p className="pe-form__resumo"><Icone nome="relogio" tamanho={15} /> Trocar esta opção recomeça a contagem do cronograma a partir de hoje.</p>}
          {!previa && !atual && <label className="caixa"><input type="checkbox" checked={diagnostico} onChange={(e) => definirDiagnostico(e.target.checked)} /><span>Começar com o <b>diagnóstico de {TAMANHO_DIAGNOSTICO} questões</b> (uns 45 minutos): o cronograma já sabe onde você está mais fraco desde o primeiro dia.</span></label>}
          {atual && <label className="caixa"><input type="checkbox" checked={recomecar} onChange={(e) => definirRecomecar(e.target.checked)} /><span>Recomeçar a contagem hoje (zera o "à frente ou atrás do cronograma")</span></label>}
        </div>}

        {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}
        <div className="pe-form__navegacao">
          {passo > 0 && <button type="button" className="botao botao--fantasma" onClick={() => definirPasso(passo - 1)}><Icone nome="esquerda" tamanho={16} /> Voltar</button>}
          {!ultimo
            ? <button type="button" className="botao botao--principal botao--grande" disabled={!passos[passo].pronto} onClick={() => definirPasso(passo + 1)}>Continuar <Icone nome="direita" tamanho={16} /></button>
            : <button type="button" className={'botao botao--grande ' + (previa ? 'botao--ouro' : 'botao--principal')} disabled={!dataValida || salvando} onClick={salvar}>{salvando ? 'Salvando…' : previa ? 'Ver a prévia do meu cronograma' : atual ? 'Salvar ajustes' : 'Criar meu cronograma'}</button>}
          {atual && !ultimo && <button type="button" className="botao" disabled={!dataValida || salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar agora'}</button>}
        </div>
        <div className="pe-form__rodape">
          {aoCancelar && <button type="button" className="botao botao--fantasma" onClick={aoCancelar}>Cancelar</button>}
          {atual && <button type="button" className="botao botao--fantasma pe-form__apagar" onClick={apagar}>Apagar cronograma</button>}
        </div>
        {previa && <p className="texto-2 pe-form__nota"><Icone nome="cadeado" tamanho={14} /> A prévia mostra o dia de hoje e as duas primeiras semanas. O cronograma completo, salvo e ajustado todo dia, é do assinante.</p>}
      </section>
      <ResultadoAoVivo data={dataValida ? data : null} prova={prova} folgas={folgas} diasLeves={diasLeves} qtdLeve={qtdLeve} simulados={simulados} intensidade={intensidade} meta={sim?.meta ?? null} maisCai={sim?.maisCai ?? null} minutos={minutos} />
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
          <div><dt>Num dia normal</dt><dd><b className="numerico">{meta}</b> questões novas <small>≈ {formatarTempo(meta * minutos)}</small>{diferenca !== null && <em className={'pe-ao-vivo__dif' + (diferenca > 0 ? ' pe-ao-vivo__dif--mais' : '')}>{diferenca > 0 ? '+' : ''}{diferenca} por dia</em>}</dd></div>
          <div><dt>Semana</dt><dd><b className="numerico">{diasEstudo}</b> dias de estudo{folgas.length ? <small>folga: {folgas.map((d) => DIAS_SEMANA[d]).join(', ')}</small> : null}{diasLeves.length ? <small>dia leve ({qtdLeve}): {diasLeves.filter((d) => !folgas.includes(d)).map((d) => DIAS_SEMANA[d]).join(', ')}</small> : null}</dd></div>
          <div><dt>Ritmo</dt><dd><b>{ROTULO_INTENSIDADE[intensidade].nome}</b>{simulados ? <small>com os OrtoQuestões Simulados</small> : <small>só questões oficiais</small>}</dd></div>
        </dl>
        {maisCai !== null && <p className="pe-ao-vivo__total">{maisCai >= 100 ? 'Cobre toda a' : `Cobre ${maisCai}% da`} <span>prioridade máxima</span> até a reta final</p>}
        <p className="pe-ao-vivo__nota">Um pouco por dia, do celular ou do computador. Atrasou, a meta sobe no máximo 25%; adiantou, alivia.</p>
      </> : <p className="pe-ao-vivo__vazio">Escolha a data da prova e o cronograma aparece aqui, se formando enquanto você responde.</p>}
    </aside>
  )
}

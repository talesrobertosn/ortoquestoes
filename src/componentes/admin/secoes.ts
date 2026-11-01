import type { NomeIcone } from '../Icone'
import type { FiltroUsuarios } from './AdminUsuarios'
import type { VistaConteudo } from './AdminConteudo'

/**
 * Mesa de Comando do Atlas (reconstrução de 01/11/2026, docs/admin/RECONSTRUCAO-2026-11.md).
 *
 * Seis áreas, cada uma com as suas partes ("abas"). A parte é o que vai no endereço (`#/admin?aba=…`)
 * e a área sai dela. Cada parte declara a pergunta que responde e o modo em que se trabalha nela:
 * ver (estado e mudanças), investigar (cruzar, filtrar, abrir o registro) ou agir (operar com prévia e confirmação).
 *
 * Comando        · visão geral (estado, variações, fila de atenção) e hoje em detalhe (quem está online e as listas do dia)
 * Pessoas        · análise (crescimento → ativação → uso → retenção → conversão) e explorador (lista, filtros, ficha)
 * Estudo         · triagem do acervo, editor de questões, opiniões dos flashcards e simulados
 * Receita        · resultados (confirmado × reconstruído × previsão), assinaturas, cobranças e avisos do processador
 * Comunicação    · campanhas e envios (lembretes, cartas, relatórios, automáticos, histórico) e o catálogo de cartas
 * Configurações  · acesso gratuito, pagamentos, aviso global e exportação
 */
export type Secao = 'comando' | 'pessoas' | 'estudo' | 'receita' | 'comunicacao' | 'configuracoes'
export type Aba =
  | 'comando' | 'agora'
  | 'crescimento' | 'usuarios'
  | 'conteudo' | 'questoes' | 'opinioes' | 'simulados'
  | 'financeiro' | 'assinaturas' | 'cobrancas' | 'pagamentos'
  | 'lembretes' | 'todas'
  | 'ajustes' | 'exportar'

/** Ver: estado e mudanças. Investigar: cruzar e abrir o registro. Agir: operar com prévia e confirmação. */
export type Modo = 'ver' | 'investigar' | 'agir'
export const ROTULO_MODO: Record<Modo, string> = { ver: 'Ver', investigar: 'Investigar', agir: 'Agir' }

export interface DefinicaoParte { id: Aba; rotulo: string; modo: Modo; pergunta: string }
/** `curto`: o nome na barra inferior do celular (seis áreas lado a lado, sem reticências). */
export interface DefinicaoSecao { id: Secao; rotulo: string; curto: string; icone: NomeIcone; abas: DefinicaoParte[] }

export const SECOES: DefinicaoSecao[] = [
  { id: 'comando', rotulo: 'Comando', curto: 'Comando', icone: 'olho', abas: [
    { id: 'comando', rotulo: 'Visão geral', modo: 'ver', pergunta: 'O site está saudável, o que mudou e o que pede ação agora?' },
    { id: 'agora', rotulo: 'Hoje em detalhe', modo: 'investigar', pergunta: 'Quem está online, quem estudou hoje e quem entrou sem estudar?' },
  ] },
  { id: 'pessoas', rotulo: 'Pessoas', curto: 'Pessoas', icone: 'grupo', abas: [
    { id: 'crescimento', rotulo: 'Análise', modo: 'investigar', pergunta: 'Onde as pessoas chegam, ativam, voltam e deixam de estudar?' },
    { id: 'usuarios', rotulo: 'Explorador', modo: 'agir', pergunta: 'Quem é a pessoa por trás deste número, e o que fazer por ela?' },
  ] },
  { id: 'estudo', rotulo: 'Estudo e conteúdo', curto: 'Estudo', icone: 'livro', abas: [
    { id: 'conteudo', rotulo: 'Triagem', modo: 'agir', pergunta: 'Que questão ou relato precisa de revisão agora?' },
    { id: 'questoes', rotulo: 'Editor de questões', modo: 'agir', pergunta: 'Corrigir enunciado, alternativas, gabarito, comentário ou imagem.' },
    { id: 'opinioes', rotulo: 'Opiniões dos flashcards', modo: 'investigar', pergunta: 'O que as pessoas dizem do som, do visual, do desempenho e do conteúdo?' },
    { id: 'simulados', rotulo: 'Simulados', modo: 'agir', pergunta: 'Montar, revisar, publicar e acompanhar as edições.' },
  ] },
  { id: 'receita', rotulo: 'Receita', curto: 'Receita', icone: 'grafico', abas: [
    { id: 'financeiro', rotulo: 'Resultados', modo: 'ver', pergunta: 'Quanto entrou de fato, quanto é reconstrução e quanto é previsão?' },
    { id: 'assinaturas', rotulo: 'Assinaturas', modo: 'investigar', pergunta: 'Quem tem acesso, por qual plano e meio, e até quando?' },
    { id: 'cobrancas', rotulo: 'Cobranças', modo: 'investigar', pergunta: 'Cada pagamento recebido, estimado ou reembolsado, com a pessoa e o processador.' },
    { id: 'pagamentos', rotulo: 'Avisos do processador', modo: 'agir', pergunta: 'Algum aviso do Mercado Pago falhou e precisa ser reprocessado?' },
  ] },
  { id: 'comunicacao', rotulo: 'Comunicação', curto: 'E-mails', icone: 'correio', abas: [
    { id: 'lembretes', rotulo: 'Campanhas e envios', modo: 'agir', pergunta: 'O que está pronto para enviar, para quem, por quê, e o que já saiu?' },
    { id: 'todas', rotulo: 'Catálogo de cartas', modo: 'investigar', pergunta: 'Todas as cartas do site, com prévia e variações.' },
  ] },
  { id: 'configuracoes', rotulo: 'Configurações', curto: 'Ajustes', icone: 'filtro', abas: [
    { id: 'ajustes', rotulo: 'Site e acesso', modo: 'agir', pergunta: 'Limite gratuito, pagamentos e aviso no topo do site: o que vale agora?' },
    { id: 'exportar', rotulo: 'Exportação', modo: 'agir', pergunta: 'Levar os dados do painel para uma análise, com a privacidade escolhida.' },
  ] },
]

const ABAS = new Set<Aba>(SECOES.flatMap(s => s.abas.map(a => a.id)))
const SECAO_DA_ABA = new Map<Aba, Secao>(SECOES.flatMap(s => s.abas.map(a => [a.id, s.id] as [Aba, Secao])))

export const secaoDe = (aba: Aba): Secao => SECAO_DA_ABA.get(aba) ?? 'comando'
export const definicaoDe = (secao: Secao): DefinicaoSecao => SECOES.find(s => s.id === secao) ?? SECOES[0]
export const parteDe = (aba: Aba): DefinicaoParte => definicaoDe(secaoDe(aba)).abas.find(a => a.id === aba) ?? SECOES[0].abas[0]
/** A parte que abre quando se escolhe a área pela primeira vez. */
export const abaPadrao = (secao: Secao): Aba => definicaoDe(secao).abas[0].id

/**
 * Endereços de antes das reorganizações continuam abrindo no lugar certo: favoritos, os links
 * "Editar questão" do site e os e-mails de alerta (`?aba=pagamentos`, `?aba=avaliacoes`).
 * Também aceita o nome de uma área, atual ou antiga (`?aba=receita`, `?aba=emails`), como atalho.
 */
const LEGADO: Record<string, Aba> = {
  geral: 'comando',              // "Visão geral" (até 15/10) volta a ser a visão geral do Comando
  hoje: 'agora',                 // "Hoje" (até 17/10) é o "Hoje em detalhe"
  configuracoes: 'ajustes',
  avaliacoes: 'conteudo', relatos: 'conteudo', // dos e-mails de alerta; a vista vai junto
  pessoas: 'usuarios', receita: 'financeiro', operacoes: 'lembretes', emails: 'lembretes',
  cartas: 'lembretes',           // "Cartas pessoais" juntou-se a "Enviar e-mails" (21/10/2026)
  avisos: 'pagamentos',          // o endereço dos avisos do processador continua ?aba=pagamentos
  estudo: 'conteudo', comunicacao: 'lembretes', // nomes das áreas novas (01/11/2026)
}

/** Período das visões analíticas, em dias (sempre comparado com os N dias anteriores). */
export type Periodo = 7 | 30 | 90
export const PERIODOS: Periodo[] = [7, 30, 90]
export const PERIODO_PADRAO: Periodo = 30
/** Partes que leem o período do endereço. */
const COM_PERIODO = new Set<Aba>(['comando', 'financeiro'])

/**
 * O estado navegável do painel mora no endereço: #/admin?aba=…&filtro=…&vista=…&id=…&periodo=….
 * F5 e links abrem no mesmo lugar; Voltar passa pelas partes visitadas. Nada pessoal (e-mail, nome,
 * busca digitada) vai para o endereço: só identificadores de questão e filtros estáveis.
 */
export interface EstadoUrl { aba: Aba; filtro: FiltroUsuarios; vista: VistaConteudo; id: string | null; periodo: Periodo }
const FILTROS_URL: FiltroUsuarios[] = ['todos', 'online', 'hoje', 'ativos', 'novos', 'novos_parados', 'assinantes', 'parados', 'planos']
const VISTAS_URL: VistaConteudo[] = ['suspeitas', 'faceis', 'temas', 'relatos', 'avaliacoes']
/** Só ids de questão (área-número e afins): nada de texto livre, espaço ou @ no endereço. */
const ID_QUESTAO = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/

export function lerUrl(consulta: URLSearchParams): EstadoUrl {
  const bruta = consulta.get('aba') ?? ''
  const filtro = consulta.get('filtro') as FiltroUsuarios
  const vista = consulta.get('vista') as VistaConteudo
  const vistaLegada = bruta === 'avaliacoes' || bruta === 'relatos' ? bruta : null
  const id = consulta.get('id')
  const periodo = Number(consulta.get('periodo')) as Periodo
  return {
    aba: ABAS.has(bruta as Aba) ? bruta as Aba : LEGADO[bruta] ?? 'comando',
    filtro: FILTROS_URL.includes(filtro) ? filtro : 'todos',
    vista: vistaLegada ?? (VISTAS_URL.includes(vista) ? vista : 'suspeitas'),
    id: id && id.length <= 80 && ID_QUESTAO.test(id) ? id : null,
    periodo: PERIODOS.includes(periodo) ? periodo : PERIODO_PADRAO,
  }
}

/** Só o que vale para a parte entra no endereço, e só quando foge do padrão. */
export function urlDe({ aba, filtro, vista, id, periodo }: EstadoUrl): string {
  const consulta = new URLSearchParams()
  if (aba !== 'comando') consulta.set('aba', aba)
  if (aba === 'usuarios' && filtro !== 'todos') consulta.set('filtro', filtro)
  if (aba === 'conteudo' && vista !== 'suspeitas') consulta.set('vista', vista)
  if (aba === 'questoes' && id) consulta.set('id', id)
  if (COM_PERIODO.has(aba) && periodo !== PERIODO_PADRAO) consulta.set('periodo', String(periodo))
  const texto = consulta.toString()
  return texto ? `/admin?${texto}` : '/admin'
}

/** O endereço veio num formato antigo (ou com sobras): vale reescrever no formato atual, sem criar histórico. */
export function urlAntiga(consulta: URLSearchParams): boolean {
  const atual = urlDe(lerUrl(consulta))
  const consultaAtual = new URLSearchParams(atual.split('?')[1] ?? '')
  const bruta = consulta.get('aba')
  return bruta !== null && bruta !== (consultaAtual.get('aba') ?? 'comando')
}

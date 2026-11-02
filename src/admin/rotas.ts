/**
 * Painel do administrador 3.0, "Mesa de Comando do Atlas" (reconstrução de 01/11/2026,
 * docs/admin/RECONSTRUCAO-2026-11.md). Arquitetura de informação: seis áreas, cada uma com as suas
 * partes. A parte é o que vai no endereço (`#/admin?aba=…`); a área sai dela.
 *
 * Os endereços de todas as versões anteriores continuam abrindo no lugar certo: favoritos, os links
 * "Editar questão" do site e os e-mails de alerta (`?aba=pagamentos`, `?aba=avaliacoes`, `?aba=relatos`).
 */
import type { NomeIconeAdmin } from './ui/Icone'

export type Area = 'comando' | 'pessoas' | 'estudo' | 'receita' | 'comunicacao' | 'configuracoes'
export type Parte =
  | 'comando' | 'agora' | 'pendencias'
  | 'usuarios' | 'crescimento' | 'retencao' | 'perfis'
  | 'conteudo' | 'questoes' | 'simulados' | 'opinioes'
  | 'financeiro' | 'previsao' | 'assinaturas' | 'cobrancas' | 'pagamentos'
  | 'lembretes' | 'cartas' | 'envios' | 'todas'
  | 'ajustes' | 'aviso' | 'exportar'

/** Filtros do Explorador de pessoas (os mesmos do painel anterior, para os links continuarem). */
export type FiltroPessoas = 'todos' | 'online' | 'hoje' | 'ativos' | 'novos' | 'novos_parados' | 'assinantes' | 'parados' | 'planos'
/** As cinco vistas da triagem de conteúdo. */
export type VistaTriagem = 'suspeitas' | 'faceis' | 'temas' | 'relatos' | 'avaliacoes'
export type Periodo = 7 | 30 | 90

export interface DefParte { id: Parte; rotulo: string; pergunta: string }
export interface DefArea { id: Area; rotulo: string; curto: string; icone: NomeIconeAdmin; partes: DefParte[] }

/**
 * Menu (revisão de 02/11/2026, pedido do Tales: "antes estava melhor", menos itens e os nomes de antes).
 * Seis áreas com os nomes do painel anterior; o que era parecido virou aba dentro da mesma tela
 * (Crescimento, Financeiro e Ajustes), em vez de item solto no menu.
 */
export const AREAS: DefArea[] = [
  { id: 'comando', rotulo: 'Agora', curto: 'Agora', icone: 'comando', partes: [
    { id: 'comando', rotulo: 'Agora', pergunta: 'Quem está online, quem não entrou, o que pede ação e o que aconteceu hoje.' },
  ] },
  { id: 'pessoas', rotulo: 'Pessoas', curto: 'Pessoas', icone: 'pessoas', partes: [
    { id: 'usuarios', rotulo: 'Usuários', pergunta: 'Encontrar uma pessoa ou um grupo, entender o que fazem e agir por eles.' },
    { id: 'crescimento', rotulo: 'Crescimento', pergunta: 'Quantos chegam, quantos ficam e quem são.' },
  ] },
  { id: 'receita', rotulo: 'Financeiro', curto: 'Financeiro', icone: 'receita', partes: [
    { id: 'financeiro', rotulo: 'Ganhos', pergunta: 'Quanto entrou, quanto deve entrar e de onde vem.' },
    { id: 'assinaturas', rotulo: 'Assinaturas', pergunta: 'Quem tem acesso pago, por qual plano e meio, e até quando.' },
    { id: 'cobrancas', rotulo: 'Pagamentos', pergunta: 'Cada pagamento recebido, estimado ou reembolsado, dia a dia.' },
    { id: 'pagamentos', rotulo: 'Avisos de pagamento', pergunta: 'Algum aviso do Mercado Pago falhou e precisa ser reprocessado?' },
  ] },
  { id: 'estudo', rotulo: 'Conteúdo', curto: 'Conteúdo', icone: 'estudo', partes: [
    { id: 'conteudo', rotulo: 'Relatos e avaliações', pergunta: 'Que questão ou relato precisa de revisão agora?' },
    { id: 'questoes', rotulo: 'Editar questões', pergunta: 'Corrigir enunciado, alternativas, gabarito, comentário ou imagem de uma questão.' },
    { id: 'simulados', rotulo: 'Simulados', pergunta: 'Calendário, montagem, publicação e acompanhamento das edições.' },
    { id: 'opinioes', rotulo: 'Opiniões dos flashcards', pergunta: 'O que as pessoas dizem do som, do visual, do desempenho e do conteúdo.' },
  ] },
  { id: 'comunicacao', rotulo: 'E-mails', curto: 'E-mails', icone: 'carta', partes: [
    { id: 'lembretes', rotulo: 'Lembretes', pergunta: 'Os lembretes prontos: para quem, prévia e envio.' },
    { id: 'cartas', rotulo: 'Cartas pessoais', pergunta: 'Uma carta escrita para cada pessoa de um grupo, com prévia e revisão.' },
    { id: 'envios', rotulo: 'Relatórios e histórico', pergunta: 'Relatório mensal, e-mails automáticos e tudo o que já saiu.' },
    { id: 'todas', rotulo: 'Todas as cartas', pergunta: 'Todas as cartas do site, com amostra viva, variações e prévia.' },
  ] },
  { id: 'configuracoes', rotulo: 'Ajustes', curto: 'Ajustes', icone: 'ajustes', partes: [
    { id: 'ajustes', rotulo: 'Ajustes', pergunta: 'Limite gratuito, recursos pagos, pagamentos e o aviso no topo do site.' },
    { id: 'exportar', rotulo: 'Exportar dados', pergunta: 'Levar os dados do painel para uma análise, com a privacidade escolhida.' },
  ] },
]

/** Abas dentro de uma tela: a primeira é a padrão. O nome e a pergunta de cada aba ficam aqui. */
const ABAS_DE: Partial<Record<Parte, DefParte[]>> = {
  crescimento: [
    { id: 'crescimento', rotulo: 'Aquisição', pergunta: 'Quantos chegam, quantos começam a estudar e onde o funil perde gente.' },
    { id: 'retencao', rotulo: 'Retenção', pergunta: 'Quem volta depois da primeira semana e em que dias e horários o site vive.' },
    { id: 'perfis', rotulo: 'Perfis e origem', pergunta: 'Quem estuda aqui (etapa, prova, estado, serviço) e de onde vêm os cadastros.' },
  ],
  financeiro: [
    { id: 'financeiro', rotulo: 'Ganhos', pergunta: 'Quanto entrou de fato, como se compõe e como se compara.' },
    { id: 'previsao', rotulo: 'Previsão', pergunta: 'O que deve entrar, com as hipóteses à vista; nunca somado ao que já entrou.' },
  ],
  ajustes: [
    { id: 'ajustes', rotulo: 'Acesso e pagamentos', pergunta: 'Limite gratuito, recursos pagos e pagamentos: o que vale agora e o efeito de mudar.' },
    { id: 'aviso', rotulo: 'Aviso no topo do site', pergunta: 'A faixa que todo mundo vê: o que está no ar, prévia e publicação.' },
  ],
}
export const abasDe = (parte: Parte): DefParte[] => ABAS_DE[parte] ?? []
/** Tela (item do menu) que mostra uma aba. */
const TELA_DA_ABA = new Map<Parte, Parte>(Object.entries(ABAS_DE).flatMap(([tela, abas]) => abas!.map(a => [a.id, tela as Parte] as [Parte, Parte])))

const AREA_DA_PARTE = new Map<Parte, Area>(AREAS.flatMap(a => a.partes.map(p => [p.id, a.id] as [Parte, Area])))
export const PARTES = new Set<Parte>(AREA_DA_PARTE.keys())
export const areaDe = (parte: Parte): Area => AREA_DA_PARTE.get(parte) ?? 'comando'
export const defArea = (area: Area): DefArea => AREAS.find(a => a.id === area) ?? AREAS[0]
/** O item do menu (nome da tela). */
export const defParte = (parte: Parte): DefParte => [...defArea(areaDe(parte)).partes, ...(ABAS_DE[TELA_DA_ABA.get(parte) ?? parte] ?? [])].find(p => p.id === parte) ?? AREAS[0].partes[0]
/** O título de uma aba dentro da tela (Aquisição, Ganhos, Acesso e pagamentos…); fora de abas, é o próprio item do menu. */
export const defAba = (parte: Parte): DefParte => (ABAS_DE[TELA_DA_ABA.get(parte) ?? parte] ?? []).find(p => p.id === parte) ?? defParte(parte)
export const partePadrao = (area: Area): Parte => defArea(area).partes[0].id

/**
 * Endereços antigos → parte nova. Inclui os de 17/10 (Agora, Financeiro, Conteúdo, E-mails, Ajustes),
 * os de 15/10 (geral, hoje, configuracoes, operacoes), os dos e-mails de alerta e os nomes das áreas.
 */
const LEGADO: Record<string, Parte> = {
  geral: 'comando', hoje: 'comando', agora: 'comando', pendencias: 'comando',
  retencao: 'crescimento', perfis: 'crescimento', previsao: 'financeiro', aviso: 'ajustes',
  configuracoes: 'ajustes', avisos: 'pagamentos', receita: 'financeiro', pessoas: 'usuarios',
  avaliacoes: 'conteudo', relatos: 'conteudo',
  operacoes: 'lembretes', emails: 'lembretes', comunicacao: 'lembretes',
  estudo: 'conteudo', mensal: 'envios', relatorios: 'envios', historico: 'envios',
}

export const PERIODOS: Periodo[] = [7, 30, 90]
export const PERIODO_PADRAO: Periodo = 30
const COM_PERIODO = new Set<Parte>(['comando', 'crescimento', 'financeiro'])
const FILTROS: FiltroPessoas[] = ['todos', 'online', 'hoje', 'ativos', 'novos', 'novos_parados', 'assinantes', 'parados', 'planos']
const VISTAS: VistaTriagem[] = ['suspeitas', 'faceis', 'temas', 'relatos', 'avaliacoes']
/** Só ids de questão no endereço: nada de e-mail, espaço ou texto livre. */
const ID_QUESTAO = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/

/**
 * O estado navegável mora no endereço: F5 e links abrem no mesmo lugar e Voltar passa pelas partes.
 * Nada pessoal (nome, e-mail, busca digitada) vai para o endereço.
 */
export interface EstadoUrl { parte: Parte; filtro: FiltroPessoas; vista: VistaTriagem; id: string | null; periodo: Periodo; /** Aba dentro da tela (Crescimento, Financeiro, Ajustes); vai no endereço como `sub`. */ sub: Parte }

export function lerUrl(consulta: URLSearchParams): EstadoUrl {
  const bruta = consulta.get('aba') ?? ''
  const filtro = consulta.get('filtro') as FiltroPessoas
  const vista = consulta.get('vista') as VistaTriagem
  const vistaLegada = bruta === 'avaliacoes' || bruta === 'relatos' ? bruta : null
  const id = consulta.get('id')
  const periodo = Number(consulta.get('periodo')) as Periodo
  const parte: Parte = PARTES.has(bruta as Parte) ? bruta as Parte : LEGADO[bruta] ?? 'comando'
  // A aba vem de ?sub=… ou do endereço antigo que apontava direto para ela (?aba=previsao, retencao, aviso…).
  const abas = abasDe(parte).map(a => a.id)
  const sub = [consulta.get('sub'), bruta].find(x => abas.includes(x as Parte)) as Parte | undefined
  return {
    parte, sub: sub ?? abas[0] ?? parte,
    filtro: FILTROS.includes(filtro) ? filtro : 'todos',
    vista: vistaLegada ?? (VISTAS.includes(vista) ? vista : 'suspeitas'),
    id: id && id.length <= 80 && ID_QUESTAO.test(id) ? id : null,
    periodo: PERIODOS.includes(periodo) ? periodo : PERIODO_PADRAO,
  }
}

/** Só o que vale para a parte entra no endereço, e só quando foge do padrão. */
export function urlDe({ parte, filtro, vista, id, periodo, sub }: EstadoUrl): string {
  const c = new URLSearchParams()
  if (parte !== 'comando') c.set('aba', parte)
  if (parte === 'usuarios' && filtro !== 'todos') c.set('filtro', filtro)
  if (parte === 'conteudo' && vista !== 'suspeitas') c.set('vista', vista)
  if (parte === 'questoes' && id) c.set('id', id)
  const abas = abasDe(parte)
  if (abas.length && sub !== abas[0].id && abas.some(a => a.id === sub)) c.set('sub', sub)
  if (COM_PERIODO.has(parte) && periodo !== PERIODO_PADRAO) c.set('periodo', String(periodo))
  const texto = c.toString()
  return texto ? `/admin?${texto}` : '/admin'
}

/** Endereço num formato antigo: vale reescrever no atual sem criar entrada no histórico. */
export function urlAntiga(consulta: URLSearchParams): boolean {
  const bruta = consulta.get('aba')
  if (bruta === null) return false
  const atual = new URLSearchParams(urlDe(lerUrl(consulta)).split('?')[1] ?? '')
  return bruta !== (atual.get('aba') ?? 'comando')
}

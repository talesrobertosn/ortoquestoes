import type { NomeIcone } from '../Icone'
import type { FiltroUsuarios } from './AdminUsuarios'
import type { VistaConteudo } from './AdminConteudo'

/**
 * O painel como painel de observação (pedido do Tales, 17/10/2026: "refazer tudo, organizar, sem
 * repetir"). Seis seções, cada uma com as suas partes ("abas"); a parte é o que vai no endereço
 * (`#/admin?aba=…`), e a seção sai dela. Cada número tem um lugar só.
 *
 * Agora      · ao vivo: quem está online e o que faz, o dia de hoje e o que pede atenção
 * Pessoas    · usuários (lista, filtros e a ficha) e crescimento (série, ritmo, funil, retenção, indicações, perfis)
 * Financeiro · ganhos (resumo, previsão, histórico, base, mês a mês), assinaturas, pagamentos recebidos
 *              (aba 'cobrancas') e avisos de pagamento (aba 'pagamentos', endereço mantido pelos e-mails de alerta)
 * Conteúdo   · relatos e avaliações, editor de questões, opiniões dos flashcards, simulados
 * E-mails    · lembretes, relatório e e-mails automáticos; cartas pessoais em lote
 * Ajustes    · recursos pagos, limite gratuito, pagamentos e aviso no topo do site
 */
export type Secao = 'agora' | 'pessoas' | 'financeiro' | 'conteudo' | 'emails' | 'ajustes'
export type Aba =
  | 'agora'
  | 'usuarios' | 'crescimento'
  | 'financeiro' | 'assinaturas' | 'cobrancas' | 'pagamentos'
  | 'conteudo' | 'questoes' | 'opinioes' | 'simulados'
  | 'lembretes' | 'cartas'
  | 'ajustes'

export interface DefinicaoSecao { id: Secao; rotulo: string; icone: NomeIcone; abas: Array<{ id: Aba; rotulo: string }> }

export const SECOES: DefinicaoSecao[] = [
  { id: 'agora', rotulo: 'Agora', icone: 'olho', abas: [{ id: 'agora', rotulo: 'Agora' }] },
  { id: 'pessoas', rotulo: 'Pessoas', icone: 'grupo', abas: [{ id: 'usuarios', rotulo: 'Usuários' }, { id: 'crescimento', rotulo: 'Crescimento' }] },
  { id: 'financeiro', rotulo: 'Financeiro', icone: 'grafico', abas: [{ id: 'financeiro', rotulo: 'Ganhos' }, { id: 'assinaturas', rotulo: 'Assinaturas' }, { id: 'cobrancas', rotulo: 'Pagamentos' }, { id: 'pagamentos', rotulo: 'Avisos de pagamento' }] },
  { id: 'conteudo', rotulo: 'Conteúdo', icone: 'livro', abas: [{ id: 'conteudo', rotulo: 'Para revisar' }, { id: 'questoes', rotulo: 'Editar questões' }, { id: 'opinioes', rotulo: 'Opiniões dos flashcards' }, { id: 'simulados', rotulo: 'Simulados' }] },
  { id: 'emails', rotulo: 'E-mails', icone: 'correio', abas: [{ id: 'lembretes', rotulo: 'Lembretes e automáticos' }, { id: 'cartas', rotulo: 'Cartas pessoais' }] },
  { id: 'ajustes', rotulo: 'Ajustes', icone: 'filtro', abas: [{ id: 'ajustes', rotulo: 'Ajustes do site' }] },
]

const ABAS = new Set<Aba>(SECOES.flatMap(s => s.abas.map(a => a.id)))
const SECAO_DA_ABA = new Map<Aba, Secao>(SECOES.flatMap(s => s.abas.map(a => [a.id, s.id] as [Aba, Secao])))

export const secaoDe = (aba: Aba): Secao => SECAO_DA_ABA.get(aba) ?? 'agora'
export const definicaoDe = (secao: Secao): DefinicaoSecao => SECOES.find(s => s.id === secao) ?? SECOES[0]
/** A parte que abre quando se escolhe a seção pela primeira vez. */
export const abaPadrao = (secao: Secao): Aba => definicaoDe(secao).abas[0].id

/**
 * Endereços de antes das reorganizações continuam abrindo no lugar certo: favoritos, os links
 * "Editar questão" do site e os e-mails de alerta (`?aba=pagamentos`, `?aba=avaliacoes`).
 * Também aceita o nome de uma seção, atual ou antiga (`?aba=receita`, `?aba=emails`), como atalho
 * para a primeira parte dela.
 */
const LEGADO: Record<string, Aba> = {
  geral: 'agora', hoje: 'agora', // "Visão geral" (até 15/10) e "Hoje" (até 17/10) viraram Agora
  configuracoes: 'ajustes',      // "Ajustes" (os simulados ficam em Conteúdo › Simulados)
  avaliacoes: 'conteudo', relatos: 'conteudo', // dos e-mails de alerta; a vista vai junto
  pessoas: 'usuarios', receita: 'financeiro', operacoes: 'lembretes', emails: 'lembretes',
  avisos: 'pagamentos', // a aba antiga "Pagamentos" (avisos do processador) virou "Avisos de pagamento"; o endereço continua ?aba=pagamentos
}

/**
 * O estado navegável do painel mora no endereço: #/admin?aba=…&filtro=…&vista=…&id=….
 * F5 e links abrem no mesmo lugar; Voltar passa pelas partes visitadas.
 */
export interface EstadoUrl { aba: Aba; filtro: FiltroUsuarios; vista: VistaConteudo; id: string | null }
const FILTROS_URL: FiltroUsuarios[] = ['todos', 'online', 'hoje', 'ativos', 'novos', 'novos_parados', 'assinantes', 'parados', 'planos']
const VISTAS_URL: VistaConteudo[] = ['suspeitas', 'faceis', 'temas', 'relatos', 'avaliacoes']

export function lerUrl(consulta: URLSearchParams): EstadoUrl {
  const bruta = consulta.get('aba') ?? ''
  const filtro = consulta.get('filtro') as FiltroUsuarios
  const vista = consulta.get('vista') as VistaConteudo
  const vistaLegada = bruta === 'avaliacoes' || bruta === 'relatos' ? bruta : null
  return {
    aba: ABAS.has(bruta as Aba) ? bruta as Aba : LEGADO[bruta] ?? 'agora',
    filtro: FILTROS_URL.includes(filtro) ? filtro : 'todos',
    vista: vistaLegada ?? (VISTAS_URL.includes(vista) ? vista : 'suspeitas'),
    id: consulta.get('id') || null,
  }
}

/** Só o que vale para a parte entra no endereço, e só quando foge do padrão. */
export function urlDe({ aba, filtro, vista, id }: EstadoUrl): string {
  const consulta = new URLSearchParams()
  if (aba !== 'agora') consulta.set('aba', aba)
  if (aba === 'usuarios' && filtro !== 'todos') consulta.set('filtro', filtro)
  if (aba === 'conteudo' && vista !== 'suspeitas') consulta.set('vista', vista)
  if (aba === 'questoes' && id) consulta.set('id', id)
  const texto = consulta.toString()
  return texto ? `/admin?${texto}` : '/admin'
}

/** O endereço veio num formato antigo (ou com sobras): vale reescrever no formato atual, sem criar histórico. */
export function urlAntiga(consulta: URLSearchParams): boolean {
  const atual = urlDe(lerUrl(consulta))
  const consultaAtual = new URLSearchParams(atual.split('?')[1] ?? '')
  const bruta = consulta.get('aba')
  return bruta !== null && bruta !== (consultaAtual.get('aba') ?? 'agora')
}

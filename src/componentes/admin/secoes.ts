import type { NomeIcone } from '../Icone'
import type { FiltroUsuarios } from './AdminUsuarios'
import type { VistaConteudo } from './AdminConteudo'

/**
 * As cinco seções do painel (auditoria de 15/10/2026, T6.6). Cada seção tem uma ou mais
 * partes ("abas"); a parte é o que vai no endereço (`#/admin?aba=…`), e a seção sai dela.
 *
 * Hoje      · o que pede atenção agora
 * Pessoas   · usuários (com a ficha), cartas pessoais em lote e crescimento
 * Receita   · financeiro, assinaturas e pagamentos
 * Conteúdo  · relatos e avaliações, editor de questões, opiniões dos flashcards
 * Operações · lembretes e e-mails, simulados, ajustes do site
 */
export type Secao = 'hoje' | 'pessoas' | 'receita' | 'conteudo' | 'operacoes'
export type Aba =
  | 'hoje'
  | 'usuarios' | 'cartas' | 'crescimento'
  | 'financeiro' | 'assinaturas' | 'pagamentos'
  | 'conteudo' | 'questoes' | 'opinioes'
  | 'lembretes' | 'simulados' | 'ajustes'

export interface DefinicaoSecao { id: Secao; rotulo: string; icone: NomeIcone; abas: Array<{ id: Aba; rotulo: string }> }

export const SECOES: DefinicaoSecao[] = [
  { id: 'hoje', rotulo: 'Hoje', icone: 'calendario', abas: [{ id: 'hoje', rotulo: 'Hoje' }] },
  { id: 'pessoas', rotulo: 'Pessoas', icone: 'grupo', abas: [{ id: 'usuarios', rotulo: 'Usuários' }, { id: 'cartas', rotulo: 'Cartas' }, { id: 'crescimento', rotulo: 'Crescimento' }] },
  { id: 'receita', rotulo: 'Receita', icone: 'grafico', abas: [{ id: 'financeiro', rotulo: 'Financeiro' }, { id: 'assinaturas', rotulo: 'Assinaturas' }, { id: 'pagamentos', rotulo: 'Pagamentos' }] },
  { id: 'conteudo', rotulo: 'Conteúdo', icone: 'livro', abas: [{ id: 'conteudo', rotulo: 'Para revisar' }, { id: 'questoes', rotulo: 'Editar questões' }, { id: 'opinioes', rotulo: 'Opiniões dos flashcards' }] },
  { id: 'operacoes', rotulo: 'Operações', icone: 'filtro', abas: [{ id: 'lembretes', rotulo: 'Lembretes e e-mails' }, { id: 'simulados', rotulo: 'Simulados' }, { id: 'ajustes', rotulo: 'Ajustes' }] },
]

const ABAS = new Set<Aba>(SECOES.flatMap(s => s.abas.map(a => a.id)))
const SECAO_DA_ABA = new Map<Aba, Secao>(SECOES.flatMap(s => s.abas.map(a => [a.id, s.id] as [Aba, Secao])))

export const secaoDe = (aba: Aba): Secao => SECAO_DA_ABA.get(aba) ?? 'hoje'
export const definicaoDe = (secao: Secao): DefinicaoSecao => SECOES.find(s => s.id === secao) ?? SECOES[0]
/** A parte que abre quando se escolhe a seção pela primeira vez. */
export const abaPadrao = (secao: Secao): Aba => definicaoDe(secao).abas[0].id

/**
 * Endereços de antes da reorganização continuam abrindo no lugar certo: favoritos, os links
 * "Editar questão" do site e os e-mails de alerta (`?aba=pagamentos`, `?aba=avaliacoes`).
 * Também aceita o nome da seção (`?aba=receita`) como atalho para a primeira parte dela.
 */
const LEGADO: Record<string, Aba> = {
  geral: 'hoje',            // "Visão geral" virou Hoje
  configuracoes: 'ajustes', // "Ajustes" (os simulados saíram para Operações › Simulados)
  avaliacoes: 'conteudo', relatos: 'conteudo', // dos e-mails de alerta; a vista vai junto
  pessoas: 'usuarios', receita: 'financeiro', operacoes: 'lembretes',
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
    aba: ABAS.has(bruta as Aba) ? bruta as Aba : LEGADO[bruta] ?? 'hoje',
    filtro: FILTROS_URL.includes(filtro) ? filtro : 'todos',
    vista: vistaLegada ?? (VISTAS_URL.includes(vista) ? vista : 'suspeitas'),
    id: consulta.get('id') || null,
  }
}

/** Só o que vale para a parte entra no endereço, e só quando foge do padrão. */
export function urlDe({ aba, filtro, vista, id }: EstadoUrl): string {
  const consulta = new URLSearchParams()
  if (aba !== 'hoje') consulta.set('aba', aba)
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
  return bruta !== null && bruta !== (consultaAtual.get('aba') ?? 'hoje')
}

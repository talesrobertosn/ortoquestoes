/**
 * Cliente tipado das RPCs do Simulado Nacional 2.0 (parte 32,
 * supabase/migrations/202610191200_simulado_nacional_v2.sql). Uma função por RPC,
 * com os formatos fixados em docs/superpowers/specs/2026-10-19-simulado-nacional-contrato.md.
 *
 * As letras de `respostas`, `gabarito` e `marcada` são as NOVAS (a ordem embaralhada
 * da edição). `permutacao` traduz: 'CADB' quer dizer que a letra nova A mostra a
 * alternativa original C, a nova B mostra a A, e assim por diante.
 *
 * Datas chegam como texto ISO (timestamptz do banco). Médias são porcentagens
 * de 0 a 100 com uma casa decimal.
 */
import { chamarRpc, chamarRpcPublica, ErroRpc, type OpcoesRpc } from '../servicos/supabase'

export type TipoEdicaoSN = 'mensal' | 'vespera'
/** Letra nova marcada (A–E). */
export type LetraSN = 'A' | 'B' | 'C' | 'D' | 'E'
/** {id_questao: letra nova | null (apagada)}. */
export type RespostasSN = Record<string, LetraSN | null>

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

/** Os códigos que as funções da parte 32 levantam (raise exception '<código>'). */
export const CODIGOS_ERRO_SN = [
  'premium_necessario', 'edicao_fechada', 'edicao_nao_aberta', 'ja_entregue', 'nao_iniciado', 'nao_entregue',
  'tempo_esgotado', 'nao_admin', 'edicao_com_participantes', 'edicao_invalida', 'autenticacao_necessaria',
  'respostas_invalidas', 'itens_invalidos', 'datas_invalidas', 'duracao_invalida', 'titulo_invalido', 'config_invalida',
] as const
export type CodigoErroSN = typeof CODIGOS_ERRO_SN[number]

/**
 * O motivo de uma falha: um código da parte 32, 'rede' (sem resposta do servidor,
 * prazo esgotado, sem conexão) ou 'desconhecido' (outro erro, ou RPC pública, que
 * não traz o código).
 */
export function codigoErroSN(falha: unknown): CodigoErroSN | 'rede' | 'desconhecido' {
  if (falha instanceof ErroRpc) {
    const codigo = falha.codigo.trim()
    return (CODIGOS_ERRO_SN as readonly string[]).includes(codigo) ? codigo as CodigoErroSN : 'desconhecido'
  }
  if (falha instanceof DOMException && falha.name === 'AbortError') return 'rede'
  if (falha instanceof TypeError) return 'rede'
  return 'desconhecido'
}

// ---------------------------------------------------------------------------
// Formatos de retorno
// ---------------------------------------------------------------------------

/** A parte pública da configuração do sorteio. */
export interface ConfigPublicaSN { provas?: string[]; cotas?: Record<string, number> }

/** Configuração completa do sorteio, guardada pelo painel para transparência. */
export interface ConfigSorteioSN {
  provas?: string[]
  peso_recentes?: number
  anos_recentes?: number
  cotas?: Record<string, number>
  nivel_alto_pct?: number
  [chave: string]: unknown
}

export interface MinhaParticipacaoSN {
  iniciado_em: string
  prazo_em: string
  entregue_em: string | null
  acertos: number | null
  total: number | null
  segundos: number | null
  no_tempo: boolean | null
  /** Quantas questões têm letra marcada. */
  respondidas: number
}

export interface EdicaoResumidaSN { edicao: string; titulo: string; tipo: TipoEdicaoSN }

export interface AnteriorSN extends EdicaoResumidaSN {
  /** '2026-10-antiga' é a versão antiga de outubro (tabelas simulado_*), só para quem a fez. */
  minha: { acertos: number | null; total: number | null; no_tempo: boolean | null } | null
}

/** sn_obter. Sem edição publicada (ou a pedida não existe), `edicao` e os campos dela vêm null. */
export interface EdicaoSN {
  edicao: string | null
  tipo: TipoEdicaoSN | null
  titulo: string | null
  descricao: string | null
  destaque_inicio: boolean | null
  /** A edição não exige o plano (e dá posição a todos que entregam no prazo). */
  aberto_a_todos: boolean | null
  config: ConfigPublicaSN | null
  abre_em: string | null
  fecha_em: string | null
  duracao_min: number | null
  total: number | null
  por_area: Array<{ area: string; n: number }>
  /** Entregas na edição; null quando são menos de 10. */
  participantes: number | null
  /** Inscritos na edição; null quando são menos de 10. */
  inscritos: number | null
  /** Quando a pessoa se inscreveu (null: não inscrita ou visitante). */
  minha_inscricao: string | null
  tambem_no_ar: EdicaoResumidaSN[]
  minha: MinhaParticipacaoSN | null
  /** Até 12 edições encerradas, mais recente primeiro. */
  anteriores: AnteriorSN[]
  /** Relógio do servidor. */
  agora: string
}

/** sn_destaque_inicio: a chamada da página inicial (null quando não há o que chamar). */
export interface DestaqueInicioSN {
  edicao: string
  titulo: string
  tipo: TipoEdicaoSN
  abre_em: string
  fecha_em: string
  total: number
  duracao_min: number
  inscrito: boolean
  minha_situacao: null | 'andamento' | 'entregue'
}

/** sn_inscrever e sn_cancelar_inscricao. inscritos: null quando são menos de 10. */
export interface InscricaoSN { inscrito_em: string | null; inscritos: number | null }

export interface ItemProvaSN { ordem: number; id_questao: string; permutacao: string }

/** sn_iniciar. Não traz gabarito. */
export interface InicioSN {
  edicao: string
  iniciado_em: string
  prazo_em: string
  duracao_min: number
  itens: ItemProvaSN[]
  respostas: RespostasSN
  revisar: string[]
}

export interface SalvoSN { salvo_em: string }

/** sn_entregar. */
export interface EntregaSN {
  acertos: number
  total: number
  segundos: number
  no_tempo: boolean
  por_area: Record<string, { certas: number; total: number }>
}

/** sn_resultado. por_area vai para todos; posição e percentil, só com o plano (ou edição aberta a todos) e no prazo. */
export interface ResultadoSN {
  acertos: number
  total: number
  segundos: number
  no_tempo: boolean
  entregue_em: string
  /** Só para quem tem o plano e entregou no prazo. */
  posicao: number | null
  /** Entregas no prazo. */
  colocados: number
  percentil: number | null
  /** Média de acerto (%) das entregas no prazo. */
  media: number | null
  media_segundos: number | null
  /** media: média de acerto (%) da área entre as entregas no prazo. */
  por_area: Array<{ area: string; certas: number; total: number; media: number | null }>
  encerrada: boolean
}

export interface LinhaRankingSN { posicao: number; apelido: string; acertos: number; total: number; segundos: number; eh_voce: boolean }

/** sn_ranking. Com área, acertos e total são os da área. */
export interface RankingSN {
  colocados: number
  top: LinhaRankingSN[]
  voce: { posicao: number; acertos: number; total: number; segundos: number } | null
  /** Vazio enquanto a edição tem menos de 10 entregas no prazo. */
  melhores_por_area: Array<{ area: string; apelido: string; certas: number; total: number }>
}

/** Uma linha de sn_gabarito. */
export interface ItemGabaritoSN { ordem: number; id_questao: string; permutacao: string; gabarito: LetraSN; marcada: LetraSN | null }

/** Uma edição no painel (sn_admin_listar e o retorno das demais funções do admin). */
export interface EdicaoAdminSN {
  edicao: string
  tipo: TipoEdicaoSN
  titulo: string
  descricao: string | null
  destaque_inicio: boolean
  config: ConfigSorteioSN
  aberto_a_todos: boolean
  abre_em: string
  fecha_em: string
  duracao_min: number
  publicado: boolean
  total: number
  inscritos: number
  participantes: number
  entregas: number
  /** Média de acerto (%) das entregas no prazo. */
  media: number | null
  ids: string[]
}

/** Um item enviado pelo painel; o gabarito novo é calculado no servidor. */
export interface ItemAdminSN {
  ordem: number
  id_questao: string
  area: string
  foco: string | null
  gabarito_original: LetraSN
  permutacao: string
}

export interface EstatisticasSN {
  inscritos: number
  participantes: number
  entregas: number
  no_tempo: number
  media: number | null
  por_area: Array<{ area: string; certas: number; total: number; media: number | null }>
  mais_erradas: Array<{ id_questao: string; ordem: number; erros: number; total: number }>
}

// ---------------------------------------------------------------------------
// A pessoa
// ---------------------------------------------------------------------------

/** Para as RPCs abertas a visitantes: logado manda o token (para "minha" e "você"). */
export interface OpcoesPublicasSN { logado: boolean }

const publica = <T>(nome: string, corpo: Record<string, unknown>, logado: boolean, opcoes?: OpcoesRpc) =>
  logado ? chamarRpc<T>(nome, corpo, opcoes) : chamarRpcPublica<T>(nome, corpo)

/** A edição pedida ou, sem `edicao`, a em destaque (véspera aberta > mensal aberta > próxima > última encerrada). */
export function snObter(edicao: string | null, { logado }: OpcoesPublicasSN, opcoes?: OpcoesRpc): Promise<EdicaoSN> {
  return publica<EdicaoSN>('sn_obter', { p_edicao: edicao }, logado, opcoes)
}

/** A chamada da página inicial (aberta ou abre em até 7 dias, e ligada no painel). */
export function snDestaqueInicio({ logado }: OpcoesPublicasSN, opcoes?: OpcoesRpc): Promise<DestaqueInicioSN | null> {
  return publica<DestaqueInicioSN | null>('sn_destaque_inicio', {}, logado, opcoes)
}

/** Começa ou retoma a prova (começar exige o plano). */
export function snIniciar(edicao: string, opcoes?: OpcoesRpc): Promise<InicioSN> {
  return chamarRpc<InicioSN>('sn_iniciar', { p_edicao: edicao }, opcoes)
}

/** Salva respostas (mescla; a última vence). `revisar`, se vier, substitui a lista inteira. */
export function snSalvar(edicao: string, respostas: RespostasSN, revisar?: string[] | null, opcoes?: OpcoesRpc): Promise<SalvoSN> {
  return chamarRpc<SalvoSN>('sn_salvar', { p_edicao: edicao, p_respostas: respostas, p_revisar: revisar ?? null }, opcoes)
}

/** Entrega (idempotente). As respostas finais só entram até prazo + 5 minutos. */
export function snEntregar(edicao: string, respostas?: RespostasSN | null, opcoes?: OpcoesRpc): Promise<EntregaSN> {
  return chamarRpc<EntregaSN>('sn_entregar', { p_edicao: edicao, p_respostas: respostas ?? null }, opcoes)
}

/** Inscreve a pessoa (qualquer conta, enquanto a edição publicada não fechou). Repetir não muda a data. */
export function snInscrever(edicao: string, opcoes?: OpcoesRpc): Promise<InscricaoSN> {
  return chamarRpc<InscricaoSN>('sn_inscrever', { p_edicao: edicao }, opcoes)
}

export function snCancelarInscricao(edicao: string, opcoes?: OpcoesRpc): Promise<InscricaoSN> {
  return chamarRpc<InscricaoSN>('sn_cancelar_inscricao', { p_edicao: edicao }, opcoes)
}

export function snResultado(edicao: string, opcoes?: OpcoesRpc): Promise<ResultadoSN> {
  return chamarRpc<ResultadoSN>('sn_resultado', { p_edicao: edicao }, opcoes)
}

export interface OpcoesRankingSN extends OpcoesPublicasSN { area?: string | null; limite?: number }

export function snRanking(edicao: string, { logado, area = null, limite = 10 }: OpcoesRankingSN, opcoes?: OpcoesRpc): Promise<RankingSN> {
  return publica<RankingSN>('sn_ranking', { p_edicao: edicao, p_area: area, p_limite: limite }, logado, opcoes)
}

export function snGabarito(edicao: string, opcoes?: OpcoesRpc): Promise<ItemGabaritoSN[]> {
  return chamarRpc<ItemGabaritoSN[]>('sn_gabarito', { p_edicao: edicao }, opcoes)
}

// ---------------------------------------------------------------------------
// Painel do administrador
// ---------------------------------------------------------------------------

export function snAdminListar(opcoes?: OpcoesRpc): Promise<EdicaoAdminSN[]> {
  return chamarRpc<EdicaoAdminSN[]>('sn_admin_listar', {}, opcoes)
}

export interface SalvarEdicaoSN {
  edicao: string
  tipo: TipoEdicaoSN
  titulo: string
  abreEm: string
  fechaEm: string
  duracaoMin: number
  itens: ItemAdminSN[]
  publicar: boolean
  /** null mantém a atual. */
  descricao?: string | null
  destaqueInicio?: boolean
  /** Vazio ({}) mantém a atual. */
  config?: ConfigSorteioSN
  /** Sem exigir o plano (padrão: falso). */
  abertoATodos?: boolean
}

/** Cria ou regrava a edição (10 a 200 itens). Com participantes, só muda o que não mexe na prova. */
export function snAdminSalvar(e: SalvarEdicaoSN, opcoes?: OpcoesRpc): Promise<EdicaoAdminSN> {
  return chamarRpc<EdicaoAdminSN>('sn_admin_salvar', {
    p_edicao: e.edicao, p_tipo: e.tipo, p_titulo: e.titulo, p_abre_em: e.abreEm, p_fecha_em: e.fechaEm,
    p_duracao_min: e.duracaoMin, p_itens: e.itens, p_publicar: e.publicar,
    p_descricao: e.descricao ?? null, p_destaque_inicio: e.destaqueInicio ?? true, p_config: e.config ?? {},
    p_aberto_a_todos: e.abertoATodos ?? false,
  }, opcoes)
}

/** Título, descrição, a chamada no início e o aberto a todos, a qualquer hora. null mantém; descrição '' apaga. */
export function snAdminConfig(edicao: string, mudancas: { titulo?: string | null; descricao?: string | null; destaqueInicio?: boolean | null; abertoATodos?: boolean | null }, opcoes?: OpcoesRpc): Promise<EdicaoAdminSN> {
  return chamarRpc<EdicaoAdminSN>('sn_admin_config', {
    p_edicao: edicao, p_titulo: mudancas.titulo ?? null, p_descricao: mudancas.descricao ?? null,
    p_destaque_inicio: mudancas.destaqueInicio ?? null, p_aberto_a_todos: mudancas.abertoATodos ?? null,
  }, opcoes)
}

/** Troca a questão de uma ordem (só sem participantes). */
export function snAdminTrocarItem(edicao: string, ordem: number, item: Omit<ItemAdminSN, 'ordem'>, opcoes?: OpcoesRpc): Promise<EdicaoAdminSN> {
  return chamarRpc<EdicaoAdminSN>('sn_admin_trocar_item', { p_edicao: edicao, p_ordem: ordem, p_item: item }, opcoes)
}

/** Publica ou despublica (despublicar só sem participantes). */
export function snAdminPublicar(edicao: string, publicado: boolean, opcoes?: OpcoesRpc): Promise<EdicaoAdminSN> {
  return chamarRpc<EdicaoAdminSN>('sn_admin_publicar', { p_edicao: edicao, p_publicado: publicado }, opcoes)
}

/** Datas: livres antes de abrir; depois, só estender o fechamento. null mantém. */
export function snAdminDatas(edicao: string, abreEm: string | null, fechaEm: string | null, opcoes?: OpcoesRpc): Promise<EdicaoAdminSN> {
  return chamarRpc<EdicaoAdminSN>('sn_admin_datas', { p_edicao: edicao, p_abre_em: abreEm, p_fecha_em: fechaEm }, opcoes)
}

export function snAdminEstatisticas(edicao: string, opcoes?: OpcoesRpc): Promise<EstatisticasSN> {
  return chamarRpc<EstatisticasSN>('sn_admin_estatisticas', { p_edicao: edicao }, opcoes)
}

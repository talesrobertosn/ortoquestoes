import { chamarRpc, ErroRpc } from '../servicos/supabase'
import { gravar, ler } from '../estado/armazenamento'
import { chaveData, incluiSimulados, opcoesDe, type CalculoPlano, type OpcoesPlano, type PlanoSalvo } from '../dados/planoEstudo'

/**
 * Leitura e gravação do cronograma no servidor. A escolha de incluir os
 * OrtoQuestões Simulados vai na coluna `incluir_simulados`; enquanto o banco
 * não tiver a coluna (SQL ainda não aplicado), fica guardada no aparelho.
 */
const CHAVE = 'cronograma:simulados'
/** Ajustes finos do plano (dia leve, semana difícil...): no servidor desde a parte 20; antes disso, no aparelho. */
const CHAVE_OPCOES = 'cronograma:opcoes'
const CHAVE_AVISO = 'cronograma:aviso-simulados'

/** O aviso de novidade dos simulados aparece uma vez para quem já tinha cronograma. */
export const avisoSimuladosVisto = () => ler<boolean>(CHAVE_AVISO, false)
export const marcarAvisoSimulados = () => gravar(CHAVE_AVISO, true)

const funcaoInexistente = (falha: unknown) => falha instanceof ErroRpc && falha.status === 404

export async function obterPlano(): Promise<PlanoSalvo | null> {
  const [plano] = await chamarRpc<PlanoSalvo[]>('obter_plano_estudo', {})
  if (!plano) return null
  const comSimulados = typeof plano.incluir_simulados === 'boolean' ? plano : { ...plano, incluir_simulados: ler<boolean>(CHAVE, true) }
  return plano.opcoes && typeof plano.opcoes === 'object' ? comSimulados : { ...comSimulados, opcoes: ler<OpcoesPlano>(CHAVE_OPCOES, {}) }
}

export interface DadosPlano {
  p_data_prova: string
  p_intensidade: string
  p_folgas: number[]
  p_prova: string
  p_base: number
  p_recomecar: boolean
}

export async function salvarPlano(dados: DadosPlano, incluirSimulados: boolean, opcoes?: OpcoesPlano): Promise<PlanoSalvo | null> {
  gravar(CHAVE, incluirSimulados)
  if (opcoes) gravar(CHAVE_OPCOES, opcoes)
  // Banco mais novo primeiro; sem a parte 20 (opções) ou a 202610070200 (simulados), cai para a versão anterior.
  const tentativas = [
    ...(opcoes ? [{ ...dados, p_incluir_simulados: incluirSimulados, p_opcoes: opcoes }] : []),
    { ...dados, p_incluir_simulados: incluirSimulados },
    { ...dados },
  ]
  for (const [i, corpo] of tentativas.entries()) {
    try { await chamarRpc('salvar_plano_estudo', corpo); break } catch (falha) {
      if (!funcaoInexistente(falha) || i === tentativas.length - 1) throw falha
    }
  }
  return obterPlano()
}

/** Planos criados antes da etapa 4 do formulário: a pessoa ainda não escolheu sobre os simulados. */
const ETAPA_SIMULADOS_EM = Date.parse('2026-10-06T21:45:00Z')
export function mostrarNovidadeSimulados(plano: PlanoSalvo | null | undefined): plano is PlanoSalvo {
  return !!plano && incluiSimulados(plano) && Date.parse(plano.criado_em) < ETAPA_SIMULADOS_EM && !avisoSimuladosVisto()
}

/** Tira os simulados do plano sem recomeçar: ele foi montado quando os simulados ainda não entravam. */
export async function ficarSoComOficiais(plano: PlanoSalvo): Promise<PlanoSalvo | null> {
  const salvo = await salvarPlano({ p_data_prova: plano.data_prova, p_intensidade: plano.intensidade, p_folgas: plano.folgas, p_prova: plano.prova, p_base: plano.base_respondidas, p_recomecar: false }, false, plano.opcoes ?? undefined)
  marcarAvisoSimulados()
  return salvo
}

/** Muda só as opções (semana difícil, por exemplo), sem recomeçar a contagem. */
export async function salvarOpcoes(plano: PlanoSalvo, opcoes: OpcoesPlano): Promise<PlanoSalvo | null> {
  return salvarPlano({ p_data_prova: plano.data_prova, p_intensidade: plano.intensidade, p_folgas: plano.folgas, p_prova: plano.prova, p_base: plano.base_respondidas, p_recomecar: false }, incluiSimulados(plano), opcoes)
}

/**
 * Adiantar: as opções com o registro de hoje (a meta do dia e quanto a pessoa pediu
 * para adiantar), ou null se nada mudou. É o que permite, amanhã, tirar da meta o que
 * ela fez a mais hoje. Sem `pedido`, mantém o que já estava pedido.
 */
export function opcoesComAdiantamento(plano: PlanoSalvo, calculo: Pick<CalculoPlano, 'metaDiaria' | 'extraHoje' | 'adiantarPedido' | 'naRetaFinal' | 'provaPassou'>, pedido?: number): OpcoesPlano | null {
  if (calculo.naRetaFinal || calculo.provaPassou) return null
  const hoje = chaveData(new Date())
  const limite = chaveData(new Date(Date.now() - 30 * 86_400_000))
  const lista = opcoesDe(plano).adiantados.filter((r) => r.em >= limite)
  const atual = lista.find((r) => r.em === hoje)
  const novoPedido = Math.max(0, Math.round(pedido ?? atual?.pedido ?? 0))
  const outros = lista.filter((r) => r.em !== hoje).slice(-9)
  const precisa = calculo.extraHoje > 0 || novoPedido > 0
  if (!precisa) return atual ? { ...(plano.opcoes ?? {}), adiantados: outros } : null
  if (atual && atual.meta === calculo.metaDiaria && (atual.pedido ?? 0) === novoPedido) return null
  return { ...(plano.opcoes ?? {}), adiantados: [...outros, { em: hoje, meta: calculo.metaDiaria, ...(novoPedido ? { pedido: novoPedido } : {}) }] }
}

/** Grava o registro de hoje se mudou. Devolve o plano salvo (ou o plano com as opções novas, se o servidor falhar). */
export async function guardarAdiantamento(plano: PlanoSalvo, calculo: Parameters<typeof opcoesComAdiantamento>[1], pedido?: number): Promise<PlanoSalvo | null> {
  const opcoes = opcoesComAdiantamento(plano, calculo, pedido)
  if (!opcoes) return null
  try { return (await salvarOpcoes(plano, opcoes)) ?? { ...plano, opcoes } } catch { gravar(CHAVE_OPCOES, opcoes); return { ...plano, opcoes } }
}

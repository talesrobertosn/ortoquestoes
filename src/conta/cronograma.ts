import { chamarRpc, ErroRpc } from '../servicos/supabase'
import { gravar, ler } from '../estado/armazenamento'
import type { PlanoSalvo } from '../dados/planoEstudo'

/**
 * Leitura e gravação do cronograma no servidor. A escolha de incluir os
 * OrtoQuestões Simulados vai na coluna `incluir_simulados`; enquanto o banco
 * não tiver a coluna (SQL ainda não aplicado), fica guardada no aparelho.
 */
const CHAVE = 'cronograma:simulados'
const CHAVE_AVISO = 'cronograma:aviso-simulados'

/** O aviso de novidade dos simulados aparece uma vez para quem já tinha cronograma. */
export const avisoSimuladosVisto = () => ler<boolean>(CHAVE_AVISO, false)
export const marcarAvisoSimulados = () => gravar(CHAVE_AVISO, true)

const funcaoInexistente = (falha: unknown) => falha instanceof ErroRpc && falha.status === 404

export async function obterPlano(): Promise<PlanoSalvo | null> {
  const [plano] = await chamarRpc<PlanoSalvo[]>('obter_plano_estudo', {})
  if (!plano) return null
  return typeof plano.incluir_simulados === 'boolean' ? plano : { ...plano, incluir_simulados: ler<boolean>(CHAVE, true) }
}

export interface DadosPlano {
  p_data_prova: string
  p_intensidade: string
  p_folgas: number[]
  p_prova: string
  p_base: number
  p_recomecar: boolean
}

export async function salvarPlano(dados: DadosPlano, incluirSimulados: boolean): Promise<PlanoSalvo | null> {
  gravar(CHAVE, incluirSimulados)
  try {
    await chamarRpc('salvar_plano_estudo', { ...dados, p_incluir_simulados: incluirSimulados })
  } catch (falha) {
    if (!funcaoInexistente(falha)) throw falha
    await chamarRpc('salvar_plano_estudo', { ...dados })
  }
  return obterPlano()
}

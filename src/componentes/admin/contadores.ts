import { chamarRpc } from '../../servicos/supabase'
import { chaveAvaliacao, lerLocal } from './lidos'
import { rpcInexistente, usarConsulta } from './usarRpc'

/**
 * Os números do cabeçalho e dos avisos das abas. Vêm da RPC leve `contadores_admin`
 * (parte 22); sem ela, o painel continua funcionando: as contas saem da lista de
 * usuários (`derivado`) e as pendências de conteúdo das listas de relatos e
 * avaliações, sem baixar arquivos do acervo de questões.
 */
export interface Contadores {
  usuarios: number | null
  online: number | null
  /** Relatos em aberto + avaliações "não ajudou" com texto ainda não lidas; null se não deu para saber. */
  conteudo: number | null
  derivado: boolean
}

interface LinhaContadores { usuarios: number | string; online_agora: number | string; relatos_abertos: number | string; avaliacoes_para_ler: number | string }
interface AvaliacaoBase { id_questao: string; util: boolean; observacao: string | null; atualizado_em: string; usuario: string | null }

/** No plano B as listas são maiores: renova com menos frequência. */
let semRpcLeve = false

async function buscarContadores(sinal: AbortSignal): Promise<Contadores> {
  try {
    const [linha] = await chamarRpc<LinhaContadores[]>('contadores_admin', {}, { sinal })
    semRpcLeve = false
    if (!linha) return { usuarios: null, online: null, conteudo: null, derivado: false }
    return { usuarios: Number(linha.usuarios), online: Number(linha.online_agora), conteudo: Number(linha.relatos_abertos) + Number(linha.avaliacoes_para_ler), derivado: false }
  } catch (falha) {
    if (!rpcInexistente(falha)) throw falha
  }
  // Plano B enquanto a parte 22 não for colada no Supabase.
  semRpcLeve = true
  const [relatos, avaliacoes, lidos] = await Promise.all([
    chamarRpc<Array<{ status: string }>>('listar_relatos_admin', {}, { sinal }).catch(() => null),
    chamarRpc<AvaliacaoBase[]>('listar_avaliacoes_comentario_admin', {}, { sinal }).catch(() => null),
    chamarRpc<Array<{ chave: string }>>('listar_lidos_admin', { p_tipo: 'avaliacao' }, { sinal }).catch(() => [] as Array<{ chave: string }>),
  ])
  const vistos = new Set([...lerLocal('avaliacao'), ...lidos.map(l => l.chave)])
  const abertos = relatos?.filter(r => r.status === 'aberto').length
  const paraLer = avaliacoes?.filter(l => !l.util && l.observacao?.trim() && !vistos.has(chaveAvaliacao(l))).length
  return { usuarios: null, online: null, conteudo: abertos === undefined && paraLer === undefined ? null : (abertos ?? 0) + (paraLer ?? 0), derivado: true }
}

/** Contadores do painel, renovados a cada minuto (5 no plano B) com a aba do navegador visível. */
export function usarContadoresAdmin(conta: string | null | undefined) {
  return usarConsulta<Contadores>(conta ? `${conta}:contadores_admin` : null, buscarContadores, { atualizarCada: semRpcLeve ? 300_000 : 60_000 })
}

import { chamarFuncao } from '../servicos/supabase'
export const VERSAO_EXCLUSAO = '2026-11-15'
export async function excluirConta(email: string, idUsuario?: string) {
  return chamarFuncao<{ ok: boolean; excluida: boolean }>('excluir-conta', {
    email, ...(idUsuario ? { id_usuario: idUsuario, solicitacao_confirmada: true } : { aceite: VERSAO_EXCLUSAO }),
  }, { prazoMs: 90_000 })
}

import { chamarRpc } from '../../servicos/supabase'

/** Grupos derivados do acerto real, sem expor percentuais premium ou dados pessoais. */
export async function carregarFaixas(): Promise<Map<string, 1 | 2 | 3> | null> {
  try {
    const linhas = await chamarRpc<Array<{id_questao:string;faixa:1|2|3}>>('faixas_flashcards', {})
    return new Map(linhas.filter(x=>[1,2,3].includes(x.faixa)).map(x=>[x.id_questao,x.faixa]))
  } catch { return null }
}

import { banco } from './http.ts'

/**
 * Preços em centavos (Tales, 31/10/2026): escada de R$ 5 por mês, 39,90 / 34,90 / 29,90.
 * Quem já pagou antes do reajuste mantém para sempre o preço antigo do plano que pagava (Tales,
 * 03/11/2026), no cartão e no Pix: a função tem_preco_antigo do banco diz se a pessoa tem uma
 * assinatura daquele plano criada antes do corte, com pagamento aprovado e sem reembolso.
 * As cobranças aceitam os dois valores de cada plano.
 */
export const PRECOS = {
  mensal: { meses: 1, centavos: 3990 },
  semestral: { meses: 6, centavos: 20940 },
  anual: { meses: 12, centavos: 35880 },
} as const
export type IdPlano = keyof typeof PRECOS
export const PRECOS_ANTIGOS: Record<IdPlano, number> = { mensal: 3990, semestral: 17990, anual: 23990 }

export const valoresAceitos = (plano: IdPlano): number[] => [PRECOS[plano].centavos, PRECOS_ANTIGOS[plano]]

export async function temPrecoAntigo(idUsuario: string, plano: IdPlano): Promise<boolean> {
  // O mensal não mudou de preço: não precisa perguntar ao banco.
  if (PRECOS_ANTIGOS[plano] === PRECOS[plano].centavos) return false
  const resposta = await banco('rpc/tem_preco_antigo', { method: 'POST', body: JSON.stringify({ p_usuario: idUsuario, p_plano: plano }) })
  // Sem a resposta, nada é cobrado: cobrar o preço novo de quem tem direito ao antigo quebraria a promessa.
  if (!resposta.ok) throw new Error('consulta_preco_antigo_falhou')
  return (await resposta.json()) === true
}

/** O valor que esta pessoa paga pelo plano, em centavos. */
export async function centavosPara(idUsuario: string, plano: IdPlano): Promise<number> {
  return await temPrecoAntigo(idUsuario, plano) ? PRECOS_ANTIGOS[plano] : PRECOS[plano].centavos
}

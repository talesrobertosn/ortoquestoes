/**
 * Nome que aparece no ranking: primeiro nome + inicial do sobrenome, sempre
 * tirados do perfil. Espelha public.nome_publico_ranking() no banco, que é
 * quem de fato decide (um valor enviado pelo cliente é ignorado).
 */
export function nomeNoRanking(nome: string, sobrenome: string): string {
  const primeiro = (nome.trim().split(/\s+/)[0] ?? '').replace(/[^\p{L}'-]/gu, '').slice(0, 20)
  const inicial = sobrenome.trim().replace(/[^\p{L}]/gu, '').charAt(0).toUpperCase()
  const formatado = `${primeiro.charAt(0).toUpperCase()}${primeiro.slice(1).toLowerCase()}${inicial ? ` ${inicial}.` : ''}`.trim()
  return formatado.length >= 2 ? formatado : 'Participante'
}

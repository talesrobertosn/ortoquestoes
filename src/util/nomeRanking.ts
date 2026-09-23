/**
 * Nome que aparece no ranking: o nome completo do cadastro + a inicial do
 * sobrenome. Espelha public.nome_publico_ranking() no banco, que é quem de
 * fato decide (um valor enviado pelo cliente é ignorado).
 */
export function nomeNoRanking(nome: string, sobrenome: string): string {
  const limpo = nome.replace(/[^\p{L}' -]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 30).trim()
  const nomeFormatado = limpo.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, antes: string, letra: string) => antes + letra.toUpperCase())
  const inicial = sobrenome.trim().replace(/[^\p{L}]/gu, '').charAt(0).toUpperCase()
  const formatado = `${nomeFormatado}${inicial ? ` ${inicial}.` : ''}`.trim()
  return formatado.length >= 2 ? formatado : 'Participante'
}

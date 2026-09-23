/** Questões respondidas para entrar no ranking (igual ao having count(*) >= 5 no banco). */
export const MINIMO_RANKING = 5

/**
 * Nome padrão no ranking, para quem não escolheu apelido: o nome completo do
 * cadastro + a inicial do sobrenome. Espelha public.nome_publico_ranking() no
 * banco. O apelido escolhido fica em perfis_publicos (ver conta/perfilRanking).
 */
export function nomeNoRanking(nome: string, sobrenome: string): string {
  const limpo = nome.replace(/[^\p{L}' -]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 30).trim()
  const nomeFormatado = limpo.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, antes: string, letra: string) => antes + letra.toUpperCase())
  const inicial = sobrenome.trim().replace(/[^\p{L}]/gu, '').charAt(0).toUpperCase()
  const formatado = `${nomeFormatado}${inicial ? ` ${inicial}.` : ''}`.trim()
  return formatado.length >= 2 ? formatado : 'Participante'
}

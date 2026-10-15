/**
 * Versões dos documentos jurídicos do site. Há duas, e a divergência é proposital:
 *
 * - VERSAO_TERMOS: Termos de Uso e Privacidade. Fica no cadastro de cada conta
 *   (metadados `termos_versao` e `termos_aceitos_em`). Quando muda, quem aceitou
 *   uma versão anterior vê o aviso de "Termos atualizados" (AvisoTermos) até
 *   registrar a concordância com a nova versão.
 * - VERSAO_CONDICOES_ASSINATURA: Condições da Assinatura (termos de venda).
 *   É aceita de novo antes de cada checkout e registrada no servidor
 *   (`aceites_assinatura`). As Edge Functions `criar-checkout` e `criar-pix`
 *   conferem a versão: ao mudar aqui, publique antes as funções com a versão
 *   nova na lista de aceitas, senão o checkout recusa o pedido.
 *
 * As duas podem andar separadas (uma correção só nas Condições não obriga
 * ninguém a aceitar de novo os Termos); numa revisão conjunta, como a de
 * 16/10/2026, recebem a mesma data.
 */
export const VERSAO_TERMOS = '2026-10-16'

/** Versão das condições específicas exibidas antes de abrir o checkout. */
export const VERSAO_CONDICOES_ASSINATURA = '2026-10-16'

/**
 * O que mudou na versão atual, em linguagem simples. Aparece no aviso de
 * reaceite e no topo dos dois documentos. Trocar junto com a versão.
 */
export const MUDANCAS_TERMOS: readonly string[] = [
  'Os Termos de Uso e as Condições da Assinatura foram reescritos e reorganizados em cláusulas numeradas, com um resumo em linguagem simples no topo.',
  'Nova regra de descontinuidade: se o site for encerrado, deixar de vender planos, ficar gratuito para todos ou perder um recurso essencial do plano, quem tem período pago recebe de volta o valor proporcional aos dias que faltam.',
  'Ficou mais claro o que acontece no arrependimento de 7 dias, na garantia, no cancelamento, em cobranças recusadas e em contestações de pagamento.',
  'A parte de privacidade agora explica cada finalidade e base legal, inclusive o uso das páginas visitadas para entender o interesse nos planos e personalizar mensagens, e como deixar de receber cada tipo de e-mail.',
  'Regras de uso mais detalhadas: conta pessoal, proibição de cópia e extração do acervo, ranking e apelidos, funcionalidades em teste (como os Flashcards) e solução amigável de problemas pelo suporte.',
]

/** Dados a incluir no cadastro da conta, junto ao restante do perfil. */
export function dadosAceiteTermos() {
  return { termos_versao: VERSAO_TERMOS, termos_aceitos_em: new Date().toISOString() }
}

/** Data por extenso (ex.: "16 de outubro de 2026") de uma versão AAAA-MM-DD. */
export function dataDaVersao(versao: string): string {
  return new Date(versao + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

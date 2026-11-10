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
export const VERSAO_TERMOS = '2026-11-10'

/** Versão das condições específicas exibidas antes de abrir o checkout. */
export const VERSAO_CONDICOES_ASSINATURA = '2026-11-03'

/**
 * O que mudou na versão atual, em linguagem simples. Aparece no aviso de
 * reaceite e no topo dos dois documentos. Trocar junto com a versão.
 */
export const MUDANCAS_TERMOS: readonly string[] = [
  'Incluímos a OpenAI entre os serviços de medição de anúncios, com os pixels carregados apenas após o aceite no aviso de cookies.',
  'Explicamos a correspondência automática da OpenAI: dados de cadastro presentes nos formulários podem ser transformados em hashes no navegador para associar conversões aos anúncios. Hashes são identificadores, não dados anônimos.',
  'A escolha sobre cookies pode ser recusada ou revogada pelo rodapé, sem limitar o uso do site. Os eventos comerciais enviados pelo site não incluem CPF, respostas, desempenho ou assuntos estudados.',
]

/**
 * O que mudou nas Condições da Assinatura na versão atual (só nelas: os Termos de Uso
 * estão na versão de 10/11/2026). Aparece no topo das Condições.
 */
export const MUDANCAS_CONDICOES: readonly string[] = [
  'Valores dos planos: mensal R$ 39,90, semestral R$ 209,40 (R$ 34,90 por mês) e anual R$ 358,80 (R$ 29,90 por mês).',
  'Quem já assinava antes desta versão mantém o valor de antes do plano que pagava (semestral R$ 179,90 ou anual R$ 239,90), no cartão e no Pix, enquanto continuar renovando, sem prazo final. Se o plano acabar, há 30 dias para renovar pelo mesmo valor.',
]

/** Dados a incluir no cadastro da conta, junto ao restante do perfil. */
export function dadosAceiteTermos() {
  return { termos_versao: VERSAO_TERMOS, termos_aceitos_em: new Date().toISOString() }
}

/** Data por extenso (ex.: "16 de outubro de 2026") de uma versão AAAA-MM-DD. */
export function dataDaVersao(versao: string): string {
  return new Date(versao + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Muda sempre que o texto dos Termos de Uso mudar de forma relevante, para
 * registrar, no cadastro de cada conta, qual versão a pessoa efetivamente
 * aceitou.
 */
export const VERSAO_TERMOS = '2026-09-28'

/** Versão das condições específicas exibidas antes de abrir o checkout. */
export const VERSAO_CONDICOES_ASSINATURA = '2026-09-28'
/**
 * Versão aceita pela função criar-checkout antes da atualização de 28/09. Se o
 * servidor ainda não tiver sido publicado com a lista nova, o site repete o
 * pedido com ela para não travar a compra. Remover quando a função estiver no ar.
 */
export const VERSAO_CONDICOES_ANTERIOR = '2026-09-27'

/** Dados a incluir no cadastro da conta, junto ao restante do perfil. */
export function dadosAceiteTermos() {
  return { termos_versao: VERSAO_TERMOS, termos_aceitos_em: new Date().toISOString() }
}

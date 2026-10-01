/**
 * Muda sempre que o texto dos Termos de Uso mudar de forma relevante, para
 * registrar, no cadastro de cada conta, qual versão a pessoa efetivamente
 * aceitou.
 */
export const VERSAO_TERMOS = '2026-10-01'

/** Versão das condições específicas exibidas antes de abrir o checkout. */
export const VERSAO_CONDICOES_ASSINATURA = '2026-10-01'
/** Dados a incluir no cadastro da conta, junto ao restante do perfil. */
export function dadosAceiteTermos() {
  return { termos_versao: VERSAO_TERMOS, termos_aceitos_em: new Date().toISOString() }
}

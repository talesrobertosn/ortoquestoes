/**
 * Muda sempre que o texto dos Termos de Uso mudar de forma relevante, para
 * registrar, no cadastro de cada conta, qual versão a pessoa efetivamente
 * aceitou.
 */
export const VERSAO_TERMOS = '2026-09-16'

/** Dados a incluir no cadastro da conta, junto ao restante do perfil. */
export function dadosAceiteTermos() {
  return { termos_versao: VERSAO_TERMOS, termos_aceitos_em: new Date().toISOString() }
}

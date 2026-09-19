/** Traduz códigos de erro do Supabase Auth para uma frase que a pessoa entende. */
export function textoErro(codigo?: string) {
  if (codigo === 'invalid_credentials') return 'E-mail ou senha incorretos.'
  if (codigo === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar. Você pode reenviar a confirmação abaixo.'
  if (codigo === 'weak_password') return 'Use uma senha mais forte, com pelo menos 8 caracteres.'
  if (codigo?.includes('rate_limit') || codigo?.includes('over_')) return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
  return 'Não foi possível concluir. Confira os dados e sua conexão e tente novamente.'
}

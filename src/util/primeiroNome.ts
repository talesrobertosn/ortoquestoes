/**
 * Primeiro nome, como os e-mails (primeiroNome em supabase/functions/_shared/cartas.ts):
 * vazio quando o cadastro não traz um nome que dê para chamar a pessoa.
 */
export function primeiroNome(nome?: string | null): string {
  const primeiro = (nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}

/**
 * Cadastro feito, e-mail ainda não confirmado. Fica guardado neste navegador
 * para o pop-up de confirmação voltar se a pessoa recarregar a página de conta
 * sem ter confirmado. Some quando ela entra (a sessão prova que confirmou).
 */
const CHAVE = 'confirmacao-pendente:v1'
const VALIDADE_MS = 3 * 24 * 60 * 60 * 1000

export function gravarConfirmacaoPendente(email: string) {
  try { localStorage.setItem(CHAVE, JSON.stringify({ email, em: Date.now() })) } catch { /* sem armazenamento */ }
}

export function lerConfirmacaoPendente(): string | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const { email, em } = JSON.parse(bruto) as { email?: string; em?: number }
    if (!email || !em || Date.now() - em > VALIDADE_MS) { localStorage.removeItem(CHAVE); return null }
    return email
  } catch { return null }
}

export function limparConfirmacaoPendente() {
  try { localStorage.removeItem(CHAVE) } catch { /* sem armazenamento */ }
}

/** Atalho para a caixa de entrada dos provedores mais comuns. */
export function caixaDeEntrada(email: string): { nome: string; url: string } | null {
  const dominio = email.split('@')[1]?.trim().toLowerCase() ?? ''
  if (/^(gmail|googlemail)\.com$/.test(dominio)) return { nome: 'Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' }
  if (/^(hotmail|outlook|live|msn)\.(com|com\.br)$/.test(dominio)) return { nome: 'Outlook', url: 'https://outlook.live.com/mail/0/' }
  if (/^(yahoo|ymail)\.(com|com\.br)$/.test(dominio)) return { nome: 'Yahoo Mail', url: 'https://mail.yahoo.com/' }
  if (/^(icloud|me|mac)\.com$/.test(dominio)) return { nome: 'iCloud Mail', url: 'https://www.icloud.com/mail' }
  if (/^(uol|bol)\.com\.br$/.test(dominio)) return { nome: dominio.startsWith('uol') ? 'UOL Mail' : 'BOL Mail', url: dominio.startsWith('uol') ? 'https://email.uol.com.br/' : 'https://email.bol.uol.com.br/' }
  return null
}

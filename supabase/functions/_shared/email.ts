import { banco } from './http.ts'
import { emailAlerta } from './modelo-email.ts'

/**
 * Envio pelo Resend (https://resend.com). Segredos da Function:
 *   RESEND_API_KEY   chave da API
 *   EMAIL_REMETENTE  ex.: "OrtoQuestões <contato@ortoquestoes.com.br>" (domínio verificado no Resend)
 *   EMAIL_SEGREDO    texto aleatório longo, assina o link de descadastro
 * Sem RESEND_API_KEY nada é enviado e a função responde "email_nao_configurado".
 */
export const emailConfigurado = () => !!Deno.env.get('RESEND_API_KEY') && !!Deno.env.get('EMAIL_REMETENTE')

export async function enviarEmail(para: string | string[], assunto: string, html: string, texto: string, descadastro?: string) {
  const chave = Deno.env.get('RESEND_API_KEY'), remetente = Deno.env.get('EMAIL_REMETENTE')
  if (!chave || !remetente) throw new Error('email_nao_configurado')
  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: remetente,
      to: Array.isArray(para) ? para : [para],
      subject: assunto,
      html,
      text: texto,
      ...(descadastro ? { headers: { 'List-Unsubscribe': `<${descadastro}>` } } : {}),
    }),
  })
  if (!resposta.ok) throw new Error(`envio_recusado_${resposta.status}`)
}

export function site() {
  return (Deno.env.get('APP_ORIGIN') ?? 'https://ortoquestoes.com.br').replace(/\/+$/, '') + '/'
}

async function hmac(texto: string) {
  const segredo = Deno.env.get('EMAIL_SEGREDO')
  if (!segredo) throw new Error('email_nao_configurado')
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const assinatura = new Uint8Array(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(texto)))
  return [...assinatura].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40)
}
export async function linkDescadastro(idUsuario: string) {
  return `${site()}#/emails?u=${idUsuario}&t=${await hmac(`descadastro:${idUsuario}`)}`
}
export async function tokenDescadastroValido(idUsuario: string, token: string) {
  const esperado = await hmac(`descadastro:${idUsuario}`)
  if (esperado.length !== token.length) return false
  let diferenca = 0
  for (let i = 0; i < esperado.length; i++) diferenca |= esperado.charCodeAt(i) ^ token.charCodeAt(i)
  return diferenca === 0
}

export async function emailsAdministradores(): Promise<string[]> {
  const resposta = await banco('rpc/emails_administradores', { method: 'POST', body: '{}' })
  if (!resposta.ok) return []
  return (await resposta.json() as Array<{ email: string }>).map((l) => l.email).filter(Boolean)
}

/**
 * Alerta para os administradores, se ligado no painel. Nunca lança erro: quem
 * chama (webhook de pagamento, avaliação) não pode falhar por causa dele.
 */
export async function alertarAdministradores(titulo: string, linhas: string[], aba: string, referencia?: string) {
  try {
    if (!emailConfigurado()) return
    const config = await banco('configuracao_emails?id=eq.true&select=alertas_admin')
    if (config.ok && (await config.json() as Array<{ alertas_admin: boolean }>)[0]?.alertas_admin === false) return
    if (referencia) {
      const ja = await banco(`emails_enviados?tipo=eq.alerta_admin&referencia=eq.${encodeURIComponent(referencia)}&select=id&limit=1`)
      if (ja.ok && (await ja.json() as unknown[]).length) return
    }
    const para = await emailsAdministradores()
    if (!para.length) return
    const e = emailAlerta(titulo, linhas, `${site()}#/admin?aba=${aba}`)
    await enviarEmail(para, e.assunto, e.html, e.texto)
    await banco('emails_enviados', { method: 'POST', body: JSON.stringify({ tipo: 'alerta_admin', referencia: referencia ?? null, assunto: e.assunto }) })
  } catch { /* alerta é acessório */ }
}

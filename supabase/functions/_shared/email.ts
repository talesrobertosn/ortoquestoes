import { banco } from './http.ts'
import { emailAlerta } from './modelo-email.ts'

/**
 * Envio pelo Resend (https://resend.com). Segredos da Function:
 *   RESEND_API_KEY   chave da API
 *   EMAIL_REMETENTE  ex.: "OrtoQuestões <contato@ortoquestoes.com.br>" (domínio verificado no Resend)
 *   EMAIL_SEGREDO    texto aleatório longo, assina o link de descadastro
 *   EMAIL_RESPONDER_PARA  (opcional) e-mail que recebe as respostas, ex.: o seu Gmail
 * Sem RESEND_API_KEY nada é enviado e a função responde "email_nao_configurado".
 */
export const emailConfigurado = () => !!Deno.env.get('RESEND_API_KEY') && !!Deno.env.get('EMAIL_REMETENTE')

/**
 * `descadastro` vira o cabeçalho List-Unsubscribe, que o Gmail usa como sinal
 * de envio em massa: vai nos automáticos e fica de fora da carta pessoal (que
 * mantém o link no rodapé).
 */
export async function enviarEmail(para: string | string[], assunto: string, html: string, texto: string, descadastro?: string) {
  const chave = Deno.env.get('RESEND_API_KEY'), remetente = Deno.env.get('EMAIL_REMETENTE')
  const responder = Deno.env.get('EMAIL_RESPONDER_PARA')?.trim()
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
      ...(responder ? { reply_to: responder } : {}),
      ...(descadastro ? { headers: { 'List-Unsubscribe': `<${descadastro}>` } } : {}),
    }),
  })
  if (!resposta.ok) {
    // A mensagem do Resend diz o motivo (ex.: domínio não verificado); vai para o painel.
    const motivo = await resposta.json().then((d: { message?: string }) => d.message ?? '').catch(() => '')
    throw new Error(`envio_recusado_${resposta.status}${motivo ? `: ${motivo}` : ''}`.slice(0, 300))
  }
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
/** Qual e-mail o link desliga. Os links antigos (sem tipo) são de conquistas. */
export type TipoDescadastro = 'conquistas' | 'relatorio' | 'lembretes'
const textoAssinado = (idUsuario: string, tipo: TipoDescadastro) => tipo === 'conquistas' ? `descadastro:${idUsuario}` : `descadastro:${tipo}:${idUsuario}`

export async function linkDescadastro(idUsuario: string, tipo: TipoDescadastro = 'conquistas') {
  return `${site()}#/emails?u=${idUsuario}&t=${await hmac(textoAssinado(idUsuario, tipo))}${tipo === 'conquistas' ? '' : `&tipo=${tipo}`}`
}
export async function tokenDescadastroValido(idUsuario: string, token: string, tipo: TipoDescadastro = 'conquistas') {
  const esperado = await hmac(textoAssinado(idUsuario, tipo))
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

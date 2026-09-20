import { PREFIXO_ARMAZENAMENTO } from '../config'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '')
const chaveAnonima = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const chaveSessao = PREFIXO_ARMAZENAMENTO + 'auth:sessao'

export interface UsuarioConta {
  id: string
  email: string | null
  nome: string
}

interface SessaoSupabase {
  access_token: string
  refresh_token?: string
  expires_at?: number
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
}

function lerSessao(): SessaoSupabase | null {
  try {
    const bruto = localStorage.getItem(chaveSessao)
    return bruto ? JSON.parse(bruto) as SessaoSupabase : null
  } catch { return null }
}

function salvarSessao(sessao: SessaoSupabase | null) {
  if (sessao) localStorage.setItem(chaveSessao, JSON.stringify(sessao))
  else localStorage.removeItem(chaveSessao)
  window.dispatchEvent(new Event('ortoquestoes:auth'))
}

export function supabaseConfigurado() { return !!url && !!chaveAnonima }
export function obterSessao() { return lerSessao() }
export function obterToken() { return lerSessao()?.access_token ?? null }
async function garantirToken() {
  const sessao = lerSessao()
  if (!sessao) return null
  if (!sessao.expires_at || sessao.expires_at * 1000 > Date.now() + 60_000) return sessao.access_token
  if (!url || !chaveAnonima || !sessao.refresh_token) { salvarSessao(null); return null }
  const resposta = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, { method:'POST', headers:{apikey:chaveAnonima,'Content-Type':'application/json'}, body:JSON.stringify({refresh_token:sessao.refresh_token}) })
  if (!resposta.ok) { salvarSessao(null); return null }
  const nova = await resposta.json() as SessaoSupabase & { expires_in?: number }
  nova.expires_at ??= Math.floor(Date.now()/1000)+(nova.expires_in ?? 3600)
  salvarSessao(nova)
  return nova.access_token
}

export function obterUsuario(): UsuarioConta | null {
  const u = lerSessao()?.user
  if (!u) return null
  const nome = String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'Estudante')
  return { id: u.id, email: u.email ?? null, nome }
}

export function consumirRetornoAuth(): boolean {
  const parametros = new URLSearchParams(location.hash.includes('access_token=') ? location.hash.slice(1) : '')
  const token = parametros.get('access_token')
  if (!token) return false
  const partes = token.split('.')
  if (partes.length !== 3) return false
  const payload = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub: string; email?: string; user_metadata?: Record<string, unknown>; exp?: number }
  salvarSessao({ access_token: token, refresh_token: parametros.get('refresh_token') ?? undefined, expires_at: payload.exp, user: { id: payload.sub, email: payload.email, user_metadata: payload.user_metadata } })
  history.replaceState(null, '', location.pathname + location.search + '#/assinatura')
  window.dispatchEvent(new HashChangeEvent('hashchange'))
  return true
}

export async function enviarLinkAcesso(email: string) {
  if (!url || !chaveAnonima) throw new Error('A entrada ainda não está configurada.')
  const resposta = await fetch(`${url}/auth/v1/otp`, {
    method: 'POST',
    headers: { apikey: chaveAnonima, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: location.origin + location.pathname } }),
  })
  if (!resposta.ok) throw new Error('Não foi possível enviar o link de acesso.')
}

export function sair() { salvarSessao(null) }

export async function chamarRpc<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  if (!url || !chaveAnonima) throw new Error('Servidor não configurado.')
  const token = await garantirToken()
  if (!token) throw new Error('Entre na sua conta para continuar.')
  const resposta = await fetch(`${url}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: { apikey: chaveAnonima, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  if (!resposta.ok) throw new Error(`O servidor não pôde validar a resposta (${resposta.status}).`)
  return await resposta.json() as T
}

export async function chamarFuncao<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  if (!url || !chaveAnonima) throw new Error('Servidor não configurado.')
  const token = await garantirToken()
  if (!token) throw new Error('Entre na sua conta para continuar.')
  const resposta = await fetch(`${url}/functions/v1/${nome}`, {
    method: 'POST', headers: { apikey: chaveAnonima, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  })
  const dados = await resposta.json().catch(() => ({})) as T & { erro?: string }
  if (!resposta.ok) throw new Error(dados.erro ?? 'Não foi possível concluir a operação.')
  return dados
}

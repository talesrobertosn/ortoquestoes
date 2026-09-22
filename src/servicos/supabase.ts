import { PREFIXO_ARMAZENAMENTO } from '../config'
import { supabase as clienteConta } from '../conta/supabase'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '')
// A chave publishable é o formato atual. A anon permanece como fallback
// público durante a transição, sem jamais aceitar uma chave privilegiada.
const chaveSupabase = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim()
  || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
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

// A área de treino usa o cliente Supabase com renovação automática. Mantemos
// a sessão usada pelas RPCs de planos em sincronia e a removemos ao sair.
if (clienteConta) {
  clienteConta.auth.onAuthStateChange((evento, proxima) => {
    if (evento === 'SIGNED_OUT') salvarSessao(null)
    if (evento === 'TOKEN_REFRESHED' && proxima) {
      salvarSessao({
        access_token: proxima.access_token,
        refresh_token: proxima.refresh_token,
        expires_at: proxima.expires_at ?? undefined,
        user: proxima.user,
      })
    }
  })
}

export function supabaseConfigurado() { return !!url && !!chaveSupabase }
export function obterSessao() { return lerSessao() }
export function obterToken() { return lerSessao()?.access_token ?? null }
async function tokenDoClienteConta(): Promise<string | null> {
  if (!clienteConta) return null
  const limite = new Promise<null>((resolver) => setTimeout(() => resolver(null), 10_000))
  const leitura = clienteConta.auth.getSession().then(({ data }) => data.session?.access_token ?? null).catch(() => null)
  return Promise.race([leitura, limite])
}

// A sessão do cliente de conta é a que o app considera "logada" e a única que
// se renova de forma confiável; a cópia local só serve ao retorno por link.
async function garantirToken() {
  const doCliente = await tokenDoClienteConta()
  if (doCliente) return doCliente
  const sessao = lerSessao()
  if (!sessao) return null
  if (!sessao.expires_at || sessao.expires_at * 1000 > Date.now() + 60_000) return sessao.access_token
  if (!url || !chaveSupabase || !sessao.refresh_token) { salvarSessao(null); return null }
  const resposta = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, { method:'POST', headers:{apikey:chaveSupabase,'Content-Type':'application/json'}, body:JSON.stringify({refresh_token:sessao.refresh_token}) })
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
  const fragmento = location.hash.slice(1)
  const inicioParametros = fragmento.indexOf('access_token=')
  const parametros = new URLSearchParams(inicioParametros >= 0 ? fragmento.slice(inicioParametros) : '')
  const token = parametros.get('access_token')
  if (!token) return false
  try {
    const partes = token.split('.')
    if (partes.length !== 3) return false
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as { sub?: string; email?: string; user_metadata?: Record<string, unknown>; exp?: number }
    if (!payload.sub) return false
    salvarSessao({ access_token: token, refresh_token: parametros.get('refresh_token') ?? undefined, expires_at: payload.exp, user: { id: payload.sub, email: payload.email, user_metadata: payload.user_metadata } })
    history.replaceState(null, '', location.pathname + location.search + '#/assinatura')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return true
  } catch { return false }
}

export async function enviarLinkAcesso(email: string) {
  if (!url || !chaveSupabase) throw new Error('A entrada ainda não está configurada.')
  const resposta = await fetch(`${url}/auth/v1/otp`, {
    method: 'POST',
    headers: { apikey: chaveSupabase, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: location.origin + location.pathname } }),
  })
  if (!resposta.ok) throw new Error('Não foi possível enviar o link de acesso.')
}

/**
 * A senha existe apenas durante o envio deste formulário. A sessão recebida é
 * salva pelos dois clientes públicos do app; a senha não é persistida.
 */
export async function entrarComSenha(email: string, senha: string) {
  if (!url || !chaveSupabase) throw new Error('A entrada ainda não está configurada.')
  const resposta = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: chaveSupabase, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  })
  const dados = await resposta.json().catch(() => null) as (SessaoSupabase & { expires_in?: number; error_description?: string; msg?: string }) | null
  if (!resposta.ok || !dados?.access_token || !dados.refresh_token || !dados.user?.id) {
    throw new Error(dados?.error_description ?? dados?.msg ?? 'Não foi possível entrar com a senha.')
  }
  dados.expires_at ??= Math.floor(Date.now() / 1000) + (dados.expires_in ?? 3600)
  salvarSessao(dados)
  if (!clienteConta) throw new Error('A sessão da conta ainda não está configurada.')
  const { error } = await clienteConta.auth.setSession({
    access_token: dados.access_token,
    refresh_token: dados.refresh_token,
  })
  if (error) {
    salvarSessao(null)
    throw new Error('Não foi possível iniciar a sessão da conta.')
  }
}

export function sair() { salvarSessao(null) }

export async function chamarRpc<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  if (!url || !chaveSupabase) throw new Error('Servidor não configurado.')
  const token = await garantirToken()
  if (!token) throw new Error('Entre na sua conta para continuar.')
  const resposta = await fetch(`${url}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: { apikey: chaveSupabase, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  if (!resposta.ok) throw new Error(`O servidor não pôde validar a resposta (${resposta.status}).`)
  return await resposta.json() as T
}

export async function chamarFuncao<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  if (!url || !chaveSupabase) throw new Error('Servidor não configurado.')
  const token = await garantirToken()
  if (!token) throw new Error('Entre na sua conta para continuar.')
  const resposta = await fetch(`${url}/functions/v1/${nome}`, {
    method: 'POST', headers: { apikey: chaveSupabase, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  })
  const dados = await resposta.json().catch(() => ({})) as T & { erro?: string }
  if (!resposta.ok) throw new Error(dados.erro ?? 'Não foi possível concluir a operação.')
  return dados
}

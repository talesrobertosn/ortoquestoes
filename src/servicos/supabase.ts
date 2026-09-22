import { PREFIXO_ARMAZENAMENTO } from '../config'
import { supabase as clienteConta, chave as chaveSupabase, url as urlConta } from '../conta/supabase'

const url = urlConta.replace(/\/+$/, '')

// O login antigo guardava uma cópia própria da sessão. Hoje a única sessão é a
// do cliente de conta; a cópia que tenha sobrado em algum navegador é apagada.
try { localStorage.removeItem(PREFIXO_ARMAZENAMENTO + 'auth:sessao') } catch { /* armazenamento indisponível */ }

// Token da sessão do cliente de conta, mantido pelos próprios eventos de
// autenticação. Ler daqui é imediato: `auth.getSession()` passa por uma trava
// interna do supabase-js que, no Chrome, pode ficar presa (renovação pendente,
// outra aba), e com ela o botão de responder parecia não fazer nada.
let tokenConta: { token: string; expiraEm: number } | null = null

if (clienteConta) {
  clienteConta.auth.onAuthStateChange((_evento, sessao) => {
    tokenConta = sessao ? { token: sessao.access_token, expiraEm: (sessao.expires_at ?? 0) * 1000 } : null
  })
}

async function tokenDoClienteConta(): Promise<string | null> {
  if (!clienteConta) return null
  const limite = new Promise<null>((resolver) => setTimeout(() => resolver(null), 4_000))
  const leitura = clienteConta.auth.getSession().then(({ data }) => data.session?.access_token ?? null).catch(() => null)
  return Promise.race([leitura, limite])
}

async function garantirToken(forcarLeitura = false) {
  if (!forcarLeitura && tokenConta && tokenConta.expiraEm > Date.now() + 30_000) return tokenConta.token
  return tokenDoClienteConta()
}

/** fetch com prazo: rede lenta não pode deixar um botão travado para sempre. */
async function buscarComPrazo(endereco: string, opcoes: RequestInit, prazoMs = 8_000): Promise<Response> {
  const controle = new AbortController()
  const temporizador = setTimeout(() => controle.abort(), prazoMs)
  try {
    return await fetch(endereco, { ...opcoes, signal: controle.signal })
  } finally {
    clearTimeout(temporizador)
  }
}

export async function chamarRpc<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  if (!clienteConta) throw new Error('Servidor não configurado.')
  const enviar = async (forcarLeitura: boolean) => {
    const token = await garantirToken(forcarLeitura)
    if (!token) throw new Error('Entre na sua conta para continuar.')
    return buscarComPrazo(`${url}/rest/v1/rpc/${nome}`, {
      method: 'POST',
      headers: { apikey: chaveSupabase, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
  }
  let resposta = await enviar(false)
  // Token recusado (expirou entre a leitura e o envio): tenta uma vez com a sessão relida.
  if (resposta.status === 401) resposta = await enviar(true)
  if (!resposta.ok) throw new Error(`O servidor não pôde validar a resposta (${resposta.status}).`)
  return await resposta.json() as T
}

export async function chamarFuncao<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  if (!clienteConta) throw new Error('Servidor não configurado.')
  const token = await garantirToken()
  if (!token) throw new Error('Entre na sua conta para continuar.')
  const resposta = await buscarComPrazo(`${url}/functions/v1/${nome}`, {
    method: 'POST', headers: { apikey: chaveSupabase, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  }, 20_000)
  const dados = await resposta.json().catch(() => ({})) as T & { erro?: string }
  if (!resposta.ok) throw new Error(dados.erro ?? 'Não foi possível concluir a operação.')
  return dados
}

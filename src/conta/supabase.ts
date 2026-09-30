import { AuthClient } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'
// Precisa ser avaliado antes de createClient e do primeiro render: limpa do
// endereço os parâmetros que o Supabase devolve no hash (ver retornoAuth.ts).
import './retornoAuth'

// O endereço e a chave publicável podem ser embutidos no site: eles não dão
// acesso administrativo. Variáveis de ambiente continuam úteis para forks e
// ambientes de desenvolvimento.
export const url = (import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://oojrfzfjmkgmjcgzczln.supabase.co')
export const chave = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || 'sb_publishable_aezka5hw-Bt81gy5Lsjl3g_5i_E5w1z')
// Somente a chave publicável entra no navegador. Nunca usar service_role/secret.
export const contasDisponiveis = !!url && /^https:\/\//.test(url) && !!chave && chave.startsWith('sb_publishable_')
/**
 * Todo pedido ao Supabase tem prazo. Sem isso, uma conexão que fica pendurada
 * (celular trocando de rede, aba congelada) prende a fila de sincronização
 * para sempre e as respostas ficam "aguardando envio".
 */
function buscarComPrazo(entrada: RequestInfo | URL, opcoes: RequestInit = {}): Promise<Response> {
  const controle = new AbortController()
  const temporizador = setTimeout(() => controle.abort(), 20_000)
  if (opcoes.signal) {
    if (opcoes.signal.aborted) controle.abort()
    else opcoes.signal.addEventListener('abort', () => controle.abort(), { once: true })
  }
  return fetch(entrada, { ...opcoes, signal: controle.signal }).finally(() => clearTimeout(temporizador))
}

/**
 * Cliente enxuto: só as duas peças que o site usa, login (auth-js) e banco
 * (postgrest-js), montadas como o createClient do supabase-js as monta. O
 * pacote completo trazia junto tempo real, arquivos e funções, que o site
 * não usa: eram 28 KB a mais (compactados) a baixar e interpretar no celular
 * antes da primeira tela.
 */
function criarCliente(endereco: string, chavePublica: string) {
  const base = endereco.replace(/\/+$/, '') + '/'
  const auth = new AuthClient({
    url: new URL('auth/v1', base).href,
    headers: { Authorization: `Bearer ${chavePublica}`, apikey: chavePublica },
    // Sem a opção `lock`: desde a 2.116 o cliente coordena a renovação da sessão
    // sem trava nenhuma (nem navigator.locks, que podia ficar presa no Chrome e
    // congelar a sincronização). Passar processLock só gerava aviso de obsoleto.
    flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
    storageKey: 'sb-ortoquestoes-auth',
    fetch: buscarComPrazo,
  })
  // Igual ao fetchWithAuth do supabase-js: o token da sessão quando há login,
  // a chave publicável quando não há.
  const buscarAutenticado: typeof fetch = async (entrada, opcoes) => {
    const { data } = await auth.getSession()
    const cabecalhos = new Headers(opcoes?.headers)
    if (!cabecalhos.has('apikey')) cabecalhos.set('apikey', chavePublica)
    if (!cabecalhos.has('Authorization')) cabecalhos.set('Authorization', `Bearer ${data.session?.access_token ?? chavePublica}`)
    return buscarComPrazo(entrada, { ...opcoes, headers: cabecalhos })
  }
  const rest = new PostgrestClient(new URL('rest/v1', base).href, { fetch: buscarAutenticado })
  return {
    auth,
    from: (tabela: string) => rest.from(tabela),
    rpc: (funcao: string, argumentos: Record<string, unknown> = {}) => rest.rpc(funcao, argumentos),
  }
}

export type ClienteSupabase = ReturnType<typeof criarCliente>

export const supabase = contasDisponiveis ? criarCliente(url, chave) : null

export function retornoConta(recuperacao = false) {
  const retorno = new URL(window.location.pathname, window.location.origin)
  retorno.searchParams.set('conta', recuperacao ? 'recuperar' : 'confirmar')
  return retorno.href
}

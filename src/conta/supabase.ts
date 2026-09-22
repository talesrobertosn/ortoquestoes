import { createClient, processLock } from '@supabase/supabase-js'

// O endereço e a chave publicável podem ser embutidos no site: eles não dão
// acesso administrativo. Variáveis de ambiente continuam úteis para forks e
// ambientes de desenvolvimento.
const url = (import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://oojrfzfjmkgmjcgzczln.supabase.co')
const chave = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || 'sb_publishable_aezka5hw-Bt81gy5Lsjl3g_5i_E5w1z')
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

export const supabase = contasDisponiveis ? createClient(url!, chave!, {
  // processLock: trava só dentro desta aba. A trava padrão (navigator.locks,
  // compartilhada entre abas) pode ficar presa no Chrome e congelar todas as
  // chamadas autenticadas, inclusive a sincronização do progresso.
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
    storageKey: 'sb-ortoquestoes-auth', lock: processLock },
  global: { fetch: buscarComPrazo },
}) : null

export function retornoConta(recuperacao = false) {
  const retorno = new URL(window.location.pathname, window.location.origin)
  retorno.searchParams.set('conta', recuperacao ? 'recuperar' : 'confirmar')
  return retorno.href
}

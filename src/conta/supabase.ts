import { createClient } from '@supabase/supabase-js'

// O endereço e a chave publicável podem ser embutidos no site: eles não dão
// acesso administrativo. Variáveis de ambiente continuam úteis para forks e
// ambientes de desenvolvimento.
const url = (import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://oojrfzfjmkgmjcgzczln.supabase.co')
const chave = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || 'sb_publishable_aezka5hw-Bt81gy5Lsjl3g_5i_E5w1z')
// Somente a chave publicável entra no navegador. Nunca usar service_role/secret.
export const contasDisponiveis = !!url && /^https:\/\//.test(url) && !!chave && chave.startsWith('sb_publishable_')
export const supabase = contasDisponiveis ? createClient(url!, chave!, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
    storageKey: 'sb-ortoquestoes-auth' },
}) : null

export function retornoConta(recuperacao = false) {
  const retorno = new URL(window.location.pathname, window.location.origin)
  retorno.searchParams.set('conta', recuperacao ? 'recuperar' : 'confirmar')
  return retorno.href
}

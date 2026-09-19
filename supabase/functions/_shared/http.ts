export const cors = { 'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'https://ortoquestoes.com.br', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Content-Type': 'application/json' }
export const json = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), { status, headers: cors })
export async function usuarioDoPedido(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: req.headers.get('authorization') ?? '' } })
  if (!r.ok) throw new Error('autenticacao_necessaria')
  return await r.json() as { id: string; email?: string }
}
export async function banco(caminho: string, init: RequestInit = {}) {
  const base = Deno.env.get('SUPABASE_URL')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return fetch(`${base}/rest/v1/${caminho}`, { ...init, headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers ?? {}) } })
}

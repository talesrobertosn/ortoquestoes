import { banco, cors, json, usuarioDoPedido } from '../_shared/http.ts'
const VERSAO = '2026-11-15'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
async function rpc(nome: string, corpo: Record<string, unknown>) {
  const r = await banco(`rpc/${nome}`, { method: 'POST', body: JSON.stringify(corpo) })
  if (!r.ok) {
    const erro = await r.json().catch(() => ({}))
    console.error('exclusao_rpc_falhou', JSON.stringify({ funcao: nome, http: r.status, codigo: erro.code }))
    if (erro.message === 'administrador_protegido') throw new Error('A conta de administrador é protegida e não pode ser excluída por esta ação.')
    throw new Error('Não foi possível concluir a exclusão no banco. Tente novamente ou fale com o suporte.')
  }
  return r.json()
}
async function authAdmin(id: string) {
  const base = Deno.env.get('SUPABASE_URL')!, key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const r = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(id)}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (r.status === 404) return null
  if (!r.ok) throw new Error('Não foi possível conferir a conta selecionada.')
  return r.json() as Promise<{ id: string; email?: string }>
}
/** Exportado para testar autorização, cancelamento e falhas sem apagar contas reais. */
export async function atender(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json({ erro: 'Método inválido.' }, 405, req)
  try {
    const ator = await usuarioDoPedido(req)
    const corpo = await req.json() as { id_usuario?: string; email?: string; aceite?: string; solicitacao_confirmada?: boolean }
    const id = corpo.id_usuario ?? ator.id
    if (!UUID.test(id)) return json({ erro: 'Conta inválida.' }, 400, req)
    if (id !== ator.id) {
      const admin = await banco(`administradores?id_usuario=eq.${ator.id}&select=id_usuario`)
      if (!admin.ok || !(await admin.json()).length) return json({ erro: 'Acesso negado.' }, 403, req)
      if (corpo.solicitacao_confirmada !== true) return json({ erro: 'Confirme que o titular solicitou a exclusão.' }, 400, req)
    } else if (corpo.aceite !== VERSAO) return json({ erro: 'Leia e aceite as condições de exclusão.' }, 400, req)
    const alvo = await authAdmin(id)
    if (!alvo) return json({ ok: true, excluida: true }, 200, req)
    if (!corpo.email || corpo.email.toLowerCase() !== alvo.email?.toLowerCase()) return json({ erro: 'O e-mail não corresponde à conta selecionada. Atualize a página.' }, 409, req)
    const dados = await rpc('dados_exclusao_conta_servidor', { p_id: id }) as { assinaturas: Array<{ id: string; externo: string }>; arquivos: Array<{ bucket: string; nome: string }>; legado: boolean; checkout: boolean }
    if (dados.legado) return json({ erro: 'Esta conta tem uma assinatura antiga que precisa ser encerrada pelo suporte antes da exclusão.' }, 409, req)
    // Checkouts pendentes podem existir no provedor antes de chegar o webhook.
    // Consulta paginada; só aceita referências exatas deste UUID (nunca só por e-mail).
    const assinaturas: Array<{ id: string | null; externo: string }> = [...dados.assinaturas]
    if (dados.checkout) {
      const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
      if (!token) throw new Error('Não foi possível conferir os checkouts. A conta não foi excluída.')
      const vistos = new Set(assinaturas.map(a => a.externo))
      for (const filtro of [`q=${encodeURIComponent(id)}`, `payer_email=${encodeURIComponent(alvo.email!)}`]) {
        let acabou = false
        for (let offset = 0; offset < 1000; offset += 100) {
          const r = await fetch(`https://api.mercadopago.com/preapproval/search?${filtro}&limit=100&offset=${offset}`, { headers: { Authorization: `Bearer ${token}` } })
          if (!r.ok) throw new Error('Não foi possível conferir todos os checkouts. A conta não foi excluída.')
          const lista = await r.json() as { results?: Array<{ id?: string; external_reference?: string; status?: string }>; paging?: { total?: number } }
          if (!Array.isArray(lista.results)) throw new Error('O provedor não confirmou a consulta de assinaturas.')
          for (const a of lista.results) if (a.external_reference === id && a.id && a.status !== 'cancelled' && !vistos.has(a.id)) { assinaturas.push({ id: null, externo: a.id }); vistos.add(a.id) }
          if (offset + lista.results.length >= (lista.paging?.total ?? Infinity) || lista.results.length < 100) { acabou = true; break }
        }
        if (!acabou) throw new Error('A consulta de checkouts excedeu o limite. Fale com o suporte antes de excluir.')
      }
    }
    // Qualquer falha mantém o cadastro. Cancelamentos já confirmados são retomáveis.
    for (const a of assinaturas) {
      const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
      if (!token) throw new Error('Não foi possível cancelar a renovação. A conta não foi excluída.')
      const url = `https://api.mercadopago.com/preapproval/${encodeURIComponent(a.externo)}`
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      const consulta = await fetch(url, { headers })
      if (!consulta.ok) throw new Error('Não foi possível conferir a renovação. A conta não foi excluída.')
      const remota = await consulta.json()
      if (remota.external_reference !== id) throw new Error('A assinatura não corresponde à conta. A exclusão foi interrompida.')
      if (remota.status !== 'cancelled') {
        const canc = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ status: 'cancelled' }) })
        if (!canc.ok) throw new Error('O Mercado Pago não confirmou o cancelamento. A conta não foi excluída.')
      }
      const confirmado = await fetch(url, { headers })
      if (!confirmado.ok || (await confirmado.json()).status !== 'cancelled') throw new Error('A renovação ainda não está cancelada. A conta não foi excluída.')
      const salva = a.id ? await banco(`assinaturas?id=eq.${a.id}&id_usuario=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelada', cancelar_ao_fim: true, cancelada_em: new Date().toISOString() }) }) : new Response('[]')
      if (!salva.ok) throw new Error('A renovação foi cancelada, mas a exclusão não terminou. Tente novamente.')
    }
    for (const bucket of new Set(dados.arquivos.map(a => a.bucket))) {
      const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const nomes = dados.arquivos.filter(a => a.bucket === bucket).map(a => a.nome)
      for (let i = 0; i < nomes.length; i += 100) {
        const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/storage/v1/object/${encodeURIComponent(bucket)}`, { method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: nomes.slice(i, i + 100) }) })
        if (!r.ok) throw new Error('Não foi possível remover os arquivos desta conta. Tente novamente.')
      }
    }
    await rpc('excluir_conta_servidor', { p_id: id, p_email: alvo.email })
    return json({ ok: true, excluida: true }, 200, req)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'autenticacao_necessaria') return json({ erro: 'Entre na sua conta para continuar.' }, 401, req)
    return json({ erro: msg.startsWith('Não ') || msg.startsWith('A ') || msg.startsWith('O ') ? msg : 'Não foi possível excluir a conta. Tente novamente ou contate o suporte.' }, 409, req)
  }
}

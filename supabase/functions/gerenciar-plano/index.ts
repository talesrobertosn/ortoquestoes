import { banco, cors, json, usuarioDoPedido } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null,{headers:cors(req)})
  try {
    const u=await usuarioDoPedido(req), { acao }=await req.json() as { acao?: 'cancelar'|'reembolsar' }
    if (!acao) return json({erro:'acao_invalida'},400,req)
    if (Deno.env.get('MERCADO_PAGO_INTEGRACAO_VALIDADA')!=='true') return json({erro:'integracao_nao_validada'},503,req)
    const consulta=await banco(`assinaturas?id_usuario=eq.${u.id}&status=eq.ativa&order=atualizada_em.desc&limit=1`), [a]=await consulta.json()
    if(!a) return json({erro:'plano_ativo_nao_encontrado'},404,req)
    const emGarantia=a.ultima_cobranca_em && Date.now()-new Date(a.ultima_cobranca_em).getTime()<=7*864e5
    if(acao==='reembolsar' && !emGarantia) return json({erro:'prazo_de_garantia_encerrado'},409,req)
    const token=Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!
    if(acao==='reembolsar' && a.ultima_cobranca_id) {
      const r=await fetch(`https://api.mercadopago.com/v1/payments/${a.ultima_cobranca_id}/refunds`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'X-Idempotency-Key':crypto.randomUUID()}})
      if(!r.ok) return json({erro:'reembolso_nao_confirmado'},502,req)
    }
    const r=await fetch(`https://api.mercadopago.com/preapproval/${a.id_externo}`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({status:'cancelled'})})
    if(!r.ok) return json({erro:'cancelamento_nao_confirmado'},502,req)
    await banco(`assinaturas?id=eq.${a.id}`,{method:'PATCH',body:JSON.stringify(emGarantia?{status:'reembolsada',fim_periodo:new Date().toISOString(),cancelada_em:new Date().toISOString()}:{cancelar_ao_fim:true,cancelada_em:new Date().toISOString()})})
    return json({ok:true,garantia:!!emGarantia},200,req)
  } catch(erro){return json({erro:String(erro)},401,req)}
})

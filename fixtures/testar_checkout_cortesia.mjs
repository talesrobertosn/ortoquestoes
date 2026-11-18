import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const tmp=await mkdtemp(join(process.cwd(),'node_modules/.checkout-cortesia-'))
const original={Deno:globalThis.Deno,fetch:globalThis.fetch}
try{
 let handler,preservado=null,assinaturas=[],falhar=false,compras=[]
 const uid='00000000-0000-4000-8000-000000000001'
 const env={SUPABASE_URL:'https://banco.test',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service',PAGAMENTOS_HABILITADOS:'true',MERCADO_PAGO_INTEGRACAO_VALIDADA:'true',MERCADO_PAGO_ACCESS_TOKEN:'fake',MERCADO_PAGO_AMBIENTE:'producao',MERCADO_PAGO_RESTRITO_CONTAS_TESTE:'false',APP_ORIGIN:'https://site.test'}
 globalThis.Deno={env:{get:k=>env[k]},serve:h=>handler=h}
 const j=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json'}})
 globalThis.fetch=async(input,init={})=>{
  const u=new URL(input),body=JSON.parse(init.body??'{}')
  if(u.pathname==='/auth/v1/user')return init.headers.Authorization==='Bearer usuario'?j({id:uid,email:'pessoa@example.invalid'}):j({},401)
  if(u.pathname.endsWith('/assinaturas'))return j(assinaturas)
  if(u.pathname.endsWith('/rpc/inicio_proximo_periodo')){assert.equal(body.p_usuario,uid);return falhar?j({},500):j(preservado)}
  if(u.pathname.endsWith('/rpc/tem_preco_antigo'))return j(false)
  if(u.pathname.endsWith('/aceites_assinatura'))return j([],201)
  if(u.hostname==='api.mercadopago.com'){compras.push(body);return j({init_point:'https://www.mercadopago.com.br/subscriptions/checkout?simulado=1'})}
  throw Error(`HTTP não previsto ${u.pathname}`)
 }
 await build({entryPoints:['supabase/functions/criar-checkout/index.ts'],bundle:true,platform:'node',format:'esm',outfile:join(tmp,'c.mjs')})
 await import(pathToFileURL(join(tmp,'c.mjs')))
 const pedir=()=>handler(new Request('https://funcao.test',{method:'POST',headers:{Authorization:'Bearer usuario','Content-Type':'application/json'},body:JSON.stringify({plano:'mensal',aceite_confirmado:true,aceite_termos_versao:'2026-11-13'})}))
 let r=await pedir();assert.equal(r.status,200);assert.equal(compras.at(-1).auto_recurring.start_date,undefined)
 preservado=new Date(Date.now()+7*864e5).toISOString()
 r=await pedir();assert.equal(r.status,200);assert.equal((await r.json()).inicio_cobranca,preservado);assert.equal(compras.at(-1).auto_recurring.start_date,preservado)
 assinaturas=[{id_externo:'pix:teste',fim_periodo:new Date(Date.now()+3*864e5).toISOString(),plano:'mensal'}]
 preservado=new Date(Date.now()+10*864e5).toISOString()
 r=await pedir();assert.equal(r.status,200);assert.equal(compras.at(-1).auto_recurring.start_date,preservado,'preserva Pix e cortesia')
 const antes=compras.length;falhar=true;r=await pedir();assert.notEqual(r.status,200);assert.equal(compras.length,antes,'erro de consulta não cria pagamento com saldo perdido')
 console.log('Checkout: primeira cobrança depois da cortesia/Pix; saldo consultado na conta correta; falha impede cobrança sem preservar os dias. Nenhuma compra real.')
}finally{Object.assign(globalThis,original);await rm(tmp,{recursive:true,force:true})}

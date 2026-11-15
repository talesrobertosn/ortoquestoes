import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const dir=await mkdtemp(join(tmpdir(),'oq-exclusao-'))
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222'
let config={}, chamadas=[]
globalThis.Deno={env:{get:k=>({SUPABASE_URL:'https://banco.test',SUPABASE_ANON_KEY:'publica',SUPABASE_SERVICE_ROLE_KEY:'secreta',MERCADO_PAGO_ACCESS_TOKEN:'mp'}[k])}}
const reply=(v,status=200)=>new Response(JSON.stringify(v),{status})
globalThis.fetch=async(url,opts={})=>{
 chamadas.push([url,opts.method||'GET',opts.body]);
 if(url.endsWith('/auth/v1/user'))return config.semLogin?reply({},401):reply({id:A,email:'a@example.test'})
 if(url.includes('/administradores?'))return reply(config.admin?[{id_usuario:A}]:[])
 if(url.includes('/auth/v1/admin/users/'))return reply({id:config.outro?B:A,email:'a@example.test'})
 if(url.includes('rpc/dados_exclusao'))return reply({assinaturas:config.assinatura?[{id:'ass',externo:'mp123'}]:[],arquivos:config.arquivos?[{bucket:'pasta',nome:'arquivo.png'}]:[],legado:!!config.legado,checkout:!!config.checkout})
 if(url.includes('/preapproval/search?'))return reply({results:config.checkout?[{id:'pendente',external_reference:config.outro?B:A,status:'pending'}]:[],paging:{total:config.checkout?1:0}})
 if(url.includes('api.mercadopago')) {
  if(opts.method==='PUT'){if(config.falhaCancelamento)return reply({},502);config.cancelada=true}
  return reply({external_reference:config.divergente?B:(config.outro?B:A),status:config.cancelada?'cancelled':'authorized'})
 }
 if(url.includes('/storage/'))return reply({},config.falhaArquivo?500:200)
 if(url.includes('/assinaturas?'))return reply([])
 if(url.includes('rpc/excluir_conta_servidor'))return reply(true,config.falhaBanco?500:200)
 throw Error('Chamada inesperada '+url)
}
try {
 await build({entryPoints:['supabase/functions/excluir-conta/handler.ts'],outfile:join(dir,'handler.mjs'),bundle:true,platform:'node',format:'esm'})
 const {atender}=await import(pathToFileURL(join(dir,'handler.mjs')))
 async function caso(c,body,expected){config={...c};chamadas=[];const r=await atender(new Request('https://edge.test',{method:'POST',headers:{Authorization:'Bearer token','Content-Type':'application/json'},body:JSON.stringify(body)}));assert.equal(r.status,expected,JSON.stringify(await r.json()));return chamadas.some(([u])=>u.endsWith('/rpc/excluir_conta_servidor'))}
 const proprio={email:'a@example.test',aceite:'2026-11-15'}
 assert.equal(await caso({semLogin:true},proprio,401),false)
 assert.equal(await caso({}, {email:'a@example.test'},400),false)
 assert.equal(await caso({}, {...proprio,email:'errado@example.test'},409),false)
 assert.equal(await caso({outro:true}, {...proprio,id_usuario:B,solicitacao_confirmada:true},403),false)
 assert.equal(await caso({outro:true,admin:true}, {...proprio,id_usuario:B},400),false)
 assert.equal(await caso({},proprio,200),true)
 assert.equal(await caso({outro:true,admin:true},{email:'a@example.test',id_usuario:B,solicitacao_confirmada:true},200),true)
 assert.equal(await caso({assinatura:true,falhaCancelamento:true},proprio,409),false)
 assert.equal(await caso({assinatura:true},proprio,200),true)
 assert.ok(chamadas.findIndex(([u,m])=>u.includes('assinaturas?')&&m==='PATCH')<chamadas.findIndex(([u])=>u.endsWith('/rpc/excluir_conta_servidor')))
 assert.equal(await caso({assinatura:true,divergente:true},proprio,409),false)
 assert.equal(await caso({checkout:true},proprio,200),true)
 assert.ok(chamadas.some(([u])=>u.includes('preapproval/pendente')))
 assert.equal(await caso({legado:true},proprio,409),false)
 assert.equal(await caso({arquivos:true,falhaArquivo:true},proprio,409),false)
 assert.equal(await caso({arquivos:true},proprio,200),true)
 assert.equal(await caso({falhaBanco:true},proprio,409),true)
 console.log('Exclusão: login, aceite, IDOR, admin, e-mail, cancelamento confirmado/falho, legado, arquivos e erro de banco: OK. Nenhuma conta real apagada.')
} finally {await rm(dir,{recursive:true,force:true})}

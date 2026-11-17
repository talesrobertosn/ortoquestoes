import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp,rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const tmp=await mkdtemp(join(process.cwd(),'node_modules/.acesso-resumo-'))
try {
 await build({stdin:{contents:"export * from './src/conta/resumoAcesso';export {ResumoPessoa} from './src/admin/ui/ResumoPessoa';export {renderToStaticMarkup} from 'react-dom/server';export {createElement} from 'react'",resolveDir:process.cwd(),loader:'ts'},bundle:true,jsx:'automatic',external:['react','react-dom/server','react/jsx-runtime'],plugins:[{name:'backend-falso',setup(b){b.onResolve({filter:/servicos\/supabase$/},()=>({path:'falso',namespace:'teste'}));b.onLoad({filter:/.*/,namespace:'teste'},()=>({contents:'export async function chamarRpc(){throw new Error("sem rede na fixture")}',loader:'js'}))}}],platform:'node',format:'esm',outfile:join(tmp,'r.mjs'),define:{'import.meta.env':'{}','import.meta.env.DEV':'false','import.meta.env.BASE_URL':'"/"'}})
 const m=await import(pathToFileURL(join(tmp,'r.mjs')))
 const agora=Date.now(),ate=new Date(agora+7*864e5).toISOString()
 const resumo={pago_ate:null,ultimo_periodo_pago_ate:new Date(agora-864e5).toISOString(),cortesia:{ate,ativa:true,sem_prazo:false,motivo:null,por_indicacao:true,origens:[{nome:'Ana',tipo:'indicou',dias:7,em:new Date(agora).toISOString()}]}}
 assert.equal(m.dadosCortesia(resumo,agora).dias,7)
 assert.equal(m.origemDaCortesia(resumo.cortesia.origens),'Por indicar Ana')
 assert.equal(m.origemDaCortesia([{...resumo.cortesia.origens[0],tipo:'foi_convidado'}]),'Pelo convite de Ana')
 assert.equal(m.dadosCortesia({...resumo,cortesia:{...resumo.cortesia,ate:new Date(agora-1).toISOString()}},agora).ativa,false)
 assert.equal(m.dadosCortesia({...resumo,cortesia:{...resumo.cortesia,ate:null,sem_prazo:true}},agora).semPrazo,true)
 const u={id_usuario:'teste',nome:'Pessoa',email:'pessoa@example.invalid',plano_vigente:'cortesia',administrador:false,acesso_resumo:resumo}
 let html=m.renderToStaticMarkup(m.createElement(m.ResumoPessoa,{usuario:u}))
 assert.match(html,/Cortesia até/);assert.match(html,/Por indicar Ana/);assert.doesNotMatch(html,/Pago até/)
 html=m.renderToStaticMarkup(m.createElement(m.ResumoPessoa,{usuario:{...u,plano_vigente:'mensal'},assinatura:{fim_periodo:new Date(agora+2*864e5).toISOString()}}))
 assert.match(html,/Pago até/);assert.match(html,/Cortesia até/)
 console.log('Resumo do acesso: cortesia, indicação, vencimento, prazo indefinido e separação do período pago no painel passaram.')
}finally {await rm(tmp,{recursive:true,force:true})}

import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const pasta=await mkdtemp(join(tmpdir(),'oq-progressao-'))
try {
 const arquivo=join(pasta,'m.mjs')
 await build({stdin:{contents:"export * from './src/flashcards/motor/selecao'",resolveDir:process.cwd()},outfile:arquivo,bundle:true,platform:'node',format:'esm',logLevel:'error'})
 const {montarBaralho}=await import(pathToFileURL(arquivo))
 const pool=Array.from({length:64},(_,i)=>({id:'fc-'+i,questao:'q-'+i,opcoes:['a','b'],certa:0,raridade:'comum',dificuldade:1,areaId:'mao',batalha:true}))
 const faixas=new Map(pool.slice(0,16).map(c=>[c.questao,1]))
 const questoes=Object.fromEntries(pool.slice(16,48).map((c,i)=>[c.questao,{c:i<16}]))
 const ctx={registros:{},recentes:[],agora:0,faixas,questoes}
 const [ids]=montarBaralho(pool,ctx,123,40)
 assert.equal(new Set(ids).size,40)
 for (const id of ids.slice(0,8))assert.ok(Number(id.slice(3))<16,'não começa por maior acerto da turma')
 for (const id of ids.slice(8,16))assert.ok(Number(id.slice(3))>=16&&Number(id.slice(3))<32,'acertos pessoais')
 for (const id of ids.slice(16,24))assert.ok(Number(id.slice(3))>=32&&Number(id.slice(3))<48,'erros pessoais')
 for (const id of ids.slice(24,32))assert.ok(!questoes['q-'+id.slice(3)],'questões novas (nunca feitas) depois das erradas')
 // filtro dos poderes (Mapa do especialista / Desvio de área)
 const so=montarBaralho(pool.map((c,i)=>({...c,areaId:i%2?'coluna':'mao'})),{...ctx,aceita:c=>c.areaId==='coluna'},123,10)[0]
 assert.ok(so.length===10&&so.every(id=>Number(id.slice(3))%2===1),'filtro de área do poder ignorado')
 assert.deepEqual(montarBaralho(pool,ctx,123,40)[0],ids,'semente reproduzível')
 assert.notDeepEqual(montarBaralho(pool,ctx,124,40)[0],ids,'grupos não variam')
 const semTurma={...ctx,faixas:null}
 assert.ok(montarBaralho(pool,semTurma,123,40)[0].slice(0,8).every(id=>Number(id.slice(3))>=16&&Number(id.slice(3))<32),'sem dados não inventa fácil')
 const retomada=montarBaralho(pool,{...ctx,inicio:40},123,20,new Set(ids))[0]
 assert.ok(retomada.every(id=>!ids.includes(id)),'reposição repetida')
 assert.equal(montarBaralho(pool,{...ctx,areas:['coluna']},123,40)[0].length,0,'filtro ignorado')
 const turma=new Map(pool.map((c,i)=>[c.questao,{respondentes:i<16?3:2,acerto:i<16?95:100}]))
 assert.ok(montarBaralho(pool,{...ctx,faixas:null,turma},123,8)[0].every(id=>Number(id.slice(3))<16),'amostra pequena recebida como taxa confiável')
 console.log('Progressão: turma → acertadas → erradas → novas → mistura; semente, amostra, reposição e filtros corretos.')
}finally{await rm(pasta,{recursive:true,force:true})}

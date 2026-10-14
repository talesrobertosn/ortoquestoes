import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const dir=await mkdtemp(join(tmpdir(),'oq-fauna-'))
try {
 const f=join(dir,'m.mjs')
 await build({stdin:{contents:"export * from './src/flashcards/efeitos/cicloExterior'; export * from './src/flashcards/efeitos/fauna'",resolveDir:process.cwd()},outfile:f,bundle:true,platform:'node',format:'esm',define:{'import.meta.env':JSON.stringify({BASE_URL:'/',DEV:false})},logLevel:'error'})
 const {climaDoCiclo,INTERVALO_CEU,pintarFauna}=await import(pathToFileURL(f))
 assert.equal(INTERVALO_CEU,120000)
 assert.deepEqual(Array.from({length:8},(_,i)=>climaDoCiclo(i)),['dia','entardecer','noite','entardecer','dia','entardecer','noite','entardecer'])
 const imagens=[]
 globalThis.Image=class{complete=true;naturalWidth=64;set src(v){imagens.push(v)}}
 const draws=[],movimentos=[]
 const ctx={save(){},restore(){},translate(x,y){movimentos.push([x,y])},rotate(){},drawImage(...args){draws.push(args)}}
 pintarFauna(ctx,'biblioteca','dia',0,1000,600,1)
 pintarFauna(ctx,'campo','chuva',0,1000,600,1)
 assert.equal(imagens.length,0)
 pintarFauna(ctx,'campo','dia',0,1000,600,1)
 assert.equal(imagens.length,2)
 assert.equal(draws.length,2)
 pintarFauna(ctx,'campo','dia',.5,1000,600,1)
 assert.equal(imagens.length,2) // cache, sem novos pedidos por quadro
 assert.equal(draws.length,4)
 pintarFauna(ctx,'campo','noite',0,1000,600,1)
 assert.equal(draws.length,4) // aves e coelho dormem
 pintarFauna(ctx,'jardim','dia',.7,1000,600,1)
 assert.equal(imagens.length,3)
 assert.equal(draws.length,7)
 assert(movimentos.at(-1)[0]>250&&movimentos.at(-1)[0]<300)
 pintarFauna(ctx,'jardim','dia',3,1000,600,1)
 assert.equal(draws.length,9) // peixe submerso fora do salto
 console.log('Ambiente: ciclo visual completo, cache da fauna, noite/chuva e salto sobre a projeção do lago.')
}finally{await rm(dir,{recursive:true,force:true})}

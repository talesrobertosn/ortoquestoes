import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const dir=await mkdtemp(join(tmpdir(),'oq-fc-perf-'))
try{
 const file=join(dir,'m.mjs')
 await build({stdin:{contents:"export * from './src/flashcards/efeitos/audioArquivo'; export * from './src/flashcards/efeitos/vfxPorAndar'; export * from './src/flashcards/efeitos/mixBiblioteca'",resolveDir:process.cwd()},outfile:file,bundle:true,platform:'node',format:'esm',define:{'import.meta.env.BASE_URL':'"/"','import.meta.env.DEV':'false'},logLevel:'error'})
 const m=await import(pathToFileURL(file))
 assert.deepEqual(m.misturaBiblioteca('gloria'),{corte:22000,coral:true})
 assert.deepEqual(m.misturaBiblioteca('gloria',true),{corte:1600,coral:false})
 assert.deepEqual(m.misturaBiblioteca('tempestade'),{corte:1600,coral:false})
 assert.equal(m.misturaBiblioteca('nevoa').corte,3600)
 assert.equal(m.faseDaFaixa(10,15,20),5)
 assert.equal(m.faseDaFaixa(10,35,20),5)
 assert.equal(m.faseDaFaixa(10,9,20),0)
 assert.equal(m.faseDaFaixa(0,100,0),0)
 const sinal=Float32Array.from({length:1000},(_,i)=>Math.sin(i*.01))
 const antes=sinal.slice();m.suavizarEmenda(sinal,1000)
 assert.equal(sinal.at(-1),sinal[0]);assert.deepEqual(sinal.slice(0,986),antes.slice(0,986))
 const curto=Float32Array.of(.5);m.suavizarEmenda(curto,44100);assert.equal(curto[0],.5)
 const pedra=m.vfxPorAndar('golem')
 assert.ok(pedra.includes('pedregulho'))
 assert.ok(!pedra.includes('mandibula')&&!pedra.includes('bolafogo-ancestral')&&!pedra.includes('gato-dorme'))
 assert.ok(m.vfxPorAndar('golem','cristal').includes('pedregulho-cristal'))
 assert.ok(m.vfxPorAndar('dragao','ancestral').includes('bolafogo-ancestral'))
 assert.ok(!m.vfxPorAndar('dragao','ancestral').includes('bolafogo-escarlate'))
 assert.equal(pedra.length,new Set(pedra).size)
 for(const modo of ['ok','http','decode','antigo','falha']){
  const chamadas=[]
  const result=await m.carregarAudioArquivo('floresta',{opus:modo!=='antigo',url:a=>a,
   buscar:async url=>{chamadas.push(url);return new Response(String(url),{status:modo==='falha'||(modo==='http'&&url.endsWith('.ogg'))?404:200})},
   decodificar:async b=>{const nome=new TextDecoder().decode(b);if(modo==='decode'&&nome.endsWith('.ogg'))throw Error('Codec não suportado');return nome}
  })
  assert.equal(result,modo==='falha'?null:modo==='ok'?'floresta.ogg':'floresta.mp3')
  assert.deepEqual(chamadas,modo==='ok'?['floresta.ogg']:modo==='antigo'?['floresta.mp3']:['floresta.ogg','floresta.mp3'])
 }
 console.log('Desempenho: grupos por andar; Opus, fallback HTTP/decode, MP3 antigo e falha total OK.')
}finally{await rm(dir,{recursive:true,force:true})}

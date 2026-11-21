import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
// O modo Natal (docs/design/MODO-NATAL.md): liga de 1/12 a 6/1 em Brasília, a chave geral desliga tudo e ?natal= testa.
const dir=await mkdtemp(join(tmpdir(),'oq-modo-natal-'))
try{
 const file=join(dir,'natal.mjs')
 await build({entryPoints:['src/natal/modoNatal.ts'],outfile:file,bundle:true,platform:'node',format:'esm',logLevel:'error'})
 const {MODO_NATAL,noPeriodoDoNatal,modoNatalAtivo}=await import(pathToFileURL(file))
 for(const [data,sim] of [['2026-11-20T23:59:00-03:00',false],['2026-11-21T00:00:00-03:00',true],['2026-12-25T12:00:00-03:00',true],['2027-01-06T23:59:00-03:00',true],['2027-01-07T00:00:00-03:00',false],['2027-07-01T12:00:00-03:00',false]]){
  assert.equal(noPeriodoDoNatal(new Date(data)),sim,data)
  assert.equal(modoNatalAtivo(new Date(data)),sim,`sem prévia: ${data}`)
 }
 // Em Brasília ainda é 20/11 às 23h, embora em UTC já seja 21/11.
 assert.equal(noPeriodoDoNatal(new Date('2026-11-21T02:00:00Z')),false)
 // A prévia de quem testa.
 const guardado=new Map()
 globalThis.localStorage={getItem:k=>guardado.get(k)??null,setItem:(k,v)=>guardado.set(k,v),removeItem:k=>guardado.delete(k)}
 globalThis.location={search:'?natal=1',hash:'#/'}
 assert.equal(modoNatalAtivo(new Date('2026-07-01T12:00:00-03:00')),true,'?natal=1 liga fora da data')
 globalThis.location={search:'',hash:'#/'}
 assert.equal(modoNatalAtivo(new Date('2026-07-01T12:00:00-03:00')),true,'a prévia fica guardada')
 globalThis.location={search:'',hash:'#/?natal=0'}
 assert.equal(modoNatalAtivo(new Date('2026-12-25T12:00:00-03:00')),false,'?natal=0 desliga dentro da data')
 globalThis.location={search:'?natal=auto',hash:'#/'}
 assert.equal(modoNatalAtivo(new Date('2026-12-25T12:00:00-03:00')),true,'?natal=auto volta à data')
 // A chave geral desliga tudo, até a prévia.
 MODO_NATAL.ligado=false
 globalThis.location={search:'?natal=1',hash:'#/'}
 assert.equal(modoNatalAtivo(new Date('2026-12-25T12:00:00-03:00')),false,'chave geral manda')
 console.log('modo Natal: ok')
}finally{await rm(dir,{recursive:true,force:true})}

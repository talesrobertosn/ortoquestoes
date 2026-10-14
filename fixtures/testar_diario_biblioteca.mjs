import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const dir=await mkdtemp(join(tmpdir(),'oq-diario-'))
try {
 const f=join(dir,'m.mjs')
 await build({entryPoints:['src/flashcards/biblioteca/sessao.ts'],outfile:f,bundle:true,platform:'node',format:'esm',logLevel:'error'})
 const {diarioBiblioteca,ambienteBiblioteca}=await import(pathToFileURL(f))
 assert.deepEqual(diarioBiblioteca([]),{melhor:0,trechos:[],maisSegura:null})
 const passos=Object.freeze([
  {area:'Joelho',avaliacao:'sabia',clima:'calmo'},
  {area:'Joelho',avaliacao:'sabia',clima:'calmo'},
  {area:'Joelho',avaliacao:'hesitei',clima:'chama'},
  {area:'Joelho',avaliacao:'sabia',clima:'chama'},
  {area:'Mão',avaliacao:'errei',clima:'chuva'},
  {area:'Mão',avaliacao:'sabia',clima:'arcoiris'},
  {area:'Mão',avaliacao:'errei',clima:'chuva'},
 ].map(Object.freeze))
 const antes=JSON.stringify(passos),r=diarioBiblioteca(passos)
 assert.equal(JSON.stringify(passos),antes)
 assert.equal(r.melhor,3) // Hesitei conserva a sequência, como no clima existente
 assert.deepEqual(r.maisSegura,{area:'Joelho',total:4,sabia:3})
 assert.deepEqual(r.trechos.slice(0,2),[{clima:'calmo',inicio:1,fim:2},{clima:'chama',inicio:3,fim:4}])
 assert.equal(diarioBiblioteca(passos.slice(0,2)).maisSegura,null) // não destacar amostra insuficiente
 for(const clima of ['calmo','chama','gloria','arcoiris','nevoa'])assert.equal(ambienteBiblioteca(false,clima),'biblioteca')
 for(const clima of ['chuva','tempestade'])assert.equal(ambienteBiblioteca(false,clima),'chuva')
 assert.equal(ambienteBiblioteca(true,'gloria'),'chuva')
 console.log('Diário: sequência, trechos, amostra mínima e chuva; entradas intactas.')
}finally{await rm(dir,{recursive:true,force:true})}

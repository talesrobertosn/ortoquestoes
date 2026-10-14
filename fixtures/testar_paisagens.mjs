import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp,rm,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const dir=await mkdtemp(join(tmpdir(),'oq-paisagens-'))
try{
 const f=join(dir,'m.mjs')
 await build({entryPoints:['src/flashcards/efeitos/paisagens.ts'],outfile:f,bundle:true,platform:'node',format:'esm',logLevel:'error'})
 const {paisagemDaParada}=await import(pathToFileURL(f))
 const casos=[['loja',null,'vilarejo'],['portas',null,'vila'],['sabio',null,'ruinas'],['sala','curandeira','estufa'],['sala','secreta','praia'],['sala','evento','campoflorido'],['sala','bau','ruinas'],['sala','ferreiro','forja'],['pergunta',null,'campo'],['resposta',null,'campo'],['fim',null,'campo']]
 for(const[fase,tipo,resultado]of casos){
  const partida=Object.freeze({fase,sala:tipo?Object.freeze({tipo}):null}),antes=JSON.stringify(partida)
  assert.equal(paisagemDaParada(partida,true,'campo'),resultado)
  assert.equal(paisagemDaParada(partida,false,'campo'),'biblioteca')
  assert.equal(JSON.stringify(partida),antes)
 }
 for(const nome of ['vilarejo','ruinas','vila','campoflorido','praia','estufa'])for(const[formato,w,h]of[['paisagem',520,330],['retrato',250,470]])for(const camada of ['fundo','meio','frente','luz']){
  const png=await readFile(`public/flashcards/cenarios/${nome}-${formato}-${camada}.png`)
  assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a')
  assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h)
 }
 console.log('Paisagens: paradas do motor intactas, Estudo preservado e 48 camadas válidas.')
}finally{await rm(dir,{recursive:true,force:true})}

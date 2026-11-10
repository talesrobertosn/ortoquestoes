import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp,rm,access} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const dir=await mkdtemp(join(tmpdir(),'oq-cenarios-inicio-'))
try{
 const file=join(dir,'cenarios.mjs')
 await build({entryPoints:['src/componentes/inicio/cena/cenarios.ts'],outfile:file,bundle:true,platform:'node',format:'esm',logLevel:'error'})
 const {CENARIOS,cenarioDaHora,faixaDoCenario,ordemDoDia}=await import(pathToFileURL(file))
 assert.equal(CENARIOS.length,7)
 const horario='2026-11-09T'
 const esperado=ordemDoDia('2026-11-09').map(c=>c.id)
 assert.equal(new Set(esperado).size,7)
 for(const tz of ['UTC','America/Los_Angeles','Asia/Tokyo','America/Sao_Paulo']){
  process.env.TZ=tz
  for(let hora=0;hora<24;hora++){
   const d=new Date(`${horario}${String(hora).padStart(2,'0')}:17:43-03:00`)
   assert.equal(cenarioDaHora(d).id,esperado[Math.floor(hora/4)],`${tz} ${hora}h: mesmo cenário para todos`)
   const janela=faixaDoCenario(d)
   assert.equal(janela.dia,'2026-11-09')
   assert.equal(cenarioDaHora(new Date(janela.proxima-1)).id,cenarioDaHora(d).id)
   assert.equal(faixaDoCenario(new Date(janela.proxima)).faixa,(janela.faixa+1)%6)
  }
 }
 for(let i=0;i<120;i++){
  const dia=new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10)
  const ordem=ordemDoDia(dia)
  assert.equal(new Set(ordem.map(c=>c.id)).size,7,'nenhum cenário repete no dia (são seis faixas para sete cenários: um descansa)')
  assert.deepEqual(ordemDoDia(dia),ordem,'não muda com visitas ou reload')
 }
 assert.ok(new Set(Array.from({length:20},(_,i)=>ordemDoDia(`2026-11-${String(i+1).padStart(2,'0')}`).map(c=>c.id).join(','))).size>15,'a ordem varia entre os dias')
 const antes=CENARIOS.map(c=>c.id)
 ordemDoDia('2026-11-09');assert.deepEqual(CENARIOS.map(c=>c.id),antes,'sorteio não modifica catálogo')
 globalThis.sessionStorage={getItem:()=> 'forja'}
 assert.equal(cenarioDaHora(new Date('2026-11-09T08:00:00-03:00')).id,esperado[2],'preferência de teste antiga não individualiza cenário')
 globalThis.location={search:'',hash:'#/?cenario=abrigo'}
 assert.equal(cenarioDaHora().id,'abrigo','prévia explícita continua disponível')
 delete globalThis.location;delete globalThis.sessionStorage
 for(const c of CENARIOS)for(const periodo of ['manha','tarde','noite'])for(const size of ['', '-960'])await access(`public/pixel/inicio/${c.arquivo}-${periodo}${size}.webp`)
 assert.ok(CENARIOS.find(c=>c.id==='abrigo').fogo)
 assert.ok(CENARIOS.find(c=>c.id==='praca').dragao)
 console.log('Inicial: sete cenários, sorteio diário compartilhado em quatro fusos, seis faixas, viradas exatas, recarga estável e 42 imagens presentes.')
}finally{await rm(dir,{recursive:true,force:true})}

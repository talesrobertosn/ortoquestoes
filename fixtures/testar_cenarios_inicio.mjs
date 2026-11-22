import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp,rm,access} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
// O rodízio dos cenários do topo da página inicial (Tales, 12/11/2026): cada cenário fica 2 horas, virando nas horas
// pares de Brasília, e nenhum repete até passarem todos (o de Natal só na época dele); o mesmo para todos, em qualquer
// fuso. E o tempo (clima.ts).
const dir=await mkdtemp(join(tmpdir(),'oq-cenarios-inicio-'))
try{
 const file=join(dir,'cenarios.mjs')
 await build({stdin:{contents:`export * from './src/componentes/inicio/cena/cenarios'; export * from './src/componentes/inicio/cena/clima'`,resolveDir:process.cwd(),loader:'ts'},outfile:file,bundle:true,platform:'node',format:'esm',logLevel:'error'})
 const {CENARIOS,cenarioDaHora,faixaDoCenario,ordemDoCiclo,FAIXA_MS,cenariosDoDia,naEpoca,nevascasDoDia,climaAgora}=await import(pathToFileURL(file))
 assert.equal(CENARIOS.length,9)
 const vale=CENARIOS.find(c=>c.id==='vale')
 const sala=CENARIOS.find(c=>c.id==='sala_natal')
 // A época do Natal: de 10 de novembro ao Dia de Reis, virando o ano.
 for(const [m,d,sim] of [[11,9,false],[11,10,true],[12,25,true],[1,1,true],[1,6,true],[1,7,false],[7,15,false]])assert.equal(naEpoca(vale,m,d),sim,`${d}/${m}`)
 for(const [m,d,sim] of [[11,9,false],[11,10,true],[12,25,true],[1,6,true],[1,7,false]])assert.equal(naEpoca(sala,m,d),sim,`sala ${d}/${m}`)
 for(const [data,n] of [['2026-11-09T12:00:00-03:00',7],['2026-11-20T12:00:00-03:00',9],['2026-11-21T12:00:00-03:00',9],['2026-12-01T12:00:00-03:00',9],['2027-01-06T23:59:00-03:00',9],['2027-01-07T00:01:00-03:00',7]]){
  assert.equal(cenariosDoDia(new Date(data)).length,n,data)
 }
 // No modo Natal o rodízio segue com todos os cenários (as versões de Natal de cada um são a etapa 3).
 assert.equal(cenariosDoDia(new Date('2026-12-24T20:00:00-03:00')).length,9)
 assert.equal(FAIXA_MS,2*3600000)
 // As viradas caem nas horas pares de Brasília, iguais em qualquer fuso, e o cenário vale até o último instante da faixa.
 for(const tz of ['UTC','America/Los_Angeles','Asia/Tokyo','America/Sao_Paulo']){
  process.env.TZ=tz
  for(const [hora,par] of [['2026-11-20T08:00:00-03:00',true],['2026-11-20T09:00:00-03:00',false],['2026-11-21T00:00:00-03:00',true]]){
   const t=new Date(hora).getTime()
   assert.equal(faixaDoCenario(new Date(t)).inicio===t,par,`${tz} ${hora}`)
  }
  for(let min=0;min<24*60;min+=7){
   const d=new Date(new Date('2026-11-20T00:00:00-03:00').getTime()+min*60000+13000)
   const j=faixaDoCenario(d)
   assert.equal(j.proxima-j.inicio,FAIXA_MS)
   assert.equal(cenarioDaHora(new Date(j.proxima-1)).id,cenarioDaHora(d).id,'vale até o último instante da faixa')
  }
 }
 process.env.TZ='America/Sao_Paulo'
 // Ciclos sem repetição: em cada sequência de n faixas passam os n cenários, e nunca o mesmo duas faixas seguidas.
 for(const [ini,n,ciclos] of [['2026-07-01T00:00:00-03:00',7,25],['2026-11-10T06:00:00-03:00',9,13],['2026-12-02T00:00:00-03:00',9,13]]){
  const t0=faixaDoCenario(new Date(ini)).faixa
  const comeco=(Math.ceil(t0/n))*n
  let anterior=null
  for(let k=comeco;k<comeco+n*ciclos;k++){
   const id=cenarioDaHora(new Date(Date.UTC(2026,0,1,3)+k*FAIXA_MS+60000)).id
   assert.notEqual(id,anterior,`faixa ${k}: não repete em seguida`)
   anterior=id
  }
  for(let c=comeco/n;c<comeco/n+ciclos;c++){
   const vistos=new Set()
   for(let k=c*n;k<(c+1)*n;k++)vistos.add(cenarioDaHora(new Date(Date.UTC(2026,0,1,3)+k*FAIXA_MS+60000)).id)
   assert.equal(vistos.size,n,`ciclo ${c}: todos os ${n} cenários, cada um uma vez`)
  }
 }
 const ordens=new Set()
 for(let c=0;c<40;c++){
  const ordem=ordemDoCiclo(c)
  assert.equal(new Set(ordem.map(x=>x.id)).size,9,'nenhum cenário repete no ciclo')
  assert.deepEqual(ordemDoCiclo(c).map(x=>x.id),ordem.map(x=>x.id),'não muda com visitas ou reload')
  ordens.add(ordem.map(x=>x.id).join(','))
 }
 assert.ok(ordens.size>30,'a ordem varia entre os ciclos')
 const antes=CENARIOS.map(c=>c.id)
 ordemDoCiclo(3);assert.deepEqual(CENARIOS.map(c=>c.id),antes,'sorteio não modifica catálogo')
 globalThis.location={search:'',hash:'#/?cenario=vale'}
 assert.equal(cenarioDaHora(new Date('2026-07-01T10:00:00-03:00')).id,'vale','prévia explícita funciona até fora da época')
 globalThis.location={search:'',hash:'#/?cenario=abrigo'}
 assert.equal(cenarioDaHora().id,'abrigo','prévia explícita continua disponível')
 globalThis.location={search:'',hash:'#/?cenario=sala_natal'}
 assert.equal(cenarioDaHora().id,'sala_natal','prévia da sala funciona fora do Natal')
 delete globalThis.location
 // O tempo: nevascas iguais para todos, de 40 min a 2 h 30, no máximo três por dia; a neve fica no chão uma hora depois.
 let dias_com_neve=0
 for(let i=0;i<200;i++){
  const dia=new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10)
  const lista=nevascasDoDia(dia)
  assert.deepEqual(nevascasDoDia(dia),lista)
  assert.ok(lista.length<=3)
  if(lista.length)dias_com_neve++
  for(const [a,b] of lista){assert.ok(b-a>=40*60000&&b-a<=150*60000);assert.ok(a>=0&&a<24*3600000)}
 }
 assert.ok(dias_com_neve>120&&dias_com_neve<190,`neva em boa parte dos dias, não em todos (${dias_com_neve} de 200)`)
 const dia='2026-11-20',[a,b]=nevascasDoDia(dia)[0]??[0,0]
 if(b){
  const meia=new Date(`${dia}T00:00:00-03:00`).getTime()
  for(const tz of ['UTC','Asia/Tokyo']){
   process.env.TZ=tz
   const meio=climaAgora(new Date(meia+(a+b)/2))
   assert.ok(meio.nevando&&meio.coberto&&meio.intensidade>0.9,'no meio da nevasca: nevando forte')
   assert.ok(climaAgora(new Date(meia+a+60000)).intensidade<0.3,'começa rala')
   const depois=climaAgora(new Date(meia+b+30*60000))
   assert.ok(!depois.nevando&&depois.coberto,'parou, mas a neve continua no chão')
  }
 }
 globalThis.location={search:'?clima=neve',hash:''}
 assert.deepEqual(climaAgora(),{nevando:true,coberto:true,intensidade:1})
 globalThis.location={search:'?clima=limpo',hash:''}
 assert.equal(climaAgora().coberto,false)
 delete globalThis.location
 for(const c of CENARIOS)for(const periodo of ['manha','tarde','noite'])for(const size of ['', '-960']){
  await access(`public/pixel/inicio/${c.arquivo}-${periodo}${size}.webp`)
  if(c.neve?.arquivo)await access(`public/pixel/inicio/${c.neve.arquivo}-${periodo}${size}.webp`)
  if(c.pinturaNatal)await access(`public/pixel/inicio/${c.pinturaNatal}-${periodo}${size}.webp`)
  if(c.neve?.arquivoNatal)await access(`public/pixel/inicio/${c.neve.arquivoNatal}-${periodo}${size}.webp`)
 }
 await access('public/pixel/inicio/trem-vale.png')
 assert.ok(CENARIOS.find(c=>c.id==='abrigo').fogo)
 assert.ok(CENARIOS.find(c=>c.id==='praca').dragao)
 assert.ok(vale.repertorio.length>=5&&vale.neve.arquivo)
 console.log(`Inicial: nove cenários (os dois de Natal de 10/11 a 6/1), 2 h cada um, ciclos sem repetir, viradas nas horas pares em quatro fusos, nevascas iguais para todos (${dias_com_neve} de 200 dias com neve) e imagens presentes.`)
}finally{await rm(dir,{recursive:true,force:true})}

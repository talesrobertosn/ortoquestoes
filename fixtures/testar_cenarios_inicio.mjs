import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp,rm,access} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
// O rodízio dos cenários do topo da página inicial (12/11/2026): o dia de Brasília dividido em partes iguais, uma por
// cenário do rodízio de hoje (o de Natal só na época dele), o mesmo para todos, em qualquer fuso. E o tempo (clima.ts).
const dir=await mkdtemp(join(tmpdir(),'oq-cenarios-inicio-'))
try{
 const file=join(dir,'cenarios.mjs')
 await build({stdin:{contents:`export * from './src/componentes/inicio/cena/cenarios'; export * from './src/componentes/inicio/cena/clima'`,resolveDir:process.cwd(),loader:'ts'},outfile:file,bundle:true,platform:'node',format:'esm',logLevel:'error'})
 const {CENARIOS,cenarioDaHora,faixaDoCenario,ordemDoDia,cenariosDoDia,naEpoca,nevascasDoDia,climaAgora}=await import(pathToFileURL(file))
 assert.equal(CENARIOS.length,8)
 const vale=CENARIOS.find(c=>c.id==='vale')
 // A época do Natal: de 10 de novembro ao Dia de Reis, virando o ano.
 for(const [m,d,sim] of [[11,9,false],[11,10,true],[12,25,true],[1,1,true],[1,6,true],[1,7,false],[7,15,false]])assert.equal(naEpoca(vale,m,d),sim,`${d}/${m}`)
 for(const [data,n] of [['2026-11-09T12:00:00-03:00',7],['2026-11-20T12:00:00-03:00',8],['2027-01-06T23:59:00-03:00',8],['2027-01-07T00:01:00-03:00',7]]){
  assert.equal(cenariosDoDia(new Date(data)).length,n,data)
 }
 for(const [dia,n,horas] of [['2026-11-09',7,24/7],['2026-11-20',8,3]]){
  const esperado=ordemDoDia(dia,cenariosDoDia(new Date(`${dia}T12:00:00-03:00`))).map(c=>c.id)
  assert.equal(new Set(esperado).size,n)
  for(const tz of ['UTC','America/Los_Angeles','Asia/Tokyo','America/Sao_Paulo']){
   process.env.TZ=tz
   const vistos=new Set()
   for(let min=0;min<24*60;min+=7){
    const d=new Date(new Date(`${dia}T00:00:00-03:00`).getTime()+min*60000+13000)
    const id=cenarioDaHora(d).id
    vistos.add(id)
    assert.equal(id,esperado[Math.floor(min/60/horas)],`${tz} ${dia} ${min} min: mesmo cenário para todos`)
    const janela=faixaDoCenario(d)
    assert.equal(janela.dia,dia)
    assert.equal(janela.faixas,n)
    assert.equal(cenarioDaHora(new Date(janela.proxima-1)).id,id,'vale até o último instante da faixa')
    if(janela.faixa<n-1)assert.equal(faixaDoCenario(new Date(janela.proxima)).faixa,janela.faixa+1,'vira exatamente na próxima')
    else assert.equal(faixaDoCenario(new Date(janela.proxima)).faixa,0,'a última faixa vira no novo dia')
   }
   assert.equal(vistos.size,n,`${tz} ${dia}: todos os cenários aparecem no dia (${horas.toFixed(2)} h cada)`)
  }
 }
 for(let i=0;i<120;i++){
  const dia=new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10)
  const ordem=ordemDoDia(dia)
  assert.equal(new Set(ordem.map(c=>c.id)).size,8,'nenhum cenário repete no dia')
  assert.deepEqual(ordemDoDia(dia),ordem,'não muda com visitas ou reload')
 }
 assert.ok(new Set(Array.from({length:20},(_,i)=>ordemDoDia(`2026-11-${String(i+1).padStart(2,'0')}`).map(c=>c.id).join(','))).size>15,'a ordem varia entre os dias')
 const antes=CENARIOS.map(c=>c.id)
 ordemDoDia('2026-11-09');assert.deepEqual(CENARIOS.map(c=>c.id),antes,'sorteio não modifica catálogo')
 globalThis.location={search:'',hash:'#/?cenario=vale'}
 assert.equal(cenarioDaHora(new Date('2026-07-01T10:00:00-03:00')).id,'vale','prévia explícita funciona até fora da época')
 globalThis.location={search:'',hash:'#/?cenario=abrigo'}
 assert.equal(cenarioDaHora().id,'abrigo','prévia explícita continua disponível')
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
 }
 await access('public/pixel/inicio/trem-vale.png')
 assert.ok(CENARIOS.find(c=>c.id==='abrigo').fogo)
 assert.ok(CENARIOS.find(c=>c.id==='praca').dragao)
 assert.ok(vale.repertorio.length>=5&&vale.neve.arquivo)
 console.log(`Inicial: oito cenários (o de Natal de 10/11 a 6/1), o dia dividido por igual entre os do rodízio, em quatro fusos, viradas exatas, nevascas iguais para todos (${dias_com_neve} de 200 dias com neve) e 54 imagens presentes.`)
}finally{await rm(dir,{recursive:true,force:true})}

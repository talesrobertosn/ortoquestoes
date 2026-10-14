import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
const pasta=process.env.ORTO_CAPTURAS??'/tmp/ortoquestoes-leitores'
await mkdir(pasta,{recursive:true})
const b=await chromium.launch({executablePath:process.env.CHROMIUM_BIN??'/usr/bin/chromium',args:['--no-sandbox']})
try{
 for(const[nome,width,height]of[['paisagem',1400,860],['retrato',390,844],['deitado',844,390]]){
  const p=await b.newPage({viewport:{width,height}}),erros=[]
  p.on('pageerror',e=>erros.push(e.message))
  await p.clock.install()
  await p.addInitScript(()=>{window.__oculta=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__oculta})})
  await p.goto('http://127.0.0.1:5199/#/flashcards/biblioteca?categoria=todos&n=10')
  await p.locator('.fc-estudo').waitFor()
  if(await p.locator('.fc-apresenta').count())await p.locator('.fc-apresenta').click()
  await p.getByRole('switch',{name:'Leitura tranquila',exact:true}).click()
  const antes=await p.evaluate(()=>JSON.stringify(window.__torneio.partida))
  await p.clock.fastForward(360000)
  assert.equal(await p.locator('.fc-leitores').count(),0)
  await p.evaluate(()=>{window.__oculta=true;document.dispatchEvent(new Event('visibilitychange'))})
  await p.clock.fastForward(600000)
  assert.equal(await p.locator('.fc-leitores').count(),0,'tempo em aba oculta não deve contar')
  await p.evaluate(()=>{window.__oculta=false;document.dispatchEvent(new Event('visibilitychange'))})
  await p.clock.fastForward(510000)
  assert.equal(await p.locator('.fc-leitores').count(),0,'não deve aparecer antes dos quinze minutos visíveis')
  await p.clock.fastForward(31000)
  await p.locator('.fc-leitores').waitFor()
  await p.waitForFunction(()=>[...document.querySelectorAll('.fc-leitores img')].every(i=>i.complete&&i.naturalWidth>0))
  assert.equal(await p.locator('.fc-leitores').getAttribute('aria-hidden'),'true')
  assert.equal(await p.evaluate(()=>JSON.stringify(window.__torneio.partida)),antes)
  await p.screenshot({path:`${pasta}/leitores-${nome}.png`})
  await p.emulateMedia({reducedMotion:'reduce'})
  await p.waitForFunction(()=>[...document.querySelectorAll('.fc-leitores img')].every(i=>getComputedStyle(i).animationName==='none'))
  await p.getByRole('tab',{name:/Batalha/}).click()
  assert.equal(await p.locator('.fc-leitores').count(),0)
  assert.deepEqual(erros,[])
  console.log(nome,'quinze minutos visíveis, pausa ao ocultar, partida intacta e movimento reduzido OK')
  await p.close()
 }
}finally{await b.close()}

import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
const pasta=process.env.ORTO_CAPTURAS??'/tmp/ortoquestoes-ambiente-vivo'
await mkdir(pasta,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN??'/usr/bin/chromium',args:['--no-sandbox']})
try {
 for(const[nome,width,height]of[['paisagem',1400,860],['retrato',390,844],['deitado',844,390]]){
  const p=await browser.newPage({viewport:{width,height}}),erros=[],pedidos=[]
  p.on('pageerror',e=>erros.push(e.message));p.on('request',r=>{if(r.url().includes('/animais/'))pedidos.push(r.url())})
  await p.addInitScript(()=>{
   const set=window.setInterval,clear=window.clearInterval,timers=new Map()
   window.setInterval=(fn,delay,...args)=>{const id=set(fn,delay,...args);if(delay===120000)timers.set(id,()=>fn(...args));return id}
   window.clearInterval=id=>{timers.delete(id);return clear(id)}
   window.__avancarCeu=()=>[...timers.values()].forEach(fn=>fn())
   window.__timersCeu=()=>timers.size
  })
  await p.goto('http://127.0.0.1:5199/#/flashcards/cripta');await p.waitForFunction(()=>!!window.__torneio)
  if(await p.locator('.fc-apresenta').count())await p.locator('.fc-apresenta').click()
  const peixePronto=p.waitForResponse(r=>r.url().endsWith('/animais/peixe.png'))
  await p.evaluate(()=>window.__torneio.cena('jardim'))
  await p.locator('.fc-cena--jardim.fc-cena--clima-dia').waitFor()
  assert.equal((await peixePronto).status(),200)
  await p.waitForTimeout(1000)
  await p.screenshot({path:`${pasta}/jardim-dia-${nome}.png`})
  assert(pedidos.some(u=>u.endsWith('/coelho.png'))&&pedidos.some(u=>u.endsWith('/passaro.png'))&&pedidos.some(u=>u.endsWith('/peixe.png')))
  const antes=await p.evaluate(()=>JSON.stringify(window.__torneio.partida))
  for(const clima of ['entardecer','noite','entardecer','dia']){
   await p.evaluate(()=>window.__avancarCeu())
   await p.locator(`.fc-cena--jardim.fc-cena--clima-${clima}`).waitFor()
   if(clima==='noite')await p.screenshot({path:`${pasta}/jardim-noite-${nome}.png`})
  }
  assert.equal(await p.evaluate(()=>JSON.stringify(window.__torneio.partida)),antes)
  await p.getByRole('button',{name:/Menu: som/}).click()
  await p.getByLabel('Reduzir movimento (sem tremor, partículas e giro)',{exact:true}).check()
  await p.keyboard.press('Escape')
  assert.equal(await p.evaluate(()=>window.__timersCeu()),0)
  await p.evaluate(()=>window.__avancarCeu())
  assert(await p.locator('.fc-cena--jardim.fc-cena--clima-dia').isVisible())
  await p.evaluate(()=>window.__torneio.cena('campo'))
  assert.equal(await p.evaluate(()=>window.__timersCeu()),0)
  assert.deepEqual(erros,[])
  console.log(nome,'ciclo, fauna, partida intacta e pausa de movimento reduzido OK')
  await p.close()
 }
}finally{await browser.close()}

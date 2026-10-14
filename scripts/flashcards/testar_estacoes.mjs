import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
const pasta=process.env.ORTO_CAPTURAS??'/tmp/ortoquestoes-estacoes'
await mkdir(pasta,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN??'/usr/bin/chromium',args:['--no-sandbox']})
try {
 for(const [nome,width,height,mes] of [['paisagem-julho',1400,860,6],['retrato-julho',390,844,6],['deitado-julho',844,390,6],['paisagem-primavera',1400,860,9]]) {
  const page=await browser.newPage({viewport:{width,height}}),erros=[]
  page.on('pageerror',e=>erros.push(e.message))
  await page.addInitScript(mes=>{
   const Original=Date,agora=new Original(2026,mes,14,12).getTime()
   window.Date=class extends Original {constructor(...args){super(...(args.length?args:[agora]))}static now(){return agora}}
  },mes)
  await page.goto('http://127.0.0.1:5199/#/flashcards/biblioteca?categoria=todos&n=10')
  await page.locator('.fc-estudo').waitFor()
  if(await page.locator('.fc-apresenta').count())await page.locator('.fc-apresenta').click()
  const decoracao=page.locator('.fc-estacao')
  assert.equal(await decoracao.getAttribute('data-estacao'),mes===6?'inverno-neve':'primavera')
  await page.waitForFunction(()=>[...document.querySelectorAll('.fc-estacao img')].every(i=>i.complete&&i.naturalWidth>0))
  assert.equal(await decoracao.getAttribute('aria-hidden'),'true')
  assert.equal(await decoracao.evaluate(e=>getComputedStyle(e).pointerEvents),'none')
  await page.locator('.fc-estudo__so-virar,.fc-estudo__botoes .fc-principal').click()
  await page.locator('.fc-botao-aval--sabia').click()
  assert(await page.locator('.fc-estudo').isVisible())
  await page.waitForTimeout(700)
  await page.screenshot({path:`${pasta}/${nome}.png`})
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.waitForFunction(()=>[...document.querySelectorAll('.fc-estacao__particula')].every(e=>getComputedStyle(e).animationName==='none'))
  await page.getByRole('tab',{name:/Batalha/}).click()
  await page.waitForFunction(()=>document.querySelectorAll('.fc-estacao').length===0)
  assert.deepEqual(erros,[])
  console.log(nome,'arte carregada; responder, movimento reduzido e exclusividade do Estudo OK')
  await page.close()
 }
} finally {await browser.close()}

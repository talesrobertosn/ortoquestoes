import assert from 'node:assert/strict'
export async function antes(p){await p.emulateMedia({reducedMotion:'reduce'})}
export default async function(p,foto,nome){
 const palco=p.locator('.hd-palco--abrigo')
 await palco.waitFor()
 for(const [periodo,hora]of [['manha','09'],['tarde','15'],['noite','21']]){
  await p.clock.setFixedTime(new Date(`2026-11-09T${hora}:00:00-03:00`))
  await p.reload();await palco.waitFor()
  await p.locator(`.hd-palco--${periodo}`).waitFor()
  await p.waitForTimeout(750)
  assert.ok(await palco.locator('.hd-palco__fundo').evaluate(im=>im.complete&&im.naturalWidth>0))
  assert.match(await palco.locator('.hd-palco__fundo').getAttribute('src'),new RegExp(`cena-abrigo-${periodo}`))
  assert.equal(await palco.locator('.hd-mascote').count(),1)
  assert.equal(await palco.locator('.hd-fogueira').count(),1)
  await foto(periodo)
 }
 const valores=await palco.evaluate(el=>{
  const c=el.closest('.hd-cena').getBoundingClientRect()
  return ['.hd-mascote','.hd-gato','.hd-coruja','.hd-fogueira'].map(s=>{
   const el2=el.querySelector(s);const b=el2.getBoundingClientRect()
   return {s,x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),fora:el2.classList.contains('hd-gato--fora'),visivel:getComputedStyle(el2).visibility,inteiro:b.left>=c.left-1&&b.right<=c.right+1&&b.top>=c.top-1&&b.bottom<=c.bottom+1}
  })
 })
 console.log(nome,'posição dos atores:',JSON.stringify(valores))
 assert.ok(valores.find(x=>x.s==='.hd-mascote').inteiro,'esqueleto inteiro à vista')
 assert.ok(valores.find(x=>x.s==='.hd-fogueira').inteiro,'fogueira inteira à vista')
 const gato=valores.find(x=>x.s==='.hd-gato')
 assert.ok(gato.inteiro&&!gato.fora,'gato à vista')
 const coruja=valores.find(x=>x.s==='.hd-coruja')
 const vitrine=await p.locator('.jn-vitrine__coruja:visible').count()
 assert.ok(vitrine||coruja.inteiro&&coruja.visivel!=='hidden','coruja visível no poleiro ou na amostra')
 await palco.locator('.hd-fogueira').click()
 assert.equal(await palco.locator('.hd-fogueira').getAttribute('aria-pressed'),'true')
 await palco.locator('.hd-fogueira').click()
 assert.equal(await palco.locator('.hd-fogueira').getAttribute('aria-pressed'),'false')
 // Nenhuma perda de legibilidade por transbordamento de página.
 for(const width of nome==='cel'?[320,390]:[768,1024,1440,1920]){
  await p.setViewportSize({width,height:900})
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width}px sem transbordamento`)
  await p.waitForTimeout(100)
  console.log(nome,width,'conferindo colisão')
  const coberto=await p.evaluate(()=>{
   const b=document.querySelector('.hd-mascote').getBoundingClientRect()
   return [...document.querySelectorAll('.jn-missao,.jn-vitrine__amostra,.jn-saudacao > *')].some(el=>{
    const r=el.getBoundingClientRect()
    return Math.min(b.right,r.right)-Math.max(b.left,r.left)>2&&Math.min(b.bottom,r.bottom)-Math.max(b.top,r.top)>2
   })
  })
  if(coberto){await foto(`colisao-${width}`);console.log(await p.locator('.jn-missao,.jn-vitrine__amostra,.jn-saudacao > *,.hd-mascote').evaluateAll(els=>els.map(e=>({classe:e.className,r:e.getBoundingClientRect().toJSON()}))))}
  assert.equal(coberto,false,`${width}px: texto ou amostra não cobre o esqueleto`)
 }
 if(nome==='pc'&&await p.locator('.jn-vitrine__amostra .ip-alt:enabled').count()){
  await p.locator('.jn-vitrine__amostra .ip-alt:enabled').first().click()
  await p.waitForTimeout(250)
  await foto('amostra-aberta')
  assert.equal(await p.evaluate(()=>{
   const b=document.querySelector('.hd-mascote').getBoundingClientRect(),r=document.querySelector('.jn-vitrine__amostra').getBoundingClientRect()
   return Math.min(b.right,r.right)-Math.max(b.left,r.left)>2&&Math.min(b.bottom,r.bottom)-Math.max(b.top,r.top)>2
  }),false,'comentário aberto também deixa o mascote à vista')
 }
 console.log('Abrigo',nome,': três horas, fundo carregado, mascotes e pausa na fogueira OK.')
}

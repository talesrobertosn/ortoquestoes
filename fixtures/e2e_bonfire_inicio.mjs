// Clica na espada visível, sem usar o botão por seletor: detecta áreas de toque deslocadas.
import assert from 'node:assert/strict'
export async function antes(p){await p.emulateMedia({reducedMotion:'reduce'})}
export default async function(p,foto,nome){
 const base=p.url().split('#')[0]
 for(const id of ['abrigo','acampamento','cais','forja','observatorio','neve']){
  await p.goto(`${base}#/?cenario=${id}`);await p.reload()
  const palco=p.locator(`.hd-palco--${id}`)
  await palco.waitFor();await p.evaluate(()=>document.fonts.ready.then(()=>true));await p.waitForTimeout(650)
  await palco.locator('.hd-espada').scrollIntoViewIfNeeded();await p.waitForTimeout(100)
  const b=await palco.locator('.hd-espada').boundingBox()
  const xy={x:b.x+b.width/2,y:b.y+b.height*.18}
  const alvo=await p.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('button')?.getAttribute('aria-label'),xy)
  if(!alvo){await foto(`alvo-${id}`);console.log(nome,id,xy,await p.evaluate(({x,y})=>({atingido:document.elementFromPoint(x,y)?.outerHTML.slice(0,220),botao:document.querySelector('.hd-espada__toque')?.getBoundingClientRect().toJSON(),espada:document.querySelector('.hd-espada')?.getBoundingClientRect().toJSON()}),xy))}
  assert.equal(alvo,'Tocar na espada fincada na fogueira',`${id}: punho visível precisa atingir o botão correto`)
  const tocar=()=>nome.startsWith('cel')?p.touchscreen.tap(xy.x,xy.y):p.mouse.click(xy.x,xy.y)
  await tocar()
  await p.locator('.hd-consolidado').waitFor()
  assert.match(await p.locator('.hd-consolidado').innerText(),/Conhecimento consolidado/i)
  assert.equal(await palco.locator('.hd-fogueira').getAttribute('aria-pressed'),'false','a espada não aciona a pausa')
  assert.ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('bichos:album')||'[]').includes('chama-consolidada')))
  if(id==='abrigo')await foto('primeiro-toque')
  await tocar()
  await palco.locator('.hd-balao--espada:not(.hd-balao--sem-lugar)').waitFor({timeout:3000})
  if((await palco.locator('.hd-balao--espada').getAttribute('class')).includes('hd-balao--sem-lugar')){await foto(`fala-escondida-${id}`);console.log(nome,id,await palco.locator('.hd-balao--espada').innerText())}
  assert.ok(!(await palco.locator('.hd-balao--espada').getAttribute('class')).includes('hd-balao--sem-lugar'),`${id}: fala da espada deve caber na tela`)
  if(id==='abrigo')await foto('fala-espada')
  console.log(nome,id,': toque no punho real, faixa no primeiro toque, álbum e fala visível OK')
 }
 // Os segredos de teclado continuam entrando no novo cenário.
 await p.goto(`${base}#/?cenario=abrigo`);await p.reload()
 await p.locator('.hd-palco--abrigo').waitFor()
 await p.keyboard.type('estus')
 await p.locator('.hd-balao--diretor').waitFor()
 assert.match(await p.locator('.hd-balao--diretor').innerText(),/gole do frasco/)
 console.log(nome,': segredo do frasco no Abrigo OK')
}

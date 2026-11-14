// Uso com scripts/capturar_telas.mjs /entrar --sem-conta --roteiro fixtures/login_alpino_roteiro.mjs.
// Conta, autenticação e dados são falsos; nenhum login ou cadastro real é enviado.
import assert from 'node:assert/strict'
const capturas=new Map()
export async function antes(p,nome){
 const recursos=[];capturas.set(nome,recursos)
 p.on('response',r=>{if(r.url().includes('/pixel/acesso/alpino/'))recursos.push({url:r.url(),status:r.status()})})
}
export default async function(p,foto,nome){
 await p.locator('.al-bicho--anfitriao .al-sprite').waitFor()
 // Acervo, formulário e cena têm carregamentos independentes.
 await p.locator('.fq-alternativas button').first().waitFor()
 const fotos=async()=>{for(const img of await p.locator('.al-paisagem img').all()){if(await img.isVisible()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode())}}}
 await fotos()
 assert.ok(capturas.get(nome).every(r=>r.status===200),'Falha em recurso da cena')
 const modo=p.viewportSize().width<768?'movel':'pc'
 const usados=capturas.get(nome).filter(r=>/login-(manha|tarde|noite)-(pc|movel)-/.test(r.url))
 assert.ok(usados.length>0);assert.ok(usados.every(r=>r.url.includes('-'+modo+'-')),'Baixou a outra composição responsiva')
 const partes=await p.locator('.al-paisagem img').evaluateAll(imgs=>imgs.filter(i=>i.getBoundingClientRect().width>0).map(i=>{const r=i.getBoundingClientRect();return{top:r.top,bottom:r.bottom}}))
 for(let i=1;i<partes.length;i++)assert.ok(Math.abs(partes[i].top-partes[i-1].bottom)<.5,'Emenda entre faixas da pintura')
 for(const quem of ['anfitriao','gato','coruja']){
  await p.locator('[data-bicho='+quem+']').click();await p.locator('.al-fala[data-quem='+quem+']').waitFor()
  const c=await p.locator('.al-cabecalho').boundingBox(),f=await p.locator('.al-fala').boundingBox()
  assert.ok(f.x>=c.x-1&&f.x+f.width<=c.x+c.width+1&&f.y>=c.y-1&&f.y+f.height<=c.y+c.height+1,'Balão saiu da cena')
  await foto('fala-'+quem);await p.locator('.al-fala').click()
 }
 const vp=p.viewportSize()
 for(const width of [320,360,390,430,768,1024,1440,1920,2160]){
  await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow em '+width)
  const cena=await p.locator('.al-cabecalho').boundingBox()
  for(const pet of await p.locator('.al-bicho').all()){
   const r=await pet.boundingBox();assert.ok(r.width>=43.9&&r.height>=43.9,'Alvo pequeno');assert.ok(r.x>=cena.x-1&&r.x+r.width<=cena.x+cena.width+1&&r.y>=cena.y-1&&r.y+r.height<=cena.y+cena.height+1,'Pet saiu do palco '+JSON.stringify({width,r,cena}))
  }
  const ratio=await p.locator('.al-sprite--gato').evaluate(el=>el.clientWidth/el.clientHeight);assert.ok(Math.abs(ratio-1.6)<.08,'Gato deformado')
 }
 await p.setViewportSize(vp)
 await p.locator('.ac-abas').getByRole('tab',{name:'Criar conta',exact:true}).click();assert.ok(await p.locator('.pa input[type=email]').isVisible());await foto('criar-conta')
 await p.locator('.ac-abas').getByRole('tab',{name:'Entrar',exact:true}).click()
 await p.getByRole('button',{name:'Esqueceu a senha?',exact:true}).click();assert.ok(await p.locator('.pa input[type=email]').isVisible());await foto('recuperacao')
 await p.getByRole('button',{name:'Voltar para entrar',exact:true}).click()
 // Responder e trocar a questão continua funcionando e avisa os visitantes da cena.
 await p.locator('.fq-alternativas button').first().click();assert.ok(await p.locator('.fq-correcao').isVisible())
 await p.getByRole('button',{name:'Outra questão',exact:true}).click();await p.locator('.fq-alternativas button').first().waitFor();await p.locator('.fq-correcao').waitFor({state:'detached'})
 // O formulário continua editável depois das interações da arte.
 const email=p.locator('.pa input[type=email]');await email.fill('teste-local@example.com');assert.equal(await email.inputValue(),'teste-local@example.com')
 await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.al-sprite--anfitriao').evaluate(el=>getComputedStyle(el).animationName),'none')
 await p.emulateMedia({reducedMotion:'no-preference'})
 await p.locator('.al-cabecalho').scrollIntoViewIfNeeded();await p.waitForTimeout(400);assert.ok(await p.locator('.pa').evaluate(el=>parseFloat(getComputedStyle(el).opacity)>.95),'Formulário invisível após rolar');await foto('topo');await foto('inteira',{fullPage:true})
 await p.locator('.al-jardim-final').scrollIntoViewIfNeeded();await foto('jardim')
 console.log(`${nome}: acesso, criar conta, recuperação, questão, balões, proporções, 320–2160px, faixas contíguas e menos movimento OK`)
}

import assert from 'node:assert/strict'
export async function antes(p){if(process.env.FC_FALHA)await p.route('**/flashcards/indice.json',r=>r.abort())}
export default async function(p,foto,nome){
 await p.locator('.fcn-panorama__grade').waitFor();
 if(process.env.FC_FALHA){assert.ok(await p.locator('.cf-rede').isVisible());assert.ok(await p.getByRole('button',{name:'Tentar de novo',exact:true}).isVisible())}
 else {assert.equal(await p.locator('.cf-rede').count(),0)}
 if(!process.env.FC_FALHA){await p.getByRole('searchbox',{name:'Buscar área'}).fill('naoexistente');assert.ok(await p.getByText('Nenhuma área encontrada. Tente outro nome.',{exact:true}).isVisible());await p.getByRole('searchbox',{name:'Buscar área'}).fill('')}
 const pergunta=p.getByRole('button',{name:'Enviar opinião',exact:true});await pergunta.click();const janela=p.locator('.cf-opiniao');await janela.waitFor();for(let i=0;i<20;i++){await p.keyboard.press('Tab');assert.ok(await p.evaluate(()=>!!document.activeElement.closest('.cf-opiniao')))}await p.keyboard.press('Escape');assert.equal(await janela.count(),0)
 await p.emulateMedia({reducedMotion:'reduce'});assert.ok(await p.locator('.fcn .coruja-pixel').evaluate(el=>getComputedStyle(el).animationName==='none'))
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.locator('.fcn-heroi').scrollIntoViewIfNeeded();await foto('estado')
 console.log(`${nome}: vazio/visitante ou falha de rede, busca vazia, foco da opinião e movimento reduzido OK`)
}

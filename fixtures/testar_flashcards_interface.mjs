import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
// Rodar apenas no dev local com VITE_SUPABASE_URL=sem e VITE_FLASHCARDS_CAPA=1.
const base=process.env.ORTO_INTERFACE_URL ?? 'http://127.0.0.1:5201';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname), 'Teste exclusivo do ambiente local.');
const out=process.env.ORTO_CAPTURAS ?? '/tmp/orto-flashcards-interface';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.ORTO_CHROMIUM ?? '/usr/bin/chromium',args:['--no-sandbox']});
const errors=[];
for(const [nome,width,height] of [['desktop',1400,860],['celular',390,844],['paisagem',844,390]]){
 const p=await browser.newPage({viewport:{width,height}});p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/#/flashcards');await p.waitForTimeout(1200);
 const cookie=p.getByRole('button',{name:'Recusar',exact:true});if(await cookie.count())await cookie.click();
 await p.getByRole('button',{name:'Enviar opinião',exact:true}).first().click();await p.waitForTimeout(350);
 const modal=p.locator('.cf-opiniao');
 assert.equal(await modal.count(),1);
 await p.getByLabel('Algo não funcionou?',{exact:true}).fill('Teste local: o volume precisa ficar acessível.');
 // Textarea entra no ciclo de foco, sem escapar para a página atrás.
 for(let k=0;k<24;k++){await p.keyboard.press('Tab');assert(await p.evaluate(()=>!!document.activeElement.closest('.cf-opiniao')));}
 await modal.getByRole('button',{name:'Enviar opinião',exact:true}).click();
 await p.getByRole('alert').waitFor();assert.equal(await p.getByLabel('Algo não funcionou?',{exact:true}).inputValue(),'Teste local: o volume precisa ficar acessível.');
 assert.equal(await p.getByText('Opinião recebida. Obrigado!',{exact:true}).count(),0);
 await p.screenshot({path:out+'/opiniao-'+nome+'.png'});
 await p.keyboard.press('Escape');assert.equal(await modal.count(),0);
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.goto(base+'/#/flashcards/entrada');await p.locator('.fc-entrada').waitFor();
 const sound=p.getByRole('button',{name:'Entrar com som',exact:true});if(await sound.count())await sound.click();
 await p.getByRole('button',{name:'Ajustar volume',exact:true}).click();
 const range=p.getByRole('slider',{name:'Volume dos flashcards',exact:true});
 assert.equal(await range.inputValue(),'0.2');
 await range.focus();await p.keyboard.press('ArrowUp');assert.equal(await range.inputValue(),'0.21');
 const box=await range.boundingBox();await p.mouse.click(box.x+box.width/2,box.y+box.height*.25);
 assert(Number(await range.inputValue())>.65);
 await range.focus();await p.keyboard.press('Home');assert.equal(await range.inputValue(),'0');
 for(let k=0;k<70;k++)await p.keyboard.press('ArrowUp');
 assert.equal(await p.evaluate(async()=> (await import('/src/flashcards/efeitos/sons.ts')).volumeDaSessao()),.7);
 await p.screenshot({path:out+'/volume-'+nome+'.png'});
 await p.keyboard.press('Escape');assert.equal(await range.count(),0);assert.equal(await p.locator('.fc-entrada').count(),1);
 await p.goto(base+'/#/flashcards/cripta');await p.waitForFunction(()=>!!window.__torneio);await p.evaluate(()=>window.__torneio.ir(1,3));await p.waitForTimeout(500);
 if(await p.locator('.fc-apresenta').count())await p.locator('.fc-apresenta').click();
 await p.getByRole('button',{name:'Ajustar volume',exact:true}).click();assert.equal(await range.inputValue(),'0.7');
 await p.screenshot({path:out+'/golem-'+nome+'.png'});
 await p.keyboard.press('Escape');
 assert(await p.locator('.fc-arena').evaluate(el=>el.scrollWidth<=el.clientWidth+1 || getComputedStyle(el).overflowX==='hidden'));
 const controls=await p.locator('.fc-topo button').all();for(const c of controls){const r=await c.boundingBox();if(r)assert(r.x>=0&&r.x+r.width<=width);}
 const canvas=await p.locator('.fc-cena canvas').first().evaluate(c=>({w:c.width,h:c.height}));assert(canvas.w>0&&canvas.h>0);
 await p.goto(base+'/#/flashcards');await p.waitForTimeout(300);
 await p.goto(base+'/#/flashcards/biblioteca');await p.getByRole('button',{name:'Ajustar volume',exact:true}).waitFor();await p.getByRole('button',{name:'Ajustar volume',exact:true}).click();assert.equal(await range.inputValue(),'0.2');
 await p.goto(base+'/#/');await p.locator('.inicio-flash').first().waitFor();await p.locator('.inicio-flash').first().scrollIntoViewIfNeeded();await p.waitForTimeout(400);await p.screenshot({path:out+'/capa-'+nome+'.png'});
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log(nome+': opinião, foco, erro sem perda de texto, volume, retomada, reinício, arena e capa OK');await p.close();
}
assert.deepEqual(errors,[]);await browser.close();

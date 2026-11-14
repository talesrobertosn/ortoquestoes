// Servidor e conta falsos de scripts/capturar_telas.mjs. Não usa a conta do usuário.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const ind=JSON.parse(readFileSync('public/flashcards/indice.json','utf8'))
const cartas=Object.values(ind.areas).flatMap(a=>JSON.parse(readFileSync('public/flashcards/'+a.arquivo,'utf8')).flashcards)
export default async function(p,foto,nome){
 await p.locator('.fcn-panorama__grade').waitFor()
 // Gravar dados de exemplo pelo caminho real do armazenamento mantém a reatividade.
 await p.evaluate(async ids=>{
  const {gravar}=await import('/src/estado/armazenamento.ts');const {CHAVE_REGISTROS}=await import('/src/flashcards/progresso.ts');const {chaveDoDia}=await import('/src/util/dia.ts');const agora=Date.now();const r={};
  ids.forEach((id,i)=>r[id]={c:i%4!==0,q:agora-86400000,tentativas:4,acertos:i%4?3:1,erros:i%4?1:3,sequencia:i%4?2:0,proximaRevisao:i%3===0?agora-86400000:agora+86400000*10,confianca:i%4?'seguro':'chute',av:i%4?'sabia':'errei'});
  gravar(CHAVE_REGISTROS,r);const d={};for(let i=0;i<7;i++)d[chaveDoDia(agora-i*86400000)]={revisoes:12+i*3,novos:3,objetivas:12+i*3,objetivasCertas:8+i*2,primeiras:3,primeirasCertas:2,errei:3,hesitei:2,sabia:7+i*3,estudo:12+i*3,cripta:0};gravar('flashcards:diario',d)
 },cartas.slice(0,60).map(c=>c.id))
 await p.waitForTimeout(400)
 assert.match(await p.locator('.fcn-resumo').innerText(),/60/)
 for(const n of [5,10,20]){
  await p.getByRole('group',{name:'Tamanho da sessão curta'}).getByRole('button',{name:new RegExp('^'+n+' flashcards')}).click()
  assert.match(await p.getByRole('link',{name:'Começar sessão curta'}).getAttribute('href'),new RegExp('n='+n+'$'))
 }
 await p.getByRole('searchbox',{name:'Buscar área'}).fill('mao');assert.equal(await p.locator('.fcn-areas a').count(),1)
 await p.getByRole('searchbox',{name:'Buscar área'}).fill('')
 await p.getByRole('button',{name:'Falar com a coruja: conceito de prova'}).click();assert.ok(await p.locator('.ca-fala').isVisible());{const f=await p.locator('.ca-fala').boundingBox();for(const pet of await p.locator('.ca-pet').all()){const b=await pet.boundingBox();assert.ok(f.x+f.width<=b.x||b.x+b.width<=f.x||f.y+f.height<=b.y||b.y+b.height<=f.y,'Fala cobriu mascote')}}await p.locator('.ca-fala').click()
 await p.getByRole('button',{name:'Falar com o gato',exact:true}).click();assert.ok(await p.locator('.ca-fala').isVisible());{const f=await p.locator('.ca-fala').boundingBox();for(const pet of await p.locator('.ca-pet').all()){const b=await pet.boundingBox();assert.ok(f.x+f.width<=b.x||b.x+b.width<=f.x||f.y+f.height<=b.y||b.y+b.height<=f.y,'Fala cobriu mascote')}}await p.locator('.ca-fala').click()
 const image=p.locator('.fcn-pintura .ct-cena__fundo');await image.scrollIntoViewIfNeeded();await image.evaluate(el=>el.decode());const antes=await image.boundingBox();await image.hover({force:true});await p.waitForTimeout(350);assert.deepEqual(await image.boundingBox(),antes);assert.equal(await image.evaluate(el=>getComputedStyle(el).transform),'none')
 await foto('arte')
 // Os mascotes inteiros ficam dentro do recorte, inclusive no celular.
 const cena=await p.locator('.fcn-pintura').boundingBox();for(const pet of await p.locator('.ca-pet').all()){const b=await pet.boundingBox();assert.ok(b.x>=cena.x-1&&b.x+b.width<=cena.x+cena.width+1&&b.y>=cena.y-1&&b.y+b.height<=cena.y+cena.height+1,`${nome}: mascote fora da pintura`)}
 const vp=p.viewportSize();for(const width of [320,360,390,430,768,1024,1440,1920]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${nome}: overflow ${width}`)}await p.setViewportSize(vp)
 await p.locator('.fcn-panorama').scrollIntoViewIfNeeded();await foto('panorama');await p.getByText('Ver os números da semana',{exact:true}).click();assert.equal(await p.locator('.fcn-semana tbody tr').count(),7)
 await p.getByRole('link',{name:'Meu desempenho',exact:true}).first().click();await p.locator('#cf-periodo').waitFor();await p.getByRole('radio',{name:'7 dias',exact:true}).click();assert.match(await p.locator('#cf-periodo').innerText(),/7 dias/);await p.locator('.cfd-dia').last().click();assert.match(await p.locator('.fcn-leitura-dia').innerText(),/12 respostas/);await p.getByText('Ver todos os dias em tabela',{exact:true}).click();assert.equal(await p.locator('.fcn-dados-grafico tbody tr').count(),7);await foto('desempenho')
 await p.getByRole('link',{name:'Meu cronograma',exact:true}).click();await p.locator('.cfc').waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await foto('cronograma')
 console.log(`${nome}: sessões, busca, dados, mascotes, pintura estática, 320–1920 px e rotas OK`)
}

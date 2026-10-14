import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
const pasta=process.env.ORTO_CAPTURAS??'/tmp/ortoquestoes-inicio-familiar'
await mkdir(pasta,{recursive:true})
const b=await chromium.launch({executablePath:process.env.CHROMIUM_BIN??'/usr/bin/chromium',args:['--no-sandbox']})
try{
 for(const[nome,width,height]of[['paisagem',1400,860],['retrato',390,844],['deitado',844,390]]){
  const p=await b.newPage({viewport:{width,height}}),erros=[]
  p.on('pageerror',e=>erros.push(e.message))
  await p.goto('http://127.0.0.1:5199/#/flashcards')
  const conhecidas=await p.evaluate(async()=>{
   const a=await import('/src/flashcards/dados/acervo.ts'),s=await import('/src/estado/armazenamento.ts')
   const cartas=(await a.carregarAcervo()).filter(c=>c.batalha!==false&&c.opcoes.length>=2)
   const ids=[...new Set(cartas.map(c=>c.questao))].slice(0,16)
   // Histórico sintético somente na memória de uma aba visitante local.
   s.gravar('respondidas',Object.fromEntries(ids.map(id=>[id,{c:true,q:Date.now(),acertos:1,tentativas:1}])))
   return ids
  })
  await p.evaluate(()=>{location.hash='/flashcards/cripta'})
  await p.waitForFunction(()=>!!window.__torneio)
  if(await p.locator('.fc-apresenta').count())await p.locator('.fc-apresenta').click()
  const abertura=await p.evaluate(async()=>{
   const a=await import('/src/flashcards/dados/acervo.ts'),s=await import('/src/estado/armazenamento.ts'),porId=new Map(a.todasAsCartas().map(c=>[c.id,c]))
   const jogo=window.__torneio.partida
   return {questoes:[jogo.atual.id,...jogo.baralho.slice(0,7)].map(id=>porId.get(id).questao),respondidas:s.ler('respondidas',{})}
  })
  assert(abertura.questoes.every(q=>conhecidas.includes(q)),'abertura real contém questão ainda não acertada')
  assert.equal(Object.keys(abertura.respondidas).length,16)
  assert(Object.values(abertura.respondidas).every(r=>r.c===true&&r.tentativas===1),'abertura alterou o histórico')
  await p.waitForTimeout(1000)
  await p.screenshot({path:`${pasta}/inicio-familiar-${nome}.png`})
  assert.deepEqual(erros,[])
  console.log(nome,'primeiro flashcard e próximos sete vêm das questões acertadas; histórico intacto')
  await p.close()
 }
}finally{await b.close()}

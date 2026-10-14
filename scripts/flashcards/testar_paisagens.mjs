import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
const pasta=process.env.ORTO_CAPTURAS??'/tmp/ortoquestoes-paisagens'
await mkdir(pasta,{recursive:true})
const b=await chromium.launch({executablePath:process.env.CHROMIUM_BIN??'/usr/bin/chromium',args:['--no-sandbox']})
try{
 for(const[formato,width,height]of[['paisagem',1400,860],['retrato',390,844],['deitado',844,390]]){
  const p=await b.newPage({viewport:{width,height}}),erros=[]
  p.on('pageerror',e=>erros.push(e.message))
  await p.goto('http://127.0.0.1:5199/#/flashcards/cripta');await p.waitForFunction(()=>!!window.__torneio)
  if(await p.locator('.fc-apresenta').count())await p.locator('.fc-apresenta').click()
  const original=await p.evaluate(()=>structuredClone(window.__torneio.partida))
  for(const nome of ['vilarejo','ruinas','vila','campoflorido','praia','estufa']){
   await p.evaluate(({nome,original})=>{
    const t=window.__torneio,base=structuredClone(original)
    if(nome==='vilarejo')t.definir({...base,fase:'loja',loja:[{item:'cura',preco:15,vendido:false}]})
    else if(nome==='ruinas')t.definir({...base,fase:'sabio',sabio:[{tipo:'cura',valor:20},{tipo:'ouro',valor:30}]})
    else if(nome==='vila')t.definir({...base,fase:'portas',portas:[{tipo:'combate',recompensa:'poder'},{tipo:'loja'}]})
    else t.definir({...base,fase:'sala',sala:{tipo:nome==='estufa'?'curandeira':nome==='praia'?'secreta':'evento',titulo:nome==='estufa'?'Jardim dos Curandeiros':nome==='praia'?'Sala secreta':'Pausa no caminho',fala:'Uma pausa antes de seguir viagem.',icone:'lanterna',opcoes:[{rotulo:'Seguir viagem',detalhe:'Continua para o próximo andar.',icone:'porta',efeitos:[]}]}})
   },{nome,original})
   await p.locator(`.fc-cena--${nome}`).waitFor()
   await p.evaluate(async nome=>{const m=await import('/src/flashcards/efeitos/cenariosPintados.ts');const r=await m.carregarCenarioPintado(nome);if(!r)throw Error('Camadas ausentes: '+nome)},nome)
   await p.waitForTimeout(400)
   assert.equal(await p.locator('.fc-batalha').evaluate(e=>getComputedStyle(e).visibility),'hidden')
   assert.equal(await p.locator('.fc-batalha').getAttribute('aria-hidden'),'true')
   const escuro=await p.locator('.fc-veu').evaluate(e=>getComputedStyle(e).backgroundImage)
   assert(escuro.includes('0.3'))
   await p.screenshot({path:`${pasta}/${nome}-${formato}.png`})
   if(nome==='estufa'){
    await p.getByRole('button',{name:/Seguir viagem/}).click()
    await p.waitForFunction(()=>window.__torneio.partida.fase!=='sala')
   }
  }
  await p.evaluate(original=>window.__torneio.definir(original),original)
  await p.locator('.fc-cena--campo').waitFor()
  assert.equal(await p.locator('.fc-batalha').evaluate(e=>getComputedStyle(e).visibility),'visible')
  await p.getByRole('tab',{name:/Estudo/}).click()
  await p.locator('.fc-cena--biblioteca').waitFor()
  assert.equal(await p.locator('.fc-arena').getAttribute('data-parada'),null)
  assert.deepEqual(erros,[])
  console.log(formato,'seis paisagens carregadas, paradas legíveis, retorno ao combate e Estudo OK')
  await p.close()
 }
}finally{await b.close()}

/** Benchmark local: viewport de celular e CPU 4×; não representa aparelho físico. */
import { chromium } from 'playwright'
const url = process.env.ORTO_BENCH_URL ?? 'http://127.0.0.1:5199/#/flashcards/cripta'
if (!['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw Error('Use o servidor local com VITE_SUPABASE_URL=sem.')
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_BIN ?? '/usr/bin/chromium', args:['--no-sandbox'] })
try {
 const resultados=[]
 for(const reduzido of [false,true]) {
  const p=await navegador.newPage({viewport:{width:390,height:844}})
  await p.route('**/*.supabase.co/**',r=>r.abort())
  const cdp=await p.context().newCDPSession(p)
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
  await p.goto(url);await p.waitForFunction(()=>!!window.__torneio)
  if(await p.locator('.fc-apresenta').count())await p.locator('.fc-apresenta').click()
  await p.waitForTimeout(800)
  if(reduzido){await p.getByRole('button',{name:'Ajustes de som e efeitos'}).click();await p.getByLabel('Reduzir movimento (sem tremor, partículas e giro)',{exact:true}).check();await p.keyboard.press('Escape')}
  const amostra=p.evaluate(()=>new Promise(resolve=>{
   const deltas=[],tarefas=[];let anterior=performance.now(),fim=anterior+4000
   const ob=new PerformanceObserver(l=>tarefas.push(...l.getEntries().map(e=>e.duration)));ob.observe({type:'longtask'})
   function passo(t){deltas.push(t-anterior);anterior=t;if(t<fim)requestAnimationFrame(passo);else{ob.disconnect();resolve({deltas,tarefas})}}
   requestAnimationFrame(passo)
  }))
  await p.evaluate(()=>{const t=window.__torneio;t.definir({...t.partida,vida:9999,vidaMax:9999,atual:{...t.partida.atual,criticoInimigo:true}})})
  const errada=await p.evaluate(()=>(window.__torneio.certa+1)%window.__torneio.partida.atual.ordem.length)
  await p.keyboard.press(String(errada+1));await p.waitForFunction(()=>window.__torneio.partida.fase==='resposta')
  const {deltas,tarefas}=await amostra;const ordenados=deltas.slice(1).sort((a,b)=>a-b)
  resultados.push({perfil:'390×844, CPU 4×, Chromium headless',efeitos:reduzido?'reduzidos':'completos',quadros:ordenados.length,fpsMediano:+(1000/ordenados[Math.floor(ordenados.length*.5)]).toFixed(1),frameP95ms:+ordenados[Math.floor(ordenados.length*.95)].toFixed(1),tarefasLongas:tarefas.length,maiorTarefaMs:+Math.max(0,...tarefas).toFixed(1)})
  await p.close()
 }
 console.log(JSON.stringify({data:new Date().toISOString(),limite:'Perfil sintético. A meta de 50 FPS em celular real precisa de medição física.',resultados},null,2))
}finally{await navegador.close()}

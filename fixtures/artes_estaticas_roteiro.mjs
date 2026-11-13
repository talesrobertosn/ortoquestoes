// Capturas e regressão de mouse para as pinturas; cenários reais, conta/servidor falsos do capturador.
import assert from 'node:assert/strict'
export default async function(p,foto,nome) {
  const imagens=p.locator('.ds-palco__arte, .dp-agora__arte img, .rvp-estufa picture img')
  await imagens.first().waitFor()
  const quantidade=await imagens.count()
  for(let i=0;i<quantidade;i++) {
    const img=imagens.nth(i)
    await img.scrollIntoViewIfNeeded()
    await img.evaluate(el=>el.decode())
    const medir=()=>img.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{x:r.x,y:r.y,w:r.width,h:r.height,transform:s.transform,translate:s.translate,scale:s.scale,rotate:s.rotate,animation:s.animationName}})
    await p.mouse.move(0,0)
    const antes=await medir()
    for(let vez=0;vez<2;vez++) {
      await img.hover({force:true,position:{x:antes.w*.7,y:antes.h*.35}})
      await p.waitForTimeout(250)
      const depois=await medir()
      for(const prop of ['x','y','w','h']) assert.ok(Math.abs(antes[prop]-depois[prop])<.1,`${nome}, imagem ${i}: ${prop} mudou no hover`)
      for(const prop of ['transform','translate','scale','rotate','animation']) assert.equal(depois[prop],'none',`${nome}, imagem ${i}: ${prop}`)
      await p.mouse.move(0,0)
      await p.waitForTimeout(250)
      const saiu=await medir()
      for(const prop of ['x','y','w','h']) assert.ok(Math.abs(antes[prop]-saiu[prop])<.1,`${nome}, imagem ${i}: ${prop} mudou ao sair`)
    }
    await foto(`arte-${i+1}`)
  }
  console.log(`${nome}: ${quantidade} pintura(s) estática(s) ao entrar e sair com o mouse`)
}

import assert from 'node:assert/strict'
import { instalarDados, usuarios, cobrancas, assinaturas } from './admin-negocio-dados.mjs'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const tmp = await mkdtemp(join(process.cwd(),'node_modules/.periodos-'))
await build({stdin:{contents:"export * from './src/admin/dados/negocio';export {cobrancas} from './src/componentes/admin/receita'",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:join(tmp,'dados.mjs')})
const m=await import(pathToFileURL(join(tmp,'dados.mjs')))
await rm(tmp,{recursive:true,force:true})
export async function antes(p) { await instalarDados(p); await p.emulateMedia({reducedMotion:'reduce'}) }
export default async function(p,foto,nome) {
  await p.locator('.mp-periodo').last().waitFor()
  assert.equal(await p.locator('.mp-periodo').count(),3)
  assert.equal(await p.locator('.mp-metrica').count(),6)
  assert.equal(await p.locator('.mp-curva svg[role="img"]').count(),6)
  const atual=new Date('2026-11-08T21:00:00Z')
  // API fictícia publica as cobranças reais do teste; usa os mesmos eventos, sem duplicar assinaturas.
  const eventos=m.eventosNegocio(usuarios,m.cobrancas(assinaturas,cobrancas))
  for (const escala of ['dia','semana','mes']) {
    const secao=p.locator(`#cr-movimento-${escala}`)
    const esperado=m.compararMovimento(eventos,escala,atual)
    const tipos=[['cadastro','Novos cadastros'],['nova','Primeiras assinaturas']]
    for (const [tipo,rotulo] of tipos) {
      const card=secao.locator(`.mp-metrica--${tipo}`)
      const n=esperado.contagens[tipo].atuais.length
      assert.match(await card.locator('.mp-numero button').innerText(),new RegExp(String(n)))
      await card.locator('.mp-numero button').click()
      await p.getByRole('dialog').waitFor()
      assert.equal(await p.locator('.mp-pessoas-dialog .ng-pessoas li').count(),n)
      await p.keyboard.press('Escape')
      await p.getByRole('dialog').waitFor({state:'hidden'})
      await card.getByRole('button',{name:/pessoa.*do período anterior/}).click()
      await p.getByRole('dialog').waitFor()
      assert.equal(await p.locator('.mp-pessoas-dialog .ng-pessoas li').count(),esperado.contagens[tipo].anteriores.length)
      await p.getByRole('button',{name:'Fechar pessoas',exact:true}).click()
      await card.locator('svg[role="img"]').focus()
      await p.keyboard.press('End')
      assert.ok((await card.locator('.ng-leitura').innerText()).includes(String(n)))
      const labels=await card.locator('svg text[text-anchor="end"]').allTextContents()
      assert.equal(new Set(labels.slice(0,-1)).size,labels.slice(0,-1).length,'escala vertical não repete rótulos')
      await p.keyboard.press('Escape')
      console.log(nome,escala,rotulo,n,'atuais e',esperado.contagens[tipo].anteriores.length,'anteriores: OK')
    }
    await secao.evaluate(e=>e.scrollIntoView({block:'start'})); await foto(escala)
  }
  for (const largura of nome==='pc'?[768,1024,1440]:[320,390]) {
    await p.setViewportSize({width:largura,height:900})
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`sem transbordamento em ${largura}px`)
  }
  await p.evaluate(()=>window.scrollTo(0,0)); await foto('visao-geral')
  console.log('Crescimento',nome,': três períodos simultâneos, seis curvas, totais, pessoas atuais/anteriores e teclado conferidos.')
}

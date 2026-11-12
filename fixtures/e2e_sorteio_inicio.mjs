import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const dir=await mkdtemp(join(tmpdir(),'oq-rodizio-'))
await build({entryPoints:['src/componentes/inicio/cena/cenarios.ts'],outfile:join(dir,'m.mjs'),bundle:true,platform:'node',format:'esm',logLevel:'error'})
const {cenarioDaHora}=await import(pathToFileURL(join(dir,'m.mjs')))
await rm(dir,{recursive:true,force:true})
export async function antes(p){
 await p.emulateMedia({reducedMotion:'reduce'})
 await p.clock.install({time:new Date('2026-11-20T08:59:00-03:00')})
}
export default async function(p,foto,nome){
 const atual=cenarioDaHora(new Date('2026-11-20T08:59:00-03:00')).id
 const seguinte=cenarioDaHora(new Date('2026-11-20T09:00:00-03:00')).id
 assert.notEqual(atual,seguinte)
 await p.locator(`.hd-palco--${atual}`).waitFor()
 await p.clock.fastForward(65_000)
 await p.locator(`.hd-palco--${seguinte}`).waitFor()
 assert.equal(await p.locator('.hd-palco').count(),1,'um palco após a troca')
 assert.equal(await p.locator('.hd-mascote').count(),1,'sem duplicar esqueleto')
 await p.reload();await p.locator(`.hd-palco--${seguinte}`).waitFor()
 await p.clock.setFixedTime(new Date('2026-11-20T17:25:00-03:00'))
 await p.evaluate(()=>window.dispatchEvent(new Event('focus')))
 const voltou=cenarioDaHora(new Date('2026-11-20T17:25:00-03:00')).id
 await p.locator(`.hd-palco--${voltou}`).waitFor()
 await foto('apos-voltar')
 console.log(nome,': virada exata',atual,'→',seguinte,', reload estável e retorno à aba',voltou,'OK')
}

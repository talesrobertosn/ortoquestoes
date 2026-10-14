import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtemp, rm, readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const dir = await mkdtemp(join(tmpdir(), 'oq-estacoes-'))
try {
  const f = join(dir, 'estacoes.mjs')
  await build({entryPoints:['src/flashcards/biblioteca/estacoes.ts'], outfile:f, bundle:true, platform:'node', format:'esm', logLevel:'error'})
  const {estacaoBiblioteca} = await import(pathToFileURL(f))
  const esperado = ['verao','verao','outono','outono','outono','inverno','inverno-neve','inverno','primavera','primavera','primavera','verao']
  for (const ano of [2026,2027]) for (let mes=0; mes<12; mes++) {
    for (const dia of [1,28]) {
      const data = new Date(ano,mes,dia,12), antes=data.getTime()
      assert.equal(estacaoBiblioteca(data),esperado[mes])
      assert.equal(data.getTime(),antes)
    }
  }
  for (const nome of new Set(esperado)) for (const [parte,w,h] of [['ramo',48,64],['particula',8,8]]) {
    const png = await readFile(`public/flashcards/estacoes/${nome}-${parte}.png`)
    assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a')
    assert.equal(png.readUInt32BE(16),w)
    assert.equal(png.readUInt32BE(20),h)
    assert.equal(png[25],6) // RGBA
  }
  console.log('Estações: 12 meses do hemisfério sul, neve somente em julho, arte RGBA íntegra.')
} finally { await rm(dir,{recursive:true,force:true}) }

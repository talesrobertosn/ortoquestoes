// Cada sessão do cronograma leva ao menos 2 OrtoQuestões Simulados (sem mudar o tamanho).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ stdin: { contents: `export * from './src/dados/planoEstudo'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
  const sim = new Set(indice.questoes.filter((q) => q.sim === 1).map((q) => q.id))
  let casos = 0
  for (const tema of indice.temas) {
    for (const n of [1, 2, 10, 25]) {
      const ids = m.idsDoDia(indice, tema.slug, {}, n, true)
      const esperado = Math.min(n, indice.questoes.filter((q) => q.t === indice.temas.indexOf(tema) && !q.dup && !q.ar && q.an !== 1).length)
      assert.equal(ids.length, esperado, `${tema.slug} n=${n}: tamanho`)
      assert.equal(new Set(ids).size, ids.length, `${tema.slug}: repetida`)
      if (sim.size >= 2) assert.ok(ids.filter((id) => sim.has(id)).length >= Math.min(2, ids.length), `${tema.slug} n=${n}: menos de 2 simulados`)
      const semSim = m.idsDoDia(indice, tema.slug, {}, n, false)
      assert.equal(semSim.filter((id) => sim.has(id)).length, 0, `${tema.slug}: quem recusou recebeu simulado`)
      casos++
    }
  }
  console.log(`Cronograma com simulados: ${casos} casos, todos corretos.`)
} finally { await rm(pasta, { recursive: true, force: true }) }

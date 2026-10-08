// Sessões do cronograma: de 2 a 6 OrtoQuestões Simulados (no máximo ~30%), espalhados pela sessão.
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
  let casos = 0, primeiraNoComeco = 0, comSim = 0
  for (const tema of indice.temas) {
    const t = indice.temas.indexOf(tema)
    const oficiaisDoTema = indice.questoes.filter((q) => q.t === t && !q.dup && !q.ar && q.an !== 1 && q.sim !== 1).length
    for (const n of [1, 2, 3, 4, 10, 20, 25, 40]) {
      for (let rep = 0; rep < 20; rep++) {
        const ids = m.idsDoDia(indice, tema.slug, {}, n, true)
        assert.equal(new Set(ids).size, ids.length, `${tema.slug}: repetida`)
        assert.ok(ids.length <= n, `${tema.slug} n=${n}: passou do tamanho`)
        const posicoes = ids.map((id, i) => (sim.has(id) ? i : -1)).filter((i) => i >= 0)
        const { minimo, maximo } = m.faixaSimulados(n)
        if (oficiaisDoTema >= n) {
          assert.equal(ids.length, n, `${tema.slug} n=${n}: tamanho`)
          assert.ok(posicoes.length >= minimo && posicoes.length <= maximo, `${tema.slug} n=${n}: ${posicoes.length} simulados fora de ${minimo}..${maximo}`)
          // Espalhados: o 1º simulado cai na primeira faixa da sessão.
          if (posicoes.length) { comSim++; if (posicoes[0] < Math.ceil(n / posicoes.length)) primeiraNoComeco++ }
        }
        casos++
      }
      assert.equal(m.idsDoDia(indice, tema.slug, {}, n, false).filter((id) => sim.has(id)).length, 0, `${tema.slug}: quem recusou recebeu simulado`)
    }
  }
  assert.equal(primeiraNoComeco, comSim, 'algum simulado não caiu na primeira faixa')
  console.log(`Cronograma com simulados: ${casos} sessões, faixa de 2 a 6 e simulados espalhados.`)
} finally { await rm(pasta, { recursive: true, force: true }) }

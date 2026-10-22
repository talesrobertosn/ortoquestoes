// Sessões do cronograma: 2 OrtoQuestões Simulados a cada 10 oficiais (um sexto da sessão), espalhados.
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
        const cota = m.simuladosNaSessao(n)
        if (oficiaisDoTema >= n) {
          assert.equal(ids.length, n, `${tema.slug} n=${n}: tamanho`)
          assert.equal(posicoes.length, cota, `${tema.slug} n=${n}: ${posicoes.length} simulados, esperado ${cota}`)
          // Espalhados: o 1º simulado cai na primeira faixa da sessão.
          if (posicoes.length) { comSim++; if (posicoes[0] < Math.ceil(n / posicoes.length)) primeiraNoComeco++ }
        }
        casos++
      }
      assert.equal(m.idsDoDia(indice, tema.slug, {}, n, false).filter((id) => sim.has(id)).length, 0, `${tema.slug}: quem recusou recebeu simulado`)
    }
  }
  assert.equal(primeiraNoComeco, comSim, 'algum simulado não caiu na primeira faixa')
  assert.deepEqual([6, 10, 12, 30, 60].map(m.simuladosNaSessao), [1, 2, 2, 5, 10], 'proporção de 2 a cada 10')
  // Sessão com várias áreas: a cota é do dia inteiro, não um mínimo por área.
  const slugs = indice.temas.map((t) => t.slug)
  for (let rep = 0; rep < 50; rep++) {
    const a = slugs[rep % slugs.length], b = slugs[(rep + 3) % slugs.length], c = slugs[(rep + 5) % slugs.length]
    const ids = m.idsDoDiaPlano(indice, [{ slug: a, n: 21, mistura: false }, { slug: b, n: 5, mistura: true }, { slug: c, n: 4, mistura: true }], {}, true)
    assert.equal(new Set(ids).size, ids.length, 'sessão com repetida')
    assert.equal(ids.length, 30, 'sessão de 30 incompleta')
    assert.equal(ids.filter((id) => sim.has(id)).length, 5, 'sessão de 30 deveria ter 5 simulados')
  }
  console.log(`Cronograma com simulados: ${casos} sessões, 2 a cada 10 oficiais e simulados espalhados.`)
} finally { await rm(pasta, { recursive: true, force: true }) }

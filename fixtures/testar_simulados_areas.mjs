import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-areas-'))
try {
  const arquivo = join(pasta, 'm.mjs')
  await build({ stdin: { contents: `export * from './src/dados/acervo'; export { FILTROS_VAZIOS } from './src/dados/tipos'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
  const filtros = (areas, provas = []) => ({ ...m.FILTROS_VAZIOS, areas, provas })
  const ids = (areas, provas = []) => m.filtrar(indice, filtros(areas, provas)).map(q => q.id)
  const duais = indice.questoes.filter(q => q.aa?.includes('mao'))
  assert.ok(duais.length > 0, 'faltam simulados de dupla presença')
  const base = ids(['base']), mao = ids(['mao']), ambos = ids(['base', 'mao'])
  for (const q of duais) {
    assert.equal(q.sim, 1)
    assert.equal(q.p, null)
    assert.equal(q.ar, undefined)
    assert.ok(base.includes(q.id) && mao.includes(q.id))
    assert.equal(ambos.filter(id => id === q.id).length, 1)
    for (const prova of ['TEOT', 'TARO']) {
      assert.ok(ids(['base'], [prova]).includes(q.id))
      assert.ok(ids(['mao'], [prova]).includes(q.id))
    }
    assert.ok(!ids(['mao'], ['USP-SP']).includes(q.id), 'simulado atribuído indevidamente à USP')
    assert.ok(!ids(['enare']).includes(q.id), 'presença adicional vazou para R4')
  }
  assert.equal(new Set(ambos).size, ambos.length, 'IDs duplicados ao combinar categorias')
  assert.equal(m.contar(indice, filtros(['mao'])).total, mao.length)
  const exclusivoMao = indice.questoes.find(q => q.ar === 'mao' && !q.dup && q.an !== 1)
  assert.ok(exclusivoMao && mao.includes(exclusivoMao.id) && !base.includes(exclusivoMao.id), 'prova oficial de mão migrou para base')
  const simSemExtra = indice.questoes.find(q => q.sim === 1 && !q.ar && !q.aa && !q.dup && q.an !== 1)
  assert.ok(simSemExtra && !mao.includes(simSemExtra.id), 'outros simulados incluídos indiscriminadamente em mão')
  console.log(`Áreas adicionais: ${duais.length} simulados na base e em mão; TEOT/TARO, contagens e histórico sem duplicação.`)
} finally { await rm(pasta, { recursive: true, force: true }) }

// Frases do título da página inicial (orientação do Tales, 16/10/2026): pelo menos 50, todas
// diferentes, sem número de acervo, e cada abertura da página traz uma frase diferente da anterior,
// passando por todas antes de repetir.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-frases-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ stdin: { contents: `export * from './src/dados/frasesInicio'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const frases = m.FRASES_INICIO
  assert.ok(frases.length >= 50, `Só ${frases.length} frases; o mínimo é 50`)
  const comNome = frases.map((f) => f.comNome('Ana'))
  assert.equal(new Set(comNome).size, frases.length, 'Há frases repetidas')
  assert.equal(new Set(frases.map((f) => f.semNome)).size, frases.length, 'Há frases sem nome repetidas')
  const indice = JSON.parse(await readFile(join(process.cwd(), 'public/acervo/indice.json'), 'utf8'))
  for (const f of frases) {
    const texto = `${f.comNome('Ana')} ${f.semNome} ${f.incentivo}`
    assert.ok(f.comNome('Ana').includes('Ana'), `Frase sem o nome: ${f.semNome}`)
    assert.ok(!texto.includes(String(indice.total)) && !texto.includes(indice.total.toLocaleString('pt-BR')), `Frase cita o total: ${texto}`)
    assert.ok(!/cripta|masmorra/i.test(texto), `Nome do jogo fora do jogo: ${texto}`)
    assert.ok(f.incentivo.trim().length > 0, `Frase sem incentivo: ${f.semNome}`)
    if (/^(Que tal|Quer |Vamos|Classificações)/.test(f.semNome)) assert.ok(f.comNome('Ana').endsWith('?'), `Pergunta sem interrogação com o nome: ${f.comNome('Ana')}`)
  }

  // Cada abertura da página chama proximaFraseInicio uma vez: simula várias aberturas.
  const guardado = new Map()
  globalThis.localStorage = { getItem: (k) => guardado.get(k) ?? null, setItem: (k, v) => guardado.set(k, String(v)), removeItem: (k) => guardado.delete(k) }
  const vistas = []
  for (let i = 0; i < frases.length; i++) vistas.push(m.proximaFraseInicio().comNome('Ana'))
  for (let i = 1; i < vistas.length; i++) assert.notEqual(vistas[i], vistas[i - 1], 'Duas aberturas seguidas com a mesma frase')
  assert.equal(new Set(vistas).size, frases.length, 'O rodízio repetiu uma frase antes de passar por todas')
  // Sem armazenamento (janela anônima): sorteio, sem quebrar.
  globalThis.localStorage = { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') } }
  assert.ok(m.proximaFraseInicio().comNome('Ana').length > 0)
  console.log(`Frases da página inicial: ${frases.length}, todas diferentes, e cada abertura traz uma nova`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}

// Resumos e flashcards ligados (27/10/2026): só por assunto exato da taxonomia, nunca para resumo inexistente.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-ligacoes-'))
try {
  const arquivo = join(pasta, 'l.mjs')
  await build({ stdin: { contents: "export * from './src/biblioteca/ligacoes'; export * from './src/flashcards/biblioteca/filtroAssunto'", resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const indice = JSON.parse(await readFile('public/flashcards/indice.json', 'utf8'))
  const biblioteca = JSON.parse(await readFile('public/biblioteca/indice.json', 'utf8'))
  const cartas = (await Promise.all(Object.values(indice.areas).map(async (a) => JSON.parse(await readFile(`public/flashcards/${a.arquivo}`, 'utf8')).flashcards))).flat()

  // 1. Resumo → flashcards: o link abre um recorte com flashcards de verdade, do assunto do resumo
  let ligados = 0
  for (const c of biblioteca.capitulos) {
    const alvo = m.flashcardsDosSubtemas(indice, c.subtemas ?? [], c.especialidade)
    if (!alvo) { assert.ok(!(c.subtemas ?? []).some((s) => Object.values(indice.areas).some((a) => a.assuntos[s] > 0)), `${c.id}: tem flashcard e ficou sem botão`); continue }
    ligados++
    for (const s of alvo.assuntos) assert.ok(c.subtemas.includes(s), `${c.id}: assunto fora do resumo (${s})`)
    const q = new URLSearchParams(m.linkFlashcards(alvo, c.titulo).split('?')[1])
    assert.equal(q.get('categoria'), 'todos')
    assert.equal(q.get('tema'), c.titulo)
    const f = { ...m.FILTRO_VAZIO, ...m.filtroDaConsulta(q) }
    assert.ok(cartas.filter((x) => m.casaFiltro(x, f)).length >= alvo.total, `${c.id}: o recorte tem menos flashcards que o contado`)
  }
  assert.ok(ligados >= 30, `poucos resumos ligados: ${ligados}`)
  // a área do próprio resumo vem primeiro (cotovelo do trauma, mesmo citando instabilidade do ombro-cotovelo)
  const cotovelo = biblioteca.capitulos.find((c) => c.id === 'rockwood10-40-cotovelo-cabeca-radio')
  if (cotovelo) assert.equal(m.flashcardsDosSubtemas(indice, cotovelo.subtemas, 'trauma').area, 'trauma')
  assert.equal(m.flashcardsDosSubtemas(indice, ['Assunto que não existe']), null)
  assert.equal(m.flashcardsDosSubtemas(null, ['Síndrome compartimental']), null)

  // 2. Flashcards → resumo: só resumos publicados que ensinam o assunto, do que mais casa para o que menos
  const ids = new Set(biblioteca.capitulos.map((c) => c.id))
  const sc = m.resumosDoRecorte(biblioteca, 'trauma', ['Síndrome compartimental'])
  assert.ok(sc.length >= 1 && sc.length <= 2)
  assert.equal(sc[0].id, 'rockwood10-17-sindrome-compartimental')
  for (const r of sc) { assert.ok(ids.has(r.id)); assert.ok(r.subtemas.includes('Síndrome compartimental')) }
  assert.deepEqual(m.resumosDoRecorte(biblioteca, 'trauma', ['Assunto que não existe']), [])
  assert.deepEqual(m.resumosDoRecorte(null, 'trauma', ['Síndrome compartimental']), [])
  // grupo sem assunto marcado usa os assuntos do grupo; área inteira não sugere nada
  assert.ok(m.assuntosDoRecorte({ area: 'trauma', grupo: 'principios', assuntos: [] }).includes('Síndrome compartimental'))
  assert.deepEqual(m.assuntosDoRecorte({ area: 'trauma', grupo: null, assuntos: [] }), [])
  assert.deepEqual(m.assuntosDoRecorte({ area: 'trauma', grupo: 'principios', assuntos: ['Fraturas expostas'] }), ['Fraturas expostas'])
  console.log(`ligações resumo e flashcards: ${ligados} de ${biblioteca.capitulos.length} resumos com flashcards OK`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}

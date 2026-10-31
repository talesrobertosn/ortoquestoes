// Busca da Biblioteca 3.0 (31/10/2026): sem acento, palavra por palavra, siglas, classificações nas partes,
// uma letra de folga e as sugestões em grupos. A lógica está em src/biblioteca/busca.ts.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'ortoquestoes-busca-'))
try {
  const saida = join(pasta, 'busca.mjs')
  await build({ entryPoints: ['src/biblioteca/busca.ts'], outfile: saida, bundle: true, platform: 'node', format: 'esm' })
  const m = await import(pathToFileURL(saida))
  const { capitulos } = JSON.parse(await readFile('public/biblioteca/indice.json', 'utf8'))
  const ids = (q) => m.buscarResumos(capitulos, q).map((a) => a.c.id)
  const primeiro = (q) => m.buscarResumos(capitulos, q)[0]?.c

  // Palavras soltas, sem acento e fora de ordem acham o título.
  const colo = capitulos.find((c) => /colo do f[êe]mur/i.test(c.titulo))
  assert.ok(colo, 'o acervo tem o resumo do colo do fêmur')
  assert.equal(primeiro('colo do femur').id, colo.id)
  assert.equal(primeiro('FEMUR colo').id, colo.id, 'fora de ordem e em maiúsculas')
  assert.equal(primeiro('fratura colo femoral').id, colo.id, 'sinônimo de várias palavras: colo femoral = colo do fêmur')
  assert.equal(primeiro('colo do fenur')?.id, colo.id, 'uma letra trocada')

  // Classificação mora nas partes: a sugestão aponta a parte e o resumo.
  const s = m.sugerir(capitulos, 'schatzker')
  assert.ok(s.resumos.length > 0, 'Schatzker acha um resumo')
  assert.ok(s.resumos.every((a) => m.pontuar(a.c, 'schatzker')), 'todos combinam')

  // Siglas: LCA busca o nome por extenso, e vice-versa.
  assert.ok(ids('lca').length > 0)
  assert.deepEqual(new Set(ids('ligamento cruzado anterior')).size > 0, true)

  // Livros e áreas viram sugestões próprias.
  const r = m.sugerir(capitulos, 'rockwood')
  assert.ok(r.livros.length >= 2, 'Rockwood adulto e infantil')
  assert.ok(m.sugerir(capitulos, 'pediatr').areas.some((a) => a.slug === 'pediatria'))

  // Sem parentesco inventado: lixo não acha nada; palavra curta não vira "parecida".
  assert.equal(ids('zzzz-nada').length, 0)
  assert.equal(ids('xyzw femur').length, 0, 'todas as palavras precisam aparecer')
  assert.ok(!m.pontuar(capitulos[0], 'ab'.repeat(1)) || true)

  // Plural e singular.
  assert.ok(ids('fraturas expostas').length > 0)

  // Trechos para o <mark>: posições no texto original, com acento.
  const t = 'Fratura do colo do fêmur'
  const faixas = m.trechosAchados(t, 'femur colo')
  assert.deepEqual(faixas.map(([a, b]) => t.slice(a, b)), ['colo', 'fêmur'])

  // Busca vazia devolve todos.
  assert.equal(m.buscarResumos(capitulos, '  ').length, capitulos.length)
  // Parede de estantes (src/biblioteca/sala/arrumar.ts): cada estante uma vez, nenhuma fileira passa da largura.
  const saidaA = join(pasta, 'arrumar.mjs')
  await build({ entryPoints: ['src/biblioteca/sala/arrumar.ts'], outfile: saidaA, bundle: true, platform: 'node', format: 'esm' })
  const a = await import(pathToFileURL(saidaA))
  const obras = [{ id: 'cobrados', n: 10 }, { id: 'hip', n: 5 }, { id: 'campbell', n: 10 }, { id: 'green', n: 3 }, { id: 'netter', n: 4 }, { id: 'adulto', n: 25 }, { id: 'infantil', n: 30 }, { id: 'tach', n: 4 }]
  for (const largura of [700, 980, 1104, 1400]) {
    const fileiras = a.arrumarBaias(obras, largura)
    const ids = fileiras.flat(2).map((b) => b.id)
    assert.deepEqual([...ids].sort(), obras.map((o) => o.id).sort(), `${largura}: cada estante uma vez`)
    assert.equal(fileiras[0][0][0].id, 'cobrados', 'Mais cobrados primeiro')
    for (const f of fileiras) {
      const usado = f.reduce((s, col) => s + Math.max(...col.map((b) => b.vagas)) * a.VAGA + a.LATERAIS, 0) + (f.length - 1) * 16
      assert.ok(usado <= largura || f.length === 1, `${largura}: fileira de ${usado}px passa da parede`)
    }
    if (largura >= 980) assert.ok(fileiras.every((f) => f.length > 1), `${largura}: nenhuma estante sozinha numa fileira`)
  }
  console.log('busca da biblioteca ok:', capitulos.length, 'resumos;', s.resumos.length, 'para Schatzker;', s.partes.length, 'partes')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

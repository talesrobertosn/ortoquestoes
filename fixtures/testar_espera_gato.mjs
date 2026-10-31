// O Gato Aventureiro (31/10/2026): sorteio das cenas da espera, sem repetir, sem comemorar à toa, com pontes de pose.
// A lógica está em src/componentes/espera/cenas.ts; a arte, em scripts/gerar_gato_cenas.py.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'ortoquestoes-gato-'))
try {
  const saida = join(pasta, 'cenas.mjs')
  await build({ entryPoints: ['src/componentes/espera/cenas.ts'], outfile: saida, bundle: true, platform: 'node', format: 'esm' })
  const m = await import(pathToFileURL(saida))
  // Toda linha usada existe na folha; as 12 cenas pedidas e os segredos estão lá.
  for (const c of m.CENAS) for (const t of c.trechos) assert.ok(m.LINHAS_CENAS.includes(t.linha), `${c.id}: linha ${t.linha} fora da folha`)
  for (const id of ['dormindo', 'espreguicando', 'novelo', 'estudioso', 'banho', 'luz', 'pergaminho', 'livro', 'borboleta', 'cochilo', 'comemorando', 'caminhando']) assert.ok(m.CENAS.some((c) => c.id === id), `falta a cena ${id}`)
  for (const c of m.CENAS) { assert.ok(c.frases.length > 0, `${c.id}: sem frase`); for (const f of c.frases) assert.ok(!/quase pronto|carregando dados|conectando/i.test(f), `${c.id}: frase com status falso`) }
  // Sorteio: nunca comemora numa espera comum, não repete as duas últimas, as raras são raras.
  let semente = 7
  const aleatorio = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648)
  const vistas = []
  const conta = {}
  for (let i = 0; i < 4000; i++) {
    const c = m.escolherCena(vistas, aleatorio)
    assert.notEqual(c.id, 'comemorando', 'comemorar só com algo concluído')
    assert.ok(!vistas.slice(-2).includes(c.id), `repetiu ${c.id}`)
    vistas.push(c.id); conta[c.id] = (conta[c.id] ?? 0) + 1
  }
  const raras = m.CENAS.filter((c) => c.rara).reduce((s, c) => s + (conta[c.id] ?? 0), 0)
  assert.ok(raras > 0 && raras / 4000 < 0.06, `segredos devem ser raros (${raras})`)
  assert.equal(m.escolherCena([], aleatorio, 'conclusao').id, 'comemorando')
  // Pontes: de deitado para sentado ou em pé, sempre com movimento de ligação.
  for (const de of ['sentado', 'deitado', 'em-pe']) for (const para of ['sentado', 'deitado', 'em-pe']) {
    const p = m.ponte(de, para)
    assert.equal(p.length === 0, de === para, `${de} → ${para}`)
  }
  await access('public/pixel/mascote/gato-cenas.png').catch(() => { throw new Error('falta a folha das cenas (scripts/gerar_gato_cenas.py)') })
  console.log(`gato da espera: ${m.CENAS.length} cenas, ${m.LINHAS_CENAS.length} linhas, ${raras} segredos em 4000 sorteios`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}

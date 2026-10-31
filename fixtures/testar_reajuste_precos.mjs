// Reajuste dos planos (31/10/2026): os mesmos valores no site, nas Edge Functions e no SQL.
// Preço novo para quem ainda não assina; o antigo continua aceito para quem já assinava.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-reajuste-'))
try {
  const saida = join(pasta, 'planos.mjs')
  await build({ entryPoints: ['src/dados/planos.ts'], outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const { PLANOS, PLANOS_PRECO_ANTIGO } = await import(pathToFileURL(saida))
  const centavos = (lista) => Object.fromEntries(lista.map((p) => [p.id, Math.round(p.total * 100)]))
  const novos = centavos(PLANOS), antigos = centavos(PLANOS_PRECO_ANTIGO)
  assert.deepEqual(novos, { mensal: 3990, semestral: 20940, anual: 35880 })
  assert.deepEqual(antigos, { mensal: 3990, semestral: 17990, anual: 23990 })

  const precos = await readFile('supabase/functions/_shared/precos.ts', 'utf8')
  for (const [plano, valor] of Object.entries(novos)) assert.match(precos, new RegExp(`${plano}: \\{ meses: \\d+, centavos: ${valor} \\}`), `precos.ts: ${plano} novo`)
  for (const [plano, valor] of Object.entries(antigos)) assert.match(precos, new RegExp(`${plano}: ${valor}\\b`), `precos.ts: ${plano} antigo`)

  const sql = await readFile('supabase/migrations/202611070000_reajuste_escada.sql', 'utf8')
  assert.ok(sql.includes(`valor_centavos = ${novos.mensal}`))
  for (const plano of ['semestral', 'anual']) assert.ok(sql.includes(`valor_centavos in (${antigos[plano]}, ${novos[plano]})`), `SQL: ${plano}`)
  const colar = await readFile('supabase/colar-no-painel/sql-202611070000-parte36-reajuste-escada.sql', 'utf8')
  assert.ok(colar.includes(sql), 'A cópia para o painel difere da migração')

  // Nenhuma função cobra um valor escrito à mão: todas passam por precos.ts.
  for (const f of ['criar-checkout', 'criar-pix', 'webhook-mercado-pago']) {
    const fonte = await readFile(`supabase/functions/${f}/index.ts`, 'utf8')
    assert.ok(!/179\.9|239\.9|17990|23990|209\.4|358\.8/.test(fonte), `${f} com valor escrito à mão`)
    assert.ok(fonte.includes("'../_shared/precos.ts'"), `${f} sem precos.ts`)
  }
  console.log('Reajuste dos planos: site, funções e SQL com os mesmos valores, novos e antigos')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

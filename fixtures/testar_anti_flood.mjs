// Cartas em lote (05/11/2026): quem recebeu e-mail nos últimos dias fica de fora; os avisos do Pix não contam.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-flood-'))
const arquivo = join(pasta, 'f.mjs')
try {
  await build({ stdin: { contents: `export * from './src/admin/dados/antiFlood'`, resolveDir: process.cwd(), loader: 'ts' }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const agora = Date.parse('2026-11-20T12:00:00Z'), dia = 86_400_000
  const em = d => new Date(agora - d * dia).toISOString()
  assert.equal(m.diasDesdeUltimo([], agora), null)
  assert.equal(Math.round(m.diasDesdeUltimo([{ tipo: 'carta', modelo: 'sumiu', em: em(1), status: 'enviado' }], agora)), 1)
  // Pix e recibos não contam.
  for (const e of [{ tipo: 'lembrete', modelo: 'renovacao_pix', em: em(0.5) }, { tipo: 'carta', modelo: 'pix_hoje', em: em(0.5) }, { tipo: 'pagamento_aprovado', em: em(0.5) }, { tipo: 'relato_resolvido', em: em(0.5) }])
    assert.equal(m.diasDesdeUltimo([e], agora), null, JSON.stringify(e))
  // Falha não conta; vale o mais recente que conta.
  assert.equal(m.diasDesdeUltimo([{ tipo: 'carta', modelo: 'ativo', em: em(0.2), status: 'falhou' }], agora), null)
  assert.equal(Math.round(m.diasDesdeUltimo([{ tipo: 'carta', em: em(10) }, { tipo: 'lembrete', modelo: 'tres_dias', em: em(2) }, { tipo: 'carta', modelo: 'pix_3_dias', em: em(0.1) }], agora)), 2)
  console.log('Anti-flood das cartas em lote: dias desde o último e-mail, Pix e pagamento fora da conta ok.')
} finally { await rm(pasta, { recursive: true, force: true }) }

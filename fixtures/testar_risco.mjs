// Detector de risco de abandono (05/11/2026): pontuação transparente, níveis e ação sugerida.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-risco-'))
const arquivo = join(pasta, 'r.mjs')
try {
  await build({ stdin: { contents: `export * from './src/admin/dados/risco'`, resolveDir: process.cwd(), loader: 'ts' }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const agora = Date.parse('2026-11-20T12:00:00Z'), dia = 86_400_000
  const iso = (d) => new Date(agora - d * dia).toISOString()
  // Estudando todo dia, sem vencimento: baixo.
  assert.equal(m.avaliarRisco({ ultimaAtividade: iso(0), criadoEm: iso(60), respondidas: 600, respondidas7d: 80 }, m.PESOS_PADRAO, agora).nivel, 'baixo')
  // 10 dias parado, sem nada na semana: 3 + 1 = 4 → moderado.
  const r1 = m.avaliarRisco({ ultimaAtividade: iso(10), criadoEm: iso(60), respondidas: 100, respondidas7d: 0 }, m.PESOS_PADRAO, agora)
  assert.equal(r1.pontos, 4); assert.equal(r1.nivel, 'moderado'); assert.match(r1.acao, /retomada/)
  // Parado 15 dias, queda forte e vencendo em 2 dias sem renovar: alto.
  const r2 = m.avaliarRisco({ ultimaAtividade: iso(15), criadoEm: iso(70), respondidas: 900, respondidas7d: 0, fimSemRenovar: new Date(agora + 2 * dia).toISOString() }, m.PESOS_PADRAO, agora)
  assert.equal(r2.nivel, 'alto'); assert.ok(r2.motivos.some(x => x.includes('termina em 2 dias'))); assert.match(r2.acao, /vencimento/)
  // Queda: estudava ~100 por semana, agora 20 (20%) → +2.
  const r3 = m.avaliarRisco({ ultimaAtividade: iso(1), criadoEm: iso(56), respondidas: 720, respondidas7d: 20 }, m.PESOS_PADRAO, agora)
  assert.equal(r3.pontos, 2); assert.ok(r3.motivos[0].includes('20%'))
  // Pesos configuráveis.
  const pesos = { ...m.PESOS_PADRAO, alto: 4 }
  assert.equal(m.avaliarRisco({ ultimaAtividade: iso(10), criadoEm: iso(60), respondidas: 100, respondidas7d: 0 }, pesos, agora).nivel, 'alto')
  console.log('Risco de abandono: níveis, motivos, ações sugeridas e pesos configuráveis ok.')
} finally { await rm(pasta, { recursive: true, force: true }) }

// Testa as métricas dos emblemas difíceis (pseudartrose, imagem, certeza, provas, assuntos,
// hora de ouro e as secretas novas). Uso: node fixtures/testar_conquistas.mjs
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'ortoquestoes-conquistas-'))
try {
  const arquivo = join(pasta, 'conquistas.mjs')
  await build({ stdin: { contents: `export * from './src/estado/conquistas';`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' } })
  const m = await import(pathToFileURL(arquivo))
  const MIN = 60 * 1000
  const base = new Date(2026, 9, 5, 10, 0).getTime() // segunda-feira, 10h
  const certo = (em, confianca = 'seguro') => ({ em, correta: true, confianca })
  const errado = (em, confianca = 'seguro') => ({ em, correta: false, confianca })
  const reg = (historico, extra = {}) => ({ c: historico.at(-1).correta, q: historico.at(-1).em, historico, ...extra })

  // Hora de ouro e certeza: 35 acertos com certeza em 35 minutos, um chute certo no meio não soma nem zera.
  const r = {}
  for (let i = 0; i < 35; i++) r[`trauma-${i}`] = reg([certo(base + i * MIN)])
  r['trauma-900'] = reg([certo(base + 10 * MIN + 1, 'chute')])
  let met = m.calcularMetricas(r, [], {})
  assert.equal(met.horaDeOuro, 36)
  assert.equal(met.certeza, 35)
  // Um erro com dúvida zera a certeza.
  r['trauma-901'] = reg([errado(base + 20 * MIN + 1, 'duvida')])
  met = m.calcularMetricas(r, [], {})
  assert.equal(met.certeza, 21) // 0 a 20 antes do erro; 21 a 34 depois (14)
  // Fora da janela de uma hora não soma.
  r['trauma-902'] = reg([certo(base + 3 * 60 * MIN)])
  assert.equal(m.calcularMetricas(r, [], {}).horaDeOuro, 36)

  // Chute de mestre: 5 chutes certos seguidos (respostas com certeza no meio não interrompem).
  const c = {}
  for (let i = 0; i < 5; i++) c[`joelho-${i}`] = reg([certo(base + i * MIN, 'chute')])
  c['joelho-50'] = reg([certo(base + 2 * MIN + 1)])
  assert.equal(m.calcularMetricas(c, [], {}).chuteMestre, 5)

  // Pseudartrose: errada 3 vezes e hoje dominada.
  const dominadaRegistro = { c: true, q: base, erros: 3, sequencia: 99, confianca: 'seguro' }
  assert.equal(m.calcularMetricas({ 'mao-1': dominadaRegistro, 'mao-2': { ...dominadaRegistro, erros: 2 } }, [], {}).pseudartrose, 1)

  // Imagem, assuntos e provas vencidas a partir dos dados do acervo.
  const respostas = {}
  const prova = new Map(), subtemas = new Map()
  for (let i = 0; i < 10; i++) {
    const id = `quadril-${i}`
    respostas[id] = reg([i < 7 ? certo(base + i * MIN) : errado(base + i * MIN)])
    prova.set(id, 'TEOT 2024')
    subtemas.set(id, [i < 5 ? 1 : 2])
  }
  const acervo = { imagem: new Set(['quadril-0', 'quadril-9']), subtemas, prova, totalProva: new Map([['TEOT 2024', 10], ['TARO 2010', 3]]) }
  met = m.calcularMetricas(respostas, [], { acervo })
  assert.equal(met.imagem, 1)
  assert.equal(met.assuntos, 1) // assunto 1: 5/5; assunto 2: 2/5
  assert.equal(met.provasVencidas, 1) // 10 de 10 respondidas, 7 certas (70%)
  delete respostas['quadril-9']
  assert.equal(m.calcularMetricas(respostas, [], { acervo }).provasVencidas, 0)

  // Tríade terrível e véspera pelas sessões concluídas.
  const dia = new Date(2026, 9, 7, 9).getTime()
  const perfeita = (h) => ({ respondidas: 20, acertos: 20, concluidaEm: dia + h * 60 * MIN })
  assert.equal(m.calcularMetricas({}, [perfeita(0), perfeita(1), perfeita(2), { respondidas: 19, acertos: 19, concluidaEm: dia }], {}).triade, 3)
  const vespera = new Date(2027, 0, 9, 20).getTime()
  assert.equal(m.calcularMetricas({}, [{ respondidas: 100, acertos: 70, concluidaEm: vespera }], {}).vespera, 1)
  assert.equal(m.calcularMetricas({}, [{ respondidas: 100, acertos: 69, concluidaEm: vespera }], {}).vespera, 0)

  // Lei de Wolff: 6 semanas seguidas crescendo a partir de 50.
  const w = {}
  let k = 0
  const SEMANA = 7 * 24 * 60 * MIN
  for (let s = 0; s < 6; s++) for (let i = 0; i < 50 + s; i++) w[`coluna-${k++}`] = reg([certo(base + s * SEMANA + i * MIN)])
  assert.equal(m.calcularMetricas(w, [], {}).wolff, 6)

  // Todo emblema aponta para uma métrica que existe.
  const metricas = m.calcularMetricas({}, [], {})
  for (const e of m.EMBLEMAS) assert.ok(e.familia === 'mestre' || e.familia === 'especialista' || typeof metricas[e.metrica] === 'number', e.id)
  console.log('Emblemas difíceis: todos corretos.')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

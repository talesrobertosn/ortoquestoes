// Registro de aprendizagem dos flashcards (beta público, 13/10/2026): contagem única,
// deduplicação, agendamento, fuso do dia, estatísticas e cronograma (metas e avisos).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

process.env.TZ = 'America/Sao_Paulo'
// o armazenamento do site avisa as outras partes por eventos da janela; no Node basta um alvo vazio
globalThis.window = Object.assign(new EventTarget(), { localStorage: undefined, sessionStorage: undefined })
globalThis.CustomEvent ??= class extends Event { constructor(t, o) { super(t); this.detail = o?.detail } }
const pasta = await mkdtemp(join(tmpdir(), 'oq-apr-'))
const arquivo = join(pasta, 'a.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/flashcards/aprendizagem'; export * from './src/flashcards/progresso'; export { BARALHO_DEMO } from './src/flashcards/dados/baralhoDemo'; export { ler, gravar } from './src/estado/armazenamento'; export { revisarHoje } from './src/estado/revisao'`, resolveDir: process.cwd() },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const cartas = m.BARALHO_DEMO
  const [c1, c2, c3] = cartas
  const DIA = 86400000
  const t0 = new Date(2026, 9, 13, 10, 0).getTime()

  // Fuso: 23h30 de 13/10 em São Paulo ainda é dia 13 (em UTC já seria 14).
  assert.equal(m.chaveDoDia(new Date(2026, 9, 13, 23, 30).getTime()), '2026-10-13')
  assert.equal(m.chaveDoDia(new Date(2026, 9, 14, 0, 5).getTime()), '2026-10-14')

  // Deduplicação: a mesma chave (recarregar, clique duplo, reenvio) conta uma vez só.
  assert.ok(m.registrarEstudo({ chave: 's1:0:' + c1.id, id: c1.id, modo: 'estudo', objetiva: true, avaliacao: 'sabia', agora: t0 }))
  assert.equal(m.registrarEstudo({ chave: 's1:0:' + c1.id, id: c1.id, modo: 'estudo', objetiva: true, avaliacao: 'sabia', agora: t0 }), null)
  let d = m.ler('flashcards:diario', {})['2026-10-13']
  assert.equal(d.revisoes, 1); assert.equal(d.novos, 1); assert.equal(d.primeiras, 1); assert.equal(d.primeirasCertas, 1); assert.equal(d.sabia, 1)

  // Agendamento: Sabia = 10 dias, Hesitei = 3, Errei volta hoje.
  let r = m.ler('flashcards:registros', {})[c1.id]
  assert.equal(Math.round((r.proximaRevisao - t0) / DIA), 10)
  m.registrarEstudo({ chave: 's1:1:' + c2.id, id: c2.id, modo: 'estudo', objetiva: null, avaliacao: 'hesitei', agora: t0 })
  r = m.ler('flashcards:registros', {})[c2.id]
  assert.equal(Math.round((r.proximaRevisao - t0) / DIA), 3); assert.equal(r.confianca, 'duvida')
  m.registrarEstudo({ chave: 's1:2:' + c3.id, id: c3.id, modo: 'estudo', objetiva: false, avaliacao: 'errei', agora: t0 })
  assert.equal(m.revisarHoje(m.ler('flashcards:registros', {})[c3.id], t0), true)

  // Repetir o mesmo flashcard em outra sessão soma resposta, mas não flashcard único nem "primeira resposta".
  m.registrarEstudo({ chave: 's2:0:' + c1.id, id: c1.id, modo: 'cripta', objetiva: false, agora: t0 + 1000 })
  d = m.ler('flashcards:diario', {})['2026-10-13']
  assert.equal(d.revisoes, 4); assert.equal(d.novos, 3); assert.equal(d.primeiras, 2); assert.equal(d.cripta, 1)
  // Cripta: não presume confiança e não grava autoavaliação nova (fica a última do Estudo).
  r = m.ler('flashcards:registros', {})[c1.id]
  assert.equal(r.av, 'sabia'); assert.equal(r.c, false)

  // Estatísticas: únicos x respostas, período de 30 dias, sem inventar dias anteriores.
  const est = m.calcularEstatisticas(cartas, {}, 30, t0 + 2000)
  assert.equal(est.unicos, 3); assert.equal(est.revisoes, 4); assert.equal(est.periodo.porDia.length, 30)
  assert.equal(est.periodo.diasAtivos, 1); assert.equal(est.desde, '2026-10-13')
  assert.equal(est.pendentes, 2) // c3 (errei) e c1 (errou na Cripta)

  // Ideia 81: o baralho de demonstração usa só as áreas padrão do acervo (nada de "Trauma" ou "Anatomia" soltas em Meu desempenho).
  const { readFileSync } = await import('node:fs')
  const indice = JSON.parse(readFileSync('public/flashcards/indice.json', 'utf8'))
  for (const c of cartas) {
    assert.ok(indice.areas[c.areaId], `área fora do padrão no baralho de demonstração: ${c.id} (${c.areaId ?? c.area})`)
    assert.equal(c.area, indice.areas[c.areaId].nome, `nome da área de ${c.id}`)
  }
  const nomesIndice = Object.fromEntries(Object.entries(indice.areas).map(([id, a]) => [id, a.nome]))
  const areasDesempenho = m.calcularEstatisticas(cartas, nomesIndice, 30, t0 + 2000).porArea
  assert.ok(areasDesempenho.every((a) => indice.areas[a.area]), 'Meu desempenho com área fora do acervo')

  // Cronograma (sequência por incidência, 15/10/2026; detalhes em testar_cronograma_sequencia_flashcards.mjs):
  // sem plano usa o sugerido, revisões vencidas vêm antes e o plano termina quando tudo foi visto.
  const regs = m.ler('flashcards:registros', {})
  const sem = m.calcularCronograma(null, cartas, regs, t0)
  assert.equal(sem.revisoes.length, 2); assert.deepEqual(sem.sessaoHoje.slice(0, 2).sort(), sem.revisoes.slice().sort())
  assert.equal(sem.novosRestantes, cartas.length - 3)
  const soUma = cartas[0].areaId ?? cartas[0].area
  const daArea = cartas.filter((c) => (c.areaId ?? c.area) === soUma)
  for (const [i, c] of daArea.entries()) m.registrarEstudo({ chave: 'tudo:' + i, id: c.id, modo: 'estudo', objetiva: true, avaliacao: 'sabia', agora: t0 + 5000 })
  const fim = m.calcularCronograma({ areas: [soUma], diasSemana: [], ritmo: 20, criadoEm: t0 }, cartas, m.ler('flashcards:registros', {}), t0 + 6000)
  assert.equal(fim.novosRestantes, 0); assert.equal(fim.previsao, null)

  console.log('aprendizagem dos flashcards: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

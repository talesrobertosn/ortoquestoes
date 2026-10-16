import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'oq-eventos-'))
try {
  const arquivo = join(pasta, 'eventos.mjs')
  await build({ stdin: { contents: "export * from './src/eventos/regras'; export * from './src/eventos/memoria'; export * from './src/eventos/preferencias'", resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const hora = '2026-10-17T18:00:00Z' // sábado, 15 h em São Paulo
  const agora = Date.parse(hora)
  const c = { agora, iniciou: agora - 100_000, ultimo: 0, rota: '/questao/teste', ligado: true, visivel: true, modal: false, reduzido: false, vistos: {}, dataTeot: '2027-01-10' }
  const ids = ctx => m.candidatos(ctx).map(e => e.id)
  assert.ok(m.permitido(c), 'questão sem resposta precisa permitir evento')
  assert.ok(m.escolher(c, .04))
  assert.equal(m.escolher(c, .18), null, 'sorteio fora da chance não mostra visita')
  assert.equal(m.escolher(c, NaN), null)
  for (const sessao of [{ simulado: true }, { nacional: '2026-10' }, { limiteSegundos: 90 }, { simulado: true, origem: 'cronograma' }]) {
    assert.equal(m.permitido({ ...c, sessao }), false, 'bloqueio de simulado/teste/cronometrada')
    assert.equal(m.escolher({ ...c, sessao }, 0), null)
  }
  assert.ok(m.permitido({ ...c, sessao: { simulado: true, concluidaEm: agora - 100 } }), 'prova já encerrada não bloqueia o resto do site')
  for (const rota of ['/simulado-nacional', '/admin', '/conta', '/assinatura', '/flashcards/cripta', '/flashcards/entrada']) assert.equal(m.permitido({ ...c, rota }), false)
  for (const alteracao of [{ ligado: false }, { visivel: false }, { modal: true }]) assert.equal(m.escolher({ ...c, ...alteracao }, 0), null)
  assert.equal(m.escolher({ ...c, iniciou: agora - 89_999 }, 0), null)
  assert.equal(m.escolher({ ...c, ultimo: agora - m.INTERVALO_EVENTOS + 1 }, 0), null)
  assert.ok(m.escolher({ ...c, ultimo: agora - m.INTERVALO_EVENTOS }, 0))
  // Limite global (Tales, 16/10/2026): no máximo uma surpresa por hora neste navegador.
  assert.equal(m.INTERVALO_EVENTOS, 60 * 60_000)
  assert.equal(m.escolher({ ...c, ultimo: agora - 59 * 60_000 }, 0), null, '59 min depois ainda não')
  assert.ok(m.escolher({ ...c, ultimo: agora - 60 * 60_000 }, 0), 'uma hora depois pode')
  assert.equal(m.liberadoPeloRelogio(agora, 0), true)
  assert.equal(m.liberadoPeloRelogio(agora, agora - 30 * 60_000), false)
  assert.equal(m.liberadoPeloRelogio(agora, agora + 3 * 60 * 60_000), true, 'relógio que voltou não trava')
  assert.equal(m.escolher({ ...c, nascimento: '1980-10-17', ultimo: agora - 10 * 60_000 }, 0), null, 'nem datas especiais furam o limite')
  assert.ok(ids(c).includes('fim-semana'))
  assert.match(m.candidatos(c).find(e => e.id === 'fim-semana').titulo, /Sábado, 15h/)
  assert.ok(ids({ ...c, agora: Date.parse('2026-10-19T02:59:00Z') }).includes('fim-semana'), 'domingo ainda no Brasil')
  assert.ok(!ids({ ...c, agora: Date.parse('2026-10-19T03:00:00Z') }).includes('fim-semana'))
  assert.ok(ids({ ...c, agora: Date.parse('2026-10-17T02:00:00Z') }).includes('sexta'))
  assert.ok(!ids(c).includes('sexta'))
  for (const h of ['03:00', '05:30', '07:59']) assert.ok(ids({ ...c, agora: Date.parse(`2026-10-16T${h}:00Z`) }).includes('madrugada'))
  assert.ok(!ids({ ...c, agora: Date.parse('2026-10-16T08:00:00Z') }).includes('madrugada'), 'às 5h encerra')
  const madrugada = { ...c, agora: Date.parse('2026-10-16T06:00:00Z') }
  assert.ok(!ids({ ...madrugada, vistos: { '2026-10-16:madrugada': madrugada.agora - 17 * 60_000 } }).includes('madrugada'))
  assert.ok(ids({ ...madrugada, vistos: { '2026-10-16:madrugada': madrugada.agora - 18 * 60_000 } }).includes('madrugada'))
  assert.ok(ids({ ...c, nascimento: '1988-10-17' }).includes('aniversario'))
  assert.ok(!ids({ ...c, nascimento: '2026-10-17' }).includes('aniversario'))
  assert.ok(ids({ ...c, criadaEm: '2025-10-18T01:00:00Z' }).includes('aniversario-conta'), 'dia de criação usa São Paulo')
  assert.ok(!ids({ ...c, criadaEm: '2026-10-17T12:00:00Z' }).includes('aniversario-conta'))
  assert.ok(ids({ ...c, agora: Date.parse('2028-02-29T15:00:00Z'), nascimento: '1992-02-29' }).includes('aniversario'))
  assert.ok(!ids({ ...c, agora: Date.parse('2027-02-28T15:00:00Z'), nascimento: '1992-02-29' }).includes('aniversario'))
  const vespera = { ...c, agora: Date.parse('2027-01-09T23:00:00Z') }
  assert.equal(m.escolher(vespera, 0).id, 'vespera')
  assert.ok(!ids({ ...vespera, agora: Date.parse('2027-01-10T03:00:00Z') }).includes('vespera'))
  assert.ok(ids({ ...c, agora: Date.parse('2026-09-19T15:00:00Z') }).includes('ortopedista'))
  assert.ok(ids({ ...c, agora: Date.parse('2026-12-31T15:00:00Z') }).includes('ano-novo'))
  assert.equal(m.escolher({ ...c, nascimento: '1980-10-17' }, .1).id, 'aniversario', 'data pessoal tem prioridade')
  assert.ok(!ids({ ...c, vistos: { '2026-10-17:cafe': agora - 600_000 } }).includes('cafe'))
  assert.ok(ids({ ...c, vistos: { '2026-10-16:cafe': agora - 86_400_000 } }).includes('cafe'))
  const confete = { id: 'x', titulo: 'x', texto: 'x', icone: 'estrela', efeito: 'confete' }
  assert.equal(m.semMovimento(confete, true).efeito, undefined)
  assert.equal(m.semMovimento(confete, false).efeito, 'confete')
  assert.equal(confete.efeito, 'confete', 'sem mutação do evento')
  assert.deepEqual(m.marcosCruzados(999, 1000, []), [1000])
  assert.deepEqual(m.marcosCruzados(4999, 5000, [1000]), [5000])
  assert.deepEqual(m.marcosCruzados(9999, 10000, []), [10000])
  assert.deepEqual(m.marcosCruzados(999, 1000, [1000]), [])
  assert.deepEqual(m.marcosCruzados(1000, 1001, []), [])
  let pos = 0
  for (const tecla of m.CODIGO) pos = m.avancaCodigo(pos, tecla.toUpperCase() === 'B' ? 'B' : tecla)
  assert.equal(pos, m.CODIGO.length)
  assert.equal(m.avancaCodigo(5, 'x'), 0)
  const registros = { a: { q: agora, historico: [{ em: agora - 86_400_000 }, { em: agora }] }, b: { q: agora } }
  const copia = structuredClone(registros)
  assert.deepEqual(m.recordeDoDia(registros, agora), { hoje: 2, anterior: 1 })
  assert.deepEqual(registros, copia, 'histórico não muda')
  // Armazenamento independente: nenhum documento sincronizado ou servidor.
  const guardado = new Map()
  globalThis.localStorage = { getItem: k => guardado.get(k) ?? null, setItem: (k,v) => guardado.set(k,String(v)) }
  globalThis.window = { dispatchEvent: () => {} }
  assert.equal(m.eventosLigados(), true)
  m.definirEventos(false); assert.equal(m.eventosLigados(), false)
  m.definirEventos(true); assert.equal(m.eventosLigados(), true)
  const lembranca = { ...m.vazias(), selo: true, marcos: [1000], arquivo: true }
  m.guardarLembrancas('a', lembranca)
  assert.equal(m.lerLembrancas('a').selo, true)
  assert.equal(m.lerLembrancas('b').selo, false, 'contas separadas')
  assert.equal(m.ultimaAparicao(), 0)
  m.registrarAparicao(agora)
  assert.equal(m.ultimaAparicao(), agora, 'marca única do navegador')
  assert.equal(guardado.get('oq:eventos:ultima-aparicao:v1'), String(agora))
  assert.ok([...guardado.keys()].every(k => k.startsWith('oq:eventos:')))
  globalThis.localStorage = { getItem: () => { throw Error('bloqueado') }, setItem: () => { throw Error('bloqueado') } }
  m.definirEventos(false); assert.equal(m.eventosLigados(), false)
  m.guardarLembrancas('sem-disco', lembranca); assert.equal(m.lerLembrancas('sem-disco').selo, true)
  m.registrarAparicao(agora + 5); assert.equal(m.ultimaAparicao(), agora + 5, 'sem disco, o limite vale na memória da aba')
  const app = await readFile('src/App.tsx', 'utf8')
  assert.match(app, /lazy\(\(\) => import\('\.\/eventos\/Encontros'\)\)/)
  console.log('Eventos: relógio BR, aniversários, véspera, limite de uma por hora, sorteio, provas bloqueadas, questão aberta permitida, movimento reduzido, código, marcos e memória local: OK')
} finally { await rm(pasta, { recursive: true, force: true }) }

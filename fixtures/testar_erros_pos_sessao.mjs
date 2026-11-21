import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'

const { outputFiles } = await build({
  stdin: {
    contents: "export * from './src/dados/errosPosSessao'\nexport * from './src/dados/planoEstudo'\nexport * from './src/estado/revisao'\nexport { calcularPlanoMao, configInicial } from './src/dados/cronogramaMao'\nexport { focoPorQuestao } from './src/dados/incidencia'",
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
})
const m = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'))
const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
const agora = Date.parse('2026-11-21T13:00:00-03:00')
const ontem = Date.parse('2026-11-20T15:00:00-03:00')
const hoje = Date.parse('2026-11-21T00:15:00-03:00')
const [visivel, acertada, mesmaSessao, hojeErrada] = indice.questoes.filter((q) => !q.dup && q.an !== 1)
const anteriores = m.errosAnteriores(indice, {
  [visivel.id]: { c: false, q: ontem },
  [acertada.id]: { c: true, q: ontem },
  [mesmaSessao.id]: { c: false, q: ontem },
  [hojeErrada.id]: { c: false, q: hoje },
}, new Set([mesmaSessao.id]), agora)
assert.deepEqual(anteriores.map((e) => e.id), [visivel.id])
assert.deepEqual(m.tamanhosRevisao(40).map((o) => o.quantidade), [4, 10, 20])
assert.deepEqual(m.tamanhosRevisao(300).map((o) => o.quantidade), [5, 12, 25])
assert.deepEqual(m.tamanhosRevisao(1).map((o) => o.quantidade), [1, 1, 1])
assert.deepEqual(m.tamanhosRevisao(0).map((o) => o.quantidade), [0, 0, 0])
const candidatos = [
  { id: 'a', area: 'mao', assunto: 'tendões', dia: '2026-11-19', peso: 2 },
  { id: 'b', area: 'mao', assunto: 'tendões', dia: '2026-11-17', peso: 2 },
  { id: 'c', area: 'joelho', assunto: 'artroplastia', dia: '2026-11-18', peso: 2 },
]
assert.deepEqual(m.sortearErrosAnteriores(candidatos, 3, () => 0), ['a', 'c', 'b'])
assert.deepEqual(m.sortearErrosAnteriores(candidatos, 2, () => 0.99), ['c', 'b'])
assert.equal(new Set(m.sortearErrosAnteriores([...candidatos, candidatos[0]], 10)).size, 3)

const plano = { data_prova: '2027-01-20', intensidade: 'firme', folgas: [0], prova: 'TARO', base_respondidas: 0, criado_em: '2026-11-04T13:00:00Z', opcoes: { soTeot: true } }
const novo = { ...plano, opcoes: { ...plano.opcoes, acervo: { em: '2026-11-23', anterior: { oficiais: 'TEOT', simulados: true }, novo: { oficiais: 'TARO', simulados: false } } } }
assert.equal(m.incluiSimulados(plano, agora), true)
assert.deepEqual(m.calcularPlano(indice, {}, novo, agora), m.calcularPlano(indice, {}, plano, agora))
const depois = Date.parse('2026-11-23T13:00:00-03:00')
assert.equal(m.incluiSimulados(novo, depois), false)
const taro = m.indiceDoPlano(indice, novo, depois)
assert.ok(taro.questoes.some((q) => indice.provas[q.p] === 'TARO'))
assert.ok(taro.questoes.every((q) => q.sim === 1 || indice.provas[q.p] === 'TARO'))
assert.ok(taro.questoes.filter((q) => m.entraNoPlano(q, m.incluiSimulados(novo, depois))).every((q) => q.sim !== 1))

const focos = m.focoPorQuestao(indice)
const recorteTeot = m.indiceDoPlano(indice, plano, agora)
const erroFrequente = recorteTeot.questoes.find((q) => m.entraNoPlano(q, true) && (focos.get(q.id)?.nivel ?? 0) >= 3)
assert.ok(erroFrequente)
const anteontem = ontem - 864e5
const respondeu = { [erroFrequente.id]: m.proximoRegistro(undefined, false, anteontem) }
const planoMesclado = { ...plano, opcoes: { ...plano.opcoes, revisoesNaMeta: { em: '2026-11-21', anterior: false, novo: true } } }
const semMistura = m.calcularPlano(indice, respondeu, plano, agora)
const misturado = m.calcularPlano(indice, respondeu, planoMesclado, agora)
assert.equal(misturado.revisoesHoje?.length, 1)
assert.equal(misturado.metaDiaria + 1, semMistura.metaDiaria)
assert.equal(misturado.feitasHoje, 0)
respondeu[erroFrequente.id] = m.proximoRegistro(respondeu[erroFrequente.id], true, hoje)
const revisado = m.calcularPlano(indice, respondeu, planoMesclado, agora)
assert.equal(revisado.revisoesHoje?.[0].feita, true)
assert.equal(revisado.feitasHoje, 0)
assert.equal(revisado.extraHoje, 0)

const agendaOriginal = m.calcularPlano(indice, {}, plano, agora)
const domingo = '2026-11-22'
const agendaExtra = m.calcularPlano(indice, {}, { ...plano, opcoes: { ...plano.opcoes, diasExtras: [domingo], metaPreservada: { em: '2026-11-21', n: agendaOriginal.metaHojeSemAdiantar } } }, agora)
assert.equal(agendaExtra.metaDiaria, agendaOriginal.metaDiaria)
assert.equal(agendaExtra.diasEstudoRestantes, agendaOriginal.diasEstudoRestantes + 1)
assert.ok(agendaExtra.dias[1].total > 0)
assert.equal(agendaOriginal.dias[1].total, 0)

const mao = m.configInicial('ingresso', agora)
const maoOriginal = m.calcularPlanoMao(indice, {}, mao, agora)
const maoExtra = m.calcularPlanoMao(indice, {}, { ...mao, diasExtras: [domingo], metaPreservada: { em: '2026-11-21', n: maoOriginal.metaHoje } }, agora)
assert.equal(maoExtra.metaHoje, maoOriginal.metaHoje)
assert.equal(maoExtra.diasDeEstudo, maoOriginal.diasDeEstudo + 1)
assert.notEqual(maoExtra.agenda[1].tipo, 'folga')

let registro = m.proximoRegistro(undefined, false, ontem)
for (let i = 1; i < 12; i++) registro = m.proximoRegistro(registro, true, ontem + i * 100)
assert.equal(registro.primeiraEm, ontem)
assert.equal(registro.historico.length, 8)
assert.deepEqual([0, 10, 40, 100].map(m.cotaRevisoesDaMeta), [0, 1, 4, 5])
console.log('Revisão após a sessão, mistura, recorte agendado, compatibilidade e primeira resposta: OK')

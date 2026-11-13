// Página de Desempenho (14/11/2026): definições de primeira vez, retenção, margem, nota estimada, turma, resumos e calendário.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-desempenho-'))
try {
  const saida = join(pasta, 'd.mjs')
  await build({ entryPoints: ['src/dados/desempenho.ts'], outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error', loader: { '.json': 'json' } })
  const d = await import(pathToFileURL(saida))
  const DIA = 86_400_000, agora = Date.parse('2026-11-14T12:00:00')
  const t = (dias, correta, confianca = 'seguro') => ({ em: agora - dias * DIA, correta, confianca })

  // Retenção
  assert.equal(d.estadoRetencao({ c: true, q: 1, historico: [t(3, true)] }), 'nunca_errou')
  assert.equal(d.estadoRetencao({ c: false, q: 1, historico: [t(3, false)] }), 'erro_novo')
  assert.equal(d.estadoRetencao({ c: true, q: 1, historico: [t(3, false), t(1, true)] }), 'recuperada')
  assert.equal(d.estadoRetencao({ c: true, q: 1, historico: [t(20, false), t(19, true), t(5, true)] }), 'consolidada')
  assert.equal(d.estadoRetencao({ c: false, q: 1, historico: [t(20, false), t(10, true), t(2, false)] }), 'reincidente')
  assert.deepEqual(d.errosComCerteza({ a: { c: false, q: 1, historico: [t(1, false, 'seguro')] }, b: { c: false, q: 1, historico: [t(1, false, 'chute')] } }), ['a'])

  // Margem: 7 de 10 tem faixa larga; 70 de 100 bem mais estreita.
  const [l1, h1] = d.intervalo(7, 10), [l2, h2] = d.intervalo(70, 100)
  assert.ok(h1 - l1 > 0.45 && h2 - l2 < 0.2, 'faixa encolhe com mais respostas')

  // Índice mínimo com dois temas que existem na incidência.
  const indice = { temas: [{ slug: 'trauma', nome: 'Trauma' }, { slug: 'mao', nome: 'Mão e punho' }], subtemas: ['Escafoide', 'Rádio distal'], provas: [], anos: [], total: 0, versao: 1, geradoEm: null,
    questoes: Array.from({ length: 80 }, (_, i) => ({ id: `q${i}`, t: i < 40 ? 0 : 1, s: [i < 40 ? 1 : 0], p: null, a: null, d: null, img: 0, an: 0, c: 1, cia: 0, cc: 0 })) }
  const resp = {}
  for (let i = 0; i < 80; i++) resp[`q${i}`] = { c: i % 2 === 0, q: 1, tentativas: 1, historico: [t(i % 40, i % 2 === 0)] }
  resp.q1 = { c: true, q: 1, tentativas: 2, historico: [t(30, false), t(2, true)] }
  const ev = d.eventosDe(resp, indice)
  assert.equal(ev.filter((e) => e.primeira).length, 80)
  assert.equal(ev.filter((e) => !e.primeira).length, 1, 'a segunda tentativa é revisão')
  assert.equal(d.eventosDe({ x: { c: true, q: 1, tentativas: 12, historico: [t(5, true)] } }, indice)[0].primeira, false, 'histórico cortado: não sabe a primeira')

  // Nota estimada: acerto de primeira 50% em tudo → perto de 50, com faixa.
  const nota = d.notaEstimada(ev)
  assert.ok(nota && nota.nota >= 45 && nota.nota <= 55 && nota.baixa < nota.nota && nota.alta > nota.nota, JSON.stringify(nota && [nota.nota, nota.baixa, nota.alta]))
  assert.equal(d.notaEstimada(ev.slice(0, 10)), null, 'poucas respostas: sem nota')
  assert.ok(nota.areas[0].ganho >= nota.areas[nota.areas.length - 1].ganho, 'temas ordenados pelo quanto sobem a nota')

  // Evolução: novas e revisões separadas.
  const sem = d.serieEvolucao(ev, 'semana', 8, agora)
  assert.equal(sem.reduce((n, b) => n + b.novas.n, 0), 80)
  assert.equal(sem.reduce((n, b) => n + b.revisoes.n, 0), 1)

  // Turma: você 50%, turma 40% → +10.
  const turma = new Map(Object.keys(resp).map((id) => [id, { acerto: 40 }]))
  const comp = d.compararTurma(ev, turma)
  assert.equal(comp.diferenca, 10)

  // Assuntos e prioridades.
  const { temas, assuntos } = d.linhasAssuntos(indice, resp, ev, agora)
  assert.equal(temas.length, 2); assert.ok(assuntos.length >= 2)
  assert.ok(temas.every((l) => l.noAcervo === 40 && l.respondidas === 40))

  // Resumos: o que cita mais questões erradas vem primeiro.
  const erradas = d.errosPendentes(resp)
  const caps = [
    { id: 'a', titulo: 'A', livro: 'L', especialidade: 'mao', minutos: 10, acesso: 'gratis', questoes: erradas.slice(0, 3), treino: [], subtemas: [] },
    { id: 'b', titulo: 'B', livro: 'L', especialidade: 'mao', minutos: 10, acesso: 'gratis', questoes: [], treino: [], subtemas: ['escafoide'] },
    { id: 'c', titulo: 'C', livro: 'L', especialidade: 'x', minutos: 10, acesso: 'gratis', questoes: [], treino: [], subtemas: ['nada'] },
  ]
  const ind = d.indicarResumos(caps, erradas, indice)
  assert.deepEqual(ind.map((r) => r.capitulo.id).sort(), ['a', 'b'], 'o resumo sem relação com os erros fica de fora')

  // Calendário: 364 dias e quartis.
  const cal = d.calendario(ev, 364, agora)
  assert.equal(cal.length, 364)
  assert.equal(cal.reduce((n, x) => n + x.n, 0), ev.length)
  const nivel = d.niveisCalendario(cal)
  assert.equal(nivel(0), 0); assert.ok(nivel(1000) === 4)
  // Desempenho de exemplo (14/11/2026): a residente fictícia tem notas boas e é sempre a mesma.
  const saidaEx = join(pasta, 'ex.mjs')
  await build({ entryPoints: ['src/dados/exemploDesempenho.ts'], outfile: saidaEx, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const ex = await import(pathToFileURL(saidaEx))
  const acervo = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
  const marina = ex.gerarExemplo(acervo)
  const evM = d.eventosDe(marina.respondidas, acervo)
  const notaM = d.notaEstimada(evM)
  assert.ok(notaM && notaM.nota >= 74 && notaM.nota <= 88, `nota do exemplo fora do esperado: ${notaM?.nota}`)
  assert.ok(Object.keys(marina.respondidas).length > 1500, 'o exemplo tem meses de estudo')
  const ret = d.contarRetencao(marina.respondidas).conta
  assert.ok(ret.consolidada > ret.erro_novo, 'o exemplo consolida mais do que acumula erro')
  assert.ok(d.errosComCerteza(marina.respondidas).length > 0, 'o exemplo mostra o alarme de erro com certeza')
  assert.equal(Object.keys(ex.gerarExemplo(JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))).respondidas).length, Object.keys(marina.respondidas).length, 'sempre o mesmo')
  console.log('desempenho: retenção, margem, primeira vez, nota estimada, evolução, turma, assuntos, resumos e calendário conferidos; exemplo com nota ' + notaM.nota)
} finally {
  await rm(pasta, { recursive: true, force: true })
}

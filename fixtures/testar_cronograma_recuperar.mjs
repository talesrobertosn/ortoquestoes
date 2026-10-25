// Fazer um dia que passou (pedido do Tales, 25/10/2026): "quando se perde um dia e passa, dar a opção de
// voltar no calendário e poder fazer o dia que perdeu". E o relato do mesmo dia: "cliquei para avançar
// um dia, não fiz nenhuma questão, hoje o dia contou como feito". Prova, com o acervo real:
// 1. puxar o dia seguinte e não fazer nada: no dia seguinte a meta continua inteira (nada conta como feito);
// 2. um dia de estudo que passou sem nada feito aparece para recuperar, com a meta que teve;
// 3. recuperar prende as próximas questões do plano a ele (a meta de hoje não sobe; pode até descer, porque
//    o que o dia deixou para trás sai dos próximos dias), e o plano não as usa;
// 4. fazê-las conta para o dia perdido: hoje não ganha "adiantadas" e o dia perdido fica feito (também na sequência);
// 5. o registro é pequeno: no máximo dois dias guardados, só dias que passaram, e se limpa sozinho.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ stdin: { contents: `export * from './src/dados/planoEstudo'; export * from './src/dados/hubCronograma'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))

  // Instantes em São Paulo (UTC−3), seja qual for o fuso da máquina.
  const sp = (dia, hora = 12) => { const [a, mes, d] = dia.split('-').map(Number); return Date.UTC(a, mes - 1, d, hora + 3) }
  const criado = new Date(sp('2026-10-06', 9)).toISOString()
  const plano = (opcoes = {}) => ({ data_prova: '2027-01-10', intensidade: 'firme', folgas: [0], prova: 'TEOT', base_respondidas: 0, criado_em: criado, incluir_simulados: true, opcoes })
  const responder = (ids, quando, base = {}) => { const r = { ...base }; ids.forEach((id, k) => { const em = quando + k * 1000; r[id] = { c: true, q: em, historico: [{ em, correta: true }] } }); return r }
  const chave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const idsDe = (d) => d.itens.flatMap((i) => i.ids)
  const agendadas = (c) => c.dias.reduce((s, d) => s + d.total, 0)
  const ONTEM = '2026-10-19', HOJE = '2026-10-20', AMANHA = '2026-10-21'

  // ── 1. Puxar o dia seguinte e não fazer nenhuma questão ──
  const ontem = m.calcularPlano(indice, {}, plano(), sp(ONTEM, 9))
  const opPux = m.opcoesComPuxado(plano(), HOJE, m.idsParaPuxar(ontem, HOJE), ONTEM)
  assert.ok(opPux, 'puxou o dia seguinte')
  const semFazer = m.calcularPlano(indice, {}, plano(opPux), sp(HOJE, 10))
  assert.ok(semFazer.metaDiaria > 20, 'o dia puxado chega com meta')
  assert.equal(semFazer.feitasHoje, 0)
  assert.equal(semFazer.adiantadoHoje, 0, 'nada do dia puxado foi feito antes')
  assert.equal(semFazer.faltaHoje, semFazer.metaDiaria, 'o dia puxado sem nenhuma questão feita não conta como feito')

  // ── 2. Ontem passou sem nada: aparece para recuperar ──
  const base = m.calcularPlano(indice, {}, plano(), sp(HOJE, 10))
  const perdido = base.recuperaveis.find((r) => r.chave === ONTEM)
  assert.ok(perdido, 'o dia de ontem, sem nada feito, pode ser recuperado')
  assert.equal(perdido.feitas, 0)
  assert.ok(perdido.meta > 20 && perdido.falta === perdido.meta, 'com a meta que ele teve')
  assert.equal(perdido.recuperado, null)
  assert.ok(!base.recuperaveis.some((r) => r.data.getDay() === 0), 'folga não é dia perdido')
  assert.ok(!base.recuperaveis.some((r) => r.data < new Date(2026, 9, 6)), 'nem dia de antes do plano')

  // ── 3. Recuperar: as próximas questões do plano, sem as de hoje ──
  const ids = m.idsParaRecuperar(base, ONTEM)
  assert.equal(ids.length, perdido.falta, 'leva exatamente o que faltou no dia')
  const deHoje = new Set(idsDe(base.dias[0]))
  assert.ok(ids.every((id) => !deHoje.has(id)), 'nenhuma é de hoje')
  const op = m.opcoesComRecuperado(plano(), ONTEM, ids, HOJE)
  assert.deepEqual(op.recuperados, { [ONTEM]: ids })
  const c1 = m.calcularPlano(indice, {}, plano(op), sp(HOJE, 10))
  // O que o dia perdido deixou para trás estava espalhado pelos próximos dias (hoje incluído): recuperar tira isso deles.
  assert.ok(c1.metaDiaria <= base.metaDiaria && c1.metaDiaria >= base.metaDiaria - 3, `a meta de hoje não sobe (era ${base.metaDiaria}, ficou ${c1.metaDiaria})`)
  const noPlano = new Set(c1.dias.flatMap(idsDe))
  assert.ok(ids.every((id) => !noPlano.has(id)), 'o plano não espalha de novo as questões presas ao dia perdido')
  assert.ok(ids.every((id) => c1.reservados.includes(id)), 'e a sessão de hoje não as usa')
  assert.equal(agendadas(c1) + ids.length, c1.restante, 'o plano agenda o que falta, menos o que está preso ao dia perdido')
  assert.equal(c1.projecao.cortadas, 0)
  assert.deepEqual(m.idsParaRecuperar(c1, ONTEM), ids, 'recuperar de novo continua o mesmo dia')

  // ── 4. Fazer tudo hoje: conta para ontem ──
  const r2 = responder(ids, sp(HOJE, 11))
  const c2 = m.calcularPlano(indice, r2, plano(op), sp(HOJE, 12))
  assert.equal(c2.feitasHoje, 0, 'as questões do dia perdido não contam para hoje')
  assert.equal(c2.extraHoje, 0, 'nem viram "adiantadas" de hoje')
  assert.equal(c2.faltaHoje, c2.metaDiaria)
  assert.equal(c2.metaDiaria, c1.metaDiaria, 'fazer o dia perdido não muda a meta de hoje')
  const feito = c2.recuperaveis.find((r) => r.chave === ONTEM)
  assert.ok(feito && feito.falta === 0 && feito.feitas === feito.meta, 'o dia perdido fica feito')
  assert.equal(c2.restante, base.restante - ids.length, 'e o que faltava no plano diminui')
  const constancia = m.calcularConstancia(r2, plano(op), c2, new Date(sp(HOJE, 12)))
  const ontemNaSequencia = constancia.ultimos.find((u) => chave(u.dia) === ONTEM)
  assert.equal(ontemNaSequencia.estado, 'cumprido', 'na sequência, o dia perdido conta como cumprido')
  assert.equal(constancia.ultimos.find((u) => chave(u.dia) === HOJE).n, 0, 'e hoje continua sem respostas')

  // Metade feita: o dia aparece com o que falta, e recuperar continua com as que faltam.
  const r3 = responder(ids.slice(0, 10), sp(HOJE, 11))
  const c3 = m.calcularPlano(indice, r3, plano(op), sp(HOJE, 12))
  const meio = c3.recuperaveis.find((r) => r.chave === ONTEM)
  assert.equal(meio.feitas, 10)
  assert.equal(meio.falta, meio.meta - 10)
  assert.equal(meio.recuperado.livres.length, ids.length - 10)

  // ── 5. O registro ──
  assert.equal(m.opcoesComRecuperado(plano(), HOJE, ids, HOJE), null, 'hoje não é dia perdido')
  assert.equal(m.opcoesComRecuperado(plano(), AMANHA, ids, HOJE), null, 'nem amanhã')
  assert.equal(m.opcoesComRecuperado(plano(op), ONTEM, ids, HOJE), null, 'o mesmo dia não é preso duas vezes')
  const tres = m.opcoesComRecuperado(plano({ recuperados: { '2026-10-15': ['a'], '2026-10-16': ['b'], '2026-10-01': ['c'] } }), ONTEM, ids, HOJE)
  assert.deepEqual(Object.keys(tres.recuperados).sort(), ['2026-10-16', ONTEM], 'guarda no máximo os dois mais novos e descarta os velhos')
  // Depois de 10 dias, o registro deixa de valer e as questões voltam ao plano.
  const depois = m.calcularPlano(indice, {}, plano(op), sp('2026-10-31', 10))
  assert.ok(!depois.reservados.some((id) => ids.includes(id)), 'registro vencido não prende mais as questões')

  console.log(`recuperar dia perdido: ok (meta de ontem ${perdido.meta}, ${ids.length} questões presas, hoje ${base.metaDiaria})`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}

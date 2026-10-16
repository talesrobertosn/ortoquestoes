// Adiantar no cronograma (14/10/2026): o que a pessoa faz além da meta de hoje sai dos próximos dias,
// começando por amanhã; o que foi pedido e ainda não feito entra na sessão de hoje; e o plano continua
// agendando exatamente o que falta.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ stdin: { contents: `export * from './src/dados/planoEstudo'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
  const agora = new Date(2026, 9, 14, 9) // quarta, 14/10/2026
  const ontem = new Date(2026, 9, 13, 20)
  const criado = new Date(2026, 9, 6, 9)
  const plano = (opcoes = {}) => ({ data_prova: '2027-01-10', intensidade: 'firme', folgas: [0], prova: 'TEOT', base_respondidas: 0, criado_em: criado.toISOString(), incluir_simulados: true, opcoes })
  const responder = (ids, quando, base = {}) => { const r = { ...base }; ids.forEach((id, k) => { const em = quando.getTime() + k * 1000; r[id] = { c: true, q: em, historico: [{ em, correta: true }] } }); return r }
  const agendadas = (c) => c.dias.reduce((s, d) => s + d.total, 0)
  const conferirPlano = (c, rotulo) => {
    const ids = c.dias.flatMap((d) => d.itens.flatMap((i) => i.ids))
    assert.equal(new Set(ids).size, ids.length, `${rotulo}: questão repetida`)
    assert.equal(c.projecao.cortadas, 0, `${rotulo}: o plano cortou questões`)
  }

  // 1. Sem nada a mais: nada muda (sem adiantamento, sem extra).
  const base = m.calcularPlano(indice, {}, plano(), agora)
  assert.equal(base.adiantadoHoje, 0); assert.equal(base.extraHoje, 0); assert.equal(base.adiantarFalta, 0)
  assert.ok(base.dias.every((d) => d.adiantado === 0))
  assert.equal(base.metaDiaria, base.metaHojeSemAdiantar)

  // 2. Fez a mais hoje (sem pedir): o extra sai de amanhã, não se dilui pelo plano todo.
  const meta = base.metaDiaria
  const filaHoje = base.dias[0].itens.flatMap((i) => i.ids)
  const proximoDia = base.dias.slice(1).find((d) => d.meta > 0)
  const filaAmanha = proximoDia.itens.flatMap((i) => i.ids)
  const r2 = responder([...filaHoje, ...filaAmanha.slice(0, 20)], agora)
  const c2 = m.calcularPlano(indice, r2, plano(), agora)
  assert.equal(c2.metaDiaria, meta, 'a meta de hoje não deveria mudar')
  assert.equal(c2.extraHoje, 20)
  const amanha2 = c2.dias.find((d) => d.data.getTime() === proximoDia.data.getTime())
  assert.equal(amanha2.adiantado, 20, 'o extra de hoje deveria sair do próximo dia')
  assert.equal(amanha2.meta, proximoDia.meta - 20)
  assert.equal(agendadas(c2), c2.restante, 'o plano deveria agendar exatamente o que falta')
  conferirPlano(c2, 'extra de hoje')

  // 3. Pediu para adiantar 30 sem ter feito: entram na sessão de hoje e saem de amanhã.
  const c3 = m.calcularPlano(indice, {}, plano({ adiantados: [{ em: '2026-10-14', meta, pedido: 30 }] }), agora)
  assert.equal(c3.metaDiaria, meta, 'pedir para adiantar não muda a meta de hoje')
  assert.equal(c3.adiantarFalta, 30)
  assert.equal(c3.dias[0].total, meta + 30, 'a sessão de hoje deveria levar as adiantadas')
  assert.equal(c3.hoje.n, meta + 30)
  assert.equal(c3.dias.find((d) => d.data.getTime() === proximoDia.data.getTime()).meta, proximoDia.meta - 30)
  assert.equal(agendadas(c3), c3.restante)
  conferirPlano(c3, 'pedido')

  // 4. Pediu o dia inteiro de amanhã: amanhã fica livre (e é ele que aparece como "amanhã").
  const c4 = m.calcularPlano(indice, {}, plano({ adiantados: [{ em: '2026-10-14', meta, pedido: proximoDia.meta }] }), agora)
  const amanha4 = c4.dias.find((d) => d.data.getTime() === proximoDia.data.getTime())
  assert.equal(amanha4.total, 0); assert.equal(amanha4.adiantado, proximoDia.meta)
  assert.equal(c4.amanha.data.getTime(), proximoDia.data.getTime(), 'o dia livre deveria aparecer como amanhã')

  // 5. Adiantou ontem: hoje a meta já vem menor pelo que ontem passou da meta.
  const cOntem = m.calcularPlano(indice, {}, plano(), ontem)
  const metaOntem = cOntem.metaDiaria
  const filaOntem = cOntem.dias.slice(0, 3).flatMap((d) => d.itens.flatMap((i) => i.ids))
  const r5 = responder(filaOntem.slice(0, metaOntem + 25), ontem)
  const sem = m.calcularPlano(indice, r5, plano(), agora)
  const com = m.calcularPlano(indice, r5, plano({ adiantados: [{ em: '2026-10-13', meta: metaOntem }] }), agora)
  assert.equal(com.adiantadoHoje, 25, 'o que passou da meta ontem deveria sair de hoje')
  assert.equal(com.metaDiaria, com.metaHojeSemAdiantar - 25)
  // Sem o registro (a pessoa não abriu o cronograma depois de passar da meta), o motor refaz a
  // meta de ontem e chega ao mesmo resultado: o extra não se dilui pelo plano.
  assert.equal(sem.adiantadoHoje, 25, 'sem registro, o extra de ontem também deveria sair de hoje')
  assert.equal(sem.metaDiaria, com.metaDiaria)
  assert.equal(agendadas(com), com.restante)
  conferirPlano(com, 'adiantado ontem')

  // 6. Adiantou mais do que um dia: o resto passa para o dia seguinte.
  const r6 = responder(filaOntem.slice(0, Math.min(filaOntem.length, metaOntem + metaOntem + 10)), ontem)
  const c6 = m.calcularPlano(indice, r6, plano({ adiantados: [{ em: '2026-10-13', meta: metaOntem }] }), agora)
  assert.equal(c6.metaDiaria, 0, 'hoje deveria estar todo adiantado')
  assert.ok(c6.adiantadoHoje > 0)
  assert.ok(c6.dias[1].adiantado > 0 || c6.dias.slice(1).some((d) => d.adiantado > 0), 'o resto deveria ir para o próximo dia')
  assert.equal(agendadas(c6), c6.restante)

  // 7. Registro antigo demais ou na reta final não vale.
  const c7 = m.calcularPlano(indice, {}, plano({ adiantados: [{ em: '2026-08-01', meta: 10 }] }), agora)
  assert.equal(c7.adiantadoHoje, 0)
  const c7b = m.calcularPlano(indice, r5, plano({ adiantados: [{ em: '2026-08-01', meta: 10 }] }), agora)
  assert.equal(c7b.adiantadoHoje, sem.adiantadoHoje)

  console.log('Adiantar no cronograma: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

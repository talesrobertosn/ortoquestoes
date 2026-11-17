import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'oq-avisos-'))
try {
  const arquivo = join(pasta, 'motor.mjs')
  await build({ stdin: { contents: "export * from './src/estado/conquistas'; export * from './src/conquistas/catalogoAvisos'; export * from './src/conquistas/motorAvisos'; export * from './src/dados/imagensEmblemas'", resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const zero = m.calcularMetricas({}, [], {})
  const met = (x = {}) => ({ ...zero, ...x })
  const agora = Date.now(), ctx = { id: 'sessao:teste', cenarios: ['questoes', 'revisao', 'comunidade'] }
  const estado = () => m.estadoInicial()
  // A cobertura cresce junto com o catálogo. Nova família, arte ou id faltante quebra CI.
  assert.equal(new Set(m.EMBLEMAS.map(e => e.id)).size, m.EMBLEMAS.length)
  assert.deepEqual(Object.keys(m.PERFIS_AVISOS).sort(), m.FAMILIAS.map(f => f.id).sort())
  for (const e of m.EMBLEMAS) {
    assert.ok(e.rotulo && e.descricao && Number.isFinite(e.minimo) && e.minimo > 0, e.id)
    assert.ok(m.EMBLEMAS_COM_IMAGEM.has(e.id), `registrar arte de ${e.id} em EMBLEMAS_COM_IMAGEM`)
    const perfil = m.perfilDoEmblema(e), c = m.CENARIOS_AVISOS[perfil.cenario]
    assert.ok(c?.titulo && c.chamada && c.arte, `triagem ausente: ${e.id}`)
    const medalha = `public/emblemas/${e.id}.png`, expectativa = `public/conquistas/expectativa/${c.arte}.png`
    for (const p of [medalha, expectativa]) {
      const png = await readFile(p)
      assert.equal(png.subarray(1, 4).toString(), 'PNG', p)
      assert.ok((await stat(p)).size < 100_000, p)
    }
    assert.notEqual(medalha, expectativa, e.id)
    if (e.secreta) assert.equal(perfil.acompanhar, false, `${e.id}: não revelar segredo`)
  }
  // Primeira sincronização não despeja o histórico. Conquistas futuras entram automaticamente.
  let s = m.reconciliarAvisos(null, met({ questoes: 900 }))
  assert.deepEqual(s.pendentes, [])
  s = m.reconciliarAvisos(s, met({ questoes: 1000 }))
  assert.deepEqual(s.pendentes, ['questoes-1000'])
  assert.deepEqual(m.reconciliarAvisos(s, met({ questoes: 1000 })).pendentes, ['questoes-1000'])
  assert.equal(m.loteConquistado(s, met({ questoes: 1000 }))[0].rotulo, 'R3')
  const desligado = m.reconciliarAvisos({ ...s, silenciado: true }, met({ questoes: 2000 }))
  assert.deepEqual(desligado.pendentes, [], 'reativar depois de sair das Preferências não despeja a fila')
  assert.ok(desligado.conhecidas.includes('questoes-2000'))
  const confirmado = { ...s, pendentes: [] }
  assert.deepEqual(m.reconciliarAvisos(confirmado, met({ questoes: 1000 })).pendentes, [], 'recarregar não repete')
  assert.deepEqual(m.reconciliarAvisos(s, met({ questoes: 1000 }), 3).pendentes, [], 'reinício troca a geração')
  assert.equal(m.lerEstadoAvisos({}, 0), null)
  assert.equal(m.lerEstadoAvisos({ ...s, geracao: 4 }, 0), null)
  // Próximo marco pequeno e marco distante; a métrica precisa ter avançado nesta ação.
  let a = m.escolherMeta(met({ questoes: 46 }), met({ questoes: 47 }), estado(), ctx, agora, 1)
  assert.equal(a.emblema.id, 'questoes-50'); assert.equal(a.falta, 3); assert.equal(a.texto, '3 questões diferentes')
  a = m.escolherMeta(met({ questoes: 899 }), met({ questoes: 900 }), estado(), ctx, agora, 1)
  assert.equal(a.emblema.id, 'questoes-1000'); assert.equal(a.falta, 100); assert.ok(a.distante)
  assert.equal(m.escolherMeta(met({ questoes: 899 }), met({ questoes: 899 }), estado(), ctx, agora, 1), null)
  assert.equal(m.escolherMeta(met({ questoes: 798 }), met({ questoes: 799 }), estado(), ctx, agora, 1), null)
  assert.equal(m.escolherMeta(met({ questoes: 1000 }), met({ questoes: 1001 }), estado(), ctx, agora, 1), null)
  assert.equal(m.escolherMeta(met({ aproveitamento: 89, precisao: 24, certeza: 29 }), met({ aproveitamento: 90, precisao: 25, certeza: 30 }), estado(), ctx, agora, 1), null, 'porcentagem e recordes não prometem faltam N')
  assert.equal(m.escolherMeta(met({ questoes: 46 }), met({ questoes: 47 }), estado(), { id: 'leitor', cenarios: ['biblioteca'] }, agora, 1), null)
  const bib = m.escolherMeta(met({ bibMarcas: 8 }), met({ bibMarcas: 9 }), estado(), { id: 'biblioteca', cenarios: ['biblioteca'] }, agora, 1)
  assert.equal(bib.emblema.id, 'bib-marcas-10'); assert.equal(bib.texto, '1 marcação')
  const rev = m.escolherMeta(met({ revisoes: 247 }), met({ revisoes: 248 }), estado(), ctx, agora, 1)
  assert.equal(rev.emblema.id, 'revisoes-250'); assert.equal(rev.texto, '2 revisões')
  const pp = m.escolherMeta(met({ questoes: 46 }), met({ questoes: 47 }), estado(), ctx, agora, 1)
  assert.equal(m.atualizarMeta(pp, met({ questoes: 50 }), estado(), ctx, agora, 1), null, 'desbloqueio suplanta incentivo')
  assert.equal(m.atualizarMeta(pp, met({ questoes: 48 }), estado(), ctx, agora, 1).falta, 2)
  const recente = { ...estado(), metas: { contexto: ctx.id, ids: ['questoes-50'], em: agora, atividades: 1 } }
  assert.equal(m.escolherMeta(met({ revisoes: 247 }), met({ revisoes: 248 }), recente, ctx, agora + 60_000, 20), null, 'pausa')
  assert.equal(m.escolherMeta(met({ revisoes: 247 }), met({ revisoes: 248 }), recente, ctx, agora + m.PAUSA_METAS + 1, 4), null, 'dez ações entre avisos')
  assert.ok(m.escolherMeta(met({ revisoes: 247 }), met({ revisoes: 248 }), recente, ctx, agora + m.PAUSA_METAS + 1, 11))
  recente.metas.ids.push('revisoes-250')
  assert.equal(m.escolherMeta(met({ redencao: 47 }), met({ redencao: 48 }), recente, ctx, agora + m.PAUSA_METAS + 1, 21), null, 'teto de duas metas')
  for (const rota of ['/admin', '/conta', '/assinatura', '/simulado-nacional', '/flashcards/cripta', '/flashcards/biblioteca']) assert.equal(m.podeApresentar(rota, null, true, false), false, rota)
  assert.ok(m.podeApresentar('/sessao', {}, true, false))
  assert.equal(m.podeApresentar('/sessao', { simulado: true }, true, false), false)
  assert.equal(m.podeApresentar('/inicio', { limiteSegundos: 100 }, true, false), false)
  assert.ok(m.podeApresentar('/resumo', { simulado: true, concluidaEm: 10 }, true, false))
  assert.equal(m.podeApresentar('/inicio', null, false, false), false)
  assert.equal(m.podeApresentar('/inicio', null, true, true), false)
  const voltou = { ...estado(), metasPorContexto: { [ctx.id]: ['questoes-50'] }, metas: { contexto: 'biblioteca:hoje', ids: ['bib-marcas-10'], em: agora - m.PAUSA_METAS - 1, atividades: 1 } }
  assert.equal(m.escolherMeta(met({questoes:46}),met({questoes:47}),voltou,ctx,agora,20),null,'voltar da Biblioteca não repete a mesma meta da sessão')
  const app = await readFile('src/App.tsx', 'utf8')
  assert.doesNotMatch(app, /import\('\.\/eventos\/Encontros'\)/)
  assert.match(app, /AvisosConquistas/)
  const doc = await readFile('docs/conquistas/AVISOS.md', 'utf8')
  assert.match(doc, /nov[ao].*família/i)
  for (const p of ['AGENTS.md', 'CLAUDE.md']) assert.match(await readFile(p, 'utf8'), /conquistas\/AVISOS\.md/, p)
  console.log(`Avisos: ${m.EMBLEMAS.length} emblemas e ${m.FAMILIAS.length} famílias cobertos; artes, triagem, migração silenciosa, fila, contexto, segredos, marcos próximos/distantes, pausa, teto e contrato para novas conquistas passaram.`)
} finally { await rm(pasta, { recursive: true, force: true }) }

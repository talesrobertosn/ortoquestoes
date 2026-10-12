// Painel do cronograma: reta final de 14 dias (ou 7), fases, diagnóstico, constância, esquecimento e mapa de risco.
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
  const DIA = 864e5
  const agora = new Date(2026, 9, 12, 15)
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const plano = (diasProva, criadoHa = 30, folgas = [0]) => ({ data_prova: iso(new Date(agora.getTime() + diasProva * DIA)), intensidade: 'firme', folgas, prova: 'TEOT', base_respondidas: 0, criado_em: new Date(agora.getTime() - criadoHa * DIA).toISOString(), incluir_simulados: true })

  // Reta final: 14 dias com 6 semanas ou mais de plano; 7 quando é curto.
  assert.equal(m.diasRetaFinal(plano(60, 0).criado_em, plano(60, 0).data_prova), 14)
  assert.equal(m.diasRetaFinal(plano(30, 0).criado_em, plano(30, 0).data_prova), 7)
  const fases = [[90, 'conteudo'], [14, 'revisao'], [8, 'revisao'], [7, 'prova'], [2, 'prova'], [1, 'vespera'], [0, 'passou']]
  for (const [dias, esperada] of fases) assert.equal(m.calcularPlano(indice, {}, plano(dias, 60), agora).fase, esperada, `prova em ${dias} dias`)
  // Plano curto: não existe revisão forte, vai direto ao modo prova.
  assert.equal(m.calcularPlano(indice, {}, plano(10, 20), agora).fase, 'conteudo')
  assert.equal(m.calcularPlano(indice, {}, plano(6, 20), agora).fase, 'prova')

  // Diagnóstico: 30 questões diferentes, que existem, não respondidas, com simulados e várias áreas.
  const ids = m.idsDiagnostico(indice, {}, true)
  const porId = new Map(indice.questoes.map((q) => [q.id, q]))
  assert.equal(ids.length, m.TAMANHO_DIAGNOSTICO)
  assert.equal(new Set(ids).size, ids.length, 'diagnóstico repetiu questão')
  assert.ok(ids.every((id) => porId.has(id) && !porId.get(id).an && !porId.get(id).dup), 'diagnóstico com questão inválida')
  const sims = ids.filter((id) => porId.get(id).sim === 1).length
  assert.ok(sims >= 3 && sims <= 6, `diagnóstico com ${sims} simulados`)
  assert.ok(new Set(ids.map((id) => porId.get(id).t)).size >= 8, 'diagnóstico concentrado em poucas áreas')
  assert.equal(m.idsDiagnostico(indice, {}, false).filter((id) => porId.get(id).sim === 1).length, 0, 'diagnóstico sem simulados trouxe simulado')
  const jaFeitas = Object.fromEntries(ids.slice(0, 10).map((id) => [id, { c: true, q: agora.getTime() }]))
  assert.ok(m.idsDiagnostico(indice, jaFeitas, true).every((id) => !jaFeitas[id]), 'diagnóstico repetiu questão respondida')

  // Constância: 6 dias seguidos com 40 respostas; a folga (domingo) não quebra a sequência.
  const respondidas = {}
  const livres = indice.questoes.filter((q) => !q.dup && !q.ar && !q.an)
  let k = 0
  for (let d = 6; d >= 1; d--) {
    const dia = new Date(agora.getTime() - d * DIA)
    if (dia.getDay() === 0) continue
    for (let i = 0; i < 40; i++) { const q = livres[k++]; respondidas[q.id] = { c: i % 3 !== 0, q: dia.getTime(), historico: [{ em: dia.getTime(), correta: i % 3 !== 0 }] } }
  }
  const p = plano(120, 30)
  const calculo = m.calcularPlano(indice, respondidas, p, agora)
  const c = m.calcularConstancia(respondidas, p, calculo, agora)
  const diasEstudo = [1, 2, 3, 4, 5, 6].filter((d) => new Date(agora.getTime() - d * DIA).getDay() !== 0).length
  assert.equal(c.sequencia, diasEstudo, `sequência ${c.sequencia}, esperado ${diasEstudo}`)
  assert.equal(c.ultimos.length, 14)
  assert.ok(typeof m.elogio(c, calculo).titulo === 'string')

  // Esquecimento: um tema com 15 respostas há 25 dias aparece; um visto ontem, não.
  const coluna = indice.temas.findIndex((t) => t.slug === 'coluna')
  const antigo = agora.getTime() - 25 * DIA
  const historico = { ...respondidas }
  indice.questoes.filter((q) => q.t === coluna && !q.dup && !q.an).slice(0, 15).forEach((q) => { historico[q.id] = { c: false, q: antigo, historico: [{ em: antigo, correta: false }] } })
  const calc2 = m.calcularPlano(indice, historico, p, agora)
  const esquecidos = m.temasEsquecidos(indice, historico, calc2, p, agora.getTime())
  const daSemana = calc2.semanas.find((s) => s.atual)?.temas.some((t) => t.slug === 'coluna')
  if (!daSemana) assert.ok(esquecidos.some((e) => e.slug === 'coluna' && e.dias >= 25), 'coluna esquecida não apareceu')
  assert.ok(esquecidos.every((e) => e.dias >= 21), 'tema recente marcado como esquecido')
  const reativar = m.idsReativar(indice, historico, 'coluna', 15)
  assert.ok(reativar.length > 0 && reativar.every((id) => historico[id]), 'reativar trouxe questão nunca vista')

  // Mapa de risco: só assuntos de prioridade alta ou máxima com acerto abaixo de 65%.
  const riscos = m.mapaDeRisco(indice, historico)
  assert.ok(riscos.every((r) => r.foco.nivel >= 3 && r.acerto < 65 && r.respondidas >= 3))
  // Erros que importam: só erradas de prioridade alta ou máxima.
  assert.ok(m.idsErrosQueImportam(indice, historico).every((id) => historico[id].c === false))

  console.log(`Painel do cronograma: fases, reta final, diagnóstico (${sims} simulados), constância, esquecimento e risco corretos.`)
} finally { await rm(pasta, { recursive: true, force: true }) }

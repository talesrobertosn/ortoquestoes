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

  // Calibrado: precisa de 300 respostas com certeza.
  const cal = {}
  for (let i = 0; i < 300; i++) cal[`ped-${i}`] = reg([i < 285 ? certo(base + i * MIN) : errado(base + i * MIN)])
  assert.equal(m.calcularMetricas(cal, [], {}).calibrado, 95)
  delete cal['ped-0']
  assert.equal(m.calcularMetricas(cal, [], {}).calibrado, 0)

  // Run sem dano: dias seguidos com a meta diária e 70%.
  const run = {}
  let q = 0
  for (let d = 0; d < 3; d++) for (let i = 0; i < 20; i++) run[`ombro-${q++}`] = reg([i < 15 ? certo(base + d * 24 * 60 * MIN + i * MIN) : errado(base + d * 24 * 60 * MIN + i * MIN)])
  assert.equal(m.calcularMetricas(run, [], {}).runSemDano, 3)

  // Curva de aprendizado: 1.000 primeiras respostas, 50% nas primeiras 500 e 70% nas últimas.
  const cur = {}
  for (let i = 0; i < 1000; i++) cur[`tumores-${i}`] = reg([(i < 500 ? i % 2 === 0 : i % 10 < 7) ? certo(base + i * MIN) : errado(base + i * MIN)])
  assert.equal(m.calcularMetricas(cur, [], {}).curva, 20)

  // Ortopedista completo: tema com 100 respostas de primeira e 80%.
  const comp = {}
  for (let i = 0; i < 100; i++) comp[`mao-${i}`] = reg([i < 80 ? certo(base + i * MIN) : errado(base + i * MIN)])
  assert.equal(m.calcularMetricas(comp, [], {}).completo, 1)

  // New Game+: todas as questões (não anuladas) do tema dominadas.
  const ng = { 'coluna-1': dominadaRegistro, 'coluna-2': dominadaRegistro, 'coluna-3': { c: false, q: base } }
  const acervoNg = { imagem: new Set(), subtemas: new Map(), prova: new Map(), totalProva: new Map(), totalTema: new Map([['coluna', 2]]), anuladas: new Set(['coluna-3']) }
  assert.equal(m.calcularMetricas(ng, [], { acervo: acervoNg }).newGamePlus, 1)

  // Sessões: nota de corte, sem morrer e o chefe TEOT inteiro.
  const acervoTeot = { ...acervoNg, totalProva: new Map([['TEOT 2024', 120]]) }
  const sess = [
    { respondidas: 100, acertos: 70, total: 100 },
    { respondidas: 100, acertos: 86, total: 100, limite: 14400 },
    { respondidas: 120, acertos: 90, total: 120, limite: 120 * 144, provas: ['TEOT'], anos: [2024] },
  ]
  let ms = m.calcularMetricas({}, sess, { acervo: acervoTeot })
  assert.equal(ms.notaDeCorte, 3)
  assert.equal(ms.semMorrer, 1)
  assert.equal(ms.chefeTeot, 1)
  ms = m.calcularMetricas({}, [{ respondidas: 120, acertos: 90, total: 120, limite: 120 * 200, provas: ['TEOT'], anos: [2024] }], { acervo: acervoTeot })
  assert.equal(ms.chefeTeot, 0) // tempo de sobra não vale

  // Servidor: sequências de dias, folgas do cronograma, Simulado Nacional e pódio semanal.
  const servidor = {
    conquistas: ['imagem-500'],
    dias: { questao_do_dia: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05'], fila_zerada: ['2026-09-30', '2026-10-01'],
      meta_cronograma: ['2026-10-02', '2026-10-03', '2026-10-05'] }, // 04/10 é domingo, folga
    indicados_assinantes: 3, indicados_30_dias: 5,
    simulado_edicoes: ['2026-07', '2026-08', '2026-09', '2026-10'],
    simulado_participacoes: [{ edicao: '2026-08', posicao: 2, classificados: 25 }, { edicao: '2026-09', posicao: 1, classificados: 25 }, { edicao: '2026-10', posicao: 1, classificados: 10 }],
    ranking_semana: [{ dia: '2026-09-13', posicao: 1 }, { dia: '2026-09-20', posicao: 1 }, { dia: '2026-09-27', posicao: 3 }, { dia: '2026-09-29', posicao: 1 }],
    relatos_resolvidos: 4, comentarios_avaliados: 120, contra_corrente: 51,
    plano: { data_prova: '2027-01-10', folgas: [0], criado_em: '2026-10-01T10:00:00Z' },
  }
  ms = m.calcularMetricas({}, [], { servidor }, new Date(2026, 9, 7, 12).getTime())
  assert.equal(ms.pontual, 3)
  assert.equal(ms.filaZerada, 2)
  assert.equal(ms.cronograma, 3)
  assert.equal(ms.nacionalSeguidas, 3)
  assert.equal(ms.nacionalElite, 1)
  assert.equal(ms.nacionalCampeao, 1)
  assert.equal(ms.arenaPodio, 4) // semanas encerradas em 13, 20, 27/09 e 04/10
  assert.equal(ms.arenaReinado, 2)
  assert.equal(ms.arenaCampeao, 1)
  assert.equal(ms.indicadosAssinantes, 3)
  assert.equal(ms.contraCorrente, 51)
  // Trava: emblema conquistado não se perde; Platina só com tudo.
  const travado = m.completarMetricas({ ...ms, travadas: new Set(servidor.conquistas) })
  assert.ok(m.desbloqueado(m.emblemaPorId('imagem-500'), travado))
  assert.equal(travado.platina, 0)
  const tudo = m.completarMetricas({ ...ms, travadas: new Set(m.EMBLEMAS.map((e) => e.id).filter((id) => id !== 'chefe-platina')) })
  assert.equal(tudo.platina, 1)

  // Todo emblema aponta para uma métrica que existe.
  const metricas = m.calcularMetricas({}, [], {})
  for (const e of m.EMBLEMAS) assert.ok(e.familia === 'mestre' || e.familia === 'especialista' || typeof metricas[e.metrica] === 'number', e.id)
  // Platina não exige os emblemas de Flashcards.
  const semFc = m.completarMetricas({ ...ms, travadas: new Set(m.EMBLEMAS.map((e) => e.id).filter((id) => id !== 'chefe-platina' && !id.startsWith('fc-'))) })
  assert.equal(semFc.platina, 1)

  // Revisão (15/10/2026): revisões, resgate e constância a partir do histórico.
  const DIA = 86400000
  const hojeR = new Date(2026, 9, 15, 12, 0).getTime()
  const rev = {}
  for (let d = 1; d <= 8; d++) {
    for (let i = 0; i < 10; i++) {
      const em = hojeR - d * DIA, primeira = em - 14 * DIA // certeza: vencia em 10 dias, revisada 4 dias depois
      rev[`joelho-${d * 100 + i}`] = { c: true, q: em, tentativas: 2, sequencia: 2, confianca: 'seguro', historico: [certo(primeira), certo(em)] }
    }
  }
  const mr = m.calcularMetricas(rev, [], {}, hojeR)
  assert.equal(mr.revisoes, 80)
  assert.equal(mr.resgate, 80)
  assert.equal(mr.constancia, 8)
  assert.equal(mr.revisoesNumDia, 10)
  // Uma folga no meio não quebra; um dia sem revisão quebra.
  const furo = Object.fromEntries(Object.entries(rev).filter(([id]) => !id.startsWith('joelho-4')))
  assert.equal(m.calcularMetricas(furo, [], {}, hojeR).constancia, 4)
  const diaFolga = new Date(hojeR - 4 * DIA).getDay()
  assert.equal(m.calcularMetricas(furo, [], { folgasRevisao: [diaFolga] }, hojeR).constancia, 7)
  // Revisão no prazo não conta como resgate.
  assert.equal(m.calcularMetricas({ 'mao-9': { c: true, q: hojeR, tentativas: 2, sequencia: 2, historico: [certo(hojeR - 10 * DIA), certo(hojeR)] } }, [], {}, hojeR).resgate, 0)

  // Flashcards: métricas vindas de fora entram nas famílias fc.
  const fc = m.calcularMetricas({}, [], { flashcards: { fcAndar: 21, fcMestreRevisao: 3, fcEspecialista: 0, fcBestiario: 8, fcDragaoOssos: 1, fcDragoes: 1, fcSemErrar: 10, fcLendarios: 0 } })
  for (const id of ['fc-andar-21', 'fc-revisao-3', 'fc-bestiario-8', 'fc-dragao-ossos', 'fc-sem-errar-10']) assert.ok(m.desbloqueado(m.emblemaPorId(id), fc), id)
  assert.ok(!m.desbloqueado(m.emblemaPorId('fc-dragoes'), fc))
  // O Bestiário completo acompanha os adversários do jogo (o dragão do topo da Torre fica de fora).
  const arqFc = join(pasta, 'fc.mjs')
  await build({ stdin: { contents: `export * from './src/flashcards/conquistas';`, resolveDir: process.cwd() }, outfile: arqFc, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' } })
  const f = await import(pathToFileURL(arqFc))
  assert.equal(m.emblemaPorId('fc-bestiario-43').minimo, f.ADVERSARIOS_BESTIARIO.length)
  assert.equal(f.areaDoFlashcard('fc-pediatria-0431-tb2'), 'pediatria')
  assert.equal(f.areaDoFlashcard('fc-ombro-cotovelo-0012-q'), 'ombro-cotovelo')
  const mf = f.metricasFlashcards({ registros: { 'fc-joelho-0001-q': { c: true, acertos: 1, sequencia: 9, confianca: 'seguro' } }, bestiario: { vencidos: ['dragao-de-ossos', 'dragao-rubro'] }, recordes: { andarMaximo: 40, melhorSequencia: 7 }, servidor: { andar_masmorra: 12, unicos: 1 }, lendarias: new Set(['fc-joelho-0001-q']) })
  assert.deepEqual([mf.fcAndar, mf.fcEspecialista, mf.fcDragoes, mf.fcDragaoOssos, mf.fcSemErrar, mf.fcLendarios], [12, 1, 2, 1, 7, 1]) // andar só do servidor
  console.log('Emblemas difíceis: todos corretos.')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

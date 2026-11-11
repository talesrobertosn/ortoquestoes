// Cálculos do Financeiro, das Metas e da semana típica refeitos em 11/11/2026 (src/admin/dados/hub.ts e projecao.ts).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-hub-'))
try {
  const arquivo = join(pasta, 'hub.mjs')
  await build({ stdin: { contents: `export * from './src/admin/dados/hub';export * from './src/admin/dados/projecao';export * from './src/admin/dados/metas';export * from './src/componentes/admin/financeiro'`, resolveDir: process.cwd(), loader: 'ts' }, outfile: arquivo, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const sp = iso => new Date(`${iso}-03:00`)

  // O plano oficial é exatamente o modelo rodado com os parâmetros congelados (arredondado).
  const r = m.projetarCrescimento(m.PARAMETROS_PLANO)
  assert.equal(r.length, 12)
  r.forEach((x, i) => {
    const p = m.PLANO_2026_11.meses[i]
    assert.equal(p.mes, x.mes)
    assert.deepEqual([p.cadastros, p.novosPagantes, p.ativosFim, p.receitaEquivalente, p.faturamento], [x.cadastros, x.novosPagantes, x.ativosFim, x.receitaEquivalente, x.faturamento].map(Math.round), `plano de ${p.mes}`)
  })
  assert.equal(m.META_OFICIAL.id, 'plano-2026-11-11')
  assert.equal(m.META_MODERADA.id, 'moderado-2026-11', 'a versão antiga continua guardada')
  // Público finito: os cadastros caem mês a mês, menos em março (turma nova de R1).
  for (let i = 1; i < r.length; i++) if (!r[i].mes.endsWith('-03')) assert.ok(r[i].cadastros < r[i - 1].cadastros, `cadastros caem em ${r[i].mes}`)
  assert.ok(r.find(x => x.mes === '2027-03').cadastros > r.find(x => x.mes === '2027-02').cadastros, 'março sobe')
  // Mais marketing, mais cadastros no começo; mais Pix renovando, mais receita.
  const forte = m.projetarCrescimento({ ...m.PARAMETROS_PLANO, marketing: 1.5 })
  assert.ok(forte[0].cadastros > r[0].cadastros && forte.at(-1).alcance > r.at(-1).alcance)
  const pix = m.projetarCrescimento({ ...m.PARAMETROS_PLANO, pixRenova: 1 })
  assert.ok(pix.at(-1).faturamento > r.at(-1).faturamento)
  assert.ok(Math.abs(m.retencaoMensal({ mensaisNoPix: 0.9, pixRenova: 0.8, cartaoContinua: 0.95 }) - 0.815) < 1e-9)

  // Recebido por período, base por plano e retrato do mês.
  const c = (id, em, plano, valor, meio = 'pix', tipo = 'nova') => ({ id_usuario: id, em: sp(em), plano, valor, meio, tipo, estimada: false })
  const cobr = [c('a', '2026-10-05T10:00:00', 'mensal', 39.9), c('a', '2026-11-04T10:00:00', 'mensal', 39.9, 'pix', 'renovacao'), c('b', '2026-10-20T10:00:00', 'anual', 239.9, 'cartao'), c('d', '2026-11-03T10:00:00', 'mensal', 39.9)]
  const agora = sp('2026-11-11T19:00:00')
  const meses = m.recebidoPorPeriodo(cobr, 'mes', 3, agora)
  assert.deepEqual(meses.map(x => x.chave), ['2026-09', '2026-10', '2026-11'])
  assert.equal(meses[1].total, 279.8); assert.equal(meses[2].pix, 79.8); assert.equal(meses[2].renovacao, 39.9); assert.ok(meses[2].parcial)
  const semanas = m.recebidoPorPeriodo(cobr, 'semana', 2, agora)
  assert.equal(semanas[1].chave, '2026-11-09', 'semana começa na segunda')
  const assin = [{ id_usuario: 'b', plano: 'anual', status: 'ativa', meio: 'cartao', criada_em: sp('2026-10-20T10:00:00').toISOString(), ultima_cobranca_em: sp('2026-10-20T10:00:00').toISOString(), fim_periodo: sp('2027-10-20T10:00:00').toISOString(), cancelar_ao_fim: false }]
  const nov = m.fotoDoMes('2026-11', assin, cobr, agora.getTime(), agora.getTime())
  assert.equal(nov.recebido, 79.8); assert.equal(nov.novas, 1); assert.equal(nov.renovacoes, 1)
  assert.equal(nov.baseInicio.total, 2, 'a (mensal) e b (anual) no dia 1º')
  assert.equal(nov.baseFim.total, 3); assert.equal(nov.baseFim.porPlano.anual, 1)
  assert.ok(Math.abs(nov.baseFim.receitaEquivalente - (39.9 * 2 + 239.9 / 12)) < 1e-6, 'anual antigo vale 239,90 ÷ 12 por mês')
  const out = m.fotoDoMes('2026-10', assin, cobr, m.mesmaAlturaMesPassado(agora.getTime()), agora.getTime())
  assert.equal(out.recebido, 39.9, 'outubro até o dia 11 só tem a compra do dia 5')
  assert.equal(new Date(m.mesmaAlturaMesPassado(agora.getTime())).toISOString(), '2026-10-11T22:00:00.000Z')
  const carteira = m.carteiraHoje(assin, agora.getTime())
  assert.equal(carteira.total, 1); assert.equal(carteira.linhas.find(l => l.plano === 'anual').cartaoRenova, 1)

  // Semanas do mês e médias por dia da semana (hoje fica de fora).
  const sem = m.semanasDoMes('2026-11', agora.getTime())
  assert.deepEqual(sem.map(s => [s.de, s.ate, s.estado]), [[1, 7, 'passada'], [8, 14, 'atual'], [15, 21, 'futura'], [22, 28, 'futura'], [29, 30, 'futura']])
  const dias = [{ dia: '2026-11-02', n: 4 }, { dia: '2026-11-09', n: 2 }, { dia: '2026-11-07', n: 1 }, { dia: '2026-11-11', n: 50 }]
  const med = m.mediaPorDiaDaSemana(dias, '2026-11-11')
  assert.equal(med[0].media, 3, 'segunda: (4 + 2) / 2'); assert.equal(med[5].media, 1); assert.equal(med[2].dias, 0, 'hoje (quarta) não entra')
  const grade = m.gradeSemanaHora([sp('2026-11-07T10:30:00')])
  assert.equal(grade[5][10], 1, 'sábado às 10h de São Paulo')

  // Taxa do Pix: sem nenhum Pix vencido, vale a regra de 80%.
  assert.equal(m.taxaPixSugerida([], agora).taxa, 0.8)
  assert.equal(m.taxaPixSugerida([], agora).fonte, 'padrao')
  console.log('Hub: plano congelado = modelo, público finito, recebido por período, retrato do mês, carteira, semanas, médias e taxa do Pix ok.')
} finally { await rm(pasta, { recursive: true, force: true }) }

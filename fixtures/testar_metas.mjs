// Metas do OrtoQuestões (05/11/2026): a tabela moderada fixa (soma R$ 36.403), o realizado por mês, a
// projeção com intervalo, a régua acima/próximo/abaixo, o ritmo semanal e os tipos de receita.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-metas-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/admin/dados/metas'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', external: ['react', 'react-dom'],
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const sp = (t) => new Date(`${t}-03:00`)

  // 1. A versão fixa: 12 meses, nov/26 a out/27, faturamento somando R$ 36.403.
  assert.equal(m.META_MODERADA.id, 'moderado-2026-11')
  assert.equal(m.META_MODERADA.meses.length, 12)
  assert.equal(m.META_MODERADA.meses[0].mes, '2026-11')
  assert.equal(m.META_MODERADA.meses.at(-1).mes, '2027-10')
  assert.equal(m.META_MODERADA.meses.reduce((s, x) => s + x.faturamento, 0), 36403)
  assert.deepEqual(m.META_MODERADA.meses[0], { mes: '2026-11', cadastros: 102, novosPagantes: 22, ativosFim: 58, receitaEquivalente: 1882, faturamento: 2899 })

  // 2. Edição vigente por cima da original, sem tocar a original.
  const v = m.metasVigentes(m.META_MODERADA, [{ versao: 'vigente', mes: '2027-01-01', cadastros: 120, novos_pagantes: 25, ativos_fim: 80, receita_equivalente: 2500, faturamento: 3500 }, { versao: 'outra', mes: '2027-02-01', cadastros: 1, novos_pagantes: 1, ativos_fim: 1, receita_equivalente: 1, faturamento: 1 }])
  assert.equal(v[2].cadastros, 120); assert.equal(v[2].editada, true); assert.equal(v[2].original.cadastros, 90)
  assert.equal(v[3].cadastros, 85, 'só a camada "vigente" vale'); assert.equal(m.META_MODERADA.meses[2].cadastros, 90, 'a original não muda')
  // Edição feita antes de a versão ser registrada ajustava um plano anterior: não vale.
  const velha = m.metasVigentes(m.META_OFICIAL, [{ versao: 'vigente', mes: '2027-01-01', cadastros: 999, novos_pagantes: 1, ativos_fim: 1, receita_equivalente: 1, faturamento: 1, editado_em: '2026-11-15T10:00:00Z' }, { versao: 'vigente', mes: '2027-02-01', cadastros: 777, novos_pagantes: 1, ativos_fim: 1, receita_equivalente: 1, faturamento: 1, editado_em: '2026-11-23T10:00:00Z' }])
  assert.equal(velha.find(x => x.mes === '2027-01').editada, false, 'edição de antes do plano novo não esconde a meta nova')
  assert.equal(velha.find(x => x.mes === '2027-02').cadastros, 777, 'edição feita depois vale')

  // 3. Períodos encadeados: renovar antes do fim soma os dias.
  const c = (dia, valor, plano, id, tipo = 'nova', meio = 'pix') => ({ em: sp(dia), valor, plano, id_usuario: id, estimada: false, tipo, meio })
  const cobr = [c('2026-10-01T10:00:00', 39.9, 'mensal', 'a'), c('2026-10-28T10:00:00', 39.9, 'mensal', 'a', 'renovacao'), c('2026-11-02T10:00:00', 209.4, 'semestral', 'b', 'nova', 'cartao')]
  const per = m.periodosPagos(cobr)
  assert.equal(per[1].inicio, sp('2026-11-01T10:00:00').getTime(), 'o novo período começa no fim do anterior')
  const base = m.baseNoInstante(per, sp('2026-11-20T12:00:00').getTime())
  assert.equal(base.ativos, 2); assert.equal(Math.round(base.receitaEquivalente * 100) / 100, Math.round((39.9 + 34.9) * 100) / 100)

  // 4. Realizado por mês: cadastros, novos, faturamento; mês futuro zerado.
  const real = m.realizadoPorMes(['2026-10', '2026-11', '2026-12'], [sp('2026-10-05T10:00:00'), sp('2026-11-03T10:00:00'), sp('2026-11-04T10:00:00')], cobr, new Map([['2026-11', 39.9]]), sp('2026-11-20T12:00:00').getTime())
  assert.deepEqual(real.map(r => r.cadastros), [1, 2, 0])
  assert.deepEqual(real.map(r => r.novosPagantes), [1, 1, 0])
  assert.equal(Math.round(real[1].faturamento * 100), 20940)
  assert.equal(real[0].completo, true); assert.equal(real[1].completo, false); assert.equal(real[1].reembolsado, 39.9)

  // 5. Régua da situação.
  assert.equal(m.situacao(100, 100), 'acima'); assert.equal(m.situacao(95, 100), 'proximo'); assert.equal(m.situacao(89, 100), 'abaixo'); assert.equal(m.situacao(5, 0), 'acima')
  // 6. Esperado até hoje e ritmo semanal.
  assert.equal(m.esperadoAteHoje(30, 15, 30), 15)
  const r = m.porSemanaNecessario(100, 30, 14); assert.equal(r.falta, 70); assert.equal(r.porSemana, 35)
  assert.equal(m.porSemanaNecessario(10, 30, 14).falta, 0)

  // 7. Projeção: cadastros pelo ritmo, faturamento pelo calendário (renovação do cartão entra inteira, Pix pela taxa).
  const ass = [
    { id_usuario: 'b', plano: 'semestral', status: 'ativa', meio: 'cartao', cancelar_ao_fim: false, fim_periodo: sp('2026-11-25T10:00:00').toISOString() },
    { id_usuario: 'a', plano: 'mensal', status: 'ativa', meio: 'pix', cancelar_ao_fim: true, fim_periodo: sp('2026-11-28T10:00:00').toISOString() },
  ]
  const p = m.projetarMes({ agora: sp('2026-11-16T00:00:00').getTime(), cadastros: Array.from({ length: 15 }, (_, i) => sp(`2026-11-${String(i + 1).padStart(2, '0')}T12:00:00`)), cobrancas: cobr, assinaturas: ass, taxaPix: 0.5 })
  assert.equal(p.diasPassados, 15); assert.equal(p.diasNoMes, 30)
  assert.equal(Math.round(p.cadastros.centro), 30, '15 em 15 dias → 30 no mês')
  assert.ok(p.cadastros.baixo < p.cadastros.centro && p.cadastros.alto > p.cadastros.centro)
  assert.equal(Math.round(p.partes.cartao * 100), 20940); assert.equal(Math.round(p.partes.pix * 100), 3990)
  assert.ok(p.faturamento.baixo <= p.faturamento.centro && p.faturamento.centro <= p.faturamento.alto)

  // 7b. Objetivo não muda previsão: com 4 dias, vale o ritmo observado e há aviso de amostra pequena.
  const cedo = m.projetarMes({ agora: sp('2026-11-05T00:00:00').getTime(), cadastros: Array.from({ length: 40 }, () => sp('2026-11-02T12:00:00')), cobrancas: [], assinaturas: [], taxaPix: 0.6, meta: { cadastros: 102, novosPagantes: 22 } })
  const ritmo = 40 / 4
  assert.equal(Math.round(cedo.cadastros.centro), Math.round(40 + ritmo * 26))
  assert.equal(cedo.amostraPequena, true)

  // 8. Tipos de receita: competência espalha o semestral em 6 meses.
  const t = m.tiposDeReceita('2026-11', cobr, ass, 0, sp('2026-11-20T12:00:00').getTime())
  assert.equal(Math.round(t.recebido * 100), 20940)
  assert.equal(Math.round(t.primeiras * 100), 20940)
  assert.equal(Math.round(t.competencia * 100), Math.round((39.9 + 34.9) * 100), 'nov: o mensal renovado (começa 01/11) + 1/6 do semestral')
  assert.equal(Math.round(t.recorrenteAutomatica * 100), 3490, 'só o cartão que renova, mensalizado')
  console.log('Metas: versão moderada fixa (R$ 36.403), camada editável, períodos encadeados, realizado, projeção com intervalo, régua e tipos de receita ok.')
} finally { await rm(pasta, { recursive: true, force: true }) }

// Mesa de Comando (01/11/2026): as contas puras de metricas.ts. Período atual × anterior do mesmo tamanho,
// receita confirmada nunca somada à reconstruída, fila de atenção ordenada por gravidade e sem item vazio,
// frase do estado só com fatos, e o dicionário de métricas documentado em docs/admin/METRICAS.md.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-admin-metricas-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/componentes/admin/metricas'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false', 'import.meta.env': '{}' },
  })
  const m = await import(pathToFileURL(arquivo))
  const DIA = 86_400_000

  // ---------- Períodos ----------
  const serie = Array.from({ length: 14 }, (_, k) => ({ dia: `2026-10-${String(k + 18).padStart(2, '0')}`, cadastros: 1, ativos: k < 7 ? 2 : 4, respostas: k < 7 ? 10 : 30 }))
  const p = m.cortarPeriodos([...serie].reverse(), 7) // fora de ordem: a função ordena
  assert.equal(p.atual.length, 7)
  assert.equal(p.atual[0].dia, '2026-10-25')
  assert.equal(p.atual.at(-1).dia, '2026-10-31')
  assert.equal(p.anterior.length, 7)
  assert.equal(p.anterior[0].dia, '2026-10-18')
  const n = m.numerosDoPeriodo(p)
  assert.deepEqual(n.questoes, { atual: 210, anterior: 70, delta: 140, pct: 200 })
  assert.equal(n.cadastros.pct, 0)
  assert.equal(n.estudaramDia.atual, 4)
  assert.equal(n.estudaramDia.anterior, 2)
  // Série curta: sem período anterior (nunca inventa zero para comparar).
  const curta = m.cortarPeriodos(serie.slice(-9), 7)
  assert.equal(curta.anterior, null)
  assert.equal(m.numerosDoPeriodo(curta).questoes.pct, null)
  assert.equal(m.cortarPeriodos(null, 7), null)
  assert.equal(m.cortarPeriodos([], 30), null)
  // Variação: sem base, sem porcentagem; base zero não divide.
  assert.deepEqual(m.variacao(5, null), { atual: 5, anterior: null, delta: null, pct: null })
  assert.equal(m.variacao(5, 0).pct, null)
  assert.equal(m.variacao(5, 0).delta, 5)
  // Janelas de São Paulo: 01/11/2026 01h UTC ainda é 31/10 em São Paulo.
  const j = m.janelas(3, Date.parse('2026-11-01T01:00:00Z'))
  assert.deepEqual(j.atual, ['2026-10-29', '2026-10-30', '2026-10-31'])
  assert.deepEqual(j.anterior, ['2026-10-26', '2026-10-27', '2026-10-28'])

  // ---------- Receita: confirmada × reconstruída ----------
  const agora = Date.parse('2026-11-01T15:00:00Z')
  const iso = (ms) => new Date(ms).toISOString()
  const assinatura = (id, plano, meio, diasAtras, extra = {}) => ({
    id_usuario: id, usuario: `${id}@exemplo.com`, nome: id, plano, meio, status: 'ativa', cancelar_ao_fim: false,
    criada_em: iso(agora - diasAtras * DIA), inicio_periodo: iso(agora - diasAtras * DIA), fim_periodo: iso(agora + 300 * DIA),
    ultima_cobranca_em: iso(agora - diasAtras * DIA), ultima_atualizacao: iso(agora - diasAtras * DIA), proxima_cobranca: null, ...extra,
  })
  // A última cobrança do cartão está registrada na assinatura (confirmada); as renovações anteriores a ela,
  // contadas para trás a cada período do plano, são reconstruídas (receita.ts › cobrancas).
  const assinaturas = [
    assinatura('gravada', 'anual', 'cartao', 2),
    assinatura('mensal-antiga', 'mensal', 'cartao', 5, { criada_em: iso(agora - 70 * DIA), inicio_periodo: iso(agora - 70 * DIA) }),
  ]
  const reais = [{ id_usuario: 'gravada', plano: 'anual', meio: 'cartao', valor: 300, em: iso(agora - 2 * DIA), id_pagamento: '1', situacao: 'paga' }]
  const r = m.receitaDoPeriodo(assinaturas, reais, 90, agora)
  const mensal = Math.round((r.confirmada.atual - 300) * 100) / 100
  assert.ok(mensal > 0, 'a última cobrança da mensal é confirmada pelo preço contratado')
  assert.equal(r.reconstruida, Math.round(mensal * 2 * 100) / 100, 'as duas renovações anteriores da mensal são reconstruídas')
  assert.equal(r.porDia.length, 90)
  const soma = (campo) => Math.round(r.porDia.reduce((s, d) => s + d[campo], 0) * 100) / 100
  assert.equal(soma('confirmada'), r.confirmada.atual, 'o gráfico diário bate com o número confirmado')
  assert.equal(soma('reconstruida'), r.reconstruida, 'e com o reconstruído, separado')
  assert.equal(Math.round(r.porMeio.cartao * 100) / 100, Math.round((r.confirmada.atual + r.reconstruida) * 100) / 100, 'composição por meio leva os dois, sinalizado na tela')
  assert.equal(r.novas.atual, 2, 'duas primeiras assinaturas')
  assert.equal(r.renovacoes, 2)
  // Janela de 7 dias: só as duas últimas cobranças, as duas confirmadas.
  const r7 = m.receitaDoPeriodo(assinaturas, reais, 7, agora)
  assert.equal(r7.reconstruida, 0)
  assert.equal(r7.confirmada.atual, r.confirmada.atual)
  // Fora da janela: nada entra.
  assert.equal(m.receitaDoPeriodo([assinatura('antiga', 'anual', 'cartao', 40)], [], 7, agora).confirmada.atual, 0)

  // ---------- Fila de atenção ----------
  const vazia = m.filaDeAtencao({ eventos: [], lidosPagamento: new Set(), assinaturas: [], pendenciasConteudo: 0, novosParados: [], fontesIndisponiveis: [], agora })
  assert.deepEqual(vazia, [], 'sem pendência real, fila vazia (nada com contagem 0)')
  const fila = m.filaDeAtencao({
    eventos: [
      { id: 1, status_processamento: 'erro', recebido_em: iso(agora - 3600e3) },
      { id: 2, status_processamento: 'erro', recebido_em: iso(agora - 7200e3) },
      { id: 3, status_processamento: 'processado', recebido_em: iso(agora) },
    ],
    lidosPagamento: new Set(['2']),
    assinaturas: [],
    pendenciasConteudo: 4,
    novosParados: [{ ultima_atividade: iso(agora - 3 * DIA), criado_em: iso(agora - 9 * DIA) }],
    fontesIndisponiveis: ['Funil'],
    agora,
  })
  assert.ok(fila.every(i => i.contagem > 0))
  assert.deepEqual(fila.map(i => i.severidade), [...fila.map(i => i.severidade)].sort((a, b) => m.ORDEM_SEVERIDADE[a] - m.ORDEM_SEVERIDADE[b]), 'ordem de gravidade')
  const processador = fila.find(i => i.id === 'processador')
  assert.equal(processador.severidade, 'critica')
  assert.equal(processador.contagem, 1, 'aviso marcado como visto sai da conta')
  assert.equal(processador.destino.aba, 'pagamentos')
  assert.equal(fila[0].id, 'processador')
  assert.equal(fila.find(i => i.id === 'conteudo').contagem, 4)
  assert.equal(fila.find(i => i.id === 'fonte:Funil').acao, 'Tentar de novo')
  assert.equal(fila.find(i => i.id === 'novos-parados').destino.filtro, 'novos_parados')
  for (const i of fila) for (const campo of ['titulo', 'causa', 'acao', 'grupo']) assert.ok(i[campo], `${i.id} sem ${campo}`)

  // ---------- Frase do estado: só fatos ----------
  const frase = m.fraseDoEstado({ online: 4, estudaramHoje: 7, questoes: m.variacao(120, 100), dias: 7, criticos: 1, pendentes: 3 })
  assert.match(frase, /^4 pessoas online/)
  assert.match(frase, /7 estudaram hoje/)
  assert.match(frase, /20%/)
  assert.match(frase, /1 problema crítico/)
  const semDados = m.fraseDoEstado({ online: null, estudaramHoje: null, questoes: null, dias: 30, criticos: 0, pendentes: 0 })
  assert.ok(!/\d/.test(semDados.replace(/30/g, '')), `sem dados a frase não inventa número: ${semDados}`)

  // ---------- Dicionário documentado ----------
  const doc = await readFile('docs/admin/METRICAS.md', 'utf8')
  for (const [id, def] of Object.entries(m.METRICAS)) {
    assert.ok(doc.includes(`\`${id}\``), `docs/admin/METRICAS.md sem a métrica ${id}`)
    assert.ok(doc.includes(def.nome), `docs/admin/METRICAS.md sem o nome "${def.nome}"`)
    for (const campo of ['nome', 'pergunta', 'unidade', 'numerador', 'janela', 'fonte', 'qualidade', 'testes', 'deduplicacao', 'latencia', 'comparavel', 'bom'])
      assert.ok(def[campo], `${id} sem ${campo}`)
  }
  console.log(`Métricas do painel: ${Object.keys(m.METRICAS).length} definições documentadas, períodos, receita por qualidade, fila e frase ok.`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}

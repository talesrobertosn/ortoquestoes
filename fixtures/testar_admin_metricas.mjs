// Painel 3.0: a linguagem de dados (src/admin/dados/metricas.ts). Confere as contas puras (variação, períodos,
// receita por qualidade, fila de atenção) e que toda métrica do código está explicada em docs/admin/METRICAS.md.
// `node fixtures/testar_admin_metricas.mjs --gerar` reescreve a parte gerada do documento a partir do código.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const DOC = 'docs/admin/METRICAS.md'
const INICIO = '<!-- gerado: metricas -->', FIM = '<!-- fim do gerado -->'
const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-admin-metricas-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/admin/dados/metricas'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false', 'import.meta.env': '{}' },
  })
  const m = await import(pathToFileURL(arquivo))

  // ---------- Documento: toda métrica do código, com todos os campos ----------
  const CAMPOS = [['pergunta', 'Pergunta'], ['unidade', 'Unidade'], ['numerador', 'Numerador'], ['denominador', 'Denominador'], ['janela', 'Janela e fuso'], ['fonte', 'Fonte (RPC)'], ['qualidade', 'Qualidade'], ['testes', 'Contas de teste'], ['deduplicacao', 'Deduplicação'], ['latencia', 'Atraso'], ['comparavel', 'Comparação'], ['bom', 'Subir é']]
  const gerado = Object.entries(m.METRICAS).map(([id, d]) => [`### ${d.nome} \`${id}\``, '', '| Campo | Definição |', '| --- | --- |',
    ...CAMPOS.filter(([c]) => d[c] !== undefined).map(([c, r]) => `| ${r} | ${c === 'qualidade' ? m.ROTULO_QUALIDADE[d[c]] : c === 'bom' ? (d[c] === 'sobe' ? 'bom' : 'ruim') : String(d[c]).replace(/\|/g, '\\|')} |`), ''].join('\n')).join('\n')
  let doc = await readFile(DOC, 'utf8')
  if (process.argv.includes('--gerar')) {
    const a = doc.indexOf(INICIO), b = doc.indexOf(FIM)
    assert.ok(a >= 0 && b > a, `${DOC} precisa dos marcadores ${INICIO} e ${FIM}`)
    doc = `${doc.slice(0, a + INICIO.length)}\n\n${gerado}\n${doc.slice(b)}`
    await writeFile(DOC, doc)
    console.log(`${DOC} atualizado com ${Object.keys(m.METRICAS).length} métricas.`)
  }
  assert.ok(doc.includes(gerado), `${DOC} está desatualizado: rode node fixtures/testar_admin_metricas.mjs --gerar`)
  for (const [id, d] of Object.entries(m.METRICAS)) {
    for (const c of ['nome', 'pergunta', 'numerador', 'janela', 'fonte', 'qualidade', 'testes', 'deduplicacao', 'latencia', 'comparavel']) assert.ok(d[c], `${id}.${c}`)
    assert.ok(m.ROTULO_QUALIDADE[d.qualidade], `${id}: qualidade conhecida`)
  }

  // ---------- Variação ----------
  assert.deepEqual(m.variacao(15, 10), { atual: 15, anterior: 10, delta: 5, pct: 50 })
  assert.deepEqual(m.variacao(3, 0), { atual: 3, anterior: 0, delta: 3, pct: null }, 'sem base não inventa porcentagem')
  assert.deepEqual(m.variacao(3, null), { atual: 3, anterior: null, delta: null, pct: null })

  // ---------- Períodos: N dias atuais e N anteriores, alinhados ----------
  const dia = (k) => ({ dia: `2026-10-${String(k).padStart(2, '0')}`, cadastros: 1, ativos: k % 2 ? 2 : 4, respostas: 10 })
  const serie = Array.from({ length: 14 }, (_, i) => dia(i + 1)).reverse()
  const p = m.cortarPeriodos(serie, 7)
  assert.equal(p.atual.length, 7)
  assert.equal(p.atual[0].dia, '2026-10-08')
  assert.equal(p.atual.at(-1).dia, '2026-10-14')
  assert.equal(p.anterior[0].dia, '2026-10-01')
  assert.equal(m.cortarPeriodos(serie.slice(0, 10), 7).anterior, null, 'sem 2N dias não há comparação (nunca um anterior parcial)')
  assert.equal(m.cortarPeriodos([], 7), null)
  const n = m.numerosDoPeriodo(p)
  assert.equal(n.questoes.atual, 70)
  assert.equal(n.questoes.pct, 0)
  assert.equal(n.cadastros.atual, 7)

  // ---------- Receita do período: confirmada e reconstruída nunca somam ----------
  const agora = Date.parse('2026-10-17T18:00:00Z')
  const assinatura = (id, plano, meio, dias, extra = {}) => ({ id_usuario: id, usuario: `${id}@x.com`, plano, meio, status: 'ativa', criada_em: new Date(agora - dias * 86_400_000).toISOString(), inicio_periodo: new Date(agora - dias * 86_400_000).toISOString(), fim_periodo: new Date(agora + 300 * 86_400_000).toISOString(), ultima_cobranca_em: new Date(agora - dias * 86_400_000).toISOString(), ultima_atualizacao: new Date(agora - dias * 86_400_000).toISOString(), cancelar_ao_fim: false, ...extra })
  // a: Pix com cobrança gravada; b: cartão com a última cobrança registrada (confirmada pelo valor contratado);
  // d: cartão ativo sem nenhuma cobrança registrada (reconstruída pelo preço do plano; com cobranças gravadas, o Pix só sai dos pedidos pagos).
  const assinaturas = [assinatura('a', 'anual', 'pix', 2), assinatura('b', 'mensal', 'cartao', 3), assinatura('d', 'mensal', 'cartao', 4, { ultima_cobranca_em: null })]
  const reais = [{ id_usuario: 'a', plano: 'anual', meio: 'pix', valor: 349, em: assinaturas[0].ultima_cobranca_em, id_pagamento: '1', situacao: 'paga' }]
  const r = m.receitaDoPeriodo(assinaturas, reais, 7, agora)
  assert.equal(r.confirmada.atual, 388.9, 'Pix gravado + última cobrança do cartão são confirmados')
  assert.ok(r.reconstruida > 0, 'paga sem cobrança gravada entra como reconstruída, à parte')
  assert.ok(!Number.isNaN(r.reconstruida + r.confirmada.atual))
  assert.equal(r.porDia.length, 7)
  assert.equal(Math.round(r.porDia.reduce((s, d) => s + d.confirmada, 0) * 100) / 100, 388.9)
  assert.equal(Math.round(r.porDia.reduce((s, d) => s + d.reconstruida, 0) * 100) / 100, r.reconstruida)
  assert.equal(r.novas.atual, 3)

  // ---------- Fila de atenção ----------
  const fila = m.filaDeAtencao({
    eventos: [{ id: 1, status_processamento: 'erro', recebido_em: '2026-10-17T10:00:00Z' }, { id: 2, status_processamento: 'erro', recebido_em: '2026-10-17T11:00:00Z' }, { id: 3, status_processamento: 'processado', recebido_em: '2026-10-17T12:00:00Z' }],
    lidosPagamento: new Set(['2']), assinaturas: [...assinaturas, assinatura('c', 'mensal', 'cartao', 1, { status: 'falha_pagamento' })],
    pendenciasConteudo: 0, novosParados: [], fontesIndisponiveis: ['sinais'], agora,
  })
  assert.equal(fila[0].id, 'processador', 'falha do processador vem primeiro (crítica)')
  assert.equal(fila[0].contagem, 1, 'aviso marcado como visto sai da contagem')
  assert.equal(fila[0].titulo, 'aviso do processador com falha')
  assert.ok(fila.some(i => i.id === 'fonte:sinais' && i.grupo === 'tecnico'), 'fonte que falhou vira item, nunca zero')
  assert.ok(fila.some(i => i.id === 'falha-pagamento'))
  assert.ok(!fila.some(i => i.id === 'conteudo'), 'contagem zero não entra na fila')
  for (let i = 1; i < fila.length; i++) assert.ok(m.ORDEM_SEVERIDADE[fila[i - 1].severidade] <= m.ORDEM_SEVERIDADE[fila[i].severidade], 'ordenada por severidade')

  // ---------- Frase do estado: só fatos medidos ----------
  const frase = m.fraseDoEstado({ online: 1, estudaramHoje: 3, questoes: m.variacao(120, 100), dias: 7, criticos: 1, pendentes: 2 })
  assert.match(frase, /1 pessoa online e 3 estudaram hoje/)
  assert.doesNotMatch(m.fraseDoEstado({ online: null, estudaramHoje: null, questoes: null, dias: 7, criticos: 0, pendentes: 0 }), /undefined|null|NaN/)

  console.log(`Painel 3.0: ${Object.keys(m.METRICAS).length} métricas documentadas, períodos, receita por qualidade e fila de atenção ok.`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}

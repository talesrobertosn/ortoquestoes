// Receita do painel (auditoria de 15/10/2026, T6.9): somarMeses trava no fim do mês (31/01 + 1 = 28/02),
// "vencida" sem cobrança não entra na receita, dia e mês contados em Brasília qualquer que seja o fuso
// do navegador, e as cobranças gravadas no banco (RPC cobrancas_admin) substituem a estimativa do Pix.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Mesmo esquema dos outros testes: React externo, saída dentro do node_modules do projeto.
const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-receita-'))
const arquivo = join(pasta, 'r.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/componentes/admin/receita'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, external: ['react', 'react-dom', 'react/*', 'react-dom/*'],
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const iso = (d) => d.toISOString()
  const sp = (texto) => new Date(`${texto}-03:00`) // horário de Brasília
  const mensal = m.precoDe('mensal').total, anual = m.precoDe('anual').total

  // O resultado não pode depender do fuso do navegador.
  for (const fuso of ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo', 'America/Los_Angeles']) {
    process.env.TZ = fuso

    // somarMeses: trava no último dia do mês de destino, guarda a hora, anda para trás também.
    assert.equal(iso(m.somarMeses(sp('2026-01-31T10:00:00'), 1)), iso(sp('2026-02-28T10:00:00')), `31/01 + 1 mês (${fuso})`)
    assert.equal(iso(m.somarMeses(sp('2028-01-31T10:00:00'), 1)), iso(sp('2028-02-29T10:00:00')), `bissexto (${fuso})`)
    assert.equal(iso(m.somarMeses(sp('2026-03-31T23:30:00'), -1)), iso(sp('2026-02-28T23:30:00')), `31/03 − 1 mês (${fuso})`)
    assert.equal(iso(m.somarMeses(sp('2026-05-31T00:10:00'), -1)), iso(sp('2026-04-30T00:10:00')), `31/05 − 1 mês (${fuso})`)
    assert.equal(iso(m.somarMeses(sp('2026-08-31T12:00:00'), 6)), iso(sp('2027-02-28T12:00:00')), `semestral (${fuso})`)
    assert.equal(iso(m.somarMeses(sp('2026-12-15T12:00:00'), 1)), iso(sp('2027-01-15T12:00:00')), `virada de ano (${fuso})`)
    assert.equal(iso(m.somarMeses(sp('2026-01-31T12:00:00'), -12)), iso(sp('2025-01-31T12:00:00')), `anual (${fuso})`)

    // Mês e dia de Brasília: 01/11 às 01h UTC ainda é 31/10 em Brasília.
    assert.equal(m.MES(new Date('2026-11-01T01:00:00Z')), '2026-10', `mês em Brasília (${fuso})`)
    assert.equal(m.DIA(new Date('2026-11-01T01:00:00Z')), '2026-10-31', `dia em Brasília (${fuso})`)
    assert.equal(m.MES(new Date('2026-11-01T03:00:00Z')), '2026-11')
    assert.equal(m.somarMesChave('2026-01', -1), '2025-12')
    assert.equal(m.somarMesChave('2026-11', 14), '2028-01')
    assert.equal(iso(m.inicioDoMes('2026-11')), '2026-11-01T03:00:00.000Z')
    assert.deepEqual(m.mesesEntre(sp('2026-10-15T12:00:00'), sp('2027-01-15T12:00:00')), ['2026-10', '2026-11', '2026-12', '2027-01'])
    assert.equal(m.NOME_MES('2026-10'), 'outubro de 2026')

    // Cartão mensal pago no dia 31: uma cobrança por mês, sem duas em março (o bug do setMonth).
    const cartao = { id_usuario: 'c', plano: 'mensal', status: 'ativa', meio: 'cartao', criada_em: iso(sp('2025-12-31T09:00:00')), ultima_cobranca_em: iso(sp('2026-03-31T09:00:00')), fim_periodo: iso(sp('2026-04-30T09:00:00')) }
    const lista = m.cobrancas([cartao])
    assert.deepEqual(lista.map(c => m.DIA(c.em)), ['2025-12-31', '2026-01-31', '2026-02-28', '2026-03-31'], `datas do cartão (${fuso})`)
    assert.deepEqual(lista.map(c => c.tipo), ['nova', 'renovacao', 'renovacao', 'renovacao'])
    // Só a última é a gravada; as anteriores são reconstruídas.
    assert.deepEqual(lista.map(c => c.estimada), [true, true, true, false])
    const meses = m.mesAMes([cartao], 12, sp('2026-04-10T12:00:00'))
    assert.equal(meses.length, 12)
    assert.equal(meses.at(-1).chave, '2026-04')
    assert.equal(meses[0].chave, '2025-05')
    for (const chave of ['2025-12', '2026-01', '2026-02', '2026-03']) assert.equal(meses.find(x => x.chave === chave).receita, mensal, `receita de ${chave} (${fuso})`)
    // Base do churn: o cartão conta no fim de dezembro em diante.
    assert.equal(meses.find(x => x.chave === '2025-11').baseCartao, 0)
    assert.equal(meses.find(x => x.chave === '2025-12').baseCartao, 1)

    // Pix pago às 23h de 31/10 em Brasília cai em outubro, não em novembro.
    const pix = { id_usuario: 'p', plano: 'mensal', status: 'ativa', meio: 'pix', cancelar_ao_fim: true, criada_em: '2026-11-01T02:00:00Z', inicio_periodo: '2026-11-01T02:00:00Z', ultima_cobranca_em: '2026-11-01T02:00:00Z', fim_periodo: '2026-12-01T02:00:00Z' }
    const mesesPix = m.mesAMes([pix], 3, sp('2026-11-10T12:00:00'))
    assert.equal(mesesPix.find(x => x.chave === '2026-10').receita, mensal, `Pix no mês de Brasília (${fuso})`)
    assert.equal(mesesPix.find(x => x.chave === '2026-11').receita, 0)

    // A previsão cobre o mês de hoje até o mês do limite (13 meses em 12) e renova no fim do mês certo.
    const renova = { id_usuario: 'r', plano: 'mensal', status: 'ativa', meio: 'cartao', cancelar_ao_fim: false, criada_em: iso(sp('2026-08-31T10:00:00')), ultima_cobranca_em: iso(sp('2026-08-31T10:00:00')), fim_periodo: iso(sp('2026-10-31T10:00:00')) }
    const prev = m.aReceberNoCartao([renova], 12, sp('2026-10-15T12:00:00'))
    assert.equal(prev.porMes.length, 13)
    assert.equal(prev.cobrancas, 12) // 31/10, 30/11, 31/12, ..., 30/09/2027 (a âncora não encolhe depois de fevereiro)
    assert.ok(prev.porMes.every(([, v]) => v.quantidade <= 1), `uma renovação por mês (${fuso})`)
  }
  process.env.TZ = 'UTC'

  // pagaSemCobranca: vencida sem cobrança nunca pagou; ativa e pausada sim; cancelada só com período longo.
  const sem = (status, extra = {}) => ({ id_usuario: 'x', plano: 'mensal', status, meio: 'cartao', criada_em: '2026-09-01T12:00:00Z', ...extra })
  assert.equal(m.pagaSemCobranca(sem('vencida')), false)
  assert.equal(m.pagaSemCobranca(sem('vencida', { fim_periodo: '2026-10-01T12:00:00Z' })), false)
  assert.equal(m.pagaSemCobranca(sem('pendente')), false)
  assert.equal(m.pagaSemCobranca(sem('falha_pagamento')), false)
  assert.equal(m.pagaSemCobranca(sem('ativa')), true)
  assert.equal(m.pagaSemCobranca(sem('pausada')), true)
  assert.equal(m.pagaSemCobranca(sem('cancelada', { fim_periodo: '2026-10-01T12:00:00Z' })), true)
  assert.equal(m.pagaSemCobranca(sem('cancelada', { fim_periodo: '2026-09-05T12:00:00Z' })), false)
  assert.equal(m.pagaSemCobranca(sem('ativa', { ultima_cobranca_em: '2026-09-01T12:00:00Z' })), false)
  assert.equal(m.cobrancas([sem('vencida')]).length, 0)
  const estimada = m.cobrancas([sem('ativa')])
  assert.equal(estimada.length, 1); assert.equal(estimada[0].estimada, true)

  // Reembolso tira a última cobrança.
  const reembolsada = { id_usuario: 'z', plano: 'mensal', status: 'reembolsada', meio: 'cartao', criada_em: '2026-08-10T12:00:00Z', ultima_cobranca_em: '2026-09-10T12:00:00Z', fim_periodo: '2026-09-12T12:00:00Z' }
  assert.deepEqual(m.cobrancas([reembolsada]).map(c => m.DIA(c.em)), ['2026-08-10'])

  // Cobranças gravadas (RPC cobrancas_admin): o Pix vem do banco, com valor e data reais; reembolsado não entra;
  // o cartão usa o valor contratado na última cobrança e nas reconstruídas; conta de teste (fora de
  // `assinaturas`) também fica fora daqui.
  const assinaturas = [
    { id_usuario: 'a', plano: 'mensal', status: 'ativa', meio: 'pix', cancelar_ao_fim: true, criada_em: '2026-10-01T12:00:00Z', ultima_cobranca_em: '2026-10-01T12:00:00Z', fim_periodo: '2026-11-01T12:00:00Z' },
    { id_usuario: 'a', plano: 'mensal', status: 'reembolsada', meio: 'pix', cancelar_ao_fim: true, criada_em: '2026-09-01T12:00:00Z', ultima_cobranca_em: '2026-09-01T12:00:00Z', fim_periodo: '2026-09-02T12:00:00Z' },
    { id_usuario: 'b', plano: 'anual', status: 'ativa', meio: 'cartao', criada_em: '2025-10-05T12:00:00Z', ultima_cobranca_em: '2026-10-05T12:00:00Z', fim_periodo: '2027-10-05T12:00:00Z' },
  ]
  const reais = [
    { id_usuario: 'a', plano: 'mensal', meio: 'pix', valor: 29.9, em: '2026-10-01T12:00:00Z', id_pagamento: '900', situacao: 'paga' },
    { id_usuario: 'a', plano: 'mensal', meio: 'pix', valor: '39.90', em: '2026-09-01T12:00:00Z', id_pagamento: '901', situacao: 'reembolsada' },
    { id_usuario: 'b', plano: 'anual', meio: 'cartao', valor: 199.9, em: '2026-10-05T12:00:00Z', id_pagamento: '555', situacao: 'paga' },
    { id_usuario: 'teste', plano: 'anual', meio: 'pix', valor: 239.9, em: '2026-10-02T12:00:00Z', id_pagamento: '777', situacao: 'paga' },
  ]
  const comReais = m.cobrancas(assinaturas, reais)
  assert.deepEqual(comReais.map(c => [c.id_usuario, c.meio, c.valor, c.estimada, c.id_pagamento ?? null]), [
    ['b', 'cartao', 199.9, true, null],
    ['a', 'pix', 29.9, false, '900'],
    ['b', 'cartao', 199.9, false, '555'],
  ])
  // Sem as gravadas, tudo pelo preço do plano (como antes).
  const semReais = m.cobrancas(assinaturas)
  assert.deepEqual(semReais.map(c => c.valor), [anual, mensal, anual])
  // Pix sem valor gravado cai no preço do plano e sai marcado como estimado.
  const semValor = m.cobrancas([assinaturas[0]], [{ ...reais[0], valor: null }])
  assert.equal(semValor[0].valor, mensal); assert.equal(semValor[0].estimada, true)
  // mesAMes aceita as gravadas.
  const mesesReais = m.mesAMes(assinaturas, 2, new Date('2026-10-20T12:00:00Z'), reais)
  assert.equal(mesesReais.find(x => x.chave === '2026-10').receita, 29.9 + 199.9)
  assert.equal(mesesReais.find(x => x.chave === '2026-09').receita, 0)
  assert.equal(mesesReais.find(x => x.chave === '2026-09').reembolsos, 1)

  // Nova, renovação ou volta pela pessoa (29/10/2026): no Pix cada renovação é uma assinatura nova no banco.
  {
    const pix = (id, pago, fim, plano = 'mensal') => ({ id_usuario: id, id_externo: `pix:${id}${pago}`, plano, status: 'ativa', inicio_periodo: pago, criada_em: pago, ultima_cobranca_em: pago, fim_periodo: fim, cancelar_ao_fim: true })
    const linhas = [
      pix('ana', '2026-09-04T12:00:00Z', '2026-10-04T12:00:00Z'),
      pix('ana', '2026-10-01T12:00:00Z', '2099-11-04T12:00:00Z'),   // renovou antes do fim
      pix('bia', '2026-01-10T12:00:00Z', '2026-02-10T12:00:00Z'),
      pix('bia', '2026-06-10T12:00:00Z', '2099-07-10T12:00:00Z'),   // voltou meses depois
      pix('caio', '2026-10-20T12:00:00Z', '2099-11-20T12:00:00Z'),  // primeira compra
    ]
    const tipos = (id) => m.cobrancas(linhas).filter(c => c.id_usuario === id).map(c => c.tipo)
    assert.deepEqual(tipos('ana'), ['nova', 'renovacao'], 'Pix renovado antes do fim é renovação')
    assert.deepEqual(tipos('bia'), ['nova', 'volta'], 'Pix pago meses depois do fim é volta')
    assert.deepEqual(tipos('caio'), ['nova'], 'primeira compra é nova')
    // Pix → cartão: a primeira cobrança do cartão é renovação, não nova.
    const cartao = { id_usuario: 'caio', id_externo: 'pre1', plano: 'mensal', status: 'ativa', inicio_periodo: '2026-11-18T12:00:00Z', criada_em: '2026-11-18T12:00:00Z', ultima_cobranca_em: '2026-11-20T12:00:00Z', fim_periodo: '2099-12-20T12:00:00Z', cancelar_ao_fim: false }
    assert.deepEqual(m.cobrancas([...linhas, cartao]).filter(c => c.id_usuario === 'caio').map(c => c.tipo), ['nova', 'renovacao'], 'Pix → cartão é renovação')
    // Pessoas com acesso: Ana tem dois períodos vigentes e conta uma vez; o cartão de Caio fica no lugar do Pix.
    const agoraMs = Date.parse('2026-10-02T12:00:00Z')
    assert.equal(linhas.filter(a => m.vigente(a, agoraMs)).length, 4, 'linhas vigentes')
    assert.equal(m.vigentesPorPessoa(linhas, agoraMs).length, 3, 'pessoas com acesso')
    assert.equal(m.vigentesPorPessoa([...linhas, cartao], Date.parse('2026-11-25T12:00:00Z')).find(a => a.id_usuario === 'caio').id_externo, 'pre1', 'cartão que renova vence o Pix')
  }

  console.log('Receita do painel: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

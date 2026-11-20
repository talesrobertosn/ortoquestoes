// "Recebido" do Agora com assinatura no cartão (20/11/2026): o id da assinatura sai de qualquer lugar em que o
// Mercado Pago o mande, a cobrança do cartão conta no valor e na contagem do dia, e a conciliação do painel
// respeita o intervalo de 15 minutos.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-cartao-'))
try {
  const saida = join(pasta, 'c.mjs')
  await build({
    stdin: {
      contents: [
        `export { assinaturaDoPagamento } from './supabase/functions/_shared/cobranca-mercado-pago.ts'`,
        `export { quadroDoDia } from './src/componentes/admin/agora'`,
        `export { conciliacaoVencida, INTERVALO_CONCILIACAO } from './src/componentes/admin/conciliarCartoes'`,
      ].join('\n'), resolveDir: process.cwd(), loader: 'ts',
    },
    outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error', external: ['react', 'react-dom', '@supabase/*'],
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false', 'import.meta.env.VITE_SUPABASE_URL': '""', 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '""', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '""' },
  })
  const m = await import(pathToFileURL(saida))

  // 1. Onde vem o id da assinatura.
  const id = '8b621b06b5834612b91c48cb635a947f'
  assert.equal(m.assinaturaDoPagamento({ id: 1, point_of_interaction: { type: 'SUBSCRIPTIONS', transaction_data: { subscription_id: id } } }), id, 'cobrança de assinatura: id em point_of_interaction')
  assert.equal(m.assinaturaDoPagamento({ id: 1, preapproval_id: id }), id)
  assert.equal(m.assinaturaDoPagamento({ id: 1, metadata: { preapproval_id: id } }), id)
  assert.equal(m.assinaturaDoPagamento({ id: 1, payment_method_id: 'pix' }), null, 'Pix avulso não é assinatura')

  // 2. Cobrança do cartão aprovada hoje entra no Recebido (valor e contagem), junto do Pix.
  const agora = Date.parse('2026-11-20T23:30:00Z') // 20h30 em Brasília
  const cobrancas = [
    { id_usuario: 'a', usuario: 'a@x', nome: 'A', plano: 'anual', meio: 'cartao', valor: 358.8, em: '2026-11-20T21:12:00Z', id_pagamento: '1', situacao: 'paga', id_assinatura: 'x' },
    { id_usuario: 'b', usuario: 'b@x', nome: 'B', plano: 'semestral', meio: 'pix', valor: 209.4, em: '2026-11-20T12:00:00Z', id_pagamento: '2', situacao: 'paga', id_assinatura: 'y' },
    { id_usuario: 'c', usuario: 'c@x', nome: 'C', plano: 'mensal', meio: 'cartao', valor: 39.9, em: '2026-11-19T12:00:00Z', id_pagamento: '3', situacao: 'paga', id_assinatura: 'z' },
  ]
  const q = m.quadroDoDia({ usuarios: [], sinais: [], serie: [], resumo: null, funil: null, assinaturas: null, cobrancas, agora })
  assert.equal(q.numeros.pagaram.hoje, 2)
  assert.equal(Math.round(q.numeros.valorPago.hoje * 100), 56820, 'R$ 358,80 do cartão + R$ 209,40 do Pix')
  assert.equal(q.numeros.pagaram.ontem, 1)
  // Às 22h12 de Brasília ainda é "hoje", mesmo já sendo 21/11 em UTC.
  const tarde = m.quadroDoDia({ usuarios: [], sinais: [], serie: [], resumo: null, funil: null, assinaturas: null, agora: Date.parse('2026-11-21T01:30:00Z'),
    cobrancas: [{ ...cobrancas[0], em: '2026-11-21T01:12:00Z' }] })
  assert.equal(tarde.hoje, '2026-11-20'); assert.equal(tarde.numeros.pagaram.hoje, 1)

  // 3. Conciliação: no máximo uma vez a cada 15 minutos.
  assert.ok(m.conciliacaoVencida(1_000_000, () => null), 'nunca conciliou: concilia')
  assert.ok(!m.conciliacaoVencida(1_000_000, () => String(1_000_000 - 60_000)), 'há 1 minuto: espera')
  assert.ok(m.conciliacaoVencida(1_000_000 + m.INTERVALO_CONCILIACAO, () => '1000000'))

  // 4. O webhook concilia na assinatura autorizada e tem a rota do painel.
  const webhook = await readFile('supabase/functions/webhook-mercado-pago/index.ts', 'utf8')
  assert.ok(webhook.includes("acao') === 'conciliar_cartoes'") && webhook.includes('conciliarCobrancaDoCartao(idRecurso, token)'))
  assert.ok(webhook.includes('assinaturaDoPagamento(pagamento)'))
  console.log('cobrança do cartão: id da assinatura em point_of_interaction, Recebido soma cartão e Pix no dia de Brasília, conciliação a cada 15 min')
} finally { await rm(pasta, { recursive: true, force: true }) }

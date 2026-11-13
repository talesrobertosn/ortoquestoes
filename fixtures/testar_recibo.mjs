// Recibo eletrônico (13/11/2026): formatação, número estável e quando o recibo existe (src/conta/recibo.ts).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-recibo-'))
try {
  const saida = join(pasta, 'r.mjs')
  await build({ entryPoints: ['src/conta/recibo.ts'], outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const r = await import(pathToFileURL(saida))
  const pix = { id_pagamento: '123456', plano: 'semestral', meio: 'pix', valor: '209.40', em: '2026-11-13T02:30:00Z', situacao: 'paga' }
  assert.equal(r.valorEmReais(pix.valor).replace(/\s/g, ' '), 'R$ 209,40')
  assert.equal(r.dataDoPagamento(pix.em), '12/11/2026', 'a data segue o fuso de Brasília')
  assert.equal(r.numeroRecibo(pix), 'OQ-PIX-123456')
  assert.equal(r.numeroRecibo({ ...pix, meio: 'cartao' }), 'OQ-CC-123456')
  assert.equal(r.nomePlano('anual'), 'Plano anual (12 meses)')
  assert.equal(r.nomeMeio('cartao'), 'Cartão de crédito')
  assert.ok(r.temRecibo(pix))
  assert.ok(!r.temRecibo({ ...pix, situacao: 'reembolsada' }), 'reembolsado não gera recibo')
  assert.ok(!r.temRecibo({ ...pix, valor: null }), 'sem valor, sem recibo')
  assert.ok(!r.temRecibo({ ...pix, em: null }), 'sem data, sem recibo')

  // O recebedor do recibo é o mesmo fornecedor das Condições da Assinatura (Cláusula 1.1).
  const condicoes = await readFile('src/paginas/CondicoesAssinatura.tsx', 'utf8')
  assert.ok(condicoes.includes(r.RECEBEDOR.nome) && condicoes.includes(r.RECEBEDOR.documento.replace('CPF ', '')), 'recebedor igual às Condições')
  assert.ok(condicoes.includes(r.RECEBEDOR.endereco.split(',')[0]), 'endereço igual às Condições')
  console.log('recibo: valor, data em Brasília, número estável, reembolsados sem recibo e recebedor igual às Condições')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

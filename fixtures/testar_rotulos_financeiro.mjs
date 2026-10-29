// Revisão do Financeiro (15/10/2026): nomes de planos, meios e situações num lugar só (rotulos.ts),
// a comparação com o mês anterior e a lista de cobranças devolvidas, que só aparece na tela e não
// muda nenhum total.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-rotulos-'))
const arquivo = join(pasta, 'r.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/componentes/admin/rotulos'\nexport { cobrancas, cobrancasReembolsadas, precoDe } from './src/componentes/admin/receita'\nexport { PLANOS as PLANOS_FORMATOS, STATUS_ASSINATURA as STATUS_FORMATOS } from './src/componentes/admin/formatos'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  })
  process.env.TZ = 'America/Sao_Paulo'
  const m = await import(pathToFileURL(arquivo))
  const agora = new Date('2026-10-15T12:00:00-03:00').getTime()
  const dia = (d) => new Date(agora + d * 86_400_000).toISOString()

  // Um lugar só: formatos.ts reexporta os mesmos objetos.
  assert.equal(m.PLANOS_FORMATOS, m.PLANOS)
  assert.equal(m.STATUS_FORMATOS, m.STATUS_ASSINATURA)
  assert.deepEqual(Object.values(m.PLANOS), ['Mensal', 'Semestral', 'Anual'])
  assert.equal(m.rotuloPlano('anual'), 'Anual')
  assert.equal(m.rotuloMeio('pix'), 'Pix')
  assert.equal(m.rotuloMeio('cartao'), 'Cartão')
  assert.equal(m.STATUS_ASSINATURA.vencida, 'Expirada')
  assert.equal(m.STATUS_ASSINATURA.pendente, 'Pendente')

  const s = (a) => m.situacaoAssinatura({ id_usuario: 'x', plano: 'mensal', ...a }, agora)
  // Cartão renovando.
  assert.deepEqual([s({ status: 'ativa', meio: 'cartao', fim_periodo: dia(10) }).rotulo, s({ status: 'ativa', meio: 'cartao', fim_periodo: dia(10) }).tom], ['Ativa', 'ok'])
  // Pediu cancelamento: ainda tem acesso até o fim do período.
  assert.equal(s({ status: 'ativa', meio: 'cartao', cancelar_ao_fim: true, cancelada_em: dia(-2), fim_periodo: '2026-11-03T15:00:00Z' }).rotulo, 'Cancelada (acesso até 03/11)')
  assert.equal(s({ status: 'cancelada', meio: 'cartao', cancelar_ao_fim: true, fim_periodo: '2026-11-03T15:00:00Z' }).chave, 'cancelada_com_acesso')
  assert.equal(s({ status: 'cancelada', meio: 'cartao', cancelar_ao_fim: true, fim_periodo: dia(-5) }).rotulo, 'Cancelada')
  // Pix: ativo é "Ativa"; depois do fim, "Expirada" (Pix não renova).
  assert.equal(s({ status: 'ativa', meio: 'pix', cancelar_ao_fim: true, fim_periodo: dia(20) }).rotulo, 'Ativa')
  assert.equal(s({ status: 'ativa', meio: 'pix', cancelar_ao_fim: true, fim_periodo: dia(-1) }).rotulo, 'Expirada')
  assert.equal(s({ status: 'vencida', meio: 'pix', fim_periodo: dia(-40) }).rotulo, 'Expirada')
  // Cartão com o período vencido e ainda "ativa": esperando a cobrança nova.
  assert.equal(s({ status: 'ativa', meio: 'cartao', fim_periodo: dia(-1) }).chave, 'aguardando_renovacao')
  for (const [status, rotulo] of [['pendente', 'Pendente'], ['reembolsada', 'Reembolsada'], ['falha_pagamento', 'Falha no pagamento'], ['pausada', 'Pausada']]) assert.equal(s({ status, meio: 'cartao' }).rotulo, rotulo)
  // A data certa no cartão da assinatura.
  assert.equal(m.proximaData({ id_usuario: 'x', plano: 'mensal', status: 'ativa', meio: 'cartao', fim_periodo: dia(10), proxima_cobranca: dia(10) }, agora).rotulo, 'Próxima cobrança')
  assert.equal(m.proximaData({ id_usuario: 'x', plano: 'mensal', status: 'ativa', meio: 'pix', cancelar_ao_fim: true, fim_periodo: dia(10) }, agora).rotulo, 'Acesso até')
  assert.equal(m.proximaData({ id_usuario: 'x', plano: 'mensal', status: 'vencida', meio: 'pix', fim_periodo: dia(-10) }, agora).rotulo, 'Acesso terminou em')
  // Antes, uma assinatura com falha ou vencida aparecia como "Próxima cobrança".
  assert.notEqual(m.proximaData({ id_usuario: 'x', plano: 'mensal', status: 'falha_pagamento', meio: 'cartao', fim_periodo: dia(-3) }, agora).rotulo, 'Próxima cobrança')

  // Tipos de cobrança.
  assert.equal(m.rotuloTipoCobranca({ meio: 'pix', tipo: 'nova' }), 'Assinatura nova')
  assert.equal(m.rotuloTipoCobranca({ meio: 'pix', tipo: 'renovacao' }), 'Renovação no Pix')
  assert.equal(m.rotuloTipoCobranca({ meio: 'pix', tipo: 'volta' }), 'Voltou a assinar')
  assert.equal(m.rotuloTipoCobranca({ meio: 'cartao', tipo: 'nova' }), 'Assinatura nova')
  assert.equal(m.rotuloTipoCobranca({ meio: 'cartao', tipo: 'renovacao' }), 'Renovação automática')

  // Comparação com o mês anterior.
  assert.deepEqual(m.compararMeses(110, 100), { delta: 10, pct: 10, sentido: 'sobe' })
  assert.deepEqual(m.compararMeses(0, 0), { delta: 0, pct: null, sentido: 'igual' })
  assert.deepEqual(m.compararMeses(3, 0), { delta: 3, pct: null, sentido: 'sobe' })
  assert.equal(m.compararMeses(1, 4).sentido, 'desce')

  // Cobranças devolvidas: aparecem na lista, nunca nos totais.
  const assinaturas = [
    { id_usuario: 'p', plano: 'anual', status: 'reembolsada', meio: 'pix', cancelar_ao_fim: true, criada_em: dia(-10), fim_periodo: dia(-8), ultima_cobranca_em: dia(-10) },
    { id_usuario: 'c', plano: 'mensal', status: 'reembolsada', meio: 'cartao', criada_em: dia(-65), fim_periodo: dia(-3), ultima_cobranca_em: dia(-5) },
    { id_usuario: 'n', plano: 'mensal', status: 'ativa', meio: 'cartao', criada_em: dia(-5), fim_periodo: dia(25), ultima_cobranca_em: dia(-5) },
  ]
  const reais = [
    { id_usuario: 'p', plano: 'anual', meio: 'pix', valor: 199.9, em: dia(-10), id_pagamento: '99', situacao: 'reembolsada' },
    { id_usuario: 'n', plano: 'mensal', meio: 'cartao', valor: 39.9, em: dia(-5), id_pagamento: '98', situacao: 'paga' },
    { id_usuario: 'fora', plano: 'anual', meio: 'pix', valor: 239.9, em: dia(-1), id_pagamento: '97', situacao: 'reembolsada' },
  ]
  const devolvidas = m.cobrancasReembolsadas(assinaturas, reais)
  assert.deepEqual(devolvidas.map(c => [c.id_usuario, c.meio, c.valor]), [['p', 'pix', 199.9], ['c', 'cartao', m.precoDe('mensal').total]])
  // A do cartão era a 3ª mensalidade (criada há 65 dias): uma renovação, não a assinatura nova.
  assert.equal(devolvidas[1].tipo, 'renovacao')
  assert.ok(devolvidas.every(c => c.reembolsadaEm instanceof Date))
  // Sem a RPC, o Pix reembolsado sai da própria assinatura.
  assert.deepEqual(m.cobrancasReembolsadas(assinaturas, null).map(c => c.id_usuario), ['p', 'c'])
  // Os totais continuam sem as devolvidas (nenhuma conta mudou).
  const pagas = m.cobrancas(assinaturas, reais)
  assert.ok(!pagas.some(c => c.id_usuario === 'p'))
  assert.ok(!pagas.some(c => c.id_usuario === 'c' && c.em.getTime() === new Date(dia(-5)).getTime()))

  console.log('Rótulos do Financeiro: planos, situações, comparação e cobranças devolvidas ok.')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

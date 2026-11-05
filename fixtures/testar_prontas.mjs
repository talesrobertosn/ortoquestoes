// E-mails › Prontas para enviar (05/11/2026): a carta certa para cada pessoa, sem envio automático.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-prontas-'))
const arquivo = join(pasta, 'p.mjs')
try {
  await build({ stdin: { contents: `export * from './src/admin/dados/prontas'`, resolveDir: process.cwd(), loader: 'ts' }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const agora = new Date('2026-11-20T15:00:00-03:00'), dia = 86_400_000
  const iso = d => new Date(agora.getTime() - d * dia).toISOString()
  const base = (x) => ({ email: `${x.id}@exemplo.com`, nome: x.nome, confirmado: true, quer_cartas: true, novidades: true, administrador: false, criado_em: iso(60), dias_conta: 60, ultima_atividade: iso(1), dias_parado: 1, emails: { ultimo_em: null, n7: 0, n30: 0, lista: [] }, ...x.d })
  const areas = [{ slug: 'mao', total: 60, certas: 51 }, { slug: 'quadril', total: 50, certas: 30 }, { slug: 'coluna', total: 40, certas: 24 }]
  const linhas = [
    { id_usuario: 'a', dados: base({ id: 'a', nome: 'Ana Souza', d: { assinante: true, respondidas: 150, acertos: 105, erros: 45, areas } }), bloqueio: null },
    { id_usuario: 'b', dados: base({ id: 'b', nome: 'Bruno Lima', d: { assinante: false, respondidas: 80, acertos: 56, erros: 24, areas } }), bloqueio: null },
    { id_usuario: 'c', dados: base({ id: 'c', nome: 'Carla', d: { assinante: false, novidades: false, respondidas: 80, acertos: 56, erros: 24, areas } }), bloqueio: null },
    { id_usuario: 'd', dados: base({ id: 'd', nome: 'Davi', d: { respondidas: 30, ultima_atividade: iso(15), dias_parado: 15 } }), bloqueio: null },
    { id_usuario: 'e', dados: base({ id: 'e', nome: 'Não confirmou', d: { confirmado: false, respondidas: 5 } }), bloqueio: null },
    { id_usuario: 'f', dados: base({ id: 'f', nome: 'Desligou', d: { quer_cartas: false, respondidas: 5 } }), bloqueio: 'nao_quer_cartas' },
    { id_usuario: 'g', dados: base({ id: 'g', nome: 'Admin', d: { administrador: true, respondidas: 500 } }), bloqueio: null },
  ]
  const r = m.montarProntas(linhas, { agora, site: 'https://ortoquestoes.com.br/' })
  const por = Object.fromEntries(r.map(x => [x.id, x]))
  assert.deepEqual(Object.keys(por).sort(), ['a', 'b', 'c', 'd'], 'só quem pode receber')
  assert.equal(por.a.grupo, 'assinantes'); assert.equal(por.b.grupo, 'gratuitos')
  assert.equal(por.a.acerto, 70); assert.match(por.a.melhorArea, /mão e punho \(85%\)/)
  assert.equal(por.b.carta.tipo, 'convite_50')
  assert.ok(!por.c.carta.tipo.startsWith('convite'), 'sem aceite de novidades não recebe convite'); assert.match(por.c.motivo, /sem convite/)
  assert.equal(por.d.carta.tipo, 'sumiu')
  for (const x of r) { assert.ok(x.carta.assunto && x.carta.corpo.length > 80, x.id); assert.ok(!/R\$/.test(x.carta.corpo), 'sem preço') }
  // A mesma pessoa no mesmo dia recebe o mesmo texto (não muda a cada recarga).
  assert.equal(m.montarProntas(linhas, { agora })[0].carta.versao, m.montarProntas(linhas, { agora })[0].carta.versao)
  // Quem recebeu a mesma carta há pouco não aparece de novo com ela.
  const jaRecebeu = [{ ...linhas[1], dados: { ...linhas[1].dados, emails: { ultimo_em: iso(1), n7: 1, n30: 1, lista: [{ tipo: 'carta', modelo: 'convite_50:70-80', versao: 'convite_50:70-80#v1', em: iso(1), status: 'enviado' }] } } }]
  assert.ok(!m.montarProntas(jaRecebeu, { agora }).some(x => x.carta.tipo === 'convite_50'))
  // 05/11/2026: o acesso terminou (volte) e o assinante em risco de parar.
  const novas = m.montarProntas([
    { id_usuario: 'h', dados: base({ id: 'h', nome: 'Helena Prado', d: { assinante: false, respondidas: 340, acertos: 245, erros: 95, areas, fim_acesso: iso(6), ultima_atividade: iso(7), dias_parado: 7 } }), bloqueio: null },
    { id_usuario: 'i', dados: base({ id: 'i', nome: 'Igor Melo', d: { assinante: false, respondidas: 340, acertos: 245, erros: 95, areas, fim_acesso: iso(45), ultima_atividade: iso(46), dias_parado: 46 } }), bloqueio: null },
    { id_usuario: 'j', dados: base({ id: 'j', nome: 'Júlia Reis', d: { assinante: true, respondidas: 900, acertos: 650, erros: 250, semana: 0, areas, ultima_atividade: iso(12), dias_parado: 12, criado_em: iso(90), fim_acesso: new Date(agora.getTime() + 2 * dia).toISOString(), renova_sozinho: false, emails: { ultimo_em: iso(40), n7: 0, n30: 0, lista: [{ tipo: 'carta', modelo: 'obrigado_assinatura', em: iso(40), status: 'enviado' }] } } }), bloqueio: null },
    { id_usuario: 'k', dados: base({ id: 'k', nome: 'Kaio Lopes', d: { assinante: true, respondidas: 900, acertos: 650, erros: 250, semana: 120, areas, renova_sozinho: true, fim_acesso: new Date(agora.getTime() + 20 * dia).toISOString(), emails: { ultimo_em: iso(40), n7: 0, n30: 0, lista: [{ tipo: 'carta', modelo: 'obrigado_assinatura', em: iso(40), status: 'enviado' }] } } }), bloqueio: null },
  ], { agora })
  const pn = Object.fromEntries(novas.map(x => [x.id, x]))
  assert.equal(pn.h.carta.tipo, 'acesso_terminou'); assert.match(pn.h.carta.corpo, /terminou há 6 dias|terminou/); assert.match(pn.h.carta.corpo, /#\/assinatura/)
  assert.notEqual(pn.i?.carta.tipo, 'acesso_terminou', 'terminou há mais de 30 dias: não')
  assert.equal(pn.j.carta.tipo, 'como_estao'); assert.equal(pn.j.risco, 'alto'); assert.ok(!/cancel/i.test(pn.j.carta.corpo), 'nunca fala em cancelar')
  assert.match(pn.j.carta.corpo, /se somam ao novo mês/)
  assert.notEqual(pn.k.carta.tipo, 'como_estao', 'estudando bem: não é risco')
  for (const x of novas) { const linhas = x.carta.corpo.split('\n').filter(Boolean).length; assert.ok(linhas >= 4 && linhas <= 12, `${x.id}: ${linhas} linhas`) }
  console.log('Cartas prontas: tipo certo por pessoa, travas, sem convite sem aceite, acerto e melhor área ok.')
  for (const x of [pn.h, pn.j]) console.log('\n--- ' + x.carta.tipo + ' (' + x.carta.versao + ')\nAssunto: ' + x.carta.assunto + '\n' + x.carta.corpo)
} finally { await rm(pasta, { recursive: true, force: true }) }

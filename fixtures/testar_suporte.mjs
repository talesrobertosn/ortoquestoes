// Suporte (03/11/2026): motivos, perguntas de um toque e o e-mail que chega ao Tales.
// Regras em src/conta/suporte.ts (página) e supabase/functions/suporte/carta.ts (e-mail).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-suporte-'))
try {
  const carregar = async (arquivo) => {
    const saida = join(pasta, arquivo.replace(/\W/g, '_') + '.mjs')
    await build({ entryPoints: [arquivo], outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
    return import(pathToFileURL(saida))
  }
  const s = await carregar('src/conta/suporte.ts')
  const c = await carregar('supabase/functions/suporte/carta.ts')

  // Página e função conhecem os mesmos motivos, com os mesmos títulos.
  assert.deepEqual(Object.fromEntries(s.MOTIVOS.map((m) => [m.id, m.titulo])), c.MOTIVOS_SUPORTE)
  assert.equal(s.MOTIVOS[0].id, 'pagar', 'Não conseguir pagar vem primeiro')
  for (const m of s.MOTIVOS) assert.ok(m.exemplo.startsWith('Ex.:') && m.dicas.length, m.id)

  // Links que já existem no site abrem o motivo certo.
  const abre = (q) => s.motivoInicial(new URLSearchParams(q))
  assert.equal(abre('assunto=assinatura'), 'assinatura')
  assert.equal(abre('assunto=pagar'), 'pagar')
  assert.equal(abre('assunto=exclusao-conta'), 'dados')
  assert.equal(abre('assunto=sincronizacao'), 'acesso')
  assert.equal(abre('questao=mao-0853'), 'questao')
  assert.equal(abre('assunto=direitos-autorais'), 'direitos')
  assert.equal(abre(''), 'outro')

  // Perguntas de um toque: só nos motivos de pagamento, e só as respondidas.
  assert.deepEqual(s.camposDoMotivo('pagar', { plano: 'Anual', meio: 'Pix' }), [['Plano', 'Anual'], ['Pagamento', 'Pix']])
  assert.deepEqual(s.camposDoMotivo('pagar', { plano: '', meio: 'Cartão' }), [['Pagamento', 'Cartão']])
  assert.deepEqual(s.camposDoMotivo('acesso', { plano: 'Anual', meio: 'Pix' }), [])
  assert.deepEqual(s.camposDoMotivo('questao', { questao: ' mao-0853 ' }), [['Questão', 'mao-0853']])
  assert.equal(s.assuntoSuporte('pagar', 'Maria Souza'), '[Suporte] Não consegui assinar ou pagar · Maria Souza')
  assert.equal(s.assuntoSuporte('questao', '', 'mao-0853'), '[Suporte] Erro na questão mao-0853')
  assert.equal(s.assuntoSuporte('dados', 'Ana', undefined, true), '[Suporte] Pedido de exclusão da conta · Ana')

  // Situação da assinatura em uma linha.
  const agora = Date.parse('2026-11-03T15:00:00Z')
  assert.equal(c.descreverSituacao(null), 'Sem assinatura')
  assert.equal(c.descreverSituacao({ plano: 'anual', status: 'ativa', id_externo: 'preap1', fim_periodo: '2027-11-05T12:00:00Z', cancelar_ao_fim: false }, true, agora), 'Anual no cartão · ativa até 05/11/2027 · preço antigo garantido')
  assert.equal(c.descreverSituacao({ plano: 'semestral', status: 'ativa', id_externo: 'pix:abc', fim_periodo: '2026-10-01T12:00:00Z' }, false, agora), 'Semestral no Pix · terminou em 01/10/2026')
  assert.equal(c.descreverSituacao({ plano: 'mensal', status: 'ativa', id_externo: 'preap2', fim_periodo: '2026-12-01T12:00:00Z', cancelar_ao_fim: true }, false, agora), 'Mensal no cartão · ativa até 01/12/2026, sem renovar')
  assert.equal(c.descreverSituacao({ plano: 'anual', status: 'falha_pagamento', id_externo: 'preap3', fim_periodo: null }, false, agora), 'Anual no cartão · cobrança recusada')

  // O e-mail: título, quem escreveu, fichas, mensagem escapada e botão de responder.
  const carta = c.montarCarta({
    motivo: 'pagar', assunto: '[Suporte] Não consegui assinar ou pagar · Maria', mensagem: 'Cliquei em <Gerar Pix> e deu erro.\nDuas vezes.',
    email: 'maria@exemplo.com', nome: 'Maria Souza', campos: [['Plano', 'Anual'], ['Pagamento', 'Pix']], situacao: 'Sem assinatura',
    detalhes: [['Página', 'https://ortoquestoes.com.br/#/assinatura']],
  })
  for (const trecho of ['Não consegui assinar ou pagar', 'Maria Souza · maria@exemplo.com', '<b>Plano:</b> Anual', '<b>Pagamento:</b> Pix', '<b>Conta:</b> Sem assinatura', 'Responder a Maria', 'mailto:maria%40exemplo.com?subject=Re%3A%20']) assert.ok(carta.html.includes(trecho), trecho)
  assert.ok(carta.html.includes('&lt;Gerar Pix&gt;') && !carta.html.includes('<Gerar Pix>'), 'Mensagem sem escapar')
  assert.ok(carta.texto.includes('Plano: Anual') && carta.texto.includes('Cliquei em <Gerar Pix>'))

  // Imagens: reduzidas na página, conferidas na função, com os mesmos limites.
  assert.equal(s.MAX_IMAGENS, c.MAX_IMAGENS)
  assert.deepEqual(s.medidaReduzida(3200, 1600), { largura: 1600, altura: 800 })
  assert.deepEqual(s.medidaReduzida(1170, 2532), { largura: 739, altura: 1600 })
  assert.deepEqual(s.medidaReduzida(800, 600), { largura: 800, altura: 600 })
  const png = Buffer.from('imagem de teste').toString('base64')
  assert.deepEqual(c.conferirAnexos(undefined), { anexos: [] })
  assert.deepEqual(c.conferirAnexos([{ nome: 'Captura de Tela 2026-11-03 às 10.21.png', tipo: 'image/png', base64: png }]).anexos, [{ filename: 'Captura-de-Tela-2026-11-03-as-10-21.png', content: png }])
  assert.equal(c.conferirAnexos([{ nome: '', tipo: 'image/jpeg', base64: png }]).anexos[0].filename, 'imagem-1.jpg')
  assert.equal(c.conferirAnexos([{ nome: 'x.pdf', tipo: 'application/pdf', base64: png }]).erro, 'anexo_invalido', 'Só imagem passa')
  assert.equal(c.conferirAnexos([{ nome: 'x', tipo: 'image/png', base64: 'não é base64!' }]).erro, 'anexo_invalido')
  assert.equal(c.conferirAnexos(Array(4).fill({ nome: 'x', tipo: 'image/png', base64: png })).erro, 'anexos_demais')
  assert.equal(c.conferirAnexos([{ nome: 'x', tipo: 'image/png', base64: 'A'.repeat(2_700_000) }]).erro, 'anexo_grande')
  assert.equal(c.conferirAnexos([1, 2, 3].map(() => ({ nome: 'x', tipo: 'image/png', base64: 'A'.repeat(2_600_000) }))).erro, 'anexo_grande', 'Total acima de 5 MB')
  for (const codigo of ['anexos_demais', 'anexo_grande', 'anexo_invalido']) assert.ok(s.AVISOS_IMAGEM[codigo], codigo)
  const comImagens = c.montarCarta({ motivo: 'pagar', assunto: 'x', mensagem: 'Teste com print.', email: 'a@b.com', nome: '', campos: [], situacao: 'Sem assinatura', detalhes: [], imagens: ['print.png', 'erro.png'] })
  assert.ok(comImagens.html.includes('<b>Anexos:</b> 2 imagens') && comImagens.texto.includes('Anexos: 2 imagens'))
  if (process.env.PRINTS) await writeFile(join(process.env.PRINTS, 'email-suporte.html'), carta.html)
  console.log(`suporte: ${s.MOTIVOS.length} motivos, perguntas de um toque, situação da conta, imagens e e-mail conferidos`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}

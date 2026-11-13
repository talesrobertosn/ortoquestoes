// Nota de 1 a 10 dos comentários (13/11/2026): faixas do painel, valor das avaliações antigas e cores da régua.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-notas-'))
try {
  const saida = join(pasta, 'n.mjs')
  await build({ entryPoints: ['src/dados/notasComentario.ts'], outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const n = await import(pathToFileURL(saida))
  const r = (media, num, minima = Math.floor(media), mensagens = 0, desvio = 0) => ({ n: num, media, minima, desvio, mensagens })
  assert.equal(n.faixaDaNota(r(5.4, 3)), 'prioridade', 'média baixa com 3 notas')
  assert.equal(n.faixaDaNota(r(8, 1, 2, 1)), 'prioridade', 'nota 1 a 3 com mensagem')
  assert.equal(n.faixaDaNota(r(8, 1, 2, 0)), 'atencao', 'nota baixa sem mensagem, poucas notas')
  assert.equal(n.faixaDaNota(r(9.5, 2, 9)), 'post', 'média 9+ com 2 notas vira sugestão de post')
  assert.equal(n.faixaDaNota(r(9.5, 1, 9)), 'normal', 'uma nota só não vira post')
  assert.equal(n.faixaDaNota(r(7, 4, 6)), 'atencao', 'média abaixo de 7,5')
  assert.equal(n.faixaDaNota(r(8, 4, 3, 0, 3.2)), 'atencao', 'notas muito espalhadas')
  assert.equal(n.faixaDaNota(r(8.4, 5, 7)), 'normal')
  assert.equal(n.valorDaAvaliacao({ util: true }), 8, '"Ajudou" antigo vale 8')
  assert.equal(n.valorDaAvaliacao({ util: false }), 3, '"Não ajudou" antigo vale 3')
  assert.equal(n.valorDaAvaliacao({ util: false, nota: 6 }), 6, 'a nota vale mais que o util')
  assert.ok(n.ajudouComNota(6) && !n.ajudouComNota(5), 'util = nota 6 ou mais')
  assert.equal(n.NOTA_PEDE_MOTIVO, 5)
  assert.ok(n.corDaNota(1).startsWith('hsl(4 ') && n.corDaNota(10).startsWith('hsl(150 '), 'do vermelho ao verde')
  const ordem = n.ordenarResumos([{ id_questao: 'a', media: 9.2, n: 2 }, { id_questao: 'b', media: 9.8, n: 3 }], 'post').map((x) => x.id_questao)
  assert.deepEqual(ordem, ['b', 'a'], 'sugestões de post: as melhores primeiro')
  assert.equal(n.mediaFormatada(7.25).replace('.', ','), '7,3')
  // Motivos da régua cabem na restrição do banco.
  const sql = await readFile('supabase/migrations/20261113040000_nota_comentarios.sql', 'utf8')
  for (const [m] of n.MOTIVOS_NOTA) assert.ok(sql.includes(`'${m}'`), `motivo ${m} aceito no banco`)
  console.log('notas dos comentários: faixas, avaliações antigas, régua e motivos do banco conferidos')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

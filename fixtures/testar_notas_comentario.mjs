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
  // Painel das notas (14/11/2026): só nota ruim avisa; distribuição, saldo, semanas e reescritas.
  assert.ok(n.ehNotaRuim({ util: false, nota: 5 }) && !n.ehNotaRuim({ util: true, nota: 6 }) && n.ehNotaRuim({ util: false }), 'nota ruim = 5 ou menos')
  const d = n.distribuicaoNotas([{ nota: 10 }, { nota: 9 }, { nota: 9 }, { nota: 3 }, { util: true }].map((x) => ({ id_questao: 'q', util: (x.nota ?? 8) >= 6, atualizado_em: '2026-11-10T12:00:00Z', ...x })))
  assert.deepEqual(d.contagem, [0, 0, 1, 0, 0, 0, 0, 0, 2, 1]); assert.equal(d.semNota, 1); assert.equal(d.total, 4)
  assert.equal(n.saldoNotas(d.contagem), 50, '3 fãs e 1 crítico em 4 = 50')
  assert.equal(n.saldoNotas(Array(10).fill(0)), null)
  assert.equal(n.notaMaisComum(d.contagem), 9)
  const sem = n.notasPorSemana([{ id_questao: 'q', util: true, nota: 8, atualizado_em: '2026-11-12T12:00:00' }, { id_questao: 'q', util: false, nota: 2, atualizado_em: '2026-11-03T12:00:00' }], 3, new Date('2026-11-14T12:00:00'))
  assert.deepEqual(sem.map((x) => [x.n, x.media, x.ruins]), [[0, null, 0], [1, 2, 1], [1, 8, 0]], 'semanas de segunda a domingo')
  const g = n.resumoGeral([{ n: 2, media: 9 }, { n: 1, media: '6' }])
  assert.equal(g.media, 8); assert.equal(g.notas, 3); assert.equal(g.questoes, 2)
  assert.deepEqual(n.motivosSomados([{ motivos: { raso: 2 } }, { motivos: { raso: 1, confuso: 4 } }]), [['confuso', 4], ['raso', 3]])
  const re = n.efeitoReescritas([{ id_questao: 'x', versoes: [{ comentario_em: null, n: 3, media: 5 }, { comentario_em: '2026-11-13', n: 2, media: '8.5' }] }, { id_questao: 'y', versoes: [{ comentario_em: null, n: 1, media: 7 }] }])
  assert.equal(re.length, 1); assert.equal(re[0].ganho, 3.5)
  assert.equal(n.mediaFormatada(7.25).replace('.', ','), '7,3')
  // Motivos da régua cabem na restrição do banco.
  const sql = await readFile('supabase/migrations/20261113040000_nota_comentarios.sql', 'utf8')
  for (const [m] of n.MOTIVOS_NOTA) assert.ok(sql.includes(`'${m}'`), `motivo ${m} aceito no banco`)
  console.log('notas dos comentários: faixas, avaliações antigas, régua e motivos do banco conferidos')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

// O Salão dos Cem (ranking das questões, 31/10/2026): metas, movimento, chamas e cerimônia só com dados reais.
// A lógica está em src/componentes/cem/regras.ts.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'ortoquestoes-cem-'))
try {
  const saida = join(pasta, 'regras.mjs')
  await build({ entryPoints: ['src/componentes/cem/regras.ts'], outfile: saida, bundle: true, platform: 'node', format: 'esm' })
  const m = await import(pathToFileURL(saida))
  const linha = (posicao, total, extra = {}) => ({ posicao, apelido: `P${posicao}`, total, total_geral: total, eh_voce: false, variacao: 0, variacao_semana: 0, novo: false, referencia_em: '2026-10-30', ...extra })
  const lista = Array.from({ length: 100 }, (_, i) => linha(i + 1, 1000 - i * 5))

  // Meta: passar quem está logo acima precisa de uma questão a mais (desempate pela conta mais antiga).
  const m9 = m.proximaMeta(lista, { posicao: 9, total: 960 })
  assert.equal(m9.tipo, 'passar'); assert.equal(m9.posicao, 8); assert.equal(m9.faltam, 6); assert.equal(m9.alvo, 966)
  // Empate com quem está acima: falta exatamente uma.
  assert.equal(m.proximaMeta([linha(1, 50), linha(2, 50)], { posicao: 2, total: 50 }).faltam, 1)
  // Líder: nada inventado, só a vantagem sobre o segundo (ou o desempate).
  const l = m.proximaMeta(lista, { posicao: 1, total: 1000 })
  assert.equal(l.tipo, 'lider'); assert.equal(l.vantagem, 5); assert.equal(l.segundo, 'P2')
  assert.equal(m.proximaMeta([linha(1, 10)], { posicao: 1, total: 10 }).vantagem, null)
  // Fora do top 100: a meta é entrar no Top 100 (a última vaga real da lista).
  const fora = m.proximaMeta([...lista, linha(137, 300, { eh_voce: true })], { posicao: 137, total: 300 })
  assert.equal(fora.tipo, 'entrar'); assert.equal(fora.top, 100); assert.equal(fora.faltam, 1000 - 99 * 5 - 300 + 1)
  // Lista só com o top 50 (visitante ou servidor antigo): a meta vira o Top 50.
  assert.equal(m.proximaMeta(lista.slice(0, 50), { posicao: 70, total: 10 }).top, 50)
  assert.equal(m.proximaMeta([], { posicao: 4, total: 10 }).tipo, 'nenhuma')

  // Progresso: entre quem está abaixo e o alvo, sempre visível (4%) e nunca "pronto" antes da hora (98%).
  assert.equal(m.progressoMeta(960, 966, 955), 5 / 11)
  assert.equal(m.progressoMeta(0, 5, null), 0.04)
  assert.ok(m.progressoMeta(965, 966, 0) <= 0.98)

  // Chamas: 3+ posições no dia ou 5+ na semana, nada além disso.
  assert.equal(m.emChamas({ variacao: 3, variacao_semana: 0 }), true)
  assert.equal(m.emChamas({ variacao: 2, variacao_semana: 4 }), false)
  assert.equal(m.emChamas({ variacao: 0, variacao_semana: 5 }), true)
  assert.equal(m.emChamas({ variacao: null, variacao_semana: null }), false)

  // Movimento: novo, sem histórico, igual, subiu e desceu, com descrição para o leitor de tela.
  assert.equal(m.movimento(linha(5, 1, { novo: true })).tipo, 'novo')
  assert.equal(m.movimento(linha(5, 1, { referencia_em: null })).tipo, 'sem-historico')
  assert.equal(m.movimento(linha(5, 1)).tipo, 'igual')
  const sobe = m.movimento(linha(5, 1, { variacao: 4 }))
  assert.equal(sobe.tipo, 'subiu'); assert.equal(sobe.quantidade, 4); assert.ok(sobe.fogo); assert.match(sobe.descricao, /Subiu 4 posições desde 30\/10/)
  assert.equal(m.movimento(linha(5, 1, { variacao: -2 })).tipo, 'desceu')

  // Escadaria: até três, pelo salto do dia e, sem ele, pela semana (com a chama só pela regra real).
  const esc = m.ascensao([linha(10, 1, { variacao: 2 }), linha(4, 1, { variacao: 6 }), linha(20, 1, { variacao_semana: 7 }), linha(30, 1, { variacao: 1 }), linha(31, 1, { variacao: -3 })])
  assert.deepEqual(esc.map((s) => s.linha.posicao), [4, 10, 30])
  assert.equal(esc[0].de, 10); assert.equal(esc[0].para, 4); assert.equal(esc[0].quando, 'hoje'); assert.ok(esc[0].fogo)
  assert.equal(m.ascensao([linha(20, 1, { variacao_semana: 7 })])[0].quando, 'na semana')
  assert.equal(m.ascensao([linha(1, 1)]).length, 0)

  // Cerimônia: só com um líder guardado antes e diferente (a primeira visita só guarda).
  assert.equal(m.novoCampeao(null, 'Ana'), false)
  assert.equal(m.novoCampeao('Ana', 'Ana'), false)
  assert.equal(m.novoCampeao('Ana', 'Bia'), true)
  assert.equal(m.novoCampeao('Ana', null), false)

  assert.equal(m.nQuestoes(1), 'uma questão'); assert.equal(m.nQuestoes(3), 'três questões'); assert.equal(m.nQuestoes(1234), '1.234 questões')
  assert.equal(m.iniciais('Marina A.'), 'MA'); assert.equal(m.iniciais(' '), '?')
  console.log('salão dos cem: metas, movimento, chamas, escadaria e cerimônia ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

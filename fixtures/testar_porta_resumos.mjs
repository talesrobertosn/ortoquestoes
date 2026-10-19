// Porta do leitor dos resumos (19/10/2026): visitante lê as 6 primeiras partes; com conta, tudo.
// A lógica está em src/biblioteca/porta.ts; o destino da volta passa pelo filtro de src/conta/passagem.ts.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'ortoquestoes-porta-'))
try {
  const saida = join(pasta, 'porta.mjs'), saidaVoltar = join(pasta, 'passagem.mjs')
  await build({ entryPoints: ['src/biblioteca/porta.ts'], outfile: saida, bundle: true, platform: 'node', format: 'esm' })
  await build({ entryPoints: ['src/conta/passagem.ts'], outfile: saidaVoltar, bundle: true, platform: 'node', format: 'esm' })
  const m = await import(pathToFileURL(saida))
  const passagem = await import(pathToFileURL(saidaVoltar))
  assert.equal(m.SECOES_ABERTAS, 6)

  const cap = JSON.parse(await readFile('public/biblioteca/capitulos/rockwood10-65-tornozelo.json', 'utf8'))
  const secoes = cap.secoes
  assert.ok(secoes.length > 6, 'o capítulo de exemplo precisa ter mais de 6 partes')

  // Com conta (grátis ou assinante): todas as partes, sem porta, mesmo com link para a parte 9.
  const conta = m.calcularPorta(secoes, false, `h-${secoes[8].id}`)
  assert.deepEqual([conta.abertas, conta.fechado, conta.pedida, conta.primeiraFechada], [secoes.length, false, null, null])
  assert.ok(secoes.every((_, i) => m.secaoAberta(conta, i)))

  // Visitante: 6 abertas, a 7ª é a primeira fechada.
  const vis = m.calcularPorta(secoes, true, null)
  assert.equal(vis.abertas, 6)
  assert.equal(vis.fechado, true)
  assert.equal(vis.primeiraFechada.id, secoes[6].id)
  assert.equal(vis.pedida, null)
  assert.deepEqual(secoes.map((_, i) => m.secaoAberta(vis, i)), secoes.map((_, i) => i < 6))
  assert.equal(m.voltarDaPorta(cap.id, vis), `/resumos/${cap.id}?bloco=${encodeURIComponent(`h-${secoes[6].id}`)}`)
  const criar = m.linkDaPorta('criar', cap.id, vis)
  assert.ok(criar.startsWith('/conta?modo=criar&voltar=%2Fresumos%2F'))
  const voltar = new URLSearchParams(criar.split('?')[1]).get('voltar')
  assert.equal(decodeURIComponent(voltar), `/resumos/${cap.id}?bloco=h-${secoes[6].id}`)
  assert.equal(passagem.rotaVoltar(voltar), voltar, 'a conta aceita o destino da porta')
  assert.ok(m.linkDaPorta('entrar', cap.id, vis).startsWith('/conta?modo=entrar&voltar='))

  // Link (?bloco=) para um parágrafo dentro da parte 9 (o convite da questão): a porta diz qual parte.
  const bloco9 = (secoes[8].blocos.find((b) => b.t) ?? secoes[8].blocos[0]).id
  const funda = m.calcularPorta(secoes, true, bloco9)
  assert.equal(funda.pedida.numero, 9)
  assert.equal(funda.pedida.secao.id, secoes[8].id)
  assert.equal(m.voltarDaPorta(cap.id, funda), `/resumos/${cap.id}?bloco=${encodeURIComponent(`h-${secoes[8].id}`)}`)
  // O mesmo link com conta: sem porta (abre o parágrafo como hoje).
  assert.equal(m.calcularPorta(secoes, false, bloco9).pedida, null)
  // O título da parte 7 já é fechado; a parte 6 e as anteriores, não.
  assert.equal(m.calcularPorta(secoes, true, `h-${secoes[6].id}`).pedida.numero, 7)
  assert.equal(m.calcularPorta(secoes, true, `h-${secoes[5].id}`).pedida, null)
  assert.equal(m.calcularPorta(secoes, true, secoes[2].blocos[0].id).pedida, null)
  assert.equal(m.calcularPorta(secoes, true, 'bloco-que-nao-existe').pedida, null)
  assert.equal(m.secaoDoBloco(secoes, bloco9), 8)

  // Resumo com 6 partes ou menos: nada a fechar.
  const curto = m.calcularPorta(secoes.slice(0, 6), true, null)
  assert.equal(curto.fechado, false)
  assert.equal(curto.abertas, 6)

  // Todos os resumos publicados: a porta nunca esconde as 6 primeiras partes nem mostra mais que 6 a visitante.
  const indice = JSON.parse(await readFile('public/biblioteca/indice.json', 'utf8'))
  for (const c of indice.capitulos) {
    const p = m.calcularPorta(c.secoes, true, null)
    assert.equal(p.abertas, Math.min(6, c.secoes.length), c.id)
    assert.equal(m.calcularPorta(c.secoes, false, null).abertas, c.secoes.length, c.id)
  }

  console.log('porta dos resumos: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

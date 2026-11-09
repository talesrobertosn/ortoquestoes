// Prévia dos resumos (Tales, 09/11/2026): quem não assina lê o começo de cada resumo e depois vê a paywall;
// o assinante lê tudo. A lógica está em src/biblioteca/porta.ts; o corte vem de scripts/biblioteca/gerar.mjs.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises'
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

  const cap = JSON.parse(await readFile('public/biblioteca/capitulos/rockwood10-65-tornozelo.json', 'utf8'))
  const ids = cap.secoes.flatMap((s) => s.blocos.map((b) => b.id))
  const iCorte = ids.indexOf(cap.corte)
  assert.ok(iCorte > 0 && iCorte < ids.length - 1, 'o capítulo de exemplo tem corte no meio')

  // Assinante: tudo, sem paywall, mesmo com link para o fim.
  const tudo = m.calcularPorta(cap, false, ids.at(-1))
  assert.equal(tudo.fechado, false)
  assert.equal(tudo.secoes, cap.secoes)
  assert.deepEqual([tudo.fracao, tudo.pedida, tudo.continuar, tudo.restantes.length], [1, null, null, 0])

  // Quem não assina: até o bloco do corte, inclusive; nada depois dele.
  const p = m.calcularPorta(cap, true, null)
  assert.equal(p.fechado, true)
  const vistos = p.secoes.flatMap((s) => s.blocos.map((b) => b.id))
  assert.deepEqual(vistos, ids.slice(0, iCorte + 1))
  assert.ok(p.fracao > 0.25 && p.fracao < 0.5, `fração da prévia: ${p.fracao}`)
  assert.ok(p.restantes.length > 0)
  const secaoDoCorte = cap.secoes.find((s) => s.blocos.some((b) => b.id === cap.corte))
  const fimDaSecao = secaoDoCorte.blocos.at(-1).id === cap.corte
  assert.equal(p.continuar, fimDaSecao ? `h-${cap.secoes[cap.secoes.indexOf(secaoDoCorte) + 1].id}` : ids[iCorte + 1])
  assert.equal(p.restantes[0].continua, !fimDaSecao)
  const abertos = m.blocosAbertos(p)
  assert.ok(abertos.has(cap.corte) && !abertos.has(ids[iCorte + 1]))

  // Link para um trecho fechado: a paywall diz qual parte; para um aberto, não.
  const fundo = m.calcularPorta(cap, true, ids.at(-1))
  assert.equal(fundo.pedida.numero, cap.secoes.length)
  assert.equal(fundo.continuar, ids.at(-1))
  assert.equal(m.calcularPorta(cap, true, ids[0]).pedida, null)
  assert.equal(m.calcularPorta(cap, true, `h-${cap.secoes[0].id}`).pedida, null)
  assert.equal(m.calcularPorta(cap, true, 'bloco-que-nao-existe').pedida, null)

  // Entrar volta para onde a prévia parou, e a conta aceita esse destino.
  const entrar = m.linkEntrarDaPorta(cap.id, p)
  assert.ok(entrar.startsWith('/conta?modo=entrar&voltar='))
  const voltar = new URLSearchParams(entrar.split('?')[1]).get('voltar')
  assert.equal(voltar, `/resumos/${cap.id}?bloco=${encodeURIComponent(p.continuar)}`)
  assert.equal(passagem.rotaVoltar(voltar), voltar)

  // Capítulo sem `corte` (cache antigo): ainda fecha, num terço das seções.
  const semCorte = m.calcularPorta({ ...cap, corte: undefined }, true, null)
  assert.equal(semCorte.fechado, true)
  assert.equal(semCorte.secoes.length, Math.ceil(cap.secoes.length / 3))

  // Todos os publicados: corte num bloco de verdade, nunca título, prévia entre 25% e 50% do texto.
  for (const arq of await readdir('public/biblioteca/capitulos')) {
    const c = JSON.parse(await readFile(join('public/biblioteca/capitulos', arq), 'utf8'))
    const blocos = c.secoes.flatMap((s) => s.blocos)
    const b = blocos.find((x) => x.id === c.corte)
    assert.ok(b, `${c.id}: corte sem bloco`)
    assert.notEqual(b.tipo, 'h3', `${c.id}: corte num título`)
    const q = m.calcularPorta(c, true, null)
    assert.equal(q.fechado, true, c.id)
    assert.ok(q.fracao > 0.25 && q.fracao < 0.5, `${c.id}: fração ${q.fracao}`)
    assert.equal(m.calcularPorta(c, false, null).secoes.length, c.secoes.length, c.id)
  }

  // O tamanho da prévia não aparece em nenhuma tela.
  for (const arquivo of ['src/biblioteca/PortaLeitura.tsx', 'src/paginas/LeitorResumo.tsx', 'src/biblioteca/sala/Biblioteca.tsx', 'src/paginas/Assinatura.tsx']) {
    const texto = await readFile(arquivo, 'utf8')
    assert.ok(!/35\s*%|35 por cento|um terço/i.test(texto.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')), `${arquivo} cita o tamanho da prévia`)
  }

  console.log('prévia dos resumos: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}

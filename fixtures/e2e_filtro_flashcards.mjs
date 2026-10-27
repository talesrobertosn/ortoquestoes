// Estudar por assunto na Biblioteca de flashcards (27/10/2026), no navegador, no computador e no celular:
// área inteira, grupo, assunto, troca de área, busca, recorte vazio, chips, sessão só do recorte e volta.
// Uso: node fixtures/e2e_filtro_flashcards.mjs   (FOTOS=pasta guarda as telas)
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
process.env.VITE_SUPABASE_URL = 'sem'
const { createServer } = await import('vite')
const { chromium } = await import('playwright')

// as quantidades esperadas saem do acervo real, pelas mesmas regras do site
const pasta = await mkdtemp(join(tmpdir(), 'oq-e2e-filtro-'))
await build({ stdin: { contents: "export * from './src/flashcards/biblioteca/filtroAssunto'", resolveDir: process.cwd() }, outfile: join(pasta, 'f.mjs'), bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error' })
const m = await import(pathToFileURL(join(pasta, 'f.mjs')))
await rm(pasta, { recursive: true, force: true })
const indice = JSON.parse(await readFile('public/flashcards/indice.json', 'utf8'))
const cartas = (await Promise.all(Object.values(indice.areas).map(async (a) => JSON.parse(await readFile(`public/flashcards/${a.arquivo}`, 'utf8')).flashcards))).flat()
const conta = (f) => cartas.filter((c) => m.casaFiltro(c, { grupo: null, assuntos: [], ...f })).length
const FEMUR = 'Fraturas do fêmur e da perna na criança'
const nPed = conta({ area: 'pediatria' }), nFraturas = conta({ area: 'pediatria', grupo: 'fraturas' }), nFemur = conta({ area: 'pediatria', grupo: 'fraturas', assuntos: [FEMUR] })
const vazio = m.arvoreFlashcards(cartas, Object.fromEntries(Object.entries(indice.areas).map(([id, a]) => [id, a.nome])))
  .flatMap((a) => a.grupos.map((g) => ({ a, g, s: g.assuntos.find((s) => s.total === 0) }))).find((x) => x.s && x.a.grupos.length > 1)

const FOTOS = process.env.FOTOS
const site = await createServer({ server: { port: 5800 + Math.floor(Math.random() * 400), strictPort: false }, logLevel: 'error' })
await site.listen()
const BASE = site.resolvedUrls.local[0]
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const erros = []
const numero = async (loc) => Number((await loc.textContent()).replace(/\D/g, ''))
try {
  for (const [nome, largura, altura] of [['computador', 1400, 860], ['celular', 390, 844]]) {
    const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, locale: 'pt-BR', reducedMotion: 'reduce' })
    await contexto.addInitScript(() => { localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 })); localStorage.setItem('oq-termos-adiado', String(Date.now())) })
    const p = await contexto.newPage()
    p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
    await p.goto(`${BASE}#/flashcards/biblioteca`)
    const som = p.getByRole('button', { name: 'Entrar com som', exact: true })
    await p.locator('.fa, .fc-entrada').first().waitFor({ timeout: 60_000 })
    if (await som.count()) await som.click()
    const fa = p.locator('.fa')
    await fa.waitFor({ timeout: 60_000 })
    // no celular o painel começa recolhido numa linha
    if (nome === 'celular') {
      assert.equal(await fa.locator('.fa__busca').isVisible(), false, 'celular: painel deveria começar recolhido')
      await fa.getByRole('button', { name: 'Escolher', exact: true }).click()
    }
    // 1. área inteira
    await fa.locator('.fa__opcao', { hasText: 'Ortopedia pediátrica' }).click()
    assert.equal(await numero(fa.locator('.fa__total b')), nPed, 'total da área')
    assert.equal(await fa.locator('.fa__chip').count(), 1)
    // 2. grupo e 3. assunto (a fratura específica)
    await fa.locator('.fa__opcao', { hasText: 'Fraturas e trauma na criança' }).click()
    assert.equal(await numero(fa.locator('.fa__total b')), nFraturas, 'total do grupo')
    await fa.locator('.fa__assunto', { hasText: FEMUR }).click()
    assert.equal(await numero(fa.locator('.fa__total b')), nFemur, 'total do assunto')
    assert.equal(await fa.locator('.fa__chip').count(), 3)
    assert.equal(await fa.locator('.fa__assunto', { hasText: FEMUR }).getAttribute('aria-pressed'), 'true')
    if (FOTOS) await p.screenshot({ path: `${FOTOS}/${nome}-assunto.png`, fullPage: false })
    // tirar o assunto pelo chip volta ao grupo
    await fa.getByRole('button', { name: `Tirar o assunto ${FEMUR}` }).click()
    assert.equal(await numero(fa.locator('.fa__total b')), nFraturas)
    // 4. trocar a área de cima limpa o que depende dela
    await fa.locator('.fa__trilha').getByRole('button', { name: 'Todas as áreas' }).click()
    assert.equal(await fa.locator('.fa__chip').count(), 0)
    await fa.locator('.fa__opcao', { hasText: 'Trauma adulto' }).click()
    assert.ok(await fa.locator('.fa__opcao', { hasText: 'Membro superior' }).isVisible())
    assert.equal(await fa.locator('.fa__opcao', { hasText: 'Fraturas e trauma na criança' }).count(), 0)
    // 5. busca direta pelo nome
    await fa.getByRole('searchbox').fill('supracondil')
    await fa.locator('.fa__resultados button').first().click()
    assert.match(await fa.locator('.fa__titulo p').textContent(), /Ortopedia pediátrica › Fraturas e trauma na criança › Fraturas supracondilianas do úmero/)
    assert.equal(await numero(fa.locator('.fa__total b')), conta({ area: 'pediatria', grupo: 'fraturas', assuntos: ['Fraturas supracondilianas do úmero'] }))
    // 6. recorte sem flashcard: mensagem, sem botão de estudar
    await fa.locator('.fa__trilha').getByRole('button', { name: 'Todas as áreas' }).click()
    await fa.locator('.fa__opcao', { hasText: vazio.a.nome }).click()
    await fa.locator('.fa__opcao', { hasText: vazio.g.nome }).click()
    await fa.locator('.fa__assunto', { hasText: vazio.s.nome }).click()
    assert.equal(await numero(fa.locator('.fa__total b')), 0)
    assert.equal(await fa.locator('.fa__estudar').count(), 0)
    assert.ok(await fa.locator('.fa__vazio').isVisible())
    // 10. a sessão só tem o recorte: título do assunto e o número certo de flashcards
    await fa.locator('.fa__trilha').getByRole('button', { name: 'Todas as áreas' }).click()
    await fa.locator('.fa__opcao', { hasText: 'Ortopedia pediátrica' }).click()
    await fa.locator('.fa__opcao', { hasText: 'Fraturas e trauma na criança' }).click()
    await fa.locator('.fa__assunto', { hasText: FEMUR }).click()
    // as listas de baixo também ficam no recorte (e somem as outras áreas)
    assert.ok(await p.locator('.fa__escopo').isVisible())
    assert.equal(await p.locator('.fc-categoria', { hasText: 'Trauma adulto' }).count(), 0)
    const esperado = Math.min(20, nFemur)
    assert.match(await fa.locator('.fa__estudar').textContent(), new RegExp(`Estudar ${esperado}`))
    await fa.locator('.fa__estudar').click()
    await p.locator('.fc-estudo__titulo').waitFor({ state: 'attached' })
    assert.equal(await p.locator('.fc-estudo__titulo').textContent(), FEMUR)
    assert.match(await p.locator('.fc-estudo__contagem').textContent(), new RegExp(`de ${esperado}`))
    if (FOTOS) await p.screenshot({ path: `${FOTOS}/${nome}-sessao.png` })
    // 7. voltar à Biblioteca mantém o recorte
    await p.getByRole('button', { name: '← Biblioteca' }).click()
    await fa.waitFor()
    assert.equal(await p.locator('.fa__chip').count(), 3, 'o recorte se perdeu ao voltar')
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${nome}: rolagem lateral`)
    if (FOTOS) await p.screenshot({ path: `${FOTOS}/${nome}-volta.png`, fullPage: false })
    // link direto com o recorte, sem categoria, abre a Biblioteca já filtrada
    await p.goto(`${BASE}#/flashcards?x=1`)
    await p.goto(`${BASE}#/flashcards/biblioteca?area=pediatria&grupo=quadril`)
    await p.reload()
    await p.locator('.fa').waitFor({ timeout: 60_000 })
    assert.equal(await numero(p.locator('.fa__total b')), conta({ area: 'pediatria', grupo: 'quadril' }))
    console.log(`${nome}: área, grupo, assunto, troca de área, busca, vazio, chips, sessão exclusiva e volta: OK`)
    await contexto.close()
  }
  assert.deepEqual(erros, [])
  console.log('Estudar por assunto na Biblioteca de flashcards: OK')
} finally { await navegador.close(); await site.close() }

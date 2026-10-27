// Resumo ↔ flashcards no navegador (27/10/2026), no computador e no celular: o resumo abre a sessão do tema,
// a Biblioteca de flashcards volta no mesmo recorte e oferece "Consultar resumo" do tema.
// Uso: node fixtures/e2e_ligacoes_resumos.mjs   (FOTOS=pasta guarda as telas)
import assert from 'node:assert/strict'
process.env.VITE_SUPABASE_URL = 'sem'
const { createServer } = await import('vite')
const { chromium } = await import('playwright')

const RESUMO = 'rockwood10-17-sindrome-compartimental'
const TITULO = 'Síndrome compartimental aguda'
const FOTOS = process.env.FOTOS
const site = await createServer({ server: { port: 6200 + Math.floor(Math.random() * 400), strictPort: false }, logLevel: 'error' })
await site.listen()
const BASE = site.resolvedUrls.local[0]
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const erros = []
try {
  for (const [nome, largura, altura] of [['computador', 1400, 860], ['celular', 390, 844]]) {
    const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, locale: 'pt-BR', reducedMotion: 'reduce' })
    await contexto.addInitScript(() => { localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 })); localStorage.setItem('oq-termos-adiado', String(Date.now())) })
    const p = await contexto.newPage()
    p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
    // 1. resumo → flashcards do tema
    await p.goto(`${BASE}#/resumos/${RESUMO}`)
    const botao = p.locator('.lr-capa__fc')
    await botao.waitFor({ timeout: 60_000 })
    assert.match(await botao.textContent(), /Estudar flashcards deste tema/)
    if (FOTOS) await p.screenshot({ path: `${FOTOS}/${nome}-resumo.png` })
    await botao.click()
    const som = p.getByRole('button', { name: 'Entrar com som', exact: true })
    await p.locator('.fc-estudo__titulo, .fc-entrada').first().waitFor({ state: 'attached', timeout: 60_000 })
    if (await som.count()) await som.click()
    await p.locator('.fc-estudo__titulo').waitFor({ state: 'attached', timeout: 60_000 })
    assert.equal(await p.locator('.fc-estudo__titulo').textContent(), TITULO)
    assert.match(await p.locator('.fc-estudo__contagem').textContent(), /de 20/)
    if (FOTOS) await p.screenshot({ path: `${FOTOS}/${nome}-sessao.png` })
    // 2. de volta à Biblioteca: o mesmo recorte e o resumo do tema
    if (FOTOS) await p.screenshot({ path: `${FOTOS}/${nome}-antes-voltar.png` })
    await p.getByRole('button', { name: '← Biblioteca' }).click()
    await p.locator('.fa').waitFor()
    assert.ok(await p.locator('.fa__escopo').textContent().then((t) => t.includes('Síndrome compartimental')), 'o recorte do tema se perdeu')
    const link = p.locator('.fa__resumos a').first()
    await link.waitFor()
    assert.match(await link.textContent(), new RegExp(`Consultar resumo: ${TITULO}`))
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${nome}: rolagem lateral`)
    if (FOTOS) await p.screenshot({ path: `${FOTOS}/${nome}-biblioteca.png` })
    // 3. flashcards → resumo
    await link.click()
    await p.waitForURL(new RegExp(`#/resumos/${RESUMO}`))
    await p.locator('.lr-capa h1').waitFor()
    assert.equal(await p.locator('.lr-capa h1').textContent(), TITULO)
    console.log(`${nome}: resumo → flashcards → resumo OK`)
    await contexto.close()
  }
  assert.deepEqual(erros, [])
  console.log('Resumo e flashcards ligados: OK')
} finally { await navegador.close(); await site.close() }

// Capturas do calendário do cronograma (16/10/2026), no modo demonstração: 1400×860 e 390×844, claro e escuro.
// Uso: npx vite --port 5191 (em outro terminal) e depois node fixtures/capturar_calendario.mjs [computador-light|celular-dark|pendente...]
// BASE=http://localhost:5191/ e SAIDA=/tmp/claude-0/capturas-calendario por padrão.
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
const SAIDA = process.env.SAIDA ?? '/tmp/claude-0/capturas-calendario'
await mkdir(SAIDA, { recursive: true })
const BASE = process.env.BASE ?? 'http://localhost:5191/'
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const erros = []
async function pagina(largura, altura, esquema) {
  const ctx = await nav.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: largura < 500 ? 2 : 1, colorScheme: esquema, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', isMobile: largura < 500, hasTouch: largura < 500 })
  await ctx.addInitScript((t) => { localStorage.setItem('ortoquestoes:tema', JSON.stringify(t)); localStorage.setItem('ortoquestoes:cronograma:tour-v2', 'true') }, esquema === 'light' ? 'claro' : 'escuro')
  const p = await ctx.newPage()
  p.on('pageerror', (e) => erros.push(String(e)))
  p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()) })
  return p
}
const so = process.argv[2]
for (const [nome, l, a] of [['computador', 1400, 860], ['celular', 390, 844]]) {
  for (const esquema of ['light', 'dark']) {
    if (so && so !== `${nome}-${esquema}`) continue
    const p = await pagina(l, a, esquema)
    const tema = esquema === 'light' ? 'claro' : 'escuro'
    // Página do cronograma com o adiantar feito hoje (a frase "Você adiantou…").
    await p.goto(`${BASE}#/cronograma?demo=1&feita`)
    await p.waitForSelector('.cp-hoje', { timeout: 30000 })
    await p.waitForTimeout(600)
    const recusar = p.getByRole('button', { name: 'Recusar' })
    if (await recusar.count()) await recusar.first().click().catch(() => {})
    if (esquema === 'light') {
      const adiantar = p.locator('#adiantar')
      await adiantar.scrollIntoViewIfNeeded()
      await p.screenshot({ path: `${SAIDA}/${nome}-${tema}-0-adiantou.png` })
      const botao = p.locator('.cc-abrir').first()
      await botao.scrollIntoViewIfNeeded()
      await p.waitForTimeout(200)
      await p.screenshot({ path: `${SAIDA}/${nome}-${tema}-1-botao.png` })
    }
    await p.locator('.cc-abrir').first().click()
    await p.waitForSelector('.cc-janela')
    await p.waitForTimeout(500)
    await p.screenshot({ path: `${SAIDA}/${nome}-${tema}-2-calendario.png` })
    // Um dia futuro: o terceiro próximo dia de estudo.
    const futuros = p.locator('.cc-dia--futuro > button')
    if (await futuros.count() > 2) {
      await futuros.nth(2).click()
      await p.waitForTimeout(600)
      if (nome === 'celular') await p.screenshot({ path: `${SAIDA}/${nome}-${tema}-3-detalhe.png` })
      else await p.screenshot({ path: `${SAIDA}/${nome}-${tema}-3-detalhe.png` })
    }
    // Um dia passado.
    const passado = p.locator('.cc-dia--feito > button, .cc-dia--parcial > button').first()
    if (await passado.count()) { await passado.scrollIntoViewIfNeeded(); await passado.click(); await p.waitForTimeout(500); await p.screenshot({ path: `${SAIDA}/${nome}-${tema}-4-passado.png` }) }
    // Avança até o mês da prova (reta final e prova).
    for (let i = 0; i < 4; i++) { const b = p.locator('.cc-nav__botao[aria-label="Próximo mês"]'); if (await b.isDisabled()) break; await b.click(); await p.waitForTimeout(350) }
    await p.locator('.cc-topo').scrollIntoViewIfNeeded()
    const prova = p.locator('.cc-dia--prova > button')
    if (await prova.count()) { await prova.click(); await p.waitForTimeout(400) }
    await p.locator('.cc-corpo').evaluate((e) => e.scrollTo(0, 0))
    await p.screenshot({ path: `${SAIDA}/${nome}-${tema}-5-prova.png` })
    // Dezembro: reta final.
    await p.locator('.cc-nav__botao[aria-label="Mês anterior"]').click(); await p.waitForTimeout(400)
    const reta = p.locator('.cc-dia--reta > button').first()
    if (await reta.count()) { await reta.click(); await p.waitForTimeout(400) }
    await p.locator('.cc-corpo').evaluate((e) => e.scrollTo(0, 0))
    await p.screenshot({ path: `${SAIDA}/${nome}-${tema}-6-reta-final.png` })
    // Largura: nada de rolagem horizontal.
    const larg = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth, janela: document.querySelector('.cc-janela').scrollWidth, vw: innerWidth }))
    if (larg.janela > larg.vw + 1) erros.push(`${nome}: rolagem horizontal ${JSON.stringify(larg)}`)
    await p.keyboard.press('Escape'); await p.waitForTimeout(200)
    if (await p.locator('.cc-janela').count()) erros.push(`${nome}: Esc não fechou`)
    await p.context().close()
  }
}
// Dia com a meta pendente: hoje mostra "Começar"; adiantar um dia pelo calendário entra na sessão de hoje.
for (const [nome, l, a] of [['computador', 1400, 860], ['celular', 390, 844]]) {
  if (so && !so.startsWith('pendente')) continue
  const p = await pagina(l, a, 'light')
  await p.goto(`${BASE}#/cronograma?demo=1&pendente&calendario=1`)
  await p.waitForSelector('.cc-janela', { timeout: 30000 })
  await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Recusar')?.click())
  await p.waitForTimeout(600)
  await p.screenshot({ path: `${SAIDA}/${nome}-claro-7-hoje-pendente.png` })
  const amanha = p.locator('.cc-dia--futuro > button').first()
  await amanha.click(); await p.waitForTimeout(500)
  await p.screenshot({ path: `${SAIDA}/${nome}-claro-8-adiantar-dia.png` })
  await p.locator('.cc-detalhe .cp-botao--ouro').click()
  await p.waitForTimeout(900)
  if (await p.locator('.cc-janela').count()) erros.push(`${nome}: o calendário deveria fechar ao adiantar`)
  await p.screenshot({ path: `${SAIDA}/${nome}-claro-9-depois-de-adiantar.png` })
  const texto = await p.locator('.cp-hoje').innerText()
  if (!/adiantadas/.test(texto)) erros.push(`${nome}: o cartão Hoje não mostra as adiantadas`)
  await p.context().close()
}
await nav.close()
console.log(erros.length ? erros.join('\n') : 'sem erros')

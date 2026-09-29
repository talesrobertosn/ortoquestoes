// Gera os PNGs de um post: cada <section id="..."> do HTML vira um arquivo.
// Uso: node marketing/instagram/gerar.mjs marketing/instagram/casos/01-tcg/caso.html
// Os PNGs saem na pasta do HTML, em saida/ (ignorada pelo git).
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { dirname, resolve } from 'path'

const html = resolve(process.argv[2] ?? '')
const saida = resolve(dirname(html), 'saida')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })
const pagina = await navegador.newPage({ viewport: { width: 1080, height: 1920 } })
await pagina.goto('file://' + html)
await pagina.evaluate(() => document.fonts.ready)
await pagina.waitForTimeout(500)
for (const secao of await pagina.$$('section[id]')) {
  const id = await secao.getAttribute('id')
  await secao.screenshot({ path: `${saida}/${id}.png` })
  console.log(`${saida}/${id}.png`)
}
await navegador.close()

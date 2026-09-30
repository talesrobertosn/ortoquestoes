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
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 1920 } })
await pagina.goto('file://' + html)
await pagina.evaluate(() => document.fonts.ready)
await pagina.waitForTimeout(500)
for (const secao of await pagina.$$('section[id]')) {
  const id = await secao.getAttribute('id')
  // data-formato="jpg" para imagens que precisam ser leves (prévia do link).
  const jpg = (await secao.getAttribute('data-formato')) === 'jpg'
  const arquivo = `${saida}/${id}.${jpg ? 'jpg' : 'png'}`
  await secao.screenshot({ path: arquivo, ...(jpg ? { type: 'jpeg', quality: 90 } : {}) })
  console.log(arquivo)
}
await navegador.close()

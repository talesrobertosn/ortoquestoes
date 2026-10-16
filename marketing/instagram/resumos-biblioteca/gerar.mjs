// Gera os PNGs dos posts da Biblioteca de Resumos: cada <section id> de post.html vira png/<id>.png.
// Uso (na raiz): node marketing/instagram/resumos-biblioteca/gerar.mjs
// Antes, as telas reais em telas/ (node marketing/instagram/resumos-biblioteca/capturar.mjs).
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'
const pasta = new URL('./', import.meta.url).pathname
mkdirSync(pasta + 'png', { recursive: true })
const caminho = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium'
const navegador = await chromium.launch(existsSync(caminho) ? { executablePath: caminho } : {})
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 1920 } })
await pagina.goto('file://' + pasta + 'post.html')
await pagina.evaluate(() => document.fonts.ready)
await pagina.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r }))))
await pagina.waitForTimeout(500)
const so = process.argv[2]
for (const secao of await pagina.$$('section[id]')) {
  const id = await secao.getAttribute('id')
  if (so && !id.startsWith(so)) continue
  await secao.screenshot({ path: `${pasta}png/${id}.png` })
  console.log(`png/${id}.png`)
}
await navegador.close()

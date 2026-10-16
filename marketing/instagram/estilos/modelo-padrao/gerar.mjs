// Modelo padrão (aprovado pelo Tales em 16/10/2026): gera os PNGs de modelo.html (ou de outro post.html no mesmo formato).
// Uso: node marketing/instagram/estilos/modelo-padrao/gerar.mjs [caminho/post.html] [--claro] [prefixo-da-peça]
//   --claro: variante branca (body.claro). Sem --claro: variante verde.
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
const args = process.argv.slice(2)
const claro = args.includes('--claro')
const arquivo = resolve(args.find((a) => a.endsWith('.html')) ?? new URL('./modelo.html', import.meta.url).pathname)
const so = args.find((a) => !a.endsWith('.html') && !a.startsWith('--'))
const saida = dirname(arquivo) + (claro ? '/png-claro/' : '/png/')
mkdirSync(saida, { recursive: true })
const caminho = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium'
const navegador = await chromium.launch(existsSync(caminho) ? { executablePath: caminho } : {})
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 1920 } })
await pagina.goto('file://' + arquivo)
if (claro) await pagina.evaluate(() => document.body.classList.add('claro'))
await pagina.evaluate(() => document.fonts.ready)
await pagina.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r }))))
await pagina.waitForTimeout(500)
for (const secao of await pagina.$$('section[id]')) {
  const id = await secao.getAttribute('id')
  if (so && !id.startsWith(so)) continue
  await secao.screenshot({ path: `${saida}${id}.png` })
  console.log(saida + id + '.png')
}
await navegador.close()

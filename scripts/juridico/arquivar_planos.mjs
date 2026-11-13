// Arquivo das versões da página de Planos (13/11/2026, pedido do Tales). Prova o que foi oferecido em cada data
// (Condições da Assinatura, Cláusula 3): grava o texto da página, uma imagem dela no computador e no celular e
// a versão das Condições em docs/juridico/planos/AAAA-MM-DD-<hash>/, e registra a entrada em indice.json.
// Uso (na raiz): node scripts/juridico/arquivar_planos.mjs   (não faz nada se a versão atual já está arquivada)
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { hashDaOferta, arquivosDaOferta } from './hash_planos.mjs'

const PASTA = 'docs/juridico/planos'
const INDICE = `${PASTA}/indice.json`
const indice = existsSync(INDICE) ? JSON.parse(await readFile(INDICE, 'utf8')) : { versoes: [] }
const hash = await hashDaOferta()
if (indice.versoes.some((v) => v.hash === hash) && !process.argv.includes('--forcar')) {
  console.log(`A página de Planos atual (${hash}) já está arquivada.`)
  process.exit(0)
}

const { createServer } = await import('vite')
const { chromium } = await import('playwright')
const site = await createServer({ server: { port: 5900 + Math.floor(Math.random() * 90), strictPort: false }, logLevel: 'error' })
await site.listen()
const BASE = site.resolvedUrls.local[0]
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const destino = `${PASTA}/${hoje}-${hash.slice(0, 8)}`
await mkdir(destino, { recursive: true })
const termos = await readFile('src/conta/termos.ts', 'utf8')
const versaoCondicoes = termos.match(/VERSAO_CONDICOES_ASSINATURA = '([^']+)'/)?.[1] ?? null
let texto = ''
try {
  for (const [nome, viewport] of [['computador', { width: 1280, height: 900 }], ['celular', { width: 390, height: 844 }]]) {
    const ctx = await navegador.newContext({ viewport, deviceScaleFactor: 1, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
    await ctx.addInitScript(() => { localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 2 })); localStorage.setItem('oq:eventos:ligados:v1', '0') })
    const p = await ctx.newPage()
    await p.goto(`${BASE}#/assinatura`)
    await p.waitForTimeout(4000)
    if (!texto) texto = await p.evaluate(() => document.querySelector('main, .principal, #raiz')?.innerText ?? document.body.innerText)
    await p.screenshot({ path: `${destino}/${nome}.jpg`, type: 'jpeg', quality: 72, fullPage: true })
    await ctx.close()
  }
} finally {
  await navegador.close()
  await site.close()
}
await writeFile(`${destino}/texto.txt`, `Página de Planos (#/assinatura) arquivada em ${hoje}\nVersão das Condições da Assinatura: ${versaoCondicoes}\nImpressão digital: ${hash}\n\n${texto.trim()}\n`)
indice.versoes.push({ data: hoje, hash, pasta: destino.replace(`${PASTA}/`, ''), versao_condicoes: versaoCondicoes, arquivos: await arquivosDaOferta() })
await writeFile(INDICE, JSON.stringify(indice, null, 2) + '\n')
console.log(`Página de Planos arquivada em ${destino}`)

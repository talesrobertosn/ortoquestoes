// Gera os PNGs de um post da fila com os modelos parametrizados do kit.
// Uso:
//   node marketing/kit/renderizar.mjs marketing/kit/fila/post-07.json
//   node marketing/kit/renderizar.mjs 7                      (atalho para fila/post-07.json)
//   node marketing/kit/renderizar.mjs 7 --saida /tmp/teste   (outra pasta de saída)
//   node marketing/kit/renderizar.mjs modelo snellen         (só o exemplo aprovado do modelo)
// Saída padrão: marketing/kit/saida/<post>/ (fora do git), com os PNGs e a LEGENDA.txt.
// Antes de gerar, roda a conferência (conferir.mjs). Com erro, para; --forcar gera mesmo assim.
import { chromium } from 'playwright'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { conferir, imprimir } from './conferir.mjs'
import { ESTILOS, KIT, acharPost, dataBR, ler } from './lib/comum.mjs'

const args = process.argv.slice(2)
const opc = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null }
const forcar = args.includes('--forcar') && args.splice(args.indexOf('--forcar'), 1)
const saidaArg = opc('--saida')

let post, saida
if (args[0] === 'modelo') {
  const estilo = args[1]
  if (!ESTILOS[estilo]) { console.error(`Estilos: ${Object.keys(ESTILOS).join(', ')}`); process.exit(1) }
  post = { post: 'exemplo-' + estilo, pecas: [{ estilo }], exemplo: true }
  saida = resolve(saidaArg ?? join(KIT, 'saida', post.post))
} else {
  const arq = acharPost(args[0])
  if (!arq) { console.error('Uso: node marketing/kit/renderizar.mjs <fila/post-NN.json> [--saida pasta] [--forcar]'); process.exit(1) }
  post = ler(arq)
  saida = resolve(saidaArg ?? join(KIT, 'saida', post.post ?? 'post'))
  console.log(`Conferindo ${post.post} (${post.data})...`)
  const r = conferir(post)
  if (imprimir(arq, r) && !forcar) { console.error('\nCorrija os erros acima (ou use --forcar só para ver um rascunho).'); process.exit(1) }
}
mkdirSync(saida, { recursive: true })

// Chromium do ambiente (CHROMIUM ou /opt/pw-browsers); sem ele, o do próprio Playwright
// (npx playwright install chromium), como no Codex.
const caminho = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium'
const navegador = await chromium.launch(existsSync(caminho) ? { executablePath: caminho } : {})
const gerados = [], avisos = []
const MEDIDAS = { 1350: 'feed 1080x1350', 1920: 'story 1080x1920' }
for (const [n, peca] of post.pecas.entries()) {
  const modelo = join(KIT, 'modelos', peca.estilo + '.html')
  const pagina = await navegador.newPage({ viewport: { width: 1200, height: 1920 } })
  pagina.on('pageerror', (e) => avisos.push(`${peca.estilo}: erro no modelo: ${e.message}`))
  if (!post.exemplo) {
    const dados = { questao: post.questao ?? {}, conteudo: peca.conteudo ?? {}, post: { id: post.post, data: post.data } }
    await pagina.addInitScript((d) => { window.DADOS = d }, dados)
  }
  await pagina.goto('file://' + modelo)
  await pagina.waitForFunction(() => window.PRONTO === true, null, { timeout: 30000 })
  await pagina.waitForTimeout(300)
  for (const a of await pagina.evaluate(() => window.AVISOS ?? [])) avisos.push(`${peca.estilo}: ${a}`)
  const prefixo = post.pecas.length > 1 ? `${String(n + 1).padStart(2, '0')}-${peca.estilo}-` : `${peca.estilo}-`
  for (const secao of await pagina.$$('section[id]')) {
    const id = await secao.getAttribute('id')
    const caixa = await secao.boundingBox()
    if (caixa.width !== 1080 || !MEDIDAS[caixa.height]) avisos.push(`${id}: tamanho ${caixa.width}x${caixa.height} fora do padrão`)
    const arquivo = join(saida, `${prefixo}${id}.png`)
    await secao.screenshot({ path: arquivo })
    gerados.push(`${arquivo}  (${MEDIDAS[caixa.height] ?? caixa.width + 'x' + caixa.height})`)
  }
  await pagina.close()
}
await navegador.close()

console.log(`\nImagens (${gerados.length}):`)
gerados.forEach((g) => console.log('  ' + g))
if (avisos.length) { console.log('\nAVISOS (abra a imagem e confira):'); avisos.forEach((a) => console.log('  ' + a)) }

if (!post.exemplo) {
  const tags = (post.hashtags ?? []).join(' ')
  const ordem = (post.publicacao ?? []).map((p) => `- ${p}`).join('\n')
  const txt = [`${post.post} · ${dataBR(post.data)} · ${post.pecas.map((p) => ESTILOS[p.estilo]?.nome ?? p.estilo).join(' + ')}`,
    post.questao ? `Questão: ${post.questao.id} · ${post.questao.prova ?? 'Simulados'} ${post.questao.ano ?? ''} · gabarito ${post.questao.gabarito}` : '',
    ordem ? `\nOrdem de publicação:\n${ordem}` : '',
    post.legenda ? `\nLEGENDA DO FEED (copiar):\n\n${post.legenda}${tags && !post.legenda.includes('#') ? '\n\n' + tags : ''}` : '\nStories: sem legenda e sem figurinha.',
    post.link_figurinha ? `\nFigurinha de link (só neste story de propaganda): ${post.link_figurinha}` : ''].filter(Boolean).join('\n')
  writeFileSync(join(saida, 'LEGENDA.txt'), txt + '\n')
  console.log('\n' + txt)
  console.log(`\nPróximo passo: abra cada PNG de ${saida} e confira (README, passo 5).`)
}

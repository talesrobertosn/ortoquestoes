// Servidor: VITE_SUPABASE_URL=sem npx vite --host 127.0.0.1 --port 5203
// Só dados sintéticos em navegador isolado. Não usa conta nem escreve no servidor.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const SAIDA = process.env.SAIDA ?? '/tmp/claude-0/-home-user-ortoquestoes/470d052f-b947-5213-a54a-486d1d75caf6/scratchpad/capturas-eventos'
const BASE = process.env.BASE ?? 'http://127.0.0.1:5203/'
await mkdir(SAIDA, { recursive: true })
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
const erros = []
const contextos = []
async function pagina(w, h, reduzido = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: reduzido ? 'reduce' : 'no-preference' })
  await ctx.addInitScript(() => localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 })))
  contextos.push(ctx)
  const p = await ctx.newPage(); p.on('pageerror', e => erros.push(e.stack ?? String(e)))
  return p
}
async function preparar(p, rota) {
  await p.goto(`${BASE}#${rota}`)
}
try {
  for (const [nome, w, h] of [['computador', 1400, 860], ['celular', 390, 844]]) {
    const p = await pagina(w, h)
    await preparar(p, '/?encontro=cafe')
    await p.locator('.encontro').waitFor()
    assert.equal(await p.locator('.encontro').getByText('Café de plantão', { exact: true }).count(), 1)
    await p.screenshot({ path: `${SAIDA}/${nome}-cafe.png` })
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'overflow horizontal')
    await p.waitForTimeout(10_500)
    assert.equal(await p.locator('.encontro').count(), 0, 'visita some sozinha')
    // Konami real, sem parâmetro de forçar, inclusive navegação via teclado.
    for (const key of ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']) await p.keyboard.press(key)
    await p.getByRole('button', { name: /Entrar no Arquivo/ }).click()
    await p.locator('dialog.arquivo-preceptor[open]').waitFor()
    await p.screenshot({ path: `${SAIDA}/${nome}-arquivo.png` })
    await p.keyboard.press('Escape')
    assert.equal(await p.locator('dialog.arquivo-preceptor').count(), 0)
    // Recusa da preferência fecha e bloqueia inclusive gestos intencionais.
    await p.evaluate(async () => { const m = await import('/src/eventos/preferencias.ts'); m.definirEventos(false) })
    await p.waitForTimeout(10500)
    for (let i=0;i<5;i++) await p.locator('.cabecalho__marca').click()
    assert.equal(await p.locator('.encontro').count(), 0)
    await p.evaluate(async () => { const m = await import('/src/eventos/preferencias.ts'); m.definirEventos(true) })
    for (let i=0;i<5;i++) await p.locator('.cabecalho__marca').click()
    await p.locator('.encontro--formiga').waitFor()
    await p.screenshot({ path: `${SAIDA}/${nome}-tinel.png` })
    // Começar um simulado remove imediatamente a visita já aberta.
    await p.evaluate(async () => { const m = await import('/src/estado/armazenamento.ts'); const { novaSessao } = await import('/src/estado/sessao.ts'); const { FILTROS_VAZIOS } = await import('/src/dados/tipos.ts'); m.gravar('sessao:atual', novaSessao(FILTROS_VAZIOS, ['pediatria-0313'], { simulado: true, limiteSegundos: 90 })) })
    await p.waitForTimeout(100)
    assert.equal(await p.locator('.encontro').count(), 0)
    for (const key of ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']) await p.keyboard.press(key)
    assert.equal(await p.locator('.encontro').count(), 0)
    await p.close()
  }
  // Marcos e selo: somente respostas fictícias em uma aba sem autenticação.
  const marcos = await pagina(1400, 860)
  await preparar(marcos, '/')
  await marcos.waitForTimeout(3500)
  const dadosSinteticos = await marcos.evaluate(async () => {
    const m = await import('/src/estado/armazenamento.ts')
    const agora = Date.now()
    const mapa = Object.fromEntries(Array.from({ length: 999 }, (_, i) => [`sintetica-${i}`, { c: false, q: agora, tentativas: 1 }]))
    m.gravar('respondidas', mapa)
    mapa['sintetica-999'] = { c: true, q: agora + 1, tentativas: 1 }
    m.gravar('respondidas', mapa)
    return JSON.stringify(m.ler('respondidas', {}))
  })
  await marcos.getByText('1.000 questões na sua história', { exact: true }).waitFor()
  await marcos.screenshot({ path: `${SAIDA}/computador-marco-pessoal.png` })
  assert.equal(await marcos.evaluate(async () => JSON.stringify((await import('/src/estado/armazenamento.ts')).ler('respondidas', {}))), dadosSinteticos, 'festa não regrava respostas')
  await marcos.evaluate(async () => {
    const m = await import('/src/estado/armazenamento.ts')
    const mapa = m.ler('respondidas', {})
    for (let i = 0; i < 6; i++) { mapa[`acerto-teste-${i}`] = { c: true, q: Date.now() + i, tentativas: 1 }; m.gravar('respondidas', mapa) }
  })
  assert.equal(await marcos.evaluate(() => JSON.parse(localStorage.getItem('oq:eventos:lembrancas:v1:visitante')).selo), true)
  assert.equal(await marcos.evaluate(async () => (await import('/src/estado/armazenamento.ts')).ler('conquistas', null)), null, 'selo não cria conquista oficial')
  await marcos.close()
  const reduzida = await pagina(390, 844, true)
  await preparar(reduzida, '/questao/pediatria-0313?encontro=festa')
  await reduzida.locator('.encontro').waitFor()
  assert.equal(await reduzida.locator('.encontro--confete').count(), 0, 'sistema sem movimento tem visita estática')
  await reduzida.screenshot({ path: `${SAIDA}/celular-questao-sem-movimento.png` })
  const p = await pagina(1400, 860)
  await preparar(p, '/flashcards/biblioteca')
  // Entrada pede gesto para áudio; usa a escolha sem som, sem tocar dados reais.
  await p.waitForTimeout(3500)
  const semSom = p.getByRole('button', { name: /sem som/i }).first()
  if (await semSom.count()) await semSom.click()
  await p.locator('.gato-biblioteca-segredo').waitFor({ timeout: 30000 })
  await p.locator('.gato-biblioteca-segredo').click()
  await p.getByText('O bibliotecário de quatro patas', { exact: true }).waitFor()
  await p.screenshot({ path: `${SAIDA}/computador-gato-biblioteca.png` })
  const erro = await pagina(390, 844)
  await preparar(erro, '/uma-trilha-perdida')
  await erro.getByText('Fratura no caminho', { exact: true }).waitFor()
  await erro.screenshot({ path: `${SAIDA}/celular-404.png` })
  assert.deepEqual(erros, [], 'erros do navegador')
  console.log(`Capturas e interações reais aprovadas: ${SAIDA}`)
} finally { await browser.close() }

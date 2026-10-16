/**
 * Fluidez e correções da Cripta (15/10/2026). Servidor local: VITE_SUPABASE_URL=sem npx vite --port 5199.
 * Confere, nos três formatos:
 *  - o botão principal não muda de lugar ao responder nem quando chega o flashcard seguinte;
 *  - depois de uma parada (portas), o herói e o botão voltam visíveis e o toque em Seguir avança;
 *  - a dica de um poder abre (mouse ou toque), fica dentro da moldura e, no toque, usa o poder;
 *  - o Golem de Gesso não sai pela borda nem entra sob o cabeçalho.
 */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
const url = process.env.ORTO_URL ?? 'http://127.0.0.1:5199/#/flashcards/cripta'
const pasta = process.env.ORTO_CAPTURAS ?? '/tmp/ortoquestoes-fluidez'
await mkdir(pasta, { recursive: true })
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_BIN ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : '/usr/bin/chromium'), args: ['--no-sandbox'] })
try {
  for (const [formato, width, height] of [['paisagem', 1400, 860], ['retrato', 390, 844], ['deitado', 844, 390]]) {
    const toque = width < 900
    const ctx = await b.newContext({ viewport: { width, height }, hasTouch: toque, isMobile: toque })
    const p = await ctx.newPage(), erros = []
    p.on('pageerror', (e) => erros.push(e.message))
    await p.goto(url); await p.waitForFunction(() => !!window.__torneio)
    await p.locator('.fc-apresenta').click({ timeout: 3000 }).catch(() => {})
    await p.waitForFunction(() => !document.querySelector('.fc-apresenta'))
    const tocar = async (loc) => (toque ? loc.tap() : loc.click())
    const topoBotao = async () => Math.round((await p.locator('.fc-principal').boundingBox()).y)

    // Golem inteiro na tela e abaixo do cabeçalho
    const golem = await p.evaluate(() => {
      const q = document.querySelector('.fc-ator--inimigo .fc-ator__quadros').getBoundingClientRect()
      const topo = document.querySelector('.fc-topo').getBoundingClientRect().bottom
      const m = window.__torneio && { escala: q.width / 128 }
      return { esquerda: q.left + 21 * m.escala, cima: q.top + 36 * m.escala, topo }
    })
    assert(golem.esquerda >= 0, `Golem cortado na borda (${formato})`)
    assert(golem.cima >= golem.topo - 2, `Golem sob o cabeçalho (${formato})`)

    // botão parado ao responder e ao chegar o próximo flashcard
    await p.evaluate(() => { const t = window.__torneio; t.definir({ ...t.partida, vida: 999, vidaMax: 999 }) })
    const antes = await topoBotao()
    for (let k = 0; k < 3; k++) {
      const errada = await p.evaluate(() => (window.__torneio.certaVisual + 1) % document.querySelectorAll('.fc-alternativa').length)
      await tocar(p.locator('.fc-alternativa').nth(errada)); await tocar(p.locator('.fc-alternativa').nth(errada))
      await p.waitForFunction(() => window.__torneio.partida.fase === 'resposta')
      for (const ms of [0, 120, 300]) { await p.waitForTimeout(ms); assert(Math.abs(await topoBotao() - antes) <= 6, `botão mudou de lugar ao responder (${formato})`) }
      const caixa = await p.locator('.fc-principal').boundingBox()
      const alvo = await p.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.fc-principal'), [caixa.x + caixa.width / 2, caixa.y + caixa.height / 2])
      assert(alvo, `o centro do Seguir não é o botão (${formato})`)
      await tocar(p.locator('.fc-principal'))
      await p.waitForFunction(() => window.__torneio.partida.fase === 'pergunta')
      for (const ms of [0, 120, 300]) { await p.waitForTimeout(ms); assert(Math.abs(await topoBotao() - antes) <= 6, `botão mudou de lugar no flashcard novo (${formato})`) }
    }

    // parada (portas) e volta: herói e botão visíveis, Seguir avança
    const original = await p.evaluate(() => structuredClone(window.__torneio.partida))
    await p.evaluate(() => { const t = window.__torneio; t.definir({ ...t.partida, fase: 'portas', portas: [{ tipo: 'combate', recompensa: 'poder' }, { tipo: 'loja' }] }) })
    await p.locator('.fc-portal').first().waitFor()
    await p.evaluate((o) => window.__torneio.definir(o), original)
    await p.waitForFunction(() => !document.querySelector('.fc-arena[data-parada]'))
    const visiveis = await p.evaluate(() => ['.fc-heroi', '.fc-acao', '.fc-principal'].map((s) => getComputedStyle(document.querySelector(s)).visibility))
    assert.deepEqual(visiveis, ['visible', 'visible', 'visible'], `herói ou botão invisível depois da parada (${formato})`)

    // dica de poder: abre, fica dentro da moldura e (no toque) usa
    await p.evaluate(() => { const t = window.__torneio; t.definir({ ...t.partida, encaixes: [{ tipo: 'pista', carga: 2 }], reliquias: ['gesso', 'cadeia'] }) })
    const enc = p.locator('.fc-encaixe').first()
    if (toque) await enc.tap(); else await enc.hover()
    const dica = p.locator('.fc-dica-jogo')
    await dica.waitFor()
    const [d, m] = await Promise.all([dica.boundingBox(), p.locator('.fc-modal').boundingBox()])
    assert(d.x >= m.x && d.y >= m.y && d.x + d.width <= m.x + m.width + 1 && d.y + d.height <= m.y + m.height + 1, `dica fora da moldura (${formato})`)
    assert.match(await dica.innerText(), /Pergaminho da pista/i)
    await p.screenshot({ path: `${pasta}/fluidez-dica-${formato}.png` })
    const eliminadas = () => p.evaluate(() => window.__torneio.partida.atual.eliminadas.length)
    const n0 = await eliminadas()
    if (toque) await p.locator('.fc-dica-jogo__acao').tap(); else await enc.click()
    await p.waitForFunction((n) => window.__torneio.partida.atual.eliminadas.length > n, n0)
    assert.equal(await eliminadas(), n0 + 1)
    assert.deepEqual(erros, [])
    console.log(formato, 'botão parado, volta da parada, dica dos poderes e Golem na tela OK')
    await ctx.close()
  }
} finally { await b.close() }

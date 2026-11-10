// Executar pelo capturador do projeto: /resumos --sem-cracha --roteiro fixtures/roteiro_arte_salao.mjs
import assert from 'node:assert/strict'

export default async function (pagina, foto, tamanho) {
  const palco = pagina.locator('.bb-palco')
  await palco.scrollIntoViewIfNeeded()
  await pagina.locator('.bb-obj__arte').first().waitFor()
  await pagina.evaluate(async () => {
    await Promise.all([...document.querySelectorAll('.bb-palco img')].map(im => im.decode()))
  })
  const estado = () => pagina.locator('.bb-palco__arte img').evaluate(im => {
    const r = im.getBoundingClientRect(), s = getComputedStyle(im)
    return { x: r.x, y: r.y, w: r.width, h: r.height, transform: s.transform, translate: s.translate, animation: s.animationName }
  })
  const antes = await estado()
  const caixa = await palco.boundingBox()
  // Atravessar a pintura, incluindo o vitral e as peças, não altera seu enquadramento.
  for (const [x, y] of [[.04, .08], [.55, .4], [.63, .6], [.72, .25], [.9, .8]]) {
    await pagina.mouse.move(caixa.x + caixa.width*x, caixa.y + caixa.height*y)
    await pagina.waitForTimeout(220)
    assert.deepEqual(await estado(), antes, 'O salão se deslocou com o mouse')
  }
  assert.equal(antes.animation, 'none')
  assert.equal(antes.transform, 'none')
  assert.equal(antes.translate, 'none')

  // As peças continuam funcionais, com dimensões constantes ao mudar de estado.
  const lampada = pagina.locator('.bb-arandela').first()
  const medidas = await lampada.boundingBox()
  const acesa = await lampada.getAttribute('aria-pressed')
  await lampada.click()
  assert.notEqual(await lampada.getAttribute('aria-pressed'), acesa)
  assert.deepEqual(await lampada.boundingBox(), medidas)
  await lampada.click()
  assert.equal(await lampada.getAttribute('aria-pressed'), acesa)
  const janela = pagina.locator('.bb-janela')
  const inicio = await janela.getAttribute('aria-label')
  for (let i = 0; i < 3; i++) {
    await janela.click()
    await pagina.evaluate(async () => {
      await Promise.all([...document.querySelectorAll('.bb-palco img')].map(im => im.decode()))
    })
    assert.deepEqual(await estado(), antes)
    if (i < 2) assert.notEqual(await janela.getAttribute('aria-label'), inicio)
  }
  assert.equal(await janela.getAttribute('aria-label'), inicio)
  await pagina.locator('.bb-relogio').click()
  assert.ok(await pagina.locator('.bb-relogio').getAttribute('aria-label'), 'Hora real continua acessível')
  await pagina.waitForTimeout(1300)
  await foto('salao', { clip: await palco.boundingBox() })

  if (tamanho === 'pc') {
    for (const width of [320, 390, 640, 768, 1024, 1440, 1920]) {
      await pagina.setViewportSize({ width, height: 1000 })
      await pagina.waitForTimeout(100)
      assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Rolagem lateral em ${width}px`)
    }
    await pagina.setViewportSize({ width: 1440, height: 1000 })
  }
  await pagina.emulateMedia({ reducedMotion: 'reduce' })
  await pagina.waitForTimeout(100)
  assert.equal(await pagina.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect?.target?.closest?.('.bb')).length), 0, 'Animação com menos movimento')
  console.log(`${tamanho}: salão estável, peças funcionais, responsividade e menos movimento OK`)
}

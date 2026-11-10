import assert from 'node:assert/strict'
export async function antes(p) {
  await p.emulateMedia({ reducedMotion: 'reduce' })
  await p.addInitScript(() => { localStorage.removeItem('oq-cookies') })
  await p.route('https://bzrcdn.openai.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: 'window.__eventosOAI=window.oaiq.q.slice();window.oaiq=function(){window.__eventosOAI.push(Array.from(arguments))};' }))
  await p.route('https://connect.facebook.net/**', (r) => r.fulfill({ contentType: 'application/javascript', body: '' }))
  await p.route('https://bzr.openai.com/**', (r) => r.abort())
}
export default async function(p, foto, nome) {
  await p.addStyleTag({ content: '.aviso-cookies { display: flex !important; }' })
  const aviso = p.getByRole('region', { name: 'Aviso de cookies' })
  await aviso.waitFor()
  assert.equal(await p.locator('script[src*="bzrcdn.openai.com"]').count(), 0)
  await aviso.getByRole('button', { name: 'Recusar', exact: true }).click()
  assert.equal(await p.locator('script[src*="bzrcdn.openai.com"]').count(), 0)
  await p.evaluate(() => window.dispatchEvent(new Event('ortoquestoes:abrir-cookies')))
  await aviso.getByRole('button', { name: 'Aceitar', exact: true }).click()
  await p.waitForFunction(() => window.__eventosOAI?.some((x) => x[1] === 'page_viewed'))
  let eventos = await p.evaluate(() => window.__eventosOAI)
  assert.equal(eventos.find((x) => x[0] === 'init')[1].pixelId, 'Gk93oxGio9qeR7y5bs4Wop')
  const n = eventos.filter((x) => x[0] === 'measure').length
  await p.evaluate(() => { location.hash = '#/assinatura' })
  await p.waitForFunction((n) => window.__eventosOAI.filter((x) => x[0] === 'measure').length > n, n)
  await p.evaluate(() => window.dispatchEvent(new Event('ortoquestoes:abrir-cookies')))
  await foto('aviso')
  await aviso.getByRole('button', { name: 'Recusar', exact: true }).click()
  eventos = await p.evaluate(() => window.__eventosOAI)
  assert.deepEqual(eventos.at(-1), ['consent', false])
  await p.evaluate(() => { location.hash = '#/treinar' }); await p.waitForTimeout(200)
  assert.deepEqual(await p.evaluate(() => window.__eventosOAI), eventos)
  assert.equal(await p.locator('script[src*="bzrcdn.openai.com"]').count(), 1)
  console.log(nome, ': recusa, aceite, Pixel ID, navegação e revogação no navegador OK; SDK simulado, nenhum evento real enviado.')
}

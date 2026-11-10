// Consentimento, navegação SPA e eventos comerciais: sem rede e sem conversões de teste reais.
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { build } from 'esbuild'

const { outputFiles } = await build({ entryPoints: ['src/conta/consentimento.ts'], bundle: true, write: false, format: 'cjs', platform: 'node', define: { 'import.meta.env.VITE_META_PIXEL_ID': '""', 'import.meta.env.VITE_OPENAI_PIXEL_ID': '""', 'import.meta.env.DEV': 'false' } })
function ambiente(escolha) {
  const storage = new Map(escolha ? [['oq-cookies', JSON.stringify(escolha)]] : [])
  const scripts = [], listeners = new Map()
  const window = { location: { hash: '#/' }, addEventListener: (nome, cb) => listeners.set(nome, cb), dispatchEvent() {} }
  const module = { exports: {} }
  vm.runInNewContext(outputFiles[0].text, { module, window, document: { createElement: () => ({}), head: { appendChild: (s) => scripts.push(s) } }, localStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v) }, Event })
  return { m: module.exports, window, scripts, navegar: (rota) => { window.location.hash = rota; listeners.get('hashchange')?.() } }
}
for (const antigo of [undefined, { escolha: 'aceito', versao: 1 }, { escolha: 'recusado', versao: 2 }]) {
  const a = ambiente(antigo)
  a.m.iniciarPixel(); a.m.eventoAnuncio('CompleteRegistration')
  assert.equal(a.scripts.length, 0, 'Sem consentimento atual, nenhum SDK pode ser baixado')
  assert.equal(a.window.oaiq, undefined)
}
const a = ambiente()
a.m.definirConsentimento('aceito')
assert.equal(a.scripts.length, 2)
assert.equal(a.scripts.filter((s) => s.src === 'https://bzrcdn.openai.com/sdk/oaiq.min.js').length, 1)
const oq = a.window.oaiq.q
assert.deepEqual(JSON.parse(JSON.stringify(oq.slice(0, 3))), [['consent', false], ['init', { pixelId: 'Gk93oxGio9qeR7y5bs4Wop', debug: false }], ['consent', true]])
a.m.iniciarPixel(); a.m.iniciarPixel()
assert.equal(a.scripts.length, 2, 'React/aceites repetidos não devem duplicar a instalação')
a.m.eventoAnuncio('CompleteRegistration', { content_name: 'email', email: 'nao-enviar@exemplo.com' })
a.m.eventoAnuncio('AddToCart', { value: 39.9, content_name: 'mensal', currency: 'BRL' })
a.m.eventoAnuncio('InitiateCheckout', { value: 209.4, payment_type: 'pix' })
const eventos = () => oq.filter((x) => x[0] === 'measure')
assert.equal(eventos().filter((x) => x[1] === 'registration_completed').length, 1)
assert.equal(eventos().find((x) => x[1] === 'items_added')[2].amount, 3990)
assert.equal(eventos().find((x) => x[1] === 'checkout_started')[2].amount, 20940)
assert.equal(eventos().find((x) => x[1] === 'checkout_started')[2].currency, 'BRL')
assert.ok(!JSON.stringify(oq).includes('nao-enviar'))
assert.ok(!eventos().some((x) => ['order_created', 'subscription_created'].includes(x[1])), 'Gerar checkout não confirma compra')
let n = eventos().length
a.m.eventoAnuncio('InitiateCheckout', { value: NaN }); a.m.eventoAnuncio('AddToCart', { value: -1 })
assert.equal(eventos().length, n, 'Valores inválidos não devem virar receita')
a.navegar('#/assinatura?token=nao-enviar')
assert.equal(eventos().length, ++n)
assert.ok(!JSON.stringify(oq).includes('token='))
a.navegar('#/admin/emails')
assert.equal(eventos().length, n, 'Navegação no admin não é tráfego do anúncio')
a.m.definirConsentimento('recusado')
assert.deepEqual(JSON.parse(JSON.stringify(oq.at(-1))), ['consent', false])
const metaAntes = a.window.fbq.queue.length
a.navegar('#/treinar'); a.m.eventoAnuncio('CompleteRegistration'); a.m.iniciarPixel()
assert.equal(eventos().length, n)
assert.equal(a.window.fbq.queue.length, metaAntes, 'Revogar deve parar também PageView do Meta')
a.m.definirConsentimento('aceito'); a.navegar('#/assinatura')
assert.equal(a.scripts.length, 2)
assert.equal(eventos().length, n + 1, 'Reaceitar permite eventos futuros, sem repetir os bloqueados')
assert.ok(eventos().every((x) => x[3].opt_out === true))
console.log('Pixels: consentimento, revogação, instalação única, SPA, cadastro, checkout e centavos corretos.')

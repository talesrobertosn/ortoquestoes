// Atlas 3D no navegador (redesenho de 27/10/2026): seleção em dois tempos no celular e no computador.
// Sobe o site com o Supabase falso (conta assinante), abre o atlas no Chromium com WebGL (SwiftShader)
// e toca nas estruturas de verdade (pelo raio do próprio motor). Uso: node fixtures/e2e_atlas.mjs
// Não entra no npm test (WebGL por software leva alguns minutos); rodar ao mexer em src/atlas3d/ui.
import assert from 'node:assert/strict'

const SUPABASE = 'https://falso.supabase.co'
process.env.VITE_SUPABASE_URL = SUPABASE
const { createServer } = await import('vite')
const { chromium } = await import('playwright')

const CONTA = '11111111-2222-4333-8444-555555555555'

// ---------------- Supabase falso ----------------
const linhas = []
let versao = 0
let semMigracao = false
const copia = (l) => ({ tipo: l.tipo, item: l.item, valor: structuredClone(l.valor), versao: l.versao, operacao: l.operacao })
function sincronizar(usuario, alteracoes) {
  if (!Array.isArray(alteracoes) || alteracoes.length > 100) return [400, { code: 'P0001', message: 'Lote inválido' }]
  if (semMigracao && alteracoes.some((e) => e.tipo === 'biblioteca')) return [400, { code: '23514', message: 'new row for relation "progresso_usuario" violates check constraint "progresso_usuario_tipo_check"' }]
  const saida = []
  for (const e of alteracoes) {
    let atual = linhas.find((l) => l.usuario_id === usuario && l.tipo === e.tipo && l.item === e.item)
    if (!atual) {
      if (e.base !== 0) return [400, { code: 'P0001', message: 'Versão inicial inválida' }]
      atual = { usuario_id: usuario, tipo: e.tipo, item: e.item, valor: e.valor, operacao: e.operacao, versao: ++versao }
      linhas.push(atual)
    } else if (atual.operacao !== e.operacao && atual.versao === e.base) Object.assign(atual, { valor: e.valor, operacao: e.operacao, versao: ++versao })
    saida.push(copia(atual))
  }
  return [200, saida]
}
const rpcs = {
  sincronizar_progresso: (u, a) => sincronizar(u, a.alteracoes),
  ler_progresso_desde: (u, a) => [200, linhas.filter((l) => l.usuario_id === u && l.versao > a.p_cursor).sort((x, y) => x.versao - y.versao).slice(0, Math.min(a.p_limite ?? 500, 1000)).map(copia)],
  obter_acesso_premium: () => [200, [{ premium: true, motivo: 'assinatura', recursos_exclusivos: true, pagamentos_ativos: true }]],
  obter_estado_conta: () => [200, [{ status_assinatura: 'ativa', cancelar_ao_fim: false, fim_periodo: null }]],
  sinal_aparelho: () => [200, [{ ativo: true, outro_aparelho: null }]],
  autorizar_resposta: () => [200, [{ permitido: true, restantes: 999, limite: null, premium: true }]],
  meus_feitos: () => [200, { conquistas: [], dias: {}, indicados_assinantes: 0, indicados_30_dias: 0, simulado_edicoes: [], simulado_participacoes: [], ranking_semana: [], relatos_resolvidos: 0, comentarios_avaliados: 0, contra_corrente: 0, plano: null }],
}
async function atender(rota) {
  const pedido = rota.request()
  const url = new URL(pedido.url())
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
  if (pedido.method() === 'OPTIONS') return rota.fulfill({ status: 204, headers: cors })
  const token = (pedido.headers().authorization ?? '').replace(/^Bearer /, '')
  const usuario = token.startsWith('tok-') ? token.slice(4) : null
  const responder = (status, corpo) => rota.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
  if (url.pathname.startsWith('/auth/v1/user')) return responder(200, usuarioFalso(usuario ?? CONTA))
  if (url.pathname.startsWith('/auth/v1/')) return responder(200, {})
  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1]
  if (!usuario) return responder(401, { code: '42501', message: 'permission denied' })
  if (rpc && rpcs[rpc]) { const [s, c] = rpcs[rpc](usuario, JSON.parse(pedido.postData() || '{}')); return responder(s, c) }
  if (rpc) return responder(200, null)
  return responder(200, [])
}
function usuarioFalso(id) {
  return { id, aud: 'authenticated', role: 'authenticated', email: 'tales@exemplo.com', app_metadata: { provider: 'email' }, user_metadata: { nome: 'Tales' }, created_at: '2026-09-01T00:00:00Z' }
}


const site = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 500), strictPort: false }, logLevel: 'error' })
await site.listen()
const BASE = site.resolvedUrls.local[0]
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const erros = []
const FOTOS = process.env.FOTOS // pasta para guardar as telas (revisão visual)
const foto = (p, n) => FOTOS ? p.screenshot({ path: `${FOTOS}/${n}.png` }) : null
const PREF = JSON.stringify({ recentes: [], favoritos: [], dicasVistas: true })

async function aparelho(nome, viewport, movel) {
  const contexto = await navegador.newContext({ viewport, deviceScaleFactor: 1, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', hasTouch: movel, isMobile: movel })
  await contexto.route(`${SUPABASE}/**`, atender)
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: { ...usuarioFalso(CONTA), user_metadata: { nome: 'Tales', termos_versao: 999 } } }
  await contexto.addInitScript(([s, pref, conta]) => {
    localStorage.setItem('sb-ortoquestoes-auth', s)
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
    localStorage.setItem('oq-termos-adiado', String(Date.now()))
    localStorage.setItem(`ortoquestoes:conta:${conta}:atlas3d:preferencias`, pref)
    localStorage.setItem('ortoquestoes:atlas3d:preferencias', pref)
  }, [JSON.stringify(sessaoAuth), PREF, CONTA])
  const p = await contexto.newPage()
  p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
  return p
}
async function abrir(p, rota) {
  await p.goto(`${BASE}#/atlas${rota}`)
  await p.waitForFunction(() => window.__atlas3d && !document.querySelector('.atlas__carregando'), null, { timeout: 120_000 })
  await p.waitForFunction(() => !document.querySelector('.atlas__aviso-carga'), null, { timeout: 180_000 })
  await p.waitForTimeout(800)
}
/** Um ponto da tela onde o primeiro objeto atingido pelo raio é a estrutura pedida (ou qualquer uma, sem id). */
const pontoDe = (p, id) => p.evaluate((alvo) => {
  const m = window.__atlas3d, r = m.renderer.domElement.getBoundingClientRect()
  for (let y = 0.15; y < 0.8; y += 0.02) for (let x = 0.1; x < 0.9; x += 0.02) {
    const ev = { clientX: r.left + r.width * x, clientY: r.top + r.height * y }
    const a = m.acertos(ev)[0]
    if (a && (!alvo || a.object.userData.id === alvo)) return { x: ev.clientX, y: ev.clientY, id: a.object.userData.id }
  }
  return null
}, id)
const selecionada = (p) => p.evaluate(() => window.__atlas3d.selecionada?.id ?? null)
const camera = (p) => p.evaluate(() => window.__atlas3d.camera.position.toArray().map((n) => Math.round(n)))
const nomeNoCartao = (p) => p.locator('.at-rapido h2').innerText()
async function tocar(p, ponto, movel) { if (movel) await p.touchscreen.tap(ponto.x, ponto.y); else await p.mouse.click(ponto.x, ponto.y); await p.waitForTimeout(400) }

// ---------------- celular ----------------
{
  const p = await aparelho('celular', { width: 390, height: 844 }, true)
  await abrir(p, '/pelve-quadril?c=osso,musculo')
  // 1º toque: só o cartão compacto, até ~25% da altura; nada de modal
  const a = await pontoDe(p)
  assert.ok(a, 'nenhuma estrutura na tela')
  await tocar(p, a, true)
  assert.equal(await selecionada(p), a.id)
  await p.waitForSelector('.at-rapido')
  const caixa = await p.locator('.at-rapido').boundingBox()
  assert.ok(caixa.height <= 844 * 0.25, `cartão alto demais: ${caixa.height}px`)
  assert.equal(await p.locator('.at-modal').count(), 0, 'abriu modal no primeiro toque')
  const nomeA = await nomeNoCartao(p)
  await foto(p, 'cel-cartao')
  // detalhes: modal com X; fechar mantém a câmera e a seleção
  const cam = await camera(p)
  await p.locator('.at-rapido__detalhes').click()
  await p.waitForSelector('.at-modal__caixa')
  const modal = await p.locator('.at-modal__caixa').boundingBox()
  await foto(p, 'cel-modal')
  assert.ok(modal.y >= 0 && modal.y + modal.height <= 844, 'modal saiu da tela')
  await p.locator('.at-modal .at-ficha__fechar').last().click()
  await p.waitForTimeout(300)
  assert.equal(await p.locator('.at-modal').count(), 0, 'o X não fechou o modal')
  assert.equal(await selecionada(p), a.id, 'fechar o modal perdeu a seleção')
  assert.deepEqual(await camera(p), cam, 'fechar o modal mexeu na câmera')
  // outra estrutura troca o cartão na hora
  const b = await p.evaluate((id) => { const m = window.__atlas3d, r = m.renderer.domElement.getBoundingClientRect(); for (let y = 0.15; y < 0.62; y += 0.02) for (let x = 0.1; x < 0.9; x += 0.02) { const ev = { clientX: r.left + r.width * x, clientY: r.top + r.height * y }; const h = m.acertos(ev)[0]; if (h && h.object.userData.id !== id) return { x: ev.clientX, y: ev.clientY, id: h.object.userData.id } } return null }, a.id)
  assert.ok(b, 'não achou uma segunda estrutura acima do cartão')
  await tocar(p, b, true)
  assert.equal(await selecionada(p), b.id)
  assert.notEqual(await nomeNoCartao(p), nomeA)
  // voltar na trilha
  await p.locator('.at-rapido button[aria-label="Estrutura anterior"]').click()
  await p.waitForTimeout(500)
  assert.equal(await selecionada(p), a.id, 'voltar não levou à estrutura anterior')
  // pinça com dois dedos no mesmo lugar não seleciona nem limpa
  const antes = await selecionada(p)
  await p.evaluate(({ x, y }) => {
    const c = window.__atlas3d.renderer.domElement
    const ev = (tipo, id) => c.dispatchEvent(new PointerEvent(tipo, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 11 }))
    ev('pointerdown', 11); ev('pointerdown', 12); ev('pointerup', 12); ev('pointerup', 11)
  }, b)
  await p.waitForTimeout(300)
  assert.equal(await selecionada(p), antes, 'a pinça mudou a seleção')
  // busca: escolher o resultado fecha o painel e mostra o cartão
  await p.locator('.atlas__topo .at-chip').first().click()
  await p.locator('.at-busca input').fill('glúteo médio')
  await p.waitForTimeout(400)
  await p.locator('.at-resultados button').filter({ hasText: /glúteo médio/i }).first().click()
  await p.waitForTimeout(1500)
  assert.equal(await p.locator('.atlas__explorar').count(), 0, 'a busca não fechou o painel')
  assert.match(await nomeNoCartao(p), /glúteo médio/i)
  await foto(p, 'cel-busca-gluteo')
  // atalho para estrutura relacionada (nervo do músculo)
  const atalhos = p.locator('.at-rapido__atalhos button')
  if (await atalhos.count()) {
    const alvo = await atalhos.first().innerText()
    const antes = await nomeNoCartao(p)
    await atalhos.first().click()
    // o nervo pode estar numa camada desligada: ela carrega e a seleção vem depois
    await p.waitForFunction((n) => document.querySelector('.at-rapido h2')?.textContent !== n, antes, { timeout: 120_000 })
    assert.ok((await nomeNoCartao(p)).toLowerCase().includes(alvo.toLowerCase().replace(/^nervo /, '').split(' ')[0]), `o atalho (${alvo}) levou a ${await nomeNoCartao(p)}`)
  }
  // camadas com o cartão aberto
  const nervos = p.locator('.atlas__camadas button', { hasText: 'Nervos' })
  const ligado = await nervos.getAttribute('aria-pressed')
  await nervos.click(); await p.waitForTimeout(600)
  assert.notEqual(await nervos.getAttribute('aria-pressed'), ligado, 'a camada não mudou')
  // várias voltas: abrir, fechar, trocar
  for (let i = 0; i < 6; i++) {
    const c = await pontoDe(p); await tocar(p, c, true)
    await p.locator('.at-rapido__detalhes').click(); await p.waitForSelector('.at-modal__caixa')
    await p.keyboard.press('Escape'); await p.waitForTimeout(250)
    assert.equal(await p.locator('.at-modal').count(), 0)
  }
  // deitado: o cartão continua na tela
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(800)
  const c = await pontoDe(p); if (c) await tocar(p, c, true)
  if (await p.locator('.at-rapido').count()) { const bx = await p.locator('.at-rapido').boundingBox(); assert.ok(bx.y >= 0 && bx.y + bx.height <= 390, 'cartão fora da tela deitado') }
  await foto(p, 'cel-deitado')
  console.log('celular: ok')
}

// ---------------- computador ----------------
{
  const p = await aparelho('computador', { width: 1280, height: 800 }, false)
  await abrir(p, '?c=osso,musculo')
  await p.locator('.atlas__topo .at-chip').first().click() // fecha o painel de regiões
  const a = await pontoDe(p)
  await tocar(p, a, false)
  await p.waitForSelector('.atlas__ficha')
  const nome1 = await p.locator('.atlas__ficha h2').innerText()
  await foto(p, 'pc-painel')
  // recolher no cartão e reabrir
  await p.locator('.atlas__ficha button[aria-label="Recolher a ficha"]').click(); await p.waitForTimeout(300)
  assert.equal(await p.locator('.atlas__ficha').count(), 0)
  await p.waitForSelector('.at-rapido')
  await foto(p, 'pc-cartao')
  await p.locator('.at-rapido__detalhes').click(); await p.waitForSelector('.atlas__ficha')
  // seleção seguida atualiza o painel sem fechar
  const b = await p.evaluate((id) => { const m = window.__atlas3d, r = m.renderer.domElement.getBoundingClientRect(); for (let y = 0.15; y < 0.85; y += 0.02) for (let x = 0.1; x < 0.6; x += 0.02) { const ev = { clientX: r.left + r.width * x, clientY: r.top + r.height * y }; const h = m.acertos(ev)[0]; if (h && h.object.userData.id !== id) return { x: ev.clientX, y: ev.clientY, id: h.object.userData.id } } return null }, a.id)
  await tocar(p, b, false)
  assert.notEqual(await p.locator('.atlas__ficha h2').innerText(), nome1)
  // passar o mouse mostra o nome sem redesenhar a ficha
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  assert.equal(await selecionada(p), null, 'Esc não limpou')
  await p.mouse.move(a.x, a.y); await p.waitForTimeout(400); await p.mouse.move(a.x + 2, a.y + 1); await p.waitForTimeout(300)
  assert.equal(await p.locator('.atlas__dica').count(), 1, 'sem o nome sob o cursor')
  // larguras diferentes
  for (const w of [960, 1440]) { await p.setViewportSize({ width: w, height: 800 }); await p.waitForTimeout(400); await tocar(p, await pontoDe(p), false); await p.waitForSelector('.atlas__ficha') }
  console.log('computador: ok')
}

// a pinça simulada usa ponteiros sintéticos, que o OrbitControls tenta capturar (com dedos reais não acontece)
const reais = erros.filter((e) => !e.includes('setPointerCapture'))
assert.deepEqual(reais, [], reais.join('\n'))
console.log('Atlas 3D: seleção em dois tempos, modal, trilha, pinça, busca, camadas e painel lateral: OK')
await navegador.close(); await site.close()

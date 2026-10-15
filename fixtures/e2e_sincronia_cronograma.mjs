// Ponta a ponta no navegador (Playwright): o cronograma em dois aparelhos.
//
// Sobe o site (vite) apontando para um Supabase falso que o próprio teste
// atende (context.route), com as mesmas regras das funções reais de progresso
// (sincronizar_progresso, ler_progresso_desde) e do plano (obter_plano_estudo,
// ajustar_opcoes_plano). Cada aparelho é um contexto de navegador separado
// (armazenamento próprio), com o relógio deslocado.
//
// Roteiro (o bug relatado em 15/10/2026):
//  1. Computador abre o cronograma, começa a sessão do dia, responde 2 e deixa a aba no fundo.
//  2. MacBook abre o cronograma, começa e responde 5 questões, lê o resumão.
//  3. A aba do computador volta ao primeiro plano: sem recarregar, o cronograma mostra as 7
//     feitas e o resumão lido, e a sessão aberta lá não oferece de novo as questões do MacBook.
//  4. Segunda aba no computador e um terceiro navegador (aba nova) mostram o mesmo.
//
// Uso: node fixtures/e2e_sincronia_cronograma.mjs   (CHROMIUM=/caminho para outro navegador)
// Capturas em $CAPTURAS (padrão: pasta temporária).
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SUPABASE = 'https://falso.supabase.co'
process.env.VITE_SUPABASE_URL = SUPABASE
const { createServer } = await import('vite')
const { chromium } = await import('playwright')

const CONTA = '11111111-2222-4333-8444-555555555555'
const HORA = 3_600_000
const capturas = process.env.CAPTURAS ?? await mkdtemp(join(tmpdir(), 'orto-e2e-'))

// ---------------- Supabase falso ----------------
const linhas = []
let versao = 0
const pedidos = []
const plano = {
  data_prova: new Date(Date.now() + 120 * 24 * HORA).toISOString().slice(0, 10), intensidade: 'firme', folgas: [], prova: 'TEOT',
  base_respondidas: 0, criado_em: new Date(Date.now() - 10 * 24 * HORA).toISOString(), incluir_simulados: true, opcoes: {},
}
const copia = l => ({ tipo: l.tipo, item: l.item, valor: structuredClone(l.valor), versao: l.versao, operacao: l.operacao })
function sincronizar(usuario, alteracoes) {
  if (!Array.isArray(alteracoes) || alteracoes.length > 100) return [400, { code: 'P0001', message: 'Lote inválido' }]
  const saida = []
  for (const e of alteracoes) {
    let atual = linhas.find(l => l.usuario_id === usuario && l.tipo === e.tipo && l.item === e.item)
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
  ler_progresso_desde: (u, a) => [200, linhas.filter(l => l.usuario_id === u && l.versao > a.p_cursor).sort((x, y) => x.versao - y.versao).slice(0, Math.min(a.p_limite ?? 500, 1000)).map(copia)],
  obter_acesso_premium: () => [200, [{ premium: true, motivo: 'assinatura', recursos_exclusivos: true, pagamentos_ativos: true }]],
  obter_estado_conta: () => [200, [{ status_assinatura: 'ativa', cancelar_ao_fim: false, fim_periodo: null }]],
  obter_plano_estudo: () => [200, [structuredClone(plano)]],
  ajustar_opcoes_plano: (_u, a) => { plano.opcoes = { ...plano.opcoes, ...a.p_patch }; return [200, true] },
  salvar_plano_estudo: (_u, a) => { if (a.p_opcoes) plano.opcoes = a.p_opcoes; return [200, null] },
  sinal_aparelho: () => [200, [{ ativo: true, outro_aparelho: null }]],
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
  pedidos.push({ rpc, usuario, em: Date.now() })
  if (!usuario) return responder(401, { code: '42501', message: 'permission denied' })
  if (rpc && rpcs[rpc]) { const [s, c] = rpcs[rpc](usuario, JSON.parse(pedido.postData() || '{}')); return responder(s, c) }
  if (rpc) return responder(200, null)
  return responder(200, [])
}
function usuarioFalso(id) {
  return { id, aud: 'authenticated', role: 'authenticated', email: 'tales@exemplo.com', app_metadata: { provider: 'email' }, user_metadata: { nome: 'Tales' }, created_at: '2026-09-01T00:00:00Z' }
}

// ---------------- Site e navegador ----------------
const site = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 500), strictPort: false }, logLevel: 'error' })
await site.listen()
const BASE = site.resolvedUrls.local[0]
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const erros = []

async function aparelho(nome, desvio) {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
  await contexto.route(`${SUPABASE}/**`, atender)
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: usuarioFalso(CONTA) }
  await contexto.addInitScript(([s, d]) => {
    // Relógio do aparelho deslocado: o servidor não depende dele.
    const real = Date.now.bind(Date)
    Date.now = () => real() + d
    if (!localStorage.getItem('sb-ortoquestoes-auth')) localStorage.setItem('sb-ortoquestoes-auth', s)
  }, [JSON.stringify(sessaoAuth), desvio])
  const abrir = async () => {
    const p = await contexto.newPage()
    p.on('pageerror', e => erros.push(`${nome}: ${e.message}`))
    return p
  }
  return { nome, contexto, abrir }
}
async function abrirCronograma(p) {
  await p.goto(BASE + '#/cronograma')
  await p.waitForSelector('.cp-lista__item--novas', { timeout: 30_000 })
  await p.waitForFunction(() => /Sincronizado/.test(document.querySelector('.indicador-sincronia')?.textContent ?? ''), null, { timeout: 30_000 })
}
const feitasNoCartao = async p => {
  const t = await p.locator('.cp-lista__item--novas').innerText()
  return Number(t.match(/(\d+) de (\d+) feitas/)?.[1] ?? 0)
}
async function responderNaSessao(p, n) {
  for (let i = 0; i < n; i++) {
    await p.waitForSelector('.alternativa-envelope button, .alternativa-envelope [role="radio"], .alternativa-envelope label', { timeout: 30_000 })
    await p.locator('.alternativa-envelope').first().locator('button, label, [role="radio"]').first().click()
    await p.locator('button:has-text("Responder ")').first().click()
    await p.waitForSelector('.resultado, .aviso-ia, .gabarito', { timeout: 15_000 }).catch(() => undefined)
    if (i < n - 1) { await p.locator('button:has-text("Próxima")').first().click(); await p.waitForTimeout(300) }
  }
}
async function esconder(p, escondida) {
  await p.evaluate(v => {
    Object.defineProperty(document, 'visibilityState', { value: v ? 'hidden' : 'visible', configurable: true })
    Object.defineProperty(document, 'hidden', { value: v, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, escondida)
}
const sessaoDe = p => p.evaluate(() => {
  const chave = Object.keys(localStorage).find(k => k.endsWith(':sessao:atual'))
  return chave ? JSON.parse(localStorage.getItem(chave)) : null
})
const respondidasNoServidor = () => linhas.filter(l => l.usuario_id === CONTA && l.tipo === 'respondidas' && l.valor)

try {
  // 1. Computador: 9 min adiantado. Começa a sessão do dia e responde 2.
  const computador = await aparelho('computador', 9 * 60_000)
  const pc = await computador.abrir()
  await abrirCronograma(pc)
  await pc.locator('.cp-hoje button:has-text("Começar"), .cp-hoje a:has-text("Começar"), button:has-text("Começar:")').first().click()
  await pc.waitForURL(/#\/sessao/)
  await responderNaSessao(pc, 2)
  await pc.waitForFunction(() => true)
  await pc.goto(BASE + '#/cronograma'); await abrirCronograma(pc)
  assert.equal(await feitasNoCartao(pc), 2)
  const continuarAntes = await pc.locator('text=/Continuar: faltam \\d+ questões/').first().innerText()
  await pc.locator('.cp-hoje').screenshot({ path: join(capturas, '1-computador-antes.png') })
  await esconder(pc, true)

  // 2. MacBook: 7 min atrasado. Abre o cronograma (já vê as 2), responde 5 e lê o resumão.
  const macbook = await aparelho('macbook', -7 * 60_000)
  const mac = await macbook.abrir()
  await abrirCronograma(mac)
  assert.equal(await feitasNoCartao(mac), 2, 'o MacBook vê as 2 do computador')
  await mac.locator('button:has-text("Começar:"), button:has-text("Continuar:")').first().click()
  await mac.waitForURL(/#\/sessao/)
  await responderNaSessao(mac, 5)
  const idsMac = Object.keys((await sessaoDe(mac)).respostas)
  assert.equal(idsMac.length, 5)
  await mac.goto(BASE + '#/cronograma'); await abrirCronograma(mac)
  await mac.waitForFunction(() => /7 de \d+ feitas/.test(document.querySelector('.cp-lista__item--novas')?.textContent ?? ''), null, { timeout: 15_000 })
  const area = await mac.locator('.cp-lista__item--resumao a').getAttribute('href')
  await mac.goto(BASE + area.replace(/^.*#/, '#'))
  await mac.locator('button:has-text("Li esta área")').first().click()
  await mac.waitForFunction(() => true)
  await mac.goto(BASE + '#/cronograma'); await abrirCronograma(mac)
  await mac.waitForSelector('.cp-lista__item--resumao.cp-lista__item--feito', { timeout: 15_000 })
  assert.ok(plano.opcoes.marcasDia?.resumao?.length, 'resumão lido foi para o plano no servidor')
  await mac.screenshot({ path: join(capturas, '2-macbook.png') })
  assert.ok(idsMac.every(id => respondidasNoServidor().some(l => l.item === id)), 'as 5 do MacBook chegaram ao servidor')

  // 3. Horas depois, a aba do computador volta ao primeiro plano. Sem recarregar.
  await pc.waitForTimeout(1600)
  await esconder(pc, false)
  await pc.waitForFunction(() => /7 de \d+ feitas/.test(document.querySelector('.cp-lista__item--novas')?.textContent ?? ''), null, { timeout: 20_000 })
  await pc.waitForSelector('.cp-lista__item--resumao.cp-lista__item--feito', { timeout: 70_000 })
  const sessaoPc = await sessaoDe(pc)
  for (const id of idsMac) {
    if (sessaoPc.ids.includes(id)) assert.ok(sessaoPc.respostas[id]?.outroAparelho, `a sessão do computador marca ${id} como feita no outro aparelho`)
  }
  const continuarDepois = await pc.locator('.cp-hoje').innerText()
  console.log(`  computador antes: "${continuarAntes}"; depois: ${continuarDepois.match(/Continuar: faltam \d+[^\n]*/)?.[0] ?? continuarDepois.match(/Começar: \d+[^\n]*/)?.[0] ?? '(sem botão)'}`)
  assert.match(await pc.locator('.indicador-sincronia').innerText(), /Sincronizado/)
  await pc.locator('.cp-hoje').screenshot({ path: join(capturas, '3-computador-depois.png') })
  // A sessão aberta no computador pula o que o MacBook fez.
  await pc.goto(BASE + '#/sessao')
  await pc.waitForSelector('.progresso, .sessao-palco', { timeout: 20_000 })
  {
    const { ids, respostas, posicao } = sessaoPc
    const proxima = ids.findIndex((id, i) => i > posicao && !respostas[id])
    // Ou já está numa que falta, ou a próxima que falta vem logo depois (sem passar pelas do MacBook).
    assert.ok(!respostas[ids[posicao]] || !ids.slice(posicao + 1, proxima).some(id => respostas[id]?.outroAparelho), '"Continuar" não faz passar pelas questões feitas no MacBook')
  }
  const naSessao = Object.keys(sessaoPc.respostas).length
  const doMacNaSessao = idsMac.filter(id => sessaoPc.ids.includes(id)).length
  assert.equal(naSessao, 2 + doMacNaSessao, 'a sessão do computador tem as 2 dele e as do MacBook que estavam nela')
  await pc.waitForTimeout(500)
  await pc.screenshot({ path: join(capturas, '4-sessao-computador.png') })
  console.log(`  sessão do computador: ${naSessao} de ${sessaoPc.ids.length} respondidas (2 dele + ${doMacNaSessao} do MacBook)`)

  // 4. Segunda aba no computador e um terceiro navegador mostram o mesmo.
  const pc2 = await computador.abrir()
  await abrirCronograma(pc2)
  assert.equal(await feitasNoCartao(pc2), 7)
  const outro = await aparelho('aba-nova', 3 * HORA)
  const novo = await outro.abrir()
  await abrirCronograma(novo)
  assert.equal(await feitasNoCartao(novo), 7)
  await novo.waitForSelector('.cp-lista__item--resumao.cp-lista__item--feito', { timeout: 15_000 })

  // Duas abas abertas no computador: responder na segunda chega à primeira e ao servidor uma vez só.
  await pc2.locator('.cp-hoje :is(a, button):has-text("Continuar:")').first().click()
  await pc2.waitForURL(/#\/sessao/)
  await responderNaSessao(pc2, 1)
  await pc.goto(BASE + '#/cronograma'); await abrirCronograma(pc)
  await pc.waitForFunction(() => /8 de \d+ feitas/.test(document.querySelector('.cp-lista__item--novas')?.textContent ?? ''), null, { timeout: 20_000 })
  await novo.waitForTimeout(1600); await esconder(novo, true); await esconder(novo, false)
  await novo.waitForFunction(() => /8 de \d+ feitas/.test(document.querySelector('.cp-lista__item--novas')?.textContent ?? ''), null, { timeout: 20_000 })
  const unicas = new Set(respondidasNoServidor().map(l => l.item))
  assert.equal(unicas.size, respondidasNoServidor().length, 'nenhuma linha duplicada')
  assert.equal(unicas.size, 8)
  assert.deepEqual(erros, [], 'sem erro de página')
  console.log(`E2E sincronia do cronograma: computador, MacBook (relógios ±min), segunda aba e aba nova mostram as mesmas questões feitas e o resumão lido. Capturas em ${capturas}`)
} finally {
  await navegador.close()
  await site.close()
}

// Temas que mais caem por prova e cronograma da mão no navegador (27/10/2026), celular e computador.
// Sobe o site com o Supabase falso (conta assinante) e percorre os fluxos: escolher a prova, filtrar,
// treinar um assunto, montar o plano, começar o dia e recarregar. Uso: node fixtures/e2e_mao.mjs
// FOTOS=pasta guarda as telas para revisão visual.
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
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const erros = []
const FOTOS = process.env.FOTOS // pasta para guardar as telas (revisão visual)
const foto = (p, n) => FOTOS ? p.screenshot({ path: `${FOTOS}/${n}.png`, fullPage: true }) : null
const PREF = JSON.stringify({ recentes: [], favoritos: [], dicasVistas: true })
async function aparelho(nome, viewport, movel) {
  const contexto = await navegador.newContext({ viewport, deviceScaleFactor: 1, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', hasTouch: movel, isMobile: movel })
  await contexto.route(`${SUPABASE}/**`, atender)
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: { ...usuarioFalso(CONTA), user_metadata: { nome: 'Tales', termos_versao: 999 } } }
  await contexto.addInitScript(([s]) => {
    localStorage.setItem('sb-ortoquestoes-auth', s)
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
    localStorage.setItem('oq-termos-adiado', String(Date.now()))
  }, [JSON.stringify(sessaoAuth)])
  const p = await contexto.newPage()
  p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
  return p
}
const semRolagemLateral = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

for (const [nome, viewport, movel] of [['celular', { width: 390, height: 844 }, true], ['computador', { width: 1280, height: 800 }, false]]) {
  const p = await aparelho(nome, viewport, movel)
  // ---------- temas que mais caem ----------
  await p.goto(`${BASE}#/temas-que-mais-caem`)
  await p.waitForSelector('.tq-provas', { timeout: 60_000 })
  await p.waitForSelector('.tq-barras')
  await p.locator('.tq-provas button', { hasText: 'TEOT' }).click()
  await p.waitForSelector('#tq-mod-titulo'); assert.match(await p.locator('#tq-mod-titulo').innerText(), /TEOT/)
  assert.ok(await p.locator('.tq-foco').count() > 5)
  assert.match(await p.evaluate(() => location.hash), /prova=teot/)
  await foto(p, `${nome}-temas-teot`)
  await p.locator('.tq-provas button', { hasText: 'Ingresso' }).click()
  await p.waitForFunction(() => /ingresso/i.test(document.querySelector('#tq-mod-titulo')?.textContent ?? ''))
  const antes = await p.locator('.tq-heroi p').nth(2).innerText()
  await p.locator('.tq-fontes button', { hasText: 'USP-SP' }).click(); await p.waitForTimeout(300)
  assert.notEqual(await p.locator('.tq-heroi p').nth(2).innerText(), antes, 'o filtro de instituição não mudou a contagem')
  await p.locator('.tq-fontes button').first().click()
  await p.locator('.tq-barra').first().click(); await p.waitForTimeout(200)
  assert.ok(await p.locator('.tq-link', { hasText: 'Ver todas as áreas' }).count(), 'área não filtrou')
  await p.locator('.tq-link').click()
  await foto(p, `${nome}-temas-ingresso`)
  assert.ok(await semRolagemLateral(p), 'rolagem lateral nos temas')
  await p.locator('.tq-provas button', { hasText: 'Título' }).click()
  await p.waitForFunction(() => /título/i.test(document.querySelector('#tq-mod-titulo')?.textContent ?? ''))
  assert.match(await p.locator('.tq-heroi__previa').first().innerText(), /não as oficiais/)
  await foto(p, `${nome}-temas-titulo`)
  // a visão de sempre continua lá
  await p.locator('.tq-provas button', { hasText: 'Todas as provas' }).click()
  await p.waitForSelector('#tq-titulo')
  // treinar um assunto do título abre a sessão
  await p.goto(`${BASE}#/temas-que-mais-caem?prova=mao-titulo`)
  await p.waitForSelector('.tq-foco .tq-acao')
  await p.locator('.tq-foco .tq-acao').first().click()
  await p.waitForFunction(() => location.hash.startsWith('#/sessao'), null, { timeout: 30_000 })

  // ---------- cronograma da mão ----------
  await p.goto(`${BASE}#/cronograma-mao?prova=ingresso`)
  await p.waitForSelector('.cm-form, .cp-onde', { timeout: 60_000 })
  if (nome === 'computador') {
    // o plano montado no celular chegou pela conta (mesmo usuário, outro aparelho)
    assert.ok(await p.locator('.cp-onde').count(), 'o plano do celular não chegou ao computador')
    assert.match(await p.locator('.cp-onde h1').innerText(), /altam 40 dias/)
    await p.locator('.cp-onde__ajustar').click()
  }
  await p.waitForSelector('.cm-form')
  await foto(p, `${nome}-cron-form`)
  const data = new Date(Date.now() + 100 * 86400000).toISOString().slice(0, 10)
  await p.locator('.cm-form input[type="date"]').fill(data)
  await p.locator('.cm-opcoes button', { hasText: '1h30' }).click()
  await p.locator('.cm-form button[type="submit"]').click()
  await p.waitForSelector('.cp-onde')
  assert.match(await p.locator('.cp-onde h1').innerText(), /altam/)
  // a mesma arquitetura do cronograma de ortopedia: calendário, cartão Hoje, colunas e blocos que abrem
  for (const sel of ['.cc-janela', '.cp-hoje', '.cp-indo', '.cp-recolhidos']) assert.ok(await p.locator(sel).count(), `faltou ${sel}`)
  await p.locator('.cp-recolhidos summary', { hasText: 'Prioridades agora' }).click()
  assert.ok(await p.locator('.cm-prioridades li').count() >= 3)
  assert.ok(await semRolagemLateral(p), 'rolagem lateral no cronograma')
  await foto(p, `${nome}-cron-painel`)
  // recarregar: o plano continua (fica na conta)
  await p.reload(); await p.waitForSelector('.cp-onde', { timeout: 60_000 })
  // ajustar a data muda o plano sem perder nada
  await p.locator('.cp-onde__ajustar').click()
  await p.locator('.cm-form input[type="date"]').fill(new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10))
  await p.locator('.cm-form button[type="submit"]').click()
  await p.waitForSelector('.cp-onde')
  // título tem o próprio plano (ainda vazio)
  await p.locator('.troca-cron a', { hasText: 'título' }).click()
  await p.waitForSelector('.cm-form'); assert.match(await p.locator('.cm-form h1').innerText(), /Título/)
  await p.locator('.troca-cron a', { hasText: 'ingresso' }).click()
  await p.waitForSelector('.cp-onde')
  // começar o dia abre a sessão com as questões do plano
  const comecar = p.locator('.cp-hoje .cp-botao')
  if (await comecar.count()) { await comecar.click(); await p.waitForFunction(() => location.hash.startsWith('#/sessao'), null, { timeout: 30_000 }) }
  // o cronograma de ortopedia mostra a troca
  await p.goto(`${BASE}#/cronograma`); await p.waitForSelector('.troca-cron')
  console.log(`${nome}: ok`)
}
assert.deepEqual(erros, [], erros.join('\n'))
console.log('Temas por prova e cronograma da mão no navegador: OK')
await navegador.close(); await site.close()

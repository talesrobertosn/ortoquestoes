// Capturas reais dos Shorts para o post de lançamento (25/11/2026).
// Sobe o site (vite) com o Supabase falso (conta de exemplo assinante) e grava as telas em telas/ (fora do git).
// Uso (na raiz do repositório): CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node marketing/instagram/posts/2026-11-25-shorts/capturar.mjs
// O Supabase falso é o de marketing/instagram/posts/2026-10-27-atlas-3d/capturar.mjs, com as funções dos Shorts.
import { readFileSync, mkdirSync } from 'node:fs'

const SUPABASE = 'https://falso.supabase.co'
process.env.VITE_SUPABASE_URL = SUPABASE
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
  saldo_shorts: () => [200, [{ ilimitado: true, feitas: 7, limite: 5, libera_em: '2026-11-26T03:00:00Z' }]],
  responder_short: () => [200, [{ permitido: true, ilimitado: true, feitas: 8, limite: 5, libera_em: '2026-11-26T03:00:00Z' }]],
  meu_historico_shorts: () => [200, HISTORICO],
  alternar_coracao_short: () => [200, 1],
  registrar_vistas_shorts: () => [200, null],
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
  if (rpc === 'coracoes_shorts') return responder(200, [])
  if (!usuario) return responder(401, { code: '42501', message: 'permission denied' })
  if (rpc && rpcs[rpc]) { const [s, c] = rpcs[rpc](usuario, JSON.parse(pedido.postData() || '{}')); return responder(s, c) }
  if (rpc) return responder(200, null)
  return responder(200, [])
}
function usuarioFalso(id) {
  return { id, aud: 'authenticated', role: 'authenticated', email: 'tales@exemplo.com', app_metadata: { provider: 'email' }, user_metadata: { nome: 'Tales' }, created_at: '2026-09-01T00:00:00Z' }
}
const marcasNoServidor = () => linhas.filter((l) => l.tipo === 'biblioteca' && l.item.startsWith('m.') && l.valor && !l.valor.apagadaEm)



// Três revisões vencidas (erradas há 4 dias): a quarta questão do feed volta como revisão.
const DIA = 86_400_000
const HISTORICO = ['trauma-0181', 'pe-tornozelo-0179', 'joelho-0206'].map((id) => ({ id_questao: id, em: new Date(Date.now() - 4 * DIA).toISOString(), certo: false, revisao: false, volta_em: new Date(Date.now() - DIA).toISOString() }))

// Gabaritos do acervo, para responder certo.
const GABARITO = {}
for (const t of ['quadril', 'mao', 'coluna', 'ombro-cotovelo', 'joelho', 'trauma', 'pe-tornozelo', 'pediatria', 'tumores', 'conceitos-basicos', 'osteometabolicas']) {
  try { for (const q of JSON.parse(readFileSync(`public/acervo/temas/${t}.json`, 'utf8')).questoes) GABARITO[q.id] = q.gabarito } catch { /* tema ausente */ }
}

// ---------------- Site e navegador ----------------
const { createServer: criar } = await import('vite')
const site = await criar({ server: { port: 5300 + Math.floor(Math.random() * 500), strictPort: false }, logLevel: 'error' })
await site.listen()
const BASE = site.resolvedUrls.local[0]
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM, headless: true })
const erros = []
const TELAS = new URL('./telas/', import.meta.url).pathname
mkdirSync(TELAS, { recursive: true })
const ESCONDER = '.aviso-termos, .aviso-cookies, [class*="AvisoTermos"], [class*="aviso-termos"], .aviso-site, vite-error-overlay { display: none !important; }'

async function tela(nome, viewport, { escala = 3 } = {}) {
  const contexto = await navegador.newContext({ viewport, deviceScaleFactor: escala, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', hasTouch: viewport.width < 600 })
  await contexto.route(`${SUPABASE}/**`, atender)
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: { ...usuarioFalso(CONTA), user_metadata: { nome: 'Tales', termos_versao: 999 } } }
  await contexto.addInitScript(([s, conta]) => {
    localStorage.setItem('sb-ortoquestoes-auth', s)
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
    localStorage.setItem('oq-termos-adiado', String(Date.now()))
    localStorage.setItem('ortoquestoes:plano:assinante', 'true')
    localStorage.setItem(`ortoquestoes:conta:${conta}:shorts:ajustes`, JSON.stringify({ passarSozinha: false }))
  }, [JSON.stringify(sessaoAuth), CONTA])
  const p = await contexto.newPage()
  p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
  return p
}
const esconder = (p) => p.addStyleTag({ content: ESCONDER })
const CEL = { width: 390, height: 844 }
const MAC = { width: 1280, height: 800 }

/** Responde a questão da tela atual (certo ou com a primeira errada). */
async function responder(p, certo = true) {
  const id = (await p.evaluate(() => location.hash)).split('/').pop()
  const g = GABARITO[id]
  const i = await p.evaluate(([gab, certo]) => {
    const tela = [...document.querySelectorAll('.sh-tela')].find((t) => { const r = t.getBoundingClientRect(); return Math.abs(r.top) < 50 })
    const alts = [...tela.querySelectorAll('.sh-alt')]
    const alvo = alts.findIndex((b) => b.querySelector('.sh-alt-letra').textContent.trim() === gab)
    const idx = certo ? alvo : (alvo === 0 ? 1 : 0)
    alts[idx].click(); return idx
  }, [g, certo])
  await p.waitForTimeout(1600)
  return { id, i }
}
const proxima = async (p) => { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(1500) }

const passos = {
  async inicio() {
    const p = await tela('inicio', CEL)
    await p.goto(`${BASE}#/`); await p.waitForSelector('.sh-capa', { timeout: 60_000 }); await esconder(p)
    await p.waitForTimeout(3000)
    await p.locator('.jn-shorts').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -70)); await p.waitForTimeout(1500)
    await p.screenshot({ path: TELAS + 'cel-inicio.png' })
    await p.locator('.sh-prateleira').screenshot({ path: TELAS + 'prateleira-cel.png' })
    await p.locator('.navegacao-mobile').screenshot({ path: TELAS + 'barra.png' })
    // Menu: o quadradinho ao lado de "Continue sua jornada".
    await p.locator('.navegacao-mobile__menu').click(); await p.waitForTimeout(1500)
    await p.locator('.pt-jornada').screenshot({ path: TELAS + 'menu-jornada.png' })
    await p.locator('.sh-quadrado').screenshot({ path: TELAS + 'menu-quadrado.png' })
    const q = await tela('inicio-mac', { width: 1440, height: 900 }, { escala: 2 })
    await q.goto(`${BASE}#/`); await q.waitForSelector('.sh-capa', { timeout: 60_000 }); await esconder(q)
    await q.waitForTimeout(3000)
    await q.locator('.jn-shorts').scrollIntoViewIfNeeded(); await q.evaluate(() => window.scrollBy(0, 170)); await q.waitForTimeout(1500)
    await q.screenshot({ path: TELAS + 'mac-inicio.png' })
    await q.locator('.sh-prateleira').screenshot({ path: TELAS + 'prateleira-mac.png' })
    await q.locator('.navegacao-menu, button:has-text("Menu")').first().click().catch(() => undefined); await q.waitForTimeout(1500)
    await q.locator('.pt-jornada-topo').screenshot({ path: TELAS + 'menu-topo-mac.png' }).catch((e) => console.log('sem menu mac', e.message.split('\n')[0]))
  },
  async treinar() {
    const p = await tela('treinar', MAC, { escala: 2 })
    await p.goto(`${BASE}#/treinar`); await p.waitForSelector('.tn-shorts .sh-vertical', { timeout: 60_000 }); await esconder(p)
    await p.waitForTimeout(2500)
    await p.locator('.tn-shorts').screenshot({ path: TELAS + 'treinar.png' })
  },
  async player() {
    const p = await tela('player', CEL)
    await p.goto(`${BASE}#/shorts/quadril-0002`); await p.waitForSelector('.sh-alt', { timeout: 60_000 }); await esconder(p)
    await p.waitForTimeout(3500)
    await p.screenshot({ path: TELAS + 'cel-1-questao.png' })
    await responder(p, true); await p.waitForTimeout(800)
    await p.screenshot({ path: TELAS + 'cel-2-acertou.png' })
    await proxima(p); await p.waitForTimeout(1500)
    await p.screenshot({ path: TELAS + 'cel-3-segunda.png' })
    await responder(p, true); await proxima(p); await p.waitForTimeout(1200)
    await responder(p, true); await p.waitForTimeout(800)
    await p.screenshot({ path: TELAS + 'cel-4-sequencia.png' })
    await proxima(p); await p.waitForTimeout(2000)
    await p.screenshot({ path: TELAS + 'cel-5-revisao.png' })
    await p.locator('.sh-revisao').first().screenshot({ path: TELAS + 'selo-revisao.png' })
    await responder(p, true); await p.waitForTimeout(800)
    await p.screenshot({ path: TELAS + 'cel-6-fixou.png' })
    await p.locator('.sh-gaveta-cabeca', { hasText: 'Fixou' }).first().screenshot({ path: TELAS + 'fixou.png' })
    await p.locator('.sh-tela.sh-respondida .sh-ler-tudo').last().click().catch(() => undefined); await p.waitForTimeout(1500)
    await p.screenshot({ path: TELAS + 'cel-7-comentario.png' })
    // Coração com dois toques na imagem.
    await proxima(p); await p.waitForTimeout(1800)
    const m = await p.evaluate(() => { const t = [...document.querySelectorAll('.sh-tela')].find((x) => Math.abs(x.getBoundingClientRect().top) < 50); const r = t.querySelector('.sh-midia').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
    await p.mouse.dblclick(m.x, m.y); await p.waitForTimeout(350)
    await p.screenshot({ path: TELAS + 'cel-8-coracao.png' })
  },
  async computador() {
    const p = await tela('player-mac', MAC, { escala: 2 })
    await p.goto(`${BASE}#/shorts/ombro-cotovelo-0450`); await p.waitForSelector('.sh-alt', { timeout: 60_000 }); await esconder(p)
    await p.waitForTimeout(3500)
    await responder(p, false); await p.waitForTimeout(800)
    await p.screenshot({ path: TELAS + 'mac-errou.png' })
  },
}
const SO = process.env.SO ? process.env.SO.split(',') : null
for (const [n, f] of Object.entries(passos)) if (!SO || SO.includes(n)) { const t = Date.now(); try { await f(); console.log('ok', n, Math.round((Date.now() - t) / 1000) + 's') } catch (e) { console.log('ERRO', n, e.message.split('\n')[0]) } }
console.log(erros.length ? erros : 'sem erros')
await navegador.close(); await site.close()

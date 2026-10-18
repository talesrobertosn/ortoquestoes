// Capturas reais do site para o post de Kienböck (18/10/2026), base: resumos-biblioteca/capturar.mjs.
// Uso (na raiz): node marketing/instagram/posts/2026-10-18-kienbock-nivelamento/capturar.mjs
// O trecho abaixo, até "Capturas", é cópia das linhas 9 a 123 de fixtures/e2e_biblioteca.mjs.
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SUPABASE = 'https://falso.supabase.co'
process.env.VITE_SUPABASE_URL = SUPABASE
const { createServer } = await import('vite')
const { chromium } = await import('playwright')

const CONTA = '11111111-2222-4333-8444-555555555555'
const CAPITULO = 'rockwood10-53-colo-femur'
const capturas = process.env.CAPTURAS ?? await mkdtemp(join(tmpdir(), 'orto-e2e-bib-'))

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
const marcasNoServidor = () => linhas.filter((l) => l.tipo === 'biblioteca' && l.item.startsWith('m.') && l.valor && !l.valor.apagadaEm)

// ---------------- Site e navegador ----------------
const site = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 500), strictPort: false }, logLevel: 'error' })
await site.listen()
const BASE = site.resolvedUrls.local[0]
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const erros = []

async function aparelho(nome, viewport) {
  const contexto = await navegador.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', hasTouch: viewport.width < 600 })
  // Sem rede só para o Supabase: setOffline derrubaria também o servidor de desenvolvimento do Vite,
  // que recarrega a página ao perder a conexão (isso não acontece no site publicado).
  const estado = { semRede: false }
  await contexto.route(`${SUPABASE}/**`, (rota) => estado.semRede ? rota.abort('internetdisconnected') : atender(rota))
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: usuarioFalso(CONTA) }
  await contexto.addInitScript((s) => {
    if (!localStorage.getItem('sb-ortoquestoes-auth')) localStorage.setItem('sb-ortoquestoes-auth', s)
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
  }, JSON.stringify(sessaoAuth))
  const p = await contexto.newPage()
  p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
  const rede = async (ligada) => {
    estado.semRede = !ligada
    await p.evaluate((l) => { Object.defineProperty(navigator, 'onLine', { value: l, configurable: true }); window.dispatchEvent(new Event(l ? 'online' : 'offline')) }, ligada)
  }
  return { nome, contexto, p, rede }
}

async function abrirCapitulo(p) {
  await p.goto(`${BASE}#/resumos/${CAPITULO}`)
  await p.waitForSelector('.lr-pagina [data-texto]', { timeout: 30_000 })
}
const esperarSalvo = (p, t = 20_000) => p.waitForFunction(() => /Salvo na conta/.test(document.querySelector('.lr-salvo')?.textContent ?? ''), null, { timeout: t })
/** Seleciona `trecho` dentro do primeiro bloco de texto que o contém (como o dedo ou o mouse fariam). */
async function selecionar(p, trecho) {
  const ok = await p.evaluate((t) => {
    for (const el of document.querySelectorAll('[data-texto]')) {
      const andador = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let no = andador.nextNode(); no; no = andador.nextNode()) {
        const i = no.textContent.indexOf(t)
        if (i < 0) continue
        el.scrollIntoView({ block: 'center' })
        const r = document.createRange(); r.setStart(no, i); r.setEnd(no, i + t.length)
        const s = getSelection(); s.removeAllRanges(); s.addRange(r)
        return true
      }
    }
    return false
  }, trecho)
  assert.ok(ok, `trecho não encontrado: ${trecho}`)
  await p.waitForSelector('.lr-menu', { timeout: 5000 })
}
// ---------------- Capturas ----------------
const TELAS = new URL('./telas/', import.meta.url).pathname
const ESCONDER = '.aviso-termos, .aviso-cookies, [class*="AvisoTermos"], [class*="aviso-termos"], .lr-aviso, .lr-restante, vite-error-overlay { display: none !important; }'
async function tela(nome, viewport, { tema = 'claro', escala = 3 } = {}) {
  const contexto = await navegador.newContext({ viewport, deviceScaleFactor: escala, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', hasTouch: viewport.width < 600 })
  await contexto.route(`${SUPABASE}/**`, atender)
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: { ...usuarioFalso(CONTA), user_metadata: { nome: 'Tales', termos_versao: 999 } } }
  await contexto.addInitScript(([s, t]) => {
    localStorage.setItem('sb-ortoquestoes-auth', s)
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
    localStorage.setItem('ortoquestoes:tema', JSON.stringify(t))
    localStorage.setItem('oq-termos-adiado', String(Date.now()))
  }, [JSON.stringify(sessaoAuth), tema])
  const p = await contexto.newPage()
  p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
  return p
}
const css = (p) => p.addStyleTag({ content: ESCONDER })
async function leitor(p, cap = CAPITULO) {
  await p.goto(`${BASE}#/resumos/${cap}`)
  await p.waitForSelector('.lr-pagina [data-texto]', { timeout: 30_000 })
  await css(p); await p.waitForTimeout(800)
}
async function aparencia(p, mudancas) {
  await p.click('.lr-botao--aa'); await p.waitForSelector('.lr-aparencia__linha')
  for (const m of mudancas) await p.locator('.lr-painel').getByRole('radio', { name: m, exact: true }).first().click()
  await p.waitForTimeout(300)
}
async function destacar(p, trecho, cor = 'amarelo') {
  await selecionar(p, trecho)
  await p.locator(`.lr-menu .lr-cor--${cor}`).click()
  await p.waitForTimeout(400)
}
const rolarAte = (p, sel, bloco = 'start', dy = 0) => p.evaluate(([s, b, d]) => { const el = typeof s === 'string' ? document.querySelector(s) : null; el?.scrollIntoView({ block: b }); document.querySelector('.lr-rolagem')?.scrollBy(0, d) }, [sel, bloco, dy])
async function rolarAteTexto(p, texto, dy = 0) {
  await p.evaluate(([t, d]) => { const el = [...document.querySelectorAll('h2, h3, [data-texto]')].find((e) => e.textContent.includes(t)); el?.scrollIntoView({ block: 'start' }); document.querySelector('.lr-rolagem')?.scrollBy(0, d) }, [texto, dy])
  await p.waitForTimeout(500)
}
const cartao = (p, texto) => p.locator('.lr-cobranca', { hasText: texto }).first()
async function abrirCartao(p, texto) { const c = cartao(p, texto); await c.locator('.lr-cobranca__como').click(); await p.waitForTimeout(300); return c }

// Abre a questão avulsa, responde a letra e grava a questão, as alternativas corrigidas e o comentário.
const SEM_BARRA = 'nav[class*="inferior"], .barra-inferior, .navegacao-inferior, nav.abas, .menu-inferior { display: none !important; }'
async function questao(p, id, letra) {
  linhas.length = 0
  const w = p.viewportSize().width
  await p.goto(`${BASE}#/questao/${id}`)
  await p.waitForSelector('.alternativa', { timeout: 30_000 })
  await css(p); await p.addStyleTag({ content: SEM_BARRA }); await p.waitForTimeout(1200)
  const cartao = p.locator('.alternativa').first().locator('xpath=ancestor::*[contains(@class,"cartao") or contains(@class,"questao")][1]')
  await p.screenshot({ path: TELAS + `${id}-antes-${w}.png` })
  const indice = 'ABCDE'.indexOf(letra)
  await p.locator('.alternativa').nth(indice).click()
  await p.waitForTimeout(400)
  await p.getByRole('button', { name: new RegExp(`Responder ${letra}`) }).click()
  await p.waitForSelector('.cm-conceito, .cm-alt--certa', { timeout: 20_000 })
  await p.waitForTimeout(1500)
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300)
  await p.screenshot({ path: TELAS + `${id}-depois-${w}.png` })
  await p.screenshot({ path: TELAS + `${id}-inteira-${w}.png`, fullPage: true })
  await p.addStyleTag({ content: '.cabecalho, .navegacao-mobile { display: none !important; }' }); await p.waitForTimeout(300)
  for (const [sel, nome] of [['.cm-conceito', 'conceito'], ['.cm-alt--certa', 'certa'], ['.comentario', 'comentario']]) {
    const el = p.locator(sel).first()
    if (await el.count()) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await el.screenshot({ path: TELAS + `${id}-${nome}-${w}.png` }) }
  }
  const lista = p.locator('.alternativa').first().locator('xpath=ancestor::ol[1] | ancestor::ul[1]')
  if (await lista.count()) await lista.first().screenshot({ path: TELAS + `${id}-alternativas-${w}.png` })
}
const IDS = [['mao-0430', 'B'], ['mao-0546', 'D']]
for (const [id, letra] of IDS) {
  linhas.length = 0
  const cel = await tela(id, { width: 390, height: 844 })
  await questao(cel, id, letra)
  linhas.length = 0
  const pc = await tela(id + '-pc', { width: 1280, height: 800 }, { escala: 2 })
  await questao(pc, id, letra)
  console.log('ok', id)
}
console.log(erros.length ? erros : 'sem erros')
await navegador.close(); await site.close()

// Capturas reais do Atlas 3D para o post de lançamento (27/10/2026).
// Sobe o site (vite) com o Supabase falso da Biblioteca (conta de exemplo assinante, todas as camadas)
// e grava as telas em telas/ (fora do git). WebGL pelo SwiftShader do Chromium.
// Uso (na raiz do repositório): node marketing/instagram/posts/2026-10-27-atlas-3d/capturar.mjs
// O trecho do Supabase falso é cópia de marketing/instagram/resumos-biblioteca/capturar.mjs.

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
const marcasNoServidor = () => linhas.filter((l) => l.tipo === 'biblioteca' && l.item.startsWith('m.') && l.valor && !l.valor.apagadaEm)


// ---------------- Site e navegador ----------------
const site = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 500), strictPort: false }, logLevel: 'error' })
await site.listen()
const BASE = site.resolvedUrls.local[0]
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const erros = []

// ---------------- Capturas ----------------
const TELAS = new URL('./telas/', import.meta.url).pathname
const ESCONDER = '.aviso-termos, .aviso-cookies, [class*="AvisoTermos"], [class*="aviso-termos"], vite-error-overlay { display: none !important; }'
const PREF = { recentes: ['scaphoid_bone_r', 'trapezium_r', 'capitate_bone_r'], favoritos: [], dicasVistas: true }
async function tela(nome, viewport, { escala = 2 } = {}) {
  const contexto = await navegador.newContext({ viewport, deviceScaleFactor: escala, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', hasTouch: viewport.width < 600 })
  await contexto.route(`${SUPABASE}/**`, atender)
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: { ...usuarioFalso(CONTA), user_metadata: { nome: 'Tales', termos_versao: 999 } } }
  await contexto.addInitScript(([s, pref, conta]) => {
    localStorage.setItem('sb-ortoquestoes-auth', s)
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
    localStorage.setItem('oq-termos-adiado', String(Date.now()))
    localStorage.setItem(`ortoquestoes:conta:${conta}:atlas3d:preferencias`, pref)
    localStorage.setItem('ortoquestoes:atlas3d:preferencias', pref)
  }, [JSON.stringify(sessaoAuth), JSON.stringify(PREF), CONTA])
  const p = await contexto.newPage()
  p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
  return p
}
/** Abre o atlas, espera o esqueleto e as camadas pedidas terminarem de carregar. */
async function atlas(p, rota, camadas = []) {
  await p.goto(`${BASE}#/atlas${rota}`)
  await p.waitForSelector('.atlas__camadas', { timeout: 60_000, state: 'attached' })
  await p.waitForFunction(() => !document.querySelector('.atlas__carregando'), null, { timeout: 120_000 })
  await p.addStyleTag({ content: ESCONDER })
  for (const c of camadas) {
    const b = p.locator('.atlas__camadas button', { hasText: c })
    if ((await b.getAttribute('aria-pressed')) !== 'true') await b.dispatchEvent('click')
  }
  await esperarCarga(p)
}
const esperarCarga = async (p) => { await p.waitForTimeout(600); await p.waitForFunction(() => !document.querySelector('.atlas__aviso-carga'), null, { timeout: 180_000 }); await p.waitForTimeout(2500) }
/** A janela do atlas inteira (sem a página que fica por trás do pop-up). */
const janela = async (p, arquivo) => { await p.mouse.move(2, 2); await p.waitForTimeout(400); const c = await p.locator('.atlas').boundingBox(); await p.screenshot({ path: TELAS + arquivo, clip: { x: c.x + 4, y: c.y + 4, width: c.width - 8, height: c.height - 8 } }) }
/** Aproxima a câmera com a rodinha num ponto da tela (fração da largura e da altura). */
const zoom = async (p, fx, fy, passos, dy = -240) => { const v = p.viewportSize(); await p.mouse.move(v.width * fx, v.height * fy); for (let i = 0; i < passos; i++) { await p.mouse.wheel(0, dy); await p.waitForTimeout(120) } await p.waitForTimeout(1800) }
const recorte = (p, sel, arquivo) => p.locator(sel).first().screenshot({ path: TELAS + arquivo })

const SO = process.env.SO ? process.env.SO.split(',') : null
const fecharExplorar = async (p) => { if (await p.locator('.atlas__explorar').count()) { await p.locator('.atlas__topo .at-chip').first().click(); await p.waitForTimeout(800) } }
const vista = async (p, v) => { await p.locator('.atlas__vistas button', { hasText: v }).first().click(); await p.waitForTimeout(1800) }
const opacidade = (p, grupo, valor) => p.evaluate(([g, v]) => { const el = [...document.querySelectorAll('.at-faixa-opacidade')].find((l) => l.textContent.includes(g))?.querySelector('input'); if (!el) return; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }, [grupo, valor])
const MAC = { width: 1280, height: 800 }
const CEL = { width: 390, height: 844 }
const passos = {
  // Capa: corpo inteiro com ossos, nervos e artérias.
  async corpo() {
    const p = await tela('corpo', MAC)
    await atlas(p, '', ['Nervos', 'Artérias'])
    await janela(p, 'mac-corpo-explorar.png')
    await fecharExplorar(p); await p.waitForTimeout(1500)
    await janela(p, 'mac-corpo.png')
    await recorte(p, '.atlas__camadas', 'camadas.png')
    await recorte(p, '.atlas__vistas', 'vistas.png')
  },
  // Escafoide com nervos e artérias, ficha na aba Classificações e as questões de anatomia.
  async escafoide() {
    const p = await tela('escafoide', MAC)
    await atlas(p, '?e=scaphoid_bone_r', ['Nervos', 'Artérias'])
    await p.waitForSelector('.atlas__ficha'); await p.waitForTimeout(1500)
    await janela(p, 'mac-escafoide.png')
    await recorte(p, '.atlas__ficha', 'ficha-escafoide.png')
    await p.locator('.at-ficha__questoes .at-ouro').click()
    await p.waitForTimeout(3500)
    await janela(p, 'mac-escafoide-questao.png')
    await recorte(p, '.atlas__ficha', 'painel-questao.png')
  },
  // Abdutor curto do polegar: origem e inserção acesas no modelo e a ficha anatômica.
  async abdutor() {
    const p = await tela('abdutor', MAC)
    await atlas(p, '?e=abductor_pollicis_brevis_r&c=osso,musculo', ['Nervos'])
    await p.waitForSelector('.atlas__ficha'); await p.waitForTimeout(1500)
    await p.locator('.atlas__topo .at-botao-icone').first().click(); await p.waitForTimeout(500)
    await opacidade(p, 'Músculos', 0.25); await p.waitForTimeout(500)
    await p.locator('.atlas__topo .at-botao-icone').first().click(); await p.waitForTimeout(1500)
    await janela(p, 'mac-abdutor.png')
    await recorte(p, '.atlas__ficha', 'ficha-abdutor.png')
  },
  // Visualização pronta do manguito rotador (vista posterior) com a legenda.
  async manguito() {
    const p = await tela('manguito', MAC)
    await atlas(p, '/ombro?lado=d&c=osso,musculo', ['Nervos'])
    await p.locator('.at-preset', { hasText: 'Manguito rotador' }).click()
    await esperarCarga(p)
    await fecharExplorar(p)
    await vista(p, 'Post'); await p.waitForTimeout(1500)
    await janela(p, 'mac-manguito-longe.png')
    await zoom(p, 0.48, 0.45, 3)
    await janela(p, 'mac-manguito.png')
    await recorte(p, '.atlas__preset', 'legenda-manguito.png')
  },
  // Pelve e quadril com nervos e artérias (como no print do Tales).
  async pelve() {
    const p = await tela('pelve', MAC)
    await atlas(p, '/pelve-quadril', ['Nervos', 'Artérias'])
    await fecharExplorar(p); await p.waitForTimeout(1500)
    await janela(p, 'mac-pelve.png')
  },
  // Celular: abdutor curto do polegar e escafoide, com a ficha na gaveta.
  async celular() {
    const p = await tela('cel-abdutor', CEL, { escala: 3 })
    await atlas(p, '?e=abductor_pollicis_brevis_r&c=osso,musculo')
    await p.waitForTimeout(2000)
    await p.screenshot({ path: TELAS + 'cel-abdutor.png' })
    const q = await tela('cel-escafoide', CEL, { escala: 3 })
    await atlas(q, '?e=scaphoid_bone_r', ['Nervos', 'Artérias'])
    await q.waitForTimeout(2000)
    await q.screenshot({ path: TELAS + 'cel-escafoide.png' })
  },
}
for (const [n, f] of Object.entries(passos)) if (!SO || SO.includes(n)) { const t = Date.now(); await f(); console.log('ok', n, Math.round((Date.now() - t) / 1000) + 's') }
console.log(erros.length ? erros : 'sem erros')
await navegador.close(); await site.close()

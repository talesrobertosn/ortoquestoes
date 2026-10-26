// Capturas reais para os stories de 28/10/2026: temas que mais caem e cronograma da Cirurgia da Mão.
// Conta de exemplo assinante, com algumas questões da mão respondidas e um plano de ingresso montado
// (por isso as telas levam "Tela ilustrativa"). Grava em telas/ (fora do git).
// Uso (na raiz do repositório): node marketing/instagram/posts/2026-10-28-mao-cronograma/capturar.mjs
import { readFileSync } from 'node:fs'
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
const TELAS = new URL('./telas/', import.meta.url).pathname
const ESCONDER = '.aviso-termos, .cracha-perfil, .aviso-cookies, vite-error-overlay, .voltar-topo { display: none !important; } .cabecalho, header.cabecalho, .topo-site { position: static !important; }'
// respostas de exemplo: questões de ingresso da mão, cerca de 70% de acerto, nos últimos 10 dias
const indice = JSON.parse(readFileSync('public/acervo/indice.json', 'utf8'))
const ingresso = indice.questoes.filter((q) => q.ar === 'mao' && q.sim !== 1 && !q.dup && q.an !== 1 && !['SBCM', 'SIMÃO'].includes(indice.provas[q.p]))
const agora = Date.now()
const respondidas = Object.fromEntries(ingresso.filter((_, i) => i % 7 === 0).slice(0, 160).map((q, i) => [q.id, { c: i % 10 < 7, q: agora - (i % 10) * 86400000 - 3600000 }]))
const hoje = new Date(agora - 3 * 3600000).toISOString().slice(0, 10)
const biblioteca = { 'c.mao-ingresso': { tipo: 'pref', prova: 'ingresso', dataProva: '2026-12-15', dias: [1, 2, 3, 4, 5, 6], minutosDia: 60, cobertura: 'completa', criadoEm: '2026-10-19', em: agora } }

async function tela(viewport, escala) {
  const contexto = await navegador.newContext({ viewport, deviceScaleFactor: escala, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', hasTouch: viewport.width < 600, isMobile: viewport.width < 600 })
  await contexto.route(`${SUPABASE}/**`, atender)
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: { ...usuarioFalso(CONTA), user_metadata: { nome: 'Tales', termos_versao: 999 } } }
  await contexto.addInitScript(([s, conta, r, b]) => {
    localStorage.setItem('sb-ortoquestoes-auth', s)
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
    localStorage.setItem('oq-termos-adiado', String(Date.now()))
    if (!localStorage.getItem(`ortoquestoes:conta:${conta}:respondidas`)) localStorage.setItem(`ortoquestoes:conta:${conta}:respondidas`, r)
    if (!localStorage.getItem(`ortoquestoes:conta:${conta}:biblioteca`)) localStorage.setItem(`ortoquestoes:conta:${conta}:biblioteca`, b)
  }, [JSON.stringify(sessaoAuth), CONTA, JSON.stringify(respondidas), JSON.stringify(biblioteca)])
  const p = await contexto.newPage()
  p.on('pageerror', (e) => erros.push(e.message))
  return p
}
async function abrir(p, rota, seletor) {
  await p.goto(`${BASE}#${rota}`); await p.waitForSelector(seletor, { timeout: 60_000 })
  await p.addStyleTag({ content: ESCONDER }); await p.waitForTimeout(900)
}
const ate = (p, sel, dy = -12) => p.evaluate(([s, d]) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + d) }, [sel, dy])

const cel = await tela({ width: 390, height: 844 }, 3)
await abrir(cel, '/temas-que-mais-caem?prova=mao-ingresso', '#tq-mod-titulo')
await ate(cel, '.tq-provas'); await cel.waitForTimeout(400)
await cel.screenshot({ path: TELAS + 'cel-temas-ingresso.png' })
await cel.locator('.tq-provas').screenshot({ path: TELAS + 'seletor.png' })
await ate(cel, '#tq-mod-ranking', -80); await cel.waitForTimeout(400)
await cel.screenshot({ path: TELAS + 'cel-ranking-ingresso.png' })
await cel.locator('.tq-grupo').first().screenshot({ path: TELAS + 'grupo-ingresso.png' })
await abrir(cel, '/temas-que-mais-caem?prova=mao-titulo', '#tq-mod-titulo')
await ate(cel, '.tq-mod .tq-heroi'); await cel.waitForTimeout(400)
await cel.screenshot({ path: TELAS + 'cel-temas-titulo.png' })
await cel.locator('.tq-grupo').first().screenshot({ path: TELAS + 'grupo-titulo.png' })
await abrir(cel, '/cronograma-mao?prova=ingresso', '.cm-heroi')
await ate(cel, '.troca-cron'); await cel.waitForTimeout(400)
await cel.screenshot({ path: TELAS + 'cel-cron.png' })
await cel.locator('.cm-hoje').screenshot({ path: TELAS + 'cm-hoje.png' })
await cel.locator('.cm-indicadores').screenshot({ path: TELAS + 'cm-indicadores.png' })
await cel.locator('.cm-prioridades').screenshot({ path: TELAS + 'cm-prioridades.png' })
await abrir(cel, '/cronograma-mao?prova=titulo', '.cm-form')
await ate(cel, '.cm-form'); await cel.screenshot({ path: TELAS + 'cel-form-titulo.png' })

const pc = await tela({ width: 1280, height: 800 }, 2)
await abrir(pc, '/cronograma-mao?prova=ingresso', '.cm-heroi')
await ate(pc, '.troca-cron'); await pc.waitForTimeout(500)
await pc.screenshot({ path: TELAS + 'mac-cron.png' })
await abrir(pc, '/temas-que-mais-caem?prova=mao-ingresso', '#tq-mod-titulo')
await pc.locator('.tq-provas').screenshot({ path: TELAS + 'seletor.png' })
await abrir(pc, '/temas-que-mais-caem?prova=mao-titulo', '#tq-mod-titulo')
await ate(pc, '.tq-mod .tq-heroi'); await pc.waitForTimeout(500)
await pc.screenshot({ path: TELAS + 'mac-temas-titulo.png' })
await ate(pc, '.tq-explorar'); await pc.waitForTimeout(500)
await pc.screenshot({ path: TELAS + 'mac-ranking-titulo.png' })
console.log(erros.length ? erros : 'telas ok')
await navegador.close(); await site.close()

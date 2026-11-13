// Capturas reais do comentário da questão tumores-0394 num iPhone, para os stories "Como escrevemos", 13/11/2026.
// Sobe o site (vite) com o Supabase falso (o mesmo de marketing/instagram/resumos-biblioteca/capturar.mjs:
// conta de exemplo assinante), responde a questão e grava as telas do comentário em img/cel-*.png.
// Uso (na raiz do repositório): node marketing/instagram/posts/2026-11-13-errata-metastases/capturar.mjs
// O trecho abaixo, até "Capturas", é cópia das linhas 9 a 123 de fixtures/e2e_biblioteca.mjs.
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
const PASTA = new URL('./img/', import.meta.url).pathname
const ESCONDER = '.aviso-termos, .aviso-cookies, [class*="AvisoTermos"], [class*="aviso-termos"], [class*="cookie"], [class*="Cookie"], [class*="indique"], vite-error-overlay { display: none !important; }'

const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: { ...usuarioFalso(CONTA), user_metadata: { nome: 'Tales', termos_versao: 999 } } }

// O iPhone (390 x 844 pontos, 3x): a página fica entre a barra de status (47 pontos) e a faixa do indicador de
// início (34 pontos), as duas desenhadas no HTML.
const cel = await navegador.newContext({ viewport: { width: 390, height: 763 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
await cel.route(`${SUPABASE}/**`, atender)
await cel.addInitScript(([s, t]) => {
  localStorage.setItem('sb-ortoquestoes-auth', s)
  localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
  localStorage.setItem('oq:eventos:ligados:v1', '0')
  localStorage.setItem('ortoquestoes:tema', JSON.stringify(t))
  localStorage.setItem('oq-termos-adiado', String(Date.now()))
}, [JSON.stringify(sessaoAuth), process.env.TEMA ?? 'claro'])
const c = await cel.newPage()
await c.goto(`${BASE}#/questao/tumores-0394`)
await c.waitForSelector('text=Sobre o aspecto radiográfico', { timeout: 30_000 })
await c.addStyleTag({ content: ESCONDER })
await c.waitForTimeout(1000)
await c.keyboard.press('2'); await c.keyboard.press('s'); await c.keyboard.press('Enter')
await c.waitForSelector('text=É a transcrição do Campbell', { timeout: 30_000 })
await c.addStyleTag({ content: ESCONDER })
await c.waitForTimeout(1200)
// Telas: [nome, texto que fica no alto da tela, ajuste em pontos]
const telasCel = [
  ['cel-aviso', 'Atenção ao gabarito desta questão', -16],
  ['cel-tabela', 'O padrão por primário, nas duas edições', -14],
  ['cel-certa', 'Por que a B está certa', -14],
  ['cel-outras', 'Por que as outras não servem', -14],
]
for (const [nome, texto, aj] of telasCel) {
  await c.evaluate(([t, a]) => {
    const el = [...document.querySelectorAll('body *')].filter((e) => e.textContent.trim().startsWith(t)).pop()
    window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top + a - 64)
  }, [texto, aj])
  await c.waitForTimeout(800)
  await c.screenshot({ path: PASTA + `${nome}.png` })
}
await navegador.close()
await site.close()

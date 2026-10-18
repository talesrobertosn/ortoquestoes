// Capturas de páginas do site para revisão de design (18/10/2026).
// Uso: node scripts/capturar_telas.mjs <rota> <prefixo> [--sem-conta] [--escuro] [--pasta DIR]
// Ex.: node scripts/capturar_telas.mjs /desempenho desempenho-antes --pasta /tmp/telas
// Sobe o site (vite) com um Supabase falso (conta assinante de exemplo) e grava celular (390) e computador (1440), dobra e página inteira.

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
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const erros = []

const args = process.argv.slice(2)
const ROTA = args[0] ?? '/'
const PREF = args[1] ?? 'tela'
const iPasta = args.indexOf('--pasta')
const TELAS = (iPasta >= 0 ? args[iPasta + 1] : '/tmp/telas').replace(/\/?$/, '/')
const SEM_CONTA = args.includes('--sem-conta')
const TEMA = args.includes('--escuro') ? 'escuro' : 'claro'
const { mkdirSync } = await import('node:fs')
mkdirSync(TELAS, { recursive: true })
// --com-dados: 420 respostas de exemplo nos últimos 40 dias (65% de acerto), para desempenho, ranking e cronograma.
const COM_DADOS = args.includes('--com-dados')
let respondidasExemplo = null
if (COM_DADOS) {
  const { readFileSync } = await import('node:fs')
  const indice = JSON.parse(readFileSync(new URL('../public/acervo/indice.json', import.meta.url), 'utf8'))
  const ids = indice.questoes.map((q) => q.id ?? q.i).filter(Boolean)
  let semente = 7
  const sorte = () => (semente = (semente * 16807) % 2147483647) / 2147483647
  respondidasExemplo = {}
  const agora = Date.now()
  for (let k = 0; k < 420 && ids.length; k++) {
    const id = ids[Math.floor(sorte() * ids.length)]
    const em = agora - Math.floor(sorte() * 40 * 86400000)
    const c = sorte() < 0.65
    respondidasExemplo[id] = { c, q: em, tentativas: 1, acertos: c ? 1 : 0, erros: c ? 0 : 1, sequencia: c ? 1 : 0, proximaRevisao: em + (c ? 10 : 1) * 86400000, confianca: c ? 'seguro' : 'duvida', historico: [{ em, correta: c, confianca: c ? 'seguro' : 'duvida' }] }
  }
}
const ESCONDER = '.aviso-termos, .aviso-cookies, [class*="AvisoTermos"], [class*="aviso-termos"], vite-error-overlay { display: none !important; }'
for (const [nome, vp, esc] of [['cel', { width: 390, height: 844 }, 2], ['pc', { width: 1440, height: 900 }, 1]]) {
  const contexto = await navegador.newContext({ viewport: vp, deviceScaleFactor: esc, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', hasTouch: vp.width < 600 })
  await contexto.route(`${SUPABASE}/**`, atender)
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: { ...usuarioFalso(CONTA), user_metadata: { nome: 'Tales', termos_versao: 999 } } }
  await contexto.addInitScript(([s, t, sem, r, c]) => {
    if (!sem) localStorage.setItem('sb-ortoquestoes-auth', s)
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
    localStorage.setItem('ortoquestoes:tema', JSON.stringify(t))
    localStorage.setItem('oq-termos-adiado', String(Date.now()))
    if (r && !sem) localStorage.setItem(`ortoquestoes:conta:${c}:respondidas`, r)
  }, [JSON.stringify(sessaoAuth), TEMA, SEM_CONTA, respondidasExemplo ? JSON.stringify(respondidasExemplo) : null, CONTA])
  const p = await contexto.newPage()
  p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
  await p.goto(`${BASE}#${ROTA}`); await p.waitForTimeout(4000); await p.addStyleTag({ content: ESCONDER }); await p.waitForTimeout(400)
  await p.screenshot({ path: TELAS + `${PREF}-${nome}.png`, fullPage: true })
  await p.screenshot({ path: TELAS + `${PREF}-${nome}-dobra.png` })
  await contexto.close()
}
console.log(erros.length ? erros : 'sem erros', '→', TELAS + PREF + '-{cel,pc}[-dobra].png')
await navegador.close(); await site.close()

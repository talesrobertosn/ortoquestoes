// Prints reais do site para os stories da semana de 24 a 30/11/2026 (story 3 de cada dia: trecho do resumo,
// comentário de outra questão TEOT da mesma área e a página do dia). Supabase falso e conta de exemplo assinante,
// copiados de posts/2026-11-13-errata-metastases/capturar.mjs; respostas de exemplo como em marketing/instagram/telas.mjs.
// Uso (na raiz): node marketing/instagram/posts/2026-11-24-semana/capturar.mjs [resumos|comentarios|paginas]
import { mkdirSync, readFileSync } from 'node:fs'
const SUPABASE = 'https://falso.supabase.co'
process.env.VITE_SUPABASE_URL = SUPABASE
const { createServer } = await import('vite')
const { chromium } = await import('playwright')
const CONTA = '11111111-2222-4333-8444-555555555555'
const rpcs = {
  sincronizar_progresso: () => [200, []],
  ler_progresso_desde: () => [200, []],
  obter_acesso_premium: () => [200, [{ premium: true, motivo: 'assinatura', recursos_exclusivos: true, pagamentos_ativos: true }]],
  obter_estado_conta: () => [200, [{ status_assinatura: 'ativa', cancelar_ao_fim: false, fim_periodo: null, respostas_total: 1200, sequencia: 23, plano: 'anual' }]],
  sinal_aparelho: () => [200, [{ ativo: true, outro_aparelho: null }]],
  autorizar_resposta: () => [200, [{ permitido: true, restantes: 999, limite: null, premium: true }]],
  obter_plano_estudo: () => [200, [{ data_prova: '2027-01-10', intensidade: 'firme', folgas: [0], prova: 'TEOT', base_respondidas: 1200, criado_em: new Date().toISOString() }]],
  meus_feitos: () => [200, { conquistas: [], dias: {}, indicados_assinantes: 0, indicados_30_dias: 0, simulado_edicoes: [], simulado_participacoes: [], ranking_semana: [], relatos_resolvidos: 0, comentarios_avaliados: 0, contra_corrente: 0, plano: null }],
  obter_aviso_site: () => [200, []],
}
const usuarioFalso = (id) => ({ id, aud: 'authenticated', role: 'authenticated', email: 'residente@exemplo.com', app_metadata: { provider: 'email' }, user_metadata: { nome: 'Marina', termos_versao: 999 }, created_at: '2026-03-01T00:00:00Z' })
async function atender(rota) {
  const pedido = rota.request(); const url = new URL(pedido.url())
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
  if (pedido.method() === 'OPTIONS') return rota.fulfill({ status: 204, headers: cors })
  const responder = (s, c) => rota.fulfill({ status: s, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(c) })
  if (url.pathname.startsWith('/auth/v1/user')) return responder(200, usuarioFalso(CONTA))
  if (url.pathname.startsWith('/auth/v1/')) return responder(200, {})
  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1]
  if (rpc && rpcs[rpc]) { const [s, c] = rpcs[rpc](); return responder(s, c) }
  return responder(200, rpc ? null : [])
}
const site = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 500), strictPort: false }, logLevel: 'error' })
await site.listen()
const BASE = site.resolvedUrls.local[0]
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch())
const ESCONDER = '.aviso-termos, .aviso-cookies, [class*="AvisoTermos"], [class*="aviso-termos"], [class*="cookie"], [class*="Cookie"], [class*="indique"], .navegacao-mobile, .lr-aviso, .lr-restante, vite-error-overlay { display: none !important; }'
const sessao = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 864e2, user: usuarioFalso(CONTA) }
// Respostas de exemplo (para Caderno de erros, Desempenho, Simulados)
const indice = JSON.parse(readFileSync('public/acervo/indice.json', 'utf8'))
const respondidas = {}; const hoje = Date.now(); const DIA = 864e5; let n = 0
for (const q of indice.questoes.slice(0, 1400)) {
  const certa = ((n * 37) % 100) < 72; const dia = hoje - (((n++ * 13) % 28) + 1) * DIA
  respondidas[q.id] = { c: certa, q: dia, tentativas: 1, acertos: certa ? 1 : 0, erros: certa ? 0 : 1, sequencia: 1, proximaRevisao: certa ? hoje + 3 * DIA : hoje - DIA, m: 'A', confianca: 'seguro', historico: [{ em: dia, correta: certa, confianca: 'seguro' }] }
}
async function contexto(cel) {
  const ctx = await navegador.newContext(cel
    ? { viewport: { width: 390, height: 763 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
  await ctx.route(`${SUPABASE}/**`, atender)
  await ctx.addInitScript(([s, id, r]) => {
    localStorage.setItem('sb-ortoquestoes-auth', s)
    localStorage.setItem('oq-aparelho-conta', id)
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
    localStorage.setItem('ortoquestoes:tema', JSON.stringify('claro'))
    localStorage.setItem('oq-termos-adiado', String(Date.now()))
    const k = 'ortoquestoes:conta:' + id + ':'
    if (!localStorage.getItem(k + 'respondidas')) localStorage.setItem(k + 'respondidas', JSON.stringify(r))
  }, [JSON.stringify(sessao), CONTA, respondidas])
  return ctx
}
const P = 'marketing/instagram/posts/'
const dias = [
  ['2026-11-24-ficha-vancouver', 'callaghan-fraturas-periproteticas-quadril', 'quadril-0135'],
  ['2026-11-25-bercario-nf1', 'campbell15-pseudartrose-congenita-tibia', 'pediatria-0248'],
  ['2026-11-26-marionete-volkmann', 'green-sindrome-compartimental-mao', 'mao-0415'],
  ['2026-11-27-propaganda-preco', 'rockwood10-40-cotovelo-cabeca-radio', 'ombro-cotovelo-0255'],
  ['2026-11-28-trilha-tibial-posterior', 'campbell15-pe-plano-adulto', 'pe-tornozelo-0185'],
  ['2026-11-29-blocos-hemivertebra', 'campbell15-escoliose-congenita-neuromuscular', 'coluna-0489'],
  ['2026-11-30-calendario-biceps', 'campbell14-biceps-distal', 'ombro-cotovelo-0122'],
  // domingo 29/11: o feed passou a ser 2026-11-29-relogio-biofilme (sem capturas)
]
const passo = process.argv[2] ?? 'tudo'
if (passo === 'tudo' || passo === 'resumos') {
  const ctx = await contexto(false); const p = await ctx.newPage()
  for (const [pasta, cap] of dias) {
    mkdirSync(P + pasta + '/img', { recursive: true })
    await p.goto(`${BASE}#/resumos/${cap}`); await p.waitForTimeout(5000); await p.addStyleTag({ content: ESCONDER }); await p.waitForTimeout(600)
    await p.screenshot({ path: `${P}${pasta}/img/bruto-resumo.png` })
    await p.evaluate(() => scrollTo(0, 700)); await p.waitForTimeout(700)
    await p.screenshot({ path: `${P}${pasta}/img/bruto-resumo2.png` })
    console.log('resumo', pasta)
  }
}
if (passo === 'tudo' || passo === 'comentarios') {
  const ctx = await contexto(true)
  for (const [pasta, , q] of dias) {
    if (!q) continue
    const c = await ctx.newPage()
    await c.goto(`${BASE}#/questao/${q}`); await c.waitForTimeout(5000); await c.addStyleTag({ content: ESCONDER })
    await c.keyboard.press('1'); await c.keyboard.press('s'); await c.keyboard.press('Enter'); await c.waitForTimeout(3500)
    await c.addStyleTag({ content: ESCONDER })
    const ok = await c.evaluate(() => {
      const el = [...document.querySelectorAll('body *')].filter((e) => /^Por que a [A-E] está certa/.test(e.textContent.trim())).pop()
      if (!el) return false
      window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 80); return true
    })
    await c.waitForTimeout(900)
    await c.screenshot({ path: `${P}${pasta}/img/cel-comentario.png` })
    console.log('comentario', pasta, q, ok)
    await c.close()
  }
}
if (passo === 'tudo' || passo === 'paginas') {
  const ctx = await contexto(false); const p = await ctx.newPage()
  const paginas = [['2026-11-25-bercario-nf1', 'erros'], ['2026-11-26-marionete-volkmann', 'cronograma-mao'], ['2026-11-26-marionete-volkmann', 'flashcards'],
    ['2026-11-27-propaganda-preco', 'assinatura'], ['2026-11-28-trilha-tibial-posterior', 'simulado-nacional'], ['2026-11-28-trilha-tibial-posterior', 'progresso'], ['2026-11-24-ficha-vancouver', 'resumos']]
  for (const [pasta, rota] of paginas) {
    await p.goto(`${BASE}#/${rota}`); await p.waitForTimeout(4500); await p.addStyleTag({ content: ESCONDER })
    await p.keyboard.press('Escape'); await p.waitForTimeout(600)
    await p.screenshot({ path: `${P}${pasta}/img/bruto-${rota}.png` })
    console.log('pagina', pasta, rota)
  }
}
if (passo === 'trechos') {
  // Trecho do resumo ligado à questão: a seção (h2/h3) que contém o termo, no alto da tela, coluna de leitura larga.
  const termos = { 'callaghan-fraturas-periproteticas-quadril': '^Os tipos pós-operatórios', 'campbell15-pseudartrose-congenita-tibia': '^Os três arqueamentos', 'green-sindrome-compartimental-mao': '^Classificação de TSUGE$',
    'rockwood10-40-cotovelo-cabeca-radio': '^Fraturas do coronoide', 'campbell15-pe-plano-adulto': '^Imagem: os ângulos', 'campbell15-escoliose-congenita-neuromuscular': '^A classificação que a prova usa',
    'campbell14-biceps-distal': '^O nervo musculocutâneo', 'campbell14-metastases-osseas': '^O aspecto na imagem' }
  const ctx = await navegador.newContext({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 2, locale: 'pt-BR' })
  await ctx.route(`${SUPABASE}/**`, atender)
  await ctx.addInitScript(([s]) => { localStorage.setItem('sb-ortoquestoes-auth', s); localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 })); localStorage.setItem('ortoquestoes:tema', JSON.stringify('claro')); localStorage.setItem('oq-termos-adiado', String(Date.now())) }, [JSON.stringify(sessao)])
  const p = await ctx.newPage()
  for (const [pasta, cap] of dias) {
    await p.goto(`${BASE}#/resumos/${cap}`); await p.waitForTimeout(5000); await p.addStyleTag({ content: ESCONDER + ' header, [class*="lr-barra"], [class*="lr-topo"] { visibility: hidden !important; }' })
    const r = await p.evaluate((t) => {
      const re = new RegExp(t)
      const h = [...document.querySelectorAll('h2, h3')].find((e) => re.test(e.textContent.trim()))
      if (!h) return null
      h.scrollIntoView({ block: 'start' })
      for (let n = h.parentElement; n; n = n.parentElement) if (n.scrollHeight > n.clientHeight + 10) n.scrollTop -= 40
      window.scrollBy(0, -40)
      return h.textContent.trim().slice(0, 80)
    }, termos[cap])
    await p.waitForTimeout(900)
    await p.screenshot({ path: `${P}${pasta}/img/trecho-resumo.png` })
    console.log('trecho', pasta, r)
  }
}
await navegador.close(); await site.close()

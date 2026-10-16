// Ponta a ponta no BUILD DE PRODUÇÃO (16/10/2026): fogueira da sequência por estágios, ícones dos
// dias e artes dos atalhos de flashcards na página inicial.
//
// Gera um build com o Supabase apontando para um endereço falso (atendido aqui por context.route),
// sobe `vite preview` e abre a página inicial com uma sessão simulada e um histórico de respostas
// montado para N dias seguidos. Confere que cada imagem da sequência e dos atalhos carrega (status
// 200, image/png) e que o estágio mostrado é o certo; tira capturas em computador e celular.
//
// Uso: node fixtures/e2e_fogueira_inicio.mjs   (CAPTURAS=/pasta, CHROMIUM=/caminho, SEM_BUILD=1)
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const raiz = process.cwd()
const SUPABASE = 'https://falso.supabase.co'
const CONTA = '11111111-2222-4333-8444-555555555555'
const DIA = 86_400_000
const capturas = process.env.CAPTURAS ?? '/tmp/claude-0/capturas-fogueira'
await mkdir(capturas, { recursive: true })
const { chromium } = await import('playwright')

const env = { ...process.env, VITE_SUPABASE_URL: SUPABASE, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_simulado', VITE_FLASHCARDS: '1', VITE_FLASHCARDS_CAPA: '1', VITE_FLASHCARDS_RANKING: '1', VITE_FLASHCARDS_VENDA: '1' }
if (!process.env.SEM_BUILD) execFileSync('npx', ['vite', 'build', '--logLevel', 'error'], { cwd: raiz, env, stdio: 'inherit' })
const porta = 4300 + Math.floor(Math.random() * 500)
const preview = spawn('npx', ['vite', 'preview', '--port', String(porta), '--strictPort'], { cwd: raiz, env, stdio: ['ignore', 'pipe', 'inherit'] })
preview.stdout.resume()
const BASE = `http://localhost:${porta}/`
for (let i = 0; ; i++) {
  if (await fetch(BASE).then((r) => r.ok, () => false)) break
  if (i > 120) throw new Error('vite preview não subiu')
  await new Promise((ok) => setTimeout(ok, 250))
}

function usuarioFalso() {
  return { id: CONTA, aud: 'authenticated', role: 'authenticated', email: 'tales@exemplo.com', app_metadata: { provider: 'email' }, user_metadata: { nome: 'Tales' }, created_at: '2026-09-01T00:00:00Z' }
}
async function atender(rota) {
  const pedido = rota.request()
  const url = new URL(pedido.url())
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
  if (pedido.method() === 'OPTIONS') return rota.fulfill({ status: 204, headers: cors })
  const responder = (corpo) => rota.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
  if (url.pathname.startsWith('/auth/v1/user')) return responder(usuarioFalso())
  if (url.pathname.startsWith('/auth/v1/')) return responder({})
  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1]
  if (rpc === 'obter_acesso_premium') return responder([{ premium: true, motivo: 'assinatura', recursos_exclusivos: true, pagamentos_ativos: true }])
  if (rpc === 'obter_estado_conta') return responder([{ status_assinatura: 'ativa', cancelar_ao_fim: false, fim_periodo: null }])
  if (rpc === 'sinal_aparelho') return responder([{ ativo: true, outro_aparelho: null }])
  if (rpc === 'sincronizar_progresso' || rpc === 'ler_progresso_desde') return responder([])
  return responder(rpc ? null : [])
}

/** Histórico com `dias` dias seguidos até ontem (5 questões cada), hoje com `hoje` questões e alguns dias soltos antes. */
function historico(dias, hoje) {
  const agora = Date.now()
  const reg = {}
  let n = 0
  const marcar = (diasAtras, quantas) => {
    for (let i = 0; i < quantas; i++) {
      const em = agora - diasAtras * DIA - i * 60_000
      reg[`q-${n++}`] = { c: true, q: em, historico: [{ em, correta: true, confianca: 'seguro' }] }
    }
  }
  for (let d = 1; d <= dias; d++) marcar(d, 5)
  marcar(0, hoje)
  if (dias < 6) marcar(dias + 2, 2)   // um dia parcial (brasa) antes da sequência
  return reg
}

const CENARIOS = [
  { dias: 0, hoje: 2, estagio: 'cinzas' },
  { dias: 2, hoje: 1, estagio: 'faisca' },
  { dias: 5, hoje: 0, estagio: 'fogueira' },
  { dias: 8, hoje: 5, estagio: 'labareda' },   // 8 até ontem + hoje feito = 9
  { dias: 19, hoje: 3, estagio: 'fogareu' },
  { dias: 34, hoje: 6, estagio: 'azul' },      // 35
  { dias: 70, hoje: 2, estagio: 'arcana' },
  { dias: 119, hoje: 5, estagio: 'lendaria' }, // 120
]
const TELAS = [{ nome: 'computador', viewport: { width: 1400, height: 860 } }, { nome: 'celular', viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 }]

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const erros = []
const imagens = new Map()
try {
  for (const tela of TELAS) {
    for (const [k, c] of CENARIOS.entries()) {
      const temaEscuro = k % 2 === 1
      const contexto = await navegador.newContext({ viewport: tela.viewport, isMobile: tela.isMobile, deviceScaleFactor: tela.deviceScaleFactor ?? 1, colorScheme: temaEscuro ? 'dark' : 'light' })
      await contexto.route(`${SUPABASE}/**`, atender)
      const sessao = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: usuarioFalso() }
      await contexto.addInitScript(([s, conta, resp, tema]) => {
        if (sessionStorage.getItem('oq-teste-semeado')) return
        sessionStorage.setItem('oq-teste-semeado', '1')
        localStorage.setItem('sb-ortoquestoes-auth', s)
        localStorage.setItem(`ortoquestoes:conta:${conta}:respondidas`, resp)
        localStorage.setItem('ortoquestoes:tema', JSON.stringify(tema))
      }, [JSON.stringify(sessao), CONTA, JSON.stringify(historico(c.dias, c.hoje)), temaEscuro ? 'escuro' : 'claro'])
      const p = await contexto.newPage()
      p.on('pageerror', (e) => erros.push(`${tela.nome} ${c.dias}: ${e.message}`))
      p.on('response', (r) => { if (/pixel\/inicio\//.test(r.url())) imagens.set(r.url().replace(/^.*pixel\//, 'pixel/'), { status: r.status(), tipo: r.headers()['content-type'] }) })
      await p.goto(BASE + '#/')
      await p.waitForSelector('.ip-fogueira', { timeout: 30_000 })
      const total = c.dias + (c.hoje >= 5 ? 1 : 0)
      await p.waitForFunction((n) => document.querySelector('.ip-seq__numero strong')?.textContent === String(n), total, { timeout: 15_000 })
      const estagio = await p.getAttribute('.ip-fogueira', 'data-estagio')
      assert.equal(estagio, c.estagio, `${total} dias: esperava ${c.estagio}, veio ${estagio}`)
      // As imagens das variáveis CSS precisam carregar de verdade (o bug era url() relativo).
      const carregadas = await p.evaluate(async () => {
        const urls = new Set()
        for (const el of document.querySelectorAll('.ip-fogueira, .ip-dia__icone, .ip-atalho--arte')) {
          for (const pseudo of [null, '::before']) {
            const bg = getComputedStyle(el, pseudo).backgroundImage
            const m = bg.match(/url\("?([^")]+)"?\)/)
            if (m) urls.add(m[1])
          }
        }
        const r = []
        for (const u of urls) {
          const ok = await new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth > 0); i.onerror = () => res(false); i.src = u })
          r.push([u, ok])
        }
        return r
      })
      for (const [u, ok] of carregadas) assert.ok(ok, `Imagem não carregou: ${u}`)
      const nomes = carregadas.map(([u]) => u.replace(/^.*\//, '')).sort()
      for (const n of ['fogueira-estagios.png', 'atalho-biblioteca.png', 'atalho-cripta.png']) assert.ok(nomes.includes(n), `${n} não está em uso (${nomes})`)
      if (c.dias > 0) assert.ok(nomes.includes('dias-estagios.png'), 'ícones dos dias sem imagem')
      const estagioTexto = await p.locator('.ip-seq__estagio').innerText()
      await p.waitForTimeout(700)
      const nome = `${tela.nome}-${String(total).padStart(3, '0')}-dias-${c.estagio}`
      await p.locator('.ip-seq').screenshot({ path: join(capturas, `${nome}-sequencia.png`), animations: 'disabled' })
      if (k === 0 || k === 7 || tela.nome === 'celular' && k === 3) {
        await p.locator('.ip-atalhos').scrollIntoViewIfNeeded()
        await p.locator('.ip-atalhos').screenshot({ path: join(capturas, `${nome}-atalhos.png`), animations: 'disabled' })
        await p.screenshot({ path: join(capturas, `${nome}-pagina.png`), fullPage: false })
      }
      console.log(`${tela.nome} ${total} dias (${temaEscuro ? 'escuro' : 'claro'}): ${estagio} — "${estagioTexto}"`)
      await contexto.close()
    }
  }
  // Movimento reduzido: sem animação na fogueira.
  const ctx = await navegador.newContext({ viewport: { width: 1400, height: 860 }, reducedMotion: 'reduce' })
  await ctx.route(`${SUPABASE}/**`, atender)
  await ctx.addInitScript(([s, conta, resp]) => { localStorage.setItem('sb-ortoquestoes-auth', s); localStorage.setItem(`ortoquestoes:conta:${conta}:respondidas`, resp) },
    [JSON.stringify({ access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: usuarioFalso() }), CONTA, JSON.stringify(historico(9, 2))])
  const p = await ctx.newPage()
  await p.goto(BASE + '#/')
  await p.waitForSelector('.ip-fogueira')
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.ip-fogueira')).animationName), 'none', 'prefers-reduced-motion deveria parar a fogueira')
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.ip-dia--hoje .ip-dia__ficha')).animationName), 'none', 'prefers-reduced-motion deveria parar o pulso de hoje')
  await ctx.close()
} finally {
  await navegador.close()
  preview.kill()
}
for (const [u, r] of imagens) {
  assert.equal(r.status, 200, `${u}: status ${r.status}`)
  assert.match(r.tipo ?? '', /^image\/png/, `${u}: content-type ${r.tipo}`)
}
console.log('imagens servidas:', [...imagens].map(([u, r]) => `${u} ${r.status} ${r.tipo}`).join(' | '))
assert.deepEqual(erros, [], `Erros na página: ${erros.join('; ')}`)
console.log('ok — capturas em', capturas)

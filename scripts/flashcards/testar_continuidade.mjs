/**
 * Continuidade da Cripta entre aparelhos (15/10/2026), com dois navegadores e um Supabase simulado.
 *
 * Servidor local (o Supabase é interceptado pelo Playwright; nada sai da máquina):
 *   VITE_SUPABASE_URL=https://simulado.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_simulado \
 *   VITE_FLASHCARDS_LIMITE=true npx vite --port 5198
 *   node scripts/flashcards/testar_continuidade.mjs
 *
 * Roteiro (o bug do Tales: "no notebook eu estava no Golem; no computador, no Senhor do Anel Pélvico"):
 *  1. notebook e computador começam com Altar e Bestiário diferentes (só no aparelho, como antes);
 *  2. o notebook joga até o andar 3: a partida vai para a conta;
 *  3. o computador abre e continua do andar 3, com o aviso "Continuando a partida do seu outro aparelho";
 *     Altar e Bestiário viram a união dos dois;
 *  4. o computador avança até o andar 7; o notebook, com a aba velha aberta, volta à aba e adota o andar 7;
 *  5. o notebook encerra a partida; o computador reabre e NÃO ressuscita a partida (lápide);
 *  6. sem a parte 28 do SQL (funções 404), o jogo abre e segue só no aparelho, sem erro.
 */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const base = process.env.ORTO_URL ?? 'http://localhost:5198/'
const pasta = process.env.ORTO_CAPTURAS ?? '/tmp/ortoquestoes-continuidade'
await mkdir(pasta, { recursive: true })
const SUPABASE = 'https://simulado.supabase.co'
const USUARIO = '11111111-2222-4333-8444-555555555555'
const prefixo = `ortoquestoes:conta:${USUARIO}:`

/* ---------------- Supabase simulado: uma conta, uma linha de flashcards_progresso ---------------- */
const banco = { registros: {}, recordes: {}, jogo: null, jogo_em: null, comParte28: true, chamadas: [] }
let relogio = 0
/** timestamptz com microssegundos, como o PostgREST devolve. */
const agoraTs = () => { relogio += 1; return new Date(Date.now()).toISOString().replace('Z', String(relogio % 1000).padStart(3, '0') + '+00:00') }
function rpc(nome, corpo) {
  banco.chamadas.push(nome)
  const semParte28 = !banco.comParte28 && ['ler_jogo_flashcards', 'salvar_jogo_flashcards'].includes(nome)
  if (semParte28) return [404, { code: 'PGRST202', message: `Could not find the function public.${nome}` }]
  switch (nome) {
    case 'ler_progresso_flashcards':
      return [200, [{ registros: banco.registros, recordes: banco.recordes, atualizado_em: agoraTs(), ...(banco.comParte28 ? { jogo: banco.jogo, jogo_em: banco.jogo_em } : {}) }]]
    case 'salvar_progresso_flashcards':
      banco.registros = corpo.p_registros; banco.recordes = corpo.p_recordes
      return [200, null]
    case 'ler_jogo_flashcards':
      return [200, banco.jogo_em ? [{ jogo: banco.jogo, jogo_em: banco.jogo_em }] : []]
    case 'salvar_jogo_flashcards': {
      if (banco.jogo_em !== null && corpo.p_base !== banco.jogo_em) return [200, [{ salvo: false, jogo: banco.jogo, jogo_em: banco.jogo_em }]]
      banco.jogo = corpo.p_jogo; banco.jogo_em = agoraTs()
      return [200, [{ salvo: true, jogo: banco.jogo, jogo_em: banco.jogo_em }]]
    }
    case 'autorizar_flashcard_cripta': case 'autorizar_flashcard':
      return [200, [{ permitido: true, ilimitado: true, restantes: null, libera_em: null, motivo: null }]]
    default:
      return [200, []]
  }
}
const sessao = () => {
  const exp = Math.floor(Date.now() / 1000) + 3600
  // JWT de mentira (o servidor simulado não confere a assinatura)
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USUARIO, exp, role: 'authenticated', email: 'teste@exemplo.com' })}.assinatura`
  return { access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp,
    user: { id: USUARIO, aud: 'authenticated', role: 'authenticated', email: 'teste@exemplo.com', email_confirmed_at: '2026-10-01T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: { apelido: 'Teste' }, created_at: '2026-10-01T00:00:00Z' } }
}

async function aparelho(b, nome, local) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
  await ctx.addInitScript(([s, extra]) => {
    if (sessionStorage.getItem('__semeado')) return
    sessionStorage.setItem('__semeado', '1')
    localStorage.setItem('sb-ortoquestoes-auth', JSON.stringify(s))
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, JSON.stringify(v))
  }, [sessao(), local])
  await ctx.route(`${SUPABASE}/**`, async (r) => {
    const u = new URL(r.request().url())
    const corpo = r.request().postDataJSON?.() ?? null
    if (u.pathname.startsWith('/rest/v1/rpc/')) {
      const [status, dados] = rpc(u.pathname.slice('/rest/v1/rpc/'.length), corpo ?? {})
      return r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(dados) })
    }
    if (u.pathname === '/auth/v1/user') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessao().user) })
    if (u.pathname.startsWith('/auth/v1/token')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessao()) })
    if (u.pathname.startsWith('/rest/v1/')) return r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : 'null' })
    if (u.pathname.startsWith('/functions/v1/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  const p = await ctx.newPage()
  const erros = []
  p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
  return { ctx, p, erros, nome }
}

const abrirCripta = async ({ p }) => {
  // reabrir de verdade (a mesma URL com hash não recarrega a página)
  if (p.url().includes('#/flashcards/cripta')) await p.reload()
  else await p.goto(base + '#/flashcards/cripta')
  await p.waitForFunction(() => !!window.__torneio, null, { timeout: 30_000 })
  await p.locator('.fc-apresenta').click({ timeout: 4000 }).catch(() => {})
}
const partida = (a) => a.p.evaluate(() => window.__torneio.partida)
const irAoAndar = (a, andar) => a.p.evaluate((n) => { const t = window.__torneio; t.ir(n, t.partida.sementeBase) }, andar)
const esperarServidor = async (condicao, rotulo) => {
  for (let i = 0; i < 100; i++) { if (condicao(banco.jogo)) return; await new Promise((ok) => setTimeout(ok, 100)) }
  throw new Error(`o servidor não recebeu: ${rotulo}`)
}

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_BIN ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--no-sandbox'] })
try {
  // 1. cada aparelho com o seu Altar e o seu Bestiário (como era antes da sincronia)
  const notebook = await aparelho(b, 'notebook', {
    [prefixo + 'flashcards:altar']: { versao: 1, cristais: 80, ganhos: 100, talentos: { vida: 1 } },
    [prefixo + 'flashcards:bestiario']: { vistos: ['golem'], vencidos: ['golem'] },
  })
  const computador = await aparelho(b, 'computador', {
    [prefixo + 'flashcards:altar']: { versao: 1, cristais: 50, ganhos: 50, talentos: {} },
    [prefixo + 'flashcards:bestiario']: { vistos: ['serpente'], vencidos: [] },
  })

  // 2. notebook joga até o andar 3
  await abrirCripta(notebook)
  await irAoAndar(notebook, 3)
  await esperarServidor((j) => j?.partidas?.masmorra?.andar === 3, 'andar 3 do notebook')
  const idNotebook = (await partida(notebook)).idPartida
  assert.ok(idNotebook, 'a partida tem id')
  assert.equal(banco.jogo.partidas.masmorra.id, idNotebook)
  await notebook.p.screenshot({ path: `${pasta}/1-notebook-andar3.png` })

  // 3. computador abre e continua do andar 3, com o aviso discreto
  await abrirCripta(computador)
  const noComputador = await partida(computador)
  assert.equal(noComputador.idPartida, idNotebook, 'o computador continua a partida do notebook')
  assert.equal(noComputador.andar, 3)
  const aviso = computador.p.locator('.fc-aviso-aparelho')
  await aviso.waitFor({ timeout: 5000 })
  assert.match(await aviso.innerText(), /Continuando a partida do seu outro aparelho \(andar 3\)/)
  await computador.p.screenshot({ path: `${pasta}/2-computador-continua.png` })
  // Altar e Bestiário: união dos dois aparelhos, sem perder cristal nem descoberta
  const altarC = await computador.p.evaluate((k) => JSON.parse(localStorage.getItem(k)), prefixo + 'flashcards:altar')
  assert.equal(altarC.ganhos, 150)
  assert.equal(altarC.cristais, 130)
  assert.deepEqual(altarC.talentos, { vida: 1 })
  const bestC = await computador.p.evaluate((k) => JSON.parse(localStorage.getItem(k)), prefixo + 'flashcards:bestiario')
  assert.ok(['golem', 'serpente'].every((id) => bestC.vistos.includes(id)), 'o Bestiário junta o que cada aparelho descobriu')

  // 4. computador avança até o andar 7; o notebook (aba velha) volta à aba e adota o andar 7
  await irAoAndar(computador, 7)
  await esperarServidor((j) => j?.partidas?.masmorra?.andar === 7, 'andar 7 do computador')
  assert.equal((await partida(notebook)).andar, 3, 'enquanto a aba está escondida, nada muda por baixo')
  await notebook.p.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await notebook.p.waitForFunction(() => window.__torneio.partida.andar === 7, null, { timeout: 8000 })
  await notebook.p.locator('.fc-aviso-aparelho').waitFor({ timeout: 5000 })
  assert.match(await notebook.p.locator('.fc-aviso-aparelho').innerText(), /andar 7/)
  assert.equal(banco.jogo.partidas.masmorra.andar, 7, 'a aba velha não sobrescreveu a partida mais nova')
  await notebook.p.screenshot({ path: `${pasta}/3-notebook-adota-andar7.png` })

  // 5. o notebook encerra a partida (desistência); o computador reabre e não a ressuscita
  await notebook.p.evaluate(() => { const t = window.__torneio; t.definir({ ...t.partida, fase: 'fim' }) })
  await esperarServidor((j) => j?.partidas?.masmorra && j.partidas.masmorra.partida === null, 'lápide da partida')
  assert.ok(banco.jogo.encerradas.some((e) => e.id === idNotebook), 'a partida encerrada entra na lista de lápides')
  await abrirCripta(computador)
  const reaberta = await partida(computador)
  assert.notEqual(reaberta.idPartida, idNotebook, 'a partida encerrada não volta no outro aparelho')
  assert.equal(reaberta.andar, 1)
  await computador.p.screenshot({ path: `${pasta}/4-computador-sem-ressuscitar.png` })

  // 6. sem a parte 28 no banco: abre só com o aparelho, sem erro na tela
  banco.comParte28 = false
  const antigo = await aparelho(b, 'site-sem-sql', {})
  await abrirCripta(antigo)
  await irAoAndar(antigo, 2)
  await antigo.p.waitForTimeout(800)
  assert.equal((await partida(antigo)).andar, 2)
  assert.equal(await antigo.p.locator('.fc-aviso-aparelho').count(), 0)

  const erros = [...notebook.erros, ...computador.erros, ...antigo.erros]
  assert.deepEqual(erros, [], erros.join('\n'))
  console.log('Continuidade entre aparelhos OK: partida da conta antes de montar, aviso, adoção ao voltar à aba, lápide, união de Altar e Bestiário e degradação sem o SQL.')
  console.log('Capturas em', pasta)
} finally {
  await b.close()
}

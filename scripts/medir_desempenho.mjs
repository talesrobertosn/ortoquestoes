// Medição reprodutível de desempenho do site (build de produção).
//
// Sobe dist/ num servidor local que compacta como o GitHub Pages (gzip), abre
// cada rota num navegador limpo (sem cache, sem service worker) e mede:
//   FCP, LCP, "pronto" (a página saiu do "Carregando" e tem conteúdo), tarefas
//   longas (soma e maior), CLS, bytes baixados por tipo e número de pedidos.
// Depois mede a troca de rota (clique num link já com o site aberto) e a
// rolagem (quadros perdidos) nas páginas longas.
//
// Perfis: celular (390×844, CPU 4× mais lenta, rede "Fast 3G" do DevTools:
// 1,6 Mbps, 562 ms de latência) e computador (1400×860, sem limitação).
// O Supabase é falso (respostas fixas, como nos testes ponta a ponta), então o
// número não depende da rede de fora; "logado" injeta uma sessão simulada.
//
// Uso:
//   npm run build && node scripts/medir_desempenho.mjs [--saida arquivo.json]
//        [--perfis celular,computador] [--rotas /,/treinar] [--repeticoes 1]
//        [--sem-troca] [--sem-rolagem] [--cascata] [--http1]
// --cascata imprime a linha do tempo dos pedidos de cada rota (caminho crítico).
// CHROMIUM=/caminho muda o navegador (padrão /opt/pw-browsers/chromium).
import { createServer } from 'node:http'
import { createSecureServer } from 'node:http2'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opcao = (nome, padrao) => { const i = args.indexOf(`--${nome}`); return i >= 0 ? args[i + 1] : padrao }
const tem = (nome) => args.includes(`--${nome}`)
const DIST = resolve(opcao('dist', 'dist'))
const REPETICOES = Number(opcao('repeticoes', '1'))
if (!existsSync(join(DIST, 'index.html'))) { console.error(`Sem build em ${DIST}: rode npm run build.`); process.exit(1) }

// ---------------- Servidor estático com gzip ----------------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.txt': 'text/plain' }
const COMPACTA = new Set(['.html', '.js', '.css', '.json', '.svg', '.webmanifest', '.txt', '.ico'])
const cacheGzip = new Map()
async function atenderArquivo(req, res) {
  try {
    let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (caminho.endsWith('/')) caminho += 'index.html'
    const arquivo = normalize(join(DIST, caminho))
    if (!arquivo.startsWith(DIST)) { res.writeHead(403).end(); return }
    const info = await stat(arquivo).catch(() => null)
    if (!info?.isFile()) { res.writeHead(404).end(); return }
    const ext = extname(arquivo)
    const cabecalhos = { 'content-type': TIPOS[ext] ?? 'application/octet-stream', 'cache-control': 'max-age=600' }
    let corpo = await readFile(arquivo)
    if (COMPACTA.has(ext) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
      if (!cacheGzip.has(arquivo)) cacheGzip.set(arquivo, gzipSync(corpo, { level: 6 }))
      corpo = cacheGzip.get(arquivo)
      cabecalhos['content-encoding'] = 'gzip'
    }
    cabecalhos['content-length'] = corpo.length
    res.writeHead(200, cabecalhos).end(corpo)
  } catch { res.writeHead(500).end() }
}
// HTTP/2 com certificado próprio, como o site publicado (GitHub Pages/Fastly):
// em HTTP/1.1 o navegador abre só 6 conexões por endereço, e a fila dos
// arquivos pequenos dominaria a medida no celular. --http1 mede o pior caso.
function criarServidor() {
  if (tem('http1')) return { servidor: createServer(atenderArquivo), esquema: 'http' }
  try {
    const pasta = mkdtempSync(join(tmpdir(), 'orto-cert-'))
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=127.0.0.1', '-days', '2',
      '-keyout', join(pasta, 'chave.pem'), '-out', join(pasta, 'cert.pem')], { stdio: 'ignore' })
    const servidor = createSecureServer({ key: readFileSync(join(pasta, 'chave.pem')), cert: readFileSync(join(pasta, 'cert.pem')), allowHTTP1: true }, atenderArquivo)
    return { servidor, esquema: 'https' }
  } catch {
    console.error('Sem openssl: medindo em HTTP/1.1.')
    return { servidor: createServer(atenderArquivo), esquema: 'http' }
  }
}
const { servidor, esquema } = criarServidor()
await new Promise((r) => servidor.listen(0, '127.0.0.1', r))
const BASE = `${esquema}://127.0.0.1:${servidor.address().port}/`

// ---------------- Supabase falso ----------------
const CONTA = '11111111-2222-4333-8444-555555555555'
const usuarioFalso = { id: CONTA, aud: 'authenticated', role: 'authenticated', email: 'medicao@exemplo.com', email_confirmed_at: '2026-09-01T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: { nome: 'Medição' }, created_at: '2026-09-01T00:00:00Z' }
const RPCS = {
  obter_acesso_premium: [{ premium: true, motivo: 'assinatura', recursos_exclusivos: true, pagamentos_ativos: true }],
  obter_estado_conta: [{ status_assinatura: 'ativa', cancelar_ao_fim: false, fim_periodo: null }],
  sinal_aparelho: [{ ativo: true, outro_aparelho: null }],
  ler_progresso_desde: [],
  sincronizar_progresso: [],
  meus_feitos: { conquistas: [], dias: {}, indicados_assinantes: 0, indicados_30_dias: 0, simulado_edicoes: [], simulado_participacoes: [], ranking_semana: [], relatos_resolvidos: 0, comentarios_avaliados: 0, contra_corrente: 0, plano: null },
}
async function atenderSupabase(rota) {
  const pedido = rota.request()
  const url = new URL(pedido.url())
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
  if (pedido.method() === 'OPTIONS') return rota.fulfill({ status: 204, headers: cors })
  const json = (corpo, status = 200) => rota.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
  if (url.pathname.startsWith('/auth/v1/user')) return json(usuarioFalso)
  if (url.pathname.startsWith('/auth/v1/')) return json({})
  const rpc = url.pathname.match(/\/rpc\/([a-z_0-9]+)$/)?.[1]
  if (rpc) return json(rpc in RPCS ? RPCS[rpc] : null)
  return json([])
}

// ---------------- Perfis ----------------
const PERFIS = {
  celular: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, cpu: 4,
    rede: { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1000 * 1000 / 8) * 0.9, uploadThroughput: (750 * 1000 / 8) * 0.9 } },
  computador: { viewport: { width: 1400, height: 860 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, cpu: 1, rede: null },
}
const ROTAS = [
  { rota: '/', logado: false, nome: '#/ (visitante)' },
  { rota: '/', logado: true, nome: '#/ (logado)' },
  { rota: '/treinar', logado: true },
  { rota: '/sessao', logado: true, sessaoRapida: true, nome: '#/sessao (sessão rápida)' },
  { rota: '/revisao', logado: true },
  { rota: '/cronograma', logado: true },
  { rota: '/dados', logado: true, nome: '#/dados (desempenho)' },
  { rota: '/ranking', logado: true },
  { rota: '/assinatura', logado: false },
  { rota: '/conta', logado: true },
  { rota: '/resumao', logado: true },
  { rota: '/simulado-nacional', logado: true },
]
const TROCAS = [['/', '/treinar'], ['/treinar', '/revisao'], ['/', '/cronograma'], ['/', '/assinatura'], ['/cronograma', '/dados'], ['/', '/ranking']]
const ROLAGEM = ['/', '/assinatura', '/cronograma', '/resumao', '/ranking']

const perfisEscolhidos = opcao('perfis', 'celular,computador').split(',')
const rotasEscolhidas = opcao('rotas', null)?.split(',')

// Observadores instalados antes de qualquer script da página.
const OBSERVADORES = () => {
  const m = { fcp: null, lcp: null, cls: 0, longas: [], pronto: null, deslocamentos: [] }
  const descrever = (n) => { if (!n || !n.tagName) return '?'; const c = typeof n.className === 'string' ? n.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return n.tagName.toLowerCase() + (c ? '.' + c : '') }
  window.__medidas = m
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') m.fcp = e.startTime }).observe({ type: 'paint', buffered: true })
    new PerformanceObserver((l) => { const e = l.getEntries(); if (e.length) m.lcp = e[e.length - 1].startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { m.cls += e.value; m.deslocamentos.push({ valor: Number(e.value.toFixed(4)), em: Math.round(e.startTime), nos: (e.sources || []).map((s) => descrever(s.node)) }) } }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((l) => { for (const e of l.getEntries()) m.longas.push(e.duration) }).observe({ type: 'longtask', buffered: true })
  } catch { /* navegador sem algum tipo */ }
  // "Pronto": a área principal tem conteúdo de verdade e nenhum "Carregando".
  const conferir = () => {
    if (m.pronto !== null) return
    const principal = document.getElementById('conteudo-principal')
    if (!principal || principal.querySelector('.espera-pixel, .estado--carregando, [aria-busy="true"]')) return
    if ((principal.innerText || '').trim().length < 80) return
    m.pronto = performance.now()
  }
  new MutationObserver(conferir).observe(document, { childList: true, subtree: true, characterData: true })
}

const SESSAO_AUTH = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: usuarioFalso }

async function novoContexto(navegador, perfil, logado) {
  const p = PERFIS[perfil]
  const contexto = await navegador.newContext({ viewport: p.viewport, deviceScaleFactor: p.deviceScaleFactor, isMobile: p.isMobile, hasTouch: p.hasTouch, serviceWorkers: 'block', locale: 'pt-BR', ignoreHTTPSErrors: true })
  await contexto.route(/supabase\.co\//, atenderSupabase)
  // Terceiros (pixel do Meta, etc.) ficam de fora: só entram com consentimento.
  await contexto.route((url) => !url.href.startsWith(BASE) && !/supabase\.co\//.test(url.href) && !url.href.startsWith('data:') && !url.href.startsWith('blob:'), (r) => r.abort())
  await contexto.addInitScript(([s, logar]) => {
    try {
      if (!sessionStorage.getItem('ortoquestoes:tema-sorteado')) sessionStorage.setItem('ortoquestoes:tema-sorteado', 'claro')
      if (logar && !localStorage.getItem('sb-ortoquestoes-auth')) localStorage.setItem('sb-ortoquestoes-auth', s)
    } catch { /* sem armazenamento */ }
  }, [JSON.stringify(SESSAO_AUTH), logado])
  await contexto.addInitScript(OBSERVADORES)
  return contexto
}

async function limitar(pagina, perfil) {
  const p = PERFIS[perfil]
  const cdp = await pagina.context().newCDPSession(pagina)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false })
  if (p.rede) await cdp.send('Network.emulateNetworkConditions', p.rede)
  if (p.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu })
  const pedidos = new Map()
  cdp.on('Network.responseReceived', (e) => { const r = pedidos.get(e.requestId) ?? {}; r.tipo = e.type; r.url = e.response.url; pedidos.set(e.requestId, r) })
  cdp.on('Network.loadingFinished', (e) => { const r = pedidos.get(e.requestId) ?? {}; r.bytes = e.encodedDataLength; r.fim = e.timestamp; pedidos.set(e.requestId, r) })
  cdp.on('Network.requestWillBeSent', (e) => { if (!pedidos.has(e.requestId)) pedidos.set(e.requestId, { url: e.request.url, inicio: e.timestamp, prioridade: e.request.initialPriority }) })
  return { cdp, pedidos }
}

function resumirBytes(pedidos) {
  const soma = { js: 0, css: 0, img: 0, json: 0, fonte: 0, outros: 0, total: 0, pedidos: 0 }
  for (const r of pedidos.values()) {
    if (!r.url || !r.url.startsWith(BASE)) continue
    const b = r.bytes ?? 0
    soma.pedidos++
    soma.total += b
    const caminho = new URL(r.url).pathname
    if (/\.js$/.test(caminho)) soma.js += b
    else if (/\.css$/.test(caminho)) soma.css += b
    else if (/\.(png|jpe?g|webp|avif|svg|gif|ico)$/.test(caminho)) soma.img += b
    else if (/\.json$/.test(caminho)) soma.json += b
    else if (/\.(woff2?|ttf)$/.test(caminho)) soma.fonte += b
    else soma.outros += b
  }
  return soma
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
async function esperarCalmaria(pedidos, maximo = 60_000, calma = 1500) {
  const inicio = Date.now()
  let ultimoTotal = -1; let desde = Date.now()
  while (Date.now() - inicio < maximo) {
    const pendentes = [...pedidos.values()].filter((r) => r.bytes === undefined).length
    const total = pedidos.size
    if (total !== ultimoTotal || pendentes > 0) { ultimoTotal = total; desde = Date.now() }
    if (Date.now() - desde > calma) return
    await esperar(200)
  }
}

async function medirRota(navegador, perfil, item) {
  const contexto = await novoContexto(navegador, perfil, item.logado)
  const pagina = await contexto.newPage()
  const erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  const { pedidos } = await limitar(pagina, perfil)
  const t0 = Date.now()
  await pagina.goto(BASE + '#' + (item.sessaoRapida ? '/treinar' : item.rota), { waitUntil: 'load', timeout: 120_000 })
  let medidaSessao = null
  if (item.sessaoRapida) {
    const botao = pagina.locator('.tr-heroi__rapida')
    await botao.waitFor({ state: 'visible', timeout: 90_000 })
    await pagina.waitForFunction(() => !document.querySelector('.tr-heroi__rapida')?.disabled, null, { timeout: 90_000 })
    await esperarCalmaria(pedidos, 30_000, 800)
    const antes = await pagina.evaluate(() => performance.now())
    await botao.click()
    await pagina.waitForSelector('.questao-impressa', { timeout: 90_000 })
    medidaSessao = (await pagina.evaluate(() => performance.now())) - antes
  }
  await esperarCalmaria(pedidos)
  // Uma volta de quadros para o LCP e o CLS assentarem.
  await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  const m = await pagina.evaluate(() => window.__medidas)
  const bytes = resumirBytes(pedidos)
  if (tem('cascata')) {
    // Linha do tempo dos pedidos (ms desde o primeiro), para achar o caminho crítico.
    const lista = [...pedidos.values()].filter((r) => r.inicio)
    const zero = Math.min(...lista.map((r) => r.inicio))
    console.error(`--- cascata ${perfil} ${item.nome ?? item.rota} (pronto ${Math.round(m.pronto ?? -1)} ms desde a navegação)`)
    for (const r of lista.sort((a, b) => a.inicio - b.inicio)) {
      console.error(`${String(Math.round((r.inicio - zero) * 1000)).padStart(6)} → ${String(r.fim ? Math.round((r.fim - zero) * 1000) : '?').padStart(6)} ms ${String(Math.round((r.bytes ?? 0) / 1024)).padStart(4)} KB ${(r.prioridade ?? '').padEnd(8)} ${r.url.replace(BASE, '').slice(0, 90)}`)
    }
  }
  await contexto.close()
  return {
    perfil, rota: item.nome ?? '#' + item.rota,
    fcp: m.fcp, lcp: m.lcp, pronto: item.sessaoRapida ? medidaSessao : m.pronto, cls: Number(m.cls.toFixed(3)),
    longasTotal: Math.round(m.longas.reduce((a, b) => a + b, 0)), longaMaior: Math.round(Math.max(0, ...m.longas)), longasN: m.longas.length,
    ...bytes, erros, deslocamentos: m.deslocamentos.sort((a, b) => b.valor - a.valor).slice(0, 5), duracaoMs: Date.now() - t0,
  }
}

async function medirTroca(navegador, perfil, [de, para]) {
  const contexto = await novoContexto(navegador, perfil, true)
  const pagina = await contexto.newPage()
  const { pedidos } = await limitar(pagina, perfil)
  await pagina.goto(BASE + '#' + de, { waitUntil: 'load', timeout: 120_000 })
  await pagina.waitForFunction(() => window.__medidas?.pronto !== null, null, { timeout: 90_000 }).catch(() => null)
  // Pessoa lendo a página por alguns segundos antes de tocar no menu: é quando
  // uma pré-carga em segundo plano teria tempo de agir.
  await esperarCalmaria(pedidos, 30_000, 1500)
  await esperar(2500)
  const antesBytes = resumirBytes(pedidos).total
  // Simula o dedo: passa por cima (hover/toque) do link e clica; sem link visível, troca o endereço.
  const ms = await pagina.evaluate(async (destino) => {
    const m = window.__medidas
    const link = [...document.querySelectorAll(`a[href="#${destino}"]`)].find((a) => a.offsetParent !== null)
    const principal = () => document.getElementById('conteudo-principal')
    const textoAntes = (principal()?.innerText || '').trim()
    const t = performance.now()
    m.pronto = null
    if (link) {
      link.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }))
      link.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
      link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      link.click()
    } else location.hash = '#' + destino
    // Espera a área principal mudar para a página nova e ficar pronta.
    await new Promise((r) => {
      const conferir = () => {
        const p = document.getElementById('conteudo-principal')
        if (p && !p.querySelector('.espera-pixel, .estado--carregando, [aria-busy="true"]') && (p.innerText || '').trim().length >= 80 && (p.innerText || '').trim() !== textoAntes && location.hash.startsWith('#' + destino)) r()
        else requestAnimationFrame(conferir)
      }
      requestAnimationFrame(conferir)
    })
    return performance.now() - t
  }, para)
  await esperarCalmaria(pedidos, 30_000, 800)
  const bytesTroca = resumirBytes(pedidos).total - antesBytes
  await contexto.close()
  return { perfil, de: '#' + de, para: '#' + para, ms: Math.round(ms), bytesTroca }
}

async function medirRolagem(navegador, perfil, rota) {
  const contexto = await novoContexto(navegador, perfil, rota !== '/assinatura')
  const pagina = await contexto.newPage()
  const { pedidos, cdp } = await limitar(pagina, perfil)
  // Rede livre aqui: o que interessa é o quadro, não o download.
  if (PERFIS[perfil].rede) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await pagina.goto(BASE + '#' + rota, { waitUntil: 'load', timeout: 120_000 })
  await pagina.waitForFunction(() => window.__medidas?.pronto !== null, null, { timeout: 90_000 }).catch(() => null)
  await esperarCalmaria(pedidos, 30_000, 1000)
  const r = await pagina.evaluate(async () => {
    const altura = document.documentElement.scrollHeight - innerHeight
    const quadros = []
    let anterior = null
    const inicio = performance.now()
    const DURACAO = 4000
    await new Promise((fim) => {
      const passo = (agora) => {
        if (anterior !== null) quadros.push(agora - anterior)
        anterior = agora
        const f = Math.min(1, (agora - inicio) / DURACAO)
        // Vai até o fim e volta (ida e volta), como um polegar rolando.
        window.scrollTo(0, altura * (f < 0.5 ? f * 2 : 2 - f * 2))
        if (f < 1) requestAnimationFrame(passo); else fim()
      }
      requestAnimationFrame(passo)
    })
    const perdidos = quadros.reduce((s, d) => s + Math.max(0, Math.round(d / 16.67) - 1), 0)
    return { altura, quadros: quadros.length, perdidos, pior: Math.round(Math.max(...quadros)) }
  })
  await contexto.close()
  return { perfil, rota: '#' + rota, ...r }
}

const mediana = (xs) => { const v = xs.filter((x) => x !== null && x !== undefined).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null }

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const resultado = { em: new Date().toISOString(), rotas: [], trocas: [], rolagem: [] }
try {
  for (const perfil of perfisEscolhidos) {
    for (const item of ROTAS) {
      if (rotasEscolhidas && !rotasEscolhidas.includes(item.rota)) continue
      const voltas = []
      for (let i = 0; i < REPETICOES; i++) voltas.push(await medirRota(navegador, perfil, item))
      const r = { ...voltas[0] }
      for (const k of ['fcp', 'lcp', 'pronto', 'cls', 'longasTotal', 'longaMaior', 'total', 'js']) r[k] = mediana(voltas.map((v) => v[k]))
      resultado.rotas.push(r)
      console.error(`${perfil} ${r.rota}: pronto ${Math.round(r.pronto ?? -1)} ms, LCP ${Math.round(r.lcp ?? -1)}, longas ${r.longasTotal}/${r.longaMaior}, ${Math.round(r.total / 1024)} KB, ${r.pedidos} pedidos, CLS ${r.cls}${r.erros.length ? ' ERROS: ' + r.erros.join(' | ') : ''}`)
    }
    if (!tem('sem-troca')) for (const t of TROCAS) {
      const r = await medirTroca(navegador, perfil, t).catch((e) => ({ perfil, de: '#' + t[0], para: '#' + t[1], ms: null, bytesTroca: 0, erro: e.message.split('\n')[0] }))
      resultado.trocas.push(r)
      console.error(`${perfil} troca ${r.de} → ${r.para}: ${r.ms} ms (${Math.round(r.bytesTroca / 1024)} KB)`)
    }
    if (!tem('sem-rolagem')) for (const rota of ROLAGEM) {
      // Uma página que fecha no meio (falha do navegador) não derruba a medição inteira.
      const r = await medirRolagem(navegador, perfil, rota).catch((e) => ({ perfil, rota: '#' + rota, perdidos: null, quadros: null, pior: null, erro: e.message.split('\n')[0] }))
      resultado.rolagem.push(r)
      console.error(`${perfil} rolagem #${rota}: ${r.perdidos} quadros perdidos de ${r.quadros} (pior ${r.pior} ms)`)
    }
  }
} finally {
  await navegador.close()
  servidor.close()
}

// Tamanho dos pedaços do build (gzip), para acompanhar junto.
resultado.chunks = readdirSync(join(DIST, 'assets')).filter((f) => /\.(js|css)$/.test(f))
  .map((f) => ({ arquivo: f, gzip: gzipSync(readFileSync(join(DIST, 'assets', f)), { level: 6 }).length }))
  .sort((a, b) => b.gzip - a.gzip)

const saida = opcao('saida', null)
if (saida) await writeFile(saida, JSON.stringify(resultado, null, 2))

const kb = (b) => (b / 1024).toFixed(0)
const ms = (x) => (x === null || x === undefined ? '—' : Math.round(x))
console.log('| Perfil | Rota | FCP | LCP | Pronto | Tarefas longas (total/maior) | JS KB | CSS KB | Img KB | JSON KB | Total KB | Pedidos | CLS |')
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for (const r of resultado.rotas) console.log(`| ${r.perfil} | ${r.rota} | ${ms(r.fcp)} | ${ms(r.lcp)} | ${ms(r.pronto)} | ${r.longasTotal}/${r.longaMaior} | ${kb(r.js)} | ${kb(r.css)} | ${kb(r.img)} | ${kb(r.json)} | ${kb(r.total)} | ${r.pedidos} | ${r.cls} |`)
if (resultado.trocas.length) {
  console.log('\n| Perfil | Troca | ms | KB baixados na troca |\n|---|---|---|---|')
  for (const t of resultado.trocas) console.log(`| ${t.perfil} | ${t.de} → ${t.para} | ${t.ms} | ${kb(t.bytesTroca)} |`)
}
if (resultado.rolagem.length) {
  console.log('\n| Perfil | Rolagem | Quadros perdidos | Pior quadro (ms) |\n|---|---|---|---|')
  for (const r of resultado.rolagem) console.log(`| ${r.perfil} | ${r.rota} | ${r.perdidos}/${r.quadros} | ${r.pior} |`)
}

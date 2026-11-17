// Avisos reais, após respostas pela UI, com Supabase isolado e artes de todos os cenários.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SUPABASE = 'https://falso.supabase.co'
process.env.VITE_SUPABASE_URL = SUPABASE
process.env.VITE_FLASHCARDS_LIMITE = 'true'
process.env.VITE_FLASHCARDS_RANKING = '1'
const { createServer } = await import('vite')
const { chromium } = await import('playwright')

const CONTA = '11111111-2222-4333-8444-555555555555'
const HORA = 3_600_000
const capturas = process.env.CAPTURAS ?? await mkdtemp(join(tmpdir(), 'orto-e2e-'))

// ---------------- Supabase falso ----------------
const linhas = []
let versao = 0
const pedidos = []
const plano = {
  data_prova: new Date(Date.now() + 120 * 24 * HORA).toISOString().slice(0, 10), intensidade: 'firme', folgas: [], prova: 'TEOT',
  base_respondidas: 0, criado_em: new Date(Date.now() - 10 * 24 * HORA).toISOString(), incluir_simulados: true, opcoes: {},
}
const copia = l => ({ tipo: l.tipo, item: l.item, valor: structuredClone(l.valor), versao: l.versao, operacao: l.operacao })
function sincronizar(usuario, alteracoes) {
  if (!Array.isArray(alteracoes) || alteracoes.length > 100) return [400, { code: 'P0001', message: 'Lote inválido' }]
  const saida = []
  for (const e of alteracoes) {
    let atual = linhas.find(l => l.usuario_id === usuario && l.tipo === e.tipo && l.item === e.item)
    if (!atual) {
      if (e.base !== 0) return [400, { code: 'P0001', message: 'Versão inicial inválida' }]
      atual = { usuario_id: usuario, tipo: e.tipo, item: e.item, valor: e.valor, operacao: e.operacao, versao: ++versao }
      linhas.push(atual)
    } else if (atual.operacao !== e.operacao && atual.versao === e.base) Object.assign(atual, { valor: e.valor, operacao: e.operacao, versao: ++versao })
    saida.push(copia(atual))
  }
  return [200, saida]
}
let andarVerificado = 0, comentariosVerificados = 0
const rpcs = {
  meus_recordes_flashcards: u => [200, { andar_masmorra: u === CONTA ? andarVerificado : 0, unicos: 0 }],
  registrar_andar_flashcards: (_u,a) => { andarVerificado = a.p_andar; return [200, null] },
  sincronizar_progresso: (u, a) => sincronizar(u, a.alteracoes),
  ler_progresso_desde: (u, a) => [200, linhas.filter(l => l.usuario_id === u && l.versao > a.p_cursor).sort((x, y) => x.versao - y.versao).slice(0, Math.min(a.p_limite ?? 500, 1000)).map(copia)],
  obter_acesso_premium: () => [200, [{ premium: true, motivo: 'assinatura', recursos_exclusivos: true, pagamentos_ativos: true }]],
  obter_estado_conta: () => [200, [{ status_assinatura: 'ativa', cancelar_ao_fim: false, fim_periodo: null }]],
  obter_plano_estudo: () => [200, [structuredClone(plano)]],
  ajustar_opcoes_plano: (_u, a) => { plano.opcoes = { ...plano.opcoes, ...a.p_patch }; return [200, true] },
  salvar_plano_estudo: (_u, a) => { if (a.p_opcoes) plano.opcoes = a.p_opcoes; return [200, null] },
  sinal_aparelho: () => [200, [{ ativo: true, outro_aparelho: null }]],
  meus_feitos: u => [200, { conquistas: [], dias: {}, indicados_assinantes: 0, indicados_30_dias: 0, simulado_edicoes: [], simulado_participacoes: [], ranking_semana: [], relatos_resolvidos: 0, comentarios_avaliados: u === CONTA ? comentariosVerificados : 0, contra_corrente: 0, plano: null }],
}
async function atender(rota) {
  const pedido = rota.request()
  const url = new URL(pedido.url())
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
  if (pedido.method() === 'OPTIONS') return rota.fulfill({ status: 204, headers: cors })
  const token = (pedido.headers().authorization ?? '').replace(/^Bearer /, '')
  let usuario = token.startsWith('tok-') ? token.slice(4) : null
  if (!usuario) { try { usuario = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).sub ?? null } catch {} }
  const responder = (status, corpo) => rota.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
  if (url.pathname.startsWith('/auth/v1/user')) return responder(200, usuarioFalso(usuario ?? CONTA))
  if (url.pathname.startsWith('/auth/v1/')) return responder(200, {})
  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1]
  pedidos.push({ rpc, usuario, em: Date.now() })
  if (!usuario) return responder(401, { code: '42501', message: 'permission denied' })
  if (rpc && rpcs[rpc]) { const [s, c] = rpcs[rpc](usuario, JSON.parse(pedido.postData() || '{}')); return responder(s, c) }
  if (rpc) return responder(200, null)
  return responder(200, [])
}
function usuarioFalso(id) {
  return { id, aud: 'authenticated', role: 'authenticated', email: 'tales@exemplo.com', app_metadata: { provider: 'email' }, user_metadata: { nome: 'Tales' }, created_at: '2026-09-01T00:00:00Z' }
}

// ---------------- Site e navegador ----------------
const site = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 500), strictPort: false }, logLevel: 'error' })
await site.listen()
const BASE = site.resolvedUrls.local[0]
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const erros = []

async function aparelho(nome, desvio) {
  const contexto = await navegador.newContext({ viewport: nome === 'celular' ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await contexto.route(`${SUPABASE}/**`, atender)
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: usuarioFalso(CONTA) }
  await contexto.addInitScript(([s, d]) => {
    // Relógio do aparelho deslocado: o servidor não depende dele.
    const real = Date.now.bind(Date)
    Date.now = () => real() + d
    localStorage.setItem('ortoquestoes:dica:deslizar', 'true');
    if (!localStorage.getItem('sb-ortoquestoes-auth')) localStorage.setItem('sb-ortoquestoes-auth', s)
  }, [JSON.stringify(sessaoAuth), desvio])
  const abrir = async () => {
    const p = await contexto.newPage()
    p.on('pageerror', e => erros.push(`${nome}: ${e.message}`))
    return p
  }
  return { nome, contexto, abrir }
}


const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
const validas = indice.questoes.filter(q => !q.an && !q.dup)
await mkdir(capturas, { recursive: true })
function semear(n) {
  linhas.length = 0; versao = 0
  for (let i = 0; i < n; i++) linhas.push({ usuario_id: CONTA, tipo: 'respondidas', item: validas[i].id, valor: { c: false, q: Date.now() - 86400000 - i * 1000, confianca: 'duvida' }, versao: ++versao, operacao: crypto.randomUUID() })
}
const memoriaDe = p => p.evaluate(() => JSON.parse(localStorage.getItem('ortoquestoes:conta:11111111-2222-4333-8444-555555555555:conquistas:avisos:v1') ?? 'null'))
async function preparar(nome, n) {
  semear(n)
  const ap = await aparelho(nome, 0), p = await ap.abrir()
  await p.goto(BASE + '#/sessao')
  const cookies = p.getByRole('button', { name: 'Agora não', exact: true })
  if (await cookies.isVisible({timeout:1000}).catch(()=>false)) await cookies.click()
  await p.waitForFunction(() => !!localStorage.getItem('ortoquestoes:conta:11111111-2222-4333-8444-555555555555:conquistas:avisos:v1'), null, { timeout: 30000 })
  const ids = validas.slice(n, n + 100).map(q => q.id)
  await p.evaluate(async ids => {
    const { novaSessao } = await import('/src/estado/sessao.ts')
    const { gravar } = await import('/src/estado/armazenamento.ts')
    const { FILTROS_VAZIOS } = await import('/src/dados/tipos.ts')
    const s = novaSessao(FILTROS_VAZIOS, ids)
    gravar('dica:sessao',String(s.criadaEm))
    gravar('sessao:atual',s)
  }, ids)
  await p.waitForSelector('.alternativa-envelope')
  return { ...ap, p }
}
async function responder(p, avancar = false) {
  if (avancar) await p.getByRole('button', { name: 'Próxima', exact: true }).first().click()
  await p.locator('.alternativa-envelope').first().locator('button, label, [role="radio"]').first().click()
  await p.getByRole('button', { name: /^Responder / }).first().click()
}
async function fechar(p) {
  const b = p.getByRole('button', {name:'Dispensar aviso de conquista'})
  if (await b.isVisible()) await b.click()
  await p.locator('.nc').waitFor({ state:'hidden' })
}
try {
  const ap = await preparar('celular',46), p = ap.p
  assert.deepEqual((await memoriaDe(p)).pendentes, [], 'passado importado em silêncio')
  await responder(p)
  await p.waitForSelector('.nc--perto', {timeout:20000})
  await p.waitForTimeout(2500)
  assert.match(await p.locator('.nc').innerText(),/3 questões diferentes/)
  assert.match(await p.locator('.nc__arte img').getAttribute('src'),/expectativa\/bau.png/)
  assert.ok((await p.locator('.nc').boundingBox()).height < 170)
  await p.screenshot({path:join(capturas,'meta-celular.png')})
  await fechar(p)
  for (let i=0;i<3;i++) { await responder(p,true); await p.waitForTimeout(200) }
  await p.waitForSelector('.nc--ganha',{timeout:20000})
  await p.waitForTimeout(2200)
  assert.match(await p.locator('.nc').innerText(),/Primeiros passos/)
  assert.match(await p.locator('.nc__arte img').getAttribute('src'),/emblemas\/questoes-50.png/)
  await p.screenshot({path:join(capturas,'ganha-celular.png')})
  // Link da versão compacta abre o emblema exato, mesmo com o filtro padrão Próximas.
  await p.locator('.nc__toque').click()
  await p.waitForURL(/conquista=questoes-50/)
  await p.waitForSelector('#conquista-selecionada')
  assert.match(await p.locator('#conquista-selecionada').innerText(),/Primeiros passos/)
  await p.reload()
  await p.waitForSelector('#conquista-selecionada')
  await p.waitForTimeout(5000)
  assert.equal(await p.locator('.nc').count(),0,'recarregar não comemora de novo')
  await ap.contexto.close()

  // Mesmo motor, meta distante, com dados reais de 899 -> 900 questões diferentes.
  const distante = await preparar('pc',899), d = distante.p
  await responder(d)
  await d.waitForSelector('.nc--perto',{timeout:20000})
  assert.match(await d.locator('.nc').innerText(),/100 questões diferentes/)
  assert.match(await d.locator('.nc').getAttribute('aria-label'),/R3/)
  await d.waitForTimeout(2200)
  await d.screenshot({path:join(capturas,'meta-distante-pc.png')})
  await fechar(d)
  await d.evaluate(async()=>{const {definirEventos}=await import('/src/eventos/preferencias.ts'); definirEventos(false)})
  await responder(d,true)
  await d.waitForTimeout(1500)
  assert.equal(await d.locator('.nc').count(),0,'preferência desligada respeitada')

  // Recorde do aparelho não concede a medalha de andar: só a confirmação do servidor.
  await d.evaluate(async()=>{const {definirEventos}=await import('/src/eventos/preferencias.ts'); definirEventos(true)})
  await d.goto(BASE+'#/ranking')
  await d.waitForTimeout(1800)
  await d.evaluate(async()=>{const {gravar}=await import('/src/estado/armazenamento.ts'); gravar('flashcards:recordes',{andarMaximo:999})})
  await d.waitForTimeout(1500)
  assert.equal(await d.locator('.nc').count(),0,'recorde local não finge validação do andar')
  await d.evaluate(async()=>{const {registrarAndar}=await import('/src/flashcards/servidor.ts'); await registrarAndar('11111111-2222-4333-8444-555555555555',6)})
  await d.waitForSelector('.nc--ganha',{timeout:20000})
  assert.match(await d.locator('.nc__arte img').getAttribute('src'),/fc-andar-6/)
  await fechar(d)
  // Outro cenário de servidor, sem mexer nas métricas por conta própria.
  comentariosVerificados = 100
  await d.evaluate(async()=>{const {atualizarFeitos}=await import('/src/conta/feitos.ts'); await atualizarFeitos()})
  await d.waitForSelector('.nc--ganha',{timeout:20000})
  assert.match(await d.locator('.nc__arte img').getAttribute('src'),/editorial-100/)
  await fechar(d)

  // Troca real pelo AuthClient, sem recarregar: uma conta vazia não herda métricas nem fila.
  const outra = '11111111-2222-4333-8444-666666666666'
  async function trocar(id) {
    const jwt = [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+86400})).toString('base64url'),'assinatura-de-teste'].join('.')
    await d.evaluate(async token=>{const {supabase}=await import('/src/conta/supabase.ts');const r=await supabase.auth.setSession({access_token:token,refresh_token:'r'});if(r.error)throw r.error},jwt)
  }
  await trocar(outra)
  await d.waitForFunction(id=>{
    const bruto=localStorage.getItem('ortoquestoes:conta:'+id+':conquistas:avisos:v1')
    return bruto!==null
  },outra)
  const novaMemoria = await d.evaluate(id=>JSON.parse(localStorage.getItem('ortoquestoes:conta:'+id+':conquistas:avisos:v1')),outra)
  assert.deepEqual(novaMemoria.conhecidas,[],'nenhuma medalha da conta anterior')
  assert.deepEqual(novaMemoria.pendentes,[],'nenhuma fila da conta anterior')
  await d.waitForTimeout(1600)
  assert.equal(await d.locator('.nc').count(),0)
  const publicadasNaOutra = pedidos.filter(r=>r.usuario===outra&&r.rpc==='registrar_conquistas')
  assert.equal(publicadasNaOutra.length,0,'métricas antigas não registram conquistas na conta nova')
  await trocar(CONTA)
  await d.waitForTimeout(2000)
  assert.equal(await d.locator('.nc').count(),0,'voltar preserva os avisos já vistos')

  // Galeria durável, componente real; os cenários mudam a arte de expectativa.
  for (const [id, arte] of [['revisoes-1000','pergaminho'],['bib-marcas-50','livro'],['fc-especialista-25','cartas']]) {
    await d.goto(BASE+'#/dev/conquistas?emblema='+id+'&tipo=perto')
    await d.waitForSelector('.nc--perto')
    await d.waitForFunction(arte => document.querySelector('.nc__arte img')?.getAttribute('src')?.endsWith('/'+arte+'.png'),arte)
    await d.waitForTimeout(2200)
    await d.locator('.nc').screenshot({path:join(capturas,arte+'-expectativa.png')})
  }
  await d.goto(BASE+'#/dev/conquistas?emblema=dominadas-1000&tipo=ganha')
  await d.waitForSelector('.nc--ganha')
  for (const width of [320,390,768,1440,1920]) {
    await d.setViewportSize({width,height:960})
    await d.waitForTimeout(700)
    assert.ok(await d.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'rolagem em '+width)
    const r=await d.locator('.nc').boundingBox()
    assert.ok(r.x>=0 && r.x+r.width<=width,'fora da tela em '+width)
    if(width<1024) assert.ok(r.height<=180,'cartão alto em '+width+': '+r.height)
  }
  await d.setViewportSize({width:390,height:844})
  await d.evaluate(()=>{document.documentElement.dataset.tema='escuro'})
  await d.screenshot({path:join(capturas,'titulo-longo-escuro-celular.png')})
  await d.emulateMedia({reducedMotion:'reduce'})
  await d.getByRole('button',{name:'Repetir animação',exact:true}).click()
  assert.equal(await d.locator('.nc').evaluate(e=>getComputedStyle(e).animationName),'none')
  assert.deepEqual(erros,[],'sem erros de página')
  console.log('E2E conquistas: resposta -> incentivo -> medalha -> inventário exato; reload sem repetição; marco distante; preferência; artes por cenário; 320–1920px; título longo, servidor confirmado, troca de conta e movimento reduzido. Capturas: '+capturas)
} finally { await navegador.close(); await site.close() }

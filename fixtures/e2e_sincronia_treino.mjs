// Retomada do mesmo treino em PC e celular, com Supabase isolado por context.route.
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SUPABASE = 'https://falso.supabase.co'
process.env.VITE_SUPABASE_URL = SUPABASE
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
const rpcs = {
  sincronizar_progresso: (u, a) => sincronizar(u, a.alteracoes),
  ler_progresso_desde: (u, a) => [200, linhas.filter(l => l.usuario_id === u && l.versao > a.p_cursor).sort((x, y) => x.versao - y.versao).slice(0, Math.min(a.p_limite ?? 500, 1000)).map(copia)],
  obter_acesso_premium: () => [200, [{ premium: true, motivo: 'assinatura', recursos_exclusivos: true, pagamentos_ativos: true }]],
  obter_estado_conta: () => [200, [{ status_assinatura: 'ativa', cancelar_ao_fim: false, fim_periodo: null }]],
  obter_plano_estudo: () => [200, [structuredClone(plano)]],
  ajustar_opcoes_plano: (_u, a) => { plano.opcoes = { ...plano.opcoes, ...a.p_patch }; return [200, true] },
  salvar_plano_estudo: (_u, a) => { if (a.p_opcoes) plano.opcoes = a.p_opcoes; return [200, null] },
  sinal_aparelho: () => [200, [{ ativo: true, outro_aparelho: null }]],
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
    if (!localStorage.getItem('sb-ortoquestoes-auth')) localStorage.setItem('sb-ortoquestoes-auth', s)
  }, [JSON.stringify(sessaoAuth), desvio])
  const abrir = async () => {
    const p = await contexto.newPage()
    p.on('pageerror', e => erros.push(`${nome}: ${e.message}`))
    return p
  }
  return { nome, contexto, abrir }
}

const sessaoDe = p => p.evaluate(() => JSON.parse(localStorage.getItem('ortoquestoes:conta:11111111-2222-4333-8444-555555555555:sessao:atual') ?? 'null'))
async function abrirSessao(p) {
  await p.goto(BASE + '#/sessao')
  await p.waitForFunction(() => /Sincronizado/.test(document.querySelector('.indicador-sincronia')?.textContent ?? ''), null, { timeout: 30_000 })
}
try {
  const pc = await (await aparelho('pc', 5 * HORA)).abrir()
  await abrirSessao(pc)
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
  const ids = indice.questoes.filter(q => q.id.startsWith('ombro-') && !q.an && !q.dup).slice(0, 100).map(q => q.id)
  assert.equal(ids.length, 100)
  // Usa as funções reais de montagem e persistência; as respostas passam pela UI.
  await pc.evaluate(async ids => {
    const { novaSessao } = await import('/src/estado/sessao.ts')
    const { gravar } = await import('/src/estado/armazenamento.ts')
    const { FILTROS_VAZIOS } = await import('/src/dados/tipos.ts')
    const s = novaSessao({ ...FILTROS_VAZIOS, temas: ['ombro'] }, ids)
    gravar('sessao:atual', s)
  }, ids)
  await pc.waitForSelector('.alternativa-envelope')
  await pc.locator('.alternativa-envelope').first().locator('button, label, [role="radio"]').first().click()
  await pc.getByRole('button', { name: /^Responder / }).first().click()
  await pc.waitForFunction(() => /Sincronizado/.test(document.querySelector('.indicador-sincronia')?.textContent ?? ''))
  const inicial = await sessaoDe(pc)
  assert.equal(Object.keys(inicial.respostas).length, 1)
  const celular = await (await aparelho('celular', -5 * HORA)).abrir()
  await abrirSessao(celular)
  await celular.waitForSelector('.sessao-palco')
  assert.deepEqual(await sessaoDe(celular), inicial, 'mesma sessão de 100 questões, com a resposta dada no PC')
  await celular.screenshot({ path: join(capturas, 'treino-celular.png'), fullPage: false })
  // Próxima e resposta na UI do celular.
  await celular.getByRole('button', { name: 'Próxima', exact: true }).first().click()
  await celular.locator('.alternativa-envelope').first().locator('button, label, [role="radio"]').first().click()
  await celular.getByRole('button', { name: /^Responder / }).first().click()
  await celular.waitForFunction(() => /Sincronizado/.test(document.querySelector('.indicador-sincronia')?.textContent ?? ''))
  const continuada = await sessaoDe(celular)
  assert.equal(Object.keys(continuada.respostas).length, 2)
  // Retomada no PC, por foco da janela, sem recarregar.
  await pc.waitForTimeout(1600)
  await pc.evaluate(() => window.dispatchEvent(new Event('focus')))
  await pc.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem('ortoquestoes:conta:11111111-2222-4333-8444-555555555555:sessao:atual'))
    return Object.keys(s?.respostas ?? {}).length === 2
  })
  assert.deepEqual(await sessaoDe(pc), continuada)
  await pc.screenshot({ path: join(capturas, 'treino-pc.png'), fullPage: false })
  // Segunda aba do PC: edições leem o armazenamento mais recente antes de gravar.
  const pc2 = await pc.context().newPage()
  pc2.on('pageerror', e => erros.push(`segunda aba: ${e.message}`))
  await abrirSessao(pc2)
  assert.deepEqual(await sessaoDe(pc2), continuada)
  await pc2.evaluate(async () => {
    const { ler, gravar } = await import('/src/estado/armazenamento.ts')
    const s = ler('sessao:atual', null)
    gravar('sessao:atual', { ...s, revisar: [s.ids[5]] })
  })
  await pc.waitForFunction(() => document.querySelector('.indicador-sincronia')?.textContent.includes('Sincronizado'))
  await pc.getByRole('button', { name: 'Próxima', exact: true }).first().click()
  const final = await sessaoDe(pc)
  assert.deepEqual(final.revisar, [final.ids[5]], 'avançar na primeira aba preserva a marcação da segunda')
  assert.equal(Object.keys(final.respostas).length, 2)
  assert.deepEqual(erros, [], 'sem erros de página')
  console.log(`E2E treino: 100 questões de ombro, resposta no PC, retomada e resposta no celular de 390px, volta ao PC sem recarregar; relógios ±5h. Capturas: ${capturas}`)
} finally {
  await navegador.close()
  await site.close()
}

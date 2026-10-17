// Ponta a ponta no navegador (Playwright): o painel do administrador como painel de observação (17/10/2026).
//
// Sobe o site (vite) apontando para um Supabase falso que o próprio teste atende (context.route), com a
// conta marcada como administradora (eh_administrador) e dados de exemplo nas RPCs do painel. Confere:
//  1. as seis seções na navegação, com o número de online em Agora;
//  2. Agora: "Online agora" com o que cada pessoa está vendo, o dia de hoje e o que pede atenção, uma vez só;
//  3. Pessoas › Usuários sem repetir os números de hoje nem o "ao vivo";
//  4. Financeiro › Ganhos: hoje, 7 dias, mês, ano, desde o começo e a previsão de fechamento;
//  5. endereços antigos (?aba=hoje, receita, operacoes, configuracoes) abrindo no lugar novo;
//  6. capturas no computador (1366 px) e no celular (390 px), claro e escuro.
//
// Uso: node fixtures/e2e_painel_admin.mjs   (CHROMIUM=/caminho para outro navegador)
// Capturas em $CAPTURAS (padrão: pasta temporária).
import assert from 'node:assert/strict'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SUPABASE = 'https://falso.supabase.co'
process.env.VITE_SUPABASE_URL = SUPABASE
const { createServer } = await import('vite')
const { chromium } = await import('playwright')

const CONTA = '11111111-2222-4333-8444-555555555555'
const MIN = 60_000, HORA = 60 * MIN, DIA = 24 * HORA
const capturas = process.env.CAPTURAS ?? await mkdtemp(join(tmpdir(), 'orto-admin-'))
await mkdir(capturas, { recursive: true })

// ---------------- Dados de exemplo ----------------
const agora = Date.now()
const iso = (ms) => new Date(ms).toISOString()
const nomes = ['Ana Ribeiro', 'Bruno Costa', 'Carla Mendes', 'Diego Alves', 'Elisa Prado', 'Fábio Nunes', 'Gabriela Lima', 'Henrique Sá', 'Isabela Rocha', 'João Pires', 'Karina Melo', 'Lucas Teixeira', 'Marina Duarte', 'Nicolas Faria']
const paginas = [
  ['/sessao · 3 de 10', 'mao-0853'], ['/resumos/rockwood10-17-sindrome-compartimental · 40%', null], ['/flashcards/cripta', null], ['/cronograma', null],
]
const usuarios = nomes.map((nome, i) => {
  const online = i < 4
  const hoje = i < 7
  return {
    id_usuario: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, email: `${nome.split(' ')[0].toLowerCase()}@exemplo.com`, nome,
    criado_em: iso(agora - (i < 3 ? (i + 0.2) * DIA : (i * 9 + 3) * DIA)), ultimo_login: iso(agora - i * HORA), ultima_atividade: hoje ? iso(agora - (i + 1) * 20 * MIN) : iso(agora - (i + 2) * DIA),
    respondidas: [0, 4, 120, 860, 45, 1500, 300, 12, 0, 75, 230, 5, 640, 90][i], acertos: 60 * (i + 1), erros: 25 * (i + 1),
    respondidas_7d: [0, 4, 40, 210, 12, 330, 60, 0, 0, 18, 44, 0, 120, 0][i], plano_vigente: [3, 5, 12].includes(i) ? 'anual' : i === 6 ? 'mensal' : null,
    administrador: i === 13, aparelho: i % 2 ? 'iPhone' : 'Windows', situacao: 'r2', servico: ['HC-FMUSP', 'INTO', 'Santa Casa SP', 'UNIFESP'][i % 4], cidade: 'São Paulo', uf: 'SP',
    respondidas_hoje: hoje ? [0, 4, 15, 52, 8, 70, 21][i] : 0, tentativas_hoje: hoje ? 30 : 0,
    pagina: online ? paginas[i][0] : i === 5 ? '/resumos/rockwood10-24-fraturas-estresse' : '/inicio', questao: online ? paginas[i][1] : null,
    pagina_em: online ? iso(agora - (i + 1) * MIN) : iso(agora - (i + 1) * HORA), visto_em: online ? iso(agora - 15_000) : iso(agora - (i + 1) * HORA),
  }
})
const u = (i) => usuarios[i]
const assinatura = (i, plano, meio, status, inicioDias, extra = {}) => {
  const meses = plano === 'anual' ? 12 : plano === 'semestral' ? 6 : 1
  return {
    id_usuario: u(i).id_usuario, usuario: u(i).email, nome: u(i).nome, plano, status, meio,
    criada_em: iso(agora - inicioDias * DIA), inicio_periodo: iso(agora - inicioDias * DIA), fim_periodo: iso(agora - inicioDias * DIA + meses * 30.5 * DIA),
    ultima_cobranca_em: status === 'pendente' ? null : iso(agora - inicioDias * DIA), proxima_cobranca: null, ultima_atualizacao: iso(agora - inicioDias * DIA), cancelar_ao_fim: false, ...extra,
  }
}
const assinaturas = [
  assinatura(3, 'anual', 'cartao', 'ativa', 40), assinatura(5, 'anual', 'pix', 'ativa', 3), assinatura(12, 'anual', 'cartao', 'ativa', 0.2),
  assinatura(6, 'mensal', 'cartao', 'ativa', 20), assinatura(10, 'semestral', 'pix', 'ativa', 160), assinatura(9, 'mensal', 'cartao', 'cancelada', 50, { cancelar_ao_fim: true, cancelada_em: iso(agora - 10 * DIA) }),
  assinatura(2, 'mensal', 'pix', 'pendente', 1),
]
const precos = { mensal: 39.9, semestral: 199, anual: 349 }
const cobrancasReais = assinaturas.filter(a => a.status !== 'pendente').map(a => ({ id_usuario: a.id_usuario, plano: a.plano, meio: a.meio, valor: precos[a.plano], em: a.ultima_cobranca_em, id_pagamento: String(1e9 + Math.floor(Math.random() * 1e6)), situacao: 'paga', usuario: a.usuario, nome: a.nome }))
const eventos = [
  { id: 1, id_evento: 'ev-1', tipo: 'payment', id_recurso: '123', status_processamento: 'erro', erro: 'pagamento_nao_encontrado', recebido_em: iso(agora - 2 * HORA), processado_em: iso(agora - 2 * HORA), id_usuario: u(5).id_usuario, nome: u(5).nome, usuario: u(5).email },
  { id: 2, id_evento: 'ev-2', tipo: 'subscription_preapproval', id_recurso: '456', status_processamento: 'processado', erro: null, recebido_em: iso(agora - 5 * HORA), processado_em: iso(agora - 5 * HORA) },
]
const serie = Array.from({ length: 30 }, (_, k) => ({ dia: new Date(agora - (29 - k) * DIA - 3 * HORA).toISOString().slice(0, 10), cadastros: k % 3, ativos: 3 + (k % 5), respostas: 80 + k * 4 }))
const rpcs = {
  eh_administrador: () => true,
  obter_acesso_premium: () => [{ premium: true, motivo: 'assinatura', recursos_exclusivos: true, pagamentos_ativos: true }],
  obter_estado_conta: () => [{ status_assinatura: 'ativa', cancelar_ao_fim: false, fim_periodo: null }],
  sinal_aparelho: () => [{ ativo: true, outro_aparelho: null }],
  listar_assinaturas_admin: () => assinaturas,
  listar_eventos_pagamento_admin: () => eventos,
  resumo_admin: () => [{ online_agora: 4, usuarios: usuarios.length, novos_7d: 3, ativos_hoje: 7, ativos_7d: 9, ativos_30d: 12, respondidas_hoje: 170, respondidas_7d: 838, assinantes_vigentes: 5 }],
  contadores_admin: () => [{ usuarios: usuarios.length, online_agora: 4, relatos_abertos: 2, avaliacoes_para_ler: 1 }],
  listar_usuarios_admin: () => usuarios,
  cobrancas_admin: () => cobrancasReais,
  serie_diaria_admin: (a) => serie.slice(-(a.p_dias ?? 30)),
  sinais_usuarios_admin: () => [],
  funil_admin: () => [{ cadastrados: 14, confirmaram: 12, responderam: 11, passaram_50: 8, passaram_500: 3, assinaram: 5 }],
  retencao_admin: () => [],
  resumo_lembretes_admin: () => [],
  resumo_quinzenal_admin: () => [{ pendentes: 0, enviados: 0, falharam: 0 }],
  obter_config_emails_admin: () => [{ marcos_automaticos: true, alertas_admin: true }],
  obter_config_comercial_admin: () => [{ paywall_ativo: true, limite_diario_gratis: 20, pagamentos_ativos: true, atualizado_em: iso(agora) }],
  obter_config_premium_admin: () => [],
}
const pedidos = []
async function atender(rota) {
  const pedido = rota.request()
  const url = new URL(pedido.url())
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
  if (pedido.method() === 'OPTIONS') return rota.fulfill({ status: 204, headers: cors })
  const responder = (status, corpo) => rota.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
  if (url.pathname.startsWith('/auth/v1/user')) return responder(200, usuarioFalso(CONTA))
  if (url.pathname.startsWith('/auth/v1/')) return responder(200, {})
  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_0-9]+)$/)?.[1]
  if (rpc) pedidos.push({ rpc, em: Date.now() })
  if (rpc && rpcs[rpc]) return responder(200, rpcs[rpc](JSON.parse(pedido.postData() || '{}')))
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
try {
  async function contexto(largura, altura, celular = false) {
    const c = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: celular ? 2 : 1, isMobile: celular, hasTouch: celular })
    await c.route(`${SUPABASE}/**`, atender)
    const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: usuarioFalso(CONTA) }
    await c.addInitScript((s) => {
      if (!localStorage.getItem('sb-ortoquestoes-auth')) localStorage.setItem('sb-ortoquestoes-auth', s)
      localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1, em: new Date().toISOString() }))
    }, JSON.stringify(sessaoAuth))
    const p = await c.newPage()
    p.on('pageerror', e => erros.push(e.message))
    return { c, p }
  }
  const abrir = async (p, consulta = '') => {
    await p.goto(BASE + '#/admin' + consulta)
    await p.waitForSelector('.adm-nav', { timeout: 30_000 }).catch(async () => { await p.reload(); await p.waitForSelector('.adm-nav', { timeout: 60_000 }) })
    await p.waitForTimeout(900)
  }
  const foto = (p, nome) => p.screenshot({ path: join(capturas, `${nome}.png`), fullPage: true })

  // ---------- Computador ----------
  const pc = await contexto(1366, 900)
  await abrir(pc.p)
  const secoes = await pc.p.locator('.adm-nav__rotulo').allInnerTexts()
  assert.deepEqual(secoes, ['Agora', 'Pessoas', 'Financeiro', 'Conteúdo', 'E-mails', 'Ajustes'])
  assert.match(await pc.p.locator('.adm-nav__item[aria-current="page"]').innerText(), /Agora\s*4/)
  // Online agora: os 4 do exemplo, cada um com o que está vendo.
  await pc.p.waitForSelector('.adm-aovivo li button')
  assert.equal(await pc.p.locator('.adm-aovivo li button').count(), 4)
  assert.match(await pc.p.locator('.adm-aovivo').innerText(), /mao-0853/)
  assert.match(await pc.p.locator('.adm-aovivo').innerText(), /Lendo o resumo/)
  // "Online agora" e "Pessoas que estudaram" aparecem uma vez só na página.
  assert.equal(await pc.p.getByText('Online agora', { exact: false }).count(), 1)
  assert.equal(await pc.p.getByText('Pessoas que estudaram', { exact: true }).count(), 1)
  assert.match(await pc.p.locator('.adm-atencao').innerText(), /1\s*avisos de pagamento com problema/)
  await foto(pc.p, 'agora-1366')

  // Pessoas › Usuários: sem números de hoje repetidos nem "ao vivo".
  await pc.p.locator('.adm-nav__item', { hasText: 'Pessoas' }).click()
  await pc.p.waitForSelector('.adm-usuarios')
  assert.equal(await pc.p.locator('.adm-aovivo, .adm-kpis-usuarios').count(), 0)
  await foto(pc.p, 'pessoas-1366')
  await pc.p.locator('.adm-parte', { hasText: 'Crescimento' }).click()
  await pc.p.waitForTimeout(800)
  await foto(pc.p, 'crescimento-1366')

  // Financeiro › Ganhos.
  await pc.p.locator('.adm-nav__item', { hasText: 'Financeiro' }).click()
  await pc.p.waitForSelector('.adm-ganhos')
  const ganhos = await pc.p.locator('.adm-ganhos').innerText()
  for (const t of ['Hoje', 'Últimos 7 dias', 'Receita de', 'Desde o começo']) assert.ok(ganhos.includes(t), t)
  assert.match(await pc.p.locator('.adm-fin-fechamento').innerText(), /Previsão de fechamento/)
  // "Assinantes com acesso" e "Pix que vencem em 30 dias" uma vez só (antes, duas).
  assert.equal(await pc.p.getByText('Assinantes com acesso', { exact: true }).count(), 1)
  assert.equal(await pc.p.getByText('Pix que vencem em 30 dias', { exact: true }).count(), 1)
  await foto(pc.p, 'financeiro-1366')

  // Conteúdo, E-mails e Ajustes abrem.
  await pc.p.locator('.adm-nav__item', { hasText: 'E-mails' }).click()
  await pc.p.waitForTimeout(800)
  assert.deepEqual(await pc.p.locator('.adm-parte span').allInnerTexts(), ['Lembretes e automáticos', 'Cartas pessoais'])
  await foto(pc.p, 'emails-1366')
  await pc.p.locator('.adm-nav__item', { hasText: 'Conteúdo' }).click()
  await pc.p.waitForTimeout(500)
  assert.ok((await pc.p.locator('.adm-parte span').allInnerTexts()).includes('Simulados'))

  // Endereços antigos.
  for (const [antigo, novo] of [['?aba=hoje', '#/admin'], ['?aba=geral', '#/admin'], ['?aba=receita', '#/admin?aba=financeiro'], ['?aba=operacoes', '#/admin?aba=lembretes'], ['?aba=configuracoes', '#/admin?aba=ajustes'], ['?aba=avaliacoes', '#/admin?aba=conteudo&vista=avaliacoes']]) {
    await abrir(pc.p, antigo)
    await pc.p.waitForFunction((esperado) => location.hash === esperado, novo, { timeout: 5_000 })
  }

  // Escuro.
  await abrir(pc.p, '?aba=financeiro')
  await pc.p.evaluate(() => { document.documentElement.dataset.tema = 'escuro' })
  await pc.p.waitForTimeout(300)
  await foto(pc.p, 'financeiro-1366-escuro')
  await abrir(pc.p)
  await pc.p.evaluate(() => { document.documentElement.dataset.tema = 'escuro' })
  await pc.p.waitForTimeout(300)
  await foto(pc.p, 'agora-1366-escuro')
  await pc.c.close()

  // ---------- Celular ----------
  const cel = await contexto(390, 844, true)
  await abrir(cel.p)
  await cel.p.waitForSelector('.adm-aovivo li')
  const largura = await cel.p.evaluate(() => document.documentElement.scrollWidth)
  assert.ok(largura <= 390, `rolagem de lado no celular (${largura}px)`)
  await foto(cel.p, 'agora-390')
  await abrir(cel.p, '?aba=financeiro')
  await cel.p.waitForSelector('.adm-ganhos')
  assert.ok(await cel.p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'Financeiro rola de lado no celular')
  await foto(cel.p, 'financeiro-390')
  await abrir(cel.p, '?aba=usuarios')
  await cel.p.waitForSelector('.adm-usuarios')
  await foto(cel.p, 'pessoas-390')
  await cel.c.close()

  assert.deepEqual(erros, [], 'erros na página: ' + erros.join(' | '))
  console.log(`Painel do administrador no navegador: ok. Capturas em ${capturas}`)
} finally {
  await navegador.close()
  await site.close()
}

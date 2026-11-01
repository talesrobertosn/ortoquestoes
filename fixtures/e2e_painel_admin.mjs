// Ponta a ponta no navegador (Playwright): o painel do administrador como painel de observação (17/10/2026).
//
// Sobe o site (vite) apontando para um Supabase falso que o próprio teste atende (context.route), com a
// conta marcada como administradora (eh_administrador) e dados de exemplo nas RPCs do painel. Confere:
//  0. Comando › Visão geral (Mesa de Comando, 01/11/2026): estado, indicadores, gráfico, fila de atenção e áreas;
//  1. as seis áreas na navegação, com o número de online em Comando e as partes aninhadas;
//  2. Agora como torre de controle: "Online agora" com uma linha por pessoa e o que cada uma está vendo em texto
//     completo (nenhum nome ou atividade cortado com reticências), filtros e busca, os números do dia, as listas
//     completas (estudaram hoje, entraram, recém-cadastrados, mais ativos, dinheiro hoje) e o que pede atenção;
//  3. Pessoas › Usuários sem repetir os números de hoje nem o "ao vivo";
//  4. Financeiro › Ganhos: hoje, 7 dias, mês, ano, desde o começo e a previsão de fechamento;
//  5. endereços antigos (?aba=hoje, receita, operacoes, configuracoes) abrindo no lugar novo;
//  6. E-mails › Todas as cartas (17/10/2026): todos os cartões (o número vem do próprio catálogo) escritos pelo motor no navegador, filtro, busca, sortear, prévia;
//  7. capturas no computador (1440 px) e no celular (390 px), claro e escuro.
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
  ['/sessao · 3 de 10', 'mao-0853'], ['/resumos/rockwood10-17-sindrome-compartimental · 40% lido', null], ['/flashcards/cripta · andar 7', null], ['/cronograma', null],
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
  assinatura(3, 'anual', 'cartao', 'ativa', 40), assinatura(5, 'anual', 'pix', 'ativa', 3), assinatura(12, 'anual', 'cartao', 'ativa', 0.01),
  assinatura(6, 'mensal', 'cartao', 'ativa', 20), assinatura(10, 'semestral', 'pix', 'ativa', 160), assinatura(9, 'mensal', 'cartao', 'cancelada', 50, { cancelar_ao_fim: true, cancelada_em: iso(agora - 10 * DIA) }),
  assinatura(2, 'mensal', 'pix', 'pendente', 1),
  assinatura(7, 'mensal', 'cartao', 'cancelada', 15, { cancelar_ao_fim: true, cancelada_em: iso(agora - 30 * MIN) }),
]
const precos = { mensal: 39.9, semestral: 199, anual: 349 }
const cobrancasReais = assinaturas.filter(a => a.status !== 'pendente').map(a => ({ id_usuario: a.id_usuario, plano: a.plano, meio: a.meio, valor: precos[a.plano], em: a.ultima_cobranca_em, id_pagamento: String(1e9 + Math.floor(Math.random() * 1e6)), situacao: 'paga', usuario: a.usuario, nome: a.nome }))
const eventos = [
  { id: 1, id_evento: 'ev-1', tipo: 'payment', id_recurso: '123', status_processamento: 'erro', erro: 'pagamento_nao_encontrado', recebido_em: iso(agora - 2 * HORA), processado_em: iso(agora - 2 * HORA), id_usuario: u(5).id_usuario, nome: u(5).nome, usuario: u(5).email },
  { id: 2, id_evento: 'ev-2', tipo: 'subscription_preapproval', id_recurso: '456', status_processamento: 'processado', erro: null, recebido_em: iso(agora - 5 * HORA), processado_em: iso(agora - 5 * HORA) },
]
// 120 dias: o Comando pede o dobro do período (30 + 30 anteriores); os últimos 30 são os de sempre.
const serie = Array.from({ length: 120 }, (_, k) => ({ dia: new Date(agora - (119 - k) * DIA - 3 * HORA).toISOString().slice(0, 10), cadastros: k % 3, ativos: 3 + (k % 5), respostas: k < 90 ? 60 + (k % 7) * 5 : 80 + (k - 90) * 4 }))
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
  sinais_usuarios_admin: () => [
    { id_usuario: u(1).id_usuario, planos_vezes: 3, planos_ultima: iso(agora - 2 * HORA), condicoes_ultima: null, flashcards_unicos: 0, flashcards_7d: 0, flashcards_ultima: null, cripta_andar: null, locais_trabalho: null },
    { id_usuario: u(2).id_usuario, planos_vezes: 0, planos_ultima: null, condicoes_ultima: null, flashcards_unicos: 40, flashcards_7d: 25, flashcards_ultima: iso(agora - 10 * MIN), cripta_andar: 7, locais_trabalho: null },
  ],
  funil_admin: () => [{ cadastrados: 14, confirmaram: 12, responderam: 11, passaram_50: 8, passaram_500: 3, assinaram: 5 }],
  retencao_admin: () => [],
  resumo_lembretes_admin: () => [],
  resumo_quinzenal_admin: () => [{ pendentes: 0, enviados: 0, falharam: 0 }],
  obter_config_emails_admin: () => [{ marcos_automaticos: true, alertas_admin: true }],
  obter_config_comercial_admin: () => [{ paywall_ativo: true, limite_diario_gratis: 20, pagamentos_ativos: true, atualizado_em: iso(agora) }],
  obter_config_premium_admin: () => [],
  // A ficha de uma pessoa (objetos JSON, não listas): o bastante para abrir sem erro.
  detalhe_usuario_admin: () => ({ respostas: [], sessoes: [], favoritas: 2, anotacoes: 0, oculto_ranking: false, cortesia: null, aparelho: { descricao: 'iPhone', entrou_em: iso(agora - 3 * DIA), visto_em: iso(agora - 15_000) }, emails_conquistas: true, emails: [], perfil: { situacao: 'r2', servico: 'HC-FMUSP', cidade: 'São Paulo', uf: 'SP', confirmado: true } }),
  atividade_usuario_admin: () => ({ por_dia: [], horas: [], visitas: [], agora: { pagina: '/sessao · 3 de 10', questao: 'mao-0853', pagina_em: iso(agora - MIN), visto_em: iso(agora - 15_000), online: true }, conta: { nascimento: null, whatsapp: null, novidades: true, confirmado_em: iso(agora - 3 * DIA), ultimo_login: iso(agora - HORA), provedor: 'email' } }),
  ficha_extra_usuario_admin: () => ({ perfil: null, planos: null, flashcards: { progresso: null, servidor: null, cripta: null } }),
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
// fs.allow com o caminho real de node_modules: num worktree com atalho, as fontes ficavam fora da lista do Vite.
const { realpathSync } = await import('node:fs')
const site = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 500), strictPort: false, fs: { allow: [process.cwd(), realpathSync('node_modules')] } }, logLevel: 'error' })
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
      // Também roda nos iframes isolados (prévia da carta na ficha), onde não há localStorage.
      try {
        if (!localStorage.getItem('sb-ortoquestoes-auth')) localStorage.setItem('sb-ortoquestoes-auth', s)
        localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1, em: new Date().toISOString() }))
        // Sem escolha o site abre no claro; a linha abaixo garante as capturas "claro" mesmo assim.
        localStorage.setItem('ortoquestoes:tema', JSON.stringify('claro'))
      } catch { /* iframe sandbox */ }
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
  // Do topo: com a página rolada, a captura inteira desenha o cabeçalho fixo por cima do conteúdo.
  const foto = async (p, nome) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(250); await p.screenshot({ path: join(capturas, `${nome}.png`), fullPage: true }) }

  // ---------- Computador ----------
  const pc = await contexto(1440, 900)
  await abrir(pc.p)
  const secoes = await pc.p.locator('.adm-nav__rotulo').allInnerTexts()
  assert.deepEqual(secoes, ['Comando', 'Pessoas', 'Estudo e conteúdo', 'Receita', 'Comunicação', 'Configurações'])
  assert.match(await pc.p.locator('.adm-nav__item[aria-current="true"]').innerText(), /Comando\s*4/)
  assert.deepEqual(await pc.p.locator('.adm-nav__parte > span').allInnerTexts(), ['Visão geral', 'Hoje em detalhe'])
  assert.equal(await pc.p.locator('.adm-nav__parte[aria-current="page"]').innerText().then(t => t.trim()), 'Visão geral')
  // Comando › Visão geral: estado, cinco indicadores, gráfico com a linha do período anterior, fila e áreas.
  await pc.p.waitForSelector('.adm-comando .adm-serie svg', { timeout: 15_000 })
  assert.match(await pc.p.locator('.adm-migalhas').innerText(), /Painel\s*›\s*Comando\s*›\s*Visão geral/)
  assert.equal(await pc.p.locator('h1').innerText(), 'Estado do OrtoQuestões')
  assert.equal(await pc.p.locator('.adm-comando__kpis .adm-ind').count(), 5)
  assert.equal(await pc.p.locator('.adm-comando .adm-serie__linha--b').count(), 1, 'linha do período anterior')
  const comando = await pc.p.locator('.adm-comando').innerText()
  for (const t of ['Pede ação agora', 'Acontecendo agora', 'Estudo de hoje', 'Aquisição e ativação', 'Receita e saúde de pagamento', 'Qualidade do acervo', 'Fila de atenção', 'Ver dados'])
    assert.ok(comando.includes(t), `Comando sem "${t}"`)
  // O aviso do processador com erro é crítico e abre os Avisos.
  assert.match(await pc.p.locator('.adm-prioridades .adm-fila').first().innerText(), /Crítico/i)
  // Definição do indicador abre e fecha.
  await pc.p.locator('.adm-ind__def-botao').first().click()
  assert.match(await pc.p.locator('.adm-ind__def').first().innerText(), /Fonte/i)
  // Período 7 dias vai para o endereço e volta.
  await pc.p.locator('.adm-periodo button', { hasText: '7 dias' }).click()
  await pc.p.waitForFunction(() => location.hash === '#/admin?periodo=7', null, { timeout: 5_000 })
  assert.ok(await pc.p.evaluate(() => document.documentElement.scrollWidth <= 1440), 'rolagem de lado no Comando')
  await foto(pc.p, 'comando-1440')
  await pc.p.locator('.adm-periodo button', { hasText: '30 dias' }).click()
  await pc.p.waitForFunction(() => location.hash === '#/admin', null, { timeout: 5_000 })
  await pc.p.evaluate(() => { document.documentElement.dataset.tema = 'escuro' })
  await pc.p.waitForTimeout(300)
  await foto(pc.p, 'comando-1440-escuro')
  await pc.p.evaluate(() => { document.documentElement.dataset.tema = 'claro' })
  // Hoje em detalhe (o antigo Agora).
  await pc.p.locator('.adm-nav__parte', { hasText: 'Hoje em detalhe' }).click()
  await pc.p.waitForFunction(() => location.hash === '#/admin?aba=agora', null, { timeout: 5_000 })
  // Online agora: os 4 do exemplo, uma linha por pessoa, com o que cada um está vendo em texto completo.
  await pc.p.waitForSelector('.adm-vivo .adm-pessoa')
  assert.equal(await pc.p.locator('.adm-vivo .adm-pessoa').count(), 4)
  const vivo = await pc.p.locator('.adm-vivo').innerText()
  for (const t of ['Ana Ribeiro', 'Respondendo questões · Mão e punho · mao-0853 · 3 de 10', 'Lendo o resumo', '40% lido', 'Torneio de Flashcards: batalha na Cripta · andar 7', 'Cronograma', 'nesta página', 'online há', 'Ver ficha', 'Enviar carta', 'Assinante · anual', 'Não assinante', 'Viu os planos hoje · 3×'])
    assert.ok(vivo.includes(t), `Online agora sem "${t}"`)
  // Nada cortado: nenhum nome, selo ou atividade com reticências ativas nem texto escondido por overflow.
  const cortados = () => pc.p.evaluate(() => {
    const ruins = []
    for (const el of document.querySelectorAll('.adm-agora *')) {
      const cs = getComputedStyle(el)
      // Rótulos só para leitor de tela (.so-leitor) são escondidos de propósito.
      const temTexto = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
      if (!temTexto || el.classList.contains('so-leitor')) continue
      if (cs.textOverflow === 'ellipsis' && (cs.overflowX === 'hidden' || cs.overflow === 'hidden')) ruins.push('ellipsis: ' + el.className)
      if ((cs.overflowX === 'hidden' || cs.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 1) ruins.push('escondido: ' + el.className + ' "' + el.textContent.slice(0, 40) + '"')
    }
    return ruins
  })
  assert.deepEqual(await cortados(), [], 'texto cortado em Agora (1440 px)')
  assert.ok(await pc.p.evaluate(() => document.documentElement.scrollWidth <= 1440), 'rolagem de lado no computador')
  // Filtros e busca da lista ao vivo.
  await pc.p.locator('.adm-vivo .adm-chip', { hasText: /^Assinantes/ }).click()
  assert.equal(await pc.p.locator('.adm-vivo .adm-pessoa').count(), 1)
  assert.match(await pc.p.locator('.adm-vivo .adm-pessoa').innerText(), /Diego Alves/)
  await pc.p.locator('.adm-vivo .adm-chip', { hasText: 'Viu os planos' }).click()
  assert.match(await pc.p.locator('.adm-vivo .adm-pessoa').innerText(), /Bruno Costa/)
  await pc.p.locator('.adm-vivo .adm-chip', { hasText: 'Todos' }).click()
  await pc.p.locator('.adm-vivo input[type="search"]').fill('carla')
  assert.equal(await pc.p.locator('.adm-vivo .adm-pessoa').count(), 1)
  await pc.p.locator('.adm-vivo input[type="search"]').fill('')
  assert.equal(await pc.p.locator('.adm-vivo .adm-pessoa').count(), 4)
  // Sumário fixo com os blocos, e cada bloco existe uma vez só.
  const sumario = await pc.p.locator('.adm-sumario a').allInnerTexts()
  assert.deepEqual(sumario, ['Online agora', 'Números do dia', 'Pede atenção', 'Estudaram hoje', 'Entraram hoje', 'Recém-cadastrados', 'Mais ativos na semana', 'Dinheiro hoje', 'Biblioteca hoje'])
  for (const id of ['agora-online', 'agora-numeros', 'agora-atencao', 'agora-estudaram', 'agora-entraram', 'agora-cadastros', 'agora-semana', 'agora-dinheiro', 'agora-biblioteca']) assert.equal(await pc.p.locator(`#${id}`).count(), 1, id)
  assert.equal(await pc.p.locator('.adm-vivo').count(), 1)
  assert.equal(await pc.p.getByText('Pessoas que estudaram', { exact: true }).count(), 1)
  // Números do dia: contas, cadastros, confirmaram o e-mail, questões (com ontem), dinheiro.
  const numeros = await pc.p.locator('#agora-numeros').innerText()
  for (const t of ['Contas no total', '14', 'Cadastros hoje', 'Confirmaram o e-mail', '12', 'Entraram hoje', 'Fizeram 5 ou mais questões', 'Questões respondidas', 'ontem', 'Usaram flashcards', 'Resumos abertos hoje', 'Assinantes com acesso', 'Pagaram hoje', 'Novas assinaturas hoje', 'Desligaram a renovação hoje', 'Pix pendentes', 'ainda não medido'])
    assert.ok(numeros.includes(t), `Números do dia sem "${t}"`)
  // Estudaram hoje: as 7 pessoas do dia, com o que cada uma fez (questões, flashcards, resumo), em lista completa.
  const estudaram = await pc.p.locator('#agora-estudaram').innerText()
  assert.equal(await pc.p.locator('#agora-estudaram .adm-pessoa').count(), 7)
  for (const t of ['Fábio Nunes', '70 questões', 'flashcards hoje (25 na semana) · andar 7 no Torneio', 'leu o resumo', 'última atividade às', 'Ver ficha']) assert.ok(estudaram.includes(t), `Estudaram hoje sem "${t}"`)
  await pc.p.locator('#agora-estudaram .adm-chip', { hasText: 'Mais questões' }).click()
  assert.match(await pc.p.locator('#agora-estudaram .adm-pessoa').first().innerText(), /Fábio Nunes/)
  await pc.p.locator('#agora-estudaram input[type="search"]').fill('elisa')
  assert.equal(await pc.p.locator('#agora-estudaram .adm-pessoa').count(), 1)
  await pc.p.locator('#agora-estudaram input[type="search"]').fill('')
  // Recém-cadastrados (3), mais ativos na semana (todos com questões na semana, 9), dinheiro com nomes.
  assert.equal(await pc.p.locator('#agora-cadastros .adm-pessoa').count(), 3)
  assert.match(await pc.p.locator('#agora-cadastros').innerText(), /Chegou hoje às|Chegou ontem às|já fez 4 questões|ainda não começou/)
  assert.equal(await pc.p.locator('#agora-semana .adm-pessoa').count(), 9)
  assert.match(await pc.p.locator('#agora-semana .adm-pessoa').first().innerText(), /1º\s*330 questões na semana/)
  const dinheiro = await pc.p.locator('#agora-dinheiro').innerText()
  for (const t of ['Pagaram hoje', 'Marina Duarte', 'Anual · Cartão · R$', 'Novas assinaturas hoje', 'Desligaram a renovação hoje', 'Henrique Sá', 'Pix pendentes', 'Carla Mendes', 'Mensal · Pix']) assert.ok(dinheiro.includes(t), `Dinheiro hoje sem "${t}"`)
  assert.match(await pc.p.locator('.adm-atencao').innerText(), /1\s*avisos de pagamento com problema/)
  // Ver ficha abre a ficha da pessoa; Enviar carta abre direto em "Carta e ações".
  await pc.p.locator('.adm-vivo .adm-pessoa').first().getByRole('button', { name: 'Enviar carta' }).click()
  await pc.p.waitForSelector('.adm-ficha[role="dialog"]', { timeout: 5_000 })
  assert.equal(await pc.p.locator('.adm-ficha .fx-aba[aria-current="page"]').innerText(), 'Carta e ações')
  await pc.p.keyboard.press('Escape')
  await pc.p.waitForTimeout(300)
  await foto(pc.p, 'agora-1440')

  // Pessoas abre na Análise; o Explorador é a lista, sem números de hoje repetidos nem "ao vivo".
  await pc.p.locator('.adm-nav__item', { hasText: 'Pessoas' }).click()
  await pc.p.waitForFunction(() => location.hash === '#/admin?aba=crescimento', null, { timeout: 5_000 })
  await pc.p.waitForTimeout(800)
  assert.match(await pc.p.locator('.adm-parte-cabeca').innerText(), /Investigar\s*Análise/i)
  await foto(pc.p, 'crescimento-1440')
  await pc.p.locator('.adm-nav__parte', { hasText: 'Explorador' }).click()
  await pc.p.waitForSelector('.adm-usuarios')
  assert.equal(await pc.p.locator('.adm-vivo, .adm-kpis-usuarios').count(), 0)
  await foto(pc.p, 'pessoas-1440')

  // Receita › Resultados: a faixa do período (confirmado × reconstruído) e o quadro de Ganhos.
  await pc.p.locator('.adm-nav__item', { hasText: 'Receita' }).click()
  await pc.p.waitForSelector('.adm-receita-periodo')
  assert.match(await pc.p.locator('.adm-receita-periodo').innerText(), /Receita confirmada[\s\S]*Receita por dia/)
  await pc.p.waitForSelector('.adm-ganhos')
  const ganhos = await pc.p.locator('.adm-ganhos').innerText()
  for (const t of ['Hoje', 'Últimos 7 dias', 'Receita de', 'Desde o começo']) assert.ok(ganhos.includes(t), t)
  assert.match(await pc.p.locator('.adm-fin-fechamento').innerText(), /Previsão de fechamento/)
  // "Assinantes com acesso" e "Pix que vencem em 30 dias" uma vez só (antes, duas).
  assert.equal(await pc.p.getByText('Assinantes com acesso', { exact: true }).count(), 1)
  assert.equal(await pc.p.getByText('Pix que vencem em 30 dias', { exact: true }).count(), 1)
  await foto(pc.p, 'financeiro-1440')
  // Avisos do processador (os links dos e-mails de alerta, ?aba=pagamentos) continuam abrindo a lista com o erro.
  await pc.p.locator('.adm-nav__parte', { hasText: 'Avisos do processador' }).click()
  await pc.p.waitForSelector('.adm-eventos')
  assert.match(await pc.p.locator('.adm-evento').first().innerText(), /Precisa de atenção|Erro|erro/i)

  // Comunicação, Estudo e Configurações abrem.
  await pc.p.locator('.adm-nav__item', { hasText: 'Comunicação' }).click()
  await pc.p.waitForTimeout(800)
  assert.deepEqual(await pc.p.locator('.adm-nav__parte > span').allInnerTexts(), ['Campanhas e envios', 'Catálogo de cartas'])
  await foto(pc.p, 'emails-1440')
  // Comunicação › Catálogo de cartas (17/10/2026): o catálogo vivo, escrito pelo motor no navegador.
  await pc.p.locator('.adm-nav__parte', { hasText: 'Catálogo de cartas' }).click()
  await pc.p.waitForSelector('.tc-cartao', { timeout: 15_000 })
  await pc.p.waitForFunction(() => location.hash === '#/admin?aba=todas', null, { timeout: 5_000 })
  // O catálogo cresce com as cartas novas: o total e os grupos vêm dos próprios filtros, e cada número tem de bater com os cartões.
  const numeroDoChip = async (p, rotulo) => Number(await p.locator('.tc .adm-chip', { hasText: rotulo }).locator('span').innerText())
  const totalCartas = await numeroDoChip(pc.p, /^Todas/)
  assert.ok(totalCartas >= 32, `catálogo encolheu (${totalCartas})`)
  assert.equal(await pc.p.locator('.tc-cartao').count(), totalCartas, 'cartões ≠ número do filtro Todas')
  const todas = await pc.p.locator('.tc').innerText()
  for (const t of [`${totalCartas} modelos`, 'tipos, com a carta de estudo aberta nas 9 faixas', 'versões escritas à mão', 'Plano da reescrita', 'docs/emails/PLANO.md', 'Quando sai', 'Para quem', 'Amostra para', 'Sortear outra versão', 'Boas-vindas no dia da confirmação', 'Obrigado pela assinatura', 'Transacional', 'Estudando, acerto 90% ou mais', 'Tales, do Orto Questões', 'P.S.:'])
    assert.ok(todas.includes(t), `Todas as cartas sem "${t}": ${todas.slice(0, 400)}`)
  assert.equal(await pc.p.locator('.tc [role="alert"]').count(), 0, 'alguma amostra não foi escrita')
  // Toda carta tem assunto, um P.S. e a assinatura; nenhuma cita preço.
  const cartoes = await pc.p.locator('.tc-cartao').allInnerTexts()
  for (const c of cartoes) { assert.match(c, /Assunto/); assert.equal((c.match(/P\.S\.:/g) ?? []).length, 1, c.slice(0, 80)); assert.ok(!/R\$/.test(c)) }
  // Filtro por grupo e busca por texto.
  await pc.p.locator('.tc .adm-chip', { hasText: /^Novos/ }).click()
  assert.equal(await pc.p.locator('.tc-cartao').count(), await numeroDoChip(pc.p, /^Novos/))
  await pc.p.locator('.tc .adm-chip', { hasText: /^Faixas/ }).click()
  assert.equal(await pc.p.locator('.tc-cartao').count(), 9, 'a carta de estudo nas 9 faixas')
  await pc.p.locator('.tc .adm-chip', { hasText: /^Todas/ }).click()
  await pc.p.locator('.tc input[type="search"]').fill('reembolso')
  assert.ok((await pc.p.locator('.tc-cartao').count()) >= 1 && (await pc.p.locator('.tc-cartao').count()) < totalCartas)
  assert.match(await pc.p.locator('.tc-cartao').first().innerText(), /Obrigado pelo tempo|reembolso/i)
  await pc.p.locator('.tc input[type="search"]').fill('')
  assert.equal(await pc.p.locator('.tc-cartao').count(), totalCartas)
  // Sortear outra versão troca o texto do cartão (e só dele).
  const primeiro = pc.p.locator('.tc-cartao').first()
  const segundo = pc.p.locator('.tc-cartao').nth(1)
  const antesPrimeiro = await primeiro.locator('.tc-amostra__versao').innerText(), antesSegundo = await segundo.locator('.tc-amostra__versao').innerText()
  await primeiro.getByRole('button', { name: 'Sortear outra versão' }).click()
  await pc.p.waitForTimeout(200)
  assert.notEqual(await primeiro.locator('.tc-amostra__versao').innerText(), antesPrimeiro, 'sortear não trocou a versão')
  assert.equal(await segundo.locator('.tc-amostra__versao').innerText(), antesSegundo, 'sortear mexeu em outro cartão')
  // "Ver como chega" abre a prévia exata (iframe com o HTML que sai).
  await primeiro.getByRole('button', { name: 'Ver como chega' }).click()
  await pc.p.waitForSelector('.tc .ce-previa iframe', { timeout: 5_000 })
  await primeiro.getByRole('button', { name: 'Fechar prévia' }).click()
  assert.ok(await pc.p.evaluate(() => document.documentElement.scrollWidth <= 1440), 'Todas as cartas rola de lado no computador')
  await foto(pc.p, 'todas-cartas-1440')
  await pc.p.evaluate(() => { document.documentElement.dataset.tema = 'escuro' })
  await pc.p.waitForTimeout(300)
  await foto(pc.p, 'todas-cartas-1440-escuro')
  await pc.p.evaluate(() => { document.documentElement.dataset.tema = 'claro' })
  await pc.p.locator('.adm-nav__item', { hasText: 'Estudo e conteúdo' }).click()
  await pc.p.waitForTimeout(500)
  assert.ok((await pc.p.locator('.adm-nav__parte > span').allInnerTexts()).includes('Simulados'))
  await pc.p.locator('.adm-nav__item', { hasText: 'Configurações' }).click()
  await pc.p.waitForTimeout(500)
  await pc.p.locator('.adm-nav__parte', { hasText: 'Exportação' }).click()
  await pc.p.waitForSelector('.adm-exportar-parte')
  await foto(pc.p, 'exportar-1440')

  // Endereços antigos.
  for (const [antigo, novo] of [['?aba=hoje', '#/admin?aba=agora'], ['?aba=geral', '#/admin'], ['?aba=estudo', '#/admin?aba=conteudo'], ['?aba=comunicacao', '#/admin?aba=lembretes'], ['?aba=receita', '#/admin?aba=financeiro'], ['?aba=operacoes', '#/admin?aba=lembretes'], ['?aba=configuracoes', '#/admin?aba=ajustes'], ['?aba=avaliacoes', '#/admin?aba=conteudo&vista=avaliacoes']]) {
    await abrir(pc.p, antigo)
    await pc.p.waitForFunction((esperado) => location.hash === esperado, novo, { timeout: 5_000 })
  }

  // Escuro.
  await abrir(pc.p, '?aba=financeiro')
  await pc.p.evaluate(() => { document.documentElement.dataset.tema = 'escuro' })
  await pc.p.waitForTimeout(300)
  await foto(pc.p, 'financeiro-1440-escuro')
  await abrir(pc.p, '?aba=agora')
  await pc.p.evaluate(() => { document.documentElement.dataset.tema = 'escuro' })
  await pc.p.waitForTimeout(300)
  await foto(pc.p, 'agora-1440-escuro')
  await pc.c.close()

  // ---------- Tablet (1024 px): coluna lateral e painel médio, sem rolagem de lado ----------
  const tab = await contexto(1024, 768)
  await abrir(tab.p)
  await tab.p.waitForSelector('.adm-comando .adm-serie svg', { timeout: 15_000 })
  assert.ok(await tab.p.evaluate(() => document.documentElement.scrollWidth) <= 1024, 'Comando rola de lado no tablet')
  await foto(tab.p, 'comando-1024')
  await tab.c.close()

  // ---------- Celular ----------
  const cel = await contexto(390, 844, true)
  await abrir(cel.p)
  await cel.p.waitForSelector('.adm-comando .adm-serie svg', { timeout: 15_000 })
  assert.ok(await cel.p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'Comando rola de lado no celular')
  // No celular: barra inferior com as seis áreas e as partes num trilho acima do conteúdo.
  assert.equal(await cel.p.locator('.adm-nav__item').count(), 6)
  assert.ok(await cel.p.locator('.adm-partes').isVisible())
  assert.ok(!(await cel.p.locator('.adm-nav__partes').isVisible().catch(() => false)))
  await foto(cel.p, 'comando-390')
  await cel.p.evaluate(() => { document.documentElement.dataset.tema = 'escuro' })
  await cel.p.waitForTimeout(300)
  await foto(cel.p, 'comando-390-escuro')
  await cel.p.evaluate(() => { document.documentElement.dataset.tema = 'claro' })
  await abrir(cel.p, '?aba=agora')
  await cel.p.waitForSelector('.adm-vivo .adm-pessoa')
  const largura = await cel.p.evaluate(() => document.documentElement.scrollWidth)
  assert.ok(largura <= 390, `rolagem de lado no celular (${largura}px)`)
  // No celular a linha vira níveis, ainda sem nada cortado.
  const cortadosCel = await cel.p.evaluate(() => {
    const ruins = []
    for (const el of document.querySelectorAll('.adm-agora *')) {
      const cs = getComputedStyle(el)
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || el.classList.contains('so-leitor')) continue
      if (cs.textOverflow === 'ellipsis' && (cs.overflowX === 'hidden' || cs.overflow === 'hidden')) ruins.push('ellipsis: ' + el.className)
      if ((cs.overflowX === 'hidden' || cs.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 1) ruins.push('escondido: ' + el.className)
    }
    return ruins
  })
  assert.deepEqual(cortadosCel, [], 'texto cortado em Agora (390 px)')
  assert.ok((await cel.p.locator('.adm-vivo').innerText()).includes('Torneio de Flashcards: batalha na Cripta · andar 7'))
  await foto(cel.p, 'agora-390')
  await abrir(cel.p, '?aba=financeiro')
  await cel.p.waitForSelector('.adm-ganhos')
  assert.ok(await cel.p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'Financeiro rola de lado no celular')
  await foto(cel.p, 'financeiro-390')
  await abrir(cel.p, '?aba=usuarios')
  await cel.p.waitForSelector('.adm-usuarios')
  await foto(cel.p, 'pessoas-390')
  // Todas as cartas no celular: um cartão por linha, sem rolagem de lado, botões alcançáveis.
  await abrir(cel.p, '?aba=todas')
  await cel.p.waitForSelector('.tc-cartao', { timeout: 15_000 })
  assert.equal(await cel.p.locator('.tc-cartao').count(), await numeroDoChip(cel.p, /^Todas/))
  assert.ok(await cel.p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'Todas as cartas rola de lado no celular')
  assert.ok(await cel.p.evaluate(() => [...document.querySelectorAll('.tc-cartao')].every(c => c.getBoundingClientRect().width <= 390 - 2 * 12)), 'cartão mais largo que a tela')
  await foto(cel.p, 'todas-cartas-390')
  await cel.c.close()

  assert.deepEqual(erros, [], 'erros na página: ' + erros.join(' | '))
  console.log(`Painel do administrador no navegador: ok. Capturas em ${capturas}`)
} finally {
  await navegador.close()
  await site.close()
}

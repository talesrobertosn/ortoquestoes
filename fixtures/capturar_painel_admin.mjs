// Capturas do painel 3.0 com os dados de exemplo do e2e (sem rede real). ABAS=comando,agora TAMANHOS=1440x900 TEMAS=claro,escuro CAPTURAS=pasta node fixtures/capturar_painel_admin.mjs
// Ponta a ponta no navegador (Playwright): o painel do administrador como painel de observação (17/10/2026).
//
// Sobe o site (vite) apontando para um Supabase falso que o próprio teste atende (context.route), com a
// conta marcada como administradora (eh_administrador) e dados de exemplo nas RPCs do painel. Confere:
//  1. as seis seções na navegação, com o número de online em Agora;
//  2. Agora como torre de controle: "Online agora" com uma linha por pessoa e o que cada uma está vendo em texto
//     completo (nenhum nome ou atividade cortado com reticências), filtros e busca, os números do dia, as listas
//     completas (estudaram hoje, entraram, recém-cadastrados, mais ativos, dinheiro hoje) e o que pede atenção;
//  3. Pessoas › Usuários sem repetir os números de hoje nem o "ao vivo";
//  4. Financeiro › Ganhos: hoje, 7 dias, mês, ano, desde o começo e a previsão de fechamento;
//  5. endereços antigos (?aba=hoje, receita, operacoes, configuracoes) abrindo no lugar novo;
//  6. E-mails › Todas as cartas (17/10/2026): 32 cartões escritos pelo motor no navegador, filtro, busca, sortear, prévia;
//  7. capturas no computador (1366 px) e no celular (390 px), claro e escuro.
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
const serie = Array.from({ length: 120 }, (_, k) => ({ dia: new Date(agora - (119 - k) * DIA - 3 * HORA).toISOString().slice(0, 10), cadastros: k % 3, ativos: 3 + (k % 5), respostas: k < 90 ? 60 + (k % 7) * 5 + Math.round(18 * Math.sin(k / 4)) : 80 + (k - 90) * 4 + Math.round(14 * Math.sin(k / 3)) }))
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
  listar_opinioes_flashcards_admin: () => [
    { id: 1, categoria: 'som', facil_estudar: 4, experiencia_visual: 5, som_celular: 'nao', problema: 'No iPhone o som do acerto não toca com o modo silencioso desligado.', melhorar: null, origem: 'fim_sessao', aparelho: 'iPhone 13', status: 'aberta', criada_em: iso(agora - 3 * HORA), usuario: 'karina@exemplo.com' },
    { id: 2, categoria: 'conteudo', facil_estudar: 5, experiencia_visual: 4, som_celular: 'sim', problema: null, melhorar: 'Mais cartas de coluna pediátrica.', origem: 'central', aparelho: 'Windows', status: 'aberta', criada_em: iso(agora - 2 * DIA), usuario: 'lucas@exemplo.com' },
  ],
  sn_admin_listar: () => [
    { edicao: '2026-11', tipo: 'mensal', titulo: 'Simulado Nacional de novembro', abre_em: iso(agora - 2 * DIA), fecha_em: iso(agora + 5 * DIA), duracao_min: 240, total: 100, publicado: true, aberto_a_todos: false, destaque_inicio: true, descricao: null, config: {}, ids: [], inscritos: 42, participantes: 18, entregas: 11, media: 61.4 },
    { edicao: '2026-10', tipo: 'mensal', titulo: 'Simulado Nacional de outubro', abre_em: iso(agora - 32 * DIA), fecha_em: iso(agora - 25 * DIA), duracao_min: 240, total: 100, publicado: true, aberto_a_todos: true, destaque_inicio: false, descricao: null, config: {}, ids: [], inscritos: 77, participantes: 50, entregas: 41, media: 58.2 },
  ],
  estatisticas_questoes_admin: () => [
    { id_questao: 'mao-0853', pessoas: 40, acertos_primeira: 9, erros_primeira: 31, acertos_atual: 30 },
    { id_questao: 'mao-2164', pessoas: 22, acertos_primeira: 5, erros_primeira: 17, acertos_atual: 15 },
    { id_questao: 'mao-0001', pessoas: 30, acertos_primeira: 29, erros_primeira: 1, acertos_atual: 30 },
  ],
  listar_relatos_admin: () => [
    { id: 1, id_questao: 'mao-0853', tipo: 'gabarito', texto: 'O gabarito diz C, mas o Green (8ª ed.) traz a D como resposta para esta classificação.', status: 'aberto', nota_admin: null, criado_em: iso(agora - 3 * HORA), resolvido_em: null, usuario: 'carla@exemplo.com' },
    { id: 2, id_questao: 'mao-2164', tipo: 'imagem', texto: 'A radiografia não carrega no celular.', status: 'aberto', nota_admin: null, criado_em: iso(agora - DIA), resolvido_em: null, usuario: 'bruno@exemplo.com' },
    { id: 3, id_questao: 'mao-0001', tipo: 'enunciado', texto: 'Erro de digitação no enunciado.', status: 'resolvido', nota_admin: 'Corrigido.', criado_em: iso(agora - 5 * DIA), resolvido_em: iso(agora - 4 * DIA), usuario: 'ana@exemplo.com', avisado_em: iso(agora - 4 * DIA) },
  ],
  listar_avaliacoes_comentario_admin: () => [
    { id_questao: 'mao-0853', util: false, motivo: 'confuso', observacao: 'Não entendi por que a alternativa B está errada; o comentário pula essa parte.', atualizado_em: iso(agora - 2 * HORA), usuario: 'diego@exemplo.com' },
    { id_questao: 'mao-2164', util: true, motivo: null, observacao: null, atualizado_em: iso(agora - 5 * HORA), usuario: 'elisa@exemplo.com' },
    { id_questao: 'mao-0001', util: true, motivo: null, observacao: null, atualizado_em: iso(agora - 9 * HORA), usuario: 'fabio@exemplo.com' },
  ],
  resumo_lembretes_admin: () => [{ campanha: 'nunca', pessoas: 2, enviados_7d: 5, enviados_total: 40, falharam_7d: 0 }, { campanha: 'tres_dias', pessoas: 1, enviados_7d: 3, enviados_total: 22, falharam_7d: 0 }],
  listar_destinatarios_lembrete_admin: (a) => a.p_campanha === 'nunca' ? [
    { id_usuario: u(0).id_usuario, nome: u(0).nome, email: u(0).email, respondidas: 0, acertos: 0, dias_fora: null, dias_restantes: null, plano: null, fim_periodo: null, ultimo_lembrete_em: null, ultimo_lembrete_assunto: null, lembretes_30d: 0, liberado: true },
    { id_usuario: u(8).id_usuario, nome: u(8).nome, email: u(8).email, respondidas: 0, acertos: 0, dias_fora: null, dias_restantes: null, plano: null, fim_periodo: null, ultimo_lembrete_em: iso(agora - DIA), ultimo_lembrete_assunto: 'Sua primeira missão', lembretes_30d: 1, liberado: false },
  ] : [],
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
    await p.waitForSelector('.a3-casca', { timeout: 30_000 }).catch(async () => { await p.reload(); await p.waitForSelector('.a3-casca', { timeout: 60_000 }) })
    await p.waitForTimeout(900)
  }
  const foto = (p, nome) => p.screenshot({ path: join(capturas, `${nome}.png`), fullPage: true })

  const ABAS = (process.env.ABAS ?? 'comando').split(',')
  const TAMANHOS = (process.env.TAMANHOS ?? '1440x900,390x844').split(',').map(t => t.split('x').map(Number))
  const TEMAS = (process.env.TEMAS ?? 'claro').split(',')
  for (const [largura, altura] of TAMANHOS) {
    const x = await contexto(largura, altura, largura < 600)
    for (const aba of ABAS) {
      const [nome, consulta] = aba.includes('?') ? aba.split('?') : [aba, aba === 'comando' ? '' : `aba=${aba}`]
      await abrir(x.p, consulta ? `?${consulta}` : '')
      await x.p.waitForTimeout(Number(process.env.ESPERA ?? 1800))
      for (const tema of TEMAS) {
        await x.p.evaluate((t) => { document.documentElement.dataset.tema = t }, tema); await x.p.waitForTimeout(250)
        await foto(x.p, `${nome}-${largura}${tema === 'escuro' ? '-escuro' : ''}`)
        // SONDA="expressão JS": imprime o resultado de uma consulta à página (para depurar medidas).
        if (process.env.SONDA) console.log(`SONDA ${nome} ${largura}:`, JSON.stringify(await x.p.evaluate(process.env.SONDA)))
      }
      await x.p.evaluate(() => { document.documentElement.dataset.tema = 'claro' })
      const larguraDoc = await x.p.evaluate(() => document.documentElement.scrollWidth)
      if (larguraDoc > largura) {
        const culpados = await x.p.evaluate((w) => [...document.querySelectorAll('.a3 *')].filter(el => { const r = el.getBoundingClientRect(); return r.right > w + 1 && r.width > 0 && ![...el.children].some(c => c.getBoundingClientRect().right > w + 1) }).slice(0, 6).map(el => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} (${Math.round(el.getBoundingClientRect().right)})`), largura)
        console.log(`ROLAGEM DE LADO: ${nome} ${largura} -> ${larguraDoc}: ${culpados.join(' | ')}`)
      }
    }
    await x.c.close()
  }
  console.log('erros:', JSON.stringify(erros))
} finally {
  await navegador.close()
  await site.close()
}

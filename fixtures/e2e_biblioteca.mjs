// Ponta a ponta no navegador (Playwright): a Biblioteca de resumos em dois aparelhos da mesma conta.
//
// Sobe o site (vite) apontando para um Supabase falso atendido pelo próprio teste, com as mesmas
// regras de sincronizar_progresso / ler_progresso_desde (versão por linha, trava otimista, idempotência).
// Roteiro: destacar, anotar, recarregar, trocar fonte/tema/modo, abrir no celular, perder a conexão,
// editar a mesma nota nos dois aparelhos, apagar, abrir questão e voltar, e um banco sem a parte 29.
//
// Uso: node fixtures/e2e_biblioteca.mjs   (CHROMIUM=/caminho; capturas em $CAPTURAS)
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SUPABASE = 'https://falso.supabase.co'
process.env.VITE_SUPABASE_URL = SUPABASE
const { createServer } = await import('vite')
const { chromium } = await import('playwright')

const CONTA = '11111111-2222-4333-8444-555555555555'
const CAPITULO = 'rockwood10-53-colo-femur'
const capturas = process.env.CAPTURAS ?? await mkdtemp(join(tmpdir(), 'orto-e2e-bib-'))

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

async function aparelho(nome, viewport) {
  const contexto = await navegador.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', hasTouch: viewport.width < 600 })
  // Sem rede só para o Supabase: setOffline derrubaria também o servidor de desenvolvimento do Vite,
  // que recarrega a página ao perder a conexão (isso não acontece no site publicado).
  const estado = { semRede: false }
  await contexto.route(`${SUPABASE}/**`, (rota) => estado.semRede ? rota.abort('internetdisconnected') : atender(rota))
  const sessaoAuth = { access_token: `tok-${CONTA}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, user: usuarioFalso(CONTA) }
  await contexto.addInitScript((s) => {
    if (!localStorage.getItem('sb-ortoquestoes-auth')) localStorage.setItem('sb-ortoquestoes-auth', s)
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
  }, JSON.stringify(sessaoAuth))
  const p = await contexto.newPage()
  p.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`))
  const rede = async (ligada) => {
    estado.semRede = !ligada
    await p.evaluate((l) => { Object.defineProperty(navigator, 'onLine', { value: l, configurable: true }); window.dispatchEvent(new Event(l ? 'online' : 'offline')) }, ligada)
  }
  return { nome, contexto, p, rede }
}
async function abrirCapitulo(p) {
  await p.goto(`${BASE}#/resumos/${CAPITULO}`)
  await p.waitForSelector('.lr-pagina [data-texto]', { timeout: 30_000 })
}
const esperarSalvo = (p, t = 20_000) => p.waitForFunction(() => /Salvo na conta/.test(document.querySelector('.lr-salvo')?.textContent ?? ''), null, { timeout: t })
/** Seleciona `trecho` dentro do primeiro bloco de texto que o contém (como o dedo ou o mouse fariam). */
async function selecionar(p, trecho) {
  const ok = await p.evaluate((t) => {
    for (const el of document.querySelectorAll('[data-texto]')) {
      const andador = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let no = andador.nextNode(); no; no = andador.nextNode()) {
        const i = no.textContent.indexOf(t)
        if (i < 0) continue
        el.scrollIntoView({ block: 'center' })
        const r = document.createRange(); r.setStart(no, i); r.setEnd(no, i + t.length)
        const s = getSelection(); s.removeAllRanges(); s.addRange(r)
        return true
      }
    }
    return false
  }, trecho)
  assert.ok(ok, `trecho não encontrado: ${trecho}`)
  await p.waitForSelector('.lr-menu', { timeout: 5000 })
}
const textoDasMarcas = (p) => p.locator('.lr-marca').allInnerTexts()

try {
  // 1. Computador: destaca e anota.
  const pc = await aparelho('computador', { width: 1366, height: 900 })
  await abrirCapitulo(pc.p)
  await esperarSalvo(pc.p)
  const TRECHO = 'ramo profundo da artéria circunflexa femoral medial'
  await selecionar(pc.p, TRECHO)
  await pc.p.screenshot({ path: join(capturas, '1-menu-selecao.png') })
  await pc.p.locator('.lr-menu .lr-cor--amarelo').click()
  await pc.p.waitForSelector('.lr-marca--amarelo')
  assert.deepEqual(await textoDasMarcas(pc.p), [TRECHO])
  await esperarSalvo(pc.p)
  assert.equal(marcasNoServidor().length, 1, 'a marcação chegou ao servidor')
  // Dois destaques no mesmo parágrafo, um deles verde.
  await selecionar(pc.p, 'artérias retinaculares superiores')
  await pc.p.locator('.lr-menu .lr-cor--verde').click()
  await pc.p.waitForSelector('.lr-marca--verde')
  // Nota na primeira.
  await pc.p.locator('.lr-marca--amarelo').first().click()
  await pc.p.waitForSelector('.lr-cartao textarea')
  await pc.p.locator('.lr-cartao textarea').fill('Revisar a ACFM antes do TEOT.')
  await pc.p.waitForTimeout(900)
  await pc.p.locator('.lr-cartao .lr-botao[aria-label="Fechar"]').click()
  await esperarSalvo(pc.p)
  assert.ok(marcasNoServidor().some((l) => l.valor.nota === 'Revisar a ACFM antes do TEOT.'), 'a nota chegou ao servidor')
  await pc.p.screenshot({ path: join(capturas, '2-computador-marcas.png') })

  // 2. Recarregar: tudo continua lá (vem do aparelho e do servidor).
  await pc.p.reload(); await pc.p.waitForSelector('.lr-marca--amarelo', { timeout: 20_000 })
  assert.equal((await textoDasMarcas(pc.p)).length, 2)
  assert.ok(await pc.p.locator('.lr-marca--nota').count() >= 1, 'o ponto de nota aparece')

  // 3. Fonte maior, tema escuro, modo paginado e de volta: a marcação continua no mesmo trecho.
  await pc.p.locator('.lr-botao--aa').click()
  for (let i = 0; i < 4; i++) await pc.p.locator('button[aria-label="Aumentar a letra"]').click()
  await pc.p.locator('.lr-tema--escuro').click()
  await pc.p.locator('button[role="radio"]:has-text("Páginas")').click()
  await pc.p.waitForSelector('.lr--paginado')
  assert.ok((await textoDasMarcas(pc.p)).includes(TRECHO))
  await pc.p.keyboard.press('Escape')
  await pc.p.screenshot({ path: join(capturas, '3-paginado-escuro.png') })
  const paginas = await pc.p.locator('.lr-paginas span').innerText()
  assert.match(paginas, /^\d+ de \d+ · ~\d+ min restantes$/)
  await pc.p.keyboard.press('ArrowRight'); await pc.p.waitForTimeout(500)
  assert.match(await pc.p.locator('.lr-paginas span').innerText(), /^\d+ de \d+ · ~\d+ min restantes$/)
  await pc.p.locator('.lr-botao--aa').click()
  await pc.p.locator('button[role="radio"]:has-text("Rolagem")').click()
  await pc.p.locator('.lr-tema--claro').click()
  await pc.p.keyboard.press('Escape')
  assert.ok((await textoDasMarcas(pc.p)).includes(TRECHO))
  // Posição: rola até a seção de classificações e deixa salvar.
  await pc.p.evaluate(() => document.querySelector('#secao-classificacoes')?.scrollIntoView({ block: 'start' }))
  await pc.p.waitForTimeout(1800)
  await esperarSalvo(pc.p)

  // 4. Abrir uma questão sem perder o lugar e voltar.
  const botaoQuestao = pc.p.locator('#secao-classificacoes .lr-cobranca__lista button').first()
  await botaoQuestao.scrollIntoViewIfNeeded()
  const antes = await pc.p.evaluate(() => document.querySelector('.lr-rolagem').scrollTop)
  await botaoQuestao.click()
  await pc.p.waitForSelector('.lr-questao .alternativa-envelope, .lr-questao .alternativas, .lr-questao [class*="alternativa"]', { timeout: 30_000 })
  await pc.p.screenshot({ path: join(capturas, '4-questao-aberta.png') })
  await pc.p.locator('.lr-questao__rodape button').click()
  assert.equal(await pc.p.locator('.lr-questao').count(), 0)
  assert.equal(await pc.p.evaluate(() => document.querySelector('.lr-rolagem').scrollTop), antes, 'a leitura ficou onde estava')

  // 5. Celular, mesma conta: vê as marcações, a nota e volta à posição do computador.
  const cel = await aparelho('celular', { width: 390, height: 844 })
  await abrirCapitulo(cel.p)
  await cel.p.waitForSelector('.lr-marca--amarelo', { timeout: 30_000 })
  assert.equal((await textoDasMarcas(cel.p)).length, 2)
  await cel.p.waitForTimeout(800)
  const visivelNoCelular = await cel.p.evaluate(() => { const h = document.querySelector('#secao-classificacoes'); const r = h.getBoundingClientRect(); return r.top < innerHeight && r.bottom > -4000 })
  assert.ok(visivelNoCelular, 'o celular abre perto de onde o computador parou')
  await cel.p.screenshot({ path: join(capturas, '5-celular.png') })

  // 6. Celular sem conexão edita a nota; o computador edita a mesma nota online. Nada se perde.
  await cel.rede(false)
  await cel.p.locator('.lr-marca--amarelo').first().scrollIntoViewIfNeeded()
  await cel.p.locator('.lr-marca--amarelo').first().click()
  await cel.p.locator('.lr-cartao textarea').fill('Nota do celular: ACFM 82%.')
  await cel.p.waitForTimeout(900)
  if (process.env.DEPURAR) await cel.p.screenshot({ path: join(capturas, 'depurar-celular.png') })
  await cel.p.locator('.lr-cartao .lr-botao[aria-label="Fechar"]').click()
  await cel.p.waitForFunction(() => /pendentes|Salvando/.test(document.querySelector('.lr-salvo')?.textContent ?? ''), null, { timeout: 10_000 })
  assert.doesNotMatch(await cel.p.locator('.lr-salvo').innerText(), /Salvo/, 'sem conexão nunca mostra "Salvo"')
  await cel.p.screenshot({ path: join(capturas, '6-celular-offline.png') })
  await pc.p.locator('.lr-marca--amarelo').first().scrollIntoViewIfNeeded()
  await pc.p.locator('.lr-marca--amarelo').first().click()
  await pc.p.locator('.lr-cartao textarea').fill('Nota do computador: ramo profundo.')
  await pc.p.waitForTimeout(900)
  await pc.p.locator('.lr-cartao .lr-botao[aria-label="Fechar"]').click()
  await esperarSalvo(pc.p)
  await cel.rede(true)
  await esperarSalvo(cel.p, 40_000)
  const final = marcasNoServidor().find((l) => /Nota do/.test(l.valor.nota))
  const textos = [final.valor.nota, ...(final.valor.notasDeOutroAparelho ?? [])]
  assert.ok(textos.includes('Nota do celular: ACFM 82%.') && textos.includes('Nota do computador: ramo profundo.'), `as duas notas ficaram (${JSON.stringify(textos)})`)
  await cel.p.locator('.lr-marca--amarelo').first().click()
  await cel.p.waitForSelector('.lr-conflito')
  await cel.p.screenshot({ path: join(capturas, '7-conflito.png') })
  await cel.p.locator('.lr-conflito button:has-text("Juntar")').first().click()
  await cel.p.locator('.lr-cartao .lr-botao[aria-label="Fechar"]').click()
  await esperarSalvo(cel.p)
  const juntada = marcasNoServidor().find((l) => /Nota do/.test(l.valor.nota))
  assert.ok(/celular/.test(juntada.valor.nota) && /computador/.test(juntada.valor.nota) && !juntada.valor.notasDeOutroAparelho, 'juntar deixou as duas na nota e resolveu o conflito')

  // 7. Apagar no computador some no celular (lápide, sem ressuscitar).
  await pc.p.locator('.lr-marca--verde').first().click()
  await pc.p.locator('.lr-cartao__apagar').click()
  await esperarSalvo(pc.p)
  await cel.p.reload(); await cel.p.waitForSelector('.lr-marca--amarelo', { timeout: 20_000 })
  await cel.p.waitForTimeout(1500)
  assert.equal(await cel.p.locator('.lr-marca--verde').count(), 0, 'a exclusão chegou ao celular')

  // 8. Caderno: reúne, filtra por cor e abre no contexto.
  await pc.p.goto(`${BASE}#/resumos/caderno`)
  await pc.p.waitForSelector('.rs-caderno li')
  await pc.p.locator('.rs-filtros__cores .lr-cor--amarelo').click()
  assert.equal(await pc.p.locator('.rs-caderno li').count(), 1)
  await pc.p.screenshot({ path: join(capturas, '8-caderno.png'), fullPage: true })
  await pc.p.locator('.rs-caderno a').first().click()
  await pc.p.waitForSelector('.lr-piscar', { timeout: 10_000 })

  // 9. Banco sem a parte 29: a marcação fica neste aparelho, o aviso é de falha, e as respostas seguem.
  semMigracao = true
  await abrirCapitulo(pc.p)
  await selecionar(pc.p, 'calcar femoral')
  await pc.p.locator('.lr-menu .lr-cor--azul').click()
  await pc.p.waitForFunction(() => /Falha na sincronização/.test(document.querySelector('.lr-salvo')?.textContent ?? ''), null, { timeout: 20_000 })
  assert.equal(marcasNoServidor().filter((l) => l.valor.cor === 'azul').length, 0)
  const pendente = await pc.p.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.endsWith(':sincronia:v1')); const e = JSON.parse(localStorage.getItem(k)); return { pendentes: Object.keys(e.pendentes).filter((x) => x.startsWith('biblioteca/')).length, rejeitados: Object.keys(e.rejeitados ?? {}).length } })
  assert.ok(pendente.pendentes >= 1 && pendente.rejeitados === 0, 'fica pendente, não vai para "não enviados"')
  semMigracao = false

  assert.deepEqual(erros, [])
  console.log(`E2E Biblioteca: destacar, anotar, recarregar, fonte/tema/modo, questão e volta, outro aparelho, offline com conflito, exclusão, caderno e banco sem migração OK. Capturas: ${capturas}`)
} finally {
  await navegador.close()
  await site.close()
}

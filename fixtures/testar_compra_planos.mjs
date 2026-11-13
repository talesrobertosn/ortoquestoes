// Fluxo de compra da página de planos, de ponta a ponta, com Supabase e Mercado Pago simulados
// (sem credenciais e sem rede). Gera um build próprio com pagamentos ligados, abre num servidor
// local e confere: os três planos no topo; visitante vai criar a conta e volta com o plano; plano
// → Pix → QR Code e Copia e Cola (e o link antigo quando a função não manda o QR); confirmação do
// Pix; plano → cartão → redireciona ao Mercado Pago; aceite com a versão vigente das condições;
// nenhum total de questões na página; sem rolagem lateral no celular; movimento reduzido.
// Rodar: npm run test:compra   (CHROMIUM=/caminho/do/chromium para outro navegador)
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { chromium } from 'playwright'

const raiz = process.cwd()
const termos = await readFile(join(raiz, 'src/conta/termos.ts'), 'utf8')
const VERSAO = termos.match(/VERSAO_CONDICOES_ASSINATURA = '([^']+)'/)[1]
assert.equal(VERSAO, '2026-11-13', 'A versão vigente das condições mudou: confira as funções antes')
for (const f of ['criar-pix', 'criar-checkout']) {
  const fonte = await readFile(join(raiz, `supabase/functions/${f}/index.ts`), 'utf8')
  assert.ok(fonte.includes(`'${VERSAO}'`) && fonte.includes("'2026-10-16'") && fonte.includes("'2026-10-01'"), `${f} precisa aceitar ${VERSAO}, 2026-10-16 e 2026-10-01`)
}

const pasta = await mkdtemp(join(tmpdir(), 'oq-compra-'))
const env = { ...process.env, VITE_SUPABASE_URL: 'https://exemplo.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_simulado', VITE_PAGAMENTOS_HABILITADOS: 'true', VITE_FLASHCARDS_VENDA: '1' }
execFileSync('npx', ['vite', 'build', '--outDir', pasta, '--emptyOutDir', '--logLevel', 'error'], { cwd: raiz, env, stdio: 'inherit' })

const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
const servidor = createServer(async (req, res) => {
  const pedido = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const caminho = pedido === '/' ? '/index.html' : pedido
  try { const corpo = await readFile(join(pasta, caminho)); res.writeHead(200, { 'Content-Type': tipos[extname(caminho)] ?? 'application/octet-stream' }); res.end(corpo) }
  catch { res.writeHead(404); res.end() }
}).listen(0, '127.0.0.1')
await new Promise((r) => servidor.once('listening', r))
const BASE = `http://127.0.0.1:${servidor.address().port}/`

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const uid = '22222222-2222-2222-2222-222222222222'
const PIX = {
  url: 'https://www.mercadopago.com.br/payments/123/ticket?caller_id=1&hash=abc', pedido_id: '33333333-3333-3333-3333-333333333333',
  expira_em: new Date(Date.now() + 864e5).toISOString(), qr_code: '00020126580014br.gov.bcb.pix0136chave-simulada5204000053039865406239.905802BR6304ABCD',
  qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
}

async function abrir(navegador, { logado = true, largura = 1400, altura = 860, pix = PIX, statusPix = 'pending', movimento = 'no-preference', rota = '#/assinatura', precosAntigos = [] } = {}) {
  const agora = Math.floor(Date.now() / 1000)
  const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'ana@exemplo.com', app_metadata: {}, user_metadata: { nome: 'Ana', termos_versao: VERSAO, provas_interesse: ['teot'], situacao: 'residente', ano_residencia: 'r3' } }
  const sessao = { access_token: `${b64({ alg: 'HS256' })}.${b64({ sub: uid, exp: agora + 36000 })}.x`, token_type: 'bearer', expires_in: 36000, expires_at: agora + 36000, refresh_token: 'r', user }
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, reducedMotion: movimento })
  const pagina = await contexto.newPage()
  const chamadas = []
  const erros = []
  pagina.on('pageerror', (e) => erros.push(String(e)))
  await pagina.route(/supabase\.co/, (r) => {
    const u = r.request().url()
    let corpo = null
    try { corpo = r.request().postDataJSON() } catch { /* sem corpo */ }
    if (u.includes('/functions/v1/')) {
      const nome = u.split('/functions/v1/')[1]
      chamadas.push({ nome, corpo })
      if (nome === 'criar-pix') return r.fulfill({ json: corpo?.pedido_id ? { status: statusPix } : pix })
      if (nome === 'criar-checkout') return r.fulfill({ json: { url: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=simulado' } })
      return r.fulfill({ json: {} })
    }
    if (u.includes('meus_precos_antigos')) return r.fulfill({ json: precosAntigos })
    if (u.includes('obter_estado_conta')) return r.fulfill({ json: [{ respostas_total: 312, sequencia: 4, plano: null, status_assinatura: null, fim_periodo: null, ultima_cobranca_em: null, cancelar_ao_fim: false }] })
    if (u.includes('/auth/v1/user')) return r.fulfill({ json: user })
    return r.fulfill({ json: [] })
  })
  await pagina.route(/mercadopago\.com\.br/, (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Mercado Pago simulado</title><h1>Mercado Pago simulado</h1>' }))
  await pagina.addInitScript(([s, id, entrar]) => {
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1, em: new Date().toISOString() }))
    if (entrar) { localStorage.setItem('sb-ortoquestoes-auth', s); localStorage.setItem('oq-aparelho-conta', id) }
  }, [JSON.stringify(sessao), uid, logado])
  await pagina.goto(BASE + rota)
  await pagina.locator('.vd-heroi h1, .ck').first().waitFor({ timeout: 15000 })
  return { contexto, pagina, chamadas, erros }
}

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })
try {
  // 1. Visitante: os três planos no topo, com o preço por mês, e o botão leva a criar a conta.
  {
    const { contexto, pagina, erros } = await abrir(navegador, { logado: false })
    const topo = pagina.locator('.vd-heroi .vd-planos')
    for (const [nome, preco] of [['Mensal', '39,90'], ['Semestral', '34,90'], ['Anual', '29,90']]) {
      const cartao = topo.locator('.vd-plano', { has: pagina.getByRole('heading', { name: nome, exact: true }) })
      assert.ok((await cartao.innerText()).includes(preco), `${nome} sem o preço por mês ${preco}`)
    }
    // Destaque no anual (13/11/2026): selo "Melhor preço" e botão dourado; mensal e semestral com botão verde.
    const destaque = topo.locator('.vd-plano--destaque')
    assert.equal(await destaque.count(), 1)
    assert.ok(await destaque.evaluate((e) => e.classList.contains('vd-plano--anual')), 'O destaque não é o anual')
    assert.match(await destaque.innerText(), /melhor preço/i, 'Anual sem o selo')
    assert.ok(await destaque.locator('.vd-botao-destaque').count() === 1, 'Anual sem o botão dourado')
    assert.equal(await topo.locator('.vd-botao-verde').count(), 2, 'Mensal e semestral sem o botão verde')
    for (const c of await topo.locator('.vd-plano').all()) assert.match(await c.innerText(), /sem fidelidade/i, 'Cartão sem o "Sem fidelidade"')
    assert.equal(await topo.locator('.vd-plano--mensal .vd-plano__selo').count(), 0, 'O mensal ainda tem selo')
    assert.ok((await topo.locator('.vd-plano--anual').innerText()).includes('-25%'), 'O anual perdeu o desconto')
    // Sem o preço por dia nos cartões (Tales, 03/11/2026: não converte); fica o preço por mês e o total do período.
    assert.doesNotMatch(await topo.innerText(), /R\$\s?[\d,]+ por dia/, 'Preço por dia nos cartões')
    assert.ok((await topo.locator('.vd-plano--mensal').innerText()).includes('Prepare-se para o TEOT por menos que uma pizza por mês'), 'Mensal sem a pizza no computador')
    for (const c of await topo.locator('.vd-plano').all()) assert.ok((await c.innerText()).includes('Mudou de ideia? Em até 7 dias, você pede o reembolso com um só clique.'), 'Cartão sem a garantia')
    assert.ok((await pagina.locator('.vd-heroi').innerText()).includes('7 dias de garantia'), 'Garantia fora do topo')
    // Tudo o que é da compra fica dentro da caixa verde, na mesma linguagem (Tales, 09/11/2026: o bilhete de
    // inauguração e o suporte soltos embaixo dela deixavam a página desconexa). Ordem: planos, inauguração, selos,
    // e a linha de baixo com o guia do blog e o suporte (com o assunto da assinatura já escolhido).
    const suporte = pagina.locator('.vd-heroi .vd-suporte--topo').getByRole('link', { name: 'Fale com o suporte' })
    assert.match(await suporte.getAttribute('href'), /contato\?assunto=assinatura$/, 'Atalho do suporte sem o assunto')
    assert.equal(await pagina.locator('.vd-final .vd-suporte--final').count(), 1, 'Atalho do suporte ausente no fim da página')
    assert.equal(await pagina.locator('.vd-depois-planos').count(), 0, 'Ainda há um bloco solto embaixo da caixa verde')
    const guia = pagina.locator('.vd-heroi .vd-guia-estudo')
    assert.match(await guia.getAttribute('href'), /blog\/como-estudar-por-questoes\/$/, 'Guia de estudo por questões ausente abaixo dos planos')
    const inauguracao = pagina.locator('.vd-heroi .vd-abertura--faixa')
    assert.match(await inauguracao.innerText(), /este preço é seu para sempre/, 'Aviso de inauguração ausente')
    const [yPlanos, yAviso, ySuporte] = [(await topo.boundingBox()).y + (await topo.boundingBox()).height, (await inauguracao.boundingBox()).y, (await pagina.locator('.vd-suporte--topo').boundingBox()).y]
    assert.ok(yPlanos <= yAviso && yAviso < ySuporte, 'A ordem deveria ser: planos, inauguração, suporte')
    if (process.env.PRINTS) {
      await inauguracao.scrollIntoViewIfNeeded(); await pagina.waitForTimeout(1200)
      await pagina.screenshot({ path: join(process.env.PRINTS, 'inauguracao-computador.png') })
    }
    if (process.env.PRINTS) {
      await suporte.scrollIntoViewIfNeeded(); await pagina.waitForTimeout(1500)
      await pagina.screenshot({ path: join(process.env.PRINTS, 'suporte-computador.png') })
    }
    // Nenhum total de questões: nem o da contagem das provas, nem o do acervo.
    const texto = await pagina.locator('main, body').first().innerText()
    const contagem = JSON.parse(await readFile(join(raiz, 'src/dados/incidencia.json'), 'utf8')).base
    const indice = JSON.parse(await readFile(join(raiz, 'public/acervo/indice.json'), 'utf8'))
    for (const n of [contagem, indice.total, indice.questoes?.length].filter(Boolean)) {
      assert.ok(!texto.includes(n.toLocaleString('pt-BR')) && !texto.includes(String(n)), `A página cita o total ${n}`)
    }
    await topo.getByRole('link', { name: 'Assinar o anual' }).click()
    await pagina.waitForFunction(() => location.hash.startsWith('#/conta'))
    const hash = decodeURIComponent(await pagina.evaluate(() => location.hash))
    assert.ok(hash.includes('modo=criar') && hash.includes('/assinatura?plano=anual'), `Visitante não foi criar a conta com o plano: ${hash}`)
    assert.deepEqual(erros, [])
    await contexto.close()
  }

  // 2. Logado: anual → Pix → QR Code e Copia e Cola, com o aceite da versão vigente.
  {
    const { contexto, pagina, chamadas, erros } = await abrir(navegador)
    await pagina.locator('#vd-titulo', { hasText: 'Ana, você já respondeu 312 questões' }).waitFor({ timeout: 8000 })
    await pagina.locator('.vd-heroi .vd-plano--anual').getByRole('button', { name: 'Assinar o anual' }).click()
    const janela = pagina.locator('.ck')
    await janela.waitFor()
    assert.ok(await janela.getByRole('radio', { name: /Pix/ }).isChecked(), 'Pix não vem marcado primeiro')
    const gerar = janela.getByRole('button', { name: /Gerar Pix de R\$\s?358,80/ })
    await janela.getByLabel('CPF de quem vai pagar').fill('529.982.247-25')
    assert.ok(await gerar.isDisabled(), 'Pix gerado sem o aceite')
    await janela.getByRole('checkbox').check()
    await gerar.click()
    await janela.getByRole('img', { name: 'QR Code do Pix' }).waitFor()
    assert.equal(await janela.getByLabel('Pix Copia e Cola').inputValue(), PIX.qr_code)
    assert.ok(await janela.getByRole('button', { name: /Copiar código Pix/ }).isVisible())
    const pedido = chamadas.find((c) => c.nome === 'criar-pix' && c.corpo?.plano)
    assert.deepEqual(pedido.corpo, { plano: 'anual', cpf: '529.982.247-25', aceite_termos_versao: VERSAO, aceite_confirmado: true })
    await pagina.waitForTimeout(300)
    assert.ok(chamadas.some((c) => c.nome === 'criar-pix' && c.corpo?.pedido_id === PIX.pedido_id), 'A página não confere o Pix')
    assert.deepEqual(erros, [])
    await contexto.close()
  }

  // 3. Pix confirmado: a janela fecha e a confirmação aparece.
  {
    const { contexto, pagina } = await abrir(navegador, { statusPix: 'approved', largura: 390, altura: 844 })
    await pagina.locator('.vd-heroi .vd-plano--semestral').getByRole('button', { name: /Assinar o semestral/ }).click()
    const janela = pagina.locator('.ck')
    await janela.getByLabel('CPF de quem vai pagar').fill('52998224725')
    await janela.getByRole('checkbox').check()
    await janela.getByRole('button', { name: /Gerar Pix de R\$\s?209,40/ }).click()
    await pagina.getByText('Pagamento confirmado. Seu período de acesso está ativo.').waitFor()
    await contexto.close()
  }

  // 4. Função antiga (sem QR na resposta): continua o link do Mercado Pago.
  {
    const { contexto, pagina } = await abrir(navegador, { pix: { url: PIX.url, pedido_id: PIX.pedido_id, expira_em: PIX.expira_em } })
    await pagina.locator('.vd-heroi .vd-plano--mensal').getByRole('button', { name: /Assinar o mensal/ }).click()
    const janela = pagina.locator('.ck')
    await janela.getByLabel('CPF de quem vai pagar').fill('52998224725')
    await janela.getByRole('checkbox').check()
    await janela.getByRole('button', { name: /Gerar Pix/ }).click()
    const link = janela.getByRole('link', { name: 'Abrir QR Code e Pix Copia e Cola' })
    await link.waitFor()
    assert.equal(await link.getAttribute('href'), PIX.url)
    await contexto.close()
  }

  // 5. Cartão: mensal → cartão → Mercado Pago, com o aceite da versão vigente.
  {
    const { contexto, pagina, chamadas } = await abrir(navegador, { largura: 844, altura: 390 })
    await pagina.locator('.vd-heroi .vd-plano--mensal').getByRole('button', { name: /Assinar o mensal/ }).click()
    const janela = pagina.locator('.ck')
    await janela.locator('label.ck__meio', { hasText: 'Cartão de crédito' }).click()
    assert.ok(await janela.getByRole('radio', { name: /Cartão de crédito/ }).isChecked())
    assert.equal(await janela.getByLabel('CPF de quem vai pagar').count(), 0, 'CPF pedido no cartão')
    await janela.getByRole('checkbox').check()
    await janela.getByRole('button', { name: /Continuar para Mercado Pago/ }).click()
    await pagina.waitForURL(/mercadopago\.com\.br\/subscriptions/)
    const pedido = chamadas.find((c) => c.nome === 'criar-checkout')
    assert.deepEqual(pedido.corpo, { plano: 'mensal', aceite_termos_versao: VERSAO, aceite_confirmado: true })
    await contexto.close()
  }

  // 6. Quem criou a conta a partir de um plano volta direto para o pagamento dele.
  {
    const { contexto, pagina } = await abrir(navegador, { rota: '#/assinatura?plano=semestral' })
    await pagina.locator('.ck').waitFor()
    assert.ok((await pagina.locator('.ck__selo').innerText()).toLowerCase().includes('semestral'))
    await contexto.close()
  }

  // 7. Quem pagava o semestral antes do reajuste: o semestral sai pelo preço antigo, com o selo e o
  // aviso; o anual, que a pessoa não pagava, sai pelo preço novo.
  {
    const dia = 864e5
    const { contexto, pagina } = await abrir(navegador, { precosAntigos: [{ plano: 'semestral', ate: new Date(Date.now() + 120 * dia).toISOString() }] })
    const semestral = pagina.locator('.vd-heroi .vd-plano--semestral')
    const anual = pagina.locator('.vd-heroi .vd-plano--anual')
    await semestral.locator('.vd-plano__abertura', { hasText: 'Seu preço de sempre' }).waitFor({ timeout: 8000 })
    assert.ok((await semestral.innerText()).includes('29,98'), 'Preço antigo do semestral ausente')
    assert.ok((await anual.innerText()).includes('29,90'), 'O anual deveria ter o preço novo')
    assert.equal(await anual.locator('.vd-plano__abertura').count(), 0, 'Selo de preço antigo no plano que a pessoa não pagava')
    const aviso = pagina.locator('.vd-abertura--guardado')
    assert.ok((await aviso.innerText()).includes('Os preços subiram, o seu não'), 'Aviso de preço guardado ausente')
    assert.equal(await pagina.locator('.vd-abertura:not(.vd-abertura--guardado)').count(), 0, 'Quem tem preço guardado não vê o aviso de inauguração')
    assert.match(await aviso.innerText(), /R\$\s?179,90/, 'Aviso sem o valor guardado')
    assert.ok((await aviso.innerText()).includes('nunca muda'), 'Aviso sem a promessa de que o preço não muda')
    // PRINTS=pasta salva a tela para conferência visual.
    if (process.env.PRINTS) await pagina.waitForTimeout(2000), await pagina.locator('.vd-heroi__planos').screenshot({ path: join(process.env.PRINTS, 'preco-guardado.png') })
    await semestral.getByRole('button', { name: 'Assinar o semestral' }).click()
    await pagina.locator('.ck').getByRole('button', { name: /Gerar Pix de R\$\s?179,90/ }).waitFor()
    await contexto.close()
  }

  // 7b. Plano anual já encerrado, dentro dos 30 dias: o aviso mostra até quando renovar pelo preço antigo.
  {
    const ate = new Date(Date.now() + 10 * 864e5)
    const { contexto, pagina } = await abrir(navegador, { precosAntigos: [{ plano: 'anual', ate: ate.toISOString() }] })
    const aviso = pagina.locator('.vd-abertura--guardado')
    await aviso.waitFor({ timeout: 8000 })
    const texto = await aviso.innerText()
    assert.ok(texto.includes('Renove até') && texto.includes(ate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })), `Aviso sem o prazo: ${texto}`)
    assert.ok((await pagina.locator('.vd-heroi .vd-plano--anual').innerText()).includes('19,99'), 'Preço antigo do anual ausente')
    assert.ok((await pagina.locator('.vd-heroi .vd-plano--semestral').innerText()).includes('34,90'), 'O semestral deveria ter o preço novo')
    if (process.env.PRINTS) await pagina.waitForTimeout(2000), await aviso.screenshot({ path: join(process.env.PRINTS, 'preco-guardado-prazo.png') })
    await contexto.close()
  }

  // 8. Celular sem rolagem lateral; movimento reduzido mostra tudo sem esconder nada.
  for (const [largura, altura] of [[390, 844], [844, 390]]) {
    const { contexto, pagina } = await abrir(navegador, { largura, altura, movimento: 'reduce', logado: largura === 390 })
    await pagina.waitForTimeout(500)
    const [total, janela] = await pagina.evaluate(() => [document.documentElement.scrollWidth, innerWidth])
    assert.ok(total <= janela, `Rolagem lateral em ${largura}x${altura}: ${total} > ${janela}`)
    assert.equal(await pagina.locator('.vd-anima').count(), 0, 'Animação ligada com movimento reduzido')
    if (largura === 390) {
      // No celular, o anual (destaque) vem primeiro, inteiro; mensal e semestral logo abaixo, lado a lado.
      const caixa = (id) => pagina.locator(`.vd-heroi .vd-plano--${id}`).boundingBox()
      const [m, s, a] = [await caixa('mensal'), await caixa('semestral'), await caixa('anual')]
      assert.ok(a.y < m.y && Math.abs(s.y - m.y) < 2 && m.x < s.x && a.width > s.width * 1.8, 'Ordem dos planos no celular')
      // A pizza curta, numa linha só, no lugar da chamada (que some no celular).
      const pizza = pagina.locator('.vd-heroi .vd-plano--anual .vd-plano__pizza-curta')
      assert.equal((await pizza.innerText()).trim(), 'Menos que uma pizza por mês')
      assert.ok((await pizza.boundingBox()).height < 30, 'A pizza quebrou em duas linhas no celular')
      if (process.env.PRINTS) {
        await pagina.locator('.vd-compra-rodape').first().scrollIntoViewIfNeeded(); await pagina.evaluate(() => scrollBy(0, 120))
        await pagina.screenshot({ path: join(process.env.PRINTS, 'suporte-celular.png') })
      }
    }
    await contexto.close()
  }
  console.log('Compra pela página de planos: ok (visitante, Pix com QR, Pix confirmado, Pix sem QR, cartão, volta com plano, preço antigo, celular)')
} finally {
  await navegador.close()
  servidor.close()
  await rm(pasta, { recursive: true, force: true })
}

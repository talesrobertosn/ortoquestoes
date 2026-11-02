// Ponta a ponta no navegador (Playwright): o Painel 3.0 do administrador (01/11/2026).
//
// Sobe o site com o Supabase falso de fixtures/painel_admin_falso.mjs (nenhuma RPC real, nenhum e-mail sai,
// nenhuma cobrança é tocada) e confere:
//  1. a casca nova: seis áreas na barra, trilha, "Atualizado às", sem a casca do site (cabeçalho e rodapé);
//  2. as 23 partes abrem sem erro de página, cada uma com o título certo e sem rolagem de lado no celular;
//  3. endereços antigos (?aba=hoje, receita, operacoes, configuracoes, relatos, avaliacoes) abrindo no lugar novo;
//  4. filtro e vista no endereço (Pessoas › Explorador, Qualidade do acervo) e Voltar do navegador;
//  5. a ficha da pessoa abre por cima da lista, com as abas, e fecha com Esc devolvendo o foco;
//  6. Ctrl K abre a busca global, acha parte e pessoa, e Enter navega;
//  7. ações com efeito pedem confirmação, e Cancelar não chama a RPC (reprocessar aviso, publicar aviso no topo);
//  8. "falha não vira zero": uma RPC que falha aparece como indisponível, não como 0;
//  9. celular (390 px): barra de baixo com as áreas e a faixa de partes;
// 10. tema escuro aplicado nos tokens do painel.
//
// Uso: node fixtures/e2e_painel_admin.mjs   (CHROMIUM=/caminho para outro navegador; CAPTURAS=pasta para as fotos)
import assert from 'node:assert/strict'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { iniciar, pedidos, rpcs } from './painel_admin_falso.mjs'

const capturas = process.env.CAPTURAS ?? await mkdtemp(join(tmpdir(), 'orto-admin-e2e-'))
await mkdir(capturas, { recursive: true })
const { erros, contexto, abrir, fechar } = await iniciar()
const PARTES = {
  comando: 'Estado do Orto Questões', agora: 'Atividade agora', pendencias: 'Pendências', usuarios: 'Explorador', crescimento: 'Aquisição e ativação', retencao: 'Retenção e ritmo', perfis: 'Perfis e origem',
  conteudo: 'Qualidade do acervo', questoes: 'Editor de questões', simulados: 'Simulados', opinioes: 'Opiniões dos flashcards',
  financeiro: 'Visão financeira', previsao: 'Previsão', assinaturas: 'Assinaturas', cobrancas: 'Cobranças', pagamentos: 'Avisos do processador',
  lembretes: 'Campanhas', cartas: 'Cartas pessoais', envios: 'Relatórios e envios', todas: 'Catálogo de cartas',
  ajustes: 'Acesso e pagamentos', aviso: 'Aviso no topo do site', exportar: 'Exportação',
}
const titulo = p => p.locator('h1.a3-titulo-1').first().innerText()
const chamadas = nome => pedidos.filter(x => x.rpc === nome).length
let passos = 0
const ok = (texto) => { passos++; console.log(`  ok ${passos}. ${texto}`) }

try {
  // ---------- 1. Casca ----------
  const pc = await contexto(1440, 900)
  await abrir(pc.p)
  assert.equal(await pc.p.locator('.a3-casca').count(), 1)
  assert.equal(await pc.p.locator('header.cabecalho, footer.rodape').count(), 0, 'o painel abre sem a casca do site')
  const areas = await pc.p.locator('.a3-nav-area').allInnerTexts()
  for (const area of ['Comando', 'Pessoas', 'Estudo e conteúdo', 'Receita', 'Comunicação', 'Configurações']) assert.ok(areas.join(' | ').includes(area), `área ${area} na barra: ${areas.join(' | ')}`)
  assert.match(await pc.p.locator('body').innerText(), /Atualizado às \d{2}:\d{2}/)
  ok('casca nova com seis áreas e sem cabeçalho do site')

  // ---------- 2. As 23 partes ----------
  for (const [parte, rotulo] of Object.entries(PARTES)) {
    await abrir(pc.p, parte === 'comando' ? '' : `?aba=${parte}`)
    await pc.p.waitForTimeout(400)
    assert.equal(await titulo(pc.p), rotulo, parte)
    assert.equal(await pc.p.getByText('Em reconstrução').count(), 0, `${parte} sem tela provisória`)
  }
  assert.deepEqual(erros, [], 'nenhum erro de página nas 23 partes')
  ok('23 partes abrem com o título certo e sem erro')

  // ---------- 3. Endereços antigos ----------
  const legado = { hoje: 'Atividade agora', geral: 'Estado do Orto Questões', receita: 'Visão financeira', operacoes: 'Campanhas', configuracoes: 'Acesso e pagamentos', relatos: 'Qualidade do acervo', avaliacoes: 'Qualidade do acervo', avisos: 'Avisos do processador', mensal: 'Relatórios e envios' }
  for (const [aba, rotulo] of Object.entries(legado)) {
    await abrir(pc.p, `?aba=${aba}`)
    assert.equal(await titulo(pc.p), rotulo, `?aba=${aba}`)
  }
  await abrir(pc.p, '?aba=relatos')
  assert.match(pc.p.url(), /aba=conteudo&vista=relatos/, 'endereço antigo reescrito no atual')
  assert.equal(await pc.p.locator('.a3-aba-grande[aria-selected="true"]').first().innerText().then(t => t.includes('Relatos')), true)
  ok('endereços antigos abrem no lugar novo')

  // ---------- 4. Estado no endereço e Voltar ----------
  await abrir(pc.p, '?aba=usuarios')
  await pc.p.locator('.a3-filtro', { hasText: 'Recém-cadastradas' }).first().click()
  await pc.p.waitForTimeout(300)
  assert.match(pc.p.url(), /aba=usuarios&filtro=novos/)
  // Ir direto a uma parte (pela busca): clicar numa área abre a última parte vista nela, o que também é uma entrada.
  await pc.p.keyboard.press('Control+k'); await pc.p.keyboard.type('Visão financeira'); await pc.p.waitForTimeout(200); await pc.p.keyboard.press('Enter')
  await pc.p.waitForTimeout(500)
  assert.equal(await titulo(pc.p), 'Visão financeira')
  await pc.p.goBack(); await pc.p.waitForTimeout(600)
  assert.equal(await titulo(pc.p), 'Explorador', 'Voltar do navegador volta à parte anterior')
  assert.match(pc.p.url(), /filtro=novos/, 'e com o filtro')
  ok('filtro no endereço e Voltar do navegador')

  // ---------- 5. Ficha da pessoa ----------
  await pc.p.locator('.a3-tabela tbody tr').first().click()
  const gaveta = pc.p.locator('.a3-gaveta[role="dialog"]')
  await gaveta.waitFor({ timeout: 10_000 })
  for (const aba of ['Resumo', 'Atividade', 'Assinatura', 'Carta', 'Ações']) assert.ok(await gaveta.getByRole('tab', { name: aba }).count() || await gaveta.getByText(aba, { exact: true }).count(), `aba ${aba} na ficha`)
  assert.match(pc.p.url(), /filtro=novos/, 'a lista continua por baixo')
  await pc.p.keyboard.press('Escape')
  await pc.p.waitForTimeout(300)
  assert.equal(await gaveta.count(), 0, 'Esc fecha a ficha')
  ok('ficha abre por cima da lista e fecha com Esc')

  // ---------- 6. Busca global (Ctrl K) ----------
  await pc.p.keyboard.press('Control+k')
  const paleta = pc.p.locator('.a3-paleta')
  await paleta.waitFor({ timeout: 5_000 })
  await pc.p.keyboard.type('cobran')
  await pc.p.waitForTimeout(300)
  assert.ok(await paleta.getByText('Cobranças').count(), `acha a parte: ${JSON.stringify(await paleta.innerText())}`)
  await pc.p.keyboard.press('Enter'); await pc.p.waitForTimeout(600)
  assert.equal(await titulo(pc.p), 'Cobranças', 'Enter navega')
  await pc.p.keyboard.press('Control+k')
  await pc.p.keyboard.type('Marina')
  await pc.p.waitForTimeout(400)
  assert.ok(await pc.p.locator('.a3-paleta').getByText('Marina Duarte').count(), 'acha a pessoa pelo nome')
  await pc.p.keyboard.press('Escape')
  ok('Ctrl K acha parte e pessoa, e Enter navega')

  // ---------- 7. Ações com efeito pedem confirmação ----------
  await abrir(pc.p, '?aba=pagamentos')
  const efeitos = () => pedidos.filter(x => x.rpc.startsWith('fn:') || /reprocess/.test(x.rpc)).length
  const antes = efeitos()
  await pc.p.getByRole('button', { name: 'Reprocessar' }).first().click()
  const dialogo = pc.p.locator('.a3-dialogo[role="alertdialog"]')
  await dialogo.waitFor({ timeout: 5_000 })
  assert.match(await dialogo.innerText(), /Nada é cobrado nem reembolsado/)
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()
  await pc.p.waitForTimeout(400)
  assert.equal(efeitos(), antes, 'Cancelar não reprocessa')
  await abrir(pc.p, '?aba=aviso')
  await pc.p.locator('textarea').first().fill('Simulado de novembro aberto.')
  await pc.p.getByRole('button', { name: /Revisar e publicar/ }).click()
  await dialogo.waitFor({ timeout: 5_000 })
  await pc.p.keyboard.press('Escape')
  await pc.p.waitForTimeout(300)
  assert.equal(chamadas('salvar_aviso_admin'), 0, 'Esc na confirmação não publica o aviso')
  assert.ok(await pc.p.locator('.a3-faixinha', { hasText: 'Simulado de novembro aberto.' }).count(), 'a prévia mostra o texto enquanto escreve')
  ok('reprocessar e publicar pedem confirmação; cancelar não chama a RPC')

  // ---------- 8. Falha não vira zero ----------
  const original = rpcs.listar_assinaturas_admin
  rpcs.listar_assinaturas_admin = () => { throw new Error('falha de teste') }
  const pc2 = await contexto(1440, 900)
  await abrir(pc2.p, '?aba=assinaturas')
  await pc2.p.getByText(/não carregou|não carregaram/).first().waitFor({ timeout: 20_000 }).catch(() => undefined)
  const texto = await pc2.p.locator('.a3-principal').innerText()
  assert.ok(/não carregaram|não carregou|Indisponível|indisponível|Acesso negado/.test(texto), `falha aparece como falha: ${texto.slice(0, 300)}`)
  rpcs.listar_assinaturas_admin = original
  await pc2.c.close()
  ok('consulta que falha aparece como indisponível, não como zero')

  // ---------- 9. Celular ----------
  const cel = await contexto(390, 844, true)
  for (const parte of ['', '?aba=agora', '?aba=usuarios', '?aba=financeiro', '?aba=conteudo', '?aba=lembretes', '?aba=cobrancas']) {
    await abrir(cel.p, parte)
    const largura = await cel.p.evaluate(() => document.documentElement.scrollWidth)
    assert.ok(largura <= 390, `${parte || 'comando'} sem rolagem de lado no celular (${largura})`)
  }
  assert.ok(await cel.p.locator('.a3-movel-barra').isVisible(), 'barra de baixo no celular')
  assert.ok(await cel.p.locator('.a3-movel-partes').isVisible(), 'faixa de partes no celular')
  await cel.p.screenshot({ path: join(capturas, 'e2e-celular.png') })
  ok('celular: barra de baixo, faixa de partes e nenhuma rolagem de lado')

  // ---------- 10. Escuro ----------
  await pc.p.evaluate(() => { document.documentElement.dataset.tema = 'escuro' })
  await pc.p.waitForTimeout(200)
  const fundo = await pc.p.evaluate(() => getComputedStyle(document.querySelector('.a3-painel')).backgroundColor)
  assert.notEqual(fundo, 'rgb(255, 255, 255)', 'o papel escurece no tema escuro')
  await pc.p.screenshot({ path: join(capturas, 'e2e-escuro.png') })
  ok('tema escuro nos tokens do painel')

  assert.deepEqual(erros.filter(e => !/falha de teste/.test(e)), [], 'nenhum erro de página')
  console.log(`Painel 3.0 ponta a ponta: ${passos} verificações ok. Capturas em ${capturas}`)
} finally {
  await fechar()
}

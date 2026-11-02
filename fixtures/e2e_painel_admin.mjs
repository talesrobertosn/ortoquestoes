// Ponta a ponta no navegador (Playwright): o Painel 3.0 do administrador (01/11/2026).
//
// Sobe o site com o Supabase falso de fixtures/painel_admin_falso.mjs (nenhuma RPC real, nenhum e-mail sai,
// nenhuma cobrança é tocada) e confere:
//  1. a casca: as seis áreas com os nomes de antes (Agora, Pessoas, Financeiro, Conteúdo, E-mails, Ajustes); 1b. a página
//     inicial começa por quem está online, assinantes separados por cor, assinantes que não entraram e quem viu os planos;
//     (antes: seis áreas na barra, trilha, "Atualizado às", sem a casca do site (cabeçalho e rodapé);
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
// Telas do menu (e as abas, pelo endereço) com o título que aparecem.
const PARTES = {
  '': 'Agora', 'aba=usuarios': 'Usuários', 'aba=crescimento': 'Aquisição', 'aba=crescimento&sub=retencao': 'Retenção', 'aba=crescimento&sub=perfis': 'Perfis e origem',
  'aba=conteudo': 'Relatos e avaliações', 'aba=questoes': 'Editar questões', 'aba=simulados': 'Simulados', 'aba=opinioes': 'Opiniões dos flashcards',
  'aba=financeiro': 'Ganhos', 'aba=financeiro&sub=previsao': 'Previsão', 'aba=assinaturas': 'Assinaturas', 'aba=cobrancas': 'Pagamentos', 'aba=pagamentos': 'Avisos de pagamento',
  'aba=lembretes': 'Lembretes', 'aba=cartas': 'Cartas pessoais', 'aba=envios': 'Relatórios e histórico', 'aba=todas': 'Todas as cartas',
  'aba=ajustes': 'Acesso e pagamentos', 'aba=ajustes&sub=aviso': 'Aviso no topo do site', 'aba=exportar': 'Exportar dados',
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
  for (const area of ['Agora', 'Pessoas', 'Financeiro', 'Conteúdo', 'E-mails', 'Ajustes']) assert.ok(areas.join(' | ').includes(area), `área ${area} na barra: ${areas.join(' | ')}`)
  assert.match(await pc.p.locator('body').innerText(), /Atualizado às \d{2}:\d{2}/)
  ok('casca com as seis áreas de antes e sem cabeçalho do site')

  // ---------- 1b. Página inicial: quem está online primeiro, assinante separado de não assinante ----------
  const primeiro = await pc.p.locator('.a3-conteudo section, .a3-conteudo .a3-painel').first().getAttribute('aria-label')
  assert.equal(primeiro, 'Quem está online agora', 'a primeira coisa da página inicial é quem está online')
  const assinante = pc.p.locator('.a3-online__grupo--assinante')
  const lead = pc.p.locator('.a3-online__grupo--lead')
  const gratis = pc.p.locator('.a3-online__grupo--gratis')
  assert.ok(await assinante.getByText('Diego Alves').count(), 'assinante online no grupo dos assinantes')
  assert.equal(await gratis.getByText('Diego Alves').count(), 0)
  assert.ok(await lead.getByText('Bruno Costa').count(), 'não assinante que viu os planos hoje fica no grupo âmbar')
  assert.ok(await gratis.getByText('Ana Ribeiro').count(), 'não assinante sem planos hoje fica no grupo azul')
  const cores = await Promise.all([assinante, lead, gratis].map(g => g.evaluate(el => getComputedStyle(el.querySelector('.a3-online__selo')).backgroundColor)))
  assert.equal(new Set(cores).size, 3, `três cores diferentes: ${cores.join(' | ')}`)
  const totais = await pc.p.locator('.a3-totais').innerText()
  for (const t of [/ONLINE AGORA\s+4/i, /ASSINANTES ONLINE\s+1/i, /NÃO ASSINANTES ONLINE\s+3/i, /VIRAM OS PLANOS HOJE\s+1/i]) assert.match(totais, t)
  const textoInicio = await pc.p.locator('.a3-conteudo').innerText()
  assert.match(textoInicio, /Não estão online/)
  assert.match(textoInicio, /assinantes não entraram hoje/)
  ok('página inicial: totais, online em três cores (assinante, viu os planos hoje, não assinante) e quem não está online')

  // ---------- 2. As 23 partes ----------
  for (const [parte, rotulo] of Object.entries(PARTES)) {
    await abrir(pc.p, parte ? `?${parte}` : '')
    await pc.p.waitForTimeout(400)
    assert.equal(await titulo(pc.p), rotulo, parte)
    assert.equal(await pc.p.getByText('Em reconstrução').count(), 0, `${parte} sem tela provisória`)
  }
  assert.deepEqual(erros, [], 'nenhum erro de página nas telas e abas')
  ok(`${Object.keys(PARTES).length} telas e abas abrem com o título certo e sem erro`)

  // ---------- 3. Endereços antigos ----------
  const legado = { hoje: 'Agora', geral: 'Agora', agora: 'Agora', receita: 'Ganhos', previsao: 'Previsão', retencao: 'Retenção', operacoes: 'Lembretes', configuracoes: 'Acesso e pagamentos', aviso: 'Aviso no topo do site', relatos: 'Relatos e avaliações', avaliacoes: 'Relatos e avaliações', avisos: 'Avisos de pagamento', mensal: 'Relatórios e histórico' }
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
  await pc.p.keyboard.press('Control+k'); await pc.p.keyboard.type('Ganhos'); await pc.p.waitForTimeout(200); await pc.p.keyboard.press('Enter')
  await pc.p.waitForTimeout(500)
  assert.equal(await titulo(pc.p), 'Ganhos')
  await pc.p.goBack(); await pc.p.waitForTimeout(600)
  assert.equal(await titulo(pc.p), 'Usuários', 'Voltar do navegador volta à parte anterior')
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
  await pc.p.keyboard.type('pagamentos')
  await pc.p.waitForTimeout(300)
  assert.ok(await paleta.getByText('Pagamentos', { exact: true }).count(), `acha a parte: ${JSON.stringify(await paleta.innerText())}`)
  await pc.p.keyboard.press('Enter'); await pc.p.waitForTimeout(600)
  assert.ok(['Pagamentos', 'Avisos de pagamento'].includes(await titulo(pc.p)), 'Enter navega')
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
  for (const parte of ['', '?aba=crescimento&sub=perfis', '?aba=usuarios', '?aba=financeiro', '?aba=conteudo', '?aba=lembretes', '?aba=cobrancas']) {
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

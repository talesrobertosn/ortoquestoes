import { chromium } from 'playwright'

const BASE = 'http://localhost:4173/ortoquestoes/'
const erros = []
const falhas = []
function checar(condicao, nome, detalhe = '') {
  if (condicao) console.log(`  ok   ${nome}`)
  else { console.log(`  FALHA ${nome} ${detalhe}`); falhas.push(nome) }
}

const navegador = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
)
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
const pagina = await contexto.newPage()
pagina.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()) })
pagina.on('pageerror', (e) => erros.push('pageerror: ' + e.message))

const indice = await (await fetch(BASE + 'acervo/indice.json')).json()
console.log(`   acervo: ${indice.total} questões em ${indice.temas.length} tema(s)`)

console.log('\n1. Página inicial')
await pagina.goto(BASE, { waitUntil: 'networkidle' })
await pagina.waitForSelector('.heroi__linha')
const total = await pagina.locator('.heroi__linha strong').first().innerText()
checar(total === String(indice.total), 'total do acervo bate com o índice', `(veio "${total}")`)
checar(
  await pagina.locator(`text=${indice.temas[0].nome}`).count() > 0,
  'distribuição por tema',
)

console.log('\n2. Montagem de sessão')
await pagina.click('text=Começar a responder')
await pagina.waitForSelector('.seletor')
const naoAnuladas = indice.questoes.filter((q) => q.an !== 1).length
const textoBotao = await pagina.locator('button:has-text("Responder")').last().innerText()
checar(
  textoBotao.includes(String(naoAnuladas)),
  'contador dentro do botão exclui as anuladas',
  `(veio "${textoBotao}", esperado ${naoAnuladas})`,
)
await pagina.click('button.opcao-segmento:has-text("10")')
const textoBotao2 = await pagina.locator('button:has-text("Responder")').last().innerText()
checar(/10/.test(textoBotao2), 'limite de 10 reflete no botão', `(veio "${textoBotao2}")`)
checar(pagina.url().includes('limite=10'), 'filtros vão para a URL', pagina.url())

console.log('\n3. Filtro por assunto')
// Em tela larga a árvore já vem aberta na página; em tela estreita, atrás do menu.
if (await pagina.locator('.seletor__gatilho').count() > 0) {
  await pagina.click('.seletor__gatilho')
}
checar(await pagina.locator('.seletor__painel').count() === 1, 'árvore de assuntos visível')
const termo = indice.subtemas[0].split(' ')[0].slice(0, 6)
await pagina.fill('input[type="search"]', termo)
const achou = await pagina.locator('.arvore__linha').count()
checar(achou > 0, 'busca dentro do seletor encontra assunto', `termo "${termo}"`)
await pagina.fill('input[type="search"]', '')
await pagina.locator('.arvore__abrir').first().click()
await pagina.waitForTimeout(200)
const caixas = pagina.locator('.seletor__painel .arvore__linha--filho input')
if (await caixas.count() >= 2) {
  await caixas.nth(0).check()
  await pagina.waitForTimeout(150)
  await caixas.nth(1).check()
  await pagina.waitForTimeout(150)
  checar(
    await pagina.locator('.seletor__painel').count() === 1,
    'seletor continua aberto ao marcar várias caixas',
  )
  checar(
    (await caixas.nth(0).isChecked()) && (await caixas.nth(1).isChecked()),
    'as duas marcações permanecem',
  )
  await pagina.click('.seletor__rodape button:has-text("Limpar")')
}

console.log('\n4. Responder dez questões pelo teclado')
await pagina.locator('button:has-text("Responder")').last().click()
await pagina.waitForSelector('.alternativa')
for (let i = 0; i < 10; i++) {
  await pagina.waitForSelector('.alternativa:not([disabled])', { timeout: 5000 }).catch(() => {})
  await pagina.keyboard.press('1')
  await pagina.keyboard.press('Enter')
  await pagina.waitForSelector('.resultado', { timeout: 5000 })
  if (i === 0) {
    const marca = await pagina.locator('.alternativa__marca').first().innerText()
    checar(/Gabarito|resposta/.test(marca), 'gabarito marcado com rótulo textual', marca)
  }
  if (i < 9) { await pagina.keyboard.press('Enter'); await pagina.waitForTimeout(120) }
}
const progresso = await pagina.locator('.barra-sessao__texto').innerText()
checar(progresso.startsWith('10 de 10'), 'progresso conta as dez', progresso)

console.log('\n5. Mapa de questões pelo atalho')
await pagina.keyboard.press('m')
await pagina.waitForSelector('.painel')
const celulas = await pagina.locator('.mapa__item').count()
checar(celulas === 10, 'mapa com as dez questões', String(celulas))
checar(await pagina.locator('.mapa__item--certa, .mapa__item--errada').count() === 10, 'estados no mapa')
await pagina.keyboard.press('Escape')

console.log('\n6. Resumo')
await pagina.click('text=Encerrar e ver resumo')
await pagina.waitForSelector('h1:has-text("Resumo")')
const acerto = await pagina.locator('.numeros__valor').first().innerText()
checar(/%/.test(acerto), 'percentual de acerto', acerto)
checar(await pagina.locator('text=Refazer só as').count() === 1, 'refazer só as erradas')
checar(await pagina.locator('text=Por tema').count() === 1, 'desempenho por tema')

console.log('\n7. Link direto de questão')
const idExemplo = indice.questoes[3].id
await pagina.goto(BASE + `#/questao/${idExemplo}`, { waitUntil: 'networkidle' })
await pagina.waitForSelector('.alternativa')
checar(
  await pagina.locator(`text=${idExemplo}`).count() > 0,
  'questão carrega por link direto',
  idExemplo,
)
await pagina.goto(BASE + '#/questao/nao-existe-0001', { waitUntil: 'networkidle' })
checar(await pagina.locator('text=Questão não encontrada').count() === 1, 'id inexistente dá estado claro')

console.log('\n7b. Comentário da comunidade')
await pagina.goto(BASE + `#/questao/${idExemplo}`, { waitUntil: 'networkidle' })
await pagina.waitForSelector('.alternativa')
await pagina.keyboard.press('1')
await pagina.keyboard.press('Enter')
await pagina.waitForSelector('.resultado')
await pagina.click('button:has-text("Comentar esta questão")')
await pagina.waitForSelector('.painel')
checar(await pagina.locator('textarea').count() === 1, 'formulário de comentário abre')
const botaoEnvio = pagina.locator('.painel button:has-text("Escreva o comentário")')
checar(await botaoEnvio.isDisabled(), 'envio bloqueado sem texto e sem assinatura')
await pagina.fill('textarea', 'A alternativa correta se justifica pelo mecanismo descrito em Tachdjian.')
await pagina.fill('.painel fieldset input >> nth=0', 'Dra. Exemplo')
checar(
  await pagina.locator('.painel button:has-text("Abrir o e-mail já preenchido")').isEnabled(),
  'envio libera com comentário e assinatura',
)
await pagina.keyboard.press('Escape')

console.log('\n7c. Desempenho por tema')
await pagina.goto(BASE + '#/dados', { waitUntil: 'networkidle' })
await pagina.waitForSelector('h1:has-text("Seu desempenho")')
checar(await pagina.locator('h2:has-text("Por tema")').count() === 1, 'seção de desempenho por tema')
checar(
  await pagina.locator('.distribuicao__item').count() > 0,
  'temas respondidos aparecem no desempenho',
)

console.log('\n8. Largura de 320 pixels')
await pagina.setViewportSize({ width: 320, height: 720 })
await pagina.goto(BASE, { waitUntil: 'networkidle' })
let excesso = await pagina.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
checar(excesso <= 0, 'início sem rolagem horizontal em 320px', `excesso ${excesso}px`)
await pagina.goto(BASE + '#/treinar', { waitUntil: 'networkidle' })
excesso = await pagina.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
checar(excesso <= 0, 'montagem sem rolagem horizontal em 320px', `excesso ${excesso}px`)
const cortado = await pagina.evaluate(() => {
  const alvos = [...document.querySelectorAll('.botao, .campo__rotulo, .seletor__gatilho, h1')]
  return alvos.filter((e) => e.scrollWidth > e.clientWidth + 2).map((e) => e.className + ':' + e.textContent.slice(0, 30))
})
checar(cortado.length === 0, 'nenhum texto cortado em 320px', JSON.stringify(cortado))

console.log('\n9. Tema escuro')
await pagina.setViewportSize({ width: 1280, height: 900 })
await pagina.emulateMedia({ colorScheme: 'dark' })
await pagina.goto(BASE, { waitUntil: 'networkidle' })
const fundoEscuro = await pagina.evaluate(() => getComputedStyle(document.body).backgroundColor)
checar(fundoEscuro === 'rgb(15, 20, 19)', 'tema escuro aplicado', fundoEscuro)
await pagina.emulateMedia({ colorScheme: 'light' })

console.log('\n10. Sem localStorage')
const contextoSemArmazenamento = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
await contextoSemArmazenamento.addInitScript(() => {
  Object.defineProperty(window, 'localStorage', {
    get() { throw new DOMException('bloqueado') },
  })
})
const pagina2 = await contextoSemArmazenamento.newPage()
const erros2 = []
pagina2.on('pageerror', (e) => erros2.push(e.message))
await pagina2.goto(BASE + '#/treinar', { waitUntil: 'networkidle' })
await pagina2.locator('button:has-text("Responder")').last().click()
await pagina2.waitForSelector('.alternativa')
await pagina2.keyboard.press('1')
await pagina2.keyboard.press('Enter')
await pagina2.waitForSelector('.resultado')
checar(erros2.length === 0, 'site funciona com localStorage bloqueado', erros2.join(' | '))

console.log('\n11. Console limpo')
checar(erros.length === 0, 'nenhum erro no console', erros.slice(0, 3).join(' | '))

await navegador.close()
console.log(`\n${falhas.length === 0 ? 'TUDO PASSOU' : falhas.length + ' FALHA(S): ' + falhas.join(', ')}`)
process.exit(falhas.length === 0 ? 0 : 1)

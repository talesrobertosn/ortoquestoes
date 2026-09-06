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
await pagina.click('text=Montar uma sessão com filtros')
await pagina.waitForSelector('.seletor')
const naoAnuladas = indice.questoes.filter((q) => q.an !== 1).length
const textoBotao = await pagina.locator('button:has-text("Responder")').last().innerText()
checar(
  textoBotao.includes(String(naoAnuladas)),
  'contador dentro do botão exclui as anuladas',
  `(veio "${textoBotao}", esperado ${naoAnuladas})`,
)
await pagina.click('#filtro-limite button.opcao-segmento:has-text("10")')
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
await pagina.fill('.seletor__painel input[type="search"]', termo)
const achou = await pagina.locator('.arvore__linha').count()
checar(achou > 0, 'busca dentro do seletor encontra assunto', `termo "${termo}"`)
await pagina.fill('.seletor__painel input[type="search"]', '')
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

console.log('\n3b. Treino rápido')
await pagina.goto(BASE, { waitUntil: 'networkidle' })
await pagina.waitForSelector('.treino-rapido')
await pagina.click('.treino-rapido button:has-text("15")')
await pagina.waitForSelector('.alternativa')
const totalRapido = await pagina.locator('.barra-sessao__texto').innerText()
checar(totalRapido.endsWith('de 15'), 'treino rápido monta 15 questões', totalRapido)
checar(
  (await pagina.locator('.cronometro').count()) === 0,
  'treino rápido não tem cronômetro',
)

console.log('\n3c. Simulado com tempo')
await pagina.goto(BASE + '#/treinar', { waitUntil: 'networkidle' })
await pagina.waitForSelector('.seletor')
await pagina.locator('.interruptor__trilho').click()
await pagina.click('#filtro-duracao .opcao-segmento:has-text("1 hora")')
await pagina.click('#filtro-limite button.opcao-segmento:has-text("10")')
await pagina.click('button:has-text("Iniciar simulado")')
await pagina.waitForSelector('.alternativa')
const relogio = await pagina.locator('.cronometro').innerText()
checar(/^0?59:\d\d$|^1:00:00$|^59:\d\d$/.test(relogio), 'cronômetro conta de 1 hora', relogio)
await pagina.keyboard.press('1')
await pagina.waitForTimeout(200)
checar(
  (await pagina.locator('.resultado--acerto, .resultado--erro').count()) === 0,
  'simulado não revela o gabarito ao marcar',
)
checar(
  (await pagina.locator('.alternativa--certa, .alternativa--errada').count()) === 0,
  'simulado não marca a alternativa correta',
)
checar(
  (await pagina.locator('.alternativa--escolhida').count()) === 1,
  'a alternativa marcada fica destacada',
)
checar(
  (await pagina.locator('button:has-text("Comentar esta questão")').count()) === 0,
  'formulário de comentário fica fora do simulado (o e-mail traz o gabarito)',
)
await pagina.keyboard.press('2')
await pagina.waitForTimeout(200)
checar(
  await pagina.locator('.alternativa').nth(1).evaluate((e) => e.className.includes('escolhida')),
  'dá para trocar a resposta durante o simulado',
)
await pagina.click('button:has-text("Entregar o simulado")')
await pagina.waitForSelector('h1:has-text("Resultado do simulado")')
checar(true, 'entregar leva ao resultado do simulado')

console.log('\n4. Responder dez questões pelo teclado')
// Os testes de treino rápido e simulado saíram da tela de montagem: volta e
// monta de novo, agora no modo comum.
await pagina.goto(BASE + '#/treinar', { waitUntil: 'networkidle' })
await pagina.waitForSelector('.seletor')
await pagina.click('#filtro-limite button.opcao-segmento:has-text("10")')
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
checar(
  await pagina.locator('.painel button:has-text("Escreva o comentário")').isDisabled(),
  'envio bloqueado sem texto e sem assinatura',
)

// Regressão: o painel roubava o foco a cada tecla e o cursor pulava fora
// da caixa depois da primeira letra.
const frase = 'A alternativa correta se justifica pelo mecanismo descrito'
await pagina.locator('textarea').click()
await pagina.keyboard.type(frase, { delay: 12 })
checar(
  (await pagina.locator('textarea').inputValue()) === frase,
  'digitar no comentário não perde o foco',
  `(ficou "${(await pagina.locator('textarea').inputValue()).slice(0, 30)}…")`,
)
const nome = 'Dra. Exemplo de Teste'
await pagina.locator('.painel fieldset input').first().click()
await pagina.keyboard.type(nome, { delay: 12 })
checar(
  (await pagina.locator('.painel fieldset input').first().inputValue()) === nome,
  'digitar a assinatura não perde o foco',
)
checar(
  await pagina.locator('.painel button:has-text("Copiar o comentário")').isEnabled(),
  'envio libera com comentário e assinatura',
)
checar(
  (await pagina.locator('.painel a:has-text("Abrir no Gmail")').count()) === 1,
  'oferece o Gmail, que não depende de programa de e-mail instalado',
)
await pagina.keyboard.press('Escape')

console.log('\n7b2. Relatar erro')
await pagina.goto(BASE + '#/contato?questao=' + idExemplo, { waitUntil: 'networkidle' })
await pagina.waitForSelector('h1:has-text("Relatar erro")')
checar(
  (await pagina.locator('button:has-text("Copiar o relato")').count()) === 1,
  'relatar erro tem ação que não depende de programa de e-mail',
)
checar(
  (await pagina.locator('a:has-text("Abrir no Gmail")').count()) === 1,
  'relatar erro oferece o Gmail',
)
const linkMailto = await pagina
  .locator('a:has-text("Abrir no meu programa de e-mail")')
  .getAttribute('href')
checar(
  (linkMailto ?? '').startsWith('mailto:') && (linkMailto ?? '').includes(idExemplo),
  'o mailto continua disponível e leva o identificador da questão',
)

console.log('\n7c. Desempenho por tema')
await pagina.goto(BASE + '#/dados', { waitUntil: 'networkidle' })
await pagina.waitForSelector('h1:has-text("Seu desempenho")')
checar(await pagina.locator('h2:has-text("Por tema")').count() === 1, 'seção de desempenho por tema')
checar(
  await pagina.locator('.distribuicao__item').count() > 0,
  'temas respondidos aparecem no desempenho',
)

console.log('\n7d. Favoritas têm para onde levar')
// Regressão: a estrela guardava a marcação e não havia tela nenhuma para ver
// o que foi marcado — favoritar não levava a lugar algum.
await pagina.goto(BASE + `#/questao/${idExemplo}`, { waitUntil: 'networkidle' })
await pagina.waitForSelector('.alternativa')
await pagina.click('button[aria-label="Favoritar questão"]')
await pagina.waitForTimeout(150)
await pagina.click('.rodape a:has-text("Favoritas")')
await pagina.waitForSelector('h1:has-text("Suas favoritas")')
checar(
  (await pagina.locator('.favorita').count()) === 1,
  'a questão favoritada aparece na lista',
)
checar(
  (await pagina.locator('.favorita__texto').first().getAttribute('href')) ?.includes(idExemplo) === true,
  'o item leva de volta para a questão',
)
await pagina.click('button:has-text("Treinar as")')
await pagina.waitForSelector('.alternativa')
const totalFavoritas = await pagina.locator('.barra-sessao__texto').innerText()
checar(totalFavoritas.endsWith('de 1'), 'treinar as favoritas monta a sessão só com elas', totalFavoritas)
await pagina.goto(BASE + '#/favoritas', { waitUntil: 'networkidle' })
await pagina.waitForSelector('.favorita')
await pagina.click('button[aria-label^="Remover"]')
await pagina.waitForTimeout(150)
checar(
  (await pagina.locator('text=Você ainda não favoritou').count()) === 1,
  'desfavoritar esvazia a lista e explica para que serve a estrela',
)

console.log('\n7e. Filtro por situação')
await pagina.goto(BASE + '#/treinar', { waitUntil: 'networkidle' })
await pagina.waitForSelector('#filtro-situacao')
const numero = async (rotulo) =>
  Number(await pagina.locator(`#filtro-situacao button:has-text("${rotulo}") .numerico`).innerText())
const [todas, naoResp, erradas, acertadas] = await Promise.all([
  numero('Todas'), numero('Não respondidas'), numero('Que eu errei'), numero('Que eu acertei'),
])
checar(todas === naoAnuladas, 'situação "todas" conta o acervo inteiro', `${todas} vs ${naoAnuladas}`)
checar(
  naoResp + erradas + acertadas === todas,
  'respondidas e não respondidas somam o acervo',
  `${naoResp}+${erradas}+${acertadas} != ${todas}`,
)
checar(
  erradas + acertadas >= 10,
  'as questões já respondidas nesta execução foram contadas',
  String(erradas + acertadas),
)
const situacaoComContagem = erradas > 0 ? 'Que eu errei' : 'Que eu acertei'
const esperado = erradas > 0 ? erradas : acertadas
await pagina.click(`#filtro-situacao button:has-text("${situacaoComContagem}")`)
await pagina.waitForTimeout(150)
const botaoSituacao = await pagina.locator('button:has-text("Responder")').last().innerText()
checar(
  botaoSituacao.includes(String(esperado)),
  `filtrar por "${situacaoComContagem}" leva ${esperado} questões ao botão`,
  botaoSituacao,
)
checar(pagina.url().includes('situacao='), 'a situação vai para a URL', pagina.url())

console.log('\n7f. Busca por texto')
await pagina.goto(BASE + '#/treinar', { waitUntil: 'networkidle' })
await pagina.waitForSelector('#busca-acervo')
const palavras = indice.questoes.length > 0 ? 'fratura' : ''
await pagina.fill('#busca-acervo', palavras)
await pagina.waitForTimeout(600)
const botaoBusca = await pagina.locator('button:has-text("Responder")').last().innerText()
const achadas = Number(
  (await pagina.locator('.botao__contador').last().innerText()).replace(/\D/g, ''),
)
checar(achadas > 0 && achadas < naoAnuladas, `busca por "${palavras}" estreita o acervo`, botaoBusca)
await pagina.fill('#busca-acervo', 'xilofone kryptonita')
await pagina.waitForTimeout(600)
checar(
  (await pagina.locator('text=Nenhuma questão contém').count()) === 1,
  'busca sem resultado explica o que aconteceu em vez de sumir com tudo',
)
await pagina.fill('#busca-acervo', '')
await pagina.waitForTimeout(200)

console.log('\n7g. Esconder as etiquetas de assunto')
// Etiquetas adiantam a resposta: ler o subtema antes do enunciado elimina
// metade das alternativas. Escondê-las é opcional; o padrão é mostrar.
await pagina.goto(BASE + `#/questao/${idExemplo}`, { waitUntil: 'networkidle' })
await pagina.waitForSelector('.alternativa')
const etiquetasAntes = await pagina.locator('.questao__topo .etiqueta').count()
checar(etiquetasAntes > 0, 'por padrão as etiquetas aparecem', String(etiquetasAntes))
await pagina.click('button[aria-label^="Esconder as etiquetas"]')
await pagina.waitForTimeout(150)
const etiquetasDepois = await pagina.locator('.questao__topo .etiqueta').count()
checar(etiquetasDepois < etiquetasAntes, 'esconder tira as etiquetas de assunto da questão')
checar(
  (await pagina.locator(`.questao__topo .etiqueta:has-text("${indice.temas[0].nome}")`).count()) === 0,
  'o tema deixa de aparecer',
)
// A preferência vale para as próximas questões, não só para esta.
await pagina.goto(BASE + `#/questao/${indice.questoes[7].id}`, { waitUntil: 'networkidle' })
await pagina.waitForSelector('.alternativa')
checar(
  (await pagina.locator('.questao__topo .etiqueta').count()) < etiquetasAntes,
  'a escolha vale para as outras questões e sobrevive à navegação',
)
// Respondida, a etiqueta volta: aí ela ensina em vez de entregar.
await pagina.keyboard.press('1')
await pagina.keyboard.press('Enter')
await pagina.waitForSelector('.resultado')
checar(
  (await pagina.locator('.questao__topo .etiqueta').count()) >= etiquetasAntes - 1,
  'depois de responder as etiquetas voltam',
)
// E a tecla E devolve o padrão.
await pagina.keyboard.press('e')
await pagina.waitForTimeout(150)
checar(
  (await pagina.locator('button[aria-label^="Esconder as etiquetas"]').count()) === 1,
  'a tecla E volta a mostrar sempre',
)

console.log('\n7h. Comentário da IA e comentário da comunidade')
// Os dois blocos são separados e nomeados de propósito: quem lê precisa saber
// de onde veio o texto para decidir quanto peso dar.
const comComentario = await (await fetch(BASE + 'acervo/comentarios/mao.json')).json()
const idComentado = Object.keys(comComentario)[0]
await pagina.goto(BASE + `#/questao/${idComentado}`, { waitUntil: 'networkidle' })
await pagina.waitForSelector('.alternativa')
checar(
  (await pagina.locator('.bloco-comentario').count()) === 0,
  'nenhum comentário aparece antes de responder',
)
await pagina.keyboard.press('1')
await pagina.keyboard.press('Enter')
await pagina.waitForSelector('.resultado')
await pagina.waitForSelector('.ia__item', { timeout: 5000 })
checar(
  (await pagina.locator('text=COMENTÁRIO DA INTELIGÊNCIA ARTIFICIAL').count()) === 1,
  'o comentário da IA tem seção própria e nomeada',
)
checar(
  (await pagina.locator('.aviso-ia').count()) === 1,
  'o aviso de que o texto não foi conferido aparece',
)
const alternativasComentadas = await pagina.locator('.ia__item').count()
const totalAlternativas = await pagina.locator('.alternativa').count()
checar(
  alternativasComentadas === totalAlternativas,
  'toda alternativa recebe explicação, a certa e as erradas',
  `${alternativasComentadas} de ${totalAlternativas}`,
)
checar(
  (await pagina.locator('.ia__item--certa .ia__letra').innerText()) ===
    (await pagina.locator('.alternativa--certa .alternativa__letra').innerText()),
  'a alternativa marcada como correta no comentário é a do gabarito',
)
checar(
  (await pagina.locator('text=COMENTÁRIOS DA COMUNIDADE').count()) === 1,
  'o comentário da comunidade tem seção própria',
)
checar(
  (await pagina.locator('.bloco-comentario button:has-text("Comentar esta questão")').count()) === 1,
  'dá para mandar o seu comentário de dentro da seção da comunidade',
)

// Questão cujo gabarito oficial parece errado: o aviso vem antes de tudo, e
// em destaque próprio, porque quem estuda precisa saber disso antes de ler a
// explicação — não depois de já ter decorado a resposta.
const comAlerta = Object.entries(comComentario).find(([, c]) => c.alerta)
if (comAlerta) {
  await pagina.goto(BASE + `#/questao/${comAlerta[0]}`, { waitUntil: 'networkidle' })
  await pagina.waitForSelector('.alternativa')
  await pagina.keyboard.press('1')
  await pagina.keyboard.press('Enter')
  await pagina.waitForSelector('.aviso-ia--gabarito', { timeout: 5000 })
  checar(true, 'gabarito duvidoso ganha aviso em destaque', comAlerta[0])
  const ordem = await pagina.evaluate(() => {
    const bloco = document.querySelector('.bloco-comentario:has(.aviso-ia--gabarito)')
    const filhos = [...bloco.children]
    return filhos.findIndex((e) => e.classList.contains('aviso-ia--gabarito'))
      < filhos.findIndex((e) => e.classList.contains('ia__item'))
  })
  checar(ordem, 'o aviso aparece antes das explicações das alternativas')
} else {
  checar(false, 'nenhum comentário com alerta de gabarito para testar')
}

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

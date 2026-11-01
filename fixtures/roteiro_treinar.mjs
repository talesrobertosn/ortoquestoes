// Conferência de comportamento do Treinar no navegador (01/11/2026), pelo roteiro do capturar_telas:
//   node scripts/capturar_telas.mjs /treinar treinar-funcional --com-dados --roteiro fixtures/roteiro_treinar.mjs --pasta DIR
// Cada passo usa a tela de verdade (acervo real, conta de exemplo com 420 respostas) e falha com uma mensagem clara.
// Grava fotos dos estados que interessam (vazio, filtro salvo, desfazer) como <prefixo>-<passo>-<cel|pc>.png.

export default async function treinar(p, foto, nome) {
  const falhas = []
  const checar = (ok, rotulo, extra = '') => { console.log(`${ok ? 'ok ' : 'FALHOU'} [${nome}] ${rotulo}${ok || !extra ? '' : ' → ' + extra}`); if (!ok) falhas.push(rotulo) }
  const cel = nome.startsWith('cel')
  const hash = () => p.evaluate(() => decodeURIComponent(location.hash))
  const abrir = async (consulta = '') => {
    await p.evaluate((c) => { location.hash = '#/treinar' + c }, consulta)
    await p.waitForSelector('.tn-rapido'); await p.waitForTimeout(500)
  }
  const botaoComecar = () => p.locator(cel ? '.tn-barra__comecar' : '.tn-resumo__comecar')
  await p.addStyleTag({ content: '.cracha-perfil { display: none !important; }' })

  // 1. Cabeçalho compacto e sem cena: nada de herói ilustrado no topo.
  await abrir()
  checar(await p.locator('.tn-cabeca h1').innerText() === 'Treinar', 'título Treinar no cabeçalho')
  checar(await p.locator('.tn .hd, .tn .jn-heroi, .tn canvas, .tn img').count() === 0, 'sem cena, sprite ou imagem no topo')
  const topoRapido = await p.locator('.tn-rapido__botao').evaluate((e) => e.getBoundingClientRect().top)
  checar(topoRapido < (cel ? 640 : 500), 'sessão rápida na primeira dobra', String(topoRapido))

  // 2. Atalhos: zero fica desabilitado; contagens batem com as pílulas de situação.
  for (const [atalho, pilula] of [['Revisar hoje', 'Revisar hoje'], ['Novas', 'Não respondidas'], ['Que errei', 'Que eu errei'], ['Favoritas', 'Favoritas']]) {
    const n = Number((await p.locator(`.tn-atalho:has-text("${atalho}") .tn-atalho__n`).innerText()).replace(/\D/g, ''))
    const desabilitado = await p.locator(`.tn-atalho:has-text("${atalho}")`).isDisabled()
    const contagem = Number(await p.locator(`#filtro-situacao button:has-text("${pilula}") .numerico`).innerText())
    checar(n === contagem, `atalho "${atalho}" conta o mesmo que a situação`, `${n} vs ${contagem}`)
    checar(desabilitado === (n === 0), `atalho "${atalho}" desabilitado só com zero`)
  }

  // 3. Situação vai para a URL e para o botão; a URL compartilhada volta igual.
  await p.click('#filtro-situacao button:has-text("Que eu errei")'); await p.waitForTimeout(300)
  const erradas = Number(await p.locator('#filtro-situacao button:has-text("Que eu errei") .numerico').innerText())
  checar((await hash()).includes('situacao=erradas'), 'situação vai para a URL', await hash())
  checar((await botaoComecar().innerText()).includes(String(Math.min(20, erradas))), 'botão de começar mostra a quantidade', (await botaoComecar().innerText()) + ' ' + (await hash()))
  await abrir('?situacao=acertadas&limite=10&anos=2019')
  checar(await p.locator('#filtro-situacao button:has-text("Que eu acertei")').getAttribute('aria-pressed') === 'true', 'link compartilhado aplica a situação')
  checar(await p.locator('.tn-mais').evaluate((e) => e.open), '"Mais filtros" abre sozinho com filtro avançado no link')
  checar((await p.locator('.tn-mais__ativas').innerText()).startsWith('1'), 'rótulo de "Mais filtros" conta 1 ativo')
  // O filtro do ano aparece uma vez no resumo, com o seu "tirar".
  await p.click(`${cel ? '.tn-resumo' : '.tn-resumo'} .tn-valem__tirar:has-text("2019")`); await p.waitForTimeout(300)
  checar(!(await hash()).includes('anos='), 'tirar o ano pelo resumo limpa só o ano', await hash())

  // 4. Quantidade personalizada respeita o total ao sair do campo.
  const entrada = p.locator(`${cel ? '.tn-resumo' : '.tn-resumo'} .tn-outra input`)
  await entrada.fill('7'); await entrada.press('Enter'); await p.waitForTimeout(300)
  checar((await hash()).includes('limite=7'), 'quantidade personalizada 7 vai para a URL', await hash())
  await entrada.fill('999999'); await entrada.press('Enter'); await p.waitForTimeout(300)
  const total = Number((await p.locator('.tn-resumo .tn-resumo__total small').innerText()).replace(/\D/g, ''))
  checar((await hash()).includes(`limite=${total}`), 'quantidade maior que o total vira o total', `${await hash()} / total ${total}`)

  // 5. Zero resultados: a sugestão traz questões de volta, sem prometer o que não existe.
  await abrir()
  await p.fill('#busca-acervo', 'xilofone kryptonita'); await p.waitForTimeout(900)
  checar(await p.locator('text=Nenhuma questão contém').count() === 1, 'busca sem resultado explica o que aconteceu')
  await p.locator('.tn-montagem .estado').scrollIntoViewIfNeeded(); await foto('vazio')
  await p.click('.tn-recuperar:has-text("Limpar a busca")'); await p.waitForTimeout(900)
  checar(await p.locator('.tn-montagem .estado').count() === 0, 'a sugestão do estado vazio devolve questões')

  // 6. Limpar tudo e Desfazer.
  await p.click('#filtro-situacao button:has-text("Favoritas")'); await p.waitForTimeout(300)
  const antes = await hash()
  if (cel) { await p.click('.tn-barra__resumo'); await p.waitForTimeout(500) }
  await p.click(`${cel ? '.tn-gaveta' : '.tn-resumo'} button:has-text("Limpar tudo")`); await p.waitForTimeout(300)
  checar(!(await hash()).includes('favoritas'), 'limpar volta ao padrão')
  await foto('desfazer')
  await p.click(`${cel ? '.tn-gaveta' : '.tn-resumo'} .tn-desfazer button`); await p.waitForTimeout(300)
  checar(await hash() === antes, 'desfazer devolve os filtros', `${await hash()} vs ${antes}`)

  // 7. Filtro salvo: criar, aplicar depois de mudar, renomear.
  await p.click(`${cel ? '.tn-gaveta' : '.tn-resumo'} button:has-text("Salvar filtro")`)
  await p.waitForSelector('.confirmar input'); await p.fill('.confirmar input', 'Só favoritas'); await p.click('.confirmar button:has-text("Salvar")'); await p.waitForTimeout(300)
  if (cel) { await p.keyboard.press('Escape'); await p.waitForTimeout(400) }
  checar(await p.locator('.tn-salvo:has-text("Só favoritas")').count() === 1, 'filtro salvo aparece no topo')
  await p.click('#filtro-situacao button:has-text("Todas")'); await p.waitForTimeout(300)
  await p.click('.tn-salvo__usar:has-text("Só favoritas")'); await p.waitForTimeout(300)
  checar((await hash()).includes('situacao=favoritas'), 'aplicar o filtro salvo refaz a URL', await hash())
  await foto('salvo')

  // 8. Sessão rápida: 10 questões, sem os filtros da montagem.
  await abrir('?situacao=favoritas')
  await p.click('.tn-rapido__botao')
  await p.waitForSelector('.alternativa', { timeout: 15000 }).catch(() => {})
  const sessao = await hash()
  checar(sessao.startsWith('#/sessao'), 'sessão rápida abre a sessão', sessao)
  const barra = await p.locator('.barra-sessao__texto').innerText().catch(() => '')
  checar(/de 10\b/.test(barra), 'sessão rápida monta 10 questões', barra)

  if (falhas.length) throw new Error(`Treinar: ${falhas.length} falha(s): ${falhas.join('; ')}`)
}

// Vite DEV com VITE_SUPABASE_URL=sem. Só dados sintéticos em contextos isolados.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const BASE = process.env.BASE ?? 'http://127.0.0.1:5203/'
const SAIDA = process.env.SAIDA ?? '/tmp/capturas-calendarios-16-10'
await mkdir(SAIDA, { recursive: true })
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/usr/bin/chromium', args: ['--no-sandbox'] })
const erros = []
async function pagina(width, height, time, timezoneId = 'America/Sao_Paulo') {
  const ctx = await nav.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId, reducedMotion: 'reduce' })
  await ctx.addInitScript(() => {
    localStorage.setItem('oq-cookies', JSON.stringify({ escolha: 'recusado', versao: 1 }))
    localStorage.setItem('oq:eventos:ligados:v1', '0')
  })
  const p = await ctx.newPage()
  await p.clock.install({ time: new Date(time) })
  p.on('pageerror', e => erros.push(e.stack ?? String(e)))
  return p
}
async function calendario(p, prova = '2027-01-10') {
  // Desde 16/10/2026 o calendário fica sempre aberto na página (embutido, sem janela).
  await p.goto(`${BASE}#/cronograma?demo=1&pendente&demoProva=${prova}`)
  await p.locator('.cc--embutido .cc-janela').waitFor()
  await p.evaluate(async () => (await import('/src/estado/armazenamento.ts')).gravar('cronograma:tour-v2', true))
  await p.locator('.cc--embutido').scrollIntoViewIfNeeded()
  // Desde 19/10/2026 o calendário abre na semana; o mês inteiro abre pelo botão dourado, na própria página.
  assert.equal(await p.locator('.ccs-dia > button[aria-current="date"]').count(), 1, 'a semana mostra hoje')
  await p.getByRole('button', { name: 'Ver o mês inteiro', exact: true }).click()
  await p.locator('.cc-mes-grade').waitFor()
  assert.equal(await p.evaluate(() => document.activeElement?.id), 'cc-titulo', 'o foco vai para o título do mês')
}
try {
  for (const [nome, w, h] of [['computador',1400,860],['celular',390,844]]) {
    const p = await pagina(w,h,'2026-10-16T15:00:00Z')
    await calendario(p)
    assert.equal(await p.locator('.cc-dia > button[aria-current="date"]').count(), 1)
    assert.match(await p.locator('.cc-detalhe__data').innerText(), /16 de outubro/i)
    await p.getByRole('button', { name: 'Próximo mês', exact: true }).click()
    assert.match(await p.locator('.cc-detalhe__data').innerText(), /16 de novembro/i)
    assert.equal(await p.locator('.cc-dia--selecionado').count(), 1, 'seleção deve estar no mês visível')
    await p.getByRole('button', { name: 'Hoje', exact: true }).click()
    await p.screenshot({ path: `${SAIDA}/${nome}-mes-atual.png` })
    // Embutido: não prende o foco, não trava a rolagem da página e não tem botão de fechar.
    assert.equal(await p.locator('.cc--embutido .cc-fechar').count(), 0)
    assert.notEqual(await p.evaluate(() => document.body.style.overflow), 'hidden')
    // A aba atravessa a virada do dia: hoje e seleção acompanham sem recarregar.
    await p.clock.fastForward(36 * 60 * 60_000)
    await p.waitForTimeout(100)
    assert.equal(await p.locator('.cc-dia > button[aria-current="date"]').count(), 1)
    assert.match(await p.locator('.cc-detalhe__data').innerText(), /18 de outubro/i)
    assert.ok(await p.evaluate(() => document.querySelector('.cc-janela').scrollWidth <= innerWidth))
    await p.keyboard.press('Escape')
    assert.equal(await p.locator('.cc--embutido .cc-janela').count(), 1, 'Esc não some com o calendário embutido')
    await p.context().close()
  }
  // Reta final/folga/prova mantêm "hoje"; em fuso com horário de verão a prova não muda de dia.
  const reta = await pagina(390,844,'2026-10-25T15:00:00Z','America/Los_Angeles')
  await calendario(reta,'2026-11-02')
  assert.equal(await reta.locator('.cc-dia > button[aria-current="date"]').count(),1)
  assert.ok(await reta.locator('.cc-dia--feito,.cc-dia--parcial').count() > 0, 'histórico da reta final permanece visível')
  await reta.getByRole('button',{name:'Próximo mês',exact:true}).click()
  assert.equal(await reta.locator('.cc-dia--prova button').count(),1)
  await reta.locator('.cc-dia--prova button').click()
  assert.match(await reta.locator('.cc-detalhe__data').innerText(),/2 de novembro/i)
  await reta.screenshot({path:`${SAIDA}/celular-prova-fuso.png`})
  // O mesmo plano, agora encerrado: ainda permite abrir o histórico e o mês da prova.
  await reta.clock.fastForward(120 * 86_400_000)
  await reta.waitForTimeout(100)
  await reta.getByRole('button',{name:'Dia da prova',exact:true}).click()
  assert.match(await reta.locator('#cc-titulo').innerText(),/Novembro.*2026/s)
  assert.match(await reta.locator('.cc-detalhe__data').innerText(),/2 de novembro/i)
  await reta.screenshot({path:`${SAIDA}/celular-plano-encerrado.png`})
  await reta.context().close()

  const f = await pagina(390,844,'2026-10-17T02:59:00Z')
  await f.goto(`${BASE}#/flashcards/cronograma`)
  await f.locator('#cfc-hoje small').waitFor()
  assert.match(await f.locator('#cfc-hoje small').innerText(),/16 out/)
  await f.clock.fastForward(120_000)
  await f.waitForTimeout(100)
  assert.match(await f.locator('#cfc-hoje small').innerText(),/17 out/,'Flashcards não pode ficar em ontem')
  // Mudança vinda de outra aba: storage real (chave atual), sem gravar plano no servidor.
  await f.evaluate(async () => {
    const m = await import('/src/estado/armazenamento.ts')
    const modulo = await import('/src/flashcards/cronograma.ts')
    m.definirUsuarioLocal('conta-ficticia-calendario')
    const key = m.chaveCompleta(modulo.CHAVE_PLANO)
    localStorage.setItem(key, JSON.stringify({...modulo.planoSugerido(), ritmo: 37}))
    window.dispatchEvent(new StorageEvent('storage',{key,newValue:localStorage.getItem(key)}))
  })
  await f.getByText('37 novos por dia',{exact:true}).first().waitFor()
  await f.locator('#cfc-semana').scrollIntoViewIfNeeded()
  await f.screenshot({path:`${SAIDA}/celular-flashcards-virada.png`})
  assert.ok(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await f.clock.fastForward(86_400_000)
  await f.waitForTimeout(100)
  assert.equal(await f.locator('.cfc-semana > li').first().getAttribute('data-estado'), 'folga', 'folga sem estudo não pode aparecer como meta feita')
  assert.match(await f.locator('.cfc-semana > li').first().innerText(), /folga/)
  await f.context().close()
  assert.deepEqual(erros,[])
  // Revisão: o mesmo calendário, com o filtro de uma área só.
  const r = await pagina(1400, 860, '2026-10-16T15:00:00Z')
  await r.goto(`${BASE}#/`)
  await r.evaluate(async () => {
    const { carregarIndice } = await import('/src/dados/acervo.ts')
    const { gravar } = await import('/src/estado/armazenamento.ts')
    const indice = await carregarIndice(); const agora = Date.now(), D = 864e5; const reg = {}
    indice.questoes.filter((_, i) => i % 29 === 0).slice(0, 200).forEach((q, k) => { const em = agora - (k % 20) * D; reg[q.id] = { q: em, c: k % 3 !== 0, confianca: 'seguro', tentativas: 2, acertos: 1, historico: [{ em: em - 5 * D, correta: true }, { em, correta: k % 3 !== 0 }], proximaRevisao: agora + ((k % 30) - 5) * D } })
    gravar('respondidas', reg)
  })
  await r.goto(`${BASE}#/revisao`)
  await r.locator('#calendario-revisao .cc-dia > button[aria-current="date"]').waitFor()
  const total = Number(await r.locator('.rvx-heroi__titulo .numerico').first().innerText())
  const pilula = r.locator('.rvx-area').nth(1)
  const n = Number(await pilula.locator('small').innerText())
  await pilula.click()
  assert.equal(await pilula.getAttribute('aria-pressed'), 'true')
  assert.ok(Number(await r.locator('.rvx-heroi__titulo .numerico').first().innerText()) <= Math.min(total, n), 'filtrado por área')
  assert.equal(await r.locator('#calendario-revisao .cc-detalhe__item').count(), 1, 'detalhe de hoje só com a área escolhida')
  await r.screenshot({ path: `${SAIDA}/revisao-area.png` })
  await r.context().close()

  console.log(`Calendários no navegador: datas, seleção, foco, virada, fuso, plano encerrado e outra aba OK. Capturas: ${SAIDA}`)
} finally { await nav.close() }

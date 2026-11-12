// Executado pelo capturador: --roteiro fixtures/e2e_hub.mjs (API fictícia de admin-hub-dados.mjs).
// Fotografa e confere o Financeiro, as Metas, o Crescimento e o Início refeitos em 11/11/2026.
import assert from 'node:assert/strict'
import { instalarDados } from './admin-hub-dados.mjs'
export async function antes(page) { await instalarDados(page) }
export default async function roteiro(page, foto, nome) {
  const erros = []; page.on('pageerror', e => erros.push(e.message))
  const largura = async () => {
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (sobra > 1) console.log(nome, await page.evaluate(() => [...document.querySelectorAll('.a3-pilha *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.a3-tabela-caixa') }).slice(0, 8).map(e => `${e.tagName}.${String(e.className).slice(0, 40)} ${Math.round(e.getBoundingClientRect().right)}`)))
    return sobra
  }
  const ir = async (aba, titulo) => { await page.evaluate(a => { location.hash = `#/admin?aba=${a}` }, aba); await page.getByRole('heading', { name: titulo }).first().waitFor({ timeout: 20000 }); await page.waitForTimeout(900) }

  await ir('financeiro', /Quanto entrou, quem paga/)
  await foto('financeiro', { fullPage: true })
  assert.ok(await page.getByText(/Recebido em novembro/i).first().isVisible(), 'placar do caixa')
  assert.ok(await page.getByRole('table', { name: /novembro comparado com outubro/i }).isVisible(), 'comparação mês a mês')
  await page.locator('#fi-taxa').fill('90')
  assert.ok((await page.locator('.hb-sim__pergunta').innerText()).includes('90%'), 'o deslizador muda a taxa')
  await page.getByRole('group', { name: 'Período' }).getByRole('button', { name: 'Semana', exact: true }).click()
  await page.getByRole('group', { name: 'Dividir por' }).getByRole('button', { name: 'Plano', exact: true }).click()
  assert.ok(await largura() <= 1, `Financeiro sem rolagem lateral (${nome})`)

  await ir('metas', /Onde estamos, quanto falta/)
  await foto('metas', { fullPage: true })
  assert.ok(await page.getByRole('table', { name: 'Placar semanal' }).isVisible(), 'placar semanal')
  await page.locator('#mt-futuro input[type=range]').nth(2).fill('1.5')
  assert.ok(await largura() <= 1, `Metas sem rolagem lateral (${nome})`)

  await ir('crescimento', /Quem chega, quem assina/)
  assert.ok(await page.getByRole('table', { name: 'Cadastros e assinantes novos por período' }).isVisible(), 'placar do Crescimento')
  await page.getByRole('group', { name: 'Período dos gráficos de crescimento' }).getByRole('button', { name: 'Mês', exact: true }).click()
  await page.locator('#cr-quando').scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  await foto('crescimento', { fullPage: true })
  assert.ok(await page.getByRole('table', { name: 'Média por dia da semana' }).first().isVisible(), 'semana típica')
  assert.ok(await largura() <= 1, `Crescimento sem rolagem lateral (${nome})`)

  await ir('assinaturas', /Quem paga, como paga/)
  await foto('assinantes', { fullPage: true })
  assert.ok(await page.getByText('Quem vence nos próximos 30 dias').isVisible(), 'vencimentos dos assinantes')
  assert.ok(await largura() <= 1, `Assinantes sem rolagem lateral (${nome})`)

  await page.evaluate(() => { location.hash = '#/admin' }); await page.locator('.cc-placar').waitFor({ timeout: 20000 }); await page.waitForTimeout(600)
  await foto('inicio', { fullPage: true })
  assert.ok(await page.locator('.cc-placar').isVisible(), 'placar do Início')
  assert.ok(await page.locator('.ag-acesso').isVisible(), 'assinantes com acesso no Início')
  assert.deepEqual(erros, [], 'sem erros na página')
}

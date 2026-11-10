import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { iniciar, rpcs, usuarios, HORA } from './painel_admin_falso.mjs'

const pasta = process.env.CAPTURAS ?? 'work/indicacao-admin'
await mkdir(pasta, { recursive: true })
const agora = Date.now()
rpcs.visitas_indicacao_admin = () => [0, 1, 2, 3].map(i => ({ id_usuario: usuarios[i].id_usuario, indicacao_ultima: new Date(agora - (i === 2 ? 25 : 1)*HORA).toISOString() }))
const { contexto, abrir, fechar, erros } = await iniciar()
try {
  for (const largura of [1440, 390]) {
    const { c, p } = await contexto(largura, 1000, largura < 600)
    await p.clock.install({ time: new Date(agora) })
    await abrir(p)
    const pessoas = p.locator('section[aria-label="Pessoas"]')
    await pessoas.locator('li.a3-indicacao').first().waitFor()
    assert.equal(await pessoas.locator('li.a3-indicacao').count(), 3)
    assert.equal(await pessoas.locator('li.a3-indicacao').filter({ hasText: usuarios[2].nome }).count(), 0, '25 h não fica azul')
    const ambos = pessoas.locator('li.lead.a3-indicacao').filter({ hasText: 'Bruno Costa' })
    assert.equal(await ambos.locator('.a3-tag--lead').count(), 1, 'Selo amarelo continua')
    await p.screenshot({ path: `${pasta}/agora-${largura}.png`, fullPage: true })
    await abrir(p, '?aba=usuarios')
    const azul = p.locator('tr.a3-indicacao')
    await azul.first().waitFor()
    assert.equal(await azul.count(), 3)
    await p.getByRole('button', { name: /Ana Ribeiro/ }).first().click()
    const ficha = p.locator('.a3-gaveta__cabeca.a3-indicacao')
    await ficha.waitFor()
    assert.match(await ficha.innerText(), /Viu Indique e ganhe em 24 h/)
    for (const tema of ['claro', 'escuro']) {
      await p.evaluate(t => { document.documentElement.dataset.tema = t }, tema)
      await p.screenshot({ path: `${pasta}/ficha-${largura}-${tema}.png`, fullPage: false })
    }
    await p.keyboard.press('Escape')
    await p.screenshot({ path: `${pasta}/pessoas-${largura}.png`, fullPage: true })
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Sem rolagem lateral')
    await p.clock.setSystemTime(new Date(agora + 25*HORA))
    await p.clock.fastForward(10_001)
    assert.equal(await p.locator('tr.a3-indicacao').count(), 0, 'Azul expira com o painel aberto, mesmo com dados antigos em memória')
    await c.close()
  }
  assert.deepEqual(erros, [])
  console.log('Navegador: azul nas listas e ficha, planos preservados, expiração, celular e temas OK')
} finally { await fechar() }

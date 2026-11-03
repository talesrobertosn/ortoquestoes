// Capturas do painel 3.0 com os dados de exemplo (fixtures/painel_admin_falso.mjs, sem rede real).
// ABAS=comando,agora TAMANHOS=1440x900,390x844 TEMAS=claro,escuro CAPTURAS=pasta node fixtures/capturar_painel_admin.mjs
// Avisa "ROLAGEM DE LADO" quando a página passa da largura da tela; SONDA="expressão JS" imprime uma medida da página.
import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { iniciar } from './painel_admin_falso.mjs'

const capturas = process.env.CAPTURAS ?? await mkdtemp(join(tmpdir(), 'orto-admin-'))
await mkdir(capturas, { recursive: true })
const { erros, contexto, abrir, fechar } = await iniciar()
try {
  const foto = (p, nome) => p.screenshot({ path: join(capturas, `${nome}.png`), fullPage: true })

  const ABAS = (process.env.ABAS ?? 'comando').split(',')
  const TAMANHOS = (process.env.TAMANHOS ?? '1440x900,390x844').split(',').map(t => t.split('x').map(Number))
  const TEMAS = (process.env.TEMAS ?? 'claro').split(',')
  for (const [largura, altura] of TAMANHOS) {
    const x = await contexto(largura, altura, largura < 600)
    for (const aba of ABAS) {
      const [nome, consulta] = aba.includes('?') ? aba.split('?') : [aba, aba === 'comando' ? '' : `aba=${aba}`]
      await abrir(x.p, consulta ? `?${consulta}` : '')
      await x.p.waitForTimeout(Number(process.env.ESPERA ?? 1800))
      for (const tema of TEMAS) {
        await x.p.evaluate((t) => { document.documentElement.dataset.tema = t }, tema); await x.p.waitForTimeout(250)
        await foto(x.p, `${nome}-${largura}${tema === 'escuro' ? '-escuro' : ''}`)
        // SONDA="expressão JS": imprime o resultado de uma consulta à página (para depurar medidas).
        if (process.env.SONDA) console.log(`SONDA ${nome} ${largura}:`, JSON.stringify(await x.p.evaluate(process.env.SONDA)))
      }
      await x.p.evaluate(() => { document.documentElement.dataset.tema = 'claro' })
      const larguraDoc = await x.p.evaluate(() => document.documentElement.scrollWidth)
      if (larguraDoc > largura) {
        const culpados = await x.p.evaluate((w) => [...document.querySelectorAll('.a3 *')].filter(el => { const r = el.getBoundingClientRect(); return r.right > w + 1 && r.width > 0 && ![...el.children].some(c => c.getBoundingClientRect().right > w + 1) }).slice(0, 6).map(el => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} (${Math.round(el.getBoundingClientRect().right)})`), largura)
        console.log(`ROLAGEM DE LADO: ${nome} ${largura} -> ${larguraDoc}: ${culpados.join(' | ')}`)
      }
    }
    await x.c.close()
  }
  console.log('erros:', JSON.stringify(erros))
} finally {
  await fechar()
}

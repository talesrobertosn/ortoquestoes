// Roteiro de medição para scripts/capturar_telas.mjs (--roteiro): LCP, CLS, peso das imagens da primeira dobra,
// nós do DOM e a maior latência de interação (clique no gato do cenário, que existe antes e depois do redesenho).
// Uso: node scripts/capturar_telas.mjs / medida --com-dados --agora 2026-10-31T19:30:00Z --pasta DIR --roteiro scripts/design/medir_inicio.mjs
// Grava DIR/medida-<cel|pc>.json. Os números saem do servidor de desenvolvimento: servem para comparar antes e depois
// nas mesmas condições, não como valor absoluto de produção.
import { writeFileSync } from 'node:fs'

export default async function medir(pagina, _foto, nome) {
  // O servidor de desenvolvimento carrega centenas de módulos: amplia o registro de recursos e recarrega a página.
  const imagens = new Map()
  pagina.on('response', async (r) => {
    if (!/\.(png|webp|jpe?g|gif|svg)(\?|$)/.test(r.url())) return
    try { imagens.set(r.url(), (await r.body()).length) } catch { /* sem corpo */ }
  })
  await pagina.context().addInitScript(() => performance.setResourceTimingBufferSize(5000))
  await pagina.reload(); await pagina.waitForTimeout(4500)
  await pagina.evaluate(() => {
    window.__inp = 0
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__inp = Math.max(window.__inp, e.duration) }).observe({ type: 'event', buffered: true, durationThreshold: 16 })
  })
  const gato = pagina.locator('.hd-gato').first()
  if (await gato.count()) { await gato.click({ force: true }).catch(() => {}); await pagina.waitForTimeout(300); await gato.click({ force: true }).catch(() => {}) }
  await pagina.waitForTimeout(800)
  const dados = await pagina.evaluate(() => new Promise((ok) => {
    let lcp = 0, lcpEl = '', cls = 0
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { lcp = e.startTime; lcpEl = (e.element?.tagName ?? '') + '.' + (e.element?.className?.toString?.().split(' ')[0] ?? '') } }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value }).observe({ type: 'layout-shift', buffered: true })
    setTimeout(() => {
      const alturaDobra = innerHeight
      const imgs = [...document.images].filter((i) => i.getBoundingClientRect().top < alturaDobra && i.currentSrc)
      const recursos = performance.getEntriesByType('resource')
      const pesoDe = (src) => recursos.find((r) => r.name === src)?.decodedBodySize ?? 0
      const fundosCss = recursos.filter((r) => r.initiatorType === 'css' && /\.(png|webp|jpe?g)/.test(r.name))
      ok({
        lcp_ms: Math.round(lcp), lcp_elemento: lcpEl, cls: Number(cls.toFixed(4)), inp_ms: Math.round(window.__inp),
        imagens_na_dobra: imgs.length, _srcs_dobra: imgs.map((i) => i.currentSrc), kb_imagens_na_dobra: Math.round(imgs.reduce((s, i) => s + pesoDe(i.currentSrc), 0) / 1024),
        imagens_total: recursos.filter((r) => /\.(png|webp|jpe?g|gif|svg)/.test(r.name)).length,
        kb_imagens_total: Math.round(recursos.filter((r) => /\.(png|webp|jpe?g|gif|svg)/.test(r.name)).reduce((s, r) => s + r.decodedBodySize, 0) / 1024),
        sprites_css: fundosCss.length, nos_dom: document.getElementsByTagName('*').length,
        altura_pagina: document.documentElement.scrollHeight,
        dobra: [...document.querySelectorAll('main h1, main h2')].filter((h) => h.getBoundingClientRect().top < alturaDobra).map((h) => h.textContent.trim().slice(0, 60)),
      })
    }, 600)
  }))
  dados.imagens_total = imagens.size
  dados.kb_imagens_total = Math.round([...imagens.values()].reduce((a, b) => a + b, 0) / 1024)
  dados.kb_imagens_na_dobra = Math.round(dados._srcs_dobra.reduce((s, u) => s + (imagens.get(u) ?? 0), 0) / 1024)
  delete dados._srcs_dobra
  const pasta = process.argv[process.argv.indexOf('--pasta') + 1]
  writeFileSync(`${pasta}/medida-${nome}.json`, JSON.stringify(dados, null, 2))
  console.log(nome, dados)
}

/**
 * Percurso da Cripta com robô (acabamento, 16/10/2026): joga de verdade vários andares, nos quatro formatos,
 * e procura travas, cliques mortos, pulos de layout, textos cortados e imagens lentas.
 *
 * Servidor local (modo de desenvolvimento, que expõe window.__torneio):
 *   VITE_SUPABASE_URL=sem npx vite --port 5199
 *   CHROMIUM_BIN=/opt/pw-browsers/chromium node scripts/flashcards/testar_percurso.mjs
 * Variáveis: ORTO_URL, ORTO_CAPTURAS, ORTO_ANDARES (padrão 7), ORTO_FORMATOS (ex.: "390x844,1400x860").
 *
 * O robô acerta quase sempre (erra 1 em 6, para ver o contra-ataque), escolhe a primeira recompensa, a
 * primeira porta, sai da loja e aceita a primeira oferta das salas. A vida fica alta para chegar longe.
 * Falha (código 1) com: exceção na página, trava (nada muda em 15 s), clique morto (o toque não muda nada
 * em 5 s, ou o centro do alvo está coberto), texto cortado no flashcard, nas alternativas ou na placa, coluna
 * mais larga que a tela, ou pulo de layout (CLS) acima de 0,1. Imagens acima de 1,5 s só entram no relatório.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const url = process.env.ORTO_URL ?? 'http://127.0.0.1:5199/#/flashcards/cripta'
const pasta = process.env.ORTO_CAPTURAS ?? '/tmp/ortoquestoes-percurso'
const ALVO = Number(process.env.ORTO_ANDARES ?? 7)
const FORMATOS = (process.env.ORTO_FORMATOS ?? '1400x860,1280x720,390x844,844x390').split(',').map((f) => f.split('x').map(Number))
await mkdir(pasta, { recursive: true })
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_BIN ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : '/usr/bin/chromium'), args: ['--no-sandbox'] })

const problemas = []
const relatorio = []
try {
  for (const [width, height] of FORMATOS) {
    const nome = `${width}x${height}`
    const toque = width < 900
    const ctx = await b.newContext({ viewport: { width, height }, hasTouch: toque, isMobile: toque })
    const p = await ctx.newPage()
    const anotar = async (tipo, detalhe) => {
      const n = problemas.filter((x) => x.formato === nome && x.tipo === tipo).length
      problemas.push({ formato: nome, tipo, detalhe })
      if (n < 2) await p.screenshot({ path: `${pasta}/problema-${nome}-${tipo}-${n}.png` }).catch(() => {})
    }
    p.on('pageerror', (e) => problemas.push({ formato: nome, tipo: 'exceção', detalhe: e.message }))
    await p.addInitScript(() => {
      window.__cls = []
      // tela coberta (portas, loja, sala, recompensa, apresentação do adversário, cortina) e os 800 ms
      // seguintes: o que muda por baixo não é visto como pulo
      window.__cobertaAte = 0
      setInterval(() => { if (document.querySelector('.fc-arena[data-parada], .fc-apresenta, .fc-cortina-pixels, .fc-carregando')) window.__cobertaAte = performance.now() + 800 }, 50)
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (e.hadRecentInput) continue
          if (!window.__torneio || e.startTime < window.__cobertaAte) { window.__clsCoberto = (window.__clsCoberto ?? 0) + e.value; continue }
          const fontes = (e.sources ?? []).map((s) => `${s.node?.className?.toString?.().split(' ')[0] || s.node?.nodeName || '?'}(${Math.round(s.previousRect.y)}→${Math.round(s.currentRect.y)})`)
          const q = window.__torneio?.partida
          window.__cls.push({ v: e.value, fontes, quando: q ? `${q.fase}@${q.andar}${window.__torneio.animando ? '*' : ''}` : '?' })
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await p.goto(url)
    await p.waitForFunction(() => !!window.__torneio, null, { timeout: 30000 })
    const tocar = async (loc) => (toque ? loc.tap({ timeout: 4000 }) : loc.click({ timeout: 4000 }))
    const estado = () => p.evaluate(() => { const t = window.__torneio, q = t.partida; return { fase: q.fase, andar: q.andar, id: q.atual?.id ?? null, animando: !!t.animando, vida: q.vida, apres: !!document.querySelector('.fc-apresenta'), chave: [q.fase, q.andar, q.atual?.id, document.querySelector('.fc-slot-mao--sel') ? 'sel' : '', q.atual?.respondida, q.atual?.eliminadas?.length, q.ouro, q.inimigo?.vida, q.baralho?.length, (q.recompensas ?? []).length].join('|') } })
    const coberto = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); const a = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(a && (el === a || el.contains(a))) })
    // toque que precisa mudar alguma coisa; senão é clique morto
    const agir = async (loc, rotulo) => {
      if (!(await loc.count())) return false
      const alvo = loc.first()
      if (!(await alvo.isVisible())) return false
      if (await coberto(alvo)) { await anotar('alvo-coberto', `${rotulo}`); }
      const antes = (await estado()).chave
      await tocar(alvo).catch(async (e) => { await anotar('toque-falhou', `${rotulo}: ${e.message.split('\n')[0]}`) })
      for (let i = 0; i < 50; i++) { await p.waitForTimeout(100); const e = await estado(); if (e.chave !== antes || e.apres) return true }
      await anotar('clique-morto', rotulo)
      return false
    }
    const conferirTela = async (momento) => {
      const r = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth
        const corta = (e) => { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const oculta = /hidden|clip|auto|scroll/.test(cs.overflow + cs.overflowY + cs.overflowX); return oculta && cs.textOverflow !== 'ellipsis' && (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2) }
        const sel = '.fc-alternativa > span, .fc-carta__pergunta, .fc-carta__titulo, .fc-placa__nome strong, .fc-principal__texto, .fc-heroi__dados, .fc-vida b'
        const cortados = [...document.querySelectorAll(sel)].filter(corta).map((e) => `${e.className || e.nodeName}: ${e.textContent.trim().slice(0, 40)}`)
        const coluna = document.querySelector('.fc-mesa')?.getBoundingClientRect().right ?? 0
        const fora = [...document.querySelectorAll('.fc-alternativa, .fc-principal, .fc-placa, .fc-intencao')].filter((e) => { const q = e.getBoundingClientRect(); return q.width && (q.right > vw + 1 || q.left < -1) }).map((e) => e.className.split(' ')[0])
        return { cortados, fora, larga: coluna > vw + 1 }
      })
      if (r.cortados.length) await anotar('texto-cortado', `${momento}: ${r.cortados.join(' | ')}`)
      if (r.fora.length || r.larga) await anotar('fora-da-tela', `${momento}: ${r.fora.join(', ')}${r.larga ? ' (coluna mais larga que a tela)' : ''}`)
    }

    const t0 = Date.now()
    let ultimaMudanca = Date.now(), ultimaChave = '', respostas = 0, conferidos = 0, andarMax = 1
    await p.evaluate(() => { const t = window.__torneio; t.definir({ ...t.partida, vida: 9999, vidaMax: 9999 }) })
    while (Date.now() - t0 < 240000) {
      const e = await estado()
      andarMax = Math.max(andarMax, e.andar)
      if (e.andar > ALVO || e.fase === 'fim') break
      if (e.chave !== ultimaChave) { ultimaChave = e.chave; ultimaMudanca = Date.now() }
      else if (Date.now() - ultimaMudanca > 15000) { await anotar('trava', `fase ${e.fase}, andar ${e.andar}, animando ${e.animando}`); break }
      if (e.apres) { await p.locator('.fc-apresenta').click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(150); continue }
      const pular = p.locator('.fc-tutorial__pular, .fc-ajuda__fechar')
      if (await pular.count() && await pular.first().isVisible()) { await pular.first().click().catch(() => {}); continue }
      if (e.animando) { await p.waitForTimeout(120); continue }
      if (e.fase === 'pergunta') {
        if (conferidos < 12) { conferidos++; await conferirTela(`andar ${e.andar}`) }
        if (e.vida < 2000) await p.evaluate(() => { const t = window.__torneio; t.definir({ ...t.partida, vida: 9999 }) })
        const errar = respostas % 6 === 5
        const i = await p.evaluate((errar) => { const t = window.__torneio, n = document.querySelectorAll('.fc-alternativa').length; return errar ? (t.certaVisual + 1) % n : t.certaVisual }, errar)
        if (i < 0) { await p.waitForTimeout(150); continue }
        const alt = p.locator('.fc-alternativa').nth(i)
        await agir(alt, `alternativa (andar ${e.andar})`)
        if ((await estado()).fase === 'pergunta') await agir(p.locator('.fc-principal:not([disabled])'), `Atacar (andar ${e.andar})`)
        respostas++
      } else if (e.fase === 'resposta') {
        await agir(p.locator('.fc-principal:not([disabled])'), `Seguir (andar ${e.andar})`)
      } else if (e.fase === 'recompensa') {
        await agir(p.locator('.fc-recompensa:not([disabled])'), 'recompensa')
      } else if (e.fase === 'portas') {
        await p.screenshot({ path: `${pasta}/portas-${nome}-andar${e.andar}.png` }).catch(() => {})
        await agir(p.locator('.fc-portal:not([disabled])'), 'porta')
      } else if (e.fase === 'loja') {
        await agir(p.locator('.fc-janela__botoes .fc-botao'), 'sair da loja')
      } else if (e.fase === 'sala' || e.fase === 'sabio') {
        await agir(p.locator('.fc-oferta:not([disabled])'), e.fase)
      } else await p.waitForTimeout(200)
    }
    const cls = await p.evaluate(() => window.__cls)
    const clsCoberto = await p.evaluate(() => window.__clsCoberto ?? 0)
    const total = cls.reduce((a, x) => a + x.v, 0)
    const maiores = cls.filter((x) => x.v > 0.01).sort((a, c) => c.v - a.v).slice(0, 4).map((x) => `${x.v.toFixed(3)} [${x.quando}] ${x.fontes.join('/')}`)
    if (total > 0.1) await anotar('pulo-de-layout', `CLS ${total.toFixed(3)}: ${maiores.join('; ')}`)
    const lentas = await p.evaluate(() => performance.getEntriesByType('resource').filter((r) => /\.(png|webp|jpe?g)(\?|$)/.test(r.name) && r.duration > 1500).map((r) => `${r.name.split('/').slice(-2).join('/')} ${Math.round(r.duration)} ms`))
    await p.screenshot({ path: `${pasta}/fim-${nome}.png` })
    relatorio.push(`${nome}: andar ${andarMax}, ${respostas} respostas em ${Math.round((Date.now() - t0) / 1000)} s, CLS ${total.toFixed(3)} (mais ${clsCoberto.toFixed(3)} sob telas cobertas ou no carregamento)${maiores.length ? ` (${maiores.join('; ')})` : ''}, imagens lentas: ${lentas.length ? lentas.join(', ') : 'nenhuma'}`)
    if (andarMax <= Math.min(ALVO, 3)) problemas.push({ formato: nome, tipo: 'pouco-avanço', detalhe: `parou no andar ${andarMax}` })
    await ctx.close()
  }
} finally { await b.close() }
console.log(relatorio.join('\n'))
if (problemas.length) {
  console.log(`\n${problemas.length} problema(s):`)
  for (const x of problemas) console.log(`- ${x.formato} ${x.tipo}: ${x.detalhe}`)
  process.exit(1)
}
console.log('Percurso sem travas, cliques mortos, textos cortados nem pulos de layout.')

/**
 * Pintura dos cenários e do tampo da mesa, em canvas, uma vez por tamanho de
 * tela (não há laço contínuo aqui). Direção de arte: fantasia lisa, com luz e
 * profundidade, no espírito de Legends of Runeterra, com toques de pixel art
 * (flores, brasões, bandeiras). Nada de anatomia: só natureza, pedra e metal.
 */
import type { Cenario } from '../motor/bestiario'
import { sortear } from '../motor/aleatorio'

type Ctx = CanvasRenderingContext2D

function semeado(semente: number) {
  let s = semente
  return () => { const [v, p] = sortear(s); s = p; return v }
}

function radial(c: Ctx, x: number, y: number, r: number, paradas: Array<[number, string]>) {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  paradas.forEach(([o, cor]) => g.addColorStop(o, cor))
  c.fillStyle = g
  c.fillRect(x - r, y - r, r * 2, r * 2)
}

function vinheta(c: Ctx, w: number, h: number, forca = 0.6) {
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${forca})`)
  c.fillStyle = g
  c.fillRect(0, 0, w, h)
}

/** Copa de árvore vista de cima: bolhas sobrepostas, do escuro para o claro. */
function copa(c: Ctx, x: number, y: number, r: number, rnd: () => number, tons = ['#173a1c', '#21512a', '#2f6b35', '#43863f', '#6aa64c']) {
  radial(c, x + r * 0.25, y + r * 0.35, r * 1.35, [[0, 'rgba(0,0,0,.45)'], [1, 'rgba(0,0,0,0)']])
  tons.forEach((tom, camada) => {
    const n = 7 - camada
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = r * (0.55 - camada * 0.09) * rnd()
      const rr = r * (0.42 - camada * 0.05) * (0.7 + rnd() * 0.5)
      const cx = x + Math.cos(a) * d - camada * r * 0.05, cy = y + Math.sin(a) * d - camada * r * 0.06
      const g = c.createRadialGradient(cx - rr * 0.3, cy - rr * 0.3, rr * 0.1, cx, cy, rr)
      g.addColorStop(0, tom); g.addColorStop(1, camada === 0 ? '#0f2a14' : tons[camada - 1])
      c.fillStyle = g
      c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.fill()
    }
  })
}

/** Pedra lavrada com chanfro: luz em cima à esquerda, sombra embaixo à direita. */
function pedra(c: Ctx, x: number, y: number, w: number, h: number, base: string, rnd: () => number, raio = 6) {
  c.save()
  c.beginPath(); c.roundRect(x, y, w, h, raio)
  const g = c.createLinearGradient(x, y, x + w, y + h)
  g.addColorStop(0, clarear(base, 0.18)); g.addColorStop(0.55, base); g.addColorStop(1, clarear(base, -0.28))
  c.fillStyle = g; c.fill()
  c.clip()
  // manchas da pedra
  for (let i = 0; i < 3; i++) radial(c, x + rnd() * w, y + rnd() * h, Math.max(w, h) * (0.2 + rnd() * 0.3), [[0, clarear(base, (rnd() - 0.4) * 0.16) + '66'], [1, 'rgba(0,0,0,0)']])
  c.restore()
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1.5
  c.beginPath(); c.moveTo(x + raio, y + 1); c.lineTo(x + w - raio, y + 1); c.stroke()
  c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2
  c.beginPath(); c.roundRect(x, y, w, h, raio); c.stroke()
}

export function clarear(hex: string, k: number): string {
  const n = parseInt(hex.slice(1, 7), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))))
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')
}

/** Toque de pixel art: um bloco de pixels grandes (flores, brasões). */
function pixels(c: Ctx, x: number, y: number, tam: number, mapa: string[], cores: Record<string, string>) {
  mapa.forEach((linha, j) => [...linha].forEach((ch, i) => { if (cores[ch]) { c.fillStyle = cores[ch]; c.fillRect(Math.round(x + i * tam), Math.round(y + j * tam), Math.ceil(tam), Math.ceil(tam)) } }))
}
const FLOR = ['.a.', 'aba', '.a.']
const BANDEIRA = ['kkkkkkk', 'krrrrrk', 'kroyork', 'krryrrk', 'kroyork', 'krrrrrk', 'krr.rrk', 'kr...rk', 'k.....k']

function pintarCampo(c: Ctx, w: number, h: number, rnd: () => number) {
  // chão de grama, mais claro no meio (luz da tarde)
  const g = c.createRadialGradient(w * 0.45, h * 0.42, 0, w / 2, h / 2, Math.max(w, h) * 0.75)
  g.addColorStop(0, '#7fa647'); g.addColorStop(0.5, '#4f7d33'); g.addColorStop(1, '#22441f')
  c.fillStyle = g; c.fillRect(0, 0, w, h)
  // manchas de grama alta e terra
  for (let i = 0; i < 26; i++) radial(c, rnd() * w, rnd() * h, 60 + rnd() * 160, [[0, rnd() > 0.7 ? 'rgba(140,110,60,.22)' : 'rgba(150,190,80,.18)'], [1, 'rgba(0,0,0,0)']])
  // folhinhas de grama
  const n = Math.min(9000, (w * h) / 55)
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, l = 3 + rnd() * 6, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9
    const t = rnd()
    c.strokeStyle = t > 0.6 ? 'rgba(170,210,100,.35)' : t > 0.3 ? 'rgba(60,110,40,.4)' : 'rgba(30,70,30,.35)'
    c.lineWidth = 1.2
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke()
  }
  // caminho de pedra em volta (ruínas): duas faixas laterais
  const faixa = Math.max(70, w * 0.09)
  for (const lado of [0, 1]) {
    const x0 = lado ? w - faixa - 10 : 10
    for (let y = -20; y < h + 20;) {
      const ph = 34 + rnd() * 40
      pedra(c, x0 + rnd() * 8, y, faixa - rnd() * 14, ph - 6, rnd() > 0.5 ? '#9a9583' : '#8b8775', rnd, 8)
      // musgo nas juntas
      radial(c, x0 + rnd() * faixa, y + ph - 4, 18, [[0, 'rgba(90,140,50,.55)'], [1, 'rgba(0,0,0,0)']])
      y += ph
    }
  }
  // flores em pixel art (toque de pixel)
  const tam = Math.max(2, Math.round(w / 420))
  for (let i = 0; i < 60; i++) {
    const cor = ['#f4e3a1', '#f29bb0', '#b9a7f4', '#ffffff'][i % 4]
    pixels(c, rnd() * w, rnd() * h, tam, FLOR, { a: cor, b: '#f2c94c' })
  }
  // árvores nos cantos e nas bordas
  const r = Math.max(90, Math.min(w, h) * 0.2)
  ;[[0, 0], [w, 0], [0, h], [w, h], [w * 0.5, -r * 0.6], [-r * 0.2, h * 0.5], [w + r * 0.2, h * 0.5]].forEach(([x, y]) => copa(c, x, y, r * (0.8 + rnd() * 0.4), rnd))
  // feixes de sol na diagonal
  c.save(); c.globalCompositeOperation = 'screen'
  for (let i = 0; i < 5; i++) {
    const x = w * (0.1 + i * 0.22)
    const fe = c.createLinearGradient(x, 0, x + w * 0.3, h)
    fe.addColorStop(0, 'rgba(255,240,190,.16)'); fe.addColorStop(1, 'rgba(255,240,190,0)')
    c.fillStyle = fe
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 50 + rnd() * 60, 0); c.lineTo(x + w * 0.35, h); c.lineTo(x + w * 0.25, h); c.closePath(); c.fill()
  }
  c.restore()
  vinheta(c, w, h, 0.55)
}

function pintarMasmorra(c: Ctx, w: number, h: number, rnd: () => number) {
  c.fillStyle = '#1a1c24'; c.fillRect(0, 0, w, h)
  // lajotas irregulares
  const lado = Math.max(56, Math.min(w, h) / 9)
  for (let y = -lado / 2, fila = 0; y < h + lado; y += lado * 0.82, fila++) {
    for (let x = -lado + (fila % 2) * lado * 0.5; x < w + lado;) {
      const lw = lado * (0.8 + rnd() * 0.6)
      const tons = ['#3b3f4c', '#353845', '#40414a', '#2f323c', '#3c3a42']
      pedra(c, x + 3, y + 3, lw - 6, lado * 0.82 - 6, tons[Math.floor(rnd() * tons.length)], rnd, 5)
      if (rnd() > 0.82) { // rachadura
        c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.5; c.beginPath()
        let px = x + lw * rnd(), py = y + 6; c.moveTo(px, py)
        for (let k = 0; k < 4; k++) { px += (rnd() - 0.5) * 18; py += lado * 0.18; c.lineTo(px, py) }
        c.stroke()
      }
      if (rnd() > 0.7) radial(c, x + lw * rnd(), y + lado * 0.8, 16, [[0, 'rgba(70,110,60,.45)'], [1, 'rgba(0,0,0,0)']])
      x += lw
    }
  }
  // paredes laterais escuras
  for (const lado2 of [0, 1]) {
    const gw = c.createLinearGradient(lado2 ? w : 0, 0, lado2 ? w - w * 0.16 : w * 0.16, 0)
    gw.addColorStop(0, 'rgba(5,5,10,.92)'); gw.addColorStop(1, 'rgba(5,5,10,0)')
    c.fillStyle = gw; c.fillRect(lado2 ? w * 0.84 : 0, 0, w * 0.16, h)
  }
  // poças de luz das tochas
  c.save(); c.globalCompositeOperation = 'lighter'
  for (const [px, py] of [[0.06, 0.22], [0.94, 0.22], [0.06, 0.74], [0.94, 0.74]]) {
    radial(c, w * px, h * py, Math.min(w, h) * 0.42, [[0, 'rgba(255,150,60,.42)'], [0.4, 'rgba(200,90,30,.14)'], [1, 'rgba(0,0,0,0)']])
  }
  c.restore()
  // névoa baixa azulada
  const nevoa = c.createLinearGradient(0, h * 0.6, 0, h)
  nevoa.addColorStop(0, 'rgba(60,80,120,0)'); nevoa.addColorStop(1, 'rgba(60,80,120,.25)')
  c.fillStyle = nevoa; c.fillRect(0, h * 0.6, w, h * 0.4)
  vinheta(c, w, h, 0.7)
}

function pintarSalao(c: Ctx, w: number, h: number, rnd: () => number) {
  // assoalho de madeira escura com brilho
  const tabua = Math.max(28, w / 36)
  for (let x = 0, i = 0; x < w; x += tabua, i++) {
    const tons = ['#3a2416', '#33200f', '#41291a', '#2d1b0e']
    const g = c.createLinearGradient(x, 0, x + tabua, 0)
    const base = tons[i % tons.length]
    g.addColorStop(0, clarear(base, 0.08)); g.addColorStop(1, clarear(base, -0.2))
    c.fillStyle = g; c.fillRect(x, 0, tabua, h)
    c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(x, 0, 1.5, h)
    for (let y = rnd() * 200; y < h; y += 180 + rnd() * 220) c.fillRect(x, y, tabua, 1.5)
    for (let k = 0; k < 6; k++) { c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1; c.beginPath(); const yy = rnd() * h; c.moveTo(x + 3, yy); c.bezierCurveTo(x + tabua * 0.3, yy + 30, x + tabua * 0.7, yy - 30, x + tabua - 3, yy + 10); c.stroke() }
  }
  // tapete vermelho com barra dourada
  const tw = w * 0.42, tx = (w - tw) / 2
  const tg = c.createLinearGradient(tx, 0, tx + tw, 0)
  tg.addColorStop(0, '#5a1010'); tg.addColorStop(0.5, '#8e1c1c'); tg.addColorStop(1, '#5a1010')
  c.fillStyle = tg; c.fillRect(tx, 0, tw, h)
  c.fillStyle = '#d4a64a'; c.fillRect(tx + 10, 0, 5, h); c.fillRect(tx + tw - 15, 0, 5, h)
  c.fillStyle = 'rgba(255,220,140,.35)'; for (let y = 10; y < h; y += 26) { c.fillRect(tx + 24, y, 6, 6); c.fillRect(tx + tw - 30, y, 6, 6) }
  // colunas laterais
  const cw = Math.max(50, w * 0.06)
  for (const px of [0.03, 0.97]) {
    for (const py of [0.18, 0.62]) {
      const x = w * px - cw / 2, y = h * py
      radial(c, x + cw * 0.8, y + cw * 0.9, cw * 1.4, [[0, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']])
      const cg = c.createRadialGradient(x + cw * 0.35, y + cw * 0.35, cw * 0.1, x + cw / 2, y + cw / 2, cw * 0.7)
      cg.addColorStop(0, '#d8d0c0'); cg.addColorStop(0.6, '#8f877a'); cg.addColorStop(1, '#3d3830')
      c.fillStyle = cg; c.beginPath(); c.arc(x + cw / 2, y + cw / 2, cw * 0.62, 0, Math.PI * 2); c.fill()
      c.strokeStyle = '#d4a64a'; c.lineWidth = 3; c.stroke()
    }
  }
  // estandartes em pixel art no alto
  const tam = Math.max(4, Math.round(w / 180))
  for (const px of [0.2, 0.8]) pixels(c, w * px - (7 * tam) / 2, 0, tam, BANDEIRA, { k: '#120a06', r: '#8e1c1c', o: '#e3b04b', y: '#ffd76a' })
  // velas: poças de luz
  c.save(); c.globalCompositeOperation = 'lighter'
  for (const [px, py] of [[0.12, 0.1], [0.88, 0.1], [0.1, 0.9], [0.9, 0.9], [0.5, 0.02]]) radial(c, w * px, h * py, Math.min(w, h) * 0.35, [[0, 'rgba(255,190,90,.32)'], [1, 'rgba(0,0,0,0)']])
  c.restore()
  // raios de cima
  c.save(); c.globalCompositeOperation = 'screen'
  for (let i = 0; i < 4; i++) {
    const x = w * (0.32 + i * 0.12)
    const fe = c.createLinearGradient(0, 0, 0, h * 0.9)
    fe.addColorStop(0, 'rgba(255,220,150,.14)'); fe.addColorStop(1, 'rgba(255,220,150,0)')
    c.fillStyle = fe; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 40, 0); c.lineTo(x + 120, h * 0.9); c.lineTo(x - 40, h * 0.9); c.closePath(); c.fill()
  }
  c.restore()
  vinheta(c, w, h, 0.65)
}

export function pintarCenario(canvas: HTMLCanvasElement, cenario: Cenario) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
  const c = canvas.getContext('2d')
  if (!c) return
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  const rnd = semeado(cenario === 'campo' ? 11 : cenario === 'masmorra' ? 23 : 37)
  if (cenario === 'campo') pintarCampo(c, w, h, rnd)
  else if (cenario === 'masmorra') pintarMasmorra(c, w, h, rnd)
  else pintarSalao(c, w, h, rnd)
}

/** Tampo da mesa (o tabuleiro emoldurado), na textura do cenário. */
export function pintarMesa(canvas: HTMLCanvasElement, cenario: Cenario) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth, h = canvas.clientHeight
  if (!w || !h) return
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
  const c = canvas.getContext('2d')
  if (!c) return
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  const rnd = semeado(cenario.length * 97)
  if (cenario === 'campo') {
    // lajes claras e gastas, com grama brotando nas juntas
    c.fillStyle = '#6f7a52'; c.fillRect(0, 0, w, h)
    const t = Math.max(54, w / 8)
    for (let y = 0, f = 0; y < h; y += t * 0.7, f++) for (let x = -(f % 2) * t * 0.5; x < w; x += t) {
      pedra(c, x + 2, y + 2, t - 4, t * 0.7 - 4, ['#cfc6a8', '#c4bb9c', '#d6cdb0', '#bdb497'][Math.floor(rnd() * 4)], rnd, 4)
    }
    for (let i = 0; i < 22; i++) radial(c, rnd() * w, rnd() * h, 10 + rnd() * 16, [[0, 'rgba(90,150,60,.4)'], [1, 'rgba(0,0,0,0)']])
  } else if (cenario === 'masmorra') {
    c.fillStyle = '#23262f'; c.fillRect(0, 0, w, h)
    const t = Math.max(60, w / 7)
    for (let y = 0; y < h; y += t * 0.75) for (let x = 0; x < w; x += t) pedra(c, x + 2, y + 2, t - 4, t * 0.75 - 4, ['#454a57', '#3e4250', '#4b4f5b'][Math.floor(rnd() * 3)], rnd, 3)
    // runas tênues no centro
    c.save(); c.globalCompositeOperation = 'lighter'
    radial(c, w / 2, h / 2, Math.min(w, h) * 0.5, [[0, 'rgba(90,140,255,.14)'], [1, 'rgba(0,0,0,0)']])
    c.restore()
  } else {
    // madeira nobre com marchetaria dourada
    const g = c.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#4a2c19'); g.addColorStop(0.5, '#5c3720'); g.addColorStop(1, '#3a2213')
    c.fillStyle = g; c.fillRect(0, 0, w, h)
    for (let k = 0; k < 60; k++) { c.strokeStyle = `rgba(0,0,0,${0.08 + rnd() * 0.1})`; c.lineWidth = 1 + rnd() * 2; c.beginPath(); const y = rnd() * h; c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 40, w * 0.7, y + (rnd() - 0.5) * 40, w, y + (rnd() - 0.5) * 20); c.stroke() }
    c.strokeStyle = 'rgba(227,176,75,.55)'; c.lineWidth = 2
    c.strokeRect(14, 14, w - 28, h - 28)
    c.strokeStyle = 'rgba(227,176,75,.25)'; c.strokeRect(22, 22, w - 44, h - 44)
  }
  // luz central e bordas escuras: a mesa ganha profundidade
  c.save(); c.globalCompositeOperation = 'soft-light'
  radial(c, w / 2, h * 0.45, Math.max(w, h) * 0.6, [[0, 'rgba(255,240,210,.55)'], [1, 'rgba(0,0,0,0)']])
  c.restore()
  vinheta(c, w, h, 0.5)
}

/** Partículas do ambiente (vaga-lumes, brasas, poeira dourada). Leves e em baixa frequência. */
export function criarAmbiente(canvas: HTMLCanvasElement, cenario: Cenario) {
  const c = canvas.getContext('2d')
  if (!c) return () => {}
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const ajustar = () => { canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr) }
  ajustar()
  const n = cenario === 'campo' ? 26 : cenario === 'masmorra' ? 34 : 28
  const parts = Array.from({ length: n }, (_, i) => ({ x: Math.random(), y: Math.random(), v: 0.2 + Math.random() * 0.8, f: Math.random() * 6, i }))
  const luzes = cenario === 'masmorra' ? [[0.06, 0.22], [0.94, 0.22], [0.06, 0.74], [0.94, 0.74]] : cenario === 'salao' ? [[0.12, 0.1], [0.88, 0.1], [0.1, 0.9], [0.9, 0.9]] : []
  let quadro = 0, ultimo = 0, t = 0
  const passo = (agora: number) => {
    quadro = requestAnimationFrame(passo)
    if (agora - ultimo < 40 || document.hidden) return
    const dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora; t += dt
    const w = canvas.width, h = canvas.height
    c.clearRect(0, 0, w, h)
    c.globalCompositeOperation = 'lighter'
    for (const [px, py] of luzes) {
      const tremor = 0.75 + Math.sin(t * 7 + px * 10) * 0.12 + Math.sin(t * 13 + py * 7) * 0.08
      radial(c, w * px, h * py, Math.min(w, h) * 0.18 * tremor, [[0, `rgba(255,170,70,${0.28 * tremor})`], [1, 'rgba(0,0,0,0)']])
    }
    for (const p of parts) {
      if (cenario === 'masmorra') { p.y -= p.v * dt * 0.08; p.x += Math.sin(t + p.f) * dt * 0.01 }
      else if (cenario === 'campo') { p.x += Math.sin(t * 0.6 + p.f) * dt * 0.02; p.y += Math.cos(t * 0.5 + p.f) * dt * 0.015 }
      else { p.y += p.v * dt * 0.012; p.x += Math.sin(t * 0.3 + p.f) * dt * 0.006 }
      if (p.y < -0.02) p.y = 1.02
      if (p.y > 1.02) p.y = -0.02
      if (p.x < -0.02) p.x = 1.02
      if (p.x > 1.02) p.x = -0.02
      const brilho = cenario === 'campo' ? Math.max(0, Math.sin(t * 2 + p.f * 3)) : 0.6 + 0.4 * Math.sin(t * 3 + p.f)
      const cor = cenario === 'masmorra' ? (p.i % 3 ? '255,140,60' : '255,210,120') : cenario === 'campo' ? '230,255,140' : '255,225,150'
      const r = (cenario === 'masmorra' ? 2.2 : cenario === 'campo' ? 3.2 : 1.8) * dpr * (0.7 + p.v * 0.6)
      radial(c, p.x * w, p.y * h, r * 3, [[0, `rgba(${cor},${0.85 * brilho})`], [0.3, `rgba(${cor},${0.35 * brilho})`], [1, `rgba(${cor},0)`]])
      // toque de pixel: um quadradinho nítido no centro
      c.fillStyle = `rgba(255,255,230,${0.9 * brilho})`; c.fillRect(Math.round(p.x * w), Math.round(p.y * h), Math.ceil(dpr * 1.5), Math.ceil(dpr * 1.5))
    }
    c.globalCompositeOperation = 'source-over'
  }
  quadro = requestAnimationFrame(passo)
  window.addEventListener('resize', ajustar)
  return () => { cancelAnimationFrame(quadro); window.removeEventListener('resize', ajustar) }
}

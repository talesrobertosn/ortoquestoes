/**
 * Ambiente animado dos cenários (bokeh, poeira, brasas, vaga-lumes, folhas, chuva) e os
 * tipos de cena e clima. Separado de pintura.ts em 15/10/2026: o jogo precisa disto desde
 * o primeiro quadro, enquanto a pintura em código (cenas sem arte pintada e o estrado da
 * mesa, ~86 kB) vem num pedaço à parte, baixado durante a tela de carregamento.
 */
import type { Cenario } from '../motor/bestiario'
import { pintarFauna } from './fauna'

export type Cena = Cenario | 'biblioteca'

/** Arquitetura do tabuleiro de cada bioma (o desenho dela fica em tabuleiros.ts). */
export type Tabuleiro = 'mesa' | 'chao' | 'plataforma'
export const TABULEIRO: Record<Cenario, Tabuleiro> = {
  campo: 'chao', jardim: 'chao', coliseu: 'chao', treino: 'chao', templo: 'chao', caverna: 'chao',
  masmorra: 'mesa', salao: 'mesa', forja: 'mesa', catacumba: 'mesa', arquivo: 'mesa', laboratorio: 'mesa',
  torre: 'plataforma', passarela: 'plataforma', covil: 'plataforma',
}

export const LUZES: Record<Cena, Array<[number, number, string, number]>> = {
  // [x, y, cor, raio relativo]
  campo: [[0.12, 0.05, '255,236,190', 0.55], [0.1, 0.34, '255,170,80', 0.12], [0.9, 0.34, '255,170,80', 0.12], [0.1, 0.74, '255,170,80', 0.12], [0.9, 0.74, '255,170,80', 0.12]],
  masmorra: [[0.08, 0.3, '255,150,60', 0.2], [0.92, 0.3, '255,150,60', 0.2], [0.08, 0.72, '255,150,60', 0.2], [0.92, 0.72, '255,150,60', 0.2], [0.5, 0.15, '110,150,230', 0.4]],
  salao: [[0.08, 0.34, '255,180,90', 0.18], [0.92, 0.34, '255,180,90', 0.18], [0.08, 0.8, '255,180,90', 0.18], [0.92, 0.8, '255,180,90', 0.18], [0.5, 0.18, '255,215,150', 0.45]],
  biblioteca: [[0.16, 0.56, '255,180,90', 0.28], [0.86, 0.55, '255,180,90', 0.26], [0.5, 0.25, '150,180,240', 0.35]],
  covil: [[0.08, 0.34, '255,150,60', 0.18], [0.92, 0.34, '255,150,60', 0.18], [0.12, 0.8, '255,110,30', 0.3], [0.88, 0.8, '255,110,30', 0.3], [0.5, 0.4, '255,120,50', 0.35]],
  torre: [[0.78, 0.12, '150,180,240', 0.3], [0.1, 0.07, '255,180,90', 0.16], [0.9, 0.07, '255,180,90', 0.16], [0.5, 0.42, '255,200,160', 0.5]],
  forja: [[0.5, 0.26, '255,120,40', 0.5], [0.08, 0.6, '255,150,60', 0.16], [0.92, 0.6, '255,150,60', 0.16], [0.2, 0.5, '255,180,90', 0.12]],
  coliseu: [[0.5, 0.05, '255,190,120', 0.6], [0.5, 0.7, '255,220,170', 0.4]],
  jardim: [[0.3, 0.02, '255,245,210', 0.55], [0.5, 0.38, '170,230,255', 0.2]],
  laboratorio: [[0.18, 0.32, '80,240,190', 0.18], [0.82, 0.32, '80,240,190', 0.18], [0.12, 0.35, '120,150,255', 0.12], [0.88, 0.35, '120,150,255', 0.12], [0.5, 0.15, '140,220,230', 0.4]],
  caverna: [[0.5, 0.5, '90,230,220', 0.35], [0.06, 0.75, '170,110,255', 0.24], [0.93, 0.72, '110,210,255', 0.24], [0.5, 0.38, '170,110,255', 0.3]],
  templo: [[0.5, 0.13, '255,230,150', 0.4], [0.24, 0.5, '255,170,80', 0.14], [0.76, 0.5, '255,170,80', 0.14], [0.5, 0.75, '170,220,255', 0.18]],
  passarela: [[0.7, 0.05, '255,250,230', 0.6], [0.5, 0.95, '255,255,255', 0.35]],
  catacumba: [[0.24, 0.47, '255,180,90', 0.12], [0.76, 0.49, '255,180,90', 0.12], [0.14, 0.83, '255,180,90', 0.12], [0.88, 0.85, '255,180,90', 0.12], [0.5, 0.2, '120,150,230', 0.35]],
  treino: [[0.85, 0.02, '255,245,210', 0.6], [0.5, 0.6, '255,230,180', 0.3]],
  arquivo: [[0.5, 0.2, '120,140,255', 0.35], [0.5, 0.7, '110,150,255', 0.4], [0.17, 0.56, '255,180,90', 0.1], [0.83, 0.56, '255,180,90', 0.1]],
}

/** Ambiente HD-2D: bokeh suave, poeira na luz, brasas ou vaga-lumes. Baixa frequência. */
/** Sprite de poeira (miolo forte) ou de bokeh (disco suave), pintado uma vez por cor. */
const particulas = new Map<string, HTMLCanvasElement>()
function particula(cor: string, bokeh: boolean) {
  const chave = cor + (bokeh ? 'b' : 'p')
  let b = particulas.get(chave)
  if (!b) {
    b = document.createElement('canvas'); b.width = b.height = 48
    const c = b.getContext('2d')!
    const g = c.createRadialGradient(24, 24, 0, 24, 24, 24)
    g.addColorStop(0, `rgba(${cor},1)`); g.addColorStop(bokeh ? 0.8 : 0.4, `rgba(${cor},${bokeh ? 0.8 : 0.3})`); g.addColorStop(1, `rgba(${cor},0)`)
    c.fillStyle = g; c.fillRect(0, 0, 48, 48)
    particulas.set(chave, b)
  }
  return b
}

/** Clima do ato: o mesmo cenário em outra hora e tempo (dia, entardecer, noite com neblina, chuva). */
/** Cor da partícula ambiente de cada cena (brasas, pólen, esporos, poeira, faíscas, runas). */
const CORES_PARTICULA: Partial<Record<Cena, [string, string, number]>> = {
  covil: ['255,110,30', '255,220,120', 3], masmorra: ['255,130,50', '255,200,110', 3], campo: ['255,240,200', '210,255,150', 4],
  torre: ['255,240,250', '210,200,255', 3], forja: ['255,140,40', '255,230,140', 2], coliseu: ['255,225,180', '255,200,150', 3],
  jardim: ['255,200,230', '240,255,190', 2], laboratorio: ['120,255,210', '160,190,255', 3], caverna: ['170,255,170', '200,150,255', 2],
  templo: ['255,225,140', '255,250,210', 3], passarela: ['255,255,255', '220,235,255', 2], catacumba: ['170,200,255', '230,240,255', 3],
  treino: ['255,240,200', '230,210,150', 3], arquivo: ['150,180,255', '255,220,140', 3],
}
function corDaParticula(cena: Cena, i: number) {
  const k = CORES_PARTICULA[cena]
  if (!k) return '255,215,150'
  return i % k[2] === 0 ? k[1] : k[0]
}

export type Clima = 'dia' | 'entardecer' | 'noite' | 'chuva'
export const climaDoAndar = (andar: number): Clima => (['dia', 'entardecer', 'noite', 'chuva'] as const)[Math.floor((andar - 1) / 3) % 4]

export function criarAmbiente(canvas: HTMLCanvasElement, cena: Cena, clima: Clima = 'dia') {
  const c = canvas.getContext('2d')
  if (!c) return () => {}
  // poeira e bokeh são luz difusa: no celular, 1 pixel do canvas por pixel CSS basta
  const dpr = matchMedia('(pointer: coarse)').matches ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
  const ajustar = () => { canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr) }
  ajustar()
  const n = cena === 'masmorra' || cena === 'covil' || cena === 'forja' ? 38 : cena === 'biblioteca' ? 30 : cena === 'passarela' ? 44 : 32
  const sobe = cena === 'masmorra' || cena === 'covil' || cena === 'forja' || cena === 'caverna' || cena === 'laboratorio' || cena === 'catacumba'
  const parts = Array.from({ length: n }, (_, i) => ({ x: Math.random(), y: Math.random(), v: 0.2 + Math.random() * 0.8, f: Math.random() * 6, i, bokeh: i % 5 === 0 }))
  const luzes = LUZES[cena]
  // chuva: gotas finas em diagonal; noite: vaga-lumes esverdeados
  const gotas = clima === 'chuva' ? Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), v: 0.9 + Math.random() * 0.8, l: 0.02 + Math.random() * 0.025 })) : []
  // na floresta (campo) sempre há vaga-lumes; de noite, em toda cena aberta
  const floresta = cena === 'campo'
  const vagalumes = (clima === 'noite' && cena !== 'biblioteca') || floresta ? Array.from({ length: floresta && clima !== 'noite' ? 12 : 18 }, (_, i) => ({ x: Math.random(), y: 0.35 + Math.random() * 0.6, f: Math.random() * 6, i })) : []
  // Floresta das Fises: folhas que caem girando e borboletas que cruzam a clareira
  const folhas = floresta && clima !== 'chuva' ? Array.from({ length: 9 }, () => ({ x: Math.random(), y: Math.random(), v: 0.5 + Math.random() * 0.6, f: Math.random() * 6, cor: ['#c08a3a', '#9a6428', '#6c9a44', '#d8a24a'][Math.floor(Math.random() * 4)] })) : []
  const borboletas = floresta && clima !== 'chuva' && clima !== 'noite' ? Array.from({ length: 3 }, (_, i) => ({ x: Math.random(), y: 0.45 + Math.random() * 0.35, f: Math.random() * 6, dir: i % 2 ? 1 : -1, cor: ['#f2d16b', '#9fd6ff', '#f4a8c8'][i] })) : []
  let quadro = 0, ultimo = 0, t = 0
  const passo = (agora: number) => {
    quadro = requestAnimationFrame(passo)
    if (agora - ultimo < 40 || document.hidden) return
    const dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora; t += dt
    const w = canvas.width, h = canvas.height
    c.clearRect(0, 0, w, h)
    c.globalCompositeOperation = 'lighter'
    // tremor das chamas
    for (const [x, y, cor, r] of luzes) {
      if (cor.startsWith('255,236') || cor.startsWith('150') || cor.startsWith('110')) continue
      const tremor = 0.8 + Math.sin(t * 8 + x * 20) * 0.1 + Math.sin(t * 13 + y * 9) * 0.08
      const R = Math.max(w, h) * r * 0.7 * tremor
      c.globalAlpha = 0.3 * tremor
      c.drawImage(particula(cor, true), x * w - R, y * h - R, R * 2, R * 2)
      c.globalAlpha = 1
    }
    for (const p of parts) {
      if (sobe) { p.y -= p.v * dt * (cena === 'covil' || cena === 'forja' ? 0.09 : 0.06); p.x += Math.sin(t + p.f) * dt * 0.01 }
      else if (cena === 'passarela') { p.x += (0.08 + p.v * 0.08) * dt; p.y += Math.sin(t * 1.4 + p.f) * dt * 0.02 }
      else if (cena === 'jardim' || cena === 'treino') { p.x += (0.012 + Math.sin(t * 0.7 + p.f) * 0.014) * dt; p.y += (0.012 + p.v * 0.01) * dt }
      else if (cena === 'torre') { p.x += (0.03 + p.v * 0.03) * dt; p.y += Math.sin(t * 0.8 + p.f) * dt * 0.01 }
      else if (cena === 'campo') { p.x += (0.006 + Math.sin(t * 0.6 + p.f) * 0.01) * dt; p.y += (0.004 + Math.cos(t * 0.5 + p.f) * 0.008) * dt }
      else { p.y += p.v * dt * 0.008; p.x += Math.sin(t * 0.3 + p.f) * dt * 0.006 }
      if (p.y < -0.05) p.y = 1.05; if (p.y > 1.05) p.y = -0.05; if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05
      const brilho = 0.5 + 0.5 * Math.sin(t * 1.6 + p.f * 2)
      const cor = corDaParticula(cena, p.i)
      const r = p.bokeh ? (14 + p.v * 22) * dpr : (1.6 + p.v * 1.6) * dpr
      const a = p.bokeh ? 0.12 * brilho : 0.75 * brilho
      c.globalAlpha = a
      c.drawImage(particula(cor, p.bokeh), p.x * w - r, p.y * h - r, r * 2, r * 2)
      c.globalAlpha = 1
    }
    for (const v of vagalumes) {
      const x = (v.x + Math.sin(t * 0.4 + v.f) * 0.03) * w, y = (v.y + Math.cos(t * 0.5 + v.f * 2) * 0.03) * h
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + v.f * 3))
      const r = 6 * dpr
      c.globalAlpha = a
      c.drawImage(particula('200,255,140', false), x - r, y - r, r * 2, r * 2)
      c.globalAlpha = 1
    }
    c.globalCompositeOperation = 'source-over'
    // folhas: um losango de 2 tons que gira (a largura oscila), caindo em zigue-zague
    const px2 = Math.max(2, Math.round(2 * dpr))
    for (const fo of folhas) {
      fo.y += fo.v * dt * 0.05; fo.x += Math.sin(t * 1.3 + fo.f) * dt * 0.03
      if (fo.y > 1.05) { fo.y = -0.05; fo.x = Math.random() }
      const giro = Math.abs(Math.sin(t * 2.4 + fo.f))
      const x = Math.round(fo.x * w), y = Math.round(fo.y * h)
      c.fillStyle = fo.cor
      c.fillRect(x - Math.round(px2 * giro), y, Math.max(1, Math.round(px2 * 2 * giro)), px2)
      c.fillRect(x - Math.round(px2 * 0.5 * giro), y - px2, Math.max(1, Math.round(px2 * giro)), px2)
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - Math.round(px2 * giro), y + px2, Math.max(1, Math.round(px2 * 2 * giro)), Math.max(1, px2 >> 1))
    }
    // borboletas: corpo de 1 bloco e duas asas que batem (2 quadros), voo ondulado
    for (const b of borboletas) {
      b.x += b.dir * dt * 0.035; b.y += Math.sin(t * 2 + b.f) * dt * 0.04
      if (b.x > 1.08) b.x = -0.08; if (b.x < -0.08) b.x = 1.08
      const x = Math.round(b.x * w), y = Math.round(b.y * h)
      const aberta = Math.sin(t * 16 + b.f) > 0
      c.fillStyle = '#2a1a12'; c.fillRect(x, y - px2, px2, px2 * 2)
      c.fillStyle = b.cor
      if (aberta) { c.fillRect(x - px2 * 2, y - px2 * 2, px2 * 2, px2 * 2); c.fillRect(x + px2, y - px2 * 2, px2 * 2, px2 * 2); c.fillRect(x - px2, y, px2, px2); c.fillRect(x + px2, y, px2, px2) }
      else { c.fillRect(x - px2, y - px2 * 2, px2, px2 * 2); c.fillRect(x + px2, y - px2 * 2, px2, px2 * 2) }
    }
    pintarFauna(c, cena, clima, t, w, h, dpr)
    if (gotas.length) {
      c.strokeStyle = 'rgba(200, 222, 255, .55)'; c.lineWidth = Math.max(1, dpr)
      c.beginPath()
      for (const g of gotas) {
        g.y += g.v * dt; g.x -= g.v * dt * 0.18
        if (g.y > 1.05) { g.y = -0.05; g.x = Math.random() * 1.2 }
        if (g.x < -0.05) g.x += 1.1
        c.moveTo(g.x * w, g.y * h); c.lineTo((g.x + g.l * 0.18) * w, (g.y - g.l) * h)
      }
      c.stroke()
    }
  }
  quadro = requestAnimationFrame(passo)
  window.addEventListener('resize', ajustar)
  return () => { cancelAnimationFrame(quadro); window.removeEventListener('resize', ajustar) }
}

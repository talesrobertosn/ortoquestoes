/**
 * Palco de efeitos: um único canvas por cima da arena, que só anima enquanto
 * há partículas vivas (sem laço contínuo parado). Desenha projéteis com
 * rastro, fagulhas, ondas de choque, cortes, cura subindo, cacos de escudo e
 * confete. Coordenadas em pixels da janela (getBoundingClientRect).
 */

import { recurso } from '../../config'
import { VFX } from './vfxIndice'

type Ponto = { x: number; y: number }

/**
 * Efeito em pixel art (tiras assadas por scripts/sprites/vfx.py): toca os
 * quadros uma vez (ou em laço enquanto voa), em escala inteira, sem suavizar.
 */
interface Fx {
  nome: string; x: number; y: number; escala: number; angulo: number; espelhar: boolean
  t: number; atraso: number; vida: number; laco: boolean; alfa: number
  vx: number; vy: number; gravidade: number; giro: number; atrito: number
  /** Viagem de A a B (projéteis): resolve na chegada. */
  viagem?: { de: Ponto; para: Ponto; controle: Ponto; duracao: number; orientar: boolean; aoChegar: () => void; rastro?: string }
  brilho?: string
  /** Desliza de onde nasceu até `ate` em `em` segundos (aceleração, como uma mordida) e fica. */
  ate?: { de: Ponto; para: Ponto; em: number; curva: 'entra' | 'sai' }
  /** Some aos poucos nos últimos segundos. */
  some: number
}
/** Rasgo da espada gigante: uma linha de pixels que cruza a tela e se fecha. */
interface Rasgo { de: Ponto; para: Ponto; vida: number; total: number; px: number; cor: string; cor2: string; abre: number }

const imagensVfx = new Map<string, HTMLImageElement>()
function imagemVfx(nome: string) {
  let im = imagensVfx.get(nome)
  if (!im) {
    im = new Image()
    im.decoding = 'async'
    im.src = recurso(`flashcards/vfx/${nome}.png`)
    imagensVfx.set(nome, im)
  }
  return im
}
/** Baixa apenas a lista do andar. imagemVfx também carrega uma tira ao primeiro uso. */
export function precarregarVfx(nomes: string[] = []) {
  for (const n of nomes) if (VFX[n]) imagemVfx(n)
}
/** Tamanho do pixel do efeito na tela: 2 no celular, 3 no notebook, 4 em telas grandes. */
export function pixelVfx() {
  if (typeof window === 'undefined') return 3
  return Math.max(2, Math.min(4, Math.round(Math.min(window.innerWidth, window.innerHeight * 1.3) / 300)))
}

interface Particula {
  x: number; y: number; vx: number; vy: number
  vida: number; total: number
  tam: number; cor: string
  forma: 'brilho' | 'faisca' | 'quadrado' | 'caco' | 'confete' | 'lasca' | 'moeda'
  /** Partícula que é atraída para um ponto (carga de energia). */
  alvo?: Ponto
  gravidade: number; atrito: number
  giro?: number; angulo?: number
}

interface Raio { pts: Ponto[]; vida: number; total: number; cor: string; largura: number }
interface Onda { x: number; y: number; raio: number; max: number; vida: number; total: number; cor: string; largura: number }
interface Corte { x: number; y: number; raio: number; inicio: number; vida: number; total: number; cor: string; largura: number }
interface Clarao { x: number; y: number; raio: number; vida: number; total: number; cor: string; forca: number }
interface Projetil {
  de: Ponto; para: Ponto; controle: Ponto
  t: number; duracao: number; cor: string; nucleo: string; tam: number
  aoChegar: () => void; rastro: number; luz: number
}

export interface Intensidade { fator: number }

/**
 * Brilhos pré-renderizados: um gradiente radial por cor, desenhado uma vez num
 * canvas pequeno e depois só copiado e escalado. Mesmo visual, uma fração do
 * custo de criar centenas de gradientes por quadro (decisivo no celular).
 */
const brilhos = new Map<string, HTMLCanvasElement>()
export function brilho(cor: string, nucleoBranco = true) {
  const chave = cor + (nucleoBranco ? '+' : '')
  let b = brilhos.get(chave)
  if (!b) {
    b = document.createElement('canvas'); b.width = b.height = 64
    const c = b.getContext('2d')!
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
    if (nucleoBranco) { g.addColorStop(0, '#fff'); g.addColorStop(0.35, cor) } else g.addColorStop(0, cor)
    g.addColorStop(1, cor + '00')
    c.fillStyle = g; c.fillRect(0, 0, 64, 64)
    brilhos.set(chave, b)
  }
  return b
}
/** Celular: menos pixels no canvas de efeitos (o efeito é luz, não detalhe). */
const telaDeToque = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

export class Palco {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private particulas: Particula[] = []
  private ondas: Onda[] = []
  private cortes: Corte[] = []
  private projeteis: Projetil[] = []
  private claroes: Clarao[] = []
  private raios: Raio[] = []
  private fxs: Fx[] = []
  private rasgos: Rasgo[] = []
  private quadro = 0
  private anterior = 0
  private dpr = 1
  reduzido = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.canvas.style.visibility = 'hidden'
    this.redimensionar()
  }

  redimensionar() {
    this.dpr = Math.min(window.devicePixelRatio || 1, telaDeToque() ? 1 : 1.5)
    this.canvas.width = Math.round(window.innerWidth * this.dpr)
    this.canvas.height = Math.round(window.innerHeight * this.dpr)
  }

  /** Para tudo e limpa a tela (pular animação, sair da partida). */
  limpar() {
    this.particulas = []; this.ondas = []; this.cortes = []; this.claroes = []; this.raios = []; this.rasgos = []
    const chegadas = [...this.projeteis.map((p) => p.aoChegar), ...this.fxs.flatMap((f) => (f.viagem ? [f.viagem.aoChegar] : []))]
    this.fxs = []
    this.projeteis = []
    chegadas.forEach((f) => f())
    cancelAnimationFrame(this.quadro); this.quadro = 0
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.visibility = 'hidden'
  }

  private animar() {
    if (this.quadro) return
    // o canvas só entra na composição enquanto há efeito vivo (parado, é uma camada a menos por quadro)
    this.canvas.style.visibility = 'visible'
    this.anterior = performance.now()
    const passo = (agora: number) => {
      const dt = Math.min(50, agora - this.anterior) / 1000
      this.anterior = agora
      this.atualizar(dt)
      this.desenhar()
      const vivos = this.particulas.length + this.ondas.length + this.cortes.length + this.projeteis.length + this.claroes.length + this.raios.length + this.fxs.length + this.rasgos.length
      this.quadro = vivos ? requestAnimationFrame(passo) : 0
      if (!vivos) { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.canvas.style.visibility = 'hidden' }
    }
    this.quadro = requestAnimationFrame(passo)
  }

  private atualizar(dt: number) {
    // teto de partículas: num golpe enorme, as mais velhas saem primeiro (evita quadro travado)
    const teto = telaDeToque() ? 260 : 520
    if (this.particulas.length > teto) this.particulas.splice(0, this.particulas.length - teto)
    for (const p of this.particulas) {
      p.vida -= dt
      if (p.alvo) { p.vx += (p.alvo.x - p.x) * 30 * dt; p.vy += (p.alvo.y - p.y) * 30 * dt }
      p.vx *= Math.pow(p.atrito, dt * 60); p.vy *= Math.pow(p.atrito, dt * 60)
      p.vy += p.gravidade * dt
      p.x += p.vx * dt; p.y += p.vy * dt
      if (p.giro) p.angulo = (p.angulo ?? 0) + p.giro * dt
    }
    this.particulas = this.particulas.filter((p) => p.vida > 0)
    for (const o of this.ondas) { o.vida -= dt; o.raio = o.max * (1 - Math.pow(o.vida / o.total, 2)) }
    this.ondas = this.ondas.filter((o) => o.vida > 0)
    for (const c of this.cortes) c.vida -= dt
    for (const k of this.claroes) k.vida -= dt
    this.claroes = this.claroes.filter((k) => k.vida > 0)
    for (const r of this.raios) r.vida -= dt
    this.raios = this.raios.filter((r) => r.vida > 0)
    this.cortes = this.cortes.filter((c) => c.vida > 0)
    const chegaram: Projetil[] = []
    for (const p of this.projeteis) {
      p.t = Math.min(1, p.t + dt / p.duracao)
      const pos = bezier(p.de, p.controle, p.para, p.t)
      // rastro: brilhos soltos pelo caminho
      for (let k = 0; k < p.rastro; k++) {
        this.particulas.push({
          x: pos.x + (Math.random() - 0.5) * p.tam * 0.6, y: pos.y + (Math.random() - 0.5) * p.tam * 0.6,
          vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, vida: 0.35, total: 0.35,
          tam: p.tam * (0.25 + Math.random() * 0.35), cor: p.cor, forma: 'brilho', gravidade: 0, atrito: 0.9,
        })
      }
      if (p.t >= 1) chegaram.push(p)
    }
    this.projeteis = this.projeteis.filter((p) => p.t < 1)
    chegaram.forEach((p) => p.aoChegar())
    for (const r of this.rasgos) r.vida -= dt
    this.rasgos = this.rasgos.filter((r) => r.vida > 0)
    const chegou: Array<() => void> = []
    for (const f of this.fxs) {
      if (f.atraso > 0) { f.atraso -= dt; continue }
      f.t += dt
      if (f.viagem) {
        const v = f.viagem, u = Math.min(1, f.t / v.duracao)
        const a = bezier(v.de, v.controle, v.para, u)
        if (v.orientar) {
          // indo para a esquerda, espelha em vez de virar de cabeça para baixo (a luz continua no alto)
          const ang = Math.atan2(a.y - f.y, a.x - f.x)
          if (a.x !== f.x || a.y !== f.y) { f.espelhar = Math.cos(ang) < 0; f.angulo = f.espelhar ? ang - Math.PI : ang }
        } else f.angulo += f.giro * dt
        f.x = a.x; f.y = a.y
        if (v.rastro && Math.random() < 0.8) this.particulas.push({ x: f.x + (Math.random() - 0.5) * 8, y: f.y + (Math.random() - 0.5) * 8, vx: 0, vy: 0, vida: 0.28, total: 0.28, tam: f.escala * 1.5, cor: v.rastro, forma: 'quadrado', gravidade: 0, atrito: 1 })
        if (u >= 1) { chegou.push(v.aoChegar); f.vida = 0 }
      } else if (f.ate) {
        const u = Math.min(1, f.t / f.ate.em), e = f.ate.curva === 'entra' ? u * u * u : 1 - Math.pow(1 - u, 3)
        f.x = f.ate.de.x + (f.ate.para.x - f.ate.de.x) * e; f.y = f.ate.de.y + (f.ate.para.y - f.ate.de.y) * e
      } else {
        if (f.atrito < 1) { const k = Math.pow(f.atrito, dt * 60); f.vx *= k; f.vy *= k }
        f.vy += f.gravidade * dt
        f.x += f.vx * dt; f.y += f.vy * dt
        f.angulo += f.giro * dt
      }
    }
    this.fxs = this.fxs.filter((f) => f.atraso > 0 || f.t < f.vida)
    chegou.forEach((f) => f())
  }

  private desenhar() {
    const c = this.ctx, d = this.dpr
    c.setTransform(d, 0, 0, d, 0, 0)
    c.clearRect(0, 0, this.canvas.width, this.canvas.height)
    c.globalCompositeOperation = 'lighter'
    // clarões e a luz dos projéteis iluminam a mesa em volta
    // clarões: o brilho pré-pintado escalado (antes era um gradiente novo por quadro)
    for (const k of this.claroes) {
      const a = Math.pow(k.vida / k.total, 1.6) * k.forca
      c.globalAlpha = Math.min(1, a * 0.85)
      c.drawImage(brilho(k.cor, false), k.x - k.raio, k.y - k.raio, k.raio * 2, k.raio * 2)
    }
    c.globalAlpha = 1
    for (const p of this.projeteis) {
      const pos = bezier(p.de, p.controle, p.para, p.t)
      const r = p.luz
      c.globalAlpha = 0.33
      c.drawImage(brilho(p.cor, false), pos.x - r, pos.y - r, r * 2, r * 2)
      c.globalAlpha = 1
    }
    for (const o of this.ondas) {
      const a = o.vida / o.total
      c.strokeStyle = o.cor
      // halo: traço largo e fraco por baixo do traço fino (no lugar do shadowBlur, que pesa)
      c.globalAlpha = a * 0.25; c.lineWidth = (o.largura * a + 1) * 4
      c.beginPath(); c.arc(o.x, o.y, o.raio, 0, Math.PI * 2); c.stroke()
      c.globalAlpha = a; c.lineWidth = o.largura * a + 1
      c.beginPath(); c.arc(o.x, o.y, o.raio, 0, Math.PI * 2); c.stroke()
    }
    // raios: traço largo e fraco (halo) e núcleo branco, piscando
    for (const r of this.raios) {
      const a = r.vida / r.total
      const pisca = a > 0.3 || Math.floor(a * 40) % 2 === 0 ? 1 : 0.3
      c.lineJoin = 'round'; c.lineCap = 'round'
      for (const [larg, cor, alfa] of [[r.largura * 4, r.cor, 0.22], [r.largura * 1.6, r.cor, 0.9], [r.largura * 0.6, '#ffffff', 1]] as const) {
        c.globalAlpha = a * alfa * pisca; c.strokeStyle = cor; c.lineWidth = larg
        c.beginPath(); c.moveTo(r.pts[0].x, r.pts[0].y); for (const q of r.pts.slice(1)) c.lineTo(q.x, q.y); c.stroke()
      }
    }
    c.globalAlpha = 1
    c.shadowBlur = 0
    for (const k of this.cortes) {
      const prog = 1 - k.vida / k.total
      const fim = k.inicio + Math.PI * 1.1 * easeOut(Math.min(1, prog * 1.6))
      const comeco = k.inicio + Math.PI * 1.1 * easeOut(Math.max(0, prog * 1.6 - 0.6))
      const g = c.createLinearGradient(k.x - k.raio, k.y, k.x + k.raio, k.y)
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, k.cor); g.addColorStop(1, '#ffffff')
      c.globalAlpha = Math.min(1, (k.vida / k.total) * 2)
      c.strokeStyle = g; c.lineCap = 'round'
      const alfa = c.globalAlpha
      c.globalAlpha = alfa * 0.3; c.lineWidth = k.largura * 3
      c.beginPath(); c.arc(k.x, k.y, k.raio, comeco, fim); c.stroke()
      c.globalAlpha = alfa
      for (const [larg, r] of [[k.largura, k.raio], [k.largura * 0.45, k.raio * 0.86]] as const) {
        c.lineWidth = larg
        c.beginPath(); c.arc(k.x, k.y, r, comeco, fim); c.stroke()
      }
    }
    c.shadowBlur = 0
    for (const p of this.projeteis) {
      const pos = bezier(p.de, p.controle, p.para, p.t), r = p.tam * 2.2
      c.globalAlpha = 1
      c.drawImage(brilho(p.cor), pos.x - r, pos.y - r, r * 2, r * 2)
      c.drawImage(brilho(p.nucleo), pos.x - r * 0.5, pos.y - r * 0.5, r, r)
    }
    for (const p of this.particulas) {
      const a = Math.max(0, p.vida / p.total)
      c.globalAlpha = p.forma === 'confete' ? Math.min(1, a * 2) : a
      if (p.forma === 'brilho') {
        const r = p.tam * (0.6 + a * 0.6)
        c.drawImage(brilho(p.cor), p.x - r, p.y - r, r * 2, r * 2)
      } else if (p.forma === 'faisca') {
        c.strokeStyle = p.cor; c.lineWidth = p.tam * 0.5 * a + 0.6; c.lineCap = 'round'
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); c.stroke()
      } else {
        if (p.forma === 'confete') c.globalCompositeOperation = 'source-over'
        c.save(); c.translate(p.x, p.y); c.rotate(p.angulo ?? 0)
        c.fillStyle = p.cor
        if (p.forma === 'lasca') { c.globalCompositeOperation = 'source-over'; c.beginPath(); c.moveTo(-p.tam, -p.tam * 0.5); c.lineTo(p.tam * 0.7, -p.tam * 0.8); c.lineTo(p.tam, p.tam * 0.4); c.lineTo(-p.tam * 0.3, p.tam); c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.moveTo(p.tam * 0.7, -p.tam * 0.8); c.lineTo(p.tam, p.tam * 0.4); c.lineTo(-p.tam * 0.3, p.tam); c.closePath(); c.fill() }
        else if (p.forma === 'caco') { c.beginPath(); c.moveTo(-p.tam, -p.tam * 0.4); c.lineTo(p.tam, -p.tam * 0.7); c.lineTo(p.tam * 0.2, p.tam); c.closePath(); c.fill() }
        else if (p.forma === 'confete') c.fillRect(-p.tam / 2, -p.tam * 0.8, p.tam, p.tam * 1.6)
        else if (p.forma === 'moeda') {
          // moeda girando: a largura oscila com o ângulo; aro escuro e brilho
          c.globalCompositeOperation = 'source-over'
          const w = Math.max(0.25, Math.abs(Math.cos(p.angulo ?? 0))) * p.tam
          c.fillStyle = '#7a5214'; c.fillRect(-w / 2 - 1, -p.tam / 2 - 1, w + 2, p.tam + 2)
          c.fillStyle = '#f2c45a'; c.fillRect(-w / 2, -p.tam / 2, w, p.tam)
          c.fillStyle = '#fff1b0'; c.fillRect(-w / 2, -p.tam / 2, Math.max(1, w * 0.35), p.tam * 0.5)
        }
        else c.fillRect(-p.tam / 2, -p.tam / 2, p.tam, p.tam)
        c.restore()
        c.globalCompositeOperation = 'lighter'
      }
    }
    c.globalAlpha = 1
    c.globalCompositeOperation = 'source-over'
    this.desenharPixel(c)
  }

  /** Camada de pixel art: rasgos e efeitos assados, nítidos, por cima da luz. */
  private desenharPixel(c: CanvasRenderingContext2D) {
    if (!this.fxs.length && !this.rasgos.length) return
    c.imageSmoothingEnabled = false
    for (const r of this.rasgos) {
      const prog = 1 - r.vida / r.total
      // a linha se desenha rápido (20% do tempo), engrossa e se fecha em pixels
      const corre = Math.min(1, prog / 0.2)
      const larg = Math.max(1, Math.round((prog < 0.35 ? 1 + r.abre * Math.sin(Math.min(1, prog / 0.35) * Math.PI) : 1 - (prog - 0.35) / 0.65 * 0.9) * r.px * 2))
      const fx = r.de.x + (r.para.x - r.de.x) * corre, fy = r.de.y + (r.para.y - r.de.y) * corre
      const L = Math.hypot(fx - r.de.x, fy - r.de.y), passos = Math.ceil(L / r.px)
      c.globalAlpha = prog > 0.7 ? 1 - (prog - 0.7) / 0.3 : 1
      for (let i = 0; i <= passos; i++) {
        const t = i / Math.max(1, passos)
        const x = Math.round((r.de.x + (fx - r.de.x) * t) / r.px) * r.px, y = Math.round((r.de.y + (fy - r.de.y) * t) / r.px) * r.px
        c.fillStyle = r.cor2; c.fillRect(x - larg / 2 - r.px, y - larg / 2 - r.px, larg + r.px * 2, larg + r.px * 2)
      }
      for (let i = 0; i <= passos; i++) {
        const t = i / Math.max(1, passos)
        const x = Math.round((r.de.x + (fx - r.de.x) * t) / r.px) * r.px, y = Math.round((r.de.y + (fy - r.de.y) * t) / r.px) * r.px
        c.fillStyle = r.cor; c.fillRect(x - larg / 2, y - larg / 2, larg, larg)
      }
    }
    for (const f of this.fxs) {
      if (f.atraso > 0) continue
      const m = VFX[f.nome], im = imagemVfx(f.nome)
      if (!m || !im.complete || !im.naturalWidth) continue
      const k = f.laco ? Math.floor((f.t * 1000) / m.ms) % m.n : Math.min(m.n - 1, Math.floor((f.t / f.vida) * m.n))
      const a = f.some > 0 && f.vida - f.t < f.some ? Math.max(0, (f.vida - f.t) / f.some) : 1
      if (f.brilho) {
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 * a * f.alfa
        const r = Math.max(m.w, m.h) * f.escala * 0.9
        c.drawImage(brilho(f.brilho, false), f.x - r, f.y - r, r * 2, r * 2)
        c.globalCompositeOperation = 'source-over'
      }
      c.globalAlpha = a * f.alfa
      c.save()
      c.translate(Math.round(f.x), Math.round(f.y))
      if (f.angulo) c.rotate(f.angulo)
      if (f.espelhar) c.scale(-1, 1)
      c.drawImage(im, k * m.w, 0, m.w, m.h, -m.ancora[0] * f.escala, -m.ancora[1] * f.escala, m.w * f.escala, m.h * f.escala)
      c.restore()
    }
    c.globalAlpha = 1
    c.imageSmoothingEnabled = true
  }

  /** Toca um efeito de pixel art uma vez, no ponto dado. */
  efeito(nome: string, em: Ponto, o: { escala?: number; angulo?: number; espelhar?: boolean; atraso?: number; velocidade?: number; alfa?: number; brilho?: string; vx?: number; vy?: number; gravidade?: number; giro?: number; vida?: number; laco?: boolean; some?: number; atrito?: number; ate?: Ponto; em?: number; curva?: 'entra' | 'sai' } = {}) {
    const m = VFX[nome]
    if (this.reduzido || !m) return
    this.fxs.push({
      nome, x: em.x, y: em.y, escala: o.escala ?? pixelVfx(), angulo: o.angulo ?? 0, espelhar: !!o.espelhar,
      t: 0, atraso: o.atraso ?? 0, vida: o.vida ?? (m.n * m.ms) / 1000 / (o.velocidade ?? 1), laco: o.laco ?? false, alfa: o.alfa ?? 1,
      vx: o.vx ?? 0, vy: o.vy ?? 0, gravidade: o.gravidade ?? 0, giro: o.giro ?? 0, atrito: o.atrito ?? 1, brilho: o.brilho, some: o.some ?? 0,
      ate: o.ate ? { de: { ...em }, para: o.ate, em: o.em ?? 0.2, curva: o.curva ?? 'sai' } : undefined,
    })
    this.animar()
  }

  /** Projétil em pixel art de A a B (gira para o rumo, ou roda no próprio eixo). Resolve na chegada. */
  voar(nome: string, de: Ponto, para: Ponto, o: { duracao?: number; curva?: number; escala?: number; orientar?: boolean; giro?: number; rastro?: string; brilho?: string } = {}): Promise<void> {
    return new Promise((resolver) => {
      if (this.reduzido || !VFX[nome]) { resolver(); return }
      const curva = o.curva ?? 0.2
      const meio = { x: (de.x + para.x) / 2, y: (de.y + para.y) / 2 }
      const dx = para.x - de.x, dy = para.y - de.y
      const controle = { x: meio.x - dy * curva, y: meio.y + dx * curva - Math.abs(dx) * 0.1 }
      const duracao = o.duracao ?? 0.36
      this.fxs.push({
        nome, x: de.x, y: de.y, escala: o.escala ?? pixelVfx(), angulo: Math.atan2(dy, dx), espelhar: false,
        t: 0, atraso: 0, vida: duracao + 1, laco: true, alfa: 1, vx: 0, vy: 0, gravidade: 0, giro: o.giro ?? 0, atrito: 1, brilho: o.brilho, some: 0,
        viagem: { de, para, controle, duracao, orientar: o.orientar ?? true, aoChegar: resolver, rastro: o.rastro },
      })
      this.animar()
    })
  }

  /** Rasgo de pixels de A a B (a espada gigante do crítico). */
  rasgo(de: Ponto, para: Ponto, cor = '#ffffff', cor2 = '#ffcf4a', duracao = 0.62, abre = 2.4) {
    if (this.reduzido) return
    this.rasgos.push({ de, para, vida: duracao, total: duracao, px: pixelVfx(), cor, cor2, abre })
    this.animar()
  }

  /**
   * A espada gigante do herói atravessa a tela na diagonal, passando pelo
   * alvo, e deixa um rasgo de luz. Resolve quando a lâmina passa pelo alvo.
   */
  espadaGigante(alvo: Ponto, angulo = 0.42): Promise<void> {
    return new Promise((resolver) => {
      if (this.reduzido || !VFX.espada) { resolver(); return }
      const W = window.innerWidth, H = window.innerHeight
      const L = Math.hypot(W, H) * 0.75
      const ux = Math.cos(angulo), uy = Math.sin(angulo)
      const de = { x: alvo.x - ux * L, y: alvo.y - uy * L }, para = { x: alvo.x + ux * L * 0.9, y: alvo.y + uy * L * 0.9 }
      const px = pixelVfx(), escala = Math.max(3, Math.round(px * 1.7))
      const m = VFX.espada
      // a ponta lidera: o sprite (âncora no pomo) anda até a ponta passar do fim
      const duracao = 0.26
      let resolvido = false
      this.fxs.push({
        nome: 'espada', x: de.x, y: de.y, escala, angulo, espelhar: false, t: 0, atraso: 0, vida: duracao + 0.12, laco: false, alfa: 1,
        vx: (para.x - de.x) / duracao, vy: (para.y - de.y) / duracao, gravidade: 0, giro: 0, atrito: 1, brilho: '#fff1b0', some: 0.12,
      })
      // o rasgo segue a ponta
      const ponta = m.w * escala
      this.rasgo({ x: de.x + ux * ponta, y: de.y + uy * ponta }, { x: para.x + ux * ponta, y: para.y + uy * ponta }, '#ffffff', '#ffcf4a', 0.75, 2.6)
      // a ponta passa pelo alvo quando o pomo está a um comprimento de lâmina antes dele
      const t = Math.max(0, L - ponta) / (L * 1.9) * duracao * 1000
      window.setTimeout(() => { if (!resolvido) { resolvido = true; resolver() } }, Math.max(40, t))
      this.animar()
    })
  }

  /** Esfera de energia com rastro, em arco, de um ponto a outro. Resolve na chegada. */
  projetil(de: Ponto, para: Ponto, opcoes: { cor: string; nucleo?: string; tam?: number; duracao?: number; curva?: number; rastro?: number }): Promise<void> {
    return new Promise((resolver) => {
      if (this.reduzido) { resolver(); return }
      const curva = opcoes.curva ?? 0.35
      const meio = { x: (de.x + para.x) / 2, y: (de.y + para.y) / 2 }
      const dx = para.x - de.x, dy = para.y - de.y
      const controle = { x: meio.x - dy * curva, y: meio.y + dx * curva - Math.abs(dx) * 0.1 }
      this.projeteis.push({ de, para, controle, t: 0, duracao: opcoes.duracao ?? 0.42, cor: opcoes.cor, nucleo: opcoes.nucleo ?? opcoes.cor, tam: opcoes.tam ?? 14, aoChegar: resolver, rastro: opcoes.rastro ?? 3, luz: (opcoes.tam ?? 14) * 9 })
      // brilho de saída
      this.explosao(de, { cor: opcoes.cor, n: 8, forca: 120, tam: 6 })
      this.animar()
    })
  }

  explosao(em: Ponto, o: { cor: string; cor2?: string; n?: number; forca?: number; tam?: number; formas?: Particula['forma'][]; gravidade?: number }) {
    if (this.reduzido) return
    const n = o.n ?? 24
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2
      const v = (o.forca ?? 260) * (0.35 + Math.random() * 0.75)
      const forma = o.formas ? o.formas[i % o.formas.length] : i % 3 === 0 ? 'brilho' : 'faisca'
      this.particulas.push({
        x: em.x, y: em.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida: 0.45 + Math.random() * 0.45, total: 0.9,
        tam: (o.tam ?? 7) * (0.6 + Math.random() * 0.8), cor: i % 2 && o.cor2 ? o.cor2 : o.cor, forma,
        gravidade: o.gravidade ?? 380, atrito: 0.92, giro: (Math.random() - 0.5) * 12, angulo: Math.random() * 6,
      })
    }
    this.animar()
  }

  onda(em: Ponto, cor: string, max = 120, largura = 10) {
    if (this.reduzido) return
    this.ondas.push({ x: em.x, y: em.y, raio: 0, max, vida: 0.5, total: 0.5, cor, largura })
    this.animar()
  }

  corte(em: Ponto, cor: string, raio = 70, inicio = -2.3) {
    if (this.reduzido) return
    this.cortes.push({ x: em.x, y: em.y, raio, inicio, vida: 0.38, total: 0.38, cor, largura: 9 })
    this.animar()
  }

  /** Clarão localizado que ilumina a mesa por um instante. */
  clarao(em: Ponto, cor: string, raio = 260, forca = 1, duracao = 0.32) {
    if (this.reduzido) return
    this.claroes.push({ x: em.x, y: em.y, raio, vida: duracao, total: duracao, cor, forca })
    this.animar()
  }

  /** Energia se concentrando num ponto antes do disparo. */
  carga(em: Ponto, cor: string, n = 26, raio = 90) {
    if (this.reduzido) return
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = raio * (0.6 + Math.random() * 0.6)
      this.particulas.push({ x: em.x + Math.cos(a) * d, y: em.y + Math.sin(a) * d, vx: -Math.sin(a) * 60, vy: Math.cos(a) * 60, vida: 0.3 + Math.random() * 0.12, total: 0.42,
        tam: 4 + Math.random() * 5, cor, forma: 'brilho', gravidade: 0, atrito: 0.86, alvo: em })
    }
    this.clarao(em, cor, raio * 1.4, 0.6, 0.4)
  }

  /** Fragmentos de material (pedra, gesso, escama, metal) com peso e giro. */
  fragmentos(em: Ponto, cores: string[], n = 18, forca = 320) {
    if (this.reduzido) return
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.8
      const v = forca * (0.4 + Math.random() * 0.8)
      this.particulas.push({ x: em.x + (Math.random() - 0.5) * 30, y: em.y + (Math.random() - 0.5) * 30, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
        vida: 0.6 + Math.random() * 0.6, total: 1.2, tam: 3 + Math.random() * 6, cor: cores[i % cores.length], forma: 'lasca', gravidade: 900, atrito: 0.96,
        giro: (Math.random() - 0.5) * 18, angulo: Math.random() * 6 })
    }
    this.animar()
  }

  /** Garras do adversário: três cortes paralelos sobre o alvo. */
  garras(em: Ponto, cor = '#ff4a2a') {
    if (this.reduzido) return
    ;[-18, 0, 18].forEach((dx, k) => window.setTimeout(() => this.corte({ x: em.x + dx, y: em.y - 10 + k * 4 }, cor, 46, -0.6), k * 50))
  }

  /** Cura: brilhos verdes subindo de dentro do retrato. */
  subir(em: Ponto, cor: string, n = 22, largura = 50) {
    if (this.reduzido) return
    for (let i = 0; i < n; i++) {
      this.particulas.push({
        x: em.x + (Math.random() - 0.5) * largura, y: em.y + Math.random() * 20,
        vx: (Math.random() - 0.5) * 14, vy: -60 - Math.random() * 90, vida: 0.7 + Math.random() * 0.6, total: 1.3,
        tam: 5 + Math.random() * 6, cor, forma: i % 4 ? 'brilho' : 'quadrado', gravidade: -20, atrito: 0.98,
      })
    }
    this.animar()
  }

  /** Escudo destruído: cacos azuis voando. */
  cacos(em: Ponto, cor = '#9cc6ff') {
    this.explosao(em, { cor, cor2: '#e8f4ff', n: 18, forca: 300, tam: 9, formas: ['caco', 'caco', 'brilho'], gravidade: 600 })
  }

  confete(em: Ponto, n = 90) {
    if (this.reduzido) return
    const cores = ['#e3b04b', '#fff3c0', '#b48cf0', '#7fe08f', '#5fa8ff', '#ff7a5c']
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2
      const v = 300 + Math.random() * 420
      this.particulas.push({
        x: em.x, y: em.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida: 1.8 + Math.random() * 0.9, total: 2.7,
        tam: 6 + Math.random() * 5, cor: cores[i % cores.length], forma: 'confete', gravidade: 520, atrito: 0.95,
        giro: (Math.random() - 0.5) * 16, angulo: Math.random() * 6,
      })
    }
    this.animar()
  }

  /** Raio em zigue-zague de um ponto a outro, com ramos (Raio em cadeia, Tempestade). */
  raio(de: Ponto, para: Ponto, cor = '#9fe0ff', largura = 3, ramos = 2) {
    if (this.reduzido) return
    const caminho = (a: Ponto, b: Ponto, n: number, des: number) => {
      const pts = [a]
      for (let i = 1; i < n; i++) {
        const t = i / n, nx = -(b.y - a.y), ny = b.x - a.x, L = Math.hypot(nx, ny) || 1
        const d = (Math.random() - 0.5) * des
        pts.push({ x: a.x + (b.x - a.x) * t + (nx / L) * d, y: a.y + (b.y - a.y) * t + (ny / L) * d })
      }
      pts.push(b)
      return pts
    }
    const dist = Math.hypot(para.x - de.x, para.y - de.y)
    const pts = caminho(de, para, Math.max(6, Math.round(dist / 28)), Math.min(70, dist * 0.18))
    this.raios.push({ pts, vida: 0.32, total: 0.32, cor, largura })
    for (let k = 0; k < ramos; k++) {
      const q = pts[1 + Math.floor(Math.random() * (pts.length - 2))]
      const fim = { x: q.x + (Math.random() - 0.5) * 120, y: q.y + (Math.random() - 0.2) * 90 }
      this.raios.push({ pts: caminho(q, fim, 4, 30), vida: 0.22, total: 0.22, cor, largura: largura * 0.6 })
    }
    this.clarao(para, cor, 220, 0.9, 0.25)
    this.explosao(para, { cor, cor2: '#ffffff', n: 14, forca: 260, tam: 5, gravidade: 200 })
  }

  /** Chuva de moedas que pulam e caem (adversário vencido, tesouro). */
  moedas(em: Ponto, n = 14) {
    if (this.reduzido) return
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.8, v = 240 + Math.random() * 260
      this.particulas.push({ x: em.x, y: em.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida: 1 + Math.random() * 0.5, total: 1.5,
        tam: 7 + Math.random() * 4, cor: '#f2c45a', forma: 'moeda', gravidade: 900, atrito: 0.97, giro: 8 + Math.random() * 10, angulo: Math.random() * 6 })
    }
    this.animar()
  }

  /** Sopro de fogo contínuo de A até B (o Sopro do dragão). */
  sopro(de: Ponto, para: Ponto, cor: string, cor2: string, duracao = 0.55) {
    if (this.reduzido) return
    const passos = 12
    for (let k = 0; k < passos; k++) window.setTimeout(() => {
      for (let i = 0; i < 6; i++) {
        const dx = para.x - de.x, dy = para.y - de.y, L = Math.hypot(dx, dy) || 1
        const v = L / 0.42 * (0.8 + Math.random() * 0.4), abre = (Math.random() - 0.5) * 0.45
        const ang = Math.atan2(dy, dx) + abre
        this.particulas.push({ x: de.x, y: de.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida: 0.42, total: 0.42,
          tam: 14 + Math.random() * 16, cor: i % 2 ? cor : cor2, forma: 'brilho', gravidade: -60, atrito: 0.97 })
      }
      this.animar()
    }, (k * duracao * 1000) / passos)
  }

  /** Linhas de velocidade convergindo no alvo (golpe crítico, no estilo dos animes). */
  linhas(em: Ponto, cor = '#ffffff', n = 26) {
    if (this.reduzido) return
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.2, d = 260 + Math.random() * 160, v = 900 + Math.random() * 500
      this.particulas.push({ x: em.x + Math.cos(a) * d, y: em.y + Math.sin(a) * d, vx: -Math.cos(a) * v, vy: -Math.sin(a) * v, vida: 0.2, total: 0.2,
        tam: 5, cor, forma: 'faisca', gravidade: 0, atrito: 1 })
    }
    this.animar()
  }

  /** Dissolução do adversário derrotado: quadradinhos de pixel subindo. */
  dissolver(caixa: DOMRect, cores: string[]) {
    if (this.reduzido) return
    for (let i = 0; i < 70; i++) {
      this.particulas.push({
        x: caixa.left + Math.random() * caixa.width, y: caixa.top + Math.random() * caixa.height,
        vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 160, vida: 0.8 + Math.random() * 0.8, total: 1.6,
        tam: 4 + Math.random() * 5, cor: cores[i % cores.length], forma: 'quadrado', gravidade: -60, atrito: 0.97,
        giro: (Math.random() - 0.5) * 4,
      })
    }
    this.animar()
  }
}

function bezier(a: Ponto, b: Ponto, c: Ponto, t: number): Ponto {
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  const k = 0.35 * t + 0.65 * e
  const v = 1 - k
  return { x: v * v * a.x + 2 * v * k * b.x + k * k * c.x, y: v * v * a.y + 2 * v * k * b.y + k * k * c.y }
}
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export function centro(el: Element | null): Ponto {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

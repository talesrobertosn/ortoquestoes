/**
 * Palco de efeitos: um único canvas por cima da arena, que só anima enquanto
 * há partículas vivas (sem laço contínuo parado). Desenha projéteis com
 * rastro, fagulhas, ondas de choque, cortes, cura subindo, cacos de escudo e
 * confete. Coordenadas em pixels da janela (getBoundingClientRect).
 */

type Ponto = { x: number; y: number }

interface Particula {
  x: number; y: number; vx: number; vy: number
  vida: number; total: number
  tam: number; cor: string
  forma: 'brilho' | 'faisca' | 'quadrado' | 'caco' | 'confete'
  gravidade: number; atrito: number
  giro?: number; angulo?: number
}

interface Onda { x: number; y: number; raio: number; max: number; vida: number; total: number; cor: string; largura: number }
interface Corte { x: number; y: number; raio: number; inicio: number; vida: number; total: number; cor: string; largura: number }
interface Projetil {
  de: Ponto; para: Ponto; controle: Ponto
  t: number; duracao: number; cor: string; nucleo: string; tam: number
  aoChegar: () => void; rastro: number
}

export interface Intensidade { fator: number }

export class Palco {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private particulas: Particula[] = []
  private ondas: Onda[] = []
  private cortes: Corte[] = []
  private projeteis: Projetil[] = []
  private quadro = 0
  private anterior = 0
  private dpr = 1
  reduzido = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.redimensionar()
  }

  redimensionar() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(window.innerWidth * this.dpr)
    this.canvas.height = Math.round(window.innerHeight * this.dpr)
  }

  /** Para tudo e limpa a tela (pular animação, sair da partida). */
  limpar() {
    this.particulas = []; this.ondas = []; this.cortes = []
    const chegadas = this.projeteis.map((p) => p.aoChegar)
    this.projeteis = []
    chegadas.forEach((f) => f())
    cancelAnimationFrame(this.quadro); this.quadro = 0
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private animar() {
    if (this.quadro) return
    this.anterior = performance.now()
    const passo = (agora: number) => {
      const dt = Math.min(50, agora - this.anterior) / 1000
      this.anterior = agora
      this.atualizar(dt)
      this.desenhar()
      const vivos = this.particulas.length + this.ondas.length + this.cortes.length + this.projeteis.length
      this.quadro = vivos ? requestAnimationFrame(passo) : 0
      if (!vivos) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    this.quadro = requestAnimationFrame(passo)
  }

  private atualizar(dt: number) {
    for (const p of this.particulas) {
      p.vida -= dt
      p.vx *= Math.pow(p.atrito, dt * 60); p.vy *= Math.pow(p.atrito, dt * 60)
      p.vy += p.gravidade * dt
      p.x += p.vx * dt; p.y += p.vy * dt
      if (p.giro) p.angulo = (p.angulo ?? 0) + p.giro * dt
    }
    this.particulas = this.particulas.filter((p) => p.vida > 0)
    for (const o of this.ondas) { o.vida -= dt; o.raio = o.max * (1 - Math.pow(o.vida / o.total, 2)) }
    this.ondas = this.ondas.filter((o) => o.vida > 0)
    for (const c of this.cortes) c.vida -= dt
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
  }

  private desenhar() {
    const c = this.ctx, d = this.dpr
    c.setTransform(d, 0, 0, d, 0, 0)
    c.clearRect(0, 0, this.canvas.width, this.canvas.height)
    c.globalCompositeOperation = 'lighter'
    for (const o of this.ondas) {
      const a = o.vida / o.total
      c.strokeStyle = o.cor; c.globalAlpha = a; c.lineWidth = o.largura * a + 1
      c.shadowColor = o.cor; c.shadowBlur = 18
      c.beginPath(); c.arc(o.x, o.y, o.raio, 0, Math.PI * 2); c.stroke()
    }
    c.shadowBlur = 0
    for (const k of this.cortes) {
      const prog = 1 - k.vida / k.total
      const fim = k.inicio + Math.PI * 1.1 * easeOut(Math.min(1, prog * 1.6))
      const comeco = k.inicio + Math.PI * 1.1 * easeOut(Math.max(0, prog * 1.6 - 0.6))
      const g = c.createLinearGradient(k.x - k.raio, k.y, k.x + k.raio, k.y)
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, k.cor); g.addColorStop(1, '#ffffff')
      c.globalAlpha = Math.min(1, (k.vida / k.total) * 2)
      c.strokeStyle = g; c.lineCap = 'round'
      c.shadowColor = k.cor; c.shadowBlur = 24
      for (const [larg, r] of [[k.largura, k.raio], [k.largura * 0.45, k.raio * 0.86]] as const) {
        c.lineWidth = larg
        c.beginPath(); c.arc(k.x, k.y, r, comeco, fim); c.stroke()
      }
    }
    c.shadowBlur = 0
    for (const p of this.projeteis) {
      const pos = bezier(p.de, p.controle, p.para, p.t)
      const g = c.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, p.tam * 2.2)
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.18, p.nucleo); g.addColorStop(0.5, p.cor + 'aa'); g.addColorStop(1, p.cor + '00')
      c.globalAlpha = 1; c.fillStyle = g
      c.beginPath(); c.arc(pos.x, pos.y, p.tam * 2.2, 0, Math.PI * 2); c.fill()
    }
    for (const p of this.particulas) {
      const a = Math.max(0, p.vida / p.total)
      c.globalAlpha = p.forma === 'confete' ? Math.min(1, a * 2) : a
      if (p.forma === 'brilho') {
        const r = p.tam * (0.6 + a * 0.6)
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
        g.addColorStop(0, '#fff'); g.addColorStop(0.35, p.cor); g.addColorStop(1, p.cor + '00')
        c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill()
      } else if (p.forma === 'faisca') {
        c.strokeStyle = p.cor; c.lineWidth = p.tam * 0.5 * a + 0.6; c.lineCap = 'round'
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); c.stroke()
      } else {
        if (p.forma === 'confete') c.globalCompositeOperation = 'source-over'
        c.save(); c.translate(p.x, p.y); c.rotate(p.angulo ?? 0)
        c.fillStyle = p.cor
        if (p.forma === 'caco') { c.beginPath(); c.moveTo(-p.tam, -p.tam * 0.4); c.lineTo(p.tam, -p.tam * 0.7); c.lineTo(p.tam * 0.2, p.tam); c.closePath(); c.fill() }
        else if (p.forma === 'confete') c.fillRect(-p.tam / 2, -p.tam * 0.8, p.tam, p.tam * 1.6)
        else c.fillRect(-p.tam / 2, -p.tam / 2, p.tam, p.tam)
        c.restore()
        c.globalCompositeOperation = 'lighter'
      }
    }
    c.globalAlpha = 1
    c.globalCompositeOperation = 'source-over'
  }

  /** Esfera de energia com rastro, em arco, de um ponto a outro. Resolve na chegada. */
  projetil(de: Ponto, para: Ponto, opcoes: { cor: string; nucleo?: string; tam?: number; duracao?: number; curva?: number; rastro?: number }): Promise<void> {
    return new Promise((resolver) => {
      if (this.reduzido) { resolver(); return }
      const curva = opcoes.curva ?? 0.35
      const meio = { x: (de.x + para.x) / 2, y: (de.y + para.y) / 2 }
      const dx = para.x - de.x, dy = para.y - de.y
      const controle = { x: meio.x - dy * curva, y: meio.y + dx * curva - Math.abs(dx) * 0.1 }
      this.projeteis.push({ de, para, controle, t: 0, duracao: opcoes.duracao ?? 0.42, cor: opcoes.cor, nucleo: opcoes.nucleo ?? opcoes.cor, tam: opcoes.tam ?? 14, aoChegar: resolver, rastro: opcoes.rastro ?? 3 })
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

/**
 * Ataque próprio de cada arquétipo de adversário, agora em pixel art (tiras de
 * efeitos/vfxIndice.ts, pintadas por scripts/sprites/vfx.py). Cada estilo tem
 * um golpe COMUM e um CRÍTICO; o crítico é um "superpoder" com cara própria:
 *
 *   pedra     golem, escaravelho, ent        comum: pedra girando em arco · crítico: pedregulho cai do céu, chão racha
 *   veneno    serpente, leviatã, mão, cogumelo comum: cusparada de veneno · crítico: o bote (presas) e nuvem tóxica
 *   pancada   guardião, cavaleiro, rei        comum: onda de choque · crítico: pancada que racha o chão
 *   garra     raptor, goblin, aranha...       comum: três rasgos · crítico: rasgos gigantes por cima da tela
 *   mimico    mímico                          crítico: a tampa com dentes fecha na tela
 *   mergulho  harpia                          penas e garras
 *   magia     espectro, necromante            orbes em espiral · crítico: anel de orbes que se fecha
 *   feixe     arconte                         raio de energia em linha reta
 *   olhar     quimera (basilisco)             feixe amarelo dos olhos
 *   gosma     gosma                           bolota que espirra · crítico: a gosma escorre do alto da tela
 *   fogo      dragão                          bola de fogo-fátuo · crítico: sopro de chamas atravessando a arena
 *
 * A investida (o adversário cresce até o meio da tela e bate, com terremoto)
 * é coreografada pela Arena, que conhece o DOM; aqui ficam só os efeitos.
 */
import { pixelVfx, type Palco } from './palco'

type Ponto = { x: number; y: number }
export type Estilo = 'pedra' | 'veneno' | 'pancada' | 'garra' | 'mergulho' | 'magia' | 'feixe' | 'olhar' | 'gosma' | 'fogo' | 'mimico'

const ESTILO: Record<string, Estilo> = {
  golem: 'pedra', escaravelho: 'pedra', ent: 'pedra',
  serpente: 'veneno', leviata: 'veneno', mao: 'veneno', cogumelo: 'veneno',
  guardiao: 'pancada', cavaleiro: 'pancada', rei: 'pancada', esqueleto: 'pancada',
  raptor: 'garra', goblin: 'garra', aranha: 'garra', morcego: 'garra', corvo: 'garra', mimico: 'mimico',
  harpia: 'mergulho', espectro: 'magia', arconte: 'feixe', quimera: 'garra', gosma: 'gosma', dragao: 'fogo',
}

export function estiloDe(sprite: string, variante?: string): Estilo {
  if (sprite === 'quimera' && variante === 'basilisco') return 'olhar'
  return ESTILO[sprite] ?? 'garra'
}

/** Estilos cujo crítico começa com a investida (o adversário vem até o meio da tela e bate). */
export const INVESTIDA: Partial<Record<Estilo, 'pisao' | 'bote' | 'salto'>> = {
  pedra: 'pisao', pancada: 'pisao', gosma: 'salto', veneno: 'bote', garra: 'bote', mimico: 'salto', mergulho: 'bote',
}

export interface Impacto { cor: string; cor2: string; material: string[]; garras: boolean }

const IMPACTO: Record<Estilo, Impacto> = {
  pedra: { cor: '#d8cdb0', cor2: '#8a7a5a', material: ['#d9cdb0', '#a8977a', '#6a5e4a'], garras: false },
  veneno: { cor: '#8af05a', cor2: '#d0ff9a', material: ['#5fdc5a', '#2a8a3a', '#d0ff9a'], garras: false },
  pancada: { cor: '#ffd08a', cor2: '#ffffff', material: ['#b9c6d8', '#7a889f', '#f4f8ff'], garras: false },
  garra: { cor: '#ff5a3c', cor2: '#ffb090', material: ['#9fb0c8', '#f4f8ff', '#3f78c8'], garras: false },
  mimico: { cor: '#ff5a3c', cor2: '#ffd08a', material: ['#8a4e26', '#e8b03a', '#f4eedc'], garras: false },
  mergulho: { cor: '#ff7a5a', cor2: '#fff0e0', material: ['#b02c1e', '#f2b98e', '#ffffff'], garras: false },
  magia: { cor: '#b98aff', cor2: '#e8d8ff', material: ['#7fe0ff', '#b98aff', '#ffffff'], garras: false },
  feixe: { cor: '#7fe0ff', cor2: '#ffd76a', material: ['#9aa6b8', '#ffd76a', '#ffffff'], garras: false },
  olhar: { cor: '#f0ff6a', cor2: '#ffffff', material: ['#c8b890', '#f0ff6a', '#8a7a5a'], garras: false },
  gosma: { cor: '#7fe0a0', cor2: '#d8ffe8', material: ['#5fc88a', '#d8ffe8', '#2a8a5a'], garras: false },
  fogo: { cor: '#7fe0ff', cor2: '#e8ffff', material: ['#d9cdb0', '#7fe0ff', '#ffffff'], garras: false },
}

/** Projétil em pixel art de cada estilo (usado também quando o escudo bloqueia). */
export function projetilDoEstilo(estilo: Estilo, variante?: string): string | null {
  switch (estilo) {
    case 'pedra': return 'pedra'
    case 'veneno': return `gota-${variante === 'eletrica' ? 'eletrico' : 'veneno'}`
    case 'gosma': return `gota-${variante === 'acida' ? 'acida' : variante === 'rainha' ? 'rainha' : 'gosma'}`
    case 'fogo': return `bolafogo-${tomFogo(variante)}`
    case 'magia': return 'orbe'
    default: return null
  }
}

/** Tom do fogo do dragão e da gosma conforme a variante do bestiário. */
export const tomFogo = (variante?: string) => (variante === 'escarlate' ? 'escarlate' : variante === 'ancestral' ? 'ancestral' : 'fatuo')
const tomGosma = (variante?: string) => (variante === 'acida' ? 'acida' : variante === 'rainha' ? 'rainha' : 'gosma')
const tomVeneno = (variante?: string) => (variante === 'eletrica' ? 'eletrico' : 'veneno')
const COR_FOGO = { fatuo: ['#7fe6ff', '#e4fdff'], escarlate: ['#ffb43c', '#fff0a0'], ancestral: ['#d88cff', '#fbe4ff'] } as const

const pausa = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

export interface OpcoesAtaque {
  critico?: boolean
  /** De onde sai o sopro (a boca do dragão); sem ela, um pouco à frente do centro. */
  boca?: Ponto
  variante?: string
  /** A Arena treme a tela (força 0..1.6). */
  tremer?: (forca: number) => void
}

/** Sopro de chamas em pixel art de A até B (o crítico e o golpe carregado do dragão). */
export async function soprar(P: Palco, de: Ponto, para: Ponto, tom: 'fatuo' | 'escarlate' | 'ancestral', duracao = 0.7) {
  const px = pixelVfx()
  const dx = para.x - de.x, dy = para.y - de.y, L = Math.hypot(dx, dy) || 1
  const passos = 16
  for (let k = 0; k < passos; k++) {
    for (let i = 0; i < 2; i++) {
      const abre = (Math.random() - 0.5) * 0.32
      const ang = Math.atan2(dy, dx) + abre
      // com atrito 0,985 por quadro, a chama anda ~1,1 s de velocidade: chega ao alvo e se espalha nele
      const v = (L / 0.85) * (0.9 + Math.random() * 0.25)
      P.efeito(`labareda-${tom}`, { x: de.x + (Math.random() - 0.5) * 10, y: de.y + (Math.random() - 0.5) * 10 }, {
        escala: px * (0.75 + Math.random() * 0.45), vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, atrito: 0.985, gravidade: -30, vida: 0.5 + Math.random() * 0.14,
        brilho: k % 3 === 0 && i === 0 ? COR_FOGO[tom][0] : undefined,
      })
    }
    await pausa((duracao * 1000) / passos)
  }
}

/** Executa o golpe (com rajada) e resolve quando o último acerta. */
export async function atacar(P: Palco, estilo: Estilo, de: Ponto, para: Ponto, rajada = 1, o: OpcoesAtaque = {}): Promise<Impacto> {
  const imp = IMPACTO[estilo]
  const px = pixelVfx()
  const crit = !!o.critico
  const tremer = o.tremer ?? (() => {})
  const W = typeof window !== 'undefined' ? window.innerWidth : 1000
  for (let k = 0; k < Math.max(1, rajada); k++) {
    const ultimo = k === Math.max(1, rajada) - 1
    const desvio = { x: (k - (rajada - 1) / 2) * 16, y: 0 }
    const alvo = { x: para.x + desvio.x, y: para.y + desvio.y }
    const chao = { x: alvo.x, y: alvo.y + 46 }
    switch (estilo) {
      case 'pedra': {
        if (crit && k === 0) {
          // o pedregulho musgoso cai do alto da tela em cima do herói
          await P.voar('pedregulho', { x: alvo.x + 70, y: -120 }, alvo, { duracao: 0.42, curva: 0.05, escala: px * 1.6, orientar: false, giro: 7 })
          P.efeito('rachadura', chao, { escala: px * 1.4 })
          P.efeito('poeira', { x: chao.x - 50, y: chao.y }, { escala: px * 1.3, espelhar: true })
          P.efeito('poeira', { x: chao.x + 50, y: chao.y }, { escala: px * 1.3 })
          P.efeito('choque', chao, { escala: px * 1.2 })
          P.fragmentos(alvo, imp.material, 24, 420)
          for (let j = 0; j < 5; j++) P.efeito('pedra', alvo, { escala: px, vx: (Math.random() - 0.5) * 520, vy: -260 - Math.random() * 260, gravidade: 1400, giro: (Math.random() - 0.5) * 16, vida: 0.9, laco: true, some: 0.3 })
          tremer(1.5)
        } else {
          await P.voar('pedra', de, alvo, { duracao: 0.42, curva: -0.7, escala: px * 1.2, orientar: false, giro: -14 })
          P.efeito('faisca-ouro', alvo, { escala: px })
          P.efeito('poeira', chao, { escala: px })
          P.fragmentos(alvo, imp.material, 12, 320)
        }
        break
      }
      case 'veneno': {
        const tom = tomVeneno(o.variante)
        if (crit && k === 0) {
          // o bote: duas presas descem sobre o herói e injetam o veneno
          const esc = px * 0.9, topo = alvo.y - 64 * esc - 70
          P.efeito('presa', { x: alvo.x - 14 * esc, y: topo }, { escala: esc, ate: { x: alvo.x - 14 * esc, y: topo + 70 }, em: 0.18, curva: 'entra', vida: 0.55, some: 0.16 })
          P.efeito('presa', { x: alvo.x + 14 * esc, y: topo }, { escala: esc, espelhar: true, ate: { x: alvo.x + 14 * esc, y: topo + 70 }, em: 0.18, curva: 'entra', vida: 0.55, some: 0.16 })
          await pausa(230)
          P.efeito('faisca-sangue', alvo, { escala: px * 1.2 })
          P.efeito('nuvem-veneno', { x: alvo.x, y: alvo.y - 8 }, { escala: px * 1.3 })
          P.efeito(`respingo-${tom}`, chao, { escala: px * 1.3 })
          tremer(1)
        } else {
          await P.voar(`gota-${tom}`, de, alvo, { duracao: 0.24, curva: 0.08, escala: px * 1.3, rastro: tom === 'eletrico' ? '#ffe94a' : '#7ae04a' })
          P.efeito(`respingo-${tom}`, { x: alvo.x, y: alvo.y + 10 }, { escala: px })
        }
        break
      }
      case 'pancada': {
        P.linhas(alvo, '#fff1c2', crit ? 26 : 14)
        await pausa(110)
        P.efeito('choque', chao, { escala: px * (crit ? 1.6 : 1.1) })
        P.efeito('faisca-ouro', alvo, { escala: px * (crit ? 1.4 : 1) })
        if (crit) {
          P.efeito('rachadura', chao, { escala: px * 1.4 })
          P.efeito('poeira', { x: chao.x - 60, y: chao.y }, { escala: px * 1.3, espelhar: true })
          P.efeito('poeira', { x: chao.x + 60, y: chao.y }, { escala: px * 1.3 })
          tremer(1.4)
        }
        P.fragmentos(alvo, imp.material, crit ? 20 : 10, 320)
        break
      }
      case 'mimico':
      case 'garra': {
        if (crit && k === 0 && estilo === 'mimico') {
          // a tampa do baú com dentes fecha na tela inteira
          const esc = Math.max(2, Math.round(px * 1.5)), larg = 64 * esc, n = Math.ceil(W / larg) + 1
          const H = window.innerHeight, meio = H / 2
          for (let j = 0; j < n; j++) {
            const x = j * larg + larg / 2 - (n * larg - W) / 2
            P.efeito('mandibula', { x, y: -30 * esc }, { escala: esc, ate: { x, y: meio - 27 * esc }, em: 0.16, curva: 'entra', vida: 0.5, some: 0.2 })
            P.efeito('mandibula', { x, y: H + 30 * esc }, { escala: esc, angulo: Math.PI, ate: { x, y: meio + 27 * esc }, em: 0.16, curva: 'entra', vida: 0.5, some: 0.2 })
          }
          await pausa(170)
          P.efeito('faisca-sangue', alvo, { escala: px * 1.6 })
          tremer(1.3)
        } else if (crit && k === 0) {
          // rasgos gigantes de garra cruzando a tela por cima do herói
          P.linhas(alvo, '#ffe0d0', 18)
          await pausa(80)
          P.efeito('garras', alvo, { escala: px * 3.2, brilho: '#ff6a4a' })
          await pausa(140)
          P.efeito('faisca-sangue', alvo, { escala: px * 1.4 })
          tremer(1.2)
        } else {
          await pausa(70)
          P.efeito('garras', alvo, { escala: px * 1.3, espelhar: k % 2 === 1 })
          await pausa(90)
          P.efeito('faisca-sangue', alvo, { escala: px * 0.9 })
        }
        break
      }
      case 'mergulho': {
        const alto = { x: alvo.x + 60, y: Math.min(de.y, alvo.y) - 160 }
        for (let j = 0; j < (crit ? 10 : 4); j++) P.efeito('pena', { x: alto.x + (Math.random() - 0.5) * 80, y: alto.y + Math.random() * 60 }, { escala: px, vx: (Math.random() - 0.5) * 160, vy: 80 + Math.random() * 120, gravidade: 60, giro: (Math.random() - 0.5) * 8, vida: 1, laco: true, some: 0.4 })
        await pausa(160)
        P.efeito('garras', alvo, { escala: px * (crit ? 2.4 : 1.3) })
        P.efeito('faisca-sangue', alvo, { escala: px })
        if (crit) tremer(1)
        break
      }
      case 'magia': {
        const n = crit ? 6 : 3
        const orbes = Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2
          const ini = crit ? { x: alvo.x + Math.cos(a) * 180, y: alvo.y + Math.sin(a) * 140 } : de
          return P.voar('orbe', ini, alvo, { duracao: 0.42 + i * 0.05, curva: crit ? 0.4 : -0.7 + i * 0.7, escala: px * 1.3, orientar: false, brilho: '#b98aff' })
        })
        await Promise.all(orbes)
        P.efeito('faisca-arcano', alvo, { escala: px * (crit ? 1.5 : 1.1) })
        P.clarao(alvo, '#b98aff', 220, 0.8)
        if (crit) tremer(1)
        break
      }
      case 'feixe': {
        P.carga(de, '#7fe0ff', 14, 60)
        await pausa(160)
        P.raio(de, alvo, '#9fe8ff', crit ? 8 : 5, crit ? 3 : 1)
        P.raio(de, alvo, '#ffd76a', 2, 0)
        P.efeito('faisca-azul', alvo, { escala: px * (crit ? 1.5 : 1) })
        break
      }
      case 'olhar': {
        P.clarao(de, '#f0ff6a', 140, 0.8, 0.3)
        await pausa(140)
        P.raio({ x: de.x + 10, y: de.y - 20 }, alvo, '#f0ff6a', crit ? 7 : 4, 0)
        P.raio({ x: de.x + 16, y: de.y - 20 }, alvo, '#ffffff', 1.5, 0)
        P.efeito('faisca-ouro', alvo, { escala: px * (crit ? 1.5 : 1) })
        break
      }
      case 'gosma': {
        const tom = tomGosma(o.variante)
        await P.voar(`gota-${tom}`, de, alvo, { duracao: 0.4, curva: -0.6, escala: px * (crit ? 2.2 : 1.5), orientar: true })
        P.efeito(`respingo-${tom}`, { x: alvo.x, y: alvo.y + 14 }, { escala: px * (crit ? 1.8 : 1.1) })
        if (crit) {
          // a gosma escorre do alto da tela, por cima de tudo
          const n = Math.max(4, Math.round(W / 170))
          for (let j = 0; j < n; j++) P.efeito(`escorre-${tom}`, { x: ((j + 0.5) / n) * W + (Math.random() - 0.5) * 50, y: 0 }, { escala: px * (1.4 + Math.random() * 0.8), atraso: Math.random() * 0.25, vida: 1.1, some: 0.35 })
          tremer(1)
        }
        break
      }
      case 'fogo': {
        const tom = tomFogo(o.variante)
        if (crit && k === 0) {
          await soprar(P, o.boca ?? { x: de.x - 40, y: de.y - 10 }, alvo, tom, 0.7)
          P.efeito(`faisca-${tom === 'fatuo' ? 'azul' : tom === 'ancestral' ? 'arcano' : 'fogo'}`, alvo, { escala: px * 1.5 })
          tremer(1.1)
        } else {
          await P.voar(`bolafogo-${tom}`, de, alvo, { duracao: 0.38, curva: -0.25, escala: px * 1.3, brilho: COR_FOGO[tom][0] })
          for (let j = 0; j < 3; j++) P.efeito(`labareda-${tom}`, { x: alvo.x + (j - 1) * 18, y: alvo.y + 4 }, { escala: px, atraso: j * 0.05, vy: -40 })
        }
        break
      }
    }
    if (!ultimo) await pausa(70)
  }
  return imp
}

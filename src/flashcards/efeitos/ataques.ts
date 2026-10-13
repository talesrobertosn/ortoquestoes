/**
 * Ataque próprio de cada arquétipo de adversário (antes, todos lançavam a mesma
 * esfera com outra cor). A trajetória parte do adversário e chega ao herói;
 * o impacto devolve a cor e o material para a reação do alvo.
 *
 *   pedra     golem, escaravelho, ent        pedra arremessada em arco, estilhaços
 *   veneno    serpente, leviatã, mão          investida reta e rápida, respingo verde
 *   pancada   guardião, cavaleiro, rei        sem projétil: linhas de velocidade e onda de choque
 *   garra     raptor, goblin, aranha, morcego, corvo, mímico   cortes em sequência
 *   mergulho  harpia                          desce do alto, penas
 *   magia     espectro, necromante            orbes em espiral
 *   feixe     arconte                         raio de energia em linha reta
 *   olhar     quimera (basilisco)             feixe amarelo dos olhos
 *   gosma     gosma                           bolota em arco que espirra
 *   fogo      dragão                          bola de fogo-fátuo (o sopro é o golpe carregado)
 */
import type { Palco } from './palco'

type Ponto = { x: number; y: number }
export type Estilo = 'pedra' | 'veneno' | 'pancada' | 'garra' | 'mergulho' | 'magia' | 'feixe' | 'olhar' | 'gosma' | 'fogo'

const ESTILO: Record<string, Estilo> = {
  golem: 'pedra', escaravelho: 'pedra', ent: 'pedra',
  serpente: 'veneno', leviata: 'veneno', mao: 'veneno',
  guardiao: 'pancada', cavaleiro: 'pancada', rei: 'pancada', esqueleto: 'pancada',
  raptor: 'garra', goblin: 'garra', aranha: 'garra', morcego: 'garra', corvo: 'garra', mimico: 'garra',
  harpia: 'mergulho', espectro: 'magia', arconte: 'feixe', quimera: 'garra', gosma: 'gosma', dragao: 'fogo',
}

export function estiloDe(sprite: string, variante?: string): Estilo {
  if (sprite === 'quimera' && variante === 'basilisco') return 'olhar'
  return ESTILO[sprite] ?? 'garra'
}

export interface Impacto { cor: string; cor2: string; material: string[]; garras: boolean }

const IMPACTO: Record<Estilo, Impacto> = {
  pedra: { cor: '#d8cdb0', cor2: '#8a7a5a', material: ['#d9cdb0', '#a8977a', '#6a5e4a'], garras: false },
  veneno: { cor: '#8af05a', cor2: '#d0ff9a', material: ['#5fdc5a', '#2a8a3a', '#d0ff9a'], garras: false },
  pancada: { cor: '#ffd08a', cor2: '#ffffff', material: ['#b9c6d8', '#7a889f', '#f4f8ff'], garras: false },
  garra: { cor: '#ff5a3c', cor2: '#ffb090', material: ['#9fb0c8', '#f4f8ff', '#3f78c8'], garras: true },
  mergulho: { cor: '#ff7a5a', cor2: '#fff0e0', material: ['#b02c1e', '#f2b98e', '#ffffff'], garras: true },
  magia: { cor: '#b98aff', cor2: '#e8d8ff', material: ['#7fe0ff', '#b98aff', '#ffffff'], garras: false },
  feixe: { cor: '#7fe0ff', cor2: '#ffd76a', material: ['#9aa6b8', '#ffd76a', '#ffffff'], garras: false },
  olhar: { cor: '#f0ff6a', cor2: '#ffffff', material: ['#c8b890', '#f0ff6a', '#8a7a5a'], garras: false },
  gosma: { cor: '#7fe0a0', cor2: '#d8ffe8', material: ['#5fc88a', '#d8ffe8', '#2a8a5a'], garras: false },
  fogo: { cor: '#7fe0ff', cor2: '#e8ffff', material: ['#d9cdb0', '#7fe0ff', '#ffffff'], garras: false },
}

const pausa = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/** Executa o golpe (com rajada) e resolve quando o último acerta. */
export async function atacar(P: Palco, estilo: Estilo, de: Ponto, para: Ponto, rajada = 1): Promise<Impacto> {
  const imp = IMPACTO[estilo]
  for (let k = 0; k < Math.max(1, rajada); k++) {
    const ultimo = k === Math.max(1, rajada) - 1
    const desvio = { x: (k - (rajada - 1) / 2) * 16, y: 0 }
    const alvo = { x: para.x + desvio.x, y: para.y + desvio.y }
    switch (estilo) {
      case 'pedra': {
        await P.projetil(de, alvo, { cor: '#a8977a', nucleo: '#e8dcc0', tam: 18, duracao: 0.42, curva: -0.75, rastro: 2 })
        P.fragmentos(alvo, imp.material, 16, 360)
        P.onda({ x: alvo.x, y: alvo.y + 20 }, '#c8b890', 90, 12)
        break
      }
      case 'veneno': {
        await P.projetil(de, alvo, { cor: '#5fdc5a', nucleo: '#e0ffc0', tam: 13, duracao: 0.2, curva: 0.05, rastro: 7 })
        P.explosao(alvo, { cor: '#7af05a', cor2: '#2a8a3a', n: 20, forca: 220, tam: 7, formas: ['quadrado', 'brilho'], gravidade: 700 })
        break
      }
      case 'pancada': {
        P.linhas(alvo, '#fff1c2', 18)
        await pausa(120)
        P.onda(alvo, '#ffd08a', 150, 18)
        P.onda(alvo, '#ffffff', 90, 8)
        P.fragmentos(alvo, imp.material, 12, 300)
        break
      }
      case 'garra': {
        P.linhas(alvo, '#ffe0d0', 10)
        await pausa(90)
        P.corte(alvo, '#ff4a2a', 58, -0.7 + k * 0.5)
        break
      }
      case 'mergulho': {
        const alto = { x: alvo.x + 60, y: Math.min(de.y, alvo.y) - 160 }
        await P.projetil(alto, alvo, { cor: '#ff7a5a', nucleo: '#fff0e0', tam: 14, duracao: 0.24, curva: 0.15, rastro: 6 })
        P.explosao(alvo, { cor: '#b02c1e', cor2: '#fff0e0', n: 14, forca: 200, tam: 9, formas: ['caco', 'lasca'], gravidade: 120 })
        break
      }
      case 'magia': {
        const orbes = [0, 1, 2].map((i) => P.projetil(de, alvo, { cor: i === 1 ? '#7fe0ff' : '#b98aff', nucleo: '#ffffff', tam: 11, duracao: 0.46 + i * 0.07, curva: -0.7 + i * 0.7, rastro: 5 }))
        await Promise.all(orbes)
        P.clarao(alvo, '#b98aff', 220, 0.9)
        P.explosao(alvo, { cor: '#b98aff', cor2: '#7fe0ff', n: 24, forca: 260, gravidade: 0 })
        break
      }
      case 'feixe': {
        P.carga(de, '#7fe0ff', 14, 60)
        await pausa(160)
        P.raio(de, alvo, '#9fe8ff', 5, 1)
        P.raio(de, alvo, '#ffd76a', 2, 0)
        P.onda(alvo, '#7fe0ff', 120, 12)
        break
      }
      case 'olhar': {
        P.clarao(de, '#f0ff6a', 140, 0.8, 0.3)
        await pausa(140)
        P.raio({ x: de.x + 10, y: de.y - 20 }, alvo, '#f0ff6a', 4, 0)
        P.raio({ x: de.x + 16, y: de.y - 20 }, alvo, '#ffffff', 1.5, 0)
        P.explosao(alvo, { cor: '#f0ff6a', cor2: '#c8b890', n: 16, forca: 180, formas: ['lasca', 'quadrado'], gravidade: 500 })
        break
      }
      case 'gosma': {
        await P.projetil(de, alvo, { cor: '#5fc88a', nucleo: '#d8ffe8', tam: 17, duracao: 0.4, curva: -0.6, rastro: 3 })
        P.explosao(alvo, { cor: '#7fe0a0', cor2: '#d8ffe8', n: 22, forca: 260, tam: 10, formas: ['brilho', 'quadrado'], gravidade: 900 })
        break
      }
      default: {
        await P.projetil(de, alvo, { cor: '#5fd8e0', nucleo: '#e8ffff', tam: 16, duracao: 0.34, curva: -0.3, rastro: 5 })
      }
    }
    if (!ultimo) await pausa(70)
  }
  return imp
}

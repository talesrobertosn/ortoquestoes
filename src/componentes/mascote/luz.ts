import type { CSSProperties } from 'react'
import { urlCss } from '../../config'
import type { Periodo } from '../../estado/aparencia'
import './Luz.css'

/*
 * A luz das cenas nos bichos (01/11/2026, o "ray tracing" dos mascotes; plano em docs/design/MASCOTES.md).
 * Cada folha de sprite tem quatro mapas (scripts/sprites/luz_bichos.py): a luz quente e a sombra fria, vindas da
 * esquerda ou da direita, já em faixas de pixel art. Aqui cada cena diz onde estão as suas luzes (a fogueira, as
 * chamas, o sol, a lua) e cada bicho descobre de que lado vem a mais forte e com que força; Luz.css põe as duas
 * camadas por cima do sprite, no mesmo quadro da animação, e estica a sombra no chão para longe da luz.
 */

/** Uma luz da cena, em pixels da arte. `alcance` é até onde ela ainda acende alguma coisa. */
export type Luz = { x: number; y: number; forca: number; alcance: number; tipo?: 'fogo' | 'sol' | 'lua' | 'azul' | 'arcana' }

const COM_MAPA = /(esqueleto|esqueleto-poses|esqueleto-poses2|esqueleto-acesso|gato-fofo|coruja-nova)\.png/

/** As variáveis com os quatro mapas de luz de uma folha (vazio se a folha ainda não tem mapa). */
export function mapasDeLuz(src: string): CSSProperties {
  const [caminho, versao] = src.replace(/^\//, '').split('?')
  if (!COM_MAPA.test(caminho)) return {}
  const mapa = (sufixo: string) => urlCss(caminho.replace('.png', `-luz-${sufixo}.png`) + (versao ? `?${versao}` : ''))
  return { '--mapa-qe': mapa('qe'), '--mapa-qd': mapa('qd'), '--mapa-fe': mapa('fe'), '--mapa-fd': mapa('fd') } as CSSProperties
}

/** A sombra fria de fundo de cada hora: à noite o lado de costas para a luz fica bem azul; de manhã, quase nada. */
const FRIO: Record<Periodo, number> = { manha: 0.18, tarde: 0.32, noite: 0.52 }

/**
 * A luz num bicho que está em (x, y) da arte: de que lado vem a luz mais forte, com que força e para onde vai a
 * sombra. Devolve a classe e as variáveis para pôr no elemento do bicho (os sprites dentro dele herdam).
 */
export function luzNoBicho(x: number, y: number, luzes: readonly Luz[], periodo: Periodo): { className: string; style: CSSProperties } {
  let melhor: { luz: Luz; f: number } | null = null
  for (const luz of luzes) {
    const d = Math.hypot(luz.x - x, (luz.y - y) * 1.3)
    const f = luz.forca * Math.max(0, 1 - d / luz.alcance) ** 1.2
    if (!melhor || f > melhor.f) melhor = { luz, f }
  }
  const forca = Math.min(1, melhor?.f ?? 0)
  const lado = melhor && melhor.luz.x < x ? 'esq' : 'dir'
  // Quanto mais perto e mais forte a luz, mais curta e mais firme a sombra; longe dela, comprida e fraca.
  const dx = melhor ? Math.max(-1, Math.min(1, (x - melhor.luz.x) / 90)) : 0
  return {
    className: `bicho-luz luz-${lado} luz-${melhor?.luz.tipo ?? 'fogo'}`,
    style: {
      '--luz-q': (0.18 + forca * 0.82).toFixed(2),
      '--luz-f': FRIO[periodo].toFixed(2),
      '--sombra-x': dx.toFixed(2),
      '--sombra-forca': (forca > 0.05 ? 0.18 + forca * 0.3 : 0.14).toFixed(2),
    } as CSSProperties,
  }
}

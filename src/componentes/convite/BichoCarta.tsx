import type { CSSProperties } from 'react'
import { urlCss } from '../../config'
import type { Bicho } from './regras'

/**
 * O bicho que entrega a carta (12/11/2026): a coruja ou o gato, em pixel art, de pé na borda de cima da carta.
 * As folhas são de scripts/sprites/convite_bichos.py: gato-convite.png (64 x 64, o chão em y = 46, o rabo pendura
 * para fora da borda) e coruja-convite.png (44 x 32, o desenho do Tales no PixelLab com a cartinha no bico).
 * Só o desenho (aria-hidden); quem decide a fase é a carta.
 */

/** O momento da cena: chegar andando, entregar, ficar, reagir aos botões e ir embora. */
export type Fase = 'chegando' | 'entregando' | 'esperando' | 'olhando' | 'feliz' | 'levantando' | 'saindo'

interface Movimento { linha: number; quadros: number; dur: number; vezes?: 'uma' | 'volta' }
interface Folha {
  src: string; w: number; h: number; colunas: number
  /** Ampliação inteira (os pixels ficam iguais): a coruja é desenhada menor, então cresce mais para ter o tamanho do gato. */
  esc: number
  /** Linha (em pixels do quadro) onde o bicho pisa: fica alinhada com a borda de cima da carta. */
  chao: number
  /** Onde a cartinha está na boca ou no bico, ao chegar (pixels do quadro). */
  boca: [number, number]
  fases: Record<Fase, Movimento>
}

export const FOLHAS: Record<Bicho, Folha> = {
  gato: {
    src: 'pixel/mascote/gato-convite.png?v=1', w: 64, h: 64, colunas: 6, esc: 2, chao: 46, boca: [44, 32],
    fases: {
      chegando: { linha: 0, quadros: 6, dur: 0.7 },
      entregando: { linha: 1, quadros: 6, dur: 0.66, vezes: 'uma' },
      esperando: { linha: 2, quadros: 6, dur: 1.5 },
      olhando: { linha: 3, quadros: 6, dur: 1.8 },
      feliz: { linha: 4, quadros: 6, dur: 0.9 },
      levantando: { linha: 1, quadros: 6, dur: 0.5, vezes: 'volta' },
      saindo: { linha: 5, quadros: 6, dur: 0.7 },
    },
  },
  coruja: {
    src: 'pixel/mascote/coruja-convite.png?v=1', w: 44, h: 32, colunas: 5, esc: 3, chao: 31, boca: [25, 17],
    fases: {
      chegando: { linha: 0, quadros: 4, dur: 0.56 },
      entregando: { linha: 3, quadros: 5, dur: 0.7 },
      esperando: { linha: 1, quadros: 5, dur: 1.4 },
      olhando: { linha: 2, quadros: 5, dur: 1.5 },
      feliz: { linha: 3, quadros: 5, dur: 0.7 },
      levantando: { linha: 4, quadros: 5, dur: 0.4 },
      saindo: { linha: 4, quadros: 5, dur: 0.4 },
    },
  },
}

export function BichoCarta({ bicho, fase }: { bicho: Bicho; fase: Fase }) {
  const f = FOLHAS[bicho]
  const m = f.fases[fase]
  return (
    <span className={`cvc-bicho cvc-bicho--${bicho} cvc-bicho--${fase}`} aria-hidden="true"
      style={{ '--chao': f.chao, '--w': f.w, '--h': f.h, '--esc': f.esc } as CSSProperties}>
      <span
        key={`${fase}-${m.linha}`}
        className={`cvc-bicho__quadros${m.vezes ? ` cvc-bicho__quadros--${m.vezes}` : ''}`}
        style={{
          '--src': urlCss(f.src), '--colunas': f.colunas, '--linha': m.linha, '--n': m.quadros, '--dur': `${m.dur}s`,
        } as CSSProperties}
      />
    </span>
  )
}

import type { CSSProperties } from 'react'
import { urlCss } from '../../config'
import './CorujaPixel.css'

/**
 * A coruja bibliotecária (31/10/2026): personagem da Biblioteca, em pixel art HD-2D feita por código
 * (scripts/gerar_coruja.py → public/pixel/mascote/coruja.png). Quadros de 48 x 56, 6 por linha, uma linha por estado.
 * Só o desenho (aria-hidden): o botão em volta dá o nome e a ação.
 */
export const LINHAS_CORUJA = ['repouso', 'piscando', 'lendo', 'olhando', 'reagindo', 'voando', 'girando', 'piando'] as const
export type EstadoCoruja = (typeof LINHAS_CORUJA)[number]
/** Estados que tocam uma vez e param (os outros repetem). */
const UMA_VEZ: EstadoCoruja[] = ['reagindo', 'girando', 'piando']
export const SPRITE_CORUJA = 'pixel/mascote/coruja.png?v=1'

export function CorujaPixel({ estado, className = '', style }: { estado: EstadoCoruja; className?: string; style?: CSSProperties }) {
  const linha = Math.max(0, LINHAS_CORUJA.indexOf(estado))
  return (
    <span key={estado}
      className={`coruja-pixel coruja-pixel--${estado}${UMA_VEZ.includes(estado) ? ' coruja-pixel--uma-vez' : ''} ${className}`} aria-hidden="true"
      style={{ ...style, '--sprite': urlCss(SPRITE_CORUJA), '--linha': linha, '--linhas': LINHAS_CORUJA.length } as CSSProperties} />
  )
}

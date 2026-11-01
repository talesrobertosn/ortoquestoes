import type { CSSProperties } from 'react'
import { urlCss } from '../../config'
import './CorujaPixel.css'

/**
 * A coruja bibliotecária (nova desde 31/10/2026): desenho do Tales no PixelLab (scripts/sprites/coruja_nova.py →
 * public/pixel/mascote/coruja-nova.png). Quadros de 44 x 32, 5 por linha, uma linha por movimento: parada, andando,
 * voando, pousando, lendo, dormindo, acenando e olhando. Os estados antigos da Biblioteca e do menu continuam valendo
 * e caem na linha mais parecida. Só o desenho (aria-hidden): o botão em volta dá o nome e a ação.
 * O tamanho na tela é sempre 44 x 32 vezes um fator (`--coruja-escala`, padrão 2), para os pixels ficarem iguais.
 */
export const LINHAS_CORUJA = ['parada', 'andando', 'voando', 'pousando', 'lendo', 'dormindo', 'acenando', 'olhando'] as const
const APELIDOS = { repouso: 'parada', piscando: 'parada', reagindo: 'acenando', girando: 'pousando', piando: 'acenando' } as const
export type EstadoCoruja = (typeof LINHAS_CORUJA)[number] | keyof typeof APELIDOS
/** Estados que tocam uma vez e param (os outros repetem). */
const UMA_VEZ: EstadoCoruja[] = ['reagindo', 'girando', 'piando', 'pousando']
export const SPRITE_CORUJA = 'pixel/mascote/coruja-nova.png?v=2'
export const QUADRO_CORUJA = { w: 44, h: 32, pes: 31 }

export function CorujaPixel({ estado, className = '', style }: { estado: EstadoCoruja; className?: string; style?: CSSProperties }) {
  const nome = (APELIDOS as Record<string, (typeof LINHAS_CORUJA)[number]>)[estado] ?? estado
  const linha = Math.max(0, LINHAS_CORUJA.indexOf(nome as (typeof LINHAS_CORUJA)[number]))
  return (
    <span key={estado}
      className={`coruja-pixel coruja-pixel--${nome}${UMA_VEZ.includes(estado) ? ' coruja-pixel--uma-vez' : ''} ${className}`} aria-hidden="true"
      style={{ ...style, '--sprite': urlCss(SPRITE_CORUJA), '--linha': linha, '--linhas': LINHAS_CORUJA.length } as CSSProperties} />
  )
}

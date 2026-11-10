import type { CSSProperties } from 'react'
import { urlCss } from '../../config'
import { LINHAS_DRAGAO, SPRITE_DRAGAO, type IdLinhaDragao } from './sprites'
import './Mascote.css'

/** Quanto dura uma volta de cada linha (s). Pousar, decolar, soltar fogo, rugir e bocejar tocam uma vez e param no último quadro. */
export const DURACAO_DRAGAO: Record<IdLinhaDragao, number> = { parado: 1.8, voando: 0.7, pousando: 1.1, fogo: 1.9, dormindo: 3.4, rugindo: 1.4, decolando: 0.85, olhando: 2.6, bocejando: 2.2 }
const UMA_VEZ: readonly IdLinhaDragao[] = ['pousando', 'fogo', 'rugindo', 'decolando', 'bocejando']

/**
 * O dragão vermelho do tesouro fora do cenário: só o desenho (proporção 224 x 112; o corpo fica à direita e a esquerda do quadro é do jato de fogo), no tamanho que o CSS der. Quem
 * usa troca o `estado` na hora certa (DURACAO_DRAGAO diz quanto cada linha leva).
 */
export function DragaoPixel({ estado, className = '', style }: { estado: IdLinhaDragao; className?: string; style?: CSSProperties }) {
  return (
    <span key={estado} className={`dragao-pixel dragao-pixel--${estado}${UMA_VEZ.includes(estado) ? ' dragao-pixel--uma-vez' : ''} ${className}`} aria-hidden="true" style={{
      ...style, '--sprite': urlCss(SPRITE_DRAGAO.src.slice(1)), '--linha': LINHAS_DRAGAO.indexOf(estado), '--linhas': LINHAS_DRAGAO.length, '--dur': `${DURACAO_DRAGAO[estado]}s`,
    } as CSSProperties} />
  )
}

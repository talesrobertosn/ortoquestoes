import type { CSSProperties } from 'react'
import { urlCss } from '../../config'
import { folhaGato, type IdLinhaGato } from './sprites'
import { mapasDeLuz } from './luz'
import './Mascote.css'

/**
 * O gato do acampamento fora do cenário (31/10/2026): a mesma folha de pixel art de scripts/gerar_mascote.py, numa
 * pose fixa (sentado, lendo, andando...). Só o desenho, sem clique; ocupa o tamanho que o CSS der (proporção 64 x 40).
 */
export function GatoPixel({ estado, className = '', style }: { estado: IdLinhaGato; className?: string; style?: CSSProperties }) {
  const folha = folhaGato(estado)
  return (
    <span className={`gato-pixel gato-pixel--${estado} ${className}`} aria-hidden="true" style={{
      ...style, '--sprite': urlCss(folha.src.slice(1)), '--linha': folha.linha, '--linhas': folha.linhas, ...mapasDeLuz(folha.src),
    } as CSSProperties} />
  )
}

import { useMemo, type CSSProperties } from 'react'
import { sombraPixel, tamanhoGrade, type Grade, type Paleta } from './sprites'

/** Um desenho de sprites.ts na tela, em `px` pixels de tela por pixel de arte. Decorativo (aria-hidden). O estilo base
 * vai no próprio elemento: o sprite funciona em qualquer tela (salão, menu), sem depender de um CSS. */
export function Sprite({ grade, paleta, px = 3, className = '', style }: { grade: Grade; paleta: Paleta; px?: number; className?: string; style?: CSSProperties }) {
  const sombra = useMemo(() => sombraPixel(grade, paleta, px), [grade, paleta, px])
  const { w, h } = tamanhoGrade(grade)
  return (
    <span className={'sl-sprite ' + className} style={{ position: 'relative', display: 'inline-block', flex: 'none', width: w * px, height: h * px, ...style }} aria-hidden="true">
      <span style={{ position: 'absolute', display: 'block', width: px, height: px, top: -px, left: -px, boxShadow: sombra }} />
    </span>
  )
}

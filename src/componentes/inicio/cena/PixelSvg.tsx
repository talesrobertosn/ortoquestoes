import { memo, type CSSProperties, type ReactElement } from 'react'
import type { Grade, Paleta } from '../../../biblioteca/salao/sprites'

/**
 * Uma grade de letras (mesmo formato do salão da Biblioteca) desenhada como SVG: cada sequência de pixels da mesma
 * cor numa linha vira um retângulo só. Nítido em qualquer tamanho (shape-rendering crispEdges) e sem imagem.
 */
export const PixelSvg = memo(function PixelSvg({ grade, paleta, escala = 3, className = '', style }: {
  grade: Grade; paleta: Paleta; escala?: number; className?: string; style?: CSSProperties
}) {
  const w = grade[0]?.length ?? 0, h = grade.length
  const rects: ReactElement[] = []
  grade.forEach((linha, y) => {
    let x = 0
    while (x < linha.length) {
      const c = linha[x]
      let fim = x + 1
      while (fim < linha.length && linha[fim] === c) fim++
      if (c !== '.' && paleta[c]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={fim - x} height={1} fill={paleta[c]} />)
      x = fim
    }
  })
  return (
    <svg className={className} style={style} viewBox={`0 0 ${w} ${h}`} width={w * escala} height={h * escala} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {rects}
    </svg>
  )
})

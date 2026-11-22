import type { CSSProperties } from 'react'
import { recurso } from '../config'
import '../estilos/natal/NatalPlacar.css'

export default function ChocolateNatal({ className, style }: { className: string; style?: CSSProperties }) {
  return <img className={className} style={style} src={recurso('pixel/natal/placar-chocolate.png')}
    alt="" width={63} height={75} draggable={false} aria-hidden="true" />
}

import { recurso } from '../../config'
import type { IconeMenu } from './rotas'

/** Ícone em pixel do menu (public/pixel/menu/<nome>.png): 32 x 32 nos atalhos, 24 x 24 nos itens; sempre em escala inteira. */
export function IconePixel({ nome, tamanho, className = '' }: { nome: IconeMenu; tamanho: number; className?: string }) {
  return <img className={`pt-icone ${className}`} src={recurso(`pixel/menu/${nome}.png?v=1`)} width={tamanho} height={tamanho} alt="" aria-hidden="true" draggable={false} decoding="async" />
}

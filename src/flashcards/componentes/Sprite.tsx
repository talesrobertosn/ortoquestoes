import { memo, useEffect, useRef } from 'react'
import { PALETA, SPRITES } from '../dados/sprites'
import { pintarIcone } from '../efeitos/icones'

/** Clareia (k > 0) ou escurece (k < 0) uma cor #rrggbb. */
function tom(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k))
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`
}

/**
 * Desenha o sprite com luz de cima: a borda de cima de cada forma clareia e a
 * de baixo escurece. Dá volume ao pixel art sem redesenhar os mapas.
 */
export function pintarSprite(canvas: HTMLCanvasElement, nome: string) {
  // ícones novos (sombreados, 20×20) têm preferência; o coração do HUD segue o mapa antigo
  if (nome !== 'coracao' && pintarIcone(canvas, nome)) return
  const mapa = SPRITES[nome]
  if (!mapa) return
  const w = Math.max(...mapa.map((l) => l.length)), h = mapa.length
  canvas.width = w
  canvas.height = h
  const c = canvas.getContext('2d')
  if (!c) return
  const vazio = (x: number, y: number) => { const ch = mapa[y]?.[x]; return !ch || ch === '.' || ch === 'k' }
  mapa.forEach((linha, y) => [...linha].forEach((ch, x) => {
    const cor = PALETA[ch]
    if (!cor) return
    c.fillStyle = ch === 'k' ? cor : vazio(x, y - 1) ? tom(cor, 0.28) : vazio(x, y + 1) ? tom(cor, -0.3) : cor
    c.fillRect(x, y, 1, 1)
  }))
}

export const Sprite = memo(function Sprite({ nome, className }: { nome: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => { if (ref.current) pintarSprite(ref.current, nome) }, [nome])
  return <canvas ref={ref} className={'fc-sprite' + (className ? ' ' + className : '')} aria-hidden="true" />
})

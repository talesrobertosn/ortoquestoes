import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * O flashcard muda de altura ao virar, e o lugar dele (e o do herói, na
 * Batalha no celular) muda quando os botões em volta trocam. Em vez de pular,
 * o elemento desliza até a posição nova (técnica FLIP, na propriedade
 * `translate`, que não briga com o giro e a compra em `transform`). Cada
 * mudança soma uma animação que volta a zero, então duas seguidas se emendam
 * sem tranco. Um elemento novo no lugar (outro flashcard) começa parado.
 */
export function useDeslizar(ref: RefObject<HTMLElement | null>, reduzido?: boolean) {
  const estado = useRef<{ el: HTMLElement; antes: number; obs: ResizeObserver } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const atual = estado.current
    const semMovimento = reduzido || typeof ResizeObserver === 'undefined' || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (atual && (atual.el !== el || semMovimento)) { atual.obs.disconnect(); estado.current = null }
    if (!el || semMovimento || typeof el.animate !== 'function') return
    if (estado.current) { conferir(estado.current); return }
    const novo = { el, antes: topo(el), obs: new ResizeObserver(() => { if (estado.current) conferir(estado.current) }) }
    novo.obs.observe(el)
    if (el.parentElement) novo.obs.observe(el.parentElement)
    estado.current = novo
  })
  useEffect(() => () => { estado.current?.obs.disconnect(); estado.current = null }, [])
}

/** Posição de layout, sem os transforms das animações em curso. */
function topo(el: HTMLElement) {
  let y = 0
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop
  return y
}

function conferir(s: { el: HTMLElement; antes: number }) {
  const agora = topo(s.el)
  const d = s.antes - agora
  s.antes = agora
  if (Math.abs(d) < 2) return
  try {
    s.el.animate([{ translate: `0 ${d}px` }, { translate: '0 0' }], { duration: Math.min(560, 300 + Math.abs(d) * 0.9), easing: 'cubic-bezier(.22, 1, .36, 1)', composite: 'add' })
  } catch { /* navegador sem animação composta: fica o salto antigo */ }
}

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Deslizar para trocar de questão. O cartão acompanha o dedo, e só troca de
 * questão quando o gesto é claramente horizontal: rolar a página na vertical,
 * fazer pinça para ampliar ou arrastar uma tabela larga continuam como sempre.
 *
 * `area` recebe os toques (a página toda da sessão); `palco` é o que se move.
 * Retorna uma função que faz o cartão "espiar" para o lado, usada na dica.
 */
export function usarDeslizar({ area, palco, pronto, ativo, podeAvancar, podeVoltar, aoAvancar, aoVoltar }: {
  area: RefObject<HTMLElement>
  /** Verdadeiro quando `area` já está na tela (antes disso, só há o carregando). */
  pronto: boolean
  palco: RefObject<HTMLElement>
  ativo: boolean
  podeAvancar: boolean
  podeVoltar: boolean
  aoAvancar: () => void
  aoVoltar: () => void
}) {
  // Os valores mudam a cada render; os ouvintes ficam presos a um único efeito.
  const atual = useRef({ ativo, podeAvancar, podeVoltar, aoAvancar, aoVoltar })
  atual.current = { ativo, podeAvancar, podeVoltar, aoAvancar, aoVoltar }

  useEffect(() => {
    const alvo = area.current
    if (!alvo) return
    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let gesto: { x: number; y: number; t: number; travado: 'horizontal' | 'vertical' | null; dx: number } | null = null

    const mover = (dx: number, animar: boolean) => {
      const el = palco.current
      if (!el) return
      el.style.transition = animar ? 'transform .22s cubic-bezier(.2,.8,.2,1), opacity .22s ease-out' : 'none'
      el.style.transform = dx ? `translateX(${dx}px)` : ''
      el.style.opacity = dx ? String(Math.max(0.35, 1 - Math.abs(dx) / (window.innerWidth * 1.4))) : ''
    }

    const ignorar = (el: EventTarget | null) => {
      for (let no = el as HTMLElement | null; no && no !== alvo; no = no.parentElement) {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(no.tagName) || no.isContentEditable) return true
        if (no.scrollWidth > no.clientWidth + 2 && /(auto|scroll)/.test(getComputedStyle(no).overflowX)) return true
      }
      return false
    }

    const inicio = (e: TouchEvent) => {
      if (!atual.current.ativo || e.touches.length !== 1 || ignorar(e.target)) { gesto = null; return }
      const toque = e.touches[0]
      gesto = { x: toque.clientX, y: toque.clientY, t: performance.now(), travado: null, dx: 0 }
    }

    const movimento = (e: TouchEvent) => {
      if (!gesto) return
      if (e.touches.length !== 1) { gesto = null; mover(0, true); return }
      const toque = e.touches[0]
      const dx = toque.clientX - gesto.x, dy = toque.clientY - gesto.y
      if (!gesto.travado) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        gesto.travado = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'horizontal' : 'vertical'
      }
      if (gesto.travado !== 'horizontal') return
      // Sem questão para aquele lado, o cartão resiste: mexe pouco e volta.
      const livre = dx < 0 ? atual.current.podeAvancar : atual.current.podeVoltar
      gesto.dx = livre ? dx : dx * 0.25
      mover(gesto.dx, false)
    }

    const fim = () => {
      if (!gesto) return
      const { dx, t, travado } = gesto
      gesto = null
      if (travado !== 'horizontal') return
      const rapido = Math.abs(dx) / Math.max(1, performance.now() - t) > 0.45 && Math.abs(dx) > 40
      const longe = Math.abs(dx) > Math.min(110, window.innerWidth * 0.28)
      const indo = dx < 0 ? 'avancar' : 'voltar'
      const livre = indo === 'avancar' ? atual.current.podeAvancar : atual.current.podeVoltar
      if (!(rapido || longe) || !livre) { mover(0, true); return }
      if (semMovimento) { mover(0, false); (indo === 'avancar' ? atual.current.aoAvancar : atual.current.aoVoltar)(); return }
      mover(indo === 'avancar' ? -window.innerWidth : window.innerWidth, true)
      window.setTimeout(() => {
        // A próxima questão entra pelo lado oposto; se a troca não acontecer
        // (limite do dia, por exemplo), o mesmo cartão volta ao lugar.
        mover(indo === 'avancar' ? window.innerWidth * 0.35 : -window.innerWidth * 0.35, false)
        ;(indo === 'avancar' ? atual.current.aoAvancar : atual.current.aoVoltar)()
        requestAnimationFrame(() => requestAnimationFrame(() => mover(0, true)))
      }, 170)
    }

    const cancelar = () => { if (gesto) { gesto = null; mover(0, true) } }

    alvo.addEventListener('touchstart', inicio, { passive: true })
    // Passivo: o navegador rola a página sem esperar o JS. Quem impede o arrasto
    // horizontal da página é o `touch-action: pan-y pinch-zoom` de .sessao-gestos.
    alvo.addEventListener('touchmove', movimento, { passive: true })
    alvo.addEventListener('touchend', fim, { passive: true })
    alvo.addEventListener('touchcancel', cancelar, { passive: true })
    return () => {
      alvo.removeEventListener('touchstart', inicio)
      alvo.removeEventListener('touchmove', movimento)
      alvo.removeEventListener('touchend', fim)
      alvo.removeEventListener('touchcancel', cancelar)
    }
  }, [area, palco, pronto])

  /** O cartão escorrega um pouco para a esquerda e volta: "dá para deslizar". */
  return function espiar() {
    const el = palco.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-42px)', offset: 0.4 }, { transform: 'translateX(-42px)', offset: 0.55 }, { transform: 'translateX(0)' }],
      { duration: 1100, easing: 'cubic-bezier(.3,.7,.3,1)' },
    )
  }
}

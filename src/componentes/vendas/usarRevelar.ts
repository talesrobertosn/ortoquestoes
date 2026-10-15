import { useEffect, type RefObject } from 'react'

/**
 * Entrada por rolagem da página de vendas: cada elemento com `data-revelar`
 * ganha a classe `vd-visto` quando chega à tela. A classe `vd-anima` só entra
 * na raiz quando há IntersectionObserver e a pessoa não pediu menos movimento;
 * sem ela, tudo aparece de uma vez (e nada fica escondido se o script falhar).
 */
export function usarRevelar(raiz: RefObject<HTMLElement>, dependencia: unknown) {
  useEffect(() => {
    const el = raiz.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    el.classList.add('vd-anima')
    const observador = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue
        e.target.classList.add('vd-visto')
        observador.unobserve(e.target)
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    el.querySelectorAll('[data-revelar]:not(.vd-visto)').forEach((alvo) => observador.observe(alvo))
    return () => observador.disconnect()
  }, [raiz, dependencia])
}

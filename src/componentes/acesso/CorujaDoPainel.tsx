import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CorujaPixel, type EstadoCoruja } from '../../biblioteca/sala/CorujaPixel'

/*
 * A coruja guarda o acesso (01/11/2026): pousada na borda de cima do painel de entrar, fora da caixa e sem cobrir nada.
 * Lê enquanto ninguém mexe; quando um campo do painel recebe o foco, ela vira para olhar; ao enviar, acena. A luz é a
 * da lareira da página (Luz.css), quente do lado esquerdo. Só o desenho: os campos não dependem dela.
 */
export function CorujaDoPainel() {
  const ref = useRef<HTMLSpanElement>(null)
  const [estado, definirEstado] = useState<EstadoCoruja>('lendo')
  useEffect(() => {
    const painel = ref.current?.parentElement
    if (!painel) return
    let volta = 0
    const foco = () => { window.clearTimeout(volta); definirEstado('olhando') }
    const saiu = () => { volta = window.setTimeout(() => { if (!painel.contains(document.activeElement)) definirEstado('lendo') }, 400) }
    const enviou = () => { definirEstado('acenando'); window.clearTimeout(volta); volta = window.setTimeout(() => definirEstado('olhando'), 1600) }
    painel.addEventListener('focusin', foco)
    painel.addEventListener('focusout', saiu)
    painel.addEventListener('submit', enviou)
    return () => { window.clearTimeout(volta); painel.removeEventListener('focusin', foco); painel.removeEventListener('focusout', saiu); painel.removeEventListener('submit', enviou) }
  }, [])
  return (
    <span ref={ref} className="pa-coruja bicho-luz luz-esq luz-fogo" aria-hidden="true" style={{ '--luz-q': 0.45, '--luz-f': 0.2 } as CSSProperties}>
      <CorujaPixel key={estado} estado={estado} />
    </span>
  )
}

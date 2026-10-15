import { useEffect, useState, type RefObject } from 'react'
import { Icone } from './Icone'

/**
 * Leva até a seção e põe o foco nela: quem navega pelo teclado ou leitor de
 * tela continua dali, e não volta ao índice no próximo Tab. O espaço do
 * cabeçalho fixo fica no scroll-margin-top do alvo (CSS).
 */
export function irParaSecao(el: HTMLElement | null) {
  if (!el) return
  el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}
const rolar = irParaSecao

/**
 * Índice de uma página longa (Termos, por exemplo), montado a partir dos <h2>
 * dela. Os itens são botões, não links "#ancora": o site usa o hash para as
 * rotas, e um "#clausula-3" seria lido como uma página que não existe.
 */
export function IndicePagina({ alvo, titulo = 'Índice' }: { alvo: RefObject<HTMLElement>; titulo?: string }) {
  const [itens, definirItens] = useState<{ texto: string; el: HTMLElement }[]>([])
  useEffect(() => {
    const raiz = alvo.current
    if (!raiz) return
    definirItens([...raiz.querySelectorAll<HTMLElement>('h2')].map((el) => ({ texto: el.textContent ?? '', el })))
  }, [alvo])
  if (itens.length < 3) return null
  return (
    <details className="indice-pagina">
      <summary><Icone nome="mapa" tamanho={16} /> {titulo} · {itens.length} seções</summary>
      <ol>{itens.map((i, k) => <li key={k}><button type="button" onClick={() => rolar(i.el)}>{i.texto}</button></li>)}</ol>
    </details>
  )
}

/** Botão flutuante que aparece depois de rolar bastante e volta ao topo da página. */
export function VoltarAoTopo({ depoisDe = 1600 }: { depoisDe?: number }) {
  const [visivel, definirVisivel] = useState(false)
  useEffect(() => {
    const medir = () => definirVisivel(window.scrollY > depoisDe)
    medir()
    window.addEventListener('scroll', medir, { passive: true })
    return () => window.removeEventListener('scroll', medir)
  }, [depoisDe])
  if (!visivel) return null
  return (
    <button type="button" className="voltar-topo nao-imprime" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })} aria-label="Voltar ao topo da página">
      <Icone nome="cima" tamanho={18} /> Topo
    </button>
  )
}

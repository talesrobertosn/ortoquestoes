import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Icone } from '../componentes/Icone'
import { gravar, ler } from '../estado/armazenamento'

/**
 * Tutorial da Biblioteca e do leitor (27/10/2026), no molde do "Como usar" do Atlas: um cartão pixel
 * com passo, pontos e Voltar/Próximo. Cada passo acende o controle de verdade na tela (`alvo`, um
 * seletor CSS); passo sem o controle à vista (ex.: sem "Continuar estudando") é pulado.
 * Abre sozinho na primeira visita e depois só pelos botões "Como usar a Biblioteca" e "Ajuda".
 */
export interface PassoGuia { alvo?: string; titulo: string; texto: string }
export type GuiaId = 'biblioteca' | 'leitor'

const CHAVE = 'resumos:guias'
export const guiaVisto = (g: GuiaId) => !!ler<Partial<Record<GuiaId, number>>>(CHAVE, {})[g]
export const marcarGuiaVisto = (g: GuiaId) => gravar(CHAVE, { ...ler<Partial<Record<GuiaId, number>>>(CHAVE, {}), [g]: Date.now() })
/** Abre sozinho só para gente de verdade: nos testes automáticos (webdriver) o cartão não cobre a tela. */
export const deveAbrirGuia = (g: GuiaId) => !guiaVisto(g) && !(typeof navigator !== 'undefined' && navigator.webdriver)

interface Caixa { top: number; left: number; width: number; height: number }

export function GuiaTour({ id, titulo, passos, rolar = true, aoFechar }: { id: GuiaId; titulo: string; passos: PassoGuia[]; rolar?: boolean; aoFechar: () => void }) {
  // Só os passos cujo controle existe agora (o primeiro sem alvo é a apresentação).
  const [lista] = useState(() => passos.filter((p) => !p.alvo || document.querySelector(p.alvo)))
  const [i, definirI] = useState(0)
  const [caixa, definirCaixa] = useState<Caixa | null>(null)
  const cartao = useRef<HTMLDivElement>(null)
  const p = lista[i]
  const ultimo = i === lista.length - 1

  const fechar = useCallback(() => { marcarGuiaVisto(id); aoFechar() }, [id, aoFechar])

  const medir = useCallback(() => {
    const el = p?.alvo ? document.querySelector<HTMLElement>(p.alvo) : null
    if (!el) { definirCaixa(null); return }
    const r = el.getBoundingClientRect()
    const visivel = r.width > 0 && r.bottom > 0 && r.top < window.innerHeight
    definirCaixa(visivel ? { top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 } : null)
  }, [p])

  useLayoutEffect(() => {
    const el = p?.alvo ? document.querySelector<HTMLElement>(p.alvo) : null
    if (el && rolar) {
      const r = el.getBoundingClientRect()
      if (r.top < 70 || r.bottom > window.innerHeight - 220) el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
    medir()
    const t = window.setTimeout(medir, 380)
    return () => window.clearTimeout(t)
  }, [p, rolar, medir])

  useEffect(() => {
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => { window.removeEventListener('resize', medir); window.removeEventListener('scroll', medir, true) }
  }, [medir])

  // Teclado: setas trocam o passo, Esc fecha; o foco fica preso no cartão enquanto ele está aberto.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); fechar() }
      else if (e.key === 'ArrowRight') definirI((n) => Math.min(lista.length - 1, n + 1))
      else if (e.key === 'ArrowLeft') definirI((n) => Math.max(0, n - 1))
      else if (e.key === 'Tab' && cartao.current) {
        const focaveis = [...cartao.current.querySelectorAll<HTMLElement>('button:not(:disabled)')]
        if (!focaveis.length) return
        const primeiro = focaveis[0], fim = focaveis[focaveis.length - 1]
        if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); fim.focus() }
        else if (!e.shiftKey && document.activeElement === fim) { e.preventDefault(); primeiro.focus() }
      }
    }
    window.addEventListener('keydown', tecla, true)
    return () => { window.removeEventListener('keydown', tecla, true); anterior?.focus?.() }
  }, [lista.length, fechar])
  useEffect(() => { cartao.current?.querySelector<HTMLElement>('.gt__proximo')?.focus() }, [i])

  if (!p) return null
  // O cartão vai embaixo do controle aceso; sem espaço, em cima; sem controle, no meio da tela.
  const largura = Math.min(340, window.innerWidth - 24)
  let estilo: CSSProperties = { width: largura }
  if (caixa) {
    const left = Math.min(Math.max(12, caixa.left + caixa.width / 2 - largura / 2), window.innerWidth - largura - 12)
    estilo = caixa.top + caixa.height + 250 < window.innerHeight ? { ...estilo, left, top: caixa.top + caixa.height + 12 } : { ...estilo, left, bottom: Math.max(12, window.innerHeight - caixa.top + 12) }
  }
  return (
    <div className={'gt' + (caixa ? '' : ' gt--meio')} role="dialog" aria-modal="true" aria-labelledby="gt-titulo" aria-describedby="gt-texto">
      <div className="gt__veu" aria-hidden="true" onClick={fechar} />
      {caixa && <div className="gt__luz" aria-hidden="true" style={caixa} />}
      <div className="gt__cartao" ref={cartao} style={estilo} key={i}>
        <button type="button" className="gt__fechar" onClick={fechar} aria-label="Fechar o tutorial" title="Fechar (dá para abrir de novo depois)"><Icone nome="fechar" tamanho={16} /></button>
        <p className="gt__selo">{titulo} · {i + 1} de {lista.length}</p>
        <h2 id="gt-titulo">{p.titulo}</h2>
        <p id="gt-texto" className="gt__texto">{p.texto}</p>
        <div className="gt__pontos" aria-hidden="true">{lista.map((_, n) => <span key={n} className={n === i ? 'gt__ponto gt__ponto--atual' : 'gt__ponto'} />)}</div>
        <div className="gt__acoes">
          {i === 0 ? <button type="button" className="gt__pular" onClick={fechar}>Pular tutorial</button>
            : <button type="button" className="gt__voltar" onClick={() => definirI(i - 1)}><Icone nome="esquerda" tamanho={15} /> Voltar</button>}
          <button type="button" className="gt__proximo" onClick={() => ultimo ? fechar() : definirI(i + 1)}>{ultimo ? 'Começar' : <>Próximo <Icone nome="direita" tamanho={15} /></>}</button>
        </div>
      </div>
    </div>
  )
}

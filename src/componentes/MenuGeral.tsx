import { lazy, Suspense, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icone } from './Icone'

/**
 * O menu do site: o Portal do Aventureiro (31/10/2026), um pop-up claro sobre a página, igual no computador e no
 * celular (no celular ocupa quase a tela toda e sobe de baixo). Modal acessível (padrão "dialog modal" da WAI-ARIA):
 * foco preso dentro, Esc e o fundo fecham, a página de trás não rola, e o foco volta ao botão que abriu.
 * O conteúdo (portal/Portal.tsx) e o CSS dele descem só quando o menu abre; com o aparelho ocioso, o download é
 * adiantado e a abertura fica instantânea.
 */
const carregarConteudo = () => import('./portal/Portal')
const Portal = lazy(carregarConteudo)
if (typeof window !== 'undefined') {
  const adiantar = () => { void carregarConteudo().catch(() => undefined) }
  const ocioso = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  if (ocioso) ocioso(adiantar, { timeout: 6000 }); else window.setTimeout(adiantar, 4000)
}

const SELETOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function Carregando({ aoFechar }: { aoFechar: () => void }) {
  return (
    <div className="mn-carregando" aria-busy="true">
      <button type="button" className="pt-fechar pt-fechar--solto" onClick={aoFechar} aria-label="Fechar o menu"><Icone nome="fechar" tamanho={20} /></button>
      <span className="so-leitor">Abrindo o menu</span>
    </div>
  )
}

export function MenuGeral({ aberto, aoFechar, caminho, focarBusca }: { aberto: boolean; aoFechar: () => void; caminho: string; focarBusca?: boolean }) {
  const caixa = useRef<HTMLDivElement>(null)
  const fechar = useRef(aoFechar)
  fechar.current = aoFechar
  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    // A página de trás fica parada (e sem pular: a largura da barra de rolagem vira margem).
    const corpo = document.body
    const antes = { overflow: corpo.style.overflow, padding: corpo.style.paddingRight }
    const barra = window.innerWidth - document.documentElement.clientWidth
    corpo.style.overflow = 'hidden'
    if (barra > 0) corpo.style.paddingRight = `${barra}px`
    const visiveis = () => [...(caixa.current?.querySelectorAll<HTMLElement>(SELETOR) ?? [])].filter((el) => el.getClientRects().length > 0)
    const teclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); fechar.current(); return }
      if (e.key !== 'Tab') return
      const lista = visiveis()
      if (!lista.length) return
      const primeiro = lista[0], ultimo = lista[lista.length - 1]
      if (!caixa.current?.contains(document.activeElement)) { e.preventDefault(); primeiro.focus(); return }
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', teclar)
    // Foco inicial: a busca quando veio do Ctrl+K; senão o próprio diálogo (o leitor de tela anuncia o título).
    if (!focarBusca) window.setTimeout(() => caixa.current?.focus(), 0)
    return () => {
      document.removeEventListener('keydown', teclar)
      corpo.style.overflow = antes.overflow
      corpo.style.paddingRight = antes.padding
      anterior?.focus?.()
    }
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!aberto) return null
  return createPortal(
    <div className="pt-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar() }}>
      <div ref={caixa} className="pt" role="dialog" aria-modal="true" aria-label="Menu" tabIndex={-1}>
        <Suspense fallback={<Carregando aoFechar={aoFechar} />}><Portal caminho={caminho} aoFechar={aoFechar} focarBusca={focarBusca} /></Suspense>
      </div>
    </div>,
    document.body,
  )
}

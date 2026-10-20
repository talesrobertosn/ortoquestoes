import { useEffect, type RefObject } from 'react'

/**
 * Texto dos resumos sem cópia (pedido do Tales, 20/10/2026): a pessoa seleciona (para marcar,
 * anotar ou ler com o dedo), mas Ctrl+C, Ctrl+X, "Copiar" do menu do navegador e arrastar o
 * trecho para outro programa não levam o texto. Campos de digitação (notas, busca) continuam
 * aceitando copiar e colar normalmente.
 *
 * O ouvinte fica no documento porque o evento de cópia nasce no elemento com foco (ou no body),
 * e não no texto selecionado; por isso confere se a seleção encosta no elemento protegido.
 */
export function usarSemCopia(ref: RefObject<HTMLElement | null>, ativo = true) {
  useEffect(() => {
    if (!ativo) return
    const editavel = (alvo: EventTarget | null) =>
      alvo instanceof HTMLElement && (alvo.isContentEditable || alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA')
    const tocaNoTexto = () => {
      const el = ref.current
      const sel = document.getSelection()
      if (!el || !sel || sel.isCollapsed || sel.rangeCount === 0) return false
      for (let i = 0; i < sel.rangeCount; i++) if (sel.getRangeAt(i).intersectsNode(el)) return true
      return false
    }
    const bloquear = (e: ClipboardEvent) => {
      if (editavel(e.target) || !tocaNoTexto()) return
      e.preventDefault()
      e.clipboardData?.setData('text/plain', '')
    }
    const arrastar = (e: DragEvent) => {
      const el = ref.current
      if (el && e.target instanceof Node && el.contains(e.target) && !editavel(e.target)) e.preventDefault()
    }
    document.addEventListener('copy', bloquear)
    document.addEventListener('cut', bloquear)
    document.addEventListener('dragstart', arrastar)
    return () => {
      document.removeEventListener('copy', bloquear)
      document.removeEventListener('cut', bloquear)
      document.removeEventListener('dragstart', arrastar)
    }
  }, [ref, ativo])
}

import { useEffect, useState } from 'react'

const CHAVE_TAXA = 'oq-admin-taxa-pix'
const EVENTO = 'oq:admin:taxa-pix'

/**
 * A taxa de renovação do Pix escolhida no Financeiro (simulador ou calendário), guardada no navegador e a
 * mesma em todo o painel (Resumo, Metas e a faixa de metas). Volta para a sugerida quando a escolha é igual a ela.
 */
export function usarTaxaPix(sugerida: number) {
  const ler = () => { try { const v = Number(localStorage.getItem(CHAVE_TAXA)); return v > 0 && v <= 1 ? v : null } catch { return null } }
  const [escolhida, definir] = useState<number | null>(ler)
  useEffect(() => {
    const aoMudar = () => definir(ler())
    window.addEventListener(EVENTO, aoMudar)
    return () => window.removeEventListener(EVENTO, aoMudar)
  }, [])
  const escolher = (t: number | null) => {
    const v = t === null || Math.abs(t - sugerida) < 0.001 ? null : Math.round(t * 100) / 100
    try { if (v === null) localStorage.removeItem(CHAVE_TAXA); else localStorage.setItem(CHAVE_TAXA, String(v)) } catch { /* sem armazenamento */ }
    definir(v)
    window.dispatchEvent(new Event(EVENTO))
  }
  return { taxa: escolhida ?? sugerida, escolhida, escolher }
}

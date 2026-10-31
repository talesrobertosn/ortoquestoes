import { lazy, Suspense } from 'react'
import { JanelaCentral, usarTelaLarga } from './JanelaCentral'
import { Painel } from './Painel'

/**
 * O menu (31/10/2026: a organização de antes com ícones em pixel). O conteúdo e o CSS dele descem só quando
 * o menu abre, para não pesar a primeira tela; quando o aparelho fica ocioso, o download é adiantado, e a abertura
 * fica instantânea. O conteúdo está em menu/ConteudoMenu.tsx.
 */
const carregarConteudo = () => import('./menu/ConteudoMenu')
const ConteudoMenu = lazy(carregarConteudo)
if (typeof window !== 'undefined') {
  const adiantar = () => { void carregarConteudo().catch(() => undefined) }
  const ocioso = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  if (ocioso) ocioso(adiantar, { timeout: 6000 }); else window.setTimeout(adiantar, 4000)
}

function Carregando() {
  return <div className="mn-carregando" aria-busy="true" aria-label="Abrindo o menu" />
}

/** O botão que abre o menu mora no cabeçalho (computador) e na barra de baixo (celular). */
export function MenuGeral({ aberto, aoFechar, caminho }: { aberto: boolean; aoFechar: () => void; caminho: string }) {
  const larga = usarTelaLarga()
  if (!aberto) return null
  const conteudo = <Suspense fallback={<Carregando />}><ConteudoMenu caminho={caminho} aoFechar={aoFechar} /></Suspense>
  return larga
    ? <JanelaCentral aberta rotulo="Menu" aoFechar={aoFechar} className="mn-janela">{conteudo}</JanelaCentral>
    : <Painel titulo="Menu" aberto aoFechar={aoFechar}>{conteudo}</Painel>
}

import { useMemo } from 'react'
import { modoNatalAtivo } from './modoNatal'
import '../estilos/natal/NatalInicio.css'

/*
 * Os enfeites de Natal da página inicial (modo Natal, docs/design/MODO-NATAL.md), refeitos em 21/11/2026 depois da
 * crítica do Tales ("exagerou em cima e embaixo nada"): poucas peças, bem distribuídas, todas pintadas na técnica das
 * cenas do topo (scripts/natal/: arvore.py, fio_topo.py, guirlanda.py, boneco.py), cada uma com a sua luz.
 * - em cima: só um fio leve de lâmpadas na borda do cenário;
 * - no meio: a árvore com o pé na barra de atalhos e a guirlanda pendurada no canto dela;
 * - embaixo: o boneco de neve com a caneca de chocolate quente e a lanterna, no canto do último cartão.
 * Decorativos (aria-hidden, sem clique). Só existem com o modo Natal no ar (ou na prévia ?natal=1).
 */

/** O modo Natal está no ar? (lido uma vez por montagem) */
export function usarNatal(): boolean {
  return useMemo(() => modoNatalAtivo(), [])
}

/** O fio de lâmpadas na borda de cima do topo (dentro do herói, que corta o que sobra). */
export function FestaoNatal() {
  if (!usarNatal()) return null
  return (
    <span className="natal-fio" aria-hidden="true">
      <span className="natal-fio__luz natal-fio__luz--a" />
      <span className="natal-fio__luz natal-fio__luz--b" />
    </span>
  )
}

/** A guirlanda pendurada no canto de cima à direita da barra de atalhos, metade para fora. */
export function GuirlandaNatal() {
  if (!usarNatal()) return null
  return (
    <span className="natal-guirlanda" aria-hidden="true">
      <span className="natal-guirlanda__luz" />
    </span>
  )
}

/** A árvore de Natal com o pé na barra de atalhos e a copa subindo por cima da trilha da sequência. */
export function ArvoreNatal() {
  if (!usarNatal()) return null
  return (
    <span className="natal-arvore" aria-hidden="true">
      <span className="natal-arvore__img">
        <span className="natal-arvore__luz" />
        <span className="natal-arvore__pisca" />
        <span className="natal-arvore__estrela" />
      </span>
    </span>
  )
}

/** O boneco de neve com a caneca e a lanterna, no canto de baixo do último cartão da página. */
export function BonecoNatal() {
  if (!usarNatal()) return null
  return (
    <span className="natal-boneco-ancora" aria-hidden="true">
      <span className="natal-boneco">
        <span className="natal-boneco__luz" />
        <span className="natal-boneco__vapor" />
        <span className="natal-boneco__vapor natal-boneco__vapor--2" />
      </span>
    </span>
  )
}

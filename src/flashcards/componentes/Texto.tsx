import { Fragment, type ReactNode } from 'react'

/**
 * Monta o texto do flashcard sem HTML: **negrito** vira <strong> e
 * {{c1::termo}} vira lacuna (na frente) ou o termo destacado (no verso).
 */
export function Texto({ texto, lacunasAbertas = false }: { texto: string; lacunasAbertas?: boolean }) {
  const partes: ReactNode[] = []
  const re = /\{\{c\d+::(.+?)\}\}|\*\*(.+?)\*\*/g
  let ultimo = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(<Fragment key={k++}>{texto.slice(ultimo, m.index)}</Fragment>)
    if (m[1] !== undefined) {
      partes.push(lacunasAbertas
        ? <mark key={k++} className="fc-lacuna fc-lacuna--aberta">{m[1]}</mark>
        : <span key={k++} className="fc-lacuna" style={{ ['--n' as string]: Math.min(12, Math.max(4, m[1].length)) }} aria-label="lacuna" />)
    } else {
      partes.push(<strong key={k++}>{m[2]}</strong>)
    }
    ultimo = re.lastIndex
  }
  if (ultimo < texto.length) partes.push(<Fragment key={k++}>{texto.slice(ultimo)}</Fragment>)
  return <>{partes}</>
}

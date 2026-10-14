import { useEffect, useState } from 'react'
import { recurso } from '../../config'

/** Leitores decorativos depois de quinze minutos visíveis, sem progresso persistido. */
export function LeitoresBiblioteca({ reduzido }: { reduzido: boolean }) {
  const [presentes, definirPresentes] = useState(false)
  useEffect(() => {
    const tempo = 15 * 60_000
    let passado = 0, inicio = 0, visivel = false, timer = 0
    const acompanhar = () => {
      window.clearTimeout(timer)
      if (visivel) passado += Math.max(0, performance.now() - inicio)
      visivel = !document.hidden
      if (passado >= tempo) { definirPresentes(true); visivel = false; return }
      if (visivel) {
        inicio = performance.now()
        timer = window.setTimeout(() => { passado = tempo; visivel = false; definirPresentes(true) }, tempo - passado)
      }
    }
    acompanhar()
    document.addEventListener('visibilitychange', acompanhar)
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', acompanhar) }
  }, [])
  if (!presentes) return null
  return <div className={`fc-leitores${reduzido ? ' fc-leitores--parados' : ''}`} aria-hidden="true">
    <img className="fc-leitores__leitor" src={recurso('flashcards/biblioteca/leitor.png')} alt="" />
    <img className="fc-leitores__leitor fc-leitores__leitor--distante" src={recurso('flashcards/biblioteca/leitor.png')} alt="" />
  </div>
}

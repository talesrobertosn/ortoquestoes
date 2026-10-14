import { useState } from 'react'
import { recurso } from '../../config'
import { estacaoBiblioteca } from '../biblioteca/estacoes'

/** Ornamentos nas bordas, atrás da mesa; nunca participam do jogo. */
export function EstacoesBiblioteca({ reduzido }: { reduzido: boolean }) {
  const [estacao] = useState(() => estacaoBiblioteca(new Date()))
  const pasta = `flashcards/estacoes/${estacao}`
  return <div className={`fc-estacao${reduzido ? ' fc-estacao--parada' : ''}`} data-estacao={estacao} aria-hidden="true">
    <img className="fc-estacao__ramo fc-estacao__ramo--esquerdo" src={recurso(`${pasta}-ramo.png`)} alt="" />
    <img className="fc-estacao__ramo fc-estacao__ramo--direito" src={recurso(`${pasta}-ramo.png`)} alt="" />
    {[0, 1, 2, 3].map(i => <img key={i} className={`fc-estacao__particula fc-estacao__particula--${i}`} src={recurso(`${pasta}-particula.png`)} alt="" />)}
  </div>
}

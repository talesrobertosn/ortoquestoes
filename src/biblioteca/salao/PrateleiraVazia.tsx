import { useEffect } from 'react'
import { acharSegredo } from './segredos'
import '../../estilos/componentes/PrateleiraVazia.css'

/** A prateleira vazia do capítulo que não existe (segredo "O capítulo 404" do salão), na página de resumo não encontrado. */
export function PrateleiraVazia() {
  useEffect(() => { acharSegredo('cap404') }, [])
  return (
    <div className="sl-404" aria-hidden="true">
      <span className="sl-404__teia" />
      <span className="sl-404__etiqueta">Cap. 404 · ainda não escrito</span>
      <span className="sl-404__tabua" />
    </div>
  )
}

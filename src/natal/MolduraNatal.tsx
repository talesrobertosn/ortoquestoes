import { recurso } from '../config'
import { modoNatalAtivo } from './modoNatal'
import '../estilos/natal/MolduraNatal.css'

/** Ornamento no beiral da moldura, sem área interativa. */
export function MolduraNatal({ publica = false }: { publica?: boolean }) {
  if (!modoNatalAtivo()) return null
  const arte = publica ? 'borda-publica-festao-neve' : 'moldura-festao-coroa'
  return <img className={`natal-moldura natal-moldura--${publica ? 'publica' : 'privada'}`}
    src={recurso(`pixel/natal/${arte}.png`)} alt="" aria-hidden="true" width={360} height={117} decoding="async" draggable={false} />
}

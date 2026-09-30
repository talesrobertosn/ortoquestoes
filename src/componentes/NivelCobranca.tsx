import { ROTULO_NIVEL, type Nivel } from '../dados/incidencia'
import '../estilos/paginas/NivelCobranca.css'

/** Prioridade de estudo do assunto: selo só de texto, a cor diz o nível. */
export function NivelCobranca({ nivel }: { nivel: Nivel }) {
  return <span className={`ti-nivel ti-nivel--${nivel}`}>{ROTULO_NIVEL[nivel]}</span>
}

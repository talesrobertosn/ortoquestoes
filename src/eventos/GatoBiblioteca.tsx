import './encontros.css'
import { recurso } from '../config'
import { usarEventosLigados } from './preferencias'
/** Visita local e acessível; não avalia flashcards nem interfere na fila. */
export function GatoBiblioteca() {
  const [ligado] = usarEventosLigados()
  if (!ligado) return null
  return <button type="button" className="gato-biblioteca-segredo" aria-label="Fazer carinho no gato da Biblioteca" title="Um carinho?" onClick={() => window.dispatchEvent(new Event('oq:eventos:gato'))}>
    <img src={recurso('eventos/gato.png?v=2')} width={32} height={32} alt="" />
  </button>
}

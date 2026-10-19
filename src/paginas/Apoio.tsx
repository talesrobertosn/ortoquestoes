import { MapaPerdido } from '../componentes/CenasPixel'
import '../estilos/paginas/Apoio.css'

// O projeto (/sobre) e o suporte (/contato) moram em arquivos próprios desde 19/10/2026;
// o carregador de Apoio continua servindo-os, junto da página de desempenho (/dados).
export { Sobre } from './Sobre'
export { Contato } from './Contato'
export { DadosLocais } from './Desempenho'

/** Página não encontrada, na cena de mapa da temporada RPG. */
export function NaoEncontrada() {
  return <MapaPerdido />
}

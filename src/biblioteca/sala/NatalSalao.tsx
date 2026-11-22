import { recurso } from '../../config'
import type { Periodo } from './usarSalao'
import '../../estilos/natal/NatalSalao.css'

export default function NatalSalao({ periodo }: { periodo: Periodo }) {
  return (
    <div className="bb-natal" aria-hidden="true">
      <img className="bb-natal__arte" src={recurso(`pixel/natal/biblioteca-${periodo}.png`)} alt="" width={1440} height={540} draggable={false} />
      <img className="bb-natal__luz" src={recurso('pixel/natal/biblioteca-luz.png')} alt="" width={1440} height={540} draggable={false} />
    </div>
  )
}

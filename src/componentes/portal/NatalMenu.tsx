import { recurso } from '../../config'
import '../../estilos/natal/NatalMenu.css'

export default function NatalMenu() {
  const agora = new Date()
  const minuto = agora.getMinutes()
  const hora = (agora.getHours() % 12) * 30 + minuto * 0.5
  return (
    <div className="pt-natal-parede" aria-hidden="true">
      <span className="pt-natal-relogio">
        <img src={recurso('pixel/natal/menu-relogio.png')} alt="" width={186} height={138} draggable={false} />
        <i className="pt-natal-relogio__hora" style={{ transform: `rotate(${hora}deg)` }} />
        <i className="pt-natal-relogio__minuto" style={{ transform: `rotate(${minuto * 6}deg)` }} />
      </span>
    </div>
  )
}

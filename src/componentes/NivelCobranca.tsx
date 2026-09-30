import { ROTULO_NIVEL, type Nivel } from '../dados/incidencia'
import '../estilos/paginas/NivelCobranca.css'

/** Chama cheia, desenhada aqui para ter preenchimento (o ícone da biblioteca é só traço). */
function Chama() {
  return <svg width="11" height="13" viewBox="0 0 12 14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.4 0c.4 1.9-.4 3-1.5 4.2C3.7 5.5 2.5 6.8 2.5 8.9 2.5 11.2 4.1 13 6 13s3.5-1.8 3.5-4c0-1-.3-1.8-.8-2.6 0 1.2-.5 1.9-1.1 2.2-.4-1.5-1.5-2.1-1.5-3.5 0-.8.4-1.4.9-2-.5.1-.9.4-1.2.8C5.6 3.6 6 2.2 6.4 0Z"/></svg>
}

/** Nível de cobrança: chamas contadas (três, duas, uma) e um ponto para "cai pouco". */
export function NivelCobranca({ nivel }: { nivel: Nivel }) {
  const chamas = nivel - 1
  return (
    <span className={`ti-nivel ti-nivel--${nivel}`} title={ROTULO_NIVEL[nivel]}>
      <span className="ti-nivel__icones" aria-hidden="true">
        {chamas > 0 ? Array.from({ length: chamas }, (_, i) => <Chama key={i} />) : <i className="ti-nivel__ponto" />}
      </span>
      {ROTULO_NIVEL[nivel]}
    </span>
  )
}

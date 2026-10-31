import { recurso } from '../../config'
import { usarPeriodo } from '../../estado/aparencia'
import { href } from '../../util/rotas'
import { Icone } from '../Icone'
import { LUGARES, imagemLugar, type IdLugar } from './lugares'
import './Vila.css'

/**
 * As portas do fim da página (a "dança" entre as páginas): três caminhos que fazem sentido a partir daqui, cada um
 * com um recorte do cenário de destino na luz da hora. Sempre há um próximo passo.
 */
export function Saidas({ id }: { id: IdLugar }) {
  const periodo = usarPeriodo()
  return (
    <nav className={`vl-saidas vl-saidas--${periodo}`} aria-labelledby="vl-saidas-titulo">
      <h2 id="vl-saidas-titulo" className="vl-saidas__titulo">Para onde agora?</h2>
      <ul>
        {LUGARES[id].saidas.map((s) => {
          const l = LUGARES[s]
          return (
            <li key={s}>
              <a className="vl-porta" href={href(l.destino)}>
                <span className="vl-porta__vista" aria-hidden="true"><img src={recurso(imagemLugar(s, periodo, 960))} alt="" loading="lazy" decoding="async" width={960} height={320} /></span>
                <span className="vl-porta__texto"><strong>{l.pagina}</strong><small>{l.texto}</small></span>
                <Icone nome="direita" tamanho={16} />
              </a>
            </li>
          )
        })}
      </ul>
      <a className="vl-saidas__mapa" href={href('/mapa')}><Icone nome="mapa" tamanho={15} /> Ver o mapa de todas as páginas</a>
    </nav>
  )
}

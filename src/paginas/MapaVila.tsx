import { useMemo } from 'react'
import { recurso } from '../config'
import { usarPeriodo } from '../estado/aparencia'
import { href } from '../util/rotas'
import { Icone } from '../componentes/Icone'
import { Mascote } from '../componentes/mascote/Mascote'
import { LUGARES, ORDEM_MAPA, imagemLugar } from '../componentes/vila/lugares'
import { lugaresVisitados, segredosDaVila } from '../componentes/vila/CenaPagina'
import '../componentes/vila/Vila.css'

/**
 * O mapa da vila (30/10/2026): todas as páginas do site como lugares pintados, na luz da hora. Os que a pessoa ainda
 * não visitou ficam na névoa (dá vontade de explorar); cada um conta se o segredo de lá já foi achado.
 */
export function MapaVila() {
  const periodo = usarPeriodo()
  const visitados = useMemo(lugaresVisitados, [])
  const segredos = useMemo(segredosDaVila, [])
  const total = ORDEM_MAPA.length

  return (
    <article className={`vl-mapa vl-mapa--${periodo}`} aria-labelledby="vl-mapa-titulo">
      <header className="vl-mapa__topo">
        <div>
          <p className="vl-mapa__selo"><Icone nome="mapa" tamanho={15} /> Mapa do site</p>
          <h1 id="vl-mapa-titulo">Todas as páginas, num lugar só</h1>
          <p className="vl-mapa__lide">Cada página é um lugar da vila. Os que você ainda não visitou estão na névoa, e cada um esconde um segredo no cenário.</p>
          <p className="vl-mapa__placar">
            <span><strong className="numerico">{visitados.filter((v) => ORDEM_MAPA.includes(v)).length}</strong> de {total} visitados</span>
            <span><strong className="numerico">{segredos.length}</strong> de {total} segredos</span>
          </p>
        </div>
        <Mascote className="vl-mapa__mascote" comportamento="ler" fantasia="nenhuma" falar={false} />
      </header>
      <ul className="vl-mapa__grade">
        {ORDEM_MAPA.map((id) => {
          const l = LUGARES[id]
          const visto = visitados.includes(id)
          return (
            <li key={id}>
              <a className={`vl-quadro${visto ? '' : ' vl-quadro--nevoa'}`} href={href(l.destino)}>
                <span className="vl-quadro__vista" aria-hidden="true">
                  <img src={recurso(imagemLugar(id, periodo, 960))} alt="" loading="lazy" decoding="async" width={960} height={320} />
                  {!visto && <span className="vl-quadro__nevoa"><i /><i /></span>}
                  {segredos.includes(id) && <span className="vl-quadro__selo" title="Segredo achado">★</span>}
                </span>
                <span className="vl-quadro__texto"><strong>{l.pagina}</strong><small>{visto ? l.texto : 'Ainda não visitado'}</small></span>
              </a>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

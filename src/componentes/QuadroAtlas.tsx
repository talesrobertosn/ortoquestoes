import { href } from '../util/rotas'
import { recurso } from '../config'
import { Icone } from './Icone'
import { SeloNovo } from './SeloNovo'
import '../estilos/componentes/QuadroAtlas.css'

/**
 * Atlas 3D com muito destaque na capa (pedido do Tales, 25/10/2026), para visitantes e para quem tem
 * conta. É só uma imagem do esqueleto (gerada pelo próprio atlas, com o fêmur proximal aceso), então
 * a capa não carrega o motor 3D. Sem fogo desde 25/10/2026 (pedido do Tales: mais elegante e compacto).
 */
export function QuadroAtlas() {
  return (
    <section className="qa ip-entra" aria-labelledby="qa-titulo">
      <div className="qa__texto">
        <span className="qa__selo"><Icone nome="cubo" tamanho={14} /> Atlas 3D <SeloNovo /></span>
        <a className="qa__capa" href={href('/atlas')}><strong id="qa-titulo">Clique no osso. Veja a fratura.</strong></a>
        <span className="qa__desc">Um esqueleto inteiro em 3D para girar, aproximar e clicar. Cada osso abre as classificações de fratura daquela região e as questões de anatomia da estrutura.</span>
        <span className="qa__botoes">
          <a className="botao botao--ouro qa__botao" href={href('/atlas')}><Icone nome="cubo" tamanho={16} /> Abrir o Atlas 3D</a>
          <a className="botao qa__botao qa__botao--contorno" href={href('/atlas?e=femur_r&f=proximal')}><Icone nome="osso" tamanho={16} /> Começar pelo fêmur</a>
        </span>
        <span className="qa__nota">Grátis: ossos e músculos. No computador e no celular.</span>
      </div>
      <a className="qa__arte" href={href('/atlas?e=femur_r&f=proximal')} tabIndex={-1} aria-hidden="true">
        <img src={recurso('atlas3d/capa-esqueleto.png')} width={316} height={740} alt="" loading="lazy" decoding="async" />
        <span className="qa__etiqueta"><b>Fêmur proximal</b> classificações e questões</span>
        <span className="qa__eixo">3D</span>
      </a>
    </section>
  )
}

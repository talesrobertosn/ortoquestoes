import { SITE } from '../config'
import { href } from '../util/rotas'

export function Rodape() {
  return (
    <footer className="rodape nao-imprime">
      <div className="conteudo rodape__interno">
        <a href={href('/favoritas')}>Favoritas</a>
        <a href={href('/sobre')}>O projeto</a>
        <a href={href('/contato')}>Relatar erro</a>
        <a href={href('/dados')}>Seu desempenho</a>
        <span className="rodape__creditos">
          Feito por {SITE.autor}, para a comunidade de ortopedia.
        </span>
      </div>
    </footer>
  )
}

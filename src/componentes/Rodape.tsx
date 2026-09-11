import { SITE, recurso } from '../config'
import { href } from '../util/rotas'
import { Icone } from './Icone'

export function Rodape() {
  return (
    <footer className="rodape nao-imprime">
      <div className="conteudo rodape__interno">
        <a href={href('/favoritas')}>Favoritas</a>
        <a href={recurso('questoes/')}>Questões comentadas</a>
        <a href={href('/sobre')}>O projeto</a>
        <a href={href('/contato')}>Relatar erro</a>
        <a href={href('/dados')}>Seu desempenho</a>
        <a href={href('/progresso')}>Progresso do acervo</a>
        <a
          className="rodape__social"
          href={SITE.instagram}
          target="_blank"
          rel="noopener noreferrer me"
        >
          <Icone nome="instagram" tamanho={18} />@{SITE.instagramUsuario}
        </a>
        <span className="rodape__creditos">
          Feito por {SITE.autor}, para a comunidade de ortopedia.
        </span>
      </div>
    </footer>
  )
}

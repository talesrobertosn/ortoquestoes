import { SITE } from '../config'
import { MarcaHorizontal } from '../marca/Simbolo'
import { href } from '../util/rotas'
import { Icone } from './Icone'

const ESTUDAR = [
  ['/treinar', 'Treinar'],
  ['/revisao', 'Revisão'],
  ['/favoritas', 'Favoritas'],
  ['/dados', 'Seu desempenho'],
  ['/ranking', 'Ranking'],
] as const
const PROJETO = [
  ['/sobre', 'O projeto'],
  ['/contato', 'Relatar erro'],
  ['/assinatura', 'Planos'],
  ['/termos', 'Termos de uso'],
] as const

export function Rodape() {
  return (
    <footer className="rodape nao-imprime">
      <div className="conteudo">
        <a className="rodape-insta" href={SITE.instagram} target="_blank" rel="noopener noreferrer me">
          <span className="rodape-insta__icone" aria-hidden="true"><Icone nome="instagram" tamanho={28} /></span>
          <span className="rodape-insta__texto">
            <strong>Siga @{SITE.instagramUsuario} no Instagram</strong>
            <span>Questão comentada, macetes de prova, acervo novo e os bastidores do projeto.</span>
          </span>
          <span className="rodape-insta__botao">Seguir <Icone nome="direita" tamanho={16} /></span>
        </a>

        <div className="rodape-grade">
          <div className="rodape-marca">
            <a href={href('/')} className="rodape-marca__logo" aria-label="OrtoQuestões, página inicial"><MarcaHorizontal altura={26} /></a>
            <p>Questões de ortopedia comentadas para TEOT, TARO e ENARE R4.</p>
            <p className="rodape-marca__autor">Feito por {SITE.autor}, para a comunidade de ortopedia.</p>
          </div>
          <nav className="rodape-coluna" aria-label="Estudar">
            <p className="rodape-coluna__titulo">Estudar</p>
            {ESTUDAR.map(([destino, rotulo]) => <a key={destino} href={href(destino)}>{rotulo}</a>)}
          </nav>
          <nav className="rodape-coluna" aria-label="Projeto">
            <p className="rodape-coluna__titulo">Projeto</p>
            {PROJETO.map(([destino, rotulo]) => <a key={destino} href={href(destino)}>{rotulo}</a>)}
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer me" className="rodape-coluna__insta"><Icone nome="instagram" tamanho={16} /> @{SITE.instagramUsuario}</a>
          </nav>
        </div>

        <div className="rodape-base">
          <span>© {new Date().getFullYear()} {SITE.nome}</span>
          <span>Estude com constância. A prova agradece.</span>
        </div>
      </div>
    </footer>
  )
}

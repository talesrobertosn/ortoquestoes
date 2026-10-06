import { SITE } from '../config'
import { MarcaHorizontal } from '../marca/Simbolo'
import { href } from '../util/rotas'
import { Icone } from './Icone'

const ESTUDAR = [
  ['/treinar', 'Treinar'],
  ['/revisao', 'Revisão'],
  ['/erros', 'Caderno de erros'],
  ['/favoritas', 'Favoritas'],
  ['/dados', 'Seu desempenho'],
  ['/ranking', 'Ranking'],
] as const
/** Recursos do assinante: o cronograma em primeiro, porque é o que mais ajuda quem está perto da prova. */
const ASSINANTE = [
  ['/cronograma', 'Cronograma'],
  ['/temas-que-mais-caem', 'Temas que mais caem'],
  ['/simulado-nacional', 'Simulado Nacional'],
  ['/ligas', 'Liga da residência'],
  ['/indicar', 'Indique e ganhe'],
] as const
const PROJETO = [
  ['/sobre', 'O projeto'],
  ['/contato', 'Suporte e contato'],
  ['/assinatura', 'Planos'],
  ['/termos', 'Termos de uso'],
  ['/condicoes-assinatura', 'Condições da assinatura'],
] as const

/** comInstagram: o convite grande do Instagram só aparece na página inicial e na
 * do projeto; nas outras fica só o link discreto da coluna. */
export function Rodape({ comInstagram = false }: { comInstagram?: boolean }) {
  return (
    <footer className="rodape nao-imprime">
      <div className="conteudo">
        {comInstagram && <a className="rodape-insta" href={SITE.instagram} target="_blank" rel="noopener noreferrer me">
          <span className="rodape-insta__icone" aria-hidden="true"><Icone nome="instagram" tamanho={28} /></span>
          <span className="rodape-insta__texto">
            <strong>Siga @{SITE.instagramUsuario} no Instagram</strong>
            <span>Questão comentada, macetes de prova, acervo novo e os bastidores do projeto.</span>
          </span>
          <span className="rodape-insta__botao">Seguir <Icone nome="direita" tamanho={16} /></span>
        </a>}

        <div className="rodape-grade">
          <div className="rodape-marca">
            <a href={href('/')} className="rodape-marca__logo" aria-label="Orto Questões, página inicial"><MarcaHorizontal altura={26} /></a>
            <p>Questões de ortopedia comentadas para TEOT, TARO e ENARE R4.</p>
            <p className="rodape-marca__nome">Orto Questões, também escrito OrtoQuestões · ortoquestoes.com.br</p>
            <p className="rodape-marca__autor">Feito por {SITE.autor}, para a comunidade de ortopedia.</p>
          </div>
          <nav className="rodape-coluna" aria-label="Estudar">
            <p className="rodape-coluna__titulo">Estudar</p>
            {ESTUDAR.map(([destino, rotulo]) => <a key={destino} href={href(destino)}>{rotulo}</a>)}
          </nav>
          <nav className="rodape-coluna" aria-label="Recursos do assinante">
            <p className="rodape-coluna__titulo">Assinante</p>
            {ASSINANTE.map(([destino, rotulo], i) => <a key={destino} href={href(destino)} className={i === 0 ? 'rodape-coluna__destaque' : undefined}>{i === 0 && <Icone nome="rota" tamanho={15} />}{rotulo}</a>)}
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

import { SITE, recurso } from '../config'
import { MarcaHorizontal } from '../marca/Simbolo'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { usarConta } from '../conta/ContextoConta'
import { primeiroNome } from './Cabecalho'
import { abrirPreferenciasCookies, PIXEL_META } from '../conta/consentimento'

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
  ['/resumos', 'Resumos'],
  ['/simulado-nacional', 'Simulado Nacional'],
  ['/ligas', 'Liga da residência'],
  ['/indicar', 'Indique e ganhe'],
] as const
const PROJETO = [
  ['/sobre', 'O projeto'],
  ['/contato', 'Suporte e contato'],
  ['/assinatura', 'Planos'],
] as const
/** Links legais: na linha de baixo, junto do ©, onde quem procura costuma olhar. */
const LEGAL = [
  ['/termos', 'Termos de uso e privacidade'],
  ['/condicoes-assinatura', 'Condições da assinatura'],
] as const

/** Câmera do Instagram em pixel art (12 x 12), nas cores da temporada; fica num quadro de céu com o sol da manhã. */
function CameraPixel() {
  const px: Array<[number, number, string]> = []
  for (let x = 1; x <= 10; x++) { px.push([x, 1, '#f4cf7c'], [x, 10, '#f4cf7c']) }
  for (let y = 2; y <= 9; y++) { px.push([1, y, '#f4cf7c'], [10, y, '#f4cf7c']) }
  for (const [x, y] of [[4, 4], [5, 4], [6, 4], [7, 4], [4, 7], [5, 7], [6, 7], [7, 7], [4, 5], [4, 6], [7, 5], [7, 6]]) px.push([x, y, '#e1573a'])
  px.push([8, 3, '#e1573a'])
  return <svg className="rodape-insta__icone" viewBox="0 0 12 12" width={60} height={60} shapeRendering="crispEdges" aria-hidden="true">
    <rect x={2} y={2} width={8} height={8} fill="#3b2410" />
    {px.map(([x, y, cor], i) => <rect key={i} x={x} y={y} width={1} height={1} fill={cor} />)}
  </svg>
}

/** comInstagram: o convite grande do Instagram só aparece na página inicial e na
 * do projeto; nas outras fica só o link discreto da coluna. */
export function Rodape({ comInstagram = false }: { comInstagram?: boolean }) {
  // Com o nome do cadastro, a despedida fala com a pessoa; sem ele, a frase de sempre.
  const nome = primeiroNome(usarConta().sessao?.user.user_metadata?.nome)
  return (
    <footer className="rodape nao-imprime">
      <div className="conteudo">
        {comInstagram && <a className="rodape-insta" href={SITE.instagram} target="_blank" rel="noopener noreferrer me" aria-label={`Siga @${SITE.instagramUsuario} no Instagram: uma questão comentada toda manhã (abre em nova aba)`}>
          <span className="rodape-insta__arte" aria-hidden="true"><CameraPixel /></span>
          <span className="rodape-insta__texto">
            <span className="rodape-insta__selo">No Instagram</span>
            <strong>Uma questão comentada toda manhã</strong>
            <span>No feed, a questão, a resposta e o porquê de cada alternativa. Nos stories, macetes de prova e o acervo novo.</span>
          </span>
          <span className="rodape-insta__botao"><Icone nome="instagram" tamanho={18} /> Siga @{SITE.instagramUsuario}</span>
        </a>}

        <div className="rodape-grade">
          <div className="rodape-marca">
            <a href={href('/')} className="rodape-marca__logo" aria-label="Orto Questões, página inicial"><MarcaHorizontal altura={24} /></a>
            <p>Questões comentadas para TEOT, TARO, cirurgia da mão, R4 ENARE, quadril e coluna.</p>
            <p className="rodape-marca__autor">Feito por {SITE.autor}, para a comunidade de ortopedia.</p>
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer me" className="rodape-marca__insta"><Icone nome="instagram" tamanho={16} /> @{SITE.instagramUsuario}</a>
          </div>
          <nav className="rodape-coluna" aria-label="Estudar">
            <p className="rodape-coluna__titulo">Estudar</p>
            <div className="rodape-coluna__links">
              {ESTUDAR.map(([destino, rotulo]) => <a key={destino} href={href(destino)}>{rotulo}</a>)}
              <a href={recurso('questoes/')}>Questões por assunto</a>
              <a href={recurso('guias/')}>Guias de preparação</a>
            </div>
          </nav>
          <nav className="rodape-coluna" aria-label="Recursos do assinante">
            <p className="rodape-coluna__titulo">Assinante</p>
            <div className="rodape-coluna__links">
              {ASSINANTE.map(([destino, rotulo], i) => <a key={destino} href={href(destino)} className={i === 0 ? 'rodape-coluna__destaque' : undefined}>{i === 0 && <Icone nome="rota" tamanho={15} />}{rotulo}</a>)}
            </div>
          </nav>
          <nav className="rodape-coluna" aria-label="Projeto">
            <p className="rodape-coluna__titulo">Projeto</p>
            <div className="rodape-coluna__links">
              {PROJETO.map(([destino, rotulo]) => <a key={destino} href={href(destino)}>{rotulo}</a>)}
            </div>
          </nav>
        </div>

        <div className="rodape-base">
          <nav className="rodape-legal" aria-label="Termos e privacidade">
            {LEGAL.map(([destino, rotulo]) => <a key={destino} href={href(destino)}>{rotulo}</a>)}
            {PIXEL_META && <button type="button" className="rodape-legal__botao" onClick={abrirPreferenciasCookies}>Cookies</button>}
          </nav>
          <p className="rodape-base__frase">{nome ? `${nome}, estude com constância. A prova agradece.` : 'Estude com constância. A prova agradece.'}</p>
          <p className="rodape-base__nome">© {new Date().getFullYear()} {SITE.nome}, também escrito OrtoQuestões · ortoquestoes.com.br</p>
        </div>
      </div>
    </footer>
  )
}

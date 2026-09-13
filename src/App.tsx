import { Conta } from './paginas/Conta'
import { useEffect } from 'react'
import { href, usarRota } from './util/rotas'
import { Cabecalho } from './componentes/Cabecalho'
import { Rodape } from './componentes/Rodape'
import { Inicio } from './paginas/Inicio'
import { Treinar } from './paginas/Treinar'
import { Sessao } from './paginas/Sessao'
import { Resumo } from './paginas/Resumo'
import { QuestaoDireta } from './paginas/QuestaoDireta'
import { Contato, DadosLocais, NaoEncontrada, Sobre } from './paginas/Apoio'
import { Favoritas } from './paginas/Favoritas'
import { Progresso } from './paginas/Progresso'
import { Revisao } from './paginas/Revisao'
import { SITE } from './config'

const TITULOS: Record<string, string> = {
  '/': 'OrtoQuestÃµes â€” banco de questÃµes de ortopedia e traumatologia',
  '/treinar': 'Montar sessÃ£o â€” OrtoQuestÃµes',
  '/sessao': 'Respondendo â€” OrtoQuestÃµes',
  '/resumo': 'Resumo da sessÃ£o â€” OrtoQuestÃµes',
  '/sobre': 'O projeto â€” OrtoQuestÃµes: questÃµes de ortopedia comentadas',
  '/projeto': 'O projeto â€” OrtoQuestÃµes: questÃµes de ortopedia comentadas',
  '/contato': 'Relatar erro â€” OrtoQuestÃµes',
  '/conta': 'Minha conta â€” OrtoQuestÃµes',
  '/dados': 'Seu desempenho â€” OrtoQuestÃµes',
  '/favoritas': 'Suas favoritas â€” OrtoQuestÃµes',
  '/progresso': 'Progresso dos comentÃ¡rios â€” OrtoQuestÃµes',
  '/revisao': 'Sua revisÃ£o â€” OrtoQuestÃµes',
}

export function App() {
  const rota = usarRota()
  const [primeiro, segundo] = rota.segmentos

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [rota.caminho])

  useEffect(() => {
    document.title =
      TITULOS[rota.caminho] ??
      (primeiro === 'questao' && segundo
        ? `QuestÃ£o ${segundo} â€” OrtoQuestÃµes`
        : `${SITE.nome}`)
  }, [rota.caminho, primeiro, segundo])

  let pagina: JSX.Element
  switch (primeiro) {
    case undefined:
      pagina = <Inicio />
      break
    case 'treinar':
      // Sem `key` aqui: trocar a chave a cada filtro remonta a pÃ¡gina inteira,
      // e a remontagem fecha o seletor de assuntos no meio da seleÃ§Ã£o.
      pagina = <Treinar consulta={rota.consulta} />
      break
    case 'sessao':
      pagina = <Sessao />
      break
    case 'resumo':
      pagina = <Resumo />
      break
    case 'questao':
      pagina = segundo ? <QuestaoDireta id={segundo} /> : <NaoEncontrada />
      break
    // Duas rotas para a mesma pÃ¡gina: "sobre" Ã© o endereÃ§o antigo, que
    // continua valendo, e "projeto" Ã© como o site passou a chamÃ¡-la.
    case 'sobre':
    case 'projeto':
      pagina = <Sobre />
      break
    case 'contato':
      pagina = <Contato consulta={rota.consulta} />
      break
    case 'conta':
      pagina = <Conta />
      break
    case 'dados':
      pagina = <DadosLocais />
      break
    case 'favoritas':
      pagina = <Favoritas />
      break
    case 'progresso':
      pagina = <Progresso />
      break
    case 'revisao':
      pagina = <Revisao />
      break
    default:
      pagina = <NaoEncontrada />
  }

  const estreita = ['sessao', 'questao'].includes(primeiro ?? '')

  return (
    <div className="pagina">
      <a className="pular-para-conteudo" href="#conteudo-principal">
        Pular para o conteÃºdo
      </a>
      <Cabecalho caminho={rota.caminho} />
      <main className="principal" id="conteudo-principal" tabIndex={-1}>
        <div className={'conteudo' + (estreita ? ' conteudo--estreito' : '')}>{pagina}</div>
      </main>
      <Rodape />
      <nav className="nav-mobile nao-imprime" aria-label="NavegaÃ§Ã£o principal no celular">
        {([['/', 'InÃ­cio'], ['/treinar', 'Treinar'], ['/revisao', 'Revisar'], ['/dados', 'Desempenho']]).map(([url, titulo]) => (
          <a key={titulo} href={href(url)} aria-current={rota.caminho === url ? 'page' : undefined}>{titulo}</a>
        ))}
      </nav>
    </div>
  )
}


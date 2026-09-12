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
import { SITE } from './config'

const TITULOS: Record<string, string> = {
  '/': 'OrtoQuestões — banco de questões de ortopedia e traumatologia',
  '/treinar': 'Montar sessão — OrtoQuestões',
  '/sessao': 'Respondendo — OrtoQuestões',
  '/resumo': 'Resumo da sessão — OrtoQuestões',
  '/sobre': 'O projeto — OrtoQuestões: questões de ortopedia comentadas',
  '/projeto': 'O projeto — OrtoQuestões: questões de ortopedia comentadas',
  '/contato': 'Relatar erro — OrtoQuestões',
  '/dados': 'Seu desempenho — OrtoQuestões',
  '/favoritas': 'Suas favoritas — OrtoQuestões',
  '/progresso': 'Progresso dos comentários — OrtoQuestões',
}

export function App() {
  const rota = usarRota()
  const [primeiro, segundo] = rota.segmentos

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [rota.caminho])

  useEffect(() => {
    document.title =
      TITULOS[rota.caminho] ??
      (primeiro === 'questao' && segundo
        ? `Questão ${segundo} — OrtoQuestões`
        : `${SITE.nome}`)
  }, [rota.caminho, primeiro, segundo])

  let pagina: JSX.Element
  switch (primeiro) {
    case undefined:
      pagina = <Inicio />
      break
    case 'treinar':
      // Sem `key` aqui: trocar a chave a cada filtro remonta a página inteira,
      // e a remontagem fecha o seletor de assuntos no meio da seleção.
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
    // Duas rotas para a mesma página: "sobre" é o endereço antigo, que
    // continua valendo, e "projeto" é como o site passou a chamá-la.
    case 'sobre':
    case 'projeto':
      pagina = <Sobre />
      break
    case 'contato':
      pagina = <Contato consulta={rota.consulta} />
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
    default:
      pagina = <NaoEncontrada />
  }

  const estreita = ['sessao', 'questao'].includes(primeiro ?? '')

  return (
    <div className="pagina">
      <a className="pular-para-conteudo" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <Cabecalho caminho={rota.caminho} />
      <main className="principal" id="conteudo-principal" tabIndex={-1}>
        <div className={'conteudo' + (estreita ? ' conteudo--estreito' : '')}>{pagina}</div>
      </main>
      <Rodape />
      <nav className="nav-mobile nao-imprime" aria-label="Navegação principal no celular">
        {([['/', 'Início'], ['/treinar', 'Treinar'], ['/treinar?situacao=revisarHoje&limite=20', 'Revisar'], ['/dados', 'Desempenho']]).map(([url, titulo]) => (
          <a key={titulo} href={href(url)} aria-current={(titulo === 'Revisar' ? rota.caminho === '/treinar' && rota.consulta.get('situacao') === 'revisarHoje' : rota.caminho === url && !(titulo === 'Treinar' && rota.consulta.get('situacao') === 'revisarHoje')) ? 'page' : undefined}>{titulo}</a>
        ))}
      </nav>
    </div>
  )
}

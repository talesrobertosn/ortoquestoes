import { useEffect } from 'react'
import { usarRota } from './util/rotas'
import { Cabecalho } from './componentes/Cabecalho'
import { Rodape } from './componentes/Rodape'
import { Inicio } from './paginas/Inicio'
import { Treinar } from './paginas/Treinar'
import { Sessao } from './paginas/Sessao'
import { Resumo } from './paginas/Resumo'
import { QuestaoDireta } from './paginas/QuestaoDireta'
import { Contato, DadosLocais, NaoEncontrada, Sobre } from './paginas/Apoio'
import { SITE } from './config'

const TITULOS: Record<string, string> = {
  '/': 'OrtoQuestões — banco de questões de ortopedia e traumatologia',
  '/treinar': 'Montar sessão — OrtoQuestões',
  '/sessao': 'Respondendo — OrtoQuestões',
  '/resumo': 'Resumo da sessão — OrtoQuestões',
  '/sobre': 'Sobre — OrtoQuestões',
  '/contato': 'Relatar erro — OrtoQuestões',
  '/dados': 'Seu desempenho — OrtoQuestões',
}

export function App() {
  const rota = usarRota()
  const [primeiro, segundo] = rota.segmentos

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
    case 'sobre':
      pagina = <Sobre />
      break
    case 'contato':
      pagina = <Contato consulta={rota.consulta} />
      break
    case 'dados':
      pagina = <DadosLocais />
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
    </div>
  )
}

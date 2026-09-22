import { Conta } from './paginas/Conta'
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
import { Favoritas } from './paginas/Favoritas'
import { Progresso } from './paginas/Progresso'
import { Revisao } from './paginas/Revisao'
import { Ranking } from './paginas/Ranking'
import { Termos } from './paginas/Termos'
import { Assinatura } from './paginas/Assinatura'
import { SITE } from './config'
import { usarLeitura } from './estado/preferencias'
import { consumirRetornoAuth } from './servicos/supabase'

const TITULOS: Record<string, string> = {
  '/': 'OrtoQuestões — banco de questões de ortopedia e traumatologia',
  '/treinar': 'Montar sessão — OrtoQuestões',
  '/sessao': 'Respondendo — OrtoQuestões',
  '/resumo': 'Resumo da sessão — OrtoQuestões',
  '/sobre': 'O projeto — OrtoQuestões: questões de ortopedia comentadas',
  '/projeto': 'O projeto — OrtoQuestões: questões de ortopedia comentadas',
  '/contato': 'Relatar erro — OrtoQuestões',
  '/conta': 'Minha conta — OrtoQuestões',
  '/dados': 'Seu desempenho — OrtoQuestões',
  '/favoritas': 'Suas favoritas — OrtoQuestões',
  '/progresso': 'Progresso dos comentários — OrtoQuestões',
  '/revisao': 'Sua revisão — OrtoQuestões',
  '/ranking': 'Ranking — OrtoQuestões',
  '/termos': 'Termos de Uso e Consentimento — OrtoQuestões',
  '/assinatura': 'Planos — OrtoQuestões',
  '/entrar': 'Entrar ou criar conta — OrtoQuestões',
}

export function App() {
  const rota = usarRota()
  const [primeiro, segundo] = rota.segmentos
  const { densidade, fonte } = usarLeitura()

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [rota.caminho])
  useEffect(() => { consumirRetornoAuth() }, [])

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
    case 'conta':
      pagina = <Conta consulta={rota.consulta} />
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
    case 'ranking':
      pagina = <Ranking />
      break
    case 'termos':
      pagina = <Termos />
      break
    case 'assinatura':
      pagina = <Assinatura />
      break
    case 'entrar':
      pagina = <Conta consulta={rota.consulta} />
      break
    default:
      pagina = <NaoEncontrada />
  }

  const estreita = ['sessao', 'questao'].includes(primeiro ?? '')

  return (
    <div className={`pagina pagina--${densidade}`} style={{ fontSize: `${fonte}%` }}>
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

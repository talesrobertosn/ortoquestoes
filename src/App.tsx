import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { usarRota } from './util/rotas'
import { Cabecalho } from './componentes/Cabecalho'
import { Rodape } from './componentes/Rodape'
import { ConviteCompartilhar } from './componentes/ConviteCompartilhar'
import { SITE } from './config'
import { usarLeitura } from './estado/preferencias'

// Cada página é carregada apenas ao ser visitada. Além de reduzir o JavaScript
// inicial, isso evita baixar o acervo completo para rotas administrativas,
// termos, conta e planos.
const Inicio = lazy(() => import('./paginas/Inicio').then(({ Inicio }) => ({ default: Inicio })))
const Treinar = lazy(() => import('./paginas/Treinar').then(({ Treinar }) => ({ default: Treinar })))
const Sessao = lazy(() => import('./paginas/Sessao').then(({ Sessao }) => ({ default: Sessao })))
const Resumo = lazy(() => import('./paginas/Resumo').then(({ Resumo }) => ({ default: Resumo })))
const QuestaoDireta = lazy(() => import('./paginas/QuestaoDireta').then(({ QuestaoDireta }) => ({ default: QuestaoDireta })))
const Contato = lazy(() => import('./paginas/Apoio').then(({ Contato }) => ({ default: Contato })))
const DadosLocais = lazy(() => import('./paginas/Apoio').then(({ DadosLocais }) => ({ default: DadosLocais })))
const NaoEncontrada = lazy(() => import('./paginas/Apoio').then(({ NaoEncontrada }) => ({ default: NaoEncontrada })))
const Sobre = lazy(() => import('./paginas/Apoio').then(({ Sobre }) => ({ default: Sobre })))
const Favoritas = lazy(() => import('./paginas/Favoritas').then(({ Favoritas }) => ({ default: Favoritas })))
const CadernoErros = lazy(() => import('./paginas/CadernoErros').then(({ CadernoErros }) => ({ default: CadernoErros })))
const Progresso = lazy(() => import('./paginas/Progresso').then(({ Progresso }) => ({ default: Progresso })))
const Revisao = lazy(() => import('./paginas/Revisao').then(({ Revisao }) => ({ default: Revisao })))
const Ranking = lazy(() => import('./paginas/Ranking').then(({ Ranking }) => ({ default: Ranking })))
const Termos = lazy(() => import('./paginas/Termos').then(({ Termos }) => ({ default: Termos })))
const CondicoesAssinatura = lazy(() => import('./paginas/CondicoesAssinatura').then(({ CondicoesAssinatura }) => ({ default: CondicoesAssinatura })))
const Assinatura = lazy(() => import('./paginas/Assinatura').then(({ Assinatura }) => ({ default: Assinatura })))
const Conta = lazy(() => import('./paginas/Conta').then(({ Conta }) => ({ default: Conta })))
const DetalhesAssinatura = lazy(() => import('./paginas/DetalhesAssinatura').then(({ DetalhesAssinatura }) => ({ default: DetalhesAssinatura })))
const AdminAssinaturas = lazy(() => import('./paginas/AdminAssinaturas').then(({ AdminAssinaturas }) => ({ default: AdminAssinaturas })))

const TITULOS: Record<string, string> = {
  '/': 'OrtoQuestões — banco de questões de ortopedia e traumatologia',
  '/treinar': 'Montar sessão — OrtoQuestões',
  '/sessao': 'Respondendo — OrtoQuestões',
  '/resumo': 'Resumo da sessão — OrtoQuestões',
  '/sobre': 'O projeto — OrtoQuestões: questões de ortopedia comentadas',
  '/projeto': 'O projeto — OrtoQuestões: questões de ortopedia comentadas',
  '/contato': 'Suporte e contato — OrtoQuestões',
  '/conta': 'Minha conta — OrtoQuestões',
  '/conta/assinatura': 'Dados da assinatura — OrtoQuestões',
  '/dados': 'Seu desempenho — OrtoQuestões',
  '/favoritas': 'Suas favoritas — OrtoQuestões',
  '/erros': 'Caderno de erros — OrtoQuestões',
  '/progresso': 'Progresso dos comentários — OrtoQuestões',
  '/revisao': 'Sua revisão — OrtoQuestões',
  '/ranking': 'Ranking — OrtoQuestões',
  '/termos': 'Termos de Uso e Privacidade — OrtoQuestões',
  '/condicoes-assinatura': 'Condições da assinatura — OrtoQuestões',
  '/assinatura': 'Planos — OrtoQuestões',
  '/admin/assinaturas': 'Administração de assinaturas — OrtoQuestões',
  '/entrar': 'Entrar ou criar conta — OrtoQuestões',
}

export function App() {
  const rota = usarRota()
  const [primeiro, segundo] = rota.segmentos
  const { densidade, fonte } = usarLeitura()

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [rota.caminho])

  useEffect(() => {
    document.title =
      TITULOS[rota.caminho] ??
      (primeiro === 'questao' && segundo
        ? `Questão ${segundo} — OrtoQuestões`
        : `${SITE.nome}`)
  }, [rota.caminho, primeiro, segundo])

  let pagina: ReactNode
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
      pagina = segundo === 'assinatura' ? <DetalhesAssinatura /> : <Conta consulta={rota.consulta} />
      break
    case 'dados':
      pagina = <DadosLocais />
      break
    case 'favoritas':
      pagina = <Favoritas />
      break
    case 'erros':
      pagina = <CadernoErros />
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
    case 'condicoes-assinatura':
      pagina = <CondicoesAssinatura />
      break
    case 'assinatura':
      pagina = <Assinatura />
      break
    case 'admin':
      pagina = segundo === 'assinaturas' ? <AdminAssinaturas /> : <NaoEncontrada />
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
        <div className={'conteudo' + (estreita ? ' conteudo--estreito' : '')}>
          <Suspense fallback={<p className="estado" role="status">Carregando…</p>}>
            {pagina}
          </Suspense>
        </div>
      </main>
      <Rodape />
      <ConviteCompartilhar caminho={rota.caminho} />
    </div>
  )
}

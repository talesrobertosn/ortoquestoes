import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { EsperaPixel } from './componentes/EsperaPixel'
import { vigiarFilaZerada } from './conta/feitos'
import { usarRota } from './util/rotas'
import { Cabecalho } from './componentes/Cabecalho'
import { Rodape } from './componentes/Rodape'
import { AvisoSite } from './componentes/AvisoSite'
import { SITE } from './config'
import { usarLeitura } from './estado/preferencias'
import { ErroDePagina } from './componentes/ErroDePagina'
import { ExigeConta } from './componentes/ExigeConta'
import { ConviteDiario } from './componentes/ConviteDiario'
import { AvisoCookies } from './componentes/AvisoCookies'

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
const Conquistas = lazy(() => import('./paginas/Ranking').then(({ Conquistas }) => ({ default: Conquistas })))
const Termos = lazy(() => import('./paginas/Termos').then(({ Termos }) => ({ default: Termos })))
const CondicoesAssinatura = lazy(() => import('./paginas/CondicoesAssinatura').then(({ CondicoesAssinatura }) => ({ default: CondicoesAssinatura })))
const Assinatura = lazy(() => import('./paginas/Assinatura').then(({ Assinatura }) => ({ default: Assinatura })))
const Conta = lazy(() => import('./paginas/Conta').then(({ Conta }) => ({ default: Conta })))
const DetalhesAssinatura = lazy(() => import('./paginas/DetalhesAssinatura').then(({ DetalhesAssinatura }) => ({ default: DetalhesAssinatura })))
const Emails = lazy(() => import('./paginas/Emails').then(({ Emails }) => ({ default: Emails })))
const SimuladoNacional = lazy(() => import('./paginas/SimuladoNacional').then(({ SimuladoNacional }) => ({ default: SimuladoNacional })))
const PlanoEstudo = lazy(() => import('./paginas/PlanoEstudo').then(({ PlanoEstudo }) => ({ default: PlanoEstudo })))
const TemasQueMaisCaem = lazy(() => import('./paginas/TemasQueMaisCaem').then(({ TemasQueMaisCaem }) => ({ default: TemasQueMaisCaem })))
const Resumao = lazy(() => import('./paginas/Resumao').then(({ Resumao }) => ({ default: Resumao })))
const Indicar = lazy(() => import('./paginas/Indicar').then(({ Indicar }) => ({ default: Indicar })))
const ConviteRecebido = lazy(() => import('./paginas/Indicar').then(({ ConviteRecebido }) => ({ default: ConviteRecebido })))
const Ligas = lazy(() => import('./paginas/Ligas').then(({ Ligas }) => ({ default: Ligas })))
const AdminAssinaturas = lazy(() => import('./paginas/AdminAssinaturas').then(({ AdminAssinaturas }) => ({ default: AdminAssinaturas })))

const TITULOS: Record<string, string> = {
  '/': 'Orto Questões: banco de questões de ortopedia e cirurgia da mão',
  '/treinar': 'Montar sessão | Orto Questões',
  '/sessao': 'Respondendo | Orto Questões',
  '/resumo': 'Resumo da sessão | Orto Questões',
  '/sobre': 'O projeto | Orto Questões (OrtoQuestões): questões de ortopedia comentadas',
  '/projeto': 'O projeto | Orto Questões (OrtoQuestões): questões de ortopedia comentadas',
  '/contato': 'Suporte e contato | Orto Questões',
  '/conta': 'Minha conta | Orto Questões',
  '/conta/assinatura': 'Dados da assinatura | Orto Questões',
  '/dados': 'Seu desempenho | Orto Questões',
  '/favoritas': 'Suas favoritas | Orto Questões',
  '/erros': 'Caderno de erros | Orto Questões',
  '/progresso': 'Progresso dos comentários | Orto Questões',
  '/revisao': 'Sua revisão | Orto Questões',
  '/ranking': 'Ranking | Orto Questões',
  '/conquistas': 'Conquistas | Orto Questões',
  '/termos': 'Termos de Uso e Privacidade | Orto Questões',
  '/condicoes-assinatura': 'Condições da assinatura | Orto Questões',
  '/assinatura': 'Planos | Orto Questões',
  '/admin': 'Painel do administrador | Orto Questões',
  '/admin/assinaturas': 'Painel do administrador | Orto Questões',
  '/entrar': 'Entrar ou criar conta | Orto Questões',
  '/emails': 'E-mails de conquistas | Orto Questões',
  '/simulado-nacional': 'Simulado Nacional | Orto Questões',
  '/plano-de-estudo': 'Cronograma | Orto Questões',
  '/cronograma': 'Cronograma | Orto Questões',
  '/ligas': 'Liga da residência | Orto Questões',
  '/indicar': 'Indique e ganhe | Orto Questões',
  '/temas-que-mais-caem': 'Temas que mais caem | Orto Questões',
  '/resumao': 'Resumão da reta final | Orto Questões',
}

export function App() {
  const rota = usarRota()
  const [primeiro, segundo] = rota.segmentos
  const { densidade, fonte } = usarLeitura()

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [rota.caminho])
  // Emblemas "Fila zerada": observa as respostas e marca o dia em que a revisão zerou.
  useEffect(() => vigiarFilaZerada(), [])

  useEffect(() => {
    document.title =
      TITULOS[rota.caminho] ??
      (primeiro === 'questao' && segundo
        ? `Questão ${segundo} | Orto Questões`
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
    case 'conquistas':
      pagina = <Conquistas escolher={rota.consulta?.get('escolher') === '1'} />
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
      // /admin/assinaturas era o endereço antigo do painel e continua valendo.
      pagina = !segundo || segundo === 'assinaturas' ? <AdminAssinaturas /> : <NaoEncontrada />
      break
    case 'emails':
      pagina = <Emails consulta={rota.consulta} />
      break
    case 'entrar':
      pagina = <Conta consulta={rota.consulta} />
      break
    case 'simulado-nacional':
      pagina = <SimuladoNacional consulta={rota.consulta} />
      break
    case 'cronograma':
    case 'plano-de-estudo':
      pagina = <PlanoEstudo />
      break
    case 'temas-que-mais-caem':
      pagina = <TemasQueMaisCaem />
      break
    case 'resumao':
      pagina = <Resumao />
      break
    case 'indicar':
      pagina = <Indicar />
      break
    case 'convite':
      pagina = segundo ? <ConviteRecebido codigo={segundo.toUpperCase()} /> : <Indicar />
      break
    case 'ligas':
      pagina = <Ligas key={rota.consulta.toString()} consulta={rota.consulta} />
      break
    default:
      pagina = <NaoEncontrada />
  }

  // Páginas que mostram questões: por enquanto, só com conta (ver config.ts).
  // A questão avulsa (#/questao/ID) fica aberta: é para onde as páginas
  // públicas do Google levam; responder pede a conta ali mesmo.
  if (['treinar', 'sessao', 'resumo', 'favoritas', 'erros', 'revisao', 'simulado-nacional'].includes(primeiro ?? '')) {
    pagina = <ExigeConta caminho={rota.caminho + (rota.consulta.toString() ? `?${rota.consulta}` : '')}>{pagina}</ExigeConta>
  }

  const estreita = ['sessao', 'questao'].includes(primeiro ?? '')

  return (
    <div className={`pagina pagina--${densidade}`} style={{ fontSize: `${fonte}%` }}>
      <a className="pular-para-conteudo" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <Cabecalho caminho={rota.caminho} />
      {primeiro !== 'sessao' && <AvisoSite />}
      <main className="principal" id="conteudo-principal" tabIndex={-1}>
        <div className={'conteudo' + (estreita ? ' conteudo--estreito' : '')}>
          <ErroDePagina caminho={rota.caminho}>
          <Suspense fallback={<EsperaPixel />}>
            {pagina}
          </Suspense>
          </ErroDePagina>
        </div>
      </main>
      {/* Modo foco: respondendo (sessão ou questão avulsa) nada abaixo da
          questão; o painel do administrador é ferramenta, sem rodapé do site. */}
      {!['sessao', 'questao', 'admin'].includes(primeiro ?? '') && <Rodape comInstagram={!primeiro || primeiro === 'projeto' || primeiro === 'sobre'} />}
      <ConviteDiario caminho={rota.caminho} />
      <AvisoCookies />
    </div>
  )
}

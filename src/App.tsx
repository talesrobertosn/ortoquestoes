import { ehRotaDoJogo, lembrarFundo, rotaDoFundo } from './flashcards/fundo'
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { EsperaPixel } from './componentes/EsperaPixel'
import { vigiarFilaZerada } from './conta/feitos'
import { navegar, rotaDe, usarRota, type Rota } from './util/rotas'
import { carregadores } from './util/preCarga'
import { Cabecalho } from './componentes/Cabecalho'
import { Rodape } from './componentes/Rodape'
import { AvisoSite } from './componentes/AvisoSite'
import { AvisoTermos } from './componentes/AvisoTermos'
import { AvisoArmazenamento } from './componentes/AvisoArmazenamento'
import { HospedeConfirmacao } from './componentes/Confirmar'
import { EXIGIR_CONTA_PARA_QUESTOES, FLASHCARDS_LIBERADO, SITE } from './config'
import { usarConta } from './conta/ContextoConta'
import { contasDisponiveis } from './conta/supabase'
import { usarLeitura } from './estado/preferencias'
import { ErroDePagina } from './componentes/ErroDePagina'
import { ExigeConta } from './componentes/ExigeConta'
import { ConviteDiario } from './componentes/ConviteDiario'
import { AvisoCookies } from './componentes/AvisoCookies'

// Cada página é carregada apenas ao ser visitada. Além de reduzir o JavaScript
// inicial, isso evita baixar o acervo completo para rotas administrativas,
// termos, conta e planos. Os carregadores vêm de util/preCarga, que adianta o
// download quando o dedo chega num link ou o aparelho fica ocioso.
const Encontros = lazy(() => import('./eventos/Encontros'))
const ConviteAssinar = lazy(() => import('./convite/ConviteAssinar'))

const Inicio = lazy(() => carregadores.Inicio().then(({ Inicio }) => ({ default: Inicio })))
const Treinar = lazy(() => carregadores.Treinar().then(({ Treinar }) => ({ default: Treinar })))
const Sessao = lazy(() => carregadores.Sessao().then(({ Sessao }) => ({ default: Sessao })))
const Resumo = lazy(() => carregadores.Resumo().then(({ Resumo }) => ({ default: Resumo })))
const QuestaoDireta = lazy(() => carregadores.QuestaoDireta().then(({ QuestaoDireta }) => ({ default: QuestaoDireta })))
const Contato = lazy(() => carregadores.Apoio().then(({ Contato }) => ({ default: Contato })))
const DadosLocais = lazy(() => carregadores.Apoio().then(({ DadosLocais }) => ({ default: DadosLocais })))
const NaoEncontrada = lazy(() => carregadores.Apoio().then(({ NaoEncontrada }) => ({ default: NaoEncontrada })))
const Sobre = lazy(() => carregadores.Apoio().then(({ Sobre }) => ({ default: Sobre })))
const Favoritas = lazy(() => carregadores.Favoritas().then(({ Favoritas }) => ({ default: Favoritas })))
const CadernoErros = lazy(() => carregadores.CadernoErros().then(({ CadernoErros }) => ({ default: CadernoErros })))
const Progresso = lazy(() => carregadores.Progresso().then(({ Progresso }) => ({ default: Progresso })))
const Revisao = lazy(() => carregadores.Revisao().then(({ Revisao }) => ({ default: Revisao })))
const Ranking = lazy(() => carregadores.Ranking().then(({ Ranking }) => ({ default: Ranking })))
const RankingCripta = lazy(() => carregadores.RankingCripta().then(({ RankingCripta }) => ({ default: RankingCripta })))
const Conquistas = lazy(() => carregadores.Ranking().then(({ Conquistas }) => ({ default: Conquistas })))
const Termos = lazy(() => carregadores.Termos().then(({ Termos }) => ({ default: Termos })))
const CondicoesAssinatura = lazy(() => carregadores.CondicoesAssinatura().then(({ CondicoesAssinatura }) => ({ default: CondicoesAssinatura })))
const Assinatura = lazy(() => carregadores.Assinatura().then(({ Assinatura }) => ({ default: Assinatura })))
const Conta = lazy(() => carregadores.Conta().then(({ Conta }) => ({ default: Conta })))
const DetalhesAssinatura = lazy(() => carregadores.DetalhesAssinatura().then(({ DetalhesAssinatura }) => ({ default: DetalhesAssinatura })))
const Emails = lazy(() => carregadores.Emails().then(({ Emails }) => ({ default: Emails })))
const SimuladoNacional = lazy(() => carregadores.SimuladoNacional().then(({ SimuladoNacional }) => ({ default: SimuladoNacional })))
const PlanoEstudo = lazy(() => carregadores.PlanoEstudo().then(({ PlanoEstudo }) => ({ default: PlanoEstudo })))
const TemasQueMaisCaem = lazy(() => carregadores.TemasQueMaisCaem().then(({ TemasQueMaisCaem }) => ({ default: TemasQueMaisCaem })))
const Resumos = lazy(() => carregadores.Resumos().then(({ Resumos }) => ({ default: Resumos })))
const Indicar = lazy(() => carregadores.Indicar().then(({ Indicar }) => ({ default: Indicar })))
const ConviteRecebido = lazy(() => carregadores.Indicar().then(({ ConviteRecebido }) => ({ default: ConviteRecebido })))
const Ligas = lazy(() => carregadores.Ligas().then(({ Ligas }) => ({ default: Ligas })))
const Flashcards = lazy(() => carregadores.Flashcards().then(({ Flashcards }) => ({ default: Flashcards })))
const AdminAssinaturas = lazy(() => carregadores.AdminAssinaturas().then(({ AdminAssinaturas }) => ({ default: AdminAssinaturas })))

const TITULOS: Record<string, string> = {
  // Igual ao <title> do index.html: o Google lê o título depois do JavaScript.
  '/': 'Orto Questões (OrtoQuestões): banco de questões de ortopedia, TEOT e TARO',
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
  '/resumos/frases': 'Frases que caem | Biblioteca | Orto Questões',
  '/resumos': 'Biblioteca de resumos | Orto Questões',
  '/flashcards': 'Flashcards | Orto Questões',
  '/flashcards/desempenho': 'Desempenho nos flashcards | Orto Questões',
  '/flashcards/cronograma': 'Cronograma de flashcards | Orto Questões',
  '/flashcards/entrada': 'Torneio de Flashcards | Orto Questões',
  '/flashcards/cripta': 'Torneio de Flashcards | Orto Questões',
  '/flashcards/torre': 'Torre do Título | Orto Questões',
  '/flashcards/biblioteca': 'Biblioteca de flashcards | Orto Questões',
}

/** A página de uma rota (o App desenha a do site e, por cima, a do jogo). */
function paginaDaRota(rota: Rota): ReactNode {
  const [primeiro, segundo] = rota.segmentos
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
      pagina = ['flashcards', 'cripta'].includes(rota.consulta.get('aba') ?? '') ? <RankingCripta /> : <Ranking />
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
      pagina = <Assinatura consulta={rota.consulta} />
      break
    case 'admin':
      // /admin/assinaturas era o endereço antigo do painel e continua valendo.
      pagina = !segundo || segundo === 'assinaturas' ? <AdminAssinaturas consulta={rota.consulta} /> : <NaoEncontrada />
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
      pagina = <div className="empilha-2"><PlanoEstudo /></div>
      break
    case 'temas-que-mais-caem':
      pagina = <TemasQueMaisCaem />
      break
    // O Resumão virou adendo da Biblioteca (16/10/2026): o endereço antigo leva às frases.
    case 'resumao':
      pagina = <Redirecionar destino={`/resumos/frases${rota.consulta.toString() ? `?${rota.consulta}` : ''}`} />
      break
    // Biblioteca de resumos (16/10/2026), com as frases que caem (antigo Resumão) em #/resumos/frases.
    case 'resumos':
      pagina = <Resumos segmentos={rota.segmentos} consulta={rota.consulta} />
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
    case 'flashcards':
      pagina = FLASHCARDS_LIBERADO ? <Flashcards secao={segundo} /> : <NaoEncontrada />
      break
    default:
      pagina = <NaoEncontrada />
  }

  // Páginas que mostram questões: por enquanto, só com conta (ver config.ts).
  // A questão avulsa (#/questao/ID) fica aberta: é para onde as páginas
  // públicas do Google levam; responder pede a conta ali mesmo.
  if (['treinar', 'sessao', 'resumo', 'favoritas', 'erros', 'revisao', 'simulado-nacional'].includes(primeiro ?? '') || ehJogo(rota)) {
    pagina = <ExigeConta caminho={rota.caminho + (rota.consulta.toString() ? `?${rota.consulta}` : '')}>{pagina}</ExigeConta>
  }

  return pagina
}

/** Rotas do jogo dos flashcards: abrem como pop-up por cima do site. */
function ehJogo(rota: Rota) {
  return ehRotaDoJogo(rota.segmentos)
}

export function App() {
  const [encontrosProntos, prepararEncontros] = useState(false)
  useEffect(() => { const t = setTimeout(() => prepararEncontros(true), 2500); return () => clearTimeout(t) }, [])
  const rota = usarRota()
  const [primeiro, segundo] = rota.segmentos
  const { densidade, fonte } = usarLeitura()

  // Emblemas "Fila zerada": observa as respostas e marca o dia em que a revisão zerou.
  useEffect(() => vigiarFilaZerada(), [])

  useEffect(() => {
    document.title =
      TITULOS[rota.caminho] ??
      (primeiro === 'questao' && segundo
        ? `Questão ${segundo} | Orto Questões`
        : `${SITE.nome}`)
  }, [rota.caminho, primeiro, segundo])

  const { sessao } = usarConta()
  const jogo = ehJogo(rota)
  // sem conta, o convite para criar a conta aparece na própria página, não num pop-up por baixo do site
  const barrado = jogo && EXIGIR_CONTA_PARA_QUESTOES && contasDisponiveis && !sessao
  const popup = jogo && !barrado
  // fora do jogo, a página atual vira o fundo do pop-up; dentro dele, o fundo é a última página do site
  const textoRota = rota.caminho + (rota.consulta.toString() ? `?${rota.consulta}` : '')
  if (!jogo) lembrarFundo(textoRota)
  const fundo = popup ? rotaDe(rotaDoFundo()) : rota
  const pagina = paginaDaRota(popup && ehJogo(fundo) ? rotaDe('/flashcards') : fundo)
  const sobreposto = popup ? paginaDaRota(rota) : null

  // Abrir o pop-up e fechá-lo de volta para a mesma página não mexe na rolagem; ir para outra página começa do topo.
  // Mudar só a consulta da mesma página (os filtros do Treinar vão para o endereço) também não mexe:
  // no celular, cada caixa marcada levava a página de volta ao topo (relato do Tales, 14/10/2026).
  const jogoAntes = useRef(false)
  const fundoAoAbrir = useRef<string | null>(null)
  const caminhoAntes = useRef<string | null>(null)
  useEffect(() => {
    if (popup && !jogoAntes.current) fundoAoAbrir.current = rotaDoFundo()
    const outraPagina = jogoAntes.current ? textoRota !== fundoAoAbrir.current : rota.caminho !== caminhoAntes.current
    if (!popup && outraPagina) window.scrollTo({ top: 0, behavior: 'auto' })
    if (!popup) caminhoAntes.current = rota.caminho
    jogoAntes.current = popup
  }, [textoRota, popup, rota.caminho])
  const [primeiroFundo] = fundo.segmentos

  const estreita = ['sessao', 'questao'].includes(primeiroFundo ?? '')

  return (
    <div className={`pagina pagina--${densidade}`} style={{ fontSize: `${fonte}%` }}>
      <a className="pular-para-conteudo" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <Cabecalho caminho={fundo.caminho} />
      {primeiroFundo !== 'sessao' && <AvisoSite />}
      {/* Termos atualizados: fora da resposta de questões, do painel e de Minha conta (que mostra o aviso no corpo). */}
      {!['sessao', 'questao', 'admin', 'conta'].includes(primeiroFundo ?? '') && <AvisoTermos />}
      <AvisoArmazenamento />
      <main className="principal" id="conteudo-principal" tabIndex={-1}>
        <div className={'conteudo' + (estreita ? ' conteudo--estreito' : '')}>
          <ErroDePagina caminho={rota.caminho}>
          <Suspense fallback={<EsperaPixel />}>
            {pagina}
          </Suspense>
          </ErroDePagina>
        </div>
      </main>
      {sobreposto && <ErroDePagina caminho={rota.caminho}><Suspense fallback={<div className="espera-jogo"><EsperaPixel rotulo="Abrindo o jogo" /></div>}>{sobreposto}</Suspense></ErroDePagina>}
      {/* Modo foco: respondendo (sessão ou questão avulsa) nada abaixo da
          questão; o painel do administrador é ferramenta, sem rodapé do site. */}
      {!['sessao', 'questao', 'admin'].includes(primeiroFundo ?? '') && <Rodape comInstagram={!primeiroFundo || primeiroFundo === 'projeto' || primeiroFundo === 'sobre'} />}
      <ConviteDiario caminho={rota.caminho} />
      <AvisoCookies />
      <HospedeConfirmacao />
      {encontrosProntos && <Suspense fallback={null}><Encontros /></Suspense>}
      {encontrosProntos && <Suspense fallback={null}><ConviteAssinar caminho={rota.caminho} /></Suspense>}
    </div>
  )
}

/** Endereço antigo que mudou de lugar: troca a rota sem deixar o antigo no histórico. */
function Redirecionar({ destino }: { destino: string }) {
  useEffect(() => { navegar(destino, true) }, [destino])
  return null
}

import { usarConta } from '../conta/ContextoConta'
import { lazy, Suspense } from 'react'
import type { PaginaBusca } from './BuscaMenu'
import { SeloNovo } from './SeloNovo'
import { contasDisponiveis } from '../conta/supabase'
import { usarAdministrador } from '../conta/administrador'
import { usarPremium } from '../conta/premium'
import { usarArmazenado } from '../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { href } from '../util/rotas'
import { recurso } from '../config'
import { Icone, type NomeIcone } from './Icone'
import { JanelaCentral, usarTelaLarga } from './JanelaCentral'
import { Painel } from './Painel'
import { SeloAssinante } from './Premium'
import { A_PARTIR_DE } from '../dados/planos'
import { usarNacionalAbertoATodos } from '../dados/nacionalEmDestaque'

interface Item {
  destino: string
  rotulo: string
  texto: string
  icone: NomeIcone
  /** Recurso do assinante: quem não assina vê o selo e abre a prévia. */
  assinante?: boolean
  /** Selo discreto de novidade ("Novo", "Beta"). */
  novo?: string
}

/**
 * Menu reorganizado (pedido do Tales, 25/10/2026: "o menu está uma bagunça"). Em cima, as quatro coisas
 * do dia a dia em cartões; embaixo, os grupos pelo que a pessoa quer fazer; planos e indicação no fim,
 * discretos. Novidade ganha um selo fino, sem fogo.
 */
const PRINCIPAIS: Item[] = [
  { destino: '/treinar', rotulo: 'Treinar', texto: 'Monte uma sessão', icone: 'livro' },
  { destino: '/revisao', rotulo: 'Revisão', texto: 'O que volta hoje', icone: 'reiniciar' },
  { destino: '/flashcards', rotulo: 'Flashcards', texto: 'Revisão rápida e jogo', icone: 'raio' },
  { destino: '/cronograma', rotulo: 'Cronograma', texto: 'O plano de cada dia', icone: 'rota', assinante: true },
  { destino: '/cronograma-mao', rotulo: 'Cronograma da Mão', texto: 'Ingresso e título (SBCM e SIMÃO)', icone: 'calendario', assinante: true },
]
/** Em destaque (pedido do Tales, 25/10/2026): os dois recursos novos ganham cartões próprios, com arte em pixel. */
const DESTAQUES: (Item & { arte: 'livros' | 'osso' })[] = [
  { destino: '/resumos', rotulo: 'Resumos', texto: 'Os temas que mais caem, com as questões no meio do texto', icone: 'livro', novo: 'Beta', arte: 'livros' },
  { destino: '/atlas', rotulo: 'Atlas 3D', texto: 'Clique no osso e veja fraturas, classificações e questões', icone: 'cubo', novo: 'Novo', arte: 'osso' },
]
const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Estudar o conteúdo',
    itens: [
      { destino: '/temas-que-mais-caem', rotulo: 'Temas que mais caem', texto: 'TEOT, TARO e Cirurgia da Mão, prova por prova', icone: 'grafico', assinante: true },
      { destino: '/flashcards/cripta', rotulo: 'Torneio de Flashcards', texto: 'Os mesmos flashcards em forma de jogo', icone: 'trofeu' },
    ],
  },
  {
    titulo: 'Provas e disputa',
    itens: [
      { destino: '/simulado-nacional', rotulo: 'Simulado Nacional', texto: '50 questões oficiais, ranking nacional', icone: 'alvo', assinante: true },
      { destino: '/ranking', rotulo: 'Ranking', texto: 'Sua posição, emblemas e missões', icone: 'trofeu' },
      { destino: '/ligas', rotulo: 'Liga da residência', texto: 'Dispute com os colegas do seu serviço', icone: 'grupo', assinante: true },
      { destino: '/conquistas', rotulo: 'Conquistas', texto: 'Inventário de emblemas e vitrine', icone: 'medalha' },
    ],
  },
  {
    titulo: 'Seu progresso',
    itens: [
      { destino: '/dados', rotulo: 'Seu desempenho', texto: 'Acerto por tema e a sua evolução', icone: 'grafico' },
      { destino: '/erros', rotulo: 'Caderno de erros', texto: 'Tudo o que você errou, pronto para refazer', icone: 'alerta' },
      { destino: '/favoritas', rotulo: 'Favoritas', texto: 'As questões que você marcou com estrela', icone: 'estrela' },
      { destino: '/conta', rotulo: 'Relatório do mês', texto: 'Todo dia 1º, a sua evolução no e-mail', icone: 'correio', assinante: true },
    ],
  },
]

/** Palavras de quem procura, para a busca do menu achar a página certa. */
// A busca (e os índices que ela consulta) só é baixada quando o menu abre; até lá fica o campo parado.
const BuscaMenu = lazy(() => import('./BuscaMenu').then((m) => ({ default: m.BuscaMenu })))
function CampoBuscaVazio() {
  return <div className="mn-busca"><label className="mn-busca__campo"><Icone nome="busca" tamanho={18} /><input type="search" disabled placeholder="Buscar: Garden, tríade terrível, revisão, flashcards…" aria-label="Buscar no site" /></label></div>
}

const SINONIMOS: Record<string, string> = {
  '/treinar': 'questoes fazer praticar sessao estudar prova treino',
  '/cronograma': 'plano de estudo calendario dia agenda meta',
  '/resumos': 'livro capitulo rockwood resumo biblioteca leitura ler classificacao',
  '/flashcards': 'cartas cards memorizar jogo',
  '/atlas': 'anatomia 3d osso esqueleto classificacao fratura musculo nervo modelo tridimensional',
  '/revisao': 'revisar repeticao espacada voltar',
  '/erros': 'errei erradas erros',
  '/favoritas': 'estrela salvas marcadas',
  '/temas-que-mais-caem': 'incidencia mais cobrado o que cai ranking assuntos teot taro mao sbcm simao ingresso titulo',
  '/cronograma-mao': 'cirurgia da mao plano estudo sbcm simao ingresso titulo residencia data da prova',
  '/simulado-nacional': 'prova simulado nota posicao',
  '/dados': 'estatistica acerto desempenho grafico',
  '/assinatura': 'assinar preco pagar pix cartao plano',
  '/conta': 'perfil login senha',
  '/contato': 'ajuda suporte duvida problema',
}
/** Páginas que não estão no menu, mas que a busca deve achar. */
const EXTRAS_BUSCA: PaginaBusca[] = [
  { destino: '/resumos/frases', rotulo: 'Frases que caem', texto: 'Uma frase por assunto, dos comentários das questões de prova', icone: 'livro', chaves: 'resumao frases na prova vespera' },
  { destino: '/resumos/caderno', rotulo: 'Meu caderno de estudo', texto: 'Seus destaques e notas dos resumos', icone: 'lapis', chaves: 'marcacoes notas grifos destaques' },
  { destino: '/conquistas', rotulo: 'Conquistas e emblemas', texto: 'Inventário de emblemas e vitrine', icone: 'medalha', chaves: 'emblemas medalhas trofeus' },
]

/** O botão que abre o menu mora no cabeçalho (computador) e na barra de baixo (celular). */
export function MenuGeral({ aberto, aoFechar, caminho }: { aberto: boolean; aoFechar: () => void; caminho: string }) {
  const larga = usarTelaLarga()
  if (!aberto) return null
  const conteudo = <ConteudoMenu caminho={caminho} aoFechar={aoFechar} />
  return larga
    ? <JanelaCentral aberta rotulo="Menu" aoFechar={aoFechar} className="mn-janela">{conteudo}</JanelaCentral>
    : <Painel titulo="Menu" aberto aoFechar={aoFechar}>{conteudo}</Painel>
}

function ConteudoMenu({ caminho, aoFechar }: { caminho: string; aoFechar: () => void }) {
  const { sessao } = usarConta()
  const { premium } = usarPremium()
  // A edição em destaque do Simulado Nacional pode ser aberta a todos (outubro de 2026): sem cadeado.
  const nacionalAberto = usarNacionalAbertoATodos()
  const administrador = usarAdministrador(sessao?.user.id)
  const [sessaoLocal] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)
  const feitas = sessaoLocal ? Object.keys(sessaoLocal.respostas).length : 0
  const pendente = sessaoLocal && !sessaoLocal.concluidaEm && feitas < sessaoLocal.ids.length ? { feitas, total: sessaoLocal.ids.length } : null

  const conta: Item[] = [
    ...(contasDisponiveis
      ? [sessao
        ? { destino: '/conta', rotulo: 'Minha conta', texto: 'Perfil, preferências e backup', icone: 'usuario' as const }
        : { destino: '/conta?modo=entrar', rotulo: 'Entrar ou criar conta', texto: 'Guarde o progresso em qualquer aparelho', icone: 'usuario' as const }]
      : []),
    // sem assinatura, os planos ficam no cartão do fim do menu (não repetem aqui)
    ...(premium ? [{ destino: '/conta/assinatura', rotulo: 'Minha assinatura', texto: 'Plano, renovação e pagamentos', icone: 'medalha' as const }] : []),
    { destino: '/contato', rotulo: 'Suporte e contato', texto: 'Dúvida, sugestão ou problema', icone: 'interrogacao' },
    { destino: '/sobre', rotulo: 'O projeto', texto: 'Quem faz e como os comentários são feitos', icone: 'bandeira' },
    ...(administrador ? [{ destino: '/admin', rotulo: 'Painel do administrador', texto: 'Usuários, avaliações e pagamentos', icone: 'cadeado' as const }] : []),
  ]
  const grupos = [...GRUPOS, { titulo: 'Conta e ajuda', itens: conta }]
  const bloqueadoDe = (item: Item) => !!item.assinante && !premium && !(nacionalAberto && item.destino === '/simulado-nacional')
  const atualDe = (item: Item) => item.destino === caminho || (item.destino !== '/conta' && caminho.startsWith(item.destino + '/'))
  // A busca do topo acha estas páginas pelo nome, pelo texto e por sinônimos de quem procura.
  const paginasBusca: PaginaBusca[] = [
    ...[...PRINCIPAIS, ...DESTAQUES, { destino: '/flashcards/biblioteca', rotulo: 'Estudar flashcards', texto: 'Direto para a Biblioteca: revisão calma, sem jogo', icone: 'livro' as const }, ...grupos.flatMap((g) => g.itens)]
      .map((i) => ({ destino: i.destino, rotulo: i.rotulo, texto: i.texto, icone: i.icone, chaves: SINONIMOS[i.destino] })),
    ...EXTRAS_BUSCA,
  ]

  return (
    <div className="mn">
      <header className="mn__cabeca">
        <h2 className="mn__titulo">Menu</h2>
      </header>
      <Suspense fallback={<CampoBuscaVazio />}><BuscaMenu paginas={paginasBusca} aoIr={aoFechar} /></Suspense>

      {pendente && (
        <a className="mn-retomar" href={href('/sessao')} onClick={aoFechar}>
          <span className="mn-retomar__icone" aria-hidden="true"><Icone nome="direita" tamanho={18} /></span>
          <span><strong>Continuar de onde parei</strong><small>{sessaoLocal?.origem === 'cronograma' ? 'Sessão do cronograma' : 'Sua última sessão'} · {pendente.feitas} de {pendente.total} respondidas</small></span>
        </a>
      )}

      <nav className="mn-principais" aria-label="O dia a dia">
        {PRINCIPAIS.map((item) => (
          <a key={item.destino} className="mn-principal" href={href(item.destino)} onClick={aoFechar} aria-current={atualDe(item) ? 'page' : undefined}>
            <span className="mn-principal__icone" aria-hidden="true"><Icone nome={item.icone} tamanho={22} /></span>
            <strong>{item.rotulo}</strong>
            <small>{item.texto}</small>
            {bloqueadoDe(item) && <span className="mn-principal__selo"><SeloAssinante /></span>}
          </a>
        ))}
      </nav>

      <nav className="mn-destaques" aria-label="Em destaque">
        {DESTAQUES.map((item) => (
          <a key={item.destino} className={`mn-destaque mn-destaque--${item.arte}`} href={href(item.destino)} onClick={aoFechar} aria-current={atualDe(item) ? 'page' : undefined}>
            {item.arte === 'osso'
              ? <img className="mn-destaque__imagem" src={recurso('atlas3d/icone-mao.png')} width={52} height={52} alt="" loading="lazy" decoding="async" />
              : <span className={`ip-px ip-px--${item.arte}`} aria-hidden="true"><i /><i /><i /></span>}
            <span className="mn-destaque__texto"><strong>{item.rotulo} <SeloNovo texto={item.novo} /></strong><small>{item.texto}</small></span>
            <span className="mn-destaque__seta" aria-hidden="true"><Icone nome="direita" tamanho={16} /></span>
          </a>
        ))}
      </nav>

      {/* Planos logo abaixo do dia a dia (pedido do Tales, 25/10/2026: tem de ser fácil de achar) */}
      {!premium && (
        <a className="mn-planos-faixa" href={href('/assinatura')} onClick={aoFechar}>
          <span className="mn-extra__icone" aria-hidden="true"><Icone nome="medalha" tamanho={18} /></span>
          <span><strong>Planos e assinatura</strong><small>Cronograma, Simulado Nacional e todas as camadas do Atlas · a partir de {A_PARTIR_DE}/mês</small></span>
          <span className="mn-planos-faixa__acao">Ver planos <Icone nome="direita" tamanho={14} /></span>
        </a>
      )}

      <div className="mn__grupos">
        {grupos.map((grupo) => (
          <nav key={grupo.titulo} className="mn-grupo" aria-label={grupo.titulo}>
            <p className="mn-grupo__titulo">{grupo.titulo}</p>
            <ul>
              {grupo.itens.map((item) => {
                const bloqueado = bloqueadoDe(item)
                // Relatório do mês é só por e-mail: quem não assina vai para os planos.
                const destino = bloqueado && item.rotulo === 'Relatório do mês' ? '/assinatura' : item.destino
                return (
                  <li key={item.rotulo}>
                    <a
                      className={'mn-item' + (item.assinante ? ' mn-item--assinante' : '')}
                      href={href(destino)}
                      onClick={aoFechar}
                      aria-current={atualDe(item) && item.rotulo !== 'Relatório do mês' ? 'page' : undefined}
                    >
                      <span className="mn-item__icone" aria-hidden="true"><Icone nome={item.icone} tamanho={18} /></span>
                      <span className="mn-item__texto"><strong>{item.rotulo}{item.novo && <> <SeloNovo texto={item.novo} /></>}</strong><small>{item.texto}</small></span>
                      {bloqueado ? <SeloAssinante /> : <span className="mn-item__seta" aria-hidden="true"><Icone nome="direita" tamanho={16} /></span>}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mn-extras">
        <a className="mn-extra mn-extra--indicar" href={href('/indicar')} onClick={aoFechar}>
          <span className="mn-extra__icone" aria-hidden="true"><Icone nome="grupo" tamanho={18} /></span>
          <span><strong>Indique e ganhe</strong><small>7 dias do plano completo para você e o colega</small></span>
          <Icone nome="direita" tamanho={16} />
        </a>
      </div>

      <p className="mn__rodape">
        <a href={href('/termos')} onClick={aoFechar}>Termos de uso</a>
        <a href={href('/condicoes-assinatura')} onClick={aoFechar}>Condições da assinatura</a>
      </p>
    </div>
  )
}

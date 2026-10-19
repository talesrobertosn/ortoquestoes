import { usarConta } from '../conta/ContextoConta'
import { lazy, Suspense } from 'react'
import type { PaginaBusca } from './BuscaMenu'
import { ChamaPixel } from './ChamaPixel'
import { contasDisponiveis } from '../conta/supabase'
import { usarAdministrador } from '../conta/administrador'
import { usarPremium } from '../conta/premium'
import { usarArmazenado } from '../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { href } from '../util/rotas'
import { recurso } from '../config'
import { IconePixel } from './IconePixel'
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
  destaque?: boolean
  /** Em chamas (fogo em pixel art em volta): o recurso novo que ninguém pode deixar de ver. */
  fogo?: boolean
}

/** Do que mais se usa para o que menos se usa, dentro de cada grupo e entre os grupos. */
const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Estudar',
    itens: [
      { destino: '/treinar', rotulo: 'Treinar', texto: 'Monte uma sessão por tema, prova ou ano', icone: 'livro' },
      { destino: '/cronograma', rotulo: 'Cronograma', texto: 'O plano de cada dia até a sua prova', icone: 'rota', assinante: true, destaque: true },
      // Biblioteca de resumos (16/10/2026): na aba Estudar, em chamas, para ninguém deixar de ver (pedido do Tales).
      { destino: '/resumos', rotulo: 'Resumos · Beta', texto: 'Os temas que mais caem, com as questões no meio do texto', icone: 'livro', destaque: true, fogo: true },
      { destino: '/flashcards', rotulo: 'Flashcards · Beta', texto: 'Revisão espaçada em flashcards e o modo jogo', icone: 'raio', destaque: true },
      { destino: '/flashcards/biblioteca', rotulo: 'Estudar flashcards', texto: 'Direto para a Biblioteca: revisão calma, sem jogo', icone: 'livro' },
      { destino: '/flashcards/cripta', rotulo: 'Jogar o Torneio', texto: 'Os mesmos flashcards em forma de jogo', icone: 'trofeu' },
      { destino: '/revisao', rotulo: 'Revisão', texto: 'As questões que voltam hoje para fixar', icone: 'reiniciar' },
      { destino: '/erros', rotulo: 'Caderno de erros', texto: 'Tudo o que você errou, pronto para refazer', icone: 'alerta' },
      { destino: '/favoritas', rotulo: 'Favoritas', texto: 'As questões que você marcou com estrela', icone: 'estrela' },
    ],
  },
  {
    titulo: 'Rumo à prova',
    itens: [
      { destino: '/temas-que-mais-caem', rotulo: 'Temas que mais caem', texto: 'A contagem dos assuntos nas provas oficiais', icone: 'grafico', assinante: true },
      { destino: '/simulado-nacional', rotulo: 'Simulado Nacional', texto: '50 questões oficiais, 2 horas, ranking nacional', icone: 'alvo', assinante: true },
    ],
  },
  {
    titulo: 'Acompanhar',
    itens: [
      { destino: '/dados', rotulo: 'Seu desempenho', texto: 'Acerto por tema e a sua evolução', icone: 'grafico' },
      { destino: '/ranking', rotulo: 'Ranking', texto: 'Sua posição, emblemas e missões', icone: 'trofeu' },
      { destino: '/conquistas', rotulo: 'Conquistas', texto: 'Inventário de emblemas e vitrine', icone: 'medalha' },
      { destino: '/ligas', rotulo: 'Liga da residência', texto: 'Dispute com os colegas do seu serviço', icone: 'grupo', assinante: true },
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
  '/revisao': 'revisar repeticao espacada voltar',
  '/erros': 'errei erradas erros',
  '/favoritas': 'estrela salvas marcadas',
  '/temas-que-mais-caem': 'incidencia mais cobrado o que cai ranking assuntos',
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
    premium
      ? { destino: '/conta/assinatura', rotulo: 'Minha assinatura', texto: 'Plano, renovação e pagamentos', icone: 'medalha' }
      : { destino: '/assinatura', rotulo: 'Planos e assinatura', texto: `Pix ou cartão, a partir de ${A_PARTIR_DE}/mês`, icone: 'medalha' },
    { destino: '/contato', rotulo: 'Suporte e contato', texto: 'Dúvida, sugestão ou problema', icone: 'interrogacao' },
    { destino: '/sobre', rotulo: 'O projeto', texto: 'Quem faz e como os comentários são feitos', icone: 'bandeira' },
    ...(administrador ? [{ destino: '/admin', rotulo: 'Painel do administrador', texto: 'Usuários, avaliações e pagamentos', icone: 'cadeado' as const }] : []),
  ]
  const grupos = [...GRUPOS, { titulo: 'Conta e ajuda', itens: conta }]
  // A busca do topo acha estas páginas pelo nome, pelo texto e por sinônimos de quem procura.
  const paginasBusca: PaginaBusca[] = [
    ...grupos.flatMap((g) => g.itens.map((i) => ({ destino: i.destino, rotulo: i.rotulo, texto: i.texto, icone: i.icone, chaves: SINONIMOS[i.destino] }))),
    ...EXTRAS_BUSCA,
  ]

  return (
    <div className="mn">
      <header className="mn__cabeca">
        <h2 className="mn__titulo">Tudo o que tem aqui</h2>
        <p>Do que mais ajuda no estudo ao que você usa de vez em quando.</p>
      </header>
      <Suspense fallback={<CampoBuscaVazio />}><BuscaMenu paginas={paginasBusca} aoIr={aoFechar} /></Suspense>

      {!premium && (
        <a className="mn-planos" href={href('/assinatura')} onClick={aoFechar}>
          <IconePixel nome="planos" tamanho={48} />
          <span><strong>Planos e assinatura</strong><small>Cronograma, Simulado Nacional e mais · a partir de {A_PARTIR_DE}/mês · Pix ou cartão</small></span>
          <span className="mn-planos__acao">Ver planos <Icone nome="direita" tamanho={14} /></span>
        </a>
      )}

      <a className="mn-indicar" href={href('/indicar')} onClick={aoFechar}>
        <img src={recurso('ranking/mensageiro.png')} width={38} height={48} alt="" draggable={false} />
        <span><strong>Indique e ganhe</strong><small>Chame um colega da residência: 7 dias do plano completo para cada um</small></span>
        <span className="mn-indicar__acao">Meu link <Icone nome="direita" tamanho={14} /></span>
      </a>

      {pendente && (
        <a className="mn-retomar" href={href('/sessao')} onClick={aoFechar}>
          <span className="mn-retomar__icone" aria-hidden="true"><Icone nome="direita" tamanho={18} /></span>
          <span><strong>Continuar de onde parei</strong><small>{sessaoLocal?.origem === 'cronograma' ? 'Sessão do cronograma' : 'Sua última sessão'} · {pendente.feitas} de {pendente.total} respondidas</small></span>
        </a>
      )}

      <div className="mn__grupos">
        {grupos.map((grupo) => (
          <nav key={grupo.titulo} className="mn-grupo" aria-label={grupo.titulo}>
            <p className="mn-grupo__titulo">{grupo.titulo}</p>
            <ul>
              {grupo.itens.map((item) => {
                const bloqueado = item.assinante && !premium && !(nacionalAberto && item.destino === '/simulado-nacional')
                // Relatório do mês é só por e-mail: quem não assina vai para os planos.
                const destino = bloqueado && item.rotulo === 'Relatório do mês' ? '/assinatura' : item.destino
                const atual = item.destino === caminho || (item.destino !== '/conta' && caminho.startsWith(item.destino + '/'))
                return (
                  <li key={item.rotulo}>
                    <a
                      className={'mn-item' + (item.destaque ? ' mn-item--destaque' : '') + (item.assinante ? ' mn-item--assinante' : '') + (item.fogo ? ' mn-item--fogo' : '')}
                      href={href(destino)}
                      onClick={aoFechar}
                      aria-current={atual && item.rotulo !== 'Relatório do mês' ? 'page' : undefined}
                    >
                      {item.fogo && <ChamaPixel altura={22} lados={8} forca={0.85} raio={12} />}
                      <span className="mn-item__icone" aria-hidden="true"><Icone nome={item.icone} tamanho={19} /></span>
                      <span className="mn-item__texto"><strong>{item.rotulo}</strong><small>{item.texto}</small></span>
                      {bloqueado ? <SeloAssinante /> : <span className="mn-item__seta" aria-hidden="true"><Icone nome="direita" tamanho={16} /></span>}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
        ))}
      </div>

      <p className="mn__rodape">
        <a href={href('/termos')} onClick={aoFechar}>Termos de uso</a>
        <a href={href('/condicoes-assinatura')} onClick={aoFechar}>Condições da assinatura</a>
      </p>
    </div>
  )
}

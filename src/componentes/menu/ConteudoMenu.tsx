import { lazy, Suspense, useMemo, type CSSProperties } from 'react'
import { usarConta } from '../../conta/ContextoConta'
import type { PaginaBusca } from '../BuscaMenu'
import { SeloNovo } from '../SeloNovo'
import { contasDisponiveis } from '../../conta/supabase'
import { usarAdministrador } from '../../conta/administrador'
import { usarPremium } from '../../conta/premium'
import { usarArmazenado } from '../../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../../estado/sessao'
import { usarContextoLocal } from '../../estado/usarContextoLocal'
import { AREAS_TREINO, FILTROS_VAZIOS, type EstadoSessao } from '../../dados/tipos'
import { contar, indiceCarregado } from '../../dados/acervo'
import { indiceBibliotecaCarregado } from '../../biblioteca/conteudo'
import { usarBiblioteca } from '../../biblioteca/usarBiblioteca'
import { Sprite } from '../../biblioteca/salao/Sprite'
import { href } from '../../util/rotas'
import { recurso } from '../../config'
import { Icone, type NomeIcone } from '../Icone'
import { SeloAssinante } from '../Premium'
import { A_PARTIR_DE } from '../../dados/planos'
import { usarNacionalAbertoATodos } from '../../dados/nacionalEmDestaque'
import { AMPULHETA, ESTANTE, FOLHA, PALETA_MENU } from './sprites'
import '../../estilos/componentes/Menu.css'

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
  { destino: '/resumos', rotulo: 'Resumos', texto: 'Os temas que mais caem, com as questões no meio do texto', icone: 'livro', arte: 'livros' },
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
const BuscaMenu = lazy(() => import('../BuscaMenu').then((m) => ({ default: m.BuscaMenu })))
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
  { destino: '/indicar', rotulo: 'Indique e ganhe', texto: '7 dias do plano completo para você e o colega', icone: 'grupo', chaves: 'indicar convite amigo colega ganhar dias gratis' },
  { destino: '/resumos/frases', rotulo: 'Frases que caem', texto: 'Uma frase por assunto, dos comentários das questões de prova', icone: 'livro', chaves: 'resumao frases na prova vespera' },
  { destino: '/resumos/caderno', rotulo: 'Meu caderno de estudo', texto: 'Seus destaques e notas dos resumos', icone: 'lapis', chaves: 'marcacoes notas grifos destaques' },
  { destino: '/conquistas', rotulo: 'Conquistas e emblemas', texto: 'Inventário de emblemas e vitrine', icone: 'medalha', chaves: 'emblemas medalhas trofeus' },
]

/** Cor da lombada de cada grupo (o filete à esquerda dos itens, como livros na prateleira). */
const LOMBADA: Record<string, string> = { 'Estudar o conteúdo': '#2f7a4a', 'Provas e disputa': '#b0452f', 'Seu progresso': '#2b6cb0', 'Conta e ajuda': '#8a5530' }
/** Cor da "capa de livro" atrás do ícone de cada cartão do dia a dia. */
const CAPA: Record<string, string> = { '/treinar': '#2f7a4a', '/revisao': '#2b5c9e', '/flashcards': '#a8322d', '/cronograma': '#8a5530', '/cronograma-mao': '#1f6f78' }
/** Lombadas da prateleira do topo: cores e alturas fixas (decoração, sem dado). */
const CORES_TOPO = ['#a8322d', '#2b5c9e', '#c99a3c', '#2f7a4a', '#7a3f8f', '#1f6f78', '#b5762a', '#5b3a8f']
const LOMBADAS_TOPO = Array.from({ length: 70 }, (_, i) => CORES_TOPO[(i * 5 + (i % 3)) % CORES_TOPO.length])

/**
 * Menu (refeito em 30/10/2026, pedido do Tales: "bem parecido como era antes, só que com detalhes de biblioteca").
 * A organização de antes, em lista, com a seção "Hoje" (de onde parou nas questões, a revisão do dia e o resumo em
 * leitura) e toques de biblioteca: a prateleira no topo, as etiquetas de latão nos grupos, a lombada colorida em cada
 * item e a tábua entre os grupos.
 */
export default function ConteudoMenu({ caminho, aoFechar }: { caminho: string; aoFechar: () => void }) {
  const { sessao } = usarConta()
  const { premium } = usarPremium()
  // A edição em destaque do Simulado Nacional pode ser aberta a todos (outubro de 2026): sem cadeado.
  const nacionalAberto = usarNacionalAbertoATodos()
  const administrador = usarAdministrador(sessao?.user.id)
  const [sessaoLocal] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)
  const feitas = sessaoLocal ? Object.keys(sessaoLocal.respostas).length : 0
  const pendente = sessaoLocal && !sessaoLocal.concluidaEm && feitas < sessaoLocal.ids.length ? { feitas, total: sessaoLocal.ids.length } : null
  // "Hoje": só com o que já está no aparelho (o menu não baixa índice nenhum).
  const { contexto } = usarContextoLocal('')
  const { leituras } = usarBiblioteca()
  const revisarHoje = useMemo(() => {
    const indice = indiceCarregado()
    return indice ? contar(indice, { ...FILTROS_VAZIOS, areas: AREAS_TREINO }, contexto).porSituacao.revisarHoje : 0
  }, [contexto])
  const leitura = useMemo(() => Object.values(leituras)
    .filter((l): l is NonNullable<typeof l> => !!l && (l.progresso ?? 0) > 2 && !l.concluidoEm && (l.progresso ?? 0) < 95)
    .sort((a, b) => b.em - a.em)[0] ?? null, [leituras])
  const tituloLeitura = leitura ? indiceBibliotecaCarregado()?.capitulos.find((c) => c.id === leitura.capitulo)?.titulo ?? null : null
  const hoje = [
    pendente && { destino: '/sessao', titulo: 'Continuar de onde parei', texto: `${sessaoLocal?.origem === 'cronograma' ? 'Sessão do cronograma' : 'Sua última sessão'} · ${pendente.feitas} de ${pendente.total} respondidas`, arte: FOLHA, pct: Math.round((pendente.feitas / pendente.total) * 100) },
    revisarHoje > 0 && { destino: '/revisao', titulo: 'Revisão de hoje', texto: `${revisarHoje} ${revisarHoje === 1 ? 'questão volta' : 'questões voltam'} hoje`, arte: AMPULHETA, pct: null },
    leitura && { destino: `/resumos/${leitura.capitulo}`, titulo: tituloLeitura ? `Resumo: ${tituloLeitura}` : 'Continuar a leitura', texto: `Onde você parou · ${leitura.progresso}% lido`, arte: ESTANTE, pct: leitura.progresso },
  ].filter(Boolean) as Array<{ destino: string; titulo: string; texto: string; arte: typeof FOLHA; pct: number | null }>

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
      {/* A prateleira do topo: decoração de biblioteca, fina, sem dado. */}
      <div className="mn-prateleira-topo" aria-hidden="true">{LOMBADAS_TOPO.map((cor, i) => <i key={i} style={{ background: cor, height: `${16 + ((i * 7) % 11)}px` }} />)}</div>
      <Suspense fallback={<CampoBuscaVazio />}><BuscaMenu paginas={paginasBusca} aoIr={aoFechar} /></Suspense>

      {hoje.length > 0 && <section className="mn-hoje" aria-labelledby="mn-hoje-titulo">
        <p className="mn-etiqueta" id="mn-hoje-titulo">Hoje</p>
        <ul>{hoje.map((h) => <li key={h.destino}><a className="mn-hoje__cartao" href={href(h.destino)} onClick={aoFechar}>
          <span className="mn-hoje__arte" aria-hidden="true"><Sprite grade={h.arte} paleta={PALETA_MENU} px={2} /></span>
          <span className="mn-hoje__texto"><strong>{h.titulo}</strong><small>{h.texto}</small>{h.pct !== null && <span className="mn-hoje__barra" aria-hidden="true"><span style={{ width: `${h.pct}%` }} /></span>}</span>
          <Icone nome="direita" tamanho={16} />
        </a></li>)}</ul>
      </section>}

      <nav className="mn-principais" aria-label="O dia a dia">
        {PRINCIPAIS.map((item) => (
          <a key={item.destino} className="mn-principal" href={href(item.destino)} onClick={aoFechar} aria-current={atualDe(item) ? 'page' : undefined}>
            <span className="mn-principal__icone" aria-hidden="true" style={{ '--capa': CAPA[item.destino] ?? '#2f7a4a' } as CSSProperties}><Icone nome={item.icone} tamanho={20} /></span>
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
            <span className="mn-destaque__texto"><strong>{item.rotulo}{item.novo && <> <SeloNovo texto={item.novo} /></>}</strong><small>{item.texto}</small></span>
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
          <nav key={grupo.titulo} className="mn-grupo" aria-label={grupo.titulo} style={{ '--lombada': LOMBADA[grupo.titulo] ?? '#8a5530' } as CSSProperties}>
            <p className="mn-grupo__titulo mn-etiqueta">{grupo.titulo}</p>
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

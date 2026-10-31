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
import { calcularPlano } from '../../dados/planoEstudo'
import { usarPlanoSalvo } from '../../conta/cronograma'
import type { RegistroQuestao } from '../../estado/revisao'
import { indiceBibliotecaCarregado } from '../../biblioteca/conteudo'
import { usarBiblioteca } from '../../biblioteca/usarBiblioteca'
import { href } from '../../util/rotas'
import { Icone, type NomeIcone } from '../Icone'
import { Sprite } from '../../biblioteca/salao/Sprite'
import type { Grade, Paleta } from '../../biblioteca/salao/sprites'
import * as O from './sprites'
import { A_PARTIR_DE } from '../../dados/planos'
import { usarNacionalAbertoATodos } from '../../dados/nacionalEmDestaque'
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
 * Menu (31/10/2026, pedido do Tales: o livro aberto ficou confuso no computador e grande no celular). Volta a
 * organização do menu de 25/10 (busca, o dia a dia em cartões, planos, grupos em lista) com o acabamento do
 * design atual: todos os ícones na mesma arte, um objeto em pixel por página (como no salão da
 * Biblioteca), e títulos na fonte pixel.
 */
const PRINCIPAIS: Item[] = [
  { destino: '/treinar', rotulo: 'Treinar', texto: 'Monte uma sessão', icone: 'lapis' },
  { destino: '/revisao', rotulo: 'Revisão', texto: 'O que volta hoje', icone: 'reiniciar' },
  { destino: '/flashcards', rotulo: 'Flashcards', texto: 'Revisão rápida e jogo', icone: 'raio' },
  { destino: '/cronograma', rotulo: 'Cronograma', texto: 'O plano de cada dia', icone: 'rota', assinante: true },
  { destino: '/resumos', rotulo: 'Resumos', texto: 'Os temas que mais caem', icone: 'livro' },
  { destino: '/atlas', rotulo: 'Atlas 3D', texto: 'Ossos, fraturas e questões', icone: 'osso', novo: 'Novo' },
]
const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Estudar o conteúdo',
    itens: [
      { destino: '/cronograma-mao', rotulo: 'Cronograma da Mão', texto: 'Ingresso e título (SBCM e SIMÃO)', icone: 'calendario', assinante: true },
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
  { destino: '/resumos/frases', rotulo: 'Frases que caem', texto: 'Uma frase por assunto, dos comentários das questões de prova', icone: 'livro', chaves: 'resumao frases na prova vespera' },
  { destino: '/resumos/caderno', rotulo: 'Meu caderno de estudo', texto: 'Seus destaques e notas dos resumos', icone: 'lapis', chaves: 'marcacoes notas grifos destaques' },
  { destino: '/conquistas', rotulo: 'Conquistas e emblemas', texto: 'Inventário de emblemas e vitrine', icone: 'medalha', chaves: 'emblemas medalhas trofeus' },
]

/** Cor de cada grupo: o título e o filete. */
const COR_GRUPO: Record<string, string> = { 'Estudar o conteúdo': '#3f8a3a', 'Provas e disputa': '#b8452f', 'Seu progresso': '#2f6aa8', 'Conta e ajuda': '#7a4a8c' }
/** O objeto em pixel de cada página, pelo nome no menu (31/10/2026: todos os ícones na mesma arte do salão). */
const OBJETO: Record<string, Grade | [Grade, Paleta]> = {
  'Treinar': O.FOLHA, 'Revisão': O.AMPULHETA, 'Flashcards': O.CARTAS, 'Cronograma': O.CALENDARIO, 'Resumos': O.ESTANTE, 'Atlas 3D': O.CAIXA_3D,
  'Cronograma da Mão': [O.CALENDARIO, O.PALETA_MENU_AZUL], 'Temas que mais caem': O.PODIO, 'Torneio de Flashcards': O.ESCUDO,
  'Simulado Nacional': O.INGRESSO, 'Ranking': O.TROFEU, 'Liga da residência': O.BANDEIRA, 'Conquistas': O.BAU,
  'Seu desempenho': O.GRAFICO, 'Caderno de erros': O.CADERNO, 'Favoritas': O.ESTRELA, 'Relatório do mês': O.ENVELOPE,
  'Minha conta': O.PESSOA, 'Entrar ou criar conta': O.PESSOA, 'Minha assinatura': O.MEDALHA, 'Planos e assinatura': O.MEDALHA,
  'Indique e ganhe': O.PRESENTE, 'Suporte e contato': O.BALAO, 'O projeto': O.PERGAMINHO, 'Painel do administrador': O.CHAVE,
}

/** O ícone de todo o menu: o objeto em pixel da página, numa caixa de tamanho fixo para alinhar as linhas. */
function Objeto({ nome, grande }: { nome: string; grande?: boolean }) {
  const o = OBJETO[nome] ?? O.FOLHA
  const [grade, paleta] = Array.isArray(o[0]) ? o as [Grade, Paleta] : [o as Grade, O.PALETA_MENU]
  return <span className={'mn-obj' + (grande ? ' mn-obj--grande' : '')} aria-hidden="true"><Sprite grade={grade} paleta={paleta} px={grande ? 3 : 2} /></span>
}

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
  // Cronograma do assinante: o quanto do plano já foi feito e o que falta (só com o índice já na memória).
  const { plano } = usarPlanoSalvo(premium)
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const crono = useMemo(() => {
    const indice = indiceCarregado()
    return premium && plano && indice ? calcularPlano(indice, respondidas, plano) : null
  }, [premium, plano, respondidas])
  // Tela limpa: "Hoje" só aparece quando há algo para retomar.
  const hoje = [
    pendente && { destino: '/sessao', titulo: 'Continuar de onde parei', texto: `${sessaoLocal?.origem === 'cronograma' ? 'Sessão do cronograma' : 'Sua última sessão'} · ${pendente.feitas} de ${pendente.total} respondidas`, obj: 'Treinar', pct: Math.round((pendente.feitas / pendente.total) * 100) },
    crono && !crono.provaPassou && crono.alvo > 0 && { destino: '/cronograma', titulo: `Cronograma · ${Math.min(100, Math.round((crono.feitas / crono.alvo) * 100))}% do plano`, texto: `${crono.restante > 0 ? `Faltam ${crono.restante.toLocaleString('pt-BR')} questões` : 'Plano em dia'} e ${crono.diasAteProva} ${crono.diasAteProva === 1 ? 'dia' : 'dias'} até a prova${crono.metaDiaria ? ` · hoje ${crono.feitasHoje} de ${crono.metaDiaria}` : ''}`, obj: 'Cronograma', pct: Math.min(100, Math.round((crono.feitas / crono.alvo) * 100)) },
    revisarHoje > 0 && { destino: '/revisao', titulo: 'Revisão de hoje', texto: `${revisarHoje} ${revisarHoje === 1 ? 'questão volta' : 'questões voltam'} hoje`, obj: 'Revisão', pct: null },
    leitura && { destino: `/resumos/${leitura.capitulo}`, titulo: tituloLeitura ? `Resumo: ${tituloLeitura}` : 'Continuar a leitura', texto: `${leitura.progresso}% lido`, obj: 'Resumos', pct: leitura.progresso },
  ].filter(Boolean) as Array<{ destino: string; titulo: string; texto: string; obj: string; pct: number | null }>

  const conta: Item[] = [
    ...(contasDisponiveis
      ? [sessao
        ? { destino: '/conta', rotulo: 'Minha conta', texto: 'Perfil, preferências e backup', icone: 'usuario' as const }
        : { destino: '/conta?modo=entrar', rotulo: 'Entrar ou criar conta', texto: 'Guarde o progresso em qualquer aparelho', icone: 'usuario' as const }]
      : []),
    // sem assinatura, os planos ficam na faixa logo abaixo do dia a dia (não repetem aqui)
    ...(premium ? [{ destino: '/conta/assinatura', rotulo: 'Minha assinatura', texto: 'Plano, renovação e pagamentos', icone: 'medalha' as const }] : []),
    { destino: '/indicar', rotulo: 'Indique e ganhe', texto: '7 dias do plano completo para você e o colega', icone: 'grupo' },
    { destino: '/contato', rotulo: 'Suporte e contato', texto: 'Dúvida, sugestão ou problema', icone: 'interrogacao' },
    { destino: '/sobre', rotulo: 'O projeto', texto: 'Quem faz e como os comentários são feitos', icone: 'bandeira' },
    ...(administrador ? [{ destino: '/admin', rotulo: 'Painel do administrador', texto: 'Usuários, avaliações e pagamentos', icone: 'cadeado' as const }] : []),
  ]
  const grupos = [...GRUPOS, { titulo: 'Conta e ajuda', itens: conta }]
  const bloqueadoDe = (item: Item) => !!item.assinante && !premium && !(nacionalAberto && item.destino === '/simulado-nacional')
  const atualDe = (item: Item) => item.destino === caminho || (item.destino !== '/conta' && caminho.startsWith(item.destino + '/'))
  // A busca do topo acha estas páginas pelo nome, pelo texto e por sinônimos de quem procura.
  const paginasBusca: PaginaBusca[] = [
    ...[...PRINCIPAIS, { destino: '/flashcards/biblioteca', rotulo: 'Estudar flashcards', texto: 'Direto para a Biblioteca: revisão calma, sem jogo', icone: 'livro' as const }, ...grupos.flatMap((g) => g.itens)]
      .map((i) => ({ destino: i.destino, rotulo: i.rotulo, texto: i.texto, icone: i.icone, chaves: SINONIMOS[i.destino] })),
    ...EXTRAS_BUSCA,
  ]

  return (
    <div className="mn">
      <header className="mn__cabeca">
        <h2 className="mn__titulo">Menu</h2>
      </header>
      <Suspense fallback={<CampoBuscaVazio />}><BuscaMenu paginas={paginasBusca} aoIr={aoFechar} /></Suspense>

      {hoje.length > 0 && (
        <section className="mn-hoje" aria-label="Para retomar hoje">
          {hoje.map((h) => (
            <a key={h.destino} className="mn-hoje__linha" href={href(h.destino)} onClick={aoFechar}>
              <Objeto nome={h.obj} />
              <span className="mn-hoje__texto"><strong>{h.titulo}</strong><small>{h.texto}</small></span>
              {h.pct !== null && <span className="mn-blocos" aria-hidden="true">{Array.from({ length: 10 }, (_, k) => <i key={k} className={k < Math.round(h.pct! / 10) ? 'cheio' : ''} />)}</span>}
              <Icone nome="direita" tamanho={16} />
            </a>
          ))}
        </section>
      )}

      <nav className="mn-principais" aria-label="O dia a dia">
        {PRINCIPAIS.map((item) => (
          <a key={item.destino} className="mn-principal" href={href(item.destino)} onClick={aoFechar} aria-current={atualDe(item) ? 'page' : undefined}>
            <Objeto nome={item.rotulo} grande />
            <strong>{item.rotulo}</strong>
            <small>{item.texto}</small>
            {bloqueadoDe(item) && <span className="mn-cadeado mn-principal__selo" title="Recurso do assinante"><Icone nome="cadeado" tamanho={11} /></span>}
            {item.novo && <span className="mn-principal__novo">{item.novo}</span>}
          </a>
        ))}
      </nav>

      {/* Planos logo abaixo do dia a dia (pedido do Tales, 25/10/2026: tem de ser fácil de achar) */}
      {!premium && (
        <a className="mn-planos" href={href('/assinatura')} onClick={aoFechar}>
          <Objeto nome="Planos e assinatura" />
          <span className="mn-planos__texto"><strong>Planos e assinatura</strong><small>Cronograma, Simulado Nacional e o Atlas completo · a partir de {A_PARTIR_DE}/mês</small></span>
          <span className="mn-planos__acao">Ver planos <Icone nome="direita" tamanho={14} /></span>
        </a>
      )}

      <div className="mn__grupos">
        {grupos.map((grupo) => (
          <nav key={grupo.titulo} className="mn-grupo" aria-label={grupo.titulo} style={{ '--cor': COR_GRUPO[grupo.titulo] } as CSSProperties}>
            <p className="mn-grupo__titulo">{grupo.titulo}</p>
            <ul>
              {grupo.itens.map((item) => {
                const bloqueado = bloqueadoDe(item)
                // Relatório do mês é só por e-mail: quem não assina vai para os planos.
                const destino = bloqueado && item.rotulo === 'Relatório do mês' ? '/assinatura' : item.destino
                return (
                  <li key={item.rotulo}>
                    <a className="mn-item" href={href(destino)} onClick={aoFechar}
                      aria-current={atualDe(item) && item.rotulo !== 'Relatório do mês' ? 'page' : undefined}>
                      <Objeto nome={item.rotulo} />
                      <span className="mn-item__texto"><strong>{item.rotulo}{item.novo && <> <SeloNovo texto={item.novo} /></>}</strong><small>{item.texto}</small></span>
                      {bloqueado ? <span className="mn-cadeado" title="Recurso do assinante"><Icone nome="cadeado" tamanho={11} /></span> : <span className="mn-item__seta" aria-hidden="true"><Icone nome="direita" tamanho={16} /></span>}
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

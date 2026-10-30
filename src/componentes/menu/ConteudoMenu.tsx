import { lazy, Suspense, useMemo, useState, type CSSProperties } from 'react'
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
import { Sprite } from '../../biblioteca/salao/Sprite'
import { href } from '../../util/rotas'
import { recurso } from '../../config'
import { Icone, type NomeIcone } from '../Icone'
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

/** Cor de cada grupo: a plaquinha do sumário, a faixa ativa e o marcador colorido na borda do livro. */
const COR_GRUPO: Record<string, string> = { 'Estudar o conteúdo': '#3f8a3a', 'Provas e disputa': '#b8452f', 'Seu progresso': '#2f6aa8', 'Conta e ajuda': '#7a4a8c' }
/** Cor da capinha de cada atalho do dia a dia. */
const CAPA: Record<string, string> = { '/treinar': '#3f8a3a', '/revisao': '#2f6aa8', '/flashcards': '#b8452f', '/cronograma': '#9a6a2f', '/cronograma-mao': '#1f7a80', '/indicar': '#7a4a8c' }
/** Partículas de luz (posição, tamanho e ritmo fixos, para não mudar a cada abertura). */
const POEIRA = Array.from({ length: 22 }, (_, k) => ({
  x: (k * 37 + 11) % 100, y: (k * 53 + 7) % 100, s: k % 5 === 0 ? 14 + (k % 3) * 6 : 2 + (k % 3), t: 9 + (k % 7) * 1.7, d: -((k * 1.3) % 9), bokeh: k % 5 === 0,
}))
const idGrupo = (titulo: string) => 'mn-g-' + titulo.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase()

/**
 * Menu em forma de livro aberto em pixel (30/10/2026, pedido do Tales com diários de jogo como referência).
 * Página esquerda: "Hoje" (de onde parou nas questões, a revisão do dia e o resumo em leitura) e os atalhos do dia a
 * dia. Página direita: a busca e o sumário com todas as páginas em faixas, tudo à vista. No celular (painel), as duas
 * páginas viram uma só, em coluna. Abas de papel no alto, marcadores coloridos na borda e a fita embaixo.
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
  // Cronograma do assinante: o quanto do plano já foi feito e o que falta (só com o índice já na memória).
  const { plano } = usarPlanoSalvo(premium)
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const crono = useMemo(() => {
    const indice = indiceCarregado()
    return premium && plano && indice ? calcularPlano(indice, respondidas, plano) : null
  }, [premium, plano, respondidas])
  const hoje = [
    pendente && { destino: '/sessao', titulo: `Continuar a sessão · questão ${Math.min(pendente.feitas + 1, pendente.total)} de ${pendente.total}`, texto: `${sessaoLocal?.origem === 'cronograma' ? 'Sessão do cronograma' : 'Sua última sessão'} · ${pendente.feitas} respondidas, faltam ${pendente.total - pendente.feitas}`, arte: FOLHA, pct: Math.round((pendente.feitas / pendente.total) * 100) },
    crono && !crono.provaPassou && crono.alvo > 0 && { destino: '/cronograma', titulo: `Cronograma · ${Math.min(100, Math.round((crono.feitas / crono.alvo) * 100))}% do plano`, texto: `${crono.restante > 0 ? `Faltam ${crono.restante.toLocaleString('pt-BR')} questões` : 'Plano em dia'} e ${crono.diasAteProva} ${crono.diasAteProva === 1 ? 'dia' : 'dias'} até a prova${crono.metaDiaria ? ` · hoje ${crono.feitasHoje} de ${crono.metaDiaria}` : ''}`, arte: AMPULHETA, pct: Math.min(100, Math.round((crono.feitas / crono.alvo) * 100)) },
    revisarHoje > 0 && { destino: '/revisao', titulo: 'Revisão de hoje', texto: `${revisarHoje} ${revisarHoje === 1 ? 'questão volta' : 'questões voltam'} hoje`, arte: AMPULHETA, pct: null },
    leitura && { destino: `/resumos/${leitura.capitulo}`, titulo: tituloLeitura ? `Resumo: ${tituloLeitura}` : 'Continuar a leitura', texto: `Último resumo lido · ${leitura.progresso}% lido, faltam ${100 - (leitura.progresso ?? 0)}%`, arte: ESTANTE, pct: leitura.progresso },
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

  // A nota no pé da página direita mostra o que tem em cada item sob o mouse (no celular, o texto já vem na faixa).
  const [dica, definirDica] = useState<{ rotulo: string; texto: string } | null>(null)
  const mostrar = (item: { rotulo: string; texto: string }) => ({ onMouseEnter: () => definirDica(item), onFocus: () => definirDica(item) })
  const atalhos: Array<Item & { arte?: 'livros' | 'osso' }> = [...PRINCIPAIS, ...DESTAQUES,
    { destino: '/indicar', rotulo: 'Indique e ganhe', texto: '7 dias do plano completo para você e o colega', icone: 'grupo' }]
  const irAoGrupo = (titulo: string) => {
    const grupo = document.getElementById(idGrupo(titulo))
    grupo?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    grupo?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true })
  }

  return (
    <div className="mn-livro">
      {/* Luz de cena "HD-2D" (pedido do Tales, 30/10/2026, Octopath Traveler II de referência): feixes de luz quente
          entrando de cima, poeira e bokeh flutuando no ar. Só decoração, sem clique. */}
      <span className="mn-luz" aria-hidden="true">
        <span className="mn-luz__feixes" />
        {POEIRA.map((p, k) => <i key={k} className={p.bokeh ? 'bokeh' : ''} style={{ left: `${p.x}%`, top: `${p.y}%`, '--t': `${p.t}s`, '--d': `${p.d}s`, '--s': `${p.s}px` } as CSSProperties} />)}
      </span>
      {/* Um pouco de poeira passa também na frente do livro, sem cobrir a leitura. */}
      <span className="mn-luz mn-luz--frente" aria-hidden="true">
        {POEIRA.filter((p) => !p.bokeh).slice(0, 8).map((p, k) => <i key={k} style={{ left: `${(p.x + 43) % 100}%`, top: `${(p.y + 29) % 100}%`, '--t': `${p.t + 3}s`, '--d': `${p.d}s`, '--s': '2px' } as CSSProperties} />)}
      </span>
      {/* Abas de papel no alto do livro (como "exit" e "options" dos diários de jogo). */}
      <div className="mn-livro__abas">
        <p className="mn-aba mn-aba--titulo">Menu</p>
        <span className="mn-livro__vao" />
        {conta[0] && contasDisponiveis && <a className="mn-aba" href={href(conta[0].destino)} onClick={aoFechar}>{sessao ? 'Minha conta' : 'Entrar'}</a>}
        <button type="button" className="mn-aba mn-aba--fechar" onClick={aoFechar} aria-label="Fechar o menu">Fechar <Icone nome="fechar" tamanho={16} /></button>
      </div>

      <div className="mn-livro__capa">
        <span className="mn-livro__canto mn-livro__canto--1" aria-hidden="true" /><span className="mn-livro__canto mn-livro__canto--2" aria-hidden="true" />
        <span className="mn-livro__canto mn-livro__canto--3" aria-hidden="true" /><span className="mn-livro__canto mn-livro__canto--4" aria-hidden="true" />
        <div className="mn-livro__miolo">
          {/* Página esquerda: o dia de hoje e os atalhos do dia a dia. */}
          <section className="mn-pagina mn-pagina--esq" aria-label="Hoje e o dia a dia">
            <h2 className="mn-faixa-titulo"><span>Hoje</span></h2>
            {hoje.length > 0
              ? <ul className="mn-hoje">{hoje.map((h) => <li key={h.destino}><a className="mn-hoje__linha" href={href(h.destino)} onClick={aoFechar}>
                <span className="mn-hoje__arte" aria-hidden="true"><Sprite grade={h.arte} paleta={PALETA_MENU} px={2} /></span>
                <span className="mn-hoje__texto"><strong>{h.titulo}</strong><small>{h.texto}</small>
                  {h.pct !== null && <span className="mn-blocos" aria-hidden="true">{Array.from({ length: 10 }, (_, k) => <i key={k} className={k < Math.round(h.pct! / 10) ? 'cheio' : ''} />)}</span>}</span>
                <span className="mn-hoje__ir" aria-hidden="true">▸</span>
              </a></li>)}</ul>
              : <a className="mn-hoje__vazio" href={href('/treinar')} onClick={aoFechar}>
                <span className="mn-hoje__arte" aria-hidden="true"><Sprite grade={FOLHA} paleta={PALETA_MENU} px={2} /></span>
                <span className="mn-hoje__texto"><strong>Página em branco</strong><small>Nada pendente por hoje. Que tal começar uma sessão?</small></span>
                <span className="mn-hoje__ir" aria-hidden="true">▸</span>
              </a>}

            <h2 className="mn-faixa-titulo mn-faixa-titulo--verde"><span>Dia a dia</span></h2>
            <nav className="mn-atalhos" aria-label="O dia a dia">
              {atalhos.map((item) => (
                <a key={item.destino} className="mn-atalho" href={href(item.destino)} onClick={aoFechar} aria-current={atualDe(item) ? 'page' : undefined}
                  style={{ '--capa': CAPA[item.destino] ?? '#8a5530' } as CSSProperties} {...mostrar(item)}>
                  <span className="mn-atalho__arte" aria-hidden="true">
                    {item.arte === 'osso'
                      ? <img src={recurso('atlas3d/icone-mao.png')} width={40} height={40} alt="" loading="lazy" decoding="async" />
                      : item.arte === 'livros' ? <span className="ip-px ip-px--livros"><i /><i /><i /></span>
                        : <span className="mn-atalho__capa"><Icone nome={item.icone} tamanho={20} /></span>}
                  </span>
                  <strong>{item.rotulo}</strong>
                  <small className="mn-atalho__texto">{item.texto}</small>
                  {bloqueadoDe(item) && <span className="mn-atalho__cadeado" title="Recurso do assinante"><Icone nome="cadeado" tamanho={12} /></span>}
                  {item.novo && <span className="mn-atalho__novo">{item.novo}</span>}
                </a>
              ))}
            </nav>

            {/* Pé da página: a mesinha de estudo com a vela acesa, a fonte de luz da cena. */}
            {hoje.length < 3 && <div className="mn-mesa" aria-hidden="true">
              <Sprite grade={ESTANTE} paleta={PALETA_MENU} px={3} />
              <span className="mn-vela"><span className="mn-vela__chama" /><span className="mn-vela__halo" /></span>
              <Sprite grade={AMPULHETA} paleta={PALETA_MENU} px={3} />
              <p>Um capítulo por dia, e a prova vira rotina.</p>
            </div>}
          </section>

          <span className="mn-livro__lombada" aria-hidden="true">{Array.from({ length: 7 }, (_, k) => <i key={k} />)}</span>

          {/* Página direita: a busca e o sumário de todas as páginas, em faixas. */}
          <section className="mn-pagina mn-pagina--dir" aria-label="Sumário" onMouseLeave={() => definirDica(null)}>
            <h2 className="mn-faixa-titulo mn-faixa-titulo--azul"><span>Sumário</span></h2>
            <Suspense fallback={<CampoBuscaVazio />}><BuscaMenu paginas={paginasBusca} aoIr={aoFechar} /></Suspense>
            <div className="mn-sumario">
              {grupos.map((grupo) => (
                <nav key={grupo.titulo} id={idGrupo(grupo.titulo)} className="mn-capitulo" aria-label={grupo.titulo} style={{ '--cor': COR_GRUPO[grupo.titulo] ?? '#8a5530' } as CSSProperties}>
                  <p className="mn-placa">{grupo.titulo}</p>
                  <ul>
                    {grupo.itens.map((item) => {
                      const bloqueado = bloqueadoDe(item)
                      // Relatório do mês é só por e-mail: quem não assina vai para os planos.
                      const destino = bloqueado && item.rotulo === 'Relatório do mês' ? '/assinatura' : item.destino
                      return (
                        <li key={item.rotulo}>
                          <a className="mn-faixa" href={href(destino)} onClick={aoFechar} {...mostrar(item)}
                            aria-current={atualDe(item) && item.rotulo !== 'Relatório do mês' ? 'page' : undefined}>
                            <span className="mn-faixa__texto"><strong>{item.rotulo}{item.novo && <> <SeloNovo texto={item.novo} /></>}</strong><small>{item.texto}</small></span>
                            {bloqueado ? <span className="mn-faixa__cadeado" title="Recurso do assinante"><Icone nome="cadeado" tamanho={13} /></span> : <span className="mn-faixa__seta" aria-hidden="true">▸</span>}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              ))}
            </div>
            <p className="mn-nota" aria-hidden="true">
              {dica ? <><b>{dica.rotulo}</b> {dica.texto}</> : 'Passe o mouse num item para ler o que tem dentro.'}
            </p>
            {!premium && (
              <a className="mn-planos" href={href('/assinatura')} onClick={aoFechar}>
                <strong>Planos e assinatura</strong><small>a partir de {A_PARTIR_DE}/mês</small><span aria-hidden="true">▸</span>
              </a>
            )}
            <p className="mn-rodape">
              <a href={href('/termos')} onClick={aoFechar}>Termos de uso</a>
              <a href={href('/condicoes-assinatura')} onClick={aoFechar}>Condições da assinatura</a>
            </p>
          </section>
        </div>
      </div>

      {/* Marcadores coloridos na borda do livro: um por capítulo do sumário. */}
      <div className="mn-livro__marcadores">
        {grupos.map((g) => <button key={g.titulo} type="button" className="mn-marcador" style={{ '--cor': COR_GRUPO[g.titulo] ?? '#8a5530' } as CSSProperties}
          onClick={() => irAoGrupo(g.titulo)} title={g.titulo} aria-label={`Ir para ${g.titulo}`} />)}
      </div>
      <span className="mn-livro__fita" aria-hidden="true" />
    </div>
  )
}

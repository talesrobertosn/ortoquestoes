import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { usarConta } from '../../conta/ContextoConta'
import { contasDisponiveis } from '../../conta/supabase'
import { usarAdministrador } from '../../conta/administrador'
import { usarPremium } from '../../conta/premium'
import { usarArmazenado } from '../../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../../estado/sessao'
import { usarContextoLocal } from '../../estado/usarContextoLocal'
import { contar, indiceCarregado } from '../../dados/acervo'
import { AREAS_TREINO, FILTROS_VAZIOS, type EstadoSessao } from '../../dados/tipos'
import { A_PARTIR_DE } from '../../dados/planos'
import { usarNacionalAbertoATodos } from '../../dados/nacionalEmDestaque'
import { indiceBibliotecaCarregado } from '../../biblioteca/conteudo'
import { usarBiblioteca } from '../../biblioteca/usarBiblioteca'
import { acharSegredo } from '../../biblioteca/salao/segredos'
import { Sprite } from '../../biblioteca/salao/Sprite'
import { GATO_DORMINDO, GATO_ACORDADO, LAMPARINA, PALETA_GATO, PALETA_LAMPARINA, type Grade, type Paleta } from '../../biblioteca/salao/sprites'
import { href, navegar } from '../../util/rotas'
import { Icone, type NomeIcone } from '../Icone'
import type { PaginaBusca } from '../BuscaMenu'
import { AMPULHETA, BANDEIRA, BAU, CAIXA_3D, CALENDARIO, CARTAS, ESCUDO, ESTANTE, FOLHA, INGRESSO, PALETA_MENU, PALETA_MENU_AZUL, PODIO, TROFEU } from './sprites'
import '../../estilos/componentes/Menu.css'

/**
 * Menu no estilo do salão da Biblioteca (pedido do Tales, 30/10/2026: "mais legal, interativo e bonito, com uma
 * experiência fenomenal, no celular também"). Parede com o relógio e o fichário de busca; a mesa "Hoje" com o que
 * a pessoa tem para fazer agora; duas prateleiras de objetos em pixel (Estudar e Desafios), cada um com a sua
 * animação; a gaveta "Seu progresso"; a recepção (conta e ajuda). Dois segredos: o gato e o relógio ao contrário.
 */

interface Objeto {
  destino: string
  rotulo: string
  texto: string
  sprite: Grade
  paleta?: Paleta
  /** A animação do objeto ao passar o mouse (classe mn-obj--<anim>). */
  anim: 'rabisca' | 'vira' | 'carta' | 'folha' | 'pula' | 'abre' | 'cresce' | 'balanca' | 'brilha' | 'inclina' | 'tremula' | 'chacoalha'
  assinante?: boolean
}
interface Item { destino: string; rotulo: string; texto: string; icone: NomeIcone; assinante?: boolean }

const ESTUDAR: Objeto[] = [
  { destino: '/treinar', rotulo: 'Treinar', texto: 'Monte uma sessão', sprite: FOLHA, anim: 'rabisca' },
  { destino: '/revisao', rotulo: 'Revisão', texto: 'O que volta hoje', sprite: AMPULHETA, anim: 'vira' },
  { destino: '/flashcards', rotulo: 'Flashcards', texto: 'Revisão rápida', sprite: CARTAS, anim: 'carta' },
  { destino: '/resumos', rotulo: 'Resumos', texto: 'A biblioteca', sprite: ESTANTE, anim: 'pula' },
  { destino: '/atlas', rotulo: 'Atlas 3D', texto: 'Clique no osso', sprite: CAIXA_3D, anim: 'abre' },
  { destino: '/cronograma', rotulo: 'Cronograma', texto: 'O plano do dia', sprite: CALENDARIO, anim: 'folha', assinante: true },
  { destino: '/cronograma-mao', rotulo: 'Cronograma da Mão', texto: 'SBCM e SIMÃO', sprite: CALENDARIO, paleta: PALETA_MENU_AZUL, anim: 'folha', assinante: true },
  { destino: '/temas-que-mais-caem', rotulo: 'Temas que mais caem', texto: 'Prova por prova', sprite: PODIO, anim: 'cresce', assinante: true },
]
const DESAFIOS: Objeto[] = [
  { destino: '/simulado-nacional', rotulo: 'Simulado Nacional', texto: 'Ranking do Brasil', sprite: INGRESSO, anim: 'balanca', assinante: true },
  { destino: '/ranking', rotulo: 'Ranking', texto: 'Sua posição', sprite: TROFEU, anim: 'brilha' },
  { destino: '/flashcards/cripta', rotulo: 'Torneio', texto: 'Flashcards em jogo', sprite: ESCUDO, anim: 'inclina' },
  { destino: '/ligas', rotulo: 'Liga', texto: 'Com o seu serviço', sprite: BANDEIRA, anim: 'tremula', assinante: true },
  { destino: '/conquistas', rotulo: 'Conquistas', texto: 'Seus emblemas', sprite: BAU, anim: 'chacoalha' },
]
const PROGRESSO: Item[] = [
  { destino: '/dados', rotulo: 'Seu desempenho', texto: 'Acerto por tema e evolução', icone: 'grafico' },
  { destino: '/erros', rotulo: 'Caderno de erros', texto: 'Tudo o que você errou, para refazer', icone: 'alerta' },
  { destino: '/favoritas', rotulo: 'Favoritas', texto: 'As questões com estrela', icone: 'estrela' },
  { destino: '/conta', rotulo: 'Relatório do mês', texto: 'Todo dia 1º, no seu e-mail', icone: 'correio', assinante: true },
]

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
const EXTRAS_BUSCA: PaginaBusca[] = [
  { destino: '/resumos/frases', rotulo: 'Frases que caem', texto: 'Uma frase por assunto, dos comentários das questões de prova', icone: 'livro', chaves: 'resumao frases na prova vespera' },
  { destino: '/resumos/caderno', rotulo: 'Meu caderno de estudo', texto: 'Seus destaques e notas dos resumos', icone: 'lapis', chaves: 'marcacoes notas grifos destaques' },
  { destino: '/flashcards/biblioteca', rotulo: 'Estudar flashcards', texto: 'Direto para a Biblioteca: revisão calma, sem jogo', icone: 'livro' },
]
const ICONE_OBJETO: Record<string, NomeIcone> = { '/treinar': 'livro', '/revisao': 'reiniciar', '/flashcards': 'raio', '/resumos': 'livro', '/atlas': 'cubo', '/cronograma': 'rota', '/cronograma-mao': 'calendario', '/temas-que-mais-caem': 'grafico', '/simulado-nacional': 'alvo', '/ranking': 'trofeu', '/flashcards/cripta': 'trofeu', '/ligas': 'grupo', '/conquistas': 'medalha' }

const BuscaMenu = lazy(() => import('../BuscaMenu').then((m) => ({ default: m.BuscaMenu })))
function CampoBuscaVazio() {
  return <div className="mn-busca"><label className="mn-busca__campo"><Icone nome="busca" tamanho={18} /><input type="search" disabled placeholder="Buscar: Garden, tríade terrível, revisão…" aria-label="Buscar no site" /></label></div>
}
const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export default function ConteudoMenu({ caminho, aoFechar }: { caminho: string; aoFechar: () => void }) {
  const { sessao } = usarConta()
  const { premium } = usarPremium()
  const nacionalAberto = usarNacionalAbertoATodos()
  const administrador = usarAdministrador(sessao?.user.id)
  const [sessaoLocal] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)
  const { contexto } = usarContextoLocal('')
  const { leituras } = usarBiblioteca()
  const [aviso, definirAviso] = useState<string | null>(null)
  const [gato, definirGato] = useState(false)
  const [relogioVolta, definirRelogioVolta] = useState(false)
  const toques = useRef<number[]>([])
  const agora = useMemo(() => new Date(), [])
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => definirAviso(null), 4200); return () => window.clearTimeout(t) }, [aviso])

  // ── O que há para hoje (só com dados que já estão no aparelho: o menu não baixa índice nenhum) ──
  const feitas = sessaoLocal ? Object.keys(sessaoLocal.respostas).length : 0
  const pendente = sessaoLocal && !sessaoLocal.concluidaEm && feitas < sessaoLocal.ids.length ? { feitas, total: sessaoLocal.ids.length } : null
  const revisarHoje = useMemo(() => {
    const indice = indiceCarregado()
    return indice ? contar(indice, { ...FILTROS_VAZIOS, areas: AREAS_TREINO }, contexto).porSituacao.revisarHoje : null
  }, [contexto])
  const leitura = useMemo(() => Object.values(leituras)
    .filter((l): l is NonNullable<typeof l> => !!l && (l.progresso ?? 0) > 2 && !l.concluidoEm && (l.progresso ?? 0) < 95)
    .sort((a, b) => b.em - a.em)[0] ?? null, [leituras])
  const tituloLeitura = leitura ? indiceBibliotecaCarregado()?.capitulos.find((c) => c.id === leitura.capitulo)?.titulo ?? null : null

  const bloqueado = (destino: string, assinante?: boolean) => !!assinante && !premium && !(nacionalAberto && destino === '/simulado-nacional')
  const atual = (destino: string) => destino === caminho || (destino !== '/conta' && caminho.startsWith(destino + '/'))
  const contador = (destino: string): string | null =>
    destino === '/revisao' && revisarHoje ? `${revisarHoje > 99 ? '99+' : revisarHoje} hoje`
    : destino === '/treinar' && pendente ? `${pendente.feitas}/${pendente.total}`
    : destino === '/cronograma' && premium ? `${agora.getDate()} ${MESES[agora.getMonth()]}`
    : null

  const conta: Item[] = [
    ...(contasDisponiveis
      ? [sessao
        ? { destino: '/conta', rotulo: 'Minha conta', texto: 'Perfil, preferências e backup', icone: 'usuario' as const }
        : { destino: '/conta?modo=entrar', rotulo: 'Entrar ou criar conta', texto: 'Guarde o progresso em qualquer aparelho', icone: 'usuario' as const }]
      : []),
    ...(premium ? [{ destino: '/conta/assinatura', rotulo: 'Minha assinatura', texto: 'Plano, renovação e pagamentos', icone: 'medalha' as const }] : []),
    { destino: '/indicar', rotulo: 'Indique e ganhe', texto: '7 dias do plano para você e o colega', icone: 'grupo' },
    { destino: '/contato', rotulo: 'Suporte', texto: 'Dúvida, sugestão ou problema', icone: 'interrogacao' },
    { destino: '/sobre', rotulo: 'O projeto', texto: 'Quem faz os comentários', icone: 'bandeira' },
    ...(administrador ? [{ destino: '/admin', rotulo: 'Administrador', texto: 'Usuários e pagamentos', icone: 'cadeado' as const }] : []),
  ]
  const paginasBusca: PaginaBusca[] = [
    ...[...ESTUDAR, ...DESAFIOS].map((o) => ({ destino: o.destino, rotulo: o.rotulo, texto: o.texto, icone: ICONE_OBJETO[o.destino] ?? 'livro', chaves: SINONIMOS[o.destino] })),
    ...[...PROGRESSO, ...conta].map((i) => ({ destino: i.destino, rotulo: i.rotulo, texto: i.texto, icone: i.icone, chaves: SINONIMOS[i.destino] })),
    ...EXTRAS_BUSCA,
  ]

  // ── Segredos ──
  const tocarRelogio = () => {
    const t = Date.now()
    toques.current = [...toques.current.filter((x) => t - x < 2500), t]
    if (toques.current.length < 5) return
    toques.current = []
    definirRelogioVolta(true)
    window.setTimeout(() => definirRelogioVolta(false), 1600)
    const novo = acharSegredo('relogioMenu')
    definirAviso(`${novo ? 'Segredo encontrado! ' : ''}Revisão é voltar no tempo, na hora certa.`)
  }
  const tocarGato = () => {
    if (gato) return
    definirGato(true)
    const novo = acharSegredo('gatoMenu')
    definirAviso(`${novo ? 'Segredo encontrado! ' : ''}O gato pulou para a Biblioteca. Siga-o!`)
    window.setTimeout(() => { aoFechar(); navegar('/resumos') }, semMovimento() ? 300 : 1300)
  }

  // Clique num objeto: um aperto curto (só visual) e a navegação segue normal; Ctrl, Cmd e botão do meio abrem direto.
  const apertar = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    aoFechar()
  }

  const hoje = [
    pendente && { destino: '/sessao', titulo: 'Continuar a sessão', texto: `${sessaoLocal?.origem === 'cronograma' ? 'Sessão do cronograma' : 'Sua última sessão'} · ${pendente.feitas} de ${pendente.total}`, sprite: FOLHA, pct: Math.round((pendente.feitas / pendente.total) * 100) },
    revisarHoje ? { destino: '/revisao', titulo: 'Revisão de hoje', texto: `${revisarHoje} ${revisarHoje === 1 ? 'questão volta' : 'questões voltam'} hoje`, sprite: AMPULHETA, pct: null } : null,
    leitura && { destino: `/resumos/${leitura.capitulo}`, titulo: tituloLeitura ? `Resumo: ${tituloLeitura}` : 'Continuar a leitura', texto: `${leitura.progresso}% lido`, sprite: ESTANTE, pct: leitura.progresso },
  ].filter(Boolean) as Array<{ destino: string; titulo: string; texto: string; sprite: Grade; pct: number | null }>

  const prateleira = (titulo: string, objetos: Objeto[], comGato = false) => (
    <nav className="mn-prateleira" aria-label={titulo}>
      <p className="mn-placa"><span>{titulo}</span></p>
      {comGato && <button type="button" className={'mn-gato' + (gato ? ' mn-gato--pula' : '')} onClick={tocarGato} aria-label="Gato da biblioteca, dormindo">
        <Sprite grade={gato ? GATO_ACORDADO : GATO_DORMINDO} paleta={PALETA_GATO} px={2} />
      </button>}
      <ul className="mn-objetos">
        {objetos.map((o, i) => {
          const fechado = bloqueado(o.destino, o.assinante)
          const n = contador(o.destino)
          return (
            <li key={o.destino} style={{ '--i': i } as CSSProperties}>
              <a className={`mn-obj mn-obj--${o.anim}${fechado ? ' mn-obj--fechado' : ''}`} href={href(o.destino)} onClick={apertar} aria-current={atual(o.destino) ? 'page' : undefined}>
                <span className="mn-obj__nicho" aria-hidden="true">
                  <span className="mn-obj__arte"><Sprite grade={o.sprite} paleta={o.paleta ?? PALETA_MENU} px={3} /></span>
                  {n && <b className="mn-obj__contador numerico">{n}</b>}
                  {fechado && <span className="mn-obj__cadeado"><Icone nome="cadeado" tamanho={11} /></span>}
                </span>
                <strong>{o.rotulo}</strong>
                <small>{fechado ? 'Assinantes' : o.texto}</small>
                {atual(o.destino) && <span className="so-leitor">(página atual)</span>}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )

  return (
    <div className="mn mn--salao">
      <header className="mn-parede">
        <span className="mn-parede__luz mn-parede__luz--a" aria-hidden="true"><Sprite grade={LAMPARINA} paleta={PALETA_LAMPARINA} px={2} /></span>
        <h2 className="mn-parede__titulo">Menu</h2>
        <button type="button" className={'mn-relogio' + (relogioVolta ? ' mn-relogio--volta' : '')} onClick={tocarRelogio} aria-label={`Relógio: ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}>
          <i className="mn-relogio__h" style={{ transform: `rotate(${(agora.getHours() % 12) * 30 + agora.getMinutes() / 2}deg)` }} />
          <i className="mn-relogio__m" style={{ transform: `rotate(${agora.getMinutes() * 6}deg)` }} />
        </button>
        <span className="mn-parede__luz mn-parede__luz--b" aria-hidden="true"><Sprite grade={LAMPARINA} paleta={PALETA_LAMPARINA} px={2} /></span>
        <div className="mn-fichario">
          <Suspense fallback={<CampoBuscaVazio />}><BuscaMenu paginas={paginasBusca} aoIr={aoFechar} /></Suspense>
        </div>
      </header>

      <section className="mn-mesa" aria-labelledby="mn-hoje">
        <p className="mn-mesa__rotulo" id="mn-hoje">Hoje</p>
        {hoje.length > 0
          ? <ul className="mn-hoje">{hoje.map((h) => (
            <li key={h.destino}><a className="mn-hoje__cartao" href={href(h.destino)} onClick={apertar}>
              <span className="mn-hoje__arte" aria-hidden="true"><Sprite grade={h.sprite} paleta={PALETA_MENU} px={2} /></span>
              <span className="mn-hoje__texto"><strong>{h.titulo}</strong><small>{h.texto}</small>{h.pct !== null && <span className="mn-hoje__barra" aria-hidden="true"><span style={{ width: `${h.pct}%` }} /></span>}</span>
              <Icone nome="direita" tamanho={16} />
            </a></li>
          ))}</ul>
          : <a className="mn-hoje__cartao mn-hoje__cartao--vazio" href={href('/treinar')} onClick={apertar}>
            <span className="mn-hoje__arte" aria-hidden="true"><Sprite grade={FOLHA} paleta={PALETA_MENU} px={2} /></span>
            <span className="mn-hoje__texto"><strong>Comece pelo Treinar</strong><small>Escolha um tema e responda: a revisão e o progresso se montam sozinhos.</small></span>
            <Icone nome="direita" tamanho={16} />
          </a>}
      </section>

      {prateleira('Estudar', ESTUDAR, true)}
      {prateleira('Desafios', DESAFIOS)}

      <details className="mn-gaveta" open={typeof matchMedia !== 'undefined' && matchMedia('(max-width: 40rem)').matches}>
        <summary><span className="mn-gaveta__puxador" aria-hidden="true" /> Seu progresso <Icone nome="baixo" tamanho={16} /></summary>
        <ul>{PROGRESSO.map((i) => {
          const fechado = bloqueado(i.destino, i.assinante)
          const destino = fechado && i.rotulo === 'Relatório do mês' ? '/assinatura' : i.destino
          return <li key={i.rotulo}><a className="mn-linha" href={href(destino)} onClick={apertar} aria-current={atual(i.destino) && i.rotulo !== 'Relatório do mês' ? 'page' : undefined}>
            <span className="mn-linha__icone" aria-hidden="true"><Icone nome={i.icone} tamanho={17} /></span>
            <span><strong>{i.rotulo}</strong><small>{fechado ? 'Para assinantes' : i.texto}</small></span>
            {fechado ? <Icone nome="cadeado" tamanho={14} /> : <Icone nome="direita" tamanho={15} />}
          </a></li>
        })}</ul>
      </details>

      {!premium && <a className="mn-latao" href={href('/assinatura')} onClick={apertar}>
        <span className="mn-latao__selo" aria-hidden="true"><Icone nome="medalha" tamanho={18} /></span>
        <span><strong>Planos e assinatura</strong><small>Cronograma, Simulado Nacional e todas as camadas do Atlas · a partir de {A_PARTIR_DE}/mês</small></span>
        <span className="mn-latao__acao">Ver planos <Icone nome="direita" tamanho={14} /></span>
      </a>}

      <footer className="mn-recepcao">
        <p className="mn-recepcao__titulo"><span className="mn-sino" aria-hidden="true" /> Recepção</p>
        <ul>{conta.map((i) => <li key={i.destino}><a href={href(i.destino)} onClick={apertar} aria-current={atual(i.destino) ? 'page' : undefined}><Icone nome={i.icone} tamanho={15} /> {i.rotulo}</a></li>)}</ul>
        <p className="mn-recepcao__termos"><a href={href('/termos')} onClick={aoFechar}>Termos de uso</a><a href={href('/condicoes-assinatura')} onClick={aoFechar}>Condições da assinatura</a></p>
      </footer>

      {aviso && <p className="mn-aviso" role="status">{aviso}</p>}
    </div>
  )
}

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis, supabase } from '../conta/supabase'
import { href } from '../util/rotas'
import { recurso } from '../config'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { EmblemasDoNome, Fogueira, Inventario } from '../componentes/Inventario'

/** Abas: ranking de questões, ranking do Torneio de Flashcards (beta) e inventário de conquistas. */
function AbasRanking({ atual, conquistadas, total }: { atual: 'ranking' | 'conquistas'; conquistadas: number; total: number }) {
  return <nav className="rk-secoes" aria-label="Ranking e conquistas">
    <a className="rk-secoes__aba" href={href('/ranking')} aria-current={atual === 'ranking' ? 'page' : undefined}><Icone nome="trofeu" tamanho={18} /> Questões</a>
    <a className="rk-secoes__aba" href={href('/ranking?aba=flashcards')}><Icone nome="raio" tamanho={18} /> Flashcards <span className="selo-beta">Beta</span></a>
    <a className="rk-secoes__aba" href={href('/conquistas')} aria-current={atual === 'conquistas' ? 'page' : undefined}><Icone nome="medalha" tamanho={18} /> Conquistas <span className="rk-secoes__contador numerico">{conquistadas}/{total}</span></a>
  </nav>
}
import { SeloAssinante } from '../componentes/Premium'
import { conquistaAtual, emblemaPorId, VITRINE_MAXIMO } from '../estado/conquistas'
import { usarConquistas } from '../estado/usarConquistas'
import { Medalha } from '../componentes/Medalha'
import { RelogioPixel } from '../componentes/RelogioPixel'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { META_STREAK_DIARIA } from '../estado/streak'
import { MINIMO_RANKING } from '../util/nomeRanking'
import { usarPerfilRanking, usarPublicarSequencia } from '../conta/perfilRanking'
import { SeloServico } from '../componentes/ServicoRanking'
import { SalaoCampeoes } from '../componentes/SalaoCampeoes'
import '../estilos/paginas/Ranking.css'
import '../estilos/paginas/RankingQuestoes.css'

type Periodo = 'geral' | 'semana'
type LinhaRanking = {
  posicao: number; apelido: string; total: number; total_geral: number; eh_voce: boolean
  variacao: number | null; variacao_semana: number | null; novo: boolean; referencia_em: string | null
  /** Vitrine escolhida pela pessoa e sequência viva (fogueira). Ausentes antes da migration. */
  emblemas?: string[] | null; sequencia?: number | null
  /** Serviço (local da residência), só de quem ligou a opção. */
  servico?: string | null
}
type MinhaPosicao = { posicao: number; total: number; total_geral: number } | null

const ROTULOS_PERIODO: Record<Periodo, string> = { geral: 'Geral', semana: 'Últimos 7 dias' }

// Subir 3 posições de um dia para o outro, ou 5 na semana, acende o foguinho.
const FOGO_NO_DIA = 3
const FOGO_NA_SEMANA = 5

const posicoes = (n: number) => `${n} ${n === 1 ? 'posição' : 'posições'}`
const dataCurta = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/')

function emChamas(linha: LinhaRanking): boolean {
  return (linha.variacao ?? 0) >= FOGO_NO_DIA || (linha.variacao_semana ?? 0) >= FOGO_NA_SEMANA
}

function Movimento({ linha }: { linha: LinhaRanking }) {
  const { variacao: valor, referencia_em: referencia, variacao_semana: semana } = linha
  const fogo = emChamas(linha)
  if (linha.novo) return <span className="rk-movimento rk-movimento--novo" title="Entrou no ranking desde o último registro">novo</span>
  if (!referencia) return null
  if (!valor) {
    if (!fogo) return <span className="rk-movimento rk-movimento--parado" title={`Mesma posição desde ${dataCurta(referencia)}`}><span aria-hidden="true">=</span><span className="rk-movimento__sr">Mesma posição desde {dataCurta(referencia)}</span></span>
  }
  const subiu = (valor ?? 0) > 0 || (!valor && fogo)
  const quantidade = Math.abs(valor ?? 0)
  const partes = [valor ? `${subiu ? 'Subiu' : 'Desceu'} ${posicoes(quantidade)} desde ${dataCurta(referencia)}` : `Mesma posição desde ${dataCurta(referencia)}`]
  if (semana && semana > 0) partes.push(`subiu ${posicoes(semana)} na semana`)
  if (fogo) partes.push('em chamas')
  const descricao = partes.join(', ')
  return <span className={`rk-movimento rk-movimento--${subiu ? 'subiu' : 'desceu'}${fogo ? ' rk-movimento--fogo' : ''}`} title={descricao}>
    <span aria-hidden="true">{quantidade > 0 && <><Icone nome={subiu ? 'cima' : 'baixo'} tamanho={15} />{quantidade}</>}{fogo && <img className="rk-chama" src={recurso('ranking/chama.png')} width={15} height={15} alt="" draggable={false} />}</span>
    <span className="rk-movimento__sr">{descricao}</span>
  </span>
}

/** Chama animada do Salão dos Campeões (três quadros de pixel art). */
function ChamaSalao({ classe }: { classe: string }) {
  return <span className={classe} aria-hidden="true">
    {[0, 1, 2].map((k) => <img key={k} src={recurso(`ranking/salao/fogo-${k}.png`)} alt="" draggable={false} />)}
  </span>
}

/** Brasas que sobem pelo fundo, com posições fixas para não mudar a cada render. */
const BRASAS_ALTA = Array.from({ length: 16 }, (_, i) => ({ l: 4 + ((i * 41.3) % 92), d: 3.2 + (i % 5) * 0.7, a: -((i * 0.83) % 5), dx: ((i * 7) % 11) - 5, s: 2 + (i % 3) }))

/** Quem mais subiu desde o último registro, no mesmo salão noturno do Top 3: a escadaria de quem está jogando. */
function EmAlta({ linhas }: { linhas: LinhaRanking[] }) {
  const subindo = linhas
    .filter(linha => (linha.variacao ?? 0) > 0 || (linha.variacao_semana ?? 0) >= FOGO_NA_SEMANA)
    .sort((a, b) => (b.variacao ?? 0) - (a.variacao ?? 0) || (b.variacao_semana ?? 0) - (a.variacao_semana ?? 0) || a.posicao - b.posicao)
    .slice(0, 3)
  if (!subindo.length) return null
  return <section className="sb" aria-labelledby="sb-titulo">
    <img className="sb__fundo" src={recurso('ranking/salao/fundo.png')} alt="" draggable={false} aria-hidden="true" loading="lazy" decoding="async" />
    <span className="sb__brasas" aria-hidden="true">
      {BRASAS_ALTA.map((b, i) => <i key={i} style={{ left: `${b.l}%`, width: b.s, height: b.s, animationDuration: `${b.d}s`, animationDelay: `${b.a}s`, ['--dx' as string]: `${b.dx}px` }} />)}
    </span>
    <header className="sb__cabeca">
      <p className="sb__selo">Escadaria do Salão</p>
      <h2 id="sb-titulo" className="sb__titulo"><ChamaSalao classe="sb__tocha" /><span>Subindo rápido</span><ChamaSalao classe="sb__tocha" /></h2>
      <p className="sb__sub">Quem mais ganhou posições hoje e na semana</p>
    </header>
    <ol className="sb__lista">
      {subindo.map((linha, i) => {
        const hoje = linha.variacao ?? 0, semana = linha.variacao_semana ?? 0
        const salto = hoje > 0 ? hoje : semana
        return (
          <li key={linha.posicao} className={'sb__degrau' + (linha.eh_voce ? ' sb__degrau--voce' : '') + (i === 0 ? ' sb__degrau--lider' : '')} style={{ animationDelay: `${i * 0.12}s` }}>
            <span className="sb__salto"><span className="sb__seta" aria-hidden="true">▲</span><b className="numerico">+{salto}</b><small>{hoje > 0 ? 'hoje' : 'na semana'}</small></span>
            <span className="sb__brasao">{iniciais(linha.apelido)}</span>
            <span className="sb__quem">
              <strong className="sb__nome">{linha.apelido}{linha.eh_voce && <span className="sb__voce">você</span>}</strong>
              <small>{salto > 0 ? <>#{linha.posicao + salto} <span aria-hidden="true">→</span> <b>#{linha.posicao}</b></> : <>agora em <b>#{linha.posicao}</b></>}</small>
            </span>
            {emChamas(linha) && <span className="sb__fogo" role="img" aria-label="em chamas"><ChamaSalao classe="sb__chama" /></span>}
          </li>
        )
      })}
    </ol>
  </section>
}

function iniciais(apelido: string): string {
  const partes = apelido.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?'
}

function Podio({ linhas, periodo, eu }: { linhas: LinhaRanking[]; periodo: Periodo; eu: { posicao: number; total: number } | null }) {
  const terceiro = linhas[2]
  const faltam = eu && eu.posicao > 3 && terceiro ? Math.max(1, terceiro.total - eu.total + 1) : 0
  const chamada = eu && eu.posicao <= 3
    ? <>Você está no Salão dos Campeões. Continue respondendo para não perder o lugar.</>
    : faltam > 0 ? <>Você está em <b>#{eu!.posicao}</b>. Faltam <b>{faltam.toLocaleString('pt-BR')}</b> {faltam === 1 ? 'questão' : 'questões'} para entrar no top 3.</>
      : undefined
  return <SalaoCampeoes
    titulo="Top 3"
    subtitulo={periodo === 'semana' ? 'Quem mais respondeu questões nos últimos 7 dias' : 'Quem mais respondeu questões no ranking geral'}
    chamada={chamada}
    lugares={linhas.slice(0, 3).map((linha) => ({
      posicao: linha.posicao, nome: linha.apelido, ehVoce: linha.eh_voce,
      total: linha.total.toLocaleString('pt-BR'), rotuloTotal: periodo === 'semana' ? 'na semana' : 'questões',
      extra: <span className="sc__extra"><SeloServico servico={linha.servico} /><EmblemasDoNome ids={linha.emblemas} totalGeral={linha.total_geral} tamanho={40} /><Fogueira dias={linha.sequencia ?? 0} tamanho={22} /><Movimento linha={linha} /></span>,
    }))} />
}

/** A próxima meta, em questões, como uma missão de jogo: o texto diz quanto falta e a barra mostra o caminho já feito. */
/** Primeiro nome do cadastro, como nas cartas (supabase/functions/_shared/cartas.ts): vazio se não parecer um nome. */
function primeiroNome(nome?: string | null): string {
  const primeiro = (nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}

// Regra dos 10 (docs/emails/TOM.md): números pequenos de questões sempre por extenso.
const EXTENSO = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
const nQuestoes = (n: number) => n < 10 ? `${EXTENSO[n]} ${n === 1 ? 'questão' : 'questões'}` : `${n.toLocaleString('pt-BR')} questões`

/** Uma frase gentil sobre o lugar da pessoa na arena, sem cobrança. */
function fraseDaPosicao(posicao: number, semana: boolean): string {
  if (posicao === 1) return semana ? 'Ninguém estudou mais do que você nesta semana. Que bom ver isso.' : 'Você lidera o ranking. O seu esforço está à vista de todo mundo.'
  if (posicao <= 3) return 'Você está no Top 3. Isso é de quem senta e faz, mesmo com sono.'
  if (posicao <= 10) return semana ? 'Você está entre os dez que mais estudaram nesta semana.' : 'Você está entre os dez que mais estudam aqui.'
  if (posicao <= 50) return 'O seu nome já está no top 50. Cada dia de estudo aparece aqui.'
  return 'Cada questão de hoje deixa você mais perto do top 50.'
}

function TextoMissao({ icone, faltam, alvo, meu, children }: { icone: 'alvo'; faltam?: number; alvo?: number; meu?: number; children: ReactNode }) {
  const feito = alvo && meu !== undefined ? Math.min(100, Math.max(4, (meu / alvo) * 100)) : null
  return <span className="rk-missao">
    <span className="rk-missao__icone" aria-hidden="true"><Icone nome={icone} tamanho={15} /></span>
    <span className="rk-missao__texto">{faltam !== undefined && <>Mais <b className="numerico">{nQuestoes(faltam)}</b> e você </>}{children}</span>
    {feito !== null && <span className="rk-missao__trilho" aria-hidden="true"><span style={{ width: `${feito}%` }} /></span>}
  </span>
}

function Missao({ eu, acima, ultimoTop50 }: { eu: LinhaRanking; acima: LinhaRanking | null; ultimoTop50?: LinhaRanking | null }) {
  // No topo a frase da ficha já celebra; não há próxima posição para mostrar.
  if (eu.posicao === 1) return null
  // Fora da lista carregada: a meta é entrar no top 50 (antes era um parágrafo à parte no fim da página).
  if (!acima && ultimoTop50 && eu.posicao > 50) {
    const faltam = Math.max(1, ultimoTop50.total - eu.total + 1)
    return <TextoMissao icone="alvo" faltam={faltam} alvo={eu.total + faltam} meu={eu.total}>entra no top 50</TextoMissao>
  }
  if (!acima) return null
  const faltam = Math.max(1, acima.total - eu.total + 1)
  return <TextoMissao icone="alvo" faltam={faltam} alvo={eu.total + faltam} meu={eu.total}>passa {acima.apelido} e sobe para #{acima.posicao}</TextoMissao>
}

/** Só no desenvolvimento (#/ranking?demo=1): linhas fictícias para revisar o visual sem servidor. */
const DEMO = import.meta.env.DEV && typeof location !== 'undefined' && location.hash.includes('demo=1')
const NOMES_DEMO = ['Ana P.', 'Bruno C.', 'Carla M.', 'Diego R.', 'Elisa F.', 'Fábio T.', 'Gabi L.', 'Hugo S.', 'Iara N.', 'João V.', 'Karen D.', 'Lucas B.']
const linhasDemo = (): LinhaRanking[] => Array.from({ length: 34 }, (_, i) => ({
  posicao: i + 1, apelido: NOMES_DEMO[i % NOMES_DEMO.length], total: Math.round(4200 / (1 + i * 0.18)), total_geral: Math.round(4200 / (1 + i * 0.18)), eh_voce: i === 6,
  variacao: [2, 0, -1, 4, 0, 1, 3][i % 7], variacao_semana: [6, 1, 0, 2, 0, 5, 1][i % 7], novo: i === 11, referencia_em: '2026-10-13', emblemas: null, sequencia: [12, 3, 0, 40, 7, 1, 21][i % 7], servico: null,
}))

const DEZ_MIN = 600_000

/**
 * O ranking é recalculado no servidor de 10 em 10 minutos (pg_cron, parte 34, pedido do Tales em
 * 21/10/2026), nos minutos redondos: :00, :10, :20... O relógio conta até a próxima rodada e, 30 s
 * depois dela, pede a lista de novo.
 */
function RelogioRanking({ aoAtualizar }: { aoAtualizar: () => void }) {
  const proxima = () => Math.ceil((Date.now() + 1) / DEZ_MIN) * DEZ_MIN
  const [alvo, definirAlvo] = useState(proxima)
  const [viradas, definirViradas] = useState(0)
  useEffect(() => {
    const virada = window.setTimeout(() => { definirAlvo(proxima()); definirViradas(n => n + 1) }, Math.max(0, alvo - Date.now()) + 1000)
    return () => window.clearTimeout(virada)
  }, [alvo])
  // 30 s depois de cada virada, a lista nova já está pronta no servidor.
  useEffect(() => {
    if (!viradas) return
    const recarga = window.setTimeout(aoAtualizar, 30_000)
    return () => window.clearTimeout(recarga)
  }, [viradas, aoAtualizar])
  return <RelogioPixel liberaEm={new Date(alvo).toISOString()} rotulo="Próxima atualização" rodape="O ranking atualiza a cada 10 minutos" janelaMs={DEZ_MIN} minutos compacto legivel />
}

export function Ranking() {
  const { sessao: sessaoReal } = usarConta()
  const sessao = DEMO ? ({ user: { id: 'demo' } } as unknown as typeof sessaoReal) : sessaoReal
  const { contexto } = usarContextoLocal('')
  const [periodo, definirPeriodo] = useState<Periodo>('geral')
  const [rodada, definirRodada] = useState(0)
  const recarregarRanking = useCallback(() => definirRodada(n => n + 1), [])
  const [linhas, definirLinhas] = useState<LinhaRanking[] | null>(null)
  const [minhaPosicao, definirMinhaPosicao] = useState<MinhaPosicao>(null)
  const [erro, definirErro] = useState(false)
  // Falso quando o banco ainda responde pelo ranking antigo, sem movimento.
  const [comMovimento, definirComMovimento] = useState(false)
  const [ate100, definirAte100] = useState(false)
  // Sem conta: o ranking aberto (só iniciais). Falso se o banco ainda não tem a função.
  const [visitanteDisponivel, definirVisitanteDisponivel] = useState(true)

  const meuTotal = Object.keys(contexto.respondidas).length
  const { perfil: perfilRanking, carregado: perfilCarregado, nomeExibido } = usarPerfilRanking(sessaoReal)
  const { streak, conquistadas, total: totalConquistas } = usarConquistas()
  usarPublicarSequencia(sessaoReal, streak.atual, streak.ateDia)

  // Visitante: top 50 com as iniciais, pela função aberta (migração 202610110300).
  useEffect(() => {
    if (!DEMO) return
    definirLinhas(linhasDemo()); definirComMovimento(true); definirMinhaPosicao({ posicao: 7, total: 2000, total_geral: 2000 })
  }, [periodo])

  useEffect(() => {
    if (DEMO || !supabase || sessao) return
    let vivo = true
    definirErro(false)
    definirLinhas(null)
    supabase.rpc('obter_ranking_visitante', { periodo }).then((resultado) => {
      if (!vivo) return
      if (resultado.error) { definirVisitanteDisponivel(false); return }
      definirLinhas((resultado.data ?? []) as LinhaRanking[])
      definirComMovimento(true)
      definirMinhaPosicao(null)
    })
    return () => { vivo = false }
  }, [sessao, periodo])

  useEffect(() => {
    if (DEMO || !supabase || !sessao) return
    const cliente = supabase
    let vivo = true
    definirErro(false)
    definirLinhas(null)
    let movimento = true
    Promise.all([
      cliente.rpc('obter_ranking_com_movimento', { periodo }).then(async resultado => {
        // O deploy estático pode chegar antes da migration, ou a RPC nova pode
        // falhar no banco: o ranking antigo continua de pé, só sem as setas.
        if (resultado.error) { movimento = false; return cliente.rpc('obter_ranking_publico', { periodo }) }
        return resultado
      }),
      cliente.rpc('minha_posicao_ranking', { periodo }),
    ]).then(([ranking, minha]) => {
      if (!vivo) return
      if (ranking.error || minha.error) { definirErro(true); return }
      const novasLinhas: LinhaRanking[] = (ranking.data ?? []).map((linha: LinhaRanking) => ({
        ...linha, variacao: linha.variacao ?? null, variacao_semana: linha.variacao_semana ?? null,
        novo: linha.novo ?? false, referencia_em: linha.referencia_em ?? null,
        emblemas: linha.emblemas ?? null, sequencia: linha.sequencia ?? null, servico: linha.servico ?? null,
      }))
      definirLinhas(novasLinhas)
      definirComMovimento(movimento)
      definirMinhaPosicao(minha.data?.[0] ?? null)
    }).catch(() => { if (vivo) definirErro(true) })
    return () => { vivo = false }
  }, [sessao, periodo, rodada])

  if (!DEMO && (!contasDisponiveis || !supabase)) {
    return <article className="limite-leitura empilha">
      <h1>Ranking</h1>
      <p>O ranking depende de contas, que estão em preparação. Você já pode estudar gratuitamente.</p>
      <a className="botao botao--principal" href={href('/treinar')}>Continuar estudando</a>
    </article>
  }

  const meuEmblema = conquistaAtual(meuTotal)
  const nome = sessaoReal ? primeiroNome(String(sessaoReal.user.user_metadata?.nome ?? '')) : ''
  // A RPC devolve até o top 100 e a sua linha mesmo fora dele; a sua linha
  // alimenta o cartão, não a lista. A lista mostra o top 50 e abre até o 100.
  const eu = linhas?.find(linha => linha.eh_voce) ?? null
  const top = linhas?.filter(linha => linha.posicao <= 50) ?? null
  const ate100Linhas = linhas?.filter(linha => linha.posicao > 50 && linha.posicao <= 100) ?? []
  const visiveis = top ? (ate100 ? [...top, ...ate100Linhas] : top) : null
  const acima = eu && linhas ? linhas.find(linha => linha.posicao === eu.posicao - 1) ?? null : null
  const lider = top?.[0]?.total ?? 1
  const restantes = visiveis && visiveis.length >= 3 ? visiveis.slice(3) : visiveis ?? []

  const ultimaVisivel = restantes.length ? restantes[restantes.length - 1].posicao : 0

  return <div className="rk rq">
    <section className="rq-heroi" aria-labelledby="rq-titulo">
      <img className="rq-heroi__tocha rq-heroi__tocha--esq" src={recurso('ranking/tocha.png')} alt="" width={20} height={40} draggable={false} />
      <img className="rq-heroi__tocha rq-heroi__tocha--dir" src={recurso('ranking/tocha.png')} alt="" width={20} height={40} draggable={false} />
      <div className="rq-heroi__texto">
        <p className="tr-heroi__selo">Arena dos residentes · Top 50</p>
        <h1 id="rq-titulo">Ranking</h1>
        <RelogioRanking aoAtualizar={recarregarRanking} />
        <p className="rq-heroi__lead">Cada questão diferente respondida vale um ponto. Estude todo dia para acender a fogueira e ver o seu nome subir.</p>
        {top && top.length > 0 && <dl className="rq-placar">
          <div><dt>Na arena</dt><dd className="numerico">{top.length >= 50 ? '50+' : top.length}</dd></div>
          <div><dt>Questões do top 50</dt><dd className="numerico">{top.reduce((s, l) => s + l.total, 0).toLocaleString('pt-BR')}</dd></div>
          <div><dt>{periodo === 'semana' ? 'Líder da semana' : 'Líder'}</dt><dd className="rq-placar__nome">{top[0].apelido}</dd></div>
        </dl>}
      </div>

      <div className="rq-ficha">
        {!sessao ? <>
          <span className="rq-ficha__rotulo">Você entra no ranking com {MINIMO_RANKING} questões</span>
          <strong className="rq-ficha__posicao rq-ficha__posicao--texto">Sua vez</strong>
          <a className="botao rq-ficha__botao" href={href('/conta?modo=criar&voltar=%2Franking')}>Criar conta grátis</a>
          <span className="rq-ficha__nota">Com a conta, você vê os nomes e a sua posição</span>
        </> : perfilCarregado && !perfilRanking.participa ? <>
          <span className="rq-ficha__rotulo">{nome ? `${nome}, você saiu do ranking` : 'Você saiu do ranking'}</span>
          <strong className="rq-ficha__posicao rq-ficha__posicao--texto">Fora</strong>
          <a className="tr-heroi__link" href={href('/conta?secao=ranking')}>Voltar ao ranking em Minha conta</a>
        </> : minhaPosicao ? <>
          <span className="rq-ficha__rotulo">{nome ? `${nome}, sua posição` : 'Sua posição'} {periodo === 'semana' ? 'na semana' : 'geral'}</span>
          <span className="rq-ficha__linha">
            <strong className="rq-ficha__posicao"><span aria-hidden="true">#</span><span className="rk-movimento__sr">posição </span>{minhaPosicao.posicao}</strong>
            {eu && <Movimento linha={eu} />}
          </span>
          <span className="rq-ficha__frase">{fraseDaPosicao(minhaPosicao.posicao, periodo === 'semana')}</span>
          <span className="rq-ficha__total">{minhaPosicao.total >= 10
            ? <><b className="numerico">{minhaPosicao.total.toLocaleString('pt-BR')}</b> questões {periodo === 'semana' ? 'nos últimos 7 dias' : 'respondidas'}</>
            : 'Os primeiros passos já contam pontos'}</span>
          {eu && <Missao eu={eu} acima={acima} ultimoTop50={top?.[top.length - 1] ?? null} />}
          {/* Ranking antigo (sem a sua linha na lista): a meta sai da posição avulsa. */}
          {!eu && top && top.length > 0 && minhaPosicao.posicao > top.length && (() => {
            const faltam = Math.max(1, top[top.length - 1].total - minhaPosicao.total + 1)
            return <TextoMissao icone="alvo" faltam={faltam} alvo={minhaPosicao.total + faltam} meu={minhaPosicao.total}>entra no top {top.length >= 50 ? 50 : top.length}</TextoMissao>
          })()}
        </> : meuTotal < MINIMO_RANKING ? <>
          <span className="rq-ficha__rotulo">{nome ? `${nome}, você entra` : 'Você entra'} no ranking com {MINIMO_RANKING} questões</span>
          <strong className="rq-ficha__posicao rq-ficha__posicao--texto">Quase lá</strong>
          <span className="rq-ficha__nota">Mais {nQuestoes(MINIMO_RANKING - meuTotal)} e o seu nome aparece aqui como {nomeExibido}.</span>
        </> : <>
          <span className="rq-ficha__rotulo">{nome ? `${nome}, seu emblema` : 'Seu emblema'}</span>
          <strong className="rq-ficha__posicao rq-ficha__posicao--texto">{meuEmblema?.rotulo ?? '...'}</strong>
          <span className="rq-ficha__nota">Sua posição aparece assim que o progresso sincronizar</span>
        </>}
      </div>
    </section>

    <AbasRanking atual="ranking" conquistadas={conquistadas} total={totalConquistas} />

    {!sessao && !visitanteDisponivel ? (
      <Estado titulo="Entre na sua conta para ver o ranking" acoes={<a className="botao botao--principal" href={href('/conta?modo=entrar')}>Entrar ou criar conta</a>}>
        <p>O ranking reúne quem mais respondeu questões entre todas as contas com pelo menos 5 questões respondidas.</p>
      </Estado>
    ) : <>
      <div className="rq-barra">
        <div className="rq-periodo" role="tablist" aria-label="Período do ranking">
          {(['geral', 'semana'] as const).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={periodo === p} className="rq-periodo__aba" onClick={() => definirPeriodo(p)}>{ROTULOS_PERIODO[p]}</button>
          ))}
        </div>
        <a className="rk-liga" href={href('/ligas')}><Icone nome="grupo" tamanho={16} /> Liga da residência <SeloAssinante /></a>
        {/* O critério na dobra, não só no fim da página. */}
        <p className="rk-criterio"><Icone nome="grafico" tamanho={15} /> <span>Conta cada questão diferente respondida{periodo === 'semana' ? ' nos últimos 7 dias' : ''}. Refazer a mesma não soma de novo.</span></p>
      </div>

      {!sessao && <p className="rk-visitante"><Icone nome="cadeado" tamanho={15} /> <span>Sem conta, você vê as iniciais. <a href={href('/conta?modo=criar&voltar=%2Franking')}>Crie a sua grátis</a> para ver os nomes e disputar uma vaga no top 50.</span></p>}

      {linhas === null && !erro && <Carregando linhas={6} rotulo="Carregando ranking" />}

      {erro && <Estado titulo="Não foi possível carregar o ranking agora">
        <p>Confira sua conexão e tente novamente em instantes.</p>
      </Estado>}

      {linhas && linhas.length === 0 && <Estado titulo={periodo === 'semana' ? 'Ninguém respondeu questões nos últimos 7 dias' : 'Ainda não há ninguém no ranking'}>
        <p>Seja a primeira pessoa a aparecer aqui.</p>
      </Estado>}

      {/* Sem "você está em #N" aqui: a posição aparece uma vez só, no cartão do topo. */}
      {top && top.length >= 3 && <Podio linhas={top} periodo={periodo} eu={null} />}

      {top && top.length > 0 && <EmAlta linhas={top} />}

      {restantes.length > 0 && <section className="rq-tabela" aria-labelledby="rq-tabela-titulo">
        <header className="rq-tabela__cabeca">
          <h2 id="rq-tabela-titulo">Classificação</h2>
          <span className="rq-tabela__faixa numerico">#{restantes[0].posicao} a #{ultimaVisivel} · {periodo === 'semana' ? 'questões na semana' : 'questões respondidas'}</span>
        </header>

        {comMovimento && !(top ?? []).some(linha => linha.referencia_em || linha.novo) && <p className="rk-referencia rk-referencia--inicio">
          <Icone nome="relogio" tamanho={15} /> As setas de subida e descida e o foguinho aparecem a partir de amanhã: hoje o ranking registra as posições de referência.
        </p>}

        {comMovimento && (top ?? []).some(linha => linha.referencia_em || linha.novo) && <p className="rk-referencia">
          <span><b className="rk-legenda rk-legenda--subiu"><Icone nome="cima" tamanho={13} /></b> subiu</span>
          <span><b className="rk-legenda rk-legenda--desceu"><Icone nome="baixo" tamanho={13} /></b> desceu</span>
          <span><b className="rk-legenda rk-legenda--fogo"><img className="rk-chama" src={recurso('ranking/chama.png')} width={13} height={13} alt="" draggable={false} /></b> {FOGO_NO_DIA}+ posições no dia ou {FOGO_NA_SEMANA}+ na semana</span>
          <span><b className="rk-legenda rk-legenda--novo">novo</b> acabou de entrar</span>
          <small>Comparação com o último dia registrado, igual em todos os aparelhos.</small>
        </p>}

        <ol className="rq-lista">
          {restantes.map((linha) => (
            <li key={linha.posicao} className={'rq-linha' + (linha.eh_voce ? ' rq-linha--voce' : '') + (linha.posicao <= 10 ? ' rq-linha--top10' : '')}>
              <span className="rq-linha__pos numerico">{linha.posicao}</span>
              <span className="rq-linha__mov"><Movimento linha={linha} /></span>
              <span className="rq-linha__avatar" aria-hidden="true">{iniciais(linha.apelido)}</span>
              <span className="rq-linha__quem">
                <span className="rq-linha__nome"><span className="rq-linha__apelido">{linha.apelido}</span>{linha.eh_voce && <span className="rq-voce">você</span>}<SeloServico servico={linha.servico} /></span>
                <span className="rq-linha__selos"><EmblemasDoNome ids={linha.emblemas} totalGeral={linha.total_geral} tamanho={30} /><Fogueira dias={linha.sequencia ?? 0} tamanho={18} />{linha.eh_voce && <a className="rk-escolher" href={href('/conquistas?escolher=1')}><Icone nome="estrela" tamanho={13} /> {linha.emblemas?.length ? 'Trocar' : 'Escolher emblemas'}</a>}</span>
              </span>
              <span className="rq-linha__placar">
                <b className="numerico">{linha.total.toLocaleString('pt-BR')}</b>
                <span className="rq-linha__barra" aria-hidden="true"><span style={{ width: `${Math.max(3, (linha.total / lider) * 100)}%` }} /></span>
              </span>
            </li>
          ))}
        </ol>

        {ate100Linhas.length > 0 && (
          <button type="button" className="botao rk-mais" aria-expanded={ate100} onClick={() => definirAte100(!ate100)}>
            <Icone nome={ate100 ? 'cima' : 'baixo'} tamanho={16} /> {ate100 ? 'Mostrar só o top 50' : 'Mostrar até o top 100'}
          </button>
        )}
      </section>}
    </>}

    <a className="rk-bau" href={href(perfilRanking.emblemas.length ? '/conquistas' : '/conquistas?escolher=1')}>
      <img className="rk-bau__arte" src={recurso('emblemas/podio-1.png')} alt="" width={56} height={56} />
      <span className="rk-bau__texto">
        <strong>Suas conquistas</strong>
        <span><b className="numerico">{conquistadas}</b> de {totalConquistas} desbloqueadas{streak.atual >= 3 ? ` · sequência de ${streak.atual} dias` : ''}</span>
        <em className="rk-bau__cta">{perfilRanking.emblemas.length ? 'Trocar os emblemas do meu nome' : 'Escolha 3 emblemas para o seu nome'}</em>
      </span>
      <span className="rk-bau__vitrine" aria-hidden="true">
        {Array.from({ length: VITRINE_MAXIMO }, (_, i) => {
          const e = perfilRanking.emblemas[i] ? emblemaPorId(perfilRanking.emblemas[i]) : undefined
          return <span key={i} className={'inv-slot' + (e ? ' inv-slot--cheio' : '')}>{e ? <Medalha conquista={e} tamanho={36} /> : <span className="inv-slot__vazio">+</span>}</span>
        })}
      </span>
      <span className="rk-bau__seta" aria-hidden="true"><Icone nome="direita" tamanho={20} /></span>
    </a>

    <details className="rk-regras">
      <summary><h2>Como funciona o ranking</h2><Icone nome="baixo" tamanho={18} /></summary>
      <ol>
        <li><span className="px-numero" aria-hidden="true">1</span><div><strong>Conta volume, não acerto.</strong> Cada questão diferente respondida soma um ponto. Refazer a mesma questão não soma de novo.</div></li>
        <li><span className="px-numero" aria-hidden="true">2</span><div><strong>Geral ou últimos 7 dias.</strong> O geral mostra o acumulado; a semana dá chance a quem começou agora.</div></li>
        <li><span className="px-numero" aria-hidden="true">3</span><div><strong>Todo mundo com conta participa.</strong> Entra quem respondeu pelo menos {MINIMO_RANKING} questões, com o apelido que escolher ou o nome do cadastro e a inicial do sobrenome. Em <a href={href('/conta?secao=ranking')}>Minha conta</a> você troca o apelido ou sai do ranking. E-mail, telefone e cidade nunca aparecem. O serviço onde você faz residência só aparece se você ligar a opção em <a href={href('/conta?secao=perfil')}>Meu perfil</a>.</div></li>
        <li><span className="px-numero" aria-hidden="true">4</span><div><strong>Conquistas e vitrine.</strong> As conquistas ficam no seu inventário para sempre, e você escolhe até três para aparecer ao lado do nome. A fogueira mostra a sua sequência de dias seguidos com pelo menos {META_STREAK_DIARIA} questões: se a sequência acabar, ela some e recomeça do zero.</div></li>
      </ol>
    </details>
  </div>
}

/** Página das conquistas: o inventário completo e a escolha da vitrine. */
export function Conquistas({ escolher = false }: { escolher?: boolean } = {}) {
  const { sessao } = usarConta()
  const { perfil, carregado, nomeExibido, salvarVitrine, comVitrine } = usarPerfilRanking(sessao)
  const { metricas, streak, conquistadas, total } = usarConquistas({ comLendarios: true })
  usarPublicarSequencia(sessao, streak.atual, streak.ateDia)
  return <div className="empilha-2 rk">
    <section className="rk-heroi rk-heroi--conquistas">
      <div className="rk-heroi__texto">
        <p className="rk-heroi__selo"><Icone nome="medalha" tamanho={16} /> Inventário</p>
        <h1>Conquistas</h1>
        <p>Cada questão, cada dia de estudo e cada acerto destravam emblemas. Escolha três para aparecer ao lado do seu nome no ranking.</p>
      </div>
      <div className="rk-heroi__cartao">
        <img src={recurso('emblemas/podio-1.png')} alt="" width={64} height={64} className="medalha--arte" />
        <strong className="rk-heroi__posicao">{conquistadas}<small>/{total}</small></strong>
        <span className="rk-heroi__rotulo">conquistas desbloqueadas</span>
      </div>
    </section>
    <AbasRanking atual="conquistas" conquistadas={conquistadas} total={total} />
    <Inventario metricas={metricas} nome={sessao ? nomeExibido : 'Você'} vitrine={perfil.emblemas} salvarVitrine={salvarVitrine} podeEscolher={!!sessao && carregado && comVitrine} abrirEscolha={escolher} />
  </div>
}

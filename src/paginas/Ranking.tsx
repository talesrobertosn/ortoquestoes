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
import { Corrida, type Corredor } from '../componentes/ranking/Corrida'
import '../estilos/paginas/RankingCorrida.css'
import { usarPeriodo } from '../estado/aparencia'
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
  const semana = periodo === 'semana'
  const periodoCor = usarPeriodo()
  const subiu = (l: LinhaRanking) => (l.variacao ?? 0) > 0 ? (l.variacao ?? 0) : (l.variacao_semana ?? 0) >= FOGO_NA_SEMANA ? (l.variacao_semana ?? 0) : 0
  const escalador = (l: LinhaRanking) => ({ posicao: l.posicao, apelido: l.apelido, total: l.total, eh_voce: l.eh_voce, subiu: subiu(l) })
  const porPosicao = new Map((linhas ?? []).map((l) => [l.posicao, l]))
  const cume = (visiveis ?? []).slice(0, 3).map(escalador)
  const trilha = (visiveis ?? []).slice(3).map(escalador)
  const euNaLista = !!(eu && visiveis?.some((l) => l.posicao === eu.posicao))
  const subindoRapido = (top ?? []).filter((l) => subiu(l) > 0).sort((x, y) => subiu(y) - subiu(x) || x.posicao - y.posicao).slice(0, 3)

  // A missão na sua pista: quanto falta para passar quem está logo à frente.
  const faltaAcima = eu && acima ? Math.max(1, acima.total - eu.total + 1) : 0
  const ultimoTop50 = top?.[top.length - 1] ?? null
  const missao = eu?.posicao === 1 ? <>Você lidera. Cada questão de hoje segura o lugar.</>
    : eu && acima ? <>Mais <b className="numerico">{nQuestoes(faltaAcima)}</b> e você passa {acima.apelido.replace(/\.$/, '')}.</> : null

  const nomeDe = (c: Corredor) => <span className="cor-nome"><span className="cor-nome__texto">{c.apelido}</span>{c.eh_voce && <span className="cor-voce-selo">você</span>}</span>
  const selosDe = (c: Corredor) => {
    const linha = porPosicao.get(c.posicao)
    if (!linha) return null
    return <><SeloServico servico={linha.servico} /><EmblemasDoNome ids={linha.emblemas} totalGeral={linha.total_geral} tamanho={22} /><Fogueira dias={linha.sequencia ?? 0} tamanho={15} />
      {linha.eh_voce && <a className="rk-escolher" href={href('/conquistas?escolher=1')}><Icone nome="estrela" tamanho={12} /> {linha.emblemas?.length ? 'Trocar' : 'Escolher emblemas'}</a>}</>
  }
  const movimentoDe = (c: Corredor) => { const linha = porPosicao.get(c.posicao); return linha ? <Movimento linha={linha} /> : null }

  // A sua ficha, nos mesmos casos de antes: visitante, fora do ranking, com posição, quase lá ou ainda sincronizando.
  const ficha = !sessao ? <>
    <span className="esc-voce-painel__rotulo">Você entra no ranking com {MINIMO_RANKING} questões</span>
    <strong className="esc-voce-painel__altura esc-voce-painel__altura--texto">Sua vez</strong>
    <a className="botao botao--principal" href={href('/conta?modo=criar&voltar=%2Franking')}>Criar conta grátis</a>
    <span className="esc-voce-painel__nota">Com a conta, você vê os nomes e a sua altura na montanha.</span>
  </> : perfilCarregado && !perfilRanking.participa ? <>
    <span className="esc-voce-painel__rotulo">{nome ? `${nome}, você saiu do ranking` : 'Você saiu do ranking'}</span>
    <strong className="esc-voce-painel__altura esc-voce-painel__altura--texto">Fora</strong>
    <a className="esc-link" href={href('/conta?secao=ranking')}>Voltar ao ranking em Minha conta</a>
  </> : minhaPosicao ? <>
    <span className="esc-voce-painel__rotulo">{nome ? `${nome}, sua posição` : 'Sua posição'} {semana ? 'na semana' : 'geral'}</span>
    <span className="esc-voce-painel__linha">
      <strong className="esc-voce-painel__altura"><span aria-hidden="true">#</span><span className="rk-movimento__sr">posição </span>{minhaPosicao.posicao}</strong>
      {eu && <Movimento linha={eu} />}
    </span>
    <span className="esc-voce-painel__frase">{fraseDaPosicao(minhaPosicao.posicao, semana)}</span>
    <span className="esc-voce-painel__nota">{minhaPosicao.total >= 10 ? <><b className="numerico">{minhaPosicao.total.toLocaleString('pt-BR')}</b> questões {semana ? 'nos últimos 7 dias' : 'respondidas'}</> : 'Os primeiros passos já contam pontos'}</span>
    {eu && <Missao eu={eu} acima={acima} ultimoTop50={ultimoTop50} />}
    {!eu && top && top.length > 0 && minhaPosicao.posicao > top.length && (() => {
      const faltam = Math.max(1, top[top.length - 1].total - minhaPosicao.total + 1)
      return <TextoMissao icone="alvo" faltam={faltam} alvo={minhaPosicao.total + faltam} meu={minhaPosicao.total}>entra no top {top.length >= 50 ? 50 : top.length}</TextoMissao>
    })()}
  </> : meuTotal < MINIMO_RANKING ? <>
    <span className="esc-voce-painel__rotulo">{nome ? `${nome}, você entra` : 'Você entra'} no ranking com {MINIMO_RANKING} questões</span>
    <strong className="esc-voce-painel__altura esc-voce-painel__altura--texto">Quase lá</strong>
    <span className="esc-voce-painel__nota">Mais {nQuestoes(MINIMO_RANKING - meuTotal)} e o seu nome aparece como {nomeExibido}.</span>
  </> : <>
    <span className="esc-voce-painel__rotulo">{nome ? `${nome}, seu emblema` : 'Seu emblema'}</span>
    <strong className="esc-voce-painel__altura esc-voce-painel__altura--texto">{meuEmblema?.rotulo ?? '...'}</strong>
    <span className="esc-voce-painel__nota">Sua posição aparece assim que o progresso sincronizar</span>
  </>

  const ir = (onde: 'eu' | 'topo') => {
    const alvo = onde === 'eu' ? document.getElementById('cor-minha-pista') : document.querySelector('.cor-foto')
    alvo?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return <div className="esc">
    <header className="esc-cabeca">
      <div className="esc-cabeca__titulo">
        <p className="esc-cabeca__selo"><Icone nome="trofeu" tamanho={14} /> O torneio do reino</p>
        <h1>Ranking</h1>
        <p className="esc-cabeca__lide">Cada questão diferente respondida leva você para a frente no torneio. A chegada é o líder, e cada raia mostra quanto falta.</p>
      </div>
      <div className="esc-cabeca__controles">
        <div className="esc-periodo" role="tablist" aria-label="Período do ranking">
          {(['geral', 'semana'] as const).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={periodo === p} className="esc-periodo__aba" onClick={() => definirPeriodo(p)}>{ROTULOS_PERIODO[p]}</button>
          ))}
        </div>
        <RelogioRanking aoAtualizar={recarregarRanking} />
      </div>
    </header>

    <AbasRanking atual="ranking" conquistadas={conquistadas} total={totalConquistas} />

    {!sessao && !visitanteDisponivel ? (
      <Estado titulo="Entre na sua conta para ver o ranking" acoes={<a className="botao botao--principal" href={href('/conta?modo=entrar')}>Entrar ou criar conta</a>}>
        <p>O ranking reúne quem mais respondeu questões entre todas as contas com pelo menos 5 questões respondidas.</p>
      </Estado>
    ) : <div className="esc-corpo">
      <aside className="esc-painel" aria-label="Você no torneio">
        <div className="esc-voce-painel">{ficha}</div>
        <div className="esc-painel__botoes">
          {euNaLista && <button type="button" className="botao" onClick={() => ir('eu')}><Icone nome="alvo" tamanho={15} /> Ir até a minha raia</button>}
          <button type="button" className="botao" onClick={() => ir('topo')}><Icone nome="cima" tamanho={15} /> Ver a chegada</button>
        </div>
        {subindoRapido.length > 0 && <section className="esc-vento" aria-labelledby="esc-vento-titulo">
          <h2 id="esc-vento-titulo"><span aria-hidden="true">⤴</span> Subindo rápido</h2>
          <ol>{subindoRapido.map((l) => <li key={l.posicao}><b className="numerico">+{subiu(l)}</b> <span>{l.apelido}{l.eh_voce && <span className="esc-voce">você</span>}</span> <small>agora #{l.posicao}</small>{emChamas(l) && <img className="rk-chama" src={recurso('ranking/chama.png')} width={14} height={14} alt="em chamas" draggable={false} />}</li>)}</ol>
        </section>}
        <p className="esc-criterio"><Icone nome="grafico" tamanho={14} /> <span>Conta cada questão diferente respondida{semana ? ' nos últimos 7 dias' : ''}. Refazer a mesma não soma de novo.</span></p>
        {comMovimento && (top ?? []).some(linha => linha.referencia_em || linha.novo) && <p className="rk-referencia esc-legenda">
          <span><b className="rk-legenda rk-legenda--subiu"><Icone nome="cima" tamanho={12} /></b> subiu</span>
          <span><b className="rk-legenda rk-legenda--desceu"><Icone nome="baixo" tamanho={12} /></b> desceu</span>
          <span><b className="rk-legenda rk-legenda--fogo"><img className="rk-chama" src={recurso('ranking/chama.png')} width={12} height={12} alt="" draggable={false} /></b> {FOGO_NO_DIA}+ no dia ou {FOGO_NA_SEMANA}+ na semana</span>
          <span><b className="rk-legenda rk-legenda--novo">novo</b> acabou de entrar</span>
        </p>}
        {comMovimento && !(top ?? []).some(linha => linha.referencia_em || linha.novo) && <p className="esc-criterio"><Icone nome="relogio" tamanho={14} /> <span>As setas e o foguinho aparecem a partir de amanhã: hoje o ranking registra as posições de referência.</span></p>}
        <a className="esc-liga" href={href('/ligas')}><Icone nome="grupo" tamanho={16} /> <span><strong>Liga da residência</strong><small>O torneio só do seu serviço</small></span> <SeloAssinante /></a>
      </aside>

      <div className="esc-palco">
        {!sessao && <p className="esc-aviso"><Icone nome="cadeado" tamanho={14} /> <span>Sem conta, você vê as iniciais. <a href={href('/conta?modo=criar&voltar=%2Franking')}>Crie a sua grátis</a> para ver os nomes e subir também.</span></p>}
        {linhas === null && !erro && <Carregando linhas={6} rotulo="Carregando ranking" />}
        {erro && <Estado titulo="Não foi possível carregar o ranking agora"><p>Confira sua conexão e tente novamente em instantes.</p></Estado>}
        {linhas && linhas.length === 0 && <Estado titulo={semana ? 'Ninguém respondeu questões nos últimos 7 dias' : 'Ainda não há ninguém no ranking'}><p>Seja a primeira pessoa a aparecer aqui.</p></Estado>}
        {visiveis && visiveis.length > 0 && <Corrida periodo={periodoCor} chegada={cume} pistas={trilha} lider={top?.[0]?.total ?? 1} nome={nomeDe} selos={selosDe} movimento={movimentoDe}
          missao={euNaLista ? missao : null} unidade={semana ? 'na semana' : 'questões'}
          rodape={ate100Linhas.length > 0 && <button type="button" className="botao cor-mais" aria-expanded={ate100} onClick={() => definirAte100(!ate100)}>
            <Icone nome={ate100 ? 'cima' : 'baixo'} tamanho={16} /> {ate100 ? 'Mostrar só o top 50' : 'Mostrar até o top 100'}
          </button>} />}
      </div>
    </div>}

    <a className="rk-bau esc-bau" href={href(perfilRanking.emblemas.length ? '/conquistas' : '/conquistas?escolher=1')}>
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
        <li><span className="px-numero" aria-hidden="true">5</span><div><strong>O torneio.</strong> Cada raia mostra o quanto a pessoa já andou em relação ao líder, que é a linha de chegada, e quantas questões faltam para alcançar quem está logo à frente. O ranking atualiza a cada 10 minutos.</div></li>
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

import { useEffect, useState } from 'react'
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
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { META_STREAK_DIARIA } from '../estado/streak'
import { MINIMO_RANKING } from '../util/nomeRanking'
import { usarPerfilRanking, usarPublicarSequencia } from '../conta/perfilRanking'
import { SeloServico } from '../componentes/ServicoRanking'
import '@fontsource/pixelify-sans/latin-700.css'
import '../estilos/paginas/Ranking.css'

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

/** Quem mais subiu desde o último registro: a vitrine de quem está jogando. */
function EmAlta({ linhas }: { linhas: LinhaRanking[] }) {
  const subindo = linhas
    .filter(linha => (linha.variacao ?? 0) > 0 || (linha.variacao_semana ?? 0) >= FOGO_NA_SEMANA)
    .sort((a, b) => (b.variacao ?? 0) - (a.variacao ?? 0) || (b.variacao_semana ?? 0) - (a.variacao_semana ?? 0) || a.posicao - b.posicao)
    .slice(0, 3)
  if (!subindo.length) return null
  return <section className="rk-alta" aria-label="Subindo rápido">
    <header className="rk-alta__cabeca">
      <img src={recurso('ranking/chama.png')} width={28} height={28} alt="" draggable={false} />
      <h2>Subindo rápido</h2>
      <img src={recurso('ranking/chama.png')} width={28} height={28} alt="" draggable={false} />
    </header>
    <ol className="rk-alta__lista">
      {subindo.map((linha, i) => {
        const hoje = linha.variacao ?? 0, semana = linha.variacao_semana ?? 0
        const salto = hoje > 0 ? hoje : semana
        return (
          <li key={linha.posicao} className={'rk-alta__item' + (linha.eh_voce ? ' rk-alta__item--voce' : '') + (i === 0 ? ' rk-alta__item--lider' : '')}>
            <span className="rk-alta__salto"><b className="numerico">+{salto}</b><small>{hoje > 0 ? 'hoje' : 'na semana'}</small></span>
            <span className="rk-alta__avatar">{iniciais(linha.apelido)}</span>
            <span className="rk-alta__nome">
              <strong>{linha.apelido}{linha.eh_voce && <span className="rk-voce">você</span>}</strong>
              <small>{salto > 0 ? <>#{linha.posicao + salto} <span aria-hidden="true">→</span> <b>#{linha.posicao}</b></> : <>agora em <b>#{linha.posicao}</b></>}</small>
            </span>
            {emChamas(linha) && <img className="rk-alta__fogo" src={recurso('ranking/chama.png')} width={22} height={22} alt="em chamas" draggable={false} />}
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

function Podio({ linhas, periodo }: { linhas: LinhaRanking[]; periodo: Periodo }) {
  const ordem = [linhas[1], linhas[0], linhas[2]].filter(Boolean)
  return (
    <section className="rk-arena" aria-label="Três primeiros colocados" style={{ backgroundImage: `url(${recurso('ranking/arena.png')})` }}>
      <img className="rk-arena__tocha rk-arena__tocha--esq" src={recurso('ranking/tocha.png')} alt="" width={24} height={48} draggable={false} />
      <img className="rk-arena__tocha rk-arena__tocha--dir" src={recurso('ranking/tocha.png')} alt="" width={24} height={48} draggable={false} />
      <p className="rk-arena__titulo"><span>Salão dos campeões</span></p>
      <ol className="rk-podio">
        {ordem.map((linha) => (
          <li key={linha.posicao} className={`rk-podio__lugar rk-podio__lugar--${linha.posicao}${linha.eh_voce ? ' rk-podio__lugar--voce' : ''}`}>
            {linha.posicao === 1 && <span className="rk-podio__luz" aria-hidden="true" />}
            <img className="rk-podio__coroa" src={recurso(`emblemas/podio-${linha.posicao}.png`)} alt="" width={linha.posicao === 1 ? 64 : 48} height={linha.posicao === 1 ? 64 : 48} draggable={false} />
            <span className="rk-podio__avatar">{iniciais(linha.apelido)}</span>
            <strong className="rk-podio__nome">{linha.apelido}{linha.eh_voce && <span className="rk-voce">você</span>}<SeloServico servico={linha.servico} /></strong>
            <span className="rk-podio__emblemas"><EmblemasDoNome ids={linha.emblemas} totalGeral={linha.total_geral} tamanho={32} /><Fogueira dias={linha.sequencia ?? 0} tamanho={20} /></span>
            <div className="rk-podio__degrau">
              <span className="rk-podio__posicao" aria-label={`${linha.posicao}º lugar`}>{linha.posicao}º</span>
              <span className="rk-podio__total"><b className="numerico">{linha.total.toLocaleString('pt-BR')}</b>{periodo === 'semana' ? 'na semana' : 'questões'}</span>
              <Movimento linha={linha} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** A próxima meta, em questões, como uma missão de jogo. */
function Missao({ eu, acima }: { eu: LinhaRanking; acima: LinhaRanking | null }) {
  if (eu.posicao === 1) return <span className="rk-missao"><Icone nome="trofeu" tamanho={15} /><span>Você lidera. Responda hoje para defender o topo.</span></span>
  if (!acima) return null
  const faltam = Math.max(1, acima.total - eu.total + 1)
  return <span className="rk-missao"><Icone nome="alvo" tamanho={15} /><span>Faltam <b>{faltam.toLocaleString('pt-BR')}</b> {faltam === 1 ? 'questão' : 'questões'} para passar {acima.apelido} e subir para #{acima.posicao}</span></span>
}

export function Ranking() {
  const { sessao } = usarConta()
  const { contexto } = usarContextoLocal('')
  const [periodo, definirPeriodo] = useState<Periodo>('geral')
  const [linhas, definirLinhas] = useState<LinhaRanking[] | null>(null)
  const [minhaPosicao, definirMinhaPosicao] = useState<MinhaPosicao>(null)
  const [erro, definirErro] = useState(false)
  // Falso quando o banco ainda responde pelo ranking antigo, sem movimento.
  const [comMovimento, definirComMovimento] = useState(false)
  const [ate100, definirAte100] = useState(false)
  // Sem conta: o ranking aberto (só iniciais). Falso se o banco ainda não tem a função.
  const [visitanteDisponivel, definirVisitanteDisponivel] = useState(true)

  const meuTotal = Object.keys(contexto.respondidas).length
  const { perfil: perfilRanking, carregado: perfilCarregado, nomeExibido } = usarPerfilRanking(sessao)
  const { streak, conquistadas, total: totalConquistas } = usarConquistas()
  usarPublicarSequencia(sessao, streak.atual, streak.ateDia)

  // Visitante: top 50 com as iniciais, pela função aberta (migração 202610110300).
  useEffect(() => {
    if (!supabase || sessao) return
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
    if (!supabase || !sessao) return
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
  }, [sessao, periodo])

  if (!contasDisponiveis || !supabase) {
    return <article className="limite-leitura empilha">
      <h1>Ranking</h1>
      <p>O ranking depende de contas, que estão em preparação. Você já pode estudar gratuitamente.</p>
      <a className="botao botao--principal" href={href('/treinar')}>Continuar estudando</a>
    </article>
  }

  const meuEmblema = conquistaAtual(meuTotal)
  // A RPC devolve até o top 100 e a sua linha mesmo fora dele; a sua linha
  // alimenta o cartão, não a lista. A lista mostra o top 50 e abre até o 100.
  const eu = linhas?.find(linha => linha.eh_voce) ?? null
  const top = linhas?.filter(linha => linha.posicao <= 50) ?? null
  const ate100Linhas = linhas?.filter(linha => linha.posicao > 50 && linha.posicao <= 100) ?? []
  const visiveis = top ? (ate100 ? [...top, ...ate100Linhas] : top) : null
  const acima = eu && linhas ? linhas.find(linha => linha.posicao === eu.posicao - 1) ?? null : null
  const lider = top?.[0]?.total ?? 1
  const restantes = visiveis && visiveis.length >= 3 ? visiveis.slice(3) : visiveis ?? []

  return <div className="empilha-2 rk">
    <section className="rk-heroi">
      <img className="rk-heroi__tocha rk-heroi__tocha--esq" src={recurso('ranking/tocha.png')} alt="" width={20} height={40} draggable={false} />
      <img className="rk-heroi__tocha rk-heroi__tocha--dir" src={recurso('ranking/tocha.png')} alt="" width={20} height={40} draggable={false} />
      <div className="rk-heroi__texto">
        <p className="rk-heroi__selo"><Icone nome="trofeu" tamanho={16} /> Arena dos residentes · Top 50</p>
        <h1>Ranking</h1>
        <p>Onde quem estuda todo dia se encontra. Cada questão é um ponto, cada dia acende a fogueira, e o Brasil inteiro vê quem está subindo.</p>
        {top && top.length > 0 && <dl className="rk-heroi__placar">
          <div><dt>na arena</dt><dd className="numerico">{top.length >= 50 ? '50+' : top.length}</dd></div>
          <div><dt>questões do top 50</dt><dd className="numerico">{top.reduce((s, l) => s + l.total, 0).toLocaleString('pt-BR')}</dd></div>
          <div><dt>{periodo === 'semana' ? 'líder da semana' : 'líder'}</dt><dd>{top[0].apelido}</dd></div>
        </dl>}
      </div>
      {!sessao && (
        <div className="rk-heroi__cartao">
          <span className="rk-heroi__rotulo">Você entra no ranking com {MINIMO_RANKING} questões</span>
          <strong className="rk-heroi__posicao">Sua vez</strong>
          <a className="botao botao--ouro" href={href('/conta?modo=criar&voltar=%2Franking')}>Criar conta grátis</a>
          <span className="rk-heroi__rotulo">Com a conta, você vê os nomes e a sua posição</span>
        </div>
      )}
      {sessao && (
        <div className="rk-heroi__cartao">
          {perfilCarregado && !perfilRanking.participa ? <>
            <span className="rk-heroi__rotulo">Você saiu do ranking</span>
            <strong className="rk-heroi__posicao">Fora</strong>
            <span className="rk-heroi__rotulo"><a href={href('/conta?secao=ranking')}>Voltar ao ranking em Minha conta</a></span>
          </> : minhaPosicao ? <>
            <span className="rk-heroi__rotulo">Sua posição {periodo === 'semana' ? 'na semana' : 'geral'}</span>
            <strong className="rk-heroi__posicao">#{minhaPosicao.posicao}</strong>
            {eu && <Movimento linha={eu} />}
            <span className="rk-heroi__rotulo">{minhaPosicao.total.toLocaleString('pt-BR')} questões {periodo === 'semana' ? 'nos últimos 7 dias' : 'respondidas'}</span>
            {eu && <Missao eu={eu} acima={acima} />}
          </> : meuTotal < MINIMO_RANKING ? <>
            <span className="rk-heroi__rotulo">Você entra no ranking com {MINIMO_RANKING} questões</span>
            <strong className="rk-heroi__posicao">Faltam {MINIMO_RANKING - meuTotal}</strong>
            <span className="rk-heroi__rotulo">Você vai aparecer como {nomeExibido}</span>
          </> : <>
            <span className="rk-heroi__rotulo">Seu emblema</span>
            <strong className="rk-heroi__posicao">{meuEmblema?.rotulo ?? '...'}</strong>
            <span className="rk-heroi__rotulo">Sua posição aparece assim que o progresso sincronizar</span>
          </>}
        </div>
      )}
    </section>

    <AbasRanking atual="ranking" conquistadas={conquistadas} total={totalConquistas} />

    <a className="rk-bau" href={href(perfilRanking.emblemas.length ? '/conquistas' : '/conquistas?escolher=1')}>
      <img className="rk-bau__arte" src={recurso('emblemas/podio-1.png')} alt="" width={56} height={56} />
      <span className="rk-bau__texto">
        <strong>Suas conquistas</strong>
        <span><b className="numerico">{conquistadas}</b> de {totalConquistas} desbloqueadas{streak.atual >= 3 ? ` · sequência de ${streak.atual} dias` : ''}</span>
        <em className="rk-bau__cta">{perfilRanking.emblemas.length ? 'Trocar os emblemas do meu nome' : 'Toque e escolha 3 emblemas para o seu nome'}</em>
      </span>
      <span className="rk-bau__vitrine" aria-hidden="true">
        {Array.from({ length: VITRINE_MAXIMO }, (_, i) => {
          const e = perfilRanking.emblemas[i] ? emblemaPorId(perfilRanking.emblemas[i]) : undefined
          return <span key={i} className={'inv-slot' + (e ? ' inv-slot--cheio' : '')}>{e ? <Medalha conquista={e} tamanho={36} /> : <span className="inv-slot__vazio">+</span>}</span>
        })}
      </span>
      <span className="rk-bau__seta" aria-hidden="true"><Icone nome="direita" tamanho={20} /></span>
    </a>


    {!sessao && !visitanteDisponivel ? (
      <Estado titulo="Entre na sua conta para ver o ranking" acoes={<a className="botao botao--principal" href={href('/conta?modo=entrar')}>Entrar ou criar conta</a>}>
        <p>O ranking reúne quem mais respondeu questões entre todas as contas com pelo menos 5 questões respondidas.</p>
      </Estado>
    ) : <>
      {!sessao && <p className="rk-visitante"><Icone nome="cadeado" tamanho={15} /> <span>Sem conta, você vê as iniciais. <a href={href('/conta?modo=criar&voltar=%2Franking')}>Crie a sua grátis</a> para ver os nomes e disputar uma vaga no top 50.</span></p>}
      <div className="rk-topo-abas">
        <div className="rk-abas" role="tablist" aria-label="Período do ranking">
          {(['geral', 'semana'] as const).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={periodo === p} className="rk-aba" onClick={() => definirPeriodo(p)}>{ROTULOS_PERIODO[p]}</button>
          ))}
        </div>
        <a className="rk-liga" href={href('/ligas')}><Icone nome="grupo" tamanho={16} /> Liga da residência <SeloAssinante /></a>
      </div>

      {linhas === null && !erro && <Carregando linhas={6} rotulo="Carregando ranking" />}

      {erro && <Estado titulo="Não foi possível carregar o ranking agora">
        <p>Confira sua conexão e tente novamente em instantes.</p>
      </Estado>}

      {linhas && linhas.length === 0 && <Estado titulo={periodo === 'semana' ? 'Ninguém respondeu questões nos últimos 7 dias' : 'Ainda não há ninguém no ranking'}>
        <p>Seja a primeira pessoa a aparecer aqui.</p>
      </Estado>}

      {top && top.length > 0 && <EmAlta linhas={top} />}

      {top && top.length >= 3 && <Podio linhas={top} periodo={periodo} />}

      {top && top.length > 0 && comMovimento && !top.some(linha => linha.referencia_em || linha.novo) && <p className="rk-referencia rk-referencia--inicio">
        <Icone nome="relogio" tamanho={15} /> As setas de subida e descida e o foguinho aparecem a partir de amanhã: hoje o ranking registra as posições de referência.
      </p>}

      {top && top.length > 0 && comMovimento && top.some(linha => linha.referencia_em || linha.novo) && <p className="rk-referencia">
        <span><b className="rk-legenda rk-legenda--subiu"><Icone nome="cima" tamanho={13} /></b> subiu</span>
        <span><b className="rk-legenda rk-legenda--desceu"><Icone nome="baixo" tamanho={13} /></b> desceu</span>
        <span><b className="rk-legenda rk-legenda--fogo"><img className="rk-chama" src={recurso('ranking/chama.png')} width={13} height={13} alt="" draggable={false} /></b> {FOGO_NO_DIA}+ posições no dia ou {FOGO_NA_SEMANA}+ na semana</span>
        <span><b className="rk-legenda rk-legenda--novo">novo</b> acabou de entrar</span>
        <small>Comparação com o último dia registrado, igual em todos os aparelhos.</small>
      </p>}

      {restantes.length > 0 && <ol className="rk-lista">
        {restantes.map((linha) => (
          <li key={linha.posicao} className={'rk-linha' + (linha.eh_voce ? ' rk-linha--voce' : '')}>
            <span className="rk-linha__posicao numerico">{linha.posicao}</span>
            <Movimento linha={linha} />
            <span className="rk-linha__avatar">{iniciais(linha.apelido)}</span>
            <span className="rk-linha__nome">
              <span className="rk-linha__apelido">{linha.apelido}{linha.eh_voce && <span className="rk-voce">você</span>}<SeloServico servico={linha.servico} /></span>
              <span className="rk-linha__selos"><EmblemasDoNome ids={linha.emblemas} totalGeral={linha.total_geral} tamanho={32} /><Fogueira dias={linha.sequencia ?? 0} />{linha.eh_voce && <a className="rk-escolher" href={href('/conquistas?escolher=1')}><Icone nome="estrela" tamanho={13} /> {linha.emblemas?.length ? 'Trocar' : 'Escolher emblemas'}</a>}</span>
              <span className="rk-linha__barra" aria-hidden="true"><span style={{ width: `${Math.max(3, (linha.total / lider) * 100)}%` }} /></span>
            </span>
            <span className="rk-linha__total numerico">{linha.total.toLocaleString('pt-BR')}</span>
          </li>
        ))}
      </ol>}

      {ate100Linhas.length > 0 && (
        <button type="button" className="botao rk-mais" aria-expanded={ate100} onClick={() => definirAte100(!ate100)}>
          <Icone nome={ate100 ? 'cima' : 'baixo'} tamanho={16} /> {ate100 ? 'Mostrar só o top 50' : 'Mostrar até o top 100'}
        </button>
      )}

      {top && visiveis && minhaPosicao && minhaPosicao.posicao > visiveis.length && (
        <p className="rk-fora">Você está em <strong>#{minhaPosicao.posicao}</strong>, com {minhaPosicao.total.toLocaleString('pt-BR')} questões {periodo === 'semana' ? 'na semana' : 'respondidas'}. Faltam {Math.max(1, (top[top.length - 1]?.total ?? 0) - minhaPosicao.total + 1).toLocaleString('pt-BR')} para entrar no top 50.</p>
      )}
    </>}

    <details className="cartao cartao__corpo rk-regras">
      <summary><h2>Como funciona o ranking</h2><Icone nome="baixo" tamanho={18} /></summary>
      <ul>
        <li><span><Icone nome="grafico" tamanho={18} /></span><div><strong>Conta volume, não acerto.</strong> Cada questão diferente respondida soma um ponto. Refazer a mesma questão não soma de novo.</div></li>
        <li><span><Icone nome="calendario" tamanho={18} /></span><div><strong>Geral ou últimos 7 dias.</strong> O geral mostra o acumulado; a semana dá chance a quem começou agora.</div></li>
        <li><span><Icone nome="usuario" tamanho={18} /></span><div><strong>Todo mundo com conta participa.</strong> Entra quem respondeu pelo menos {MINIMO_RANKING} questões, com o apelido que escolher ou o nome do cadastro e a inicial do sobrenome. Em <a href={href('/conta?secao=ranking')}>Minha conta</a> você troca o apelido ou sai do ranking. E-mail, telefone e cidade nunca aparecem. O serviço onde você faz residência só aparece se você ligar a opção em <a href={href('/conta?secao=perfil')}>Meu perfil</a>.</div></li>
        <li><span><Icone nome="medalha" tamanho={18} /></span><div><strong>Conquistas e vitrine.</strong> As conquistas ficam no seu inventário para sempre, e você escolhe até três para aparecer ao lado do nome. A fogueira mostra a sua sequência de dias seguidos com pelo menos {META_STREAK_DIARIA} questões: se a sequência acabar, ela some e recomeça do zero.</div></li>
      </ul>
    </details>
  </div>
}

/** Página das conquistas: o inventário completo e a escolha da vitrine. */
export function Conquistas({ escolher = false }: { escolher?: boolean } = {}) {
  const { sessao } = usarConta()
  const { perfil, carregado, nomeExibido, salvarVitrine, comVitrine } = usarPerfilRanking(sessao)
  const { metricas, streak, conquistadas, total } = usarConquistas()
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

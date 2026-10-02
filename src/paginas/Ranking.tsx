import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis, supabase } from '../conta/supabase'
import { href } from '../util/rotas'
import { recurso } from '../config'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { EmblemasDoNome, Fogueira, Inventario } from '../componentes/Inventario'

/** Abas entre o ranking e o inventário de conquistas. */
function AbasRanking({ atual, conquistadas, total }: { atual: 'ranking' | 'conquistas'; conquistadas: number; total: number }) {
  return <nav className="rk-secoes" aria-label="Ranking e conquistas">
    <a className="rk-secoes__aba" href={href('/ranking')} aria-current={atual === 'ranking' ? 'page' : undefined}><Icone nome="trofeu" tamanho={18} /> Ranking</a>
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
import '@fontsource/pixelify-sans/latin-700.css'
import '../estilos/paginas/Ranking.css'

type Periodo = 'geral' | 'semana'
type LinhaRanking = {
  posicao: number; apelido: string; total: number; total_geral: number; eh_voce: boolean
  variacao: number | null; variacao_semana: number | null; novo: boolean; referencia_em: string | null
  /** Vitrine escolhida pela pessoa e sequência viva (fogueira). Ausentes antes da migration. */
  emblemas?: string[] | null; sequencia?: number | null
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
    <p className="rk-alta__titulo"><img src={recurso('ranking/chama.png')} width={24} height={24} alt="" draggable={false} />Subindo rápido<img src={recurso('ranking/chama.png')} width={24} height={24} alt="" draggable={false} /></p>
    <ol className="rk-alta__lista">
      {subindo.map(linha => (
        <li key={linha.posicao} className={'rk-alta__item' + (linha.eh_voce ? ' rk-alta__item--voce' : '')}>
          <img className="rk-alta__prego" src={recurso('ranking/tachinha.png')} width={18} height={18} alt="" draggable={false} />
          <span className="rk-alta__avatar">{iniciais(linha.apelido)}</span>
          <span className="rk-alta__nome"><strong>{linha.apelido}{linha.eh_voce && <span className="rk-voce">você</span>}</strong><small>agora em #{linha.posicao}</small></span>
          <Movimento linha={linha} />
        </li>
      ))}
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
      <p className="rk-arena__titulo">Salão dos campeões</p>
      <ol className="rk-podio">
        {ordem.map((linha) => (
          <li key={linha.posicao} className={`rk-podio__lugar rk-podio__lugar--${linha.posicao}${linha.eh_voce ? ' rk-podio__lugar--voce' : ''}`}>
            <img className="rk-podio__coroa" src={recurso(`emblemas/podio-${linha.posicao}.png`)} alt="" width={linha.posicao === 1 ? 64 : 48} height={linha.posicao === 1 ? 64 : 48} draggable={false} />
            <span className="rk-podio__avatar">{iniciais(linha.apelido)}</span>
            <strong className="rk-podio__nome">{linha.apelido}{linha.eh_voce && <span className="rk-voce">você</span>}</strong>
            <span className="rk-podio__emblemas"><EmblemasDoNome ids={linha.emblemas} totalGeral={linha.total_geral} tamanho={36} /><Fogueira dias={linha.sequencia ?? 0} tamanho={20} /></span>
            <span className="rk-podio__total"><b className="numerico">{linha.total.toLocaleString('pt-BR')}</b> {periodo === 'semana' ? 'na semana' : 'questões'}</span>
            <Movimento linha={linha} />
            <span className="rk-podio__base" aria-hidden="true">{linha.posicao}º</span>
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

  const meuTotal = Object.keys(contexto.respondidas).length
  const { perfil: perfilRanking, carregado: perfilCarregado, nomeExibido } = usarPerfilRanking(sessao)
  const { streak, conquistadas, total: totalConquistas } = usarConquistas()
  usarPublicarSequencia(sessao, streak.atual, streak.ateDia)

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
        emblemas: linha.emblemas ?? null, sequencia: linha.sequencia ?? null,
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
  // A RPC devolve a sua linha mesmo fora do top 50; ela alimenta o cartão, não a lista.
  const eu = linhas?.find(linha => linha.eh_voce) ?? null
  const top = linhas?.filter(linha => linha.posicao <= 50) ?? null
  const acima = eu && linhas ? linhas.find(linha => linha.posicao === eu.posicao - 1) ?? null : null
  const lider = top?.[0]?.total ?? 1
  const restantes = top && top.length >= 3 ? top.slice(3) : top ?? []

  return <div className="empilha-2 rk">
    <section className="rk-heroi">
      <div className="rk-heroi__texto">
        <p className="rk-heroi__selo"><Icone nome="trofeu" tamanho={16} /> Top 50</p>
        <h1>Ranking</h1>
        <p>Quem mais responde questões no OrtoQuestões. Conta volume, não acerto: aqui ganha quem aparece todo dia.</p>
      </div>
      {sessao && (
        <div className="rk-heroi__cartao">
          {perfilCarregado && !perfilRanking.participa ? <>
            <span className="rk-heroi__rotulo">Você saiu do ranking</span>
            <strong className="rk-heroi__posicao">Fora</strong>
            <span className="rk-heroi__rotulo"><a href={href('/conta')}>Voltar ao ranking em Minha conta</a></span>
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

    <a className="rk-bau" href={href('/conquistas')}>
      <img className="rk-bau__arte" src={recurso('emblemas/podio-1.png')} alt="" width={56} height={56} />
      <span className="rk-bau__texto">
        <strong>Suas conquistas</strong>
        <span><b className="numerico">{conquistadas}</b> de {totalConquistas} desbloqueadas{streak.atual >= 3 ? ` · sequência de ${streak.atual} dias` : ''}</span>
      </span>
      <span className="rk-bau__vitrine" aria-hidden="true">
        {Array.from({ length: VITRINE_MAXIMO }, (_, i) => {
          const e = perfilRanking.emblemas[i] ? emblemaPorId(perfilRanking.emblemas[i]) : undefined
          return <span key={i} className={'inv-slot' + (e ? ' inv-slot--cheio' : '')}>{e ? <Medalha conquista={e} tamanho={36} /> : <span className="inv-slot__vazio">+</span>}</span>
        })}
      </span>
      <span className="rk-bau__seta" aria-hidden="true"><Icone nome="direita" tamanho={20} /></span>
    </a>

    {!sessao ? (
      <Estado titulo="Entre na sua conta para ver o ranking" acoes={<a className="botao botao--principal" href={href('/conta?modo=entrar')}>Entrar ou criar conta</a>}>
        <p>O ranking reúne quem mais respondeu questões entre todas as contas com pelo menos 5 questões respondidas.</p>
      </Estado>
    ) : <>
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
              <span className="rk-linha__apelido">{linha.apelido}{linha.eh_voce && <span className="rk-voce">você</span>}</span>
              <span className="rk-linha__selos"><EmblemasDoNome ids={linha.emblemas} totalGeral={linha.total_geral} tamanho={32} /><Fogueira dias={linha.sequencia ?? 0} /></span>
              <span className="rk-linha__barra" aria-hidden="true"><span style={{ width: `${Math.max(3, (linha.total / lider) * 100)}%` }} /></span>
            </span>
            <span className="rk-linha__total numerico">{linha.total.toLocaleString('pt-BR')}</span>
          </li>
        ))}
      </ol>}

      {top && minhaPosicao && minhaPosicao.posicao > top.length && (
        <p className="rk-fora">Você está em <strong>#{minhaPosicao.posicao}</strong>, com {minhaPosicao.total.toLocaleString('pt-BR')} questões {periodo === 'semana' ? 'na semana' : 'respondidas'}. Faltam {Math.max(1, (top[top.length - 1]?.total ?? 0) - minhaPosicao.total + 1).toLocaleString('pt-BR')} para entrar no top 50.</p>
      )}
    </>}

    <section className="cartao cartao__corpo rk-regras">
      <h2>Como funciona</h2>
      <ul>
        <li><span><Icone nome="grafico" tamanho={18} /></span><div><strong>Conta volume, não acerto.</strong> Cada questão diferente respondida soma um ponto. Refazer a mesma questão não soma de novo.</div></li>
        <li><span><Icone nome="calendario" tamanho={18} /></span><div><strong>Geral ou últimos 7 dias.</strong> O geral mostra o acumulado; a semana dá chance a quem começou agora.</div></li>
        <li><span><Icone nome="usuario" tamanho={18} /></span><div><strong>Todo mundo com conta participa.</strong> Entra quem respondeu pelo menos {MINIMO_RANKING} questões, com o apelido que escolher ou o nome do cadastro e a inicial do sobrenome. Em <a href={href('/conta')}>Minha conta</a> você troca o apelido ou sai do ranking. E-mail, telefone e cidade nunca aparecem.</div></li>
        <li><span><Icone nome="medalha" tamanho={18} /></span><div><strong>Conquistas e vitrine.</strong> As conquistas ficam no seu inventário para sempre, e você escolhe até três para aparecer ao lado do nome. A fogueira mostra a sua sequência de dias seguidos com pelo menos {META_STREAK_DIARIA} questões: se a sequência acabar, ela some e recomeça do zero.</div></li>
      </ul>
    </section>
  </div>
}

/** Página das conquistas: o inventário completo e a escolha da vitrine. */
export function Conquistas() {
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
    <Inventario metricas={metricas} nome={sessao ? nomeExibido : 'Você'} vitrine={perfil.emblemas} salvarVitrine={salvarVitrine} podeEscolher={!!sessao && carregado && comVitrine} />
  </div>
}

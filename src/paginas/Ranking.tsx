import { useEffect, useMemo, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis, supabase } from '../conta/supabase'
import { href } from '../util/rotas'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { Medalha } from '../componentes/Medalha'
import { CONQUISTAS, CONQUISTAS_SEQUENCIA, conquistaAtual, proximaConquista, type Conquista } from '../estado/conquistas'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { calcularStreak, META_STREAK_DIARIA } from '../estado/streak'
import { nomeNoRanking } from '../util/nomeRanking'

type Periodo = 'geral' | 'semana'
type LinhaRanking = { posicao: number; apelido: string; total: number; total_geral: number; eh_voce: boolean }
type MinhaPosicao = { posicao: number; total: number; total_geral: number } | null

const ROTULOS_PERIODO: Record<Periodo, string> = { geral: 'Geral', semana: 'Últimos 7 dias' }

function iniciais(apelido: string): string {
  const partes = apelido.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?'
}

/** Emblema (se houver) do total histórico, para mostrar ao lado do nome. */
function Emblema({ total, tamanho = 22 }: { total: number; tamanho?: number }) {
  const conquista = conquistaAtual(total)
  if (!conquista) return null
  return <span className="rk-emblema"><Medalha conquista={conquista} tamanho={tamanho} titulo={`${conquista.rotulo} · ${total.toLocaleString('pt-BR')} questões no total`} /></span>
}

function Podio({ linhas, periodo }: { linhas: LinhaRanking[]; periodo: Periodo }) {
  const ordem = [linhas[1], linhas[0], linhas[2]].filter(Boolean)
  return (
    <ol className="rk-podio" aria-label="Três primeiros colocados">
      {ordem.map((linha) => (
        <li key={linha.posicao} className={`rk-podio__lugar rk-podio__lugar--${linha.posicao}${linha.eh_voce ? ' rk-podio__lugar--voce' : ''}`}>
          <span className="rk-podio__avatar">{iniciais(linha.apelido)}<span className="rk-podio__posicao">{linha.posicao}</span></span>
          <strong className="rk-podio__nome">{linha.apelido}{linha.eh_voce && <span className="rk-voce">você</span>}</strong>
          <Emblema total={linha.total_geral} tamanho={26} />
          <span className="rk-podio__total"><b className="numerico">{linha.total.toLocaleString('pt-BR')}</b> {periodo === 'semana' ? 'na semana' : 'questões'}</span>
          <span className="rk-podio__base" aria-hidden="true">{linha.posicao}º</span>
        </li>
      ))}
    </ol>
  )
}

function GradeEmblemas({ lista, valor, unidade }: { lista: readonly Conquista[]; valor: number; unidade: (n: number) => string }) {
  return (
    <ul className="rk-grade">
      {lista.map((c) => {
        const tem = valor >= c.minimo
        return (
          <li key={c.minimo} className={'rk-grade__item' + (tem ? ' rk-grade__item--tem' : '')}>
            <Medalha conquista={c} tamanho={52} bloqueada={!tem} />
            <strong>{c.rotulo}</strong>
            <small>{tem ? 'Conquistado' : `${unidade(c.minimo)}`}</small>
          </li>
        )
      })}
    </ul>
  )
}

export function Ranking() {
  const { sessao } = usarConta()
  const { contexto } = usarContextoLocal('')
  const [periodo, definirPeriodo] = useState<Periodo>('geral')
  const [linhas, definirLinhas] = useState<LinhaRanking[] | null>(null)
  const [minhaPosicao, definirMinhaPosicao] = useState<MinhaPosicao>(null)
  const [participa, definirParticipa] = useState<boolean | null>(null)
  const [erro, definirErro] = useState(false)
  const [recarregar, definirRecarregar] = useState(0)
  const [entrando, definirEntrando] = useState(false)

  const meuTotal = Object.keys(contexto.respondidas).length
  const recordeSequencia = useMemo(() => calcularStreak(contexto.respondidas).recorde, [contexto.respondidas])

  useEffect(() => {
    if (!supabase || !sessao) return
    let vivo = true
    definirErro(false)
    definirLinhas(null)
    Promise.all([
      supabase.rpc('obter_ranking_publico', { periodo }),
      supabase.rpc('minha_posicao_ranking', { periodo }),
      supabase.from('perfis_publicos').select('participa_ranking').eq('usuario_id', sessao.user.id).maybeSingle(),
    ]).then(([ranking, minha, perfil]) => {
      if (!vivo) return
      if (ranking.error || minha.error) { definirErro(true); return }
      definirLinhas(ranking.data ?? [])
      definirMinhaPosicao(minha.data?.[0] ?? null)
      definirParticipa(Boolean(perfil.data?.participa_ranking) || Boolean(minha.data?.[0]))
    }).catch(() => { if (vivo) definirErro(true) })
    return () => { vivo = false }
  }, [sessao, periodo, recarregar])

  async function participarAgora() {
    if (!supabase || !sessao) return
    const meta = sessao.user.user_metadata ?? {}
    const nome = String(meta.nome ?? '').trim(), sobrenome = String(meta.sobrenome ?? '').trim()
    const apelido = nomeNoRanking(nome, sobrenome)
    definirEntrando(true)
    try {
      const { error } = await supabase.from('perfis_publicos').upsert({ apelido, participa_ranking: true }, { onConflict: 'usuario_id' })
      if (error) throw error
      definirRecarregar((n) => n + 1)
    } catch { definirErro(true) }
    finally { definirEntrando(false) }
  }

  if (!contasDisponiveis || !supabase) {
    return <article className="limite-leitura empilha">
      <h1>Ranking</h1>
      <p>O ranking depende de contas, que estão em preparação. Você já pode estudar gratuitamente.</p>
      <a className="botao botao--principal" href={href('/treinar')}>Continuar estudando</a>
    </article>
  }

  const meuEmblema = conquistaAtual(meuTotal)
  const meuProximo = proximaConquista(meuTotal)
  const anterior = meuEmblema?.minimo ?? 0
  const progressoProximo = meuProximo ? Math.min(100, Math.round(((meuTotal - anterior) / (meuProximo.minimo - anterior)) * 100)) : 100
  const lider = linhas?.[0]?.total ?? 1
  const restantes = linhas && linhas.length >= 3 ? linhas.slice(3) : linhas ?? []

  return <div className="empilha-2 rk">
    <section className="rk-heroi">
      <div className="rk-heroi__texto">
        <p className="rk-heroi__selo"><Icone nome="trofeu" tamanho={16} /> Top 50</p>
        <h1>Ranking</h1>
        <p>Quem mais responde questões no OrtoQuestões. Conta volume, não acerto: aqui ganha quem aparece todo dia.</p>
      </div>
      {sessao && (
        <div className="rk-heroi__cartao">
          {minhaPosicao ? <>
            <span className="rk-heroi__rotulo">Sua posição {periodo === 'semana' ? 'na semana' : 'geral'}</span>
            <strong className="rk-heroi__posicao">#{minhaPosicao.posicao}</strong>
            <span className="rk-heroi__rotulo">{minhaPosicao.total.toLocaleString('pt-BR')} questões {periodo === 'semana' ? 'nos últimos 7 dias' : 'respondidas'}</span>
          </> : participa === false ? <>
            <span className="rk-heroi__rotulo">Você ainda não aparece no ranking</span>
            <button type="button" className="botao botao--claro" onClick={() => void participarAgora()} disabled={entrando}>{entrando ? 'Ativando…' : 'Participar agora'}</button>
            <a className="rk-heroi__link" href={href('/conta')}>Escolher como meu nome aparece</a>
          </> : <>
            <span className="rk-heroi__rotulo">Seu emblema</span>
            <strong className="rk-heroi__posicao">{meuEmblema?.rotulo ?? '...'}</strong>
            <span className="rk-heroi__rotulo">Responda questões para entrar na lista</span>
          </>}
        </div>
      )}
    </section>

    {!sessao ? (
      <Estado titulo="Entre na sua conta para ver o ranking" acoes={<a className="botao botao--principal" href={href('/conta?modo=entrar')}>Entrar ou criar conta</a>}>
        <p>O ranking reúne quem mais respondeu questões entre as contas que decidiram participar.</p>
      </Estado>
    ) : <>
      <div className="rk-abas" role="tablist" aria-label="Período do ranking">
        {(['geral', 'semana'] as const).map((p) => (
          <button key={p} type="button" role="tab" aria-selected={periodo === p} className="rk-aba" onClick={() => definirPeriodo(p)}>{ROTULOS_PERIODO[p]}</button>
        ))}
      </div>

      {linhas === null && !erro && <Carregando linhas={6} rotulo="Carregando ranking" />}

      {erro && <Estado titulo="Não foi possível carregar o ranking agora">
        <p>Confira sua conexão e tente novamente em instantes.</p>
      </Estado>}

      {linhas && linhas.length === 0 && <Estado titulo={periodo === 'semana' ? 'Ninguém respondeu questões nos últimos 7 dias' : 'Ainda não há ninguém no ranking'}>
        <p>Seja a primeira pessoa a aparecer aqui.</p>
      </Estado>}

      {linhas && linhas.length >= 3 && <Podio linhas={linhas} periodo={periodo} />}

      {restantes.length > 0 && <ol className="rk-lista">
        {restantes.map((linha) => (
          <li key={linha.posicao} className={'rk-linha' + (linha.eh_voce ? ' rk-linha--voce' : '')}>
            <span className="rk-linha__posicao numerico">{linha.posicao}</span>
            <span className="rk-linha__avatar">{iniciais(linha.apelido)}</span>
            <span className="rk-linha__nome">
              <span className="rk-linha__apelido">{linha.apelido}<Emblema total={linha.total_geral} />{linha.eh_voce && <span className="rk-voce">você</span>}</span>
              <span className="rk-linha__barra" aria-hidden="true"><span style={{ width: `${Math.max(3, (linha.total / lider) * 100)}%` }} /></span>
            </span>
            <span className="rk-linha__total numerico">{linha.total.toLocaleString('pt-BR')}</span>
          </li>
        ))}
      </ol>}

      {linhas && minhaPosicao && minhaPosicao.posicao > linhas.length && (
        <p className="rk-fora">Você está em <strong>#{minhaPosicao.posicao}</strong>, com {minhaPosicao.total.toLocaleString('pt-BR')} questões {periodo === 'semana' ? 'na semana' : 'respondidas'}. Faltam {Math.max(1, (linhas[linhas.length - 1]?.total ?? 0) - minhaPosicao.total + 1).toLocaleString('pt-BR')} para entrar no top 50.</p>
      )}
    </>}

    <section className="cartao cartao__corpo rk-emblemas">
      <div className="rk-emblemas__topo">
        <div>
          <p className="meta">SEUS EMBLEMAS</p>
          <h2>{meuEmblema ? meuEmblema.rotulo : 'Seu primeiro emblema está perto'}</h2>
          <p className="texto-2">{meuProximo ? <>Faltam <strong>{(meuProximo.minimo - meuTotal).toLocaleString('pt-BR')}</strong> questões para <strong>{meuProximo.rotulo}</strong>.</> : 'Você chegou ao emblema mais alto. Lenda.'}</p>
        </div>
        {meuProximo && <div className="rk-progresso" aria-label={`${progressoProximo}% até ${meuProximo.rotulo}`}>
          <span className="rk-progresso__barra"><span style={{ width: `${progressoProximo}%` }} /></span>
          <small className="numerico">{meuTotal.toLocaleString('pt-BR')} / {meuProximo.minimo.toLocaleString('pt-BR')}</small>
        </div>}
      </div>
      <h3 className="rk-emblemas__familia">Questões respondidas</h3>
      <GradeEmblemas lista={CONQUISTAS} valor={meuTotal} unidade={(n) => `${n.toLocaleString('pt-BR')} questões`} />
      <h3 className="rk-emblemas__familia">Sequência de dias</h3>
      <GradeEmblemas lista={CONQUISTAS_SEQUENCIA} valor={recordeSequencia} unidade={(n) => `${n} dias seguidos`} />
    </section>

    <section className="cartao cartao__corpo rk-regras">
      <h2>Como funciona</h2>
      <ul>
        <li><span><Icone nome="grafico" tamanho={18} /></span><div><strong>Conta volume, não acerto.</strong> Cada questão diferente respondida soma um ponto. Refazer a mesma questão não soma de novo.</div></li>
        <li><span><Icone nome="calendario" tamanho={18} /></span><div><strong>Geral ou últimos 7 dias.</strong> O geral mostra o acumulado; a semana dá chance a quem começou agora.</div></li>
        <li><span><Icone nome="usuario" tamanho={18} /></span><div><strong>Só aparece quem quer.</strong> A participação é opcional e você escolhe o nome exibido em <a href={href('/conta')}>Minha conta</a>. E-mail, telefone e cidade nunca aparecem.</div></li>
        <li><span><Icone nome="medalha" tamanho={18} /></span><div><strong>Emblemas são para sempre.</strong> Os de questões aparecem ao lado do seu nome; os de sequência contam o seu recorde de dias seguidos com pelo menos {META_STREAK_DIARIA} questões.</div></li>
      </ul>
    </section>
  </div>
}

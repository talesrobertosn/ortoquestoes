import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis, supabase } from '../conta/supabase'
import { href } from '../util/rotas'
import { Carregando, Estado } from '../componentes/Estados'
import { CONQUISTAS, conquistaAtual, proximaConquista } from '../estado/conquistas'

type Periodo = 'geral' | 'semana'
type LinhaRanking = { posicao: number; apelido: string; total: number; total_geral: number; eh_voce: boolean }
type MinhaPosicao = { posicao: number; total: number; total_geral: number } | null

const ROTULOS_PERIODO: Record<Periodo, string> = { geral: 'Geral', semana: 'Últimos 7 dias' }

/** Emblema (se houver) do total histórico, para mostrar ao lado do nome. */
function Emblema({ total }: { total: number }) {
  const conquista = conquistaAtual(total)
  if (!conquista) return null
  return <span title={`${conquista.rotulo} · ${total.toLocaleString('pt-BR')} questões no total`}> {conquista.emoji}</span>
}

export function Ranking() {
  const { sessao } = usarConta()
  const [periodo, definirPeriodo] = useState<Periodo>('geral')
  const [linhas, definirLinhas] = useState<LinhaRanking[] | null>(null)
  const [minhaPosicao, definirMinhaPosicao] = useState<MinhaPosicao>(null)
  const [erro, definirErro] = useState(false)

  useEffect(() => {
    if (!supabase || !sessao) return
    let vivo = true
    definirErro(false)
    definirLinhas(null)
    Promise.all([
      supabase.rpc('obter_ranking_publico', { periodo }),
      supabase.rpc('minha_posicao_ranking', { periodo }),
    ]).then(([ranking, minha]) => {
      if (!vivo) return
      if (ranking.error || minha.error) { definirErro(true); return }
      definirLinhas(ranking.data ?? [])
      definirMinhaPosicao(minha.data?.[0] ?? null)
    })
    return () => { vivo = false }
  }, [sessao, periodo])

  if (!contasDisponiveis || !supabase) {
    return <article className="limite-leitura empilha">
      <h1>Ranking</h1>
      <p>O ranking depende de contas, que estão em preparação. Você já pode estudar gratuitamente.</p>
      <a className="botao botao--principal" href={href('/treinar')}>Continuar estudando</a>
    </article>
  }

  if (!sessao) {
    return <article className="limite-leitura empilha">
      <header><p className="meta">TOP 50</p><h1>Ranking de questões respondidas</h1></header>
      <Estado titulo="Entre na sua conta para ver o ranking">
        <p>O ranking reúne quem mais respondeu questões entre as contas que decidiram participar.</p>
      </Estado>
      <a className="botao botao--principal" href={href('/conta?modo=entrar')}>Entrar ou criar conta</a>
    </article>
  }

  const meuProximo = minhaPosicao ? proximaConquista(minhaPosicao.total_geral) : null

  return <article className="limite-leitura empilha-2">
    <header>
      <p className="meta">TOP 50</p>
      <h1>Ranking de questões respondidas</h1>
      <p>Contagem simples de questões respondidas, sem levar em conta o percentual de acerto. Só aparece aqui quem decidiu participar.</p>
    </header>

    <div className="grupo-opcoes" aria-label="Período do ranking">
      {(['geral', 'semana'] as const).map((p) => (
        <button key={p} type="button" className="opcao-segmento" aria-pressed={periodo === p} onClick={() => definirPeriodo(p)}>{ROTULOS_PERIODO[p]}</button>
      ))}
    </div>

    {linhas === null && !erro && <Carregando linhas={6} rotulo="Carregando ranking" />}

    {erro && <Estado titulo="Não foi possível carregar o ranking agora">
      <p>Confira sua conexão e tente novamente em instantes.</p>
    </Estado>}

    {linhas && linhas.length === 0 && <Estado titulo={periodo === 'semana' ? 'Ninguém respondeu questões nos últimos 7 dias' : 'Ainda não há ninguém no ranking'}>
      <p>Seja a primeira pessoa: ative sua participação em <a href={href('/conta')}>Minha conta</a>.</p>
    </Estado>}

    {linhas && linhas.length > 0 && <section className="cartao cartao__corpo">
      <div className="rolagem-x">
        <table className="tabela">
          <thead>
            <tr><th scope="col">#</th><th scope="col">Nome</th><th scope="col" className="numerico">Questões {periodo === 'semana' ? 'na semana' : 'respondidas'}</th></tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.posicao} className={linha.eh_voce ? 'linha-destaque' : undefined}>
                <th scope="row">{linha.posicao}</th>
                <td>{linha.apelido}<Emblema total={linha.total_geral} />{linha.eh_voce && <span className="meta"> · você</span>}</td>
                <td className="numerico">{linha.total.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>}

    {linhas && minhaPosicao && minhaPosicao.posicao > linhas.length && (
      <p className="texto-2">Sua posição: <strong>#{minhaPosicao.posicao}</strong>, com {minhaPosicao.total.toLocaleString('pt-BR')} questões {periodo === 'semana' ? 'na semana' : 'respondidas'}.</p>
    )}

    {linhas && !minhaPosicao && (
      <section className="cartao cartao__corpo empilha">
        <h2>Você ainda não participa</h2>
        <p className="texto-2">Ative sua participação e escolha como seu nome aparece em <a href={href('/conta')}>Minha conta</a>. Quem passa de marcos como 100, 500 ou 1.000 questões ganha um emblema ao lado do nome.</p>
      </section>
    )}

    {linhas && minhaPosicao && meuProximo && (
      <p className="texto-2">Faltam <strong>{(meuProximo.minimo - minhaPosicao.total_geral).toLocaleString('pt-BR')}</strong> questões para o próximo emblema: {meuProximo.emoji} {meuProximo.rotulo}.</p>
    )}

    <section className="cartao cartao__corpo">
      <details>
        <summary>O que são os emblemas?</summary>
        <p className="texto-2" style={{ marginTop: '0.5rem' }}>Marcam o total de questões que você já respondeu na conta, contando desde a primeira — não dependem de posição no ranking nem de acerto, só de constância. Cada um é desbloqueado uma vez e fica valendo para sempre.</p>
        <table className="tabela" style={{ marginTop: '0.75rem' }}>
          <thead><tr><th scope="col">Emblema</th><th scope="col">Nome</th><th scope="col" className="numerico">A partir de</th></tr></thead>
          <tbody>
            {CONQUISTAS.map((c) => (
              <tr key={c.minimo}><td>{c.emoji}</td><td>{c.rotulo}</td><td className="numerico">{c.minimo.toLocaleString('pt-BR')} questões</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  </article>
}

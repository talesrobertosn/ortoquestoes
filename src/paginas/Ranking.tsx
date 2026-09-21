import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis, supabase } from '../conta/supabase'
import { href } from '../util/rotas'
import { Carregando, Estado } from '../componentes/Estados'

type LinhaRanking = { posicao: number; apelido: string; total: number; eh_voce: boolean }
type MinhaPosicao = { posicao: number; total: number } | null

export function Ranking() {
  const { sessao } = usarConta()
  const [linhas, definirLinhas] = useState<LinhaRanking[] | null>(null)
  const [minhaPosicao, definirMinhaPosicao] = useState<MinhaPosicao>(null)
  const [erro, definirErro] = useState(false)

  useEffect(() => {
    if (!supabase || !sessao) return
    let vivo = true
    definirErro(false)
    Promise.all([
      supabase.rpc('obter_ranking_publico'),
      supabase.rpc('minha_posicao_ranking'),
    ]).then(([ranking, minha]) => {
      if (!vivo) return
      if (ranking.error || minha.error) { definirErro(true); return }
      definirLinhas(ranking.data ?? [])
      definirMinhaPosicao(minha.data?.[0] ?? null)
    })
    return () => { vivo = false }
  }, [sessao])

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

  return <article className="limite-leitura empilha-2">
    <header>
      <p className="meta">TOP 50</p>
      <h1>Ranking de questões respondidas</h1>
      <p>Contagem simples de questões respondidas, sem levar em conta o percentual de acerto. Só aparece aqui quem decidiu participar.</p>
    </header>

    {linhas === null && !erro && <Carregando linhas={6} rotulo="Carregando ranking" />}

    {erro && <Estado titulo="Não foi possível carregar o ranking agora">
      <p>Confira sua conexão e tente novamente em instantes.</p>
    </Estado>}

    {linhas && linhas.length === 0 && <Estado titulo="Ainda não há ninguém no ranking">
      <p>Seja a primeira pessoa: ative sua participação em <a href={href('/conta')}>Minha conta</a>.</p>
    </Estado>}

    {linhas && linhas.length > 0 && <section className="cartao cartao__corpo">
      <div className="rolagem-x">
        <table className="tabela">
          <thead>
            <tr><th scope="col">#</th><th scope="col">Nome</th><th scope="col" className="numerico">Questões respondidas</th></tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.posicao} className={linha.eh_voce ? 'linha-destaque' : undefined}>
                <th scope="row">{linha.posicao}</th>
                <td>{linha.apelido}{linha.eh_voce && <span className="meta"> · você</span>}</td>
                <td className="numerico">{linha.total.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>}

    {linhas && minhaPosicao && minhaPosicao.posicao > linhas.length && (
      <p className="texto-2">Sua posição: <strong>#{minhaPosicao.posicao}</strong>, com {minhaPosicao.total.toLocaleString('pt-BR')} questões respondidas.</p>
    )}

    {linhas && !minhaPosicao && (
      <section className="cartao cartao__corpo empilha">
        <h2>Você ainda não participa</h2>
        <p className="texto-2">Ative sua participação e escolha como seu nome aparece em <a href={href('/conta')}>Minha conta</a>.</p>
      </section>
    )}
  </article>
}

import { useEffect, useState } from 'react'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'
import { lerRanking, type LinhaRanking } from '../flashcards/servidor'
import '../estilos/paginas/Ranking.css'
import '../estilos/paginas/CentralFlashcards.css'

/** Ranking único, agregado pelo servidor, sem apagar corridas históricas. */
export function RankingCripta() {
  const [linhas, definir] = useState<LinhaRanking[] | null | undefined>()
  useEffect(() => { let vivo=true; void lerRanking('masmorra').then(x=>{if(vivo)definir(x)}); return ()=>{vivo=false} },[])
  return <div className="empilha-2 rk">
    <nav className="rk-secoes" aria-label="Ranking e conquistas">
      <a className="rk-secoes__aba" href={href('/ranking')}><Icone nome="trofeu" tamanho={18}/> Questões</a>
      <a className="rk-secoes__aba" href={href('/ranking?aba=flashcards')} aria-current="page">Flashcards</a>
      <a className="rk-secoes__aba" href={href('/conquistas')}>Conquistas</a>
    </nav>
    <header className="cf-cabeca"><p className="cf-selo">Torneio de Flashcards</p><h1>Até onde o seu conhecimento leva você?</h1><p>Um só ranking. Conta o maior andar alcançado no jogo, conferido pelo servidor.</p></header>
    <section className="cf-bloco" aria-label="Ranking dos flashcards">
      {linhas===undefined?<p role="status">Carregando…</p>:linhas===null?<p role="status">O ranking não respondeu agora. Tente novamente em instantes.</p>:!linhas.length?<p>A primeira posição está livre. Comece sua jornada.</p>:<ol className="rkc-lista">{linhas.map(l=><li key={l.posicao} className={l.ehVoce?'rkc-voce':undefined}><b>{l.posicao}</b><span>{l.apelido}{l.ehVoce?' (você)':''}</span><em>andar {l.valor}</em></li>)}</ol>}
      <a className="botao botao--ouro" href={href('/flashcards/entrada')}>Entrar no Torneio</a>
    </section>
    <section className="cf-bloco"><h2>Como funciona</h2><p>A jornada começa pelos flashcards das questões com maior acerto da turma. Depois vêm as questões que você acertou, as que errou e uma mistura do acervo. A seleção varia dentro de cada grupo.</p><p>O ranking das questões continua separado. Aqui aparecem apenas os nomes públicos; sua preferência de participação no perfil é respeitada. Corridas já registradas permanecem no histórico.</p></section>
  </div>
}

import { useEffect, useState } from 'react'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'
import { recurso } from '../config'
import { lerRanking, type LinhaRanking } from '../flashcards/servidor'
import '../estilos/paginas/Ranking.css'
import '../estilos/paginas/CentralFlashcards.css'
import { PodioPixel } from '../componentes/PodioPixel'
import { EmblemasFlashcards } from '../componentes/EmblemasFlashcards'
import { EMBLEMAS, ehFamiliaFlashcards } from '../estado/conquistas'
import { EMBLEMAS_COM_IMAGEM } from '../dados/imagensEmblemas'

/** Três emblemas de Flashcards de amostra no convite para as conquistas. */
const AMOSTRA = ['fc-andar-21', 'fc-revisao-14', 'fc-lendarios-200'].filter((id) => EMBLEMAS_COM_IMAGEM.has(id))
const TOTAL_FC = EMBLEMAS.filter((e) => ehFamiliaFlashcards(e.familia) && !e.secreta).length

/** Ranking único, agregado pelo servidor, sem apagar corridas históricas. */
export function RankingCripta() {
  const [linhas, definir] = useState<LinhaRanking[] | null | undefined>()
  useEffect(() => {
    // só no desenvolvimento (#/ranking?aba=flashcards&demo=1): linhas fictícias para revisar o visual
    if (import.meta.env.DEV && location.hash.includes('demo=1')) { definir(Array.from({ length: 18 }, (_, i) => ({ posicao: i + 1, apelido: ['Ana P.', 'Bruno C.', 'Carla M.', 'Diego R.', 'Elisa F.', 'Fábio T.'][i % 6], valor: Math.max(1, 31 - i * 2), ehVoce: i === 4,
      emblemasFlashcards: [['fc-andar-30', 'fc-revisao-14'], ['fc-andar-21'], [], ['fc-bestiario-20', 'fc-andar-12'], ['fc-sem-errar-10']][i % 5], emblemas: i % 3 === 0 ? ['questoes-1000'] : [] }))); return }
    let vivo=true; void lerRanking('masmorra').then(x=>{if(vivo)definir(x)}); return ()=>{vivo=false}
  },[])
  return <div className="empilha-2 rk rk--cripta">
    <nav className="rk-secoes" aria-label="Ranking e conquistas">
      <a className="rk-secoes__aba" href={href('/ranking')}><Icone nome="trofeu" tamanho={18}/> Questões</a>
      <a className="rk-secoes__aba" href={href('/ranking?aba=flashcards')} aria-current="page">Flashcards</a>
      <a className="rk-secoes__aba" href={href('/conquistas')}>Conquistas</a>
    </nav>
    <header className="cf-cabeca" style={{ ['--fundo-cripta' as string]: `url(${recurso('ranking/podio-cripta.png')})` }}><p className="cf-selo">Torneio de Flashcards</p><h1>Até onde o seu conhecimento leva você?</h1><p>Um só ranking. Conta o maior andar alcançado no jogo, conferido pelo servidor.</p></header>
    <section className="cf-bloco" aria-label="Ranking dos flashcards">
      {linhas===undefined?<p role="status">Carregando…</p>:linhas===null?<p role="status">O ranking não respondeu agora. Tente novamente em instantes.</p>:!linhas.length?<p>A primeira posição está livre. Comece sua jornada.</p>:<>
        {linhas.length>=3&&<PodioPixel cena="cripta" titulo="Os que desceram mais fundo" lugares={linhas.slice(0,3).map(l=>({posicao:l.posicao,nome:l.apelido,ehVoce:l.ehVoce,valor:`andar ${l.valor}`,extra:<span className="pdx__extra"><EmblemasFlashcards vitrine={l.emblemas} flashcards={l.emblemasFlashcards} tamanho={24}/></span>}))}/>}
        <ol className="rkc-lista">{linhas.slice(linhas.length>=3?3:0).map(l=><li key={l.posicao} className={l.ehVoce?'rkc-voce':undefined}>
          <b aria-label={`${l.posicao}º lugar`}>{l.posicao}</b>
          <span className="rkc-nome"><span>{l.apelido}{l.ehVoce?' (você)':''}</span><EmblemasFlashcards vitrine={l.emblemas} flashcards={l.emblemasFlashcards} tamanho={26}/></span>
          <em><small>andar</small><strong>{l.valor}</strong></em>
        </li>)}</ol>
      </>}
      <a className="botao botao--ouro" href={href('/flashcards/entrada')}>Entrar no Torneio</a>
    </section>
    <a className="rkc-emblemas" href={href('/conquistas')}>
      {AMOSTRA.length > 0 && <span className="rkc-emblemas__artes" aria-hidden="true">{AMOSTRA.map((id) => <img key={id} src={recurso(`emblemas/${id}.png`)} width={40} height={40} alt="" />)}</span>}
      <span className="rkc-emblemas__texto"><strong>Emblemas de Flashcards</strong><small>{TOTAL_FC} emblemas para conquistar (e alguns secretos). O seu melhor aparece ao lado do nome neste ranking.</small></span>
      <Icone nome="direita" tamanho={18} />
    </a>
    <section className="cf-bloco"><h2>Como funciona</h2><p>A jornada começa pelos flashcards das questões com maior acerto da turma. Depois vêm as questões que você acertou, as que errou e uma mistura do acervo. A seleção varia dentro de cada grupo.</p><p>O ranking das questões continua separado. Aqui aparecem apenas os nomes públicos; sua preferência de participação no perfil é respeitada. Corridas já registradas permanecem no histórico.</p></section>
  </div>
}

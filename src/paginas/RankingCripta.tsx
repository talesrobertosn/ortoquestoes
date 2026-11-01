import { useEffect, useState } from 'react'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'
import { recurso } from '../config'
import { lerRanking, type LinhaRanking } from '../flashcards/servidor'
import { EmblemasFlashcards } from '../componentes/EmblemasFlashcards'
import { EMBLEMAS, ehFamiliaFlashcards } from '../estado/conquistas'
import { EMBLEMAS_COM_IMAGEM } from '../dados/imagensEmblemas'
import { SalaoCem } from '../componentes/cem/SalaoCem'
import { TituloArena } from '../componentes/cem/Arena'
import { AbasRanking } from '../componentes/cem/Abas'
import { iniciais } from '../componentes/cem/regras'
import '../estilos/paginas/Ranking.css'
import '../estilos/paginas/SalaoCem.css'

/** Três emblemas de Flashcards de amostra no convite para as conquistas. */
const AMOSTRA = ['fc-andar-21', 'fc-revisao-14', 'fc-lendarios-200'].filter((id) => EMBLEMAS_COM_IMAGEM.has(id))
const TOTAL_FC = EMBLEMAS.filter((e) => ehFamiliaFlashcards(e.familia) && !e.secreta).length

/**
 * O ranking do Torneio de Flashcards (beta), no mesmo salão do ranking das questões (O Salão dos Cem, 31/10/2026):
 * um ranking só, agregado pelo servidor, que conta o MAIOR ANDAR alcançado no jogo (nunca questões respondidas).
 * Corridas históricas não são apagadas; a lógica do jogo não muda aqui.
 */
export function RankingCripta() {
  const [linhas, definir] = useState<LinhaRanking[] | null | undefined>()
  useEffect(() => {
    // só no desenvolvimento (#/ranking?aba=flashcards&demo=1): linhas fictícias para revisar o visual
    if (import.meta.env.DEV && location.hash.includes('demo=1')) { definir(Array.from({ length: 18 }, (_, i) => ({ posicao: i + 1, apelido: ['Ana P.', 'Bruno C.', 'Carla M.', 'Diego R.', 'Elisa F.', 'Fábio T.'][i % 6], valor: Math.max(1, 31 - i * 2), ehVoce: i === 4,
      emblemasFlashcards: [['fc-andar-30', 'fc-revisao-14'], ['fc-andar-21'], [], ['fc-bestiario-20', 'fc-andar-12'], ['fc-sem-errar-10']][i % 5], emblemas: i % 3 === 0 ? ['questoes-1000'] : [] }))); return }
    let vivo = true; void lerRanking('masmorra').then((x) => { if (vivo) definir(x) }); return () => { vivo = false }
  }, [])
  const eu = linhas?.find((l) => l.ehVoce) ?? null
  const acima = eu && linhas ? linhas.find((l) => l.posicao === eu.posicao - 1) ?? null : null
  const lider = linhas?.[0]?.valor ?? 1

  const convite = <section className="cem-jornada" aria-labelledby="cem-torneio-t">
    <p className="cem-rotulo" id="cem-torneio-t">{eu ? 'Sua posição no Torneio' : 'O Torneio'}</p>
    {eu ? <>
      <div className="cem-jornada__linha">
        <strong className="cem-jornada__grande"><span aria-hidden="true">#</span><span className="so-leitor">posição </span>{eu.posicao}</strong>
        <span className="cem-jornada__total"><b className="numerico">andar {eu.valor}</b> o seu melhor</span>
      </div>
      <p className="cem-jornada__frase">{acima ? <>Chegue ao <b>andar {acima.valor + 1}</b> e você passa <b>{acima.apelido}</b>.</> : 'O andar mais fundo do Torneio é seu.'}</p>
    </> : <>
      <strong className="cem-jornada__grande cem-jornada__grande--texto">Até onde você chega?</strong>
      <p className="cem-jornada__frase">Cada andar vencido no jogo dos flashcards conta. O seu melhor andar, conferido pelo servidor, entra aqui.</p>
    </>}
    <div className="cem-jornada__acoes">
      <a className="botao botao--principal cem-jornada__botao" href={href('/flashcards/entrada')}><Icone nome="raio" tamanho={16} /> Entrar no Torneio</a>
    </div>
  </section>

  return <div className="cem cem--torneio">
    <SalaoCem cerimonia={null} lateral={convite} rotuloPodio="Três primeiros do Torneio de Flashcards"
      cabecalho={<TituloArena rotulo="Torneio de Flashcards · Beta" titulo="Os que desceram mais fundo" sub="Conta o maior andar alcançado no jogo, conferido pelo servidor." />}
      lugares={(linhas ?? []).slice(0, 3).map((l) => ({
        posicao: l.posicao, nome: l.apelido, ehVoce: l.ehVoce, valor: `andar ${l.valor}`, rotulo: 'o maior',
        selos: <EmblemasFlashcards vitrine={l.emblemas} flashcards={l.emblemasFlashcards} tamanho={36} />,
      }))} />

    <div className="cem-barra"><AbasRanking atual="flashcards" /></div>

    {linhas === undefined && <p role="status" className="cem-aviso">Carregando o Torneio…</p>}
    {linhas === null && <p role="status" className="cem-aviso">O ranking do Torneio não respondeu agora. Tente novamente em instantes.</p>}
    {linhas && !linhas.length && <p className="cem-aviso">A primeira posição está livre. Comece sua jornada no Torneio.</p>}

    {linhas && linhas.length > 3 && <section className="cem-lista" aria-labelledby="cem-torneio-lista">
      <header className="cem-lista__cabeca">
        <div>
          <h2 id="cem-torneio-lista">Classificação do Torneio</h2>
          <p className="cem-lista__faixa numerico">#4 a #{linhas[linhas.length - 1].posicao} · maior andar alcançado</p>
        </div>
      </header>
      <ol className="cem-linhas">
        {linhas.slice(3).map((l) => <li key={l.posicao} className={'cem-linha cem-linha--torneio' + (l.ehVoce ? ' cem-linha--voce' : '')}>
          <span className="cem-linha__pos numerico"><span className="so-leitor">Posição </span>{l.posicao}</span>
          <span className="cem-linha__avatar" aria-hidden="true">{iniciais(l.apelido)}</span>
          <span className="cem-linha__quem">
            <span className="cem-linha__nome">{l.apelido}{l.ehVoce && <span className="cem-voce">você</span>}</span>
            <span className="cem-linha__selos"><EmblemasFlashcards vitrine={l.emblemas} flashcards={l.emblemasFlashcards} tamanho={30} /></span>
          </span>
          <span className="cem-linha__placar">
            <b className="numerico"><small className="cem-linha__andar">andar</small> {l.valor}</b>
            <span className="cem-linha__barra" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(0.02, l.valor / Math.max(1, lider))})` }} /></span>
          </span>
        </li>)}
      </ol>
    </section>}

    <a className="cem-bau" href={href('/conquistas')}>
      {AMOSTRA.length > 0 ? <span className="cem-bau__vitrine" aria-hidden="true">{AMOSTRA.map((id) => <img key={id} src={recurso(`emblemas/${id}.png`)} width={36} height={36} alt="" />)}</span> : <span />}
      <span className="cem-bau__texto"><strong>Emblemas de Flashcards</strong><span>{TOTAL_FC} emblemas para conquistar (e alguns secretos). O seu melhor aparece ao lado do nome neste ranking.</span></span>
      <span />
      <span className="cem-bau__seta" aria-hidden="true"><Icone nome="direita" tamanho={20} /></span>
    </a>

    <section className="cem-regras" aria-labelledby="cem-torneio-regras">
      <h2 id="cem-torneio-regras">Como funciona o Torneio</h2>
      <details open><summary>O jogo e o ranking</summary>
        <p>A jornada começa pelos flashcards das questões com maior acerto da turma. Depois vêm as questões que você acertou, as que errou e uma mistura do acervo. A seleção varia dentro de cada grupo.</p>
        <p>O ranking das questões continua separado. Aqui aparecem apenas os nomes públicos; sua preferência de participação no perfil é respeitada. Corridas já registradas permanecem no histórico.</p>
      </details>
    </section>
  </div>
}

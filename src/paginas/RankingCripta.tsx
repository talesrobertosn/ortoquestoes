import { useEffect, useMemo, useState } from 'react'
import { Icone } from '../componentes/Icone'
import { ler } from '../estado/armazenamento'
import { href } from '../util/rotas'
import { CHAVE_RECORDES, RECORDES_VAZIOS, type Recordes } from '../flashcards/progresso'
import { lerRankingCripta, minhaPosicaoCripta, RANKING_NO_SERVIDOR, type LinhaRankingCripta } from '../flashcards/servidor'
import '../estilos/paginas/Ranking.css'
import '../estilos/paginas/CentralFlashcards.css'

type Nivel = 'normal' | 'dificil'

/**
 * Ranking do Torneio de Flashcards no site (#/ranking?aba=flashcards), beta público.
 * Fora do jogo o nome é sempre "flashcards" (pedido do Tales); Cripta só lá dentro. Beta
 * de 13/10/2026. Regras (SQL parte 18, ranking_cripta):
 *  - só o andar mais fundo da Cripta, validado pelo servidor; nunca somado aos pontos das questões;
 *  - Normal e Difícil em listas separadas; Fácil fica fora da disputa (conta só nas suas estatísticas);
 *  - empate: quem chegou primeiro ao andar fica na frente (data em que a corrida alcançou o andar);
 *  - aparecem só o nome público e a posição, nunca o e-mail; quem desligou o ranking no perfil não aparece;
 *  - recordes guardados só neste aparelho, de antes do servidor, não são importados;
 *  - a Torre do Título ainda não tem ranking.
 */
export function RankingCripta() {
  const [nivel, definirNivel] = useState<Nivel>('normal')
  const [dados, definirDados] = useState<Partial<Record<Nivel, LinhaRankingCripta[] | null>>>({})
  const [minha, definirMinha] = useState<Partial<Record<Nivel, { posicao: number; andar: number } | null>>>({})
  const rec = useMemo(() => ({ ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }), [])
  useEffect(() => {
    if (nivel in dados) return
    let vivo = true
    void Promise.all([lerRankingCripta('masmorra', nivel), minhaPosicaoCripta('masmorra', nivel)]).then(([l, m]) => {
      if (!vivo) return
      definirDados((d) => ({ ...d, [nivel]: l })); definirMinha((x) => ({ ...x, [nivel]: m }))
    })
    return () => { vivo = false }
  }, [nivel, dados])
  const linhas = dados[nivel]
  const eu = minha[nivel]
  const euNaLista = linhas?.some((l) => l.ehVoce)

  return (
    <div className="empilha-2 rk">
      <nav className="rk-secoes" aria-label="Ranking e conquistas">
        <a className="rk-secoes__aba" href={href('/ranking')}><Icone nome="trofeu" tamanho={18} /> Questões</a>
        <a className="rk-secoes__aba" href={href('/ranking?aba=flashcards')} aria-current="page"><Icone nome="raio" tamanho={18} /> Flashcards <span className="selo-beta">Beta</span></a>
        <a className="rk-secoes__aba" href={href('/conquistas')}><Icone nome="medalha" tamanho={18} /> Conquistas</a>
      </nav>
      <header className="cf-cabeca">
        <p className="cf-selo"><span className="cf-beta">Beta</span> Torneio de Flashcards</p>
        <h1>Ranking do Torneio de Flashcards</h1>
        <p>Quem chegou mais longe no Torneio de Flashcards, o modo jogo dos flashcards. É separado do ranking de questões: andares nunca somam com pontos.</p>
      </header>
      <div className="cf-chips" role="radiogroup" aria-label="Dificuldade">
        {(['normal', 'dificil'] as const).map((n) => <button key={n} type="button" role="radio" aria-checked={nivel === n} onClick={() => definirNivel(n)}>{n === 'normal' ? 'Normal' : 'Difícil'}</button>)}
      </div>
      <section className="cf-bloco" aria-label={`Ranking ${nivel === 'normal' ? 'Normal' : 'Difícil'}`}>
        {!RANKING_NO_SERVIDOR || linhas === null ? (
          <p className="cf-nota" role="status">O ranking dos flashcards não respondeu agora. Tente de novo em instantes.{rec.andarMaximo ? ` Seu recorde neste aparelho: andar ${rec.andarMaximo}.` : ''}</p>
        ) : !linhas ? <p className="cf-nota" role="status">Carregando…</p> : !linhas.length ? (
          <p className="cf-nota">Ninguém passou do primeiro andar no {nivel === 'normal' ? 'Normal' : 'Difícil'} ainda. A primeira posição está livre.</p>
        ) : (
          <ol className="rkc-lista">
            {linhas.map((l) => (
              <li key={`${l.posicao}-${l.apelido}`} className={l.ehVoce ? 'rkc-voce' : undefined}>
                <b className="numerico">{l.posicao}</b><span>{l.apelido}{l.ehVoce ? ' (você)' : ''}</span><em className="numerico">andar {l.andar}</em>
              </li>
            ))}
          </ol>
        )}
        {eu && !euNaLista && <p className="cf-nota">Sua posição: <b>#{eu.posicao}</b>, andar {eu.andar}.</p>}
        <a className="botao botao--ouro" href={href('/flashcards/entrada')}>Entrar no Torneio</a>
      </section>
      <section className="cf-bloco" aria-labelledby="rkc-regras">
        <h2 id="rkc-regras">Como funciona</h2>
        <ul className="rkc-regras">
          <li>Conta o andar mais fundo que você alcançou no Torneio, conferido pelo servidor a cada andar.</li>
          <li>Normal e Difícil têm listas separadas. O Fácil fica fora da disputa, mas conta nas suas estatísticas.</li>
          <li>Empate no andar: fica na frente quem chegou primeiro.</li>
          <li>Aparecem só o seu nome público e a posição, nunca o e-mail. Dá para sair do ranking no seu perfil.</li>
          <li>Recordes guardados só neste aparelho, antes da conta, não entram.</li>
          <li>A Torre do Título ainda não tem ranking.</li>
        </ul>
      </section>
    </div>
  )
}

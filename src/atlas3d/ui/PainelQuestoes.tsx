import { lazy, Suspense, useMemo, useState } from 'react'
import { Icone } from '../../componentes/Icone'
import { Carregando } from '../../componentes/Estados'
import { AREAS_TREINO, FILTROS_VAZIOS } from '../../dados/tipos'
import type { RegistroQuestao } from '../../estado/revisao'
import { CHAVE_RESPONDIDAS, usarSessao } from '../../estado/sessao'
import { usarArmazenado } from '../../estado/usarArmazenado'
import { navegar } from '../../util/rotas'

const QuestaoDireta = lazy(() => import('../../paginas/QuestaoDireta').then((m) => ({ default: m.QuestaoDireta })))

/**
 * Questões ligadas à estrutura, respondidas dentro do atlas: o modelo continua ao lado.
 * As que a pessoa ainda não respondeu vêm primeiro; "Sessão completa" leva ao modo de prova.
 */
export function PainelQuestoes({ titulo, ids, aoVoltar }: { titulo: string; ids: string[]; aoVoltar: () => void }) {
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>(CHAVE_RESPONDIDAS, {})
  const { iniciarComAviso } = usarSessao()
  const [soErradas, definirSoErradas] = useState(false)
  const ordem = useMemo(() => {
    const errou = (id: string) => respondidas[id] && respondidas[id].c === false
    const base = soErradas ? ids.filter(errou) : ids
    // fixa a ordem na abertura: responder uma questão não a tira do lugar
    return [...base.filter((id) => !respondidas[id]), ...base.filter((id) => respondidas[id])]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, soErradas])
  const [posicao, definirPosicao] = useState(0)
  const id = ordem[Math.min(posicao, ordem.length - 1)]
  const feitas = ids.filter((i) => respondidas[i]).length
  const certas = ids.filter((i) => respondidas[i]?.c === true).length
  const erradas = feitas - certas

  async function sessaoCompleta() {
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, areas: AREAS_TREINO }, ordem, {}))) return
    navegar('/sessao')
  }

  return (
    <div className="at-questoes">
      <header className="at-questoes__topo">
        <button type="button" className="at-botao-icone" onClick={aoVoltar} aria-label="Voltar à ficha"><Icone nome="esquerda" tamanho={18} /></button>
        <div className="at-questoes__titulo"><strong>{titulo}</strong><small>{feitas} de {ids.length} respondidas · {certas} certas</small></div>
      </header>
      <div className="at-questoes__barra">
        <div className="at-segmentos" role="group" aria-label="Quais questões">
          <button type="button" aria-pressed={!soErradas} onClick={() => { definirSoErradas(false); definirPosicao(0) }}>Todas ({ids.length})</button>
          <button type="button" aria-pressed={soErradas} disabled={!erradas} onClick={() => { definirSoErradas(true); definirPosicao(0) }}>Só as que errei ({erradas})</button>
        </div>
        <button type="button" className="at-link" onClick={sessaoCompleta}><Icone nome="tocar" tamanho={15} /> Sessão completa</button>
      </div>
      {id ? (
        <>
          <div className="at-questoes__corpo">
            <Suspense fallback={<Carregando linhas={5} />}><QuestaoDireta key={id} id={id} /></Suspense>
          </div>
          <footer className="at-questoes__rodape">
            <button type="button" className="botao" disabled={posicao === 0} onClick={() => definirPosicao((p) => p - 1)}><Icone nome="esquerda" tamanho={16} /> Anterior</button>
            <span>{Math.min(posicao, ordem.length - 1) + 1} de {ordem.length}</span>
            <button type="button" className="botao botao--principal" disabled={posicao >= ordem.length - 1} onClick={() => definirPosicao((p) => p + 1)}>Próxima <Icone nome="direita" tamanho={16} /></button>
          </footer>
        </>
      ) : <p className="at-vazio">Nenhuma questão nesta lista.</p>}
    </div>
  )
}

import { useMemo, useState } from 'react'
import type { EstadoSessao, Indice } from '../../dados/tipos'
import { FILTROS_VAZIOS } from '../../dados/tipos'
import { errosAnteriores, sortearErrosAnteriores, tamanhosRevisao } from '../../dados/errosPosSessao'
import { entraNoPlano, incluiSimulados, indiceDoPlano, type PlanoSalvo } from '../../dados/planoEstudo'
import { formatarTempo, minutosPorQuestao } from '../../dados/hubCronograma'
import { lerHistorico, lerRespondidas, usarSessao } from '../../estado/sessao'
import { ler } from '../../estado/armazenamento'
import type { RegistroQuestao } from '../../estado/revisao'
import { href, navegar } from '../../util/rotas'
import { Icone } from '../Icone'

type Registros = Record<string, RegistroQuestao>

const MECANISMO = 'Refazer um erro em outro dia ajuda você a testar se lembra do raciocínio. A sessão mistura assuntos e datas, e cada resposta atualiza sua próxima revisão.'

export function ErrosAposSessao({ indice, plano, sessao, registros }: {
  indice: Indice; plano: PlanoSalvo | null | undefined; sessao: EstadoSessao; registros: Registros
}) {
  const { iniciarComAviso } = usarSessao()
  const [abrindo, definirAbrindo] = useState(false)
  const [aviso, definirAviso] = useState('')
  const acervo = useMemo(() => {
    if (sessao.filtros.areas?.includes('mao')) return { ...indice, questoes: indice.questoes.filter((q) => q.ar === 'mao') }
    if (sessao.origem !== 'cronograma' || !plano) return indice
    const recorte = indiceDoPlano(indice, plano)
    return { ...recorte, questoes: recorte.questoes.filter((q) => entraNoPlano(q, incluiSimulados(plano))) }
  }, [indice, plano, sessao.filtros.areas, sessao.origem])
  const excluir = useMemo(() => new Set(sessao.ids), [sessao.ids])
  const erros = useMemo(() => errosAnteriores(acervo, registros, excluir), [acervo, registros, excluir])
  const minutos = useMemo(() => minutosPorQuestao(lerHistorico()), [sessao.id])
  const opcoes = tamanhosRevisao(erros.length)

  async function iniciar(proporcao: number, teto: number) {
    if (abrindo) return
    definirAbrindo(true)
    definirAviso('')
    try {
      const atuais = lerRespondidas()
      const disponiveis = errosAnteriores(acervo, atuais, excluir)
      const proxima = Math.min(teto, Math.ceil(disponiveis.length * proporcao))
      const ids = sortearErrosAnteriores(disponiveis, proxima)
      if (!ids.length) {
        definirAviso('Sua fila mudou. Os erros disponíveis já foram revisados.')
        return
      }
      if (ids.length !== Math.min(teto, Math.ceil(erros.length * proporcao))) {
        definirAviso('Sua fila foi atualizada. Confira a nova quantidade antes de começar.')
        return
      }
      const antes = Object.fromEntries(ids.map((id) => {
        const r = atuais[id]
        return [id, { c: r.c, q: r.q, sequencia: r.sequencia ?? 0, proximaRevisao: r.proximaRevisao ?? null, confianca: r.confianca ?? 'seguro' }]
      }))
      const filtros = { ...FILTROS_VAZIOS, situacao: 'erradas' as const, limite: ids.length, embaralhar: false }
      if (await iniciarComAviso(filtros, ids, { origem: 'revisao', revisao: { recuperacaoAtiva: ler('revisao:recuperacao-ativa', false), antes } })) navegar('/sessao')
    } finally {
      definirAbrindo(false)
    }
  }

  return <section className="dp-cartao rr-refaca nao-imprime" aria-labelledby="rr-refaca-titulo">
    <header className="rr-refaca__cabeca">
      <span className="rr-refaca__icone" aria-hidden="true"><Icone nome="reiniciar" tamanho={22} /></span>
      <div>
        <h3 id="rr-refaca-titulo">Refaça erros anteriores</h3>
        <p>{MECANISMO}</p>
      </div>
    </header>
    {erros.length > 0 ? <>
      <p className="rr-refaca__fila">{erros.length === 1 ? '1 erro anterior disponível' : `${erros.length} erros anteriores disponíveis`}</p>
      <div role="group" className="rr-refaca__opcoes" aria-label="Intensidade da revisão">
        {opcoes.map((nivel) => <button key={nivel.id} type="button" className="rr-refaca__opcao" data-intensidade={nivel.id} disabled={abrindo}
          aria-label={`Revisão ${nivel.nome.toLowerCase()}, ${nivel.quantidade} ${nivel.quantidade === 1 ? 'questão' : 'questões'}`}
          onClick={() => { void iniciar(nivel.proporcao, nivel.teto) }}>
          <span className="rr-refaca__nivel"><strong>{nivel.nome}</strong><span className="rr-refaca__medidor" aria-hidden="true"><i /><i /><i /></span></span>
          <span className="rr-refaca__contagem"><b>{nivel.quantidade}</b> {nivel.quantidade === 1 ? 'questão' : 'questões'}</span>
          <small><Icone nome="relogio" tamanho={14} /> cerca de {formatarTempo(nivel.quantidade * minutos)}</small>
        </button>)}
      </div>
      <footer className="rr-refaca__rodape"><small>As alternativas seguem a opção “Revisão em ordem nova” do treino.</small><a href={href('/')}>Encerrar por hoje</a></footer>
    </> : <p className="rr-refaca__fila" role="status">Sua fila de erros anteriores está em dia.</p>}
    {aviso && <p className="rr-refaca__fila" role="status">{aviso}</p>}
  </section>
}

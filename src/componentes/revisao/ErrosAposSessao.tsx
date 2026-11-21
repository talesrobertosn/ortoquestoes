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

export function ErrosAposSessao({ indice, plano, sessao, registros, aberto }: {
  indice: Indice; plano: PlanoSalvo | null | undefined; sessao: EstadoSessao; registros: Registros; aberto: boolean
}) {
  const { iniciarComAviso } = usarSessao()
  const [abrindo, definirAbrindo] = useState(false)
  const [aviso, definirAviso] = useState('')
  const [nivel, definirNivel] = useState<'leve' | 'moderada' | 'agressiva'>('leve')
  const acervo = useMemo(() => {
    if (sessao.filtros.areas?.includes('mao')) return { ...indice, questoes: indice.questoes.filter((q) => q.ar === 'mao') }
    if (sessao.origem !== 'cronograma' || !plano) return indice
    const recorte = indiceDoPlano(indice, plano)
    return { ...recorte, questoes: recorte.questoes.filter((q) => entraNoPlano(q, incluiSimulados(plano))) }
  }, [indice, plano, sessao.filtros.areas, sessao.origem])
  const excluir = useMemo(() => new Set(sessao.ids), [sessao.ids])
  const erros = useMemo(() => errosAnteriores(acervo, registros, excluir), [acervo, registros, excluir])
  const minutos = useMemo(() => minutosPorQuestao(lerHistorico()), [sessao.id])
  const opcoes = tamanhosRevisao(erros.length).filter((opcao, posicao, todas) =>
    todas.findIndex((outra) => outra.quantidade === opcao.quantidade) === posicao)
  const escolhida = opcoes.find((opcao) => opcao.id === nivel) ?? opcoes[0]

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
    {escolhida?.quantidade ? <details open={aberto}>
      <summary>{erros.length === 1 ? 'Escolher revisão · 1 erro disponível' : `Escolher revisão · ${erros.length} erros disponíveis`}</summary>
      {opcoes.length > 1 && <fieldset className="rr-refaca__opcoes">
        <legend className="so-leitor">Intensidade da revisão de erros anteriores</legend>
        {opcoes.map((opcao) => <label key={opcao.id} className="rr-refaca__opcao">
          <span className="rr-refaca__nivel"><input type="radio" name="revisao-erros-anteriores" checked={escolhida.id === opcao.id}
            onChange={() => definirNivel(opcao.id)} disabled={abrindo} /><strong>{opcao.nome}</strong></span>
          <span className="rr-refaca__contagem"><b>{opcao.quantidade}</b> {opcao.quantidade === 1 ? 'questão' : 'questões'}</span>
          <small><Icone nome="relogio" tamanho={14} /> cerca de {formatarTempo(opcao.quantidade * minutos)}</small>
        </label>)}
      </fieldset>}
      <div className="rr-refaca__rodape">
        <button type="button" className="dp-botao" disabled={abrindo} onClick={() => { void iniciar(escolhida.proporcao, escolhida.teto) }}>
          <Icone nome="reiniciar" tamanho={16} />
          {abrindo ? 'Montando revisão…' : `Revisar ${escolhida.quantidade} ${escolhida.quantidade === 1 ? 'erro anterior' : 'erros anteriores'}`}
        </button>
        {opcoes.length === 1 && <small>Cerca de {formatarTempo(escolhida.quantidade * minutos)}</small>}
        <a href={href('/')}>Encerrar por hoje</a>
      </div>
      <p className="rr-refaca__fila">As alternativas seguem a opção “Revisão em ordem nova” do treino.</p>
    </details> : <p className="rr-refaca__fila" role="status">Sua fila de erros anteriores está em dia.</p>}
    {aviso && <p className="rr-refaca__fila" role="status">{aviso}</p>}
  </section>
}

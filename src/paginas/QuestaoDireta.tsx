import { useEffect, useRef, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestao } from '../dados/acervo'
import type { Letra, Questao, Resposta } from '../dados/tipos'
import { CartaoQuestao } from '../componentes/CartaoQuestao'
import { PortaoConta } from '../componentes/PortaoConta'
import { Carregando, Estado } from '../componentes/Estados'
import { usarConta } from '../conta/ContextoConta'
import { lerRespondidas, registrarResposta, usarFavoritos } from '../estado/sessao'
import type { RegistroQuestao } from '../estado/revisao'
import { inicioDoDia } from '../util/dia'
import { erroDeConexao, usarLimiteDiario } from '../estado/limiteDiario'
import { AvisoLimite, PainelLimite } from '../componentes/LimiteRespostas'
import { href } from '../util/rotas'
import { gerarId } from '../util/id'
import { CHAVE_SESSAO } from '../estado/sessao'
import { ler } from '../estado/armazenamento'
import type { EstadoSessao } from '../dados/tipos'
import { edicaoEmDestaque } from '../dados/nacionalEmDestaque'
import { snIniciar } from '../dados/apiSimuladoNacional'

const TOLERANCIA_MS = 5 * 60_000

/**
 * A questão está numa prova do Simulado Nacional que a pessoa tem aberta (neste
 * aparelho ou em outro)? Enquanto confere, o cartão não aparece: o gabarito e o
 * comentário não podem piscar na tela. Sem resposta em 5 s, libera.
 */
function usarProvaComEstaQuestao(id: string, logado: boolean): 'conferindo' | 'livre' | 'em-prova' {
  const [estado, definirEstado] = useState<'conferindo' | 'livre' | 'em-prova'>('conferindo')
  useEffect(() => {
    let vivo = true
    const local = ler<EstadoSessao | null>(CHAVE_SESSAO, null)
    const aberta = (prazo: number) => !prazo || Date.now() < prazo + TOLERANCIA_MS
    if (local?.nacional && !local.concluidaEm && local.ids.includes(id) && aberta(local.prazoEm ?? 0)) { definirEstado('em-prova'); return }
    if (!logado) { definirEstado('livre'); return }
    definirEstado('conferindo')
    const prazo = window.setTimeout(() => { if (vivo) definirEstado('livre') }, 5000)
    edicaoEmDestaque(true)
      .then(async (ed) => {
        // Só pergunta os itens a quem já começou (sn_iniciar retoma; nunca começa uma prova daqui).
        if (!ed?.edicao || !ed.minha || ed.minha.entregue_em || !aberta(Date.parse(ed.minha.prazo_em))) return false
        const inicio = await snIniciar(ed.edicao)
        return inicio.itens.some((i) => i.id_questao === id)
      })
      .catch(() => false)
      .then((naProva) => { if (vivo) { window.clearTimeout(prazo); definirEstado(naProva ? 'em-prova' : 'livre') } })
    return () => { vivo = false; window.clearTimeout(prazo) }
  }, [id, logado])
  return estado
}

/** Link direto para uma questão: responde ali mesmo, sem abrir sessão. */
export function QuestaoDireta({ id }: { id: string }) {
  const { indice } = usarIndice()
  const { sessao: conta } = usarConta()
  const [questao, definirQuestao] = useState<Questao | null | undefined>(undefined)
  const [resposta, definirResposta] = useState<Resposta | undefined>()
  const [riscadas, definirRiscadas] = useState<Letra[]>([])
  const [portaoContaAberto, definirPortaoContaAberto] = useState(false)
  const { favoritos, alternar } = usarFavoritos()
  const { estado: estadoLimite, autorizar } = usarLimiteDiario()
  const [limiteAberto, definirLimiteAberto] = useState(false)
  const chaveResposta = useRef<string | null>(null)
  const autorizando = useRef(false)
  const prova = usarProvaComEstaQuestao(id, !!conta)

  useEffect(() => {
    if (!indice) return
    let vivo = true
    definirQuestao(undefined)
    definirResposta(undefined)
    definirRiscadas([])
    chaveResposta.current = null
    carregarQuestao(indice, id).then((q) => {
      if (!vivo) return
      definirQuestao(q)
      // Recarregar a página não apaga a resposta de hoje: o cartão mostra a que
      // já foi registrada, sem pedir (nem autorizar e registrar) de novo.
      if (q) definirResposta(respostaRegistradaHoje(q, lerRespondidas()[q.id]))
    })
    return () => {
      vivo = false
    }
  }, [indice, id])

  if (questao === undefined || prova === 'conferindo') return <Carregando linhas={6} />

  if (prova === 'em-prova') {
    return (
      <Estado
        titulo="Esta questão está num simulado em andamento."
        acoes={<>
          <a className="botao botao--principal" href={href('/sessao')}>Voltar para a prova</a>
          <a className="botao" href={href('/simulado-nacional')}>Ver o Simulado Nacional</a>
        </>}
      >
        <p>Ela faz parte da prova do Simulado Nacional que você está fazendo. O gabarito e o comentário aparecem na correção, logo depois de entregar.</p>
      </Estado>
    )
  }

  if (questao === null) {
    return (
      <Estado
        titulo="Questão não encontrada."
        acoes={
          <>
            <a className="botao botao--principal" href={href('/treinar')}>
              Montar uma sessão
            </a>
            <a className="botao" href={href('/contato')}>
              Avisar sobre o link quebrado
            </a>
          </>
        }
      >
        <p>
          O identificador <span className="numerico">{id}</span> não existe no acervo. Ele pode ter
          mudado em uma atualização.
        </p>
      </Estado>
    )
  }

  return (
    <>
      <AvisoLimite estado={estadoLimite} />
      <CartaoQuestao
        questao={questao}
        resposta={resposta}
        riscadas={riscadas}
        favorita={favoritos.includes(questao.id)}
        marcadaRevisao={false}
        aoResponder={async (escolhida, correta, segundos, confianca) => {
          if (!conta) { definirPortaoContaAberto(true); return }
          if (autorizando.current) return
          autorizando.current = true
          try {
            chaveResposta.current ??= gerarId()
            const permissao = await autorizar(questao.id, chaveResposta.current)
            if (permissao.falhaValidacao) throw erroDeConexao()
            if (!permissao.permitido) { definirLimiteAberto(true); return }
            definirResposta({ escolhida, correta, segundos, confianca })
            registrarResposta(questao.id, correta, confianca, escolhida)
          } finally { autorizando.current = false }
        }}
        aoRiscar={(letra) =>
          definirRiscadas((atuais) =>
            atuais.includes(letra) ? atuais.filter((l) => l !== letra) : [...atuais, letra],
          )
        }
        aoFavoritar={() => alternar(questao.id)}
        aoRevisar={() => undefined}
      />
      <div className="linha nao-imprime" style={{ marginTop: '1.25rem' }}>
        <a className="botao botao--principal" href={href(`/treinar?temas=${slugDoId(questao.id)}`)}>
          Treinar este tema
        </a>
        <a className="botao" href={href('/treinar')}>
          Montar outra sessão
        </a>
      </div>

      <PortaoConta aberto={portaoContaAberto} aoFechar={() => definirPortaoContaAberto(false)} />
      <PainelLimite estado={estadoLimite} aberto={limiteAberto} aoFechar={() => definirLimiteAberto(false)} />
    </>
  )
}

/** A resposta registrada hoje (dia de São Paulo) para esta questão, no formato do cartão. */
function respostaRegistradaHoje(questao: Questao, registro: RegistroQuestao | undefined): Resposta | undefined {
  if (!registro || !Number.isFinite(registro.q) || registro.q < inicioDoDia()) return undefined
  const dissertativa = questao.tipo === 'dissertativa'
  const letra = questao.alternativas.find((a) => a.letra === registro.m)?.letra
  // Registro antigo sem a letra marcada: sem como mostrar o que foi escolhido.
  if (!dissertativa && !letra) return undefined
  return { escolhida: dissertativa ? null : letra!, correta: registro.c, segundos: 0, confianca: registro.confianca }
}

function slugDoId(id: string): string {
  return id.replace(/-\d+$/, '')
}

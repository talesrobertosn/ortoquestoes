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

  if (questao === undefined) return <Carregando linhas={6} />

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

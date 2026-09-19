import { useEffect, useRef, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestao } from '../dados/acervo'
import type { Letra, Questao, Resposta } from '../dados/tipos'
import { CartaoQuestao } from '../componentes/CartaoQuestao'
import { Carregando, Estado } from '../componentes/Estados'
import { registrarResposta, usarFavoritos } from '../estado/sessao'
import { href } from '../util/rotas'
import { usarLimiteDiario } from '../estado/limiteDiario'
import { AvisoLimite, PainelLimite } from '../componentes/LimiteRespostas'

/** Link direto para uma questão: responde ali mesmo, sem abrir sessão. */
export function QuestaoDireta({ id }: { id: string }) {
  const { indice } = usarIndice()
  const [questao, definirQuestao] = useState<Questao | null | undefined>(undefined)
  const [resposta, definirResposta] = useState<Resposta | undefined>()
  const [riscadas, definirRiscadas] = useState<Letra[]>([])
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
    carregarQuestao(indice, id).then((q) => vivo && definirQuestao(q))
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
        aoResponder={async (escolhida, correta, segundos) => {
          if (autorizando.current) return
          autorizando.current = true
          chaveResposta.current ??= crypto.randomUUID()
          const permissao = await autorizar(questao.id, chaveResposta.current)
          autorizando.current = false
          if (!permissao.permitido) { definirLimiteAberto(true); return }
          definirResposta({ escolhida, correta, segundos })
          registrarResposta(questao.id, correta)
        }}
        aoRiscar={(letra) =>
          definirRiscadas((atuais) =>
            atuais.includes(letra) ? atuais.filter((l) => l !== letra) : [...atuais, letra],
          )
        }
        aoFavoritar={() => alternar(questao.id)}
        aoRevisar={() => undefined}
      />
      <PainelLimite estado={estadoLimite} aberto={limiteAberto} aoFechar={() => definirLimiteAberto(false)} />
      <div className="linha nao-imprime" style={{ marginTop: '1.25rem' }}>
        <a className="botao botao--principal" href={href(`/treinar?temas=${slugDoId(questao.id)}`)}>
          Treinar este tema
        </a>
        <a className="botao" href={href('/treinar')}>
          Montar outra sessão
        </a>
      </div>
    </>
  )
}

function slugDoId(id: string): string {
  return id.replace(/-\d+$/, '')
}

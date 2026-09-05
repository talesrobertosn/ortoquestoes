import { useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestoes } from '../dados/acervo'
import type { Questao } from '../dados/tipos'
import { CartaoQuestao } from '../componentes/CartaoQuestao'
import { MapaQuestoes } from '../componentes/MapaQuestoes'
import { Painel } from '../componentes/Painel'
import { Atalhos } from '../componentes/Atalhos'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { usarFavoritos, usarSessao } from '../estado/sessao'
import { href, navegar } from '../util/rotas'

export function Sessao() {
  const { indice } = usarIndice()
  const { sessao, responder, irPara, alternarRevisar, alternarRiscada, finalizar } = usarSessao()
  const { favoritos, alternar: alternarFavorito } = usarFavoritos()
  const [questoes, definirQuestoes] = useState<Questao[] | null>(null)
  const [mapaAberto, definirMapaAberto] = useState(false)
  const [atalhosAbertos, definirAtalhosAbertos] = useState(false)
  const [erro, definirErro] = useState<string | null>(null)

  const ids = sessao?.ids
  useEffect(() => {
    if (!indice || !ids) return
    let vivo = true
    carregarQuestoes(indice, ids)
      .then((lista) => vivo && definirQuestoes(lista))
      .catch((e) => vivo && definirErro(String(e)))
    return () => {
      vivo = false
    }
  }, [indice, ids])

  const total = sessao?.ids.length ?? 0
  const posicao = Math.min(sessao?.posicao ?? 0, Math.max(0, total - 1))
  const questaoAtual = useMemo(() => {
    if (!questoes || !sessao) return null
    const id = sessao.ids[posicao]
    return questoes.find((q) => q.id === id) ?? null
  }, [questoes, sessao, posicao])

  const respondidas = sessao ? Object.keys(sessao.respostas).length : 0
  const painelAberto = mapaAberto || atalhosAbertos

  useEffect(() => {
    if (!sessao || painelAberto) return
    function aoTeclar(evento: KeyboardEvent) {
      const alvo = evento.target as HTMLElement | null
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return
      const tecla = evento.key.toLowerCase()
      if (evento.key === 'ArrowRight' || tecla === 'n') {
        evento.preventDefault()
        irPara(posicao + 1)
      } else if (evento.key === 'ArrowLeft' || tecla === 'p') {
        evento.preventDefault()
        irPara(posicao - 1)
      } else if (tecla === 'm') {
        evento.preventDefault()
        definirMapaAberto(true)
      } else if (evento.key === '?') {
        evento.preventDefault()
        definirAtalhosAbertos(true)
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [sessao, posicao, irPara, painelAberto])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [posicao])

  if (!sessao || total === 0) {
    return (
      <Estado
        titulo="Não há sessão em andamento."
        acoes={
          <a className="botao botao--principal" href={href('/treinar')}>
            Montar uma sessão
          </a>
        }
      >
        <p>Escolha os filtros na tela de montagem e a sessão começa na mesma hora.</p>
      </Estado>
    )
  }

  if (erro) {
    return (
      <Estado
        titulo="As questões desta sessão não puderam ser carregadas."
        acoes={
          <>
            <button className="botao" type="button" onClick={() => window.location.reload()}>
              Tentar de novo
            </button>
            <a className="botao" href={href('/treinar')}>
              Montar outra sessão
            </a>
          </>
        }
      >
        <p>Verifique a conexão. Nada do seu progresso foi perdido.</p>
      </Estado>
    )
  }

  if (!questoes) return <Carregando linhas={7} />

  const proximaNaoRespondida = sessao.ids.findIndex(
    (id, i) => i > posicao && !sessao.respostas[id],
  )

  function avancar() {
    if (posicao + 1 < total) irPara(posicao + 1)
    else concluir()
  }

  function concluir() {
    finalizar()
    navegar('/resumo')
  }

  return (
    <>
      <div className="barra-sessao nao-imprime">
        <div className="conteudo barra-sessao__interno">
          <span className="barra-sessao__texto">
            {respondidas} de {total}
          </span>
          <div
            className="progresso"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={respondidas}
            aria-label="Questões respondidas"
          >
            <div
              className="progresso__preenchido"
              style={{ width: `${total ? (respondidas / total) * 100 : 0}%` }}
            />
          </div>
          <button
            type="button"
            className="botao"
            onClick={() => definirMapaAberto(true)}
            style={{ minHeight: 36 }}
          >
            <Icone nome="mapa" tamanho={16} />
            Mapa
          </button>
          <button
            type="button"
            className="botao-icone"
            onClick={() => definirAtalhosAbertos(true)}
            aria-label="Ver atalhos de teclado"
            title="Atalhos (?)"
          >
            <Icone nome="teclado" />
          </button>
        </div>
      </div>

      {questaoAtual ? (
        <CartaoQuestao
          questao={questaoAtual}
          numero={posicao + 1}
          total={total}
          resposta={sessao.respostas[questaoAtual.id]}
          riscadas={sessao.riscadas[questaoAtual.id] ?? []}
          favorita={favoritos.includes(questaoAtual.id)}
          marcadaRevisao={sessao.revisar.includes(questaoAtual.id)}
          aoResponder={(letra, correta, segundos) =>
            responder(questaoAtual.id, letra, correta, segundos)
          }
          aoRiscar={(letra) => alternarRiscada(questaoAtual.id, letra)}
          aoFavoritar={() => alternarFavorito(questaoAtual.id)}
          aoRevisar={() => alternarRevisar(questaoAtual.id)}
          aoAvancar={avancar}
          atalhosAtivos={!painelAberto}
        />
      ) : (
        <Estado titulo="Esta questão saiu do acervo.">
          <p>Ela foi removida ou renomeada em uma atualização. Siga para a próxima.</p>
        </Estado>
      )}

      <nav className="entre nao-imprime" style={{ marginTop: '1.25rem' }} aria-label="Navegação da sessão">
        <button
          type="button"
          className="botao"
          onClick={() => irPara(posicao - 1)}
          disabled={posicao === 0}
        >
          <Icone nome="esquerda" tamanho={16} />
          Anterior
        </button>

        <div className="linha">
          {proximaNaoRespondida > -1 && (
            <button
              type="button"
              className="botao botao--fantasma"
              onClick={() => irPara(proximaNaoRespondida)}
            >
              Próxima não respondida
            </button>
          )}
          <button type="button" className="botao" onClick={concluir}>
            Encerrar e ver resumo
          </button>
          <button
            type="button"
            className="botao botao--principal"
            onClick={avancar}
            disabled={posicao + 1 >= total && respondidas === 0}
          >
            {posicao + 1 < total ? 'Próxima' : 'Concluir'}
            <Icone nome="direita" tamanho={16} />
          </button>
        </div>
      </nav>

      <Painel
        titulo="Mapa de questões"
        aberto={mapaAberto}
        aoFechar={() => definirMapaAberto(false)}
      >
        <p className="meta" style={{ marginBottom: '0.75rem' }}>
          {respondidas} de {total} respondidas
        </p>
        <MapaQuestoes
          ids={sessao.ids}
          respostas={sessao.respostas}
          revisar={sessao.revisar}
          posicao={posicao}
          aoEscolher={(i) => {
            irPara(i)
            definirMapaAberto(false)
          }}
        />
      </Painel>

      <Painel
        titulo="Atalhos de teclado"
        aberto={atalhosAbertos}
        aoFechar={() => definirAtalhosAbertos(false)}
      >
        <Atalhos />
      </Painel>
    </>
  )
}

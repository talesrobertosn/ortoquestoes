import { useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestoes } from '../dados/acervo'
import type { Questao } from '../dados/tipos'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { descreverFiltros, usarSessao } from '../estado/sessao'
import { formatarDuracao } from '../dados/tipos'
import { href, navegar } from '../util/rotas'

export function Resumo() {
  const { indice } = usarIndice()
  const { sessao, iniciar, encerrar } = usarSessao()
  const [questoes, definirQuestoes] = useState<Questao[] | null>(null)

  const ids = sessao?.ids
  useEffect(() => {
    if (!indice || !ids) return
    let vivo = true
    carregarQuestoes(indice, ids).then((lista) => vivo && definirQuestoes(lista))
    return () => {
      vivo = false
    }
  }, [indice, ids])

  const dados = useMemo(() => {
    if (!sessao || !questoes) return null
    const porId = new Map(questoes.map((q) => [q.id, q]))
    const respondidas = sessao.ids
      .map((id) => ({ id, questao: porId.get(id), resposta: sessao.respostas[id] }))
      .filter((linha) => linha.resposta && linha.questao)

    const validas = respondidas.filter((l) => l.resposta!.correta !== null)
    const acertos = validas.filter((l) => l.resposta!.correta === true).length
    const segundos = respondidas.reduce((soma, l) => soma + l.resposta!.segundos, 0)

    const porTema = new Map<string, { certas: number; total: number }>()
    for (const linha of validas) {
      const tema = linha.questao!.tema
      const atual = porTema.get(tema) ?? { certas: 0, total: 0 }
      atual.total++
      if (linha.resposta!.correta) atual.certas++
      porTema.set(tema, atual)
    }

    return {
      respondidas,
      validas,
      acertos,
      segundos,
      erradas: validas.filter((l) => l.resposta!.correta === false),
      porTema: [...porTema.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')),
    }
  }, [sessao, questoes])

  if (!sessao) {
    return (
      <Estado
        titulo="Nenhuma sessão para resumir."
        acoes={
          <a className="botao botao--principal" href={href('/treinar')}>
            Montar uma sessão
          </a>
        }
      >
        <p>O resumo aparece quando você encerra uma sessão.</p>
      </Estado>
    )
  }

  if (!dados) return <Carregando linhas={5} rotulo="Montando o resumo" />

  const percentual =
    dados.validas.length > 0 ? Math.round((dados.acertos / dados.validas.length) * 100) : null
  const mediaSegundos =
    dados.respondidas.length > 0 ? Math.round(dados.segundos / dados.respondidas.length) : 0

  function refazerErradas() {
    if (!indice || dados!.erradas.length === 0) return
    const idsErradas = dados!.erradas.map((l) => l.id)
    iniciar({ ...sessao!.filtros, embaralhar: false, limite: null }, idsErradas)
    navegar('/sessao')
  }

  function exportar() {
    const linhas = [
      `OrtoQuestões — resumo de sessão`,
      `Filtro: ${descreverFiltros(sessao!.filtros)}`,
      `Data: ${new Date(sessao!.concluidaEm ?? Date.now()).toLocaleString('pt-BR')}`,
      `Respondidas: ${dados!.respondidas.length} de ${sessao!.ids.length}`,
      `Acerto: ${percentual === null ? '—' : percentual + '%'}`,
      `Tempo médio: ${mediaSegundos}s por questão`,
      '',
      'id;tema;ano;prova;marcada;gabarito;resultado',
      ...dados!.respondidas.map((l) =>
        [
          l.id,
          l.questao!.tema,
          l.questao!.ano ?? '',
          l.questao!.prova ?? '',
          l.resposta!.escolhida,
          l.questao!.gabarito ?? '',
          l.resposta!.correta === null ? 'nao-contabilizada' : l.resposta!.correta ? 'certa' : 'errada',
        ].join(';'),
      ),
    ].join('\n')

    const blob = new Blob([linhas], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ortoquestoes-sessao-${sessao!.id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="empilha-2">
      <header className="limite-leitura">
        <h1>{sessao.simulado ? 'Resultado do simulado' : 'Resumo da sessão'}</h1>
        <p className="texto-2" style={{ marginTop: '0.5rem' }}>
          {descreverFiltros(sessao.filtros)}
          {sessao.simulado && sessao.limiteSegundos ? (
            <>
              {' · '}
              {formatarDuracao(sessao.limiteSegundos)} de prova, usados{' '}
              {formatarDuracao(
                Math.round(((sessao.concluidaEm ?? Date.now()) - sessao.criadaEm) / 1000),
              )}
              {(sessao.concluidaEm ?? Date.now()) - sessao.criadaEm >=
              sessao.limiteSegundos * 1000
                ? ' — tempo esgotado'
                : ''}
            </>
          ) : null}
        </p>
      </header>

      <section className="numeros" aria-label="Desempenho">
        <div className="numeros__celula">
          <span className="numeros__valor">{percentual === null ? '—' : `${percentual}%`}</span>
          <span className="numeros__rotulo">de acerto</span>
        </div>
        <div className="numeros__celula">
          <span className="numeros__valor">
            {dados.acertos}/{dados.validas.length}
          </span>
          <span className="numeros__rotulo">questões contabilizadas</span>
        </div>
        <div className="numeros__celula">
          <span className="numeros__valor">{mediaSegundos}s</span>
          <span className="numeros__rotulo">por questão, em média</span>
        </div>
        <div className="numeros__celula">
          <span className="numeros__valor">
            {dados.respondidas.length}/{sessao.ids.length}
          </span>
          <span className="numeros__rotulo">respondidas</span>
        </div>
      </section>

      <div className="linha nao-imprime">
        <button
          type="button"
          className="botao botao--principal"
          onClick={refazerErradas}
          disabled={dados.erradas.length === 0}
        >
          <Icone nome="reiniciar" tamanho={16} />
          Refazer só as {dados.erradas.length} erradas
        </button>
        <button type="button" className="botao" onClick={exportar}>
          <Icone nome="baixar" tamanho={16} />
          Exportar em CSV
        </button>
        <button type="button" className="botao" onClick={() => window.print()}>
          <Icone nome="impressora" tamanho={16} />
          Imprimir
        </button>
        <a
          className="botao"
          href={href('/treinar')}
          onClick={() => encerrar()}
        >
          Nova sessão
        </a>
      </div>

      {dados.porTema.length > 0 && (
        <section>
          <h2>Por tema</h2>
          <div className="rolagem-x" style={{ marginTop: '0.75rem' }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Tema</th>
                  <th scope="col" className="numerico">Certas</th>
                  <th scope="col" className="numerico">Total</th>
                  <th scope="col" className="numerico">Acerto</th>
                </tr>
              </thead>
              <tbody>
                {dados.porTema.map(([tema, valores]) => (
                  <tr key={tema}>
                    <td>{tema}</td>
                    <td className="numerico">{valores.certas}</td>
                    <td className="numerico">{valores.total}</td>
                    <td className="numerico">
                      {Math.round((valores.certas / valores.total) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2>Questões erradas</h2>
        {dados.erradas.length === 0 ? (
          <p className="texto-2" style={{ marginTop: '0.5rem' }}>
            Nenhuma errada nesta sessão.
          </p>
        ) : (
          <ul className="distribuicao" style={{ marginTop: '0.75rem' }}>
            {dados.erradas.map((linha) => (
              <li className="distribuicao__item" key={linha.id}>
                <a className="distribuicao__link" href={href(`/questao/${linha.id}`)}>
                  <span>
                    <span className="numerico texto-2">{linha.id}</span> ·{' '}
                    {linha.questao!.enunciado.slice(0, 110)}
                    {linha.questao!.enunciado.length > 110 ? '…' : ''}
                  </span>
                  <span className="distribuicao__quantidade">
                    marcou {linha.resposta!.escolhida} · gabarito {linha.questao!.gabarito}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

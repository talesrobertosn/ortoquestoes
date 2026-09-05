import { useMemo } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { contar } from '../dados/acervo'
import { FILTROS_VAZIOS } from '../dados/tipos'
import { href } from '../util/rotas'
import { Carregando, Estado } from '../componentes/Estados'
import { lerHistorico } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'

export function Inicio() {
  const { indice, carregando } = usarIndice()
  const [sessao] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)

  const contagens = useMemo(
    () => (indice ? contar(indice, FILTROS_VAZIOS) : null),
    [indice],
  )
  const historico = useMemo(() => lerHistorico(), [])

  const anos = indice?.anos ?? []
  const anosRecentes = [...anos].sort((a, b) => b - a).slice(0, 6)
  const maiorTema = contagens
    ? Math.max(1, ...Object.values(contagens.porTema))
    : 1

  const sessaoEmAndamento =
    sessao && !sessao.concluidaEm && Object.keys(sessao.respostas).length < sessao.ids.length

  return (
    <div className="empilha-2">
      <section className="heroi">
        <h1>Treine para o TEOT e o TARO.</h1>
        <p className="heroi__linha">
          {indice && indice.total > 0 ? (
            <>
              <strong className="numerico">{indice.total}</strong> questões de provas anteriores,
              organizadas por assunto. Você filtra, responde e vê seu desempenho na hora.
            </>
          ) : (
            <>Questões de provas anteriores, organizadas por assunto, para responder e medir o seu
              desempenho.</>
          )}
        </p>
        <p className="heroi__nota">Sem cadastro, sem custo, sem rastreadores.</p>
      </section>

      {carregando && <Carregando linhas={3} rotulo="Carregando o acervo" />}

      {indice && contagens && indice.total === 0 && (
        <Estado
          titulo="O acervo ainda está sendo importado."
          acoes={
            <>
              <a className="botao" href={href('/sobre')}>
                Sobre o projeto
              </a>
              <a className="botao" href={href('/contato')}>
                Falar com o autor
              </a>
            </>
          }
        >
          <p>
            As questões chegam por tema, conferidas uma a uma antes de entrar no ar. Assim que o
            primeiro tema for publicado, ele aparece aqui.
          </p>
        </Estado>
      )}

      {indice && contagens && indice.total > 0 && (
        <>
          <div className="linha linha--empilha-celular">
            <a className="botao botao--principal botao--grande" href={href('/treinar')}>
              Começar a responder
            </a>
            {sessaoEmAndamento && (
              <a className="botao botao--grande" href={href('/sessao')}>
                Retomar a última sessão
              </a>
            )}
          </div>

          <section>
            <h2>Por tema</h2>
            <p className="meta" style={{ marginTop: '0.25rem' }}>
              Um clique aqui já monta a sessão do tema inteiro.
            </p>
            <ul className="distribuicao" style={{ marginTop: '0.75rem' }}>
              {indice.temas
                .filter((tema) => (contagens.porTema[tema.slug] ?? 0) > 0)
                .map((tema) => {
                  const quantidade = contagens.porTema[tema.slug] ?? 0
                  return (
                    <li className="distribuicao__item" key={tema.slug}>
                      <a
                        className="distribuicao__link"
                        href={href(`/treinar?temas=${tema.slug}`)}
                      >
                        <span>{tema.nome}</span>
                        <span className="distribuicao__quantidade">{quantidade}</span>
                        <span className="distribuicao__trilho">
                          <span
                            className="distribuicao__parte"
                            style={{ width: `${(quantidade / maiorTema) * 100}%` }}
                          />
                        </span>
                      </a>
                    </li>
                  )
                })}
            </ul>
          </section>

          {anosRecentes.length > 0 && (
            <section>
              <h2>Provas recentes</h2>
              <div className="linha" style={{ marginTop: '0.75rem' }}>
                {anosRecentes.map((ano) => (
                  <a className="botao" key={ano} href={href(`/treinar?anos=${ano}`)}>
                    <span className="numerico">{ano}</span>
                    <span className="texto-2 numerico">{contagens.porAno[ano] ?? 0}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {historico.length > 0 && (
            <section>
              <h2>Suas últimas sessões</h2>
              <div className="rolagem-x" style={{ marginTop: '0.75rem' }}>
                <table className="tabela">
                  <thead>
                    <tr>
                      <th scope="col">Quando</th>
                      <th scope="col">Filtro</th>
                      <th scope="col" className="numerico">
                        Respondidas
                      </th>
                      <th scope="col" className="numerico">
                        Acerto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.slice(0, 5).map((h) => (
                      <tr key={h.id}>
                        <td className="numerico">
                          {new Date(h.concluidaEm).toLocaleDateString('pt-BR')}
                        </td>
                        <td>{h.descricao}</td>
                        <td className="numerico">
                          {h.respondidas}/{h.total}
                        </td>
                        <td className="numerico">
                          {h.respondidas > 0
                            ? `${Math.round((h.acertos / h.respondidas) * 100)}%`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

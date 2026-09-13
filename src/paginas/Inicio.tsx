import { usarContextoLocal } from '../estado/usarContextoLocal'
import { useMemo } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { contar, montarSessao } from '../dados/acervo'
import { FILTROS_VAZIOS } from '../dados/tipos'
import { href, navegar } from '../util/rotas'
import { Carregando, Estado } from '../componentes/Estados'
import { type ResumoHistorico, usarSessao } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { usarConta } from '../conta/ContextoConta'

export function Inicio() {
  const { indice, carregando } = usarIndice()
  const { iniciar } = usarSessao()
  const { sessao: conta } = usarConta()
  const [sessao] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)

  const { contexto } = usarContextoLocal('')
  const contagens = useMemo(
    () => (indice ? contar(indice, FILTROS_VAZIOS, contexto) : null),
    [indice, contexto],
  )
  const [historico] = usarArmazenado<ResumoHistorico[]>('historico', [])

  const anos = indice?.anos ?? []
  const anosRecentes = [...anos].sort((a, b) => b - a).slice(0, 6)
  const maiorTema = contagens
    ? Math.max(1, ...Object.values(contagens.porTema))
    : 1

  /** Treino rÃ¡pido: uma sessÃ£o embaralhada de todo o acervo, num clique. */
  function treinoRapido(quantidade: number) {
    if (!indice) return
    if (sessaoEmAndamento && !window.confirm('Iniciar outro treino substitui a sessÃ£o em andamento. Seu histÃ³rico serÃ¡ mantido. Continuar?')) return
    const filtros = { ...FILTROS_VAZIOS, embaralhar: true, limite: quantidade }
    iniciar(filtros, montarSessao(indice, filtros, Date.now()))
    navegar('/sessao')
  }

  const sessaoEmAndamento =
    sessao && !sessao.concluidaEm && Object.keys(sessao.respostas).length < sessao.ids.length

  const nome = String(conta?.user.user_metadata?.nome ?? '').trim()
  const saudacoes = ['Um passo de cada vez tambÃ©m leva longe.', 'A constÃ¢ncia de hoje vira seguranÃ§a na prova.', 'VocÃª estÃ¡ construindo repertÃ³rio questÃ£o por questÃ£o.']
  const saudacao = saudacoes[new Date().getDate() % saudacoes.length]

  return (
    <div className="empilha-2">
      <section className="heroi">
        <h1>{nome ? `Bem-vindo${conta?.user.user_metadata?.situacao === 'ortopedista' ? '' : ''}, ${conta?.user.user_metadata?.situacao === 'ortopedista' ? 'Dr. ' : ''}${nome}.` : 'Seu prÃ³ximo passo comeÃ§a aqui.'}</h1>
        {nome && <p className="heroi__nota">{saudacao}</p>}
        <div className="heroi__texto">
          <p className="heroi__linha">
            {indice && indice.total > 0 ? (
              <>
                <strong className="numerico">{indice.total}</strong> questÃµes de provas anteriores
                de TEOT, TARO e outras, organizadas por assunto. VocÃª filtra, responde e vÃª seu
                desempenho na hora.
              </>
            ) : (
              <>QuestÃµes de provas anteriores, organizadas por assunto, para responder e medir o
                seu desempenho.</>
            )}
          </p>
        </div>
      </section>

      {carregando && <Carregando linhas={3} rotulo="Carregando o acervo" />}

      {indice && contagens && indice.total === 0 && (
        <Estado
          titulo="O acervo ainda estÃ¡ sendo importado."
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
            As questÃµes chegam por tema, conferidas uma a uma antes de entrar no ar. Assim que o
            primeiro tema for publicado, ele aparece aqui.
          </p>
        </Estado>
      )}

      {indice && contagens && indice.total > 0 && (
        <>
          <section className="painel-diario" aria-label="Seu estudo de hoje">
            <div className="painel-diario__intro">
              <p className="meta">SUA ROTINA DE ESTUDO</p>
              <h2>{sessaoEmAndamento ? 'Continue de onde parou' : 'Um pouco de prÃ¡tica, todos os dias'}</h2>
              <p>Errou? Revise agora. Acertou? Volte em 3, 7, 14 e 30 dias. Quatro acertos espaÃ§ados marcam a questÃ£o como dominada.</p>
              {sessaoEmAndamento && <a className="botao botao--principal" href={href('/sessao')}>Continuar sessÃ£o Â· {Object.keys(sessao!.respostas).length}/{sessao!.ids.length}</a>}
              {!sessaoEmAndamento && <button type="button" className="botao botao--principal botao--grande" onClick={() => treinoRapido(10)} disabled={contagens.total < 10}>ComeÃ§ar um treino de 10 questÃµes</button>}
              <a className="botao" href={href('/revisao')}>Abrir calendÃ¡rio de revisÃ£o</a>
            </div>
            <div className="atalhos-estudo">
              <a href={href('/treinar?situacao=revisarHoje&limite=20')}><strong>{contagens.porSituacao.revisarHoje ?? 0}</strong><span>Revisar hoje</span><small>Retome o que precisa fixar</small></a>
              <a href={href('/treinar?situacao=dominadas')}><strong>{contagens.porSituacao.dominadas ?? 0}</strong><span>Dominadas</span><small>Quatro acertos espaÃ§ados</small></a>
              <a href={href('/treinar?situacao=naoRespondidas&limite=10')}><strong>{contagens.porSituacao.naoRespondidas ?? 0}</strong><span>QuestÃµes novas</span><small>Avance no acervo</small></a>
            </div>
          </section>
          {!conta && <section className="cartao cartao__corpo convite-conta">
            <p className="meta">ESTUDE EM QUALQUER DISPOSITIVO</p>
            <h2>Crie sua conta gratuita e guarde sua evoluÃ§Ã£o</h2>
            <p>Suas respostas, revisÃµes, favoritas e desempenho ficam salvos com seguranÃ§a e acompanham vocÃª no computador e no celular.</p>
            <a className="botao botao--principal" href={href('/conta')}>Criar minha conta</a>
          </section>}
          <div className="linha linha--empilha-celular">
            <a className="botao botao--grande" href={href('/treinar')}>
              Montar uma sessÃ£o com filtros
            </a>
            {sessaoEmAndamento && (
              <a className="botao botao--grande" href={href('/sessao')}>
                Retomar a Ãºltima sessÃ£o
              </a>
            )}
          </div>

          <section>
            <h2>Por tema</h2>
            <p className="meta" style={{ marginTop: '0.25rem' }}>
              Um clique aqui jÃ¡ monta a sessÃ£o do tema inteiro.
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

          <section className="treino-rapido">
            <h2 className="treino-rapido__titulo">Treino rÃ¡pido</h2>
            <p className="meta">
              QuestÃµes sorteadas de todo o acervo. ComeÃ§a na hora, sem escolher nada.
            </p>
            <div className="linha linha--empilha-celular" style={{ marginTop: '0.75rem' }}>
              {[10, 15, 20].map((quantidade) => (
                <button
                  key={quantidade}
                  type="button"
                  className="botao botao--principal botao--grande"
                  onClick={() => treinoRapido(quantidade)}
                  disabled={contagens.total < quantidade}
                >
                  <span className="numerico">{quantidade}</span> questÃµes
                </button>
              ))}
            </div>
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

          <section className="limite-leitura">
            <h2>O que Ã© o OrtoQuestÃµes</h2>
            <p style={{ marginTop: '0.5rem' }}>
              Um banco de questÃµes de ortopedia e traumatologia montado a partir de provas
              anteriores do TEOT, do TARO e de outros concursos da especialidade. As questÃµes sÃ£o
              transcritas das provas originais, com o gabarito da prÃ³pria banca, e vÃ£o sendo
              comentadas uma a uma â€” por inteligÃªncia artificial e pela comunidade de ortopedistas
              e residentes â€” com a explicaÃ§Ã£o de por que cada alternativa estÃ¡ certa ou errada.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              Os assuntos cobrem o programa inteiro: mÃ£o e punho, ombro e cotovelo, quadril,
              joelho, pÃ© e tornozelo, coluna, trauma, tumores Ã³sseos, ortopedia pediÃ¡trica, doenÃ§as
              osteometabÃ³licas e conceitos bÃ¡sicos.{' '}
              <a href={href('/sobre')}>Leia mais sobre o projeto</a>.
            </p>
          </section>

          {historico.length > 0 && (
            <section>
              <h2>Suas Ãºltimas sessÃµes</h2>
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
                            : 'â€”'}
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


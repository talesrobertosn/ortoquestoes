import { usarContextoLocal } from '../estado/usarContextoLocal'
import { useMemo, useState } from 'react'
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

const VARIACOES_INICIO = [
  { saudacao: 'A constância de hoje vira segurança na prova.', rotina: 'Um pouco de prática, todos os dias', explicacao: 'Errou? Revise agora. Acertou? Volte em 3, 7, 14 e 30 dias. Quatro acertos espaçados marcam a questão como dominada.', acao: 'Começar um treino de 10 questões', revisar: 'Retome o que precisa fixar', novas: 'Avance no acervo' },
  { saudacao: 'Cada revisão bem feita deixa a próxima resposta mais leve.', rotina: 'Hoje é um bom dia para consolidar', explicacao: 'Comece pelas questões que exigem revisão. Pequenas sessões repetidas criam memória de longo prazo.', acao: 'Fazer 10 questões agora', revisar: 'Transforme erro em domínio', novas: 'Descubra um assunto novo' },
  { saudacao: 'Você não precisa fazer tudo hoje. Precisa continuar.', rotina: 'Seu próximo acerto começa aqui', explicacao: 'Uma questão respondida com atenção vale mais do que uma sequência apressada. Revise, entenda e siga.', acao: 'Reservar 10 questões', revisar: 'Volte ao que ainda desafia', novas: 'Amplie seu repertório' },
  { saudacao: 'A prova reconhece quem construiu repertório todos os dias.', rotina: 'Treine com intenção', explicacao: 'A fila prioriza o que está vencido e o que você já errou. O intervalo entre revisões faz parte do estudo.', acao: 'Iniciar sessão de 10', revisar: 'Sua fila de consolidação', novas: 'Comece algo diferente' },
  { saudacao: 'Consistência silenciosa também é progresso.', rotina: 'Faça a próxima questão contar', explicacao: 'Erros retornam cedo; acertos seguros ganham mais intervalo. Assim, seu tempo vai para onde ele tem mais efeito.', acao: 'Praticar 10 questões', revisar: 'Fortaleça os pontos frágeis', novas: 'Explore questões inéditas' },
  { saudacao: 'Você está construindo decisão clínica questão por questão.', rotina: 'Revisar é avançar', explicacao: 'Não é preciso recomeçar do zero. Retome uma questão, entenda o raciocínio e deixe o ciclo trabalhar por você.', acao: 'Começar uma sessão curta', revisar: 'Relembre antes de esquecer', novas: 'Abra um novo caminho' },
]

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
  const [textoDoDia] = useState(() => VARIACOES_INICIO[Math.floor(Math.random() * VARIACOES_INICIO.length)])

  const anos = indice?.anos ?? []
  const anosRecentes = [...anos].sort((a, b) => b - a).slice(0, 6)
  const maiorTema = contagens
    ? Math.max(1, ...Object.values(contagens.porTema))
    : 1

  /** Treino rápido: uma sessão embaralhada de todo o acervo, num clique. */
  function treinoRapido(quantidade: number) {
    if (!indice) return
    if (sessaoEmAndamento && !window.confirm('Iniciar outro treino substitui a sessão em andamento. Seu histórico será mantido. Continuar?')) return
    const filtros = { ...FILTROS_VAZIOS, embaralhar: true, limite: quantidade }
    iniciar(filtros, montarSessao(indice, filtros, Date.now()))
    navegar('/sessao')
  }

  const sessaoEmAndamento =
    sessao && !sessao.concluidaEm && Object.keys(sessao.respostas).length < sessao.ids.length

  const nome = String(conta?.user.user_metadata?.nome ?? '').trim()
  const saudacao = textoDoDia.saudacao

  return (
    <div className="empilha-2">
      <section className="heroi">
        <h1>{nome ? `Bem-vindo${conta?.user.user_metadata?.situacao === 'ortopedista' ? '' : ''}, ${conta?.user.user_metadata?.situacao === 'ortopedista' ? 'Dr. ' : ''}${nome}.` : 'Seu próximo passo começa aqui.'}</h1>
        {nome && <p className="heroi__nota">{saudacao}</p>}
        <div className="heroi__texto">
          <p className="heroi__linha">
            {indice && indice.total > 0 ? (
              <>
                <strong className="numerico">{indice.total}</strong> questões de provas anteriores
                de TEOT, TARO e outras, organizadas por assunto. Você filtra, responde e vê seu
                desempenho na hora.
              </>
            ) : (
              <>Questões de provas anteriores, organizadas por assunto, para responder e medir o
                seu desempenho.</>
            )}
          </p>
        </div>
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
          <section className="painel-diario" aria-label="Seu estudo de hoje">
            <div className="painel-diario__intro">
              <p className="meta">SUA ROTINA DE ESTUDO</p>
              <h2>{sessaoEmAndamento ? 'Continue de onde parou' : textoDoDia.rotina}</h2>
              <p>{textoDoDia.explicacao}</p>
              {sessaoEmAndamento && <a className="botao botao--principal" href={href('/sessao')}>Continuar sessão · {Object.keys(sessao!.respostas).length}/{sessao!.ids.length}</a>}
              {!sessaoEmAndamento && <button type="button" className="botao botao--principal botao--grande" onClick={() => treinoRapido(10)} disabled={contagens.total < 10}>{textoDoDia.acao}</button>}
              <span className="acao-calendario"><a className="botao" href={href('/revisao')}>Abrir calendário de revisão</a></span>
            </div>
            <div className="atalhos-estudo">
              <a href={href('/treinar?situacao=revisarHoje&limite=20')}><strong>{contagens.porSituacao.revisarHoje ?? 0}</strong><span>Revisar hoje</span><small>{textoDoDia.revisar}</small></a>
              <a href={href('/treinar?situacao=dominadas')}><strong>{contagens.porSituacao.dominadas ?? 0}</strong><span>Dominadas</span><small>Quatro acertos espaçados</small></a>
              <a href={href('/treinar?situacao=naoRespondidas&limite=10')}><strong>{contagens.porSituacao.naoRespondidas ?? 0}</strong><span>Questões novas</span><small>{textoDoDia.novas}</small></a>
            </div>
          </section>
          {!conta && <section className="cartao cartao__corpo convite-conta">
            <p className="meta">ESTUDE EM QUALQUER DISPOSITIVO</p>
            <h2>Crie sua conta gratuita e guarde sua evolução</h2>
            <p>Suas respostas, revisões, favoritas e desempenho ficam salvos com segurança e acompanham você no computador e no celular.</p>
            <a className="botao botao--principal" href={href('/conta')}>Criar minha conta</a>
          </section>}
          <div className="linha linha--empilha-celular">
            <a className="botao botao--grande" href={href('/treinar')}>
              Montar uma sessão com filtros
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

          <section className="treino-rapido">
            <h2 className="treino-rapido__titulo">Treino rápido</h2>
            <p className="meta">
              Questões sorteadas de todo o acervo. Começa na hora, sem escolher nada.
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
                  <span className="numerico">{quantidade}</span> questões
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
            <h2>O que é o OrtoQuestões</h2>
            <p style={{ marginTop: '0.5rem' }}>
              Um banco de questões de ortopedia e traumatologia montado a partir de provas
              anteriores do TEOT, do TARO e de outros concursos da especialidade. As questões são
              transcritas das provas originais, com o gabarito da própria banca, e vão sendo
              comentadas uma a uma — por inteligência artificial e pela comunidade de ortopedistas
              e residentes — com a explicação de por que cada alternativa está certa ou errada.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              Os assuntos cobrem o programa inteiro: mão e punho, ombro e cotovelo, quadril,
              joelho, pé e tornozelo, coluna, trauma, tumores ósseos, ortopedia pediátrica, doenças
              osteometabólicas e conceitos básicos.{' '}
              <a href={href('/sobre')}>Leia mais sobre o projeto</a>.
            </p>
          </section>

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


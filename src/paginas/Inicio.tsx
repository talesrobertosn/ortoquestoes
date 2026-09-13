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
import { planoRevisao, rotuloDia } from '../estado/planoRevisao'

const VARIACOES_INICIO = [
  { saudacao: 'A constância de hoje vira segurança na prova.', rotina: 'Um pouco de prática, todos os dias', explicacao: 'Errou? Revise agora. Acertou? Volte em 3, 7, 14 e 30 dias. Quatro acertos espaçados marcam a questão como dominada.', acao: 'Começar um treino de 10 questões', revisar: 'Retome o que precisa fixar', novas: 'Avance no acervo' },
  { saudacao: 'Cada revisão bem feita deixa a próxima resposta mais leve.', rotina: 'Hoje é um bom dia para consolidar', explicacao: 'Comece pelas questões que exigem revisão. Pequenas sessões repetidas criam memória de longo prazo.', acao: 'Fazer 10 questões agora', revisar: 'Transforme erro em domínio', novas: 'Descubra um assunto novo' },
  { saudacao: 'Você não precisa fazer tudo hoje. Precisa continuar.', rotina: 'Seu próximo acerto começa aqui', explicacao: 'Uma questão respondida com atenção vale mais do que uma sequência apressada. Revise, entenda e siga.', acao: 'Reservar 10 questões', revisar: 'Volte ao que ainda desafia', novas: 'Amplie seu repertório' },
  { saudacao: 'A prova reconhece quem construiu repertório todos os dias.', rotina: 'Treine com intenção', explicacao: 'A fila prioriza o que está vencido e o que você já errou. O intervalo entre revisões faz parte do estudo.', acao: 'Iniciar sessão de 10', revisar: 'Sua fila de consolidação', novas: 'Comece algo diferente' },
  { saudacao: 'Consistência silenciosa também é progresso.', rotina: 'Faça a próxima questão contar', explicacao: 'Erros retornam cedo; acertos seguros ganham mais intervalo. Assim, seu tempo vai para onde ele tem mais efeito.', acao: 'Praticar 10 questões', revisar: 'Fortaleça os pontos frágeis', novas: 'Explore questões inéditas' },
  { saudacao: 'Você está construindo decisão clínica questão por questão.', rotina: 'Revisar é avançar', explicacao: 'Não é preciso recomeçar do zero. Retome uma questão, entenda o raciocínio e deixe o ciclo trabalhar por você.', acao: 'Começar uma sessão curta', revisar: 'Relembre antes de esquecer', novas: 'Abra um novo caminho' },
]

const VARIACOES_CABECALHO = [
  { comNome: (nome: string) => `Bem-vindo, ${nome}.`, semNome: 'Seu próximo passo começa aqui.', incentivo: 'Consistência silenciosa também é progresso.', acervo: 'questões de provas anteriores de TEOT, TARO e outras, organizadas por assunto. Você filtra, responde e vê seu desempenho na hora.' },
  { comNome: (nome: string) => `Que bom ter você de volta, ${nome}.`, semNome: 'Voltar para estudar já é um avanço.', incentivo: 'Cada questão entendida hoje reduz a dúvida de amanhã.', acervo: 'questões para treinar raciocínio em ortopedia, com filtros simples e desempenho acompanhado no seu ritmo.' },
  { comNome: (nome: string) => `Vamos construir repertório, ${nome}.`, semNome: 'Construa repertório questão por questão.', incentivo: 'Não precisa ser perfeito; precisa ser contínuo.', acervo: 'questões de TEOT, TARO e outras provas anteriores para revisar, comparar decisões e evoluir com clareza.' },
  { comNome: (nome: string) => `Seu estudo continua daqui, ${nome}.`, semNome: 'Seu estudo pode começar agora.', incentivo: 'Uma sessão curta ainda é uma sessão que conta.', acervo: 'questões organizadas por assunto para você encontrar o que precisa, responder e acompanhar seus acertos.' },
  { comNome: (nome: string) => `Hoje também é dia de avançar, ${nome}.`, semNome: 'Hoje também é um bom dia para avançar.', incentivo: 'A segurança na prova nasce da repetição com propósito.', acervo: 'questões de ortopedia de provas anteriores, reunidas para transformar revisão em domínio progressivo.' },
  { comNome: (nome: string) => `Uma boa decisão por vez, ${nome}.`, semNome: 'Uma boa decisão por vez.', incentivo: 'Seu futuro repertório está sendo treinado agora.', acervo: 'questões para praticar, errar sem medo, revisar com calma e chegar mais preparado à próxima prova.' },
  { comNome: (nome: string) => `Vamos retomar o ritmo, ${nome}.`, semNome: 'Retome o ritmo no seu tempo.', incentivo: 'Uma questão bem revisada muda a próxima decisão.', acervo: 'questões organizadas para transformar estudo diário em repertório clínico.' },
  { comNome: (nome: string) => `Seu repertório cresce aqui, ${nome}.`, semNome: 'Seu repertório pode crescer hoje.', incentivo: 'O próximo passo pequeno continua sendo um passo.', acervo: 'questões de ortopedia para treinar conduta, classificação e diagnóstico.' },
  { comNome: (nome: string) => `Vamos deixar a prova mais familiar, ${nome}.`, semNome: 'Deixe a prova mais familiar.', incentivo: 'Repetir com entendimento é como a segurança aparece.', acervo: 'questões de provas anteriores, separadas por assunto para você estudar com direção.' },
  { comNome: (nome: string) => `Seu tempo de estudo tem valor, ${nome}.`, semNome: 'Faça seu tempo de estudo valer.', incentivo: 'A clareza vem depois de muitas boas revisões.', acervo: 'questões com filtros e comentários para estudar o que tem maior impacto agora.' },
  { comNome: (nome: string) => `Hoje você pode consolidar mais um ponto, ${nome}.`, semNome: 'Hoje você pode consolidar mais um ponto.', incentivo: 'Todo conceito recuperado deixa a memória mais forte.', acervo: 'questões para revisar os temas que voltam a aparecer nas provas de ortopedia.' },
  { comNome: (nome: string) => `Vamos transformar dúvida em critério, ${nome}.`, semNome: 'Transforme dúvida em critério.', incentivo: 'Entender o motivo evita errar pelo mesmo caminho.', acervo: 'questões para comparar alternativas e fortalecer seu raciocínio clínico.' },
  { comNome: (nome: string) => `Bom te ver por aqui, ${nome}.`, semNome: 'Bom ter você por aqui.', incentivo: 'Sua rotina não precisa ser longa para ser consistente.', acervo: 'questões para encaixar uma revisão de qualidade no seu dia.' },
  { comNome: (nome: string) => `A próxima revisão já conta, ${nome}.`, semNome: 'A próxima revisão já conta.', incentivo: 'Memória se constrói quando você volta ao assunto certo.', acervo: 'questões que ajudam a priorizar o que precisa ser lembrado.' },
  { comNome: (nome: string) => `Vamos praticar raciocínio, ${nome}.`, semNome: 'Pratique raciocínio, questão por questão.', incentivo: 'Cada alternativa analisada melhora sua leitura de prova.', acervo: 'questões de TEOT, TARO e outras seleções para praticar com contexto.' },
  { comNome: (nome: string) => `Você já sabe por onde seguir, ${nome}.`, semNome: 'Escolha uma questão para começar.', incentivo: 'Começar pequeno reduz a distância até a próxima sessão.', acervo: 'questões para avançar por temas, provas e pontos que ainda pedem atenção.' },
  { comNome: (nome: string) => `Seu estudo está em movimento, ${nome}.`, semNome: 'Coloque seu estudo em movimento.', incentivo: 'A segurança nasce de encontros repetidos com bons problemas.', acervo: 'questões para revisar decisões ortopédicas e acompanhar sua evolução.' },
  { comNome: (nome: string) => `Vamos construir confiança com calma, ${nome}.`, semNome: 'Construa confiança com calma.', incentivo: 'Constância vence o impulso de deixar para depois.', acervo: 'questões para você estudar com regularidade e enxergar seu progresso.' },
  { comNome: (nome: string) => `Mais uma sessão bem feita, ${nome}.`, semNome: 'Uma sessão bem feita começa aqui.', incentivo: 'O acerto de amanhã começa na revisão de hoje.', acervo: 'questões de ortopedia organizadas para uma preparação mais objetiva.' },
  { comNome: (nome: string) => `Seu próximo acerto merece preparo, ${nome}.`, semNome: 'Seu próximo acerto merece preparo.', incentivo: 'Você não precisa lembrar tudo de uma vez.', acervo: 'questões para aprender por repetição, correção e explicação detalhada.' },
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
  const [cabecalhoDoDia] = useState(() => VARIACOES_CABECALHO[Math.floor(Math.random() * VARIACOES_CABECALHO.length)])

  const anos = indice?.anos ?? []
  const anosRecentes = [...anos].sort((a, b) => b - a).slice(0, 6)
  const maiorTema = contagens
    ? Math.max(1, ...Object.values(contagens.porTema))
    : 1
  const revisoesPlanejadas = useMemo(
    () => (indice ? planoRevisao(indice, contexto.respondidas, 7) : new Map()),
    [indice, contexto.respondidas],
  )
  const temaFragil = useMemo(() => {
    if (!indice) return null
    const porTema = new Map<string, { acertos: number; tentativas: number; pendentes: number; slug: string }>()
    for (const item of indice.questoes) {
      const registro = contexto.respondidas[item.id]
      if (!registro) continue
      const tema = indice.temas[item.t]
      if (!tema) continue
      const atual = porTema.get(tema.nome) ?? { acertos: 0, tentativas: 0, pendentes: 0, slug: tema.slug }
      atual.acertos += registro.acertos ?? Number(registro.c === true)
      atual.tentativas += registro.tentativas ?? 1
      porTema.set(tema.nome, atual)
    }
    for (const dia of revisoesPlanejadas.values()) for (const [tema, quantidade] of dia.temas) {
      const atual = porTema.get(tema)
      if (atual) atual.pendentes += quantidade
    }
    return [...porTema.entries()]
      .filter(([, valor]) => valor.tentativas >= 2)
      .sort((a, b) => a[1].acertos / a[1].tentativas - b[1].acertos / b[1].tentativas)[0] ?? null
  }, [indice, contexto.respondidas, revisoesPlanejadas])
  const resumoSemana = useMemo(() => {
    const limite = Date.now() - 7 * 86400000
    const recentes = historico.filter(h => h.concluidaEm >= limite)
    const respondidas = recentes.reduce((total, h) => total + h.respondidas, 0)
    const acertos = recentes.reduce((total, h) => total + h.acertos, 0)
    const dias = new Set(recentes.map(h => new Date(h.concluidaEm).toDateString())).size
    return { respondidas, acertos, dias }
  }, [historico])

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
        <h1>{nome ? cabecalhoDoDia.comNome(`${conta?.user.user_metadata?.situacao === 'ortopedista' ? 'Dr. ' : ''}${nome}`) : cabecalhoDoDia.semNome}</h1>
        <p className="heroi__nota">{nome ? saudacao : cabecalhoDoDia.incentivo}</p>
        <div className="heroi__texto">
          <p className="heroi__linha">
            {indice && indice.total > 0 ? (
              <>
                <strong className="numerico">{indice.total}</strong> {cabecalhoDoDia.acervo}
              </>
            ) : (
              <>{cabecalhoDoDia.acervo}</>
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
              <h2>{sessaoEmAndamento ? 'Continue de onde parou' : 'O que fazer agora'}</h2>
              <p>{textoDoDia.explicacao}</p>
              {sessaoEmAndamento && <a className="botao botao--principal" href={href('/sessao')}>Continuar sessão · {Object.keys(sessao!.respostas).length}/{sessao!.ids.length}</a>}
              {!sessaoEmAndamento && <div className="linha linha--empilha-celular">
                {[5, 10, 20].map(quantidade => <button key={quantidade} type="button" className={quantidade === 10 ? 'botao botao--principal' : 'botao'} onClick={() => treinoRapido(quantidade)} disabled={contagens.total < quantidade}>{quantidade === 10 ? textoDoDia.acao : `${quantidade} questões · ~${Math.max(4, Math.round(quantidade * 0.8))} min`}</button>)}
              </div>}
              <span className="acao-calendario"><a className="botao" href={href('/revisao')}>Abrir calendário de revisão</a></span>
            </div>
            {Object.keys(contexto.respondidas).length > 0 || conta ? <div className="atalhos-estudo">
              <a href={href('/treinar?situacao=revisarHoje&limite=20')}><strong>{contagens.porSituacao.revisarHoje ?? 0}</strong><span>Revisar hoje</span><small>{textoDoDia.revisar}</small></a>
              <a href={href('/treinar?situacao=dominadas')}><strong>{contagens.porSituacao.dominadas ?? 0}</strong><span>Dominadas</span><small>Quatro acertos espaçados</small></a>
              <a href={href('/treinar?situacao=naoRespondidas&limite=10')}><strong>{contagens.porSituacao.naoRespondidas ?? 0}</strong><span>Questões novas</span><small>{textoDoDia.novas}</small></a>
            </div> : <p className="texto-2">Escolha uma sessão curta. Depois da primeira resposta, esta área passa a mostrar suas revisões, evolução e próximos passos.</p>}
          </section>
          {temaFragil && <section className="cartao cartao__corpo convite-conta">
            <p className="meta">ONDE VOCÊ MAIS GANHA AO REVISAR</p>
            <h2>{temaFragil[0]} · {Math.round((temaFragil[1].acertos / temaFragil[1].tentativas) * 100)}% de acerto</h2>
            <p>{temaFragil[1].pendentes > 0 ? `${temaFragil[1].pendentes} revisões desse tema estão programadas.` : 'Faça uma sessão curta para transformar este ponto em segurança.'}</p>
            <a className="botao botao--principal" href={href(`/treinar?temas=${temaFragil[1].slug}&limite=10`)}>Treinar este tema</a>
          </section>}
          {revisoesPlanejadas.size > 0 && <section className="cartao cartao__corpo">
            <p className="meta">PRÓXIMOS SETE DIAS</p><h2>Prévia da sua carga de revisão</h2>
            <div className="linha linha--empilha-celular" style={{ marginTop: '0.75rem' }}>{[...revisoesPlanejadas.values()].slice(0, 7).map(dia => <a className="botao" key={dia.chave} href={href('/revisao')}><strong>{rotuloDia(dia.inicio)}</strong> · {dia.ids.length} {dia.ids.length === 1 ? 'questão' : 'questões'}{dia.atrasadas > 0 ? ' · atrasadas' : ''}</a>)}</div>
          </section>}
          {!conta && <section className="cartao cartao__corpo convite-conta">
            <p className="meta">COMECE SEM CADASTRO</p>
            <h2>Seu progresso já fica salvo neste navegador</h2>
            <p>Crie uma conta quando quiser levar respostas, revisões, favoritas e desempenho para outros dispositivos.</p>
            <a className="botao botao--principal" href={href('/conta')}>Criar minha conta</a>
            {indice.questoes.find(questao => questao.c === 1) && <a className="botao" href={href(`/questao/${indice.questoes.find(questao => questao.c === 1)!.id}`)}>Ver um comentário de exemplo</a>}
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
            <a className="botao botao--grande" href={href('/favoritas')}>Ver questões favoritas</a>
          </div>

          {resumoSemana.respondidas > 0 && <section className="cartao cartao__corpo">
            <p className="meta">SUA SEMANA</p>
            <h2>{resumoSemana.respondidas} questões em {resumoSemana.dias} {resumoSemana.dias === 1 ? 'dia ativo' : 'dias ativos'}</h2>
            <p>{Math.round((resumoSemana.acertos / resumoSemana.respondidas) * 100)}% de acerto nas sessões concluídas nos últimos sete dias. Continue com uma sessão curta para sustentar o ritmo.</p>
          </section>}

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


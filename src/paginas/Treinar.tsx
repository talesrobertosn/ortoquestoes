import { useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { arvoreAssuntos, contar, montarSessao } from '../dados/acervo'
import {
  FILTROS_VAZIOS,
  ROTULO_DIFICULDADE,
  ROTULO_SITUACAO,
  type Dificuldade,
  type Filtros,
  type Situacao,
} from '../dados/tipos'
import { consultaParaFiltros, filtrosParaConsulta, navegar } from '../util/rotas'
import { SeletorArvore } from '../componentes/SeletorArvore'
import { SeletorMultiplo } from '../componentes/SeletorMultiplo'
import { Carregando, Estado } from '../componentes/Estados'
import { usarSessao } from '../estado/sessao'
import { usarMedia } from '../util/usarMedia'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { usarEtiquetas } from '../estado/preferencias'
import { href } from '../util/rotas'

const DIFICULDADES: Dificuldade[] = ['facil', 'medio', 'dificil']
const LIMITES = [10, 20, 30, 50, 100]
const SITUACOES: Situacao[] = ['todas', 'naoRespondidas', 'erradas', 'acertadas', 'favoritas']
const DURACOES: Array<[number, string]> = [
  [60, '1 hora'],
  [120, '2 horas'],
  [180, '3 horas'],
  [240, '4 horas'],
]

export function Treinar({ consulta }: { consulta: URLSearchParams }) {
  const { indice, carregando } = usarIndice()
  const { iniciar } = usarSessao()
  // Em tela grande a árvore fica aberta na página: escolher assunto é o que se
  // faz aqui, não faz sentido esconder atrás de um menu.
  const telaLarga = usarMedia('(min-width: 64rem)')
  const [filtros, definirFiltros] = useState<Filtros>(() => consultaParaFiltros(consulta))
  const [simulado, definirSimulado] = useState(false)
  const [minutos, definirMinutos] = useState(180)

  // A URL acompanha os filtros: o endereço da barra é o filtro compartilhável.
  useEffect(() => {
    const destino = '/treinar' + filtrosParaConsulta(filtros)
    navegar(destino, true)
  }, [filtros])

  const { contexto, carregandoBusca } = usarContextoLocal(filtros.busca)
  const { mostrarEtiquetas, definirEtiquetas } = usarEtiquetas()
  const contagens = useMemo(
    () => (indice ? contar(indice, filtros, contexto) : null),
    [indice, filtros, contexto],
  )
  const arvore = useMemo(() => (indice ? arvoreAssuntos(indice) : []), [indice])

  // Filtro que não tem nenhuma opção não vira campo vazio na tela.
  const temProva = (indice?.provas.length ?? 0) > 0
  const temAno = (indice?.anos.length ?? 0) > 0
  const temComentario = useMemo(
    () => (indice?.questoes ?? []).some((q) => q.c === 1),
    [indice],
  )
  const temImagem = useMemo(() => (indice?.questoes ?? []).some((q) => q.img === 1), [indice])
  const temAnulada = useMemo(() => (indice?.questoes ?? []).some((q) => q.an === 1), [indice])

  const total = contagens?.total ?? 0
  const quantidadeSessao = filtros.limite ? Math.min(filtros.limite, total) : total

  function atualizar(parcial: Partial<Filtros>) {
    definirFiltros((atuais) => ({ ...atuais, ...parcial }))
  }

  function comecar() {
    if (!indice || total === 0) return
    const ids = montarSessao(indice, filtros, Date.now(), contexto)
    iniciar(filtros, ids, simulado ? { simulado: true, limiteSegundos: minutos * 60 } : {})
    navegar('/sessao')
  }

  if (carregando) return <Carregando linhas={6} rotulo="Carregando os filtros" />

  if (indice && indice.total === 0) {
    return (
      <Estado
        titulo="Ainda não há questões para filtrar."
        acoes={
          <a className="botao" href={href('/')}>
            Voltar ao início
          </a>
        }
      >
        <p>O primeiro tema entra no ar assim que a conferência da importação terminar.</p>
      </Estado>
    )
  }

  return (
    <div className="empilha-2">
      <header className="limite-leitura">
        <h1>Montar sessão</h1>
        <p className="texto-2" style={{ marginTop: '0.5rem' }}>
          Escolha o recorte e comece. O número dentro do botão é quantas questões atendem aos
          filtros agora.
        </p>
      </header>

      <div className="cartao">
        <div className="cartao__corpo empilha">
          <div className="campo" style={{ marginBottom: 0 }}>
            <label className="campo__rotulo" htmlFor="busca-acervo">
              Buscar no texto das questões
            </label>
            <input
              id="busca-acervo"
              className="entrada"
              type="search"
              name="busca"
              autoComplete="off"
              placeholder="Salter-Harris, Weber, manguito…"
              value={filtros.busca}
              onChange={(e) => atualizar({ busca: e.target.value })}
            />
            {carregandoBusca && (
              <span className="campo__auxilio">Carregando o texto das questões…</span>
            )}
          </div>

          <div className="campo" style={{ marginBottom: 0 }}>
            <span className="campo__rotulo">Situação</span>
            <div className="grupo-opcoes" id="filtro-situacao">
              {SITUACOES.map((situacao) => (
                <button
                  key={situacao}
                  type="button"
                  className="opcao-segmento"
                  aria-pressed={filtros.situacao === situacao}
                  disabled={situacao !== 'todas' && !(contagens?.porSituacao[situacao] ?? 0)}
                  onClick={() => atualizar({ situacao })}
                >
                  {ROTULO_SITUACAO[situacao]}{' '}
                  <span className="texto-2 numerico">
                    {contagens?.porSituacao[situacao] ?? 0}
                  </span>
                </button>
              ))}
            </div>
            <span className="campo__auxilio">
              Vem do que você já respondeu neste navegador. Refazer o que errou rende mais do que
              questão nova.
            </span>
          </div>

          <div className="campo" style={{ marginBottom: 0 }}>
            <span className="campo__rotulo">Assuntos</span>
            <SeletorArvore
              variante={telaLarga ? 'lista' : 'menu'}
              arvore={arvore}
              temas={filtros.temas}
              subtemas={filtros.subtemas}
              porTema={contagens?.porTema ?? {}}
              porSubtema={contagens?.porSubtema ?? {}}
              aoMudar={(temas, subtemas) => atualizar({ temas, subtemas })}
            />
          </div>

          {(temProva || temAno) && (
            <div className={'linha-campos' + (temProva && temAno ? ' linha-campos--2' : '')}>
              {temProva && (
                <div className="campo" style={{ marginBottom: 0 }}>
                  <span className="campo__rotulo">Tipo de prova</span>
                  <SeletorMultiplo
                    opcoes={indice?.provas ?? []}
                    selecionados={filtros.provas}
                    contagens={contagens?.porProva}
                    rotuloVazio="Todas as provas"
                    rotulo={(v) => String(v)}
                    aoMudar={(provas) => atualizar({ provas })}
                  />
                </div>
              )}
              {temAno && (
                <div className="campo" style={{ marginBottom: 0 }}>
                  <span className="campo__rotulo">Ano</span>
                  <SeletorMultiplo
                    opcoes={[...(indice?.anos ?? [])].sort((a, b) => b - a)}
                    selecionados={filtros.anos}
                    contagens={contagens?.porAno}
                    rotuloVazio="Todos os anos"
                    rotulo={(v) => String(v)}
                    aoMudar={(anos) => atualizar({ anos })}
                  />
                </div>
              )}
            </div>
          )}

          {Object.keys(contagens?.porDificuldade ?? {}).length > 0 && (
            <div className="campo" style={{ marginBottom: 0 }}>
              <span className="campo__rotulo">Dificuldade</span>
              <div className="grupo-opcoes">
                {DIFICULDADES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="opcao-segmento"
                    aria-pressed={filtros.dificuldades.includes(d)}
                    onClick={() =>
                      atualizar({
                        dificuldades: filtros.dificuldades.includes(d)
                          ? filtros.dificuldades.filter((x) => x !== d)
                          : [...filtros.dificuldades, d],
                      })
                    }
                  >
                    {ROTULO_DIFICULDADE[d]}{' '}
                    <span className="texto-2 numerico">{contagens?.porDificuldade[d] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="campo" style={{ marginBottom: 0 }}>
            <span className="campo__rotulo">Recorte</span>
            <div className="empilha" style={{ marginTop: '0.25rem' }}>
              {temImagem && (
                <label className="caixa">
                  <input
                    type="checkbox"
                    checked={filtros.comImagem}
                    onChange={(e) => atualizar({ comImagem: e.target.checked })}
                  />
                  <span>Só questões com imagem no enunciado</span>
                </label>
              )}
              {temComentario && (
                <label className="caixa">
                  <input
                    type="checkbox"
                    checked={filtros.comComentario}
                    onChange={(e) => atualizar({ comComentario: e.target.checked })}
                  />
                  <span>Só questões com comentário</span>
                </label>
              )}
              {temAnulada && (
                <label className="caixa">
                  <input
                    type="checkbox"
                    checked={filtros.incluirAnuladas}
                    onChange={(e) => atualizar({ incluirAnuladas: e.target.checked })}
                  />
                  <span>Incluir questões anuladas (não contam no desempenho)</span>
                </label>
              )}
              <label className="caixa">
                <input
                  type="checkbox"
                  checked={filtros.embaralhar}
                  onChange={(e) => atualizar({ embaralhar: e.target.checked })}
                />
                <span>Embaralhar a ordem</span>
              </label>
              <label className="caixa">
                <input
                  type="checkbox"
                  checked={!mostrarEtiquetas}
                  onChange={(e) => definirEtiquetas(!e.target.checked)}
                />
                <span>
                  Esconder as etiquetas de assunto até responder
                  <span className="campo__auxilio" style={{ marginTop: 0 }}>
                    Ler "Salter-Harris" antes do enunciado já elimina metade das alternativas. Vale
                    para todas as sessões e dá para trocar no meio, pela tecla E.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="campo" style={{ marginBottom: 0 }}>
            <span className="campo__rotulo">Modo</span>
            <div className="empilha" style={{ marginTop: '0.25rem' }}>
              <label className="interruptor">
                <input
                  type="checkbox"
                  checked={simulado}
                  onChange={(e) => definirSimulado(e.target.checked)}
                />
                <span className="interruptor__trilho" />
                <span>
                  Simulado com tempo
                  <span className="campo__auxilio" style={{ marginTop: 0 }}>
                    O gabarito fica guardado até você entregar, como em prova.
                  </span>
                </span>
              </label>
              {simulado && (
                <div className="grupo-opcoes" id="filtro-duracao">
                  {DURACOES.map(([valor, rotulo]) => (
                    <button
                      key={valor}
                      type="button"
                      className="opcao-segmento"
                      aria-pressed={minutos === valor}
                      onClick={() => definirMinutos(valor)}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="campo" style={{ marginBottom: 0 }}>
            <span className="campo__rotulo">Quantas questões</span>
            <div className="grupo-opcoes" id="filtro-limite">
              <button
                type="button"
                className="opcao-segmento"
                aria-pressed={filtros.limite === null}
                onClick={() => atualizar({ limite: null })}
              >
                Todas
              </button>
              {LIMITES.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="opcao-segmento"
                  aria-pressed={filtros.limite === n}
                  disabled={total < n}
                  onClick={() => atualizar({ limite: n })}
                >
                  <span className="numerico">{n}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="acoes" style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="botao botao--fantasma"
              onClick={() => definirFiltros({ ...FILTROS_VAZIOS })}
            >
              Limpar filtros
            </button>
            <button
              type="button"
              className="botao botao--principal botao--grande"
              disabled={total === 0}
              onClick={comecar}
            >
              {total === 0 ? (
                'Nenhuma questão com esses filtros'
              ) : simulado ? (
                <>
                  Iniciar simulado de{' '}
                  <span className="botao__contador">{quantidadeSessao}</span> questões ·{' '}
                  {DURACOES.find(([v]) => v === minutos)?.[1]}
                </>
              ) : (
                <>
                  Responder <span className="botao__contador">{quantidadeSessao}</span>{' '}
                  {quantidadeSessao === 1 ? 'questão' : 'questões'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {total === 0 && (
        <Estado titulo="Nenhuma questão atende a esse recorte.">
          <p>
            {filtros.busca.trim()
              ? `Nenhuma questão contém "${filtros.busca.trim()}". A busca procura no enunciado, nas alternativas e nas etiquetas, e exige todas as palavras.`
              : 'Tire um filtro por vez. O botão volta a habilitar assim que houver questões.'}
          </p>
        </Estado>
      )}
    </div>
  )
}

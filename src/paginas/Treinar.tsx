import { useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { arvoreAssuntos, contar, montarSessao } from '../dados/acervo'
import { FILTROS_VAZIOS, ROTULO_DIFICULDADE, type Dificuldade, type Filtros } from '../dados/tipos'
import { consultaParaFiltros, filtrosParaConsulta, navegar } from '../util/rotas'
import { SeletorArvore } from '../componentes/SeletorArvore'
import { SeletorMultiplo } from '../componentes/SeletorMultiplo'
import { Carregando, Estado } from '../componentes/Estados'
import { usarSessao } from '../estado/sessao'
import { usarMedia } from '../util/usarMedia'
import { href } from '../util/rotas'

const DIFICULDADES: Dificuldade[] = ['facil', 'medio', 'dificil']
const LIMITES = [10, 20, 30, 50, 100]
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

  const contagens = useMemo(
    () => (indice ? contar(indice, filtros) : null),
    [indice, filtros],
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
    const ids = montarSessao(indice, filtros, Date.now())
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
                <div className="grupo-opcoes">
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
            <div className="grupo-opcoes">
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
            Tire um filtro por vez — o ano costuma ser o mais restritivo. O botão volta a habilitar
            assim que houver questões.
          </p>
        </Estado>
      )}
    </div>
  )
}

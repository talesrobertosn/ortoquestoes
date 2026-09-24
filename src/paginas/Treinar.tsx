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
import { Carregando, Estado } from '../componentes/Estados'
import { usarSessao } from '../estado/sessao'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { usarEtiquetas } from '../estado/preferencias'
import { href } from '../util/rotas'
import { usarConta } from '../conta/ContextoConta'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { PROVA_SIMULADOS } from '../config'

// A maior parte do acervo ainda traz a prova genérica "TEOT/TARO" (sem
// diferenciar as duas), então por enquanto as três formas aparecem como uma
// única opção de filtro em vez de linhas separadas.
const PROVAS_TEOT_TARO = ['TEOT/TARO', 'TEOT', 'TARO']

const DIFICULDADES: Dificuldade[] = ['facil', 'medio', 'dificil']
const LIMITES = [5, 10, 20, 30, 50, 100]
const SITUACOES: Situacao[] = ['todas', 'naoRespondidas', 'erradas', 'acertadas', 'favoritas', 'revisarHoje', 'incertas', 'dominadas']
const DURACOES: Array<[number, string]> = [
  [60, '1 hora'],
  [120, '2 horas'],
  [180, '3 horas'],
  [240, '4 horas'],
]

export function Treinar({ consulta }: { consulta: URLSearchParams }) {
  const { indice, carregando } = usarIndice()
  const { iniciar, sessao } = usarSessao()
  const { sessao: conta } = usarConta()
  const [filtros, definirFiltros] = useState<Filtros>(() => consulta.size ? consultaParaFiltros(consulta) : { ...FILTROS_VAZIOS, limite: 10 })
  useEffect(() => {
    const mudou = () => {
      const [caminho, query = ''] = window.location.hash.slice(1).split('?')
      if (caminho === '/treinar') {
        const proximos = consultaParaFiltros(new URLSearchParams(query))
        definirFiltros(atuais => filtrosParaConsulta(atuais) === filtrosParaConsulta(proximos) ? atuais : proximos)
      }
    }
    window.addEventListener('hashchange', mudou)
    return () => window.removeEventListener('hashchange', mudou)
  }, [])
  const [simulado, definirSimulado] = useState(false)
  const [minutos, definirMinutos] = useState(180)

  // A URL acompanha os filtros: o endereço da barra é o filtro compartilhável.
  useEffect(() => {
    const destino = '/treinar' + filtrosParaConsulta(filtros)
    if (window.location.hash !== '#' + destino) {
      navegar(destino, true)
    }
  }, [filtros])

  const { contexto, carregandoBusca } = usarContextoLocal(filtros.busca)
  const { mostrarEtiquetas, definirEtiquetas } = usarEtiquetas()
  const contagens = useMemo(
    () => (indice ? contar(indice, filtros, contexto) : null),
    [indice, filtros, contexto],
  )
  const arvore = useMemo(() => (indice ? arvoreAssuntos(indice) : []), [indice])
  const gruposProva = useMemo(() => {
    const provasNoAcervo = indice?.provas ?? []
    const grupos: Array<{ rotulo: string; provas: string[] }> = []
    const teotTaro = PROVAS_TEOT_TARO.filter((p) => provasNoAcervo.includes(p))
    if (teotTaro.length > 0) grupos.push({ rotulo: 'TEOT/TARO', provas: teotTaro })
    for (const prova of provasNoAcervo) {
      if (PROVAS_TEOT_TARO.includes(prova) || prova === PROVA_SIMULADOS) continue
      grupos.push({ rotulo: prova, provas: [prova] })
    }
    return grupos
  }, [indice])

  const gerais = useMemo(() => (indice ? contar(indice, FILTROS_VAZIOS, contexto) : null), [indice, contexto])

  // Filtro que não tem nenhuma opção não vira campo vazio na tela.
  const temProva = gruposProva.length > 0
  const totalSimulados = gerais?.porProva[PROVA_SIMULADOS] ?? 0
  const soSimulados = filtros.provas.includes(PROVA_SIMULADOS)
  const temAno = (indice?.anos.length ?? 0) > 0
  const temComentario = useMemo(
    () => (indice?.questoes ?? []).some((q) => q.c === 1),
    [indice],
  )
  const temImagem = useMemo(() => (indice?.questoes ?? []).some((q) => q.img === 1), [indice])
  const temAnulada = useMemo(() => (indice?.questoes ?? []).some((q) => q.an === 1), [indice])

  const total = contagens?.total ?? 0
  const quantidadeSessao = filtros.limite ? Math.min(filtros.limite, total) : total
  const estimativaMinutos = Math.max(1, Math.round(quantidadeSessao * (simulado ? 1.5 : 0.8)))
  const desempenhoAnterior = useMemo(() => {
    const registros = Object.values(contexto.respondidas)
    const tentativas = registros.reduce((total, registro) => total + (registro.tentativas ?? 1), 0)
    const acertos = registros.reduce((total, registro) => total + (registro.acertos ?? Number(registro.c === true)), 0)
    return tentativas ? Math.round((acertos / tentativas) * 100) : null
  }, [contexto.respondidas])

  const comentadas = useMemo(() => (indice?.questoes ?? []).filter((q) => q.c === 1).length, [indice])
  const rapidas: { titulo: string; icone: NomeIcone; quantidade: number; preset: Partial<Filtros> }[] = [
    { titulo: 'Revisar hoje', icone: 'calendario', quantidade: gerais?.porSituacao.revisarHoje ?? 0, preset: { situacao: 'revisarHoje' } },
    { titulo: 'Questões novas', icone: 'estrela', quantidade: gerais?.porSituacao.naoRespondidas ?? 0, preset: { situacao: 'naoRespondidas' } },
    { titulo: 'Que eu errei', icone: 'reiniciar', quantidade: gerais?.porSituacao.erradas ?? 0, preset: { situacao: 'erradas' } },
    { titulo: 'Só comentadas', icone: 'livro', quantidade: comentadas, preset: { comComentario: true } },
  ]

  /** Sessão de 10 num clique, sem passar pelos filtros. */
  function sessaoRapida(preset: Partial<Filtros> = {}) {
    if (!indice) return
    if (sessao && !sessao.concluidaEm && !window.confirm('Substituir a sessão em andamento? Seu histórico será mantido.')) return
    const rapido: Filtros = { ...FILTROS_VAZIOS, embaralhar: true, limite: 10, ...preset }
    iniciar(rapido, montarSessao(indice, rapido, Date.now(), contexto))
    navegar('/sessao')
  }

  function atualizar(parcial: Partial<Filtros>) {
    definirFiltros((atuais) => ({ ...atuais, ...parcial }))
  }

  /** Liga ou desliga o recorte dos simulados autorais nos filtros. */
  function alternarSimulados(ligar: boolean) {
    atualizar({ provas: ligar ? [...filtros.provas.filter((x) => x !== PROVA_SIMULADOS), PROVA_SIMULADOS] : filtros.provas.filter((x) => x !== PROVA_SIMULADOS) })
  }

  /** Recorte dos simulados já no modo com tempo, levando ao formato. */
  function montarSimulado() {
    atualizar({ provas: [PROVA_SIMULADOS] })
    definirSimulado(true)
    document.getElementById('etapa-formato')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function comecar() {
    if (!indice || total === 0 || carregandoBusca) return
    if (sessao && !sessao.concluidaEm && !window.confirm('Substituir a sessão em andamento? Seu histórico será mantido.')) return
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

  const selecionados = filtros.temas.length + filtros.subtemas.length
  return (
    <div className="empilha-2 treinar-pagina">
      <section className="tr-heroi">
        <div className="tr-heroi__texto">
          <h1>Treinar</h1>
          <p>Sem tempo para montar? Comece 10 questões agora. Quer um recorte? Escolha os filtros abaixo.</p>
        </div>
        <button type="button" className="botao botao--claro tr-heroi__rapida" onClick={() => sessaoRapida()} disabled={!indice}>
          <Icone nome="raio" tamanho={20} />
          <span><strong>Sessão rápida</strong><small>10 questões de todo o acervo</small></span>
        </button>
        <div className="tr-rapidas" aria-label="Sessões rápidas de 10 questões">
          {rapidas.map((r) => (
            <button key={r.titulo} type="button" className="tr-rapida" disabled={r.quantidade === 0} onClick={() => sessaoRapida(r.preset)}>
              <Icone nome={r.icone} tamanho={16} />
              <span>{r.titulo}</span>
              <b className="numerico">{r.quantidade}</b>
            </button>
          ))}
        </div>
      </section>
      {totalSimulados > 0 && (
        <section className="tr-simulados" aria-labelledby="tr-simulados-titulo">
          <div className="tr-simulados__texto">
            <span className="tr-simulados__selo">Autoral</span>
            <h2 id="tr-simulados-titulo">OrtoQuestões Simulados</h2>
            <p>
              Questões inéditas feitas pelo OrtoQuestões a partir da bibliografia de referência, no padrão
              das provas de subespecialidade. <strong className="numerico">{totalSimulados}</strong> questões, todas comentadas.
            </p>
          </div>
          <div className="tr-simulados__acoes">
            <button type="button" className="botao botao--principal" onClick={() => sessaoRapida({ provas: [PROVA_SIMULADOS] })}>
              <Icone nome="raio" tamanho={18} /> 10 questões agora
            </button>
            <button type="button" className="botao" onClick={montarSimulado}>
              <Icone nome="calendario" tamanho={18} /> Simulado com tempo
            </button>
            <button type="button" className="tr-pilula" aria-pressed={soSimulados} onClick={() => alternarSimulados(!soSimulados)}>
              {soSimulados ? 'Usando nos filtros' : 'Usar nos filtros abaixo'}
            </button>
          </div>
        </section>
      )}

      {!conta && <p className="aviso-ia">Crie sua conta gratuita para guardar respostas, favoritos e revisões entre acessos e dispositivos. <a href={href('/conta')}>Criar minha conta</a></p>}

      <section className="tr-etapa">
        <header className="tr-etapa__cabeca">
          <span className="tr-etapa__numero">1</span>
          <div>
            <h2>Assuntos</h2>
            <p>{selecionados ? `${selecionados} ${selecionados === 1 ? 'selecionado' : 'selecionados'}. Toque de novo para desmarcar.` : 'Marque um ou mais temas. Abra os subtemas para um recorte mais fino.'}</p>
          </div>
        </header>
        <SeletorArvore
          variante="lista"
          arvore={arvore}
          temas={filtros.temas}
          subtemas={filtros.subtemas}
          porTema={contagens?.porTema ?? {}}
          porSubtema={contagens?.porSubtema ?? {}}
          aoMudar={(temas, subtemas) => atualizar({ temas, subtemas })}
        />
        <div className="tr-busca">
          <Icone nome="busca" tamanho={18} />
          <label className="so-leitor" htmlFor="busca-acervo">Buscar no texto das questões</label>
          <input
            id="busca-acervo"
            className="entrada"
            type="search"
            name="busca"
            autoComplete="off"
            placeholder="Ou busque por palavras: Salter-Harris, Weber, manguito…"
            value={filtros.busca}
            onChange={(e) => atualizar({ busca: e.target.value })}
          />
        </div>
        {carregandoBusca && <span className="campo__auxilio">Carregando o texto das questões…</span>}
      </section>

      <section className="tr-etapa">
        <header className="tr-etapa__cabeca">
          <span className="tr-etapa__numero">2</span>
          <div>
            <h2>Situação</h2>
            <p>Vem do que você já respondeu. Refazer o que errou rende mais do que começar sempre por uma nova.</p>
          </div>
        </header>
        <div className="tr-pilulas" id="filtro-situacao">
          {SITUACOES.map((situacao) => (
            <button
              key={situacao}
              type="button"
              className="tr-pilula"
              aria-pressed={filtros.situacao === situacao}
              disabled={situacao !== 'todas' && !(contagens?.porSituacao[situacao] ?? 0)}
              onClick={() => atualizar({ situacao })}
            >
              {ROTULO_SITUACAO[situacao]}
              <span className="numerico">{contagens?.porSituacao[situacao] ?? 0}</span>
            </button>
          ))}
        </div>
      </section>

      {(temProva || temAno || Object.keys(contagens?.porDificuldade ?? {}).length > 0) && (
        <section className="tr-etapa">
          <header className="tr-etapa__cabeca">
            <span className="tr-etapa__numero">3</span>
            <div>
              <h2>Prova, ano e dificuldade</h2>
              <p>Sem marcar nada, a sessão considera o acervo inteiro.</p>
            </div>
          </header>
          {temProva && (
            <div className="tr-grupo">
              <span className="tr-grupo__rotulo">Prova</span>
              <div className="tr-pilulas">
                {gruposProva.map((grupo) => {
                  const marcado = grupo.provas.some((p) => filtros.provas.includes(p))
                  const quantidade = grupo.provas.reduce((soma, p) => soma + (contagens?.porProva[p] ?? 0), 0)
                  return (
                    <button
                      key={grupo.rotulo}
                      type="button"
                      className="tr-pilula"
                      aria-pressed={marcado}
                      onClick={() =>
                        atualizar({
                          provas: marcado
                            ? filtros.provas.filter((x) => !grupo.provas.includes(x))
                            : [...filtros.provas, ...grupo.provas.filter((p) => !filtros.provas.includes(p))],
                        })
                      }
                    >
                      {grupo.rotulo}
                      <span className="numerico">{quantidade}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {temAno && (
            <div className="tr-grupo">
              <span className="tr-grupo__rotulo">Ano</span>
              <div className="tr-pilulas">
                {[...(indice?.anos ?? [])].sort((a, b) => b - a).map((ano) => (
                  <button
                    key={ano}
                    type="button"
                    className="tr-pilula"
                    aria-pressed={filtros.anos.includes(ano)}
                    onClick={() =>
                      atualizar({
                        anos: filtros.anos.includes(ano)
                          ? filtros.anos.filter((x) => x !== ano)
                          : [...filtros.anos, ano],
                      })
                    }
                  >
                    {ano}
                  </button>
                ))}
              </div>
            </div>
          )}
          {Object.keys(contagens?.porDificuldade ?? {}).length > 0 && (
            <div className="tr-grupo">
              <span className="tr-grupo__rotulo">Dificuldade</span>
              <div className="tr-pilulas">
                {DIFICULDADES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="tr-pilula"
                    aria-pressed={filtros.dificuldades.includes(d)}
                    onClick={() =>
                      atualizar({
                        dificuldades: filtros.dificuldades.includes(d)
                          ? filtros.dificuldades.filter((x) => x !== d)
                          : [...filtros.dificuldades, d],
                      })
                    }
                  >
                    {ROTULO_DIFICULDADE[d]}
                    <span className="numerico">{contagens?.porDificuldade[d] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="tr-etapa" id="etapa-formato">
        <header className="tr-etapa__cabeca">
          <span className="tr-etapa__numero">{temProva || temAno ? 4 : 3}</span>
          <div>
            <h2>Formato</h2>
            <p>Quantidade, modo de estudo e detalhes da sessão.</p>
          </div>
        </header>
        <div className="tr-grupo">
          <span className="tr-grupo__rotulo">Quantas questões</span>
          <div className="tr-pilulas" id="filtro-limite">
            {LIMITES.map((n) => (
              <button key={n} type="button" className="tr-pilula" aria-pressed={filtros.limite === n} disabled={total < n} onClick={() => atualizar({ limite: n })}>
                {n}
              </button>
            ))}
            <button type="button" className="tr-pilula" aria-pressed={filtros.limite === null} onClick={() => atualizar({ limite: null })}>Todas</button>
            <label className="tr-quantidade">
              <span className="so-leitor">Quantidade personalizada</span>
              <input className="entrada" type="number" min="1" step="1" max={Math.max(total, 1)} value={filtros.limite ?? ''} placeholder="Outra" onChange={(e) => atualizar({ limite: e.target.value ? Math.max(1, Math.min(total || 1, Math.floor(Number(e.target.value)) || 1)) : null })} />
            </label>
          </div>
        </div>
        <div className="tr-modos" role="radiogroup" aria-label="Como você quer estudar">
          <button type="button" role="radio" aria-checked={!simulado} className="tr-modo" onClick={() => definirSimulado(false)}>
            <Icone nome="livro" tamanho={20} />
            <strong>Treino livre</strong>
            <span>Gabarito e comentário logo após cada resposta.</span>
          </button>
          <button type="button" role="radio" aria-checked={simulado} className="tr-modo" onClick={() => definirSimulado(true)}>
            <Icone nome="calendario" tamanho={20} />
            <strong>Simulado com tempo</strong>
            <span>Gabarito guardado até entregar, como na prova.</span>
          </button>
        </div>
        {simulado && (
          <div className="tr-grupo">
            <span className="tr-grupo__rotulo">Duração</span>
            <div className="tr-pilulas" id="filtro-duracao">
              {DURACOES.map(([valor, rotulo]) => (
                <button key={valor} type="button" className="tr-pilula" aria-pressed={minutos === valor} onClick={() => definirMinutos(valor)}>{rotulo}</button>
              ))}
            </div>
          </div>
        )}
        <details className="tr-mais">
          <summary>Mais opções</summary>
          <div className="tr-mais__lista">
            {temImagem && (
              <label className="caixa">
                <input type="checkbox" checked={filtros.comImagem} onChange={(e) => atualizar({ comImagem: e.target.checked })} />
                <span>Só questões com imagem no enunciado</span>
              </label>
            )}
            {temComentario && (
              <label className="caixa">
                <input type="checkbox" checked={filtros.comComentario} onChange={(e) => atualizar({ comComentario: e.target.checked })} />
                <span>Só questões com comentário</span>
              </label>
            )}
            {temAnulada && (
              <label className="caixa">
                <input type="checkbox" checked={filtros.incluirAnuladas} onChange={(e) => atualizar({ incluirAnuladas: e.target.checked })} />
                <span>Incluir questões anuladas (não contam no desempenho)</span>
              </label>
            )}
            <label className="caixa">
              <input type="checkbox" checked={filtros.embaralhar} onChange={(e) => atualizar({ embaralhar: e.target.checked })} />
              <span>Embaralhar a ordem</span>
            </label>
            <label className="caixa">
              <input type="checkbox" checked={!mostrarEtiquetas} onChange={(e) => definirEtiquetas(!e.target.checked)} />
              <span>
                Esconder as etiquetas de assunto até responder
                <span className="campo__auxilio" style={{ marginTop: 0 }}>
                  Ler "Salter-Harris" antes do enunciado já elimina metade das alternativas. Vale
                  para todas as sessões e dá para trocar no meio, pela tecla E.
                </span>
              </span>
            </label>
          </div>
        </details>
      </section>

      {total === 0 && (
        <Estado titulo="Nenhuma questão atende a esse recorte.">
          <p>
            {filtros.busca.trim()
              ? `Nenhuma questão contém "${filtros.busca.trim()}". A busca procura no enunciado, nas alternativas e nas etiquetas, e exige todas as palavras.`
              : 'Tire um filtro por vez. O botão volta a habilitar assim que houver questões.'}
          </p>
        </Estado>
      )}

      <div className="tr-barra" role="region" aria-label="Resumo da sessão">
        <div className="tr-barra__resumo">
          <strong>{total === 0 ? 'Nenhuma questão' : `${quantidadeSessao} ${quantidadeSessao === 1 ? 'questão' : 'questões'}`}</strong>
          <span>
            {total > 0 && `cerca de ${estimativaMinutos} min · `}
            {soSimulados ? 'OrtoQuestões Simulados · ' : ''}
            {selecionados ? `${selecionados} ${selecionados === 1 ? 'assunto' : 'assuntos'}` : 'acervo misto'}
            {desempenhoAnterior !== null ? ` · seu acerto: ${desempenhoAnterior}%` : ''}
          </span>
        </div>
        <button type="button" className="botao botao--fantasma tr-barra__limpar" onClick={() => definirFiltros({ ...FILTROS_VAZIOS, limite: 10 })}>Limpar</button>
        <button type="button" className="botao botao--principal botao--grande" disabled={total === 0 || carregandoBusca} onClick={comecar}>
          {total === 0 ? 'Ajuste os filtros' : simulado ? (
            <>Iniciar simulado · <span className="botao__contador">{quantidadeSessao}</span></>
          ) : (
            <>Responder <span className="botao__contador">{quantidadeSessao}</span> {quantidadeSessao === 1 ? 'questão' : 'questões'}</>
          )}
        </button>
      </div>
    </div>
  )
}

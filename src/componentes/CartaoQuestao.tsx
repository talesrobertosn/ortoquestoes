import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComentarioIA, Letra, Questao, Resposta } from '../dados/tipos'
import { ROTULO_DIFICULDADE } from '../dados/tipos'
import { recurso } from '../config'
import { href } from '../util/rotas'
import { EstrelaCheia, Icone } from './Icone'
import { ContribuirComentario } from './ContribuirComentario'
import { usarEtiquetas } from '../estado/preferencias'
import { usarComentarioIA } from '../dados/comentarios'
import { usarIndice } from '../dados/usarIndice'

interface Props {
  questao: Questao
  numero?: number
  total?: number
  resposta?: Resposta
  riscadas: Letra[]
  favorita: boolean
  marcadaRevisao: boolean
  aoResponder: (letra: Letra, correta: boolean | null, segundos: number) => void
  aoRiscar: (letra: Letra) => void
  aoFavoritar: () => void
  aoRevisar: () => void
  aoAvancar?: () => void
  atalhosAtivos?: boolean
  /**
   * Em simulado fica falso: a resposta é registrada, mas o gabarito só aparece
   * no fim. Enquanto isso a alternativa continua trocável, como numa prova.
   */
  revelarResposta?: boolean
}

export function CartaoQuestao({
  questao,
  numero,
  total,
  resposta,
  riscadas,
  favorita,
  marcadaRevisao,
  aoResponder,
  aoRiscar,
  aoFavoritar,
  aoRevisar,
  aoAvancar,
  atalhosAtivos = true,
  revelarResposta = true,
}: Props) {
  const [escolhida, definirEscolhida] = useState<Letra | null>(null)
  const [copiado, definirCopiado] = useState(false)
  const inicio = useRef<number>(Date.now())
  const respondida = !!resposta
  const mostrarGabarito = respondida && revelarResposta
  const marcada = escolhida ?? resposta?.escolhida ?? null
  const travada = mostrarGabarito

  useEffect(() => {
    definirEscolhida(null)
    definirCopiado(false)
    inicio.current = Date.now()
  }, [questao.id])

  const letrasDisponiveis = useMemo(
    () => questao.alternativas.map((a) => a.letra),
    [questao.alternativas],
  )

  function confirmar(letra: Letra) {
    if (travada) return
    const correta = questao.anulada || !questao.gabarito ? null : letra === questao.gabarito
    const segundos = Math.max(1, Math.round((Date.now() - inicio.current) / 1000))
    aoResponder(letra, correta, segundos)
  }

  /** Em simulado marcar já registra; no treino comum ainda passa pelo botão. */
  function escolher(letra: Letra) {
    if (travada) return
    definirEscolhida(letra)
    if (!revelarResposta) confirmar(letra)
  }

  const { mostrarEtiquetas, alternarEtiquetas } = usarEtiquetas()
  const { indice } = usarIndice()
  const { comentario: comentarioIA, carregando: carregandoIA } = usarComentarioIA(
    questao,
    indice,
    mostrarGabarito,
  )

  useEffect(() => {
    if (!atalhosAtivos) return
    function aoTeclar(evento: KeyboardEvent) {
      const alvo = evento.target as HTMLElement | null
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return

      const posicao = Number(evento.key) - 1
      if (Number.isInteger(posicao) && posicao >= 0 && posicao < letrasDisponiveis.length) {
        evento.preventDefault()
        const letra = letrasDisponiveis[posicao]
        if (travada) return
        if (evento.shiftKey) aoRiscar(letra)
        else escolher(letra)
        return
      }

      if (evento.key === 'Enter') {
        evento.preventDefault()
        if (!travada && revelarResposta && escolhida) confirmar(escolhida)
        else aoAvancar?.()
        return
      }

      const tecla = evento.key.toLowerCase()
      if (tecla === 'f') {
        evento.preventDefault()
        aoFavoritar()
      } else if (tecla === 'r') {
        evento.preventDefault()
        aoRevisar()
      } else if (tecla === 'e') {
        evento.preventDefault()
        alternarEtiquetas()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  })

  async function copiarLink() {
    const url = window.location.href.split('#')[0] + href(`/questao/${questao.id}`)
    try {
      await navigator.clipboard.writeText(url)
      definirCopiado(true)
      window.setTimeout(() => definirCopiado(false), 2500)
    } catch {
      window.prompt('Copie o link desta questão:', url)
    }
  }

  const semGabarito = !questao.gabarito && !questao.anulada
  // Etiquetas de assunto adiantam a resposta; quando escondidas, voltam junto
  // com o gabarito, que é quando elas servem para estudar em vez de entregar.
  const etiquetasVisiveis = mostrarEtiquetas || mostrarGabarito

  return (
    <article className="cartao questao-impressa" aria-label={`Questão ${numero ?? ''}`}>
      <div className="cartao__corpo">
        <div className="questao__topo">
          {questao.ano && <span className="etiqueta etiqueta--dado">{questao.ano}</span>}
          {questao.prova && <span className="etiqueta">{questao.prova}</span>}
          {etiquetasVisiveis && (
            <>
              <span className="etiqueta">{questao.tema}</span>
              {questao.subtemas.slice(0, 2).map((s) => (
                <span className="etiqueta" key={s}>
                  {s}
                </span>
              ))}
              {questao.dificuldade && (
                <span className="etiqueta">{ROTULO_DIFICULDADE[questao.dificuldade]}</span>
              )}
            </>
          )}
          {questao.anulada && <span className="etiqueta etiqueta--alerta">Anulada</span>}

          <div className="questao__acoes nao-imprime">
            <button
              type="button"
              className="botao-icone"
              onClick={alternarEtiquetas}
              aria-pressed={!mostrarEtiquetas}
              aria-label={
                mostrarEtiquetas
                  ? 'Esconder as etiquetas de assunto até responder'
                  : 'Mostrar sempre as etiquetas de assunto'
              }
              title={
                mostrarEtiquetas
                  ? 'Esconder as etiquetas de assunto (E) — elas adiantam a resposta'
                  : 'Mostrar sempre as etiquetas de assunto (E)'
              }
            >
              <Icone nome={mostrarEtiquetas ? 'olho' : 'olho-riscado'} />
            </button>
            <button
              type="button"
              className="botao-icone"
              onClick={aoFavoritar}
              aria-pressed={favorita}
              aria-label={favorita ? 'Remover dos favoritos' : 'Favoritar questão'}
              title="Favoritar (F)"
            >
              {favorita ? <EstrelaCheia /> : <Icone nome="estrela" />}
            </button>
            <button
              type="button"
              className="botao-icone"
              onClick={aoRevisar}
              aria-pressed={marcadaRevisao}
              aria-label={
                marcadaRevisao ? 'Desmarcar para revisão' : 'Marcar questão para revisão'
              }
              title="Marcar para revisão (R)"
            >
              <Icone nome="alerta" />
            </button>
            <button
              type="button"
              className="botao-icone"
              onClick={copiarLink}
              aria-label="Copiar link direto desta questão"
              title="Copiar link"
            >
              <Icone nome="link" />
            </button>
          </div>
        </div>

        {numero && total && (
          <p className="meta numerico" style={{ marginBottom: '0.5rem' }}>
            Questão {numero} de {total}
          </p>
        )}

        <div className="questao__enunciado">{questao.enunciado}</div>

        {questao.figuraPendente && (
          <div className="estado" style={{ marginBottom: '1.25rem' }}>
            <p className="estado__titulo">A figura desta questão ainda não está aqui.</p>
            <p style={{ margin: 0 }}>
              O enunciado se refere a uma imagem que não veio no arquivo de origem. Ela entra assim
              que for recuperada — até lá, esta questão fica incompleta.
            </p>
          </div>
        )}

        {questao.imagens.length > 0 && (
          <div className="questao__figuras">
            {questao.imagens.map((imagem) => (
              <figure className="questao__figura" key={imagem.arquivo}>
                <a
                  href={recurso(`imagens/${imagem.arquivo}`)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir imagem em tamanho original"
                >
                  <img
                    src={recurso(`imagens/${imagem.arquivo}`)}
                    alt={imagem.legenda ?? `Figura da questão ${questao.id}`}
                    loading="lazy"
                    width={imagem.largura ?? undefined}
                    height={imagem.altura ?? undefined}
                    style={{ maxHeight: '22rem', width: 'auto' }}
                  />
                </a>
                {imagem.legenda && <figcaption>{imagem.legenda}</figcaption>}
              </figure>
            ))}
          </div>
        )}

        <ul className="alternativas">
          {questao.alternativas.map((alternativa, i) => {
            const letra = alternativa.letra
            const riscada = riscadas.includes(letra)
            const classes = ['alternativa']
            let marca: { texto: string; icone: 'certo' | 'errado' } | null = null

            if (mostrarGabarito) {
              const eGabarito = questao.gabarito === letra
              const eEscolhida = resposta!.escolhida === letra
              if (eGabarito) {
                classes.push('alternativa--certa')
                marca = { texto: 'Gabarito', icone: 'certo' }
              }
              if (eEscolhida && !eGabarito) {
                classes.push('alternativa--errada')
                marca = { texto: 'Sua resposta', icone: 'errado' }
              }
              if (eEscolhida && eGabarito) marca = { texto: 'Sua resposta, correta', icone: 'certo' }
            } else if (marcada === letra) {
              classes.push('alternativa--escolhida')
            }
            if (riscada) classes.push('alternativa--riscada')

            return (
              <li key={letra} className="alternativa-envelope">
                <button
                  type="button"
                  className={classes.join(' ')}
                  onClick={() => escolher(letra)}
                  disabled={travada}
                  aria-pressed={!travada ? marcada === letra : undefined}
                >
                  <span className="alternativa__letra" aria-hidden="true">
                    {letra}
                  </span>
                  <span className="alternativa__texto">
                    <span className="so-leitor">Alternativa {letra}. </span>
                    {alternativa.texto}
                  </span>
                  {marca && (
                    <span className="alternativa__marca">
                      <Icone nome={marca.icone} tamanho={16} />
                      {marca.texto}
                    </span>
                  )}
                </button>
                {!travada && (
                  <button
                    type="button"
                    className="riscar nao-imprime"
                    onClick={() => aoRiscar(letra)}
                    aria-pressed={riscada}
                    aria-label={`${riscada ? 'Desfazer risco na' : 'Riscar'} alternativa ${letra}`}
                    title={`Riscar (Shift + ${i + 1})`}
                  >
                    <Icone nome="riscar" tamanho={16} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        {!revelarResposta ? (
          <div className="resultado resultado--neutro" role="status">
            {marcada
              ? `Resposta marcada: ${marcada}. Pode trocar até o fim do simulado.`
              : 'Marque uma alternativa. O gabarito aparece quando o simulado terminar.'}
          </div>
        ) : !respondida ? (
          <div className="linha nao-imprime acao-responder">
            <button
              type="button"
              className="botao botao--principal botao--grande"
              disabled={!escolhida}
              onClick={() => escolhida && confirmar(escolhida)}
            >
              {escolhida ? `Responder ${escolhida}` : 'Escolha uma alternativa'}
            </button>
            <span className="meta so-teclado">
              Teclas <kbd>1</kbd>–<kbd>{letrasDisponiveis.length}</kbd> selecionam,{' '}
              <kbd>Enter</kbd> confirma
            </span>
          </div>
        ) : (
          <Resultado questao={questao} resposta={resposta!} />
        )}

        {mostrarGabarito && (
          <div className="comentario">
            {questao.comentario && (
              <div className="bloco-comentario">
                <p className="comentario__titulo">COMENTÁRIO DO AUTOR</p>
                <div style={{ whiteSpace: 'pre-wrap' }}>{questao.comentario}</div>
              </div>
            )}

            <ComentarioDaIA questao={questao} comentario={comentarioIA} carregando={carregandoIA} />

            <div className="bloco-comentario">
              <p className="comentario__titulo">COMENTÁRIOS DA COMUNIDADE</p>
              {(questao.comentariosComunidade?.length ?? 0) === 0 ? (
                <p className="comentario__pendente">
                  Ninguém comentou esta ainda. Se você sabe por que a resposta é essa, escreva —
                  pode mandar print do livro. Sai com o seu nome, a sua especialidade e o seu
                  serviço, e ajuda quem cair nesta questão depois de você.
                </p>
              ) : (
                <ul className="empilha" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {questao.comentariosComunidade!.map((item, i) => (
                    <li key={i} className="contribuicao">
                      <div style={{ whiteSpace: 'pre-wrap' }}>{item.texto}</div>
                      {item.imagens && item.imagens.length > 0 && (
                        <div className="questao__figuras" style={{ marginTop: '0.75rem' }}>
                          {item.imagens.map((imagem) => (
                            <figure className="questao__figura" key={imagem.arquivo}>
                              <img
                                src={recurso(`imagens/${imagem.arquivo}`)}
                                alt={imagem.legenda ?? 'Imagem enviada por colega'}
                                loading="lazy"
                                style={{ maxHeight: '18rem', width: 'auto' }}
                              />
                              {imagem.legenda && <figcaption>{imagem.legenda}</figcaption>}
                            </figure>
                          ))}
                        </div>
                      )}
                      {item.referencias && item.referencias.length > 0 && (
                        <p className="meta" style={{ marginTop: '0.5rem' }}>
                          {item.referencias.join(' · ')}
                        </p>
                      )}
                      <p className="contribuicao__credito">
                        <strong>{item.autor}</strong>
                        {[item.subespecialidade || item.especialidade, item.centro]
                          .filter(Boolean)
                          .map((parte) => ` · ${parte}`)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {mostrarGabarito && (
                <div className="linha nao-imprime" style={{ marginTop: '0.75rem' }}>
                  <ContribuirComentario questao={questao} />
                </div>
              )}
            </div>

            {questao.referencias.length > 0 && (
              <>
                <p className="comentario__titulo" style={{ marginTop: '1rem' }}>
                  REFERÊNCIAS
                </p>
                <ul className="menor texto-2">
                  {questao.referencias.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {semGabarito && (
          <p className="meta" style={{ marginTop: '0.75rem' }}>
            Esta questão está sem gabarito confirmado no acervo e não conta no seu desempenho.
          </p>
        )}

        <div className="linha nao-imprime" style={{ marginTop: '1rem' }}>
          <a className="botao botao--fantasma" href={href(`/contato?questao=${questao.id}`)}>
            Relatar erro nesta questão
          </a>
          {copiado && <span className="meta">Link copiado.</span>}
          <span className="meta numerico questao__id">{questao.id}</span>
        </div>
      </div>
    </article>
  )
}

function Resultado({ questao, resposta }: { questao: Questao; resposta: Resposta }) {
  if (questao.anulada) {
    return (
      <div className="resultado resultado--neutro" role="status">
        <Icone nome="alerta" />
        Questão anulada na prova original. Não entra no cálculo de desempenho.
      </div>
    )
  }
  if (resposta.correta === null) {
    return (
      <div className="resultado resultado--neutro" role="status">
        <Icone nome="alerta" />
        Sem gabarito confirmado. Não entra no cálculo de desempenho.
      </div>
    )
  }
  return resposta.correta ? (
    <div className="resultado resultado--acerto" role="status">
      <Icone nome="certo" />
      Você acertou. Gabarito {questao.gabarito}.
    </div>
  ) : (
    <div className="resultado resultado--erro" role="status">
      <Icone nome="errado" />
      Você errou. Gabarito {questao.gabarito}, você marcou {resposta.escolhida}.
    </div>
  )
}


/**
 * Comentário escrito por inteligência artificial. Fica em bloco próprio e
 * anunciado como tal: um comentário errado num banco de questões é pior do que
 * comentário nenhum, e quem lê precisa saber o que tem na mão para decidir se
 * confere no livro antes de fixar aquilo.
 */
function ComentarioDaIA({
  questao,
  comentario,
  carregando,
}: {
  questao: Questao
  comentario: ComentarioIA | null
  carregando: boolean
}) {
  const erradas = questao.alternativas
    .map((a) => a.letra)
    .filter((letra) => letra !== questao.gabarito && comentario?.incorretas[letra])

  return (
    <div className="bloco-comentario">
      <p className="comentario__titulo">
        COMENTÁRIO DA INTELIGÊNCIA ARTIFICIAL
        {comentario &&
          (comentario.conferido ? (
            <span className="selo selo--conferido">conferido por médico</span>
          ) : (
            <span className="selo">não conferido</span>
          ))}
      </p>

      {carregando && <p className="comentario__pendente">Carregando o comentário…</p>}

      {!carregando && !comentario && (
        <p className="comentario__pendente">
          Esta questão ainda não tem comentário. O gabarito acima é o oficial da prova.
        </p>
      )}

      {comentario && (
        <>
          {!comentario.conferido && (
            <p className="aviso-ia">
              Texto gerado por inteligência artificial e ainda não revisado por um médico. Serve
              para orientar o raciocínio, não para substituir o livro. Achou erro?{' '}
              <a href={href(`/contato?questao=${questao.id}`)}>avise</a>.
            </p>
          )}

          {comentario.conceito && <p className="ia__conceito">{comentario.conceito}</p>}

          {questao.gabarito && (
            <div className="ia__item ia__item--certa">
              <span className="ia__letra">{questao.gabarito}</span>
              <div>
                <strong>Correta.</strong> {comentario.correta}
              </div>
            </div>
          )}

          {erradas.map((letra) => (
            <div className="ia__item" key={letra}>
              <span className="ia__letra">{letra}</span>
              <div>
                <strong>Incorreta.</strong> {comentario.incorretas[letra]}
              </div>
            </div>
          ))}

          {comentario.referencias && comentario.referencias.length > 0 && (
            <p className="meta" style={{ marginTop: '0.75rem' }}>
              {comentario.referencias.join(' · ')}
            </p>
          )}
        </>
      )}
    </div>
  )
}

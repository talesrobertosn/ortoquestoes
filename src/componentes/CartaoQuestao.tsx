import { lerRespondidas } from '../estado/sessao'
import { dominada, INTERVALOS } from '../estado/revisao'
import { TextoEditorial, Referencias } from './TextoEditorial'
import { NotasQuestao } from './NotasQuestao'
import { AvaliarComentario } from './AvaliarComentario'
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
  // A confiança é obrigatória de propósito: quando era opcional, os dois
  // pontos de chamada esqueceram de repassá-la e toda resposta virava
  // "seguro" no silêncio do valor padrão. O compilador agora cobra.
  aoResponder: (letra: Letra, correta: boolean | null, segundos: number, confianca: 'seguro' | 'duvida' | 'chute') => void | Promise<void>
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
  const [confianca, definirConfianca] = useState<'seguro' | 'duvida' | 'chute'>('seguro')
  const [copiado, definirCopiado] = useState(false)
  const [menuGrifo, definirMenuGrifo] = useState<{ x: number; y: number } | null>(null)
  const [grifos, definirGrifos] = useState<Array<{ left: number; top: number; width: number; height: number }>>([])
  const [modoLeitura, definirModoLeitura] = useState(false)
  const [ultimaAcao, definirUltimaAcao] = useState<{ tipo: 'favorito' | 'revisao' | 'risco'; letra?: Letra } | null>(null)
  const inicio = useRef<number>(Date.now())
  const areaDaQuestao = useRef<HTMLElement>(null)
  const grifoRecente = useRef(false)
  const ponteiro = useRef<{ tipo: string; x: number; y: number; moveu: boolean }>({ tipo: '', x: 0, y: 0, moveu: false })
  const selecaoParaGrifo = useRef<Range | null>(null)
  const respondida = !!resposta
  const mostrarGabarito = respondida && revelarResposta
  const marcada = escolhida ?? resposta?.escolhida ?? null
  const travada = mostrarGabarito

  useEffect(() => {
    definirEscolhida(null)
    definirConfianca('seguro')
    definirCopiado(false)
    definirModoLeitura(false)
    definirUltimaAcao(null)
    definirGrifos([])
    definirMenuGrifo(null)
    inicio.current = Date.now()
  }, [questao.id])

  const letrasDisponiveis = useMemo(
    () => questao.alternativas.map((a) => a.letra),
    [questao.alternativas],
  )

  const [enviando, definirEnviando] = useState(false)
  const [erroEnvio, definirErroEnvio] = useState('')
  async function confirmar(letra: Letra) {
    if (travada || enviando) return
    definirErroEnvio('')
    const correta = questao.anulada || !questao.gabarito ? null : letra === questao.gabarito
    const segundos = Math.max(1, Math.round((Date.now() - inicio.current) / 1000))
    definirEnviando(true)
    try { await aoResponder(letra, correta, segundos, confianca) }
    catch (erro) {
      // Nunca falhar em silêncio: o que der errado aparece embaixo do botão.
      definirErroEnvio(erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro))
    }
    finally { definirEnviando(false) }
  }

  /** Em simulado marcar já registra; no treino comum ainda passa pelo botão. */
  function escolher(letra: Letra, origem: 'ponteiro' | 'teclado' = 'teclado') {
    if (travada) return
    if (grifoRecente.current) return
    const selecao = window.getSelection()
    if (selecao && !selecao.isCollapsed) {
      // Arrastar o mouse sobre uma alternativa é leitura/grifo, não uma
      // resposta. Toque é sempre resposta: no Chrome do Android sobra texto
      // selecionado com facilidade (toque um pouco mais longo, "Tocar para
      // pesquisar", seleção de outra questão) e isso travava a escolha.
      const arrasto = origem === 'ponteiro' && ponteiro.current.tipo === 'mouse' && ponteiro.current.moveu
      if (arrasto) { atualizarSelecao(); return }
      selecao.removeAllRanges()
      definirMenuGrifo(null)
    }
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

  /** O grifo é deliberadamente só visual: não escreve em localStorage e some no F5. */
  function atualizarSelecao() {
    const selecao = window.getSelection()
    if (selecao && !selecao.isCollapsed && areaDaQuestao.current?.contains(selecao.anchorNode)) {
      const faixa = selecao.getRangeAt(0).cloneRange()
      const retangulo = faixa.getBoundingClientRect()
      selecaoParaGrifo.current = faixa
      definirMenuGrifo({ x: retangulo.left + retangulo.width / 2, y: Math.max(8, retangulo.top - 10) })
    } else {
      selecaoParaGrifo.current = null
      definirMenuGrifo(null)
    }
  }

  function grifarSelecao() {
    const faixa = selecaoParaGrifo.current
    if (!faixa) return
    // Fecha primeiro; no próximo quadro o React já terminou de atualizar o
    // menu e o mark não será removido por uma reconciliação da interface.
    definirMenuGrifo(null)
    selecaoParaGrifo.current = null
    window.requestAnimationFrame(() => aplicarGrifo(faixa))
  }

  function aplicarGrifo(faixa: Range) {
    const caixa = areaDaQuestao.current?.getBoundingClientRect()
    if (!caixa) return
    const linhas = [...faixa.getClientRects()].map((r) => ({
      left: r.left - caixa.left,
      top: r.top - caixa.top,
      width: r.width,
      height: r.height,
    })).filter((r) => r.width > 0 && r.height > 0)
    if (linhas.length) definirGrifos((atuais) => [...atuais, ...linhas])
    window.getSelection()?.removeAllRanges()
    grifoRecente.current = true
    window.setTimeout(() => { grifoRecente.current = false }, 0)
  }
  function executarAcao(tipo: 'favorito' | 'revisao' | 'risco', letra?: Letra) {
    if (tipo === 'favorito') aoFavoritar()
    if (tipo === 'revisao') aoRevisar()
    if (tipo === 'risco' && letra) aoRiscar(letra)
    definirUltimaAcao({ tipo, letra })
  }
  function desfazerUltimaAcao() {
    const acao = ultimaAcao
    if (!acao) return
    if (acao.tipo === 'favorito') aoFavoritar()
    if (acao.tipo === 'revisao') aoRevisar()
    if (acao.tipo === 'risco' && acao.letra) aoRiscar(acao.letra)
    definirUltimaAcao(null)
  }

  const semGabarito = !questao.gabarito && !questao.anulada
  const historicoDaQuestao = lerRespondidas()[questao.id]?.historico ?? []
  // Etiquetas de assunto adiantam a resposta; quando escondidas, voltam junto
  // com o gabarito, que é quando elas servem para estudar em vez de entregar.
  const etiquetasVisiveis = mostrarEtiquetas || mostrarGabarito

  return (
    <article className="cartao questao-impressa" aria-label={`Questão ${numero ?? ''}`} ref={areaDaQuestao} onMouseUp={atualizarSelecao}>
      {grifos.map((r, i) => <span key={i} className="grifo-overlay" style={{ left: r.left, top: r.top, width: r.width, height: r.height }} aria-hidden="true" />)}
      <div className="cartao__corpo">
        <div className="qz-topo">
          <div className="qz-topo__info">
            {numero && total ? <span className="qz-numero">Questão {numero}<small> de {total}</small></span> : <span className="qz-numero">Questão</span>}
            {(questao.prova || questao.ano) && <span className="qz-origem">{[questao.prova, questao.ano].filter(Boolean).join(' · ')}</span>}
            {questao.anulada && <span className="qz-chip qz-chip--alerta">Anulada</span>}
          </div>

          <div className="qz-ferramentas nao-imprime" role="toolbar" aria-label="Ações da questão">
            <button
              type="button"
              className="qz-ferramenta"
              onClick={alternarEtiquetas}
              aria-pressed={!mostrarEtiquetas}
              aria-label={
                mostrarEtiquetas
                  ? 'Esconder as etiquetas de assunto até responder'
                  : 'Mostrar sempre as etiquetas de assunto'
              }
              title={
                mostrarEtiquetas
                  ? 'Esconder as etiquetas de assunto (E): elas adiantam a resposta'
                  : 'Mostrar sempre as etiquetas de assunto (E)'
              }
            >
              <Icone nome={mostrarEtiquetas ? 'olho' : 'olho-riscado'} tamanho={18} />
            </button>
            <button
              type="button"
              className={'qz-ferramenta' + (favorita ? ' qz-ferramenta--ouro' : '')}
              onClick={() => executarAcao('favorito')}
              aria-pressed={favorita}
              aria-label={favorita ? 'Remover dos favoritos' : 'Favoritar questão'}
              title="Favoritar (F)"
            >
              {favorita ? <EstrelaCheia tamanho={18} /> : <Icone nome="estrela" tamanho={18} />}
            </button>
            <button
              type="button"
              className={'qz-ferramenta' + (marcadaRevisao ? ' qz-ferramenta--ativa' : '')}
              onClick={() => executarAcao('revisao')}
              aria-pressed={marcadaRevisao}
              aria-label={
                marcadaRevisao ? 'Desmarcar para revisão' : 'Marcar questão para revisão'
              }
              title="Marcar para revisão (R)"
            >
              <Icone nome="bandeira" tamanho={18} />
            </button>
            <button
              type="button"
              className={'qz-ferramenta' + (copiado ? ' qz-ferramenta--ativa' : '')}
              onClick={copiarLink}
              aria-label="Copiar link direto desta questão"
              title={copiado ? 'Link copiado' : 'Copiar link'}
            >
              <Icone nome={copiado ? 'certo' : 'link'} tamanho={18} />
            </button>
            {mostrarGabarito && <button type="button" className={'qz-ferramenta' + (modoLeitura ? ' qz-ferramenta--ativa' : '')} onClick={() => definirModoLeitura(atual => !atual)} aria-pressed={modoLeitura} aria-label={modoLeitura ? 'Mostrar alternativas' : 'Ler comentário sem alternativas'} title={modoLeitura ? 'Mostrar alternativas' : 'Modo leitura'}><Icone nome="livro" tamanho={18} /></button>}
          </div>
        </div>

        {(etiquetasVisiveis || questao.prova || questao.ano) && (
          <div className={'qz-etiquetas' + (etiquetasVisiveis ? '' : ' qz-etiquetas--so-origem')}>
            {(questao.prova || questao.ano) && <span className="qz-chip qz-chip--origem">{[questao.prova, questao.ano].filter(Boolean).join(' · ')}</span>}
            {etiquetasVisiveis && <>
              <span className="qz-chip qz-chip--tema">{questao.tema}</span>
              {questao.subtemas.slice(0, 2).map((s) => <span className="qz-chip" key={s}>{s}</span>)}
              {questao.dificuldade && <span className="qz-chip qz-chip--dificuldade">{ROTULO_DIFICULDADE[questao.dificuldade]}</span>}
            </>}
          </div>
        )}

        {questao.prova?.startsWith('SBQ') && (
          <p className="meta origem-questao">
            Questão elaborada pelo OrtoQuestões no padrão das provas da SBQ e do Fellowship de
            Quadril, a partir do livro <em>The Adult Hip</em> (Callaghan et al.) — não é uma
            reprodução de nenhuma prova oficial, que não é de acesso público.
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

        {!modoLeitura && <ul className="alternativas">
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
                  onPointerDown={(e) => { ponteiro.current = { tipo: e.pointerType, x: e.clientX, y: e.clientY, moveu: false } }}
                  onPointerUp={(e) => { ponteiro.current.moveu = Math.hypot(e.clientX - ponteiro.current.x, e.clientY - ponteiro.current.y) > 6 }}
                  onClick={() => escolher(letra, 'ponteiro')}
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
                    onClick={() => executarAcao('risco', letra)}
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
        </ul>}

        {!revelarResposta ? (
          <div className="resultado resultado--neutro" role="status">
            {marcada
              ? `Resposta marcada: ${marcada}. Pode trocar até o fim do simulado.`
              : 'Marque uma alternativa. O gabarito aparece quando o simulado terminar.'}
          </div>
        ) : !respondida ? (
          <div className="linha nao-imprime acao-responder">
            {escolhida && <div className="grupo-opcoes confianca" role="group" aria-label="Sua confiança nesta resposta">
              {([['seguro', 'Tenho ', 'certeza'], ['duvida', 'Tenho ', 'dúvida'], ['chute', 'Foi um ', 'chute']] as const).map(([valor, prefixo, rotulo]) => <button key={valor} type="button" className="opcao-segmento" aria-pressed={confianca === valor} onClick={() => definirConfianca(valor)}><span className="confianca__prefixo">{prefixo}</span><span className="confianca__rotulo">{rotulo}</span></button>)}
            </div>}
            <button
              type="button"
              className="botao botao--principal botao--grande"
              disabled={!escolhida || enviando}
              aria-busy={enviando}
              onClick={() => escolhida && void confirmar(escolhida)}
            >
              {enviando ? 'Registrando…' : escolhida ? `Responder ${escolhida}` : 'Escolha uma alternativa'}
            </button>
            {erroEnvio && <p className="aviso-formulario aviso-formulario--erro" role="alert">Não foi possível registrar a resposta. Tente de novo; se continuar, mande um print desta mensagem. <small>({erroEnvio})</small></p>}
            {escolhida && <span className="campo__auxilio acao-responder__dica">Acerto com dúvida ou chute volta antes para revisão.</span>}
            <span className="meta so-teclado">
              Teclas <kbd>1</kbd>–<kbd>{letrasDisponiveis.length}</kbd> selecionam,{' '}
              <kbd>Enter</kbd> confirma
            </span>
          </div>
        ) : !modoLeitura && (
          <Resultado questao={questao} resposta={resposta!} />
        )}

        {mostrarGabarito && (
          <div className="comentario">
            {resposta?.correta !== null && <p className="aviso-ia">{resposta?.correta === false ? 'Incluída em Revisar hoje. Leia a explicação e tente novamente em outra sessão.' : dominada(lerRespondidas()[questao.id]) ? 'Ciclo de revisão completo. Você pode revisitá-la pelo filtro Dominadas.' : resposta.confianca === 'chute' ? 'Acerto por chute: ela volta amanhã para você confirmar o raciocínio.' : resposta.confianca === 'duvida' ? 'Acerto com dúvida: ela volta antes para reforçar o conceito.' : `Acerto seguro registrado. Ela volta em ${INTERVALOS.seguro.join(', ').replace(/, (\d+)$/, ' e $1')} dias, conforme você for acertando.`}</p>}
            {questao.comentario && (
              <div className="bloco-comentario">
                <p className="comentario__titulo">Comentário do autor</p>
                <TextoEditorial texto={questao.comentario} />
              </div>
            )}

            <ComentarioDaIA questao={questao} comentario={comentarioIA} carregando={carregandoIA} escolhida={resposta?.escolhida ?? null} />

            <div className="bloco-comentario">
              <p className="comentario__titulo">Comentários da comunidade</p>
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
                      <TextoEditorial texto={item.texto} />
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
                      <Referencias itens={item.referencias} />
                      <p className="contribuicao__credito">
                        <strong>{item.autor}</strong>
                        {[
                          item.subespecialidade || item.especialidade,
                          item.centro,
                          formatarData(item.data),
                        ]
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

            <Referencias itens={questao.referencias} />
          </div>
        )}

        {semGabarito && (
          <p className="meta" style={{ marginTop: '0.75rem' }}>
            Esta questão está sem gabarito confirmado no acervo e não conta no seu desempenho.
          </p>
        )}

        <div className="qz-extras nao-imprime">
          <NotasQuestao key={questao.id} id={questao.id} />
          {historicoDaQuestao.length > 0 && <details className="notas-questao qz-historico">
            <summary><Icone nome="relogio" tamanho={18} /> Histórico desta questão <span className="qz-contador">{historicoDaQuestao.length}</span></summary>
            <ol className="qz-linha-tempo">
              {historicoDaQuestao.map((item, i) => (
                <li key={i} className={item.correta === true ? 'qz-linha-tempo--acerto' : item.correta === false ? 'qz-linha-tempo--erro' : ''}>
                  <Icone nome={item.correta === true ? 'certo' : item.correta === false ? 'errado' : 'alerta'} tamanho={14} />
                  <span>{new Date(item.em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                  {item.confianca !== 'seguro' && <small>{item.confianca === 'duvida' ? 'dúvida' : 'chute'}</small>}
                </li>
              ))}
            </ol>
          </details>}
        </div>

        <div className="qz-rodape nao-imprime">
          <a className="qz-rodape__link" href={href(`/contato?questao=${questao.id}`)}>
            <Icone nome="alerta" tamanho={16} /> Relatar erro nesta questão
          </a>
          {ultimaAcao && <button type="button" className="qz-rodape__link" onClick={desfazerUltimaAcao}><Icone nome="reiniciar" tamanho={16} /> Desfazer</button>}
          <span className="qz-rodape__id numerico">{questao.id}</span>
        </div>
      </div>
      {menuGrifo && (
        <button
          type="button"
          className="menu-grifo nao-imprime"
          style={{ left: menuGrifo.x, top: menuGrifo.y }}
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={grifarSelecao}
          aria-label="Grifar a seleção em amarelo"
        >
          <Icone nome="riscar" tamanho={15} /> Grifar
        </button>
      )}
      {grifos.length > 0 && !menuGrifo && <button type="button" className="botao botao--fantasma nao-imprime" style={{ position: 'absolute', right: '1rem', bottom: '1rem', zIndex: 3 }} onClick={() => definirGrifos(atual => atual.slice(0, -1))}>Desfazer último grifo</button>}
    </article>
  )
}

/**
 * Data do comentário da comunidade no crédito. Vem como "AAAA-MM-DD" e é
 * montada com `new Date(ano, mês, dia)` de propósito: `new Date('2026-09-09')`
 * seria lida como UTC e, em fuso negativo, mostraria o dia anterior.
 */
function formatarData(iso?: string | null) {
  if (!iso) return null
  const partes = iso.split('-').map(Number)
  if (partes.length !== 3 || partes.some(Number.isNaN)) return null
  const [ano, mes, dia] = partes
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR')
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
 * Comentário escrito por inteligência artificial. A origem do texto fica
 * registrada no menu de referências (não na visão direta), mas o conteúdo em
 * si é tratado como qualquer explicação: precisa, com conceito-chave e
 * justificativa alternativa a alternativa.
 */
function ComentarioDaIA({
  questao,
  comentario,
  carregando,
  escolhida,
}: {
  questao: Questao
  comentario: ComentarioIA | null
  carregando: boolean
  escolhida: Letra | null
}) {
  const erradas = questao.alternativas
    .map((a) => a.letra)
    .filter((letra) => letra !== questao.gabarito && comentario?.incorretas[letra])

  const textoAlternativa = (letra: string) =>
    questao.alternativas.find((a) => a.letra === letra)?.texto

  return (
    <div className="bloco-comentario cm">
      <header className="cm-cabeca">
        <span className="cm-cabeca__icone"><Icone nome="livro" tamanho={20} /></span>
        <div>
          <p className="cm-cabeca__titulo">Comentário</p>
          <p className="cm-cabeca__sub">O conceito, por que a correta está certa e por que as outras não servem.</p>
        </div>
      </header>

      {carregando && <p className="comentario__pendente">Carregando o comentário…</p>}

      {!carregando && !comentario && (
        <p className="comentario__pendente">
          Esta questão ainda não tem comentário. O gabarito acima é o oficial da prova.
        </p>
      )}

      {comentario && (
        <>
          {comentario.alerta && (
            <p className="aviso-ia aviso-ia--gabarito">
              <strong>Atenção ao gabarito desta questão.</strong> {comentario.alerta}
            </p>
          )}

          {comentario.conceito && (
            <section className="cm-conceito">
              <p className="cm-rotulo"><Icone nome="alvo" tamanho={16} /> Conceito-chave</p>
              <TextoEditorial texto={comentario.conceito} />
            </section>
          )}

          <div className="cm-alternativas">
            {questao.gabarito && (
              <article className="cm-alt cm-alt--certa">
                <header className="cm-alt__cabeca">
                  <span className="cm-alt__letra">{questao.gabarito}</span>
                  <strong className="cm-alt__texto">{textoAlternativa(questao.gabarito) ?? 'Alternativa correta'}</strong>
                  <span className="cm-selo cm-selo--certa"><Icone nome="certo" tamanho={13} /> Correta</span>
                  {escolhida === questao.gabarito && <span className="cm-selo">Sua resposta</span>}
                </header>
                <TextoEditorial texto={comentario.correta} />
              </article>
            )}

            {erradas.map((letra) => (
              <article className={'cm-alt' + (escolhida === letra ? ' cm-alt--marcada' : '')} key={letra}>
                <header className="cm-alt__cabeca">
                  <span className="cm-alt__letra">{letra}</span>
                  <strong className="cm-alt__texto">{textoAlternativa(letra) ?? 'Alternativa'}</strong>
                  {escolhida === letra
                    ? <span className="cm-selo cm-selo--erro"><Icone nome="errado" tamanho={13} /> Sua resposta</span>
                    : <span className="cm-selo cm-selo--neutro">Incorreta</span>}
                </header>
                <TextoEditorial texto={comentario.incorretas[letra]!} />
              </article>
            ))}
          </div>

          <Referencias itens={comentario.referencias} notaIA />
          <AvaliarComentario idQuestao={questao.id} />
        </>
      )}
    </div>
  )
}

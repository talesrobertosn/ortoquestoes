import { CHAVE_RESPONDIDAS } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import { dominada, INTERVALOS, type RegistroQuestao } from '../estado/revisao'
import { TextoEditorial, TextoEmLinha, Referencias } from './TextoEditorial'
import { NotasQuestao } from './NotasQuestao'
import { AvaliarComentario } from './AvaliarComentario'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { ComentarioIA, Letra, Questao, Resposta } from '../dados/tipos'
import { ROTULO_DIFICULDADE } from '../dados/tipos'
import { ROTULO_SIMULADOS } from '../config'
import { FiguraAmpliavel } from './FiguraAmpliavel'
import { href } from '../util/rotas'
import { EstrelaCheia, Icone } from './Icone'
import { ContribuirComentario } from './ContribuirComentario'
import { usarEtiquetas } from '../estado/preferencias'
import { usarComentarioIA } from '../dados/comentarios'
import { urlImagem } from '../dados/edicoes'
import { usarIndice } from '../dados/usarIndice'
import { RelatarErro } from './RelatarErro'
import { EditarQuestaoAdmin } from './EditarQuestaoAdmin'
import { ComoATurma, pessoas, usarTurmaNasAlternativas } from './ComoATurma'
import { usarTempoVisivel } from '../util/tempoVisivel'
import { EstudarAssunto } from '../biblioteca/EstudarAssunto'
import '../estilos/paginas/CartaoQuestao.css'

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
  aoResponder: (letra: Letra | null, correta: boolean | null, segundos: number, confianca: 'seguro' | 'duvida' | 'chute') => void | Promise<void>
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
  /**
   * Separa o tempo acumulado de cada questão por sessão (o id da sessão):
   * voltar a uma questão continua o relógio dela, e a mesma questão em outra
   * sessão começa do zero.
   */
  chaveTempo?: string
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
  chaveTempo = '',
}: Props) {
  const [escolhida, definirEscolhida] = useState<Letra | null>(null)
  // Lido uma vez e atualizado por evento: antes eram dois JSON.parse do histórico
  // inteiro a cada render (a cada segundo no simulado, por causa do cronômetro).
  const [respondidasTodas] = usarArmazenado<Record<string, RegistroQuestao>>(CHAVE_RESPONDIDAS, {})
  const [confianca, definirConfianca] = useState<'seguro' | 'duvida' | 'chute'>('seguro')
  const [copiado, definirCopiado] = useState(false)
  const [menuGrifo, definirMenuGrifo] = useState<{ x: number; y: number } | null>(null)
  const [grifos, definirGrifos] = useState<Array<{ left: number; top: number; width: number; height: number }>>([])
  const [modoLeitura, definirModoLeitura] = useState(false)
  const [ultimaAcao, definirUltimaAcao] = useState<{ tipo: 'favorito' | 'revisao' | 'risco'; letra?: Letra } | null>(null)
  // Só o tempo com a página visível, somado por questão na sessão.
  const segundosNaQuestao = usarTempoVisivel(`${chaveTempo}:${questao.id}`)
  const areaDaQuestao = useRef<HTMLElement>(null)
  const grifoRecente = useRef(false)
  const ponteiro = useRef<{ tipo: string; x: number; y: number; moveu: boolean }>({ tipo: '', x: 0, y: 0, moveu: false })
  const selecaoParaGrifo = useRef<Range | null>(null)
  const respondida = !!resposta
  const dissertativa = questao.tipo === 'dissertativa'
  // Na dissertativa, a resposta esperada aparece antes da autoavaliação; só depois ela é registrada.
  const [revelada, definirRevelada] = useState(false)
  const [textoDissertativa, definirTextoDissertativa] = useState('')
  const mostrarGabarito = (respondida || (dissertativa && revelada)) && revelarResposta
  const marcada = escolhida ?? resposta?.escolhida ?? null
  const travada = mostrarGabarito
  // Assinante: a porcentagem da turma aparece embaixo de cada alternativa, sem caixa à parte.
  const turma = usarTurmaNasAlternativas(questao, mostrarGabarito && respondida && !modoLeitura && !dissertativa)

  useEffect(() => {
    definirEscolhida(null)
    definirConfianca('seguro')
    definirCopiado(false)
    definirModoLeitura(false)
    definirUltimaAcao(null)
    definirGrifos([])
    definirMenuGrifo(null)
    definirRevelada(false)
    definirTextoDissertativa(lerRascunho(questao.id))
  }, [questao.id])

  const letrasDisponiveis = useMemo(
    () => questao.alternativas.map((a) => a.letra),
    [questao.alternativas],
  )

  const [enviando, definirEnviando] = useState(false)
  const [erroEnvio, definirErroEnvio] = useState('')
  // Errou agora (não ao rever uma questão já respondida): a página rola até o começo do comentário.
  const [errouAgora, definirErrouAgora] = useState(false)
  // Respondeu agora (não ao rever): o resultado entra com um pequeno movimento de acerto ou de erro.
  const [respondeuAgora, definirRespondeuAgora] = useState(false)
  useEffect(() => { definirErrouAgora(false); definirRespondeuAgora(false) }, [questao.id])
  async function confirmar(letra: Letra) {
    if (travada || enviando) return
    definirErroEnvio('')
    const correta = questao.anulada || !questao.gabarito ? null : letra === questao.gabarito
    const segundos = segundosNaQuestao()
    definirEnviando(true)
    try { await aoResponder(letra, correta, segundos, confianca); definirRespondeuAgora(true); if (correta === false) definirErrouAgora(true) }
    catch (erro) {
      // Nunca falhar em silêncio: o que der errado aparece embaixo do botão.
      definirErroEnvio(erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro))
    }
    finally { definirEnviando(false) }
  }

  /**
   * Autoavaliação da dissertativa. Vira uma resposta como as outras para a
   * revisão espaçada: "acertei" é acerto seguro, "em parte" é acerto com
   * dúvida (volta antes) e "errei" volta hoje.
   */
  async function autoavaliar(nota: 'acertei' | 'parcial' | 'errei') {
    if (respondida || enviando) return
    definirErroEnvio('')
    const segundos = segundosNaQuestao()
    definirEnviando(true)
    // Sem letra: antes ia 'A', que aparecia como "Você marcou A" no caderno e
    // contava na estatística de "como a turma respondeu".
    try { await aoResponder(null, nota !== 'errei', segundos, nota === 'parcial' ? 'duvida' : 'seguro') }
    catch (erro) { definirErroEnvio(erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro)) }
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
      // Confiança pelo teclado (S, D, C), só antes de confirmar; L alterna o modo leitura depois.
      const porTecla = ({ s: 'seguro', d: 'duvida', c: 'chute' } as const)[tecla as 's' | 'd' | 'c']
      if (porTecla && !evento.shiftKey) {
        if (travada || !revelarResposta || dissertativa) return
        evento.preventDefault()
        definirConfianca(porTecla)
        return
      }
      if (tecla === 'l' && !evento.shiftKey) {
        if (!mostrarGabarito) return
        evento.preventDefault()
        definirModoLeitura((atual) => !atual)
        return
      }
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

  const semGabarito = !questao.gabarito && !questao.anulada && questao.tipo !== 'dissertativa'
  const registroDaQuestao = respondidasTodas[questao.id]
  const historicoDaQuestao = registroDaQuestao?.historico ?? []
  // Etiquetas de assunto adiantam a resposta; quando escondidas, voltam junto
  // com o gabarito, que é quando elas servem para estudar em vez de entregar.
  const etiquetasVisiveis = mostrarEtiquetas || mostrarGabarito

  return (
    <article className="cartao questao-impressa" aria-label={`Questão ${numero ?? ''}`} ref={areaDaQuestao} onMouseUp={atualizarSelecao}>
      {grifos.map((r, i) => <span key={i} className="grifo-overlay" style={{ left: r.left, top: r.top, width: r.width, height: r.height }} aria-hidden="true" />)}
      <div className="cartao__corpo">
        <div className="qz-topo">
          <div className="qz-topo__info">
            {numero && total ? <h1 className="qz-numero">Questão {numero}<small> de {total}</small></h1> : <h1 className="qz-numero">Questão</h1>}
            {(questao.prova || questao.ano) && <span className="qz-origem">{[questao.prova, questao.ano].filter(Boolean).join(' · ')}</span>}
            {questao.simulado && <span className="qz-origem qz-origem--simulado">{ROTULO_SIMULADOS}</span>}
            {questao.gabaritoBibliografia && <span className="qz-origem" title="A banca não divulgou o gabarito desta prova. A resposta foi definida pelo Orto Questões a partir da bibliografia.">Gabarito não oficial</span>}
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
            {mostrarGabarito && <button type="button" className={'qz-ferramenta' + (modoLeitura ? ' qz-ferramenta--ativa' : '')} onClick={() => definirModoLeitura(atual => !atual)} aria-pressed={modoLeitura} aria-label={modoLeitura ? 'Mostrar alternativas' : 'Ler comentário sem alternativas'} title={modoLeitura ? 'Mostrar alternativas (L)' : 'Modo leitura (L)'}><Icone nome="livro" tamanho={18} /></button>}
          </div>
        </div>

        {(etiquetasVisiveis || questao.prova || questao.ano) && (
          <div className={'qz-etiquetas' + (etiquetasVisiveis ? '' : ' qz-etiquetas--so-origem')}>
            {(questao.prova || questao.ano) && <span className="qz-chip qz-chip--origem">{[questao.prova, questao.ano].filter(Boolean).join(' · ')}</span>}
            {questao.simulado && <span className="qz-chip qz-chip--origem qz-chip--simulado">{ROTULO_SIMULADOS}</span>}
            {etiquetasVisiveis && <>
              <span className="qz-chip qz-chip--tema">{questao.tema}</span>
              {questao.subtemas.slice(0, 2).map((s) => <span className="qz-chip" key={s}>{s}</span>)}
              {questao.dificuldade && <span className="qz-chip qz-chip--dificuldade">{ROTULO_DIFICULDADE[questao.dificuldade]}</span>}
            </>}
          </div>
        )}

        <div className="questao__enunciado"><TextoEmLinha texto={questao.enunciado} /></div>

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
              <FiguraAmpliavel key={imagem.arquivo} imagem={imagem} src={urlImagem(imagem.arquivo)} alt={imagem.legenda ?? `Figura da questão ${questao.id}`} largura={imagem.largura} altura={imagem.altura} prioridade />
            ))}
          </div>
        )}

        {!modoLeitura && <ul className={'alternativas' + (respondeuAgora && mostrarGabarito ? ' alternativas--agora' : '')}>
          {questao.alternativas.map((alternativa, i) => {
            const letra = alternativa.letra
            const riscada = riscadas.includes(letra)
            const classes = ['alternativa']
            let marca: { texto: string; icone: 'certo' | 'errado' } | null = null

            if (mostrarGabarito && !questao.anulada) {
              const eGabarito = questao.gabarito === letra
              const eEscolhida = resposta!.escolhida === letra
              if (eGabarito) {
                classes.push('alternativa--certa')
                marca = { texto: questao.gabaritoBibliografia ? 'Resposta pela bibliografia' : 'Gabarito', icone: 'certo' }
              }
              if (eEscolhida && !eGabarito) {
                classes.push('alternativa--errada')
                marca = { texto: 'Sua resposta', icone: 'errado' }
              }
              if (eEscolhida && eGabarito) marca = { texto: 'Sua resposta, correta', icone: 'certo' }
            } else if (marcada === letra || (mostrarGabarito && questao.anulada && resposta?.escolhida === letra)) {
              classes.push('alternativa--escolhida')
            }
            if (riscada) classes.push('alternativa--riscada')
            // Assinante: o cartão se preenche até a porcentagem da turma, como numa enquete.
            const porcentagemTurma = mostrarGabarito && turma?.porLetra ? turma.porLetra[letra] ?? 0 : null
            if (porcentagemTurma !== null) {
              classes.push('alternativa--turma')
              if (letra === turma?.pegadinha) classes.push('alternativa--pegadinha')
            }

            return (
              <li key={letra} className="alternativa-envelope">
                <button
                  type="button"
                  className={classes.join(' ')}
                  style={porcentagemTurma !== null ? { '--turma': `${porcentagemTurma}%` } as CSSProperties : undefined}
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
                    <TextoEmLinha texto={alternativa.texto} />
                  </span>
                  {porcentagemTurma !== null && (
                    <span className="alternativa__turma">
                      <b>{porcentagemTurma}%</b>
                      <small>da turma</small>
                    </span>
                  )}
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

        {dissertativa ? (
          <Dissertativa
            questao={questao}
            texto={textoDissertativa}
            aoEscrever={(t) => { definirTextoDissertativa(t); guardarRascunho(questao.id, t) }}
            revelada={mostrarGabarito}
            podeRevelar={revelarResposta}
            aoRevelar={() => definirRevelada(true)}
            resposta={resposta}
            enviando={enviando}
            erroEnvio={erroEnvio}
            aoAvaliar={(nota) => void autoavaliar(nota)}
          />
        ) : !revelarResposta ? (
          <div className="resultado resultado--neutro" role="status">
            {marcada
              ? `Resposta marcada: ${marcada}. Pode trocar até o fim do simulado.`
              : 'Marque uma alternativa. O gabarito aparece quando o simulado terminar.'}
          </div>
        ) : !respondida ? (
          <div className={'linha nao-imprime acao-responder' + (escolhida ? ' acao-responder--pronta' : '')}>
            {/* Sempre à vista, antes de escolher: o botão não pula para baixo no clique e a pessoa vê que pode marcar dúvida ou chute. */}
            <div className="grupo-opcoes confianca" role="group" aria-label="Sua confiança nesta resposta">
              {([['seguro', 'Tenho ', 'certeza', 'S'], ['duvida', 'Tenho ', 'dúvida', 'D'], ['chute', 'Foi um ', 'chute', 'C']] as const).map(([valor, prefixo, rotulo, tecla]) => <button key={valor} type="button" className="opcao-segmento" aria-pressed={confianca === valor} aria-keyshortcuts={tecla} title={`${prefixo}${rotulo} (${tecla})`} onClick={() => definirConfianca(valor)}><span className="confianca__prefixo">{prefixo}</span><span className="confianca__rotulo">{rotulo}</span></button>)}
            </div>
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
            <span className="campo__auxilio acao-responder__dica">Acerto com dúvida ou chute volta antes para revisão.</span>
            <span className="meta so-teclado">
              Teclas <kbd>1</kbd>–<kbd>{letrasDisponiveis.length}</kbd> selecionam,{' '}
              <kbd>S</kbd> <kbd>D</kbd> <kbd>C</kbd> mudam a confiança e <kbd>Enter</kbd> confirma
            </span>
          </div>
        ) : !modoLeitura && (
          <>
            <Resultado questao={questao} resposta={resposta!} agora={respondeuAgora} />
            {turma && <p className="alt-turma-resumo"><Icone nome="grupo" tamanho={15} /> {turma.porLetra
              ? <>Porcentagens da primeira resposta de {pessoas(turma.respondentes)}. {turma.acertoPrimeira}% acertaram de primeira{resposta!.correta === false && turma.acertoPrimeira >= 80 ? '; quase todo mundo acerta esta, vale reler o comentário' : resposta!.correta === true && turma.acertoPrimeira <= 40 ? '; você acertou uma que a maioria erra' : ''}.</>
              : <>A porcentagem da turma em cada alternativa aparece a partir de 3 pessoas{turma.respondentes ? ` (até agora, ${pessoas(turma.respondentes)})` : ''}.</>}</p>}
          </>
        )}

        {mostrarGabarito && (
          <div className="comentario">
            {resposta && resposta.correta !== null && !dissertativa && <p className="aviso-ia">{resposta?.correta === false ? 'Incluída em Revisar hoje. Leia a explicação e tente novamente em outra sessão.' : dominada(registroDaQuestao) ? 'Ciclo de revisão completo. Você pode revisitá-la pelo filtro Dominadas.' : resposta.confianca === 'chute' ? 'Acerto por chute: ela volta amanhã para você confirmar o raciocínio.' : resposta.confianca === 'duvida' ? 'Acerto com dúvida: ela volta antes para reforçar o conceito.' : `Acerto seguro registrado. Ela volta em ${INTERVALOS.seguro.join(', ').replace(/, (\d+)$/, ' e $1')} dias, conforme você for acertando.`}</p>}
            {questao.comentario && (
              <div className="bloco-comentario">
                <p className="comentario__titulo">Comentário do autor</p>
                <TextoEditorial texto={questao.comentario} />
              </div>
            )}

            <ComentarioDaIA questao={questao} comentario={comentarioIA} carregando={carregandoIA} escolhida={resposta?.escolhida ?? null} rolarParaMarcada={errouAgora && resposta?.correta === false} />
            <EstudarAssunto questao={questao.id} />
            {/* Quem não assina vê o convite da turma só aqui, depois do comentário. */}
            {resposta && !modoLeitura && <ComoATurma questao={questao} />}

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
                            <FiguraAmpliavel key={imagem.arquivo} imagem={imagem} src={urlImagem(imagem.arquivo)} alt={imagem.legenda ?? 'Imagem enviada por colega'} alturaMaxima="18rem" />
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

        {/* Discreto, no pé da questão: a etiqueta no topo já identifica o simulado. */}
        {questao.simulado && (
          <p className="meta qz-nota-simulado">
            <strong>{ROTULO_SIMULADOS}</strong>: questão autoral do site, feita por engenharia reversa do padrão
            {questao.prova ? ` da prova ${questao.prova}` : ' das provas anteriores'} a partir da bibliografia de referência,
            para o aprendizado. Não é questão oficial de prova nem foi elaborada, revisada ou endossada por instituição organizadora.
          </p>
        )}

        <div className="qz-rodape nao-imprime">
          <RelatarErro key={questao.id} idQuestao={questao.id} />
          <EditarQuestaoAdmin idQuestao={questao.id} />
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

function Resultado({ questao, resposta, agora = false }: { questao: Questao; resposta: Resposta; agora?: boolean }) {
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
  // Prova sem gabarito oficial: a resposta vem da bibliografia e já conta no desempenho.
  const rotulo = questao.gabaritoBibliografia ? 'Resposta pela bibliografia' : 'Gabarito'
  const nota = questao.gabaritoBibliografia && (
    <small className="resultado__nota">
      A banca não divulgou o gabarito oficial desta prova. A resposta {questao.gabarito} foi definida pelo Orto Questões a partir da bibliografia
      e conta no seu desempenho e no ranking.
    </small>
  )
  return resposta.correta ? (
    <div className={'resultado resultado--acerto' + (agora ? ' resultado--agora' : '')} role="status">
      <Icone nome="certo" />
      <span>Você acertou. {rotulo}: {questao.gabarito}.{nota}</span>
    </div>
  ) : (
    <div className={'resultado resultado--erro' + (agora ? ' resultado--agora' : '')} role="status">
      <Icone nome="errado" />
      <span>Você errou. {rotulo}: {questao.gabarito}, você marcou {resposta.escolhida}.{nota}</span>
    </div>
  )
}


const normalizarEco = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Muitos comentários abrem a explicação de cada alternativa repetindo o texto
 * dela em negrito ("**Torácica.**"). O cartão já mostra a alternativa no
 * cabeçalho, então essa primeira linha só ocupa espaço: sai quando é eco do
 * texto da alternativa e há explicação depois dela.
 */
function semEco(texto: string, alternativa?: string): string {
  if (!alternativa) return texto
  const [primeiro, ...resto] = texto.split(/\n\s*\n|\n(?=- )/)
  const eco = /^\*\*([^*]+)\*\*\s*$/.exec(primeiro.trim())
  if (!eco || !resto.join('').trim()) return texto
  const a = normalizarEco(eco[1]), b = normalizarEco(alternativa)
  if (!a || !(b.startsWith(a) || a.startsWith(b) || b.includes(a))) return texto
  return texto.slice(texto.indexOf(primeiro) + primeiro.length).replace(/^\s+/, '')
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
  rolarParaMarcada = false,
}: {
  questao: Questao
  comentario: ComentarioIA | null
  carregando: boolean
  escolhida: Letra | null
  rolarParaMarcada?: boolean
}) {
  // Ao errar, leva uma vez até o começo do comentário (não até a análise da
  // letra marcada: com os comentários longos ela fica perto do fim da página e
  // a pessoa perdia o conceito). A letra marcada continua destacada.
  const inicio = useRef<HTMLDivElement>(null)
  const rolou = useRef(false)
  useEffect(() => {
    if (!rolarParaMarcada || !comentario || rolou.current || !inicio.current) return
    rolou.current = true
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    inicio.current.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' })
  }, [rolarParaMarcada, comentario])
  // Sem gabarito oficial, o comentário pode indicar a resposta pela bibliografia.
  const referencia = questao.anulada ? null : questao.gabarito ?? comentario?.provavel ?? null
  // Todas as outras letras aparecem, mesmo sem análise: sumir com uma delas
  // deixava a pessoa sem saber se o comentário estava incompleto.
  const erradas = questao.alternativas
    .map((a) => a.letra)
    .filter((letra) => letra !== referencia)

  const textoAlternativa = (letra: string) =>
    questao.alternativas.find((a) => a.letra === letra)?.texto

  return (
    <div className="bloco-comentario cm" ref={inicio}>
      <header className="cm-cabeca">
        <span className="cm-cabeca__icone"><Icone nome="livro" tamanho={20} /></span>
        <div>
          <p className="cm-cabeca__titulo">Comentário</p>
          <p className="cm-cabeca__sub">{questao.anulada ? 'O tema e a análise das alternativas de uma questão anulada.' : 'O conceito, por que a correta está certa e por que as outras não servem.'}</p>
        </div>
      </header>

      {carregando && <p className="comentario__pendente">Carregando o comentário…</p>}

      {!carregando && !comentario && (
        <p className="comentario__pendente">
          {questao.tipo === 'dissertativa' ? 'Esta questão ainda não tem comentário.' : questao.gabaritoBibliografia ? 'Esta questão ainda não tem comentário. A resposta acima é a da bibliografia, porque a banca não divulgou gabarito oficial.' : 'Esta questão ainda não tem comentário. O gabarito acima é o oficial da prova.'}
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

          {comentario.imagens && comentario.imagens.length > 0 && (
            <div className="questao__figuras cm-figuras">
              {comentario.imagens.map((imagem) => (
                <FiguraAmpliavel key={imagem.arquivo} imagem={imagem} src={urlImagem(imagem.arquivo)} alt={imagem.legenda ?? 'Figura do comentário'} />
              ))}
            </div>
          )}

          {questao.tipo === 'dissertativa' ? (
            comentario.correta.trim() && (
              <section className="cm-alt cm-alt--certa">
                <p className="cm-rotulo"><Icone nome="certo" tamanho={16} /> Resposta comentada</p>
                <TextoEditorial texto={comentario.correta} />
              </section>
            )
          ) : (<>
          <p className="cm-secao">Alternativa por alternativa</p>
          {questao.anulada && comentario.correta.trim() && <TextoEditorial texto={comentario.correta} />}
          <div className="cm-alternativas">
            {referencia && (
              <article className="cm-alt cm-alt--certa">
                <header className="cm-alt__cabeca">
                  <span className="cm-alt__letra">{referencia}</span>
                  <strong className="cm-alt__texto">{textoAlternativa(referencia) ?? 'Alternativa correta'}</strong>
                  <span className="cm-selo cm-selo--certa"><Icone nome="certo" tamanho={13} /> {questao.gabarito && !questao.gabaritoBibliografia ? 'Correta' : 'Resposta pela bibliografia'}</span>
                  {escolhida === referencia && <span className="cm-selo">Sua resposta</span>}
                </header>
                {comentario.correta.trim()
                  ? <TextoEditorial texto={semEco(comentario.correta, textoAlternativa(referencia))} />
                  : <p className="comentario__pendente">O comentário desta questão está em preparação.</p>}
              </article>
            )}

            {erradas.map((letra) => (
              <article className={'cm-alt' + (escolhida === letra && !questao.anulada ? ' cm-alt--marcada' : '')} key={letra}>
                <header className="cm-alt__cabeca">
                  <span className="cm-alt__letra">{letra}</span>
                  <strong className="cm-alt__texto">{textoAlternativa(letra) ?? 'Alternativa'}</strong>
                  {questao.anulada
                    ? <span className="cm-selo cm-selo--neutro">Análise</span>
                    : escolhida === letra
                    ? <span className="cm-selo cm-selo--erro"><Icone nome="errado" tamanho={13} /> Sua resposta</span>
                    : <span className="cm-selo cm-selo--neutro">Incorreta</span>}
                </header>
                {comentario.incorretas[letra]?.trim()
                  ? <TextoEditorial texto={semEco(comentario.incorretas[letra]!, textoAlternativa(letra))} />
                  : <p className="comentario__pendente">Sem análise desta alternativa.</p>}
              </article>
            ))}
          </div>
          </>)}

          <Referencias itens={comentario.referencias} notaIA />
          <AvaliarComentario idQuestao={questao.id} />
        </>
      )}
    </div>
  )
}

const PREFIXO_RASCUNHO = 'dissertativa:'
function lerRascunho(id: string): string {
  try { return localStorage.getItem(PREFIXO_RASCUNHO + id) ?? '' } catch { return '' }
}
function guardarRascunho(id: string, texto: string) {
  try {
    if (texto) localStorage.setItem(PREFIXO_RASCUNHO + id, texto)
    else localStorage.removeItem(PREFIXO_RASCUNHO + id)
  } catch { /* armazenamento indisponível: o texto só não sobrevive à recarga */ }
}

/** Questão dissertativa: escreve, vê a resposta esperada e se autoavalia. */
function Dissertativa({
  questao, texto, aoEscrever, revelada, podeRevelar, aoRevelar, resposta, enviando, erroEnvio, aoAvaliar,
}: {
  questao: Questao
  texto: string
  aoEscrever: (t: string) => void
  revelada: boolean
  podeRevelar: boolean
  aoRevelar: () => void
  resposta?: Resposta
  enviando: boolean
  erroEnvio: string
  aoAvaliar: (nota: 'acertei' | 'parcial' | 'errei') => void
}) {
  return (
    <div className="dissertativa">
      {!revelada ? (
        <>
          <label className="dissertativa__rotulo" htmlFor={`dis-${questao.id}`}>Sua resposta</label>
          <textarea
            id={`dis-${questao.id}`}
            className="entrada dissertativa__texto"
            rows={6}
            value={texto}
            onChange={(e) => aoEscrever(e.target.value)}
            placeholder="Escreva como escreveria na prova. Ninguém corrige: depois você compara com a resposta esperada."
          />
          {podeRevelar ? (
            <div className="linha nao-imprime acao-responder acao-responder--pronta">
              <button type="button" className="botao botao--principal botao--grande" onClick={aoRevelar}>
                {texto.trim() ? 'Ver a resposta esperada' : 'Ver a resposta sem escrever'}
              </button>
            </div>
          ) : (
            <div className="resultado resultado--neutro" role="status">Questão dissertativa: a resposta esperada aparece quando o simulado terminar.</div>
          )}
        </>
      ) : (
        <>
          {texto.trim() && (
            <section className="dissertativa__bloco">
              <p className="dissertativa__rotulo">Sua resposta</p>
              <p className="dissertativa__sua">{texto}</p>
            </section>
          )}
          <section className="dissertativa__bloco dissertativa__bloco--esperada">
            <p className="dissertativa__rotulo"><Icone nome="certo" tamanho={16} /> Resposta esperada</p>
            {questao.respostaEsperada
              ? <TextoEditorial texto={questao.respostaEsperada} />
              : <p className="comentario__pendente">A banca não publicou a resposta desta questão. Compare com o comentário abaixo.</p>}
          </section>
          {resposta ? (
            <div className={'resultado ' + (resposta.correta ? (resposta.confianca === 'duvida' ? 'resultado--neutro' : 'resultado--acerto') : 'resultado--erro')} role="status">
              <Icone nome={resposta.correta ? 'certo' : 'errado'} />
              {resposta.correta ? (resposta.confianca === 'duvida' ? 'Você marcou que acertou em parte: ela volta antes para revisão.' : 'Você marcou que acertou.') : 'Você marcou que errou: ela entra em Revisar hoje.'}
            </div>
          ) : (
            <div className="dissertativa__avaliar nao-imprime" role="group" aria-label="Como foi a sua resposta?">
              <p className="dissertativa__rotulo">Comparando com a resposta esperada, você:</p>
              <div className="grupo-opcoes">
                <button type="button" className="opcao-segmento" disabled={enviando} onClick={() => aoAvaliar('acertei')}>Acertei</button>
                <button type="button" className="opcao-segmento" disabled={enviando} onClick={() => aoAvaliar('parcial')}>Acertei em parte</button>
                <button type="button" className="opcao-segmento" disabled={enviando} onClick={() => aoAvaliar('errei')}>Errei</button>
              </div>
              {erroEnvio && <p className="aviso-formulario aviso-formulario--erro" role="alert">Não foi possível registrar. Tente de novo. <small>({erroEnvio})</small></p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

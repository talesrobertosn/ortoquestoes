import { MensageiroDormindo } from '../componentes/CenasPixel'
import { useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestoes } from '../dados/acervo'
import { carregarComentario } from '../dados/comentarios'
import { AREAS_TREINO, FILTROS_VAZIOS, type ComentarioIA, type Indice, type Letra, type Questao } from '../dados/tipos'
import { Icone } from '../componentes/Icone'
import { TextoEditorial } from '../componentes/TextoEditorial'
import { usarArmazenado } from '../estado/usarArmazenado'
import { usarSessao } from '../estado/sessao'
import { revisarHoje, type RegistroQuestao } from '../estado/revisao'
import { filtrosParaConsulta, href, navegar } from '../util/rotas'
import { usarConta } from '../conta/ContextoConta'
import '../estilos/componentes/Cristal.css'
import '../estilos/componentes/Mundo.css'
import '../estilos/paginas/CadernoErros.css'

type Situacao = 'abertos' | 'corrigidos' | 'todos'
type Ordem = 'recentes' | 'frequentes'

interface Erro {
  id: string
  registro: RegistroQuestao
  erros: number
  aberto: boolean
  /** Errou marcando "tenho certeza": o conceito está errado, não só esquecido. */
  comCerteza: boolean
  tema: number
  subtemas: number[]
  /** Índice da prova em Indice.provas, ou null. */
  prova: number | null
  ano: number | null
}

const POR_PAGINA = 12
const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })

function levantarErros(indice: Indice, respondidas: Record<string, RegistroQuestao>): Erro[] {
  // Cópias de uma mesma questão (`dup` aponta para o id original) entram uma vez só,
  // com os históricos somados: um erro feito pela cópia não some porque o original foi acertado.
  const copias = new Map<string, string[]>()
  for (const item of indice.questoes) {
    if (item.dup && respondidas[item.dup]) copias.set(item.dup, [...(copias.get(item.dup) ?? []), item.id])
  }
  const lista: Erro[] = []
  for (const item of indice.questoes) {
    if (item.dup && respondidas[item.dup]) continue
    const registros = [item.id, ...(copias.get(item.id) ?? [])].map((id) => respondidas[id]).filter((r): r is RegistroQuestao => !!r)
    if (!registros.length) continue
    const r = registros.length === 1 ? registros[0] : juntarRegistros(registros)
    const erros = r.erros ?? (r.c === false ? 1 : 0)
    if (erros === 0 && r.c !== false) continue
    const ultimoErro = [...(r.historico ?? [])].reverse().find((h) => h.correta === false)
    lista.push({
      id: item.id, registro: r, erros: Math.max(erros, 1), aberto: r.c === false,
      comCerteza: r.c === false ? r.confianca === 'seguro' : ultimoErro?.confianca === 'seguro',
      tema: item.t, subtemas: item.s, prova: item.p, ano: item.a,
    })
  }
  return lista
}

/** Original e cópias como um registro só: a resposta mais recente manda, os erros e o histórico somam. */
function juntarRegistros(registros: RegistroQuestao[]): RegistroQuestao {
  const recente = registros.reduce((a, b) => (b.q > a.q ? b : a))
  const errosDe = (r: RegistroQuestao) => r.erros ?? (r.c === false ? 1 : 0)
  return {
    ...recente,
    erros: registros.reduce((soma, r) => soma + errosDe(r), 0),
    historico: registros.flatMap((r) => r.historico ?? []).sort((a, b) => a.em - b.em),
  }
}

/** Título do topo: o nome e os erros em aberto; abaixo de 10, "os primeiros" em vez do número. */
function tituloCaderno(nome: string, abertos: number) {
  const corpo = abertos === 0
    ? 'todos os seus erros já viraram acerto'
    : abertos >= 10 ? `${abertos.toLocaleString('pt-BR')} erros esperando revanche` : 'os primeiros erros esperando revanche'
  return nome ? `${nome}, ${corpo}` : corpo.charAt(0).toUpperCase() + corpo.slice(1)
}

/**
 * Caderno de erros: tudo o que a pessoa já errou, num lugar só, com o que ela
 * marcou, o gabarito e o porquê. Refazer está a um toque; o caderno também
 * mostra o que já foi corrigido, porque ver o erro virar acerto motiva.
 *
 * 19/10/2026: temporada pixel, como o Treinar. Topo com o nome e o que a página
 * faz, "Refazer os erros" em ouro e "Revisar hoje" quando há erro vencendo hoje;
 * filtros "Ainda erro" e "Já recuperei", prova e tema; linhas compactas com o
 * número, a origem e a situação; tela vazia que explica como o erro entra e sai.
 */
export function CadernoErros() {
  const { indice } = usarIndice()
  const { sessao } = usarConta()
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const [notas] = usarArmazenado<Record<string, string>>('notas', {})
  const { iniciarComAviso } = usarSessao()
  const [situacao, definirSituacao] = usarArmazenado<Situacao>('erros:situacao', 'abertos')
  const [ordem, definirOrdem] = usarArmazenado<Ordem>('erros:ordem', 'recentes')
  const [tema, definirTema] = useState<number | null>(null)
  const [prova, definirProva] = useState<number | null>(null)
  const [limite, definirLimite] = useState(POR_PAGINA)
  const [questoes, definirQuestoes] = useState<Map<string, Questao>>(new Map())
  const primeiroNome = String(sessao?.user.user_metadata?.nome ?? '').trim().split(/\s+/)[0] ?? ''

  const todos = useMemo(() => (indice ? levantarErros(indice, respondidas) : []), [indice, respondidas])
  const abertos = useMemo(() => todos.filter((e) => e.aberto), [todos])
  const corrigidos = todos.length - abertos.length
  const comCerteza = useMemo(() => abertos.filter((e) => e.comCerteza).length, [abertos])
  // Erros em aberto cuja revisão vence hoje: a revisão espaçada já os chamou de volta.
  const deHoje = useMemo(() => abertos.filter((e) => revisarHoje(e.registro)), [abertos])

  // Filtrar e ordenar só quando muda o recorte (antes era a cada render).
  const { porTema, porProva, visiveis } = useMemo(() => {
    const daSituacao = todos.filter((e) => situacao === 'todos' || (situacao === 'abertos' ? e.aberto : !e.aberto))
    const porTema = new Map<number, number>()
    const porProva = new Map<number, number>()
    for (const e of daSituacao) {
      porTema.set(e.tema, (porTema.get(e.tema) ?? 0) + 1)
      if (e.prova !== null) porProva.set(e.prova, (porProva.get(e.prova) ?? 0) + 1)
    }
    const visiveis = daSituacao
      .filter((e) => (tema === null || e.tema === tema) && (prova === null || e.prova === prova))
      .sort((a, b) => ordem === 'frequentes' ? b.erros - a.erros || b.registro.q - a.registro.q : b.registro.q - a.registro.q)
    return { porTema, porProva, visiveis }
  }, [todos, situacao, tema, prova, ordem])

  // Onde os erros em aberto se concentram, por subtema.
  const focos = useMemo(() => {
    if (!indice) return []
    const contagem = new Map<number, number>()
    for (const e of abertos) for (const s of e.subtemas) contagem.set(s, (contagem.get(s) ?? 0) + 1)
    return [...contagem.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([s, n]) => ({ nome: indice.subtemas[s], n }))
  }, [indice, abertos])

  const pagina = visiveis.slice(0, limite)
  const chavePagina = pagina.map((e) => e.id).join(',')
  useEffect(() => {
    if (!indice) return
    const faltam = pagina.map((e) => e.id).filter((id) => !questoes.has(id))
    if (!faltam.length) return
    let vivo = true
    carregarQuestoes(indice, faltam).then((lista) => {
      if (!vivo) return
      definirQuestoes((atual) => { const nova = new Map(atual); for (const q of lista) nova.set(q.id, q); return nova })
    })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, chavePagina])

  useEffect(() => { definirLimite(POR_PAGINA) }, [situacao, tema, prova, ordem])

  const refazer = async (ids: string[]) => {
    if (!ids.length) return
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, areas: AREAS_TREINO, situacao: 'erradas', limite: ids.length, embaralhar: true }, ids))) return
    navegar('/sessao')
  }

  if (!indice) return <div className="estado"><p>Abrindo seu caderno…</p></div>

  if (todos.length === 0) {
    return (
      <div className="ce">
        <section className="ce-heroi painel-mundo" aria-labelledby="ce-titulo">
          <div className="ce-heroi__texto">
            <p className="tr-heroi__selo">Caderno de erros</p>
            <h1 id="ce-titulo">{primeiroNome ? `${primeiroNome}, nenhum erro por aqui, ainda` : 'Nenhum erro por aqui, ainda'}</h1>
            <p>Cada questão que você errar vem para este caderno, com o que você marcou, o gabarito e o porquê. É o material de revisão feito sob medida pelas suas próprias dúvidas.</p>
          </div>
          <a className="botao cristal ce-heroi__acao" href={href('/treinar')}>
            <Icone nome="raio" tamanho={20} />
            <span><strong>Treinar agora</strong><small>os erros chegam sozinhos</small></span>
          </a>
        </section>
        <PassosCaderno />
        <MensageiroDormindo titulo="O mensageiro está de folga" texto="Ainda não há erro esperando revanche. Quando você errar uma questão, ele traz a carta com o gabarito e o porquê." />
      </div>
    )
  }

  const recuperadosFrase = corrigidos >= 10
    ? `Você já recuperou ${corrigidos.toLocaleString('pt-BR')}: errou, refez e acertou.`
    : corrigidos > 0 ? 'Os primeiros já viraram acerto: errou, refez e acertou.' : null
  const recorteAtivo = tema !== null || prova !== null
  const abertosDoRecorte = visiveis.filter((e) => e.aberto)

  return (
    <div className="ce">
      <section className="ce-heroi painel-mundo" aria-labelledby="ce-titulo">
        <div className="ce-heroi__texto">
          <p className="tr-heroi__selo">Caderno de erros</p>
          <h1 id="ce-titulo">{tituloCaderno(primeiroNome, abertos.length)}</h1>
          <p>
            {abertos.length
              ? 'Toda questão que você erra vem para cá, com o que marcou, o gabarito e o porquê. Refez e acertou, ela passa para “Já recuperei”.'
              : 'Continue treinando: o caderno se preenche sozinho a cada erro, e cada um que você recupera fica guardado aqui.'}
            {recuperadosFrase && <> {recuperadosFrase}</>}
          </p>
        </div>
        {abertos.length > 0 ? (
          <button type="button" className="botao cristal ce-heroi__acao" onClick={() => refazer([...abertos].sort((a, b) => b.registro.q - a.registro.q).slice(0, 10).map((e) => e.id))}>
            <Icone nome="reiniciar" tamanho={20} />
            <span><strong>Refazer os erros</strong><small>{abertos.length > 10 ? 'os 10 mais recentes' : abertos.length === 1 ? 'o que está em aberto' : 'todos os que estão em aberto'}</small></span>
          </button>
        ) : (
          <a className="botao cristal ce-heroi__acao" href={href('/treinar')}>
            <Icone nome="raio" tamanho={20} />
            <span><strong>Começar uma sessão</strong><small>questões novas para o caderno</small></span>
          </a>
        )}
        <div className="ce-heroi__atalhos nao-imprime">
          {deHoje.length > 0 && (
            <button type="button" className="ce-vidro" onClick={() => refazer(deHoje.map((e) => e.id))}>
              <Icone nome="calendario" tamanho={16} /> <span>Revisar hoje</span> <b>{deHoje.length}</b>
            </button>
          )}
          {abertos.length > 10 && deHoje.length !== abertos.length && (
            <button type="button" className="ce-vidro" onClick={() => refazer(abertos.map((e) => e.id))}>
              <Icone nome="reiniciar" tamanho={16} /> <span>Todos os erros</span> <b>{abertos.length}</b>
            </button>
          )}
          <button type="button" className="ce-vidro ce-vidro--imprimir" onClick={() => window.print()}>
            <Icone nome="impressora" tamanho={16} /> <span>Imprimir</span>
          </button>
        </div>
        <dl className="ce-placar">
          <div><dt><Icone nome="errado" tamanho={13} /> Ainda erro</dt><dd>{abertos.length}</dd></div>
          <div><dt><Icone nome="certo" tamanho={13} /> Já recuperei</dt><dd>{corrigidos}</dd></div>
          <div title="Errou marcando 'tenho certeza'"><dt><Icone nome="alerta" tamanho={13} /> Errou com certeza</dt><dd>{comCerteza}</dd></div>
        </dl>
      </section>

      {focos.length > 0 && (
        <section className="ce-focos" aria-labelledby="ce-focos-titulo">
          <div>
            <h2 id="ce-focos-titulo">Onde há mais para ganhar</h2>
            <p>Os assuntos que mais se repetem nos seus erros em aberto. Reler o capítulo antes de refazer rende mais.</p>
          </div>
          <ul>
            {focos.map((f) => (
              <li key={f.nome}><a href={href(`/treinar${filtrosParaConsulta({ ...FILTROS_VAZIOS, areas: AREAS_TREINO, subtemas: [f.nome], situacao: 'erradas' })}`)}>{f.nome} <Icone nome="direita" tamanho={14} /></a></li>
            ))}
          </ul>
        </section>
      )}

      <section className="ce-filtros nao-imprime" aria-label="Filtros do caderno">
        <div className="ce-segmentos" role="group" aria-label="Situação">
          {([['abertos', 'Ainda erro', abertos.length], ['corrigidos', 'Já recuperei', corrigidos], ['todos', 'Todos', todos.length]] as const).map(([valor, rotulo, n]) => (
            <button type="button" key={valor} aria-pressed={situacao === valor} className={situacao === valor ? 'ativo' : ''} onClick={() => { definirSituacao(valor); definirTema(null); definirProva(null) }}>
              {rotulo} <span>{n}</span>
            </button>
          ))}
        </div>
        <div className="ce-selects">
          {porProva.size > 1 && (
            <label className="ce-ordem">
              Prova
              <select className="entrada" value={prova ?? ''} onChange={(e) => definirProva(e.target.value === '' ? null : Number(e.target.value))}>
                <option value="">Todas</option>
                {[...porProva.entries()].sort((a, b) => b[1] - a[1]).map(([p, n]) => <option key={p} value={p}>{indice.provas[p]} ({n})</option>)}
              </select>
            </label>
          )}
          <label className="ce-ordem">
            Ordenar
            <select className="entrada" value={ordem} onChange={(e) => definirOrdem(e.target.value as Ordem)}>
              <option value="recentes">Mais recentes</option>
              <option value="frequentes">Mais erradas</option>
            </select>
          </label>
        </div>
        {porTema.size > 1 && (
          <div className="ce-temas" role="group" aria-label="Tema">
            <button type="button" aria-pressed={tema === null} className={tema === null ? 'ativo' : ''} onClick={() => definirTema(null)}>Todos os temas</button>
            {[...porTema.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => (
              <button type="button" key={t} aria-pressed={tema === t} className={tema === t ? 'ativo' : ''} onClick={() => definirTema(t)}>
                {indice.temas[t]?.nome} <span>{n}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {recorteAtivo && abertosDoRecorte.length > 0 && (
        <div className="ce-recorte nao-imprime">
          <p>{visiveis.length === 1 ? 'Um erro neste filtro.' : `${visiveis.length} erros neste filtro.`}</p>
          <button type="button" className="botao botao--fantasma" onClick={() => refazer(abertosDoRecorte.map((e) => e.id))}>
            <Icone nome="reiniciar" tamanho={15} /> {abertosDoRecorte.length === 1 ? 'Refazer o que está em aberto' : `Refazer os ${abertosDoRecorte.length} em aberto`}
          </button>
        </div>
      )}

      {visiveis.length === 0 ? (
        situacao === 'abertos' && abertos.length === 0
          ? <MensageiroDormindo titulo="Nenhum erro em aberto" texto="Você corrigiu todos. O mensageiro pode descansar até a próxima batalha." acao={<a className="botao botao--principal" href={href('/treinar')}>Começar uma sessão nova</a>} />
          : situacao === 'corrigidos' && corrigidos === 0
            ? <p className="estado">Nenhum erro recuperado ainda. Refaça um erro e acerte: ele aparece aqui, para você ver o progresso.</p>
            : <p className="estado">Nenhum erro com esses filtros.</p>
      ) : (
        <ol className="ce-lista">
          {pagina.map((e) => (
            <ItemErro key={e.id} erro={e} questao={questoes.get(e.id)} indice={indice} nota={notas[e.id]} />
          ))}
        </ol>
      )}

      {visiveis.length > limite && (
        <button type="button" className="botao botao--fantasma ce-mais nao-imprime" onClick={() => definirLimite((n) => n + POR_PAGINA)}>
          Mostrar mais {Math.min(POR_PAGINA, visiveis.length - limite)} de {visiveis.length - limite}
        </button>
      )}

      <PassosCaderno resumido />
    </div>
  )
}

/** Como um erro entra no caderno e como sai dele. Na tela vazia ensina; embaixo da lista, lembra. */
function PassosCaderno({ resumido = false }: { resumido?: boolean }) {
  const idTitulo = resumido ? 'ce-passos-titulo-lista' : 'ce-passos-titulo'
  return (
    <section className={`ce-passos nao-imprime${resumido ? ' ce-passos--resumido' : ''}`} aria-labelledby={idTitulo}>
      <h2 id={idTitulo}>Como o caderno funciona</h2>
      <ol>
        <li className="px-cartao">
          <span className="px-numero" aria-hidden="true">1</span>
          <div>
            <strong>Errou, entrou</strong>
            <p>Toda resposta errada, numa sessão ou numa questão aberta sozinha, vem para cá com a letra que você marcou.</p>
          </div>
        </li>
        <li className="px-cartao">
          <span className="px-numero" aria-hidden="true">2</span>
          <div>
            <strong>Entenda o porquê</strong>
            <p>Em “Entender o erro” ficam o gabarito, o conceito-chave e por que a sua letra não serve.</p>
          </div>
        </li>
        <li className="px-cartao">
          <span className="px-numero" aria-hidden="true">3</span>
          <div>
            <strong>Refaça e recupere</strong>
            <p>Acertou ao refazer, o erro passa para “Já recuperei”. A revisão espaçada traz a questão de volta nos dias certos.</p>
          </div>
        </li>
      </ol>
    </section>
  )
}

function ItemErro({ erro, questao, indice, nota }: { erro: Erro; questao?: Questao; indice: Indice; nota?: string }) {
  const [aberto, definirAberto] = useState(false)
  const [comentario, definirComentario] = useState<ComentarioIA | null | undefined>(undefined)
  const temaInfo = indice.temas[erro.tema]
  // Dissertativa não tem letra; registros antigos guardavam 'A' e mostravam "Você marcou A" vazio.
  const marcada = questao?.tipo === 'dissertativa' ? undefined : erro.registro.m as Letra | undefined
  const alternativa = (l?: Letra | null) => questao?.alternativas.find((a) => a.letra === l)
  const origem = [erro.prova !== null ? indice.provas[erro.prova] : null, erro.ano].filter(Boolean).join(' · ')

  useEffect(() => {
    if (!aberto || comentario !== undefined || !temaInfo) return
    let vivo = true
    carregarComentario(temaInfo.slug, erro.id).then((achado) => vivo && definirComentario(achado))
    return () => { vivo = false }
  }, [aberto, comentario, temaInfo, erro.id])

  const porQueErrei = marcada && marcada !== questao?.gabarito ? comentario?.incorretas?.[marcada] : null

  return (
    <li className={`ce-item${erro.aberto ? ' ce-item--aberto' : ' ce-item--corrigido'}${aberto ? ' ce-item--expandido' : ''}`}>
      <span className="ce-item__icone" aria-hidden="true"><Icone nome={erro.aberto ? 'errado' : 'certo'} tamanho={16} /></span>
      <div className="ce-item__conteudo">
        <div className="ce-item__topo">
          <span className="ce-item__origem">
            <span className="ce-item__id">{erro.id}</span>
            {origem && <span>{origem}</span>}
          </span>
          <span className="ce-item__selos">
            {erro.comCerteza && <span className="ce-selo ce-selo--certeza" title="Você marcou 'tenho certeza' e errou">Errou com certeza</span>}
            <span className={`ce-selo ${erro.aberto ? 'ce-selo--aberto' : 'ce-selo--corrigido'}`}>{erro.aberto ? 'Ainda erro' : 'Já recuperei'}</span>
          </span>
        </div>
        <p className="ce-item__assunto">{temaInfo?.nome}{erro.subtemas[0] !== undefined && <> · {indice.subtemas[erro.subtemas[0]]}</>}</p>

        {questao ? (
          <>
            <p className={`ce-item__enunciado${aberto ? '' : ' ce-item__enunciado--curto'}`}>{questao.enunciado}</p>
            <div className="ce-item__respostas">
              {marcada && marcada !== questao.gabarito && erro.aberto && (
                <p className="ce-resp ce-resp--sua"><span className="ce-resp__letra">{marcada}</span><span><small>Você marcou</small>{alternativa(marcada)?.texto}</span></p>
              )}
              {questao.gabarito && (
                <p className="ce-resp ce-resp--certa"><span className="ce-resp__letra">{questao.gabarito}</span><span><small>Gabarito</small>{alternativa(questao.gabarito)?.texto}</span></p>
              )}
            </div>
          </>
        ) : (
          <p className="ce-item__enunciado ce-item__enunciado--curto texto-2">Carregando a questão…</p>
        )}

        {nota && <div className="ce-item__nota"><small>Sua anotação</small><p>{nota}</p></div>}

        {aberto && (
          <div className="ce-item__porque">
            {comentario === undefined && <p className="texto-2">Carregando o comentário…</p>}
            {comentario === null && <p className="texto-2">Esta questão ainda não tem comentário.</p>}
            {comentario?.conceito && <><p className="meta">CONCEITO-CHAVE</p><TextoEditorial texto={comentario.conceito} /></>}
            {porQueErrei && <><p className="meta">POR QUE A {marcada} ESTÁ ERRADA</p><TextoEditorial texto={porQueErrei} /></>}
            {comentario?.correta && <><p className="meta">POR QUE A {questao?.gabarito} ESTÁ CERTA</p><TextoEditorial texto={comentario.correta} /></>}
          </div>
        )}

        <div className="ce-item__rodape">
          <p className="ce-item__meta">
            Errou {erro.erros}× · última resposta em {dataCurta.format(erro.registro.q)}
          </p>
          <div className="ce-item__acoes nao-imprime">
            <button type="button" className="botao botao--fantasma" onClick={() => definirAberto((v) => !v)} aria-expanded={aberto}>
              <Icone nome={aberto ? 'cima' : 'livro'} tamanho={16} /> {aberto ? 'Fechar' : 'Entender o erro'}
            </button>
            <a className="botao botao--principal" href={href(`/questao/${erro.id}`)}>
              <Icone nome="reiniciar" tamanho={16} /> Refazer
            </a>
          </div>
        </div>
      </div>
    </li>
  )
}

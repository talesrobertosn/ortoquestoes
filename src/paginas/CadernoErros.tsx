import { useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestoes } from '../dados/acervo'
import { carregarComentarios } from '../dados/comentarios'
import { FILTROS_VAZIOS, type ComentarioIA, type Indice, type Letra, type Questao } from '../dados/tipos'
import { Icone } from '../componentes/Icone'
import { TextoEditorial } from '../componentes/TextoEditorial'
import { usarArmazenado } from '../estado/usarArmazenado'
import { usarSessao } from '../estado/sessao'
import type { RegistroQuestao } from '../estado/revisao'
import { filtrosParaConsulta, href, navegar } from '../util/rotas'

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
}

const POR_PAGINA = 12
const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })

function levantarErros(indice: Indice, respondidas: Record<string, RegistroQuestao>): Erro[] {
  const lista: Erro[] = []
  for (const item of indice.questoes) {
    const r = respondidas[item.id]
    if (!r) continue
    const erros = r.erros ?? (r.c === false ? 1 : 0)
    if (erros === 0 && r.c !== false) continue
    const ultimoErro = [...(r.historico ?? [])].reverse().find((h) => h.correta === false)
    lista.push({
      id: item.id, registro: r, erros: Math.max(erros, 1), aberto: r.c === false,
      comCerteza: r.c === false ? r.confianca === 'seguro' : ultimoErro?.confianca === 'seguro',
      tema: item.t, subtemas: item.s,
    })
  }
  return lista
}

/**
 * Caderno de erros: tudo o que a pessoa já errou, num lugar só, com o que ela
 * marcou, o gabarito e o porquê. Refazer está a um toque; o caderno também
 * mostra o que já foi corrigido, porque ver o erro virar acerto motiva.
 */
export function CadernoErros() {
  const { indice } = usarIndice()
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const [notas] = usarArmazenado<Record<string, string>>('notas', {})
  const { iniciar } = usarSessao()
  const [situacao, definirSituacao] = usarArmazenado<Situacao>('erros:situacao', 'abertos')
  const [ordem, definirOrdem] = usarArmazenado<Ordem>('erros:ordem', 'recentes')
  const [tema, definirTema] = useState<number | null>(null)
  const [limite, definirLimite] = useState(POR_PAGINA)
  const [questoes, definirQuestoes] = useState<Map<string, Questao>>(new Map())

  const todos = useMemo(() => (indice ? levantarErros(indice, respondidas) : []), [indice, respondidas])
  const abertos = todos.filter((e) => e.aberto)
  const corrigidos = todos.length - abertos.length
  const comCerteza = abertos.filter((e) => e.comCerteza).length

  const daSituacao = todos.filter((e) => situacao === 'todos' || (situacao === 'abertos' ? e.aberto : !e.aberto))
  const porTema = new Map<number, number>()
  for (const e of daSituacao) porTema.set(e.tema, (porTema.get(e.tema) ?? 0) + 1)
  const visiveis = daSituacao
    .filter((e) => tema === null || e.tema === tema)
    .sort((a, b) => ordem === 'frequentes' ? b.erros - a.erros || b.registro.q - a.registro.q : b.registro.q - a.registro.q)

  // Onde os erros em aberto se concentram, por subtema.
  const focos = useMemo(() => {
    if (!indice) return []
    const contagem = new Map<number, number>()
    for (const e of abertos) for (const s of e.subtemas) contagem.set(s, (contagem.get(s) ?? 0) + 1)
    return [...contagem.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([s, n]) => ({ nome: indice.subtemas[s], n }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, respondidas])

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

  useEffect(() => { definirLimite(POR_PAGINA) }, [situacao, tema, ordem])

  const refazer = (ids: string[]) => {
    if (!ids.length) return
    iniciar({ ...FILTROS_VAZIOS, situacao: 'erradas', limite: ids.length, embaralhar: true }, ids)
    navegar('/sessao')
  }

  if (!indice) return <div className="estado"><p>Abrindo seu caderno…</p></div>

  if (todos.length === 0) {
    return (
      <div className="empilha-2">
        <section className="rv-heroi ce-heroi">
          <div>
            <p className="rv-heroi__sobrelinha"><Icone nome="lapis" tamanho={16} /> Caderno de erros</p>
            <h1>Nenhum erro por aqui, ainda.</h1>
            <p className="rv-heroi__texto">Cada questão que você errar vem para este caderno, com o que você marcou, o gabarito e o porquê. É o material de revisão mais valioso que existe: feito sob medida pelas suas próprias dúvidas.</p>
            <a className="botao rv-heroi__acao" href={href('/treinar')}>Treinar agora</a>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="empilha-2 ce">
      <section className="rv-heroi ce-heroi">
        <div>
          <p className="rv-heroi__sobrelinha"><Icone nome="lapis" tamanho={16} /> Caderno de erros</p>
          <h1>
            <span className="rv-heroi__numero numerico">{abertos.length}</span>
            {abertos.length === 1 ? 'erro esperando revanche' : 'erros esperando revanche'}
          </h1>
          <p className="rv-heroi__texto">
            {abertos.length
              ? 'Cada erro com o que você marcou, o gabarito e o porquê. Leia, entenda e refaça: acertou, ele vai para os corrigidos.'
              : 'Todos os seus erros já viraram acerto. Continue treinando: o caderno se preenche sozinho.'}
          </p>
          <div className="linha linha--empilha-celular">
            {abertos.length > 0 && (
              <button className="botao rv-heroi__acao" onClick={() => refazer([...abertos].sort((a, b) => b.registro.q - a.registro.q).slice(0, 10).map((e) => e.id))}>
                Refazer {Math.min(10, abertos.length)} agora
              </button>
            )}
            {abertos.length > 10 && (
              <button className="botao rv-heroi__secundaria" onClick={() => refazer(abertos.map((e) => e.id))}>Todos os {abertos.length}</button>
            )}
            <button className="botao rv-heroi__secundaria nao-imprime" onClick={() => window.print()}>
              <Icone nome="impressora" tamanho={16} /> Imprimir
            </button>
          </div>
        </div>
        <dl className="rv-heroi__numeros">
          <div><dt>Em aberto</dt><dd className="numerico">{abertos.length}</dd></div>
          <div><dt>Já corrigidos</dt><dd className="numerico">{corrigidos}</dd></div>
          <div title="Errou marcando 'tenho certeza'"><dt>Errou com certeza</dt><dd className="numerico">{comCerteza}</dd></div>
        </dl>
      </section>

      {focos.length > 0 && (
        <section className="ce-focos">
          <div>
            <p className="meta">ONDE SEUS ERROS SE CONCENTRAM</p>
            <p className="texto-2">Subtemas com mais erros em aberto. Vale reler o capítulo antes de refazer.</p>
          </div>
          <ul>
            {focos.map((f) => (
              <li key={f.nome}><a href={href(`/treinar${filtrosParaConsulta({ ...FILTROS_VAZIOS, subtemas: [f.nome], situacao: 'erradas' })}`)}>{f.nome} <span className="numerico">{f.n}</span></a></li>
            ))}
          </ul>
        </section>
      )}

      <section className="ce-filtros nao-imprime" aria-label="Filtros do caderno">
        <div className="ce-abas" role="tablist">
          {([['abertos', 'Em aberto', abertos.length], ['corrigidos', 'Corrigidos', corrigidos], ['todos', 'Todos', todos.length]] as const).map(([valor, rotulo, n]) => (
            <button key={valor} role="tab" aria-selected={situacao === valor} className={situacao === valor ? 'ativo' : ''} onClick={() => { definirSituacao(valor); definirTema(null) }}>
              {rotulo} <span className="numerico">{n}</span>
            </button>
          ))}
        </div>
        <label className="ce-ordem">
          Ordenar
          <select className="entrada" value={ordem} onChange={(e) => definirOrdem(e.target.value as Ordem)}>
            <option value="recentes">Mais recentes</option>
            <option value="frequentes">Mais erradas</option>
          </select>
        </label>
        {porTema.size > 1 && (
          <div className="ce-temas">
            <button className={tema === null ? 'ativo' : ''} onClick={() => definirTema(null)}>Todos os temas</button>
            {[...porTema.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => (
              <button key={t} className={tema === t ? 'ativo' : ''} onClick={() => definirTema(t)}>
                {indice.temas[t]?.nome} <span className="numerico">{n}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {visiveis.length === 0 ? (
        <p className="estado">{situacao === 'corrigidos' ? 'Nenhum erro corrigido ainda. Refaça um erro e acerte: ele aparece aqui.' : 'Nenhum erro com esses filtros.'}</p>
      ) : (
        <ol className="ce-lista">
          {pagina.map((e) => (
            <ItemErro key={e.id} erro={e} questao={questoes.get(e.id)} indice={indice} nota={notas[e.id]} />
          ))}
        </ol>
      )}

      {visiveis.length > limite && (
        <button className="botao botao--fantasma ce-mais nao-imprime" onClick={() => definirLimite((n) => n + POR_PAGINA)}>
          Mostrar mais {Math.min(POR_PAGINA, visiveis.length - limite)} de {visiveis.length - limite}
        </button>
      )}
    </div>
  )
}

function ItemErro({ erro, questao, indice, nota }: { erro: Erro; questao?: Questao; indice: Indice; nota?: string }) {
  const [aberto, definirAberto] = useState(false)
  const [comentario, definirComentario] = useState<ComentarioIA | null | undefined>(undefined)
  const temaInfo = indice.temas[erro.tema]
  const marcada = erro.registro.m as Letra | undefined
  const alternativa = (l?: Letra | null) => questao?.alternativas.find((a) => a.letra === l)

  useEffect(() => {
    if (!aberto || comentario !== undefined || !temaInfo) return
    let vivo = true
    carregarComentarios(temaInfo.slug).then((arquivo) => vivo && definirComentario(arquivo[erro.id] ?? null))
    return () => { vivo = false }
  }, [aberto, comentario, temaInfo, erro.id])

  const porQueErrei = marcada && marcada !== questao?.gabarito ? comentario?.incorretas?.[marcada] : null

  return (
    <li className={`ce-item${erro.aberto ? ' ce-item--aberto' : ' ce-item--corrigido'}`}>
      <div className="ce-item__topo">
        <span className="ce-item__assunto">{temaInfo?.nome}{erro.subtemas[0] !== undefined && <> · {indice.subtemas[erro.subtemas[0]]}</>}</span>
        <span className="ce-item__selos">
          {erro.comCerteza && <span className="ce-selo ce-selo--certeza" title="Você marcou 'tenho certeza' e errou">Errou com certeza</span>}
          <span className={`ce-selo ${erro.aberto ? 'ce-selo--aberto' : 'ce-selo--corrigido'}`}>{erro.aberto ? 'Em aberto' : 'Corrigido'}</span>
        </span>
      </div>
      <p className="ce-item__meta">
        Errou {erro.erros}× · última resposta em {dataCurta.format(erro.registro.q)}
      </p>

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

      <div className="ce-item__acoes nao-imprime">
        <button className="botao botao--fantasma" onClick={() => definirAberto((v) => !v)} aria-expanded={aberto}>
          <Icone nome={aberto ? 'cima' : 'livro'} tamanho={16} /> {aberto ? 'Fechar' : 'Entender o erro'}
        </button>
        <a className="botao botao--principal" href={href(`/questao/${erro.id}`)}>
          <Icone nome="reiniciar" tamanho={16} /> Refazer
        </a>
      </div>
    </li>
  )
}

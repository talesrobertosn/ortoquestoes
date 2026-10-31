import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { NoAssunto } from '../dados/acervo'
import { normalizar } from '../dados/acervo'
import { Icone } from './Icone'

const colacao = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })
/** Subtemas em ordem alfabética, com os "Outros temas..." sempre no fim. */
function ordenar(nomes: string[]): string[] {
  const resto = (s: string) => /^outr[ao]s? /i.test(s)
  return [...nomes].sort((a, b) => Number(resto(a)) - Number(resto(b)) || colacao.compare(a, b))
}

interface Props {
  arvore: NoAssunto[]
  temas: string[]
  subtemas: string[]
  porTema: Record<string, number>
  porSubtema: Record<string, number>
  aoMudar: (temas: string[], subtemas: string[]) => void
  /** 'menu' abre num painel flutuante; 'lista' fica sempre aberta na página. */
  variante?: 'menu' | 'lista'
}

/**
 * Filtro de assunto: árvore de dois níveis com busca dentro do seletor.
 * Marcar um tema quer dizer "o tema inteiro"; marcar subtemas quer dizer
 * "só estes". As duas seleções se somam.
 */
export function SeletorArvore({
  arvore,
  temas,
  subtemas,
  porTema,
  porSubtema,
  aoMudar,
  variante = 'menu',
}: Props) {
  const lista = variante === 'lista'
  const [aberto, definirAberto] = useState(lista)
  const [busca, definirBusca] = useState('')
  // "Ver só os marcados": confere e tira escolhas sem rolar a lista inteira.
  const [soMarcados, definirSoMarcados] = useState(false)
  // Temas começam fechados: a grade mostra todos de uma vez, e os subtemas
  // abrem sob demanda logo abaixo do cartão.
  const [abertos, definirAbertos] = useState<string[]>([])
  const caixa = useRef<HTMLDivElement>(null)
  const idBusca = useId()

  useEffect(() => {
    if (!aberto || lista) return
    function foraDaCaixa(evento: MouseEvent) {
      if (caixa.current && !caixa.current.contains(evento.target as Node)) definirAberto(false)
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') definirAberto(false)
    }
    document.addEventListener('mousedown', foraDaCaixa)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', foraDaCaixa)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto, lista])

  const ordenada = useMemo(() => arvore.map((no) => ({ ...no, subtemas: ordenar(no.subtemas) })), [arvore])
  const filtrada = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (soMarcados && !termo) {
      return ordenada
        .map((no) => (temas.includes(no.slug) ? no : { ...no, subtemas: no.subtemas.filter((s) => subtemas.includes(s)) }))
        .filter((no) => temas.includes(no.slug) || no.subtemas.length > 0)
    }
    if (!termo) return ordenada
    return ordenada
      .map((no) => {
        const temaBate = normalizar(no.nome).includes(termo)
        const filhos = temaBate
          ? no.subtemas
          : no.subtemas.filter((s) => normalizar(s).includes(termo))
        return temaBate || filhos.length > 0 ? { ...no, subtemas: filhos } : null
      })
      .filter((no): no is NoAssunto => no !== null)
  }, [ordenada, busca, soMarcados, temas, subtemas])

  const total = temas.length + subtemas.length
  const resumo =
    total === 0
      ? 'Todos os assuntos'
      : total === 1
        ? (temas[0] ? (arvore.find((n) => n.slug === temas[0])?.nome ?? temas[0]) : subtemas[0])
        : `${total} assuntos selecionados`

  function alternarTema(slug: string, no: NoAssunto) {
    if (temas.includes(slug)) {
      aoMudar(
        temas.filter((t) => t !== slug),
        subtemas,
      )
    } else {
      // Ao marcar o tema inteiro, as marcações de subtema dele saem de cena.
      aoMudar(
        [...temas, slug],
        subtemas.filter((s) => !no.subtemas.includes(s)),
      )
    }
  }

  function alternarSubtema(no: NoAssunto, nome: string) {
    if (temas.includes(no.slug)) {
      // Tema inteiro marcado: desmarcar um subtema vira "todos os outros deste tema".
      aoMudar(temas.filter((t) => t !== no.slug), [...subtemas, ...no.subtemas.filter((s) => s !== nome && !subtemas.includes(s))])
      return
    }
    aoMudar(
      temas,
      subtemas.includes(nome) ? subtemas.filter((s) => s !== nome) : [...subtemas, nome],
    )
  }

  /** Marca todos os subtemas com questões deste assunto (equivale ao assunto inteiro) ou desmarca todos. */
  function marcarTodosDoTema(no: NoAssunto, marcar: boolean) {
    const fora = subtemas.filter((s) => !no.subtemas.includes(s))
    if (marcar) aoMudar([...temas.filter((t) => t !== no.slug), no.slug], fora)
    else aoMudar(temas.filter((t) => t !== no.slug), fora)
  }

  const buscando = busca.trim().length > 0
  const termoBusca = normalizar(busca.trim())
  /** O nome com o trecho buscado em destaque (sem depender de acento nem de maiúscula). */
  function comDestaque(nome: string) {
    if (!termoBusca) return nome
    const i = normalizar(nome).indexOf(termoBusca)
    if (i < 0) return nome
    return <>{nome.slice(0, i)}<mark className="seletor__achado">{nome.slice(i, i + termoBusca.length)}</mark>{nome.slice(i + termoBusca.length)}</>
  }

  return (
    <div className={'seletor' + (lista ? ' seletor--lista' : '')} ref={caixa}>
      {!lista && (
        <button
          type="button"
          className="seletor__gatilho"
          aria-expanded={aberto}
          aria-haspopup="true"
          onClick={() => definirAberto((a) => !a)}
        >
          <span className={'seletor__resumo' + (total === 0 ? ' seletor__resumo--vazio' : '')}>
            {resumo}
          </span>
          <Icone nome={aberto ? 'cima' : 'baixo'} tamanho={18} />
        </button>
      )}

      {aberto && (
        <div className="seletor__painel">
          {lista && total > 0 && (
            <ul className="seletor__marcados" aria-label="Assuntos marcados">
              {temas.map((slug) => {
                const no = arvore.find((n) => n.slug === slug)
                return (
                  <li key={'t' + slug}>
                    <button type="button" className="seletor__etiqueta" onClick={() => no && alternarTema(slug, no)} aria-label={`Tirar ${no?.nome ?? slug}`}>
                      {no?.nome ?? slug} <span aria-hidden="true">×</span>
                    </button>
                  </li>
                )
              })}
              {subtemas.map((nome) => (
                <li key={'s' + nome}>
                  <button type="button" className="seletor__etiqueta seletor__etiqueta--sub" onClick={() => aoMudar(temas, subtemas.filter((s) => s !== nome))} aria-label={`Tirar ${nome}`}>
                    {nome} <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="seletor__filtro">
            <label className="seletor__filtro-rotulo" htmlFor={idBusca}>Achar um assunto ou subtema pelo nome</label>
            <div className="seletor__filtro-campo">
              <Icone nome="filtro" tamanho={16} />
              <input
                id={idBusca}
                className="entrada"
                type="search"
                placeholder="Ex.: Kienböck, menisco, escoliose"
                value={busca}
                onChange={(e) => definirBusca(e.target.value)}
                autoFocus={!lista}
              />
              {busca && <button type="button" className="seletor__limpar-busca" onClick={() => definirBusca('')} aria-label="Limpar a busca de assunto"><Icone nome="fechar" tamanho={16} /></button>}
            </div>
            {lista && total > 0 && !buscando && (
              <button type="button" className="seletor__so-marcados" aria-pressed={soMarcados} onClick={() => definirSoMarcados((v) => !v)}>
                {soMarcados ? 'Ver todos os assuntos' : `Ver só os ${total} marcados`}
              </button>
            )}
          </div>

          <div className="seletor__lista seletor__grade">
            {filtrada.length === 0 && (
              <p className="meta" style={{ padding: '0.5rem' }}>
                {soMarcados && !buscando ? 'Nenhum assunto marcado.' : 'Nenhum assunto com esse nome. Apague a busca para ver a lista inteira.'}
              </p>
            )}

            {filtrada.map((no) => {
              const expandido = buscando || abertos.includes(no.slug)
              const marcado = temas.includes(no.slug)
              const marcadosAqui = no.subtemas.filter((s) => subtemas.includes(s)).length
              const parcial = !marcado && marcadosAqui > 0
              return (
                <Fragment key={no.slug}>
                  <div className={'tema-cartao' + (marcado ? ' tema-cartao--marcado' : '') + (parcial ? ' tema-cartao--parcial' : '') + (expandido ? ' tema-cartao--aberto' : '')}>
                    {/* Duas áreas separadas: a da esquerda marca o assunto inteiro; a da direita só abre os subtemas. */}
                    <label className="tema-cartao__principal">
                      <input
                        type="checkbox"
                        checked={marcado}
                        ref={(el) => {
                          if (el) el.indeterminate = parcial
                        }}
                        onChange={() => alternarTema(no.slug, no)}
                      />
                      <span className="tema-cartao__texto">
                        <span className="tema-cartao__nome">{comDestaque(no.nome)}</span>
                        <span className="tema-cartao__estado">
                          {marcado ? 'Assunto inteiro' : parcial ? `${marcadosAqui} de ${no.subtemas.length} subtemas` : `${(porTema[no.slug] ?? 0).toLocaleString('pt-BR')} questões`}
                        </span>
                      </span>
                    </label>
                    {no.subtemas.length > 0 && (
                      <button
                        type="button"
                        className="tema-cartao__sub"
                        aria-expanded={expandido}
                        aria-label={`${expandido ? 'Fechar' : 'Abrir'} os ${no.subtemas.length} subtemas de ${no.nome}`}
                        disabled={buscando}
                        onClick={() =>
                          definirAbertos((a) =>
                            a.includes(no.slug) ? a.filter((s) => s !== no.slug) : [...a, no.slug],
                          )
                        }
                      >
                        <span>{no.subtemas.length} subtemas</span>
                        <Icone nome={expandido ? 'cima' : 'baixo'} tamanho={16} />
                      </button>
                    )}
                  </div>
                  {expandido && no.subtemas.length > 0 && (
                    <div className="subtemas-painel">
                      <div className="subtemas-painel__cabeca">
                        <p className="subtemas-painel__titulo">{marcado ? `${no.nome} inteiro está marcado. Desmarque um subtema para tirar só ele.` : `Subtemas de ${no.nome}, em ordem alfabética`}</p>
                        <span className="subtemas-painel__acoes">
                          <button type="button" className="subtemas-painel__acao" onClick={() => marcarTodosDoTema(no, true)} disabled={marcado}>Marcar todos</button>
                          <button type="button" className="subtemas-painel__acao" onClick={() => marcarTodosDoTema(no, false)} disabled={!marcado && marcadosAqui === 0}>Desmarcar todos</button>
                        </span>
                      </div>
                      <ul className="subtemas-lista">
                        {no.subtemas.map((sub) => {
                          const ativo = marcado || subtemas.includes(sub)
                          const n = porSubtema[sub] ?? 0
                          // Sem questões neste recorte: não dá para marcar (marcar só traria uma sessão vazia). Se já
                          // estava marcado, continua desmarcável.
                          const vazio = n === 0 && !ativo
                          return (
                            <li key={sub} className={'subtemas-lista__item' + (ativo ? ' subtemas-lista__item--ativo' : '') + (n === 0 ? ' subtemas-lista__item--vazio' : '')}>
                              <label title={vazio ? 'Sem questões com os filtros de agora' : undefined}>
                                <input type="checkbox" checked={ativo} disabled={vazio} onChange={() => alternarSubtema(no, sub)} />
                                <span className="subtemas-lista__nome">{comDestaque(sub)}</span>
                                <span className="subtemas-lista__qtd">{vazio ? <><span className="so-leitor">sem questões agora</span><span aria-hidden="true">0</span></> : n.toLocaleString('pt-BR')}</span>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>

          <div className="seletor__rodape">
            <span className="meta">
              {total === 0
                ? 'Sem marcar nenhum, a sessão usa todos os assuntos.'
                : `${total} selecionado${total > 1 ? 's' : ''}`}
            </span>
            <button
              type="button"
              className="botao botao--fantasma"
              onClick={() => aoMudar([], [])}
              disabled={total === 0}
            >
              Limpar
            </button>
            {!lista && (
              <button
                type="button"
                className="botao botao--principal"
                onClick={() => definirAberto(false)}
              >
                Pronto
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

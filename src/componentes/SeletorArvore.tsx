import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { NoAssunto } from '../dados/acervo'
import { normalizar } from '../dados/acervo'
import { Icone } from './Icone'

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

  const filtrada = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return arvore
    return arvore
      .map((no) => {
        const temaBate = normalizar(no.nome).includes(termo)
        const filhos = temaBate
          ? no.subtemas
          : no.subtemas.filter((s) => normalizar(s).includes(termo))
        return temaBate || filhos.length > 0 ? { ...no, subtemas: filhos } : null
      })
      .filter((no): no is NoAssunto => no !== null)
  }, [arvore, busca])

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

  function alternarSubtema(nome: string) {
    aoMudar(
      temas,
      subtemas.includes(nome) ? subtemas.filter((s) => s !== nome) : [...subtemas, nome],
    )
  }

  const buscando = busca.trim().length > 0

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
          <label className="so-leitor" htmlFor={idBusca}>
            Buscar assunto
          </label>
          <input
            id={idBusca}
            className="entrada"
            type="search"
            placeholder="Buscar assunto"
            value={busca}
            onChange={(e) => definirBusca(e.target.value)}
            autoFocus={!lista}
          />

          <div className="seletor__lista seletor__grade">
            {filtrada.length === 0 && (
              <p className="meta" style={{ padding: '0.5rem' }}>
                Nenhum assunto com esse nome. Apague a busca para ver a lista inteira.
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
                    <label className="tema-cartao__principal">
                      <input
                        type="checkbox"
                        checked={marcado}
                        ref={(el) => {
                          if (el) el.indeterminate = parcial
                        }}
                        onChange={() => alternarTema(no.slug, no)}
                      />
                      <span className="tema-cartao__nome">{no.nome}</span>
                      <span className="tema-cartao__qtd">{porTema[no.slug] ?? 0}</span>
                    </label>
                    {no.subtemas.length > 0 && (
                      <button
                        type="button"
                        className="tema-cartao__sub"
                        aria-expanded={expandido}
                        onClick={() =>
                          definirAbertos((a) =>
                            a.includes(no.slug) ? a.filter((s) => s !== no.slug) : [...a, no.slug],
                          )
                        }
                      >
                        {parcial ? `${marcadosAqui} de ${no.subtemas.length} subtemas` : `${no.subtemas.length} subtemas`}
                        <Icone nome={expandido ? 'cima' : 'baixo'} tamanho={14} />
                      </button>
                    )}
                  </div>
                  {expandido && no.subtemas.length > 0 && (
                    <div className="subtemas-painel">
                      <p className="subtemas-painel__titulo">
                        {marcado ? `${no.nome} inteiro está marcado. Desmarque o tema para escolher só alguns subtemas.` : `Subtemas de ${no.nome}`}
                      </p>
                      <div className="subtemas-painel__chips">
                        {no.subtemas.map((sub) => {
                          const ativo = marcado || subtemas.includes(sub)
                          return (
                            <button
                              key={sub}
                              type="button"
                              className="chip-subtema"
                              aria-pressed={ativo}
                              disabled={marcado}
                              onClick={() => alternarSubtema(sub)}
                            >
                              {ativo && <Icone nome="certo" tamanho={13} />}
                              {sub}
                              <span className="chip-subtema__qtd">{porSubtema[sub] ?? 0}</span>
                            </button>
                          )
                        })}
                      </div>
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

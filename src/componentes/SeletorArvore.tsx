import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
}: Props) {
  const [aberto, definirAberto] = useState(false)
  const [busca, definirBusca] = useState('')
  const [abertos, definirAbertos] = useState<string[]>([])
  const caixa = useRef<HTMLDivElement>(null)
  const idBusca = useId()

  useEffect(() => {
    if (!aberto) return
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
  }, [aberto])

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
    <div className="seletor" ref={caixa}>
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
            autoFocus
          />

          <div className="seletor__lista">
            {filtrada.length === 0 && (
              <p className="meta" style={{ padding: '0.5rem' }}>
                Nenhum assunto com esse nome. Apague a busca para ver a lista inteira.
              </p>
            )}

            {filtrada.map((no) => {
              const expandido = buscando || abertos.includes(no.slug)
              const marcadosAqui = no.subtemas.filter((s) => subtemas.includes(s)).length
              return (
                <div className="arvore__tema" key={no.slug}>
                  <div className="arvore__linha">
                    <button
                      type="button"
                      className="arvore__abrir"
                      aria-expanded={expandido}
                      aria-label={`${expandido ? 'Recolher' : 'Expandir'} ${no.nome}`}
                      disabled={no.subtemas.length === 0}
                      onClick={() =>
                        definirAbertos((a) =>
                          a.includes(no.slug) ? a.filter((s) => s !== no.slug) : [...a, no.slug],
                        )
                      }
                    >
                      {no.subtemas.length > 0 && (
                        <Icone nome={expandido ? 'baixo' : 'direita'} tamanho={16} />
                      )}
                    </button>
                    <label className="caixa" style={{ flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={temas.includes(no.slug)}
                        ref={(el) => {
                          if (el) el.indeterminate = !temas.includes(no.slug) && marcadosAqui > 0
                        }}
                        onChange={() => alternarTema(no.slug, no)}
                      />
                      <span style={{ fontWeight: 600 }}>{no.nome}</span>
                    </label>
                    <span className="arvore__contagem">{porTema[no.slug] ?? 0}</span>
                  </div>

                  {expandido &&
                    no.subtemas.map((sub) => (
                      <div className="arvore__linha arvore__linha--filho" key={sub}>
                        <label className="caixa" style={{ flex: 1, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={temas.includes(no.slug) || subtemas.includes(sub)}
                            disabled={temas.includes(no.slug)}
                            onChange={() => alternarSubtema(sub)}
                          />
                          <span>{sub}</span>
                        </label>
                        <span className="arvore__contagem">{porSubtema[sub] ?? 0}</span>
                      </div>
                    ))}
                </div>
              )
            })}
          </div>

          <div className="linha linha--fim">
            <button
              type="button"
              className="botao botao--fantasma"
              onClick={() => aoMudar([], [])}
              disabled={total === 0}
            >
              Limpar assuntos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

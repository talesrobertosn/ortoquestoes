import { useEffect, useRef, useState } from 'react'
import { Icone } from './Icone'

interface Props<T extends string | number> {
  opcoes: T[]
  selecionados: T[]
  contagens?: Record<string | number, number>
  rotuloVazio: string
  rotulo: (valor: T) => string
  aoMudar: (valores: T[]) => void
}

/** Lista simples de seleção múltipla, usada para tipo de prova e ano. */
export function SeletorMultiplo<T extends string | number>({
  opcoes,
  selecionados,
  contagens,
  rotuloVazio,
  rotulo,
  aoMudar,
}: Props<T>) {
  const [aberto, definirAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    function fora(evento: MouseEvent) {
      if (caixa.current && !caixa.current.contains(evento.target as Node)) definirAberto(false)
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') definirAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  const resumo =
    selecionados.length === 0
      ? rotuloVazio
      : selecionados.length <= 3
        ? selecionados.map(rotulo).join(', ')
        : `${selecionados.length} selecionados`

  return (
    <div className="seletor" ref={caixa}>
      <button
        type="button"
        className="seletor__gatilho"
        aria-expanded={aberto}
        aria-haspopup="true"
        onClick={() => definirAberto((a) => !a)}
      >
        <span
          className={'seletor__resumo' + (selecionados.length === 0 ? ' seletor__resumo--vazio' : '')}
        >
          {resumo}
        </span>
        <Icone nome={aberto ? 'cima' : 'baixo'} tamanho={18} />
      </button>

      {aberto && (
        <div className="seletor__painel">
          <div className="seletor__lista">
            {opcoes.length === 0 && (
              <p className="meta" style={{ padding: '0.5rem' }}>
                Nada disponível ainda para este filtro.
              </p>
            )}
            {opcoes.map((opcao) => (
              <div className="arvore__linha" key={String(opcao)}>
                <label className="caixa" style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={selecionados.includes(opcao)}
                    onChange={() =>
                      aoMudar(
                        selecionados.includes(opcao)
                          ? selecionados.filter((v) => v !== opcao)
                          : [...selecionados, opcao],
                      )
                    }
                  />
                  <span>{rotulo(opcao)}</span>
                </label>
                {contagens && (
                  <span className="arvore__contagem">{contagens[opcao as string | number] ?? 0}</span>
                )}
              </div>
            ))}
          </div>
          <div className="linha linha--fim">
            <button
              type="button"
              className="botao botao--fantasma"
              onClick={() => aoMudar([])}
              disabled={selecionados.length === 0}
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

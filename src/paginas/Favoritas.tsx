import { useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestoes } from '../dados/acervo'
import { FILTROS_VAZIOS, type Questao } from '../dados/tipos'
import { Carregando, Estado } from '../componentes/Estados'
import { EstrelaCheia, Icone } from '../componentes/Icone'
import { usarFavoritos, usarSessao } from '../estado/sessao'
import { href, navegar } from '../util/rotas'

/**
 * As favoritas precisavam de um lugar. A estrela existia em toda questão e
 * guardava a marcação, mas não havia tela nenhuma para ver o que foi marcado —
 * a pessoa marcava e a marcação não levava a lugar algum.
 */
export function Favoritas() {
  const { indice } = usarIndice()
  const { favoritos, alternar } = usarFavoritos()
  const { iniciar } = usarSessao()
  const [questoes, definirQuestoes] = useState<Questao[] | null>(null)

  const chave = favoritos.join(',')
  useEffect(() => {
    if (!indice) return
    if (favoritos.length === 0) {
      definirQuestoes([])
      return
    }
    let vivo = true
    carregarQuestoes(indice, favoritos).then((lista) => vivo && definirQuestoes(lista))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, chave])

  const porId = useMemo(
    () => new Map((questoes ?? []).map((q) => [q.id, q])),
    [questoes],
  )

  function treinar() {
    const existentes = favoritos.filter((id) => porId.has(id))
    if (existentes.length === 0) return
    iniciar({ ...FILTROS_VAZIOS, situacao: 'favoritas' }, existentes, {})
    navegar('/sessao')
  }

  if (!questoes) return <Carregando linhas={5} rotulo="Carregando suas favoritas" />

  if (favoritos.length === 0) {
    return (
      <Estado
        titulo="Você ainda não favoritou nenhuma questão."
        acoes={
          <a className="botao botao--principal" href={href('/treinar')}>
            Montar uma sessão
          </a>
        }
      >
        <p>
          Durante a sessão, a estrela no alto da questão guarda ela aqui. Serve para separar o que
          você quer rever depois, sem depender de terminar a sessão.
        </p>
      </Estado>
    )
  }

  return (
    <div className="empilha-2">
      <header className="limite-leitura">
        <h1>Suas favoritas</h1>
        <p className="texto-2" style={{ marginTop: '0.5rem' }}>
          {favoritos.length} {favoritos.length === 1 ? 'questão marcada' : 'questões marcadas'} neste
          navegador.
        </p>
      </header>

      <div className="linha linha--empilha-celular">
        <button type="button" className="botao botao--principal botao--grande" onClick={treinar}>
          Treinar as <span className="numerico">{porId.size}</span> favoritas
        </button>
      </div>

      <ul className="distribuicao">
        {favoritos.map((id) => {
          const questao = porId.get(id)
          return (
            <li className="distribuicao__item" key={id}>
              <div className="favorita">
                <a className="favorita__texto" href={href(`/questao/${id}`)}>
                  {questao ? (
                    <>
                      <span className="etiquetas" style={{ marginBottom: '0.25rem' }}>
                        <span className="etiqueta">{questao.tema}</span>
                        {questao.subtemas.slice(0, 2).map((s) => (
                          <span className="etiqueta" key={s}>
                            {s}
                          </span>
                        ))}
                      </span>
                      <span>
                        {questao.enunciado.slice(0, 160)}
                        {questao.enunciado.length > 160 ? '…' : ''}
                      </span>
                    </>
                  ) : (
                    <span className="texto-2">
                      <span className="numerico">{id}</span> — esta questão saiu do acervo.
                    </span>
                  )}
                </a>
                <button
                  type="button"
                  className="botao-icone"
                  onClick={() => alternar(id)}
                  aria-label={`Remover ${id} das favoritas`}
                  title="Remover das favoritas"
                >
                  <EstrelaCheia />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="meta">
        <Icone nome="estrela" tamanho={14} /> Guardadas só neste navegador, junto com o resto dos
        seus <a href={href('/dados')}>dados locais</a>.
      </p>
    </div>
  )
}

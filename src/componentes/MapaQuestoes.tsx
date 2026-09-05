import type { Resposta } from '../dados/tipos'

/**
 * Mapa de questões no formato da folha de respostas: cada célula traz o número,
 * um glifo de estado e cor. O glifo existe para que o estado não dependa de cor.
 */
export function MapaQuestoes({
  ids,
  respostas,
  revisar,
  posicao,
  aoEscolher,
}: {
  ids: string[]
  respostas: Record<string, Resposta>
  revisar: string[]
  posicao: number
  aoEscolher: (indice: number) => void
}) {
  return (
    <>
      <div className="mapa">
        {ids.map((id, i) => {
          const resposta = respostas[id]
          const marcada = revisar.includes(id)
          const classes = ['mapa__item']
          let glifo = '·'
          let estado = 'não respondida'
          if (resposta) {
            if (resposta.correta === true) {
              classes.push('mapa__item--certa')
              glifo = '✓'
              estado = 'correta'
            } else if (resposta.correta === false) {
              classes.push('mapa__item--errada')
              glifo = '✕'
              estado = 'errada'
            } else {
              glifo = '–'
              estado = 'anulada'
            }
          }
          if (marcada) {
            classes.push('mapa__item--revisar')
            estado += ', marcada para revisão'
          }
          if (i === posicao) classes.push('mapa__item--atual')

          return (
            <button
              key={id}
              type="button"
              className={classes.join(' ')}
              onClick={() => aoEscolher(i)}
              aria-label={`Questão ${i + 1}, ${estado}`}
              aria-current={i === posicao ? 'true' : undefined}
            >
              <span>{i + 1}</span>
              <span className="mapa__glifo" aria-hidden="true">
                {glifo}
              </span>
            </button>
          )
        })}
      </div>

      <div className="legenda">
        <span className="legenda__item">
          <span aria-hidden="true">✓</span> correta
        </span>
        <span className="legenda__item">
          <span aria-hidden="true">✕</span> errada
        </span>
        <span className="legenda__item">
          <span aria-hidden="true">·</span> não respondida
        </span>
        <span className="legenda__item">
          <span aria-hidden="true">–</span> anulada
        </span>
        <span className="legenda__item">contorno tracejado: marcada para revisão</span>
      </div>
    </>
  )
}

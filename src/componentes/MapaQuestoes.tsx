import type { Resposta } from '../dados/tipos'
import { Icone } from './Icone'

type Estado = 'certa' | 'errada' | 'anulada' | 'marcada' | 'vazia'

/**
 * Mapa de questões no formato da folha de respostas: cada célula traz o número,
 * um glifo de estado e cor. O glifo existe para que o estado não dependa de cor.
 * Redesenho de 18/10/2026: grade de pixel (sx-mapa) com as mesmas cores da trilha da
 * sessão, ícones de certo e errado, a atual em ouro e a legenda com a contagem de cada estado.
 */
export function MapaQuestoes({
  ids,
  respostas,
  revisar,
  posicao,
  aoEscolher,
  revelar = true,
}: {
  ids: string[]
  respostas: Record<string, Resposta>
  revisar: string[]
  posicao: number
  aoEscolher: (indice: number) => void
  /** Em simulado o mapa mostra só o que foi respondido, sem dizer se acertou. */
  revelar?: boolean
}) {
  const contagem: Record<Estado, number> = { certa: 0, errada: 0, anulada: 0, marcada: 0, vazia: 0 }
  let paraRevisar = 0
  const itens = ids.map((id, i) => {
    const resposta = respostas[id]
    const marcada = revisar.includes(id)
    const classes = ['mapa__item', 'sx-mapa__item']
    let estado: Estado = 'vazia'
    let rotulo = 'não respondida'
    if (resposta && !revelar) {
      estado = 'marcada'
      rotulo = 'respondida'
    } else if (resposta) {
      if (resposta.correta === true) { estado = 'certa'; rotulo = 'correta' }
      else if (resposta.correta === false) { estado = 'errada'; rotulo = 'errada' }
      else { estado = 'anulada'; rotulo = 'anulada' }
    }
    contagem[estado]++
    if (estado !== 'vazia' && estado !== 'anulada') classes.push(`mapa__item--${estado}`)
    classes.push(`sx-mapa__item--${estado}`)
    if (marcada) {
      paraRevisar++
      classes.push('mapa__item--revisar')
      rotulo += ', marcada para revisão'
    }
    if (i === posicao) classes.push('mapa__item--atual')

    return (
      <button
        key={id}
        type="button"
        className={classes.join(' ')}
        onClick={() => aoEscolher(i)}
        aria-label={`Questão ${i + 1}, ${rotulo}${i === posicao ? ', atual' : ''}`}
        aria-current={i === posicao ? 'true' : undefined}
      >
        <span className="sx-mapa__numero">{i + 1}</span>
        <span className="mapa__glifo sx-mapa__glifo" aria-hidden="true">
          <Glifo estado={estado} />
        </span>
        {marcada && <span className="sx-mapa__bandeira" aria-hidden="true" />}
      </button>
    )
  })

  const legenda: Array<{ estado: Estado | 'atual' | 'revisar'; texto: string; n?: number }> = revelar
    ? [
        { estado: 'certa', texto: 'correta', n: contagem.certa },
        { estado: 'errada', texto: 'errada', n: contagem.errada },
        { estado: 'vazia', texto: 'não respondida', n: contagem.vazia },
        ...(contagem.anulada ? [{ estado: 'anulada' as const, texto: 'anulada', n: contagem.anulada }] : []),
      ]
    : [
        { estado: 'marcada', texto: 'respondida', n: contagem.marcada },
        { estado: 'vazia', texto: 'não respondida', n: contagem.vazia },
      ]
  legenda.push({ estado: 'atual', texto: 'atual' })
  legenda.push({ estado: 'revisar', texto: 'marcada para revisão', n: paraRevisar })

  return (
    <>
      <div className="mapa sx-mapa">{itens}</div>

      <ul className="legenda sx-mapa__legenda" aria-label="Legenda do mapa">
        {legenda.map((l) => (
          <li key={l.estado} className="legenda__item sx-mapa__chave">
            <span className={`sx-mapa__amostra sx-mapa__amostra--${l.estado}`} aria-hidden="true">
              {l.estado === 'atual' || l.estado === 'revisar' ? null : <Glifo estado={l.estado} />}
            </span>
            {l.texto}
            {!!l.n && <b className="sx-mapa__conta">{l.n}</b>}
          </li>
        ))}
      </ul>
    </>
  )
}

function Glifo({ estado }: { estado: Estado }) {
  if (estado === 'certa') return <Icone nome="certo" tamanho={12} />
  if (estado === 'errada') return <Icone nome="errado" tamanho={12} />
  return <>{estado === 'marcada' ? '•' : estado === 'anulada' ? '–' : '·'}</>
}

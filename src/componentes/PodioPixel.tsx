import type { ReactNode } from 'react'
import { recurso } from '../config'

/**
 * Pódio do ranking em pixel art (14/10/2026): uma cena pintada
 * (scripts/cenarios/podio.py), com o cavaleiro chibi nos três degraus, e
 * logo abaixo as três placas, alinhadas com os degraus (2º, 1º, 3º).
 *   festa   dia de festival (ranking das questões)
 *   cripta  salão de pedra à noite (ranking dos Flashcards)
 */
export interface LugarPodio { posicao: number; nome: string; valor: string; detalhe?: string; ehVoce?: boolean; extra?: ReactNode }

const TITULO_LUGAR = ['', 'Campeão', 'Vice', 'Terceiro']

export function PodioPixel({ lugares, cena, titulo }: { lugares: LugarPodio[]; cena: 'festa' | 'cripta'; titulo: string }) {
  const por = new Map(lugares.map((l) => [l.posicao, l]))
  const ordem = [2, 1, 3].map((p) => por.get(p)).filter(Boolean) as LugarPodio[]
  return (
    <section className={`pdx pdx--${cena}`} aria-label="Três primeiros colocados">
      <div className="pdx__cena">
        <img src={recurso(`ranking/podio-${cena}.png`)} alt="" width={480} height={220} draggable={false} />
        <p className="pdx__titulo"><span>{titulo}</span></p>
        <span className="pdx__brilho" aria-hidden="true" />
        <span className="pdx__confete" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: `${18 + ((i * 37) % 64)}%`, animationDelay: `${-((i * 0.53) % 4)}s`, ['--c' as string]: ['#ffcf4a', '#e04a3a', '#4a8ae0', '#5ab85a', '#f08ac0', '#ffffff'][i % 6] }} />)}</span>
      </div>
      <ol className="pdx__placas">
        {ordem.map((l) => (
          <li key={l.posicao} className={`pdx__placa pdx__placa--${l.posicao}${l.ehVoce ? ' pdx__placa--voce' : ''}`}>
            <span className="pdx__lugar">{l.posicao}º · {TITULO_LUGAR[l.posicao]}</span>
            <strong className="pdx__nome">{l.nome}{l.ehVoce && <span className="pdx__voce">você</span>}</strong>
            <span className="pdx__valor">{l.valor}</span>
            {l.detalhe && <small className="pdx__detalhe">{l.detalhe}</small>}
            {l.extra}
          </li>
        ))}
      </ol>
    </section>
  )
}

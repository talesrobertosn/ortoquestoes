import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ler, gravar } from '../../estado/armazenamento'
import { COMPORTAMENTOS, fantasiaDoMes, type Fantasia, type IdComportamento } from './comportamentos'
import { SPRITE_ESQUELETO, linhaEsqueleto, LINHAS_ESQUELETO } from './sprites'
import { urlCss } from '../../config'
import { FALAS, FALAS_GERAIS, FALAS_HALLOWEEN } from './falas'
import './Mascote.css'

/**
 * O mascote do Orto Questões (30/10/2026): o esqueletinho de armadura em pixel art HD-2D, pintado por
 * scripts/gerar_mascote.py (uma linha da folha por comportamento, 8 quadros). A cada visita ele aparece fazendo uma
 * coisa diferente da anterior e fala frases daquela situação. Clicar troca o que está fazendo; cinco cliques seguidos
 * e ele cochila. Em outubro veste o manto de Halloween (foice, lanterna de abóbora, castiçal e morcegos).
 *
 * Reaproveitável em qualquer página: <Mascote /> ocupa o tamanho que o CSS der (proporção 96 x 128) e pode receber
 * um comportamento fixo, uma fantasia, ficar sem falas ou sem clique (interativo={false}, dentro de um link).
 */
const CHAVE = 'mascote:ultimo'

function sortear<T>(lista: readonly T[], evitar?: T): T {
  const opcoes = lista.length > 1 && evitar !== undefined ? lista.filter((x) => x !== evitar) : lista
  return opcoes[Math.floor(Math.random() * opcoes.length)]
}

/** Os comportamentos do sorteio: no mês da fantasia, só os dela (com o manto); fora dele, os do dia a dia. */
function sorteio(fantasia: Fantasia): IdComportamento[] {
  return COMPORTAMENTOS.filter((c) => c.halloween === (fantasia === 'halloween')).map((c) => c.id)
}

export function Mascote({ comportamento, fantasia: fixa, falar = true, interativo = true, className = '', style }: {
  comportamento?: IdComportamento; fantasia?: Fantasia; falar?: boolean
  /** false: só o desenho, sem botão (para usar dentro de um link). */
  interativo?: boolean; className?: string; style?: CSSProperties
}) {
  const fantasia = fixa ?? fantasiaDoMes()
  const opcoes = sorteio(fantasia)
  const [atual, definirAtual] = useState<IdComportamento>(() => {
    if (comportamento) return comportamento
    const escolhido = sortear(opcoes, ler<IdComportamento | null>(CHAVE, null) ?? undefined)
    gravar(CHAVE, escolhido)
    return escolhido
  })
  const [fala, definirFala] = useState<string | null>(null)
  const cliques = useRef<number[]>([])
  const ultimaFala = useRef<string | undefined>(undefined)

  const novaFala = (id: IdComportamento) => {
    const sorte = Math.random()
    const pool = fantasia === 'halloween' && sorte < 0.25 ? FALAS_HALLOWEEN : sorte < 0.65 ? FALAS[id] : FALAS_GERAIS
    const f = sortear(pool, ultimaFala.current)
    ultimaFala.current = f
    definirFala(f)
  }

  // O balão aparece logo depois de chegar e volta de tempos em tempos.
  useEffect(() => {
    if (!falar) return
    const mostrar = window.setTimeout(() => novaFala(atual), 1400)
    let esconder = window.setTimeout(() => definirFala(null), 8400)
    const ciclo = window.setInterval(() => {
      novaFala(atual)
      window.clearTimeout(esconder)
      esconder = window.setTimeout(() => definirFala(null), 7000)
    }, 16000)
    return () => { window.clearTimeout(mostrar); window.clearTimeout(esconder); window.clearInterval(ciclo) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual, falar])

  const clicar = () => {
    const agora = Date.now()
    cliques.current = [...cliques.current.filter((t) => agora - t < 2500), agora]
    const proximo: IdComportamento = cliques.current.length >= 5 ? 'dormir' : sortear(opcoes, atual)
    if (cliques.current.length >= 5) cliques.current = []
    definirAtual(proximo)
    gravar(CHAVE, proximo)
    if (falar) novaFala(proximo)
  }

  const nome = COMPORTAMENTOS.find((c) => c.id === atual)?.nome ?? ''
  const desenho = (
    <span className="mascote__sprite" aria-hidden="true" style={{
      '--sprite': urlCss(SPRITE_ESQUELETO.src.slice(1)), '--linha': linhaEsqueleto(atual), '--linhas': LINHAS_ESQUELETO.length,
      '--quadros': SPRITE_ESQUELETO.quadrosPorLinha, '--dur': atual === 'dormir' ? '2.6s' : atual === 'malabares' || atual === 'acenar' ? '1.1s' : '1.5s',
    } as CSSProperties} />
  )
  return (
    <span className={`mascote mascote--${atual} ${className}`} style={style}>
      {interativo
        ? <button type="button" className="mascote__corpo" onClick={clicar} aria-label={`O esqueleto mascote está ${nome}. Toque para ele fazer outra coisa.`}>{desenho}</button>
        : <span className="mascote__corpo">{desenho}</span>}
      {fala && <span className="mascote__balao" role="status">{fala}</span>}
    </span>
  )
}

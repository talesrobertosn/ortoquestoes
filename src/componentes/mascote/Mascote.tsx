import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ler, gravar } from '../../estado/armazenamento'
import { COMPORTAMENTOS, entraNoSorteio, fantasiaDoMes, type Fantasia, type IdComportamento } from './comportamentos'
import { SPRITE_ESQUELETO, folhaEsqueleto } from './sprites'
import { urlCss } from '../../config'
import { mapasDeLuz } from './luz'
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

/** Os comportamentos do sorteio: no mês da fantasia, só os dela (com o manto); fora dele, os do dia a dia.
 * As linhas com sorteio: false ficam de fora (só aparecem por id). */
function sorteio(fantasia: Fantasia): IdComportamento[] {
  return COMPORTAMENTOS.filter((c) => entraNoSorteio(c) && c.halloween === (fantasia === 'halloween')).map((c) => c.id)
}

export function Mascote({ comportamento, reacao, fantasia: fixa, falar = true, falas, interativo = true, decorativo = false, className = '', style }: {
  comportamento?: IdComportamento
  /** Falas só desta aparição (ex.: a pausa na fogueira da página inicial), no lugar das do comportamento. */
  falas?: readonly string[]
  /** true: enfeite de uma cena (fora do teclado e do leitor de tela); o clique com o mouse continua. */
  decorativo?: boolean
  /** Reação curta (31/10/2026): toca uma vez este comportamento e volta ao de antes (ex.: comemorar a meta do dia). */
  reacao?: IdComportamento | null
  fantasia?: Fantasia; falar?: boolean
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
    const pool = falas?.length ? falas : fantasia === 'halloween' && sorte < 0.25 ? FALAS_HALLOWEEN : sorte < 0.65 ? FALAS[id] : FALAS_GERAIS
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

  // A reação toca uma vez e devolve o comportamento de antes; com "menos animação", não troca.
  const [reagindo, definirReagindo] = useState<IdComportamento | null>(null)
  useEffect(() => {
    if (!reacao || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    definirReagindo(reacao)
    const fim = window.setTimeout(() => definirReagindo(null), 1300)
    return () => window.clearTimeout(fim)
  }, [reacao])
  const mostrado = reagindo ?? atual

  const nome = COMPORTAMENTOS.find((c) => c.id === mostrado)?.nome ?? ''
  const folha = folhaEsqueleto(mostrado)
  const desenho = (
    <span className="mascote__sprite" aria-hidden="true" style={{
      '--sprite': urlCss(folha.src.slice(1)), '--linha': folha.linha, '--linhas': folha.linhas, ...mapasDeLuz(folha.src),
      '--quadros': SPRITE_ESQUELETO.quadrosPorLinha, '--dur': reagindo ? '1.2s' : atual === 'dormir' ? '2.6s' : atual === 'malabares' || atual === 'acenar' ? '1.1s' : '1.5s',
    } as CSSProperties} />
  )
  return (
    <span className={`mascote mascote--${mostrado}${reagindo ? ' mascote--reagindo' : ''} ${className}`} style={style} aria-hidden={decorativo || undefined}>
      {interativo
        ? <button type="button" className="mascote__corpo" onClick={clicar} tabIndex={decorativo ? -1 : undefined} aria-label={`O esqueleto mascote está ${nome}. Toque para ele fazer outra coisa.`}>{desenho}</button>
        : <span className="mascote__corpo">{desenho}</span>}
      {fala && <span className="mascote__balao" role="status">{fala}</span>}
    </span>
  )
}

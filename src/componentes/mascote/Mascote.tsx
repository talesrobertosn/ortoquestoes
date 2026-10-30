import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { urlCss } from '../../config'
import { ler, gravar } from '../../estado/armazenamento'
import { COMPORTAMENTOS, QUADRO, type IdComportamento } from './comportamentos'
import { FALAS, FALAS_GERAIS } from './falas'
import './Mascote.css'

/**
 * O mascote do Orto Questões (30/10/2026): o esqueleto de touca cirúrgica e estetoscópio, desenhado osso por osso
 * por scripts/gerar_mascote.py. A cada visita ele aparece fazendo uma coisa diferente (lendo, tomando café, assando
 * marshmallow, olhando um raio X, testando o próprio reflexo patelar…) e fala frases sorteadas daquela situação.
 * Clicar nele troca o que está fazendo; cinco cliques seguidos e ele cochila.
 *
 * Reaproveitável em qualquer página: <Mascote /> ocupa o tamanho que o CSS der (proporção 240 x 272) e pode receber
 * um comportamento fixo, sem falas, ou um lado para o balão.
 */
const CHAVE = 'mascote:ultimo'
const ids = COMPORTAMENTOS.map((c) => c.id) as IdComportamento[]

function sortear<T>(lista: readonly T[], evitar?: T): T {
  const opcoes = lista.length > 1 && evitar !== undefined ? lista.filter((x) => x !== evitar) : lista
  return opcoes[Math.floor(Math.random() * opcoes.length)]
}

export function Mascote({ comportamento, falar = true, className = '', style }: {
  comportamento?: IdComportamento; falar?: boolean; className?: string; style?: CSSProperties
}) {
  const [atual, definirAtual] = useState<IdComportamento>(() => {
    if (comportamento) return comportamento
    const escolhido = sortear(ids, ler<IdComportamento | null>(CHAVE, null) ?? undefined)
    gravar(CHAVE, escolhido)
    return escolhido
  })
  const [fala, definirFala] = useState<string | null>(null)
  const cliques = useRef<number[]>([])
  const ultimaFala = useRef<string | undefined>(undefined)

  const novaFala = (id: IdComportamento) => {
    const pool = Math.random() < 0.6 ? FALAS[id] : FALAS_GERAIS
    const f = sortear(pool, ultimaFala.current)
    ultimaFala.current = f
    definirFala(f)
  }

  // O balão aparece logo depois de chegar e volta de tempos em tempos (some sozinho; menos animação: fica parado).
  useEffect(() => {
    if (!falar) return
    let mostrar = window.setTimeout(() => novaFala(atual), 1400)
    let esconder = window.setTimeout(() => definirFala(null), 8400)
    const ciclo = window.setInterval(() => {
      novaFala(atual)
      window.clearTimeout(esconder)
      esconder = window.setTimeout(() => definirFala(null), 7000)
    }, 16000)
    return () => { window.clearTimeout(mostrar); window.clearTimeout(esconder); window.clearInterval(ciclo); mostrar = 0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual, falar])

  const clicar = () => {
    const agora = Date.now()
    cliques.current = [...cliques.current.filter((t) => agora - t < 2500), agora]
    const proximo = cliques.current.length >= 5 ? 'dormir' : sortear(ids, atual)
    if (cliques.current.length >= 5) cliques.current = []
    definirAtual(proximo)
    gravar(CHAVE, proximo)
    if (falar) novaFala(proximo)
  }

  const linha = ids.indexOf(atual)
  const info = COMPORTAMENTOS[linha]
  return (
    <span className={`mascote mascote--${atual} ${className}`} style={style}>
      <button type="button" className="mascote__corpo" onClick={clicar} aria-label={`O esqueleto mascote está ${info.nome}. Toque para ele fazer outra coisa.`}
        style={{ '--sprite-mascote': urlCss('pixel/mascote/esqueleto.webp'), '--linha': linha, '--linhas': COMPORTAMENTOS.length, '--quadros': QUADRO.quadros, '--dur': `${info.duracao}s` } as CSSProperties} />
      {atual === 'dormir' && <span className="mascote__zzz" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span>}
      {fala && <span className="mascote__balao" role="status">{fala}</span>}
    </span>
  )
}

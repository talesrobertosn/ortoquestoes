import { CorujaPixel } from '../biblioteca/sala/CorujaPixel'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Periodo } from '../estado/aparencia'
import { CORES_LAMPADAS, usarEmVista, usarMenosMovimento, usarNatalInicio } from './InteracoesInicio'
import { modoNatalAtivo } from './modoNatal'
import '../estilos/natal/NatalInicio.css'

/*
 * Os enfeites de Natal da página inicial (modo Natal, docs/design/MODO-NATAL.md), refeitos em 21/11/2026 depois da
 * crítica do Tales ("exagerou em cima e embaixo nada"): poucas peças, bem distribuídas, todas pintadas na técnica das
 * cenas do topo (scripts/natal/: arvore.py, fio_topo.py, guirlanda.py, boneco.py), cada uma com a sua luz.
 * - em cima: só um fio leve de lâmpadas na borda do cenário;
 * - no meio: a árvore com o pé na barra de atalhos e a guirlanda pendurada no canto dela;
 * - embaixo: o boneco de neve com a caneca de chocolate quente e a lanterna, no canto do último cartão.
 * Decorativos (aria-hidden, sem clique). Só existem com o modo Natal no ar (ou na prévia ?natal=1).
 */

/** O modo Natal está no ar? (lido uma vez por montagem) */
export function usarNatal(): boolean {
  return useMemo(() => modoNatalAtivo(), [])
}

/** O fio de lâmpadas na borda de cima do topo (dentro do herói, que corta o que sobra). */
export function FestaoNatal() {
  if (!usarNatal()) return null
  return (
    <span className="natal-fio" aria-hidden="true">
      <span className="natal-fio__neve" />
      <span className="natal-fio__luz natal-fio__luz--a" />
      <span className="natal-fio__luz natal-fio__luz--b" />
    </span>
  )
}

/** A guirlanda pendurada no canto de cima à esquerda da barra de atalhos, metade para fora. */
export function GuirlandaNatal() {
  const { visita } = usarNatalInicio()
  if (!usarNatal()) return null
  return (
    <>
      <span className="natal-guirlanda" aria-hidden="true">
        <span className="natal-guirlanda__luz" />
      </span>
      <span className="natal-corujinha-ancora" aria-hidden="true">
        {visita && <VisitaCoruja x={visita.x} y={visita.y} />}
      </span>
    </>
  )
}

function VisitaCoruja({ x, y }: { x: number; y: number }) {
  const [estado, definir] = useState<'voando' | 'parada'>('voando')
  useEffect(() => {
    const pouso = window.setTimeout(() => definir('parada'), 1050)
    const voo = window.setTimeout(() => definir('voando'), 5300)
    return () => { window.clearTimeout(pouso); window.clearTimeout(voo) }
  }, [])
  return <span className="natal-corujinha" style={{ '--origem-x': `${x}px`, '--origem-y': `${y}px` } as CSSProperties}>
    <CorujaPixel estado={estado} />
  </span>
}

/** A árvore de Natal com o pé na barra de atalhos e a copa subindo por cima da trilha da sequência. */
export function ArvoreNatal() {
  const natal = usarNatal()
  const { meta, festa } = usarNatalInicio()
  const [surpresa, revelar] = useState(0)
  const reduz = usarMenosMovimento()
  useEffect(() => {
    if (!surpresa) return
    const fim = window.setTimeout(() => revelar(0), 1600)
    return () => window.clearTimeout(fim)
  }, [surpresa])
  if (!natal) return null
  return (
    <span className={`natal-arvore${meta ? ' natal-arvore--meta' : ''}`}>
      <span className="natal-arvore__img">
        <span className="natal-arvore__luz" aria-hidden="true" />
        <span className="natal-arvore__pisca" aria-hidden="true" />
        <span className="natal-arvore__estrela" aria-hidden="true" />
        {meta && festa > 0 && <span className="natal-arvore__festa" key={festa} aria-hidden="true" />}
        <button type="button" className="natal-arvore__toque" aria-label="Tocar na estrela da árvore de Natal"
          onClick={() => revelar((valor) => valor + 1)} />
        {surpresa > 0 && <span className="natal-arvore__surpresa" key={surpresa} aria-hidden="true">
          {Array.from({ length: reduz ? 6 : 16 }, (_, i) => (
            <i key={i} style={{ '--x': `${((i * 47) % 135) - 67}px`, '--y': `${26 + (i * 31) % 142}px`, '--d': `${i * 23}ms` } as CSSProperties} />
          ))}
        </span>}
        <span className="so-leitor" role="status">{surpresa ? 'A estrela soltou neve brilhante.' : ''}</span>
      </span>
    </span>
  )
}

/** O boneco de neve com a caneca e a lanterna, no canto de baixo do último cartão da página. */
export function BonecoNatal() {
  if (!usarNatal()) return null
  return (
    <span className="natal-boneco-ancora" aria-hidden="true">
      <span className="natal-boneco">
        <span className="natal-boneco__luz" />
        <span className="natal-boneco__vapor" />
        <span className="natal-boneco__vapor natal-boneco__vapor--2" />
      </span>
    </span>
  )
}

/** Cada lâmpada pertence à caixa do seu atalho, inclusive nas linhas do celular. */
export function LampadaAtalho({ indice }: { indice: number }) {
  const { ativo, respostas, meta, acesa, balanco } = usarNatalInicio()
  if (!ativo) return null
  const cor = indice % CORES_LAMPADAS.length
  const ligada = meta || indice < respostas
  const destaque = acesa === indice || balanco?.indice === indice
  return (
    <span className="natal-fio-atalho" aria-hidden="true">
      <span className="natal-fio-atalho__lampada" data-lampada={indice} data-acesa={ligada || destaque}
        data-balanco={balanco?.indice === indice}
        style={{ '--cor-lampada': CORES_LAMPADAS[cor], '--casa': cor } as CSSProperties}>
        <span className="natal-fio-atalho__vidro" key={balanco?.indice === indice ? balanco.vez : 0} />
      </span>
    </span>
  )
}

export function ReflexoNatal({ total }: { total: number }) {
  const { ativo, respostas, meta, acesa, balanco } = usarNatalInicio()
  if (!ativo || !total) return null
  return (
    <span className="natal-reflexos" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} data-acesa={meta || i < respostas || acesa === i || balanco?.indice === i}
          style={{ '--cor-lampada': CORES_LAMPADAS[i % CORES_LAMPADAS.length] } as CSSProperties} />
      ))}
    </span>
  )
}

export function NeveAtalhos() {
  const ref = useRef<HTMLSpanElement>(null)
  const { ativo, neve } = usarNatalInicio()
  const reduz = usarMenosMovimento()
  const emVista = usarEmVista(ref, ativo)
  const [camada, definirCamada] = useState(0)
  useEffect(() => {
    if (!ativo || !emVista || reduz) return
    const t = window.setInterval(() => {
      definirCamada((valor) => neve > 0 ? Math.min(1, valor + 0.075 * neve) : Math.max(0, valor - 0.018))
    }, 1000)
    return () => window.clearInterval(t)
  }, [ativo, emVista, neve, reduz])
  if (!ativo) return null
  return <span ref={ref} className="natal-neve-atalhos" aria-hidden="true"
    style={{ '--natal-neve': reduz && neve > 0 ? 0.66 : 0.29 + 0.71 * camada } as CSSProperties} data-acumulada={camada.toFixed(2)} />
}

export function ChocolateNatal({ dias }: { dias: number }) {
  if (!usarNatal()) return null
  return <span className="natal-caneca" aria-hidden="true" style={{ '--natal-vapor': 0.27 + 0.68 * Math.min(1, Math.max(0, dias) / 28) } as CSSProperties}>
    <span className="natal-caneca__vapor" />
    <span className="natal-caneca__vapor natal-caneca__vapor--2" />
  </span>
}

export function TrenoNatal({ periodo }: { periodo: Periodo }) {
  const ref = useRef<HTMLSpanElement>(null)
  const { ativo, marcarTreno } = usarNatalInicio()
  const reduz = usarMenosMovimento()
  const apto = ativo && periodo === 'noite' && !reduz
  const emVista = usarEmVista(ref, apto)
  const [voando, definir] = useState(false)
  useEffect(() => {
    if (!emVista || voando) return
    const inicio = window.setTimeout(() => { if (marcarTreno()) definir(true) }, 7200)
    return () => window.clearTimeout(inicio)
  }, [emVista, voando, marcarTreno])
  if (!apto) return null
  return <span ref={ref} className="natal-treno" aria-hidden="true" data-voando={voando} data-em-vista={emVista}>
    {voando && <i onAnimationEnd={() => definir(false)} />}
  </span>
}

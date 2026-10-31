import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { recurso } from '../../config'
import { CENAS, FOLHA_CENAS, FRASES_GERAIS, LINHAS_CENAS, QUADRO, QUADROS_POR_LINHA, escolherCena, ponte, type Cena, type Trecho } from './cenas'

const CHAVE_ULTIMAS = 'espera:ultimas'
const ultimas = (): string[] => { try { return JSON.parse(sessionStorage.getItem(CHAVE_ULTIMAS) ?? '[]') } catch { return [] } }
const lembrar = (id: string) => { try { sessionStorage.setItem(CHAVE_ULTIMAS, JSON.stringify([...ultimas(), id].slice(-4))) } catch { /* sem sessionStorage */ } }
const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** A folha das cenas, baixada uma vez por sessão (o navegador guarda); se falhar, a espera segue só com a frase. */
let folhaOk: Promise<boolean> | null = null
export function carregarFolhaCenas(): Promise<boolean> {
  return (folhaOk ??= new Promise((ok) => { const img = new Image(); img.onload = () => ok(true); img.onerror = () => { folhaOk = null; ok(false) }; img.src = recurso(FOLHA_CENAS) }))
}

export interface ControleCena { cena?: string; velocidade?: number; pausado?: boolean; quadroFixo?: number; reiniciar?: number }

/**
 * O gato da espera (O Gato Aventureiro, 31/10/2026). Um relógio só (um setTimeout por quadro): toca os trechos da
 * cena, encadeia a próxima com uma ponte de pose se a espera continuar, para com a aba escondida e, com "menos
 * movimento", mostra uma pose parada. Nunca segura a pessoa: quando o conteúdo chega, o componente simplesmente sai.
 */
export function GatoEspera({ escala = 2, contexto, controle, aoMudarFrase }: {
  escala?: number; contexto?: 'conclusao'; controle?: ControleCena; aoMudarFrase?: (frase: string, cena: Cena) => void
}) {
  const parado = semMovimento()
  const primeira = useMemo(() => (controle?.cena ? CENAS.find((c) => c.id === controle.cena) ?? CENAS[0] : escolherCena(ultimas(), Math.random, contexto)), [controle?.cena, controle?.reiniciar]) // eslint-disable-line react-hooks/exhaustive-deps
  const [pronta, definirPronta] = useState(false)
  const [estado, definirEstado] = useState<{ fila: Trecho[]; i: number; vez: number; quadro: number; cena: Cena }>(() => ({ fila: primeira.trechos, i: 0, vez: 0, quadro: 0, cena: primeira }))
  const relogio = useRef<number | undefined>(undefined)
  useEffect(() => { let vivo = true; carregarFolhaCenas().then((ok) => vivo && definirPronta(ok)); return () => { vivo = false } }, [])
  useEffect(() => {
    lembrar(primeira.id)
    definirEstado({ fila: primeira.trechos, i: 0, vez: 0, quadro: 0, cena: primeira })
    aoMudarFrase?.(primeira.frases[Math.floor(Math.random() * primeira.frases.length)], primeira)
  }, [primeira]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pronta || parado || controle?.pausado || controle?.quadroFixo !== undefined) return
    const tr = estado.fila[estado.i]
    const ms = tr.ms / (controle?.velocidade ?? 1)
    // Aba escondida: o relógio para e só volta quando a pessoa volta (nada roda à toa).
    if (document.hidden) {
      const voltar = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', voltar); definirEstado((e) => ({ ...e })) } }
      document.addEventListener('visibilitychange', voltar)
      return () => document.removeEventListener('visibilitychange', voltar)
    }
    relogio.current = window.setTimeout(() => {
      definirEstado((e) => {
        const atual = e.fila[e.i]
        if (e.quadro + 1 < atual.quadros) return { ...e, quadro: e.quadro + 1 }
        if (e.vez + 1 < (atual.vezes ?? 1)) return { ...e, vez: e.vez + 1, quadro: 0 }
        if (e.i + 1 < e.fila.length) return { ...e, i: e.i + 1, vez: 0, quadro: 0 }
        // A espera continua: a próxima cena (com a ponte de pose), ou a mesma de novo no painel de prévia.
        const proxima = controle?.cena ? e.cena : escolherCena([...ultimas(), e.cena.id], Math.random, contexto)
        lembrar(proxima.id)
        aoMudarFrase?.((proxima.id === e.cena.id ? FRASES_GERAIS : proxima.frases)[Math.floor(Math.random() * (proxima.id === e.cena.id ? FRASES_GERAIS.length : proxima.frases.length))], proxima)
        return { fila: [...ponte(e.cena.ate, proxima.de), ...proxima.trechos], i: 0, vez: 0, quadro: 0, cena: proxima }
      })
    }, ms)
    return () => window.clearTimeout(relogio.current)
  }, [estado, pronta, parado, controle?.pausado, controle?.velocidade, controle?.quadroFixo]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!pronta) return null
  const tr = parado ? { linha: 'idle-sentado', quadros: 1, ms: 0 } : estado.fila[estado.i]
  const linha = Math.max(0, LINHAS_CENAS.indexOf(tr.linha as (typeof LINHAS_CENAS)[number]))
  const quadro = parado ? 0 : controle?.quadroFixo ?? estado.quadro
  const w = QUADRO.w * escala, h = QUADRO.h * escala
  return (
    <span className="gato-espera" aria-hidden="true" data-cena={estado.cena.id} data-linha={tr.linha} style={{
      width: w, height: h,
      backgroundImage: `url(${recurso(FOLHA_CENAS)})`,
      backgroundSize: `${QUADROS_POR_LINHA * w}px ${LINHAS_CENAS.length * h}px`,
      backgroundPosition: `${-quadro * w}px ${-linha * h}px`,
    } as CSSProperties} />
  )
}

import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { recurso } from '../config'
import '../estilos/componentes/EsperaPixel.css'

const carregarGato = () => import('./espera/GatoEspera')
const GatoEspera = lazy(() => carregarGato().then((m) => ({ default: m.GatoEspera })))
// O gato (código e folha) desce quando o aparelho fica ocioso, longe das requisições da página: na próxima espera,
// ele já está pronto e não disputa a rede com o conteúdo.
if (typeof window !== 'undefined') {
  const adiantar = () => { void carregarGato().then((m) => m.carregarFolhaCenas()).catch(() => undefined) }
  const ocioso = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  if (ocioso) ocioso(adiantar, { timeout: 8000 }); else window.setTimeout(adiantar, 5000)
}

const FRASES_GUERREIRO = [
  'Aguardando a carroça…',
  'Afiando o fêmur…',
  'Abrindo os portões do castelo…',
  'Selando o cavalo…',
  'O mensageiro está a caminho…',
  'Polindo o escudo…',
  'Acendendo as tochas…',
  'A guarda está chegando…',
]

/** Só aparece se a espera passar disto: carregamento rápido não pisca uma tela de espera. */
const ATRASO_MS = 250
/** Em esperas longas, a frase muda de vez em quando (com as cenas). */
const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A espera do site (conta carregando, página abrindo). Desde 31/10/2026 é o Gato Aventureiro: o gato laranja vive uma
 * pequena cena (dorme, brinca com o novelo, estuda, toma banho...) com uma frase temática, e o guerreiro de antes
 * continua aparecendo de vez em quando. Regras: nada aparece antes de 250 ms (nada de piscar), a espera nunca é
 * esticada para a cena terminar (o conteúdo chega, a espera some), o leitor de tela ouve só "Carregando" uma vez e
 * `acao` só aparece se a espera passar de 3 s.
 */
export function EsperaPixel({ rotulo = 'Carregando', acao }: { rotulo?: string; acao?: ReactNode }) {
  const [visivel, definirVisivel] = useState(false)
  const [guerreiro] = useState(() => Math.random() < 0.12)
  const [frase, definirFrase] = useState(() => FRASES_GUERREIRO[Math.floor(Math.random() * FRASES_GUERREIRO.length)])
  const [demorou, definirDemorou] = useState(false)
  useEffect(() => { const t = window.setTimeout(() => definirVisivel(true), ATRASO_MS); return () => window.clearTimeout(t) }, [])
  useEffect(() => {
    if (!acao) return
    const t = window.setTimeout(() => definirDemorou(true), 3000)
    return () => window.clearTimeout(t)
  }, [acao])
  return (
    <div className={'espera-pixel' + (visivel ? '' : ' espera-pixel--escondida')} role="status" aria-live="polite">
      <span className="so-leitor">{rotulo}</span>
      {visivel && (guerreiro
        ? <><span className="espera-pixel__guerreiro" aria-hidden="true" style={{ backgroundImage: `url(${recurso('ranking/guerreiro.png')})` }} /><span className="espera-pixel__chao" aria-hidden="true" /></>
        : <span className="espera-pixel__palco" aria-hidden="true">
            <Suspense fallback={null}><GatoEspera escala={2} aoMudarFrase={(f) => definirFrase(f)} /></Suspense>
            <span className="espera-pixel__chao" />
          </span>)}
      {visivel && <p className={'espera-pixel__frase' + (semMovimento() ? ' espera-pixel__frase--parada' : '')} aria-hidden="true">{frase}</p>}
      {demorou && <div className="espera-pixel__acao">{acao}</div>}
    </div>
  )
}

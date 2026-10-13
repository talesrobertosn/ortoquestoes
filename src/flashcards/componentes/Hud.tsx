import { forwardRef, memo, useEffect, useRef } from 'react'
import { caixaDoCorpo, pintarPersonagem, POSES, TAMANHO, type Personagem } from '../efeitos/personagens'
import { RECOMPENSAS, type TipoPoder } from '../motor/poderes'
import { Sprite } from './Sprite'

/**
 * Sprite em pixel art com todas as poses pintadas de antemão, uma por canvas.
 * Parado alterna com "respira"; as outras aparecem quando o diretor de efeitos
 * põe `data-pose` no ator (veja `posar` na Arena).
 */
const Quadros = memo(function Quadros({ quem, escala, variante }: { quem: Personagem; escala: number; variante?: string }) {
  const refs = useRef<Record<string, HTMLCanvasElement | null>>({})
  useEffect(() => { for (const pose of POSES) { const c = refs.current[pose]; if (c) pintarPersonagem(c, quem, pose, variante) } }, [quem, variante])
  const [w, h] = TAMANHO[quem]
  const [x, y] = caixaDoCorpo(quem)
  const estilo = { width: w * escala, height: h * escala }
  return (
    <span className="fc-ator__quadros" style={{ ...estilo, left: -x * escala, top: -y * escala }}>
      {POSES.map((pose) => <canvas key={pose} ref={(c) => { refs.current[pose] = c }} className={`fc-ator__q fc-ator__q--${pose}`} style={estilo} />)}
    </span>
  )
})

interface AtorProps {
  quem: Personagem
  escala: number
  classe?: string
  chefe?: boolean
  /** Troca de paleta (variante do adversário ou estágio do herói). */
  variante?: string
  children?: React.ReactNode
}

/**
 * Personagem em cena: sprite no chão, com sombra, luz de recorte e aura.
 * As animações (dano, ataque, bloqueio, derrota) entram por classes no
 * elemento `.fc-ator__corpo`; as poses, por `data-pose` no próprio ator.
 */
export const Ator = forwardRef<HTMLDivElement, AtorProps>(function Ator({ quem, escala, classe, chefe, variante, children }, ref) {
  const [, , w, h] = caixaDoCorpo(quem)
  return (
    <div ref={ref} className={`fc-ator fc-ator--${quem}${chefe ? ' fc-ator--chefe' : ''}${classe ? ' ' + classe : ''}`} style={{ width: w * escala, height: h * escala }}>
      <span className="fc-ator__aura" aria-hidden="true" />
      <span className="fc-ator__sombra" aria-hidden="true" />
      <div className="fc-ator__corpo" aria-hidden="true"><Quadros quem={quem} escala={escala} variante={variante} /></div>
      {children}
    </div>
  )
})

/** Barra de vida com moldura, faixa de dano residual e número legível. */
export function BarraVida({ atual, maximo, tipo, rotulo }: { atual: number; maximo: number; tipo: 'inimigo' | 'heroi' | 'chefe'; rotulo: string }) {
  const pct = Math.max(0, Math.min(100, (100 * atual) / maximo))
  const baixa = tipo === 'heroi' && pct <= 25
  return (
    <div className={`fc-vida fc-vida--${tipo}${baixa ? ' fc-vida--baixa' : ''}`} role="meter" aria-label={rotulo} aria-valuemin={0} aria-valuemax={maximo} aria-valuenow={atual}>
      <span className="fc-vida__trilho">
        <s style={{ width: pct + '%' }} />
        <i style={{ width: pct + '%' }} />
        <em aria-hidden="true" />
      </span>
      <b>{atual}<small>/{maximo}</small></b>
    </div>
  )
}

/** Encaixe de poder: vazio elegante, ícone grande e cargas. */
export function Encaixe({ tipo, carga, extra, usavel, aoUsar }: { tipo?: TipoPoder; carga?: number; extra?: number; usavel?: boolean; aoUsar?: () => void }) {
  if (!tipo) return <span className="fc-encaixe fc-encaixe--vazio" aria-label="Encaixe vazio"><span aria-hidden="true" /></span>
  const d = RECOMPENSAS[tipo]
  return (
    <button type="button" className={`fc-encaixe${usavel ? ' fc-encaixe--usavel' : ''}`} style={{ ['--cor' as string]: d.cor }} disabled={!usavel} onClick={aoUsar}
      title={`${d.nome}: ${d.texto}${usavel ? ' Toque para usar (tecla P).' : ''}`} aria-label={`${d.nome}${carga && carga > 1 ? `, ${carga} cargas` : ''}${usavel ? ', toque para usar' : ''}`}>
      <Sprite nome={d.icone} className="fc-sprite--icone" />
      {(carga ?? 0) > 1 && <b>{carga}</b>}
      {extra !== undefined && <b>{extra}</b>}
    </button>
  )
}

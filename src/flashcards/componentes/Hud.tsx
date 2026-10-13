import { forwardRef, memo } from 'react'
import { caixaDoCorpo, pintarPersonagem, POSES, TAMANHO, type Personagem } from '../efeitos/personagens'
import { RECOMPENSAS, type TipoPoder } from '../motor/poderes'
import { Sprite } from './Sprite'

/** Folhas de sprite já montadas (uma imagem por personagem e variante), reaproveitadas entre telas. */
const folhas = new Map<string, { poses: string; clarao: string }>()
function folhaDe(quem: Personagem, variante?: string) {
  const chave = quem + '|' + (variante ?? '')
  let f = folhas.get(chave)
  if (!f) {
    const [w, h] = TAMANHO[quem]
    const folha = document.createElement('canvas'); folha.width = w * POSES.length; folha.height = h
    const c = folha.getContext('2d')!
    const quadro = document.createElement('canvas')
    POSES.forEach((pose, k) => { pintarPersonagem(quadro, quem, pose, variante); c.drawImage(quadro, k * w, 0) })
    // silhueta branca da pose de dano (o clarão do golpe)
    pintarPersonagem(quadro, quem, 'dano', variante)
    const g = quadro.getContext('2d')!; g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h)
    f = { poses: folha.toDataURL(), clarao: quadro.toDataURL() }
    folhas.set(chave, f)
  }
  return f
}

/**
 * Sprite em pixel art: todas as poses numa folha só (uma imagem), e a pose é
 * escolhida pela posição do fundo. Antes eram 7 canvases empilhados por
 * personagem, cada um uma camada de composição; a folha única deixa o
 * celular bem mais leve. Parado alterna com "respira"; as outras poses
 * aparecem quando o diretor de efeitos põe `data-pose` no ator.
 */
const Quadros = memo(function Quadros({ quem, escala, variante }: { quem: Personagem; escala: number; variante?: string }) {
  const [w, h] = TAMANHO[quem]
  const [x, y] = caixaDoCorpo(quem)
  const f = folhaDe(quem, variante)
  const estilo = { width: w * escala, height: h * escala }
  return (
    <span className="fc-ator__quadros" style={{ ...estilo, left: -x * escala, top: -y * escala }}>
      <span className="fc-ator__folha" style={{ ...estilo, backgroundImage: `url(${f.poses})`, backgroundSize: `${w * POSES.length * escala}px ${h * escala}px` }} />
      <span className="fc-ator__clarao" style={{ ...estilo, backgroundImage: `url(${f.clarao})`, backgroundSize: `${w * escala}px ${h * escala}px` }} />
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

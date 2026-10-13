import { forwardRef, memo } from 'react'
import { recurso } from '../../config'
import { ASSADOS, type MetaAssada } from '../efeitos/assados'
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
 * Sprite assado (scripts/sprites/: modelado em volume e convertido em pixel
 * art), quando existe para o personagem; senão, o desenho antigo em código.
 * O herói usa a folha do estágio; as variantes de cor dos adversários ainda
 * usam o desenho antigo até ganharem folha própria.
 */
function assadoDe(quem: Personagem, variante?: string): { nome: string; meta: MetaAssada } | null {
  const nome = quem === 'heroi' ? (variante ?? 'heroi-1') : variante ? '' : quem
  const meta = nome ? ASSADOS[nome] : undefined
  return meta ? { nome, meta } : null
}

/**
 * Quanto a folha assada cresce em relação à escala pedida (que foi pensada para
 * o desenho antigo): mantém a altura do corpo antigo, um pouco maior para dar
 * presença, arredondada a quartos de pixel para os pixels ficarem regulares.
 */
const CRESCE: Partial<Record<Personagem, number>> = { heroi: 1.4, dragao: 1.5, guardiao: 1.17, golem: 1.3, serpente: 1.4 }
function escalaAssada(quem: Personagem, escala: number, meta: MetaAssada) {
  const [, , , hAntigo] = caixaDoCorpo(quem)
  // o herói cresce de verdade a cada estágio (scripts/sprites/heroi.py): a referência é sempre o
  // corpo do aprendiz, para a lenda adulta aparecer mais alta na tela, e não encolhida ao mesmo tamanho
  const ref = quem === 'heroi' ? (ASSADOS['heroi-1']?.caixa[3] ?? meta.caixa[3]) : meta.caixa[3]
  const alvo = (escala * hAntigo * (CRESCE[quem] ?? 1.15)) / ref
  return Math.max(0.5, Math.round(alvo * 4) / 4)
}

const QuadrosAssados = memo(function QuadrosAssados({ nome, meta, escala, dx, dy }: { nome: string; meta: MetaAssada; escala: number; dx: number; dy: number }) {
  const w = meta.largura * escala, h = meta.altura * escala
  const [x, y] = meta.caixa
  const vars: Record<string, string | number> = { width: w, height: h, left: dx - x * escala, top: dy - y * escala, ['--w']: w + 'px', ['--h']: h + 'px' }
  for (const [anim, a] of Object.entries(meta.animacoes)) {
    vars['--l-' + anim] = a.linha
    vars['--n-' + anim] = a.quadros
    vars['--d-' + anim] = a.quadros * a.ms + 'ms'
  }
  const tam = `${meta.colunas * w}px ${Object.keys(meta.animacoes).length * h}px`
  return (
    <span className="fc-ator__quadros fc-ator__quadros--assado" style={vars as React.CSSProperties}>
      <span className="fc-ator__folha fc-ator__folha--assada" style={{ backgroundImage: `url(${recurso(`flashcards/sprites/${nome}.png`)})`, backgroundSize: tam }} />
      <span className="fc-ator__clarao fc-ator__folha--assada" style={{ backgroundImage: `url(${recurso(`flashcards/sprites/${nome}-branco.png`)})`, backgroundSize: tam }} />
    </span>
  )
})

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
  const assado = assadoDe(quem, variante)
  const ea = assado ? escalaAssada(quem, escala, assado.meta) : escala
  // o ator ocupa no layout o mesmo espaço do desenho antigo; a folha assada, maior,
  // cresce para cima e para os lados a partir dos pés, sem empurrar a mesa
  const [, , w, h] = caixaDoCorpo(quem)
  const dx = assado ? (w * escala - assado.meta.caixa[2] * ea) / 2 : 0
  // um terço do que cresceu desce sobre a borda da mesa (o adversário pisa na beira da arena)
  // o herói fica de pé sobre a mesma linha em todos os estágios: cresce só para cima
  const dy = assado ? (h * escala - assado.meta.caixa[3] * ea) * (quem === 'heroi' ? 1 : 0.66) : 0
  return (
    <div ref={ref} className={`fc-ator fc-ator--${quem}${assado ? ' fc-ator--assado' : ''}${chefe ? ' fc-ator--chefe' : ''}${classe ? ' ' + classe : ''}`} style={{ width: w * escala, height: h * escala }}>
      <span className="fc-ator__aura" aria-hidden="true" />
      <span className="fc-ator__sombra" aria-hidden="true" />
      <div className="fc-ator__corpo" aria-hidden="true">{assado ? <QuadrosAssados nome={assado.nome} meta={assado.meta} escala={ea} dx={dx} dy={dy} /> : <Quadros quem={quem} escala={escala} variante={variante} />}</div>
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

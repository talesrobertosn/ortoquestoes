import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Sprite } from './Sprite'

/**
 * Dica dos poderes e relíquias da Cripta (15/10/2026).
 *
 * Antes era o `title` nativo do navegador: aparecia tarde, pequeno, às vezes
 * cortado, e no celular simplesmente não existia. Agora é um balão do jogo:
 *  - no computador, aparece ao passar o mouse e ao focar pelo teclado;
 *  - no toque, o primeiro toque mostra a dica (com o botão "Usar" quando dá
 *    para usar) e um toque fora fecha;
 *  - fica sempre dentro da moldura do jogo: vai para cima do alvo e, sem espaço,
 *    para baixo; a seta acompanha o alvo mesmo quando o balão encosta na borda.
 */
export interface ConteudoDica {
  titulo: string
  /** Linha pequena acima do título: "Poder · Comum", "Relíquia · Rara"... */
  selo?: string
  texto: ReactNode
  detalhe?: string
  icone?: string
  cor?: string
  /** Cargas, contagem ou situação ("Pronto para usar", "Use antes de responder"). */
  estado?: string
  /** Botão de ação dentro do balão (no toque, é assim que se usa o poder). */
  acao?: { rotulo: string; aoUsar: () => void }
  /** Conteúdo extra (lista de relíquias no celular). */
  extra?: ReactNode
}

type Origem = 'mouse' | 'toque' | 'teclado'

/**
 * Controle de uma dica presa a um elemento. Devolve os ouvintes para pôr no
 * elemento e o balão já posicionado (ou null).
 */
export function usarDica(conteudo: ConteudoDica | null) {
  const [aberta, definirAberta] = useState<Origem | null>(null)
  const ancora = useRef<HTMLElement | null>(null)
  const tipo = useRef<string>('mouse')
  const tempo = useRef(0)
  const id = useId()

  const fechar = useCallback(() => { window.clearTimeout(tempo.current); definirAberta(null) }, [])
  useEffect(() => () => window.clearTimeout(tempo.current), [])

  // toque fora ou Esc fecham; Esc não chega a pedir para fechar o jogo
  useEffect(() => {
    if (!aberta) return
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node
      if (ancora.current?.contains(alvo) || document.getElementById(id)?.contains(alvo)) return
      fechar()
    }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); fechar() } }
    document.addEventListener('pointerdown', fora, true)
    window.addEventListener('keydown', tecla, true)
    window.addEventListener('resize', fechar)
    return () => { document.removeEventListener('pointerdown', fora, true); window.removeEventListener('keydown', tecla, true); window.removeEventListener('resize', fechar) }
  }, [aberta, fechar, id])

  const ouvintes = {
    ref: (el: HTMLElement | null) => { ancora.current = el },
    onPointerDown: (e: React.PointerEvent) => { tipo.current = e.pointerType || 'mouse' },
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      window.clearTimeout(tempo.current)
      tempo.current = window.setTimeout(() => definirAberta('mouse'), 90)
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      window.clearTimeout(tempo.current)
      definirAberta((a) => (a === 'mouse' ? null : a))
    },
    onFocus: (e: React.FocusEvent) => { if ((e.target as HTMLElement).matches?.(':focus-visible')) definirAberta((a) => a ?? 'teclado') },
    onBlur: () => definirAberta((a) => (a === 'teclado' ? null : a)),
    'aria-describedby': aberta ? id : undefined,
  }

  /** Para o onClick do elemento: diz se o toque foi de dedo (e então só abre ou fecha a dica). */
  const toqueAbre = useCallback(() => {
    const dedo = tipo.current === 'touch' || tipo.current === 'pen'
    tipo.current = 'mouse'
    if (!dedo) return false
    definirAberta((a) => (a === 'toque' ? null : 'toque'))
    return true
  }, [])

  /** Abre e fixa (ou fecha) a dica, como no toque: para o clique do mouse em quem não tem ação. */
  const alternar = useCallback(() => definirAberta((a) => (a === 'toque' ? null : 'toque')), [])

  const balao = aberta && conteudo ? <Balao id={id} ancora={ancora} conteudo={conteudo} aoFechar={fechar} toque={aberta === 'toque'} /> : null
  return { ouvintes, balao, toqueAbre, alternar, fechar, aberta: !!aberta }
}

function Balao({ id, ancora, conteudo, aoFechar, toque }: { id: string; ancora: React.RefObject<HTMLElement | null>; conteudo: ConteudoDica; aoFechar: () => void; toque: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, definirPos] = useState<{ x: number; y: number; seta: number; abaixo: boolean } | null>(null)
  const moldura = ancora.current?.closest<HTMLElement>('.fc-modal') ?? document.body

  useLayoutEffect(() => {
    const el = ref.current, a = ancora.current
    if (!el || !a) return
    const m = moldura.getBoundingClientRect(), r = a.getBoundingClientRect()
    const w = el.offsetWidth, h = el.offsetHeight, margem = 8
    const cx = r.left + r.width / 2 - m.left
    const x = Math.min(Math.max(cx - w / 2, margem), Math.max(margem, m.width - w - margem))
    const cima = r.top - m.top - h - 12
    const abaixo = cima < margem
    const y = abaixo ? Math.min(r.bottom - m.top + 12, m.height - h - margem) : cima
    definirPos({ x, y, seta: Math.min(Math.max(cx - x, 16), w - 16), abaixo })
  }, [ancora, moldura, conteudo])

  return createPortal(
    <div id={id} ref={ref} role="tooltip" className={'fc-dica-jogo' + (pos?.abaixo ? ' fc-dica-jogo--abaixo' : '') + (toque ? ' fc-dica-jogo--toque' : '')}
      style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999, visibility: pos ? 'visible' : 'hidden', ['--cor' as string]: conteudo.cor ?? '#e9b955', ['--seta' as string]: (pos?.seta ?? 0) + 'px' }}>
      <div className="fc-dica-jogo__cabeca">
        {conteudo.icone && <span className="fc-dica-jogo__icone" aria-hidden="true"><Sprite nome={conteudo.icone} /></span>}
        <span className="fc-dica-jogo__titulo">
          {conteudo.selo && <small>{conteudo.selo}</small>}
          <strong>{conteudo.titulo}</strong>
        </span>
      </div>
      <p className="fc-dica-jogo__texto">{conteudo.texto}</p>
      {conteudo.detalhe && <p className="fc-dica-jogo__detalhe">{conteudo.detalhe}</p>}
      {conteudo.extra}
      {conteudo.estado && <p className="fc-dica-jogo__estado">{conteudo.estado}</p>}
      {conteudo.acao && <button type="button" className="fc-dica-jogo__acao" onClick={() => { aoFechar(); conteudo.acao!.aoUsar() }}>{conteudo.acao.rotulo}</button>}
    </div>,
    moldura,
  )
}

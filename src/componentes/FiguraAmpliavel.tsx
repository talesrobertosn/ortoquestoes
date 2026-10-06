import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { Imagem } from '../dados/tipos'
import { Icone } from './Icone'

/** Texto com endereços clicáveis (para créditos de imagem com link). */
export function TextoComLinks({ texto }: { texto: string }) {
  const partes = texto.split(/(https?:\/\/[^\s)]+)/g)
  return <>{partes.map((p, i) => /^https?:\/\//.test(p)
    ? <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>
    : p)}</>
}

/**
 * Figura de questão ou comentário. Tocar na imagem abre uma janela por cima da
 * página, com a imagem inteira; tocar de novo aproxima no ponto tocado e dá
 * para arrastar. Fecha no X, no Esc ou tocando fora.
 */
export function FiguraAmpliavel({ imagem, src, alt, alturaMaxima = '22rem', largura, altura }: {
  imagem: Imagem
  src: string
  alt: string
  alturaMaxima?: string
  largura?: number | null
  altura?: number | null
}) {
  const [aberta, definirAberta] = useState(false)
  return (
    <figure className="questao__figura">
      <button type="button" className="figura-ampliavel" onClick={() => definirAberta(true)} aria-label="Ampliar imagem">
        <img src={src} alt={alt} loading="lazy" width={largura ?? undefined} height={altura ?? undefined} style={{ maxHeight: alturaMaxima, width: 'auto' }} />
      </button>
      {(imagem.legenda || imagem.fonte) && (
        <figcaption>
          {imagem.legenda}
          {imagem.fonte && <span className="figura-fonte">Fonte: <TextoComLinks texto={imagem.fonte} /></span>}
        </figcaption>
      )}
      {aberta && <JanelaImagem src={src} alt={alt} imagem={imagem} aoFechar={() => definirAberta(false)} />}
    </figure>
  )
}

function JanelaImagem({ src, alt, imagem, aoFechar }: { src: string; alt: string; imagem: Imagem; aoFechar: () => void }) {
  const [zoom, definirZoom] = useState(false)
  const area = useRef<HTMLDivElement>(null)
  const fechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null
    fechar.current?.focus()
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar() }
    const rolagem = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', tecla)
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = rolagem; antes?.focus?.() }
  }, [aoFechar])

  function alternarZoom(e: MouseEvent<HTMLImageElement>) {
    e.stopPropagation()
    const img = e.currentTarget
    const caixa = img.getBoundingClientRect()
    // Ponto tocado em proporção da imagem, para centralizar ali depois de aproximar.
    const px = (e.clientX - caixa.left) / caixa.width, py = (e.clientY - caixa.top) / caixa.height
    const novo = !zoom
    definirZoom(novo)
    if (novo) requestAnimationFrame(() => {
      const a = area.current
      if (!a) return
      a.scrollLeft = px * a.scrollWidth - a.clientWidth / 2
      a.scrollTop = py * a.scrollHeight - a.clientHeight / 2
    })
  }

  return (
    <div className="janela-imagem" role="dialog" aria-modal="true" aria-label={alt} onClick={aoFechar}>
      <button ref={fechar} type="button" className="janela-imagem__fechar" onClick={aoFechar} aria-label="Fechar"><Icone nome="fechar" tamanho={22} /></button>
      <div ref={area} className={'janela-imagem__area' + (zoom ? ' janela-imagem__area--zoom' : '')}>
        <img src={src} alt={alt} onClick={alternarZoom} />
      </div>
      {(imagem.legenda || imagem.fonte) && (
        <p className="janela-imagem__legenda" onClick={(e) => e.stopPropagation()}>
          {imagem.legenda}
          {imagem.fonte && <span className="figura-fonte">Fonte: <TextoComLinks texto={imagem.fonte} /></span>}
        </p>
      )}
      <p className="janela-imagem__dica">{zoom ? 'Arraste para mover. Toque na imagem para afastar.' : 'Toque na imagem para aproximar.'}</p>
    </div>
  )
}

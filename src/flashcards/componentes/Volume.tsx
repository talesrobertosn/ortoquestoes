import { useEffect, useRef, useState } from 'react'
import { destravar } from '../efeitos/sons'

/** Controle do áudio do jogo, com gesto vertical e teclado nativo. */
export function Volume({ valor, aoMudar }: { valor: number; aoMudar: (valor: number) => void }) {
  const [aberto, definir] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) definir(false) }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        definir(false)
        botao.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', tecla, true)
    return () => { document.removeEventListener('pointerdown',fora);document.removeEventListener('keydown',tecla,true) }
  },[aberto])
  return <div className="fc-volume" ref={ref}>
    <button ref={botao} type="button" className="fc-topo-botao" aria-label="Ajustar volume" aria-expanded={aberto} onClick={()=>{destravar();definir(v=>!v)}}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>{valor>0?<path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>:<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2"/>}</svg>
    </button>
    {aberto&&<div className="fc-volume__painel" role="group" aria-label="Controle de volume">
      <span>Volume</span>
      <div className="fc-volume__trilho" style={{['--volume' as string]:`${valor*100}%`}}>
        <span className="fc-volume__preenchimento" aria-hidden="true"/>
        <input type="range" min="0" max="1" step="0.01" value={valor} aria-label="Volume dos flashcards" aria-orientation="vertical" aria-valuetext={`${Math.round(valor*100)}%`} onPointerDown={destravar} onChange={e=>{destravar();aoMudar(Number(e.target.value))}}/>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/></svg>
      </div>
      <output>{Math.round(valor*100)}%</output>
    </div>}
  </div>
}

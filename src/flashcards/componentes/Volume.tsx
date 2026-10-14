import { useEffect, useRef, useState } from 'react'
import { destravar, tocar, VOLUME_INICIAL } from '../efeitos/sons'

const PASSO = 0.1
const arredondar = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100) / 100

/**
 * Controle do áudio do jogo: botões − e + (de 10 em 10%), a cápsula vertical para arrastar,
 * teclado nativo e o mudo, que lembra o volume de antes (15/10/2026: "diminuir e aumentar
 * o som mais fácil"). Cada toque em − ou + dá um estalo curto para a pessoa ouvir o nível.
 */
export function Volume({ valor, aoMudar }: { valor: number; aoMudar: (valor: number) => void }) {
  const [aberto, definir] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const ultimo = useRef(valor > 0 ? valor : VOLUME_INICIAL)
  useEffect(() => { if (valor > 0) ultimo.current = valor }, [valor])
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
  const mudar = (v: number, ouvir = false) => {
    destravar()
    const n = arredondar(v)
    aoMudar(n)
    if (ouvir && n > 0) setTimeout(() => tocar('selecao'), 40)
  }
  const mudo = valor === 0
  return <div className="fc-volume" ref={ref}>
    <button ref={botao} type="button" className="fc-topo-botao" aria-label={`Volume: ${Math.round(valor*100)}%`} aria-expanded={aberto} onClick={()=>{destravar();definir(v=>!v)}}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>{valor>0?<path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>:<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2"/>}</svg>
    </button>
    {aberto&&<div className="fc-volume__painel" role="group" aria-label="Controle de volume">
      <output aria-live="polite">{mudo ? 'Mudo' : `${Math.round(valor*100)}%`}</output>
      <button type="button" className="fc-volume__passo" aria-label="Aumentar o volume" disabled={valor >= 1} onClick={()=>mudar(valor + PASSO, true)}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg></button>
      <div className="fc-volume__trilho" style={{['--volume' as string]:`${valor*100}%`}}>
        <span className="fc-volume__preenchimento" aria-hidden="true"/>
        <input type="range" min="0" max="1" step="0.05" value={valor} aria-label="Volume dos flashcards" aria-orientation="vertical" aria-valuetext={`${Math.round(valor*100)}%`} onPointerDown={destravar} onChange={e=>mudar(Number(e.target.value))}/>
      </div>
      <button type="button" className="fc-volume__passo" aria-label="Diminuir o volume" disabled={valor <= 0} onClick={()=>mudar(valor - PASSO, true)}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg></button>
      <button type="button" className={'fc-volume__mudo' + (mudo ? ' fc-volume__mudo--on' : '')} aria-pressed={mudo} onClick={()=>mudar(mudo ? ultimo.current : 0, mudo)}>
        {mudo ? 'Ligar som' : 'Silenciar'}
      </button>
    </div>}
  </div>
}

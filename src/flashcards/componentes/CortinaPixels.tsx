import { usarMovimentoVisualReduzido } from './AparenciaFlashcards'
import { useEffect, useState, type CSSProperties } from 'react'
import { recurso } from '../../config'
/**
 * Endereço absoluto da textura. Uma url() relativa dentro de variável CSS é resolvida
 * a partir da folha de estilo que a usa (assets/), não da página: no site publicado
 * ela virava assets/flashcards/interface/cortina.png, que não existe, e cada troca de
 * cena baixava o index.html (15 kB) no lugar da textura.
 */
const TEXTURA = typeof document === 'undefined' ? recurso('flashcards/interface/cortina.png') : new URL(recurso('flashcards/interface/cortina.png'), document.baseURI).href
/** Revelação decorativa: não troca estado, não bloqueia cliques e não atrasa a navegação. */
export function CortinaPixels(){
 const [terminou,definir]=useState(false)
 const reduzido = usarMovimentoVisualReduzido()
 useEffect(()=>{if(reduzido)definir(true)},[reduzido])
 if(terminou || reduzido)return null
 return <div className="fc-cortina-pixels" aria-hidden="true" style={{'--cortina-textura':`url("${TEXTURA}")`} as CSSProperties} onAnimationEnd={e=>{if(e.target===e.currentTarget)definir(true)}}>
  {Array.from({length:80},(_,i)=><i key={i} style={{'--coluna':i%10,'--linha':Math.floor(i/10)} as CSSProperties}/>)}
 </div>
}

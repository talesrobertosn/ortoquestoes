import { usarMovimentoVisualReduzido } from './AparenciaFlashcards'
import { useEffect, useState, type CSSProperties } from 'react'
import { recurso } from '../../config'
/** Revelação decorativa: não troca estado, não bloqueia cliques e não atrasa a navegação. */
export function CortinaPixels(){
 const [terminou,definir]=useState(false)
 const reduzido = usarMovimentoVisualReduzido()
 useEffect(()=>{if(reduzido)definir(true)},[reduzido])
 if(terminou || reduzido)return null
 return <div className="fc-cortina-pixels" aria-hidden="true" style={{'--cortina-textura':`url("${recurso('flashcards/interface/cortina.png')}")`} as CSSProperties} onAnimationEnd={e=>{if(e.target===e.currentTarget)definir(true)}}>
  {Array.from({length:80},(_,i)=><i key={i} style={{'--coluna':i%10,'--linha':Math.floor(i/10)} as CSSProperties}/>)}
 </div>
}

import {useEffect,useRef,useState,type ReactNode} from 'react'
import {recurso,urlCss} from '../../config'
import {usarPeriodo} from '../../estado/aparencia'
import {BichosLogin} from './BichosLogin'

/** Mantido como contrato público para os consumidores históricos da cena. */
export const CHAMAS_PORTAL=[{x:243.5,y:61.5,r:10},{x:336.5,y:61.5,r:10},{x:151.5,y:107.5,r:8}]
const faixasPC=[180,240,240,240],faixasMovel=[180,520,520,520,520,520,520]

/** Uma pintura vertical contígua em faixas; formulário, questão e jornada continuam HTML. */
export function CenaPortal({texto,children,esquerda,direita}:{texto:ReactNode;children:ReactNode;esquerda?:ReactNode;direita?:ReactNode}){
 const periodo=usarPeriodo(),ref=useRef<HTMLElement>(null),[visivel,mostrar]=useState(true),[oculta,ocultar]=useState(document.hidden)
 useEffect(()=>{const el=ref.current?.querySelector('.al-cabecalho');if(!el)return;const observer=new IntersectionObserver(([e])=>mostrar(e.isIntersecting));observer.observe(el);const mudou=()=>ocultar(document.hidden);document.addEventListener('visibilitychange',mudou);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',mudou)}},[])
 const arte=(modo:string,i:number,pequena=false)=>recurso(`pixel/acesso/alpino/login-${periodo}-${modo}-${i}${pequena?'-960':''}.webp`)
 return <section ref={ref} className={`pc al al--${periodo}${!visivel||oculta?' al--pausada':''}`} aria-labelledby="ac-titulo">
  <div className="al-paisagem" aria-hidden="true">
   {faixasMovel.map((h,i)=><picture key={i} className={i>=4?'al-faixa--movel':undefined}>
    <source media="(max-width:47.99rem)" srcSet={arte('movel',i)} width={888} height={h*3}/>
    <img src={i<4?arte('pc',i):undefined} srcSet={i<4?`${arte('pc',i,true)} 960w, ${arte('pc',i)} 1440w`:undefined} sizes="(max-width:76rem) 100vw,76rem" width={1440} height={(faixasPC[i]??h)*3} alt="" loading={i?'lazy':'eager'} fetchPriority={i?'auto':'high'} draggable={false}/>
   </picture>)}
  </div>
  <header className="al-abertura">
   <div className="al-cabecalho">
    <div className="al-trem" aria-hidden="true"><span style={{backgroundImage:urlCss('pixel/inicio/trem-vale.png'),backgroundPosition:periodo==='noite'?'0 100%':'0 0'}}/></div>
    <span className="al-fogo" aria-hidden="true" style={{backgroundImage:urlCss('pixel/inicio/fogo.png')}}/><span className="al-espada" aria-hidden="true" style={{backgroundImage:urlCss('pixel/inicio/espada.png')}}/><span className="al-agua" aria-hidden="true"/>
    <BichosLogin/>
   </div>
   <div className="al-texto pc-texto">{texto}</div>
  </header>
  <div className="al-conteudo">
   <div className="pc-coluna pc-coluna--esquerda">{esquerda}</div>
   <div className="pc-coluna pc-coluna--direita">{children}{direita}</div>
  </div>
  <div className="al-jardim-final" aria-hidden="true"/>
 </section>
}

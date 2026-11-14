import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react'
import {urlCss} from '../../config'
import {CorujaPixel,type EstadoCoruja} from '../../biblioteca/sala/CorujaPixel'
import {CONCEITOS_CORUJA,FALAS_GATO,proximaFala} from '../mascote/falasBichos'
import {EVENTO_RESPOSTA_ACESSO} from './QuestaoAcesso'

type Quem='anfitriao'|'gato'|'coruja'
const lugares:Record<Quem,[number,number,number,number]>={anfitriao:[238,112,48,64],gato:[286,149,32,20],coruja:[337,102,33,24]}
const lugar=(v:[number,number,number,number])=>({'--quadro-w':v[2],'--quadro-h':v[3],'--x':`${v[0]/480*100}%`,'--xm':`${(v[0]-150)/296*100}%`,'--y':`${v[1]/180*100}%`,'--w':`${v[2]/480*100}%`,'--wm':`${v[2]/296*100}%`,'--h':`${v[3]/180*100}%`}) as CSSProperties

export function BichosLogin(){
 const ref=useRef<HTMLDivElement>(null),balao=useRef<HTMLButtonElement>(null)
 const [fala,falar]=useState<{quem:Quem;texto:string}|null>(null)
 const [anfitriao,animar]=useState(1),[gato,acordar]=useState(0),[coruja,olhar]=useState<EstadoCoruja>('parada')
 const [pos,por]=useState({left:0,top:0,seta:20,abaixo:false})
 useEffect(()=>{const t=setTimeout(()=>animar(0),4000);return()=>clearTimeout(t)},[anfitriao])
 useEffect(()=>{const t=setTimeout(()=>acordar(0),4000);return()=>clearTimeout(t)},[gato])
 useEffect(()=>{if(!fala)return;const t=setTimeout(()=>falar(null),fala.quem==='coruja'?11000:6500);return()=>clearTimeout(t)},[fala])
 useEffect(()=>{
  const root=ref.current?.closest('.pc'),form=root?.querySelector('.pa');let t=0
  const responder=(e:Event)=>{const certo=(e as CustomEvent<{acertou:boolean}>).detail?.acertou;animar(certo?2:0);acordar(certo?2:1)}
  const focar=()=>{clearTimeout(t);olhar('olhando')},sair=()=>{t=window.setTimeout(()=>{if(!form?.contains(document.activeElement))olhar('parada')},400)}
  const enviar=()=>{olhar('acenando');clearTimeout(t);t=window.setTimeout(()=>olhar('olhando'),1600)}
  window.addEventListener(EVENTO_RESPOSTA_ACESSO,responder);form?.addEventListener('focusin',focar);form?.addEventListener('focusout',sair);form?.addEventListener('submit',enviar)
  return()=>{window.removeEventListener(EVENTO_RESPOSTA_ACESSO,responder);form?.removeEventListener('focusin',focar);form?.removeEventListener('focusout',sair);form?.removeEventListener('submit',enviar);clearTimeout(t)}
 },[])
 useLayoutEffect(()=>{
  if(!fala||!ref.current||!balao.current)return
  const reposicionar=()=>{
   const cena=ref.current!.getBoundingClientRect(),b=balao.current!.getBoundingClientRect(),origem=ref.current!.querySelector(`[data-bicho="${fala.quem}"] > span`)!.getBoundingClientRect()
   const outros=[...ref.current!.querySelectorAll<HTMLElement>('[data-bicho]')].filter(e=>e.dataset.bicho!==fala.quem).map(e=>e.getBoundingClientRect())
   const titulo=ref.current!.closest('.al-abertura')?.querySelector('.al-texto')?.getBoundingClientRect();if(titulo)outros.push(titulo)
   const centro=origem.x+origem.width/2-cena.x,clamp=(x:number)=>Math.max(8,Math.min(cena.width-b.width-8,x))
   const candidatos=[] as {left:number;top:number;abaixo:boolean}[]
   for(const abaixo of [false,true])for(const x of [centro-b.width/2,origem.right-cena.x+10,origem.left-cena.x-b.width-10])candidatos.push({left:clamp(x),top:abaixo?origem.bottom-cena.y+10:origem.top-cena.y-b.height-10,abaixo})
   const livre=candidatos.find(p=>p.top>=8&&p.top+b.height<=cena.height-8&&outros.every(o=>p.left+b.width<o.left-cena.x||p.left>o.right-cena.x||p.top+b.height<o.top-cena.y||p.top>o.bottom-cena.y))
   const p=livre??{left:clamp(centro-b.width/2),top:Math.max(8,Math.min(...[origem,...outros].map(o=>o.top-cena.y))-b.height-10),abaixo:false}
   por({...p,seta:Math.max(14,Math.min(b.width-14,centro-p.left))})
  }
  reposicionar();const io=new ResizeObserver(reposicionar);io.observe(ref.current);io.observe(balao.current);return()=>io.disconnect()
 },[fala])
 const dizer=(quem:Quem)=>{if(quem==='anfitriao')animar(1);if(quem==='gato')acordar(1);falar({quem,texto:quem==='gato'?proximaFala('gato',FALAS_GATO):quem==='coruja'?proximaFala('coruja',CONCEITOS_CORUJA):'Que bom ter você por aqui. Seu próximo passo pode ser pequeno.'})}
 return <div className="al-bichos" ref={ref}>
  <button className="al-bicho al-bicho--anfitriao" data-bicho="anfitriao" style={lugar(lugares.anfitriao)} type="button" aria-label="Falar com o mascote de Natal" onClick={()=>dizer('anfitriao')}><span key={anfitriao} className="al-sprite al-sprite--anfitriao" aria-hidden="true" style={{'--sprite':urlCss('pixel/acesso/alpino/anfitriao-natal.png?v=1'),'--linha':anfitriao} as CSSProperties}/></button>
  <button className="al-bicho al-bicho--gato" data-bicho="gato" style={lugar(lugares.gato)} type="button" aria-label="Falar com o gato de Natal" onClick={()=>dizer('gato')}><span key={gato} className="al-sprite al-sprite--gato" aria-hidden="true" style={{'--sprite':urlCss('pixel/acesso/alpino/gato-natal.png?v=1'),'--linha':gato} as CSSProperties}/></button>
  <button className="al-bicho al-bicho--coruja" data-bicho="coruja" style={lugar(lugares.coruja)} type="button" aria-label="Falar com a coruja: conceito de prova" onClick={()=>dizer('coruja')}><CorujaPixel estado={fala?.quem==='coruja'?'lendo':coruja}/></button>
  {fala&&<button ref={balao} type="button" className={'al-fala'+(pos.abaixo?' al-fala--abaixo':'')} data-quem={fala.quem} style={{left:pos.left,top:pos.top}} role="status" aria-label={`Fechar fala. ${fala.texto}`} onClick={()=>falar(null)}>{fala.texto}<i style={{left:pos.seta}} aria-hidden="true"/></button>}
 </div>
}

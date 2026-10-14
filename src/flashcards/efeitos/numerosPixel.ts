/** Algarismos autorais 5×7. Não depende de fonte, rede ou asset externo. */
const GLIFOS: Record<string, string[]> = {
 '0':['01110','11011','11011','11011','11011','11011','01110'],
 '1':['00110','01110','00110','00110','00110','00110','01111'],
 '2':['01110','11011','00011','00110','01100','11000','11111'],
 '3':['11110','00011','00011','01110','00011','00011','11110'],
 '4':['00011','00111','01111','11011','11111','00011','00011'],
 '5':['11111','11000','11000','11110','00011','00011','11110'],
 '6':['01110','11000','11000','11110','11011','11011','01110'],
 '7':['11111','00011','00110','00110','01100','01100','01100'],
 '8':['01110','11011','11011','01110','11011','11011','01110'],
 '9':['01110','11011','11011','01111','00011','00011','01110'],
 '+':['00000','00100','00100','11111','00100','00100','00000'],
 '-':['00000','00000','00000','11111','00000','00000','00000'],
}
export function numeroPixel(texto: string): SVGSVGElement | null {
 const chars=texto.replace('−','-');if(!/^[+-]?\d+$/.test(chars))return null
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg')
 svg.setAttribute('viewBox',`0 0 ${chars.length*6+3} 11`);svg.setAttribute('shape-rendering','crispEdges');svg.setAttribute('aria-label',texto)
 const pixels:[number,number][]=[]
 Array.from(chars).forEach((c,k)=>GLIFOS[c].forEach((r,y)=>Array.from(r).forEach((p,x)=>{if(p==='1')pixels.push([2+k*6+x,2+y])})))
 const pintar=(x:number,y:number,w:number,h:number,cor:string)=>{const r=document.createElementNS(ns,'rect');r.setAttribute('x',String(x));r.setAttribute('y',String(y));r.setAttribute('width',String(w));r.setAttribute('height',String(h));r.setAttribute('fill',cor);svg.appendChild(r)}
 for(const[x,y]of pixels)pintar(x-1,y-1,3,3,'#251b27')
 for(const[x,y]of pixels)pintar(x,y,1,1,'currentColor')
 return svg
}

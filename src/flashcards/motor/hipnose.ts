import { embaralhar } from './aleatorio'
/** Posições da mão, não índices de gabarito. Semente visual nunca avança a semente do combate. */
export function embaralharVisual(n: number, semente: number): number[] {
 const base=Array.from({length:n},(_,k)=>k)
 const [nova]=embaralhar(base,semente^0x4859504e)
 if(n>1&&nova.every((v,k)=>v===k))nova.push(nova.shift()!)
 return nova
}
export function indicesVisuais(jogada: {ordem:number[];visual?:number[]} | null) {
 if(!jogada)return []
 return jogada.visual ?? jogada.ordem.map((_,k)=>k)
}

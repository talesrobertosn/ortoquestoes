import { estiloDe, tomFogo } from './ataques'
/** Só as tiras que podem aparecer neste andar. Outras continuam disponíveis sob demanda no Palco. */
export function vfxPorAndar(sprite: string, variante?: string): string[] {
 const nomes = ['escudo','coracao','puf','espada']
 for(const tom of ['azul','ouro','fogo','arcano'])nomes.push(`lamina-${tom}`,`corte-${tom}`,`faisca-${tom}`)
 const estilo=estiloDe(sprite,variante)
 const comuns:Record<string,string[]>={
  pedra:['pedra','pedregulho','rachadura','poeira','choque'],
  pancada:['choque','rachadura','poeira'],
  garra:['garras','faisca-sangue'],mimico:['mandibula','garras','faisca-sangue','orbe'],
  mergulho:['pena','garras','faisca-sangue'],magia:['orbe'],feixe:[],olhar:[],
 }
 nomes.push(...(comuns[estilo]??[]))
 if(estilo==='pedra'&&variante&&['cristal','obsidiana','rubro','cimento'].includes(variante))nomes.push(`pedregulho-${variante}`)
 if(estilo==='veneno') {const t=variante==='eletrica'?'eletrico':'veneno';nomes.push(`gota-${t}`,`respingo-${t}`,'presa','nuvem-veneno','faisca-sangue','bolhas')}
 if(estilo==='gosma'){const t=variante==='acida'?'acida':variante==='rainha'?'rainha':'gosma';nomes.push(`gota-${t}`,`respingo-${t}`,`escorre-${t}`)}
 if(estilo==='fogo'){const t=tomFogo(variante);nomes.push(`bolafogo-${t}`,`labareda-${t}`,`chama-${t}`)}
 return [...new Set(nomes)]
}
export const VFX_BIBLIOTECA=['gato-dorme','gato-acorda','gato-feliz','vela','chama-escarlate','chama-fatuo','chama-ancestral','chama-ouro']

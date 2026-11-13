/** Modelo único da central de revisões. Datas civis de Brasília; o histórico original nunca é apagado. */
import type { Indice, ItemIndice } from './tipos'
import { dominada, INTERVALOS, type RegistroQuestao } from '../estado/revisao'
import { distribuirRevisoes, inicioDia, vencimentoDe, type RitmoRevisao } from '../estado/planoRevisao'
import { chaveDoDia, hojeBR, inicioDaChave, somarDias, diaDaSemana } from '../util/dia'
import { focoPorQuestao } from './incidencia'

export type RegistrosRevisao = Record<string, RegistroQuestao>
export type OrdemRevisao = 'recomendada' | 'atraso' | 'reincidencia' | 'incidencia'
export type EstadoFila = 'todas' | 'vencidas' | 'erros' | 'certeza' | 'incertas' | 'reincidentes'
export interface FiltroRevisao { areas: string[]; prova: string; assunto: string; estado: EstadoFila }
export const FILTRO_REVISAO: FiltroRevisao = { areas: [], prova: '', assunto: '', estado: 'todas' }
const DIA = 86400000
export const pct = (certas: number, n: number) => n ? Math.round(100 * certas / n) : null

/** Questões anuladas, cópias e IDs que saíram do catálogo não ocupam a capacidade do plano. */
export function catalogoRevisao(indice: Indice, registros: Record<string, Partial<RegistroQuestao> & { c: boolean | null }>) {
  const itens = new Map(indice.questoes.filter(q => !q.an && !q.dup).map(q => [q.id, q]))
  const validos: RegistrosRevisao = {}, indisponiveis: string[] = []
  for (const [id, r] of Object.entries(registros)) {
    if (itens.has(id)) validos[id] = { ...r, q: r.q ?? r.historico?.[r.historico.length - 1]?.em ?? 0 }
    else if (vencimentoDe(r) !== null) indisponiveis.push(id)
  }
  return { itens, registros: validos, indisponiveis }
}
export function historicoDe(r: RegistroQuestao) {
  return [...(r.historico?.length ? r.historico : [{ em: r.q, correta: r.c, confianca: r.confianca ?? 'seguro' as const }])].sort((a,b) => a.em-b.em)
}
export function reincidente(r: RegistroQuestao) {
  const h = historicoDe(r).filter(e => e.correta !== null)
  return r.c === false && h.some((e,i) => e.correta === true && h.slice(0,i).some(a => a.correta === false))
}
export function atendeFiltro(q: ItemIndice, r: RegistroQuestao, indice: Indice, f: FiltroRevisao, agora = Date.now()) {
  if (f.areas.length && !f.areas.includes(indice.temas[q.t]?.slug)) return false
  if (f.prova === '__simulados' ? !q.sim : f.prova && (q.p === null || indice.provas[q.p] !== f.prova)) return false
  if (f.assunto && !q.s.some(s => indice.subtemas[s] === f.assunto)) return false
  const venc = vencimentoDe(r)
  const vencida = venc !== null && inicioDia(venc) <= inicioDia(agora)
  switch(f.estado) {
    case 'vencidas': return vencida
    case 'erros': return r.c === false
    case 'certeza': return r.c === false && (r.confianca ?? 'seguro') === 'seguro'
    case 'incertas': return r.confianca === 'duvida' || r.confianca === 'chute'
    case 'reincidentes': return reincidente(r)
    default: return true
  }
}
export function ordenarRevisoes(ids: string[], registros: RegistrosRevisao, indice: Indice, ordem: OrdemRevisao, agora = Date.now()) {
  const focos = focoPorQuestao(indice)
  const atraso = (id: string) => Math.max(0,(inicioDia(agora)-inicioDia(vencimentoDe(registros[id]) ?? agora))/DIA)
  const peso = (id: string) => focos.get(id)?.nivel ?? 0
  const risco = (id: string) => Number(registros[id].c === false) * 4 + Number(reincidente(registros[id])) * 2 + Number(registros[id].c === false && (registros[id].confianca ?? 'seguro') === 'seguro')
  return [...ids].sort((a,b) => {
    if (ordem === 'atraso') return atraso(b)-atraso(a) || risco(b)-risco(a) || a.localeCompare(b)
    if (ordem === 'reincidencia') return Number(reincidente(registros[b]))-Number(reincidente(registros[a])) || risco(b)-risco(a) || atraso(b)-atraso(a) || a.localeCompare(b)
    if (ordem === 'incidencia') return peso(b)-peso(a) || risco(b)-risco(a) || atraso(b)-atraso(a) || a.localeCompare(b)
    return risco(b)-risco(a) || peso(b)-peso(a) || atraso(b)-atraso(a) || a.localeCompare(b)
  })
}
export interface EventoRevisao { id: string; em: number; correta: boolean | null; confianca: string; intervalo: number | null }
export function eventosRevisao(registros: RegistrosRevisao, agora = Date.now()): EventoRevisao[] {
  const eventos: EventoRevisao[] = []
  for (const [id,r] of Object.entries(registros)) {
    const h = historicoDe(r)
    const completa = (r.tentativas ?? 1) <= h.length
    for (let i=0;i<h.length;i++) {
      if ((i===0 && completa) || h[i].em > agora) continue
      const e = h[i]
      eventos.push({ id, em:e.em, correta:e.correta, confianca:e.confianca ?? 'seguro', intervalo: i ? (e.em-h[i-1].em)/DIA : null })
    }
  }
  return eventos.sort((a,b) => a.em-b.em)
}
export function resumoPeriodo(eventos: EventoRevisao[], dias: number, agora = Date.now()) {
  const fim = inicioDaChave(somarDias(chaveDoDia(agora),1))
  const meio = inicioDaChave(somarDias(chaveDoDia(agora),1-dias)), inicio = inicioDaChave(somarDias(chaveDoDia(agora),1-2*dias))
  const resumir = (de:number, ate:number) => {
    const lista = eventos.filter(e=>e.em>=de && e.em<ate && e.em<=agora)
    const contadas = lista.filter(e=>e.correta!==null)
    return { respostas:lista.length, unicas:new Set(lista.map(e=>e.id)).size, acerto:pct(contadas.filter(e=>e.correta).length,contadas.length), n:contadas.length, dias:new Set(lista.map(e=>chaveDoDia(e.em))).size }
  }
  return { atual:resumir(meio,fim), anterior:resumir(inicio,meio) }
}
export function serieRevisoes(eventos: EventoRevisao[], dias: number, agora = Date.now()) {
  const porDia = new Map<string,EventoRevisao[]>()
  for(const e of eventos) { const k=chaveDoDia(e.em); const l=porDia.get(k)??[]; l.push(e); porDia.set(k,l) }
  return Array.from({length:dias},(_,i)=> {
    const dia=somarDias(chaveDoDia(agora),i-dias+1), es=porDia.get(dia)??[], contadas=es.filter(e=>e.correta!==null)
    return { dia, feitas:es.length, unicas:new Set(es.map(e=>e.id)).size, acerto:pct(contadas.filter(e=>e.correta).length,contadas.length) }
  })
}
export function faixasRetencao(eventos: EventoRevisao[]) {
  return [{ nome:'Menos de 1 dia', de:0, ate:1 },{ nome:'1–6 dias',de:1,ate:7 },{nome:'7–29 dias',de:7,ate:30},{nome:'30 dias ou mais',de:30,ate:Infinity}].map(f=> {
    const es=eventos.filter(e=>e.intervalo!==null && e.intervalo>=f.de && e.intervalo<f.ate && e.correta!==null)
    return {...f,n:es.length,acerto:pct(es.filter(e=>e.correta).length,es.length)}
  })
}
/** Teto nunca cria capacidade nos dias de folga; estimativa não inclui novos erros/reagendamentos. */
export function previsaoResgate(registros: RegistrosRevisao, ritmo: RitmoRevisao, prova?: string, agora=Date.now()) {
  const hoje=inicioDia(agora), vencidas=new Set(Object.entries(registros).filter(([,r])=>{const v=vencimentoDe(r);return v!==null&&inicioDia(v)<=hoje}).map(([id])=>id))
  const plano=distribuirRevisoes(registros,ritmo,400,agora)
  let fim:number|null=null, antesProva=0, agendadas=0
  const dataProva=prova ? inicioDaChave(prova) : Infinity
  for(const [dia,itens] of plano) for(const item of itens) if(vencidas.has(item.id)) { agendadas++; fim=Math.max(fim??hoje,dia); if(dia<dataProva) antesProva++ }
  let diasUteis=0
  if(prova && dataProva>hoje) for(let k=chaveDoDia(agora);k<prova;k=somarDias(k,1)) if(!ritmo.folgas.includes(diaDaSemana(k))) diasUteis++
  return { fim, vencidas:vencidas.size, depoisProva:prova ? vencidas.size-antesProva : 0, foraJanela:vencidas.size-agendadas, necessario:diasUteis ? Math.ceil(vencidas.size/diasUteis) : null }
}
export function motivoRevisao(id:string, r:RegistroQuestao, indice:Indice, agora=Date.now()) {
  const nivel=focoPorQuestao(indice).get(id)?.nivel??0
  const atraso=Math.max(0,Math.round((inicioDia(agora)-inicioDia(vencimentoDe(r)??agora))/DIA))
  return [reincidente(r)?'Erro voltou a acontecer':r.c===false ? (r.confianca??'seguro')==='seguro'?'Erro marcado com certeza':'Última resposta errada':r.confianca==='chute'?'Acerto com chute':r.confianca==='duvida'?'Acerto com dúvida':'Confirmar o aprendizado', nivel>=3?'Assunto frequente no acervo de provas':null, atraso?`${atraso} dia(s) de atraso`:null].filter(Boolean).join(' · ')
}
export function estagiosRevisao(registros:RegistrosRevisao) {
  const lista=[{nome:'Recomeçando',n:0},{nome:'Primeiros intervalos',n:0},{nome:'Intervalos longos',n:0},{nome:'Ciclo completo',n:0}]
  for(const r of Object.values(registros)) { if(r.c===null) continue; lista[dominada(r)?3:!(r.sequencia??0)?0:(r.sequencia??0)<=2?1:2].n++ }
  return lista
}
export function atrasoPorFaixa(registros:RegistrosRevisao, agora=Date.now()) {
  const lista=[{nome:'Vencem hoje',n:0},{nome:'1–7 dias',n:0},{nome:'8–30 dias',n:0},{nome:'Mais de 30 dias',n:0}]
  for(const r of Object.values(registros)) { const v=vencimentoDe(r); if(v===null)continue; const d=(inicioDia(agora)-inicioDia(v))/DIA; if(d>=0)lista[d===0?0:d<=7?1:d<=30?2:3].n++ }
  return lista
}
export function proximasDatas(registros:RegistrosRevisao, ritmo:RitmoRevisao, agora=Date.now()) {
  const mapa=new Map<string,string>()
  for(const [dia,itens] of distribuirRevisoes(registros,ritmo,400,agora)) for(const e of itens) mapa.set(e.id,chaveDoDia(dia))
  return mapa
}
export function segundosPorRevisao(historico:Array<{filtros?:{situacao?:string};descricao?:string;respondidas:number;segundos:number}>) {
  const hs=historico.filter(s=>(s.filtros?.situacao==='revisarHoje'||s.descricao?.includes('Revisar hoje'))&&s.respondidas>0&&s.segundos>0)
  const n=hs.reduce((s,h)=>s+h.respondidas,0)
  return n>=5 ? Math.max(10,Math.min(180,Math.round(hs.reduce((s,h)=>s+h.segundos,0)/n))) : 40
}
export const diasDeHoje = (dias:number) => Array.from({length:dias},(_,i)=>somarDias(hojeBR(),i))
export { INTERVALOS }

import { useEffect, useState } from 'react'
import { chamarRpc } from '../servicos/supabase'

export interface OrigemCortesia { nome: string; dias: number; tipo: 'indicou' | 'foi_convidado'; em: string }
export interface ResumoAcesso {
  pago_ate: string | null
  ultimo_periodo_pago_ate: string | null
  cortesia: { ate: string | null; sem_prazo: boolean; ativa: boolean; motivo: string | null; por_indicacao: boolean; origens: OrigemCortesia[] } | null
}
export function dadosCortesia(resumo?: ResumoAcesso | null, agora=Date.now()) {
  const c=resumo?.cortesia
  const fim=c?.ate?Date.parse(c.ate):null
  const ativa=!!c&&(c.sem_prazo||fim!==null&&Number.isFinite(fim)&&fim>agora)
  const dias=ativa&&fim!==null?Math.ceil((fim-agora)/864e5):null
  const origens=c?.por_indicacao?c.origens??[]:[]
  return {cortesia:c,ativa,fim,dias,origens,semPrazo:ativa&&!!c?.sem_prazo}
}
export function origemDaCortesia(origens: OrigemCortesia[]) {
  if(!origens.length) return null
  const o=origens[0], outros=origens.length>1?` e mais ${origens.length-1} ${origens.length===2?'pessoa':'pessoas'}`:''
  return o.tipo==='foi_convidado'?`Pelo convite de ${o.nome}${outros}`:`Por indicar ${o.nome}${outros}`
}
export function usarResumoAcesso(id?:string|null,chave?:unknown) {
  const [resumo,definir]=useState<ResumoAcesso|null>(null)
  const [carregando,carregar]=useState(!!id)
  useEffect(()=>{
    if(!id){definir(null);carregar(false);return}
    let ativo=true;definir(null);carregar(true)
    chamarRpc<ResumoAcesso>('obter_resumo_acesso',{}).then(r=>{if(ativo)definir(r)}).catch(()=>{if(ativo)definir(null)}).finally(()=>{if(ativo)carregar(false)})
    return()=>{ativo=false}
  },[id,chave])
  return {resumo,carregando}
}

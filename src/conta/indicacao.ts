import { useEffect, useState } from 'react'
import { SITE } from '../config'
import { chamarRpc, chamarRpcPublica } from '../servicos/supabase'

/**
 * Programa de indicação (ver supabase/migrations/202610040200_indicacoes.sql).
 * Cada conta tem um código; o link é #/convite/CODIGO. Quem cria a conta por ele
 * e responde 20 questões confirma a indicação: os dois ganham 7 dias do plano
 * completo. Quem indica ganha por até 12 amigos.
 */

export const DIAS_POR_AMIGO = 7
export const QUESTOES_PARA_CONFIRMAR = 20
export const LIMITE_AMIGOS = 12

export interface MinhaIndicacao {
  codigo: string; convidados: number; confirmados: number; dias_ganhos: number; limite: number
  cortesia_ate: string | null; fui_convidado: boolean; minha_confirmada: boolean
}

export const linkIndicacao = (codigo: string) => `${SITE.url.replace(/\/$/, '')}/#/convite/${codigo}`

export function textoIndicacao(codigo: string) {
  return `Tô usando o ${SITE.nome} pra estudar pra prova de título: questões das provas oficiais (TEOT, TARO e outras), comentadas alternativa por alternativa. Entra pelo meu link: respondendo 20 questões, a gente ganha ${DIAS_POR_AMIGO} dias do plano completo cada um.\n${linkIndicacao(codigo)}`
}

let pedido: { usuario: string; promessa: Promise<MinhaIndicacao | null> } | null = null
/** Busca (e cria, na primeira vez) o código e o resumo. Uma vez por conta e carregamento. */
export function buscarMinhaIndicacao(usuario: string, recarregar = false): Promise<MinhaIndicacao | null> {
  if (!pedido || pedido.usuario !== usuario || recarregar) {
    pedido = {
      usuario,
      promessa: chamarRpc<MinhaIndicacao[]>('minha_indicacao', {})
        .then((linhas) => linhas[0] ? { ...linhas[0], convidados: Number(linhas[0].convidados), confirmados: Number(linhas[0].confirmados), dias_ganhos: Number(linhas[0].dias_ganhos) } : null)
        .catch(() => { pedido = null; return null }),
    }
  }
  return pedido.promessa
}

export function usarMinhaIndicacao(usuario: string | null | undefined) {
  const [dados, definir] = useState<MinhaIndicacao | null>(null)
  const [carregado, definirCarregado] = useState(false)
  useEffect(() => {
    if (!usuario) { definir(null); definirCarregado(true); return }
    let ativo = true
    void buscarMinhaIndicacao(usuario).then((d) => { if (ativo) { definir(d); definirCarregado(true) } })
    return () => { ativo = false }
  }, [usuario])
  return { dados, carregado }
}

export function previaConvite(codigo: string): Promise<string | null> {
  return chamarRpcPublica<string | null>('previa_convite', { p_codigo: codigo }).catch(() => null)
}

// O convite recebido fica guardado até a pessoa entrar na conta (pode criar a
// conta pelo Google, sair e voltar): fora do prefixo por conta, vale no aparelho.
const RECEBIDO = 'ortoquestoes:convite-recebido'
const USADO = 'ortoquestoes:convite-usado'

export function guardarConviteRecebido(codigo: string) {
  try { localStorage.setItem(RECEBIDO, JSON.stringify({ codigo, em: Date.now() })) } catch { /* sem armazenamento */ }
}
export function conviteRecebido(): string | null {
  try {
    const salvo = JSON.parse(localStorage.getItem(RECEBIDO) ?? 'null') as { codigo: string; em: number } | null
    return salvo && Date.now() - salvo.em < 30 * 86_400_000 ? salvo.codigo : null
  } catch { return null }
}

export type ResultadoConvite = 'ok' | 'codigo_invalido' | 'proprio_codigo' | 'ja_convidado' | 'conta_antiga' | 'erro'

/** Depois do login: usa o convite guardado, uma vez. */
export async function aplicarConviteRecebido(): Promise<ResultadoConvite | null> {
  const codigo = conviteRecebido()
  if (!codigo) return null
  let resultado: ResultadoConvite
  try { resultado = await chamarRpc<ResultadoConvite>('usar_convite', { p_codigo: codigo }) } catch { return 'erro' }
  try {
    localStorage.removeItem(RECEBIDO)
    if (resultado === 'ok') localStorage.setItem(USADO, '1')
  } catch { /* sem armazenamento */ }
  return resultado
}

/** Convidado que chegou às 20 questões: confirma a indicação (e os dias dos dois). */
export async function conferirMinhaIndicacao(usuario: string, respondidas: number) {
  let usado = false
  try { usado = localStorage.getItem(USADO) === '1' } catch { /* sem armazenamento */ }
  if (!usado || respondidas < QUESTOES_PARA_CONFIRMAR) return
  const dados = await buscarMinhaIndicacao(usuario, true)
  if (dados?.minha_confirmada || (dados && !dados.fui_convidado)) {
    try { localStorage.removeItem(USADO) } catch { /* sem armazenamento */ }
  }
}

import { useCallback, useState } from 'react'
import { chamarRpc, obterToken } from '../servicos/supabase'

export const FUSO_DIA = 'America/Sao_Paulo'
export const LIMITES_HABILITADOS = import.meta.env.VITE_LIMITES_HABILITADOS === 'true'

export function chaveDia(data = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_DIA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(data)
}
export function inicioDia(data = new Date()): Date {
  const [ano, mes, dia] = chaveDia(data).split('-').map(Number)
  const meiaNoiteUtc = Date.UTC(ano, mes - 1, dia)
  // Calcula o deslocamento real do fuso nessa data, sem cristalizar “UTC-3”.
  const referencia = new Date(Date.UTC(ano, mes - 1, dia, 12))
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: FUSO_DIA, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' }).formatToParts(referencia)
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value)
  const comoUtc = Date.UTC(valor('year'), valor('month') - 1, valor('day'), valor('hour'), valor('minute'), valor('second'))
  const deslocamento = comoUtc - referencia.getTime()
  return new Date(meiaNoiteUtc - deslocamento)
}

export interface EstadoLimite {
  permitido: boolean
  paywallAtivo: boolean
  ilimitado: boolean
  consumidas: number
  limite: number
  restantes: number | null
  liberaEm: string
  sequencia: number
  motivo?: string
}

export function usarLimiteDiario() {
  const [estado, definirEstado] = useState<EstadoLimite | null>(null)
  const [validando, definirValidando] = useState(false)

  const autorizar = useCallback(async (idQuestao: string, chaveIdempotencia: string) => {
    if (!LIMITES_HABILITADOS) return { permitido: true } as EstadoLimite
    definirValidando(true)
    try {
      if (!obterToken()) throw new Error('Entre na sua conta para registrar novas respostas.')
      const resposta = await chamarRpc<Array<Record<string, unknown>>>('autorizar_resposta', {
        p_chave_idempotencia: chaveIdempotencia,
        p_id_questao: idQuestao,
      })
      const r = resposta[0]
      const normalizado: EstadoLimite = {
        permitido: Boolean(r.permitido), paywallAtivo: Boolean(r.paywall_ativo), ilimitado: Boolean(r.ilimitado),
        consumidas: Number(r.consumidas), limite: Number(r.limite), restantes: r.restantes === null ? null : Number(r.restantes),
        liberaEm: String(r.libera_em), sequencia: Number(r.sequencia ?? 0), motivo: r.motivo ? String(r.motivo) : undefined,
      }
      definirEstado(normalizado)
      return normalizado
    } catch (erro) {
      const bloqueado: EstadoLimite = { permitido: false, paywallAtivo: true, ilimitado: false, consumidas: 0, limite: 0, restantes: 0, liberaEm: '', sequencia: 0, motivo: erro instanceof Error ? erro.message : 'Não foi possível validar o limite.' }
      definirEstado(bloqueado)
      return bloqueado
    } finally { definirValidando(false) }
  }, [])
  return { estado, definirEstado, autorizar, validando }
}

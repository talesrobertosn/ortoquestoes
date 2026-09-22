import { useCallback, useState } from 'react'
import { chamarRpc } from '../servicos/supabase'

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
  falhaValidacao?: boolean
}

export function usarLimiteDiario() {
  const [estado, definirEstado] = useState<EstadoLimite | null>(null)
  const [validando, definirValidando] = useState(false)

  const autorizar = useCallback(async (idQuestao: string, chaveIdempotencia: string) => {
    if (!LIMITES_HABILITADOS) return { permitido: true } as EstadoLimite
    definirValidando(true)
    try {
      // Prazo total: nenhuma combinação de sessão lenta e rede lenta pode
      // deixar o botão de responder esperando para sempre.
      const prazo = new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error('A validação demorou demais.')), 12_000))
      const resposta = await Promise.race([chamarRpc<Array<Record<string, unknown>>>('autorizar_resposta', {
        p_chave_idempotencia: chaveIdempotencia,
        p_id_questao: idQuestao,
      }), prazo])
      const r = resposta[0]
      const normalizado: EstadoLimite = {
        permitido: Boolean(r.permitido), paywallAtivo: Boolean(r.paywall_ativo), ilimitado: Boolean(r.ilimitado),
        consumidas: Number(r.consumidas), limite: Number(r.limite), restantes: r.restantes === null ? null : Number(r.restantes),
        liberaEm: String(r.libera_em), sequencia: Number(r.sequencia ?? 0), motivo: r.motivo ? String(r.motivo) : undefined,
      }
      definirEstado(normalizado)
      return normalizado
    } catch (erro) {
      // Falha técnica (rede, prazo, sessão) não é limite atingido: a resposta
      // segue e é registrada. Só bloqueia quando o servidor responde que não.
      const falha: EstadoLimite = { permitido: true, paywallAtivo: false, ilimitado: false, consumidas: 0, limite: 0, restantes: null, liberaEm: '', sequencia: 0, motivo: erro instanceof Error ? erro.message : 'Não foi possível validar o limite.', falhaValidacao: true }
      definirEstado(falha)
      return falha
    } finally { definirValidando(false) }
  }, [])
  return { estado, definirEstado, autorizar, validando }
}

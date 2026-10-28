import { useEffect, useState } from 'react'
import { lerTabela } from '../servicos/supabase'

/** O Pix abre a renovação nos 7 dias finais (criar-pix recusa antes disso). */
export const JANELA_RENOVACAO_PIX = 7 * 864e5

export interface PeriodoPix {
  /** O período vigente foi pago no Pix (sem cobrança automática). */
  pix: boolean
  /** Fim do último período pago no Pix, somando renovações já pagas. */
  fim: number | null
}

/**
 * Lê as assinaturas vigentes da própria conta para saber se o acesso veio do Pix.
 * `obter_estado_conta` não traz o meio de pagamento, e "ativa sem renovação"
 * também descreve um cartão com a renovação desligada; o id externo `pix:` desfaz a dúvida.
 * Devolve null enquanto lê ou se a leitura falhar.
 */
export function usarPeriodoPix(idUsuario: string | undefined, chave: unknown = 0): PeriodoPix | null {
  const [periodo, definirPeriodo] = useState<PeriodoPix | null>(null)
  useEffect(() => {
    if (!idUsuario) { definirPeriodo(null); return }
    const controle = new AbortController()
    const agora = encodeURIComponent(new Date().toISOString())
    lerTabela<Array<{ id_externo: string | null; fim_periodo: string | null }>>(
      `assinaturas?select=id_externo,fim_periodo&status=eq.ativa&fim_periodo=gt.${agora}&order=fim_periodo.desc`,
      { sinal: controle.signal },
    ).then((linhas) => {
      const doPix = linhas.filter((l) => l.id_externo?.startsWith('pix:') && l.fim_periodo)
      const pix = linhas.length > 0 && doPix.length === linhas.length
      definirPeriodo({ pix, fim: pix ? Math.max(...doPix.map((l) => Date.parse(l.fim_periodo as string))) : null })
    }).catch(() => { if (!controle.signal.aborted) definirPeriodo(null) })
    return () => controle.abort()
  }, [idUsuario, chave])
  return periodo
}

/** A data em dd/mm, no fuso de quem lê. */
export const diaMes = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

/** Mesmo dia, `meses` depois (o fim do período renovado). */
export function somarMeses(ms: number, meses: number) {
  const d = new Date(ms)
  d.setMonth(d.getMonth() + meses)
  return d.getTime()
}

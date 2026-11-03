import { useEffect, useState } from 'react'
import type { Session } from '@supabase/auth-js'
import { chamarRpc } from '../servicos/supabase'
import type { Plano } from '../dados/planos'

export type PlanoComPrecoAntigo = Extract<Plano['id'], 'semestral' | 'anual'>
/** Um plano em que a pessoa mantém o preço de antes do reajuste e até quando pode renovar por ele. */
export interface PrecoGuardado { plano: PlanoComPrecoAntigo; ate: number }

/** Lê a resposta de meus_precos_antigos, descartando o que não for um plano e uma data válidos. */
export function lerPrecosGuardados(resposta: unknown): PrecoGuardado[] {
  if (!Array.isArray(resposta)) return []
  return resposta.flatMap((item) => {
    const plano = (item as { plano?: unknown })?.plano
    const ate = Date.parse(String((item as { ate?: unknown })?.ate ?? ''))
    return (plano === 'semestral' || plano === 'anual') && Number.isFinite(ate) ? [{ plano, ate }] : []
  })
}

/**
 * Os planos em que a pessoa paga o preço de antes do reajuste (Tales, 03/11/2026): quem já
 * assinava mantém o valor do plano que pagava enquanto continuar assinando, com 30 dias para
 * renovar depois que o plano acaba. Os outros planos seguem o preço novo. Só muda o que a página
 * mostra; quem decide a cobrança é o servidor (supabase/functions/_shared/precos.ts). Sem conta, ou
 * se a consulta falhar, vale o preço novo. `carregado` evita reabrir o pagamento antes de saber o
 * preço da pessoa.
 */
export function usarPrecoAntigo(sessao: Session | null) {
  const [estado, definirEstado] = useState<{ guardados: readonly PrecoGuardado[]; carregado: boolean }>({ guardados: [], carregado: !sessao })
  const id = sessao?.user.id
  useEffect(() => {
    if (!id) { definirEstado({ guardados: [], carregado: true }); return }
    let vivo = true
    definirEstado({ guardados: [], carregado: false })
    chamarRpc<unknown>('meus_precos_antigos', {})
      .then((r) => { if (vivo) definirEstado({ guardados: lerPrecosGuardados(r), carregado: true }) })
      .catch(() => { if (vivo) definirEstado({ guardados: [], carregado: true }) })
    return () => { vivo = false }
  }, [id])
  return { ...estado, planosAntigos: estado.guardados.map((g) => g.plano) as readonly string[] }
}

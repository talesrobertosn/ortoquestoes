import { useEffect, useState } from 'react'
import type { Session } from '@supabase/auth-js'
import { chamarRpc } from '../servicos/supabase'

/**
 * Se a pessoa paga o preço de antes do reajuste (Tales, 31/10/2026): quem já tinha assinado
 * mantém o valor para sempre. Só muda o que a página mostra; quem decide a cobrança é o
 * servidor (supabase/functions/_shared/precos.ts). Sem conta, ou se a consulta falhar, vale o
 * preço novo. `carregado` evita reabrir o pagamento antes de saber o preço da pessoa.
 */
export function usarPrecoAntigo(sessao: Session | null) {
  const [estado, definirEstado] = useState({ precoAntigo: false, carregado: !sessao })
  const id = sessao?.user.id
  useEffect(() => {
    if (!id) { definirEstado({ precoAntigo: false, carregado: true }); return }
    let vivo = true
    definirEstado({ precoAntigo: false, carregado: false })
    chamarRpc<boolean>('meu_preco_antigo', {})
      .then((r) => { if (vivo) definirEstado({ precoAntigo: r === true, carregado: true }) })
      .catch(() => { if (vivo) definirEstado({ precoAntigo: false, carregado: true }) })
    return () => { vivo = false }
  }, [id])
  return estado
}

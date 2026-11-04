import { useEffect } from 'react'
import { usarConta } from './ContextoConta'
import { chamarRpc } from '../servicos/supabase'
import { gravar } from '../estado/armazenamento'
import { usarArmazenado } from '../estado/usarArmazenado'

/**
 * Acesso aos recursos do plano pago (como a turma respondeu, Simulado
 * Nacional, cronograma, liga e relatório mensal). Quem decide é o
 * servidor, em cada RPC; aqui é só para a interface mostrar o recurso ou o
 * convite sem piscar. Fica guardado por conta, como o estado de assinante.
 */
export type MotivoPremium = 'assinatura' | 'cortesia' | 'administrador' | 'liberado' | 'nenhum'
export interface AcessoPremium { premium: boolean; motivo: MotivoPremium; recursos_exclusivos: boolean; pagamentos_ativos: boolean }

const CHAVE = 'premium:acesso'
const VAZIO: AcessoPremium = { premium: false, motivo: 'nenhum', recursos_exclusivos: true, pagamentos_ativos: false }

let consultado: string | null = null
let pendente: Promise<void> | null = null
let consultadoEm = 0
/** Ao voltar para a aba (ex.: depois de pagar o Pix no app do banco), confere de novo. */
const REVALIDAR_APOS = 30_000

function consultar(id: string) {
  if (consultado === id && pendente) return pendente
  consultado = id
  consultadoEm = Date.now()
  pendente = chamarRpc<AcessoPremium[]>('obter_acesso_premium', {})
    .then(([acesso]) => gravar(CHAVE, { ...VAZIO, ...acesso, conta: id }))
    .catch(() => { consultado = null })
  return pendente
}

/** Depois de assinar ou de o painel mudar algo: consulta de novo. */
export function atualizarPremium(id?: string) {
  consultado = null
  pendente = null
  return id ? consultar(id) : Promise.resolve()
}

export function usarPremium(): AcessoPremium & { carregado: boolean; logado: boolean } {
  const { sessao } = usarConta()
  const [salvo] = usarArmazenado<(AcessoPremium & { conta?: string }) | null>(CHAVE, null)
  const id = sessao?.user.id
  useEffect(() => {
    if (!id) return
    void consultar(id)
    const aoVoltar = () => {
      if (document.visibilityState === 'visible' && Date.now() - consultadoEm > REVALIDAR_APOS) void atualizarPremium(id)
    }
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('pageshow', aoVoltar)
    return () => { document.removeEventListener('visibilitychange', aoVoltar); window.removeEventListener('pageshow', aoVoltar) }
  }, [id])
  const valido = !!id && salvo?.conta === id
  const acesso = valido ? salvo! : VAZIO
  return { ...acesso, premium: valido && acesso.premium, carregado: valido, logado: !!id }
}

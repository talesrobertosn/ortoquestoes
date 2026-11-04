import { useEffect } from 'react'
import type { Session } from '@supabase/auth-js'
import { chamarRpc } from '../servicos/supabase'
import { gravar } from '../estado/armazenamento'
import { usarArmazenado } from '../estado/usarArmazenado'

/**
 * Se a conta tem assinatura vigente. Serve só para a interface deixar de
 * oferecer planos a quem já assina; quem decide o limite é o servidor.
 * Fica guardado por conta para a página não piscar a oferta ao abrir.
 */
const CHAVE = 'plano:assinante'

export interface EstadoAssinaturaConta { status_assinatura: string | null; cancelar_ao_fim: boolean; fim_periodo: string | null }

export function assinaturaVigente(conta: EstadoAssinaturaConta | null | undefined): boolean {
  if (!conta) return false
  const noPrazo = !conta.fim_periodo || Date.parse(conta.fim_periodo) > Date.now()
  return noPrazo && (conta.status_assinatura === 'ativa' || (conta.status_assinatura === 'cancelada' && conta.cancelar_ao_fim))
}

export function registrarAssinante(assinante: boolean) {
  gravar(CHAVE, assinante)
}

// Uma consulta por conta a cada carregamento, refeita ao voltar para a aba
// (o Pix costuma ser pago no app do banco, com o site aberto ao fundo).
let consultado: string | null = null
let consultadoEm = 0
const REVALIDAR_APOS = 30_000

function consultarAssinante(id: string) {
  consultado = id
  consultadoEm = Date.now()
  return chamarRpc<EstadoAssinaturaConta[]>('obter_estado_conta', {})
    .then(([conta]) => registrarAssinante(assinaturaVigente(conta)))
    .catch(() => { consultado = null })
}

/** Depois de um pagamento aprovado: esquece o que estava guardado e consulta de novo. */
export function atualizarAssinante(id: string) {
  consultado = null
  return consultarAssinante(id)
}

export function usarAssinante(sessao: Session | null): boolean {
  const [assinante] = usarArmazenado<boolean>(CHAVE, false)
  const id = sessao?.user.id
  useEffect(() => {
    if (!id) return
    if (consultado !== id) void consultarAssinante(id)
    const aoVoltar = () => {
      if (document.visibilityState === 'visible' && Date.now() - consultadoEm > REVALIDAR_APOS) void consultarAssinante(id)
    }
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('pageshow', aoVoltar)
    return () => { document.removeEventListener('visibilitychange', aoVoltar); window.removeEventListener('pageshow', aoVoltar) }
  }, [id])
  return !!id && assinante
}

import { Suspense, lazy, useState } from 'react'
import { LIMITES_HABILITADOS, lerBloqueioDiario } from '../estado/limiteDiario'

// O convite do limite só existe quando as questões grátis do dia acabaram. A página inicial o carrega
// sob demanda (11/11/2026): o painel de planos (LimiteRespostas.tsx) só desce para quem vai vê-lo.
const ConviteLimiteDoDia = lazy(() => import('./LimiteRespostas').then((m) => ({ default: m.ConviteLimiteDoDia })))

export function ConviteLimiteSobDemanda() {
  const [liberaEm] = useState(() => (LIMITES_HABILITADOS ? lerBloqueioDiario() : null))
  if (!liberaEm) return null
  return <Suspense fallback={null}><ConviteLimiteDoDia /></Suspense>
}

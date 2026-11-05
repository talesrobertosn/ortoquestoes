import { normalizar } from '../ui/formato'
import type { LinhaUsuario } from './pessoas'

/** Canais de aquisição (Tales, 05/11/2026): a primeira origem registrada de cada conta, agrupada. UTM quando houver. */
export const CANAIS = ['Google', 'Instagram', 'WhatsApp', 'Indicação', 'Acesso direto', 'Outras fontes'] as const
export function canalDe(o: LinhaUsuario['origem']): typeof CANAIS[number] {
  if (!o) return 'Acesso direto'
  const t = normalizar(`${o.fonte ?? ''} ${o.meio ?? ''} ${o.campanha ?? ''}`)
  if (/google|gads|adwords|busca|search/.test(t)) return 'Google'
  if (/instagram|insta|\big\b|facebook|meta/.test(t)) return 'Instagram'
  if (/whats|wpp|\bwa\b/.test(t)) return 'WhatsApp'
  if (/indica|convite|referral|amigo/.test(t)) return 'Indicação'
  if (!o.fonte || /direct|direto|\(none\)|none/.test(t)) return 'Acesso direto'
  return 'Outras fontes'
}


import type { User } from '@supabase/auth-js'
import type { ClienteSupabase } from './supabase'

/**
 * Perfil do passo 2 do cadastro, quando a conta ainda espera a confirmação do
 * e-mail. Sem sessão não dá para gravar no Supabase, então o que a pessoa
 * preencheu fica neste navegador e entra na conta assim que ela chegar (volta
 * do link de confirmação ou o próximo "Entrar" com o mesmo e-mail). Se o link
 * for aberto em outro aparelho, o "Complete seu perfil" da capa pede o que
 * faltar. Só preenche campos que ainda estão vazios na conta.
 */
const CHAVE = 'ortoquestoes:perfil-pendente'
const VALIDADE_MS = 3 * 24 * 60 * 60 * 1000

export function guardarPerfilPendente(email: string, dados: Record<string, unknown>) {
  try { localStorage.setItem(CHAVE, JSON.stringify({ email: email.trim().toLowerCase(), dados, em: Date.now() })) } catch { /* sem armazenamento */ }
}

export function descartarPerfilPendente() {
  try { localStorage.removeItem(CHAVE) } catch { /* sem armazenamento */ }
}

const vazio = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

/** Leva para a conta o perfil guardado no cadastro, se for desta conta. */
export async function aplicarPerfilPendente(cliente: ClienteSupabase, usuario: User) {
  let pendente: { email?: string; dados?: Record<string, unknown>; em?: number } | null = null
  try { pendente = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') } catch { return }
  if (!pendente) return
  if (!pendente.em || Date.now() - pendente.em > VALIDADE_MS) { descartarPerfilPendente(); return }
  // Outra conta neste navegador: o perfil guardado continua esperando a dona dele.
  if (!pendente.email || pendente.email !== (usuario.email ?? '').trim().toLowerCase()) return
  descartarPerfilPendente()
  const atual = (usuario.user_metadata ?? {}) as Record<string, unknown>
  const dados = Object.fromEntries(Object.entries(pendente.dados ?? {}).filter(([campo, valor]) => !vazio(valor) && vazio(atual[campo])))
  if (Object.keys(dados).length) await cliente.auth.updateUser({ data: dados })
}

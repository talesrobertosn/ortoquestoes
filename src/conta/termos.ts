import type { Session } from '@supabase/supabase-js'
import { PREFIXO_ARMAZENAMENTO } from '../config'
import { supabase } from './supabase'

/**
 * Muda sempre que o texto dos Termos de Uso e Consentimento mudar de forma
 * relevante. Isso faz o portão de aceite aparecer de novo, mesmo para quem já
 * tinha aceitado uma versão anterior.
 */
export const VERSAO_TERMOS = '2026-09-16'

// Chave própria, fora do sistema de armazenamento por conta: o aceite de
// visitante precisa sobreviver mesmo sem login, o que o restante do app
// (armazenamento.ts) deliberadamente não garante para quem não tem conta.
const CHAVE_LOCAL = PREFIXO_ARMAZENAMENTO + 'termos:versao'

export function termosAceitosLocalmente(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_LOCAL) === VERSAO_TERMOS
  } catch {
    return false
  }
}

export function registrarAceiteLocal(): void {
  try {
    window.localStorage.setItem(CHAVE_LOCAL, VERSAO_TERMOS)
  } catch {
    /* Armazenamento indisponível (ex.: aba anônima): o aceite vale só para esta visita. */
  }
}

/** Dados a incluir no cadastro ou na atualização do usuário no Supabase. */
export function dadosAceiteTermos() {
  return { termos_versao: VERSAO_TERMOS, termos_aceitos_em: new Date().toISOString() }
}

export function termosAceitos(sessao: Session | null): boolean {
  if (sessao) return sessao.user.user_metadata?.termos_versao === VERSAO_TERMOS
  return termosAceitosLocalmente()
}

/** Registra o aceite na própria conta, sem alterar os demais dados do perfil. */
export async function registrarAceiteConta(): Promise<{ error: Error | null }> {
  if (!supabase) return { error: null }
  const { error } = await supabase.auth.updateUser({ data: dadosAceiteTermos() })
  return { error }
}

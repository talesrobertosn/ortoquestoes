import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { nomeNoRanking } from '../util/nomeRanking'

/** Tamanho aceito pelo banco (constraint tamanho_apelido). */
export const APELIDO_MAXIMO = 30

export interface PerfilRanking {
  /** Apelido escolhido; null = aparece o nome do cadastro. */
  apelido: string | null
  /** false só quando a pessoa pediu para sair. Padrão: participa. */
  participa: boolean
}

/** Traduz a recusa do banco (trigger normalizar_apelido_ranking) para a pessoa. */
export function textoErroApelido(mensagem?: string): string {
  if (mensagem?.includes('apelido_nao_permitido')) return 'Esse apelido não é permitido no ranking. Escolha outro.'
  if (mensagem?.includes('apelido_tamanho') || mensagem?.includes('tamanho_apelido')) return `O apelido deve ter de 2 a ${APELIDO_MAXIMO} caracteres.`
  if (mensagem?.includes('apelido_invalido') || mensagem?.includes('apelido_sem_marcacao')) return 'Use apenas letras, números e espaços no apelido.'
  return 'Não foi possível salvar agora. Confira sua conexão e tente novamente.'
}

/**
 * Como a própria pessoa aparece no ranking. A linha em perfis_publicos é
 * opcional: sem ela, vale o padrão (nome do cadastro, participando).
 */
export function usarPerfilRanking(sessao: Session | null) {
  const [perfil, definirPerfil] = useState<PerfilRanking>({ apelido: null, participa: true })
  const [carregado, definirCarregado] = useState(false)
  const id = sessao?.user.id
  useEffect(() => {
    if (!supabase || !id) return
    let vivo = true
    supabase.from('perfis_publicos').select('apelido, participa_ranking').eq('usuario_id', id).maybeSingle()
      .then(({ data }) => {
        if (!vivo) return
        definirPerfil({ apelido: data?.apelido ?? null, participa: data?.participa_ranking ?? true })
        definirCarregado(true)
      }, () => { if (vivo) definirCarregado(true) })
    return () => { vivo = false }
  }, [id])

  const salvar = useCallback(async (mudanca: Partial<PerfilRanking>): Promise<string | null> => {
    if (!supabase || !id) return 'Entre na sua conta para alterar o ranking.'
    const proximo = { ...perfil, ...mudanca }
    const apelido = proximo.apelido?.replace(/\s+/g, ' ').trim() || null
    const { data, error } = await supabase.from('perfis_publicos')
      .upsert({ usuario_id: id, apelido, participa_ranking: proximo.participa }, { onConflict: 'usuario_id' })
      .select('apelido, participa_ranking').single()
    if (error) return textoErroApelido(`${error.message} ${error.details ?? ''}`)
    definirPerfil({ apelido: data?.apelido ?? null, participa: data?.participa_ranking ?? true })
    return null
  }, [id, perfil])

  const nomeCadastro = nomeNoRanking(String(sessao?.user.user_metadata?.nome ?? ''), String(sessao?.user.user_metadata?.sobrenome ?? ''))
  return { perfil, carregado, salvar, nomeExibido: perfil.apelido ?? nomeCadastro, nomeCadastro }
}

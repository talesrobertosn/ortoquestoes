import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/auth-js'
import { supabase } from './supabase'
import { nomeNoRanking } from '../util/nomeRanking'

/** Tamanho aceito pelo banco (constraint tamanho_apelido). */
export const APELIDO_MAXIMO = 30

export interface PerfilRanking {
  /** Apelido escolhido; null = aparece o nome do cadastro. */
  apelido: string | null
  /** false só quando a pessoa pediu para sair. Padrão: participa. */
  participa: boolean
  /** Até três conquistas escolhidas para aparecer ao lado do nome. */
  emblemas: string[]
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
  const [perfil, definirPerfil] = useState<PerfilRanking>({ apelido: null, participa: true, emblemas: [] })
  // Falso enquanto o banco não tem a coluna da vitrine (migration ainda não aplicada).
  const [comVitrine, definirComVitrine] = useState(true)
  const [carregado, definirCarregado] = useState(false)
  const id = sessao?.user.id
  useEffect(() => {
    if (!supabase || !id) return
    let vivo = true
    const cliente = supabase
    const tabela = () => cliente.from('perfis_publicos')
    tabela().select('apelido, participa_ranking, emblemas').eq('usuario_id', id).maybeSingle()
      .then(async (resposta) => {
        if (!resposta.error) return { ...resposta, vitrine: true }
        // Banco sem a coluna nova: o perfil continua funcionando, só sem vitrine.
        const antiga = await tabela().select('apelido, participa_ranking').eq('usuario_id', id).maybeSingle()
        return { ...antiga, vitrine: false }
      })
      .then(({ data, vitrine }) => {
        if (!vivo) return
        const linha = data as { apelido?: string | null; participa_ranking?: boolean; emblemas?: string[] | null } | null
        definirComVitrine(vitrine)
        definirPerfil({ apelido: linha?.apelido ?? null, participa: linha?.participa_ranking ?? true, emblemas: linha?.emblemas ?? [] })
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
    definirPerfil({ apelido: data?.apelido ?? null, participa: data?.participa_ranking ?? true, emblemas: perfil.emblemas })
    return null
  }, [id, perfil])

  /** Grava a vitrine (até três conquistas) que aparece ao lado do nome no ranking. */
  const salvarVitrine = useCallback(async (emblemas: string[]): Promise<string | null> => {
    if (!supabase || !id) return 'Entre na sua conta para escolher seus emblemas.'
    if (!comVitrine) return 'A vitrine de emblemas ainda está sendo ativada. Tente de novo mais tarde.'
    const { error } = await supabase.from('perfis_publicos')
      .upsert({ usuario_id: id, apelido: perfil.apelido, participa_ranking: perfil.participa, emblemas }, { onConflict: 'usuario_id' })
    if (error) return 'Não foi possível salvar agora. Confira sua conexão e tente novamente.'
    definirPerfil({ ...perfil, emblemas })
    return null
  }, [id, perfil, comVitrine])

  const nomeCadastro = nomeNoRanking(String(sessao?.user.user_metadata?.nome ?? ''), String(sessao?.user.user_metadata?.sobrenome ?? ''))
  return { perfil, carregado, salvar, salvarVitrine, comVitrine, nomeExibido: perfil.apelido ?? nomeCadastro, nomeCadastro }
}

let ultimaSequenciaPublicada = ''

/**
 * Publica a sequência atual de dias de estudo (a fogueira do ranking) e o
 * último dia que ela inclui. O banco mostra a fogueira só enquanto esse dia é
 * hoje ou ontem; perdeu a sequência, ela some sozinha. Grava apenas quando o
 * valor muda, e falha em silêncio se o banco ainda não tiver as colunas.
 */
export function usarPublicarSequencia(sessao: Session | null, atual: number, ateDia: string) {
  const id = sessao?.user.id
  useEffect(() => {
    if (!supabase || !id) return
    const assinatura = `${id}:${atual}:${ateDia}`
    if (assinatura === ultimaSequenciaPublicada) return
    ultimaSequenciaPublicada = assinatura
    void supabase.from('perfis_publicos')
      .upsert({ usuario_id: id, sequencia_atual: Math.min(atual, 5000), sequencia_em: ateDia }, { onConflict: 'usuario_id' })
      .then(({ error }) => { if (error) ultimaSequenciaPublicada = '' })
  }, [id, atual, ateDia])
}

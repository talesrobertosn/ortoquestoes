import { supabase } from './supabase'

/**
 * Avisos que só aparecem uma vez (21/10/2026, relato do Tales: o aviso dos OrtoQuestões
 * Simulados e o "Seu cronograma em 3 partes" voltavam toda vez). Antes o "já vi" ficava só
 * no navegador do aparelho; agora vai também para a conta (user_metadata.avisos_vistos), e
 * vale em qualquer aparelho e depois de limpar os dados do navegador.
 */
export type AvisoUnico = 'cronograma-simulados' | 'cronograma-tour'

export function avisoVistoNaConta(meta: Record<string, unknown> | undefined | null, aviso: AvisoUnico): boolean {
  const lista = meta?.avisos_vistos
  return Array.isArray(lista) && lista.map(String).includes(aviso)
}

/** Grava na conta (sem esperar: se falhar, o "já vi" do aparelho continua valendo). */
export function marcarAvisoNaConta(meta: Record<string, unknown> | undefined | null, aviso: AvisoUnico) {
  if (!supabase || avisoVistoNaConta(meta, aviso)) return
  const atuais = Array.isArray(meta?.avisos_vistos) ? (meta!.avisos_vistos as unknown[]).map(String) : []
  void supabase.auth.updateUser({ data: { avisos_vistos: [...new Set([...atuais, aviso])] } }).catch(() => undefined)
}

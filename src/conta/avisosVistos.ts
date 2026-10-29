import { supabase } from './supabase'

/**
 * Avisos que só aparecem uma vez (21/10/2026, relato do Tales: o aviso dos OrtoQuestões
 * Simulados e o "Seu cronograma em 3 partes" voltavam toda vez). Antes o "já vi" ficava só
 * no navegador do aparelho; agora vai também para a conta (user_metadata.avisos_vistos), e
 * vale em qualquer aparelho e depois de limpar os dados do navegador.
 */
export type AvisoUnico = 'cronograma-simulados' | 'cronograma-tour' | 'guia-biblioteca' | 'guia-leitor'

export function avisoVistoNaConta(meta: Record<string, unknown> | undefined | null, aviso: AvisoUnico): boolean {
  const lista = meta?.avisos_vistos
  return Array.isArray(lista) && lista.map(String).includes(aviso)
}

// Os "já vi" desta visita, gravados juntos e em fila: duas telas marcando ao mesmo tempo (o aviso dos
// simulados e o tour, que abrem juntos no cronograma) não podem apagar uma a marcação da outra, porque
// cada gravação troca a lista inteira.
const marcados = new Set<string>()
let fila: Promise<unknown> = Promise.resolve()

/** Grava na conta (sem esperar: se falhar, o "já vi" do aparelho continua valendo). */
export function marcarAvisoNaConta(meta: Record<string, unknown> | undefined | null, aviso: AvisoUnico) {
  if (!supabase || avisoVistoNaConta(meta, aviso) || marcados.has(aviso)) return
  marcados.add(aviso)
  const cliente = supabase
  fila = fila.then(async () => {
    // A lista mais recente da conta, somada a tudo o que esta visita já marcou.
    const { data } = await cliente.auth.getUser()
    const atuais = Array.isArray(data.user?.user_metadata?.avisos_vistos) ? (data.user!.user_metadata.avisos_vistos as unknown[]).map(String) : []
    await cliente.auth.updateUser({ data: { avisos_vistos: [...new Set([...atuais, ...marcados])] } })
  }).catch(() => undefined)
}

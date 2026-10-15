/**
 * Sinais leves por pessoa para a lista e a ficha do painel (parte 25,
 * sinais_usuarios_admin): quem abriu a página de planos, flashcards e locais
 * de trabalho. Tudo sai do que o site já registra (Termos, item 17.4): nenhuma
 * coleta nova.
 */
export interface SinalUsuario {
  id_usuario: string
  /** Aberturas da página de planos (/assinatura) nos últimos 30 dias. */
  planos_vezes: number
  planos_ultima: string | null
  /** Última abertura das Condições da Assinatura (passo antes do checkout). */
  condicoes_ultima: string | null
  flashcards_unicos: number
  flashcards_7d: number
  flashcards_ultima: string | null
  cripta_andar: number | null
  /** Outros locais de trabalho, separados por " · ". */
  locais_trabalho: string | null
}

const DIA = 86_400_000
/** Até quantos dias o "Viu os planos" fica em destaque na lista. */
export const PLANOS_RECENTE_DIAS = 7
/** O histórico de páginas guarda 30 dias (Termos, item 17.4). */
export const PLANOS_JANELA_DIAS = 30

export function diasDesde(valor: string | null | undefined, agora = Date.now()): number | null {
  if (!valor) return null
  const t = new Date(valor).getTime()
  return Number.isFinite(t) ? Math.max(0, Math.floor((agora - t) / DIA)) : null
}

/** Abriu a página de planos dentro da janela (padrão: os 30 dias guardados). */
export function viuPlanos(s: Pick<SinalUsuario, 'planos_ultima' | 'planos_vezes'> | null | undefined, dias = PLANOS_JANELA_DIAS, agora = Date.now()): boolean {
  const d = diasDesde(s?.planos_ultima, agora)
  return !!s && s.planos_vezes > 0 && d !== null && d < dias
}

/** "hoje", "ontem", "há 3 dias". */
export function quandoCurto(valor: string | null | undefined, agora = Date.now()): string {
  const d = diasDesde(valor, agora)
  if (d === null) return ''
  return d === 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`
}

/** Texto do selo: "Viu os planos hoje · 3×" (o × só quando abriu mais de uma vez). */
export function textoPlanos(s: Pick<SinalUsuario, 'planos_ultima' | 'planos_vezes'>, agora = Date.now()): string {
  return `Viu os planos ${quandoCurto(s.planos_ultima, agora)}${s.planos_vezes > 1 ? ` · ${s.planos_vezes}×` : ''}`
}

/** Mapa por id, para a lista consultar cada pessoa sem percorrer tudo. */
export function indexarSinais(lista: SinalUsuario[] | null | undefined): Map<string, SinalUsuario> {
  return new Map((lista ?? []).map((s) => [s.id_usuario, s]))
}

/**
 * Cor do cartão da pessoa no painel (Pessoas › Usuários e "Ao vivo"): administrador (azul),
 * assinante (verde), quem não assina mas abriu a página de planos nos últimos 30 dias (amarelo)
 * e o resto (branco). Administrador vem pelo papel da conta, nunca por nome.
 */
export type CategoriaPessoa = 'admin' | 'assinante' | 'planos' | 'comum'
export const ROTULOS_CATEGORIA: Record<CategoriaPessoa, string> = {
  assinante: 'Assinante', comum: 'Não assinante', planos: 'Viu os planos (30 dias)', admin: 'Administrador',
}
export function categoriaPessoa(u: { administrador?: boolean | null; plano_vigente?: string | null }, sinal?: Pick<SinalUsuario, 'planos_ultima' | 'planos_vezes'> | null, agora = Date.now()): CategoriaPessoa {
  if (u.administrador) return 'admin'
  if (u.plano_vigente) return 'assinante'
  return viuPlanos(sinal, PLANOS_JANELA_DIAS, agora) ? 'planos' : 'comum'
}

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
  /** Última visita a Indique e ganhe, consultada no histórico das últimas 24 h. */
  indicacao_ultima?: string | null
  /** Último uso dos Shorts nas últimas 12 h e quantos respondeu hoje (visitas_shorts_admin). */
  shorts_ultima?: string | null
  shorts_hoje?: number
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
/** Quem abriu os planos fica amarelo no painel por 24 horas (Tales, 03/11/2026), contadas da última abertura. */
export const PLANOS_DESTAQUE_MS = 24 * 3_600_000
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

/** Abriu a página de planos nas últimas 24 horas: o amarelo da lista Agora, do Explorador e da ficha. */
export function planosEmDestaque(ultima: string | null | undefined, agora = Date.now()): boolean {
  const t = ultima ? new Date(ultima).getTime() : NaN
  return Number.isFinite(t) && agora - t < PLANOS_DESTAQUE_MS
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
export function indicacaoEmDestaque(ultima: string | null | undefined, agora = Date.now()): boolean {
  const t = ultima ? new Date(ultima).getTime() : NaN
  return Number.isFinite(t) && t <= agora && agora - t < PLANOS_DESTAQUE_MS
}

export interface VisitaIndicacao { id_usuario: string; indicacao_ultima: string }
export interface VisitaShorts { id_usuario: string; shorts_ultima: string; shorts_hoje: number }

/** Quem usou os Shorts fica rosa no painel por 12 horas (Tales, 26/11/2026), contadas do último uso. */
export const SHORTS_DESTAQUE_MS = 12 * 3_600_000
export function shortsEmDestaque(ultima: string | null | undefined, agora = Date.now()): boolean {
  const t = ultima ? new Date(ultima).getTime() : NaN
  return Number.isFinite(t) && t <= agora + 60_000 && agora - t < SHORTS_DESTAQUE_MS
}
/** Texto do selo rosa: "Usou os Shorts · há 2 h · 7 hoje". */
export function textoShorts(s: Pick<SinalUsuario, 'shorts_ultima' | 'shorts_hoje'>, haQuanto: (v: string | null | undefined) => string): string {
  return `Usou os Shorts · ${haQuanto(s.shorts_ultima)}${s.shorts_hoje ? ` · ${s.shorts_hoje} hoje` : ''}`
}

const SINAL_VAZIO = (id: string): SinalUsuario => ({ id_usuario: id, planos_vezes: 0, planos_ultima: null, condicoes_ultima: null, flashcards_unicos: 0, flashcards_7d: 0, flashcards_ultima: null, cripta_andar: null, locais_trabalho: null })

export function indexarSinais(lista: SinalUsuario[] | null | undefined, indicacoes: VisitaIndicacao[] = [], shorts: VisitaShorts[] = []): Map<string, SinalUsuario> {
  const mapa = new Map((lista ?? []).map((s) => [s.id_usuario, { ...s }]))
  for (const visita of indicacoes) {
    const sinal = mapa.get(visita.id_usuario) ?? SINAL_VAZIO(visita.id_usuario)
    mapa.set(visita.id_usuario, { ...sinal, indicacao_ultima: visita.indicacao_ultima })
  }
  for (const uso of shorts) {
    const sinal = mapa.get(uso.id_usuario) ?? SINAL_VAZIO(uso.id_usuario)
    mapa.set(uso.id_usuario, { ...sinal, shorts_ultima: uso.shorts_ultima, shorts_hoje: uso.shorts_hoje })
  }
  return mapa
}

/** Classe da linha da pessoa: rosa (Shorts) por cima do azul (Indique e ganhe). */
export function classeSinais(s: Pick<SinalUsuario, 'indicacao_ultima' | 'shorts_ultima'> | null | undefined, agora = Date.now()): string {
  return [indicacaoEmDestaque(s?.indicacao_ultima, agora) ? 'a3-indicacao' : '', shortsEmDestaque(s?.shorts_ultima, agora) ? 'a3-shorts' : ''].filter(Boolean).join(' ')
}

/**
 * Cor do cartão da pessoa no painel (Pessoas › Usuários e Agora › Online agora): administrador (azul),
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

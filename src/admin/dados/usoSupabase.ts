/**
 * Uso do Supabase (Tales, 03/11/2026): os limites do plano e as contas do medidor, num lugar só.
 *
 * Plano: Free. Limites conferidos em 03/11/2026 na página de preços (supabase.com/pricing) e no guia de cobrança
 * (supabase.com/docs/guides/platform/billing-on-supabase). Mudou de plano ou de limite? Troque só aqui.
 * Os números de uso vêm da função `uso_supabase_admin` (supabase/migrations/202611030100_uso_supabase.sql),
 * que só administrador pode chamar.
 */
export const PLANO_SUPABASE = {
  nome: 'Free',
  conferidoEm: '03/11/2026',
  limites: {
    /** Tamanho do banco por projeto. */
    bancoBytes: 500 * 1024 ** 2,
    /** Arquivos (Storage). */
    arquivosBytes: 1024 ** 3,
    /** Usuários ativos por mês (MAU). */
    usuariosAtivosMes: 50_000,
    /* Tráfego de saída (5 GB/mês) e Edge Functions (500.000 chamadas/mês) não entram: só saem pela API com token. */
  },
} as const

/** A cor da barra: verde até 70%, âmbar até 90%, vermelho daí para cima. */
export const LIMIAR_AVISO = 70
export const LIMIAR_PERIGO = 90
export type Tom = 'ok' | 'aviso' | 'perigo'
export const tomDe = (pct: number): Tom => pct >= LIMIAR_PERIGO ? 'perigo' : pct >= LIMIAR_AVISO ? 'aviso' : 'ok'

/** O que a função do banco devolve. */
export interface UsoSupabase {
  medido_em: string
  banco_bytes: number
  tabelas: Array<{ esquema: string; tabela: string; bytes: number }>
  arquivos_bytes: number
  baldes: Array<{ balde: string; bytes: number; arquivos: number }>
  contas: number
  ativas_30d: number
}

export interface Medidor {
  id: 'banco' | 'arquivos' | 'usuarios'
  nome: string
  frase: string
  /** null: ainda não medido. */
  usado: number | null
  limite: number
  unidade: 'bytes' | 'contas'
  pct: number | null
}

const porcento = (usado: number, limite: number) => limite > 0 ? (100 * usado) / limite : 0

/** Os três medidores, na ordem da tela. */
export function medidores(u: UsoSupabase | null): Medidor[] {
  const L = PLANO_SUPABASE.limites
  const m = (id: Medidor['id'], nome: string, frase: string, usado: number | null, limite: number, unidade: Medidor['unidade']): Medidor =>
    ({ id, nome, frase, usado, limite, unidade, pct: usado === null ? null : porcento(usado, limite) })
  return [
    m('banco', 'Banco de dados', 'Todas as tabelas, com índices. Passou do limite, o banco fica só para leitura.', u ? Number(u.banco_bytes) : null, L.bancoBytes, 'bytes'),
    m('arquivos', 'Arquivos', 'Imagens e anexos guardados no Storage, somando todos os baldes.', u ? Number(u.arquivos_bytes) : null, L.arquivosBytes, 'bytes'),
    m('usuarios', 'Usuários ativos', 'Contas que entraram nos últimos 30 dias, perto do que o plano conta por mês.', u ? Number(u.ativas_30d) : null, L.usuariosAtivosMes, 'contas'),
  ]
}

/** Bytes em MB ou GB, em português ("12,4 MB", "1 GB"). */
export function tamanho(bytes: number): string {
  const mb = bytes / 1024 ** 2
  if (mb >= 1024) return `${(mb / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GB`
  return `${mb.toLocaleString('pt-BR', { maximumFractionDigits: mb < 10 ? 2 : 1 })} MB`
}

export function valorDe(v: number, unidade: Medidor['unidade']): string {
  return unidade === 'bytes' ? tamanho(v) : v.toLocaleString('pt-BR')
}

/** Medidores perto do limite (para a fila "Pede ação" da página inicial). */
export const pertoDoLimite = (u: UsoSupabase | null, aPartir = 80) => medidores(u).filter(x => x.pct !== null && x.pct >= aPartir)

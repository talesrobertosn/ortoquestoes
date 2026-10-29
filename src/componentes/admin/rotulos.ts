import { meioDe, vigente, type AssinaturaBase, type Cobranca } from './receita'

/**
 * Nomes do dinheiro no painel, num lugar só (revisão do Financeiro, 15/10/2026): planos, meios,
 * situação de cada assinatura, cobranças, pedidos Pix e avisos do Mercado Pago. As telas
 * (Financeiro, Assinaturas, Cobranças, Avisos, Hoje e a ficha) leem daqui; mudar um nome aqui
 * muda em todas. Só apresentação: nenhuma regra de acesso ou de cobrança mora neste arquivo.
 */

export const PLANOS: Record<string, string> = { mensal: 'Mensal', semestral: 'Semestral', anual: 'Anual' }
export const rotuloPlano = (id: string | null | undefined) => (id ? PLANOS[id] ?? id : '—')

export const MEIOS: Record<'pix' | 'cartao', string> = { pix: 'Pix', cartao: 'Cartão' }
export const rotuloMeio = (meio: string | null | undefined) => (meio === 'pix' || meio === 'cartao' ? MEIOS[meio] : '—')

/** O status como o banco grava, em uma palavra. A situação completa (com a data do acesso) sai de `situacaoAssinatura`. */
export const STATUS_ASSINATURA: Record<string, string> = {
  ativa: 'Ativa', cancelada: 'Cancelada', reembolsada: 'Reembolsada', vencida: 'Expirada',
  falha_pagamento: 'Falha no pagamento', pendente: 'Pendente', pausada: 'Pausada',
}
/** Acesso liberado pelo administrador, sem pagamento (não é uma assinatura). */
export const CORTESIA = 'Cortesia'

export type Tom = 'ok' | 'aviso' | 'ruim' | 'neutro'
export type ChaveSituacao =
  | 'ativa' | 'cancelada_com_acesso' | 'cancelada' | 'expirada' | 'aguardando_renovacao'
  | 'pendente' | 'falha_pagamento' | 'reembolsada' | 'pausada' | 'outra'
export interface Situacao {
  chave: ChaveSituacao
  /** Nome curto, para o selo: "Ativa", "Cancelada (acesso até 03/11)". */
  rotulo: string
  tom: Tom
  /** Uma frase sobre o que acontece a seguir. */
  detalhe: string
}

/** "03/11", no relógio de Brasília. */
export const diaMes = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : ''

/**
 * Situação de uma assinatura em linguagem do dia a dia. Usa as mesmas regras de acesso do resto
 * do painel (`vigente` e `meioDe`, em receita.ts), só traduz:
 * - Ativa: cartão que renova sozinho, ou Pix dentro do período pago.
 * - Cancelada (acesso até dd/mm): a renovação foi desligada, mas o período pago ainda vale.
 * - Cancelada: renovação desligada e período acabado.
 * - Expirada: Pix que terminou, ou assinatura vencida.
 * - Aguardando renovação: cartão ativo cujo período acabou e a cobrança nova ainda não chegou.
 * - Pendente, Falha no pagamento, Reembolsada, Pausada: como o banco grava.
 */
export function situacaoAssinatura(a: AssinaturaBase, agora = Date.now()): Situacao {
  const ate = diaMes(a.fim_periodo)
  const comAcesso = vigente(a, agora)
  const pix = meioDe(a) === 'pix'
  const acabou = !!a.fim_periodo && new Date(a.fim_periodo).getTime() <= agora
  switch (a.status) {
    case 'reembolsada': return { chave: 'reembolsada', rotulo: 'Reembolsada', tom: 'ruim', detalhe: 'Pagamento devolvido; o acesso pago foi encerrado.' }
    case 'pendente': return { chave: 'pendente', rotulo: 'Pendente', tom: 'aviso', detalhe: 'Aguardando o primeiro pagamento.' }
    case 'falha_pagamento': return { chave: 'falha_pagamento', rotulo: 'Falha no pagamento', tom: 'ruim', detalhe: 'A cobrança não foi confirmada. Veja Financeiro › Avisos de pagamento.' }
    case 'pausada': return { chave: 'pausada', rotulo: 'Pausada', tom: 'neutro', detalhe: 'Pausada no Mercado Pago: não cobra nem libera acesso.' }
    case 'vencida': return { chave: 'expirada', rotulo: 'Expirada', tom: 'neutro', detalhe: acabou ? `O acesso terminou em ${ate}.` : 'O acesso terminou.' }
    case 'cancelada':
      return comAcesso
        ? { chave: 'cancelada_com_acesso', rotulo: ate ? `Cancelada (acesso até ${ate})` : 'Cancelada (com acesso)', tom: 'aviso', detalhe: 'Não renova; o período pago continua valendo.' }
        : { chave: 'cancelada', rotulo: 'Cancelada', tom: 'neutro', detalhe: acabou ? `Sem renovação; o acesso terminou em ${ate}.` : 'Sem renovação e sem acesso pago.' }
    case 'ativa':
      if (!comAcesso) return pix
        ? { chave: 'expirada', rotulo: 'Expirada', tom: 'neutro', detalhe: ate ? `Pix: o acesso terminou em ${ate}.` : 'Pix: o acesso terminou.' }
        : { chave: 'aguardando_renovacao', rotulo: 'Aguardando renovação', tom: 'aviso', detalhe: 'O período acabou e a cobrança nova do cartão ainda não chegou.' }
      if (pix) return { chave: 'ativa', rotulo: 'Ativa', tom: 'ok', detalhe: ate ? `Pix: acesso até ${ate}, sem renovação automática.` : 'Pix: sem renovação automática.' }
      if (a.cancelar_ao_fim) return { chave: 'cancelada_com_acesso', rotulo: ate ? `Cancelada (acesso até ${ate})` : 'Cancelada (com acesso)', tom: 'aviso', detalhe: 'Pediu o cancelamento: não renova, e o período pago continua valendo.' }
      return { chave: 'ativa', rotulo: 'Ativa', tom: 'ok', detalhe: ate ? `Cartão: renova sozinho em ${ate}.` : 'Cartão: renova sozinho.' }
    default: return { chave: 'outra', rotulo: STATUS_ASSINATURA[a.status] ?? a.status, tom: 'neutro', detalhe: '' }
  }
}

/** A data que importa no cartão da assinatura: quando cobra de novo, ou até quando vale o acesso. */
export function proximaData(a: AssinaturaBase & { proxima_cobranca?: string | null }, agora = Date.now()): { rotulo: string; valor: string | null } {
  const s = situacaoAssinatura(a, agora)
  if (s.chave === 'ativa' && meioDe(a) === 'cartao') return { rotulo: 'Próxima cobrança', valor: a.proxima_cobranca ?? a.fim_periodo ?? null }
  if (s.chave === 'pendente') return { rotulo: 'Acesso até', valor: null }
  if (s.chave === 'reembolsada') return { rotulo: 'Reembolsada em', valor: a.fim_periodo ?? a.cancelada_em ?? null }
  if (s.chave === 'ativa' || s.chave === 'cancelada_com_acesso') return { rotulo: 'Acesso até', valor: a.fim_periodo ?? null }
  const acabou = !!a.fim_periodo && new Date(a.fim_periodo).getTime() <= agora
  return { rotulo: acabou ? 'Acesso terminou em' : 'Fim do período', valor: a.fim_periodo ?? null }
}

/** Cobrança do Financeiro e da lista de Cobranças. */
export const SITUACAO_COBRANCA = { paga: 'Paga', estimada: 'Estimada', reembolsada: 'Reembolsada' } as const
export type SituacaoCobranca = keyof typeof SITUACAO_COBRANCA
/** "Compra no Pix", "Assinatura nova" (1ª cobrança do cartão) ou "Renovação automática". */
export const rotuloTipoCobranca = (c: Pick<Cobranca, 'meio' | 'tipo'>) =>
  c.tipo === 'nova' ? 'Assinatura nova' : c.tipo === 'volta' ? 'Voltou a assinar'
    : c.meio === 'pix' ? 'Renovação no Pix' : 'Renovação automática'

/** Pedido Pix (tabela pedidos_pix), com o status que o Mercado Pago devolve. */
export const STATUS_PIX: Record<string, string> = {
  criando: 'Gerando o código', pending: 'Aguardando pagamento', approved: 'Pago', cancelled: 'Cancelado',
  rejected: 'Recusado', refunded: 'Reembolsado', charged_back: 'Contestado (estorno)', expired: 'Expirou sem pagar',
}

/** Situação de um aviso do Mercado Pago depois de o site processar. */
export const STATUS_EVENTO: Record<string, string> = {
  recebido: 'Na fila', processado: 'Processado', ignorado: 'Ignorado (normal)', erro: 'Precisa de atenção',
}

/** Tipo de aviso que o Mercado Pago manda para o site. */
export const TIPOS_EVENTO: Record<string, string> = {
  payment: 'Pagamento (Pix ou cartão)',
  subscription_authorized_payment: 'Cobrança automática do cartão',
  subscription_preapproval: 'Assinatura no cartão criada ou alterada',
  subscription_preapproval_plan: 'Plano do Mercado Pago',
}

/**
 * Comparação com o mês anterior: diferença absoluta, porcentagem (null sem base) e o sentido.
 * "Bom" depende do número: mais receita é bom, mais cancelamento não; quem mostra decide a cor.
 */
export function compararMeses(atual: number, anterior: number) {
  const delta = atual - anterior
  const pct = anterior ? Math.round((delta / anterior) * 100) : null
  return { delta, pct, sentido: delta > 0 ? 'sobe' as const : delta < 0 ? 'desce' as const : 'igual' as const }
}

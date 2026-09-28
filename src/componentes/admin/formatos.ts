/** Textos e formatos compartilhados pelas abas do painel do administrador. */

export const data = (valor: string | null | undefined) => valor ? new Date(valor).toLocaleDateString('pt-BR') : '—'
export const dataHora = (valor: string | null | undefined) => valor ? new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

/** "hoje", "ontem", "há 5 dias", "há 3 meses". */
export function haQuanto(valor: string | null | undefined): string {
  if (!valor) return 'nunca'
  const dias = Math.floor((Date.now() - new Date(valor).getTime()) / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(dias / 365)
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`
}

export const normalizar = (texto: string) => texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '')
export const corresponde = (termos: Array<string | null | undefined>, busca: string) =>
  !busca || termos.some((termo) => termo && normalizar(termo).includes(busca))

export const PLANOS: Record<string, string> = { mensal: 'Mensal', semestral: 'Semestral', anual: 'Anual' }

export const STATUS_ASSINATURA: Record<string, string> = {
  ativa: 'Em dia', cancelada: 'Cancelada', reembolsada: 'Reembolsada', vencida: 'Vencida',
  falha_pagamento: 'Falha no pagamento', pendente: 'Aguardando pagamento', pausada: 'Pausada',
}

export const STATUS_EVENTO: Record<string, string> = {
  recebido: 'Na fila', processado: 'Processado', ignorado: 'Ignorado (normal)', erro: 'Precisa de atenção',
}

export const TIPOS_EVENTO: Record<string, string> = {
  payment: 'Pagamento avulso',
  subscription_authorized_payment: 'Cobrança da assinatura',
  subscription_preapproval: 'Assinatura criada ou alterada',
  subscription_preapproval_plan: 'Plano do Mercado Pago',
}

/** O que cada código de erro do webhook quer dizer, e o que fazer. */
export const ERROS_EVENTO: Record<string, string> = {
  erro_interno: 'Erro inesperado no processamento. O detalhe fica só nos logs da Function (Supabase › Edge Functions › webhook-mercado-pago).',
  consulta_mercado_pago_falhou: 'O Mercado Pago não respondeu à consulta. Costuma resolver com "Reprocessar".',
  consulta_assinatura_falhou: 'Não foi possível ler a assinatura no banco. Tente reprocessar.',
  consulta_conta_teste_falhou: 'Não foi possível conferir se a conta é de teste. Tente reprocessar.',
  criacao_assinatura_falhou: 'O pagamento chegou, mas a assinatura não foi gravada no banco. Reprocesse.',
  atualizacao_assinatura_falhou: 'A assinatura existe, mas não foi atualizada no banco. Reprocesse.',
  atualizacao_cobranca_falhou: 'A cobrança não foi registrada na assinatura. Reprocesse.',
  atualizacao_evento_falhou: 'O evento foi tratado, mas o status dele não foi salvo.',
  assinatura_nao_encontrada: 'O Mercado Pago cita uma assinatura que não existe no banco. Confira o e-mail do pagador no Mercado Pago.',
  data_aprovacao_ausente: 'Pagamento aprovado sem data de aprovação. Confira no Mercado Pago.',
  recorrencia_ausente: 'A assinatura veio sem período de cobrança.',
  recorrencia_desconhecida: 'Período de cobrança diferente de mensal, semestral ou anual.',
  recorrencia_invalida: 'Período de cobrança inválido.',
  pagamento_divergente: 'O valor ou o pagador não bate com a assinatura. Confira no Mercado Pago antes de liberar.',
  evento_divergente: 'O mesmo evento chegou duas vezes com conteúdo diferente.',
  evento_invalido: 'Aviso em formato inválido. Pode ser teste do Mercado Pago.',
  assinatura_invalida: 'Assinatura digital do aviso não confere: possível chamada falsa. Nada foi liberado.',
}

export function nomeErro(codigo: string | null): string {
  if (!codigo) return ''
  if (ERROS_EVENTO[codigo]) return ERROS_EVENTO[codigo]
  const texto = codigo.replace(/[_:-]+/g, ' ').trim()
  return texto.charAt(0).toUpperCase() + texto.slice(1) + '.'
}

export const porcentagem = (parte: number, todo: number) => todo > 0 ? Math.round((parte / todo) * 100) : null

/** Mensagem única para uma função do painel que ainda não existe no banco. */
export function erroDoPainel(falha: unknown, migracao: string): string {
  const texto = String(falha)
  if (texto.includes('(403)')) return 'Acesso negado. Esta área é exclusiva de administradores.'
  if (texto.includes('(404)')) return `Falta rodar no Supabase a migração ${migracao}.`
  return 'Não foi possível carregar agora. Tente atualizar.'
}

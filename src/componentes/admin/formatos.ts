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

/** Motivo de um e-mail que não saiu, em português, com o texto do Resend quando houver. */
export function motivoFalhaEmail(bruto: string | null | undefined): string {
  const texto = (bruto ?? '').replace(/^Error: /, '').trim()
  const [, status, detalhe] = texto.match(/^envio_recusado_(\d+)(?::\s*(.*))?$/) ?? []
  const doResend = detalhe ? ` Resposta do Resend: "${detalhe}"` : ''
  if (texto === 'email_nao_configurado') return 'Faltam segredos no Supabase (Edge Functions › Secrets): RESEND_API_KEY, EMAIL_REMETENTE e EMAIL_SEGREDO, com esses nomes exatos.'
  if (texto === 'pessoa_nao_quer_emails') return 'Esta pessoa desligou os e-mails de conquistas em Minha conta.'
  if (status === '401') return 'O Resend não reconheceu a chave. Confira o segredo RESEND_API_KEY (começa com re_).' + doResend
  if (status === '403') return 'O Resend recusou o remetente: o domínio ortoquestoes.com.br ainda não está "Verified" no Resend, ou o EMAIL_REMETENTE usa outro domínio.' + doResend
  if (status === '422') return 'O Resend achou algum dado inválido, quase sempre o formato do EMAIL_REMETENTE. Use: OrtoQuestões <contato@ortoquestoes.com.br>.' + doResend
  if (status === '429') return 'Limite de envios do Resend atingido. Tente de novo mais tarde.' + doResend
  if (status) return `O Resend recusou o envio (código ${status}).` + doResend
  return texto || 'Motivo não registrado.'
}

export const porcentagem = (parte: number, todo: number) => todo > 0 ? Math.round((parte / todo) * 100) : null

/** Mensagem única para uma função do painel que ainda não existe no banco. */
export function erroDoPainel(falha: unknown, migracao: string): string {
  const texto = String(falha)
  if (texto.includes('(403)')) return 'Acesso negado. Esta área é exclusiva de administradores.'
  if (texto.includes('(404)')) return `Falta rodar no Supabase a migração ${migracao}.`
  return 'Não foi possível carregar agora. Tente atualizar.'
}

/** Baixa uma planilha CSV (separador ;, que o Excel em português abre direto). */
export function baixarCsv(nomeArquivo: string, cabecalho: string[], linhas: Array<Array<string | number | null | undefined>>) {
  const celula = (v: string | number | null | undefined) => {
    const texto = v === null || v === undefined ? '' : String(v)
    // Fórmulas começando com = + - @ viram texto: planilha aberta não executa nada.
    const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto
    return /[;"\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
  }
  const conteudo = '﻿' + [cabecalho, ...linhas].map(l => l.map(celula).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = nomeArquivo
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Acerto de uma conta (ou de um grupo somado). "Real" é a primeira resposta de
 * cada questão; "após revisão" é a última (quem errou e acertou na revisão conta
 * como acerto); "por tentativa" soma todas as tentativas, como a pessoa vê no
 * Desempenho. Os dois últimos vêm da migração 202610060400; sem ela, só há o
 * "após revisão" e o real fica nulo.
 */
export interface NumerosAcerto { acertos: number; erros: number; acertos_primeira?: number | null; erros_primeira?: number | null; acertos_tentativas?: number | null; erros_tentativas?: number | null }
export const acertoReal = (n: NumerosAcerto) => n.acertos_primeira == null ? null : porcentagem(Number(n.acertos_primeira), Number(n.acertos_primeira) + Number(n.erros_primeira ?? 0))
export const acertoAposRevisao = (n: NumerosAcerto) => porcentagem(Number(n.acertos), Number(n.acertos) + Number(n.erros))
export const acertoPorTentativa = (n: NumerosAcerto) => n.acertos_tentativas == null ? null : porcentagem(Number(n.acertos_tentativas), Number(n.acertos_tentativas) + Number(n.erros_tentativas ?? 0))
/** Soma os números de várias contas. */
export function somarAcertos(lista: NumerosAcerto[]): Required<NumerosAcerto> {
  const temReal = lista.some(n => n.acertos_primeira != null)
  const soma = (f: (n: NumerosAcerto) => number | null | undefined) => lista.reduce((t, n) => t + Number(f(n) ?? 0), 0)
  return {
    acertos: soma(n => n.acertos), erros: soma(n => n.erros),
    acertos_primeira: temReal ? soma(n => n.acertos_primeira) : null as unknown as number, erros_primeira: temReal ? soma(n => n.erros_primeira) : null as unknown as number,
    acertos_tentativas: temReal ? soma(n => n.acertos_tentativas) : null as unknown as number, erros_tentativas: temReal ? soma(n => n.erros_tentativas) : null as unknown as number,
  }
}

/** "Instagram · anúncio · teot-tepot": fonte, meio e campanha do cadastro. */
const NOMES_FONTE: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', 'instagram/facebook': 'Instagram ou Facebook', google: 'Google', whatsapp: 'WhatsApp', youtube: 'YouTube', x: 'X (Twitter)', direto: 'Acesso direto' }
const NOMES_MEIO: Record<string, string> = { anuncio: 'anúncio', bio: 'link da bio', link: 'link', busca: 'busca', stories: 'stories', story: 'stories' }
export function rotuloOrigem(o: { fonte?: string; meio?: string; campanha?: string }): string {
  const fonte = o.fonte ? NOMES_FONTE[o.fonte] ?? o.fonte : 'Sem fonte'
  const meio = o.meio ? NOMES_MEIO[o.meio] ?? o.meio : null
  return [fonte, meio, o.campanha].filter(Boolean).join(' · ')
}

const PAGINAS: Record<string, string> = {
  '/': 'Início', '/treinar': 'Montando uma sessão', '/sessao': 'Respondendo questões', '/resumo': 'Resumo da sessão',
  '/questao': 'Vendo uma questão', '/dados': 'Desempenho', '/revisao': 'Revisão', '/erros': 'Caderno de erros',
  '/favoritas': 'Favoritas', '/ranking': 'Ranking', '/conquistas': 'Emblemas', '/conta': 'Minha conta',
  '/conta/assinatura': 'Dados da assinatura', '/assinatura': 'Planos (olhando preços)', '/cronograma': 'Cronograma',
  '/plano-de-estudo': 'Cronograma', '/simulado-nacional': 'Simulado Nacional', '/temas-que-mais-caem': 'Temas que mais caem',
  '/indicar': 'Indique e ganhe', '/ligas': 'Liga da residência', '/admin': 'Painel do administrador', '/termos': 'Termos de uso',
  '/contato': 'Suporte e contato', '/sobre': 'O projeto', '/projeto': 'O projeto', '/progresso': 'Progresso dos comentários',
  '/emails': 'Preferências de e-mail',
}
/** "/sessao · 3 de 10" vira "Respondendo questões (3 de 10)". */
export function rotuloPagina(pagina: string | null | undefined): string {
  if (!pagina) return 'sem registro'
  const [rota, extra] = pagina.split(' · ')
  const nome = PAGINAS[rota] ?? (rota.startsWith('/convite') ? 'Abrindo um convite' : rota)
  return extra ? `${nome} (${extra})` : nome
}
/** "agora", "há 4 min", "há 2 h", ou a data. */
export function haQuantoTempo(valor: string | null | undefined): string {
  if (!valor) return 'nunca'
  const min = Math.floor((Date.now() - new Date(valor).getTime()) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  return haQuanto(valor)
}

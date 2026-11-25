import { useCallback, useEffect, useState } from 'react'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { usarPeriodoPix } from './periodoPix'
import type { Session } from '@supabase/auth-js'

/**
 * O estado da assinatura da própria conta, lido uma vez e conciliado com o Mercado Pago
 * (gerenciar-plano, "sincronizar_cobranca"). Usado pelo resumo de Minha conta e pela página
 * Dados da assinatura, que deriva daqui tudo o que mostra (meio, datas, garantia, renovação).
 */
export interface EstadoAssinatura {
  plano: string | null
  status_assinatura: string | null
  fim_periodo: string | null
  ultima_cobranca_em: string | null
  cancelar_ao_fim: boolean
}

export const MENSAGENS_STATUS: Record<string, { titulo: string; explicacao: string }> = {
  ativa: { titulo: 'Em dia', explicacao: 'Seu plano está ativo. A próxima cobrança, se houver, aparece abaixo.' },
  cancelada: { titulo: 'Assinatura encerrada', explicacao: 'O período pago terminou e a renovação está cancelada. Não houve reembolso desta cobrança. Seu histórico permanece salvo.' },
  pendente: { titulo: 'Pendente', explicacao: 'Aguardamos a confirmação do Mercado Pago. Não considere o acesso pago ativo ainda.' },
  falha_pagamento: { titulo: 'Falha no pagamento', explicacao: 'O pagamento não foi aprovado. Você pode continuar usando a modalidade gratuita.' },
  pausada: { titulo: 'Pausada', explicacao: 'A assinatura está pausada. Consulte o Mercado Pago antes de esperar uma nova cobrança.' },
  vencida: { titulo: 'Vencida', explicacao: 'O período desta assinatura terminou. Seu histórico de estudos permanece salvo.' },
  reembolsada: { titulo: 'Encerrada e reembolsada', explicacao: 'O Mercado Pago confirmou o reembolso. O acesso pago terminou e sua conta voltou à modalidade gratuita, com o histórico preservado.' },
}

export const dataBr = (valor: string | number | null | undefined) => valor === null || valor === undefined || valor === '' ? 'Não informada' : new Date(valor).toLocaleDateString('pt-BR')

export function usarEstadoAssinatura(sessao: Session | null) {
  const [estado, definirEstado] = useState<EstadoAssinatura | null>(null)
  const [carregando, definirCarregando] = useState(true)
  const [falhou, definirFalhou] = useState(false)

  const atualizar = useCallback(async () => {
    if (!sessao) return
    try {
      const linhas = await chamarRpc<EstadoAssinatura[]>('obter_estado_conta', {})
      let proximo = linhas[0] ?? null
      if (proximo?.plano && ['ativa', 'cancelada', 'pendente', 'falha_pagamento', 'pausada'].includes(proximo.status_assinatura ?? '')) {
        try {
          await chamarFuncao('gerenciar-plano', { acao: 'sincronizar_cobranca' })
          proximo = (await chamarRpc<EstadoAssinatura[]>('obter_estado_conta', {}))[0] ?? proximo
        } catch { /* A consulta da conta permanece disponível se a conciliação falhar. */ }
      }
      definirEstado(proximo)
      definirFalhou(false)
    } catch { definirFalhou(true) }
    finally { definirCarregando(false) }
  }, [sessao])

  useEffect(() => { void atualizar() }, [atualizar])
  // Pix não tem renovação automática para desligar: o meio vem das assinaturas vigentes da conta.
  const periodoPix = usarPeriodoPix(sessao?.user.id, estado?.fim_periodo)

  const agora = Date.now()
  const status = estado?.status_assinatura ?? ''
  const fimMs = estado?.fim_periodo ? Date.parse(estado.fim_periodo) : NaN
  const ativo = Boolean(status === 'ativa' && (!estado?.fim_periodo || fimMs > agora))
  const periodoPagoVigente = Number.isFinite(fimMs) && fimMs > agora
  const pixAtivo = ativo && Boolean(periodoPix?.pix && periodoPix.fim)
  const fimPix = pixAtivo ? periodoPix?.fim ?? null : null
  const comAcesso = ativo || (status === 'cancelada' && periodoPagoVigente)
  const renovacaoDesligada = !pixAtivo && ((ativo && Boolean(estado?.cancelar_ao_fim)) || (status === 'cancelada' && periodoPagoVigente))
  /** Fim do acesso pago (no Pix, somando renovações já pagas). */
  const fimAcesso = fimPix ?? (Number.isFinite(fimMs) ? fimMs : null)
  const idadeCobranca = agora - new Date(estado?.ultima_cobranca_em ?? '').getTime()
  // Garantia (Tales, 25/11/2026): o site fala em 7 dias, mas o botão de reembolso fica
  // disponível por 10 dias depois da cobrança, para ninguém perder o prazo por horas.
  // A Edge Function gerenciar-plano aceita o mesmo prazo de 10 dias.
  const garantia = (ativo || status === 'cancelada') && Number.isFinite(idadeCobranca) && idadeCobranca >= 0 && idadeCobranca <= 10 * 864e5
  /** Fim dos 7 dias anunciados (é a data mostrada; a tolerância de 10 dias não aparece). */
  const fimGarantia = estado?.ultima_cobranca_em ? Date.parse(estado.ultima_cobranca_em) + 7 * 864e5 : null

  return {
    estado, carregando, falhou, atualizar, periodoPix,
    status, ativo, comAcesso, pixAtivo, fimPix, fimAcesso, renovacaoDesligada, periodoPagoVigente, garantia, fimGarantia,
    /** Meio de pagamento do período vigente; null enquanto lê ou sem acesso pago. */
    meio: !comAcesso ? null : pixAtivo ? 'pix' as const : periodoPix && !periodoPix.pix ? 'cartao' as const : estado?.cancelar_ao_fim ? null : 'cartao' as const,
  }
}

/** Desligar a renovação ou pedir o reembolso da garantia, com as mensagens de cada resultado. */
export async function gerenciarAssinatura(acao: 'cancelar' | 'reembolsar') {
  try {
    await chamarFuncao('gerenciar-plano', { acao })
    return {
      ok: true, mensagem: acao === 'cancelar'
        ? 'Renovação automática desligada. Você continua assinante até o fim do período já pago; não haverá nova cobrança.'
        : 'Reembolso confirmado pelo Mercado Pago. O acesso voltou ao gratuito e seu histórico foi preservado.',
    }
  } catch (erro) {
    const texto = erro instanceof Error ? erro.message : ''
    return {
      ok: false, mensagem: texto.includes('Mercado Pago não confirmou')
        ? 'Não recebemos confirmação do reembolso. Sua assinatura não foi alterada. Entre em contato pelo canal do site para atendimento manual da garantia; confira o pagamento no Mercado Pago antes de tentar novamente.'
        : 'Não foi possível confirmar o resultado da solicitação. Atualize a página e confira o estado no Mercado Pago antes de tentar novamente.',
    }
  }
}

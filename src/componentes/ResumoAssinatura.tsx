import { useCallback, useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'

interface EstadoAssinatura {
  plano: string | null
  status_assinatura: string | null
  fim_periodo: string | null
  ultima_cobranca_em: string | null
  cancelar_ao_fim: boolean
}

const data = (valor: string | null) => valor ? new Date(valor).toLocaleDateString('pt-BR') : 'Não informada'
const mensagensStatus: Record<string, { titulo: string; explicacao: string }> = {
  ativa: { titulo: 'Em dia', explicacao: 'Seu plano está ativo. A próxima cobrança, se houver, aparece abaixo.' },
  cancelada: { titulo: 'Cancelada', explicacao: 'Não haverá novas cobranças desta assinatura. Seu histórico de estudos permanece salvo.' },
  pendente: { titulo: 'Pendente', explicacao: 'Aguardamos a confirmação do Mercado Pago. Não considere o acesso pago ativo ainda.' },
  falha_pagamento: { titulo: 'Falha no pagamento', explicacao: 'O pagamento não foi aprovado. Você pode continuar usando a modalidade gratuita.' },
  pausada: { titulo: 'Pausada', explicacao: 'A assinatura está pausada. Consulte o Mercado Pago antes de esperar uma nova cobrança.' },
  vencida: { titulo: 'Vencida', explicacao: 'O período desta assinatura terminou. Seu histórico de estudos permanece salvo.' },
  reembolsada: { titulo: 'Reembolsada', explicacao: 'O reembolso foi confirmado e o acesso voltou à modalidade gratuita. Seu histórico foi preservado.' },
}

export function ResumoAssinatura() {
  const { sessao } = usarConta()
  const [estado, definirEstado] = useState<EstadoAssinatura | null>(null)
  const [carregando, definirCarregando] = useState(true)
  const [processando, definirProcessando] = useState(false)
  const [mensagem, definirMensagem] = useState('')

  const atualizar = useCallback(async () => {
    if (!sessao) return
    try {
      const linhas = await chamarRpc<EstadoAssinatura[]>('obter_estado_conta', {})
      let proximoEstado = linhas[0] ?? null
      if (proximoEstado?.plano && ['ativa', 'cancelada', 'pendente', 'falha_pagamento', 'pausada'].includes(proximoEstado.status_assinatura ?? '')) {
        try {
          await chamarFuncao('gerenciar-plano', { acao: 'sincronizar_cobranca' })
          proximoEstado = (await chamarRpc<EstadoAssinatura[]>('obter_estado_conta', {}))[0] ?? proximoEstado
        } catch { /* A consulta da conta permanece disponível se a conciliação falhar. */ }
      }
      definirEstado(proximoEstado)
    } catch { definirMensagem('Não foi possível consultar a assinatura agora. Atualize a página e tente novamente.') }
    finally { definirCarregando(false) }
  }, [sessao])

  useEffect(() => { void atualizar() }, [atualizar])

  async function gerenciar(acao: 'cancelar' | 'reembolsar') {
    const aviso = acao === 'cancelar'
      ? 'Cancelar cobranças futuras desta assinatura?'
      : 'Solicitar reembolso integral da última cobrança e cancelar cobranças futuras?'
    if (!window.confirm(aviso)) return
    definirProcessando(true)
    definirMensagem('Processando sua solicitação…')
    try {
      await chamarFuncao('gerenciar-plano', { acao })
      await atualizar()
      definirMensagem(acao === 'cancelar' ? 'Cancelamento registrado.' : 'Garantia solicitada e assinatura atualizada.')
    } catch (erro) {
      const texto = erro instanceof Error ? erro.message : ''
      definirMensagem(texto.includes('Mercado Pago não confirmou')
        ? 'O Mercado Pago não confirmou o reembolso. Nenhum status financeiro foi alterado; tente novamente mais tarde.'
        : 'Não foi possível concluir a solicitação. Nenhum status financeiro foi alterado; tente novamente mais tarde.')
    } finally { definirProcessando(false) }
  }

  if (!sessao) return null
  const ativo = estado?.status_assinatura === 'ativa'
  const statusAtual = estado?.status_assinatura ?? ''
  const descricao = mensagensStatus[statusAtual]
  const statusExibido = descricao?.titulo ?? 'Sem assinatura'
  const garantia = (ativo || estado?.status_assinatura === 'cancelada') && estado?.ultima_cobranca_em
    && Date.now() - new Date(estado.ultima_cobranca_em).getTime() <= 7 * 864e5

  return <section className="ct-cartao ct-cartao--largo" aria-label="Minha assinatura">
    <header className="ct-cartao__cabeca"><div><h2>Minha assinatura</h2><p>Seu histórico permanece preservado ao cancelar ou usar a garantia.</p></div></header>
    {carregando ? <p role="status">Carregando assinatura…</p> : <>
      <dl className="conta-assinatura__dados">
        <div><dt>Plano</dt><dd>{estado?.plano ?? 'Gratuito'}</dd></div>
        <div><dt>Status</dt><dd>{statusExibido}</dd></div>
        <div><dt>{estado?.cancelar_ao_fim || statusAtual === 'cancelada' ? 'Término do acesso' : ativo ? 'Próxima cobrança' : 'Fim do período'}</dt><dd>{data(estado?.fim_periodo ?? null)}</dd></div>
        <div><dt>Última cobrança</dt><dd>{data(estado?.ultima_cobranca_em ?? null)}</dd></div>
      </dl>
      <p className="ct-nota">{ativo && estado?.cancelar_ao_fim
        ? 'Cancelamento registrado. Não haverá novas cobranças; o acesso pago permanece até o fim do período informado.'
        : descricao?.explicacao ?? 'Você está na modalidade gratuita. Pode continuar estudando normalmente.'}</p>
      <div className="linha">
        {ativo && !estado?.cancelar_ao_fim && <button className="botao" type="button" disabled={processando} onClick={() => void gerenciar('cancelar')}>Cancelar assinatura</button>}
        {garantia && <button className="botao botao--fantasma" type="button" disabled={processando} onClick={() => void gerenciar('reembolsar')}>Usar garantia de 7 dias</button>}
        <a className="botao botao--fantasma" href={href('/assinatura')}>Ver planos</a>
      </div>
    </>}
    {mensagem && <p role="status">{mensagem}</p>}
  </section>
}

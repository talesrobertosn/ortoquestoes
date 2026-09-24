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
    } catch { definirMensagem('Não foi possível consultar a assinatura agora.') }
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
      definirMensagem(erro instanceof Error ? erro.message : 'Não foi possível concluir a solicitação.')
    } finally { definirProcessando(false) }
  }

  if (!sessao) return null
  const ativo = estado?.status_assinatura === 'ativa'
  const statusExibido = ativo ? 'Em dia' : estado?.status_assinatura ?? 'Sem assinatura'
  const garantia = (ativo || estado?.status_assinatura === 'cancelada') && estado?.ultima_cobranca_em
    && Date.now() - new Date(estado.ultima_cobranca_em).getTime() <= 7 * 864e5

  return <section className="ct-cartao ct-cartao--largo" aria-label="Minha assinatura">
    <header className="ct-cartao__cabeca"><div><h2>Minha assinatura</h2><p>Seu histórico permanece preservado ao cancelar ou usar a garantia.</p></div></header>
    {carregando ? <p>Carregando assinatura…</p> : <>
      <dl className="conta-assinatura__dados">
        <div><dt>Plano</dt><dd>{estado?.plano ?? 'Gratuito'}</dd></div>
        <div><dt>Status</dt><dd>{statusExibido}</dd></div>
        <div><dt>{estado?.cancelar_ao_fim ? 'Término do acesso' : 'Próxima cobrança ou término'}</dt><dd>{data(estado?.fim_periodo ?? null)}</dd></div>
        <div><dt>Última cobrança</dt><dd>{data(estado?.ultima_cobranca_em ?? null)}</dd></div>
      </dl>
      <div className="linha">
        {ativo && !estado?.cancelar_ao_fim && <button className="botao" type="button" disabled={processando} onClick={() => void gerenciar('cancelar')}>Cancelar assinatura</button>}
        {garantia && <button className="botao botao--fantasma" type="button" disabled={processando} onClick={() => void gerenciar('reembolsar')}>Usar garantia de 7 dias</button>}
        <a className="botao botao--fantasma" href={href('/assinatura')}>Ver planos</a>
      </div>
    </>}
    {mensagem && <p role="status">{mensagem}</p>}
  </section>
}
